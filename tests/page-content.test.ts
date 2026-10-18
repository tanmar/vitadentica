import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import priceList from '../src/data/price-list.json';
import { expandPriceMarkers } from '../src/lib/price-tokens.mjs';
import type { PriceItem } from '../src/lib/price';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const pagesDir = new URL('../src/content/pages/', import.meta.url);
const pageFiles = readdirSync(pagesDir).filter((name) => name.endsWith('.md'));
const pages = pageFiles.map((name) => ({ name, text: read(`src/content/pages/${name}`) }));
const servicePages = pages.filter(({ name }) => ['implanty.md', 'ortodoncja.md', 'invisalign.md'].includes(name));

/** Teksty, które w ocenie treści (docs/AUDYT-TRESCI-SEO-AI.md) były gwarancją, presją albo obietnicą bez pokrycia. */
const RISKY_CLAIMS: readonly [RegExp, string][] = [
  [/gwarantuj/i, 'gwarancja efektu'],
  [/najlepsz\w+ rezultat/i, '„najlepsze rezultaty”'],
  [/najwyższ\w+ (poziom|jakoś)/i, '„najwyższy poziom / jakość”'],
  // granica słowa: „nosze(nie boli)” w pytaniu „czy noszenie boli?” nie jest zapewnieniem
  [/(?<!\p{L})nie boli|(?<!\p{L})nie jest bolesn|bezbolesn/iu, 'zapewnienie braku bólu'],
  [/niezawodn/i, '„niezawodny”'],
  [/maksymaln\w+ bezpiecze/i, '„maksymalne bezpieczeństwo”'],
  [/nie czekaj/i, 'presja „nie czekaj”'],
  [/ograniczon\w+ liczb\w+/i, 'statyczny komunikat o ograniczonych terminach'],
  [/w tym miesiącu|szybkie terminy/i, 'statyczny komunikat o terminach'],
  [/numer 1|ponad 14 mln/i, 'statystyka producenta'],
  [/100% przezroczyst|zero ograniczeń|nikt nie musi wiedzieć/i, 'hasło reklamowe Invisalign'],
  [/widzisz efekt końcowy/i, 'obietnica efektu końcowego'],
  [/1\/10 sekundy|83%/, 'statystyka o ocenie wyglądu bez źródła'],
  [/(?<!\p{L})doskonał|(?<!\p{L})idealn|(?<!\p{L})rewelacyjn|ogromn\w+ doświadczeni/iu, 'superlatyw o jakości lub doświadczeniu'],
];

describe('treść stron: bez gwarancji, presji i niezweryfikowanych statystyk', () => {
  for (const [pattern, label] of RISKY_CLAIMS) {
    test(`żadna strona nie zawiera: ${label}`, () => {
      const found = pages.filter(({ text }) => pattern.test(text)).map(({ name }) => name);
      expect(found).toEqual([]);
    });
  }

  test('strona główna i wezwanie do kontaktu też są wolne od tych zapewnień', () => {
    const sources = [read('src/data/home.ts'), read('src/pages/index.astro'), read('src/components/layout/CtaSection.astro')];
    for (const [pattern] of RISKY_CLAIMS) {
      expect(sources.filter((text) => pattern.test(text))).toEqual([]);
    }
  });
});

