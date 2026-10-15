# Niezbędnik angielskiego – podstrony A1, A2, B1

61 podstron w Markdown – po jednej na każdy punkt z listy „Angielski A1–C2: niezbędnik do rozmowy”.

## Struktura

```
niezbednik/
├── index.json        ← manifest: poziom → lista punktów (id, kategoria, plik, tekst z listy)
├── a1/               ← 21 plików
├── a2/               ← 19 plików
└── b1/               ← 21 plików
```

Nazwy plików: `<kategoria>-<temat>.md`, gdzie kategoria to `czasy`, `gramatyka`, `funkcje` lub `slownictwo`.

## Frontmatter każdego pliku

```yaml
---
id: a1-czasy-present-simple   # unikalny, nadaje się na slug w URL
level: A1
category: czasy               # czasy | gramatyka | funkcje | slownictwo
order: 1                      # kolejność w kategorii (zgodna z listą)
title: Present Simple
summary: Jedno zdanie – nadaje się do podglądu lub meta description.
---
```

## Układ treści

Każda podstrona ma te same sekcje (nagłówki `##`), więc można je stylować jednolicie:

- wstęp (1–2 akapity),
- **Kiedy używamy** / **Kluczowe zwroty**,
- **Budowa** (tabele),
- **Przykłady** (tabela angielski | polski) lub **Przykładowy dialog** (cytat `>`),
- **Typowe błędy Polaków** (❌ → ✅),
- **Ćwiczenie**,
- **Odpowiedzi** – osobna sekcja na końcu; warto ją zwinąć (np. w `<details>`) albo ukryć pod przyciskiem „Pokaż odpowiedzi”.

Używany Markdown: nagłówki, tabele (GFM), listy, pogrubienia, kursywa, cytaty. Renderer musi obsługiwać tabele GFM (np. `remark-gfm` w React/Next.js).

## Podpięcie w Claude Code – przykładowe polecenie

> W folderze `niezbednik/` są podstrony w Markdown z frontmatter, a `index.json` mapuje każdy punkt checklisty na plik (pole `label` to dokładny tekst punktu na stronie). Zrób z każdego punktu listy A1–B1 link do podstrony `/poziom/<id>` renderującej odpowiedni plik .md (z obsługą tabel GFM). Na podstronie dodaj przycisk powrotu do poziomu i przełącznik „Umiem” zsynchronizowany z tym na liście. Sekcję „Odpowiedzi” ukryj za przyciskiem „Pokaż odpowiedzi”.

Pole `label` w `index.json` odpowiada tekstowi punktów z pierwotnej listy. Jeśli na stronie zmieniłeś brzmienie któregoś punktu, dopasowanie lepiej robić po kolejności (`order` w obrębie kategorii) albo po `id`.
