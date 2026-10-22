import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import {
  MIN_HEADROOM,
  PHOTO_FILE,
  TARGET_HEADROOM,
  addHeadroom,
  headroom,
  paddingFor,
} from '../scripts/team-headroom.mjs';

/**
 * Kadrowanie zdjęć zespołu. Astro przycina je przy buildzie do rozmiaru karty (`<Image width height>`),
 * więc głowę ucina już ten krok, a nie CSS. Dwie zasady:
 *  - nad głową jest zapas tła (inaczej każde przycięcie od góry ucina czoło lub włosy),
 *  - każde `<Image>` ze zdjęciem zespołu kotwiczy kadr u góry (`position="top"`), więc przycięcie bierze dół kadru.
 */
const root = resolve(__dirname, '..');
const teamDir = resolve(root, 'src/assets/team');

/** Jasne tło z zapasem do 255 nawet po dodaniu gradientu (bufor zawija wartości powyżej 255). */
const BACKGROUND = { r: 215, g: 220, b: 230 };
/** Różnica koloru tła między lewą a prawą krawędzią (tło zdjęć ma gradient także w poziomie). */
const HORIZONTAL_GRADIENT = 20;
const HEAD_WIDTH = 40;

/** Surowe piksele: tło z gradientem poziomym i ciemny prostokąt („głowa”) zaczynający się w wierszu `top`. */
function portraitPixels(width: number, height: number, top: number, gradient: number): Buffer {
  const pixels = Buffer.alloc(width * height * 3);
  const headLeft = Math.round((width - HEAD_WIDTH) / 2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isHead = y >= top && x >= headLeft && x < headLeft + HEAD_WIDTH;
      const shift = Math.round((x / (width - 1)) * gradient);
      const offset = (y * width + x) * 3;
      pixels[offset] = isHead ? 58 : BACKGROUND.r + shift;
      pixels[offset + 1] = isHead ? 42 : BACKGROUND.g + shift;
      pixels[offset + 2] = isHead ? 32 : BACKGROUND.b + shift;
    }
  }
  return pixels;
}

