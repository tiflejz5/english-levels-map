# Specyfikacja 12 – Nowe typy zadań w silniku ćwiczeń

Rozszerzamy wspólny silnik zadań z paczki v2 (spec 01, `js/exercise-logic.js`, `js/exercise-engine.js`) o pięć typów. Zadania nadal są danymi (JSON); nowy typ = logika oceny bez DOM + widok + reguły walidatora. Istniejące cztery typy i ich dane **nie zmieniają się**.

| Typ | Po polsku (w UI i statystykach) | Punkty |
| --- | --- | --- |
| `gap-fill` | Luki do wpisania | 1 pkt za każdą lukę (1–4 luki) |
| `match` | Dopasuj pary | 1 pkt za każdą parę (3–6 par) |
| `transformation` | Transformacje zdań | 1 pkt, albo 2 pkt gdy zadanie ma `parts` |
| `translate` | Tłumaczenie zdań | 1 pkt |
| `dictation` | Dyktando | 1 pkt |

Wzór danych: `przyklady/cwiczenia/v6-pilot-nowe-typy.json` (po 2 zadania każdego typu, przechodzi walidator).

## 1. Punkty zamiast „1 zadanie = 1 punkt”

Dziś wynik sesji to liczba poprawnych zadań (`exercise-engine.js`, `run.score`). Nowe typy mogą dawać kilka punktów, więc:

- każde zadanie ma **maksimum punktów** liczone funkcją `maxPoints(item)` (stare typy: 1), a ocena zwraca `{ correct, points, max, … }`; `correct` = pełna liczba punktów;
- wynik sesji i zapisywane `{ score, total }` liczą się w punktach. Dla zestawów złożonych tylko ze starych typów wynik jest identyczny jak dziś (test regresyjny);
- dziennik podejść (`elm_attempts_v1`) zapisuje jak dotąd `correct` (całe zadanie) i dodatkowo opcjonalne `points`/`max`. Format klucza się nie zmienia, nowe pola są opcjonalne;
- automatyczny dziennik błędów: wpis tylko, gdy `correct === false`; „Powtórz tylko błędne” bierze zadania z `correct === false`;
- statystyki i wagi losowania (trafność wg typu, słabe punkty) liczą jak dotąd po `correct`.

## 2. Formaty

Pola wspólne (`id`, `type`, `topic`, `level`, `tags`, `explanation`, `trap`) jak w spec 01.

### 2.1 `gap-fill` – luki do wpisania

Ten sam kształt, co sekcje „Ćwiczenie” na podstronach (np. „I ___ (read) when the lights ___ (go) out.”).

```json
{
  "id": "v6-pilot-01",
  "type": "gap-fill",
  "context": "Wczoraj wieczorem czytałem, kiedy zgasło światło.",
  "text": "I {{1}} (read) when the lights {{2}} (go) out.",
  "gaps": [
    { "accepted": ["was reading"] },
    { "accepted": ["went"] }
  ],
  "explanation": "Dłuższa czynność w tle: Past Continuous. Krótka, która ją przerwała: Past Simple."
}
```

- `text` ma luki `{{1}}`…`{{n}}` (1–4), numeracja od 1 bez przerw; `gaps[i]` opisuje lukę `{{i+1}}`.
- Wskazówka w nawiasie (np. `(read)`) jest częścią `text`. Opcjonalnie `gaps[i].hint` (tekst pod polem, np. „2 słowa”).
- Ocena każdej luki jak `short-answer`: `normalize` ze spec 01 sekcja 4, pełna zgodność z jednym z `accepted`; różnica 1 litery → uwaga „Uwaga na pisownię” i 0 pkt.
- Widok: zdanie z polami tekstowymi w miejscu luk (szerokość pola wg najdłuższej odpowiedzi + zapas, nie zdradza długości dokładnie), `context` nad zdaniem. Tab przechodzi między polami, Enter = Sprawdź. Po sprawdzeniu każde pole: poprawne (ikona + kolor) albo przekreślona odpowiedź i wzór obok.

### 2.2 `match` – dopasuj pary

```json
{
  "id": "v6-pilot-03",
  "type": "match",
  "mode": "definition",
  "prompt": "Dopasuj słowo do definicji.",
  "pairs": [
    ["reliable", "you can trust it to work or behave well"],
    ["generous", "happy to give money, time or help"],
    ["stubborn", "refuses to change their opinion"],
    ["punctual", "arrives exactly on time"]
  ],
  "extraRight": ["easily upset by criticism"],
  "explanation": "Przymiotniki opisujące charakter – częste w opisach ludzi na maturze."
}
```

