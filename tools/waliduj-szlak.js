/*
 * waliduj-szlak.js — uruchamia walidator Szlaku (scripts/validate_szlak.py) w ramach `npm run validate`:
 * pokrycie checklisty (każdy punkt w jednym przystanku), istnienie stron niezbędnika, kształt quizów,
 * powtórki na końcu odcinków. Dodatkowo (JS): wygenerowane pliki szlak/*.js są aktualne względem JSON.
 *
 * Użycie (z folderu projektu):
 *   node tools/waliduj-szlak.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "validate_szlak.py");
const CANDIDATES = [["python3"], ["python"], ["py", "-3"]];

function works(cmd) {
  const r = spawnSync(cmd[0], cmd.slice(1).concat(["-c", "import sys; print(sys.version_info[0])"]), { encoding: "utf8" });
  return r.status === 0 && /^3/.test(String(r.stdout).trim());
}

const python = CANDIDATES.find(works);
if (!python) {
  console.error("Walidacja Szlaku: nie znaleziono Pythona 3 (python3, python ani py).");
  process.exit(1);
}
const r = spawnSync(python[0], python.slice(1).concat(["-X", "utf8", SCRIPT, path.join(ROOT, "niezbednik", "index.json")]), { cwd: ROOT, encoding: "utf8" });
const out = String(r.stdout || "");
process.stdout.write("Walidacja Szlaku: " + out.split("\n")[0] + "\n");
if (r.status !== 0) { process.stderr.write(out + String(r.stderr || "")); process.exit(1); }

// Wygenerowane pliki muszą istnieć i zawierać wszystkie quizy z JSON
const errors = [];
const szlak = path.join(ROOT, "szlak");
if (!fs.existsSync(path.join(szlak, "szlak-dane.js"))) errors.push("brak szlak/szlak-dane.js (npm run build)");
const qdir = path.join(szlak, "quizy");
if (fs.existsSync(qdir)) {
  fs.readdirSync(qdir).forEach(function (lvl) {
    const js = path.join(szlak, "quizy-" + lvl + ".js");
    if (!fs.existsSync(js)) { errors.push("brak szlak/quizy-" + lvl + ".js (npm run build)"); return; }
    const text = fs.readFileSync(js, "utf8");
    fs.readdirSync(path.join(qdir, lvl)).filter(function (f) { return /\.json$/.test(f); }).forEach(function (f) {
      const id = JSON.parse(fs.readFileSync(path.join(qdir, lvl, f), "utf8")).id;
      if (text.indexOf('Q["' + id + '"]') === -1) errors.push("quizy-" + lvl + ".js nie zawiera " + id + " (npm run build)");
    });
  });
}
if (errors.length) { console.error("BŁĘDY:\n" + errors.map(function (e) { return "  - " + e; }).join("\n")); process.exit(1); }
console.log("OK");
