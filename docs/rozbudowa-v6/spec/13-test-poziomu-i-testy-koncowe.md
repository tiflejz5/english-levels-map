# Specyfikacja 13 – Większa pula testu poziomu i testy końcowe poziomów

Dwie rzeczy: (1) szybki test poziomu dostaje pulę 60 pytań z trzech umiejętności, (2) każdy poziom A1–C2 dostaje test końcowy (20 pytań), którego zdanie daje znaczek „Poziom zaliczony” na Szlaku A1→C2.

## 1. Szybki test poziomu – pula 60 pytań

Dziś `niezbednik/test-poziomu/pytania.json` ma 12 pytań (po 2 na poziom), a test ma 12 pytań, więc każde podejście to ta sama pula.

### 1.1 Skład puli

Dokładnie **10 pytań na poziom** (60 razem), w każdym poziomie:

| Umiejętność | `skill` | Pytań na poziom | Co sprawdza |
| --- | --- | --- | --- |
| Gramatyka | `grammar` | 5 | formy i struktury z list A1–C2 |
| Słownictwo | `vocabulary` | 3 | kolokacje, znaczenie słowa w kontekście, przyimki, słowotwórstwo |
| Czytanie | `reading` | 2 | krótki tekst + jedno pytanie o sens, intencję lub szczegół |

### 1.2 Format (rozszerzenie istniejącego, wstecznie zgodne)

```json
{
  "id": "b1-r-01",
  "level": "B1",
  "skill": "reading",
  "type": "multiple-choice",
  "passage": "Hi Sam, the meeting has moved from Tuesday to Thursday because half the team is at a conference. Same room, same time. Could you tell Ola? She isn't on this mailing list. – Kasia",
  "question": "Why is Kasia writing to Sam?",
  "options": ["To cancel the meeting", "To ask Sam to pass on information", "To invite Sam to a conference", "To change the meeting room"],
  "correct": 1,
  "explanation": "Najważniejsza prośba: „Could you tell Ola?” – Sam ma przekazać wiadomość dalej.",
  "itemId": null
}
```

- `skill` wymagane w nowych pytaniach; pytania bez `skill` traktuj jak `grammar` (zgodność).
- `passage` wymagane przy `reading`: A1–B1 30–80 słów, B2–C2 60–130 słów. Tekst nad pytaniem w ramce, czcionka tekstu treści.
- `itemId` dla `grammar` i `vocabulary` – id podstrony, gdy jest pasująca (link w wyniku). Dla `reading` może być `null`.
- Opcje: 4 dla wszystkich nowych pytań, dystraktory wiarygodne (typowe błędy Polaków), bez „pułapek” na interpunkcji.
- Wzór: `przyklady/test-poziomu/pytania-przyklad.json`. 12 istniejących pytań zostaje (uzupełnij im `skill`); dopisz brakujące do 10 na poziom.

### 1.3 Algorytm (zmiany w `js/learning.js`, czyste funkcje + testy)

Długość testu, start (A2), krok poziomu i wynik zostają bez zmian. Zmienia się tylko wybór pytania z poziomu docelowego (`pickQuestion`):

1. kandydaci: pytania poziomu, jeszcze nie użyte w tym podejściu;
2. **preferuj pytania, których nie było w poprzednim podejściu** (ids z zapisanego `last.answers`), jeśli pula pozwala;
3. **równoważ umiejętności**: wybierz umiejętność, która w tym podejściu pojawiła się najrzadziej (remis → losowo), potem losowe pytanie z tej umiejętności;
4. reszta (brak pytań na poziomie, poziom docelowy) bez zmian.

`pickQuestion` dostaje nowe parametry opcjonalne (np. `{ avoidIds, skillCounts }`); stare wywołanie działa jak dotąd. Istniejące testy w `tools/testy.js` muszą przejść bez zmian, nowe testy sprawdzają punkty 2–3.

### 1.4 Wynik

Pod szacowanym poziomem: krótki podział na umiejętności („Gramatyka 5/7, Słownictwo 2/3, Czytanie 1/2”), bez procentów przy próbie < 3. Lista błędnych pytań jak dziś (dla `reading` z tekstem zwijanym). Opis długości testu: „12 pytań, ok. 6 minut”.

### 1.5 Build

`tools/zbuduj-niezbednik.js` (sekcja testu poziomu): walidacja `skill`, `passage` przy `reading` i długości tekstu, ostrzeżenie „UWAGA”, gdy poziom ma < 8 pytań albo umiejętności nie ma w poziomie; podsumowanie w konsoli w podziale na poziom × umiejętność.

## 2. Testy końcowe poziomów

