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
 *                      best / last = { score, total, date }; lastMix — zadania ostatniej sesji mieszanej
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

  const KEYS = { journal: "elm_journal_v1", activity: "elm_activity_v1", levelTest: "elm_leveltest_v1", celebrated: "elm_celebrated_v1", exercises: "elm_exercises_v1" };
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
    if (kind === "exercises") return { sets: {}, lastMix: [] };
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
        if (best || last) sets[id] = { best: best || last, last: last || best };
      });
      const lastMix = (Array.isArray(raw.lastMix) ? raw.lastMix : [])
        .filter(function (x) { return typeof x === "string" && EX_ID.test(x); }).slice(0, 100);
      return { sets: sets, lastMix: lastMix };
    }
    return { last: normalizeTestResult(raw.last) };
  }

  const EX_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;

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

  /** Zapisuje wynik ukończonej sesji: ostatni zawsze, najlepszy, gdy procent jest wyższy. */
  function saveSetScore(setId, score, total) {
    const pid = activeId();
    if (!pid || !EX_ID.test(setId)) return null;
    const clean = normalizeScore({ score: score, total: total, date: learn().today() });
    if (!clean) return null;
    const rec = record("exercises", pid);
    const prev = rec.sets[setId];
    const better = !prev || clean.score / clean.total > prev.best.score / prev.best.total;
    rec.sets[setId] = { best: better ? clean : prev.best, last: clean };
    save("exercises");
    return { best: rec.sets[setId].best, last: clean, improved: !!prev && better };
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
    return {
      journal: JSON.parse(JSON.stringify(load("journal"))),
      activity: JSON.parse(JSON.stringify(load("activity"))),
      levelTest: JSON.parse(JSON.stringify(load("levelTest"))),
      celebrated: JSON.parse(JSON.stringify(load("celebrated"))),
      exercises: JSON.parse(JSON.stringify(load("exercises")))
    };
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
