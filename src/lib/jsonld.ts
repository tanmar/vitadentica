import type { ClinicInfo } from './clinic';
import type { FaqItem } from './faq';
import type { PriceItem } from './price';

type JsonLd = Record<string, unknown>;

const LANGUAGE = 'pl-PL';

export interface DoctorInput {
  /** Stabilny slug (id wpisu w kolekcji `team`); buduje `@id` i kotwicę na stronie zespołu. */
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly image?: string;
}

const clinicId = (clinic: ClinicInfo) => `${clinic.url}/#clinic`;
const websiteId = (clinic: ClinicInfo) => `${clinic.url}/#website`;
const catalogId = (clinic: ClinicInfo) => `${clinic.url}/cennik#catalog`;
const catalogName = (clinic: ClinicInfo) => `Cennik – ${clinic.legalName}`;
const absoluteUrl = (clinic: ClinicInfo, path: string) => new URL(path, clinic.url).toString();
const physicianId = (clinic: ClinicInfo, doctor: DoctorInput) =>
  `${clinic.url}/nasz-zespol#physician-${doctor.id}`;

/**
 * Dentist (gabinet: tożsamość, adres, godziny, kontakt do rezerwacji). Lekarze to osobne encje, powiązane przez `member`.
 * Cennik wskazuje samodzielny stub `OfferCatalog` (pełny katalog jest na /cennik), więc odwołanie nie wisi w próżni.
 */
export function buildDentist(clinic: ClinicInfo, doctors: readonly DoctorInput[] = []): JsonLd {
  const { address } = clinic;
  const telephone = clinic.phone.href.replace('tel:', '');
  return {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    '@id': clinicId(clinic),
    name: clinic.name,
    alternateName: clinic.alternateName,
    legalName: clinic.legalName,
    description: clinic.description,
    url: clinic.url,
    image: absoluteUrl(clinic, clinic.image),
    logo: absoluteUrl(clinic, clinic.logo),
    foundingDate: String(clinic.foundingYear),
    telephone,
    email: clinic.email,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'reservations',
        telephone,
        email: clinic.email,
        availableLanguage: 'pl',
      },
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      postalCode: address.postalCode,
      addressLocality: address.city,
      addressRegion: address.region,
      addressCountry: address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: clinic.geo.lat,
      longitude: clinic.geo.lon,
    },
    hasMap: clinic.mapsUrl,
    areaServed: address.districts.map((name) => ({ '@type': 'Place', name })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      '@id': catalogId(clinic),
      name: catalogName(clinic),
      url: absoluteUrl(clinic, '/cennik'),
    },
    ...(clinic.sameAs.length > 0 && { sameAs: [...clinic.sameAs] }),
    ...(clinic.hours.length > 0 && {
      openingHoursSpecification: clinic.hours.map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [...h.days],
        opens: h.opens,
        closes: h.closes,
      })),
    }),
    ...(doctors.length > 0 && {
      member: doctors.map((d) => ({ '@id': physicianId(clinic, d) })),
    }),
  };
}

/**
 * Physician to podtyp MedicalBusiness/Organization, nie Person, więc nie wchodzi do
 * `employee` ani nie używa `worksFor`. Powiązanie z gabinetem: `parentOrganization`.
 */
export function buildPhysician(clinic: ClinicInfo, doctor: DoctorInput): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    '@id': physicianId(clinic, doctor),
    name: doctor.name,
    url: `${clinic.url}/nasz-zespol#team-${doctor.id}`,
    ...(doctor.description && { description: doctor.description }),
    ...(doctor.image && { image: new URL(doctor.image, clinic.url).toString() }),
    parentOrganization: { '@id': clinicId(clinic) },
  };
}

/** Gabinet + lekarze jako osobne bloki JSON-LD (do `<JsonLd data={...} />`). */
export function buildClinicGraph(clinic: ClinicInfo, doctors: readonly DoctorInput[]): JsonLd[] {
  return [buildDentist(clinic, doctors), ...doctors.map((d) => buildPhysician(clinic, d))];
}

/** Witryna jako całość; wydawcą jest gabinet. Dzięki niej strony łączą się w jeden graf, a nazwa marki ma stałe `@id`. */
export function buildWebSite(clinic: ClinicInfo): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(clinic),
    url: clinic.url,
    name: clinic.name,
    alternateName: clinic.alternateName,
    inLanguage: LANGUAGE,
    publisher: { '@id': clinicId(clinic) },
  };
}

