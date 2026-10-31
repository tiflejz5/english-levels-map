/*
 * rozklad-regula.js — reguła rozkładu poprawnych liter w zestawach „wybierz A, B, C lub D”
 * (gaps[].options = { A, B, C, D }, gaps[].answer = litera): żadna litera nie jest poprawna w więcej niż 50% luk
 * zestawu i żadna nie jest poprawna więcej niż 2 razy z rzędu. Zestawy z jedną–dwiema lukami są pomijane
 * (reguła nie ma wtedy sensu).
 *
 * Użycie: require("./rozklad-regula").check(zestaw) → opis błędu albo null;
 *         checkAll() → lista błędów dla wszystkich niezbednik/<egzamin>/cwiczenia/*.json.
 * Wywołują ją tools/waliduj-c1-uoe.js (npm run validate) i tools/zbuduj-egzaminy.js (npm run build): błąd przerywa.
 * Naprawa: node tools/rozklad-odpowiedzi.js.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "niezbednik");
const MAX_SHARE = 0.5;
const MAX_RUN = 2;

function isLettered(set) {
  return !!set && Array.isArray(set.gaps) && set.gaps.length > 0 && set.gaps.every(function (g) {
    return g && g.options && typeof g.options === "object" && !Array.isArray(g.options) && typeof g.answer === "string";
  });
}

/** Opis naruszenia reguły albo null. */
function check(set) {
  if (!isLettered(set) || set.gaps.length < 3) return null;
  const seq = set.gaps.map(function (g) { return g.answer; });
  const counts = {};
  seq.forEach(function (l) { counts[l] = (counts[l] || 0) + 1; });
  const dist = Object.keys(counts).sort().map(function (l) { return l + counts[l]; }).join(" ") + " [" + seq.join("") + "]";
  const worst = Object.keys(counts).reduce(function (a, l) { return counts[l] > counts[a] ? l : a; }, Object.keys(counts)[0]);
  if (counts[worst] / seq.length > MAX_SHARE) return "litera " + worst + " poprawna w " + counts[worst] + " z " + seq.length + " luk (max 50%): " + dist;
  let run = 1;
  for (let i = 1; i < seq.length; i++) {
    run = seq[i] === seq[i - 1] ? run + 1 : 1;
    if (run > MAX_RUN) return "litera " + seq[i] + " poprawna więcej niż " + MAX_RUN + " razy z rzędu (luki " + (i - MAX_RUN + 1) + "–" + (i + 1) + "): " + dist;
  }
  return null;
}

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (name) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.json$/.test(name) && path.basename(path.dirname(p)) === "cwiczenia") out.push(p);
  });
  return out;
}

/** Błędy wszystkich zestawów z literowymi opcjami w folderach cwiczenia egzaminów (niezbednik). → [{ file, id, error }] */
function checkAll() {
  const errors = [];
  walk(ROOT, []).sort().forEach(function (file) {
    let json;
    try { json = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, "")); } catch (e) { return; }
    (function find(x) {
      if (Array.isArray(x)) { x.forEach(find); return; }
      if (!x || typeof x !== "object") return;
      if (isLettered(x)) {
        const e = check(x);
        if (e) errors.push({ file: path.relative(ROOT, file).replace(/\\/g, "/"), id: x.id || path.basename(file), error: e });
      } else Object.keys(x).forEach(function (k) { find(x[k]); });
    })(json);
  });
  return errors;
}

module.exports = { check: check, checkAll: checkAll, isLettered: isLettered };
