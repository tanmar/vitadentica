import { describe, expect, test } from 'vitest';
import rehypeContent, { plainTextOf, textOf } from '../src/plugins/rehype-content.mjs';

type Node = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: Node[] };

const el = (tagName: string, children: Node[] = [], properties: Record<string, unknown> = {}): Node => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const text = (value: string): Node => ({ type: 'text', value });
const run = (children: Node[]) => {
  const tree = { type: 'root', children };
  rehypeContent()(tree);
  return tree.children as Node[];
};
const tags = (nodes: Node[]) => nodes.map((n) => n.tagName ?? n.type);
/** Uruchamia wtyczkę z plikiem jak w Astro (`file.data.astro.frontmatter`) i zwraca drzewo oraz dane FAQ. */
const runWithFile = (children: Node[]) => {
  const tree = { type: 'root', children };
  const file = { data: { astro: { frontmatter: {} as Record<string, unknown> } } };
  rehypeContent()(tree, file);
  return { out: tree.children as Node[], faq: file.data.astro.frontmatter.faq };
};

describe('rehype-content: FAQ', () => {
  test('turns h3 + answer into details.fq with the question as summary', () => {
    const out = run([
      el('h2', [text('Implanty - pytania i odpowiedzi')]),
      el('h3', [text('Czy boli?')]),
      el('p', [text('Nie.')]),
      el('h3', [text('Jak długo?')]),
      el('p', [text('20 minut.')]),
    ]);

    expect(tags(out)).toEqual(['h2', 'details', 'details']);
    const first = out[1];
    expect(first.properties?.className).toEqual(['fq']);
    expect(textOf(first.children![0])).toBe('Czy boli?');
    expect(first.children![1].children).toHaveLength(1);
  });

  test('stops the FAQ at a thematic break so a trailing CTA stays outside the accordion', () => {
    const out = run([
      el('h2', [text('FAQ – Invisalign')]),
      el('h3', [text('Pytanie?')]),
      el('p', [text('Odpowiedź.')]),
      el('hr'),
      el('p', [el('a', [text('Umów wizytę')], { href: '/kontakt' })]),
    ]);

    expect(tags(out)).toEqual(['h2', 'details', 'hr', 'p']);
  });

  test('leaves other sections untouched', () => {
    const out = run([el('h2', [text('Oferta')]), el('h3', [text('Podtytuł')]), el('p', [text('x')])]);
    expect(tags(out)).toEqual(['h2', 'h3', 'p']);
  });

  test('keeps an intro paragraph that precedes the first question', () => {
    const out = run([
      el('h2', [text('FAQ')]),
      el('p', [text('Odpowiadamy na pytania.')]),
      el('h3', [text('Q?')]),
      el('p', [text('A.')]),
    ]);
    expect(tags(out)).toEqual(['h2', 'p', 'details']);
  });
});

