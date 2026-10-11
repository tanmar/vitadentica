import { describe, expect, test } from 'vitest';
import { clinic, formatHours } from '../src/lib/clinic';
import {
  buildBreadcrumbs,
  buildClinicGraph,
  buildDentist,
  buildFaqPage,
  buildPageGraph,
  buildPhysician,
  buildPriceCatalog,
  buildWebPage,
  buildWebSite,
  serializeJsonLd,
} from '../src/lib/jsonld';

type Node = Record<string, any>;

/** Odwołania `{ "@id": … }` (jedyny klucz) muszą wskazywać encję zdefiniowaną w tym samym dokumencie (jak w scripts/check-dist.mjs). */
function unresolvedRefs(graph: readonly Node[]): string[] {
  const defined = new Set(graph.map((n) => n['@id']).filter(Boolean));
  const missing: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      const keys = Object.keys(node);
      const id = (node as Node)['@id'];
      if (keys.length === 1 && keys[0] === '@id' && !defined.has(id)) missing.push(id);
      Object.values(node).forEach(walk);
    }
  };
  graph.forEach(walk);
  return missing;
}

describe('buildDentist', () => {
  test('emits address and opening hours from clinic info', () => {
    const ld = buildDentist(clinic) as any;
    expect(ld['@type']).toBe('Dentist');
    expect(ld.address.postalCode).toBe('03-982');
    expect(ld.openingHoursSpecification[0].dayOfWeek).toHaveLength(5);
  });

  test('omits opening hours when none are defined', () => {
    const ld = buildDentist({ ...clinic, hours: [] });
    expect(ld).not.toHaveProperty('openingHoursSpecification');
  });

  test('references doctors through member, not employee', () => {
    const ld = buildDentist(clinic, [{ id: 'jan-kowalski', name: 'Jan Kowalski' }]) as any;
    expect(ld.member).toEqual([{ '@id': `${clinic.url}/nasz-zespol#physician-jan-kowalski` }]);
    expect(ld).not.toHaveProperty('employee');
  });
});

