/*
 * sidebar.js — zachowanie lewego panelu (DESIGN.md, sekcja 3.1).
 *
 * Stany:
 *   wąski pasek (72 px)  — domyślnie od 768 px szerokości,
 *   rozwinięty (288 px)  — nad treścią (warstwa poza przepływem, z cieniem),
 *                          po najechaniu myszą (opóźnienie 120 ms / zamykanie
 *                          250 ms), po fokusie z klawiatury albo po dotknięciu
 *                          przycisku rozwijania (tablet),
 *   przypięty            — pełny panel na stałe, treść odsuwa się
 *                          (html[data-sidebar="pinned"]),
 *   szuflada (< 768 px)  — przycisk „Menu” w górnym pasku (js/app.js).
 *
 * Przypięcie zapisujemy globalnie dla urządzenia (nie w profilu ani w eksporcie):
 *   elm_sidebar_v1 = { version: 1, pinned: true|false }
 * Stan odczytuje już skrypt w <head> (index.html), żeby treść nie przeskakiwała.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const KEY = "elm_sidebar_v1";
  const OPEN_DELAY = 120;   // ms — nie reagujemy na przypadkowy przelot myszą
  const CLOSE_DELAY = 250;  // ms — chwila na powrót kursora

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const narrow = window.matchMedia("(max-width: 767px)");

  let pinned = document.documentElement.getAttribute("data-sidebar") === "pinned";
  let expanded = false;
  let hovering = false;
  let focusSuppressed = false; // po Esc / zwinięciu przyciskiem: fokus w panelu nie rozwija go ponownie
  let openTimer = null;
  let closeTimer = null;

  let sidebar, panel, toggleBtn, pinBtn;

  // ---------- Zapis (try/catch: bez dostępu do pamięci działa do zamknięcia karty) ----------

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify({ version: 1, pinned: pinned })); } catch (e) { /* brak zapisu */ }
  }

  // ---------- Stan ----------

  function isOpen() { return pinned || expanded; }

  function setExpanded(value) {
    if (narrow.matches) value = false; // na telefonie panel to szuflada (body.nav-open)
    expanded = !!value;
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    sidebar.classList.toggle("is-expanded", isOpen());
    sidebar.classList.toggle("is-overlay", expanded && !pinned);
    toggleBtn.setAttribute("aria-expanded", isOpen() ? "true" : "false");
    const label = isOpen() ? "Zwiń panel" : "Rozwiń panel";
    toggleBtn.setAttribute("aria-label", label);
    toggleBtn.setAttribute("data-tooltip", label);
    toggleBtn.replaceChildren(ELM.icon(isOpen() ? "panel-left-close" : "panel-left-open", { size: 20 }));
  }

  function paintPin() {
    document.documentElement.setAttribute("data-sidebar", pinned ? "pinned" : "rail");
    pinBtn.setAttribute("aria-pressed", pinned ? "true" : "false");
    pinBtn.querySelector(".sb-icon").replaceChildren(ELM.icon(pinned ? "pin" : "pin-off", { size: 20 }));
    pinBtn.querySelector(".sb-label").textContent = pinned ? "Odepnij panel" : "Przypnij panel";
    pinBtn.setAttribute("aria-label", pinned ? "Odepnij panel" : "Przypnij panel");
    toggleBtn.hidden = pinned; // przypięty panel jest zawsze rozwinięty
  }

  function togglePin() {
    pinned = !pinned;
    save();
    paintPin();
    // Po odpięciu panel zostaje rozwinięty, jeśli kursor jest nad nim (zwinie się po zjechaniu)
    setExpanded(!pinned && hovering && finePointer.matches);
  }

  // ---------- Zdarzenia ----------

  function onEnter() {
    hovering = true;
    if (pinned || narrow.matches || !finePointer.matches) return;
    clearTimeout(closeTimer);
    if (!expanded) openTimer = setTimeout(function () { setExpanded(true); }, OPEN_DELAY);
  }

  function onLeave() {
    hovering = false;
    clearTimeout(openTimer);
    if (pinned || narrow.matches || !finePointer.matches || !expanded) return;
    closeTimer = setTimeout(function () {
      // Fokus z klawiatury w panelu trzyma go rozwiniętym
      const active = document.activeElement;
      if (panel.contains(active) && active.matches(":focus-visible") && !focusSuppressed) return;
      setExpanded(false);
    }, CLOSE_DELAY);
  }

  function onFocusIn(e) {
    if (pinned || narrow.matches || focusSuppressed || expanded) return;
    // Tylko fokus z klawiatury (kliknięcie myszą / tapnięcie nie rozwija przez fokus)
    if (e.target.matches(":focus-visible")) setExpanded(true);
  }

  function onFocusOut(e) {
    if (panel.contains(e.relatedTarget)) return;
    focusSuppressed = false;
    if (!pinned && !hovering && expanded) setExpanded(false);
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && expanded && !pinned && !narrow.matches) {
      e.stopPropagation();
      focusSuppressed = true;
      setExpanded(false);
    }
  }

  /** Dotknięcie / kliknięcie poza rozwiniętym panelem zamyka go (tablet). */
  function onPointerDownOutside(e) {
    if (!expanded || pinned || narrow.matches) return;
    if (!panel.contains(e.target)) setExpanded(false);
  }

  /** Po przejściu na inną stronę: zwiń rozwinięty (nieprzypięty) panel, chyba że kursor jest nad nim. */
  function afterNavigate() {
    if (!sidebar || pinned) return;
    if (expanded && !hovering) setExpanded(false);
  }

  function init() {
    sidebar = document.getElementById("sidebar");
    panel = document.getElementById("sb-panel");
    toggleBtn = document.getElementById("sb-toggle");
    pinBtn = document.getElementById("sb-pin");
    if (!sidebar || !panel) return;

    panel.addEventListener("mouseenter", onEnter);
    panel.addEventListener("mouseleave", onLeave);
    panel.addEventListener("focusin", onFocusIn);
    panel.addEventListener("focusout", onFocusOut);
    panel.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownOutside);
    toggleBtn.addEventListener("click", function () {
      const open = !expanded;
      focusSuppressed = !open; // zwinięte przyciskiem: fokus zostaje na przycisku, panel się nie rozwija
      setExpanded(open);
    });
    pinBtn.addEventListener("click", togglePin);
    const onMedia = function () { setExpanded(false); };
    if (narrow.addEventListener) narrow.addEventListener("change", onMedia); else narrow.addListener(onMedia);

    paintPin();
    setExpanded(false);
  }

  ELM.sidebar = { init: init, afterNavigate: afterNavigate, isPinned: function () { return pinned; } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window.ELM);
