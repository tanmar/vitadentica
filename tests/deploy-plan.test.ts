import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  MANIFEST_NAME,
  checkProductionDist,
  createManifest,
  detectWordPress,
  formatPathList,
  hashDirectory,
  isTransientError,
  mergeManifest,
  parseEnv,
  parseManifest,
  planDeploy,
  redactSecret,
  sortForUpload,
} from '../scripts/lib/deploy-plan.mjs';

const BASE_ENV = {
  FTP_HOST: 'ftp.example.test',
  FTP_USER: 'user',
  FTP_PASSWORD: 'p@ss w0rd',
  FTP_REMOTE_DIR: '/public_html/vitadentica.pl',
};
const H = (c: string) => c.repeat(64);

describe('parseEnv', () => {
  test('zwraca konfigurację z wartościami domyślnymi', () => {
    const { config, errors, warnings } = parseEnv(BASE_ENV);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(config).toEqual({
      host: 'ftp.example.test',
      user: 'user',
      password: 'p@ss w0rd',
      remoteDir: '/public_html/vitadentica.pl',
      port: 21,
      secure: true,
      allowSelfSigned: false,
      siteUrl: 'https://vitadentica.pl',
    });
  });

  test('zgłasza każdą brakującą zmienną po polsku i nie zwraca konfiguracji', () => {
    const { config, errors } = parseEnv({});
    expect(config).toBeNull();
    for (const name of ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD', 'FTP_REMOTE_DIR']) {
      expect(errors.some((e: string) => e.includes(name) && e.includes('brak'))).toBe(true);
    }
  });

  test('FTP_REMOTE_DIR bez wartości domyślnej, musi być ścieżką bezwzględną bez ..', () => {
    expect(parseEnv({ ...BASE_ENV, FTP_REMOTE_DIR: 'public_html' }).errors).toHaveLength(1);
    expect(parseEnv({ ...BASE_ENV, FTP_REMOTE_DIR: '/a/../b' }).errors).toHaveLength(1);
  });

  test('normalizuje końcowy ukośnik w FTP_REMOTE_DIR', () => {
    expect(parseEnv({ ...BASE_ENV, FTP_REMOTE_DIR: '/public_html//x/' }).config?.remoteDir).toBe('/public_html/x');
  });

  test('FTP_SECURE: true, implicit, false; inna wartość to błąd', () => {
    expect(parseEnv({ ...BASE_ENV, FTP_SECURE: 'implicit' }).config).toMatchObject({ secure: 'implicit', port: 990 });
    expect(parseEnv({ ...BASE_ENV, FTP_SECURE: 'true' }).config?.secure).toBe(true);
    expect(parseEnv({ ...BASE_ENV, FTP_SECURE: 'tak' }).errors).toHaveLength(1);
  });

  test('FTP_SECURE=false ostrzega, że hasło leci bez szyfrowania', () => {
    const { config, warnings } = parseEnv({ ...BASE_ENV, FTP_SECURE: 'false' });
    expect(config?.secure).toBe(false);
    expect(warnings.join(' ')).toMatch(/bez szyfrowania/i);
  });

  test('FTP_PORT musi być liczbą 1-65535', () => {
    expect(parseEnv({ ...BASE_ENV, FTP_PORT: '2121' }).config?.port).toBe(2121);
    expect(parseEnv({ ...BASE_ENV, FTP_PORT: 'abc' }).errors).toHaveLength(1);
    expect(parseEnv({ ...BASE_ENV, FTP_PORT: '70000' }).errors).toHaveLength(1);
  });

  test('FTP_ALLOW_SELF_SIGNED=true włącza akceptację certyfikatu', () => {
    expect(parseEnv({ ...BASE_ENV, FTP_ALLOW_SELF_SIGNED: 'true' }).config?.allowSelfSigned).toBe(true);
    expect(parseEnv({ ...BASE_ENV, FTP_ALLOW_SELF_SIGNED: 'x' }).errors).toHaveLength(1);
  });

  test('FTP_HOST nie może zawierać schematu ani ścieżki', () => {
    expect(parseEnv({ ...BASE_ENV, FTP_HOST: 'ftp://host' }).errors).toHaveLength(1);
  });

  test('SITE_URL: bez końcowego ukośnika, tylko http(s)', () => {
    expect(parseEnv({ ...BASE_ENV, SITE_URL: 'https://example.test/' }).config?.siteUrl).toBe('https://example.test');
    expect(parseEnv({ ...BASE_ENV, SITE_URL: 'example.test' }).errors).toHaveLength(1);
  });

  test('komunikaty błędów nie zawierają hasła', () => {
    const { errors } = parseEnv({ ...BASE_ENV, FTP_PORT: 'abc', FTP_SECURE: 'x' });
    expect(errors.join('\n')).not.toContain(BASE_ENV.FTP_PASSWORD);
  });
});

describe('redactSecret', () => {
  test('zastępuje wszystkie wystąpienia sekretu', () => {
    expect(redactSecret('530 login failed for p@ss w0rd, p@ss w0rd', 'p@ss w0rd')).toBe('530 login failed for ***, ***');
  });

  test('pusty sekret nie psuje tekstu', () => {
    expect(redactSecret('abc', '')).toBe('abc');
  });
});

