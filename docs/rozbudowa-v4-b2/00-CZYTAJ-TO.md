# Paczka „Certyfikat B2" – instrukcja dla Claude Code

Aktywuje ostatnią zakładkę egzaminową, **Cambridge B2 First** (`/certyfikat-b2`). Wymaga paczek v2 (moduł egzaminów, silnik zadań) i v3 (matury) oraz istniejącego modułu Certyfikat C1.

## Zawartość

```
00-CZYTAJ-TO.md
spec/09-certyfikat-b2-first.md
dane/egzaminy-manifest.json      wpis certyfikat-b2 do podmiany w rejestrze
certyfikat-b2/                   manifest, powiązania, 14 stron, 2 trenery (Writing, Speaking), 15 zestawów
scripts/validate_b2.py           walidator
scripts/build_*.py               skrypty generujące (zostaw jako narzędzia, nie uruchamiaj w buildzie)
```

## Zasady (obowiązkowe)

1. Gałąź `feature/b2-first`, jeden commit na krok.
2. Nie zmieniaj istniejących kluczy ani formatów localStorage. Nowe dane (np. historia sesji Speaking) w nowych kluczach z `version`, try/catch, w eksporcie/imporcie/resecie.
3. Zmiany w istniejących komponentach muszą być **wstecznie zgodne** (transformacje C1 bez zmian).
4. Bez zewnętrznych CDN. Zgodność z `DESIGN.md`, AA, `prefers-reduced-motion`.
5. Po każdym etapie: build, walidator, zrzuty ekranu, podsumowanie i **czekaj na „OK"**. Merge i push dopiero po ostatnim „OK".
6. Treści oryginalne. Nie kopiuj materiałów Cambridge.
