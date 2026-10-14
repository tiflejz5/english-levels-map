# English Levels Map (A1–C2)

Edytowalna strona dla nauczyciela angielskiego: lista tego, co uczeń powinien umieć na każdym poziomie CEFR (A1–C2), z możliwością odhaczania „Umiem”. Startuje jako **pusty szkielet**: sześć poziomów i jedna kategoria „Gramatyka i czasy”. Całą treść dodaje nauczyciel w trybie edycji.

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
│  ├─ default-data.js    pusty szkielet danych (poziomy + kategorie domyślne)
│  ├─ store.js           localStorage, migracja, walidacja, eksport/import
│  ├─ dialogs.js         okna potwierdzeń / pytań (zamiast confirm/prompt)
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
| `elm_progress_v1` | postęp ucznia: `{ "<id punktu essentials>": true }` |
| `elm_ui_v1`       | tylko wygoda: wybrany poziom, kategoria i temat |

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
        topics: [{
          id: "t_…", title: "", rule: "", formula: "",
          examples:  [{ id: "x_…",  text: "" }],
          mistakes:  [{ id: "m_…",  wrong: "", correct: "", note: "" }],
          exercises: [{ id: "ex_…", prompt: "", answer: "" }]
        }]
      }
    }
  }]
}
```

- Identyfikatory to prefiks, czas i losowy ciąg (`utils.uid`), nigdy indeks tablicy.
- `store.migrate(data)` sprawdza `version`. Przy zmianie struktury podnieś `CURRENT_VERSION` w `store.js` i dopisz krok migracji.
- `store.normalizeContent(data)` waliduje dane przy starcie i przy imporcie. Poważne błędy zatrzymują wczytywanie z opisem po polsku, drobne braki (pola, id) są uzupełniane.
- Pliki eksportu mają opakowanie `{ app, kind: "content" | "progress", version, exportedAt, data }`. Import przyjmuje też same „gołe” dane.

## Jak rozbudować

**Kolejna kategoria domyślna:** w `js/default-data.js` dopisz do `ELM.DEFAULT_CATEGORIES`:

```js
ELM.DEFAULT_CATEGORIES = [
  { id: "cat_grammar", name: "Gramatyka i czasy" },
  { id: "cat_vocabulary", name: "Słownictwo" }
];
```

Działa to tylko dla nowych danych i po „Zresetuj wszystko”. W istniejących danych kategorię dodaje się w aplikacji przyciskiem „+ Kategoria”.

**Kolory poziomów:** zmienne `--lvl-a1`, `--lvl-a1-soft` itd. na początku `css/style.css`.

**Nowa sekcja tematu:** dodaj pole w `normalizeTopic` (`store.js`), w `addTopic` (`editor.js`) i narysuj je w `renderTopic` (`render.js`). Jeśli stare dane wymagają przekształcenia, podnieś wersję i dopisz migrację.

## Bezpieczeństwo

Treść użytkownika trafia do strony wyłącznie przez `textContent` lub `value`. Kod nigdy nie używa `innerHTML` na danych. `**pogrubienie**` jest zamieniane na elementy `<strong>` tworzone przez `createElement`, więc wpisany HTML (np. `<script>`) wyświetla się jako zwykły tekst.

## Decyzje projektowe

- **Edycja inline:** w trybie edycji pola są edytowalne bezpośrednio na stronie. Zapis następuje automatycznie 400 ms po ostatnim naciśnięciu klawisza, a zmiany struktury zapisują się od razu. Nazwę kategorii podaje się w małym oknie, bo nie da się jej edytować wewnątrz przełącznika segmentowego.
- **Puste stany w podglądzie** nie mają przycisku dodawania, żeby tryb podglądu był zupełnie wolny od kontrolek edycji. Zamiast przycisku jest podpowiedź „Włącz Tryb edycji…”. Przycisk „+ Dodaj pierwszy…” pojawia się w trybie edycji.
- **Tryb edycji zawsze startuje wyłączony,** także po odświeżeniu strony. Uczeń widzi czysty materiał.
- **Postęp liczy tylko niepuste punkty essentials,** a puste punkty nie są pokazywane w podglądzie.
- **Usunięcie punktu essentials lub kategorii** usuwa też związane z nimi zaznaczenia „Umiem”.
- **Usuwanie zawsze wymaga potwierdzenia,** także pustych elementów list. Reset całości wymaga dwóch potwierdzeń.
- **Uszkodzone dane:** zamiast białego ekranu pojawia się ekran z opcjami: import kopii, pobranie uszkodzonych danych i start od pustego szkieletu. Stara treść trafia wtedy do klucza `elm_content_corrupt_backup`.
- **Brak localStorage:** aplikacja działa do zamknięcia karty i wyświetla wyraźne ostrzeżenie.
- **Dodatkowe pliki JS** (`utils.js`, `dialogs.js`, `data-menu.js`) powstały, żeby żaden plik nie był za duży.
