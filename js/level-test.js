/*
 * level-test.js — szybki test poziomu (#/test-poziomu).
 *
 * Pytania: ELM.LEVEL_TEST z pliku niezbednik/test-poziomu-dane.js
 * (źródło: niezbednik/test-poziomu/pytania.json, generuje
 * node tools/zbuduj-niezbednik.js).
 *
 * Algorytm (ELM.learn): start na A2; poprawna odpowiedź → następne pytanie
 * o poziom wyżej (maks. C2), błędna albo „Nie wiem” → o poziom niżej
 * (min. A1); 12 pytań bez powtórzeń; gdy pula poziomu się skończy —
 * pytanie z sąsiedniego poziomu. Z puli poziomu najpierw pytania spoza poprzedniego
 * podejścia, a wśród nich najrzadsza dotąd umiejętność (grammar / vocabulary / reading,
 * spec docs/rozbudowa-v6/spec/13 sekcja 1.3). Wynik: średnia poziomów ostatnich
 * 6 pytań, zaokrąglona w dół.
 * „Poziom pytania” w algorytmie to poziom DOCELOWY (ten, o który test chciał
 * zapytać). Gdy pula poziomu jest pusta i trzeba wziąć pytanie z sąsiedniego
 * poziomu, poziom docelowy się nie zmienia — inaczej przy małej puli test
 * „odpływałby” na drugi koniec skali. Ostatni wynik zapisujemy w profilu
 * (elm_leveltest_v1). Test NIE zaznacza niczego jako „Umiem”.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const HASH = "#/test-poziomu";
  const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  function learn() { return ELM.learn; }
  function pd() { return ELM.profileData; }

  /** Pytania z pliku po sprawdzeniu (niepoprawne są pomijane). */
  function questions() {
    const data = ELM.LEVEL_TEST;
    if (!data || !Array.isArray(data.questions)) return [];
    return data.questions.filter(function (q) {
      return q && typeof q.id === "string" && learn().LEVELS.indexOf(q.level) !== -1 &&
        Array.isArray(q.options) && q.options.length >= 2 &&
        Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length;
    });
  }

  function questionById(id) {
    return questions().find(function (q) { return q.id === id; }) || null;
  }

  function parseRoute(hash) {
    return /^#\/test-poziomu\/?$/.test(hash || "") ? { kind: "test" } : null;
  }

  // Stan bieżącego podejścia (w pamięci karty)
  let run = null;

  function start() {
    const last = pd().lastTest();
    run = {
      profileId: ELM.app.getActiveProfile().id,
      // Pytania z poprzedniego podejścia — omijane, gdy pula poziomu na to pozwala (spec v6 13, 1.3)
      avoidIds: last && Array.isArray(last.answers) ? last.answers.map(function (a) { return a.id; }) : [],
      levelIndex: learn().LEVELS.indexOf(learn().START_LEVEL),
      used: new Set(),
      asked: [],      // { q, levelIndex (docelowy), chosen, correct }
      current: null,
      answered: false,
      finished: false,
      saved: null
    };
    nextQuestion();
  }

  function nextQuestion() {
    if (run.asked.length >= learn().TEST_LENGTH) return finish();
    const prev = run.asked[run.asked.length - 1];
    // Równowaga umiejętności: najrzadsza w tym podejściu (gramatyka, słownictwo, czytanie)
    const skillCounts = {};
    run.asked.forEach(function (a) { const s = learn().skillOf(a.q); skillCounts[s] = (skillCounts[s] || 0) + 1; });
    const q = learn().pickQuestion(questions(), run.levelIndex, run.used, Math.random, !!(prev && prev.correct), { avoidIds: run.avoidIds, skillCounts: skillCounts });
    if (!q) return finish(); // pula pytań się skończyła
    run.used.add(q.id);
    run.current = { q: q, levelIndex: run.levelIndex };
    run.answered = false;
  }

  function answer(chosen) {
    if (!run || run.answered) return;
    const cur = run.current;
    const correct = chosen === cur.q.correct;
    run.asked.push({ q: cur.q, levelIndex: cur.levelIndex, chosen: chosen, correct: correct });
    // Następny poziom docelowy: wyżej po dobrej, niżej po błędnej odpowiedzi
    run.levelIndex = learn().nextLevelIndex(cur.levelIndex, correct);
    run.answered = true;
    render();
    focusLater(".lt-next");
  }

  function finish() {
    run.finished = true;
    run.current = null;
    if (!run.asked.length) return;
    const idx = learn().resultLevelIndex(run.asked.map(function (a) { return a.levelIndex; }));
    run.saved = pd().saveTest({
      date: learn().today(),
      level: learn().LEVELS[idx],
      answers: run.asked.map(function (a) { return { id: a.q.id, level: a.q.level, chosen: a.chosen, correct: a.correct }; })
    });
    ELM.markActivity(); // ukończony test = dzień nauki
    if (ELM.celebrate) ELM.celebrate.check({ event: "test", level: run.saved && run.saved.level });
  }

  function focusLater(selector) {
    setTimeout(function () { const b = document.querySelector(selector); if (b) b.focus(); }, 0);
  }

  // =====================================================================
  // EKRANY
  // =====================================================================

  const DISCLAIMER = "To orientacyjny wynik. Nie jest oficjalnym testem ani certyfikatem.";

  function header() {
    return el("header", { class: "tool-head" }, [
      el("h1", { class: "tool-title", text: "Szybki test poziomu" }),
      el("p", { class: "tool-lead", text: "12 pytań, ok. 6 minut: gramatyka, słownictwo i krótkie teksty do czytania. Pytania dopasowują się do Twoich odpowiedzi: po dobrej odpowiedzi następne jest trudniejsze, po błędnej – łatwiejsze." })
    ]);
  }

  function renderIntro(view) {
    view.appendChild(header());
    const count = questions().length;
    const last = pd().lastTest();
    view.appendChild(el("section", { class: "card lt-card" }, [
      count
        ? el("p", { text: "Możesz zaznaczyć „Nie wiem” – to lepsze niż zgadywanie. Po każdej odpowiedzi zobaczysz krótkie wyjaśnienie." })
        : el("p", { text: "Brak pytań testu (niezbednik/test-poziomu-dane.js). Uruchom: node tools/zbuduj-niezbednik.js" }),
      el("p", { class: "tool-note", text: DISCLAIMER }),
      el("div", { class: "tool-actions" }, [
        count ? el("button", { type: "button", class: "btn btn-primary", onclick: function () { start(); render(); focusLater(".lt-option"); } }, last ? "Zrób test ponownie" : "Rozpocznij test") : null,
        last ? el("button", { type: "button", class: "btn btn-secondary", onclick: function () { run = { finished: true, fromSaved: true, saved: last, profileId: ELM.app.getActiveProfile().id }; render(); } }, "Zobacz ostatni wynik") : null
      ])
    ]));
    if (last) {
      view.appendChild(el("p", { class: "tool-note lt-last" }, [
        "Ostatni wynik (" + last.date + "): ",
        el("strong", { text: last.level }),
        " – orientacyjnie."
      ]));
    }
  }

  function renderQuestion(view) {
    const cur = run.current;
    const n = run.asked.length + (run.answered ? 0 : 1);
    const total = learn().TEST_LENGTH;
    const q = cur.q;
    const last = run.answered ? run.asked[run.asked.length - 1] : null;

    view.appendChild(el("header", { class: "tool-head" }, [el("h1", { class: "tool-title", text: "Szybki test poziomu" })]));
    // Kropki postępu: odpowiedziane (dobrze ✓ / źle ✗ — nie tylko kolor), bieżąca, przyszłe
    const dots = [];
    for (let i = 0; i < total; i++) {
      const a = run.asked[i];
      const isCurrent = !run.answered ? i === run.asked.length : i === run.asked.length - 1;
      const cls = "lt-dot" + (a ? (a.correct ? " is-ok" : " is-bad") : "") + (isCurrent ? " is-current" : "");
      dots.push(el("li", { class: cls }, a ? ELM.icon(a.correct ? "check" : "x", { size: 12 }) : null));
    }
    view.appendChild(el("div", { class: "lt-progress" }, [
      el("ol", { class: "lt-dots", "aria-hidden": "true" }, dots),
      el("span", { class: "progress-text", text: "Pytanie " + n + " z " + total }),
      el("span", { class: "visually-hidden", text: "Dotychczas dobrze: " + run.asked.filter(function (a) { return a.correct; }).length + " z " + run.asked.length + "." })
    ]));

    const options = q.options.map(function (text, i) {
      let state = "";
      if (last) {
        if (i === q.correct) state = " is-correct";
        else if (i === last.chosen) state = " is-wrong";
      }
      return el("li", null, el("button", {
        type: "button",
        class: "lt-option" + state,
        disabled: !!last,
        "aria-label": LETTERS[i] + ": " + text + (last && i === q.correct ? " (poprawna odpowiedź)" : last && i === last.chosen ? " (Twoja odpowiedź)" : ""),
        onclick: function () { answer(i); }
      }, [
        el("span", { class: "lt-letter", "aria-hidden": "true" }, last && (i === q.correct || i === last.chosen) ? ELM.icon(i === q.correct ? "check" : "x", { size: 16 }) : LETTERS[i]),
        el("span", { class: "lt-option-text", text: text }),
        last && i === q.correct ? el("span", { class: "lt-tag is-ok", "aria-hidden": "true", text: "Poprawna" }) : null,
        last && i === last.chosen && i !== q.correct ? el("span", { class: "lt-tag is-bad", "aria-hidden": "true", text: "Twoja odpowiedź" }) : null
      ]));
    });

    const body = [
      // Czytanie: krótki tekst w ramce nad pytaniem (spec v6 13, 1.2)
      q.passage ? el("div", { class: "lt-passage", lang: "en" }, [
        el("p", { class: "lt-passage-label", lang: "pl", text: "Przeczytaj tekst:" }),
        el("p", { class: "lt-passage-text", text: q.passage })
      ]) : null,
      el("p", { class: "lt-question", id: "lt-question", text: q.question }),
      el("ol", { class: "lt-options", "aria-labelledby": "lt-question" }, options)
    ];
    if (!last) {
      body.push(el("div", { class: "tool-actions" }, el("button", { type: "button", class: "btn btn-secondary", onclick: function () { answer(-1); } }, "Nie wiem")));
    } else {
      body.push(el("div", { class: "lt-feedback " + (last.correct ? "is-ok" : "is-bad"), role: "status" }, [
        el("p", { class: "lt-verdict" }, [
          el("span", { class: "c1-mark " + (last.correct ? "is-ok" : "is-bad"), "aria-hidden": "true" }, ELM.icon(last.correct ? "check" : "x", { size: 14 })),
          el("strong", { text: last.correct ? "Dobrze!" : last.chosen === -1 ? "Nie szkodzi – poprawna odpowiedź to " + LETTERS[q.correct] + "." : "Niestety nie. Poprawna odpowiedź to " + LETTERS[q.correct] + "." })
        ]),
        q.explanation ? el("p", { text: q.explanation }) : null
      ]));
      body.push(el("div", { class: "tool-actions" }, el("button", {
        type: "button",
        class: "btn btn-primary lt-next",
        onclick: function () { nextQuestion(); render(); focusLater(run.finished ? ".lt-result .btn-primary" : ".lt-option"); }
      }, run.asked.length >= total ? "Zobacz wynik" : "Dalej")));
    }
    view.appendChild(el("section", { class: "card lt-card" }, body));
  }

  function renderResult(view) {
    view.appendChild(header());
    const saved = run.saved;
    if (!saved) { run = null; return renderIntro(view); }
    const level = saved.level;
    const levelData = ELM.state.content.levels.find(function (l) { return l.id === level; });
    const desc = levelData && levelData.description ? levelData.description.split("\n")[0] : "";

    // Błędne pytania (z wyniku zapisanego w profilu, więc działa także po odświeżeniu)
    const wrong = saved.answers.filter(function (a) { return !a.correct; })
      .map(function (a) { return { a: a, q: questionById(a.id) }; })
      .filter(function (x) { return x.q; });

    const addBtn = wrong.length ? el("button", {
      type: "button",
      class: "btn btn-secondary",
      onclick: function () { addWrongToJournal(wrong, addBtn); }
    }, "Dodaj błędne pytania do dziennika błędów") : null;

    view.appendChild(el("section", { class: "card lt-card lt-result lvl-" + level, "aria-live": "polite" }, [
      el("p", { class: "lt-result-label", text: "Szacowany poziom:" }),
      el("p", { class: "lt-result-level" }, [el("strong", { class: "lt-result-code", text: level }), el("span", { class: "lt-result-note", text: "orientacyjnie" })]),
      desc ? el("p", { class: "tool-lead" }, U.formatText(desc)) : null,
      skillBreakdown(saved.answers),
      el("p", null, el("a", { class: "wiki-link", href: ELM.app.levelHash(level) + "" }, "Podsumowanie poziomu " + level + " (pod listą umiejętności)")),
      el("div", { class: "tool-actions" }, [
        el("a", { class: "btn btn-primary", href: ELM.app.levelHash(level) }, "Zacznij od poziomu " + level),
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { start(); render(); focusLater(".lt-option"); } }, "Powtórz test")
      ]),
      el("p", { class: "tool-note", text: DISCLAIMER + " Wynik z " + saved.date + "." })
    ]));

    // Krótka animacja znaku poziomu (GSAP; przy ograniczonym ruchu — bez)
    ELM.motion.run([], function (gsap, reduce) {
      if (!gsap || reduce) return;
      gsap.from(view.querySelector(".lt-result-code"), { scale: 0.6, autoAlpha: 0, duration: 0.6, ease: "back.out(1.8)", clearProps: "all" });
      gsap.from(view.querySelectorAll(".lt-result > :not(.lt-result-level)"), { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.05, delay: 0.2, clearProps: "all" });
    });

    view.appendChild(el("section", { class: "card lt-card" }, [
      el("h2", { class: "section-title", text: wrong.length ? "Pytania z błędem (" + wrong.length + ")" : "Bez błędów – brawo!" }),
      wrong.length ? el("ol", { class: "lt-wrong" }, wrong.map(function (x) {
        const link = x.q.itemId && ELM.journal ? ELM.journal.itemLink(x.q.itemId) : null;
        return el("li", null, [
          x.q.passage ? el("details", { class: "lt-wrong-passage" }, [el("summary", null, "Tekst do pytania"), el("p", { lang: "en", text: x.q.passage })]) : null,
          el("p", { class: "lt-wrong-q" }, [el("span", { class: "c1-chip", text: x.q.level }), " ", x.q.question]),
          el("p", { class: "journal-row is-right" }, [el("span", { class: "review-label", text: "Poprawnie: " }), el("strong", { text: x.q.options[x.q.correct] })]),
          x.a.chosen >= 0 ? el("p", { class: "journal-row is-wrong" }, [el("span", { class: "review-label", text: "Twoja odpowiedź: " }), el("span", { text: x.q.options[x.a.chosen] || "" })]) : el("p", { class: "tool-note", text: "Zaznaczono „Nie wiem”." }),
          link ? el("p", null, ["Do powtórki: ", link]) : null
        ]);
      })) : el("p", { class: "tool-note", text: "Wszystkie odpowiedzi były poprawne." }),
      addBtn ? el("div", { class: "tool-actions" }, addBtn) : null
    ]));
  }

  const SKILLS = [["grammar", "Gramatyka"], ["vocabulary", "Słownictwo"], ["reading", "Czytanie"]];

  /** Podział wyniku: „Gramatyka 5/7 (71%) · Słownictwo 2/3 · Czytanie 1/2” — procent dopiero od 3 pytań. */
  function skillBreakdown(answers) {
    const per = {};
    answers.forEach(function (a) {
      const q = questionById(a.id);
      const s = q ? learn().skillOf(q) : "grammar";
      per[s] = per[s] || { ok: 0, n: 0 };
      per[s].n++;
      if (a.correct) per[s].ok++;
    });
    const rows = SKILLS.filter(function (s) { return per[s[0]]; });
    if (!rows.length) return null;
    return el("div", { class: "lt-skills" }, [
      el("p", { class: "lt-skills-label", text: "Wynik według umiejętności:" }),
      el("ul", { class: "lt-skills-list" }, rows.map(function (s) {
        const g = per[s[0]];
        return el("li", null, [
          el("span", { text: s[1] }),
          el("strong", { class: "num", text: g.ok + "/" + g.n }),
          g.n >= 3 ? el("span", { class: "lt-skills-pct num", text: Math.round(g.ok / g.n * 100) + "%" }) : null
        ]);
      })),
      rows.some(function (s) { return per[s[0]].n < 3; }) ? el("p", { class: "tool-note", text: "Przy mniej niż 3 pytaniach bez procentów – to za mało, żeby coś ocenić." }) : null
    ]);
  }

  /** Kategoria wpisu w dzienniku na podstawie punktu niezbędnika pytania. */
  function categoryOf(q) {
    const N = ELM.NIEZBEDNIK;
    if (!N || !q.itemId) return "Inne";
    for (const lvl of N.index.levels) {
      const item = lvl.items.find(function (it) { return it.id === q.itemId; });
      if (item) return item.category === "slownictwo" ? "Słownictwo" : item.category === "czasy" || item.category === "gramatyka" ? "Gramatyka" : "Inne";
    }
    return "Inne";
  }

  /** Dodaje błędne pytania do dziennika (bez duplikatów: to samo pytanie + ta sama odpowiedź). */
  function addWrongToJournal(wrong, btn) {
    let added = 0, skipped = 0;
    wrong.forEach(function (x) {
      const mine = x.a.chosen >= 0 ? x.q.options[x.a.chosen] : "Nie wiem";
      const ref = "test:" + x.q.id;
      if (pd().findDuplicate(ref, mine)) { skipped++; return; }
      const saved = pd().addEntry({
        context: x.q.question + "\n" + x.q.options.map(function (o, i) { return LETTERS[i] + " – " + o; }).join(", "),
        myAnswer: mine,
        correct: LETTERS[x.q.correct] + " – " + x.q.options[x.q.correct],
        rule: x.q.explanation || "",
        source: "Test poziomu, pytanie " + x.q.level,
        category: categoryOf(x.q),
        itemId: x.q.itemId || "",
        ref: ref
      });
      if (saved) added++;
    });
    ELM.app.refreshLearning();
    btn.disabled = true;
    btn.textContent = added ? "Dodano do dziennika: " + added + (skipped ? " (pominięte duplikaty: " + skipped + ")" : "") : "Te pytania są już w dzienniku";
  }

  function render() {
    const view = document.getElementById("view");
    if (!ELM.LEVEL_TEST) {
      // 60 pytań ładuje się dopiero po wejściu na #/test-poziomu
      view.className = "view tool-view lt-view";
      view.replaceChildren(el("p", { class: "tool-note", role: "status", text: "Wczytuję pytania…" }));
      ELM.loadModule("niezbednik/test-poziomu-dane.js").then(function () {
        if (ELM.state.view === "leveltest") render();
      }, function (err) { console.warn(err.message + " — uruchom: npm run build"); ELM.LEVEL_TEST = { version: 1, questions: [] }; if (ELM.state.view === "leveltest") render(); });
      return;
    }
    const profile = ELM.app.getActiveProfile();
    if (run && (!profile || run.profileId !== profile.id)) run = null; // zmiana profilu = nowe podejście
    view.className = "view tool-view lt-view";
    view.dataset.file = HASH;
    view.replaceChildren();
    if (!run) renderIntro(view);
    else if (run.finished) renderResult(view);
    else renderQuestion(view);
    document.title = "Test poziomu · English Levels Map";
    U.setScroll(0);
  }

  /** Wejście na stronę z innego widoku: zaczynamy od ekranu startowego. */
  function onEnter() {
    if (run && run.finished) run = null;
  }

  ELM.levelTest = { HASH: HASH, parseRoute: parseRoute, render: render, onEnter: onEnter };
})(window.ELM);
