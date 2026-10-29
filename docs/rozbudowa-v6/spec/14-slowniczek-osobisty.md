# Specyfikacja 14 – Słowniczek osobisty („Moje słowa”)

Zaznaczasz słowo lub wyrażenie w dowolnej treści aplikacji i jednym kliknięciem zapisujesz je do talii fiszek **„Moje słowa”** razem ze zdaniem, z którego pochodzi. Słówko od razu wchodzi do powtórek.

## 1. Co już jest i co się zmienia

Paczka v5 (spec 10 sekcja 5.4, `js/fiszki.js`, funkcje `selectionText` / `openFromSelection`) ma przycisk „Dodaj do fiszek” przy zaznaczeniu, ale:

- działa tylko na podstronach niezbędnika (`view === "page"`, `#view article.md`),
- otwiera formularz, w którym trzeba ręcznie wpisać tył karty,
- nie zapisuje kontekstu ani źródła.

Ta specyfikacja **rozszerza** ten mechanizm (nie dubluj go): ten sam przycisk staje się małym menu z dwiema akcjami.

## 2. Gdzie działa zaznaczanie

Treść do czytania (tylko angielski tekst ma sens, ale nie filtruj po języku poza sekcją 3.4):

- podstrony niezbędnika i podsumowania poziomów,
- strony egzaminów (`exam-core`) i Certyfikatu C1,
- karty Laboratorium czasów,
- teksty `passage` i transkrypty nagrań w zadaniach **po sprawdzeniu** odpowiedzi (przed sprawdzeniem nie, żeby nie rozpraszać),
- wzorcowe wypracowania i bank zwrotów (spec 17), ściągi (spec 16).

Nigdy: pola formularzy, notatki, `contenteditable`, sama sesja fiszek.

## 3. Menu przy zaznaczeniu

Pojawia się nad zaznaczeniem (pod nim, gdy brak miejsca), jak dziś przycisk.

| Akcja | Kiedy | Co robi |
| --- | --- | --- |
| **Do Moich słów** (główna) | zaznaczenie 1–6 słów, ≤ 60 znaków, z tekstu angielskiego (3.4) | od razu tworzy kartę (sekcja 4), toast „Dodano „commute” do Moich słów” z akcjami **Dodaj znaczenie** i **Cofnij** |
| **Utwórz fiszkę…** | zawsze | dotychczasowy formularz (bez zmian) |

- Skróty: `Ctrl/Cmd+Shift+F` = dotychczasowy formularz (bez zmian), **klawisz `M` (bez modyfikatorów) = Do Moich słów**, tylko gdy jest zaznaczenie i fokus nie stoi w polu tekstowym (`Ctrl+Shift+S` odpada, bo w Firefoksie robi zrzut ekranu).
- „Dodaj znaczenie” otwiera małe okno z jednym polem „Znaczenie po polsku” (wypełnia `hint`), Enter zapisuje.
- Na telefonie zaznaczenie wywołuje systemowe menu – nasze menu stoi **pod** zaznaczeniem, żeby go nie zasłaniać.
- Ustawienie w menu profilu → Ustawienia nauki: „Pokazuj menu przy zaznaczeniu tekstu” (domyślnie włączone).

### 3.4 Kiedy „Do Moich słów” jest niedostępne

Zaznaczenie z polskimi znakami (ą, ć, ę, ł, ń, ó, ś, ź, ż) albo z komórki tabeli w kolumnie z nagłówkiem „Polski”/„Po polsku”/„Znaczenie” → tylko „Utwórz fiszkę…”.

## 4. Karta „Moje słowa”

Talia systemowa `u-moje-slowa` (tytuł „Moje słowa”, `system: "words"` – analogicznie do `u-moje-bledy` / `system: "mistakes"`). Tworzona przy pierwszym dodaniu, domyślnie **włączona** w powtórkach.

Karta (w `userCards`, klucz `elm.<profileId>.fiszki` bez zmiany wersji, nowe pola opcjonalne):

```json
{
  "id": "u-…",
  "deck": "u-moje-slowa",
  "type": "cloze",
  "text": "Most people {{commute}} to work by train.",
  "hint": "dojeżdżać do pracy",
  "word": "commute",
  "source": { "route": "#/b1/slownictwo-praca", "title": "Praca i kariera (B1)" },
  "addedAt": "2026-11-03"
}
```

