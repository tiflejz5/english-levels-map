/*
 * pisanie-wzorzec.js — widok wzorca z komentarzami (paczka v6, spec 17, sekcja 1.3):
 * #/pisanie/wzorce/<egzamin>/<id zadania>.
 *
 *   - komputer (≥ 1024 px): tekst w kolumnie ~65 znaków, komentarze w prawym marginesie na wysokości kotwic
 *     (przy kolizji przesuwają się w dół, cienka linia łączy je z kotwicą),
 *   - węższe ekrany: kotwica z numerem; dotknięcie rozwija komentarz pod akapitem, drugi raz zwija,
 *   - kolor typu nigdy nie jest jedynym nośnikiem: numer w kółku + ikona i nazwa typu w komentarzu,
 *   - filtry typów, „Ukryj komentarze”, legenda; pod tekstem „Dlaczego to działa” i tabela kryteriów,
 *   - klawiatura: Tab po kotwicach, Enter / spacja pokazuje komentarz, aria-describedby łączy kotwicę z komentarzem,
 *   - druk: komentarze jako numerowane przypisy pod tekstem (css/print.css),
 *   - zaznaczanie tekstu: menu Słowniczka (data-fc-selectable).
 * Tekstu `model` nie zmieniamy: kotwice to dokładne fragmenty (występują w nim raz, nie nakładają się).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const WIDE = "(min-width: 1024px)";

  function P() { return ELM.pisanie; }

  /** Kotwice w kolejności występowania: [{ start, end, type, note, criterion, element }]; błędne pomijamy z ostrzeżeniem. */
  function placeAnnotations(model, list) {
    const out = [];
    (list || []).forEach(function (a) {
      const anchor = String(a.anchor || "");
      const i = anchor ? model.indexOf(anchor) : -1;
      if (i === -1 || model.indexOf(anchor, i + 1) !== -1) { console.warn("Wzorzec: kotwica „" + anchor.slice(0, 40) + "…” nie występuje dokładnie raz"); return; }
      out.push({ start: i, end: i + anchor.length, type: a.type, note: a.note || "", criterion: a.criterion, element: a.element });
    });
    out.sort(function (x, y) { return x.start - y.start; });
    return out.filter(function (a, k) { return k === 0 || a.start >= out[k - 1].end; }).map(function (a, k) { a.n = k + 1; return a; });
  }

  function typeOf(a) { return P().TYPES[a.type] || P().TYPES.uwaga; }

  function render(view, route) {
    document.title = "Pisanie · English Levels Map";
    const back = ELM.ui.breadcrumbs([{ label: "Pisanie", href: P().HASH }, { label: "Wzorzec" }]);
    view.appendChild(back);
    const status = el("p", { class: "tool-note", role: "status", text: "Wczytuję wzorzec…" });
    view.appendChild(status);
    P().examList().then(function (rows) {
      if (!view.contains(status)) return;
      status.remove();
      const row = rows.find(function (r) { return r.exam.id === route.exam; });
      const task = row && row.tasks.find(function (t) { return t.id === route.task; });
      if (!task) {
        view.appendChild(P().head("Nie ma takiego wzorca", "Wybierz wzorzec z listy."));
        return;
      }
      build(view, row, task);
    });
  }

  function build(view, row, task) {
    const model = String(task.model);
    const notes = task.modelNotes || {};
    const anns = placeAnnotations(model, notes.annotations);
    const words = P().wordCount(row.exam.id, task);
    const T = row.T;
    document.title = (task.title || task.id) + " · Pisanie · English Levels Map";
    if (ELM.profileData && ELM.profileData.setLastPage) ELM.profileData.setLastPage(location.hash, "Wzorzec: " + (task.title || task.id));

    // ----- nagłówek
    view.appendChild(P().head(task.title || task.id, null));
    view.appendChild(el("p", { class: "wz-meta" }, [
      P().examChip(row.exam),
      el("span", { class: "chip", text: P().genreLabel(task.genre) }),
      el("span", { class: "tool-note", text: words + " " + P().plural(words, "słowo", "słowa", "słów") + (T.wordRange ? " · wymagane " + T.wordRange[0] + "–" + T.wordRange[1] : "") })
    ]));
    view.appendChild(el("details", { class: "wz-prompt" }, [
      el("summary", { text: "Polecenie" }),
      el("p", { class: "wz-prompt-text", lang: /^certyfikat-/.test(row.exam.id) ? "en" : null, text: task.prompt || "" })
    ]));

    // ----- stan filtrów
    const state = { hidden: false, off: {} };

    // ----- tekst i komentarze
    const layout = el("div", { class: "wz-layout" });
    const textCol = el("div", { class: "wz-text", lang: "en", "data-fc-selectable": "" });
    const margin = el("aside", { class: "wz-margin", "aria-label": "Komentarze do tekstu" });
    const lines = model.split("\n");
    let offset = 0, k = 0;
    const paras = [];
    lines.forEach(function (line) {
      const start = offset, end = offset + line.length;
      offset = end + 1;
      if (!line.trim()) return;
      const p = el("p", { class: "wz-p" });
      let pos = start;
      while (k < anns.length && anns[k].start < end) {
        const a = anns[k];
        if (a.start > pos) p.appendChild(document.createTextNode(model.slice(pos, a.start)));
        a.anchorEl = el("span", { class: "wz-anchor wz-t-" + a.type, id: "wz-a-" + a.n, role: "button", tabindex: "0", "aria-describedby": "wz-n-" + a.n, "aria-expanded": "false",
          "data-n": String(a.n) }, [document.createTextNode(model.slice(a.start, a.end)), el("sup", { class: "wz-num", "aria-hidden": "true", text: String(a.n) })]);
        a.para = p;
        p.appendChild(a.anchorEl);
        pos = a.end;
        k++;
      }
      if (pos < end) p.appendChild(document.createTextNode(model.slice(pos, end)));
      textCol.appendChild(p);
      paras.push(p);
    });
    const rubric = {};
    (T.rubric || []).forEach(function (r) { rubric[r.id] = r; });
    anns.forEach(function (a) {
      const t = typeOf(a);
      a.noteEl = el("div", { class: "wz-note wz-t-" + a.type, id: "wz-n-" + a.n, role: "note" }, [
        el("p", { class: "wz-note-head" }, [
          el("span", { class: "wz-badge", "aria-hidden": "true", text: String(a.n) }),
          el("span", { class: "wz-note-icon", "aria-hidden": "true" }, ELM.icon(t.icon, { size: 16 })),
          el("strong", { class: "wz-note-type", text: t.label }),
          a.criterion && rubric[a.criterion] ? el("span", { class: "wz-note-crit", text: rubric[a.criterion].label }) : null,
          a.element ? el("span", { class: "wz-note-crit", text: "Element " + a.element }) : null
        ]),
        el("p", { class: "wz-note-text", lang: "pl", text: a.note })
      ]);
    });
    layout.appendChild(textCol);
    layout.appendChild(margin);
    const lines_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    lines_svg.setAttribute("class", "wz-lines");
    lines_svg.setAttribute("aria-hidden", "true");
    layout.appendChild(lines_svg);

    // ----- pasek filtrów
    const counts = {};
    anns.forEach(function (a) { counts[a.type] = (counts[a.type] || 0) + 1; });
    const typeButtons = P().TYPE_ORDER.filter(function (t) { return counts[t]; }).map(function (t) {
      const def = P().TYPES[t];
      const b = el("button", { type: "button", class: "wz-filter wz-t-" + t, "aria-pressed": "true", title: def.help, onclick: function () {
        state.off[t] = !state.off[t];
        b.setAttribute("aria-pressed", state.off[t] ? "false" : "true");
        apply();
      } }, [el("span", { class: "wz-note-icon", "aria-hidden": "true" }, ELM.icon(def.icon, { size: 16 })), " " + def.label + " ", el("span", { class: "wz-count num", text: String(counts[t]) })]);
      return b;
    });
    const hideBtn = el("button", { type: "button", class: "btn btn-secondary btn-small wz-hide", "aria-pressed": "false", onclick: function () {
      state.hidden = !state.hidden;
      hideBtn.setAttribute("aria-pressed", state.hidden ? "true" : "false");
      hideBtn.textContent = state.hidden ? "Pokaż komentarze" : "Ukryj komentarze";
      apply();
    } }, "Ukryj komentarze");
    view.appendChild(el("div", { class: "wz-toolbar", role: "group", "aria-label": "Filtry komentarzy" }, [el("div", { class: "wz-filters" }, typeButtons), hideBtn]));
    view.appendChild(el("details", { class: "wz-legend" }, [
      el("summary", { text: "Legenda" }),
      el("dl", null, P().TYPE_ORDER.filter(function (t) { return counts[t]; }).map(function (t) {
        const def = P().TYPES[t];
        return el("div", { class: "wz-legend-row" }, [el("dt", null, [el("span", { class: "wz-note-icon", "aria-hidden": "true" }, ELM.icon(def.icon, { size: 16 })), " " + def.label]), el("dd", { text: def.help })]);
      })),
      el("p", { class: "tool-note", text: "Numer przy fragmencie tekstu odpowiada numerowi komentarza. Kolor to tylko dodatek – typ komentarza podaje też ikona i nazwa." })
    ]));
    view.appendChild(layout);

    // ----- przypisy do druku
    view.appendChild(el("section", { class: "wz-footnotes", "aria-hidden": "true" }, [
      el("h2", { text: "Komentarze" }),
      el("ol", null, anns.map(function (a) { return el("li", { value: String(a.n) }, [el("strong", { text: typeOf(a).label + ": " }), a.note]); }))
    ]));

    // ----- „Dlaczego to działa” i kryteria
    if ((notes.summary || []).length) {
      view.appendChild(el("section", { class: "card wz-why", "aria-labelledby": "wz-why-t" }, [
        el("h2", { class: "section-title", id: "wz-why-t", text: "Dlaczego to działa" }),
        el("ul", { lang: "pl" }, notes.summary.map(function (s) { return el("li", { text: s }); }))
      ]));
    }
    if ((T.rubric || []).length) {
      view.appendChild(el("section", { class: "card wz-crit", "aria-labelledby": "wz-crit-t" }, [
        el("h2", { class: "section-title", id: "wz-crit-t", text: "Kryteria oceny i liczba komentarzy" }),
        el("div", { class: "md-table-wrap" }, el("table", null, [
          el("thead", null, el("tr", null, [el("th", { text: "Kryterium" }), el("th", { text: "Punkty" }), el("th", { text: "Komentarze" })])),
          el("tbody", null, T.rubric.map(function (r) {
            const n = anns.filter(function (a) { return a.criterion === r.id; }).length;
            return el("tr", null, [el("td", { text: r.label }), el("td", { class: "num", text: String(r.max) }), el("td", { class: "num", text: String(n) })]);
          }))
        ]))
      ]));
    }

    // ----- układ: margines (komputer) albo akordeon pod akapitem (węższe ekrany)
    const mq = window.matchMedia ? window.matchMedia(WIDE) : { matches: false };
    let expanded = null; // numer rozwiniętego komentarza (tryb wąski)
    let active = null;   // numer wyróżnionego komentarza (tryb szeroki)

    function visible(a) { return !state.hidden && !state.off[a.type]; }

    function drawLines(items) {
      while (lines_svg.firstChild) lines_svg.removeChild(lines_svg.firstChild);
      const lr = layout.getBoundingClientRect();
      lines_svg.setAttribute("width", String(lr.width));
      lines_svg.setAttribute("height", String(lr.height));
      const colRight = textCol.getBoundingClientRect().right - lr.left;
      const mLeft = margin.getBoundingClientRect().left - lr.left;
      items.forEach(function (it) {
        const ar = it.a.anchorEl.getBoundingClientRect();
        const ay = ar.top + ar.height / 2 - lr.top;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M" + Math.min(colRight, ar.right - lr.left) + " " + ay + " H" + colRight + " L" + (mLeft) + " " + (it.top + 16));
        path.setAttribute("class", "wz-line wz-t-" + it.a.type + (active === it.a.n ? " is-active" : ""));
        lines_svg.appendChild(path);
      });
    }

    function place() {
      const wide = mq.matches;
      layout.classList.toggle("is-wide", wide);
      anns.forEach(function (a) {
        const show = visible(a);
        a.anchorEl.classList.toggle("is-off", !show);
        a.anchorEl.setAttribute("tabindex", show ? "0" : "-1");
        a.anchorEl.setAttribute("role", show ? "button" : "presentation");
        a.anchorEl.toggleAttribute("aria-describedby", false);
        if (show) a.anchorEl.setAttribute("aria-describedby", "wz-n-" + a.n);
        a.noteEl.hidden = !show || (!wide && expanded !== a.n);
        a.anchorEl.setAttribute("aria-expanded", wide ? "true" : (expanded === a.n && show ? "true" : "false"));
        a.noteEl.classList.toggle("is-active", wide && active === a.n);
        a.anchorEl.classList.toggle("is-active", (wide ? active : expanded) === a.n && show);
      });
      if (wide) {
        anns.forEach(function (a) { margin.appendChild(a.noteEl); });
        const lr = layout.getBoundingClientRect();
        let bottom = 0;
        const items = [];
        anns.filter(visible).forEach(function (a) {
          const ar = a.anchorEl.getBoundingClientRect();
          let top = ar.top - lr.top;
          if (top < bottom + 8) top = bottom + 8;
          a.noteEl.style.top = top + "px";
          bottom = top + a.noteEl.offsetHeight;
          items.push({ a: a, top: top });
        });
        margin.style.minHeight = bottom + "px";
        drawLines(items);
      } else {
        // pod akapitem, w kolejności kotwic
        const lastIn = new Map();
        anns.forEach(function (a) {
          const prev = lastIn.get(a.para) || a.para;
          prev.after(a.noteEl);
          lastIn.set(a.para, a.noteEl);
          a.noteEl.style.top = "";
        });
        margin.style.minHeight = "";
        while (lines_svg.firstChild) lines_svg.removeChild(lines_svg.firstChild);
      }
    }
    function apply() { place(); }

    function activate(a) {
      if (mq.matches) {
        active = active === a.n ? null : a.n;
        place();
        if (active === a.n) {
          const r = a.noteEl.getBoundingClientRect();
          if (r.top < 0 || r.bottom > window.innerHeight) a.noteEl.scrollIntoView({ block: "center" });
        }
      } else {
        expanded = expanded === a.n ? null : a.n;
        place();
      }
    }

    anns.forEach(function (a) {
      a.anchorEl.addEventListener("click", function (ev) {
        const sel = window.getSelection && window.getSelection();
        if (sel && !sel.isCollapsed) return; // zaznaczanie tekstu (Słowniczek) nie przełącza komentarza
        ev.preventDefault();
        if (visible(a)) activate(a);
      });
      a.anchorEl.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); if (visible(a)) activate(a); }
        else if (ev.key === "Escape" && (expanded === a.n || active === a.n)) { expanded = null; active = null; place(); }
      });
      a.anchorEl.addEventListener("mouseenter", function () { if (mq.matches && visible(a)) { a.noteEl.classList.add("is-hover"); } });
      a.anchorEl.addEventListener("mouseleave", function () { a.noteEl.classList.remove("is-hover"); });
      a.noteEl.addEventListener("mouseenter", function () { a.anchorEl.classList.add("is-hover"); });
      a.noteEl.addEventListener("mouseleave", function () { a.anchorEl.classList.remove("is-hover"); });
    });

    place();
    if (mq.addEventListener) mq.addEventListener("change", place); else if (mq.addListener) mq.addListener(place);
    if (window.ResizeObserver) { const ro = new ResizeObserver(function () { place(); }); ro.observe(layout); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    window.addEventListener("beforeprint", function () { /* przypisy są w DOM; css/print.css ukrywa margines */ });
  }

  ELM.pisanieWzorzec = { render: render, placeAnnotations: placeAnnotations };
})(window.ELM);
