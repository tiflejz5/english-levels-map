/*
 * waliduj-c1-uoe.js — uruchamia walidator zestawów Use of English C1 z paczki v5
 * (scripts/validate_c1_uoe.py) w ramach `npm run validate`. Istniejący walidator
 * (tools/waliduj-cwiczenia.js) pomija zestawy C1, więc reguły się nie dublują.
 *
 * Walidator z paczki sprawdza wszystkie zestawy w niezbednik/certyfikat-c1/cwiczenia/,
 * także 19 starszych. W pięciu starszych zadaniach Part 4 zgłasza uwagi, które nie są
 * błędami treści (zestawów sprzed paczki nie zmieniamy):
 *   - „parts != model” — wzór używa poprawnej alternatywy, która nie jest pierwsza na
 *     liście parts (np. IF I HADN'T BEEN przy [IF I HAD NOT | IF I HADN'T] + BEEN),
 *   - „słowo kluczowe w zdaniu” — konstrukcja the more…, the more… powtarza THE.
 * Te uwagi są listą znanych wyjątków (KNOWN); każda inna uwaga zatrzymuje walidację.
 *
 * Użycie (z folderu projektu):
 *   node tools/waliduj-c1-uoe.js
 */
"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "validate_c1_uoe.py");
const CANDIDATES = [["python3"], ["python"], ["py", "-3"]];
const KNOWN = [
  "uoe-p4-mieszany.json #4: parts != model",
  "uoe-p4-nominalizacja-zwroty.json #4: parts != model",
  "uoe-p4-porownania.json #3: słowo kluczowe w zdaniu",
  "uoe-p4-warunki.json #2: parts != model",
  "uoe-p4-warunki.json #5: parts != model"
];

function works(cmd) {
  const r = spawnSync(cmd[0], cmd.slice(1).concat(["-c", "import sys; print(sys.version_info[0])"]), { encoding: "utf8" });
  return r.status === 0 && /^3/.test(String(r.stdout).trim());
}

const python = CANDIDATES.find(works);
if (!python) {
  console.error("Walidacja C1 UoE: nie znaleziono Pythona 3 (python3, python ani py).");
  process.exit(1);
}
const r = spawnSync(python[0], python.slice(1).concat(["-X", "utf8", SCRIPT, path.join(ROOT, "niezbednik")]), { cwd: ROOT, encoding: "utf8" });
const out = String(r.stdout || "");
const errors = out.split("\n").filter(function (l) { return /^ - /.test(l); }).map(function (l) { return l.slice(3).trim(); });
const unknown = errors.filter(function (e) { return KNOWN.indexOf(e) === -1; });
const count = /Zestawów:\s*(\d+)/.exec(out);
console.log("Walidacja C1 UoE: zestawy " + (count ? count[1] : "?") + ", znane uwagi w starszych zestawach: " + (errors.length - unknown.length));
if (r.status !== 0 && !errors.length) { process.stderr.write(out + String(r.stderr || "")); process.exit(1); }
if (unknown.length) {
  console.error("BŁĘDY:\n" + unknown.map(function (e) { return "  - " + e; }).join("\n"));
  process.exit(1);
}
console.log("OK");
