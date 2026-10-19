# DESIGN.md — English Levels Map

Ten plik to jedno źródło prawdy o wyglądzie i zachowaniu interfejsu. Każdy kolejny etap prac wizualnych odwołuje się do niego i go uzupełnia.

Plan prac wizualnych:

1. **Fundament** (kolory, fonty, tokeny, komponenty bazowe) — zrobione.
2. **Lewy panel** — zrobione (sekcja 3.1).
3. Strona „Dziś”, poziomy i celebracje.
4. Treści podstron, Certyfikat C1 i kontrola jakości.

---

## 1. Kierunek: „Mapa podróży” z typografią redakcyjną

- **Metafora.** Nauka to wędrówka po mapie od A1 do C2. Poziomy to „krainy” w swoich kolorach, a postęp to szlak. Gradient marki biegnie przez kolory krain w kolejności A1 → C2.
- **Nastrój.** Spokojny, ciepły i dorosły, z odrobiną przygody. Nie dziecinny i nie korporacyjny. Inspiracją jest papier starego atlasu (krem, atrament) za dnia i mapa nocą (głęboki granat) po zmroku.
- **Typografia.** Nagłówki, kody poziomów i duże liczby są w kroju display z charakterem (Fraunces, szeryf o zmiennym rozmiarze optycznym). Tekst jest w czytelnym kroju bezszeryfowym (Inter).
- **Kolor.** Kolor ma znaczenie, nie jest dekoracją. Barwa krainy pojawia się tam, gdzie chodzi o dany poziom: kropka, pasek, tło karty poziomu, znacznik „Umiem”. Chrom interfejsu (przyciski, linki, ramki) jest neutralny: atrament plus jeden akcent.
- **Grywalizacja.** Tylko przy kamieniach milowych (etap 3). Poza nimi aplikacja jest spokojna.
- **Czego unikamy.** Białych kart z szarą ramką jako jedynego środka wyrazu, tęczy bez znaczenia, ciężkich efektów (WebGL, cząsteczki), wygładzania przewijania i szablonowego „dashboardu SaaS”.

## 2. Tokeny

Wszystkie wartości są zmiennymi CSS na początku `css/style.css`. Motyw wybiera `data-theme="light" | "dark"` na `<html>` (skrypt inline w `<head>` i `js/theme.js`). Poza blokami tokenów **nie ma kolorów wpisanych na sztywno**. Kontrola: `node tools/kontrast.js` oraz audyt opisany w sekcji 8.

### 2.1 Powierzchnie, tekst, linie

| Token | Jasny | Ciemny | Do czego |
|---|---|---|---|
| `--bg` | `#faf6ee` | `#0e1526` | tło strony |
| `--surface` | `#fffdf9` | `#151e33` | karty, pola, menu |
| `--surface-2` | `#f3ede0` | `#1c2742` | lewy panel, delikatne wypełnienia |
| `--surface-3` | `#e9e1cf` | `#263352` | tory, chipy |
| `--surface-raised` | `#fffefb` | `#19233b` | karta uniesiona (hover) |
| `--ink` | `#1d2433` | `#eaf0fa` | tekst główny |
| `--ink-muted` | `#545d6e` | `#a3aec2` | tekst drugorzędny (≥ 4.5:1 także na `surface-2/3`) |
| `--ink-faint` | `#69707f` | `#8792a8` | placeholdery |
| `--line` | `#e6dfcf` | `#27334f` | linie dekoracyjne |
| `--line-strong` | `#d4c9b2` | `#34426a` | wyraźniejsze ramki (np. przycisk drugorzędny) |
| `--line-control` | `#8c8471` | `#6d7a99` | obramowania pól i kontrolek (≥ 3:1) |

`--ink-muted` przyciemniłem względem punktu startowego briefu (`#5B6475` → `#545d6e`), żeby miał 4.5:1 także na `--surface-3`.

### 2.2 Akcent i stany

