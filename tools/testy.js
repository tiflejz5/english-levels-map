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
require(path.join(__dirname, "..", "js", "final-logic.js"));
require(path.join(__dirname, "..", "js", "fiszki-logic.js"));
require(path.join(__dirname, "..", "js", "fiszki-harmonogram.js"));
require(path.join(__dirname, "..", "js", "szlak-logic.js"));
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
/** Pula ze skill: na poziom 5 grammar, 3 vocabulary, 2 reading (id: <poziom>-<skill>-<n>). */
function skillBank() {
  const out = [];
  L.LEVELS.forEach(function (lvl) {
    [["grammar", 5], ["vocabulary", 3], ["reading", 2]].forEach(function (s) {
      for (let i = 0; i < s[1]; i++) out.push({ id: lvl + "-" + s[0] + "-" + i, level: lvl, skill: s[0] });
    });
  });
  return out;
}
test("pickQuestion bez opts działa jak dotąd (te same wyniki dla tego samego losowania)", function () {
  const q = skillBank();
  for (let s = 1; s < 20; s++) {
    const a = L.pickQuestion(q, 2, new Set(), seeded(s), true);
    const b = L.pickQuestion(q, 2, new Set(), seeded(s), true, undefined);
    assert.strictEqual(a.id, b.id);
  }
});
test("pickQuestion: unika pytań z poprzedniego podejścia, gdy pula na to pozwala", function () {
  const q = skillBank();
  const b1 = q.filter(function (x) { return x.level === "B1"; }).map(function (x) { return x.id; });
  const avoid = b1.slice(0, 8);
  for (let s = 1; s < 50; s++) {
    const p = L.pickQuestion(q, 2, new Set(), seeded(s), false, { avoidIds: avoid });
    assert.ok(avoid.indexOf(p.id) === -1, p.id);
  }
  // wszystkie z poziomu były w poprzednim podejściu → bierze i tak z poziomu (nie ucieka na inny)
  const p = L.pickQuestion(q, 2, new Set(), seeded(3), false, { avoidIds: b1 });
  assert.strictEqual(p.level, "B1");
});
test("pickQuestion: równoważy umiejętności — najrzadsza w podejściu, remis losowo", function () {
  const q = skillBank();
  for (let s = 1; s < 50; s++) {
    assert.strictEqual(L.pickQuestion(q, 1, new Set(), seeded(s), false, { skillCounts: { grammar: 2, vocabulary: 1, reading: 0 } }).skill, "reading");
    assert.notStrictEqual(L.pickQuestion(q, 1, new Set(), seeded(s), false, { skillCounts: { grammar: 1, vocabulary: 1, reading: 1 } }).skill, undefined);
  }
  const seen = new Set();
  for (let s = 1; s < 60; s++) seen.add(L.pickQuestion(q, 1, new Set(), seeded(s * 104729), false, { skillCounts: { grammar: 1, vocabulary: 0, reading: 0 } }).skill);
  assert.deepStrictEqual(Array.from(seen).sort(), ["reading", "vocabulary"]);
  // umiejętności brak w puli poziomu (reading wyczerpany) → najrzadsza z dostępnych
  const used = new Set(["A2-reading-0", "A2-reading-1"]);
  assert.strictEqual(L.pickQuestion(q, 1, used, seeded(2), false, { skillCounts: { grammar: 3, vocabulary: 1, reading: 0 } }).skill, "vocabulary");
  // pytanie bez skill = grammar
  assert.strictEqual(L.pickQuestion([{ id: "x", level: "A1" }], 0, new Set(), seeded(1), false, { skillCounts: { grammar: 5 } }).id, "x");
});
test("symulacja 12 pytań z opts: każda umiejętność występuje, kolejne podejście ma inne pytania", function () {
  const q = skillBank();
  function run(avoid, seed) {
    const rnd = seeded(seed);
    const used = new Set(); const counts = {}; const ids = [];
    let idx = 1;
    for (let i = 0; i < L.TEST_LENGTH; i++) {
      const p = L.pickQuestion(q, idx, used, rnd, i % 2 === 0, { avoidIds: avoid, skillCounts: counts });
      used.add(p.id); ids.push(p.id); counts[L.skillOf(p)] = (counts[L.skillOf(p)] || 0) + 1;
      idx = L.nextLevelIndex(idx, i % 2 === 0);
    }
    return { ids: ids, counts: counts };
  }
  const first = run([], 11);
  assert.ok(first.counts.grammar >= 1 && first.counts.vocabulary >= 1 && first.counts.reading >= 1, JSON.stringify(first.counts));
  assert.ok(Math.max(first.counts.grammar, first.counts.vocabulary, first.counts.reading) - Math.min(first.counts.grammar, first.counts.vocabulary, first.counts.reading) <= 1);
  // Drugie podejście powtarza pytanie tylko wtedy, gdy na danym poziomie zabrakło nowych (10 pytań na poziom)
  const second = run(first.ids, 12);
  L.LEVELS.forEach(function (lvl) {
    const at = function (ids) { return ids.filter(function (id) { return id.indexOf(lvl + "-") === 0; }); };
    const fresh = 10 - at(first.ids).length;
    const repeated = at(second.ids).filter(function (id) { return first.ids.indexOf(id) !== -1; }).length;
    assert.strictEqual(repeated, Math.max(0, at(second.ids).length - fresh), lvl);
  });
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
    const r = X.evaluate(it, modelAnswerOf(it));
    assert.ok(r.correct && r.points === r.max && r.max === X.maxPoints(it), it.id);
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
// ---------- Nowe typy zadań (paczka v6, spec 12) ----------
const PILOT = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "rozbudowa-v6", "przyklady", "cwiczenia", "v6-pilot-nowe-typy.json"), "utf8")).items;
function pilot(id) { return PILOT.find(function (it) { return it.id === id; }); }
/** Wzorcowa odpowiedź zadania (każdy typ) w formacie evaluate. */
function modelAnswerOf(it) {
  if (it.type === "multiple-choice") return { chosen: it.correct };
  if (it.type === "reorder") return { words: X.answerTokens(it.answers[0]) };
  if (it.type === "find-error") return it.noError ? { noError: true } : { range: it.errorRange.slice(), fix: it.fixes[0] };
  if (it.type === "gap-fill") return { texts: it.gaps.map(function (g) { return g.accepted[0]; }) };
  if (it.type === "match") { const p = {}; it.pairs.forEach(function (x, i) { p[i] = x[1]; }); return { pairs: p }; }
  if (it.type === "transformation") return { text: it.answers[0] };
  if (it.type === "dictation") return { text: it.text };
  return { text: it.accepted[0] };
}

test("maxPoints: luki i pary po punkcie, transformacja z parts 2, pozostałe 1", function () {
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-01")), 2);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-03")), 4);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-05")), 1);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-06")), 2);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-07")), 1);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-09")), 1);
});
test("nowe typy: wzorcowa odpowiedź każdego zadania z pliku wzorów daje pełne punkty", function () {
  PILOT.forEach(function (it) {
    const r = X.evaluate(it, modelAnswerOf(it));
    assert.ok(r.correct && r.points === X.maxPoints(it) && r.max === X.maxPoints(it), it.id + " " + JSON.stringify(r));
  });
});
test("gap-fill: punkt za każdą lukę, literówka = 0 pkt z uwagą, wielkość liter bez znaczenia", function () {
  const it = pilot("v6-pilot-02");
  const half = X.evaluate(it, { texts: ["Was built", "has repaired"] });
  assert.deepStrictEqual([half.points, half.max, half.correct], [1, 2, false]);
  assert.deepStrictEqual(half.gaps.map(function (g) { return g.correct; }), [true, false]);
  const typo = X.evaluate(it, { texts: ["was bilt", ""] });
  assert.ok(typo.gaps[0].spelling && !typo.gaps[0].correct && typo.answered);
  assert.ok(!X.evaluate(it, { texts: ["", " "] }).answered);
});
test("match: punkt za każdą parę, extraRight nigdy nie jest poprawne", function () {
  const it = pilot("v6-pilot-03");
  const r = X.evaluate(it, { pairs: { 0: it.pairs[0][1], 1: it.pairs[2][1], 2: it.pairs[1][1], 3: it.extraRight[0] } });
  assert.deepStrictEqual([r.points, r.max, r.correct], [1, 4, false]);
  assert.deepStrictEqual(r.pairs, [true, false, false, false]);
  assert.ok(!X.evaluate(it, { pairs: {} }).answered);
});
test("prepareMatch: prawa kolumna zawsze przetasowana, z extraRight, bez zgubionych elementów", function () {
  PILOT.filter(function (it) { return it.type === "match"; }).forEach(function (it) {
    for (let s = 1; s < 60; s++) {
      const right = X.prepareMatch(it, seeded(s));
      assert.ok(!it.pairs.every(function (p, i) { return right[i].text === p[1]; }), it.id + " w poprawnej kolejności");
      assert.deepStrictEqual(right.map(function (r) { return r.text; }).sort(), it.pairs.map(function (p) { return p[1]; }).concat(it.extraRight || []).sort());
    }
  });
});
test("transformation: answers, skróty, limit słów, słowo kluczowe; z parts — częściowe punkty", function () {
  const it = pilot("v6-pilot-05");
  assert.ok(X.evaluate(it, { text: "that I saw Tom was" }).correct);
  assert.ok(X.evaluate(it, { text: "i SAW tom was" }).correct);
  const long = X.evaluate(it, { text: "I saw Tom for the first time was" });
  assert.ok(!long.correct && /2–5 słów \(masz 8 słów/.test(long.msg));
  const kw = X.evaluate(it, { text: "I seen Tom was" });
  assert.ok(!kw.correct && /słowa kluczowego bez zmian \(SAW\)/.test(kw.msg));
  assert.strictEqual(X.evaluate(it, { text: "I saw him was" }).points, 0);
  const p = pilot("v6-pilot-06");
  const one = X.evaluate(p, { text: "is said to being" });
  assert.deepStrictEqual([one.points, one.max, one.correct], [1, 2, false]);
  assert.deepStrictEqual(one.parts, [true, false]);
  assert.strictEqual(X.evaluate(p, { text: "is said to be" }).points, 2);
  // skrót = dwa słowa: „didn't” mieści się w limicie jak „did not”
  const c = { type: "transformation", keyword: "NOT", answers: ["did not go"], wordLimit: [2, 3] };
  assert.ok(X.evaluate({ type: "transformation", keyword: "DID", answers: ["did not go"], wordLimit: [2, 3] }, { text: "didn't go" }).correct);
  assert.ok(/masz 4 słowa/.test(X.evaluate(c, { text: "didn't not go" }).msg));
});
test("normalizeSentence: skróty rozwinięte po obu stronach, przecinki i apostrofy", function () {
  const N = X.normalizeSentence;
  assert.strictEqual(N("I don’t know, really."), "i do not know really");
  assert.strictEqual(N("We won't go"), "we will not go");
  assert.strictEqual(N("She can't swim"), "she cannot swim");
  assert.strictEqual(N("They're here and we've seen it"), "they are here and we have seen it");
  assert.strictEqual(N("I'll call, I'm sure"), "i will call i am sure");
  assert.strictEqual(N("It isn't, is it?"), "it is not is it");
  assert.strictEqual(N("Let's go!"), "let us go");
  assert.strictEqual(N("  Hello ,  world  "), "hello world");
  // 's i 'd niejednoznaczne — zostają, porównanie sprawdza oba rozwinięcia
  assert.strictEqual(N("He's gone"), "he's gone");
  assert.ok(X.sentenceVariants("He's gone").indexOf("he has gone") !== -1);
  assert.ok(X.sentenceVariants("I'd go").indexOf("i would go") !== -1 && X.sentenceVariants("I'd go").indexOf("i had go") !== -1);
});
test("translate: zgodność po normalizacji (skróty, przecinki), I'd = I would, dopełniacz 's zostaje", function () {
  const it = pilot("v6-pilot-07");
  assert.ok(X.evaluate(it, { text: "if I had more time I'd learn to play the guitar" }).correct);
  assert.ok(X.evaluate(it, { text: "If I had more time, I would learn to play the guitar!" }).correct);
  assert.ok(!X.evaluate(it, { text: "If I have more time, I will learn to play the guitar." }).correct);
  const pos = { type: "translate", accepted: ["This is John's car."] };
  assert.ok(X.evaluate(pos, { text: "this is johns car" }).correct === false);
  assert.ok(X.evaluate(pos, { text: "This is John’s car" }).correct);
  assert.ok(X.evaluate({ type: "translate", accepted: ["She has gone home."] }, { text: "She's gone home" }).correct);
  assert.ok(!X.evaluate({ type: "translate", accepted: ["She is at home."] }, { text: "" }).answered);
});
test("porównanie słowo po słowie: brak, zbędne, zamienione; najbliższy wariant; literówka", function () {
  const d = X.wordDiff(["have", "you", "ever", "been", "to", "london"], ["have", "you", "been", "in", "to", "london", "yet"]);
  assert.deepStrictEqual(d.ops.filter(function (o) { return o.op !== "same"; }), [
    { op: "missing", word: "ever" }, { op: "extra", got: "in" }, { op: "extra", got: "yet" }
  ]);
  const r = X.wordDiff(["i", "went", "home"], ["i", "go", "home"]);
  assert.deepStrictEqual(r.ops[1], { op: "replace", word: "went", got: "go" });
  const it = pilot("v6-pilot-08");
  const res = X.evaluate(it, { text: "Have you ever been in Londn?" });
  assert.ok(!res.correct && res.spelling && res.closest === 1, JSON.stringify(res));
  const miss = X.evaluate(it, { text: "Have you been to London?" });
  assert.ok(!miss.spelling && miss.closest === 0 && miss.diff.some(function (o) { return o.op === "missing" && o.word === "ever"; }));
});
test("dictation: tekst i warianty z accepted; pominięte (bez głosu) — 0 z 0, nie wlicza się", function () {
  const it = pilot("v6-pilot-10");
  assert.ok(X.evaluate(it, { text: "I have never eaten anything so spicy in my life" }).correct);
  assert.ok(X.evaluate(it, { text: "ive never eaten anything so spicy in my life" }).correct === false);
  const s = X.evaluate(it, { skipped: true });
  assert.deepStrictEqual([s.points, s.max, s.skipped, s.correct], [0, 0, true, false]);
  assert.deepStrictEqual(X.sessionScore([{ item: it, res: s }, { item: pilot("v6-pilot-03"), res: X.evaluate(pilot("v6-pilot-03"), modelAnswerOf(pilot("v6-pilot-03"))) }]), { score: 4, total: 4 });
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

console.log("\nTesty końcowe poziomów (paczka v6, spec 13 sekcja 2)");
const F = global.ELM.finalLogic;
/** Pula 30 zadań A1-podobna: czasy 4, gramatyka 14, funkcje 8, słownictwo 4 (po 2 tematy w kategorii, część zadań wielopunktowa). */
function finalPool() {
  const plan = [["czasy", 6], ["gramatyka", 14], ["funkcje", 8], ["slownictwo", 2]];
  const out = [];
  plan.forEach(function (p) {
    for (let i = 0; i < p[1]; i++) {
      const multi = i % 5 === 4;
      out.push(multi
        ? { id: p[0] + "-" + i, type: "gap-fill", topic: p[0] + "-t" + (i % 4), text: "{{1}} {{2}} {{3}}", gaps: [{ accepted: ["a"] }, { accepted: ["b"] }, { accepted: ["c"] }] }
        : { id: p[0] + "-" + i, type: i % 2 ? "short-answer" : "multiple-choice", topic: p[0] + "-t" + (i % 4), prompt: "x ___", accepted: ["a"], options: ["a", "b"], correct: 0 });
    }
  });
  return out;
}
const catOf = function (it) { return it.id.split("-")[0]; };
test("isPassed: próg w punktach (16/20 przy 80%), granice i puste", function () {
  assert.ok(F.isPassed(16, 20, 80) && !F.isPassed(15, 20, 80));
  assert.ok(F.isPassed(24, 29, 80) && !F.isPassed(23, 29, 80)); // z zadaniami wielopunktowymi total ≠ 20
  assert.ok(F.isPassed(20, 20, 100) && !F.isPassed(0, 0, 80));
});
test("allocate: proporcjonalnie, suma = draw, każda kategoria ≥ 1, nie więcej niż w puli", function () {
  const main = F.allocate({ a: 6, b: 14, c: 8, d: 2 }, 20); // kwoty: 4; 9,33; 5,33; 1,33
  assert.strictEqual(main.a + main.b + main.c + main.d, 20);
  assert.ok(main.a === 4 && main.c === 5 && main.b >= 9 && main.b <= 10 && main.d >= 1 && main.d <= 2);
  assert.deepStrictEqual(F.allocate({ a: 3, b: 3 }, 20), { a: 3, b: 3 }); // nie więcej niż w puli
  const a = F.allocate({ a: 1, b: 20, c: 9 }, 20);
  assert.strictEqual(a.a + a.b + a.c, 20);
  assert.ok(a.a === 1 && a.b <= 20 && a.c >= 1);
  const small = F.allocate({ a: 2, b: 2, c: 26 }, 20);
  assert.strictEqual(small.a + small.b + small.c, 20);
  assert.ok(small.a >= 1 && small.b >= 1 && small.a <= 2 && small.b <= 2);
});
test("drawItems: 20 z 30, bez duplikatów, każda kategoria reprezentowana proporcjonalnie (±1)", function () {
  const pool = finalPool();
  const counts = {};
  pool.forEach(function (it) { counts[catOf(it)] = (counts[catOf(it)] || 0) + 1; });
  for (let s = 1; s < 60; s++) {
    const d = F.drawItems(pool, 20, catOf, seeded(s));
    assert.strictEqual(d.length, 20);
    assert.strictEqual(new Set(d.map(function (x) { return x.id; })).size, 20);
    const got = {};
    d.forEach(function (it) { got[catOf(it)] = (got[catOf(it)] || 0) + 1; });
    Object.keys(counts).forEach(function (c) {
      assert.ok(got[c] >= 1, "brak kategorii " + c);
      assert.ok(Math.abs(got[c] - 20 * counts[c] / 30) <= 1, c + ": " + got[c] + " zamiast ok. " + (20 * counts[c] / 30).toFixed(1));
    });
    // zadanie wielopunktowe to jedno zadanie z 20, nie kilka
    assert.ok(d.every(function (it) { return pool.indexOf(it) !== -1; }));
  }
});
test("drawItems: różne losowania dają różne zestawy; typ nie powtarza się więcej niż 2 razy pod rząd; różne tematy w kategorii", function () {
  const pool = finalPool();
  const a = F.drawItems(pool, 20, catOf, seeded(1)).map(function (x) { return x.id; }).join();
  const b = F.drawItems(pool, 20, catOf, seeded(2)).map(function (x) { return x.id; }).join();
  assert.notStrictEqual(a, b);
  for (let s = 1; s < 40; s++) {
    const d = F.drawItems(pool, 20, catOf, seeded(s));
    const bad = d.some(function (it, i) { return i >= 2 && d[i - 1].type === it.type && d[i - 2].type === it.type; });
    // limitRuns działa „gdy się da”: w tej puli (3 typy) zawsze się da
    assert.ok(!bad, "3 pod rząd (seed " + s + ")");
    const gr = d.filter(function (it) { return catOf(it) === "gramatyka"; });
    assert.strictEqual(new Set(gr.map(function (it) { return it.topic; })).size, 4); // 9 zadań z 4 tematów → wszystkie 4 tematy
  }
});
test("drawItems: pula nie większa niż draw → wszystkie zadania", function () {
  const pool = finalPool().slice(0, 12);
  assert.strictEqual(F.drawItems(pool, 20, catOf, seeded(5)).length, 12);
});
test("breakdown: punkty według kategorii, tematy z utraconymi punktami, pominięte nie liczą się", function () {
  const pool = finalPool();
  const results = pool.slice(0, 8).map(function (it, i) {
    return { item: it, res: X.evaluate(it, it.type === "gap-fill" ? { texts: i % 2 ? ["a", "x", "x"] : ["a", "b", "c"] } : it.type === "multiple-choice" ? { chosen: i % 2 ? 1 : 0 } : { text: i % 2 ? "zzz" : "a" }) };
  });
  results.push({ item: { id: "dictation-1", type: "dictation", topic: "t-x" }, res: { correct: false, points: 0, max: 0, skipped: true } });
  const b = F.breakdown(results, catOf);
  const total = b.categories.reduce(function (s, c) { return s + c.total; }, 0);
  assert.strictEqual(total, results.slice(0, 8).reduce(function (s, r) { return s + r.res.max; }, 0));
  assert.ok(b.categories.every(function (c) { return c.score <= c.total; }));
  assert.ok(b.topics.every(function (t) { return t.lost > 0 && t.topic !== "t-x"; }));
  for (let i = 1; i < b.topics.length; i++) assert.ok(b.topics[i - 1].lost >= b.topics[i].lost);
  assert.deepStrictEqual(F.breakdown([], catOf), { categories: [], topics: [] });
});

// ---------- Prawdziwe pule testów końcowych (niezbednik/testy-poziomow) ----------
const LV_INDEX = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "niezbednik", "index.json"), "utf8"));
const LV_CATS = {};
LV_INDEX.levels.forEach(function (l) { l.items.forEach(function (it) { LV_CATS[it.id] = it.category; }); });
const POOLS = ["a1", "a2", "b1", "b2", "c1", "c2"].map(function (l) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "niezbednik", "testy-poziomow", l + ".json"), "utf8"));
});
test("pule testów końcowych: wzorcowa odpowiedź każdego z 180 zadań daje pełne punkty", function () {
  let n = 0;
  POOLS.forEach(function (set) {
    set.items.forEach(function (it) {
      const r = X.evaluate(it, modelAnswerOf(it));
      assert.ok(r.correct && r.points === X.maxPoints(it) && r.points === r.max, set.id + " " + it.id + " " + JSON.stringify(r));
      n++;
    });
  });
  assert.strictEqual(n, 180);
});
test("pule testów końcowych: wszystkie warianty accepted / answers są przyjmowane, a pusta odpowiedź nie daje punktów", function () {
  POOLS.forEach(function (set) {
    set.items.forEach(function (it) {
      if (it.type === "translate") it.accepted.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " „" + a + "”"); });
      if (it.type === "transformation") it.answers.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " „" + a + "”"); });
      if (it.type === "short-answer") it.accepted.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " „" + a + "”"); });
      if (it.type === "gap-fill") it.gaps.forEach(function (g, i) { g.accepted.forEach(function (a) {
        const texts = it.gaps.map(function (x) { return x.accepted[0]; }); texts[i] = a;
        assert.ok(X.evaluate(it, { texts: texts }).correct, it.id + " luka " + (i + 1) + " „" + a + "”");
      }); });
      const empty = X.evaluate(it, it.type === "match" ? { pairs: {} } : it.type === "gap-fill" ? { texts: [] } : it.type === "multiple-choice" ? {} : it.type === "reorder" ? { words: [] } : it.type === "find-error" ? {} : { text: "" });
      assert.strictEqual(empty.points, 0, it.id + " pusta odpowiedź");
    });
  });
});
test("pule testów końcowych: losowanie 20 z 30 – proporcje kategorii, zadania z różnych podstron, różne zestawy", function () {
  POOLS.forEach(function (set) {
    const cat = function (it) { return LV_CATS[it.topic]; };
    const pool = {};
    set.items.forEach(function (it) { pool[cat(it)] = (pool[cat(it)] || 0) + 1; });
    const seen = new Set();
    for (let s = 1; s <= 25; s++) {
      const d = F.drawItems(set.items, set.draw, cat, seeded(s * 7919));
      assert.strictEqual(d.length, 20);
      assert.strictEqual(new Set(d.map(function (x) { return x.id; })).size, 20);
      Object.keys(pool).forEach(function (c) {
        const got = d.filter(function (it) { return cat(it) === c; }).length;
        assert.ok(got >= 1 && Math.abs(got - 20 * pool[c] / 30) <= 1.01, set.id + " " + c + ": " + got + " (pula " + pool[c] + ")");
      });
      seen.add(d.map(function (x) { return x.id; }).sort().join());
    }
    assert.ok(seen.size >= 20, set.id + ": zbyt mało różnych losowań (" + seen.size + ")");
  });
});

