import { describe, expect, test } from 'vitest';
import {
  boundsOf,
  buildRouteMap,
  clipPolygon,
  clipPolyline,
  formatApproxDistance,
  groupStops,
  overlaps,
  pickLabelAnchor,
  placeLabels,
  polygonArea,
  projectToMeters,
  shortStreetName,
  simplifyLine,
  stripStopNumber,
  toPathData,
  type OsmElement,
  type Point,
  type RouteMapConfig,
} from '../src/lib/route-map';

const ORIGIN = { lat: 52.2295672, lon: 21.0790837 };

describe('projectToMeters', () => {
  test('maps the origin to (0, 0)', () => {
    expect(projectToMeters(ORIGIN, ORIGIN)).toEqual({ x: 0, y: 0 });
  });

  test('puts points to the north at negative y (SVG y grows downwards)', () => {
    const north = projectToMeters(ORIGIN, { lat: ORIGIN.lat + 0.001, lon: ORIGIN.lon });
    expect(north.x).toBeCloseTo(0, 6);
    expect(north.y).toBeLessThan(0);
    // 0,001° szerokości to ok. 111,3 m
    expect(Math.abs(north.y)).toBeGreaterThan(110.5);
    expect(Math.abs(north.y)).toBeLessThan(112);
  });

  test('puts points to the east at positive x, shrunk by cos(latitude)', () => {
    const east = projectToMeters(ORIGIN, { lat: ORIGIN.lat, lon: ORIGIN.lon + 0.001 });
    // 0,001° długości na 52,23°N to ok. 68,2 m
    expect(east.x).toBeGreaterThan(67.5);
    expect(east.x).toBeLessThan(69);
    expect(east.y).toBeCloseTo(0, 6);
  });
});

describe('simplifyLine', () => {
  test('drops points that lie on the straight line within tolerance', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0.2 },
      { x: 10, y: 0 },
    ];
    expect(simplifyLine(line, 1)).toEqual([line[0], line[2]]);
  });

  test('keeps a corner that deviates more than the tolerance', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 8 },
      { x: 10, y: 0 },
    ];
    expect(simplifyLine(line, 1)).toHaveLength(3);
  });

  test('does not mutate its input', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ];
    const copy = line.map((p) => ({ ...p }));
    simplifyLine(line, 1);
    expect(line).toEqual(copy);
  });
});

describe('polygonArea / boundsOf / overlaps', () => {
  const square: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  test('computes the area independent of winding direction', () => {
    expect(polygonArea(square)).toBe(100);
    expect(polygonArea([...square].reverse())).toBe(100);
  });

  test('returns the bounding box', () => {
    expect(boundsOf(square)).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
  });

  test('detects overlapping and disjoint rectangles', () => {
    const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(overlaps(a, { minX: 5, minY: 5, maxX: 20, maxY: 20 })).toBe(true);
    expect(overlaps(a, { minX: 11, minY: 0, maxX: 20, maxY: 10 })).toBe(false);
  });
});

describe('clipPolyline', () => {
  const rect = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

  test('splits a line that leaves the rectangle and comes back into two runs', () => {
    const runs = clipPolyline(
      [
        { x: 2, y: 5 },
        { x: 15, y: 5 },
        { x: 15, y: 8 },
        { x: 2, y: 8 },
      ],
      rect,
    );
    expect(runs).toHaveLength(2);
    expect(runs[0][runs[0].length - 1]).toEqual({ x: 10, y: 5 });
    expect(runs[1][0]).toEqual({ x: 10, y: 8 });
  });

  test('keeps a fully visible line as one run', () => {
    const runs = clipPolyline(
      [
        { x: 1, y: 1 },
        { x: 5, y: 5 },
        { x: 9, y: 2 },
      ],
      rect,
    );
    expect(runs).toHaveLength(1);
    expect(runs[0]).toHaveLength(3);
  });

  test('returns nothing for a line outside the rectangle', () => {
    expect(
      clipPolyline(
        [
          { x: 20, y: 20 },
          { x: 30, y: 20 },
        ],
        rect,
      ),
    ).toEqual([]);
  });
});

