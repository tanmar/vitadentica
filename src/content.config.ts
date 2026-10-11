import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const specialtyId = z.enum(['implanty', 'ortodoncja', 'invisalign', 'stomatologia-ogolna']);

/** Strony treści. Nazwa pliku = nowa ścieżka (`implanty.md` → `/implanty`). */
const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().max(70, 'title > 70 znaków utnie się w wynikach Google'),
    description: z.string().max(170),
    h1: z.string().optional(),
    /** Adres(y) ze starego WordPressa; źródło dla mapy 301. */
    oldUrl: z.union([z.string(), z.array(z.string())]).optional(),
    specialty: specialtyId.optional(),
    /** Lekarz prowadzący: karta lekarza na stronie (zdjęcie i dane z kolekcji `team`). */
    doctor: reference('team').optional(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

/** Zespół: lekarze (`doctor`) i personel. Treść pliku = biogram, 1:1 ze starej strony. */
const team = defineCollection({
  loader: glob({ base: './src/content/team', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      kind: z.enum(['doctor', 'staff']),
      /** Tytuł przed nazwiskiem, np. „lek. dent.". */
      honorific: z.string().optional(),
      /** Linie pod nazwiskiem, np. „Lekarz stomatolog". */
      roles: z.array(z.string()).default([]),
      /** Np. „Pacjentów przyjmuję w środy i czwartki". */
      schedule: z.string().optional(),
      /** Adres imienny używany na stronach zabiegowych (np. r.zaniewicz@vitadentica.pl). */
      email: z.email().optional(),
      photo: image().optional(),
      order: z.number().int(),
    }),
});

/** Cennik (`priceList` / `priceItem`): jedno źródło dla strony i JSON-LD. Kwoty w PLN. */
const priceList = defineCollection({
  loader: file('src/data/price-list.json'),
  schema: z.object({
    id: z.string(),
    /** Kolejność wyświetlania w obrębie cennika (kolekcja nie gwarantuje kolejności). */
    order: z.number().int().positive(),
    /** Id kategorii z `src/data/price-categories.ts`. */
    category: z.string(),
    name: z.string(),
    /** Cena aktualna (po promocji). 0 oznacza „bezpłatnie". Dolna granica przy `priceTo`. */
    price: z.number().nonnegative(),
    priceTo: z.number().nonnegative().optional(),
    /** Cena „od …". */
    isFrom: z.boolean().optional(),
    /** Cena przed promocją (przekreślona). */
    regularPrice: z.number().nonnegative().optional(),
    /** Jednostka, gdy cena nie dotyczy zabiegu (np. „strona", „nośnik"). */
    unit: z.string().optional(),
    note: z.string().optional(),
    /** Tytuł karty wyróżnionej u góry strony cennika. */
    highlight: z.string().optional(),
  }),
});

export const collections = { pages, team, priceList };
