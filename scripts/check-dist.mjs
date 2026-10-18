// Audyt wygenerowanej strony (dist/): linki wewnętrzne, nagłówki, alt, JSON-LD, meta.
// Użycie: npm run build && npm run verify
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const problems = [];
const warn = (page, msg) => problems.push(`${page}: ${msg}`);

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const files = walk(DIST).map((f) => '/' + relative(DIST, f));
const pageFiles = files.filter((f) => f.endsWith('.html'));

// Build stagingowy (SITE_ENV=staging) blokuje roboty w robots.txt i daje noindex na każdej stronie;
// produkcyjny ma jawne `index, follow`. Tryb wynika z samego dist, więc ten sam skrypt sprawdza oba.
const robotsTxt = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';
const isStagingDist = /^Disallow:\s*\/\s*$/m.test(robotsTxt);

/** Czy ścieżka istnieje jako wygenerowana strona/plik (bez ukośnika końcowego i bez .html). */
function exists(path) {
  const clean = decodeURIComponent(path.split('#')[0].split('?')[0]).replace(/\/$/, '') || '/index';
  return files.includes(clean) || files.includes(`${clean}.html`) || files.includes(clean + '/index.html');
}

for (const file of pageFiles) {
  const html = readFileSync(join(DIST, file), 'utf8');
  const page = file.replace(/\.html$/, '') || '/';

  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
  if (!title) warn(page, 'brak <title>');
  if (title.length > 70) warn(page, `title ma ${title.length} znaków (>70)`);
  if (!description) warn(page, 'brak meta description');
  if (description.length > 170) warn(page, `description ma ${description.length} znaków (>170)`);

  // Strona główna: H1 mówi, czym jest strona i gdzie (nie samo hasło): dwie główne usługi + miejsce.
  // Decyzje nr 23 i 25 w docs/DECISIONS.md.
  if (file === '/index.html') {
    const h1Text = (/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    if (!/implant/i.test(h1Text) || !/ortodonc/i.test(h1Text) || !/Gocław/i.test(h1Text)) {
      warn(page, `h1 strony głównej powinien nazywać usługi i miejsce (implant… + ortodonc… + Gocław), jest: "${h1Text}"`);
    }
  }

  // Nagłówki: dokładnie jeden h1, bez przeskoków poziomu.
  const headings = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  const h1Count = headings.filter((h) => h === 1).length;
  if (file !== '/404.html' && h1Count !== 1) warn(page, `h1: ${h1Count} (oczekiwano 1)`);
  headings.reduce((prev, level) => {
    if (level > prev + 1) warn(page, `przeskok nagłówka h${prev} → h${level}`);
    return level;
  }, 1);

  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    // Astro zapisuje alt="" (obraz dekoracyjny) jako samo `alt`; to poprawny HTML, więc akceptujemy oba zapisy.
    const withoutValues = img[0].replace(/"[^"]*"/g, '""'); // ` alt ` w wartości innego atrybutu nie liczy się
    if (!/\salt(?=[\s=>/])/.test(withoutValues)) warn(page, `<img> bez alt: ${img[0].slice(0, 80)}`);
    // Wymiary w HTML rezerwują miejsce przed załadowaniem obrazu (CLS < 0,1).
    if (!/\swidth="\d+"/.test(img[0]) || !/\sheight="\d+"/.test(img[0])) {
      warn(page, `<img> bez width/height: ${img[0].slice(0, 80)}`);
    }
  }

  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
    if (!exists(href)) warn(page, `martwy link wewnętrzny: ${href}`);
  }
  for (const m of html.matchAll(/\bsrc="(\/[^"]*)"/g)) {
    if (!exists(m[1])) warn(page, `brakujący zasób: ${m[1]}`);
  }
  for (const m of html.matchAll(/\bsrcset="([^"]*)"/g)) {
    for (const candidate of m[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url.startsWith('/') && !exists(url)) warn(page, `brakujący zasób w srcset: ${url}`);
    }
  }

  // Podgląd linku (Open Graph / Twitter): obraz absolutny, istniejący w dist, z wymiarami i opisem.
  if (file !== '/404.html') {
    const meta = (attr, name) =>
      new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(html)?.[1] ?? '';
    const ogImage = meta('property', 'og:image');
    if (!/^https:\/\//.test(ogImage)) warn(page, `og:image nie jest adresem absolutnym: "${ogImage}"`);
    else if (!exists(new URL(ogImage).pathname)) warn(page, `og:image wskazuje brakujący plik: ${ogImage}`);
    for (const name of ['og:image:width', 'og:image:height', 'og:image:alt']) {
      if (!meta('property', name)) warn(page, `brak ${name}`);
    }
    if (meta('name', 'twitter:card') !== 'summary_large_image') warn(page, 'brak twitter:card=summary_large_image');
    for (const name of ['twitter:title', 'twitter:description', 'twitter:image']) {
      if (!meta('name', name)) warn(page, `brak ${name}`);
    }
  }

  // Dyrektywa robots: produkcja `index, follow`, staging i strona błędu `noindex`.
  const robotsMeta = /<meta name="robots" content="([^"]*)"/.exec(html)?.[1] ?? '';
  const mustBeNoindex = isStagingDist || file === '/404.html';
  if (mustBeNoindex && !/noindex/.test(robotsMeta)) {
    warn(page, `${isStagingDist ? 'build stagingowy' : 'strona błędu'} bez noindex (robots: "${robotsMeta}")`);
  }
  if (!mustBeNoindex && !/(^|, )index, follow(,|$)/.test(robotsMeta)) {
    warn(page, `brak jawnego "index, follow" (robots: "${robotsMeta}")`);
  }

  // Strona błędu nie deklaruje canonical ani wersji .md; pozostałe mają oba.
  const hasCanonical = /<link rel="canonical"/.test(html);
  if (file === '/404.html' && (hasCanonical || /rel="alternate" type="text\/markdown"/.test(html))) {
    warn(page, '404 nie powinna mieć canonical ani linku do .md');
  }
  if (file !== '/404.html' && !hasCanonical) warn(page, 'brak canonical');

  // Pozycja menu odpowiadająca stronie jest oznaczona aria-current (nie dotyczy 404).
  const navPaths = [...html.matchAll(/<a href="(\/[^"]*)"[^>]*>/g)].map((m) => m[1]);
  const inNav = file !== '/404.html' && page !== '/index' && navPaths.includes(page);
  if (inNav && !html.includes('aria-current="page"')) warn(page, 'brak aria-current="page" w nawigacji');

  // Odwołania @id w JSON-LD muszą wskazywać na istniejące encje w tym samym dokumencie.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) =>
    JSON.parse(m[1]),
  );
  // Każda strona (poza 404) definiuje witrynę, siebie i gabinet, więc wszystkie odwołania da się rozwiązać.
  if (file !== '/404.html') {
    const types = blocks.flatMap((b) => (Array.isArray(b['@type']) ? b['@type'] : [b['@type']]));
    for (const required of ['WebSite', 'Dentist']) {
      if (!types.includes(required)) warn(page, `JSON-LD: brak encji ${required}`);
    }
    const pageTypes = ['WebPage', 'MedicalWebPage', 'ContactPage', 'AboutPage'];
    if (!types.some((t) => pageTypes.includes(t))) warn(page, 'JSON-LD: brak encji strony (WebPage)');
    // FAQPage tylko wtedy, gdy pytania są widoczne na stronie (wytyczne Google). Szukamy w tekście bez
    // <script>/<style>, bo samo pytanie występuje też w bloku JSON-LD.
    // Porównujemy bez białych znaków: tagi inline zostawiają w tekście odstępy, których nie ma w danych.
    const squash = (text) => text.replace(/\s+/g, '');
    const visibleText = squash(
      html
        .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&'),
    );
    for (const block of blocks.filter((b) => b['@type'] === 'FAQPage')) {
      for (const q of block.mainEntity ?? []) {
        if (!visibleText.includes(squash(q.name))) {
          warn(page, `JSON-LD FAQ: pytania nie widać na stronie: "${q.name.slice(0, 50)}"`);
        }
        const answer = q.acceptedAnswer?.text ?? '';
        if (!answer || !visibleText.includes(squash(answer))) {
          warn(page, `JSON-LD FAQ: odpowiedź różni się od widocznej na stronie: "${q.name.slice(0, 50)}"`);
        }
      }
    }
  }
  if (file === '/404.html' && blocks.length > 0) warn(page, '404 nie powinna mieć danych strukturalnych (JSON-LD)');
  const defined = new Set(blocks.map((b) => b['@id']).filter(Boolean));
  const walkRefs = (node) => {
    if (Array.isArray(node)) return node.forEach(walkRefs);
    if (node && typeof node === 'object') {
      const keys = Object.keys(node);
      if (keys.length === 1 && keys[0] === '@id' && !defined.has(node['@id'])) {
        warn(page, `JSON-LD: odwołanie do nieistniejącej encji ${node['@id']}`);
      }
      Object.values(node).forEach(walkRefs);
    }
  };
  blocks.forEach(walkRefs);

  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try {
      JSON.parse(m[1]);
    } catch {
      warn(page, 'JSON-LD nie jest poprawnym JSON-em');
    }
  }

  // Klasy wariantowe Tailwinda (focus:, md: …) muszą mieć regułę w CSS. Gdy skanowanie źródeł ich nie wykryje,
  // np. link „przejdź do treści" (focus:not-sr-only) zostaje niewidoczny po sfokusowaniu klawiaturą.
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('');
  const body = html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '');
  const variantClasses = new Set(
    [...body.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c.includes(':')),
  );
  for (const cls of variantClasses) {
    const escaped = cls.replace(/[^\w-]/g, (ch) => `\\${ch}`);
    if (!css.includes(`.${escaped}`)) warn(page, `klasa Tailwinda «${cls}» bez reguły w CSS (skanowanie źródeł jej nie wykryło?)`);
  }

  if (/!\[img\]|\[object Object\]|>undefined</.test(html)) warn(page, 'ślad niedokończonej konwersji w HTML');
}

