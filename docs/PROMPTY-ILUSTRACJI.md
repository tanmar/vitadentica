# Ilustracje podstron: prompty (2026-10-11)

Zestaw promptów do wygenerowania spójnej serii ilustracji dla każdej podstrony Vitadentica, w stylu Liquid Glass i w kolorach strony (decyzje 7, 19, 20 w `DECISIONS.md`). Prompty są po angielsku, bo generatory obrazów najlepiej rozumieją ten język; opisy po polsku.

## Jak z tego korzystać

1. Zacznij od **strony głównej**: to ilustracja wzorcowa. Wybierz najlepszy wariant i podawaj go jako **referencję stylu** przy pozostałych (Midjourney: `--sref`, Firefly i Ideogram: „style reference”, GPT-image: dołącz obraz i napisz „same style and lighting as the reference”).
2. Każdy prompt jest kompletny: wklejasz cały blok z ramki, bez doklejania. Blok stylu i blok negatywny są identyczne we wszystkich promptach (poniżej w całości, żeby łatwo je zmienić w jednym miejscu).
3. Generuj 4 warianty, wybierz jeden. Odrzuć obrazy z tekstem, twarzami lub kolorami spoza palety (lista kontrolna na końcu).
4. Obrazy wrzuć do `img/` i dopisz je w `scripts/optimize-illustrations.mjs` (mapa slug → plik), potem `npm run img:optimize`: skrypt robi mastery WebP 1280 px w `src/assets/illustrations/`, a komponent `Art` (Astro `<Picture>`) wystawia AVIF/WebP w szerokościach 480/720/960 px (10–25 kB na stronę zamiast ok. 2,3 MB). Nowy obraz trzeba jeszcze dodać do `src/assets/illustrations/index.ts`. Dekoracja ma `alt=""`, bo treść niesie tekst strony.

## Paleta

Kolory pochodzą z `src/styles/tokens.css` (jedno źródło prawdy; zgodność pilnuje `tests/illustration-prompts.test.ts`). Proporcje: ok. 60 % granat, 30 % szkło (biel i przezroczystość), 10 % akcenty, z czego czerwień i błękit w równowadze.

| Rola | Hex | Token | Użycie na ilustracji |
|---|---|---|---|
| Granat nocny (tło) | `#0D0F23` | `--color-night` | tło ilustracji, ok. 60 % |
| Granat jaśniejszy | `#1E2040` | `--color-night-3` | przejście tła, cienie szkła |
| Bordo marki | `#730017` | `--color-brand` | poświata w lewym dolnym rogu, głębia |
| Karmin | `#C0002A` | `--color-brand-bright` | główna poświata czerwona |
| Czerwień akcentu | `#E81848` | (aurora w hero) | tylko rozbłyski, do 5 % |
| Błękit marki / Invisalign® | `#009ACE` | `--color-accent` | poświata w prawym górnym rogu, krawędzie |
| Błękit jasny | `#37C3F0` | (ząb w hero) | rozbłyski i refrakcja |
| Biel ciepła | `#FAF8F9` | `--color-off` | refleksy szkła, nigdy czysta #FFF na dużej powierzchni |

**Poza paletą (zakaz):** zieleń, żółć, pomarańcz, fiolet, pastelowy róż, tęczowe gradienty. Generatory same je dodają (szczególnie turkus-pomarańcz i fiolet), więc są też w bloku negatywnym.

**Układ światła** (taki sam na każdej ilustracji, dzięki czemu seria wygląda jak jedna rodzina): czerwona poświata w lewym dolnym rogu, błękitna w prawym górnym, obiekt nieco na prawo od środka. Na stronach lewa połowa nagłówka jest zajęta tekstem.

## Blok stylu (wspólny)

