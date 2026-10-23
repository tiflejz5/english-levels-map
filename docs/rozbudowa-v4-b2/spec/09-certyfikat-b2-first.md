# Specyfikacja 09 – Certyfikat B2 (Cambridge B2 First)

Aktywujemy ostatnią zakładkę egzaminową: **Certyfikat B2** (`/certyfikat-b2`). Zbudowana jest na generycznym module egzaminu (z paczki v2) i jest bardzo podobna do istniejącego modułu **Certyfikat C1**, więc maksymalnie **ponownie używamy komponentów C1**.

## 1. Fakty o egzaminie (źródło: oficjalna strona Cambridge English, format B2 First)

| Papier | Czas | Części | Udział |
| --- | --- | --- | --- |
| Reading and Use of English | 1 godz. 15 min | 7 części, 52 pytania | 40% |
| Writing | 1 godz. 20 min | 2 zadania | 20% |
| Listening | ok. 40 min | 4 części, 30 pytań | 20% |
| Speaking | 14 min (para) | 4 części | 20% |

- Reading and Use of English: Part 1 multiple-choice cloze (8), Part 2 open cloze (8), Part 3 word formation (8), Part 4 key word transformation (6, do 2 pkt), Part 5 multiple choice (6, po 2 pkt), Part 6 gapped text (6, po 2 pkt), Part 7 multiple matching (10).
- Writing: Part 1 esej (obowiązkowy), Part 2 jedno z kilku zadań (artykuł, e-mail/list, recenzja, raport w B2 First, opowiadanie w B2 First for Schools); po 140–190 słów.
- Listening: Part 1 osiem krótkich nagrań (A/B/C), Part 2 uzupełnianie zdań (10), Part 3 dopasowanie (5, osiem opcji), Part 4 wywiad (7, A/B/C). Nagrania odtwarzane dwa razy.
- Speaking: Part 1 rozmowa z egzaminatorem, Part 2 porównanie zdjęć, Part 3 wspólne zadanie i decyzja, Part 4 dyskusja.
- Wynik: Cambridge English Scale. Orientacyjnie 160–172 (ocena C), 173–179 (B), 180–190 (A, poziom C1), 140–159 (certyfikat B1). **Skalę potwierdź** w materiałach Cambridge; oficjalna strona formatu, z której korzystałem, jej nie zawierała.
- Daty egzaminu zależą od centrum egzaminacyjnego, więc **nie ma domyślnej daty**: pole daty w odliczaniu jest puste (`suggestedDate: null`) i użytkownik ustawia je sam.

W aplikacji zachowaj zastrzeżenie „stan na październik 2026, sprawdź cambridgeenglish.org" z linkiem.

## 2. Zawartość paczki

```
certyfikat-b2/
  manifest.json
  powiazania.json
  strony/*.md              (14)
  trening/pisanie.json     (7 zadań)
  trening/mowienie.json    (Speaking: dane trenera)
  cwiczenia/*.json         (15 zestawów)
dane/egzaminy-manifest.json  (wpis certyfikat-b2 do podmiany)
scripts/validate_b2.py
```

## 3. Formaty zestawów

