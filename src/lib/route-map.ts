/**
 * Mapa dojazdu rysowana z danych OpenStreetMap (© współtwórcy OpenStreetMap, ODbL).
 *
 * Moduł jest czystą geometrią bez zależności, więc uruchamia go zarówno Astro (typy i stałe),
 * jak i `scripts/generate-route-map.ts` (Node, bez budowania). Generator zapisuje wynik
 * `buildRouteMap` do `src/data/route-map.ts`; strona nie wykonuje żadnych zapytań do map ani nie osadza ramek,
 * dzięki czemu CSP (`frame-src 'none'`, `img-src 'self'`) zostaje bez zmian.
 *
 * Układ współrzędnych: metry od gabinetu, x na wschód, y na południe (jak w SVG), więc 1 jednostka viewBox = 1 m.
 */

export interface LatLon {
  readonly lat: number;
  readonly lon: number;
}
export interface Point {
  readonly x: number;
  readonly y: number;
}
export interface Rect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Element OSM w postaci znormalizowanej: ścieżka niesie geometrię (nie odwołania do węzłów). */
export type OsmElement =
  | { readonly type: 'way'; readonly id: number; readonly tags: Readonly<Record<string, string>>; readonly geometry: readonly LatLon[] }
  | ({ readonly type: 'node'; readonly id: number; readonly tags: Readonly<Record<string, string>> } & LatLon);

export interface RouteMapConfig {
  readonly origin: LatLon;
  /** Połowa szerokości i wysokości okna mapy w metrach. */
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly minBuildingArea: number;
  readonly maxStops: number;
  readonly maxStopDistance: number;
  /** Zieleń i woda mniejsze niż ta (m²) są pomijane. */
  readonly minGreenArea?: number;
  readonly labelFontSize?: number;
  readonly smallLabelFontSize?: number;
  /** Skrócone nazwy ulic, które mają pierwszeństwo przy rozmieszczaniu etykiet. */
  readonly priorityStreets?: readonly string[];
  /** Obszary zajęte przez pin, plakietkę i skalę na pulpicie: etykiety ulic ich nie zasłaniają. */
  readonly reservedZones?: readonly Rect[];
  /** To samo dla telefonu, gdzie pin i plakietka są powiększone (domyślnie jak `reservedZones`). */
  readonly smallReservedZones?: readonly Rect[];
}

export interface LabelPosition {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

export interface RouteMapLabel {
  readonly text: string;
  /** 0: ulica gabinetu, 1: główne ulice, 2: reszta (nie trafia na telefon). */
  readonly rank: number;
  /** Położenie na pulpicie (`labelFontSize`); null, gdy nie ma tam wolnego miejsca. */
  readonly desktop: LabelPosition | null;
  /** Osobne położenie na telefonie (`smallLabelFontSize`, inne strefy zarezerwowane); null, gdy etykieta tam się nie mieści. */
  readonly small: LabelPosition | null;
}

export interface RouteMapStop {
  readonly number: number;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  /** Odległość w linii prostej od gabinetu, w metrach. */
  readonly distance: number;
}

export interface RouteMapData {
  readonly viewBox: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly layers: {
    readonly waterAreas: string;
    readonly waterLines: string;
    readonly parks: string;
    readonly buildings: string;
    readonly roadsLocal: string;
    readonly roadsCollector: string;
    readonly roadsArterial: string;
  };
  readonly labels: readonly RouteMapLabel[];
  readonly stops: readonly RouteMapStop[];
  readonly labelFontSize: number;
  readonly smallLabelFontSize: number;
}

// ── Geometria ──

/** Metry na stopień szerokości i długości geograficznej (przybliżenie WGS84, błąd < 0,1 % w skali miasta). */
function metersPerDegree(latDeg: number): { readonly lat: number; readonly lon: number } {
  const phi = (latDeg * Math.PI) / 180;
  return {
    lat: 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi),
    lon: 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi),
  };
}

export function projectToMeters(origin: LatLon, p: LatLon): Point {
  const k = metersPerDegree(origin.lat);
  return { x: (p.lon - origin.lon) * k.lon, y: 0 - (p.lat - origin.lat) * k.lat };
}

