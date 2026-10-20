/*
 * notes.js — własne notatki (spec 04, część B).
 *
 *   ELM.notes.button(key, { title, route })   przycisk „Notatki” (z kropką, gdy notatka istnieje);
 *                                              panel otwiera się dopiero po kliknięciu
 *   #/notatki                                 „Moje notatki”: lista, szukanie, usuwanie
 *
 * Klucze stron: id punktu niezbędnika („a2-czasy-past-simple”), „c1:<strona>”,
 * „lab:<czas>”, „set:<zestaw>”. Dane: ELM.profileData (elm_notes_v1, per profil):
 * zwykły tekst, maks. 10 000 znaków, pusta treść = usunięcie.
 * Zapis automatyczny po 500 ms bezczynności, przy zamknięciu panelu i przy zmianie strony.
 * Panel: z boku na szerokim ekranie, dolna szuflada na wąskim. Esc zamyka (z zapisem).
 * Treść trafia do strony wyłącznie jako tekst (textarea.value / textContent).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const HASH = "#/notatki";
  const DEBOUNCE = 500;

  function pd() { return ELM.profileData; }
  function max() { return pd().NOTE_MAX; }

  let panel = null, area = null, statusEl = null, countEl = null, titleEl = null;
  let current = null;       // { key, title, route, button }
  let timer = null;
  let dirty = false;

  // =====================================================================
  // PRZYCISK
  // =====================================================================

  function button(key, meta) {
    const has = !!pd().getNote(key);
    const b = el("button", {
      type: "button", class: "btn btn-secondary btn-small notes-btn" + (has ? " has-note" : ""),
      "aria-expanded": "false", "aria-controls": "notes-panel",
      "aria-label": has ? "Notatki – ta strona ma notatkę" : "Notatki",
      "data-note-key": key,
      onclick: function () {
        if (current && current.key === key && panel && !panel.hidden) close(true);
        else open(key, meta, b);
      }
    }, [
      ELM.icon("notebook", { size: 16 }),
      el("span", { text: "Notatki" }),
      el("span", { class: "notes-dot", "aria-hidden": "true" })
    ]);
    return b;
  }

  function refreshButton(b, has) {
    if (!b) return;
    b.classList.toggle("has-note", has);
    b.setAttribute("aria-label", has ? "Notatki – ta strona ma notatkę" : "Notatki");
  }

  // =====================================================================
  // PANEL
  // =====================================================================

  function build() {
    titleEl = el("p", { class: "notes-page", id: "notes-page" });
    area = el("textarea", {
      class: "field notes-area", id: "notes-area", rows: "10", maxlength: String(max()),
      "aria-labelledby": "notes-title notes-page", "aria-describedby": "notes-status",
      placeholder: "Twoje notatki do tej strony – tylko dla Ciebie, zapisują się same.",
      oninput: function () { dirty = true; setStatus("Zapisywanie…"); updateCount(); clearTimeout(timer); timer = setTimeout(flush, DEBOUNCE); }
    });
    statusEl = el("span", { class: "notes-status", id: "notes-status", role: "status", "aria-live": "polite" });
    countEl = el("span", { class: "notes-count", "aria-live": "polite" });
    panel = el("aside", { class: "notes-panel", id: "notes-panel", hidden: true, "aria-labelledby": "notes-title" }, [
      el("div", { class: "notes-head" }, [
        el("div", null, [el("h2", { class: "notes-title", id: "notes-title" }, [ELM.icon("notebook", { size: 18 }), " Notatki"]), titleEl]),
        el("button", { type: "button", class: "icon-btn notes-close", "aria-label": "Zamknij notatki", onclick: function () { close(true); } }, ELM.icon("x", { size: 18 }))
      ]),
      area,
      el("div", { class: "notes-foot" }, [statusEl, countEl, el("a", { class: "notes-all", href: HASH, onclick: function () { close(false); } }, "Wszystkie notatki")])
    ]);
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); close(true); } });
    document.body.appendChild(panel);
    // Zmiana strony: zapis i zamknięcie
    window.addEventListener("hashchange", function () { if (panel && !panel.hidden) close(false); });
    window.addEventListener("beforeunload", flush);
  }

  function open(key, meta, btn) {
    if (!panel) build();
    if (current && current.key !== key) flush();
    if (current && current.button) current.button.setAttribute("aria-expanded", "false");
    current = { key: key, title: meta && meta.title || "", route: meta && meta.route || location.hash, button: btn };
    const note = pd().getNote(key);
    area.value = note ? note.text : "";
    dirty = false;
    titleEl.textContent = current.title;
    setStatus(note ? "Zapisano" : "");
    updateCount();
    panel.hidden = false;
    document.body.classList.add("notes-open");
    if (btn) btn.setAttribute("aria-expanded", "true");
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  }

  function close(restore) {
    if (!panel || panel.hidden) return;
    flush();
    panel.hidden = true;
    document.body.classList.remove("notes-open");
    const b = current && current.button;
    if (b) b.setAttribute("aria-expanded", "false");
    if (restore !== false && b && document.contains(b)) b.focus();
  }

  /** Zapis bieżącej notatki (pusta treść usuwa wpis). */
  function flush() {
    clearTimeout(timer);
    if (!current || !dirty) return;
    dirty = false;
    const saved = pd().setNote(current.key, area.value, { title: current.title, route: current.route });
    refreshButton(current.button, !!saved);
    setStatus(saved ? "Zapisano" : "Pusta notatka – usunięta");
  }

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  /** Licznik znaków po przekroczeniu 80% limitu. */
  function updateCount() {
    const n = area.value.length;
    countEl.textContent = n >= max() * 0.8 ? n.toLocaleString("pl-PL") + " / " + max().toLocaleString("pl-PL") : "";
    countEl.classList.toggle("is-full", n >= max());
  }

  // =====================================================================
  // STRONA „MOJE NOTATKI”
  // =====================================================================

  const filter = { query: "" };

  function parseRoute(hash) { return /^#\/notatki\/?$/.test(hash || "") ? { kind: "notes" } : null; }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }) + ", " + d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  }

  function render() {
    const view = document.getElementById("view");
    view.className = "view tool-view notes-view";
    view.dataset.file = HASH;
    view.replaceChildren();
    document.title = "Moje notatki · English Levels Map";
    view.appendChild(el("header", { class: "tool-head" }, [
      el("h1", { class: "tool-title" }, [el("span", { class: "lab-head-icon", "aria-hidden": "true" }, ELM.icon("notebook", { size: 28 })), "Moje notatki"]),
      el("p", { class: "tool-lead", text: "Notatki z podstron, egzaminów, Laboratorium czasów i zestawów ćwiczeń. Widzisz je tylko Ty, w tym profilu." })
    ]));
    const all = pd().noteList();
    if (!all.length) {
      view.appendChild(el("div", { class: "empty-state" }, [
        el("p", { class: "empty-state-text", text: "Nie masz jeszcze notatek." }),
        el("p", { class: "empty-state-hint", text: "Na każdej stronie z treścią jest przycisk „Notatki”. Kliknij go, wpisz swoje uwagi – zapiszą się same i pojawią tutaj." })
      ]));
      return;
    }
    const listBox = el("ul", { class: "notes-list", "aria-live": "polite" });
    const count = el("p", { class: "journal-count", "aria-live": "polite" });
    function paint() {
      const q = filter.query.trim();
      const fold = ELM.searchLogic ? ELM.searchLogic.fold : function (s) { return String(s).toLocaleLowerCase("pl"); };
      const shown = all.filter(function (n) { return !q || fold(n.title + " " + n.text).indexOf(fold(q)) !== -1; });
      count.textContent = "Notatki: " + shown.length + " z " + all.length;
      listBox.replaceChildren();
      if (!shown.length) { listBox.appendChild(el("li", { class: "empty-state-text", text: "Brak notatek pasujących do wyszukiwania." })); return; }
      shown.forEach(function (n) {
        listBox.appendChild(el("li", { class: "card notes-item" }, [
          el("div", { class: "notes-item-head" }, [
            n.route ? el("a", { class: "notes-item-title", href: n.route, text: n.title || "Notatka" }) : el("span", { class: "notes-item-title", text: n.title || "Notatka" }),
            el("span", { class: "notes-item-date", text: "Zmieniono: " + fmtDate(n.updatedAt) })
          ]),
          el("p", { class: "notes-item-text", text: n.text.length > 320 ? n.text.slice(0, 320) + "…" : n.text }),
          el("div", { class: "journal-actions" }, [
            n.route ? el("a", { class: "btn btn-secondary btn-small", href: n.route }, "Przejdź do strony") : null,
            el("button", {
              type: "button", class: "btn btn-danger btn-small", "aria-label": "Usuń notatkę: " + (n.title || "Notatka"),
              onclick: function () {
                ELM.dialogs.confirm({
                  title: "Usunąć notatkę?",
                  message: "Notatka do strony „" + (n.title || "Notatka") + "” zostanie usunięta. Tej operacji nie można cofnąć.",
                  confirmLabel: "Usuń notatkę"
                }).then(function (ok) { if (ok) { pd().removeNote(n.key); render(); } });
              }
            }, "Usuń")
          ])
        ]));
      });
    }
    const search = el("input", { id: "notes-search", class: "field", type: "search", value: filter.query, placeholder: "Szukaj w notatkach…", autocomplete: "off", oninput: function () { filter.query = search.value; paint(); } });
    view.appendChild(el("div", { class: "journal-filters", role: "search" }, el("div", { class: "form-field is-grow" }, [el("label", { class: "field-label", for: "notes-search", text: "Szukaj" }), search])));
    view.appendChild(count);
    view.appendChild(listBox);
    paint();
  }

  ELM.notes = { HASH: HASH, button: button, parseRoute: parseRoute, render: render, close: close, flush: flush };
})(window.ELM);
