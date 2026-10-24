# Audyt treści Vitadentica: implanty, ortodoncja, SEO i odpowiedzi AI

## Zakres i status

Przegląd tekstów oraz sposobu ich publikacji w lokalnym projekcie `vitadentica2`, na gałęzi `main`. Obejmuje stronę główną, implanty, ortodoncję, Invisalign, cennik oraz wspierające treści zespołu, stomatologii ogólnej i kontaktu. Nie jest audytem pozycji domeny, danych Search Console, ruchu ani działającej produkcji. Frazy poniżej to propozycje przypisania tematów do stron, nie wynik pomiaru wolumenów wyszukiwania.

To propozycje, nie wdrożenie. Teksty strony i kod pozostają bez zmian. Ceny, aktualność oferty, kwalifikacje i organizację wizyt trzeba potwierdzić w gabinecie. Akapity medyczne wymagają akceptacji lekarzy, a promocje i obietnice efektów także oceny prawnej. Nie zakładam, że wcześniejsza publikacja informacji dowodzi jej aktualności.

## Wniosek

Strona główna przedstawia ogólny gabinet stomatologiczny. Implanty i ortodoncja występują jako elementy oferty, ale nie dominują w komunikacji. Podstrony usług mają dużo treści, jednak część miejsca zajmują ogólniki, powtórzenia i obietnice. Pacjent trudniej znajduje odpowiedzi: kto mnie będzie leczyć, czy ta metoda jest dla mnie, jak zacząć, ile zapłacę i czego mogę się obawiać.

Rekomendowany kierunek: **implanty i ortodoncja jako dwa główne obszary oferty; Invisalign jako metoda leczenia ortodontycznego; pozostała stomatologia jako zaplecze i osobna oferta.** Nie zmieniać gabinetu w komunikacji w placówkę świadczącą wyłącznie te dwie usługi.

Przekonywać do konsultacji poprzez konkrety i zmniejszanie niepewności. Zastąpić „najwyższy poziom”, „idealne rozwiązanie” i „nie czekaj” informacjami o lekarzu, kwalifikacji, etapach i cenie pierwszego kroku.

## 1. Najważniejsze problemy i poprawki

### P0 — zapewnienia medyczne i niejasne koszty

1. **Implanty: brak bólu i normalne funkcjonowanie następnego dnia.**
   - Miejsca: `src/content/pages/implanty.md:36`, `:54`, `:96`.
   - Tekst przedstawia przebieg jako przewidywalny dla każdego pacjenta. Dalsza część tej samej strony dopuszcza dolegliwości po zabiegu (`:92`).
   - Rozdzielić znieczulenie podczas zabiegu od rekonwalescencji. Nie porównywać bezwarunkowo inwazyjności implantacji i ekstrakcji.
   - Materiały Cambridge University Hospitals opisują możliwy dyskomfort i obrzęk po implantacji.[6]
   - Propozycja do akceptacji lekarza: „Zabieg wszczepienia implantu wykonujemy w znieczuleniu miejscowym. Po zabiegu mogą wystąpić ból, obrzęk lub tkliwość. Lekarz omówi zalecenia i przewidywany czas powrotu do codziennych zajęć, zależnie od zakresu leczenia.”

2. **Ortodoncja: odpowiedź „Nie” na pytanie, czy noszenie aparatu stałego boli.**
   - Miejsce: `src/content/pages/ortodoncja.md:74–76`; podobnie aparat wyjmowany w `:66–68`.
   - Zastąpić kategoryczne zaprzeczenie opisem możliwych odczuć. British Orthodontic Society wskazuje na dyskomfort na początku leczenia i po niektórych regulacjach aparatu.[5]
   - Propozycja do akceptacji lekarza: „Na początku leczenia oraz po regulacji aparatu może pojawić się tkliwość zębów i dyskomfort. Ich nasilenie jest indywidualne. Podczas wizyty omówimy, czego można się spodziewać i kiedy skontaktować się z gabinetem.”

