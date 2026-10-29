# Prompty do Claude Code – paczka v6

**Przygotowanie:** rozpakuj `rozbudowa-v6.zip` do `docs/rozbudowa-v6/` w repozytorium, zrób commit „Paczka v6: specyfikacje” na `main` i push. Potem wklejaj prompty po kolei. Po każdym etapie obejrzyj zrzuty i aplikację, a potem wyślij **PROMPT OK** (na dole) – Claude Code zmerguje etap i wypchnie go na GitHub Pages.

Każdy prompt zaczyna się tak samo, żeby Claude Code zawsze miał zasady w kontekście, nawet w nowej sesji.

---

## PROMPT 1 – Nowe typy zadań w silniku ćwiczeń

```
Pracujemy według paczki docs/rozbudowa-v6/. Przeczytaj w całości: docs/rozbudowa-v6/00-CZYTAJ-TO.md (sekcje Zasady i Zasady treści obowiązują w każdym etapie), DESIGN.md, docs/rozbudowa-v2/spec/01-typy-zadan.md oraz docs/rozbudowa-v6/spec/12-nowe-typy-zadan.md. Obejrzyj docs/rozbudowa-v6/przyklady/cwiczenia/v6-pilot-nowe-typy.json i kod: js/exercise-logic.js, js/exercise-engine.js, js/exercise-hub.js, js/c1-exercises.js (ocena Part 4), js/learning-stats.js, tools/waliduj-cwiczenia.js, tools/testy.js.

Gałąź feature/v6-typy-zadan od main, jeden commit na krok.

ETAP 1:
1. Punkty zamiast „1 zadanie = 1 punkt” (spec 12 sekcja 1): maxPoints(item), ocena zwraca points/max, wynik sesji i zapis w punktach, opcjonalne points/max w dzienniku podejść. Najpierw test regresyjny: wynik każdego istniejącego zestawu ze starych typów musi być identyczny przed i po zmianie.
2. Wydziel ocenę transformacji z c1-exercises.js do czystej funkcji współdzielonej. Test: wszystkie istniejące zadania C1 Part 4 dają te same wyniki co przed zmianą (na prawdziwych danych i kilku błędnych odpowiedziach).
3. Logika bez DOM + testy dla pięciu typów: gap-fill, match, transformation, translate, dictation, w tym normalizeSentence (rozwijanie skrótów, przecinki, apostrofy) i porównanie słowo po słowie (brak / zbędne / zamienione).
4. Widoki pięciu typów wg spec 12 sekcja 2 (mysz, dotyk, klawiatura, aria-live, od 360 px, oba motywy). Dyktando przez istniejący moduł syntezatora; bez głosu – „Pomiń” i zadanie nie liczy się do wyniku ani statystyk.
5. Integracje wg sekcji 3: Centrum ćwiczeń i generator mixów (filtr typów, opisy), etykiety w Statystykach, kontekst wpisów w Dzienniku błędów, skróty klawiszowe, działanie w zestawach egzaminów z rejestru.
6. Walidator: przenieś reguły nowych typów z docs/rozbudowa-v6/scripts/validate_v6.py do tools/waliduj-cwiczenia.js.
7. Pięć zestawów pilotażowych (spec 12 sekcja 5): tematy B1–B2 bez zestawów, w każdym przewaga jednego nowego typu, 8–10 zadań, wpisy w dane/cwiczenia-tematy.json. Zadania z v6-pilot-nowe-typy.json możesz wykorzystać w pasujących zestawach (nowe id). Przed commitem subagent-recenzent rozwiązuje zadania bez klucza i zgłasza problemy; popraw je.
8. README (typy zadań, format, punkty), podbij ?v= w index.html.

Na końcu: npm run build, npm run validate, npm test, python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only zadania. Zrzuty ekranu (jasny i ciemny, 1280 i 390 px): każdy nowy typ przed i po sprawdzeniu (poprawnie i błędnie), dyktando bez głosu, podsumowanie zestawu z wynikiem w punktach, Centrum ćwiczeń z nowymi zestawami. Podsumuj krótko (liczba testów, co zmieniło się w ocenie) i POCZEKAJ NA MOJE "OK". Nie rób merge ani push.
```