async function portrait(width: number, height: number, top: number, gradient = 0): Promise<Buffer> {
  return sharp(portraitPixels(width, height, top, gradient), { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/** Średnia różnica bezwzględna między dwoma wierszami zdjęcia (po wszystkich kolumnach i kanałach). */
async function rowDifference(image: Buffer, rowA: number, rowB: number): Promise<number> {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  const stride = info.width * info.channels;
  let total = 0;
  for (let i = 0; i < stride; i += 1) total += Math.abs(data[rowA * stride + i] - data[rowB * stride + i]);
  return total / stride;
}

describe('headroom (zapas nad głową)', () => {
  test('zwraca udział wysokości zajęty przez tło nad głową', async () => {
    const result = await headroom(await portrait(200, 400, 40));

    expect(result.firstRow).toBe(40);
    expect(result.ratio).toBeCloseTo(0.1, 2);
  });

  test('głowa przy samej krawędzi daje zapas bliski zera', async () => {
    const result = await headroom(await portrait(200, 400, 0));

    expect(result.firstRow).toBe(0);
    expect(result.ratio).toBe(0);
  });

  test('tło z gradientem poziomym nie jest brane za postać', async () => {
    const result = await headroom(await portrait(200, 400, 40, HORIZONTAL_GRADIENT));

    expect(result.firstRow).toBe(40);
  });

  test('odmawia, gdy nie ma postaci (jednolite tło nie jest „dużym zapasem”)', async () => {
    await expect(headroom(await portrait(200, 400, 400))).rejects.toThrow('nie znaleziono postaci');
  });

  test('uwzględnia obrót z EXIF, jak Astro', async () => {
    const upright = await portrait(200, 400, 40);
    // zdjęcie zapisane bokiem (400×200), które EXIF (orientacja 6) każe obrócić do pionu (200×400)
    const sideways = await sharp(upright).rotate(270).withMetadata({ orientation: 6 }).jpeg().toBuffer();

    const result = await headroom(sideways);

    expect(result.height).toBe(400);
    expect(result.firstRow).toBe(40);
  });
});

describe('paddingFor (ile tła dołożyć)', () => {
  test('dokłada tyle wierszy, by zapas po dołożeniu równał się docelowemu', () => {
    const pad = paddingFor({ height: 1000, firstRow: 20 }, 0.1);

    expect((20 + pad) / (1000 + pad)).toBeCloseTo(0.1, 2);
  });

  test('nie dokłada nic, gdy zapas jest już wystarczający', () => {
    expect(paddingFor({ height: 1000, firstRow: 150 }, 0.1)).toBe(0);
  });
});

describe('addHeadroom (dokładanie tła)', () => {
  test('wydłuża zdjęcie i daje docelowy zapas nad głową', async () => {
    const tight = await portrait(200, 400, 4);
    const pad = paddingFor(await headroom(tight), TARGET_HEADROOM);

    const padded = await addHeadroom(tight, pad);
    const { height, width } = await sharp(padded).metadata();
    const result = await headroom(padded);

    expect({ width, height }).toEqual({ width: 200, height: 400 + pad });
    expect(result.ratio).toBeGreaterThanOrEqual(TARGET_HEADROOM - 0.005);
  });

  test('dołożony pas łączy się z tłem bez szwu i zachowuje gradient poziomy', async () => {
    const tight = await portrait(200, 400, 30, HORIZONTAL_GRADIENT);
    const pad = 60;

    const padded = await addHeadroom(tight, pad);
    const seam = await rowDifference(padded, pad - 1, pad + 1);
    const bandVersusBackground = await rowDifference(padded, 0, pad + 10);
    const { data, info } = await sharp(padded).raw().toBuffer({ resolveWithObject: true });
    const bandGradient = data[(info.width - 1) * 3] - data[0]; // czerwony kanał: prawa krawędź − lewa, w pierwszym wierszu pasa

    expect(seam).toBeLessThan(2);
    expect(bandVersusBackground).toBeLessThan(3);
    expect(bandGradient).toBeGreaterThan(HORIZONTAL_GRADIENT - 3);
  });

  test('odmawia, gdy głowa dotyka górnej krawędzi (nie ma z czego zbudować tła)', async () => {
    await expect(addHeadroom(await portrait(200, 400, 0), 40)).rejects.toThrow('pierwszym wierszu');
  });

  test.each([0, -5, 2.5])('odmawia nieprawidłowej liczby wierszy: %s', async (pad) => {
    await expect(addHeadroom(await portrait(200, 400, 40), pad)).rejects.toThrow(RangeError);
  });
});

describe('zdjęcia zespołu', () => {
  const photos = readdirSync(teamDir).filter((name) => PHOTO_FILE.test(name));

  test('katalog ma zdjęcia', () => {
    expect(photos.length).toBeGreaterThan(0);
  });

  test.each(photos)('%s: nad głową jest zapas tła', async (name) => {
    const { ratio } = await headroom(readFileSync(resolve(teamDir, name)));

    expect(
      ratio,
      `zapas nad głową ${(ratio * 100).toFixed(1)}% wysokości: uruchom \`npm run team:headroom -- --write\``,
    ).toBeGreaterThanOrEqual(MIN_HEADROOM);
  });
});

describe('<Image> ze zdjęciem zespołu', () => {
  const srcDir = resolve(root, 'src');
  const astroFiles = (readdirSync(srcDir, { recursive: true }) as string[]).filter((path) => path.endsWith('.astro'));
  /** `<Image … src={…photo…} … />`: zdjęcia zespołu idą z pola `photo` kolekcji `team` (klasy typu `area__photo` nie pasują). */
  const teamImages = astroFiles.flatMap((path) => {
    const source = readFileSync(resolve(srcDir, path), 'utf8');
    return (source.match(/<Image[\s\S]*?\/>/g) ?? [])
      .filter((tag) => /\bphoto\b/.test(tag))
      .map((tag) => ({ path, tag }));
  });

  test('znaleziono wszystkie miejsca ze zdjęciem zespołu', () => {
    // Pięć dziś: karta zespołu, karta lekarza, pasek zespołu, kółka w hero, obszary na stronie głównej.
    expect(new Set(teamImages.map(({ path }) => path)).size).toBeGreaterThanOrEqual(5);
  });

  test.each(teamImages.map(({ path, tag }) => [path, tag] as const))('%s: kadr kotwiczony u góry', (_path, tag) => {
    expect(tag).toContain('position="top"');
  });
});
