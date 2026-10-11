import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Prompty do ilustracji (docs/PROMPTY-ILUSTRACJI.md) mają trzymać się palety strony. Test pilnuje, żeby dokument
 * nie rozjechał się z tokenami (tokens.css), żeby każda podstrona miała prompt i żeby w promptach nie pojawił się
 * kolor spoza palety ani nazwa marki, której generator nie powinien rysować.
 */
const root = resolve(__dirname, '..');
const doc = readFileSync(resolve(root, 'docs/PROMPTY-ILUSTRACJI.md'), 'utf8');
const tokens = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');

const token = (name: string): string => {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens);
  if (!match) throw new Error(`Brak tokenu ${name} w tokens.css`);
  return match[1].toUpperCase();
};

/** Kolory ilustracji, które mają swój token (reszta palety to rozbłyski z hero, bez tokenu). */
const TOKEN_COLORS = {
  '--color-night': token('--color-night'),
  '--color-night-3': token('--color-night-3'),
  '--color-brand': token('--color-brand'),
  '--color-brand-bright': token('--color-brand-bright'),
  '--color-accent': token('--color-accent'),
  '--color-off': token('--color-off'),
} as const;
const EXTRA_COLORS = ['#E81848', '#37C3F0']; // aurora i ząb w hero (HeroVisual, GlassTooth)
const PALETTE = new Set([...Object.values(TOKEN_COLORS), ...EXTRA_COLORS]);

/** Bloki ```text``` z promptami stron (bez blokow stylu i negatywnego). */
const pageBlocks = [...doc.matchAll(/^### (.+?) \(`([^`]+)`\)[\s\S]*?```text\n([\s\S]*?)\n```/gm)].map(([, name, path, prompt]) => ({
  name,
  path,
  prompt,
}));

describe('paleta w dokumencie promptów', () => {
  test.each(Object.entries(TOKEN_COLORS))('tabela palety zawiera %s = %s', (tokenName, hex) => {
    const row = doc.split('\n').find((line) => line.includes(`\`${tokenName}\``));
    expect(row, `wiersz tokenu ${tokenName}`).toBeDefined();
    expect(row).toContain(hex);
  });
});

describe('prompty stron', () => {
  test('każda podstrona z treści, strona główna i 404 mają prompt', () => {
    const slugs = readdirSync(resolve(root, 'src/content/pages'))
      .filter((file) => file.endsWith('.md'))
      .map((file) => `/${file.replace(/\.md$/, '')}`);
    const documented = pageBlocks.map((block) => block.path);
    for (const path of ['/', '/404', ...slugs]) {
      expect(documented, `brak promptu dla ${path}`).toContain(path);
    }
  });

  test.each(pageBlocks)('$name: zawiera kolory bazowe i zakaz tekstu', ({ prompt }) => {
    for (const hex of [TOKEN_COLORS['--color-night'], TOKEN_COLORS['--color-brand-bright'], TOKEN_COLORS['--color-brand'], TOKEN_COLORS['--color-accent']]) {
      expect(prompt.toUpperCase()).toContain(hex);
    }
    expect(prompt).toContain('No text');
  });

  test.each(pageBlocks)('$name: używa wyłącznie kolorów z palety', ({ prompt }) => {
    const hexes = [...prompt.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(([hex]) => hex.toUpperCase());
    expect(hexes.length).toBeGreaterThan(0);
    for (const hex of hexes) expect(PALETTE.has(hex), `${hex} spoza palety`).toBe(true);
  });

  test.each(pageBlocks)('$name: nie prosi o rysowanie znaków towarowych ani nazwy gabinetu', ({ prompt }) => {
    expect(prompt).not.toMatch(/invisalign|vitadentica/i);
  });

  // Obrazy są dekoracją, nie twierdzeniem medycznym (otwarta sprawa 6 w DECISIONS.md: ograniczenia reklamy usług medycznych).
  test.each(pageBlocks)('$name: bez słów-obietnic (efekt, gwarancja, bezbolesność, bezpieczeństwo)', ({ prompt }) => {
    expect(prompt).not.toMatch(
      /\b(perfect(ly)?|guarantee\w*|before|after|painless|pain-free|invisible|safe(ly|st)?|instant\w*|cure[sd]?|best|miracle\w*)\b/i,
    );
  });
});
