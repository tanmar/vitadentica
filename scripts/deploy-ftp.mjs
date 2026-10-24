// Wdrożenie dist/ na hosting LH.pl (FTP/FTPS): wysyła tylko zmienione pliki, na serwerze trzyma manifest hashy.
// Dane dostępowe z env (plik .env, patrz .env.example). Logika bez sieci: scripts/lib/deploy-plan.mjs.
// Użycie: npm run deploy:dry   (pokaż plan, nic nie wysyłaj)
//         npm run deploy       (pokaż plan, zapytaj, wyślij)
// Flagi: --dry-run  --yes  --prune  --build  --check  (opis: --help)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { Readable, Writable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { Client, FTPError } from 'basic-ftp';
import {
  MANIFEST_NAME,
  checkProductionDist,
  detectWordPress,
  formatPathList,
  hashDirectory,
  isTransientError,
  mergeManifest,
  parseEnv,
  parseManifest,
  planDeploy,
  redactSecret,
} from './lib/deploy-plan.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const DIST = new URL('../dist/', import.meta.url).pathname;
const PART_SUFFIX = '.part';
const PROBE_NAME = '.deploy-probe';
const TIMEOUT_MS = 30_000;
const KEEPALIVE_MS = 30_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 1_000;
const LIST_LIMIT = 25;
const CHECK_TIMEOUT_MS = 15_000;
const CHECK_PATHS = ['/', '/implanty'];
const HTTP_SERVER_ERROR = 500;

const HELP = `Wdrożenie dist/ na hosting przez FTP (tylko zmienione pliki).

  --dry-run  pokaż plan i zakończ (łączy się z serwerem tylko do odczytu)
  --yes      nie pytaj o potwierdzenie
  --prune    usuń z serwera pliki wysłane wcześniej przez ten skrypt, których już nie ma w dist/
  --build    przed wysyłką uruchom \`npm run build && npm run verify\`
  --check    po wysyłce sprawdź kody HTTP strony (SITE_URL, domyślnie https://vitadentica.pl)
  --help     ta pomoc

Konfiguracja w .env (wzór: .env.example): FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_REMOTE_DIR,
opcjonalnie FTP_PORT, FTP_SECURE, FTP_ALLOW_SELF_SIGNED, SITE_URL.`;

class UserError extends Error {}

const log = (message = '') => console.log(message);

// --- sesja FTP -----------------------------------------------------------------------------------------------

/** Jedno połączenie, które można odtworzyć po przejściowym błędzie. Ścieżki zdalne są zawsze bezwzględne. */
function createSession(config) {
  const state = { client: null };
  const open = async () => {
    state.client?.close();
    const client = new Client(TIMEOUT_MS);
    state.client = client;
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.secure,
      secureOptions: config.allowSelfSigned ? { rejectUnauthorized: false } : undefined,
    });
    client.ftp.socket.setKeepAlive(true, KEEPALIVE_MS);
  };
  return { open, close: () => state.client?.close(), get client() { return state.client; } };
}

/** Wykonuje operację; błąd przejściowy → odczekanie (rosnące), nowe połączenie i ponowna próba (maks. MAX_ATTEMPTS). */
async function withRetry(session, config, operation) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation(session.client);
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isTransientError(error)) throw error;
      log(`  ! ${redactSecret(String(error.message), config.password)}; ponawiam (${attempt}/${MAX_ATTEMPTS - 1})…`);
      await sleep(BACKOFF_MS * 2 ** (attempt - 1));
      await session.open();
    }
  }
}

const remotePathOf = (config, rel) => posix.join(config.remoteDir, rel);

/** Manifest z serwera albo null (pierwszy deploy). Błąd odczytu uznajemy za „brak pliku” tylko, gdy listing go nie pokazuje. */
async function readRemoteManifest(client, config, remoteNames) {
  const chunks = [];
  const sink = new Writable({
    write(chunk, _encoding, done) {
      chunks.push(chunk);
      done();
    },
  });
  try {
    await client.downloadTo(sink, remotePathOf(config, MANIFEST_NAME));
  } catch (error) {
    const isMissing = error instanceof FTPError && !remoteNames.includes(MANIFEST_NAME);
    if (isMissing) return null;
    throw error;
  }
  return parseManifest(Buffer.concat(chunks).toString('utf8'));
}

async function listRemoteNames(client, config) {
  try {
    return (await client.list(config.remoteDir)).map((entry) => entry.name);
  } catch (error) {
    if (error instanceof FTPError) return [];
    throw error;
  }
}

// --- wysyłka -------------------------------------------------------------------------------------------------

