/*
 * waliduj-fiszki.js — uruchamia walidator talii fiszek z paczki (scripts/validate_fiszki.py)
 * w ramach `npm run validate`. Sprawdza talie z dane/fiszki/ (identyfikatory, liczby kart,
 * składnię cloze, listy accepted) i obecność wektorów harmonogramu.
 *
 * Dochodzi sprawdzenie talii z paczki v6 (spec 15, sekcja 5): zakresy liczby kart, count w index.json,
 * id <talia>-NNN, dokładnie jedna luka w cloze, poziomy kart tematycznych (A1/A2/B1, kolejność
 * niemalejąca), tag egzaminu na kartach egzaminacyjnych oraz ostrzeżenia (duplikaty odpowiedzi
 * między taliami, proporcje typów, liczba kolokacji).
 *
 * Szuka działającego interpretera Pythona (python3, python, py -3) — na Windows „python3”
 * bywa tylko skrótem do Microsoft Store, więc każdy kandydat jest najpierw sprawdzany.
 *
 * Użycie (z folderu projektu):
 *   node tools/waliduj-fiszki.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "dane", "fiszki");
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
if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);

// ---------- talie tematyczne i egzaminacyjne (paczka v6, spec 15) ----------

const THEME = ["temat-dom", "temat-jedzenie", "temat-praca", "temat-podroze", "temat-zdrowie", "temat-emocje", "temat-technologia"];
const EXAM = { "egz-e8": [40, 40], "egz-matura": [50, 50], "egz-b2-first": [50, 50] };
const EXAM_TAGS = ["e8", "mp", "mr", "matura", "b2", "c1"];
const LEVELS = ["A1", "A2", "B1"];
const REQUIRE_ALL = true; // talie z tabeli w spec 15 muszą istnieć

const errors = [];
const warnings = [];
const index = JSON.parse(fs.readFileSync(path.join(DIR, "index.json"), "utf8"));
const entries = {};
index.decks.forEach(function (d) { entries[d.id] = d; });

function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }

function answerOf(c) {
  if (c.type === "typed") return norm((c.accepted || [c.back])[0]);
  if (c.type === "cloze") {
    const m = /\{\{(.+?)\}\}/.exec(c.text || "");
    return m ? norm(m[1].split("|")[0]) : "";
  }
  return norm(c.back);
}

const answers = {};
index.decks.forEach(function (d) {
  const p = path.join(DIR, d.file);
  if (!fs.existsSync(p)) return;
  JSON.parse(fs.readFileSync(p, "utf8")).cards.forEach(function (c) {
    const a = answerOf(c);
    if (a) (answers[a] = answers[a] || []).push(c.id);
  });
});

THEME.concat(Object.keys(EXAM)).forEach(function (id) {
  const kind = THEME.indexOf(id) !== -1 ? "theme" : "exam";
  const file = path.join(DIR, id + ".json");
  if (!entries[id] || !fs.existsSync(file)) {
    (REQUIRE_ALL ? errors : warnings).push(id + ": talia z spec 15 nie jest jeszcze dodana (plik albo wpis w index.json)");
    return;
  }
  const deck = JSON.parse(fs.readFileSync(file, "utf8"));
  const cards = deck.cards || [];
  const range = kind === "theme" ? [30, 40] : EXAM[id];
  if (cards.length < range[0] || cards.length > range[1]) errors.push(id + ": " + cards.length + " kart, wymagane " + range[0] + "–" + range[1]);
  if (entries[id].count !== cards.length) errors.push(id + ": count w index.json = " + entries[id].count + ", a kart jest " + cards.length);
  let last = -1;
  let typed = 0;
  cards.forEach(function (c) {
    const where = id + " [" + c.id + "]";
    if (!new RegExp("^" + id + "-\\d{3}$").test(String(c.id))) errors.push(where + ": id musi mieć postać " + id + "-NNN");
    if (c.type === "typed") typed++;
    if (c.type === "cloze" && (String(c.text).match(/\{\{[^{}]+\}\}/g) || []).length !== 1) errors.push(where + ": cloze musi mieć dokładnie jedną lukę");
    if (kind === "theme") {
      const li = LEVELS.indexOf(c.level);
      if (li === -1) errors.push(where + ": karta tematyczna wymaga level A1/A2/B1");
      else if (li < last) errors.push(where + ": karty muszą iść od A1 do B1 (kolejność poziomów)");
      else last = li;
    } else if (!(c.tags || []).some(function (t) { return EXAM_TAGS.indexOf(String(t).toLowerCase()) !== -1; })) {
      errors.push(where + ": karta egzaminacyjna bez tagu egzaminu (" + EXAM_TAGS.join(", ") + ")");
    }
  });
  if (kind === "theme") {
    const share = typed / Math.max(1, cards.length);
    if (share < 0.5 || share > 0.7) warnings.push(id + ": typed to " + Math.round(100 * share) + "% kart (oczekiwane ok. 60%)");
    const colloc = cards.filter(function (c) { return (c.tags || []).indexOf("kolokacje") !== -1; }).length;
    if (colloc < 5) warnings.push(id + ": tylko " + colloc + " kart z tagiem „kolokacje” (wymagane min. 5)");
  }
});

Object.keys(answers).forEach(function (a) {
  const decks = {};
  answers[a].forEach(function (cid) { decks[cid.replace(/-\d{3}$/, "")] = true; });
  const names = Object.keys(decks);
  if (names.length > 1 && names.some(function (n) { return THEME.indexOf(n) !== -1 || EXAM[n]; })) {
    warnings.push("ta sama odpowiedź „" + a + "” w różnych taliach: " + answers[a].join(", "));
  }
});

warnings.forEach(function (w) { console.log("Ostrzeżenie: " + w); });
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Talie tematyczne i egzaminacyjne (spec 15): OK" + (warnings.length ? " (ostrzeżenia: " + warnings.length + ")" : ""));
