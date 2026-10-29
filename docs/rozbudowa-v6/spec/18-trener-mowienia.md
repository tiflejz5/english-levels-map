# Specyfikacja 18 – Karty do mówienia z losowaniem i nagrywaniem (matura, B2, E8)

Trener mówienia dla matury ustnej, rozbudowa trenera B2 First i dodatkowy trening mówienia A2 przy E8. Wspólne: losowanie kart bez powtórek, timer, nagrywanie i odsłuch, samoocena.

## 1. Stan dziś i założenia

- **B2 First** ma trener (`js/speaking-trainer.js`, `niezbednik/certyfikat-b2/trening/mowienie.json`): 4 części, losowanie, timery, samoocena, **bez nagrywania**. Pula: Part 1 4 grupy, Part 2 6 kart, Part 3 3 zadania, Part 4 3 grupy.
- **C1** ma nagrywanie (`js/c1-speaking.js`, MediaRecorder, tylko lokalnie).
- **Matura ustna** ma tylko stronę opisową (`niezbednik/matura-podstawowa/strony/matura-ustna.md`). Matura ustna jest **jedna** dla poziomu podstawowego i rozszerzonego (bez określania poziomu), więc trener mieszka w module MP, a MR ma do niego link.
- **Egzamin ósmoklasisty nie ma części ustnej.** Dla E8 robimy **trening dodatkowy** „Mówienie A2”, wyraźnie podpisany: „Na egzaminie ósmoklasisty nie ma części ustnej. To trening, który pomaga w pisaniu i w szkole.”

Strona matury w repo celowo nie podaje punktacji ani czasów CKE („sprawdź w informatorze”). Trener trzyma tę zasadę: czasy są **orientacyjne**, edytowalne w pliku i opisane jako „orientacyjny czas”, bez punktów CKE.

## 2. Wspólne elementy (wydziel z C1 i B2)

### 2.1 Nagrywanie – `js/recorder.js`

Wydziel nagrywanie z `c1-speaking.js` do wspólnego modułu i użyj go w C1, B2, maturze i E8 (C1 działa jak dotąd).

- Przyciski: **Nagraj** / **Zatrzymaj**, odtwarzacz, **Nagraj ponownie**, **Pobierz** (`.webm`/`.m4a` zależnie od przeglądarki, nazwa `mowienie-<egzamin>-<karta>-<RRRR-MM-DD>.webm`).
- Do 3 nagrań na kartę w bieżącej sesji (porównanie „próba 1 / 2 / 3”); po zmianie karty lub wyjściu nagrania znikają (`URL.revokeObjectURL`). **Nic nie trafia do localStorage ani do sieci** – informacja przy przycisku: „Nagranie zostaje tylko w tej karcie przeglądarki.”
- Opcja „Nagrywaj razem z timerem”: start timera = start nagrania, koniec czasu = stop.
- Brak mikrofonu / odmowa / brak MediaRecorder: czytelny komunikat, trener działa bez nagrywania.
- Wskaźnik nagrywania (czerwona kropka + tekst „Nagrywanie 0:23”, `aria-live` tylko przy starcie i końcu).

### 2.2 Losowanie bez powtórek

- Przycisk **Losuj** w każdej części: losuje kartę, której profil jeszcze nie widział w tym cyklu. Po wyczerpaniu puli: „Przerobiłeś wszystkie karty – zaczynamy od nowa” i nowy cykl.
- Zapis widzianych kart w istniejącym kluczu `elm_speaking_v1` jako **opcjonalne** pole: `{ …, seen: { "<egzamin>:<część>": ["id", …] } }`. Odczyt tolerancyjny (brak pola = pusto), wersja klucza bez zmian, pole w eksporcie/imporcie/resecie razem z kluczem.
- Każda karta w danych ma `id` (dziś B2 nie ma – dodaj stabilne id istniejącym kartom).

### 2.3 Egzaminator czyta (opcjonalnie)

Przełącznik „Egzaminator czyta pytania”: pytania i kwestie egzaminatora czytane przez syntezator (`en-GB`, tempo 0.9; ten sam moduł co zadania słuchania). Bez głosu – przełącznik nieaktywny z wyjaśnieniem. Przy rozmowie z odgrywaniem roli (matura) kolejne kwestie egzaminatora odtwarzane przyciskiem „Dalej” – symulacja rozmowy.

### 2.4 Samoocena i historia

Jak w B2: kryteria z pliku, ocena 1–5, zapis sesji w `elm_speaking_v1` (`sessions`). Matura i E8 dostają własne kryteria (sekcje 3–4).

## 3. Matura ustna – `niezbednik/matura-podstawowa/trening/mowienie.json`

Format `"format": "matura"` (wzór: `przyklady/mowienie/matura-ustna-przyklad.json`):

