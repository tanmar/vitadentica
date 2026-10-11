import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openSync } from 'fontkit';

const FONTS_CSS = resolve(__dirname, '../src/styles/fonts.css');
const TOKENS_CSS = resolve(__dirname, '../src/styles/tokens.css');
const POLISH_LETTERS = 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ';

interface Face {
  family: string;
  weight: string;
  style: string;
  file: string;
  ranges: Array<[number, number]>;
}

function parseRanges(value: string): Array<[number, number]> {
  return value.split(',').map((part) => {
    const [from, to = from] = part.trim().replace(/^U\+/i, '').split('-');
    return [parseInt(from, 16), parseInt(to.replace(/^U\+/i, ''), 16)];
  });
}

function parseFaces(): Face[] {
  const css = readFileSync(FONTS_CSS, 'utf8');
  // Zapasowe kroje (`* Fallback`, src: local()) nie mają pliku ani unicode-range: to osobna kategoria.
  return [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => {
    const get = (prop: string) => body.match(new RegExp(`${prop}:\\s*([^;]+);`))?.[1]?.trim() ?? '';
    const url = get('src').match(/url\('([^']+\.woff2)'\)/)?.[1] ?? '';
    return {
      family: get('font-family').replace(/['"]/g, ''),
      weight: get('font-weight'),
      style: get('font-style'),
      file: resolve(dirname(FONTS_CSS), url),
      ranges: get('unicode-range') ? parseRanges(get('unicode-range')) : [],
    };
  }).filter((face) => !face.family.endsWith(' Fallback'));
}

const inRanges = (cp: number, ranges: Face['ranges']) => ranges.some(([a, b]) => cp >= a && cp <= b);

describe('fonty: pokrycie polskich znaków', () => {
  const faces = parseFaces();

  it('każda deklaracja @font-face ma plik woff2 i unicode-range', () => {
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) {
      expect(face.file, `${face.family} ${face.weight}: brak pliku woff2`).toMatch(/\.woff2$/);
      expect(face.ranges.length, `${face.family} ${face.weight}: brak unicode-range`).toBeGreaterThan(0);
    }
  });

  const variants = [...new Set(faces.map((f) => `${f.family}|${f.weight}|${f.style}`))];
  it.each(variants)('%s ma wszystkie polskie litery (w zakresie i w pliku)', (key) => {
    const variantFaces = faces.filter((f) => `${f.family}|${f.weight}|${f.style}` === key);
    const glyphSets = variantFaces.map((f) => ({
      face: f,
      has: (cp: number) => (openSync(f.file) as { hasGlyphForCodePoint(cp: number): boolean }).hasGlyphForCodePoint(cp),
    }));
    const missing = [...POLISH_LETTERS].filter((ch) => {
      const cp = ch.codePointAt(0)!;
      return !glyphSets.some(({ face, has }) => inRanges(cp, face.ranges) && has(cp));
    });
    expect(missing.join(''), `brakuje: ${missing.join(' ')}`).toBe('');
  });

  it('każdy krój zapasowy z fonts.css ma dopasowane metryki (size-adjust)', () => {
    const css = readFileSync(FONTS_CSS, 'utf8');
    const fallbacks = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].filter(([, body]) => /font-family:\s*'[^']+ Fallback'/.test(body));
    expect(fallbacks.length).toBeGreaterThan(0);
    for (const [, body] of fallbacks) expect(body).toMatch(/size-adjust:\s*[\d.]+%/);
  });

  it('rodziny z tokens.css są zadeklarowane w fonts.css', () => {
    const tokens = readFileSync(TOKENS_CSS, 'utf8');
    const declared = new Set(faces.map((f) => f.family));
    for (const name of ['--font-sans', '--font-display']) {
      const primary = tokens.match(new RegExp(`${name}:\\s*'([^']+)'`))?.[1];
      expect(primary, `${name} nie ma pierwszej rodziny w cudzysłowie`).toBeTruthy();
      expect(declared.has(primary!), `${name}: ${primary} nie jest w fonts.css`).toBe(true);
    }
  });
});
