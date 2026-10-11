import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import type { DoctorInput } from './jsonld';
import type { PriceItem } from './price';

export type PageEntry = CollectionEntry<'pages'>;
export type TeamEntry = CollectionEntry<'team'>;

/** Strony z własnym szablonem HTML (`src/pages/*.astro`); trasa `[...slug]` ich nie generuje. */
const CUSTOM_HTML_PAGE_IDS: readonly string[] = ['index', 'nasz-zespol', 'cennik', 'kontakt'];
/** Strony z własnym endpointem `.md` (treść złożona z danych, nie tylko z pliku). */
const CUSTOM_MARKDOWN_PAGE_IDS: readonly string[] = ['index', 'nasz-zespol', 'cennik'];

/** Ścieżka URL wpisu: `implanty` → `/implanty`, `index` → `/`. */
export function pathFor(entry: PageEntry): string {
  return entry.id === 'index' ? '/' : `/${entry.id}`;
}

/** Strona wymagana przez własny szablon; brak pliku lub `draft: true` przerywa build. */
export async function getRequiredPage(id: string): Promise<PageEntry> {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`Brak src/content/pages/${id}.md`);
  if (entry.data.draft) {
    throw new Error(`Strona "${id}" ma własny szablon i nie może być szkicem (draft: true)`);
  }
  return entry;
}

/** Wszystkie opublikowane strony (bez `draft`), po ścieżce. Źródło dla llms.txt. */
export async function getPublishedPages(): Promise<PageEntry[]> {
  const all = await getCollection('pages', ({ data }) => !data.draft);
  return [...all].sort((a, b) => a.id.localeCompare(b.id, 'pl'));
}

/** Strony renderowane jednym, wspólnym szablonem `[...slug]`. */
export async function getGenericPages(): Promise<PageEntry[]> {
  const pages = await getPublishedPages();
  return pages.filter((page) => !CUSTOM_HTML_PAGE_IDS.includes(page.id));
}

/** Strony, których wersję `.md` buduje trasa `[...slug].md`. */
export async function getGenericMarkdownPages(): Promise<PageEntry[]> {
  const pages = await getPublishedPages();
  return pages.filter((page) => !CUSTOM_MARKDOWN_PAGE_IDS.includes(page.id));
}

export async function getTeam(): Promise<TeamEntry[]> {
  const team = await getCollection('team');
  return [...team].sort((a, b) => a.data.order - b.data.order);
}

/** Pełna nazwa z tytułem: „lek. dent. Monika Małek". */
export function displayName(member: TeamEntry): string {
  const { honorific, name } = member.data;
  return honorific ? `${honorific} ${name}` : name;
}

/** Lekarze do JSON-LD (Physician). Personel (manager, higienistka) nie jest lekarzem. */
export async function getDoctorsForJsonLd(team: readonly TeamEntry[]): Promise<DoctorInput[]> {
  const doctors = team.filter((member) => member.data.kind === 'doctor');
  return Promise.all(
    doctors.map(async (member) => {
      const { photo, roles } = member.data;
      const image = photo ? await getImage({ src: photo, width: 600 }) : undefined;
      return {
        id: member.id,
        name: displayName(member),
        description: roles.length > 0 ? roles.join(', ') : undefined,
        image: image?.src,
      };
    }),
  );
}

/** Pozycje cennika w kolejności z pliku danych (`order`). */
export async function getPriceItems(): Promise<PriceItem[]> {
  const entries = await getCollection('priceList');
  return entries.map((entry) => entry.data).sort((a, b) => a.order - b.order);
}
