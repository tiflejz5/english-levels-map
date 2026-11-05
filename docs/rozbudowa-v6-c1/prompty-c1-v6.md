# Prompt do Claude Code – więcej materiału do Certyfikatu C1 (paczka v6)

Przygotowanie: rozpakuj `rozbudowa-v6-c1.zip` do `docs/rozbudowa-v6-c1/`. Wymaga zainstalowanej paczki v5 (Fiszki + 12 zestawów UoE). Jeden etap: wklej, obejrzyj wynik, napisz „OK".

```
Dodajemy materiał do Certyfikatu C1. Przeczytaj docs/rozbudowa-v6-c1/00-CZYTAJ-TO.md i spec/12-c1-wiecej-cwiczen-i-fiszki.md, a potem certyfikat-c1/manifest.json, powiazania.json i dane/fiszki/index.json w projekcie.

Zasady: nowa gałąź feature/c1-v6 od main, jeden commit na krok. Nie zmieniaj silnika ćwiczeń C1, silnika fiszek ani istniejących kluczy localStorage. Pliki kopiuj z paczki, nie przepisuj treści ręcznie. Treści nie poprawiaj po cichu: jeśli coś jest błędne, opisz i zaproponuj poprawkę.

1. Skopiuj 8 nowych zestawów z certyfikat-c1/cwiczenia/ i zastosuj manifest-patch.json (grupy w sections[id="cwiczenia"].exerciseGroups, dopisz na koniec sets) oraz powiazania-patch.json (dopisz id do exercises, bez duplikatów).
2. Podmień uoe-p1-4.json, uoe-p1-5.json, uoe-p1-6.json na wersje z paczki (poprawione rozmieszczenie poprawnych odpowiedzi, w v5 zawsze było A). Sprawdź, że wcześniejsze wyniki tych zestawów nadal się wyświetlają.
3. Dodaj talię dane/fiszki/certyfikat-c1.json i wpis z index-patch.json. Włącz ją jednorazowo w istniejących profilach wg spec 12 sekcja 3 (nie włączaj ponownie, jeśli użytkownik ją wyłączy).
4. Podmień scripts/validate_c1_uoe.py na wersję z paczki (dodatkowo sprawdza rozkład liter A–D) i uruchom go na plikach z paczki. Uruchom npm run validate i testy.
5. Przejdź każdy z 8 nowych zestawów w trybie Nauka i Egzamin: poprawne odpowiedzi = maksimum punktów, kilka błędnych = poprawnie odrzucone. W Part 4 sprawdź alternatywy z parts i liczenie skrótów jako 2 słowa. Zestawy w grupach: Part 1: 8, Part 2: 9, Part 3: 9, Part 4: 13.
6. Sprawdź w Fiszkach: talia ma 60 kart, nowe karty wchodzą do sesji w ramach dziennego limitu, karty z innych talii zachowały stan nauki.

Na końcu: build, validate, testy, zrzuty ekranu (lista ćwiczeń UoE z nowymi zestawami, po jednym zestawie z każdego Partu, uoe-p1-4 z opcjami, ekran talii Certyfikat C1, karta cloze i typed w sesji) w jasnym i ciemnym motywie. Krótka lista zmian. POCZEKAJ NA MOJE "OK". DOPIERO PO MOIM "OK": merge do main i git push (sprawdź, że GitHub Pages się zbudowało, i napisz, co sprawdziłeś).
```