3. **Cena implantu a koszt odbudowy zęba.**
   - Miejsca: `src/content/pages/implanty.md:12–14`; `src/data/price-list.json:3–49`.
   - Strona usługi zaczyna treść od grafiki promocji. Cennik osobno podaje konsultację 100 zł, implant Bego 2600 zł, koronę na podbudowie metalowej 1800 zł oraz pozycję „koszt całkowity” 4400 zł. To wartości zapisane w projekcie, nie potwierdzone ceny obowiązujące dziś.
   - Nie przedstawiać 2600 zł jako ceny całego zęba ani automatycznie uznawać 4400 zł za cenę obejmującą wszystkie badania i wizyty.
   - Dodać tekstową tabelę na stronie implantów: usługa, cena, co obejmuje, co może być rozliczane osobno. Wyjaśnić konsultację, diagnostykę, rodzaj korony, łącznik, odbudowę tymczasową, kontrole i ewentualne zabiegi dodatkowe. Opis łącznika występuje obecnie tylko przy jednej pozycji koron (`price-list.json:40`); zakres trzeba ujednoznacznić.
   - Źródłem cen powinien zostać istniejący plik danych, nie ręcznie kopiowane kwoty w kilku tekstach.

4. **Sprzeczność w nazwach systemów implantologicznych.**
   - `implanty.md:66`: Alpha-bio i Bego.
   - `price-list.json:10–81`: Bego i Straumann.
   - Potwierdzić rzeczywiście stosowane systemy i uzgodnić opis z cennikiem. Nie usuwać ani nie dopisywać marki na podstawie domysłu.

### P1 — utrata wiarygodności i słabe dopasowanie do decyzji pacjenta

5. **Ortodoncja zaczyna się od certyfikatów i statystyk o wyglądzie.**
   - Miejsca: `src/content/pages/ortodoncja.md:11–17`.
   - „1/10 sekundy”, „jedenaście sekund”, „83%” nie mają tu źródła i nie pomagają wybrać leczenia. Wprowadzają też presję związaną z oceną wyglądu.
   - Usunąć ten wstęp. Zacząć od grup pacjentów, dostępnych metod i pierwszej konsultacji. Szkolenia przenieść do biogramu lekarza i opisać tekstowo, jeśli są istotne i aktualne.

6. **Nadmierne obietnice efektów.**
   - `implanty.md:22`: „gwarantujemy … na najwyższym poziomie”.
   - `ortodoncja.md:23`: „Efektem będzie piękny i zdrowy uśmiech”.
   - `ortodoncja.md:31`, `nasz-zespol.md:22`: „najlepsze rezultaty”.
   - Zastąpić sprawdzalnym sposobem działania, np. „Plan leczenia ustalamy po badaniu i analizie potrzebnej dokumentacji”. Publikować tylko wtedy, gdy odzwierciedla to praktykę gabinetu.

7. **Invisalign jest przedstawiany jednostronnie.**
   - Miejsca: `src/content/pages/invisalign.md:24–32`, `:40–85`.
   - Do poprawy: „numer 1”, „nikt nie musi wiedzieć”, „100% przezroczyste”, „widzisz efekt końcowy”, „zero ograniczeń”, przeciwstawienie zalet nakładek samym wadom aparatów stałych.
   - Cyfrowy plan opisywać jako symulację planowanego przebiegu i rezultatu, nie gwarancję wyniku. Tę interpretację zatwierdza lekarz.
   - Porównanie powinno uwzględniać kwalifikację, regularność noszenia, higienę, możliwy dyskomfort i kontrole. Nie twierdzić, że aparat stały z definicji wyklucza cyfrowe planowanie.
   - Uzgodnić status „Experienced Provider”, nazwy dostępnych pakietów i ewentualne statystyki producenta. Bez aktualnego potwierdzenia nie eksponować ich jako dowodu jakości konkretnego gabinetu.
   - Nie pisać „skan 3D na miejscu”: obecne `invisalign.md:101` mówi o kierowaniu na skan.

