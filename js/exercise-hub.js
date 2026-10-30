/*
 * exercise-hub.js — „Centrum ćwiczeń” (#/cwiczenia, spec 02, część B):
 *   1. Zestawy tematów (z dane/cwiczenia-tematy.json) według poziomu i kategorii, filtr poziomu,
 *   2. Zestawy mieszane: gotowe (dane/mixes.json) i generator,
 *   3. Trening słabych punktów (spec 03, pkt 5): tematy z ≥ 5 próbami i trafnością < 70%.
 *
 * Generator: poziom (zakres), tematy (chipy wg kategorii, skrót „Wszystkie czasy”),
 * typy zadań (bez dyktanda, gdy przeglądarka nie ma głosu angielskiego), liczba (10/15/20), tryb. Losowanie: ELM.exLogic.pickMix (równo po
 * tematach, bez zadań z ostatniej sesji mieszanej, gdy starcza puli; ≤ 2 tego samego
 * typu pod rząd) z wagami z dziennika podejść: trafność < 60% × 2, nigdy niewidziane × 1,5.
 * Sesję uruchamia ELM.exercises.startCustom (adres #/cwiczenia/sesja).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const COUNTS = [10, 15, 20];

  function ex() { return ELM.exercises; }
  function pd() { return ELM.profileData; }

  // Stan strony (w pamięci karty)
  const filter = { level: "" };
  const gen = { from: "A1", to: "C2", topics: null, types: null, count: 10, mode: "learn", message: "" };

  /** Kategorie z niezbednik/index.json ({ czasy: "Czasy", … }). */
  function categories() { return (ELM.NIEZBEDNIK && ELM.NIEZBEDNIK.index.categories) || {}; }

  /** Punkt niezbędnika po id: { id, level, category, title, href }. */
  function topicMeta(id) {
    const N = ELM.NIEZBEDNIK;
    if (!N) return null;
    for (const lvl of N.index.levels) {
      const item = lvl.items.find(function (it) { return it.id === id; });
      if (item) {
        const info = ex().topicInfo(id);
        return { id: id, level: lvl.level, category: item.category, title: info ? info.title : item.label, href: info ? info.href : null };
      }
    }
    return null;
  }

  function levelIn(level, from, to) {
    const i = LEVELS.indexOf(level);
    return i >= LEVELS.indexOf(from) && i <= LEVELS.indexOf(to);
  }

  function chip(label, on, onclick, extra) {
    return el("button", Object.assign({
      type: "button", class: "chip-btn" + (on ? " is-active" : ""), "aria-pressed": on ? "true" : "false", onclick: onclick
    }, extra || {}), [on ? ELM.icon("check", { size: 16 }) : null, label]);
  }

  function rerender(focusSel) {
    const scroll = U.getScroll();
    render();
    U.setScroll(scroll);
    if (focusSel) setTimeout(function () { const n = document.querySelector(focusSel); if (n) n.focus({ preventScroll: true }); }, 0);
  }

  // =====================================================================
  // SEKCJA 1: ZESTAWY TEMATÓW
  // =====================================================================

  function topicSets(index) {
    const cats = categories();
    const byLevel = {};
    Object.keys(index.topics).forEach(function (t) {
      const meta = topicMeta(t);
      const level = meta ? meta.level : "A1";
      const cat = meta ? meta.category : "inne";
      index.topics[t].forEach(function (id) {
        const set = index.sets[id];
        if (!set) return;
        byLevel[level] = byLevel[level] || {};
        (byLevel[level][cat] = byLevel[level][cat] || []).push(set);
      });
    });
    const levels = LEVELS.filter(function (l) { return byLevel[l]; });
    const shown = levels.filter(function (l) { return !filter.level || filter.level === l; });

    return el("section", { class: "hub-section", "aria-labelledby": "hub-topics" }, [
      el("h2", { class: "section-title", id: "hub-topics", text: "Zestawy tematów" }),
      el("p", { class: "tool-note", text: "Każdy zestaw sprawdza jeden temat z niezbędnika. Najlepszy i ostatni wynik zapisują się w Twoim profilu." }),
      levels.length > 1 ? el("div", { class: "chip-filter hub-filter", role: "group", "aria-label": "Poziom" },
        [chip("Wszystkie", !filter.level, function () { filter.level = ""; rerender(".hub-filter .is-active"); })].concat(levels.map(function (l) {
          return chip(l, filter.level === l, function () { filter.level = l; rerender(".hub-filter .is-active"); }, { class: "chip-btn lvl-" + l + (filter.level === l ? " is-active" : "") });
        }))) : null,
      levels.length ? el("div", { class: "hub-levels" }, shown.map(function (l) {
        return el("section", { class: "hub-level lvl-" + l, "aria-labelledby": "hub-l-" + l }, [
          el("h3", { class: "hub-level-title", id: "hub-l-" + l }, [el("span", { class: "chip is-level lvl-" + l, text: l }), levelName(l)]),
          el("div", null, Object.keys(byLevel[l]).map(function (c) {
            return el("div", { class: "hub-cat" }, [
              el("h4", { class: "hub-cat-title", text: cats[c] || c }),
              el("div", { class: "ex-set-grid" }, byLevel[l][c].map(ex().setCard))
            ]);
          }))
        ]);
      })) : el("p", { class: "empty-state-text", text: "W banku nie ma jeszcze zestawów zadań." })
    ]);
  }

  function levelName(id) {
    const level = ELM.state.content.levels.find(function (l) { return l.id === id; });
    const m = level && /^\*\*(.+?)\*\*/.exec(String(level.description || ""));
    return m ? m[1] : "";
  }

  // =====================================================================
  // SEKCJA 2: ZESTAWY MIESZANE + GENERATOR
  // =====================================================================

  function mixCard(m, index) {
    const score = pd().setScore(m.id);
    const types = m.types && m.types.length ? m.types.map(function (t) { return ex().TYPE_SHORT[t]; }).join(", ") : "wszystkie typy zadań";
    const topics = m.topics.map(topicMeta).filter(Boolean);
    const withSets = m.topics.filter(function (t) { return index.topics[t]; }).length;
    return el("article", { class: "card ex-set-card hub-mix" }, [
      el("p", { class: "hub-mix-level" }, [ELM.icon("shuffle", { size: 16 }), el("span", { text: m.level })]),
      el("h3", { class: "ex-set-title", text: m.title }),
      el("p", { class: "ex-set-meta", text: m.description }),
      el("p", { class: "ex-set-meta", text: (m.count || 10) + " zadań · " + types + " · tematy: " + topics.length + (withSets < m.topics.length ? " (z zadaniami: " + withSets + ")" : "") }),
      el("p", { class: "ex-set-score" + (score ? "" : " is-empty") }, score
        ? [el("span", null, ["Najlepszy: ", el("strong", { class: "num", text: score.best.score + "/" + score.best.total })]), el("span", null, ["Ostatni: ", el("span", { class: "num", text: score.last.score + "/" + score.last.total })])]
        : "Jeszcze nie rozwiązany"),
      el("a", { class: "btn btn-primary btn-small", href: ex().BASE + "/mix/" + m.id, "aria-label": "Zacznij: " + m.title }, ELM.ui.withIcon("play", "Zacznij"))
    ]);
  }

  /** Tematy z zestawami w wybranym zakresie poziomów, pogrupowane wg kategorii. */
  function availableTopics(index) {
    return Object.keys(index.topics).map(topicMeta).filter(function (t) { return t && levelIn(t.level, gen.from, gen.to); });
  }

  function availableTypes(index) {
    const types = {};
    Object.keys(index.sets).forEach(function (id) { Object.keys(index.sets[id].types).forEach(function (t) { types[t] = true; }); });
    // Dyktando tylko z głosem angielskim w przeglądarce
    if (ex().noEnglishVoice()) delete types.dictation;
    return ELM.exLogic.TYPES.filter(function (t) { return types[t]; });
  }

  function generator(index) {
    const topics = availableTopics(index);
    const ids = topics.map(function (t) { return t.id; });
    if (gen.topics === null) gen.topics = ids.slice(); // domyślnie wszystkie
    gen.topics = gen.topics.filter(function (t) { return ids.indexOf(t) !== -1; });
    const types = availableTypes(index);
    if (gen.types === null) gen.types = types.slice();
    const cats = categories();
    const byCat = {};
    topics.forEach(function (t) { (byCat[t.category] = byCat[t.category] || []).push(t); });

    const levelSelect = function (key, label) {
      const s = el("select", { class: "field", id: "gen-" + key, onchange: function () {
        gen[key] = s.value;
        if (LEVELS.indexOf(gen.from) > LEVELS.indexOf(gen.to)) { if (key === "from") gen.to = gen.from; else gen.from = gen.to; }
        gen.topics = null; // nowy zakres: zaznacz wszystkie tematy z zakresu
        rerender("#gen-" + key);
      } }, LEVELS.map(function (l) { return el("option", { value: l, text: l }); }));
      s.value = gen[key];
      return el("div", { class: "hub-gen-level" }, [el("label", { class: "field-label", for: "gen-" + key, text: label }), s]);
    };

    const toggle = function (list, value) {
      const i = list.indexOf(value);
      if (i === -1) list.push(value); else list.splice(i, 1);
    };

    const czasy = topics.filter(function (t) { return t.category === "czasy"; }).map(function (t) { return t.id; });

    return el("form", { class: "card hub-gen", "aria-labelledby": "hub-gen-title", onsubmit: function (e) { e.preventDefault(); generate(index); } }, [
      el("h3", { class: "hub-gen-title", id: "hub-gen-title" }, [el("span", { "aria-hidden": "true" }, ELM.icon("shuffle", { size: 20 })), "Wylosuj własny zestaw"]),
      el("fieldset", { class: "hub-gen-row" }, [
        el("legend", { class: "field-label", text: "Poziom" }),
        el("div", { class: "hub-gen-levels" }, [levelSelect("from", "od"), levelSelect("to", "do")])
      ]),
      el("fieldset", { class: "hub-gen-row" }, [
        el("legend", { class: "field-label", text: "Tematy (" + gen.topics.length + " z " + topics.length + ")" }),
        topics.length ? el("div", { class: "hub-gen-shortcuts" }, [
          czasy.length ? el("button", { type: "button", class: "btn btn-link btn-small", onclick: function () { gen.topics = czasy.slice(); rerender(".hub-gen-shortcuts .btn"); } }, "Wszystkie czasy") : null,
          el("button", { type: "button", class: "btn btn-link btn-small", onclick: function () { gen.topics = ids.slice(); rerender(".hub-gen-shortcuts .btn"); } }, "Zaznacz wszystkie"),
          el("button", { type: "button", class: "btn btn-link btn-small", onclick: function () { gen.topics = []; rerender(".hub-gen-shortcuts .btn"); } }, "Wyczyść")
        ]) : el("p", { class: "tool-note", text: "W tym zakresie poziomów nie ma jeszcze zestawów." }),
        el("div", null, Object.keys(byCat).map(function (c) {
          return el("div", { class: "hub-gen-cat" }, [
            el("p", { class: "hub-gen-cat-title", text: cats[c] || c }),
            el("div", { class: "chip-filter", role: "group", "aria-label": cats[c] || c }, byCat[c].map(function (t) {
              const on = gen.topics.indexOf(t.id) !== -1;
              return chip(t.level + " · " + t.title, on, function () { toggle(gen.topics, t.id); rerender("[data-topic='" + t.id + "']"); }, { "data-topic": t.id, class: "chip-btn lvl-" + t.level + (on ? " is-active" : "") });
            }))
          ]);
        }))
      ]),
      el("fieldset", { class: "hub-gen-row" }, [
        el("legend", { class: "field-label", text: "Typy zadań" }),
        el("div", { class: "chip-filter", role: "group" }, types.map(function (t) {
          const on = gen.types.indexOf(t) !== -1;
          return chip(ex().TYPE_SHORT[t], on, function () { toggle(gen.types, t); rerender("[data-type='" + t + "']"); }, { "data-type": t });
        }))
      ]),
      el("div", { class: "hub-gen-two" }, [
        el("fieldset", { class: "hub-gen-row" }, [
          el("legend", { class: "field-label", text: "Liczba zadań" }),
          el("div", { class: "hub-radios" }, COUNTS.map(function (n) {
            return el("label", { class: "hub-radio" + (gen.count === n ? " is-chosen" : "") }, [
              el("input", { type: "radio", name: "gen-count", value: String(n), checked: gen.count === n, onchange: function () { gen.count = n; rerender("input[name=gen-count][value='" + n + "']"); } }),
              el("span", { text: String(n) })
            ]);
          }))
        ]),
        el("fieldset", { class: "hub-gen-row" }, [
          el("legend", { class: "field-label", text: "Tryb" }),
          el("div", { class: "hub-radios" }, [["learn", "Nauka"], ["exam", "Egzamin"]].map(function (m) {
            return el("label", { class: "hub-radio" + (gen.mode === m[0] ? " is-chosen" : "") }, [
              el("input", { type: "radio", name: "gen-mode", value: m[0], checked: gen.mode === m[0], onchange: function () { gen.mode = m[0]; rerender("input[name=gen-mode][value='" + m[0] + "']"); } }),
              el("span", { text: m[1] })
            ]);
          }))
        ])
      ]),
      el("p", { class: "hub-gen-msg", role: "status", "aria-live": "polite", text: gen.message }),
      el("div", { class: "tool-actions" }, el("button", { type: "submit", class: "btn btn-primary" }, ELM.ui.withIcon("shuffle", "Losuj zestaw")))
    ]);
  }

  /** Losuje zestaw według formularza i uruchamia sesję. */
  function generate(index) {
    const msg = document.querySelector(".hub-gen-msg");
    const say = function (text) { gen.message = text; if (msg) msg.textContent = text; };
    if (!gen.topics.length) return say("Wybierz co najmniej jeden temat.");
    if (!gen.types.length) return say("Wybierz co najmniej jeden typ zadań.");
    say("Losuję…");
    const topics = gen.topics.slice(), types = gen.types.slice(), from = gen.from, to = gen.to, count = gen.count, mode = gen.mode;
    function pick() {
      return ex().loadTopicItems(topics).then(function (pool) {
        pool = ex().playablePool(pool).filter(function (it) { return !it.level || levelIn(it.level, from, to); });
        const res = ELM.exLogic.pickMix(pool, { count: count, types: types, exclude: pd().lastMix(), weight: ELM.stats.mixWeight(pd().attempts()) });
        return res;
      });
    }
    // „Wylosuj nowy zestaw” na ekranie wyniku losuje ponownie z tych samych ustawień
    function launch(res, autostart) {
      const short = res.items.length < count;
      ex().startCustom({
        title: "Zestaw mieszany",
        intro: (short ? "W banku jest na razie " + res.available + " pasujących zadań, więc zestaw ma " + res.items.length + " zamiast " + count + ". " : "") +
          "Tematy: " + topics.length + ", poziom " + (from === to ? from : from + "–" + to) + ".",
        items: res.items,
        mode: mode,
        repick: function () { pick().then(function (again) { launch(again, true); }); },
        autostart: !!autostart
      });
    }
    pick().then(function (res) {
      if (!res.items.length) return say("Brak zadań dla tego wyboru. Zmień tematy albo typy zadań.");
      gen.message = "";
      launch(res);
    });
  }

  // =====================================================================
  // SEKCJA 3: TRENING SŁABYCH PUNKTÓW
  // =====================================================================

  function weakCard() {
    const weak = ELM.stats.weakTopics(pd().attempts());
    return el("div", { class: "card hub-soon hub-weak" }, [
      el("span", { class: "hub-soon-icon", "aria-hidden": "true" }, ELM.icon("target", { size: 22 })),
      el("div", null, weak.length ? [
        el("p", { class: "hub-soon-title" }, [el("strong", { text: "Najwięcej trudności sprawiają Ci:" })]),
        el("ul", { class: "hub-weak-list" }, weak.map(function (w) {
          const t = ex().topicInfo(w.key);
          return el("li", null, [t ? el("a", { href: t.href, text: t.title }) : w.key, el("span", { class: "tool-note", text: " – " + Math.round(w.acc * 100) + "% z " + w.n + " prób" })]);
        })),
        el("p", { class: "tool-note", text: "12 zadań z tych tematów; częściej trafiają te, których ostatnio nie udało się rozwiązać." }),
        el("a", { class: "btn btn-primary", href: ex().BASE + "/slabe" }, ELM.ui.withIcon("target", "Zacznij trening"))
      ] : [
        el("p", { class: "hub-soon-title" }, [el("strong", { text: "Na razie nie widzę słabych punktów" })]),
        el("p", { class: "tool-note", text: "Zrób kilka zestawów, a podpowiem, nad czym popracować. Trening pojawi się, gdy temat będzie miał co najmniej 5 prób i trafność poniżej 70%." })
      ])
    ]);
  }

  // =====================================================================
  // RYSOWANIE
  // =====================================================================

  function render(route) {
    const view = document.getElementById("view");
    view.className = "view tool-view hub-view";
    view.dataset.file = ex().BASE;
    view.replaceChildren(ELM.ui.pageHead({ eyebrow: "Nauka · Ćwiczenia", title: "Centrum ćwiczeń", lead: "Zestawy zadań do tematów, gotowe zestawy mieszane i losowanie własnego zestawu. Wybór formy, układanie zdań, szukanie błędów, luki do wpisania, dopasowanie par, transformacje, tłumaczenie i dyktando – w trybie Nauki albo Egzaminu. Wyniki liczą się w punktach." }));
    document.title = "Centrum ćwiczeń · English Levels Map";
    ex().loadIndex().then(function (index) {
      const now = ex().parseRoute(location.hash);
      if (!now || now.kind !== "hub") return; // w międzyczasie zmieniła się strona
      U.appendChildren(view, [
        topicSets(index),
        el("section", { class: "hub-section", id: "mieszane", "aria-labelledby": "hub-mixes" }, [
          el("h2", { class: "section-title", id: "hub-mixes", text: "Zestawy mieszane" }),
          el("p", { class: "tool-note", text: "Zadania z kilku tematów naraz – bez podpowiedzi, który czas albo konstrukcja jest potrzebna." }),
          index.mixes.length ? el("div", { class: "ex-set-grid" }, index.mixes.map(function (m) { return mixCard(m, index); })) : null,
          generator(index)
        ]),
        el("section", { class: "hub-section", "aria-labelledby": "hub-weak" }, [
          el("h2", { class: "section-title", id: "hub-weak", text: "Trening słabych punktów" }),
          weakCard()
        ])
      ]);
      if (route && route.section === "mieszane") {
        const sec = document.getElementById("mieszane");
        if (sec) { sec.scrollIntoView({ block: "start" }); sec.setAttribute("tabindex", "-1"); sec.focus({ preventScroll: true }); }
      }
    });
  }

  ELM.exerciseHub = { render: render };
})(window.ELM);
