import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Liquid Glass: przezroczysta powierzchnia nie może obniżyć czytelności tekstu.
 * Test składa warstwy tak jak przeglądarka (fill nad tłem, połysk na wierzchu) i liczy kontrast WCAG
 * w najgorszym możliwym układzie tła, czyli tam, gdzie pod szkłem leżą plamy aurory albo czysta biel.
 *
 * Czego NIE modeluje: `saturate()` w backdrop-filter (podbija nasycenie tła pod szkłem; przy kryciu
 * 72–86% wpływ jest drobny) oraz literalnych rgba przycisków/pigułek w hero (mierzone ręcznie, ≥ 5:1).
 */
const tokens = readFileSync(resolve(__dirname, '..', 'src/styles/tokens.css'), 'utf8');

type Rgb = readonly [number, number, number];
interface Rgba {
  readonly rgb: Rgb;
  readonly a: number;
}
type TokenMap = Record<string, string>;

function declarations(block: string): TokenMap {
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

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

function parseColor(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: 1 };
  }
  const fn = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[/,]\s*([\d.]+))?\s*\)$/.exec(value);
  if (fn) return { rgb: [Number(fn[1]), Number(fn[2]), Number(fn[3])], a: fn[4] === undefined ? 1 : Number(fn[4]) };
  throw new Error(`Nieobsługiwany kolor: ${value}`);
}

