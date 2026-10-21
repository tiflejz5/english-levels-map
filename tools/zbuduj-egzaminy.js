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
 *   niezbednik/<idEgzaminu>-dane.js          ELM.EXAMS[id] = { manifest, pages, trainers } — ładowany
 *                                            dopiero po wejściu do zakładki egzaminu
 * Zestawy ćwiczeń egzaminów buduje tools/zbuduj-cwiczenia.js (silnik zadań, spec 01).
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
const links = {};
const sets = {};
const summary = [];

exams.forEach(function (exam) {
  const dir = path.join(N, exam.id);
  if (exam.status !== "active" || exam.existing || !fs.existsSync(path.join(dir, "manifest.json"))) return;
  const manifest = readJson(path.join(dir, "manifest.json"));
  const pages = {};
  const trainers = {};
  manifest.sections.forEach(function (sec) {
    (sec.pages || []).forEach(function (p) {
      const file = path.join(dir, p.file);
      if (fs.existsSync(file)) pages[p.id] = read(file);
    });
    (sec.exerciseGroups || []).forEach(function (g) {
      g.sets.forEach(function (s) { sets[s.id] = { exam: exam.id, label: s.label, group: g.label, maxScore: s.maxScore || null }; });
    });
    if (sec.trainer) {
      const file = path.join(dir, sec.trainer.file);
      if (fs.existsSync(file)) trainers[sec.trainer.id] = readJson(file);
    }
  });
  if (fs.existsSync(path.join(dir, "powiazania.json"))) links[exam.id] = readJson(path.join(dir, "powiazania.json")).links || [];
  fs.writeFileSync(path.join(N, exam.id + "-dane.js"),
    "/* Egzamin " + exam.id + " — GENEROWANY przez tools/zbuduj-egzaminy.js, nie edytuj ręcznie. */\n" +
    "window.ELM = window.ELM || {};\n(ELM.EXAMS = ELM.EXAMS || {})[" + JSON.stringify(exam.id) + "] = " +
    JSON.stringify({ manifest: manifest, pages: pages, trainers: trainers }) + ";\n", "utf8");
  summary.push(exam.id + ": strony " + Object.keys(pages).length + ", trenery " + Object.keys(trainers).length + ", powiązania " + (links[exam.id] || []).length);
});

fs.writeFileSync(path.join(ROOT, "dane", "egzaminy-rejestr.js"),
  "/* Rejestr egzaminów — GENEROWANY przez tools/zbuduj-egzaminy.js z dane/egzaminy-manifest.json, nie edytuj ręcznie. */\n" +
  "window.ELM = window.ELM || {};\nELM.EXAM_REGISTRY = " + JSON.stringify({ version: 1, exams: exams, links: links, sets: sets }) + ";\n", "utf8");
console.log("Egzaminy: " + exams.map(function (e) { return e.code + (e.status === "active" ? "" : " (" + e.status + ")"); }).join(", ") +
  (summary.length ? " | " + summary.join(" | ") : ""));
