# Instrukcja dla nauczyciela

## 1. Jak otworzyć stronę

1. Otwórz folder `english-levels-map`.
2. Kliknij dwukrotnie plik **`index.html`**. Strona otworzy się w domyślnej przeglądarce. Internet ani żaden program nie są potrzebne.

Najlepiej działają aktualne wersje przeglądarek Chrome, Edge, Firefox i Safari. Strona jest przeznaczona na komputer z szerokim ekranem.

### Lista bazowa „Niezbędnik do rozmowy”

Przy pierwszym otwarciu strona ma już wczytaną listę umiejętności dla wszystkich poziomów. To **baza do edycji**: w trybie edycji możesz zmieniać, dodawać, usuwać i przesuwać każdy punkt. Twoje zmiany zapisują się w przeglądarce.

Do tej listy wraca opcja **Dane → Zresetuj wszystko**. Ta sama lista jest też w pliku `dane/niezbednik-A1-C2.json`. Możesz go zaimportować (**Dane → Importuj treści…**), żeby przywrócić bazę bez kasowania postępu ucznia.

Lista ma trzy kategorie:
- **Gramatyka i czasy**: punkty z bloków „Czasy” i „Gramatyka”,
- **Funkcje komunikacyjne**,
- **Słownictwo**: zasób słów oraz każdy obszar tematyczny jako osobny punkt.

„Cel” i nazwa każdego poziomu (np. „Początkujący”) trafiają do opisu poziomu.

## 2. Jak zbudowana jest strona

- **Strona główna** (po otwarciu strony albo po kliknięciu „English Levels Map” w lewym górnym rogu): opis, tabela poziomów z linkami i orientacyjny czas nauki.
- **Strona poziomu** (np. `#/a1`): lista umiejętności, a pod nią **podsumowanie poziomu**.
- **Lewy pasek:** poziomy A1–C2. Przy każdym poziomie jest pasek postępu i licznik „X / Y umiem” dla aktualnie wybranej kategorii.
- **Na dole lewego paska:** przełącznik **Tryb edycji** i przycisk **Dane** (kopie zapasowe).
- **Prawy górny róg:** wybór **profilu**, czyli osoby lub klasy, której postęp śledzisz.
- **Prawa część:** wybrany poziom, czyli opis, kategorie, **Essentials** (lista umiejętności z polem „Umiem”) i **Tematy**.

Uczeń korzysta ze strony w trybie podglądu. Może tylko zaznaczać „Umiem” i odkrywać odpowiedzi do ćwiczeń.

### Podstrony z wyjaśnieniami (Niezbędnik)
Przy punktach, które mają podstronę, tekst jest linkiem ze strzałką **›** (wszystkie poziomy A1–C2). Po kliknięciu otwiera się podstrona z zasadą, tabelami, przykładami, typowymi błędami i ćwiczeniem.
- **← Wróć do listy** przenosi z powrotem do tego samego miejsca na liście. Działa też przycisk Wstecz w przeglądarce.
- Przełącznik **Umiem** na podstronie to ten sam stan co na liście, dla wybranego profilu.
- **Pokaż odpowiedzi** odkrywa odpowiedzi do ćwiczenia.
- Treść podstron pochodzi z plików `.md` w folderze `niezbednik/` i nie jest edytowana w aplikacji. Opis dodawania kolejnych poziomów jest w README.

### Profile
Każdy profil (na start: **Adam, Klasa 1, Klasa 4, Klasa 6**) ma **własne zaznaczenia „Umiem”**. Treść jest wspólna dla wszystkich profili.
- Kliknij przycisk profilu w prawym górnym rogu i wybierz profil z listy. Przy każdym widać, ile punktów ma zaznaczonych.
- Paski postępu i liczniki zawsze pokazują postęp **wybranego** profilu.
- W **Trybie edycji** w tym samym menu możesz dodać profil (**+ Nowy profil**), zmienić jego nazwę (**✎**), przesunąć go (**↑ ↓**) albo usunąć (**✕**, razem z jego postępem, po potwierdzeniu). Zawsze musi zostać co najmniej jeden profil.