- **Zdanie kontekstu** (czysta funkcja `extractSentence(blockText, selection)` + testy): tekst najbliższego bloku (`p`, `li`, `td`, `blockquote`, `dd`), podział na zdania po `. ! ?` + spacja + wielka litera (bez dzielenia na „e.g.”, „Mr.”, „etc.”, liczbach „3.5”), zdanie zawierające zaznaczenie, maks. 220 znaków (dłuższe przycięte z „…” po obu stronach wokół słowa).
- **Luka**: `makeCloze(sentence, selection)` zamienia **pierwsze** wystąpienie zaznaczenia (bez względu na wielkość liter, z granicami słów) na `{{…}}`, zachowując zapis z tekstu. Nie znaleziono → karta `basic` (przód = słowo, tył = zdanie).
- **Brak tłumaczenia** (`hint` puste): przód karty pokazuje zdanie z luką i podpowiedź „zaczyna się na „c”” (pierwsza litera). Długość luki nie zdradza liczby liter (jak w spec 10).
- **Duplikaty**: klucz `normalize(word)`. To samo słowo z innego zdania → toast „Masz już „commute” w Moich słowach” z akcjami „Pokaż” i „Dodaj drugi przykład” (dopisuje zdanie do pola `examples` istniejącej karty, maks. 3; tył karty pokazuje wszystkie przykłady).
- Walidacja w `fiszki-logic.js` (normalizacja `userCards`) musi **zachowywać** nowe pola: `word` ≤ 60, `source.route` (tylko `#/…`) ≤ 200, `source.title` ≤ 120, `addedAt` RRRR-MM-DD, `examples` ≤ 3 × 220 znaków. Import starego pliku bez tych pól działa.

## 5. Widok „Moje słowa”

Route `#/fiszki/moje-slowa`, link na górze strony Fiszki (kafelek z liczbą słów) i w wyszukiwarce („Moje słowa”).

- Tabela/lista: słowo, znaczenie (edycja w miejscu), zdanie z wyróżnionym słowem, źródło (link do miejsca, z którego pochodzi), data, stan karty (nowa / w nauce / opanowana – tekst, nie tylko kolor).
- Wyszukiwanie, sortowanie (najnowsze, A–Z, najsłabsze), filtr „bez znaczenia” (szybkie uzupełnianie).
- Akcje: usuń (z potwierdzeniem), zawieś, eksport CSV (słowo; znaczenie; zdanie; źródło – istniejący eksport talii).
- Stan pusty: krótka instrukcja z ilustracją zaznaczenia i skrótem klawiszowym.

## 6. Podkreślenie zapisanych słów (opcjonalne, domyślnie wyłączone)

Ustawienie „Podkreślaj moje słowa w tekstach”: na stronach z sekcji 2 zapisane słowa dostają kropkowane podkreślenie, a najechanie/fokus pokazuje znaczenie. Implementacja przez `TreeWalker` po węzłach tekstowych `article.md` po renderze, maks. 300 słów w słowniczku, granice słów, bez dotykania linków, kodu i nagłówków. Wyłączone przy > 300 słowach z komunikatem.

## 7. Integracje

- **Dziś**: kafelek fiszek liczy też karty „Moje słowa” (to zwykła talia).
- **Statystyki**: w sekcji „Fiszki” jedna liczba „Moje słowa: 42 (opanowane 9)”.
- **Seria nauki**: dodanie słowa nie jest aktywnością dnia (za łatwo nabić serię).
- **Bank zwrotów** (spec 17): przycisk „Do Moich słów” przy zwrocie tworzy kartę `basic` (przód PL, tył EN, `source` = bank zwrotów).

## 8. Testy

`extractSentence` (skróty, liczby, cudzysłowy, komórka tabeli, zdanie dłuższe niż 220), `makeCloze` (wielkość liter, granice słów, brak wystąpienia), wykrywanie polskiego, deduplikacja, normalizacja nowych pól przy imporcie.

## 9. Kryteria odbioru

- [ ] Zaznaczenie słowa na podstronie, stronie egzaminu, w Laboratorium i w tekście czytania (po sprawdzeniu) → karta w „Moich słowach” jednym kliknięciem, z poprawnym zdaniem i luką.
- [ ] „Dodaj znaczenie”, „Cofnij”, duplikaty, drugi przykład działają.
- [ ] Widok „Moje słowa” z edycją znaczenia i linkami do źródła; eksport/import zachowuje nowe pola.
- [ ] Menu dostępne z klawiatury (skrót + fokus wraca do tekstu), nie zasłania systemowego menu na telefonie.
- [ ] Brak nowego klucza localStorage, brak zmian formatu poza opcjonalnymi polami.
