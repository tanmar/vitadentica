import { describe, expect, test } from 'vitest';
import { faqFromFrontmatter } from '../src/lib/faq';

/**
 * Pytania wyciąga wtyczka rehype (tests/rehype-content.test.ts), a `faqFromFrontmatter` czyta wynik
 * z `remarkPluginFrontmatter` i pilnuje kształtu, żeby do JSON-LD nie trafiło nic zepsutego.
 */
describe('faqFromFrontmatter', () => {
  test('zwraca pytania i odpowiedzi w kolejności ze strony', () => {
    const items = faqFromFrontmatter({
      faq: [
        { question: 'Czy boli?', answer: 'Nie.' },
        { question: 'Ile trwa?', answer: '20 minut.' },
      ],
    });
    expect(items).toEqual([
      { question: 'Czy boli?', answer: 'Nie.' },
      { question: 'Ile trwa?', answer: '20 minut.' },
    ]);
  });

  test('brak pola faq oznacza stronę bez FAQ', () => {
    expect(faqFromFrontmatter({})).toEqual([]);
    expect(faqFromFrontmatter({ faq: undefined })).toEqual([]);
  });

  test('odrzuca elementy o złym kształcie lub z pustym tekstem', () => {
    const items = faqFromFrontmatter({
      faq: [
        null,
        'tekst',
        { question: 'Bez odpowiedzi?' },
        { question: '  ', answer: 'Pusta etykieta' },
        { question: 'Pusta odpowiedź?', answer: '   ' },
        { question: 'Liczba?', answer: 5 },
        { question: ' Dobre? ', answer: ' Tak. ' },
      ],
    });
    expect(items).toEqual([{ question: 'Dobre?', answer: 'Tak.' }]);
  });

  test('ignoruje pole faq, które nie jest tablicą', () => {
    expect(faqFromFrontmatter({ faq: 'nie tablica' })).toEqual([]);
    expect(faqFromFrontmatter({ faq: { question: 'Q?', answer: 'A.' } })).toEqual([]);
  });
});
