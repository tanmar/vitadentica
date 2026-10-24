// Czysta logika wdrożenia FTP (scripts/deploy-ftp.mjs): walidacja env, haszowanie dist/, manifest, plan zmian,
// kolejność wysyłki, wykrywanie buildu stagingowego. Bez sieci; testy: tests/deploy-plan.test.ts.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MANIFEST_NAME = '.deploy-manifest.json';
export const MANIFEST_VERSION = 1;
export const DEFAULT_PORT = 21;
export const DEFAULT_IMPLICIT_PORT = 990;
export const DEFAULT_SITE_URL = 'https://vitadentica.pl';
const MAX_PORT = 65535;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const FTP_TRANSIENT_MIN = 400;
const FTP_TRANSIENT_MAX = 499;

// Pliki z dist/, które mają sens tylko na Cloudflare Pages; na Apache byłyby zwykłymi plikami do pobrania.
const CLOUDFLARE_ONLY_FILES = new Set(['_headers', '_redirects']);

/** Zamienia sekret w tekście na `***` (hasło nie może trafić do logów ani komunikatów błędów). */
export function redactSecret(text, secret) {
  return secret ? text.split(secret).join('***') : text;
}

const trimmed = (env, name) => (env[name] ?? '').trim();

function parseRemoteDir(raw, errors) {
  if (!raw) return errors.push('FTP_REMOTE_DIR: brak wartości (np. /public_html/vitadentica.pl); skrypt celowo nie ma wartości domyślnej.'), null;
  const segments = raw.split('/').filter(Boolean);
  if (!raw.startsWith('/') || segments.includes('..') || segments.includes('.')) {
    return errors.push(`FTP_REMOTE_DIR: "${raw}" musi być ścieżką bezwzględną (od "/") bez segmentów "." i "..".`), null;
  }
  return '/' + segments.join('/');
}

function parseSecure(raw, errors) {
  const value = raw.toLowerCase();
  if (value === '' || value === 'true') return true;
  if (value === 'implicit') return 'implicit';
  if (value === 'false') return false;
  return errors.push(`FTP_SECURE: "${raw}" jest niepoprawne (dozwolone: true, implicit, false).`), true;
}

function parsePort(raw, secure, errors) {
  if (!raw) return secure === 'implicit' ? DEFAULT_IMPLICIT_PORT : DEFAULT_PORT;
  const port = Number(raw);
  if (Number.isInteger(port) && port >= 1 && port <= MAX_PORT) return port;
  return errors.push(`FTP_PORT: "${raw}" nie jest numerem portu (1-${MAX_PORT}).`), DEFAULT_PORT;
}

function parseBoolean(name, raw, errors) {
  const value = raw.toLowerCase();
  if (value === '' || value === 'false') return false;
  if (value === 'true') return true;
  return errors.push(`${name}: "${raw}" jest niepoprawne (dozwolone: true, false).`), false;
}

function parseSiteUrl(raw, errors) {
  const value = raw || DEFAULT_SITE_URL;
  if (!/^https?:\/\/[^\s/]+/i.test(value)) {
    return errors.push(`SITE_URL: "${value}" musi być adresem http(s), np. ${DEFAULT_SITE_URL}.`), DEFAULT_SITE_URL;
  }
  return value.replace(/\/+$/, '');
}

/**
 * Waliduje zmienne środowiskowe. Zwraca `{ config, errors, warnings }`; przy błędach `config` jest `null`.
 * Komunikaty nigdy nie zawierają hasła.
 */
