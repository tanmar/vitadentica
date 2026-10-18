/**
 * Treść strony głównej (HTML w `src/pages/index.astro` i wersja `.md` w `src/lib/page-markdown.ts` czytają stąd,
 * więc oba formaty mówią to samo). Limity metadanych (70 i 170 znaków) pilnują `tests/home-meta.test.ts` i `npm run verify`.
 * H1 nazywa dwie główne usługi i miejsce, a nie jest hasłem (decyzje 23 i 25 w docs/DECISIONS.md).
 */
export const homeMeta = {
  title: 'Implanty i ortodoncja Warszawa Gocław – Vitadentica',
  description:
    'Implanty zębowe i ortodoncja dzieci oraz dorosłych w Vitadentica. Warszawa, Gocław, ul. Skalskiego 3. Poznaj lekarzy, metody leczenia i cennik.',
  /** H1 w dwóch częściach: druga jest wyróżniona kolorem w hero (`<em>`). Twarda spacja po „na". */
  heading: { lead: 'Implanty i ortodoncja w Warszawie', accent: 'na\u00a0Gocławiu' },
} as const;

/** Nadtytuł nad H1: nazwa gabinetu i jego rodzaj, bo H1 mówi o dwóch usługach. */
export const homeEyebrow = 'Vitadentica · Gabinet stomatologiczny na Gocławiu';

/** Wstęp pod H1. Twarde spacje po jednoliterowych spójnikach i przed numerem domu. */
export const homeLead =
  'W\u00a0gabinecie Vitadentica przy ul.\u00a0Skalskiego\u00a03 prowadzimy leczenie implantologiczne oraz leczenie ortodontyczne dzieci i\u00a0dorosłych. Poznaj dostępne metody, lekarzy i\u00a0ceny konsultacji.';

export const homeCtaLabel = 'Zadzwoń i umów konsultację';

/** Dwa główne obszary leczenia. `doctorId` to id wpisu w kolekcji `team`; `path` musi być stroną usługi. */
export interface HomeArea {
  readonly id: 'implanty' | 'ortodoncja';
  readonly title: string;
  readonly text: string;
  readonly linkLabel: string;
  /** Krótka etykieta przy nagłówku (pigułka w hero). */
  readonly pillLabel: string;
  readonly path: '/implanty' | '/ortodoncja';
  readonly doctorId: string;
  /** Dodatkowy odnośnik do metody leczenia (Invisalign® to metoda ortodoncji, nie osobny filar oferty). */
  readonly extra?: { readonly label: string; readonly path: '/invisalign' };
}

export const homeAreas: readonly HomeArea[] = [
  {
    id: 'implanty',
    title: 'Implanty zębowe',
    text: 'Brakuje Ci jednego lub kilku zębów? Podczas konsultacji sprawdzimy możliwość odbudowy na implantach. Lekarz omówi potrzebną diagnostykę, a po kwalifikacji przedstawi plan leczenia i koszty poszczególnych etapów.',
    linkLabel: 'Sprawdź etapy i ceny leczenia implantami',
    pillLabel: 'Leczenie implantami',
    path: '/implanty',
    doctorId: 'radoslaw-zaniewicz',
  },
  {
    id: 'ortodoncja',
    title: 'Ortodoncja dzieci i dorosłych',
    text: 'Chcesz skonsultować ustawienie zębów lub zgryz dziecka? W Vitadentica prowadzimy leczenie aparatami stałymi, ruchomymi i nakładkami Invisalign®. Dobór metody poprzedza ocena zgryzu i potrzebnej dokumentacji.',
    linkLabel: 'Poznaj metody leczenia ortodontycznego',
    pillLabel: 'Leczenie ortodontyczne',
    path: '/ortodoncja',
    doctorId: 'monika-malek',
    extra: { label: 'Leczenie nakładkami Invisalign®', path: '/invisalign' },
  },
];

export interface HomeStep {
  readonly title: string;
  readonly text: string;
}

/** „Jak zacząć leczenie?": bez obietnicy wyceny ani planu przed diagnostyką. */
export const homeSteps: readonly HomeStep[] = [
  { title: 'Kontakt', text: 'Zadzwoń lub napisz e-mail. Ustalimy termin konsultacji.' },
  { title: 'Konsultacja', text: 'Lekarz ocenia Twoją sytuację i wyjaśnia dostępne możliwości leczenia.' },
  { title: 'Diagnostyka', text: 'W razie potrzeby lekarz wskazuje badania, które są potrzebne do zaplanowania leczenia.' },
  { title: 'Plan i koszty', text: 'Po kwalifikacji omawiasz plan leczenia, jego etapy i koszty. Decyzję o rozpoczęciu leczenia podejmujesz Ty.' },
];

/** Pozycje cennika pokazane jako „Ceny konsultacji" (id z `price-list.json`); osobno, bo każda dotyczy innego zakresu. */
export const homeConsultationPriceIds: readonly string[] = [
  'implanty-konsultacja',
  'ortodoncja-aparaty-stale-konsultacja-ortodontyczna-z-modelami',
  'ortodoncja-dziecieca-konsultacja-ortodontyczna',
];

export const homeConsultationNote =
  'Ceny według cennika. Zakres konsultacji i ewentualne dodatkowe badania ustala lekarz.';

export const homeOtherCare = {
  title: 'Pozostała opieka stomatologiczna',
  text: 'Poza implantami i ortodoncją prowadzimy ogólną opiekę stomatologiczną dorosłych i dzieci: leczenie zachowawcze, leczenie kanałowe pod mikroskopem, chirurgię stomatologiczną, protetykę i profilaktykę.',
  linkLabel: 'Zobacz pełną ofertę stomatologii ogólnej',
  path: '/stomatologia-ogolna',
} as const;
