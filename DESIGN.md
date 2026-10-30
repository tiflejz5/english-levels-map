# DESIGN.md — English Levels Map

Ten plik to jedno źródło prawdy o wyglądzie i zachowaniu interfejsu. Każdy kolejny etap prac wizualnych odwołuje się do niego i go uzupełnia.

Plan prac wizualnych:

1. **Fundament** (kolory, fonty, tokeny, komponenty bazowe) — zrobione.
2. **Lewy panel** — zrobione (sekcja 3.1).
3. **Strona „Dziś”, poziomy i celebracje** — zrobione (sekcje 3.2–3.5).
4. **Treści podstron, Certyfikat C1 i kontrola jakości** — zrobione (sekcje 2.9, 3.7, 3.8, 9).

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
- **Szerokości (v7 A1):** `--w-text` 720 px (kolumna stron do czytania, wyrównana do lewej) i `--w-wide` 1000 px (kontener każdego widoku, `.view`). Lewa krawędź nagłówka h1 jest taka sama na każdym ekranie; `--measure` dla akapitów zostaje.
- **Przyciski (v7 A2):** `.btn` ma `--radius-sm`; pigułka tylko dla chipów, filtrów i przełączników. Poziomy: `.btn-primary` (jeden na widok), `.btn-secondary` (obrys), `.btn-link` (alias `.btn-ghost`). Okruszki i linki powrotu to `.crumb` (ikona `chevron-left`).
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
- `--topo-mask`: wzór warstwic jako maska (wspólny dla nagłówków i hero „Dziś”).
- `--cat-uoe`, `--cat-reading`, `--cat-writing`, `--cat-listening`, `--cat-speaking`, `--cat-grammar`, `--cat-vocab`, `--cat-other`: paski kategorii dziennika.
- `--c1-cream`, `--c1-cream-muted`: tekst na granacie (kafel egzaminu).

### 2.9 Sekcja „Certyfikat C1” (etap 4)

W zakładce C1 `js/app.js` ustawia `data-section="certyfikat"` na `<html>` (poza nią `data-section="app"`). Dwa bloki tokenów nadpisują powierzchnie, tekst, linie, akcent i fokus. Komponenty się nie zmieniają, zmienia się tylko „papier”:

| Token | Jasny („kość słoniowa”) | Ciemny („północny granat”) |
|---|---|---|
| `--bg` / `--surface` | `#f9f4e8` / `#fffaf0` | `#090f21` / `#101935` |
| `--ink` / `--ink-muted` | `#17203d` / `#4c5470` (granatowy atrament) | `#f3ecda` / `#bcb4a0` (kremowy tekst) |
| `--accent` | `#6b4d00` (ciemne złoto, linki AA) | `#e9c25c` (złoto) |
| `--accent-bg` / `--on-accent` | `#1b2647` / `#fdf7e8` (granatowy przycisk) | `#e9c25c` / `#090f21` (złoty przycisk) |
| `--focus-color` | `#8a6400` | `#e9c25c` |

- Selektory: `:root:not([data-theme="dark"])[data-section="certyfikat"]` i `:root[data-theme="dark"][data-section="certyfikat"]`.
- Stałe akcenty marki C1 (`--c1-navy`, `--c1-gold`, `--c1-soft`, `--c1-ink`, `--c1-edge`, `--c1-cream`, `--c1-cream-muted`) działają wszędzie, np. w chipie C1 w panelu, kaflu egzaminu na „Dziś” i calloucie „Na egzaminie C1”.
- `tools/kontrast.js` sprawdza wszystkie pary w czterech zakresach: jasny, ciemny, C1 jasny, C1 ciemny.

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

### 3.2 Strona „Dziś” — kokpit (etap 3)

**v7 (A4, A5):** hero bez warstwic. Kafle „Kontynuuj”, „Dodaj błąd” i podpowiedź testu zastąpiła jedna karta „Na skróty” (`.bento-shortcuts`, wiersze `.row` z ikoną, tytułem, opisem i chevronem). Kafle Fiszki i „Gotowy na test końcowy” zostały bez zmian.

Plik: `js/today.js`, sekcja „STRONA „DZIŚ” — kokpit” w `css/style.css`.

**Układ bento:** 12 kolumn na komputerze, 6 na tablecie (do 1023 px), 1 na telefonie (do 640 px).

| Kafel | Kolumny (komputer) | Treść |
|---|---|---|
| Hero | 8 | Data, powitanie zależne od pory dnia („Dzień dobry” 5–12, „Miłego popołudnia” 12–18, „Dobry wieczór”), jedno zdanie zachęty zależne od stanu (szczegóły niżej), pierścień „Twoja mapa” (łączny postęp „Umiem”, gradient marki). Tło warstwicowe tylko tutaj. |
| Powtórki | 4 | Duża liczba i „Zacznij powtórki”, a przy zerze kompas SVG i „Na dziś czysto”. |
| Zachęta do testu | 12 | Tylko dla profilu bez postępów i bez wyniku testu. |
| Szlak A1 → C2 | 12 | SVG: ścieżka przez sześć stacji i przebyty odcinek w gradiencie marki. Stacje to linki HTML z pierścieniem (procent „Umiem”, wszystkie kategorie) i nazwą. Pinezka „Tu jesteś” stoi na pierwszej stacji poniżej 100%. Gdy kafel ma poniżej 480 px szerokości, szlak jest pionowy. |
| Seria | 5 | Płomień SVG (zapalony przy serii > 0), liczba dni, najdłuższa seria, 7 kropek (✓ w dniu nauki, dziś z obwódką). |
| Egzamin | 4 | Tylko z datą ustawioną w Certyfikacie C1 (`c1.daysUntil` / `countdownText`). Granat i złoto. |
| Dodaj błąd | 3 | Skrót do formularza dziennika. |
| Kontynuuj | 4 (12 przy kaflu egzaminu) | Ostatnio otwarta podstrona. |

