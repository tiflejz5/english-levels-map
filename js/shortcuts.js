/*
 * shortcuts.js — okienko skrótów klawiszowych („?”) i wspólny odsłuch zdań (paczka v8, S5).
 *
 *   ELM.shortcuts.open()        okienko z listą skrótów dla bieżącego widoku (zadania, powtórki, C1 i egzaminy, strony treści)
 *   ELM.shortcuts.speak(text)   czyta zdanie głosem angielskim (en-GB, potem en-US); drugie wywołanie w trakcie czytania przerywa
 *
 * Skróty nie działają w polach tekstowych (poza Enter, który ma własną obsługę w widokach).
 * Zadania: js/exercise-engine.js, sesja powtórek: js/fiszki.js, strony treści: js/niezbednik.js; tu: „?”,
 * odsłuch wiersza w ćwiczeniach C1 (S, wiersz ostatnio wybrany) i Enter = „Sprawdź” w polach C1.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const CONTEXTS = {
    zadania: {
      title: "Skróty w zadaniach",
      rows: [
        ["1–4 lub A–D", "wybór odpowiedzi (przy opcjach A–H: litera opcji)"],
        ["Enter", "Sprawdź, a po sprawdzeniu Dalej"],
        ["S", "odsłuch zdania (przed sprawdzeniem luka jest pauzą)"],
        ["Tab", "następna luka"],
        ["Backspace", "cofnięcie ostatniego wyrazu (układanie zdania)"],
        ["Ctrl + Enter", "Sprawdź w polu wieloliniowym"],
        ["?", "ta lista"]
      ]
    },
    powtorki: {
      title: "Skróty w sesji powtórek",
      rows: [
        ["Spacja", "pokaż odpowiedź, potem „Dobrze”"],
        ["1–4", "oceny: Znowu, Trudne, Dobrze, Łatwe"],
        ["S", "odsłuch zdania z karty (luka jest pauzą)"],
        ["Z", "cofnij ostatnią ocenę"],
        ["W", "zawieś kartę"],
        ["B", "odłóż kartę do jutra"],
        ["E", "edytuj kartę (własne talie)"],
        ["?", "ta lista"]
      ]
    },
    c1: {
      title: "Skróty w ćwiczeniach",
      rows: [
        ["Enter", "Sprawdź (w polu odpowiedzi)"],
        ["Tab", "następne pole"],
        ["S", "odsłuch ostatnio wybranego zdania (poza polem tekstowym)"],
        ["?", "ta lista"]
      ]
    },
    strona: {
      title: "Skróty na stronie tematu",
      rows: [
        ["[", "poprzedni temat poziomu"],
        ["]", "następny temat poziomu"],
        ["/", "szukaj"],
        ["Ctrl + K", "szukaj"],
        ["?", "ta lista"]
      ]
    },
    ogolne: {
      title: "Skróty",
      rows: [
        ["/", "szukaj"],
        ["Ctrl + K", "szukaj"],
        ["?", "ta lista"]
      ]
    }
  };

  function contextNow() {
    if (document.querySelector(".ex-view .ex-card")) return "zadania";
    if (document.querySelector(".fc-session")) return "powtorki";
    const v = ELM.state && ELM.state.view;
    if (v === "c1" || v === "exam") return "c1";
    if (v === "page") return "strona";
    return "ogolne";
  }

  function typing(t) {
    return !!(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable));
  }

  function dialogOpen() { return !!document.querySelector("dialog[open], .dialog-backdrop:not([hidden])"); }

  function open() {
    const c = CONTEXTS[contextNow()];
    const list = el("dl", { class: "kbd-list" });
    c.rows.forEach(function (r) {
      list.appendChild(el("dt", null, r[0].split(" lub ").map(function (k, i) {
        return [i ? " lub " : null, el("kbd", { text: k })];
      })));
      list.appendChild(el("dd", { text: r[1] }));
    });
    return ELM.dialogs.open({
      title: c.title, className: "dialog-shortcuts",
      body: [list, el("p", { class: "tool-note", text: "Skróty nie działają w polach tekstowych (poza Enter)." })],
      cancelValue: true,
      actions: [{ label: "Zamknij", value: true, variant: "btn-primary", autofocus: true }]
    }).result;
  }

  // ---------- odsłuch ----------

  let current = null;

  function enVoice() {
    const all = window.speechSynthesis.getVoices();
    return all.filter(function (v) { return /^en[-_]GB/i.test(v.lang); })[0]
      || all.filter(function (v) { return /^en[-_]US/i.test(v.lang); })[0]
      || all.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
  }

  /** Czyta zdanie po angielsku; true, gdy ruszyło (false: brak syntezatora albo głosu — wtedy komunikat). Ponowne S zatrzymuje. */
  function speak(text, rate) {
    const s = window.speechSynthesis;
    if (!s || typeof window.SpeechSynthesisUtterance !== "function") {
      if (ELM.ui) ELM.ui.toast({ text: "Ta przeglądarka nie ma syntezatora mowy.", icon: "volume-x" });
      return false;
    }
    if (current) { s.cancel(); current = null; return true; }
    const voice = enVoice();
    const all = s.getVoices();
    if (all.length && !voice) {
      if (ELM.ui) ELM.ui.toast({ text: "Ta przeglądarka nie ma głosu angielskiego.", icon: "volume-x" });
      return false;
    }
    const u = new window.SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : "en-GB";
    u.rate = rate || 0.95;
    u.onend = u.onerror = function () { current = null; };
    current = u;
    s.speak(u);
    return true;
  }

  // ---------- ćwiczenia C1 i egzaminów: pola tekstowe w wierszach ----------

  let lastRow = null;

  function c1View() { return document.querySelector("#view .c1-tr-item, #view .c1-gap-item, #view [class*='c1-'][class*='-item']"); }

  /** Tekst wiersza: bez słowa kluczowego i opinii; pola odpowiedzi jako pauza (albo wpisana wartość). */
  function rowText(node) {
    let out = "";
    (function walk(n) {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      if (/c1-(feedback|answer|explanation|journal|keyword|tr-key)/.test(n.className || "")) return;
      if (n.tagName === "INPUT" || n.tagName === "TEXTAREA") { out += n.value ? " " + n.value + " " : " … "; return; }
      for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
      if (n.tagName === "P" || n.tagName === "LI") out += " ";
    })(node);
    return out.replace(/\s+/g, " ").replace(/\s+([,.;!?])/g, "$1").trim();
  }

  document.addEventListener("focusin", function (e) {
    const li = e.target.closest && e.target.closest("#view li");
    if (li && c1View() && li.querySelector("input[type=text], textarea")) lastRow = li;
  });

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    // Enter w polu odpowiedzi ćwiczenia C1 = „Sprawdź” (zadania z silnika mają własną obsługę)
    if (e.key === "Enter" && typing(t) && t.tagName === "INPUT" && !document.querySelector(".ex-view .ex-card") && c1View() && t.closest("#view li")) {
      const btn = Array.prototype.find.call(document.querySelectorAll("#view button.btn-primary"), function (b) { return b.textContent.trim() === "Sprawdź" && !b.disabled; });
      if (btn) { e.preventDefault(); btn.click(); }
      return;
    }
    if (typing(t) || dialogOpen()) return;
    if (e.key === "?") { e.preventDefault(); open(); return; }
    if ((e.key === "s" || e.key === "S") && c1View() && lastRow && document.contains(lastRow) && !document.querySelector(".ex-view .ex-card")) {
      const text = rowText(lastRow);
      if (text) { e.preventDefault(); speak(text); }
    }
  });

  ELM.shortcuts = { open: open, speak: speak, contextNow: contextNow, CONTEXTS: CONTEXTS };
})(window.ELM);
