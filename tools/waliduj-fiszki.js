/*
 * waliduj-fiszki.js — uruchamia walidator talii fiszek z paczki (scripts/validate_fiszki.py)
 * w ramach `npm run validate`. Sprawdza talie z dane/fiszki/ (identyfikatory, liczby kart,
 * składnię cloze, listy accepted) i obecność wektorów harmonogramu.
 *
 * Szuka działającego interpretera Pythona (python3, python, py -3) — na Windows „python3”
 * bywa tylko skrótem do Microsoft Store, więc każdy kandydat jest najpierw sprawdzany.
 *
 * Użycie (z folderu projektu):
 *   node tools/waliduj-fiszki.js
 */
"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "validate_fiszki.py");
const CANDIDATES = [["python3"], ["python"], ["py", "-3"]];

function works(cmd) {
  const r = spawnSync(cmd[0], cmd.slice(1).concat(["-c", "import sys; print(sys.version_info[0])"]), { encoding: "utf8" });
  return r.status === 0 && /^3/.test(String(r.stdout).trim());
}

const python = CANDIDATES.find(works);
if (!python) {
  console.error("Walidacja fiszek: nie znaleziono Pythona 3 (python3, python ani py). Zainstaluj Pythona albo uruchom scripts/validate_fiszki.py ręcznie.");
  process.exit(1);
}
const r = spawnSync(python[0], python.slice(1).concat(["-X", "utf8", SCRIPT]), { cwd: ROOT, stdio: "inherit" });
process.exit(r.status === null ? 1 : r.status);
