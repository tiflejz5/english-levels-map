/*
 * testy.js — testy jednostkowe czystej logiki nauki (js/learning.js):
 * harmonogram powtórek, seria nauki i algorytm testu poziomu,
 * oraz silnika zadań (js/exercise-logic.js) na zestawach z cwiczenia/tematy/
 * i dziennika podejść / statystyk / automatycznych powtórek (js/learning-stats.js).
 * Bez zależności: wbudowane moduły Node (assert).
 *
 * Użycie (z folderu projektu):
 *   node tools/testy.js
 */
"use strict";

const assert = require("assert");
const path = require("path");

global.window = global;
require(path.join(__dirname, "..", "js", "learning.js"));
require(path.join(__dirname, "..", "js", "exercise-logic.js"));
require(path.join(__dirname, "..", "js", "learning-stats.js"));
require(path.join(__dirname, "..", "js", "search-logic.js"));
require(path.join(__dirname, "..", "js", "exam-logic.js"));
require(path.join(__dirname, "..", "js", "fiszki-logic.js"));
require(path.join(__dirname, "..", "js", "fiszki-harmonogram.js"));
const L = global.ELM.learn;
const X = global.ELM.exLogic;

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log("  ok  " + name); } catch (e) { failures.push(name); console.log("  BŁĄD " + name + "\n       " + e.message); }
}

// Podmiana „dziś” (jedna funkcja today())
function withToday(day, fn) {
  const original = L.today;
  L.today = function () { return day; };
  try { fn(); } finally { L.today = original; }
}

