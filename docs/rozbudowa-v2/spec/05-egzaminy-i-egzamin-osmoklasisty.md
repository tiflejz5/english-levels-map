# Specyfikacja 05 – Moduł Egzaminy: Egzamin ósmoklasisty oraz zakładki „w trakcie pracy"

## 1. Idea

Dotychczasowy moduł „Certyfikat C1" staje się jednym z kilku egzaminów w wspólnej strukturze **Egzaminy**. Każdy egzamin to osobny moduł z własnym manifestem, stronami, ćwiczeniami, trenerami i klimatem wizualnym.

| Egzamin | Route | Status |
| --- | --- | --- |
| Egzamin ósmoklasisty | `/egzamin-osmoklasisty` | **aktywny** (treści w paczce) |
| Matura podstawowa | `/matura-podstawowa` | „W trakcie pracy" (pusta zakładka) |
| Matura rozszerzona | `/matura-rozszerzona` | „W trakcie pracy" (pusta zakładka) |
| Certyfikat B2 (Cambridge B2 First) | `/certyfikat-b2` | „W trakcie pracy" (pusta zakładka) |
| Certyfikat C1 | `/certyfikat-c1` | aktywny, **istniejący, nie zmieniaj routingu ani danych** |

Rejestr egzaminów: `dane/egzaminy-manifest.json`.

## 2. Rejestr i nawigacja

- W lewym panelu (zarówno w wąskim pasku z chipami, jak i rozwiniętym) dodaj grupę **„Egzaminy"** z pozycjami z rejestru, w kolejności: Ósmoklasista, Matura podstawowa, Matura rozszerzona, B2, C1. Chipy w pasku: krótkie kody z rejestru (`E8`, `MP`, `MR`, `B2`, `C1`) w kolorze akcentu egzaminu. Pozycje „w trakcie pracy" są wyszarzone, z małą plakietką „wkrótce", ale klikalne.
- Rejestr jest źródłem prawdy dla etykiet, kodów, kolorów, statusu i opisów. Kod nie powinien mieć twardo wpisanych nazw egzaminów.
- Moduł egzaminu ładuj leniwie (podział kodu).

### 2.1 Strona „W trakcie pracy"

Dla egzaminów o statusie `soon`: ładna strona zastępcza w stylu aplikacji:
- tytuł egzaminu i duża plakietka „W trakcie pracy",
- krótki opis z rejestru (`soonDescription`: co tu będzie),
- prosta ilustracja SVG (np. kompas lub rusztowanie) i zdanie „Pracujemy nad tą zakładką. Wróć wkrótce.",
- przyciski „Wróć do Dziś" i „Zobacz egzamin ósmoklasisty" (jeśli aktywny).
Bez pustych tabel, bez martwych linków, bez fałszywych treści. Aktywacja egzaminu w przyszłości = zmiana `status` na `active` + dodanie jego folderu z treściami (bez zmian w kodzie nawigacji).

## 3. Generyczny moduł egzaminu

Moduł egzaminu to folder zgodny z formatem istniejącego `certyfikat-c1/` (zobacz `manifest.json` C1):

```
<exam-id>/
  manifest.json        # sekcje, strony, grupy ćwiczeń, trenery
  powiazania.json      # ramki „Na egzaminie …" dla stron tematów
  strony/*.md          # treści (frontmatter: id, title, section, order, summary)
  cwiczenia/*.json     # zestawy (nowy format z spec 01, ewentualnie stare typy C1)
  trening/*.json       # trenery (np. pisanie)
```

