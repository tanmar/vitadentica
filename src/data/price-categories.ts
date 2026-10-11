/** Kategorie cennika w kolejności wyświetlania (id używane w `price-list.json`). */
export interface PriceCategory {
  readonly id: string;
  readonly title: string;
  /** Wyróżnik przy nagłówku, np. „Ceny promocyjne!". */
  readonly promoLabel?: string;
}

export const priceCategories: readonly PriceCategory[] = [
  { id: 'implanty', title: 'Implanty', promoLabel: 'Ceny promocyjne!' },
  { id: 'ortodoncja-aparaty-stale', title: 'Ortodoncja – aparaty stałe', promoLabel: 'PROMOCJE!' },
  { id: 'ortodoncja-dziecieca', title: 'Ortodoncja dziecięca – aparaty ruchome' },
  { id: 'chirurgia', title: 'Chirurgia stomatologiczna' },
  { id: 'stomatologia-zachowawcza', title: 'Stomatologia zachowawcza' },
  { id: 'stomatologia-zachowawcza-mleczne', title: 'Stomatologia zachowawcza zębów mlecznych' },
  { id: 'protetyka', title: 'Protetyka' },
  { id: 'badania-radiologiczne', title: 'Badania radiologiczne' },
  { id: 'ogolne', title: 'Ogólne' },
];
