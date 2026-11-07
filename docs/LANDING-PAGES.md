# Strony lądowania pod Google Ads

Dwie strony reklamowe: **`/lp/implanty`** i **`/lp/ortodoncja`**. Każda ma jeden cel: skłonić do telefonu (albo e-maila lub zostawienia kontaktu w formularzu oddzwonienia) w sprawie konsultacji, i dać dane do analizy, co w reklamie i na stronie działa. Decyzja i uzasadnienie: decyzja 28 w `docs/DECISIONS.md`.

## Adresy do reklam

| Kampania | Ostateczny adres URL |
|---|---|
| Implanty | `https://vitadentica.pl/lp/implanty` |
| Ortodoncja (dorośli i dzieci) | `https://vitadentica.pl/lp/ortodoncja` |

Adresy bez ukośnika na końcu (tak jak cała witryna). Włącz **automatyczne tagowanie** w Google Ads (`gclid`); po połączeniu GA4 z Google Ads wystarczy to do przypisania ruchu. Własne UTM-y dodawaj tylko wtedy, gdy chcesz rozróżniać kampanie lub grupy reklam w GA4 bez opierania się na połączeniu kont, np. szablon śledzenia na poziomie kampanii:

```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign=implanty-szukaj&utm_term={keyword}
```

## Przekaz

Najpierw doświadczenie i jakość, potem oferta i cena. Jakość pokazujemy konkretami (specjalizacja, liczby z biogramu lekarza, systemy implantów, plan i koszty przed startem), a nie superlatywami w rodzaju „najwyższa jakość”: reklama usług leczniczych jest w Polsce ograniczona (decyzje 25 i 28, otwarta sprawa 6). Liczby na stronach muszą występować w biogramie lekarza w `src/content/team/` (pilnuje test).

Strony mają `noindex, nofollow`, nie ma ich w `sitemap`, `llms.txt`, `llms-full.txt` ani w wersjach `.md`, a `robots.txt` ich nie blokuje (robot reklam musi móc je odczytać). Nie dopisuj `Disallow: /lp/`.

## Co jest na stronie

Kolejność sekcji jest stała (szablon `src/components/landing/LandingPage.astro`), treść siedzi w jednym pliku `src/data/landing.ts`.

| Sekcja (`section`) | Po co |
|---|---|
| `hero` | Nagłówek zgodny z hasłem reklamy, doświadczenie lekarza w pierwszym zdaniu, telefon (główny przycisk) i e-mail, status rejestracji, fakty o doświadczeniu (bez cen). Przycisk jest nad zgięciem od 320 px szerokości |
| `jakosc` | „Stawiamy na jakość”: liczby z biogramu lekarza (ponad 8000 implantów albo ponad 2000 zakończonych leczeń) i karty z konkretami (leczy współwłaściciel gabinetu, systemy Straumann i Bego albo dobór metody po badaniu, plan i koszty przed startem). Bez superlatywów |
| `lekarz` | Lekarz prowadzący: karta z zespołu, wykształcenie, specjalizacja i szkolenia, przyciski telefonu i e-maila |
| `odbiorcy` (tylko ortodoncja) | Dwa wejścia: dorośli (konsultacja z modelami) i dzieci, z ceną konsultacji i własnym przyciskiem |
| `dla-kogo` / `powody`, `metody` | Kiedy rozważyć leczenie: karty bez obietnic |
| `etapy` | Jak wygląda leczenie, z orientacyjnymi czasami |
| `ceny` | Aktualne ceny z `price-list.json` (bez przekreśleń i haseł promocyjnych), celowo niżej: cena nie jest głównym argumentem |
| `pytania` | FAQ (8 pytań), otwierane akordeonem |
| `kontakt` | Telefon, e-mail, formularz „Zostaw kontakt, oddzwonimy” (kotwica `#oddzwonimy`), adres, godziny |

Na telefonie jest stały dolny pasek „Umów konsultację” z numerem; na desktopie przycisk telefonu jest w nagłówku (przyklejonym).

