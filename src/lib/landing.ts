/**
 * Treść i pomocnicze funkcje stron lądowania pod Google Ads (`/lp/*`). Bez zależności od Astro, żeby dało się je
 * testować. Kwoty w tekstach to znaczniki `{{cena: id}}` (jak w treści stron usług): pochodzą z `price-list.json`.
 */
import { formatPrice } from './price-format.mjs';
import { findPriceItem, inlineMarker } from './price-tokens.mjs';
import type { PriceItem } from './price';

const NBSP = ' ';

/** Twarda spacja po jednoliterowych spójnikach i przyimkach (w, z, i, o, u, a), żeby nie zostawały na końcu wiersza. */
export function nbsp(text: string): string {
  return text.replace(/(^|[\s(„"])([wziouaWZIOUA]) /g, `$1$2${NBSP}`);
}

/** Zamienia `{{cena: id}}` w tekście na kwotę z cennika i dokłada twarde spacje. Nieznane `id` przerywa build. */
export function expandInlinePrices(text: string, items: readonly PriceItem[]): string {
  return nbsp(text.replace(inlineMarker(), (_match, id: string) => formatPrice(findPriceItem(items, id))));
}

/** To samo dla każdego napisu w strukturze (obiekty, tablice); inne wartości zostają bez zmian. */
export function expandPrices<T>(value: T, items: readonly PriceItem[]): T {
  if (typeof value === 'string') return expandInlinePrices(value, items) as T;
  if (Array.isArray(value)) return value.map((entry) => expandPrices(entry, items)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, expandPrices(entry, items)])) as T;
  }
  return value;
}

/** Numery dni z `clinic.hours` (nazwy angielskie schema.org) → ISO 1–7, dla skryptu statusu rejestracji. */
export function hoursForScript(
  hours: readonly { readonly days: readonly string[]; readonly opens: string; readonly closes: string }[],
): { days: number[]; opens: string; closes: string }[] {
  const iso: Record<string, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };
  return hours.map(({ days, opens, closes }) => ({ days: days.map((day) => iso[day]), opens, closes }));
}

/** Łączy dwa ostatnie wyrazy twardą spacją, żeby w nagłówku ostatni wyraz nie zostawał sam w wierszu. */
export function bindLastWords(text: string): string {
  return text.replace(/ (?=[^ ]+$)/, '\u00a0');
}
