/*
 * zbuduj-niezbednik.js — składa podstrony z folderu niezbednik/ w jeden plik
 * niezbednik/niezbednik-dane.js, który strona wczytuje zwykłym <script src>.
 *
 * Dlaczego? Przy otwieraniu strony z dysku (file://) przeglądarki blokują
 * wczytywanie plików .md i .json przez fetch(). Plik .js działa zawsze.
 *
 * Użycie (z folderu projektu):
 *   node tools/zbuduj-niezbednik.js
 *
 * Dodanie kolejnego poziomu (np. A2): wrzuć pliki do niezbednik/a2/,
 * upewnij się, że są wpisane w niezbednik/index.json, uruchom skrypt.
 * Wpisy z index.json bez pliku .md są pomijane (strona pokaże „wkrótce”).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "niezbednik");
const OUT = path.join(ROOT, "niezbednik-dane.js");

const index = JSON.parse(fs.readFileSync(path.join(ROOT, "index.json"), "utf8"));
const pages = {};
const missing = [];
const warnings = [];

index.levels.forEach(function (level) {
  level.items.forEach(function (item) {
    const file = path.join(ROOT, item.file);
    if (!fs.existsSync(file)) {
      missing.push(item.file);
      return;
    }
    const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
    // Prosta kontrola: id we frontmatter powinno zgadzać się z index.json
    const idMatch = /^---\n[\s\S]*?^id:\s*(.+)$/m.exec(text);
    if (idMatch && idMatch[1].trim() !== item.id) {
      warnings.push(item.file + ": id we frontmatter (" + idMatch[1].trim() + ") ≠ id w index.json (" + item.id + ")");
    }
    pages[item.file] = text;
  });
});

const header =
  "/*\n" +
  " * PLIK GENEROWANY AUTOMATYCZNIE — nie edytuj ręcznie.\n" +
  " * Źródło: niezbednik/index.json i niezbednik/<poziom>/*.md\n" +
  " * Odśwież poleceniem: node tools/zbuduj-niezbednik.js\n" +
  " */\n";

const body = "window.ELM = window.ELM || {};\nwindow.ELM.NIEZBEDNIK = " +
  JSON.stringify({ index: index, pages: pages }, null, 1) + ";\n";

fs.writeFileSync(OUT, header + body, "utf8");

console.log("Zapisano: " + path.relative(process.cwd(), OUT));
console.log("Podstrony: " + Object.keys(pages).length + ", bez pliku (wkrótce): " + missing.length);
warnings.forEach(function (w) { console.log("UWAGA: " + w); });