/** Wysyła jeden plik. `atomic`: najpierw `<nazwa>.part`, potem rename na docelową nazwę (strona nie widzi pół pliku). */
async function putFile({ session, config, atomic, madeDirs }, rel, makeSource) {
  const remote = remotePathOf(config, rel);
  const part = remote + PART_SUFFIX;
  try {
    await withRetry(session, config, async (client) => {
      const dir = posix.dirname(remote);
      if (!madeDirs.has(dir)) {
        await client.ensureDir(dir);
        madeDirs.add(dir);
      }
      if (!atomic) return client.uploadFrom(makeSource(), remote);
      await client.uploadFrom(makeSource(), part);
      return client.rename(part, remote);
    });
  } catch (error) {
    if (atomic) await session.client?.remove(part, true).catch(() => {});
    throw error;
  }
}

/**
 * Czy serwer pozwala nadpisać istniejący plik przez rename (RNFR/RNTO)? Sprawdzamy na żywo: dwa razy ten sam plik próbny,
 * drugi raz o innym rozmiarze. Jeśli rename nie nadpisze (np. serwer na Windows), wysyłamy bezpośrednio.
 */
async function supportsAtomicRename(session, config) {
  const target = remotePathOf(config, PROBE_NAME);
  const part = target + PART_SUFFIX;
  const upload = (text) => session.client.uploadFrom(Readable.from(Buffer.from(text)), part);
  try {
    await session.client.ensureDir(config.remoteDir);
    await upload('a');
    await session.client.rename(part, target);
    await upload('bb');
    await session.client.rename(part, target);
    return (await session.client.size(target)) === 2;
  } catch {
    return false;
  } finally {
    await session.client.remove(part, true).catch(() => {});
    await session.client.remove(target, true).catch(() => {});
  }
}

/** Wysyła pliki po kolei; przy pierwszym błędzie przerywa (strony nie mogą wyprzedzić brakujących zasobów). */
async function uploadAll(ctx, paths) {
  const uploaded = [];
  for (const [index, rel] of paths.entries()) {
    log(`[${index + 1}/${paths.length}] ${rel}`);
    try {
      await putFile(ctx, rel, () => `${DIST}${rel}`);
      uploaded.push(rel);
    } catch (error) {
      return { uploaded, error };
    }
  }
  return { uploaded, error: null };
}

async function deleteAll(ctx, paths) {
  const deleted = [];
  for (const [index, rel] of paths.entries()) {
    log(`[usuwanie ${index + 1}/${paths.length}] ${rel}`);
    try {
      await withRetry(ctx.session, ctx.config, (client) => client.remove(remotePathOf(ctx.config, rel), true));
      deleted.push(rel);
    } catch (error) {
      return { deleted, error };
    }
  }
  return { deleted, error: null };
}

async function writeManifest(ctx, manifest) {
  const text = JSON.stringify(manifest, null, 2) + '\n';
  await putFile(ctx, MANIFEST_NAME, () => Readable.from(Buffer.from(text)));
}

// --- plan i pytania ------------------------------------------------------------------------------------------

function printPlan(plan, prune) {
  log(`\nPlan: do wysłania ${plan.upload.length}, bez zmian ${plan.unchanged.length}, nieaktualne na serwerze ${plan.stale.length}.`);
  if (plan.upload.length > 0) {
    log('Do wysłania:');
    formatPathList(plan.upload, LIST_LIMIT).forEach((line) => log(line));
  }
  if (plan.stale.length === 0) return;
  const note = prune ? 'zostaną USUNIĘTE (--prune)' : 'zostają na serwerze (dodaj --prune, żeby usunąć)';
  log(`Wysłane wcześniej, a już nieobecne w dist/: ${note}:`);
  formatPathList(plan.stale, LIST_LIMIT).forEach((line) => log(line));
}

function printRemoteWarnings(plan, remoteNames) {
  if (detectWordPress(remoteNames)) {
    log('\n!!! UWAGA: w katalogu zdalnym jest WordPress (wp-config.php / wp-content).');
    log('!!! Jego pliki zostają NIETKNIĘTE (skrypt nigdy nie usuwa niczego spoza własnego manifestu) i mogą kolidować');
    log('!!! z nową stroną (np. stary index.php ma pierwszeństwo przed index.html). Zrób kopię zapasową i usuń je ręcznie.');
  }
  if (plan.isFirstDeploy && remoteNames.length > 0) {
    log('\n! Katalog zdalny nie jest pusty, a nie ma w nim manifestu (pierwszy deploy): pliki o tych samych nazwach');
    log('! (np. .htaccess, index.html) zostaną nadpisane.');
  }
}

