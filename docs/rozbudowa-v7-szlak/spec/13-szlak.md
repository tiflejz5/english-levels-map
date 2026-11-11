# Specyfikacja 13 – Szlak: ścieżka nauki dla nowej osoby

## 1. Cel

Nowa osoba ma wiedzieć, **co robić dalej**, bez przeglądania 150 punktów checklisty. Szlak to jedna uporządkowana droga przez krainy A1 → C2 (Polana, Las, Wzgórza, Jezioro, Góry, Szczyt). Przeplata gramatykę, funkcje i słownictwo w małe przystanki, a co kilka przystanków robi powtórkę. Wzór: ścieżka w Duolingo, ale **bez twardych blokad**. Szlak podpowiada kolejność, a wszystko zostaje dostępne.

Szlak **rozbudowuje to, co już jest**: krainy na mapie (Dziś, strona główna), „Następny przystanek”, test końcowy poziomu ze znaczkiem, test poziomu, checklistę „Umiem”. Nie tworzymy drugiego systemu postępu.

## 2. Dane

`szlak/szlak.json` (gotowe, nie przepisywać ręcznie):

```
levels[]: { level, land, finalTest, branches[], units[] }
units[]:  { id, title, stops[] }                     // odcinek: 2–8 przystanków + powtórka
stop (lesson): { id: "a1-05", type: "lesson", title, items: ["e_a1_f03", …], page: "a1/funkcje-liczby-godzina-data", set?: "a1-czasy-present-simple-1", quiz?: "szlak-a1-05" }
stop (review): { id: "a1-u1-powtorka", type: "review", title, from: [id przystanków odcinka], size: 6 }
branches[]: { exam, label, route, note }             // odnogi egzaminacyjne
```

- **118 przystanków-lekcji + 24 powtórki.** Każdy punkt checklisty (`e_a1_g01` itd., 152 punkty) jest dokładnie w jednym przystanku. Walidator to sprawdza.
- `items` to identyfikatory checklisty z `elm_content_v1`. `page` to strona niezbędnika (route `#/a1/funkcje-liczby-godzina-data`).
- `set`: istniejący zestaw tematyczny z `cwiczenia-indeks` (11 przystanków).
- `quiz`: szybki sprawdzian przystanku, 4 pytania multiple-choice w formacie silnika zadań (spec 01). **Pliki:** `szlak/quizy/a1/*.json` (22) i `szlak/quizy/a2/*.json` (20). Opcje są zapisane w kolejności losowej, silnik i tak tasuje. Quizy B1–C2 dojdą w kolejnych paczkach (bez zmian w kodzie: nowy plik i pole `quiz` w szlaku).
- Wbuduj dane tak jak inne dane w repo (np. generowany plik `*.js`, jak `cwiczenia-indeks.js`), z ładowaniem leniwym.

## 3. Stan użytkownika

Nowy klucz per profil: `elm.<profileId>.szlak`.

```
{
  "version": 1,
  "start": { "level": "C1", "source": "test" | "manual" | "default", "at": "ISO" },
  "stops": { "a1-05": { "done": true, "via": "quiz" | "umiem" | "skip", "best": 4, "at": "ISO" } },
  "reviews": { "a1-u1-powtorka": { "best": 5, "of": 6, "at": "ISO" } }
}
```

- Try/catch, w eksporcie, imporcie i resecie, walidacja przy imporcie.
- **Nie zmieniaj** istniejących kluczy (`elm_profiles_v1`, `elm_leveltest_v1`, itd.).

### 3.1 Kiedy przystanek jest zaliczony (funkcja czysta `stopStatus(stop, profile)`)

Przystanek jest **zaliczony**, gdy spełniony jest jeden z warunków:
1. quiz przystanku ≥ 3/4 (`via: "quiz"`);
2. **wszystkie** jego punkty checklisty mają „Umiem” (`via: "umiem"`). Liczone na bieżąco z checklisty, bez kopiowania. Odznaczenie „Umiem” cofa zaliczenie, chyba że quiz był zdany;
3. przystanek bez quizu: zaliczenie zestawu `set` ≥ 80% albo warunek 2.

Statusy: `done`, `current` (pierwszy niezaliczony na szlaku od punktu startu), `open` (pozostałe, klikalne), `skipped` (w krainach przed punktem startu, patrz 3.2).

**Zaliczenie quizem nie zaznacza „Umiem” automatycznie.** Po zaliczeniu pokaż propozycję „Zaznaczyć Umiem dla: …?” z jednym przyciskiem. Spójne z dotychczasową zasadą „nigdy automatycznie”.

### 3.2 Punkt startu i test poziomu

- Wynik testu poziomu (`elm_leveltest_v1`) ustawia `start.level`. Przycisk „Zacznij od poziomu X” na ekranie wyniku zapisuje start i prowadzi do szlaku w tej krainie.
- **Krainy przed punktem startu** mają status `skipped` („Pominięte testem poziomu”). Nie blokują niczego, nie liczą się jako „Umiem”, można do nich wrócić. Na mapie wyglądają na przebyte, ale wyblakłe, z ikoną strzałki zamiast znaczka.
- Brak testu: start A1 (`source: "default"`). Użytkownik może zmienić start ręcznie (menu szlaku: „Zmień punkt startu”).
- **Błąd do naprawy:** obecnie po teście z wynikiem C1 Dziś pokazuje „kraina A1, następny przystanek Present Simple”. Po zmianie ma pokazać pierwszy niezaliczony przystanek C1.

### 3.3 Krainy i odblokowanie

