/*
 * fiszki-words.js — „Moje słowa” (paczka v6, spec 14): słowo albo wyrażenie zaznaczone w tekście aplikacji
 * trafia jednym kliknięciem do talii fiszek „Moje słowa” razem ze zdaniem, z którego pochodzi.
 *
 *   Menu przy zaznaczeniu   „Do Moich słów” (skrót M) i „Utwórz fiszkę…” (skrót Ctrl/Cmd+Shift+F)
 *   Zasięg zaznaczania      podstrony i podsumowania poziomów, strony egzaminów i Certyfikatu C1 (.md),
 *                           karty Laboratorium czasów, teksty i transkrypty zadań PO sprawdzeniu odpowiedzi,
 *                           elementy z atrybutem data-fc-selectable (wzorce wypracowań, bank zwrotów, ściągi)
 *   Karta                   cloze ze zdaniem kontekstu (ELM.fiszkiLogic.makeWordCard), talia u-moje-slowa
 *
 * Logika bez DOM (zdanie, luka, polskie znaki, deduplikacja, normalizacja pól): js/fiszki-logic.js.
 * Dodanie słowa NIE jest aktywnością dnia (za łatwo nabić serię). Treści użytkownika tylko jako tekst.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const HASH = "#/fiszki";
  const WORDS_HASH = "#/fiszki/moje-slowa";
  const WORDS_ID = "u-moje-slowa";
  const WORDS_TITLE = "Moje słowa";

  function L() { return ELM.fiszkiLogic; }
  function F() { return ELM.fiszki.internal; }
  function st() { return F().st(); }
  function hasProfile() { return !!(ELM.app && ELM.app.getActiveProfile()); }
  function prefs() { return hasProfile() && ELM.profileData ? ELM.profileData.prefs() : { selectionMenu: true, highlightWords: false }; }

  // =====================================================================
  // ZASIĘG ZAZNACZANIA
  // =====================================================================

  const AREAS = "article.md, .md, .lab-view, [data-fc-selectable]";
  const BLOCKS = "p, li, td, th, blockquote, dd";
  const NEVER = "input, textarea, select, [contenteditable], .notes-panel, .fc-session, .fc-sel-menu, .toast-region, dialog, [role='dialog'], .c1-timer";

  function elementOf(node) { return node && (node.nodeType === 1 ? node : node.parentElement); }

  /** Komórka tabeli z kolumny „Polski” / „Po polsku” / „Znaczenie” — tam tekst jest po polsku (spec 14, 3.4). */
  function inPolishColumn(cell) {
    const table = cell.closest && cell.closest("table");
    if (!table || !/^(TD|TH)$/.test(cell.tagName)) return false;
    const idx = Array.prototype.indexOf.call(cell.parentElement.children, cell);
    const head = table.querySelector("thead tr") || table.rows[0];
    const h = head && head.cells[idx];
    return !!h && h !== cell && /^\s*(polski|po polsku|znaczenie)\b/i.test(h.textContent);
  }

  function pageTitle() {
    const t = document.title.replace(/\s*[·|–-]\s*English Levels Map.*$/i, "").trim();
    if (t && !/^English Levels Map/i.test(t)) return t.slice(0, 120);
    const h = document.querySelector("#view h1");
    return h ? h.textContent.trim().slice(0, 120) : "";
  }

  /**
   * Aktualne zaznaczenie w dozwolonym miejscu: { text, word, block, blockText, canWord, source } albo null.
   * word — oczyszczone słowo (1–6 słów, ≤ 60 znaków) albo ""; canWord — „Do Moich słów” dostępne.
   */
  function info() {
    if (!hasProfile() || !prefs().selectionMenu) return null;
    const s = window.getSelection && window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return null;
    const anchor = elementOf(s.anchorNode);
    const focus = elementOf(s.focusNode);
    if (!anchor || !focus || anchor.closest(NEVER) || focus.closest(NEVER)) return null;
    const area = anchor.closest(AREAS);
    if (!area || !area.contains(focus)) return null;
    // Teksty i transkrypty w zadaniach — dopiero po sprawdzeniu odpowiedzi (nie rozpraszamy)
    if (anchor.closest(".ex-passage-text, .ex-transcript, .ex-set-transcript") && !(ELM.exercises && ELM.exercises.textSelectable && ELM.exercises.textSelectable())) return null;
    const text = s.toString().replace(/\s+/g, " ").trim().slice(0, 300);
    if (!text) return null;
    const block = anchor.closest(BLOCKS) || area;
    const word = L().wordFromSelection(text);
    return {
      text: text, word: word, block: block, blockText: block.textContent || "",
      canWord: !!word && !L().isPolish(text) && !inPolishColumn(block),
      source: { route: /^#\/[^\s<>"]*$/.test(location.hash || "") ? location.hash.slice(0, 200) : "", title: pageTitle() }
    };
  }

  // =====================================================================
  // TALIA I DUPLIKATY
  // =====================================================================

  /** Karty talii „Moje słowa”. */
  function cards() { return st().userCards.filter(function (c) { return c.deck === WORDS_ID; }); }

  /** Zapisane słowo karty (pole word, a w starszych kartach — odpowiedź z luki albo przód). */
  function wordOf(c) {
    if (c.word) return c.word;
    if (c.type === "cloze") { const p = L().parseCloze(c.text); return p.ok ? p.answers[0] : ""; }
    return c.front || "";
  }

  /** Zdanie karty (cloze z wypełnioną luką albo tył zwykłej karty). */
  function sentenceOf(c) {
    if (c.type === "cloze") { const p = L().parseCloze(c.text); return p.ok ? p.before + p.answers[0] + p.after : String(c.text || ""); }
    return String(c.back || "");
  }

  function findByWord(word) {
    const key = L().wordKey(word);
    return cards().find(function (c) { return L().wordKey(wordOf(c)) === key; }) || null;
  }

  function sameSentence(a, b) { return L().normalize(a) === L().normalize(b); }

  function say(text, extra) { ELM.ui.toast(Object.assign({ text: text, icon: "layers" }, extra || {})); }

  // =====================================================================
  // DODAWANIE
  // =====================================================================

  function refreshOpenView() { if (ELM.state && ELM.state.view === "fiszki" && ELM.fiszki.render) ELM.fiszki.render(); }

  /** „Dodaj znaczenie”: małe okno z jednym polem, Enter zapisuje (wypełnia hint karty). */
  function addMeaning(id, word) {
    ELM.dialogs.prompt({ title: "Znaczenie słowa „" + word + "”", label: "Znaczenie po polsku", confirmLabel: "Zapisz" }).then(function (value) {
      if (!value) return;
      const c = st().userCards.find(function (x) { return x.id === id; });
      if (!c) return;
      c.hint = value.trim().slice(0, L().MAX_FIELD);
      F().saveState();
      say("Zapisano znaczenie: „" + word + "” – " + c.hint);
      refreshOpenView();
    });
  }

  /** Drugi (trzeci) przykład istniejącej karty: dopisuje zdanie do examples (maks. 3). */
  function addExample(c, sentence) {
    const word = wordOf(c);
    if (!sentence || sameSentence(sentence, sentenceOf(c)) || (c.examples || []).some(function (e) { return sameSentence(e, sentence); })) {
      say("Ten przykład „" + word + "” już jest w Moich słowach.");
      return;
    }
    if ((c.examples || []).length >= L().EXAMPLES_MAX) {
      say("„" + word + "” ma już " + L().EXAMPLES_MAX + " dodatkowe przykłady (maksimum).");
      return;
    }
    const clean = L().sanitizeWordFields({ examples: (c.examples || []).concat(sentence) }).examples;
    c.examples = clean;
    F().saveState();
    say("Dodano kolejny przykład do „" + word + "”.", { actions: [{ label: "Cofnij", onClick: function () {
      c.examples = (c.examples || []).slice(0, -1);
      if (!c.examples.length) delete c.examples;
      F().saveState();
      refreshOpenView();
    } }] });
    refreshOpenView();
  }

  function showWord(word) {
    if (ELM.fiszkiWords && ELM.fiszkiWords.focusWord) ELM.fiszkiWords.focusWord(word);
    location.hash = WORDS_HASH;
  }

  /** „Do Moich słów”: karta z luką jednym kliknięciem; duplikat (to samo słowo) → „Pokaż” / „Dodaj drugi przykład”. */
  function addWord(i) {
    if (!hasProfile()) { say("Dodaj profil, żeby zapisywać słowa."); return null; }
    if (!i || !i.canWord) return null;
    const sentence = L().extractSentence(i.blockText, i.word);
    const dup = findByWord(i.word);
    if (dup) {
      const actions = [{ label: "Pokaż", onClick: function () { showWord(wordOf(dup)); } }];
      if (sentence && !sameSentence(sentence, sentenceOf(dup)) && (dup.examples || []).length < L().EXAMPLES_MAX) {
        actions.push({ label: "Dodaj drugi przykład", onClick: function () { addExample(dup, sentence); } });
      }
      say("Masz już „" + wordOf(dup) + "” w Moich słowach.", { actions: actions });
      return dup;
    }
    const res = L().makeWordCard({ selection: i.word, sentence: sentence, source: i.source, day: ELM.learn.today() });
    if (res.error) { say(res.error); return null; }
    ELM.fiszkiBrowse.ensureDeck(WORDS_ID, WORDS_TITLE, "words");
    const added = ELM.fiszkiBrowse.addCard(WORDS_ID, res.card);
    say("Dodano „" + i.word + "” do Moich słów", { actions: [
      { label: "Dodaj znaczenie", onClick: function () { addMeaning(added.id, i.word); } },
      { label: "Cofnij", onClick: function () { ELM.fiszkiBrowse.removeCard(added.id); refreshOpenView(); } }
    ] });
    refreshOpenView();
    refreshHighlights();
    return added;
  }

  /** „Do Moich słów” z banku zwrotów: zwykła karta PL → EN ({ en, pl, example?, route, title }); duplikat (ta sama fraza) → „Pokaż”. */
  function addPhrase(p) {
    if (!hasProfile()) { say("Dodaj profil, żeby zapisywać słowa."); return null; }
    const phrase = String(p.en || "").replace(/\s*…\s*$/, "").replace(/\s+/g, " ").trim();
    if (!phrase || !p.pl) return null;
    const dup = findByWord(phrase);
    if (dup) {
      say("Masz już „" + phrase + "” w Moich słowach.", { actions: [{ label: "Pokaż", onClick: function () { showWord(wordOf(dup)); } }] });
      return dup;
    }
    const res = L().makeCard({ type: "basic", front: p.pl, back: phrase, hint: "", example: p.example || "" });
    if (res.error) { say(res.error); return null; }
    Object.assign(res.card, L().sanitizeWordFields({ word: phrase, source: { route: p.route, title: p.title }, addedAt: ELM.learn.today() }));
    ELM.fiszkiBrowse.ensureDeck(WORDS_ID, WORDS_TITLE, "words");
    const added = ELM.fiszkiBrowse.addCard(WORDS_ID, res.card);
    say("Dodano „" + phrase + "” do Moich słów", { actions: [
      { label: "Cofnij", onClick: function () { ELM.fiszkiBrowse.removeCard(added.id); refreshOpenView(); } }
    ] });
    refreshOpenView();
    refreshHighlights();
    return added;
  }

  // =====================================================================
  // MENU PRZY ZAZNACZENIU
  // =====================================================================

  let menu = null, timer = null;

  function hideMenu() { if (menu) menu.hidden = true; }

  function ensureMenu() {
    if (menu) return menu;
    menu = el("div", { class: "fc-sel-menu", role: "toolbar", "aria-label": "Zaznaczony tekst", hidden: true,
      onmousedown: function (e) { e.preventDefault(); } }); // nie gubi zaznaczenia
    document.body.appendChild(menu);
    return menu;
  }

  function openForm() {
    const i = info();
    if (i) ELM.fiszki.openFromSelection(i.text);
  }

  function updateMenu() {
    const i = info();
    if (!i) { hideMenu(); return; }
    ensureMenu();
    menu.replaceChildren.apply(menu, [
      i.canWord ? el("button", { type: "button", class: "btn btn-primary btn-small", title: "Skrót: M",
        onclick: function () { const cur = info(); if (cur) addWord(cur); } }, ELM.ui.withIcon("layers", "Do Moich słów")) : null,
      el("button", { type: "button", class: "btn btn-secondary btn-small", title: "Skrót: Ctrl+Shift+F", onclick: openForm }, "Utwórz fiszkę…")
    ].filter(Boolean));
    menu.hidden = false;
    // Nad zaznaczeniem, a na telefonie (systemowe menu stoi nad zaznaczeniem) i przy braku miejsca — pod nim
    const r = window.getSelection().getRangeAt(0).getBoundingClientRect();
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const below = coarse || r.top <= 60;
    menu.style.top = Math.max(8, Math.min(window.innerHeight - menu.offsetHeight - 8, below ? r.bottom + 12 : r.top - menu.offsetHeight - 8)) + "px";
    menu.style.left = Math.max(8, Math.min(window.innerWidth - menu.offsetWidth - 8, r.left)) + "px";
  }

  document.addEventListener("selectionchange", function () { clearTimeout(timer); timer = setTimeout(updateMenu, 150); });
  window.addEventListener("hashchange", hideMenu);
  window.addEventListener("scroll", function () { if (menu && !menu.hidden) updateMenu(); }, { passive: true });
  window.addEventListener("resize", function () { if (menu && !menu.hidden) updateMenu(); });

  function typing(t) { return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }

  document.addEventListener("keydown", function (e) {
    // Ctrl/Cmd+Shift+F: dotychczasowy formularz fiszki z zaznaczenia (bez zmian)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "F" || e.key === "f")) {
      const i = info();
      if (i) { e.preventDefault(); ELM.fiszki.openFromSelection(i.text); }
      return;
    }
    // M (bez modyfikatorów): „Do Moich słów”, tylko przy zaznaczeniu i poza polem tekstowym
    if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !typing(e.target)) {
      const i = info();
      if (i && i.canWord) { e.preventDefault(); addWord(i); }
    }
  });

  // =====================================================================
  // WIDOK #/fiszki/moje-slowa (spec 14, sekcja 5)
  // =====================================================================

  const view = { query: "", sort: "newest", noMeaning: false };
  let focusedWord = null;

  /** Status jako tekst (nie sam kolor): Nowa / W nauce / Opanowana / Zawieszona. */
  function statusOf(x) {
    if (x && x.suspended) return { id: "suspended", label: "Zawieszone", icon: "pause" };
    if (!x || x.state === "new") return { id: "new", label: "Nowe", icon: "sparkles" };
    if (x.state === "review" && x.interval >= 21) return { id: "mastered", label: "Opanowane", icon: "check" };
    return { id: "learning", label: "W nauce", icon: "rotate-ccw" };
  }

  function focusWord(word) { focusedWord = word; view.query = word || ""; }

  function fmtDay(c) {
    const s = String(c.addedAt || c.createdAt || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : "";
  }

  /** Zdanie ze słowem wyróżnionym znacznikiem <mark> (węzły tekstowe, bez innerHTML). */
  function sentenceNode(c) {
    const s = sentenceOf(c), w = wordOf(c), i = w ? s.toLowerCase().indexOf(w.toLowerCase()) : -1;
    if (i === -1) return el("span", { text: s });
    return el("span", null, [s.slice(0, i), el("mark", { class: "fw-mark", text: s.slice(i, i + w.length) }), s.slice(i + w.length)]);
  }

  function toggleSuspend(id) {
    const cur = st().cards[id];
    if (cur && cur.suspended) {
      delete cur.suspended;
      if (cur.state === "new" && !cur.reps) delete st().cards[id];
    } else {
      st().cards[id] = Object.assign(ELM.fiszkiHarmonogram.newCard(), cur || {}, { suspended: true });
    }
    F().saveState();
  }

  function removeWord(c, after) {
    ELM.dialogs.confirm({ title: "Usunąć słowo?", message: "„" + wordOf(c) + "” zostanie usunięte z Moich słów razem z historią powtórek.", confirmLabel: "Usuń słowo" }).then(function (ok) {
      if (!ok) return;
      ELM.fiszkiBrowse.removeCard(c.id);
      refreshHighlights();
      if (after) after();
    });
  }

  function weakness(c) { const x = st().cards[c.id] || {}; return (x.lapses || 0) * 1000 - (x.interval || 0); }

  function renderView(root) {
    const all = cards();
    root.appendChild(el("p", { class: "c1-back" }, el("a", { href: "#/fiszki" }, ELM.ui.withIcon("chevron-left", "Fiszki"))));
    root.appendChild(F().head("Moje słowa", "Słowa i wyrażenia zaznaczone w tekstach – każde ze zdaniem, z którego pochodzi."));
    if (!all.length) {
      root.appendChild(el("section", { class: "empty-state fw-empty" }, [
        el("p", { class: "empty-state-text", text: "Nie zapisałeś jeszcze żadnego słowa." }),
        el("p", { class: "empty-state-hint", text: "Zaznacz słowo albo wyrażenie w dowolnym tekście (strona niezbędnika, podsumowanie, egzamin, Laboratorium), a potem wybierz „Do Moich słów” albo naciśnij klawisz M. Karta z luką trafi tutaj i do codziennych powtórek." })
      ]));
      return;
    }
    root.appendChild(F().bar(L().deckStats(all, st().cards, Date.now())));

    const actions = [
      el("a", { class: "btn btn-primary", href: "#/fiszki/sesja" }, ELM.ui.withIcon("play", "Ucz się teraz")),
      el("button", { type: "button", class: "btn btn-secondary", onclick: function () {
        F().downloadText("moje-slowa.csv", "﻿" + L().exportWordsCsv(cards()), "text/csv;charset=utf-8");
      } }, ELM.ui.withIcon("download", "Eksportuj CSV"))
    ];
    root.appendChild(el("div", { class: "fc-actions" }, actions));

    const search = el("input", { id: "fw-search", class: "field", type: "search", value: view.query, placeholder: "Szukaj słowa, znaczenia lub zdania…", autocomplete: "off", oninput: function () { view.query = search.value; paint(); } });
    const sort = el("select", { id: "fw-sort", class: "field", onchange: function () { view.sort = sort.value; paint(); } },
      [["newest", "Od najnowszych"], ["az", "A–Z"], ["weakest", "Najsłabiej znane"]].map(function (x) { return el("option", { value: x[0], selected: view.sort === x[0], text: x[1] }); }));
    const nm = el("input", { type: "checkbox", id: "fw-nomeaning", checked: view.noMeaning, onchange: function () { view.noMeaning = nm.checked; paint(); } });
    root.appendChild(el("div", { class: "journal-filters fc-filters", role: "search" }, [
      el("div", { class: "form-field is-grow" }, [el("label", { class: "field-label", for: "fw-search", text: "Szukaj" }), search]),
      el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "fw-sort", text: "Kolejność" }), sort])
    ]));
    root.appendChild(el("div", { class: "fc-check" }, [nm, el("label", { for: "fw-nomeaning", text: "Pokaż tylko słowa bez znaczenia" })]));
    const count = el("p", { class: "journal-count", "aria-live": "polite" });
    const list = el("ul", { class: "fc-card-list fw-list" });
    root.appendChild(count);
    root.appendChild(list);

    function paint() {
      const fold = ELM.searchLogic ? ELM.searchLogic.fold : function (x) { return String(x).toLowerCase(); };
      const q = fold(view.query.trim());
      const shown = cards().filter(function (c) {
        if (view.noMeaning && c.hint) return false;
        return !q || fold(wordOf(c) + " " + (c.hint || "") + " " + sentenceOf(c)).indexOf(q) !== -1;
      });
      const day = function (c) { return String(c.addedAt || c.createdAt || ""); };
      shown.sort(function (a, b) {
        if (view.sort === "az") return wordOf(a).localeCompare(wordOf(b), "en", { sensitivity: "base" });
        if (view.sort === "weakest") return weakness(b) - weakness(a) || day(b).localeCompare(day(a));
        return day(b).localeCompare(day(a));
      });
      count.textContent = "Słowa: " + shown.length + " z " + all.length;
      list.replaceChildren();
      if (!shown.length) { list.appendChild(el("li", { class: "empty-state-text", text: "Brak słów pasujących do filtrów." })); return; }
      shown.forEach(function (c) { list.appendChild(row(c)); });
      if (focusedWord) {
        const first = list.querySelector(".fw-row"); focusedWord = null;
        if (first) { first.setAttribute("tabindex", "-1"); first.focus({ preventScroll: false }); }
      }
    }

    function row(c) {
      const x = st().cards[c.id], sts = statusOf(x), w = wordOf(c);
      const meaning = el("input", { class: "field fw-meaning", type: "text", maxlength: "120", value: c.hint || "", placeholder: "Dodaj znaczenie po polsku", "aria-label": "Znaczenie słowa " + w, autocomplete: "off",
        onchange: function () {
          const card = st().userCards.find(function (k) { return k.id === c.id; });
          if (!card) return;
          const v = meaning.value.trim().slice(0, 120);
          if (v) card.hint = v; else delete card.hint;
          F().saveState();
        } });
      const src = c.source && c.source.route ? el("a", { class: "fw-source", href: c.source.route }, ELM.ui.withIcon("external-link", c.source.title || "Źródło")) : null;
      return el("li", { class: "card fc-row fw-row" }, [
        el("div", { class: "fc-row-main" }, [
          el("p", { class: "fc-row-front fw-word", text: w }),
          meaning,
          el("p", { class: "fc-row-back fw-sentence" }, sentenceNode(c)),
          (c.examples || []).length ? el("ul", { class: "fc-example-list" }, c.examples.map(function (s) { return el("li", { text: s }); })) : null,
          el("p", { class: "tool-note" }, [src, src ? " · " : null, fmtDay(c) ? "dodano " + fmtDay(c) : null])
        ]),
        el("div", { class: "fc-row-meta" }, [
          el("span", { class: "fc-status is-" + sts.id }, [ELM.icon(sts.icon, { size: 14 }), " " + sts.label]),
          el("span", { class: "tool-note", text: x && x.state !== "new" ? "Termin: " + F().fmtWhen(Math.max(x.due, x.buriedUntil || 0)) : "Termin: —" })
        ]),
        el("div", { class: "fc-row-actions" }, [
          el("button", { type: "button", class: "btn btn-link btn-small", "aria-label": (x && x.suspended ? "Przywróć słowo: " : "Zawieś słowo: ") + w,
            onclick: function () { toggleSuspend(c.id); paint(); } }, x && x.suspended ? "Przywróć" : "Zawieś"),
          el("button", { type: "button", class: "btn btn-danger btn-small", "aria-label": "Usuń słowo: " + w, onclick: function () { removeWord(c, function () { ELM.fiszki.render(); }); } }, "Usuń")
        ])
      ]);
    }
    paint();
  }

  /** Liczby do kafelka na stronie Fiszki i do Statystyk. */
  function counts() {
    const all = cards();
    let mastered = 0;
    all.forEach(function (c) { if (statusOf(st().cards[c.id]).id === "mastered") mastered++; });
    return { total: all.length, mastered: mastered };
  }

  // =====================================================================
  // PODKREŚLANIE ZAPISANYCH SŁÓW (krok 7) — odświeżane po dodaniu słowa i zmianie ustawienia
  // =====================================================================

  const HL_MAX = 300;
  const HL_SKIP = "a, code, pre, kbd, h1, h2, h3, h4, h5, h6, mark, button, script, style, .fw-saved, .ex-passage-text, .ex-transcript, .ex-set-transcript, " + NEVER;
  let hlObserver = null, hlTimer = 0, hlTip = null, hlNoted = false;

  function clearHighlights() {
    document.querySelectorAll("span.fw-saved").forEach(function (s) {
      const parent = s.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(s.textContent), s);
      parent.normalize();
    });
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function tip() {
    if (!hlTip) {
      hlTip = el("div", { class: "fw-tip", role: "tooltip", id: "fw-tip", hidden: true });
      document.body.appendChild(hlTip);
    }
    return hlTip;
  }

  function showTip(target) {
    const t = tip();
    t.textContent = target.dataset.meaning ? target.dataset.meaning : "Zapisane w Moich słowach (bez znaczenia)";
    t.hidden = false;
    const r = target.getBoundingClientRect(), tr = t.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - tr.width - 8, r.left + r.width / 2 - tr.width / 2));
    const top = r.top - tr.height - 6 >= 8 ? r.top - tr.height - 6 : r.bottom + 6;
    t.style.left = left + "px";
    t.style.top = top + "px";
    target.setAttribute("aria-describedby", "fw-tip");
  }

  function hideTip(target) { if (hlTip) hlTip.hidden = true; if (target) target.removeAttribute("aria-describedby"); }

  function onTipEvent(e) {
    const s = e.target.closest && e.target.closest("span.fw-saved");
    if (!s) return;
    if (e.type === "mouseover" || e.type === "focusin") showTip(s); else hideTip(s);
  }

  /** Podkreśla zapisane słowa w tekstach (bez nagłówków, linków, kodu i tekstów zadań); ≤ 300 słów. */
  function applyHighlights() {
    if (hlObserver) hlObserver.disconnect();
    clearHighlights();
    try {
      if (!hasProfile() || !prefs().highlightWords) return;
      const all = cards().slice().sort(function (a, b) { return String(b.addedAt || b.createdAt || "").localeCompare(String(a.addedAt || a.createdAt || "")); });
      if (!all.length) return;
      const used = all.slice(0, HL_MAX);
      if (all.length > HL_MAX && !hlNoted) { hlNoted = true; say("Podkreślam " + HL_MAX + " najnowszych słów z " + all.length + "."); }
      const byKey = new Map();
      used.forEach(function (c) { const w = wordOf(c); if (w) byKey.set(L().wordKey(w), c); });
      const words = used.map(wordOf).filter(Boolean).sort(function (a, b) { return b.length - a.length; });
      if (!words.length) return;
      const re = new RegExp("(?<![\\p{L}\\p{N}_])(" + words.map(escapeRe).join("|") + ")(?![\\p{L}\\p{N}_])", "giu");
      document.querySelectorAll(AREAS).forEach(function (root) {
        if (root.closest(HL_SKIP)) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: function (n) {
            const p = n.parentElement;
            return p && !p.closest(HL_SKIP) && n.nodeValue.length > 2 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        });
        const nodes = [];
        let n;
        while ((n = walker.nextNode())) nodes.push(n);
        nodes.forEach(function (node) {
          const text = node.nodeValue;
          re.lastIndex = 0;
          let m, last = 0, frag = null;
          while ((m = re.exec(text))) {
            frag = frag || document.createDocumentFragment();
            if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            const card = byKey.get(L().wordKey(m[1]));
            frag.appendChild(el("span", { class: "fw-saved", tabindex: "0", "data-meaning": (card && card.hint) || "", text: m[1] }));
            last = m.index + m[1].length;
          }
          if (frag) {
            if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
            node.parentNode.replaceChild(frag, node);
          }
        });
      });
    } finally {
      if (hlObserver && prefs().highlightWords) hlObserver.observe(document.getElementById("view") || document.body, { childList: true, subtree: true });
    }
  }

  function refreshHighlights() {
    clearTimeout(hlTimer);
    hlTimer = setTimeout(applyHighlights, 150);
  }

  (function initHighlights() {
    hlObserver = new MutationObserver(function (list) {
      // własne zmiany (span.fw-saved) są odpinane przez disconnect; reagujemy na nową treść widoku
      if (list.some(function (m) { return m.addedNodes.length; })) refreshHighlights();
    });
    document.addEventListener("mouseover", onTipEvent);
    document.addEventListener("mouseout", onTipEvent);
    document.addEventListener("focusin", onTipEvent);
    document.addEventListener("focusout", onTipEvent);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && hlTip) hlTip.hidden = true; });
    window.addEventListener("hashchange", refreshHighlights);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refreshHighlights); else refreshHighlights();
  })();

  function prefsChanged() {
    hideMenu();
    refreshHighlights();
  }

  ELM.fiszkiWords = {
    WORDS_ID: WORDS_ID, WORDS_HASH: WORDS_HASH, info: info, addWord: addWord, addPhrase: addPhrase, addMeaning: addMeaning, addExample: addExample,
    cards: cards, wordOf: wordOf, sentenceOf: sentenceOf, findByWord: findByWord, hideMenu: hideMenu, prefsChanged: prefsChanged,
    refreshHighlights: refreshHighlights, renderView: renderView, focusWord: focusWord, counts: counts
  };
})(window.ELM);
