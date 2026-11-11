/*
 * szlak-store.js — stan Szlaku w localStorage (spec v7 13, sekcja 3).
 *
 *   Klucz per profil: elm.<profileId>.szlak
 *   { version: 1, start: { level, source: "test"|"manual"|"default", at } | null,
 *     stops: { <idPrzystanku>: { done, via: "quiz"|"umiem"|"skip"|"set", best?, at } },
 *     reviews: { <idPowtórki>: { best, of, at } } }
 *
 * Nowy klucz: istniejące klucze (elm_profiles_v1, elm_leveltest_v1, elm.<id>.fiszki…) bez zmian. Eksport / import / reset
 * i usuwanie profilu działają jak w js/fiszki-store.js (część „szlak” kopii; stary plik jej nie ma → dane zostają).
 * Walidacja: ELM.szlakLogic.sanitizeState. Bez profilu: stan tymczasowy, niezapisywany.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const PREFIX = "elm.";
  const SUFFIX = ".szlak";
  const memory = {}; // { profileId: stan }

  function L() { return ELM.szlakLogic; }
  function app() { return ELM.app; }
  function keyOf(pid) { return PREFIX + pid + SUFFIX; }
  function activeId() { const p = app() && app().getActiveProfile(); return p ? p.id : null; }
  function stamp() { return new Date().toISOString(); }

  function load(pid) {
    if (!pid) return L().emptyState();
    if (memory[pid]) return memory[pid];
    let raw = null;
    try { raw = window.localStorage.getItem(keyOf(pid)); } catch (e) { raw = null; }
    let data = null;
    if (raw) {
      try { data = L().sanitizeState(JSON.parse(raw)); } catch (e) {
        try { window.localStorage.setItem(keyOf(pid) + "_corrupt_backup", raw); } catch (e2) { /* trudno */ }
        data = null;
      }
    }
    memory[pid] = data || L().emptyState();
    return memory[pid];
  }

  function save(pid) {
    pid = pid || activeId();
    if (!pid || !memory[pid]) return true;
    if (ELM.state && ELM.state.storageOk === false) return false;
    try { window.localStorage.setItem(keyOf(pid), JSON.stringify(memory[pid])); return true; } catch (e) {
      if (app() && app().reportSaveError) app().reportSaveError("Nie zapisano postępu na Szlaku! Brak miejsca albo dostępu do pamięci przeglądarki.");
      return false;
    }
  }

  /** Stan aktywnego profilu (bez profilu — tymczasowy). */
  function data() { return load(activeId()); }

  // ---------- zmiany stanu ----------

  /** Punkt startu. source: „test” (wynik testu poziomu), „manual” (ręcznie), „default”. Ręczny wybór nie jest nadpisywany testem. */
  function setStart(level, source, force) {
    if (!activeId() || L().LEVELS.indexOf(level) === -1) return false;
    const d = data();
    if (!force && source === "test" && d.start && d.start.source === "manual") return false;
    d.start = { level: level, source: source === "manual" || source === "test" ? source : "default", at: stamp() };
    return save();
  }

  /** Wynik quizu przystanku (liczba dobrych odpowiedzi); zapamiętujemy najlepszy. Zaliczenie ≥ 3/4 (via „quiz”). */
  function recordQuiz(stopId, score) {
    if (!activeId()) return null;
    const d = data();
    const prev = d.stops[stopId];
    const prevBest = prev && prev.via === "quiz" && typeof prev.best === "number" ? prev.best : 0;
    const best = Math.max(score, prevBest);
    d.stops[stopId] = { done: best >= L().PASS_QUIZ, via: "quiz", best: best, at: stamp() };
    save();
    return d.stops[stopId];
  }

  function skipStop(stopId) {
    if (!activeId()) return false;
    const d = data();
    const cur = d.stops[stopId];
    if (cur && cur.via === "quiz" && cur.best >= L().PASS_QUIZ) return false; // zaliczony quizem zostaje zaliczony
    d.stops[stopId] = { done: false, via: "skip", at: stamp() };
    return save();
  }

  function unskipStop(stopId) {
    if (!activeId()) return false;
    const d = data();
    if (d.stops[stopId] && d.stops[stopId].via === "skip") { delete d.stops[stopId]; return save(); }
    return false;
  }

  function recordReview(id, best, of) {
    if (!activeId()) return null;
    const d = data();
    const prev = d.reviews[id];
    d.reviews[id] = { best: Math.max(best, prev ? prev.best : 0), of: of, at: stamp() };
    save();
    return d.reviews[id];
  }

  // ---------- profile, eksport, import, reset ----------

  function storedIds() {
    const out = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0 && k.slice(-SUFFIX.length) === SUFFIX) out.push(k.slice(PREFIX.length, -SUFFIX.length));
      }
    } catch (e) { /* brak dostępu */ }
    Object.keys(memory).forEach(function (pid) { if (out.indexOf(pid) === -1) out.push(pid); });
    return out;
  }

  function removeProfile(pid) {
    delete memory[pid];
    try { window.localStorage.removeItem(keyOf(pid)); } catch (e) { /* brak dostępu */ }
  }

  /** Część eksportu: { <profileId>: stan } (tylko profile z danymi). */
  function exportData() {
    const out = {};
    storedIds().forEach(function (pid) { out[pid] = JSON.parse(JSON.stringify(load(pid))); });
    return out;
  }

  /** Część importu: brak (stary plik) → null; zły format → wyjątek z opisem. */
  function parseImport(raw) {
    if (raw === undefined || raw === null) return null;
    if (typeof raw !== "object" || Array.isArray(raw)) throw new Error("Część „szlak” pliku ma nieprawidłowy format.");
    const out = {};
    Object.keys(raw).slice(0, 500).forEach(function (pid) {
      if (typeof pid !== "string" || pid.length > 80) return;
      out[pid] = L().sanitizeState(raw[pid]); // wyjątek = cały import odrzucony
    });
    return out;
  }

  /** Zapis importu: część obecna w pliku zastępuje dane Szlaku; profile spoza listy są usuwane. */
  function applyImport(parsed, profileIds) {
    if (parsed) {
      storedIds().forEach(function (pid) { if (!parsed[pid]) removeProfile(pid); });
      Object.keys(parsed).forEach(function (pid) { memory[pid] = parsed[pid]; save(pid); });
    }
    if (profileIds) storedIds().forEach(function (pid) { if (profileIds.indexOf(pid) === -1) removeProfile(pid); });
  }

  function clearAll() { storedIds().forEach(removeProfile); }

  ELM.szlakStore = {
    keyOf: keyOf, load: load, data: data, save: save,
    setStart: setStart, recordQuiz: recordQuiz, skipStop: skipStop, unskipStop: unskipStop, recordReview: recordReview,
    exportData: exportData, parseImport: parseImport, applyImport: applyImport, removeProfile: removeProfile, clearAll: clearAll
  };
})(window.ELM);