---

## PROMPT 2 – Pula testu poziomu: 60 pytań

```
Pracujemy według paczki docs/rozbudowa-v6/. Przeczytaj: docs/rozbudowa-v6/00-CZYTAJ-TO.md (Zasady i Zasady treści), docs/rozbudowa-v6/spec/13-test-poziomu-i-testy-koncowe.md sekcja 1, README (sekcja „Szybki test poziomu”), js/learning.js, js/level-test.js, tools/zbuduj-niezbednik.js (część testu poziomu), tools/testy.js i docs/rozbudowa-v6/przyklady/test-poziomu/pytania-przyklad.json.

Gałąź feature/v6-test-poziomu od main, jeden commit na krok.

ETAP 2:
1. Algorytm (spec 13 sekcja 1.3): pickQuestion z opcjonalnymi parametrami – unikanie pytań z poprzedniego podejścia i równowaga umiejętności. Istniejące testy przechodzą bez zmian, dopisz nowe.
2. Widok: passage dla pytań reading, podział wyniku na umiejętności (bez procentów przy próbie < 3), opis „12 pytań, ok. 6 minut”.
3. Build: walidacja skill i passage, ostrzeżenia, podsumowanie poziom × umiejętność (spec 13 sekcja 1.5).
4. Treść: uzupełnij skill w 12 istniejących pytaniach, dodaj 6 pytań z pliku przykładowego i dopisz resztę do 10 na poziom (5 grammar, 3 vocabulary, 2 reading). Pisz poziomami (commit na poziom). itemId tam, gdzie pasuje podstrona. Przed każdym commitem subagent-recenzent rozwiązuje pytania bez klucza; popraw zgłoszenia.
5. README (format pytań, algorytm), podbij ?v=.

Na końcu: npm run build (bez „UWAGA” testu poziomu), npm run validate, npm test, python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only test. Przejdź test 3 razy i pokaż, że pytania się różnią (lista id). Zrzuty: pytanie z tekstem do czytania (desktop i telefon), wynik z podziałem na umiejętności. Podsumuj i POCZEKAJ NA MOJE "OK".
```

---

## PROMPT 3 – Testy końcowe poziomów i znaczki na Szlaku

```
Pracujemy według paczki docs/rozbudowa-v6/. Etap 1 (nowe typy zadań) jest już w main. Przeczytaj: docs/rozbudowa-v6/00-CZYTAJ-TO.md (Zasady i Zasady treści), docs/rozbudowa-v6/spec/13-test-poziomu-i-testy-koncowe.md sekcja 2, docs/rozbudowa-v6/przyklady/testy-poziomow/a1-przyklad.json, js/today.js (Szlak), js/celebrate.js, js/profile-data.js, js/render.js (strona poziomu), js/data-menu.js, js/exercise-engine.js.

Gałąź feature/v6-testy-koncowe od main, jeden commit na krok.

ETAP 3:
1. Losowanie 20 z 30 z proporcjonalną reprezentacją kategorii (czysta funkcja + testy), próg w punktach.
2. Nowy klucz elm_leveltests_v1 w ELM.profileData (eksport, import, reset, usunięcie profilu) + testy importu starego pliku bez klucza.
3. Route #/<poziom>/test: ekran startowy, sesja w trybie Egzamin w istniejącym silniku, wynik z podziałem na kategorie i listą podstron do powtórki, błędy do Dziennika błędów jak w zestawach.
4. Znaczek: Szlak na stronie Dziś, kółka poziomów w lewym panelu, nagłówek strony poziomu; podpowiedź na Dziś przy ≥ 70% „Umiem”; kamień milowy lvl-<poziom>-passed; markActivity.
5. Karta „Test końcowy” na stronach poziomów (pod podsumowaniem).
6. Treść: 6 pul po 30 zadań (niezbednik/testy-poziomow/<poziom>.json), po poziomie na commit. Zadania z a1-przyklad.json wejdą do puli A1. Pokrycie ≥ 70% podstron poziomu, proporcje kategorii jak na liście, typy wg spec 13 sekcja 2.2. Subagent-recenzent rozwiązuje każdą pulę bez klucza przed commitem.
7. Walidator (tools/) dla testów końcowych, build generuje pliki .js ładowane na żądanie; README; ?v=.

Na końcu: build, validate, testy, python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only zadania,testy-koncowe. Zrzuty (oba motywy, desktop i telefon): ekran startowy testu A1, pytanie, wynik zaliczony i niezaliczony, Szlak ze znaczkiem, strona poziomu ze znaczkiem, panel z kółkiem zaliczonego poziomu. Podsumuj i POCZEKAJ NA MOJE "OK".
```

