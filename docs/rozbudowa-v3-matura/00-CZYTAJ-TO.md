# Paczka „Matura v3" – instrukcja dla Claude Code

Aktywuje w aplikacji dwa moduły egzaminów, które w poprzedniej paczce były stronami „W trakcie pracy": **Matura podstawowa** i **Matura rozszerzona** z angielskiego. Certyfikat B2 zostaje „w trakcie pracy".

## Warunki wstępne

Paczka „Rozbudowa v2" (silnik zadań, moduł egzaminów, trener pisania, rejestr egzaminów) jest już w projekcie.

## Zawartość

```
00-CZYTAJ-TO.md
spec/06-matura-podstawowa-i-rozszerzona.md
dane/egzaminy-manifest.json          wpisy MP i MR do podmiany w rejestrze
matura-podstawowa/                   manifest, powiązania, 10 stron, trener pisania (6), 8 zestawów
matura-rozszerzona/                  manifest, powiązania, 13 stron, trener pisania (4 w 2 grupach wyboru), 6 zestawów
scripts/                             walidator i skrypty generujące
```

## Zasady (obowiązkowe)

1. Gałąź `feature/matura`, jeden commit na krok.
2. Nie zmieniaj istniejących kluczy ani formatów localStorage. Nowe dane w nowych kluczach z `version`, try/catch, w eksporcie/imporcie/resecie.
3. Bez zewnętrznych CDN. Zgodność z `DESIGN.md`, AA, `prefers-reduced-motion`.
4. Po każdym etapie: build, walidator, zrzuty ekranu, podsumowanie i **czekaj na „OK"**. Merge i push dopiero po ostatnim „OK".
5. Treści są oryginalne. Nie kopiuj arkuszy CKE ani komercyjnych materiałów.
6. Fakty o egzaminach: patrz sekcja 6 w spec 06.

## Walidator

`python3 scripts/validate_matura.py <katalog_paczki>` sprawdza zestawy (oba formaty), luki i `maxScore`, linki `[[id]]` w stronach, powiązania i liczbę wyrazów modeli wypowiedzi.