1. **Silnik C1 (istniejący):** `multiple-choice-cloze` (Part 1), `open-cloze` (Part 2), `word-formation` (Part 3), `transformation` (Part 4). Używaj istniejących komponentów.
   - **Zmiana wymagana w `transformation`:** nowe pole `wordLimit: [min, max]` (dla B2 `[2, 5]`, dla C1 `[3, 6]`). Komunikat w instrukcji i walidacja liczby wyrazów (skróty typu doesn't liczą się jako dwa słowa) mają brać limit z pola. **Gdy pola brak, zachowaj dotychczasowe `[3, 6]`**, żeby C1 działał bez zmian.
2. **Nowy silnik zadań (spec 01 z paczki v2):** `items` w typach `multiple-choice` i `short-answer`.
   - Reading Part 5: `kind: "reading"` z `passage`.
   - Reading Part 6 i 7: `fixedOrder: true` (litery A–G lub A–D, bez tasowania).
   - Listening Part 1: `kind: "listening"`, `script` w każdym zadaniu.
   - **Rozszerzenia silnika potrzebne dla Listening Parts 2–4:**
     - Pole **`script` na poziomie zestawu** (wspólne nagranie dla wszystkich zadań zestawu). Odtwarzanie raz dla całego zestawu, z licznikiem odsłuchów (2) i ukrytym transkryptem do końca. Pole `script` w pojedynczym zadaniu działa jak dotąd.
     - **`short-answer` z `kind: "listening"`** (Part 2): akceptuj odpowiedzi z listy `accepted`, bez uwzględnienia wielkości liter.
     - **Do ośmiu opcji** w `multiple-choice`, gdy `fixedOrder: true` (Part 3). W zadaniach tasowanych nadal maks. cztery.
   - Walidator z tej paczki zakłada powyższe limity.

## 4. Trener pisania

`trening/pisanie.json` w formacie jak w poprzednich modułach:

- `wordRange [140, 190]`, `targetRange [150, 180]`, `warnBelow 120`, czas 40 minut na zadanie.
- Strefy licznika: poniżej 120 czerwony („za krótko, ryzyko niskiej oceny za treść"), 120–139 żółty, 140–190 zielony, powyżej 190 żółty („tekst może być za długi").
- Rubryka: Content, Communicative Achievement, Organisation, Language, każde 0–5 (samoocena).
- Zadania mają `part` (1 lub 2) i `genre`. Pokaż je pogrupowane: Part 1 (esej), Part 2 (artykuł, e-mail, recenzja, raport, opowiadanie). Etykieta „B2 First for Schools" przy opowiadaniu i „B2 First" przy raporcie.
- `model` pokazywany po zakończeniu obok tekstu użytkownika.

## 5. Nowy trener: Speaking

Dane w `trening/mowienie.json`. Brak nagrywania dźwięku w aplikacji (prywatność). Widok:

1. **Wybór części** (1–4) w czterech zakładkach.
2. **Part 1:** losowa grupa pytań na wybrany temat, pytania pojawiają się po jednym, odliczanie 2 minut, przycisk „Następne pytanie".
3. **Part 2:** losowa karta (dwie sytuacje zamiast zdjęć + pytanie), odliczanie **60 sekund** na wypowiedź (zegar i pasek), przycisk „Pokaż pytanie do partnera" po czasie. Pokaż przypomnienie: porównuj, spekuluj, nie opisuj po kolei.
4. **Part 3:** zadanie z pięcioma opcjami w „okręgu" lub chipach, odliczanie 2 minut dyskusji i 1 minuty decyzji. Tryb „z partnerem" (instrukcja dla dwóch osób) i „solo" (wypowiadasz się za obie strony).
5. **Part 4:** pytania dyskusyjne po jednym, odliczanie 4 minut łącznie.
6. **Samoocena** po sesji: cztery kryteria z dataset `criteria` (suwak 1–5, podpowiedź z `hint`). Zapisz wynik per profil jako historię sesji (data, część, oceny) w nowym kluczu z `version`. Wchodzi do eksportu, importu i resetu.
7. Dostępność: timer ma `aria-live="polite"` (ogłaszaj tylko 30 s i 10 s do końca), przycisk start/pauza, `prefers-reduced-motion` wyłącza animację paska.
8. Wpisz w UI: „Nagrywaj się telefonem, jeśli chcesz odsłuchać".

## 6. Klimat wizualny

Chłodny turkus/morski (`#1f6f8b`) z ciepłym bursztynowym akcentem (`#d9a21b`), wyraźnie odróżnialny od C1 (granat+złoto) i MR (indygo+miedź). `data-section="certyfikat-b2"`, AA w obu motywach, tokeny z `DESIGN.md`.

## 7. Rejestr i nawigacja

W `egzaminy-manifest.json` projektu podmień wpis `certyfikat-b2` (status `active`, kod B2). Strona „W trakcie pracy" dla B2 znika. W panelu wszystkie pięć egzaminów aktywne: E8, MP, MR, B2, C1.

## 8. Weryfikacja faktów

- Dane o formacie pochodzą z oficjalnej strony Cambridge English. Skala wyników i daty centrów nie zostały potwierdzone w źródle.
- W QA spróbuj otworzyć: cambridgeenglish.org (format B2 First, skala Cambridge English Scale, B2 First for Schools). Zgłoś różnice w podsumowaniu, nie poprawiaj po cichu.
- Teksty w paczce są oryginalne. **Nie kopiuj** materiałów Cambridge (sample papers) do projektu.

## 9. Kryteria odbioru

- [ ] `/certyfikat-b2`: wszystkie strony, 15 zestawów ćwiczeń, trener pisania, trener Speaking, odliczanie, ramki na stronach tematów.
- [ ] Transformacje B2 mają limit 2–5 słów, a C1 nadal 3–6.
- [ ] Listening Part 2–4 działają z wspólnym nagraniem zestawu i licznikiem odsłuchów.
- [ ] Part 3 pokazuje osiem opcji A–H bez tasowania.
- [ ] Speaking: timery działają, sesje zapisują się per profil.
- [ ] E8, MP, MR i C1 bez regresji.
- [ ] `python3 scripts/validate_b2.py` (lub odpowiednik w npm) i build przechodzą.
