# Prompty do Claude Code – paczka v7 (Szlak + poprawki)

Przygotowanie: rozpakuj `rozbudowa-v7-szlak.zip` do `docs/rozbudowa-v7-szlak/`. Dwa etapy: najpierw poprawki (szybkie, ważne przed startem), potem Szlak. Po każdym napisz „OK” dopiero po obejrzeniu wyniku.

---

## PROMPT 1 – Etap 1: poprawki przed startem

```
Przygotowujemy publiczny start aplikacji (koniec grudnia, bez kont). Przeczytaj docs/rozbudowa-v7-szlak/00-CZYTAJ-TO.md i spec/14-poprawki-przed-startem.md, a także DESIGN.md.

Zasady: nowa gałąź feature/szlak-v7 od main, jeden commit na poprawkę. Nie zmieniaj istniejących kluczy ani formatów localStorage. Bez zewnętrznych CDN. AA, prefers-reduced-motion.

ETAP 1 – poprawki P1–P6 ze spec 14:
P1 tryb gościa: treści publiczne działają bez profilu, akcje zapisujące proszą o utworzenie profilu i wykonują się po nim; strony osobiste pokazują kartę powitalną i wracają do żądanego adresu. Żadna trasa nie może dać pustego ekranu.
P3 rozdziel "nowe" od "do powtórki" w fiszkach (plakietka, Dziś, Fiszki i błędy) i dodaj lub uruchom test regresyjny harmonogramu (karta z interwałem 8 d nie wraca przez 7 dni).
P4 przyspiesz Laboratorium czasów (zmierz przed i po, cel < 500 ms do widoku Mapa czasów przy ciepłym cache, szkielet zamiast napisu).
P5 górny pasek na telefonie: przycisk profilu zwija się do awatara poniżej ok. 480 px; brak poziomego przewijania na 320/360/375 px na głównych ekranach.
P6 drobne: kafelki egzaminów na stronie głównej, teksty na ekranie wyniku testu poziomu.
(P2 zrobimy w etapie 2 razem ze Szlakiem.)

Na końcu: build, validate, testy. Zrzuty przed i po dla P1 (strona tematu i Dziś bez profilu), P3, P4 (z czasami), P5 (375 px) w obu motywach. Podsumuj przyczyny i POCZEKAJ NA MOJE "OK". Nie rób merge ani push.
```

---

## PROMPT 2 – Etap 2: Szlak, QA, merge i push

```
Kontynuuj na gałęzi feature/szlak-v7. Przeczytaj docs/rozbudowa-v7-szlak/spec/13-szlak.md w całości oraz pliki szlak/szlak.json i przykładowy quiz z szlak/quizy/a1/.

ETAP 2 – Szlak wg spec 13:
1. Wbuduj szlak/szlak.json i quizy (szlak/quizy/a1, a2) jak inne dane repo (generowane pliki .js, ładowanie leniwe). Dodaj walidator scripts/validate_szlak.py (lub odpowiednik) do npm run validate z argumentem niezbednik/index.json.
2. Logika jako czyste funkcje z testami: stopStatus (quiz ≥ 3/4, pełne Umiem, zestaw ≥ 80%, skip, cofnięcie Umiem), bieżący przystanek od punktu startu, postęp krainy, losowanie powtórki z fallbackami, walidacja stanu. Nowy klucz elm.<id>.szlak z version w eksporcie/imporcie/resecie.
3. Punkt startu z testu poziomu (P2 ze spec 14): przycisk "Zacznij szlak od X", krainy wcześniejsze jako "pominięte testem", zmiana punktu startu ręcznie. Zaliczenie quizem proponuje "Umiem", ale go nie zaznacza.
4. Widok #/szlak (sekcja 4.1): pionowa ścieżka z krainami, odcinkami, węzłami przystanków i powtórek, odnogami egzaminów; arkusz przystanku (Przeczytaj → Sprawdź się → Zaliczone, dalej / Pomiń). Wykorzystaj istniejące kształty i kolory krain. Lista w DOM jako ol, stany w tekście.
5. Integracje (sekcja 4.2): Dziś (następny przystanek i odcinek), pasek "Przystanek N z M" na stronach tematów, link na stronie poziomu, pozycja "Szlak" w panelu i menu, skrót w wyszukiwarce, sekcja w Statystykach, ekran pierwszego uruchomienia (test poziomu albo start od A1).
6. QA całości: nowy profil od zera (bez testu i z testem C1), klawiatura, AA w obu motywach, 320/360/375 px, prefers-reduced-motion, import starego eksportu, eksport i reset nowego klucza, brak regresji w egzaminach, fiszkach i ćwiczeniach.

Na końcu: build, validate, testy, zrzuty ekranu (szlak na desktopie i telefonie w obu motywach, arkusz przystanku, quiz przystanku, powtórka, Dziś po teście C1, pasek na stronie tematu, pierwsze uruchomienie) i krótka lista zmian. POCZEKAJ NA MOJE "OK". DOPIERO PO MOIM "OK": merge feature/szlak-v7 do main i git push (sprawdź, że GitHub Pages się zbudowało, i napisz, co sprawdziłeś).
```
