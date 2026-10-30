/*
 * print.js — przygotowanie strony do druku (paczka v6, spec 16, sekcja 1.3).
 *
 * Na czas druku wymusza jasny motyw i neutralny zakres kolorów (papier i atrament), a po wydruku przywraca
 * poprzednie ustawienia. Reszta (ukrywanie interfejsu, układ A4, odpowiedzi na końcu) jest w css/print.css.
 *
 *   ELM.print.now()   window.print() po wymuszeniu jasnego motywu (też dla przycisków „Drukuj”)
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  let saved = null;

  function before() {
    if (saved) return;
    const root = document.documentElement;
    saved = { theme: root.getAttribute("data-theme"), section: root.getAttribute("data-section") };
    root.setAttribute("data-theme", "light");
    root.setAttribute("data-section", "app");
  }

  function after() {
    if (!saved) return;
    const root = document.documentElement;
    if (saved.theme === null) root.removeAttribute("data-theme"); else root.setAttribute("data-theme", saved.theme);
    if (saved.section === null) root.removeAttribute("data-section"); else root.setAttribute("data-section", saved.section);
    saved = null;
  }

  window.addEventListener("beforeprint", before);
  window.addEventListener("afterprint", after);

  ELM.print = {
    before: before,
    after: after,
    now: function () { window.print(); }
  };
})(window.ELM);
