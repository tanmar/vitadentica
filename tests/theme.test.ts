import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');
const tokens = read('src/styles/tokens.css');

type TokenMap = Record<string, string>;

function declarations(block: string): TokenMap {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

/** Zawartość pierwszego bloku `{ ... }` po danym selektorze/at-rule (bez zagnieżdżeń głębszych niż jeden poziom). */
function blockAfter(source: string, marker: string, occurrence: 'first' | 'last' = 'first'): string {
  const start = occurrence === 'first' ? source.indexOf(marker) : source.lastIndexOf(marker);
  if (start < 0) throw new Error(`Brak "${marker}" w tokens.css`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`Niezamknięty blok po "${marker}"`);
}

const light = declarations(blockAfter(tokens, '@theme'));
const darkSystem = declarations(blockAfter(blockAfter(tokens, '@media (prefers-color-scheme: dark)'), ':root:not'));
const darkManual = declarations(blockAfter(tokens, ":root[data-theme='dark'] {", 'last'));
const dark: TokenMap = { ...light, ...darkManual };

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('motyw ciemny: tokeny', () => {
  it('blok systemowy i ręczny (data-theme) mają identyczne deklaracje', () => {
    expect(Object.keys(darkManual).length).toBeGreaterThan(5);
    expect(darkSystem).toEqual(darkManual);
  });

  it('nadpisuje wyłącznie tokeny zdefiniowane w @theme', () => {
    const unknown = Object.keys(darkManual).filter((name) => !(name in light));
    expect(unknown).toEqual([]);
  });
});

describe('kontrast tekstu (WCAG AA 4.5:1)', () => {
  const surfaces = ['--color-paper', '--color-off', '--color-surface'] as const;
  const texts = ['--color-ink', '--color-body', '--color-muted', '--color-brand-ink'] as const;

  describe.each([
    ['jasny', light],
    ['ciemny', dark],
  ] as const)('motyw %s', (_name, palette) => {
    it.each(surfaces.flatMap((surface) => texts.map((text) => [text, surface] as const)))('%s na %s', (text, surface) => {
      expect(contrast(palette[text], palette[surface])).toBeGreaterThanOrEqual(4.5);
    });

    it('biały tekst na kolorze marki (przyciski)', () => {
      expect(contrast('#ffffff', palette['--color-brand'])).toBeGreaterThanOrEqual(4.5);
    });

    it('brand-ink na tle kafelka --color-brand-tint', () => {
      expect(contrast(palette['--color-brand-ink'], palette['--color-brand-tint'])).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe('CSP a skrypt inicjalizujący motyw', () => {
  it('public/_headers zawiera hash sha256 skryptu theme-init.js', () => {
    const script = read('src/scripts/theme-init.js').trim();
    const hash = `'sha256-${createHash('sha256').update(script).digest('base64')}'`;
    expect(read('public/_headers')).toContain(hash);
  });
});
