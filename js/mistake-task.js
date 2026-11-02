/*
 * mistake-task.js — pozycja „błąd” w sesji Fiszki i błędy: gdy wpis dziennika ma ref do zadania, sesja pokazuje ORYGINALNE zadanie
 * (z jego podpowiedzią: słowo bazowe, opcje A–D, słowo kluczowe i części zdania, forma w nawiasie) zamiast karty zbudowanej z tekstu wpisu.
 *
 *   Czysta logika (testy: node tools/testy.js):
 *     parseRef(ref)            "ex:<idZadania>" | "<c1|e8|mp|mr|b2>:<idZestawu>:<nr>" → { kind, … } albo null
 *     viewFor(entry)           "task" (wpis z rozpoznanym ref) | "card" (ręczny, bez ref, ref nieznany)
 *     singleText(text, n)      zdanie z luką n z tekstu cloze (pozostałe luki jako „…”), z markerem {{n}}
 *     singleExercise(ex, n)    zestaw C1 zawężony do jednej luki / jednego zdania transformacji
 *   Z danymi i DOM:
 *     load(entry)              Promise → { kind: "engine", item } | { kind: "c1", ex, … } | null (nie znaleziono zadania → karta)
 *     mount(root, desc, entry, onDone)   widok zadania C1 w sesji; onDone({ correct })
 * Zadania silnika ćwiczeń (ref „ex:…”) rysuje ELM.exercises.startSingle (js/fiszki.js).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  function el() { return ELM.utils.el.apply(null, arguments); }

  // =====================================================================
  // CZYSTA LOGIKA
  // =====================================================================

  function parseRef(ref) {
    const s = String(ref || "");
    let m = /^ex:([a-z0-9][a-z0-9-]*)$/.exec(s);
    if (m) return { kind: "ex", itemId: m[1] };
    m = /^([a-z0-9]{1,8}):([a-z0-9][a-z0-9-]*):(\d{1,3})$/.exec(s);
    if (m) return { kind: "set", prefix: m[1], setId: m[2], n: Number(m[3]) };
    return null;
  }

  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase(); }

  /** Czy dwa teksty (reguła z wpisu i wyjaśnienie zadania) to ta sama treść — wtedy pokazujemy ją raz. */
  function sameText(a, b) { return !!norm(a) && norm(a) === norm(b); }

  /** Wyjaśnienie zadania zawężonego do jednej luki / jednego zdania. */
  function explanationOf(ex) {
    if (!ex) return "";
    if (ex.type === "transformation") return ex.items && ex.items[0] ? ex.items[0].explanation : "";
    return ex.gaps && ex.gaps[0] ? ex.gaps[0].explanation : "";
  }

  function viewFor(entry) { return entry && parseRef(entry.ref) ? "task" : "card"; }

  /** Zdanie z luką n (pozostałe luki jako „…”), z markerem {{n}}, żeby zadanie rysowało się istniejącym widokiem luki. */
  function singleText(text, n) {
    const marker = "{{" + n + "}}";
    const sentences = String(text).match(/[^.!?]+[.!?]+['’”]?|[^.!?]+$/g) || [String(text)];
    const hit = sentences.find(function (s) { return s.indexOf(marker) !== -1; }) || String(text);
    return hit.trim().replace(/\{\{(\d+)\}\}/g, function (m, k) { return Number(k) === n ? m : "…"; });
  }

  /** Zestaw C1 zawężony do jednej luki (cloze: tylko zdanie z tą luką) albo jednego zdania (transformacja). null, gdy brak pozycji. */
  function singleExercise(ex, n) {
    if (!ex) return null;
    const copy = Object.assign({}, ex);
    if (ex.type === "transformation") {
      const item = (ex.items || []).find(function (i) { return i.n === n; });
      if (!item) return null;
      copy.items = [item];
      return copy;
    }
    const gap = (ex.gaps || []).find(function (g) { return g.n === n; });
    if (!gap) return null;
    copy.gaps = [gap];
    copy.text = singleText(ex.text, n);
    copy.maxScore = 1;
    return copy;
  }

  // =====================================================================
  // ŁADOWANIE ZADANIA
  // =====================================================================

  function examByCode(code) {
    const reg = ELM.EXAM_REGISTRY && ELM.EXAM_REGISTRY.exams || [];
    return reg.find(function (e) { return !e.existing && String(e.code).toLowerCase() === code; }) || null;
  }

  function loadExamData(exam) {
    if (ELM.EXAMS && ELM.EXAMS[exam.id]) return Promise.resolve(ELM.EXAMS[exam.id]);
    const src = ELM.exercises ? ELM.exercises.asset("niezbednik/" + exam.id + "-dane.js") : "niezbednik/" + exam.id + "-dane.js";
    return ELM.loadScript(src).then(function () { return (ELM.EXAMS && ELM.EXAMS[exam.id]) || null; }, function () { return null; });
  }

  /** Oryginalne zadanie wpisu albo null (wpis ręczny, usunięty zestaw, brak pliku — wtedy sesja pokazuje kartę). */
  function load(entry) {
    const ref = parseRef(entry && entry.ref);
    if (!ref) return Promise.resolve(null);
    if (ref.kind === "ex") {
      if (!ELM.exercises) return Promise.resolve(null);
      const setId = ref.itemId.replace(/-\d{1,3}$/, "");
      return ELM.exercises.loadSets([setId]).then(function (sets) {
        const item = sets[0] && sets[0].items.find(function (i) { return i.id === ref.itemId; });
        return item ? { kind: "engine", item: item } : null;
      }, function () { return null; });
    }
    const make = function (set) {
      const ex = singleExercise(set, ref.n);
      return ex && ELM.c1Exercises && ELM.c1Exercises.single ? { kind: "c1", ex: ex, n: ref.n, prefix: ref.prefix, category: entry.category || "Use of English" } : null;
    };
    if (ref.prefix === "c1") return Promise.resolve(make(ELM.C1 && ELM.C1.exercises && ELM.C1.exercises[ref.setId]));
    const exam = examByCode(ref.prefix);
    if (!exam) return Promise.resolve(null);
    return loadExamData(exam).then(function (d) { return make(d && d.exercises && d.exercises[ref.setId]); });
  }

  // =====================================================================
  // WIDOK ZADANIA C1 W SESJI
  // =====================================================================

  /**
   * Zadanie C1 / egzaminu w sesji: instrukcja, istniejący widok luki albo transformacji (opcje A–D, słowo bazowe,
   * słowo kluczowe, część zdania przed i po luce), „Sprawdź”, wyjaśnienie, reguła z wpisu i „Dalej”.
   * onDone({ correct }) po „Dalej”: poprawnie = Dobrze, błędnie = Znowu (ocenia sesja).
   */
  function mount(root, desc, entry, onDone) {
    const ex = desc.ex;
    const part = ELM.c1Exercises.single(ex, { category: desc.category, refPrefix: desc.prefix === "c1" ? "c1:" + ex.id : desc.prefix + ":" + ex.id });
    let score = null;
    const result = el("p", { class: "c1-ex-result", "aria-live": "polite" });
    const rule = el("p", { class: "fc-extra", hidden: true }, [el("span", { class: "review-label", text: "Reguła: " }), document.createTextNode(String(entry.rule || ""))]);
    const check = el("button", { type: "button", class: "btn btn-primary", onclick: function () {
      if (score !== null) { onDone({ correct: score === part.max }); return; }
      score = part.check();
      const ok = score === part.max;
      result.replaceChildren(el("strong", { text: ok ? "Dobrze" : "Błędnie" }));
      if (!ok) part.showAnswers(); // błędna albo pusta odpowiedź: pokaż poprawną (przy dobrej nie zdradzamy modelu)
      if (entry.rule && !sameText(entry.rule, explanationOf(ex))) rule.hidden = false; // wyjaśnienie zadania już jest pod odpowiedzią — nie dublujemy
      check.textContent = "Dalej";
      check.focus({ preventScroll: true });
    } }, "Sprawdź");
    root.appendChild(el("section", { class: "card c1-ex c1-ex-" + ex.type + " mt-task" }, [
      el("p", { class: "tool-eyebrow", text: "Błąd z dziennika · " + (entry.source || ex.title) }),
      el("p", { class: "c1-ex-instr" }, ELM.markdown.inline(ex.instructions || "")),
      part.node,
      el("div", { class: "c1-ex-actions" }, [check, result]),
      rule
    ]));
    setTimeout(function () { const f = root.querySelector("select, input"); if (f) f.focus({ preventScroll: true }); }, 0);
  }

  ELM.mistakeTask = { sameText: sameText, explanationOf: explanationOf, parseRef: parseRef, viewFor: viewFor, singleText: singleText, singleExercise: singleExercise, load: load, mount: mount };
})(window.ELM);
