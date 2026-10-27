# Specyfikacja 11 – Dodatkowe zestawy Use of English w Certyfikacie C1

## 1. Co dodajemy

12 nowych zestawów (po 3 na każdy Part 1–4) do istniejącej sekcji ćwiczeń Use of English w module Certyfikat C1. **Żadnych zmian w silniku ćwiczeń C1**: formaty `multiple-choice-cloze`, `open-cloze`, `word-formation`, `transformation` są identyczne jak w istniejących zestawach (pole `wordLimit` nie jest potrzebne, obowiązuje domyślne 3–6 wyrazów).

| Part | Format | Nowe zestawy (id: temat) | Punkty |
| --- | --- | --- | --- |
| 1 | multiple-choice-cloze, 8 luk | `uoe-p1-4` The return of vinyl; `uoe-p1-5` Urban green spaces; `uoe-p1-6` Learning from failure | 8 |
| 2 | open-cloze, 8 luk | `uoe-p2-5` The smell of memory; `uoe-p2-6` Island communities; `uoe-p2-7` The case for boredom | 8 |
| 3 | word-formation, 8 luk | `uoe-p3-5` AI in the classroom; `uoe-p3-6` Urban farming; `uoe-p3-7` A short history of coffee | 8 |
| 4 | transformation, 6 zdań | `uoe-p4-wzorce-czasownikowe`; `uoe-p4-czasowniki-frazowe`; `uoe-p4-spojniki-przyczyna` | 12 (2 pkt za zdanie, części A/B) |

Po dodaniu w module będzie: Part 1 – 6 zestawów, Part 2 – 7, Part 3 – 7, Part 4 – 11 (dotychczas odpowiednio 3, 4, 4, 8).

## 2. Jak zastosować (bez przepisywania ręcznego)

1. Skopiuj pliki z `certyfikat-c1/cwiczenia/` do folderu `cwiczenia/` modułu Certyfikat C1 w projekcie (tam, gdzie leżą istniejące `uoe-p1-1.json` itd.).
2. **`manifest-patch.json`**: dla każdego klucza `addSets` ("1"–"4") znajdź w `certyfikat-c1/manifest.json` grupę ćwiczeń (`exerciseGroups`) o `part` równym kluczowi i **dopisz wpisy na końcu** jej listy `sets`. Nie zmieniaj istniejących wpisów ani kolejności. Jeśli struktura manifestu różni się od opisanej (np. inne nazwy pól), dostosuj do niej i zgłoś to w podsumowaniu.
3. **`powiazania-patch.json`**: dla każdego `itemId` znajdź wpis w `certyfikat-c1/powiazania.json` i dopisz podane id do tablicy ćwiczeń (bez usuwania istniejących). Brak wpisu = pomiń i zgłoś.
4. Uruchom walidator `scripts/validate_c1_uoe.py` (dodaj go do `npm run validate`, jeśli istniejący walidator C1 nie sprawdza tych samych reguł) oraz istniejące walidatory.

## 3. Reguły jakości zestawów (sprawdza walidator)

- Part 1, 2, 3: dokładnie 8 luk, numeracja 1–8, `maxScore` = 8.
- Part 1: cztery opcje A–D, jedna poprawna. Part 2: odpowiedź to jeden wyraz (akceptowane warianty w `accept`), wielkość liter bez znaczenia. Part 3: wyraz podstawowy w nawiasie różni się od odpowiedzi, `accept` nie zawiera samego wyrazu podstawowego.
- Part 4: 6 zdań, `maxScore` = 12, odpowiedź modelowa 3–6 wyrazów łącznie ze słowem kluczowym (skróty typu *don't* liczone jako 2 wyrazy), słowo kluczowe nie może być zmienione i nie występuje w zdaniu uzupełnianym, alternatywne poprawne odpowiedzi w `parts`.
- Każda luka i każde zdanie ma polskie wyjaśnienie (`explanation`).

## 4. Powiązania z niezbednikiem

Wskazane w `powiazania-patch.json` zestawy pojawią się w ramkach „Na egzaminie C1" przy temacie (gerund/infinitive, przyczyna i przeciwieństwo, słownictwo B2 i C1). Dzięki temu „Sprawdź się" z tematu kieruje do nowych zestawów.

## 5. Kryteria odbioru

- [ ] 12 zestawów otwiera się z listy ćwiczeń Use of English (Part 1–4), każdy w swoim silniku, tryby Nauka i Egzamin działają.
- [ ] Wyniki zapisują się w istniejącym mechanizmie (najlepszy i ostatni wynik), bez zmiany kluczy localStorage.
- [ ] Istniejące zestawy C1 działają bez zmian (transformacje 3–6 wyrazów).
- [ ] Walidatory przechodzą. Liczba zestawów w grupach: 6 / 7 / 7 / 11.