- `--accent` (`#2c55c4` jasny / `#8db0ff` ciemny): linki, fokus, wyróżnienia.
- Przycisk główny ma kolor atramentu (`--accent-bg`: `#1d2433` / `#eaf0fa`) z tekstem `--on-accent`. Daje to redakcyjny, „drukowany” charakter, a kolor zostaje dla krain.
- Stany `--success`, `--warning` i `--danger` (z wariantami `-soft`, `-border`, `-fill`, `-bg`) są **zarezerwowane**. Nie są kolorami poziomów, zawsze idą w parze z ikoną lub słowem.

### 2.3 Krainy (poziomy A1–C2)

Każdy poziom ma cztery tokeny, osobno dla obu motywów:

| Token | Do czego |
|---|---|
| `--lvl-xx` | kolor główny (kropka, pasek, wypełnienie) |
| `--lvl-xx-soft` | tło / tor paska |
| `--lvl-xx-ink` | tekst na tle `-soft` (AA ≥ 4.5:1, w praktyce > 8:1) |
| `--lvl-xx-glow` | poświata (ciemny motyw, wyróżnienia) |

| Poziom | Barwa | Jasny | Ciemny |
|---|---|---|---|
| A1 | zielony | `#0e9a3f` | `#0e9a3f` |
| A2 | niebieski | `#0991ed` | `#1a97f4` |
| B1 | fiolet | `#6133a2` | `#7d52c3` |
| B2 | róż (malina) | `#b13065` | `#be3d70` |
| C1 | pomarańcz | `#e06d00` | `#e06d00` |
| C2 | turkus | `#06999a` | `#12a7a7` |

- Element z klasą `.lvl-A1` … `.lvl-C2` dostaje zmienne kontekstowe `--lvl`, `--lvl-soft`, `--lvl-ink` i `--lvl-glow`. Komponenty używają tylko ich.
- **Paleta jest policzona, nie dobrana na oko.** Sprawdza ją walidator palet kategorialnych (skill `dataviz`) dla jasnego tła `#fffdf9`/`#faf6ee` i ciemnego `#151e33`/`#0e1526`. Wynik:
  - jasność w paśmie, nasycenie ≥ 0.10;
  - sąsiednie pary przy symulacji protanopii i deuteranopii ΔE ≥ 11.6 (cel 8);
  - normalne widzenie ΔE ≥ 17.6 (próg 15);
  - kontrast znacznika do tła ≥ 3:1.

  Poprzednia paleta nie przechodziła: niebieski A2 i fiolet B1 miały ΔE 4.4 przy deuteranopii.
- W ciemnym motywie `-soft` jest mieszany z tłem strony (`--bg`), a nie z kartą, bo tylko tak pasek B1 ma ≥ 3:1 na swoim torze.
- **Poziom nigdy nie jest oznaczany samym kolorem.** Zawsze towarzyszy mu kod (A1…C2).
- Zmiana koloru poziomu wymaga ponownego uruchomienia walidatora i `node tools/kontrast.js`.

### 2.4 Gradient marki

`--brand-gradient`: liniowy przez `--lvl-a1` → `--lvl-c2`. Używany **oszczędnie**: znak logo, pierścień postępu, ewentualnie pojedynczy akcent kamienia milowego. Nigdy jako tło tekstu ani tło całych sekcji.

### 2.5 Typografia

| Token | Wartość |
|---|---|
| `--font-display` | `"Fraunces Variable"`, zapasowo Iowan / Palatino / Georgia |
| `--font` | `"Inter Variable"`, zapasowo fonty systemowe |
| `--font-mono` | systemowy monospace |

- **Skala płynna (`clamp`).**
  - `--fs-xs` 12 px, `--fs-sm` 14 px, `--fs-md` 16 px, `--fs-lg` 18 px;
  - `--fs-xl` 20–24 px (sekcja), `--fs-2xl` 26–36 px (tytuł strony), `--fs-3xl` 36–56 px, `--fs-4xl` 44–72 px (kod poziomu, wynik).
