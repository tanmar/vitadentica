/**
 * Generuje `src/data/route-map.ts`: uproszczoną mapę okolicy gabinetu z danych OpenStreetMap.
 *
 * Uruchamiany ręcznie, gdy zmieni się okolica albo adres (nie jest częścią `npm run build`, więc build
 * nie zależy od sieci):
 *
 *   npm run map:generate                    # pobiera dane z api.openstreetmap.org
 *   npm run map:generate -- --input x.json  # używa zapisanych danych (tablica elementów w formacie API 0.6)
 *
 * Wymaga Node ≥ 22.18 (usuwanie typów TS bez flag). Dane: © współtwórcy OpenStreetMap, licencja ODbL;
 * mapa jest „produced work", więc wymaga tylko podania źródła (robi to RouteMap.astro).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRouteMap, type LatLon, type OsmElement, type Rect } from '../src/lib/route-map.ts';

/** Musi zgadzać się z `clinic.geo` (pilnuje tego tests/route-map-data.test.ts). */
const ORIGIN: LatLon = { lat: 52.2295672, lon: 21.0790837 };
const HALF_WIDTH = 480;
const HALF_HEIGHT = 440;
/** Zapas poza oknem mapy: ulice i budynki kończą się poza krawędzią, nie na niej. */
const FETCH_MARGIN_M = 60;
/**
 * Strefy bez etykiet ulic: pin z plakietką oraz skala w lewym dolnym rogu. Wymiary muszą zgadzać się
 * z RouteMap.astro i routemap.css. Na telefonie pin jest powiększony 1,7× wokół czubka (0, 0), a plakietka
 * stoi po LEWEJ stronie pinu (po prawej zasłaniałaby przystanek), stąd osobny zestaw.
 */
const SCALE_BAR_ZONE: Rect = { minX: -HALF_WIDTH, minY: HALF_HEIGHT - 80, maxX: -HALF_WIDTH + 230, maxY: HALF_HEIGHT };
const RESERVED_ZONES: readonly Rect[] = [{ minX: -24, minY: -72, maxX: 236, maxY: 8 }, SCALE_BAR_ZONE];
const SMALL_RESERVED_ZONES: readonly Rect[] = [{ minX: -390, minY: -130, maxX: 40, maxY: 12 }, SCALE_BAR_ZONE];
/** Rozmiar etykiet w metrach mapy: na pulpicie ≥ 12 px od 1041 px szerokości okna, na telefonie ≥ 12 px od 320 px. */
const LABEL_FONT = 21;
const SMALL_LABEL_FONT = 44;
const TILES_X = 2;
const TILES_Y = 1;
const API = 'https://api.openstreetmap.org/api/0.6/map.json';
const USER_AGENT = 'vitadentica-route-map/1.0 (+https://www.vitadentica.pl)';
const OUTPUT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../src/data/route-map.ts');

interface ApiElement {
  readonly type: 'node' | 'way' | 'relation';
  readonly id: number;
  readonly lat?: number;
  readonly lon?: number;
  readonly nodes?: readonly number[];
  readonly tags?: Record<string, string>;
}

function bbox(): { west: number; south: number; east: number; north: number } {
  const metersPerDegLat = 111270;
  const metersPerDegLon = 111413 * Math.cos((ORIGIN.lat * Math.PI) / 180);
  const dLat = (HALF_HEIGHT + FETCH_MARGIN_M) / metersPerDegLat;
  const dLon = (HALF_WIDTH + FETCH_MARGIN_M) / metersPerDegLon;
  return { west: ORIGIN.lon - dLon, south: ORIGIN.lat - dLat, east: ORIGIN.lon + dLon, north: ORIGIN.lat + dLat };
}