---

## PROMPT 4 – Słowniczek osobisty („Moje słowa”)

```
Pracujemy według paczki docs/rozbudowa-v6/. Przeczytaj: docs/rozbudowa-v6/00-CZYTAJ-TO.md (Zasady), docs/rozbudowa-v6/spec/14-slowniczek-osobisty.md, docs/rozbudowa-v5/spec/10-fiszki.md (sekcje 2, 4, 5.3–5.5), js/fiszki.js (zaznaczanie tekstu: selectionText, openFromSelection, updateSelButton), js/fiszki-logic.js (normalizacja userCards i userDecks), js/profiles.js (Ustawienia nauki).

Gałąź feature/v6-slowniczek od main, jeden commit na krok. Rozszerzasz istniejący mechanizm zaznaczania – nie dubluj go.

ETAP 4:
1. Czyste funkcje + testy: extractSentence, makeCloze, wykrywanie polskiego (spec 14 sekcja 3.4), klucz deduplikacji, normalizacja nowych pól karty (word, source, addedAt, examples) przy zapisie i imporcie.
2. Talia systemowa u-moje-slowa (system: "words"), domyślnie włączona; zachowanie nowych pól w fiszki-logic.js bez zmiany wersji klucza.
3. Menu przy zaznaczeniu: „Do Moich słów” i „Utwórz fiszkę…”, skrót M i dotychczasowy Ctrl/Cmd+Shift+F, toast z „Dodaj znaczenie” i „Cofnij”, duplikaty i „Dodaj drugi przykład”, pozycja pod zaznaczeniem na telefonie, ustawienie w Ustawieniach nauki.
4. Zasięg zaznaczania wg spec 14 sekcja 2 (podstrony, podsumowania, egzaminy, C1, Laboratorium, teksty i transkrypty po sprawdzeniu).
5. Karta bez tłumaczenia: podpowiedź pierwszej litery; tył z przykładami.
6. Widok #/fiszki/moje-slowa (sekcja 5), kafelek na stronie Fiszki, skrót w wyszukiwarce, liczba w Statystykach.
7. Opcjonalne podkreślanie zapisanych słów (sekcja 6), domyślnie wyłączone.
8. README, ?v=.

Na końcu: build, validate, testy. Przejdź ręcznie: dodaj 5 słów z różnych miejsc (podstrona, strona egzaminu, Laboratorium, tekst czytania po sprawdzeniu), jedno dwa razy, jedno z polskiego tekstu (ma być tylko „Utwórz fiszkę…”), uzupełnij znaczenie, zrób sesję fiszek, eksport i import. Zrzuty (oba motywy, desktop i telefon): menu przy zaznaczeniu, toast, karta w sesji (z tłumaczeniem i bez), widok Moje słowa, stan pusty. Podsumuj i POCZEKAJ NA MOJE "OK".
```

---

## PROMPT 5 – Talie tematyczne i egzaminacyjne