console.log("Daty");
test("today() zwraca lokalny dzień RRRR-MM-DD", function () {
  assert.match(L.today(), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(L.isDay(L.today()));
});
test("today() da się podmienić", function () {
  withToday("2030-01-02", function () { assert.strictEqual(L.today(), "2030-01-02"); });
});
test("addDays przez koniec miesiąca, roku i dzień przestępny", function () {
  assert.strictEqual(L.addDays("2026-01-31", 1), "2026-02-01");
  assert.strictEqual(L.addDays("2026-12-31", 1), "2027-01-01");
  assert.strictEqual(L.addDays("2028-02-28", 1), "2028-02-29");
  assert.strictEqual(L.addDays("2026-03-01", -1), "2026-02-28");
});
test("addDays przez zmianę czasu (koniec marca i października)", function () {
  assert.strictEqual(L.addDays("2026-03-28", 1), "2026-03-29");
  assert.strictEqual(L.addDays("2026-03-29", 1), "2026-03-30");
  assert.strictEqual(L.addDays("2026-10-24", 1), "2026-10-25");
  assert.strictEqual(L.addDays("2026-10-25", 1), "2026-10-26");
  assert.strictEqual(L.diffDays("2026-10-24", "2026-10-26"), 2);
});
test("isDay odrzuca złe daty", function () {
  ["2026-02-30", "2026-13-01", "jutro", "", null, "2026-1-1"].forEach(function (d) { assert.strictEqual(L.isDay(d), false, String(d)); });
});

console.log("Harmonogram powtórek");
test("REVIEW_STEPS = [1, 3, 7]", function () {
  assert.deepStrictEqual(L.REVIEW_STEPS, [1, 3, 7]);
});
test("nowy wpis: pierwsza powtórka jutro", function () {
  assert.deepStrictEqual(L.newReview("2026-10-19"), { stage: 0, due: "2026-10-20", mastered: false });
});
test("nie jest do powtórki w dniu dodania, jest następnego dnia", function () {
  const r = L.newReview("2026-10-19");
  assert.strictEqual(L.isDue(r, "2026-10-19"), false);
  assert.strictEqual(L.isDue(r, "2026-10-20"), true);
});
test("zaległa powtórka = do zrobienia dziś (bez kary)", function () {
  const r = L.newReview("2026-10-01");
  assert.strictEqual(L.isDue(r, "2026-10-19"), true);
  // „Wiedziałem” po zaległości: następny etap liczony od dziś, nie od terminu
  assert.deepStrictEqual(L.reviewKnown(r, "2026-10-19"), { stage: 1, due: "2026-10-22", mastered: false });
});
test("pełna ścieżka 1 → 3 → 7 → opanowany", function () {
  let r = L.newReview("2026-10-19");                 // due 20
  r = L.reviewKnown(r, "2026-10-20");                // +3 → 23
  assert.deepStrictEqual(r, { stage: 1, due: "2026-10-23", mastered: false });
  r = L.reviewKnown(r, "2026-10-23");                // +7 → 30
  assert.deepStrictEqual(r, { stage: 2, due: "2026-10-30", mastered: false });
  r = L.reviewKnown(r, "2026-10-30");                // po ostatnim etapie
  assert.strictEqual(r.mastered, true);
  assert.strictEqual(L.isDue(r, "2027-01-01"), false);
});
test("„Znowu błąd” cofa do etapu 1 (jutro)", function () {
  const r = { stage: 2, due: "2026-10-30", mastered: false };
  assert.deepStrictEqual(L.reviewAgain(r, "2026-10-30"), { stage: 0, due: "2026-10-31", mastered: false });
});
test("zmiana tablicy kroków zmienia harmonogram", function () {
  const saved = L.REVIEW_STEPS.slice();
  L.REVIEW_STEPS.splice(0, L.REVIEW_STEPS.length, 2, 5);
  try {
    let r = L.newReview("2026-10-19");
    assert.strictEqual(r.due, "2026-10-21");
    r = L.reviewKnown(r, "2026-10-21");
    assert.strictEqual(r.due, "2026-10-26");
    assert.strictEqual(L.reviewKnown(r, "2026-10-26").mastered, true);
  } finally {
    L.REVIEW_STEPS.splice(0, L.REVIEW_STEPS.length, ...saved);
  }
});

console.log("Seria nauki");
test("brak aktywności → 0 / 0", function () {
  assert.deepStrictEqual(L.streak([], "2026-10-19"), { current: 0, longest: 0, activeToday: false });
});
test("aktywność dziś → seria 1", function () {
  assert.deepStrictEqual(L.streak(["2026-10-19"], "2026-10-19"), { current: 1, longest: 1, activeToday: true });
});
test("wczoraj była aktywność, dziś jeszcze nie → seria nadal żyje", function () {
  const s = L.streak(["2026-10-16", "2026-10-17", "2026-10-18"], "2026-10-19");
  assert.strictEqual(s.current, 3);
  assert.strictEqual(s.activeToday, false);
});
test("przerwa dłuższa niż dzień → seria 0, najdłuższa zostaje", function () {
  const s = L.streak(["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-17"], "2026-10-19");
  assert.strictEqual(s.current, 0);
  assert.strictEqual(s.longest, 3);
});
test("duplikaty, kolejność i błędne wpisy nie psują liczenia", function () {
  const s = L.streak(["2026-10-19", "zły", "2026-10-18", "2026-10-19", "2026-10-17", "2026-02-30"], "2026-10-19");
  assert.deepStrictEqual(s, { current: 3, longest: 3, activeToday: true });
});
test("seria przez koniec miesiąca", function () {
  const s = L.streak(["2026-09-29", "2026-09-30", "2026-10-01"], "2026-10-01");
  assert.strictEqual(s.current, 3);
});
test("dni z przyszłości są pomijane", function () {
  assert.strictEqual(L.streak(["2026-10-25"], "2026-10-19").longest, 0);
});
test("ostatnie 7 dni: od najstarszego do dziś", function () {
  const w = L.lastDays(["2026-10-13", "2026-10-19", "2026-10-01"], "2026-10-19", 7);
  assert.strictEqual(w.length, 7);
  assert.deepStrictEqual(w[0], { day: "2026-10-13", active: true });
  assert.deepStrictEqual(w[6], { day: "2026-10-19", active: true });
  assert.strictEqual(w.filter(function (d) { return d.active; }).length, 2);
});

console.log("Test poziomu");
function bank(perLevel) {
  const out = [];
  L.LEVELS.forEach(function (lvl) {
    for (let i = 0; i < perLevel; i++) out.push({ id: lvl + "-" + i, level: lvl });
  });
  return out;
}
test("start A2, dobrze → wyżej, źle → niżej, granice A1/C2", function () {
  assert.strictEqual(L.LEVELS[L.nextLevelIndex(L.LEVELS.indexOf("A2"), true)], "B1");
  assert.strictEqual(L.LEVELS[L.nextLevelIndex(L.LEVELS.indexOf("A2"), false)], "A1");
  assert.strictEqual(L.nextLevelIndex(0, false), 0);
  assert.strictEqual(L.nextLevelIndex(5, true), 5);
  assert.strictEqual(L.START_LEVEL, "A2");
  assert.strictEqual(L.TEST_LENGTH, 12);
});
test("losowanie bez powtórzeń z puli poziomu", function () {
  const q = bank(3);
  const used = new Set();
  for (let i = 0; i < 3; i++) {
    const p = L.pickQuestion(q, 2, used, Math.random);
    assert.strictEqual(p.level, "B1");
    assert.ok(!used.has(p.id));
    used.add(p.id);
  }
});
test("wyczerpana pula → sąsiedni poziom (kierunek ruchu przy remisie)", function () {
  const q = bank(1);
  const used = new Set(["B1-0"]);
  assert.strictEqual(L.pickQuestion(q, 2, used, function () { return 0; }, true).level, "B2");
  assert.strictEqual(L.pickQuestion(q, 2, used, function () { return 0; }, false).level, "A2");
  used.add("B2-0"); used.add("A2-0");
  assert.ok(["A1", "C1"].indexOf(L.pickQuestion(q, 2, used, function () { return 0; }, true).level) !== -1);
});
test("brak pytań → null", function () {
  const q = bank(1);
  assert.strictEqual(L.pickQuestion(q, 0, new Set(q.map(function (x) { return x.id; }))), null);
});
test("wynik = średnia ostatnich 6 poziomów, zaokrąglona w dół", function () {
  // A2 B1 B2 C1 B2 B1 | B2 C1 B2 C1 C2 C1 → ostatnie 6: 3,4,3,4,5,4 = 23/6 = 3,83 → B2
  const asked = [1, 2, 3, 4, 3, 2, 3, 4, 3, 4, 5, 4];
  assert.strictEqual(L.LEVELS[L.resultLevelIndex(asked)], "B2");
  assert.strictEqual(L.resultLevelIndex([0, 0, 0, 0, 0, 1]), 0);
  assert.strictEqual(L.resultLevelIndex([5, 5, 5, 5, 5, 5]), 5);
  assert.strictEqual(L.resultLevelIndex([1, 2]), 1); // mniej niż 6 pytań: średnia z tych, które są
});
function simulate(answerCorrect, perLevel) {
    const q = bank(perLevel);
    const used = new Set();
    let idx = L.LEVELS.indexOf(L.START_LEVEL);
    const asked = [];
    let prevCorrect = null;
    for (let i = 0; i < L.TEST_LENGTH; i++) {
      const p = L.pickQuestion(q, idx, used, Math.random, !!prevCorrect);
      used.add(p.id);
      // Jak w js/level-test.js: liczy się poziom docelowy (idx), nie poziom
      // wylosowanego pytania (inny tylko, gdy pula poziomu jest pusta)
      asked.push(idx);
      prevCorrect = answerCorrect;
      idx = L.nextLevelIndex(idx, answerCorrect);
    }
    return L.LEVELS[L.resultLevelIndex(asked)];
}
test("symulacja (duża pula): same dobre odpowiedzi → C2, same błędne → A1", function () {
  assert.strictEqual(simulate(true, 12), "C2");
  assert.strictEqual(simulate(false, 12), "A1");
});
test("symulacja (mała pula, 2 pytania na poziom): wynik nie „odpływa”", function () {
  // 12 pytań w puli = dokładnie tyle, ile trwa test. Gdy pula poziomu się
  // wyczerpie, pytania pochodzą z sąsiednich poziomów, ale poziom docelowy
  // (i wynik) zostaje — test zawsze dochodzi do końca.
  for (let i = 0; i < 50; i++) {
    assert.strictEqual(simulate(true, 2), "C2");
    assert.strictEqual(simulate(false, 2), "A1");
  }
});

console.log("\nSilnik zadań");
const fs = require("fs");
const SETS_DIR = path.join(__dirname, "..", "cwiczenia", "tematy");
const exBank = fs.readdirSync(SETS_DIR).filter(function (f) { return /\.json$/.test(f); })
  .map(function (f) { return JSON.parse(fs.readFileSync(path.join(SETS_DIR, f), "utf8")); });
const allItems = [].concat.apply([], exBank.map(function (s) { return s.items.map(function (it) { return Object.assign({ topic: s.topic }, it); }); }));
function seeded(seed) { let x = seed; return function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

test("normalize: spacje, apostrofy, interpunkcja końcowa, wielkość liter; skróty bez rozwijania", function () {
  assert.strictEqual(X.normalize("  I  Didn’t   go. "), "i didn't go");
  assert.strictEqual(X.normalize("Really?!"), "really");
  assert.notStrictEqual(X.normalize("I'm"), X.normalize("I am"));
});
test("prepareChoice: poprawna odpowiedź i notatki idą za opcją po tasowaniu", function () {
  const item = allItems.find(function (it) { return it.type === "multiple-choice" && it.optionNotes; });
  for (let s = 1; s < 30; s++) {
    const p = X.prepareChoice(item, seeded(s));
    assert.strictEqual(p.options[p.correct].original, item.correct);
    assert.strictEqual(p.options[p.correct].note, null);
    p.options.forEach(function (o) { assert.strictEqual(o.text, item.options[o.original]); });
  }
  const fixed = X.prepareChoice(Object.assign({}, item, { fixedOrder: true }), seeded(3));
  assert.deepStrictEqual(fixed.options.map(function (o) { return o.original; }), item.options.map(function (_, i) { return i; }));
});
test("reorderTokens: nigdy od razu w poprawnej kolejności, ten sam zestaw wyrazów", function () {
  allItems.filter(function (it) { return it.type === "reorder"; }).forEach(function (it) {
    for (let s = 1; s < 40; s++) {
      const t = X.reorderTokens(it, seeded(s)).map(function (x) { return x.text; });
      assert.ok(!X.evaluate(it, { words: t }).correct, it.id + " podany w poprawnej kolejności");
      assert.deepStrictEqual(t.slice().sort(), X.answerTokens(it.answers[0]).concat(it.extraTokens || []).sort());
    }
  });
});
test("evaluate: wzorcowa odpowiedź każdego zadania z cwiczenia/tematy jest poprawna", function () {
  assert.ok(allItems.length >= 60);
  allItems.forEach(function (it) {
    let ans;
    if (it.type === "multiple-choice") ans = { chosen: it.correct };
    else if (it.type === "reorder") ans = { words: X.answerTokens(it.answers[0]) };
    else if (it.type === "find-error") ans = it.noError ? { noError: true } : { range: it.errorRange.slice(), fix: it.fixes[0] };
    else ans = { text: it.accepted[0] };
    assert.ok(X.evaluate(it, ans).correct, it.id);
  });
});
test("evaluate: find-error rozróżnia zły fragment i złą poprawkę", function () {
  const it = { type: "find-error", tokens: ["I", "buyed", "a", "bike."], errorRange: [1, 1], fixes: ["bought"] };
  assert.strictEqual(X.evaluate(it, { range: [2, 2], fix: "bought" }).rangeOk, false);
  const r = X.evaluate(it, { range: [1, 1], fix: "buy" });
  assert.ok(r.rangeOk && !r.fixOk && !r.correct);
  assert.ok(!X.evaluate(it, { noError: true }).correct);
  assert.ok(X.evaluate({ type: "find-error", tokens: ["Ok."], noError: true }, { noError: true }).correct);
});
test("evaluate: short-answer — wielkość liter bez znaczenia, literówka = 0 pkt z uwagą", function () {
  const it = { type: "short-answer", prompt: "My mum ___ in a hospital.", accepted: ["works"] };
  assert.ok(X.evaluate(it, { text: " Works " }).correct);
  const one = X.evaluate(it, { text: "work" });
  assert.ok(!one.correct && one.spelling);
  assert.ok(!X.evaluate(it, { text: "worked" }).spelling); // 2 zmiany — bez uwagi
});
test("reorder: wskazanie pierwszej różnicy", function () {
  const it = { type: "reorder", answers: ["I didn't go to school yesterday."] };
  assert.strictEqual(X.firstDifference(it, ["i", "didn't", "to", "go", "school", "yesterday"]), 2);
});
/** Odpowiedź do zadania starego typu: poprawna albo błędna (do testu regresji punktów). */
function oldTypeAnswer(it, ok) {
  if (it.type === "multiple-choice") return { chosen: ok ? it.correct : (it.correct + 1) % it.options.length };
  if (it.type === "reorder") return { words: ok ? X.answerTokens(it.answers[0]) : X.answerTokens(it.answers[0]).reverse() };
  if (it.type === "find-error") return ok ? (it.noError ? { noError: true } : { range: it.errorRange.slice(), fix: it.fixes[0] }) : (it.noError ? { range: [0, 0], fix: "x" } : { noError: true });
  return { text: ok ? it.accepted[0] : "zzz" };
}
test("punkty: wynik każdego zestawu ze starych typów taki sam jak liczba poprawnych zadań", function () {
  const OLD = ["multiple-choice", "reorder", "find-error", "short-answer"];
  // Zestawy tematów i zestawy egzaminów z rejestru (niezbednik/<egzamin>/cwiczenia/*.json w formacie silnika)
  const NZ = path.join(__dirname, "..", "niezbednik");
  const examSets = [];
  fs.readdirSync(NZ).forEach(function (d) {
    const dir = path.join(NZ, d, "cwiczenia");
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f); }).forEach(function (f) {
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8").replace(/^﻿/, ""));
      if (Array.isArray(s.items) && s.items.length && s.items[0].type) examSets.push(s);
    });
  });
  const sets = exBank.concat(examSets).filter(function (s) { return s.items.every(function (it) { return OLD.indexOf(it.type) !== -1; }); });
  assert.ok(sets.length >= 25, "za mało zestawów: " + sets.length);
  sets.forEach(function (s) {
    for (let seed = 1; seed <= 12; seed++) {
      const rng = seeded(seed);
      const results = s.items.map(function (it) {
        const ok = seed === 1 ? true : seed === 2 ? false : rng() < 0.5;
        return { item: it, res: X.evaluate(it, oldTypeAnswer(it, ok)) };
      });
      // Dotychczasowy wynik: liczba poprawnych zadań / liczba zadań
      const before = { score: results.filter(function (r) { return r.res.correct; }).length, total: s.items.length };
      assert.deepStrictEqual(X.sessionScore(results), before, s.id + " (seed " + seed + ")");
      results.forEach(function (r) {
        assert.strictEqual(X.maxPoints(r.item), 1);
        assert.strictEqual(r.res.max, 1);
        assert.strictEqual(r.res.points, r.res.correct ? 1 : 0, r.item.id);
      });
    }
  });
});
test("punkty: sessionScore sumuje punkty i maksima, pomija zadania z max = 0", function () {
  const r = X.sessionScore([
    { item: { type: "short-answer" }, res: { correct: true, points: 1, max: 1 } },
    { item: { type: "x" }, res: { correct: false, points: 1, max: 2 } },
    { item: { type: "x" }, res: { correct: false, points: 0, max: 0, skipped: true } },
    { item: { type: "multiple-choice" }, res: null }
  ]);
  assert.deepStrictEqual(r, { score: 2, total: 4 });
});
// Ocena Part 4 sprzed wydzielenia do exercise-logic.js (kopia z js/c1-exercises.js) — wzorzec dla testu zgodności
const OLD_PART4 = (function () {
  function norm(text) { return String(text || "").toUpperCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{N}'\s]/gu, "").replace(/\s+/g, " ").trim(); }
  const CONTRACTION = /^(.+?)(N'T|'S|'RE|'VE|'D|'LL|'M)$/;
  function tokens(text) { const out = []; norm(text).split(" ").filter(Boolean).forEach(function (w) { const m = CONTRACTION.exec(w); if (m) out.push(m[1], m[2]); else out.push(w); }); return out; }
  function findSeq(hay, needle, from) { const hits = []; if (!needle.length) return hits; for (let i = from || 0; i + needle.length <= hay.length; i++) { let ok = true; for (let j = 0; j < needle.length; j++) { if (hay[i + j] !== needle[j]) { ok = false; break; } } if (ok) hits.push(i); } return hits; }
  function plural(n, one, few, many) { if (n === 1) return one; const d = n % 10, t = n % 100; return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many; }
  function itemMax(item) { return item.parts.length === 1 ? 2 : item.parts.length; }
  return function (item, answer, limit) {
    const lim = Array.isArray(limit) ? limit : [3, 6];
    const t = tokens(answer);
    const parts = item.parts.map(function () { return false; });
    if (!t.length) return { score: 0, parts: parts, msg: "Brak odpowiedzi." };
    if (t.length < lim[0] || t.length > lim[1]) return { score: 0, parts: parts, msg: "Wpisz " + lim[0] + "–" + lim[1] + " słów (masz " + t.length + " " + plural(t.length, "słowo", "słowa", "słów") + ", skróty liczą się jako dwa)." };
    if (!findSeq(t, tokens(item.keyword), 0).length) return { score: 0, parts: parts, msg: "Użyj słowa kluczowego bez zmian (" + item.keyword + ")." };
    let cursor = 0;
    item.parts.forEach(function (variants, k) {
      let bestEnd = -1;
      variants.forEach(function (variant) { const v = tokens(variant); const starts = findSeq(t, v, cursor); if (starts.length) { const end = starts[0] + v.length; if (bestEnd === -1 || end < bestEnd) bestEnd = end; } });
      if (bestEnd !== -1) { parts[k] = true; cursor = bestEnd; }
    });
    return { score: parts.filter(Boolean).length * (itemMax(item) / item.parts.length), parts: parts, msg: null };
  };
})();
test("transformacje: wspólna ocena = dotychczasowa ocena C1/B2 Part 4 na wszystkich prawdziwych zadaniach", function () {
  const NZ = path.join(__dirname, "..", "niezbednik");
  const sets = [];
  fs.readdirSync(NZ).forEach(function (d) {
    const dir = path.join(NZ, d, "cwiczenia");
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f); }).forEach(function (f) {
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8").replace(/^﻿/, ""));
      if (s.type === "transformation") sets.push(s);
    });
  });
  assert.ok(sets.length >= 10, "za mało zestawów Part 4: " + sets.length);
  let checked = 0;
  sets.forEach(function (s) {
    const lim = Array.isArray(s.wordLimit) ? s.wordLimit : undefined;
    s.items.forEach(function (it) {
      const first = it.parts.map(function (p) { return p[0]; }).join(" ");
      const answers = [
        it.model, it.model.toLowerCase(), first, "", "   ",
        it.model + " and so on now", it.model.split(" ").slice(0, 2).join(" "),
        it.model.split(" ").filter(function (w) { return w.toUpperCase() !== it.keyword.toUpperCase(); }).concat("xx").join(" "),
        it.model.replace(new RegExp("\\b" + it.keyword + "\\b", "i"), it.keyword + "S"),
        it.parts[0][0] + " xx yy", "xx " + it.parts[it.parts.length - 1][0], it.parts[it.parts.length - 1][0] + " " + it.parts[0][0],
        it.model.replace(/n't/i, " not").replace(/'s\b/i, " is"), it.model + ".", "„" + it.model + "”"
      ];
      it.parts.forEach(function (p) { p.forEach(function (v) { answers.push(v + " " + it.keyword); answers.push(it.keyword + " " + v); }); });
      answers.forEach(function (a) {
        assert.deepStrictEqual(X.scoreTransformationParts(it, a, lim), OLD_PART4(it, a, lim), s.id + " #" + it.n + ": „" + a + "”");
        checked++;
      });
      assert.strictEqual(X.scoreTransformationParts(it, it.model, lim).score, 2, s.id + " #" + it.n + " wzór < 2 pkt");
    });
  });
  assert.ok(checked > 500);
});
test("pickMix: równo po tematach, bez powtórek, limit, filtr typów, ≤ 2 tego samego typu pod rząd", function () {
  for (let s = 1; s < 30; s++) {
    const m = X.pickMix(allItems, { count: 15 }, seeded(s));
    assert.strictEqual(m.items.length, 15);
    assert.strictEqual(new Set(m.items.map(function (x) { return x.id; })).size, 15);
    const per = {};
    m.items.forEach(function (x) { per[x.topic] = (per[x.topic] || 0) + 1; });
    const counts = Object.keys(per).map(function (k) { return per[k]; });
    assert.ok(Math.max.apply(null, counts) - Math.min.apply(null, counts) <= 1, "nierówno: " + JSON.stringify(per));
    for (let i = 2; i < m.items.length; i++) {
      const same = m.items[i].type === m.items[i - 1].type && m.items[i].type === m.items[i - 2].type;
      if (same) assert.ok(m.items.slice(i + 1).every(function (x) { return x.type === m.items[i].type; }), "3 pod rząd");
    }
  }
  const fe = X.pickMix(allItems, { count: 50, types: ["find-error"] }, seeded(5));
  assert.ok(fe.items.every(function (x) { return x.type === "find-error"; }));
  assert.strictEqual(fe.items.length, fe.available);
});
test("pickMix: wyklucza zadania z ostatniej sesji, gdy starcza puli", function () {
  const first = X.pickMix(allItems, { count: 10 }, seeded(7));
  const ids = first.items.map(function (x) { return x.id; });
  const second = X.pickMix(allItems, { count: 10, exclude: ids }, seeded(8));
  assert.ok(second.items.every(function (x) { return ids.indexOf(x.id) === -1; }));
});

