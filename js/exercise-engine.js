/*
 * exercise-engine.js — silnik zadań: sesja zestawu (Nauka / Egzamin),
 * cztery typy zadań, ekran wyników, sekcja „Sprawdź się” na stronach tematów.
 * Specyfikacja: docs/rozbudowa-v2/spec/01-typy-zadan.md.
 *
 * Adresy:
 *   #/cwiczenia[/mieszane]           Centrum ćwiczeń (js/exercise-hub.js)
 *   #/cwiczenia/zestaw/<idZestawu>   zestaw z cwiczenia/tematy/
 *   #/cwiczenia/mix/<idMixu>         gotowy zestaw mieszany (dane/mixes.json)
 *   #/cwiczenia/sesja                zestaw wylosowany w generatorze (Centrum ćwiczeń)
 *
 * Dane ładujemy NA ŻĄDANIE zwykłym <script> (działa z file://):
 *   cwiczenia/cwiczenia-indeks.js → ELM.CWICZENIA (mapa, opisy zestawów, mixy)
 *   cwiczenia/tematy/<id>.js      → ELM.EX_SETS[<id>]
 * Pliki generuje: node tools/zbuduj-cwiczenia.js (część npm run build).
 *
 * Wyniki: ELM.profileData (klucz elm_exercises_v1, osobno dla profilu).
 * Logika bez DOM (ocena, tasowanie, losowanie mixów): js/exercise-logic.js.
 * Odpowiedzi wpisane przez użytkownika trafiają do strony wyłącznie jako tekst.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const BASE = "#/cwiczenia";

  function X() { return ELM.exLogic; }
  function pd() { return ELM.profileData; }

  const TYPE_LABEL = {
    "multiple-choice": "Wybierz poprawną odpowiedź",
    "reorder": "Ułóż zdanie",
    "find-error": "Znajdź i popraw błąd",
    "short-answer": "Uzupełnij lukę"
  };
  const TYPE_SHORT = {
    "multiple-choice": "wybór odpowiedzi",
    "reorder": "układanie zdań",
    "find-error": "szukanie błędów",
    "short-answer": "krótkie odpowiedzi"
  };

  // =====================================================================
  // DANE (ładowane na żądanie)
  // =====================================================================

  /** Numer wersji z adresu tego skryptu (?v=…), żeby dane nie brały się ze starej pamięci podręcznej. */
  const VERSION = (function () {
    const s = document.querySelector('script[src*="js/exercise-engine.js"]');
    const m = s && /[?&]v=(\d+)/.exec(s.getAttribute("src"));
    return m ? m[1] : "1";
  })();

  function asset(src) { return src + "?v=" + VERSION; }

  /** Indeks ćwiczeń (Promise). Brak pliku → pusty indeks, aplikacja działa dalej. */
  function loadIndex() {
    if (ELM.CWICZENIA) return Promise.resolve(ELM.CWICZENIA);
    return ELM.loadScript(asset("cwiczenia/cwiczenia-indeks.js")).then(function () {
      return ELM.CWICZENIA || emptyIndex();
    }, function (e) {
      console.warn(e.message + " — uruchom: npm run build");
      return emptyIndex();
    });
  }

  function emptyIndex() { return { topics: {}, sets: {}, mixes: [], tenseByTopic: {} }; }

  /** Pełne zestawy o podanych id (pomija brakujące pliki z ostrzeżeniem). */
  function loadSets(ids) {
    return loadIndex().then(function (index) {
      return Promise.all(ids.map(function (id) {
        const meta = index.sets[id];
        if (!meta) { console.warn("Ćwiczenia: brak zestawu " + id); return null; }
        if (ELM.EX_SETS && ELM.EX_SETS[id]) return ELM.EX_SETS[id];
        return ELM.loadScript(asset(meta.file)).then(function () {
          return (ELM.EX_SETS && ELM.EX_SETS[id]) || null;
        }, function (e) { console.warn(e.message); return null; });
      }));
    }).then(function (list) { return list.filter(Boolean); });
  }

  /** Zadania zestawów z podanych tematów (do mixów i generatora). */
  function loadTopicItems(topics) {
    return loadIndex().then(function (index) {
      const ids = [];
      topics.forEach(function (t) { (index.topics[t] || []).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); }); });
      return loadSets(ids);
    }).then(function (sets) {
      return [].concat.apply([], sets.map(function (s) { return s.items; }));
    });
  }

  /** Punkt niezbędnika po id: { id, level, title, href } albo null. */
  function topicInfo(id) {
    return id && ELM.journal ? ELM.journal.findItem(id) : null;
  }

  /** Krótki opis typów: „wybór odpowiedzi, układanie zdań”. */
  function typesText(types) {
    return Object.keys(types).map(function (t) { return TYPE_SHORT[t] || t; }).join(", ");
  }

  function scoreText(s) { return s.score + "/" + s.total; }

  // =====================================================================
  // ADRESY I SESJA
  // =====================================================================

  function parseRoute(hash) {
    const hub = /^#\/cwiczenia(\/mieszane)?\/?$/.exec(hash || "");
    if (hub) return { kind: "hub", section: hub[1] ? "mieszane" : null }; // Centrum ćwiczeń (js/exercise-hub.js)
    let m = /^#\/cwiczenia\/(zestaw|mix)\/([a-z0-9-]+)\/?$/.exec(hash || "");
    if (m) return { kind: m[1] === "zestaw" ? "set" : "mix", id: m[2] };
    if (/^#\/cwiczenia\/sesja\/?$/.test(hash || "")) return { kind: "custom" };
    return null;
  }

  function hrefOf(route) {
    if (route.kind === "hub") return BASE;
    if (route.kind === "set") return BASE + "/zestaw/" + route.id;
    if (route.kind === "mix") return BASE + "/mix/" + route.id;
    return BASE + "/sesja";
  }

  // Bieżąca sesja (w pamięci karty; zamknięcie karty = brak zapisu częściowego wyniku)
  let run = null;

  /** Zadanie przygotowane do sesji: wylosowana kolejność opcji / wyrazów i stan odpowiedzi. */
  function prepare(item) {
    const p = { item: item, st: { chosen: null, line: [], range: null, anchor: null, fix: "", text: "", noError: false }, res: null };
    if (item.type === "multiple-choice") p.choice = X().prepareChoice(item);
    if (item.type === "reorder") p.tokens = X().reorderTokens(item);
    return p;
  }

  /**
   * Nowa sesja. cfg: { key, title, intro, items, mode, topic, saveId, isMix, routeHash }
   * key — co jest rozwiązywane (np. "set:a2-…"), saveId — pod jakim id zapisać wynik.
   */
  function newRun(cfg) {
    const profile = ELM.app.getActiveProfile();
    run = {
      key: cfg.key, title: cfg.title, intro: cfg.intro || "", topic: cfg.topic || null,
      saveId: cfg.saveId || null, isMix: !!cfg.isMix, isWeak: !!cfg.isWeak, repick: cfg.repick || null,
      profileId: profile ? profile.id : null,
      phase: "intro",
      mode: cfg.mode === "exam" ? "exam" : "learn",
      i: 0,
      retry: !!cfg.retry,
      saved: null,
      score: 0
    };
    run.source = cfg.items.slice();
    run.items = cfg.items.map(prepare);
    return run;
  }

  function begin() {
    run.phase = "item";
    run.i = 0;
    render();
    focusLater("[data-fk='first']");
  }

  /** Odpowiedź w formacie ELM.exLogic.evaluate. */
  function answerOf(p) {
    const st = p.st;
    if (p.item.type === "multiple-choice") return { chosen: st.chosen === null ? null : p.choice.options[st.chosen].original };
    if (p.item.type === "reorder") return { words: st.line.map(function (t) { return t.text; }) };
    if (p.item.type === "find-error") return st.noError ? { noError: true } : { range: st.range, fix: st.fix };
    return { text: st.text };
  }

  const NEED_ANSWER = {
    "multiple-choice": "Najpierw wybierz odpowiedź.",
    "reorder": "Najpierw ułóż zdanie z wyrazów poniżej.",
    "find-error": "Najpierw kliknij wyraz z błędem albo wybierz „Brak błędu”.",
    "short-answer": "Najpierw wpisz odpowiedź w lukę."
  };

  /** „Sprawdź” (Nauka) albo „Dalej” (Egzamin). */
  function check() {
    const p = run.items[run.i];
    if (p.res) return next();
    const res = X().evaluate(p.item, answerOf(p));
    if (run.mode === "learn" && !res.answered) {
      const box = document.querySelector(".ex-status");
      if (box) { box.textContent = NEED_ANSWER[p.item.type]; box.classList.add("is-hint"); }
      return;
    }
    p.res = res;
    logAttempt(p);
    if (run.mode === "exam") return next();
    render();
    animate(res.correct);
    focusLater(".ex-next");
  }

  /** Tryb w dzienniku podejść: learn / exam (zestaw), mix (mieszany), weak (słabe punkty). */
  function attemptMode() { return run.isWeak ? "weak" : run.isMix ? "mix" : run.mode; }

  /** Każda odpowiedź trafia do dziennika podejść (elm_attempts_v1), także gdy sesja zostanie przerwana. */
  function logAttempt(p) {
    pd().addAttempt({
      itemId: p.item.id, setId: p.item.setId || null, topic: p.item.topic, level: p.item.level,
      type: p.item.type, tags: p.item.tags, correct: !!p.res.correct, mode: attemptMode(), answer: userAnswer(p)
    });
  }

  function next() {
    if (run.i < run.items.length - 1) {
      run.i++;
      render();
      U.setScroll(0);
      focusLater("[data-fk='first']");
    } else {
      finish();
    }
  }

  function finish() {
    run.phase = "done";
    const score = run.items.filter(function (p) { return p.res && p.res.correct; }).length;
    run.score = score;
    if (!run.retry && run.saveId) run.saved = pd().saveSetScore(run.saveId, score, run.items.length);
    if (run.isMix) pd().setLastMix(run.items.map(function (p) { return p.item.id; }));
    ELM.markActivity(); // ukończona sesja = dzień nauki
    if (ELM.app.refreshLearning) ELM.app.refreshLearning();
    render();
    U.setScroll(0);
    focusLater(".ex-result .btn-primary, .ex-result .btn");
  }

  /** „Pstryknięcie” albo drżenie karty (CSS; przy ograniczonym ruchu bez animacji). */
  function animate(ok) {
    const card = document.querySelector(".ex-card");
    if (!card) return;
    card.classList.remove("is-pop", "is-shake");
    void card.offsetWidth;
    card.classList.add(ok ? "is-pop" : "is-shake");
  }

  function focusLater(selector) {
    setTimeout(function () {
      const n = document.querySelector(selector);
      if (n) n.focus({ preventScroll: true });
    }, 0);
  }

  /** Przerysowanie bieżącego zadania z zachowaniem przewinięcia i fokusu (data-fk). */
  function repaint(focusKey) {
    const scroll = U.getScroll();
    render();
    U.setScroll(scroll);
    if (focusKey) focusLater("[data-fk='" + focusKey + "']");
  }

  // =====================================================================
  // TYPY ZADAŃ — WIDOK
  // =====================================================================

  /** Tekst z luką „___”: elementy tekstowe i węzeł luki zwrócony przez gap(). */
  function withGap(text, gap) {
    const parts = String(text).split("___");
    const out = [];
    parts.forEach(function (part, i) {
      if (part) out.push(part);
      if (i < parts.length - 1) out.push(gap());
    });
    return out;
  }

  /** Prompt w wierszach (dialog „A: …”, „B: ___”). */
  function promptLines(text, gap, id) {
    return el("div", { class: "ex-prompt", id: id }, String(text).split("\n").map(function (line) {
      return el("p", null, withGap(line, gap));
    }));
  }

  function bodyChoice(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const chosenText = st.chosen !== null ? p.choice.options[st.chosen].text : "";
    const gap = function () {
      if (!done) return el("span", { class: "ex-gap" + (chosenText ? " is-filled" : "") }, chosenText || el("span", { class: "visually-hidden", text: "luka" }));
      const ok = p.res.correct;
      return el("span", { class: "ex-gap is-filled " + (ok ? "is-ok" : "is-bad") }, [
        el("span", { class: "ex-gap-mark", "aria-hidden": "true" }, ELM.icon(ok ? "check" : "x", { size: 14 })),
        el("span", { class: "ex-gap-text", text: chosenText || "—" }),
        ok ? null : el("span", { class: "visually-hidden", text: " (błędnie)" })
      ]);
    };
    const nodes = [promptLines(item.prompt || "", gap, "ex-prompt")];
    const options = p.choice.options.map(function (o, i) {
      const isCorrect = i === p.choice.correct, isChosen = i === st.chosen;
      let cls = "ex-option";
      if (done && isCorrect) cls += " is-correct";
      else if (done && isChosen) cls += " is-wrong";
      if (!done && isChosen) cls += " is-chosen";
      return el("label", { class: cls }, [
        el("input", {
          type: "radio", name: "ex-opt", value: String(i), checked: isChosen, disabled: done,
          "data-fk": i === 0 ? "first" : "opt-" + i,
          onchange: function () { st.chosen = i; repaint(i === 0 ? "first" : "opt-" + i); }
        }),
        el("span", { class: "ex-key", "aria-hidden": "true" }, done && (isCorrect || isChosen) ? ELM.icon(isCorrect ? "check" : "x", { size: 16 }) : String(i + 1)),
        el("span", { class: "ex-option-body" }, [
          el("span", { class: "ex-option-text", text: o.text }),
          done && isCorrect ? el("span", { class: "lt-tag is-ok", text: "Poprawna" }) : null,
          done && isChosen && !isCorrect ? el("span", { class: "lt-tag is-bad", text: "Twoja odpowiedź" }) : null,
          done && o.note ? el("span", { class: "ex-note", text: o.note }) : null
        ])
      ]);
    });
    nodes.push(el("div", { class: "ex-options", role: "radiogroup", "aria-labelledby": "ex-prompt" }, options));
    if (!done) nodes.push(el("p", { class: "tool-note ex-keys-hint", text: "Klawiatura: cyfry 1–" + options.length + " wybierają odpowiedź, Enter sprawdza." }));
    return nodes;
  }

  function bodyReorder(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const used = new Set(st.line.map(function (t) { return t.id; }));
    const pool = p.tokens.filter(function (t) { return !used.has(t.id); });

    const lineItems = st.line.map(function (t, i) {
      const bad = done && !p.res.correct && i === p.res.diffAt;
      return el("li", { class: "ex-line-item", "data-index": String(i) }, el("button", {
        type: "button",
        class: "ex-token is-placed" + (bad ? " is-bad" : ""),
        disabled: done,
        draggable: done ? null : "true",
        "data-fk": "line-" + i,
        "aria-label": done ? t.text + (bad ? " – tu ułożenie różni się od wzoru" : "") : "Usuń z odpowiedzi: " + t.text,
        onclick: function () {
          st.line.splice(i, 1);
          repaint(st.line.length ? "line-" + Math.min(i, st.line.length - 1) : "first");
        }
      }, [bad ? el("span", { class: "ex-gap-mark", "aria-hidden": "true" }, ELM.icon("x", { size: 12 })) : null, t.text]));
    });

    const line = el("ol", { class: "ex-line" + (st.line.length ? "" : " is-empty"), "aria-label": "Twoje zdanie" },
      lineItems.length ? lineItems : el("li", { class: "ex-line-empty", text: "Klikaj wyrazy poniżej w odpowiedniej kolejności." }));

    const poolList = el("ul", { class: "ex-pool", "aria-label": "Wyrazy do ułożenia" }, pool.map(function (t, i) {
      return el("li", null, el("button", {
        type: "button",
        class: "ex-token",
        disabled: done,
        draggable: done ? null : "true",
        "data-fk": i === 0 ? "first" : "pool-" + i,
        "data-token": t.id,
        "aria-label": "Dodaj: " + t.text,
        onclick: function () {
          st.line.push(t);
          const left = pool.length - 1;
          repaint(left ? (Math.min(i, left - 1) === 0 ? "first" : "pool-" + Math.min(i, left - 1)) : "check");
        }
      }, t.text));
    }));

    if (!done) wireDrag(p, line, poolList);

    return [
      item.context ? el("p", { class: "ex-context" }, [el("span", { class: "review-label", text: "Po polsku: " }), el("span", { text: item.context })]) : null,
      el("p", { class: "visually-hidden", id: "ex-prompt", text: "Ułóż zdanie z podanych wyrazów." }),
      line,
      poolList,
      done ? null : el("div", { class: "ex-tools" }, [
        el("button", {
          type: "button", class: "btn btn-ghost btn-small", disabled: !st.line.length,
          onclick: function () { st.line = []; repaint("first"); }
        }, ELM.ui.withIcon("rotate-ccw", "Wyczyść")),
        el("span", { class: "tool-note", text: "Backspace cofa ostatni wyraz." })
      ])
    ];
  }

  /** Przeciąganie (ulepszenie dla myszy): z puli na linię i w obrębie linii. */
  function wireDrag(p, line, pool) {
    if (!(window.matchMedia && window.matchMedia("(pointer: fine)").matches)) return;
    let dragged = null;
    function start(e) {
      const b = e.target.closest(".ex-token");
      if (!b) return;
      const li = b.closest(".ex-line-item");
      dragged = li ? { from: "line", index: Number(li.dataset.index) } : { from: "pool", id: b.dataset.token };
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", b.textContent); } catch (err) { /* stare przeglądarki */ }
    }
    line.addEventListener("dragstart", start);
    pool.addEventListener("dragstart", start);
    line.addEventListener("dragover", function (e) { if (dragged) { e.preventDefault(); line.classList.add("is-drop"); } });
    line.addEventListener("dragleave", function () { line.classList.remove("is-drop"); });
    line.addEventListener("drop", function (e) {
      e.preventDefault();
      line.classList.remove("is-drop");
      if (!dragged) return;
      const target = e.target.closest(".ex-line-item");
      let at = target ? Number(target.dataset.index) : p.st.line.length;
      let token;
      if (dragged.from === "pool") token = p.tokens.find(function (t) { return t.id === dragged.id; });
      else { token = p.st.line.splice(dragged.index, 1)[0]; if (dragged.index < at) at--; }
      if (token) p.st.line.splice(at, 0, token);
      dragged = null;
      repaint(null);
    });
  }

  function bodyFindError(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const r = st.range;
    const err = item.noError ? null : item.errorRange;
    const tokens = item.tokens.map(function (t, i) {
      const sel = r && i >= r[0] && i <= r[1];
      const isErr = done && err && i >= err[0] && i <= err[1];
      let cls = "ex-word";
      if (sel) cls += " is-selected";
      if (done && sel && !p.res.rangeOk) cls += " is-bad";
      if (isErr) cls += " is-error";
      return el("button", {
        type: "button", class: cls, disabled: done,
        "aria-pressed": sel ? "true" : "false",
        "data-fk": i === 0 ? "first" : "w-" + i,
        onclick: function () { pickWord(st, i); repaint(i === 0 ? "first" : "w-" + i); }
      }, t);
    });
    const selected = r ? item.tokens.slice(r[0], r[1] + 1).join(" ") : "";
    const nodes = [
      el("p", { class: "visually-hidden", id: "ex-prompt", text: "Znajdź błąd w zdaniu: " + item.tokens.join(" ") }),
      el("div", { class: "ex-sentence", role: "group", "aria-label": "Wyrazy zdania – kliknij błędny" }, tokens)
    ];
    if (!done) {
      nodes.push(el("p", { class: "tool-note", text: r
        ? (st.anchor !== null ? "Zaznaczono: „" + selected + "”. Jeśli błąd obejmuje więcej wyrazów, kliknij ostatni z nich." : "Zaznaczono: „" + selected + "”.")
        : "Kliknij wyraz z błędem. Jeśli błąd obejmuje kilka wyrazów, kliknij jeszcze ostatni z nich." }));
    }
    if (r && !st.noError) {
      const input = el("input", {
        type: "text", class: "field ex-fix", id: "ex-fix", value: st.fix, disabled: done,
        autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        placeholder: "poprawiony fragment (puste pole = usuń)",
        oninput: function () { st.fix = input.value; }
      });
      nodes.push(el("div", { class: "ex-fix-row" }, [el("label", { class: "field-label", for: "ex-fix", text: "Jak powinno być?" }), input]));
    }
    if (!done) {
      nodes.push(el("div", { class: "ex-tools" }, el("button", {
        type: "button", class: "btn btn-secondary btn-small" + (st.noError ? " is-active" : ""),
        "aria-pressed": st.noError ? "true" : "false",
        onclick: function () { st.noError = !st.noError; if (st.noError) { st.range = null; st.anchor = null; } repaint(null); }
      }, "Brak błędu")));
    }
    return nodes;
  }

  /** Zaznaczanie fragmentu: 1. klik = wyraz, 2. klik innego wyrazu = zakres; kolejny klik zaczyna od nowa. */
  function pickWord(st, i) {
    st.noError = false;
    if (st.anchor !== null && st.range && st.range[0] === st.range[1] && i !== st.anchor) {
      st.range = [Math.min(st.anchor, i), Math.max(st.anchor, i)];
      st.anchor = null;
    } else {
      st.range = [i, i];
      st.anchor = i;
    }
    // Fokus po przerysowaniu trafi na pole poprawki dopiero przy „Sprawdź”; zostawiamy go na wyrazie
  }

  function bodyShort(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const gap = function () {
      const input = el("input", {
        type: "text", class: "field ex-gap-input" + (done ? (p.res.correct ? " is-ok" : " is-bad") : ""),
        value: st.text, disabled: done, "data-fk": "first",
        autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        "aria-label": "Uzupełnij lukę",
        oninput: function () { st.text = input.value; }
      });
      return input;
    };
    return [
      item.context ? el("p", { class: "ex-context" }, [el("span", { class: "review-label", text: "Po polsku: " }), el("span", { text: item.context })]) : null,
      promptLines(item.prompt || "", gap, "ex-prompt")
    ];
  }

  // =====================================================================
  // INFORMACJA ZWROTNA
  // =====================================================================

  /** Wzorcowa odpowiedź jako tekst. */
  function modelAnswer(item) {
    if (item.type === "multiple-choice") return item.options[item.correct];
    if (item.type === "reorder") return item.answers[0];
    if (item.type === "short-answer") return String(item.prompt).replace("___", item.accepted[0]);
    if (item.noError) return "Zdanie jest poprawne – nie ma w nim błędu.";
    const t = item.tokens.slice();
    const fix = item.fixes[0];
    t.splice(item.errorRange[0], item.errorRange[1] - item.errorRange[0] + 1, fix);
    return t.filter(function (w) { return w !== ""; }).join(" ");
  }

  /** Odpowiedź użytkownika jako tekst (do listy błędów). */
  function userAnswer(p) {
    const st = p.st, item = p.item;
    if (item.type === "multiple-choice") return st.chosen === null ? "" : p.choice.options[st.chosen].text;
    if (item.type === "reorder") return st.line.map(function (t) { return t.text; }).join(" ");
    if (item.type === "short-answer") return st.text;
    if (st.noError) return "Brak błędu";
    if (!st.range) return "";
    return "„" + item.tokens.slice(st.range[0], st.range[1] + 1).join(" ") + "” → „" + st.fix + "”";
  }

  /** Opis zadania jednym zdaniem (lista błędów na ekranie wyników). */
  function itemSummary(item) {
    if (item.type === "multiple-choice") return String(item.prompt || "").replace(/\n/g, " / ");
    if (item.type === "reorder") return item.context ? "Ułóż: " + item.context : "Ułóż zdanie";
    if (item.type === "find-error") return item.tokens.join(" ");
    return (item.context ? item.context + " → " : "") + item.prompt;
  }

  function feedback(p) {
    const item = p.item, res = p.res;
    const lines = [];
    let verdict = res.correct ? "Dobrze!" : "Niestety nie.";
    if (item.type === "find-error" && !res.correct) {
      if (p.st.noError) verdict = "W tym zdaniu jest błąd.";
      else if (item.noError) verdict = "To zdanie jest poprawne.";
      else if (!res.rangeOk) verdict = "Błąd był w innym miejscu: „" + item.tokens.slice(item.errorRange[0], item.errorRange[1] + 1).join(" ") + "”.";
      else verdict = "Dobry fragment, ale poprawka nie pasuje.";
    }
    if (item.type === "reorder" && !res.correct && res.diffAt >= 0) verdict = "Niestety nie – ułożenie różni się od wyrazu nr " + (res.diffAt + 1) + ".";
    lines.push(el("p", { class: "lt-verdict" }, [
      el("span", { class: "c1-mark " + (res.correct ? "is-ok" : "is-bad"), "aria-hidden": "true" }, ELM.icon(res.correct ? "check" : "x", { size: 14 })),
      el("strong", { text: verdict })
    ]));
    if (item.type === "short-answer" && res.spelling) lines.push(el("p", { class: "ex-spelling", text: "Uwaga na pisownię – brakuje jednej litery albo jedna jest inna." }));
    if (!res.correct || item.type === "reorder" || item.type === "find-error") {
      lines.push(el("p", { class: "journal-row is-right" }, [el("span", { class: "review-label", text: "Poprawnie: " }), el("strong", { text: modelAnswer(item) })]));
    }
    if (item.explanation) lines.push(el("p", { text: item.explanation }));
    if (item.trap) {
      lines.push(el("div", { class: "ex-trap" }, [
        el("span", { class: "ex-trap-icon", "aria-hidden": "true" }, ELM.icon("triangle-alert", { size: 16 })),
        el("p", null, [el("strong", { text: "Pułapka: " }), item.trap])
      ]));
    }
    return lines;
  }

  // =====================================================================
  // EKRANY
  // =====================================================================

  function head(title, lead) {
    return el("header", { class: "tool-head" }, [
      el("p", { class: "tool-eyebrow" }, el("a", { href: BASE }, "Centrum ćwiczeń")),
      el("h1", { class: "tool-title", text: title }),
      lead ? el("p", { class: "tool-lead", text: lead }) : null
    ]);
  }

  function backLink() {
    const t = topicInfo(run.topic);
    return t ? { href: t.href, label: "Wróć do tematu" } : { href: BASE, label: "Wróć do Centrum ćwiczeń" };
  }

  function renderIntro(view) {
    const types = {};
    run.items.forEach(function (p) { types[p.item.type] = (types[p.item.type] || 0) + 1; });
    view.appendChild(head(run.title, run.intro));
    const score = run.saveId ? pd().setScore(run.saveId) : null;
    const modeRadio = function (value, label, hint) {
      return el("label", { class: "ex-mode" + (run.mode === value ? " is-chosen" : "") }, [
        el("input", { type: "radio", name: "ex-mode", value: value, checked: run.mode === value, onchange: function () { run.mode = value; repaint("mode-" + value); }, "data-fk": "mode-" + value }),
        el("span", null, [el("strong", { text: label }), el("span", { class: "ex-mode-hint", text: hint })])
      ]);
    };
    const t = topicInfo(run.topic);
    view.appendChild(el("section", { class: "card ex-intro" }, [
      el("p", { class: "ex-intro-count" }, [el("strong", { class: "num", text: String(run.items.length) }), " " + (run.items.length === 1 ? "zadanie" : run.items.length < 5 ? "zadania" : "zadań") + ": " + typesText(types) + "."]),
      score ? el("p", { class: "tool-note", text: "Najlepszy wynik: " + scoreText(score.best) + " · ostatni: " + scoreText(score.last) + " (" + score.last.date + ")" }) : null,
      el("fieldset", { class: "ex-modes" }, [
        el("legend", { class: "field-label", text: "Tryb" }),
        modeRadio("learn", "Nauka", "Wyjaśnienie po każdym zadaniu."),
        modeRadio("exam", "Egzamin", "Wszystkie wyjaśnienia na końcu.")
      ]),
      el("div", { class: "tool-actions" }, [
        el("button", { type: "button", class: "btn btn-primary", onclick: begin, "data-fk": "start" }, ELM.ui.withIcon("play", "Zacznij")),
        t ? el("a", { class: "btn btn-ghost", href: t.href }, "Wróć do tematu") : null
      ])
    ]));
  }

  function progressDots() {
    const total = run.items.length;
    const dots = run.items.map(function (p, i) {
      let cls = "lt-dot";
      if (p.res && run.mode === "learn") cls += p.res.correct ? " is-ok" : " is-bad";
      else if (p.res) cls += " is-done";
      if (i === run.i) cls += " is-current";
      return el("li", { class: cls }, p.res && run.mode === "learn" ? ELM.icon(p.res.correct ? "check" : "x", { size: 12 }) : null);
    });
    return el("div", { class: "lt-progress ex-progress" }, [
      el("ol", { class: "lt-dots", "aria-hidden": "true" }, dots),
      el("span", { class: "progress-text", text: "Zadanie " + (run.i + 1) + " z " + total + (run.mode === "exam" ? " · tryb egzaminu" : "") })
    ]);
  }

  function renderItem(view) {
    const p = run.items[run.i];
    const done = !!p.res;
    view.appendChild(el("header", { class: "tool-head ex-head" }, [
      el("p", { class: "tool-eyebrow" }, el("a", { href: backLink().href }, run.title)),
      progressDots()
    ]));
    let body;
    if (p.item.type === "multiple-choice") body = bodyChoice(p);
    else if (p.item.type === "reorder") body = bodyReorder(p);
    else if (p.item.type === "find-error") body = bodyFindError(p);
    else body = bodyShort(p);

    const last = run.i === run.items.length - 1;
    const primary = done
      ? el("button", { type: "button", class: "btn btn-primary ex-next", onclick: next }, last ? "Zobacz wynik" : ELM.ui.withIcon("arrow-right", "Dalej"))
      : el("button", { type: "button", class: "btn btn-primary ex-check", "data-fk": "check", onclick: check },
        run.mode === "exam" ? (last ? "Zakończ i zobacz wynik" : ELM.ui.withIcon("arrow-right", "Dalej")) : "Sprawdź");

    view.appendChild(el("section", { class: "card ex-card ex-type-" + p.item.type + (done ? (p.res.correct ? " is-correct" : " is-wrong") : ""), "aria-labelledby": "ex-type" }, [
      el("h2", { class: "ex-type", id: "ex-type", text: TYPE_LABEL[p.item.type] || "Zadanie" }),
      el("div", { class: "ex-body" }, body),
      el("div", { class: "ex-status" + (done ? " lt-feedback " + (p.res.correct ? "is-ok" : "is-bad") : ""), role: "status", "aria-live": "polite" }, done ? feedback(p) : null),
      el("div", { class: "tool-actions ex-actions" }, [
        primary,
        el("a", { class: "btn btn-ghost", href: backLink().href }, "Przerwij")
      ])
    ]));
  }

  const COMMENTS = [
    [100, "Komplet! Ten temat masz w małym palcu."],
    [80, "Świetnie – zostały drobiazgi do dopracowania."],
    [50, "Dobra robota. Przejrzyj błędy poniżej i spróbuj jeszcze raz."],
    [0, "Dobry początek. Wróć do tematu, a potem powtórz błędne zadania."]
  ];

  function renderDone(view) {
    const total = run.items.length;
    const pct = Math.round(run.score / total * 100);
    let comment = COMMENTS.find(function (c) { return pct >= c[0]; })[1];
    if (run.isMix && pct < 50) comment = "Dobry początek. Zajrzyj do tematu oznaczonego „do powtórki”, a potem powtórz błędne zadania.";
    const wrong = run.items.filter(function (p) { return !(p.res && p.res.correct); });
    view.appendChild(head(run.title + (run.retry ? " – poprawka błędów" : "")));

    const t = topicInfo(run.topic);
    const mix = mixFor(run.topic);
    const actions = [
      wrong.length ? el("button", { type: "button", class: "btn btn-primary", onclick: retryWrong }, ELM.ui.withIcon("rotate-ccw", "Powtórz tylko błędne (" + wrong.length + ")")) : null,
      el("button", { type: "button", class: "btn " + (wrong.length ? "btn-secondary" : "btn-primary"), onclick: redo }, run.isMix ? "Wylosuj nowy zestaw" : "Zrób jeszcze raz (inna kolejność)"),
      t ? el("a", { class: "btn btn-secondary", href: t.href }, "Wróć do tematu") : null,
      !run.isMix ? el("a", { class: "btn btn-ghost", href: mix ? BASE + "/mix/" + mix.id : BASE + "/mieszane" }, ELM.ui.withIcon("arrow-right", "Dalej: zestaw mieszany")) : el("a", { class: "btn btn-ghost", href: BASE }, "Centrum ćwiczeń")
    ];

    const saved = run.saved;
    view.appendChild(el("section", { class: "card ex-result", "aria-live": "polite" }, [
      el("p", { class: "ex-result-score" }, [
        el("strong", { class: "num", text: run.score + "/" + total }),
        el("span", { class: "ex-result-pct num", text: pct + "%" })
      ]),
      el("p", { class: "ex-result-comment", text: comment }),
      saved ? el("p", { class: "tool-note", text: saved.improved ? "Nowy najlepszy wynik!" : "Najlepszy wynik: " + scoreText(saved.best) + "." }) : null,
      run.retry ? el("p", { class: "tool-note", text: "Poprawka błędów nie zmienia zapisanego wyniku zestawu." }) : null,
      run.isMix ? topicBreakdown() : null,
      el("div", { class: "tool-actions" }, actions)
    ]));

    view.appendChild(el("section", { class: "card ex-review" }, [
      el("h2", { class: "section-title", text: wrong.length ? "Do poprawki (" + wrong.length + ")" : "Bez błędów – brawo!" }),
      wrong.length ? el("ol", { class: "ex-wrong" }, wrong.map(function (p) {
        const mine = userAnswer(p);
        return el("li", null, [
          el("p", { class: "ex-wrong-q" }, [el("span", { class: "chip", text: TYPE_SHORT[p.item.type] }), " ", itemSummary(p.item)]),
          el("p", { class: "journal-row is-wrong" }, [el("span", { class: "review-label", text: "Twoja odpowiedź: " }), el("span", { text: mine || "(brak)" })]),
          el("p", { class: "journal-row is-right" }, [el("span", { class: "review-label", text: "Poprawnie: " }), el("strong", { text: modelAnswer(p.item) })]),
          p.item.explanation ? el("p", { class: "ex-wrong-expl", text: p.item.explanation }) : null,
          p.item.trap ? el("p", { class: "ex-wrong-trap" }, [el("strong", { text: "Pułapka: " }), p.item.trap]) : null
        ]);
      })) : el("p", { class: "tool-note", text: "Wszystkie odpowiedzi były poprawne." })
    ]));
  }

  /** Trafność per temat w sesji mieszanej: „Najlepiej: …, do powtórki: …”. */
  function topicBreakdown() {
    const per = {};
    run.items.forEach(function (p) {
      const k = p.item.topic || "";
      per[k] = per[k] || { ok: 0, n: 0 };
      per[k].n++;
      if (p.res && p.res.correct) per[k].ok++;
    });
    const rows = Object.keys(per).map(function (k) {
      const info = topicInfo(k);
      return { name: info ? info.title : k, href: info ? info.href : null, ok: per[k].ok, n: per[k].n, r: per[k].ok / per[k].n };
    }).sort(function (a, b) { return b.r - a.r || a.n - b.n; }); // ostatni = najsłabszy (przy remisie: więcej zadań)
    if (!rows.length) return null;
    const best = rows[0], worst = rows[rows.length - 1];
    return el("div", { class: "ex-breakdown" }, [
      el("p", null, [el("span", { class: "review-label", text: "Najlepiej: " }), el("strong", { text: best.name }), " (" + best.ok + "/" + best.n + ")"]),
      worst !== best && worst.r < 1 ? el("p", null, [el("span", { class: "review-label", text: "Do powtórki: " }),
        worst.href ? el("a", { href: worst.href }, worst.name) : el("strong", { text: worst.name }), " (" + worst.ok + "/" + worst.n + ")"]) : null,
      el("ul", { class: "ex-breakdown-list" }, rows.map(function (r) {
        return el("li", null, [el("span", { text: r.name }), el("span", { class: "num", text: r.ok + "/" + r.n })]);
      }))
    ]);
  }

  /** Pierwszy gotowy mix zawierający temat (link „Dalej: zestaw mieszany”). */
  function mixFor(topic) {
    const index = ELM.CWICZENIA;
    if (!index || !topic) return null;
    return index.mixes.find(function (m) { return m.topics.indexOf(topic) !== -1; }) || null;
  }

  function retryWrong() {
    const wrong = run.items.filter(function (p) { return !(p.res && p.res.correct); }).map(function (p) { return p.item; });
    newRun(Object.assign({}, run, { items: wrong, retry: true }));
    begin();
  }

  function redo() {
    if (run.isMix && run.repick) return run.repick();
    const cfg = Object.assign({}, run, { items: X().shuffle(run.source), retry: false });
    newRun(cfg);
    begin();
  }

  // =====================================================================
  // WEJŚCIE NA ADRES
  // =====================================================================

  function loading(view, text) {
    view.appendChild(el("p", { class: "tool-note ex-loading", role: "status", text: text || "Wczytuję zadania…" }));
  }

  function missing(view, text) {
    view.appendChild(head("Nie znaleziono zestawu"));
    view.appendChild(el("div", { class: "empty-state" }, [
      el("p", { class: "empty-state-text", text: text }),
      el("p", null, el("a", { class: "btn btn-secondary", href: BASE }, "Przejdź do Centrum ćwiczeń"))
    ]));
  }

  /** Przygotowuje sesję dla adresu (po wczytaniu danych rysuje ponownie). */
  function ensureRun(route) {
    const key = route.kind + ":" + (route.id || "");
    const profile = ELM.app.getActiveProfile();
    if (run && run.key === key && run.profileId === (profile && profile.id)) return true;
    if (route.kind === "custom") return false;
    const hash = hrefOf(route);
    if (route.kind === "set") {
      loadSets([route.id]).then(function (sets) {
        if (location.hash !== hash) return;
        if (!sets.length) { run = { key: key, missing: true, profileId: profile && profile.id }; return render(); }
        const s = sets[0];
        newRun({ key: key, title: s.title, intro: s.intro, items: s.items, mode: s.defaultMode, topic: s.topic, saveId: s.id });
        render();
      });
      return null;
    }
    // Gotowy mix: losujemy z tematów mixu (bez zadań z ostatniej sesji mieszanej, gdy starcza)
    loadIndex().then(function (index) {
      const mix = index.mixes.find(function (m) { return m.id === route.id; });
      if (!mix) { run = { key: key, missing: true, profileId: profile && profile.id }; return render(); }
      const pick = function () {
        return loadTopicItems(mix.topics).then(function (pool) {
          const res = X().pickMix(pool, { count: mix.count || 10, types: mix.types, exclude: pd().lastMix() });
          newRun({
            key: key, title: mix.title, intro: mix.description + (res.items.length < (mix.count || 10) ? " W banku jest na razie " + res.items.length + " pasujących zadań." : ""),
            items: res.items, mode: mix.mode, saveId: mix.id, isMix: true
          });
          run.repick = function () { pick().then(function () { begin(); }); };
        });
      };
      pick().then(function () { if (location.hash === hash) render(); });
    });
    return null;
  }

  /** Sesja z generatora (Centrum ćwiczeń): ustawia stan i przechodzi na #/cwiczenia/sesja. */
  function startCustom(cfg) {
    newRun(Object.assign({ key: "custom:", isMix: true, title: "Zestaw mieszany", saveId: null }, cfg));
    if (cfg.autostart) { run.phase = "item"; run.i = 0; }
    if (location.hash === BASE + "/sesja") render();
    else location.hash = BASE + "/sesja";
  }

  function render(route) {
    const view = document.getElementById("view");
    route = route || parseRoute(location.hash);
    if (!route) return;
    if (route.kind === "hub") return ELM.exerciseHub.render(route);
    const profile = ELM.app.getActiveProfile();
    if (run && profile && run.profileId !== profile.id) run = null; // zmiana profilu = nowa sesja
    view.className = "view tool-view ex-view";
    view.dataset.file = hrefOf(route);
    view.replaceChildren();
    document.title = "Ćwiczenia · English Levels Map";

    const ready = ensureRun(route);
    if (ready === false) {
      missing(view, "Ta sesja już się skończyła albo strona została odświeżona. Wylosuj nowy zestaw w Centrum ćwiczeń.");
      return;
    }
    if (ready === null) return loading(view);
    if (run.missing) return missing(view, "Tego zestawu nie ma w banku zadań.");
    document.title = run.title + " · English Levels Map";
    if (run.phase === "intro") renderIntro(view);
    else if (run.phase === "item") renderItem(view);
    else renderDone(view);
  }

  /** Wejście z innego widoku: skończona sesja zaczyna się od ekranu startowego. */
  function onEnter() {
    if (!run || run.phase !== "done") return;
    if (/^mix:/.test(run.key)) run = null; // gotowy mix: przy następnym wejściu nowe losowanie
    else if (!run.isMix) newRun(Object.assign({}, run, { items: run.source, retry: false }));
  }

  // =====================================================================
  // KLAWIATURA: Enter = Sprawdź / Dalej, cyfry 1–4 = opcje, Backspace = cofnij wyraz
  // =====================================================================

  document.addEventListener("keydown", function (e) {
    if (!run || run.phase !== "item" || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!document.querySelector(".ex-view .ex-card")) return;
    const p = run.items[run.i];
    const t = e.target;
    const typing = t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type === "text"));
    if (e.key === "Enter") {
      // Na przyciskach Enter działa natywnie; w polu tekstowym i przy opcjach = Sprawdź
      if (t && t.tagName === "BUTTON" || t && t.tagName === "A") return;
      e.preventDefault();
      check();
      return;
    }
    if (p.res || typing) return;
    if (p.item.type === "multiple-choice" && /^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i < p.choice.options.length) { e.preventDefault(); p.st.chosen = i; repaint(i === 0 ? "first" : "opt-" + i); }
    } else if (p.item.type === "reorder" && e.key === "Backspace" && p.st.line.length) {
      e.preventDefault();
      p.st.line.pop();
      repaint("first");
    }
  });

  // =====================================================================
  // „SPRAWDŹ SIĘ” NA STRONIE TEMATU
  // =====================================================================

  /** Karta zestawu: tytuł, liczba zadań, typy, najlepszy i ostatni wynik, „Zacznij”. */
  function setCard(meta) {
    const score = pd().setScore(meta.id);
    return el("article", { class: "card ex-set-card lvl-" + (meta.level || "A1") }, [
      el("h3", { class: "ex-set-title", text: meta.title }),
      el("p", { class: "ex-set-meta", text: meta.count + " zadań · " + typesText(meta.types) }),
      el("p", { class: "ex-set-score" + (score ? "" : " is-empty") }, score
        ? [el("span", null, ["Najlepszy: ", el("strong", { class: "num", text: scoreText(score.best) })]), el("span", null, ["Ostatni: ", el("span", { class: "num", text: scoreText(score.last) })])]
        : "Jeszcze nie rozwiązany"),
      el("a", { class: "btn btn-primary btn-small", href: BASE + "/zestaw/" + meta.id, "aria-label": (score ? "Zacznij ponownie: " : "Zacznij: ") + meta.title }, ELM.ui.withIcon("play", score ? "Zacznij ponownie" : "Zacznij"))
    ]);
  }

  /**
   * Sekcja na końcu strony tematu. Zwraca element od razu (pusty i ukryty);
   * wypełnia go po wczytaniu indeksu, jeśli temat ma zestawy albo kartę w Labie czasów.
   */
  function topicSection(topicId) {
    const box = el("section", { class: "ex-topic", "aria-labelledby": "ex-topic-title", hidden: true });
    loadIndex().then(function (index) {
      const sets = (index.topics[topicId] || []).map(function (id) { return index.sets[id]; }).filter(Boolean);
      const tense = index.tenseByTopic && index.tenseByTopic[topicId];
      if (!sets.length && !tense) return;
      box.replaceChildren();
      U.appendChildren(box, [
        el("h2", { class: "ex-topic-title", id: "ex-topic-title" }, [
          el("span", { class: "callout-icon", "aria-hidden": "true" }, ELM.icon("list-checks", { size: 20 })),
          "Sprawdź się"
        ]),
        sets.length ? el("div", { class: "ex-set-grid" }, sets.map(setCard)) : null,
        tense ? el("p", { class: "ex-topic-lab" }, el("a", { class: "btn btn-secondary", href: "#/laboratorium-czasow/" + tense.id }, ELM.ui.withIcon("flask-conical", "Zobacz na osi czasu: " + tense.name))) : null
      ]);
      box.hidden = false;
    });
    return box;
  }

  ELM.exercises = {
    BASE: BASE,
    asset: asset,
    TYPE_SHORT: TYPE_SHORT,
    parseRoute: parseRoute,
    render: render,
    onEnter: onEnter,
    loadIndex: loadIndex,
    loadSets: loadSets,
    loadTopicItems: loadTopicItems,
    startCustom: startCustom,
    topicSection: topicSection,
    setCard: setCard,
    typesText: typesText,
    topicInfo: topicInfo
  };
})(window.ELM);