```
Pracujemy według paczki docs/rozbudowa-v6/. Przeczytaj: docs/rozbudowa-v6/00-CZYTAJ-TO.md (Zasady i Zasady treści), docs/rozbudowa-v6/spec/15-talie-tematyczne-i-egzaminacyjne.md, docs/rozbudowa-v5/spec/10-fiszki.md (sekcje 2 i 6), wszystkie istniejące talie w dane/fiszki/ (żeby nie dublować kart), wzory docs/rozbudowa-v6/przyklady/fiszki/*.json, js/fiszki.js (przeglądanie talii), js/exam-core.js i js/c1-core.js (strony startowe egzaminów).

Gałąź feature/v6-talie od main, jeden commit na krok.

ETAP 5:
1. Chipy egzaminów z tagów kart (e8, mp, mr, matura, b2, c1) na przodzie i tyle karty, z tekstem dostępnym i podpowiedzią „przydatne na”, filtr „Egzamin” w przeglądaniu kart. Działa też dla istniejących kart z tagami.
2. Kafelek „Fiszki do egzaminu” na stronach startowych E8, MP, MR, B2, C1 (mapowanie w spec 15 sekcja 4) z „Włącz i ucz się”.
3. Link do talii tematycznych pod kategorią Słownictwo na stronach A1–B1; skróty talii w wyszukiwarce.
4. Treść: 7 talii tematycznych (30–40 kart, od A1 do B1, ok. 60% typed / 40% cloze) i 3 egzaminacyjne (40 / 50 / 50 kart). Karty z plików przykładowych wchodzą do talii temat-dom i egz-e8. Jedna talia = jeden commit. Wpisy w dane/fiszki/index.json z prawdziwym count, wszystkie nowe talie domyślnie wyłączone. Przed commitem subagent-recenzent sprawdza: poprawność angielskiego, warianty w accepted, poziom, duplikaty z innymi taliami.
5. Walidator w tools/waliduj-fiszki.js wg spec 15 sekcja 5; README; ?v=.

Na końcu: build, validate, testy, python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only fiszki (0 błędów; ostrzeżenia o duplikatach przejrzyj i usuń prawdziwe duplikaty). Zrzuty: lista talii, karta z chipami E8 · MP (przód i tył), filtr egzaminu, kafelek na stronie matury, link na stronie A2. Podsumuj (liczby kart na talię) i POCZEKAJ NA MOJE "OK".
```

---

## PROMPT 6 – Ściągi do druku

```
Pracujemy według paczki docs/rozbudowa-v6/. Przeczytaj: docs/rozbudowa-v6/00-CZYTAJ-TO.md (Zasady i Zasady treści), docs/rozbudowa-v6/spec/16-sciagi-i-zycie-i-egzamin.md sekcja 1, docs/rozbudowa-v6/przyklady/sciagi/a2-przyklad.md, wszystkie podstrony i podsumowania jednego poziomu (żeby zobaczyć, z czego robić ściągę), tools/zbuduj-niezbednik.js, js/niezbednik.js, css/style.css (tokeny), js/markdown.js (co renderer obsługuje – np. nie ma ~~przekreślenia~~).

Gałąź feature/v6-sciagi od main, jeden commit na krok.

ETAP 6:
1. Globalne style druku dla stron treści (spec 16 sekcja 1.3), w tym odpowiedzi na końcu wydruku.
2. Route #/<poziom>/sciaga, karta „Ściąga” na stronie poziomu, przycisk Drukuj, build ściąg do niezbednik-dane.js, wyszukiwarka.
3. Układ druku ściągi: dwie kolumny, nagłówek z kodem poziomu, tabele bez przewijania.
4. Skrypt tools/sciagi-pdf.js (headless Chromium, np. npx playwright) – drukuje każdą ściągę do PDF i sprawdza 1 stronę A4. Narzędzie deweloperskie, nie w npm run build.
5. Treść: 6 ściąg (A2 z pliku przykładowego), treść wyłącznie z podstron danego poziomu. Gdy PDF ma 2 strony – skracaj treść, nie zmniejszaj kroju poniżej 9,5 pt. Subagent-recenzent sprawdza poprawność i zgodność z podstronami.
6. README, ?v=.

Na końcu: build, validate, testy, node tools/kontrast.js, python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only sciagi, raport z tools/sciagi-pdf.js (6 × 1 strona). Dołącz PDF-y wszystkich ściąg (np. w tmp/, poza repo) i zrzuty: ściąga na ekranie (oba motywy, telefon), podgląd wydruku podstrony z odpowiedziami. Podsumuj i POCZEKAJ NA MOJE "OK".
```

