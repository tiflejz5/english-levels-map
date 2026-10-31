/*
 * today.js — strona „Dziś” (#/dzis) jako kokpit (układ bento, DESIGN.md sekcja 3.2):
 *   hero (powitanie, pierścień „Twoja mapa”, jedna propozycja), powtórki,
 *   seria (płomień + ostatnie 7 dni), egzamin C1 (gdy data jest ustawiona),
 *   szlak A1→C2 (SVG ze stacjami-linkami i znacznikiem „Tu jesteś”),
 *   „Kontynuuj” i „Dodaj błąd”.
 *
 * Animacje (js/motion.js, GSAP na żądanie): kafelki kolejno, liczby od zera,
 * ścieżka szlaku „rysuje się” (DrawSVG), znacznik dojeżdża do stacji
 * (MotionPath). Przy kolejnych wejściach tylko krótkie odświeżenie. Przy
 * prefers-reduced-motion — od razu stan końcowy.
 *
 * Seria liczona jest z listy dni aktywności profilu (ELM.learn.streak).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const HASH = "#/dzis";
  const DAY_NAMES = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const DAY_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
  const MONTHS = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];

  let visitedThisSession = false; // pełna animacja tylko przy pierwszym wejściu
  let trailObserver = null;

  function pd() { return ELM.profileData; }
  function learn() { return ELM.learn; }
  function plural(n, one, few, many) { return ELM.c1 ? ELM.c1.plural(n, one, few, many) : many; }

  function parseRoute(hash) {
    return /^#\/dzis\/?$/.test(hash || "") ? { kind: "today" } : null;
  }

  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    return n;
  }

  function dateOf(day) {
    return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), 12);
  }

  /** Liczba, która przy wejściu odlicza się od zera (data-count czyta js/motion.js). */
  function bigNumber(value, cls) {
    return el("span", { class: "num today-number" + (cls ? " " + cls : ""), "data-count": String(value), text: String(value) });
  }

  function tile(cls, label, children) {
    return el("section", { class: "card bento-tile " + cls, "aria-label": label }, children);
  }

  // =====================================================================
  // STAN: postęp, stacja „tu jesteś”, propozycja
  // =====================================================================

  function levelStats() {
    return ELM.LEVEL_IDS.map(function (id) { return Object.assign({ id: id }, ELM.app.getLevelStats(id)); });
  }

  /** Pierwsza stacja z postępem poniżej 100% (gdy wszystko zrobione — ostatnia). */
  function currentIndex(stats) {
    const i = stats.findIndex(function (s) { return s.total && s.percent < 100; });
    return i === -1 ? stats.length - 1 : i;
  }

  function levelName(id) {
    const level = ELM.state.content.levels.find(function (l) { return l.id === id; });
    const m = level && /^\*\*(.+?)\*\*\s*$/.exec(String(level.description || "").split("\n")[0]);
    return m ? m[1] : "";
  }

  /** Następny nieodhaczony punkt na poziomie (z podstroną, jeśli istnieje). */
  function nextItem(levelId) {
    const level = ELM.state.content.levels.find(function (l) { return l.id === levelId; });
    if (!level) return null;
    ELM.niezbednik.computeLinks();
    for (const cat of ELM.state.content.categories) {
      const bucket = level.content[cat.id];
      if (!bucket) continue;
      for (const e of bucket.essentials) {
        if (U.isBlank(e.text) || ELM.state.progress[e.id] === true) continue;
        const info = ELM.niezbednik.linkForEssential(e.id);
        return { text: e.text.replace(/\s*\(.*\)\s*$/, ""), href: info ? ELM.niezbednik.routeOf(info.item) : ELM.app.levelHash(levelId) };
      }
    }
    return null;
  }

  function greetingWord() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Dzień dobry";
    if (h >= 12 && h < 18) return "Miłego popołudnia";
    return "Dobry wieczór";
  }

  /** Miejscownik krainy: „na Wzgórzach”, „w Lesie” (do zdania „Następny przystanek …”). */
  const LOCATIVE = { A1: "na Polanie", A2: "w Lesie", B1: "na Wzgórzach", B2: "nad Jeziorem", C1: "w Górach", C2: "na Szczycie" };

  /** Opis paska „Przebyta mapa” dla czytnika ekranu: „Przebyta mapa: 41%. A1 100%, A2 100%, …”. */
  function mapSummary(mp) {
    return "Przebyta mapa: " + mp.percent + "%. " + mp.segments.map(function (s) { return s.id + " " + Math.round(s.percent) + "%"; }).join(", ") + ".";
  }

  /**
   * Stopka karty mapy: „Następny przystanek na Wzgórzach: Past Perfect · do końca krainy 16 punktów” i przycisk.
   * Poziom ukończony: „Zrób test końcowy B1” (gdy niezaliczony) albo „Zacznij krainę A2”.
   */
  function mapFooter(stats) {
    const idx = currentIndex(stats);
    const cur = stats[idx];
    const remaining = cur.total - cur.done;
    const next = cur.percent < 100 ? nextItem(cur.id) : null;
    const ready = ELM.levelFinal ? ELM.levelFinal.readyLevel(stats) : null;
    let text, cta = null, extra = null;
    if (next) {
      text = ["Następny przystanek " + LOCATIVE[cur.id] + ": ", el("strong", { text: next.text }), " · do końca krainy " + remaining + " " + plural(remaining, "punkt", "punkty", "punktów")];
      cta = { href: next.href, label: "Idź dalej szlakiem" };
      if (ready) extra = ready;
    } else {
      const passed = pd().passedLevels()[cur.id];
      const following = ELM.LEVEL_IDS[idx + 1];
      if (!passed && ELM.levelFinal) {
        text = ["Cała kraina " + cur.id + " ma „Umiem”. Czas na test końcowy poziomu."];
        cta = { href: ELM.levelFinal.testHash(cur.id), label: "Zrób test końcowy " + cur.id };
      } else if (following) {
        text = ["Kraina " + cur.id + " przebyta. Dalej: ", el("strong", { text: ELM.ui.landLabel(following) }), "."];
        cta = { href: ELM.app.levelHash(following), label: "Zacznij krainę " + following };
      } else {
        text = ["Cała mapa przebyta. Powtórki i ćwiczenia pomogą utrzymać formę."];
      }
    }
    return el("footer", { class: "map-foot" }, [
      el("div", { class: "map-foot-text" }, [
        el("p", { class: "map-next" }, text),
        extra ? el("a", { class: "btn-link map-ready", href: ELM.levelFinal.testHash(extra.id) }, "Gotowy na test końcowy " + extra.id + "? Zrób test") : null
      ]),
      cta ? el("a", { class: "btn btn-secondary map-cta", href: cta.href }, [cta.label, ELM.icon("chevron-right", { size: 18 })]) : null
    ]);
  }

  /**
   * Karta mapy (zastępuje hero i osobny Szlak): data i kraina, powitanie, „Przebyta mapa” z paskiem 6 odcinków,
   * Szlak topograficzny w środku karty, stopka z następnym przystankiem. Zwraca element; ._stage to kontener Szlaku.
   */
  function mapCard(stats) {
    const p = ELM.app.getActiveProfile();
    const d = dateOf(learn().today());
    const cur = stats[currentIndex(stats)];
    const mp = learn().mapProgress(stats);
    const stage = el("div", { class: "trail-stage" });
    const card = el("section", { class: "card bento-tile map-card", "aria-labelledby": "today-title" }, [
      el("div", { class: "map-top" }, [
        el("div", { class: "map-hello" }, [
          el("p", { class: "today-date" }, [DAY_NAMES[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()] + " · kraina ", el("strong", { class: "map-land lvl-" + cur.id, text: ELM.ui.landLabel(cur.id) })]),
          el("h1", { class: "hero-title", id: "today-title", text: greetingWord() + (p ? ", " + p.name : "") })
        ]),
        el("div", { class: "map-progress" }, [
          el("div", { class: "map-progress-row" }, [el("span", { class: "map-progress-label", text: "Przebyta mapa" }), el("span", { class: "map-progress-pct num", text: mp.percent + "%" })]),
          el("div", { class: "map-segments", role: "img", "aria-label": mapSummary(mp) }, mp.segments.map(function (seg) {
            return el("span", { class: "map-seg lvl-" + seg.id, "aria-hidden": "true" }, el("span", { class: "map-seg-fill", style: "width:" + seg.percent + "%" }));
          }))
        ])
      ]),
      stage,
      mapFooter(stats)
    ]);
    card._stage = stage;
    return card;
  }

  // =====================================================================
  // KAFELKI
  // =====================================================================

  function streakMessage(s) {
    if (s.activeToday) return s.current > 1 ? "Dzisiejszy dzień zaliczony. Seria rośnie." : "Dzisiejszy dzień zaliczony.";
    if (s.current > 0) return "Seria trwa. Jedna krótka aktywność dziś ją przedłuży.";
    return "Liczy się każdy dzień z jedną aktywnością: „Umiem”, ćwiczenie albo powtórka.";
  }

  /** Seria: „Seria · 6 dni”, podpis i 7 kropek ostatnich dni (z opisami dla czytnika ekranu). */
  function streakTile() {
    const today = learn().today();
    const days = pd().activityDays();
    const s = learn().streak(days, today);
    const week = learn().lastDays(days, today, 7);
    return el("section", { class: "card bento-tile streak-card", "aria-labelledby": "streak-title" }, [
      el("div", { class: "streak-main" }, [
        el("h2", { class: "tile-title", id: "streak-title", text: "Seria · " + s.current + " " + plural(s.current, "dzień", "dni", "dni") }),
        el("p", { class: "tool-note", text: s.current ? "każdy dzień nauki to krok na szlaku" : streakMessage(s) })
      ]),
      el("ol", { class: "week-dots", "aria-label": "Ostatnie 7 dni" }, week.map(function (d) {
        const js = dateOf(d.day);
        const isToday = d.day === today;
        return el("li", { class: "week-day" + (d.active ? " is-active" : "") + (isToday ? " is-today" : "") }, [
          el("span", { class: "week-dot", "aria-hidden": "true" }, d.active ? ELM.icon("check", { size: 12 }) : null),
          el("span", { class: "visually-hidden", text: (isToday ? "dziś, " : "") + DAY_NAMES[js.getDay()] + " " + d.day.slice(8, 10) + "." + d.day.slice(5, 7) + ": " + (d.active ? "dzień nauki" : "bez aktywności") })
        ]);
      }))
    ]);
  }

  /** Wiersz listy „Na skróty”: ikona, tytuł, opis, chevron. Element to <a> albo <button>. */
  function shortcutRow(tag, attrs, icon, title, desc) {
    return el("li", null, el(tag, Object.assign({ class: "row" }, attrs), [
      el("span", { class: "row-icon", "aria-hidden": "true" }, ELM.icon(icon, { size: 20 })),
      el("span", { class: "row-body" }, [
        el("span", { class: "row-title", text: title }),
        desc ? el("span", { class: "row-desc", text: desc }) : null
      ]),
      el("span", { class: "row-chev", "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 20 }))
    ]));
  }

  /** „Na skróty” (gdy nie ma moich egzaminów): Test poziomu i Statystyki. */
  function shortcutsTile() {
    const rows = [];
    if (ELM.levelTest) rows.push(shortcutRow("a", { href: ELM.levelTest.HASH }, "target", "Test poziomu", "12 pytań, ok. 6 minut – sprawdź, od czego zacząć."));
    rows.push(shortcutRow("a", { href: "#/statystyki" }, "chart-column", "Statystyki", "Trafność, najsłabsze tematy i aktywność."));
    return tile("bento-shortcuts", "Na skróty", [
      el("h2", { class: "tile-title" }, ["Na skróty"]),
      el("ul", { class: "row-list" }, rows)
    ]);
  }

  // =====================================================================
  // SZLAK A1 → C2
  // =====================================================================

  /** Punkty stacji w układzie poziomym (viewBox 1000 × 280) albo pionowym (220 × 6·104). */
  function geometry(vertical) {
    if (vertical) {
      const pts = [0, 1, 2, 3, 4, 5].map(function (i) { return [i % 2 ? 132 : 60, 52 + i * 104]; });
      return { w: 220, h: 52 * 2 + 5 * 104, pts: pts };
    }
    const pts = [0, 1, 2, 3, 4, 5].map(function (i) { return [80 + i * 168, i % 2 ? 84 : 176]; });
    return { w: 1000, h: 280, pts: pts };
  }

  /** Zamknięta, lekko nieregularna warstwica (deterministyczna; gładka krzywa przez 12 punktów) — logika blob z gen_krainy.py. */
  function blobPath(cx, cy, rx, ry, seed, k) {
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = 2 * Math.PI * i / 12;
      const wob = 1 + 0.09 * Math.sin(3 * a + seed) + 0.05 * Math.cos(5 * a + seed * 1.7);
      pts.push([cx + rx * k * wob * Math.cos(a), cy + ry * k * wob * Math.sin(a)]);
    }
    const f = function (n) { return n.toFixed(1); };
    let d = "M" + f(pts[0][0]) + " " + f(pts[0][1]);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += " C" + f(c1[0]) + " " + f(c1[1]) + " " + f(c2[0]) + " " + f(c2[1]) + " " + f(p2[0]) + " " + f(p2[1]);
    }
    return d + "Z";
  }

  /** Teren: plama --lvl-x-soft + warstwice --lvl-x; liczba warstwic rośnie od A1 (3) do C2 (8). */
  function terrainGroup(g, vertical) {
    const group = svgEl("g", { class: "trail-terrain" });
    const rx = vertical ? 58 : 80, ry = vertical ? 46 : 64;
    ELM.LEVEL_IDS.forEach(function (id, i) {
      const l = id.toLowerCase();
      const x = g.pts[i][0], y = g.pts[i][1];
      const land = svgEl("g", { class: "trail-land", style: "--land:var(--lvl-" + l + ");--land-soft:var(--lvl-" + l + "-soft)" });
      land.appendChild(svgEl("path", { class: "trail-land-fill", d: blobPath(x, y, rx, ry, i * 1.3, 1) }));
      const rings = 3 + i;
      for (let r = 0; r < rings; r++) {
        land.appendChild(svgEl("path", {
          class: "trail-contour", d: blobPath(x + r * 2, y - r * 1.5, rx, ry, i * 1.3 + r * 0.4, 1 - r * (0.8 / rings)),
          "stroke-opacity": (0.22 + 0.05 * r).toFixed(2)
        }));
      }
      group.appendChild(land);
    });
    return group;
  }

  /** Róża wiatrów w wolnym rogu mapy. */
  function windRose() {
    const rose = svgEl("g", { class: "trail-rose", transform: "translate(44 48)" });
    rose.appendChild(svgEl("circle", { r: 16 }));
    rose.appendChild(svgEl("path", { d: "M0-22v44M-22 0h44" }));
    rose.appendChild(svgEl("path", { class: "trail-rose-needle", d: "M0-16 4 0H-4z" }));
    const n = svgEl("text", { y: -26, "text-anchor": "middle" });
    n.textContent = "N";
    rose.appendChild(n);
    return rose;
  }

  /** Gładka ścieżka przez punkty (Catmull-Rom → krzywe Béziera). */
  function smoothPath(pts) {
    let d = "M" + pts[0][0] + " " + pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += " C" + c1.map(Math.round).join(" ") + " " + c2.map(Math.round).join(" ") + " " + p2.join(" ");
    }
    return d;
  }

  /**
   * Długość ścieżki od startu do stacji nr i (do rysowania postępu i ruchu znacznika).
   * Stacje są końcami kolejnych odcinków „C” z smoothPath, więc wystarczy zmierzyć
   * ścieżkę przyciętą do i odcinków — jedno getTotalLength() zamiast setek
   * getPointAtLength() (przy CPU 4× to było ~650 ms na każdy render „Dziś”).
   */
  function lengthTo(path, d, i) {
    if (i <= 0) return 0;
    const full = path.getAttribute("d");
    path.setAttribute("d", d.split(" C").slice(0, i + 1).join(" C"));
    const len = path.getTotalLength();
    path.setAttribute("d", full);
    return len;
  }

  /**
   * Szlak w wariancie kompaktowym (strona główna, nad tabelą „Poziomy w skrócie”): bez nagłówka karty i róży wiatrów.
   * Zwraca element; rysuje się, gdy dostanie szerokość (ResizeObserver), i przerysowuje przy zmianie układu poziomy/pionowy.
   */
  function compactTrail() {
    const stats = levelStats();
    const stage = el("div", { class: "trail-stage" });
    const wrap = el("section", { class: "trail-compact", "aria-label": "Szlak A1 → C2: postęp w krainach" }, stage);
    let last = null;
    function draw() {
      if (!stage.clientWidth) return;
      const vertical = stage.clientWidth < 480;
      if (last === vertical) return;
      last = vertical;
      drawTrail(stage, stats, { compact: true });
    }
    if (window.ResizeObserver) new ResizeObserver(draw).observe(stage);
    requestAnimationFrame(draw);
    return wrap;
  }

  /** Rysuje szlak w kontenerze (po wstawieniu do DOM — potrzebna szerokość). opts.compact: bez róży wiatrów (strona główna). */
  function drawTrail(stage, stats, opts) {
    opts = opts || {};
    const vertical = stage.clientWidth < 480;
    const g = geometry(vertical);
    const cur = currentIndex(stats);
    stage.replaceChildren();
    stage.classList.toggle("is-vertical", vertical);
    stage.style.setProperty("--trail-ratio", g.w + " / " + g.h);
    if (vertical) stage.style.height = g.h + "px"; else stage.style.removeProperty("height");

    const svg = svgEl("svg", { class: "trail-svg", viewBox: "0 0 " + g.w + " " + g.h, "aria-hidden": "true", focusable: "false" });
    svg.appendChild(terrainGroup(g, vertical));
    const d = smoothPath(g.pts);
    const base = svgEl("path", { d: d, class: "trail-base", id: "trail-path" });
    const done = svgEl("path", { d: d, class: "trail-done" });
    svg.appendChild(base);
    svg.appendChild(done);
    if (!vertical && !opts.compact) svg.appendChild(windRose());
    // Znacznik „tu jesteś” (pinezka mapy)
    // Zewnętrzna grupa jedzie po ścieżce (x, y = punkt ścieżki), wewnętrzna unosi pinezkę nad stację
    const marker = svgEl("g", { class: "trail-marker" });
    // Pinezka w stałych pikselach ekranu: 32 px nad środkiem stacji, bez względu na skalę viewBoxa
    const k = vertical ? 1 : g.w / Math.max(1, stage.clientWidth);
    const lift = svgEl("g", { transform: "translate(0 " + (-32 * k).toFixed(2) + ") scale(" + k.toFixed(3) + ")" });
    lift.appendChild(svgEl("path", { d: "M0 0c-7-8-11-13-11-19a11 11 0 0 1 22 0c0 6-4 11-11 19Z", class: "trail-marker-pin" }));
    lift.appendChild(svgEl("circle", { cx: 0, cy: -19, r: 4.2, class: "trail-marker-dot" }));
    marker.appendChild(lift);
    stage.appendChild(svg);
    // Znacznik na osobnej warstwie NAD stacjami (ten sam viewBox), przezroczystej dla kliknięć
    const overlay = svgEl("svg", { class: "trail-svg trail-overlay", viewBox: "0 0 " + g.w + " " + g.h, "aria-hidden": "true", focusable: "false" });
    overlay.appendChild(marker);

    // Stacje: linki do stron poziomów (HTML nad SVG, pozycja w % viewBoxa)
    const list = el("ol", { class: "trail-stations" });
    stats.forEach(function (s, i) {
      const pt = g.pts[i];
      const name = levelName(s.id);
      const here = i === cur;
      const passed = ELM.levelFinal ? ELM.levelFinal.passedText(s.id) : null; // „A1 zaliczony 12.11.2026” (test końcowy)
      list.appendChild(el("li", {
        class: "trail-station lvl-" + s.id + (here ? " is-current" : "") + (s.percent >= 100 ? " is-done" : ""),
        style: vertical ? "left:" + pt[0] + "px;top:" + pt[1] + "px" : "left:" + (pt[0] / g.w * 100) + "%;top:" + (pt[1] / g.h * 100) + "%"
      }, el("a", {
        class: "trail-link",
        href: ELM.app.levelHash(s.id),
        "aria-label": "Poziom " + s.id + (name ? ", " + name : "") + ": " + s.percent + "% punktów „Umiem”" + (here ? " – tu jesteś" : "") + (passed ? ". " + passed : "")
      }, [
        el("span", { class: "trail-ring" }, [
          ELM.ui.progressRing(s.percent, { size: 56, stroke: 5, node: ELM.ui.landIcon(s.id, { size: 26 }) }),
          passed ? ELM.ui.stamp(s.id, { size: 20 }) : null // pieczątka ✓ w kolorze krainy (tekst „Zaliczony …” obok)
        ]),
        el("span", { class: "trail-label", "aria-hidden": "true" }, [
          el("span", { class: "trail-name", text: ELM.ui.landLabel(s.id) }),
          el("span", { class: "trail-pct num", text: s.percent + "%" }),
          passed ? el("span", { class: "trail-passed", text: "Zaliczony " + ELM.levelFinal.fmtDate(ELM.levelFinal.passedAt(s.id)) }) : null,
          here ? el("span", { class: "trail-here", text: "Tu jesteś" }) : null
        ])
      ])));
    });
    stage.appendChild(list);
    stage.appendChild(overlay);
    list.querySelectorAll(".ring").forEach(function (r) { r.setAttribute("aria-hidden", "true"); r.removeAttribute("role"); });

    // Stan końcowy bez animacji: ścieżka przebyta do bieżącej stacji, znacznik na stacji
    const total = base.getTotalLength();
    const reach = lengthTo(done, d, cur);
    const frac = total ? reach / total : 0;
    done.style.strokeDasharray = reach + " " + total;
    marker.setAttribute("transform", "translate(" + g.pts[cur][0] + " " + g.pts[cur][1] + ")");
    return { svg: svg, base: base, done: done, marker: marker, frac: frac, vertical: vertical };
  }

  // =====================================================================
  // WIDOK
  // =====================================================================

  function render() {
    const view = document.getElementById("view");
    const keepScroll = view.dataset.file === HASH ? U.getScroll() : 0;
    const stats = levelStats();
    const map = mapCard(stats);
    const exam = ELM.examCover ? ELM.examCover.todayTiles()[0] : null; // mój egzamin z najbliższą datą (mini okładka)

    view.className = "view tool-view today-view";
    view.dataset.file = HASH;
    view.replaceChildren(el("div", { class: "today-stack" }, [
      map,
      ELM.powtorki ? ELM.powtorki.todayCard() : null, // „Fiszki i błędy”: stan z liczbą albo niska karta zerowa
      el("div", { class: "today-row" }, [streakTile(), exam || shortcutsTile()])
    ]));
    document.title = "Dziś · English Levels Map";
    U.setScroll(keepScroll);

    const stage = map._stage;
    let parts = drawTrail(stage, stats);
    // Szlak poziomy ↔ pionowy przy zmianie szerokości
    if (trailObserver) trailObserver.disconnect();
    if (window.ResizeObserver) {
      let lastVertical = parts.vertical;
      trailObserver = new ResizeObserver(function () {
        const v = stage.clientWidth < 480;
        if (v !== lastVertical) { lastVertical = v; parts = drawTrail(stage, stats); }
      });
      trailObserver.observe(stage);
    }
    animate(view, parts);
  }

  /** Animacje wejścia (GSAP na żądanie; przy ograniczonym ruchu — nic). */
  function animate(view, parts) {
    const first = !visitedThisSession;
    visitedThisSession = true;
    ELM.motion.run(["DrawSVGPlugin", "MotionPathPlugin"], function (gsap, reduce) {
      if (!gsap || reduce) return;
      const tiles = view.querySelectorAll(".bento-tile");
      if (!first) {
        // Kolejne wejścia: krótkie odświeżenie
        gsap.from(tiles, { autoAlpha: 0, y: 6, duration: 0.25, stagger: 0.03, ease: "power2.out", clearProps: "all" });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(tiles, { autoAlpha: 0, y: 16, duration: 0.45, stagger: 0.06, clearProps: "transform,opacity,visibility" });
      view.querySelectorAll("[data-count]").forEach(function (n) { tl.add(ELM.motion.countUp(gsap, n, Number(n.getAttribute("data-count"))), 0.15); });
      // Ścieżka przebyta „rysuje się”, potem znacznik dojeżdża do stacji
      parts.done.style.removeProperty("stroke-dasharray");
      tl.fromTo(parts.done, { drawSVG: "0% 0%" }, { drawSVG: "0% " + (parts.frac * 100).toFixed(2) + "%", duration: 1.1, ease: "power2.inOut" }, 0.3);
      tl.fromTo(parts.marker, { autoAlpha: 0 }, {
        autoAlpha: 1,
        motionPath: { path: parts.base, start: 0, end: Math.max(0.0001, parts.frac) },
        duration: 1.1, ease: "power2.inOut"
      }, 0.3);
    });
  }

  ELM.today = { currentLevelId: function () { const st = levelStats(); return st[currentIndex(st)].id; }, HASH: HASH, parseRoute: parseRoute, render: render, compactTrail: compactTrail };
})(window.ELM);
