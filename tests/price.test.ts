import { describe, expect, test } from 'vitest';
import { priceCategories } from '../src/data/price-categories';
import { buildPriceCatalog } from '../src/lib/jsonld';
import { clinic } from '../src/lib/clinic';
import { formatPrice, groupByCategory, type PriceItem } from '../src/lib/price';
import priceList from '../src/data/price-list.json';

const item = (over: Partial<PriceItem>): PriceItem => ({
  id: 'x',
  order: 1,
  category: 'implanty',
  name: 'Zabieg',
  price: 100,
  ...over,
});
const text = (s: string) => s.replace(/ /g, ' ');

describe('formatPrice', () => {
  test('formats a single price with thousands grouping', () => {
    expect(text(formatPrice(item({ price: 2600 })))).toBe('2 600 zł');
  });

  test('formats a range with an en dash', () => {
    expect(text(formatPrice(item({ price: 850, priceTo: 1200 })))).toBe('850–1 200 zł');
  });

  test('prefixes "od" for starting-from prices', () => {
    expect(text(formatPrice(item({ price: 4000, isFrom: true })))).toBe('od 4 000 zł');
  });

  test('renders zero as "bezpłatnie"', () => {
    expect(formatPrice(item({ price: 0 }))).toBe('bezpłatnie');
  });

  test('keeps grosze and appends the unit', () => {
    expect(text(formatPrice(item({ price: 0.3, unit: 'strona' })))).toBe('0,30 zł / strona');
  });
});

describe('groupByCategory', () => {
  test('orders groups by category list and drops empty ones', () => {
    const groups = groupByCategory(
      [item({ id: 'a', category: 'protetyka' }), item({ id: 'b', category: 'implanty' })],
      priceCategories,
    );
    expect(groups.map((g) => g.category.id)).toEqual(['implanty', 'protetyka']);
  });

  test('throws on an unknown category instead of silently dropping prices', () => {
    expect(() => groupByCategory([item({ category: 'nie-istnieje' })], priceCategories)).toThrow(
      /nieznana kategoria/i,
    );
  });
});

describe('price-list.json', () => {
  test('every item belongs to a known category and ids are unique', () => {
    const items = priceList as PriceItem[];
    expect(() => groupByCategory(items, priceCategories)).not.toThrow();
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  test('order values are unique so the page order is deterministic', () => {
    const orders = (priceList as PriceItem[]).map((i) => i.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  test('promotional prices are lower than the regular price', () => {
    for (const i of priceList as PriceItem[]) {
      if (i.regularPrice !== undefined) expect(i.price).toBeLessThan(i.regularPrice);
    }
  });
});

describe('buildPriceCatalog', () => {
  test('uses price for single prices and min/max for ranges', () => {
    const ld = buildPriceCatalog(clinic, [
      item({ name: 'A', price: 100 }),
      item({ name: 'B', price: 300, priceTo: 350 }),
    ]) as any;
    expect(ld['@type']).toBe('OfferCatalog');
    expect(ld.itemListElement[0].price).toBe(100);
    expect(ld.itemListElement[1].priceSpecification.maxPrice).toBe(350);
    expect(ld.itemListElement[1]).not.toHaveProperty('price');
  });

  test('does not claim an exact price for "from" prices', () => {
    const ld = buildPriceCatalog(clinic, [item({ price: 4000, isFrom: true })]) as any;
    expect(ld.itemListElement[0]).not.toHaveProperty('price');
    expect(ld.itemListElement[0].priceSpecification.minPrice).toBe(4000);
    expect(ld.itemListElement[0].priceSpecification).not.toHaveProperty('maxPrice');
  });

  test('keeps the unit of measure for per-unit prices', () => {
    const ld = buildPriceCatalog(clinic, [item({ price: 0.3, unit: 'strona' })]) as any;
    expect(ld.itemListElement[0].priceSpecification.unitText).toBe('strona');
  });
});
