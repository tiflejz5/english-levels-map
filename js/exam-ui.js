/*
 * exam-ui.js — wspólne elementy egzaminów (paczka v7, spec 19 sekcja B):
 *   ELM.examMy            „Moje egzaminy” per profil: list(), isMine(id), info(id), pin(id), unpin(id)
 *   ELM.examDate.card     jedna karta daty egzaminu (C1 i egzaminy z rejestru)
 *   ELM.examCover         okładki: full (strona startowa), compact (podstrony), mini (kafel: główna, Dziś)
 * Czysta logika (myExams, formatDatePl, daysBetween) jest w js/exam-logic.js i ma testy.
 * Data C1 leży w elm_c1_v1 (js/c1-core.js), pozostałych egzaminów w elm_exams_v1 (js/profile-data.js).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  function L() { return ELM.examLogic; }
  function pd() { return ELM.profileData; }
  function registry() { return ELM.EXAM_REGISTRY || { exams: [] }; }
  function byId(id) { return registry().exams.find(function (e) { return e.id === id; }) || null; }
  function plural(n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10, t = n % 100;
    return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
  }
  function c1store() { return ELM.c1 ? ELM.c1.store.data() : { examDate: "", best: {} }; }

  // =====================================================================
  // DATA I STAN EGZAMINU
  // =====================================================================

  function getDate(e) {
    if (e.existing) return c1store().examDate || "";
    return pd() ? pd().examData(e.id).examDate : "";
  }

  function setDate(e, value) {
    if (e.existing) {
      c1store().examDate = value || "";
      ELM.c1.store.save();
    } else if (pd()) {
      pd().examData(e.id).examDate = value || "";
      pd().saveExams();
    }
  }

  function examsRecord() {
    const rec = { exams: {}, my: pd() ? pd().examMy() : {} };
    registry().exams.forEach(function (e) { if (!e.existing && pd()) rec.exams[e.id] = { examDate: pd().examData(e.id).examDate }; });
    return rec;
  }

  function state() {
    return L().examMyState({
      registry: registry(),
      examsRecord: examsRecord(),
      c1: c1store(),
      isSetDone: function (id) { return !!(pd() && pd().setScore(id)); }
    });
  }

  /** Moje egzaminy: [{ id, reason, days }] (czysta logika w exam-logic.js). */
  function list() { return L().myExams(state(), registry()); }

  function isMine(id) { return list().some(function (x) { return x.id === id; }); }

  /** { date, days, done, total } dla okładek i panelu. */
  function info(id) {
    const e = byId(id);
    const st = state();
    const date = e ? getDate(e) : "";
    return { date: date, days: date ? L().daysBetween(date) : null, done: st.doneSets[id] || 0, total: st.totalSets[id] || 0 };
  }

  function pin(id) { if (pd() && pd().setExamMy(id, "pinned")) changed(); }
  function unpin(id) { if (pd() && pd().setExamMy(id, "hidden")) changed(); }

  // =====================================================================
  // TEKSTY ODLICZANIA
  // =====================================================================

  /** Tekst stanu bez dużej liczby: „Egzamin jutro”, „Egzamin był 3 dni temu”, „Ustaw datę…”. */
  function stateText(days) {
    if (days === null) return "Ustaw datę, żeby widzieć odliczanie";
    if (days === 1) return "Egzamin jutro";
    if (days === 0) return "Egzamin dziś";
    if (days < 0) return "Egzamin był " + (-days) + " " + plural(-days, "dzień", "dni", "dni") + " temu";
    return days + " " + plural(days, "dzień", "dni", "dni") + " do egzaminu";
  }

  /** Krótko do kafli i panelu: „188 dni do egzaminu” albo null, gdy nie ma daty. */
  function shortCountdown(days) { return days === null ? null : stateText(days); }

  // =====================================================================
  // ODŚWIEŻANIE PO ZMIANIE (data, przypięcie): okładki, przyciski i panel
  // =====================================================================

  function changed() {
    document.querySelectorAll("[data-exam-cover]").forEach(function (node) {
      const e = byId(node.getAttribute("data-exam-cover"));
      if (e) node.replaceWith(cover(e, node.getAttribute("data-variant")));
    });
    document.querySelectorAll("[data-exam-pin]").forEach(function (node) {
      const e = byId(node.getAttribute("data-exam-pin"));
      if (e) node.replaceWith(pinButton(e));
    });
    if (ELM.exams) ELM.exams.renderNav();
    if (ELM.c1) ELM.c1.renderNav();
  }

  // =====================================================================
  // KARTA DATY (B2)
  // =====================================================================

  /**
   * ELM.examDate.card({ examId, getDate, setDate, suggested, hint }): lewo duża liczba dni albo tekst stanu,
   * prawo pole daty z polskim zapisem i akcjami „Wstaw termin główny” / „Usuń datę”.
   */
  function dateCard(o) {
    const inputId = "exam-date-" + o.examId;
    const number = el("span", { class: "exam-date-number num" });
    const text = el("span", { class: "exam-date-text" });
    const pretty = el("p", { class: "exam-date-pretty", id: inputId + "-pretty" });
    const actions = el("div", { class: "exam-date-actions" });
    const input = el("input", {
      type: "date", id: inputId, class: "field exam-date-input", value: o.getDate(),
      "aria-describedby": inputId + "-pretty",
      onchange: function () { save(input.value); }
    });

    function save(value) {
      o.setDate(value || "");
      input.value = value || "";
      update();
      changed();
    }

    function update() {
      const date = o.getDate();
      const days = date ? L().daysBetween(date) : null;
      const big = days !== null && days > 1;
      number.textContent = big ? String(days) : "";
      number.hidden = !big;
      text.textContent = big ? plural(days, "dzień do egzaminu", "dni do egzaminu", "dni do egzaminu") : stateText(days);
      pretty.textContent = date ? L().formatDatePl(date) : "";
      pretty.hidden = !date;
      actions.replaceChildren();
      if (o.suggested && date !== o.suggested) {
        actions.appendChild(el("button", { type: "button", class: "btn btn-link btn-small", onclick: function () { save(o.suggested); } },
          "Wstaw termin główny: " + L().formatDatePl(o.suggested).replace(/^[^,]+, /, "")));
      }
      if (date) actions.appendChild(el("button", { type: "button", class: "btn btn-link btn-small", onclick: function () { save(""); } }, "Usuń datę"));
    }
    update();
    return el("section", { class: "card exam-date-card", "aria-label": "Odliczanie do egzaminu" }, [
      el("div", { class: "exam-date-main", "aria-live": "polite" }, [number, text]),
      el("div", { class: "exam-date-side" }, [
        el("label", { class: "field-label", for: inputId, text: "Data egzaminu" }),
        input,
        pretty,
        actions,
        o.hint ? el("p", { class: "exam-date-hint" }, o.hint) : null
      ])
    ]);
  }

  /** Karta daty dla egzaminu z rejestru: C1 i bez stałego terminu (B2) dostają podpowiedź o centrum. */
  function dateCardFor(e) {
    return dateCard({
      examId: e.id,
      getDate: function () { return getDate(e); },
      setDate: function (v) { setDate(e, v); },
      suggested: e.suggestedDate || null,
      hint: e.suggestedDate ? null : "Termin zależy od centrum egzaminacyjnego."
    });
  }

  // =====================================================================
  // OKŁADKI (B3)
  // =====================================================================

  /** Kolory egzaminu jako zmienne CSS; C1 nie ma kolorów w rejestrze, więc bierze granat i złoto z tokenów. */
  function colorStyle(e) {
    return e.existing
      ? "--exam-accent:var(--c1-navy);--exam-accent-2:var(--c1-gold)"
      : "--exam-accent:" + (e.accent || "var(--accent)") + ";--exam-accent-2:" + (e.accent2 || e.accent || "var(--accent)");
  }

  function href(e) { return "#" + e.route; }

  /** Pełna szerokość: kod, nazwa, poziom i instytucja; po prawej data albo „Ustaw datę”. */
  function coverFull(e) {
    const i = info(e.id);
    let side;
    if (i.days === null) {
      side = el("button", {
        type: "button", class: "btn btn-link exam-cover-setdate",
        onclick: function () {
          const input = document.getElementById("exam-date-" + e.id);
          if (input) { input.scrollIntoView({ block: "center" }); input.focus(); }
        }
      }, "Ustaw datę");
    } else {
      side = el("p", { class: "exam-cover-date" }, [
        el("span", { class: "exam-cover-date-day", text: L().formatDatePl(i.date).replace(/^[^,]+, /, "") }),
        el("span", { class: "exam-cover-date-left", text: stateText(i.days) })
      ]);
    }
    return el("header", { class: "exam-cover is-full", "data-exam-cover": e.id, "data-variant": "full", style: colorStyle(e) }, [
      el("span", { class: "exam-cover-bar", "aria-hidden": "true" }),
      el("span", { class: "exam-cover-code", "aria-hidden": "true", text: e.code }),
      el("div", { class: "exam-cover-text" }, [
        el("h1", { class: "exam-cover-title", text: e.label }),
        e.subtitle ? el("p", { class: "exam-cover-sub", text: e.subtitle }) : null
      ]),
      el("div", { class: "exam-cover-side" }, side)
    ]);
  }

  /** Kompaktowa na podstronach: pasek 6 px, kod 28 px, nazwa i odliczanie (link do strony startowej). */
  function coverCompact(e) {
    const i = info(e.id);
    return el("header", { class: "exam-cover is-compact", "data-exam-cover": e.id, "data-variant": "compact", style: colorStyle(e) }, [
      el("span", { class: "exam-cover-bar", "aria-hidden": "true" }),
      el("a", { class: "exam-cover-home", href: href(e) }, [
        el("span", { class: "exam-cover-code", "aria-hidden": "true", text: e.code }),
        el("span", { class: "exam-cover-title", text: e.label }),
        el("span", { class: "visually-hidden", text: " – przegląd egzaminu" })
      ]),
      el("a", { class: "exam-cover-count" + (i.days === null ? " is-unset" : ""), href: href(e) },
        i.days === null ? "Ustaw datę" : shortCountdown(i.days))
    ]);
  }

  /** Mini: kafel „Moich egzaminów” (strona główna, Dziś). */
  function coverMini(e) {
    const i = info(e.id);
    const progress = i.total ? "zestawy " + i.done + "/" + i.total : null;
    return el("a", { class: "card exam-cover is-mini", href: href(e), "data-exam-cover": e.id, "data-variant": "mini", style: colorStyle(e) }, [
      el("span", { class: "exam-cover-bar", "aria-hidden": "true" }),
      el("span", { class: "exam-cover-code", "aria-hidden": "true", text: e.code }),
      el("span", { class: "exam-cover-body" }, [
        el("span", { class: "exam-cover-title", text: e.label }),
        el("span", { class: "exam-cover-count" + (i.days === null ? " is-unset" : ""), text: i.days === null ? "Ustaw datę" : shortCountdown(i.days) }),
        progress ? el("span", { class: "exam-cover-progress", text: progress }) : null
      ]),
      el("span", { class: "exam-cover-chev", "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 20 }))
    ]);
  }

  function cover(e, variant) {
    return variant === "compact" ? coverCompact(e) : variant === "mini" ? coverMini(e) : coverFull(e);
  }

  // =====================================================================
  // PRZYPINANIE (B1) I KAFLE
  // =====================================================================

  /** „Przypnij do Dziś” / „Odepnij z Dziś i strony głównej” — stan wynika z myExams. */
  function pinButton(e) {
    const mine = isMine(e.id);
    return el("p", { class: "exam-pin", "data-exam-pin": e.id }, el("button", {
      type: "button", class: "btn btn-secondary",
      "aria-pressed": mine ? "true" : "false",
      onclick: function () { if (mine) unpin(e.id); else pin(e.id); }
    }, ELM.ui.withIcon(mine ? "pin-off" : "pin", mine ? "Odepnij z Dziś i strony głównej" : "Przypnij do Dziś")));
  }

  /** Sekcja „Twoje egzaminy” na stronie głównej (albo jedna linijka, gdy nic nie jest moje). */
  function homeSection() {
    const mine = list();
    const section = el("section", { class: "home-exams", "aria-labelledby": "home-exams-title" }, [
      el("h2", { id: "home-exams-title", class: "home-exams-title", text: "Twoje egzaminy" })
    ]);
    if (!mine.length) {
      section.appendChild(el("p", { class: "tool-note", text: "Przygotowujesz się do egzaminu? Wybierz go w grupie Egzaminy w panelu." }));
      return section;
    }
    section.appendChild(el("div", { class: "home-exams-grid" }, mine.map(function (m) { return coverMini(byId(m.id)); })));
    return section;
  }

  /** Kafle na Dziś: maks. 2 moje egzaminy, najbliższa data pierwsza. */
  function todayTiles() {
    return list().slice(0, 2).map(function (m) {
      const tile = coverMini(byId(m.id));
      tile.classList.add("bento-tile", "bento-exam");
      return tile;
    });
  }

  /** Podpis w panelu: odliczanie tylko dla moich egzaminów, dla pozostałych poziom i instytucja. */
  function navSub(e) {
    const i = info(e.id);
    return isMine(e.id) && i.days !== null && i.days > 0 ? stateText(i.days) : (e.subtitle || "");
  }

  ELM.examMy = { navSub: navSub, list: list, isMine: isMine, info: info, pin: pin, unpin: unpin, getDate: getDate, setDate: setDate, byId: byId };
  ELM.examDate = { card: dateCard, cardFor: dateCardFor, stateText: stateText };
  ELM.examCover = { full: coverFull, compact: coverCompact, mini: coverMini, pinButton: pinButton, homeSection: homeSection, todayTiles: todayTiles, changed: changed, shortCountdown: shortCountdown };
})(window.ELM);
