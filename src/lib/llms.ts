import type { ClinicInfo } from './clinic';
import { formatAddress, formatHours } from './clinic';
import { replaceImagesWithAlt, type MarkdownPage } from './markdown';

export interface LlmsLink {
  readonly title: string;
  readonly path: string;
  readonly description?: string;
}

/** Grupa linków w llms.txt (nagłówek h2). */
export interface LlmsSection {
  readonly title: string;
  readonly links: readonly LlmsLink[];
}

const markdownUrl = (clinic: ClinicInfo, path: string): string =>
  new URL(`${path === '/' ? '/index' : path}.md`, clinic.url).toString();

const linkLine = (clinic: ClinicInfo, link: LlmsLink): string =>
  `- [${link.title}](${markdownUrl(clinic, link.path)})${link.description ? `: ${link.description}` : ''}`;

/**
 * Fakty, o które pytają asystenci (gdzie, kiedy, jak się umówić), w jednym miejscu dla llms.txt i llms-full.txt.
 * Brak formularza rezerwacji to decyzja nr 5 (docs/DECISIONS.md): agent nie powinien go szukać.
 */
function factLines(clinic: ClinicInfo): string[] {
  const hours = formatHours(clinic.hours);
  return [
    `- Adres: ${formatAddress(clinic.address)} (${clinic.address.districts.join(', ')})`,
    `- Telefon: ${clinic.phone.display}`,
    `- E-mail: ${clinic.email}`,
    ...(hours.length > 0 ? [`- Godziny otwarcia: ${hours.join('; ')}`] : []),
    '- Umówienie wizyty: telefonicznie lub e-mailem (bez formularza rezerwacji online)',
    `- Strona: ${clinic.url}`,
  ];
}

/**
 * llms.txt (llmstxt.org): H1 z nazwą, streszczenie w cytacie, fakty, potem sekcje linków do wersji `.md`.
 * Sekcja „Optional" wskazuje całość treści w jednym pliku (llms-full.txt).
 */
export function buildLlmsTxt(clinic: ClinicInfo, sections: readonly LlmsSection[]): string {
  return [
    `# ${clinic.legalName}`,
    '',
    `> ${clinic.description}`,
    '',
    ...factLines(clinic),
    '',
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      '',
      ...section.links.map((link) => linkLine(clinic, link)),
      '',
    ]),
    '## Optional',
    '',
    `- [Cała treść serwisu w jednym pliku](${new URL('/llms-full.txt', clinic.url)}): wszystkie strony w Markdown, do jednorazowego wczytania.`,
    '',
  ].join('\n');
}

/** Linia pozioma Markdown (`---`, `***`, `___`); wiersze tabel (`| --- |`) jej nie spełniają. */
const THEMATIC_BREAK = /^ {0,3}([-*_])( *\1){2,} *$/gm;

/**
 * W jednym pliku linki względne i kotwice tracą kontekst strony (kotwica wskazywałaby na llms-full.txt),
 * więc zamieniamy je na adresy bezwzględne. Linki `tel:`, `mailto:` i zewnętrzne zostają bez zmian.
 */
function absolutizeLinks(markdown: string, pageUrl: string, origin: string): string {
  return markdown
    .replace(/\]\((\/(?!\/)[^)\s]*)\)/g, (_match, path: string) => `](${new URL(path, origin)})`)
    .replace(/\]\((#[^)\s]*)\)/g, (_match, anchor: string) => `](${pageUrl}${anchor})`);
}

/**
 * llms-full.txt: cała treść serwisu w jednym dokumencie. Dane gabinetu są raz na początku (nie przy każdej
 * stronie), a każda strona ma nagłówek, adres źródłowy i opis. Separatorem stron jest `---`, dlatego linie
 * poziome z treści są pomijane (inaczej podział po `---` ucinałby strony w połowie).
 */
export function buildLlmsFullTxt(clinic: ClinicInfo, pages: readonly MarkdownPage[]): string {
  const header = [
    `# ${clinic.legalName}: pełna treść serwisu`,
    '',
    `> ${clinic.description}`,
    '',
    ...factLines(clinic),
    '',
  ];
  const sections = pages.flatMap((page) => {
    const pageUrl = new URL(page.path, clinic.url).toString();
    const body = replaceImagesWithAlt(page.body).replace(THEMATIC_BREAK, '');
    return [
      '---',
      '',
      `# ${page.h1 ?? page.title}`,
      '',
      `Źródło: ${pageUrl}`,
      '',
      `> ${page.description}`,
      '',
      absolutizeLinks(body, pageUrl, clinic.url).replace(/\n{3,}/g, '\n\n').trim(),
      '',
    ];
  });
  return [...header, ...sections].join('\n');
}
