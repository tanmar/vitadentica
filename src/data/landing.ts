/**
 * Treść stron lądowania pod Google Ads: `/lp/implanty` i `/lp/ortodoncja` (szablon: `LandingPage.astro`).
 * Zasady te same co dla stron usług (decyzje 23 i 25 w docs/DECISIONS.md): informacja o zakresie i przebiegu leczenia,
 * bez gwarancji, superlatywów, presji terminów, statystyk i obrazów „przed i po". Fakty pochodzą ze stron
 * `src/content/pages/implanty.md` i `ortodoncja.md` oraz z kolekcji `team`; zmieniając je tam, zmień i tutaj.
 * Kolejność: najpierw doświadczenie i jakość (sekcja „Stawiamy na jakość” i lekarz), oferta i ceny niżej. Jakość
 * pokazujemy konkretami (specjalizacja, liczby z biogramu lekarza, systemy implantów), bez superlatywów; liczby muszą
 * występować w biogramie lekarza w `src/content/team/` (pilnuje tego test).
 * Kwoty wpisujemy wyłącznie jako `{{cena: id}}` (cennik: `src/data/price-list.json`); pilnuje tego `tests/landing-pages.test.ts`.
 */

/**
 * Wersja treści zgody i klauzuli w formularzu oddzwonienia (`LpCallback.astro`). Zmieniając treść, zmień datę tu
 * i w `CONSENT_VERSION` w public/api/callback.php (pilnuje tego tests/callback-form.test.ts).
 */
export const CALLBACK_CONSENT_VERSION = '2026-11-06';

export interface LandingCard {
  readonly title: string;
  readonly text: string;
}

export interface LandingCardsSection {
  readonly id: string;
  readonly kicker: string;
  readonly title: string;
  readonly intro?: string;
  readonly cards: readonly LandingCard[];
  readonly note?: string;
}

export interface LandingAudience {
  /** Wartość parametru `audience` w zdarzeniach GA4. */
  readonly id: 'dorosli' | 'dzieci';
  readonly title: string;
  readonly priceLabel: string;
  readonly priceId: string;
  readonly bullets: readonly string[];
  readonly ctaLabel: string;
}

export interface LandingHighlight {
  readonly title: string;
  readonly sub?: string;
  readonly priceId: string;
}

export interface LandingStat {
  /** Krótka wartość wyróżniona dużą czcionką, np. „ponad 8000”. */
  readonly value: string;
  readonly label: string;
}

export interface LandingFaqItem {
  readonly question: string;
  /** Akapity odpowiedzi. */
  readonly answer: readonly string[];
}

export interface LandingContent {
  /** Identyfikator strony w zdarzeniach GA4 (`lp_name`). */
  readonly lp: 'implanty' | 'ortodoncja';
  readonly meta: { readonly title: string; readonly description: string; readonly path: `/lp/${string}` };
  readonly hero: {
    readonly badge: string;
    readonly title: string;
    readonly accent: string;
    readonly lead: string;
    readonly ctaLabel: string;
    /** Link pod przyciskami do sekcji na tej stronie (zdarzenie `cta_click`). */
    readonly more: { readonly label: string; readonly href: `#${string}` };
    readonly facts: readonly string[];
    readonly art: 'implanty' | 'ortodoncja';
  };
  /** „Stawiamy na jakość”: liczby i fakty o doświadczeniu oraz karty z tym, co to znaczy w praktyce. */
  readonly quality: {
    readonly kicker: string;
    readonly title: string;
    readonly intro: string;
    readonly stats: readonly LandingStat[];
    readonly cards: readonly LandingCard[];
  };
  readonly audiences?: {
    readonly kicker: string;
    readonly title: string;
    readonly items: readonly LandingAudience[];
    readonly note: string;
  };
  readonly cardSections: readonly LandingCardsSection[];
  readonly steps: {
    readonly kicker: string;
    readonly title: string;
    readonly items: readonly LandingCard[];
    readonly note?: string;
  };
  readonly prices: {
    readonly kicker: string;
    readonly title: string;
    readonly intro: string;
    readonly highlights: readonly LandingHighlight[];
    readonly tableTitle: string;
    readonly tableIds: readonly string[];
    readonly note: string;
    readonly link: { readonly label: string; readonly href: string };
  };
  readonly doctor: {
    readonly id: string;
    readonly kicker: string;
    readonly title: string;
    readonly text: readonly string[];
  };
  readonly faq: { readonly title: string; readonly items: readonly LandingFaqItem[] };
  readonly contact: { readonly title: string; readonly text: string };
}