async function fetchTile(west: number, south: number, east: number, north: number): Promise<ApiElement[]> {
  const url = `${API}?bbox=${west.toFixed(5)},${south.toFixed(5)},${east.toFixed(5)},${north.toFixed(5)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`OSM API ${response.status} dla ${url}: ${(await response.text()).slice(0, 200)}`);
  const body = (await response.json()) as { elements?: ApiElement[] };
  return body.elements ?? [];
}

async function fetchElements(): Promise<ApiElement[]> {
  const { west, south, east, north } = bbox();
  const merged = new Map<string, ApiElement>();
  for (let i = 0; i < TILES_X; i += 1) {
    for (let j = 0; j < TILES_Y; j += 1) {
      const tile = await fetchTile(
        west + ((east - west) * i) / TILES_X,
        south + ((north - south) * j) / TILES_Y,
        west + ((east - west) * (i + 1)) / TILES_X,
        south + ((north - south) * (j + 1)) / TILES_Y,
      );
      for (const el of tile) merged.set(`${el.type}/${el.id}`, el);
      await new Promise((done) => setTimeout(done, 1500)); // uprzejmie wobec publicznego API
    }
  }
  return [...merged.values()];
}

/** Format API 0.6 (ścieżki wskazują węzły po id) → znormalizowane elementy z geometrią. */
function normalise(elements: readonly ApiElement[]): OsmElement[] {
  const nodes = new Map<number, LatLon>();
  for (const el of elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) nodes.set(el.id, { lat: el.lat, lon: el.lon });
  }
  const result: OsmElement[] = [];
  for (const el of elements) {
    if (el.type === 'node' && el.tags && el.lat !== undefined && el.lon !== undefined) {
      result.push({ type: 'node', id: el.id, tags: el.tags, lat: el.lat, lon: el.lon });
    } else if (el.type === 'way' && el.tags && el.nodes) {
      const geometry = el.nodes.flatMap((id) => {
        const node = nodes.get(id);
        return node ? [node] : [];
      });
      if (geometry.length >= 2) result.push({ type: 'way', id: el.id, tags: el.tags, geometry });
    }
  }
  return result;
}

function inputPath(): string | null {
  const flag = process.argv.indexOf('--input');
  if (flag < 0) return null;
  const value = process.argv[flag + 1];
  if (!value || value.startsWith('--')) throw new Error('--input wymaga ścieżki do pliku JSON z elementami OSM');
  return value;
}

/** Plik wejściowy: tablica elementów albo pełna odpowiedź API 0.6 (`{ elements: [...] }`). */
function readInput(path: string): ApiElement[] {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const elements = Array.isArray(parsed) ? parsed : (parsed as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) throw new Error(`${path}: oczekiwano tablicy elementów OSM albo obiektu z polem "elements"`);
  return elements as ApiElement[];
}

const path = inputPath();
const source = path ? readInput(path) : await fetchElements();
const data = buildRouteMap(normalise(source), {
  origin: ORIGIN,
  halfWidth: HALF_WIDTH,
  halfHeight: HALF_HEIGHT,
  minBuildingArea: 90,
  maxStops: 5,
  maxStopDistance: 500,
  labelFontSize: LABEL_FONT,
  smallLabelFontSize: SMALL_LABEL_FONT,
  priorityStreets: ['Skalskiego', 'Nowaka-Jeziorańskiego'],
  reservedZones: RESERVED_ZONES,
  smallReservedZones: SMALL_RESERVED_ZONES,
});

const header = `/**
 * Mapa okolicy gabinetu: uproszczona geometria z OpenStreetMap (© współtwórcy OpenStreetMap, ODbL).
 * WYGENEROWANE przez scripts/generate-route-map.ts, nie edytować ręcznie.
 * Początek układu (0, 0): ${ORIGIN.lat}, ${ORIGIN.lon}; jednostka: metr; y rośnie na południe.
 */
import type { RouteMapData } from '../lib/route-map';

export const routeMapOrigin = ${JSON.stringify(ORIGIN)} as const;

export const routeMap: RouteMapData = `;
writeFileSync(OUTPUT, `${header}${JSON.stringify(data, null, 2)};\n`);

const size = (s: string) => `${(s.length / 1024).toFixed(1)} kB`;
console.log(`Zapisano ${OUTPUT}`);
for (const [name, d] of Object.entries(data.layers)) console.log(`  ${name.padEnd(15)} ${size(d)}`);
const where = (l: (typeof data.labels)[number]) => (l.desktop && l.small ? '' : l.desktop ? ' (tylko pulpit)' : ' (tylko telefon)');
console.log(`  etykiety: ${data.labels.map((l) => `${l.text}${where(l)}`).join(', ')}`);
console.log(`  przystanki: ${data.stops.map((s) => `${s.number}. ${s.name} (${s.distance} m)`).join(', ')}`);