### 2.1 Zasada

- Na końcu każdego poziomu (strona `#/a1`… pod podsumowaniem) karta **„Test końcowy A1”**: 20 pytań wylosowanych z puli 30, ok. 15 minut, próg **80% (16/20)**.
- Test jest zawsze dostępny (bez blokowania). Gdy postęp „Umiem” na poziomie ≥ 70%, strona Dziś pokazuje podpowiedź „Gotowy na test końcowy A1?”.
- Zdanie testu zapisuje **znaczek poziomu**. Aplikacja niczego sama nie zaznacza jako „Umiem” (tak jak dotąd).

### 2.2 Dane

Plik na poziom: `niezbednik/testy-poziomow/<a1|a2|b1|b2|c1|c2>.json` – to **zwykły zestaw silnika zadań** (spec 01 + spec 12), z dodatkowymi polami:

```json
{
  "version": 1,
  "id": "test-koncowy-a1",
  "kind": "level-test",
  "level": "A1",
  "title": "Test końcowy A1",
  "intro": "20 pytań z całego poziomu A1. Zaliczenie od 80%.",
  "draw": 20,
  "passPercent": 80,
  "defaultMode": "exam",
  "items": [ /* 30 zadań */ ]
}
```

- Każde zadanie ma **wymagane** `topic` (id podstrony z `index.json`) – po nim liczymy podział wyniku i linki do powtórki.
- Pokrycie puli: pytania z co najmniej 70% podstron poziomu; proporcje kategorii jak na liście poziomu (czasy/gramatyka, funkcje komunikacyjne, słownictwo). Funkcje komunikacyjne jako `multiple-choice` z `kind: "function"`.
- Typy: `multiple-choice` (min. połowa), `gap-fill`, `short-answer`, `match`, `transformation` (od B1), `translate` (od A2). Bez `dictation` (test nie może zależeć od głosu).
- Losowanie: `draw` zadań z puli tak, żeby każda kategoria była reprezentowana proporcjonalnie (czysta funkcja + test). Zadanie wielopunktowe liczy się do `draw` jako jedno zadanie; próg liczony w punktach.
- Wzór: `przyklady/testy-poziomow/a1-przyklad.json`.

### 2.3 Przebieg i wynik

- Route `#/a1/test` (analogicznie dla innych poziomów). Ekran startowy: liczba pytań, próg, najlepszy wynik, data zaliczenia.
- Sesja w istniejącym silniku, tryb Egzamin (wyjaśnienia na końcu), bez „Powtórz tylko błędne” przed końcem.
- Wynik: punkty i procent, „Zaliczony” / „Jeszcze nie”, podział na kategorie i **lista podstron do powtórki** (tematy z błędami z linkami). Błędy trafiają do Dziennika błędów jak w zwykłych zestawach (z „Cofnij wszystkie”).
- Po niezaliczeniu: „Najwięcej błędów w: …” i przycisk „Zestawy do tych tematów” (jeśli są).

### 2.4 Znaczek i Szlak

- Nowy klucz per profil w `ELM.profileData` (wzór istniejących): `elm_leveltests_v1` → `{ version: 1, profiles: { <id>: { levels: { "A1": { passedAt: "RRRR-MM-DD", best: { score, total, date }, last: { score, total, date } } } } } }`. W eksporcie, imporcie i resecie; usunięcie profilu usuwa jego dane.
- **Szlak A1→C2** (`js/today.js`) i kółka poziomów w lewym panelu: zaliczony poziom ma znaczek-pieczątkę (ikona + tekst dostępny „A1 zaliczony 12.11.2026”). Kolor nigdy nie jest jedynym nośnikiem informacji.
- Strona poziomu: w nagłówku obok pierścienia postępu mała etykieta „Zaliczony · 12.11.2026”.
- Gratulacje (`js/celebrate.js`): nowy kamień milowy `lvl-<poziom>-passed` z krótkim tekstem, raz na profil.
- Zaliczenie testu = aktywność dnia (`markActivity`).

## 3. Kryteria odbioru

- [ ] Pula 60 pytań (10 na poziom: 5/3/2), build bez „UWAGA”, dwa kolejne podejścia mają różne pytania.
- [ ] Testy algorytmu (stare bez zmian + nowe dla unikania powtórek i równowagi umiejętności).
- [ ] 6 pul testów końcowych po 30 zadań, walidator sprawdza `topic`, typy i pokrycie.
- [ ] Zaliczenie zapisuje znaczek widoczny na Szlaku, w panelu i na stronie poziomu, w obu motywach, od 360 px.
- [ ] Nowy klucz w eksporcie, imporcie i resecie.
