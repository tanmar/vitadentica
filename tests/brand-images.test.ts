import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { clinic } from '../src/lib/clinic';

/**
 * Zasoby marki z public/ (generuje je scripts/generate-brand-images.mjs): karta Open Graph i logo do JSON-LD.
 * Platformy kadrują kartę do 1,91:1 i odrzucają zbyt małe obrazy; Google wymaga logo min. 112×112 px.
 */
const publicDir = resolve(__dirname, '..', 'public');
const file = (path: string) => resolve(publicDir, path.replace(/^\//, ''));

describe('zasoby marki', () => {
  test('clinic.image i clinic.logo wskazują istniejące pliki', () => {
    expect(existsSync(file(clinic.image)), clinic.image).toBe(true);
    expect(existsSync(file(clinic.logo)), clinic.logo).toBe(true);
  });

  test('karta Open Graph ma 1200×630 px', async () => {
    const { width, height } = await sharp(file(clinic.image)).metadata();
    expect({ width, height }).toEqual({ width: 1200, height: 630 });
  });

  test('logo spełnia minimum Google (112×112 px)', async () => {
    const { width = 0, height = 0 } = await sharp(file(clinic.logo)).metadata();
    expect(width).toBeGreaterThanOrEqual(112);
    expect(height).toBeGreaterThanOrEqual(112);
  });
});