## 3. Dodawanie treści (tryb edycji)

Włącz **Tryb edycji** w lewym dolnym rogu. Przy elementach pojawią się pola i małe przyciski:

| Przycisk | Działanie |
|---|---|
| **+ Dodaj …** | dodaje nowy element |
| **↑ / ↓** | przesuwa element w górę lub w dół |
| **← / →** | przesuwa kategorię lub temat w lewo lub w prawo |
| **✕** / **Usuń …** | usuwa element (zawsze po potwierdzeniu) |

Wszystko zapisuje się **automatycznie**. Pod przełącznikiem widać napis „Zapisano o …”.

### Opis poziomu
Pole „Krótki opis poziomu” pod dużym kodem poziomu. Jest opcjonalne. Pusty opis nie wyświetla się uczniowi.

### Kategorie
Kategorie (np. „Gramatyka i czasy”) są **wspólne dla wszystkich poziomów**, a treść jest osobna dla każdego poziomu.
- **+ Kategoria** dodaje nową kategorię (np. „Słownictwo”, „Pisanie”).
- **Zmień nazwę**, **← →** i **Usuń kategorię** działają na aktualnie wybranej kategorii.
- Uwaga: usunięcie kategorii kasuje jej treść na **wszystkich** poziomach.

### Essentials
Lista najważniejszych umiejętności poziomu w danej kategorii.
- **+ Dodaj punkt** dodaje punkt, potem wpisujesz jego treść.
- Pole **Umiem** zaznacza uczeń. Paski postępu zmieniają się od razu.

### Tematy
- **+ Dodaj temat** tworzy nowy temat i ustawia kursor w polu „Nazwa”.
- Każdy temat ma sekcje: **Nazwa, Zasada, Wzór, Przykłady, Typowe błędy, Ćwiczenia**.
- **Wzór** jest pisany czcionką o stałej szerokości, a odstępy zostają zachowane, co przydaje się do schematów zdań.
- **Typowe błędy:** zdanie błędne, zdanie poprawne i opcjonalna notatka.
- **Ćwiczenia:** polecenie i opcjonalna odpowiedź. Uczeń widzi odpowiedź dopiero po kliknięciu „Pokaż odpowiedź”.
- Sekcje, których nie wypełnisz, nie wyświetlają się uczniowi.

### Formatowanie tekstu
- Nowa linia (Enter) zostaje zachowana.
- `**tekst**` wyświetli się jako **pogrubienie**.
- Inne znaczniki (np. HTML) wyświetlają się jako zwykły tekst.

Po skończeniu pracy **wyłącz Tryb edycji**, żeby zobaczyć stronę tak, jak zobaczy ją uczeń.

## 4. Kopie zapasowe (menu „Dane”)

> **Dane zapisują się tylko w tej przeglądarce na tym komputerze.** Wyczyszczenie danych przeglądarki, inna przeglądarka albo inny komputer oznaczają brak treści. Dlatego **rób eksport co jakiś czas**.

Treści oraz profile z postępem są zapisywane **osobno**:

| Opcja | Co robi |
|---|---|
| **Eksportuj treści** | pobiera plik `english-levels-content-RRRR-MM-DD.json` (kategorie, essentials, tematy) |
| **Importuj treści…** | wczytuje taki plik. Najpierw pokazuje, co zawiera, i prosi o potwierdzenie. **Nie rusza profili ani postępu.** |
| **Eksportuj profile i postęp** | pobiera plik `english-levels-progress-RRRR-MM-DD.json` ze wszystkimi profilami i ich zaznaczeniami „Umiem” |
| **Importuj profile i postęp…** | wczytuje taki plik i zastępuje wszystkie profile (z potwierdzeniem). Plik ze starszej wersji strony (bez profili) trafia do aktualnie wybranego profilu. |
| **Zresetuj postęp profilu „…”** | usuwa zaznaczenia „Umiem” tylko wybranego profilu |
| **Zresetuj wszystko** | przywraca listę bazową i domyślne profile bez postępu (wymaga dwóch potwierdzeń) |

