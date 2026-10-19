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

  const SVG_NS = "http://www.w3.org/2000/svg";

  /** Ikona SVG (kolor z currentColor, więc pasuje do obu motywów). */
  function icon(kind) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const shapes = {
      // Słońce
      light: [["circle", { cx: 12, cy: 12, r: 4.2, fill: "none", stroke: "currentColor", "stroke-width": 1.8 }],
        ["path", { d: "M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", fill: "none" }]],
      // Księżyc
      dark: [["path", { d: "M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1Z", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linejoin": "round" }]],
      // Pół na pół = jak w systemie
      auto: [["circle", { cx: 12, cy: 12, r: 8.2, fill: "none", stroke: "currentColor", "stroke-width": 1.8 }],
        ["path", { d: "M12 3.8a8.2 8.2 0 0 1 0 16.4Z", fill: "currentColor" }]]
    };
    shapes[kind].forEach(function (shape) {
      const node = document.createElementNS(SVG_NS, shape[0]);
      Object.keys(shape[1]).forEach(function (a) { node.setAttribute(a, String(shape[1][a])); });
      svg.appendChild(node);
    });
    return svg;
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
