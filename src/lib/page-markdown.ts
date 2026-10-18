/**
 * Treść stron jako `MarkdownPage`: jedno źródło dla endpointów `<ścieżka>.md` i dla llms-full.txt.
 * Korzysta z kolekcji Astro, więc nie działa w vitest; czyste kawałki (składanie tekstu) są w markdown.ts i llms.ts.
 */
import {
  homeAreas,
  homeConsultationNote,
  homeConsultationPriceIds,
  homeLead,
  homeMeta,
  homeOtherCare,
  homeSteps,
} from '../data/home';
import { priceCategories } from '../data/price-categories';
import { mainNav, specialties } from '../data/specialties';
import { clinic } from './clinic';
import { displayName, getPriceItems, getPublishedPages, getRequiredPage, getTeam, pathFor } from './content';
import type { PageEntry } from './content';
import { pageToMarkdown, type MarkdownPage } from './markdown';
import { groupByCategory } from './price';
import { expandPriceMarkers, findPriceItem, markdownRow, plainPrice } from './price-tokens.mjs';

/** Odpowiedź endpointu `.md`: Markdown strony z danymi gabinetu na końcu. */
export function markdownResponse(page: MarkdownPage): Response {
  return new Response(pageToMarkdown(page, clinic), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

/** Zwykła strona z kolekcji: treść = plik `.md`, ze znacznikami cen zamienionymi na kwoty z cennika. */
export async function entryMarkdown(page: PageEntry): Promise<MarkdownPage> {
  return {
    title: page.data.title,
    description: page.data.description,
    h1: page.data.h1,
    body: expandPriceMarkers(page.body ?? '', await getPriceItems()),
    path: pathFor(page),
  };
}

/**
 * Strona główna: te same treści co w HTML (`src/data/home.ts`): wstęp, dwa główne obszary z lekarzem prowadzącym,
 * kroki, ceny konsultacji z cennika i pozostała opieka; na końcu spis pozostałych stron z ich opisami.
 */
export async function homeMarkdown(): Promise<MarkdownPage> {
  const [pages, team, priceItems] = await Promise.all([getPublishedPages(), getTeam(), getPriceItems()]);
  const descriptionByPath = new Map(pages.map((page) => [pathFor(page), page.data.description]));
  const url = (path: string) => new URL(path, clinic.url).toString();
  const text = (value: string) => value.replace(/\u00a0/g, ' ');

  const areas = homeAreas.map((area) => {
    const doctor = team.find((member) => member.id === area.doctorId);
    if (!doctor) throw new Error(`Strona główna: brak lekarza "${area.doctorId}" w kolekcji team`);
    const focus = doctor.data.focus ? ` (${doctor.data.focus})` : '';
    return [
      `## ${area.title}`,
      '',
      area.text,
      '',
      `Leczenie prowadzi: [${displayName(doctor)}](${url(`/nasz-zespol#team-${doctor.id}`)})${focus}.`,
      '',
      `- [${area.linkLabel}](${url(area.path)})`,
      ...(area.extra ? [`- [${area.extra.label}](${url(area.extra.path)})`] : []),
    ].join('\n');
  });

  const steps = homeSteps.map((step, i) => `${i + 1}. **${step.title}.** ${step.text}`);

  const categoryTitle = new Map(priceCategories.map((category) => [category.id, category.title]));
  const consultations = homeConsultationPriceIds.map((id) => {
    const item = findPriceItem(priceItems, id);
    return `| ${item.name} (${categoryTitle.get(item.category)}) | ${plainPrice(item)} |`;
  });

  const info = mainNav
    .filter((item) => !specialties.some((s) => s.path === item.path))
    .map((item) => {
      const description = descriptionByPath.get(item.path);
      return `- [${item.label}](${url(item.path)})${description ? `: ${description}` : ''}`;
    });

  return {
    title: homeMeta.title,
    // Ten sam nagłówek co w HTML (twarda spacja zamieniona na zwykłą).
    h1: text(`${homeMeta.heading.lead} ${homeMeta.heading.accent}`),
    description: homeMeta.description,
    body: [
      text(homeLead),
      '',
      ...areas.flatMap((area) => [area, '']),
      '## Jak zacząć leczenie?',
      '',
      ...steps,
      '',
      '## Ceny konsultacji',
      '',
      '| Konsultacja | Cena |',
      '| --- | --- |',
      ...consultations,
      '',
      homeConsultationNote,
      '',
      `## ${homeOtherCare.title}`,
      '',
      homeOtherCare.text,
      '',
      `- [${homeOtherCare.linkLabel}](${url(homeOtherCare.path)})`,
      '',
      '## Informacje',
      '',
      ...info,
    ].join('\n'),
    path: '/',
  };
}

/** Cennik: tabele z danych (`price-list.json`) + nota z pliku strony. */
export async function priceMarkdown(): Promise<MarkdownPage> {
  const page = await getRequiredPage('cennik');
  const items = await getPriceItems();
  const sections = groupByCategory(items, priceCategories).map(({ category, items: rows }) => {
    const lines = rows.map(markdownRow);
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