describe('clipPolygon', () => {
  const rect = { minX: 5, minY: -100, maxX: 20, maxY: 100 };
  const square: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  test('cuts the part outside the rectangle', () => {
    const clipped = clipPolygon(square, rect);
    expect(boundsOf(clipped)).toEqual({ minX: 5, minY: 0, maxX: 10, maxY: 10 });
    expect(polygonArea(clipped)).toBe(50);
  });

  test('keeps a polygon that is entirely inside', () => {
    expect(clipPolygon(square, { minX: -5, minY: -5, maxX: 50, maxY: 50 })).toHaveLength(4);
  });

  test('returns nothing for a polygon entirely outside', () => {
    expect(clipPolygon(square, { minX: 100, minY: 100, maxX: 200, maxY: 200 })).toEqual([]);
  });

  test('does not mutate its input', () => {
    const copy = square.map((p) => ({ ...p }));
    clipPolygon(square, rect);
    expect(square).toEqual(copy);
  });
});

describe('toPathData', () => {
  test('rounds to whole metres and emits one subpath per line', () => {
    const d = toPathData([
      [
        { x: 0.4, y: 0.6 },
        { x: 10.2, y: 20.7 },
      ],
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    ]);
    expect(d).toBe('M0 1L10 21M1 1L2 2');
  });

  test('never writes a negative zero', () => {
    const d = toPathData([
      [
        { x: -0.2, y: 0.2 },
        { x: 5, y: 5 },
      ],
    ]);
    expect(d).toBe('M0 0L5 5');
  });

  test('closes polygons with Z', () => {
    const d = toPathData(
      [
        [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 4 },
        ],
      ],
      { closed: true },
    );
    expect(d).toBe('M0 0L4 0L4 4Z');
  });

  test('skips degenerate subpaths created by rounding', () => {
    const d = toPathData([
      [
        { x: 0.1, y: 0.1 },
        { x: 0.3, y: 0.2 },
      ],
    ]);
    expect(d).toBe('');
  });
});

describe('names', () => {
  test('strips the stop platform number', () => {
    expect(stripStopNumber('Kakowskiego 02')).toBe('Kakowskiego');
    expect(stripStopNumber('Wał Gocławski 01')).toBe('Wał Gocławski');
    expect(stripStopNumber('Rondo Wiatraczna')).toBe('Rondo Wiatraczna');
  });

  test.each([
    ['Generała Stanisława Skalskiego', 'Skalskiego'],
    ['Jana Nowaka-Jeziorańskiego', 'Nowaka-Jeziorańskiego'],
    ['Generała Tadeusza Bora-Komorowskiego', 'Bora-Komorowskiego'],
    ['Generała Romana Abrahama', 'Abrahama'],
    ['Stanisława Rogalskiego', 'Rogalskiego'],
    ['Kapelanów Armii Krajowej', 'Kapelanów AK'],
    ['Aleja Stanów Zjednoczonych', 'Al. Stanów Zjednoczonych'],
    ['Ostrobramska', 'Ostrobramska'],
  ])('shortens the street name %s', (full, short) => {
    expect(shortStreetName(full)).toBe(short);
  });
});

describe('formatApproxDistance', () => {
  test.each([
    [347, 'ok. 350 m'],
    [392, 'ok. 400 m'],
    [60, 'ok. 50 m'],
    [1240, 'ok. 1,2 km'],
    [960, 'ok. 950 m'],
    [975, 'ok. 1,0 km'],
    [999, 'ok. 1,0 km'],
  ])('%i m → %s', (metres, expected) => {
    expect(formatApproxDistance(metres)).toBe(expected);
  });
});

describe('groupStops', () => {
  test('merges platforms of one stop and uses the nearest platform for the distance', () => {
    const groups = groupStops([
      { name: 'Kakowskiego 01', point: { x: 323, y: -106 } },
      { name: 'Kakowskiego 02', point: { x: 341, y: -93 } },
      { name: 'Wał Gocławski 01', point: { x: -26, y: 392 } },
    ]);
    expect(groups.map((g) => g.name)).toEqual(['Kakowskiego', 'Wał Gocławski']);
    expect(groups[0].point.x).toBeCloseTo(332, 0);
    expect(groups[0].distance).toBeCloseTo(Math.hypot(323, 106), 0);
  });

  test('orders stops by distance from the origin', () => {
    const groups = groupStops([
      { name: 'Daleki 01', point: { x: 500, y: 0 } },
      { name: 'Bliski 01', point: { x: 100, y: 0 } },
    ]);
    expect(groups.map((g) => g.name)).toEqual(['Bliski', 'Daleki']);
  });
});

