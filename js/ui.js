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
    const nodes = ((opts.set === "land" ? ELM.LAND_NODES : ELM.ICON_NODES) || {})[name];
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

  /** Krainy poziomów (paczka v7, C1): nazwa i klucz symbolu w assets/krainy.js. */
  const LANDS = {
    A1: { name: "Polana", key: "kraina-a1" }, A2: { name: "Las", key: "kraina-a2" }, B1: { name: "Wzgórza", key: "kraina-b1" },
    B2: { name: "Jezioro", key: "kraina-b2" }, C1: { name: "Góry", key: "kraina-c1" }, C2: { name: "Szczyt", key: "kraina-c2" }
  };

  /** Symbol krainy dla poziomu ("A1"…"C2"), kreska currentColor — kolor ustawia rodzic (np. --lvl). */
  function landIcon(levelId, opts) {
    const land = LANDS[levelId];
    return icon(land ? land.key : "", Object.assign({ set: "land", size: 22 }, opts || {}));
  }

  /** "A1 · Polana" (sam kod, gdy poziom nie ma krainy). */
  function landLabel(levelId) {
    return LANDS[levelId] ? levelId + " · " + LANDS[levelId].name : levelId;
  }

  /**
   * Pieczątka w kolorze krainy (--lvl z klasy lvl-X rodzica albo własnej): okrągła, z ptaszkiem.
   * opts: size (px, domyślnie 20), fresh — animacja „odbicia” (C3; bez ruchu przy reduced motion, CSS).
   */
  function stamp(levelId, opts) {
    opts = opts || {};
    const size = opts.size || 20;
    const s = document.createElement("span");
    s.className = "stamp lvl-" + levelId + (opts.fresh ? " is-fresh" : "");
    s.setAttribute("aria-hidden", "true");
    s.style.width = size + "px";
    s.style.height = size + "px";
    s.appendChild(icon("check", { size: Math.round(size * 0.62), "stroke-width": 3 }));
    return s;
  }

  /**
   * Stan pusty z ilustracją (paczka v7, C6): ELM.ui.emptyState({ art, title, hint, action, level, tag }).
   *   art    — klucz z ELM.EMPTY_ART (assets/stany-puste.js), 96×96, kreska currentColor
   *   action — element (przycisk, link) albo null; level — poziom koloru akcentu (domyślnie bieżący poziom profilu)
   *   tag    — "li", gdy stan pusty jest elementem listy (domyślnie div)
   */
  function emptyState(o) {
    const level = o.level || (ELM.state && ELM.state.ui && ELM.state.ui.levelId) || "A1";
    const box = document.createElement(o.tag || "div");
    box.className = "empty-state has-art lvl-" + level + (o.class ? " " + o.class : "");
    const nodes = (ELM.EMPTY_ART || {})[o.art];
    if (nodes) {
      const svg = svgEl("svg", { class: "es-art", viewBox: "0 0 96 96", fill: "none", stroke: "currentColor", "stroke-width": 1.5, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" });
      nodes.forEach(function (n) { svg.appendChild(svgEl(n[0], n[1])); });
      box.appendChild(svg);
    }
    const title = document.createElement("p");
    title.className = "empty-state-text";
    title.textContent = o.title;
    box.appendChild(title);
    if (o.hint) {
      const hint = document.createElement("p");
      hint.className = "empty-state-hint";
      hint.textContent = o.hint;
      box.appendChild(hint);
    }
    if (o.action) box.appendChild(o.action);
    return box;
  }

  /** [ikona, tekst] — np. el("button", …, ELM.ui.withIcon("plus", "Dodaj błąd")). */
  function withIcon(name, text, opts) {
    return [icon(name, Object.assign({ size: 18 }, opts || {})), document.createTextNode(text)];
  }

  /** Nagłówek strony narzędzia: etykieta (NAUKA · ĆWICZENIA), h1 i opcjonalny lead. */
  function pageHead(o) {
    const h = document.createElement("header");
    h.className = "tool-head" + (o.className ? " " + o.className : "");
    if (o.eyebrow) {
      const p = document.createElement("p");
      p.className = "eyebrow";
      p.textContent = o.eyebrow;
      h.appendChild(p);
    }
    const t = document.createElement("h1");
    t.className = "tool-title";
    t.textContent = o.title;
    h.appendChild(t);
    if (o.lead) {
      const l = document.createElement("p");
      l.className = "tool-lead";
      l.textContent = o.lead;
      h.appendChild(l);
    }
    return h;
  }

  // =====================================================================
  // OKRUSZKI (paczka v8, S1): jeden komponent nad h1 na wszystkich stronach treści
  // =====================================================================

  /**
   * ELM.ui.breadcrumbs([{ label, href?, onclick? }, …]) → <nav class="breadcrumbs">: „Poziom A1 › Czasy › Present Simple”.
   * Ostatni element bez href to bieżąca strona (aria-current="page"). Poniżej 640 px (CSS) widać tylko „‹ rodzic”
   * (przedostatni element; przy jednym elemencie — on sam). onclick (np. powrót do listy z przewinięciem) dostaje zdarzenie
   * po preventDefault; href zostaje dla kliknięcia środkowym przyciskiem i dla czytników ekranu.
   */
  function breadcrumbs(items) {
    const nav = document.createElement("nav");
    nav.className = "breadcrumbs";
    nav.setAttribute("aria-label", "Okruszki");
    const ol = document.createElement("ol");
    const parentIndex = items.length > 1 ? items.length - 2 : 0;
    items.forEach(function (it, i) {
      const li = document.createElement("li");
      if (i === parentIndex) li.className = "is-parent";
      if (it.href) {
        const a = document.createElement("a");
        a.href = it.href;
        if (i === parentIndex) {
          const ic = document.createElement("span");
          ic.className = "bc-back-icon";
          ic.setAttribute("aria-hidden", "true");
          ic.appendChild(icon("chevron-left", { size: 16 }));
          a.appendChild(ic);
        }
        a.appendChild(document.createTextNode(it.label));
        if (it.onclick) a.addEventListener("click", function (e) { e.preventDefault(); it.onclick(e); });
        li.appendChild(a);
      } else {
        li.textContent = it.label;
        if (i === items.length - 1) li.setAttribute("aria-current", "page");
      }
      ol.appendChild(li);
    });
    nav.appendChild(ol);
    return nav;
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
   *   label — opis dla czytników ekranu, text — tekst w środku (domyślnie „N%”), node — element zamiast tekstu
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
    if (opts.node) { txt.className = "ring-text ring-land"; txt.appendChild(opts.node); } // np. symbol krainy zamiast tekstu
    else txt.textContent = opts.text !== undefined ? opts.text : p + "%";
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

  /** Moduł JS (albo plik danych) ładowany na żądanie, z tym samym ?v=… co skrypty startowe (index.html). Zwraca Promise. */
  function loadModule(file) {
    const tag = document.querySelector('script[src*="js/ui.js"]');
    const m = tag && /[?&]v=([\w.-]+)/.exec(tag.getAttribute("src") || "");
    return loadScript(file + (m ? "?v=" + m[1] : ""));
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

  // =====================================================================
  // TOAST — nienachalny komunikat u dołu ekranu (role="status"), opcjonalnie z przyciskiem
  //   ELM.ui.toast({ text, action: { label, onClick }, duration: 5000 })  albo  actions: [{ label, onClick }, …]
  // Jeden naraz; najechanie myszą albo fokus wstrzymują znikanie.
  // =====================================================================

  let toastBox = null, toastTimer = null;

  function toast(opts) {
    if (!toastBox) {
      toastBox = document.createElement("div");
      toastBox.className = "toast-region";
      toastBox.setAttribute("role", "status");
      toastBox.setAttribute("aria-live", "polite");
      document.body.appendChild(toastBox);
    }
    clearTimeout(toastTimer);
    const el = ELM.utils.el;
    const card = el("div", { class: "toast" }, [
      opts.icon ? el("span", { class: "toast-icon", "aria-hidden": "true" }, icon(opts.icon, { size: 18 })) : null,
      el("span", { class: "toast-text", text: opts.text }),
      // jedna akcja (action) albo kilka (actions: [{ label, onClick }, …], np. „Dodaj znaczenie” i „Cofnij”)
      (opts.actions || (opts.action ? [opts.action] : [])).map(function (a) {
        return el("button", {
          type: "button", class: "btn btn-link btn-small toast-action",
          onclick: function () { hideToast(); a.onClick(); }
        }, a.label);
      }),
      el("button", { type: "button", class: "icon-btn toast-close", "aria-label": "Zamknij komunikat", onclick: hideToast }, icon("x", { size: 16 }))
    ]);
    toastBox.replaceChildren(card);
    const duration = opts.duration || 5000;
    const arm = function () { clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, duration); };
    card.addEventListener("mouseenter", function () { clearTimeout(toastTimer); });
    card.addEventListener("mouseleave", arm);
    card.addEventListener("focusin", function () { clearTimeout(toastTimer); });
    card.addEventListener("focusout", arm);
    arm();
  }

  function hideToast() {
    clearTimeout(toastTimer);
    if (toastBox) toastBox.replaceChildren();
  }

  ELM.icon = icon;
  ELM.logo = logo;
  ELM.loadGsap = loadGsap;
  ELM.loadModule = loadModule;
  ELM.loadScript = loadScript; // dane ładowane na żądanie (np. ćwiczenia, Laboratorium czasów)
  ELM.reducedMotion = reducedMotion;
  ELM.ui = { breadcrumbs: breadcrumbs, icon: icon, withIcon: withIcon, emptyState: emptyState, landIcon: landIcon, stamp: stamp, landLabel: landLabel, LANDS: LANDS, pageHead: pageHead, logo: logo, logoMark: logoMark, progressRing: progressRing, setRing: setRing, toast: toast, hideToast: hideToast };
})(window.ELM);