Wymagania uogólnienia (zrób to bez zmiany zachowania C1):
1. **Loader manifestu** parametryzowany `examId` (route, tytuł, sekcje, strony, grupy ćwiczeń, trenery).
2. **Ramki „Na egzaminie …"** na stronach tematów: obecnie renderowane z `certyfikat-c1/powiazania.json`. Zaimplementuj to dla **wielu egzaminów naraz**: jeśli temat ma powiązania z kilkoma egzaminami, pokaż osobne ramki, każdą w kolorze danego egzaminu, w ustalonej kolejności (z rejestru). Format `powiazania.json` jak w C1 (`itemId`, `examParts`, `note`, `exercises`).
3. **Odliczanie do egzaminu**: użyj istniejącego komponentu (C1) w wersji per egzamin; data ustawiana przez użytkownika, per profil. Podpowiedź domyślnej daty tylko jako placeholder w polu (z rejestru: `suggestedDate`), nie jako zapisana wartość.
4. **Zestawy ćwiczeń egzaminu** używają silnika z spec 01 (`multiple-choice`, `reorder`, `find-error`, `short-answer`, `kind: reading|function|listening`). Grupy ćwiczeń w manifeście egzaminu opisują zestawy (id, plik, tytuł, liczba zadań).
5. **Trener pisania** (`trening/pisanie.json`) działa na silniku istniejącego trenera C1, sparametryzowanym konfiguracją (patrz 5).
6. Wyniki zestawów i wszystkie dane egzaminu w eksporcie/imporcie/resecie.
7. Wyszukiwarka (spec 04) indeksuje strony wszystkich aktywnych egzaminów.

## 4. Klimat wizualny egzaminów

Każdy egzamin ma własny zakres tokenów (atrybut `data-section="<exam-id>"`) nadpisujący akcenty, trzymając się `DESIGN.md`:

| Egzamin | Klimat | Sugestia |
| --- | --- | --- |
| Certyfikat C1 | „egzaminacyjny" granat i złoto (istniejący) | bez zmian |
| Egzamin ósmoklasisty | przyjazny, szkolny, energiczny, bez dziecinności | głęboki turkus + słoneczny żółty akcent, ciepłe tło; ikonografia: zeszyt, ołówek, plecak |
| Matura | poważny, skupiony | (do ustalenia przy aktywacji) |
| B2 First | spokojny, niebieskozielony | (do ustalenia przy aktywacji) |

Kontrast AA w obu motywach (dla żółtego akcentu użyj ciemnego tekstu na żółtym tle).

## 5. Egzamin ósmoklasisty – zawartość paczki

Folder `egzamin-osmoklasisty/` w paczce ma gotowy manifest, strony, powiązania, trener pisania i zestawy ćwiczeń. Struktura:

```
egzamin-osmoklasisty/
  manifest.json
  powiazania.json
  strony/
    przeglad.md
    plan-powtorki.md
    sluchanie.md
    funkcje-jezykowe.md
    czytanie.md
    srodki-jezykowe.md
    wypowiedz-pisemna.md
    gramatyka-pod-egzamin.md
    slownictwo-tematyczne.md
    dzien-egzaminu.md
  trening/pisanie.json
  cwiczenia/*.json         # (zestawy w nowym formacie z spec 01)
```

### 5.1 Fakty o egzaminie (źródło prawdy dla stron i danych)

Zebrane z informatora CKE o egzaminie ósmoklasisty z języka angielskiego (od roku szkolnego 2024/2025) i komunikatów o terminach 2027. **Zanim aplikacja trafi do szerszego grona, zweryfikuj aktualność na stronie CKE** (zmiany w komunikatach bywają). W aplikacji przy datach i formacie umieść notę „stan na październik 2026, sprawdź aktualny komunikat CKE" oraz link do źródeł.

| Element | Wartość |
| --- | --- |
| Czas arkusza | 110 minut (bez przerw), dostosowania mogą wydłużać czas |
| Liczba zadań | 45–55 zadań w 12–15 wiązkach |
| Poziom | A2 (rozumienie ze słuchu i tekstów pisanych wymagają A2+) |
| Wynik | wyrażony w procentach (0–100%), **brak progu zdawalności** |
| Rekrutacja | wynik z języka obcego liczy się do rekrutacji z wagą 0,3 (maks. 30 pkt z 100 za egzamin) – potwierdź w zasadach rekrutacji danego województwa |
| Termin główny 2027 | 10–12 maja 2027, język obcy 12 maja (środa); termin dodatkowy 9–11 czerwca (język obcy 11 czerwca) |
| Wyniki | 6 lipca 2027 (wg komunikatu terminów 2027) |

Części arkusza (udział w wyniku według informatora):