- **Duże nagłówki:** `--tracking-display` (−0.02 em), `--lh-tight`.
- **Etykiety wersalikami:** `--tracking-caps` (0.08 em).
- **Długość linii w treściach:** `--measure` 70ch.
- **Statystyki i liczniki:** `font-variant-numeric: tabular-nums` (klasa `.num` i reguły komponentów).
- **Fraunces:** waga 560–650 w nagłówkach, oś `opsz` automatycznie (`font-optical-sizing: auto`), więc duże litery są ciaśniejsze i wyrazistsze.
- **Pliki:** self-hosted (`assets/fonts/`), tylko podzbiory `latin` i `latin-ext` (ą ć ę ł ń ó ś ź ż), `font-display: swap`.
- **Preload:** tylko Inter latin i latin-ext (tekst widoczny od razu) oraz Fraunces latin (nagłówki).

### 2.6 Odstępy, promienie, cienie

- **Odstępy:** `--space-1` … `--space-8` (4, 8, 12, 16, 24, 32, 48, 64 px).
- **Promienie (miękkie):** `--radius-xs` 6, `--radius-sm` 10, `--radius` 14, `--radius-lg` 20, `--radius-xl` 28, `--radius-pill`.
- **Cienie wielowarstwowe** (`--shadow-sm`, `--shadow`, `--shadow-hover`, `--shadow-lg`):
  - jasny: ciepłe, brązowawe, bardzo delikatne;
  - ciemny: głęboki cień plus subtelna krawędź i poświata akcentu przy hover.

### 2.7 Ruch

| Token | Wartość | Do czego |
|---|---|---|
| `--dur-fast` | 120 ms | hover, kolor |
| `--dur-base` | 200 ms | pojawianie się, menu |
| `--dur-slow` | 320 ms | paski i pierścienie postępu |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | domyślne |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | „pstryknięcia” (znacznik „Umiem”) |

Szczegóły zasad: sekcja 4.

### 2.8 Inne

- `--selection`: kolor zaznaczenia tekstu.
- `--scrollbar`, `--scrollbar-hover`: subtelny pasek przewijania.
- `--topo-color` i `--topo-opacity` (4–5%): wzór warstwic za nagłówkami.
- `--topbar-h`: wysokość górnego paska (pod nim są elementy „sticky”).

## 3. Komponenty bazowe

| Komponent | Klasa / funkcja | Zasady |
|---|---|---|
| Karta | `.card` (+ `.is-interactive` dla klikalnych) | Warstwa `--surface` na `--bg`, ramka `--line`, cień `--shadow-sm`. Karta w kontekście poziomu (`.lvl-XX`) ma ramkę z domieszką koloru krainy. Klikalna unosi się (`translateY(-2px)` + `--shadow-hover`) bez przesunięcia układu. |
| Przycisk | `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-danger-solid`, `.btn-small` | Pigułka. Główny ma kolor atramentu, drugorzędny `--surface` z ramką `--line-strong`, ghost tylko akcent. Wciśnięcie: `scale(.98)`. Min. 44 px na ekranach dotykowych. |
| „Umiem” | `.umiem` (+ `.umiem-lg`) | Pigułka z okrągłym polem. Po zaznaczeniu tło `--lvl-soft`, kolor `--lvl-ink`, pole wypełnione `--lvl`, ptaszek „pstryka” (`--ease-spring`). Poza poziomem: kolory sukcesu. |
| Chip | `.chip` (+ `.c1-chip`) | Mała pigułka `--surface-3` / `--ink-muted`. W kontekście poziomu: `--lvl-soft` / `--lvl-ink`. |
| Podpowiedź | `[data-tooltip]` | Czysty CSS, pojawia się przy hover **i** focus-visible. Treść jest też w `aria-label`, bo podpowiedź jest tylko wizualna. |
| Pasek postępu | `.progress` > `.progress-fill` (funkcja `progressBar` w `js/render.js`) | Wypełnianie przez `transform: scaleX` (`--dur-slow`). Kolor `--lvl` albo `--brand-gradient` (`.is-brand`). Tor `--lvl-soft`. |
| Pierścień postępu | `ELM.ui.progressRing(percent, opts)` (`js/ui.js`) | SVG, łuk przez `stroke-dashoffset`, kolor poziomu albo gradient marki, liczba w środku (`tabular-nums`). Rola `progressbar` z `aria-valuenow`. |
| Ikona | `ELM.icon(name, opts)` (`js/ui.js`), w HTML `<span data-icon="nazwa">` | Lucide, obrys 1.75 px, `currentColor`, domyślnie `aria-hidden`. Rysowana przez `createElementNS` (bez innerHTML). |
| Logo | `ELM.logo()` (w HTML `[data-logo]`), `assets/favicon.svg`, `assets/favicon-180.png` | Znak: kompas w okręgu ze szlakiem kropek, okrąg i północ igły w gradiencie marki. Napis „English Levels Map” Fraunces w kolorze `--ink`. Gradient jest tylko w znaku, bo jasne krainy (zielony, pomarańcz, turkus) dają w tekście kontrast poniżej 4.5:1. |
| Focus | `:focus-visible` | Obrys 2 px `--focus-color`, odstęp 2 px, na każdym tle. |
| Tło warstwicowe | `::before` nagłówków `.level-header`, `.tool-head`, pierwszego `h1` strony głównej i `.c1-title` | Statyczny wzór warstwic (`assets/warstwice.svg`, w CSS jako maska `data:`, bo maski z pliku są blokowane przy `file://`) w `--topo-color` przy `--topo-opacity`, wygaszany w lewo. `.view` ma `overflow-x: clip`, więc wzór nigdy nie wywołuje przewijania w poziomie. |

