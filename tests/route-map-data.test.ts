import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { routeMap, routeMapOrigin } from '../src/data/route-map';
import { clinic, directionsUrls } from '../src/lib/clinic';
import { buildDentist } from '../src/lib/jsonld';
import { stripStopNumber } from '../src/lib/route-map';

/**
 * Mapa dojazdu to dane wygenerowane z OpenStreetMap. Te testy pilnują, żeby (1) pin na mapie, link do Map Google
 * i JSON-LD wskazywały to samo miejsce, (2) wygenerowane dane nie zostały zepsute (puste warstwy, etykiety
 * poza oknem), (3) licencja ODbL była spełniona (podanie źródła).
 */
const MAX_PATH_DATA_BYTES = 60 * 1024;
const MAX_STOP_DISTANCE_M = 500;

describe('współrzędne gabinetu', () => {
  test('mapa jest wycentrowana na clinic.geo', () => {
    expect(routeMapOrigin.lat).toBeCloseTo(clinic.geo.lat, 6);
    expect(routeMapOrigin.lon).toBeCloseTo(clinic.geo.lon, 6);
  });

  test('pin w mapsUrl (Mapy Google) zgadza się z clinic.geo', () => {
    const lat = /!3d(-?\d+\.\d+)/.exec(clinic.mapsUrl)?.[1];
    const lon = /!4d(-?\d+\.\d+)/.exec(clinic.mapsUrl)?.[1];
    expect(Number(lat)).toBeCloseTo(clinic.geo.lat, 5);
    expect(Number(lon)).toBeCloseTo(clinic.geo.lon, 5);
  });

  test('linki „Wyznacz trasę" prowadzą do tych współrzędnych', () => {
    const { google, apple } = directionsUrls(clinic.geo);
    const destination = `${clinic.geo.lat},${clinic.geo.lon}`;
    expect(new URL(google).hostname).toBe('www.google.com');
    expect(google).toContain(`destination=${destination}`);
    expect(new URL(apple).hostname).toBe('maps.apple.com');
    expect(apple).toContain(`daddr=${destination}`);
    // oba linki bez wymuszonego trybu: aplikacja użyje ostatnio wybranego przez użytkownika (dojazd autem lub komunikacją)
    expect(google).not.toMatch(/travelmode/);
    expect(apple).not.toMatch(/dirflg/);
  });

  test('JSON-LD zawiera geo i hasMap', () => {
    const dentist = buildDentist(clinic) as Record<string, unknown>;
    expect(dentist.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: clinic.geo.lat,
      longitude: clinic.geo.lon,
    });
    expect(dentist.hasMap).toBe(clinic.mapsUrl);
  });
});

describe('plakietka na mapie', () => {
  test('skrócony adres jest częścią pełnego adresu gabinetu', () => {
    const { street, streetShort } = clinic.address;
    const tokens = streetShort.replace(/^ul\.\s*/, '').split(/\s+/);
    for (const token of tokens) expect(street, `«${token}» z plakietki`).toContain(token);
  });
});

describe('wygenerowane dane mapy', () => {
  test('viewBox jest wycentrowany na gabinecie (0, 0)', () => {
    const { x, y, width, height } = routeMap.viewBox;
    expect(x + width / 2).toBe(0);
    expect(y + height / 2).toBe(0);
  });

  test('wszystkie warstwy mają geometrię', () => {
    for (const [name, d] of Object.entries(routeMap.layers)) {
      expect(d.length, `warstwa ${name}`).toBeGreaterThan(0);
    }
  });

  test('rozmiar danych mieści się w budżecie (jest wstrzykiwany do HTML strony kontaktu)', () => {
    const total = Object.values(routeMap.layers).reduce((sum, d) => sum + d.length, 0);
    expect(total).toBeLessThanOrEqual(MAX_PATH_DATA_BYTES);
  });

  test('etykiety leżą w oknie mapy (oba położenia), a ulica gabinetu ma najwyższą rangę i widać ją na telefonie', () => {
    const { x, y, width, height } = routeMap.viewBox;
    for (const label of routeMap.labels) {
      expect(label.desktop !== null || label.small !== null, `«${label.text}» nie jest nigdzie widoczna`).toBe(true);
      for (const pos of [label.desktop, label.small]) {
        if (!pos) continue;
        expect(pos.x).toBeGreaterThanOrEqual(x);
        expect(pos.x).toBeLessThanOrEqual(x + width);
        expect(pos.y).toBeGreaterThanOrEqual(y);
        expect(pos.y).toBeLessThanOrEqual(y + height);
      }
    }
    const home = routeMap.labels.find((l) => l.text === 'Skalskiego');
    expect(home?.rank).toBe(0);
    expect(home?.desktop).not.toBeNull();
    expect(home?.small).not.toBeNull();
  });

  test('znaczniki przystanków (także powiększone na telefonie) mieszczą się w oknie mapy', () => {
    const { width, height } = routeMap.viewBox;
    const markerRadiusOnPhone = 14 * 1.7 + 2;
    for (const stop of routeMap.stops) {
      expect(Math.abs(stop.x) + markerRadiusOnPhone, `przystanek ${stop.name} (x)`).toBeLessThanOrEqual(width / 2);
      expect(Math.abs(stop.y) + markerRadiusOnPhone, `przystanek ${stop.name} (y)`).toBeLessThanOrEqual(height / 2);
    }
  });

  test('przystanki: numery 1..n, rosnąca odległość, w zasięgu, bez numeru słupka w nazwie', () => {
    const { stops } = routeMap;
    expect(stops.length).toBeGreaterThanOrEqual(3);
    stops.forEach((stop, i) => {
      expect(stop.number).toBe(i + 1);
      expect(stop.distance).toBeLessThanOrEqual(MAX_STOP_DISTANCE_M);
      expect(stripStopNumber(stop.name)).toBe(stop.name);
      if (i > 0) expect(stop.distance).toBeGreaterThanOrEqual(stops[i - 1].distance);
    });
  });
});

describe('licencja OpenStreetMap (ODbL)', () => {
  test('komponent mapy podaje źródło i linkuje do strony praw autorskich OSM', () => {
    const source = readFileSync(resolve(__dirname, '..', 'src/components/contact/RouteMap.astro'), 'utf8');
    expect(source).toContain('OpenStreetMap');
    expect(source).toContain('https://www.openstreetmap.org/copyright');
  });
});