8. **Sztuczna pilność.**
   - `invisalign.md:87`, `:147`, `:151`: ograniczona liczba terminów „w tym miesiącu” i „szybkie terminy”.
   - Statyczna strona nie potwierdza aktualnej dostępności. Usunąć presję; dać „Zapytaj o termin konsultacji”.
   - „Konsultacja bez zobowiązań” może zostać odczytana jako bezpłatna. Jeśli chodzi o brak obowiązku rozpoczęcia leczenia, napisać to wprost i podać cenę konsultacji po jej potwierdzeniu.

9. **Atuty lekarzy są słabo wykorzystane.**
   - Karta lekarza już istnieje na stronach usług (`src/pages/[...slug].astro:47`); nie trzeba jej dodawać od nowa.
   - `DoctorCard.astro:31` pokazuje pierwszą rolę. U Moniki Małek jest to ogólne „Lekarz stomatolog”, mimo że biogram opisuje leczenie ortodontyczne.
   - Dodać kontekst: „lek. dent. Monika Małek — leczenie ortodontyczne dzieci i dorosłych”. Nie dopisywać tytułu specjalisty ortodoncji bez potwierdzenia formalnych kwalifikacji.
   - Dla Radosława Zaniewicza eksponować potwierdzoną specjalizację chirurgii stomatologicznej oraz rolę w implantacji.
   - Biogramy zawierają „ponad 2000” zakończonych terapii i „ponad 3000” implantów (`team/monika-malek.md:16`, `team/radoslaw-zaniewicz.md:18`). Przed wyniesieniem tych liczb na stronę główną potwierdzić ich zakres, źródło i datę. Staż całego gabinetu nie jest automatycznie stażem każdej usługi.

10. **Brakuje odpowiedzi o organizacji i pełnym koszcie leczenia ortodontycznego.**
    - Obecne FAQ jest obszerne, ale pomija retencję na stronie ogólnej ortodoncji oraz czytelny opis kosztów całego procesu.
    - W cenniku są różne konsultacje: „ortodontyczna z modelami” 350 zł oraz konsultacja w kategorii ortodoncji dziecięcej 150 zł (`price-list.json:118–163`). Nie sprowadzać ich do jednej ceny „konsultacji ortodontycznej”.
    - Wyjaśnić różnice, cenę za jeden łuk, kontrole, diagnostykę, zdjęcie aparatu i retencję. Brakujące stawki zebrać od gabinetu, nie wyliczać z powietrza.

## 2. Nowa strona główna: propozycja tekstu i hierarchii

### Pierwszy ekran

Nadtytuł:

> Vitadentica · Gabinet stomatologiczny na Gocławiu

H1:

> Implanty i ortodoncja w Warszawie na Gocławiu

Tekst:

> Leczymy braki zębowe oraz wady zgryzu u dzieci i dorosłych. W gabinecie Vitadentica przy ul. Skalskiego 3 prowadzimy leczenie implantologiczne, leczenie aparatami stałymi i ruchomymi oraz nakładkami Invisalign®. Zacznij od konsultacji, podczas której omówisz z lekarzem swoją sytuację i dalsze kroki.

Główny przycisk:

> Zadzwoń i umów konsultację

Linki do dwóch głównych ścieżek:

> Leczenie implantami
> Leczenie ortodontyczne

E-mail pozostaje alternatywą kontaktu. Nie nazywać przejścia na `/kontakt` „rezerwacją online”, skoro w projekcie nie ma takiego mechanizmu.

### Dwie wyróżnione sekcje zamiast czterech równorzędnych kafli

**Implanty zębowe**

> Brakuje Ci jednego lub kilku zębów? Podczas konsultacji sprawdzimy możliwość odbudowy na implantach. Lekarz omówi potrzebną diagnostykę, a po kwalifikacji przedstawi plan leczenia i koszty poszczególnych etapów.

Link: „Sprawdź etapy i ceny leczenia implantami”.

**Ortodoncja dzieci i dorosłych**

> Chcesz skonsultować ustawienie zębów lub zgryz dziecka? W Vitadentica prowadzimy leczenie aparatami stałymi, ruchomymi i nakładkami Invisalign®. Dobór metody poprzedza ocena zgryzu i potrzebnej dokumentacji.

