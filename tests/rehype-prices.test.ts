import { describe, expect, test } from 'vitest';
import rehypePrices from '../src/plugins/rehype-prices.mjs';
import { plainTextOf } from '../src/plugins/rehype-content.mjs';
import type { PriceItem } from '../src/lib/price';

type Node = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: Node[] };

const el = (tagName: string, children: Node[] = [], properties: Record<string, unknown> = {}): Node => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const text = (value: string): Node => ({ type: 'text', value });

const items: PriceItem[] = [
  { id: 'konsultacja', order: 1, category: 'implanty', name: 'Konsultacja', price: 100 },
  { id: 'implant', order: 2, category: 'implanty', name: 'Wszczepienie implantu', price: 2600, regularPrice: 3000 },
  { id: 'korona', order: 3, category: 'implanty', name: 'Korona', price: 2400, note: 'Cena zawiera łącznik' },
];

const run = (children: Node[]) => {
  const tree = { type: 'root', children };
  rehypePrices({ items })(tree);
  return tree.children as Node[];
};
const find = (node: Node, tagName: string): Node[] => [
  ...(node.tagName === tagName ? [node] : []),
  ...(node.children ?? []).flatMap((child) => find(child, tagName)),
];
const classes = (node: Node) => node.properties?.className;

describe('rehype-prices: tabela', () => {
  const [table] = run([el('p', [text('{{cennik: implant, korona}}')])]);

  test('replaces the marker paragraph with the price table markup used on /cennik', () => {
    expect(table.tagName).toBe('div');
    expect(classes(table)).toEqual(['cmp-w']);
    expect(classes(find(table, 'table')[0])).toEqual(['cmp']);
  });

  test('has a header and one row per id, in the order given', () => {
    expect(find(table, 'thead')).toHaveLength(1);
    const rows = find(find(table, 'tbody')[0], 'tr');
    expect(rows.map((row) => plainTextOf(find(row, 'th')[0]))).toEqual([
      'Wszczepienie implantu',
      'Korona Cena zawiera łącznik',
    ]);
  });

  test('shows the regular price struck through, with a text label for screen readers', () => {
    const [implantRow] = find(find(table, 'tbody')[0], 'tr');
    const [was] = find(implantRow, 'del');
    expect(classes(was)).toEqual(['cmp__was']);
    expect(plainTextOf(was)).toContain('Cena regularna:');
    expect(plainTextOf(was)).toContain('3 000 zł');
    expect(plainTextOf(find(implantRow, 'td')[0])).toContain('2 600 zł');
  });

  test('puts the note in its own element under the name', () => {
    const rows = find(find(table, 'tbody')[0], 'tr');
    const [note] = find(rows[1], 'span').filter((span) => classes(span)?.toString() === 'cmp__note');
    expect(plainTextOf(note)).toBe('Cena zawiera łącznik');
  });

  test('fails on an unknown id', () => {
    expect(() => run([el('p', [text('{{cennik: brak}}')])])).toThrow(/brak/);
  });
});

describe('rehype-prices: cena w zdaniu', () => {
  test('replaces the inline marker with the formatted price and keeps the rest of the sentence', () => {
    const [p] = run([el('p', [text('Konsultacja kosztuje {{cena: konsultacja}}, a wizyta trwa krótko.')])]);
    expect(plainTextOf(p)).toBe('Konsultacja kosztuje 100 zł, a wizyta trwa krótko.');
  });

  test('works inside nested elements such as emphasis or list items', () => {
    const [ul] = run([el('ul', [el('li', [el('strong', [text('{{cena: implant}}')])])])]);
    expect(plainTextOf(ul)).toBe('2 600 zł');
  });

  test('fails on an unknown id', () => {
    expect(() => run([el('p', [text('{{cena: brak}}')])])).toThrow(/brak/);
  });

  test('does not touch paragraphs without markers', () => {
    const input = [el('p', [text('Zwykły akapit.')])];
    expect(run(input)).toEqual([el('p', [text('Zwykły akapit.')])]);
  });
});