describe('rehype-content: dane FAQ dla JSON-LD', () => {
  test('publikuje dokładnie te pytania i odpowiedzi, które pokazuje akordeon', () => {
    const { out, faq } = runWithFile([
      el('h2', [text('Implanty - pytania i odpowiedzi')]),
      el('h3', [text('Czy boli?')]),
      el('p', [text('Nie.')]),
      el('h3', [text('Jak długo?')]),
      el('p', [text('20 minut.')]),
    ]);
    const accordion = out.filter((n) => n.tagName === 'details').map((d) => textOf(d.children![0]));
    expect(faq).toEqual([
      { question: 'Czy boli?', answer: 'Nie.' },
      { question: 'Jak długo?', answer: '20 minut.' },
    ]);
    expect((faq as { question: string }[]).map((i) => i.question)).toEqual(accordion);
  });

  test('odpowiedź to widoczny tekst: bez znaczników, akapity i pozycje listy oddzielone spacją', () => {
    const { faq } = runWithFile([
      el('h2', [text('FAQ')]),
      el('h3', [text('Pytanie?')]),
      el('p', [text('Zabieg w '), el('strong', [text('znieczuleniu')]), text('.')]),
      el('ul', [el('li', [text('pierwsze')]), el('li', [text('drugie')])]),
      el('p', [text('Więcej: '), el('a', [text('cennik')], { href: '/cennik' }), text('.')]),
    ]);
    expect(faq).toEqual([{ question: 'Pytanie?', answer: 'Zabieg w znieczuleniu. pierwsze drugie Więcej: cennik.' }]);
  });

  test('pomija wstęp przed pierwszym pytaniem oraz wszystko po linii poziomej', () => {
    const { faq } = runWithFile([
      el('h2', [text('FAQ – Invisalign')]),
      el('p', [text('Odpowiadamy na pytania pacjentów.')]),
      el('h3', [text('Pytanie?')]),
      el('p', [text('Odpowiedź.')]),
      el('hr'),
      el('h3', [text('Umów wizytę')]),
      el('p', [text('To nie pytanie z FAQ.')]),
    ]);
    expect(faq).toEqual([{ question: 'Pytanie?', answer: 'Odpowiedź.' }]);
  });

  test('używa tego samego rozpoznania sekcji co akordeon: „Masz pytania?” nie jest FAQ', () => {
    const { out, faq } = runWithFile([
      el('h2', [text('Masz pytania? Zadzwoń')]),
      el('h3', [text('Telefon')]),
      el('p', [text('22 370 25 10')]),
    ]);
    expect(tags(out)).toEqual(['h2', 'h3', 'p']);
    expect(faq).toBeUndefined();
  });

  test('zbiera pytania ze wszystkich sekcji FAQ na stronie', () => {
    const { faq } = runWithFile([
      el('h2', [text('Implanty - pytania i odpowiedzi')]),
      el('h3', [text('A?')]),
      el('p', [text('a')]),
      el('h2', [text('Ortodoncja - pytania i odpowiedzi')]),
      el('h3', [text('B?')]),
      el('p', [text('b')]),
    ]);
    expect(faq).toEqual([
      { question: 'A?', answer: 'a' },
      { question: 'B?', answer: 'b' },
    ]);
  });

  test('pomija pytanie bez odpowiedzi', () => {
    const { faq } = runWithFile([
      el('h2', [text('FAQ')]),
      el('h3', [text('Puste?')]),
      el('h3', [text('Pełne?')]),
      el('p', [text('Tak.')]),
    ]);
    expect(faq).toEqual([{ question: 'Pełne?', answer: 'Tak.' }]);
  });

  test('nie wymaga pliku (testy jednostkowe, inne potoki)', () => {
    expect(() => run([el('h2', [text('FAQ')]), el('h3', [text('Q?')]), el('p', [text('A.')])])).not.toThrow();
  });
});

describe('plainTextOf', () => {
  test('łączy elementy blokowe spacją, a inline bez separatora', () => {
    const node = el('div', [el('p', [text('a'), el('em', [text('b')]), text('c')]), el('p', [text('d')])]);
    expect(plainTextOf(node)).toBe('abc d');
  });

  test('traktuje <br> jako odstęp i zwija białe znaki', () => {
    const node = el('p', [text('linia 1'), el('br'), text('  linia\n2 ')]);
    expect(plainTextOf(node)).toBe('linia 1 linia 2');
  });
});

describe('rehype-content: link-only paragraphs', () => {
  test('marks a paragraph consisting only of a link as cta-link', () => {
    const out = run([el('p', [el('a', [text('Umów wizytę')], { href: '/kontakt' })])]);
    expect(out[0].properties?.className).toEqual(['cta-link']);
  });

  test('does not mark paragraphs that mix text and a link', () => {
    const out = run([el('p', [text('Zobacz '), el('a', [text('cennik')], { href: '/cennik' })])]);
    expect(out[0].properties?.className).toBeUndefined();
  });
});
