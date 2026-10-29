/*
 * exercise-logic.js — czysta logika silnika zadań (bez DOM), testowana
 * w tools/testy.js. Specyfikacja: docs/rozbudowa-v2/spec/01-typy-zadan.md
 * i 02-laboratorium-czasow-i-mieszane.md (algorytm zestawów mieszanych).
 *
 *   normalize(str)                    porównywanie odpowiedzi (sekcja 4 spec 01)
 *   shuffle(list, rng)                tasowanie Fishera–Yatesa (kopia listy)
 *   prepareChoice(item, rng)          opcje multiple-choice w losowej kolejności
 *   reorderTokens(item, rng)          wyrazy do ułożenia (nigdy w poprawnej kolejności)
 *   evaluate(item, answer)            { correct, points, max, … } dla każdego typu zadania
 *   maxPoints(item)                   maksimum punktów za zadanie (stare typy: 1)
 *   sessionScore(results)             wynik sesji w punktach { score, total }
 *   scoreTransformationParts(item, answer, limit)  transformacja jak Cambridge (też C1/B2 Part 4)
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
    const res = evaluateType(item, answer || {});
    // Punkty (spec v6 12, sekcja 1): typy jednopunktowe — 1 za poprawne zadanie
    if (res.max === undefined) { res.max = maxPoints(item); res.points = res.correct ? res.max : 0; }
    return res;
  }

  /** Maksimum punktów za zadanie; stare typy — 1. */
  function maxPoints(item) {
    return 1;
  }

  /**
   * Wynik sesji w punktach: results = [{ item, res }] (res = null → zadanie bez odpowiedzi, 0 z maxPoints).
   * Zadanie z res.max = 0 (np. dyktando pominięte bez głosu) nie liczy się do wyniku.
   */
  function sessionScore(results) {
    let score = 0, total = 0;
    results.forEach(function (r) {
      if (r.res) { score += r.res.points || 0; total += r.res.max; }
      else total += maxPoints(r.item);
    });
    return { score: score, total: total };
  }

  function evaluateType(item, answer) {
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

  // =====================================================================
  // TRANSFORMACJE ZDAŃ (wspólne: C1/B2 Part 4 w js/c1-exercises.js i typ „transformation”)
  // =====================================================================

  function plural(n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10, t = n % 100;
    return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
  }

  /** Wielkie litery, ’ → ', bez interpunkcji (poza apostrofem), pojedyncze spacje. */
  function trNorm(text) {
    return String(text || "")
      .toUpperCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/[^\p{L}\p{N}'\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Skróty liczą się jako dwa słowa: DOESN'T = DOES + N'T, I'M = I + 'M …
  const CONTRACTION = /^(.+?)(N'T|'S|'RE|'VE|'D|'LL|'M)$/;

  /** Słowa odpowiedzi w transformacji (wielkie litery; skrót = dwa słowa). */
  function trTokens(text) {
    const out = [];
    trNorm(text).split(" ").filter(Boolean).forEach(function (word) {
      const m = CONTRACTION.exec(word);
      if (m) out.push(m[1], m[2]);
      else out.push(word);
    });
    return out;
  }

  /** Pozycje, od których ciąg „needle” występuje w „hay” (od indeksu from). */
  function findSeq(hay, needle, from) {
    const hits = [];
    if (!needle.length) return hits;
    for (let i = from || 0; i + needle.length <= hay.length; i++) {
      let ok = true;
      for (let j = 0; j < needle.length; j++) {
        if (hay[i + j] !== needle[j]) { ok = false; break; }
      }
      if (ok) hits.push(i);
    }
    return hits;
  }

  const TR_DEFAULT_LIMIT = [3, 6]; // C1 Advanced

  /**
   * Transformacja jak Cambridge (C1/B2 Part 4): liczba słów w limicie (limit = [min, max], domyślnie 3–6),
   * słowo kluczowe bez zmian, po 1 pkt za każdą część (item.parts = [[warianty]…]); kolejna część liczy się,
   * gdy występuje PO poprzedniej. Zadanie z jedną częścią: 2 pkt albo 0.
   * Zwraca { score, parts: [true/false…], msg } (msg — powód 0 pkt przed oceną części albo null).
   */
  function scoreTransformationParts(item, answer, limit) {
    const lim = Array.isArray(limit) ? limit : TR_DEFAULT_LIMIT;
    const t = trTokens(answer);
    const parts = item.parts.map(function () { return false; });
    if (!t.length) return { score: 0, parts: parts, msg: "Brak odpowiedzi." };
    if (t.length < lim[0] || t.length > lim[1]) {
      return { score: 0, parts: parts, msg: "Wpisz " + lim[0] + "–" + lim[1] + " słów (masz " + t.length + " " + plural(t.length, "słowo", "słowa", "słów") + ", skróty liczą się jako dwa)." };
    }
    if (!findSeq(t, trTokens(item.keyword), 0).length) {
      return { score: 0, parts: parts, msg: "Użyj słowa kluczowego bez zmian (" + item.keyword + ")." };
    }
    let cursor = 0;
    item.parts.forEach(function (variants, k) {
      let bestEnd = -1;
      variants.forEach(function (variant) {
        const v = trTokens(variant);
        const starts = findSeq(t, v, cursor);
        if (starts.length) {
          const end = starts[0] + v.length;
          if (bestEnd === -1 || end < bestEnd) bestEnd = end;
        }
      });
      if (bestEnd !== -1) { parts[k] = true; cursor = bestEnd; }
    });
    const max = item.parts.length === 1 ? 2 : item.parts.length;
    const score = parts.filter(Boolean).length * (max / item.parts.length);
    return { score: score, parts: parts, msg: null };
  }

  /**
   * Zestaw mieszany (spec 02, B.3).
   * pool: zadania (z polem topic); opts: { count, exclude: [id…], types: [typ…], weight: fn(zadanie) → waga }.
   * Wagi (np. ELM.stats.mixWeight) zwiększają szansę wylosowania słabych / niewidzianych zadań w obrębie tematu.
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
    (opts.weight ? weightedOrder(items, opts.weight, r) : shuffle(items, r)).forEach(function (it) {
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

  /**
   * Losowa kolejność z wagami (Efraimidis–Spirakis): element o wadze 2 ma dwa razy
   * większą szansę trafić na początek niż element o wadze 1. Bez wag = zwykłe tasowanie.
   */
  function weightedOrder(list, weight, rng) {
    const r = rng || Math.random;
    return list.map(function (it) {
      const w = Math.max(0.01, Number(weight(it)) || 1);
      return { it: it, key: Math.pow(r() || 1e-9, 1 / w) };
    }).sort(function (a, b) { return b.key - a.key; }).map(function (x) { return x.it; });
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
    maxPoints: maxPoints,
    sessionScore: sessionScore,
    plural: plural,
    trTokens: trTokens,
    findSeq: findSeq,
    scoreTransformationParts: scoreTransformationParts,
    pickMix: pickMix,
    weightedOrder: weightedOrder,
    limitRuns: limitRuns
  };
})(window.ELM);
