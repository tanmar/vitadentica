# VitaDentica 2.0 – słownik projektu (v1.0, 2026-10-11)

Jedno źródło prawdy o nazwach. W rozmowach, issue, commitach i kodzie używamy tych terminów
w tym samym znaczeniu. Kolumna „Kod" to **propozycja** identyfikatorów (po angielsku), do zatwierdzenia przy scaffoldzie.

## 1. Domena: gabinet i oferta

| Termin | Znaczenie | Kod |
|---|---|---|
| **Gabinet** | Gabinet stomatologiczny Vitadentica, ul. Gen. Stanisława Skalskiego 3 lok U6, Warszawa (Gocław, Praga Południe, Saska Kępa). Jedyny podmiot, którego dotyczy strona | `clinic` |
| **Dział oferty** | Główna kategoria usług: Implanty, Ortodoncja, Invisalign®, Stomatologia ogólna | `specialty` |
| **Zabieg** | Pojedyncza usługa w ofercie (np. wybielanie zębów). Ma własny wpis w kolekcji treści i URL | `treatment` |
| **Lekarz** | Osoba z profilem w zespole: imię i nazwisko, specjalizacja, zdjęcie, opis | `doctor` |
| **Zespół** | Lista lekarzy gabinetu (strona „Nasz zespół") | `team` |
| **Cennik** | Zestaw pozycji z cenami. Jedno źródło danych dla strony cennika i dla JSON-LD | `priceList` |
| **Pozycja cennika** | Jeden zabieg z ceną lub widełkami cen | `priceItem` |
| **Promocja** | Wyróżniona oferta (obecnie: „Implanty – Promocja!", implant z koroną). Na starcie przenoszona 1:1 jako zwykła treść | `promo` |
| **Konwersja** | Kontakt pacjenta z gabinetem: telefon lub e-mail. Formularza nie ma | `conversion` |
| **Dane gabinetu** | Nazwa, adres, telefon, e-mail, godziny otwarcia. Jedno źródło dla stopki, kontaktu i JSON-LD | `clinicInfo` |

### Terminy kliniczne używane w ofercie

| Termin | Znaczenie |
|---|---|
| **Implant** | Tytanowa śruba wprowadzana w kość, na której mocuje się koronę. Uzupełnia brakujące zęby |
| **Implantologia** | Dział stomatologii zajmujący się wszczepianiem implantów |
| **Ortodoncja** | Leczenie wad zgryzu i ustawienia zębów (dzieci, młodzież, dorośli) |
| **Aparat stały ligaturowy / samoligaturujący** | Zamki mocowane do zębów; różnią się sposobem mocowania łuku (ligatury vs wbudowana klapka) |
| **Aparat ruchomy** | Aparat zdejmowany przez pacjenta, stosowany głównie u dzieci i młodzieży |
| **Invisalign®** | System przezroczystych nakładek ortodontycznych. Znak towarowy, pisownia z ® |
| **Stomatologia zachowawcza** | Leczenie próchnicy i odbudowa zęba (wypełnienia) |
| **Leczenie kanałowe (endodoncja)** | Leczenie miazgi i kanałów korzeniowych zęba |
| **Mikroskop Zeiss OPMI** | Mikroskop zabiegowy; podstawa oferty „trudne przypadki" |
| **Chirurgia stomatologiczna** | Zabiegi chirurgiczne w jamie ustnej (m.in. ekstrakcje, przygotowanie pod implanty) |
| **Protetyka** | Uzupełnianie zębów: korony, mosty, protezy |
| **Piaskowanie** | Usuwanie osadu i przebarwień strumieniem proszku |
| **Wybielanie** | Zabieg rozjaśniania szkliwa |

## 2. Strona, treść i migracja

| Termin | Znaczenie | Kod |
|---|---|---|
| **VitaDentica 2.0** | Nowa, statyczna wersja vitadentica.pl bez WordPressa | – |
| **Faza 1 / Faza 2** | Faza 1: nowy design, ta sama treść, te same dane. Faza 2: rozbudowa treści (FAQ, strony zabiegów, blog), ewentualnie `/en/` | – |
| **Strona** | Pojedynczy dokument pod jednym adresem URL | `page` |
| **Content Collection** | Katalog plików treści (Markdown/MDX + dane) z walidowanym schematem w Astro | `src/content/*` |
| **Frontmatter** | Blok metadanych na początku pliku `.md` (title, description, h1, oldUrl, newPath…) | – |
| **Slug / newPath** | Nowa, czysta ścieżka strony (bez `.html`, małe litery, bez polskich znaków) | `newPath` |
| **Stary URL** | Adres strony w WordPressie, zapisany jako `oldUrl` | `oldUrl` |
| **Alias WP** | Stary adres, który WordPress sam przekierowuje na inny | – |
| **Duplikat treści** | Dwa adresy z identyczną treścią. Zostaje jeden, drugi dostaje 301 | – |
| **Canonical** | Adres uznany za „prawdziwy" dla danej treści; crawler preferuje ten, na który WP już przekierowuje | `canonical` |
| **Crawler** | Skrypt `crawl.mjs` pobierający całą starą stronę | – |
| **Inwentarz URL-i** | `inventory.csv`: wszystkie stare adresy z typem, nową ścieżką i uwagami SEO | – |
| **Mapa 301 / `_redirects`** | Lista przekierowań starych adresów na nowe, w formacie Cloudflare Pages | – |
| **Staging** | Wersja testowa na `*.pages.dev` z `noindex`, do przeglądu przed startem | – |
| **Cutover** | Przełączenie DNS vitadentica.pl ze starej strony na nową | – |

## 3. SEO i widoczność w AI

| Termin | Znaczenie |
|---|---|
| **Local SEO** | Widoczność w wynikach lokalnych (Gocław, Praga Południe, Saska Kępa, Warszawa) |
| **NAP** | Name, Address, Phone. Identyczne wszędzie: strona, Google Business Profile, katalogi |
| **Core Web Vitals** | LCP (ładowanie), INP (reakcja), CLS (stabilność układu). Metryki szybkości wliczane do rankingu Google |
| **JSON-LD / schema.org** | Dane strukturalne w `<script type="application/ld+json">`; u nas `Dentist` (gabinet, adres, godziny) i `Physician` (lekarze) |
| **GEO / AEO** | Optymalizacja pod odpowiedzi AI: semantyczny HTML, jasne nagłówki, dane strukturalne, cytowalne fakty |
| **llms.txt** | Plik Markdown w korzeniu domeny: tytuł, krótki opis i lista linków do kluczowych stron. Standard eksperymentalny, bez gwarancji, że crawlery go czytają |
| **Wersja `.md` strony** | Każda strona dostępna także jako czysty Markdown pod adresem `<ścieżka>.md` |
| **llms-full.txt** | Cała treść serwisu w jednym pliku Markdown (dane gabinetu raz na początku, potem strony ze źródłem). Dla agentów, które wolą jedno pobranie niż osiem |
| **FAQPage** | Dane strukturalne pytań i odpowiedzi. Powstają z widocznej sekcji FAQ strony, nigdy z treści, której na stronie nie ma |
| **Karta Open Graph** | Obraz 1200×630 (`public/og-image.jpg`) pokazywany przy udostępnianiu linku i w podglądach asystentów AI |
| **Hasło reklamowe** | Slogan bez treści informacyjnej (np. „Stomatologia z głową”). W H1 zastępuje go opis: czym jest strona i gdzie (decyzja 23) |
| **Boty AI** | Crawlery firm AI (np. GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended). `robots.txt` ma je dopuszczać |
| **YMYL / E-E-A-T** | Strony medyczne podlegają surowszej ocenie jakości. Liczą się kwalifikacje lekarzy, aktualność i wiarygodność |

## 4. Technika i analityka

| Termin | Znaczenie |
|---|---|
| **Astro** | Framework SSG: strony budowane raz do statycznego HTML, domyślnie bez JS |
| **SSG** | Static Site Generation |
| **Cloudflare Pages** | Hosting i CDN dla wygenerowanej strony |
| **Tailwind CSS** | Utility-first CSS; po buildzie zostaje tylko używany CSS |
| **GTM** | Google Tag Manager, kontener `GTM-P7RZV8S` (obecny); ładowany z opóźnieniem |
| **Consent Mode v2** | Mechanizm Google: tagi dostosowują działanie do zgód użytkownika |
| **CMP** | Consent Management Platform: baner zgód. Wybrany: CookieConsent (orestbida) |
| **Zdarzenie konwersji** | `click_tel` / `click_mail`, wysyłane do GTM po kliknięciu linku kontaktowego |