describe('checkProductionDist', () => {
  const ok = {
    hasIndexHtml: true,
    hasHtaccess: true,
    robotsTxt: 'User-agent: *\nAllow: /\n',
    indexHtml: '<meta name="robots" content="index, follow">',
  };

  test('build produkcyjny nie ma uwag', () => {
    expect(checkProductionDist(ok)).toEqual([]);
  });

  test('robots.txt z Disallow: / dla * oznacza staging', () => {
    const problems = checkProductionDist({ ...ok, robotsTxt: 'User-agent: *\nDisallow: /\n' });
    expect(problems.join(' ')).toMatch(/build staging nie idzie na produkcję/);
  });

  test('Disallow: / tylko dla konkretnego bota nie jest stagingiem', () => {
    const robotsTxt = 'User-agent: *\nAllow: /\n\nUser-agent: BadBot\nDisallow: /\n';
    expect(checkProductionDist({ ...ok, robotsTxt })).toEqual([]);
  });

  test('Disallow: /prywatne dla * nie jest stagingiem', () => {
    expect(checkProductionDist({ ...ok, robotsTxt: 'User-agent: *\nDisallow: /prywatne\n' })).toEqual([]);
  });

  test('grupa z kilkoma User-agent łącznie z * też liczy się', () => {
    const robotsTxt = 'User-agent: GPTBot\nUser-agent: *\nDisallow: /\n';
    expect(checkProductionDist({ ...ok, robotsTxt })).not.toEqual([]);
  });

  test('noindex w meta robots strony głównej oznacza staging (także przy odwróconej kolejności atrybutów)', () => {
    expect(checkProductionDist({ ...ok, indexHtml: '<meta name="robots" content="noindex, nofollow">' })).not.toEqual([]);
    expect(checkProductionDist({ ...ok, indexHtml: '<meta content="NOINDEX" name="robots">' })).not.toEqual([]);
  });

  test('noindex w innym meta nie jest markerem stagingu', () => {
    expect(checkProductionDist({ ...ok, indexHtml: '<meta name="googlebot" content="noindex">' })).toEqual([]);
  });

  test('brak .htaccess i index.html to osobne problemy', () => {
    const problems = checkProductionDist({ ...ok, hasHtaccess: false, hasIndexHtml: false, indexHtml: '' });
    expect(problems.some((p: string) => p.includes('.htaccess'))).toBe(true);
    expect(problems.some((p: string) => p.includes('index.html'))).toBe(true);
  });
});

describe('sortForUpload', () => {
  test('zasoby, potem inne pliki, potem html/md, na końcu .htaccess', () => {
    const sorted = sortForUpload(['.htaccess', 'index.html', 'a.md', 'logo.png', '_astro/b.js', 'robots.txt', '_astro/a.css', 'sub/x.html']);
    expect(sorted).toEqual(['_astro/a.css', '_astro/b.js', 'logo.png', 'robots.txt', 'a.md', 'index.html', 'sub/x.html', '.htaccess']);
  });

  test('nie zmienia wejścia', () => {
    const input = ['b.html', 'a.png'];
    sortForUpload(input);
    expect(input).toEqual(['b.html', 'a.png']);
  });
});

