/*
 * waliduj-mowienie.js — sprawdza dane trenerów mówienia (paczka v6, spec 18, sekcje 3–6;
 * te same reguły co część „mowienie” w docs/rozbudowa-v6/scripts/validate_v6.py):
 *
 *   niezbednik/matura-podstawowa/trening/mowienie.json    format "matura": rozmowa wstępna 10 grup × 3–4 pytania,
 *        po 12 kart w zadaniach 1–3 (elements = 4, examinerLines 4–6, pytania 3 / 2, options = 3, opisy w słowach),
 *   niezbednik/egzamin-osmoklasisty/trening/mowienie.json  format "simple": 24 karty, po 8 każdego rodzaju, 2–4 pytania, 60–90 s,
 *   niezbednik/certyfikat-b2/trening/mowienie.json         format B2: pule 10 / 14 / 10 / 10, wszystkie karty z id, Part 3 = 5 opcji.
 *
 * Wszędzie: unikalne id w pliku, kryteria (id a–z do 20 znaków, label, hint), niepuste teksty.
 *
 * Użycie (z folderu projektu):  node tools/waliduj-mowienie.js   (kod wyjścia 1 przy błędach)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const errors = [];
function err(m) { errors.push(m); }
function nonEmpty(s) { return typeof s === "string" && s.trim().length > 0; }
function wc(s) { return (String(s || "").match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []).length; }
function load(rel) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) { err(rel + ": brak pliku"); return null; }
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { err(rel + ": niepoprawny JSON (" + e.message + ")"); return null; }
}

function criteria(d, at) {
  const c = d.criteria;
  if (!Array.isArray(c) || !c.length || c.length > 8) { err(at + ": criteria – 1–8 kryteriów"); return; }
  c.forEach(function (x) { if (!/^[a-z]{1,20}$/.test(x.id || "") || !nonEmpty(x.label) || !nonEmpty(x.hint)) err(at + ": kryterium wymaga id (a–z, do 20 znaków), label i hint"); });
}

function uniqueIds(items, ids, at, part) {
  items.forEach(function (x) {
    if (!x.id || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(x.id) || ids[x.id]) err(at + " [" + part + "]: brak id, zły format albo powtórzone id " + JSON.stringify(x.id));
    ids[x.id] = true;
  });
}

function texts(list) { return Array.isArray(list) && list.length && list.every(nonEmpty); }

function matura(rel) {
  const d = load(rel);
  if (!d) return;
  criteria(d, rel);
  if (d.format !== "matura") err(rel + ": format musi być \"matura\"");
  if (!nonEmpty(d.note)) err(rel + ": brak note (czasy orientacyjne, informator CKE)");
  const ids = {};
  const intro = d.intro || {};
  if (!(intro.seconds > 0)) err(rel + " [intro]: seconds > 0");
  uniqueIds(intro.groups || [], ids, rel, "intro");
  (intro.groups || []).forEach(function (g) {
    if (!nonEmpty(g.topic)) err(rel + " [" + g.id + "]: brak topic");
    if (!Array.isArray(g.questions) || g.questions.length < 3 || g.questions.length > 4 || !g.questions.every(nonEmpty)) err(rel + " [" + g.id + "]: rozmowa wstępna – 3–4 pytania");
  });
  [["roleplay", 12], ["picture", 12], ["choice", 12]].forEach(function (x) {
    const P = d[x[0]] || {};
    if (!nonEmpty(P.title) || !(P.seconds > 0)) err(rel + " [" + x[0] + "]: title i seconds > 0");
    uniqueIds(P.cards || [], ids, rel, x[0]);
    if ((P.cards || []).length < x[1]) err(rel + ": " + x[0] + " ma " + (P.cards || []).length + ", wymagane min. " + x[1]);
  });
  if ((intro.groups || []).length < 10) err(rel + ": intro ma " + (intro.groups || []).length + ", wymagane min. 10");
  ((d.roleplay || {}).cards || []).forEach(function (c) {
    const q = rel + " [" + c.id + "]";
    if (!nonEmpty(c.topic) || !nonEmpty(c.situation)) err(q + ": topic i situation");
    if (!Array.isArray(c.elements) || c.elements.length !== 4 || !c.elements.every(nonEmpty)) err(q + ": dokładnie 4 elements");
    if (!Array.isArray(c.examinerLines) || c.examinerLines.length < 4 || c.examinerLines.length > 6 || !c.examinerLines.every(nonEmpty)) err(q + ": 4–6 examinerLines");
    if (!Array.isArray(c.usefulPhrases) || c.usefulPhrases.length < 3 || c.usefulPhrases.length > 6) err(q + ": 3–6 usefulPhrases");
  });
  ((d.picture || {}).cards || []).forEach(function (c) {
    const q = rel + " [" + c.id + "]";
    if (!nonEmpty(c.topic)) err(q + ": brak topic");
    if (!Array.isArray(c.questions) || c.questions.length !== 3 || !c.questions.every(nonEmpty)) err(q + ": dokładnie 3 pytania");
    const n = wc(c.description);
    if (n < 40 || n > 80) err(q + ": description " + n + " słów (40–80)");
    if (!Array.isArray(c.usefulPhrases) || c.usefulPhrases.length < 3 || c.usefulPhrases.length > 6) err(q + ": 3–6 usefulPhrases");
  });
  ((d.choice || {}).cards || []).forEach(function (c) {
    const q = rel + " [" + c.id + "]";
    if (!nonEmpty(c.topic) || !nonEmpty(c.situation)) err(q + ": topic i situation");
    if (!Array.isArray(c.options) || c.options.length !== 3 || !Array.isArray(c.questions) || c.questions.length !== 2 || !Array.isArray(c.criteria) || c.criteria.length !== 2) err(q + ": 3 options, 2 criteria, 2 questions");
    (c.options || []).forEach(function (o) { const n = wc(o); if (n < 8 || n > 40) err(q + ": opcja ma " + n + " słów (8–40)"); });
  });
}

function simple(rel) {
  const d = load(rel);
  if (!d) return;
  criteria(d, rel);
  if (d.format !== "simple") err(rel + ": format musi być \"simple\"");
  if (!nonEmpty(d.note)) err(rel + ": brak note (informacja, że egzamin nie ma części ustnej)");
  const kinds = { opis: 0, sytuacja: 0, opinia: 0 };
  const ids = {};
  uniqueIds(d.cards || [], ids, rel, "cards");
  (d.cards || []).forEach(function (c) {
    const q = rel + " [" + c.id + "]";
    if (!(c.kind in kinds)) err(q + ": kind spoza opis / sytuacja / opinia"); else kinds[c.kind]++;
    if (!nonEmpty(c.topic) || !nonEmpty(c.task)) err(q + ": topic i task");
    if (!Array.isArray(c.questions) || c.questions.length < 2 || c.questions.length > 4 || !c.questions.every(nonEmpty)) err(q + ": 2–4 pytania");
    if (!Array.isArray(c.usefulPhrases) || c.usefulPhrases.length < 3 || c.usefulPhrases.length > 5) err(q + ": 3–5 usefulPhrases");
    if (!(c.seconds >= 60 && c.seconds <= 90)) err(q + ": seconds 60–90");
  });
  if (Object.keys(kinds).some(function (k) { return kinds[k] !== 8; })) err(rel + ": wymagane po 8 kart każdego rodzaju, jest " + JSON.stringify(kinds));
}

function b2(rel) {
  const d = load(rel);
  if (!d) return;
  criteria(d, rel);
  const need = { part1: ["groups", 10], part2: ["cards", 14], part3: ["tasks", 10], part4: ["groups", 10] };
  const ids = {};
  Object.keys(need).forEach(function (part) {
    const P = d[part];
    if (!P || !nonEmpty(P.title)) { err(rel + ": brak " + part + " (z title)"); return; }
    const key = need[part][0];
    const items = P[key] || [];
    if (items.length < need[part][1]) err(rel + ": " + part + " ma " + items.length + ", wymagane min. " + need[part][1]);
    uniqueIds(items, ids, rel, part);
    if (part === "part3") { if (!(P.discussionSeconds > 0) || !(P.decisionSeconds > 0)) err(rel + " part3: discussionSeconds i decisionSeconds > 0"); }
    else if (!(P.seconds > 0)) err(rel + " " + part + ": seconds > 0");
    items.forEach(function (x) {
      const q = rel + " [" + x.id + "]";
      if (part === "part2") { if (!nonEmpty(x.a) || !nonEmpty(x.b) || !nonEmpty(x.question)) err(q + ": a, b i question"); }
      else if (part === "part3") { if (!nonEmpty(x.central) || !nonEmpty(x.decision) || !Array.isArray(x.options) || x.options.length !== 5 || !x.options.every(nonEmpty)) err(q + ": central, decision i 5 opcji"); }
      else if (!nonEmpty(x.topic) || !texts(x.questions)) err(q + ": temat i niepuste pytania");
    });
  });
}

matura("niezbednik/matura-podstawowa/trening/mowienie.json");
simple("niezbednik/egzamin-osmoklasisty/trening/mowienie.json");
b2("niezbednik/certyfikat-b2/trening/mowienie.json");

if (errors.length) {
  console.error(errors.join("\n"));
  console.error("\nMówienie: " + errors.length + " błędów.");
  process.exit(1);
}
console.log("Trenery mówienia (matura, E8, B2): OK");
