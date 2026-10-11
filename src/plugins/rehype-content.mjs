/**
 * Wzbogacenia treści z Markdowna (rehype):
 *  1. Sekcja „…pytania i odpowiedzi" / „FAQ…": każde h3 + treść do kolejnego h2 lub <hr>
 *     staje się <details class="fq"> (akordeon ze strony invisalign.html). Te same pytania i odpowiedzi
 *     trafiają do `file.data.astro.frontmatter.faq` (w Astro: `remarkPluginFrontmatter.faq`) i zasilają
 *     FAQPage w JSON-LD. Jeden parser, więc dane strukturalne zawsze zgadzają się z tym, co widać na stronie
 *     (tekst jest już po typografii, np. cudzysłowy drukarskie).
 *  2. Akapit złożony wyłącznie z linku dostaje klasę `cta-link` (przycisk).
 */
const FAQ_HEADING = /pytania i odpowiedzi|^faq\b/i;

const isElement = (node, tag) => node.type === 'element' && (tag ? node.tagName === tag : true);

export function textOf(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(textOf).join('');
}

/** Elementy, po których zaczyna się nowy „wiersz" tekstu (inaczej „a</li><li>b" sklejałoby się w „ab"). */
const BLOCK_TAGS = new Set([
  'p', 'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'br',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'hr', 'dl', 'dt', 'dd',
]);

function collectText(node, parts) {
  if (node.type === 'text') {
    parts.push(node.value);
    return;
  }
  const isBlock = node.type === 'element' && BLOCK_TAGS.has(node.tagName);
  if (isBlock) parts.push(' ');
  for (const child of node.children ?? []) collectText(child, parts);
  if (isBlock) parts.push(' ');
}

/** Tekst widoczny dla czytelnika: bez znaczników, elementy blokowe oddzielone spacją, białe znaki zwinięte. */
export function plainTextOf(node) {
  const parts = [];
  collectText(node, parts);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

function toDetails(question) {
  return {
    type: 'element',
    tagName: 'details',
    properties: { className: ['fq'] },
    children: [
      {
        type: 'element',
        tagName: 'summary',
        properties: {},
        children: [{ type: 'text', value: textOf(question).trim() }],
      },
      { type: 'element', tagName: 'div', properties: { className: ['fq__a'] }, children: [] },
    ],
  };
}

/** Zwraca węzły sekcji z pytaniami zamienionymi w akordeon oraz listę par pytanie–odpowiedź (z odpowiedzią). */
function groupQuestions(nodes) {
  const result = [];
  const questions = [];
  let current = null;
  for (const node of nodes) {
    if (isElement(node, 'h3')) {
      current = toDetails(node);
      result.push(current);
      questions.push(current);
    } else if (current && node.type === 'element') {
      current.children[1].children.push(node);
    } else if (!current || node.type !== 'text') {
      result.push(node);
    }
  }
  const items = questions
    .map((details) => ({
      question: plainTextOf(details.children[0]),
      answer: plainTextOf(details.children[1]),
    }))
    .filter((item) => item.question && item.answer);
  return { nodes: result, items };
}

function isLinkOnlyParagraph(node) {
  if (!isElement(node, 'p')) return false;
  const meaningful = node.children.filter((c) => !(c.type === 'text' && c.value.trim() === ''));
  return meaningful.length === 1 && isElement(meaningful[0], 'a');
}

export default function rehypeContent() {
  return (tree, file) => {
    const children = tree.children;
    const output = [];
    const faq = [];
    let i = 0;
    while (i < children.length) {
      const node = children[i];
      output.push(node);
      i += 1;
      if (!(isElement(node, 'h2') && FAQ_HEADING.test(textOf(node)))) continue;

      const section = [];
      while (i < children.length && !isElement(children[i], 'h2') && !isElement(children[i], 'hr')) {
        section.push(children[i]);
        i += 1;
      }
      const grouped = groupQuestions(section);
      output.push(...grouped.nodes);
      faq.push(...grouped.items);
    }

    for (const node of output) {
      if (isLinkOnlyParagraph(node)) {
        node.properties = { ...node.properties, className: [...(node.properties?.className ?? []), 'cta-link'] };
      }
    }
    tree.children = output;

    // `file.data.astro.frontmatter` istnieje w potoku Astro; w testach jednostkowych pliku może nie być.
    const frontmatter = file?.data?.astro?.frontmatter;
    if (frontmatter && faq.length > 0) frontmatter.faq = faq;
  };
}