console.log("\nDziennik podejść i statystyki");
const T = global.ELM.stats;
function att(itemId, topic, type, level, correct, day) {
  return { t: day + "T10:00:00.000Z", day: day, itemId: itemId, setId: null, topic: topic, level: level, type: type, tags: [], correct: correct, mode: "learn", answer: "" };
}
function recWith(list) { const r = { items: [], aggregates: {} }; list.forEach(function (a) { T.pushAttempt(r, a); }); return r; }

test("bufor kołowy: limit, najstarsze do agregatów, statystyki bez strat", function () {
  const r = { items: [], aggregates: {} };
  for (let i = 0; i < 10; i++) T.pushAttempt(r, att("x-" + (i % 3), "t1", "reorder", "A1", i % 2 === 0, "2026-10-0" + (1 + (i % 9))), 6);
  assert.strictEqual(r.items.length, 6);
  const compacted = Object.keys(r.aggregates).reduce(function (s, k) { return s + r.aggregates[k].n; }, 0);
  assert.strictEqual(compacted, 4);
  const all = T.aggregate(r, "topic").t1;
  assert.deepStrictEqual(all, { n: 10, ok: 5 }); // podejścia + agregaty = wszystkie odpowiedzi
  assert.strictEqual(r.items[0].itemId, "x-" + (4 % 3)); // zostały najnowsze
  // Domyślny limit 3000
  const big = { items: [], aggregates: {} };
  for (let i = 0; i < 3005; i++) T.pushAttempt(big, att("y", "t", "reorder", "A1", true, "2026-10-01"));
  assert.strictEqual(big.items.length, T.MAX_ATTEMPTS);
  assert.strictEqual(big.aggregates.y.n, 5);
});

