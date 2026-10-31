/*
 * toc.js — spis treści podstron (paczka v8, S3).
 *
 *   ELM.toc.wrap(article) → element do wstawienia zamiast artykułu
 *
 * Podstrony z ≥ 4 sekcjami „##”: od 1200 px spis jest przyklejony z prawej strony (między --w-text a --w-wide)
 * ze scrollspy (aria-current="location" na bieżącej sekcji); węższy ekran dostaje <details> „Na tej stronie” nad treścią.
 * Adres w pasku zajmuje router, więc przejścia robi scrollIntoView (z focusem na nagłówku), a nie kotwice #id.
 * W druku spis jest ukryty (css/print.css). Mniej niż 4 sekcje: artykuł bez zmian.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const MIN_SECTIONS = 4;

  let observer = null;

  function reduced() { return !!(ELM.reducedMotion && ELM.reducedMotion()); }

  function go(heading) {
    heading.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    heading.focus({ preventScroll: true });
  }

  function list(headings, onPick) {
    return el("ol", { class: "toc-list" }, headings.map(function (h) {
      return el("li", null, el("a", {
        href: "#" + h.id, "data-toc": h.id,
        onclick: function (e) { e.preventDefault(); go(h); if (onPick) onPick(); }
      }, h.textContent));
    }));
  }

  /** Scrollspy (IntersectionObserver): zaznacza w spisie bieżącą sekcję. */
  function spy(headings, side) {
    if (observer) { observer.disconnect(); observer = null; }
    if (!window.IntersectionObserver) return;
    const links = {};
    side.querySelectorAll("a[data-toc]").forEach(function (a) { links[a.getAttribute("data-toc")] = a; });
    let current = null;
    function mark(id) {
      if (id === current) return;
      current = id;
      Object.keys(links).forEach(function (k) {
        if (k === id) { links[k].setAttribute("aria-current", "location"); links[k].classList.add("is-current"); }
        else { links[k].removeAttribute("aria-current"); links[k].classList.remove("is-current"); }
      });
    }
    // Linia czytania: 25% wysokości okna; bieżąca sekcja = ostatni nagłówek, który ją minął (obserwator budzi się przy przekroczeniu pasa)
    observer = new IntersectionObserver(function () {
      const line = window.innerHeight * 0.25;
      let cur = headings[0];
      headings.forEach(function (h) { if (h.getBoundingClientRect().top <= line) cur = h; });
      mark(cur.id);
    }, { rootMargin: "0px 0px -75% 0px", threshold: [0, 1] });
    headings.forEach(function (h) { observer.observe(h); });
    mark(headings[0].id);
  }

  function wrap(article) {
    if (observer) { observer.disconnect(); observer = null; }
    const headings = Array.prototype.slice.call(article.querySelectorAll("h2"));
    if (headings.length < MIN_SECTIONS) return article;
    headings.forEach(function (h, i) {
      h.id = "toc-" + (i + 1);
      h.setAttribute("tabindex", "-1");
      h.classList.add("toc-target");
    });
    const side = el("nav", { class: "page-toc is-side", "aria-label": "Spis treści" }, [
      el("p", { class: "toc-title", text: "Na tej stronie" }),
      list(headings)
    ]);
    const inline = el("details", { class: "page-toc is-inline" }, [
      el("summary", { text: "Na tej stronie" }),
      list(headings, function () { inline.open = false; })
    ]);
    const body = el("div", { class: "page-body" }, [article, el("aside", { class: "page-aside" }, side)]);
    spy(headings, side);
    return el("div", { class: "page-with-toc" }, [inline, body]);
  }

  ELM.toc = { wrap: wrap, MIN_SECTIONS: MIN_SECTIONS };
})(window.ELM);