```text
Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

## Blok negatywny (wspólny)

Dla Midjourney: `--no` + treść poniżej. Dla generatorów z polem „negative prompt”: wklej do pola. Dla GPT-image (bez pola negatywnego): dopisz na końcu promptu „Avoid: …”.

```text
text, letters, numbers, digits, currency symbols, logo, brand name, watermark, signature, human face, person, hands, blood, gums, open mouth, realistic photo of teeth, yellowed teeth, green, yellow, orange, purple, pastel pink, rainbow gradient, neon, cartoon, clip art, flat vector icon, stock-photo look, cluttered background, harsh shadows, extra objects, low contrast
```

## Prompty dla podstron

### Strona główna (`/`)

- **Gdzie trafia:** hero (komponent `HeroVisual`, w miejscu SVG-owego zęba `.hv__tooth`)
- **Proporcje:** 1:1,06; źródło 2000 × 2120 px, eksport 920 × 975 px (2× do 460 px szerokości); plik `home.webp`
- **Parametr proporcji:** `--ar 50:53` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Pierwszy ekran. Ząb jest znakiem rozpoznawczym całej serii, więc ten obraz wyznacza styl dla pozostałych. Generuj go jako pierwszy i używaj jako referencji stylu.
- **Uwaga do kadru:** Lewy dolny i prawy górny róg zostaw spokojne (sama poświata): leżą tam plakietki HTML „lekarzy w zespole” i „lat na Gocławiu”.

```text
A single large, softly rounded glass molar tooth floating and tilted about 10 degrees, polished like frosted crystal with a clear glass core, refracting the crimson glow from the lower left and the cyan glow from the upper right. Three small clear glass spheres of different sizes orbit it at a distance, and a thin ring of light curves behind the tooth. Keep the lower-left and upper-right corners calm, only soft glow. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

### Implanty (`/implanty`)

- **Gdzie trafia:** nagłówek podstrony (`PageHero`, `.hero__mark`)
- **Proporcje:** 10:11; źródło 2400 × 2640 px, eksport 960 × 1056 px; plik `implanty.webp`
- **Parametr proporcji:** `--ar 10:11` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Implant to konstrukcja z trzech części (korona, łącznik, śruba). Rysunek rozłożony pionowo tłumaczy zabieg bez anatomii i bez krwi.
- **Uwaga do kadru:** Obiekt w prawej 2/3 kadru; po lewej stronie tekst nagłówka, więc brak jasnych elementów przy lewej krawędzi.

```text
Exploded vertical view of a dental implant system floating in a single column: a smooth translucent glass crown on top, a small slim connector below it, and an elegant threaded implant screw at the bottom, rendered as brushed silver titanium with a glass sheen and a fine cyan rim light. Faint thin light guides connect the three parts. At the very bottom a soft curved band of frosted glass suggests the jaw line, purely abstract, no anatomy. Precise, engineered, reassuring. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

### Ortodoncja (`/ortodoncja`)

- **Gdzie trafia:** nagłówek podstrony (`PageHero`, `.hero__mark`)
- **Proporcje:** 10:11; źródło 2400 × 2640 px, eksport 960 × 1056 px; plik `ortodoncja.webp`
- **Parametr proporcji:** `--ar 10:11` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Leczenie wad zgryzu u dzieci i dorosłych. Łuk zębów z cienkim drutem to rozpoznawalny symbol ortodoncji. Bez ruchu „krzywe → proste” i bez porównań: to byłoby „przed i po” (patrz zasady niżej).
- **Uwaga do kadru:** Jak wyżej. Łuk zębów musi się mieścić w kadrze z marginesem min. 8 %.

```text
A graceful arch of eight smooth glass front teeth seen from slightly above, evenly spaced, with a thin glass-and-silver archwire threading through tiny square brackets and a soft line of light following the wire. Abstract, gentle, friendly, suitable for both children and adults. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

### Invisalign® (`/invisalign`)

- **Gdzie trafia:** nagłówek podstrony (`PageHero`, `.hero__mark`)
- **Proporcje:** 10:11; źródło 2400 × 2640 px, eksport 960 × 1056 px; plik `invisalign.webp`
- **Parametr proporcji:** `--ar 10:11` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Cecha produktu to przezroczyste nakładki, więc pokazujemy je jako cienką szklaną powłokę na zębach z cyjanową krawędzią (błękit marki Invisalign® jest już błękitem strony). Obraz nie obiecuje „niewidoczności”.
- **Uwaga do kadru:** Nie proś generatora o logo ani napis Invisalign®: znak towarowy i tekst w obrazie odpadają (patrz zasady).

