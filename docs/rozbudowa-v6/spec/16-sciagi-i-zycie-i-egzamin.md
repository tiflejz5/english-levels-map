# Specyfikacja 16 – Ściągi do druku i sekcje „Życie i egzamin”

Dwie zmiany w teorii A1–C2: (1) jednostronicowa ściąga na każdy poziom, gotowa do wydruku, (2) na każdej ze 110 podstron sekcja z parami przykładów: zdanie z życia i to samo zjawisko w zadaniu w stylu egzaminacyjnym.

## 1. Ściągi poziomów

### 1.1 Treść

Plik na poziom: `niezbednik/sciagi/<a1|a2|b1|b2|c1|c2>.md` (frontmatter: `id: sciaga-a1`, `level`, `title`, `summary`). Wzór pełnej ściągi: `przyklady/sciagi/a2-przyklad.md`.

Stała struktura (nagłówki dokładnie takie, bo steruje nimi układ druku):

1. `## Czasy i formy` – tabela wzorów: forma, budowa, przykład (maks. 8 wierszy).
2. `## Gramatyka` – 4–8 punktów: reguła w jednej linii + przykład.
3. `## Zwroty` – 10–16 zwrotów z funkcji komunikacyjnych poziomu (EN – PL).
4. `## Słowa-sygnały` – tabela słowo → czas/struktura (np. *already* → Present Perfect), maks. 10 wierszy.
5. `## Uwaga na` – 5 najczęstszych błędów Polaków na tym poziomie (źle → dobrze).

- **Jedna strona A4** po wydruku (w pionie, marginesy 12 mm, tekst 9,5–10,5 pt). To twardy wymóg odbioru (sekcja 1.4).
- Treść wynika z podstron poziomu (nie wymyślaj nowych zagadnień); każdy punkt może mieć link `[[id]]` do podstrony (w druku link wypada jako zwykły tekst).
- Wyższe poziomy mogą zamienić „Czasy i formy” na „Struktury” (C1–C2: inwersja, cleft sentences, mixed conditionals) – nazwa nagłówka wtedy `## Struktury`.

### 1.2 Widok

- Route `#/a1/sciaga` (analogicznie dla innych poziomów). Na stronie poziomu, obok podsumowania, karta „Ściąga A1 – jedna strona do druku” z przyciskami **Otwórz** i **Drukuj**.
- Na ekranie: zwykła strona treści (szerokość tekstowa), nad treścią przycisk „Drukuj” (`window.print()`).
- Build: `tools/zbuduj-niezbednik.js` dołącza ściągi do `niezbednik-dane.js` (jak podsumowania), wyszukiwarka indeksuje je jako „Ściąga A1”.

### 1.3 Druk – `@media print` (globalnie, nie tylko dla ściąg)

Dla **każdej** strony treści:

- ukryj: lewy panel, górny pasek, wyszukiwarkę, przyciski, „Umiem”, notatki, toasty, okna, tła z warstwicami, sekcję „Sprawdź się”;
- wymuś jasne tokeny (biały papier, czarny tekst; kolory poziomów tylko jako cienkie linie i znaczniki), bez cieni i zaokrągleń kart;
- `@page { size: A4; margin: 12mm; }`, tabele `break-inside: avoid`, nagłówki `break-after: avoid`;
- linki: tekst bez podkreślenia, bez dopisywania adresów;
- odpowiedzi ukryte pod „Pokaż odpowiedzi” drukują się na końcu strony pod nagłówkiem „Odpowiedzi” (mniejszym krojem), żeby kartka nadawała się do ćwiczeń.

Dodatkowo dla ściąg (klasa np. `.sciaga` na kontenerze):

- dwie kolumny (`column-count: 2`, odstęp 6 mm), nagłówek strony na całą szerokość: kod poziomu dużym krojem Fraunces, nazwa poziomu, „English Levels Map”;
- tabele w kolumnie bez przewijania (zawijanie, `font-size` mniejszy w tabelach);
- stopka z datą wydruku nie jest potrzebna.

### 1.4 Kontrola jednej strony

Skrypt `tools/sciagi-pdf.js` (lub w testach wizualnych): headless Chromium drukuje `#/<poziom>/sciaga` do PDF i sprawdza **liczbę stron = 1** dla każdego poziomu. Skrypt jest narzędziem deweloperskim (może wymagać `npx playwright`), nie częścią `npm run build`. Gdy ściąga ma 2 strony – skróć treść, nie zmniejszaj kroju poniżej 9,5 pt.

