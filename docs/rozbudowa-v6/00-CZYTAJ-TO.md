# Paczka v6 – więcej treści i nowe narzędzia nauki

Jedenaście zmian z listy pomysłów: słowniczek osobisty, ściągi do druku, sekcje „Życie i egzamin”, wzorcowe wypracowania z komentarzami, bank zwrotów, karty do mówienia, nowe typy zadań, większa pula testu poziomu, testy końcowe poziomów, talie tematyczne i talie pod egzaminy.

## Zawartość

```
00-CZYTAJ-TO.md
prompty.md                                   prompty do Claude Code, etap po etapie
spec/12-nowe-typy-zadan.md                   gap-fill, match, transformation, translate, dictation
spec/13-test-poziomu-i-testy-koncowe.md      pula 60 pytań + testy końcowe A1–C2 i znaczki na Szlaku
spec/14-slowniczek-osobisty.md               zaznacz słowo → talia „Moje słowa” z kontekstem
spec/15-talie-tematyczne-i-egzaminacyjne.md  7 talii tematycznych A1–B1 + 3 talie egzaminacyjne
spec/16-sciagi-i-zycie-i-egzamin.md          ściągi A4 + druk, sekcja „Życie i egzamin” na 110 podstronach
spec/17-pisanie-wzorce-i-zwroty.md           wzorce z komentarzami na marginesie + bank zwrotów
spec/18-trener-mowienia.md                   matura ustna, B2 First, E8 (dodatkowo): losowanie, nagrywanie
przyklady/                                   wzorce formatu i jakości (przechodzą walidator)
  cwiczenia/v6-pilot-nowe-typy.json          po 2 zadania każdego nowego typu
  test-poziomu/pytania-przyklad.json         6 pytań: słownictwo i czytanie A1, B1, C1
  testy-poziomow/a1-przyklad.json            8 zadań testu końcowego A1
  fiszki/temat-dom-przyklad.json             8 kart talii tematycznej
  fiszki/egz-e8-przyklad.json                6 kart talii egzaminacyjnej
  pisanie/mr-essay-phones-komentarze.json    12 komentarzy do istniejącej rozprawki z matury rozszerzonej
  pisanie/zwroty-przyklad.json               2 grupy banku zwrotów
  mowienie/matura-ustna-przyklad.json        po 1 karcie każdej części matury ustnej
  mowienie/e8-mowienie-przyklad.json         3 karty treningu A2
  sciagi/a2-przyklad.md                      pełna ściąga A2
  zycie-i-egzamin-przyklad.md                sekcja dla podstrony Present Perfect (A2)
scripts/validate_v6.py                       walidator wszystkich nowych danych (wzór reguł dla tools/*.js)
```

## Zasady (obowiązkowe)

1. **Jeden etap = jedna gałąź** `feature/v6-<nazwa>` odcięta od aktualnego `main`, jeden commit na krok. Po etapie: build, walidatory, testy, zrzuty ekranu, podsumowanie i **czekaj na „OK”**. Merge do `main` i push dopiero po „OK”.
2. **Nie zmieniaj istniejących kluczy ani formatów localStorage.** Dozwolone: nowe opcjonalne pola (opisane w specyfikacjach) i dwa nowe klucze: `elm_leveltests_v1` (spec 13) i `elm_phrases_v1` (spec 17). Nowe klucze per profil przez `ELM.profileData`, w `try/catch`, w eksporcie, imporcie i resecie.
3. **Architektura bez zmian:** zwykłe `<script src>`, wszystko w `window.ELM`, bez modułów ES i `fetch()` (działanie z `file://`), dane JSON → generowane `.js` ładowane na żądanie, bez CDN, bez innerHTML z danymi.
4. **Wygląd:** `DESIGN.md` (tokeny, oba motywy, AA – `node tools/kontrast.js`, cele ≥ 44 px, `prefers-reduced-motion`, kolor nigdy jedynym nośnikiem informacji), od 360 px bez poziomego przewijania.
5. **Po każdej zmianie JS/CSS** podbij `?v=…` w `index.html`. Aktualizuj README (adresy, klucze, formaty danych) w tym samym etapie.
6. **Walidator:** reguły z `scripts/validate_v6.py` przenieś do walidatorów w `tools/` (Node, jak w poprzednich paczkach) i wpinaj do `npm run validate` / `npm run build` **tylko dla części już wdrożonych** (`--only`). Plik Pythona zostaje jako referencja i do szybkiego sprawdzenia: `python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only <części>`.

## Zasady treści (każdy etap z nowymi danymi)

- **Oryginalne treści.** Zadania „w stylu” egzaminów, nigdy przepisane z arkuszy CKE, Cambridge ani podręczników. Teksty czytania, opisy ilustracji i wypracowania pisane od zera.
- **Język:** angielski brytyjski (warianty amerykańskie w `accepted`, gdy naturalne), polskie wyjaśnienia krótkie (1–2 zdania), polskie znaki i typograficzne cudzysłowy „…” jak w repo.
- **Poziom** zgodny z podstroną/poziomem CEFR. Dystraktory to **typowe błędy Polaków** (patrz sekcje „Typowe błędy Polaków” na podstronach), nie absurdalne opcje.
- **Pliki z `przyklady/`** to wzorzec formatu i jakości. Tam, gdzie pasują do docelowych plików (pytania testu poziomu, zadania testu A1, karty talii, komentarze do `essay-phones`, ściąga A2, sekcja „Życie i egzamin” Present Perfect), **wykorzystaj je** zamiast pisać od nowa.
- **Recenzja przed commitem:** po każdej partii treści uruchom subagenta-recenzenta, który **rozwiązuje zadania bez klucza** i zgłasza: więcej niż jedną poprawną odpowiedź, brak naturalnych wariantów w `accepted`, błędy językowe, niezgodność poziomu. Popraw zgłoszenia, zanim zrobisz commit.

## Kolejność etapów

| Etap | Co | Spec | Zależy od |
| --- | --- | --- | --- |
| 1 | Nowe typy zadań + 5 zestawów pilotażowych | 12 | – |
| 2 | Pula testu poziomu 60 pytań | 13.1 | – |
| 3 | Testy końcowe poziomów + znaczki | 13.2 | 1 |
| 4 | Słowniczek osobisty | 14 | – |
| 5 | Talie tematyczne i egzaminacyjne | 15 | – |
| 6 | Ściągi + druk | 16.1 | – |
| 7 | „Życie i egzamin” na 110 podstronach | 16.2 | – |
| 8 | Wzorcowe wypracowania z komentarzami | 17.1 | 4 (menu zaznaczenia), opcjonalnie |
| 9 | Bank zwrotów + panel w trenerze | 17.2 | 8 (sekcja Pisanie) |
| 10 | Karty do mówienia z nagrywaniem | 18 | – |
| 11 | Kontrola końcowa | wszystkie | 1–10 |

Etapy bez zależności można robić w dowolnej kolejności.

## Walidacja

```
python3 docs/rozbudowa-v6/scripts/validate_v6.py . --przyklady docs/rozbudowa-v6/przyklady   # wzorce: 0 błędów
python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only zadania,test                         # po etapach 1–2
python3 docs/rozbudowa-v6/scripts/validate_v6.py .                                             # po etapie 10: 0 błędów
```

Na dzisiejszym `main` pełny walidator zgłasza ok. 210 błędów – to lista rzeczy do zrobienia, nie usterka.
