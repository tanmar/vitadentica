import { describe, expect, test } from 'vitest';
import { expandPriceMarkers, parseTableMarker, markdownRow } from '../src/lib/price-tokens.mjs';
import type { PriceItem } from '../src/lib/price';

const item = (over: Partial<PriceItem>): PriceItem => ({
  id: 'x',
  order: 1,
  category: 'implanty',
  name: 'Zabieg',
  price: 100,
  ...over,
});

const items: PriceItem[] = [
  item({ id: 'konsultacja', name: 'Konsultacja', price: 100 }),
  item({ id: 'implant', name: 'Wszczepienie implantu', price: 2600, regularPrice: 3000 }),
  item({ id: 'korona', name: 'Korona', price: 2400, note: 'Cena zawiera łącznik' }),
];

describe('parseTableMarker', () => {
  test('reads the ids from a table marker, ignoring spaces', () => {
    expect(parseTableMarker('{{cennik: konsultacja, implant}}')).toEqual(['konsultacja', 'implant']);
    expect(parseTableMarker('  {{cennik:konsultacja}}  ')).toEqual(['konsultacja']);
  });

  test('returns null for ordinary text and for a marker with text around it', () => {
    expect(parseTableMarker('Zwykły akapit')).toBeNull();
    expect(parseTableMarker('Cennik: {{cennik: konsultacja}}')).toBeNull();
    expect(parseTableMarker('{{cena: konsultacja}}')).toBeNull();
  });
});

describe('markdownRow', () => {
  test('shows the regular price next to the current one and the note after the name', () => {
    expect(markdownRow(items[1])).toBe('| Wszczepienie implantu | 2 600 zł (cena regularna: 3 000 zł) |');
    expect(markdownRow(items[2])).toBe('| Korona, cena zawiera łącznik | 2 400 zł |');
  });

  test('uses plain spaces, so the table has no invisible characters', () => {
    expect(markdownRow(items[0])).not.toMatch(/\u00a0/);
  });
});

describe('expandPriceMarkers', () => {
  test('replaces a table marker line with a Markdown table of the listed items, in that order', () => {
    const md = expandPriceMarkers('Przed\n\n{{cennik: korona, konsultacja}}\n\nPo', items);
    expect(md).toBe(
      [
        'Przed',
        '',
        '| Usługa | Cena |',
        '| --- | --- |',
        '| Korona, cena zawiera łącznik | 2 400 zł |',
        '| Konsultacja | 100 zł |',
        '',
        'Po',
      ].join('\n'),
    );
  });

  test('replaces an inline price with the formatted amount', () => {
    expect(expandPriceMarkers('Konsultacja kosztuje {{cena: konsultacja}}.', items)).toBe(
      'Konsultacja kosztuje 100 zł.',
    );
  });

  test('replaces several inline prices, also in one line and in consecutive lines', () => {
    const md = 'A {{cena: konsultacja}} i {{cena: implant}}.\nB {{cena: korona}}, C {{cena: konsultacja}}.';
    expect(expandPriceMarkers(md, items)).toBe('A 100 zł i 2 600 zł.\nB 2 400 zł, C 100 zł.');
  });

  test('fails on a malformed marker left in the text (typo, capital letter, missing comma)', () => {
    for (const md of ['{{Cennik: konsultacja}}', '{{cena: Konsultacja}}', 'Cena: {{cennik: konsultacja}}']) {
      expect(() => expandPriceMarkers(md, items), md).toThrow(/niepoprawny znacznik/);
    }
  });

  test('leaves text without markers untouched', () => {
    const md = 'Zwykły tekst z liczbą 100 zł.';
    expect(expandPriceMarkers(md, items)).toBe(md);
  });

  test('fails loudly on an unknown id instead of publishing a page without a price', () => {
    expect(() => expandPriceMarkers('{{cennik: brak-takiej-pozycji}}', items)).toThrow(/brak-takiej-pozycji/);
    expect(() => expandPriceMarkers('{{cena: brak-takiej-pozycji}}', items)).toThrow(/brak-takiej-pozycji/);
  });
});
