/**
 * Ceny z `price-list.json` w treści Markdown (rehype). Składnia i zasady: `src/lib/price-tokens.mjs`.
 *  - akapit `{{cennik: id, id}}` → tabela w tym samym układzie co na /cennik (`.cmp-w > table.cmp`),
 *  - `{{cena: id}}` w tekście → sformatowana cena.
 * Musi działać przed `rehype-content`: FAQ do JSON-LD powstaje z drzewa po tej zamianie, więc ma te same kwoty co strona.
 */
import { readFileSync } from 'node:fs';
import { formatPrice } from '../lib/price-format.mjs';
import { findPriceItem, inlineMarker, parseTableMarker } from '../lib/price-tokens.mjs';

const PRICE_LIST = new URL('../data/price-list.json', import.meta.url);

const el = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const plainText = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(plainText).join(''));

function priceCell(item) {
  const was =
    item.regularPrice === undefined
      ? []
      : [
          el('del', { className: ['cmp__was'] }, [
            el('span', { className: ['sr-only'] }, [text('Cena regularna: ')]),
            text(formatPrice({ ...item, price: item.regularPrice })),
          ]),
        ];
  const now = el('span', item.regularPrice === undefined ? {} : { className: ['cmp__now'] }, [
    text(formatPrice(item)),
  ]);
  return el('td', {}, [...was, now]);
}

function priceRow(item) {
  // Spacja przed notą: bez niej tekst brany z drzewa (FAQ w JSON-LD) kleiłby nazwę z notą.
  const note = item.note ? [text(' '), el('span', { className: ['cmp__note'] }, [text(item.note)])] : [];
  const name = [text(item.name), ...note];
  return el('tr', {}, [el('th', { scope: 'row' }, name), priceCell(item)]);
}

function priceTable(items) {
  const head = el('thead', {}, [
    el('tr', {}, [
      el('th', { scope: 'col' }, [text('Usługa')]),
      el('th', { scope: 'col' }, [text('Cena')]),
    ]),
  ]);
  return el('div', { className: ['cmp-w'] }, [
    el('table', { className: ['cmp'] }, [head, el('tbody', {}, items.map(priceRow))]),
  ]);
}

/** Zamienia znaczniki `{{cena: id}}` w węzłach tekstowych poddrzewa (w miejscu: węzły są świeże dla każdej strony). */
function replaceInlinePrices(node, items) {
  if (node.type === 'text') {
    node.value = node.value.replace(inlineMarker(), (_match, id) => formatPrice(findPriceItem(items, id)));
    return;
  }
  for (const child of node.children ?? []) replaceInlinePrices(child, items);
}

/** Resztka znacznika po zamianie (literówka, wielka litera, znacznik w liście lub w akapicie z innym tekstem). */
const LEFTOVER_MARKER = /\{\{\s*(cennik|cena)/i;

function assertNoLeftovers(node) {
  if (node.type === 'text' && LEFTOVER_MARKER.test(node.value)) {
    throw new Error(
      `Cennik: niepoprawny znacznik cen w treści: „${node.value.trim().slice(0, 80)}”. ` +
        'Oczekiwane: osobny akapit {{cennik: id, id}} albo {{cena: id}} w zdaniu (id małymi literami).',
    );
  }
  for (const child of node.children ?? []) assertNoLeftovers(child);
}

/**
 * @param {{ items?: readonly import('../lib/price').PriceItem[] }} [options] `items` tylko w testach; domyślnie plik z danymi.
 *
 * Uwaga: wynik renderowania Markdown trafia do pamięci podręcznej warstwy treści, kluczowanej plikiem strony, a nie
 * cennikiem. Dlatego skrypty `build` używają `astro build --force`; w `astro dev` po zmianie cennika zapisz plik strony.
 */
export default function rehypePrices(options = {}) {
  return (tree) => {
    const items = options.items ?? JSON.parse(readFileSync(PRICE_LIST, 'utf8'));
    tree.children = tree.children.map((node) => {
      const ids = node.type === 'element' && node.tagName === 'p' ? parseTableMarker(plainText(node)) : null;
      if (ids) return priceTable(ids.map((id) => findPriceItem(items, id)));
      replaceInlinePrices(node, items);
      return node;
    });
    tree.children.forEach(assertNoLeftovers);
  };
}