Link: „Poznaj metody leczenia ortodontycznego”.

Powyższe sformułowania dotyczące przebiegu konsultacji wymagają potwierdzenia organizacyjnego. Nie obiecują kompletnej wyceny ani planu na pierwszej wizycie bez diagnostyki.

### Dalsza kolejność strony

1. Dwa główne obszary leczenia.
2. Lekarze prowadzący: odpowiednie doświadczenie i linki do biogramów.
3. „Jak zacząć leczenie?” — kontakt, konsultacja, diagnostyka, omówienie planu.
4. Ceny pierwszych konsultacji, wyraźnie rozdzielone według zakresu.
5. „Pozostała opieka stomatologiczna” — krótko o leczeniu zachowawczym, kanałowym, higienizacji i protetyce; link do pełnej oferty.
6. Krótkie FAQ dotyczące pierwszej wizyty i kontaktu.
7. Adres, godziny, istniejąca mapa oraz CTA.

Zastąpić mało przydatną pacjentowi statystykę „działy oferty” (`src/pages/index.astro:25`) informacją o pierwszej konsultacji lub lekarzach. Nie usuwać pozostałych usług ani wartościowych podstron.

## 3. Podstrona implantów

### Proponowane otwarcie

H1:

> Implanty zębowe w Warszawie na Gocławiu

Wstęp:

> Implanty mogą służyć do odbudowy pojedynczego zęba, kilku braków lub podparcia protezy. W Vitadentica zabiegi implantacji wykonuje lek. dent. Radosław Zaniewicz, specjalista chirurgii stomatologicznej. Podczas konsultacji ocenia możliwość leczenia i wskazuje potrzebne badania. Plan odbudowy oraz jej koszt zależą od warunków w jamie ustnej i wybranego rozwiązania.

Pierwsze zdanie odpowiada opisowi zastosowań implantów w materiale CUH; pozostałe informacje o lekarzu i procedurze pochodzą z projektu i wymagają potwierdzenia w gabinecie.[6]

CTA: „Umów konsultację implantologiczną”.

### Kolejność sekcji

- Kiedy można rozważyć implanty i jakie są inne możliwości odbudowy?
- Kto wykonuje leczenie? Istniejąca karta lekarza, uzupełniona o istotne doświadczenie.
- Co obejmuje pierwsza konsultacja i ile kosztuje?
- Etapy: kwalifikacja i diagnostyka, zabieg, gojenie, odbudowa protetyczna, opieka po leczeniu.
- Ile kosztuje implant z koroną? Tabela z rozbiciem i zakresem.
- Znieczulenie, możliwe dolegliwości i rekonwalescencja.
- Brak kości, większe braki i bezzębie: osobne krótkie podsekcje, bez uniwersalnych obietnic liczby implantów.
- FAQ i zapis na konsultację.

### Pytania do wyeksponowania

- Ile kosztuje odbudowa jednego zęba na implancie i co obejmuje cena?
- Czy w mojej sytuacji można zastosować implant?
- Jakie badania będą potrzebne?
- Jak długo może trwać leczenie?
- Czy na czas gojenia można uzupełnić brakujący ząb?
- Czego spodziewać się po zabiegu?
- Jak dbać o implant i jak wyglądają kontrole?
- Czy leczenie można zaplanować, jeśli mieszkam za granicą?

Nie dopisywać po prostu kolejnego długiego FAQ. Przeredagować obecne pytania, skrócić odpowiedzi i usunąć powtórzenia. W opisach terminów i rozwiązań tymczasowych wskazać zależność od przypadku. Nie obiecywać każdemu korony tymczasowej ani identycznego harmonogramu.

## 4. Podstrona ortodoncji i rola Invisalign

### Proponowane otwarcie ortodoncji

H1:

> Ortodoncja dzieci i dorosłych — Warszawa Gocław

Wstęp:

> W gabinecie Vitadentica leczenie ortodontyczne prowadzi lek. dent. Monika Małek. Przyjmujemy dzieci, młodzież i dorosłych. Stosujemy aparaty stałe, ruchome oraz nakładki Invisalign®. Konsultacja służy ocenie zgryzu i ustaleniu dalszej diagnostyki, zanim zapadnie decyzja o wyborze aparatu.

