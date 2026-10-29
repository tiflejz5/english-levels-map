# Specyfikacja 17 – Wzorcowe wypracowania z komentarzem i bank zwrotów

Nowa sekcja **Pisanie** (`#/pisanie`) z dwoma częściami: wzorcowe teksty z komentarzami na marginesie oraz bank zwrotów pogrupowany według funkcji. Obie wpinają się w istniejące trenery pisania egzaminów.

## 1. Wzorcowe wypracowania z komentarzem

### 1.1 Skąd teksty

Trenery pisania mają już wzorce (`model`) w `niezbednik/<egzamin>/trening/pisanie.json`:

| Egzamin | Zadań z `model` | Do zrobienia |
| --- | --- | --- |
| E8 | 6 | komentarze |
| Matura podstawowa | 6 | komentarze |
| Matura rozszerzona | 4 | komentarze |
| B2 First | 7 | komentarze |
| C1 Advanced | 0 z 8 | **napisać wzorce** (min. essay ×2, report, proposal, review) + komentarze |

Komentarze dopisujemy **przy zadaniu** (ten sam plik, nowe opcjonalne pola), żeby kotwice nie rozjechały się z tekstem. Wzór pełnego zestawu komentarzy do istniejącej rozprawki z matury rozszerzonej: `przyklady/pisanie/mr-essay-phones-komentarze.json`.

### 1.2 Format

```json
{
  "id": "essay-phones",
  "model": "…bez zmian…",
  "modelNotes": {
    "summary": ["3–5 zdań po polsku: dlaczego ten tekst dostaje wysoką ocenę"],
    "annotations": [
      {
        "anchor": "In my opinion, a complete ban is not the best solution",
        "type": "punkty",
        "criterion": "realizacja",
        "element": 3,
        "note": "Stanowisko już we wstępie – element 3 polecenia jest zrealizowany od początku, a zakończenie go potwierdza."
      }
    ]
  }
}
```

- `anchor`: **dokładny fragment** `model` (3–15 słów), występujący w nim **dokładnie raz**. Kotwice się nie nakładają.
- `type` (steruje ikoną i filtrem):

| `type` | Etykieta | Co komentuje |
| --- | --- | --- |
| `punkty` | Realizacja polecenia | który element polecenia / punkt treści realizuje fragment (`element` = numer z polecenia, opcjonalnie) |
| `lacznik` | Łącznik | spójnik, wyrażenie spójności, przejście między akapitami |
| `rejestr` | Rejestr | formalność, ton, forma grzecznościowa, czego unikać w tym gatunku |
| `struktura` | Kompozycja | rola akapitu, wstęp, zakończenie, zdanie tematyczne |
| `zakres` | Zakres językowy | struktura lub słownictwo, które podnosi ocenę za zakres |
| `uwaga` | Do poprawy | co można by zrobić lepiej (uczciwie, min. 1 na tekst) |

- `criterion`: id kryterium z `rubric` danego pliku (C1 nie ma `rubric` – dodaj kryteria Cambridge: `content`, `communicative`, `organisation`, `language`, jak w B2).
- `note`: po polsku, 1–2 zdania, maks. 220 znaków.
- Liczba komentarzy: E8 i MP 6–9, MR/B2 8–12, C1 10–14. Każdy tekst ma co najmniej 1 komentarz każdego z sześciu typów (w tekstach nieformalnych komentarz `rejestr` opisuje, co czyni ton nieformalnym).
- Nowe wzorce C1: oryginalne, liczba słów w zakresie 220–260 (licz tak jak trener C1), tematy z istniejących zadań C1.

### 1.3 Widok tekstu z komentarzami

Route `#/pisanie/wzorce/<egzamin>/<id zadania>`.

- Nagłówek: egzamin (chip w kolorze egzaminu), gatunek, polecenie (zwijane), liczba słów („214 słów · wymagane 200–250”).
- **Komputer (≥ 1024 px)**: tekst w kolumnie ~65 znaków, komentarze w prawym marginesie wyrównane do wysokości kotwic (jak komentarze w edytorze tekstu); przy kolizji komentarze przesuwają się w dół i są połączone cienką linią z kotwicą.
- **Telefon i tablet**: kotwica ma numer w kółku; dotknięcie rozwija komentarz pod akapitem (akordeon), drugi raz zwija.
- Kotwica: delikatne podkreślenie/tło w kolorze typu + numer; kolor nigdy nie jest jedynym nośnikiem (numer + ikona typu w komentarzu).
- Pasek filtrów: przełączniki typów (np. tylko „Łącznik”), „Ukryj komentarze” (czysty tekst do przeczytania), legenda.
- Pod tekstem: „Dlaczego to działa” (`summary`) i tabela kryteriów z liczbą komentarzy do każdego.
- Klawiatura: Tab przechodzi po kotwicach, Enter pokazuje komentarz, `aria-describedby` łączy kotwicę z komentarzem.
- Zaznaczanie tekstu → menu Słowniczka (spec 14). Druk: tekst z komentarzami jako przypisy numerowane pod tekstem.

### 1.4 Gdzie linki

- `#/pisanie` → lista wzorców pogrupowana po egzaminie i gatunku (karta: tytuł, gatunek, liczba słów, liczba komentarzy).
- Trener pisania (`js/writing-trainer.js`): w zadaniu z `modelNotes` zamiast/obok obecnego pokazania wzorca link „Wzorzec z komentarzami”. Dotychczasowe pokazywanie `model` zostaje.
- Strony „Wypowiedź pisemna” / „Writing” egzaminów: sekcja „Wzorce z komentarzami” z linkami (dodawana przez kod na podstawie danych, bez edycji `.md`).

