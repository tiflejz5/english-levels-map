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

  ELM.examLogic = { countWordsE8: countWordsE8, writingZone: writingZone, examBoxAnchorIndex: examBoxAnchorIndex };
})(window.ELM);
