# English Levels Map (A1–C2)

Otwarta mapa umiejętności z angielskiego dla każdego: uczniów, nauczycieli i osób uczących się samodzielnie. Dla każdego poziomu CEFR (A1–C2) pokazuje, co warto umieć, a przy każdym punkcie podaje wyjaśnienie z przykładami i ćwiczeniem. Postęp odhacza się polem „Umiem”. Jest też zakładka z przygotowaniem do certyfikatu C1 Advanced.

Czysty HTML + CSS + JavaScript. Bez frameworków i bez kroku budowania; npm służy tylko do pobrania fontów, ikon i GSAP, których kopie są w `assets/`. Bez zewnętrznych CDN i bez internetu.

## Funkcje

- **Poziomy A1–C2** w lewym panelu z paskiem postępu. Każdy poziom ma trzy kategorie (Gramatyka i czasy, Funkcje komunikacyjne, Słownictwo), listę **Essentials** z polem „Umiem” i **podsumowanie poziomu**.
- **Podstrony niezbędnika** (110 punktów): zasada, tabele, przykłady, typowe błędy, ćwiczenie z ukrytymi odpowiedziami.
- **Strona główna** z opisem i tabelą poziomów.
- **Certyfikat C1:** strategie do każdej części egzaminu, 19 zestawów Use of English, które sprawdzają się same, trener Writing (timer, licznik słów) i trener Speaking (timery, nagrywanie).
- **Dziś** (`#/dzis`, na górze lewego panelu): powtórki na dziś, seria nauki („Dni z rzędu”, „Najdłuższa seria”), ostatnie 7 dni, postęp na poziomach A1–C2, „Kontynuuj” (ostatnio otwarta podstrona), odliczanie do egzaminu C1 i skrót „Dodaj błąd”.
- **Szybki test poziomu** (`#/test-poziomu`): 12 pytań adaptacyjnych, szacowany poziom (orientacyjnie), lista błędnych pytań z linkami do niezbędnika.
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
- Wynik: średnia poziomów (docelowych) ostatnich 6 pytań, zaokrąglona w dół. Test niczego nie zaznacza jako „Umiem”. Ostatni wynik (data, poziom, odpowiedzi) jest zapisany w profilu i trafia do eksportu.

**Pytania** są w `niezbednik/test-poziomu/pytania.json`:

```json
{
  "version": 1,
  "questions": [
    {
      "id": "a1-01",
      "level": "A1",
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

**Jak dodać pytania:**

1. Dopisz pytania do `pytania.json`. Liczba pytań na poziom jest dowolna, ale do sensownego testu przydaje się co najmniej 6–8 na poziom.
2. Uruchom `node tools/zbuduj-niezbednik.js`. Skrypt sprawdza schemat: błędne pytania pomija i wypisuje „UWAGA”, a nieznane `itemId` usuwa (pytanie zostaje bez linku). Potem tworzy `niezbednik/test-poziomu-dane.js`.
3. Zwiększ `?v=…` w `index.html`.

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
    learning: { journal: { /* elm_journal_v1 */ }, activity: { /* elm_activity_v1 */ }, levelTest: { /* elm_leveltest_v1 */ } }
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
│  ├─ niezbednik.js      podstrony niezbędnika: routing #/a1/…, dopasowanie, widok
│  ├─ render.js          rysowanie lewego panelu i strony poziomu
│  ├─ data-menu.js       sekcja „Dane”: eksport, import, reset
│  ├─ c1-*.js            zakładka „Certyfikat C1” (strony, ćwiczenia, trenery)
│  └─ app.js             start, stan, routing, zdarzenia, zapis
├─ niezbednik/           podstrony, podsumowania, strona główna, Certyfikat C1 (patrz niżej)
├─ tools/zbuduj-niezbednik.js   generator plików *-dane.js (także test-poziomu-dane.js)
├─ tools/testy.js        testy jednostkowe (node tools/testy.js)
├─ tools/kontrast.js     kontrast WCAG par tokenów (4 zakresy motywów)
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
