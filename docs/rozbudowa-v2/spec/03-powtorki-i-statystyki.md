# Specyfikacja 03 – Dziennik podejść, automatyczne powtórki błędów i statystyki

Cel: każda odpowiedź w zadaniach jest zapamiętywana, błędy same trafiają do Dziennika błędów (z harmonogramem powtórek 1/3/7 dni z etapu poprzedniego), a użytkownik widzi, gdzie ma słabe punkty.

Wszystkie dane są **per profil**, lokalne (localStorage, każdy dostęp w try/catch), z polem `version`, objęte eksportem, importem i resetem. Dostosuj nazwy kluczy do istniejącej konwencji w aplikacji.

## 1. Dziennik podejść (attempts)

Klucz (przykład): `elm.<profileId>.attempts`.

```
{
  "version": 1,
  "items": [
    {
      "t": "2026-10-21T18:04:11.000Z",
      "day": "2026-10-21",
      "itemId": "a2-czasy-past-simple-1-08",
      "setId": "a2-czasy-past-simple-1",
      "topic": "a2-czasy-past-simple",
      "level": "A2",
      "type": "find-error",
      "tags": ["past-simple", "irregular-verbs"],
      "correct": false,
      "mode": "learn",
      "answer": "buyed"
    }
  ]
}
```

- `mode`: `learn`, `exam`, `mix`, `weak`, `review`.
- `answer`: odpowiedź użytkownika jako tekst (przycięta do 200 znaków). Dla `multiple-choice` tekst wybranej opcji, dla `reorder` ułożone zdanie, dla `find-error` „fragment → poprawka".
- Bufor kołowy: maks. 3000 wpisów na profil. Po przekroczeniu usuwaj najstarsze. Starsze dane można skompaktować do agregatów (`aggregates`: licznik prób i trafień per `itemId`) przed usunięciem, żeby statystyki długoterminowe nie znikały.
- Zapis po **każdej** odpowiedzi (nie tylko na końcu sesji).

## 2. Automatyczne trafianie błędów do Dziennika błędów

Po błędnej odpowiedzi (nie w trybie `exam` – tam dopiero po zakończeniu sesji):

1. Sprawdź ustawienie **„Dodawaj błędy do dziennika automatycznie"** (domyślnie włączone; przełącznik w menu profilu → „Ustawienia nauki"). Wyłączone = nie rób nic poza zapisem do attempts.
2. **Dedup:** wpis dziennika identyfikowany polem `sourceItemId` (id zadania). Jeśli już istnieje wpis tego zadania:
   - nieopanowany: nie dubluj; zaktualizuj `lastWrongAt`, zwiększ `wrongCount`, a jeśli był już na późniejszym etapie powtórek, cofnij go do etapu 1 (jutro),
   - opanowany: wznów go (status aktywny, etap 1) i oznacz „wrócił".
3. Jeśli nie istnieje, utwórz wpis z mapowaniem:

| Pole dziennika | Źródło |
| --- | --- |
| kontekst/pytanie | zadanie zbudowane do tekstu (patrz niżej) |
| moja odpowiedź | `answer` użytkownika |
| poprawna odpowiedź | wzorcowa odpowiedź (opcja poprawna, `answers[0]`, `fixes[0]`, `accepted[0]`) |
| reguła/dlaczego | `explanation` (+ `trap`, jeśli jest) |
| źródło | „Zestaw: {tytuł zestawu}" |
| kategoria | wg typu/tematu: `Gramatyka` dla tematów gramatycznych i czasów, `Słownictwo` dla słownictwa, `Use of English` dla zestawów C1, itp. |
| link do punktu niezbędnika | `topic` |
| `sourceItemId`, `auto: true`, `createdAt` | – |

Kontekst dla poszczególnych typów:
- `multiple-choice`: `prompt` (z dialogiem lub zdaniem z luką) i opcje w jednej linii,
- `reorder`: polski `context` + „Ułóż zdanie",
- `find-error`: pełne zdanie z błędem,
- `short-answer`: `prompt` z luką.