**Zdanie zachęty**, w kolejności sprawdzania:
1. Dziś już była aktywność → „zaliczone, możesz odpocząć”.
2. Są powtórki → „N błędów czeka – to dobry start”.
3. Nic jeszcze nie zrobione → pierwszy punkt bieżącej stacji z linkiem do podstrony.
4. W pozostałych przypadkach → „Propozycja na dziś: …”.

**Animacje** (`js/motion.js`):
- Kafelki wchodzą kolejno (stagger 60 ms), duże liczby odliczają od zera.
- Przebyty odcinek szlaku „rysuje się” (DrawSVG), pinezka dojeżdża do stacji (MotionPath).
- Pierścienie wypełniają się przejściem CSS.
- Kolejne wejścia w tej samej sesji to tylko krótkie odświeżenie (250 ms).

**Szczegóły techniczne szlaku:**
- Środek pierścienia stacji leży dokładnie na punkcie ścieżki.
- Pinezka jest na osobnej warstwie SVG nad stacjami (`pointer-events: none`). Jej wielkość i uniesienie (32 px) są stałe w pikselach ekranu, niezależnie od skali `viewBox`.

### 3.3 Celebracje (etap 3)

Plik: `js/celebrate.js`.
- **Kamienie milowe:**
  - pierwsze „Umiem”, 10 / 25 / 50 / 100 „Umiem”;
  - poziom 25 / 50 / 75 / 100% (wszystkie kategorie);
  - seria 3 / 7 / 14 / 30 dni;
  - pierwsza sesja powtórek, ukończony test poziomu.
- **Każdy kamień milowy pokazujemy raz na profil.** Zapis w `elm_celebrated_v1` = `{ version: 1, profiles: { id: { ids } } }`, objęty eksportem, importem, resetem i usuwaniem profilu.
- **Profil z istniejącym postępem** przy pierwszym uruchomieniu (start aplikacji, zmiana profilu) dostaje zapis już osiągniętych kamieni bez pokazywania.
- **Forma:** karta „toast” na dole ekranu:
  - ikona w kolorze kontekstu (poziom albo akcent), tytuł fontem display i jedno zdanie;
  - znika po 2,8 s, robi pauzę pod kursorem, zamyka się kliknięciem lub Esc;
  - `role="status"` i `pointer-events` tylko na karcie, więc nie blokuje interfejsu;
  - kolejka pokazuje jedną kartę naraz, a przy kilku nowych kamieniach do 2 najważniejszych.
- **Konfetti:** 22 elementy DOM animowane GSAP przez około 1 s, w kolorze poziomu albo w kolorach krain, potem usuwane. Przy `prefers-reduced-motion` jest sama karta.
- **Teksty:** krótkie i konkretne, bez przesady (np. „Tydzień z rzędu – Siedem dni nauki bez przerwy.”, „A1 ukończony – … Następny przystanek: A2.”).

### 3.4 Strony poziomów (etap 3)

- **v7 (A4–A6):** bez warstwic w nagłówkach i hero (warstwice tylko w Szlaku). Punkty to wiersze (`.ess-item`: „Umiem” 44 px po lewej, tekst, chevron po prawej; cienka linia, hover `--row-hover`). Filtr kategorii ma pierwszą opcję „Wszystkie” (`ui.categoryId = "all"`): grupy z podtytułami h3, bez chipów kategorii.

- **Nagłówek:**
  - słowo „Poziom” wersalikami;
  - duży znak poziomu (`--fs-4xl`, `--lvl-ink`), nazwa i cel z opisu;
  - pierścień postępu całego poziomu (aktualizowany w miejscu po „Umiem”);
  - tło `linear-gradient(--lvl-soft → --surface)`.
- **Akcent:** na stronie poziomu i jego podstronach (`.view.lvl-XX`) `--accent`, `--accent-soft`, `--focus-color` i `--focus-ring` przyjmują kolor krainy. Linki, chipy i fokus są w kolorze poziomu, a przycisk główny zostaje w kolorze atramentu.
- **Kategorie:** filtr jako chipy (`.chip-btn`, `aria-pressed`, ✓ przy wybranym, 44 px).
- **Punkty:** karty z chipem kategorii i pigułką „Umiem”, ramka z domieszką koloru krainy. Zaznaczone mają tło `--lvl-soft`.
- **Strona główna:** wiersze tabeli „Poziomy w skrócie” mają pasek i tło przy najechaniu w kolorze krainy. Podsumowanie poziomu ma pasek krainy u góry.

### 3.5 Test poziomu i Dziennik błędów (etap 3)

- **Test:**
  - jedno pytanie na ekranie, kropki postępu z ✓ / ✗ (nie tylko kolor);
  - po odpowiedzi litera zamienia się w ✓ / ✗, a obok jest etykieta „Poprawna” / „Twoja odpowiedź”;
  - wynik pokazuje duży znak poziomu (`clamp` do 6,5 rem, kolor krainy) z animacją „wyskoczenia” (GSAP, bez ruchu przy `reduced-motion`).
- **Dziennik:**
  - pasek kategorii przy wpisie i karcie powtórki: tokeny `--cat-*` w obu motywach, ≥ 3:1 do karty, nazwa kategorii zawsze w chipie;
  - sesja powtórek: duża karta, kontekst fontem display, „Pokaż odpowiedź” (ikona oka), potem dwa wyraźne przyciski: „Wiedziałem(am)” (zielony, ✓) i „Znowu błąd” (ikona powtórki).

### 3.6 React Bits

Pominięte. Aplikacja nie jest w React, a brief dopuszczał ten krok tylko dla Reacta.

### 3.7 Treści podstron i callouty (etap 4)

