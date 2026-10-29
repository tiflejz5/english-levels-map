/*
 * zbuduj-niezbednik.js — składa podstrony z folderu niezbednik/ w jeden plik
 * niezbednik/niezbednik-dane.js, który strona wczytuje zwykłym <script src>.
 *
 * Dlaczego? Przy otwieraniu strony z dysku (file://) przeglądarki blokują
 * wczytywanie plików .md i .json przez fetch(). Plik .js działa zawsze.
 *
 * Użycie (z folderu projektu):
 *   node tools/zbuduj-niezbednik.js
 *
 * Dodanie kolejnego poziomu (np. A2): wrzuć pliki do niezbednik/a2/,
 * upewnij się, że są wpisane w niezbednik/index.json, uruchom skrypt.
 * Wpisy z index.json bez pliku .md są pomijane (punkt nie dostanie linku).
 *
 * Dodatkowo (jeśli istnieją):
 *   niezbednik/podsumowania/<poziom>.md — podsumowanie pod listą poziomu,
 *   niezbednik/strona-glowna.md         — treść strony głównej.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "niezbednik");
const OUT = path.join(ROOT, "niezbednik-dane.js");

const index = JSON.parse(fs.readFileSync(path.join(ROOT, "index.json"), "utf8"));
const pages = {};
const missing = [];
const warnings = [];

index.levels.forEach(function (level) {
  level.items.forEach(function (item) {
    const file = path.join(ROOT, item.file);
    if (!fs.existsSync(file)) {
      missing.push(item.file);
      return;
    }
    const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
    // Prosta kontrola: id we frontmatter powinno zgadzać się z index.json
    const idMatch = /^---\n[\s\S]*?^id:\s*(.+)$/m.exec(text);
    if (idMatch && idMatch[1].trim() !== item.id) {
      warnings.push(item.file + ": id we frontmatter (" + idMatch[1].trim() + ") ≠ id w index.json (" + item.id + ")");
    }
    pages[item.file] = text;
  });
});

function readMd(file) {
  return fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
}

// Podsumowania poziomów: klucz = kod poziomu (A1…C2) z nazwy pliku
const summaries = {};
const summariesDir = path.join(ROOT, "podsumowania");
if (fs.existsSync(summariesDir)) {
  fs.readdirSync(summariesDir).filter(function (f) { return /\.md$/i.test(f); }).sort().forEach(function (f) {
    summaries[f.replace(/\.md$/i, "").toUpperCase()] = readMd(path.join(summariesDir, f));
  });
}

// Strona główna
const homeFile = path.join(ROOT, "strona-glowna.md");
const home = fs.existsSync(homeFile) ? readMd(homeFile) : null;

const header =
  "/*\n" +
  " * PLIK GENEROWANY AUTOMATYCZNIE — nie edytuj ręcznie.\n" +
  " * Źródło: niezbednik/index.json i niezbednik/<poziom>/*.md\n" +
  " * Odśwież poleceniem: node tools/zbuduj-niezbednik.js\n" +
  " */\n";

const body = "window.ELM = window.ELM || {};\nwindow.ELM.NIEZBEDNIK = " +
  JSON.stringify({ index: index, pages: pages, summaries: summaries, home: home }, null, 1) + ";\n";

fs.writeFileSync(OUT, header + body, "utf8");

console.log("Zapisano: " + path.relative(process.cwd(), OUT));
console.log("Podstrony: " + Object.keys(pages).length + ", wpisy bez pliku: " + missing.length);
console.log("Podsumowania: " + (Object.keys(summaries).join(", ") || "brak") + "; strona główna: " + (home ? "tak" : "brak"));
warnings.forEach(function (w) { console.log("UWAGA: " + w); });

// =====================================================================
// ZAKŁADKA „CERTYFIKAT C1” (niezbednik/certyfikat-c1/)
//   manifest.json   — sekcje, strony, zestawy ćwiczeń i trenery
//   strony/*.md     — strony zakładki
//   cwiczenia/*.json, trening/*.json, powiazania.json
// Wynik: niezbednik/certyfikat-c1-dane.js (ELM.C1)
// =====================================================================

const C1_ROOT = path.join(ROOT, "certyfikat-c1");
const C1_OUT = path.join(ROOT, "certyfikat-c1-dane.js");

