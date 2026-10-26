# Paczka v5 – Fiszki (active recall) i 12 nowych zestawów Use of English C1

## Zawartość

```
00-CZYTAJ-TO.md
spec/10-fiszki.md                       specyfikacja zakładki Fiszki
spec/11-c1-uoe-dodatkowe-zestawy.md     jak dodać 12 zestawów do Certyfikatu C1
dane/fiszki/index.json                  lista talii
dane/fiszki/*.json                      6 talii startowych (162 karty, oryginalne)
dane/fiszki/scheduler-vectors.json      wektory testowe harmonogramu (7 scenariuszy)
certyfikat-c1/cwiczenia/*.json          12 nowych zestawów Use of English
certyfikat-c1/manifest-patch.json       co dopisać do manifest.json C1
certyfikat-c1/powiazania-patch.json     co dopisać do powiazania.json C1
scripts/scheduler_ref.py                implementacja referencyjna harmonogramu (generuje wektory)
scripts/validate_fiszki.py              walidator talii
scripts/validate_c1_uoe.py              walidator nowych zestawów C1
scripts/build_*.py                      skrypty generujące (narzędzia, nie uruchamiać w buildzie)
```

## Zasady (obowiązkowe)

1. Gałęzie: `feature/fiszki` (etap 1) i `feature/c1-uoe-plus` (etap 2) albo jedna wspólna, jeśli użytkownik tak zdecyduje. Jeden commit na krok.
2. Nie zmieniaj istniejących kluczy ani formatów localStorage. Fiszki: nowy klucz `elm.<profileId>.fiszki` z `version`, try/catch, w eksporcie/imporcie/resecie.
3. Bez zewnętrznych CDN. Zgodność z `DESIGN.md`, AA, `prefers-reduced-motion`.
4. Pliki z paczki kopiuj, nie przepisuj ręcznie. Zestawy C1 dodawaj przez patche, bez zmian w istniejących wpisach.
5. Po każdym etapie: build, walidator, testy, zrzuty ekranu, podsumowanie i **czekaj na „OK"**. Merge i push dopiero po ostatnim „OK".
6. Treści są oryginalne. Nie dodawaj materiałów Cambridge ani CKE.

## Walidacja przed oddaniem

```
python3 scripts/validate_fiszki.py      # talie + wektory
python3 scripts/validate_c1_uoe.py      # 12 zestawów C1
python3 scripts/scheduler_ref.py        # odtwarza wektory (porównaj z dane/fiszki/scheduler-vectors.json)
```
