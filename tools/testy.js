/*
 * testy.js — testy jednostkowe czystej logiki nauki (js/learning.js):
 * harmonogram powtórek, seria nauki i algorytm testu poziomu.
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
const L = global.ELM.learn;

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

console.log("\nWynik: " + passed + " ok, " + failures.length + " błędów");
if (failures.length) process.exit(1);