Trzecia droga kontaktu, zawsze widoczna, to formularz „Zostaw kontakt, oddzwonimy” w sekcji kontaktu. Prowadzą do niego linki w hero i w sekcji lekarza. Gdy rejestracja jest nieczynna, status mówi „Zadzwoń w poniedziałek od 10:00 albo zostaw kontakt, a oddzwonimy”, link w hero wygląda jak przycisk, a dolny pasek na telefonie pokazuje „Zostaw kontakt” zamiast „Umów konsultację”.

## Zdarzenia (GA4 i GTM)

Wszystko idzie przez `gtag('event', …)`, więc trafia do GA4 i do GTM. **Konwersje to `phone_click`, `email_click` (decyzja 26) i `generate_lead` (formularz oddzwonienia, decyzja 29)**; na stronach lądowania mają dodatkowe parametry. Pozostałe zdarzenia służą do analizy lejka. Przed zgodą na cookies zdarzenia tylko czekają w `dataLayer`; do Google nic nie wychodzi.

| Zdarzenie | Kiedy | Parametry (oprócz `lp_name`, `reg_open`) | Rola |
|---|---|---|---|
| `phone_click` | klik w numer / przycisk telefonu | `link_url`, `link_text`, `cta_location`, `audience` | **konwersja** |
| `email_click` | klik w e-mail | jw. | **konwersja** |
| `cta_click` | klik w link do kotwicy na stronie (np. „Najpierw sprawdź ceny”) | `link_url`, `cta_location` | zainteresowanie |
| `section_view` | sekcja widoczna w ≥ 35% (raz na sekcję) | `section` | lejek |
| `scroll_depth` | przewinięcie do 25, 50, 75, 90% strony | `percent` | lejek |
| `generate_lead` | serwer przyjął formularz „Zostaw kontakt, oddzwonimy” | `form_name=callback`, `contact_method` (`phone`, `email`, `both`), `cta_location=callback`, `audience` | **konwersja** |
| `faq_open` | otwarcie pytania w FAQ | `faq_question`, `cta_location=faq` | zainteresowanie |

Znaczenie parametrów:

- `lp_name`: `implanty` albo `ortodoncja`.
- `cta_location`: skąd kliknięto: `header`, `hero`, `sticky` (dolny pasek na telefonie), `audience`, `prices`, `doctor`, `faq`, `contact`, `callback` (formularz oddzwonienia), `footer`.
- `audience`: `dorosli` albo `dzieci`; ustawiane tylko dla kliknięć w kartach odbiorców (ortodoncja).
- `reg_open`: `yes` lub `no`, czy w chwili zdarzenia rejestracja telefoniczna była czynna (czas Europy/Warszawy, bez względu na strefę odwiedzającego).

## Ustawienia po stronie Google (jednorazowo)

1. **GA4 → Admin → Data display → Custom definitions**: utwórz wymiary o zakresie *Event* dla parametrów `lp_name`, `cta_location`, `audience`, `reg_open`, `section`, `faq_question`, `contact_method`, `form_name` oraz `percent`. Bez tego parametry nie pojawią się w raportach ani w eksploracjach, a dane zbierają się dopiero od chwili utworzenia wymiaru (wstecz nie).
2. **GA4 → Admin → Data display → Events**: oznacz `phone_click`, `email_click` i `generate_lead` jako *key events*.
3. **Google Ads → Narzędzia → Konwersje → Nowa konwersja → Importuj → Google Analytics 4**: zaimportuj `phone_click`, `email_click` i `generate_lead`. Pozostałych zdarzeń nie importuj, służą do analizy w GA4.
4. Sprawdź: otwórz stronę, zaakceptuj cookies, kliknij przycisk telefonu i obejrzyj zdarzenie w GA4 *DebugView* lub w podglądzie GTM. Na komputerze przeglądarka nie wybierze numeru, ale zdarzenie zostanie wysłane.