- `mode`: `definition` (słowo–definicja), `halves` (początek–koniec zdania), `translation` (PL–EN), `response` (wypowiedź–reakcja). Steruje tylko podpisem kolumn.
- `pairs`: 3–6 par `[lewa, prawa]`, wszystkie teksty unikalne. `extraRight`: 0–2 dodatkowe elementy po prawej, do których nic nie pasuje.
- Lewa kolumna w kolejności z pliku, prawa **zawsze tasowana** (nigdy w poprawnej kolejności).
- Interfejs „kliknij lewą, potem prawą”: wybrana lewa jest podświetlona, kliknięcie prawej tworzy parę (numer pary przy obu elementach, nie tylko kolor). Kliknięcie sparowanego elementu rozłącza parę. Klawiatura: strzałki w kolumnie, Enter/Spacja wybiera. Na telefonie kolumny jedna pod drugą.
- Ocena: punkt za każdą poprawną parę. Po sprawdzeniu błędne pary przekreślone z poprawnym dopasowaniem obok.

### 2.3 `transformation` – transformacje zdań

Ten sam mechanizm co Part 4 w C1 (`js/c1-exercises.js`), ale w ogólnym silniku. **Wydziel ocenę Part 4 do czystej funkcji współdzielonej** (np. w `exercise-logic.js`) i użyj jej w obu miejscach; zachowanie C1 nie może się zmienić (testy).

```json
{
  "id": "v6-pilot-05",
  "type": "transformation",
  "source": "I haven't seen Tom for three years.",
  "keyword": "SAW",
  "before": "The last time",
  "after": "three years ago.",
  "answers": ["I saw Tom was", "that I saw Tom was"],
  "wordLimit": [2, 5],
  "explanation": "Present Perfect z for ↔ The last time + Past Simple + was … ago."
}
```

- `answers`: pełne akceptowane wypełnienia luki (bez `before`/`after`), muszą zawierać `keyword` bez zmiany formy. `wordLimit` domyślnie `[2, 5]` (B1–B2), dla C1 `[3, 6]`; skróty liczone jak w C1 (`n't` = 2 słowa).
- Opcjonalnie `parts: [[warianty części 1], [warianty części 2]]` → 2 pkt, ocena jak Cambridge (spec C1). Bez `parts` 1 pkt za całość.
- Widok: zdanie źródłowe, słowo kluczowe w wyróżnionej ramce (wersaliki), linia `before ___ after` z polem, licznik słów na żywo („3 z 2–5 słów”).

### 2.4 `translate` – tłumaczenie całego zdania PL → EN

```json
{
  "id": "v6-pilot-07",
  "type": "translate",
  "source": "Gdybym miał więcej czasu, nauczyłbym się grać na gitarze.",
  "accepted": [
    "If I had more time, I would learn to play the guitar.",
    "If I had more time, I'd learn to play the guitar.",
    "If I had more time, I would learn how to play the guitar."
  ],
  "hint": "second conditional",
  "explanation": "Hipoteza o teraźniejszości: If + Past Simple, would + bezokolicznik."
}
```

- `accepted`: 1–8 pełnych zdań; pierwsze jest wzorcowe.
- **Normalizacja zdania** (czysta funkcja `normalizeSentence`): `normalize` ze spec 01, potem usunięcie przecinków, rozwinięcie skrótów (`I'd → I would`, `don't → do not`, `won't → will not`, `can't → cannot`, `'re → are`, `'ve → have`, `'ll → will`, `'m → am`, `isn't → is not` itd.) **po obu stronach**. Niejednoznaczne `'s` i `'d` rozwijaj tylko w parach wypisanych w `accepted` (czyli: porównuj też formy nierozwinięte). Testy jednostkowe na listę skrótów.
- Ocena: zgodność po normalizacji z którymkolwiek `accepted` → 1 pkt. Inaczej 0 pkt i porównanie słowo po słowie z **najbliższym** wariantem (najmniejsza odległość edycyjna na tokenach): brakujące słowa, zbędne, zamienione. Gdy jedyną różnicą jest literówka (odległość 1 w jednym słowie ≥ 5 liter) → „Prawie – uwaga na pisownię”, nadal 0 pkt.
- `hint` (opcjonalnie): ukryta podpowiedź pod przyciskiem „Podpowiedź” (np. nazwa struktury).
- Pole wieloliniowe, sprawdzanie Ctrl/Cmd+Enter (Enter w polu łamie linię tylko z Shift).

### 2.5 `dictation` – dyktando