### 3.1 Lewy panel (etap 2)

Pliki: `index.html` (znaczniki), `js/sidebar.js` (zachowanie), `js/render.js` (narzędzia i poziomy), `js/c1-core.js` (chip i sekcje C1), sekcja „LEWY PANEL” w `css/style.css`.

**Stany:**

| Stan | Kiedy | Wygląd |
|---|---|---|
| Wąski pasek | domyślnie od 768 px | `--rail-w` 72 px. Znak logo, przycisk rozwijania, ikony Dziś / Test poziomu / Dziennik błędów (plakietka powtórek na dziś), sześć chipów poziomów z pierścieniem postępu w kolorze krainy i kodem w środku, chip „Certyfikat C1”, pinezka. |
| Rozwinięty | najechanie myszą, fokus z klawiatury, przycisk rozwijania (tablet) | `--panel-w` 288 px, warstwa `position: fixed` **nad treścią** z `--shadow-lg`. Treść się nie przesuwa. Widać etykiety, nazwy poziomów, „X / Y umiem” z paskiem, napis pod logo i sekcje zakładki C1. |
| Przypięty | pinezka | Pełny panel na stałe, bez cienia. Treść odsuwa się (`html[data-sidebar="pinned"] .main { margin-left: --panel-w }`, animowany margines). |
| Szuflada | poniżej 768 px | Przycisk „Menu” w górnym pasku. Panel wysuwa się z lewej nad przyciemnionym tłem, tapnięcie tła zamyka. Pinezki i rozwijania tu nie ma. |

**Zachowanie:**
- Najechanie działa tylko przy `(hover: hover) and (pointer: fine)`. Otwarcie następuje po 120 ms (przypadkowy przelot kursora nic nie robi), zamknięcie 250 ms po zjechaniu.
- Fokus z klawiatury (`:focus-visible`) rozwija panel, a jego utrata zwija (o ile panel nie jest przypięty). Esc zwija i fokus nie rozwija go ponownie, dopóki nie opuści panelu.
- Tablet z dotykiem: przycisk rozwijania (`aria-expanded`, „Rozwiń panel” / „Zwiń panel”), tapnięcie poza panelem zamyka. Po przejściu na inną stronę rozwinięty panel się zwija.
- Pinezka ma `aria-pressed`, ikonę `pin-off` → `pin` i etykietę „Przypnij panel” / „Odepnij panel”.
- Stan przypięcia jest zapisany w nowym kluczu `elm_sidebar_v1` = `{ version: 1, pinned }` (try/catch). Jest globalny dla urządzenia, nie należy do profilu ani do eksportu. Odczytuje go już skrypt w `<head>`, więc treść nie przeskakuje przy starcie.

