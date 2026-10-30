# English Levels Map (A1–C2)

Otwarta mapa umiejętności z angielskiego dla każdego: uczniów, nauczycieli i osób uczących się samodzielnie. Dla każdego poziomu CEFR (A1–C2) pokazuje, co warto umieć, a przy każdym punkcie podaje wyjaśnienie z przykładami i ćwiczeniem. Postęp odhacza się polem „Umiem”. Jest też zakładka z przygotowaniem do certyfikatu C1 Advanced.

Czysty HTML + CSS + JavaScript. Bez frameworków i bez kroku budowania; npm służy tylko do pobrania fontów, ikon i GSAP, których kopie są w `assets/`. Bez zewnętrznych CDN i bez internetu.

## Funkcje

- **Poziomy A1–C2** w lewym panelu z paskiem postępu. Każdy poziom ma trzy kategorie (Gramatyka i czasy, Funkcje komunikacyjne, Słownictwo), listę **Essentials** z polem „Umiem” i **podsumowanie poziomu**.
- **Podstrony niezbędnika** (110 punktów): zasada, tabele, przykłady, typowe błędy, ćwiczenie z ukrytymi odpowiedziami.
- **Strona główna** z opisem i tabelą poziomów.
- **Certyfikat C1:** strategie do każdej części egzaminu, 19 zestawów Use of English, które sprawdzają się same, trener Writing (timer, licznik słów) i trener Speaking (timery, nagrywanie). Trener mówienia jest też dla matury ustnej i B2 First, a dla E8 jako trening dodatkowy.
- **Dziś** (`#/dzis`, na górze lewego panelu): powtórki na dziś, seria nauki („Dni z rzędu”, „Najdłuższa seria”), ostatnie 7 dni, postęp na poziomach A1–C2, „Kontynuuj” (ostatnio otwarta podstrona), odliczanie do egzaminu C1 i skrót „Dodaj błąd”.
- **Szybki test poziomu** (`#/test-poziomu`): 12 pytań adaptacyjnych z puli 60 (gramatyka, słownictwo, czytanie), szacowany poziom (orientacyjnie), lista błędnych pytań z linkami do niezbędnika.
- **Dziennik błędów** (`#/bledy`) z powtórkami po 1, 3 i 7 dniach (`#/bledy/powtorki`) i plakietką liczby powtórek na dziś. Błędy z ćwiczeń Certyfikatu C1 i z testu poziomu można dodać jednym przyciskiem.
- **Menu profilu** (prawy górny róg): lista profili z przełączaniem, zmiana nazwy (✎), usuwanie z potwierdzeniem (✕), „+ Dodaj profil” oraz sekcja **Dane** (Eksportuj / Importuj / Resetuj).
- **Motyw jasny i ciemny** (przycisk obok menu profilu).
- Działa na telefonie, tablecie i komputerze (sprawdzane przy 360, 390, 768, 1024 i 1280 px).

## Uruchomienie

