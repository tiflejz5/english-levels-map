/*
 * zbuduj-fiszki.js — talie fiszek z dane/fiszki/*.json (kopia z paczki, tylko do odczytu)
 * jako skrypty, które działają też z file:// (bez fetch):
 *
 *   dane/fiszki/fiszki-indeks.js   ELM.FISZKI_INDEX = { decks: [{ id, title, description, level, count, file }] }
 *                                  — mały, wczytywany przy starcie (plakietka w panelu, kafelek „Dziś”)
 *   dane/fiszki/talie/<id>.js      (ELM.FISZKI_DECKS ||= {})[id] = talia — wczytywane na żądanie (/fiszki)
 *
 * Nowa talia = nowy plik JSON + wpis w index.json (bez zmian w kodzie). Walidacja treści:
 * scripts/validate_fiszki.py (npm run validate).
 *
 * Użycie (z folderu projektu):
 *   node tools/zbuduj-fiszki.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "dane", "fiszki");
const OUT = path.join(DIR, "talie");

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function write(file, comment, body) {
  fs.writeFileSync(file, "/* " + comment + " — GENEROWANY przez tools/zbuduj-fiszki.js, nie edytuj ręcznie. */\nwindow.ELM = window.ELM || {};\n" + body + "\n", "utf8");
}

const index = readJson(path.join(DIR, "index.json"));
fs.mkdirSync(OUT, { recursive: true });
let cards = 0;
const decks = index.decks.map(function (d) {
  const deck = readJson(path.join(DIR, d.file));
  cards += deck.cards.length;
  write(path.join(OUT, d.id + ".js"), "Talia fiszek " + d.id,
    "(ELM.FISZKI_DECKS = ELM.FISZKI_DECKS || {})[" + JSON.stringify(d.id) + "] = " + JSON.stringify(deck) + ";");
  return { id: d.id, title: d.title, description: d.description, level: d.level, count: deck.cards.length, file: "dane/fiszki/talie/" + d.id + ".js" };
});
write(path.join(DIR, "fiszki-indeks.js"), "Indeks talii fiszek", "ELM.FISZKI_INDEX = " + JSON.stringify({ version: index.version, decks: decks }) + ";");
console.log("Fiszki: talie " + decks.length + ", karty " + cards);
