# Specyfikacja 02 – Laboratorium czasów i zestawy mieszane

Dwie powiązane funkcje: interaktywne „Laboratorium czasów" (zrozumieć, kiedy którego czasu użyć) i „Zestawy mieszane" (ćwiczyć wybór czasu bez podpowiedzi w postaci nazwy tematu).

Dane dostarczone: `dane/lab-czasow.json`, `dane/lab-wybor-czasu.json`, `dane/mixes.json`.

## A. Laboratorium czasów

### A.1 Gdzie

- Route `/laboratorium-czasow` (i `/laboratorium-czasow/:tenseId`), pozycja w lewym panelu z ikoną (np. probówka) i etykietą „Lab czasów".
- Strony tematów o czasach linkują do karty odpowiedniego czasu („Zobacz na osi czasu"), a karta linkuje do strony tematu i do zestawów.

### A.2 Układ strony

Cztery zakładki (tabs) na jednej stronie:

1. **Mapa czasów.** Siatka: kolumny = Present / Past / Future, wiersze = Simple / Continuous / Perfect / Perfect Continuous, plus osobna sekcja „Formy przyszłe" (going to, Present Continuous dla planów, Present Simple dla rozkładów). Każda komórka to kafelek z nazwą czasu, jednym zdaniem przykładu i oznaczeniem poziomu (np. A1). Kolor kafelka zależy od najniższego poziomu, na którym czas się pojawia (kolory poziomów z DESIGN.md). Kliknięcie otwiera kartę czasu.
2. **Karta czasu** (po wybraniu czasu), w kolejności:
   1. Nagłówek: nazwa, polska nazwa, poziom, jedno zdanie „po co to jest".
   2. **Oś czasu** (SVG, patrz A.3) z przełącznikiem scen (np. dla Present Perfect: „doświadczenie", „wynik", „trwa do teraz") i opisem tekstowym.
   3. **Budowa**: tabela twierdzenie / przeczenie / pytanie (wzory + przykłady) z wyróżnionymi elementami.
   4. **Zastosowania**: lista kart (etykieta po polsku, przykład EN, tłumaczenie PL, przycisk odsłuchu 🔊 przez `speechSynthesis`, jeśli dostępny).
   5. **Słowa-sygnały** jako chipy.
   6. **Pułapki Polaków** (ramka „Pułapka").
   7. **Porównaj z…** (kontrasty): lista par „ten czas vs inny", z krótką regułą i parą przykładów. Kliknięcie otwiera zakładkę Porównaj.
   8. **Ćwicz**: linki do zestawów powiązanych z czasem (z `cwiczenia-tematy.json` po `niezbednikId`) i do zestawu mieszanego dla czasów.
3. **Dobierz czas.** Interaktywne drzewo pytań (dane: `lab-wybor-czasu.json`). Jedno pytanie na ekranie, opcje jako duże przyciski, pasek ścieżki („Przeszłość → Zakończone → Pojedyncze zdarzenie"), przycisk „Wstecz" i „Zacznij od nowa". Wynik: jeden lub kilka czasów z uzasadnieniem i przykładem, przycisk „Zobacz kartę czasu". To reguły, nie AI: wynik jest deterministyczny z danych.
4. **Porównaj.** Dwa selektory czasów (domyślnie z kontrastu wybranego na karcie). Widok obok siebie: oś czasu każdego, budowa, kiedy używać, pułapki; poniżej tabela różnic z `contrasts`.

Na wąskich ekranach zakładki jako przewijany pasek, widok „Porównaj" w jednej kolumnie.

### A.3 Oś czasu – format danych i rendering

Każdy czas ma `scenes` – tablicę scen. Scena:

```
{
  "id": "experience",
  "label": "Doświadczenie",
  "description": "Raz lub kilka razy w życiu, nie wiadomo kiedy.",
  "elements": [
    { "kind": "point", "at": -0.55, "label": "Londyn" },
    { "kind": "point", "at": -0.2, "label": "Rzym" }
  ]
}
```

Oś: pozioma linia, współrzędne `-1` (daleka przeszłość) do `1` (daleka przyszłość), **`0` to „teraz"** (pionowa kreska z etykietą „teraz" i oznaczeniem czasu teraźniejszego). Rodzaje elementów:

| `kind` | Pola | Rysunek |
| --- | --- | --- |
| `point` | `at`, `label?` | kropka (zdarzenie punktowe) |
| `range` | `from`, `to`, `label?` | gruby odcinek (czynność trwająca) |
| `open-left` | `to`, `label?` | odcinek z gradientem „od dawna" po lewej |
| `open-right` | `from`, `label?` | odcinek ciągnący się w przyszłość (strzałka) |
| `repeat` | `from`, `to`, `count?` | seria kropek (czynność powtarzalna / nawyk) |
| `result` | `at`, `label?` | znacznik „skutek teraz" (np. ikona), zwykle przy 0 |
| `marker` | `at`, `label` | pionowy znacznik punktu odniesienia (np. „when he called") |

- Kolory z tokenów (kolor grupy czasu: present / past / future jako trzy odcienie akcentu), kontrast AA.
- **Animacja** przy wejściu i przy zmianie sceny: oś rysuje się od lewej do prawej, elementy pojawiają się kolejno (GSAP timeline lub CSS). Przy `prefers-reduced-motion` stan końcowy bez animacji.
- **Dostępność:** `role="img"` z `aria-label` = `description` sceny, plus ten sam opis jako tekst pod osią. Etykiety na osi nie mogą się nakładać (przy kolizji przesuwaj w pionie).
- Wartości `at/from/to` ustawione tak, że przeszłość jest po lewej (<0), przyszłość po prawej (>0); `from <= to`.

### A.4 Format `lab-czasow.json`

Patrz plik. Najważniejsze pola każdego czasu: `id`, `name`, `namePl`, `group` (`present|past|future`), `aspect` (`simple|continuous|perfect|perfect-continuous|form`), `level`, `summary`, `formation`, `uses`, `signals`, `scenes`, `traps`, `contrasts`, `niezbednikIds` (linki do stron tematów), `setTags`.

### A.5 Format `lab-wybor-czasu.json`

Drzewo węzłów: `{"start": "<nodeId>", "nodes": { "<id>": { "question": "...", "help": "...", "options": [ { "label": "...", "next": "<nodeId>" | "result": ["tenseId", ...], "why": "..." } ] } } }`. Walidator sprawdza, że każdy `next` istnieje, każdy `result` zawiera istniejące `tenseId`, a w grafie nie ma cykli i martwych węzłów.

## B. Zestawy mieszane

### B.1 Centrum ćwiczeń (`/cwiczenia`)

Strona-hub w lewym panelu (ikona z hantlami lub kartą), trzy sekcje:

1. **Tematy** – zestawy z `cwiczenia-tematy.json` pogrupowane wg poziomu → kategorii, z najlepszym wynikiem, filtr poziomu.
2. **Mieszane** – gotowe zestawy z `dane/mixes.json` oraz **generator**.
3. **Trening słabych punktów** – dodaje spec 03 (na tym etapie kafelek z opisem „wkrótce" lub ukryty).

### B.2 Gotowe zestawy mieszane (`mixes.json`)

Każdy wpis: `id`, `title`, `description`, `level`, `topics` (lista `id` punktów niezbędnika, z których losować), `count` (liczba zadań), `types` (opcjonalny filtr typów), `mode` (domyślnie `learn`).

### B.3 Generator

Formularz: poziom (zakres A1–C2), tematy (chipy zgrupowane wg kategorii; „wszystkie czasy" jako skrót), typy zadań (chipy), liczba zadań (10/15/20), tryb (Nauka/Egzamin). Przycisk „Losuj zestaw".

Algorytm losowania:
1. Zbierz pulę zadań ze zestawów pasujących do wyboru (po `topic`, `level`, `type`, `tags`).
2. Jeśli pula jest mniejsza niż `count`, zmniejsz `count` i poinformuj.
3. Wylosuj **równomiernie po tematach** (round-robin po tematach, w obrębie tematu losowo), tak aby żaden temat nie dominował.
4. Wyklucz zadania z ostatniej sesji mieszanej tego profilu, jeśli starcza puli.
5. Jeśli istnieje dziennik podejść (spec 03), zwiększ wagę zadań z niską trafnością lub nigdy nierozwiązywanych (waga 2× dla trafności < 60%, 1.5× dla nigdy niewidzianych). Do czasu spec 03 losowanie jednostajne.
6. Kolejność zadań w sesji: wymieszana, ale kolejne zadania tego samego typu najwyżej 2 pod rząd.

Sesja mieszana używa tego samego silnika zadań (spec 01), z `mode: "mix"` w dzienniku podejść. Ekran podsumowania dodatkowo pokazuje trafność per temat w tej sesji („Najlepiej: …, do powtórki: …").

## C. Kryteria odbioru etapu

- [ ] `/laboratorium-czasow` z czterema zakładkami działa na danych z `dane/`.
- [ ] Oś czasu animuje się, jest dostępna (tekstowy opis) i poprawna w obu motywach.
- [ ] „Dobierz czas" prowadzi do poprawnych wyników dla wszystkich ścieżek (walidator drzewa).
- [ ] `/cwiczenia` pokazuje zestawy tematów i mieszane, generator losuje według algorytmu.
- [ ] Walidator rozszerzony o `lab-czasow.json`, `lab-wybor-czasu.json` i `mixes.json`.
- [ ] Brak zmian w istniejących kluczach localStorage.