**Dostępność:**
- Etykiety w wąskim pasku są ukryte przez `opacity` (zostają w DOM), więc czytnik ekranu zawsze zna nazwę pozycji.
- Poziom ma `aria-label`, np. „Poziom A1, Początkujący: umiem 9 z 30 we wszystkich kategoriach (30%)”. Pierścień jest wtedy ozdobą (`aria-hidden`).
- Aktywna pozycja ma `aria-current="page"`, tło i znacznik w kolorze krainy (narzędzia: akcent, C1: złoto).
- Kolejność Tab: logo → rozwijanie → narzędzia → poziomy → C1 (i jego sekcje po rozwinięciu) → pinezka.
- Wszystkie cele w pasku mają ≥ 44 px.

**Ruch:**
- Szerokość warstwy rośnie w `--dur-base` z `--ease-out`. To warstwa poza przepływem, więc nie przelicza układu treści.
- Etykiety pojawiają się przez `opacity` z opóźnieniem 60 ms.
- Pierścienie i paski są aktualizowane w miejscu (`ELM.ui.setRing`) i płynnie przechodzą z poprzedniej wartości.
- Przy `prefers-reduced-motion` zmiana jest natychmiastowa (bez przejść szerokości i marginesu).

**Liczby postępu (spójność):**
- Panel i strona „Dziś” liczą **cały poziom**, czyli wszystkie kategorie (`app.getLevelStats`). Panel ma podpis „Poziomy · wszystkie kategorie”.
- Pasek na stronie poziomu liczy **wybraną kategorię** i ma dopisek „w tej kategorii”.
- Wcześniej panel pokazywał kategorię („9 / 14”), a „Dziś” cały poziom („9 / 30”), bez oznaczenia zakresu.

**Certyfikat C1:** chip w granacie i złocie (`--c1-navy`, `--c1-gold`, `--c1-soft`, `--c1-ink`, `--c1-edge`). Zewnętrzna krawędź `--c1-edge` (granat w jasnym motywie, złoto w ciemnym) ma ≥ 3:1 do panelu. Etap 4 dopracuje szczegóły.

## 4. Ruch

- **Proste rzeczy tylko w CSS.** Hover, focus, pojawianie się i przejścia kolorów robi CSS. Animujemy `opacity` i `transform`. Wyjątek to krótkie przejście kolorów przy zmianie motywu (klasa `html.theme-anim`).
- **Czasy.** `--dur-fast` dla mikrointerakcji, `--dur-base` dla wejść i menu, `--dur-slow` dla pasków i pierścieni. Nic dłuższego niż 400 ms poza celebracjami (etap 3).
- **GSAP.** Plik `assets/vendor/gsap.min.js` (npm `gsap`, darmowy ze wszystkimi wtyczkami) skopiowany przez `npm run zasoby`.
  - Ładujemy go **tylko na żądanie**: `ELM.loadGsap().then(gsap => …)` wstrzykuje `<script>`. Działa także przy `file://`, gdzie dynamiczny `import()` modułów jest zablokowany.
  - Każda animacja przez `gsap.matchMedia()` z gałęzią `(prefers-reduced-motion: reduce)` bez ruchu.
  - Przy opuszczeniu widoku: `mm.revert()` / `ctx.revert()`. Aplikacja nie używa Reacta, więc zamiast `useGSAP` sprzątamy przy zmianie trasy.
  - W etapie 1 GSAP nie jest ładowany na żadnym ekranie.
- **Bez wygładzania przewijania.** Nie używamy Lenis ani podobnych bibliotek. Przewijanie jest natywne (zagnieżdżone panele, pola tekstowe, iPad).
- **Bez ciężkich efektów tła.** Zakazane są WebGL i canvas z cząsteczkami.
- **`prefers-reduced-motion: reduce`.** Globalna reguła skraca animacje i przejścia do 0.01 ms. Zostają tylko zmiany natychmiastowe (kolor, krycie bez ruchu).

## 5. Dostępność