export const implantsLanding: LandingContent = {
  lp: 'implanty',
  meta: {
    title: 'Implanty zębowe Warszawa Gocław – konsultacja | Vitadentica',
    description:
      'Implanty zębowe na Gocławiu w Warszawie. Zabiegi wykonuje specjalista chirurgii stomatologicznej, ponad 8000 wszczepionych implantów. Zadzwoń i umów konsultację.',
    path: '/lp/implanty',
  },
  hero: {
    badge: 'Konsultacja implantologiczna · Gocław, Warszawa',
    title: 'Implanty zębowe w Warszawie',
    accent: 'na Gocławiu',
    lead: 'Implanty wszczepia u nas lek. dent. Radosław Zaniewicz, specjalista chirurgii stomatologicznej, który od 2009 r. wszczepił ponad 8000 implantów. Na konsultacji sprawdzi, czy odbudowa na implantach jest w Twoim przypadku możliwa, a po kwalifikacji przedstawi plan leczenia i koszty etapów.',
    ctaLabel: 'Zadzwoń i umów konsultację',
    more: { label: 'Poznaj lekarza i nasze podejście do leczenia', href: '#jakosc' },
    facts: ['Ponad 8000 wszczepionych implantów', 'Specjalista chirurgii stomatologicznej', 'Implanty Straumann i Bego'],
    art: 'implanty',
  },
  quality: {
    kicker: 'Dlaczego Vitadentica',
    title: 'Stawiamy na jakość',
    intro:
      'W implantologii o wyniku leczenia decydują doświadczenie lekarza, sprawdzone materiały i staranny plan. Na tych trzech rzeczach opieramy pracę gabinetu.',
    stats: [
      { value: 'ponad 8000', label: 'implantów wszczepionych przez lek. dent. Radosława Zaniewicza' },
      { value: 'od 2009 r.', label: 'zajmuje się implantologią' },
      { value: 'specjalista', label: 'chirurgii stomatologicznej, egzamin specjalizacyjny zdany w 2014 r.' },
    ],
    cards: [
      {
        title: 'Leczy specjalista i współwłaściciel',
        text: 'Implanty wszczepia lek. dent. Radosław Zaniewicz, specjalista chirurgii stomatologicznej i współwłaściciel gabinetu Vitadentica.',
      },
      {
        title: 'Implanty Straumann i Bego',
        text: 'Pracujemy na systemach dwóch uznanych producentów: szwajcarskiego Straumann i niemieckiego Bego. Wybór systemu lekarz omawia na konsultacji.',
      },
      {
        title: 'Plan i koszty przed startem',
        text: 'Po kwalifikacji dostajesz plan leczenia z kosztami poszczególnych etapów. Wiesz, na co się decydujesz, zanim zaczniemy.',
      },
      {
        title: 'Czas na rozmowę',
        text: 'Na konsultacji lekarz spokojnie wyjaśnia przebieg leczenia, odpowiada na pytania i dopasowuje plan do Twojej sytuacji.',
      },
    ],
  },
  cardSections: [
    {
      id: 'dla-kogo',
      kicker: 'Kiedy implant?',
      title: 'Kiedy można rozważyć implanty?',
      intro:
        'Implant to sztuczny korzeń zęba wszczepiany w kość. Czy jest dla Ciebie odpowiednim rozwiązaniem, ocenia lekarz po badaniu. Na konsultacji można też porozmawiać o innych sposobach uzupełnienia braków, takich jak most na zębach własnych lub proteza.',
      cards: [
        {
          title: 'Brak jednego zęba',
          text: 'Na implancie można oprzeć koronę w miejscu pojedynczego zęba.',
        },
        {
          title: 'Kilka brakujących zębów',
          text: 'Przy kilku sąsiadujących brakach nie zawsze trzeba wszczepiać tyle implantów, ile zębów brakuje. Liczbę i rozmieszczenie implantów ustala lekarz w planie leczenia.',
        },
        {
          title: 'Brak wszystkich zębów',
          text: 'W bezzębnej szczęce lub żuchwie możliwa jest proteza całkowita mocowana na implantach albo stała odbudowa na mostach.',
        },
        {
          title: 'Za mało kości?',
          text: 'Gdy kości jest za mało, lekarz może zaproponować jej odbudowę albo inne rozwiązanie. Zabiegi dodatkowe, takie jak podniesienie dna zatoki szczękowej, mają osobne ceny.',
        },
      ],
    },
  ],
  steps: {
    kicker: 'Przebieg leczenia',
    title: 'Jak wygląda leczenie implantem?',
    items: [
      {
        title: 'Konsultacja i diagnostyka',
        text: 'Lekarz ocenia możliwość leczenia i wskazuje potrzebne badania. Po kwalifikacji przedstawia plan leczenia oraz koszty etapów.',
      },
      {
        title: 'Wszczepienie implantu',
        text: 'Zabieg wykonuje się w znieczuleniu miejscowym. Wszczepienie pojedynczego implantu trwa zwykle około 15–20 minut, przy większej liczbie implantów dłużej.',
      },
      {
        title: 'Gojenie',
        text: 'Implant wrasta w kość (osteointegracja). Zwykle trwa to około 3 miesięcy w żuchwie i około 5 miesięcy w szczęce.',
      },
      {
        title: 'Odbudowa protetyczna',
        text: 'Po wygojeniu zakłada się śrubę gojącą na około 2 tygodnie, pobiera się wyciski, a po około 2 tygodniach można założyć koronę.',
      },
    ],
    note: 'Podane czasy są orientacyjne i zależą od przypadku. Łącznie od wszczepienia implantu do założenia korony mija zwykle około 4 miesięcy w żuchwie i około 6 miesięcy w szczęce.',
  },
  prices: {
    kicker: 'Cennik',
    title: 'Ile kosztuje leczenie implantem?',
    intro:
      'Wszczepienie implantu (etap chirurgiczny) i korona (odbudowa zęba) to osobne pozycje cennika. Porównując ceny, sprawdź, czy dotyczą samego implantu, czy całej odbudowy zęba.',
    highlights: [
      { title: 'Konsultacja implantologiczna', sub: 'Pierwszy krok leczenia', priceId: 'implanty-konsultacja' },
      {
        title: 'Odbudowa jednego zęba, system Bego',
        sub: 'Łączny koszt: implant z koroną',
        priceId: 'implanty-koszt-calkowity-bego',
      },
      {
        title: 'Odbudowa jednego zęba, system Straumann',
        sub: 'Łączny koszt: implant z koroną',
        priceId: 'implanty-koszt-calkowity-straumann',
      },
    ],
    tableTitle: 'Etapy osobno',
    tableIds: [
      'implanty-wszczepienie-implantu-bego',
      'implanty-korona-porcelanowa-na-podbudowie-metalowej-na-implancie-bego',
      'implanty-korona-pelnoceramiczna-na-implancie-bego',
      'implanty-wszczepienie-implantu-straumann',
      'implanty-korona-porcelanowa-na-podbudowie-metalowej-straumann',
    ],
    note: 'Ceny według cennika mają charakter informacyjny. Zakres łącznego kosztu, na przykład badania, odbudowę tymczasową, kontrole czy zabiegi dodatkowe, takie jak odbudowa kości, potwierdzamy podczas konsultacji. Lekarz przedstawia pełne koszty po kwalifikacji, przed rozpoczęciem leczenia.',
    link: { label: 'Zobacz pełny cennik implantów', href: '/cennik#implanty' },
  },
  doctor: {
    id: 'radoslaw-zaniewicz',
    kicker: 'Lekarz prowadzący',
    title: 'Kto wykonuje zabiegi?',
    text: [
      'Lek. dent. Radosław Zaniewicz ukończył Warszawski Uniwersytet Medyczny w 2007 r., a w 2014 r. zdał Państwowy Egzamin Specjalizacyjny z chirurgii stomatologicznej. Implantologią zajmuje się od 2009 r. i wszczepił ponad 8000 implantów.',
      'Należy do Polskiego Towarzystwa Stomatologicznego oraz Ogólnopolskiego Stowarzyszenia Implantologii Stomatologicznej i stale się szkoli na warsztatach i sympozjach w Polsce i za granicą.',
    ],
  },
  faq: {
    title: 'Implanty: pytania i odpowiedzi',
    items: [
      {
        question: 'Ile kosztuje odbudowa jednego zęba na implancie i co obejmuje cena?',
        answer: [
          'W cenniku łączny koszt odbudowy pojedynczego braku zębowego na implancie wynosi {{cena: implanty-koszt-calkowity-bego}} w systemie Bego i {{cena: implanty-koszt-calkowity-straumann}} w systemie Straumann. Wszczepienie implantu i korona są też wycenione osobno.',
          'Zakres tych kwot, na przykład badania, odbudowę tymczasową, kontrole i zabiegi dodatkowe, potwierdzamy podczas konsultacji, a pełne koszty lekarz przedstawia po kwalifikacji, przed rozpoczęciem leczenia.',
        ],
      },
      {
        question: 'Czy w mojej sytuacji można zastosować implant?',
        answer: [
          'To zależy od stanu uzębienia, ilości kości i ogólnego stanu zdrowia, a ocenia to lekarz podczas konsultacji. Jeśli kości jest za mało, można rozważyć jej odbudowę albo inne rozwiązanie, na przykład protezę mocowaną na implantach.',
        ],
      },
      {
        question: 'Czy wszczepienie implantu boli?',
        answer: [
          'Zabieg wykonuje się w znieczuleniu miejscowym, którego celem jest uniknięcie bólu podczas zabiegu. Po ustaniu znieczulenia mogą pojawić się ból, obrzęk lub tkliwość. Ich nasilenie jest indywidualne i zwykle zmniejsza się w ciągu kilku dni.',
          'Lekarz omawia zalecenia po zabiegu oraz leki łagodzące dolegliwości. O uczuleniach na leki poinformuj lekarza przed zabiegiem.',
        ],
      },
      {
        question: 'Jak długo trwa leczenie od wszczepienia implantu do założenia korony?',
        answer: [
          'Po wszczepieniu implantu zwykle odczekuje się około 3 miesięcy w żuchwie i około 5 miesięcy w szczęce, aż implant zrośnie się z kością. Następnie zakłada się śrubę gojącą na około 2 tygodnie, pobiera wyciski, a po około 2 tygodniach można założyć koronę. Łącznie daje to około 4 miesięcy w żuchwie i około 6 miesięcy w szczęce. Dokładny harmonogram zależy od przypadku.',
        ],
      },
      {
        question: 'Złamany ząb jest do usunięcia. Czy przez okres gojenia będę bez zęba?',
        answer: [
          'To zależy od miejsca braku i planu leczenia. Na czas gojenia implantu lekarz może zaproponować uzupełnienie tymczasowe, na przykład koronę tymczasową. Czy i jakie rozwiązanie jest możliwe w Twoim przypadku, omówisz na konsultacji.',
        ],
      },
      {
        question: 'Inny lekarz powiedział, że mam za mało kości na implant. Czy jest na to jakaś rada?',
        answer: [
          'Przy niedoborze kości można rozważyć jej odbudowę z użyciem kości własnej lub jej substytutów. Gdy zaniki są znaczne, a ryzyko niepowodzenia odbudowy kości duże, lekarz może zaproponować protezę typu overdenture, czyli protezę całkowitą mocowaną na implantach. Wybór rozwiązania zależy od badania.',
        ],
      },
      {
        question: 'Czy leczenie implantologiczne można rozłożyć w czasie?',
        answer: [
          'Leczenie przebiega w etapach rozłożonych na kilka miesięcy. Terminy kolejnych etapów lekarz ustala wspólnie z pacjentem, także z uwzględnieniem jego możliwości finansowych.',
        ],
      },
      {
        question: 'Czy po zabiegu mogę wrócić do pracy?',
        answer: [
          'Zależy to od rodzaju pracy i zakresu zabiegu; lekarz ustala to indywidualnie. Przy pracy fizycznej lub wymagającej bezpośredniego kontaktu z ludźmi warto zaplanować kilka dni przerwy.',
        ],
      },
    ],
  },
  contact: {
    title: 'Umów konsultację implantologiczną',
    text: 'Zadzwoń, napisz e-mail albo zostaw kontakt, a oddzwonimy. Lekarz oceni Twoją sytuację i wyjaśni dostępne możliwości leczenia.',
  },
};

