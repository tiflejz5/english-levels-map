# Specyfikacja 01 – Silnik zadań (typy zadań na końcu tematów)

Ten dokument opisuje nowy, wspólny silnik zadań. Zadania są **danymi (JSON)**, a kod ma być uniwersalny: dodanie nowego zestawu to wrzucenie pliku i wpisanie go w mapę, bez zmian w kodzie.

## 1. Gdzie pojawiają się zadania

1. **Na końcu strony tematu** (każdy punkt niezbędnika, który ma przypisane zestawy): po treści strony sekcja „Sprawdź się" z kartą zestawu (tytuł, liczba zadań, najlepszy wynik, ostatni wynik, przycisk „Zacznij"). Jeśli temat ma kilka zestawów, wyświetl listę kart.
2. **W Centrum ćwiczeń** (route `/cwiczenia`, pozycja w panelu): wszystkie zestawy pogrupowane wg poziomu i kategorii, z najlepszym wynikiem, oraz sekcja zestawów mieszanych (patrz spec 02).
3. **W sekcjach egzaminów** (np. Egzamin ósmoklasisty) jako grupy ćwiczeń z manifestu egzaminu (patrz spec 05).

**Mapa temat → zestawy:** `dane/cwiczenia-tematy.json`

```
{
  "version": 1,
  "topics": {
    "a2-czasy-past-simple": ["a2-czasy-past-simple-1"]
  }
}
```

Plik zestawu: `cwiczenia/tematy/<setId>.json`. Zestawy ładuj leniwie (dynamiczny import / fetch) dopiero po wejściu na stronę z zadaniami albo po kliknięciu „Zacznij". Nie wklejaj całego banku do głównego bundla.

Pozycja w mapie, której plik nie istnieje, ma być pomijana (w trybie dev ostrzeżenie w konsoli), a nie wywracać aplikacji.

## 2. Format zestawu

```
{
  "version": 1,
  "id": "a2-czasy-past-simple-1",
  "topic": "a2-czasy-past-simple",
  "level": "A2",
  "title": "Past Simple – sprawdź się",
  "intro": "10 zadań: wybór formy, układanie zdań i szukanie błędów.",
  "passage": null,
  "items": [ ... ]
}
```

- `topic` to id punktu niezbędnika (z `index.json`). Dla zestawów egzaminowych może być `null`.
- `passage` (opcjonalnie): tekst w Markdown wyświetlany nad zadaniami (czytanie). Na szerokich ekranach panel obok, na wąskich zwijany akordeon.
- Każde zadanie ma **globalnie unikalne `id`** (format `<setId>-<nr>` lub dowolny, ale unikalny w całym banku), bo po id liczymy statystyki, powtórki i mieszanie zestawów.

### Pola wspólne każdego zadania

| Pole | Opis |
| --- | --- |
| `id` | unikalny identyfikator |
| `type` | `multiple-choice`, `reorder`, `find-error`, `short-answer` |
| `topic` | id punktu niezbędnika (dziedziczone z zestawu, jeśli brak) |
| `level` | A1–C2 (dziedziczone z zestawu, jeśli brak) |
| `tags` | tablica tagów, np. `["past-simple","irregular-verbs"]` (do statystyk i mieszania) |
| `explanation` | wyjaśnienie po polsku (1–3 zdania), pokazywane po odpowiedzi |
| `trap` | opcjonalnie: „typowa pułapka" po polsku (jedno zdanie) |

## 3. Typy zadań

### 3.1 `multiple-choice` – wybierz poprawną formę (lub reakcję, lub odpowiedź do tekstu)

```
{
  "id": "a2-czasy-past-simple-1-01",
  "type": "multiple-choice",
  "kind": "form",
  "prompt": "We ___ to the cinema last night.",
  "options": ["go", "goes", "went", "gone"],
  "correct": 2,
  "optionNotes": [
    "go to forma podstawowa – w Past Simple potrzebna 2. forma.",
    "goes to Present Simple dla he/she/it.",
    null,
    "gone to 3. forma, bez have niepoprawna w Past Simple."
  ],
  "explanation": "Last night = zakończony moment w przeszłości, więc Past Simple: went."
}
```

