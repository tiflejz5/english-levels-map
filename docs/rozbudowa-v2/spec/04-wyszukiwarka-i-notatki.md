# Specyfikacja 04 – Wyszukiwarka po całej aplikacji i własne notatki

## A. Wyszukiwarka

### A.1 Co przeszukujemy

| Grupa wyników | Źródło | Pola indeksowane |
| --- | --- | --- |
| Strony | wszystkie pliki Markdown niezbędnika (A1–C2), podsumowania poziomów | tytuł, `summary`, nagłówki, treść |
| Egzaminy | strony z modułów egzaminów (Certyfikat C1, Egzamin ósmoklasisty) | tytuł, nagłówki, treść |
| Ćwiczenia | tytuły i opisy zestawów | tytuł, intro, temat |
| Laboratorium czasów | `lab-czasow.json` | nazwa, polska nazwa, zastosowania, sygnały, przykłady |
| Moje notatki | notatki użytkownika (lokalnie, w czasie działania) | treść notatki, tytuł strony |
| Mój dziennik błędów | wpisy dziennika (lokalnie, w czasie działania) | kontekst, poprawna odpowiedź, reguła |

Notatki i dziennik błędów są **dodawane do indeksu w przeglądarce** (nie w pliku build), bo są prywatne.

### A.2 Indeks

- Skrypt budujący `scripts/build-search-index.*` uruchamiany w buildzie i w trybie dev. Wynik: jeden plik JSON (np. `search-index.json`) ładowany **leniwie** przy pierwszym otwarciu wyszukiwarki.
- Każdy rekord: `id`, `group`, `title`, `headings` (tablica), `text` (oczyszczony z Markdown, maks. ok. 4000 znaków, nie więcej), `level`, `category`, `route`, `anchor?`.
- Rozmiar: monitoruj. Jeśli indeks przekracza ok. 1 MB, ogranicz `text` do nagłówków i pierwszych akapitów.
- Silnik: lekka biblioteka (np. MiniSearch) albo własna implementacja. Wymagania:
  - **normalizacja polskich znaków** (ą→a, ł→l itd.) w zapytaniu i w indeksie, wielkość liter bez znaczenia,
  - dopasowanie prefiksowe (wpisujesz „pres" i znajdujesz „Present Perfect"),
  - lekka tolerancja literówek (fuzzy 0,15–0,2, tylko dla zapytań ≥ 5 znaków),
  - wagi pól: tytuł > nagłówki > `summary` > treść,
  - wyniki pogrupowane wg grup z A.1, w grupie sortowane wg trafności, limit 5 na grupę + „pokaż więcej".
- Fragmenty (snippet) z podświetleniem dopasowanych słów, bez wstrzykiwania HTML (podświetlaj przez podział tekstu na części, nie przez `innerHTML`).

### A.3 Interfejs

- **Pole wyszukiwania wysuwa się z góry**, gdy użytkownik zbliży mysz do górnej krawędzi **obszaru treści** (strefa aktywacji ok. 12 px wysokości, wyśrodkowana, ok. 40–60% szerokości; opóźnienie 350–450 ms, żeby nie reagować na ruch myszą do kart przeglądarki i przycisków okna). Pole chowa się po wyjściu myszy z paska i pustym zapytaniu albo po Esc.
- **Zawsze dostępne alternatywy** (konieczne na iPadzie i telefonie, gdzie nie ma najechania): ikona lupy w górnym pasku (obok przełącznika motywu), skrót klawiszowy `/` (gdy fokus nie jest w polu tekstowym) oraz `Ctrl/Cmd + K`.
- Pasek jako **combobox** z listą wyników (`role="combobox"`, `aria-expanded`, `aria-controls`, `role="listbox"`, `role="option"`), strzałki góra/dół, Enter otwiera, Esc zamyka, Tab wychodzi. Na wąskich ekranach pole wysuwa się na pełną szerokość, wyniki w osobnej warstwie.
- Puste zapytanie pokazuje **ostatnie wyszukiwania** (do 5, localStorage, per urządzenie) i **skróty** (Dziś, Lab czasów, Ćwiczenia, Dziennik błędów).
- Brak wyników: komunikat po polsku z podpowiedzią (np. „Spróbuj krótszego hasła lub bez polskich znaków") i linkiem do Centrum ćwiczeń.
- Wyniki prowadzą do route z ewentualnym `anchor` (nagłówek) i przewijają do niego.
- Styl zgodny z `DESIGN.md`, animacja wysunięcia 150–200 ms (wyłączona przy `prefers-reduced-motion`).

### A.4 Kryteria odbioru

- [ ] Wyszukiwanie działa po wszystkich grupach z A.1, znajduje frazy z polskimi znakami i bez nich.
- [ ] Pole wysuwa się po najechaniu na górną krawędź, a także przez lupę, `/` i `Ctrl/Cmd+K`.
- [ ] Pełna obsługa klawiatury i czytnika ekranu, brak `innerHTML` z danych użytkownika.
- [ ] Indeks ładuje się leniwie, rozmiar zgłoszony w podsumowaniu.

---

## B. Własne notatki

### B.1 Zachowanie

- Notatki są **powiązane ze stroną** (klucz: route lub id punktu/zestawu/egzaminu), **per profil**.
- **Schowane domyślnie.** Na każdej stronie z treścią (podstrony tematów, strony egzaminów, karty czasów w laboratorium, zestawy ćwiczeń) jest mały przycisk „Notatki" (ikona zeszytu). Jeśli notatka istnieje, przy ikonie pojawia się kropka. **Dopiero po kliknięciu** rozwija się pole tekstowe (panel pod treścią lub wysuwany z boku na szerokich ekranach; na wąskich ekranach dolna szuflada).
- Pole: zwykły tekst (textarea), automatyczny zapis po 500 ms bezczynności (debounce) i przy zamknięciu panelu, wskaźnik „Zapisano" / „Zapisywanie…", limit 10 000 znaków z licznikiem po przekroczeniu 80%. Klawisz Esc zamyka panel (zapis przed zamknięciem).
- Bez formatowania i bez HTML. Znaki nowej linii zachowane; adresy URL można pokazywać jako klikalne tylko w trybie podglądu (opcjonalnie).
- Notatka z pustą treścią = usunięcie wpisu.

### B.2 Strona „Moje notatki"

Route `/notatki`, pozycja w menu profilu lub w panelu. Lista wszystkich notatek (tytuł strony, fragment, data zmiany), wyszukiwanie w obrębie notatek, sortowanie (ostatnio zmieniane), przejście do strony, usunięcie (z potwierdzeniem). Stan pusty z krótkim wyjaśnieniem.

### B.3 Dane

Klucz (przykład): `elm.<profileId>.notes`

```
{
  "version": 1,
  "items": {
    "a2-czasy-past-simple": { "text": "…", "updatedAt": "2026-10-21T18:10:00.000Z", "title": "Past Simple" }
  }
}
```

- Włączone do **eksportu, importu i resetu**. Import waliduje strukturę i limity długości (ucinaj do 10 000 znaków).
- Notatki wchodzą do indeksu wyszukiwarki (A.1) po załadowaniu profilu.
- Renderuj wyłącznie jako tekst.

### B.4 Kryteria odbioru

- [ ] Panel notatek chowa się domyślnie i otwiera po kliknięciu na wszystkich typach stron.
- [ ] Zapis automatyczny, kropka przy istniejącej notatce, limit znaków.
- [ ] Strona „Moje notatki" działa, dane są w eksporcie/imporcie/resecie.
- [ ] Notatki są wyszukiwalne.
