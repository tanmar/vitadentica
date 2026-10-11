// Podgląd na GitHub Pages stoi pod podścieżką (https://<konto>.github.io/<repo>/), a strona używa adresów od korzenia
// (`/implanty`, `/_astro/...`). Ten skrypt przepisuje je w dist/ na `<base>/...`. Dotyczy wyłącznie wdrożenia podglądu;
// build produkcyjny (domena vitadentica.pl) zostaje bez zmian.
// Użycie: node scripts/pages-base.mjs /vitadentica
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!/^\/[\w.-]+$/.test(base)) {
  console.error('Podaj podścieżkę, np.: node scripts/pages-base.mjs /vitadentica');
  process.exit(1);
}
const DIST = new URL('../dist/', import.meta.url).pathname;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

// Adres od korzenia: zaczyna się od pojedynczego `/` (nie `//` i nie już przepisany).
const root = String.raw`\/(?!\/|${base.slice(1)}\/)`;
const rules = [
  [new RegExp(String.raw`\b(href|src|poster|action)="${root}`, 'g'), `$1="${base}/`],
  [new RegExp(String.raw`url\((['"]?)${root}`, 'g'), `url($1${base}/`],
  // srcset="/a.webp 480w, /b.webp 720w"
  [
    /\bsrcset="([^"]*)"/g,
    (_m, value) =>
      `srcset="${value.replace(new RegExp(String.raw`(^|,\s*)${root}`, 'g'), `$1${base}/`)}"`,
  ],
];

let changed = 0;
for (const file of walk(DIST).filter((f) => /\.(html|css)$/.test(f))) {
  const before = readFileSync(file, 'utf8');
  const after = rules.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), before);
  if (after !== before) {
    writeFileSync(file, after);
    changed += 1;
  }
}
console.log(`Przepisano adresy w ${changed} plikach (${base}/…)`);