describe('label placement', () => {
  const window = { minX: -100, minY: -100, maxX: 100, maxY: 100 };

  test('anchors a label in the middle of the longest visible line', () => {
    const anchor = pickLabelAnchor(
      [
        [
          { x: -50, y: 0 },
          { x: 50, y: 0 },
        ],
      ],
      window,
    );
    expect(anchor).not.toBeNull();
    expect(anchor?.x).toBeCloseTo(0, 5);
    expect(anchor?.y).toBeCloseTo(0, 5);
    expect(anchor?.angle).toBeCloseTo(0, 5);
  });

  test('keeps text upright: angle stays within (-90, 90]', () => {
    const anchor = pickLabelAnchor(
      [
        [
          { x: 50, y: 0 },
          { x: -50, y: -10 },
        ],
      ],
      window,
    );
    expect(anchor).not.toBeNull();
    expect(anchor!.angle).toBeGreaterThan(-90);
    expect(anchor!.angle).toBeLessThanOrEqual(90);
  });

  test('anchors at a given fraction of the visible line', () => {
    const anchor = pickLabelAnchor(
      [
        [
          { x: -50, y: 0 },
          { x: 50, y: 0 },
        ],
      ],
      window,
      0.25,
    );
    expect(anchor?.x).toBeCloseTo(-25, 5);
  });

  test('moves a colliding label to a free alternative position along the street', () => {
    const placed = placeLabels(
      [
        {
          text: 'Ulica',
          x: 0,
          y: 0,
          angle: 0,
          rank: 1,
          alternatives: [{ x: 60, y: 0, angle: 0 }],
        },
      ],
      { fontSize: 18, window, reserved: [{ minX: -30, minY: -20, maxX: 30, maxY: 20 }] },
    );
    expect(placed).toHaveLength(1);
    expect(placed[0].x).toBe(60);
  });

  test('returns null when no line is visible', () => {
    const anchor = pickLabelAnchor(
      [
        [
          { x: 500, y: 500 },
          { x: 600, y: 500 },
        ],
      ],
      window,
    );
    expect(anchor).toBeNull();
  });

  test('drops a label that would collide with an already placed, more important one', () => {
    const placed = placeLabels(
      [
        { text: 'Pierwsza ulica', x: 0, y: 0, angle: 0, rank: 1 },
        { text: 'Druga ulica', x: 10, y: 4, angle: 0, rank: 2 },
        { text: 'Trzecia ulica', x: 0, y: 80, angle: 0, rank: 2 },
      ],
      { fontSize: 18, window },
    );
    expect(placed.map((l) => l.text)).toEqual(['Pierwsza ulica', 'Trzecia ulica']);
  });

  test('drops a label that would cover a reserved zone (pin, plate, scale bar)', () => {
    const placed = placeLabels(
      [
        { text: 'Zasłonięta', x: 0, y: 0, angle: 0, rank: 1 },
        { text: 'Wolna', x: 0, y: 70, angle: 0, rank: 1 },
      ],
      { fontSize: 18, window, reserved: [{ minX: -20, minY: -20, maxX: 20, maxY: 20 }] },
    );
    expect(placed.map((l) => l.text)).toEqual(['Wolna']);
  });

  test('drops a label whose box would stick out of the window', () => {
    const placed = placeLabels([{ text: 'Bardzo długa nazwa ulicy', x: 90, y: 0, angle: 0, rank: 1 }], {
      fontSize: 18,
      window,
    });
    expect(placed).toEqual([]);
  });
});

