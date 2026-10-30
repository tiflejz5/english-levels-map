/*
 * waliduj-zycie.js — sprawdza sekcję „## Życie i egzamin” na podstronach Niezbędnika
 * (paczka v6, spec 16, sekcja 2.4; te same reguły co część „zycie” w docs/rozbudowa-v6/scripts/validate_v6.py).
 *
 * Każda podstrona z niezbednik/index.json ma mieć dokładnie jedną sekcję „## Życie i egzamin”:
 *   - po „## Przykłady” (gdy ją ma), przed „## Typowe błędy Polaków” i przed „## Ćwiczenie”,
 *   - tabela z nagłówkiem i 3–4 wierszami po 3 kolumny: Z życia | W stylu egzaminu | Egzamin,
 *   - kolumna 1: zdanie kursywą + tłumaczenie w nawiasie; kolumna 2: strzałka „→” i pogrubiona odpowiedź,
 *   - kolumna 3: kody E8, MP, MR, B2, C1 rozdzielone „ · ”, dozwolone dla poziomu podstrony:
 *     A1–A2: E8, MP · B1: E8, MP, MR, B2 · B2: MP, MR, B2, C1 · C1: MR, B2, C1 · C2: C1.
 * Ostrzega o powtórzeniu tej samej odpowiedzi w jednej tabeli oraz o braku jednoznacznego typu zadania.
 *
 * Użycie (z folderu projektu):
 *   node tools/waliduj-zycie.js            # kod wyjścia 1 przy błędach
 *   node tools/waliduj-zycie.js a2 b1      # tylko wybrane poziomy
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "niezbednik");
const CODES = ["E8", "MP", "MR", "B2", "C1"];
const ALLOWED = { A1: ["E8", "MP"], A2: ["E8", "MP"], B1: ["E8", "MP", "MR", "B2"], B2: ["MP", "MR", "B2", "C1"], C1: ["MR", "B2", "C1"], C2: ["C1"] };
const TASK_TYPES = /^(Uzupełnij|Wybierz|Transformacja|Przetłumacz|Słowotwórstwo|Popraw|Ułóż|Dopasuj|Parafraza|Odpowiedz)/i;

const only = process.argv.slice(2).map(function (x) { return x.toUpperCase(); });
const errors = [];
const warnings = [];

function check(text, where, level) {
  const heads = [];
  const re = /^## (.+)$/gm;
  let m;
  while ((m = re.exec(text))) heads.push({ pos: m.index, name: m[1].trim() });
  const idx = [];
  heads.forEach(function (h, i) { if (/^życie i egzamin/i.test(h.name)) idx.push(i); });
  if (idx.length !== 1) { errors.push(where + ": wymagana dokładnie jedna sekcja „## Życie i egzamin” (jest " + idx.length + ")"); return; }
  const i = idx[0];
  const names = heads.map(function (h) { return h.name; });
  const before = function (n) { const k = names.indexOf(n); return k !== -1 && k < i; };
  if (before("Typowe błędy Polaków")) errors.push(where + ": „Życie i egzamin” musi stać przed „Typowe błędy Polaków”");
  if (before("Ćwiczenie")) errors.push(where + ": „Życie i egzamin” musi stać przed „Ćwiczenie”");
  const ex = names.indexOf("Przykłady");
  if (ex !== -1 && ex > i) errors.push(where + ": „Życie i egzamin” musi stać po „Przykłady”");
  const end = i + 1 < heads.length ? heads[i + 1].pos : text.length;
  const rows = text.slice(heads[i].pos, end).split("\n").filter(function (r) { return r.trim().charAt(0) === "|"; });
  if (rows.length < 2 || !/^\|\s*-/.test(rows[1])) { errors.push(where + ": sekcja musi zawierać tabelę z nagłówkiem"); return; }
  const data = rows.slice(2);
  if (data.length < 3 || data.length > 4) errors.push(where + ": tabela ma " + data.length + " wierszy (wymagane 3–4)");
  const answers = {};
  data.forEach(function (r, n) {
    const row = n + 1;
    const cells = r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); });
    if (cells.length !== 3) { errors.push(where + ": wiersz " + row + " ma " + cells.length + " kolumn (wymagane 3)"); return; }
    const task = cells[1];
    const arrow = task.lastIndexOf("→");
    const answer = arrow === -1 ? "" : task.slice(arrow + 1);
    if (arrow === -1 || answer.indexOf("**") === -1) errors.push(where + ": wiersz " + row + ": kolumna 2 wymaga „→ **odpowiedź**”");
    else {
      const a = answer.replace(/\*\*/g, "").trim().toLowerCase();
      if (answers[a]) warnings.push(where + ": wiersz " + row + ": ta sama odpowiedź „" + a + "” co w wierszu " + answers[a]);
      answers[a] = row;
    }
    if (!TASK_TYPES.test(task)) warnings.push(where + ": wiersz " + row + ": kolumna 2 powinna zaczynać się od typu zadania (Uzupełnij / Wybierz / Transformacja / Przetłumacz / Słowotwórstwo / Popraw błąd)");
    if (cells[0].indexOf("*") === -1 || cells[0].indexOf("(") === -1) errors.push(where + ": wiersz " + row + ": kolumna 1 – zdanie kursywą + tłumaczenie w nawiasie");
    const codes = cells[2].split("·").map(function (c) { return c.trim(); }).filter(Boolean);
    if (!codes.length || codes.some(function (c) { return CODES.indexOf(c) === -1; })) errors.push(where + ": wiersz " + row + ": kody egzaminów „" + cells[2] + "” spoza " + CODES.join(", "));
    else if (level && ALLOWED[level]) {
      const bad = codes.filter(function (c) { return ALLOWED[level].indexOf(c) === -1; });
      if (bad.length) errors.push(where + ": wiersz " + row + ": kody " + bad.join(", ") + " niedozwolone dla " + level);
    }
  });
}

const index = JSON.parse(fs.readFileSync(path.join(ROOT, "index.json"), "utf8"));
let pages = 0;
index.levels.forEach(function (lvl) {
  if (only.length && only.indexOf(lvl.level) === -1) return;
  lvl.items.forEach(function (item) {
    const file = path.join(ROOT, item.file);
    if (!fs.existsSync(file)) { errors.push("niezbednik/" + item.file + ": brak pliku"); return; }
    pages++;
    check(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n"), "niezbednik/" + item.file, lvl.level);
  });
});

warnings.forEach(function (w) { console.log("Ostrzeżenie: " + w); });
if (errors.length) {
  console.error(errors.join("\n"));
  console.error("\nŻycie i egzamin: " + errors.length + " błędów na " + pages + " podstronach.");
  process.exit(1);
}
console.log("Życie i egzamin: " + pages + " podstron, OK" + (warnings.length ? " (ostrzeżenia: " + warnings.length + ")" : ""));
