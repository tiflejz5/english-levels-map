/*
 * reviews.js — jedna kolejka powtórek: fiszki z talii, „Moje błędy” i słabe punkty z ćwiczeń
 * (paczka v8, spec 20, sekcja R). Wszystko planuje schedule() z js/fiszki-harmonogram.js.
 *
 *   Czysta logika (testy: node tools/testy.js), bez DOM i localStorage:
 *     queueFrom(ctx, now)      → [{ kind: "card"|"mistake"|"exercise", id, due, topic }]
 *                                 zaległe najstarsze pierwsze, przeplatanie (≤ 2 tego samego rodzaju i
 *                                 nie dwa razy ten sam temat z rzędu), nowe na końcu; limity i granica dnia 04:00 jak w fiszkach
 *     summaryFrom(ctx, now)    → { card, mistake, exercise, total } — te same liczby bez wczytywania talii
 *     interleave(items)        przeplatanie
 *     weakTasks(rec, today)    kandydaci ze słabych punktów z dziennika podejść
 *     estimateMinutes(b)       karta 0,3 · błąd 0,5 · zadanie 0,7 min
 *     redirectFor(hash)        stare adresy → #/powtorki/…
 *   ctx = { state: stan fiszek, decks: [{ id, count }] (kolejność talii), cardsOf(deckId), deckOf(idStanu),
 *           weak: [{ id, topic }] (kandydaci), topicOfEx?(id), extraNew?: dodatkowe nowe karty ponad limit }
 *   Dane żywe: ELM.reviews.queue(now) / count() / breakdown() (poniżej, z ELM.fiszki i ELM.profileData).
 *   Stan zadania ze słabych punktów: klucz „ex:<idZadania>” w mapie cards fiszek (ocena automatyczna).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const EX_NEW_PER_DAY = 3;                 // maks. nowych zadań ze słabych punktów dziennie (w limicie nowych)
  const MINUTES = { card: 0.3, mistake: 0.5, exercise: 0.7 };
  const MAX_SAME_KIND = 2;
  const WEAK_LIMIT = 60;                    // tylu kandydatów ze słabych punktów maksymalnie

  function L() { return ELM.fiszkiLogic; }
  function exKey(itemId) { return "ex:" + itemId; }
  function isEx(id) { return /^ex:/.test(id); }

  function kindOf(id, deckId) {
    if (isEx(id)) return "exercise";
    return deckId === L().MISTAKES_DECK ? "mistake" : "card";
  }

  // =====================================================================
  // SŁABE PUNKTY: kandydaci na zadania (z dziennika podejść)
  // =====================================================================

  /**
   * Zadania z tematów słabych punktów (ELM.stats.weakTopics), które w ostatnich 14 dniach nie zostały
   * rozwiązane poprawnie (jak weakWeight = 2) i choć raz były błędne. Najświeższy błąd pierwszy.
   * opts.noVoice — bez dyktand (brak głosu angielskiego). → [{ id, topic, type }]
   */
  function weakTasks(rec, today, opts) {
    opts = opts || {};
    const S = ELM.stats;
    const topics = {};
    S.weakTopics(rec).forEach(function (t) { topics[t.key] = true; });
    if (!Object.keys(topics).length) return [];
    const weight = S.weakWeight(rec, today);
    const seen = {};
    const wrong = {};
    (rec.items || []).forEach(function (a) {
      if (!a.correct && a.itemId && topics[a.topic] && (!wrong[a.itemId] || a.day > wrong[a.itemId].day)) wrong[a.itemId] = a;
    });
    Object.keys(wrong).forEach(function (id) {
      const a = wrong[id];
      if (weight({ id: id }) !== 2 || (opts.noVoice && a.type === "dictation")) return;
      seen[id] = { id: id, topic: a.topic, type: a.type || null, day: a.day || "" };
    });
    return Object.keys(seen).map(function (k) { return seen[k]; })
      .sort(function (a, b) { return a.day < b.day ? 1 : a.day > b.day ? -1 : a.id < b.id ? -1 : 1; })
      .slice(0, WEAK_LIMIT)
      .map(function (x) { return { id: x.id, topic: x.topic, type: x.type }; });
  }

  // =====================================================================
  // KOLEJKA
  // =====================================================================

  function eligibleDecks(ctx) {
    const on = ctx.state.settings.enabledDecks || [];
    return ctx.decks.filter(function (d) { return on.indexOf(d.id) !== -1 || d.id === L().MISTAKES_DECK; });
  }

  function exAvailable(ctx, today) {
    const have = ctx.state.cards;
    const fresh = (ctx.weak || []).filter(function (w) { return !have[exKey(w.id)]; });
    return { fresh: fresh, cap: Math.max(0, EX_NEW_PER_DAY - ((today && today.exNew) || 0)) };
  }

  function todayOf(ctx, now) {
    return (ctx.state.daily || {})[L().studyDay(now)] || {};
  }

  /** Przeplatanie: pierwszy element, który nie łamie reguł (≤ 2 tego samego rodzaju, nie ten sam temat z rzędu); gdy żaden — pierwszy. */
  function interleave(list) {
    const rest = list.slice(), out = [];
    while (rest.length) {
      const last = out[out.length - 1];
      let run = 0;
      for (let i = out.length - 1; i >= 0 && out[i].kind === (last && last.kind); i--) run++;
      let pick = 0;
      for (let i = 0; i < rest.length; i++) {
        const it = rest[i];
        const kindOk = !last || it.kind !== last.kind || run < MAX_SAME_KIND;
        const topicOk = !last || !it.topic || it.topic !== last.topic;
        if (kindOk && topicOk) { pick = i; break; }
      }
      out.push(rest.splice(pick, 1)[0]);
    }
    return out;
  }

  function queueFrom(ctx, now) {
    const st = ctx.state, cards = st.cards;
    const t = todayOf(ctx, now);
    const weakTopic = {};
    (ctx.weak || []).forEach(function (w) { weakTopic[exKey(w.id)] = w.topic; });
    const deckOf = {};
    let pool = [];
    eligibleDecks(ctx).forEach(function (d) {
      (ctx.cardsOf(d.id) || []).forEach(function (c) { deckOf[c.id] = d.id; });
      pool = pool.concat(ctx.cardsOf(d.id) || []);
    });
    // Zadania: te z zapisanym stanem (nauka, powtórki) + nowe do limitu 3 dziennie, na końcu puli (nowe idą na końcu kolejki)
    Object.keys(cards).forEach(function (id) {
      if (isEx(id)) pool.push({ id: id, deck: "ex", topic: weakTopic[id] || (ctx.topicOfEx && ctx.topicOfEx(id)) || "" });
    });
    // Nowe zadania ze słabych punktów: do 3 dziennie, liczone w limicie nowych (miejsce rezerwujemy przed nowymi kartami)
    const ex = exAvailable(ctx, t);
    const newLeft = Math.max(0, st.settings.newPerDay - (t.new || 0));
    const exTake = ex.fresh.slice(0, Math.min(ex.cap, newLeft));
    const q = L().buildQueue({ cards: pool, state: cards, now: now,
      settings: Object.assign({}, st.settings, { newPerDay: Math.max(0, st.settings.newPerDay + (ctx.extraNew || 0) - exTake.length) }),
      today: { new: t.new || 0, reviews: t.reviews || 0 } });
    const byId = {};
    pool.forEach(function (c) { byId[c.id] = c; });
    exTake.forEach(function (w) { byId[exKey(w.id)] = { id: exKey(w.id), deck: "ex", topic: w.topic }; });
    const mk = function (id) {
      const c = byId[id] || {};
      return { kind: kindOf(id, c.deck), id: id, due: cards[id] ? cards[id].due : 0, topic: c.topic || c.deck || "" };
    };
    const due = q.learning.concat(q.review).map(mk).sort(function (a, b) { return a.due - b.due; });
    return interleave(due).concat(interleave(q.fresh.concat(exTake.map(function (w) { return exKey(w.id); })).map(mk)));
  }

  /** Te same liczby co queueFrom, ale bez zawartości talii (plakietka paska, Dziś): z mapy stanów i liczności talii. */
  function summaryFrom(ctx, now) {
    const st = ctx.state, cards = st.cards, end = L().dayEnd(now), s = st.settings;
    const t = todayOf(ctx, now);
    const decks = eligibleDecks(ctx);
    const ids = {};
    decks.forEach(function (d) { ids[d.id] = true; });
    const touched = {};
    let learning = [], review = [];
    Object.keys(cards).forEach(function (id) {
      let deck = null;
      if (isEx(id)) deck = "ex";
      else { deck = ctx.deckOf(id); if (!deck || !ids[deck]) return; }
      const x = cards[id];
      touched[deck] = (touched[deck] || 0) + 1;
      if (L().isHidden(x, now) || x.state === "new") return;
      const item = { id: id, kind: kindOf(id, deck), due: x.due };
      if ((x.state === "learning" || x.state === "relearning") && x.due < end) learning.push(item);
      else if (x.state === "review" && x.due < end) review.push(item);
    });
    review.sort(function (a, b) { return a.due - b.due; });
    review = review.slice(0, Math.max(0, s.reviewsPerDay - (t.reviews || 0)));
    const out = { card: 0, mistake: 0, exercise: 0 };
    learning.concat(review).forEach(function (it) { out[it.kind]++; });
    const ex = exAvailable(ctx, t);
    let newLeft = Math.max(0, s.newPerDay - (t.new || 0));
    const exTake = Math.min(ex.fresh.length, ex.cap, newLeft);
    newLeft -= exTake;
    decks.forEach(function (d) {
      const take = Math.min(Math.max(0, d.count - (touched[d.id] || 0)), newLeft);
      out[d.id === L().MISTAKES_DECK ? "mistake" : "card"] += take;
      newLeft -= take;
    });
    out.exercise += exTake;
    out.total = out.card + out.mistake + out.exercise;
    return out;
  }

  function estimateMinutes(b) {
    const total = (b.card || 0) * MINUTES.card + (b.mistake || 0) * MINUTES.mistake + (b.exercise || 0) * MINUTES.exercise;
    return total > 0 ? Math.max(1, Math.round(total)) : 0;
  }

  // =====================================================================
  // STARE ADRESY → #/powtorki/… (location.replace w js/app.js)
  // =====================================================================

  function redirectFor(hash) {
    const h = String(hash || "");
    if (/^#\/bledy\/powtorki\/?$/.test(h)) return "#/powtorki/sesja?tylko=bledy";
    if (/^#\/bledy\/?$/.test(h)) return "#/powtorki/moje-bledy";
    if (/^#\/fiszki\/moje-slowa\/?$/.test(h)) return "#/powtorki/moje-slowa";
    if (/^#\/fiszki\/sesja\/?$/.test(h)) return "#/powtorki/sesja?tylko=talie";
    let m = /^#\/fiszki(?:\/(.*))?$/.exec(h);
    if (m) return "#/powtorki/talie" + (m[1] ? "/" + m[1] : "");
    return null;
  }

  // =====================================================================
  // DANE ŻYWE (profil aktywny)
  // =====================================================================

  function F() { return ELM.fiszki && ELM.fiszki.internal; }
  function active() { return !!(ELM.app && ELM.app.getActiveProfile() && F() && ELM.profileData); }
  function now() { return Date.now(); }

  let migratedFor = null; // profil, dla którego migrację już sprawdziliśmy w tej karcie

  /** Migracja jednorazowa (settings.migratedJournal), idempotentna; zwraca liczbę dodanych kart. */
  function ensureMigrated() {
    if (!active()) return 0;
    const pid = ELM.app.getActiveProfile().id;
    const st = F().st();
    if (st.settings.migratedJournal) { migratedFor = pid; return 0; }
    if (migratedFor === pid) return 0;
    migratedFor = pid;
    const added = L().migrateJournal(st, ELM.profileData.entries(), now());
    F().saveState();
    return added;
  }

  function noVoice() { return !!(ELM.exercises && ELM.exercises.noEnglishVoice && ELM.exercises.noEnglishVoice()); }

  function weakNow() {
    return ELM.stats && ELM.profileData ? weakTasks(ELM.profileData.attempts(), ELM.learn.today(), { noVoice: noVoice() }) : [];
  }

  function ctxNow() {
    const f = F();
    const weak = weakNow();
    const topics = {};
    weak.forEach(function (w) { topics[exKey(w.id)] = w.topic; });
    return {
      state: f.st(), decks: f.allDecks(), cardsOf: f.cardsOf, weak: weak,
      topicOfEx: function (id) { return topics[id] || ""; },
      deckOf: function (id) {
        if (/^u-/.test(id)) { const c = f.st().userCards.find(function (x) { return x.id === id; }); return c ? c.deck : null; }
        return id.replace(/-\d{3}$/, "");
      }
    };
  }

  const EMPTY = { card: 0, mistake: 0, exercise: 0, total: 0 };

  function breakdown() {
    if (!active()) return Object.assign({}, EMPTY);
    ensureMigrated();
    return summaryFrom(ctxNow(), now());
  }

  function count() { return breakdown().total; }

  /** Pełna kolejka (talie wbudowane muszą być wczytane: ELM.fiszki.internal.loadDecks()). */
  function queue(at) {
    if (!active()) return [];
    ensureMigrated();
    return queueFrom(ctxNow(), at || now());
  }

  /**
   * Co dalej, gdy na dziś zrobione: { next: najbliższy termin (ms) po „now” albo null, tomorrow: ile pozycji wypada jutro
   * (następny dzień nauki, granica 04:00) }. Karty włączonych talii, „Moje błędy” i zadania z zapisanym stanem.
   */
  function upcomingFrom(ctx, now) {
    const ids = {};
    eligibleDecks(ctx).forEach(function (d) { ids[d.id] = true; });
    const end = L().dayEnd(now);
    let next = null, tomorrow = 0;
    Object.keys(ctx.state.cards).forEach(function (id) {
      const x = ctx.state.cards[id];
      if (x.state === "new" || x.suspended) return;
      if (!isEx(id)) { const deck = ctx.deckOf(id); if (!deck || !ids[deck]) return; }
      const due = Math.max(x.due, x.buriedUntil || 0);
      if (due > now && (next === null || due < next)) next = due;
      if (due >= end && due < end + 86400000) tomorrow++;
    });
    return { next: next, tomorrow: tomorrow };
  }

  function upcoming(at) {
    return active() ? upcomingFrom(ctxNow(), at || now()) : { next: null, tomorrow: 0 };
  }

  /** Najbliższy termin (ms) po chwili t wśród kart i zadań z zapisanym stanem albo null. */
  function nextDue(t) { return upcoming(t).next; }

  ELM.reviews = {
    EX_NEW_PER_DAY: EX_NEW_PER_DAY, MINUTES: MINUTES, exKey: exKey, isEx: isEx, kindOf: kindOf,
    weakTasks: weakTasks, interleave: interleave, queueFrom: queueFrom, summaryFrom: summaryFrom, upcomingFrom: upcomingFrom, upcoming: upcoming,
    estimateMinutes: estimateMinutes, redirectFor: redirectFor,
    ensureMigrated: ensureMigrated, queue: queue, count: count, breakdown: breakdown, nextDue: nextDue,
    ctx: ctxNow, resetMigrationMemo: function () { migratedFor = null; }
  };
})(window.ELM);