CTA: „Umów konsultację ortodontyczną”.

### Kolejność sekcji

- Z czym zgłosić się na konsultację?
- Leczenie dorosłych oraz konsultacje dzieci — osobne, krótkie sekcje.
- Aparaty stałe, ruchome i nakładki: zastosowanie i ograniczenia, bez ogłaszania jednej metody najlepszą.
- Pierwsza wizyta: badanie, potrzebna dokumentacja, kolejne kroki.
- Jak powstaje plan i od czego zależy czas leczenia?
- Cennik: diagnostyka, aparat, kontrole, zakończenie leczenia, retencja.
- Retencja i opieka po zdjęciu aparatu — tekst zatwierdzony przez lekarza.
- Lekarz prowadzący, FAQ, kontakt.

Pytania priorytetowe: „Czy można rozpocząć leczenie w dorosłym wieku?”, „Aparat stały czy nakładki?”, „Co obejmuje koszt?”, „Jak często odbywają się kontrole?”, „Czy aparat może powodować dyskomfort?”, „Co dzieje się po zakończeniu leczenia?”.

Wiek pierwszej konsultacji i leczenia dziecka, wskazania do ekstrakcji, alergie oraz częstość kontroli powinien ponownie sprawdzić lekarz. Nie zastępować jednej kategorycznej reguły inną, zaczerpniętą z przypadkowej strony internetowej.

### Invisalign jako podstrona metody

Zachować `/invisalign`, ale powiązać ją czytelnie z ortodoncją. Nie musi być trzecim równorzędnym filarem całej marki.

H1:

> Invisalign® w Warszawie na Gocławiu — leczenie nakładkami

Propozycja wstępu:

> Invisalign® to metoda leczenia ortodontycznego z użyciem przezroczystych, zdejmowanych nakładek. W Vitadentica leczenie prowadzi lek. dent. Monika Małek. Podczas konsultacji ocenia możliwość zastosowania tej metody oraz potrzebną diagnostykę. Wybór nakładek zależy od sytuacji pacjenta, nie tylko od preferowanego wyglądu aparatu.

Tekst i informacje o kwalifikacji zatwierdza lekarz. Sekcje powinny wyjaśniać obowiązki pacjenta, ograniczenia, kontrole, koszty oraz retencję. Częstotliwości wymiany nakładek i kontroli nie przedstawiać jako identycznych dla każdego.

CTA:

> Chcesz sprawdzić, czy leczenie nakładkami jest dla Ciebie? Umów konsultację. Lekarz oceni zgryz i omówi dalsze kroki.

Usunąć powtarzane slogany, presję terminów i statystyki marki, które nie opisują doświadczenia tego gabinetu.

## 5. SEO: przypisanie tematów i metadane

Proponowane tytuły:

| Strona | Tytuł |
| --- | --- |
| `/` | Implanty i ortodoncja Warszawa Gocław — Vitadentica |
| `/implanty` | Implanty zębowe Warszawa Gocław — ceny i etapy \| Vitadentica |
| `/ortodoncja` | Ortodoncja Warszawa Gocław — dzieci i dorośli \| Vitadentica |
| `/invisalign` | Invisalign Warszawa Gocław — nakładki \| Vitadentica |
| `/cennik` | Cennik: implanty i ortodoncja Warszawa Gocław \| Vitadentica |

Proponowane opisy:

- Strona główna: „Implanty zębowe i ortodoncja dzieci oraz dorosłych w Vitadentica. Warszawa, Gocław, ul. Skalskiego 3. Poznaj lekarzy, metody leczenia i cennik.”
- Implanty: „Implanty zębowe w Warszawie na Gocławiu. Poznaj lekarza, etapy leczenia i ceny odbudowy na implantach. Umów konsultację w Vitadentica.”
- Ortodoncja: „Ortodoncja dzieci i dorosłych na Gocławiu w Warszawie. Aparaty stałe, ruchome i Invisalign. Poznaj przebieg konsultacji i cennik Vitadentica.”
- Invisalign: „Leczenie nakładkami Invisalign w Vitadentica na Gocławiu. Sprawdź, jak przebiega kwalifikacja i leczenie. Umów konsultację w Warszawie.”

