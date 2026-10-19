/*
 * ui.js — elementy wizualne wspólne dla całej aplikacji (patrz DESIGN.md):
 *   ELM.icon(name, opts)          ikona Lucide (dane: assets/ikony.js)
 *   ELM.ui.withIcon(name, text)   [ikona, tekst] do przycisków i linków
 *   ELM.logo(opts)                znak logo (kompas ze szlakiem) + napis
 *   ELM.ui.progressRing(…)        pierścień postępu (SVG)
 *   ELM.loadGsap()                GSAP ładowany tylko na żądanie
 *
 * Wszystko budujemy przez createElementNS — bez innerHTML.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, String(attrs[k])); });
    return node;
  }

  // =====================================================================
  // IKONY (Lucide, obrys 1.75 px, kolor z currentColor)
  // =====================================================================

  /**
   * Ikona jako element <svg>. opts:
   *   size  — rozmiar w px (domyślnie 20)
   *   label — tekst dla czytników ekranu (bez niego ikona jest aria-hidden)
   *   class — dodatkowa klasa
   */
  function icon(name, opts) {
    opts = opts || {};
    const nodes = (ELM.ICON_NODES || {})[name];
    const size = opts.size || 20;
    const svg = svgEl("svg", {
      class: "icon icon-" + name + (opts.class ? " " + opts.class : ""),
      width: size, height: size, viewBox: "0 0 24 24",
      fill: "none", stroke: "currentColor", "stroke-width": 1.75,
      "stroke-linecap": "round", "stroke-linejoin": "round",
      focusable: "false"
    });
    if (opts.label) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", opts.label); }
    else svg.setAttribute("aria-hidden", "true");
    if (!nodes) {
      if (window.console) console.warn("Brak ikony „" + name + "” (dopisz ją w tools/zbuduj-zasoby.js)");
      return svg;
    }
    nodes.forEach(function (n) { svg.appendChild(svgEl(n[0], n[1])); });
    return svg;
  }

  /** [ikona, tekst] — np. el("button", …, ELM.ui.withIcon("plus", "Dodaj błąd")). */
  function withIcon(name, text, opts) {
    return [icon(name, Object.assign({ size: 18 }, opts || {})), document.createTextNode(text)];
  }

  // =====================================================================
  // LOGO: kompas w okręgu ze szlakiem w gradiencie marki (krainy A1 → C2)
  // =====================================================================

  let gradientCounter = 0;

  /** Gradient marki w <defs> (kolory z tokenów, więc działa w obu motywach). */
  function brandGradient(defs, id, x1, y1, x2, y2) {
    const g = svgEl("linearGradient", { id: id, x1: x1, y1: y1, x2: x2, y2: y2, gradientUnits: "userSpaceOnUse" });
    ["a1", "a2", "b1", "b2", "c1", "c2"].forEach(function (lvl, i) {
      const stop = svgEl("stop", { offset: (i / 5).toFixed(2) });
      stop.setAttribute("style", "stop-color: var(--lvl-" + lvl + ")");
      g.appendChild(stop);
    });
    defs.appendChild(g);
  }

  /** Sam znak (40 × 40). */
  function logoMark(size) {
    const id = "brand-grad-" + (++gradientCounter);
    const svg = svgEl("svg", { class: "logo-mark", width: size || 34, height: size || 34, viewBox: "0 0 40 40", "aria-hidden": "true", focusable: "false" });
    const defs = svgEl("defs");
    brandGradient(defs, id, 4, 36, 36, 4);
    svg.appendChild(defs);
    // Okrąg (granica mapy) i szlak kropkami od A1 (lewy dół) do C2 (prawa góra)
    svg.appendChild(svgEl("circle", { cx: 20, cy: 20, r: 17, fill: "none", stroke: "url(#" + id + ")", "stroke-width": 2.6 }));
    svg.appendChild(svgEl("path", {
      d: "M9.5 28.5c4-1.5 3.5-6.5 8-7.5s6.5 1.5 9.5-2.5 2.5-6 3.5-7.5",
      fill: "none", stroke: "url(#" + id + ")", "stroke-width": 2.2, "stroke-linecap": "round", "stroke-dasharray": "0.1 4.2"
    }));
    // Igła kompasu (północ w gradiencie, południe w kolorze linii)
    const needle = svgEl("g", { transform: "rotate(40 20 20)" });
    needle.appendChild(svgEl("path", { d: "M20 8.5 23.2 20h-6.4z", fill: "url(#" + id + ")" }));
    needle.appendChild(svgEl("path", { d: "M20 31.5 16.8 20h6.4z", class: "logo-needle-s" }));
    svg.appendChild(needle);
    svg.appendChild(svgEl("circle", { cx: 20, cy: 20, r: 2.1, class: "logo-pin" }));
    return svg;
  }

  /** Znak + napis „English Levels Map” (font display). */
  function logo(opts) {
    opts = opts || {};
    const wrap = document.createElement("span");
    wrap.className = "logo";
    wrap.appendChild(logoMark(opts.size));
    const word = document.createElement("span");
    word.className = "logo-word";
    word.textContent = "English Levels Map";
    wrap.appendChild(word);
    return wrap;
  }

  // =====================================================================
  // PIERŚCIEŃ POSTĘPU
  // =====================================================================

  /**
   * percent: 0–100. opts:
   *   size (px, domyślnie 64), stroke (px, domyślnie 6),
   *   brand: true → gradient marki zamiast koloru poziomu (--lvl),
   *   label — opis dla czytników ekranu, text — tekst w środku (domyślnie „N%”)
   * Wypełnienie animuje się przez stroke-dashoffset (CSS, --dur-slow).
   */
  function progressRing(percent, opts) {
    opts = opts || {};
    const size = opts.size || 64, stroke = opts.stroke || 6;
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    const wrap = document.createElement("span");
    wrap.className = "ring" + (opts.brand ? " is-brand" : "");
    wrap.setAttribute("role", "progressbar");
    wrap.setAttribute("aria-valuemin", "0");
    wrap.setAttribute("aria-valuemax", "100");
    wrap.setAttribute("aria-valuenow", String(p));
    wrap.setAttribute("aria-label", opts.label || "Postęp");
    wrap.style.setProperty("--ring-size", size + "px");
    const svg = svgEl("svg", { width: size, height: size, viewBox: "0 0 " + size + " " + size, "aria-hidden": "true", focusable: "false" });
    let strokeRef = null;
    if (opts.brand) {
      const id = "ring-grad-" + (++gradientCounter);
      const defs = svgEl("defs");
      brandGradient(defs, id, 0, size, size, 0);
      svg.appendChild(defs);
      strokeRef = "url(#" + id + ")";
    }
    svg.appendChild(svgEl("circle", { class: "ring-track", cx: size / 2, cy: size / 2, r: r, fill: "none", "stroke-width": stroke }));
    const arc = svgEl("circle", {
      class: "ring-fill", cx: size / 2, cy: size / 2, r: r, fill: "none", "stroke-width": stroke,
      "stroke-linecap": "round", "stroke-dasharray": c.toFixed(2), "stroke-dashoffset": c.toFixed(2),
      transform: "rotate(-90 " + size / 2 + " " + size / 2 + ")"
    });
    if (strokeRef) arc.style.stroke = strokeRef; // styl inline: ważniejszy niż kolor poziomu z CSS
    svg.appendChild(arc);
    wrap.appendChild(svg);
    const txt = document.createElement("span");
    txt.className = "ring-text num";
    txt.textContent = opts.text !== undefined ? opts.text : p + "%";
    wrap.appendChild(txt);
    // Animacja od zera (przejście CSS; przy prefers-reduced-motion natychmiast)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { arc.setAttribute("stroke-dashoffset", (c * (1 - p / 100)).toFixed(2)); });
    });
    return wrap;
  }

  /** Zmienia wartość istniejącego pierścienia (płynne przejście z poprzedniej wartości). */
  function setRing(ring, percent, text) {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    const arc = ring.querySelector(".ring-fill");
    const c = Number(arc.getAttribute("stroke-dasharray"));
    arc.setAttribute("stroke-dashoffset", (c * (1 - p / 100)).toFixed(2));
    ring.setAttribute("aria-valuenow", String(p));
    if (text !== undefined) ring.querySelector(".ring-text").textContent = text;
  }

  // =====================================================================
  // GSAP NA ŻĄDANIE (assets/vendor/gsap.min.js)
  //   ELM.loadGsap().then(function (gsap) { const mm = gsap.matchMedia(); … });
  //   Zwykły <script> zamiast import(), bo moduły nie działają z file://.
  // =====================================================================

  const loading = {};

  function loadScript(src) {
    if (loading[src]) return loading[src];
    loading[src] = new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { delete loading[src]; reject(new Error("Nie udało się wczytać " + src)); };
      document.head.appendChild(s);
    });
    return loading[src];
  }

  /**
   * GSAP + opcjonalne wtyczki, np. ELM.loadGsap(["DrawSVGPlugin", "MotionPathPlugin"]).
   * Wtyczki są rejestrowane raz. Zwraca Promise<gsap>.
   */
  function loadGsap(plugins) {
    return loadScript("assets/vendor/gsap.min.js").then(function () {
      return Promise.all((plugins || []).map(function (name) {
        return loadScript("assets/vendor/" + name + ".min.js").then(function () {
          if (window[name]) window.gsap.registerPlugin(window[name]);
        });
      }));
    }).then(function () { return window.gsap; });
  }

  /** Czy użytkownik prosi o ograniczenie ruchu (prefers-reduced-motion). */
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /** Uzupełnia statyczny HTML: <span data-icon="menu"> → ikona, [data-logo] → logo. */
  function hydrate(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (node) {
      node.replaceWith(icon(node.getAttribute("data-icon"), { size: Number(node.getAttribute("data-size")) || 18 }));
    });
    (root || document).querySelectorAll("[data-logo]").forEach(function (node) {
      node.removeAttribute("data-logo");
      node.replaceChildren(logo());
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { hydrate(); });
  else hydrate();

  ELM.icon = icon;
  ELM.logo = logo;
  ELM.loadGsap = loadGsap;
  ELM.reducedMotion = reducedMotion;
  ELM.ui = { icon: icon, withIcon: withIcon, logo: logo, logoMark: logoMark, progressRing: progressRing, setRing: setRing };
})(window.ELM);
