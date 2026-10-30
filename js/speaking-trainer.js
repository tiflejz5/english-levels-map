/*
 * speaking-trainer.js — trener mówienia egzaminów z rejestru (B2 First, matura ustna, trening E8; spec 09 sekcja 5 i spec 18).
 * Dane: trening/mowienie.json modułu. Trzy formaty (pole "format"):
 *   (brak)    B2 First: { criteria, part1, part2, part3, part4 } — cztery części Speaking,
 *   "matura"  matura ustna: { criteria, intro, roleplay, picture, choice } — rozmowa wstępna + zadania 1–3 (czasy orientacyjne),
 *   "simple"  trening dodatkowy (E8, A2): { criteria, cards: [ { kind, task, questions, … } ] } — jedna lista kart.
 *
 *   ELM.speakingTrainer.create(cfg) → { render(view) → tytuł | null }
 *   ELM.speakingTrainer.makeTimer(opts) → { node, start, stop, reset, on(zdarzenie, fn), done }
 *
 * cfg (js/exam-core.js):
 *   data()                  dane mowienie.json (albo null)
 *   section()               { label } sekcji trenerów z manifestu (albo null)
 *   crumb(label), notFound(msg)
 *   examId                  id egzaminu (historia sesji i widziane karty: ELM.profileData, klucz elm_speaking_v1)
 *
 * Wspólne: losowanie kart bez powtórek („Losuj”; widziane karty w elm_speaking_v1.seen, po wyczerpaniu puli nowy cykl),
 * timery (start / pauza, pasek, ogłoszenia 30 s i 10 s dla czytników ekranu), „Egzaminator czyta” (syntezator en-GB, tempo 0,9),
 * nagrywanie z js/recorder.js (do 3 prób, tylko lokalnie), samoocena wg kryteriów (1–5) zapisywana jako historia sesji per profil,
 * tryb „Cały egzamin” (B2 i matura): wszystkie części po kolei z timerami, na końcu odsłuch nagrań i samoocena.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  // Pytanie do partnera po Part 2 B2 (w arkuszu drugi zdający odpowiada krótko, ok. 30 s)
  const PARTNER_QUESTION = "Which of these situations would you prefer to be in? Why?";

  function mmss(s) { s = Math.max(0, s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function hasProfile() { return !!(ELM.app && ELM.app.getActiveProfile && ELM.app.getActiveProfile()); }

  // =====================================================================
  // GŁOS EGZAMINATORA (Web Speech API, ten sam sposób co zadania słuchania)
  // =====================================================================

  function synthOk() { return "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function"; }
  function voiceOk() {
    if (!synthOk()) return false;
    const v = window.speechSynthesis.getVoices();
    return !v.length || v.some(function (x) { return /^en/i.test(x.lang); });
  }
  function stopSpeech() { if (synthOk()) window.speechSynthesis.cancel(); }
  function speak(text) {
    if (!voiceOk()) return;
    const s = window.speechSynthesis;
    s.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    const vs = s.getVoices();
    const v = vs.find(function (x) { return /^en[-_]GB/i.test(x.lang); }) || vs.find(function (x) { return /^en/i.test(x.lang); });
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
    u.rate = 0.9;
    s.speak(u);
  }

  // =====================================================================
  // TIMER (start / pauza, reset, pasek, ogłoszenia 30 s i 10 s)
  // =====================================================================

  let timers = []; // aktywne timery na ekranie (zatrzymywane przy zmianie widoku)

  function stopAll() { timers.forEach(function (t) { t.stop(); }); timers = []; stopSpeech(); }

  /** opts: { seconds, label, onEnd } → { node, start, stop, reset, on, done }; zdarzenia on("start" | "end", fn) łączą timer z nagrywaniem. */
  function makeTimer(opts) {
    const total = opts.seconds;
    let remaining = total, endAt = 0, handle = null, announced = {};
    const listeners = { start: [], end: [] };
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

    function fire(name) { listeners[name].forEach(function (fn) { fn(); }); }
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
        fire("end");
        if (opts.onEnd) opts.onEnd();
      }
      paint();
    }
    api.start = function () {
      if (handle || remaining <= 0) return;
      const fresh = remaining === total;
      endAt = Date.now() + remaining * 1000;
      handle = setInterval(tick, 250);
      if (timers.indexOf(api) === -1) timers.push(api);
      paint();
      if (fresh) fire("start");
    };
    api.stop = function () {
      if (handle) { clearInterval(handle); handle = null; remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000)); }
      paint();
    };
    api.reset = function () { api.stop(); remaining = total; announced = {}; api.done = false; live.textContent = ""; paint(); };
    api.on = function (name, fn) { if (listeners[name]) listeners[name].push(fn); };
    toggle.addEventListener("click", function () { if (handle) api.stop(); else api.start(); });
    reset.addEventListener("click", api.reset);
    paint();
    return api;
  }

  // =====================================================================
  // TRENER
  // =====================================================================

  function create(cfg) {
    // Wybór zapamiętany do końca wizyty (zakładka, wylosowane karty, tryb Part 3, filtr rodzaju, głos egzaminatora)
    const ui = { tab: 0, cur: {}, mode3: "partner", kind: "all", mem: {}, examiner: false, full: null };

    function pd() { return ELM.profileData; }

    // ---------- jednostki (części) zależnie od formatu ----------

    function unitsOf(D) {
      const fmt = D.format || "b2";
      if (fmt === "matura") {
        return [
          { key: "intro", tab: "Rozmowa wstępna", part: 1, P: D.intro, pool: D.intro.groups, type: "groups", lead: "Egzaminator zadaje krótkie pytania o Ciebie. Odpowiadaj 2–3 zdaniami: odpowiedź, powód, przykład." },
          { key: "roleplay", tab: "Zadanie 1", part: 2, P: D.roleplay, pool: D.roleplay.cards, type: "roleplay" },
          { key: "picture", tab: "Zadanie 2", part: 3, P: D.picture, pool: D.picture.cards, type: "picture" },
          { key: "choice", tab: "Zadanie 3", part: 4, P: D.choice, pool: D.choice.cards, type: "choice" }
        ];
      }
      if (fmt === "simple") return [{ key: "cards", tab: "Karty", part: 1, P: { title: "Karty do mówienia" }, pool: D.cards, type: "simple" }];
      return [
        { key: "part1", tab: "Part 1", part: 1, P: D.part1, pool: D.part1.groups, type: "groups", lead: "Egzaminator zadaje krótkie pytania o Ciebie. Odpowiadaj 2–3 zdaniami: odpowiedź, powód, przykład." },
        { key: "part2", tab: "Part 2", part: 2, P: D.part2, pool: D.part2.cards, type: "b2cards" },
        { key: "part3", tab: "Part 3", part: 3, P: D.part3, pool: D.part3.tasks, type: "b2task" },
        { key: "part4", tab: "Part 4", part: 4, P: D.part4, pool: D.part4.groups, type: "groups", lead: "Dyskusja rozwijająca temat Part 3. Podawaj opinię z uzasadnieniem i odnoś się do zdania partnera." }
      ];
    }

    function idOf(unit, i) { return (unit.pool[i] && unit.pool[i].id) || unit.key + "-" + (i + 1); }

    function labelOf(unit, i) {
      const c = unit.pool[i];
      const base = c.topic || (c.a && c.b ? c.a + " / " + c.b : c.central) || "Karta";
      return (i + 1) + ". " + String(base).slice(0, 70);
    }

    // ---------- losowanie bez powtórek (elm_speaking_v1.seen) ----------

    function seenKey(unit) { return cfg.examId + ":" + unit.key; }
    function seenList(unit) {
      if (hasProfile() && pd()) return pd().speakingSeen(seenKey(unit));
      return (ui.mem[seenKey(unit)] || []).slice();
    }
    function markSeen(unit, id) {
      if (hasProfile() && pd()) pd().markSpeakingSeen(seenKey(unit), id);
      else if (id === null) delete ui.mem[seenKey(unit)];
      else { const l = ui.mem[seenKey(unit)] = ui.mem[seenKey(unit)] || []; if (l.indexOf(id) === -1) l.push(id); }
    }

    /** Losuje indeks z kandydatów, których profil jeszcze nie widział w tym cyklu (po wyczerpaniu puli — nowy cykl). */
    function draw(unit, cands) {
      const seen = seenList(unit);
      let rest = cands.filter(function (i) { return seen.indexOf(idOf(unit, i)) === -1 && i !== ui.cur[unit.key]; });
      let restarted = false;
      if (!rest.length) {
        restarted = cands.length > 1;
        if (restarted) markSeen(unit, null);
        rest = cands.filter(function (i) { return i !== ui.cur[unit.key]; });
        if (!rest.length) rest = cands.slice();
      }
      const i = rest[Math.floor(Math.random() * rest.length)];
      markSeen(unit, idOf(unit, i));
      if (restarted) ELM.ui.toast({ text: "Przerobiłeś wszystkie karty – zaczynamy od nowa.", icon: "check" });
      ui.cur[unit.key] = i;
      return i;
    }

    function candidates(unit) {
      const all = unit.pool.map(function (c, i) { return i; });
      return unit.type === "simple" && ui.kind !== "all" ? all.filter(function (i) { return unit.pool[i].kind === ui.kind; }) : all;
    }

    // ---------- widok ----------

    function render(view) {
      stopAll();
      if (ELM.recorder) ELM.recorder.destroyAll();
      const D = cfg.data();
      const found = cfg.section();
      if (!D || !found) { view.appendChild(cfg.notFound("Brak danych trenera mówienia.")); return null; }
      const fmt = D.format || "b2";
      const units = unitsOf(D);
      const hasFull = fmt !== "simple";
      const title = fmt === "matura" ? "Trener matury ustnej" : fmt === "simple" ? "Mówienie A2 (trening dodatkowy)" : "Trener Speaking";
      view.appendChild(cfg.crumb(found.label));
      view.appendChild(el("h1", { class: "c1-title", text: title }));
      if (fmt === "matura") {
        view.appendChild(el("p", { class: "c1-lead", text: "Rozmowa wstępna i trzy zadania jak na maturze ustnej: losujesz kartę, mówisz na czas, odsłuchujesz się i oceniasz. Ta sama matura ustna obowiązuje na poziomie podstawowym i rozszerzonym." }));
      } else if (fmt === "simple") {
        view.appendChild(el("p", { class: "sp-note-banner", role: "note", text: D.note }));
        view.appendChild(el("p", { class: "c1-lead", text: "Losujesz kartę, mówisz przez minutę–półtorej, odsłuchujesz się i oceniasz. Pełne zdania i powód „because…” to najlepszy trening także do pisania." }));
      } else {
        view.appendChild(el("p", { class: "c1-lead", text: "Cztery części jak na egzaminie: losujesz pytania, kartę albo zadanie i mówisz na czas. Po sesji oceń się według czterech kryteriów – wynik zapisze się w historii Twojego profilu." }));
      }
      if (D.note && fmt === "matura") view.appendChild(el("p", { class: "tool-note", text: D.note }));
      view.appendChild(el("p", { class: "tool-note sp-privacy" }, [ELM.icon("info", { size: 16 }), " Nagranie zostaje tylko w tej karcie przeglądarki – nic nie jest zapisywane ani wysyłane."]));

      const tabDefs = units.map(function (u, i) { return { id: u.key, label: u.tab, unit: u, index: i }; });
      if (hasFull) tabDefs.push({ id: "full", label: "Cały egzamin", index: units.length });
      if (ui.tab >= tabDefs.length) ui.tab = 0;

      let tabs = [];
      const panel = el("section", { class: "card sp-panel", id: "sp-panel", role: fmt === "simple" ? null : "tabpanel" });
      if (fmt !== "simple") {
        tabs = tabDefs.map(function (t) {
          return el("button", {
            type: "button", role: "tab", class: "sp-tab", id: "sp-tab-" + t.index,
            "aria-selected": ui.tab === t.index ? "true" : "false", "aria-controls": "sp-panel",
            tabindex: ui.tab === t.index ? "0" : "-1",
            onclick: function () { select(t.index, false); }
          }, t.label);
        });
        const tablist = el("div", { class: "sp-tabs", role: "tablist", "aria-label": fmt === "matura" ? "Części matury ustnej" : "Części egzaminu Speaking" }, tabs);
        tablist.addEventListener("keydown", function (e) {
          let n = null;
          if (e.key === "ArrowRight") n = (ui.tab + 1) % tabDefs.length;
          else if (e.key === "ArrowLeft") n = (ui.tab + tabDefs.length - 1) % tabDefs.length;
          else if (e.key === "Home") n = 0;
          else if (e.key === "End") n = tabDefs.length - 1;
          if (n === null) return;
          e.preventDefault();
          select(n, true);
        });
        view.appendChild(tablist);
        panel.setAttribute("aria-labelledby", "sp-tab-" + ui.tab);
      }
      view.appendChild(panel);
      const history = el("section", { class: "card sp-history", "aria-labelledby": "sp-history-title" });
      view.appendChild(history);

      function select(n, focus) {
        if (n === ui.tab && panel.childNodes.length) return;
        ui.tab = n;
        tabs.forEach(function (t, i) { const on = i === n; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
        panel.setAttribute("aria-labelledby", "sp-tab-" + n);
        if (focus) tabs[n].focus();
        paintPanel();
      }

      function paintHistory() { renderHistory(history, D, units); }

      function paintPanel() {
        stopAll();
        if (ELM.recorder) ELM.recorder.destroyAll();
        panel.replaceChildren();
        const t = tabDefs[ui.tab];
        if (t.id === "full") { fullExam(panel, D, units, paintHistory, paintPanel); return; }
        showUnit(panel, t.unit, D, paintPanel, paintHistory);
      }

      paintPanel();
      paintHistory();
      return title;
    }

    // ---------- jedna część: wybór karty, treść, nagrywanie, samoocena ----------

    function examinerSwitch() {
      const id = "sp-examiner";
      const ok = voiceOk();
      const input = el("input", { type: "checkbox", id: id, checked: ok && ui.examiner, disabled: !ok, onchange: function () { ui.examiner = input.checked; if (!input.checked) stopSpeech(); } });
      return el("div", { class: "fc-check sp-switch" }, [
        input,
        el("label", { for: id, text: "Egzaminator czyta pytania" }),
        ok ? null : el("p", { class: "tool-note", text: "Ta przeglądarka nie ma głosu angielskiego – przełącznik jest nieaktywny." })
      ]);
    }

    function say(text) { if (ui.examiner) speak(text); }

    function showUnit(panel, unit, D, repaint, onSaved) {
      if (ui.cur[unit.key] === undefined || !unit.pool[ui.cur[unit.key]]) draw(unit, candidates(unit));
      const cands = candidates(unit);
      if (cands.indexOf(ui.cur[unit.key]) === -1) draw(unit, cands);
      const i = ui.cur[unit.key];
      const item = unit.pool[i];

      panel.appendChild(el("h2", { class: "section-title sp-part-title", text: unit.type === "simple" ? "Karta do mówienia" : unit.P.title }));
      if (unit.lead) panel.appendChild(el("p", { class: "sp-intro", text: unit.lead }));

      const controls = [];
      if (unit.type === "simple") {
        const kinds = [["all", "Wszystkie rodzaje"], ["opis", "Opisz / opowiedz"], ["sytuacja", "Sytuacja"], ["opinia", "Co wolisz?"]];
        controls.push(el("label", { class: "sp-field" }, [el("span", { class: "field-label", text: "Rodzaj" }),
          el("select", { class: "field", id: "sp-kind", onchange: function () { ui.kind = this.value; draw(unit, candidates(unit)); repaint(); const a = document.getElementById("sp-kind"); if (a) a.focus(); } },
            kinds.map(function (k) { return el("option", { value: k[0], selected: ui.kind === k[0], text: k[1] }); }))]));
      }
      const select = el("select", { class: "field sp-topic-select", id: "sp-topic-" + unit.key, onchange: function () {
        ui.cur[unit.key] = Number(select.value); markSeen(unit, idOf(unit, ui.cur[unit.key])); repaint();
        const again = document.getElementById("sp-topic-" + unit.key); if (again) again.focus();
      } }, cands.map(function (c) { return el("option", { value: String(c), selected: c === i, text: labelOf(unit, c) }); }));
      controls.push(el("label", { class: "sp-field" }, [el("span", { class: "field-label", text: unit.type === "simple" ? "Karta" : "Temat" }), select]));
      controls.push(el("button", { type: "button", class: "btn btn-secondary", onclick: function () { draw(unit, cands); repaint(); } }, ELM.ui.withIcon("shuffle", "Losuj")));
      panel.appendChild(el("div", { class: "sp-controls" }, controls));
      const seen = seenList(unit).filter(function (id) { return cands.some(function (c) { return idOf(unit, c) === id; }); }).length;
      panel.appendChild(el("p", { class: "tool-note sp-seen", text: "Losowanie bez powtórek: przerobione karty " + Math.min(seen, cands.length) + " z " + cands.length + "." + (hasProfile() ? "" : " Bez profilu licznik działa tylko do zamknięcia karty.") }));
      panel.appendChild(examinerSwitch());

      const rec = ELM.recorder ? ELM.recorder.create({ exam: cfg.examId, card: idOf(unit, i) }) : null;
      const ctx = { rec: rec, repaint: repaint };
      paintItem(panel, unit, item, ctx);
      if (rec) panel.appendChild(rec.node);
      panel.appendChild(selfAssessment(D, unit.type === "simple" ? "karta" : unit.tab, unit.part, false, onSaved));
    }

    // ---------- treść karty wg typu ----------

    function mainTimer(ctx, seconds, label, extra) {
      const t = makeTimer(Object.assign({ seconds: seconds, label: label }, extra || {}));
      if (ctx.rec) ctx.rec.attach(t);
      return t;
    }

    function phrasesBox(list) {
      if (!list || !list.length) return null;
      return el("details", { class: "sp-phrases" }, [el("summary", { text: "Przydatne zwroty" }), el("ul", { lang: "en" }, list.map(function (p) { return el("li", { text: p }); }))]);
    }

    /** Pytania po jednym: „Następne pytanie”, „Odtwórz” i (gdy włączone) odczyt przez egzaminatora. */
    function questionStepper(questions, label) {
      let n = 0;
      const box = el("div", { class: "sp-question", "aria-live": "polite" });
      const nextBtn = el("button", { type: "button", class: "btn btn-secondary" });
      const playBtn = el("button", { type: "button", class: "btn btn-ghost", hidden: !voiceOk(), onclick: function () { speak(questions[n]); } }, ELM.ui.withIcon("play", "Odtwórz pytanie"));
      function paint(auto) {
        box.replaceChildren(
          el("p", { class: "sp-q-count", text: (label || "Pytanie") + " " + (n + 1) + " z " + questions.length }),
          el("p", { class: "sp-q-text", lang: "en", text: questions[n] })
        );
        nextBtn.replaceChildren.apply(nextBtn, ELM.ui.withIcon("arrow-right", n < questions.length - 1 ? "Następne pytanie" : "Od początku"));
        if (auto) say(questions[n]);
      }
      nextBtn.addEventListener("click", function () { n = n < questions.length - 1 ? n + 1 : 0; paint(true); });
      paint(false);
      return el("div", null, [box, el("div", { class: "sp-actions" }, [nextBtn, playBtn])]);
    }

    function paintItem(panel, unit, item, ctx) {
      const P = unit.P;
      if (unit.type === "groups") {
        panel.appendChild(el("div", { class: "sp-part-body" }, [questionStepper(item.questions), mainTimer(ctx, P.seconds, "Czas").node]));
      } else if (unit.type === "b2cards") {
        paintB2Card(panel, P, item, ctx);
      } else if (unit.type === "b2task") {
        paintB2Task(panel, P, item, ctx);
      } else if (unit.type === "roleplay") {
        paintRoleplay(panel, P, item, ctx);
      } else if (unit.type === "picture") {
        paintPicture(panel, P, item, ctx);
      } else if (unit.type === "choice") {
        paintChoice(panel, P, item, ctx);
      } else {
        paintSimple(panel, item, ctx);
      }
    }

    function prepTimer(seconds) { return seconds ? makeTimer({ seconds: seconds, label: "Przygotowanie" }).node : null; }

    function paintRoleplay(panel, P, c, ctx) {
      const lines = c.examinerLines || [];
      let shown = 1;
      const list = el("ol", { class: "sp-lines", "aria-label": "Kwestie egzaminatora", "aria-live": "polite" });
      const more = el("button", { type: "button", class: "btn btn-secondary" }, ELM.ui.withIcon("arrow-right", "Dalej – kolejna kwestia egzaminatora"));
      function paintLines(auto) {
        list.replaceChildren.apply(list, lines.slice(0, shown).map(function (l) {
          return el("li", { class: "sp-line" }, [el("span", { class: "sp-line-who", text: "Egzaminator" }), el("span", { lang: "en", text: l })]);
        }));
        more.hidden = shown >= lines.length;
        if (auto) say(lines[shown - 1]);
      }
      more.addEventListener("click", function () { shown++; paintLines(true); });
      paintLines(false);
      panel.appendChild(el("p", { class: "sp-situation", text: c.situation }));
      panel.appendChild(el("p", { class: "review-label", text: "Musisz poruszyć:" }));
      panel.appendChild(el("ul", { class: "sp-elements" }, c.elements.map(function (e) { return el("li", { text: e }); })));
      panel.appendChild(prepTimer(P.prepSeconds));
      panel.appendChild(list);
      panel.appendChild(el("div", { class: "sp-actions" }, [more, el("button", { type: "button", class: "btn btn-ghost", hidden: !voiceOk(), onclick: function () { speak(lines[Math.max(0, shown - 1)]); } }, ELM.ui.withIcon("play", "Odtwórz kwestię"))]));
      panel.appendChild(mainTimer(ctx, P.seconds, "Rozmowa (orientacyjnie)").node);
      panel.appendChild(phrasesBox(c.usefulPhrases));
    }

    function paintPicture(panel, P, c, ctx) {
      panel.appendChild(el("figure", { class: "sp-picture sp-picture-wide" }, [el("span", { class: "sp-picture-mark", "aria-hidden": "true", text: "Zdjęcie" }), el("figcaption", null, [el("span", { class: "review-label", text: "Wyobraź sobie zdjęcie: " }), el("span", { lang: "en", text: c.description })])]));
      panel.appendChild(el("div", { class: "sp-part-body" }, [questionStepper(c.questions), mainTimer(ctx, P.seconds, "Opis i odpowiedzi (orientacyjnie)").node]));
      panel.appendChild(phrasesBox(c.usefulPhrases));
    }

    function paintChoice(panel, P, c, ctx) {
      panel.appendChild(el("p", { class: "sp-situation", text: c.situation }));
      panel.appendChild(el("ol", { class: "sp-options-num", "aria-label": "Ilustracje do wyboru" }, c.options.map(function (o) { return el("li", { lang: "en", text: o }); })));
      panel.appendChild(el("p", { class: "review-label", text: "W wypowiedzi:" }));
      panel.appendChild(el("ul", { class: "sp-elements" }, c.criteria.map(function (e) { return el("li", { text: e }); })));
      panel.appendChild(prepTimer(P.prepSeconds));
      panel.appendChild(el("div", { class: "sp-part-body" }, [questionStepper(c.questions), mainTimer(ctx, P.seconds, "Wybór i pytania (orientacyjnie)").node]));
    }

    function paintSimple(panel, c, ctx) {
      panel.appendChild(el("p", { class: "sp-situation" }, [el("span", { class: "chip", text: c.topic }), " ", el("strong", { text: c.task })]));
      panel.appendChild(el("div", { class: "sp-part-body" }, [questionStepper(c.questions), mainTimer(ctx, c.seconds || 60, "Czas").node]));
      panel.appendChild(phrasesBox(c.usefulPhrases));
    }

    // ---------- B2: Part 2 (dwie sytuacje) i Part 3 (zadanie z pięcioma opcjami) ----------

    function paintB2Card(panel, P, c, ctx) {
      const partner = el("div", { class: "sp-partner", hidden: true }, [
        el("p", { class: "review-label", text: "Pytanie do partnera (ok. 30 sekund):" }),
        el("p", { class: "sp-q-text", lang: "en", text: PARTNER_QUESTION })
      ]);
      const partnerBtn = el("button", { type: "button", class: "btn btn-secondary", hidden: true, onclick: function () { partner.hidden = false; partnerBtn.hidden = true; partner.focus(); say(PARTNER_QUESTION); } }, "Pokaż pytanie do partnera");
      partner.tabIndex = -1;
      const timer = mainTimer(ctx, P.seconds, "Twoja wypowiedź", { onEnd: function () { partnerBtn.hidden = false; } });
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
      panel.appendChild(el("div", { class: "sp-actions" }, [partnerBtn, el("button", { type: "button", class: "btn btn-ghost", hidden: !voiceOk(), onclick: function () { speak(c.question); } }, ELM.ui.withIcon("play", "Odtwórz pytanie"))]));
      panel.appendChild(partner);
    }

    function paintB2Task(panel, P, t, ctx) {
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
        say(t.decision);
      }
      const discussion = mainTimer(ctx, P.discussionSeconds, "Dyskusja", { onEnd: showDecision });
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
      panel.appendChild(el("div", { class: "sp-actions" }, [toDecision, el("button", { type: "button", class: "btn btn-ghost", hidden: !voiceOk(), onclick: function () { speak(t.central); } }, ELM.ui.withIcon("play", "Odtwórz polecenie"))]));
      panel.appendChild(decision);
    }

    // ---------- „Cały egzamin” ----------

    function fullExam(panel, D, units, onSaved, repaint) {
      const f = ui.full;
      panel.appendChild(el("h2", { class: "section-title sp-part-title", text: "Cały egzamin" }));
      if (!f || f.done) { fullIntro(panel, D, units, onSaved, repaint); return; }
      const step = f.steps[f.i];
      const unit = step.unit;
      panel.appendChild(el("ol", { class: "sp-full-steps", "aria-label": "Postęp egzaminu" }, f.steps.map(function (s, k) {
        return el("li", { "aria-current": k === f.i ? "step" : null, text: (k + 1) + ". " + s.unit.tab });
      })));
      panel.appendChild(el("h3", { class: "c1-check-title", text: unit.P.title }));
      if (unit.lead) panel.appendChild(el("p", { class: "sp-intro", text: unit.lead }));
      panel.appendChild(examinerSwitch());
      const rec = ELM.recorder ? ELM.recorder.create({ exam: cfg.examId, card: step.id }) : null;
      step.rec = rec;
      paintItem(panel, unit, unit.pool[step.index], { rec: rec, repaint: repaint });
      if (rec) panel.appendChild(rec.node);
      const last = f.i === f.steps.length - 1;
      panel.appendChild(el("div", { class: "sp-actions" }, [
        el("button", { type: "button", class: "btn btn-primary", onclick: function () {
          stopAll();
          if (rec && rec.isRecording()) { ELM.ui.toast({ text: "Zatrzymaj nagrywanie, zanim przejdziesz dalej.", icon: "info" }); return; }
          if (last) f.done = true; else f.i++;
          panel.replaceChildren();
          stepRepaint();
        } }, ELM.ui.withIcon(last ? "check" : "arrow-right", last ? "Zakończ egzamin" : "Dalej – " + f.steps[f.i + 1].unit.tab)),
        el("button", { type: "button", class: "btn btn-ghost", onclick: function () { stopAll(); ELM.recorder && ELM.recorder.destroyAll(); ui.full = null; repaint(); } }, "Przerwij egzamin")
      ]));
      function stepRepaint() { panel.replaceChildren(); fullExam(panel, D, units, onSaved, repaint); panel.scrollIntoView({ block: "start" }); }
    }

    function fullIntro(panel, D, units, onSaved, repaint) {
      const f = ui.full;
      if (f && f.done) {
        panel.appendChild(el("p", { class: "sp-intro", text: "Koniec egzaminu. Odsłuchaj nagrania z poszczególnych części (jeśli nagrywałeś) i oceń się." }));
        const recs = el("div", { class: "sp-recordings" });
        f.steps.forEach(function (s) {
          recs.appendChild(el("h3", { class: "c1-check-title", text: s.unit.tab + ": " + labelOf(s.unit, s.index) }));
          if (s.rec && s.rec.count()) recs.appendChild(s.rec.node);
          else recs.appendChild(el("p", { class: "tool-note", text: "Brak nagrania z tej części." }));
        });
        panel.appendChild(recs);
        panel.appendChild(selfAssessment(D, "cały egzamin", 1, true, onSaved));
        panel.appendChild(el("div", { class: "sp-actions" }, [el("button", { type: "button", class: "btn btn-secondary", onclick: function () { ELM.recorder && ELM.recorder.destroyAll(); ui.full = null; repaint(); } }, "Zacznij od nowa")]));
        return;
      }
      const minutes = units.reduce(function (n, u) { return n + (u.P.seconds || 0) + (u.P.discussionSeconds || 0) + (u.P.decisionSeconds || 0) + (u.P.prepSeconds || 0); }, 0);
      panel.appendChild(el("p", { class: "sp-intro", text: "Losujemy po jednej karcie z każdej części i prowadzimy Cię przez nie po kolei, z timerami. Orientacyjnie około " + Math.round(minutes / 60) + " minut. Na końcu odsłuchasz nagrania i ocenisz się." }));
      panel.appendChild(el("ol", { class: "sp-full-steps", "aria-label": "Części egzaminu" }, units.map(function (u) { return el("li", { text: u.tab }); })));
      panel.appendChild(el("button", { type: "button", class: "btn btn-primary", onclick: function () {
        ui.full = { i: 0, done: false, steps: units.map(function (u) { const idx = draw(u, u.pool.map(function (c, k) { return k; })); return { unit: u, index: idx, id: idOf(u, idx), rec: null }; }) };
        repaint();
      } }, ELM.ui.withIcon("play", "Rozpocznij egzamin")));
    }

    // ---------- samoocena i historia ----------

    function selfAssessment(D, label, part, full, onSaved) {
      const criteria = D.criteria || [];
      const box = el("div", { class: "sp-self" });
      const open = el("button", { type: "button", class: "btn btn-primary" }, "Zakończ sesję i oceń się");
      const form = el("form", { class: "sp-self-form", hidden: !full, "aria-labelledby": "sp-self-title" });
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
      form.insertBefore(el("h3", { class: "c1-check-title", id: "sp-self-title", text: "Samoocena – " + label + " (1–5)" }), form.firstChild);
      form.appendChild(el("div", { class: "sp-actions" }, [el("button", { type: "submit", class: "btn btn-primary" }, "Zapisz ocenę"), status]));
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        stopAll();
        const scores = {};
        inputs.forEach(function (x) { scores[x.c.id] = Number(x.input.value); });
        const fields = { exam: cfg.examId, part: part, scores: scores };
        if (full) fields.full = true;
        const saved = pd() && pd().addSpeakingSession(fields);
        status.textContent = saved ? "Zapisano w historii sesji." : "Nie zapisano – wybierz albo utwórz profil.";
        if (saved && onSaved) onSaved();
      });
      open.addEventListener("click", function () {
        stopAll();
        form.hidden = false;
        open.hidden = true;
        if (inputs[0]) inputs[0].input.focus();
      });
      if (!full) box.appendChild(open);
      box.appendChild(form);
      return box;
    }

    function renderHistory(box, D, units) {
      const label = {};
      (D.criteria || []).forEach(function (c) { label[c.id] = c.label; });
      const list = pd() ? pd().speakingSessions(cfg.examId) : [];
      box.replaceChildren(el("h2", { class: "section-title", id: "sp-history-title", text: "Historia sesji" }));
      if (!list.length) {
        box.appendChild(el("p", { class: "tool-note", text: "Brak zapisanych sesji. Po ćwiczeniu kliknij „Zakończ sesję i oceń się”." }));
        return;
      }
      function partName(s) {
        if (s.full) return "Cały egzamin";
        const u = units.find(function (x) { return x.part === s.part; });
        return units.length === 1 ? "Karta" : u ? u.tab : "Część " + s.part;
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
          el("span", { class: "sp-history-head", text: s.day.split("-").reverse().join(".") + " · " + partName(s) }),
          el("span", { class: "sp-history-scores", text: Object.keys(s.scores).map(function (k) { return (label[k] || k) + " " + s.scores[k]; }).join(" · ") })
        ]);
      })));
    }

    return { render: render };
  }

  window.addEventListener("hashchange", stopAll);

  ELM.speakingTrainer = { create: create, makeTimer: makeTimer };
})(window.ELM);
