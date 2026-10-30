/*
 * waliduj-v6.js — pełny walidator paczki v6 (docs/rozbudowa-v6/scripts/validate_v6.py, bez --only) w npm run validate i build.
 *
 *   1. Ściągi poziomów (część „sciagi”): sprawdzane tu po stronie Node (frontmatter, wymagane sekcje, brak ~~, długość).
 *   2. Całość validate_v6.py (zadania, test, testy końcowe, fiszki, ściągi, życie, wzorce, zwroty, mówienie), gdy w systemie jest Python 3
 *      (python3, python albo py -3). Bez Pythona krok jest pomijany z ostrzeżeniem – pozostałe walidatory Node (tools/waliduj-*.js)
 *      sprawdzają te same dane osobno.
 *
 * Użycie (z folderu projektu):  node tools/waliduj-v6.js   (kod wyjścia 1 przy błędach)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.join(__dirname, "..");
const errors = [];
const warnings = [];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const HEADINGS = ["Gramatyka", "Zwroty", "Słowa-sygnały", "Uwaga na"];

LEVELS.forEach(function (lvl) {
  const rel = "niezbednik/sciagi/" + lvl.toLowerCase() + ".md";
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) { errors.push(rel + ": brak pliku"); return; }
  const text = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m || m[1].indexOf("id: sciaga-" + lvl.toLowerCase()) === -1) errors.push(rel + ": frontmatter musi mieć id: sciaga-" + lvl.toLowerCase());
  const heads = (text.match(/^## (.+)$/gm) || []).map(function (h) { return h.slice(3).trim(); });
  if (heads.indexOf("Czasy i formy") === -1 && heads.indexOf("Struktury") === -1) errors.push(rel + ": brak sekcji „Czasy i formy” albo „Struktury”");
  HEADINGS.forEach(function (h) { if (heads.indexOf(h) === -1) errors.push(rel + ": brak sekcji „" + h + "”"); });
  if (text.indexOf("~~") !== -1) errors.push(rel + ": renderer nie obsługuje ~~przekreślenia~~ – użyj ✗ … → ✓ …");
  const body = m ? text.slice(m[0].length) : text;
  const n = (body.replace(/[|#*\-_>`]/g, " ").match(/[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż0-9][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż0-9'’-]*/g) || []).length;
  if (n > 650) warnings.push(rel + ": " + n + " słów – ryzyko, że ściąga nie zmieści się na 1 stronie A4");
});

// Pełny validate_v6.py
const script = path.join(ROOT, "docs", "rozbudowa-v6", "scripts", "validate_v6.py");
let ran = false;
if (fs.existsSync(script)) {
  const candidates = [["python3", []], ["python", []], ["py", ["-3"]]];
  for (let i = 0; i < candidates.length && !ran; i++) {
    const r = cp.spawnSync(candidates[i][0], candidates[i][1].concat([script, ROOT]), { encoding: "utf8", env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }) });
    if (r.error || (r.status === 9009)) continue; // brak polecenia
    if (r.status === null || /No module|not found|nie jest rozpoznawana/i.test(String(r.stderr || ""))) continue;
    ran = true;
    const out = String(r.stdout || "").trim();
    if (out) console.log(out);
    if (r.status !== 0) errors.push("validate_v6.py zakończył się kodem " + r.status + (r.stderr ? ": " + String(r.stderr).trim().split("\n").pop() : ""));
  }
  if (!ran) warnings.push("nie znaleziono Pythona 3 – pominięto docs/rozbudowa-v6/scripts/validate_v6.py (walidatory Node sprawdzają te same dane)");
}

warnings.forEach(function (w) { console.log("Ostrzeżenie: " + w); });
if (errors.length) {
  console.error(errors.join("\n"));
  console.error("\nWalidator v6: " + errors.length + " błędów.");
  process.exit(1);
}
console.log("Walidator v6 (ściągi" + (ran ? " + validate_v6.py, całość" : "") + "): OK");
