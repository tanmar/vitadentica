import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';

/**
 * Ilustracje nagłówków (src/assets/illustrations/). Test pilnuje, żeby:
 *  - każda podstrona z treści i strona główna miała obraz,
 *  - mastery były zoptymalizowane (oryginały z generatora mają ok. 2,3 MB),
 *  - proporcje pasowały do slotu w nagłówku (nie rozjeżdżały układu),
 *  - indeks (illustrations/index.ts) wskazywał dokładnie te pliki, które są na dysku.
 */
const root = resolve(__dirname, '..');
const dir = resolve(root, 'src/assets/illustrations');
const MAX_MASTER_BYTES = 120 * 1024;
const MIN_WIDTH = 960; // największy slot (hero strony głównej, 460 px) przy gęstości 2×
// Podstrony mają ten sam slot (proporcje ok. 0,897); strona główna ma własny, nieco wyższy kadr
const RATIO_RANGE = { min: 0.88, max: 0.97 };

const pageSlugs = readdirSync(resolve(root, 'src/content/pages'))
  .filter((file) => file.endsWith('.md'))
  .map((file) => file.replace(/\.md$/, ''));
const expected = ['home', ...pageSlugs].sort();
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.webp')).sort() : [];

describe('ilustracje nagłówków', () => {
  test('strona główna i każda podstrona z treści mają ilustrację', () => {
    expect(files.map((f) => f.replace(/\.webp$/, ''))).toEqual(expected);
  });

  test.each(expected)('%s: waga i wymiary mastera', async (slug) => {
    const file = resolve(dir, `${slug}.webp`);
    expect(statSync(file).size, 'master za duży: uruchom scripts/optimize-illustrations.mjs').toBeLessThanOrEqual(MAX_MASTER_BYTES);
    const { width = 0, height = 0 } = await sharp(file).metadata();
    expect(width, 'za mało pikseli na ekrany 2×').toBeGreaterThanOrEqual(MIN_WIDTH);
    const ratio = width / height;
    expect(ratio).toBeGreaterThanOrEqual(RATIO_RANGE.min);
    expect(ratio).toBeLessThanOrEqual(RATIO_RANGE.max);
  });

  test('indeks ilustracji wskazuje dokładnie pliki z katalogu', () => {
    const index = readFileSync(resolve(dir, 'index.ts'), 'utf8');
    const imported = [...index.matchAll(/from '\.\/([\w-]+)\.webp'/g)].map(([, name]) => name).sort();
    expect(imported).toEqual(expected);
  });
});
