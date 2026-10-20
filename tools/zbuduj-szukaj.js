/*
 * zbuduj-szukaj.js — indeks wyszukiwarki (spec 04, część A.2).
 *
 * Grupy i źródła:
 *   pages      podstrony niezbędnika A1–C2 (niezbednik/index.json + *.md) i podsumowania poziomów
 *   exams      strony zakładki „Certyfikat C1” (niezbednik/certyfikat-c1/manifest.json + strony/*.md)
 *   exercises  zestawy z dane/cwiczenia-tematy.json, mixy z dane/mixes.json, zestawy Use of English C1
 *   lab        czasy z dane/lab-czasow.json
 * Notatki i Dziennik błędów są prywatne — dokłada je przeglądarka (js/search.js), nie ten plik.
 *
 * Rekord: { id, group, title, headings[], summary, text (bez Markdownu, maks. 4000 znaków),
 *           level, category, route }
 * Wyjście: dane/szukaj-indeks.js (ELM.SEARCH_INDEX), ładowany na żądanie przy pierwszym
 * otwarciu wyszukiwarki. Plik .js zamiast .json, bo fetch() nie działa przy file://.
 * Gdy indeks przekroczy ~1 MB, tekst jest skracany do nagłówków i pierwszych akapitów.
 *
 * Użycie: node tools/zbuduj-szukaj.js   (część npm run build)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const N = path.join(ROOT, "niezbednik");
const TEXT_MAX = 4000;
const SIZE_LIMIT = 1024 * 1024;

function read(file) { return fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n"); }
function readJson(file) { return JSON.parse(read(file)); }

/** Frontmatter (klucz: wartość) i treść bez niego. */
function splitMd(md) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(md);
  const meta = {};
  if (m) m[1].split("\n").forEach(function (line) { const k = /^(\w+):\s*(.*)$/.exec(line); if (k) meta[k[1]] = k[2].trim(); });
  return { meta: meta, body: m ? md.slice(m[0].length) : md };
}

