/*
 * exercise-logic.js — czysta logika silnika zadań (bez DOM), testowana
 * w tools/testy.js. Specyfikacja: docs/rozbudowa-v2/spec/01-typy-zadan.md
 * i 02-laboratorium-czasow-i-mieszane.md (algorytm zestawów mieszanych).
 *
 *   normalize(str)                    porównywanie odpowiedzi (sekcja 4 spec 01)
 *   shuffle(list, rng)                tasowanie Fishera–Yatesa (kopia listy)
 *   prepareChoice(item, rng)          opcje multiple-choice w losowej kolejności
 *   reorderTokens(item, rng)          wyrazy do ułożenia (nigdy w poprawnej kolejności)
 *   evaluate(item, answer)            { correct, … } dla każdego typu zadania
 *   pickMix(pool, opts, rng)          losowanie zestawu mieszanego
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const TYPES = ["multiple-choice", "reorder", "find-error", "short-answer"];

  /** Przycięcie, jedna spacja, ’ → ', bez interpunkcji na końcu, małe litery. Skróty NIE są rozwijane. */
  function normalize(str) {
    return String(str == null ? "" : str)
      .replace(/[‘’ʼ]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.,!?;]+$/, "")
      .trim()
      .toLowerCase();
  }

  function shuffle(list, rng) {
    const out = list.slice();
    const r = rng || Math.random;
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /** Odległość edycyjna (do podpowiedzi „Uwaga na pisownię”). */
  function distance(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    let prev = [];
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  /**
   * Opcje w losowej kolejności (chyba że fixedOrder):
   * [{ text, note, original }], correct = nowy indeks poprawnej.
   */
  function prepareChoice(item, rng) {
    const opts = item.options.map(function (text, i) {
      return { text: text, note: item.optionNotes ? item.optionNotes[i] || null : null, original: i };
    });
    const order = item.fixedOrder ? opts : shuffle(opts, rng);
    return { options: order, correct: order.findIndex(function (o) { return o.original === item.correct; }) };
  }

  /** Wyrazy wzorcowego zdania bez końcowej interpunkcji (pierwszy małą literą, chyba że to „I”). */
  function answerTokens(sentence) {
    const words = String(sentence).trim().replace(/[.!?;]+$/, "").split(/\s+/).filter(Boolean);
    if (words.length && !/^I(\b|')/.test(words[0])) words[0] = words[0].charAt(0).toLowerCase() + words[0].slice(1);
    return words;
  }

  /**
   * Pula wyrazów do ułożenia: [{ id, text }] z answers[0] + extraTokens, przetasowana tak,
   * żeby NIE była od razu poprawnym zdaniem.
   */
  function reorderTokens(item, rng) {
    const words = answerTokens(item.answers[0]).concat(item.extraTokens || []);
    const tokens = words.map(function (text, i) { return { id: "t" + i, text: text }; });
    if (tokens.length < 2) return tokens;
    let out = shuffle(tokens, rng);
    for (let tries = 0; tries < 20 && isAccepted(item, out.map(function (t) { return t.text; })); tries++) out = shuffle(tokens, rng);
    if (isAccepted(item, out.map(function (t) { return t.text; }))) out.push(out.shift()); // ostatnia deska ratunku
    return out;
  }

  function isAccepted(item, words) {
    const s = normalize(words.join(" "));
    return item.answers.some(function (a) { return normalize(a) === s; });
  }

  /** Indeks pierwszego wyrazu ułożenia, który różni się od wzorca (albo -1). */
  function firstDifference(item, words) {
    const model = answerTokens(item.answers[0]).map(normalize);
    const got = words.map(normalize);
    for (let i = 0; i < Math.max(model.length, got.length); i++) {
      if (model[i] !== got[i]) return i;
    }
    return -1;
  }

  /**
   * Ocena odpowiedzi. answer zależy od typu:
   *   multiple-choice: { chosen: indeks w ORYGINALNYCH options }
   *   reorder:         { words: [tekst…] }
   *   find-error:      { noError: true } albo { range: [od, do], fix: "…" }
   *   short-answer:    { text: "…" }
   */
  function evaluate(item, answer) {
    answer = answer || {};
    if (item.type === "multiple-choice") {
      return { correct: answer.chosen === item.correct, answered: Number.isInteger(answer.chosen) };
    }
    if (item.type === "reorder") {
      const words = answer.words || [];
      const ok = words.length > 0 && isAccepted(item, words);
      return { correct: ok, answered: words.length > 0, diffAt: ok ? -1 : firstDifference(item, words) };
    }
    if (item.type === "find-error") {
      if (answer.noError) return { correct: !!item.noError, answered: true, rangeOk: !!item.noError, fixOk: !!item.noError };
      const r = answer.range;
      if (!r) return { correct: false, answered: false, rangeOk: false, fixOk: false };
      if (item.noError) return { correct: false, answered: true, rangeOk: false, fixOk: false };
      const rangeOk = r[0] === item.errorRange[0] && r[1] === item.errorRange[1];
      const fix = normalize(answer.fix);
      const fixOk = item.fixes.some(function (f) { return normalize(f) === fix; });
      return { correct: rangeOk && fixOk, answered: true, rangeOk: rangeOk, fixOk: fixOk };
    }
    if (item.type === "short-answer") {
      const text = normalize(answer.text);
      const ok = text !== "" && item.accepted.some(function (a) { return normalize(a) === text; });
      const close = !ok && text !== "" && item.accepted.some(function (a) { return distance(normalize(a), text) === 1; });
      return { correct: ok, answered: text !== "", spelling: close };
    }
    return { correct: false, answered: false };
  }

  /**
   * Zestaw mieszany (spec 02, B.3).
   * pool: zadania (z polem topic); opts: { count, exclude: [id…], types: [typ…] }.
   * 1. filtr typów, 2. wykluczenie ostatniej sesji (gdy starcza puli),
   * 3. round-robin po tematach (w temacie losowo), 4. kolejność: najwyżej 2 zadania tego samego typu pod rząd.
   * Zwraca { items, requested, available }.
   */
  function pickMix(pool, opts, rng) {
    opts = opts || {};
    const r = rng || Math.random;
    let items = pool.filter(function (it) { return !opts.types || !opts.types.length || opts.types.indexOf(it.type) !== -1; });
    const available = items.length;
    const count = Math.min(opts.count || 10, available);
    const exclude = new Set(opts.exclude || []);
    const fresh = items.filter(function (it) { return !exclude.has(it.id); });
    if (fresh.length >= count) items = fresh;

    const byTopic = {};
    const topicOrder = [];
    shuffle(items, r).forEach(function (it) {
      const t = it.topic || "";
      if (!byTopic[t]) { byTopic[t] = []; topicOrder.push(t); }
      byTopic[t].push(it);
    });
    const picked = [];
    let round = 0;
    while (picked.length < count) {
      let any = false;
      topicOrder.forEach(function (t) {
        if (picked.length < count && byTopic[t][round]) { picked.push(byTopic[t][round]); any = true; }
      });
      if (!any) break;
      round++;
    }
    return { items: limitRuns(shuffle(picked, r), 2), requested: opts.count || 10, available: available };
  }

  /** Przestawia zadania tak, żeby ten sam typ nie wystąpił więcej niż max razy pod rząd (gdy się da). */
  function limitRuns(list, max) {
    const out = list.slice();
    for (let i = max; i < out.length; i++) {
      let run = true;
      for (let k = 1; k <= max; k++) if (out[i - k].type !== out[i].type) run = false;
      if (!run) continue;
      const j = out.findIndex(function (x, idx) { return idx > i && x.type !== out[i].type; });
      if (j === -1) break;
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  ELM.exLogic = {
    TYPES: TYPES,
    normalize: normalize,
    shuffle: shuffle,
    distance: distance,
    prepareChoice: prepareChoice,
    answerTokens: answerTokens,
    reorderTokens: reorderTokens,
    firstDifference: firstDifference,
    evaluate: evaluate,
    pickMix: pickMix,
    limitRuns: limitRuns
  };
})(window.ELM);