---

## PROMPT 7 – Sekcje „Życie i egzamin” na 110 podstronach

```
Pracujemy według paczki docs/rozbudowa-v6/. Przeczytaj: docs/rozbudowa-v6/00-CZYTAJ-TO.md (Zasady i Zasady treści), docs/rozbudowa-v6/spec/16-sciagi-i-zycie-i-egzamin.md sekcja 2, docs/rozbudowa-v6/przyklady/zycie-i-egzamin-przyklad.md, js/callouts.js, DESIGN.md sekcja 3.7, dane/egzaminy-manifest.json oraz strony egzaminów o środkach językowych (żeby typy zadań „w stylu” pasowały do egzaminów).

Gałąź feature/v6-zycie-i-egzamin od main, jeden commit na krok.

ETAP 7:
1. Callout real-exam w CALLOUT_RULES i CSS (oba motywy, kontrast AA), chipy egzaminów w trzeciej kolumnie (kolor z rejestru + tekst, link do egzaminu), widok kart zamiast tabeli na telefonie.
2. Walidator sekcji w tools/ (reguły z validate_v6.py, część „zycie”).
3. Treść: sekcja na każdej ze 110 podstron, w miejscu wskazanym w spec 16 sekcja 2.2, 3–4 wiersze, kody dozwolone dla poziomu. Present Perfect (A2) z pliku przykładowego. Jeden poziom = jeden commit. Nie zmieniaj innych sekcji podstron. Subagent-recenzent po każdym poziomie: poprawność, naturalność zdań „z życia”, czy zadanie „w stylu” pasuje do kodu egzaminu i ma jedną poprawną odpowiedź.
4. Przebuduj dane (node tools/zbuduj-niezbednik.js), README, ?v=.

Na końcu: build, validate, testy, node tools/kontrast.js, python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only zycie (0 błędów). Zrzuty: sekcja na podstronie A1, B2 i C2 (oba motywy, desktop i telefon). Podsumuj i POCZEKAJ NA MOJE "OK".
```

---

## PROMPT 8 – Wzorcowe wypracowania z komentarzami

```
Pracujemy według paczki docs/rozbudowa-v6/. Przeczytaj: docs/rozbudowa-v6/00-CZYTAJ-TO.md (Zasady i Zasady treści), docs/rozbudowa-v6/spec/17-pisanie-wzorce-i-zwroty.md sekcje 1, 3 i 4, docs/rozbudowa-v6/przyklady/pisanie/mr-essay-phones-komentarze.json, wszystkie pliki niezbednik/*/trening/pisanie.json, js/writing-trainer.js, js/c1-writing.js, js/exam-core.js, js/sidebar.js.

Gałąź feature/v6-wzorce od main, jeden commit na krok.

ETAP 8:
1. Sekcja Pisanie: pozycja w lewym panelu, #/pisanie (lista wzorców), wyszukiwarka.
2. Widok #/pisanie/wzorce/<egzamin>/<id>: komentarze na marginesie (≥ 1024 px) i rozwijane (węższe ekrany), filtry typów, „Ukryj komentarze”, legenda, „Dlaczego to działa”, klawiatura i aria, druk z przypisami. Jeśli etap 4 jest w main – zaznaczanie tekstu działa tu ze Słowniczkiem.
3. Linki z trenerów pisania i ze stron „Wypowiedź pisemna”/„Writing” (bez edycji .md).
4. Treść: modelNotes dla 23 istniejących wzorców (komentarze do essay-phones z pliku przykładowego), kryteria Cambridge w pisanie.json C1, min. 5 nowych wzorców C1 (220–260 słów) z komentarzami. Jeden egzamin = jeden commit. Tekstów `model` nie zmieniaj (kotwice muszą pasować). Subagent-recenzent sprawdza, czy komentarze są trafne i uczciwe (komentarz „uwaga” pokazuje realną słabość).
5. Walidator w tools/ (część „wzorce”), README, ?v=.

Na końcu: build, validate, testy, python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only wzorce. Zrzuty: rozprawka MR na 1280 px (komentarze na marginesie) i 390 px (rozwinięty komentarz), filtr „tylko łączniki”, wzorzec C1, oba motywy, podgląd wydruku. Podsumuj i POCZEKAJ NA MOJE "OK".
```

