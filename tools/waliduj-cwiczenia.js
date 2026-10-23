/*
 * waliduj-cwiczenia.js — walidator danych ćwiczeń i Laboratorium czasów
 * (spec 01, sekcja 8, i spec 02). Uruchamiany przez `npm run validate`
 * i w `npm run build`; błędy przerywają budowanie (kod wyjścia 1).
 *
 * Sprawdza:
 *   - mapę dane/cwiczenia-tematy.json: tematy istnieją w niezbednik/index.json, pliki zestawów istnieją,
 *   - zestawy cwiczenia/tematy/*.json: poprawny JSON, id = nazwa pliku, topic istnieje,
 *     id zadań unikalne w całym banku, pola każdego typu (2–4 opcje, correct w zakresie,
 *     optionNotes, multizbiór wyrazów w reorder, errorRange, jedna luka w short-answer…),
 *     explanation, passage dla kind „reading”, script dla kind „listening”,
 *   - dane/lab-czasow.json: grupy, aspekty, poziomy, współrzędne osi w [-1, 1], from ≤ to,
 *     kontrasty z istniejącymi czasami, niezbednikIds,
 *   - dane/lab-wybor-czasu.json: start, każde next istnieje, każdy result to istniejący czas,
 *     brak martwych węzłów i cykli,
 *   - dane/mixes.json: id, tematy istnieją i mają zestawy, typy znane,
 *   - dane/egzaminy-manifest.json (rejestr egzaminów) i foldery aktywnych egzaminów w nowym formacie
 *     (niezbednik/<id>/): manifest (strony, zestawy, trener), zestawy (jak wyżej), powiązania (itemId
 *     istnieje w niezbednik/index.json, zestawy istnieją), wzorce trenera pisania w limicie wyrazów;
 *     powiązania Certyfikatu C1 (itemId),
 *   - (odpowiednik scripts/validate_matura.py) zestawy egzaminów w formacie C1 (multiple-choice-cloze,
 *     word-formation, open-cloze: luki {{n}} w tekście = gaps, maxScore = liczba luk, odpowiedzi, słowo
 *     bazowe ≠ odpowiedź), linki [[id]] w stronach egzaminu (strona modułu, temat niezbędnika albo zestaw),
 *     3–5 podpunktów w zadaniach pisania (jeśli są), choiceGroup zgodne z choiceGroups (po 2 zadania).
 *
 * Odpowiednik skryptu z paczki: scripts/validate_exercises.py (Python).
 * Użycie: node tools/waliduj-cwiczenia.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, ".."); // opcjonalnie: inny katalog (testy walidatora)
const errors = [];
const warnings = [];
function err(msg) { errors.push(msg); }

function readJson(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return undefined;
  try { return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, "")); } catch (e) { err(rel + ": niepoprawny JSON (" + e.message + ")"); return null; }
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TYPES = ["multiple-choice", "reorder", "find-error", "short-answer"];
const KINDS = ["form", "function", "reading", "listening"];

// Tematy z niezbędnika
const index = readJson("niezbednik/index.json");
const topics = new Set();
(index && index.levels || []).forEach(function (l) { l.items.forEach(function (it) { topics.add(it.id); }); });
if (!topics.size) err("niezbednik/index.json: brak tematów");

function words(sentence) {
  return String(sentence).trim().split(/\s+/).map(function (w) { return w.replace(/[.,!?;]+$/, "").replace(/’/g, "'").toLowerCase(); }).filter(Boolean);
}
function sameMultiset(a, b) { return a.slice().sort().join("\u0000") === b.slice().sort().join("\u0000"); }
function nonEmpty(s) { return typeof s === "string" && s.trim() !== ""; }

// ---------- Zestawy ----------
const itemIds = new Set();
const setsByTopic = {};
let itemCount = 0;

function checkItem(it, where, set) {
  const id = it && it.id;
  const at = where + " " + (id || "?");
  if (!nonEmpty(id)) err(where + ": zadanie bez id");
  else if (itemIds.has(id)) err(where + ": zdublowane id zadania " + id + " (id muszą być unikalne w całym banku)");
  else itemIds.add(id);
  itemCount++;
  if (TYPES.indexOf(it.type) === -1) { err(at + ": nieznany typ " + it.type); return; }
  if (!nonEmpty(it.explanation)) err(at + ": brak explanation");
  if (it.topic != null && !topics.has(it.topic)) err(at + ": topic " + it.topic + " nie istnieje w niezbednik/index.json");
  if (it.level != null && LEVELS.indexOf(it.level) === -1) err(at + ": nieznany poziom " + it.level);
  if (it.tags != null && !(Array.isArray(it.tags) && it.tags.every(nonEmpty))) err(at + ": tags musi być tablicą napisów");

  if (it.type === "multiple-choice") {
    const o = it.options;
    // Do ośmiu opcji tylko bez tasowania (fixedOrder, np. B2 Listening Part 3: A–H); tasowane — 2–4
    const maxOpts = it.fixedOrder ? 8 : 4;
    if (!Array.isArray(o) || o.length < 2 || o.length > maxOpts || !o.every(nonEmpty)) err(at + ": options — 2–" + maxOpts + " niepuste opcje");
    else if (new Set(o).size !== o.length) err(at + ": powtórzone opcje");
    if (!Number.isInteger(it.correct) || !Array.isArray(o) || it.correct < 0 || it.correct >= o.length) err(at + ": correct poza zakresem");
    if (it.optionNotes != null) {
      if (!Array.isArray(it.optionNotes) || !Array.isArray(o) || it.optionNotes.length !== o.length) err(at + ": optionNotes musi mieć tyle pozycji co options");
      else if (Number.isInteger(it.correct) && it.correct >= 0 && it.correct < o.length && it.optionNotes[it.correct] !== null) err(at + ": optionNotes dla poprawnej opcji musi być null");
    }
    if (it.kind != null && KINDS.indexOf(it.kind) === -1) err(at + ": nieznany kind " + it.kind);
    if ((it.kind == null || it.kind === "form") && String(it.prompt || "").indexOf("___") === -1) err(at + ": kind „form” wymaga luki ___ w prompt");
    if (it.kind === "reading" && !nonEmpty(set.passage)) err(at + ": kind „reading” bez passage w zestawie");
    if (it.kind === "listening" && !nonEmpty(it.script) && !nonEmpty(set && set.script)) err(at + ": kind „listening” bez script (w zadaniu ani w zestawie)");
  } else if (it.type === "reorder") {
    const a = it.answers;
    if (!Array.isArray(a) || !a.length || !a.every(nonEmpty)) { err(at + ": brak answers"); return; }
    const base = words(a[0]);
    if (base.length < 2) err(at + ": zdanie do ułożenia ma mniej niż 2 wyrazy");
    a.slice(1).forEach(function (x) { if (!sameMultiset(words(x), base)) err(at + ": answers mają różne zestawy wyrazów („" + x + "”)"); });
    const extra = it.extraTokens || [];
    if (!Array.isArray(extra) || extra.length > 2) err(at + ": extraTokens — najwyżej 2");
    else extra.forEach(function (e) { if (base.indexOf(String(e).toLowerCase()) !== -1) err(at + ": extraToken „" + e + "” występuje w odpowiedzi"); });
  } else if (it.type === "find-error") {
    if (!Array.isArray(it.tokens) || it.tokens.length < 2 || !it.tokens.every(nonEmpty)) err(at + ": tokens — co najmniej 2 wyrazy");
    if (!it.noError) {
      const r = it.errorRange;
      if (!(Array.isArray(r) && r.length === 2 && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 0 && r[0] <= r[1] && Array.isArray(it.tokens) && r[1] < it.tokens.length)) err(at + ": errorRange poza tokens");
      if (!Array.isArray(it.fixes) || !it.fixes.length || !it.fixes.every(function (f) { return typeof f === "string"; })) err(at + ": fixes — niepusta lista");
      else if (Array.isArray(r) && Array.isArray(it.tokens)) {
        const wrong = it.tokens.slice(r[0], r[1] + 1).join(" ").toLowerCase();
        it.fixes.forEach(function (f) { if (f.toLowerCase() === wrong) err(at + ": poprawka „" + f + "” jest taka sama jak błędny fragment"); });
      }
    }
  } else if (it.type === "short-answer") {
    if ((String(it.prompt || "").match(/___/g) || []).length !== 1) err(at + ": prompt musi mieć dokładnie jedną lukę ___");
    if (!Array.isArray(it.accepted) || !it.accepted.length || !it.accepted.every(nonEmpty)) err(at + ": accepted — niepusta lista");
  }
}

const SETS_DIR = path.join(ROOT, "cwiczenia", "tematy");
const setFiles = fs.existsSync(SETS_DIR) ? fs.readdirSync(SETS_DIR).filter(function (f) { return /\.json$/.test(f); }).sort() : [];
const setIds = new Set();
setFiles.forEach(function (f) {
  const rel = "cwiczenia/tematy/" + f;
  const set = readJson(rel);
  if (!set) return;
  const id = f.replace(/\.json$/, "");
  setIds.add(id);
  if (set.id !== id) err(rel + ": id zestawu (" + set.id + ") ≠ nazwa pliku");
  if (set.version !== 1) err(rel + ": version musi być 1");
  if (set.topic != null && !topics.has(set.topic)) err(rel + ": topic " + set.topic + " nie istnieje w niezbednik/index.json");
  if (set.level != null && LEVELS.indexOf(set.level) === -1) err(rel + ": nieznany poziom " + set.level);
  if (!nonEmpty(set.title)) err(rel + ": brak title");
  if (!Array.isArray(set.items) || !set.items.length) { err(rel + ": brak items"); return; }
  set.items.forEach(function (it) { checkItem(Object.assign({ topic: set.topic, level: set.level }, it), f, set); });
});

// ---------- Mapa temat → zestawy ----------
const map = readJson("dane/cwiczenia-tematy.json");
if (map) {
  Object.keys(map.topics || {}).forEach(function (t) {
    if (!topics.has(t)) err("dane/cwiczenia-tematy.json: nieznany temat " + t);
    (map.topics[t] || []).forEach(function (s) {
      if (!setIds.has(s)) err("dane/cwiczenia-tematy.json: brak pliku cwiczenia/tematy/" + s + ".json");
      else (setsByTopic[t] = setsByTopic[t] || []).push(s);
    });
  });
  setIds.forEach(function (s) {
    const inMap = Object.keys(map.topics || {}).some(function (t) { return map.topics[t].indexOf(s) !== -1; });
    if (!inMap) warnings.push("zestaw " + s + " nie jest wpisany w dane/cwiczenia-tematy.json (nie pojawi się w aplikacji)");
  });
}

// ---------- Laboratorium czasów ----------
const lab = readJson("dane/lab-czasow.json");
const tenses = new Set();
if (lab) {
  const GROUPS = ["present", "past", "future"];
  const ASPECTS = ["simple", "continuous", "perfect", "perfect-continuous", "form"];
  const ELEMENTS = { "point": ["at"], "range": ["from", "to"], "open-left": ["to"], "open-right": ["from"], "repeat": ["from", "to"], "result": ["at"], "marker": ["at", "label"] };
  (lab.tenses || []).forEach(function (t) {
    const at = "lab " + (t.id || "?");
    if (!nonEmpty(t.id)) err("lab: czas bez id");
    else if (tenses.has(t.id)) err(at + ": zdublowane id");
    tenses.add(t.id);
    ["name", "namePl", "summary"].forEach(function (k) { if (!nonEmpty(t[k])) err(at + ": brak " + k); });
    if (GROUPS.indexOf(t.group) === -1) err(at + ": group musi być present|past|future");
    if (ASPECTS.indexOf(t.aspect) === -1) err(at + ": nieznany aspect " + t.aspect);
    if (LEVELS.indexOf(t.level) === -1) err(at + ": nieznany poziom " + t.level);
    const f = t.formation || {};
    ["affirmative", "negative", "question"].forEach(function (k) { if (!nonEmpty(f[k])) err(at + ": formation." + k); });
    if (!Array.isArray(t.uses) || !t.uses.length) err(at + ": brak uses");
    else t.uses.forEach(function (u, i) { if (!nonEmpty(u.label) || !nonEmpty(u.en) || !nonEmpty(u.pl)) err(at + ": uses[" + i + "] wymaga label, en i pl"); });
    if (!Array.isArray(t.scenes) || !t.scenes.length) err(at + ": brak scenes");
    (t.scenes || []).forEach(function (sc) {
      const sat = at + " scena " + (sc.id || "?");
      if (!nonEmpty(sc.id) || !nonEmpty(sc.label) || !nonEmpty(sc.description)) err(sat + ": scena wymaga id, label i description");
      (sc.elements || []).forEach(function (e) {
        const need = ELEMENTS[e.kind];
        if (!need) { err(sat + ": nieznany element " + e.kind); return; }
        need.forEach(function (k) { if (e[k] == null) err(sat + ": " + e.kind + " wymaga pola " + k); });
        ["at", "from", "to"].forEach(function (k) { if (k in e && !(typeof e[k] === "number" && e[k] >= -1 && e[k] <= 1)) err(sat + ": " + k + " poza [-1, 1]"); });
        if ("from" in e && "to" in e && e.from > e.to) err(sat + ": from > to");
      });
    });
    (t.niezbednikIds || []).forEach(function (n) { if (!topics.has(n)) err(at + ": nieznany niezbednikId " + n); });
  });
  (lab.tenses || []).forEach(function (t) {
    (t.contrasts || []).forEach(function (c) {
      if (!tenses.has(c.with)) err("lab " + t.id + ": kontrast z nieznanym czasem " + c.with);
      if (!nonEmpty(c.rule)) err("lab " + t.id + ": kontrast bez rule");
    });
  });
}

// ---------- Drzewo „Dobierz czas” ----------
const tree = readJson("dane/lab-wybor-czasu.json");
if (tree) {
  const N = tree.nodes || {};
  if (!N[tree.start]) err("drzewo: brak węzła start " + tree.start);
  else {
    const reach = new Set();
    const stack = [tree.start];
    while (stack.length) {
      const n = stack.pop();
      if (reach.has(n)) continue;
      reach.add(n);
      if (!nonEmpty(N[n].question)) err("drzewo " + n + ": brak question");
      (N[n].options || []).forEach(function (o) {
        if (!nonEmpty(o.label)) err("drzewo " + n + ": opcja bez label");
        if (o.next) { if (!N[o.next]) err("drzewo " + n + ": next → brak węzła " + o.next); else stack.push(o.next); }
        else if (Array.isArray(o.result) && o.result.length) o.result.forEach(function (r) { if (tenses.size && !tenses.has(r)) err("drzewo " + n + ": nieznany czas " + r); });
        else err("drzewo " + n + ": opcja „" + o.label + "” bez next i result");
      });
      if (!(N[n].options || []).length) err("drzewo " + n + ": węzeł bez opcji");
    }
    Object.keys(N).forEach(function (n) { if (!reach.has(n)) err("drzewo: martwy węzeł " + n); });
    // Cykle (DFS ze ścieżką)
    (function dfs(n, onPath) {
      if (onPath.has(n)) { err("drzewo: cykl przez " + n); return; }
      onPath.add(n);
      (N[n].options || []).forEach(function (o) { if (o.next && N[o.next]) dfs(o.next, onPath); });
      onPath.delete(n);
    })(tree.start, new Set());
  }
}

// ---------- Zestawy mieszane ----------
const mixes = readJson("dane/mixes.json");
if (mixes) {
  const seen = new Set();
  (mixes.mixes || []).forEach(function (m) {
    const at = "mixes " + (m.id || "?");
    if (!/^[a-z0-9][a-z0-9-]*$/.test(m.id || "")) err(at + ": id tylko małe litery, cyfry i myślniki");
    if (seen.has(m.id)) err(at + ": zdublowane id");
    seen.add(m.id);
    if (!nonEmpty(m.title)) err(at + ": brak title");
    if (!Array.isArray(m.topics) || !m.topics.length) err(at + ": brak topics");
    (m.topics || []).forEach(function (t) {
      if (!topics.has(t)) err(at + ": nieznany temat " + t);
      else if (!setsByTopic[t]) warnings.push(at + ": temat " + t + " nie ma jeszcze zestawów");
    });
    (m.types || []).forEach(function (t) { if (TYPES.indexOf(t) === -1) err(at + ": nieznany typ " + t); });
    if (m.count != null && !(Number.isInteger(m.count) && m.count > 0)) err(at + ": count musi być liczbą dodatnią");
  });
}

// ---------- Egzaminy (spec 05) ----------
let examCount = 0;
const reg = readJson("dane/egzaminy-manifest.json");
if (reg) {
  const seenIds = new Set(), seenCodes = new Set();
  (reg.exams || []).forEach(function (ex) {
    const at = "egzaminy " + (ex.id || "?");
    examCount++;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(ex.id || "")) err(at + ": id tylko małe litery, cyfry i myślniki");
    if (seenIds.has(ex.id)) err(at + ": zdublowane id"); seenIds.add(ex.id);
    if (!nonEmpty(ex.code) || ex.code.length > 3) err(at + ": code — krótki kod (do 3 znaków)");
    if (seenCodes.has(ex.code)) err(at + ": zdublowany kod " + ex.code); seenCodes.add(ex.code);
    if (!nonEmpty(ex.label)) err(at + ": brak label");
    if (ex.route !== "/" + ex.id) err(at + ": route musi być „/" + ex.id + "”");
    if (["active", "soon"].indexOf(ex.status) === -1) err(at + ": status musi być active albo soon");
    if (ex.status === "soon" && !nonEmpty(ex.soonDescription)) err(at + ": egzamin „soon” wymaga soonDescription");
    ["accent", "accent2"].forEach(function (k) { if (ex[k] != null && !/^#[0-9a-fA-F]{6}$/.test(ex[k])) err(at + ": " + k + " musi być kolorem #rrggbb"); });
    if (ex.suggestedDate != null && !/^\d{4}-\d{2}-\d{2}$/.test(ex.suggestedDate)) err(at + ": suggestedDate w formacie RRRR-MM-DD");
    if (ex.status !== "active") return;
    const dir = "niezbednik/" + ex.id;
    const man = readJson(dir + "/manifest.json");
    if (!man) { err(at + ": brak " + dir + "/manifest.json"); return; }
    if (man.id !== ex.id) err(at + ": manifest.id (" + man.id + ") ≠ id w rejestrze");
    const examSets = new Set();
    const pageIds = new Set();
    const pageTexts = [];
    (man.sections || []).forEach(function (sec) {
      (sec.pages || []).forEach(function (pg) {
        pageIds.add(pg.id);
        const file = path.join(ROOT, dir, pg.file);
        if (!fs.existsSync(file)) { err(at + ": brak strony " + pg.file); return; }
        const md = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
        if (!/^\uFEFF?---\n/.test(md)) err(at + ": " + pg.file + " bez frontmatter");
        const fm = /^---\n[\s\S]*?^id:\s*(.+)$/m.exec(md);
        if (fm && fm[1].trim() !== pg.id) err(at + ": " + pg.file + " ma id „" + fm[1].trim() + "”, a manifest „" + pg.id + "”");
        pageTexts.push({ file: pg.file, md: md });
      });
      (sec.exerciseGroups || []).forEach(function (g) {
        (g.sets || []).forEach(function (meta) {
          examSets.add(meta.id);
          if (ex.existing) return; // C1: stary format zestawów, własny generator
          const set = readJson(dir + "/" + meta.file);
          if (!set) { err(at + ": brak zestawu " + meta.file); return; }
          if (set.id !== meta.id) err(at + ": " + meta.file + " ma id „" + set.id + "”, a manifest „" + meta.id + "”");
          if (isC1Format(set.type)) { checkC1Set(set, at + " " + meta.file, meta); return; }
          if (!Array.isArray(set.items) || !set.items.length) { err(at + ": " + meta.file + " bez zadań (ani formatu C1)"); return; }
          set.items.forEach(function (it) { checkItem(Object.assign({ topic: set.topic, level: set.level }, it), meta.file, set); });
        });
      });
      (Array.isArray(sec.trainers) ? sec.trainers : sec.trainer ? [sec.trainer] : []).forEach(function (tr) {
        if (ex.existing) return;
        const T = readJson(dir + "/" + tr.file);
        if (!T) { err(at + ": brak trenera " + tr.file); return; }
        if (tr.type === "speaking") {
          ["part1", "part2", "part3", "part4"].forEach(function (k) { if (!T[k]) err(at + " trener Speaking: brak " + k); });
          return;
        }
        if (!Array.isArray(T.wordRange) || T.wordRange.length !== 2) err(at + ": trener bez wordRange");
        (T.tasks || []).forEach(function (t) {
          const wat = at + " trener " + (t.id || "?");
          if (!nonEmpty(t.prompt) || !nonEmpty(t.title)) err(wat + ": brak title / prompt");
          // Podpunkty opcjonalne (matura rozszerzona ma elementy w poleceniu); jeśli są, to 3–5
          if (t.bullets != null && (!Array.isArray(t.bullets) || t.bullets.length < 3 || t.bullets.length > 5)) err(wat + ": potrzebne 3–5 podpunktów (bullets)");
          if (t.choiceGroup != null && !(T.choiceGroups && Object.prototype.hasOwnProperty.call(T.choiceGroups, t.choiceGroup))) err(wat + ": choiceGroup „" + t.choiceGroup + "” nie ma w choiceGroups");
          if (nonEmpty(t.model) && Array.isArray(T.wordRange)) {
            const n = countE8(t.model, t.opening);
            if (n < T.wordRange[0] || n > T.wordRange[1]) err(wat + ": wzorzec ma " + n + " wyrazów (limit " + T.wordRange.join("–") + ")");
          }
        });
        // Grupa wyboru to dokładnie dwa zadania do wyboru
        Object.keys(T.choiceGroups || {}).forEach(function (g) {
          const n = (T.tasks || []).filter(function (t) { return t.choiceGroup === g; }).length;
          if (n !== 2) err(at + " trener: grupa wyboru " + g + " ma " + n + " zadań (potrzebne 2)");
        });
      });
    });
    // Linki [[id]] w stronach: strona tego modułu, temat niezbędnika albo zestaw egzaminu
    pageTexts.forEach(function (pt) {
      (pt.md.match(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g) || []).forEach(function (m) {
        const id = /\[\[([^\]|]+)/.exec(m)[1].trim();
        if (!pageIds.has(id) && !topics.has(id) && !examSets.has(id)) err(at + ": " + pt.file + " — martwy link [[" + id + "]]");
      });
    });
    if (!ex.existing) {
      const links = readJson(dir + "/powiazania.json");
      (links && links.links || []).forEach(function (l) {
        if (!topics.has(l.itemId)) err(at + " powiązania: nieznany temat " + l.itemId);
        (l.exercises || []).forEach(function (s) { if (!examSets.has(s)) err(at + " powiązania " + l.itemId + ": nieznany zestaw " + s); });
      });
    }
  });
}
// Certyfikat C1: powiązania wskazują istniejące tematy
const c1links = readJson("niezbednik/certyfikat-c1/powiazania.json");
(c1links && c1links.links || []).forEach(function (l) { if (!topics.has(l.itemId)) err("C1 powiązania: nieznany temat " + l.itemId); });

/** Zestaw w formacie C1 (komponent js/c1-exercises.js). */
function checkC1Set(d, at, meta) {
  if (!nonEmpty(d.title)) err(at + ": brak title");
  if (d.type === "transformation") { checkTransformation(d, at, meta); return; }
  if (!nonEmpty(d.text) || !Array.isArray(d.gaps) || !d.gaps.length) { err(at + ": brak text albo gaps"); return; }
  const ns = d.gaps.map(function (g) { return g.n; });
  const inText = (d.text.match(/\{\{(\d+)\}\}/g) || []).map(function (m) { return Number(m.slice(2, -2)); });
  if (ns.slice().sort(function (a, b) { return a - b; }).join(",") !== inText.slice().sort(function (a, b) { return a - b; }).join(",")) err(at + ": luki {{n}} w tekście ≠ gaps");
  if (new Set(ns).size !== ns.length) err(at + ": powtórzone numery luk");
  if (d.maxScore !== d.gaps.length) err(at + ": maxScore (" + d.maxScore + ") ≠ liczba luk (" + d.gaps.length + ")");
  if (meta && meta.maxScore != null && meta.maxScore !== d.maxScore) err(at + ": maxScore w manifeście (" + meta.maxScore + ") ≠ w zestawie (" + d.maxScore + ")");
  d.gaps.forEach(function (g) {
    const gat = at + " luka " + g.n;
    if (!nonEmpty(g.explanation)) err(gat + ": brak explanation");
    if (d.type === "multiple-choice-cloze") {
      if (!g.options || !Object.prototype.hasOwnProperty.call(g.options, g.answer)) err(gat + ": answer spoza options");
    } else {
      if (!Array.isArray(g.accept) || !g.accept.length) err(gat + ": brak accept");
      if (d.type === "word-formation" && (!nonEmpty(g.stem) || (g.accept || []).some(function (a) { return String(a).toUpperCase() === g.stem.toUpperCase(); }))) err(gat + ": brak stem albo stem = odpowiedź");
    }
  });
}
/** Part 4: maxScore = 2 × zadania, słowo kluczowe we wzorze, wzór w limicie słów (wordLimit, domyślnie 3–6 jak C1). */
function checkTransformation(d, at, meta) {
  const lim = Array.isArray(d.wordLimit) ? d.wordLimit : [3, 6];
  if (d.wordLimit != null && !(Array.isArray(d.wordLimit) && d.wordLimit.length === 2 && d.wordLimit[0] >= 1 && d.wordLimit[0] <= d.wordLimit[1])) err(at + ": wordLimit musi być [min, max]");
  if (!Array.isArray(d.items) || !d.items.length) { err(at + ": brak items"); return; }
  if (d.maxScore !== 2 * d.items.length) err(at + ": maxScore (" + d.maxScore + ") ≠ 2 × liczba zadań (" + d.items.length + ")");
  if (meta && meta.maxScore != null && meta.maxScore !== d.maxScore) err(at + ": maxScore w manifeście (" + meta.maxScore + ") ≠ w zestawie (" + d.maxScore + ")");
  d.items.forEach(function (it) {
    const iat = at + " #" + it.n;
    if (!nonEmpty(it.first) || !nonEmpty(it.keyword) || !nonEmpty(it.model) || !nonEmpty(it.explanation)) err(iat + ": brak first / keyword / model / explanation");
    if (!Array.isArray(it.parts) || it.parts.length < 1 || it.parts.length > 2 || !it.parts.every(function (p) { return Array.isArray(p) && p.length && p.every(nonEmpty); })) err(iat + ": parts — jedna albo dwie części z wariantami");
    const words = transformationTokens(it.model || "");
    if (words.length < lim[0] || words.length > lim[1]) err(iat + ": wzór ma " + words.length + " słów (limit " + lim[0] + "–" + lim[1] + ", skróty liczą się jako dwa)");
    if (nonEmpty(it.keyword) && String(it.model || "").toUpperCase().split(/\s+/).indexOf(it.keyword.toUpperCase()) === -1) err(iat + ": wzór nie zawiera słowa kluczowego " + it.keyword);
  });
}
/** Słowa jak w js/c1-exercises.js: skróty (doesn't, I'm) liczą się jako dwa. */
function transformationTokens(text) {
  const out = [];
  String(text).toUpperCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{N}'\s]/gu, "").split(/\s+/).filter(Boolean).forEach(function (w) {
    const m = /^(.+?)(N'T|'S|'RE|'VE|'D|'LL|'M)$/.exec(w);
    if (m) out.push(m[1], m[2]); else out.push(w);
  });
  return out;
}
function isC1Format(type) {
  return ["multiple-choice-cloze", "word-formation", "open-cloze", "transformation"].indexOf(type) !== -1;
}

/** Liczenie wyrazów wg reguł egzaminu ósmoklasisty (jak js/exam-logic.js). */
function countE8(text, opening) {
  let t = String(text || "").trim();
  const open = String(opening || "").trim();
  if (open && t.slice(0, open.length).toLowerCase() === open.toLowerCase()) t = t.slice(open.length);
  return t.split(/\s+/).filter(function (w) { return w && /[\p{L}\p{N}]/u.test(w) && w.replace(/[^\p{L}\p{N}]/gu, "") !== "XYZ"; }).length;
}

console.log("Walidacja ćwiczeń: zestawy " + setIds.size + ", zadania " + itemCount + ", czasy " + tenses.size +
  ", węzły drzewa " + (tree ? Object.keys(tree.nodes || {}).length : 0) + ", mixy " + (mixes ? (mixes.mixes || []).length : 0) + ", egzaminy " + examCount);
warnings.forEach(function (w) { console.warn("UWAGA: " + w); });
if (errors.length) {
  console.error("BŁĘDY (" + errors.length + "):");
  errors.forEach(function (e) { console.error("  - " + e); });
  process.exit(1);
}
console.log("OK");