```text
Two ultra-thin transparent clear-aligner trays shaped like delicate glass shells, stacked with a slight offset above a row of six smooth glass teeth, with a subtle cyan (#009ACE) glow along the tray edge and soft refraction through the material. Minimal and calm. No brand name, no logo, no case. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

### Stomatologia ogólna (`/stomatologia-ogolna`)

- **Gdzie trafia:** nagłówek podstrony (`PageHero`, `.hero__mark`)
- **Proporcje:** 10:11; źródło 2400 × 2640 px, eksport 960 × 1056 px; plik `stomatologia-ogolna.webp`
- **Parametr proporcji:** `--ar 10:11` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Zakres jest szeroki (zachowawcza, kanałowa pod mikroskopem, chirurgia, protetyka). Wspólny mianownik to dokładność, stąd soczewka mikroskopu i delikatne narzędzia.
- **Uwaga do kadru:** Jak wyżej.

```text
A glass molar tooth at the centre of a large circular glass lens ring, suggesting microscopic root-canal treatment, the tooth slightly magnified inside the lens and wrapped in a soft halo of light. A slim dental mirror and a fine explorer instrument float nearby as simple elegant glass silhouettes, plus a few tiny sparkles. Calm and precise. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

### Cennik (`/cennik`)

- **Gdzie trafia:** nagłówek podstrony (`PageHero`, `.hero__mark`)
- **Proporcje:** 10:11; źródło 2400 × 2640 px, eksport 960 × 1056 px; plik `cennik.webp`
- **Parametr proporcji:** `--ar 10:11` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Przejrzysty cennik to dosłownie przezroczysty: szkło jest tu metaforą. Bez cyfr i symboli waluty, bo ceny są w treści strony (przeszukiwalne i skalowalne).
- **Uwaga do kadru:** Żadnych cyfr ani „zł” na kartach: generatory je zniekształcają, a obraz nie może mówić o cenach.

```text
A fan of four frosted-glass cards stacked with a slight offset, as a metaphor for transparent pricing. The top card has a softly embossed tooth silhouette in one corner and a thin cyan accent line. One round clear glass coin with an embossed tooth floats at the lower right. No digits and no currency symbols on any surface. Clean, honest, calm. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

### Nasz zespół (`/nasz-zespol`)

- **Gdzie trafia:** nagłówek podstrony (`PageHero`, `.hero__mark`)
- **Proporcje:** 10:11; źródło 2400 × 2640 px, eksport 960 × 1056 px; plik `nasz-zespol.webp`
- **Parametr proporcji:** `--ar 10:11` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Prawdziwe twarze lekarzy są na zdjęciach tej strony, więc ilustracja ich nie udaje. Konstelacja zamiast ludzi: współpraca i różne specjalizacje.
- **Uwaga do kadru:** Brak twarzy i sylwetek ludzi (rozbieżność z prawdziwymi zdjęciami zaszkodziłaby zaufaniu).

```text
A constellation of five to seven translucent glass orbs of different sizes arranged in a gentle arc and connected by fine luminous threads. Each orb has a slightly different inner glow, from crimson through white to cyan. The largest orb in the centre contains a small tooth silhouette. No faces, no people. Suggests a team of specialists working together. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

### Kontakt (`/kontakt`)

- **Gdzie trafia:** nagłówek podstrony (`PageHero`, `.hero__mark`)
- **Proporcje:** 10:11; źródło 2400 × 2640 px, eksport 960 × 1056 px; plik `kontakt.webp`
- **Parametr proporcji:** `--ar 10:11` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Kontakt to tylko telefon i e-mail (decyzja 5), więc słuchawka i koperta, a pin odsyła do mapy dojazdu niżej na tej samej stronie.
- **Uwaga do kadru:** Jak wyżej.

```text
A calm glass telephone handset of a simple modern shape resting at an angle, with a small clear glass envelope floating beside it and a minimal glass map pin above. A soft concentric ring of light spreads from the handset like a gentle call signal. Friendly, accessible, welcoming. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

### Strona nie znaleziona (404) (`/404`)

- **Gdzie trafia:** nagłówek strony błędu (`PageHero`, `.hero__mark`; ta sama kompozycja co podstrony)
- **Proporcje:** 10:11; źródło 2400 × 2640 px, eksport 960 × 1056 px; plik `404.webp`
- **Parametr proporcji:** `--ar 10:11` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Błąd ma być łagodny: zgubiony ząb i kompas. Bez ironii na temat bólu.
- **Uwaga do kadru:** Dużo pustego miejsca, obiekt mały względem kadru.

```text
A single small glass tooth lying slightly tilted on a dark glossy surface with a soft reflection beneath it, and a tiny glass compass ring floating above it with a needle drifting. Calm and slightly playful, as if gently lost. Generous empty space around the object. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

### Obraz do udostępniania, Open Graph (`wszystkie strony`)