- **Typografia treści.**
  - Akapity i listy mają najwyżej `--measure` (70 znaków).
  - H1, H2 i H3 są w kroju display (Fraunces), z wyraźnym krokiem rozmiaru (`--fs-2xl` / `--fs-xl` / `--fs-lg`).
  - Listy mają marker w kolorze poziomu, a interlinia tekstu to `--lh-body`.
- **Callouty.** `js/callouts.js` rozpoznaje sekcję po **tekście nagłówka**: `## H2` albo pogrubiony podtytuł `**…**` (`p.md-subhead`). Pliki `.md` zostają bez zmian. Reguły są w jednej tablicy `CALLOUT_RULES`, a pierwsza pasująca wygrywa:

  | Nagłówek zaczyna się od | Typ / klasa | Ikona | Wygląd |
  |---|---|---|---|
  | „Najczęstsza pułapka”, „Typowe błędy”, „Pułapka” | `callout-trap` | `triangle-alert` | bursztyn (`--warning-soft`), znaczniki list w `--warning` |
  | „Na egzaminie C1” | `callout-exam` | `award` | `--c1-soft`, złoty pasek z lewej, ikona złota na granacie |
  | „Kluczowe myśli”, „Co umiesz” | `callout-key` | `sparkles` | `--lvl-soft` (kolor poziomu) |
  | „Jesteś gotów/gotowy…”, „Co dalej” | `callout-next` | `map-pin` | przerywana ramka, linki jako przyciski-pigułki |
  | „Przykład…”, „Kluczowe zwroty”, „Typowe połączenia” | `callout-examples` | `list-checks` | lewy pasek poziomu, zdania angielskie (`em`, 1. kolumna tabeli) w `--lvl-ink` |

  **Jak dodać nowy callout:**
  1. Dopisz wpis do `CALLOUT_RULES` w `js/callouts.js`: `{ match: /^początek nagłówka/i, type: "nazwa", icon: "ikona-lucide", label: "…" }`.
  2. Dodaj w `css/style.css` (sekcja „TREŚCI PODSTRON”) reguły `.callout-nazwa` i `.callout-nazwa .callout-icon`, używając tylko tokenów.
  3. Jeśli ikony nie ma w `assets/ikony.js`, dopisz ją do listy w `tools/zbuduj-zasoby.js` i uruchom `npm run zasoby`.
  4. Nowe pary kolorów dopisz do `tools/kontrast.js`.
- **Tabele.**
  - Ramka `.md-table` z zaokrągleniem `--radius` i zebrą (`--surface-2` zmieszany z `--surface`).
  - Nagłówek ma tło `--surface-2`, tekst `--ink` 650 i mocniejszą linię `--line-strong`.
  - Przewijają się w poziomie wewnątrz ramki. Cienie po bokach (`.has-left` / `.has-right`) pokazują, że jest więcej treści.
  - Przewijana tabela jest regionem z nazwą i `tabindex="0"` (przewijanie z klawiatury).
- **Linki `[[id]]`.** `.wiki-chip`: pigułka w kolorze poziomu strony docelowej (`lvl-XX`), z ikoną `notebook-text` i kodem poziomu. Zestawy C1 (`.is-c1`) są granatowe ze złotem i mają ikonę `award`.
- **„Umiem” na wąskich ekranach.** Poniżej 760 px nagłówek podstrony `.page-head` jest przyklejony (`position: sticky`, tło `--sticky-bg`), więc „Umiem” jest zawsze pod ręką. Okruszki są wtedy ukryte.

### 3.8 Certyfikat C1 — własny klimat (etap 4)

- **Nagłówek sekcji `.c1-masthead`.**
  - Znak napisowy „C1 Advanced · przygotowanie” w kroju Fraunces, bez logo i grafik Cambridge.
  - Duża liczba dni do egzaminu (`--fs-3xl`, Fraunces, `tabular-nums`) albo link „Ustaw datę egzaminu”.
  - Na stronie przeglądu liczby nie ma, bo pokazuje ją karta z datą egzaminu.
- **Arkusz egzaminacyjny** (`.c1-ex.card`).
  - Górna krawędź 6 px w `--accent-bg` i delikatne linie papieru (`--line` 30%).
  - Numery zadań w kroju display.
  - Pola luk to linie do wpisywania (dolna krawędź 2 px `--line-control`).
  - Wynik zawsze jako ✓/✗ plus tekst i tło `-soft`, nie tylko kolor.
  - Przycisk „Dodaj do dziennika błędów” jest przy każdym błędzie.
- **Trenery (Writing, Speaking).**
  - Duży timer (`--fs-2xl`, Fraunces) i licznik słów.
  - Gdy widoczny timer działa, `html.focus-mode` przygasza resztę interfejsu (panel, pasek górny, nawigacja C1) do 30%.
  - Po najechaniu albo fokusie przygaszony element wraca do 100%, więc nic nie znika z klawiatury.
  - Tryb kończy się przy pauzie, końcu czasu albo zmianie strony.

### 3.9 Ćwiczenia: silnik zadań i Centrum ćwiczeń (rozbudowa v2)

- **Karta zadania** (`.ex-card`): nad kartą kropki postępu (te same co w teście poziomu: ✓ / ✗ w kropce). Typ zadania jest wersalikami, a polecenie w kroju display.
- **Wybór odpowiedzi.**
  - Natywne pola radio w `role="radiogroup"`, cała etykieta ma 48 px i jest celem kliknięcia.
  - Cyfra 1–4 w kółku: wybrana opcja dostaje tło `--accent-soft`, poprawna ✓ i „Poprawna”, błędna ✗ i „Twoja odpowiedź”.
  - Luka `___` to linia: po sprawdzeniu jest wypełniona na zielono albo na czerwono z przekreśleniem (zawsze z ikoną).
