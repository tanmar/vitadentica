/**
 * Dane gabinetu (`clinicInfo`): jedno źródło dla stopki, kontaktu i JSON-LD.
 * Źródło: obecna strona vitadentica.pl (stan na 2026-10-11).
 */
import { siteUrl } from './site';
import type { GtmLoadMode } from '../scripts/gtm';

export interface OpeningHours {
  readonly days: readonly Weekday[];
  readonly opens: string;
  readonly closes: string;
}

export type Weekday =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface GeoPoint {
  readonly lat: number;
  readonly lon: number;
}

export interface ClinicInfo {
  readonly name: string;
  /** Drugi zapis nazwy używany na stronie (logo, treści); trafia do JSON-LD `alternateName`. */
  readonly alternateName: string;
  readonly legalName: string;
  /** Jedno zdanie o gabinecie: JSON-LD `description`, streszczenie w llms.txt i wstęp wersji `.md` strony głównej. */
  readonly description: string;
  readonly url: string;
  /** Rok rozpoczęcia działalności (strona zespołu: „funkcjonuje od 2013 roku"). */
  readonly foundingYear: number;
  /** Karta Open Graph (1200×630 px) i logo: ścieżki w `public/`, generuje je `scripts/generate-brand-images.mjs`. */
  readonly image: string;
  readonly logo: string;
  readonly phone: { readonly display: string; readonly href: string };
  readonly email: string;
  readonly address: {
    readonly street: string;
    /** Krótka forma na plakietce mapy (bez stopnia, imienia i numeru lokalu); każdy jej wyraz musi występować w `street`. */
    readonly streetShort: string;
    readonly postalCode: string;
    readonly city: string;
    /** Województwo (JSON-LD `addressRegion`). */
    readonly region: string;
    readonly country: string;
    readonly districts: readonly string[];
  };
  readonly hours: readonly OpeningHours[];
  readonly mapsUrl: string;
  /** Adresy profili, które jednoznacznie wskazują ten gabinet (JSON-LD `sameAs`): łączą stronę z wpisami w sieci. */
  readonly sameAs: readonly string[];
  /** Pin gabinetu (ten sam punkt co w `mapsUrl`); środek mapy dojazdu i `geo` w JSON-LD. */
  readonly geo: GeoPoint;
  readonly gtmId: string;
  /** Tag Google (GA4) ładowany bezpośrednio, spoza GTM. */
  readonly googleTagId: string;
  readonly gtmLoadMode: GtmLoadMode;
}

const MAPS_URL =
  'https://www.google.com/maps/place/Vitadentica/@52.2315565,21.0692277,14.65z/data=!4m5!3m4!1s0x471ecd9f46e5d109:0x9c66e3c712b22f8!8m2!3d52.2295672!4d21.0790837';

export const clinic: ClinicInfo = {
  name: 'Vitadentica',
  alternateName: 'VitaDentica',
  legalName: 'Gabinet stomatologiczny Vitadentica',
  description:
    'Gabinet stomatologiczny na Gocławiu w Warszawie dla dorosłych i dzieci: implantologia, ortodoncja, Invisalign® i stomatologia ogólna.',
  url: siteUrl,
  foundingYear: 2013,
  image: '/og-image.jpg',
  logo: '/logo.png',
  phone: { display: '(+48) 22 370 25 10', href: 'tel:+48223702510' },
  email: 'vitadentica@vitadentica.pl',
  address: {
    street: 'ul. Gen. Stanisława Skalskiego 3 lok U6',
    streetShort: 'ul. Skalskiego 3',
    postalCode: '03-982',
    city: 'Warszawa',
    region: 'mazowieckie',
    country: 'PL',
    districts: ['Gocław', 'Praga Południe', 'Saska Kępa'],
  },
  // TODO(potwierdzić): godziny z podstrony /kontakt/ obecnej witryny
  hours: [
    {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '10:00',
      closes: '20:00',
    },
  ],
  mapsUrl: MAPS_URL,
  // TODO(uzupełnić): Facebook, Instagram, ZnanyLekarz/Doctoralia. Im więcej oficjalnych profili, tym pewniej
  // wyszukiwarki i asystenci AI łączą dane z jednym gabinetem.
  sameAs: [MAPS_URL],
  geo: { lat: 52.2295672, lon: 21.0790837 },
  gtmId: 'GTM-P7RZV8S',
  // Nowy strumień danych GA4 (G-1NKMBBQSRJ), ładowany bezpośrednio za bramką zgód. Zastępuje tag Google
  // GT-TQRV5VC ze wtyczki Site Kit (stara właściwość G-N7440YS2RZ). Kontener GTM ma tylko wygaszone tagi
  // Universal Analytics (UA-106862785-1), więc to jest jedyny działający pomiar.
  googleTagId: 'G-1NKMBBQSRJ',
  // `consent`: GTM tylko po zgodzie (domyślnie, najbezpieczniej). `deferred`: zawsze, z opóźnieniem
  // (tryb Advanced: Google dostaje pingi bez cookies, lepsze modelowanie konwersji). Do decyzji właściciela.
  gtmLoadMode: 'consent',
};

const DAY_LABELS_PL: Record<Weekday, string> = {
  Monday: 'poniedziałek',
  Tuesday: 'wtorek',
  Wednesday: 'środa',
  Thursday: 'czwartek',
  Friday: 'piątek',
  Saturday: 'sobota',
  Sunday: 'niedziela',
};

const WEEK: readonly Weekday[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function isContiguous(days: readonly Weekday[]): boolean {
  const indexes = days.map((d) => WEEK.indexOf(d)).sort((a, b) => a - b);
  return indexes.every((value, i) => i === 0 || value === indexes[i - 1] + 1);
}

function formatDays(days: readonly Weekday[]): string {
  if (days.length === 1) return DAY_LABELS_PL[days[0]];
  const ordered = [...days].sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b));
  if (isContiguous(days)) {
    return `${DAY_LABELS_PL[ordered[0]]}–${DAY_LABELS_PL[ordered[ordered.length - 1]]}`;
  }
  return ordered.map((d) => DAY_LABELS_PL[d]).join(', ');
}

/** „poniedziałek–piątek, 10:00–20:00"; dni niesąsiednie wymienione po przecinku. */
export function formatHours(hours: readonly OpeningHours[]): string[] {
  return hours.map(({ days, opens, closes }) => `${formatDays(days)}, ${opens}–${closes}`);
}

/** Linki do wyznaczenia trasy w aplikacjach map (zwykłe odnośniki: CSP i brak skryptów firm trzecich bez zmian). */
export function directionsUrls(geo: GeoPoint): { readonly google: string; readonly apple: string } {
  const destination = `${geo.lat},${geo.lon}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    // bez trybu podróży: aplikacja użyje ostatnio wybranego przez użytkownika (auto, komunikacja, pieszo)
    apple: `https://maps.apple.com/?daddr=${destination}`,
  };
}

export function formatAddress(a: ClinicInfo['address']): string {
  return `${a.street}, ${a.postalCode} ${a.city}`;
}
