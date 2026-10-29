/*
 * zbuduj-testy-koncowe.js — zamienia pule testów końcowych poziomów (JSON) na pliki .js ładowane
 * NA ŻĄDANIE zwykłym <script> (fetch() jest blokowany przy file://). Paczka v6, spec 13 sekcja 2.
 *
 * Wejście:  niezbednik/testy-poziomow/<a1|a2|b1|b2|c1|c2>.json   (zwykły zestaw silnika zadań + kind: "level-test")
 * Wyjście (GENEROWANE, nie edytuj ręcznie):
 *           niezbednik/testy-poziomow/<poziom>.js   ELM.LEVEL_TESTS["A1"] = pełny zestaw
 *
 * Zadania dostają pola dziedziczone (level, tags, setId) oraz category — kategorię podstrony z
 * niezbednik/index.json (czasy, gramatyka, funkcje, slownictwo), po której losowanie dba o proporcje
 * i liczy się podział wyniku. Poprawność treści sprawdza osobno: npm run validate.
 *
 * Użycie: node tools/zbuduj-testy-koncowe.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "niezbednik", "testy-poziomow");
const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
}

const index = readJson(path.join(ROOT, "niezbednik", "index.json"));
const category = {};
index.levels.forEach(function (l) { l.items.forEach(function (it) { category[it.id] = it.category; }); });

let pools = 0, items = 0;
const warnings = [];
LEVELS.forEach(function (l) {
  const file = path.join(DIR, l + ".json");
  if (!fs.existsSync(file)) { warnings.push("brak puli " + l + ".json (test końcowy " + l.toUpperCase() + " nie zadziała)"); return; }
  const set = readJson(file);
  set.items = (set.items || []).map(function (it) {
    if (!category[it.topic]) warnings.push(l + ": zadanie " + it.id + " ma nieznany topic „" + it.topic + "”");
    return Object.assign({ level: set.level, tags: [], setId: set.id }, it, { category: category[it.topic] || "gramatyka" });
  });
  fs.writeFileSync(path.join(DIR, l + ".js"),
    "/* Pula testu końcowego " + set.level + " — GENEROWANY przez tools/zbuduj-testy-koncowe.js, nie edytuj ręcznie. */\n" +
    "window.ELM = window.ELM || {};\n" +
    "(ELM.LEVEL_TESTS = ELM.LEVEL_TESTS || {})[" + JSON.stringify(set.level) + "] = " + JSON.stringify(set) + ";\n", "utf8");
  pools++;
  items += set.items.length;
});

console.log("Testy końcowe poziomów: pule " + pools + ", zadania " + items);
warnings.forEach(function (w) { console.warn("UWAGA (testy końcowe): " + w); });
