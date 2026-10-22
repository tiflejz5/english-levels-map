# Specyfikacja 06 – Matura podstawowa i matura rozszerzona

Aktywujemy dwie zakładki, które w poprzedniej paczce (spec 05) były stronami „W trakcie pracy". Wszystko opiera się na **istniejącym generycznym module egzaminu** (loader manifestu, ramki „Na egzaminie ...", odliczanie, trener pisania, silnik zadań). Celem jest **dodanie treści i niewielkich rozszerzeń**, nie nowa architektura.

Moduł certyfikat B2 pozostaje „W trakcie pracy".

## 1. Co się zmienia w rejestrze

`dane/egzaminy-manifest.json` w tej paczce zawiera zaktualizowane wpisy `matura-podstawowa` i `matura-rozszerzona` (status `active`, akcenty kolorystyczne, `suggestedDate`). Podmień odpowiednie wpisy w rejestrze projektu. Nie ruszaj wpisów C1, E8 i B2.

Daty podpowiedzi (do potwierdzenia na cke.gov.pl, źródła nie są spójne):
- matura podstawowa z angielskiego: **6 maja 2027, 9:00**,
- matura rozszerzona z angielskiego: **7 maja 2027, 9:00**.

## 2. Zawartość paczki

```
matura-podstawowa/   manifest.json, powiazania.json, strony/*.md (10), trening/pisanie.json (6 zadań), cwiczenia/ (8 zestawów)
matura-rozszerzona/  manifest.json, powiazania.json, strony/*.md (13), trening/pisanie.json (4 zadania, 2 grupy wyboru), cwiczenia/ (6 zestawów)
dane/egzaminy-manifest.json
scripts/validate_matura.py
```

## 3. Format zestawów ćwiczeń

W modułach występują **dwa formaty**:

1. **Nowy silnik zadań (spec 01 z paczki v2):** pliki z polem `items` (`multiple-choice` w odmianach `function`, `reading`, `listening`, oraz `short-answer`). Zadania czytania mają `passage`, zadania słuchane `script` i `maxPlays` (syntezator mowy, `en-GB`). Pole `fixedOrder: true` oznacza, że opcji nie wolno tasować (np. True / False / Not given, wybór litery A–G).
2. **Silnik zadań C1 (istniejący):** `multiple-choice-cloze`, `word-formation` (`stem` i `accept`) w plikach z polami `text`, `gaps`, `maxScore`. Użyj tych samych komponentów co w Certyfikacie C1, bez zmian w ich zachowaniu.