// ---------- Dane profilu: elm_leveltests_v1 (znaczki poziomów) ----------
global.localStorage = { _d: {}, getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; }, setItem: function (k, v) { this._d[k] = String(v); }, removeItem: function (k) { delete this._d[k]; } };
require(path.join(__dirname, "..", "js", "utils.js"));
let activeProfile = "p1";
global.ELM.app = { getActiveProfile: function () { return activeProfile ? { id: activeProfile } : null; }, reportSaveError: function () { throw new Error("błąd zapisu"); } };
require(path.join(__dirname, "..", "js", "profile-data.js"));
const PD = global.ELM.profileData;
function freshPD() { PD.clearAll(); activeProfile = "p1"; }

test("elm_leveltests_v1: klucz jest w KEYS obok istniejących, szybki test poziomu ma swój (elm_leveltest_v1)", function () {
  assert.strictEqual(PD.KEYS.levelTests, "elm_leveltests_v1");
  assert.strictEqual(PD.KEYS.levelTest, "elm_leveltest_v1");
});
test("saveFinalResult: pierwsze zaliczenie, najlepszy wynik wg procentu, znaczek zostaje po porażce", function () {
  freshPD();
  assert.strictEqual(PD.finalResult("A1"), null);
  const fail = PD.saveFinalResult("A1", { score: 12, total: 20, passed: false });
  assert.deepStrictEqual([fail.passed, fail.firstPass, fail.passedAt], [false, false, null]);
  const pass = PD.saveFinalResult("A1", { score: 17, total: 20, passed: true });
  assert.deepStrictEqual([pass.passed, pass.firstPass, pass.best.score], [true, true, 17]);
  const again = PD.saveFinalResult("A1", { score: 18, total: 22, passed: true }); // 81,8% < 85%
  assert.deepStrictEqual([again.firstPass, again.best.score, again.last.score], [false, 17, 18]);
  const worse = PD.saveFinalResult("A1", { score: 9, total: 20, passed: false });
  assert.strictEqual(worse.passedAt, pass.passedAt); // znaczek nie znika
  assert.deepStrictEqual(PD.passedLevels(), { A1: pass.passedAt });
  assert.strictEqual(PD.saveFinalResult("Z9", { score: 1, total: 2, passed: true }), null);
  assert.strictEqual(PD.saveFinalResult("A2", { score: 5, total: 0, passed: true }), null);
});
test("elm_leveltests_v1: dane osobno dla profilu, bez profilu nic się nie zapisuje", function () {
  freshPD();
  PD.saveFinalResult("B1", { score: 20, total: 20, passed: true });
  activeProfile = "p2";
  assert.strictEqual(PD.finalResult("B1"), null);
  assert.deepStrictEqual(PD.passedLevels(), {});
  activeProfile = null;
  assert.strictEqual(PD.saveFinalResult("B1", { score: 20, total: 20, passed: true }), null);
  assert.strictEqual(PD.finalResult("B1"), null);
});
test("elm_leveltests_v1: eksport zawiera klucz, import odtwarza dane, usunięcie profilu i reset je kasują", function () {
  freshPD();
  PD.saveFinalResult("C1", { score: 18, total: 20, passed: true });
  const exported = JSON.parse(JSON.stringify(PD.exportData()));
  assert.ok(exported.levelTests && exported.levelTests.profiles.p1.levels.C1.passedAt);
  PD.clearAll();
  assert.strictEqual(PD.finalResult("C1"), null);
  assert.strictEqual(global.localStorage.getItem("elm_leveltests_v1"), null);
  PD.applyImport(PD.parseImport(exported), ["p1"]);
  assert.strictEqual(PD.finalResult("C1").best.score, 18);
  assert.ok(global.localStorage.getItem("elm_leveltests_v1"));
  PD.removeProfile("p1");
  assert.strictEqual(PD.finalResult("C1"), null);
  assert.strictEqual(JSON.parse(global.localStorage.getItem("elm_leveltests_v1")).profiles.p1, undefined);
});
test("import starego pliku bez klucza elm_leveltests_v1: część pomijana, dane tej przeglądarki zostają", function () {
  freshPD();
  PD.saveFinalResult("A2", { score: 16, total: 20, passed: true });
  const old = JSON.parse(JSON.stringify(PD.exportData()));
  delete old.levelTests; // plik z wersji sprzed paczki v6
  const parsed = PD.parseImport(old);
  assert.strictEqual(parsed.levelTests, null);
  assert.ok(parsed.journal && parsed.exercises);
  PD.applyImport(parsed, ["p1"]);
  assert.strictEqual(PD.finalResult("A2").passedAt !== null, true);
  // profil, którego nie ma w pliku, jest usuwany także z nowego klucza
  PD.applyImport(parsed, ["inny"]);
  assert.strictEqual(PD.finalResult("A2"), null);
  // całkiem stary plik bez części „learning”
  assert.strictEqual(PD.parseImport(undefined), null);
});
test("import: uszkodzony albo zbyt nowy klucz elm_leveltests_v1 → błąd, śmieci w danych odfiltrowane", function () {
  freshPD();
  assert.throws(function () { PD.parseImport({ levelTests: { version: 99, profiles: {} } }); }, /Nieobsługiwana wersja/);
  assert.throws(function () { PD.parseImport({ levelTests: { version: 1 } }); }, /Nieprawidłowy format/);
  const parsed = PD.parseImport({ levelTests: { version: 1, profiles: { p1: { levels: {
    A1: { passedAt: "kiedyś", best: { score: 30, total: 20, date: "2026-01-01" }, last: { score: 15, total: 20, date: "2026-01-02" } }, // zły dzień, zły best
    A2: { passedAt: "2026-02-03", best: { score: 16, total: 20, date: "2026-02-03" } },                                               // brak last
    Z9: { passedAt: "2026-02-03", best: { score: 1, total: 2, date: "2026-02-03" } },                                                 // nieznany poziom
    B1: "tekst"
  } } } } });
  const lv = parsed.levelTests.profiles.p1.levels;
  assert.deepStrictEqual(Object.keys(lv).sort(), ["A1", "A2"]);
  assert.deepStrictEqual([lv.A1.passedAt, lv.A1.best.score, lv.A1.last.score], [null, 15, 15]);
  assert.deepStrictEqual([lv.A2.passedAt, lv.A2.last.score], ["2026-02-03", 16]);
});
test("elm_leveltests_v1: uszkodzony zapis w localStorage → pusty stan i kopia _corrupt_backup", function () {
  // Nowa instancja modułu (pamięć podręczna profileData jest wypełniona dopiero przy pierwszym odczycie)
  const file = path.join(__dirname, "..", "js", "profile-data.js");
  const keep = global.ELM.profileData;
  delete require.cache[require.resolve(file)];
  global.localStorage.setItem("elm_leveltests_v1", "{niepoprawny json");
  require(file);
  assert.deepStrictEqual(global.ELM.profileData.passedLevels(), {});
  assert.strictEqual(global.localStorage.getItem("elm_leveltests_v1_corrupt_backup"), "{niepoprawny json");
  global.localStorage.removeItem("elm_leveltests_v1");
  global.localStorage.removeItem("elm_leveltests_v1_corrupt_backup");
  global.ELM.profileData = keep;
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

console.log("\nTalia Certyfikat C1: jednorazowe włączenie (paczka C1 v6, spec 12)");
test("fiszki-store: istniejący profil dostaje talię certyfikat-c1 raz; wyłączona nie wraca; nowy profil bez włączania", function () {
  if (!global.addEventListener) global.addEventListener = function () {};
  const storePath = path.join(__dirname, "..", "js", "fiszki-store.js");
  require(storePath);
  const key = global.ELM.fiszkiStore.keyOf("pc1");
  const old = FL.sanitizeState({ version: 1, cards: { "kolokacje-001": { state: "review", ease: 2.5, interval: 5, due: 5, reps: 3 } }, settings: { enabledDecks: ["kolokacje"] } });
  delete old.settings.c1DeckV6;
  global.localStorage.setItem(key, JSON.stringify(old));
  let st = global.ELM.fiszkiStore.load("pc1");
  assert.deepStrictEqual(st.settings.enabledDecks, ["kolokacje", "certyfikat-c1"]);
  assert.strictEqual(st.settings.c1DeckV6, true);
  assert.strictEqual(st.cards["kolokacje-001"].reps, 3); // stan nauki bez zmian
  // użytkownik wyłącza talię i zapisuje; ponowne wczytanie z localStorage jej nie włącza
  st.settings.enabledDecks.splice(st.settings.enabledDecks.indexOf("certyfikat-c1"), 1);
  global.ELM.fiszkiStore.save("pc1", true);
  delete require.cache[require.resolve(storePath)];
  require(storePath);
  st = global.ELM.fiszkiStore.load("pc1");
  assert.deepStrictEqual(st.settings.enabledDecks, ["kolokacje"]);
  // profil bez zapisu: domyślne talie, bez certyfikat-c1, ale ze znacznikiem
  const fresh = global.ELM.fiszkiStore.load("pnowy");
  assert.ok(fresh.settings.enabledDecks.indexOf("certyfikat-c1") === -1);
  assert.strictEqual(fresh.settings.c1DeckV6, true);
  global.localStorage.removeItem(key);
});

console.log("\nSzlak: logika (spec v7 13)");
{
  const SL = global.ELM.szlakLogic;
  const data = { levels: [
    { level: "A1", land: "Polana", units: [
      { id: "a1-u1", title: "Pierwsze zdania", stops: [
        { id: "a1-01", type: "lesson", title: "Przedstawianie", items: ["e_a1_f01"], page: "a1/x", quiz: "szlak-a1-01" },
        { id: "a1-02", type: "lesson", title: "To be", items: ["e_a1_g05", "e_a1_g06"], page: "a1/y", quiz: "szlak-a1-02" },
        { id: "a1-03", type: "lesson", title: "Czasy", items: ["e_a1_g07"], page: "a1/z", set: "a1-set-1" },
        { id: "a1-u1-powtorka", type: "review", title: "Powtórka", from: ["a1-01", "a1-02", "a1-03"], size: 6 }
      ] }
    ] },
    { level: "A2", land: "Las", units: [
      { id: "a2-u1", title: "Dom", stops: [
        { id: "a2-01", type: "lesson", title: "Dom", items: ["e_a2_v01"], page: "a2/x", quiz: "szlak-a2-01" },
        { id: "a2-u1-powtorka", type: "review", title: "Powtórka", from: ["a2-01"], size: 6 }
      ] }
    ] },
    { level: "C1", land: "Góry", units: [
      { id: "c1-u1", title: "Styl", stops: [
        { id: "c1-01", type: "lesson", title: "Styl", items: ["e_c1_g01"], page: "c1/x" },
        { id: "c1-02", type: "lesson", title: "Rejestr", items: ["e_c1_f01"], page: "c1/y" },
        { id: "c1-u1-powtorka", type: "review", title: "Powtórka", from: ["c1-01", "c1-02"], size: 6 }
      ] }
    ] }
  ] };
  const umiem = {}, setPct = {};
  const env = { isUmiem: function (id) { return umiem[id] === true; }, setPercent: function (id) { return id in setPct ? setPct[id] : null; } };
  const reset = function () { Object.keys(umiem).forEach(function (k) { delete umiem[k]; }); Object.keys(setPct).forEach(function (k) { delete setPct[k]; }); };
  const stopOf = function (id) { let f = null; data.levels.forEach(function (l) { l.units.forEach(function (u) { u.stops.forEach(function (s) { if (s.id === id) f = s; }); }); }); return f; };

  test("szlak stopStatus: quiz ≥ 3/4 zalicza (także po odznaczeniu „Umiem”), 2/4 nie", function () {
    reset();
    const st = SL.emptyState();
    st.stops["a1-01"] = { done: true, via: "quiz", best: 3, at: "2026-11-12" };
    assert.deepStrictEqual(SL.statusOf(stopOf("a1-01"), st, env), { status: "done", via: "quiz" });
    umiem.e_a1_f01 = true; umiem.e_a1_f01 = false;                       // Umiem odznaczone: quiz zostaje
    assert.strictEqual(SL.statusOf(stopOf("a1-01"), st, env).status, "done");
    st.stops["a1-01"].best = 2;
    assert.strictEqual(SL.statusOf(stopOf("a1-01"), st, env).status, "open", "2/4 to za mało");
  });
  test("szlak stopStatus: wszystkie punkty „Umiem” zaliczają, odznaczenie cofa (bez quizu)", function () {
    reset();
    const st = SL.emptyState();
    umiem.e_a1_g05 = true;
    assert.strictEqual(SL.statusOf(stopOf("a1-02"), st, env).status, "open", "tylko część punktów");
    umiem.e_a1_g06 = true;
    assert.deepStrictEqual(SL.statusOf(stopOf("a1-02"), st, env), { status: "done", via: "umiem" });
    umiem.e_a1_g06 = false;
    assert.strictEqual(SL.statusOf(stopOf("a1-02"), st, env).status, "open", "odznaczenie cofa zaliczenie");
  });
  test("szlak stopStatus: zestaw ≥ 80% zalicza tylko przystanek bez quizu; skip = pominięty, nie zaliczony", function () {
    reset();
    const st = SL.emptyState();
    setPct["a1-set-1"] = 79;
    assert.strictEqual(SL.statusOf(stopOf("a1-03"), st, env).status, "open");
    setPct["a1-set-1"] = 80;
    assert.deepStrictEqual(SL.statusOf(stopOf("a1-03"), st, env), { status: "done", via: "set" });
    const withQuiz = { id: "x", type: "lesson", items: ["e_x"], quiz: "q", set: "a1-set-1" };
    assert.strictEqual(SL.statusOf(withQuiz, st, env).status, "open", "przystanek z quizem nie zalicza się zestawem");
    st.stops["a1-02"] = { done: false, via: "skip", at: "2026-11-12" };
    assert.deepStrictEqual(SL.statusOf(stopOf("a1-02"), st, env), { status: "skipped", via: "skip" });
    umiem.e_a1_g05 = true; umiem.e_a1_g06 = true;
    assert.strictEqual(SL.statusOf(stopOf("a1-02"), st, env).status, "done", "pełne „Umiem” wygrywa z pominięciem");
  });
  test("szlak stopStatus: powtórka zaliczona po podejściu, wynik nie blokuje", function () {
    const st = SL.emptyState();
    assert.strictEqual(SL.statusOf(stopOf("a1-u1-powtorka"), st, env).status, "open");
    st.reviews["a1-u1-powtorka"] = { best: 1, of: 6, at: "2026-11-12" };
    assert.strictEqual(SL.statusOf(stopOf("a1-u1-powtorka"), st, env).status, "done");
  });
  test("szlak buildTrail: bieżący przystanek od punktu startu, krainy przed startem „pominięte”", function () {
    reset();
    let st = SL.emptyState();
    let tr = SL.buildTrail(data, st, env);
    assert.strictEqual(tr.current.id, "a1-01", "start A1: pierwszy przystanek");
    umiem.e_a1_f01 = true;
    tr = SL.buildTrail(data, st, env);
    assert.strictEqual(tr.current.id, "a1-02");
    st = SL.sanitizeState({ version: 1, start: { level: "C1", source: "test", at: "2026-11-12" } });
    tr = SL.buildTrail(data, st, env);
    assert.strictEqual(tr.current.id, "c1-01", "po teście C1: pierwszy niezaliczony przystanek C1");
    const byId = function (id) { return tr.nodes.find(function (n) { return n.id === id; }); };
    assert.deepStrictEqual([byId("a1-02").status, byId("a1-02").via], ["skipped", "start"], "A1 przed startem: pominięty testem");
    assert.strictEqual(byId("a1-01").status, "done", "zaliczony przed startem zostaje zaliczony");
    assert.strictEqual(byId("a2-01").status, "skipped");
    assert.strictEqual(byId("c1-02").status, "open");
    assert.strictEqual(byId("a1-u1-powtorka").status, "skipped");
    umiem.e_c1_g01 = true;
    assert.strictEqual(SL.buildTrail(data, st, env).current.id, "c1-02");
    umiem.e_c1_f01 = true;
    assert.strictEqual(SL.buildTrail(data, st, env).current, null, "wszystko zaliczone: brak bieżącego");
  });
  test("szlak: pominięty przystanek nie jest bieżący; postęp krainy i odcinka liczy tylko zaliczone", function () {
    reset();
    const st = SL.emptyState();
    st.stops["a1-01"] = { done: false, via: "skip", at: "2026-11-12" };
    umiem.e_a1_g05 = true; umiem.e_a1_g06 = true;                        // a1-02 zaliczony
    const tr = SL.buildTrail(data, st, env);
    assert.strictEqual(tr.current.id, "a1-03");
    assert.deepStrictEqual(SL.levelProgress(tr, "A1"), { done: 1, total: 3, percent: 33 });
    assert.deepStrictEqual(SL.levelProgress(tr, "C2"), { done: 0, total: 0, percent: 0 });
    const u = SL.unitProgress(tr, "a1-u1");
    assert.deepStrictEqual([u.done, u.total, u.index, u.count], [1, 3, 1, 1]);
    assert.strictEqual(tr.nodes.find(function (n) { return n.id === "a1-02"; }).number, 2, "numer przystanku w krainie");
  });
  test("szlak pickReview: pytania z quizów odcinka po równo; fallback: zestawy → test końcowy → brak źródeł", function () {
    const rng = (function () { let x = 7; return function () { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
    const mk = function (p, n) { return Array.from({ length: n }, function (_, i) { return { id: p + i }; }); };
    const stops = { "a1-01": stopOf("a1-01"), "a1-02": stopOf("a1-02"), "a1-03": stopOf("a1-03") };
    const rev = stopOf("a1-u1-powtorka");
    const quiz = { "a1-01": mk("q1-", 4), "a1-02": mk("q2-", 4), "a1-03": [] };
    let r = SL.pickReview(rev, { stops: stops, quizItems: function (id) { return quiz[id]; }, setItems: function () { return []; }, finalItems: function () { return []; } }, rng);
    assert.strictEqual(r.source, "quiz");
    assert.strictEqual(r.items.length, 6);
    assert.strictEqual(new Set(r.items.map(function (x) { return x.id; })).size, 6, "bez powtórzeń");
    assert.strictEqual(r.items.filter(function (x) { return /^q1-/.test(x.id); }).length, 3, "po równo z przystanków");
    r = SL.pickReview(rev, { stops: stops, quizItems: function () { return []; }, setItems: function (id) { return mk(id + ":", 10); }, finalItems: function () { return []; } }, rng);
    assert.deepStrictEqual([r.source, r.items.length], ["set", 6], "tylko przystanek z zestawem daje pytania z zestawu");
    r = SL.pickReview(rev, { stops: {}, quizItems: function () { return []; }, setItems: function () { return []; }, finalItems: function (lvl) { return lvl === "A1" ? mk("f", 30) : []; } }, rng);
    assert.deepStrictEqual([r.source, r.items.length], ["final", 6]);
    r = SL.pickReview(rev, { stops: {}, quizItems: function () { return []; }, setItems: function () { return []; }, finalItems: function () { return []; } }, rng);
    assert.deepStrictEqual([r.source, r.items.length], [null, 0], "brak źródeł: węzeł pomijany");
    const small = SL.pickReview({ id: "r", type: "review", from: ["a1-01"], size: 6 }, { stops: stops, quizItems: function () { return mk("s", 4); }, setItems: function () { return []; }, finalItems: function () { return []; } }, rng);
    assert.strictEqual(small.items.length, 4, "mniej pytań niż size: wszystkie");
  });
  test("szlak effectiveStart: ręczny i z testu mają pierwszeństwo, bez testu A1", function () {
    const none = SL.emptyState();
    assert.deepStrictEqual([SL.effectiveStart(none, null).level, SL.effectiveStart(none, null).source], ["A1", "default"]);
    assert.deepStrictEqual([SL.effectiveStart(none, "C1").level, SL.effectiveStart(none, "C1").source], ["C1", "test"]);
    const manual = SL.sanitizeState({ version: 1, start: { level: "B1", source: "manual", at: "2026-11-12" } });
    assert.strictEqual(SL.effectiveStart(manual, "C1").level, "B1");
    const def = SL.sanitizeState({ version: 1, start: { level: "A1", source: "default" } });
    assert.strictEqual(SL.effectiveStart(def, "B2").level, "B2", "domyślny start ustępuje wynikowi testu");
  });
  test("szlak sanitizeState: zły format i wersja → wyjątek, śmieci odfiltrowane, eksport → import bez zmian", function () {
    assert.throws(function () { SL.sanitizeState(null); });
    assert.throws(function () { SL.sanitizeState([]); });
    assert.throws(function () { SL.sanitizeState({ version: 2 }); });
    const s = SL.sanitizeState({
      version: 1,
      start: { level: "Z9", source: "test" },
      stops: { "a1-05": { done: true, via: "quiz", best: 4, at: "2026-11-12T10:00:00Z" }, "ZŁY ID": { via: "quiz" }, "a1-06": { via: "magia" }, "a1-07": { done: true, via: "skip", best: 99 }, "a1-08": "x" },
      reviews: { "a1-u1-powtorka": { best: 5, of: 6, at: "2026-11-12" }, "a1-u2-powtorka": { best: 9, of: 6 }, "a1-u3-powtorka": {} }
    });
    assert.strictEqual(s.start, null, "nieznany poziom startu");
    assert.deepStrictEqual(Object.keys(s.stops).sort(), ["a1-05", "a1-07"]);
    assert.strictEqual(s.stops["a1-05"].best, 4);
    assert.strictEqual(s.stops["a1-07"].done, false, "skip nigdy nie jest „done”");
    assert.strictEqual(s.stops["a1-07"].best, undefined, "best poza zakresem odrzucone");
    assert.deepStrictEqual(Object.keys(s.reviews), ["a1-u1-powtorka"]);
    assert.deepStrictEqual(SL.sanitizeState(JSON.parse(JSON.stringify(s))), s, "eksport → import bez zmian");
    assert.strictEqual(SL.quizAverage(s), 100);
    assert.strictEqual(SL.quizAverage(SL.emptyState()), null);
  });
}

console.log("\nSzlak: magazyn elm.<id>.szlak, eksport, import, reset (spec v7 13)");
{
  require(path.join(__dirname, "..", "js", "szlak-store.js"));
  const SS = global.ELM.szlakStore, SL = global.ELM.szlakLogic;
  const key = function (pid) { return "elm." + pid + ".szlak"; };
  const clean = function () { SS.clearAll(); ["pa", "pb"].forEach(function (p) { global.localStorage.removeItem(key(p)); }); };

  test("szlakStore: zapis pod kluczem elm.<id>.szlak z version, quiz zapamiętuje najlepszy wynik, pominięcie nie nadpisuje zdanego quizu", function () {
    clean();
    activeProfile = "pa";
    assert.strictEqual(SS.recordQuiz("a1-01", 2).done, false);
    assert.strictEqual(SS.recordQuiz("a1-01", 4).done, true);
    assert.strictEqual(SS.recordQuiz("a1-01", 1).best, 4, "gorsze podejście nie obniża najlepszego");
    assert.strictEqual(SS.skipStop("a1-01"), false, "zaliczony quizem nie da się pominąć");
    assert.strictEqual(SS.skipStop("a1-02"), true);
    assert.strictEqual(SS.unskipStop("a1-02"), true);
    SS.recordReview("a1-u1-powtorka", 5, 6);
    assert.strictEqual(SS.recordReview("a1-u1-powtorka", 3, 6).best, 5);
    assert.strictEqual(SS.setStart("C1", "test"), true);
    assert.strictEqual(SS.setStart("B1", "manual"), true);
    assert.strictEqual(SS.setStart("C2", "test"), false, "ręczny start nie jest nadpisywany testem");
    assert.strictEqual(SS.setStart("C2", "test", true), true, "przycisk „Zacznij szlak od X” wymusza start");
    const raw = JSON.parse(global.localStorage.getItem(key("pa")));
    assert.strictEqual(raw.version, 1);
    assert.deepStrictEqual([raw.start.level, raw.stops["a1-01"].best, raw.reviews["a1-u1-powtorka"].of], ["C2", 4, 6]);
    assert.strictEqual(raw.stops["a1-02"], undefined);
    assert.strictEqual(SS.setStart("Z9", "manual"), false);
    activeProfile = "p1";
  });
  test("szlakStore: bez profilu nic się nie zapisuje (stan tymczasowy)", function () {
    clean();
    activeProfile = null;
    assert.strictEqual(SS.recordQuiz("a1-01", 4), null);
    assert.strictEqual(SS.skipStop("a1-01"), false);
    assert.strictEqual(SS.recordReview("r", 1, 6), null);
    assert.deepStrictEqual(SS.exportData(), {});
    activeProfile = "p1";
  });
  test("szlakStore: eksport → reset → import przywraca dane; stary plik bez części „szlak” nie kasuje stanu", function () {
    clean();
    activeProfile = "pa"; SS.recordQuiz("a1-03", 3); SS.setStart("B2", "manual");
    activeProfile = "pb"; SS.recordQuiz("a1-04", 4);
    const exported = JSON.parse(JSON.stringify(SS.exportData()));
    assert.deepStrictEqual(Object.keys(exported).sort(), ["pa", "pb"]);
    // stary eksport (bez części szlak) → parseImport = null, applyImport(null) zostawia dane
    assert.strictEqual(SS.parseImport(undefined), null);
    assert.strictEqual(SS.parseImport(null), null);
    SS.applyImport(null, ["pa", "pb"]);
    assert.ok(global.localStorage.getItem(key("pa")), "stary plik nie usuwa Szlaku");
    // reset
    SS.clearAll();
    assert.strictEqual(global.localStorage.getItem(key("pa")), null);
    assert.strictEqual(global.localStorage.getItem(key("pb")), null);
    // import z pliku: tylko profile z listy
    SS.applyImport(SS.parseImport(exported), ["pa"]);
    assert.ok(global.localStorage.getItem(key("pa")));
    assert.strictEqual(global.localStorage.getItem(key("pb")), null, "profil spoza listy jest usuwany");
    activeProfile = "pa";
    assert.strictEqual(SS.data().stops["a1-03"].best, 3);
    assert.strictEqual(SS.data().start.level, "B2");
    activeProfile = "p1";
  });
  test("szlakStore: walidacja przy imporcie (zła część → wyjątek), uszkodzony zapis → kopia _corrupt_backup i pusty stan", function () {
    assert.throws(function () { SS.parseImport("tekst"); });
    assert.throws(function () { SS.parseImport([]); });
    assert.throws(function () { SS.parseImport({ pa: { version: 9 } }); });
    assert.deepStrictEqual(SS.parseImport({}), {});
    clean();
    global.localStorage.setItem(key("pb"), "{niepoprawny json");
    activeProfile = "pb";
    assert.deepStrictEqual(SS.data(), SL.emptyState());
    assert.strictEqual(global.localStorage.getItem(key("pb") + "_corrupt_backup"), "{niepoprawny json");
    global.localStorage.removeItem(key("pb") + "_corrupt_backup");
    activeProfile = "p1";
    clean();
  });
}

console.log("\nUlubione zwroty: elm_phrases_v1 (paczka v6, spec 17)");
test("elm_phrases_v1: klucz w KEYS, gwiazdka przełącza się per profil i zapisuje w localStorage", function () {
  assert.strictEqual(PD.KEYS.phrases, "elm_phrases_v1");
  freshPD();
  assert.deepStrictEqual(PD.starredPhrases(), []);
  assert.strictEqual(PD.togglePhraseStar("opinia-05"), true);
  assert.strictEqual(PD.togglePhraseStar("kontrargument-01"), true);
  assert.deepStrictEqual(PD.starredPhrases(), ["opinia-05", "kontrargument-01"]);
  assert.strictEqual(PD.togglePhraseStar("opinia-05"), false);
  assert.deepStrictEqual(PD.starredPhrases(), ["kontrargument-01"]);
  assert.strictEqual(PD.togglePhraseStar("Zły ID!"), false); // niepoprawne id jest odrzucane
  assert.deepStrictEqual(JSON.parse(global.localStorage.getItem("elm_phrases_v1")).profiles.p1.starred, ["kontrargument-01"]);
  activeProfile = "p2";
  assert.deepStrictEqual(PD.starredPhrases(), []); // inny profil ma własne ulubione
  activeProfile = "p1";
});
test("elm_phrases_v1: eksport, import (z filtrowaniem śmieci i duplikatów), usunięcie profilu i reset", function () {
  freshPD();
  PD.togglePhraseStar("opinia-01");
  const exp = JSON.parse(JSON.stringify(PD.exportData()));
  assert.deepStrictEqual(exp.phrases.profiles.p1.starred, ["opinia-01"]);
  const parsed = PD.parseImport({ phrases: { version: 1, profiles: { p1: { starred: ["a-01", "a-01", "ŹLE", 5, "b-02"] } } } });
  assert.deepStrictEqual(parsed.phrases.profiles.p1.starred, ["a-01", "b-02"]);
  assert.throws(function () { PD.parseImport({ phrases: { version: 99, profiles: {} } }); }, /Nieobsługiwana wersja/);
  PD.applyImport(parsed, ["p1"]);
  assert.deepStrictEqual(PD.starredPhrases(), ["a-01", "b-02"]);
  // stary plik bez klucza: dane tej przeglądarki zostają
  const old = JSON.parse(JSON.stringify(PD.exportData()));
  delete old.phrases;
  PD.applyImport(PD.parseImport(old), ["p1"]);
  assert.deepStrictEqual(PD.starredPhrases(), ["a-01", "b-02"]);
  PD.applyImport(PD.parseImport(old), ["inny"]);
  assert.deepStrictEqual(PD.starredPhrases(), []);
  PD.togglePhraseStar("c-03");
  PD.clearAll();
  assert.deepStrictEqual(PD.starredPhrases(), []);
  assert.strictEqual(global.localStorage.getItem("elm_phrases_v1"), null);
});

console.log("\nTrener mówienia: seen w elm_speaking_v1 (paczka v6, spec 18)");
test("elm_speaking_v1: stary zapis bez seen działa, seen jest opcjonalne, tolerancyjne i w eksporcie/imporcie/resecie", function () {
  freshPD();
  // stary zapis (tylko sessions) normalizuje się jak dawniej, bez pola seen
  const old = PD.parseImport({ speaking: { version: 1, profiles: { p1: { sessions: [{ day: "2026-01-02", exam: "certyfikat-b2", part: 1, scores: { gv: 4 } }] } } } });
  assert.deepStrictEqual(old.speaking.profiles.p1, { sessions: [{ day: "2026-01-02", exam: "certyfikat-b2", part: 1, scores: { gv: 4 } }] });
  PD.applyImport(old, ["p1"]);
  assert.deepStrictEqual(PD.speakingSeen("certyfikat-b2:1"), []);
  assert.strictEqual(PD.markSpeakingSeen("certyfikat-b2:1", "p1-dom"), true);
  assert.strictEqual(PD.markSpeakingSeen("certyfikat-b2:1", "p1-dom"), true); // bez duplikatów
  assert.strictEqual(PD.markSpeakingSeen("certyfikat-b2:1", "p1-praca"), true);
  assert.strictEqual(PD.markSpeakingSeen("zły klucz", "x"), false);
  assert.strictEqual(PD.markSpeakingSeen("certyfikat-b2:1", "Zły ID"), false);
  assert.deepStrictEqual(PD.speakingSeen("certyfikat-b2:1"), ["p1-dom", "p1-praca"]);
  assert.strictEqual(PD.speakingSessions("certyfikat-b2").length, 1); // sesje nietknięte
  const exp = JSON.parse(JSON.stringify(PD.exportData()));
  assert.deepStrictEqual(exp.speaking.profiles.p1.seen, { "certyfikat-b2:1": ["p1-dom", "p1-praca"] });
  // import odfiltrowuje śmieci
  const parsed = PD.parseImport({ speaking: { version: 1, profiles: { p1: { sessions: [], seen: { "a:1": ["x-1", "x-1", "ŹLE", 5], "zły": ["x"], "b:2": "nie lista" } } } } });
  assert.deepStrictEqual(parsed.speaking.profiles.p1.seen, { "a:1": ["x-1"] });
  // sesja trybu „Cały egzamin” zachowuje full
  const full = PD.addSpeakingSession({ exam: "matura-podstawowa", part: 1, scores: { komunikacja: 4 }, full: true });
  assert.strictEqual(full.full, true);
  assert.strictEqual(PD.addSpeakingSession({ exam: "matura-podstawowa", part: 2, scores: { zakres: 3 } }).full, undefined);
  // czyszczenie cyklu
  assert.strictEqual(PD.markSpeakingSeen("certyfikat-b2:1", null), true);
  assert.deepStrictEqual(PD.speakingSeen("certyfikat-b2:1"), []);
  PD.markSpeakingSeen("certyfikat-b2:2", "p2-x");
  PD.clearAll();
  assert.strictEqual(global.localStorage.getItem("elm_speaking_v1"), null);
});

console.log("\nEgzaminy z tagów karty (paczka v6, spec 15)");
test("examsOf: e8, mp, mr, b2, c1; matura = MP + MR; bez powtórzeń, stała kolejność, wielkość liter bez znaczenia", function () {
  const codes = function (tags) { return FL.examsOf({ tags: tags }).map(function (e) { return e.code; }); };
  assert.deepStrictEqual(codes(["slownictwo", "e8", "matura"]), ["e8", "mp", "mr"]);
  assert.deepStrictEqual(codes(["MR", "matura", "B2"]), ["mp", "mr", "b2"]);
  assert.deepStrictEqual(codes(["c1", "kolokacje"]), ["c1"]);
  assert.deepStrictEqual(codes([]), []);
  assert.deepStrictEqual(FL.examsOf({}), []);
  assert.deepStrictEqual(FL.examsOf(null), []);
});

console.log("\nMoje słowa (paczka v6, spec 14)");
test("wordFromSelection: 1–6 słów i do 60 znaków, przestankowe brzegi i {}| usuwane, bez liter → pusto", function () {
  assert.strictEqual(FL.wordFromSelection("  commute, "), "commute");
  assert.strictEqual(FL.wordFromSelection("“come up with”."), "come up with");
  assert.strictEqual(FL.wordFromSelection("a b c d e f"), "a b c d e f");
  assert.strictEqual(FL.wordFromSelection("a b c d e f g"), "");
  assert.strictEqual(FL.wordFromSelection("x".repeat(61)), "");
  assert.strictEqual(FL.wordFromSelection("x".repeat(60)), "x".repeat(60));
  assert.strictEqual(FL.wordFromSelection("{{up}}|down"), "up down");
  assert.strictEqual(FL.wordFromSelection("123 ... 45"), "");
  assert.strictEqual(FL.wordFromSelection("don’t"), "don’t");
  assert.strictEqual(FL.wordFromSelection(""), "");
});
test("isPolish: polskie znaki wyłączają „Do Moich słów” (3.4)", function () {
  ["zażółć", "Łódź", "więc", "ŻÓŁW", "sąd", "kość", "źle", "ń"].forEach(function (w) { assert.ok(FL.isPolish(w), w); });
  ["commute", "naïve café", "über", "résumé", "", null].forEach(function (w) { assert.ok(!FL.isPolish(w), String(w)); });
});
test("splitSentences / extractSentence: skróty (e.g., Mr., etc.), liczby 3.5, cudzysłowy, inicjały", function () {
  const t = "Mr. Brown works hard, e.g. on Sundays. He earns 3.5 thousand pounds. “Really?” she asked. J. K. Rowling wrote it. We use tea, coffee, etc. They never complain.";
  assert.strictEqual(FL.extractSentence(t, "Sundays"), "Mr. Brown works hard, e.g. on Sundays.");
  assert.strictEqual(FL.extractSentence(t, "thousand"), "He earns 3.5 thousand pounds.");
  assert.strictEqual(FL.extractSentence(t, "asked"), "“Really?” she asked.");
  assert.strictEqual(FL.extractSentence(t, "Rowling"), "J. K. Rowling wrote it.");
  assert.strictEqual(FL.extractSentence(t, "tea"), "We use tea, coffee, etc. They never complain."); // etc. nie dzieli
  assert.strictEqual(FL.extractSentence("Dr. Smith said so. Prof. Lee agreed.", "agreed"), "Prof. Lee agreed.");
});
test("extractSentence: komórka tabeli i pojedyncze zdanie, wielkość liter i spacje, brak zaznaczenia w tekście", function () {
  assert.strictEqual(FL.extractSentence("  Commute   to work.  ", "COMMUTE"), "Commute to work.");
  assert.strictEqual(FL.extractSentence("I'm waiting for a bus", "bus"), "I'm waiting for a bus");
  assert.strictEqual(FL.extractSentence("First one. Second one.", "nic"), "First one.");
  assert.strictEqual(FL.extractSentence("", "x"), "");
  assert.strictEqual(FL.extractSentence("She said it’s fine. It is not.", "it's fine"), "She said it’s fine."); // apostrofy typograficzne
});
test("extractSentence: zdanie dłuższe niż 220 znaków → okno wokół słowa z „…” po obu stronach (≤ 220)", function () {
  const mid = ("Many people think that this long sentence goes on and on " .repeat(6)) + "but the commute to work takes ages " + ("and it never seems to end for anybody " .repeat(6)) + "really.";
  const s = FL.extractSentence(mid, "commute");
  assert.ok(s.length <= 220, "długość " + s.length);
  assert.ok(/^…/.test(s) && /…$/.test(s), s);
  assert.ok(s.indexOf("commute") !== -1);
  assert.ok(!/…\S/.test(s.slice(1)) && !/\S…/.test(s.slice(0, -1)), "nie tnie słów: " + s);
  // słowo na początku i na końcu długiego zdania — „…” tylko z jednej strony
  const head = "Commute " + "word ".repeat(60) + "end.";
  const hs = FL.extractSentence(head, "Commute");
  assert.ok(hs.length <= 220 && !/^…/.test(hs) && /…$/.test(hs), hs);
  const tail = "word ".repeat(60) + "commute end.";
  const ts = FL.extractSentence(tail, "commute");
  assert.ok(ts.length <= 220 && /^…/.test(ts) && !/…$/.test(ts), ts);
});
test("makeCloze: pierwsze wystąpienie, wielkość liter z tekstu, granice słów, brak wystąpienia → null", function () {
  assert.strictEqual(FL.makeCloze("Most people commute to work. Some commute far.", "commute"), "Most people {{commute}} to work. Some commute far.");
  assert.strictEqual(FL.makeCloze("Commuting is tiring, but Commute is a word.", "commute"), "Commuting is tiring, but {{Commute}} is a word."); // „Commuting” nie jest „commute”
  assert.strictEqual(FL.makeCloze("She came up with a plan.", "come up with"), null);
  assert.strictEqual(FL.makeCloze("She came up   with a plan.", "came up with"), "She {{came up   with}} a plan.");
  assert.strictEqual(FL.makeCloze("It’s a deal.", "it's"), "{{It’s}} a deal.");
  assert.strictEqual(FL.makeCloze("The cat sat.", "dog"), null);
  assert.strictEqual(FL.makeCloze("Use {{braces}} here.", "braces"), "Use {{braces}} here."); // nawiasy ze zdania usunięte i luka nałożona
  assert.strictEqual(FL.parseCloze(FL.makeCloze("Most people commute to work.", "commute")).ok, true);
  assert.strictEqual(FL.makeCloze("Cost: 5% (really)", "(really)"), "Cost: 5% {{(really)}}"); // znaki specjalne regexu są cytowane
});
test("wordKey: deduplikacja po normalize (wielkość liter, spacje, apostrofy)", function () {
  assert.strictEqual(FL.wordKey(" Commute. "), FL.wordKey("commute"));
  assert.strictEqual(FL.wordKey("Don’t"), FL.wordKey("don't"));
  assert.notStrictEqual(FL.wordKey("commute"), FL.wordKey("commuter"));
});
test("makeWordCard: cloze ze zdania; bez wystąpienia basic; bez zdania; za dużo słów → błąd; pola word/source/addedAt", function () {
  const a = FL.makeWordCard({ selection: "commute", sentence: "Most people commute to work by train.", source: { route: "#/b1/slownictwo", title: "Słownictwo B1" }, day: "2026-11-03" });
  assert.deepStrictEqual([a.card.type, a.card.text, a.card.word, a.card.addedAt, a.card.source.route], ["cloze", "Most people {{commute}} to work by train.", "commute", "2026-11-03", "#/b1/slownictwo"]);
  const withHint = FL.makeWordCard({ selection: "commute", sentence: "Most people commute to work.", hint: "dojeżdżać do pracy" });
  assert.strictEqual(withHint.card.hint, "dojeżdżać do pracy");
  const basic = FL.makeWordCard({ selection: "came up with", sentence: "She thought of a plan." });
  assert.deepStrictEqual([basic.card.type, basic.card.front, basic.card.back], ["basic", "came up with", "She thought of a plan."]);
  const none = FL.makeWordCard({ selection: "ephemeral", sentence: "" });
  assert.deepStrictEqual([none.card.type, none.card.front, none.card.back], ["basic", "ephemeral", "—"]);
  assert.ok(FL.makeWordCard({ selection: "a b c d e f g", sentence: "x" }).error);
  assert.ok(FL.makeWordCard({ selection: "", sentence: "x" }).error);
  const bad = FL.makeWordCard({ selection: "x", sentence: "x y", source: { route: "javascript:alert(1)", title: "T" }, day: "jutro" });
  assert.deepStrictEqual([bad.card.source, bad.card.addedAt], [{ title: "T" }, undefined]);
});
test("sanitizeState: nowe pola karty (word, source, addedAt, examples) przy zapisie i imporcie, talia systemowa „words”, stary plik bez pól", function () {
  const s = FL.sanitizeState({ version: 1, cards: {}, userDecks: [{ id: "u-moje-slowa", title: "Moje słowa", system: "words" }, { id: "u-moje-bledy", title: "Moje błędy", system: "mistakes" }, { id: "u-x", title: "X", system: "inne" }], userCards: [
    { id: "u-w1", deck: "u-moje-slowa", type: "cloze", text: "Most people {{commute}} to work.", hint: "dojeżdżać", word: "commute".padEnd(80, "x"), source: { route: "#/b1/slownictwo", title: "T".repeat(200) }, addedAt: "2026-11-03", examples: ["a", "  b  ", "", 7, "c", "d", "e".repeat(300)] },
    { id: "u-w2", deck: "u-moje-slowa", type: "basic", front: "x", back: "y", word: 5, source: { route: "http://zła.pl", title: "" }, addedAt: "2026-13-40", examples: "nie tablica" },
    { id: "u-w3", deck: "u-x", type: "basic", front: "stara", back: "karta" }
  ], settings: {}, daily: {} });
  assert.deepStrictEqual(s.userDecks.map(function (d) { return d.system || null; }), ["words", "mistakes", null]);
  const [w1, w2, w3] = s.userCards;
  assert.strictEqual(w1.word.length, 60);
  assert.deepStrictEqual([w1.source.route, w1.source.title.length, w1.addedAt], ["#/b1/slownictwo", 120, "2026-11-03"]);
  assert.deepStrictEqual(w1.examples, ["a", "b", "c"]); // maks. 3, puste i nietekstowe odrzucone
  assert.deepStrictEqual([w2.word, w2.source, w2.addedAt, w2.examples], [undefined, undefined, undefined, undefined]);
  assert.deepStrictEqual(Object.keys(w3).sort(), ["back", "deck", "front", "id", "tags", "type"]); // stara karta bez nowych pól
  assert.strictEqual(FL.sanitizeWordFields({ examples: ["e".repeat(300)] }).examples[0].length, 220);
  // zapis → odczyt → te same pola (round-trip przez JSON)
  assert.deepStrictEqual(FL.sanitizeState(JSON.parse(JSON.stringify(s))).userCards[0], w1);
});
test("exportWordsCsv: słowo; znaczenie; zdanie; źródło, cudzysłowy i średniki w polach", function () {
  const csv = FL.exportWordsCsv([
    { type: "cloze", text: "Most people {{commute}} to work; by train.", hint: "dojeżdżać", word: "commute", source: { route: "#/b1/slownictwo", title: "Słownictwo B1" } },
    { type: "basic", front: "ephemeral", back: "He said \"hi\"." }
  ]).split("\n");
  assert.strictEqual(csv[0], "słowo;znaczenie;zdanie;źródło");
  assert.strictEqual(csv[1], 'commute;dojeżdżać;"Most people commute to work; by train.";Słownictwo B1 (#/b1/slownictwo)');
  assert.strictEqual(csv[2], 'ephemeral;;"He said ""hi"".";');
});

test("examBoxAnchor: ramki egzaminów przed „Życie i egzamin” na 3 podstronach (A1, B2, C2) i warianty skrajne", function () {
  const fs = require("fs");
  const EL = global.ELM.examLogic;
  function titles(file) {
    return fs.readFileSync(path.join(__dirname, "..", "niezbednik", file), "utf8").split(/\r?\n/)
      .filter(function (l) { return /^## /.test(l); }).map(function (l) { return l.slice(3).trim(); });
  }
  ["a1/czasy-present-simple.md", "b2/czasy-future-continuous-perfect.md", "c2/funkcje-humor-ironia-understatement.md"].forEach(function (f) {
    const t = titles(f);
    const i = EL.examBoxAnchorIndex(t);
    assert.strictEqual(t[i], "Życie i egzamin", f);
    assert.ok(i > 0, f + ": ramki po wyjaśnieniu, nie na początku");
  });
  assert.strictEqual(EL.examBoxAnchorIndex(["Budowa", "Typowe błędy Polaków", "Ćwiczenie"]), 1);
  assert.strictEqual(EL.examBoxAnchorIndex(["Budowa", "Przykłady", "Odpowiedzi"]), 2);
  assert.strictEqual(EL.examBoxAnchorIndex(["Budowa", "Przykłady"]), -1);
});

test("myExams: data, zestaw, odpięty, przypięty, data w przeszłości, C1 z elm_c1_v1", function () {
  const EL = global.ELM.examLogic;
  const registry = { exams: [
    { id: "e8", status: "active", setIds: ["e8-1", "e8-2"] },
    { id: "mp", status: "active", setIds: ["mp-1"] },
    { id: "mr", status: "active", setIds: [] },
    { id: "soon", status: "soon", setIds: [] },
    { id: "c1", status: "active", existing: true, setIds: ["c1-a", "c1-b"] }
  ] };
  const today = "2026-10-30";
  function run(input) { return EL.myExams(EL.examMyState(Object.assign({ registry: registry, examsRecord: { exams: {} }, c1: {}, isSetDone: function () { return false; } }, input)), registry, today); }
  assert.deepStrictEqual(run({}), [], "bez danych nic nie jest moje");
  // data
  assert.deepStrictEqual(run({ examsRecord: { exams: { mp: { examDate: "2027-05-06" } } } }), [{ id: "mp", reason: "date", days: 188 }]);
  // zestaw
  assert.deepStrictEqual(run({ isSetDone: function (id) { return id === "e8-2"; } }), [{ id: "e8", reason: "sets", days: null }]);
  // odpięty ręcznie (data i zestaw nie wystarczą)
  assert.deepStrictEqual(run({ examsRecord: { exams: { mp: { examDate: "2027-05-06" } }, my: { mp: "hidden" } } }), []);
  // przypięty bez daty i zestawów; egzamin „soon” nigdy
  assert.deepStrictEqual(run({ examsRecord: { exams: {}, my: { mr: "pinned", soon: "pinned" } } }), [{ id: "mr", reason: "pinned", days: null }]);
  // data w przeszłości: nadal moje, po przyszłych, przed egzaminami bez daty
  const mixed = run({
    examsRecord: { exams: { e8: { examDate: "2026-10-27" }, mp: { examDate: "2027-05-06" } }, my: { mr: "pinned" } },
    c1: { examDate: "2027-01-10" }
  });
  assert.deepStrictEqual(mixed.map(function (x) { return x.id; }), ["c1", "mp", "e8", "mr"]);
  assert.strictEqual(mixed[2].days, -3);
  // C1: data z elm_c1_v1 albo najlepszy wynik zestawu
  assert.deepStrictEqual(run({ c1: { examDate: "2026-10-31" } }), [{ id: "c1", reason: "date", days: 1 }]);
  assert.deepStrictEqual(run({ c1: { best: { "c1-b": 7 } } }), [{ id: "c1", reason: "sets", days: null }]);
});

test("formatDatePl i daysBetween", function () {
  const EL = global.ELM.examLogic;
  assert.strictEqual(EL.formatDatePl("2027-05-06"), "czwartek, 6 maja 2027");
  assert.strictEqual(EL.formatDatePl("2027-05-12"), "środa, 12 maja 2027");
  assert.strictEqual(EL.formatDatePl("zle"), "");
  assert.strictEqual(EL.daysBetween("2026-11-01", "2026-10-30"), 2);
  assert.strictEqual(EL.daysBetween("2026-10-29", "2026-10-30"), -1);
});

test("navSplit: tylko moje + reszta w „+N”, bieżący egzamin zostaje, brak moich = wszystkie", function () {
  const EL = global.ELM.examLogic;
  const reg = { exams: [{ id: "e8" }, { id: "mp" }, { id: "mr" }, { id: "b2" }, { id: "c1" }] };
  assert.deepStrictEqual(EL.navSplit(reg, ["c1", "mp"]), { shown: ["c1", "mp"], hidden: ["e8", "mr", "b2"] });
  assert.deepStrictEqual(EL.navSplit(reg, ["c1"], "b2"), { shown: ["c1", "b2"], hidden: ["e8", "mp", "mr"] });
  assert.deepStrictEqual(EL.navSplit(reg, ["c1"], "c1").shown, ["c1"]);
  assert.deepStrictEqual(EL.navSplit(reg, []), { shown: ["e8", "mp", "mr", "b2", "c1"], hidden: [] });
  assert.strictEqual(EL.navSplit(reg, ["x"]).hidden.length, 5);
});

console.log("\nPowtórki v8: migracja Dziennika błędów do kart „Moje błędy” (spec 20, R1)");
(function () {
  const FLg = global.ELM.fiszkiLogic;
  const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime(); // 10.11.2026, południe
  const entry = function (id, review, extra) { return Object.assign({ id: id, createdAt: "2026-11-01", context: "She ___ to school.", myAnswer: "go", correct: "goes", rule: "3. osoba: -s", source: "", category: "Gramatyka", itemId: "", ref: "", review: review }, extra || {}); };
  const entries = [
    entry("err-s0", { stage: 0, due: "2026-11-11", mastered: false }),
    entry("err-s1", { stage: 1, due: "2026-11-12", mastered: false }),
    entry("err-s2", { stage: 2, due: "2026-11-17", mastered: false }, { context: "Jaki czas?\nZdanie bez luki" }),
    entry("err-m", { stage: 2, due: "2026-10-01", mastered: true }),
    entry("err-late", { stage: 1, due: "2026-11-05", mastered: false })
  ];
  const fresh = function () { return FLg.sanitizeState(FLg.emptyState()); };

  test("migracja: wpis bez karty dostaje kartę w talii „Moje błędy” (włączonej), znacznik migratedJournal", function () {
    const st = fresh();
    assert.strictEqual(FLg.migrateJournal(st, entries, NOW), 5);
    assert.strictEqual(st.userCards.length, 5);
    assert.ok(st.userDecks.some(function (d) { return d.id === "u-moje-bledy" && d.system === "mistakes"; }));
    assert.ok(st.settings.enabledDecks.indexOf("u-moje-bledy") !== -1);
    assert.strictEqual(st.settings.migratedJournal, true);
    assert.strictEqual(st.userCards[0].type, "cloze");
    assert.strictEqual(st.userCards[2].type, "basic");
    assert.strictEqual(st.userCards[0].sourceItemId, "journal:err-s0");
  });
  test("migracja: etap 0/1/2 → interwał 1/3/7 dni, termin = review.due", function () {
    const st = fresh();
    FLg.migrateJournal(st, entries, NOW);
    [["err-s0", 1, "2026-11-11"], ["err-s1", 3, "2026-11-12"], ["err-s2", 7, "2026-11-17"]].forEach(function (x) {
      const c = st.cards[FLg.journalCardId({ id: x[0] })];
      assert.strictEqual(c.state, "review");
      assert.strictEqual(c.interval, x[1]);
      assert.strictEqual(c.due, FLg.dayStart(x[2]));
    });
  });
  test("migracja: opanowany → interwał 21 dni, termin nie wcześniej niż jutro (bez zalewu „dziś”)", function () {
    const st = fresh();
    FLg.migrateJournal(st, entries, NOW);
    const c = st.cards[FLg.journalCardId({ id: "err-m" })];
    assert.strictEqual(c.interval, 21);
    assert.ok(c.due >= FLg.dayEnd(NOW));
  });
  test("migracja: zaległy wpis zostaje zaległy (termin w przeszłości)", function () {
    const st = fresh();
    FLg.migrateJournal(st, entries, NOW);
    const c = st.cards[FLg.journalCardId({ id: "err-late" })];
    assert.strictEqual(c.due, FLg.dayStart("2026-11-05"));
    assert.ok(c.due < NOW);
  });
  test("migracja: druga migracja nic nie zmienia", function () {
    const st = fresh();
    FLg.migrateJournal(st, entries, NOW);
    const before = JSON.stringify(st);
    assert.strictEqual(FLg.migrateJournal(st, entries, NOW + 3600000), 0);
    assert.strictEqual(JSON.stringify(st), before);
  });
  test("migracja: wpis z kartą dodaną wcześniej ręcznie (sourceItemId) nie dostaje drugiej", function () {
    const st = fresh();
    FLg.ensureMistakesDeck(st);
    st.userCards.push({ id: "u-stara", deck: "u-moje-bledy", type: "basic", front: "a", back: "b", tags: [], sourceItemId: "journal:err-s0" });
    assert.strictEqual(FLg.migrateJournal(st, entries, NOW), 4);
    assert.strictEqual(st.userCards.length, 5);
  });
  test("stan po migracji przechodzi sanitizeState bez zmian (eksport → import), z kluczem ex: i exNew", function () {
    const st = fresh();
    FLg.migrateJournal(st, entries, NOW);
    st.cards["ex:a1-czasy-present-simple-1-3"] = FLg.journalCardState({ stage: 1, due: "2026-11-12" }, NOW);
    st.daily["2026-11-10"] = { new: 1, reviews: 0, again: 0, good: 0, answers: 1, minutes: 0, exNew: 1 };
    const round = FLg.sanitizeState(JSON.parse(JSON.stringify(st)));
    assert.deepStrictEqual(round, st);
    assert.ok(round.cards["ex:a1-czasy-present-simple-1-3"]);
    assert.strictEqual(round.settings.migratedJournal, true);
    assert.strictEqual(round.daily["2026-11-10"].exNew, 1);
  });
  test("sanitizeState: zły klucz ex: jest odrzucany", function () {
    const st = fresh();
    st.cards["ex:../zly"] = FLg.newJournalState(NOW);
    st.cards["ex:"] = FLg.newJournalState(NOW);
    assert.deepStrictEqual(Object.keys(FLg.sanitizeState(JSON.parse(JSON.stringify(st))).cards), []);
  });
  test("nowy wpis: karta od razu, pierwsza powtórka jutro", function () {
    const s = FLg.newJournalState(NOW);
    assert.strictEqual(s.state, "review");
    assert.strictEqual(s.interval, 1);
    assert.strictEqual(s.due, FLg.dayEnd(NOW));
  });
})();

console.log("\nPowtórki v8: kolejka Fiszki i błędy (spec 20, R2)");
require(path.join(__dirname, "..", "js", "reviews.js"));
(function () {
  const R = global.ELM.reviews;
  const FLg = global.ELM.fiszkiLogic;
  const HM = global.ELM.fiszkiHarmonogram;
  const DAYMS = 86400000;
  const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime(); // 10.11.2026, 12:00
  const at = function (d, h, m) { return new Date(2026, 10, d, h, m || 0, 0).getTime(); };
  const rev = function (due, interval) { return Object.assign(HM.newCard(), { state: "review", interval: interval || 3, due: due, reps: 2 }); };

  // talie: d1 (4 karty), d2 (3 karty), „Moje błędy” (3 karty użytkownika)
  function makeCtx(over) {
    const st = FLg.sanitizeState(FLg.emptyState());
    st.settings.enabledDecks = ["d1", "d2"];
    const userCards = ["u-mb-1", "u-mb-2", "u-mb-3"].map(function (id) { return { id: id, deck: "u-moje-bledy", type: "basic", front: "a", back: "b", tags: [] }; });
    st.userDecks.push({ id: "u-moje-bledy", title: "Moje błędy", system: "mistakes" });
    st.userCards = userCards;
    const decks = [{ id: "d1", count: 4 }, { id: "d2", count: 3 }, { id: "u-moje-bledy", count: 3 }];
    const cards = { d1: [1, 2, 3, 4].map(function (i) { return { id: "d1-00" + i, deck: "d1" }; }), d2: [1, 2, 3].map(function (i) { return { id: "d2-00" + i, deck: "d2" }; }), "u-moje-bledy": userCards };
    const ctx = Object.assign({
      state: st, decks: decks, weak: [],
      cardsOf: function (id) { return cards[id] || []; },
      deckOf: function (id) { return /^u-mb/.test(id) ? "u-moje-bledy" : id.replace(/-\d{3}$/, ""); }
    }, over || {});
    return ctx;
  }
  const ids = function (q) { return q.map(function (x) { return x.id; }); };

  test("kolejka: pusto, gdy nie ma kart do zrobienia (limit nowych 0)", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 0;
    assert.deepStrictEqual(R.queueFrom(ctx, NOW), []);
    const zero = R.summaryFrom(ctx, NOW);
    assert.deepStrictEqual([zero.card, zero.mistake, zero.exercise, zero.total, zero.due.total, zero.fresh.total], [0, 0, 0, 0, 0, 0]);
  });
  test("kolejka: zaległe najstarsze pierwsze, nowe na końcu, rodzaje: karta / błąd / zadanie", function () {
    const ctx = makeCtx({ weak: [{ id: "a1-x-1", topic: "t1" }] });
    ctx.state.settings.newPerDay = 2;
    ctx.state.cards["d1-001"] = rev(at(9, 5));            // zaległa o dzień
    ctx.state.cards["u-mb-1"] = rev(at(5, 5));            // najstarsza
    ctx.state.cards["ex:a1-x-2"] = rev(at(8, 5));         // zadanie
    ctx.state.cards["d2-001"] = rev(at(10, 5));           // dziś rano
    ctx.state.cards["d2-002"] = rev(at(12, 5));           // pojutrze: poza dniem
    const q = R.queueFrom(ctx, NOW);
    assert.strictEqual(q[0].id, "u-mb-1", "najstarsza zaległa pierwsza");
    assert.strictEqual(ids(q).indexOf("d2-002"), -1);
    assert.deepStrictEqual(q.slice(0, 4).map(function (x) { return x.kind; }).sort(), ["card", "card", "exercise", "mistake"]);
    assert.ok(q.slice(4).every(function (x) { return x.due === 0; }), "nowe na końcu");
    assert.strictEqual(q.length, 6, "4 zaległe + 2 nowe (limit)");
  });
  test("kolejka: przeplatanie — najwyżej 2 tego samego rodzaju i nie ten sam temat z rzędu", function () {
    const items = [];
    for (let i = 0; i < 4; i++) items.push({ kind: "card", id: "c" + i, due: i, topic: "d1" });
    for (let i = 0; i < 3; i++) items.push({ kind: "mistake", id: "m" + i, due: 10 + i, topic: "u-moje-bledy" });
    items.push({ kind: "exercise", id: "e0", due: 20, topic: "t1" }, { kind: "card", id: "c9", due: 21, topic: "d2" });
    const out = R.interleave(items);
    assert.strictEqual(out.length, items.length);
    for (let i = 1; i < out.length; i++) assert.notStrictEqual(out[i].topic, out[i - 1].topic, "temat z rzędu na " + i);
    for (let i = 2; i < out.length; i++) assert.ok(!(out[i].kind === out[i - 1].kind && out[i].kind === out[i - 2].kind), "trzeci rodzaj z rzędu na " + i);
  });
  test("kolejka: limit powtórek na dzień wspólny dla kart, błędów i zadań (najstarsze zostają)", function () {
    const ctx = makeCtx();
    ctx.state.settings.reviewsPerDay = 3;
    ctx.state.settings.newPerDay = 0;
    ctx.state.cards["d1-001"] = rev(at(9, 5));
    ctx.state.cards["d1-002"] = rev(at(8, 5));
    ctx.state.cards["u-mb-1"] = rev(at(7, 5));
    ctx.state.cards["ex:a1-x-9"] = rev(at(6, 5));
    ctx.state.cards["d2-001"] = rev(at(5, 5));
    const q = R.queueFrom(ctx, NOW);
    assert.deepStrictEqual(ids(q).sort(), ["d2-001", "ex:a1-x-9", "u-mb-1"].sort());
    ctx.state.daily["2026-11-10"] = { new: 0, reviews: 2, again: 0, good: 0, answers: 2, minutes: 0 };
    assert.strictEqual(R.queueFrom(ctx, NOW).length, 1);
  });
  test("kolejka: limit nowych 10 dziennie, w tym najwyżej 3 nowe zadania ze słabych punktów", function () {
    const weak = [1, 2, 3, 4, 5].map(function (i) { return { id: "w-" + i, topic: "t" + i }; });
    const ctx = makeCtx({ weak: weak });
    let q = R.queueFrom(ctx, NOW);
    assert.strictEqual(q.filter(function (x) { return x.kind === "exercise"; }).length, 3);
    assert.strictEqual(q.length, 10, "10 nowych: 7 kart i 3 zadania");
    assert.strictEqual(q[q.length - 1].kind === "exercise" || q[q.length - 2].kind === "exercise", true);
    ctx.state.daily["2026-11-10"] = { new: 2, reviews: 0, again: 0, good: 0, answers: 2, minutes: 0, exNew: 2 };
    q = R.queueFrom(ctx, NOW);
    assert.strictEqual(q.filter(function (x) { return x.kind === "exercise"; }).length, 1, "zostało 3 − 2 = 1");
    assert.strictEqual(q.length, 8, "limit nowych 10 − 2 zrobione");
  });
  test("kolejka: granica dnia 04:00 — karta z terminem po północy, ale przed 04:00, należy do dzisiejszego dnia nauki", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 0;
    ctx.state.cards["d1-001"] = rev(at(11, 2, 0));   // jutro 02:00
    ctx.state.cards["d1-002"] = rev(at(11, 5, 0));   // jutro 05:00
    assert.deepStrictEqual(ids(R.queueFrom(ctx, at(10, 23, 0))), ["d1-001"]);
    assert.deepStrictEqual(ids(R.queueFrom(ctx, at(11, 1, 0))), ["d1-001"], "01:00 to jeszcze dzień nauki 10.11");
    assert.deepStrictEqual(ids(R.queueFrom(ctx, at(11, 6, 0))).sort(), ["d1-001", "d1-002"], "po 04:00 oba są na dziś (koniec dnia nauki 12.11 04:00)");
  });
  test("kolejka: wyłączona talia pomijana, „Moje błędy” zawsze w kolejce, zawieszone i odłożone pomijane", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 0;
    ctx.state.settings.enabledDecks = ["d1"];
    ctx.state.cards["d2-001"] = rev(at(9, 5));
    ctx.state.cards["u-mb-2"] = rev(at(9, 5));
    ctx.state.cards["d1-001"] = Object.assign(rev(at(9, 5)), { suspended: true });
    ctx.state.cards["d1-002"] = Object.assign(rev(at(9, 5)), { buriedUntil: NOW + 3600000 });
    assert.deepStrictEqual(ids(R.queueFrom(ctx, NOW)), ["u-mb-2"]);
  });
  test("count / breakdown (summaryFrom) zgadzają się z długością i rodzajami kolejki", function () {
    const ctx = makeCtx({ weak: [{ id: "w1", topic: "t1" }, { id: "w2", topic: "t2" }] });
    ctx.state.settings.newPerDay = 5;
    ctx.state.cards["d1-001"] = rev(at(9, 5));
    ctx.state.cards["d2-001"] = Object.assign(HM.newCard(), { state: "learning", due: NOW - 1000 });
    ctx.state.cards["u-mb-1"] = rev(at(8, 5));
    ctx.state.cards["ex:old-1"] = rev(at(7, 5));
    const q = R.queueFrom(ctx, NOW), s = R.summaryFrom(ctx, NOW);
    assert.strictEqual(s.total, q.length);
    ["card", "mistake", "exercise"].forEach(function (k) { assert.strictEqual(s[k], q.filter(function (x) { return x.kind === k; }).length, k); });
  });
  test("P3: nowe karty nie są „do powtórki” — świeży profil: 0 do powtórki, 10 nowych; zaległe osobno", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 10;
    const fresh = R.summaryFrom(ctx, NOW);
    assert.deepStrictEqual([fresh.due.total, fresh.fresh.total, fresh.total], [0, 10, 10], "świeży profil");
    ctx.state.cards["d1-001"] = rev(at(9, 5));                                                    // review, termin wczoraj
    ctx.state.cards["d2-001"] = Object.assign(HM.newCard(), { state: "learning", due: NOW - 1000 }); // w nauce, termin minął
    ctx.state.cards["u-mb-1"] = rev(at(8, 5));                                                    // zaległy błąd
    ctx.state.cards["d1-002"] = rev(at(20, 5), 8);                                                // review za 10 dni: ani zaległa, ani nowa
    const s = R.summaryFrom(ctx, NOW);
    assert.deepStrictEqual([s.due.card, s.due.mistake, s.due.exercise, s.due.total], [2, 1, 0, 3]);
    assert.strictEqual(s.fresh.total, 6, "nowe: 10 kart w taliach minus 4 z zapisanym stanem");
    assert.strictEqual(s.total, s.due.total + s.fresh.total, "total = cała kolejka dnia");
    assert.strictEqual(R.queueFrom(ctx, NOW).length, s.total);
    ctx.state.settings.newPerDay = 0;
    assert.deepStrictEqual([R.summaryFrom(ctx, NOW).due.total, R.summaryFrom(ctx, NOW).fresh.total], [3, 0]);
  });
  test("P3 regresja: karta oceniona „Dobrze” z interwałem 8 d nie wraca do kolejki przez 7 dni (granica dnia 04:00)", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 0;
    const base = Object.assign(HM.newCard(), { state: "review", interval: 3, due: NOW, reps: 3 });
    const pv = HM.preview(base, NOW).good;
    assert.strictEqual(pv.card.interval, 8, "podgląd: Dobrze = 8 d");
    const rated = HM.schedule(base, "good", NOW, null, { fuzz: true, random: function () { return 0; } }); // także z rozproszeniem
    assert.strictEqual(rated.interval, 8);
    ctx.state.cards["d1-001"] = rated;
    for (let day = 0; day <= 7; day++) {
      [at(10 + day, 5), at(10 + day, 12), at(10 + day, 23, 59)].forEach(function (t) {
        if (t < NOW) return;
        assert.deepStrictEqual(ids(R.queueFrom(ctx, t)), [], "dzień +" + day + " (" + new Date(t).toISOString() + "): karta nie powinna wracać");
        assert.strictEqual(R.summaryFrom(ctx, t).due.total, 0);
      });
    }
    assert.deepStrictEqual(ids(R.queueFrom(ctx, at(18, 10))), ["d1-001"], "w 8. dniu wraca");
  });
  test("estimateMinutes: karta 0,3, błąd 0,5, zadanie 0,7 min (zaokrąglone, min. 1 gdy coś jest)", function () {
    assert.strictEqual(R.estimateMinutes({ card: 10, mistake: 0, exercise: 0 }), 3);
    assert.strictEqual(R.estimateMinutes({ card: 11, mistake: 4, exercise: 3 }), 7);
    assert.strictEqual(R.estimateMinutes({ card: 1, mistake: 0, exercise: 0 }), 1);
    assert.strictEqual(R.estimateMinutes({ card: 0, mistake: 0, exercise: 0 }), 0);
  });
  test("weakTasks: błędne zadania z słabych tematów bez poprawnej odpowiedzi w 14 dni; dyktanda pomijane bez głosu", function () {
    const row = function (id, topic, ok, day, type) { return { itemId: id, topic: topic, correct: ok, day: day, type: type || "gap-fill" }; };
    const items = [];
    for (let i = 0; i < 6; i++) items.push(row("t-" + i, "slaby", false, "2026-11-0" + (i % 5 + 1)));
    items.push(row("solved", "slaby", false, "2026-11-01"), row("solved", "slaby", true, "2026-11-09"));
    items.push(row("dyk", "slaby", false, "2026-11-08", "dictation"));
    for (let i = 0; i < 6; i++) items.push(row("ok-" + i, "dobry", i < 5, "2026-11-05"));
    const rec = { items: items, aggregates: {} };
    global.ELM.learn.today = function () { return "2026-11-10"; };
    const all = R.weakTasks(rec, "2026-11-10");
    assert.ok(all.every(function (w) { return w.topic === "slaby"; }));
    assert.ok(all.some(function (w) { return w.id === "dyk"; }));
    assert.ok(!all.some(function (w) { return w.id === "solved"; }), "rozwiązane poprawnie w 14 dniach");
    assert.ok(!R.weakTasks(rec, "2026-11-10", { noVoice: true }).some(function (w) { return w.id === "dyk"; }));
    assert.deepStrictEqual(R.weakTasks({ items: [], aggregates: {} }, "2026-11-10"), []);
  });
  test("redirectFor: stare adresy → #/powtorki/…", function () {
    const m = {
      "#/fiszki": "#/powtorki/talie", "#/fiszki/": "#/powtorki/talie", "#/fiszki/talia/kolokacje": "#/powtorki/talie/talia/kolokacje",
      "#/fiszki/moje-slowa": "#/powtorki/moje-slowa", "#/fiszki/import": "#/powtorki/talie/import", "#/fiszki/tematy/a1": "#/powtorki/talie/tematy/a1",
      "#/fiszki/sesja": "#/powtorki/sesja?tylko=talie", "#/bledy": "#/powtorki/moje-bledy", "#/bledy/powtorki": "#/powtorki/sesja?tylko=bledy"
    };
    Object.keys(m).forEach(function (k) { assert.strictEqual(R.redirectFor(k), m[k], k); });
    ["#/dzis", "#/powtorki", "#/powtorki/talie", "#/cwiczenia", ""].forEach(function (k) { assert.strictEqual(R.redirectFor(k), null, k); });
  });
})();

console.log("\nDziś v8: przebyta mapa i najbliższe terminy powtórek (spec 20, D)");
(function () {
  const L2 = global.ELM.learn;
  const R = global.ELM.reviews;
  const FLg = global.ELM.fiszkiLogic;
  const HM = global.ELM.fiszkiHarmonogram;
  const lv = function (arr) { return arr.map(function (p, i) { return { id: ["A1", "A2", "B1", "B2", "C1", "C2"][i], percent: p }; }); };

  test("mapProgress: średnia procentów 6 poziomów (zaokrąglona) i odcinki paska", function () {
    const m = L2.mapProgress(lv([100, 100, 46, 0, 0, 0]));
    assert.strictEqual(m.percent, 41);
    assert.deepStrictEqual(m.segments.map(function (s) { return s.percent; }), [100, 100, 46, 0, 0, 0]);
    assert.strictEqual(m.segments.length, 6);
    assert.strictEqual(m.segments[2].id, "B1");
  });
  test("mapProgress: nowy profil 0%, cała mapa 100%, zaokrąglenie", function () {
    assert.strictEqual(L2.mapProgress(lv([0, 0, 0, 0, 0, 0])).percent, 0);
    assert.strictEqual(L2.mapProgress(lv([100, 100, 100, 100, 100, 100])).percent, 100);
    assert.strictEqual(L2.mapProgress(lv([1, 0, 0, 0, 0, 0])).percent, 0, "1/6 = 0,17 → 0");
    assert.strictEqual(L2.mapProgress(lv([50, 0, 0, 0, 0, 0])).percent, 8, "50/6 = 8,3 → 8");
    assert.strictEqual(L2.mapProgress(lv([100, 0, 0, 0, 0, 0])).percent, 17, "100/6 = 16,7 → 17");
  });
  test("mapProgress: wartości spoza zakresu przycięte, pusta lista i NaN to 0", function () {
    const m = L2.mapProgress(lv([150, -20, NaN, 0, 0, 0]));
    assert.deepStrictEqual(m.segments.map(function (s) { return s.percent; }), [100, 0, 0, 0, 0, 0]);
    assert.strictEqual(m.percent, 17);
    assert.deepStrictEqual(L2.mapProgress([]), { percent: 0, segments: [] });
    assert.strictEqual(L2.mapProgress(undefined).percent, 0);
  });

  test("upcomingFrom: najbliższy termin i liczba pozycji na jutro (granica dnia 04:00)", function () {
    const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();
    const at = function (d, h) { return new Date(2026, 10, d, h, 0, 0).getTime(); };
    const st = FLg.sanitizeState(FLg.emptyState());
    st.settings.enabledDecks = ["d1"];
    const rev = function (due) { return Object.assign(HM.newCard(), { state: "review", interval: 3, due: due, reps: 2 }); };
    st.cards["d1-001"] = rev(at(11, 9));          // jutro
    st.cards["d1-002"] = rev(at(11, 20));         // jutro
    st.cards["ex:a-1"] = rev(at(11, 6));          // jutro (zadanie)
    st.cards["d1-003"] = rev(at(13, 9));          // za 3 dni
    st.cards["d2-001"] = rev(at(11, 9));          // wyłączona talia: pomijana
    st.cards["d1-004"] = rev(at(10, 9));          // dziś rano (już minęło): nie jest „następne”
    const ctx = { state: st, decks: [{ id: "d1", count: 4 }, { id: "d2", count: 1 }], deckOf: function (id) { return id.replace(/-\d{3}$/, ""); } };
    const u = R.upcomingFrom(ctx, NOW);
    assert.strictEqual(u.next, at(11, 6));
    assert.strictEqual(u.tomorrow, 3);
    assert.deepStrictEqual(R.upcomingFrom({ state: FLg.sanitizeState(FLg.emptyState()), decks: [], deckOf: function () { return null; } }, NOW), { next: null, tomorrow: 0 });
  });
})();

console.log("\nTreści v8: sąsiedzi tematu (S2)");
test("topicNeighbors: poprzedni i następny w kolejności poziomu, brzegi i nieznany temat", function () {
  const ids = ["a", "b", "c"];
  assert.deepStrictEqual(global.ELM.learn.topicNeighbors(ids, "b"), { prev: "a", next: "c" });
  assert.deepStrictEqual(global.ELM.learn.topicNeighbors(ids, "a"), { prev: null, next: "b" });
  assert.deepStrictEqual(global.ELM.learn.topicNeighbors(ids, "c"), { prev: "b", next: null });
  assert.deepStrictEqual(global.ELM.learn.topicNeighbors(ids, "x"), { prev: null, next: null });
  assert.deepStrictEqual(global.ELM.learn.topicNeighbors(["a"], "a"), { prev: null, next: null });
  assert.deepStrictEqual(global.ELM.learn.topicNeighbors(undefined, "a"), { prev: null, next: null });
});

console.log("\nTreści v8: etykieta zestawu na liście poziomu (S4)");
test("bestSetLabel: najlepszy zestaw tematu, próg 80% (kropka), brak wyników = null", function () {
  const f = global.ELM.exLogic.bestSetLabel;
  assert.deepStrictEqual(f([{ score: 8, total: 10 }]), { score: 8, total: 10, high: true, text: "zestaw 8/10" });
  assert.strictEqual(f([{ score: 7, total: 10 }]).high, false);
  assert.strictEqual(f([{ score: 7, total: 10 }, { score: 5, total: 5 }]).text, "zestaw 5/5", "wyższy procent wygrywa");
  assert.strictEqual(f([{ score: 5, total: 5 }, { score: 10, total: 10 }]).text, "zestaw 10/10", "remis: więcej punktów");
  assert.strictEqual(f([null, undefined, { score: 3, total: 0 }]), null);
  assert.strictEqual(f([]), null);
  assert.strictEqual(f(undefined), null);
  assert.strictEqual(f([{ score: 0, total: 6 }]).text, "zestaw 0/6");
});

console.log("\nTreści v8: odsłuch zdania klawiszem S (S5)");
test("speechText: luka jako pauza przed sprawdzeniem, odpowiedź po sprawdzeniu (wybór, uzupełnianie, transformacja)", function () {
  const f = global.ELM.exLogic.speechText;
  const mc = { type: "multiple-choice", prompt: "My brother ___ football every Saturday.", options: ["play", "plays", "playing"], correct: 1 };
  assert.strictEqual(f(mc, false), "My brother … football every Saturday.");
  assert.strictEqual(f(mc, true), "My brother plays football every Saturday.");
  const gf = { type: "gap-fill", text: "She {{1}} to school and {{2}} home.", gaps: [{ accepted: ["goes"] }, { accepted: ["comes", "walks"] }] };
  assert.strictEqual(f(gf, false), "She … to school and … home.");
  assert.strictEqual(f(gf, true), "She goes to school and comes home.");
  const tr = { type: "transformation", before: "I wish I", after: "more time.", answers: ["had"] };
  assert.strictEqual(f(tr, false), "I wish I … more time.");
  assert.strictEqual(f(tr, true), "I wish I had more time.");
  const sa = { type: "short-answer", prompt: "A: Where is Tom?\nB: He ___ at home.", accepted: ["is"] };
  assert.strictEqual(f(sa, false), "Where is Tom? He … at home.", "etykiety mówców nie są czytane");
});
test("speechText: układanie i tłumaczenie dopiero po sprawdzeniu, dopasowanie i dyktando bez zdania, błąd w zdaniu: całe zdanie", function () {
  const f = global.ELM.exLogic.speechText;
  assert.strictEqual(f({ type: "reorder", answers: ["She likes tea."] }, false), "");
  assert.strictEqual(f({ type: "reorder", answers: ["She likes tea."] }, true), "She likes tea.");
  assert.strictEqual(f({ type: "translate", accepted: ["I am tired."] }, false), "");
  assert.strictEqual(f({ type: "translate", accepted: ["I am tired."] }, true), "I am tired.");
  assert.strictEqual(f({ type: "find-error", tokens: ["He", "go", "home", "."] }, false), "He go home.");
  assert.strictEqual(f({ type: "match", pairs: [["a", "b"]] }, true), "");
  assert.strictEqual(f({ type: "dictation", text: "x" }, false), "");
  assert.strictEqual(f(null, false), "");
  assert.strictEqual(f({ type: "multiple-choice", prompt: "Which is correct?", options: ["a", "b"], correct: 0 }, false), "Which is correct?", "pytanie bez luki jest czytane w całości");
});

console.log("\nKontrola v8: przeplatanie kolejki (poprawki po recenzji)");
test("interleave: gdy rodzaju nie da się rozdzielić, nadal nie dwa razy ten sam temat z rzędu", function () {
  const R = global.ELM.reviews;
  const items = [];
  for (let i = 0; i < 6; i++) items.push({ kind: "card", id: "a" + i, due: i, topic: "d1" });
  for (let i = 0; i < 6; i++) items.push({ kind: "card", id: "b" + i, due: 10 + i, topic: "d2" });
  const out = R.interleave(items);
  assert.strictEqual(out.length, 12);
  for (let i = 1; i < out.length; i++) assert.notStrictEqual(out[i].topic, out[i - 1].topic, "temat z rzędu na " + i);
});
test("queueFrom: cztery zaległe błędy z rzędu rozdzielone nowymi kartami i zadaniami (≤ 2 tego samego rodzaju)", function () {
  const R = global.ELM.reviews, FLg = global.ELM.fiszkiLogic, HM = global.ELM.fiszkiHarmonogram;
  const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();
  const st = FLg.sanitizeState(FLg.emptyState());
  st.settings.enabledDecks = ["d1", "d2"];
  const mist = [1, 2, 3, 4].map(function (i) { return { id: "u-mb-" + i, deck: "u-moje-bledy", type: "basic", front: "a", back: "b", tags: [] }; });
  st.userDecks.push({ id: "u-moje-bledy", title: "Moje błędy", system: "mistakes" });
  st.userCards = mist;
  mist.forEach(function (m, i) { st.cards[m.id] = Object.assign(HM.newCard(), { state: "review", interval: 3, due: new Date(2026, 10, 5 + i, 5).getTime(), reps: 2 }); });
  const cards = { d1: [1, 2, 3, 4, 5].map(function (i) { return { id: "d1-00" + i, deck: "d1" }; }), d2: [1, 2, 3, 4, 5].map(function (i) { return { id: "d2-00" + i, deck: "d2" }; }), "u-moje-bledy": mist };
  const ctx = { state: st, decks: [{ id: "d1", count: 5 }, { id: "d2", count: 5 }, { id: "u-moje-bledy", count: 4 }], weak: [],
    cardsOf: function (id) { return cards[id] || []; }, deckOf: function (id) { return /^u-mb/.test(id) ? "u-moje-bledy" : id.replace(/-\d{3}$/, ""); } };
  const q = R.queueFrom(ctx, NOW);
  assert.strictEqual(q.length, 14, "4 zaległe + 10 nowych");
  for (let i = 2; i < q.length; i++) assert.ok(!(q[i].kind === q[i - 1].kind && q[i].kind === q[i - 2].kind && q[i].kind === "mistake"), "trzeci błąd z rzędu na " + i);
  for (let i = 1; i < q.length; i++) assert.notStrictEqual(q[i].topic, q[i - 1].topic, "temat z rzędu na " + i);
  assert.strictEqual(q[0].id, "u-mb-1", "najstarsza zaległa nadal pierwsza");
  assert.strictEqual(R.summaryFrom(ctx, NOW).total, q.length);
});

test("interleave: losowe listy — gdy rozdzielenie tematów jest możliwe (żaden temat > połowy), nigdy ten sam temat z rzędu", function () {
  const R = global.ELM.reviews;
  let seed = 12345;
  const rnd = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let trial = 0; trial < 300; trial++) {
    const n = 2 + Math.floor(rnd() * 40), topics = 1 + Math.floor(rnd() * 4);
    const items = [];
    for (let i = 0; i < n; i++) items.push({ kind: ["card", "mistake", "exercise"][Math.floor(rnd() * 3)], id: "x" + i, due: i, topic: "t" + Math.floor(rnd() * topics) });
    const counts = {};
    items.forEach(function (it) { counts[it.topic] = (counts[it.topic] || 0) + 1; });
    const feasible = Object.keys(counts).every(function (t) { return counts[t] <= Math.ceil(n / 2); });
    const out = R.interleave(items);
    assert.strictEqual(out.length, n);
    if (!feasible) continue;
    for (let i = 1; i < out.length; i++) assert.notStrictEqual(out[i].topic, out[i - 1].topic, "próba " + trial + ", pozycja " + i);
  }
});

console.log("\nRozkład poprawnych liter w zestawach A–D (tools/rozklad-regula.js)");
test("rozklad-regula: ≤ 50% jednej litery i ≤ 2 z rzędu; dane w repozytorium spełniają regułę", function () {
  const R = require(path.join(__dirname, "rozklad-regula.js"));
  const mk = function (seq) { return { gaps: seq.split("").map(function (a, i) { return { n: i + 1, options: { A: "a", B: "b", C: "c", D: "d" }, answer: a }; }) }; };
  assert.strictEqual(R.check(mk("BDAADCCB")), null);
  assert.ok(/8 z 8/.test(R.check(mk("AAAAAAAA"))));
  assert.ok(/5 z 8/.test(R.check(mk("AABBBAAA")) || ""), "A5 z 8 przekracza 50%");
  assert.ok(/z rzędu/.test(R.check(mk("AAABCDBC"))));
  assert.strictEqual(R.check(mk("AA")), null, "za mało luk, by reguła miała sens");
  assert.strictEqual(R.check({ items: [] }), null);
  assert.deepStrictEqual(R.checkAll(), []);
});

console.log("\nKarty „Moje błędy”: pełny kontekst i podpowiedź zadania (poprawka po v8)");
require(path.join(__dirname, "..", "js", "mistake-task.js"));
(function () {
  const FLg = global.ELM.fiszkiLogic, MT = global.ELM.mistakeTask, HM = global.ELM.fiszkiHarmonogram;
  const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();
  const entry = function (id, over) { return Object.assign({ id: id, createdAt: "2026-11-01", context: "", myAnswer: "x", correct: "", rule: "reguła", source: "", category: "Use of English", itemId: "", ref: "", review: { stage: 1, due: "2026-11-12", mastered: false } }, over || {}); };
  const wf = entry("err-wf", { ref: "c1:uoe-p3-1:2", context: "Many teachers also welcome the _____ in time spent marking homework.\nSłowo bazowe: REDUCE", correct: "reduction" });
  const abcd = entry("err-abcd", { ref: "c1:uoe-p1-4:1", context: "Few people would have predicted that vinyl records would _____ a comeback.\nA – make, B – take, C – pull, D – reach", correct: "A – make" });
  const tr = entry("err-tr", { ref: "ex:a2-transf-1-03", context: "Wish for more time\nWISH\nI wish I ___ more time.", correct: "I wish I had more time." });
  const bracket = entry("err-br", { ref: "ex:a1-czasy-present-simple-1-05", context: "She ___ (go) to school every day.", correct: "goes" });
  const manual = entry("err-man", { context: "Jak powiedzieć: dawno temu?\nPodpowiedź: ago", correct: "a long time ago" });

  test("journalCard: słowotwórstwo — przód ma słowo bazowe obok luki (cały kontekst, luka w swojej linii)", function () {
    const c = FLg.journalCard(wf);
    assert.strictEqual(c.type, "cloze");
    assert.ok(/Many teachers also welcome the \{\{reduction\}\} in time/.test(c.text));
    assert.ok(/\nSłowo bazowe: REDUCE$/.test(c.text), "słowo bazowe w osobnej linii: " + JSON.stringify(c.text));
    const p = FLg.parseCloze(c.text);
    assert.ok(p.ok && p.answers[0] === "reduction" && /Słowo bazowe: REDUCE/.test(p.after));
  });
  test("journalCard: wybór A–D — opcje na przodzie, odpowiedź akceptowana jako „A – make”, „make” i „A”", function () {
    const c = FLg.journalCard(abcd);
    assert.strictEqual(c.type, "cloze");
    assert.ok(/A – make, B – take, C – pull, D – reach/.test(c.text));
    const p = FLg.parseCloze(c.text);
    assert.deepStrictEqual(p.answers, ["A – make", "make", "A"]);
    assert.ok(/^Few people would have predicted that vinyl records would \{\{/.test(c.text));
  });
  test("journalCard: transformacja — słowo kluczowe na przodzie, odpowiedź to sama luka (bez powtórzonej części zdania)", function () {
    const c = FLg.journalCard(tr);
    assert.strictEqual(c.type, "cloze");
    assert.ok(/^Wish for more time\nWISH\nI wish I \{\{had\}\} more time\.$/.test(c.text), JSON.stringify(c.text));
  });
  test("journalCard: czasownik w nawiasie zostaje w linii z luką", function () {
    const c = FLg.journalCard(bracket);
    assert.strictEqual(c.text, "She {{goes}} (go) to school every day.");
  });
  test("journalCard: wpis ręczny bez ref i bez luki — zwykła karta z całym kontekstem (podział na linie), tył = poprawna odpowiedź", function () {
    const c = FLg.journalCard(manual);
    assert.strictEqual(c.type, "basic");
    assert.strictEqual(c.front, "Jak powiedzieć: dawno temu?\nPodpowiedź: ago");
    assert.strictEqual(c.back, "a long time ago");
    assert.strictEqual(c.note, "reguła");
  });

  test("naprawa kart (journalCardsV2): stara karta z wpisu odzyskuje podpowiedź, stan powtórek bez zmian, druga naprawa nic nie zmienia", function () {
    const st = FLg.sanitizeState(FLg.emptyState());
    const entries = [wf, abcd, tr, bracket, manual];
    // stare karty: dokładnie to, co robił stary journalCard
    FLg.ensureMistakesDeck(st);
    entries.forEach(function (e) {
      const legacy = FLg.journalCardLegacy(e);
      st.userCards.push(Object.assign({ id: FLg.journalCardId(e), deck: "u-moje-bledy", createdAt: "2026-11-01T12:00:00.000Z", sourceItemId: FLg.journalSource(e) }, legacy));
      st.cards[FLg.journalCardId(e)] = FLg.journalCardState(e.review, NOW);
    });
    const before = JSON.parse(JSON.stringify(st.cards));
    assert.ok(!/Słowo bazowe/.test(st.userCards[0].text), "stara karta bez podpowiedzi");
    assert.strictEqual(FLg.repairJournalCards(st, entries), 3, "przebudowane: słowotwórstwo, wybór A–D, transformacja (nawias i wpis ręczny były kompletne)");
    assert.ok(/Słowo bazowe: REDUCE/.test(st.userCards[0].text));
    assert.ok(/A – make, B – take/.test(st.userCards[1].text));
    assert.ok(/WISH/.test(st.userCards[2].text));
    assert.ok(/Podpowiedź: ago/.test(st.userCards[4].front));
    assert.deepStrictEqual(st.cards, before, "stan powtórek (interwał, termin) bez zmian");
    assert.strictEqual(st.settings.journalCardsV2, true);
    const snap = JSON.stringify(st);
    assert.strictEqual(FLg.repairJournalCards(st, entries), 0);
    assert.strictEqual(JSON.stringify(st), snap, "druga naprawa nic nie zmienia");
    // eksport → import zachowuje znacznik i karty
    const round = FLg.sanitizeState(JSON.parse(JSON.stringify(st)));
    assert.strictEqual(round.settings.journalCardsV2, true);
    assert.deepStrictEqual(round.userCards.map(function (c) { return c.text || c.front; }), st.userCards.map(function (c) { return c.text || c.front; }));
  });
  test("naprawa kart: karta edytowana ręcznie przez użytkownika zostaje nietknięta", function () {
    const st = FLg.sanitizeState(FLg.emptyState());
    FLg.ensureMistakesDeck(st);
    const legacy = FLg.journalCardLegacy(wf);
    st.userCards.push(Object.assign({ id: FLg.journalCardId(wf), deck: "u-moje-bledy", sourceItemId: FLg.journalSource(wf) }, legacy, { note: "moja notatka" }));
    assert.strictEqual(FLg.repairJournalCards(st, [wf]), 0);
    assert.strictEqual(st.userCards[0].note, "moja notatka");
    assert.ok(!/Słowo bazowe/.test(st.userCards[0].text));
  });
  test("nowa migracja i nowy wpis budują karty w nowym formacie", function () {
    const st = FLg.sanitizeState(FLg.emptyState());
    FLg.migrateJournal(st, [wf, manual], NOW);
    assert.ok(/Słowo bazowe: REDUCE/.test(st.userCards[0].text));
    assert.strictEqual(FLg.repairJournalCards(st, [wf, manual]), 0, "nowe karty nie wymagają naprawy");
  });

  test("mistakeTask.parseRef / viewFor: wpis z ref do zadania → widok zadania, bez ref albo nieznany ref → karta", function () {
    assert.deepStrictEqual(MT.parseRef("ex:a1-czasy-present-simple-1-05"), { kind: "ex", itemId: "a1-czasy-present-simple-1-05" });
    assert.deepStrictEqual(MT.parseRef("c1:uoe-p1-4:3"), { kind: "set", prefix: "c1", setId: "uoe-p1-4", n: 3 });
    assert.deepStrictEqual(MT.parseRef("b2:b2-uoe-p1-1:8"), { kind: "set", prefix: "b2", setId: "b2-uoe-p1-1", n: 8 });
    assert.strictEqual(MT.parseRef("journal:err-1"), null);
    assert.strictEqual(MT.parseRef(""), null);
    assert.strictEqual(MT.viewFor(wf), "task");
    assert.strictEqual(MT.viewFor(tr), "task");
    assert.strictEqual(MT.viewFor(manual), "card");
    assert.strictEqual(MT.viewFor(entry("x", { ref: "coś-ręcznego" })), "card");
    assert.strictEqual(MT.viewFor(null), "card");
  });
  test("mistakeTask.singleExercise: cloze — tylko zdanie z tą luką, jej podpowiedź zostaje; transformacja — jedno zdanie", function () {
    const ex = { id: "s", type: "word-formation", maxScore: 8, instructions: "i", text: "First {{1}} sentence. Many teachers welcome the {{2}} in time and the {{3}} too. Last {{4}}.", gaps: [1, 2, 3, 4].map(function (n) { return { n: n, stem: "STEM" + n, accept: ["a" + n] }; }) };
    const one = MT.singleExercise(ex, 2);
    assert.strictEqual(one.text, "Many teachers welcome the {{2}} in time and the … too.");
    assert.strictEqual(one.gaps.length, 1);
    assert.strictEqual(one.gaps[0].stem, "STEM2");
    assert.strictEqual(one.maxScore, 1);
    assert.strictEqual(ex.gaps.length, 4, "oryginał bez zmian");
    assert.strictEqual(MT.singleExercise(ex, 9), null);
    const tex = { id: "t", type: "transformation", wordLimit: [2, 5], items: [{ n: 1, first: "a", keyword: "K1", parts: ["x"] }, { n: 2, first: "b", keyword: "K2", parts: ["y"] }] };
    const t2 = MT.singleExercise(tex, 2);
    assert.strictEqual(t2.items.length, 1);
    assert.strictEqual(t2.items[0].keyword, "K2");
    assert.deepStrictEqual(t2.wordLimit, [2, 5]);
  });
})();

test("mistakeTask: wyjaśnienie nie dubluje się (ta sama treść reguły i wyjaśnienia zadania = raz), widok dla zadań bez ref bez zmian", function () {
  const MT = global.ELM.mistakeTask;
  assert.ok(MT.sameText("A proven track record = osiągnięcia.", "  a proven  track record = osiągnięcia. "));
  assert.ok(!MT.sameText("inna reguła", "wyjaśnienie zadania"));
  assert.ok(!MT.sameText("", ""), "puste teksty nie są „takie same” (nic do ukrycia)");
  assert.strictEqual(MT.explanationOf({ type: "word-formation", gaps: [{ n: 2, explanation: "E1" }] }), "E1");
  assert.strictEqual(MT.explanationOf({ type: "transformation", items: [{ n: 1, explanation: "E2" }] }), "E2");
  assert.strictEqual(MT.explanationOf(null), "");
  assert.strictEqual(MT.viewFor({ context: "x", correct: "y" }), "card", "wpis bez ref: karta, mount nie jest wołany");
  assert.strictEqual(MT.viewFor({ ref: "ex:a1-x-1-01" }), "task");
});

console.log("\nFiszki: harmonogram i zapis (poprawka fix/fiszki-harmonogram)");
(function () {
  const FLg = global.ELM.fiszkiLogic, HM = global.ELM.fiszkiHarmonogram;
  const DAYMS = 86400000;
  const NOW = new Date(2026, 10, 10, 18, 0, 0).getTime();
  const rev = function (iv, due, reps) { return Object.assign(HM.newCard(), { state: "review", interval: iv, due: due, reps: reps == null ? 3 : reps }); };

  test("rozproszenie: interwały < 20 d zapisują się dokładnie tak, jak w podglądzie („Dobrze: 8 d” = 8 d, „Łatwe: 4 d” = 4 d)", function () {
    for (let iv = 1; iv <= 9; iv++) {
      ["hard", "good", "easy"].forEach(function (g) {
        const base = rev(iv, NOW, 3);
        const pv = HM.preview(base, NOW)[g];
        if (pv.card.interval >= 20) return; // od 20 d rozrzut ±5% jest zamierzony (osobny test)
        [0, 0.25, 0.5, 0.75, 1].forEach(function (r) {
          const real = HM.schedule(base, g, NOW, null, { fuzz: true, random: function () { return r; } });
          assert.strictEqual(real.due, pv.card.due, "iv " + iv + " " + g + " losowość " + r + ": " + real.interval + " d zamiast " + pv.card.interval + " d");
        });
      });
    }
    const graduating = HM.schedule(Object.assign(HM.newCard(), { state: "new" }), "easy", NOW, null, { fuzz: true, random: function () { return 0; } });
    assert.strictEqual(graduating.interval, 4, "nowa karta + Łatwe = 4 d, nie 3 d");
  });
  test("rozproszenie: od 20 d nadal ±5% (20 d → 19–21 d), losowość z zewnątrz", function () {
    const base = rev(8, NOW, 3); // Dobrze: 20 d
    const lo = HM.schedule(base, "good", NOW, null, { fuzz: true, random: function () { return 0; } }).interval;
    const hi = HM.schedule(base, "good", NOW, null, { fuzz: true, random: function () { return 1; } }).interval;
    assert.strictEqual(HM.schedule(base, "good", NOW).interval, 20);
    assert.deepStrictEqual([lo, hi], [19, 21]);
  });
  test("kilka dni nauki: Dobrze ×4 i Łatwe ×4 zwiększają interwał z każdą oceną (stan przeżywa zapis i odczyt)", function () {
    let t = NOW, st = {};
    const seq = [];
    ["good", "good", "good", "good", "good", "good"].forEach(function (g) {
      const base = st.state && st.state !== "new" ? st : HM.newCard();
      st = FLg.sanitizeState({ version: 1, cards: { "k-001": HM.schedule(base, g, t, null, { fuzz: true, random: function () { return 0.5; } }) } }).cards["k-001"];
      seq.push(st.state === "review" ? st.interval : 0);
      t = st.due;
    });
    assert.deepStrictEqual(seq, [0, 1, 3, 8, 20, 50]);
    let e = FLg.sanitizeState({ version: 1, cards: { "k-002": HM.schedule(HM.newCard(), "easy", NOW) } }).cards["k-002"];
    const ivs = [e.interval];
    for (let i = 0; i < 3; i++) { e = HM.schedule(e, "easy", e.due); ivs.push(e.interval); }
    assert.ok(ivs[1] > ivs[0] && ivs[2] > ivs[1] && ivs[3] > ivs[2], "Łatwe zwiększa interwał za każdym razem: " + ivs.join(","));
  });

  test("zapis z dwóch kart przeglądarki: nieaktualna karta nie cofa ocen (mergeStates)", function () {
    const stored = FLg.sanitizeState(FLg.emptyState());     // zapis po ocenie w karcie A
    stored.cards["kolokacje-001"] = rev(8, NOW + 8 * DAYMS, 2);
    stored.daily["2026-11-10"] = { new: 1, reviews: 3, again: 0, good: 3, answers: 4, minutes: 2 };
    const stale = FLg.sanitizeState(FLg.emptyState());      // pamięć karty B sprzed oceny (karta jeszcze nowa)
    stale.daily["2026-11-10"] = { new: 0, reviews: 1, again: 1, good: 0, answers: 1, minutes: 0 };
    assert.strictEqual(FLg.mergeStates(stale, stored), true);
    assert.strictEqual(stale.cards["kolokacje-001"].interval, 8, "ocena z karty A przejęta");
    assert.strictEqual(stale.daily["2026-11-10"].reviews, 3, "dzienny licznik: maksimum");
    assert.strictEqual(stale.daily["2026-11-10"].again, 1);
    // pamięć nowsza niż zapis: zostaje
    const fresh = FLg.sanitizeState(FLg.emptyState());
    fresh.cards["kolokacje-001"] = rev(20, NOW + 20 * DAYMS, 5);
    fresh.daily["2026-11-10"] = Object.assign({}, stored.daily["2026-11-10"]);
    assert.strictEqual(FLg.mergeStates(fresh, stored), false);
    assert.strictEqual(fresh.cards["kolokacje-001"].interval, 20);
    // karta bez powtórek (np. zawieszona nowa) w zapisie nie jest „nowsza” od braku stanu
    const s2 = FLg.sanitizeState(FLg.emptyState()); s2.cards["kolokacje-009"] = Object.assign(HM.newCard(), { suspended: true });
    const m2 = FLg.sanitizeState(FLg.emptyState());
    assert.strictEqual(FLg.mergeStates(m2, s2), false);
    assert.strictEqual(m2.cards["kolokacje-009"], undefined);
  });
  test("deckStats: „na dziś” i „na później” (po granicy dnia nauki 04:00)", function () {
    const cards = ["a", "b", "c", "d", "e"].map(function (x) { return { id: x }; });
    const state = {
      a: rev(3, NOW - 3600000),                                  // na dziś (zaległa)
      b: rev(8, NOW + 8 * DAYMS),                                // na później
      c: rev(1, new Date(2026, 10, 11, 2, 0, 0).getTime()),      // jutro 02:00 = jeszcze dzisiejszy dzień nauki
      d: rev(1, new Date(2026, 10, 11, 9, 0, 0).getTime())       // jutro 09:00 = na później
    };
    const s = FLg.deckStats(cards, state, NOW);
    assert.strictEqual(s.due, 2);
    assert.strictEqual(s.later, 2);
    assert.strictEqual(s.new, 1);
  });
  test("„Dodaj kolejne nowe karty” (extraNew) nie dotyka kart w powtórkach: kolejka nie zawiera nie-zaległych, stan bez zmian", function () {
    const cards = [1, 2, 3, 4, 5, 6, 7].map(function (i) { return { id: "k-00" + i, deck: "k" }; });
    const state = { "k-001": rev(8, NOW + 8 * DAYMS), "k-002": rev(3, NOW + 2 * DAYMS) };
    const before = JSON.stringify(state);
    const q = FLg.buildQueue({ cards: cards, state: state, now: NOW, settings: { newPerDay: 2, reviewsPerDay: 100 }, today: { new: 2 }, extraNew: 5 });
    assert.deepStrictEqual(q.review, [], "karty z terminem po dzisiejszym dniu nie wracają");
    assert.strictEqual(q.fresh.length, 5, "tylko nowe: 5 dodatkowych");
    assert.ok(q.fresh.every(function (id) { return !state[id]; }));
    assert.strictEqual(JSON.stringify(state), before, "buildQueue niczego nie zmienia");
  });
})();

console.log("\nWynik: " + passed + " ok, " + failures.length + " błędów");
if (failures.length) process.exit(1);
