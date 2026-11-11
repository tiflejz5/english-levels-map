# Paczka v7 – Szlak nauki i poprawki przed startem

Cel: publiczny start pod koniec grudnia 2026, bez kont (dane w przeglądarce).

```
spec/13-szlak.md                    ścieżka nauki A1 → C2 (Szlak)
spec/14-poprawki-przed-startem.md   6 poprawek z przeglądu aplikacji
szlak/szlak.json                    118 przystanków + 24 powtórki + odnogi egzaminów
szlak/quizy/a1/*.json, a2/*.json    42 quizy przystanków (po 4 pytania)
scripts/build_szlak.py, quizy.py    generator (narzędzie, nie uruchamiać w buildzie)
scripts/validate_szlak.py           walidator: pokrycie checklisty, strony, quizy
```

Walidacja: `python3 scripts/validate_szlak.py niezbednik/index.json`.

Zasady: gałąź `feature/szlak-v7`, commit na krok, bez zmian istniejących kluczy localStorage (nowy klucz `elm.<id>.szlak` z `version`, w eksporcie/imporcie/resecie), bez zewnętrznych CDN, zgodność z DESIGN.md, AA, `prefers-reduced-motion`. Pliki kopiuj, nie przepisuj. Po każdym etapie: build, validate, testy, zrzuty ekranu i **czekaj na „OK”**. Merge i push dopiero po ostatnim „OK”.
