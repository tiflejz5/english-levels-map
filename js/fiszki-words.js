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
  // PODKREŚLANIE ZAPISANYCH SŁÓW (krok 7) — odświeżane po dodaniu słowa i zmianie ustawienia
  // =====================================================================

  function refreshHighlights() { /* uzupełnia krok 7 */ }

  function prefsChanged() {
    hideMenu();
    refreshHighlights();
  }

  ELM.fiszkiWords = {
    WORDS_ID: WORDS_ID, WORDS_HASH: WORDS_HASH, info: info, addWord: addWord, addMeaning: addMeaning, addExample: addExample,
    cards: cards, wordOf: wordOf, sentenceOf: sentenceOf, findByWord: findByWord, hideMenu: hideMenu, prefsChanged: prefsChanged,
    refreshHighlights: refreshHighlights
  };
})(window.ELM);