Przechowuj pliki kopii w bezpiecznym miejscu, np. na dysku w chmurze albo na pendrivie.

## 5. Przenoszenie danych na inny komputer lub do innej przeglądarki

1. Na starym komputerze: **Dane → Eksportuj treści** (i ewentualnie **Eksportuj profile i postęp**).
2. Skopiuj folder strony i pliki `.json` na nowy komputer.
3. Na nowym komputerze otwórz `index.html` i wybierz **Dane → Importuj treści…** (oraz **Importuj profile i postęp…**).

Profile i postęp są zapisane w przeglądarce, w której je zaznaczasz. Jeśli uczniowie korzystają z własnych komputerów, każdy ma u siebie osobny zestaw profili.

## 6. Gdy coś pójdzie nie tak

- Jeśli zapisane dane są uszkodzone, strona pokaże komunikat z przyciskiem **Importuj kopię treści…**. Wybierz ostatni plik eksportu.
- Jeśli pojawi się ostrzeżenie, że pamięć przeglądarki jest niedostępna (np. w trybie prywatnym), zmiany nie będą zapisywane. Otwórz stronę w zwykłym oknie przeglądarki.

## 7. Publikacja na GitHub Pages

Dzięki temu strona będzie dostępna pod adresem internetowym, np. `https://twoja-nazwa.github.io/english-levels-map/`.

### Krok 1: konto i Git
1. Załóż darmowe konto na <https://github.com>.
2. Zainstaluj Git: <https://git-scm.com/downloads>.

### Krok 2: repozytorium lokalne
W tym projekcie repozytorium jest już zainicjowane, a pierwszy commit już istnieje. Gdybyś zaczynać od zera, otwórz terminal w folderze `english-levels-map` i wpisz:

```bash
git init
git add .
git commit -m "Pierwsza wersja"
```

### Krok 3: repozytorium na GitHubie
1. Na GitHubie kliknij **New repository**.
2. Nazwa: `english-levels-map`. Widoczność: **Public** (darmowe GitHub Pages wymaga publicznego repozytorium).
3. **Nie** zaznaczaj „Add a README”. Kliknij **Create repository**.

### Krok 4: wysłanie plików
W terminalu, w folderze projektu (zamień `TWOJA-NAZWA` na swoją nazwę użytkownika):

```bash
git branch -M main
git remote add origin https://github.com/TWOJA-NAZWA/english-levels-map.git
git push -u origin main
```

### Krok 5: włączenie Pages
1. W repozytorium na GitHubie wejdź w **Settings → Pages**.
2. W polu **Source** wybierz **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**. Kliknij **Save**.
4. Po 1–2 minutach strona będzie dostępna pod adresem pokazanym na górze tej zakładki.

### Krok 6: aktualizacje kodu
Po zmianach w plikach strony:

```bash
git add .
git commit -m "Opis zmiany"
git push
```

> ⚠️ **Ważne: dane w `localStorage` są osobne dla każdej przeglądarki i każdego adresu strony.**
> Treści wpisane w wersji otwartej z dysku (`file://…`) **nie pojawią się automatycznie** na GitHub Pages (`https://…github.io/…`) i odwrotnie.
> Po przeniesieniu strony zrób **Dane → Eksportuj treści** w starej wersji, a potem **Dane → Importuj treści…** w nowej.
>
> Pliki eksportu nie są wysyłane na GitHub (blokuje to `.gitignore`). Każda osoba, która otwiera stronę na swoim komputerze, zaczyna od listy bazowej (niezbędnik A1–C2). Twoje własne zmiany zobaczy dopiero po zaimportowaniu Twojego pliku treści albo po wpisaniu ich do `js/base-content.js` (patrz README).
