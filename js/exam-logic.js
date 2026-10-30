/*
 * exam-logic.js — czysta logika egzaminów (bez DOM; testy w tools/testy.js).
 * Specyfikacja: docs/rozbudowa-v2/spec/05-egzaminy-i-egzamin-osmoklasisty.md, 5.1–5.2.
 *
 *   countWordsE8(text, opening)   liczba wyrazów wg reguł egzaminu ósmoklasisty:
 *       wyrazy oddzielone spacją; skróty (don't), wyrazy z dywizem, liczby, adresy e-mail,
 *       numery telefonów = 1 wyraz; emotikony i podpis „XYZ” się nie liczą; podany początek
 *       (opening) też nie, jeśli użytkownik go przepisał
 *   writingZone(n, T)             strefa licznika: low (< warnBelow), warn (< min), ok, over (> max)
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const HAS_WORD_CHAR = /[\p{L}\p{N}]/u;

  function countWordsE8(text, opening) {
    let t = String(text || "").replace(/\r\n/g, "\n").trim();
    const open = String(opening || "").trim();
    if (open && t.slice(0, open.length).toLowerCase() === open.toLowerCase()) t = t.slice(open.length);
    return t.split(/\s+/).filter(function (w) {
      if (!w || !HAS_WORD_CHAR.test(w)) return false;                      // emotikony, same znaki
      if (w.replace(/[^\p{L}\p{N}]/gu, "") === "XYZ") return false;        // podpis
      return true;
    }).length;
  }

  /** T: { wordRange: [min, max], warnBelow }. */
  function writingZone(n, T) {
    const min = T.wordRange[0], max = T.wordRange[1];
    if (T.warnBelow && n < T.warnBelow) return "low";
    if (n < min) return "warn";
    if (n > max) return "over";
    return "ok";
  }

  /**
   * A8: przed którą sekcją artykułu wstawić ramki „Na egzaminie …”. titles = nagłówki ## po kolei.
   * Pierwsza z: Życie i egzamin, Typowe błędy Polaków, Ćwiczenie; gdy żadnej nie ma — przed sekcją
   * z odpowiedziami; gdy i jej nie ma — -1 (na koniec artykułu).
   */
  function examBoxAnchorIndex(titles) {
    const norm = titles.map(function (s) { return String(s || "").trim().toLowerCase(); });
    const before = ["życie i egzamin", "typowe błędy polaków", "ćwiczenie"];
    for (let i = 0; i < norm.length; i++) if (before.indexOf(norm[i]) !== -1) return i;
    for (let i = 0; i < norm.length; i++) if (norm[i] === "odpowiedzi" || norm[i] === "przykładowe odpowiedzi") return i;
    return -1;
  }

  // ---------- B1/B2: daty i „Moje egzaminy” ----------

  const MONTHS_GEN = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  const WEEKDAYS = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

  function dayNumber(day) {
    const m = DAY.exec(day || "");
    return m ? Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000) : null;
  }

  function localToday() {
    const n = new Date();
    return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
  }

  /** Liczba dni od today do day ("RRRR-MM-DD"); ujemna = data minęła; null przy złej dacie. */
  function daysBetween(day, today) {
    const a = dayNumber(day), b = dayNumber(today || localToday());
    return a === null || b === null ? null : a - b;
  }

  /** "2027-05-06" → "czwartek, 6 maja 2027" (bez zależności od ICU przeglądarki). */
  function formatDatePl(day) {
    const m = DAY.exec(day || "");
    if (!m) return "";
    const wd = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
    return WEEKDAYS[wd] + ", " + Number(m[3]) + " " + MONTHS_GEN[Number(m[2]) - 1] + " " + m[1];
  }

  /**
   * Stan potrzebny do myExams z surowych danych: input = { registry, examsRecord: { exams: {id: {examDate}}, my },
   * c1: { examDate, best }, isSetDone(setId) }. Egzamin „existing” (C1) bierze datę i wyniki z elm_c1_v1.
   * Zwraca { dates, doneSets, totalSets, my }.
   */
  function examMyState(input) {
    const rec = input.examsRecord || {};
    const c1 = input.c1 || {};
    const out = { dates: {}, doneSets: {}, totalSets: {}, my: (rec.my && typeof rec.my === "object") ? rec.my : {} };
    ((input.registry && input.registry.exams) || []).forEach(function (e) {
      const ids = e.setIds || [];
      out.totalSets[e.id] = ids.length;
      if (e.existing) {
        out.dates[e.id] = typeof c1.examDate === "string" ? c1.examDate : "";
        out.doneSets[e.id] = ids.filter(function (id) { return c1.best && typeof c1.best[id] === "number"; }).length;
      } else {
        const x = rec.exams && rec.exams[e.id];
        out.dates[e.id] = x && typeof x.examDate === "string" ? x.examDate : "";
        out.doneSets[e.id] = ids.filter(function (id) { return input.isSetDone && input.isSetDone(id); }).length;
      }
    });
    return out;
  }

  /**
   * Egzaminy „moje”: ustawiona data albo ukończony zestaw (i nie odpięty ręcznie), albo ręcznie przypięte.
   * state = examMyState(...). Zwraca [{ id, reason: "date"|"sets"|"pinned", days }] — najpierw najbliższe daty
   * (dziś i przyszłe rosnąco), potem miniony termin (najświeższy pierwszy), na końcu bez daty (kolejność rejestru).
   */
  function myExams(state, registry, today) {
    const out = [];
    ((registry && registry.exams) || []).forEach(function (e, order) {
      if (e.status !== "active") return;
      const flag = state.my && state.my[e.id];
      if (flag === "hidden") return;
      const date = state.dates && state.dates[e.id];
      const days = date ? daysBetween(date, today) : null;
      const done = (state.doneSets && state.doneSets[e.id]) || 0;
      let reason = null;
      if (days !== null) reason = "date";
      else if (done > 0) reason = "sets";
      else if (flag === "pinned") reason = "pinned";
      if (reason) out.push({ id: e.id, reason: reason, days: days, order: order });
    });
    function rank(x) { return x.days === null ? 2 : x.days >= 0 ? 0 : 1; }
    out.sort(function (a, b) {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      if (ra === 0 && a.days !== b.days) return a.days - b.days;
      if (ra === 1 && a.days !== b.days) return b.days - a.days;
      return a.order - b.order;
    });
    return out.map(function (x) { return { id: x.id, reason: x.reason, days: x.days }; });
  }

  /**
   * Podział egzaminów w pasku: { shown, hidden } (id w kolejności rejestru dla hidden, w kolejności „moich” dla shown).
   * mineIds = id z myExams; currentId = egzamin otwarty na ekranie (zostaje w pasku, choćby nie był „mój”).
   * Brak moich → wszystkie jak dawniej, bez „+N”.
   */
  function navSplit(registry, mineIds, currentId) {
    const all = ((registry && registry.exams) || []).map(function (e) { return e.id; });
    if (!mineIds || !mineIds.length) return { shown: all, hidden: [] };
    const shown = mineIds.filter(function (id) { return all.indexOf(id) !== -1; });
    if (currentId && all.indexOf(currentId) !== -1 && shown.indexOf(currentId) === -1) shown.push(currentId);
    return { shown: shown, hidden: all.filter(function (id) { return shown.indexOf(id) === -1; }) };
  }

  ELM.examLogic = {
    navSplit: navSplit,
    countWordsE8: countWordsE8, writingZone: writingZone, examBoxAnchorIndex: examBoxAnchorIndex,
    daysBetween: daysBetween, formatDatePl: formatDatePl, localToday: localToday, examMyState: examMyState, myExams: myExams
  };
})(window.ELM);
