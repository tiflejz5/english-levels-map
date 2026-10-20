/*
 * tense-lab.js — „Laboratorium czasów” (spec 02, część A).
 *
 * Adresy (zakładki):
 *   #/laboratorium-czasow                     Mapa czasów
 *   #/laboratorium-czasow/<idCzasu>           Karta czasu
 *   #/laboratorium-czasow/dobierz             Dobierz czas (drzewo pytań, reguły — nie AI)
 *   #/laboratorium-czasow/porownaj[/<a>/<b>]  Porównaj dwa czasy
 *
 * Dane: dane/lab-dane.js (ELM.LAB = { tenses, tree }) — generowane z
 * dane/lab-czasow.json i dane/lab-wybor-czasu.json przez tools/zbuduj-cwiczenia.js,
 * wczytywane dopiero po wejściu do Labu.
 *
 * Oś czasu: SVG, współrzędne -1 (daleka przeszłość) … 0 (teraz) … 1 (przyszłość).
 * role="img" + aria-label = opis sceny, ten sam opis jako tekst pod osią.
 * Animacja GSAP (DrawSVG) przy wejściu i zmianie sceny, przy ograniczonym ruchu bez.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const BASE = "#/laboratorium-czasow";
  const SVG_NS = "http://www.w3.org/2000/svg";

  const GROUPS = [
    { id: "present", label: "Present", pl: "teraźniejszość" },
    { id: "past", label: "Past", pl: "przeszłość" },
    { id: "future", label: "Future", pl: "przyszłość" }
  ];
  const ASPECTS = [
    { id: "simple", label: "Simple" },
    { id: "continuous", label: "Continuous" },
    { id: "perfect", label: "Perfect" },
    { id: "perfect-continuous", label: "Perfect Continuous" }
  ];

  // Stan zakładek (w pamięci karty)
  let lastTense = "present-simple";
  const sceneOf = {};           // wybrana scena na karcie czasu: { idCzasu: idSceny }
  let pathStack = [];           // „Dobierz czas”: [{ node, option }]

  /** Zastępuje dzieci węzła (null i false są pomijane — replaceChildren zamieniłby je na tekst „null”). */
  function fill(node, list) { node.replaceChildren(); U.appendChildren(node, list); }

  function lab() { return ELM.LAB || { tenses: [], tree: null }; }
  function tense(id) { return lab().tenses.find(function (t) { return t.id === id; }) || null; }

  /** Formy przyszłe poza siatką: going to, Present Continuous / Simple o przyszłości. */
  function isForm(t) { return t.aspect === "form" || (t.group === "future" && !/^future-/.test(t.id)); }

  function load() {
    if (ELM.LAB) return Promise.resolve(ELM.LAB);
    const src = ELM.exercises ? ELM.exercises.asset("dane/lab-dane.js") : "dane/lab-dane.js";
    return ELM.loadScript(src).then(function () { return ELM.LAB; }, function (e) { console.warn(e.message + " — uruchom: npm run build"); return null; });
  }

  // =====================================================================
  // ADRESY
  // =====================================================================

  function parseRoute(hash) {
    const m = /^#\/laboratorium-czasow(?:\/([a-z0-9-]+)(?:\/([a-z0-9-]+)\/([a-z0-9-]+))?)?\/?$/.exec(hash || "");
    if (!m) return null;
    if (!m[1]) return { tab: "map" };
    if (m[1] === "dobierz") return { tab: "pick" };
    if (m[1] === "porownaj") return { tab: "compare", a: m[2] || null, b: m[3] || null };
    if (m[2]) return null;
    return { tab: "card", id: m[1] };
  }

  // =====================================================================
  // ODSŁUCH (Web Speech API, en-GB, potem en-US)
  // =====================================================================

  function canSpeak() { return "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function"; }

  function speak(text) {
    if (!canSpeak()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const voice = voices.find(function (v) { return /^en[-_]GB/i.test(v.lang); }) || voices.find(function (v) { return /^en[-_]US/i.test(v.lang); }) || voices.find(function (v) { return /^en/i.test(v.lang); });
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : "en-GB";
    u.rate = 0.9;
    synth.speak(u);
  }

  function speakButton(text) {
    if (!canSpeak()) return null;
    return el("button", {
      type: "button", class: "btn btn-ghost lab-speak", "aria-label": "Posłuchaj: " + text, "data-tooltip": "Posłuchaj",
      onclick: function () { speak(text); }
    }, ELM.icon("volume-2", { size: 18 }));
  }

  // =====================================================================
  // OŚ CZASU (SVG)
  // =====================================================================

  function svg(tag, attrs, children) {
    const n = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, String(attrs[k])); });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  // Szeroka oś (800 jednostek) albo zwarta (440) — na telefonie i w kolumnach „Porównaj”,
  // żeby napisy nie były zbyt drobne po przeskalowaniu SVG
  const AXIS_Y = 120;
  let W = 800, LEFT = 46, RIGHT = 754;
  function setGeometry(compact) {
    W = compact ? 440 : 800;
    LEFT = compact ? 36 : 46;
    RIGHT = W - LEFT;
  }
  function xOf(v) { return LEFT + (Math.max(-1, Math.min(1, v)) + 1) / 2 * (RIGHT - LEFT); }

  let gradientSeq = 0;

  /**
   * Oś czasu sceny. Zwraca { node, parts } (parts — elementy do animacji).
   * Etykiety nad osią w rzędach: przy kolizji kolejny rząd wyżej.
   */
  function timeline(t, scene, compact) {
    setGeometry(compact);
    const color = "var(--tense-" + t.group + ")";
    const parts = { axis: null, marks: [] };
    const marks = svg("g", { class: "tl-marks" });
    const labels = [];
    const gid = "tl-grad-" + (++gradientSeq);
    const defs = svg("defs", null, [
      svg("linearGradient", { id: gid, x1: "0", x2: "1", y1: "0", y2: "0" }, [
        svg("stop", { offset: "0", style: "stop-color:" + color + ";stop-opacity:0" }),
        svg("stop", { offset: "0.55", style: "stop-color:" + color + ";stop-opacity:1" })
      ]),
      svg("marker", { id: gid + "-arrow", viewBox: "0 0 10 10", refX: "6", refY: "5", markerWidth: "4", markerHeight: "4", orient: "auto" }, [
        svg("path", { d: "M0 0 L10 5 L0 10 z", style: "fill:" + color })
      ])
    ]);

    (scene.elements || []).forEach(function (e) {
      let g;
      if (e.kind === "point") {
        g = svg("circle", { cx: xOf(e.at), cy: AXIS_Y, r: 9, class: "tl-point", style: "fill:" + color });
        if (e.label) labels.push({ x: xOf(e.at), text: e.label });
      } else if (e.kind === "range") {
        g = svg("line", { x1: xOf(e.from), x2: xOf(e.to), y1: AXIS_Y, y2: AXIS_Y, class: "tl-range", style: "stroke:" + color });
        if (e.label) labels.push({ x: (xOf(e.from) + xOf(e.to)) / 2, text: e.label });
      } else if (e.kind === "open-left") {
        g = svg("line", { x1: LEFT, x2: xOf(e.to), y1: AXIS_Y, y2: AXIS_Y, class: "tl-range", style: "stroke:url(#" + gid + ")" });
        if (e.label) labels.push({ x: (LEFT + xOf(e.to)) / 2 + 40, text: e.label });
      } else if (e.kind === "open-right") {
        g = svg("line", { x1: xOf(e.from), x2: RIGHT - 12, y1: AXIS_Y, y2: AXIS_Y, class: "tl-range", style: "stroke:" + color, "marker-end": "url(#" + gid + "-arrow)" });
        if (e.label) labels.push({ x: (xOf(e.from) + RIGHT) / 2, text: e.label });
      } else if (e.kind === "repeat") {
        const n = Math.max(2, e.count || 5);
        g = svg("g", { class: "tl-repeat" });
        for (let i = 0; i < n; i++) {
          g.appendChild(svg("circle", { cx: xOf(e.from + (e.to - e.from) * i / (n - 1)), cy: AXIS_Y, r: 6, style: "fill:" + color }));
        }
        if (e.label) labels.push({ x: (xOf(e.from) + xOf(e.to)) / 2, text: e.label });
      } else if (e.kind === "result") {
        const x = xOf(e.at);
        g = svg("g", { class: "tl-result" }, [
          svg("rect", { x: x - 10, y: AXIS_Y - 10, width: 20, height: 20, rx: 3, transform: "rotate(45 " + x + " " + AXIS_Y + ")", style: "stroke:" + color }),
          svg("circle", { cx: x, cy: AXIS_Y, r: 3.5, style: "fill:" + color })
        ]);
        if (e.label) labels.push({ x: x, text: e.label });
      } else if (e.kind === "marker") {
        const x = xOf(e.at);
        g = svg("line", { x1: x, x2: x, y1: AXIS_Y - 16, y2: AXIS_Y + 22, class: "tl-marker" });
        labels.push({ x: x, text: e.label, marker: true });
      }
      if (g) { marks.appendChild(g); parts.marks.push(g); }
    });

    // Etykiety: rzędy nad osią, bez nakładania (szerokość szacowana z liczby znaków)
    const rows = [];
    const labelNodes = labels.sort(function (a, b) { return a.x - b.x; }).map(function (l) {
      const w = l.text.length * (compact ? 9.4 : 7.6) + 14;
      let row = 0;
      while (rows[row] !== undefined && rows[row] > l.x - w / 2) row++;
      rows[row] = l.x + w / 2;
      const y = AXIS_Y - 24 - row * 22;
      const x = Math.max(LEFT + w / 2 - 30, Math.min(RIGHT - w / 2 + 30, l.x));
      return svg("text", { x: x, y: y, class: "tl-label" + (l.marker ? " is-marker" : ""), "text-anchor": "middle" }, [document.createTextNode(l.text)]);
    });
    // Górna krawędź: tyle miejsca, ile zajmują rzędy etykiet (bez etykiet — tylko kreska „teraz”)
    const topY = rows.length ? AXIS_Y - 50 - (rows.length - 1) * 22 : AXIS_Y - 44;
    const H = AXIS_Y + 50;

    const axis = svg("line", { x1: LEFT - 20, x2: RIGHT + 20, y1: AXIS_Y, y2: AXIS_Y, class: "tl-axis" });
    parts.axis = axis;
    const now = svg("g", { class: "tl-now" }, [
      svg("line", { x1: xOf(0), x2: xOf(0), y1: topY + 4, y2: AXIS_Y + 18, class: "tl-now-line" }),
      svg("text", { x: xOf(0), y: AXIS_Y + 38, "text-anchor": "middle", class: "tl-now-label" }, [document.createTextNode("teraz")])
    ]);
    const ends = svg("g", { class: "tl-ends" }, [
      svg("text", { x: LEFT - 20, y: AXIS_Y + 38, class: "tl-end" }, [document.createTextNode("przeszłość")]),
      svg("text", { x: RIGHT + 20, y: AXIS_Y + 38, "text-anchor": "end", class: "tl-end" }, [document.createTextNode("przyszłość")])
    ]);
    const root = svg("svg", {
      class: "tl-svg" + (compact ? " is-compact" : ""), viewBox: "0 " + topY + " " + W + " " + (H - topY),
      role: "img", "aria-label": t.name + " – " + scene.label + ": " + scene.description, focusable: "false"
    }, [defs, axis, now, ends, marks, svg("g", { class: "tl-labels" }, labelNodes)]);
    parts.labels = labelNodes;
    parts.now = now;
    return { node: root, parts: parts };
  }

  /** Oś z przełącznikiem scen i opisem tekstowym; animacja przy wejściu i zmianie sceny. */
  function timelineBlock(t, opts) {
    opts = opts || {};
    const box = el("div", { class: "tl-block lab-group-" + t.group });
    function paint(animateIt) {
      const scene = t.scenes.find(function (s) { return s.id === sceneOf[t.id]; }) || t.scenes[0];
      const tl = timeline(t, scene, !!opts.compact || window.innerWidth < 640);
      const switcher = t.scenes.length > 1 && !opts.noSwitch ? el("div", { class: "tl-scenes", role: "group", "aria-label": "Sytuacje użycia" }, t.scenes.map(function (s) {
        const on = s.id === scene.id;
        return el("button", {
          type: "button", class: "chip-btn" + (on ? " is-active" : ""), "aria-pressed": on ? "true" : "false",
          onclick: function () { sceneOf[t.id] = s.id; paint(true); const b = box.querySelector(".chip-btn.is-active"); if (b) b.focus(); }
        }, s.label);
      })) : null;
      fill(box, [
        switcher,
        el("figure", { class: "tl-figure" }, [
          tl.node,
          el("figcaption", { class: "tl-caption" }, [el("strong", { text: scene.label + ": " }), scene.description])
        ])
      ]);
      if (animateIt) animate(tl.parts);
    }
    paint(opts.animate !== false);
    return box;
  }

  function animate(parts) {
    if (!ELM.motion) return;
    ELM.motion.run(["DrawSVGPlugin"], function (gsap, reduce) {
      if (!gsap || reduce) return;
      const tl = gsap.timeline();
      tl.fromTo(parts.axis, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.6, ease: "power2.out" });
      tl.from(parts.now, { autoAlpha: 0, duration: 0.25 }, 0.35);
      parts.marks.forEach(function (m, i) {
        if (m.tagName === "line") tl.fromTo(m, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.5, ease: "power2.out" }, 0.45 + i * 0.12);
        else tl.from(m, { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(2)" }, 0.45 + i * 0.12);
      });
      tl.from(parts.labels, { autoAlpha: 0, y: 6, duration: 0.3, stagger: 0.06 }, 0.6);
    });
  }

  // =====================================================================
  // WSPÓLNE ELEMENTY
  // =====================================================================

  function tabs(active, route) {
    const items = [
      { id: "map", label: "Mapa czasów", icon: "layout-grid", href: BASE },
      { id: "card", label: "Karta czasu", icon: "notebook-text", href: BASE + "/" + (route && route.tab === "card" ? route.id : lastTense) },
      { id: "pick", label: "Dobierz czas", icon: "route", href: BASE + "/dobierz" },
      { id: "compare", label: "Porównaj", icon: "arrow-left-right", href: BASE + "/porownaj" }
    ];
    return el("nav", { class: "lab-tabs", "aria-label": "Zakładki Laboratorium czasów" }, el("ul", null, items.map(function (it) {
      const on = it.id === active;
      return el("li", null, el("a", { class: "lab-tab" + (on ? " is-active" : ""), href: it.href, "aria-current": on ? "page" : null }, [
        el("span", { "aria-hidden": "true" }, ELM.icon(it.icon, { size: 18 })),
        el("span", { text: it.label })
      ]));
    })));
  }

  function header(active, route) {
    return [
      el("header", { class: "tool-head lab-head" }, [
        el("h1", { class: "tool-title" }, [el("span", { class: "lab-head-icon", "aria-hidden": "true" }, ELM.icon("flask-conical", { size: 28 })), "Laboratorium czasów"]),
        el("p", { class: "tool-lead", text: "Zobacz czasy na osi, porównaj je i dobierz właściwy do sytuacji." })
      ]),
      tabs(active, route)
    ];
  }

  function levelChip(level) { return el("span", { class: "chip is-level lvl-" + level, text: level }); }

  /** Wzór budowy z wyróżnionymi elementami (operatory i końcówki). */
  function formula(text) {
    const re = /\b(am|is|are|was|were|do|does|did|don't|doesn't|didn't|have|has|had|hadn't|will|won't|been|be|going to|not)\b|-ing|-ed|\+/gi;
    const out = [];
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(el("mark", { class: "lab-key" + (m[0] === "+" ? " is-plus" : ""), text: m[0] }));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  function formationTable(t) {
    const f = t.formation;
    const row = function (label, value) { return el("tr", null, [el("th", { scope: "row", text: label }), el("td", { lang: "en" }, formula(value))]); };
    return el("div", { class: "md-table" }, el("div", { class: "md-table-wrap" }, el("table", { class: "lab-formation" }, [
      el("tbody", null, [row("Twierdzenie", f.affirmative), row("Przeczenie", f.negative), row("Pytanie", f.question)])
    ])));
  }

  // =====================================================================
  // ZAKŁADKA: MAPA CZASÓW
  // =====================================================================

  function tile(t) {
    return el("a", { class: "lab-tile lvl-" + t.level, href: BASE + "/" + t.id }, [
      el("span", { class: "lab-tile-top" }, [
        el("span", { class: "lab-tile-name", text: t.name }),
        levelChip(t.level)
      ]),
      el("span", { class: "lab-tile-pl", text: t.namePl }),
      t.uses && t.uses[0] ? el("span", { class: "lab-tile-ex", lang: "en", text: t.uses[0].en }) : null
    ]);
  }

  function renderMap(view) {
    const all = lab().tenses;
    const grid = el("div", { class: "lab-grid" }, GROUPS.map(function (g) {
      return el("section", { class: "lab-col lab-group-" + g.id, "aria-labelledby": "lab-col-" + g.id }, [
        el("h2", { class: "lab-col-title", id: "lab-col-" + g.id }, [g.label, el("span", { class: "lab-col-pl", text: " · " + g.pl })]),
        el("ol", { class: "lab-col-list" }, ASPECTS.map(function (a) {
          const t = all.find(function (x) { return x.group === g.id && x.aspect === a.id && !isForm(x); });
          return el("li", null, [
            el("span", { class: "lab-aspect", text: a.label }),
            t ? tile(t) : el("span", { class: "lab-tile is-empty" }, [el("span", { class: "lab-tile-name", text: g.label + " " + a.label }), el("span", { class: "lab-tile-pl", text: "Rzadki – na razie bez karty." })])
          ]);
        }))
      ]);
    }));
    const forms = all.filter(isForm);
    view.appendChild(el("section", { class: "lab-section", "aria-labelledby": "lab-map-title" }, [
      el("h2", { class: "section-title", id: "lab-map-title", text: "Mapa czasów" }),
      el("p", { class: "tool-note", text: "Kolumny to czas (Present, Past, Future), wiersze to aspekt. Kolor i kod oznaczają poziom, na którym czas się pojawia. Kliknij kafelek, żeby otworzyć kartę czasu." }),
      grid
    ]));
    if (forms.length) {
      view.appendChild(el("section", { class: "lab-section lab-group-future", "aria-labelledby": "lab-forms-title" }, [
        el("h2", { class: "section-title", id: "lab-forms-title", text: "Formy przyszłe" }),
        el("p", { class: "tool-note", text: "O przyszłości mówimy nie tylko przez will. Te formy też ją wyrażają:" }),
        el("div", { class: "lab-forms" }, forms.map(tile))
      ]));
    }
  }

  // =====================================================================
  // ZAKŁADKA: KARTA CZASU
  // =====================================================================

  function renderCard(view, id) {
    const t = tense(id);
    if (!t) {
      view.appendChild(el("div", { class: "empty-state" }, [
        el("p", { class: "empty-state-text", text: "Nie ma takiego czasu w Laboratorium." }),
        el("p", null, el("a", { class: "btn btn-secondary", href: BASE }, "Wróć do mapy czasów"))
      ]));
      return;
    }
    lastTense = t.id;
    document.title = t.name + " · Laboratorium czasów";
    const card = el("article", { class: "lab-card lvl-" + t.level + " lab-group-" + t.group, "aria-labelledby": "lab-card-title" });
    card.appendChild(el("header", { class: "card lab-card-head" }, [
      el("div", { class: "lab-card-top" }, [
        el("p", { class: "lab-card-eyebrow" }, [levelChip(t.level), el("span", { text: GROUPS.find(function (g) { return g.id === t.group; }).label + (isForm(t) ? " · forma przyszła" : " · " + (ASPECTS.find(function (a) { return a.id === t.aspect; }) || { label: t.aspect }).label) })]),
        ELM.notes ? ELM.notes.button("lab:" + t.id, { title: "Lab czasów · " + t.name, route: BASE + "/" + t.id }) : null
      ]),
      el("h2", { class: "lab-card-title", id: "lab-card-title", lang: "en", text: t.name }),
      el("p", { class: "lab-card-pl", text: t.namePl }),
      el("p", { class: "lab-card-summary", text: t.summary })
    ]));

    card.appendChild(section("Oś czasu", timelineBlock(t)));
    card.appendChild(section("Budowa", formationTable(t)));
    card.appendChild(section("Zastosowania", el("ul", { class: "lab-uses" }, t.uses.map(function (u) {
      return el("li", { class: "card lab-use" }, [
        el("p", { class: "lab-use-label", text: u.label }),
        el("p", { class: "lab-use-en" }, [el("span", { lang: "en", text: u.en }), speakButton(u.en)]),
        el("p", { class: "lab-use-pl", text: u.pl })
      ]);
    }))));
    if (t.signals && t.signals.length) {
      card.appendChild(section("Słowa-sygnały", el("ul", { class: "lab-signals" }, t.signals.map(function (s) {
        return el("li", null, el("span", { class: "chip", lang: "en", text: s }));
      }))));
    }
    if (t.traps && t.traps.length) {
      card.appendChild(el("section", { class: "callout callout-trap lab-traps" }, [
        el("h3", { class: "callout-title" }, [el("span", { class: "callout-icon", "aria-hidden": "true" }, ELM.icon("triangle-alert", { size: 20 })), "Pułapki Polaków"]),
        el("ul", null, t.traps.map(function (x) { return el("li", { text: x }); }))
      ]));
    }
    if (t.contrasts && t.contrasts.length) {
      card.appendChild(section("Porównaj z…", el("ul", { class: "lab-contrasts" }, t.contrasts.map(function (c) {
        const other = tense(c.with);
        return el("li", { class: "card lab-contrast" }, [
          el("p", { class: "lab-contrast-head" }, [el("strong", { lang: "en", text: t.name }), " vs ", el("strong", { lang: "en", text: other ? other.name : c.with })]),
          el("p", { text: c.rule }),
          c.examples && c.examples.length ? el("ul", { class: "lab-contrast-ex", lang: "en" }, c.examples.map(function (x) { return el("li", { text: x }); })) : null,
          el("a", { class: "btn btn-secondary btn-small", href: BASE + "/porownaj/" + t.id + "/" + c.with }, ELM.ui.withIcon("arrow-left-right", "Porównaj obok siebie"))
        ]);
      }))));
    }
    const practice = el("div", { class: "lab-practice" }, el("p", { class: "tool-note", text: "Wczytuję zestawy…" }));
    card.appendChild(section("Ćwicz", practice));
    fillPractice(practice, t);
    view.appendChild(card);
  }

  function section(title, body) {
    return el("section", { class: "lab-block" }, [el("h3", { class: "lab-block-title", text: title }), body]);
  }

  /** Zestawy powiązane z czasem (po niezbednikIds), mixy z tymi tematami i strony tematów. */
  function fillPractice(box, t) {
    if (!ELM.exercises) { box.replaceChildren(); return; }
    ELM.exercises.loadIndex().then(function (index) {
      const ids = t.niezbednikIds || [];
      const setIds = [];
      ids.forEach(function (n) { (index.topics[n] || []).forEach(function (s) { if (setIds.indexOf(s) === -1) setIds.push(s); }); });
      const mixes = index.mixes.filter(function (m) { return m.topics.some(function (x) { return ids.indexOf(x) !== -1; }); });
      const pages = ids.map(ELM.exercises.topicInfo).filter(Boolean);
      fill(box, [
        setIds.length ? el("div", { class: "ex-set-grid" }, setIds.map(function (s) { return index.sets[s]; }).filter(Boolean).map(ELM.exercises.setCard))
          : el("p", { class: "tool-note", text: "Zestawy zadań do tego czasu jeszcze powstają." }),
        mixes.length ? el("p", { class: "lab-practice-links" }, mixes.map(function (m) {
          return el("a", { class: "btn btn-secondary", href: ELM.exercises.BASE + "/mix/" + m.id }, ELM.ui.withIcon("shuffle", "Zestaw mieszany: " + m.title));
        })) : null,
        pages.length ? el("p", { class: "lab-practice-links" }, pages.map(function (p) {
          return el("a", { class: "wiki-link wiki-chip lvl-" + p.level, href: p.href }, [ELM.icon("notebook-text", { size: 14 }), el("span", { class: "wiki-chip-level", text: p.level }), el("span", { class: "wiki-chip-text", text: p.title })]);
        })) : null
      ]);
    });
  }

  // =====================================================================
  // ZAKŁADKA: DOBIERZ CZAS
  // =====================================================================

  function renderPick(view) {
    const tree = lab().tree;
    if (!tree) { view.appendChild(el("p", { class: "tool-note", text: "Brak drzewa wyboru (dane/lab-wybor-czasu.json)." })); return; }
    const last = pathStack[pathStack.length - 1];
    const result = last && last.option.result ? last.option : null;
    const nodeId = result ? null : (last ? last.option.next : tree.start);
    const node = nodeId ? tree.nodes[nodeId] : null;

    const crumbs = el("ol", { class: "lab-path", "aria-label": "Twoje wybory" }, [el("li", { text: "Start" })].concat(pathStack.map(function (s) {
      return el("li", { text: s.option.label });
    })));

    const body = [];
    if (node) {
      body.push(el("h2", { class: "lab-question", id: "lab-q", tabindex: "-1", text: node.question }));
      if (node.help) body.push(el("p", { class: "tool-note", text: node.help }));
      body.push(el("ul", { class: "lab-answers", "aria-labelledby": "lab-q" }, node.options.map(function (o) {
        return el("li", null, el("button", {
          type: "button", class: "lab-answer",
          onclick: function () { pathStack.push({ node: nodeId, option: o }); renderAgain("#lab-q, .lab-result-title"); }
        }, [el("span", { text: o.label }), el("span", { "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 18 }))]));
      })));
    } else {
      const list = result.result.map(tense).filter(Boolean);
      body.push(el("h2", { class: "lab-question lab-result-title", tabindex: "-1", text: list.length > 1 ? "Pasują te czasy:" : "Pasuje: " + list[0].name }));
      if (result.why) body.push(el("p", { class: "lab-why", text: result.why }));
      body.push(el("ul", { class: "lab-results" }, list.map(function (t) {
        return el("li", { class: "card lab-result lvl-" + t.level + " lab-group-" + t.group }, [
          el("p", { class: "lab-result-name" }, [el("strong", { lang: "en", text: t.name }), " ", levelChip(t.level)]),
          el("p", { text: t.summary }),
          t.uses[0] ? el("p", { class: "lab-use-en" }, [el("span", { lang: "en", text: t.uses[0].en }), speakButton(t.uses[0].en)]) : null,
          el("a", { class: "btn btn-primary btn-small", href: BASE + "/" + t.id }, ELM.ui.withIcon("arrow-right", "Zobacz kartę czasu"))
        ]);
      })));
    }
    body.push(el("div", { class: "tool-actions" }, [
      pathStack.length ? el("button", { type: "button", class: "btn btn-secondary", onclick: function () { pathStack.pop(); renderAgain("#lab-q"); } }, ELM.ui.withIcon("arrow-left", "Wstecz")) : null,
      pathStack.length ? el("button", { type: "button", class: "btn btn-ghost", onclick: function () { pathStack = []; renderAgain("#lab-q"); } }, ELM.ui.withIcon("rotate-ccw", "Zacznij od nowa")) : null
    ]));
    view.appendChild(el("section", { class: "card lab-pick", "aria-live": "polite" }, [crumbs].concat(body)));
    view.appendChild(el("p", { class: "tool-note", text: "To reguły zapisane w danych, nie sztuczna inteligencja – ta sama ścieżka zawsze daje ten sam wynik." }));
  }

  function renderAgain(focusSel) {
    render(parseRoute(location.hash));
    setTimeout(function () { const n = document.querySelector(focusSel); if (n) n.focus({ preventScroll: true }); }, 0);
  }

  // =====================================================================
  // ZAKŁADKA: PORÓWNAJ
  // =====================================================================

  function renderCompare(view, route) {
    const all = lab().tenses;
    const a = tense(route.a) || tense(lastTense) || all[0];
    const firstContrast = a.contrasts && a.contrasts[0] ? a.contrasts[0].with : null;
    let b = tense(route.b) || tense(firstContrast) || all.find(function (t) { return t.id !== a.id; });
    if (b.id === a.id) b = all.find(function (t) { return t.id !== a.id; });

    const select = function (id, value, label) {
      const s = el("select", { class: "field lab-select", id: id, onchange: function () {
        const av = document.getElementById("lab-a").value, bv = document.getElementById("lab-b").value;
        location.hash = BASE + "/porownaj/" + av + "/" + bv;
      } }, all.map(function (t) { return el("option", { value: t.id, text: t.name + " (" + t.level + ")" }); }));
      s.value = value;
      return el("div", { class: "lab-select-wrap" }, [el("label", { class: "field-label", for: id, text: label }), s]);
    };

    view.appendChild(el("div", { class: "card lab-compare-pick" }, [
      select("lab-a", a.id, "Pierwszy czas"),
      el("span", { class: "lab-vs", "aria-hidden": "true" }, ELM.icon("arrow-left-right", { size: 20 })),
      select("lab-b", b.id, "Drugi czas")
    ]));

    const column = function (t) {
      return el("section", { class: "card lab-compare-col lvl-" + t.level + " lab-group-" + t.group, "aria-labelledby": "cmp-" + t.id }, [
        el("h2", { class: "lab-card-title", id: "cmp-" + t.id, lang: "en" }, [t.name, " ", levelChip(t.level)]),
        el("p", { class: "lab-card-pl", text: t.namePl + " – " + t.summary }),
        timelineBlock(t, { noSwitch: true, animate: false, compact: true }),
        el("h3", { class: "lab-block-title", text: "Budowa" }),
        formationTable(t),
        el("h3", { class: "lab-block-title", text: "Kiedy używać" }),
        el("ul", { class: "lab-when" }, t.uses.map(function (u) { return el("li", null, [el("strong", { text: u.label + ": " }), el("span", { lang: "en", text: u.en })]); })),
        t.traps && t.traps.length ? el("h3", { class: "lab-block-title", text: "Pułapki" }) : null,
        t.traps && t.traps.length ? el("ul", { class: "lab-when" }, t.traps.map(function (x) { return el("li", { text: x }); })) : null
      ]);
    };
    view.appendChild(el("div", { class: "lab-compare" }, [column(a), column(b)]));

    const diffs = [];
    (a.contrasts || []).forEach(function (c) { if (c.with === b.id) diffs.push({ from: a, c: c }); });
    (b.contrasts || []).forEach(function (c) { if (c.with === a.id) diffs.push({ from: b, c: c }); });
    view.appendChild(el("section", { class: "card lab-diff", "aria-labelledby": "lab-diff-title" }, [
      el("h2", { class: "section-title", id: "lab-diff-title", text: "Różnice" }),
      diffs.length ? el("div", { class: "md-table" }, el("div", { class: "md-table-wrap" }, el("table", null, [
        el("thead", null, el("tr", null, [el("th", { text: "Reguła" }), el("th", { text: "Przykłady" })])),
        el("tbody", null, diffs.map(function (d) {
          return el("tr", null, [el("td", { text: d.c.rule }), el("td", { lang: "en" }, (d.c.examples || []).map(function (x) { return el("p", { class: "lab-diff-ex", text: x }); }))]);
        }))
      ]))) : el("p", { class: "tool-note", text: "Dla tej pary nie ma jeszcze opisanej reguły. Porównaj osie czasu i budowę powyżej." })
    ]));
    // Wspólna animacja obu osi
    animateAll(view);
  }

  function animateAll(view) {
    const svgs = Array.prototype.slice.call(view.querySelectorAll(".tl-svg"));
    if (!svgs.length || !ELM.motion) return;
    ELM.motion.run(["DrawSVGPlugin"], function (gsap, reduce) {
      if (!gsap || reduce) return;
      svgs.forEach(function (s, i) {
        gsap.fromTo(s.querySelector(".tl-axis"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.6, delay: i * 0.1, ease: "power2.out" });
        gsap.from(s.querySelectorAll(".tl-marks > *, .tl-labels > *"), { autoAlpha: 0, duration: 0.35, stagger: 0.08, delay: 0.4 + i * 0.1 });
      });
    });
  }

  // =====================================================================
  // RYSOWANIE
  // =====================================================================

  function render(route) {
    route = route || parseRoute(location.hash) || { tab: "map" };
    const view = document.getElementById("view");
    view.className = "view tool-view lab-view";
    view.dataset.file = BASE;
    view.replaceChildren();
    document.title = "Laboratorium czasów · English Levels Map";
    header(route.tab, route).forEach(function (n) { view.appendChild(n); });
    if (!ELM.LAB) {
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Wczytuję Laboratorium…" }));
      load().then(function (data) {
        if (!data) { view.appendChild(el("p", { class: "tool-note", text: "Nie udało się wczytać danych Laboratorium (dane/lab-dane.js)." })); return; }
        if (parseRoute(location.hash)) render(parseRoute(location.hash));
      });
      return;
    }
    if (route.tab === "map") renderMap(view);
    else if (route.tab === "card") renderCard(view, route.id);
    else if (route.tab === "pick") renderPick(view);
    else renderCompare(view, route);
  }

  ELM.tenseLab = { BASE: BASE, parseRoute: parseRoute, render: render, load: load };
})(window.ELM);
