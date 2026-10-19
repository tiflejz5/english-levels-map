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

  /** Jedno zdanie zachęty zależne od stanu (bez presji). */
  function nudge(stats, streak, due) {
    const anyDone = stats.some(function (s) { return s.done > 0; });
    const cur = stats[currentIndex(stats)];
    if (streak.activeToday) {
      return { text: "Dzisiejszy dzień nauki zaliczony. Możesz zrobić coś jeszcze albo spokojnie odpocząć." };
    }
    if (due > 0) {
      return { text: due + " " + plural(due, "błąd czeka", "błędy czekają", "błędów czeka") + " na powtórkę – to dobry start na dziś.", href: ELM.journal.REVIEW, cta: "Zacznij powtórki" };
    }
    const next = nextItem(cur.id);
    if (!anyDone && next) {
      return { text: "Na początek jeden punkt z poziomu " + cur.id + ": „" + next.text + "”. To zajmie kilka minut.", href: next.href, cta: "Otwórz" };
    }
    if (next) {
      return { text: "Propozycja na dziś: „" + next.text + "” (" + cur.id + ").", href: next.href, cta: "Otwórz" };
    }
    return { text: "Cała mapa ma „Umiem”. Powtórki i ćwiczenia C1 pomogą utrzymać formę." };
  }

  // =====================================================================
  // KAFELKI
  // =====================================================================

  function heroTile(stats, streak, due) {
    const p = ELM.app.getActiveProfile();
    const d = dateOf(learn().today());
    const done = stats.reduce(function (t, s) { return t + s.done; }, 0);
    const total = stats.reduce(function (t, s) { return t + s.total; }, 0);
    const percent = total ? Math.round(done / total * 100) : 0;
    const n = nudge(stats, streak, due);
    return el("section", { class: "card bento-tile bento-hero", "aria-labelledby": "today-title" }, [
      el("div", { class: "hero-text" }, [
        el("p", { class: "today-date", text: DAY_NAMES[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()] }),
        el("h1", { class: "hero-title", id: "today-title", text: greetingWord() + (p ? ", " + p.name : "") }),
        el("p", { class: "hero-nudge" }, [
          n.text,
          n.href ? el("a", { class: "hero-cta", href: n.href }, [n.cta, ELM.icon("arrow-right", { size: 16 })]) : null
        ])
      ]),
      el("div", { class: "hero-ring" }, [
        ELM.ui.progressRing(percent, { size: 132, stroke: 10, brand: true, label: "Twoja mapa: " + percent + "% punktów „Umiem” we wszystkich poziomach", text: percent + "%" }),
        el("p", { class: "hero-ring-label" }, [el("strong", { text: "Twoja mapa" }), el("span", { class: "num", text: done + " z " + total + " umiem" })])
      ])
    ]);
  }

  /** Mała ilustracja kompasu (stan „Na dziś czysto”). */
  function compassArt() {
    const svg = svgEl("svg", { class: "compass-art", viewBox: "0 0 64 64", width: 64, height: 64, "aria-hidden": "true", focusable: "false" });
    svg.appendChild(svgEl("circle", { cx: 32, cy: 32, r: 26, class: "compass-ring" }));
    svg.appendChild(svgEl("circle", { cx: 32, cy: 32, r: 20, class: "compass-inner" }));
    [0, 90, 180, 270].forEach(function (a) {
      svg.appendChild(svgEl("line", { x1: 32, y1: 8, x2: 32, y2: 12, class: "compass-tick", transform: "rotate(" + a + " 32 32)" }));
    });
    const needle = svgEl("g", { class: "compass-needle", transform: "rotate(35 32 32)" });
    needle.appendChild(svgEl("path", { d: "M32 14 36 32h-8z", class: "compass-n" }));
    needle.appendChild(svgEl("path", { d: "M32 50 28 32h8z", class: "compass-s" }));
    svg.appendChild(needle);
    svg.appendChild(svgEl("circle", { cx: 32, cy: 32, r: 2.5, class: "compass-pin" }));
    return svg;
  }

  function reviewsTile(due) {
    return tile("bento-reviews", "Powtórki na dziś", due
      ? [
        el("h2", { class: "tile-title" }, ["Powtórki na dziś"]),
        el("p", { class: "tile-big" }, [bigNumber(due), el("span", { class: "tile-unit", text: plural(due, "błąd do powtórki", "błędy do powtórki", "błędów do powtórki") })]),
        el("a", { class: "btn btn-primary tile-action", href: ELM.journal.REVIEW }, ELM.ui.withIcon("rotate-ccw", "Zacznij powtórki"))
      ]
      : [
        el("h2", { class: "tile-title" }, ["Powtórki na dziś"]),
        el("div", { class: "tile-empty" }, [
          compassArt(),
          el("div", null, [
            el("p", { class: "tile-empty-title", text: "Na dziś czysto" }),
            el("p", { class: "tool-note", text: "Nowe błędy zapisuj w dzienniku – wrócą jutro." })
          ])
        ])
      ]);
  }

  /** Płomień (SVG) — ozdoba kafla serii. */
  function flameArt(lit) {
    const svg = svgEl("svg", { class: "flame-art" + (lit ? " is-lit" : ""), viewBox: "0 0 32 32", width: 36, height: 36, "aria-hidden": "true", focusable: "false" });
    svg.appendChild(svgEl("path", { class: "flame-outer", d: "M16 3c1.2 4.4 6.5 7 7.8 12.6C25.2 21.9 21.3 29 16 29S6.6 24.6 6.6 19.3c0-3.6 2-6.1 3.9-7.6.1 2.4 1.2 4 2.7 4.5C12.6 11.6 14.4 7.5 16 3Z" }));
    svg.appendChild(svgEl("path", { class: "flame-inner", d: "M16 15.5c.6 2.2 3.4 3.4 3.4 6.3 0 2.4-1.6 4.2-3.4 4.2s-3.4-1.6-3.4-3.8c0-2.6 2.6-3.8 3.4-6.7Z" }));
    return svg;
  }

  function streakMessage(s) {
    if (s.activeToday) return s.current > 1 ? "Dzisiejszy dzień zaliczony. Seria rośnie." : "Dzisiejszy dzień zaliczony.";
    if (s.current > 0) return "Seria trwa. Jedna krótka aktywność dziś ją przedłuży.";
    return "Liczy się każdy dzień z jedną aktywnością: „Umiem”, ćwiczenie albo powtórka.";
  }

  function streakTile() {
    const today = learn().today();
    const days = pd().activityDays();
    const s = learn().streak(days, today);
    const week = learn().lastDays(days, today, 7);
    return tile("bento-streak", "Seria nauki", [
      el("h2", { class: "tile-title" }, ["Seria nauki"]),
      el("div", { class: "streak-row" }, [
        flameArt(s.current > 0),
        el("p", { class: "tile-big" }, [bigNumber(s.current), el("span", { class: "tile-unit", text: plural(s.current, "dzień z rzędu", "dni z rzędu", "dni z rzędu") })])
      ]),
      el("p", { class: "tool-note", text: streakMessage(s) + " Najdłuższa seria: " + s.longest + " " + plural(s.longest, "dzień", "dni", "dni") + "." }),
      el("ol", { class: "week-dots", "aria-label": "Ostatnie 7 dni" }, week.map(function (d) {
        const js = dateOf(d.day);
        const isToday = d.day === today;
        return el("li", { class: "week-day" + (d.active ? " is-active" : "") + (isToday ? " is-today" : "") }, [
          el("span", { class: "week-dot", "aria-hidden": "true" }, d.active ? ELM.icon("check", { size: 12 }) : null),
          el("span", { class: "week-label", "aria-hidden": "true", text: isToday ? "Dziś" : DAY_SHORT[js.getDay()] }),
          el("span", { class: "visually-hidden", text: (isToday ? "dziś, " : "") + DAY_NAMES[js.getDay()] + " " + d.day.slice(8, 10) + "." + d.day.slice(5, 7) + ": " + (d.active ? "dzień nauki" : "bez aktywności") })
        ]);
      }))
    ]);
  }

  function examTile() {
    if (!ELM.c1) return null;
    const date = ELM.c1.store.data().examDate;
    const days = ELM.c1.daysUntil(date);
    if (days === null) return null;
    const d = dateOf(date);
    return el("a", { class: "card bento-tile bento-exam", href: ELM.c1.BASE, "aria-label": "Egzamin C1 Advanced: " + ELM.c1.countdownText(date) + ". Przejdź do zakładki Certyfikat C1." }, [
      el("p", { class: "tile-title exam-title" }, [el("span", { class: "c1-chip-badge exam-badge", "aria-hidden": "true", text: "C1" }), "Egzamin"]),
      days > 1
        ? el("p", { class: "tile-big" }, [bigNumber(days, "exam-number"), el("span", { class: "tile-unit", text: plural(days, "dzień", "dni", "dni") + " do egzaminu" })])
        : el("p", { class: "exam-text", text: ELM.c1.countdownText(date) }),
      el("p", { class: "exam-date", text: d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() })
    ]);
  }

  function continueTile() {
    const last = pd().lastPage();
    return tile("bento-continue", "Kontynuuj", [
      el("h2", { class: "tile-title" }, ["Kontynuuj"]),
      last
        ? el("a", { class: "today-continue", href: last.hash }, [
          el("span", { class: "continue-icon", "aria-hidden": "true" }, ELM.icon("notebook-text", { size: 20 })),
          el("span", { class: "continue-text", text: last.title || last.hash }),
          el("span", { class: "c1-home-tile-arrow", "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 20 }))
        ])
        : el("p", { class: "tool-note" }, ["Tu pojawi się ostatnio otwarta podstrona. ",
          el("a", { href: ELM.app.levelHash(ELM.state.ui.levelId) }, "Otwórz poziom " + ELM.state.ui.levelId)])
    ]);
  }

  function addTile() {
    return tile("bento-add", "Dodaj błąd", [
      el("h2", { class: "tile-title" }, ["Masz nowy błąd?"]),
      el("p", { class: "tool-note", text: "Zapisz go od razu – jutro wróci jako powtórka." }),
      el("button", {
        type: "button",
        class: "btn btn-secondary tile-action",
        onclick: function () { ELM.journal.openForm().then(function (r) { if (r) render(); }); }
      }, ELM.ui.withIcon("plus", "Dodaj błąd"))
    ]);
  }

  /** Zachęta do testu poziomu dla profilu bez żadnych postępów i bez wyniku testu. */
  function testTip() {
    if (!ELM.levelTest) return null;
    const profile = ELM.app.getActiveProfile();
    if (!profile || Object.keys(profile.progress).length || pd().lastTest()) return null;
    return el("section", { class: "card bento-tile bento-tip", "aria-label": "Test poziomu" }, [
      el("div", { class: "today-tip-body" }, [
        el("h2", { class: "tile-title", text: "Nie wiesz, od czego zacząć?" }),
        el("p", { class: "tool-note", text: "Szybki test poziomu: 12 pytań, około 5 minut." })
      ]),
      el("a", { class: "btn btn-primary", href: ELM.levelTest.HASH }, ELM.ui.withIcon("target", "Zrób test poziomu"))
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

  /** Długość ścieżki do punktu najbliższego stacji (do rysowania postępu i ruchu znacznika). */
  function lengthAt(path, pt) {
    const total = path.getTotalLength();
    let best = 0, bestD = Infinity;
    for (let l = 0; l <= total; l += total / 400) {
      const p = path.getPointAtLength(l);
      const dd = (p.x - pt[0]) * (p.x - pt[0]) + (p.y - pt[1]) * (p.y - pt[1]);
      if (dd < bestD) { bestD = dd; best = l; }
    }
    return best;
  }

  function trailTile(stats) {
    const wrap = el("section", { class: "card bento-tile bento-trail", "aria-labelledby": "trail-title" }, [
      el("div", { class: "trail-head" }, [
        el("h2", { class: "tile-title", id: "trail-title", text: "Szlak A1 → C2" }),
        el("p", { class: "tool-note", text: "Procent punktów „Umiem” we wszystkich kategoriach poziomu." })
      ])
    ]);
    const stage = el("div", { class: "trail-stage" });
    wrap.appendChild(stage);
    wrap._stats = stats;
    return wrap;
  }

  /** Rysuje szlak w kontenerze (po wstawieniu do DOM — potrzebna szerokość). */
  function drawTrail(stage, stats) {
    const vertical = stage.clientWidth < 480;
    const g = geometry(vertical);
    const cur = currentIndex(stats);
    stage.replaceChildren();
    stage.classList.toggle("is-vertical", vertical);
    stage.style.setProperty("--trail-ratio", g.w + " / " + g.h);
    if (vertical) stage.style.height = g.h + "px"; else stage.style.removeProperty("height");

    const svg = svgEl("svg", { class: "trail-svg", viewBox: "0 0 " + g.w + " " + g.h, "aria-hidden": "true", focusable: "false" });
    const defs = svgEl("defs");
    const grad = svgEl("linearGradient", { id: "trail-grad", gradientUnits: "userSpaceOnUse", x1: g.pts[0][0], y1: g.pts[0][1], x2: g.pts[5][0], y2: g.pts[5][1] });
    ["a1", "a2", "b1", "b2", "c1", "c2"].forEach(function (l, i) {
      const s = svgEl("stop", { offset: (i / 5).toFixed(2) });
      s.setAttribute("style", "stop-color: var(--lvl-" + l + ")");
      grad.appendChild(s);
    });
    defs.appendChild(grad);
    svg.appendChild(defs);
    const d = smoothPath(g.pts);
    const base = svgEl("path", { d: d, class: "trail-base", id: "trail-path" });
    const done = svgEl("path", { d: d, class: "trail-done", stroke: "url(#trail-grad)" });
    svg.appendChild(base);
    svg.appendChild(done);
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
      list.appendChild(el("li", {
        class: "trail-station lvl-" + s.id + (here ? " is-current" : "") + (s.percent >= 100 ? " is-done" : ""),
        style: vertical ? "left:" + pt[0] + "px;top:" + pt[1] + "px" : "left:" + (pt[0] / g.w * 100) + "%;top:" + (pt[1] / g.h * 100) + "%"
      }, el("a", {
        class: "trail-link",
        href: ELM.app.levelHash(s.id),
        "aria-label": "Poziom " + s.id + (name ? ", " + name : "") + ": " + s.percent + "% punktów „Umiem”" + (here ? " – tu jesteś" : "")
      }, [
        ELM.ui.progressRing(s.percent, { size: 56, stroke: 5, text: s.id }),
        el("span", { class: "trail-label", "aria-hidden": "true" }, [
          el("span", { class: "trail-name", text: name || s.id }),
          el("span", { class: "trail-pct num", text: s.percent + "%" }),
          here ? el("span", { class: "trail-here", text: "Tu jesteś" }) : null
        ])
      ])));
    });
    stage.appendChild(list);
    stage.appendChild(overlay);
    list.querySelectorAll(".ring").forEach(function (r) { r.setAttribute("aria-hidden", "true"); r.removeAttribute("role"); });

    // Stan końcowy bez animacji: ścieżka przebyta do bieżącej stacji, znacznik na stacji
    const total = base.getTotalLength();
    const reach = lengthAt(base, g.pts[cur]);
    const frac = total ? reach / total : 0;
    done.style.strokeDasharray = reach + " " + total;
    const end = base.getPointAtLength(reach);
    marker.setAttribute("transform", "translate(" + end.x + " " + end.y + ")");
    return { svg: svg, base: base, done: done, marker: marker, frac: frac, vertical: vertical };
  }

  // =====================================================================
  // WIDOK
  // =====================================================================

  function render() {
    const view = document.getElementById("view");
    const keepScroll = view.dataset.file === HASH ? U.getScroll() : 0;
    const stats = levelStats();
    const today = learn().today();
    const streak = learn().streak(pd().activityDays(), today);
    const due = pd().dueCount();
    const exam = examTile();
    const trail = trailTile(stats);

    view.className = "view tool-view today-view";
    view.dataset.file = HASH;
    view.replaceChildren(el("div", { class: "bento" + (exam ? " has-exam" : "") }, [
      heroTile(stats, streak, due),
      reviewsTile(due),
      testTip(),
      trail,
      streakTile(),
      exam,
      addTile(),
      continueTile()
    ]));
    document.title = "Dziś · English Levels Map";
    U.setScroll(keepScroll);

    const stage = trail.querySelector(".trail-stage");
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

  ELM.today = { HASH: HASH, parseRoute: parseRoute, render: render };
})(window.ELM);
