/*
 * waliduj-wzorce.js — sprawdza komentarze do wzorcowych wypracowań (paczka v6, spec 17, sekcje 1 i 4;
 * te same reguły co część „wzorce” w docs/rozbudowa-v6/scripts/validate_v6.py).
 *
 * Dla każdego zadania z polem `model` w niezbednik/<egzamin>/trening/pisanie.json:
 *   - jest `modelNotes` z 3–5 zdaniami `summary` i listą `annotations`,
 *   - liczba komentarzy mieści się w zakresie egzaminu (E8 i MP 6–9, MR i B2 8–12, C1 10–14),
 *   - `anchor`: dokładny fragment modelu, 3–15 słów, występujący w nim dokładnie raz; kotwice się nie nakładają,
 *   - `type` ∈ punkty, lacznik, rejestr, struktura, zakres, uwaga; w tekście są wszystkie sześć typów,
 *   - `criterion` ∈ id kryteriów z `rubric` (C1 bez rubric: content, communicative, organisation, language),
 *   - `note` do 220 znaków; `element` (opcjonalny) to liczba całkowita ≥ 1.
 * C1: wzorce mają 220–260 słów, a w pliku jest co najmniej 5 wzorców. Ostrzega, gdy w tekście nie ma
 * komentarza „uwaga” z konkretną uwagą (krótszą niż 25 znaków).
 *
 * Użycie (z folderu projektu):
 *   node tools/waliduj-wzorce.js            # kod wyjścia 1 przy błędach
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "niezbednik");
const TYPES = ["punkty", "lacznik", "rejestr", "struktura", "zakres", "uwaga"];
const RANGE = { "egzamin-osmoklasisty": [6, 9], "matura-podstawowa": [6, 9], "matura-rozszerzona": [8, 12], "certyfikat-b2": [8, 12], "certyfikat-c1": [10, 14] };
const CAMBRIDGE = ["content", "communicative", "organisation", "language"];
const REQUIRE_ALL = false; // true: każde zadanie z modelem musi mieć modelNotes (włączane po dodaniu wszystkich)

const errors = [];
const warnings = [];

function words(s) { return (String(s).match(/[\p{L}\p{N}'’-]+/gu) || []).length; }
function count(hay, needle) { let n = 0, i = hay.indexOf(needle); while (i !== -1) { n++; i = hay.indexOf(needle, i + 1); } return n; }

function checkNotes(notes, model, rubric, where, exam) {
  const anns = notes.annotations || [];
  const summary = notes.summary || [];
  if (summary.length < 3 || summary.length > 5) errors.push(where + ": summary musi mieć 3–5 zdań (ma " + summary.length + ")");
  summary.forEach(function (s) { if (!String(s).trim()) errors.push(where + ": pusty wiersz summary"); });
  const r = RANGE[exam];
  if (anns.length < r[0] || anns.length > r[1]) errors.push(where + ": " + anns.length + " komentarzy, wymagane " + r[0] + "–" + r[1]);
  const spans = [];
  anns.forEach(function (a) {
    const anc = String(a.anchor || "");
    const q = where + " [" + anc.slice(0, 30) + "…]";
    const n = anc ? count(model, anc) : 0;
    if (n !== 1) errors.push(q + ": kotwica występuje w tekście " + n + " razy (wymagane 1)");
    else { const s = model.indexOf(anc); spans.push([s, s + anc.length]); }
    const w = words(anc);
    if (w < 3 || w > 15) errors.push(q + ": kotwica ma " + w + " słów (3–15)");
    if (TYPES.indexOf(a.type) === -1) errors.push(q + ": type spoza " + TYPES.join(", "));
    if (rubric.indexOf(a.criterion) === -1) errors.push(q + ": criterion „" + a.criterion + "” spoza kryteriów " + rubric.join(", "));
    if (!a.note || a.note.length > 220) errors.push(q + ": note wymagane, maks. 220 znaków (ma " + String(a.note || "").length + ")");
    if (a.element !== undefined && !(Number.isInteger(a.element) && a.element >= 1)) errors.push(q + ": element musi być liczbą całkowitą ≥ 1");
  });
  spans.sort(function (x, y) { return x[0] - y[0]; });
  for (let i = 1; i < spans.length; i++) if (spans[i][0] < spans[i - 1][1]) errors.push(where + ": kotwice nakładają się");
  const missing = TYPES.filter(function (t) { return !anns.some(function (a) { return a.type === t; }); });
  if (missing.length) errors.push(where + ": brak komentarzy typu " + missing.join(", "));
  anns.filter(function (a) { return a.type === "uwaga" && String(a.note || "").length < 25; }).forEach(function () { warnings.push(where + ": komentarz „uwaga” jest zbyt ogólny (< 25 znaków)"); });
}

let withModel = 0;
Object.keys(RANGE).forEach(function (exam) {
  const file = path.join(ROOT, exam, "trening", "pisanie.json");
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const rubric = (data.rubric || []).map(function (r) { return r.id; });
  const ids = rubric.length ? rubric : (exam === "certyfikat-c1" ? CAMBRIDGE : []);
  let models = 0;
  (data.tasks || []).forEach(function (t) {
    if (!t.model) return;
    models++;
    const where = "niezbednik/" + exam + "/trening/pisanie.json [" + t.id + "]";
    if (exam === "certyfikat-c1") {
      const n = String(t.model).trim().split(/\s+/).length;
      if (n < 220 || n > 260) errors.push(where + ": wzorzec C1 ma " + n + " słów (220–260)");
    }
    if (!t.modelNotes) { (REQUIRE_ALL ? errors : warnings).push(where + ": zadanie ma model, ale nie ma modelNotes"); return; }
    withModel++;
    checkNotes(t.modelNotes, String(t.model), ids, where, exam);
  });
  if (exam === "certyfikat-c1" && REQUIRE_ALL && models < 5) errors.push("niezbednik/certyfikat-c1/trening/pisanie.json: C1 ma " + models + " wzorców, wymagane min. 5");
});

warnings.forEach(function (w) { console.log("Ostrzeżenie: " + w); });
if (errors.length) {
  console.error(errors.join("\n"));
  console.error("\nWzorce: " + errors.length + " błędów.");
  process.exit(1);
}
console.log("Wzorce z komentarzami: " + withModel + " tekstów, OK" + (warnings.length ? " (ostrzeżenia: " + warnings.length + ")" : ""));
