/*
 * fiszki-harmonogram.js — harmonogram powtórek fiszek (spec 10, sekcja 3; wzorowany na SM-2).
 * Czysta logika: bez DOM i localStorage (testy: node tools/testy.js, wektory
 * dane/fiszki/scheduler-vectors.json, referencja scripts/scheduler_ref.py).
 *
 *   ELM.fiszkiHarmonogram.schedule(card, grade, now, config?, opts?) → nowa karta (wejście bez zmian)
 *     card   { state: new|learning|review|relearning, step, ease, interval (d), pendingInterval (d),
 *              lapses, reps, due (ms) }
 *     grade  "again" | "hard" | "good" | "easy" albo 1–4
 *     now    znacznik czasu w ms
 *     opts   { fuzz: true, random: () => [0, 1) } — rozproszenie ±5% nowych interwałów ≥ 3 d
 *            (domyślnie wyłączone; losowość wstrzykiwana z zewnątrz)
 *   newCard(config?)                       karta w stanie „new”
 *   preview(card, now, config?)            { again, hard, good, easy: { card, delay (ms) } } — podgląd ocen
 *   formatDelay(ms)                        „1 min”, „10 min”, „1 d”, „3 d”, „2 mies.”, „1,2 r.”
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const MIN = 60000;
  const DAY = 86400000;

  const DEFAULT_CONFIG = Object.freeze({
    learningSteps: [1, 10], relearnSteps: [10], graduatingInterval: 1, easyInterval: 4,
    startEase: 2.5, minEase: 1.3, maxEase: 2.8, hardMultiplier: 1.2, easyBonus: 1.3,
    lapseMultiplier: 0.5, maxInterval: 365
  });

  const GRADES = { 1: "again", 2: "hard", 3: "good", 4: "easy" };
  const GRADE_NAMES = ["again", "hard", "good", "easy"];

  function cfgOf(config) { return Object.assign({}, DEFAULT_CONFIG, config || {}); }

  function newCard(config) {
    const c = cfgOf(config);
    return { state: "new", step: 0, ease: c.startEase, interval: 0, pendingInterval: 0, lapses: 0, reps: 0, due: 0 };
  }

  /** ease do 0,01 (jak w referencji). */
  function r2(x) { return Math.round(x * 100) / 100; }

  function gradeName(grade) {
    const g = typeof grade === "number" ? GRADES[grade] : grade;
    if (GRADE_NAMES.indexOf(g) === -1) throw new Error("Nieznana ocena: " + grade);
    return g;
  }

  /** Rozproszenie ±5% dla interwałów ≥ 3 d (zaokrąglone, co najmniej 1 d różnicy nie wymuszamy). */
  function fuzzed(days, opts) {
    if (!opts || !opts.fuzz || typeof opts.random !== "function" || days < 3) return days;
    const delta = Math.max(1, Math.round(days * 0.05));
    return Math.max(1, days + Math.round((opts.random() * 2 - 1) * delta));
  }

  function schedule(card, grade, now, config, opts) {
    const cfg = cfgOf(config);
    const g = gradeName(grade);
    const c = Object.assign({}, card);
    c.reps = (c.reps || 0) + 1;
    const ls = cfg.learningSteps, rs = cfg.relearnSteps;
    const cap = function (v) { return Math.min(cfg.maxInterval, v); };
    // Nowy interwał w powtórkach (z opcjonalnym rozproszeniem, zawsze w limicie)
    const toReview = function (days) {
      const d = cap(fuzzed(days, opts));
      c.state = "review"; c.interval = d; c.step = 0; c.due = now + d * DAY;
    };

    if (c.state === "new" || c.state === "learning") {
      if (c.state === "new") { c.state = "learning"; c.step = 0; }
      if (g === "again") { c.step = 0; c.due = now + ls[0] * MIN; }
      else if (g === "hard") { c.due = now + ls[c.step] * MIN; }
      else if (g === "good") {
        if (c.step + 1 < ls.length) { c.step += 1; c.due = now + ls[c.step] * MIN; }
        else toReview(cfg.graduatingInterval);
      } else toReview(cfg.easyInterval);
    } else if (c.state === "review") {
      const iv = c.interval, e = c.ease;
      if (g === "again") {
        c.lapses = (c.lapses || 0) + 1;
        c.ease = r2(Math.max(cfg.minEase, e - 0.2));
        c.pendingInterval = Math.max(1, Math.round(iv * cfg.lapseMultiplier));
        c.state = "relearning"; c.step = 0; c.due = now + rs[0] * MIN;
      } else {
        const hardI = Math.max(iv + 1, Math.round(iv * cfg.hardMultiplier));
        const goodI = Math.max(hardI + 1, Math.round(iv * e));
        const easyI = Math.max(goodI + 1, Math.round(iv * e * cfg.easyBonus));
        let next;
        if (g === "hard") { c.ease = r2(Math.max(cfg.minEase, e - 0.15)); next = hardI; }
        else if (g === "good") next = goodI;
        else { c.ease = r2(Math.min(cfg.maxEase, e + 0.15)); next = easyI; }
        toReview(next);
      }
    } else { // relearning
      if (g === "again") { c.step = 0; c.due = now + rs[0] * MIN; }
      else if (g === "hard") { c.due = now + rs[c.step] * MIN; }
      else if (g === "good") {
        if (c.step + 1 < rs.length) { c.step += 1; c.due = now + rs[c.step] * MIN; }
        else toReview(c.pendingInterval);
      } else toReview(c.pendingInterval + 1);
    }
    return c;
  }

  /** Podgląd czterech ocen: nowa karta i odstęp do następnej powtórki (bez rozproszenia). */
  function preview(card, now, config) {
    const out = {};
    GRADE_NAMES.forEach(function (g) {
      const next = schedule(card, g, now, config);
      out[g] = { card: next, delay: next.due - now };
    });
    return out;
  }

  /** Odstęp czytelny dla człowieka: minuty, dni, miesiące, lata (polskie skróty). */
  function formatDelay(ms) {
    const min = Math.round(ms / MIN);
    if (min < 60) return Math.max(1, min) + " min";
    if (ms < DAY) return Math.round(ms / 3600000) + " godz.";
    const days = Math.round(ms / DAY);
    if (days < 31) return days + " d";
    if (days < 365) return (Math.round(days / 30.4 * 10) / 10).toString().replace(".", ",") + " mies.";
    return (Math.round(days / 365 * 10) / 10).toString().replace(".", ",") + " r.";
  }

  ELM.fiszkiHarmonogram = {
    MIN: MIN, DAY: DAY, DEFAULT_CONFIG: DEFAULT_CONFIG, GRADES: GRADE_NAMES,
    newCard: newCard, schedule: schedule, preview: preview, formatDelay: formatDelay
  };
})(window.ELM);
