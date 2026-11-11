/*
 * zbuduj-szlak.js — dane Szlaku (spec v7 13) jako skrypty ładowane na żądanie (działają też z file://):
 *
 *   szlak/szlak-dane.js        ELM.SZLAK = { version, levels: [...] }   (z szlak/szlak.json)
 *   szlak/quizy-<poziom>.js    ELM.SZLAK_QUIZY["szlak-a1-05"] = quiz    (z szlak/quizy/<poziom>/*.json)
 *
 * Quizy B1–C2 dojdą w kolejnych paczkach: nowy plik JSON i pole „quiz” przy przystanku, bez zmian w kodzie.
 * Walidacja: scripts/validate_szlak.py (tools/waliduj-szlak.js, npm run validate).
 *
 * Użycie (z folderu projektu):
 *   node tools/zbuduj-szlak.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "szlak");

function write(file, comment, body) {
  fs.writeFileSync(file, "/* " + comment + " — GENEROWANY przez tools/zbuduj-szlak.js, nie edytuj ręcznie. */\nwindow.ELM = window.ELM || {};\n" + body + "\n", "utf8");
}

const szlak = JSON.parse(fs.readFileSync(path.join(DIR, "szlak.json"), "utf8"));
const slim = { version: szlak.version, levels: szlak.levels };
write(path.join(DIR, "szlak-dane.js"), "Szlak nauki", "ELM.SZLAK = " + JSON.stringify(slim) + ";");

let quizzes = 0;
const qdir = path.join(DIR, "quizy");
const levels = fs.existsSync(qdir) ? fs.readdirSync(qdir).filter(function (d) { return fs.statSync(path.join(qdir, d)).isDirectory(); }) : [];
levels.forEach(function (lvl) {
  const files = fs.readdirSync(path.join(qdir, lvl)).filter(function (f) { return /\.json$/.test(f); }).sort();
  let body = "const Q = (ELM.SZLAK_QUIZY = ELM.SZLAK_QUIZY || {});\n";
  files.forEach(function (f) {
    const q = JSON.parse(fs.readFileSync(path.join(qdir, lvl, f), "utf8"));
    body += "Q[" + JSON.stringify(q.id) + "] = " + JSON.stringify(q) + ";\n";
    quizzes++;
  });
  write(path.join(DIR, "quizy-" + lvl + ".js"), "Quizy Szlaku " + lvl.toUpperCase(), body.trim());
});
console.log("Szlak: poziomy " + szlak.levels.length + ", quizy " + quizzes + " (pliki quizy-" + levels.join(", quizy-") + ")");
