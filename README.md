# English Levels Map (A1–C2)

Edytowalna strona dla nauczyciela angielskiego: lista tego, co uczeń powinien umieć na każdym poziomie CEFR (A1–C2), z możliwością odhaczania „Umiem”. Startuje od **bazowej listy** „Angielski A1–C2: niezbędnik do rozmowy” (`js/base-content.js`): trzy kategorie (Gramatyka i czasy, Funkcje komunikacyjne, Słownictwo) i opisy poziomów. Nauczyciel może ją dowolnie edytować w trybie edycji.

Czysty HTML + CSS + JavaScript. Bez frameworków, bez npm, bez budowania i bez internetu.

## Uruchomienie

Kliknij dwukrotnie `index.html`. Strona działa bezpośrednio z dysku (`file://`) i na GitHub Pages.

Instrukcja obsługi dla nauczyciela (po polsku): [docs/INSTRUKCJA.md](docs/INSTRUKCJA.md).

## Struktura plików

```
english-levels-map/
├─ index.html            szkielet strony, kolejność ładowania skryptów
├─ css/style.css         wygląd; kolory (także kolory poziomów) jako zmienne w :root
├─ js/
│  ├─ utils.js           tworzenie DOM bez innerHTML, **pogrubienie**, id, daty
│  ├─ default-data.js    dane startowe: lista bazowa albo pusty szkielet
│  ├─ base-content.js    bazowa lista umiejętności (niezbędnik A1–C2)
│  ├─ store.js           localStorage, migracja, walidacja, eksport/import
│  ├─ dialogs.js         okna potwierdzeń / pytań (zamiast confirm/prompt)
│  ├─ profiles.js        przełącznik profili (prawy górny róg) i zarządzanie nimi
│  ├─ markdown.js        mały renderer Markdown (tabele GFM, listy, cytaty, **/*)
│  ├─ niezbednik.js      podstrony niezbędnika: routing #/a1/…, dopasowanie, widok
│  ├─ render.js          rysowanie widoków (podgląd i tryb edycji)
│  ├─ editor.js          operacje trybu edycji (dodaj, przesuń, usuń)
│  ├─ data-menu.js       menu „Dane”: eksport, import, reset
│  └─ app.js             start, stan, zdarzenia, automatyczny zapis
├─ docs/INSTRUKCJA.md    obsługa dla nauczyciela
├─ README.md
└─ .gitignore
```

Skrypty są zwykłymi `<script src>` ładowanymi po kolei. Każdy plik dopisuje swoją część do jednego obiektu `window.ELM`. Nie ma tu modułów ES ani `fetch()`, bo przeglądarki blokują je przy `file://`.

## Dane

| Klucz localStorage | Zawartość |
|---|---|
| `elm_content_v1`  | treści: `{ version, categories[], levels[] }` |
| `elm_profiles_v1` | profile: `{ version, activeId, profiles: [{ id, name, progress: { "<id punktu essentials>": true } }] }` |
| `elm_progress_v1` | stary zapis postępu (sprzed profili); przy pierwszym starcie trafia do pierwszego profilu, potem nie jest używany |
| `elm_ui_v1`       | tylko wygoda: wybrany poziom i kategoria |

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
- Pliki eksportu mają opakowanie `{ app, kind: "content" | "progress", version, exportedAt, data }`. Import przyjmuje też same „gołe” dane.

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

**Dodanie kolejnego poziomu (np. A2):**

1. Skopiuj pliki do `niezbednik/a2/` i upewnij się, że są wpisane w `niezbednik/index.json`.
2. Uruchom (wymaga Node.js):
   ```bash
   node tools/zbuduj-niezbednik.js
   ```
3. Zwiększ numer `?v=…` w `index.html`, zrób commit i push.

## Jak rozbudować

**Po każdej zmianie plików JS/CSS** zwiększ numer `?v=…` przy wszystkich `<script>` i `<link>` w `index.html`. GitHub Pages pozwala przeglądarkom trzymać pliki w pamięci podręcznej do 10 minut, a bez nowego numeru mogłyby załadować mieszankę starych i nowych plików.

**Zmiana listy bazowej dla wszystkich** (np. na GitHub Pages): w aplikacji zrób **Dane → Eksportuj treści**, a potem w `js/base-content.js` zastąp obiekt po `window.ELM.BASE_CONTENT =` zawartością pola `"data"` z pliku eksportu. Nowa baza wczyta się w przeglądarkach, które nie mają jeszcze własnych zapisanych treści. Pozostali mogą ją wczytać przez import albo „Zresetuj wszystko”. Usunięcie `<script src="js/base-content.js">` z `index.html` przywraca start od pustego szkieletu.

