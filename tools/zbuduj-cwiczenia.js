/*
 * zbuduj-cwiczenia.js — zamienia dane ćwiczeń (JSON) na pliki .js, które
 * strona wczytuje NA ŻĄDANIE zwykłym <script> (fetch() plików .json jest
 * blokowany przy file://, a <script> działa zawsze).
 *
 * Wejście:
 *   dane/cwiczenia-tematy.json        mapa: id punktu niezbędnika → [id zestawów]
 *   cwiczenia/tematy/<id>.json         zestawy zadań (spec 01)
 *   dane/mixes.json                    gotowe zestawy mieszane (spec 02)
 *   dane/lab-czasow.json, dane/lab-wybor-czasu.json   Laboratorium czasów
 *
 * Wyjście (GENEROWANE, nie edytuj ręcznie):
 *   cwiczenia/cwiczenia-indeks.js      ELM.CWICZENIA: mapa, opisy zestawów (bez zadań), mixy
 *   cwiczenia/tematy/<id>.js           ELM.EX_SETS[<id>] = pełny zestaw
 *   dane/lab-dane.js                   ELM.LAB = { tenses, tree }
 *
 * Pozycja mapy bez pliku zestawu jest pomijana z ostrzeżeniem (nie przerywa budowania).
 * Poprawność treści sprawdza osobno: npm run validate (tools/waliduj-cwiczenia.js).
 *
 * Użycie: node tools/zbuduj-cwiczenia.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DANE = path.join(ROOT, "dane");
const SETS_DIR = path.join(ROOT, "cwiczenia", "tematy");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
}

function writeJs(file, header, assignment) {
  fs.writeFileSync(file, "/* " + header + " — GENEROWANY przez tools/zbuduj-cwiczenia.js, nie edytuj ręcznie. */\n" +
    "window.ELM = window.ELM || {};\n" + assignment + "\n", "utf8");
}

const warnings = [];
const map = fs.existsSync(path.join(DANE, "cwiczenia-tematy.json")) ? readJson(path.join(DANE, "cwiczenia-tematy.json")) : { topics: {} };

// Typ zadania → liczba (opis karty zestawu)
function typeCounts(items) {
  const out = {};
  items.forEach(function (it) { out[it.type] = (out[it.type] || 0) + 1; });
  return out;
}

const topics = {};
const sets = {};
Object.keys(map.topics || {}).forEach(function (topic) {
  (map.topics[topic] || []).forEach(function (setId) {
    const file = path.join(SETS_DIR, setId + ".json");
    if (!fs.existsSync(file)) { warnings.push("mapa: brak pliku zestawu " + setId + " (pomijam)"); return; }
    const set = readJson(file);
    // Pola dziedziczone przez zadania (topic, level) wpisujemy od razu
    set.items = (set.items || []).map(function (it) {
      return Object.assign({ topic: set.topic || null, level: set.level || null, tags: [], setId: setId }, it);
    });
    writeJs(path.join(SETS_DIR, setId + ".js"), "Zestaw ćwiczeń " + setId,
      "(ELM.EX_SETS = ELM.EX_SETS || {})[" + JSON.stringify(setId) + "] = " + JSON.stringify(set) + ";");
    (topics[topic] = topics[topic] || []).push(setId);
    sets[setId] = {
      id: setId,
      topic: set.topic || topic,
      level: set.level || null,
      title: set.title || setId,
      intro: set.intro || "",
      count: set.items.length,
      types: typeCounts(set.items),
      defaultMode: set.defaultMode === "exam" ? "exam" : "learn",
      file: "cwiczenia/tematy/" + setId + ".js"
    };
  });
});

// Zestawy egzaminów w nowym formacie (spec 05): niezbednik/<idEgzaminu>/cwiczenia/*.json z grup manifestu
const examRegistry = fs.existsSync(path.join(DANE, "egzaminy-manifest.json")) ? readJson(path.join(DANE, "egzaminy-manifest.json")).exams || [] : [];
examRegistry.forEach(function (exam) {
  const dir = path.join(ROOT, "niezbednik", exam.id);
  if (exam.status !== "active" || exam.existing || !fs.existsSync(path.join(dir, "manifest.json"))) return;
  readJson(path.join(dir, "manifest.json")).sections.forEach(function (sec) {
    (sec.exerciseGroups || []).forEach(function (g) {
      g.sets.forEach(function (meta) {
        const file = path.join(dir, meta.file);
        if (!fs.existsSync(file)) { warnings.push(exam.id + ": brak pliku zestawu " + meta.file + " (pomijam)"); return; }
        const set = readJson(file);
        if (!Array.isArray(set.items)) return; // format C1 (cloze, słowotwórstwo…): js/c1-exercises.js, dane w niezbednik/<id>-dane.js
        set.items = set.items.map(function (it) {
          return Object.assign({ topic: set.topic || null, level: set.level || null, tags: [], setId: meta.id }, it);
        });
        const rel = "niezbednik/" + exam.id + "/" + meta.file.replace(/\.json$/, ".js");
        writeJs(path.join(ROOT, rel), "Zestaw egzaminu " + meta.id,
          "(ELM.EX_SETS = ELM.EX_SETS || {})[" + JSON.stringify(meta.id) + "] = " + JSON.stringify(set) + ";");
        sets[meta.id] = {
          id: meta.id, topic: null, level: set.level || null, title: set.title || meta.label, intro: set.intro || "",
          count: set.items.length, types: typeCounts(set.items), defaultMode: set.defaultMode === "exam" ? "exam" : "learn",
          file: rel, exam: exam.id, group: g.label, hasPassage: !!set.passage,
          listening: set.items.some(function (it) { return it.kind === "listening"; })
        };
      });
    });
  });
});

const mixes = fs.existsSync(path.join(DANE, "mixes.json")) ? (readJson(path.join(DANE, "mixes.json")).mixes || []) : [];

// Laboratorium czasów + skrót „punkt niezbędnika → czas” (link „Zobacz na osi czasu” bez wczytywania całego Labu)
let lab = null;
const tenseByTopic = {};
if (fs.existsSync(path.join(DANE, "lab-czasow.json"))) {
  const tenses = readJson(path.join(DANE, "lab-czasow.json")).tenses || [];
  const tree = fs.existsSync(path.join(DANE, "lab-wybor-czasu.json")) ? readJson(path.join(DANE, "lab-wybor-czasu.json")) : null;
  lab = { tenses: tenses, tree: tree };
  tenses.forEach(function (t) {
    (t.niezbednikIds || []).forEach(function (n) { if (!tenseByTopic[n]) tenseByTopic[n] = { id: t.id, name: t.name }; });
  });
  writeJs(path.join(DANE, "lab-dane.js"), "Laboratorium czasów", "ELM.LAB = " + JSON.stringify(lab) + ";");
}

writeJs(path.join(ROOT, "cwiczenia", "cwiczenia-indeks.js"), "Indeks ćwiczeń",
  "ELM.CWICZENIA = " + JSON.stringify({ version: 1, topics: topics, sets: sets, mixes: mixes, tenseByTopic: tenseByTopic }) + ";");

const nItems = Object.keys(sets).reduce(function (s, k) { return s + sets[k].count; }, 0);
console.log("Ćwiczenia: zestawy " + Object.keys(sets).length + ", zadania " + nItems + ", mixy " + mixes.length +
  (lab ? ", czasy w Labie " + lab.tenses.length : ""));
warnings.forEach(function (w) { console.warn("UWAGA: " + w); });