4. **Cofnięcie:** po dodaniu pokaż nienachalny komunikat (toast, 5 s) „Dodano do dziennika błędów" z przyciskiem „Cofnij". Nie pokazuj toastu przy każdym zadaniu w trybie szybkiej sesji: pokaż zbiorczo na ekranie podsumowania („Dodano 3 błędy do dziennika" + „Zobacz", „Cofnij wszystkie").
5. Wpisy automatyczne oznaczone w interfejsie ikoną (np. iskra) i filtrem „Automatyczne". Użytkownik może je edytować i usuwać jak ręczne. Opcja „Usuń wszystkie automatyczne" w dzienniku (z potwierdzeniem).
6. **Poprawna odpowiedź = powtórka:** jeśli użytkownik poprawnie rozwiąże zadanie, które ma aktywny wpis w dzienniku i **jest już do powtórki** (dziś lub zaległe), zaliczaj to jak „Wiedziałem(am)" (przesunięcie na kolejny etap). Pokaż małe oznaczenie „✓ zaliczona powtórka z dziennika". Jeśli powtórka jeszcze nie przypada, nie zmieniaj etapu.
7. Zapobiegaj lawinie: maks. 30 automatycznych wpisów dziennie na profil. Po przekroczeniu zbieraj błędy, ale informuj „Dziennik jest pełny na dziś" i dodawaj kolejne dopiero następnego dnia (albo w statystykach, bez powtórek).

## 3. Strona Statystyki

Route `/statystyki`, pozycja w panelu. Dane liczone z attempts + dziennika błędów + dni aktywności. Do wizualizacji użyj skilla `dataviz` (jeśli dostępny): paleta kolorów poziomów z DESIGN.md, dostępność, brak samego koloru jako nośnika znaczenia.

Sekcje (kafelki):

1. **Podsumowanie:** liczba odpowiedzi (7 dni / 30 dni / łącznie), trafność ogółem i w ostatnich 7 dniach, liczba rozwiązanych zestawów, dni nauki w tym miesiącu.
2. **Trafność wg tematu:** poziome paski (posortowane od najsłabszych), tylko tematy z co najmniej 5 próbami. Kliknięcie = przejście do strony tematu. Etykieta pokazuje temat, trafność i liczbę prób.
3. **Wg typu zadania** (wybierz formę, ułóż zdanie, znajdź błąd, krótka odpowiedź) i **wg poziomu** (A1–C2): trafność i liczba prób.
4. **Najsłabsze miejsca (top 5):** temat + trafność + przycisk „Ćwicz" (uruchamia sesję `weak` z tego tematu).
5. **Trend:** trafność tygodniowa z ostatnich 12 tygodni (linia lub słupki), z zaznaczeniem liczby prób, żeby małe próbki nie wprowadzały w błąd.
6. **Aktywność:** mapa cieplna ostatnich 12 tygodni (dni z aktywnością, z `markActivity()`), z podpisami dni tygodnia.
7. **Dziennik błędów:** liczba wpisów aktywnych / do powtórki dziś / opanowanych, najczęstsze kategorie i tematy.

Zasady:
- Przy małej próbce (< 5 prób) nie pokazuj procentu jako „oceny", tylko „za mało danych".
- Bez porównań z innymi użytkownikami, bez rankingów.
- Stan pusty z zachętą do pierwszego zestawu.

## 4. „Umiem" oparte o dowody (sugestia, nigdy automat)

Po zakończeniu zestawu przypisanego do tematu: jeśli **dwa ostatnie podejścia do tego zestawu mają wynik ≥ 80%** i punkt nie jest oznaczony „Umiem", pokaż na ekranie podsumowania baner „Dobry wynik! Chcesz zaznaczyć ten punkt jako Umiem?" z przyciskiem. Nigdy nie zaznaczaj sam. Nie sugeruj ponownie po odmowie przez 14 dni (zapisz `suggestionDismissedAt`).

## 5. Trening słabych punktów

Przycisk w Centrum ćwiczeń i na stronie Statystyki. Buduje sesję `weak`:
1. Z attempts wyznacz tematy z ≥ 5 próbami i trafnością < 70%, posortuj rosnąco.
2. Weź do 3 najsłabszych tematów.
3. Zbierz zadania z tych tematów z wagą: nierozwiązane poprawnie w ostatnich 14 dniach × 2, pozostałe × 1; 12 zadań, mix typów jak w generatorze mieszanym.
4. Jeśli brak tematów spełniających warunek: komunikat „Na razie nie widzę słabych punktów. Zrób kilka zestawów, a podpowiem, nad czym popracować."

## 6. Testy jednostkowe (obowiązkowe)

Napisz testy jednostkowe dla czystych funkcji:
- agregacja trafności wg tematu/typu/poziomu,
- wyznaczanie tematów do treningu słabych punktów,
- dedup i aktualizacja wpisów dziennika (w tym wznowienie opanowanych),
- zaliczanie powtórki przez poprawną odpowiedź,
- warunek sugestii „Umiem",
- bufor kołowy i kompaktowanie.

Funkcję `today()` oraz źródło czasu wstrzykuj (łatwe mockowanie).

## 7. Kryteria odbioru etapu

- [ ] Każda odpowiedź zapisuje się w attempts; eksport/import/reset obejmują nowe klucze, a import starych eksportów działa.
- [ ] Błędy trafiają do dziennika automatycznie, bez duplikatów; ustawienie można wyłączyć; „Cofnij" działa.
- [ ] Strona Statystyki z siedmioma sekcjami i poprawnymi stanami pustymi.
- [ ] Sugestia „Umiem" i trening słabych punktów działają zgodnie z regułami.
- [ ] Testy jednostkowe przechodzą, build przechodzi.
