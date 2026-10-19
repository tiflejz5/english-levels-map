# Instrukcja dla nauczyciela

## 1. Jak otworzyć stronę

1. Otwórz folder `english-levels-map`.
2. Kliknij dwukrotnie plik **`index.html`**. Strona otworzy się w domyślnej przeglądarce. Internet ani żaden program nie są potrzebne.

Najlepiej działają aktualne wersje przeglądarek Chrome, Edge, Firefox i Safari. Strona działa na komputerze, tablecie i telefonie.

### Lista bazowa „Niezbędnik do rozmowy”

Przy pierwszym otwarciu strona ma już wczytaną listę umiejętności dla wszystkich poziomów. Lista nie jest edytowana w aplikacji (zmiany wprowadza się w plikach strony, patrz README).

Do tej listy wraca opcja **Dane → Resetuj dane…** w menu profilu.

Lista ma trzy kategorie:
- **Gramatyka i czasy**: punkty z bloków „Czasy” i „Gramatyka”,
- **Funkcje komunikacyjne**,
- **Słownictwo**: zasób słów oraz każdy obszar tematyczny jako osobny punkt.

„Cel” i nazwa każdego poziomu (np. „Początkujący”) trafiają do opisu poziomu.

## 2. Jak zbudowana jest strona

- **Strona główna** (po otwarciu strony albo po kliknięciu „English Levels Map” w lewym górnym rogu): opis, tabela poziomów z linkami i orientacyjny czas nauki.
- **Strona poziomu** (np. `#/a1`): lista umiejętności, a pod nią **podsumowanie poziomu**.
- **Lewy pasek:** poziomy A1–C2. Przy każdym poziomie jest pasek postępu i licznik „X / Y umiem” dla aktualnie wybranej kategorii.
- **Prawy górny róg:** przycisk **motywu** (Automatycznie / Jasny / Ciemny) i **menu profilu**: wybór osoby lub grupy, której postęp śledzisz, oraz sekcja **Dane** (kopie zapasowe).
- **Prawa część:** wybrany poziom, czyli opis, kategorie, **Essentials** (lista umiejętności z polem „Umiem”) i **podsumowanie poziomu**.

Na stronie zaznacza się „Umiem” i odkrywa odpowiedzi do ćwiczeń. Na telefonie i tablecie lewy pasek otwierasz przyciskiem **☰ Menu**.

### Podstrony z wyjaśnieniami (Niezbędnik)
Przy punktach, które mają podstronę, tekst jest linkiem ze strzałką **›** (wszystkie poziomy A1–C2). Po kliknięciu otwiera się podstrona z zasadą, tabelami, przykładami, typowymi błędami i ćwiczeniem.
- **← Wróć do listy** przenosi z powrotem do tego samego miejsca na liście. Działa też przycisk Wstecz w przeglądarce.
- Przełącznik **Umiem** na podstronie to ten sam stan co na liście, dla wybranego profilu.
- **Pokaż odpowiedzi** odkrywa odpowiedzi do ćwiczenia.
- Treść podstron pochodzi z plików `.md` w folderze `niezbednik/` i nie jest edytowana w aplikacji. Opis dodawania kolejnych poziomów jest w README.

### Profile
Przy pierwszym otwarciu strona nie ma żadnych profili i pokazuje **ekran powitalny**: wpisz nazwę (np. swoje imię, imię ucznia albo nazwę klasy) i kliknij **Dodaj profil**. Każdy profil ma **własne zaznaczenia „Umiem”**. Treść jest wspólna dla wszystkich profili. Profile i postęp zapisują się tylko w tej przeglądarce.
- Kliknij przycisk profilu w prawym górnym rogu i wybierz profil z listy. Przy każdym widać, ile punktów ma zaznaczonych.
- Paski postępu i liczniki zawsze pokazują postęp **wybranego** profilu.
- W tym samym menu możesz dodać profil (**+ Dodaj profil**, Enter zatwierdza, Esc anuluje), zmienić jego nazwę (**✎**) albo go usunąć (**✕**, razem z jego postępem, po potwierdzeniu). Nazwa może mieć do 30 znaków i nie może się powtarzać. Po usunięciu ostatniego profilu znowu pojawia się ekran powitalny.