export function parseEnv(env) {
  const errors = [];
  const warnings = [];
  const host = trimmed(env, 'FTP_HOST');
  const user = trimmed(env, 'FTP_USER');
  const password = env.FTP_PASSWORD ?? '';
  if (!host) errors.push('FTP_HOST: brak wartości (adres serwera FTP).');
  else if (/[/\s]/.test(host)) errors.push('FTP_HOST: podaj samą nazwę serwera, bez ftp:// i ścieżki.');
  if (!user) errors.push('FTP_USER: brak wartości (login FTP).');
  if (!password) errors.push('FTP_PASSWORD: brak wartości (hasło FTP).');

  const remoteDir = parseRemoteDir(trimmed(env, 'FTP_REMOTE_DIR'), errors);
  const secure = parseSecure(trimmed(env, 'FTP_SECURE'), errors);
  const port = parsePort(trimmed(env, 'FTP_PORT'), secure, errors);
  const allowSelfSigned = parseBoolean('FTP_ALLOW_SELF_SIGNED', trimmed(env, 'FTP_ALLOW_SELF_SIGNED'), errors);
  const siteUrl = parseSiteUrl(trimmed(env, 'SITE_URL'), errors);

  if (secure === false) {
    warnings.push('FTP_SECURE=false: połączenie BEZ szyfrowania. Login i hasło FTP oraz cała zawartość wędrują otwartym tekstem.');
  }
  if (errors.length > 0) return { config: null, errors, warnings };
  return { config: { host, user, password, remoteDir, port, secure, allowSelfSigned, siteUrl }, errors, warnings };
}

// --- dist/ -> manifest ---------------------------------------------------------------------------------------

const toPosix = (parts) => parts.join('/');

function collectFiles(root, parts = []) {
  return readdirSync(join(root, ...parts), { withFileTypes: true }).flatMap((entry) => {
    const next = [...parts, entry.name];
    if (entry.isDirectory()) return collectFiles(root, next);
    return entry.isFile() ? [toPosix(next)] : [];
  });
}

export const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/** Mapa `ścieżka posix → SHA-256` dla wszystkich plików z katalogu (z dotfile, bez plików tylko-Cloudflare). */
export function hashDirectory(root) {
  const paths = collectFiles(root)
    .filter((path) => !CLOUDFLARE_ONLY_FILES.has(path))
    .sort();
  return Object.fromEntries(paths.map((path) => [path, sha256(readFileSync(join(root, path)))]));
}

export const createManifest = (files, deployedAt) => ({ version: MANIFEST_VERSION, deployedAt, files: { ...files } });

function validateManifestPath(path) {
  const segments = path.split('/');
  const isUnsafe =
    path === '' || path === MANIFEST_NAME || path.includes('\\') || /[\u0000-\u001f]/.test(path) ||
    segments.some((s) => s === '' || s === '.' || s === '..');
  if (isUnsafe) throw new Error(`Manifest na serwerze zawiera niedozwoloną ścieżkę: ${JSON.stringify(path)}.`);
}

