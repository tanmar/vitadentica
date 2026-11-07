# Weryfikacja treści: co muszą potwierdzić lekarze i właściciel

Stan: teksty stron implantów, ortodoncji, Invisalign®, zespołu i strony głównej zostały przepisane według `docs/AUDYT-TRESCI-SEO-AI.md` (decyzja 25 w `docs/DECISIONS.md`). **Żaden tekst medyczny nie został zatwierdzony przez lekarza.** Poniżej wszystko, co pochodzi z poprzedniej strony albo z audytu i opisuje praktykę gabinetu: do potwierdzenia, poprawienia lub usunięcia przed publikacją na produkcji. Zmiana to edycja pliku w `src/content/pages/` (ceny: `src/data/price-list.json`).

## Wszystkie strony

- [ ] Ceny w `price-list.json` są aktualne, razem z cenami regularnymi (przekreślonymi) i promocjami; zakres każdej konsultacji.
- [ ] Godziny gabinetu (10:00–20:00, pon.–pt.; w `clinic.ts` jest TODO) oraz dni przyjęć lekarzy: Zaniewicz w piątki, Małek w środy i czwartki (karta lekarza pokazuje te dni).
- [ ] Obietnica „Ustalimy termin konsultacji” (strona główna) i „Zapytaj o termin konsultacji” (stopka kontaktowa): gabinet rzeczywiście odpowiada na telefon i e-mail.
- [ ] Zdanie „Konsultacja nie zobowiązuje do rozpoczęcia leczenia” (Invisalign®): zgodne z regulaminem gabinetu.
- [ ] Uczelnie lekarzy: zdanie o absolwentach WUM usunięto ze strony zespołu, bo biogramy podają różne uczelnie (m.in. Lublin, Śląski UM). Jeśli ma wrócić, wpisać prawdziwe dane.
- [x] Liczby w biogramach: ponad 8000 implantów (lek. dent. Radosław Zaniewicz) i ponad 2000 pacjentów z zakończonym leczeniem (lek. dent. Monika Małek), potwierdzone jako aktualne 2026-11-06. Strony usług ich nie powtarzają; landingi tak (hero i „Stawiamy na jakość”), więc przy aktualizacji zmienić biogram i `src/data/landing.ts`.
- [ ] Medycyna estetyczna na stronie stomatologii ogólnej (kwas hialuronowy, hydroksyapatyt wapnia, botoks): czy jest nadal w ofercie.

## Implanty (lek. dent. Radosław Zaniewicz)

- [ ] Kwalifikacje: Państwowy Egzamin Specjalizacyjny w 2014 r., pierwszy implant w 2009 r. (z biogramu).
- [ ] Systemy implantologiczne: strona wymienia tylko Bego i Straumann (z cennika). Dawny tekst podawał Alpha-bio i Bego. Które są używane?
- [ ] Co obejmuje „koszt całkowity” odbudowy zęba (badania, odbudowa tymczasowa, kontrole, łącznik) i której korony dotyczy (w danych suma zgadza się z koroną porcelanową na podbudowie metalowej: 2600 + 1800 oraz 3200 + 2200)? Notka o łączniku jest w cenniku tylko przy koronie pełnoceramicznej Bego.
- [ ] Czasy: wszczepienie pojedynczego implantu ok. 15–20 min; gojenie ok. 3 mies. (żuchwa) i ok. 5 mies. (szczęka); śruba gojąca ok. 2 tyg.; po wyciskach ok. 2 tyg. do korony; łącznie ok. 4 i ok. 6 mies.
- [ ] Przebieg po zabiegu: ból, obrzęk, tkliwość; „zwykle zmniejsza się w ciągu kilku dni” (dawny tekst: 3–5 dni); leki łagodzące; powrót do pracy (kilka dni przerwy przy pracy fizycznej lub z bezpośrednim kontaktem z ludźmi).
- [ ] Alternatywy omawiane na konsultacji (most na zębach własnych, proteza).
- [ ] Etap „Opieka po leczeniu”: higiena i terminy kontroli. Dawna strona tego nie opisywała; potrzebny tekst lekarza (pytanie z audytu: „Jak dbać o implant i jak wyglądają kontrole?”).
- [ ] Uzupełnienie tymczasowe na czas gojenia (korona tymczasowa): kiedy możliwe.
- [ ] Pacjenci zza granicy: szwy resorbowalne, wizyta po ok. 3 lub 5 mies., końcowy etap w ok. 2 tyg. albo 2–3 wizytach jednodniowych.
- [ ] Niedobór kości (odbudowa kością własną lub substytutami, overdenture), podniesienie dna zatoki, mniej implantów niż brakujących zębów, proteza na implantach (zasięg w szczęce).
- [ ] Materiał implantów: „zwykle z tytanu lub jego stopów”, uczulenia rzadkie; postępowanie przy alergii na leki.
- [ ] Grafika promocji zdjęta z początku strony (implant 2600 zł, korona 1800 zł): plik `src/assets/pages/implanty/promocja-implant-korona.png` zostaje w repo; ceny widać teraz w tabelach.

## Ortodoncja (lek. dent. Monika Małek)