- Kraina jest ukończona, gdy test końcowy poziomu ≥ 80% (istniejący znaczek). Do tego czasu kolejna kraina jest **otwarta, ale nie podświetlona**. Kliknięcie w przystanek dalszej krainy pokazuje dyskretną informację „Zalecamy najpierw skończyć Polanę” z przyciskiem „Mimo to otwórz”.
- Postęp krainy = zaliczone przystanki / wszystkie przystanki (procent na mapie). Zastępuje lub uzupełnia obecny procent „Umiem”. Wybierz jedno źródło i opisz w podsumowaniu. Rekomendacja: na mapie szlak, na stronie poziomu checklista.

### 3.4 Powtórki (węzły `review`)

Losuje `size` (6) pytań z quizów przystanków `from`. Gdy przystanki nie mają quizów, losuje z zestawów `set`. Gdy i tego brak, z pytań testu końcowego tego poziomu, a gdy brak źródeł, węzeł pokazuje „Powtórka dostępna po dodaniu quizów” i jest pomijany. Wynik nie blokuje dalszej drogi. Błędne odpowiedzi trafiają do Dziennika błędów jak w innych ćwiczeniach.

### 3.5 Odnogi egzaminacyjne

`branches` przy krainach: E8 (po A2), matura podstawowa (po B1), matura rozszerzona i B2 First (po B2), C1 Advanced (po C1). Na szlaku są bocznym rozgałęzieniem z ikoną egzaminu i opisem `note`, zawsze klikalne, prowadzą do modułu (`route`). Egzamin przypięty przez użytkownika (istniejąca funkcja „Przypnij do Dziś”) ma odnogę wyróżnioną.

## 4. Interfejs

### 4.1 Widok szlaku `#/szlak`

- Pionowa, wijąca się ścieżka (mobile-first), pogrupowana w krainy i odcinki. Nagłówek odcinka: tytuł, np. „Odcinek 2 · Mój świat”, i postęp (3/5).
- **Węzeł przystanku:** okrąg z ikoną kategorii (gramatyka, funkcje, słownictwo albo mieszany), stan (zaliczony z ✓ jako ikoną SVG, bieżący z pulsującą obwódką, otwarty, pominięty), tytuł pod spodem. Węzeł powtórki ma osobny kształt.
- Bieżący przystanek jest przewinięty do widoku po wejściu.
- **Kliknięcie w węzeł** otwiera arkusz przystanku (bottom sheet na telefonie, panel na desktopie):
  - tytuł i lista punktów checklisty z „Umiem”;
  - krok 1 **„Przeczytaj”**: link do strony `page`;
  - krok 2 **„Sprawdź się”**: quiz albo zestaw `set` albo ćwiczenie ze strony;
  - przyciski „Zaliczone, dalej” (gdy spełnione) i „Pomiń ten przystanek” (`via: "skip"`, liczy się jak pominięty, nie jak zaliczony).
- Wizualnie korzysta z obecnych krain (kolory, kształty warstwic z `krainy.js`). Animacja przejścia do kolejnego węzła ≤ 400 ms, wyłączona przy `prefers-reduced-motion`.
- Dostępność: lista przystanków w DOM jako `ol` z linkami, stan w tekście („zaliczony”, „bieżący”), nie tylko kolorem. Pełna obsługa klawiaturą.

### 4.2 Integracje

- **Dziś:** blok mapy bez zmian wizualnych, ale „Następny przystanek” i „Idź dalej szlakiem” prowadzą do bieżącego przystanku (otwarty arkusz). Pod mapą jedna linia: „Odcinek 2 · Mój świat · 3/5”.
- **Strona tematu:** na dole, gdy strona należy do przystanku, pasek „Przystanek 7 z 22 na Polanie” z przyciskami „Sprawdź się (4 pytania)” i „Następny przystanek →”.
- **Strona poziomu:** link „Zobacz Polanę na szlaku”.
- **Panel boczny:** pozycja „Szlak” jako pierwsza w grupie nauki (ikona szlaku). Na telefonie także w menu.
- **Wyszukiwarka:** skrót „Szlak”.
- **Statystyki:** sekcja „Szlak”: zaliczone przystanki na poziom, średni wynik quizów.
- **Pierwsze uruchomienie** (nowy profil): po dodaniu profilu ekran z wyborem „Zrób test poziomu (6 min)” albo „Zacznij od A1”. Oba prowadzą na szlak.

## 5. Testy

Jednostkowe, na czystych funkcjach: `stopStatus` (quiz, umiem, set, odznaczenie Umiem, skip), wyznaczanie bieżącego przystanku od punktu startu, przeliczanie postępu krainy, losowanie powtórki (źródła i fallbacki), walidacja stanu przy imporcie. Do `npm run validate` dodaj `python3 scripts/validate_szlak.py niezbednik/index.json` (lub odpowiednik w JS). Sprawdza pokrycie checklisty, istnienie stron i kształt quizów.

## 6. Kryteria odbioru

- [ ] `#/szlak` pokazuje 6 krain, odcinki, przystanki, powtórki i odnogi. Bieżący przystanek jest wyróżniony i przewinięty do widoku.
- [ ] Test poziomu ustawia punkt startu. Wcześniejsze krainy mają status „pominięte”, a Dziś pokazuje właściwy przystanek.
- [ ] Przystanek zalicza się quizem (≥ 3/4), pełnym „Umiem” albo zestawem. Zaliczenie quizem proponuje „Umiem”, ale go nie zaznacza.
- [ ] Powtórki losują pytania z odcinka i mają fallback.
- [ ] Nowy klucz `elm.<id>.szlak` z `version`, objęty eksportem, importem i resetem. Stary eksport importuje się bez błędów.
- [ ] Klawiatura, AA w obu motywach, 360 px, `prefers-reduced-motion`.