- **Ułóż zdanie.** Wyrazy to przyciski 44 px („tap-to-place”), a linia odpowiedzi to przerywana ramka. Po błędzie wyraz, od którego ułożenie różni się od wzoru, ma ✗ i tło `--danger-soft`.
- **Znajdź błąd.**
  - Wyrazy to przyciski z `aria-pressed`, zaznaczony ma podkreślenie w `--accent`.
  - Po sprawdzeniu błędny fragment ma bursztynowe tło `--warning-soft`, a źle wskazany fragment ma czerwoną linię.
- **Informacja zwrotna.**
  - Wyświetla się w `role="status"`: werdykt, wzór odpowiedzi, wyjaśnienie, ramka „Pułapka” w bursztynie.
  - Animacje: „pstryknięcie” karty (`ex-pop`) albo krótkie drżenie (`ex-shake`), oba w CSS i wyłączone przy `prefers-reduced-motion` (reguła globalna).
- **Telefon.** Przyciski „Sprawdź / Dalej” są przyklejone u dołu karty (`position: sticky`, tło `--sticky-bg`).
- **Wynik:** duża liczba w kroju display (`--fs-4xl`), ciepły komentarz według procentu i lista „Do poprawki”. W sesji mieszanej dochodzi trafność per temat.
- **Karty zestawów** (`.ex-set-card`): górny pasek w kolorze poziomu, najlepszy i ostatni wynik, przycisk „Zacznij”. Tak samo wyglądają w „Sprawdź się”, w Centrum ćwiczeń i na karcie czasu w Labie.

### 3.10 Laboratorium czasów (rozbudowa v2)

- **Tokeny grup czasów** (oś i akcenty, ≥ 3:1 do karty i tła, sprawdzane w `tools/kontrast.js`):

  | Token | Jasny | Ciemny |
  |---|---|---|
  | `--tense-past` | `#5b4bc4` (indygo) | `#b3a8ff` |
  | `--tense-present` | `#2c55c4` (akcent) | `#8db0ff` |
  | `--tense-future` | `#0e7682` (morski) | `#5fd3dc` |

  Klasa `.lab-group-<grupa>` ustawia `--tense`. Kolor grupy jest tylko na osi i w podkreśleniu kolumny mapy. Kafelki i karty czasów mają kolor **poziomu** (jak cała aplikacja).
- **Mapa:** trzy kolumny (Present / Past / Future) i cztery aspekty. Na wąskim ekranie kolumny są jedna pod drugą. Kafelek ma lewy pasek poziomu, kod poziomu i przykład kursywą.
- **Oś czasu** (SVG):
  - `-1 … 0 … 1`, kreska „teraz” przerywana;
  - punkty, odcinki 12 px z zaokrąglonym końcem, gradient „od dawna”, strzałka w przyszłość, romb „skutek”, pionowy znacznik odniesienia;
  - etykiety nad osią w rzędach bez nakładania;
  - zwarta wersja (440 jednostek) na telefonie i w kolumnach porównania, żeby napisy nie były drobniejsze niż ok. 12 px;
  - animacja GSAP DrawSVG: oś rysuje się od lewej, elementy pojawiają się kolejno. Przy `reduced-motion` od razu widać stan końcowy;
  - `role="img"` z opisem sceny i ten sam opis jako tekst pod osią.
- **Zakładki** to linki z `aria-current="page"` (każda ma swój adres). Na wąskim ekranie pasek zakładek przewija się w poziomie.
- **Dobierz czas:** duże przyciski odpowiedzi (56 px), ścieżka wyborów nad pytaniem, fokus wraca na nowe pytanie. Wynik to karty czasów z uzasadnieniem i przykładem.

### 3.11 Statystyki i automatyczny dziennik (rozbudowa v2, etap 2)

- **Wykresy według skilla `dataviz`, bez biblioteki** (HTML i SVG na tokenach).
  - Kafle liczb (wartość `--fs-2xl`, etykieta nad nią).
  - Poziome paski trafności: tor `--lvl-soft`, wypełnienie `--lvl`, 4 px zaokrąglenie na końcu.
  - Kolumny trendu: maks. 24 px, zaokrąglony tylko górny koniec, siatka 1 px ciągła.
  - Mapa aktywności: 12 × 7 pól po 16 px.
- **Kolor jest dodatkiem do treści.**
  - Paski tematów mają kolor poziomu i kod poziomu w etykiecie.
  - Wartości i etykiety są w kolorach tekstu, nigdy w kolorze danych.
  - Paleta poziomów przechodzi walidator CVD skilla w obu motywach (najsłabsza para ΔE 12,4 jasny / 11,6 ciemny).
- **Małe próbki.**
  - Poniżej 5 prób zamiast procentu jest „za mało danych”.
  - Kolumna trendu z < 5 próbami jest jaśniejsza.
  - Pod każdą kolumną jest `n=` (liczba prób).
- **Dostępność.**
  - Kolumny trendu mają fokus i `aria-label`, obok jest tabela w `<details>`.
  - Mapa aktywności ma `role="img"` z podsumowaniem tekstowym.
  - Bez porównań i rankingów.
- **Automatyczny dziennik.**
  - Wpisy z zadań mają chip z iskrą („Automatyczny · wrócił · błędów: N”) w `--accent-soft` i filtr chipem.
  - Podsumowanie sesji jest w ramce `--info-bg`.
  - Zaliczona powtórka to zielony znacznik ✓ w informacji zwrotnej.
- **Toast** (`ELM.ui.toast`): ciemna karta `--inverse-bg` u dołu ekranu (na telefonie nad przyciskami sesji), `role="status"`, 5 s, wstrzymywany przy najechaniu i fokusie, przycisk akcji podkreślony.
- **Sugestia „Umiem”:** ramka `--success-soft` z iskrą, „Zaznacz „Umiem”” i „Nie teraz”.
- **Przełącznik** w menu profilu: `role="switch"`, tor 40 × 24 px, włączony w `--success-fill`.

