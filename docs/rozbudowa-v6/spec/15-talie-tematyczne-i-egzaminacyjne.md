# Specyfikacja 15 – Talie tematyczne A1–B1 i talie pod egzaminy

Dziesięć nowych talii wbudowanych w formacie z paczki v5 (spec 10). Silnik fiszek się nie zmienia; dochodzą tylko dane, oznaczenia egzaminów na kartach i kafelki na stronach egzaminów.

## 1. Lista talii

| id | Tytuł | Poziom | Kart | Typy kart |
| --- | --- | --- | --- | --- |
| `temat-dom` | Dom i mieszkanie | A1–B1 | 30–40 | typed + cloze |
| `temat-jedzenie` | Jedzenie i gotowanie | A1–B1 | 30–40 | typed + cloze |
| `temat-praca` | Praca i szkoła | A1–B1 | 30–40 | typed + cloze |
| `temat-podroze` | Podróże i transport | A1–B1 | 30–40 | typed + cloze |
| `temat-zdrowie` | Zdrowie i ciało | A1–B1 | 30–40 | typed + cloze |
| `temat-emocje` | Emocje i charakter | A1–B1 | 30–40 | typed + cloze |
| `temat-technologia` | Technologia i internet | A1–B1 | 30–40 | typed + cloze |
| `egz-e8` | Egzamin ósmoklasisty – wyrażenia | A2 | 40 | cloze + basic + typed |
| `egz-matura` | Matura – wyrażenia | B1–B2 | 50 | cloze + basic + typed |
| `egz-b2-first` | B2 First – wyrażenia | B2 | 50 | cloze + typed |

Pliki: `dane/fiszki/<id>.json` + wpis w `dane/fiszki/index.json` (pole `count` = rzeczywista liczba kart). Wszystkie domyślnie **wyłączone** (włączenie jednym przełącznikiem, jak dziś). Wzory: `przyklady/fiszki/temat-dom-przyklad.json`, `przyklady/fiszki/egz-e8-przyklad.json`.

## 2. Talie tematyczne – zasady treści

- Kolejność kart w pliku: **od A1 do B1** (nowe karty pojawiają się od najłatwiejszych). Każda karta ma `level` (`A1`/`A2`/`B1`) i tagi `["<temat>", "<poziom małymi>"]`.
- Proporcje: ok. 60% `typed` (PL → EN, słowo lub krótkie wyrażenie; `accepted` z wariantami BrE/AmE i z/bez przedimka, gdy oba są poprawne), ok. 40% `cloze` (kolokacje i typowe zdania tematu, `hint` po polsku).
- Słowa użyteczne w mówieniu i pisaniu o temacie (nie rzadkie nazwy). Na każdą talię min. 5 kolokacji czasownik + rzeczownik (`do the washing-up`, `book a table`).
- **Bez duplikatów** z istniejącymi taliami, zwłaszcza `slownictwo-podstawowe` (to samo `accepted[0]` / ta sama odpowiedź luki) – walidator ostrzega.
- `note` (opcjonalnie): jedna linijka o pułapce („*actual* ≠ aktualny”).

## 3. Talie egzaminacyjne – zasady treści

- Wyrażenia, które **przydają się** w danym egzaminie: typowe reakcje w minidialogach (E8, matura), kolokacje i wyrażenia przyimkowe (matura rozszerzona, B2 First Part 1–2), rodziny wyrazów (B2 First Part 3), zwroty do wypowiedzi pisemnej i ustnej.
- **Oznaczenie egzaminów** z tagów karty (bez nowego pola): kody `e8`, `mp`, `mr`, `matura` (= MP + MR), `b2`, `c1`. Na przodzie i tyle karty małe chipy „E8”, „MP”, „MR”, „B2”, „C1” (skrót + tekst dostępny „Przydatne na: egzamin ósmoklasisty”). Działa też dla istniejących kart, które już mają tagi `e8` i `matura` (np. `slownictwo-podstawowe`).
- **Uczciwość oznaczenia**: chip znaczy „przydatne na tym egzaminie”, nie „było w arkuszu”. W opisie talii i w podpowiedzi chipa: „Wyrażenia typowe dla zadań tego egzaminu. Oryginalne zdania, nie z arkuszy.” Żadnych treści z arkuszy CKE ani Cambridge.
- `basic` w egzaminacyjnych: przód = sytuacja po polsku („Przepraszasz za spóźnienie”), tył = reakcja po angielsku + `note`.

## 4. Integracje

- **Przeglądanie talii** (spec 10 sekcja 5.3): filtr „Egzamin” (chipy E8/MP/MR/B2/C1) w widoku kart.
- **Strony egzaminów** (`exam-core`, strona startowa egzaminu i C1): kafelek „Fiszki do egzaminu” – nazwa talii, liczba kart, stan (nowe/w nauce/opanowane), przycisk „Włącz i ucz się” (włącza talię i otwiera sesję) albo „Ucz się”, gdy już włączona. Mapowanie: E8 → `egz-e8`, MP i MR → `egz-matura`, B2 → `egz-b2-first`, C1 → istniejące `czasowniki-frazowe` + `kolokacje`.
- **Strony poziomów A1–B1**: pod listą w kategorii „Słownictwo” link „Fiszki tematyczne: Dom, Jedzenie, …” do listy talii przefiltrowanej po poziomie.
- **Wyszukiwarka**: skróty do talii po tytule (jak dziś skrót „Fiszki”).

## 5. Walidator (rozszerz `tools/waliduj-fiszki.js`, reguły: `scripts/validate_v6.py`)

- liczba kart w zakresie z tabeli, `count` w `index.json` = rzeczywista,
- ids `<talia>-NNN` unikalne w całym banku, typy i pola wg spec 10, `cloze` z dokładnie jedną luką,
- talie tematyczne: każda karta ma `level` ∈ {A1, A2, B1}, kolejność poziomów niemalejąca,
- talie egzaminacyjne: każda karta ma co najmniej jeden tag egzaminu,
- ostrzeżenie (nie błąd) przy duplikacie odpowiedzi między taliami.

## 6. Kryteria odbioru

- [ ] 10 talii, walidator bez błędów, liczby kart zgodne z tabelą.
- [ ] Chipy egzaminów na kartach (nowych i istniejących z tagami), filtr w przeglądaniu.
- [ ] Kafelek „Fiszki do egzaminu” na stronach E8, MP, MR, B2, C1.
- [ ] Domyślne włączenia talii bez zmian (nowe wyłączone).
