/*
 * szlak-logic.js — czysta logika Szlaku (spec v7 13): bez DOM i localStorage (testy: node tools/testy.js).
 *
 *   emptyState(), sanitizeState(raw)     stan profilu elm.<id>.szlak { version, start, stops, reviews }; zły format → wyjątek
 *   statusOf(stop, state, env)           { status: "done" | "skipped" | "open", via }  (sekcja 3.1)
 *   buildTrail(data, state, env)         cały szlak z kolejnością, statusami, krainami przed startem jako „pominięte”
 *   currentStop(trail)                   pierwszy niezaliczony przystanek od punktu startu albo null
 *   levelProgress(trail, level)          { done, total, percent } — postęp krainy = zaliczone przystanki / wszystkie
 *   unitProgress(trail, unitId)          { done, total, index, count } dla odcinka
 *   pickReview(review, src, rng)         { source: "quiz" | "set" | "final" | null, items } — losowanie powtórki z fallbackami (3.4)
 *   effectiveStart(state, testLevel)     punkt startu: ręczny > test poziomu > domyślny A1 (3.2)
 *   quizAverage(state)                   średni wynik quizów w % (Statystyki)
 *
 *   env = { isUmiem(itemId) → bool, setPercent(setId) → liczba 0–100 albo null }
 *   src = { quizItems(stopId) → [zadanie], setItems(setId) → [zadanie], finalItems(level) → [zadanie], stops: {id: przystanek} }
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const VERSION = 1;
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const PASS_QUIZ = 3;      // z 4 pytań
  const PASS_SET_PERCENT = 80;
  const VIA = ["quiz", "umiem", "skip", "set"];
  const SOURCES = ["test", "manual", "default"];
  const ID = /^[a-z0-9][a-z0-9-]{0,80}$/;

  function emptyState() { return { version: VERSION, start: null, stops: {}, reviews: {} }; }

  function isoOrEmpty(v) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 30) : ""; }
  function int(v, min, max) { return typeof v === "number" && isFinite(v) && v >= min && v <= max ? Math.floor(v) : null; }

  /** Stan z localStorage albo importu → poprawny stan; zły format lub nieznana wersja → wyjątek. */
  function sanitizeState(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Nieprawidłowy format danych Szlaku.");
    if (raw.version !== VERSION) throw new Error("Nieobsługiwana wersja danych Szlaku (" + raw.version + ").");
    const out = emptyState();
    const s = raw.start;
    if (s && typeof s === "object" && LEVELS.indexOf(s.level) !== -1) {
      out.start = { level: s.level, source: SOURCES.indexOf(s.source) !== -1 ? s.source : "manual", at: isoOrEmpty(s.at) };
    }
    const stops = raw.stops && typeof raw.stops === "object" && !Array.isArray(raw.stops) ? raw.stops : {};
    Object.keys(stops).slice(0, 1000).forEach(function (id) {
      const x = stops[id];
      if (!ID.test(id) || !x || typeof x !== "object") return;
      const via = VIA.indexOf(x.via) !== -1 ? x.via : null;
      if (!via) return;
      const rec = { done: via !== "skip" && x.done === true, via: via, at: isoOrEmpty(x.at) };
      const best = int(x.best, 0, 10);
      if (best !== null) rec.best = best;
      out.stops[id] = rec;
    });
    const reviews = raw.reviews && typeof raw.reviews === "object" && !Array.isArray(raw.reviews) ? raw.reviews : {};
    Object.keys(reviews).slice(0, 200).forEach(function (id) {
      const x = reviews[id];
      if (!ID.test(id) || !x || typeof x !== "object") return;
      const of = int(x.of, 1, 20), best = int(x.best, 0, 20);
      if (of === null || best === null || best > of) return;
      out.reviews[id] = { best: best, of: of, at: isoOrEmpty(x.at) };
    });
    return out;
  }

  /** Przystanek (lekcja) → zaliczony / pominięty / otwarty (sekcja 3.1). Powtórki: zaliczona po podejściu, wynik nie blokuje. */
  function statusOf(stop, state, env) {
    if (stop.type === "review") return state.reviews[stop.id] ? { status: "done", via: "review" } : { status: "open", via: null };
    const rec = state.stops[stop.id];
    if (rec && rec.via === "quiz" && typeof rec.best === "number" && rec.best >= PASS_QUIZ) return { status: "done", via: "quiz" };
    if (stop.items && stop.items.length && stop.items.every(function (id) { return env.isUmiem(id); })) return { status: "done", via: "umiem" };
    if (!stop.quiz && stop.set) {
      const p = env.setPercent(stop.set);
      if (typeof p === "number" && p >= PASS_SET_PERCENT) return { status: "done", via: "set" };
    }
    if (rec && rec.via === "skip") return { status: "skipped", via: "skip" };
    return { status: "open", via: null };
  }

  function levelIndex(level) { return LEVELS.indexOf(level); }

  /**
   * Szlak jako płaska lista węzłów z kolejnością i statusami. Krainy przed punktem startu: niezaliczone przystanki
   * dostają „skipped” (via „start”). Zwraca { nodes, startIndex, current }.
   */
  function buildTrail(data, state, env, startLevel) {
    const start = levelIndex(startLevel || (state.start && state.start.level) || "A1");
    const nodes = [];
    let lesson = 0;
    data.levels.forEach(function (lv) {
      const li = levelIndex(lv.level); // numer poziomu A1…C2 (dane testowe mogą nie mieć wszystkich)
      let inLevel = 0;
      const total = lv.units.reduce(function (a, u) { return a + u.stops.filter(function (s) { return s.type === "lesson"; }).length; }, 0);
      lv.units.forEach(function (u, ui) {
        let inUnit = 0;
        const unitTotal = u.stops.filter(function (s) { return s.type === "lesson"; }).length;
        u.stops.forEach(function (stop) {
          const st = statusOf(stop, state, env);
          let status = st.status, via = st.via;
          if (li < start && status === "open") { status = "skipped"; via = "start"; }
          const isLesson = stop.type === "lesson";
          if (isLesson) { inLevel++; inUnit++; lesson++; }
          nodes.push({
            id: stop.id, stop: stop, type: stop.type, status: status, via: via, level: lv.level, levelIndex: li, land: lv.land,
            unitId: u.id, unitIndex: ui, unitTitle: u.title, unitCount: lv.units.length,
            number: isLesson ? inLevel : null, levelTotal: total, inUnit: isLesson ? inUnit : null, unitTotal: unitTotal, global: isLesson ? lesson : null
          });
        });
      });
    });
    const current = nodes.find(function (n) { return n.type === "lesson" && n.status === "open" && n.levelIndex >= start; }) || null;
    nodes.forEach(function (n) { n.current = n === current; });
    return { nodes: nodes, startIndex: start, current: current };
  }

  function currentStop(trail) { return trail.current; }

  /** Postęp krainy: zaliczone przystanki / wszystkie (powtórki nie wchodzą do licznika). */
  function levelProgress(trail, level) {
    const lessons = trail.nodes.filter(function (n) { return n.type === "lesson" && n.level === level; });
    const done = lessons.filter(function (n) { return n.status === "done"; }).length;
    return { done: done, total: lessons.length, percent: lessons.length ? Math.round(100 * done / lessons.length) : 0 };
  }

  function unitProgress(trail, unitId) {
    const lessons = trail.nodes.filter(function (n) { return n.type === "lesson" && n.unitId === unitId; });
    const done = lessons.filter(function (n) { return n.status === "done"; }).length;
    const first = lessons[0];
    return { done: done, total: lessons.length, index: first ? first.unitIndex + 1 : 0, count: first ? first.unitCount : 0, title: first ? first.unitTitle : "" };
  }

  function shuffle(list, rng) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /** Po jednym pytaniu z każdego przystanku po kolei (round-robin), aż do `size`; z mieszaniem wewnątrz przystanków. */
  function spread(groups, size, rng) {
    const queues = groups.map(function (g) { return shuffle(g, rng); }).filter(function (g) { return g.length; });
    const out = [];
    let i = 0;
    while (out.length < size && queues.some(function (q) { return q.length; })) {
      const q = queues[i % queues.length];
      if (q.length) out.push(q.shift());
      i++;
    }
    return shuffle(out, rng);
  }

  /**
   * Powtórka (węzeł „review”): losuje `size` pytań z quizów przystanków `from`; gdy ich nie mają, z zestawów `set`;
   * gdy i tego brak, z pytań testu końcowego poziomu; bez źródeł → { source: null, items: [] } (węzeł jest pomijany).
   */
  function pickReview(review, src, rng) {
    rng = rng || Math.random;
    const size = review.size || 6;
    const from = review.from || [];
    const quiz = from.map(function (id) { return src.quizItems(id) || []; });
    if (quiz.some(function (g) { return g.length; })) return { source: "quiz", items: spread(quiz, size, rng) };
    const sets = from.map(function (id) { const s = src.stops[id]; return s && s.set ? (src.setItems(s.set) || []) : []; });
    if (sets.some(function (g) { return g.length; })) return { source: "set", items: spread(sets, size, rng) };
    const level = review.level || (from[0] && /^([a-c]\d)-/.exec(from[0]) ? /^([a-c]\d)-/.exec(from[0])[1].toUpperCase() : null);
    const fin = level ? (src.finalItems(level) || []) : [];
    if (fin.length) return { source: "final", items: shuffle(fin, rng).slice(0, size) };
    return { source: null, items: [] };
  }

  /** Punkt startu: wybrany ręcznie albo z testu poziomu (zapisany), inaczej z ostatniego testu, inaczej A1. */
  function effectiveStart(state, testLevel) {
    if (state && state.start && state.start.source !== "default") return state.start;
    if (testLevel && LEVELS.indexOf(testLevel) !== -1) return { level: testLevel, source: "test", at: "" };
    return (state && state.start) || { level: "A1", source: "default", at: "" };
  }

  /** Średni wynik quizów zaliczonych i niezaliczonych (najlepsze podejścia) w %, albo null. */
  function quizAverage(state, quizSize) {
    const size = quizSize || 4;
    const vals = Object.keys(state.stops).map(function (id) { const r = state.stops[id]; return r.via === "quiz" && typeof r.best === "number" ? r.best : null; })
      .filter(function (v) { return v !== null; });
    if (!vals.length) return null;
    return Math.round(100 * vals.reduce(function (a, b) { return a + b; }, 0) / (vals.length * size));
  }

  ELM.szlakLogic = {
    VERSION: VERSION, LEVELS: LEVELS, PASS_QUIZ: PASS_QUIZ, PASS_SET_PERCENT: PASS_SET_PERCENT,
    emptyState: emptyState, sanitizeState: sanitizeState, statusOf: statusOf, buildTrail: buildTrail, currentStop: currentStop,
    levelProgress: levelProgress, unitProgress: unitProgress, pickReview: pickReview, effectiveStart: effectiveStart, quizAverage: quizAverage
  };
})(window.ELM);
