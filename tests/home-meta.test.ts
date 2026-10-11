import { describe, expect, test } from 'vitest';
import { homeMeta } from '../src/data/home';
import { clinic } from '../src/lib/clinic';

/**
 * Strona główna nie jest w kolekcji treści (jej metadane są w kodzie), więc limity ze schematu kolekcji
 * (title ≤ 70, description ≤ 170 znaków) pilnujemy tutaj.
 */
describe('metadane strony głównej', () => {
  test('tytuł mieści się w limicie i nazywa miejsce oraz markę', () => {
    expect(homeMeta.title.length).toBeLessThanOrEqual(70);
    expect(homeMeta.title).toContain('Gocław');
    expect(homeMeta.title).toContain('Warszawa');
    expect(homeMeta.title).toContain(clinic.name);
  });

  test('opis mieści się w limicie i wskazuje kto i gdzie', () => {
    const { description } = homeMeta;
    expect(description.length).toBeLessThanOrEqual(170);
    expect(description).toContain(clinic.name);
    expect(description).toContain('Gocław');
    expect(description).toContain('Skalskiego');
  });

  test('nagłówek H1 nazywa usługę i miejsce, a nie jest samym hasłem', () => {
    const h1 = `${homeMeta.heading.lead} ${homeMeta.heading.accent}`;
    expect(h1).toMatch(/stomatolog/i);
    expect(h1).toMatch(/Gocław/i);
  });
});