test("agregacja trafności wg tematu, typu i poziomu; mała próbka = brak oceny", function () {
  const r = recWith([
    att("a", "t1", "reorder", "A1", true, "2026-10-01"), att("b", "t1", "reorder", "A1", false, "2026-10-01"),
    att("c", "t1", "find-error", "A1", true, "2026-10-02"), att("d", "t1", "find-error", "A1", true, "2026-10-02"),
    att("e", "t1", "multiple-choice", "A1", true, "2026-10-03"),
    att("f", "t2", "multiple-choice", "B1", false, "2026-10-03"), att("g", "t2", "multiple-choice", "B1", false, "2026-10-03")
  ]);
  assert.deepStrictEqual(T.aggregate(r, "topic"), { t1: { n: 5, ok: 4 }, t2: { n: 2, ok: 0 } });
  assert.deepStrictEqual(T.aggregate(r, "type")["multiple-choice"], { n: 3, ok: 1 });
  assert.deepStrictEqual(T.aggregate(r, "level"), { A1: { n: 5, ok: 4 }, B1: { n: 2, ok: 0 } });
  assert.strictEqual(T.accuracy({ n: 4, ok: 4 }), null);
  assert.strictEqual(T.accuracy({ n: 5, ok: 4 }), 0.8);
  const ranked = T.ranked(r, "topic");
  assert.deepStrictEqual(ranked.map(function (x) { return x.key; }), ["t1"]); // t2 ma < 5 prób
});