export function boundsOf(points: readonly Point[]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function inflate(rect: Rect, by: number): Rect {
  return { minX: rect.minX - by, minY: rect.minY - by, maxX: rect.maxX + by, maxY: rect.maxY + by };
}

export function polygonArea(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Douglas–Peucker: usuwa punkty leżące bliżej niż `tolerance` od uproszczonej linii. */
export function simplifyLine(points: readonly Point[], tolerance: number): Point[] {
  if (points.length < 3) return [...points];
  let farthest = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = distanceToSegment(points[i], first, last);
    if (d > farthest) {
      farthest = d;
      index = i;
    }
  }
  if (farthest <= tolerance) return [first, last];
  const left = simplifyLine(points.slice(0, index + 1), tolerance);
  const right = simplifyLine(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

/** Przycina odcinek do prostokąta (Liang–Barsky); `null`, gdy leży poza nim. */
function clipSegment(a: Point, b: Point, rect: Rect): [Point, Point] | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const edges: ReadonlyArray<readonly [number, number]> = [
    [-dx, a.x - rect.minX],
    [dx, rect.maxX - a.x],
    [-dy, a.y - rect.minY],
    [dy, rect.maxY - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return [
    { x: a.x + t0 * dx, y: a.y + t0 * dy },
    { x: a.x + t1 * dx, y: a.y + t1 * dy },
  ];
}

/** Ciągłe fragmenty linii widoczne w prostokącie (linia opuszczająca okno i wracająca daje dwa fragmenty). */
export function clipPolyline(points: readonly Point[], rect: Rect): Point[][] {
  const runs: Point[][] = [];
  let current: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const clipped = clipSegment(points[i], points[i + 1], rect);
    if (!clipped) {
      if (current.length > 0) runs.push(current);
      current = [];
      continue;
    }
    const [start, end] = clipped;
    const continues = current.length > 0 && start.x === points[i].x && start.y === points[i].y;
    if (!continues) {
      if (current.length > 0) runs.push(current);
      current = [start];
    }
    current.push(end);
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

/** Przycina wielokąt do prostokąta (Sutherland–Hodgman); pusta tablica, gdy leży poza nim. */
export function clipPolygon(points: readonly Point[], rect: Rect): Point[] {
  const atX = (a: Point, b: Point, x: number): Point => ({ x, y: a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y) });
  const atY = (a: Point, b: Point, y: number): Point => ({ x: a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x), y });
  const edges: ReadonlyArray<{ readonly inside: (p: Point) => boolean; readonly cross: (a: Point, b: Point) => Point }> = [
    { inside: (p) => p.x >= rect.minX, cross: (a, b) => atX(a, b, rect.minX) },
    { inside: (p) => p.x <= rect.maxX, cross: (a, b) => atX(a, b, rect.maxX) },
    { inside: (p) => p.y >= rect.minY, cross: (a, b) => atY(a, b, rect.minY) },
    { inside: (p) => p.y <= rect.maxY, cross: (a, b) => atY(a, b, rect.maxY) },
  ];
  let output: Point[] = [...points];
  for (const edge of edges) {
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i += 1) {
      const current = input[i];
      const previous = input[(i + input.length - 1) % input.length];
      if (edge.inside(current)) {
        if (!edge.inside(previous)) output.push(edge.cross(previous, current));
        output.push(current);
      } else if (edge.inside(previous)) {
        output.push(edge.cross(previous, current));
      }
    }
    if (output.length === 0) return [];
  }
  return output;
}

function runLength(run: readonly Point[]): number {
  let total = 0;
  for (let i = 0; i < run.length - 1; i += 1) total += Math.hypot(run[i + 1].x - run[i].x, run[i + 1].y - run[i].y);
  return total;
}

/** Zapis ścieżki SVG w pełnych metrach (1 m to ułamek piksela, więcej nie widać). Zdegenerowane ścieżki są pomijane. */
export function toPathData(lines: readonly (readonly Point[])[], options: { readonly closed?: boolean } = {}): string {
  const minPoints = options.closed ? 3 : 2;
  return lines
    .map((line) => {
      const rounded: Point[] = [];
      for (const p of line) {
        const point = { x: Math.round(p.x), y: Math.round(p.y) };
        const prev = rounded[rounded.length - 1];
        if (!prev || prev.x !== point.x || prev.y !== point.y) rounded.push(point);
      }
      if (rounded.length < minPoints) return '';
      const body = rounded.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join('');
      return options.closed ? `${body}Z` : body;
    })
    .join('');
}

// ── Nazwy i odległości ──

/** „Kakowskiego 02" → „Kakowskiego" (numer to słupek na przystanku, nie część nazwy). */
export function stripStopNumber(name: string): string {
  return name.replace(/\s+0?\d{1,2}$/, '');
}

const PERSON_PREFIX = /^(Generała|Gen\.|Jana|Stanisława|Kardynała|Majora|Marszałka|Księdza|Ks\.|Prezydenta|Papieża|Pułkownika|Płk\.)\s/;

/** Nazwa do etykiety na mapie: bez stopnia i imienia, ze skrótami. */
export function shortStreetName(name: string): string {
  const words = name.split(/\s+/);
  const shortened = PERSON_PREFIX.test(name) && words.length > 1 ? personSurname(words) : name;
  return shortened
    .replace(/\bArmii Krajowej\b/, 'AK')
    .replace(/^Aleja\b/, 'Al.')
    .replace(/^Aleje\b/, 'Al.');
}

function personSurname(words: readonly string[]): string {
  const last = words[words.length - 1];
  // „Jana Pawła II": numer porządkowy należy do nazwiska
  return /^[IVX]+$/.test(last) && words.length > 2 ? `${words[words.length - 2]} ${last}` : last;
}

/** „ok. 350 m" (co 50 m, minimum 50) albo „ok. 1,2 km". */
export function formatApproxDistance(meters: number): string {
  const rounded = Math.max(50, Math.round(meters / 50) * 50);
  // po zaokrągleniu do 50 m 975–999 m też daje 1000: wtedy „1,0 km", nie „1000 m"
  if (rounded >= 1000) return `ok. ${(Math.round(meters / 100) / 10).toFixed(1).replace('.', ',')} km`;
  return `ok. ${rounded} m`;
}

export interface StopGroup {
  readonly name: string;
  readonly point: Point;
  readonly distance: number;
}

/** Łączy słupki jednego przystanku w jeden znacznik; odległość liczy od najbliższego słupka. */
export function groupStops(stops: readonly { readonly name: string; readonly point: Point }[]): StopGroup[] {
  const byName = new Map<string, Point[]>();
  for (const stop of stops) {
    const name = stripStopNumber(stop.name);
    byName.set(name, [...(byName.get(name) ?? []), stop.point]);
  }
  return [...byName.entries()]
    .map(([name, points]) => ({
      name,
      point: {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      },
      distance: Math.min(...points.map((p) => Math.hypot(p.x, p.y))),
    }))
    .sort((a, b) => a.distance - b.distance);
}

// ── Etykiety ulic ──

export interface LabelCandidate {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly rank: number;
  /** Długość widocznego fragmentu: dłuższe ulice mają pierwszeństwo wśród równych rangą. */
  readonly weight?: number;
  /** Zapasowe położenia wzdłuż ulicy, próbowane po kolei, gdy główne koliduje. */
  readonly alternatives?: readonly { readonly x: number; readonly y: number; readonly angle: number }[];
}

/** Punkt na `fraction` długości najdłuższego widocznego fragmentu (domyślnie środek); kąt tak, by tekst nie był do góry nogami. */
export function pickLabelAnchor(
  lines: readonly (readonly Point[])[],
  window: Rect,
  fraction = 0.5,
): { readonly x: number; readonly y: number; readonly angle: number; readonly length: number } | null {
  const runs = lines.flatMap((line) => clipPolyline(line, window)).filter((run) => run.length >= 2);
  if (runs.length === 0) return null;
  const longest = runs.reduce((best, run) => (runLength(run) > runLength(best) ? run : best));
  const length = runLength(longest);
  if (length === 0) return null;
  let remaining = length * fraction;
  for (let i = 0; i < longest.length - 1; i += 1) {
    const a = longest[i];
    const b = longest[i + 1];
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= segment || i === longest.length - 2) {
      const t = segment === 0 ? 0 : remaining / segment;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        angle: uprightAngle((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI),
        length,
      };
    }
    remaining -= segment;
  }
  return null;
}

function uprightAngle(degrees: number): number {
  if (degrees > 90) return degrees - 180;
  if (degrees <= -90) return degrees + 180;
  return degrees;
}

const GLYPH_WIDTH = 0.55; // średnia szerokość znaku Roboto Condensed (em)
const LABEL_GAP = 6;
const WINDOW_MARGIN = 8;

function labelBox(label: LabelCandidate, fontSize: number): Rect {
  const w = label.text.length * fontSize * GLYPH_WIDTH + LABEL_GAP;
  const h = fontSize * 1.25;
  const rad = (label.angle * Math.PI) / 180;
  const boxW = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
  const boxH = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
  return { minX: label.x - boxW / 2, minY: label.y - boxH / 2, maxX: label.x + boxW / 2, maxY: label.y + boxH / 2 };
}

/** Zachłannie od najważniejszych: etykieta, która wystaje z okna albo koliduje z już położoną, odpada. */
export function placeLabels<T extends LabelCandidate>(
  candidates: readonly T[],
  options: { readonly fontSize: number; readonly window: Rect; readonly reserved?: readonly Rect[] },
): T[] {
  const ordered = [...candidates].sort((a, b) => a.rank - b.rank || (b.weight ?? 0) - (a.weight ?? 0));
  const inner = inflate(options.window, -WINDOW_MARGIN);
  const taken: Rect[] = [...(options.reserved ?? [])];
  const placed: T[] = [];
  for (const candidate of ordered) {
    const positions = [candidate, ...(candidate.alternatives ?? []).map((alt) => ({ ...candidate, ...alt }))];
    for (const position of positions) {
      const box = labelBox(position, options.fontSize);
      const inside = box.minX >= inner.minX && box.maxX <= inner.maxX && box.minY >= inner.minY && box.maxY <= inner.maxY;
      if (!inside || taken.some((other) => overlaps(box, other))) continue;
      taken.push(box);
      placed.push({ ...candidate, x: position.x, y: position.y, angle: position.angle });
      break;
    }
  }
  return placed;
}

// ── Budowa mapy ──

const ARTERIAL = new Set(['motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link']);
const COLLECTOR = new Set(['tertiary', 'tertiary_link']);
const LOCAL = new Set(['residential', 'living_street', 'unclassified']);
const MINOR_BUILDINGS = new Set(['garage', 'garages', 'shed', 'roof', 'carport', 'service', 'outbuilding', 'hut', 'kiosk', 'container']);
const GREEN_LEISURE = new Set(['park', 'garden', 'playground', 'recreation_ground']);
const GREEN_LANDUSE = new Set(['grass', 'forest', 'recreation_ground', 'meadow', 'village_green']);
const GREEN_NATURAL = new Set(['wood', 'scrub']);
const WATER_LINES = new Set(['canal', 'river', 'stream']);

const DEFAULT_LABEL_FONT = 19;
const DEFAULT_SMALL_LABEL_FONT = 44;
const DEFAULT_MIN_GREEN_AREA = 1500;
const FEATURE_MARGIN = 30;
const LINE_TOLERANCE = 1.5;
const POLYGON_TOLERANCE = 1;
/** Znacznik przystanku ma promień 14 m (+ obrys); na telefonie jest powiększony 1,7×. Połowa boku strefy wokół niego: */
const STOP_ZONE = 18;
const STOP_ZONE_SMALL = 26;
/** Gdzie próbować etykiety, jeśli środek ulicy jest zajęty (ułamek długości widocznego fragmentu). */
const ALTERNATIVE_FRACTIONS: readonly number[] = [0.3, 0.7, 0.15, 0.85];

interface Way {
  readonly tags: Readonly<Record<string, string>>;
  readonly points: readonly Point[];
}

function isClosed(points: readonly Point[]): boolean {
  const first = points[0];
  const last = points[points.length - 1];
  return points.length > 3 && first.x === last.x && first.y === last.y;
}

function ringOf(points: readonly Point[]): Point[] {
  return isClosed(points) ? points.slice(0, -1) : [...points];
}

/** Stała kolejność podścieżek: te same dane z OSM dają ten sam plik niezależnie od kolejności elementów w odpowiedzi API. */
function stableOrder(paths: readonly (readonly Point[])[]): Point[][] {
  const key = (path: readonly Point[]): string =>
    `${String(Math.round(path[0].x) + 100000).padStart(7, '0')}|${String(Math.round(path[0].y) + 100000).padStart(7, '0')}|${path.length}`;
  return [...paths].sort((p, q) => key(p).localeCompare(key(q))).map((path) => [...path]);
}

function polygonPaths(ways: readonly Way[], minArea: number, area: Rect): string {
  const rings = ways
    .map((way) => ringOf(way.points))
    // powierzchnię liczymy dla całego wielokąta, dopiero potem przycinamy do kadru (z zapasem)
    .filter((ring) => ring.length >= 3 && polygonArea(ring) >= minArea)
    .map((ring) => clipPolygon(ring, area))
    .filter((ring) => ring.length >= 3)
    .map((ring) => simplifyLine([...ring, ring[0]], POLYGON_TOLERANCE).slice(0, -1));
  return toPathData(stableOrder(rings), { closed: true });
}

function linePaths(ways: readonly Way[], window: Rect): string {
  const clipped = ways.flatMap((way) => clipPolyline(way.points, window)).map((run) => simplifyLine(run, LINE_TOLERANCE));
  return toPathData(stableOrder(clipped.filter((run) => run.length >= 2)));
}

function roadClass(way: Way): 'arterial' | 'collector' | 'local' | null {
  const highway = way.tags.highway;
  if (!highway) return null;
  if (ARTERIAL.has(highway)) return 'arterial';
  if (COLLECTOR.has(highway)) return 'collector';
  if (LOCAL.has(highway)) return 'local';
  return null;
}

function isGreen(tags: Readonly<Record<string, string>>): boolean {
  return GREEN_LEISURE.has(tags.leisure) || GREEN_LANDUSE.has(tags.landuse) || GREEN_NATURAL.has(tags.natural);
}

interface NamedCandidate extends LabelCandidate {
  /** Pełna nazwa z OSM: dwie ulice o tej samej skróconej nazwie to dwie osobne etykiety. */
  readonly id: string;
}

function labelCandidates(roads: readonly Way[], window: Rect, priority: ReadonlySet<string>): NamedCandidate[] {
  const byName = new Map<string, Way[]>();
  for (const way of roads) {
    const name = way.tags.name;
    if (name) byName.set(name, [...(byName.get(name) ?? []), way]);
  }
  const candidates: NamedCandidate[] = [];
  for (const [name, ways] of [...byName].sort(([a], [b]) => a.localeCompare(b))) {
    const lines = ways.map((way) => way.points);
    const anchor = pickLabelAnchor(lines, window);
    if (!anchor) continue;
    const text = shortStreetName(name);
    const main = ways.some((way) => roadClass(way) !== 'local');
    const rank = priority.has(text) ? 0 : main ? 1 : 2;
    const alternatives = ALTERNATIVE_FRACTIONS.flatMap((fraction) => {
      const alt = pickLabelAnchor(lines, window, fraction);
      return alt ? [{ x: alt.x, y: alt.y, angle: alt.angle }] : [];
    });
    candidates.push({ id: name, text, x: anchor.x, y: anchor.y, angle: anchor.angle, rank, weight: anchor.length, alternatives });
  }
  return candidates;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildRouteMap(elements: readonly OsmElement[], config: RouteMapConfig): RouteMapData {
  const { origin, halfWidth, halfHeight } = config;
  const window: Rect = { minX: -halfWidth, minY: -halfHeight, maxX: halfWidth, maxY: halfHeight };
  const area = inflate(window, FEATURE_MARGIN);
  const fontSize = config.labelFontSize ?? DEFAULT_LABEL_FONT;
  const smallFontSize = config.smallLabelFontSize ?? DEFAULT_SMALL_LABEL_FONT;
  const minGreen = config.minGreenArea ?? DEFAULT_MIN_GREEN_AREA;

  const ways: Way[] = elements.flatMap((el) =>
    el.type === 'way' ? [{ tags: el.tags, points: el.geometry.map((p) => projectToMeters(origin, p)) }] : [],
  );
  const visible = ways.filter((way) => way.points.length >= 2 && overlaps(boundsOf(way.points), area));

  const roads = visible.filter((way) => roadClass(way) !== null);
  const ofClass = (cls: ReturnType<typeof roadClass>) => roads.filter((way) => roadClass(way) === cls);

  const buildings = visible.filter((way) => way.tags.building && !MINOR_BUILDINGS.has(way.tags.building));
  const water = visible.filter((way) => way.tags.natural === 'water');
  const green = visible.filter((way) => isGreen(way.tags));
  const canals = visible.filter((way) => WATER_LINES.has(way.tags.waterway));

  const stopNodes = elements.flatMap((el) =>
    el.type === 'node' && el.tags.highway === 'bus_stop' && el.tags.name
      ? [{ name: el.tags.name, point: projectToMeters(origin, el) }]
      : [],
  );
  const stops = groupStops(stopNodes)
    // znacznik (także powiększony na telefonie) musi się zmieścić w oknie, inaczej krawędź ucina cyfrę
    .filter(
      (g) =>
        g.distance <= config.maxStopDistance &&
        Math.abs(g.point.x) <= halfWidth - STOP_ZONE_SMALL &&
        Math.abs(g.point.y) <= halfHeight - STOP_ZONE_SMALL,
    )
    .slice(0, config.maxStops)
    .map((g, i) => ({ number: i + 1, name: g.name, x: round1(g.point.x), y: round1(g.point.y), distance: Math.round(g.distance) }));

  const priority = new Set(config.priorityStreets ?? []);
  const candidates = labelCandidates(roads, window, priority);
  // Znacznik przystanku nie może zasłaniać nazwy ulicy (na telefonie jest większy, więc strefa też).
  const zonesAround = (half: number): Rect[] =>
    stops.map((s) => ({ minX: s.x - half, minY: s.y - half, maxX: s.x + half, maxY: s.y + half }));
  const desktopZones = config.reservedZones ?? [];
  const reserved = [...desktopZones, ...zonesAround(STOP_ZONE)];
  const smallReserved = [...(config.smallReservedZones ?? desktopZones), ...zonesAround(STOP_ZONE_SMALL)];
  const position = (c: LabelCandidate): LabelPosition => ({ x: round1(c.x), y: round1(c.y), angle: round1(c.angle) });
  const desktop = new Map(placeLabels(candidates, { fontSize, window, reserved }).map((c) => [c.id, position(c)]));
  const small = new Map(
    placeLabels(
      candidates.filter((c) => c.rank <= 1),
      { fontSize: smallFontSize, window, reserved: smallReserved },
    ).map((c) => [c.id, position(c)]),
  );
  const labels: RouteMapLabel[] = candidates
    .filter((c) => desktop.has(c.id) || small.has(c.id))
    .map((c) => ({ text: c.text, rank: c.rank, desktop: desktop.get(c.id) ?? null, small: small.get(c.id) ?? null }));

  return {
    viewBox: { x: -halfWidth, y: -halfHeight, width: halfWidth * 2, height: halfHeight * 2 },
    layers: {
      waterAreas: polygonPaths(water, minGreen, area),
      waterLines: linePaths(canals, area),
      parks: polygonPaths(green, minGreen, area),
      buildings: polygonPaths(buildings, config.minBuildingArea, area),
      roadsLocal: linePaths(ofClass('local'), area),
      roadsCollector: linePaths(ofClass('collector'), area),
      roadsArterial: linePaths(ofClass('arterial'), area),
    },
    labels,
    stops,
    labelFontSize: fontSize,
    smallLabelFontSize: smallFontSize,
  };
}
