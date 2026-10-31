/*
 * journal.js — zakładka „Moje błędy” (#/powtorki/moje-bledy); sesja powtórek jest wspólna (#/powtorki/sesja, js/fiszki.js).
 *
 * Dane: ELM.profileData (klucz elm_journal_v1, osobno dla każdego profilu).
 * Harmonogram: schedule() z js/fiszki-harmonogram.js — każdy wpis ma kartę w talii „Moje błędy” (paczka v8).
 * Treść wpisana przez użytkownika trafia do strony wyłącznie jako tekst.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const BASE = "#/powtorki/moje-bledy";                 // zakładka „Moje błędy” (wcześniej #/bledy)
  const REVIEW = "#/powtorki/sesja?tylko=bledy";         // sesja tylko z błędami (wcześniej #/bledy/powtorki)

  function pd() { return ELM.profileData; }
  function learn() { return ELM.learn; }

  // Filtry listy (pamiętane do odświeżenia strony)
  const filters = { status: "due", category: "", query: "", auto: false };

  // =====================================================================
  // ADRESY
  // =====================================================================

  function parseRoute(hash) {
    return /^#[/]powtorki[/]moje-bledy[/]?$/.test(hash || "") ? { kind: "list" } : null;
  }

  // =====================================================================
  // PUNKTY NIEZBĘDNIKA (wyszukiwalny wybór, link we wpisie)
  // =====================================================================

  let itemCache = null;

  /** Wszystkie punkty niezbędnika: [{ id, level, title, label, href }]. */
  function allItems() {
    if (itemCache) return itemCache;
    const N = ELM.NIEZBEDNIK;
    itemCache = [];
    if (!N) return itemCache;
    N.index.levels.forEach(function (lvl) {
      lvl.items.forEach(function (item) {
        const md = N.pages[item.file];
        const title = md ? ELM.markdown.parseFrontmatter(md).meta.title : null;
        itemCache.push({
          id: item.id,
          level: lvl.level,
          title: title || item.label,
          label: lvl.level + " · " + (title || item.label),
          href: ELM.niezbednik.routeOf(item)
        });
      });
    });
    return itemCache;
  }

  function findItem(id) {
    if (!id) return null;
    return allItems().find(function (it) { return it.id === id; }) || null;
  }

  function itemLink(id) {
    const item = findItem(id);
    if (!item) return null;
    return el("a", { class: "wiki-link", href: item.href }, item.label);
  }

  // =====================================================================
  // FORMULARZ (dodawanie i edycja)
  // =====================================================================

  let formCounter = 0;

  function field(id, label, control, hint, required) {
    return el("div", { class: "form-field" }, [
      el("label", { class: "field-label", for: id }, [label, required ? el("span", { class: "req", "aria-hidden": "true", text: " *" }) : null]),
      control,
      hint ? el("p", { class: "field-hint", id: id + "-hint", text: hint }) : null
    ]);
  }

  /**
   * Okno formularza wpisu. opts:
   *   entry   — edytowany wpis (albo brak = nowy)
   *   prefill — wstępne wartości nowego wpisu (np. z ćwiczenia C1); nic nie
   *             zapisuje się bez kliknięcia „Zapisz”
   * Zwraca Promise<wpis | null>.
   */
  function openForm(opts) {
    opts = opts || {};
    const editing = opts.entry || null;
    if (!editing && opts.prefill && opts.prefill.ref) {
      const dup = pd().findDuplicate(opts.prefill.ref, opts.prefill.myAnswer);
      if (dup) {
        return ELM.dialogs.alert({
          title: "Ten błąd jest już w dzienniku",
          message: "To zadanie z tą samą odpowiedzią zapisano " + dup.createdAt + ". Znajdziesz je w „Dzienniku błędów”."
        }).then(function () { return null; });
      }
    }
    const v = Object.assign({ context: "", myAnswer: "", correct: "", rule: "", source: "", category: "Inne", itemId: "", ref: "" },
      editing || opts.prefill || {});
    const L = pd().LIMITS;
    const n = ++formCounter;
    const ids = function (name) { return "jf-" + n + "-" + name; };

    function area(name, max, rows) {
      const t = el("textarea", { id: ids(name), class: "field", rows: String(rows || 2), maxlength: String(max) });
      t.value = v[name] || "";
      return t;
    }

    const context = area("context", L.context, 3);
    const myAnswer = area("myAnswer", L.myAnswer, 2);
    const correct = area("correct", L.correct, 2);
    const rule = area("rule", L.rule, 2);
    const source = el("input", { id: ids("source"), class: "field", type: "text", maxlength: String(L.source), value: v.source, placeholder: "np. Arkusz 1 RUE, Part 4, pyt. 29", autocomplete: "off" });
    const category = el("select", { id: ids("category"), class: "field" }, pd().CATEGORIES.map(function (c) {
      return el("option", { value: c, selected: c === v.category ? "selected" : null }, c);
    }));
    category.value = v.category;

    // Wyszukiwalny wybór punktu niezbędnika (input + datalist)
    const listId = ids("items");
    const datalist = el("datalist", { id: listId }, allItems().map(function (it) { return el("option", { value: it.label }); }));
    const current = findItem(v.itemId);
    const item = el("input", {
      id: ids("item"),
      class: "field",
      type: "search",
      list: listId,
      autocomplete: "off",
      placeholder: "Zacznij pisać, np. Present Perfect",
      value: current ? current.label : "",
      "aria-describedby": ids("item") + "-hint"
    });

    const error = el("p", { class: "dialog-error", role: "alert" });

    const body = el("form", { class: "journal-form", novalidate: true, onsubmit: function (e) { e.preventDefault(); } }, [
      field(ids("context"), "Kontekst / pytanie", context, null, true),
      field(ids("myAnswer"), "Moja odpowiedź", myAnswer),
      field(ids("correct"), "Poprawna odpowiedź", correct, null, true),
      field(ids("rule"), "Reguła / dlaczego", rule),
      el("div", { class: "form-row" }, [
        field(ids("category"), "Kategoria", category),
        field(ids("source"), "Źródło", source)
      ]),
      field(ids("item"), "Punkt niezbędnika (opcjonalnie)", item, "Wybierz z listy podpowiedzi albo zostaw puste."),
      datalist,
      el("p", { class: "field-hint", text: "* pole wymagane" }),
      error
    ]);

    function collect() {
      const itemText = item.value.trim();
      let itemId = "";
      if (itemText) {
        const hit = allItems().find(function (it) { return it.label === itemText; }) ||
          allItems().find(function (it) { return it.title.toLocaleLowerCase("pl") === itemText.toLocaleLowerCase("pl"); });
        if (!hit) return { error: "Nie znaleziono takiego punktu niezbędnika. Wybierz go z listy podpowiedzi albo wyczyść pole.", focus: item };
        itemId = hit.id;
      }
      if (!context.value.trim()) return { error: "Wpisz kontekst albo pytanie.", focus: context };
      if (!correct.value.trim()) return { error: "Wpisz poprawną odpowiedź.", focus: correct };
      return {
        fields: {
          context: context.value, myAnswer: myAnswer.value, correct: correct.value, rule: rule.value,
          source: source.value, category: category.value, itemId: itemId, ref: v.ref || ""
        }
      };
    }

    let saved = null;
    const dlg = ELM.dialogs.open({
      title: editing ? "Edytuj wpis" : "Dodaj błąd do dziennika",
      className: "dialog-wide",
      body: body,
      cancelValue: null,
      actions: [
        { label: "Anuluj", value: null, variant: "btn-secondary" },
        {
          label: "Zapisz",
          value: "save",
          variant: "btn-primary",
          onClick: function () {
            const r = collect();
            [context, correct, item].forEach(function (f) { f.removeAttribute("aria-invalid"); });
            if (r.error) {
              error.textContent = r.error;
              r.focus.setAttribute("aria-invalid", "true");
              r.focus.focus();
              return false;
            }
            if (!editing) {
              const dup = pd().findDuplicate(r.fields.ref, r.fields.myAnswer);
              if (dup) {
                error.textContent = "To zadanie z tą samą odpowiedzią jest już w dzienniku (dodane " + dup.createdAt + ").";
                return false;
              }
            }
            saved = editing ? pd().updateEntry(editing.id, r.fields) : pd().addEntry(r.fields);
            if (!saved) { error.textContent = "Nie udało się zapisać wpisu."; return false; }
            return true;
          }
        }
      ]
    });
    context.focus();
    return dlg.result.then(function () {
      if (saved && ELM.app) ELM.app.refreshLearning();
      return saved;
    });
  }

  // =====================================================================
  // LISTA
  // =====================================================================

  function plural(n, one, few, many) { return ELM.c1 ? ELM.c1.plural(n, one, few, many) : many; }

  /** Stan karty wpisu (talia „Moje błędy”, harmonogram fiszek) zamiast etapu 1/3/7. */
  function reviewLabel(e) {
    const info = ELM.fiszki ? ELM.fiszki.mistakeInfo(e) : null;
    if (!info) return { text: "Nowa karta", cls: "" };
    if (info.suspended) return { text: "Zawieszona", cls: "" };
    if (info.mastered) return { text: "Opanowane", cls: "is-mastered" };
    if (info.state === "learning" || info.state === "relearning") return { text: "W nauce", cls: "is-due" };
    const d = Math.ceil((info.due - Date.now()) / 86400000);
    if (info.due < ELM.fiszkiLogic.dayEnd(Date.now())) return { text: "Do powtórki dziś", cls: "is-due" };
    if (d <= 1) return { text: "Powtórka jutro", cls: "" };
    return { text: "Powtórka za " + d + " " + plural(d, "dzień", "dni", "dni"), cls: "" };
  }

  function matches(e) {
    const info = ELM.fiszki ? ELM.fiszki.mistakeInfo(e) : null;
    const dueNow = info ? (info.state !== "new" && !info.suspended && info.due < ELM.fiszkiLogic.dayEnd(Date.now())) : false;
    if (filters.status === "due" && !dueNow) return false;
    if (filters.status === "mastered" && !(info && info.mastered)) return false;
    if (filters.category && e.category !== filters.category) return false;
    if (filters.auto && !pd().isAutoEntry(e)) return false;
    const q = filters.query.trim().toLocaleLowerCase("pl");
    if (q) {
      const hay = [e.context, e.myAnswer, e.correct, e.rule, e.source, e.category].join(" ").toLocaleLowerCase("pl");
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  /** Klasa paska kategorii (kolor tylko jako dodatek — nazwa kategorii jest w chipie). */
  function catClass(category) {
    const map = { "Use of English": "uoe", "Reading": "reading", "Writing": "writing", "Listening": "listening", "Speaking": "speaking", "Gramatyka": "grammar", "Słownictwo": "vocab", "Inne": "other" };
    return " cat-" + (map[category] || "other");
  }

  function entryCard(e, rerender) {
    const status = reviewLabel(e);
    const link = itemLink(e.itemId);
    const auto = pd().autoInfo(e); // wpis dodany automatycznie z zadania (iskra)
    return el("li", { class: "card journal-entry" + catClass(e.category) }, [
      el("div", { class: "journal-entry-head" }, [
        el("span", { class: "c1-chip", text: e.category }),
        auto ? el("span", { class: "journal-auto", title: "Dodany automatycznie z zadania" }, [
          ELM.icon("sparkles", { size: 14 }), "Automatyczny" + (auto.returned ? " · wrócił" : "") + (auto.wrongCount > 1 ? " · błędów: " + auto.wrongCount : "")
        ]) : null,
        el("span", { class: "journal-status " + status.cls, text: status.text }),
        e.source ? el("span", { class: "journal-source", text: e.source }) : null
      ]),
      el("p", { class: "journal-context", text: e.context }),
      el("dl", { class: "journal-answers" }, [
        e.myAnswer ? el("div", { class: "journal-row is-wrong" }, [el("dt", { text: "Moja odpowiedź" }), el("dd", { text: e.myAnswer })]) : null,
        el("div", { class: "journal-row is-right" }, [el("dt", { text: "Poprawnie" }), el("dd", { text: e.correct })]),
        e.rule ? el("div", { class: "journal-row" }, [el("dt", { text: "Dlaczego" }), el("dd", { text: e.rule })]) : null,
        link ? el("div", { class: "journal-row" }, [el("dt", { text: "Niezbędnik" }), el("dd", null, link)]) : null
      ]),
      el("div", { class: "journal-actions" }, [
        el("button", {
          type: "button",
          class: "btn btn-secondary btn-small",
          "aria-label": "Edytuj wpis: " + e.context.slice(0, 60),
          onclick: function () { openForm({ entry: e }).then(function (r) { if (r) rerender(); }); }
        }, "Edytuj"),
        el("button", {
          type: "button",
          class: "btn btn-danger btn-small",
          "aria-label": "Usuń wpis: " + e.context.slice(0, 60),
          onclick: function () {
            ELM.dialogs.confirm({
              title: "Usunąć wpis?",
              message: "Wpis „" + e.context.slice(0, 120) + (e.context.length > 120 ? "…" : "") + "” zostanie usunięty z dziennika. Tej operacji nie można cofnąć.",
              confirmLabel: "Usuń wpis"
            }).then(function (ok) {
              if (!ok) return;
              pd().removeEntry(e.id);
              ELM.app.refreshLearning();
              rerender();
            });
          }
        }, "Usuń")
      ])
    ]);
  }

  function emptyBox(text, withButton) {
    return ELM.ui.emptyState({
      art: "pusty-dziennik", title: text,
      action: withButton ? el("button", {
        type: "button",
        class: "btn btn-primary",
        onclick: function () { openForm().then(function (r) { if (r) render({ kind: "list" }); }); }
      }, "Dodaj pierwszy błąd") : null
    });
  }

  function renderList(view) {
    const all = pd().entries();
    const due = ELM.reviews ? ELM.reviews.breakdown().mistake : 0;

    view.appendChild(ELM.powtorki.header("bledy", "Zapisuj błędy z ćwiczeń i arkuszy – każdy ma kartę, która wraca w rosnących odstępach (harmonogram fiszek). Karta opanowana wraca raz na kilka tygodni."));

    view.appendChild(el("div", { class: "tool-actions" }, [
      due
        ? el("a", { class: "btn btn-primary", href: REVIEW }, "Zacznij powtórki (" + due + ")")
        : el("p", { class: "tool-note", text: all.length ? "Na dziś czysto – brak powtórek." : "" }),
      el("button", {
        type: "button",
        class: "btn btn-secondary",
        onclick: function () { openForm().then(function (r) { if (r) render({ kind: "list" }); }); }
      }, ELM.ui.withIcon("plus", "Dodaj błąd"))
    ]));

    if (!all.length) {
      view.appendChild(emptyBox("Dziennik jest pusty. Zapisz pierwszy błąd – na przykład z ćwiczenia Use of English albo z próbnego arkusza.", true));
      return;
    }

    const listBox = el("ul", { class: "journal-list", "aria-live": "polite" });
    const countText = el("p", { class: "journal-count", "aria-live": "polite" });

    function paint() {
      const shown = all.filter(matches);
      countText.textContent = "Wpisy: " + shown.length + " z " + all.length;
      listBox.replaceChildren();
      if (!shown.length) {
        const msg = filters.status === "due" && !filters.query && !filters.category
          ? "Na dziś czysto. Nie masz nic do powtórzenia – wróć jutro albo dodaj nowy błąd."
          : filters.status === "mastered" && !filters.query && !filters.category
            ? "Jeszcze nic nie jest opanowane. Wpis staje się opanowany po trzech udanych powtórkach."
            : "Brak wpisów pasujących do filtrów.";
        listBox.appendChild(el("li", null, emptyBox(msg, false)));
        return;
      }
      shown.forEach(function (e) { listBox.appendChild(entryCard(e, function () { render({ kind: "list" }); })); });
    }

    const statuses = [["due", "Do powtórki dziś"], ["all", "Wszystkie"], ["mastered", "Opanowane"]];
    const statusButtons = statuses.map(function (s) {
      return el("button", {
        type: "button",
        class: "segmented-btn" + (filters.status === s[0] ? " is-active" : ""),
        "aria-pressed": filters.status === s[0] ? "true" : "false",
        onclick: function () {
          filters.status = s[0];
          statusButtons.forEach(function (b, i) {
            const on = statuses[i][0] === s[0];
            b.classList.toggle("is-active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
          });
          paint();
        }
      }, s[1]);
    });

    const catSelect = el("select", {
      id: "journal-cat",
      class: "field",
      onchange: function () { filters.category = catSelect.value; paint(); }
    }, [el("option", { value: "" }, "Wszystkie kategorie")].concat(pd().CATEGORIES.map(function (c) { return el("option", { value: c }, c); })));
    catSelect.value = filters.category;

    const search = el("input", {
      id: "journal-search",
      class: "field",
      type: "search",
      value: filters.query,
      placeholder: "Szukaj w dzienniku…",
      autocomplete: "off",
      oninput: function () { filters.query = search.value; paint(); }
    });

    const autoCount = all.filter(function (e) { return pd().isAutoEntry(e); }).length;
    const autoBtn = autoCount ? el("button", {
      type: "button",
      class: "chip-btn" + (filters.auto ? " is-active" : ""),
      "aria-pressed": filters.auto ? "true" : "false",
      onclick: function () {
        filters.auto = !filters.auto;
        autoBtn.classList.toggle("is-active", filters.auto);
        autoBtn.setAttribute("aria-pressed", filters.auto ? "true" : "false");
        paint();
      }
    }, [ELM.icon("sparkles", { size: 16 }), "Automatyczne (" + autoCount + ")"]) : null;
    if (!autoCount) filters.auto = false;

    view.appendChild(el("div", { class: "journal-filters", role: "search" }, [
      el("div", { class: "journal-filter-top" }, [
        el("div", { class: "segmented", role: "group", "aria-label": "Pokaż" }, statusButtons),
        autoBtn
      ]),
      el("div", { class: "journal-filter-row" }, [
        el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "journal-cat", text: "Kategoria" }), catSelect]),
        el("div", { class: "form-field is-grow" }, [el("label", { class: "field-label", for: "journal-search", text: "Szukaj" }), search])
      ])
    ]));
    view.appendChild(countText);
    view.appendChild(listBox);
    if (autoCount) {
      view.appendChild(el("div", { class: "tool-actions journal-auto-actions" }, el("button", {
        type: "button",
        class: "btn btn-danger btn-small",
        onclick: function () {
          ELM.dialogs.confirm({
            title: "Usunąć wszystkie automatyczne wpisy?",
            message: "Z dziennika zniknie " + autoCount + " " + plural(autoCount, "wpis dodany", "wpisy dodane", "wpisów dodanych") + " automatycznie z zadań. Wpisy dodane ręcznie zostaną. Tej operacji nie można cofnąć.",
            confirmLabel: "Usuń automatyczne"
          }).then(function (ok) {
            if (!ok) return;
            pd().removeAllAuto();
            filters.auto = false;
            ELM.app.refreshLearning();
            render({ kind: "list" });
          });
        }
      }, ELM.ui.withIcon("trash", "Usuń wszystkie automatyczne"))));
    }
    paint();
  }

  function focusLater(selector) {
    setTimeout(function () { const b = document.querySelector(selector); if (b) b.focus(); }, 0);
  }

  function rerender() {
    render(parseRoute(location.hash) || { kind: "list" });
  }

  // =====================================================================
  // WIDOK
  // =====================================================================

  function render(route) {
    const view = document.getElementById("view");
    const key = "#journal:" + route.kind;
    const keepScroll = view.dataset.file === key ? U.getScroll() : 0;
    view.className = "view tool-view journal-view";
    view.dataset.file = key;
    view.replaceChildren();
    renderList(view);
    document.title = "Moje błędy · Fiszki i błędy · English Levels Map";
    U.setScroll(keepScroll);
  }

  /** Wejście na widok: nic do przygotowania (sesja jest w js/fiszki.js). */
  function onEnter() {}

  ELM.journal = {
    BASE: BASE,
    REVIEW: REVIEW,
    parseRoute: parseRoute,
    render: render,
    onEnter: onEnter,
    openForm: openForm,
    findItem: findItem,
    itemLink: itemLink
  };
})(window.ELM);
