/*
 * motion.js — animacje GSAP w jednym miejscu (DESIGN.md, sekcja 4).
 *
 *   ELM.motion.run(plugins, setup)
 *     Ładuje GSAP (i wtyczki) na żądanie, a potem wywołuje setup(gsap, reduce)
 *     wewnątrz gsap.matchMedia(): przy prefers-reduced-motion reduce = true
 *     i animacje ruchu trzeba pominąć. Poprzednia animacja jest sprzątana
 *     (mm.revert()) przy kolejnym run() i przy zmianie strony (cleanup()).
 *     Gdy GSAP nie da się wczytać albo ruch jest ograniczony, setup dostaje
 *     gsap = null — widok ma wtedy od razu stan końcowy.
 *
 *   ELM.motion.countUp(gsap, el, to)  — liczba odliczana od zera (tabular-nums)
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  let current = null;

  function cleanup() {
    if (current && current.mm) current.mm.revert();
    current = null;
  }

  function run(plugins, setup) {
    cleanup();
    const token = {};
    current = token;
    if (ELM.reducedMotion && ELM.reducedMotion()) { setup(null, true); return Promise.resolve(); }
    return ELM.loadGsap(plugins).then(function (gsap) {
      if (current !== token) return; // w międzyczasie zmieniła się strona
      const mm = gsap.matchMedia();
      token.mm = mm;
      mm.add({ reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" }, function (ctx) {
        setup(gsap, !!ctx.conditions.reduce);
      });
    }).catch(function () {
      if (current === token) setup(null, true);
    });
  }

  /** Odlicza liczbę w elemencie od 0 do „to” (tekst końcowy jest już w HTML). */
  function countUp(gsap, el, to, duration) {
    if (!gsap || !el || !to) return null;
    const proxy = { v: 0 };
    return gsap.to(proxy, {
      v: to,
      duration: duration || 0.9,
      ease: "power2.out",
      onUpdate: function () { el.textContent = String(Math.round(proxy.v)); },
      onComplete: function () { el.textContent = String(to); }
    });
  }

  ELM.motion = { run: run, cleanup: cleanup, countUp: countUp };
})(window.ELM);
