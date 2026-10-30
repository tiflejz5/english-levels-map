/*
 * zbuduj-zwroty.js — bank zwrotów do pisania (paczka v6, spec 17, sekcja 2).
 *
 *   dane/pisanie/zwroty.json        źródło (edytuj to)
 *   dane/pisanie/zwroty-dane.js     ELM.ZWROTY = { version, groups } — ładowany na żądanie (js/pisanie-zwroty.js),
 *                                   działa też z file:// (bez fetch)
 *
 * Walidacja treści: tools/waliduj-zwroty.js (npm run validate).
 *
 * Użycie (z folderu projektu):
 *   node tools/zbuduj-zwroty.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "dane", "pisanie", "zwroty.json");
const OUT = path.join(ROOT, "dane", "pisanie", "zwroty-dane.js");

const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
const total = data.groups.reduce(function (n, g) { return n + g.phrases.length; }, 0);
fs.writeFileSync(OUT,
  "/* Bank zwrotów do pisania — GENEROWANY przez tools/zbuduj-zwroty.js, nie edytuj ręcznie (źródło: dane/pisanie/zwroty.json). */\n" +
  "window.ELM = window.ELM || {};\nELM.ZWROTY = " + JSON.stringify(data) + ";\n", "utf8");
console.log("Zwroty: grupy " + data.groups.length + ", zwroty " + total);
