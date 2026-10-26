# Specyfikacja 10 – Fiszki z cyklicznym active recall

## 1. Cel i zasady

Nowa zakładka **Fiszki** (`/fiszki`) do nauki słownictwa, kolokacji, czasowników frazowych i reguł metodą **active recall** (najpierw próba przypomnienia, potem odpowiedź) z **powtórkami w rosnących odstępach** (spaced repetition). Fiszka wraca tym wcześniej, im gorzej poszła ostatnia próba.

Zasady nadrzędne:

- **Najpierw przypomnij, potem zobacz.** Odpowiedź jest ukryta, dopóki użytkownik nie spróbuje jej sobie przypomnieć (przycisk „Pokaż odpowiedź" albo wpisanie odpowiedzi).
- **Samoocena jest po stronie użytkownika.** Aplikacja może zasugerować ocenę (po wpisaniu odpowiedzi), ale ostateczny wybór należy do niego.
- **Nic nie zmienia istniejących danych.** Żadnych zmian w dotychczasowych kluczach localStorage. Nowe dane w nowym kluczu z polem `version`, w try/catch, objęte eksportem, importem i resetem.
- Treści wbudowane są **tylko do odczytu** (`dane/fiszki/`), stan nauki (terminy, interwały) i własne fiszki są w localStorage.
- Bez zewnętrznych CDN. Zgodność z `DESIGN.md`, kontrast AA, `prefers-reduced-motion`.

## 2. Typy kart

| Typ | Przód | Tył | Uwagi |
| --- | --- | --- | --- |
| `basic` | `front` (np. po polsku lub pytanie) | `back` + opcjonalnie `note` | klasyczna fiszka |
| `cloze` | zdanie z luką, `hint` (po polsku) | pełne zdanie z odpowiedzią wyróżnioną | składnia `{{odpowiedź}}`, alternatywy `{{a\|b}}` (pierwsza jest wzorcowa, wszystkie są akceptowane) |
| `typed` | `front` (np. słowo do przetłumaczenia lub rodziny wyrazów) | `back` | pole tekstowe, lista `accepted` |

Każda karta ma: `id` (`<talia>-NNN`), `type`, `tags`. Pola opcjonalne: `note` (wyjaśnienie po polsku), `example`, `hint`, `level`.

W `cloze` na karcie jest dokładnie jedna luka. Przód pokazuje zdanie z `_____` (długość kreski nie zdradza liczby liter) i `hint`. Tył pokazuje zdanie z odpowiedzią wytłuszczoną.

### 2.1 Normalizacja odpowiedzi (porównanie)

Funkcja czysta `normalize(s)`: małe litery, trim, zwinięcie wielu spacji, ujednolicenie apostrofów (’ → '), usunięcie interpunkcji na brzegach. Porównanie z każdą akceptowaną odpowiedzią po normalizacji. Wynik:

- **dokładnie** → sugerowana ocena „Dobrze",
- **odległość Levenshteina 1 i długość odpowiedzi ≥ 5** → komunikat „Prawie dobrze (literówka)", sugerowana ocena „Trudne",
- **inaczej** → „Niepoprawnie", sugerowana ocena „Znowu".

Sugestia jest tylko podświetleniem przycisku. Użytkownik może wybrać dowolną ocenę.

## 3. Harmonogram powtórek (wzorowany na SM-2)

Funkcja czysta `schedule(card, grade, now, config) → card` w osobnym module (bez dostępu do DOM i localStorage), pokryta testami jednostkowymi. **Implementacja referencyjna: `scripts/scheduler_ref.py`**, a **wektory testowe: `dane/fiszki/scheduler-vectors.json`** (7 scenariuszy, każdy krok wykonywany w chwili `due`). Implementacja w TypeScript/JS musi dawać identyczne wyniki (stany, interwały, `ease`, `due`).

### 3.1 Stan karty

`state` ∈ `new | learning | review | relearning`, `step`, `ease` (start 2,5), `interval` (dni), `pendingInterval` (dni, interwał po relearningu), `lapses`, `reps`, `due` (znacznik czasu w ms).

### 3.2 Oceny

Cztery przyciski: **Znowu** (1), **Trudne** (2), **Dobrze** (3), **Łatwe** (4). Skróty `1`–`4`.

### 3.3 Reguły

Konfiguracja domyślna: `learningSteps=[1,10]` min, `relearnSteps=[10]` min, `graduatingInterval=1` d, `easyInterval=4` d, `startEase=2.5`, `minEase=1.3`, `maxEase=2.8`, `hardMultiplier=1.2`, `easyBonus=1.3`, `lapseMultiplier=0.5`, `maxInterval=365` d.

**Karta nowa lub w nauce (`new`, `learning`)**

- Znowu: krok 0, powtórka za 1 min.
- Trudne: powtórz bieżący krok (ten sam odstęp).
- Dobrze: następny krok; po ostatnim kroku **awans** do `review` z interwałem 1 d (`due = now + 1 d`).
- Łatwe: natychmiastowy awans do `review` z interwałem 4 d.

**Karta w powtórkach (`review`)**, `iv` = bieżący interwał, `e` = bieżący `ease`:

- `hardI = max(iv+1, round(iv·1.2))`
- `goodI = max(hardI+1, round(iv·e))`
- `easyI = max(goodI+1, round(iv·e·1.3))`
- Znowu: `lapses+1`, `ease = max(1.3, e−0.2)`, `pendingInterval = max(1, round(iv·0.5))`, stan `relearning`, powtórka za 10 min.
- Trudne: `ease = max(1.3, e−0.15)`, nowy interwał `hardI`.
- Dobrze: `ease` bez zmian, nowy interwał `goodI`.
- Łatwe: `ease = min(2.8, e+0.15)`, nowy interwał `easyI`.
- Interwał nie przekracza `maxInterval`. Zaokrąglenie jak `Math.round`. `ease` zaokrąglone do 0,01.

**Karta w ponownej nauce (`relearning`)**: Znowu (krok 0), Trudne (ten sam krok), Dobrze (po ostatnim kroku wraca do `review` z `pendingInterval`), Łatwe (powrót do `review` z `pendingInterval + 1`).

**Rozproszenie (fuzz)**: dla nowych interwałów ≥ 3 dni aplikacja może dodać losowe ±5%, żeby karty z jednego dnia nie wracały razem. W funkcji `schedule` fuzz jest **opcjonalnym parametrem** (domyślnie wyłączony w testach), a losowość jest wstrzykiwana z zewnątrz.

**Zalegające karty**: karty `review` po terminie (zaległe) są wyświetlane od najbardziej zaległej. Zaległość nie zmienia formuły (prosto i przewidywalnie).

### 3.4 Kolejka sesji

Kolejność w sesji: (1) karty `learning/relearning` z terminem w tej chwili lub wcześniej, (2) karty `review` z terminem dziś lub wcześniej (limit dzienny powtórek: domyślnie 100), (3) nowe karty do dziennego limitu (domyślnie **10**). Karty `learning` z terminem w ciągu 20 minut mogą wrócić w tej samej sesji. Karty „zawieszone" i „odłożone na dziś" są pomijane. Nowe karty z jednej talii nie powinny iść po kolei w stałym porządku, jeśli talia ma opcję „losowo" (domyślnie: w kolejności talii).

## 4. Dane (localStorage)

Klucz per profil: `elm.<profileId>.fiszki`.

```
{
  "version": 1,
  "cards": { "<cardId>": { state, step, ease, interval, pendingInterval, lapses, reps, due, suspended?: true, buriedUntil?: ms } },
  "userDecks": [ { "id": "u-...", "title": "...", "createdAt": "ISO" } ],
  "userCards": [ { "id": "u-...", "deck": "u-...", "type": "basic|cloze|typed", ... } ],
  "settings": { "newPerDay": 10, "reviewsPerDay": 100, "typeAnswerFirst": false, "enabledDecks": ["..."], "fuzz": true },
  "daily": { "2026-11-01": { "new": 8, "reviews": 41, "again": 6, "minutes": 12 } }
}
```

- Stan karty jest zapisywany **tylko dla kart, które użytkownik ruszył**; reszta to `new`.
- Zapis po każdej ocenie (debounce niepotrzebny, rekord jest mały), w try/catch. Przy błędzie zapisu (np. brak miejsca) komunikat i praca dalej w pamięci.
- `daily` przechowuj maks. 400 dni (przycinanie najstarszych).
- Dane w **eksporcie, imporcie i resecie**. Import waliduje strukturę, odrzuca nieznane typy, ucina teksty do 500 znaków, ignoruje identyfikatory wbudowanych kart, których już nie ma w taliach (zostają w stanie, ale nie są pokazywane).
- Dzień „dzisiejszy" liczony wg czasu lokalnego, z granicą dnia o **04:00** (żeby późna nauka wieczorem i nocą liczyła się do jednego dnia).

## 5. Interfejs

### 5.1 Nawigacja i ekran główny `/fiszki`

- Pozycja **Fiszki** w lewym panelu, z **plakietką liczby kart do powtórki dzisiaj** (ukrywana, gdy 0). Plakietka ma tekst alternatywny („12 kart do powtórki").
- Nagłówek: licznik „Do powtórki dziś: N (w tym nowe: M)", duży przycisk **Ucz się teraz**, seria dni nauki (użyj istniejącego mechanizmu `markActivity()`, jeśli jest; nie zmieniaj jego formatu).
- Lista talii (karty): nazwa, opis, poziom, liczba kart, paski: nowe / w nauce / opanowane, przełącznik „Włączona w nauce". Przyciski: **Przeglądaj**, **Dodaj kartę**, **Importuj**, **Eksportuj**.
- Sekcja „Moje talie" (utwórz, zmień nazwę, usuń z potwierdzeniem) i automatyczna talia **Moje błędy** (patrz 6).
- Stan pusty: krótki opis metody (3 zdania) i przycisk „Włącz pierwszą talię".

### 5.2 Sesja nauki

1. Karta pokazuje przód. Tryb domyślny: przycisk **Pokaż odpowiedź** (Spacja/Enter).
2. Opcja **„Najpierw wpisz odpowiedź"** (ustawienia, domyślnie wyłączona dla `basic`, **zawsze włączona dla `typed`**, dla `cloze` do wyboru): pole tekstowe, Enter sprawdza, wynik z 2.1, podświetlona sugerowana ocena.
3. Po odsłonięciu: tył, przykład, uwaga. Cztery przyciski ocen z podglądem **następnego terminu** („10 min", „1 d", „3 d", „8 d") obliczonym funkcją `schedule`.
4. Skróty: `Spacja` odsłoń/ocena „Dobrze" po odsłonięciu, `1`–`4` oceny, `Z` cofnij ostatnią ocenę, `E` edytuj kartę (własne), `S` zawieś kartę, `B` odłóż do jutra. Skróty nie działają, gdy fokus jest w polu tekstowym (z wyjątkiem Enter).
5. **Cofnij** przywraca poprzedni stan karty i liczniki (stos co najmniej 10 ostatnich ocen w sesji).
6. Pasek postępu (np. „7 z 22") i licznik kart pozostałych w nauce.
7. Przycisk **Zakończ** w każdej chwili. Zapis stanu po każdej ocenie, więc przerwanie nie gubi postępu.
8. **Podsumowanie sesji**: liczba kart, odsetek „Dobrze/Łatwe", czas, karty do powtórki jutro, najtrudniejsze karty (z największą liczbą „Znowu"), przycisk „Dodaj kolejne 5 nowych kart" (jednorazowo ponad limit) i „Wróć do talii".
9. Gdy nic nie jest do powtórki: komunikat „Na dziś koniec" z godziną najbliższej powtórki.

### 5.3 Przeglądanie i edycja

- Lista kart talii: przód, tył, status (nowa/nauka/opanowana/zawieszona), termin, wyszukiwanie w talii, filtry statusu.
- **Własne karty**: formularz (typ, przód/tył albo zdanie z `{{luką}}`, podpowiedź, przykład, notatka). Walidacja: cloze musi mieć jedną lukę; limit 500 znaków na pole. Podgląd karty na żywo. Edycja i usuwanie (z potwierdzeniem) tylko własnych kart. Karty wbudowane można **zawiesić**, ale nie edytować.
- **Import/eksport**: TSV/CSV (kolumny: `typ; przód; tył; podpowiedź; przykład; notatka; tagi`; kodowanie UTF-8, separator tab lub średnik wykrywany automatycznie, cudzysłowy RFC 4180). Podgląd importu (ile kart poprawnych, ile odrzuconych i dlaczego) przed zatwierdzeniem, limit 2000 kart. Eksport talii do TSV zgodnego z importem Anki (przód, tył, tagi). Cloze eksportowany w składni Anki `{{c1::odpowiedź}}` (przy imporcie `{{c1::…}}` jest zamieniane na `{{…}}`).

### 5.4 Dodawanie fiszek z innych miejsc aplikacji

- **Dziennik błędów** (z paczki v2): przy wpisie przycisk **„Dodaj do fiszek"** tworzy kartę w talii „Moje błędy" (typ `cloze`, jeśli kontekst ma lukę, w przeciwnym razie `basic`: przód = polecenie/kontekst, tył = poprawna odpowiedź + reguła). Deduplikacja po `sourceItemId`. Opcja w ustawieniach: **„Automatycznie dodawaj błędy z ćwiczeń do fiszek"** (domyślnie wyłączona).
- **Zaznaczenie tekstu** na stronie tematu: po zaznaczeniu pojawia się mały przycisk **„Dodaj do fiszek"**, który otwiera formularz z wypełnionym przodem (zaznaczony tekst, max 300 znaków), wyborem talii i polem na tył. Bez przechwytywania zaznaczeń w polach tekstowych. Przycisk dostępny też z klawiatury (skrót `Ctrl/Cmd+Shift+F` przy zaznaczeniu).
- Każde dodanie potwierdza toast z linkiem „Cofnij".

### 5.5 Integracje

- **Dziś / pulpit**: kafelek „Fiszki do powtórki: N" z przyciskiem, bez zmiany istniejącego układu poza dodaniem kafelka.
- **Statystyki** (paczka v2): nowa sekcja „Fiszki": liczba powtórek w ostatnich 30 dniach (słupki), odsetek poprawnych (Dobrze+Łatwe) w ostatnich 30 dniach, liczba kart opanowanych (interwał ≥ 21 d), prognoza powtórek na 7 dni. Stany puste i zasada małych próbek (poniżej 20 powtórek nie pokazuj odsetka).
- **Wyszukiwarka**: wbudowane i własne karty nie są w indeksie ogólnym (zbyt duży szum). Dodaj do wyszukiwarki tylko **skróty**: „Fiszki", „Moje błędy (fiszki)".
- **Serie**: ukończona sesja (≥ 5 kart) liczy się jako aktywność dnia w istniejącym mechanizmie.

## 6. Wbudowane talie startowe

W `dane/fiszki/` (index.json + 6 plików): **162 oryginalne karty** napisane na potrzeby aplikacji (bez materiałów chronionych prawem autorskim).

| Talia | Typ kart | Karty |
| --- | --- | --- |
| Czasowniki frazowe B2–C1 | cloze | 30 |
| Kolokacje B2–C1 | cloze | 30 |
| Łączniki i wyrażenia spójności | cloze | 24 |
| Rodziny wyrazów | typed | 24 |
| Pułapki Polaków | basic | 24 |
| Słownictwo podstawowe A2–B1 | typed | 30 |

Talie ładuj leniwie (po wejściu w `/fiszki`), index.json jest mały. Kolejność nowych kart w talii: jak w pliku. Domyślnie włączone: **Czasowniki frazowe** i **Kolokacje** (dla użytkowników modułu C1); reszta wyłączona do ręcznego włączenia. Dodanie nowych talii w przyszłości = nowy plik + wpis w `index.json` (bez zmian w kodzie).

## 7. Dostępność i wydajność

- Pełna obsługa klawiaturą, widoczny fokus, role i etykiety (`aria-live="polite"` dla wyniku sprawdzenia, przyciski ocen z pełną nazwą i terminem w `aria-label`).
- Odsłonięcie karty: efekt obrotu/przejścia ≤ 200 ms, wyłączony przy `prefers-reduced-motion` (wtedy zwykła zamiana zawartości).
- Kolor nie jest jedynym nośnikiem informacji (oceny mają etykiety, status kart ikonę + tekst).
- Cel dotykowy ≥ 44 px, układ od 360 px szerokości, przyciski ocen na telefonie w jednym rzędzie lub 2×2.
- Brak `innerHTML` z danych użytkownika; luka cloze wstawiana przez węzły tekstowe.
- Sesja z 200 kartami nie może powodować opóźnień interfejsu (kolejka budowana raz, nie przy każdym renderze).

## 8. Testy

Jednostkowe, na czystych funkcjach:

1. `schedule` zgodnie z `scheduler-vectors.json` (wszystkie 7 scenariuszy, krok po kroku: `state`, `step`, `ease`, `interval`, `pendingInterval`, `lapses`, `reps`, `due`).
2. `normalize` i ocena odpowiedzi (dokładna, literówka, błąd, alternatywy `a|b`, wielkość liter, apostrofy).
3. Budowa kolejki sesji (limity nowych i powtórek, kolejność, pomijanie zawieszonych i odłożonych, granica dnia 04:00).
4. Parser cloze (jedna luka, alternatywy, błędne wejścia) i import/eksport TSV/CSV (cudzysłowy, średniki, polskie znaki, `{{c1::…}}`).
5. Walidacja importu stanu z localStorage (uszkodzony JSON, nieznana wersja, zbyt długie pola).
6. Walidator talii: `python3 scripts/validate_fiszki.py` włączony do `npm run validate`.

## 9. Kryteria odbioru

- [ ] `/fiszki` z listą talii, plakietką w panelu i kafelkiem na pulpicie.
- [ ] Sesja nauki z ukrytą odpowiedzią, trybem wpisywania, czterema ocenami z podglądem terminów, cofnięciem, skrótami, podsumowaniem.
- [ ] Harmonogram zgodny z wektorami testowymi.
- [ ] Własne talie i karty, import/eksport TSV/CSV, „Dodaj do fiszek" z dziennika błędów i z zaznaczenia tekstu.
- [ ] Dane w nowym kluczu z `version`, objęte eksportem, importem i resetem. Stary eksport importuje się bez błędów.
- [ ] Statystyki fiszek, stany puste, brak regresji istniejących ekranów.
- [ ] Klawiatura, AA w obu motywach, 360 px, `prefers-reduced-motion`.
