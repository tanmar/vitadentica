/**
 * Ceny w treści stron (Markdown): kwoty pochodzą z `src/data/price-list.json`, a nie z tekstu, więc zmiana cennika
 * zmienia stronę, wersję `.md`, `llms-full.txt` i dane strukturalne naraz.
 *
 *   {{cennik: id, id}}   osobny akapit → tabela cen wskazanych pozycji (w tej kolejności)
 *   {{cena: id}}         w zdaniu → cena jednej pozycji, np. „100 zł"
 *
 * Nieznane `id` przerywa build: lepiej bez strony niż strona bez ceny. Plik .mjs, bo używa go też wtyczka rehype.
 */
import { formatPrice } from './price-format.mjs';

const ID = '[a-z0-9-]+';
const TABLE_MARKER = new RegExp(`^\\s*\\{\\{cennik:\\s*(${ID}(?:\\s*,\\s*${ID})*)\\s*\\}\\}\\s*$`);
/** Nowy obiekt przy każdym użyciu: wyrażenie z flagą `g` pamięta pozycję (`lastIndex`). */
export const inlineMarker = () => new RegExp(`\\{\\{cena:\\s*(${ID})\\s*\\}\\}`, 'g');

const plain = (/** @type {string} */ value) => value.replace(/\u00a0/g, ' ');

/**
 * Cena jako zwykły tekst (bez twardych spacji), do wersji Markdown.
 * @param {import('./price').PriceItem} item
 * @returns {string}
 */
export const plainPrice = (item) => plain(formatPrice(item));

/**
 * Identyfikatory z markera tabeli albo `null`, gdy tekst nie jest samym markerem.
 * @param {string} text
 * @returns {string[] | null}
 */
export function parseTableMarker(text) {
  const match = TABLE_MARKER.exec(text);
  return match ? match[1].split(',').map((id) => id.trim()) : null;
}

/**
 * Pozycja cennika o danym `id`; brak to błąd z nazwą miejsca użycia.
 * @param {readonly import('./price').PriceItem[]} items
 * @param {string} id
 * @returns {import('./price').PriceItem}
 */
export function findPriceItem(items, id) {
  const found = items.find((item) => item.id === id);
  if (!found) throw new Error(`Cennik: brak pozycji „${id}” (użyta w treści strony jako {{cennik}} lub {{cena}})`);
  return found;
}

/**
 * Wiersz tabeli Markdown: nazwa (z notą), cena aktualna i regularna.
 * @param {import('./price').PriceItem} item
 * @returns {string}
 */
export function markdownRow(item) {
  const was =
    item.regularPrice === undefined
      ? ''
      : ` (cena regularna: ${plain(formatPrice({ ...item, price: item.regularPrice }))})`;
  const note = item.note ? `, ${item.note.toLowerCase()}` : '';
  return `| ${item.name}${note} | ${plainPrice(item)}${was} |`;
}

/**
 * Wersja Markdown treści strony: znaczniki zamienione na tabele i kwoty (dla `.md` i `llms-full.txt`).
 * @param {string} markdown
 * @param {readonly import('./price').PriceItem[]} items
 * @returns {string}
 */
export function expandPriceMarkers(markdown, items) {
  const expanded = markdown
    .split('\n')
    .map((line) => {
      const ids = parseTableMarker(line);
      if (ids) {
        const rows = ids.map((id) => markdownRow(findPriceItem(items, id)));
        return ['| Usługa | Cena |', '| --- | --- |', ...rows].join('\n');
      }
      return line.replace(inlineMarker(), (_match, id) => plainPrice(findPriceItem(items, id)));
    })
    .join('\n');
  const leftover = /\{\{\s*(cennik|cena)/i.exec(expanded);
  if (leftover) {
    throw new Error(
      `Cennik: niepoprawny znacznik cen w treści (…${expanded.slice(leftover.index, leftover.index + 60)}…). ` +
        'Oczekiwane: osobna linia {{cennik: id, id}} albo {{cena: id}} w zdaniu (id małymi literami).',
    );
  }
  return expanded;
}
