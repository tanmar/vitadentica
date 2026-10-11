/**
 * Treść stron jako `MarkdownPage`: jedno źródło dla endpointów `<ścieżka>.md` i dla llms-full.txt.
 * Korzysta z kolekcji Astro, więc nie działa w vitest; czyste kawałki (składanie tekstu) są w markdown.ts i llms.ts.
 */
import { homeMeta } from '../data/home';
import { priceCategories } from '../data/price-categories';
import { mainNav, specialties } from '../data/specialties';
import { clinic } from './clinic';
import { displayName, getPriceItems, getPublishedPages, getRequiredPage, getTeam, pathFor } from './content';
import type { PageEntry } from './content';
import { pageToMarkdown, type MarkdownPage } from './markdown';
import { formatPrice, groupByCategory } from './price';

/** Twarda spacja z `formatPrice` → zwykła, żeby tabela w Markdown nie zawierała niewidocznych znaków. */
const plain = (value: string): string => value.replace(/ /g, ' ');

/** Odpowiedź endpointu `.md`: Markdown strony z danymi gabinetu na końcu. */
export function markdownResponse(page: MarkdownPage): Response {
  return new Response(pageToMarkdown(page, clinic), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

/** Zwykła strona z kolekcji: treść = plik `.md`. */
export function entryMarkdown(page: PageEntry): MarkdownPage {
  return {
    title: page.data.title,
    description: page.data.description,
    h1: page.data.h1,
    body: page.body ?? '',
    path: pathFor(page),
  };
}

/** Strona główna: oferta (z `specialties`) i spis pozostałych stron z ich opisami; zdanie o gabinecie to cytat u góry. */
export async function homeMarkdown(): Promise<MarkdownPage> {
  const pages = await getPublishedPages();
  const descriptionByPath = new Map(pages.map((page) => [pathFor(page), page.data.description]));
  const url = (path: string) => new URL(path, clinic.url).toString();

  const offer = specialties.map((s) => `- [${s.label}](${url(s.path)}): ${s.blurb}`);
  const info = mainNav
    .filter((item) => !specialties.some((s) => s.path === item.path))
    .map((item) => {
      const description = descriptionByPath.get(item.path);
      return `- [${item.label}](${url(item.path)})${description ? `: ${description}` : ''}`;
    });

  return {
    title: 'Gabinet stomatologiczny Vitadentica',
    // Ten sam nagłówek co w HTML (twarda spacja zamieniona na zwykłą).
    h1: `${homeMeta.heading.lead} ${homeMeta.heading.accent}`.replace(/\u00a0/g, ' '),
    description: homeMeta.description,
    body: ['## Oferta', '', ...offer, '', '## Informacje', '', ...info].join('\n'),
    path: '/',
  };
}

/** Cennik: tabele z danych (`price-list.json`) + nota z pliku strony. */
export async function priceMarkdown(): Promise<MarkdownPage> {
  const page = await getRequiredPage('cennik');
  const items = await getPriceItems();
  const sections = groupByCategory(items, priceCategories).map(({ category, items: rows }) => {
    const lines = rows.map((item) => {
      const was =
        item.regularPrice === undefined
          ? ''
          : ` (cena regularna: ${plain(formatPrice({ ...item, price: item.regularPrice }))})`;
      const note = item.note ? `, ${item.note.toLowerCase()}` : '';
      return `| ${item.name}${note} | ${plain(formatPrice(item))}${was} |`;
    });
    return [`## ${category.title}`, '', '| Usługa | Cena |', '| --- | --- |', ...lines].join('\n');
  });

  return {
    title: page.data.title,
    description: page.data.description,
    h1: page.data.h1,
    body: [...sections, page.body?.trim() ?? ''].join('\n\n'),
    path: '/cennik',
  };
}

/** Zespół: wstęp z pliku strony + biogramy (kolekcja `team`). */
export async function teamMarkdown(): Promise<MarkdownPage> {
  const intro = await getRequiredPage('nasz-zespol');
  const team = await getTeam();
  const people = team.map((member) =>
    [
      `## ${displayName(member)}`,
      ...member.data.roles.map((role) => `*${role}*`),
      member.body?.trim() ?? '',
      member.data.schedule ? `**${member.data.schedule}**` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  );

  return {
    title: intro.data.title,
    description: intro.data.description,
    h1: intro.data.h1,
    body: [intro.body?.trim() ?? '', ...people].join('\n\n'),
    path: '/nasz-zespol',
  };
}

/** Wszystkie strony w kolejności menu (strona główna pierwsza); strony spoza menu na końcu. */
export async function allMarkdownPages(): Promise<MarkdownPage[]> {
  const entries = await getPublishedPages();
  const byPath = new Map(entries.map((entry) => [pathFor(entry), entry]));
  const navPaths: string[] = mainNav.map((item) => item.path).filter((path) => byPath.has(path));
  const otherPaths = [...byPath.keys()].filter((path) => path !== '/' && !navPaths.includes(path));

  const pages = await Promise.all(
    [...navPaths, ...otherPaths].map((path) => {
      const entry = byPath.get(path)!;
      if (entry.id === 'cennik') return priceMarkdown();
      if (entry.id === 'nasz-zespol') return teamMarkdown();
      return entryMarkdown(entry);
    }),
  );
  return [await homeMarkdown(), ...pages];
}
