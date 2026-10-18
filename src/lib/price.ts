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

/** Zapis ceny („2 600 zł", „od 4 000 zł", „bezpłatnie"): kod w price-format.mjs, bo korzysta z niego też wtyczka rehype. */
export { formatPrice } from './price-format.mjs';

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
