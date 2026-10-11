/**
 * Metadane i nagłówek strony głównej (HTML i wersja `.md`). Tytuł: główna fraza + miejsce + marka; opis: kto,
 * gdzie, co. Limity (70 i 170 znaków) pilnują `tests/home-meta.test.ts` i `npm run verify`.
 * H1 nazywa usługę i miejsce, a nie jest hasłem (decyzja 23 w docs/DECISIONS.md).
 */
export const homeMeta = {
  title: 'Gabinet stomatologiczny Gocław, Warszawa | Vitadentica',
  description:
    'Gabinet stomatologiczny Vitadentica dla dorosłych i dzieci, Gocław, Warszawa (ul. Skalskiego 3): implanty, ortodoncja, Invisalign®, stomatologia ogólna.',
  /** H1 w dwóch częściach: druga jest wyróżniona kolorem w hero (`<em>`). Twarda spacja po „na”. */
  heading: { lead: 'Gabinet stomatologiczny', accent: 'na\u00a0Gocławiu' },
} as const;