---

## PROMPT 9 – Bank zwrotów i panel w trenerze pisania

```
Pracujemy według paczki docs/rozbudowa-v6/. Etap 8 (sekcja Pisanie) jest w main. Przeczytaj: docs/rozbudowa-v6/00-CZYTAJ-TO.md (Zasady i Zasady treści), docs/rozbudowa-v6/spec/17-pisanie-wzorce-i-zwroty.md sekcje 2–4, docs/rozbudowa-v6/przyklady/pisanie/zwroty-przyklad.json, js/writing-trainer.js, js/profile-data.js, js/data-menu.js.

Gałąź feature/v6-zwroty od main, jeden commit na krok.

ETAP 9:
1. Dane dane/pisanie/zwroty.json → build do pliku .js ładowanego na żądanie; walidator w tools/ (część „zwroty”).
2. Widok #/pisanie/zwroty: filtry (poziom z „do mojego poziomu”, rejestr, gatunek), wyszukiwanie z polskimi znakami i bez, grupy z kotwicami i spisem, Kopiuj, „Do Moich słów” (jeśli etap 4 jest w main), ulubione.
3. Klucz elm_phrases_v1 (ulubione) w ELM.profileData: eksport, import, reset.
4. Panel „Zwroty” w trenerze pisania wszystkich egzaminów: filtr po gatunku i poziomie egzaminu, Wstaw w miejscu kursora (setRangeText, fokus wraca do pola, Ctrl+Z działa).
5. Treść: min. 14 grup, 8–14 zwrotów w grupie, 140–180 razem (grupy z pliku przykładowego wchodzą). Subagent-recenzent: poprawność, naturalność, trafność poziomu i rejestru.
6. README, ?v=.

Na końcu: build, validate, testy, python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only zwroty. Zrzuty: bank z filtrami (desktop i telefon, oba motywy), rozwinięty zwrot z przykładem, panel w trenerze matury rozszerzonej po wstawieniu frazy. Podsumuj i POCZEKAJ NA MOJE "OK".
```

---

## PROMPT 10 – Karty do mówienia z losowaniem i nagrywaniem

