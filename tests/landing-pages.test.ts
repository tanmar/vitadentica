import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import priceList from '../src/data/price-list.json';
import { implantsLanding, orthodonticsLanding, type LandingContent } from '../src/data/landing';
import { formatPrice } from '../src/lib/price-format.mjs';
import { findPriceItem, inlineMarker } from '../src/lib/price-tokens.mjs';
import { bindLastWords, expandInlinePrices, expandPrices, nbsp } from '../src/lib/landing';
import type { PriceItem } from '../src/lib/price';
import { RISKY_CLAIMS } from './helpers/risky-claims';

const items = priceList as PriceItem[];
const LANDINGS: readonly LandingContent[] = [implantsLanding, orthodonticsLanding];
const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

/** Wszystkie napisy ze struktury treści (z kluczami „id” i „art”, które są identyfikatorami, a nie tekstem). */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

function priceIds(content: LandingContent): string[] {
  const markers = strings(content).flatMap((text) => [...text.matchAll(inlineMarker())].map((match) => match[1]));
  return [
    ...content.prices.highlights.map((highlight) => highlight.priceId),
    ...content.prices.tableIds,
    ...(content.audiences?.items.map((item) => item.priceId) ?? []),
    ...markers,
  ];
}

describe.each(LANDINGS.map((content) => [content.lp, content] as const))('strona lądowania „%s”: treść', (_name, content) => {
  test('pasuje do pliku strony i adresu', () => {
    expect(content.meta.path).toBe(`/lp/${content.lp}`);
    expect(existsSync(new URL(`src/pages/lp/${content.lp}.astro`, root))).toBe(true);
    expect(read(`src/pages/lp/${content.lp}.astro`)).toContain(content.lp === 'implanty' ? 'implantsLanding' : 'orthodonticsLanding');
  });

  test('tytuł i opis mieszczą się w limitach wyników wyszukiwania', () => {
    expect(content.meta.title.length).toBeLessThanOrEqual(70);
    expect(content.meta.description.length).toBeGreaterThanOrEqual(80);
    expect(content.meta.description.length).toBeLessThanOrEqual(170);
  });

  test('każde id cennika (karty, tabela, odbiorcy, znaczniki w tekście) istnieje', () => {
    const ids = priceIds(content);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(() => findPriceItem(items, id), id).not.toThrow();
  });

  test('po rozwinięciu cen nie zostaje żaden znacznik', () => {
    const expanded = strings(expandPrices(content, items)).join('\n');
    expect(expanded).not.toMatch(/\{\{|\}\}/);
  });

  test('kwoty nie są wpisane ręcznie (tylko znaczniki z cennika)', () => {
    for (const text of strings(content)) expect(text, text).not.toMatch(/\d[\d\s ]*\s?zł/);
  });

  test('bez gwarancji, presji i niezweryfikowanych statystyk', () => {
    const text = strings(content).join('\n');
    for (const [pattern, label] of RISKY_CLAIMS) expect(text, label).not.toMatch(pattern);
  });

  test('bez haseł promocyjnych i przekreślonych cen (decyzja: aktualne ceny z cennika)', () => {
    const text = strings(content).join('\n');
    expect(text).not.toMatch(/promocj|rabat|zniżk|przecen|okazj|taniej|do \d+%/i);
  });

  test('liczby o doświadczeniu (opis, hero, jakość, lekarz) pochodzą z biogramu lekarza', () => {
    const bio = read(`src/content/team/${content.doctor.id}.md`);
    const texts = [content.meta.description, content.hero.lead, ...content.hero.facts, ...strings(content.quality), ...content.doctor.text];
    const numbers = [...new Set(texts.flatMap((text) => text.match(/\d{3,}/g) ?? []))];
    expect(numbers.length).toBeGreaterThan(0);
    for (const number of numbers) expect(bio, number).toContain(number);
  });

  test('sekcja „Stawiamy na jakość” ma liczby i karty z konkretami', () => {
    expect(content.quality.title).toMatch(/jakość/i);
    expect(content.quality.stats.length).toBeGreaterThanOrEqual(3);
    expect(content.quality.cards.length).toBeGreaterThanOrEqual(3);
  });

  test('pierwszy ekran mówi o doświadczeniu, nie o cenie (decyzja 28)', () => {
    expect([content.hero.lead, ...content.hero.facts].join('\n')).not.toMatch(/\{\{cena|zł/);
    expect(content.hero.more.href).toBe('#jakosc');
  });

  test('lekarz prowadzący istnieje w kolekcji zespołu', () => {
    expect(existsSync(new URL(`src/content/team/${content.doctor.id}.md`, root))).toBe(true);
  });

  test('pytania FAQ są niepuste i się nie powtarzają', () => {
    const questions = content.faq.items.map((item) => item.question);
    expect(questions.length).toBeGreaterThanOrEqual(5);
    expect(new Set(questions).size).toBe(questions.length);
    for (const item of content.faq.items) {
      expect(item.question.trim().endsWith('?')).toBe(true);
      expect(item.answer.length).toBeGreaterThan(0);
      for (const paragraph of item.answer) expect(paragraph.trim().length).toBeGreaterThan(20);
    }
  });

  test('link do pełnego cennika prowadzi do istniejącej strony', () => {
    expect(content.prices.link.href).toMatch(/^\/cennik#[a-z0-9-]+$/);
    expect(existsSync(new URL('src/pages/cennik.astro', root))).toBe(true);
  });
});

describe('strona ortodoncji: dwa wejścia (dorośli i dzieci)', () => {
  test('ma oba warianty z różnymi cenami konsultacji i własnym przyciskiem', () => {
    const items = orthodonticsLanding.audiences?.items ?? [];
    expect(items.map((item) => item.id).sort()).toEqual(['dorosli', 'dzieci']);
    expect(new Set(items.map((item) => item.priceId)).size).toBe(2);
    expect(new Set(items.map((item) => item.ctaLabel)).size).toBe(2);
  });

  test('strona implantów nie ma wariantów odbiorców', () => {
    expect(implantsLanding.audiences).toBeUndefined();
  });
});

describe('komponenty i szablon stron lądowania', () => {
  const dir = 'src/components/landing/';
  const sources = [
    ...readdirSync(new URL(dir, root)).filter((name) => name.endsWith('.astro')).map((name) => [name, read(dir + name)] as const),
    ['LandingLayout.astro', read('src/layouts/LandingLayout.astro')] as const,
  ];

  test('nie zawierają kwot wpisanych ręcznie ani zapewnień z listy ryzykownych', () => {
    for (const [name, text] of sources) {
      expect(text, name).not.toMatch(/\d[\d\s ]*\s?zł(?![a-ząćęłńóśźż])/i);
      for (const [pattern, label] of RISKY_CLAIMS) expect(text, `${name}: ${label}`).not.toMatch(pattern);
    }
  });

  test('kolejność: jakość i lekarz przed ofertą i cenami (decyzja 28)', () => {
    const page = read('src/components/landing/LandingPage.astro');
    const at = (tag: string) => page.indexOf(`<${tag} `);
    expect(at('LpQuality')).toBeGreaterThan(at('LpHero'));
    expect(at('LpDoctor')).toBeGreaterThan(at('LpQuality'));
    for (const later of ['LpAudience', 'LpCards', 'LpSteps', 'LpPrices']) expect(at(later), later).toBeGreaterThan(at('LpDoctor'));
  });

  test('układ wyłącza indeksowanie i nie ma menu serwisu', () => {
    const layout = read('src/layouts/LandingLayout.astro');
    expect(layout).toMatch(/noindex,\s*nofollow/);
    expect(layout).not.toMatch(/<nav\b/);
  });

  test('wszystkie miejsca kontaktu mają znacznik data-cta (miejsce kliknięcia w analityce)', () => {
    const used = new Set(sources.flatMap(([, text]) => [...text.matchAll(/data-cta="([a-z-]+)"/g)].map((match) => match[1])));
    for (const location of ['header', 'hero', 'prices', 'doctor', 'faq', 'contact', 'footer', 'sticky']) {
      expect(used.has(location), location).toBe(true);
    }
  });
});

describe('nbsp', () => {
  test('twarda spacja po jednoliterowych spójnikach i przyimkach', () => {
    expect(nbsp('Implanty w Warszawie')).toBe('Implanty w Warszawie');
    expect(nbsp('dzieci i dorosłych')).toBe('dzieci i dorosłych');
    expect(nbsp('o implantach')).toBe('o implantach');
  });

  test('na początku tekstu i po cudzysłowie lub nawiasie', () => {
    expect(nbsp('W tym czasie')).toBe('W tym czasie');
    expect(nbsp('(z wyjątkiem)')).toBe('(z wyjątkiem)');
    expect(nbsp('„a potem”')).toBe('„a potem”');
  });

  test('nie rusza liter wewnątrz wyrazów ani dłuższych słów', () => {
    expect(nbsp('Gocław Warszawa na koniec')).toBe('Gocław Warszawa na koniec');
    expect(nbsp('stoi a')).toBe('stoi a');
  });
});

describe('bindLastWords', () => {
  test('łączy dwa ostatnie wyrazy twardą spacją', () => {
    expect(bindLastWords('w Warszawie na Gocławiu')).toBe('w Warszawie na Gocławiu');
  });

  test('pojedynczy wyraz i pusty tekst zostają bez zmian', () => {
    expect(bindLastWords('Gocławiu')).toBe('Gocławiu');
    expect(bindLastWords('')).toBe('');
  });
});

describe('expandInlinePrices i expandPrices', () => {
  const consultation = findPriceItem(items, 'implanty-konsultacja');

  test('podstawia cenę z cennika (z twardymi spacjami)', () => {
    expect(expandInlinePrices('Konsultacja: {{cena: implanty-konsultacja}}.', items)).toBe(`Konsultacja: ${formatPrice(consultation)}.`);
  });

  test('nieznane id przerywa build zamiast pokazać stronę bez ceny', () => {
    expect(() => expandInlinePrices('{{cena: nie-ma-takiej-pozycji}}', items)).toThrow();
  });

  test('przechodzi przez obiekty i tablice, a liczby i wartości puste zostawia', () => {
    const input = { a: ['{{cena: implanty-konsultacja}}', 5], b: { c: null, d: true, e: 'bez znacznika' } };
    const output = expandPrices(input, items);
    expect(output.a[0]).toBe(formatPrice(consultation));
    expect(output.a[1]).toBe(5);
    expect(output.b).toEqual({ c: null, d: true, e: 'bez znacznika' });
  });
});