- **Kontrast WCAG AA.** Tekst ≥ 4.5:1, komponenty, obramowania pól, paski i znaczniki ≥ 3:1, w obu motywach. Sprawdza to `node tools/kontrast.js` (140 par). Palety poziomów sprawdza walidator CVD (sekcja 2.3).
- **Widoczny focus.** `:focus-visible`, obrys 2 px w kolorze akcentu, na każdym elemencie interaktywnym.
- **Cele dotykowe.** Min. 44 × 44 px przy `pointer: coarse` oraz w menu, przełącznikach i przyciskach ikon.
- **Kolor nigdy nie jest jedynym nośnikiem informacji.** Poziomy mają kody, stany ikonę lub słowo, wynik ćwiczenia ✓/✗ plus tekst.
- **Ikony.** Ikony dekoracyjne mają `aria-hidden="true"`. Przycisk z samą ikoną ma `aria-label` i podpowiedź.
- **Ruch.** Zgodnie z sekcją 4 (`prefers-reduced-motion`).
- **Klawiatura.** Wszystko jest dostępne z klawiatury. Menu i okna mają Esc, strzałki i powrót fokusu (bez zmian względem wcześniejszych etapów).

## 6. Mikrotreści

- **Język.** Polski, krótko, w drugiej osobie, ciepło i rzeczowo: „Zapisz go od razu – jutro wróci jako powtórka.”
- **Przyciski.** Czasownik plus obiekt: „Dodaj błąd”, „Zacznij powtórki (3)”, „Zobacz wynik”. Nie piszemy „OK” ani „Kliknij tutaj”.
- **Bez presji i oceniania.** Pomyłki to „błędy do powtórki”, nie „porażki”. Seria jest zachęcająca („Seria trwa”), bez straszenia jej utratą.
- **Puste stany.** Mówią, co tu będzie, i dają jedną akcję („Dodaj pierwszy błąd”).
- **Błędy.** Mówią, co poprawić: „Wpisz poprawną odpowiedź.”, „Nazwa może mieć najwyżej 30 znaków.”
- **Wynik testu.** Zawsze z dopiskiem „orientacyjnie” i informacją, że to nie oficjalny test.
- **Typografia tekstu.**
  - polskie cudzysłowy „…”;
  - półpauza – w zdaniach;
  - wielokropek … jako jeden znak;
  - liczby z jednostką ze spacją („3 dni”).

## 7. Biblioteki i zasoby

| Biblioteka | Wersja | Licencja | Jak trafia do strony |
|---|---|---|---|
| `@fontsource-variable/fraunces` | 5.3 | SIL OFL 1.1 | `npm run zasoby` → `assets/fonts/fraunces-latin*.woff2` (osie wght + opsz) |
| `@fontsource-variable/inter` | 5.3 | SIL OFL 1.1 | `npm run zasoby` → `assets/fonts/inter-latin*.woff2` (oś wght) |
| `lucide-static` | 1.59 | ISC | `npm run zasoby` → `assets/ikony.js` (tylko używane ikony, lista w `tools/zbuduj-zasoby.js`) |
| `gsap` | 3.15 | GreenSock „no charge” | `npm run zasoby` → `assets/vendor/gsap.min.js` (ładowany na żądanie) |

- **Dlaczego kopiujemy do `assets/`.** Strona działa bez kroku budowania, z dysku (`file://`) i na GitHub Pages. `node_modules/` jest w `.gitignore`, a skopiowane pliki są w repozytorium. Po `npm install` lub aktualizacji paczek uruchom `npm run zasoby`.
- **Brak zewnętrznych CDN** i fontów Google.

## 8. Kontrola jakości (każdy etap)

1. `npm run build`: zasoby i dane bez błędów.
2. `npm test`: testy logiki.
3. `node tools/kontrast.js`: 0 niezgodnych par.
4. Audyt twardych wartości: w `css/style.css` poza blokami tokenów nie ma literałów kolorów (`#…`, `rgb(…)`), rozmiarów fontów ani promieni w px, ani czasów poza tokenami (wyjątek: 0.01 ms w regule `prefers-reduced-motion`).

   Udokumentowane wyjątki z kolorami wpisanymi na stałe:
   - `meta theme-color` w `<head>` i `THEME_COLOR` w `js/theme.js` — skrypt działa przed wczytaniem CSS;
   - samodzielny `assets/favicon.svg`.