```
Pracujemy według paczki docs/rozbudowa-v6/. Przeczytaj: docs/rozbudowa-v6/00-CZYTAJ-TO.md (Zasady i Zasady treści), docs/rozbudowa-v6/spec/18-trener-mowienia.md, wzory docs/rozbudowa-v6/przyklady/mowienie/*.json, js/speaking-trainer.js, js/c1-speaking.js, niezbednik/certyfikat-b2/trening/mowienie.json, niezbednik/matura-podstawowa/strony/matura-ustna.md, manifesty MP, MR, E8 i B2, js/profile-data.js (elm_speaking_v1).

Gałąź feature/v6-mowienie od main, jeden commit na krok.

ETAP 10:
1. Wspólny js/recorder.js wydzielony z c1-speaking.js (C1 działa bez zmian – sprawdź), z nagrywaniem razem z timerem, do 3 prób na kartę, pobieraniem i obsługą braku mikrofonu. Nic nie trafia do localStorage ani sieci.
2. Losowanie bez powtórek z opcjonalnym polem seen w elm_speaking_v1 (zgodność ze starym zapisem, test), „Egzaminator czyta” przez syntezator.
3. speaking-trainer.js obsługuje formaty "matura" i "simple" oraz dotychczasowy B2; tryb „Cały egzamin” dla matury i B2.
4. Matura: trening/mowienie.json w MP, wpis w manifeście MP, link w MR i na końcu strony „Matura ustna”. Czasy opisane jako orientacyjne, bez punktacji CKE.
5. E8: trening dodatkowy „Mówienie A2” z wyraźną informacją, że egzamin nie ma części ustnej.
6. Treść: matura (10 grup rozmowy wstępnej, po 12 kart w zadaniach 1–3, obszary z podstawy programowej), B2 (pula wg spec 18 sekcja 4, id dla istniejących kart), E8 (24 karty, po 8 każdego rodzaju). Karty z plików przykładowych wchodzą. Jeden egzamin = jeden commit. Subagent-recenzent: poprawność, poziom, czy karty da się zrealizować w podanym czasie.
7. Walidator w tools/ (część „mowienie”), README (format, elm_speaking_v1.seen), ?v=.

Na końcu: build, validate, testy, python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only mowienie. Zrzuty (oba motywy, desktop i telefon): matura – rozmowa z odgrywaniem roli z kwestiami egzaminatora, opis ilustracji, wybór; nagrywanie w trakcie i po (odtwarzacz, 2 próby); odmowa mikrofonu; „Cały egzamin”; karta E8 z informacją. Podsumuj i POCZEKAJ NA MOJE "OK".
```

---

## PROMPT 11 – Kontrola końcowa

```
Wszystkie etapy paczki docs/rozbudowa-v6/ są w main. Zrób kontrolę końcową na gałęzi feature/v6-kontrola.

1. python3 docs/rozbudowa-v6/scripts/validate_v6.py . (całość, 0 błędów) i wepnij pełny walidator v6 (tools/) do npm run validate i npm run build bez --only.
2. npm run build, npm run validate, npm test, node tools/kontrast.js, tools/sciagi-pdf.js.
3. Regresje: zestaw starego typu, C1 Part 4, test poziomu, fiszki (sesja, eksport, import), Dziennik błędów, Statystyki, trener C1 z nagrywaniem, eksport → reset → import przywraca wszystko (także elm_leveltests_v1, elm_phrases_v1, Moje słowa, seen).
4. Przejdź aplikację na 360, 768 i 1280 px w obu motywach: brak poziomego przewijania, fokus widoczny, cele ≥ 44 px, prefers-reduced-motion.
5. Rozmiar: sprawdź, czy nowe dane ładują się na żądanie, a startowy zestaw skryptów nie urósł o więcej niż kilkanaście kB.
6. README: spis nowych adresów, kluczy i plików danych; DESIGN.md: nowe komponenty (callout real-exam, komentarze na marginesie, chipy egzaminów, znaczek poziomu, menu zaznaczenia).
7. Raport: lista poprawek, czego nie dało się zrobić i dlaczego.

Zrzuty: strona Dziś ze znaczkiem, podstrona z „Życie i egzamin”, Pisanie, Moje słowa, trener matury ustnej. POCZEKAJ NA MOJE "OK", potem merge i push.
```

---

## PROMPT OK – po obejrzeniu etapu

```
OK. Zmerguj gałąź tego etapu do main (bez squash), uruchom jeszcze raz npm run build i npm test na main, zrób push i podaj hash commita. Usuń lokalną gałąź etapu.
```

Gdy coś trzeba poprawić, zamiast „OK” opisz po prostu, co nie gra – Claude Code poprawi na tej samej gałęzi i znów poczeka.
