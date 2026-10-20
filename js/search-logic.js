/*
 * search-logic.js — silnik wyszukiwarki bez DOM (spec 04, A.2; testy w tools/testy.js).
 *
 *   fold(str)               małe litery bez polskich znaków (ą→a, ł→l…), ta sama długość co wejście
 *   tokenize(str)           wyrazy po fold()
 *   prepare(records)        indeks: rekordy + zbiory tokenów pól
 *   search(index, query)    { groups: [{ group, results: [{ record, score, anchor }] }], total }
 *   snippet(text, query)    fragment z podświetleniem: [{ text, hit }] (podział tekstu, bez HTML)
 *
 * Dopasowanie: dokładne > prefiksowe (wpisujesz „pres” → „Present”) > literówka
 * (tylko wyrazy zapytania ≥ 5 znaków, odległość ≤ 20% długości). Wszystkie wyrazy
 * zapytania muszą się gdzieś dopasować. Wagi pól: tytuł > nagłówki > summary > treść.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const WEIGHTS = { title: 10, headings: 5, summary: 3, text: 1 };
  const MATCH = { exact: 3, prefix: 2, fuzzy: 1 };
  const FOLD = { "ł": "l", "Ł": "l", "ß": "s", "ø": "o", "Ø": "o", "’": "'", "‘": "'" };

  /** Znak po znaku (długość bez zmian — indeksy pasują do oryginału przy podświetlaniu). */
  function fold(str) {
    const s = String(str == null ? "" : str);
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (FOLD[c]) { out += FOLD[c]; continue; }
      const base = c.normalize("NFD")[0];
      out += base.toLowerCase().length === 1 ? base.toLowerCase() : c.toLowerCase().slice(0, 1);
    }
    return out;
  }

  function tokenize(str) {
    return fold(str).split(/[^a-z0-9']+/).map(function (t) { return t.replace(/^'+|'+$/g, ""); }).filter(Boolean);
  }

  function distance(a, b) {
    if (a === b) return 0;
    let prev = [], prevprev = [];
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        // przestawienie sąsiednich liter („presnet” → „present”) = jedna literówka
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prevprev[j - 2] + 1);
      }
      prevprev = prev;
      prev = cur;
    }
    return prev[b.length];
  }

  function prepare(records) {
    return records.map(function (r) {
      return {
        record: r,
        title: new Set(tokenize(r.title)),
        headings: (r.headings || []).map(function (h) { return { text: h, tokens: new Set(tokenize(h)) }; }),
        summary: new Set(tokenize(r.summary)),
        text: new Set(tokenize(r.text))
      };
    });
  }

  /** Najlepsze dopasowanie wyrazu zapytania do zbioru tokenów: 3 / 2 / 1 / 0. */
  function matchSet(q, set) {
    if (set.has(q)) return MATCH.exact;
    let best = 0;
    const fuzzyMax = q.length >= 5 ? Math.floor(q.length * 0.2) : 0;
    set.forEach(function (t) {
      if (best >= MATCH.prefix) return;
      if (t.length > q.length && t.indexOf(q) === 0) { best = MATCH.prefix; return; }
      if (fuzzyMax && Math.abs(t.length - q.length) <= fuzzyMax && t[0] === q[0] && distance(q, t) <= fuzzyMax) best = MATCH.fuzzy;
    });
    return best;
  }

  /**
   * opts: { groups: kolejność grup, limit: wyniki na grupę (5), expanded: { grupa: true } }.
   * Wynik w grupie: posortowany wg trafności; anchor = nagłówek, gdy to on najlepiej pasował.
   */
  function search(index, query, opts) {
    opts = opts || {};
    const q = tokenize(query);
    const empty = { groups: [], total: 0, tokens: q };
    if (!q.length) return empty;
    const hits = [];
    index.forEach(function (e) {
      let score = 0, anchor = null;
      for (let i = 0; i < q.length; i++) {
        const tok = q[i];
        let best = 0;
        const t = matchSet(tok, e.title) * WEIGHTS.title;
        if (t > best) best = t;
        e.headings.forEach(function (h) {
          const s = matchSet(tok, h.tokens) * WEIGHTS.headings;
          if (s > best) { best = s; if (!anchor) anchor = h.text; }
        });
        const su = matchSet(tok, e.summary) * WEIGHTS.summary;
        if (su > best) best = su;
        const tx = matchSet(tok, e.text) * WEIGHTS.text;
        if (tx > best) best = tx;
        if (!best) return; // każdy wyraz zapytania musi się dopasować
        score += best;
      }
      // Cała fraza w tytule — mocny bonus
      if (fold(e.record.title).indexOf(fold(query).trim()) !== -1) score += 15;
      hits.push({ record: e.record, score: score, anchor: score >= WEIGHTS.title * MATCH.prefix ? null : anchor });
    });
    const order = opts.groups || [];
    const byGroup = {};
    hits.forEach(function (h) { (byGroup[h.record.group] = byGroup[h.record.group] || []).push(h); });
    const names = Object.keys(byGroup).sort(function (a, b) {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    const limit = opts.limit || 5;
    const groups = names.map(function (g) {
      const all = byGroup[g].sort(function (a, b) { return b.score - a.score || a.record.title.length - b.record.title.length; });
      return { group: g, total: all.length, results: opts.expanded && opts.expanded[g] ? all : all.slice(0, limit) };
    });
    return { groups: groups, total: hits.length, tokens: q };
  }

  /**
   * Fragment tekstu wokół pierwszego dopasowania (± ok. 70 znaków), podzielony na części
   * z flagą hit — do wyświetlenia przez textContent / <mark>, nigdy przez innerHTML.
   */
  function snippet(text, query, radius) {
    radius = radius || 70;
    const src = String(text || "");
    const f = fold(src);
    const q = tokenize(query).filter(function (t) { return t.length > 1; });
    if (!src || !q.length) return [{ text: src.slice(0, radius * 2), hit: false }];
    // Pozycje wyrazów tekstu pasujących (prefiks) do któregoś z wyrazów zapytania
    const ranges = [];
    const re = /[a-z0-9']+/g;
    let m;
    while ((m = re.exec(f))) {
      const w = m[0];
      if (q.some(function (t) { return w.indexOf(t) === 0 || (t.length >= 5 && Math.abs(w.length - t.length) <= 1 && distance(w, t) <= Math.floor(t.length * 0.2)); })) {
        ranges.push([m.index, m.index + w.length]);
      }
    }
    if (!ranges.length) return [{ text: src.slice(0, radius * 2) + (src.length > radius * 2 ? "…" : ""), hit: false }];
    let start = Math.max(0, ranges[0][0] - radius);
    let end = Math.min(src.length, ranges[0][1] + radius * 1.4);
    if (start > 0) { const sp = src.indexOf(" ", start); if (sp !== -1 && sp < ranges[0][0]) start = sp + 1; }
    if (end < src.length) { const sp = src.lastIndexOf(" ", end); if (sp > ranges[0][1]) end = sp; }
    const parts = [];
    if (start > 0) parts.push({ text: "…", hit: false });
    let pos = start;
    ranges.filter(function (r) { return r[0] >= start && r[1] <= end; }).forEach(function (r) {
      if (r[0] > pos) parts.push({ text: src.slice(pos, r[0]), hit: false });
      parts.push({ text: src.slice(r[0], r[1]), hit: true });
      pos = r[1];
    });
    if (pos < end) parts.push({ text: src.slice(pos, end), hit: false });
    if (end < src.length) parts.push({ text: "…", hit: false });
    return parts;
  }

  /** Podświetlenie w krótkim tekście (tytuł): te same części co snippet, bez skracania. */
  function highlight(text, query) {
    const src = String(text || "");
    const f = fold(src);
    const q = tokenize(query).filter(function (t) { return t.length > 0; });
    const parts = [];
    let pos = 0;
    const re = /[a-z0-9']+/g;
    let m;
    while ((m = re.exec(f))) {
      const w = m[0];
      if (q.some(function (t) { return w.indexOf(t) === 0; })) {
        if (m.index > pos) parts.push({ text: src.slice(pos, m.index), hit: false });
        parts.push({ text: src.slice(m.index, m.index + w.length), hit: true });
        pos = m.index + w.length;
      }
    }
    if (pos < src.length) parts.push({ text: src.slice(pos), hit: false });
    return parts;
  }

  ELM.searchLogic = { WEIGHTS: WEIGHTS, fold: fold, tokenize: tokenize, distance: distance, prepare: prepare, search: search, snippet: snippet, highlight: highlight };
})(window.ELM);