**Kolejna kategoria domyślna:** w `js/default-data.js` dopisz do `ELM.DEFAULT_CATEGORIES`:

```js
ELM.DEFAULT_CATEGORIES = [
  { id: "cat_grammar", name: "Gramatyka i czasy" },
  { id: "cat_vocabulary", name: "Słownictwo" }
];
```

Działa to tylko dla nowych danych i po „Zresetuj wszystko”. W istniejących danych kategorię dodaje się w aplikacji przyciskiem „+ Kategoria”.

**Kolory poziomów:** zmienne `--lvl-a1`, `--lvl-a1-soft` itd. na początku `css/style.css`.

**Usunięta funkcja „Tematy”:** wcześniej nauczyciel mógł dodawać własne tematy (zasada, wzór, przykłady, błędy, ćwiczenia). Zastąpiły je podsumowania poziomów i podstrony niezbędnika, a cały kod tej funkcji został usunięty. W danych zostało tylko pole `topics`, które `store.js` nadal sprawdza, żeby starsze kopie zapasowe wczytywały się bez błędów. Nie jest nigdzie wyświetlane.

## Bezpieczeństwo

Treść użytkownika trafia do strony wyłącznie przez `textContent` lub `value`. Kod nigdy nie używa `innerHTML` na danych. `**pogrubienie**` jest zamieniane na elementy `<strong>` tworzone przez `createElement`, więc wpisany HTML (np. `<script>`) wyświetla się jako zwykły tekst.

## Decyzje projektowe

- **Telefon:** poniżej 760 px szerokości pasek poziomów jest nad treścią (przewijany w poziomie), przewija się cała strona, a tabele przewijają się w poziomie wewnątrz swojej ramki. Na komputerze układ się nie zmienia.

- **Edycja inline:** w trybie edycji pola są edytowalne bezpośrednio na stronie. Zapis następuje automatycznie 400 ms po ostatnim naciśnięciu klawisza, a zmiany struktury zapisują się od razu. Nazwę kategorii podaje się w małym oknie, bo nie da się jej edytować wewnątrz przełącznika segmentowego.
- **Puste stany w podglądzie** nie mają przycisku dodawania, żeby tryb podglądu był zupełnie wolny od kontrolek edycji. Zamiast przycisku jest podpowiedź „Włącz Tryb edycji…”. Przycisk „+ Dodaj pierwszy…” pojawia się w trybie edycji.
- **Tryb edycji zawsze startuje wyłączony,** także po odświeżeniu strony. Uczeń widzi czysty materiał.
- **Postęp liczy tylko niepuste punkty essentials,** a puste punkty nie są pokazywane w podglądzie.
- **Usunięcie punktu essentials lub kategorii** usuwa też związane z nimi zaznaczenia „Umiem”.
- **Usuwanie zawsze wymaga potwierdzenia,** także pustych elementów list. Reset całości wymaga dwóch potwierdzeń.
- **Uszkodzone dane:** zamiast białego ekranu pojawia się ekran z opcjami: import kopii, pobranie uszkodzonych danych i start od listy bazowej. Stara treść trafia wtedy do klucza `elm_content_corrupt_backup`.
- **Brak localStorage:** aplikacja działa do zamknięcia karty i wyświetla wyraźne ostrzeżenie.
- **Dodatkowe pliki JS** (`utils.js`, `dialogs.js`, `data-menu.js`) powstały, żeby żaden plik nie był za duży.
- **Lista bazowa zamiast pustego szkieletu:** jeśli przeglądarka ma zapisany *nietknięty* pusty szkielet z poprzedniej wersji strony (jedna kategoria `cat_grammar`, zero treści), przy starcie zostaje on zastąpiony listą bazową. Własne treści nauczyciela nigdy nie są w ten sposób nadpisywane.
- **Profile:** domyślne profile (Adam, Klasa 1, Klasa 4, Klasa 6) są w `ELM.DEFAULT_PROFILES` w `js/default-data.js`. Wybór profilu działa zawsze, a dodawanie, zmiana nazwy, kolejność i usuwanie tylko w trybie edycji. Usunięcie punktu essentials czyści jego „Umiem” we wszystkich profilach. Plik eksportu postępu zawiera wszystkie profile, a import starego pliku (bez profili) trafia do aktywnego profilu.
