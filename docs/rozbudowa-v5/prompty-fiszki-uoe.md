# Prompty do Claude Code – Fiszki (active recall) i 12 zestawów Use of English C1

Przygotowanie: rozpakuj `rozbudowa-v5-fiszki-uoe.zip` do folderu projektu (np. `docs/rozbudowa-v5/`). Wymagane: w projekcie są już paczka v2 (silnik zadań, dziennik błędów, statystyki, wyszukiwarka) i moduł Certyfikat C1. Wklej prompty po kolei i napisz „OK" dopiero po obejrzeniu wyniku. Etapy są niezależne: możesz zacząć od Etapu 2 (szybszy), jeśli chcesz mieć nowe zestawy C1 przed fiszkami.

---

## PROMPT 1 – Etap 1: zakładka Fiszki

```
Dodajemy zakładkę Fiszki z cyklicznym active recall (powtórki w rosnących odstępach). Przeczytaj w całości: docs/rozbudowa-v5/00-CZYTAJ-TO.md i spec/10-fiszki.md, a także DESIGN.md oraz specyfikacje 03 (dziennik błędów, statystyki) i 04 (wyszukiwarka, notatki) z paczki v2, żeby wpiąć się w istniejące mechanizmy.

Zasady: nowa gałąź feature/fiszki, jeden commit na krok. Nie zmieniaj istniejących kluczy ani formatów localStorage. Nowe dane w nowym kluczu elm.<profileId>.fiszki z polem version, w try/catch, objęte eksportem, importem i resetem. Bez zewnętrznych CDN. Zgodność z DESIGN.md, AA, prefers-reduced-motion. Pliki talii kopiuj z paczki (dane/fiszki/), nie przepisuj ręcznie.

ETAP 1:
1. Skopiuj dane/fiszki/ do projektu zgodnie z konwencją repo. Dodaj walidator talii (scripts/validate_fiszki.py) do npm run validate.
2. Zaimplementuj harmonogram jako czystą funkcję schedule(card, grade, now, config) w osobnym module bez DOM i localStorage, dokładnie według spec/10 sekcja 3. Referencja: scripts/scheduler_ref.py. Napisz testy jednostkowe, które odtwarzają wszystkie scenariusze z dane/fiszki/scheduler-vectors.json (state, step, ease, interval, pendingInterval, lapses, reps, due). Jeśli wynik się różni, popraw implementację, nie wektory.
3. Napisz też czyste funkcje i testy: normalize/ocena odpowiedzi (sekcja 2.1, alternatywy a|b), parser cloze, budowa kolejki sesji (limity nowych 10 i powtórek 100, kolejność, zawieszone/odłożone, granica dnia 04:00), import i eksport TSV/CSV (cudzysłowy, polskie znaki, {{c1::…}} Anki), walidacja stanu z localStorage.
4. Dane w localStorage wg spec/10 sekcja 4 (stan tylko ruszonych kart, userDecks, userCards, settings, daily z przycinaniem do 400 dni), eksport/import/reset.
5. Ekran /fiszki wg sekcji 5.1: pozycja w lewym panelu z plakietką liczby kart do powtórki, lista talii z paskami nowe/w nauce/opanowane i przełącznikiem włączenia, „Ucz się teraz", stan pusty. Domyślnie włączone talie: czasowniki-frazowe i kolokacje.
6. Sesja nauki wg sekcji 5.2: ukryta odpowiedź, tryb „najpierw wpisz odpowiedź" (zawsze dla typu typed), sugerowana ocena, cztery oceny z podglądem następnego terminu, skróty (Spacja, 1–4, Z cofnij, E, S, B), stos cofania min. 10, pasek postępu, podsumowanie sesji, komunikat „Na dziś koniec".
7. Przeglądanie i edycja wg sekcji 5.3: lista kart z filtrami, własne talie i karty (walidacja cloze), zawieszanie kart wbudowanych, import i eksport TSV/CSV z podglądem importu.
8. Integracje wg sekcji 5.4–5.5: „Dodaj do fiszek" w Dzienniku błędów (talia „Moje błędy", dedup po sourceItemId, opcja automatycznego dodawania domyślnie wyłączona), dodawanie z zaznaczenia tekstu na stronach tematów, kafelek „Fiszki do powtórki" na pulpicie Dziś, sekcja „Fiszki" w Statystykach (zasada małych próbek), skróty w wyszukiwarce, ukończona sesja (≥ 5 kart) liczy się jako aktywność dnia w istniejącym mechanizmie serii.
9. Dostępność (sekcja 7): klawiatura, aria-live dla wyniku, etykiety przycisków ocen z terminem, brak innerHTML z danych użytkownika, efekt odsłonięcia ≤ 200 ms i wyłączony przy prefers-reduced-motion, układ od 360 px.

Na końcu: npm run build + validate + testy. Zrzuty ekranu (jasny i ciemny motyw, desktop i telefon): lista talii, sesja z ukrytą odpowiedzią, sesja po odsłonięciu z czterema ocenami, tryb wpisywania z wynikiem „dobrze" i „literówka", podsumowanie sesji, formularz własnej karty, podgląd importu, „Dodaj do fiszek" z dziennika błędów, kafelek na pulpicie, sekcja w Statystykach (z danymi i pusta). Podsumuj krótko (w tym liczbę testów) i POCZEKAJ NA MOJE "OK". Nie rób merge ani push.
```