test("tematy do treningu słabych punktów: ≥ 5 prób, < 70%, rosnąco, maks. 3", function () {
  const list = [];
  const make = function (topic, n, ok) { for (let i = 0; i < n; i++) list.push(att(topic + "-" + i, topic, "reorder", "A2", i < ok, "2026-10-05")); };
  make("dobry", 10, 9); make("slaby", 10, 3); make("sredni", 10, 6); make("mala-proba", 4, 0); make("najgorszy", 6, 1); make("graniczny", 10, 7);
  const weak = T.weakTopics(recWith(list));
  assert.deepStrictEqual(weak.map(function (x) { return x.key; }), ["najgorszy", "slaby", "sredni"]);
  assert.deepStrictEqual(T.weakTopics(recWith([att("a", "t", "reorder", "A1", true, "2026-10-01")])), []);
});

test("podsumowanie i trend tygodniowy (dziś wstrzyknięte)", function () {
  const r = recWith([
    att("a", "t", "reorder", "A1", true, "2026-10-20"), att("b", "t", "reorder", "A1", false, "2026-10-14"),
    att("c", "t", "reorder", "A1", true, "2026-09-25"), att("d", "t", "reorder", "A1", true, "2026-07-01")
  ]);
  const s = T.summary(r, "2026-10-20");
  assert.deepStrictEqual([s.n7, s.n30, s.n], [2, 3, 4]); // 14.10 mieści się w 7 dniach (14–20)
  const w = T.weekly(r, "2026-10-20", 12);
  assert.strictEqual(w.length, 12);
  assert.strictEqual(w[11].start, "2026-10-19"); // poniedziałek
  assert.strictEqual(w[11].n, 1);
  assert.strictEqual(w[10].n, 1);
  assert.strictEqual(w.reduce(function (x, y) { return x + y.n; }, 0), 3); // lipiec poza 12 tygodniami
  const g = T.activityGrid(["2026-10-19", "2026-10-21"], "2026-10-20", 12);
  assert.strictEqual(g.length, 12);
  assert.ok(g[11][0].active && g[11][0].day === "2026-10-19");
  assert.ok(g[11][2].future && g[11][2].active);
});

test("dedup dziennika: nowy wpis, aktywny bez duplikatu (cofnięcie do etapu 1), opanowany wraca, limit dzienny", function () {
  const today = "2026-10-20";
  assert.deepStrictEqual(T.planWrong(null, { today: today, autoToday: 0 }), { action: "create" });
  assert.deepStrictEqual(T.planWrong(null, { today: today, autoToday: 30 }), { action: "limit" });
  const stage0 = { review: { stage: 0, due: "2026-10-21", mastered: false } };
  assert.deepStrictEqual(T.planWrong(stage0, { today: today, autoToday: 99 }), { action: "update", review: stage0.review }); // istniejący: limit nie dotyczy
  const stage2 = { review: { stage: 2, due: "2026-10-27", mastered: false } };
  assert.deepStrictEqual(T.planWrong(stage2, { today: today, autoToday: 0 }), { action: "update", review: { stage: 0, due: "2026-10-21", mastered: false } });
  const mastered = { review: { stage: 2, due: "2026-10-01", mastered: true } };
  assert.deepStrictEqual(T.planWrong(mastered, { today: today, autoToday: 0 }), { action: "reopen", review: { stage: 0, due: "2026-10-21", mastered: false } });
});

test("poprawna odpowiedź zalicza powtórkę tylko, gdy przypada (dziś lub zaległa)", function () {
  const today = "2026-10-20";
  assert.strictEqual(T.planCorrect(null, today), null);
  assert.strictEqual(T.planCorrect({ review: { stage: 0, due: "2026-10-21", mastered: false } }, today), null); // jeszcze nie
  assert.strictEqual(T.planCorrect({ review: { stage: 2, due: "2026-10-10", mastered: true } }, today), null);  // opanowany
  assert.deepStrictEqual(T.planCorrect({ review: { stage: 0, due: "2026-10-20", mastered: false } }, today), { action: "review", review: { stage: 1, due: "2026-10-23", mastered: false } });
  assert.deepStrictEqual(T.planCorrect({ review: { stage: 2, due: "2026-10-15", mastered: false } }, today).review.mastered, true); // ostatni etap → opanowany
});

test("sugestia „Umiem”: dwa ostatnie ≥ 80%, nie gdy już Umiem, przerwa 14 dni po odmowie", function () {
  const o = { isUmiem: false, dismissedDay: null, today: "2026-10-20" };
  assert.strictEqual(T.suggestUmiem([0.9], o), false);
  assert.strictEqual(T.suggestUmiem([0.8, 0.9], o), true);
  assert.strictEqual(T.suggestUmiem([1, 0.7, 0.9], o), false);
  assert.strictEqual(T.suggestUmiem([0.5, 0.8, 1], o), true);
  assert.strictEqual(T.suggestUmiem([0.9, 0.9], Object.assign({}, o, { isUmiem: true })), false);
  assert.strictEqual(T.suggestUmiem([0.9, 0.9], Object.assign({}, o, { dismissedDay: "2026-10-10" })), false);
  assert.strictEqual(T.suggestUmiem([0.9, 0.9], Object.assign({}, o, { dismissedDay: "2026-10-06" })), true);
});

test("wagi: generator (trafność < 60% × 2, nowe × 1,5) i trening (bez poprawnej w 14 dniach × 2)", function () {
  const r = recWith([
    att("slabe", "t", "reorder", "A1", false, "2026-10-01"), att("slabe", "t", "reorder", "A1", false, "2026-10-02"), att("slabe", "t", "reorder", "A1", true, "2026-10-03"),
    att("dobre", "t", "reorder", "A1", true, "2026-10-19"),
    att("dawno", "t", "reorder", "A1", true, "2026-09-01")
  ]);
  const mw = T.mixWeight(r);
  assert.deepStrictEqual([mw({ id: "slabe" }), mw({ id: "dobre" }), mw({ id: "nowe" })], [2, 1, 1.5]);
  const ww = T.weakWeight(r, "2026-10-20");
  // „slabe” rozwiązane poprawnie 17 dni temu — poza oknem 14 dni, więc waga 2
  assert.deepStrictEqual([ww({ id: "dobre" }), ww({ id: "slabe" }), ww({ id: "dawno" }), ww({ id: "nowe" })], [1, 2, 2, 2]);
});