## 2. Sekcja „Życie i egzamin” na podstronach

### 2.1 Cel

Przy każdym temacie od razu widać, jak brzmi w normalnej rozmowie i jak wraca w zadaniu egzaminacyjnym. Wzór sekcji: `przyklady/zycie-i-egzamin-przyklad.md`.

### 2.2 Format (Markdown, bez zmian w rendererze)

```markdown
## Życie i egzamin

| Z życia | W stylu egzaminu | Egzamin |
| --- | --- | --- |
| *I've lived here since 2019.* (Mieszkam tu od 2019.) | Uzupełnij: We ___ (know) each other for ten years. → **have known** | E8 · MP |
| *Have you ever tried sushi?* (Próbowałeś kiedyś sushi?) | Wybierz reakcję: – Have you ever been to Italy? – a) Yes, I went there last year. b) Yes, I have gone last year. → **a** | MP |
| *She's just left.* (Właśnie wyszła.) | Transformacja: She left a moment ago. **JUST** → She ___ . → **has just left** | MR · B2 |
```

- Dokładnie 3 kolumny i **3–4 wiersze**.
- „Z życia”: naturalne zdanie, które ktoś naprawdę powie lub napisze (kursywa), w nawiasie polskie tłumaczenie.
- „W stylu egzaminu”: krótka forma zadania (Uzupełnij / Wybierz / Transformacja / Przetłumacz fragment / Słowotwórstwo / Popraw błąd), treść zadania, strzałka `→` i odpowiedź pogrubiona. Typ zadania musi pasować do egzaminów z kolumny 3.
- „Egzamin”: kody rozdzielone ` · ` z listy `E8`, `MP`, `MR`, `B2`, `C1`, zgodne z poziomem:

| Poziom podstrony | Dozwolone kody |
| --- | --- |
| A1–A2 | E8, MP |
| B1 | E8, MP, MR, B2 |
| B2 | MP, MR, B2, C1 |
| C1 | MR, B2, C1 |
| C2 | C1 |

- **Treść oryginalna**: zadania „w stylu”, nigdy przepisane z arkuszy CKE czy Cambridge.
- Umiejscowienie: bezpośrednio **po** sekcji „Przykłady” (gdy jej nie ma – po pierwszej sekcji z wyjaśnieniem, np. „Budowa”/„Kiedy używamy”), zawsze **przed** „Typowe błędy Polaków” i „Ćwiczenie”.

### 2.3 Wygląd

- Nowa reguła w `CALLOUT_RULES` (`js/callouts.js`, przed regułą „przykład”): `match: /^życie i egzamin/i`, typ `real-exam`, ikona np. `arrow-left-right`, etykieta „Życie i egzamin”. Klasa `.callout-real-exam` w CSS wg DESIGN.md sekcja 3.7 (tokeny, oba motywy, kontrast AA – sprawdź `node tools/kontrast.js`).
- Kody egzaminów w trzeciej kolumnie zamieniane na chipy w kolorach egzaminów z rejestru (`dane/egzaminy-manifest.json`, `accent`), z tekstem – nie tylko kolor. Chip linkuje do strony egzaminu.
- Na telefonie tabela zamienia się w karty (wiersz = karta: „Z życia” nad „W stylu egzaminu”, chipy na dole) zamiast przewijania w poziomie.

### 2.4 Walidacja

Skrypt (reguły w `scripts/validate_v6.py`, przenieś do `tools/`): każda podstrona z `index.json` ma sekcję `## Życie i egzamin` z 3–4 wierszami, 3 kolumnami, strzałką `→` i pogrubioną odpowiedzią w kolumnie 2, kodami dozwolonymi dla poziomu i we właściwym miejscu (przed „Typowe błędy Polaków”).

## 3. Kryteria odbioru

- [ ] 6 ściąg, każda drukuje się na **1 stronę A4** (raport ze skryptu), w obu motywach ekran wygląda poprawnie.
- [ ] Druk dowolnej podstrony bez interfejsu, z odpowiedziami na końcu.
- [ ] 110 podstron z sekcją „Życie i egzamin”, walidator bez błędów.
- [ ] Callout i chipy w obu motywach z kontrastem AA, karty zamiast tabeli od 360 px.