- **Gdzie trafia:** `og:image` (dziś nieustawiony, do dodania w `BaseLayout`)
- **Proporcje:** 1,91:1; źródło 2400 × 1260 px, eksport 1200 × 630 px, JPEG ≤ 150 kB; plik `og-default.jpg`
- **Parametr proporcji:** `--ar 191:100` (Midjourney); w innych generatorach wybierz najbliższy format i przytnij
- **Dlaczego ten motyw:** Podgląd linku w komunikatorach i mediach społecznościowych. Napis (nazwa gabinetu) nakłada się osobno w grafice, nie w generatorze.
- **Uwaga do kadru:** Obiekt w prawej trzeciej części kadru; lewe 55 % zostaje ciemne i spokojne pod nazwę gabinetu.

```text
The same signature glass molar tooth as the main hero, placed in the right third of a wide landscape frame, with the left 55 percent of the frame left as calm dark navy gradient with only a faint crimson glow, leaving clean space for a title to be added later. Premium Liquid Glass 3D render. Translucent frosted glass and clear glass objects with soft refraction, subtle chromatic dispersion on the edges, bright specular rim light, gentle inner glow and delicate caustics. One hero object, floating, placed slightly right of centre, generous negative space around it. Deep midnight-navy studio background (#0D0F23 fading to #1E2040) with two large, blurred aurora light blobs: a crimson-burgundy glow (#C0002A into #730017, highlights #E81848) in the lower left, and a vivid cyan-blue glow (#009ACE, highlights #37C3F0) in the upper right. Colour palette strictly limited to midnight navy, crimson and burgundy, cyan-blue, white and warm off-white (#FAF8F9) glass highlights. Soft depth of field, very fine film grain, clean minimal composition, calm, clinical yet luxurious mood. No text, no letters, no numbers, no logos, no watermark, no people, no faces.
```

## Zasady, które obowiązują wszystkie ilustracje

- **Bez tekstu, cyfr, logo i znaków towarowych w obrazie.** Generatory zniekształcają litery, a tekst w grafice nie skaluje się ani nie jest przeszukiwalny (to samo uzasadnienie co rekomendacja R5 w `AUDYT-UX.md`). Napisy dodajemy w HTML.
- **Bez ludzi i twarzy.** Prawdziwi lekarze mają zdjęcia na stronie zespołu; ilustracja nie może ich udawać ani ich zastępować.
- **Bez „przed i po”, gwarancji efektu i porównań.** To obszar ograniczeń reklamy usług medycznych (otwarta sprawa 6 w `DECISIONS.md`). Obrazy mają być dekoracją, nie twierdzeniem medycznym.
- **Bez słów-obietnic w promptach:** „perfect”, „guarantee”, „painless”, „safe”, „invisible”, „best”, „cure”, „before/after”. Pilnuje tego `tests/illustration-prompts.test.ts`; obraz ma być dekoracją, nie obietnicą.
- **Bez realistycznych zdjęć jamy ustnej.** Styl jest „szkło”, nie klinika: nic nie krwawi, nie boli, nie otwiera się.
- **Czytelność w małej skali:** nagłówek podstrony pokazuje obraz dziś w ok. 240 px szerokości. Obiekt musi być rozpoznawalny przy tej wielkości (mała liczba wyraźnych brył, nie drobny detal).
- **Tło:** generuj na jednolitym `#0D0F23`. Na ciemnych nagłówkach tło zlewa się ze stroną (`mix-blend-mode: screen`); jeśli generator ma tryb przezroczystego tła, użyj go i zapisz PNG-alfa → WebP.

## Lista kontrolna przed zatwierdzeniem obrazu

- [ ] Próbnikiem kolorów sprawdzone 5 dominujących odcieni: wszystkie z tabeli palety (±10 jasności)
- [ ] Brak tekstu, cyfr, logo, twarzy, rąk
- [ ] Czerwona poświata po lewej dole, błękitna po prawej górze
- [ ] Obiekt rozpoznawalny po zmniejszeniu do 240 px
- [ ] Obiekt nie dotyka krawędzi kadru (margines ≥ 8 %), w obrazie jest miejsce na tekst po lewej
- [ ] Po `npm run img:optimize` master ≤ 120 kB i proporcje jak w tabeli (pilnuje `tests/illustrations.test.ts`)
- [ ] Obraz obok ilustracji wzorcowej (strona główna) wygląda jak z tej samej serii