// Pliki dla agentów AI: llms.txt i llms-full.txt istnieją, a każdy link z llms.txt prowadzi do pliku w dist.
for (const name of ['/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap-index.xml', '/og-image.jpg', '/logo.png']) {
  if (!files.includes(name)) warn(name, 'brak pliku w dist');
}
if (files.includes('/llms.txt')) {
  const llms = readFileSync(join(DIST, 'llms.txt'), 'utf8');
  for (const m of llms.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) {
    const path = new URL(m[1]).pathname;
    if (!files.includes(path)) warn('/llms.txt', `link do nieistniejącego pliku: ${path}`);
  }
}

// Wersje .md nie mogą zawierać odwołań do plików źródłowych ani pustych linków.
for (const file of files.filter((f) => f.endsWith('.md'))) {
  const md = readFileSync(join(DIST, file), 'utf8');
  if (/\]\(\.\.?\//.test(md)) warn(file, 'względny link/obraz do pliku źródłowego (](../)');
  if (/!\[[^\]]*\]\(/.test(md)) warn(file, 'obraz Markdown w wersji .md (powinien być zastąpiony alt)');
}

// Wersje .md: każda strona HTML (poza 404) ma swój odpowiednik z tym samym nagłówkiem H1.
const decodeText = (text) =>
  text
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
for (const file of pageFiles) {
  if (file === '/404.html') continue;
  const md = file.replace(/\.html$/, '.md');
  if (!existsSync(join(DIST, md))) {
    warn(file, `brak wersji ${md}`);
    continue;
  }
  const htmlH1 = decodeText(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(readFileSync(join(DIST, file), 'utf8'))?.[1] ?? '');
  const mdH1 = /^# (.+)$/m.exec(readFileSync(join(DIST, md), 'utf8'))?.[1].trim() ?? '';
  if (htmlH1 !== mdH1) warn(file, `H1 w ${md} ("${mdH1}") różni się od H1 w HTML ("${htmlH1}")`);
}

// Znaczniki cen z treści ({{cennik: …}}, {{cena: …}}) są zamienione we wszystkich formatach, a każda kwota z wersji .md
// jest też w HTML. Treść stron jest cache'owana w warstwie treści (klucz: plik strony, nie cennik), więc nieaktualny
// cache objawiłby się właśnie rozjazdem kwot między .md (świeże) a HTML (stare). `npm run build` używa --force.
for (const file of files.filter((f) => /\.(html|md|txt)$/.test(f))) {
  if (/\{\{\s*(cennik|cena)/i.test(readFileSync(join(DIST, file), 'utf8'))) warn(file, 'niezamieniony znacznik cen {{…}}');
}
for (const file of pageFiles) {
  const md = file.replace(/\.html$/, '.md');
  if (file === '/404.html' || !existsSync(join(DIST, md))) continue;
  const htmlText = decodeText(readFileSync(join(DIST, file), 'utf8').replace(/<(script|style)[\s\S]*?<\/\1>/g, ''));
  const mdText = readFileSync(join(DIST, md), 'utf8');
  const amounts = new Set([...mdText.matchAll(/\d{1,3}(?: \d{3})*(?:,\d+)? zł/g)].map((m) => m[0]));
  for (const amount of amounts) {
    if (!htmlText.includes(amount)) warn(file, `kwota „${amount}” z ${md} nie występuje w HTML (nieaktualny cache treści? uruchom build z --force)`);
  }
}

if (problems.length > 0) {
  console.error(`\n✘ ${problems.length} problem(ów):\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`✔ ${pageFiles.length} stron, ${files.length} plików: bez problemów`);