`phone_click` mierzy kliknięcie w numer, a nie odebrane połączenie ani jego długość. Na komputerze część osób przepisuje numer z ekranu i takiego telefonu nie widać. Żeby znać prawdziwy wynik, niech rejestracja pyta nowych pacjentów, skąd o gabinecie wiedzą, i zapisuje „reklama” (to jedyne, co wiąże telefon z kampanią bez płatnego systemu śledzenia połączeń).

## Formularz oddzwonienia

Pola: imię, telefon albo e-mail (wystarczy jedno), na stronie ortodoncji „dorosły czy dziecko”, wymagana zgoda z klauzulą informacyjną (rozwijana „Informacja o danych osobowych”). Zgłoszenie przyjmuje `public/api/callback.php` na hostingu LH.pl i wysyła je e-mailem na `vitadentica@vitadentica.pl` (odpowiedź do pacjenta: przycisk „Odpowiedz”, gdy podał e-mail). Na serwerze nic nie zostaje poza krótkotrwałym licznikiem zgłoszeń z jednego IP (skrót, bez adresu).

Ochrona przed spamem bez usług zewnętrznych: ukryte pole-pułapka, minimalny czas wypełnienia (3 s), zgłoszenie musi przyjść z tej witryny (Origin/Referer), limit 3 zgłoszeń na 10 minut i 10 na dobę z jednego IP. Bez JavaScriptu formularz działa zwykłym wysłaniem i pokazuje prostą stronę z podziękowaniem.

Po pierwszym wdrożeniu wyślij próbne zgłoszenie z żywej strony i sprawdź skrzynkę (także folder spam). Funkcja `mail()` na LH.pl zwykle działa od ręki; jeśli wiadomość nie dochodzi, trzeba skonfigurować wysyłkę przez SMTP. Na podglądach Cloudflare Pages PHP nie działa: formularz pokaże wtedy błąd z numerem telefonu.

Treść zgody i klauzuli jest w `src/components/landing/LpCallback.astro` i wymaga akceptacji gabinetu (prawnika). Zmieniając ją, zmień datę w `CALLBACK_CONSENT_VERSION` (`src/data/landing.ts`) i `CONSENT_VERSION` (PHP); test pilnuje zgodności. Do analityki trafia tylko sposób kontaktu (`contact_method`), nigdy imię, telefon ani e-mail.

## Jak analizować

- **Wyświetlenia strony** liczy zdarzenie `section_view` z `section=hero` (ma `reg_open`, `page_view` nie ma). Współczynnik konwersji = (`phone_click` + `email_click`) / wyświetlenia, osobno dla `lp_name`, kampanii i słowa kluczowego.
- **Który przycisk działa**: rozbij konwersje po `cta_location`. Jeśli większość to `sticky` i `hero`, a `doctor` i `contact` prawie nic, strona działa z pierwszego ekranu; jeśli `doctor` ma dużo, przekonuje sekcja jakości i lekarza.
- **Godziny pracy rejestracji**: porównaj konwersje i `phone_click` dla `reg_open=yes` i `no`. Jeśli telefon prawie nigdy nie pada poza godzinami, rozważ harmonogram reklam (dziś godziny w `clinic.hours`: pon.–pt. 10:00–20:00, do potwierdzenia) albo niższe stawki poza nimi; `email_click` pada o każdej porze.
- **Ortodoncja**: `audience=dorosli` kontra `dzieci` pokazuje, która grupa częściej dzwoni z kart odbiorców; kliknięcia z `hero` nie mają odbiorcy.
- **Lejek**: kolejność `section_view` (`jakosc` → `lekarz` → … → `ceny` → `pytania` → `kontakt`) i `scroll_depth` pokazują, gdzie ludzie odpadają. Wysoki odsetek wejść bez przewinięcia ponad 25% to sygnał, że obietnica reklamy nie zgadza się z nagłówkiem.
- **FAQ**: `faq_open` po `faq_question` mówi, co budzi wątpliwości; to materiał na nagłówki reklam i kolejne treści.
- **Pomysły na testy** (jedna zmiana naraz, dwa adresy w dwóch grupach reklam albo w eksperymencie Google Ads): treść przycisku, cennik wyżej kontra obecna kolejność (jakość przed ceną), kolejność sekcji cennika i etapów, krótszy hero, wariant bez przycisku e-mail. Przy małym budżecie czekaj na kilkadziesiąt konwersji na wariant, zanim wyciągniesz wniosek.

