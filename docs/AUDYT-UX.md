# VitaDentica 2.0 – audyt UX/UI i przebudowa w stylu Liquid Glass (2026-10-11)

Zakres: strona główna, Implanty, Cennik, Nasz zespół, Kontakt. Desktop 1440 px i telefon 390 px, motyw jasny i ciemny.
Metoda: zrzuty ekranu stanu wyjściowego, przegląd kodu (`src/styles`, komponenty, `index.astro`), porównanie z celem strony
(pierwszy kontakt telefoniczny pacjenta). Ograniczenie fazy 1: ta sama treść (decyzja 1), te same kolory i logo (decyzja 7).

## Werdykt

Strona była poprawna technicznie (kontrast, dostępność, wydajność), ale **wizualnie anonimowa i pozbawiona twarzy**:
gabinet stomatologiczny sprzedaje zaufanie i spokój, a pierwszy ekran pokazywał ciemne tło, siatkę i cztery liczby.
Brakowało obrazu (hero był samym tekstem), a nasycone ciemne pasy układały się w ścianę na dole strony.

## Ustalenia

Priorytet: **P1** wpływa na zaufanie lub konwersję, **P2** jakość i spójność, **P3** szlif.

### Naprawione w tej przebudowie

| # | Pri | Obszar | Problem | Rozwiązanie |
|---|---|---|---|---|
| 1 | P1 | Hero | Brak obrazu: tekst i karta z liczbami, żadnej osoby ani motywu stomatologicznego | Wizual ze szkła: ząb (SVG) nad plamami koloru marki, plakietki „7 lekarzy w zespole" (twarze lekarzy, link do zespołu) i „13 lat" |
| 2 | P1 | Zaufanie | Twarze lekarzy ukryte na osobnej podstronie; na głównej tylko tekst „Poznaj nasz zespół" | Panel zespołu: portrety siedmiu lekarzy z linkami do ich opisów (`/nasz-zespol#team-…`) |
| 3 | P1 | Nawigacja | Przy 1440 px trzy z siedmiu etykiet zawijały się do dwóch linii; „Implanty – Promocja!" jako dopisek | Pływająca tafla szkła, jedna linia, „Promocja!" jako plakietka (pełna etykieta nadal dla czytników), menu zwija się poniżej 1200 px |
| 4 | P1 | Powtórzenia | Te same cztery liczby dwa razy w odstępie jednego ekranu (karta w hero i pas „w liczbach") | Jedno miejsce: panel zespołu; hero niesie tylko dwie plakietki |
| 5 | P2 | Rytm strony | Cztery ciemne, nasycone pasy z rzędu (liczby, „Poznaj zespół", CTA, stopka) | Liczby i zespół w jednym panelu; jasna sekcja oferty wyraźnie oddziela hero od reszty |
| 6 | P2 | Ruch | Trzy przyciski pulsowały bez końca (nagłówek, hero, pasek mobilny); karta „pływała"; pierścień CTA animował `width`/`height` (układ, nie kompozytor) | Trzy impulsy i koniec; brak pływającej karty; pierścień statyczny |
| 7 | P2 | Fałszywe affordance | Wstęga zaufania powiększała się po najechaniu, choć nie jest klikalna | Usunięte |
| 8 | P2 | Czytelność | Lead w hero: waga 300 i 78% bieli na ciemnym tle | Waga 400, 84% bieli |
| 9 | P2 | Ciemne na ciemnym | Karta lekarza (ciemna) tuż pod ciemnym hero na stronach zabiegów | Jasne szkło z aurorą pod spodem |
| 10 | P3 | Podstrony | Prawa połowa nagłówków podstron pusta | Ząb ze szkła jako ozdoba nagłówka |

### Rekomendacje (wymagają materiałów lub decyzji)

| # | Pri | Rekomendacja | Dlaczego nie zrobione teraz |
|---|---|---|---|
| R1 | P1 | **Prawdziwe zdjęcie gabinetu lub zespołu w hero** zamiast ilustracji | Brak zdjęć w repozytorium; ilustracja jest uczciwym zastępnikiem, nie ostatecznym rozwiązaniem |
| R2 | P1 | Promocja implantów widoczna na stronie głównej (dziś tylko w menu) | Decyzja biznesowa; ograniczenia reklamy usług medycznych (otwarta sprawa 6 w `DECISIONS.md`) |
| R3 | P1 | Opinie pacjentów lub ocena Google. **Mapa dojazdu na `/kontakt` jest gotowa** (decyzja 21: statyczny SVG z OpenStreetMap, bez zmian CSP) | Opinie wymagają treści i źródła; do decyzji właściciela |
| R4 | P2 | Ikony działów zamiast numerów 01–04 w kartach oferty | Numeracja sugeruje kolejność lub ranking, którego nie ma; wymaga zestawu ikon |
| R5 | P2 | Promocja jako komponent HTML, nie grafika PNG z tekstem | Cena „zaszyta" w obrazie nie skaluje się, nie jest przeszukiwalna i nie ma alt z cenami w treści strony |
| R6 | P2 | Ograniczyć kapitaliki z rozstrzelonymi literami (przyciski, kickery, nawigacja, tabele) | Spłaszczają hierarchię; zmiana wymaga przeglądu wszystkich podstron |
| R7 | P2 | Strony zabiegowe: kolumna tekstu 74 ch zostawia ~40% pustego pola; boczny panel z CTA i lekarzem | Zmiana układu treści (faza 2) |
| R8 | P3 | Pasek górny dubluje telefon z nagłówka i dzielnice z plakietki hero | Decyzja, czy pasek zostaje (na telefonie i tak jest ukryty) |
| R9 | P3 | Roboto Condensed w długich akapitach (74 ch) obniża komfort czytania | Decyzja 16 (fonty); do rozważenia w fazie 2 |

## Co i dlaczego: Liquid Glass

Szkło wymaga trzech rzeczy naraz: **czego załamywać** (plamy koloru pod spodem), **krawędzi** (rozjaśniony brzeg i cienki rim)
oraz **głębi** (cień). Bez któregoś to półprzezroczysty prostokąt. Dlatego:

- jasne sekcje mają plamy aurory (`--aurora-*`), a sekcje z kartami dodatkowo plamy dokładnie pod kartami (`.section--aurora`),
- hero, panel zespołu i CTA to ciemne siatki plam marki (bordo, błękit Invisalign®), na których leży dymione szkło,
- tekst zawsze leży na szkle o gwarantowanym kontraście (nie „na oko").

| Materiał | Klasa | Gdzie | Gwarancja |
|---|---|---|---|
| Matowe | `.glass`, `.glass--strong` | nagłówek, karty, wstęga, karta lekarza, zespół, cennik, FAQ | tekst ≥ 4.5:1 nad najgorszą plamą aurory, oba motywy |
| Dymione | `.glass-smoke` | plakietki hero, panel zespołu, CTA, pasek mobilny | biały tekst ≥ 4.5:1 nawet nad białym refleksem |

Szkło „refrakcyjne" (SVG `feDisplacementMap` w `backdrop-filter`) działa tylko w Chrome, więc soczewkę zęba narysowano
w SVG (powiększone plamy w obrysie), a resztę zrobiono wyłącznie z `backdrop-filter`, który działa w Chrome, Safari i Firefox.

### Zabezpieczenia

- `prefers-reduced-transparency: reduce` i brak `backdrop-filter` → pełne powierzchnie, ta sama czytelność.
- `prefers-reduced-motion` → bez animacji wizualu i plakietek (`motion.css`).
- Telefon: blur 12 px zamiast 18 px (koszt GPU), twarze zespołu w przewijanym rzędzie.
- Fallbacki są w osobnym `transparency.css` ładowanym ostatni: w pierwszej wersji leżały w `glass.css` (ładowanym pierwszy) i przegrywały kolejnością kaskady z komponentami.
- Budżet: CSS landing 16,0 kB gzip (limit 30), JS bez zmian.

## Pliki

| Plik | Zmiana |
|---|---|
| `src/styles/tokens.css` | tokeny `--glass-*`, `--aurora-*` (jasny i ciemny, parzystość pilnuje `tests/theme.test.ts`) |
| `src/styles/glass.css` | **nowy**: materiał, wizual hero, ozdoba podstron, panel zespołu |
| `src/styles/transparency.css` | **nowy**: fallbacki `prefers-reduced-transparency` i brak `backdrop-filter` (ładowany ostatni) |
| `src/styles/components.css` | przebudowa: nagłówek, hero, przyciski, karty, CTA, zespół, cennik, kontakt |
| `src/styles/{motion,mobile,prose}.css` | ruch, układ telefonu, FAQ i obrazy w treści |
| `src/components/ui/GlassTooth.astro` | **nowy**: ząb ze szkła (SVG) |
| `src/components/home/{HeroVisual,TeamStrip}.astro` | **nowe**: wizual hero, panel zespołu |
| `src/pages/index.astro`, `PageHero`, `Header`, `CtaSection`, `MobileBar`, `DoctorCard`, `TeamMember`, `cennik.astro` | markup i klasy materiału |
| `src/components/contact/RouteMap.astro`, `src/styles/routemap.css`, `src/lib/route-map.ts`, `src/data/route-map.ts`, `scripts/generate-route-map.ts` | **nowe**: mapa dojazdu (decyzja 21) |
| `tests/route-map.test.ts`, `tests/route-map-data.test.ts`, `tests/illustration-prompts.test.ts`, `e2e/route-map.spec.ts` | **nowe**: geometria, spójność danych z `clinic.geo` i licencją, paleta promptów, czytelność mapy na telefonie |
| `tests/glass.test.ts` | **nowy** (133 przypadki): tokeny, tekst na szkle matowym (z połyskiem i bez), tekst bezpośrednio na aurorze, biały tekst na szkle dymionym |
| `scripts/check-dist.mjs` | akceptuje `alt` w zapisie Astro (`alt=""` jako samo `alt`) |
| `e2e/mobile.spec.ts` | kontrola celów dotyku obejmuje też pigułki, chipy, twarze i plakietkę zespołu |

## Poprawki po przeglądzie kodu

Niezależny przegląd (pomiary w przeglądarce, nie tylko czytanie kodu) wskazał błędy, które zostały naprawione i sprawdzone:

| Znalezisko | Naprawa |
|---|---|
| Ząb zasłaniał długi h1 na podstronach przy 761–1040 px (biały tekst na białym refleksie) | Tekst nagłówka ma rezerwę miejsca równą szerokości zęba; luz ≥ 82 px na każdej szerokości |
| Linki z panelu zespołu (`/nasz-zespol#team-…`) lądowały pod pływającym nagłówkiem | `scroll-padding-top` na `html` |
| Fallback `prefers-reduced-transparency` był martwy dla 6 selektorów (kolejność kaskady) | `transparency.css` ładowany ostatni; potwierdzone emulacją w Chrome |
| Szary tekst (`--color-muted`) na plamie aurory miał 4.0–4.4:1 | Test pokrywa teraz tekst bezpośrednio na aurorze; `--color-muted` (jasny) `#696783` → `#5b5975` (jedyna zmiana koloru poza szkłem) |
| Biały tekst na dymionym szkle nad białą stroną (pasek mobilny) poniżej 4.5:1 | `--glass-smoke` 0.64 → 0.70; test rozróżnia hero (zawsze nad ciemną siatką) i pasek mobilny (nad białą stroną) |
| Zagnieżdżony lub bezcelowy `backdrop-filter` (pigułki, plakietka, FAQ, chipy, karty zespołu): koszt GPU bez efektu | Blur tylko tam, gdzie pod spodem jest co rozmywać: nagłówek, wstęga, karty oferty i cennika, plakietki hero, pasek mobilny |
| Pigułki 39 px i chipy 41 px (poniżej 44 px), poza kontrolą e2e | `min-height: 44px` i rozszerzony selektor w e2e |
| Obrys fokusu pierwszej twarzy w przewijanym rzędzie ucięty | `scroll-padding-inline` |
| Menu desktopowe bez zapasu przy 1200 px (brakowało 9 px) | Próg menu 1240 px |

Znane, nienaprawione (poza zakresem): `astro check` zgłasza duplikat `function init()` w `src/scripts/theme.ts` i `menu.ts`
(istniało przed przebudową; dodanie `export {}` w obu plikach to jednolinijkowa poprawka) oraz odmiana „{n} lat" przestanie
być poprawna od 22 lat działalności (rok 2035).

## Aktualizacja: mapa dojazdu i ilustracje

- **Mapa dojazdu** (`/kontakt`, komponent `RouteMap.astro`): opis strony obiecywał „dojazd”, a treści o dojeździe nie było. Mapa jest statycznym SVG
  z danych OpenStreetMap, więc działa bez iframe'a, w obu motywach i nie rusza CSP. Zawiera gabinet, ulice, pięć najbliższych przystanków
  autobusowych (numerowanych jak na liście obok) i skalę 100 m. Tekst na mapie ma ≥ 10,5 px na ekranie od 320 px (mierzy to `e2e/route-map.spec.ts`).
- **Ilustracje podstron**: prompty dla wszystkich 9 podstron i obrazu udostępniania, w jednej palecie z tokenów strony: `docs/PROMPTY-ILUSTRACJI.md`.
  Wygenerowane obrazy są podpięte (decyzja 22): hero strony głównej i nagłówki sześciu podstron oraz cennika i kontaktu. Wagi po optymalizacji: 10–25 kB na stronę (AVIF), LCP 230–400 ms przy Fast 4G, CLS ≤ 0,003.

## Do decyzji właściciela

1. Czy dostarczysz zdjęcie gabinetu/zespołu do hero (R1)? Wizual jest osobnym komponentem, więc podmiana jest lokalna.
2. Czy promocja implantów ma trafić na stronę główną (R2), po sprawdzeniu treści z prawnikiem?
3. Skąd wziąć opinie pacjentów (R3)?
