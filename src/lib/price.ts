import type { PriceCategory } from '../data/price-categories';

/** Pozycja cennika (`priceItem`), bez zależności od Astro, żeby dało się ją testować. */
export interface PriceItem {
  readonly id: string;
  readonly order: number;
  readonly category: string;
  readonly name: string;
  readonly price: number;
  readonly priceTo?: number;
  readonly isFrom?: boolean;
  readonly regularPrice?: number;
  readonly unit?: string;
  readonly note?: string;
  readonly highlight?: string;
}

const NBSP = ' ';

function money(value: number): string {
  const isWhole = Number.isInteger(value);
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  })
    .format(value)
    .replace(/\s/g, NBSP);
}

/** „2 600 zł", „od 4 000 zł", „850–1 200 zł", „bezpłatnie", „0,30 zł / strona". */
export function formatPrice(item: PriceItem): string {
  if (item.price === 0 && item.priceTo === undefined) return 'bezpłatnie';
  const amount =
    item.priceTo !== undefined
      ? `${money(item.price)}–${money(item.priceTo)}${NBSP}zł`
      : `${money(item.price)}${NBSP}zł`;
  const prefixed = item.isFrom ? `od${NBSP}${amount}` : amount;
  return item.unit ? `${prefixed}${NBSP}/${NBSP}${item.unit}` : prefixed;
}

export interface PriceGroup {
  readonly category: PriceCategory;
  readonly items: readonly PriceItem[];
}

/** Grupuje pozycje wg kategorii w kolejności zdefiniowanej w `categories`. Nieznana kategoria to błąd. */
export function groupByCategory(
  items: readonly PriceItem[],
  categories: readonly PriceCategory[],
): PriceGroup[] {
  const known = new Set(categories.map((c) => c.id));
  const unknown = items.filter((i) => !known.has(i.category));
  if (unknown.length > 0) {
    throw new Error(
      `Cennik: nieznana kategoria w pozycjach: ${unknown.map((i) => `${i.id} (${i.category})`).join(', ')}`,
    );
  }
  return categories
    .map((category) => ({ category, items: items.filter((i) => i.category === category.id) }))
    .filter((group) => group.items.length > 0);
}
