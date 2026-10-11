import type { ClinicInfo } from './clinic';
import { formatAddress, formatHours } from './clinic';

export interface MarkdownPage {
  readonly title: string;
  readonly description: string;
  readonly h1?: string;
  readonly body: string;
  readonly path: string;
}

/**
 * Obrazy w treści wskazują na pliki źródłowe (`../../assets/...`), które nie istnieją pod żadnym
 * adresem w buildzie. W wersji `.md` zastępujemy je tekstem alternatywnym (np. cenami z banera).
 */
export function replaceImagesWithAlt(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt: string) =>
    alt.trim() ? `*${alt.trim()}*` : '',
  );
}

/** Wersja `.md` strony (GEO/AEO): czysty Markdown + dane kontaktowe na końcu. */
export function pageToMarkdown(page: MarkdownPage, clinic: ClinicInfo): string {
  const hours = formatHours(clinic.hours);
  const lines = [
    `# ${page.h1 ?? page.title}`,
    '',
    `> ${page.description}`,
    '',
    replaceImagesWithAlt(page.body).trim(),
    '',
    '---',
    '',
    `**${clinic.legalName}**`,
    '',
    `- Adres: ${formatAddress(clinic.address)}`,
    `- Telefon: ${clinic.phone.display}`,
    `- E-mail: ${clinic.email}`,
    ...(hours.length > 0 ? [`- Godziny otwarcia: ${hours.join('; ')}`] : []),
    `- Strona: ${new URL(page.path, clinic.url).toString()}`,
    '',
  ];
  return lines.join('\n');
}
