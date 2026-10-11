// Przygotowuje ilustracje stron z oryginałów w img/ (wyjście generatora obrazów, ok. 2 MB/szt.) do src/assets/illustrations/.
// Wynik to „master" 1280 px szerokości w WebP (q90): Astro (<Picture>) z niego robi warianty AVIF/WebP 480–960 px na etapie buildu.
// Użycie: node scripts/optimize-illustrations.mjs
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const SOURCE_DIR = join(ROOT, 'img');
const OUTPUT_DIR = join(ROOT, 'src/assets/illustrations');
const MASTER_WIDTH = 1280; // 2× największego wyświetlanego rozmiaru (ok. 460 px) z zapasem na powiększenie slotu
const MASTER_QUALITY = 90;

/** slug ilustracji (= slug podstrony) → plik źródłowy z img/ */
const SOURCES = {
  home: 'Gemini_Generated_Image_j8j3zmj8j3zmj8j3.jpeg',
  implanty: 'Gemini_Generated_Image_44m2f044m2f044m2.jpeg',
  // Przypisane wg treści obrazu: aparat stały (łuk z zamkami) to ortodoncja, przezroczyste nakładki to Invisalign®.
  ortodoncja: 'Gemini_Generated_Image_lal2fklal2fklal2.jpeg',
  invisalign: 'Gemini_Generated_Image_tnv057tnv057tnv0.jpeg',
  'stomatologia-ogolna': 'Gemini_Generated_Image_6jtdap6jtdap6jtd.jpeg',
  cennik: 'Gemini_Generated_Image_lqbyqplqbyqplqby.jpeg',
  'nasz-zespol': 'Gemini_Generated_Image_5gwx5l5gwx5l5gwx.jpeg',
  kontakt: 'Gemini_Generated_Image_4zwg5g4zwg5g4zwg.jpeg',
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} kB`;

for (const [slug, file] of Object.entries(SOURCES)) {
  const input = join(SOURCE_DIR, file);
  const output = join(OUTPUT_DIR, `${slug}.webp`);
  await sharp(input)
    .resize({ width: MASTER_WIDTH, withoutEnlargement: true })
    .webp({ quality: MASTER_QUALITY, effort: 6 })
    .toFile(output);
  const { width, height } = await sharp(output).metadata();
  console.log(`${slug.padEnd(22)} ${kb(statSync(input).size).padStart(8)} → ${kb(statSync(output).size).padStart(6)}  ${width}×${height}`);
}
