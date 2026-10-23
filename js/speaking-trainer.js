/*
 * speaking-trainer.js — trener Speaking egzaminów z rejestru (B2 First, spec 09 sekcja 5).
 * Dane: trening/mowienie.json modułu ({ criteria, part1, part2, part3, part4 }).
 *
 *   ELM.speakingTrainer.create(cfg) → { render(view) → tytuł | null }
 *
 * cfg (js/exam-core.js):
 *   data()                  dane mowienie.json (albo null)
 *   section()               { label } sekcji trenerów z manifestu (albo null)
 *   crumb(label), notFound(msg)
 *   examId                  id egzaminu (historia sesji: ELM.profileData, klucz elm_speaking_v1)
 *
 * Widok: cztery zakładki (Part 1–4), losowanie grup pytań / kart / zadań, timery
 * (Part 1: 2 min, Part 2: 60 s, Part 3: 2 min + 1 min, Part 4: 4 min — z pliku),
 * tryb „z partnerem” / „solo” w Part 3, samoocena wg kryteriów (1–5) zapisywana
 * jako historia sesji per profil. Bez nagrywania dźwięku w aplikacji (prywatność).
 * Timer: przycisk start / pauza, pasek postępu (bez animacji przy prefers-reduced-motion),
 * czytniki ekranu słyszą tylko „30 sekund”, „10 sekund” i koniec czasu.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const PARTS = [1, 2, 3, 4];
  // Pytanie do partnera po Part 2 (w arkuszu drugi zdający odpowiada krótko, ok. 30 s)
  const PARTNER_QUESTION = "Which of these situations would you prefer to be in? Why?";

  function pick(list, not) {
    if (!list || !list.length) return 0;
    if (list.length === 1) return 0;
    let i;
    do { i = Math.floor(Math.random() * list.length); } while (i === not);
    return i;
  }

  function mmss(s) { s = Math.max(0, s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  // =====================================================================
  // TIMER (start / pauza, reset, pasek, ogłoszenia 30 s i 10 s)
  // =====================================================================

  let timers = []; // aktywne timery na ekranie (zatrzymywane przy zmianie widoku)

  function stopAll() { timers.forEach(function (t) { t.stop(); }); timers = []; }

  /** opts: { seconds, label, onEnd } → { node, start, stop, reset, done } */
  function makeTimer(opts) {
    const total = opts.seconds;
    let remaining = total, endAt = 0, handle = null, announced = {};
    const display = el("span", { class: "sp-timer-display num", role: "timer", "aria-live": "off", text: mmss(total) });
    const fill = el("span", { class: "sp-timer-fill" });
    const bar = el("span", { class: "sp-timer-bar", "aria-hidden": "true" }, fill);
    const live = el("span", { class: "visually-hidden", "aria-live": "polite" });
    const toggle = el("button", { type: "button", class: "btn btn-primary btn-small sp-timer-toggle" }, "Start");
    const reset = el("button", { type: "button", class: "btn btn-secondary btn-small" }, "Reset");
    const node = el("div", { class: "sp-timer" }, [
      el("span", { class: "sp-timer-label", text: opts.label }),
      display,
      el("span", { class: "sp-timer-buttons" }, [toggle, reset]),
      bar,
      live
    ]);
    const api = { node: node, done: false };

    function paint() {
      display.textContent = remaining <= 0 ? "Czas minął" : mmss(remaining);
      fill.style.width = (100 * (total - remaining) / total) + "%";
      node.classList.toggle("is-running", !!handle);
      node.classList.toggle("is-danger", remaining > 0 && remaining <= 10);
      node.classList.toggle("is-over", remaining <= 0);
      toggle.textContent = handle ? "Pauza" : remaining < total && remaining > 0 ? "Wznów" : "Start";
      toggle.disabled = remaining <= 0;
    }
    function tick() {
      if (!document.contains(node)) { api.stop(); return; }
      remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      [30, 10].forEach(function (s) {
        if (remaining === s && total > s && !announced[s]) { announced[s] = true; live.textContent = "Zostało " + s + " sekund."; }
      });
      if (remaining <= 0) {
        api.stop();
        api.done = true;
        live.textContent = opts.label + ": czas minął.";
        if (ELM.markActivity) ELM.markActivity();
        if (opts.onEnd) opts.onEnd();
      }
      paint();
    }
    api.start = function () {
      if (handle || remaining <= 0) return;
      endAt = Date.now() + remaining * 1000;
      handle = setInterval(tick, 250);
      if (timers.indexOf(api) === -1) timers.push(api);
      paint();
    };
    api.stop = function () {
      if (handle) { clearInterval(handle); handle = null; remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000)); }
      paint();
    };
    api.reset = function () { api.stop(); remaining = total; announced = {}; api.done = false; live.textContent = ""; paint(); };
    toggle.addEventListener("click", function () { if (handle) api.stop(); else api.start(); });
    reset.addEventListener("click", api.reset);
    paint();
    return api;
  }

  // =====================================================================
  // TRENER
  // =====================================================================

  function create(cfg) {
    // Wybór zapamiętany do końca wizyty (zakładka, wylosowane karty, tryb Part 3)
    const ui = { part: 1, group1: null, q1: 0, card2: null, task3: null, mode3: "partner", group4: null, q4: 0 };
    let repaintPanel = function () {}; // przerysowanie bieżącej zakładki (po losowaniu) — ustawia render

    function pd() { return ELM.profileData; }

    function render(view) {
      stopAll();
      const D = cfg.data();
      const found = cfg.section();
      if (!D || !found) { view.appendChild(cfg.notFound("Brak danych trenera Speaking.")); return null; }
      view.appendChild(cfg.crumb(found.label));
      view.appendChild(el("h1", { class: "c1-title", text: "Trener Speaking" }));
      view.appendChild(el("p", { class: "c1-lead", text: "Cztery części jak na egzaminie: losujesz pytania, kartę albo zadanie i mówisz na czas. Po sesji oceń się według czterech kryteriów – wynik zapisze się w historii Twojego profilu." }));
      view.appendChild(el("p", { class: "tool-note sp-privacy" }, [ELM.icon("info", { size: 16 }), " Aplikacja nie nagrywa dźwięku. Nagrywaj się telefonem, jeśli chcesz odsłuchać."]));

      const tabs = PARTS.map(function (n) {
        return el("button", {
          type: "button", role: "tab", class: "sp-tab", id: "sp-tab-" + n,
          "aria-selected": ui.part === n ? "true" : "false", "aria-controls": "sp-panel",
          tabindex: ui.part === n ? "0" : "-1",
          onclick: function () { select(n, false); }
        }, "Part " + n);
      });
      const tablist = el("div", { class: "sp-tabs", role: "tablist", "aria-label": "Części egzaminu Speaking" }, tabs);
      tablist.addEventListener("keydown", function (e) {
        const i = PARTS.indexOf(ui.part);
        let n = null;
        if (e.key === "ArrowRight") n = PARTS[(i + 1) % PARTS.length];
        else if (e.key === "ArrowLeft") n = PARTS[(i + PARTS.length - 1) % PARTS.length];
        else if (e.key === "Home") n = PARTS[0];
        else if (e.key === "End") n = PARTS[PARTS.length - 1];
        if (n === null) return;
        e.preventDefault();
        select(n, true);
      });
      const panel = el("section", { class: "card sp-panel", id: "sp-panel", role: "tabpanel", "aria-labelledby": "sp-tab-" + ui.part });
      view.appendChild(tablist);
      view.appendChild(panel);
      const history = el("section", { class: "card sp-history", "aria-labelledby": "sp-history-title" });
      view.appendChild(history);

      function select(n, focus) {
        if (n === ui.part && panel.childNodes.length) return;
        ui.part = n;
        tabs.forEach(function (t, i) {
          const on = PARTS[i] === n;
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
        });
        panel.setAttribute("aria-labelledby", "sp-tab-" + n);
        if (focus) tabs[PARTS.indexOf(n)].focus();
        paintPanel();
      }

      function paintPanel() {
        stopAll();
        panel.replaceChildren();
        const P = D["part" + ui.part];
        panel.appendChild(el("h2", { class: "section-title sp-part-title", text: P.title }));
        if (ui.part === 1) part1(panel, P);
        else if (ui.part === 2) part2(panel, P);
        else if (ui.part === 3) part3(panel, P);
        else part4(panel, P);
        panel.appendChild(selfAssessment(D, ui.part, paintHistory));
      }

      function paintHistory() { renderHistory(history, D); }

      repaintPanel = paintPanel;
      paintPanel();
      paintHistory();
      return "Trener Speaking";
    }

    // ---------- Part 1 i Part 4: pytania po jednym ----------

    function questionsPart(panel, P, groupKey, qKey, intro) {
      const groups = P.groups || [];
      if (ui[groupKey] === null || !groups[ui[groupKey]]) { ui[groupKey] = pick(groups); ui[qKey] = 0; }
      const g = groups[ui[groupKey]];
      const timer = makeTimer({ seconds: P.seconds, label: "Czas" });
      const qBox = el("div", { class: "sp-question", "aria-live": "polite" });
      const nextBtn = el("button", { type: "button", class: "btn btn-secondary" });
      function paintQ() {
        const i = Math.min(ui[qKey], g.questions.length - 1);
        qBox.replaceChildren(
          el("p", { class: "sp-q-count", text: "Pytanie " + (i + 1) + " z " + g.questions.length }),
          el("p", { class: "sp-q-text", lang: "en", text: g.questions[i] })
        );
        nextBtn.replaceChildren.apply(nextBtn, ELM.ui.withIcon("arrow-right", i < g.questions.length - 1 ? "Następne pytanie" : "Od początku"));
      }
      nextBtn.addEventListener("click", function () {
        ui[qKey] = ui[qKey] < g.questions.length - 1 ? ui[qKey] + 1 : 0;
        paintQ();
      });
      const select = el("select", { class: "field sp-topic-select", id: "sp-topic-" + groupKey, onchange: function () {
        ui[groupKey] = Number(select.value); ui[qKey] = 0; repaintPanel();
        const again = document.getElementById("sp-topic-" + groupKey); if (again) again.focus();
      } }, groups.map(function (x, i) { return el("option", { value: String(i), selected: i === ui[groupKey], text: x.topic }); }));
      paintQ();
      panel.appendChild(el("p", { class: "sp-intro", text: intro }));
      panel.appendChild(el("div", { class: "sp-controls" }, [
        el("label", { class: "sp-field" }, [el("span", { class: "field-label", text: "Temat" }), select]),
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { ui[groupKey] = pick(groups, ui[groupKey]); ui[qKey] = 0; repaintPanel(); } }, ELM.ui.withIcon("shuffle", "Losuj temat"))
      ]));
      panel.appendChild(el("div", { class: "sp-part-body" }, [qBox, el("div", { class: "sp-actions" }, [nextBtn]), timer.node]));
    }

    function part1(panel, P) {
      questionsPart(panel, P, "group1", "q1", "Egzaminator zadaje krótkie pytania o Ciebie. Odpowiadaj 2–3 zdaniami: odpowiedź, powód, przykład.");
    }

    function part4(panel, P) {
      questionsPart(panel, P, "group4", "q4", "Dyskusja rozwijająca temat Part 3. Podawaj opinię z uzasadnieniem i odnoś się do zdania partnera.");
    }

    // ---------- Part 2: dwie sytuacje, 60 s, pytanie do partnera ----------

    function part2(panel, P) {
      const cards = P.cards || [];
      if (ui.card2 === null || !cards[ui.card2]) ui.card2 = pick(cards);
      const c = cards[ui.card2];
      const partner = el("div", { class: "sp-partner", hidden: true }, [
        el("p", { class: "review-label", text: "Pytanie do partnera (ok. 30 sekund):" }),
        el("p", { class: "sp-q-text", lang: "en", text: PARTNER_QUESTION })
      ]);
      const partnerBtn = el("button", { type: "button", class: "btn btn-secondary", hidden: true, onclick: function () { partner.hidden = false; partnerBtn.hidden = true; partner.focus(); } }, "Pokaż pytanie do partnera");
      partner.tabIndex = -1;
      const timer = makeTimer({ seconds: P.seconds, label: "Twoja wypowiedź", onEnd: function () { partnerBtn.hidden = false; } });
      panel.appendChild(el("p", { class: "sp-intro", text: "Zamiast zdjęć masz dwie sytuacje. Wyobraź je sobie i mów przez minutę." }));
      panel.appendChild(el("p", { class: "sp-q-text sp-card-question", lang: "en", text: c.question }));
      panel.appendChild(el("div", { class: "sp-pictures" }, [
        el("figure", { class: "sp-picture" }, [el("span", { class: "sp-picture-mark", "aria-hidden": "true", text: "A" }), el("figcaption", { lang: "en", text: c.a })]),
        el("figure", { class: "sp-picture" }, [el("span", { class: "sp-picture-mark", "aria-hidden": "true", text: "B" }), el("figcaption", { lang: "en", text: c.b })])
      ]));
      panel.appendChild(el("aside", { class: "callout callout-tip sp-reminder", "aria-label": "Przypomnienie" }, [
        el("p", { class: "callout-title", text: "Porównuj, spekuluj, nie opisuj po kolei" }),
        el("p", { lang: "en", text: "Both pictures show… · In the first one…, whereas in the second… · They might be… because… · It looks as if…" })
      ]));
      panel.appendChild(timer.node);
      panel.appendChild(el("div", { class: "sp-actions" }, [
        partnerBtn,
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { ui.card2 = pick(cards, ui.card2); repaintPanel(); } }, ELM.ui.withIcon("shuffle", "Inna karta"))
      ]));
      panel.appendChild(partner);
    }

    // ---------- Part 3: zadanie z pięcioma opcjami, 2 min + 1 min ----------

    function part3(panel, P) {
      const tasks = P.tasks || [];
      if (ui.task3 === null || !tasks[ui.task3]) ui.task3 = pick(tasks);
      const t = tasks[ui.task3];
      const modes = [
        ["partner", "Z partnerem", "Rozmawiacie we dwoje. Na zmianę omawiajcie opcje, pytajcie o zdanie (What do you think about…?) i nie zostawiajcie partnera bez odpowiedzi."],
        ["solo", "Solo", "Mówisz za obie strony: po każdej opinii zadaj sobie pytanie partnera i odpowiedz na nie, np. „I think… – But wouldn't… be better? – Maybe, although…”."]
      ];
      const modeNote = el("p", { class: "tool-note sp-mode-note" });
      function paintMode() { modeNote.textContent = modes.find(function (m) { return m[0] === ui.mode3; })[2]; }
      const decision = el("div", { class: "sp-decision", hidden: true });
      decision.tabIndex = -1;
      const decisionTimer = makeTimer({ seconds: P.decisionSeconds, label: "Decyzja" });
      const toDecision = el("button", { type: "button", class: "btn btn-secondary", onclick: showDecision }, ELM.ui.withIcon("arrow-right", "Przejdź do decyzji"));
      function showDecision() {
        if (!decision.hidden) return;
        decision.hidden = false;
        toDecision.hidden = true;
        decision.focus();
      }
      const discussion = makeTimer({ seconds: P.discussionSeconds, label: "Dyskusja", onEnd: showDecision });
      decision.appendChild(el("p", { class: "review-label", text: "Teraz zdecydujcie (ok. minuty):" }));
      decision.appendChild(el("p", { class: "sp-q-text", lang: "en", text: t.decision }));
      decision.appendChild(decisionTimer.node);

      panel.appendChild(el("fieldset", { class: "sp-modes" }, [el("legend", { class: "field-label", text: "Tryb" })].concat(modes.map(function (m) {
        return el("label", { class: "sp-mode" }, [
          el("input", { type: "radio", name: "sp-mode", value: m[0], checked: ui.mode3 === m[0], onchange: function () { ui.mode3 = m[0]; paintMode(); } }),
          el("span", { text: m[1] })
        ]);
      }))));
      paintMode();
      panel.appendChild(modeNote);
      panel.appendChild(el("div", { class: "sp-mindmap" }, [
        el("p", { class: "sp-central", lang: "en", text: t.central }),
        el("ul", { class: "sp-options", "aria-label": "Opcje do omówienia" }, t.options.map(function (o) { return el("li", { class: "sp-option", lang: "en", text: o }); }))
      ]));
      panel.appendChild(discussion.node);
      panel.appendChild(el("div", { class: "sp-actions" }, [
        toDecision,
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { ui.task3 = pick(tasks, ui.task3); repaintPanel(); } }, ELM.ui.withIcon("shuffle", "Inne zadanie"))
      ]));
      panel.appendChild(decision);
    }

    // ---------- Samoocena i historia ----------

    function selfAssessment(D, part, onSaved) {
      const criteria = D.criteria || [];
      const box = el("div", { class: "sp-self" });
      const open = el("button", { type: "button", class: "btn btn-primary" }, "Zakończ sesję i oceń się");
      const form = el("form", { class: "sp-self-form", hidden: true, "aria-labelledby": "sp-self-title" });
      const status = el("p", { class: "c1-saved", role: "status" });
      const inputs = criteria.map(function (c) {
        const id = "sp-crit-" + c.id;
        const out = el("output", { class: "sp-crit-value num", for: id, text: "3" });
        const input = el("input", { type: "range", id: id, min: "1", max: "5", step: "1", value: "3", "aria-describedby": id + "-hint",
          oninput: function () { out.textContent = input.value; } });
        form.appendChild(el("div", { class: "sp-crit" }, [
          el("label", { class: "sp-crit-label", for: id, text: c.label }),
          el("div", { class: "sp-crit-row" }, [input, out]),
          el("p", { class: "tool-note", id: id + "-hint", text: c.hint })
        ]));
        return { c: c, input: input };
      });
      form.insertBefore(el("h3", { class: "c1-check-title", id: "sp-self-title", text: "Samoocena – Part " + part + " (1–5)" }), form.firstChild);
      form.appendChild(el("div", { class: "sp-actions" }, [el("button", { type: "submit", class: "btn btn-primary" }, "Zapisz ocenę"), status]));
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        stopAll();
        const scores = {};
        inputs.forEach(function (x) { scores[x.c.id] = Number(x.input.value); });
        const saved = pd() && pd().addSpeakingSession({ exam: cfg.examId, part: part, scores: scores });
        status.textContent = saved ? "Zapisano w historii sesji." : "Nie zapisano – wybierz albo utwórz profil.";
        if (saved && onSaved) onSaved();
      });
      open.addEventListener("click", function () {
        stopAll();
        form.hidden = false;
        open.hidden = true;
        if (inputs[0]) inputs[0].input.focus();
      });
      box.appendChild(open);
      box.appendChild(form);
      return box;
    }

    function renderHistory(box, D) {
      const label = {};
      (D.criteria || []).forEach(function (c) { label[c.id] = c.label; });
      const list = pd() ? pd().speakingSessions(cfg.examId) : [];
      box.replaceChildren(el("h2", { class: "section-title", id: "sp-history-title", text: "Historia sesji" }));
      if (!list.length) {
        box.appendChild(el("p", { class: "tool-note", text: "Brak zapisanych sesji. Po ćwiczeniu kliknij „Zakończ sesję i oceń się”." }));
        return;
      }
      // Średnie z ostatnich 10 sesji
      const recent = list.slice(-10);
      const avg = (D.criteria || []).map(function (c) {
        const v = recent.map(function (s) { return s.scores[c.id]; }).filter(function (x) { return typeof x === "number"; });
        return v.length ? { label: c.label, value: (v.reduce(function (a, b) { return a + b; }, 0) / v.length).toFixed(1).replace(".", ",") } : null;
      }).filter(Boolean);
      box.appendChild(el("p", { class: "tool-note", text: "Średnio z ostatnich " + recent.length + " sesji: " + avg.map(function (a) { return a.label + " " + a.value; }).join(" · ") }));
      box.appendChild(el("ol", { class: "sp-history-list", reversed: true }, list.slice(-8).reverse().map(function (s) {
        return el("li", null, [
          el("span", { class: "sp-history-head", text: s.day.split("-").reverse().join(".") + " · Part " + s.part }),
          el("span", { class: "sp-history-scores", text: Object.keys(s.scores).map(function (k) { return (label[k] || k) + " " + s.scores[k]; }).join(" · ") })
        ]);
      })));
    }

    return { render: render };
  }

  window.addEventListener("hashchange", stopAll);

  ELM.speakingTrainer = { create: create, makeTimer: makeTimer };
})(window.ELM);