---

## PROMPT 2 – Etap 2: 12 nowych zestawów Use of English w Certyfikacie C1, QA, merge i push

```
Dodajemy 12 nowych zestawów Use of English (po 3 na każdy Part 1–4) do modułu Certyfikat C1. Przeczytaj: docs/rozbudowa-v5/spec/11-c1-uoe-dodatkowe-zestawy.md, a potem istniejące pliki certyfikat-c1/manifest.json i powiazania.json oraz jeden istniejący zestaw z każdego Partu jako wzór.

Zasady: gałąź feature/c1-uoe-plus (jeśli Etap 1 jest już zmergowany, odetnij od main; jeśli nie, pracuj na gałęzi feature/fiszki dodając osobne commity). Jeden commit na krok. Nie zmieniaj silnika ćwiczeń C1, istniejących zestawów ani kluczy localStorage. Nie przepisuj treści ręcznie: kopiuj pliki.

ETAP 2:
1. Skopiuj 12 plików z docs/rozbudowa-v5/certyfikat-c1/cwiczenia/ do folderu ćwiczeń modułu C1.
2. Zastosuj manifest-patch.json (dopisz zestawy na koniec list w grupach o odpowiednim part) i powiazania-patch.json (dopisz id do tablic ćwiczeń przy wskazanych itemId, bez usuwania istniejących). Jeśli struktura plików różni się od opisanej, dostosuj i napisz, co zmieniłeś. Brakujące itemId zgłoś.
3. Uruchom scripts/validate_c1_uoe.py oraz wszystkie istniejące walidatory. Włącz nowy walidator do npm run validate, jeśli nie dubluje istniejących reguł.
4. Przejdź każdy z 12 zestawów w trybie Nauka i Egzamin: wpisz poprawne odpowiedzi (powinno być maksimum punktów), potem kilka błędnych. Sprawdź w Part 4 licznik wyrazów 3–6 i alternatywy z parts, w Part 3 że akceptowane są warianty z accept, w Part 2 że wielkość liter nie ma znaczenia. Zgłoś każdy zestaw, w którym poprawna odpowiedź jest odrzucona albo błędna zaliczona (nie poprawiaj treści po cichu: opisz i zaproponuj poprawkę).
5. Sprawdź, że liczba zestawów w grupach to Part 1: 6, Part 2: 7, Part 3: 7, Part 4: 11, że istniejące zestawy i wyniki zapisane wcześniej działają bez zmian, a ramki „Na egzaminie C1" na stronach tematów prowadzą do nowych zestawów.
6. QA całości (jeśli Etap 1 jest w tej samej gałęzi, także Fiszki): klawiatura, kontrast AA w obu motywach, szerokość 360 px, prefers-reduced-motion, import starego eksportu danych, eksport i reset, wyszukiwarka, brak regresji E8, MP, MR, B2 i C1.

Na końcu: build, validate, testy, zrzuty ekranu (lista ćwiczeń Use of English z nowymi zestawami, po jednym zestawie z Part 1, 2, 3 i 4, wynik z wyjaśnieniami) w obu motywach i krótka lista zmian. POCZEKAJ NA MOJE "OK". DOPIERO PO MOIM "OK": merge do main i git push (sprawdź, że GitHub Pages się zbudowało, i napisz, co sprawdziłeś).
```
