/*
 * level-final.js — testy końcowe poziomów A1–C2 (paczka v6, spec 13 sekcja 2).
 *
 *   #/a1/test … #/c2/test   ekran startowy → sesja w trybie Egzamin w silniku zadań
 *                           (js/exercise-engine.js, ELM.exercises.startFinal) → wynik
 *
 * Pula 30 zadań poziomu: niezbednik/testy-poziomow/<poziom>.json → <poziom>.js (tools/zbuduj-testy-koncowe.js),
 * ładowana na żądanie. Losowanie 20 zadań z proporcjonalną reprezentacją kategorii i próg w punktach:
 * js/final-logic.js. Wynik i znaczek poziomu: ELM.profileData (elm_leveltests_v1).
 *
 * Tu też: znaczek „poziom zaliczony” (Szlak, panel, nagłówek poziomu), karta „Test końcowy” na stronie poziomu
 * i podpowiedź na stronie „Dziś” (≥ 70% „Umiem” na poziomie).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const DRAW = 20;
  const PASS = 80;
  const MINUTES = 15;
  const READY_PERCENT = 70; // od tylu % „Umiem” na poziomie podpowiadamy test końcowy

  const VERSION = (function () {
    const s = document.querySelector('script[src*="js/level-final.js"]');
    const m = s && /[?&]v=(\d+)/.exec(s.getAttribute("src"));
    return m ? m[1] : "1";
  })();

  function pd() { return ELM.profileData; }
  function F() { return ELM.finalLogic; }
  function levelHash(level) { return ELM.app.levelHash(level); }
  function testHash(level) { return "#/" + String(level).toLowerCase() + "/test"; }

  /** „2026-11-12” → „12.11.2026”. */
  function fmtDate(day) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || "");
    return m ? m[3] + "." + m[2] + "." + m[1] : String(day || "");
  }

  function plural(n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10, t = n % 100;
    return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
  }

  function categories() { return (ELM.NIEZBEDNIK && ELM.NIEZBEDNIK.index.categories) || {}; }
  function categoryLabel(key) { return categories()[key] || key; }
  function categoryOf(item) { return item.category || "gramatyka"; }

  // =====================================================================
  // ZNACZEK POZIOMU (Szlak, panel, nagłówek poziomu)
  // =====================================================================

  /** Dzień zaliczenia poziomu aktywnego profilu („RRRR-MM-DD”) albo null. */
  function passedAt(level) {
    const r = ELM.app.getActiveProfile() ? pd().finalResult(level) : null;
    return r && r.passedAt ? r.passedAt : null;
  }

  /** Tekst dla czytników ekranu i etykiet: „A1 zaliczony 12.11.2026” albo null. */
  function passedText(level) {
    const d = passedAt(level);
    return d ? level + " zaliczony " + fmtDate(d) : null;
  }

  /**
   * Znaczek-pieczątka: ikona nagrody w kółku (kształt, nie sam kolor) + ukryty tekst „A1 zaliczony 12.11.2026”
   * (opts.hideText — gdy etykietę podaje nadrzędny link).
   */
  function stamp(level, opts) {
    const text = passedText(level);
    if (!text) return null;
    opts = opts || {};
    return el("span", { class: "lvl-stamp lvl-" + level + (opts.cls ? " " + opts.cls : ""), "data-level": level }, [
      el("span", { class: "lvl-stamp-icon", "aria-hidden": "true" }, ELM.icon("award", { size: opts.size || 14 })),
      opts.hideText ? null : el("span", { class: "visually-hidden", text: text })
    ]);
  }

  /** Etykieta „Zaliczony · 12.11.2026” w nagłówku strony poziomu (widoczny tekst) albo null. */
  function headerLabel(level) {
    const d = passedAt(level);
    if (!d) return null;
    return el("p", { class: "lvl-passed-label lvl-" + level }, [
      el("span", { class: "lvl-stamp-icon", "aria-hidden": "true" }, ELM.icon("award", { size: 16 })),
      el("span", { text: "Zaliczony · " + fmtDate(d) }),
      el("span", { class: "visually-hidden", text: " (test końcowy " + level + ")" })
    ]);
  }

  // =====================================================================
  // DANE
  // =====================================================================

  /** Pula poziomu (Promise → zestaw albo null, gdy pliku nie ma). */
  function load(level) {
    if (ELM.LEVEL_TESTS && ELM.LEVEL_TESTS[level]) return Promise.resolve(ELM.LEVEL_TESTS[level]);
    const src = "niezbednik/testy-poziomow/" + level.toLowerCase() + ".js?v=" + VERSION;
    return ELM.loadScript(src).then(function () {
      return (ELM.LEVEL_TESTS && ELM.LEVEL_TESTS[level]) || null;
    }, function () { return null; });
  }

  /** Punkty potrzebne do zaliczenia przy danej sumie punktów testu (próg w punktach). */
  function pointsNeeded(total, percent) { return Math.ceil(total * percent / 100); }

  function percentOf(r) { return r.total ? Math.round(r.score / r.total * 100) : 0; }

  // =====================================================================
  // EKRAN STARTOWY
  // =====================================================================

  function backTo(level) { return { href: levelHash(level), label: "Wróć do poziomu " + level }; }

  function renderStart(view, level) {
    document.title = "Test końcowy " + level + " · English Levels Map";
    view.className = "view tool-view ex-view lf-view lvl-" + level;
    const info = pd().finalResult(level);
    const msg = el("p", { class: "tool-note lf-msg", role: "status", "aria-live": "polite" });
    const startBtn = el("button", { type: "button", class: "btn btn-primary", "data-fk": "start", onclick: function () { begin(level, startBtn, msg); } },
      ELM.ui.withIcon("play", info ? "Zrób test ponownie" : "Rozpocznij test"));
    const when = passedText(level);
    view.appendChild(el("header", { class: "tool-head" }, [
      el("p", { class: "tool-eyebrow" }, el("a", { href: levelHash(level) }, "Poziom " + level)),
      el("h1", { class: "tool-title", text: "Test końcowy " + level }),
      el("p", { class: "tool-lead", text: DRAW + " pytań z całego poziomu " + level + ", ok. " + MINUTES + " minut. Zaliczenie od " + PASS + "% punktów (" + pointsNeeded(DRAW, PASS) + " z " + DRAW + ")." })
    ]));
    view.appendChild(el("section", { class: "card lf-card" }, [
      when ? el("p", { class: "lf-passed" }, [stamp(level, { hideText: true }), el("strong", { text: when })]) : null,
      info ? el("p", { class: "tool-note", text: "Najlepszy wynik: " + info.best.score + "/" + info.best.total + " pkt (" + percentOf(info.best) + "%) · ostatni: " +
        info.last.score + "/" + info.last.total + " pkt (" + fmtDate(info.last.date) + ")" }) : el("p", { class: "tool-note", text: "Jeszcze nie rozwiązywany." }),
      el("ul", { class: "lf-rules" }, [
        el("li", { text: "Pytania z różnych podstron poziomu, losowane przy każdym podejściu." }),
        el("li", { text: "Tryb Egzamin: wyjaśnienia dopiero po ostatnim pytaniu. Błędy trafią do Dziennika błędów." }),
        el("li", { text: "Test jest zawsze dostępny. Niczego nie zaznacza jako „Umiem” – to nadal robisz Ty." })
      ]),
      msg,
      el("div", { class: "tool-actions" }, [startBtn, el("a", { class: "btn btn-ghost", href: levelHash(level) }, "Wróć do poziomu " + level)])
    ]));
    setTimeout(function () { startBtn.focus({ preventScroll: true }); }, 0);
  }

  /** Losuje zadania z puli i uruchamia sesję w silniku. */
  function begin(level, btn, msg) {
    btn.disabled = true;
    msg.textContent = "Losuję pytania…";
    load(level).then(function (set) {
      btn.disabled = false;
      if (!set || !Array.isArray(set.items) || !set.items.length) {
        msg.textContent = "Pula pytań tego poziomu nie jest jeszcze dostępna. Uruchom: npm run build";
        return;
      }
      msg.textContent = "";
      start(level, set);
    });
  }

  /** Nowe podejście: losowanie + sesja Egzamin pod #/<poziom>/test. */
  function start(level, set) {
    const items = F().drawItems(set.items, set.draw || DRAW, categoryOf);
    ELM.exercises.startFinal({
      level: level, title: set.title || "Test końcowy " + level, items: items, back: backTo(level),
      hooks: {
        finish: function (run, s) { return finish(level, set, run, s); },
        afterFinish: function (run) { afterFinish(level, run); },
        renderDone: function (view, run, api) { renderResult(view, run, api, level, set); }
      }
    });
  }

  // =====================================================================
  // ZAKOŃCZENIE I WYNIK
  // =====================================================================

  /** Zapisuje wynik (elm_leveltests_v1) i liczy podział na kategorie. Zwraca run.final. */
  function finish(level, set, run, s) {
    const percent = set.passPercent || PASS;
    const passed = F().isPassed(s.score, s.total, percent);
    const saved = pd().saveFinalResult(level, { score: s.score, total: s.total, passed: passed });
    return {
      passed: passed, saved: saved, percent: percent, needed: pointsNeeded(s.total, percent),
      breakdown: F().breakdown(run.items.map(function (p) { return { item: p.item, res: p.res }; }), categoryOf)
    };
  }

  /** Po zaliczeniu: odświeżenie panelu (znaczek) i gratulacje (kamień milowy lvl-<poziom>-passed). */
  function afterFinish(level, run) {
    if (!run.final || !run.final.passed) return;
    if (ELM.render && ELM.render.renderSidebar) ELM.render.renderSidebar();
    if (run.final.saved && run.final.saved.firstPass && ELM.celebrate) ELM.celebrate.check({ event: "final", level: level });
  }

  function topicInfo(id) { return ELM.exercises.topicInfo(id); }

  function renderResult(view, run, api, level, set) {
    const fin = run.final;
    const total = run.total;
    const pct = total ? Math.round(run.score / total * 100) : 0;
    const passed = fin && fin.passed;
    document.title = "Wynik testu końcowego " + level + " · English Levels Map";
    view.className = "view tool-view ex-view lf-view lvl-" + level;
    view.appendChild(el("header", { class: "tool-head" }, [
      el("p", { class: "tool-eyebrow" }, el("a", { href: levelHash(level) }, "Poziom " + level)),
      el("h1", { class: "tool-title", text: "Test końcowy " + level })
    ]));

    const wrong = run.items.filter(api.isWrong);
    const catRows = fin.breakdown.categories.map(function (c) {
      const showPct = c.total >= 3; // jak w teście poziomu: bez procentów przy próbie < 3
      return el("li", { class: c.score === c.total ? "is-full" : "" }, [
        el("span", { class: "lf-cat-name", text: categoryLabel(c.key) }),
        el("strong", { class: "num", text: c.score + "/" + c.total }),
        showPct ? el("span", { class: "lf-cat-pct num", text: Math.round(c.score / c.total * 100) + "%" }) : null,
        el("span", { class: "lf-cat-bar", "aria-hidden": "true" }, el("span", { class: "lf-cat-fill", style: "width:" + Math.round(c.score / c.total * 100) + "%" }))
      ]);
    });
    const weak = fin.breakdown.topics.slice(0, 6);
    const names = weak.slice(0, 3).map(function (t) { const i = topicInfo(t.topic); return i ? i.title : t.topic; });
    const sets = el("p", { class: "tool-note lf-sets", hidden: true });
    const actions = el("div", { class: "tool-actions" }, [
      el("button", { type: "button", class: "btn " + (passed ? "btn-secondary" : "btn-primary"), "data-fk": "again", onclick: function () { start(level, set); } }, ELM.ui.withIcon("rotate-ccw", "Zrób test jeszcze raz")),
      el("a", { class: "btn btn-secondary", href: levelHash(level) }, "Wróć do poziomu " + level),
      passed ? el("a", { class: "btn btn-ghost", href: "#/dzis" }, ELM.ui.withIcon("arrow-right", "Zobacz Szlak")) : null
    ]);

    view.appendChild(el("section", { class: "card ex-result lf-result " + (passed ? "is-passed" : "is-failed"), "aria-live": "polite" }, [
      el("p", { class: "ex-result-score" }, [
        el("strong", { class: "num", text: run.score + "/" + total + " pkt" }),
        el("span", { class: "ex-result-pct num", text: pct + "%" })
      ]),
      el("p", { class: "lf-verdict" }, [
        el("span", { class: "c1-mark " + (passed ? "is-ok" : "is-bad"), "aria-hidden": "true" }, ELM.icon(passed ? "check" : "x", { size: 16 })),
        el("strong", { text: passed ? "Zaliczony" : "Jeszcze nie" }),
        el("span", { class: "lf-need", text: " – próg " + fin.percent + "% (" + fin.needed + " z " + total + " pkt)" })
      ]),
      passed && fin.saved && fin.saved.firstPass
        ? el("p", { class: "lf-passed" }, [stamp(level, { hideText: true }), el("strong", { text: level + " zaliczony " + fmtDate(fin.saved.passedAt) + ". Znaczek jest już na Szlaku, w panelu i na stronie poziomu." })])
        : passed ? el("p", { class: "tool-note", text: "Poziom " + level + " masz zaliczony od " + fmtDate(fin.saved.passedAt) + "." })
          : el("p", { class: "ex-result-comment", text: passedAt(level) ? "Znaczek " + level + " zostaje – to był wynik poniżej progu. Przejrzyj błędy i spróbuj jeszcze raz." : "Do progu brakuje " + Math.max(0, fin.needed - run.score) + " pkt. Przejrzyj błędy, powtórz tematy i spróbuj jeszcze raz." }),
      fin.saved ? el("p", { class: "tool-note", text: "Najlepszy wynik: " + fin.saved.best.score + "/" + fin.saved.best.total + " pkt (" + percentOf(fin.saved.best) + "%)." }) : null,
      el("h2", { class: "lf-h", text: "Wynik według kategorii" }),
      el("ul", { class: "lf-cats" }, catRows),
      !passed && names.length ? el("p", { class: "lf-weak" }, [el("span", { class: "review-label", text: "Najwięcej błędów w: " }), names.join(", ") + "."]) : null,
      weak.length ? el("div", { class: "lf-topics" }, [
        el("h2", { class: "lf-h", text: "Podstrony do powtórki" }),
        el("ul", { class: "lf-topic-list" }, weak.map(function (t) {
          const i = topicInfo(t.topic);
          return el("li", null, [
            i ? el("a", { href: i.href, text: i.title }) : el("span", { text: t.topic }),
            el("span", { class: "tool-note", text: " – " + t.wrong + " " + plural(t.wrong, "zadanie", "zadania", "zadań") + " z błędem" })
          ]);
        }))
      ]) : el("p", { class: "tool-note", text: "Bez błędów – brawo!" }),
      sets,
      api.journalSummary(),
      actions
    ]));
    // „Zestawy do tych tematów” (tylko gdy te tematy mają zestawy ćwiczeń)
    if (!passed && weak.length) ELM.exercises.loadIndex().then(function (index) {
      const found = [];
      weak.forEach(function (t) { (index.topics[t.topic] || []).forEach(function (id) { if (index.sets[id] && found.indexOf(id) === -1) found.push(id); }); });
      if (!found.length || !sets.isConnected) return;
      sets.hidden = false;
      sets.replaceChildren(el("span", { class: "review-label", text: "Zestawy do tych tematów: " }));
      found.slice(0, 4).forEach(function (id, k) {
        if (k) sets.appendChild(document.createTextNode(", "));
        sets.appendChild(el("a", { href: "#/cwiczenia/zestaw/" + id, text: index.sets[id].title }));
      });
      actions.insertBefore(el("a", { class: "btn btn-secondary", href: "#/cwiczenia/zestaw/" + found[0] }, "Zestawy do tych tematów"), actions.children[1]);
    });

    view.appendChild(el("section", { class: "card ex-review" }, [
      el("h2", { class: "section-title", text: wrong.length ? "Do poprawki (" + wrong.length + ")" : "Bez błędów – brawo!" }),
      wrong.length ? el("ol", { class: "ex-wrong" }, wrong.map(function (p) {
        const mine = api.userAnswer(p);
        return el("li", null, [
          el("p", { class: "ex-wrong-q" }, [el("span", { class: "chip", text: api.typeShort[p.item.type] }), p.res && p.res.max > 1 ? el("span", { class: "chip", text: p.res.points + "/" + p.res.max + " pkt" }) : null, " ", api.itemSummary(p.item)]),
          el("p", { class: "journal-row is-wrong" }, [el("span", { class: "review-label", text: "Twoja odpowiedź: " }), el("span", { text: mine || "(brak)" })]),
          el("p", { class: "journal-row is-right" }, [el("span", { class: "review-label", text: "Poprawnie: " }), el("strong", { text: api.modelAnswer(p.item) })]),
          p.item.explanation ? el("p", { class: "ex-wrong-expl", text: p.item.explanation }) : null,
          p.item.trap ? el("p", { class: "ex-wrong-trap" }, [el("strong", { text: "Pułapka: " }), p.item.trap]) : null
        ]);
      })) : el("p", { class: "tool-note", text: "Wszystkie odpowiedzi były poprawne." })
    ]));
    setTimeout(function () { const b = view.querySelector("[data-fk='again']"); if (b) b.focus({ preventScroll: true }); }, 0);
  }

  // =====================================================================
  // KARTA NA STRONIE POZIOMU I PODPOWIEDŹ NA „DZIŚ”
  // =====================================================================

  /** Karta „Test końcowy A1” pod podsumowaniem poziomu. */
  function card(level) {
    const info = ELM.app.getActiveProfile() ? pd().finalResult(level) : null;
    const when = passedText(level);
    return el("section", { class: "card lf-level-card lvl-" + level, "aria-labelledby": "lf-card-title" }, [
      el("div", { class: "lf-level-card-body" }, [
        el("h2", { class: "section-title", id: "lf-card-title" }, [el("span", { class: "callout-icon", "aria-hidden": "true" }, ELM.icon("award", { size: 20 })), "Test końcowy " + level]),
        el("p", { text: DRAW + " pytań z całego poziomu, ok. " + MINUTES + " minut. Zaliczenie od " + PASS + "% (" + pointsNeeded(DRAW, PASS) + " z " + DRAW + ") daje znaczek poziomu na Szlaku." }),
        when ? el("p", { class: "lf-passed" }, [stamp(level, { hideText: true }), el("strong", { text: when })]) : null,
        info ? el("p", { class: "tool-note", text: "Najlepszy wynik: " + info.best.score + "/" + info.best.total + " pkt (" + percentOf(info.best) + "%), ostatni: " + info.last.score + "/" + info.last.total + " (" + fmtDate(info.last.date) + ")." })
          : el("p", { class: "tool-note", text: "Test jest zawsze dostępny – możesz go zrobić bez zaznaczania „Umiem”." })
      ]),
      el("a", { class: "btn btn-primary", href: testHash(level), "aria-label": (info ? "Zrób test końcowy ponownie: " : "Zacznij test końcowy: ") + level }, ELM.ui.withIcon("play", info ? "Zrób ponownie" : "Zacznij test"))
    ]);
  }

  /**
   * Podpowiedź na „Dziś”: najniższy poziom z ≥ 70% „Umiem” bez zaliczonego testu końcowego.
   * stats = [{ id, percent, … }] jak w ELM.today. Zwraca kafelek albo null.
   */
  function todayTip(stats) {
    if (!ELM.app.getActiveProfile()) return null;
    const passed = pd().passedLevels();
    const s = stats.find(function (x) { return x.total !== 0 && x.percent >= READY_PERCENT && !passed[x.id]; });
    if (!s) return null;
    return el("section", { class: "card bento-tile bento-tip lf-tip", "aria-label": "Test końcowy " + s.id }, [
      el("div", { class: "today-tip-body" }, [
        el("h2", { class: "tile-title", text: "Gotowy na test końcowy " + s.id + "?" }),
        el("p", { class: "tool-note", text: "Masz już " + s.percent + "% punktów „Umiem” na poziomie " + s.id + ". " + DRAW + " pytań, ok. " + MINUTES + " minut, zaliczenie od " + PASS + "%." })
      ]),
      el("a", { class: "btn btn-primary", href: testHash(s.id) }, ELM.ui.withIcon("award", "Zrób test końcowy " + s.id))
    ]);
  }

  ELM.levelFinal = {
    DRAW: DRAW, PASS: PASS, MINUTES: MINUTES,
    renderStart: renderStart, load: load, fmtDate: fmtDate,
    passedAt: passedAt, passedText: passedText, stamp: stamp, headerLabel: headerLabel,
    card: card, todayTip: todayTip
  };
})(window.ELM);