### Motyw
Przycisk obok menu profilu przełącza po kolei: **Automatycznie** (jak w systemie) → **Jasny** → **Ciemny**. Wybór obowiązuje na tym urządzeniu dla wszystkich profili.

### Certyfikat C1
W pasku bocznym, pod poziomami, jest zakładka **Certyfikat C1** do przygotowania do egzaminu C1 Advanced. Na telefonie otwierasz ją przyciskiem **☰ Menu**. Zakładka ma kilka sekcji:
- **Start:** przegląd egzaminu z polem **Data egzaminu** i odliczaniem dni oraz plan powtórki.
- **Reading & Use of English, Writing, Listening, Speaking:** strategie, pułapki i zwroty do każdej części.
- **Ćwiczenia Use of English:** 19 zestawów, które sprawdzają się same (**Sprawdź**, **Pokaż odpowiedzi**, **Spróbuj ponownie**). W Part 4 punkty liczą się jak na egzaminie, a najlepszy wynik każdego zestawu widać w menu.
- **Trening Writing:** polecenie, licznik słów, timer 45 minut jak w wersji komputerowej i pole bez sprawdzania pisowni. Szkic zapisuje się sam, a po kliknięciu **Skończyłem** pojawia się checklista egzaminatora.
- **Trening Speaking:** karty Part 2 i Part 3 z timerami. Możesz się też nagrać: nagranie zostaje tylko w przeglądarce.
- **Dzień egzaminu:** lista rzeczy do odhaczenia.

Na podstronach poziomów, które często wracają na egzaminie, pojawia się ramka **Na egzaminie C1** z linkami do ćwiczeń.

## 3. Kopie zapasowe (menu profilu → Dane)

> **Dane zapisują się tylko w tej przeglądarce na tym urządzeniu.** Wyczyszczenie danych przeglądarki, inna przeglądarka albo inny komputer oznaczają brak profili i postępu. Dlatego **rób eksport co jakiś czas**.

| Opcja | Co robi |
|---|---|
| **Eksportuj dane** | pobiera jeden plik `english-levels-dane-RRRR-MM-DD.json` z listą oraz wszystkimi profilami i ich zaznaczeniami „Umiem” |
| **Importuj dane…** | wczytuje taki plik (także starsze pliki treści lub postępu). Najpierw pokazuje, co zawiera, i prosi o potwierdzenie. |
| **Resetuj dane…** | usuwa profile i postęp, przywraca listę bazową (wymaga dwóch potwierdzeń). Dane zakładki Certyfikat C1 zostają. |

Przechowuj pliki kopii w bezpiecznym miejscu, np. na dysku w chmurze albo na pendrivie.

## 4. Przenoszenie danych na inny komputer lub do innej przeglądarki

1. Na starym komputerze: menu profilu → **Dane → Eksportuj dane**.
2. Skopiuj plik `.json` na nowy komputer.
3. Na nowym komputerze otwórz stronę i wybierz menu profilu → **Dane → Importuj dane…**.

Profile i postęp są zapisane w przeglądarce, w której je zaznaczasz. Jeśli uczniowie korzystają z własnych komputerów, każdy ma u siebie osobny zestaw profili.

## 5. Gdy coś pójdzie nie tak

- Jeśli zapisane dane są uszkodzone, strona pokaże komunikat z przyciskiem importu kopii. Wybierz ostatni plik eksportu.
- Jeśli pojawi się ostrzeżenie, że pamięć przeglądarki jest niedostępna (np. w trybie prywatnym), zmiany nie będą zapisywane. Otwórz stronę w zwykłym oknie przeglądarki.

## 6. Publikacja na GitHub Pages

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
> Profile i postęp z wersji otwartej z dysku (`file://…`) **nie pojawią się automatycznie** na GitHub Pages (`https://…github.io/…`) i odwrotnie.
> Po przeniesieniu strony zrób **Dane → Eksportuj dane** w starej wersji, a potem **Dane → Importuj dane…** w nowej.
>
> Pliki eksportu nie są wysyłane na GitHub (blokuje to `.gitignore`). Każda osoba, która otwiera stronę na swoim komputerze, zaczyna od listy bazowej (niezbędnik A1–C2).
