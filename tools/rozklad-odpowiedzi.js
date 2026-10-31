/*
 * rozklad-odpowiedzi.js — jednorazowe wyrównanie rozkładu poprawnych liter w zestawach „wybierz A, B, C lub D”
 * (gaps[].options = { A, B, C, D }, gaps[].answer = litera) w niezbednik/<egzamin>/cwiczenia/*.json.
 *
 * Dla każdego zestawu: każda litera jest poprawna po równo (różnica najwyżej 1, przy 8 lukach po 2), a ta sama
 * litera nie jest poprawna w więcej niż 2 kolejnych lukach. Zmienia TYLKO kolejność opcji (zamiana miejscami
 * opcji o literze poprawnej i docelowej) oraz pole answer; treść opcji, tekst, explanation zostają.
 * Deterministycznie: ziarno z id zestawu, więc kolejne uruchomienie daje to samo (zestaw już spełniający
 * reguły zostaje bez zmian).
 *
 * Użycie (z folderu projektu; bez zależności):
 *   node tools/rozklad-odpowiedzi.js            przestawia i zapisuje pliki, wypisuje tabelę
 *   node tools/rozklad-odpowiedzi.js --sprawdz  tylko tabela, bez zapisu (kod wyjścia 1, gdy coś wymaga zmian)
 * Dodatkowo wypisuje wystąpienia samych liter A–D w explanation (np. „B jest błędne”) w przestawionych lukach.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "niezbednik");
const CHECK_ONLY = process.argv.indexOf("--sprawdz") !== -1;
const MAX_RUN = 2;

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (name) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.json$/.test(name) && path.basename(path.dirname(p)) === "cwiczenia") out.push(p);
  });
  return out;
}

// mulberry32 z ziarnem z ciągu znaków (id zestawu)
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (h ^ (h >>> 16)) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

function counts(letters, seq) {
  const c = {};
  letters.forEach(function (l) { c[l] = 0; });
  seq.forEach(function (l) { c[l] = (c[l] || 0) + 1; });
  return c;
}

function maxRun(seq) {
  let best = 0, run = 0;
  seq.forEach(function (l, i) { run = i && seq[i - 1] === l ? run + 1 : 1; if (run > best) best = run; });
  return best;
}

/** Czy rozkład już spełnia reguły: liczności różnią się najwyżej o 1 i brak serii dłuższej niż MAX_RUN. */
function balanced(letters, seq) {
  const c = counts(letters, seq);
  const v = letters.map(function (l) { return c[l]; });
  return Math.max.apply(null, v) - Math.min.apply(null, v) <= 1 && maxRun(seq) <= MAX_RUN;
}

/** Docelowy ciąg liter: po równo (reszta losowo wg ziarna), przetasowany do skutku bez serii dłuższych niż MAX_RUN. */
function targetSequence(letters, n, rnd) {
  const base = [];
  for (let i = 0; i < n; i++) base.push(letters[i % letters.length]);
  // reszta (gdy n nie dzieli się przez liczbę liter): które litery dostają dodatkowe wystąpienie — losowo
  const full = Math.floor(n / letters.length) * letters.length;
  const extra = shuffle(letters, rnd).slice(0, n - full);
  const pool = [];
  letters.forEach(function (l) { for (let i = 0; i < Math.floor(n / letters.length); i++) pool.push(l); });
  extra.forEach(function (l) { pool.push(l); });
  for (let tries = 0; tries < 5000; tries++) {
    const s = shuffle(pool, rnd);
    if (maxRun(s) <= MAX_RUN) return s;
  }
  throw new Error("Nie udało się ułożyć rozkładu dla n = " + n);
}

function fmt(letters, seq) {
  const c = counts(letters, seq);
  return letters.map(function (l) { return l + c[l]; }).join(" ") + "  [" + seq.join("") + "]";
}

function findClozeSets(json) {
  const out = [];
  (function find(x) {
    if (Array.isArray(x)) { x.forEach(find); return; }
    if (x && typeof x === "object") {
      if (Array.isArray(x.gaps) && x.gaps.length && x.gaps.every(function (g) { return g && g.options && typeof g.options === "object" && !Array.isArray(g.options) && typeof g.answer === "string"; })) out.push(x);
      else Object.keys(x).forEach(function (k) { find(x[k]); });
    }
  })(json);
  return out;
}

const rows = [];
const letterRefs = [];
let changedFiles = 0;

walk(ROOT, []).sort().forEach(function (file) {
  const raw = fs.readFileSync(file, "utf8");
  let json;
  try { json = JSON.parse(raw); } catch (e) { return; }
  const sets = findClozeSets(json);
  if (!sets.length) return;
  let changed = false;
  sets.forEach(function (set) {
    const letters = Object.keys(set.gaps[0].options).sort();
    const before = set.gaps.map(function (g) { return g.answer; });
    let after = before;
    if (!balanced(letters, before)) {
      const rnd = seeded(String(set.id || path.basename(file)));
      const target = targetSequence(letters, set.gaps.length, rnd);
      set.gaps.forEach(function (g, i) {
        const from = g.answer, to = target[i];
        if (from === to) return;
        const tmp = g.options[from];
        g.options[from] = g.options[to];
        g.options[to] = tmp;
        g.answer = to;
        const refs = String(g.explanation || "").match(/(^|[^A-Za-z])[ABCD]([^A-Za-z]|$)/g);
        if (refs) letterRefs.push(path.relative(ROOT, file) + " luka " + g.n + ": " + g.explanation);
      });
      after = target;
      changed = true;
    }
    rows.push({ file: path.relative(ROOT, file).replace(/\\/g, "/"), id: set.id, before: fmt(letters, before), after: fmt(letters, after), changed: after !== before });
  });
  if (changed && !CHECK_ONLY) {
    // zachowaj dotychczasowe zakończenia linii i wcięcie
    const eol = raw.indexOf("\r\n") !== -1 ? "\r\n" : "\n";
    const indent = /^\{\r?\n( +|\t)"/.exec(raw);
    let out = JSON.stringify(json, null, indent ? indent[1] : 2);
    if (eol === "\r\n") out = out.replace(/\n/g, "\r\n");
    fs.writeFileSync(file, out + (/\r?\n$/.test(raw) ? eol : ""), "utf8");
    changedFiles++;
  }
});

const w = Math.max.apply(null, rows.map(function (r) { return r.file.length; }));
console.log("plik".padEnd(w) + "  przed → po");
rows.forEach(function (r) {
  console.log(r.file.padEnd(w) + "  " + (r.changed ? "ZMIANA" : "bez zmian") + "\n" + " ".repeat(w) + "  przed: " + r.before + "\n" + " ".repeat(w) + "  po:    " + r.after);
});
const need = rows.filter(function (r) { return r.changed; }).length;
console.log("\nZestawów: " + rows.length + ", do przestawienia: " + need + (CHECK_ONLY ? " (tylko sprawdzenie)" : ", zapisano plików: " + changedFiles));
if (letterRefs.length) {
  console.log("\nExplanation z samymi literami A–D w przestawionych lukach (sprawdź ręcznie):");
  letterRefs.forEach(function (l) { console.log("  " + l); });
}
if (CHECK_ONLY && need) process.exit(1);