- `kind`: `form` (luka w zdaniu), `function` (reakcja w dialogu, `prompt` może zawierać wiersze `A: …` i `B: ___`), `reading` (pytanie do `passage`), `listening` (pytanie do nagrania, patrz sekcja 5).
- `options`: 3–4 opcje, dokładnie jedna poprawna (`correct` = indeks).
- `optionNotes`: opcjonalna tablica tej samej długości, krótkie wyjaśnienie, czemu dana opcja odpada (`null` dla poprawnej). Pokazuj po odpowiedzi.
- **Kolejność opcji losuj** przy każdym podejściu (pamiętaj o przeliczeniu `correct` i `optionNotes`). Wyjątek: `"fixedOrder": true` (np. odpowiedzi typu „prawda/fałsz/brak informacji").
- Wyświetlanie luki `___` w `prompt`: pogrubiona linia/pole, po odpowiedzi wypełniona wybraną opcją (poprawną na zielono, błędną na czerwono z przekreśleniem; kolor + ikona, nie tylko kolor).
- Dla `kind: "function"` i `reading` luki w `prompt` nie musi być.

### 3.2 `reorder` – ułóż zdanie

```
{
  "id": "a2-czasy-past-simple-1-05",
  "type": "reorder",
  "context": "Wczoraj nie poszedłem do szkoły.",
  "answers": ["I didn't go to school yesterday.", "Yesterday I didn't go to school."],
  "extraTokens": [],
  "explanation": "Przeczenie w Past Simple: didn't + forma podstawowa."
}
```

- `context` (opcjonalnie): polskie zdanie jako podpowiedź znaczenia.
- `answers`: lista akceptowanych zdań. **Pierwsza jest wzorcowa.** Wszystkie muszą składać się z dokładnie tego samego zestawu wyrazów (wieloznacznik: ten sam multizbiór tokenów). Tokeny to wyrazy rozdzielone spacją; interpunkcja końcowa zostaje przyklejona do ostatniego wyrazu (np. `school`, `yesterday.`) i przy porównywaniu jest ignorowana (patrz normalizacja).
- `extraTokens`: opcjonalne wyrazy-rozpraszacze (maks. 2), których nie ma w poprawnej odpowiedzi.
- Tokeny do ułożenia budujesz z `answers[0]` (po usunięciu interpunkcji końcowej i z zachowaniem wielkości liter w pierwszym wyrazie na ekranie jako małej, żeby nie zdradzać początku; porównanie i tak ignoruje wielkość liter) + `extraTokens`, potem tasujesz. **Nigdy nie pokazuj tokenów od razu w poprawnej kolejności** (jeśli wylosowana kolejność jest poprawna, tasuj ponownie).
- Interfejs: „tap-to-place". Dotknięcie/kliknięcie wyrazu z puli dodaje go do linii odpowiedzi, dotknięcie wyrazu w linii zwraca go do puli. Przeciąganie jako ulepszenie na urządzeniach z myszą. Dostępność: wszystkie wyrazy to przyciski, linia odpowiedzi to lista, można używać klawiatury (Enter/Spacja dodaje, Backspace cofa ostatni wyraz). Przycisk „Wyczyść" i „Sprawdź".
- Ocena: normalizacja (sekcja 4), porównanie ułożonego zdania z każdą z `answers`. Po błędzie pokaż wzorcowe zdanie (`answers[0]`) i wskaż pierwsze miejsce, w którym ułożenie się różni.

### 3.3 `find-error` – znajdź i popraw błąd

```
{
  "id": "a2-czasy-past-simple-1-08",
  "type": "find-error",
  "tokens": ["I", "buyed", "a", "new", "bike", "last", "month."],
  "errorRange": [1, 1],
  "fixes": ["bought"],
  "explanation": "Buy jest nieregularny: buy, bought."
}
```

- `tokens`: zdanie rozbite na wyrazy (spacja jako separator, interpunkcja przyklejona do wyrazu).
- `errorRange`: `[od, do]` (indeksy włącznie) – **fragment, który jest błędny**. W zdaniu jest dokładnie jeden błąd, który naprawia się przez zamianę tego fragmentu.
- `fixes`: lista akceptowanych poprawek dla tego fragmentu (jeden lub kilka wyrazów). Pierwsza jest wzorcowa. Pusta poprawka `""` oznacza usunięcie fragmentu.
- Interfejs krok po kroku: (1) użytkownik klika wyraz lub zaznacza fragment (klik pierwszego i ostatniego wyrazu zakresu; podświetlenie), (2) pojawia się pole „Jak powinno być?" i przycisk „Sprawdź".
- Ocena: **1 punkt tylko, gdy zaznaczony zakres jest dokładnie błędnym zakresem I poprawka pasuje do `fixes`**. Informacja zwrotna rozróżnia: zły fragment, dobry fragment ze złą poprawką, całość poprawna. Gdy zakres się nie zgadza, pokaż, gdzie był błąd.
- Opcjonalnie `"noError": true` (zdanie bez błędu, `errorRange` i `fixes` pomijane) – użytkownik wybiera przycisk „Brak błędu". Używaj oszczędnie.

### 3.4 `short-answer` – krótka odpowiedź (uzupełnij luką)

Typ pomocniczy, głównie dla tłumaczenia fragmentów zdań na egzaminie ósmoklasisty.

```
{
  "id": "e8-srodki-1-01",
  "type": "short-answer",
  "context": "Moja mama pracuje w szpitalu.",
  "prompt": "My mum ___ in a hospital.",
  "accepted": ["works"],
  "explanation": "Present Simple, 3. osoba: works."
}
```

- `prompt` ma jedną luką `___`. `accepted`: lista akceptowanych wpisów (po normalizacji).
- Ocena: pełna poprawność (wielkość liter ignorowana, odstępy przycinane). Brak punktów za literówki (tak jak w zadaniach egzaminowych na znajomość środków językowych). Jeśli wpis różni się od akceptowanego tylko 1 literą, pokaż uwagę „Uwaga na pisownię" (ale nadal 0 pkt).

## 4. Normalizacja odpowiedzi

Funkcja `normalize(str)`:
1. przytnij odstępy, zamień wielokrotne spacje na jedną,
2. zamień typograficzne apostrofy `’` na `'`,
3. usuń interpunkcję na końcu (`. , ! ? ;`),
4. zamień na małe litery,
5. **skróty NIE są rozwijane automatycznie**: `I'm` i `I am` to różne zapisy, więc jeśli oba mają być uznane, muszą być na liście `answers`/`accepted`/`fixes`.

## 5. Zadania ze słuchu (kind `listening`, etap egzaminów)

Wariant `multiple-choice` z polem `script` (tekst nagrania: wiersze `A: …`, `B: …` lub jeden narrator) i `maxPlays` (domyślnie 2).

- Odtwarzanie przez **Web Speech API** (`speechSynthesis`), język `en-GB` (w drugiej kolejności `en-US`). Przy dwóch rozmówcach użyj dwóch różnych głosów, jeśli są dostępne. Tempo 0.9, krótka przerwa między wypowiedziami.
- Kontrolki: „Odtwórz", licznik pozostałych odtworzeń (np. „Odsłuchy: 1/2"), pauza. Transkrypt ukryty do czasu odpowiedzi, potem dostępny w sekcji „Pokaż transkrypt".
- Jeśli brak głosów angielskich lub API niedostępne: komunikat „Ta przeglądarka nie ma głosu angielskiego" i przycisk „Pokaż transkrypt do przeczytania" (zadanie nadal można zrobić, ale wynik oznacz jako „czytane" i nie wliczaj do statystyk słuchania).
- Jakość głosów zależy od urządzenia, więc nie obiecuj jakości nagrań egzaminacyjnych. Wskazówka w UI: „To trening rozumienia, nagranie z egzaminu brzmi inaczej."

## 6. Przebieg sesji

1. Ekran startowy zestawu: tytuł, liczba zadań, opis typów, tryb: **Nauka** (informacja zwrotna po każdym zadaniu) lub **Egzamin** (informacja zwrotna na końcu). Domyślnie Nauka, dla zestawów egzaminowych można ustawić `"defaultMode": "exam"`.
2. Jedno zadanie na ekranie, pasek postępu (kropki), przycisk „Sprawdź" i „Dalej". W trybie Nauka po „Sprawdź": wynik zadania, `explanation`, `optionNotes`/wzór odpowiedzi, `trap` (ramka „Pułapka"). Klawiatura: Enter = Sprawdź/Dalej, cyfry 1–4 wybierają opcje w `multiple-choice`.
3. Ekran podsumowania: wynik (np. 7/10) z krótkim, ciepłym komentarzem (ux-copy), lista błędów z wyjaśnieniami, przyciski „Powtórz tylko błędne", „Zrób jeszcze raz (inna kolejność)", „Wróć do tematu", „Dalej: zestaw mieszany".
4. **Zapis wyniku** po zakończeniu sesji i **każdej odpowiedzi** do dziennika podejść (patrz spec 03). Najlepszy i ostatni wynik zestawu pokazuj na karcie zestawu.
5. Przerwanie sesji (zamknięcie karty): nie zapisuj częściowego wyniku zestawu, ale zapisane pojedyncze odpowiedzi zostają w dzienniku podejść.
6. Po zakończeniu sesji wywołaj `markActivity()` (seria nauki).

