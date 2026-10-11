// Generuje zasoby marki używane poza HTML-em strony: kartę Open Graph (podgląd linku w komunikatorach,
// mediach społecznościowych i asystentach AI) oraz logo dla danych strukturalnych (JSON-LD `logo`).
// Wejście: src/assets/illustrations/home.webp, src/assets/logo-vitadentica.png. Wyjście: public/og-image.jpg, public/logo.png.
// Wynik jest w repo (jak mastery ilustracji), więc build nie zależy od czcionek systemowych.
// Użycie: npm run brand:generate
import { statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const ILLUSTRATION = join(ROOT, 'src/assets/illustrations/home.webp');
const LOGO = join(ROOT, 'src/assets/logo-vitadentica.png');
const OG_OUTPUT = join(ROOT, 'public/og-image.jpg');
const LOGO_OUTPUT = join(ROOT, 'public/logo.png');

// Rozmiar zalecany przez Facebooka/LinkedIn/X dla dużej karty (proporcje 1,91:1).
const WIDTH = 1200;
const HEIGHT = 630;
const NIGHT = '#0d0f23'; // --color-night
const NIGHT_LIFT = '#1e2040'; // --color-night-3
const CYAN = '#4cc3ec'; // akcent nagłówka hero

// Ilustracja: kadr zawęża się do zęba z pierścieniem (bez ciemnych marginesów), cała wysokość karty.
const ART_CROP = { left: 150, width: 980 };
const ART_WIDTH = 470;
const ART_FADE = 170; // px płynnego przejścia lewej krawędzi ilustracji w tło

const LOGO_WIDTH = 540;
const LOGO_LEFT = 100;
const LOGO_TOP = 150;

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const background = Buffer.from(`
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NIGHT}"/>
      <stop offset="1" stop-color="${NIGHT_LIFT}"/>
    </linearGradient>
    <radialGradient id="burgundy" cx="0.05" cy="1.05" r="0.7">
      <stop offset="0" stop-color="#c0002a" stop-opacity="0.38"/>
      <stop offset="1" stop-color="#c0002a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#base)"/>
  <rect width="100%" height="100%" fill="url(#burgundy)"/>
</svg>`);

const copy = Buffer.from(`
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <text x="${LOGO_LEFT}" y="${LOGO_TOP + 270}" font-family="${FONT}" font-size="42" font-weight="700" fill="#ffffff">Gabinet stomatologiczny</text>
  <text x="${LOGO_LEFT}" y="${LOGO_TOP + 322}" font-family="${FONT}" font-size="34" font-weight="400" fill="${CYAN}">Gocław · Warszawa</text>
</svg>`);

// Maska alfa: lewa krawędź ilustracji znika płynnie, więc przez nią widać faktyczne tło (bez szwu).
const fadeMask = Buffer.from(`
<svg width="${ART_WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="${ART_FADE / ART_WIDTH}" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#m)"/>
</svg>`);

const artworkMeta = await sharp(ILLUSTRATION).metadata();
const artwork = await sharp(ILLUSTRATION)
  .extract({ left: ART_CROP.left, top: 0, width: ART_CROP.width, height: artworkMeta.height })
  .resize({ width: ART_WIDTH, height: HEIGHT, fit: 'cover', position: 'centre' })
  .composite([{ input: fadeMask, blend: 'dest-in' }])
  .png()
  .toBuffer();

const logo = await sharp(LOGO).resize({ width: LOGO_WIDTH }).png().toBuffer();

await sharp(background)
  .composite([
    { input: artwork, left: WIDTH - ART_WIDTH, top: 0 },
    { input: logo, left: LOGO_LEFT, top: LOGO_TOP },
    { input: copy, left: 0, top: 0 },
  ])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(OG_OUTPUT);

// Logo dla JSON-LD: oryginał bez zmian (Google wymaga min. 112×112 px, pilnuje tego tests/brand-images.test.ts).
await sharp(LOGO).png({ compressionLevel: 9 }).toFile(LOGO_OUTPUT);

const kb = (file) => `${(statSync(file).size / 1024).toFixed(0)} kB`;
for (const [label, file] of [['public/og-image.jpg', OG_OUTPUT], ['public/logo.png', LOGO_OUTPUT]]) {
  const { width, height } = await sharp(file).metadata();
  console.log(`${label.padEnd(20)} ${`${width}×${height}`.padEnd(10)} ${kb(file)}`);
}
