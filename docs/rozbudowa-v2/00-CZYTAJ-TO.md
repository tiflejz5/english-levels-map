# Paczka „Rozbudowa v2" – instrukcja dla Claude Code

Ta paczka zawiera specyfikacje i gotowe dane do czterech rozszerzeń aplikacji English Levels Map:

1. Nowe typy zadań (wybierz formę, ułóż zdanie, znajdź błąd) na końcu tematów.
2. Laboratorium czasów i zestawy mieszane.
3. Automatyczne powtórki błędów, dziennik podejść i statystyki.
4. Wyszukiwarka po aplikacji i własne notatki.
5. Moduł Egzaminy: Egzamin ósmoklasisty + puste zakładki „W trakcie pracy" (Matura podstawowa, Matura rozszerzona, B2).

## Zawartość

```
00-CZYTAJ-TO.md
spec/01-typy-zadan.md
spec/02-laboratorium-czasow-i-mieszane.md
spec/03-powtorki-i-statystyki.md
spec/04-wyszukiwarka-i-notatki.md
spec/05-egzaminy-i-egzamin-osmoklasisty.md
dane/                      cwiczenia-tematy, lab-czasow, lab-wybor-czasu, mixes, egzaminy-manifest
cwiczenia/tematy/          6 zestawów pilotażowych (60 zadań)
egzamin-osmoklasisty/      manifest, powiązania, 10 stron, trener pisania (6 zadań), 5 zestawów ćwiczeń
scripts/                   walidator i skrypty generujące (zostaw jako narzędzia projektu)
```

## Zasady dla wszystkich etapów (obowiązkowe)

1. Pracuj na **gałęzi** (`feature/rozbudowa-v2`), jeden commit na krok.
2. **Nie zmieniaj istniejących kluczy ani formatów localStorage.** Nowe dane w nowych kluczach z polem `version`, każdy dostęp w try/catch, wszystko wchodzi do eksportu, importu i resetu.
3. Bez zewnętrznych CDN. Style i ruch zgodnie z `DESIGN.md` (tokeny, motyw jasny i ciemny, `prefers-reduced-motion`, kontrast AA).
4. Treści po polsku, ton ciepły i konkretny.
5. Po każdym etapie: `npm run build`, walidator, zrzuty ekranu (jasny i ciemny motyw, desktop i telefon), krótkie podsumowanie, a potem **czekaj na „OK" użytkownika**.
6. Merge do `main` i `git push` **dopiero po ostatnim „OK"** (etap 3).
7. Dane z paczki skopiuj do projektu w odpowiednie miejsca (zgodnie z konwencją repo), nie przepisuj ich ręcznie. Treści egzaminu to własne materiały, nie kopiuj z arkuszy CKE ani Cambridge.

## Walidator

`python3 scripts/validate_exercises.py <katalog_paczki>` sprawdza zestawy, mapę tematów, laboratorium, drzewo wyboru, mixy, powiązania i modele wypowiedzi. Zaimplementuj jego odpowiednik w narzędziach projektu (npm script `validate`) albo wywołaj ten skrypt w buildzie.

## Stan treści

Dostarczono pilotaż 6 tematów czasów (A1–B1). Kolejne zestawy trafią w partiach według poziomów w tym samym formacie. Matura i B2 to na razie tylko strony zastępcze.

## Weryfikacja faktów

Informacje o egzaminie ósmoklasisty (format, punktacja, terminy 2027) pochodzą z informatora CKE i komunikatów. Przed udostępnieniem aplikacji innym sprawdź aktualność na cke.gov.pl.