if (fs.existsSync(path.join(C1_ROOT, "manifest.json"))) {
  const readJson = function (rel) {
    return JSON.parse(fs.readFileSync(path.join(C1_ROOT, rel), "utf8").replace(/^﻿/, ""));
  };
  const manifest = readJson("manifest.json");
  const c1 = { manifest: manifest, pages: {}, exercises: {}, trainers: {}, links: null };
  const c1Missing = [];

  manifest.sections.forEach(function (section) {
    (section.pages || []).forEach(function (page) {
      const file = path.join(C1_ROOT, page.file);
      if (fs.existsSync(file)) c1.pages[page.id] = readMd(file);
      else c1Missing.push(page.file);
    });
    (section.exerciseGroups || []).forEach(function (group) {
      group.sets.forEach(function (set) {
        if (fs.existsSync(path.join(C1_ROOT, set.file))) c1.exercises[set.id] = readJson(set.file);
        else c1Missing.push(set.file);
      });
    });
    if (section.trainer) {
      if (fs.existsSync(path.join(C1_ROOT, section.trainer.file))) c1.trainers[section.trainer.id] = readJson(section.trainer.file);
      else c1Missing.push(section.trainer.file);
    }
  });
  if (manifest.links && manifest.links.file && fs.existsSync(path.join(C1_ROOT, manifest.links.file))) {
    c1.links = readJson(manifest.links.file);
  }

  fs.writeFileSync(C1_OUT,
    "/*\n * PLIK GENEROWANY AUTOMATYCZNIE — nie edytuj ręcznie.\n" +
    " * Źródło: niezbednik/certyfikat-c1/\n" +
    " * Odśwież poleceniem: node tools/zbuduj-niezbednik.js\n */\n" +
    "window.ELM = window.ELM || {};\nwindow.ELM.C1 = " + JSON.stringify(c1, null, 1) + ";\n", "utf8");

  console.log("Zapisano: " + path.relative(process.cwd(), C1_OUT));
  console.log("Certyfikat C1: strony " + Object.keys(c1.pages).length + ", zestawy " + Object.keys(c1.exercises).length +
    ", trenery " + Object.keys(c1.trainers).length + ", ramki " + (c1.links ? c1.links.links.length : 0));
  c1Missing.forEach(function (f) { console.log("UWAGA: brak pliku certyfikat-c1/" + f); });
}

// =====================================================================
// SZYBKI TEST POZIOMU (niezbednik/test-poziomu/pytania.json)
//   { "version": 1, "questions": [{ id, level, skill (grammar | vocabulary | reading),
//     type: "multiple-choice", passage (przy reading), question, options: [...],
//     correct: <indeks>, explanation, itemId? }] }
// Sprawdza skill, passage przy reading (długość: A1–B1 30–80, B2–C2 60–130 słów),
// ostrzega „UWAGA”, gdy poziom ma < 8 pytań albo brak w nim umiejętności;
// w konsoli podsumowanie poziom × umiejętność (spec v6 13, 1.5).
// Wynik: niezbednik/test-poziomu-dane.js (ELM.LEVEL_TEST). Pytania z błędami
// są pomijane (z ostrzeżeniem), reszta trafia do pliku.
// =====================================================================

const TEST_FILE = path.join(ROOT, "test-poziomu", "pytania.json");
const TEST_OUT = path.join(ROOT, "test-poziomu-dane.js");

