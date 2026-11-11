/*
 * szlak.js — widok Szlaku (spec v7 13, sekcja 4): ścieżka nauki A1 → C2 z krainami, odcinkami, przystankami, powtórkami
 * i odnogami egzaminów; arkusz przystanku (Przeczytaj → Sprawdź się → Zaliczone / Pomiń); quizy i powtórki w silniku zadań.
 *
 *   #/szlak              widok szlaku (bieżący przystanek przewinięty do widoku)
 *   #/szlak/<idPrzystanku>   jak wyżej, z otwartym arkuszem przystanku (linki z „Dziś”; adres wraca do #/szlak)
 *
 * Czysta logika: js/szlak-logic.js. Stan: js/szlak-store.js (elm.<profil>.szlak). Dane: szlak/szlak-dane.js (ELM.SZLAK,
 * ładowane przy starcie) i szlak/quizy-<poziom>.js (ELM.SZLAK_QUIZY, na żądanie).
 * Dostępność: lista przystanków to <ol> z przyciskami, stan zapisany tekstem („zaliczony”, „bieżący”, „pominięty”).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const HASH = "#/szlak";
  const ROW = 108;                 // wysokość wiersza przystanku (px)
  const ACC = { A1: "Polanę", A2: "Las", B1: "Wzgórza", B2: "Jezioro", C1: "Góry", C2: "Szczyt" }; // „Zalecamy najpierw skończyć …”
  const LOC = { A1: "na Polanie", A2: "w Lesie", B1: "na Wzgórzach", B2: "nad Jeziorem", C1: "w Górach", C2: "na Szczycie" };
  const CAT_ICON = { g: "notebook-text", f: "arrow-left-right", v: "layers", mix: "sparkles" };
  const CAT_NAME = { g: "gramatyka", f: "funkcje", v: "słownictwo", mix: "mieszany" };
  const STATUS_TEXT = { done: "zaliczony", current: "bieżący", open: "otwarty", skipped: "pominięty" };

  function SL() { return ELM.szlakLogic; }
  function ST() { return ELM.szlakStore; }
  function pd() { return ELM.profileData; }
  function hasProfile() { return !!(ELM.app && ELM.app.getActiveProfile()); }
  function plural(n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10, t = n % 100;
    return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
  }

  // =====================================================================
  // DANE I STAN
  // =====================================================================

  /** Dane szlaku są wczytane (skrypt startowy), a logika i magazyn gotowe. */
  function loaded() { return !!(ELM.SZLAK && ELM.szlakLogic && ELM.szlakStore); }
  /** Szlak da się policzyć dla aktywnego profilu. */
  function ready() { return loaded() && hasProfile() && !!(ELM.state && ELM.state.content); }

  function env() {
    return {
      isUmiem: function (id) { return ELM.state.progress[id] === true; },
      setPercent: function (setId) { const r = pd() ? pd().setScore(setId) : null; return r && r.best.total ? Math.round(100 * r.best.score / r.best.total) : null; }
    };
  }

  function testLevel() { const t = hasProfile() && pd() ? pd().lastTest() : null; return t && t.level ? t.level : null; }

  /** Punkt startu aktywnego profilu: { level, source, at }. */
  function startInfo() { return SL().effectiveStart(ST().data(), testLevel()); }

  /** Cały szlak z bieżącym stanem (142 węzły — liczone na bieżąco, bez pamięci podręcznej, więc nigdy nieaktualne). */
  function trail() { return SL().buildTrail(ELM.SZLAK, ST().data(), env(), startInfo().level); }

  function nodeById(tr, id) { return tr.nodes.find(function (n) { return n.id === id; }) || null; }

  function itemCat(id) { const m = /^e_[a-c]\d_([gfv])\d+$/.exec(id); return m ? m[1] : null; }
  function stopCat(stop) {
    const cats = {};
    (stop.items || []).forEach(function (i) { const c = itemCat(i); if (c) cats[c] = true; });
    const keys = Object.keys(cats);
    return keys.length === 1 ? keys[0] : "mix";
  }

  function pageHref(stop) { return "#/" + stop.page; }
  function setHref(stop) { return "#/cwiczenia/zestaw/" + stop.set; }

  /** Tekst do etykiet: „Przystanek 7 z 22 na Polanie”. */
  function positionText(n) { return "Przystanek " + n.number + " z " + n.levelTotal + " " + LOC[n.level]; }

  // =====================================================================
  // API DLA INNYCH WIDOKÓW (Dziś, strona tematu, strona poziomu, statystyki)
  // =====================================================================

  /** Bieżący przystanek aktywnego profilu albo null: { node, unit: { done, total, index, count, title }, level } */
  function current() {
    if (!ready()) return null;
    const tr = trail();
    if (!tr.current) return null;
    return { node: tr.current, unit: SL().unitProgress(tr, tr.current.unitId), level: tr.current.level, trail: tr };
  }

  /** Postęp krainy z uwzględnieniem punktu startu: { done, total, percent, skipped }. */
  function levelInfo(level) {
    if (!ready()) return null;
    const tr = trail();
    const p = SL().levelProgress(tr, level);
    return Object.assign(p, { skipped: SL().LEVELS.indexOf(level) < tr.startIndex && p.percent < 100, isCurrent: !!(tr.current && tr.current.level === level) });
  }

  function startLevelId() { return ready() ? startInfo().level : null; }

  /** Pasek „Przystanek N z M” na dole strony tematu (page: „a1/czasy-present-simple”) albo null. */
  function barFor(page) {
    if (!loaded()) return null;
    let found = null;
    ELM.SZLAK.levels.forEach(function (lv) { lv.units.forEach(function (u) { u.stops.forEach(function (s) { if (s.type === "lesson" && s.page === page && !found) found = s.id; }); }); });
    if (!found) return null;
    const guest = !hasProfile();
    const tr = guest ? SL().buildTrail(ELM.SZLAK, SL().emptyState(), { isUmiem: function () { return false; }, setPercent: function () { return null; } }, "A1") : trail();
    const n = nodeById(tr, found);
    if (!n) return null;
    const lessons = tr.nodes.filter(function (x) { return x.type === "lesson"; });
    const next = lessons.slice(lessons.indexOf(n) + 1).find(function (x) { return x.status !== "done" && x.status !== "skipped"; }) || lessons[lessons.indexOf(n) + 1] || null;
    const actions = [];
    if (n.stop.quiz) actions.push(el("button", { type: "button", class: "btn btn-primary btn-small", onclick: function () { startQuiz(n); } }, ELM.ui.withIcon("play", "Sprawdź się (4 pytania)")));
    else actions.push(el("button", { type: "button", class: "btn btn-secondary btn-small", onclick: function () { openSheet(n.id); } }, "Otwórz przystanek na szlaku"));
    if (next) actions.push(el("a", { class: "btn btn-secondary btn-small", href: HASH + "/" + next.id }, ELM.ui.withIcon("arrow-right", "Następny przystanek")));
    return el("aside", { class: "card sz-bar lvl-" + n.level, "aria-label": "Szlak: " + positionText(n) }, [
      el("p", { class: "sz-bar-text" }, [
        el("span", { class: "sz-bar-land", "aria-hidden": "true" }, ELM.ui.landIcon(n.level, { size: 22 })),
        el("span", null, [el("strong", { text: positionText(n) }), n.status === "done" ? el("span", { class: "sz-bar-done", text: " · zaliczony" }) : null])
      ]),
      el("div", { class: "sz-bar-actions" }, actions)
    ]);
  }

  // =====================================================================
  // ŁADOWANIE QUIZÓW I POWTÓREK
  // =====================================================================

  function loadQuizzes(level) {
    const lvl = String(level).toLowerCase();
    if (ELM.SZLAK_QUIZY && Object.keys(ELM.SZLAK_QUIZY).some(function (k) { return k.indexOf("szlak-" + lvl + "-") === 0; })) return Promise.resolve();
    return ELM.loadModule("szlak/quizy-" + lvl + ".js").catch(function () { /* poziom bez quizów */ });
  }

  /** Zadania quizu w formacie silnika (temat, poziom i zestaw potrzebne do dziennika podejść i statystyk). */
  function quizItems(quiz) {
    return quiz.items.map(function (it) { return Object.assign({ topic: quiz.topic, level: quiz.level, setId: quiz.id, tags: ["szlak"] }, it); });
  }

  /** Quiz przystanku (po załadowaniu poziomu) albo null. */
  function quizById(id) { return (ELM.SZLAK_QUIZY && ELM.SZLAK_QUIZY[id]) || null; }

  function startQuiz(n) {
    ELM.app.withProfile("Wynik quizu zapisuje się w profilu.", function () {
      loadQuizzes(n.level).then(function () {
        const quiz = quizById(n.stop.quiz);
        if (!quiz) { ELM.ui.toast({ text: "Ten przystanek nie ma jeszcze quizu.", icon: "info" }); return; }
        closeSheet();
        runSession({
          title: quiz.title, intro: quiz.intro, items: quizItems(quiz), kind: "quiz", node: n, quiz: quiz
        });
      });
    });
  }

  function startReview(n) {
    ELM.app.withProfile("Wynik powtórki zapisuje się w profilu.", function () {
      const level = n.level;
      const stops = {};
      ELM.SZLAK.levels.forEach(function (lv) { lv.units.forEach(function (u) { u.stops.forEach(function (s) { stops[s.id] = s; }); }); });
      const setIds = (n.stop.from || []).map(function (id) { return stops[id] && stops[id].set; }).filter(Boolean);
      Promise.all([loadQuizzes(level), setIds.length ? ELM.exercises.loadSets(setIds) : Promise.resolve([]), ELM.levelFinal ? ELM.levelFinal.load(level) : Promise.resolve(null)]).then(function (res) {
        const sets = {};
        res[1].forEach(function (s) { sets[s.id] = s.items || []; });
        const src = {
          stops: stops,
          quizItems: function (id) { const s = stops[id]; const q = s && s.quiz ? quizById(s.quiz) : null; return q ? quizItems(q) : []; },
          setItems: function (setId) { return sets[setId] || []; },
          finalItems: function () { return res[2] && res[2].items ? res[2].items : []; }
        };
        const pick = SL().pickReview(Object.assign({ level: level }, n.stop), src, Math.random);
        if (!pick.source || !pick.items.length) { ELM.ui.toast({ text: "Powtórka dostępna po dodaniu quizów.", icon: "info" }); return; }
        closeSheet();
        runSession({ title: n.stop.title, intro: "Powtórka: " + pick.items.length + " pytań z tego odcinka.", items: pick.items, kind: "review", node: n });
      });
    });
  }

  /** Sesja w silniku zadań (js/exercise-engine.js, startCustom) z własnym zapisem wyniku i ekranem wyniku. */
  function runSession(cfg) {
    const n = cfg.node;
    ELM.exercises.startCustom({
      title: cfg.title, intro: cfg.intro, items: cfg.items, mode: "learn", autostart: true, // klucz „custom:” — sesja pod #/cwiczenia/sesja
      back: { href: HASH, label: "Wróć na szlak" },
      hooks: {
        finish: function (run, s) {
          if (cfg.kind === "quiz") {
            const rec = ST().recordQuiz(n.id, s.score);
            return { kind: "quiz", passed: s.score >= SL().PASS_QUIZ, best: rec ? rec.best : s.score };
          }
          ST().recordReview(n.id, s.score, s.total);
          return { kind: "review", passed: true, best: s.score };
        },
        afterFinish: function () { if (ELM.app.refreshLearning) ELM.app.refreshLearning(); },
        renderDone: function (view, run, api) { renderResult(view, run, api, cfg); }
      }
    });
  }

  /** Ekran wyniku quizu / powtórki: wynik, zaliczenie, propozycja „Umiem” (nigdy automatyczna), dalsze kroki. */
  function renderResult(view, run, api, cfg) {
    const n = cfg.node, fin = run.final || { passed: false };
    const tr = trail();
    const node = nodeById(tr, n.id) || n;
    const next = nextLesson(tr, node);
    const isQuiz = cfg.kind === "quiz";
    view.className = "view tool-view ex-view sz-result-view lvl-" + n.level;
    document.title = (isQuiz ? "Wynik quizu" : "Wynik powtórki") + " · Szlak · English Levels Map";
    view.appendChild(el("header", { class: "tool-head" }, [
      ELM.ui.breadcrumbs([{ label: "Szlak", href: HASH }, { label: cfg.title }]),
      el("h1", { class: "tool-title", text: isQuiz ? "Wynik: " + n.stop.title : cfg.title })
    ]));
    const needed = SL().PASS_QUIZ;
    const wrong = run.items.filter(api.isWrong);
    const missing = isQuiz ? (n.stop.items || []).filter(function (id) { return ELM.state.progress[id] !== true; }) : [];
    const umiemBox = isQuiz && fin.passed && missing.length ? el("div", { class: "ex-umiem", role: "status" }, [
      el("span", { class: "ex-umiem-icon", "aria-hidden": "true" }, ELM.icon("sparkles", { size: 20 })),
      el("div", { class: "ex-umiem-body" }, [
        el("p", null, [el("strong", { text: "Zaznaczyć „Umiem”? " }), "Quiz zaliczony, ale „Umiem” zaznaczysz tylko Ty. Zaznaczyć dla: " + node.stop.title + "?"]),
        el("p", { class: "ex-journal-actions" }, el("button", { type: "button", class: "btn btn-primary btn-small", onclick: function (e) {
          missing.forEach(function (id) { ELM.app.setProgress(id, true); });
          e.currentTarget.closest(".ex-umiem").replaceWith(el("div", { class: "ex-umiem is-done", role: "status" }, [ELM.icon("check", { size: 18 }), el("p", { text: "Zaznaczono „Umiem”. Brawo!" })]));
        } }, ELM.ui.withIcon("check", "Zaznacz „Umiem”")))
      ])
    ]) : null;
    view.appendChild(el("section", { class: "card ex-result sz-result " + (fin.passed ? "is-passed" : "is-failed"), "aria-live": "polite" }, [
      el("p", { class: "ex-result-score" }, [el("strong", { class: "num", text: run.score + "/" + run.total }), el("span", { class: "ex-result-pct num", text: Math.round(100 * run.score / Math.max(1, run.total)) + "%" })]),
      isQuiz
        ? el("p", { class: "lf-verdict" }, [
          el("span", { class: "c1-mark " + (fin.passed ? "is-ok" : "is-bad"), "aria-hidden": "true" }, ELM.icon(fin.passed ? "check" : "x", { size: 16 })),
          el("strong", { text: fin.passed ? "Przystanek zaliczony" : "Jeszcze nie" }),
          el("span", { class: "lf-need", text: " – próg " + needed + " z " + run.total + " dobrych odpowiedzi" })
        ])
        : el("p", { class: "tool-note", text: "Powtórka zapisana. Wynik nie blokuje dalszej drogi, błędne odpowiedzi trafiły do dziennika." }),
      umiemBox,
      wrong.length ? el("div", { class: "sz-wrong" }, [
        el("h2", { class: "lf-h", text: "Do powtórzenia (" + wrong.length + ")" }),
        el("ul", { class: "lf-topic-list" }, wrong.map(function (p) { return el("li", null, [api.itemSummary(p.item), el("span", { class: "tool-note", text: " → " + api.modelAnswer(p.item) })]); }))
      ]) : el("p", { class: "tool-note", text: "Bez błędów – brawo!" }),
      api.journalSummary(),
      el("div", { class: "tool-actions" }, [
        next && (fin.passed || !isQuiz) ? el("a", { class: "btn btn-primary", href: HASH + "/" + next.id }, ELM.ui.withIcon("arrow-right", "Następny przystanek")) : null,
        isQuiz && !fin.passed ? el("button", { type: "button", class: "btn btn-primary", onclick: function () { startQuiz(node); } }, ELM.ui.withIcon("rotate-ccw", "Spróbuj jeszcze raz")) : null,
        isQuiz && !fin.passed ? el("a", { class: "btn btn-secondary", href: pageHref(node.stop) }, "Przeczytaj jeszcze raz") : null,
        el("a", { class: "btn btn-secondary", href: HASH }, "Wróć na szlak")
      ])
    ]));
  }

  function nextLesson(tr, node) {
    const lessons = tr.nodes.filter(function (x) { return x.type === "lesson" && x.levelIndex >= tr.startIndex; });
    const i = lessons.findIndex(function (x) { return x.id === node.id; });
    const after = i === -1 ? lessons : lessons.slice(i + 1);
    return after.find(function (x) { return x.status === "open"; }) || null;
  }

  // =====================================================================
  // ARKUSZ PRZYSTANKU
  // =====================================================================

  let sheet = null;

  function closeSheet() { if (sheet) { sheet.close(); sheet = null; } }

  function openSheet(id, opts) {
    if (!ready()) { ELM.app.withProfile("Szlak zapisuje postęp w profilu.", function () { openSheet(id, opts); }); return; }
    opts = opts || {};
    closeSheet();
    const body = el("div", { class: "sz-sheet-body" });
    sheet = ELM.dialogs.open({
      title: "", className: "dialog-sz sz-sheet", body: body, cancelValue: false,
      actions: [{ label: "Zamknij", value: false, autofocus: true }]
    });
    const sh = sheet;
    sh.result.then(function () { if (sheet === sh) sheet = null; });
    paintSheet(body, id, opts);
  }

  /** Czy przystanek leży w dalszej krainie niż bieżąca, a poprzednia nie ma zaliczonego testu końcowego (spec 3.3). */
  function recommendFirst(tr, n) {
    const cur = tr.current;
    if (!cur || n.levelIndex <= cur.levelIndex) return null;
    const prev = SL().LEVELS[n.levelIndex - 1];
    const passed = pd() ? pd().passedLevels() : {};
    return passed[prev] ? null : cur.level;
  }

  function paintSheet(body, id, opts) {
    const tr = trail();
    const n = nodeById(tr, id);
    const dlg = body.closest("dialog");
    if (!n) { body.replaceChildren(el("p", { text: "Nie ma takiego przystanku." })); return; }
    const title = dlg && dlg.querySelector(".dialog-title");
    if (title) title.textContent = n.stop.title;
    const parts = [];
    const st = n.current ? "current" : n.status;
    parts.push(el("p", { class: "sz-sheet-meta" }, [
      n.type === "lesson" ? positionText(n) : "Powtórka · " + n.unitTitle,
      " · ", el("strong", { class: "sz-state is-" + st, text: STATUS_TEXT[st] }),
      n.via === "start" ? " (pominięty testem poziomu)" : n.via === "skip" ? " (pominięty przez Ciebie)" : n.via === "quiz" ? " (quizem)" : n.via === "umiem" ? " (całe „Umiem”)" : n.via === "set" ? " (zestawem)" : ""
    ]));

    const rec = opts.force ? null : recommendFirst(tr, n);
    if (rec) {
      parts.push(el("div", { class: "sz-recommend", role: "note" }, [
        el("p", { text: "Zalecamy najpierw skończyć " + ACC[rec] + ". Dalsze krainy są otwarte, ale szlak podpowiada kolejność." }),
        el("button", { type: "button", class: "btn btn-secondary btn-small", onclick: function () { paintSheet(body, id, { force: true }); } }, "Mimo to otwórz")
      ]));
      body.replaceChildren.apply(body, parts);
      return;
    }

    if (n.type === "review") {
      parts.push(el("p", { text: "Sześć pytań z przystanków tego odcinka. Wynik nie blokuje dalszej drogi, błędne odpowiedzi trafiają do dziennika błędów." }));
      const r = ST().data().reviews[n.id];
      if (r) parts.push(el("p", { class: "tool-note", text: "Najlepszy wynik: " + r.best + "/" + r.of + "." }));
      parts.push(el("div", { class: "sz-sheet-actions" }, [
        el("button", { type: "button", class: "btn btn-primary", onclick: function () { startReview(n); } }, ELM.ui.withIcon("play", r ? "Powtórz jeszcze raz" : "Zacznij powtórkę"))
      ]));
      body.replaceChildren.apply(body, parts);
      return;
    }

    // punkty checklisty z „Umiem”
    const content = ELM.state.content;
    const textOf = {};
    content.levels.forEach(function (lv) { Object.keys(lv.content).forEach(function (cat) { lv.content[cat].essentials.forEach(function (e) { textOf[e.id] = e.text; }); }); });
    parts.push(el("h3", { class: "sz-sheet-h", text: "Czego się tu uczysz" }));
    parts.push(el("ul", { class: "sz-items" }, (n.stop.items || []).map(function (itemId) {
      const done = ELM.state.progress[itemId] === true;
      const cid = "sz-i-" + itemId;
      return el("li", null, el("label", { class: "sz-item", for: cid }, [
        el("input", { type: "checkbox", id: cid, checked: done, onchange: function (e) {
          ELM.app.setProgress(itemId, e.target.checked);
          paintSheet(body, id, Object.assign({}, opts, { force: true }));
          refreshView();
        } }),
        el("span", { text: String(textOf[itemId] || itemId).replace(/\s*\(.*\)\s*$/, "") })
      ]));
    })));

    // krok 1 i 2
    parts.push(el("ol", { class: "sz-steps" }, [
      el("li", null, [el("strong", { text: "Przeczytaj" }), el("a", { class: "btn btn-secondary btn-small", href: pageHref(n.stop), onclick: closeSheet }, ELM.ui.withIcon("file-text", "Otwórz stronę tematu"))]),
      el("li", null, [el("strong", { text: "Sprawdź się" }), el("span", { class: "sz-step-actions" }, [
        n.stop.quiz ? el("button", { type: "button", class: "btn btn-primary btn-small", onclick: function () { startQuiz(n); } }, ELM.ui.withIcon("play", "Quiz (4 pytania)")) : null,
        n.stop.set ? el("a", { class: "btn btn-secondary btn-small", href: setHref(n.stop), onclick: closeSheet }, "Zestaw ćwiczeń") : null,
        !n.stop.quiz && !n.stop.set ? el("a", { class: "btn btn-secondary btn-small", href: pageHref(n.stop), onclick: closeSheet }, "Ćwiczenie na stronie tematu") : null
      ])])
    ]));
    const qrec = ST().data().stops[n.id];
    if (qrec && qrec.via === "quiz" && typeof qrec.best === "number") parts.push(el("p", { class: "tool-note", text: "Najlepszy wynik quizu: " + qrec.best + "/4." }));

    // propozycja „Umiem” po quizie (nigdy automatycznie)
    const missing = (n.stop.items || []).filter(function (itemId) { return ELM.state.progress[itemId] !== true; });
    if (n.via === "quiz" && missing.length) {
      parts.push(el("div", { class: "ex-umiem", role: "status" }, [
        el("span", { class: "ex-umiem-icon", "aria-hidden": "true" }, ELM.icon("sparkles", { size: 20 })),
        el("div", { class: "ex-umiem-body" }, [
          el("p", null, [el("strong", { text: "Zaznaczyć „Umiem”? " }), "Quiz zaliczony. Zaznaczyć dla: " + n.stop.title + "?"]),
          el("p", { class: "ex-journal-actions" }, el("button", { type: "button", class: "btn btn-primary btn-small", onclick: function () {
            missing.forEach(function (itemId) { ELM.app.setProgress(itemId, true); });
            paintSheet(body, id, Object.assign({}, opts, { force: true }));
            refreshView();
          } }, ELM.ui.withIcon("check", "Zaznacz „Umiem”")))
        ])
      ]));
    }

    // zaliczone / pomiń
    const foot = [];
    const next = nextLesson(tr, n);
    if (n.status === "done") {
      foot.push(el("button", { type: "button", class: "btn btn-primary", onclick: function () { closeSheet(); if (next) openSheet(next.id); else refreshView(); } }, ELM.ui.withIcon("arrow-right", next ? "Zaliczone, dalej" : "Zaliczone")));
    }
    if (n.via === "skip") foot.push(el("button", { type: "button", class: "btn btn-secondary", onclick: function () { ST().unskipStop(n.id); paintSheet(body, id, Object.assign({}, opts, { force: true })); refreshView(); } }, "Cofnij pominięcie"));
    else if (n.status !== "done") foot.push(el("button", { type: "button", class: "btn btn-link", onclick: function () {
      ST().skipStop(n.id);
      closeSheet();
      refreshView();
    } }, "Pomiń ten przystanek"));
    if (foot.length) parts.push(el("div", { class: "sz-sheet-actions" }, foot));
    body.replaceChildren.apply(body, parts);
  }

  // =====================================================================
  // PUNKT STARTU
  // =====================================================================

  function startDialog() {
    ELM.app.withProfile("Punkt startu zapisuje się w profilu.", function () {
      const cur = startInfo();
      const form = el("form", { class: "sz-start-form" }, SL().LEVELS.map(function (lvl) {
        const id = "sz-start-" + lvl;
        return el("label", { class: "sz-start-opt lvl-" + lvl, for: id }, [
          el("input", { type: "radio", name: "sz-start", id: id, value: lvl, checked: cur.level === lvl }),
          el("span", { class: "sz-start-land", "aria-hidden": "true" }, ELM.ui.landIcon(lvl, { size: 22 })),
          el("span", { text: ELM.ui.landLabel(lvl) })
        ]);
      }));
      ELM.dialogs.open({
        title: "Zmień punkt startu",
        body: [el("p", { text: "Krainy przed punktem startu dostają status „pominięte”. Nie blokują niczego i można do nich wrócić." }), form],
        cancelValue: false,
        actions: [
          { label: "Anuluj", value: false },
          { label: "Zapisz", variant: "btn-primary", value: true, onClick: function () {
            const v = form.querySelector("input:checked");
            if (v) ST().setStart(v.value, "manual");
          } }
        ]
      }).result.then(function (ok) { if (ok) { refreshView(); if (ELM.app.refreshLearning) ELM.app.refreshLearning(); } });
    });
  }

  // =====================================================================
  // WIDOK
  // =====================================================================

  function parseRoute(hash) {
    const m = /^#\/szlak(?:\/([a-z0-9-]+))?\/?$/.exec(String(hash || ""));
    return m ? { kind: "trail", open: m[1] || null } : null;
  }

  function refreshView() { if (ELM.state.view === "szlak") render({ kind: "trail", open: null }, { keepScroll: true }); }

  function nodeButton(n, geo) {
    const st = n.current ? "current" : n.status;
    const isReview = n.type === "review";
    const cat = isReview ? null : stopCat(n.stop);
    const label = (isReview ? "Powtórka: " : "") + n.stop.title + ". " + (isReview ? "" : positionText(n) + ". ") + STATUS_TEXT[st] + (n.via === "start" ? " testem poziomu" : "") + ".";
    const icon = st === "done" ? "check" : isReview ? "rotate-ccw" : (st === "skipped" ? "arrow-right" : CAT_ICON[cat]);
    return el("li", { class: "sz-node is-" + st + (isReview ? " is-review" : ""), style: "left:" + geo.x.toFixed(1) + "%;top:" + geo.y + "px", "data-stop": n.id }, [
      el("button", { type: "button", class: "sz-btn", "aria-label": label, "aria-haspopup": "dialog", onclick: function () { openSheet(n.id); } }, [
        el("span", { class: "sz-circle", "aria-hidden": "true" }, ELM.icon(icon, { size: st === "done" ? 24 : 22 })),
        el("span", { class: "sz-title", "aria-hidden": "true", text: isReview ? "Powtórka" : n.stop.title })
      ])
    ]);
  }

  function unitBlock(tr, unit, nodes) {
    const prog = SL().unitProgress(tr, unit.id);
    const n = nodes.length;
    const H = n * ROW;
    const geo = nodes.map(function (node, i) {
      const k = node.global !== null ? node.global : (nodes[i - 1] ? nodes[i - 1].global : 0) + 0.5;
      return { x: 50 + 25 * Math.sin(k * 0.95 + node.levelIndex), y: Math.round(i * ROW + ROW / 2) };
    });
    // krzywa przez środki węzłów
    let d = "M" + geo[0].x.toFixed(1) + " " + geo[0].y;
    for (let i = 1; i < geo.length; i++) {
      const a = geo[i - 1], b = geo[i], my = (a.y + b.y) / 2;
      d += " C" + a.x.toFixed(1) + " " + my + " " + b.x.toFixed(1) + " " + my + " " + b.x.toFixed(1) + " " + b.y;
    }
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "sz-wire"); svg.setAttribute("viewBox", "0 0 100 " + H); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    return el("section", { class: "sz-unit", "aria-labelledby": "sz-u-" + unit.id }, [
      el("div", { class: "sz-unit-head" }, [
        el("h3", { class: "sz-unit-title", id: "sz-u-" + unit.id, text: "Odcinek " + prog.index + " · " + unit.title }),
        el("span", { class: "sz-unit-prog num", text: prog.done + "/" + prog.total, "aria-label": prog.done + " z " + prog.total + " przystanków zaliczonych" })
      ]),
      el("div", { class: "sz-lane", style: "height:" + H + "px" }, [svg, el("ol", { class: "sz-stops" }, nodes.map(function (node, i) { return nodeButton(node, geo[i]); }))])
    ]);
  }

  function branchList(level, lv) {
    if (!lv.branches || !lv.branches.length) return null;
    const mine = ELM.examMy ? ELM.examMy.isMine : function () { return false; };
    return el("section", { class: "sz-branches", "aria-label": "Odnogi egzaminacyjne po " + level }, [
      el("h3", { class: "sz-unit-title", text: "Odnogi egzaminacyjne" }),
      el("ul", { class: "sz-branch-list" }, lv.branches.map(function (b) {
        const pinned = mine(b.exam);
        return el("li", null, el("a", { class: "sz-branch" + (pinned ? " is-pinned" : ""), href: b.route }, [
          el("span", { class: "sz-branch-icon", "aria-hidden": "true" }, ELM.icon("graduation-cap", { size: 22 })),
          el("span", { class: "sz-branch-body" }, [
            el("strong", { text: b.label }),
            pinned ? el("span", { class: "chip", text: "Przypięty do Dziś" }) : null,
            el("span", { class: "tool-note", text: b.note })
          ]),
          el("span", { "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 20 }))
        ]));
      }))
    ]);
  }

  function levelSection(tr, lv, curLevel) {
    const level = lv.level;
    const p = SL().levelProgress(tr, level);
    const skipped = SL().LEVELS.indexOf(level) < tr.startIndex && p.percent < 100;
    const passed = ELM.levelFinal ? ELM.levelFinal.passedText(level) : null;
    const isCur = curLevel === level;
    const nodesOf = function (unitId) { return tr.nodes.filter(function (x) { return x.unitId === unitId; }); };
    const units = lv.units.map(function (u) { return unitBlock(tr, u, nodesOf(u.id)); });
    const head = el("header", { class: "sz-level-head" }, [
      el("span", { class: "sz-level-icon", "aria-hidden": "true" }, ELM.ui.landIcon(level, { size: 30 })),
      el("div", { class: "sz-level-text" }, [
        el("h2", { class: "sz-level-title", id: "sz-l-" + level, text: ELM.ui.landLabel(level) }),
        el("p", { class: "sz-level-sub num" }, [
          p.done + " z " + p.total + " " + plural(p.total, "przystanku", "przystanków", "przystanków") + " (" + p.percent + "%)",
          skipped ? el("span", { class: "chip", text: "Pominięte testem poziomu" }) : null,
          isCur ? el("span", { class: "chip is-here", text: "Tu jesteś" }) : null,
          passed ? el("span", { class: "chip", text: passed }) : null
        ])
      ]),
      el("div", { class: "sz-level-links" }, [
        el("a", { class: "btn btn-link btn-small", href: ELM.app.levelHash(level) }, "Lista umiejętności"),
        el("a", { class: "btn btn-secondary btn-small", href: lv.finalTest }, "Test końcowy " + level)
      ])
    ]);
    const inner = [head].concat(units);
    const br = branchList(level, lv);
    if (br) inner.push(br);
    const cls = "sz-level lvl-" + level + (skipped ? " is-skipped" : "") + (isCur ? " is-current" : "");
    if (skipped) {
      return el("details", { class: cls, "aria-labelledby": "sz-l-" + level }, [
        el("summary", { class: "sz-level-summary" }, [el("span", { "aria-hidden": "true" }, ELM.ui.landIcon(level, { size: 24 })), el("span", { text: ELM.ui.landLabel(level) + " · pominięte testem poziomu (" + p.done + "/" + p.total + ")" })])
      ].concat(inner));
    }
    return el("section", { class: cls, "aria-labelledby": "sz-l-" + level }, inner);
  }

  /** Pierwsze uruchomienie (nowy profil bez wybranego punktu startu i bez testu). */
  function firstRun() {
    return el("section", { class: "card sz-first", "aria-labelledby": "sz-first-title" }, [
      el("h2", { class: "sz-first-title", id: "sz-first-title", text: "Od czego zaczynamy?" }),
      el("p", { text: "Szlak to jedna droga przez sześć krain, od Polany po Szczyt. Możesz zacząć od początku albo zrobić krótki test poziomu, a szlak ustawi się tam, gdzie warto zacząć." }),
      el("div", { class: "tool-actions" }, [
        el("a", { class: "btn btn-primary", href: ELM.levelTest ? ELM.levelTest.HASH : "#/test-poziomu" }, ELM.ui.withIcon("target", "Zrób test poziomu (6 min)")),
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { ST().setStart("A1", "default"); refreshView(); } }, "Zacznij od A1")
      ])
    ]);
  }

  function needsFirstRun() {
    const st = ST().data();
    return !st.start && !testLevel() && !Object.keys(st.stops).length && !Object.keys(st.reviews).length && !Object.keys(ELM.state.progress).length;
  }

  function render(route, opts) {
    opts = opts || {};
    route = route || parseRoute(location.hash) || { kind: "trail", open: null };
    const view = document.getElementById("view");
    const scroll = opts.keepScroll ? U.getScroll() : 0;
    view.className = "view tool-view sz-view";
    view.dataset.file = HASH;
    view.replaceChildren();
    document.title = "Szlak · English Levels Map";
    if (!ready()) {
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Wczytuję Szlak…" }));
      return;
    }
    const tr = trail();
    const start = startInfo();
    const cur = tr.current;
    view.appendChild(ELM.ui.pageHead({ eyebrow: "Nauka", title: "Szlak", lead: "Jedna droga przez krainy od A1 do C2: małe przystanki z powtórkami co kilka kroków. Szlak podpowiada kolejność, ale nic nie jest zablokowane." }));
    if (needsFirstRun()) view.appendChild(firstRun());

    const startText = start.source === "test" ? "z testu poziomu" : start.source === "manual" ? "wybrany przez Ciebie" : "domyślny";
    const bar = [
      el("div", { class: "sz-now" }, cur ? [
        el("p", { class: "sz-now-label", text: "Bieżący przystanek" }),
        el("p", { class: "sz-now-title" }, [el("strong", { text: cur.stop.title }), el("span", { class: "tool-note", text: " · " + positionText(cur) })]),
        el("p", { class: "tool-note num", text: "Odcinek " + SL().unitProgress(tr, cur.unitId).index + " · " + cur.unitTitle + " · " + SL().unitProgress(tr, cur.unitId).done + "/" + SL().unitProgress(tr, cur.unitId).total })
      ] : [el("p", { class: "sz-now-title" }, el("strong", { text: "Cały szlak zaliczony od punktu startu. Gratulacje!" }))]),
      el("div", { class: "sz-now-actions" }, [
        cur ? el("button", { type: "button", class: "btn btn-primary", onclick: function () { openSheet(cur.id); } }, ELM.ui.withIcon("arrow-right", "Idź dalej")) : null,
        el("button", { type: "button", class: "btn btn-secondary", onclick: startDialog }, "Zmień punkt startu")
      ])
    ];
    view.appendChild(el("section", { class: "card sz-now-card", "aria-label": "Bieżący przystanek" }, bar));
    view.appendChild(el("p", { class: "tool-note sz-start-note" }, "Punkt startu: " + ELM.ui.landLabel(start.level) + " (" + startText + ")."));

    const curLevel = cur ? cur.level : null;
    ELM.SZLAK.levels.forEach(function (lv) { view.appendChild(levelSection(tr, lv, curLevel)); });

    if (opts.keepScroll) U.setScroll(scroll);
    else {
      const here = cur ? view.querySelector('[data-stop="' + cur.id + '"]') : null;
      if (here) {
        const reduce = ELM.reducedMotion && ELM.reducedMotion();
        const details = here.closest("details");
        if (details) details.open = true;
        requestAnimationFrame(function () { here.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); });
      } else U.setScroll(0);
    }
    if (route.open) {
      history.replaceState(null, "", HASH); // adres wraca do #/szlak, odświeżenie nie otwiera arkusza ponownie
      openSheet(route.open);
    }
  }

  /** Link „Zobacz Polanę na szlaku” na stronie poziomu. */
  function levelLink(level) {
    if (!loaded()) return null;
    return el("a", { class: "btn btn-link btn-small sz-level-link", href: HASH }, ELM.ui.withIcon("route", "Zobacz " + ACC[level] + " na szlaku"));
  }

  /** Kafel „Szlak” w Statystykach: zaliczone przystanki na poziom i średni wynik quizów. */
  function statsTile() {
    if (!ready()) return null;
    const tr = trail();
    const st = ST().data();
    const avg = SL().quizAverage(st);
    const rows = SL().LEVELS.map(function (lvl) {
      const p = SL().levelProgress(tr, lvl);
      return el("li", { class: "sz-st-row lvl-" + lvl }, [
        el("span", { class: "sz-st-name", text: ELM.ui.landLabel(lvl) }),
        el("span", { class: "sz-st-bar", "aria-hidden": "true" }, el("span", { class: "sz-st-fill", style: "width:" + p.percent + "%" })),
        el("span", { class: "sz-st-n num", text: p.done + "/" + p.total })
      ]);
    });
    const quizzes = Object.keys(st.stops).filter(function (id) { return st.stops[id].via === "quiz"; }).length;
    return el("section", { class: "card st-tile st-wide", "aria-labelledby": "st-szlak" }, [
      el("h2", { class: "tile-title", id: "st-szlak", text: "Szlak" }),
      el("ul", { class: "sz-st-list" }, rows),
      el("p", { class: "tool-note", text: avg === null ? "Quizy przystanków: jeszcze żadnego. Zaliczenie od 3 z 4 pytań." : "Quizy przystanków: " + quizzes + " " + plural(quizzes, "podejście", "podejścia", "podejść") + ", średni wynik " + avg + "%." }),
      el("p", null, el("a", { class: "btn btn-link btn-small", href: HASH }, "Otwórz szlak"))
    ]);
  }

  ELM.szlak = {
    levelLink: levelLink, statsTile: statsTile, LOC: LOC, ACC: ACC,
    HASH: HASH, parseRoute: parseRoute, render: render, loaded: loaded, ready: ready,
    current: current, levelInfo: levelInfo, startLevel: startLevelId, barFor: barFor, openSheet: openSheet, startQuiz: startQuiz, positionText: positionText
  };
})(window.ELM);