5. Zrzuty ekranu: jasny i ciemny motyw przy 390, 768 i 1280 px. Brak przewijania w poziomie od 360 px.

## 9. Wyniki przeglądów

**Etap 1, przegląd dostępności** (automatyczny audyt Playwright + Edge, 8 tras, oba motywy, 1280 i 390 px):
- kontrast całego wyrenderowanego tekstu: 0 niezgodności;
- elementy interaktywne bez nazwy dostępnej: 0;
- fokus widoczny na 25 kolejnych elementach z klawiatury;
- powiększenie 200%: bez przewijania w poziomie;
- cele dotykowe ≥ 44 px po poprawkach (listy wyboru w lukach Part 1–3 i przycisk „Dodaj do dziennika” na ekranach dotykowych).

Ograniczenie: audyt automatyczny nie zastępuje testu z czytnikiem ekranu (NVDA / VoiceOver).

**Etap 1, krytyka projektu** (zrzuty 360–1280 px):
- Ujednolicone kroje na stronie „Dziś”: kody poziomów i duże liczby w Fraunces.
- Na kolejne etapy: lewy panel ma za mało hierarchii między narzędziami a krainami (etap 2). Karty treści są nadal głównie jasne, więc tła krain w nagłówkach i celebracje zostają na etap 3. Tabele i bloki treści podstron do dopracowania w etapie 4.

**Rozmiar** (HTML + CSS + JS bez plików z danymi):
- kod: przed 310.8 KB (gzip 95.6 KB), po 358.9 KB (gzip 109.4 KB), czyli +48.1 KB (gzip +13.7 KB);
- nowe fonty woff2: 253.9 KB w 4 plikach, pobierane według `unicode-range` i trzymane w pamięci podręcznej;
- GSAP (71 KB) nie jest ładowany w etapie 1.

**Etap 2 (lewy panel):**
- Audyt Playwright, oba motywy: kolejność Tab w panelu logiczna, obrys fokusu nieprzycięty (po zmniejszeniu napisu logo w panelu), cele ≥ 44 px, kontrast w rozwiniętym panelu bez zastrzeżeń, przy `reduced-motion` przejścia 0 s.
- Chip C1 dostał krótką nazwę dostępną.
- Testy zachowania: opóźnienia 120 / 250 ms, treść nie przesuwa się przy rozwinięciu (lewa krawędź treści stała 72 px), przypięcie odsuwa treść do 288 px i przetrwa przeładowanie, tablet (tapnięcie / tapnięcie poza), szuflada na telefonie.
- Krytyka: przy 0% pierścienie krain są blade (sam tor), więc „nieodkryte krainy” warto pokazać na etapie 3. Chip C1 do dopracowania na etapie 4.

## 10. Dziennik zmian

- **Etap 1 (fundament).**
  - Nowa paleta i tokeny („papier mapy” i „mapa nocą”), paleta krain sprawdzona pod daltonizm.
  - Fonty Fraunces i Inter (self-hosted).
  - Ikony Lucide zamiast znaków tekstowych.
  - Logo (kompas ze szlakiem) i favicony.
  - Komponenty bazowe: karta, przyciski, „Umiem”, chip, podpowiedź, pasek i pierścień postępu, focus, zaznaczenie, pasek przewijania, tło warstwicowe.
  - `tools/kontrast.js` (152 pary), `tools/zbuduj-zasoby.js`.
  - Wszystkie rozmiary fontów, promienie i czasy animacji na tokenach.
- **Etap 2 (lewy panel).**
  - Wąski pasek 72 px z pierścieniami krain, rozwijanie nad treścią, pinezka (`elm_sidebar_v1`), szuflada poniżej 768 px.
  - Wspólne liczby postępu (cały poziom w panelu i na „Dziś”, „w tej kategorii” na stronie poziomu).
  - Górny pasek ujednolicony.
  - Układ ekranów bez zmian.