/** Typ strony w schema.org: strony zabiegowe są medyczne, kontakt i zespół mają własne typy. */
export type PageKind = 'WebPage' | 'MedicalWebPage' | 'ContactPage' | 'AboutPage';

export interface PageInput {
  readonly title: string;
  readonly description: string;
  /** Ścieżka kanoniczna, np. `/implanty`; `/` dla strony głównej. */
  readonly path: string;
  readonly kind?: PageKind;
  /** Pytania i odpowiedzi widoczne na stronie (patrz `faqFromFrontmatter`). */
  readonly faq?: readonly FaqItem[];
}

/** Sama strona: adres, tytuł, opis, język oraz powiązanie z witryną i z gabinetem, którego dotyczy. */
export function buildWebPage(clinic: ClinicInfo, page: PageInput): JsonLd {
  const url = absoluteUrl(clinic, page.path);
  return {
    '@context': 'https://schema.org',
    '@type': page.kind ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: LANGUAGE,
    isPartOf: { '@id': websiteId(clinic) },
    about: { '@id': clinicId(clinic) },
  };
}

/** FAQPage z pytań widocznych na stronie; należy do węzła strony o tym samym adresie. */
export function buildFaqPage(clinic: ClinicInfo, path: string, items: readonly FaqItem[]): JsonLd {
  const url = absoluteUrl(clinic, path);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    url,
    inLanguage: LANGUAGE,
    isPartOf: { '@id': `${url}#webpage` },
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/**
 * Komplet bloków JSON-LD jednej strony: witryna, strona, ewentualne FAQ i gabinet, a do tego encje, które
 * podała strona (lekarze, cennik, okruszki). Gabinet jest zawsze, więc każde odwołanie `@id` rozwiązuje się
 * w obrębie dokumentu; jeśli strona dostarczyła go sama (z lekarzami), nie dublujemy go.
 */
export function buildPageGraph(
  clinic: ClinicInfo,
  page: PageInput,
  entities: readonly JsonLd[] = [],
): JsonLd[] {
  const hasClinic = entities.some((entity) => entity['@id'] === clinicId(clinic));
  return [
    buildWebSite(clinic),
    buildWebPage(clinic, page),
    ...(page.faq && page.faq.length > 0 ? [buildFaqPage(clinic, page.path, page.faq)] : []),
    ...(hasClinic ? [] : [buildDentist(clinic)]),
    ...entities,
  ];
}

export interface Crumb {
  readonly name: string;
  readonly path: string;
}

export function buildBreadcrumbs(clinic: ClinicInfo, crumbs: readonly Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: new URL(c.path, clinic.url).toString(),
    })),
  };
}

/** Serializacja bezpieczna dla <script>: ucieka `<`, żeby treść nie zamknęła tagu. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * Cennik jako OfferCatalog. Cena sztywna → `price`; zakres, „od …" lub cena za jednostkę →
 * `priceSpecification` (`minPrice`/`maxPrice`), żeby JSON-LD nie twierdził o dokładnej cenie.
 * `unitText` istnieje tylko w `UnitPriceSpecification`, więc cena za jednostkę dostaje ten typ
 * (dziedziczy `minPrice`/`maxPrice` po `PriceSpecification`).
 */
export function buildPriceCatalog(clinic: ClinicInfo, items: readonly PriceItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    '@id': catalogId(clinic),
    name: catalogName(clinic),
    url: absoluteUrl(clinic, '/cennik'),
    itemListElement: items.map((item) => {
      const needsSpecification = item.priceTo !== undefined || item.isFrom === true || item.unit;
      return {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: item.name },
        priceCurrency: 'PLN',
        ...(needsSpecification
          ? {
              priceSpecification: {
                '@type': item.unit ? 'UnitPriceSpecification' : 'PriceSpecification',
                priceCurrency: 'PLN',
                minPrice: item.price,
                ...(item.priceTo !== undefined && { maxPrice: item.priceTo }),
                ...(item.unit && { unitText: item.unit }),
              },
            }
          : { price: item.price }),
      };
    }),
  };
}