export const orthodonticsLanding: LandingContent = {
  lp: 'ortodoncja',
  meta: {
    title: 'Ortodoncja Warszawa Gocław – dzieci i dorośli | Vitadentica',
    description:
      'Ortodoncja dzieci i dorosłych na Gocławiu w Warszawie. Ponad 2000 zakończonych leczeń, aparaty stałe, ruchome i Invisalign®. Zadzwoń i umów konsultację.',
    path: '/lp/ortodoncja',
  },
  hero: {
    badge: 'Konsultacja ortodontyczna · Gocław, Warszawa',
    title: 'Ortodoncja dzieci i dorosłych',
    accent: 'w Warszawie na Gocławiu',
    lead: 'Leczenie prowadzi lek. dent. Monika Małek, która ma za sobą ponad 2000 zakończonych leczeń ortodontycznych. Na konsultacji oceni zgryz Twój lub Twojego dziecka, ustali dalszą diagnostykę, a potem zaproponuje metodę: aparat stały, ruchomy albo nakładki Invisalign®.',
    ctaLabel: 'Zadzwoń i umów konsultację',
    more: { label: 'Poznaj lekarza i nasze podejście do leczenia', href: '#jakosc' },
    facts: ['Ponad 2000 zakończonych leczeń', 'Dzieci i dorośli', 'Aparaty stałe, ruchome i Invisalign®'],
    art: 'ortodoncja',
  },
  quality: {
    kicker: 'Dlaczego Vitadentica',
    title: 'Stawiamy na jakość',
    intro:
      'Leczenie ortodontyczne rozkłada się zwykle na wiele miesięcy, dlatego liczą się doświadczenie lekarza, staranna diagnostyka i stała opieka na wizytach kontrolnych. Na tym opieramy pracę gabinetu.',
    stats: [
      { value: 'ponad 2000', label: 'pacjentów z zakończonym leczeniem ortodontycznym' },
      { value: '3 metody', label: 'aparaty stałe, ruchome i nakładki Invisalign®' },
      { value: 'PL · EN · RU', label: 'konsultacje po polsku, angielsku i rosyjsku' },
    ],
    cards: [
      {
        title: 'Leczy współwłaścicielka gabinetu',
        text: 'Leczenie ortodontyczne prowadzi lek. dent. Monika Małek, współwłaścicielka gabinetu Vitadentica.',
      },
      {
        title: 'Metoda dobrana po badaniu',
        text: 'Aparat stały, ruchomy czy nakładki Invisalign®: metodę lekarz dobiera po badaniu i diagnostyce, a nie z góry.',
      },
      {
        title: 'Plan i koszty przed startem',
        text: 'Plan leczenia powstaje na podstawie zdjęć i modeli zgryzu. Lekarz omawia go razem z kosztami przed rozpoczęciem leczenia.',
      },
      {
        title: 'Dzieci i dorośli',
        text: 'Leczymy dzieci, od pierwszego badania około 3. roku życia, i dorosłych, także w starszym wieku.',
      },
    ],
  },
  audiences: {
    kicker: 'Dla kogo?',
    title: 'Wybierz konsultację',
    items: [
      {
        id: 'dorosli',
        title: 'Dla dorosłych',
        priceLabel: 'Konsultacja ortodontyczna z modelami',
        priceId: 'ortodoncja-aparaty-stale-konsultacja-ortodontyczna-z-modelami',
        bullets: [
          'Aparaty stałe: metalowe, metalowe samoligaturujące i estetyczne kryształowe.',
          'Nakładki Invisalign® w przypadkach, w których lekarz uzna je za odpowiednie.',
          'Leczenie także w starszym wieku; możliwości zależą od stanu zębów i tkanek wokół nich.',
        ],
        ctaLabel: 'Umów konsultację dla dorosłych',
      },
      {
        id: 'dzieci',
        title: 'Dla dziecka',
        priceLabel: 'Konsultacja ortodontyczna',
        priceId: 'ortodoncja-dziecieca-konsultacja-ortodontyczna',
        bullets: [
          'Pierwsze badanie zalecamy około 3. roku życia.',
          'Aparaty ruchome stosuje się we wczesnym leczeniu wad zgryzu, zwykle od około 6–8 lat.',
          'Aparaty stałe stosuje się najczęściej po 12. roku życia.',
        ],
        ctaLabel: 'Umów konsultację dla dziecka',
      },
    ],
    note: 'Konsultacje różnią się zakresem i ceną. W razie wątpliwości, która dotyczy Twojej sytuacji, zapytaj przy umawianiu wizyty.',
  },
  cardSections: [
    {
      id: 'powody',
      kicker: 'Konsultacja',
      title: 'Z czym zgłosić się na konsultację?',
      cards: [
        { title: 'Zęby stłoczone lub nierówne', text: 'Zęby ustawione nierówno, stłoczone albo z przerwami między nimi.' },
        {
          title: 'Ząb, który nie wyrósł',
          text: 'Ząb może tkwić w kości. Jego położenie lekarz ocenia na zdjęciach rentgenowskich, a niekiedy na obrazach tomografii komputerowej.',
        },
        {
          title: 'Braki zębowe',
          text: 'Przed odbudową protetyczną lub implantami warto czasem ustawić zęby własne. Kolejność leczenia ustala lekarz.',
        },
        {
          title: 'Nawyki dziecka',
          text: 'Ssanie smoczka lub palca albo nieprawidłowe oddychanie mogą w przyszłości prowadzić do wady zgryzu.',
        },
        {
          title: 'Ocena zgryzu dziecka',
          text: 'Wczesna diagnostyka pozwala zaplanować leczenie we właściwym momencie rozwoju.',
        },
      ],
    },
    {
      id: 'metody',
      kicker: 'Metody leczenia',
      title: 'Aparat stały, ruchomy czy nakładki?',
      intro:
        'Wybór metody zależy od rodzaju wady zgryzu, wieku, oczekiwań i możliwości współpracy pacjenta. Żadna z metod nie jest właściwa dla wszystkich, dlatego decyzję poprzedza badanie.',
      cards: [
        {
          title: 'Aparaty stałe',
          text: 'Przyklejone do zębów: metalowe, metalowe samoligaturujące i estetyczne kryształowe. Stosuje się je najczęściej po 12. roku życia, leczymy nimi także dorosłych. Wymagają starannej higieny wokół zamków i łuków.',
        },
        {
          title: 'Aparaty ruchome',
          text: 'Wyjmowane aparaty, najczęściej akrylowe płytki, stosowane we wczesnym leczeniu wad zgryzu. Dzieci noszą je zwykle w nocy oraz przez około 2–3 godziny w ciągu dnia.',
        },
        {
          title: 'Nakładki Invisalign®',
          text: 'Przezroczyste, zdejmowane nakładki wykonane indywidualnie na podstawie cyfrowego planu leczenia. Skuteczność zależy od systematycznego noszenia, zwykle przez 20–22 godziny na dobę. Nie każdy przypadek się nadaje; decyduje lekarz po badaniu.',
        },
      ],
    },
  ],
  steps: {
    kicker: 'Pierwsza wizyta',
    title: 'Jak wygląda leczenie ortodontyczne?',
    items: [
      {
        title: 'Konsultacja',
        text: 'Lekarz ocenia zgryz i ustala, jaka dokumentacja diagnostyczna jest potrzebna.',
      },
      {
        title: 'Diagnostyka',
        text: 'Wybór aparatu oraz ewentualną konieczność usuwania zębów lekarz omawia po analizie zdjęcia cefalometrycznego i diagnostycznych modeli gipsowych. Czasem potrzebne są też zdjęcia rentgenowskie lub tomografia.',
      },
      {
        title: 'Plan leczenia',
        text: 'Czas leczenia zależy między innymi od rodzaju wady zgryzu, wybranej metody, wieku pacjenta oraz regularności wizyt i współpracy podczas leczenia.',
      },
      {
        title: 'Kontrole i retencja',
        text: 'Częstotliwość kontroli ustala lekarz; przy aparatach stałych wizyty odbywają się zwykle co kilka tygodni. Po leczeniu stosuje się retencję, czyli aparaty utrzymujące uzyskane ustawienie zębów.',
      },
    ],
  },
  prices: {
    kicker: 'Cennik',
    title: 'Ile kosztuje leczenie ortodontyczne?',
    intro:
      'Cennik podaje osobno ceny konsultacji i aparatów. Ceny aparatów stałych dotyczą jednego łuku zębowego, górnego albo dolnego.',
    highlights: [
      {
        title: 'Konsultacja dla dorosłych',
        sub: 'Konsultacja ortodontyczna z modelami',
        priceId: 'ortodoncja-aparaty-stale-konsultacja-ortodontyczna-z-modelami',
      },
      {
        title: 'Konsultacja dla dziecka',
        sub: 'Konsultacja ortodontyczna',
        priceId: 'ortodoncja-dziecieca-konsultacja-ortodontyczna',
      },
      { title: 'Aparat ruchomy dla dzieci', sub: 'Cena zależy od rodzaju aparatu', priceId: 'ortodoncja-dziecieca-aparat-ruchomy' },
    ],
    tableTitle: 'Aparaty stałe (cena za jeden łuk)',
    tableIds: [
      'ortodoncja-aparaty-stale-aparat-staly-metalowy-1-luk',
      'ortodoncja-aparaty-stale-aparat-staly-metalowy-samoligaturujacy-1-luk',
      'ortodoncja-aparaty-stale-aparat-staly-krysztalowy-1-luk',
    ],
    note: 'Ceny według cennika mają charakter informacyjny. Cennik nie podaje osobnych cen wizyt kontrolnych, zakończenia leczenia ani retencji; czy są wliczone w cenę aparatu i jakie mogą być koszty dodatkowe, lekarz wyjaśnia w planie leczenia, przed jego rozpoczęciem. Koszt leczenia nakładkami Invisalign® zależy od złożoności przypadku i liczby nakładek, a wycenę przygotowujemy indywidualnie po konsultacji i diagnostyce.',
    link: { label: 'Zobacz pełny cennik ortodoncji', href: '/cennik#ortodoncja-aparaty-stale' },
  },
  doctor: {
    id: 'monika-malek',
    kicker: 'Lekarz prowadzący',
    title: 'Kto prowadzi leczenie?',
    text: [
      'Leczenie ortodontyczne prowadzi lek. dent. Monika Małek, absolwentka Warszawskiego Uniwersytetu Medycznego (2001 r.). W swoim dorobku ma ponad 2000 pacjentów, u których leczenie zostało już zakończone.',
      'Regularnie uczestniczy w szkoleniach i konferencjach w Polsce i za granicą. Z pacjentami porozumiewa się po polsku, angielsku i rosyjsku.',
    ],
  },
  faq: {
    title: 'Ortodoncja: pytania i odpowiedzi',
    items: [
      {
        question: 'Kiedy zgłosić się z dzieckiem na pierwsze badanie ortodontyczne?',
        answer: [
          'Zalecamy pierwsze badanie około 3. roku życia. Rodzic nie zawsze zauważy, że w jamie ustnej dziecka coś odbiega od normy. Trzylatek jest zwykle na tyle rozwinięty, że w razie potrzeby można wprowadzić z nim proste ćwiczenia lub łatwe w użyciu aparaty ruchome.',
          'Jeśli zgryz jest prawidłowy, kolejne wizyty zaleca się zwykle około 5–6. i 11–12. roku życia. Termin kolejnych badań ustala lekarz po ocenie zgryzu.',
        ],
      },
      {
        question: 'Czy leczenie ortodontyczne można rozpocząć w dorosłym wieku?',
        answer: [
          'Tak. Prowadzimy leczenie ortodontyczne także u dorosłych, również w starszym wieku. Możliwości zależą od stanu zębów i tkanek wokół nich, co lekarz ocenia podczas konsultacji.',
        ],
      },
      {
        question: 'Aparat stały czy nakładki?',
        answer: [
          'Wybór zależy od rodzaju wady zgryzu, wieku, oczekiwań i współpracy pacjenta. Nakładki Invisalign® są zdejmowane i mniej widoczne, ale wymagają noszenia przez większą część doby, zwykle 20–22 godziny, a bez systematyczności leczenie się wydłuża lub nie przynosi oczekiwanego efektu.',
          'Aparat stały jest przyklejony do zębów, więc jego noszenie nie zależy od codziennej decyzji pacjenta, ale wymaga starannej higieny wokół zamków i łuków. Nie każdą wadę da się leczyć każdą metodą, dlatego wybór poprzedza badanie.',
        ],
      },
      {
        question: 'Co obejmuje koszt leczenia ortodontycznego?',
        answer: [
          'Cennik podaje ceny konsultacji: ortodontycznej z modelami {{cena: ortodoncja-aparaty-stale-konsultacja-ortodontyczna-z-modelami}} oraz konsultacji ortodontycznej w ortodoncji dziecięcej {{cena: ortodoncja-dziecieca-konsultacja-ortodontyczna}}. Aparaty stałe wycenione są za jeden łuk: metalowy {{cena: ortodoncja-aparaty-stale-aparat-staly-metalowy-1-luk}}, metalowy samoligaturujący {{cena: ortodoncja-aparaty-stale-aparat-staly-metalowy-samoligaturujacy-1-luk}}, kryształowy {{cena: ortodoncja-aparaty-stale-aparat-staly-krysztalowy-1-luk}}. Aparat ruchomy dla dzieci kosztuje {{cena: ortodoncja-dziecieca-aparat-ruchomy}}.',
          'Czy kontrole, zakończenie leczenia i retencja są wliczone w cenę aparatu, lekarz wyjaśnia w planie leczenia.',
        ],
      },
      {
        question: 'Jak często odbywają się kontrole?',
        answer: [
          'Częstotliwość kontroli zależy od rodzaju aparatu i etapu leczenia i ustala ją lekarz. Przy aparatach stałych wizyty odbywają się zwykle co kilka tygodni. Zbyt rzadkie kontrole mogą wydłużać leczenie.',
        ],
      },
      {
        question: 'Czy aparat ortodontyczny może powodować dyskomfort lub ból?',
        answer: [
          'Tak, może. Na początku leczenia oraz po regulacji aparatu stałego może pojawić się tkliwość zębów i dyskomfort. Ich nasilenie jest indywidualne i zwykle mija po kilku dniach. Aparat zajmuje też miejsce w jamie ustnej, więc na początku trzeba się do niego przyzwyczaić.',
          'Podczas wizyty omówimy, czego można się spodziewać i kiedy skontaktować się z gabinetem.',
        ],
      },
      {
        question: 'Czy trzeba będzie usuwać zęby?',
        answer: [
          'To kwestia indywidualna. Lekarz omawia ją po analizie zdjęcia cefalometrycznego i diagnostycznych modeli gipsowych. Współczesne metody i dodatkowe elementy, takie jak mikroimplanty ortodontyczne, w wielu przypadkach pozwalają uniknąć usuwania zębów.',
        ],
      },
      {
        question: 'Ile trwa założenie aparatu stałego?',
        answer: ['Założenie aparatu stałego wymaga skupienia i precyzji, dlatego trwa zwykle około godziny.'],
      },
    ],
  },
  contact: {
    title: 'Umów konsultację ortodontyczną',
    text: 'Zadzwoń, napisz e-mail albo zostaw kontakt, a oddzwonimy. Daj znać, czy wizyta dotyczy dorosłego, czy dziecka, a ustalimy odpowiedni rodzaj konsultacji.',
  },
};