```json
{
  "id": "trening-mowienie",
  "version": 1,
  "format": "matura",
  "note": "Czasy orientacyjne. Aktualny przebieg i punktację sprawdź w informatorze CKE.",
  "criteria": [
    { "id": "komunikacja", "label": "Realizacja zadania", "hint": "Odnoszę się do wszystkich elementów i rozwijam odpowiedzi." },
    { "id": "zakres", "label": "Zakres środków językowych", "hint": "Różne struktury i słownictwo, nie tylko podstawowe." },
    { "id": "poprawnosc", "label": "Poprawność", "hint": "Mało błędów, które przeszkadzają w zrozumieniu." },
    { "id": "wymowa", "label": "Wymowa i płynność", "hint": "Mówię wyraźnie, bez długich przerw." }
  ],
  "intro": { "title": "Rozmowa wstępna", "seconds": 120, "groups": [ { "id": "…", "topic": "…", "questions": ["…"] } ] },
  "roleplay": { "title": "Zadanie 1 – rozmowa z odgrywaniem roli", "prepSeconds": 30, "seconds": 240, "cards": [ … ] },
  "picture": { "title": "Zadanie 2 – opis ilustracji i pytania", "seconds": 180, "cards": [ … ] },
  "choice": { "title": "Zadanie 3 – wybór i uzasadnienie", "prepSeconds": 60, "seconds": 240, "cards": [ … ] }
}
```

- **roleplay.cards[]**: `id`, `topic` (obszar tematyczny), `situation` (po polsku, 1–3 zdania: kim jesteś, kim jest egzaminator), `elements` (dokładnie 4 punkty po polsku, które trzeba poruszyć), `examinerLines` (4–6 kwestii egzaminatora po angielsku: start rozmowy, dopytania, sprzeciw), `usefulPhrases` (3–6 zwrotów).
- **picture.cards[]**: `id`, `topic`, `description` (opis ilustracji po angielsku, 40–80 słów – aplikacja nie pokazuje zdjęć, opis zastępuje obraz; nagłówek „Wyobraź sobie zdjęcie:”), `questions` (dokładnie 3, po angielsku), `usefulPhrases`.
- **choice.cards[]**: `id`, `topic`, `situation` (po polsku: kontekst wyboru), `options` (3 opisy ilustracji, po 8–40 słów, oznaczone 1–3), `criteria` (2 kryteria wyboru po polsku), `questions` (dokładnie 2, po angielsku).
- **Pula**: rozmowa wstępna 10 grup × 3–4 pytania; po **12 kart** w zadaniach 1, 2 i 3. Tematy rozłożone po obszarach z podstawy programowej: człowiek, miejsce zamieszkania, edukacja, praca, życie prywatne, żywienie, zakupy i usługi, podróżowanie i turystyka, kultura, sport, zdrowie, nauka i technika, świat przyrody, życie społeczne.
- **Tryb „Cały egzamin”**: losuje rozmowę wstępną + po jednej karcie z zadań 1–3 i prowadzi przez nie po kolei z timerami; na końcu samoocena i odsłuch nagrań.
- Manifest MP: nowy trener `{ "id": "trening-mowienie", "file": "trening/mowienie.json", "label": "Trener matury ustnej", "type": "speaking" }` (dostosuj do kształtu `trainers`/`trainer` w manifestach). Manifest MR: link do trenera MP (bez kopii danych). Strona `matura-ustna.md`: na końcu link do trenera.

## 4. B2 First – rozbudowa `mowienie.json`

- Pula docelowa: Part 1 **10** grup, Part 2 **14** kart, Part 3 **10** zadań, Part 4 **10** grup (istniejące zostają, dopisz nowe, wszystkie z `id`).
- Nagrywanie (2.1), losowanie bez powtórek (2.2), „Egzaminator czyta” (2.3), tryb „Cały egzamin” (Part 1–4 po kolei, ok. 14 minut).
- Format i kryteria bez zmian.

## 5. E8 – trening dodatkowy „Mówienie A2”

`niezbednik/egzamin-osmoklasisty/trening/mowienie.json`, `"format": "simple"`:

- `cards[]`: `id`, `topic`, `kind` (`opis` – opowiedz/opisz, `sytuacja` – reakcja w sytuacji, `opinia` – co wolisz i dlaczego), `task` (po polsku), `questions` (2–4 po angielsku, proste), `usefulPhrases` (3–5), `seconds` (60–90).
- Pula: **24 karty** (po 8 każdego rodzaju), tematy z egzaminu ósmoklasisty (dom, szkoła, czas wolny, jedzenie, zakupy, podróże, sport, zdrowie).
- Kryteria samooceny: „Odpowiadam pełnym zdaniem”, „Dodaję powód lub przykład”, „Mówię bez długich przerw” (1–5).
- W panelu i na stronie E8 opisane jako „Trening mówienia (dodatkowo)”, z notą z sekcji 1.

## 6. Walidator (reguły w `scripts/validate_v6.py`)

- unikalne `id` kart w pliku, wymagane pola wg formatu, dokładne liczby (`elements` = 4, pytania w zadaniu 2 = 3, w zadaniu 3 = 2, `options` = 3), długości opisów w słowach, minimalne wielkości pul;
- B2: wszystkie karty mają `id`, pule ≥ wartości z sekcji 4.

## 7. Kryteria odbioru

- [ ] Nagrywanie działa w C1 (bez regresji), B2, maturze i E8; odmowa mikrofonu nie psuje trenera.
- [ ] Losowanie bez powtórek z zapisem w `elm_speaking_v1.seen`, zgodność ze starym zapisem.
- [ ] Trener matury: 4 części + „Cały egzamin”, czasy opisane jako orientacyjne, link z MR i ze strony „Matura ustna”.
- [ ] B2: pula z sekcji 4, „Cały egzamin”.
- [ ] E8: 24 karty, wyraźna informacja, że to trening dodatkowy.
- [ ] Wszystko z klawiatury, od 360 px, w obu motywach.