async function confirm(question, assumeYes) {
  if (assumeYes) return true;
  if (!process.stdin.isTTY) throw new UserError('Brak interaktywnego terminala: dodaj --yes, żeby wysłać bez pytania.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return answer === 't' || answer === 'tak';
}

// --- przed i po ----------------------------------------------------------------------------------------------

function runBuild() {
  for (const script of ['build', 'verify']) {
    log(`\n> npm run ${script}`);
    const result = spawnSync('npm', ['run', script], { cwd: ROOT, stdio: 'inherit' });
    if (result.status !== 0) throw new UserError(`\`npm run ${script}\` zakończyło się błędem; przerywam.`);
  }
}

function assertProductionDist() {
  const read = (name) => (existsSync(`${DIST}${name}`) ? readFileSync(`${DIST}${name}`, 'utf8') : '');
  if (!existsSync(DIST)) throw new UserError('Brak katalogu dist/: uruchom `npm run build` (albo użyj flagi --build).');
  const problems = checkProductionDist({
    hasIndexHtml: existsSync(`${DIST}index.html`),
    hasHtaccess: existsSync(`${DIST}.htaccess`),
    robotsTxt: read('robots.txt'),
    indexHtml: read('index.html'),
  });
  if (problems.length > 0) throw new UserError(problems.map((p) => `- ${p}`).join('\n'));
}

/** Informacyjny test po wdrożeniu; zwraca true, gdy któraś strona odpowiada 5xx. */
async function checkSite(siteUrl) {
  log(`\nSprawdzam ${siteUrl}:`);
  const statuses = await Promise.all(
    CHECK_PATHS.map(async (path) => {
      try {
        const response = await fetch(siteUrl + path, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
        log(`  ${response.status} ${siteUrl}${path}`);
        return response.status;
      } catch (error) {
        log(`  brak odpowiedzi ${siteUrl}${path}: ${error.message}`);
        return 0;
      }
    }),
  );
  return statuses.some((status) => status >= HTTP_SERVER_ERROR);
}

// --- przebieg ------------------------------------------------------------------------------------------------

async function execute(ctx, plan, remoteManifest, local, startedAt) {
  const { uploaded, error: uploadError } = await uploadAll(ctx, plan.upload);
  const { deleted, error: deleteError } = uploadError ? { deleted: [], error: null } : await deleteAll(ctx, plan.remove);
  const failure = uploadError ?? deleteError;
  if (uploaded.length + deleted.length > 0) {
    try {
      const manifest = mergeManifest(remoteManifest, local, { uploaded, deleted }, new Date().toISOString());
      await writeManifest(ctx, manifest);
    } catch (error) {
      log(`! Nie udało się zapisać manifestu (${redactSecret(String(error.message), ctx.config.password)}); kolejny deploy sprawdzi pliki od nowa.`);
      return { failed: true, uploaded, deleted };
    }
  }
  if (failure) log(`\n✘ Błąd: ${redactSecret(String(failure.message), ctx.config.password)}\n  Pliki wysłane przed błędem są zapisane w manifeście; następny deploy dokończy resztę.`);
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  log(`\n${failure ? '✘' : '✔'} Wysłano ${uploaded.length}, pominięto ${plan.unchanged.length}, usunięto ${deleted.length}, czas ${seconds} s`);
  return { failed: Boolean(failure), uploaded, deleted };
}

async function deploy(config, args) {
  const startedAt = Date.now();
  const local = hashDirectory(DIST);
  const session = createSession(config);
  try {
    log(`Łączę z ${config.host}:${config.port} (${config.secure === false ? 'FTP bez szyfrowania' : 'FTPS'}), katalog ${config.remoteDir}`);
    await session.open();
    const remoteNames = await listRemoteNames(session.client, config);
    const remoteManifest = await readRemoteManifest(session.client, config, remoteNames);
    const plan = planDeploy(local, remoteManifest, { prune: args.prune });
    printPlan(plan, args.prune);
    printRemoteWarnings(plan, remoteNames);
    if (args['dry-run']) {
      log('\n(--dry-run: nic nie wysłano)');
      return false;
    }
    if (plan.upload.length + plan.remove.length === 0) {
      log('\nBrak zmian do wysłania.');
      return false;
    }
    if (!(await confirm('\nWysłać? [t/N] ', args.yes))) {
      log('Przerwano.');
      return false;
    }
    const atomic = await supportsAtomicRename(session, config);
    log(atomic ? 'Tryb wysyłki: plik tymczasowy .part + rename.' : 'Tryb wysyłki: bezpośrednio (serwer nie nadpisuje przez rename).');
    const ctx = { session, config, atomic, madeDirs: new Set() };
    return (await execute(ctx, plan, remoteManifest, local, startedAt)).failed;
  } finally {
    session.close();
  }
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      yes: { type: 'boolean', default: false },
      prune: { type: 'boolean', default: false },
      build: { type: 'boolean', default: false },
      check: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (args.help) {
    log(HELP);
    return 0;
  }
  const { config, errors, warnings } = parseEnv(process.env);
  warnings.forEach((w) => console.warn(`\n!!! ${w}`));
  if (!config) throw new UserError(`Błędna konfiguracja (.env):\n${errors.map((e) => `- ${e}`).join('\n')}`);
  if (args.build) runBuild();
  assertProductionDist();
  const failed = await deploy(config, args);
  if (failed) return 1;
  if (args.check && !args['dry-run'] && (await checkSite(config.siteUrl))) return 1;
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    const password = process.env.FTP_PASSWORD ?? '';
    const message = error instanceof UserError ? error.message : `Błąd: ${error.message ?? error}`;
    console.error(`\n✘ ${redactSecret(message, password)}`);
    process.exitCode = 1;
  });