Zestawy z `topic: null` pojawiają się tylko w modułach egzaminów (i w Centrum ćwiczeń, w grupie „Egzaminy"), nie na stronach tematów.

## 4. Rozszerzenia do zaimplementowania

### 4.1 Trener pisania: grupy wyboru (matura rozszerzona)

Egzamin rozszerzony wymaga **wyboru jednego z dwóch tematów**. W `trening/pisanie.json` zadania mają pole `choiceGroup` (`"A"`, `"B"`), a `choiceGroups` opisuje grupę.

- Widok listy zadań: każda grupa jako karta „Wybierz jedno z dwóch zadań" z dwoma tematami obok siebie.
- Wybór zadania zapisuje się per profil i grupę (można zmienić, jeśli tekst jest pusty).
- Pozostałe zadania (bez `choiceGroup`) działają jak dotąd.

### 4.2 Trener pisania: konfiguracja z pliku

Każdy trener czyta z `pisanie.json`:
- `wordRange`, `targetRange`, `warnBelow`, `timeMinutes`,
- `rubric` (kryteria i maksymalne punkty do samooceny: suwaki lub pola liczbowe, suma pokazana na końcu),
- `tasks[]` z opcjonalnym `opening` (początek podany w poleceniu, niewliczany do limitu), `bullets` (punkty polecenia do odhaczania), `model` (wzór pokazywany po zakończeniu).

Strefy licznika dla poszczególnych egzaminów:

| Moduł | Zakres | Poniżej progu | Wskazówka |
| --- | --- | --- | --- |
| Matura podstawowa | 100–150 | < 80: „oceniana tylko treść" (czerwony) | 80–99 żółty, 100–150 zielony, > 150 żółty |
| Matura rozszerzona | 200–250 | < 160: „oceniana tylko realizacja zadania" (czerwony) | 160–199 żółty, 200–250 zielony, > 250 żółty |

Reguły liczenia wyrazów na maturze CKE nie zostały potwierdzone w źródłach. Zaimplementuj liczenie jak dla E8 (wyrazy rozdzielone spacją, skróty jako 1, liczby i adresy jako 1, podpis XYZ pomijany) i dodaj w trenerze krótką uwagę „liczenie orientacyjne".

### 4.3 Rozbudowa punktacji i oznaczeń w pytaniach „True / False / Not given"

Zadania z `fixedOrder: true` pokazują opcje w podanej kolejności (przyciski w jednym rzędzie).

### 4.4 Strona „Matura ustna"

To zwykła strona Markdown. **Nie** dodawaj nagrywania dźwięku w aplikacji. Strona zachęca do nagrywania telefonem lokalnie. Opcjonalnie (etap 2): prosty **timer ćwiczeń ustnych** (pytanie z listy, odliczanie 60 sekund) bez zapisu dźwięku. Pytania ustne dostarczymy w osobnej partii.

### 4.5 Ramki „Na maturze podstawowej / rozszerzonej"

Mechanizm z paczki v2: każdy moduł ma własny `powiazania.json`. Na stronie tematu mogą się pojawić ramki kilku egzaminów jednocześnie (E8, MP, MR, C1) w kolejności z rejestru, w kolorach egzaminów.

### 4.6 Wyszukiwarka

Indeksuj strony obu modułów w grupie „Egzaminy". Pozostałe zasady bez zmian.

## 5. Klimat wizualny

| Egzamin | Klimat | Sugestia |
| --- | --- | --- |
| Matura podstawowa | spokojny, skupiony, szkolny | głęboki zielony (forest) + ciepły beż/papier, akcent miedziany. Ikonografia: książka, długopis, kartka |
| Matura rozszerzona | ambitny, redakcyjny | granat/indygo + bursztynowy akcent (wyraźnie inny niż granat+złoto C1: użyj chłodniejszego indygo i miedzi) |

Zasady: AA w obu motywach, kolory przez tokeny z `DESIGN.md`, `data-section="matura-podstawowa"` / `"matura-rozszerzona"`.

## 6. Weryfikacja faktów (ważne)

Dane o egzaminach pochodzą z opracowań i informatora CKE (Formuła 2023), źródła w drobiazgach się różnią (np. czy ustna ma 18 czy 30 punktów, układ zadań w rozszerzeniu). Dlatego:
- w aplikacji nie podawaj liczb, których nie ma w paczce,
- na stronach przeglądu zostaw nagłówkowe zastrzeżenie „stan na październik 2026, sprawdź informator CKE" z linkiem,
- w trakcie QA spróbuj otworzyć oficjalny informator CKE (`cke.gov.pl`, dział Egzamin maturalny w Formule 2023, język angielski). Jeśli się uda, porównaj i **zgłoś różnice w podsumowaniu**, nie poprawiaj ich po cichu.

## 7. Kryteria odbioru

- [ ] `/matura-podstawowa` i `/matura-rozszerzona` działają: strony, ćwiczenia, trener pisania, odliczanie, ramki na stronach tematów.
- [ ] Wybór jednego z dwóch zadań działa w trenerze matury rozszerzonej.
- [ ] Zestawy w formacie C1 (cloze, słowotwórstwo) działają w nowych modułach.
- [ ] Strefy licznika są zgodne z tabelą w sekcji 4.2.
- [ ] Zakładka B2 nadal pokazuje „W trakcie pracy".
- [ ] Certyfikat C1 i E8 bez zmian.
- [ ] `python3 scripts/validate_matura.py` (lub odpowiednik w npm) przechodzi, build przechodzi.