## Ograniczenia, o których trzeba pamiętać

- **Zgoda na cookies**: tagi ładują się dopiero po zgodzie (decyzje 9, 24), więc osoby, które ją odrzucą, nie są mierzone, a konwersje w Google Ads są zaniżone względem rzeczywistości. Liczby nadają się do porównań wewnętrznych (które strony, przyciski, słowa), nie do liczenia wszystkich pacjentów. Ustawienie „Advanced Consent Mode” (pingi bez cookies) zostało świadomie odrzucone na ten moment.
- **Godziny gabinetu** w `clinic.ts` mają jeszcze oznaczenie TODO; status „Rejestracja czynna dziś do 20:00” jest tak dobry jak te godziny. Bez JavaScriptu strona pokazuje statyczne godziny.
- **Treść reklamowa i medyczna**: strony są informacyjne (bez gwarancji, superlatywów, presji terminów i statystyk), ale nie przeszły oceny prawnej (otwarta sprawa 6) ani weryfikacji lekarskiej (`docs/WERYFIKACJA-TRESCI.md`). Polityka prywatności nie ma osobnej strony; odkąd formularz zbiera dane, jej brak jest poważniejszy (otwarta sprawa 17).
- **Teksty powtarzają fakty** ze stron `src/content/pages/implanty.md` i `ortodoncja.md` (czasy, kwalifikacje lekarza, systemy). Zmieniasz je tam, zmień też `src/data/landing.ts`.

## Praca z kodem

- **Zmiana tekstu**: `src/data/landing.ts`. Kwoty wyłącznie jako `{{cena: id}}` (id z `src/data/price-list.json`); `npm test` pilnuje, żeby id istniały, nie było ręcznych kwot, gwarancji, haseł promocyjnych ani statystyk (`tests/landing-pages.test.ts`).
- **Nowa strona lądowania**: dodaj obiekt `LandingContent` w `landing.ts` (nowa wartość `lp`), plik `src/pages/lp/<nazwa>.astro` z `<LandingPage content={…} />`, wpis do tablicy `LANDINGS` w `tests/landing-pages.test.ts` i do `PAGES` w `e2e/mobile.spec.ts`.
- **Sprawdzenie przed wdrożeniem**: `npm test`, `npm run build`, `npm run verify` (wymaga m.in. `noindex`, linków `tel:` i `mailto:`, braku menu, markerów `data-cta` i braku `/lp/` w sitemap i `llms*.txt`), opcjonalnie `npm run test:e2e` (strony lądowania są w teście mobilnym 320–430 px).
- **Formularz**: `src/components/landing/LpCallback.astro` (pola, zgoda, klauzula), `src/scripts/callback-form.ts` (walidacja, wysyłka, `generate_lead`), `public/api/callback.php` (odbiór i e-mail). Testy: `tests/callback-form.test.ts` (zasady pól i zgodność PHP z danymi gabinetu) i `tests/callback-php.test.ts` (endpoint we wbudowanym serwerze PHP; pomijany, gdy w systemie nie ma PHP, np. na macOS: `brew install php`).
- **Skrypty**: `src/scripts/lp-events.ts` (zdarzenia i status rejestracji), `src/scripts/open-status.ts` (logika godzin, czysta funkcja z testami), `src/scripts/contact-events.ts` (`trackingParams`: parametry dokładane do `phone_click` / `email_click`).