| Część | Zadań | Typy | Udział |
| --- | --- | --- | --- |
| Rozumienie ze słuchu | 12–14 (3–4 wiązki) | wybór wielokrotny, dobieranie, luka, odpowiedzi na pytania | ok. 20–25% |
| Znajomość funkcji językowych | 10–12 (3–4 wiązki) | wybór wielokrotny, dobieranie, luka | ok. 15–20% |
| Rozumienie tekstów pisanych | 12–16 (3–4 wiązki), łącznie do 850 wyrazów | wybór wielokrotny, dobieranie, luka, odpowiedzi na pytania | ok. 25–30% |
| Znajomość środków językowych | 9–12 (3–4 wiązki) | wybór wielokrotny, dobieranie, luka, parafraza, tłumaczenie fragmentów zdań, układanie zdań z elementów leksykalnych | ok. 15–20% |
| Wypowiedź pisemna | 1 zadanie (bez wyboru) | e-mail lub wpis na blogu, 3 podpunkty | ok. 20% |

Wypowiedź pisemna:
- 50–120 wyrazów (nie licząc podanego początku), trzy podpunkty w języku polskim, podany początek.
- 10 pkt: treść 0–4, spójność i logika 0–2, zakres środków językowych 0–2, poprawność środków językowych 0–2.
- Poniżej 40 wyrazów: ocena tylko za treść. 0 pkt za treść = 0 pkt za resztę. 1 pkt za treść = pozostałe kryteria maks. 1 pkt.
- Liczenie wyrazów: wyrazy oddzielone spacją, skróty (don't) = 1 wyraz, wyrazy z dywizem, liczby, adresy e-mail, numery telefonów i skróty = 1 wyraz, emotikony i podpis „XYZ" nie są liczone.

Zadania otwarte:
- Znajomość środków językowych: wymagana pełna poprawność gramatyczna i ortograficzna (wielka/mała litera akceptowana, jeśli nie narusza pisowni nazw własnych).
- Słuchanie, czytanie, funkcje: odpowiedź komunikatywna i zgodna z poleceniem, błędy ortograficzne dopuszczalne, jeśli nie zmieniają znaczenia ani nie utrudniają zrozumienia.

Nagrania: odtwarzane dwukrotnie; całość nagrania z poleceniami i przerwami trwa ok. 20–30 minut.

### 5.2 Trener pisania (E8)

Konfiguracja w `trening/pisanie.json` (pola jak w C1, plus egzaminowe):

- `wordRange: [50, 120]`, `targetRange: [70, 100]`, `warnBelow: 40`, `timeMinutes: 20`,
- licznik słów liczy tokeny rozdzielone spacją według reguł z 5.1 (nie licz podanego początku z `opening`, nie licz emotikon i podpisu „XYZ"),
- **strefy licznika:** poniżej 40 – czerwona z komunikatem „Poniżej 40 wyrazów ocenia się tylko treść", 40–49 – żółta, 50–120 – zielona, powyżej 120 – żółta z komunikatem „Przekraczasz limit",
- lista kontrolna z trzema podpunktami zadania (każdy do odhaczenia) oraz kryteria 4/2/2/2 do samooceny,
- po zakończeniu: wzorcowa odpowiedź (`model`) obok tekstu użytkownika i uwagi,
- zapis szkicu (localStorage, per profil, per zadanie), przycisk „Wyczyść", timer 20 min z przypomnieniem o sprawdzeniu pisowni (brak sprawdzania pisowni w edytorze: `spellcheck="false"`).

### 5.3 Ćwiczenia słuchane (TTS)

Zestaw słuchany używa `kind: "listening"` (spec 01, sekcja 5). Zaznacz w UI, że to trening z głosem syntezowanym.

## 6. Kryteria odbioru etapu

- [ ] Rejestr egzaminów steruje nawigacją (panel, chipy, strony „W trakcie pracy").
- [ ] `/egzamin-osmoklasisty` działa: wszystkie strony, ćwiczenia, trener pisania, odliczanie, ramki „Na egzaminie ósmoklasisty" na stronach tematów.
- [ ] Trzy zakładki „W trakcie pracy" (Matura podstawowa, Matura rozszerzona, B2) wyświetlają stronę zastępczą.
- [ ] Certyfikat C1 działa bez zmian (routing, dane, trenery).
- [ ] Wyszukiwarka znajduje treści egzaminu ósmoklasisty.
- [ ] Walidator obejmuje manifest egzaminu, powiązania (istnienie `itemId`) i zestawy.
