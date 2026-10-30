/*
 * pisanie-zwroty.js — bank zwrotów do pisania (paczka v6, spec 17, sekcja 2): #/pisanie/zwroty[/<grupa>].
 *
 * Dane: ELM.ZWROTY z dane/pisanie/zwroty-dane.js (generowany z dane/pisanie/zwroty.json przez tools/zbuduj-zwroty.js,
 * ładowany dopiero po wejściu do banku). Zwroty są pogrupowane według funkcji (opinia, kontrargument, …).
 *
 *   - filtry: poziom (B1 / B2 / C1) z przełącznikiem „do tego poziomu włącznie”, rejestr, gatunek, tylko ulubione,
 *   - wyszukiwanie po angielsku i po polsku, także bez polskich znaków,
 *   - grupy jako sekcje z kotwicami, spis grup z boku (komputer) albo poziomy pasek chipów (telefon),
 *   - zwrot: EN pogrubione, PL pod spodem, poziom i rejestr jako tekst, rozwijany przykład i uwaga,
 *   - akcje: Kopiuj, „Do Moich słów” (karta basic PL → EN w talii „Moje słowa”), gwiazdka (ulubione per profil, elm_phrases_v1).
 *
 *   ELM.pisanieZwroty.render(view, route)   ELM.pisanieZwroty.load() → Promise z { groups }
 *   ELM.pisanieZwroty.forTrainer(genre, examId) → [{ group, phrases }] do panelu w trenerze pisania
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const HASH = "#/pisanie/zwroty";

  const LEVELS = ["B1", "B2", "C1"];
  const REGISTERS = { formal: "Formalny", neutral: "Neutralny", informal: "Nieformalny" };
  const GENRES = { email: "E-mail", letter: "List", blog: "Blog", forum: "Forum", essay: "Rozprawka / essay", article: "Artykuł", review: "Recenzja", report: "Raport", proposal: "Propozycja", story: "Opowiadanie" };
  // Poziom zwrotów w trenerze wg egzaminu (spec 17, 2.4): E8 i MP: B1; MR i B2: B1–B2; C1: wszystkie
  const EXAM_LEVEL = { "egzamin-osmoklasisty": "B1", "matura-podstawowa": "B1", "matura-rozszerzona": "B2", "certyfikat-b2": "B2", "certyfikat-c1": "C1" };

  const state = { level: "all", upTo: true, register: "all", genre: "all", query: "", starred: false };
  let loading = null;

  function pd() { return ELM.profileData; }
  function hasProfile() { return !!(ELM.app && ELM.app.getActiveProfile && ELM.app.getActiveProfile()); }
  function fold(s) { return ELM.searchLogic && ELM.searchLogic.fold ? ELM.searchLogic.fold(String(s)) : String(s).toLowerCase(); }
  function plural(n, a, b, c) { return ELM.pisanie ? ELM.pisanie.plural(n, a, b, c) : c; }

  /** Wczytuje bank (jednorazowo). */
  function load() {
    if (ELM.ZWROTY) return Promise.resolve(ELM.ZWROTY);
    if (loading) return loading;
    const src = "dane/pisanie/zwroty-dane.js";
    loading = ELM.loadScript(ELM.exercises && ELM.exercises.asset ? ELM.exercises.asset(src) : src).then(function () { return ELM.ZWROTY || null; }, function (err) {
      console.warn((err && err.message) + " — uruchom: npm run build");
      loading = null;
      return null;
    });
    return loading;
  }

  /** Fraza do wstawienia / skopiowania: bez końcowego wielokropka (środkowe zostają jako miejsca na resztę zdania). */
  function plain(en) { return String(en).replace(/\s*…\s*$/, "").replace(/\s+/g, " ").trim(); }

  function genresOf(group, phrase) { return phrase.genres || group.genres; }

  /** Zwroty pasujące do gatunku i poziomu egzaminu, pogrupowane (panel w trenerze pisania). */
  function forTrainer(genre, examId) {
    const data = ELM.ZWROTY;
    if (!data) return [];
    const max = LEVELS.indexOf(EXAM_LEVEL[examId] || "C1");
    const out = [];
    data.groups.forEach(function (g) {
      const list = g.phrases.filter(function (p) { return LEVELS.indexOf(p.level) <= max && genresOf(g, p).indexOf(genre) !== -1; });
      if (list.length) out.push({ group: g, phrases: list });
    });
    return out;
  }

  function matches(g, p) {
    if (state.level !== "all") {
      const i = LEVELS.indexOf(p.level), want = LEVELS.indexOf(state.level);
      if (state.upTo ? i > want : i !== want) return false;
    }
    if (state.register !== "all" && p.register !== state.register) return false;
    if (state.genre !== "all" && genresOf(g, p).indexOf(state.genre) === -1) return false;
    if (state.starred && starred().indexOf(p.id) === -1) return false;
    const q = fold(state.query.trim());
    if (q && fold(p.en + " " + p.pl + " " + (p.example || "")).indexOf(q) === -1) return false;
    return true;
  }

  function starred() { return pd() ? pd().starredPhrases() : []; }

  // ---------- akcje ----------

  function say(text) { ELM.ui.toast({ text: text, icon: "check" }); }

  function copyText(text) {
    function fallback() {
      const tmp = el("textarea", { value: text });
      tmp.style.position = "fixed";
      tmp.style.opacity = "0";
      document.body.appendChild(tmp);
      tmp.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      tmp.remove();
      say(ok ? "Skopiowano: " + text : "Nie udało się skopiować – zaznacz tekst i użyj Ctrl+C");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { say("Skopiowano: " + text); }, fallback);
    else fallback();
  }

  // ---------- widok ----------

  function render(view, route) {
    document.title = "Bank zwrotów · Pisanie · English Levels Map";
    view.appendChild(el("p", { class: "c1-back" }, el("a", { href: ELM.pisanie.HASH }, ELM.ui.withIcon("arrow-left", "Pisanie"))));
    view.appendChild(ELM.pisanie.head("Bank zwrotów do pisania", "Zwroty według funkcji: od prostych do formalnych. Wybierz poziom, rejestr i gatunek, skopiuj frazę albo zapisz ją do powtórek."));
    const body = el("div", { class: "zw-root" }, el("p", { class: "tool-note", role: "status", text: "Wczytuję zwroty…" }));
    view.appendChild(body);
    load().then(function (data) {
      if (!view.contains(body)) return;
      body.replaceChildren();
      if (!data) { body.appendChild(el("p", { class: "tool-note", text: "Nie udało się wczytać banku zwrotów. Uruchom: npm run build." })); return; }
      build(body, data, route && route.group);
    });
  }

  function build(root, data, focusGroup) {
    const count = el("p", { class: "journal-count", "aria-live": "polite" });
    const nav = el("nav", { class: "zw-nav", "aria-label": "Grupy zwrotów" });
    const groupsBox = el("div", { class: "zw-groups" });

    // filtry
    const levelSel = select("zw-level", "Poziom", [["all", "Wszystkie"]].concat(LEVELS.map(function (l) { return [l, l]; })), state.level, function (v) { state.level = v; upTo.disabled = v === "all"; paint(); });
    const upTo = el("input", { type: "checkbox", id: "zw-upto", checked: state.upTo, disabled: state.level === "all", onchange: function () { state.upTo = upTo.checked; paint(); } });
    const regSel = select("zw-reg", "Rejestr", [["all", "Wszystkie"]].concat(Object.keys(REGISTERS).map(function (k) { return [k, REGISTERS[k]]; })), state.register, function (v) { state.register = v; paint(); });
    const genSel = select("zw-genre", "Gatunek", [["all", "Wszystkie"]].concat(Object.keys(GENRES).map(function (k) { return [k, GENRES[k]]; })), state.genre, function (v) { state.genre = v; paint(); });
    const search = el("input", { id: "zw-q", class: "field", type: "search", value: state.query, placeholder: "Szukaj po angielsku lub polsku…", autocomplete: "off", oninput: function () { state.query = search.value; paint(); } });
    const star = el("input", { type: "checkbox", id: "zw-star", checked: state.starred, onchange: function () { state.starred = star.checked; paint(); } });
    root.appendChild(el("div", { class: "journal-filters zw-filters", role: "search" }, [
      el("div", { class: "form-field is-grow" }, [el("label", { class: "field-label", for: "zw-q", text: "Szukaj" }), search]),
      el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "zw-level", text: "Poziom" }), levelSel]),
      el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "zw-reg", text: "Rejestr" }), regSel]),
      el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "zw-genre", text: "Gatunek" }), genSel])
    ]));
    root.appendChild(el("div", { class: "zw-checks" }, [
      el("div", { class: "fc-check" }, [upTo, el("label", { for: "zw-upto", text: "do tego poziomu włącznie (też łatwiejsze)" })]),
      el("div", { class: "fc-check" }, [star, el("label", { for: "zw-star", text: "Tylko ulubione" })])
    ]));
    root.appendChild(count);
    root.appendChild(el("div", { class: "zw-layout" }, [nav, groupsBox]));

    function select(id, label, options, value, onchange) {
      const s = el("select", { id: id, class: "field", onchange: function () { onchange(s.value); } },
        options.map(function (o) { return el("option", { value: o[0], selected: o[0] === value, text: o[1] }); }));
      return s;
    }

    function phraseItem(g, p) {
      const isStar = starred().indexOf(p.id) !== -1;
      const label = plain(p.en);
      const starBtn = el("button", { type: "button", class: "btn btn-ghost btn-small zw-star" + (isStar ? " is-on" : ""), "aria-pressed": isStar ? "true" : "false",
        "aria-label": (isStar ? "Usuń z ulubionych: " : "Dodaj do ulubionych: ") + label,
        onclick: function () {
          if (!hasProfile()) { say("Dodaj profil, żeby zapisywać ulubione zwroty."); return; }
          pd().togglePhraseStar(p.id);
          paint(true);
          const again = root.querySelector('[data-pid="' + p.id + '"] .zw-star');
          if (again) again.focus();
        } }, [ELM.icon("star", { size: 16 }), isStar ? " Ulubiony" : " Ulubione"]);
      const details = p.example || p.note ? el("details", { class: "zw-more" }, [
        el("summary", { text: "Przykład i uwaga" }),
        p.example ? el("p", { class: "zw-example", lang: "en" }, [el("span", { class: "review-label", text: "Przykład: " }), p.example]) : null,
        p.note ? el("p", { class: "zw-note", lang: "pl" }, [el("span", { class: "review-label", text: "Uwaga: " }), p.note]) : null
      ]) : null;
      return el("li", { class: "card zw-phrase", "data-pid": p.id }, [
        el("div", { class: "zw-text" }, [
          el("p", { class: "zw-en", lang: "en", text: p.en }),
          el("p", { class: "zw-pl", lang: "pl", text: p.pl }),
          el("p", { class: "zw-chips" }, [
            el("span", { class: "chip", text: "Poziom " + p.level }),
            el("span", { class: "chip", text: REGISTERS[p.register] })
          ]),
          details
        ]),
        el("div", { class: "zw-actions" }, [
          el("button", { type: "button", class: "btn btn-secondary btn-small", "aria-label": "Kopiuj: " + label, onclick: function () { copyText(label); } }, ELM.ui.withIcon("copy", "Kopiuj")),
          ELM.fiszkiWords && ELM.fiszkiWords.addPhrase ? el("button", { type: "button", class: "btn btn-secondary btn-small", "aria-label": "Do Moich słów: " + label,
            onclick: function () { ELM.fiszkiWords.addPhrase({ en: p.en, pl: p.pl, example: p.example, route: HASH, title: "Bank zwrotów" }); } }, ELM.ui.withIcon("layers", "Do Moich słów")) : null,
          starBtn
        ])
      ]);
    }

    function paint(keepScroll) {
      const y = window.scrollY;
      groupsBox.replaceChildren();
      nav.replaceChildren();
      let total = 0, shown = 0;
      const navItems = [];
      data.groups.forEach(function (g) {
        total += g.phrases.length;
        const list = g.phrases.filter(function (p) { return matches(g, p); });
        shown += list.length;
        if (!list.length) return;
        navItems.push(el("li", null, el("a", { href: HASH + "/" + g.id, onclick: function (ev) { ev.preventDefault(); const t = document.getElementById("zw-" + g.id); if (t) { t.scrollIntoView({ block: "start" }); t.focus({ preventScroll: true }); } } }, [g.label, " ", el("span", { class: "num zw-n", text: String(list.length) })])));
        groupsBox.appendChild(el("section", { class: "zw-group", id: "zw-" + g.id, tabindex: "-1", "aria-labelledby": "zw-h-" + g.id }, [
          el("h2", { class: "section-title", id: "zw-h-" + g.id, text: g.label }),
          g.description ? el("p", { class: "tool-note", text: g.description }) : null,
          el("ul", { class: "zw-list" }, list.map(function (p) { return phraseItem(g, p); }))
        ]));
      });
      count.textContent = "Zwroty: " + shown + " z " + total + (state.starred && !hasProfile() ? " (ulubione wymagają profilu)" : "");
      if (!shown) groupsBox.appendChild(el("p", { class: "empty-state-text", text: state.starred ? "Nie masz jeszcze ulubionych zwrotów pasujących do filtrów. Kliknij „Ulubione” przy zwrocie." : "Brak zwrotów pasujących do filtrów." }));
      nav.appendChild(el("ul", { class: "zw-nav-list" }, navItems));
      if (keepScroll) window.scrollTo(0, y);
    }
    paint();
    if (focusGroup) { const t = document.getElementById("zw-" + focusGroup); if (t) setTimeout(function () { t.scrollIntoView({ block: "start" }); }, 0); }
  }

  ELM.pisanieZwroty = { render: render, load: load, forTrainer: forTrainer, plain: plain, LEVELS: LEVELS, REGISTERS: REGISTERS, GENRES: GENRES, EXAM_LEVEL: EXAM_LEVEL };
})(window.ELM);
