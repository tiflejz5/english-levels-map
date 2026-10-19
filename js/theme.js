/*
 * theme.js — motyw jasny / ciemny.
 *
 * Trzy ustawienia: „auto” (jak w systemie, prefers-color-scheme),
 * „light” i „dark”. Przycisk w prawym górnym rogu przełącza je po kolei.
 * Wybór zapisujemy w localStorage pod kluczem elm_theme_v1 — globalnie dla
 * urządzenia (nie w profilu i nie w eksporcie danych).
 *
 * Atrybut data-theme na <html> ustawia już mały skrypt w <head>
 * (index.html), zanim strona się narysuje — dzięki temu nie ma błysku
 * złego motywu. Ten plik obsługuje przycisk i zmiany „na żywo”.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const KEY = "elm_theme_v1";
  const ORDER = ["auto", "light", "dark"];
  const NAMES = { auto: "Automatycznie (jak w systemie)", light: "Jasny", dark: "Ciemny" };
  const THEME_COLOR = { light: "#faf6ee", dark: "#0e1526" };

  const query = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  let pref = readPref();
  let animTimer = null;

  function readPref() {
    try {
      const v = window.localStorage.getItem(KEY);
      return ORDER.indexOf(v) !== -1 ? v : "auto";
    } catch (e) {
      return "auto";
    }
  }

  function savePref(v) {
    try { window.localStorage.setItem(KEY, v); } catch (e) { /* bez zapisu — działa do zamknięcia karty */ }
  }

  function resolved() {
    return pref === "auto" ? (query.matches ? "dark" : "light") : pref;
  }

  /** Ustawia motyw na <html>, kolor paska przeglądarki i wygląd przycisku. */
  function apply(animate) {
    const root = document.documentElement;
    if (animate) {
      // Krótkie przejście kolorów tylko w chwili zmiany motywu
      root.classList.add("theme-anim");
      clearTimeout(animTimer);
      animTimer = setTimeout(function () { root.classList.remove("theme-anim"); }, 320);
    }
    root.setAttribute("data-theme", resolved());
    root.setAttribute("data-theme-pref", pref);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLOR[resolved()]);
    paintButton();
  }

  // ---------- Przycisk ----------

  // Ikony Lucide (js/ui.js): słońce, księżyc, słońce z księżycem = jak w systemie
  const ICON = { light: "sun", dark: "moon", auto: "sun-moon" };

  function icon(kind) {
    return ELM.icon ? ELM.icon(ICON[kind], { size: 20 }) : document.createTextNode("");
  }

  function nextPref() {
    return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  }

  function paintButton() {
    const btn = document.getElementById("theme-btn");
    if (!btn) return;
    const label = "Motyw: " + NAMES[pref] + ". Kliknij, aby przełączyć na: " + NAMES[nextPref()];
    btn.replaceChildren(icon(pref));
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
    btn.setAttribute("data-pref", pref);
  }

  function init() {
    const btn = document.getElementById("theme-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        pref = nextPref();
        savePref(pref);
        apply(true);
      });
    }
    // W trybie „Automatycznie” reagujemy na zmianę ustawienia systemu na żywo
    const onSystemChange = function () {
      if (pref === "auto" && document.documentElement.getAttribute("data-theme") !== resolved()) apply(true);
    };
    if (query.addEventListener) query.addEventListener("change", onSystemChange);
    else if (query.addListener) query.addListener(onSystemChange);
    // Zapasowo: sprawdzamy też po powrocie do karty (część przeglądarek nie wysyła
    // „change”, gdy karta była w tle)
    window.addEventListener("focus", onSystemChange);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) onSystemChange(); });
    apply(false);
  }

  ELM.theme = { init: init, get: function () { return { pref: pref, resolved: resolved() }; } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window.ELM);