```json
{
  "id": "v6-pilot-09",
  "type": "dictation",
  "text": "We were going to leave early, but it started raining.",
  "accepted": ["We were going to leave early but it started raining."],
  "maxPlays": 3,
  "explanation": "Was/were going to – plan z przeszłości, który się nie udał."
}
```

- Syntezator mowy (ten sam moduł co zadania `listening`, spec 01 sekcja 5): `en-GB`, potem `en-US`. Przyciski „Odtwórz” (tempo 0.9) i „Wolniej” (0.7), licznik „Odsłuchy: 1/3”. `maxPlays` 1–5, domyślnie 3.
- Odpowiedź porównywana jak `translate` (`normalizeSentence`) z `text` i z `accepted` (opcjonalne warianty interpunkcji/skrótów). Po sprawdzeniu: porównanie słowo po słowie i przycisk „Odtwórz jeszcze raz”.
- Brak angielskiego głosu: zadanie pokazuje „Ta przeglądarka nie ma głosu angielskiego”, przycisk „Pomiń” i **nie wlicza się** do wyniku ani statystyk (`max` = 0). Generator mieszanych zestawów pomija dyktanda, gdy nie ma głosu.

## 3. Integracje

- **Centrum ćwiczeń i generator** (spec 02): nowe typy w filtrze typów, w opisach zestawów („luki do wpisania, dopasowanie par…”) i w losowaniu mixów.
- **Statystyki**: etykiety typów z tabeli na górze; trafność wg typu jak dla starych.
- **Dziennik błędów**: kontekst wpisu (`exercise-engine.js`, funkcje budujące `context`/odpowiedź) dla każdego typu: `gap-fill` – zdanie z lukami i wpisane odpowiedzi; `match` – błędne pary; `transformation` – zdanie źródłowe + słowo + linia; `translate`/`dictation` – zdanie PL / tekst i odpowiedź.
- **Egzaminy** (exam-core): nowe typy działają też w zestawach egzaminów z rejestru (`niezbednik/<egzamin>/cwiczenia/*.json`), bo używają tego samego silnika.
- **Skróty**: w `match` cyfry 1–6 wybierają element prawej kolumny po wybraniu lewej; w polach tekstowych skróty nie przechwytują liter.

## 4. Walidator (rozszerz `tools/waliduj-cwiczenia.js`, wzór reguł: `scripts/validate_v6.py`)

- `gap-fill`: 1–4 luki, numery `{{1}}…{{n}}` po kolei, `gaps.length === n`, każde `accepted` niepuste;
- `match`: 3–6 par, teksty unikalne po obu stronach, `extraRight` ≤ 2 i nie powtarza prawej strony, `mode` z listy;
- `transformation`: `keyword` występuje (bez względu na wielkość liter) w każdym `answers`, liczba słów każdej odpowiedzi w `wordLimit`, `parts` (jeśli jest) ma 2 elementy;
- `translate`: 1–8 `accepted`, `source` niepuste;
- `dictation`: `text` 4–30 słów, `maxPlays` 1–5.

## 5. Zestawy pilotażowe

Pięć zestawów (po jednym z przewagą każdego nowego typu, 8–10 zadań, z domieszką starych typów) do tematów **B1–B2, które nie mają jeszcze zestawu** (sprawdź w `dane/cwiczenia-tematy.json`). Nazwy plików `<id-tematu>-1.json`, wpisy w mapie temat → zestawy. Treść oryginalna, wyjaśnienia po polsku, poziom zgodny z tematem.

## 6. Testy (`tools/testy.js`)

- `maxPoints` i ocena każdego typu (w tym częściowe punkty), `normalizeSentence` (skróty, przecinki, apostrofy), porównanie słowo po słowie (brak/zbędne/zamienione), wspólna ocena transformacji – te same wyniki dla wszystkich istniejących zestawów C1 Part 4 co przed zmianą (test na prawdziwych danych), wynik zestawu ze starych typów bez zmian.

## 7. Kryteria odbioru

- [ ] Każdy nowy typ działa myszą, dotykiem i klawiaturą, w trybie Nauka i Egzamin, od 360 px.
- [ ] Wyniki w punktach na karcie zestawu, w podsumowaniu i w statystykach; stare zestawy dają te same wyniki co przed zmianą.
- [ ] C1 Part 4 ocenia identycznie jak przed wydzieleniem funkcji.
- [ ] Dyktando bez głosu nie psuje wyniku ani mixów.
- [ ] Walidator, build i testy przechodzą; brak zmian formatów localStorage poza opcjonalnymi polami `points`/`max`.