describe('buildDentist: tożsamość gabinetu', () => {
  const ld = buildDentist(clinic) as Node;

  test('describes the clinic in one sentence and names the alternate spelling', () => {
    expect(ld.description).toBe(clinic.description);
    expect(ld.alternateName).toBe('VitaDentica');
  });

  test('states when it was founded and in which region it is', () => {
    expect(ld.foundingDate).toBe('2013');
    expect(ld.address.addressRegion).toBe('mazowieckie');
  });

  test('exposes a booking contact point so an agent knows how to book', () => {
    expect(ld.contactPoint).toEqual([
      {
        '@type': 'ContactPoint',
        contactType: 'reservations',
        telephone: '+48223702510',
        email: clinic.email,
        availableLanguage: 'pl',
      },
    ]);
  });

  test('uses absolute URLs for the image, the logo and every external profile', () => {
    expect(ld.image).toBe('https://vitadentica.pl/og-image.jpg');
    expect(ld.logo).toBe('https://vitadentica.pl/logo.png');
    expect(ld.sameAs.length).toBeGreaterThan(0);
    for (const profile of ld.sameAs) expect(profile).toMatch(/^https:\/\//);
  });

  test('points to the price catalog with a self-contained stub (no dangling reference on other pages)', () => {
    expect(ld.hasOfferCatalog).toEqual({
      '@type': 'OfferCatalog',
      '@id': 'https://vitadentica.pl/cennik#catalog',
      name: `Cennik – ${clinic.legalName}`,
      url: 'https://vitadentica.pl/cennik',
    });
  });

  test('omits sameAs when there are no profiles', () => {
    expect(buildDentist({ ...clinic, sameAs: [] })).not.toHaveProperty('sameAs');
  });
});

describe('buildPhysician', () => {
  test('is a standalone Physician linked to the clinic via parentOrganization', () => {
    const ld = buildPhysician(clinic, {
      id: 'jan-kowalski',
      name: 'Jan Kowalski',
      description: 'Lekarz stomatolog',
    }) as any;
    expect(ld['@type']).toBe('Physician');
    expect(ld['@id']).toBe(`${clinic.url}/nasz-zespol#physician-jan-kowalski`);
    expect(ld.parentOrganization['@id']).toBe(`${clinic.url}/#clinic`);
    expect(ld.description).toBe('Lekarz stomatolog');
    expect(ld).not.toHaveProperty('worksFor');
  });

  test('resolves a relative image against the site origin', () => {
    const ld = buildPhysician(clinic, { id: 'a', name: 'A', image: '/_astro/a.webp' }) as any;
    expect(ld.image).toBe(`${clinic.url}/_astro/a.webp`);
  });
});

describe('buildClinicGraph', () => {
  test('returns the clinic followed by one Physician per doctor', () => {
    const graph = buildClinicGraph(clinic, [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]) as any[];
    expect(graph.map((n) => n['@type'])).toEqual(['Dentist', 'Physician', 'Physician']);
  });
});

describe('buildBreadcrumbs', () => {
  test('numbers items from 1 and resolves absolute URLs', () => {
    const ld = buildBreadcrumbs(clinic, [
      { name: 'Start', path: '/' },
      { name: 'Implanty', path: '/implanty' },
    ]) as any;
    expect(ld.itemListElement[1].position).toBe(2);
    expect(ld.itemListElement[1].item).toBe('https://vitadentica.pl/implanty');
  });
});

describe('serializeJsonLd', () => {
  test('escapes < so content cannot close the script tag', () => {
    expect(serializeJsonLd({ name: '</script><b>' })).not.toContain('<');
  });
});

describe('formatHours', () => {
  test('formats a weekday range in Polish', () => {
    expect(formatHours(clinic.hours)).toEqual(['poniedziałek–piątek, 10:00–20:00']);
  });

  test('lists non-contiguous days instead of pretending they are a range', () => {
    const hours = [{ days: ['Monday', 'Wednesday', 'Friday'] as const, opens: '09:00', closes: '15:00' }];
    expect(formatHours(hours)).toEqual(['poniedziałek, środa, piątek, 09:00–15:00']);
  });

  test('renders a single day without a dash', () => {
    const hours = [{ days: ['Saturday'] as const, opens: '09:00', closes: '13:00' }];
    expect(formatHours(hours)).toEqual(['sobota, 09:00–13:00']);
  });
});

describe('buildWebSite', () => {
  const ld = buildWebSite(clinic) as Node;

  test('is the Polish-language site published by the clinic', () => {
    expect(ld['@type']).toBe('WebSite');
    expect(ld['@id']).toBe('https://vitadentica.pl/#website');
    expect(ld.inLanguage).toBe('pl-PL');
    expect(ld.publisher).toEqual({ '@id': 'https://vitadentica.pl/#clinic' });
  });

  test('carries the brand name and its alternate spelling', () => {
    expect(ld.name).toBe('Vitadentica');
    expect(ld.alternateName).toBe('VitaDentica');
  });
});

describe('buildWebPage', () => {
  const page = { title: 'Implanty Warszawa', description: 'Opis', path: '/implanty' };

  test('identifies the page by its canonical URL and ties it to the site and the clinic', () => {
    const ld = buildWebPage(clinic, page) as Node;
    expect(ld['@type']).toBe('WebPage');
    expect(ld['@id']).toBe('https://vitadentica.pl/implanty#webpage');
    expect(ld.url).toBe('https://vitadentica.pl/implanty');
    expect(ld.name).toBe('Implanty Warszawa');
    expect(ld.description).toBe('Opis');
    expect(ld.inLanguage).toBe('pl-PL');
    expect(ld.isPartOf).toEqual({ '@id': 'https://vitadentica.pl/#website' });
    expect(ld.about).toEqual({ '@id': 'https://vitadentica.pl/#clinic' });
  });

  test('uses the home URL with a trailing slash for /', () => {
    const ld = buildWebPage(clinic, { ...page, path: '/' }) as Node;
    expect(ld.url).toBe('https://vitadentica.pl/');
    expect(ld['@id']).toBe('https://vitadentica.pl/#webpage');
  });

  test.each(['MedicalWebPage', 'ContactPage', 'AboutPage'] as const)('supports the %s type', (kind) => {
    expect((buildWebPage(clinic, { ...page, kind }) as Node)['@type']).toBe(kind);
  });
});

describe('buildFaqPage', () => {
  const items = [
    { question: 'Czy boli?', answer: 'Nie.' },
    { question: 'Ile trwa?', answer: 'Około 20 minut.' },
  ];
  const ld = buildFaqPage(clinic, '/implanty', items) as Node;

  test('emits Question/Answer pairs in page order', () => {
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toEqual([
      { '@type': 'Question', name: 'Czy boli?', acceptedAnswer: { '@type': 'Answer', text: 'Nie.' } },
      { '@type': 'Question', name: 'Ile trwa?', acceptedAnswer: { '@type': 'Answer', text: 'Około 20 minut.' } },
    ]);
  });

  test('belongs to the page node of the same URL', () => {
    expect(ld['@id']).toBe('https://vitadentica.pl/implanty#faq');
    expect(ld.isPartOf).toEqual({ '@id': 'https://vitadentica.pl/implanty#webpage' });
  });
});

describe('buildPageGraph', () => {
  const page = { title: 'Ortodoncja', description: 'Opis', path: '/ortodoncja' };
  const crumbs = buildBreadcrumbs(clinic, [
    { name: 'Vitadentica', path: '/' },
    { name: 'Ortodoncja', path: '/ortodoncja' },
  ]);
  const types = (graph: readonly Node[]) => graph.map((n) => n['@type']);

  test('always defines the site, the page and the clinic, so every reference resolves', () => {
    const graph = buildPageGraph(clinic, page, [crumbs]) as Node[];
    expect(types(graph)).toEqual(expect.arrayContaining(['WebSite', 'WebPage', 'Dentist', 'BreadcrumbList']));
    expect(unresolvedRefs(graph)).toEqual([]);
  });

  test('does not duplicate the clinic when the page already supplies it with its doctors', () => {
    const entities = buildClinicGraph(clinic, [{ id: 'a', name: 'A' }]);
    const graph = buildPageGraph(clinic, page, entities) as Node[];
    expect(types(graph).filter((t) => t === 'Dentist')).toHaveLength(1);
    expect(types(graph).filter((t) => t === 'Physician')).toHaveLength(1);
    expect(unresolvedRefs(graph)).toEqual([]);
  });

  test('adds a FAQPage only when the page has questions', () => {
    expect(types(buildPageGraph(clinic, page, []) as Node[])).not.toContain('FAQPage');
    const withFaq = buildPageGraph(clinic, { ...page, faq: [{ question: 'Q?', answer: 'A.' }] }, []) as Node[];
    expect(types(withFaq)).toContain('FAQPage');
    expect(unresolvedRefs(withFaq)).toEqual([]);
  });

  test('keeps the entities the page passed in', () => {
    const graph = buildPageGraph(clinic, page, [crumbs]) as Node[];
    expect(graph).toContain(crumbs);
  });
});

describe('buildPriceCatalog', () => {
  const offer = (item: Record<string, unknown>) =>
    (buildPriceCatalog(clinic, [{ id: 'x', order: 1, category: 'c', name: 'Usługa', price: 100, ...item }]) as Node)
      .itemListElement[0];

  test('a fixed price is a plain price', () => {
    expect(offer({})).toMatchObject({ price: 100, priceCurrency: 'PLN' });
    expect(offer({})).not.toHaveProperty('priceSpecification');
  });

  test('a range is a PriceSpecification with min and max', () => {
    expect(offer({ priceTo: 200 }).priceSpecification).toEqual({
      '@type': 'PriceSpecification',
      priceCurrency: 'PLN',
      minPrice: 100,
      maxPrice: 200,
    });
  });

  test('a price per unit uses UnitPriceSpecification, the only type that has unitText', () => {
    const spec = offer({ unit: 'strona' }).priceSpecification;
    expect(spec['@type']).toBe('UnitPriceSpecification');
    expect(spec.unitText).toBe('strona');
    expect(spec.minPrice).toBe(100);
  });

  test('has a stable @id that the clinic points to', () => {
    const ld = buildPriceCatalog(clinic, []) as Node;
    expect(ld['@id']).toBe('https://vitadentica.pl/cennik#catalog');
    expect((buildDentist(clinic) as Node).hasOfferCatalog['@id']).toBe(ld['@id']);
  });
});
