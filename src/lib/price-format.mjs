/**
 * Zapis cen z `price-list.json`. Plik .mjs, bo korzysta z niego także wtyczka rehype (`src/plugins/rehype-prices.mjs`),
 * która działa poza Vite i nie czyta TypeScriptu; `price.ts` re-eksportuje `formatPrice`.
 */

const NBSP = '\u00a0';

/** @param {number} value */
function money(value) {
  const isWhole = Number.isInteger(value);
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  })
    .format(value)
    .replace(/\s/g, NBSP);
}

/**
 * „2 600 zł", „od 4 000 zł", „850–1 200 zł", „bezpłatnie", „0,30 zł / strona".
 * @param {import('./price').PriceItem} item
 * @returns {string}
 */
export function formatPrice(item) {
  if (item.price === 0 && item.priceTo === undefined) return 'bezpłatnie';
  const amount =
    item.priceTo !== undefined
      ? `${money(item.price)}–${money(item.priceTo)}${NBSP}zł`
      : `${money(item.price)}${NBSP}zł`;
  const prefixed = item.isFrom ? `od${NBSP}${amount}` : amount;
  return item.unit ? `${prefixed}${NBSP}/${NBSP}${item.unit}` : prefixed;
}
