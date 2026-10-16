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
 * Wpisy z index.json bez pliku .md są pomijane (punkt nie dostanie linku).
 *
 * Dodatkowo (jeśli istnieją):
 *   niezbednik/podsumowania/<poziom>.md — podsumowanie pod listą poziomu,
 *   niezbednik/strona-glowna.md         — treść strony głównej.
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

function readMd(file) {
  return fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
}

// Podsumowania poziomów: klucz = kod poziomu (A1…C2) z nazwy pliku
const summaries = {};
const summariesDir = path.join(ROOT, "podsumowania");
if (fs.existsSync(summariesDir)) {
  fs.readdirSync(summariesDir).filter(function (f) { return /\.md$/i.test(f); }).sort().forEach(function (f) {
    summaries[f.replace(/\.md$/i, "").toUpperCase()] = readMd(path.join(summariesDir, f));
  });
}

// Strona główna
const homeFile = path.join(ROOT, "strona-glowna.md");
const home = fs.existsSync(homeFile) ? readMd(homeFile) : null;

const header =
  "/*\n" +
  " * PLIK GENEROWANY AUTOMATYCZNIE — nie edytuj ręcznie.\n" +
  " * Źródło: niezbednik/index.json i niezbednik/<poziom>/*.md\n" +
  " * Odśwież poleceniem: node tools/zbuduj-niezbednik.js\n" +
  " */\n";

const body = "window.ELM = window.ELM || {};\nwindow.ELM.NIEZBEDNIK = " +
  JSON.stringify({ index: index, pages: pages, summaries: summaries, home: home }, null, 1) + ";\n";

fs.writeFileSync(OUT, header + body, "utf8");

console.log("Zapisano: " + path.relative(process.cwd(), OUT));
console.log("Podstrony: " + Object.keys(pages).length + ", wpisy bez pliku: " + missing.length);
console.log("Podsumowania: " + (Object.keys(summaries).join(", ") || "brak") + "; strona główna: " + (home ? "tak" : "brak"));
warnings.forEach(function (w) { console.log("UWAGA: " + w); });

// =====================================================================
// ZAKŁADKA „CERTYFIKAT C1” (niezbednik/certyfikat-c1/)
//   manifest.json   — sekcje, strony, zestawy ćwiczeń i trenery
//   strony/*.md     — strony zakładki
//   cwiczenia/*.json, trening/*.json, powiazania.json
// Wynik: niezbednik/certyfikat-c1-dane.js (ELM.C1)
// =====================================================================

const C1_ROOT = path.join(ROOT, "certyfikat-c1");
const C1_OUT = path.join(ROOT, "certyfikat-c1-dane.js");

if (fs.existsSync(path.join(C1_ROOT, "manifest.json"))) {
  const readJson = function (rel) {
    return JSON.parse(fs.readFileSync(path.join(C1_ROOT, rel), "utf8").replace(/^﻿/, ""));
  };
  const manifest = readJson("manifest.json");
  const c1 = { manifest: manifest, pages: {}, exercises: {}, trainers: {}, links: null };
  const c1Missing = [];

  manifest.sections.forEach(function (section) {
    (section.pages || []).forEach(function (page) {
      const file = path.join(C1_ROOT, page.file);
      if (fs.existsSync(file)) c1.pages[page.id] = readMd(file);
      else c1Missing.push(page.file);
    });
    (section.exerciseGroups || []).forEach(function (group) {
      group.sets.forEach(function (set) {
        if (fs.existsSync(path.join(C1_ROOT, set.file))) c1.exercises[set.id] = readJson(set.file);
        else c1Missing.push(set.file);
      });
    });
    if (section.trainer) {
      if (fs.existsSync(path.join(C1_ROOT, section.trainer.file))) c1.trainers[section.trainer.id] = readJson(section.trainer.file);
      else c1Missing.push(section.trainer.file);
    }
  });
  if (manifest.links && manifest.links.file && fs.existsSync(path.join(C1_ROOT, manifest.links.file))) {
    c1.links = readJson(manifest.links.file);
  }

  fs.writeFileSync(C1_OUT,
    "/*\n * PLIK GENEROWANY AUTOMATYCZNIE — nie edytuj ręcznie.\n" +
    " * Źródło: niezbednik/certyfikat-c1/\n" +
    " * Odśwież poleceniem: node tools/zbuduj-niezbednik.js\n */\n" +
    "window.ELM = window.ELM || {};\nwindow.ELM.C1 = " + JSON.stringify(c1, null, 1) + ";\n", "utf8");

  console.log("Zapisano: " + path.relative(process.cwd(), C1_OUT));
  console.log("Certyfikat C1: strony " + Object.keys(c1.pages).length + ", zestawy " + Object.keys(c1.exercises).length +
    ", trenery " + Object.keys(c1.trainers).length + ", ramki " + (c1.links ? c1.links.links.length : 0));
  c1Missing.forEach(function (f) { console.log("UWAGA: brak pliku certyfikat-c1/" + f); });
}