describe('treść stron: ceny pochodzą z cennika', () => {
  test('strony usług nie mają kwot wpisanych ręcznie (są znaczniki {{cennik}} / {{cena}})', () => {
    for (const { name, text } of servicePages) {
      const body = text.replace(/^---[\s\S]*?---/, '');
      expect(body, name).not.toMatch(/\d[\d\s ]*\s?zł/);
    }
  });

  test('każdy znacznik cen wskazuje istniejącą pozycję cennika', () => {
    for (const { name, text } of pages) {
      expect(() => expandPriceMarkers(text, priceList as PriceItem[]), name).not.toThrow();
      expect(expandPriceMarkers(text, priceList as PriceItem[]), name).not.toMatch(/\{\{/);
    }
  });

  test('strony implantów i ortodoncji pokazują ceny z cennika', () => {
    for (const name of ['implanty.md', 'ortodoncja.md']) {
      expect(pages.find((page) => page.name === name)?.text, name).toMatch(/\{\{cennik:/);
    }
  });
});

describe('treść stron: powiązania', () => {
  test('odnośniki do biogramów prowadzą do istniejących lekarzy', () => {
    for (const { name, text } of pages) {
      for (const [, id] of text.matchAll(/\/nasz-zespol#team-([a-z-]+)/g)) {
        expect(existsSync(new URL(`src/content/team/${id}.md`, root)), `${name}: ${id}`).toBe(true);
      }
    }
  });

  test('strony usług wskazują lekarza prowadzącego już w pierwszym akapicie', () => {
    const lead = (name: string) => {
      const body = (servicePages.find((page) => page.name === name)?.text ?? '').replace(/^---\n[\s\S]*?\n---\n/, '');
      return body.trim().split(/\n\s*\n/)[0];
    };
    expect(lead('implanty.md')).toMatch(/Radosław Zaniewicz/);
    expect(lead('ortodoncja.md')).toMatch(/Monika Małek/);
    expect(lead('invisalign.md')).toMatch(/Monika Małek/);
  });

  test('implanty: tekst nie wymienia marek implantów spoza cennika (sprzeczność Alpha-bio / Bego / Straumann)', () => {
    const implants = pages.find((page) => page.name === 'implanty.md')?.text ?? '';
    // Marki z nazw pozycji cennika, np. „… na implancie Bego” → Bego.
    const inPriceList = new Set(
      (priceList as PriceItem[]).flatMap((item) => /implan\w+ (\p{Lu}[\p{L}-]+)$/u.exec(item.name)?.[1] ?? []),
    );
    expect(inPriceList.size).toBeGreaterThan(0);
    const knownBrands = ['Alpha-bio', 'Bego', 'Straumann', 'Nobel', 'Astra', 'Megagen', 'Neodent', 'Osstem', 'Dentsply'];
    for (const brand of knownBrands) {
      if (inPriceList.has(brand)) continue;
      expect(implants, brand).not.toMatch(new RegExp(brand, 'i'));
    }
    for (const brand of inPriceList) expect(implants).toContain(brand);
  });

  test('cennik: id pozycji z nazwą systemu zawiera ten system (znaczniki w treści nie pomylą marek)', () => {
    for (const item of priceList as PriceItem[]) {
      for (const brand of ['Bego', 'Straumann']) {
        if (item.name.includes(brand)) expect(item.id, item.name).toContain(brand.toLowerCase());
      }
    }
  });

  test('implanty: cena wszczepienia i koszt odbudowy zęba są rozdzielone w osobnych tabelach', () => {
    const implants = pages.find((page) => page.name === 'implanty.md')?.text ?? '';
    expect(implants).toMatch(/Etap chirurgiczny/);
    expect(implants).toMatch(/Korona na implancie/);
    expect(implants).toMatch(/Łączny koszt odbudowy jednego zęba/);
  });

  test('implanty: tabela cen nie zaczyna strony (najpierw lekarz, konsultacja i etapy)', () => {
    const implants = pages.find((page) => page.name === 'implanty.md')?.text ?? '';
    const firstTable = implants.indexOf('{{cennik:');
    expect(implants.indexOf('Radosław Zaniewicz')).toBeLessThan(firstTable);
    expect(implants.indexOf('## Konsultacja implantologiczna')).toBeLessThan(firstTable);
    expect(implants.indexOf('## Etapy leczenia')).toBeLessThan(firstTable);
    expect(implants).not.toMatch(/promocja-implant-korona/);
  });

  test('ortodoncja: bez wstępu o ocenianiu wyglądu i bez banera ze szkoleniami', () => {
    const ortho = pages.find((page) => page.name === 'ortodoncja.md')?.text ?? '';
    expect(ortho).not.toMatch(/pierwsze wrażenie|efekt aureoli/i);
    expect(ortho).not.toMatch(/szkolenie-/);
    for (const topic of ['dzieci', 'dorosł', 'kontrol', 'retencj']) {
      expect(ortho.toLowerCase()).toContain(topic);
    }
  });
});
