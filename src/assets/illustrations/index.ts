/**
 * Ilustracje nagłówków. Klucz = slug podstrony (`home` dla strony głównej).
 * Źródła i prompty: docs/PROMPTY-ILUSTRACJI.md; masters przygotowuje scripts/optimize-illustrations.mjs.
 */
import cennik from './cennik.webp';
import home from './home.webp';
import implanty from './implanty.webp';
import invisalign from './invisalign.webp';
import kontakt from './kontakt.webp';
import naszZespol from './nasz-zespol.webp';
import ortodoncja from './ortodoncja.webp';
import stomatologiaOgolna from './stomatologia-ogolna.webp';

export const illustrations = {
  home,
  implanty,
  ortodoncja,
  invisalign,
  'stomatologia-ogolna': stomatologiaOgolna,
  cennik,
  'nasz-zespol': naszZespol,
  kontakt,
} as const;

export type IllustrationId = keyof typeof illustrations;

/** Ilustracja dla slugu podstrony albo `undefined` (np. 404 używa ozdobnego zęba). */
export function illustrationFor(slug: string): IllustrationId | undefined {
  return slug in illustrations ? (slug as IllustrationId) : undefined;
}
