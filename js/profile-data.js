/*
 * profile-data.js — dane nauki zapisywane OSOBNO DLA KAŻDEGO PROFILU
 * (tak jak „Umiem”), pod nowymi kluczami localStorage:
 *
 *   elm_journal_v1   { version: 1, profiles: { <idProfilu>: { entries: [wpis…] } } }
 *   elm_activity_v1  { version: 1, profiles: { <idProfilu>: { days: ["RRRR-MM-DD"…], lastPage } } }
 *   elm_leveltest_v1 { version: 1, profiles: { <idProfilu>: { last: wynik | null } } }
 *   elm_celebrated_v1 { version: 1, profiles: { <idProfilu>: { ids: ["first-umiem", …] } } }
 *                    — kamienie milowe już pokazane (każdy tylko raz na profil, js/celebrate.js)
 *   elm_exercises_v1 { version: 1, profiles: { <idProfilu>: { sets: { <idZestawu>: { best, last } }, lastMix: [idZadania…] } } }
 *                    — wyniki zestawów ćwiczeń (silnik zadań, js/exercise-engine.js);
 *                      best / last = { score, total, date }; recent — ułamki ostatnich 5 wyników
 *                      (sugestia „Umiem”); lastMix — zadania ostatniej sesji mieszanej;
 *                      dismissed: { <idZestawu>: "RRRR-MM-DD" } — odmowa sugestii „Umiem”
 *   elm_attempts_v1  { version: 1, profiles: { <id>: { items: [podejście…], aggregates: { <idZadania>: { n, ok, topic, type, level } } } } }
 *                    — dziennik podejść: każda odpowiedź w zadaniach (bufor 3000, starsze w agregatach; js/learning-stats.js)
 *   elm_autojournal_v1 { version: 1, profiles: { <id>: { items: { <idZadania>: { entryId, created, wrongCount, lastWrongAt, returned } } } } }
 *                    — wpisy dziennika błędów dodane automatycznie z zadań (format elm_journal_v1 bez zmian;
 *                      wpis łączy pole ref = "ex:<idZadania>")
 *   elm_learnprefs_v1 { version: 1, profiles: { <id>: { autoJournal: true|false } } } — ustawienia nauki
 *   elm_notes_v1     { version: 1, profiles: { <id>: { items: { <klucz strony>: { text, updatedAt, title, route } } } } }
 *                    — własne notatki (zwykły tekst, maks. 10 000 znaków)
 *   elm_exams_v1     { version: 1, profiles: { <id>: { exams: { <idEgzaminu>: { examDate, drafts: { <zadanie>: tekst }, tasks: { <strona>: { <nr>: true } },
 *                    choices: { <grupa wyboru>: <zadanie> } } } } } }  (choices: wybór jednego z dwóch zadań, matura rozszerzona;
 *                    w starszych danych brak pola → {})
 *                    — egzaminy w nowym module (np. Egzamin ósmoklasisty, js/exam-core.js); Certyfikat C1 ma własny klucz elm_c1_v1
 *   elm_speaking_v1  { version: 1, profiles: { <id>: { sessions: [ { day, exam, part: 1–4, scores: { <kryterium>: 1–5 } } ] } } }
 *                    — historia sesji trenera Speaking (samoocena, js/speaking-trainer.js; najnowsze na końcu, maks. 500)
 *
 * Wpis dziennika błędów:
 *   { id, createdAt: "RRRR-MM-DD", context, myAnswer, correct, rule, source,
 *     category, itemId, ref, review: { stage, due, mastered } }
 *   ref — klucz zadania, z którego pochodzi wpis (np. "c1:uoe-p4-warunki:3"),
 *         służy do wykrywania duplikatów.
 *
 * Seria nauki: zapisujemy WYŁĄCZNIE listę dni aktywności; serię liczy
 * ELM.learn.streak. Wszystkie dane trafiają do eksportu i są czyszczone
 * przez „Resetuj dane”. Każdy dostęp do localStorage jest w try/catch.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;

  const KEYS = { journal: "elm_journal_v1", activity: "elm_activity_v1", levelTest: "elm_leveltest_v1", celebrated: "elm_celebrated_v1", exercises: "elm_exercises_v1",
    attempts: "elm_attempts_v1", autojournal: "elm_autojournal_v1", prefs: "elm_learnprefs_v1", notes: "elm_notes_v1",
    exams: "elm_exams_v1", speaking: "elm_speaking_v1" };
  const VERSION = 1;

  const CATEGORIES = ["Use of English", "Reading", "Writing", "Listening", "Speaking", "Gramatyka", "Słownictwo", "Inne"];

  // Limity długości (także przy imporcie)
  const LIMITS = {
    context: 2000, myAnswer: 1000, correct: 1000, rule: 2000, source: 200,
    ref: 300, itemId: 120, id: 80, entries: 5000, days: 4000, title: 200, hash: 300, answers: 60
  };

  function learn() { return ELM.learn; }
  function app() { return ELM.app; }

  // ---------- localStorage ----------

  const memory = {};

  function load(kind) {
    if (memory[kind]) return memory[kind];
    let raw = null;
    try { raw = window.localStorage.getItem(KEYS[kind]); } catch (e) { raw = null; }
    let data = null;
    try { data = raw ? normalizeStore(kind, JSON.parse(raw)) : null; } catch (e) {
      // Uszkodzony zapis: odkładamy kopię i zaczynamy od pustego
      try { window.localStorage.setItem(KEYS[kind] + "_corrupt_backup", raw); } catch (e2) { /* trudno */ }
      data = null;
    }
    memory[kind] = data || { version: VERSION, profiles: {} };
    return memory[kind];
  }

  function save(kind) {
    if (ELM.state && ELM.state.storageOk === false) return;
    try {
      window.localStorage.setItem(KEYS[kind], JSON.stringify(load(kind)));
    } catch (e) {
      if (app() && app().reportSaveError) app().reportSaveError("Nie zapisano danych nauki! Brak miejsca albo dostępu do pamięci przeglądarki.");
    }
  }

  function activeId() {
    const p = app() && app().getActiveProfile();
    return p ? p.id : null;
  }

  /** Rekord danego rodzaju dla profilu (tworzony, jeśli go brakuje). */
  function record(kind, pid) {
    const store = load(kind);
    if (!pid) return emptyRecord(kind);
    if (!U.isPlainObject(store.profiles[pid])) store.profiles[pid] = emptyRecord(kind);
    return store.profiles[pid];
  }

  function emptyRecord(kind) {
    if (kind === "journal") return { entries: [] };
    if (kind === "activity") return { days: [], lastPage: null };
    if (kind === "celebrated") return { ids: [] };
    if (kind === "exercises") return { sets: {}, lastMix: [], dismissed: {} };
    if (kind === "attempts") return { items: [], aggregates: {} };
    if (kind === "autojournal") return { items: {} };
    if (kind === "prefs") return { autoJournal: true };
    if (kind === "notes") return { items: {} };
    if (kind === "exams") return { exams: {} };
    if (kind === "speaking") return { sessions: [] };
    return { last: null };
  }

  // ---------- Walidacja (zapis i import) ----------

  function text(value, max) {
    if (typeof value !== "string") return "";
    return value.slice(0, max);
  }

  function normalizeReview(raw, fallbackDay) {
    const steps = learn().REVIEW_STEPS;
    if (!U.isPlainObject(raw)) return learn().newReview(fallbackDay);
    const stage = Number.isInteger(raw.stage) ? Math.max(0, Math.min(steps.length - 1, raw.stage)) : 0;
    const due = learn().isDay(raw.due) ? raw.due : learn().addDays(fallbackDay, steps[0]);
    return { stage: stage, due: due, mastered: raw.mastered === true };
  }

  /** Czysta kopia wpisu albo null, gdy brakuje pól wymaganych. */
  function normalizeEntry(raw) {
    if (!U.isPlainObject(raw)) return null;
    const context = text(raw.context, LIMITS.context).trim();
    const correct = text(raw.correct, LIMITS.correct).trim();
    if (!context || !correct) return null;
    const createdAt = learn().isDay(raw.createdAt) ? raw.createdAt : learn().today();
    const id = text(raw.id, LIMITS.id).trim() || U.uid("err");
    return {
      id: id,
      createdAt: createdAt,
      context: context,
      myAnswer: text(raw.myAnswer, LIMITS.myAnswer).trim(),
      correct: correct,
      rule: text(raw.rule, LIMITS.rule).trim(),
      source: text(raw.source, LIMITS.source).trim(),
      category: CATEGORIES.indexOf(raw.category) !== -1 ? raw.category : "Inne",
      itemId: text(raw.itemId, LIMITS.itemId).trim(),
      ref: text(raw.ref, LIMITS.ref).trim(),
      review: normalizeReview(raw.review, createdAt)
    };
  }

  function normalizeLastPage(raw) {
    if (!U.isPlainObject(raw)) return null;
    const hash = text(raw.hash, LIMITS.hash);
    if (!/^#\/[^\s<>"]*$/.test(hash)) return null;
    return { hash: hash, title: text(raw.title, LIMITS.title) };
  }

  function normalizeTestResult(raw) {
    if (!U.isPlainObject(raw)) return null;
    const levels = learn().LEVELS;
    if (!learn().isDay(raw.date) || levels.indexOf(raw.level) === -1) return null;
    const answers = (Array.isArray(raw.answers) ? raw.answers : []).slice(0, LIMITS.answers)
      .filter(U.isPlainObject)
      .map(function (a) {
        return {
          id: text(a.id, LIMITS.id),
          level: levels.indexOf(a.level) !== -1 ? a.level : "A1",
          chosen: Number.isInteger(a.chosen) && a.chosen >= -1 && a.chosen < 20 ? a.chosen : -1,
          correct: a.correct === true
        };
      });
    return { date: raw.date, level: raw.level, answers: answers };
  }

  function normalizeRecord(kind, raw) {
    if (!U.isPlainObject(raw)) return emptyRecord(kind);
    if (kind === "journal") {
      const seen = new Set();
      const entries = (Array.isArray(raw.entries) ? raw.entries : []).slice(0, LIMITS.entries)
        .map(normalizeEntry)
        .filter(function (e) {
          if (!e) return false;
          if (seen.has(e.id)) e.id = U.uid("err");
          seen.add(e.id);
          return true;
        });
      return { entries: entries };
    }
    if (kind === "activity") {
      const days = Array.from(new Set((Array.isArray(raw.days) ? raw.days : []).filter(learn().isDay))).sort().slice(-LIMITS.days);
      return { days: days, lastPage: normalizeLastPage(raw.lastPage) };
    }
    if (kind === "celebrated") {
      const ids = (Array.isArray(raw.ids) ? raw.ids : [])
        .filter(function (x) { return typeof x === "string" && /^[a-z0-9-]{1,40}$/.test(x); });
      return { ids: Array.from(new Set(ids)).slice(0, 200) };
    }
    if (kind === "exercises") {
      const sets = {};
      const src = U.isPlainObject(raw.sets) ? raw.sets : {};
      Object.keys(src).slice(0, 2000).forEach(function (id) {
        if (!EX_ID.test(id) || !U.isPlainObject(src[id])) return;
        const best = normalizeScore(src[id].best), last = normalizeScore(src[id].last);
        const recent = (Array.isArray(src[id].recent) ? src[id].recent : [])
          .filter(function (x) { return typeof x === "number" && x >= 0 && x <= 1; }).slice(-5);
        if (best || last) sets[id] = { best: best || last, last: last || best, recent: recent };
      });
      const lastMix = (Array.isArray(raw.lastMix) ? raw.lastMix : [])
        .filter(function (x) { return typeof x === "string" && EX_ID.test(x); }).slice(0, 100);
      const dismissed = {};
      if (U.isPlainObject(raw.dismissed)) Object.keys(raw.dismissed).slice(0, 2000).forEach(function (id) {
        if (EX_ID.test(id) && learn().isDay(raw.dismissed[id])) dismissed[id] = raw.dismissed[id];
      });
      return { sets: sets, lastMix: lastMix, dismissed: dismissed };
    }
    if (kind === "attempts") {
      const items = (Array.isArray(raw.items) ? raw.items : []).map(normalizeAttempt).filter(Boolean).slice(-ELM.stats.MAX_ATTEMPTS);
      const aggregates = {};
      if (U.isPlainObject(raw.aggregates)) Object.keys(raw.aggregates).slice(0, 20000).forEach(function (id) {
        const g = raw.aggregates[id];
        if (!EX_ID.test(id) || !U.isPlainObject(g) || !Number.isInteger(g.n) || !Number.isInteger(g.ok) || g.n < 1 || g.ok < 0 || g.ok > g.n) return;
        aggregates[id] = { n: g.n, ok: g.ok, topic: optId(g.topic), type: ATTEMPT_TYPES.indexOf(g.type) !== -1 ? g.type : null, level: learn().LEVELS.indexOf(g.level) !== -1 ? g.level : null };
      });
      return { items: items, aggregates: aggregates };
    }
    if (kind === "autojournal") {
      const items = {};
      if (U.isPlainObject(raw.items)) Object.keys(raw.items).slice(0, 5000).forEach(function (id) {
        const m = raw.items[id];
        if (!EX_ID.test(id) || !U.isPlainObject(m) || typeof m.entryId !== "string") return;
        items[id] = {
          entryId: text(m.entryId, LIMITS.id),
          created: learn().isDay(m.created) ? m.created : learn().today(),
          wrongCount: Number.isInteger(m.wrongCount) && m.wrongCount > 0 ? Math.min(m.wrongCount, 9999) : 1,
          lastWrongAt: learn().isDay(m.lastWrongAt) ? m.lastWrongAt : null,
          returned: m.returned === true
        };
      });
      return { items: items };
    }
    if (kind === "prefs") return { autoJournal: raw.autoJournal !== false };
    if (kind === "speaking") {
      return { sessions: (Array.isArray(raw.sessions) ? raw.sessions : []).slice(-SPEAKING_MAX).map(normalizeSpeakingSession).filter(Boolean) };
    }
    if (kind === "exams") {
      const exams = {};
      if (U.isPlainObject(raw.exams)) Object.keys(raw.exams).slice(0, 20).forEach(function (id) {
        if (!EX_ID.test(id)) return;
        exams[id] = normalizeExam(raw.exams[id]);
      });
      return { exams: exams };
    }
    if (kind === "notes") {
      const items = {};
      if (U.isPlainObject(raw.items)) Object.keys(raw.items).slice(0, 2000).forEach(function (key) {
        const n = raw.items[key];
        if (!NOTE_KEY.test(key) || !U.isPlainObject(n)) return;
        const body = text(n.text, NOTE_MAX);
        if (!body.trim()) return;
        items[key] = { text: body, updatedAt: typeof n.updatedAt === "string" && !isNaN(Date.parse(n.updatedAt)) ? n.updatedAt : new Date().toISOString(),
          title: text(n.title, LIMITS.title), route: /^#\/[^\s<>"]*$/.test(n.route || "") ? text(n.route, LIMITS.hash) : "" };
      });
      return { items: items };
    }
    return { last: normalizeTestResult(raw.last) };
  }

  const EX_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;
  const NOTE_KEY = /^[a-z0-9][a-z0-9:_-]{0,119}$/;
  const NOTE_MAX = 10000;
  const ATTEMPT_TYPES = ["multiple-choice", "reorder", "find-error", "short-answer"];
  const ATTEMPT_MODES = ["learn", "exam", "mix", "weak", "review"];

  /** Dane jednego egzaminu: data, szkice trenera pisania, odhaczone listy na stronach, wybrane zadania w grupach wyboru. */
  function normalizeExam(raw) {
    const out = { examDate: "", drafts: {}, tasks: {}, choices: {} };
    if (!U.isPlainObject(raw)) return out;
    if (learn().isDay(raw.examDate)) out.examDate = raw.examDate;
    if (U.isPlainObject(raw.drafts)) Object.keys(raw.drafts).slice(0, 200).forEach(function (k) {
      if (EX_ID.test(k) && typeof raw.drafts[k] === "string" && raw.drafts[k]) out.drafts[k] = raw.drafts[k].slice(0, 5000);
    });
    if (U.isPlainObject(raw.tasks)) Object.keys(raw.tasks).slice(0, 200).forEach(function (page) {
      if (!EX_ID.test(page) || !U.isPlainObject(raw.tasks[page])) return;
      const t = {};
      Object.keys(raw.tasks[page]).slice(0, 200).forEach(function (i) { if (/^\d{1,3}$/.test(i)) t[i] = raw.tasks[page][i] === true; });
      out.tasks[page] = t;
    });
    if (U.isPlainObject(raw.choices)) Object.keys(raw.choices).slice(0, 20).forEach(function (g) {
      if (/^[A-Za-z0-9]{1,10}$/.test(g) && typeof raw.choices[g] === "string" && EX_ID.test(raw.choices[g])) out.choices[g] = raw.choices[g];
    });
    return out;
  }

  function optId(v) { return typeof v === "string" && EX_ID.test(v) ? v : null; }

  const SPEAKING_MAX = 500;
  /** Sesja trenera Speaking: dzień, egzamin, część 1–4, oceny 1–5 (do 8 kryteriów) albo null. */
  function normalizeSpeakingSession(raw) {
    if (!U.isPlainObject(raw) || !learn().isDay(raw.day) || !EX_ID.test(raw.exam || "")) return null;
    if (!Number.isInteger(raw.part) || raw.part < 1 || raw.part > 4) return null;
    const scores = {};
    if (U.isPlainObject(raw.scores)) Object.keys(raw.scores).slice(0, 8).forEach(function (k) {
      const v = raw.scores[k];
      if (/^[a-z]{1,10}$/.test(k) && Number.isInteger(v) && v >= 1 && v <= 5) scores[k] = v;
    });
    if (!Object.keys(scores).length) return null;
    return { day: raw.day, exam: raw.exam, part: raw.part, scores: scores };
  }

  /** Podejście (dziennik podejść) albo null przy złym formacie. */
  function normalizeAttempt(raw) {
    if (!U.isPlainObject(raw) || !EX_ID.test(raw.itemId || "") || !learn().isDay(raw.day)) return null;
    const out = {
      t: typeof raw.t === "string" && !isNaN(Date.parse(raw.t)) ? raw.t : raw.day + "T12:00:00.000Z",
      day: raw.day,
      itemId: raw.itemId,
      setId: optId(raw.setId),
      topic: optId(raw.topic),
      level: learn().LEVELS.indexOf(raw.level) !== -1 ? raw.level : null,
      type: ATTEMPT_TYPES.indexOf(raw.type) !== -1 ? raw.type : null,
      tags: (Array.isArray(raw.tags) ? raw.tags : []).filter(function (x) { return typeof x === "string" && x.length <= 40; }).slice(0, 10),
      correct: raw.correct === true,
      mode: ATTEMPT_MODES.indexOf(raw.mode) !== -1 ? raw.mode : "learn",
      answer: text(raw.answer, 200)
    };
    // Opcjonalnie (zadania za kilka punktów, paczka v6): points ≤ max ≤ 20
    if (Number.isInteger(raw.max) && raw.max > 0 && raw.max <= 20 && Number.isInteger(raw.points) && raw.points >= 0 && raw.points <= raw.max) {
      out.points = raw.points;
      out.max = raw.max;
    }
    return out;
  }

  /** Wynik zestawu { score, total, date } albo null. */
  function normalizeScore(raw) {
    if (!U.isPlainObject(raw)) return null;
    const total = Number.isInteger(raw.total) && raw.total > 0 && raw.total <= 500 ? raw.total : 0;
    if (!total || !Number.isInteger(raw.score) || raw.score < 0 || raw.score > total || !learn().isDay(raw.date)) return null;
    return { score: raw.score, total: total, date: raw.date };
  }

  /** { version, profiles: { id: rekord } } → czysta kopia (wyjątek przy złym formacie). */
  function normalizeStore(kind, raw) {
    if (!U.isPlainObject(raw) || !U.isPlainObject(raw.profiles)) throw new Error("Nieprawidłowy format danych (" + KEYS[kind] + ").");
    if (typeof raw.version !== "number" || raw.version > VERSION) throw new Error("Nieobsługiwana wersja danych (" + KEYS[kind] + ").");
    const profiles = {};
    Object.keys(raw.profiles).slice(0, 500).forEach(function (pid) {
      if (typeof pid === "string" && pid.length <= LIMITS.id) profiles[pid] = normalizeRecord(kind, raw.profiles[pid]);
    });
    return { version: VERSION, profiles: profiles };
  }

  // =====================================================================
  // DZIENNIK BŁĘDÓW
  // =====================================================================

  function entries() { return record("journal", activeId()).entries; }

  function getEntry(id) {
    return entries().find(function (e) { return e.id === id; }) || null;
  }

  /** Dodaje wpis (pola już sprawdzone). Zwraca zapisany wpis. */
  function addEntry(fields) {
    const today = learn().today();
    const entry = normalizeEntry(Object.assign({}, fields, { id: U.uid("err"), createdAt: today, review: learn().newReview(today) }));
    if (!entry || !activeId()) return null;
    entries().unshift(entry);
    save("journal");
    markActivity();
    return entry;
  }

  function updateEntry(id, fields) {
    const list = entries();
    const i = list.findIndex(function (e) { return e.id === id; });
    if (i === -1) return null;
    const merged = normalizeEntry(Object.assign({}, list[i], fields, { id: id, createdAt: list[i].createdAt, review: list[i].review }));
    if (!merged) return null;
    list[i] = merged;
    save("journal");
    return merged;
  }

  function removeEntry(id) {
    const list = entries();
    const i = list.findIndex(function (e) { return e.id === id; });
    if (i === -1) return;
    list.splice(i, 1);
    save("journal");
  }

  /** Wynik powtórki: known = true („Wiedziałem(am)”) / false („Znowu błąd”). */
  function reviewEntry(id, known) {
    const e = getEntry(id);
    if (!e) return null;
    const today = learn().today();
    e.review = known ? learn().reviewKnown(e.review, today) : learn().reviewAgain(e.review, today);
    save("journal");
    return e;
  }

  function dueEntries() {
    const today = learn().today();
    return entries().filter(function (e) { return learn().isDue(e.review, today); })
      .sort(function (a, b) { return a.review.due < b.review.due ? -1 : a.review.due > b.review.due ? 1 : 0; });
  }

  function dueCount() { return activeId() ? dueEntries().length : 0; }

  /** Porównanie odpowiedzi przy wykrywaniu duplikatów (wielkość liter i spacje bez znaczenia). */
  function sameAnswer(a, b) {
    const n = function (s) { return String(s || "").toLocaleLowerCase("pl").replace(/\s+/g, " ").trim(); };
    return n(a) === n(b);
  }

  /** Istniejący wpis z tego samego zadania z tą samą błędną odpowiedzią (albo null). */
  function findDuplicate(ref, myAnswer) {
    if (!ref) return null;
    return entries().find(function (e) { return e.ref === ref && sameAnswer(e.myAnswer, myAnswer); }) || null;
  }

  // =====================================================================
  // AKTYWNOŚĆ (seria) I „KONTYNUUJ”
  // =====================================================================

  /** Zapisuje dzisiejszy dzień jako dzień nauki aktywnego profilu. */
  function markActivity() {
    const pid = activeId();
    if (!pid) return;
    const rec = record("activity", pid);
    const today = learn().today();
    if (rec.days.indexOf(today) !== -1) return;
    rec.days.push(today);
    if (rec.days.length > LIMITS.days) rec.days.splice(0, rec.days.length - LIMITS.days);
    save("activity");
    if (ELM.celebrate) ELM.celebrate.check(); // nowy dzień nauki może zamknąć kamień milowy serii
  }

  function activityDays() { return record("activity", activeId()).days.slice(); }

  /** Ostatnio otwarta podstrona (do „Kontynuuj” na stronie „Dziś”). */
  function setLastPage(hash, title) {
    const pid = activeId();
    if (!pid) return;
    const page = normalizeLastPage({ hash: hash, title: title });
    const rec = record("activity", pid);
    if (!page || (rec.lastPage && rec.lastPage.hash === page.hash && rec.lastPage.title === page.title)) return;
    rec.lastPage = page;
    save("activity");
  }

  function lastPage() { return record("activity", activeId()).lastPage; }

  // =====================================================================
  // TEST POZIOMU
  // =====================================================================

  function lastTest() { return record("levelTest", activeId()).last; }

  function saveTest(result) {
    const pid = activeId();
    if (!pid) return null;
    const clean = normalizeTestResult(result);
    record("levelTest", pid).last = clean;
    save("levelTest");
    return clean;
  }

  // =====================================================================
  // KAMIENIE MILOWE (już pokazane celebracje)
  // =====================================================================

  /** Zbiór pokazanych kamieni milowych aktywnego profilu albo null, gdy profil nie ma jeszcze zapisu. */
  function celebrated() {
    const pid = activeId();
    if (!pid) return null;
    const rec = load("celebrated").profiles[pid];
    return U.isPlainObject(rec) ? rec.ids.slice() : null;
  }

  function addCelebrated(ids) {
    const pid = activeId();
    if (!pid) return;
    const rec = record("celebrated", pid);
    ids.forEach(function (id) { if (rec.ids.indexOf(id) === -1) rec.ids.push(id); });
    save("celebrated");
  }

  // =====================================================================
  // WYNIKI ZESTAWÓW ĆWICZEŃ
  // =====================================================================

  /** { best, last } zestawu dla aktywnego profilu albo null. */
  function setScore(setId) {
    const pid = activeId();
    if (!pid) return null;
    const rec = load("exercises").profiles[pid];
    return rec && rec.sets[setId] ? { best: rec.sets[setId].best, last: rec.sets[setId].last } : null;
  }

  /** Zapisuje wynik ukończonej sesji: ostatni zawsze, najlepszy, gdy procent jest wyższy; recent — ostatnie 5 wyników. */
  function saveSetScore(setId, score, total) {
    const pid = activeId();
    if (!pid || !EX_ID.test(setId)) return null;
    const clean = normalizeScore({ score: score, total: total, date: learn().today() });
    if (!clean) return null;
    const rec = record("exercises", pid);
    const prev = rec.sets[setId];
    const better = !prev || clean.score / clean.total > prev.best.score / prev.best.total;
    const recent = (prev && prev.recent ? prev.recent : []).concat(clean.score / clean.total).slice(-5);
    rec.sets[setId] = { best: better ? clean : prev.best, last: clean, recent: recent };
    save("exercises");
    return { best: rec.sets[setId].best, last: clean, recent: recent.slice(), improved: !!prev && better };
  }

  /** Dzień odmowy sugestii „Umiem” dla zestawu (albo null) i zapis odmowy. */
  function umiemDismissed(setId) {
    const pid = activeId();
    const rec = pid ? load("exercises").profiles[pid] : null;
    return rec && rec.dismissed ? rec.dismissed[setId] || null : null;
  }

  function dismissUmiem(setId) {
    const pid = activeId();
    if (!pid || !EX_ID.test(setId)) return;
    const rec = record("exercises", pid);
    rec.dismissed = rec.dismissed || {};
    rec.dismissed[setId] = learn().today();
    save("exercises");
  }

  // =====================================================================
  // DZIENNIK PODEJŚĆ
  // =====================================================================

  /** Rekord podejść aktywnego profilu (do statystyk; nie modyfikuj). */
  function attempts() { return record("attempts", activeId()); }

  /** Zapisuje jedną odpowiedź (po każdym zadaniu). */
  function addAttempt(fields) {
    const pid = activeId();
    if (!pid) return null;
    const now = new Date();
    const a = normalizeAttempt(Object.assign({ t: now.toISOString(), day: learn().today() }, fields));
    if (!a) return null;
    ELM.stats.pushAttempt(record("attempts", pid), a);
    save("attempts");
    return a;
  }

  // =====================================================================
  // USTAWIENIA NAUKI
  // =====================================================================

  function prefs() { return Object.assign({}, record("prefs", activeId())); }

  function setPref(key, value) {
    const pid = activeId();
    if (!pid) return;
    const rec = record("prefs", pid);
    if (key === "autoJournal") rec.autoJournal = value !== false;
    save("prefs");
  }

  // =====================================================================
  // AUTOMATYCZNE WPISY DZIENNIKA BŁĘDÓW (spec 03, pkt 2)
  // =====================================================================

  function autoMeta() { return record("autojournal", activeId()).items; }

  /** Wpis dziennika powstały z zadania (pole ref = "ex:<idZadania>") albo null. */
  function entryForItem(itemId) {
    const ref = "ex:" + itemId;
    return entries().find(function (e) { return e.ref === ref; }) || null;
  }

  function isAutoEntry(entry) {
    if (!entry || entry.ref.indexOf("ex:") !== 0) return false;
    const m = autoMeta()[entry.ref.slice(3)];
    return !!m && m.entryId === entry.id;
  }

  function autoCountToday() {
    const today = learn().today(), meta = autoMeta();
    return Object.keys(meta).filter(function (k) { return meta[k].created === today; }).length;
  }

  /**
   * Błędna odpowiedź → wpis w dzienniku (bez duplikatów). fields — pola wpisu (kontekst, odpowiedzi, reguła…).
   * Zwraca { action, entry, undo } albo null (wyłączone w ustawieniach / brak profilu).
   */
  function recordWrong(itemId, fields) {
    const pid = activeId();
    if (!pid || !EX_ID.test(itemId) || !prefs().autoJournal) return null;
    const today = learn().today();
    const existing = entryForItem(itemId);
    const plan = ELM.stats.planWrong(existing, { today: today, autoToday: autoCountToday() });
    const meta = autoMeta();
    if (plan.action === "limit") return { action: "limit" };
    if (plan.action === "create") {
      const entry = addEntry(Object.assign({}, fields, { ref: "ex:" + itemId }));
      if (!entry) return null;
      meta[itemId] = { entryId: entry.id, created: today, wrongCount: 1, lastWrongAt: today, returned: false };
      save("autojournal");
      return { action: "create", entry: entry, undo: { kind: "create", itemId: itemId, entryId: entry.id } };
    }
    // update / reopen: bez nowego wpisu; zapamiętujemy stan do „Cofnij”
    const before = { review: Object.assign({}, existing.review), meta: meta[itemId] ? Object.assign({}, meta[itemId]) : null };
    existing.review = plan.review;
    const m = meta[itemId] || { entryId: existing.id, created: existing.createdAt, wrongCount: 0, lastWrongAt: null, returned: false };
    m.wrongCount++;
    m.lastWrongAt = today;
    if (plan.action === "reopen") m.returned = true;
    meta[itemId] = m;
    save("journal");
    save("autojournal");
    return { action: plan.action, entry: existing, undo: { kind: "update", itemId: itemId, entryId: existing.id, before: before } };
  }

  /** Poprawna odpowiedź: zaliczenie powtórki, jeśli wpis tego zadania jest do powtórki dziś lub zaległy. */
  function recordCorrect(itemId) {
    const entry = activeId() ? entryForItem(itemId) : null;
    const plan = ELM.stats.planCorrect(entry, learn().today());
    if (!plan) return null;
    entry.review = plan.review;
    save("journal");
    return { action: "review", entry: entry };
  }

  /** „Cofnij” dla wyniku recordWrong (pojedynczo albo listy). */
  function undoAuto(undo) {
    if (!undo) return;
    const meta = autoMeta();
    if (undo.kind === "create") {
      removeEntry(undo.entryId);
      if (meta[undo.itemId] && meta[undo.itemId].entryId === undo.entryId) delete meta[undo.itemId];
    } else {
      const e = getEntry(undo.entryId);
      if (e) e.review = undo.before.review;
      if (undo.before.meta) meta[undo.itemId] = undo.before.meta; else delete meta[undo.itemId];
      save("journal");
    }
    save("autojournal");
  }

  /** „Usuń wszystkie automatyczne”: usuwa wpisy dodane automatycznie (ręczne zostają). Zwraca liczbę. */
  function removeAllAuto() {
    const meta = autoMeta();
    const ids = new Set(Object.keys(meta).map(function (k) { return meta[k].entryId; }));
    const list = entries();
    const before = list.length;
    for (let i = list.length - 1; i >= 0; i--) if (ids.has(list[i].id)) list.splice(i, 1);
    record("autojournal", activeId()).items = {};
    save("journal");
    save("autojournal");
    return before - list.length;
  }

  function autoInfo(entry) {
    if (!isAutoEntry(entry)) return null;
    return Object.assign({}, autoMeta()[entry.ref.slice(3)]);
  }

  // =====================================================================
  // EGZAMINY (spec 05) — dane aktywnego profilu dla egzaminu
  // =====================================================================

  /** Obiekt egzaminu { examDate, drafts, tasks, choices } (tworzony, gdy brak; bez profilu — tymczasowy). */
  function examData(examId) {
    const pid = activeId();
    if (!pid || !EX_ID.test(examId)) return normalizeExam(null);
    const rec = record("exams", pid);
    if (!rec.exams[examId]) rec.exams[examId] = normalizeExam(null);
    return rec.exams[examId];
  }

  function saveExams() { save("exams"); }

  // =====================================================================
  // TRENER SPEAKING (spec 09, sekcja 5) — historia sesji z samooceną
  // =====================================================================

  /** Sesje aktywnego profilu dla egzaminu (najnowsze na końcu). */
  function speakingSessions(examId) {
    if (!activeId()) return [];
    return record("speaking", activeId()).sessions.filter(function (s) { return s.exam === examId; });
  }

  /** Zapisuje sesję { exam, part, scores }. Zwraca zapisaną sesję albo null (brak profilu / zły format). */
  function addSpeakingSession(fields) {
    if (!activeId()) return null;
    const s = normalizeSpeakingSession(Object.assign({}, fields, { day: learn().today() }));
    if (!s) return null;
    const list = record("speaking", activeId()).sessions;
    list.push(s);
    if (list.length > SPEAKING_MAX) list.splice(0, list.length - SPEAKING_MAX);
    save("speaking");
    markActivity();
    return s;
  }

  // =====================================================================
  // NOTATKI (spec 04, część B)
  // =====================================================================

  function notes() { return record("notes", activeId()).items; }

  function getNote(key) { return activeId() && notes()[key] ? Object.assign({}, notes()[key]) : null; }

  /** Zapisuje notatkę strony; pusta treść = usunięcie. */
  function setNote(key, value, meta) {
    const pid = activeId();
    if (!pid || !NOTE_KEY.test(key)) return null;
    const items = record("notes", pid).items;
    const body = String(value || "").slice(0, NOTE_MAX);
    if (!body.trim()) { delete items[key]; save("notes"); return null; }
    items[key] = { text: body, updatedAt: new Date().toISOString(), title: text((meta && meta.title) || (items[key] && items[key].title) || "", LIMITS.title),
      route: /^#\/[^\s<>"]*$/.test((meta && meta.route) || "") ? text(meta.route, LIMITS.hash) : (items[key] ? items[key].route : "") };
    save("notes");
    return Object.assign({}, items[key]);
  }

  function removeNote(key) { setNote(key, ""); }

  /** Lista notatek [{ key, text, updatedAt, title, route }] od ostatnio zmienianych. */
  function noteList() {
    const items = activeId() ? notes() : {};
    return Object.keys(items).map(function (k) { return Object.assign({ key: k }, items[k]); })
      .sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0; });
  }

  /** Liczba zestawów (i mixów) z zapisanym wynikiem aktywnego profilu. */
  function solvedSetCount() {
    const pid = activeId();
    const rec = pid ? load("exercises").profiles[pid] : null;
    return rec ? Object.keys(rec.sets).length : 0;
  }

  function lastMix() {
    const pid = activeId();
    const rec = pid ? load("exercises").profiles[pid] : null;
    return rec ? rec.lastMix.slice() : [];
  }

  function setLastMix(ids) {
    const pid = activeId();
    if (!pid) return;
    record("exercises", pid).lastMix = ids.filter(function (x) { return EX_ID.test(x); }).slice(0, 100);
    save("exercises");
  }

  // =====================================================================
  // PROFILE, EKSPORT, IMPORT, RESET
  // =====================================================================

  /** Usuwa dane nauki usuniętego profilu. */
  function removeProfile(pid) {
    Object.keys(KEYS).forEach(function (kind) {
      const store = load(kind);
      if (store.profiles[pid]) { delete store.profiles[pid]; save(kind); }
    });
  }

  /** Zostawia dane tylko dla podanych profili (po imporcie). */
  function prune(profileIds) {
    const keep = new Set(profileIds);
    Object.keys(KEYS).forEach(function (kind) {
      const store = load(kind);
      let changed = false;
      Object.keys(store.profiles).forEach(function (pid) {
        if (!keep.has(pid)) { delete store.profiles[pid]; changed = true; }
      });
      if (changed) save(kind);
    });
  }

  /** Część „learning” pliku eksportu (wszystkie profile). */
  function exportData() {
    const out = {};
    Object.keys(KEYS).forEach(function (kind) { out[kind] = JSON.parse(JSON.stringify(load(kind))); });
    return out;
  }

  /**
   * Sprawdza część „learning” z pliku importu. Brak części (stary plik) → null.
   * Zwraca { journal, activity, levelTest } (każda część może być null) albo rzuca błąd.
   */
  function parseImport(raw) {
    if (raw === undefined || raw === null) return null;
    if (!U.isPlainObject(raw)) throw new Error("Część „learning” pliku ma nieprawidłowy format.");
    const out = {};
    Object.keys(KEYS).forEach(function (kind) {
      out[kind] = raw[kind] === undefined || raw[kind] === null ? null : normalizeStore(kind, raw[kind]);
    });
    return out;
  }

  /**
   * Zapisuje zaimportowane dane. Część obecna w pliku zastępuje dane z tej
   * przeglądarki; części brak (stary plik) → zostają dane profili o tym samym id.
   * Na koniec usuwane są dane profili, których już nie ma.
   */
  function applyImport(parsed, profileIds) {
    Object.keys(KEYS).forEach(function (kind) {
      if (parsed && parsed[kind]) { memory[kind] = parsed[kind]; save(kind); }
    });
    prune(profileIds);
  }

  /** Statystyka do okna potwierdzenia importu. */
  function summarizeImport(parsed) {
    if (!parsed || !parsed.journal) return null;
    let n = 0;
    Object.keys(parsed.journal.profiles).forEach(function (pid) { n += parsed.journal.profiles[pid].entries.length; });
    return { journalEntries: n };
  }

  /** „Resetuj dane”: usuwa wszystkie klucze danych nauki. */
  function clearAll() {
    Object.keys(KEYS).forEach(function (kind) {
      memory[kind] = { version: VERSION, profiles: {} };
      try { window.localStorage.removeItem(KEYS[kind]); } catch (e) { /* brak dostępu */ }
    });
  }

  ELM.profileData = {
    KEYS: KEYS,
    CATEGORIES: CATEGORIES,
    LIMITS: LIMITS,
    normalizeEntry: normalizeEntry,
    entries: entries,
    getEntry: getEntry,
    addEntry: addEntry,
    updateEntry: updateEntry,
    removeEntry: removeEntry,
    reviewEntry: reviewEntry,
    dueEntries: dueEntries,
    dueCount: dueCount,
    findDuplicate: findDuplicate,
    markActivity: markActivity,
    activityDays: activityDays,
    setLastPage: setLastPage,
    lastPage: lastPage,
    lastTest: lastTest,
    celebrated: celebrated,
    addCelebrated: addCelebrated,
    saveTest: saveTest,
    setScore: setScore,
    saveSetScore: saveSetScore,
    lastMix: lastMix,
    setLastMix: setLastMix,
    umiemDismissed: umiemDismissed,
    solvedSetCount: solvedSetCount,
    dismissUmiem: dismissUmiem,
    attempts: attempts,
    addAttempt: addAttempt,
    prefs: prefs,
    setPref: setPref,
    entryForItem: entryForItem,
    isAutoEntry: isAutoEntry,
    autoInfo: autoInfo,
    autoCountToday: autoCountToday,
    recordWrong: recordWrong,
    recordCorrect: recordCorrect,
    undoAuto: undoAuto,
    removeAllAuto: removeAllAuto,
    NOTE_MAX: NOTE_MAX,
    examData: examData,
    saveExams: saveExams,
    speakingSessions: speakingSessions,
    addSpeakingSession: addSpeakingSession,
    getNote: getNote,
    setNote: setNote,
    removeNote: removeNote,
    noteList: noteList,
    removeProfile: removeProfile,
    prune: prune,
    exportData: exportData,
    parseImport: parseImport,
    applyImport: applyImport,
    summarizeImport: summarizeImport,
    clearAll: clearAll
  };

  // Jedna funkcja do zaznaczania dnia nauki, dostępna w całej aplikacji
  ELM.markActivity = markActivity;
})(window.ELM);