describe('buildRouteMap', () => {
  const config: RouteMapConfig = {
    origin: ORIGIN,
    halfWidth: 480,
    halfHeight: 420,
    minBuildingArea: 100,
    maxStops: 5,
    maxStopDistance: 500,
  };
  const at = (dx: number, dy: number) => ({
    lat: ORIGIN.lat + dy / 110540,
    lon: ORIGIN.lon + dx / (111320 * Math.cos((ORIGIN.lat * Math.PI) / 180)),
  });
  const way = (id: number, tags: Record<string, string>, pts: [number, number][]): OsmElement => ({
    type: 'way',
    id,
    tags,
    geometry: pts.map(([dx, dy]) => at(dx, dy)),
  });

  const elements: OsmElement[] = [
    way(1, { highway: 'tertiary', name: 'Generała Stanisława Skalskiego' }, [
      [-200, 0],
      [200, 0],
    ]),
    way(2, { highway: 'residential', name: 'Kwarciana' }, [
      [0, -150],
      [0, 150],
    ]),
    way(3, { highway: 'footway' }, [
      [0, 0],
      [30, 30],
    ]),
    way(4, { building: 'apartments' }, [
      [20, 20],
      [60, 20],
      [60, 50],
      [20, 50],
      [20, 20],
    ]),
    way(5, { building: 'yes' }, [
      [100, 100],
      [103, 100],
      [103, 103],
      [100, 103],
      [100, 100],
    ]),
    way(6, { natural: 'water', name: 'Jezioro' }, [
      [-300, 100],
      [-250, 100],
      [-250, 160],
      [-300, 160],
      [-300, 100],
    ]),
    way(7, { waterway: 'canal', name: 'Kanał' }, [
      [-400, -200],
      [-100, -250],
    ]),
    way(8, { leisure: 'park' }, [
      [150, -150],
      [250, -150],
      [250, -80],
      [150, -80],
      [150, -150],
    ]),
    way(9, { highway: 'tertiary', name: 'Daleka' }, [
      [3000, 0],
      [3200, 0],
    ]),
    {
      type: 'node',
      id: 10,
      tags: { highway: 'bus_stop', name: 'Kakowskiego 01' },
      ...at(300, -100),
    },
    {
      type: 'node',
      id: 11,
      tags: { highway: 'bus_stop', name: 'Kakowskiego 02' },
      ...at(310, -90),
    },
    {
      type: 'node',
      id: 12,
      tags: { highway: 'bus_stop', name: 'Za daleko 01' },
      ...at(900, 0),
    },
  ];

  const map = buildRouteMap(elements, config);

  test('builds a centred viewBox from the half sizes', () => {
    expect(map.viewBox).toEqual({ x: -480, y: -420, width: 960, height: 840 });
  });

  test('keeps roads by class and drops footways and off-window ways', () => {
    expect(map.layers.roadsCollector).toContain('M');
    expect(map.layers.roadsLocal).toContain('M');
    expect(map.layers.roadsArterial).toBe('');
    expect(map.layers.roadsCollector).not.toContain('3000');
  });

  test('keeps large buildings and drops tiny ones', () => {
    const subpaths = map.layers.buildings.split('Z').filter(Boolean);
    expect(subpaths).toHaveLength(1);
  });

  test('separates water areas, water lines and green areas', () => {
    expect(map.layers.waterAreas).toContain('Z');
    expect(map.layers.waterLines).toContain('M');
    expect(map.layers.parks).toContain('Z');
  });

  test('groups stops and drops the ones beyond the max distance', () => {
    expect(map.stops).toHaveLength(1);
    expect(map.stops[0].name).toBe('Kakowskiego');
    expect(map.stops[0].distance).toBeGreaterThan(300);
  });

  test('labels main streets with short names', () => {
    expect(map.labels.map((l) => l.text)).toContain('Skalskiego');
  });

  test('moves labels out of reserved zones', () => {
    // środek Skalskiego (0, 0) wypada w strefie zarezerwowanej, więc etykieta przesuwa się wzdłuż ulicy
    const reserved = buildRouteMap(elements, { ...config, reservedZones: [{ minX: -50, minY: -50, maxX: 50, maxY: 50 }] });
    const label = reserved.labels.find((l) => l.text === 'Skalskiego');
    expect(label?.desktop).not.toBeNull();
    expect(Math.abs(label!.desktop!.x)).toBeGreaterThanOrEqual(50);
  });

  test('moves street labels away from stop markers', () => {
    const street = way(1, { highway: 'tertiary', name: 'Generała Stanisława Skalskiego' }, [
      [-200, 0],
      [200, 0],
    ]);
    const stopOnStreet: OsmElement = {
      type: 'node',
      id: 20,
      tags: { highway: 'bus_stop', name: 'Skalskiego 01' },
      ...at(0, 5),
    };
    const free = buildRouteMap([street], config).labels.find((l) => l.text === 'Skalskiego');
    const moved = buildRouteMap([street, stopOnStreet], config).labels.find((l) => l.text === 'Skalskiego');
    expect(free?.desktop?.x).toBeCloseTo(0, 0);
    expect(moved?.desktop).not.toBeNull();
    expect(Math.abs(moved!.desktop!.x)).toBeGreaterThan(26);
  });

  test('drops stops whose marker would be cut by the window edge', () => {
    const edgeStop: OsmElement = {
      type: 'node',
      id: 30,
      tags: { highway: 'bus_stop', name: 'Przy krawędzi 01' },
      ...at(0, -415), // 415 m na południe, okno ma ±420 m
    };
    const names = buildRouteMap([edgeStop], { ...config, maxStopDistance: 1000 }).stops.map((s) => s.name);
    expect(names).toEqual([]);
  });

  test('gives a label its own position on small screens, clear of the small-screen zones', () => {
    const street = way(1, { highway: 'tertiary', name: 'Generała Stanisława Skalskiego' }, [
      [-400, -30],
      [400, -30],
    ]);
    // strefa tylko na telefonie przykrywa środek ulicy (jak plakietka po lewej stronie pinu)
    const zone = { minX: -350, minY: -130, maxX: 40, maxY: 12 };
    const label = buildRouteMap([street], { ...config, smallReservedZones: [zone] }).labels.find((l) => l.text === 'Skalskiego');
    expect(label?.desktop?.x).toBeCloseTo(0, 0);
    expect(label?.small).not.toBeNull();
    // na telefonie etykieta stoi poza strefą (jej pudełko nie dotyka strefy), a nie w pozycji z pulpitu
    const halfWidth = ('Skalskiego'.length * 44 * 0.55) / 2;
    expect(label!.small!.x - halfWidth).toBeGreaterThanOrEqual(zone.maxX);
  });

  test('hides a label on small screens when there is no free place for it there', () => {
    const street = way(1, { highway: 'tertiary', name: 'Generała Stanisława Skalskiego' }, [
      [-300, 0],
      [300, 0],
    ]);
    // pas przez całą ulicę: na telefonie nie ma gdzie postawić etykiety, na pulpicie strefy nie obowiązują
    const band = { minX: -400, minY: -40, maxX: 400, maxY: 40 };
    const label = buildRouteMap([street], { ...config, smallReservedZones: [band] }).labels.find((l) => l.text === 'Skalskiego');
    expect(label?.small).toBeNull();
    expect(label?.desktop?.x).toBeCloseTo(0, 0);
  });

  test('keeps a label that fits only on small screens', () => {
    const street = way(1, { highway: 'tertiary', name: 'Generała Stanisława Skalskiego' }, [
      [-300, 0],
      [300, 0],
    ]);
    // strefa tylko na pulpicie zasłania całą ulicę; na telefonie jej nie ma
    const band = { minX: -400, minY: -40, maxX: 400, maxY: 40 };
    const label = buildRouteMap([street], { ...config, reservedZones: [band], smallReservedZones: [] }).labels.find(
      (l) => l.text === 'Skalskiego',
    );
    expect(label?.desktop).toBeNull();
    expect(label?.small).not.toBeNull();
  });

  test('gives two different streets with the same short name separate label entries', () => {
    const a = way(1, { highway: 'tertiary', name: 'Jana Kowalskiego' }, [
      [-300, -200],
      [300, -200],
    ]);
    const b = way(2, { highway: 'tertiary', name: 'Stanisława Kowalskiego' }, [
      [-300, 200],
      [300, 200],
    ]);
    const labels = buildRouteMap([a, b], config).labels.filter((l) => l.text === 'Kowalskiego');
    expect(labels).toHaveLength(2);
    expect(labels[0].desktop?.y).not.toBe(labels[1].desktop?.y);
  });

  test('is deterministic', () => {
    expect(buildRouteMap(elements, config)).toEqual(map);
  });

  test('does not depend on the order of the input elements (stable diff after regeneration)', () => {
    // po kilka elementów na warstwę, inaczej kolejność nie ma czego przestawić
    const many: OsmElement[] = [
      ...elements,
      way(50, { highway: 'residential', name: 'Druga' }, [
        [-100, 80],
        [100, 80],
      ]),
      way(51, { highway: 'residential', name: 'Trzecia' }, [
        [-100, -80],
        [100, -80],
      ]),
      way(52, { building: 'apartments' }, [
        [-60, 20],
        [-20, 20],
        [-20, 60],
        [-60, 60],
        [-60, 20],
      ]),
      way(53, { building: 'apartments' }, [
        [200, 20],
        [240, 20],
        [240, 60],
        [200, 60],
        [200, 20],
      ]),
    ];
    const forward = buildRouteMap(many, config);
    expect(forward.layers.buildings.split('Z').filter(Boolean).length).toBeGreaterThan(1);
    expect(buildRouteMap([...many].reverse(), config)).toEqual(forward);
  });

  test('clips big polygons to the frame so no vertex lies far outside it', () => {
    const huge = way(40, { leisure: 'park' }, [
      [-2000, -2000],
      [2000, -2000],
      [2000, 2000],
      [-2000, 2000],
      [-2000, -2000],
    ]);
    const clipped = buildRouteMap([huge], config).layers.parks;
    const numbers = [...clipped.matchAll(/-?\d+/g)].map(([n]) => Math.abs(Number(n)));
    // okno ±480 × ±440 plus margines 30 m
    expect(Math.max(...numbers)).toBeLessThanOrEqual(510);
    expect(clipped).toContain('Z');
  });
});
