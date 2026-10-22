/**
 * Zapas tła nad głową na zdjęciach zespołu (src/assets/team/*.jpg).
 *
 * Astro przycina zdjęcia do rozmiaru karty (kwadrat, 4:5), więc gdy głowa zaczyna się tuż przy górnej krawędzi pliku,
 * przycięcie ucina czoło lub włosy. Skrypt mierzy zapas i dokłada tło nad głową tam, gdzie go brakuje.
 *
 * Użycie:
 *   npm run team:headroom                    # raport: zapas każdego zdjęcia
 *   npm run team:headroom -- --write         # dokłada tło zdjęciom poniżej MIN_HEADROOM (nadpisuje pliki)
 *
 * Tło zdjęć to bardzo łagodny gradient (scripts/team-backdrop.swift), więc dołożony pas jest uśrednionym brzegiem
 * zdjęcia i nie widać szwu. Oryginały są w git: powrót to `git checkout -- src/assets/team`.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

/** Zdjęcia, które przyjmuje kolekcja `team` (`image()`). Dokładać tło umiemy tylko do JPEG. */
export const PHOTO_FILE = /\.(jpe?g|png|webp)$/i;
const JPEG_FILE = /\.jpe?g$/i;

/** Poniżej tego udziału wysokości zdjęcie uznajemy za zbyt ciasne u góry (zdjęcia z wystarczającym zapasem mają ok. 10%). */
export const MIN_HEADROOM = 0.08;
/** Do tylu uzupełniamy zdjęcia, którym brakuje zapasu. */
export const TARGET_HEADROOM = 0.1;

/** Piksel należy do postaci, gdy różni się od tła w tym wierszu o tyle (suma różnic kanałów RGB). */
const FOREGROUND_DIFF = 40;
/** Tyle pikseli w wierszu musi odbiegać od tła, by wiersz uznać za część głowy (odporność na pojedyncze błędy JPEG). */
const MIN_FOREGROUND_PIXELS = 3;
/** Szerokość brzegu (udział szerokości po każdej stronie), z którego liczymy kolor tła w wierszu. */
const EDGE_SHARE = 0.03;
/** Głowa musi zaczynać się w górnej części zdjęcia; dalej nie szukamy. */
const SCAN_SHARE = 0.5;
/** Najwyżej tyle górnych wierszy uśredniamy na pas dokładanego tła (omija szum pojedynczego wiersza JPEG). */
const EDGE_SAMPLE_ROWS = 6;
const JPEG_QUALITY = 92;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * @param {Buffer} input plik zdjęcia
 * @returns {Promise<{ firstRow: number, height: number, ratio: number }>} pierwszy wiersz z postacią i jego udział w wysokości
 * @throws gdy w górnej połowie zdjęcia nie ma postaci (np. jednolite tło albo postać w barwach tła): zapasu nie da się zmierzyć
 */
export async function headroom(input) {
  // `rotate()` jak w Astro: zdjęcie z telefonu bywa zapisane bokiem i obracane dopiero według EXIF.
  const { data, info } = await sharp(input).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const edge = Math.max(3, Math.floor(width * EDGE_SHARE));
  const scanRows = Math.floor(height * SCAN_SHARE);
  const leftColumns = [...Array(edge).keys()];
  const rightColumns = leftColumns.map((x) => width - 1 - x);
  const edgeColor = (row, columns, c) => median(columns.map((x) => data[row + x * channels + c]));

  for (let y = 0; y < scanRows; y += 1) {
    const row = y * width * channels;
    // Tło ma łagodny gradient także w poziomie, więc jego kolor w wierszu wynika z lewego i prawego brzegu.
    const left = [...Array(channels).keys()].map((c) => edgeColor(row, leftColumns, c));
    const right = [...Array(channels).keys()].map((c) => edgeColor(row, rightColumns, c));
    let foreground = 0;
    for (let x = 0; x < width; x += 1) {
      const t = x / (width - 1);
      let diff = 0;
      for (let c = 0; c < channels; c += 1) {
        diff += Math.abs(data[row + x * channels + c] - (left[c] + (right[c] - left[c]) * t));
      }
      if (diff > FOREGROUND_DIFF) foreground += 1;
    }
    if (foreground >= MIN_FOREGROUND_PIXELS) return { firstRow: y, height, ratio: y / height };
  }
  throw new Error('nie znaleziono postaci w górnej połowie zdjęcia: zapasu nad głową nie da się zmierzyć');
}

/**
 * Ile wierszy tła dołożyć u góry, żeby zapas wyniósł `target` całkowitej wysokości: (firstRow + p) / (height + p) = target.
 * @param {{ firstRow: number, height: number }} measured
 * @param {number} target
 */
export function paddingFor({ firstRow, height }, target) {
  return Math.max(0, Math.ceil((target * height - firstRow) / (1 - target)));
}

/**
 * Dokłada `pad` wierszy tła nad zdjęciem: uśredniony górny brzeg (tylko wiersze nad głową), rozmyty w poziomie,
 * żeby nie powielać pionowych smug szumu JPEG. Gdy głowa dotyka krawędzi, nie ma z czego zbudować tła: błąd.
 */
export async function addHeadroom(input, pad) {
  if (!Number.isInteger(pad) || pad < 1) throw new RangeError(`pad musi być dodatnią liczbą całkowitą, jest: ${pad}`);
  const { data: photo, info } = await sharp(input).rotate().png().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const { firstRow } = await headroom(photo);
  if (firstRow < 1) throw new Error('głowa zaczyna się w pierwszym wierszu zdjęcia: tła nie da się dołożyć, trzeba wyciąć kadr od nowa');
  const edge = await sharp(photo)
    .extract({ left: 0, top: 0, width, height: Math.min(EDGE_SAMPLE_ROWS, firstRow) })
    .resize(width, 1, { fit: 'fill' })
    .blur(4)
    .resize(width, pad, { fit: 'fill', kernel: 'nearest' })
    .png()
    .toBuffer();
  return sharp({ create: { width, height: height + pad, channels: 3, background: '#ffffff' } })
    .composite([
      { input: edge, left: 0, top: 0 },
      { input: photo, left: 0, top: pad },
    ])
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

async function main(write) {
  const dir = resolve(fileURLToPath(import.meta.url), '../../src/assets/team');
  const failures = [];
  for (const name of readdirSync(dir).filter((file) => PHOTO_FILE.test(file))) {
    const path = resolve(dir, name);
    const label = basename(name).padEnd(28);
    try {
      const photo = readFileSync(path);
      const measured = await headroom(photo);
      const pad = measured.ratio < MIN_HEADROOM ? paddingFor(measured, TARGET_HEADROOM) : 0;
      const status = pad > 0 ? (write ? `dokładam ${pad} px` : `brakuje ${pad} px`) : 'ok';
      console.log(`${label} zapas ${(measured.ratio * 100).toFixed(1).padStart(5)}%  ${status}`);
      if (!write || pad === 0) continue;
      if (!JPEG_FILE.test(name)) throw new Error('tło dokładamy tylko do plików JPEG: zapisz zdjęcie jako .jpg');
      writeFileSync(path, await addHeadroom(photo, pad));
    } catch (error) {
      console.error(`${label} BŁĄD: ${error.message}`);
      failures.push(name);
    }
  }
  if (failures.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.includes('--write'));
}