- [ ] Kwalifikacje: WUM 2001, języki (polski, angielski, rosyjski), udział w szkoleniach. Bez tytułu specjalisty ortodoncji, dopóki nie jest potwierdzony. Baner z pięcioma certyfikatami szkoleń zdjęto (pliki `szkolenie-*.png` zostały w repo).
- [ ] Wiek: pierwsze badanie dziecka ok. 3 r.ż., kolejne ok. 5–6 i 11–12 r.ż.; aparaty ruchome od ok. 6–8 r.ż., noszone w nocy i 2–3 h w dzień; aparaty stałe najczęściej po 12 r.ż.
- [ ] Leczenie dorosłych, także starszych; mikroimplanty ortodontyczne i ich wpływ na ekstrakcje.
- [ ] Zamki wyłącznie bezniklowe (kryształowe i metalowe Ni-free), łuki beta-tytanowe przy alergii na nikiel.
- [ ] Założenie aparatu stałego trwa ok. godziny; dyskomfort „zwykle mija po kilku dniach”.
- [ ] Kontrole: „zwykle co kilka tygodni”, przy aparacie samoligaturującym ok. 8 tyg. (pacjenci z zagranicy).
- [ ] Diagnostyka: zdjęcie cefalometryczne, modele diagnostyczne, zdjęcia rentgenowskie, tomografia (zęby zatrzymane).
- [ ] Retencja: rodzaj, czas noszenia, koszt. Tekst na stronie jest ogólny i oparty na odpowiedzi z Invisalign®.
- [ ] Zakres cen: czy kontrole, zakończenie leczenia i retencja są wliczone w cenę aparatu; cennik ich nie ma. Która konsultacja (350 zł „z modelami” czy 150 zł) dotyczy dorosłych z nakładkami?
- [ ] Lista powodów zgłoszenia na konsultację (sekcja „Z czym zgłosić się…”) jest zestawiona z pytań i odpowiedzi tej strony; potwierdzić, że jest kompletna i trafna.
- [ ] Odpowiedzi o zębie zatrzymanym, braku zawiązków, koronie na zębie, ortodoncji przed protetyką: po skróceniu i usunięciu sformułowań „w znakomitej większości”, „jak po sznureczku”.
- [ ] Przebarwienia: stosowane są tylko aparaty kryształowe (zamki kompozytowe i porcelanowe nie).

## Invisalign®

- [ ] Status „Certified / Experienced Provider” i „autoryzowany gabinet” usunięto z tytułu, opisu i treści. Przywrócić tylko z aktualnym potwierdzeniem od Align Technology.
- [ ] Nazwy pakietów (Go, Lite, Full, First) i statystyki producenta (liczba pacjentów, lata) usunięto.
- [ ] Orientacyjny czas leczenia 6–12 i 12–24 mies.; zmiana nakładki co 1–2 tyg.; zalecane noszenie 20–22 h.
- [ ] Rozwiązania dla dzieci od ok. 6. r.ż.: czy gabinet je oferuje.
- [ ] Skan 3D: tekst mówi, że gabinet „kieruje na skan” (nie, że wykonuje go na miejscu).
- [ ] Porównanie z aparatem stałym: ogólne, bez przeciwstawiania zalet jednej metody wadom drugiej.
- [ ] Koszt konsultacji przed Invisalign®.

## Strony lądowania pod Google Ads (`/lp/implanty`, `/lp/ortodoncja`)

Landingi powtarzają fakty ze stron usług (czasy, kwalifikacje, kolejność etapów), więc każda poprawka na liście powyżej dotyczy też `src/data/landing.ts`. Dodatkowo do potwierdzenia:

- [ ] Odpowiedzi w FAQ na landingach (8 pytań na stronę, m.in. ból, powrót do pracy, rozłożenie leczenia w czasie, aparat a dyskomfort, usuwanie zębów): zgodność z praktyką lekarza.
- [ ] Sekcja „Stawiamy na jakość”: systemy Straumann i Bego, „plan i koszty przed startem”, „czas na rozmowę” (implanty); dobór metody po badaniu, plan na podstawie zdjęć i modeli zgryzu (ortodoncja).
- [ ] Ceny konsultacji na stronie ortodoncji: 350 zł dla dorosłych (z modelami) i 150 zł dla dziecka: które konsultacje dotyczą jakiej grupy (pozycja 12 otwartych spraw).
- [ ] Orientacyjne wieki w opisie metod ortodoncji (pierwsze badanie ok. 3. r. ż., aparaty ruchome od ok. 6–8 lat, aparaty stałe najczęściej po 12. r. ż.).
- [ ] Status „Rejestracja czynna dziś do 20:00”: godziny rejestracji telefonicznej równe godzinom gabinetu (pon.–pt. 10:00–20:00)?
- [ ] Wezwanie „Zadzwoń, napisz e-mail albo zostaw kontakt, a oddzwonimy” i obietnica „Odezwiemy się w godzinach pracy rejestracji”: kto odbiera zgłoszenia z formularza (e-mail na vitadentica@vitadentica.pl) i oddzwania.
- [ ] Formularz „Zostaw kontakt, oddzwonimy”: treść zgody i klauzuli informacyjnej (`src/components/landing/LpCallback.astro`): pełna nazwa i dane administratora, podstawa prawna, okres przechowywania (proponowane 30 dni), odbiorcy danych. Do zatwierdzenia przez gabinet i prawnika.

## Po zatwierdzeniu

- Poprawki wprowadzać w plikach treści, potem `npm test`, `npm run build`, `npm run verify`.
- Rozważyć widoczną informację o recenzencie i dacie weryfikacji oraz `reviewedBy` w danych strukturalnych (dziś brak takich pól: nie dodawać ich, dopóki nie ma prawdziwej recenzji).
