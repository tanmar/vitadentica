import { describe, expect, test } from 'vitest';
import { clinic } from '../src/lib/clinic';
import { buildLlmsFullTxt, buildLlmsTxt } from '../src/lib/llms';
import { pageToMarkdown, replaceImagesWithAlt } from '../src/lib/markdown';
import { AI_BOTS, buildRobotsTxt } from '../src/lib/robots';

describe('pageToMarkdown', () => {
  const page = { title: 'Implanty', description: 'Opis', body: 'Treść\n', path: '/implanty' };

  test('uses h1 when provided and falls back to title', () => {
    expect(pageToMarkdown(page, clinic)).toMatch(/^# Implanty\n/);
    expect(pageToMarkdown({ ...page, h1: 'Implanty Warszawa' }, clinic)).toMatch(/^# Implanty Warszawa\n/);
  });

  test('appends NAP and the canonical URL', () => {
    const md = pageToMarkdown(page, clinic);
    expect(md).toContain(clinic.phone.display);
    expect(md).toContain('https://vitadentica.pl/implanty');
  });
});

describe('replaceImagesWithAlt', () => {
  test('turns images into their alt text so prices in banners stay readable', () => {
    const md = 'A\n\n![Implant 2600 zł](../../assets/x.png)\n\nB';
    expect(replaceImagesWithAlt(md)).toBe('A\n\n*Implant 2600 zł*\n\nB');
  });

  test('drops images without alt text and leaves ordinary links alone', () => {
    expect(replaceImagesWithAlt('![](a.png) [link](/x)')).toBe(' [link](/x)');
  });
});

describe('buildLlmsTxt', () => {
  const sections = [
    { title: 'Oferta', links: [{ title: 'Implanty', path: '/implanty', description: 'Opis' }] },
    { title: 'Gabinet', links: [{ title: 'Start', path: '/' }] },
  ];
  const txt = buildLlmsTxt(clinic, sections);

  test('follows the llms.txt layout: H1, summary quote, facts, then H2 link sections', () => {
    const lines = txt.split('\n');
    expect(lines[0]).toBe(`# ${clinic.legalName}`);
    expect(lines[2]).toBe(`> ${clinic.description}`);
    const headings = lines.filter((l) => l.startsWith('## '));
    expect(headings).toEqual(['## Oferta', '## Gabinet', '## Optional']);
  });

  test('links each page to its .md variant, mapping / to /index.md', () => {
    expect(txt).toContain('[Start](https://vitadentica.pl/index.md)');
    expect(txt).toContain('[Implanty](https://vitadentica.pl/implanty.md): Opis');
  });

  test('states the facts an assistant needs: address, phone, e-mail, hours and how to book', () => {
    expect(txt).toContain('ul. Gen. Stanisława Skalskiego 3 lok U6, 03-982 Warszawa');
    expect(txt).toContain(clinic.phone.display);
    expect(txt).toContain(clinic.email);
    expect(txt).toContain('poniedziałek–piątek, 10:00–20:00');
    expect(txt).toMatch(/telefonicznie lub e-mailem/);
  });

  test('offers the whole site in one file as an optional resource', () => {
    const optional = txt.split('## Optional')[1];
    expect(optional).toContain('(https://vitadentica.pl/llms-full.txt)');
  });
});

describe('buildLlmsFullTxt', () => {
  const pages = [
    { title: 'Start', description: 'Opis startu', body: 'Treść startu', path: '/' },
    {
      title: 'Implanty',
      description: 'Opis implantów',
      h1: 'Implanty Warszawa',
      body: '## Cena\n\n![Implant 2600 zł](../../a.png)\n',
      path: '/implanty',
    },
  ];
  const txt = buildLlmsFullTxt(clinic, pages);

  test('puts every page in one document, each with its H1, description and source URL', () => {
    expect(txt).toContain('# Start\n');
    expect(txt).toContain('# Implanty Warszawa\n');
    expect(txt).toContain('Źródło: https://vitadentica.pl/\n');
    expect(txt).toContain('Źródło: https://vitadentica.pl/implanty\n');
    expect(txt).toContain('> Opis implantów');
  });

  test('repeats the clinic details once, not once per page', () => {
    expect(txt.split(clinic.phone.display)).toHaveLength(2);
  });

  test('replaces images with their alt text and leaves no source file paths', () => {
    expect(txt).toContain('*Implant 2600 zł*');
    expect(txt).not.toContain('../../');
  });

  describe('links and separators in a single-file document', () => {
    const doc = buildLlmsFullTxt(clinic, [
      {
        title: 'Ortodoncja',
        description: 'Opis',
        path: '/ortodoncja',
        body: [
          'Zobacz [kontakt](/kontakt), [sekcję](#ruchome-aparaty) i [telefon](tel:+48223702510).',
          'Pisz: [e-mail](mailto:a@b.pl) lub [strona](https://example.com/x).',
          '',
          '---',
          '',
          '[UMÓW WIZYTĘ](/kontakt)',
        ].join('\n'),
      },
      { title: 'Cennik', description: 'Opis', path: '/cennik', body: '| a | b |\n| --- | --- |\n| 1 | 2 |' },
    ]);

    test('turns site-relative links and anchors into absolute URLs', () => {
      expect(doc).toContain('[kontakt](https://vitadentica.pl/kontakt)');
      expect(doc).toContain('[sekcję](https://vitadentica.pl/ortodoncja#ruchome-aparaty)');
      expect(doc).toContain('[UMÓW WIZYTĘ](https://vitadentica.pl/kontakt)');
    });

    test('leaves tel:, mailto: and external links alone', () => {
      expect(doc).toContain('[telefon](tel:+48223702510)');
      expect(doc).toContain('[e-mail](mailto:a@b.pl)');
      expect(doc).toContain('[strona](https://example.com/x)');
    });

    test('uses --- only between pages, so splitting on it is safe (table rows are untouched)', () => {
      const separators = doc.split('\n').filter((line) => line.trim() === '---');
      expect(separators).toHaveLength(2);
      expect(doc).toContain('| --- | --- |');
    });
  });
});

describe('buildRobotsTxt', () => {
  test('blocks everything on staging', () => {
    expect(buildRobotsTxt({ staging: true, siteUrl: 'https://x.pages.dev' })).toContain('Disallow: /');
  });

  test('names the assistants that fetch pages on behalf of a user, not only the training crawlers', () => {
    const txt = buildRobotsTxt({ staging: false, siteUrl: 'https://vitadentica.pl' });
    for (const bot of ['ChatGPT-User', 'Claude-User', 'Perplexity-User', 'OAI-SearchBot', 'Claude-SearchBot']) {
      expect(txt).toContain(`User-agent: ${bot}\nAllow: /`);
    }
  });

  test('allows AI bots and lists the sitemap in production', () => {
    const txt = buildRobotsTxt({ staging: false, siteUrl: 'https://vitadentica.pl' });
    for (const bot of AI_BOTS) expect(txt).toContain(`User-agent: ${bot}\nAllow: /`);
    expect(txt).toContain('Sitemap: https://vitadentica.pl/sitemap-index.xml');
    expect(txt).not.toContain('Disallow: /\n');
  });
});
