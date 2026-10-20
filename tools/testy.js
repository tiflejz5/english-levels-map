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

console.log("\nWynik: " + passed + " ok, " + failures.length + " błędów");
if (failures.length) process.exit(1);
