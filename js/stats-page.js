/*
 * stats-page.js — „Statystyki” (#/statystyki, spec 03, sekcja 3).
 *
 * Dane: dziennik podejść (elm_attempts_v1), wyniki zestawów, Dziennik błędów
 * i dni aktywności — wszystko z ELM.profileData; liczenie w js/learning-stats.js.
 *
 * Zasady (DESIGN.md 3.11 i skill dataviz):
 *   - przy < 5 próbach nie pokazujemy procentu jako oceny, tylko „za mało danych”;
 *   - bez porównań z innymi i rankingów;
 *   - słupki w kolorze poziomu + kod poziomu w etykiecie (kolor nigdy sam),
 *     tekst zawsze w kolorach tekstu, nie w kolorze danych;
 *   - wykresy mają opis tekstowy / tabelę (role="img" + <details> z tabelą).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const HASH = "#/statystyki";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const TYPE_LABEL = {
    "multiple-choice": "Wybór odpowiedzi", "reorder": "Ułóż zdanie", "find-error": "Znajdź błąd", "short-answer": "Krótka odpowiedź",
    "gap-fill": "Luki do wpisania", "match": "Dopasuj pary", "transformation": "Transformacje zdań", "translate": "Tłumaczenie zdań", "dictation": "Dyktando"
  };
  const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

  function pd() { return ELM.profileData; }
  function learn() { return ELM.learn; }
  function S() { return ELM.stats; }

  function parseRoute(hash) { return /^#\/statystyki\/?$/.test(hash || "") ? { kind: "stats" } : null; }

  function plural(n, one, few, many) { return ELM.c1 ? ELM.c1.plural(n, one, few, many) : many; }
  function tries(n) { return n + " " + plural(n, "próba", "próby", "prób"); }
  function pct(x) { return Math.round(x * 100) + "%"; }
  function topic(id) { return (ELM.exercises && ELM.exercises.topicInfo(id)) || null; }

  function svg(tag, attrs, children) {
    const n = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, String(attrs[k])); });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }

  function tile(title, id, body, extra) {
    return el("section", { class: "card st-tile" + (extra ? " " + extra : ""), "aria-labelledby": id }, [
      el("h2", { class: "tile-title", id: id, text: title })
    ].concat(body));
  }

  function emptyNote(text) { return el("p", { class: "st-empty", text: text }); }

  // ---------- 1. Podsumowanie (kafle liczb) ----------

  function summaryTile(rec, today) {
    const s = S().summary(rec, today);
    const month = today.slice(0, 7);
    const days = pd().activityDays().filter(function (d) { return d.slice(0, 7) === month; }).length;
    const stat = function (label, value, note) {
      return el("div", { class: "st-stat" }, [
        el("p", { class: "st-stat-label", text: label }),
        el("p", { class: "st-stat-value", text: value }),
        note ? el("p", { class: "st-stat-note", text: note }) : null
      ]);
    };
    return tile("Podsumowanie", "st-sum", [
      el("div", { class: "st-stats" }, [
        stat("Odpowiedzi w 7 dni", String(s.n7)),
        stat("Odpowiedzi w 30 dni", String(s.n30)),
        stat("Odpowiedzi łącznie", String(s.n)),
        stat("Trafność ogółem", s.acc === null ? "—" : pct(s.acc), s.acc === null ? "za mało danych" : null),
        stat("Trafność z 7 dni", s.acc7 === null ? "—" : pct(s.acc7), s.acc7 === null ? "za mało danych" : null),
        stat("Rozwiązane zestawy", String(pd().solvedSetCount())),
        stat("Dni nauki w tym miesiącu", String(days))
      ])
    ], "st-wide");
  }

  // ---------- Poziome paski (trafność) ----------

  /** Wiersz paska: etykieta (opcjonalnie link), tor 0–100% z wypełnieniem, wartość i liczba prób. */
  function barRow(o) {
    const enough = o.acc !== null;
    const label = o.href ? el("a", { class: "st-bar-label", href: o.href }, o.label) : el("span", { class: "st-bar-label" }, o.label);
    return el("li", { class: "st-bar-row" + (o.level ? " lvl-" + o.level : "") + (enough ? "" : " is-small") }, [
      el("div", { class: "st-bar-head" }, [
        o.level ? el("span", { class: "chip is-level lvl-" + o.level, text: o.level }) : null,
        label,
        el("span", { class: "st-bar-value" }, enough
          ? [el("strong", { class: "num", text: pct(o.acc) }), " · " + tries(o.n)]
          : "za mało danych · " + tries(o.n))
      ]),
      enough ? el("div", { class: "st-track", "aria-hidden": "true" }, el("div", { class: "st-fill", style: "width:" + Math.max(2, Math.round(o.acc * 100)) + "%" })) : null
    ]);
  }

  function topicsTile(rec) {
    const agg = S().aggregate(rec, "topic");
    const rows = S().ranked(rec, "topic");
    const small = Object.keys(agg).filter(function (k) { return agg[k].n < S().MIN_SAMPLE; }).length;
    return tile("Trafność wg tematu", "st-topics", [
      el("p", { class: "tool-note", text: "Od najsłabszych. Tylko tematy z co najmniej 5 próbami – kliknij temat, żeby do niego wrócić." }),
      rows.length ? el("ul", { class: "st-bars" }, rows.map(function (r) {
        const t = topic(r.key);
        return barRow({ label: t ? t.title : r.key, href: t ? t.href : null, level: t ? t.level : null, acc: r.acc, n: r.n });
      })) : emptyNote("Za mało danych. Rozwiąż co najmniej 5 zadań z jednego tematu."),
      small ? el("p", { class: "st-small-note", text: "Tematy z mniej niż 5 próbami: " + small + " – jeszcze za mało, żeby oceniać." }) : null
    ], "st-wide");
  }

  function typesLevelsTile(rec) {
    const byType = S().aggregate(rec, "type");
    const byLevel = S().aggregate(rec, "level");
    const row = function (g, extra) { return Object.assign({ acc: S().accuracy(g), n: g ? g.n : 0 }, extra); };
    const types = Object.keys(TYPE_LABEL).filter(function (t) { return byType[t]; });
    const levels = learn().LEVELS.filter(function (l) { return byLevel[l]; });
    return tile("Wg typu zadania i poziomu", "st-types", [
      el("h3", { class: "st-sub", text: "Typ zadania" }),
      types.length ? el("ul", { class: "st-bars" }, types.map(function (t) { return barRow(row(byType[t], { label: TYPE_LABEL[t] })); })) : emptyNote("Brak odpowiedzi."),
      el("h3", { class: "st-sub", text: "Poziom" }),
      levels.length ? el("ul", { class: "st-bars" }, levels.map(function (l) { return barRow(row(byLevel[l], { label: "Poziom " + l, level: l })); })) : emptyNote("Brak odpowiedzi.")
    ]);
  }

  function weakTile(rec) {
    const rows = S().ranked(rec, "topic").slice(0, 5);
    const weak = S().weakTopics(rec);
    return tile("Najsłabsze miejsca", "st-weak", [
      rows.length ? el("ol", { class: "st-weak-list" }, rows.map(function (r) {
        const t = topic(r.key);
        return el("li", { class: "st-weak-row" + (t ? " lvl-" + t.level : "") }, [
          el("div", { class: "st-weak-text" }, [
            t ? el("a", { href: t.href, text: t.title }) : el("span", { text: r.key }),
            el("span", { class: "st-weak-meta" }, [el("strong", { class: "num", text: pct(r.acc) }), " · " + tries(r.n)])
          ]),
          el("a", { class: "btn btn-secondary btn-small", href: "#/cwiczenia/slabe/" + r.key, "aria-label": "Ćwicz: " + (t ? t.title : r.key) }, ELM.ui.withIcon("dumbbell", "Ćwicz"))
        ]);
      })) : emptyNote("Na razie nie widzę słabych punktów. Zrób kilka zestawów, a podpowiem, nad czym popracować."),
      weak.length ? el("p", { class: "st-weak-cta" }, el("a", { class: "btn btn-primary", href: "#/cwiczenia/slabe" }, ELM.ui.withIcon("target", "Trening słabych punktów"))) : null
    ]);
  }

  // ---------- 5. Trend tygodniowy (kolumny + liczba prób) ----------

  function trendTile(rec, today) {
    const weeks = S().weekly(rec, today, 12);
    const any = weeks.some(function (w) { return w.n; });
    const W = 600, H = 210, top = 16, base = 160, left = 36, right = 590;
    const step = (right - left) / weeks.length;
    const bw = Math.min(24, step - 8);
    const yOf = function (v) { return base - v * (base - top); };
    const fmt = function (day) { return day.slice(8, 10) + "." + day.slice(5, 7); };
    const grid = [0, 0.5, 1].map(function (v) {
      return svg("g", { class: "st-grid" }, [
        svg("line", { x1: left, x2: right, y1: yOf(v), y2: yOf(v) }),
        svg("text", { x: left - 6, y: yOf(v) + 4, "text-anchor": "end", class: "st-axis" }, [Math.round(v * 100) + "%"])
      ]);
    });
    const cols = weeks.map(function (w, i) {
      const x = left + step * i + (step - bw) / 2;
      const label = "Tydzień od " + fmt(w.start) + ": " + (w.n ? (w.acc === null ? "za mało danych, " + tries(w.n) : pct(w.acc) + " trafnych, " + tries(w.n)) : "brak odpowiedzi");
      const g = svg("g", { class: "st-col" + (w.acc === null ? " is-small" : ""), tabindex: w.n ? "0" : null, role: w.n ? "img" : null, "aria-label": w.n ? label : null }, [
        svg("title", null, [label]),
        svg("rect", { x: x - 4, y: top, width: bw + 8, height: base - top, class: "st-hit" })
      ]);
      if (w.n) {
        const v = w.acc === null ? w.ok / w.n : w.acc;
        const h = Math.max(4, base - yOf(v));
        // 4 px zaokrąglenie tylko na górnym końcu (kwadrat przy osi)
        g.appendChild(svg("path", { class: "st-bar", d: "M" + x + " " + base + "V" + (base - h + 4) + "Q" + x + " " + (base - h) + " " + (x + 4) + " " + (base - h) + "H" + (x + bw - 4) + "Q" + (x + bw) + " " + (base - h) + " " + (x + bw) + " " + (base - h + 4) + "V" + base + "Z" }));
      }
      g.appendChild(svg("text", { x: x + bw / 2, y: base + 16, "text-anchor": "middle", class: "st-axis" }, [fmt(w.start)]));
      g.appendChild(svg("text", { x: x + bw / 2, y: base + 32, "text-anchor": "middle", class: "st-axis st-n" }, [w.n ? "n=" + w.n : ""]));
      return g;
    });
    const chart = svg("svg", { class: "st-chart", viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": "Trafność tygodniowa z ostatnich 12 tygodni" },
      grid.concat([svg("line", { x1: left, x2: right, y1: base, y2: base, class: "st-baseline" })]).concat(cols));
    const table = el("details", { class: "st-table" }, [
      el("summary", null, "Pokaż jako tabelę"),
      el("div", { class: "md-table" }, el("div", { class: "md-table-wrap" }, el("table", null, [
        el("thead", null, el("tr", null, [el("th", { text: "Tydzień od" }), el("th", { text: "Próby" }), el("th", { text: "Trafność" })])),
        el("tbody", null, weeks.map(function (w) {
          return el("tr", null, [el("td", { text: fmt(w.start) }), el("td", { class: "num", text: String(w.n) }), el("td", { text: w.n ? (w.acc === null ? "za mało danych" : pct(w.acc)) : "—" })]);
        }))
      ])))
    ]);
    return tile("Trend z 12 tygodni", "st-trend", any ? [
      el("p", { class: "tool-note", text: "Trafność w kolejnych tygodniach. Pod kolumną liczba prób (n) – jaśniejsza kolumna to mniej niż 5 prób, więc wynik jest tylko orientacyjny." }),
      el("div", { class: "st-chart-wrap" }, chart),
      table
    ] : [emptyNote("Brak odpowiedzi w ostatnich 12 tygodniach.")], "st-wide");
  }

  // ---------- 6. Aktywność (mapa cieplna) ----------

  function activityTile(today) {
    const days = pd().activityDays();
    const grid = S().activityGrid(days, today, 12);
    const active = grid.reduce(function (s, col) { return s + col.filter(function (c) { return c.active; }).length; }, 0);
    const st = learn().streak(days, today);
    const streak = st.current;
    const cells = el("div", { class: "st-heat", role: "img", "aria-label": "Mapa aktywności z 12 tygodni: dni nauki " + active + " z " + (12 * 7) + "." });
    WEEKDAYS.forEach(function (d, r) {
      cells.appendChild(el("span", { class: "st-heat-day", style: "grid-row:" + (r + 1), "aria-hidden": "true", text: r % 2 === 0 ? d : "" }));
    });
    grid.forEach(function (col, c) {
      col.forEach(function (cell, r) {
        const label = cell.day.slice(8, 10) + "." + cell.day.slice(5, 7) + (cell.future ? "" : cell.active ? " – dzień nauki" : " – bez nauki");
        cells.appendChild(el("span", {
          class: "st-cell" + (cell.active ? " is-on" : "") + (cell.future ? " is-future" : "") + (cell.day === today ? " is-today" : ""),
          style: "grid-row:" + (r + 1) + ";grid-column:" + (c + 2), title: label, "aria-hidden": "true"
        }));
      });
    });
    return tile("Aktywność", "st-activity", [
      el("p", { class: "st-activity-sum" }, [
        el("strong", { class: "num", text: String(active) }), " " + plural(active, "dzień", "dni", "dni") + " nauki w ostatnich 12 tygodniach",
        streak ? " · seria: " + streak + " " + plural(streak, "dzień", "dni", "dni") : "",
        st.longest > 1 ? " · najdłuższa: " + st.longest + " " + plural(st.longest, "dzień", "dni", "dni") : ""
      ]),
      el("div", { class: "st-heat-wrap" }, cells),
      el("p", { class: "st-legend", "aria-hidden": "true" }, [
        el("span", { class: "st-cell is-on" }), " dzień nauki ", el("span", { class: "st-cell" }), " bez nauki"
      ])
    ]);
  }

  // ---------- 7. Dziennik błędów ----------

  function journalTile(today) {
    const all = pd().entries();
    const active = all.filter(function (e) { return !e.review.mastered; });
    const due = all.filter(function (e) { return learn().isDue(e.review, today); }).length;
    const mastered = all.length - active.length;
    const count = function (key) {
      const m = {};
      active.forEach(function (e) { const k = e[key]; if (k) m[k] = (m[k] || 0) + 1; });
      return Object.keys(m).map(function (k) { return { k: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 3);
    };
    const cats = count("category"), topics = count("itemId");
    const stat = function (label, n, href) {
      return el("div", { class: "st-stat" }, [el("p", { class: "st-stat-label", text: label }), href && n ? el("a", { class: "st-stat-value", href: href, text: String(n) }) : el("p", { class: "st-stat-value", text: String(n) })]);
    };
    return tile("Dziennik błędów", "st-journal", all.length ? [
      el("div", { class: "st-stats is-three" }, [stat("Aktywne", active.length), stat("Do powtórki dziś", due, "#/bledy/powtorki"), stat("Opanowane", mastered)]),
      cats.length ? el("p", { class: "st-tops" }, [el("span", { class: "review-label", text: "Najczęstsze kategorie: " }), cats.map(function (c) { return c.k + " (" + c.n + ")"; }).join(", ")]) : null,
      topics.length ? el("p", { class: "st-tops" }, [el("span", { class: "review-label", text: "Najczęstsze tematy: " })].concat(topics.map(function (t, i) {
        const info = topic(t.k);
        return [i ? ", " : "", info ? el("a", { href: info.href, text: info.title }) : t.k, " (" + t.n + ")"];
      }))) : null,
      el("p", null, el("a", { class: "btn btn-secondary btn-small", href: "#/bledy" }, "Otwórz dziennik"))
    ] : [emptyNote("Dziennik jest pusty. Błędy z zadań trafiają tu same – możesz to wyłączyć w menu profilu.")]);
  }

  // =====================================================================

  function render() {
    const view = document.getElementById("view");
    const today = learn().today();
    const rec = pd().attempts();
    view.className = "view tool-view st-view";
    view.dataset.file = HASH;
    view.replaceChildren();
    document.title = "Statystyki · English Levels Map";
    const hasData = rec.items.length || Object.keys(rec.aggregates).length;
    view.appendChild(el("header", { class: "tool-head" }, [
      el("h1", { class: "tool-title" }, [el("span", { class: "lab-head-icon", "aria-hidden": "true" }, ELM.icon("chart-column", { size: 28 })), "Statystyki"]),
      el("p", { class: "tool-lead", text: "Twoje odpowiedzi w zadaniach, trafność i aktywność. Liczymy tylko Twoje dane – bez porównań z innymi." })
    ]));
    if (!hasData) {
      view.appendChild(el("div", { class: "card st-hero-empty" }, [
        el("span", { class: "hub-soon-icon", "aria-hidden": "true" }, ELM.icon("chart-column", { size: 22 })),
        el("div", null, [
          el("p", { class: "st-hero-title", text: "Tu pojawią się Twoje statystyki" }),
          el("p", { class: "tool-note", text: "Rozwiąż pierwszy zestaw zadań – każda odpowiedź się liczy. Po kilku zestawach zobaczysz, które tematy idą Ci najlepiej, a które warto powtórzyć." }),
          el("p", null, el("a", { class: "btn btn-primary", href: "#/cwiczenia" }, ELM.ui.withIcon("dumbbell", "Przejdź do ćwiczeń")))
        ])
      ]));
    }
    const grid = el("div", { class: "st-grid-layout" });
    if (hasData) {
      grid.appendChild(summaryTile(rec, today));
      grid.appendChild(topicsTile(rec));
      grid.appendChild(typesLevelsTile(rec));
      grid.appendChild(weakTile(rec));
      grid.appendChild(trendTile(rec, today));
    }
    grid.appendChild(activityTile(today));
    grid.appendChild(journalTile(today));
    if (ELM.fiszki) { const f = ELM.fiszki.statsTile(); if (f) grid.appendChild(f); } // sekcja „Fiszki” (spec 10, 5.5)
    view.appendChild(grid);
    U.setScroll(0);
  }

  ELM.statsPage = { HASH: HASH, parseRoute: parseRoute, render: render };
})(window.ELM);