To opisy proponowanej, uzupełnionej treści. Obietnicę informacji o cenach i etapach trzeba spełnić na stronie.

### Role stron i frazy do weryfikacji w Search Console

- Strona główna: marka, gabinet stomatologiczny na Gocławiu, przedstawienie implantów i ortodoncji.
- Implanty: „implanty Warszawa Gocław”, „implant z koroną cena”, „konsultacja implantologiczna”.
- Ortodoncja: „ortodoncja Gocław”, „aparat na zęby Gocław”, konsultacje dzieci i dorosłych. Zapytania „ortodonta Gocław” obserwować, ale nie dopisywać lekarzowi niepotwierdzonej specjalizacji.
- Invisalign: zapytania o markę i leczenie nakładkowe w tej lokalizacji.
- Cennik: ceny i zakres rozliczenia, linki do odpowiednich usług.

Nie zmieniać istniejących adresów URL tylko po to, aby dodać nazwę miasta. Zachować przekierowania migracyjne. Nie tworzyć kopii tej samej treści dla każdej dzielnicy.

### Lokalność i linkowanie

- Pierwszy ekran powinien wskazywać rzeczywistą lokalizację: Gocław, Warszawa. Nie sugerować kilku oddziałów.
- Obecna plakietka bierze „Gocław · Praga Południe · Saska Kępa” z `clinic.address.districts` (`index.astro:41`, `clinic.ts:88`). Rozdzielić adres od obszarów, z których dojeżdżają pacjenci. Sama nazwa „Osiedle Saska” nie powinna być używana jako zamiennik nazwy dzielnicy.
- Zachować mapę i nawigację. Dopisać wskazówki o wejściu, parkingu lub dostępności tylko po potwierdzeniu; nie wymyślać czasu dojazdu.
- Połączyć implanty i ortodoncję kontekstowo, np. sekcją „Leczenie ortodontyczne przed odbudową brakujących zębów”. Opis ma mówić o możliwym planowaniu łączonym, nie sugerować, że każdy potrzebuje obu terapii.
- Zamiast powtarzalnego „Zobacz więcej” używać „Etapy leczenia implantami”, „Aparaty i nakładki”, „Ceny konsultacji”.
- Dalsze materiały, dopiero po poprawieniu stron usług: koszt implantu z koroną, przygotowanie do konsultacji, aparat stały a nakładki, retencja, planowanie ortodoncji i odbudowy braków. Każdy materiał powinien odpowiadać na odrębne pytanie i mieć nadzór lekarza.

## 6. Widoczność w odpowiedziach AI

### Co już jest w projekcie

- Renderowane strony Astro z treścią tekstową.
- Canonical, metadane i dane strukturalne (`BaseLayout.astro`, `jsonld.ts`).
- Encje gabinetu i lekarzy; strony zabiegowe oznaczane jako `MedicalWebPage`.
- `FAQPage` generowane z sekcji pytań i odpowiedzi.
- Wersje `.md`, `llms.txt` i `llms-full.txt`.
- Produkcyjny `robots.txt` dopuszczający crawlery, w tym OAI-SearchBot; staging blokowany.

To ustalenia z kodu, nie potwierdzenie dostępności na aktualnej produkcji. Nie ma potrzeby przedstawiać tych elementów jako braków do wdrożenia.

### Co poprawić w treści