/** Nagłówki ## i ### (bez #). */
function headings(body) {
  return (body.match(/^#{2,3}\s+.+$/gm) || []).map(function (h) { return clean(h.replace(/^#+\s+/, "")); });
}

/** Tekst bez składni Markdown (linki, [[id]], pogrubienia, tabele, cytaty, listy). */
function clean(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?\s*:?-{2,}.*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+(\[[ xX]\]\s*)?/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_`~]+/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ") > max * 0.8 ? cut.lastIndexOf(" ") : max);
}

const records = [];
function add(r) {
  records.push({
    id: r.id, group: r.group, title: r.title || "", headings: r.headings || [], summary: r.summary || "",
    text: clip(r.text || "", TEXT_MAX), level: r.level || null, category: r.category || null, route: r.route
  });
}

// ---------- Strony niezbędnika ----------
const index = readJson(path.join(N, "index.json"));
index.levels.forEach(function (lvl) {
  lvl.items.forEach(function (item) {
    const file = path.join(N, item.file);
    if (!fs.existsSync(file)) return;
    const md = splitMd(read(file));
    add({
      id: "page:" + item.id, group: "pages", title: md.meta.title || item.label, headings: headings(md.body),
      summary: md.meta.summary || "", text: clean(md.body.replace(/^#\s+.+$/m, "")), level: lvl.level,
      category: (index.categories || {})[item.category] || item.category, route: "#/" + item.file.replace(/\.md$/, "")
    });
  });
});
const sumDir = path.join(N, "podsumowania");
if (fs.existsSync(sumDir)) fs.readdirSync(sumDir).filter(function (f) { return /\.md$/.test(f); }).sort().forEach(function (f) {
  const lvl = f.replace(/\.md$/, "").toUpperCase();
  const md = splitMd(read(path.join(sumDir, f)));
  add({ id: "summary:" + lvl, group: "pages", title: "Podsumowanie poziomu " + lvl, headings: headings(md.body), text: clean(md.body), level: lvl, route: "#/" + lvl.toLowerCase() });
});

// ---------- Certyfikat C1 ----------
const C1 = path.join(N, "certyfikat-c1");
if (fs.existsSync(path.join(C1, "manifest.json"))) {
  const man = readJson(path.join(C1, "manifest.json"));
  (man.sections || []).forEach(function (sec) {
    (sec.pages || []).forEach(function (pg) {
      const file = path.join(C1, pg.file);
      if (!fs.existsSync(file)) return;
      const md = splitMd(read(file));
      add({
        id: "c1:" + pg.id, group: "exams", title: md.meta.title || pg.label, headings: headings(md.body), summary: md.meta.summary || "",
        text: clean(md.body.replace(/^#\s+.+$/m, "")), level: "C1", category: "Certyfikat C1 · " + sec.label,
        route: pg.id === "przeglad" ? "#/certyfikat-c1" : "#/certyfikat-c1/" + pg.id
      });
    });
  });
  const exDir = path.join(C1, "cwiczenia");
  if (fs.existsSync(exDir)) fs.readdirSync(exDir).filter(function (f) { return /\.json$/.test(f); }).sort().forEach(function (f) {
    const s = readJson(path.join(exDir, f));
    add({ id: "c1set:" + s.id, group: "exercises", title: "Use of English Part " + s.part + ": " + s.title, summary: s.instructions || "", text: "", level: "C1", category: "Certyfikat C1", route: "#/certyfikat-c1/cwiczenia/" + s.id });
  });
}

// ---------- Ćwiczenia (zestawy tematów i mixy) ----------
const topicTitle = {};
index.levels.forEach(function (lvl) { lvl.items.forEach(function (it) {
  const file = path.join(N, it.file);
  topicTitle[it.id] = fs.existsSync(file) ? (splitMd(read(file)).meta.title || it.label) : it.label;
}); });
const mapFile = path.join(ROOT, "dane", "cwiczenia-tematy.json");
if (fs.existsSync(mapFile)) {
  const map = readJson(mapFile).topics || {};
  Object.keys(map).forEach(function (t) {
    map[t].forEach(function (id) {
      const file = path.join(ROOT, "cwiczenia", "tematy", id + ".json");
      if (!fs.existsSync(file)) return;
      const s = readJson(file);
      add({ id: "set:" + id, group: "exercises", title: s.title, summary: s.intro || "", text: "Temat: " + (topicTitle[t] || t), level: s.level, category: "Zestaw zadań", route: "#/cwiczenia/zestaw/" + id });
    });
  });
}
const mixFile = path.join(ROOT, "dane", "mixes.json");
if (fs.existsSync(mixFile)) readJson(mixFile).mixes.forEach(function (m) {
  add({ id: "mix:" + m.id, group: "exercises", title: m.title, summary: m.description || "", text: "Zestaw mieszany. Tematy: " + m.topics.map(function (t) { return topicTitle[t] || t; }).join(", "), category: "Zestaw mieszany", route: "#/cwiczenia/mix/" + m.id });
});

// ---------- Laboratorium czasów ----------
const labFile = path.join(ROOT, "dane", "lab-czasow.json");
if (fs.existsSync(labFile)) readJson(labFile).tenses.forEach(function (t) {
  add({
    id: "lab:" + t.id, group: "lab", title: t.name, headings: [t.namePl], summary: t.summary,
    text: [].concat(
      (t.uses || []).map(function (u) { return u.label + ": " + u.en + " " + u.pl; }),
      ["Sygnały: " + (t.signals || []).join(", ")],
      t.traps || [],
      (t.contrasts || []).map(function (c) { return c.rule + " " + (c.examples || []).join(" "); })
    ).join(" "),
    level: t.level, category: "Laboratorium czasów", route: "#/laboratorium-czasow/" + t.id
  });
});

// ---------- Zapis (z kontrolą rozmiaru) ----------
let json = JSON.stringify({ version: 1, records: records });
if (json.length > SIZE_LIMIT) {
  records.forEach(function (r) { r.text = clip(r.text, 900); });
  json = JSON.stringify({ version: 1, records: records });
}
fs.writeFileSync(path.join(ROOT, "dane", "szukaj-indeks.js"),
  "/* Indeks wyszukiwarki — GENEROWANY przez tools/zbuduj-szukaj.js, nie edytuj ręcznie. */\nwindow.ELM = window.ELM || {};\nELM.SEARCH_INDEX = " + json + ";\n", "utf8");
const groups = {};
records.forEach(function (r) { groups[r.group] = (groups[r.group] || 0) + 1; });
console.log("Wyszukiwarka: rekordy " + records.length + " (" + Object.keys(groups).map(function (g) { return g + " " + groups[g]; }).join(", ") + "), rozmiar " + Math.round(json.length / 1024) + " KB");
