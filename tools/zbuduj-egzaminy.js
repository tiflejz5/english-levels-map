/*
 * zbuduj-egzaminy.js — moduł „Egzaminy” (spec 05).
 *
 * Wejście:
 *   dane/egzaminy-manifest.json              rejestr: id, kod, etykieta, trasa, status, kolory, opisy
 *   niezbednik/<idEgzaminu>/                 folder aktywnego egzaminu w nowym formacie
 *       manifest.json, powiazania.json, strony/*.md, trening/*.json, cwiczenia/*.json
 *   (Certyfikat C1 ma własny, istniejący generator: tools/zbuduj-niezbednik.js — bez zmian.)
 *
 * Wyjście (GENEROWANE):
 *   dane/egzaminy-rejestr.js                 ELM.EXAM_REGISTRY — wczytywany przy starcie (mały):
 *                                            egzaminy z rejestru + powiązania (ramki „Na egzaminie …”)
 *                                            + opisy zestawów do ramek
 *   niezbednik/<idEgzaminu>-dane.js          ELM.EXAMS[id] = { manifest, pages, trainers, exercises } — ładowany
 *                                            dopiero po wejściu do zakładki egzaminu
 * Zestawy ćwiczeń egzaminów w nowym formacie (items) buduje tools/zbuduj-cwiczenia.js (silnik zadań,
 * spec 01); zestawy w formacie C1 (multiple-choice-cloze, word-formation…, spec 06 sekcja 3) trafiają
 * do exercises w danych egzaminu i rysuje je komponent C1 (js/c1-exercises.js).
 * Tytuł ramek na stronach tematów pochodzi z opisu powiazania.json („Ramka „Na maturze …” …”).
 *
 * Użycie: node tools/zbuduj-egzaminy.js   (część npm run build)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const N = path.join(ROOT, "niezbednik");

function read(file) { return fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n"); }
function readJson(file) { return JSON.parse(read(file)); }

const registry = readJson(path.join(ROOT, "dane", "egzaminy-manifest.json"));
const exams = (registry.exams || []).slice().sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
const C1_TYPES = ["multiple-choice-cloze", "word-formation", "open-cloze", "transformation"];
/** Trenery sekcji: „trainer” (jeden, E8 i matury) albo „trainers” (lista, np. B2: Writing i Speaking). */
function sectionTrainers(sec) { return Array.isArray(sec.trainers) ? sec.trainers : sec.trainer ? [sec.trainer] : []; }

const links = {};
const boxTitles = {};
const sets = {};
const summary = [];

exams.forEach(function (exam) {
  const dir = path.join(N, exam.id);
  if (exam.status !== "active" || exam.existing || !fs.existsSync(path.join(dir, "manifest.json"))) return;
  const manifest = readJson(path.join(dir, "manifest.json"));
  const pages = {};
  const trainers = {};
  const exercises = {};
  manifest.sections.forEach(function (sec) {
    (sec.pages || []).forEach(function (p) {
      const file = path.join(dir, p.file);
      if (fs.existsSync(file)) pages[p.id] = read(file);
    });
    (sec.exerciseGroups || []).forEach(function (g) {
      g.sets.forEach(function (s) {
        const file = path.join(dir, s.file);
        const json = fs.existsSync(file) ? readJson(file) : null;
        // Format C1 rozpoznajemy po typie (transformacje mają własne „items”, ale to nie zadania silnika)
        const c1 = !!json && C1_TYPES.indexOf(json.type) !== -1;
        if (c1) exercises[s.id] = json;
        sets[s.id] = {
          exam: exam.id, label: s.label, group: g.label, maxScore: s.maxScore || null, format: c1 ? "c1" : "items",
          href: c1 ? "#" + exam.route + "/cwiczenia/" + s.id : "#/cwiczenia/zestaw/" + s.id
        };
      });
    });
    sectionTrainers(sec).forEach(function (t) {
      const file = path.join(dir, t.file);
      if (fs.existsSync(file)) trainers[t.id] = readJson(file);
    });
  });
  if (fs.existsSync(path.join(dir, "powiazania.json"))) {
    const pw = readJson(path.join(dir, "powiazania.json"));
    links[exam.id] = pw.links || [];
    const t = /„([^”]+)”/.exec(pw.description || "");
    if (t) boxTitles[exam.id] = t[1];
  }
  fs.writeFileSync(path.join(N, exam.id + "-dane.js"),
    "/* Egzamin " + exam.id + " — GENEROWANY przez tools/zbuduj-egzaminy.js, nie edytuj ręcznie. */\n" +
    "window.ELM = window.ELM || {};\n(ELM.EXAMS = ELM.EXAMS || {})[" + JSON.stringify(exam.id) + "] = " +
    JSON.stringify({ manifest: manifest, pages: pages, trainers: trainers, exercises: exercises }) + ";\n", "utf8");
  summary.push(exam.id + ": strony " + Object.keys(pages).length + ", zestawy C1 " + Object.keys(exercises).length + ", trenery " + Object.keys(trainers).length + ", powiązania " + (links[exam.id] || []).length);
});

// Id zestawów każdego egzaminu (także C1) — do postępu „zestawy 4/12” i do „Moich egzaminów” bez wczytywania danych egzaminu
exams.forEach(function (exam) {
  const file = path.join(N, exam.id, "manifest.json");
  if (exam.status !== "active" || !fs.existsSync(file)) return;
  const ids = [];
  readJson(file).sections.forEach(function (sec) {
    (sec.exerciseGroups || []).forEach(function (g) { g.sets.forEach(function (s) { ids.push(s.id); }); });
  });
  exam.setIds = ids;
});

fs.writeFileSync(path.join(ROOT, "dane", "egzaminy-rejestr.js"),
  "/* Rejestr egzaminów — GENEROWANY przez tools/zbuduj-egzaminy.js z dane/egzaminy-manifest.json, nie edytuj ręcznie. */\n" +
  "window.ELM = window.ELM || {};\nELM.EXAM_REGISTRY = " + JSON.stringify({ version: 1, exams: exams, links: links, boxTitles: boxTitles, sets: sets }) + ";\n", "utf8");
console.log("Egzaminy: " + exams.map(function (e) { return e.code + (e.status === "active" ? "" : " (" + e.status + ")"); }).join(", ") +
  (summary.length ? " | " + summary.join(" | ") : ""));
