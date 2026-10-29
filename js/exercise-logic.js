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
 *   normalizeSentence(str)            zdanie do porównania: bez przecinków, skróty rozwinięte (spec v6 12, 2.4)
 *   matchesSentence(answer, accepted) zgodność zdania z którymkolwiek wariantem
 *   wordDiff(model, got)              porównanie słowo po słowie (brak / zbędne / zamienione)
 *   prepareMatch(item, rng)           prawa kolumna dopasowania (zawsze przetasowana)
 *
 * Typy z paczki v6 (spec docs/rozbudowa-v6/spec/12-nowe-typy-zadan.md): gap-fill, match,
 * transformation, translate, dictation. Odpowiedzi: { texts: […] }, { pairs: { indeksLewej: tekstPrawej } },
 * { text }, { text }, { text } albo { skipped: true } (dyktando bez głosu).
 *   pickMix(pool, opts, rng)          losowanie zestawu mieszanego
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const TYPES = ["multiple-choice", "reorder", "find-error", "short-answer", "gap-fill", "match", "transformation", "translate", "dictation"];

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

  /** Maksimum punktów za zadanie: luki i pary — po punkcie, transformacja z parts — 2, pozostałe — 1. */
  function maxPoints(item) {
    if (item.type === "gap-fill") return (item.gaps || []).length || 1;
    if (item.type === "match") return (item.pairs || []).length || 1;
    if (item.type === "transformation") return item.parts ? 2 : 1;
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
    if (item.type === "short-answer") return shortAnswer(item.accepted, answer.text);
    if (item.type === "gap-fill") {
      const texts = answer.texts || [];
      const gaps = item.gaps.map(function (g, i) { return shortAnswer(g.accepted, texts[i]); });
      const points = gaps.filter(function (g) { return g.correct; }).length;
      return { correct: points === gaps.length, answered: gaps.some(function (g) { return g.answered; }), points: points, max: gaps.length, gaps: gaps };
    }
    if (item.type === "match") {
      const chosen = answer.pairs || {};
      const pairs = item.pairs.map(function (pair, i) { return chosen[i] != null && chosen[i] === pair[1]; });
      const points = pairs.filter(Boolean).length;
      return { correct: points === pairs.length, answered: Object.keys(chosen).some(function (k) { return chosen[k] != null; }), points: points, max: pairs.length, pairs: pairs };
    }
    if (item.type === "transformation") return evaluateTransformation(item, answer.text);
    if (item.type === "translate") return evaluateSentence(item.accepted, answer.text);
    if (item.type === "dictation") {
      // Brak głosu angielskiego: zadanie pominięte, nie liczy się do wyniku ani statystyk
      if (answer.skipped) return { correct: false, answered: true, skipped: true, points: 0, max: 0 };
      return evaluateSentence([item.text].concat(item.accepted || []), answer.text);
    }
    return { correct: false, answered: false };
  }

  /** Jedno pole jak short-answer: pełna zgodność po normalize; różnica 1 litery → uwaga o pisowni (0 pkt). */
  function shortAnswer(accepted, value) {
    const text = normalize(value);
    const ok = text !== "" && accepted.some(function (a) { return normalize(a) === text; });
    const close = !ok && text !== "" && accepted.some(function (a) { return distance(normalize(a), text) === 1; });
    return { correct: ok, answered: text !== "", spelling: close };
  }

  // =====================================================================
  // ZDANIA (translate, dictation): normalizacja, warianty skrótów, porównanie słowo po słowie
  // =====================================================================

  const FIXED_CONTRACTIONS = { "won't": "will not", "can't": "cannot", "shan't": "shall not", "let's": "let us" };

  /**
   * normalize + bez przecinków i interpunkcji wewnątrz zdania + rozwinięte jednoznaczne skróty
   * (n't → not, 're → are, 've → have, 'll → will, 'm → am, won't → will not, can't → cannot).
   * Niejednoznaczne 's i 'd zostają (porównanie sprawdza oba rozwinięcia — sentenceVariants).
   */
  function normalizeSentence(str) {
    return normalize(str)
      .replace(/[,.!?;:"“”„«»()]/g, " ")
      .replace(/\s[–—-]+\s/g, " ")
      .split(/\s+/).filter(Boolean).map(expandWord).join(" ");
  }

  function expandWord(w) {
    if (FIXED_CONTRACTIONS[w]) return FIXED_CONTRACTIONS[w];
    let m = /^(.+)n't$/.exec(w);
    if (m) return m[1] + " not";
    m = /^(.+)'(re|ve|ll|m)$/.exec(w);
    if (m) return m[1] + " " + { re: "are", ve: "have", ll: "will", m: "am" }[m[2]];
    return w;
  }

  const AMBIGUOUS = { s: ["is", "has"], d: ["would", "had"] };

  /** Wszystkie odczytania zdania: 's = is / has / dopełniacz, 'd = would / had (najwyżej 64 warianty). */
  function sentenceVariants(str) {
    let out = [[]];
    normalizeSentence(str).split(" ").filter(Boolean).forEach(function (w) {
      const m = /^(.+)'([sd])$/.exec(w);
      const opts = m ? [w].concat(AMBIGUOUS[m[2]].map(function (x) { return m[1] + " " + x; })) : [w];
      const next = [];
      out.forEach(function (prefix) { (out.length * opts.length > 64 ? opts.slice(0, 1) : opts).forEach(function (o) { next.push(prefix.concat(o)); }); });
      out = next;
    });
    return out.map(function (words) { return words.join(" "); });
  }

  /** Czy zdanie pasuje (po normalizacji i rozwinięciu skrótów) do któregokolwiek z akceptowanych. */
  function matchesSentence(answer, accepted) {
    const mine = sentenceVariants(answer);
    if (!mine.join("")) return false;
    return accepted.some(function (a) {
      const theirs = sentenceVariants(a);
      return mine.some(function (v) { return theirs.indexOf(v) !== -1; });
    });
  }

  /**
   * Porównanie słowo po słowie (odległość edycyjna na wyrazach):
   * [{ op: "same" | "missing" | "extra" | "replace", word (wzór), got (odpowiedź) }].
   */
  function wordDiff(model, got) {
    const m = model.length, n = got.length;
    const d = [];
    for (let i = 0; i <= m; i++) { d.push([i]); for (let j = 1; j <= n; j++) d[i][j] = i ? 0 : j; }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (model[i - 1] === got[j - 1] ? 0 : 1));
      }
    }
    const ops = [];
    let i = m, j = n;
    // Przy remisie: najpierw zgodne wyrazy, potem brak / zbędne (więcej wyrazów zostaje „na swoim miejscu”), na końcu zamiana
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && model[i - 1] === got[j - 1] && d[i][j] === d[i - 1][j - 1]) {
        ops.unshift({ op: "same", word: model[i - 1] });
        i--; j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
        ops.unshift({ op: "missing", word: model[i - 1] });
        i--;
      } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
        ops.unshift({ op: "extra", got: got[j - 1] });
        j--;
      } else {
        ops.unshift({ op: "replace", word: model[i - 1], got: got[j - 1] });
        i--; j--;
      }
    }
    return { distance: d[m][n], ops: ops };
  }

  /** Najbliższy akceptowany wariant (najmniej zmian na wyrazach) i porównanie z nim. */
  function closestDiff(answer, accepted) {
    const mine = sentenceVariants(answer).map(function (v) { return v.split(" ").filter(Boolean); });
    let best = null;
    accepted.forEach(function (a, k) {
      sentenceVariants(a).forEach(function (v) {
        const model = v.split(" ").filter(Boolean);
        mine.forEach(function (got) {
          const diff = wordDiff(model, got);
          if (!best || diff.distance < best.diff.distance) best = { index: k, diff: diff };
        });
      });
    });
    return best;
  }

  /** translate / dictation: 1 pkt za zgodność; inaczej porównanie z najbliższym wariantem i ewentualna literówka. */
  function evaluateSentence(accepted, text) {
    const answered = normalize(text) !== "";
    if (answered && matchesSentence(text, accepted)) return { correct: true, answered: true, points: 1, max: 1 };
    const best = answered ? closestDiff(text, accepted) : null;
    let spelling = false;
    if (best) {
      const changed = best.diff.ops.filter(function (o) { return o.op !== "same"; });
      spelling = changed.length === 1 && changed[0].op === "replace" && changed[0].word.length >= 5 && distance(changed[0].word, changed[0].got) === 1;
    }
    return { correct: false, answered: answered, points: 0, max: 1, diff: best ? best.diff.ops : null, closest: best ? best.index : 0, spelling: spelling };
  }

  /** Liczba słów w transformacji i powód odrzucenia przed oceną (limit, słowo kluczowe) albo null. */
  function transformationCheck(item, text, lim) {
    const t = trTokens(text);
    if (!t.length) return { words: 0, msg: "Brak odpowiedzi." };
    if (t.length < lim[0] || t.length > lim[1]) return { words: t.length, msg: "Wpisz " + lim[0] + "–" + lim[1] + " słów (masz " + t.length + " " + plural(t.length, "słowo", "słowa", "słów") + ", skróty liczą się jako dwa)." };
    if (!findSeq(t, trTokens(item.keyword), 0).length) return { words: t.length, msg: "Użyj słowa kluczowego bez zmian (" + item.keyword + ")." };
    return { words: t.length, msg: null };
  }

  /** Limit słów zadania transformacji: wordLimit albo 2–5 (B1–B2). */
  function transformationLimit(item) {
    const w = item.wordLimit;
    return Array.isArray(w) && w.length === 2 && w[0] >= 1 && w[0] <= w[1] ? w : [2, 5];
  }

  /**
   * transformation: bez parts — 1 pkt za zgodność z answers (po normalizacji, skróty rozwinięte);
   * z parts — 2 pkt jak Cambridge (scoreTransformationParts), pełna zgodność z answers zawsze 2.
   */
  function evaluateTransformation(item, text) {
    const lim = transformationLimit(item);
    const max = item.parts ? 2 : 1;
    const check = transformationCheck(item, text, lim);
    const answered = check.words > 0;
    if (check.msg) return { correct: false, answered: answered, points: 0, max: max, msg: check.msg, parts: item.parts ? item.parts.map(function () { return false; }) : null };
    if (matchesSentence(text, item.answers)) return { correct: true, answered: true, points: max, max: max, msg: null, parts: item.parts ? item.parts.map(function () { return true; }) : null };
    if (!item.parts) return { correct: false, answered: true, points: 0, max: 1, msg: null, parts: null };
    const r = scoreTransformationParts(item, text, lim);
    return { correct: r.score === 2, answered: true, points: r.score, max: 2, msg: r.msg, parts: r.parts };
  }

  /**
   * Prawa kolumna dopasowania: [{ id, text }] (pary + extraRight), zawsze przetasowana —
   * nigdy w kolejności par z pliku.
   */
  function prepareMatch(item, rng) {
    const right = item.pairs.map(function (p, i) { return { id: "r" + i, text: p[1] }; })
      .concat((item.extraRight || []).map(function (t, i) { return { id: "x" + i, text: t }; }));
    const inOrder = function (list) { return item.pairs.every(function (p, i) { return list[i].text === p[1]; }); };
    let out = shuffle(right, rng);
    for (let tries = 0; tries < 20 && inOrder(out); tries++) out = shuffle(right, rng);
    if (inOrder(out)) out.push(out.shift());
    return out;
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
    transformationLimit: transformationLimit,
    normalizeSentence: normalizeSentence,
    sentenceVariants: sentenceVariants,
    matchesSentence: matchesSentence,
    wordDiff: wordDiff,
    prepareMatch: prepareMatch,
    pickMix: pickMix,
    weightedOrder: weightedOrder,
    limitRuns: limitRuns
  };
})(window.ELM);