describe('planDeploy', () => {
  const local = { 'index.html': H('a'), '_astro/x.js': H('b'), 'new.png': H('c') };

  test('pierwszy deploy (brak manifestu) wysyła wszystko i nic nie usuwa', () => {
    const plan = planDeploy(local, null, { prune: true });
    expect(plan.isFirstDeploy).toBe(true);
    expect(plan.upload).toEqual(['_astro/x.js', 'new.png', 'index.html']);
    expect(plan.unchanged).toEqual([]);
    expect(plan.stale).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  test('wysyła nowe i zmienione, pomija identyczne', () => {
    const remote = createManifest({ 'index.html': H('a'), '_astro/x.js': H('z') }, 't');
    const plan = planDeploy(local, remote, { prune: false });
    expect(plan.isFirstDeploy).toBe(false);
    expect(plan.upload).toEqual(['_astro/x.js', 'new.png']);
    expect(plan.unchanged).toEqual(['index.html']);
  });

  test('pliki spoza lokalnego dist, ale z manifestu, są nieaktualne; usuwa je tylko --prune', () => {
    const remote = createManifest({ ...local, 'old.html': H('d') }, 't');
    expect(planDeploy(local, remote, { prune: false })).toMatchObject({ stale: ['old.html'], remove: [] });
    expect(planDeploy(local, remote, { prune: true })).toMatchObject({ stale: ['old.html'], remove: ['old.html'] });
  });

  test('nie usuwa niczego, czego nie ma w manifeście (np. plików WordPressa)', () => {
    const remote = createManifest(local, 't');
    expect(planDeploy(local, remote, { prune: true }).remove).toEqual([]);
  });

  test('nie zmienia wejścia', () => {
    const remote = createManifest({ 'a.html': H('a') }, 't');
    const snapshot = JSON.stringify([local, remote]);
    planDeploy(local, remote, { prune: true });
    expect(JSON.stringify([local, remote])).toBe(snapshot);
  });
});

describe('mergeManifest', () => {
  const local = { 'a.html': H('1'), 'b.png': H('2'), 'c.css': H('3') };

  test('zapisuje tylko udane wysyłki; nieudane zostają ze starym hashem albo bez wpisu', () => {
    const old = createManifest({ 'a.html': H('9') }, 't0');
    const merged = mergeManifest(old, local, { uploaded: ['b.png'], deleted: [] }, 't1');
    expect(merged.files).toEqual({ 'a.html': H('9'), 'b.png': H('2') });
    expect(merged.deployedAt).toBe('t1');
  });

  test('usunięte pliki znikają z manifestu, nieusunięte nieaktualne zostają', () => {
    const old = createManifest({ 'x.html': H('x'), 'y.html': H('y') }, 't0');
    const merged = mergeManifest(old, local, { uploaded: [], deleted: ['x.html'] }, 't1');
    expect(merged.files).toEqual({ 'y.html': H('y') });
  });

  test('bez starego manifestu zaczyna od pustego', () => {
    expect(mergeManifest(null, local, { uploaded: ['a.html'], deleted: [] }, 't1').files).toEqual({ 'a.html': H('1') });
  });

  test('nie zmienia starego manifestu', () => {
    const old = createManifest({ 'a.html': H('9') }, 't0');
    mergeManifest(old, local, { uploaded: ['a.html'], deleted: [] }, 't1');
    expect(old.files).toEqual({ 'a.html': H('9') });
  });
});

describe('parseManifest', () => {
  test('odczytuje poprawny manifest (round-trip)', () => {
    const manifest = createManifest({ 'a/b.html': H('a') }, '2026-10-24T10:00:00.000Z');
    expect(parseManifest(JSON.stringify(manifest))).toEqual(manifest);
  });

  test.each([
    ['nie-JSON', '{'],
    ['zła wersja', JSON.stringify({ version: 2, files: {} })],
    ['brak files', JSON.stringify({ version: 1 })],
    ['zły hash', JSON.stringify({ version: 1, files: { 'a.html': 'abc' } })],
    ['ścieżka z ..', JSON.stringify({ version: 1, files: { '../wp-config.php': H('a') } })],
    ['ścieżka bezwzględna', JSON.stringify({ version: 1, files: { '/etc/passwd': H('a') } })],
    ['ścieżka z backslashem', JSON.stringify({ version: 1, files: { 'a\\b': H('a') } })],
    ['sam manifest', JSON.stringify({ version: 1, files: { [MANIFEST_NAME]: H('a') } })],
  ])('odrzuca: %s', (_name, text) => {
    expect(() => parseManifest(text)).toThrow(/manifest/i);
  });
});

describe('detectWordPress', () => {
  test('wykrywa wp-config.php i wp-content', () => {
    expect(detectWordPress(['index.php', 'wp-config.php'])).toBe(true);
    expect(detectWordPress(['wp-content'])).toBe(true);
    expect(detectWordPress(['index.html', '_astro'])).toBe(false);
  });
});

describe('isTransientError', () => {
  test('błędy sieci i timeouty są przejściowe', () => {
    expect(isTransientError(Object.assign(new Error('reset'), { code: 'ECONNRESET' }))).toBe(true);
    expect(isTransientError(new Error('Timeout (control socket)'))).toBe(true);
  });

  test('kody FTP 4xx są przejściowe, 5xx nie', () => {
    expect(isTransientError(Object.assign(new Error('busy'), { code: 421 }))).toBe(true);
    expect(isTransientError(Object.assign(new Error('denied'), { code: 550 }))).toBe(false);
    expect(isTransientError(Object.assign(new Error('login'), { code: 530 }))).toBe(false);
  });
});

describe('formatPathList', () => {
  test('wypisuje wszystko, gdy mieści się w limicie', () => {
    expect(formatPathList(['a', 'b'], 5)).toEqual(['  a', '  b']);
  });

  test('skraca długą listę i podaje liczbę pominiętych', () => {
    expect(formatPathList(['a', 'b', 'c', 'd'], 2)).toEqual(['  a', '  b', '  … i 2 więcej']);
  });
});

describe('hashDirectory', () => {
  let dir = '';
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'deploy-plan-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('haszuje pliki rekurencyjnie (ścieżki posix, z dotfile) i pomija pliki Cloudflare Pages', () => {
    mkdirSync(join(dir, '_astro'));
    writeFileSync(join(dir, 'index.html'), 'abc');
    writeFileSync(join(dir, '.htaccess'), 'x');
    writeFileSync(join(dir, '_astro', 'a.js'), '');
    writeFileSync(join(dir, '_headers'), 'h');
    writeFileSync(join(dir, '_redirects'), 'r');
    const hashes = hashDirectory(dir);
    expect(Object.keys(hashes).sort()).toEqual(['.htaccess', '_astro/a.js', 'index.html']);
    // sha256("abc")
    expect(hashes['index.html']).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