### 3.12 Wyszukiwarka i notatki (rozbudowa v2, etap 2)

- **Wyszukiwarka.**
  - Karta `--surface` na środku u góry (`min(720px, 100vw − 32px)`), na telefonie na całą szerokość.
  - Wysuwa się w 180 ms (bez ruchu przy `reduced-motion`).
  - Wyniki są pogrupowane (nagłówki wersalikami). Aktywna opcja ma tło `--accent-soft` i lewy pasek akcentu.
  - Dopasowania są podświetlone `<mark>` w bursztynie, wstawianym przez podział tekstu, nie HTML.
  - Strefa najechania ma 12 px wysokości, środkowe 50% obszaru treści i opóźnienie 400 ms.
- **Notatki.**
  - Przycisk „Notatki” (ikona zeszytu, kropka akcentu przy istniejącej notatce) stoi w nagłówku strony.
  - Panel pojawia się z prawej (400 px) na szerokim ekranie, a na telefonie jako dolna szuflada (do 70% wysokości).
  - Pole tekstowe w `--lh-body`, a pod nim status zapisu i licznik (od 80% limitu, przy limicie w `--danger`).

### 3.13 Egzaminy (rozbudowa v2, etap 3)

- **Grupa „Egzaminy” w panelu.**
  - Chip z kodem z rejestru (34 px, zaokrąglenie 10 px) ma tło w kolorze egzaminu (`--exam-accent` z rejestru) i dolny pasek w drugim kolorze (`--exam-accent-2`).
  - Pozycje „wkrótce” mają chip w `--surface-3` z obwódką, wyszarzony tytuł i plakietkę „wkrótce”.
  - Tekst na chipie jest biały (na turkusie E8 #0e7c86 kontrast 4,88:1).
- **Egzamin ósmoklasisty**: `html[data-section="egzamin-osmoklasisty"]` w klimacie przyjaznym, szkolnym i energicznym, bez dziecinności.

  | Token | Jasny | Ciemny |
  |---|---|---|
  | `--bg` / `--surface` | `#f8f5ec` / `#fffefa` (ciepłe tło) | `#0a181b` / `#0d2024` |
  | `--accent` | `#0a6770` (głęboki turkus) | `#66d3da` |
  | `--accent-bg` / `--on-accent` | `#0a5c64` / biały | `#f5c84a` / `#10201f` (żółty z ciemnym tekstem) |
  | `--e8-yellow` / `--e8-on-yellow` | `#f5b800` / `#1d2426` | `#f5c84a` / `#10201f` |

  - Żółty jest akcentem (pasek pod tytułem, dolna krawędź znaku E8, plakietki wyników) i zawsze dostaje ciemny tekst.
  - `tools/kontrast.js` sprawdza wszystkie pary także w zakresach E8 jasny i E8 ciemny (razem 678 par).
- **Ramki „Na egzaminie …”.**
  - Każdy egzamin ma osobną ramkę w swoim kolorze (tło 7% koloru egzaminu, lewy pasek), w kolejności z rejestru.
  - Kilka ramek stoi jedna pod drugą z odstępem 12 px.
- **Trener pisania E8.**
  - Licznik ma strefy w ramce: czerwona < 40 („Poniżej 40 wyrazów ocenia się tylko treść”), żółta 40–49 i > 120 („Przekraczasz limit”), zielona 50–120. Kolor zawsze idzie w parze z tekstem.
  - Po zakończeniu: podpunkty, samoocena wg kryteriów 4/2/2/2 i wzór obok tekstu.
- **Silnik zadań.**
  - Tekst do czytania na szerokim ekranie jest przyklejonym panelem obok zadań, a na wąskim zwijanym blokiem.
  - Słuchanie ma panel `--surface-2` z „Odtwórz”, licznikiem „Odsłuchy: n/2” i notą o głosie syntezowanym.
- **„W trakcie pracy”.** Karta z ilustracją SVG (kompas na rusztowaniu, w tokenach), plakietką w `--warning-soft`, opisem z rejestru i przyciskami „Wróć do Dziś” oraz „Zobacz: Egzamin ósmoklasisty”. Bez pustych tabel i martwych linków.

### 3.13a „Moje egzaminy” i okładki (paczka v7, etap 2)

- **Moje egzaminy** (`ELM.examLogic.myExams`, czysta funkcja z testami): egzamin jest mój, gdy ma ustawioną datę albo ukończony zestaw i nie został odpięty ręcznie; ręczne przypięcie działa też bez daty i zestawów. Override w `elm_exams_v1 … profiles[id].my = { "<id>": "pinned" | "hidden" }` (dotyczy też C1, którego data i wyniki zostają w `elm_c1_v1`). Kolejność: najbliższa data, potem minione terminy, na końcu egzaminy bez daty.
- **Gdzie widać:** strona główna (sekcja „Twoje egzaminy”, kafle mini albo jedna linijka podpowiedzi), Dziś (maks. 2 kafle mini), podpis w panelu (odliczanie tylko przy moich), przycisk „Przypnij do Dziś” / „Odepnij…” na stronie startowej egzaminu. Kafel C1 z głównej i Dziś usunięty.
- **Karta daty** `ELM.examDate.card`: duża liczba dni (Fraunces) albo tekst stanu, pole daty, zapis „czwartek, 6 maja 2027”, akcje `.btn-link` „Wstaw termin główny” (E8, MP, MR) i „Usuń datę”; B2 i C1: „Termin zależy od centrum egzaminacyjnego.”. Poniżej 640 px jedna kolumna.
- **Okładki** (`ELM.examCover`): pełna (strona startowa: pasek 10 px w `accent2`, kod Fraunces 56–88 px, nazwa, `subtitle` z `dane/egzaminy-manifest.json`), kompaktowa (podstrony: pasek 6 px, kod 28 px) i mini (kafel: pasek 8 px, kod 32 px, odliczanie, „zestawy 4/12”). Mini poza sekcją egzaminu bierze kolory z `--exam-accent` (jasny) i `--exam-accent-2` (ciemny); `tools/kontrast.js` sprawdza te pary.
- Rejestr (`dane/egzaminy-rejestr.js`) ma dla każdego egzaminu `setIds` (postęp bez wczytywania danych egzaminu).

### 3.14 Komponenty paczki v6 (rozbudowa v6, etapy 1–11)

Wszystkie na istniejących tokenach (bez nowych kolorów), z parami sprawdzanymi przez `node tools/kontrast.js`, celami ≥ 44 px i szanowaniem `prefers-reduced-motion`.

- **Callout „Życie i egzamin” (`.callout-real-exam`).**
  - Tło `--info-bg`, obwódka `--info-border`, lewy pasek 4 px w `--accent` (`inset box-shadow`), ikona na `--surface` z pierścieniem.
  - W środku tabela „Z życia” / „W stylu egzaminu” bez minimalnej szerokości; do 640 px każdy wiersz staje się kartą (etykieta z `data-label` nad treścią), bez przewijania w poziomie.
  - Wiersze zawsze zaczynają się od chipów egzaminów, więc kolor nigdy nie jest jedynym nośnikiem informacji.
- **Chipy egzaminów.**
  - W tekście: `.exam-chip` (pigułka, lewy pasek 4 px w `--exam`, tekst „E8”, „MP”, „MR”, „B2”, „C1”; strefa trafienia powiększona o `::before` do ≥ 44 px).
  - W lewym panelu: `.sb-item.exam-chip` z odznaką `.exam-chip-badge` (kolor egzaminu + dolny pasek w drugim kolorze). Certyfikat C1 używa tego samego komponentu (granat `--c1-navy`, złoto `--c1-gold`), a jego sekcje pojawiają się tylko wewnątrz C1, jak u pozostałych egzaminów.
- **Komentarze na marginesie (`.wz-*`, widok wzorca w Pisaniu).**
  - Kotwica `.wz-anchor`: tło 16% koloru typu komentarza (`--wz`) i dolna kreska, więc typ rozpoznaje się też po ikonie i podpisie, nie tylko po kolorze.
  - Od 1024 px komentarze stoją w prawym marginesie na wysokości kotwic, a cienka linia SVG (`.wz-line`) łączy je z tekstem; węziej kotwica ma numer i rozwija komentarz pod akapitem.
  - Filtry typów (`.wz-filter`, ≥ 44 px, `aria-pressed`; wyłączony = przekreślony i przygaszony). Druk: komentarze jako przypisy.
- **Znaczek poziomu (`.lvl-stamp`).** Mała odznaka na kółku poziomu (`.sb-ring-wrap`) w panelu, na Szlaku i w nagłówku poziomu po zaliczeniu testu końcowego; zawsze z tekstem „zaliczony” (`.lvl-passed-label`, `.trail-passed`), a nie samym kolorem. Znaczek zostaje po późniejszej porażce.
- **Menu zaznaczenia (`.fc-sel-menu`).** Pływający pasek przy zaznaczonym tekście w obszarach `[data-fc-selectable]` („Do Moich słów”, „Dodaj znaczenie”): `position: fixed`, `z-index: 60`, przyciski `min-height: 44px`, `mousedown` nie gubi zaznaczenia, Escape zamyka.
- **Bank zwrotów i panel „Zwroty” (`.zw-*`).** Filtry w `.journal-filters`, spis grup przyklejony z lewej od 900 px albo poziomy pasek chipów, gwiazdka ulubionych z tekstem i `aria-pressed`; panel w trenerze pisania z boku od 900 px, na telefonie arkusz od dołu (animacja tylko przy `prefers-reduced-motion: no-preference`).
- **Trener mówienia i nagrywanie (`.sp-*`, `.rec-*`).** Zakładki części (`role="tablist"`, strzałki, Home/End), czerwona kropka i tekst „Nagrywanie 0:23” (kropka pulsuje tylko bez `prefers-reduced-motion`), lista prób z odtwarzaczem, Pobierz i Usuń, numerowane opcje wyboru ilustracji, pasek postępu trybu „Cały egzamin”.

## 4. Ruch

- **Proste rzeczy tylko w CSS.** Hover, focus, pojawianie się i przejścia kolorów robi CSS. Animujemy `opacity` i `transform`. Wyjątek to krótkie przejście kolorów przy zmianie motywu (klasa `html.theme-anim`).
- **Czasy.** `--dur-fast` dla mikrointerakcji, `--dur-base` dla wejść i menu, `--dur-slow` dla pasków i pierścieni. Nic dłuższego niż 400 ms poza celebracjami (etap 3).
- **GSAP.** Plik `assets/vendor/gsap.min.js` (npm `gsap`, darmowy ze wszystkimi wtyczkami) skopiowany przez `npm run zasoby`.
  - Ładujemy go **tylko na żądanie**: `ELM.loadGsap().then(gsap => …)` wstrzykuje `<script>`. Działa także przy `file://`, gdzie dynamiczny `import()` modułów jest zablokowany.
  - Każda animacja przez `gsap.matchMedia()` z gałęzią `(prefers-reduced-motion: reduce)` bez ruchu.
  - Przy opuszczeniu widoku: `mm.revert()` / `ctx.revert()`. Aplikacja nie używa Reacta, więc zamiast `useGSAP` sprzątamy przy zmianie trasy.
  - Wszystkie animacje GSAP przechodzą przez `js/motion.js`: `ELM.motion.run(plugins, setup)` ładuje GSAP i wtyczki, wywołuje `setup(gsap, reduce)` w `gsap.matchMedia()` i sprząta (`mm.revert()`) przy następnej animacji i przy zmianie strony (`app.onRoute`). Gdy GSAP się nie wczyta albo ruch jest ograniczony, widok od razu pokazuje stan końcowy.
  - Używane wtyczki: DrawSVG i MotionPath (tylko szlak na „Dziś”). Pliki `assets/vendor/*.min.js` kopiuje `npm run zasoby`.
  - Gdzie ładowany: „Dziś”, ekran wyniku testu, celebracje i oś czasu w Laboratorium czasów. Pozostałe ekrany GSAP nie ładują (animacje zadań są w CSS). Etap 4 nie dodał animacji GSAP (callouty, arkusz i tryb skupienia to CSS).
  - Szlak liczy długość do stacji jednym `getTotalLength()` na ścieżce przyciętej do kolejnych odcinków. Nie próbkujemy `getPointAtLength()`, bo przy CPU 4× kosztowało to ok. 650 ms na render.
- **Bez wygładzania przewijania.** Nie używamy Lenis ani podobnych bibliotek. Przewijanie jest natywne (zagnieżdżone panele, pola tekstowe, iPad).
- **Bez ciężkich efektów tła.** Zakazane są WebGL i canvas z cząsteczkami.
- **`prefers-reduced-motion: reduce`.** Globalna reguła skraca animacje i przejścia do 0.01 ms. Zostają tylko zmiany natychmiastowe (kolor, krycie bez ruchu).

## 5. Dostępność

- **Kontrast WCAG AA.** Tekst ≥ 4.5:1, komponenty, obramowania pól, paski i znaczniki ≥ 3:1, w obu motywach. Sprawdza to `node tools/kontrast.js`: 98 par w 4 zakresach (jasny, ciemny, C1 jasny, C1 ciemny), razem 392 sprawdzenia. Palety poziomów sprawdza walidator CVD (sekcja 2.3).
- **Widoczny focus.** `:focus-visible`, obrys 2 px w kolorze akcentu, na każdym elemencie interaktywnym.
- **Cele dotykowe.** Min. 44 × 44 px przy `pointer: coarse` oraz w menu, przełącznikach i przyciskach ikon.
- **Kolor nigdy nie jest jedynym nośnikiem informacji.** Poziomy mają kody, stany ikonę lub słowo, wynik ćwiczenia ✓/✗ plus tekst.
- **Ikony.** Ikony dekoracyjne mają `aria-hidden="true"`. Przycisk z samą ikoną ma `aria-label` i podpowiedź.
- **Ruch.** Zgodnie z sekcją 4 (`prefers-reduced-motion`).
- **Nazwa dostępna = widoczny tekst** (WCAG 2.5.3). Nie nadpisujemy widocznego napisu przez `aria-label`. Dodatkowy kontekst dla czytników dajemy w `<span class="visually-hidden">` (przycisk profilu, znak C1, licznik dni).
- **Linki w tekście** są podkreślone, nie tylko kolorowe (WCAG 1.4.1).
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
| `gsap` | 3.15 | GreenSock „no charge” (standardowa licencja, od 3.13 bezpłatna także z wtyczkami) | `npm run zasoby` → `assets/vendor/gsap.min.js`, `DrawSVGPlugin.min.js`, `MotionPathPlugin.min.js` (ładowane na żądanie) |

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
6. Wydajność (od etapu 4):
   - Lighthouse mobile i desktop na serwerze z gzip (jak GitHub Pages), z profilem testowym w `localStorage`. Bez profilu Lighthouse mierzy ekran powitalny.
   - Płynność animacji przy `Emulation.setCPUThrottlingRate` 4× na 390 i 1280 px.

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

**Etap 3 (Dziś, celebracje, poziomy, test, dziennik):**
- Audyt Playwright, oba motywy, 11 tras, 1280 i 390 px:
  - kontrast wyrenderowanego tekstu i nazwy dostępne: 0 problemów;
  - fokus widoczny, 200% bez przewijania w poziomie;
  - po poprawce chipy kategorii mają 44 px.
- Kontrast tokenów: 188 par (doszły paski kategorii, etykiety testu, kafel egzaminu). Ciemny `--success-fill` rozjaśniony do `#2fa35d`, żeby granatowy tekst miał ≥ 4.5:1.
- Testy zachowania:
  - celebracje: pierwsze „Umiem”, 10 „Umiem” i A1 25% w kolejce, Esc, brak powtórzeń, sama karta przy `reduced-motion`;
  - szlak: pinezka nad bieżącą stacją, w trybie z animacją i bez.
- Krytyka:
  - szlak na tablecie poziomy (próg 480 px), bo pionowy zostawiał pustą połowę kafla;
  - link propozycji w hero w osobnej linii.
- Rozmiar:
  - kod ładowany zawsze: 376.0 → 421.3 KB (gzip 115.4 → 130.9 KB, czyli +15.4 KB);
  - GSAP z wtyczkami na żądanie: 97 KB (gzip 39.4 KB), w tym rdzeń 71.2 KB, DrawSVG 4.2 KB i MotionPath 21.5 KB.

**Etap 4 (treści podstron, Certyfikat C1, kontrola jakości):**
- **Krytyka** (36 zrzutów: „Dziś”, poziom, podstrona z calloutami i tabelą, ćwiczenie C1, trener, przegląd C1; oba motywy; 390 / 768 / 1280 px):
  - bez przewijania w poziomie i bez błędów w konsoli;
  - poprawki: nagłówek C1 bez powtórzonej liczby dni na stronie przeglądu, jaśniejsza kość słoniowa (`--bg #f9f4e8`), bo poziom A2 / C1 miał na niej 2,9:1.
- **Dostępność:**
  - audyt Playwright: 13 tras, oba motywy, 1280 i 390 px, 0 problemów z kontrastem, nazwami, fokusem, celami < 44 px i powiększeniem 200%;
  - Lighthouse wskazał 3 nazwy dostępne niezgodne z widocznym tekstem i link w okruszkach C1 wyróżniony tylko kolorem; poprawione, teraz dostępność 100 na wszystkich mierzonych ekranach.
- **Kontrast tokenów:** 392 sprawdzenia, 0 niezgodnych.
- **Audyt design-system:**
  - 184 literały kolorów, wszystkie w definicjach tokenów, poza nimi 0;
  - w JS tylko udokumentowany `THEME_COLOR`;
  - usunięty nieużywany `--success-border`, a `--lh-body` i `--measure` podpięte w treściach;
  - nieużywane, ale celowo zostawione: kroki skali `--space-1/3/7/8` i `--radius-xl`.
- **Lighthouse** (serwer z gzip, profil testowy, symulowane wolne 4G i CPU 4×):

  | Ekran | Wydajność | Dostępność | FCP | LCP | TBT | CLS |
  |---|---|---|---|---|---|---|
  | „Dziś”, mobile | 81 | 100 | 0,9 s | 5,2 s | 80 ms | 0,003 |
  | Podstrona A2 z calloutami, mobile | 82 | 100 | 0,9 s | 4,8 s | 120 ms | 0,003 |
  | Ćwiczenie C1, mobile | 85 | 100 | 0,9 s | 4,4 s | 50 ms | 0,003 |
  | „Dziś”, desktop | 98 | 100 | 0,2 s | 1,1 s | 0 ms | 0,001 |

  - `defer` na skryptach skrócił FCP mobile z 3,2 s do 0,9 s.
  - LCP mobile ogranicza pobranie ok. 520 KB (gzip) przed pierwszym renderem widoku, w tym 131 KB treści Niezbędnika i 41 KB danych C1.
  - Kolejny krok poza zakresem etapu to ładowanie danych C1 i testu poziomu na żądanie.
- **Płynność** (CPU 4×, 390 i 1280 px, 8 tras):
  - animacje mają p95 klatki 17 ms, czyli 60 kl./s;
  - przy wejściu na trasę jest jedna dłuższa klatka renderu;
  - render „Dziś” trwał 540 ms przez próbkowanie szlaku; po uproszczeniu trwa 240 ms, a najdłuższa klatka spadła z ok. 500 do 50–67 ms.
- **Rozmiar** (wszystko, co ładuje `index.html`, gzip):

  | Wersja | JS | CSS | Fonty | Razem |
  |---|---|---|---|---|
  | przed projektem (`b3b65c4`) | 261 KB | 12 KB | — | 275 KB |
  | po etapie 4 | 285 KB | 29 KB | 196 KB | 523 KB |

  - Różnica wynosi +248 KB, z czego 196 KB to fonty (pobierane raz, z pamięci podręcznej).
  - Etap 4 dodał +6 KB gzip (callouty, C1, CSS).
  - GSAP z wtyczkami (97 KB, gzip 39 KB) ładuje się tylko na żądanie.

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
- **Etap 3.**
  - „Dziś” jako kokpit bento ze szlakiem A1 → C2 i animacjami GSAP (`js/motion.js`).
  - Celebracje kamieni milowych (`js/celebrate.js`, `elm_celebrated_v1`).
  - Nagłówki i karty stron poziomów z akcentem krainy.
  - Test z kropkami i wyraźnymi stanami, dziennik z paskami kategorii.
  - Układ ekranów bez zmian.
- **Etap 4.**
  - Callouty po tekście nagłówków (`js/callouts.js`), typografia treści, tabele z zebrą i cieniami przewijania, chipy `[[id]]`, przyklejone „Umiem” na telefonie.
  - Certyfikat C1: tokeny sekcji (kość słoniowa / północny granat ze złotem), nagłówek z liczbą dni, arkusz egzaminacyjny, tryb skupienia trenerów.
  - Kontrola jakości: `defer` skryptów, szybszy szlak, poprawki nazw dostępnych.
  - Bez nowych kluczy `localStorage` i bez zmian w plikach `.md` i danych.

- **Paczka v6 (etapy 1–11).**
  - Nowe komponenty opisane w 3.14: callout „Życie i egzamin”, chipy egzaminów (także C1 w panelu), komentarze na marginesie, znaczek poziomu, menu zaznaczenia, bank zwrotów, trener mówienia z nagrywaniem.
  - Kontrola końcowa: pełny walidator v6 w `npm run validate` i `build`, przegląd 360 / 768 / 1280 px w obu motywach.

- **Paczka v7, etap „układ” (A1–A8).**
  - Tokeny `--w-text` / `--w-wide`, jedna lewa krawędź; przyciski o jednym kształcie, `.btn-link`, `.crumb`.
  - `ELM.ui.pageHead` (etykieta `.eyebrow` zamiast ikony w kółku); warstwice usunięte z nagłówków i hero.
  - Wiersze zamiast kart (lista poziomu, „Na skróty”), filtr „Wszystkie”, siatki `minmax(260px, 1fr)`.
  - Ramki „Na egzaminie …” przed „Życie i egzamin” (`examBoxAnchorIndex` + test). Bez zmian kluczy `localStorage`.

- **Paczka v7, etap „egzaminy” (B1–B3).**
  - „Moje egzaminy”: `myExams` + pole `my` w `elm_exams_v1`; sekcja na stronie głównej, kafle na Dziś, przypinanie, wskaźnik w panelu tylko dla moich.
  - Jedna karta daty (`ELM.examDate.card`) dla C1 i egzaminów z rejestru, polski zapis daty, „Wstaw termin główny”, „Usuń datę”.
  - Okładki egzaminów (pełna, kompaktowa, mini), pole `subtitle` w manifeście, nowe pary w `tools/kontrast.js`.