/** Wczytuje manifest z serwera i sprawdza go (to dane zewnętrzne: wg niego skrypt może usuwać pliki). */
export function parseManifest(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Manifest ${MANIFEST_NAME} na serwerze nie jest poprawnym JSON-em; usuń go ręcznie, żeby zrobić pełny deploy.`);
  }
  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  if (!isObject || data.version !== MANIFEST_VERSION) {
    throw new Error(`Manifest ${MANIFEST_NAME} ma nieznaną wersję (oczekiwano ${MANIFEST_VERSION}).`);
  }
  const files = data.files;
  if (files === null || typeof files !== 'object' || Array.isArray(files)) {
    throw new Error(`Manifest ${MANIFEST_NAME} nie ma poprawnej listy plików.`);
  }
  for (const [path, hash] of Object.entries(files)) {
    validateManifestPath(path);
    if (typeof hash !== 'string' || !SHA256_HEX.test(hash)) throw new Error(`Manifest zawiera niepoprawny hash dla ${path}.`);
  }
  return createManifest(files, String(data.deployedAt ?? ''));
}

// --- plan ----------------------------------------------------------------------------------------------------

// 0 = zasoby fingerprintowane, 1 = pozostałe pliki, 2 = strony, 3 = .htaccess (na końcu).
const rankOf = (path) => {
  if (path === '.htaccess') return 3;
  if (/\.(html|md)$/.test(path)) return 2;
  return path.startsWith('_astro/') ? 0 : 1;
};

/** Kolejność wysyłki: zasoby przed stronami, które się do nich odwołują, `.htaccess` na samym końcu. */
export function sortForUpload(paths) {
  return [...paths].sort((a, b) => rankOf(a) - rankOf(b) || (a < b ? -1 : a > b ? 1 : 0));
}

const byPath = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Co wysłać, co pominąć i co usunąć. Usuwamy wyłącznie pliki z poprzedniego manifestu (czyli wysłane przez ten skrypt),
 * i tylko z `prune`; reszta katalogu na serwerze (np. WordPress) jest nietykalna.
 */
export function planDeploy(local, remoteManifest, { prune }) {
  const remoteFiles = remoteManifest?.files ?? {};
  const localPaths = Object.keys(local);
  const changed = localPaths.filter((p) => remoteFiles[p] !== local[p]);
  const stale = Object.keys(remoteFiles)
    .filter((p) => !Object.hasOwn(local, p))
    .sort(byPath);
  return {
    isFirstDeploy: remoteManifest == null,
    upload: sortForUpload(changed),
    unchanged: localPaths.filter((p) => remoteFiles[p] === local[p]).sort(byPath),
    stale,
    remove: prune ? stale : [],
  };
}

/** Nowy manifest po wdrożeniu: stary bez usuniętych, plus udane wysyłki. Nieudane zostają ze starym hashem (ponowna próba). */
export function mergeManifest(oldManifest, local, { uploaded, deleted }, deployedAt) {
  const deletedSet = new Set(deleted);
  const kept = Object.entries(oldManifest?.files ?? {}).filter(([path]) => !deletedSet.has(path));
  const added = uploaded.map((path) => [path, local[path]]);
  const files = Object.fromEntries([...kept, ...added].sort(([a], [b]) => byPath(a, b)));
  return createManifest(files, deployedAt);
}

// --- kontrole ------------------------------------------------------------------------------------------------

/** Czy robots.txt blokuje wszystko dla `User-agent: *` (marker buildu stagingowego, jak w check-dist.mjs). */
function robotsBlocksEverything(robotsTxt) {
  let agents = [];
  let inAgentList = false;
  for (const raw of robotsTxt.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const [field, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    const name = field.trim().toLowerCase();
    if (name === 'user-agent') {
      agents = inAgentList ? [...agents, value] : [value];
      inAgentList = true;
    } else if (line) {
      inAgentList = false;
      if (name === 'disallow' && value === '/' && agents.includes('*')) return true;
    }
  }
  return false;
}

/** Zawartość meta robots strony (niezależnie od kolejności atrybutów), albo null. */
function metaRobotsContent(html) {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (/\bname\s*=\s*["']?robots["']?/i.test(tag)) return /\bcontent\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? null;
  }
  return null;
}

/** Lista powodów, dla których dist/ nie nadaje się na produkcję (pusta = można wysyłać). */
export function checkProductionDist({ hasIndexHtml, hasHtaccess, robotsTxt, indexHtml }) {
  const problems = [];
  if (!hasIndexHtml) problems.push('Brak dist/index.html: uruchom `npm run build` (albo użyj flagi --build).');
  if (!hasHtaccess) problems.push('Brak dist/.htaccess: bez niego Apache na LH.pl nie zna czystych adresów ani przekierowań (źródło: public/.htaccess).');
  const stagingMarkers = [];
  if (robotsBlocksEverything(robotsTxt)) stagingMarkers.push('dist/robots.txt blokuje wszystkich (Disallow: /)');
  if (/noindex/i.test(metaRobotsContent(indexHtml) ?? '')) stagingMarkers.push('dist/index.html ma meta robots noindex');
  if (stagingMarkers.length > 0) {
    problems.push(`To build staging nie idzie na produkcję (${stagingMarkers.join('; ')}). Zbuduj produkcyjnie: npm run build.`);
  }
  return problems;
}

export const detectWordPress = (remoteNames) => remoteNames.some((n) => n === 'wp-config.php' || n === 'wp-content');

/** Błąd sieciowy lub kod FTP 4xx warto ponowić; odmowa (5xx) i błędy programistyczne nie. */
export function isTransientError(error) {
  const code = error?.code;
  if (typeof code === 'number') return code >= FTP_TRANSIENT_MIN && code <= FTP_TRANSIENT_MAX;
  return true;
}

/** Wcięta lista ścieżek, skrócona do `limit` pozycji z dopiskiem o reszcie. */
export function formatPathList(paths, limit) {
  const shown = paths.slice(0, limit).map((p) => `  ${p}`);
  const hidden = paths.length - shown.length;
  return hidden > 0 ? [...shown, `  … i ${hidden} więcej`] : shown;
}