Kliknij dwukrotnie `index.html`. Strona działa bezpośrednio z dysku (`file://`) i na GitHub Pages (https://tiflejz5.github.io/english-levels-map/). Nie trzeba niczego instalować.

**Wygląd i zasoby:** zasady wizualne (tokeny, krainy A1–C2, typografia, ruch, dostępność, mikrotreści) opisuje [DESIGN.md](DESIGN.md). Fonty (Fraunces, Inter), ikony (Lucide) i GSAP pochodzą z npm, ale strona ich nie pobiera z sieci — kopie leżą w `assets/`. Po `npm install` lub aktualizacji paczek uruchom:

```bash
npm run zasoby
```

Kontrola kontrastu: `node tools/kontrast.js` sprawdza motyw jasny, ciemny i oba warianty sekcji Certyfikat C1.

**Kierunek wizualny w skrócie** (szczegóły w [DESIGN.md](DESIGN.md)):
- **Mapa podróży.** Poziomy to krainy w swoich kolorach, a postęp to szlak A1 → C2. Treść jest w typografii redakcyjnej: Fraunces w nagłówkach, Inter w tekście.
- **Tokeny.** Wszystkie kolory, rozmiary, promienie i czasy są zmiennymi CSS na początku `css/style.css`. Poza nimi nie ma kolorów wpisanych na sztywno. Zakładka C1 ma własne tokeny (`html[data-section="certyfikat"]`): kość słoniowa z granatem i złotem za dnia, północny granat ze złotem w nocy.
- **Ruch.** Proste rzeczy robi CSS. GSAP ładuje się na żądanie (tylko „Dziś”, wynik testu i gratulacje). Przy `prefers-reduced-motion` nie ma ruchu, a widok od razu pokazuje stan końcowy.
- **Dostępność.** WCAG AA w obu motywach, widoczny fokus, cele ≥ 44 px, kolor nigdy nie jest jedynym nośnikiem informacji, a nazwy dostępne zgadzają się z widocznym tekstem.
- **Biblioteki i licencje.** Fraunces i Inter (SIL OFL 1.1), Lucide (ISC), GSAP z wtyczkami DrawSVG i MotionPath (standardowa licencja GreenSock, bezpłatna). Wszystkie są kopiowane do `assets/`, bez CDN.
- **Callouty w treściach.** Sekcje takie jak „Najczęstsza pułapka”, „Na egzaminie C1”, „Kluczowe myśli”, „Co dalej” czy „Przykłady” są wyróżniane na podstawie tekstu nagłówka, a pliki `.md` zostają bez zmian. Nowy typ to wpis w `CALLOUT_RULES` w `js/callouts.js` i klasa `.callout-<typ>` w CSS (instrukcja w DESIGN.md, sekcja 3.7).

Do przebudowania danych podstron (po zmianie plików `.md`/`.json` w `niezbednik/`) potrzebny jest Node.js:

```bash
node tools/zbuduj-niezbednik.js
```

Instrukcja obsługi dla nauczyciela (po polsku): [docs/INSTRUKCJA.md](docs/INSTRUKCJA.md).

## Dziennik błędów i powtórki

- **Wpis:** kontekst / pytanie (wymagane), moja odpowiedź, poprawna odpowiedź (wymagana), reguła / dlaczego, źródło (np. „Arkusz 1 RUE, Part 4, pyt. 29”), kategoria (Use of English, Reading, Writing, Listening, Speaking, Gramatyka, Słownictwo, Inne) i opcjonalny punkt niezbędnika (wyszukiwalna lista z `niezbednik/index.json`; zapisujemy id, a we wpisie pokazujemy link).
- **Lista:** filtry „Do powtórki dziś”, „Wszystkie”, „Opanowane”, filtr kategorii, wyszukiwanie, edycja i usuwanie (z potwierdzeniem).
- **Harmonogram:** stała `REVIEW_STEPS = [1, 3, 7]` w `js/learning.js` (zmień tablicę, żeby zmienić odstępy). Nowy wpis ma pierwszą powtórkę jutro. „Wiedziałem(am)” przesuwa wpis na następny etap (licząc od dnia powtórki), po ostatnim etapie wpis jest „opanowany”. „Znowu błąd” cofa go do pierwszego etapu (jutro). Zaległe powtórki są po prostu „do zrobienia dziś”.
- **Ćwiczenia C1** (Part 1–4): przy błędnej, wpisanej odpowiedzi przycisk „Dodaj do dziennika błędów” otwiera formularz wstępnie wypełniony treścią zadania, odpowiedzią, poprawną odpowiedzią, wyjaśnieniem i nazwą zestawu. Nic nie zapisuje się bez „Zapisz”. To samo zadanie z tą samą odpowiedzią nie zostanie dodane drugi raz (pole `ref` wpisu).

## Seria nauki

Dzień nauki to dzień z co najmniej jedną aktywnością: zmiana „Umiem”, sprawdzone ćwiczenie C1, ukończona sesja powtórek, dodany wpis do dziennika, „Skończyłem” w trenerze Writing, timer trenera odliczony do końca albo ukończony test poziomu. Każde z tych miejsc wywołuje jedną funkcję `ELM.markActivity()`.

Zapisujemy wyłącznie listę dni aktywności profilu. Serię liczy `ELM.learn.streak()`: jeśli dziś jeszcze nie było aktywności, a wczoraj była, seria nadal trwa.

**Daty** to zawsze lokalny dzień użytkownika `RRRR-MM-DD` (bez godzin). Dzisiejszy dzień zwraca jedna funkcja `ELM.learn.today()`, którą w testach można podmienić.

## Szybki test poziomu

- Start na A2. Dobra odpowiedź → następne pytanie o poziom wyżej (maks. C2), błędna albo „Nie wiem” → o poziom niżej (min. A1). 12 pytań losowanych bez powtórzeń.
- Gdy pula pytań danego poziomu się skończy, test bierze pytanie z najbliższego poziomu (przy remisie w kierunku ruchu testu), ale **poziom docelowy** się nie zmienia. To on liczy się do wyniku, dzięki czemu przy małej puli wynik nie „odpływa”.
- Z puli poziomu test najpierw bierze pytania, których nie było w poprzednim podejściu (id z zapisanego wyniku), a spośród nich umiejętność, która w tym podejściu pojawiła się najrzadziej (remis → losowo). To opcjonalne parametry `ELM.learn.pickQuestion(…, { avoidIds, skillCounts })`; pytanie bez `skill` liczy się jak `grammar`.
- Wynik: średnia poziomów (docelowych) ostatnich 6 pytań, zaokrąglona w dół. Test niczego nie zaznacza jako „Umiem”. Ostatni wynik (data, poziom, odpowiedzi) jest zapisany w profilu i trafia do eksportu.

**Pytania** są w `niezbednik/test-poziomu/pytania.json`:

```json
{
  "version": 1,
  "questions": [
    {
      "id": "a1-01",
      "level": "A1",
      "skill": "grammar",
      "type": "multiple-choice",
      "question": "She ___ in a bank in Kraków.",
      "options": ["work", "works", "working", "is work"],
      "correct": 1,
      "explanation": "Wyjaśnienie po polsku.",
      "itemId": "a1-czasy-present-simple"
    }
  ]
}
```

- `id` musi być unikalne. `level` to jeden z A1–C2, `type` na razie tylko `multiple-choice`.
- `correct` to indeks poprawnej odpowiedzi w `options`, liczony od 0. `options` może mieć 2 lub więcej odpowiedzi.
- `itemId` jest opcjonalne. To id punktu z `niezbednik/index.json`, który w wyniku testu pojawi się jako link.
- `skill`: `grammar`, `vocabulary` albo `reading` (brak = `grammar`). Pula: 10 pytań na poziom – 5 gramatyka, 3 słownictwo, 2 czytanie; nowe pytania mają 4 opcje.
- `passage` (wymagane przy `reading`): krótki tekst nad pytaniem, A1–B1 30–80 słów, B2–C2 60–130 słów. W wyniku jest podział na umiejętności (procent dopiero od 3 pytań), a na liście błędów tekst jest zwijany.
- Format i wzór: `docs/rozbudowa-v6/spec/13-test-poziomu-i-testy-koncowe.md` (sekcja 1) i `docs/rozbudowa-v6/przyklady/test-poziomu/pytania-przyklad.json`.

**Jak dodać pytania:**

1. Dopisz pytania do `pytania.json` (docelowo 10 na poziom w proporcji 5/3/2).
2. Uruchom `node tools/zbuduj-niezbednik.js`. Skrypt sprawdza schemat, także `skill` i `passage`: błędne pytania pomija i wypisuje „UWAGA”, nieznane `itemId` usuwa (pytanie zostaje bez linku), ostrzega o braku `skill`, o długości tekstu i o poziomie z mniej niż 8 pytaniami albo bez którejś umiejętności, a na koniec wypisuje tabelę poziom × umiejętność. Potem tworzy `niezbednik/test-poziomu-dane.js`. Pełne sprawdzenie proporcji: `python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only test`.
3. Zwiększ `?v=…` w `index.html`.

## Testy końcowe poziomów A1–C2

Specyfikacja: `docs/rozbudowa-v6/spec/13-test-poziomu-i-testy-koncowe.md` (sekcja 2). Różnią się od szybkiego testu poziomu: sprawdzają **cały poziom**, nie szacują go.

- **Adres:** `#/a1/test` … `#/c2/test`. Karta „Test końcowy” jest pod podsumowaniem na stronie każdego poziomu. Ekran startowy pokazuje liczbę pytań, próg, najlepszy wynik i dzień zaliczenia. Test jest zawsze dostępny (nic go nie blokuje), a przy ≥ 70% „Umiem” na poziomie strona „Dziś” podpowiada „Gotowy na test końcowy A1?”.
- **Przebieg:** 20 zadań wylosowanych z puli 30, ok. 15 minut, tryb Egzamin w silniku zadań (wyjaśnienia dopiero na końcu), próg **80% punktów** (zadanie wielopunktowe liczy się jako jedno zadanie do losowania, ale próg liczony jest w punktach). Wynik: punkty i procent, „Zaliczony” / „Jeszcze nie”, podział na kategorie, lista podstron do powtórki (z linkami), przy porażce „Najwięcej błędów w: …” i zestawy do tych tematów. Błędy trafiają do Dziennika błędów jak w zwykłych zestawach (z „Cofnij wszystkie”). Test niczego nie zaznacza jako „Umiem”.
- **Losowanie** (`js/final-logic.js`, czysta funkcja z testami): każda kategoria podstron (czasy, gramatyka, funkcje komunikacyjne, słownictwo) jest reprezentowana proporcjonalnie do jej udziału w puli (metoda największych reszt, najmniej 1 zadanie), zadania jednej kategorii pochodzą z możliwie różnych podstron, a ten sam typ zadania nie występuje więcej niż dwa razy pod rząd.
- **Znaczek poziomu:** pierwsze zaliczenie zapisuje dzień (`passedAt`); znaczek zostaje po późniejszej porażce. Pieczątka (ikona nagrody w kółku, z tekstem dostępnym „A1 zaliczony 12.11.2026”) pojawia się na Szlaku na stronie „Dziś”, na kółku poziomu w lewym panelu, a w nagłówku strony poziomu jest etykieta „Zaliczony · 12.11.2026”. Kolor nie jest jedynym nośnikiem informacji. Gratulacje: kamień milowy `lvl-<poziom>-passed` (raz na profil). Ukończony test to dzień nauki (`markActivity`).
- **Dane profilu:** nowy klucz `elm_leveltests_v1` (patrz tabela kluczy), w eksporcie, imporcie (stary plik bez tego klucza zostawia dane tej przeglądarki), resecie i usunięciu profilu. Nie należy go mylić z `elm_leveltest_v1` (szybki test poziomu).
- **Pule pytań:** `niezbednik/testy-poziomow/<a1|a2|b1|b2|c1|c2>.json` to zwykły zestaw silnika zadań (spec 01 i 12) z polami `kind: "level-test"`, `draw: 20`, `passPercent: 80`, `defaultMode: "exam"` i **30 zadaniami**. Wymagania, które sprawdza `npm run validate`:
  - każde zadanie ma `topic` (id podstrony **tego** poziomu z `niezbednik/index.json`);
  - pula pokrywa co najmniej 70% podstron poziomu, ma zadania ze wszystkich kategorii i proporcje zbliżone do listy poziomu (ostrzeżenie przy odchyleniu > 2 zadań);
  - co najmniej połowa zadań to `multiple-choice` (funkcje komunikacyjne z `kind: "function"`), dalej `gap-fill`, `short-answer`, `match`, `reorder`, `transformation` (od B1), `translate` (od A2); **bez `dictation`** (test nie może zależeć od głosu).
- **Build:** `node tools/zbuduj-testy-koncowe.js` (część `npm run build` i `npm run dane`) zamienia pule na `niezbednik/testy-poziomow/<poziom>.js` (`ELM.LEVEL_TESTS["A1"]`, ładowane dopiero po wejściu na `#/a1/test`) i dopisuje do zadań kategorię podstrony (`category`). Pliki `.js` są generowane – nie edytuj ich ręcznie. Wzór: `docs/rozbudowa-v6/przyklady/testy-poziomow/a1-przyklad.json`. Pełne sprawdzenie: `python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only zadania,testy-koncowe`.

## Moje słowa (rozbudowa v6, etap 4)

Specyfikacja: `docs/rozbudowa-v6/spec/14-slowniczek-osobisty.md`. Osobisty słowniczek: zaznaczasz słowo albo wyrażenie w tekście, a aplikacja zapisuje je razem ze zdaniem, z którego pochodzi, jako kartę fiszek z luką.

- **Dodawanie:** zaznacz angielskie słowo lub wyrażenie (1–6 słów) i wybierz **„Do Moich słów”** w menu przy zaznaczeniu albo naciśnij **M** (bez modyfikatorów, poza polem tekstowym). Menu ma też „Utwórz fiszkę…” (dotychczasowy skrót Ctrl/Cmd+Shift+F). Na telefonie menu pojawia się pod zaznaczeniem. Toast po dodaniu ma przyciski „Dodaj znaczenie” (okno z jednym polem) i „Cofnij”. To samo słowo nie powstaje drugi raz: toast proponuje „Pokaż”, a przy innym zdaniu „Dodaj drugi przykład” (do 3 przykładów).
- **Zasięg zaznaczania:** podstrony Niezbędnika, podsumowania poziomów, strony egzaminów i Certyfikatu C1, Laboratorium czasów oraz teksty i transkrypty zadań (te dopiero po sprawdzeniu odpowiedzi). Polski tekst (także kolumna „Polski” w tabelach) nie jest proponowany do zapisu.
- **Zdanie:** `extractSentence` w `js/fiszki-logic.js` (czysta funkcja z testami w `tools/testy.js`) wycina zdanie z bloku tekstu, pomija skróty i inicjały, a długie zdanie skraca do ok. 220 znaków wokół słowa. `makeCloze` zamienia słowo na lukę.
- **Talia:** systemowa talia `u-moje-slowa` (`system: "words"`), domyślnie włączona w nauce. Karta bez znaczenia pokazuje podpowiedź pierwszej litery; tył ma znaczenie, dalsze przykłady i link do źródła.
- **Widok:** `#/fiszki/moje-slowa` – lista z wyszukiwaniem, sortowaniem (najnowsze, A–Z, najsłabiej znane), filtrem „bez znaczenia”, edycją znaczenia w miejscu, zawieszaniem, usuwaniem (z potwierdzeniem) i eksportem CSV (`słowo;znaczenie;zdanie;źródło`). Status słowa jest podany tekstem. Kafelek „Moje słowa” jest na stronie Fiszki, skrót „Moje słowa” w wyszukiwarce, a liczba słów (i opanowanych) w Statystykach.
- **Ustawienia nauki (menu profilu):** „Pokazuj menu przy zaznaczeniu tekstu” (domyślnie włączone) i „Podkreślaj moje słowa w tekstach” (domyślnie wyłączone; podkreśla do 300 najnowszych słów w tekstach, nie w nagłówkach, linkach, kodzie ani zadaniach, a znaczenie pokazuje po najechaniu lub fokusie).
- **Dane:** bez nowych kluczy localStorage. Karty są w `elm.<profil>.fiszki` (`userCards`), z opcjonalnymi polami `word`, `source` (`route`, `title`), `addedAt` i `examples`; starsze zapisy działają bez zmian. Preferencje `selectionMenu` i `highlightWords` są w `elm_learnprefs_v1`. Dodanie słowa nie jest dniem nauki (nie liczy się do serii).

## Talie tematyczne i egzaminacyjne (rozbudowa v6, etap 5)

Specyfikacja: `docs/rozbudowa-v6/spec/15-talie-tematyczne-i-egzaminacyjne.md`. Dziesięć nowych talii wbudowanych w formacie fiszek (spec 10); silnik fiszek się nie zmienia, dochodzą dane, oznaczenia egzaminów i kafelki.

- **Talie** (`dane/fiszki/<id>.json` + wpis w `dane/fiszki/index.json`, wszystkie domyślnie **wyłączone**): tematyczne A1–B1 (30–40 kart, ok. 60% `typed`, ok. 40% `cloze`, od A1 do B1): `temat-dom`, `temat-jedzenie`, `temat-praca`, `temat-podroze`, `temat-zdrowie`, `temat-emocje`, `temat-technologia`; egzaminacyjne: `egz-e8` (40 kart), `egz-matura` (50), `egz-b2-first` (50). Nowa talia = nowy plik JSON + wpis w indeksie, potem `node tools/zbuduj-fiszki.js` (część `npm run build`).
- **Chipy egzaminów** z tagów karty (bez nowego pola): `e8`, `mp`, `mr`, `matura` (= MP + MR), `b2`, `c1`. Na przodzie i tyle karty pokazują się małe chipy „E8”, „MP”, „MR”, „B2”, „C1” z podpisem „Przydatne na:”, tekstem dostępnym (np. „egzamin ósmoklasisty”) i podpowiedzią „Wyrażenia typowe dla zadań tego egzaminu. Oryginalne zdania, nie z arkuszy.” Chip znaczy „przydatne na tym egzaminie”, nie „było w arkuszu”. Działa też dla starszych kart z tagami (np. `slownictwo-podstawowe`). Logika: `ELM.fiszkiLogic.examsOf(card)` (z testami w `tools/testy.js`).
- **Przeglądanie talii:** filtr „Egzamin” (E8, MP, MR, B2, C1) w widoku kart talii, widoczny, gdy talia ma karty z tagami egzaminów.
- **Strony egzaminów:** na stronie „Przegląd” E8, MP, MR, B2 i Certyfikatu C1 jest kafelek „Fiszki do egzaminu” (nazwa talii, liczba kart, stan Nowe / W nauce / Opanowane i przycisk „Włącz i ucz się” albo „Ucz się”). Mapowanie: E8 → `egz-e8`, MP i MR → `egz-matura`, B2 → `egz-b2-first`, C1 → `czasowniki-frazowe` i `kolokacje`.
- **Poziomy A1–B1:** pod listą w kategorii „Słownictwo” jest link „Fiszki tematyczne: …” do widoku `#/fiszki/tematy/<a1|a2|b1>` (talie z kartami na danym poziomie; `#/fiszki/tematy` pokazuje wszystkie). W wyszukiwarce każda talia ma skrót po tytule.
- **Walidator:** `node tools/waliduj-fiszki.js` (część `npm run validate`) po starym sprawdzeniu z `scripts/validate_fiszki.py` sprawdza talie z spec 15: liczba kart w zakresie, `count` w `index.json`, id `<talia>-NNN`, dokładnie jedna luka w `cloze`, poziomy kart tematycznych (A1/A2/B1, kolejność niemalejąca), tag egzaminu na kartach egzaminacyjnych. Ostrzega (bez błędu) o duplikatach odpowiedzi między taliami, proporcjach typów i liczbie kolokacji. Pełne sprawdzenie: `python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only fiszki`.

## Ściągi poziomów i druk (rozbudowa v6, etap 6)

Specyfikacja: `docs/rozbudowa-v6/spec/16-sciagi-i-zycie-i-egzamin.md` (sekcja 1). Każdy poziom A1–C2 ma jednostronicową ściągę gotową do wydruku, a każda strona treści drukuje się bez interfejsu.

- **Adres i karta:** `#/a2/sciaga` (analogicznie dla pozostałych poziomów). Na stronie poziomu, pod listą i podsumowaniem, jest karta „Ściąga A2 – jedna strona do druku” z przyciskami **Otwórz** i **Drukuj** (Drukuj otwiera ściągę i od razu uruchamia okno druku). Na ekranie to zwykła strona treści z przyciskiem „Drukuj” nad treścią.
- **Treść:** `niezbednik/sciagi/<a1|a2|b1|b2|c1|c2>.md` (frontmatter: `id: sciaga-a2`, `level`, `title`, `summary`). Stałe nagłówki, bo steruje nimi układ druku: `## Czasy i formy` (na C1–C2 `## Struktury`) – tabela wzorów, maks. 8 wierszy; `## Gramatyka` – 4–8 punktów; `## Zwroty` – 10–16 par EN–PL; `## Słowa-sygnały` – tabela, maks. 10 wierszy; `## Uwaga na` – 5 błędów (✗ → ✓). Treść wynika wyłącznie z podstron tego poziomu; link `[[id]]` do podstrony na ekranie jest chipem, w druku znika. Walidacja: `python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only sciagi`.
- **Build:** `node tools/zbuduj-niezbednik.js` dołącza ściągi do `niezbednik/niezbednik-dane.js` (pole `sciagi`, obok `summaries`), a `node tools/zbuduj-szukaj.js` indeksuje je w wyszukiwarce jako „Ściąga A2”.
- **Druk wszystkich stron treści** (`css/print.css`, ładowany tylko do druku, oraz `js/print.js`): ukryty interfejs (panel, górny pasek, wyszukiwarka, przyciski, „Umiem”, notatki, „Sprawdź się”, toasty i okna), biały papier i czarny tekst – na czas druku `js/print.js` przełącza jasny motyw (także gdy w aplikacji jest ciemny), `@page` A4 z marginesem 12 mm, tabele i nagłówki bez rozrywania, linki bez adresów, odpowiedzi ukryte pod „Pokaż odpowiedzi” drukują się na końcu strony pod nagłówkiem „Odpowiedzi” mniejszym krojem.
- **Układ ściągi w druku:** dwie kolumny (odstęp 6 mm), nagłówek na całą szerokość z kodem poziomu (Fraunces), tabele bez przewijania, tekst 9,5–10 pt. Wymóg odbioru: **1 strona A4** na każdą ściągę; gdy treść się nie mieści, skracaj ją, nie zmniejszaj kroju poniżej 9,5 pt.
- **Kontrola jednej strony:** `node tools/sciagi-pdf.js` (narzędzie deweloperskie, **nie** część `npm run build`) drukuje każdą ściągę do PDF (domyślnie `tmp/sciagi-pdf/`, poza repozytorium), liczy strony i sprawdza najmniejszy krój. Wymaga Playwrighta (`npm i -D playwright-core` albo `npx playwright install chromium`) i przeglądarki Chromium, Edge lub Chrome; opcje: poziomy (`node tools/sciagi-pdf.js a2 b1`), `--out <folder>`, `--browser msedge|chrome`. Kod wyjścia 1, gdy któraś ściąga ma więcej niż 1 stronę.

## Życie i egzamin (rozbudowa v6, etap 7)

Specyfikacja: `docs/rozbudowa-v6/spec/16-sciagi-i-zycie-i-egzamin.md` (sekcja 2). Na każdej ze **110 podstron** Niezbędnika A1–C2 jest sekcja z parami: zdanie z życia i to samo zjawisko w zadaniu w stylu egzaminu.

- **Format** (Markdown, bez zmian w rendererze): `## Życie i egzamin` i tabela o 3 kolumnach i **3–4 wierszach** – „Z życia” (naturalne zdanie kursywą, tłumaczenie w nawiasie), „W stylu egzaminu” (typ zadania – Uzupełnij / Wybierz / Transformacja z KEY WORD / Przetłumacz fragment / Słowotwórstwo / Popraw błąd – treść, strzałka `→` i **pogrubiona odpowiedź**, jedna poprawna), „Egzamin” (kody rozdzielone ` · `). Sekcja stoi bezpośrednio po „Przykłady” (gdy jej nie ma – po pierwszej sekcji z wyjaśnieniem), zawsze przed „Typowe błędy Polaków” i „Ćwiczenie”.
- **Kody egzaminów zależą od poziomu podstrony:** A1–A2: E8, MP · B1: E8, MP, MR, B2 · B2: MP, MR, B2, C1 · C1: MR, B2, C1 · C2: C1. Zadania są oryginalne („w stylu”), nie z arkuszy CKE ani Cambridge; typ zadania pasuje do egzaminu z kolumny 3.
- **Wygląd** (`js/callouts.js`, reguła `real-exam` przed regułą „przykład”; `css/style.css`): callout z ikoną strzałek, w obu motywach (kontrast sprawdzony w `tools/kontrast.js`). Kody w trzeciej kolumnie zamieniane są na chipy w kolorze egzaminu z rejestru (`dane/egzaminy-rejestr.js`), z tekstem (skrót i pełna nazwa dla czytników) i linkiem do strony egzaminu. Poniżej 640 px tabela zamienia się w karty (wiersz = karta: „Z życia” nad „W stylu egzaminu”, chipy na dole), bez przewijania w poziomie. W druku (`css/print.css`) sekcja zostaje zwykłą tabelą.
- **Walidacja:** `node tools/waliduj-zycie.js` (część `npm run validate` i `npm run build`; te same reguły co część `zycie` w `docs/rozbudowa-v6/scripts/validate_v6.py`): dokładnie jedna sekcja na podstronę, miejsce w pliku, 3–4 wiersze po 3 kolumny, kursywa i nawias w kolumnie 1, `→ **odpowiedź**` w kolumnie 2, kody dozwolone dla poziomu. Ostrzega o tej samej odpowiedzi w jednej tabeli i o braku typu zadania na początku kolumny 2. Pełne sprawdzenie: `python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only zycie`.
- **Dodawanie lub zmiana:** edytuj sekcję w pliku `niezbednik/<poziom>/<podstrona>.md` (nie zmieniaj innych sekcji), potem `node tools/zbuduj-niezbednik.js` i zwiększ `?v=…` w `index.html`.

## Pisanie: wzorcowe wypracowania z komentarzami (rozbudowa v6, etap 8)

Specyfikacja: `docs/rozbudowa-v6/spec/17-pisanie-wzorce-i-zwroty.md` (sekcje 1, 3, 4). W lewym panelu jest pozycja **Pisanie** (między Fiszkami a Statystykami); bank zwrotów (sekcja 2 specyfikacji) opisuje następna sekcja.

- **Adresy:** `#/pisanie` – lista wzorców pogrupowana po egzaminie i gatunku (tytuł, gatunek, liczba słów, liczba komentarzy); `#/pisanie/wzorce/<egzamin>/<id zadania>` – wzorzec z komentarzami (np. `#/pisanie/wzorce/matura-rozszerzona/essay-phones`). Wzorce są też w wyszukiwarce („Wzorcowe wypracowania” i każdy wzorzec osobno).
- **Dane:** komentarze są **przy zadaniu** w `niezbednik/<egzamin>/trening/pisanie.json` w opcjonalnym polu `modelNotes` (`summary`: 3–5 zdań „dlaczego to działa”, `annotations`: `anchor`, `type`, `criterion`, `note`, opcjonalnie `element`). Tekstów `model` **nie zmieniamy**, bo kotwice muszą pasować. Komentarze mają wzorce E8 (6), matury podstawowej (6), matury rozszerzonej (4), B2 First (7) i C1 (5 nowych, 220–260 słów, razem z kryteriami Cambridge w `rubric`).
- **Typy komentarzy** (ikona i nazwa w komentarzu, kolor tylko jako dodatek): `punkty` (realizacja polecenia, z numerem elementu), `lacznik`, `rejestr`, `struktura` (kompozycja), `zakres` (zakres językowy), `uwaga` (do poprawy – pokazuje realną słabość tekstu). W każdym tekście są wszystkie sześć typów; liczba komentarzy: E8 i MP 6–9, MR i B2 8–12, C1 10–14.
- **Widok:** na komputerze (≥ 1024 px) tekst w kolumnie ok. 66 znaków, komentarze w prawym marginesie na wysokości kotwic (przy kolizji przesuwają się w dół, cienka linia łączy je z kotwicą); na węższych ekranach kotwica ma numer, a dotknięcie rozwija komentarz pod akapitem (drugi raz zwija). Pasek filtrów typów (np. tylko „Łącznik”), „Ukryj komentarze”, legenda, pod tekstem „Dlaczego to działa” i tabela kryteriów z liczbą komentarzy. Klawiatura: Tab po kotwicach, Enter lub spacja pokazuje komentarz, Escape zwija; `aria-describedby` łączy kotwicę z komentarzem. Zaznaczanie tekstu otwiera menu Moich słów (`data-fc-selectable`). Druk: tekst z numerami i komentarze jako przypisy pod tekstem (`css/print.css`). Kod: `js/pisanie.js` (lista, dane) i `js/pisanie-wzorzec.js` (widok).
- **Linki:** w trenerze pisania (E8, matury, B2, C1) zadanie z `modelNotes` ma przycisk „Wzorzec z komentarzami” (obok dotychczasowego pokazywania wzorca), a na stronach „Wypowiedź pisemna” i „Writing” egzaminów kod dodaje sekcję „Wzorce z komentarzami” (bez edycji plików `.md`).
- **Walidacja:** `node tools/waliduj-wzorce.js` (część `npm run validate` i `npm run build`; te same reguły co część `wzorce` w `docs/rozbudowa-v6/scripts/validate_v6.py`): kotwica występuje w `model` dokładnie raz, ma 3–15 słów i nie nakłada się na inne; `type` i `criterion` z list; `note` do 220 znaków; liczba komentarzy w zakresie egzaminu; wszystkie typy w tekście; wzorce C1 mają 220–260 słów, a plik co najmniej 5. Pełne sprawdzenie: `python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only wzorce`.
- **Dodawanie wzorca lub komentarzy:** dopisz `model` (dla C1) i `modelNotes` w `pisanie.json` danego egzaminu, uruchom `npm run build` i zwiększ `?v=…` w `index.html`.

## Pisanie: bank zwrotów (rozbudowa v6, etap 9)

Specyfikacja: `docs/rozbudowa-v6/spec/17-pisanie-wzorce-i-zwroty.md` (sekcja 2). Zwroty do pisania są pogrupowane według funkcji (14 grup, 179 zwrotów).

- **Adres:** `#/pisanie/zwroty` (link z listy `#/pisanie`); `#/pisanie/zwroty/<grupa>` przewija do grupy (np. `#/pisanie/zwroty/kontrargument`). W wyszukiwarce jest „Bank zwrotów do pisania” i każda grupa (wyszukiwanie po tekście zwrotów, także po polsku).
- **Dane:** `dane/pisanie/zwroty.json` (źródło do edycji) → `npm run build` → `dane/pisanie/zwroty-dane.js` (`ELM.ZWROTY`, ładowany dopiero po wejściu do banku lub otwarciu panelu w trenerze, działa też z `file://`). Grupa: `id`, `label`, `description`, `genres` (z: email, letter, blog, forum, essay, article, review, report, proposal, story), `phrases`. Zwrot: `id` (`<grupa>-NN`), `en`, `pl`, `level` (B1/B2/C1), `register` (formal/neutral/informal), opcjonalnie `example`, `note` (do 200 znaków), `genres` (podzbiór gatunków grupy). Znak „…” w `en` oznacza miejsce na resztę zdania; przy kopiowaniu i wstawianiu obcinany jest tylko wielokropek na końcu.
- **Widok:** filtry poziomu (B1/B2/C1 z przełącznikiem „do tego poziomu włącznie”), rejestru i gatunku, wyszukiwanie po angielsku i po polsku (także bez polskich znaków), „Tylko ulubione”, spis grup (na komputerze przyklejony z lewej, na telefonie poziomy pasek). Przy zwrocie: EN pogrubione, PL pod spodem, poziom i rejestr jako tekst, rozwijany „Przykład i uwaga”, przyciski **Kopiuj**, **Do Moich słów** (zwykła karta PL → EN w talii „Moje słowa” ze źródłem „Bank zwrotów”, bez duplikatów) i **Ulubione**.
- **Ulubione:** klucz `elm_phrases_v1` (tabela kluczy niżej), per profil, w eksporcie, imporcie, resecie i przy usunięciu profilu (`ELM.profileData.starredPhrases()`, `togglePhraseStar(id)`; limit 500).
- **Trener pisania:** w trenerach wszystkich egzaminów (E8, matury, B2, C1) przycisk **Zwroty** otwiera panel (na komputerze z boku, na telefonie jako arkusz od dołu) ze zwrotami pasującymi do gatunku zadania i poziomu egzaminu (E8 i matura podstawowa: B1; matura rozszerzona i B2: B1–B2; C1: wszystkie). **Wstaw** wkłada zwrot w miejscu kursora (zastępuje zaznaczenie), fokus wraca do pola, a Ctrl+Z cofa wstawienie (`insertText`, awaryjnie `setRangeText`). Escape zamyka panel. Kod: `js/pisanie-zwroty.js`, `js/writing-trainer.js` (`cfg.examId`).
- **Walidacja:** `node tools/waliduj-zwroty.js` (część `npm run validate` i `npm run build`; te same reguły co część `zwroty` w `docs/rozbudowa-v6/scripts/validate_v6.py`): min. 14 grup, 8–14 zwrotów w grupie, 140–180 razem, unikalne id i `en`, poprawne listy gatunków, poziomów i rejestrów.
- **Dodawanie zwrotów:** dopisz je w `zwroty.json` (kolejny numer `<grupa>-NN`; nie zmieniaj istniejących id – to klucze ulubionych), uruchom `npm run build` i zwiększ `?v=…` w `index.html`.

## Trener mówienia: matura ustna, B2 i trening E8 (rozbudowa v6, etap 10)

Specyfikacja: `docs/rozbudowa-v6/spec/18-trener-mowienia.md`. Jeden silnik (`js/speaking-trainer.js`) obsługuje trzy formaty danych `trening/mowienie.json` (pole `format`).

- **Adresy:** `#/matura-podstawowa/trening-mowienie` (trener matury ustnej; matura ustna jest jedna dla poziomu podstawowego i rozszerzonego, więc dane są w module MP, a matura rozszerzona ma link na stronie „Matura ustna”), `#/certyfikat-b2/trening-mowienie` (B2 First Speaking), `#/egzamin-osmoklasisty/trening-mowienie` („Mówienie A2 – trening dodatkowy”; **na egzaminie ósmoklasisty nie ma części ustnej**, co trener i strona przeglądu mówią wprost). C1 ma osobny trener (`js/c1-speaking.js`).
- **Formaty:** `"matura"` (`intro`: 10 grup × 3–4 pytania; `roleplay`, `picture`, `choice`: po 12 kart; karta roleplay: `situation`, 4 × `elements`, 4–6 × `examinerLines`, `usefulPhrases`; picture: opis ilustracji 40–80 słów i 3 pytania; choice: 3 opcje, 2 kryteria, 2 pytania), `"simple"` (`cards`: 24 karty `opis` / `sytuacja` / `opinia` po 8, 2–4 pytania, `seconds` 60–90) oraz B2 bez pola `format` (`part1`–`part4`: 10 / 14 / 10 / 10; **każda karta ma `id`**). Czasy matury są orientacyjne i edytowalne w pliku; trener nie podaje punktów CKE.
- **Losowanie bez powtórek:** „Losuj” wybiera kartę, której profil nie widział w tym cyklu; po wyczerpaniu puli komunikat i nowy cykl. Widziane karty: opcjonalne pole `seen` w `elm_speaking_v1` (poniżej). Bez profilu licznik działa tylko do zamknięcia karty.
- **Egzaminator czyta:** przełącznik czyta pytania i kwestie egzaminatora syntezatorem (`en-GB`, tempo 0,9, ten sam sposób co zadania słuchania); w rozmowie z odgrywaniem roli kolejne kwestie pojawiają się przyciskiem „Dalej”. Bez głosu angielskiego przełącznik jest nieaktywny.
- **Nagrywanie:** wspólny `js/recorder.js` (C1, B2, matura, E8): Nagraj / Zatrzymaj, do 3 prób na kartę z odtwarzaczem, Usuń, Pobierz (`mowienie-<egzamin>-<karta>-<data>.webm`/`.m4a`), „Nagrywaj razem z timerem” (start timera = start nagrania, koniec czasu = stop), wskaźnik „Nagrywanie 0:23”. **Nagrania nie trafiają do localStorage ani do sieci**; znikają po zmianie karty lub widoku. Brak mikrofonu, odmowa albo brak MediaRecorder dają komunikat, a trener działa dalej.
- **Cały egzamin (matura i B2):** losuje po jednej karcie z każdej części, prowadzi przez nie po kolei z timerami i nagrywaniem, na końcu pokazuje odsłuch nagrań i samoocenę (zapis sesji z `full: true`).
- **Samoocena:** kryteria z pliku (matura: realizacja zadania, zakres, poprawność, wymowa i płynność; E8: pełne zdania, powód lub przykład, płynność; B2 bez zmian), 1–5, historia sesji per profil.
- **Walidacja:** `node tools/waliduj-mowienie.js` (część `npm run validate` i `npm run build`; te same reguły co część `mowienie` w `docs/rozbudowa-v6/scripts/validate_v6.py`): unikalne id, liczby elementów, długości opisów, minimalne pule, id w B2.
- **Dodawanie kart:** dopisz karty w `mowienie.json` (unikalne `id`, nie zmieniaj istniejących – są kluczami w `seen`), uruchom `npm run build`, zwiększ `?v=…` w `index.html`.

## Testy

```bash
node tools/testy.js
```

Bez frameworka i bez npm. Skrypt testuje czystą logikę z `js/learning.js`: daty (także zmianę czasu), harmonogram powtórek, serię nauki i algorytm testu poziomu.

## Profile i menu profilu

W aplikacji nie ma żadnych wbudowanych profili. Przy pierwszym otwarciu pojawia się ekran powitalny z polem „Nazwa profilu”. Profil to osoba albo grupa (np. klasa), której postęp chcesz śledzić. Każdy profil ma własne zaznaczenia „Umiem”.

Menu profilu otwiera się kliknięciem lub tapnięciem (na komputerze z myszą także po najechaniu; zamyka się z krótkim opóźnieniem po zjechaniu kursorem). Zamyka je klik poza menu, klawisz Esc albo wybór akcji, a fokus wraca na przycisk. Po menu można chodzić strzałkami, Home i End. Wszystkie cele dotykowe mają co najmniej 44 × 44 px, a menu nie wychodzi poza ekran.

Nazwa profilu: spacje na początku i końcu są obcinane, najwyżej 30 znaków, bez duplikatów (wielkość liter nie ma znaczenia). Enter zatwierdza, Esc anuluje. Nowy profil od razu staje się aktywny.

## Motywy

- Trzy ustawienia, przełączane po kolei przyciskiem obok menu profilu: **Automatycznie** (jak w systemie, `prefers-color-scheme`) → **Jasny** → **Ciemny**. Ikona i podpowiedź pokazują bieżące ustawienie i następne.
- W trybie „Automatycznie” strona reaguje na zmianę ustawienia systemu na żywo.
- Wybór zapisuje się w `localStorage` pod kluczem `elm_theme_v1`, **globalnie dla urządzenia**: nie jest częścią profilu ani pliku eksportu.
- Mały skrypt w `<head>` (`index.html`) ustawia `data-theme` na `<html>`, zanim strona się narysuje, więc nie ma błysku złego motywu. Ustawia też `meta theme-color`, a `color-scheme` dopasowuje pola formularzy i paski przewijania.
- Wszystkie kolory, typografia, odstępy, promienie, cienie i czasy animacji są **zmiennymi CSS** (design tokens) na początku `css/style.css`. Poza blokami tokenów żaden kolor nie jest wpisany na sztywno. Kontrast obu motywów spełnia WCAG AA (tekst 4,5:1, komponenty i obramowania 3:1).
- Animacje trwają 150–250 ms, są w czystym CSS i używają tylko `opacity` i `transform` (znacznik „Umiem”, pasek postępu, wejście strony, menu, okna). Wyjątkiem jest krótkie przejście kolorów przy zmianie motywu. Przy `prefers-reduced-motion: reduce` animacje są wyłączone.

## Dane

**Prywatność:** aplikacja nie ma kont, serwera ani bazy danych. Profile, zaznaczenia „Umiem”, wyniki ćwiczeń, szkice wypracowań i data egzaminu zapisują się **tylko lokalnie w Twojej przeglądarce** (localStorage) i nigdzie nie są wysyłane. Każda przeglądarka i każde urządzenie ma osobne dane. Kopię zapasową zrobisz w menu profilu: **Dane → Eksportuj dane**.

| Klucz localStorage | Zawartość |
|---|---|
| `elm_content_v1`  | treści listy: `{ version, categories[], levels[] }` |
| `elm_profiles_v1` | profile: `{ version: 2, activeId, profiles: [{ id, name, progress: { "<id punktu essentials>": true } }] }` (lista może być pusta) |
| `elm_progress_v1` | stary zapis postępu (sprzed profili); jeśli ma zaznaczenia, przy pierwszym starcie trafia do nowego profilu „Mój profil” |
| `elm_c1_v1`       | zakładka „Certyfikat C1”: data egzaminu, najlepsze wyniki, szkice Writing, listy zadań |
| `elm_ui_v1`       | tylko wygoda: wybrany poziom i kategoria |
| `elm_theme_v1`    | motyw: `"auto"`, `"light"` albo `"dark"` (globalnie dla urządzenia) |
| `elm_celebrated_v1` | pokazane gratulacje kamieni milowych **per profil**: `{ version: 1, profiles: { <id>: { ids: [...] } } }` (w eksporcie, imporcie i resecie) |
| `elm_sidebar_v1`  | lewy panel przypięty: `{ version: 1, pinned: true / false }` (globalnie dla urządzenia, poza eksportem) |
| `elm_journal_v1`  | dziennik błędów **per profil**: `{ version: 1, profiles: { <id profilu>: { entries: [wpis…] } } }` |
| `elm_activity_v1` | dni nauki **per profil**: `{ version: 1, profiles: { <id>: { days: ["RRRR-MM-DD"…], lastPage: { hash, title } } } }` |
| `elm_leveltest_v1`| ostatni wynik testu poziomu **per profil**: `{ version: 1, profiles: { <id>: { last: { date, level, answers } } } }` |
| `elm_speaking_v1` | historia sesji trenerów mówienia **per profil**: `{ version: 1, profiles: { <id>: { sessions: [ { day, exam, part: 1–4, scores: { <kryterium>: 1–5 }, full?: true } ], seen?: { "<egzamin>:<część>": [ "<id karty>", … ] } } } }`; `seen` (opcjonalne, maks. 40 kluczy × 200 id) to karty widziane w bieżącym cyklu losowania, `full` oznacza tryb „Cały egzamin”; stary zapis bez tych pól działa; w eksporcie, imporcie, resecie i przy usunięciu profilu |
| `elm_phrases_v1` | ulubione zwroty z banku zwrotów **per profil** (paczka v6): `{ version: 1, profiles: { <id>: { starred: [ "opinia-05", … ] } } }`; id z `dane/pisanie/zwroty.json`, maks. 500; w eksporcie, imporcie, resecie, usunięcie profilu usuwa jego dane |
| `elm_leveltests_v1` | testy końcowe poziomów i znaczki **per profil** (paczka v6): `{ version: 1, profiles: { <id>: { levels: { "A1": { passedAt: "RRRR-MM-DD" \| null, best: { score, total, date }, last: { score, total, date } } } } } }`; `passedAt` = dzień pierwszego zaliczenia (w eksporcie, imporcie, resecie, usunięcie profilu usuwa jego dane) |
| `elm_exercises_v1`| wyniki zestawów ćwiczeń **per profil**: `{ version: 1, profiles: { <id>: { sets: { <id zestawu lub mixu>: { best, last, recent } }, lastMix: [id zadań…], dismissed: { <id zestawu>: dzień } } } }`, gdzie `best` / `last` = `{ score, total, date }`, `recent` — ostatnie 5 wyników (sugestia „Umiem”), `dismissed` — „Nie teraz” przy sugestii (w eksporcie, imporcie i resecie) |
| `elm_attempts_v1` | dziennik podejść **per profil**: każda odpowiedź w zadaniach `{ t, day, itemId, setId, topic, level, type, tags, correct, mode, answer }` (zadania za kilka punktów mają dodatkowo opcjonalne `points` i `max`; pominięte dyktando nie trafia do dziennika); bufor 3000 wpisów, starsze w `aggregates` (`{ n, ok, topic, type, level }` na zadanie) |
| `elm_autojournal_v1` | błędy dodane automatycznie do Dziennika błędów **per profil**: `{ items: { <id zadania>: { entryId, created, wrongCount, lastWrongAt, returned } } }`; sam wpis jest w `elm_journal_v1` (bez zmiany formatu, łączy go `ref = "ex:<id zadania>"`) |
| `elm_learnprefs_v1` | ustawienia nauki **per profil**: `{ autoJournal: true / false }` (menu profilu → Ustawienia nauki) |
| `elm_notes_v1`    | notatki **per profil**: `{ items: { <klucz strony>: { text, updatedAt, title, route } } }`, zwykły tekst ≤ 10 000 znaków |
| `elm_exams_v1`    | egzaminy z rejestru (nie C1) **per profil**: `{ exams: { <id egzaminu>: { examDate, drafts: { <zadanie>: tekst }, tasks: { <strona>: { <nr>: true } } } } }` (w eksporcie, imporcie i resecie) |
| `elm_search_recent_v1` | ostatnie wyszukiwania `{ version: 1, items: [...] }` (globalnie dla urządzenia, poza eksportem, czyszczone przez „Resetuj dane”) |

Wpis dziennika: `{ id, createdAt: "RRRR-MM-DD", context, myAnswer, correct, rule, source, category, itemId, ref, review: { stage, due, mastered } }`. Przy zapisie i imporcie pola są sprawdzane i przycinane (np. kontekst do 2000 znaków, odpowiedzi do 1000, źródło do 200). Wpisy bez kontekstu albo poprawnej odpowiedzi są odrzucane. Usunięcie profilu usuwa też jego dziennik, serię i wynik testu.

Każdy dostęp do localStorage jest w `try/catch`. Bez dostępu do pamięci aplikacja działa do zamknięcia karty.

**Menu „Dane”:**

| Opcja | Co robi |
|---|---|
| **Eksportuj dane** | pobiera jeden plik `english-levels-dane-RRRR-MM-DD.json` z treściami listy, wszystkimi profilami i ich postępem oraz dziennikiem błędów, serią nauki i wynikami testu każdego profilu |
| **Importuj dane…** | wczytuje taki plik (albo starszy, osobny plik treści lub postępu), pokazuje, co zawiera, i po potwierdzeniu zastępuje dane |
| **Resetuj dane…** | po dwóch potwierdzeniach usuwa profile, zmiany treści, dzienniki błędów, serie i wyniki testów; aplikacja wraca do stanu pierwszego otwarcia. Dane zakładki C1 zostają. |

Format pliku eksportu:

```js
{
  app: "english-levels-map", kind: "backup", version: 2, exportedAt: "…",
  data: {
    content:  { app, kind: "content",  version, exportedAt, data: { /* elm_content_v1 */ } },
    progress: { app, kind: "progress", version, exportedAt, data: { /* elm_profiles_v1 */ } },
    learning: { journal: { /* elm_journal_v1 */ }, activity: { /* elm_activity_v1 */ }, levelTest: { /* elm_leveltest_v1 */ }, levelTests: { /* elm_leveltests_v1 */ } }
  }
}
```

Import przyjmuje też kopie w wersji 1 (bez części `learning`): wtedy dziennik, seria i wynik testu zostają dla profili o tych samych identyfikatorach. Działają też starsze pliki `kind: "content"` i `kind: "progress"` oraz same „gołe” dane. Plik postępu w najstarszym formacie (bez profili) trafia do aktywnego profilu.

Kształt treści:

```js
{
  version: 1,
  categories: [{ id: "cat_grammar", name: "Gramatyka i czasy" }],
  levels: [{
    id: "A1", description: "",
    content: {
      "cat_grammar": {
        essentials: [{ id: "e_…", text: "" }],
        topics: []   // pozostałość po usuniętej funkcji „Tematy” (patrz niżej)
      }
    }
  }]
}
```

- Identyfikatory to prefiks, czas i losowy ciąg (`utils.uid`), nigdy indeks tablicy.
- `store.migrate(data)` sprawdza `version`. Przy zmianie struktury podnieś `CURRENT_VERSION` w `store.js` i dopisz krok migracji.
- `store.normalizeContent(data)` waliduje dane przy starcie i przy imporcie. Poważne błędy zatrzymują wczytywanie z opisem po polsku, drobne braki (pola, id) są uzupełniane.

## Egzaminy (rozbudowa v2, etap 3)

Rejestr `dane/egzaminy-manifest.json` jest jedynym źródłem etykiet, kodów, kolorów, statusów i opisów egzaminów. Steruje grupą „Egzaminy” w lewym panelu (E8, MP, MR, B2, a na końcu C1).

| Status w rejestrze | Co widać | Kod |
|---|---|---|
| `active` + folder `niezbednik/<id>/` (np. Egzamin ósmoklasisty) | strony, ćwiczenia, trener pisania, odliczanie, ramki „Na egzaminie …” | `js/exam-core.js` |
| `soon` (Matura podstawowa, Matura rozszerzona, Certyfikat B2) | strona „W trakcie pracy” z opisem z rejestru | `js/exam-core.js` |
| `existing` (Certyfikat C1) | dotychczasowy moduł bez zmian (`#/certyfikat-c1`, `elm_c1_v1`) | `js/c1-*.js` |

- **Folder egzaminu** ma ten sam format co C1: `manifest.json`, `powiazania.json`, `strony/*.md`, `cwiczenia/*.json` (silnik zadań, także `kind: reading` z `passage` i `kind: listening` ze `script`) oraz `trening/pisanie.json`.
- **Budowanie:**
  - `tools/zbuduj-egzaminy.js` tworzy `dane/egzaminy-rejestr.js` (mały, wczytywany przy starcie) i `niezbednik/<id>-dane.js` (ładowany po wejściu do zakładki);
  - zestawy egzaminu buduje `tools/zbuduj-cwiczenia.js`;
  - strony trafiają do wyszukiwarki;
  - walidator sprawdza rejestr, manifest, powiązania i zestawy.
- **Trener pisania** to wspólny silnik `js/writing-trainer.js`. C1 korzysta z niego przez `js/c1-writing.js`, a E8 ma własną konfigurację: licznik według reguł CKE (`js/exam-logic.js`) i strefy < 40 / 40–49 / 50–120 / > 120.
- **Słuchanie** korzysta z syntezatora mowy przeglądarki (Web Speech API): najwyżej 2 odsłuchy, dwa głosy, transkrypt po odpowiedzi. Bez głosu angielskiego jest transkrypt do przeczytania, a wynik ma znacznik „czytane”.
- **Klimat wizualny:** `html[data-section="<id egzaminu>"]`. E8 ma turkus i żółty, w obu motywach.

**Aktywacja egzaminu** (np. matury): zmień `status` na `active` w rejestrze, dodaj folder `niezbednik/<id>/` i uruchom `npm run build`. Nawigacja nie wymaga zmian w kodzie.

Informacje o egzaminie ósmoklasisty są w stanie na październik 2026. Przed udostępnieniem aplikacji innym sprawdź aktualny komunikat na cke.gov.pl.

## Ćwiczenia i Laboratorium czasów (rozbudowa v2)

Specyfikacje: [docs/rozbudowa-v2/](docs/rozbudowa-v2/00-CZYTAJ-TO.md).

| Adres | Widok | Kod |
|---|---|---|
| `#/cwiczenia`, `#/cwiczenia/mieszane` | Centrum ćwiczeń: zestawy tematów, gotowe mixy, generator | `js/exercise-hub.js` |
| `#/cwiczenia/zestaw/<id>` | sesja zestawu (Nauka / Egzamin, wynik, „Powtórz tylko błędne”) | `js/exercise-engine.js` |
| `#/cwiczenia/mix/<id>`, `#/cwiczenia/sesja` | gotowy mix / zestaw z generatora | `js/exercise-engine.js` |
| `#/a1/test` … `#/c2/test` | test końcowy poziomu: ekran startowy, sesja Egzamin, wynik, znaczek | `js/level-final.js`, `js/final-logic.js`, silnik `js/exercise-engine.js` |
| `#/laboratorium-czasow[/<czas>]`, `…/dobierz`, `…/porownaj/<a>/<b>` | Laboratorium czasów: mapa, karta z osią, „Dobierz czas”, porównanie | `js/tense-lab.js` |

- **Typy zadań:** `multiple-choice`, `reorder`, `find-error`, `short-answer` (spec 01) oraz z paczki v6 (`docs/rozbudowa-v6/spec/12-nowe-typy-zadan.md`) `gap-fill`, `match`, `transformation`, `translate`, `dictation`. Ocena, tasowanie i losowanie mixów są w `js/exercise-logic.js` (bez DOM, testy w `tools/testy.js`). Wzór danych nowych typów: `docs/rozbudowa-v6/przyklady/cwiczenia/v6-pilot-nowe-typy.json`.

  | Typ | Po polsku | Pola | Punkty |
  |---|---|---|---|
  | `gap-fill` | Luki do wpisania | `text` z lukami `{{1}}…{{n}}` (1–4), `gaps: [{ accepted: […], hint? }]`, `context?` | 1 za każdą lukę |
  | `match` | Dopasuj pary | `mode` (`definition`, `halves`, `translation`, `response`), `prompt`, `pairs: [[lewa, prawa]…]` (3–6), `extraRight?` (≤ 2) | 1 za każdą parę |
  | `transformation` | Transformacje zdań | `source`, `keyword`, `before`, `after`, `answers` (pełne wypełnienia luki), `wordLimit?` (domyślnie `[2, 5]`), `parts?` (dwie części) | 1, a z `parts` 2 |
  | `translate` | Tłumaczenie zdań | `source` (po polsku), `accepted` (1–8, pierwsze wzorcowe), `hint?` | 1 |
  | `dictation` | Dyktando | `text` (4–30 słów), `accepted?`, `maxPlays?` (1–5, domyślnie 3) | 1; bez głosu angielskiego pominięte (0 z 0) |

- **Punkty:** ocena zwraca `{ correct, points, max }` (`ELM.exLogic.maxPoints(item)`, stare typy = 1 pkt), a wynik sesji i zapis zestawu (`elm_exercises_v1`: `best`/`last` = `{ score, total, date }`) liczą się w punktach. Dla zestawów ze starych typów wynik jest taki sam jak wcześniej (test regresyjny). `correct` = pełna liczba punktów; dziennik błędów, „Powtórz tylko błędne”, statystyki i wagi losowania liczą jak dotąd po `correct`.
- **Porównanie zdań** (`translate`, `dictation`, `transformation` bez `parts`): `normalizeSentence` — bez przecinków i interpunkcji, skróty `n't`, `'re`, `'ve`, `'ll`, `'m`, `won't`, `can't` rozwijane po obu stronach, a `'s` / `'d` sprawdzane w obu odczytaniach (is/has, would/had). Przy błędzie: porównanie słowo po słowie z najbliższym wariantem (brak / zbędne / zamienione) i uwaga o literówce.
- **Transformacje** w C1/B2 Part 4 (`js/c1-exercises.js`) i w typie `transformation` oceniane są tą samą funkcją `ELM.exLogic.scoreTransformationParts` (test zgodności na wszystkich zadaniach Part 4).
- **Dane:**
  - zestawy to pliki `cwiczenia/tematy/<id>.json`, a mapę temat → zestawy trzyma `dane/cwiczenia-tematy.json`;
  - mixy są w `dane/mixes.json`, a Lab w `dane/lab-czasow.json` i `dane/lab-wybor-czasu.json`;
  - `npm run build` zamienia je na pliki `.js` (`cwiczenia/cwiczenia-indeks.js`, `cwiczenia/tematy/<id>.js`, `dane/lab-dane.js`). Strona wczytuje je **dopiero wtedy, gdy są potrzebne**, zwykłym `<script>`, więc działa to także z `file://`.
- **Na stronie tematu** z zestawami pojawia się na końcu sekcja „Sprawdź się” z kartami zestawów i linkiem „Zobacz na osi czasu”.

**Etap 2 rozbudowy:**

| Adres | Widok | Kod |
|---|---|---|
| `#/statystyki` | Statystyki: podsumowanie, trafność wg tematu / typu / poziomu, najsłabsze miejsca, trend 12 tygodni, aktywność, dziennik | `js/stats-page.js` |
| `#/cwiczenia/slabe[/<temat>]` | trening słabych punktów (tematy z ≥ 5 próbami i trafnością < 70%) | `js/exercise-engine.js` |
| `#/notatki` | Moje notatki | `js/notes.js` |

- **Dziennik podejść:** każda odpowiedź w zadaniach trafia do `elm_attempts_v1`, także przy przerwanej sesji. Liczenie (agregaty, trend, słabe tematy, wagi losowania, sugestia „Umiem”) jest w `js/learning-stats.js` (bez DOM, testy w `tools/testy.js`).
- **Automatyczne błędy w Dzienniku błędów:**
  - błędna odpowiedź tworzy wpis z ikoną iskry; drugi błąd tego samego zadania nie dubluje wpisu, tylko cofa powtórkę do jutra, a opanowany wpis wraca do powtórek;
  - obowiązuje limit 30 wpisów dziennie;
  - po każdym dodaniu pojawia się toast z „Cofnij”, a w mixach i Egzaminie zbiorcze podsumowanie z „Cofnij wszystkie”;
  - poprawna odpowiedź na zadanie, którego powtórka przypada dziś (lub jest zaległa), zalicza tę powtórkę;
  - funkcję wyłącza się w menu profilu → Ustawienia nauki.
- **Sugestia „Umiem”** pojawia się po dwóch wynikach ≥ 80% z rzędu. Aplikacja nigdy nie zaznacza sama; po „Nie teraz” nie pyta przez 14 dni.
- **Wyszukiwarka:**
  - otwiera się lupą w górnym pasku, klawiszem `/`, skrótem `Ctrl/Cmd + K` albo najechaniem myszą na górną krawędź treści;
  - indeks `dane/szukaj-indeks.js` buduje `tools/zbuduj-szukaj.js` (część `npm run build`, osobno: `npm run szukaj`) i ładuje się dopiero przy pierwszym otwarciu;
  - notatki i Dziennik błędów są dokładane do indeksu w przeglądarce.
- **Notatki:** przycisk „Notatki” na podstronach, stronach C1, kartach czasów i zestawach; zapisują się same.

**Dodanie zestawu zadań:**

1. Wrzuć plik `cwiczenia/tematy/<id>.json` (format: spec 01, sekcja 2; id zadań unikalne w całym banku).
2. Dopisz `<id>` do listy tematu w `dane/cwiczenia-tematy.json`.
3. Uruchom `npm run build`. Walidator (`npm run validate`, `tools/waliduj-cwiczenia.js`) zatrzyma budowanie przy błędzie w danych.
4. Zwiększ `?v=…` w `index.html`.

Python z paczki (`scripts/validate_exercises.py`) sprawdza to samo i można go uruchomić osobno: `python scripts/validate_exercises.py .`.

## Struktura plików

```
english-levels-map/
├─ index.html            szkielet strony, skrypt motywu w <head>, kolejność ładowania skryptów
├─ css/style.css         wygląd; design tokens (jasny / ciemny) na początku pliku
├─ js/
│  ├─ utils.js           tworzenie DOM bez innerHTML, **pogrubienie**, id, daty
│  ├─ theme.js           przycisk motywu, zapis elm_theme_v1, reakcja na zmianę systemu
│  ├─ learning.js        czysta logika (bez DOM): today(), powtórki, seria, algorytm testu
│  ├─ profile-data.js    dane nauki per profil (dziennik, aktywność, test), markActivity()
│  ├─ journal.js         Dziennik błędów i sesja powtórek
│  ├─ today.js           strona „Dziś”
│  ├─ level-test.js      szybki test poziomu
│  ├─ level-final.js     testy końcowe poziomów A1–C2 (ekran startowy, wynik, znaczek, karta na stronie poziomu)
│  ├─ final-logic.js     losowanie 20 z 30 z proporcjami kategorii, próg w punktach, podział wyniku (bez DOM)
│  ├─ default-data.js    dane startowe: lista bazowa albo pusty szkielet
│  ├─ base-content.js    bazowa lista umiejętności (niezbędnik A1–C2)
│  ├─ store.js           localStorage, migracja, walidacja, eksport/import
│  ├─ dialogs.js         okna potwierdzeń / pytań (zamiast confirm/prompt)
│  ├─ profiles.js        menu profilu (prawy górny róg) i ekran powitalny
│  ├─ markdown.js        mały renderer Markdown (tabele GFM, listy, cytaty, **/*, chipy [[id]])
│  ├─ callouts.js        wyróżnione sekcje (callouty) po tekście nagłówków, przewijane tabele
│  ├─ ui.js, motion.js   ikony, pierścienie postępu; GSAP na żądanie z prefers-reduced-motion
│  ├─ sidebar.js         lewy panel (pasek / rozwinięcie / szuflada, przypinanie)
│  ├─ celebrate.js       gratulacje kamieni milowych
│  ├─ exercise-logic.js  silnik zadań bez DOM: ocena, tasowanie, losowanie mixów
│  ├─ exercise-engine.js sesja zadań, wynik, „Sprawdź się” na stronach tematów
│  ├─ exercise-hub.js    Centrum ćwiczeń i generator zestawów mieszanych
│  ├─ tense-lab.js       Laboratorium czasów (oś czasu SVG, Dobierz czas, Porównaj)
│  ├─ learning-stats.js  dziennik podejść i statystyki bez DOM (agregaty, wagi, automatyczny dziennik)
│  ├─ stats-page.js      strona Statystyki
│  ├─ search-logic.js    silnik wyszukiwarki bez DOM (polskie znaki, prefiksy, literówki)
│  ├─ search.js          wyszukiwarka: pasek, skróty, combobox
│  ├─ notes.js           własne notatki (panel i strona „Moje notatki”)
│  ├─ exam-core.js       egzaminy z rejestru: nawigacja, strony, „W trakcie pracy”, ramki, odliczanie
│  ├─ exam-logic.js      liczenie wyrazów (reguły egzaminu ósmoklasisty) i strefy licznika
│  ├─ writing-trainer.js wspólny silnik trenera pisania (C1, E8)
│  ├─ niezbednik.js      podstrony niezbędnika: routing #/a1/…, dopasowanie, widok
│  ├─ render.js          rysowanie lewego panelu i strony poziomu
│  ├─ data-menu.js       sekcja „Dane”: eksport, import, reset
│  ├─ c1-*.js            zakładka „Certyfikat C1” (strony, ćwiczenia, trenery)
│  └─ app.js             start, stan, routing, zdarzenia, zapis
├─ niezbednik/           podstrony, podsumowania, strona główna, Certyfikat C1 (patrz niżej)
├─ tools/zbuduj-niezbednik.js   generator plików *-dane.js (także test-poziomu-dane.js)
├─ tools/zbuduj-testy-koncowe.js  pule testów końcowych (niezbednik/testy-poziomow/*.json) → pliki .js ładowane na żądanie
├─ tools/testy.js        testy jednostkowe (node tools/testy.js)
├─ tools/kontrast.js     kontrast WCAG par tokenów (4 zakresy motywów)
├─ tools/zbuduj-cwiczenia.js   ćwiczenia i Lab: JSON → pliki .js ładowane na żądanie
├─ tools/waliduj-cwiczenia.js  walidator danych ćwiczeń (npm run validate)
├─ tools/zbuduj-szukaj.js      indeks wyszukiwarki (dane/szukaj-indeks.js)
├─ tools/zbuduj-egzaminy.js    rejestr egzaminów i dane aktywnych egzaminów
├─ cwiczenia/tematy/     zestawy zadań (*.json źródło, *.js generowane)
├─ dane/                 mapa zestawów, mixy, Laboratorium czasów (lab-dane.js generowany)
├─ scripts/              skrypty z paczki rozbudowy (walidator i generatory w Pythonie)
├─ tools/zbuduj-zasoby.js   kopiuje fonty, ikony i GSAP z node_modules do assets/
├─ assets/               fonty, ikony, GSAP, favicony, wzór warstwic (kopie, bez CDN)
├─ DESIGN.md             zasady wyglądu, tokeny, komponenty, wyniki przeglądów
├─ docs/INSTRUKCJA.md    obsługa dla nauczyciela
├─ README.md
└─ .gitignore
```

Skrypty są zwykłymi `<script src>` ładowanymi po kolei. Każdy plik dopisuje swoją część do jednego obiektu `window.ELM`. Nie ma tu modułów ES ani `fetch()`, bo przeglądarki blokują je przy `file://`.

## Zakładka „Certyfikat C1” (folder `niezbednik/certyfikat-c1/`)

Przygotowanie do egzaminu Cambridge C1 Advanced (wersja komputerowa). Menu w pasku bocznym (pod poziomami) jest budowane wyłącznie z `manifest.json`. Na telefonie i tablecie pasek boczny chowa się w szufladę otwieraną przyciskiem „☰ Menu”.

```
niezbednik/certyfikat-c1/
├─ manifest.json        sekcje, strony, grupy zestawów ćwiczeń, trenery
├─ strony/*.md          strony (frontmatter: id, title, section, order, summary)
├─ cwiczenia/*.json     19 zestawów Use of English (Part 1–4)
├─ trening/pisanie.json, trening/speaking.json   dane trenerów
└─ powiazania.json      ramki „Na egzaminie C1” na podstronach poziomów
niezbednik/certyfikat-c1-dane.js   GENEROWANY (ELM.C1), ten sam skrypt co niezbednik-dane.js
```

| Adres | Widok | Kod |
|---|---|---|
| `#/certyfikat-c1` | strona „przeglad” (z odliczaniem do egzaminu) | `js/c1-core.js` |
| `#/certyfikat-c1/<id strony>` | strona z `strony/*.md` | `js/c1-core.js` |
| `#/certyfikat-c1/cwiczenia` i `…/cwiczenia/<id>` | lista zestawów i zestaw | `js/c1-exercises.js` |
| `#/certyfikat-c1/trening-pisanie[/<zadanie>]` | trener Writing | `js/c1-writing.js` |
| `#/certyfikat-c1/trening-speaking` | trener Speaking | `js/c1-speaking.js` |

- **Linki `[[id]]`** w Markdownie: id podstrony z `niezbednik/index.json` prowadzi do podstrony (tekst linku to jej tytuł), a id zestawu do strony zestawu (tytuł zestawu). Nieznane id wyświetla się jako zwykły tekst z ostrzeżeniem w konsoli.
- **Listy zadań `- [ ]`** są polami wyboru. Ich stan zapisuje się dla każdej strony osobno.
- **Ocenianie Part 4** jak w Cambridge: 3–6 słów (skróty `n't`, `'s`, `'re`, `'ve`, `'d`, `'ll`, `'m` liczą się jako dwa słowa), słowo kluczowe bez zmian i po 1 pkt za każdą część z `parts` (druga część musi stać po pierwszej). Odpowiedzi są normalizowane: wielkie litery, `’` → `'`, bez interpunkcji poza apostrofem, pojedyncze spacje.
- **Zapis w przeglądarce** (klucz `elm_c1_v1`, w `try/catch`, więc bez dostępu działa do zamknięcia karty): data egzaminu, najlepszy wynik każdego zestawu, szkice Writing i zaznaczenia list zadań. Te dane są wspólne dla wszystkich profili, nie trafiają do eksportu i nie są kasowane przez „Resetuj dane”.
- **Bez materiałów Cambridge:** oryginalne arkusze, PDF-y i nagrania nie trafiają do repozytorium (blokuje je `.gitignore`). Strony linkują do oficjalnych materiałów.
- **Zmiana treści:** edytuj pliki w `niezbednik/certyfikat-c1/`, uruchom `node tools/zbuduj-niezbednik.js` i zwiększ `?v=…` w `index.html`.

## Podstrony „Niezbędnika” (folder `niezbednik/`)

```
niezbednik/
├─ index.json            manifest: poziom → punkty { id, category, file, label }
├─ a1/ … c2/*.md         podstrony punktów (frontmatter: id, level, category, order, title, summary)
├─ podsumowania/<poziom>.md   podsumowanie wyświetlane pod listą poziomu
├─ strona-glowna.md      treść strony głównej
└─ niezbednik-dane.js    GENEROWANY: wszystkie powyższe .md w jednym pliku JS
tools/zbuduj-niezbednik.js   skrypt, który tworzy niezbednik-dane.js
```

- **Adresy** (routing przez `#`, bo strona działa z dysku `file://` i na GitHub Pages bez serwera):
  - `index.html` albo `#/`: strona główna (`strona-glowna.md`),
  - `#/a1` … `#/c2`: lista poziomu z podsumowaniem pod spodem,
  - `#/a1/czasy-present-simple`: podstrona punktu (ścieżka pliku bez `.md`).
  Logo „English Levels Map” w lewym górnym rogu zawsze prowadzi do `#/`.
- **Strona główna:** w tabeli „Poziomy w skrócie” kody A1–C2 w pierwszej kolumnie są automatycznie zamieniane na linki do poziomów. Linki Markdown `[tekst](https://…)` otwierają się w nowej karcie, a dozwolone są tylko adresy `https://`, `http://`, `mailto:` i `#/…`.
- **Podsumowanie poziomu** jest wyświetlane pod listą punktów na każdej stronie poziomu.
- **Dlaczego plik `.js`, a nie wczytywanie `.md`:** przeglądarki blokują `fetch()` plików przy `file://`, a plik `.js` wczyta się zawsze.
- **Dopasowanie punktu listy do podstrony** (liczone na bieżąco): najpierw dokładnie po tekście (`label` = tekst punktu), a jeśli się nie uda, po pozycji w obrębie kategorii (`order` z frontmatter). Kategorie z `index.json` są przypisane do kategorii aplikacji w `CATEGORY_MAP` w `js/niezbednik.js`. W konsoli przeglądarki `ELM.niezbednik.report()` pokazuje wynik dopasowania.
- **Linki** pojawiają się tylko przy punktach, dla których istnieje plik `.md`. Obecnie wszystkie 110 punktów A1–C2 ma pliki. Gdyby w `index.json` pojawił się wpis bez pliku, punkt nie dostanie linku, a adres podstrony pokaże komunikat o braku pliku.
- Na podstronie przełącznik **Umiem** zmienia ten sam stan co checkbox na liście, dla aktywnego profilu. Sekcje `## Odpowiedzi` i `## Przykładowe odpowiedzi` są ukryte pod przyciskiem „Pokaż odpowiedzi”.

**Dodanie lub zmiana podstron:**

1. Zmień pliki w `niezbednik/<poziom>/` i upewnij się, że są wpisane w `niezbednik/index.json`.
2. Uruchom `node tools/zbuduj-niezbednik.js`.
3. Zwiększ numer `?v=…` w `index.html`, zrób commit i push.

## Jak rozbudować

**Po każdej zmianie plików JS/CSS** zwiększ numer `?v=…` przy wszystkich `<script>` i `<link>` w `index.html`. GitHub Pages pozwala przeglądarkom trzymać pliki w pamięci podręcznej do 10 minut, a bez nowego numeru mogłyby załadować mieszankę starych i nowych plików.

**Zmiana listy umiejętności dla wszystkich:** edycja treści w aplikacji została usunięta, więc listę zmienia się w kodzie: w `js/base-content.js` popraw obiekt po `window.ELM.BASE_CONTENT =`. Nowa baza wczyta się w przeglądarkach, które nie mają własnych zapisanych treści. Pozostali dostaną ją po „Resetuj dane” (albo po imporcie pliku z nową treścią). Usunięcie `<script src="js/base-content.js">` z `index.html` przywraca start od pustego szkieletu.

**Kolejna kategoria domyślna:** w `js/default-data.js` dopisz do `ELM.DEFAULT_CATEGORIES` (działa dla nowych danych i po „Resetuj dane”):

```js
ELM.DEFAULT_CATEGORIES = [
  { id: "cat_grammar", name: "Gramatyka i czasy" },
  { id: "cat_vocabulary", name: "Słownictwo" }
];
```

**Kolory:** wszystkie kolory (także poziomów: `--lvl-a1`, `--lvl-a1-soft` itd.) są tokenami na początku `css/style.css`, osobno dla motywu jasnego i ciemnego. Po zmianie sprawdź kontrast w obu motywach.

**Usunięta funkcja „Tematy”:** wcześniej nauczyciel mógł dodawać własne tematy (zasada, wzór, przykłady, błędy, ćwiczenia). Zastąpiły je podsumowania poziomów i podstrony niezbędnika, a cały kod tej funkcji został usunięty. W danych zostało tylko pole `topics`, które `store.js` nadal sprawdza, żeby starsze kopie zapasowe wczytywały się bez błędów. Nie jest nigdzie wyświetlane.

## Bezpieczeństwo

Treść użytkownika trafia do strony wyłącznie przez `textContent` lub `value`. Kod nigdy nie używa `innerHTML` na danych. `**pogrubienie**` jest zamieniane na elementy `<strong>` tworzone przez `createElement`, więc wpisany HTML (np. `<script>`) wyświetla się jako zwykły tekst.

## Decyzje projektowe

- **Układ:** od 900 px szerokości lewy panel jest stale widoczny. Poniżej (tablet, telefon) chowa się w szufladę „☰ Menu”, przewija się cała strona, a tabele przewijają się w poziomie wewnątrz swojej ramki. Strona nie przewija się w poziomie przy żadnej szerokości od 360 px.
- **Bez trybu edycji:** edycja treści w aplikacji została usunięta, a lista jest czystym materiałem do nauki. Treści zapisane wcześniej w przeglądarce (`elm_content_v1`) nadal się wyświetlają i trafiają do eksportu.
- **Postęp liczy tylko niepuste punkty essentials,** a puste punkty nie są pokazywane.
- **Usuwanie zawsze wymaga potwierdzenia.** Reset danych wymaga dwóch potwierdzeń.
- **Uszkodzone dane:** zamiast białego ekranu pojawia się ekran z opcjami: import kopii, pobranie uszkodzonych danych i start od listy bazowej. Stara treść trafia wtedy do klucza `elm_content_corrupt_backup`.
- **Brak localStorage:** aplikacja działa do zamknięcia karty i wyświetla wyraźne ostrzeżenie.
- **Lista bazowa zamiast pustego szkieletu:** jeśli przeglądarka ma zapisany *nietknięty* pusty szkielet z poprzedniej wersji strony (jedna kategoria `cat_grammar`, zero treści), przy starcie zostaje on zastąpiony listą bazową. Zapisane własne treści nigdy nie są w ten sposób nadpisywane.
- **Profile:** gdy lista profili jest pusta (pierwsze otwarcie, „Resetuj dane”, usunięcie ostatniego profilu), aplikacja pokazuje na każdym adresie ekran powitalny. Plik eksportu zawiera wszystkie profile.
- **Migracja profili (wersja 1 → 2, jednorazowa):** starsze wersje tworzyły przy pierwszym otwarciu kilka profili przykładowych. Przy pierwszym starcie nowej wersji zapisane profile zostają, a usuwane są tylko nieużywane profile przykładowe: bez żadnego „Umiem”, z niezmienioną nazwą i z id według dawnego schematu (`p_` + nazwa małymi literami bez spacji). Pozostałe dane nie są ruszane.
