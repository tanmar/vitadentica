import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';

const ROOT = new URL('../', import.meta.url).pathname;
const PAGES_DIR = join(ROOT, 'src/content/pages');

/** Reguły z public/_redirects jako mapa źródło → cel (komentarze i puste linie pomijamy). */
function readRules(): Map<string, string> {
  const rules = new Map<string, string>();
  for (const line of readFileSync(join(ROOT, 'public/_redirects'), 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [from, to] = trimmed.split(/\s+/);
    rules.set(from, to);
  }
  return rules;
}

function readPages(): { newPath: string; oldUrls: string[] }[] {
  return readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(join(PAGES_DIR, file), 'utf8');
      const front = parse(/^---\n([\s\S]*?)\n---/.exec(raw)![1]) as { oldUrl?: string | string[] };
      const old = front.oldUrl === undefined ? [] : [front.oldUrl].flat();
      const id = file.replace(/\.md$/, '');
      return { newPath: id === 'index' ? '/' : `/${id}`, oldUrls: old };
    });
}

/** Adres bez ukośnika końcowego (poza „/"). */
const withoutTrailingSlash = (path: string) => (path.length > 1 ? path.replace(/\/$/, '') : path);

describe('public/_redirects', () => {
  const rules = readRules();

  test('every old URL that differs from the new path has a 301 rule, with and without a trailing slash', () => {
    const missing: string[] = [];
    for (const { newPath, oldUrls } of readPages()) {
      for (const oldUrl of oldUrls) {
        const base = withoutTrailingSlash(oldUrl);
        if (base === newPath) continue; // tylko ukośnik: obsługuje Pages
        const variants = oldUrl.endsWith('.html') ? [base] : [base, `${base}/`];
        for (const variant of variants) {
          if (rules.get(variant) !== newPath) missing.push(`${variant} → ${newPath}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('no rule points at itself or chains into another redirect', () => {
    for (const [from, to] of rules) {
      expect(to, `${from} wskazuje na siebie`).not.toBe(from);
      expect(rules.has(to), `${from} → ${to} tworzy łańcuch przekierowań`).toBe(false);
    }
  });

  test('every rule target is an existing page', () => {
    const targets = new Set(readPages().map((p) => p.newPath));
    for (const [from, to] of rules) {
      if (to === '/') continue; // strona główna nie jest wpisem kolekcji
      expect(targets.has(to), `${from} → ${to}: brak strony docelowej`).toBe(true);
    }
  });
});
