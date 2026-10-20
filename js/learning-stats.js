/*
 * learning-stats.js — czysta logika dziennika podejść, statystyk i automatycznych
 * powtórek (bez DOM i bez localStorage; testy w tools/testy.js).
 * Specyfikacja: docs/rozbudowa-v2/spec/03-powtorki-i-statystyki.md.
 *
 * Rekord podejść profilu: { items: [podejście…], aggregates: { <itemId>: { n, ok, topic, type, level } } }
 * Podejście: { t, day, itemId, setId, topic, level, type, tags, correct, mode, answer }
 *
 * Dzień „dziś” i bieżący czas przekazujemy jako argumenty (łatwe testy):
 * ELM.learn.today() wywołuje tylko kod widoku.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const MAX_ATTEMPTS = 3000;
  const MIN_SAMPLE = 5;          // poniżej: „za mało danych”, bez procentu jako oceny
  const DAILY_AUTO_LIMIT = 30;   // automatyczne wpisy dziennika na dzień
  const UMIEM_THRESHOLD = 0.8;   // dwa ostatnie podejścia do zestawu ≥ 80%
  const UMIEM_SNOOZE_DAYS = 14;  // po „Nie teraz” nie pytamy przez 14 dni

  function learn() { return ELM.learn; }

  // =====================================================================
  // BUFOR KOŁOWY I KOMPAKTOWANIE
  // =====================================================================

  /** Dopisuje podejście; po przekroczeniu limitu najstarsze trafiają do agregatów (statystyki długoterminowe zostają). */
  function pushAttempt(rec, attempt, max) {
    rec.items.push(attempt);
    const over = rec.items.length - (max || MAX_ATTEMPTS);
    if (over > 0) rec.items.splice(0, over).forEach(function (old) { compact(rec.aggregates, old); });
    return rec;
  }

  function compact(agg, a) {
    const g = agg[a.itemId] || (agg[a.itemId] = { n: 0, ok: 0, topic: a.topic || null, type: a.type || null, level: a.level || null });
    g.n++;
    if (a.correct) g.ok++;
  }

  /** Wszystkie dane jako wiersze { itemId, topic, type, level, n, ok } (podejścia + agregaty). */
  function rows(rec) {
    const out = [];
    Object.keys(rec.aggregates || {}).forEach(function (id) {
      const g = rec.aggregates[id];
      out.push({ itemId: id, topic: g.topic, type: g.type, level: g.level, n: g.n, ok: g.ok });
    });
    (rec.items || []).forEach(function (a) {
      out.push({ itemId: a.itemId, topic: a.topic, type: a.type, level: a.level, n: 1, ok: a.correct ? 1 : 0 });
    });
    return out;
  }

  // =====================================================================
  // AGREGACJA
  // =====================================================================

  /** { klucz: { n, ok } } według pola (topic | type | level | itemId). */
  function aggregate(rec, field) {
    const out = {};
    rows(rec).forEach(function (r) {
      const k = r[field];
      if (!k) return;
      const g = out[k] || (out[k] = { n: 0, ok: 0 });
      g.n += r.n;
      g.ok += r.ok;
    });
    return out;
  }

  /** Trafność 0–1 albo null przy małej próbce (< min). */
  function accuracy(g, min) {
    if (!g || g.n < (min === undefined ? MIN_SAMPLE : min)) return null;
    return g.ok / g.n;
  }

  /** Lista posortowana od najsłabszych: [{ key, n, ok, acc }] tylko z próbką ≥ min. */
  function ranked(rec, field, min) {
    const agg = aggregate(rec, field);
    return Object.keys(agg).map(function (k) { return { key: k, n: agg[k].n, ok: agg[k].ok, acc: accuracy(agg[k], min) }; })
      .filter(function (x) { return x.acc !== null; })
      .sort(function (a, b) { return a.acc - b.acc || b.n - a.n || (a.key < b.key ? -1 : 1); });
  }

  /** Tematy do treningu słabych punktów: ≥ 5 prób, trafność < 70%, do 3 najsłabszych. */
  function weakTopics(rec, opts) {
    opts = opts || {};
    const maxAcc = opts.maxAcc === undefined ? 0.7 : opts.maxAcc;
    return ranked(rec, "topic", opts.minN || MIN_SAMPLE).filter(function (x) { return x.acc < maxAcc; }).slice(0, opts.limit || 3);
  }

  /** Podsumowanie: odpowiedzi 7 / 30 dni / łącznie, trafność ogółem i z 7 dni. */
  function summary(rec, today) {
    const d7 = learn().addDays(today, -6), d30 = learn().addDays(today, -29);
    let n7 = 0, ok7 = 0, n30 = 0, n = 0, ok = 0;
    rows(rec).forEach(function (r) { n += r.n; ok += r.ok; });
    (rec.items || []).forEach(function (a) {
      if (a.day >= d7 && a.day <= today) { n7++; if (a.correct) ok7++; }
      if (a.day >= d30 && a.day <= today) n30++;
    });
    return { n7: n7, n30: n30, n: n, acc: accuracy({ n: n, ok: ok }), acc7: accuracy({ n: n7, ok: ok7 }) };
  }

  /** Poniedziałek tygodnia zawierającego dzień. */
  function weekStart(day) {
    const d = new Date(day + "T12:00:00");
    const dow = (d.getDay() + 6) % 7; // 0 = poniedziałek
    return learn().addDays(day, -dow);
  }

  /** Trafność tygodniowa z ostatnich `weeks` tygodni (od najstarszego): [{ start, n, ok, acc }]. */
  function weekly(rec, today, weeks) {
    weeks = weeks || 12;
    const first = learn().addDays(weekStart(today), -7 * (weeks - 1));
    const out = [];
    for (let i = 0; i < weeks; i++) out.push({ start: learn().addDays(first, 7 * i), n: 0, ok: 0 });
    (rec.items || []).forEach(function (a) {
      if (a.day < first || a.day > today) return;
      const i = Math.floor(learn().diffDays(first, a.day) / 7);
      if (out[i]) { out[i].n++; if (a.correct) out[i].ok++; }
    });
    out.forEach(function (w) { w.acc = accuracy(w); });
    return out;
  }

  /** Mapa aktywności: `weeks` kolumn × 7 dni (pon–niedz), od najstarszej. */
  function activityGrid(days, today, weeks) {
    weeks = weeks || 12;
    const set = new Set(days || []);
    const first = learn().addDays(weekStart(today), -7 * (weeks - 1));
    const out = [];
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const day = learn().addDays(first, w * 7 + d);
        col.push({ day: day, active: set.has(day), future: day > today });
      }
      out.push(col);
    }
    return out;
  }

  // =====================================================================
  // WAGI LOSOWANIA
  // =====================================================================

  /** Generator mieszany (spec 02, B.3 pkt 5): trafność < 60% → 2, nigdy niewidziane → 1,5, pozostałe → 1. */
  function mixWeight(rec) {
    const agg = aggregate(rec, "itemId");
    return function (item) {
      const g = agg[item.id];
      if (!g || !g.n) return 1.5;
      return g.ok / g.n < 0.6 ? 2 : 1;
    };
  }

  /** Trening słabych punktów (spec 03, pkt 5): bez poprawnej odpowiedzi w ostatnich 14 dniach → 2, pozostałe → 1. */
  function weakWeight(rec, today, days) {
    const since = learn().addDays(today, -((days || 14) - 1));
    const solved = new Set();
    (rec.items || []).forEach(function (a) { if (a.correct && a.day >= since) solved.add(a.itemId); });
    return function (item) { return solved.has(item.id) ? 1 : 2; };
  }

  // =====================================================================
  // SUGESTIA „UMIEM”
  // =====================================================================

  /**
   * recent: wyniki zestawu od najstarszego [ułamek 0–1]; opts: { isUmiem, dismissedDay, today }.
   * Dwa ostatnie ≥ 80%, punkt nie jest „Umiem”, brak odmowy w ostatnich 14 dniach.
   */
  function suggestUmiem(recent, opts) {
    if (!recent || recent.length < 2 || opts.isUmiem) return false;
    const last = recent.slice(-2);
    if (!last.every(function (r) { return r >= UMIEM_THRESHOLD; })) return false;
    if (opts.dismissedDay && learn().diffDays(opts.dismissedDay, opts.today) < UMIEM_SNOOZE_DAYS) return false;
    return true;
  }

  // =====================================================================
  // AUTOMATYCZNY DZIENNIK BŁĘDÓW
  // =====================================================================

  /**
   * Co zrobić po BŁĘDNEJ odpowiedzi. entry — istniejący wpis z tego zadania albo null.
   * ctx: { today, autoToday (liczba automatycznych wpisów dziś), limit }.
   *   create  — nowy wpis,
   *   update  — wpis aktywny: bez duplikatu; etap > 0 → cofnięcie do etapu 1 (powtórka jutro),
   *   reopen  — wpis opanowany: wznowienie od etapu 1, oznaczenie „wrócił”,
   *   limit   — dziennik pełny na dziś (błąd zostaje tylko w podejściach).
   */
  function planWrong(entry, ctx) {
    if (entry) {
      if (entry.review.mastered) return { action: "reopen", review: learn().newReview(ctx.today) };
      return { action: "update", review: entry.review.stage > 0 ? learn().newReview(ctx.today) : entry.review };
    }
    if (ctx.autoToday >= (ctx.limit || DAILY_AUTO_LIMIT)) return { action: "limit" };
    return { action: "create" };
  }

  /** Po POPRAWNEJ odpowiedzi: aktywny wpis z powtórką na dziś lub zaległą → zaliczenie jak „Wiedziałem(am)”. */
  function planCorrect(entry, today) {
    if (!entry || entry.review.mastered || !learn().isDue(entry.review, today)) return null;
    return { action: "review", review: learn().reviewKnown(entry.review, today) };
  }

  ELM.stats = {
    MAX_ATTEMPTS: MAX_ATTEMPTS,
    MIN_SAMPLE: MIN_SAMPLE,
    DAILY_AUTO_LIMIT: DAILY_AUTO_LIMIT,
    pushAttempt: pushAttempt,
    rows: rows,
    aggregate: aggregate,
    accuracy: accuracy,
    ranked: ranked,
    weakTopics: weakTopics,
    summary: summary,
    weekStart: weekStart,
    weekly: weekly,
    activityGrid: activityGrid,
    mixWeight: mixWeight,
    weakWeight: weakWeight,
    suggestUmiem: suggestUmiem,
    planWrong: planWrong,
    planCorrect: planCorrect
  };
})(window.ELM);