test("losowanie ważone: zadanie z wagą 2 częściej trafia do zestawu", function () {
  const pool = [];
  for (let i = 0; i < 20; i++) pool.push({ id: "z" + i, topic: "t", type: "reorder" });
  let heavy = 0, light = 0;
  for (let s = 1; s <= 400; s++) {
    const m = X.pickMix(pool, { count: 5, weight: function (it) { return it.id === "z0" ? 2 : 1; } }, seeded(s * 104729 + 7)); // duże ziarno: pierwsza liczba nie jest bliska 0
    if (m.items.some(function (x) { return x.id === "z0"; })) heavy++;
    if (m.items.some(function (x) { return x.id === "z1"; })) light++;
  }
  assert.ok(heavy > light * 1.4, "waga 2: " + heavy + ", waga 1: " + light);
});

console.log("\nWyszukiwarka");
const SR = global.ELM.searchLogic;
const recs = SR.prepare([
  { id: "1", group: "pages", title: "Present Perfect", headings: ["Pułapki Polaków", "Budowa"], summary: "Przeszłość związana z teraźniejszością.", text: "Have/has + trzecia forma. Byłem w Paryżu dwa razy." },
  { id: "2", group: "pages", title: "Present Simple", headings: [], summary: "Rutyna.", text: "Mieszkam we Wrocławiu." },
  { id: "3", group: "lab", title: "Past Simple", headings: [], summary: "Zakończone zdarzenia.", text: "Present Perfect kontra Past Simple." },
  { id: "4", group: "exercises", title: "Zaimki dzierżawcze – sprawdź się", headings: [], summary: "", text: "" }
]);

test("fold: polskie znaki, wielkość liter, ta sama długość", function () {
  assert.strictEqual(SR.fold("ZAŻÓŁĆ Gęślą"), "zazolc gesla");
  assert.strictEqual(SR.fold("Łódź").length, 4);
  assert.deepStrictEqual(SR.tokenize("Don’t stop, I'm here!"), ["don't", "stop", "i'm", "here"]);
});
test("search: prefiks, polskie znaki z i bez, wszystkie słowa muszą pasować, wagi pól", function () {
  const ids = function (q) { return [].concat.apply([], SR.search(recs, q).groups.map(function (g) { return g.results.map(function (r) { return r.record.id; }); })); };
  assert.deepStrictEqual(ids("pres").slice(0, 2).sort(), ["1", "2"]);
  assert.deepStrictEqual(ids("wroclawiu"), ["2"]);
  assert.deepStrictEqual(ids("Wrocławiu"), ["2"]);
  assert.deepStrictEqual(ids("dzierzawcze"), ["4"]);
  assert.deepStrictEqual(ids("present paryzu"), ["1"]); // oba wyrazy
  const pp = SR.search(recs, "present perfect").groups;
  assert.strictEqual(pp[0].results[0].record.id, "1"); // tytuł > treść (rekord 3)
  assert.deepStrictEqual(ids("zzzz"), []);
});
test("search: literówki tylko od 5 znaków, przestawienie liter = jedna literówka", function () {
  assert.ok(SR.search(recs, "presnet").total > 0);
  assert.strictEqual(SR.search(recs, "pest").total, 0); // krótkie: bez tolerancji
  assert.strictEqual(SR.distance("presnet", "present"), 1);
});
test("search: kotwica do nagłówka, grupy w zadanej kolejności, limit i „pokaż więcej”", function () {
  const r = SR.search(recs, "pulapki", { groups: ["lab", "pages"] });
  assert.strictEqual(r.groups[0].results[0].anchor, "Pułapki Polaków");
  const g = SR.search(recs, "present", { groups: ["lab", "pages"], limit: 1 });
  assert.deepStrictEqual(g.groups.map(function (x) { return x.group; }), ["lab", "pages"]);
  assert.strictEqual(g.groups[1].results.length, 1);
  assert.strictEqual(g.groups[1].total, 2);
  assert.strictEqual(SR.search(recs, "present", { limit: 1, expanded: { pages: true } }).groups.find(function (x) { return x.group === "pages"; }).results.length, 2);
});
test("snippet i highlight: części z flagą hit, bez HTML", function () {
  const s = SR.snippet("Mieszkam we Wrocławiu od lat <b>pięciu</b>.", "wroclaw");
  assert.ok(s.some(function (p) { return p.hit && p.text === "Wrocławiu"; }));
  assert.ok(s.map(function (p) { return p.text; }).join("").indexOf("<b>") !== -1); // tekst bez zmian, do textContent
  assert.deepStrictEqual(SR.highlight("Present Perfect", "perf").filter(function (p) { return p.hit; }).map(function (p) { return p.text; }), ["Perfect"]);
});

console.log("\nEgzaminy: strefy licznika (spec 06, 4.2)");
const EL = global.ELM.examLogic;
test("writingZone: matura podstawowa (<80, 80–99, 100–150, >150)", function () {
  const T = { wordRange: [100, 150], warnBelow: 80 };
  assert.deepStrictEqual([79, 80, 99, 100, 150, 151].map(function (n) { return EL.writingZone(n, T); }), ["low", "warn", "warn", "ok", "ok", "over"]);
});
test("writingZone: matura rozszerzona (<160, 160–199, 200–250, >250)", function () {
  const T = { wordRange: [200, 250], warnBelow: 160 };
  assert.deepStrictEqual([159, 160, 199, 200, 250, 251].map(function (n) { return EL.writingZone(n, T); }), ["low", "warn", "warn", "ok", "ok", "over"]);
});

