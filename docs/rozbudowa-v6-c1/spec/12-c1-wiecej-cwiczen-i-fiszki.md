# Specyfikacja 12 – Więcej materiału do Certyfikatu C1

Wymaga paczki v5 (zakładka Fiszki, 12 zestawów UoE). Silnik ćwiczeń C1 i silnik fiszek **bez zmian**: tylko nowe dane i jedna poprawka danych.

## 1. Osiem nowych zestawów Use of English (po 2 na Part)

| Part | Format | Zestawy | Punkty |
| --- | --- | --- | --- |
| 1 | multiple-choice-cloze, 8 luk | `uoe-p1-7` The ethics of zoos; `uoe-p1-8` Why we travel | 8 |
| 2 | open-cloze, 8 luk | `uoe-p2-8` The lost art of letter writing; `uoe-p2-9` Why we love lists | 8 |
| 3 | word-formation, 8 luk | `uoe-p3-8` Citizen science; `uoe-p3-9` Fast fashion | 8 |
| 4 | transformation, 6 zdań | `uoe-p4-wyrazenia-idiomatyczne`; `uoe-p4-czas-nierzeczywisty` | 12 |

Po dodaniu (razem z v5): Part 1 – 8 zestawów, Part 2 – 9, Part 3 – 9, Part 4 – 13.

Zastosowanie: skopiuj pliki z `certyfikat-c1/cwiczenia/`, potem `manifest-patch.json` (grupy są w `sections[id="cwiczenia"].exerciseGroups`, dopisz na koniec `sets` w grupie o danym `part`) i `powiazania-patch.json` (dopisz id do `exercises` w `links`).

## 2. Poprawka danych z v5

W `uoe-p1-4`, `uoe-p1-5`, `uoe-p1-6` poprawna odpowiedź była zawsze pod literą **A** (błąd w generatorze). Paczka zawiera poprawione pliki: ta sama treść, opcje przestawione tak, że poprawne litery są rozłożone (każda litera A–D 1–3 razy na zestaw). Pliki **zastępują** dotychczasowe, wpisy w manifeście bez zmian. Zapisane wyniki użytkownika zostają (klucze bez zmian). Walidator sprawdza teraz rozkład liter w każdym zestawie Part 1.

Jeśli silnik C1 nie tasuje opcji, nie dodawaj tasowania (zmiana zachowania wszystkich zestawów). Wystarczą poprawione dane.

## 3. Nowa talia fiszek „Certyfikat C1"

`dane/fiszki/certyfikat-c1.json`, 60 oryginalnych kart w czterech grupach (tag w `tags`):

| Grupa (tag) | Typ | Karty | Do której części egzaminu |
| --- | --- | --- | --- |
| `wyrazenia` – stałe wyrażenia i idiomy | cloze | 25 | Part 1, Part 4 |
| `gramatyka` – inwersja, warunki bez if, czas nierzeczywisty, bezosobowe, emfaza | cloze | 13 | Part 2, Part 4 |
| `przyimki` – przyimki zależne | cloze | 10 | Part 2 |
| `slowotworstwo` | typed | 12 | Part 3 |

Zastosowanie: skopiuj plik do folderu talii, dopisz wpis z `dane/fiszki/index-patch.json` na koniec `decks` w `index.json`. Dla istniejących profili talię **włącz automatycznie jeden raz** (dopisz id do `settings.enabledDecks`, jeśli użytkownik nigdy wcześniej jej nie widział; zapamiętaj to w ustawieniach, żeby wyłączona przez użytkownika talia nie włączała się ponownie). Nie zmieniaj istniejących kart ani stanu nauki.

Opcjonalnie (jeśli na ekranie talii jest miejsce): filtr po tagu, żeby uczyć się tylko np. przyimków. Jeśli wymaga to zmian w kolejce sesji, zgłoś i pomiń.

## 4. Kryteria odbioru

- [ ] 8 nowych zestawów działa w trybie Nauka i Egzamin. Poprawne odpowiedzi dają maksimum, liczby zestawów w grupach: 8 / 9 / 9 / 13.
- [ ] W `uoe-p1-4…6` poprawne odpowiedzi nie są już zawsze pod A, wcześniejsze wyniki nadal widać.
- [ ] Talia „Certyfikat C1" widoczna w Fiszkach, 60 kart, włączona raz automatycznie, nowe karty wchodzą do sesji w ramach dziennego limitu.
- [ ] Walidatory przechodzą: `python3 scripts/validate_c1_uoe.py` (z katalogu paczki) i `python3 scripts/validate_fiszki.py`.