## 7. Wygląd i dostępność

- Trzymaj się `DESIGN.md` (tokeny, motywy, ruch). Karty zadań, przyciski opcji (min. 44 px), kolory poprawna/błędna z ikoną i tekstem (nie tylko kolorem).
- Animacje: krótkie „pstryknięcie" przy poprawnej odpowiedzi, delikatne drżenie przy błędnej (wyłączone przy `prefers-reduced-motion`).
- Wszystko obsługiwane klawiaturą; `aria-live` dla informacji zwrotnej; opcje jako `radiogroup`.
- Treści użytkownika (odpowiedzi wpisane) wyświetlaj wyłącznie jako tekst.

## 8. Walidator danych (obowiązkowy)

Skrypt `scripts/validate-exercises.*` uruchamiany przez `npm run validate` i w kroku build. Sprawdza:

- wszystkie pliki z `cwiczenia-tematy.json` istnieją i są poprawnym JSON,
- `id` zadań unikalne w całym banku, `topic` wskazuje istniejące `id` z `index.json` (lub `null`),
- `multiple-choice`: 2–4 opcje, `correct` w zakresie, `optionNotes` (jeśli jest) ma tę samą długość i `null` dla poprawnej,
- `reorder`: wszystkie `answers` mają ten sam multizbiór tokenów, `extraTokens` nie występują w `answers`,
- `find-error`: `errorRange` mieści się w `tokens`, `fixes` niepuste,
- `short-answer`: dokładnie jedna luka `___` w `prompt`, `accepted` niepuste,
- `explanation` niepuste, `passage` obecny dla `kind: "reading"`, `script` dla `kind: "listening"`.

Błędy walidacji przerywają build.

## 9. Kryteria odbioru etapu

- [ ] Co najmniej jedna strona tematu pokazuje sekcję „Sprawdź się" z zestawem pilotażowym (zestawy dostarczone w `cwiczenia/tematy/`).
- [ ] Wszystkie cztery typy zadań działają myszą, dotykiem i klawiaturą.
- [ ] Wyniki zapisują się per profil i wchodzą do eksportu/importu/resetu.
- [ ] Walidator przechodzi, build przechodzi.
- [ ] Brak zmian w istniejących kluczach localStorage.