1. Na początku każdej usługi umieścić krótki, samodzielnie zrozumiały opis: gabinet, lokalizacja, usługa, lekarz i pierwszy krok.
2. Pytania formułować językiem pacjenta; odpowiadać od razu, potem podawać warunki i wyjątki. Nie narzucać długości tekstu wyłącznie pod algorytm.
3. Dodać widoczną informację o rzeczywistym autorze lub recenzencie medycznym oraz datę faktycznej weryfikacji. Istniejąca karta lekarza prowadzącego nie dowodzi, że lekarz zatwierdził tekst.
4. Powiązać treść z odpowiednią osobą także w danych strukturalnych. Obecne `buildWebPage` nie zawiera autora ani recenzenta (`jsonld.ts:140–153`); encje lekarzy na stronie głównej nie zastępują autorstwa konkretnego materiału.
5. Ujednolicić ceny, zakres usług, nazwiska, kwalifikacje, adres i aktualność między wszystkimi formatami.
6. Zastąpić nieprzypisane wypowiedzi „ja”, „moi pacjenci”, „wszczepiam” głosem gabinetu. Jeśli pozostaje osobista wypowiedź lekarza, wyraźnie ją podpisać.
7. Nie ukrywać informacji potrzebnych pacjentowi w plikach dla botów. Najpierw ma je zawierać widoczna strona.

Google zaleca dla swoich funkcji AI te same podstawy SEO: dostępność dla robotów, użyteczną treść, linkowanie wewnętrzne, ważne informacje w tekście i zgodność danych strukturalnych z treścią widoczną.[1] Wiarygodność ma szczególne znaczenie przy tematach zdrowotnych; E-E-A-T nie jest jednak pojedynczym, bezpośrednim czynnikiem rankingowym.[2]

### Ważne ograniczenia

- Google wyjaśnia, że `llms.txt` nie poprawia ani nie pogarsza widoczności i rankingów w Google Search. Można go utrzymywać dla innych systemów, ale nie przedstawiać go jako sposobu na uzyskanie rekomendacji AI.[3]
- Dokumentacja Google informuje o wycofaniu wyników rozszerzonych FAQ. Warto zachować przydatne pytania i odpowiedzi dla pacjentów; nie obiecywać dodatkowego miejsca w wynikach dzięki `FAQPage`.[3]
- OAI-SearchBot służy wyszukiwaniu w ChatGPT, a GPTBot dotyczy treningu. Zezwolenie na trening nie jest warunkiem udziału w wyszukiwaniu ChatGPT; ustawienia są niezależne.[4]
- Dostęp w `robots.txt` to nie wszystko: trzeba sprawdzić produkcyjny hosting/CDN. Google wymienia dostępność na poziomie CDN jako element podstaw technicznych.[1]
- Żadna z tych zmian nie gwarantuje cytowania ani polecania gabinetu przez model.

### Konkretna luka między HTML a Markdown

`entryMarkdown()` w `src/lib/page-markdown.ts:24–32` eksportuje treść pliku strony, ale nie dokłada karty lekarza z szablonu HTML. W `/implanty.md` może więc zabraknąć nazwiska, choć karta jest widoczna w HTML. Wstawienie jednoznacznej informacji o prowadzącym również do treści rozwiązuje problem na poziomie komunikacji; przy wdrożeniu można dodatkowo współdzielić metadane lekarza.

`homeMarkdown()` (`:35–55`) generuje głównie listę oferty i informacji, a nie pełną treść strony głównej. Nowe wstępy, informacje o konsultacji i inne ważne fakty trzeba świadomie przenieść także do tego eksportu. Nie zakładać automatycznej zgodności wszystkich formatów po zmianie samego `index.astro`.

## 7. Drobniejsze poprawki redakcyjne

- Wybrać jeden sposób zwracania się do pacjenta. Proponuję naturalne „Ty”, bez ciągłego powtarzania zaimków. Nie mieszać go z „Państwo” i anonimowym „ja”.
- Usunąć wersaliki w wezwaniach do kontaktu, np. „UMÓW WIZYTĘ … JUŻ DZIŚ”.
- Skrócić zdania i tłumaczyć terminy: „układ stomatognatyczny”, „osteointegracja”, „retencja”, „overdenture”.
- Poprawić „ilość zębów/implantów” na „liczbę”, literówki i interpunkcję. Ważniejsza od kosmetyki jest jednak precyzja znaczenia.
- Na stronie zespołu skrócić powtarzające się ogólniki o doświadczeniu; pozostawić konkretne kwalifikacje, zakres pracy i ludzkie, krótkie biogramy.
- W `stomatologia-ogolna.md:24`, `:31`, `:90` przejrzeć „niezawodne znieczulenie”, „najwyższej jakości”, „maksymalne bezpieczeństwo”.
- Potwierdzić aktualność medycyny estetycznej wymienionej w `stomatologia-ogolna.md:82–84`; nie eksponować jej w głównym przekazie dotyczącym implantów i ortodoncji.
- Doprecyzować obietnicę oddzwonienia w `CtaSection.astro:12`, jeśli gabinet nie obsługuje regularnie połączeń nieodebranych.

