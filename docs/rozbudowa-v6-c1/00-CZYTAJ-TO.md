# Paczka v6 – więcej materiału do Certyfikatu C1

Wymaga paczki v5. Szczegóły: `spec/12-c1-wiecej-cwiczen-i-fiszki.md`.

```
certyfikat-c1/cwiczenia/          8 nowych zestawów + 3 poprawione z v5 (uoe-p1-4…6)
certyfikat-c1/manifest-patch.json
certyfikat-c1/powiazania-patch.json
dane/fiszki/certyfikat-c1.json    nowa talia (60 kart)
dane/fiszki/index-patch.json
scripts/validate_c1_uoe.py        walidator (sprawdza też rozkład liter A–D w Part 1)
scripts/build_*.py                generatory (narzędzia, nie uruchamiać w buildzie)
```

Zasady: osobna gałąź, commit na krok, bez zmian kluczy localStorage, pliki kopiuj (nie przepisuj), zrzuty ekranu i czekaj na „OK", merge i push dopiero po „OK". Treści oryginalne, bez materiałów Cambridge.
