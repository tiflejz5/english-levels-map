/*
 * learning.js — czysta logika nauki (bez DOM i bez localStorage), więc da się
 * ją testować w Node: node tools/testy.js
 *
 *   today()            — dzisiejszy LOKALNY dzień "RRRR-MM-DD" (podmienialna w testach)
 *   REVIEW_STEPS       — odstępy powtórek w dniach, np. [1, 3, 7]
 *   powtórki           — newReview, reviewKnown, reviewAgain, isDue
 *   seria nauki        — streak (bieżąca i najdłuższa), lastDays (kropki tygodnia)
 *   test poziomu       — TEST_LENGTH, START_LEVEL, nextLevelIndex, pickQuestion, resultLevelIndex
 *
 * Daty są zawsze dniami kalendarza użytkownika (bez godzin i stref).
 */
(function (root) {
  "use strict";

  const ELM = root.ELM = root.ELM || {};

  // Odstępy kolejnych powtórek (w dniach). Zmień tablicę, żeby zmienić harmonogram.
  const REVIEW_STEPS = [1, 3, 7];

  const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function pad(n) { return String(n).padStart(2, "0"); }

  function fromDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /** Data "RRRR-MM-DD" → Date (lokalne południe, żeby zmiana czasu nie przesuwała dnia). */
  function toDate(day) {
    const m = DAY_RE.exec(day || "");
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  }

  function isDay(value) {
    const d = toDate(value);
    return !!d && fromDate(d) === value;
  }

  /** Dodaje n dni do daty "RRRR-MM-DD". */
  function addDays(day, n) {
    const d = toDate(day);
    d.setDate(d.getDate() + n);
    return fromDate(d);
  }

  /** Liczba dni od a do b (b − a). */
  function diffDays(a, b) {
    return Math.round((toDate(b) - toDate(a)) / 86400000);
  }

  const learn = {
    REVIEW_STEPS: REVIEW_STEPS,
    isDay: isDay,
    addDays: addDays,
    diffDays: diffDays,

    /** Dzisiejszy dzień użytkownika. W testach: ELM.learn.today = () => "2026-01-01". */
    today: function () { return fromDate(new Date()); },

    // ---------- Powtórki ----------
    //   review = { stage, due, mastered }
    //   stage  — indeks w REVIEW_STEPS (odstęp, po którym przypada powtórka „due”)

    /** Stan nowego wpisu: pierwsza powtórka jutro. */
    newReview: function (today) {
      return { stage: 0, due: addDays(today, REVIEW_STEPS[0]), mastered: false };
    },

    /** „Wiedziałem(am)”: następny etap; po ostatnim — opanowany. */
    reviewKnown: function (review, today) {
      const next = review.stage + 1;
      if (next >= REVIEW_STEPS.length) return { stage: review.stage, due: review.due, mastered: true };
      return { stage: next, due: addDays(today, REVIEW_STEPS[next]), mastered: false };
    },

    /** „Znowu błąd”: wraca do pierwszego etapu (jutro). */
    reviewAgain: function (review, today) {
      return { stage: 0, due: addDays(today, REVIEW_STEPS[0]), mastered: false };
    },

    /** Do powtórki dziś (także zaległe — bez żadnej kary). */
    isDue: function (review, today) {
      return !review.mastered && review.due <= today;
    },

    // ---------- Seria nauki ----------

    /**
     * days — lista dni aktywności (dowolna kolejność, mogą się powtarzać).
     * current: seria kończąca się dziś albo wczoraj (dzień bez aktywności
     * „jeszcze trwa”, więc seria nie znika w ciągu dnia).
     */
    streak: function (days, today) {
      const set = new Set((days || []).filter(isDay));
      const sorted = Array.from(set).filter(function (d) { return d <= today; }).sort();
      let longest = 0;
      let run = 0;
      let prev = null;
      sorted.forEach(function (d) {
        run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
        if (run > longest) longest = run;
        prev = d;
      });
      let current = 0;
      let cursor = set.has(today) ? today : addDays(today, -1);
      while (set.has(cursor)) { current++; cursor = addDays(cursor, -1); }
      return { current: current, longest: longest, activeToday: set.has(today) };
    },

    /** Ostatnie n dni (od najstarszego do dziś): [{ day, active }]. */
    lastDays: function (days, today, n) {
      const set = new Set(days || []);
      const out = [];
      for (let i = (n || 7) - 1; i >= 0; i--) {
        const d = addDays(today, -i);
        out.push({ day: d, active: set.has(d) });
      }
      return out;
    },

    // ---------- Test poziomu (adaptacyjny) ----------

    LEVELS: ["A1", "A2", "B1", "B2", "C1", "C2"],
    TEST_LENGTH: 12,
    START_LEVEL: "A2",
    RESULT_WINDOW: 6,

    /** Poprawna odpowiedź → poziom wyżej (maks. C2), błędna → niżej (min. A1). */
    nextLevelIndex: function (index, correct) {
      return Math.max(0, Math.min(learn.LEVELS.length - 1, index + (correct ? 1 : -1)));
    },

    /**
     * Losuje pytanie z poziomu levelIndex bez powtórzeń (used: Set id).
     * Gdy pula poziomu się wyczerpie, bierze pytanie z najbliższego poziomu;
     * przy tej samej odległości najpierw w kierunku ruchu testu
     * (preferUp = true po dobrej odpowiedzi → wyżej, inaczej → niżej).
     * random() → [0, 1). Zwraca pytanie albo null, gdy nie ma już żadnych pytań.
     * opts (opcjonalnie, spec v6 13 sekcja 1.3):
     *   avoidIds   — id z poprzedniego podejścia (Set albo tablica): pomijane, jeśli pula poziomu na to pozwala,
     *   skillCounts — { grammar: n, vocabulary: n, reading: n } w tym podejściu: wybór umiejętności,
     *                 która pojawiła się najrzadziej (remis → losowo), potem losowe pytanie z niej.
     * Pytanie bez skill liczy się jak grammar.
     */
    pickQuestion: function (questions, levelIndex, used, random, preferUp, opts) {
      const rnd = random || Math.random;
      const L = learn.LEVELS;
      for (let dist = 0; dist < L.length; dist++) {
        const candidates = dist === 0 ? [levelIndex]
          : preferUp ? [levelIndex + dist, levelIndex - dist] : [levelIndex - dist, levelIndex + dist];
        for (const idx of candidates) {
          if (idx < 0 || idx >= L.length) continue;
          const pool = questions.filter(function (q) { return q.level === L[idx] && !used.has(q.id); });
          if (pool.length) return opts ? learn.pickBalanced(pool, opts, rnd) : pool[Math.floor(rnd() * pool.length)];
        }
      }
      return null;
    },

    /** Umiejętność pytania (bez pola skill — grammar, zgodność ze starymi pytaniami). */
    skillOf: function (q) { return q.skill || "grammar"; },

    /** Wybór z puli poziomu: najpierw bez pytań z poprzedniego podejścia, potem najrzadsza umiejętność. */
    pickBalanced: function (pool, opts, rnd) {
      const avoid = opts.avoidIds ? new Set(opts.avoidIds) : null;
      let list = pool;
      if (avoid) {
        const fresh = list.filter(function (q) { return !avoid.has(q.id); });
        if (fresh.length) list = fresh;
      }
      if (opts.skillCounts) {
        const counts = opts.skillCounts;
        const skills = [];
        list.forEach(function (q) { const s = learn.skillOf(q); if (skills.indexOf(s) === -1) skills.push(s); });
        const min = Math.min.apply(null, skills.map(function (s) { return counts[s] || 0; }));
        const rarest = skills.filter(function (s) { return (counts[s] || 0) === min; });
        const skill = rarest[Math.floor(rnd() * rarest.length)];
        list = list.filter(function (q) { return learn.skillOf(q) === skill; });
      }
      return list[Math.floor(rnd() * list.length)];
    },

    /** Wynik: średnia indeksów poziomów ostatnich 6 pytań, zaokrąglona w dół. */
    resultLevelIndex: function (askedLevelIndexes) {
      const last = askedLevelIndexes.slice(-learn.RESULT_WINDOW);
      if (!last.length) return 0;
      const sum = last.reduce(function (s, x) { return s + x; }, 0);
      return Math.floor(sum / last.length);
    }
  };

  ELM.learn = learn;
})(typeof window !== "undefined" ? window : globalThis);
