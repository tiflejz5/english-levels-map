/*
 * waliduj-zwroty.js — sprawdza bank zwrotów do pisania dane/pisanie/zwroty.json
 * (paczka v6, spec 17, sekcje 2 i 4; te same reguły co część „zwroty” w docs/rozbudowa-v6/scripts/validate_v6.py).
 *
 *   - co najmniej 14 grup, w każdej 8–14 zwrotów, razem 140–180,
 *   - id grup i zwrotów unikalne; `genres` grupy ⊂ email, letter, blog, forum, essay, article, review, report, proposal, story,
 *   - zwrot: `en` i `pl`, `level` ∈ B1, B2, C1, `register` ∈ formal, neutral, informal; własne `genres` ⊂ genres grupy,
 *   - brak duplikatów `en` w całym banku (po normalizacji, bez „…”),
 *   - ostrzega, gdy w grupie wszystkie zwroty mają jeden poziom albo B2 i C1 nie mają `example`.
 *
 * Użycie (z folderu projektu):
 *   node tools/waliduj-zwroty.js            # kod wyjścia 1 przy błędach
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "dane", "pisanie", "zwroty.json");
const GENRES = ["email", "letter", "blog", "forum", "essay", "article", "review", "report", "proposal", "story"];
const REGISTERS = ["formal", "neutral", "informal"];
const LEVELS = ["B1", "B2", "C1"];
const REQUIRE_FULL = false; // true: 14 grup, 8–14 zwrotów w grupie, 140–180 razem (włączane po dodaniu treści)

const errors = [];
const warnings = [];

function normalize(s) {
  return String(s).trim().replace(/\s+/g, " ").replace(/’/g, "'").replace(/[.,!?;]+$/, "").toLowerCase();
}

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
const groups = data.groups || [];
if (REQUIRE_FULL && groups.length < 14) errors.push("dane/pisanie/zwroty.json: " + groups.length + " grup, wymagane min. 14");

const gids = {}, ids = {}, ens = {};
let total = 0;
groups.forEach(function (g) {
  const ph = g.phrases || [];
  total += ph.length;
  if (!g.id || gids[g.id]) errors.push("grupa „" + g.id + "”: brak lub powtórzone id grupy");
  gids[g.id] = true;
  if (!g.label) errors.push("grupa „" + g.id + "”: brak label");
  if (REQUIRE_FULL && (ph.length < 8 || ph.length > 14)) errors.push("grupa „" + g.id + "”: " + ph.length + " zwrotów (8–14)");
  if (!g.genres || !g.genres.length || g.genres.some(function (x) { return GENRES.indexOf(x) === -1; })) errors.push("grupa „" + g.id + "”: genres spoza " + GENRES.join(", "));
  const levels = {};
  ph.forEach(function (x) {
    const q = "zwrot „" + x.id + "”";
    if (!x.id || ids[x.id]) errors.push(q + ": powtórzone lub brakujące id");
    ids[x.id] = true;
    if (!new RegExp("^" + g.id + "-\\d{2}$").test(String(x.id))) errors.push(q + ": id musi mieć postać " + g.id + "-NN");
    if (LEVELS.indexOf(x.level) === -1) errors.push(q + ": level B1/B2/C1");
    levels[x.level] = true;
    if (REGISTERS.indexOf(x.register) === -1) errors.push(q + ": register spoza " + REGISTERS.join(", "));
    if (x.genres && x.genres.some(function (y) { return (g.genres || []).indexOf(y) === -1; })) errors.push(q + ": genres zwrotu muszą być podzbiorem genres grupy");
    if (!x.en || !x.pl) errors.push(q + ": wymagane en i pl");
    const key = normalize(String(x.en || "").replace(/…/g, ""));
    if (ens[key]) errors.push(q + ": zwrot powtarza " + ens[key]);
    ens[key] = x.id;
    if ((x.example && String(x.example).length > 200) || (x.note && String(x.note).length > 200)) errors.push(q + ": example i note maks. 200 znaków");
  });
  if (ph.length > 1 && Object.keys(levels).length < 2) warnings.push("grupa „" + g.id + "”: wszystkie zwroty mają jeden poziom");
});
if (REQUIRE_FULL && (total < 140 || total > 180)) errors.push("dane/pisanie/zwroty.json: " + total + " zwrotów razem (140–180)");

warnings.forEach(function (w) { console.log("Ostrzeżenie: " + w); });
if (errors.length) {
  console.error(errors.join("\n"));
  console.error("\nZwroty: " + errors.length + " błędów.");
  process.exit(1);
}
console.log("Bank zwrotów: " + groups.length + " grup, " + total + " zwrotów, OK" + (warnings.length ? " (ostrzeżenia: " + warnings.length + ")" : ""));