## 8. Kolejność wdrożenia i pomiar

### Etap 1 — fakty i bezpieczeństwo przekazu

- Potwierdzić aktualny cennik i zakres każdej konsultacji.
- Uzgodnić systemy implantologiczne i zakres pozycji „koszt całkowity”.
- Zweryfikować kwalifikacje, liczby przypadków i status Invisalign.
- Skorygować obietnice dotyczące bólu, rezultatów, dostępności i czasu leczenia.
- Zatwierdzić klinicznie FAQ, w tym zalecenia dotyczące dzieci, alergii, antybiotyków, retencji oraz rekonwalescencji. Audyt nie ustala schematów leczenia.

### Etap 2 — koncentracja na usługach

- Zmienić pierwszy ekran i hierarchię strony głównej.
- Przeredagować implanty oraz ortodoncję według przedstawionej struktury.
- Uzupełnić etapy, koszt pierwszego kroku i kontekst lekarza.
- Zmienić CTA na konsultacje odpowiedniej usługi.
- Przeredagować Invisalign jako metodę z zaletami i ograniczeniami.

### Etap 3 — spójność i weryfikacja techniczna

- Uzgodnić HTML, Markdown, dane strukturalne i `llms-full.txt`.
- Zaktualizować metadane oraz powiązania wewnętrzne.
- Przy wdrażaniu nowego H1 uzgodnić `docs/DECISIONS.md`, decyzję 23, oraz istniejące testy nagłówka. Obecny warunek „stomatolog…” + „Gocław” nie odpowiada proponowanemu H1; nie usuwać zabezpieczeń bez zastąpienia ich nowymi wymaganiami.
- Po zmianach uruchomić `npm run test`, `npm run check`, `npm run build` i `npm run verify`. W tym audycie nie wykonywano zmian aplikacji ani tych testów.
- Na produkcji sprawdzić indeksowanie głównych URL-i, canonical, dostęp robotów i rzeczywistą treść odpowiedzi.

### Jak mierzyć

- Przed wdrożeniem zapisać poziom wyświetleń, kliknięć i zapytań osobno dla implantów, ortodoncji i Invisalign.
- Rozdzielać ruch markowy od zapytań o usługi.
- Wykorzystać istniejące `phone_click`, `email_click` i `booking_click` (`src/scripts/contact-events.ts`) do analizy zainteresowania kontaktem na stronach usług. W razie potrzeby dodać kontekst usługi i miejsca CTA, bez danych medycznych użytkownika.
- Kliknięcie telefonu nie oznacza umówionej wizyty. Skuteczność biznesową sprawdzać również na podstawie zagregowanych danych rejestracji: liczby konsultacji implantologicznych i ortodontycznych.
- Porównywać okresy o podobnej długości, uwzględniając zmiany kampanii, sezonowość oraz dostępność terminów. Wzrost po publikacji nie jest sam w sobie dowodem, że wywołał go konkretny tekst.
- Obecność w odpowiedziach AI monitorować pomocniczo, zapisując pytanie, produkt i datę. Pojedynczej odpowiedzi modelu nie traktować jako stabilnej pozycji.

## Decyzja rekomendowana

Najpierw poprawić fakty, pierwszy ekran, opisy obu głównych usług i informacje o koszcie konsultacji. Nie zaczynać od masowej produkcji artykułów, kolejnych plików dla botów ani dokładania słów kluczowych. Obecny projekt ma już techniczne podstawy; największa luka leży w tym, co dokładnie komunikuje pacjentowi.
