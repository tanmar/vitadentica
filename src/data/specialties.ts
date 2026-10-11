/** Działy oferty (`specialty`). Opisy zgodne ze słownikiem projektu. */
export interface Specialty {
  readonly id: 'implanty' | 'ortodoncja' | 'invisalign' | 'stomatologia-ogolna';
  readonly label: string;
  /** Etykieta w menu, jeśli inna niż `label` (np. z wyróżnikiem promocji). */
  readonly navLabel?: string;
  readonly path: `/${string}`;
  readonly blurb: string;
}

export const specialties: readonly Specialty[] = [
  {
    id: 'implanty',
    label: 'Implanty',
    navLabel: 'Implanty – Promocja!',
    path: '/implanty',
    blurb: 'Implantologia: uzupełnianie brakujących zębów implantami i koronami.',
  },
  {
    id: 'ortodoncja',
    label: 'Ortodoncja',
    path: '/ortodoncja',
    blurb: 'Leczenie wad zgryzu u dzieci, młodzieży i dorosłych: aparaty stałe i ruchome.',
  },
  {
    id: 'invisalign',
    label: 'Invisalign®',
    path: '/invisalign',
    blurb: 'Przezroczyste nakładki ortodontyczne zamiast klasycznego aparatu.',
  },
  {
    id: 'stomatologia-ogolna',
    label: 'Stomatologia ogólna',
    path: '/stomatologia-ogolna',
    blurb: 'Leczenie zachowawcze, kanałowe pod mikroskopem, chirurgia i protetyka.',
  },
];

export const mainNav = [
  ...specialties.map(({ label, navLabel, path }) => ({ label: navLabel ?? label, path })),
  { label: 'Cennik', path: '/cennik' },
  { label: 'Nasz zespół', path: '/nasz-zespol' },
  { label: 'Kontakt', path: '/kontakt' },
] as const;
