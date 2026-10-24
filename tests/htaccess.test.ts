import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = new URL('../', import.meta.url).pathname;
const ORIGIN = 'https://vitadentica.pl';

const htaccess = readFileSync(join(ROOT, 'public/.htaccess'), 'utf8');
const htaccessLines = htaccess.split('\n').map((l) => l.trim());

/** Reguły z public/_redirects jako lista [źródło, cel] (komentarze i puste linie pomijamy). */
function readRedirects(): [string, string][] {
  return readFileSync(join(ROOT, 'public/_redirects'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [from, to] = l.split(/\s+/);
      return [from, to];
    });
}

/** Nagłówki z bloku `/*` w public/_headers jako mapa nazwa → wartość. */
function readGlobalHeaders(): Map<string, string> {
  const headers = new Map<string, string>();
  let inGlobalBlock = false;
  for (const line of readFileSync(join(ROOT, 'public/_headers'), 'utf8').split('\n')) {
    if (/^\S/.test(line)) inGlobalBlock = line.trim() === '/*';
    else if (inGlobalBlock && line.trim()) {
      const idx = line.indexOf(':');
      headers.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
    }
  }
  return headers;
}

/** Reguły RewriteRule z .htaccess: wzorzec, cel, flagi i numer linii. */
function readRewriteRules() {
  return htaccessLines.flatMap((line, index) => {
    const m = /^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?$/.exec(line);
    return m ? [{ pattern: m[1], target: m[2], flags: m[3] ?? '', index }] : [];
  });
}

describe('public/.htaccess', () => {
  const rules = readRewriteRules();

  test('every redirect from _redirects has a 301 RewriteRule with the same source and target', () => {
    const missing: string[] = [];
    for (const [from, to] of readRedirects()) {
      const path = from.replace(/^\//, ''); // w kontekście .htaccess wzorzec nie zaczyna się od „/"
      const found = rules.some(
        (r) => r.target === `${ORIGIN}${to}` && /\bR=301\b/.test(r.flags) && new RegExp(r.pattern).test(path),
      );
      if (!found) missing.push(`${from} → ${to}`);
    }
    expect(missing).toEqual([]);
  });

  test('every redirect rule matching a *.html source is guarded by a THE_REQUEST condition (no /foo → /foo loop)', () => {
    // Wewnętrzne przepisanie /foo → foo.html uruchamia reguły ponownie; bez warunku na oryginalne żądanie
    // przekierowanie z foo.html na /foo zapętliłoby się (tak wyglądał błąd na /invisalign, /cennik, /kontakt).
    const unguarded = rules
      .filter((r) => /\bR=301\b/.test(r.flags) && /\\\.html\$$/.test(r.pattern))
      .filter((r) => !htaccessLines[r.index - 1]?.startsWith('RewriteCond %{THE_REQUEST}'))
      .map((r) => r.pattern);
    expect(unguarded).toEqual([]);
  });

  test('legacy redirects are evaluated before the generic clean-URL and canonical-host rules', () => {
    const legacyIndexes = readRedirects().flatMap(([from, to]) => {
      const path = from.replace(/^\//, '');
      return rules.filter((r) => r.target === `${ORIGIN}${to}` && new RegExp(r.pattern).test(path)).map((r) => r.index);
    });
    const genericStart = Math.min(
      ...rules.filter((r) => r.pattern.startsWith('^(.+)/$') || r.pattern.includes('\\.html$') && r.pattern.startsWith('^(?!')).map((r) => r.index),
    );
    const canonical = htaccessLines.findIndex((l) => l.startsWith('RewriteCond %{HTTPS}'));
    expect(legacyIndexes.length).toBeGreaterThan(0);
    expect(Math.max(...legacyIndexes)).toBeLessThan(genericStart);
    expect(Math.max(...legacyIndexes)).toBeLessThan(canonical);
  });

  test('security headers match the /* block of _headers exactly', () => {
    const expected = readGlobalHeaders();
    expect(expected.size).toBeGreaterThan(0);
    for (const [name, value] of expected) {
      expect(htaccessLines, `brak nagłówka ${name}`).toContain(`Header always set ${name} "${value}"`);
    }
  });

  test('Content-Security-Policy is identical to the one in _headers', () => {
    const fromHeaders = readGlobalHeaders().get('Content-Security-Policy');
    const fromHtaccess = htaccessLines
      .map((l) => /^Header always set Content-Security-Policy "(.*)"$/.exec(l)?.[1])
      .find((v) => v !== undefined);
    expect(fromHeaders).toBeTruthy();
    expect(fromHtaccess).toBe(fromHeaders);
  });

  test('sets ErrorDocument 404 to /404.html', () => {
    expect(htaccessLines).toContain('ErrorDocument 404 /404.html');
  });

  test('serves .md as UTF-8 markdown and caches /_astro/* immutably', () => {
    expect(htaccess).toContain('ForceType "text/markdown; charset=utf-8"');
    expect(htaccess).toContain('Header always set Cache-Control "public, max-age=31536000, immutable" env=ASTRO_ASSET');
    expect(htaccess).toMatch(/SetEnvIf Request_URI "\^\/_astro\/" ASTRO_ASSET=1/);
  });

  test('disables directory listings and keeps module-dependent blocks in IfModule', () => {
    expect(htaccessLines).toContain('Options -Indexes');
    for (const directive of ['RewriteEngine On', 'Header always set X-Frame-Options']) {
      const line = htaccessLines.findIndex((l) => l.startsWith(directive));
      expect(line, directive).toBeGreaterThan(-1);
      const before = htaccessLines.slice(0, line);
      const opened = before.filter((l) => l.startsWith('<IfModule')).length;
      const closed = before.filter((l) => l === '</IfModule>').length;
      expect(opened - closed, `${directive} poza <IfModule>`).toBeGreaterThan(0);
    }
  });
});
