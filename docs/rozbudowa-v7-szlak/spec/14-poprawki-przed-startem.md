# Specyfikacja 14 – Poprawki znalezione w przeglądzie (11.11.2026)

Przegląd wersji na GitHub Pages (v=138) jako nowy użytkownik, desktop i 375 px, oba motywy. Każdą poprawkę zrób osobnym commitem, z krótkim opisem przyczyny w podsumowaniu.

## P1. Puste strony bez profilu (krytyczne przed startem)

**Objaw:** bez profilu `#/a1`, `#/dzis`, `#/a1/czasy-present-simple` i inne pokazują pusty, ciemny ekran. Ktoś, kto dostanie link od znajomego, nic nie zobaczy.

**Oczekiwane:**
- **Treści publiczne** (strony poziomów, strony tematów, Laboratorium czasów, moduły egzaminów, Centrum ćwiczeń, ściągi) działają **bez profilu** w trybie gościa. Przyciski „Umiem”, notatki, zapis wyników i fiszki pokazują przy kliknięciu małe okno „Utwórz profil, żeby zapisywać postęp (dane zostają w tej przeglądarce)” z polem nazwy. Po utworzeniu profilu akcja się wykonuje i użytkownik zostaje na tej samej stronie.
- **Strony osobiste** (Dziś, Fiszki i błędy, Statystyki, Notatki, Szlak) bez profilu pokazują kartę powitalną z dodaniem profilu, a po dodaniu wracają do żądanej strony (zachowaj hash).
- Nigdy pusty ekran: każda trasa ma stan „brak profilu”.

## P2. Wynik testu poziomu nie zmienia punktu startu

Opisane w spec 13 sekcja 3.2. Po teście z wynikiem X: Dziś, mapa i „Następny przystanek” wskazują krainę X.

## P3. Nowe fiszki liczą się jako „do powtórki”

**Objaw:** świeży profil ma od razu „10 do powtórki” (plakietka w panelu, Dziś, Fiszki i błędy).

**Oczekiwane:** rozdzielić **nowe** od **do powtórki**. Plakietka w panelu i liczba „do powtórki” liczą tylko karty `learning`/`relearning` z terminem ≤ teraz, `review` z terminem ≤ dziś oraz zaległe błędy i słabe punkty. Nowe karty pokazuj osobno: „Nowe dziś: 10”. Przycisk „Powtarzaj teraz” zaczyna od zaległych, potem nowe do limitu.

Sprawdź też przy okazji zgłoszony wcześniej problem: karta oceniona „Dobrze” z podglądem „8 d” wracała następnego dnia. Jeśli test regresyjny z poprzedniej poprawki istnieje, uruchom go. Jeśli nie, dodaj go (symulacja kilku dni z mockiem czasu: karta z interwałem 8 d nie może pojawić się w kolejce przez 7 dni).

## P4. Laboratorium czasów ładuje się 2–4 s

**Objaw:** napis „Wczytuję Laboratorium…” przez 2–4 sekundy przy pierwszym wejściu, też przy kolejnych wejściach z tej samej sesji.

**Oczekiwane:** zmierz w podsumowaniu (przed i po), co się ładuje (np. GSAP z pluginami, `lab-dane.js`, budowa SVG). Cel: widok „Mapa czasów” w < 500 ms po kliknięciu przy ciepłej pamięci podręcznej. Pomysły: renderuj siatkę kafelków od razu (to zwykły HTML), a GSAP i oś czasu ładuj dopiero dla zakładki „Karta czasu”; zachowaj dane po pierwszym załadowaniu; zamiast napisu daj szkielet układu.

## P5. Ucięty górny pasek na telefonie

**Objaw:** przy 375 px przycisk profilu („Profil · Test Claude”) wychodzi poza prawą krawędź.

**Oczekiwane:** poniżej ok. 480 px przycisk profilu zwija się do samego awatara z inicjałami (pełna nazwa w `aria-label` i w menu). Brak poziomego przewijania na 320, 360 i 375 px na wszystkich głównych ekranach.

## P6. Drobne

- Strona główna, sekcja „Twoje egzaminy”: przy braku przypiętego egzaminu pokaż kafelki egzaminów (E8, MP, MR, B2, C1) zamiast samego zdania „Wybierz go w grupie Egzaminy w panelu”.
- Ekran wyniku testu poziomu: link „Podsumowanie poziomu C1 (pod listą umiejętności)” prowadzi w dół strony poziomu. Zmień tekst na „Co umiesz na C1”, a główny przycisk na „Zacznij szlak od C1” (spec 13).

## Kryteria odbioru

- [ ] P1–P6 naprawione, każda poprawka z testem (jednostkowym albo e2e) tam, gdzie to możliwe.
- [ ] Zrzuty przed i po dla P1, P3, P4 i P5.