/** Źródło (z alfą) nałożone na nieprzezroczyste tło. */
function over(top: Rgba, bottom: Rgb): Rgb {
  return [0, 1, 2].map((i) => Math.round(top.rgb[i] * top.a + bottom[i] * (1 - top.a))) as unknown as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = declarations(blockAfter(tokens, '@theme'));
const darkManual = declarations(blockAfter(tokens, ":root[data-theme='dark'] {", 'last'));
const dark: TokenMap = { ...light, ...darkManual };

const GLASS_TOKENS = [
  '--glass-blur',
  '--glass-saturate',
  '--glass-fill',
  '--glass-fill-strong',
  '--glass-border',
  '--glass-edge',
  '--glass-sheen',
  '--glass-rim',
  '--glass-shadow',
  '--glass-smoke',
  '--glass-smoke-edge',
  '--glass-smoke-sheen',
  '--aurora-burgundy',
  '--aurora-cyan',
] as const;

const MIN_TEXT_CONTRAST = 4.5;

describe('liquid glass: tokeny', () => {
  it.each(GLASS_TOKENS)('%s jest zdefiniowany w @theme', (name) => {
    expect(light[name], `brak ${name} w @theme`).toBeDefined();
  });

  it('motyw ciemny przesuwa szkło na ciemną powierzchnię (inny fill niż jasny)', () => {
    expect(dark['--glass-fill']).not.toBe(light['--glass-fill']);
    expect(dark['--aurora-burgundy']).not.toBe(light['--aurora-burgundy']);
  });
});

/** Kolor tokenu; brak tokenu to czytelna porażka pojedynczego przypadku, nie awaria całego pliku. */
function color(theme: TokenMap, name: string): Rgba {
  const value = theme[name];
  if (value === undefined) throw new Error(`Brak tokenu ${name}`);
  return parseColor(value);
}

const BACKDROPS = ['papier', 'sekcja off', 'bordowa plama', 'cyjanowa plama', 'obie plamy'] as const;
type Backdrop = (typeof BACKDROPS)[number];

/** Tło pod szkłem: strona, strona z jedną plamą aurory, z obiema plamami (najgorszy przypadek). */
function backdropFor(theme: TokenMap, name: Backdrop): Rgb {
  const paper = color(theme, '--color-paper').rgb;
  const burgundy = color(theme, '--aurora-burgundy');
  const cyan = color(theme, '--aurora-cyan');
  switch (name) {
    case 'papier':
      return paper;
    case 'sekcja off':
      return color(theme, '--color-off').rgb;
    case 'bordowa plama':
      return over(burgundy, paper);
    case 'cyjanowa plama':
      return over(cyan, paper);
    case 'obie plamy':
      return over(cyan, over(burgundy, paper));
  }
}

describe('liquid glass: kontrast tekstu na matowym szkle (karty, nagłówek, panele)', () => {
  const textTokens = ['--color-ink', '--color-body', '--color-muted', '--color-brand-ink'] as const;
  const fillTokens = ['--glass-fill', '--glass-fill-strong'] as const;

  describe.each([
    ['jasny', light],
    ['ciemny', dark],
  ] as const)('motyw %s', (_label, theme) => {
    describe.each(fillTokens)('%s', (fillToken) => {
      describe.each(BACKDROPS)('na tle „%s"', (backdropName) => {
        it.each(textTokens)(`%s ≥ ${MIN_TEXT_CONTRAST}:1`, (textToken) => {
          const filled = over(color(theme, fillToken), backdropFor(theme, backdropName));
          const sheened = over(color(theme, '--glass-sheen'), filled);
          const text = color(theme, textToken).rgb;
          expect(contrast(text, filled), 'bez połysku').toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
          expect(contrast(text, sheened), 'z połyskiem').toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        });
      });
    });
  });
});

describe('liquid glass: tekst bezpośrednio na aurorze (sekcje bez szkła: .lead, notatki, 404)', () => {
  const textTokens = ['--color-ink', '--color-body', '--color-muted', '--color-brand-ink'] as const;
  // Obie plamy naraz występują tylko pod kartami (pokrywa je szkło, sprawdzone wyżej): rogi sekcji
  // są po przeciwnych stronach, a plamy pod kartami zaczynają się 18% poniżej nagłówka.
  const bareBackdrops = BACKDROPS.filter((name) => name !== 'obie plamy');

  describe.each([
    ['jasny', light],
    ['ciemny', dark],
  ] as const)('motyw %s', (_label, theme) => {
    describe.each(bareBackdrops)('na tle „%s"', (backdropName) => {
      it.each(textTokens)(`%s ≥ ${MIN_TEXT_CONTRAST}:1`, (textToken) => {
        const text = color(theme, textToken).rgb;
        expect(contrast(text, backdropFor(theme, backdropName))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      });
    });
  });
});

describe('liquid glass: biały tekst na dymionym szkle (hero, pasek mobilny)', () => {
  // Hero jest ciemne w obu motywach; pod szkłem leżą najjaśniejsze elementy kompozycji.
  const hotspots: [string, Rgb][] = [
    ['cyjan marki', [0, 154, 206]],
    ['jasny bordo', [192, 0, 42]],
    ['biel (refleks zęba)', [255, 255, 255]],
  ];

  // Krycie białego tekstu w arkuszach: .kicker 0.76 (hero, panel, CTA: zawsze nad ciemną siatką plam)
  // oraz .mobbar span 0.9 (pasek mobilny: leży nad treścią strony, więc nad białym tłem).
  const HERO_TEXT_ALPHA = 0.76;
  const MOBBAR_TEXT_ALPHA = 0.9;
  const heroHotspots = hotspots.filter(([name]) => !name.startsWith('biel'));
  const whiteBackdrop: Rgb = [255, 255, 255];

  it.each(hotspots)('pełna biel na tle „%s" ≥ 4.5:1', (_name, backdrop) => {
    const smoked = over(color(light, '--glass-smoke'), backdrop);
    const panel = over(color(light, '--glass-smoke-sheen'), smoked);
    expect(contrast([255, 255, 255], panel)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it.each(heroHotspots)(`biel o kryciu ${HERO_TEXT_ALPHA} (hero, panel, CTA) na tle „%s" ≥ 4.5:1`, (_name, backdrop) => {
    const smoked = over(color(light, '--glass-smoke'), backdrop);
    const panel = over(color(light, '--glass-smoke-sheen'), smoked);
    const text = over({ rgb: [255, 255, 255], a: HERO_TEXT_ALPHA }, panel);
    expect(contrast(text, panel)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it(`biel o kryciu ${MOBBAR_TEXT_ALPHA} (pasek mobilny) nad białą stroną ≥ 4.5:1`, () => {
    const smoked = over(color(light, '--glass-smoke'), whiteBackdrop);
    const panel = over(color(light, '--glass-smoke-sheen'), smoked);
    const text = over({ rgb: [255, 255, 255], a: MOBBAR_TEXT_ALPHA }, panel);
    expect(contrast(text, panel)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