## 2. Bank zwrotów do pisania

### 2.1 Dane

`dane/pisanie/zwroty.json` (wzór: `przyklady/pisanie/zwroty-przyklad.json`), build do `dane/pisanie/zwroty-dane.js` ładowanego na żądanie (jak talie).

```json
{
  "version": 1,
  "groups": [
    {
      "id": "opinia",
      "label": "Wyrażanie opinii",
      "description": "Jak powiedzieć, co myślisz – od prostego do formalnego.",
      "genres": ["essay", "article", "forum", "blog", "letter"],
      "phrases": [
        { "id": "opinia-01", "en": "In my opinion, …", "pl": "Moim zdaniem…", "level": "B1", "register": "neutral" },
        { "id": "opinia-05", "en": "I am firmly convinced that …", "pl": "Jestem głęboko przekonany, że…", "level": "B2", "register": "formal",
          "example": "I am firmly convinced that schools should teach first aid.", "note": "Mocniejsze niż I think – na rozprawkę." }
      ]
    }
  ]
}
```

- `level` ∈ `B1`, `B2`, `C1` (poziom, od którego zwrot jest naturalny). `register` ∈ `formal`, `neutral`, `informal`.
- `genres` grupy ⊂ `email`, `letter`, `blog`, `forum`, `essay`, `article`, `review`, `report`, `proposal`, `story` (te same nazwy co `genre` w trenerach). Fraza może mieć własne `genres` (zawęża).
- `…` (wielokropek, U+2026) oznacza miejsce na resztę zdania; wstawianie do trenera wstawia frazę bez wielokropka.
- `example` – pełne zdanie (zalecane dla B2 i C1), `note` – krótka uwaga po polsku (różnice rejestru, pułapki).

### 2.2 Grupy (min. 14) i liczby

Rozpoczęcie nieformalne · Rozpoczęcie formalne · Cel pisania · Wyrażanie opinii · Zgoda i niezgoda · Dodawanie argumentów · Kontrargument i ustępstwo · Przykłady i uzasadnienie · Przyczyna i skutek · Porównanie i kontrast · Propozycje i rekomendacje · Prośby, pytania i skargi · Podsumowanie i zakończenie · Pożegnanie i formuły końcowe.

8–14 zwrotów w grupie, razem 140–180. W każdej grupie zwroty z co najmniej dwóch poziomów (tam, gdzie to ma sens). Treść oryginalna.

### 2.3 Widok

Route `#/pisanie/zwroty`.

- Filtry: poziom (B1 / B2 / C1 + przełącznik „do mojego poziomu włącznie”), rejestr, gatunek, wyszukiwanie (EN i PL, bez polskich znaków też trafia).
- Grupy jako sekcje z kotwicami, spis grup przyklejony z boku (komputer) / poziomy pasek chipów (telefon).
- Zwrot: EN pogrubione, PL pod spodem, chipy poziomu i rejestru (tekst, nie tylko kolor), rozwijany przykład i uwaga. Akcje: **Kopiuj**, **Do Moich słów** (spec 14, karta `basic` PL → EN).
- Ulubione zwroty (gwiazdka) zapisane per profil w nowym małym kluczu `elm_phrases_v1` → `{ version: 1, profiles: { <id>: { starred: ["opinia-05", …] } } }`, w eksporcie/imporcie/resecie. Filtr „Tylko ulubione”.

### 2.4 Panel zwrotów w trenerze pisania

W trenerze (`writing-trainer.js`, wszystkie egzaminy) przycisk „Zwroty” otwiera panel boczny (na telefonie: arkusz od dołu) z bankiem przefiltrowanym po `genre` zadania i poziomie egzaminu (E8 i MP: zwroty B1; MR i B2: B1–B2; C1: wszystkie). Kliknięcie **Wstaw** wstawia frazę w miejscu kursora w polu tekstu (zachowując zaznaczenie i historię cofania, `setRangeText`) i wraca fokusem do pola.

## 3. Nawigacja

Pozycja **Pisanie** w lewym panelu (ikona np. `pen-line`) między Fiszkami a Statystykami; w wyszukiwarce: „Wzorcowe wypracowania”, „Bank zwrotów”, każda grupa zwrotów i każdy wzorzec jako osobny wynik.

## 4. Walidator (reguły w `scripts/validate_v6.py`)

- każda kotwica występuje w `model` dokładnie raz, kotwice się nie nakładają, 3–15 słów;
- `type` i `criterion` z list, `note` ≤ 220 znaków, liczba komentarzy w zakresie dla egzaminu, wymagane typy;
- nowe wzorce C1: liczba słów 220–260;
- zwroty: unikalne `id`, `level`/`register`/`genres` z list, 8–14 zwrotów w grupie, min. 14 grup, brak duplikatów `en` (po normalizacji).

## 5. Kryteria odbioru

- [ ] 23 istniejące wzorce z komentarzami + min. 5 nowych wzorców C1 z komentarzami.
- [ ] Komentarze na marginesie (komputer) i rozwijane (telefon), filtr typów, „Ukryj komentarze”, klawiatura, druk.
- [ ] Bank 140–180 zwrotów, filtry, ulubione, kopiowanie, „Do Moich słów”.
- [ ] Panel „Zwroty” w trenerze wstawia frazę w miejscu kursora we wszystkich egzaminach.
- [ ] Nowy klucz `elm_phrases_v1` w eksporcie, imporcie i resecie.