console.log("\nFiszki: harmonogram (spec 10, sekcja 3; wektory dane/fiszki/scheduler-vectors.json)");
const FH = global.ELM.fiszkiHarmonogram;
const VEC = JSON.parse(require("fs").readFileSync(path.join(__dirname, "..", "dane", "fiszki", "scheduler-vectors.json"), "utf8"));
const CARD_FIELDS = ["state", "step", "ease", "interval", "pendingInterval", "lapses", "reps", "due"];
test("wektory: konfiguracja zgodna z domyślną", function () {
  Object.keys(VEC.config).forEach(function (k) { assert.deepStrictEqual(FH.DEFAULT_CONFIG[k], VEC.config[k], k); });
});
VEC.scenarios.forEach(function (sc) {
  test("schedule: scenariusz „" + sc.name + "” (" + sc.steps.length + " kroków)", function () {
    let card = FH.newCard();
    sc.steps.forEach(function (st, i) {
      const before = JSON.stringify(card);
      const next = FH.schedule(card, st.grade, st.now);
      assert.strictEqual(JSON.stringify(card), before, "krok " + (i + 1) + ": karta wejściowa zmieniona");
      CARD_FIELDS.forEach(function (f) { assert.strictEqual(next[f], st.card[f], "krok " + (i + 1) + " (" + st.grade + "): " + f); });
      card = next;
    });
  });
});
test("schedule: oceny liczbowe 1–4 = again/hard/good/easy, nieznana ocena → błąd", function () {
  const c = FH.newCard();
  ["again", "hard", "good", "easy"].forEach(function (g, i) { assert.deepStrictEqual(FH.schedule(c, i + 1, 1000), FH.schedule(c, g, 1000)); });
  assert.throws(function () { FH.schedule(c, "super", 1000); });
});
test("schedule: rozproszenie ±5% tylko dla interwałów ≥ 3 d, losowość z zewnątrz", function () {
  const rev = { state: "review", step: 0, ease: 2.5, interval: 40, pendingInterval: 0, lapses: 0, reps: 5, due: 0 };
  const base = FH.schedule(rev, "good", 0).interval; // 100
  assert.strictEqual(FH.schedule(rev, "good", 0, null, { fuzz: true, random: function () { return 1; } }).interval, base + 5);
  assert.strictEqual(FH.schedule(rev, "good", 0, null, { fuzz: true, random: function () { return 0; } }).interval, base - 5);
  const grad = FH.schedule(Object.assign(FH.newCard(), { state: "learning", step: 1 }), "good", 0, null, { fuzz: true, random: function () { return 1; } });
  assert.strictEqual(grad.interval, 1); // 1 d < 3 d — bez rozproszenia
});
test("preview i formatDelay: podgląd terminów czterech ocen", function () {
  const pv = FH.preview(FH.newCard(), 0);
  assert.deepStrictEqual(["again", "hard", "good", "easy"].map(function (g) { return FH.formatDelay(pv[g].delay); }), ["1 min", "1 min", "10 min", "4 d"]);
  assert.strictEqual(FH.formatDelay(3 * FH.DAY), "3 d");
  assert.strictEqual(FH.formatDelay(90 * FH.DAY), "3 mies.");
});

