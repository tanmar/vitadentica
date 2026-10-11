/** Pytanie i odpowiedź z sekcji FAQ strony (źródło dla FAQPage w JSON-LD). */
export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

/**
 * Pytania wyciąga wtyczka rehype (`src/plugins/rehype-content.mjs`) z tego samego drzewa, z którego powstaje
 * akordeon, i zapisuje je w `remarkPluginFrontmatter.faq`. Tu tylko odczyt z kontrolą kształtu, żeby do
 * JSON-LD nie trafiło nic zepsutego ani puste.
 */
export function faqFromFrontmatter(frontmatter: Readonly<Record<string, unknown>>): FaqItem[] {
  const raw = frontmatter.faq;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): FaqItem[] => {
    if (typeof item !== 'object' || item === null) return [];
    const { question, answer } = item as Record<string, unknown>;
    if (typeof question !== 'string' || typeof answer !== 'string') return [];
    const q = question.trim();
    const a = answer.trim();
    return q && a ? [{ question: q, answer: a }] : [];
  });
}
