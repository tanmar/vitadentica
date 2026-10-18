import { readFileSync } from 'node:fs';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { describe, expect, test } from 'vitest';
import priceList from '../src/data/price-list.json';
import { formatPrice, type PriceItem } from '../src/lib/price';
import rehypeContent from '../src/plugins/rehype-content.mjs';
import rehypePrices from '../src/plugins/rehype-prices.mjs';

/**
 * Ten sam potok co w astro.config.mjs (rehype-prices przed rehype-content), uruchomiony na prawdziwym cenniku:
 * pilnuje, że kwoty z cennika trafiają i do HTML, i do FAQ w JSON-LD (`frontmatter.faq`).
 */
const render = async (markdown: string) => {
  const processor = await createMarkdownProcessor({ rehypePlugins: [rehypePrices, rehypeContent] });
  return processor.render(markdown, { frontmatter: {} });
};
const consultation = (priceList as PriceItem[]).find((item) => item.id === 'implanty-konsultacja')!;
const amount = formatPrice(consultation).replace(/ /g, ' ');

describe('potok Markdown: ceny i FAQ', () => {
  test('kwota ze znacznika {{cena}} jest w odpowiedzi FAQ przeznaczonej dla JSON-LD', async () => {
    const { metadata } = await render(
      '## Implanty - pytania i odpowiedzi\n\n### Ile kosztuje konsultacja?\n\nKonsultacja kosztuje {{cena: implanty-konsultacja}}.\n',
    );
    expect(metadata.frontmatter.faq).toEqual([
      { question: 'Ile kosztuje konsultacja?', answer: `Konsultacja kosztuje ${amount}.` },
    ]);
  });

  test('ta sama kwota jest w widocznym akordeonie, a po znaczniku nie zostaje ślad', async () => {
    const { code } = await render('## Implanty - pytania i odpowiedzi\n\n### Ile?\n\n{{cena: implanty-konsultacja}}\n');
    expect(code.replace(/ /g, ' ')).toContain(`<p>${amount}</p>`);
    expect(code).not.toContain('{{');
  });

  test('znacznik tabeli daje tabelę cen z nazwą i ceną pozycji', async () => {
    const { code } = await render('{{cennik: implanty-konsultacja}}\n');
    expect(code).toContain('<table class="cmp">');
    expect(code).toContain(consultation.name);
  });

  test.each([
    ['wielka litera w nazwie znacznika', '{{Cennik: implanty-konsultacja}}'],
    ['wielka litera w id', '{{cena: Implanty-konsultacja}}'],
    ['brak przecinka między id', '{{cennik: implanty-konsultacja implanty-konsultacja}}'],
    ['znacznik tabeli w elemencie listy', '- {{cennik: implanty-konsultacja}}'],
    ['znacznik tabeli w akapicie z innym tekstem', 'Ceny: {{cennik: implanty-konsultacja}}'],
  ])('przerywa build przy błędnym znaczniku: %s', async (_label, markdown) => {
    await expect(render(markdown)).rejects.toThrow(/znacznik|brak pozycji/i);
  });
});

describe('astro.config.mjs', () => {
  test('wtyczka cen działa przed wtyczką treści (inaczej FAQ w JSON-LD miałoby surowe znaczniki)', () => {
    const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
    const plugins = /rehypePlugins:\s*\[([^\]]*)\]/.exec(config)?.[1] ?? '';
    expect(plugins.indexOf('rehypePrices')).toBeGreaterThanOrEqual(0);
    expect(plugins.indexOf('rehypePrices')).toBeLessThan(plugins.indexOf('rehypeContent'));
  });
});