console.log("\nFiszki: ocena odpowiedzi, cloze, kolejka, TSV/CSV, stan (spec 10, sekcja 8)");
const FL = global.ELM.fiszkiLogic;
test("normalize: małe litery, spacje, apostrofy, interpunkcja na brzegach", function () {
  assert.strictEqual(FL.normalize("  Don’t   Give Up!  "), "don't give up");
  assert.strictEqual(FL.normalize("„Come up with”."), "come up with");
  assert.strictEqual(FL.normalize("well-known"), "well-known"); // myślnik w środku zostaje
});
test("checkAnswer: dokładnie / literówka (Levenshtein 1, ≥ 5 znaków) / błąd / puste", function () {
  assert.deepStrictEqual(FL.checkAnswer("Decision", ["decision"]).result, "exact");
  assert.strictEqual(FL.checkAnswer("decison", ["decision"]).result, "typo");
  assert.strictEqual(FL.checkAnswer("decison", ["decision"]).suggested, "hard");
  assert.strictEqual(FL.checkAnswer("decide", ["decision"]).suggested, "again");
  assert.strictEqual(FL.checkAnswer("bok", ["box"]).result, "wrong"); // krótkie: bez tolerancji
  assert.strictEqual(FL.checkAnswer("   ", ["box"]).result, "empty");
});
test("checkAnswer: alternatywy a|b, wielkość liter i apostrofy", function () {
  const alts = FL.parseCloze("I {{gave up|quit}} smoking.").answers;
  assert.strictEqual(FL.checkAnswer("QUIT", alts).result, "exact");
  assert.strictEqual(FL.checkAnswer("gave up", alts).expected, "gave up");
  assert.strictEqual(FL.checkAnswer("can't", ["can’t"]).result, "exact");
  assert.strictEqual(FL.levenshtein("kitten", "sitting"), 3);
});
test("parseCloze: jedna luka, alternatywy, błędne wejścia", function () {
  const c = FL.parseCloze("She {{came up with}} a plan.");
  assert.deepStrictEqual([c.ok, c.before, c.answers, c.after], [true, "She ", ["came up with"], " a plan."]);
  assert.strictEqual(FL.parseCloze("Bez luki").ok, false);
  assert.strictEqual(FL.parseCloze("{{a}} i {{b}}").ok, false);
  assert.strictEqual(FL.parseCloze("Pusta {{a|}} alternatywa").ok, false);
  assert.strictEqual(FL.parseCloze("Pusta {{ }} luka").ok, false);
  assert.strictEqual(FL.parseCloze("Zły {{nawias} tekst").ok, false);
  assert.strictEqual(FL.frontText({ type: "cloze", text: "We've {{run out of}} milk." }), "We've _____ milk.");
});
test("Anki: {{c1::…}} ↔ {{…}}", function () {
  assert.strictEqual(FL.fromAnki("I {{c1::gave up::przestać}} it."), "I {{gave up}} it.");
  assert.strictEqual(FL.toAnki("I {{gave up|quit}} it.", "przestać"), "I {{c1::gave up::przestać}} it.");
});
test("studyDay: granica dnia o 04:00 (czas lokalny)", function () {
  assert.strictEqual(FL.studyDay(new Date(2026, 10, 2, 3, 59).getTime()), "2026-11-01");
  assert.strictEqual(FL.studyDay(new Date(2026, 10, 2, 4, 0).getTime()), "2026-11-02");
  assert.strictEqual(FL.dayStart("2026-11-02"), new Date(2026, 10, 2, 4, 0).getTime());
  assert.strictEqual(FL.dayEnd(new Date(2026, 10, 2, 23, 0).getTime()), new Date(2026, 10, 3, 4, 0).getTime());
});
test("buildQueue: kolejność nauka → powtórki (najbardziej zaległe) → nowe, limity, zawieszone i odłożone", function () {
  const now = new Date(2026, 10, 2, 12, 0).getTime(), H = 3600000;
  const cards = [];
  for (let i = 1; i <= 15; i++) cards.push({ id: "t-" + String(i).padStart(3, "0"), deck: "t" });
  const st = {
    "t-001": { state: "review", due: now - 48 * H, interval: 3 }, "t-002": { state: "review", due: now - 2 * H, interval: 3 },
    "t-003": { state: "review", due: now + 10 * H, interval: 3 },            // jeszcze dziś (przed 04:00 jutro)
    "t-004": { state: "review", due: now + 30 * H, interval: 3 },            // jutro — pomijana
    "t-005": { state: "learning", due: now - 60000, step: 1 }, "t-006": { state: "relearning", due: now + 5 * 60000 },
    "t-007": { state: "review", due: now - H, suspended: true }, "t-008": { state: "review", due: now - H, buriedUntil: now + H }
  };
  const q = FL.buildQueue({ cards: cards, state: st, now: now, settings: { newPerDay: 3, reviewsPerDay: 100 } });
  assert.deepStrictEqual(q.learning, ["t-005", "t-006"]);
  assert.deepStrictEqual(q.review, ["t-001", "t-002", "t-003"]);
  assert.deepStrictEqual(q.fresh, ["t-009", "t-010", "t-011"]);
  const lim = FL.buildQueue({ cards: cards, state: st, now: now, settings: { newPerDay: 10, reviewsPerDay: 2 }, today: { new: 8, reviews: 1 } });
  assert.deepStrictEqual([lim.review, lim.fresh], [["t-001"], ["t-009", "t-010"]]);
  assert.strictEqual(FL.buildQueue({ cards: cards, state: st, now: now, settings: { newPerDay: 3 }, today: { new: 3 }, extraNew: 5 }).fresh.length, 5);
  const def = FL.buildQueue({ cards: cards, state: {}, now: now });
  assert.strictEqual(def.fresh.length, 10); // domyślnie 10 nowych
});
test("buildQueue: talia „losowo” tasuje nowe tylko w swojej talii", function () {
  const cards = ["a-001", "a-002", "a-003", "b-001", "b-002"].map(function (id) { return { id: id, deck: id.slice(0, 1) }; });
  const q = FL.buildQueue({ cards: cards, state: {}, now: 0, settings: { newPerDay: 10, randomDecks: ["a"] }, random: function () { return 0; } });
  assert.deepStrictEqual(q.fresh, ["a-002", "a-003", "a-001", "b-001", "b-002"]);
});
test("pickNext: nauka z terminem teraz → kolejka → nauka w ciągu 20 min", function () {
  const now = 1000000000;
  const st = { L1: { due: now + 5 * 60000 }, L2: { due: now - 1 } };
  assert.deepStrictEqual(FL.pickNext(["L1", "L2"], ["Q1"], st, now), { id: "L2", from: "learning" });
  assert.deepStrictEqual(FL.pickNext(["L1"], ["Q1"], st, now), { id: "Q1", from: "queue" });
  assert.deepStrictEqual(FL.pickNext(["L1"], [], st, now), { id: "L1", from: "ahead" });
  assert.strictEqual(FL.pickNext([], [], st, now), null);
});
test("deckStats: nowe / w nauce / opanowane (≥ 21 d) / zawieszone", function () {
  const s = FL.deckStats([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
    { b: { state: "learning", due: 0 }, c: { state: "review", interval: 30, due: 9e15 }, d: { state: "review", interval: 5, due: 0 }, e: { state: "review", suspended: true } }, 1);
  assert.deepStrictEqual([s.new, s.learning, s.mastered, s.review, s.suspended, s.due], [1, 1, 1, 1, 1, 2]);
});
test("parseDelimited: tab / średnik, cudzysłowy RFC 4180, nowe linie w polu, polskie znaki", function () {
  const p = FL.parseDelimited('typ;przód;tył\nbasic;"Mam ""20"" lat";"I am 20;\nyears"\nbasic;Żółć;bile\n');
  assert.strictEqual(p.separator, ";");
  assert.deepStrictEqual(p.rows[1].cells, ["basic", 'Mam "20" lat', "I am 20;\nyears"]);
  assert.deepStrictEqual(p.rows[2], { line: 4, cells: ["basic", "Żółć", "bile"] });
  assert.strictEqual(FL.parseDelimited("a\tb\n").separator, "\t");
});
test("importCards: kolumny spec, format Anki ({{c1::…}}), odrzucenia z powodem, limit", function () {
  const r = FL.importCards("typ\tprzód\ttył\tpodpowiedź\tprzykład\tnotatka\ttagi\n" +
    "cloze\tShe {{c1::came up with}} it.\t\twymyślić\t\t\tfrazowe c1\n" +
    "typed\tlodówka\tfridge|refrigerator\n" +
    "cloze\tBez luki\n" +
    "kosmos\ta\tb\n" +
    "basic\tZgadzam się.\tI agree.\n");
  assert.strictEqual(r.cards.length, 3);
  assert.deepStrictEqual(r.cards[0], { type: "cloze", tags: ["frazowe", "c1"], text: "She {{came up with}} it.", hint: "wymyślić" });
  assert.deepStrictEqual(r.cards[1].accepted, ["fridge", "refrigerator"]);
  assert.deepStrictEqual(r.rejected.map(function (x) { return x.line; }), [4, 5]);
  const anki = FL.importCards("I {{c1::gave up}} smoking.\tprzestać\tfrazowe\nZgadzam się.\tI agree.\t\n");
  assert.deepStrictEqual(anki.cards.map(function (c) { return c.type; }), ["cloze", "basic"]);
  assert.strictEqual(FL.importCards("basic\t" + "x".repeat(501) + "\ty\n").rejected[0].reason.indexOf("500") !== -1, true);
  assert.strictEqual(FL.importCards("basic\ta\tb\nbasic\tc\td\nbasic\te\tf\n", { limit: 2 }).cards.length, 2);
});
test("exportTsv: Anki (przód, tył, tagi), cloze jako {{c1::…}}, eksport → import", function () {
  const cards = [{ type: "cloze", text: "I {{gave up|quit}} it.", hint: "przestać", tags: ["a"] }, { type: "basic", front: "Mam 20 lat.", back: "I am 20.", note: "Nie: I have", tags: [] }];
  const tsv = FL.exportTsv(cards);
  assert.strictEqual(tsv.split("\n")[0], "I {{c1::gave up::przestać}} it.\t\ta");
  const back = FL.importCards(tsv);
  assert.deepStrictEqual([back.cards[0].type, back.cards[0].text, back.cards[1].front], ["cloze", "I {{gave up}} it.", "Mam 20 lat."]);
});
test("sanitizeState: uszkodzone dane, nieznana wersja, zbyt długie pola, przycinanie daily", function () {
  assert.throws(function () { FL.sanitizeState(null); });
  assert.throws(function () { FL.sanitizeState({ version: 2 }); });
  const daily = {};
  for (let i = 0; i < 410; i++) daily[new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10)] = { new: 1, reviews: 2, again: 0, minutes: 3 };
  const s = FL.sanitizeState({
    version: 1,
    cards: { "kolokacje-001": { state: "review", ease: 9, interval: 5, due: 5 }, "zly id!": { state: "review" }, "x-001": { state: "dziwny" } },
    userDecks: [{ id: "u-1", title: "Moje" }, { id: "zły", title: "x" }],
    userCards: [{ id: "u-c1", deck: "u-1", type: "basic", front: "a".repeat(800), back: "b" }, { id: "u-c2", deck: "u-1", type: "magia", front: "a", back: "b" }, { id: "u-c3", deck: "u-9", type: "basic", front: "a", back: "b" }],
    settings: { newPerDay: 5, enabledDecks: ["kolokacje", 7], typeAnswerFirst: "tak" },
    daily: daily
  });
  assert.deepStrictEqual(Object.keys(s.cards), ["kolokacje-001"]);
  assert.strictEqual(s.cards["kolokacje-001"].ease, 2.5);
  assert.deepStrictEqual(s.userDecks.map(function (d) { return d.id; }), ["u-1"]);
  assert.deepStrictEqual([s.userCards.length, s.userCards[0].front.length], [1, 500]);
  assert.deepStrictEqual([s.settings.newPerDay, s.settings.enabledDecks, s.settings.typeAnswerFirst], [5, ["kolokacje"], false]);
  assert.strictEqual(Object.keys(s.daily).length, 400);
  assert.strictEqual(Object.keys(s.daily)[0], "2025-01-11");
});

console.log("\nWynik: " + passed + " ok, " + failures.length + " błędów");
if (failures.length) process.exit(1);
