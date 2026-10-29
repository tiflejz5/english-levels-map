/*
 * final-logic.js — czysta logika testów końcowych poziomów (bez DOM, testy w tools/testy.js).
 * Specyfikacja: docs/rozbudowa-v6/spec/13-test-poziomu-i-testy-koncowe.md, sekcja 2.
 *
 *   drawItems(pool, draw, categoryOf, rng)   losowanie `draw` zadań z puli; każda kategoria reprezentowana
 *                                            proporcjonalnie do jej udziału w puli (najmniej 1), zadania
 *                                            jednej kategorii z możliwie różnych podstron; zadanie
 *                                            wielopunktowe liczy się jako jedno
 *   isPassed(score, total, percent)          próg liczony w punktach (score / total ≥ percent %)
 *   breakdown(results, categoryOf)           podział wyniku na kategorie i tematy z błędami
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  function X() { return ELM.exLogic; }

  /** Czy wynik w punktach daje próg zaliczenia (np. 16 z 20 przy 80%). */
  function isPassed(score, total, percent) {
    return total > 0 && score * 100 >= percent * total;
  }

  /** Wybiera k zadań, preferując różne tematy (kolejne wybrane zadanie z jeszcze nieużytego tematu, gdy jest). */
  function pickSpread(items, k, rng) {
    const left = X().shuffle(items, rng);
    const out = [];
    const used = new Set();
    while (out.length < k && left.length) {
      let i = left.findIndex(function (it) { return !used.has(it.topic); });
      if (i === -1) i = 0;
      const it = left.splice(i, 1)[0];
      used.add(it.topic);
      out.push(it);
    }
    return out;
  }

  /** Ile zadań z każdej kategorii: proporcjonalnie (metoda największych reszt), najmniej 1, najwyżej tyle, ile jest w puli. */
  function allocate(counts, draw) {
    const cats = Object.keys(counts);
    const total = cats.reduce(function (s, c) { return s + counts[c]; }, 0);
    const alloc = {};
    const quota = function (c) { return draw * counts[c] / total; };
    cats.forEach(function (c) { alloc[c] = Math.min(counts[c], Math.max(1, Math.floor(quota(c)))); });
    let sum = cats.reduce(function (s, c) { return s + alloc[c]; }, 0);
    while (sum < draw) {
      const room = cats.filter(function (c) { return alloc[c] < counts[c]; });
      if (!room.length) break;
      room.sort(function (a, b) { return (quota(b) - alloc[b]) - (quota(a) - alloc[a]) || (a < b ? -1 : 1); });
      alloc[room[0]]++; sum++;
    }
    while (sum > draw) {
      const over = cats.filter(function (c) { return alloc[c] > 1; });
      if (!over.length) break;
      over.sort(function (a, b) { return (alloc[b] - quota(b)) - (alloc[a] - quota(a)) || (a < b ? -1 : 1); });
      alloc[over[0]]--; sum--;
    }
    return alloc;
  }

  /**
   * Losowanie testu: `draw` zadań z puli (zadanie wielopunktowe to nadal jedno zadanie). Kategoria zadania
   * z categoryOf(item). Zwraca tablicę w losowej kolejności, w której ten sam typ zadania nie powtarza się
   * więcej niż dwa razy pod rząd. Pula nie większa niż `draw` → wszystkie zadania.
   */
  function drawItems(pool, draw, categoryOf, rng) {
    const byCat = {};
    pool.forEach(function (it) {
      const c = categoryOf(it) || "inne";
      (byCat[c] = byCat[c] || []).push(it);
    });
    const counts = {};
    Object.keys(byCat).forEach(function (c) { counts[c] = byCat[c].length; });
    const alloc = pool.length <= draw ? counts : allocate(counts, draw);
    let picked = [];
    Object.keys(byCat).sort().forEach(function (c) { picked = picked.concat(pickSpread(byCat[c], alloc[c], rng)); });
    // Kolejność: ten sam typ najwyżej dwa razy pod rząd (limitRuns jest jednoprzebiegowe, więc przy pechowym
    // tasowaniu próbujemy ponownie; po 40 próbach zostaje ostatnie)
    let order;
    for (let tries = 0; tries < 40; tries++) {
      order = X().limitRuns(X().shuffle(picked, rng), 2);
      if (!order.some(function (it, i) { return i >= 2 && order[i - 1].type === it.type && order[i - 2].type === it.type; })) break;
    }
    return order;
  }

  /**
   * Podział wyniku. results = [{ item, res }] (res z ELM.exLogic.evaluate; null → brak odpowiedzi).
   * Zwraca { categories: [{ key, score, total }] (w kolejności pierwszego wystąpienia),
   * topics: [{ topic, lost, wrong }] — tematy z utraconymi punktami, od najwięcej straconych }.
   * Zadania pominięte (max = 0) nie liczą się.
   */
  function breakdown(results, categoryOf) {
    const cats = [];
    const byCat = {};
    const byTopic = {};
    results.forEach(function (r) {
      const max = r.res ? r.res.max : X().maxPoints(r.item);
      if (!max) return;
      const pts = r.res ? r.res.points || 0 : 0;
      const c = categoryOf(r.item) || "inne";
      if (!byCat[c]) { byCat[c] = { key: c, score: 0, total: 0 }; cats.push(byCat[c]); }
      byCat[c].score += pts;
      byCat[c].total += max;
      if (pts < max && r.item.topic) {
        const t = byTopic[r.item.topic] || (byTopic[r.item.topic] = { topic: r.item.topic, lost: 0, wrong: 0 });
        t.lost += max - pts;
        t.wrong++;
      }
    });
    const topics = Object.keys(byTopic).map(function (k) { return byTopic[k]; })
      .sort(function (a, b) { return b.lost - a.lost || b.wrong - a.wrong || (a.topic < b.topic ? -1 : 1); });
    return { categories: cats, topics: topics };
  }

  ELM.finalLogic = { isPassed: isPassed, allocate: allocate, drawItems: drawItems, breakdown: breakdown };
})(window.ELM);