if (fs.existsSync(TEST_FILE)) {
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const SKILLS = ["grammar", "vocabulary", "reading"];
  const PASSAGE_RANGE = { A1: [30, 80], A2: [30, 80], B1: [30, 80], B2: [60, 130], C1: [60, 130], C2: [60, 130] };
  const itemIds = new Set();
  index.levels.forEach(function (l) { l.items.forEach(function (it) { itemIds.add(it.id); }); });
  const raw = JSON.parse(fs.readFileSync(TEST_FILE, "utf8").replace(/^﻿/, ""));
  if (raw.version !== 1 || !Array.isArray(raw.questions)) {
    console.error("BŁĄD: test-poziomu/pytania.json musi mieć \"version\": 1 i listę \"questions\".");
    process.exit(1);
  }
  const seen = new Set();
  const problems = [];
  const questions = raw.questions.filter(function (q, i) {
    const where = "pytanie nr " + (i + 1) + (q && q.id ? " (" + q.id + ")" : "");
    const fail = function (msg) { problems.push(where + ": " + msg); return false; };
    if (!q || typeof q !== "object") return fail("to nie jest obiekt");
    if (typeof q.id !== "string" || !q.id.trim()) return fail("brak id");
    if (seen.has(q.id)) return fail("powtórzone id");
    if (LEVELS.indexOf(q.level) === -1) return fail("level musi być jednym z: " + LEVELS.join(", "));
    if (q.type !== "multiple-choice") return fail("nieobsługiwany type (dozwolony: multiple-choice)");
    if (typeof q.question !== "string" || !q.question.trim()) return fail("brak treści pytania");
    if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(function (o) { return typeof o === "string" && o.trim(); })) {
      return fail("options musi być listą co najmniej 2 niepustych tekstów");
    }
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) return fail("correct musi być indeksem odpowiedzi (od 0)");
    if (q.explanation !== undefined && typeof q.explanation !== "string") return fail("explanation musi być tekstem");
    // Umiejętność i tekst do czytania (spec v6 13, 1.2); brak skill = grammar (stare pytania)
    if (q.skill !== undefined && SKILLS.indexOf(q.skill) === -1) return fail("skill musi być jednym z: " + SKILLS.join(", "));
    if (q.skill === undefined) problems.push(where + ": brak skill (traktowane jak grammar) – uzupełnij");
    if (q.skill === "reading") {
      if (typeof q.passage !== "string" || !q.passage.trim()) return fail("pytanie reading wymaga passage");
      const n = q.passage.trim().split(/\s+/).length;
      const range = PASSAGE_RANGE[q.level];
      if (n < range[0] || n > range[1]) problems.push(where + ": passage ma " + n + " słów, dla " + q.level + " wymagane " + range[0] + "–" + range[1]);
    } else if (q.passage !== undefined && q.passage !== null) return fail("passage tylko przy skill: reading");
    if (q.skill !== undefined && q.options.length !== 4) problems.push(where + ": nowe pytania mają 4 opcje (ma " + q.options.length + ")");
    if (q.itemId !== undefined && q.itemId !== "" && !itemIds.has(q.itemId)) {
      problems.push(where + ": nieznane itemId „" + q.itemId + "” – pytanie zostaje, ale bez linku");
      q.itemId = "";
    }
    seen.add(q.id);
    return true;
  });
  fs.writeFileSync(TEST_OUT,
    "/*\n * PLIK GENEROWANY AUTOMATYCZNIE — nie edytuj ręcznie.\n" +
    " * Źródło: niezbednik/test-poziomu/pytania.json\n" +
    " * Odśwież poleceniem: node tools/zbuduj-niezbednik.js\n */\n" +
    "window.ELM = window.ELM || {};\nwindow.ELM.LEVEL_TEST = " + JSON.stringify({ version: 1, questions: questions }, null, 1) + ";\n", "utf8");
  const perLevel = LEVELS.map(function (l) { return l + ": " + questions.filter(function (q) { return q.level === l; }).length; }).join(", ");
  // Pula poziomu: co najmniej 8 pytań i każda umiejętność (inaczej test powtarza pytania albo pomija umiejętność)
  const skillOf = function (q) { return q.skill || "grammar"; };
  const grid = LEVELS.map(function (l) {
    const atLevel = questions.filter(function (q) { return q.level === l; });
    const k = atLevel.length, few = k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 12 || k % 100 > 14);
    if (k < 8) problems.push("poziom " + l + ": tylko " + k + " " + (k === 1 ? "pytanie" : few ? "pytania" : "pytań") + " (zalecane co najmniej 8)");
    const cells = SKILLS.map(function (s) {
      const n = atLevel.filter(function (q) { return skillOf(q) === s; }).length;
      if (!n) problems.push("poziom " + l + ": brak pytań " + s);
      return n;
    });
    return "  " + l + "  " + cells.map(function (n) { return String(n).padStart(7); }).join("") + String(atLevel.length).padStart(8);
  });
  console.log("Zapisano: " + path.relative(process.cwd(), TEST_OUT));
  console.log("Test poziomu: pytania " + questions.length + " (" + perLevel + ")");
  console.log("  poziom grammar  vocab reading  razem\n" + grid.join("\n"));
  problems.forEach(function (p) { console.log("UWAGA (test poziomu): " + p); });
}
