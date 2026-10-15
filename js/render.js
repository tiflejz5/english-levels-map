/*
 * render.js — rysowanie widoków (sidebar, nagłówek poziomu, kategorie,
 * essentials, podsumowanie poziomu). Te same funkcje rysują tryb podglądu i tryb edycji:
 * w trybie edycji zamiast tekstu pojawiają się pola i dyskretne kontrolki.
 *
 * Każdy tekst użytkownika trafia do DOM jako tekst (textContent / value).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  // Skróty do innych części aplikacji (ładowane później, używane w trakcie działania)
  function app() { return ELM.app; }
  function editor() { return ELM.editor; }
  function isEdit() { return ELM.state.editMode; }

  // =====================================================================
  // ELEMENTY WSPÓLNE
  // =====================================================================

  /** Pasek postępu. percent: 0–100. */
  function progressBar(percent, small, label) {
    return el("div", {
      class: "progress" + (small ? " is-small" : ""),
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": String(percent),
      "aria-label": label || "Postęp"
    }, el("div", { class: "progress-fill", style: "width:" + percent + "%" }));
  }

  /** Okrągły przycisk z symbolem (↑ ↓ ✕ …) i czytelną etykietą dla czytników ekranu. */
  function iconBtn(symbol, label, onClick, opts) {
    opts = opts || {};
    return el("button", {
      type: "button",
      class: "icon-btn" + (opts.danger ? " is-danger" : ""),
      "aria-label": label,
      title: label,
      disabled: !!opts.disabled,
      onclick: onClick
    }, el("span", { "aria-hidden": "true", text: symbol }));
  }

  function textBtn(label, onClick, variant) {
    return el("button", { type: "button", class: "btn btn-small " + (variant || "btn-secondary"), onclick: onClick }, label);
  }

  /** Kontrolki „w górę / w dół / usuń” dla elementu listy. */
  function rowControls(list, index, onDelete, labels) {
    return el("div", { class: "item-controls" }, [
      iconBtn("↑", labels.up, function () { editor().moveItem(list, index, -1); }, { disabled: index === 0 }),
      iconBtn("↓", labels.down, function () { editor().moveItem(list, index, 1); }, { disabled: index === list.length - 1 }),
      iconBtn("✕", labels.remove, onDelete, { danger: true })
    ]);
  }

  /**
   * Pole edycji powiązane z polem obiektu. Każda zmiana od razu trafia
   * do danych i uruchamia automatyczny zapis.
   *   opts: multiline, rows, placeholder, label, focusId, onChange
   */
  function boundField(obj, key, opts) {
    opts = opts || {};
    const node = el(opts.multiline ? "textarea" : "input", {
      class: "field",
      type: opts.multiline ? null : "text",
      rows: opts.multiline ? (opts.rows || 2) : null,
      value: obj[key] || "",
      placeholder: opts.placeholder || "",
      "aria-label": opts.label || opts.placeholder || null,
      "data-focus-id": opts.focusId || null,
      oninput: function () {
        obj[key] = node.value;
        if (opts.multiline) U.autoGrow(node);
        app().scheduleSave();
        if (opts.onChange) opts.onChange(node.value);
      }
    });
    return node;
  }

  /**
   * Pusty stan. W trybie edycji z przyciskiem dodawania,
   * w podglądzie tylko z podpowiedzią (bez kontrolek edycji).
   */
  function emptyState(message, addLabel, onAdd) {
    return el("div", { class: "empty-state" }, [
      el("p", { class: "empty-state-text", text: message }),
      isEdit()
        ? el("button", { type: "button", class: "btn btn-primary", onclick: onAdd }, addLabel)
        : el("p", { class: "empty-state-hint", text: "Włącz „Tryb edycji” w lewym dolnym rogu, aby dodać treść." })
    ]);
  }

  // =====================================================================
  // SIDEBAR
  // =====================================================================

  function renderSidebar() {
    const st = ELM.state;
    const list = document.getElementById("level-list");
    const cat = app().getActiveCategory();

    document.getElementById("sidebar-category-name").textContent = cat ? (cat.name || "Kategoria bez nazwy") : "Brak kategorii";
    document.getElementById("edit-toggle").checked = st.editMode;

    list.replaceChildren();
    st.content.levels.forEach(function (level) {
      const stats = app().getStats(level.id, cat ? cat.id : null);
      // Na stronie głównej żaden poziom nie jest wyróżniony
      const active = st.view !== "home" && level.id === st.ui.levelId;
      list.appendChild(el("button", {
        type: "button",
        class: "level-item lvl-" + level.id + (active ? " is-active" : ""),
        "aria-current": active ? "true" : null,
        "aria-label": "Poziom " + level.id + ", umiem " + stats.done + " z " + stats.total,
        onclick: function () { app().selectLevel(level.id); }
      }, [
        el("span", { class: "level-item-top" }, [
          el("span", { class: "level-dot", "aria-hidden": "true" }),
          el("span", { class: "level-code", text: level.id })
        ]),
        progressBar(stats.percent, true, "Postęp poziomu " + level.id),
        el("span", { class: "level-count", "aria-hidden": "true", text: stats.done + " / " + stats.total + " umiem" })
      ]));
    });
  }

  // =====================================================================
  // TREŚĆ POZIOMU (prawa część)
  // =====================================================================

  function renderMain(opts) {
    opts = opts || {};
    // Strona główna albo otwarta podstrona niezbędnika zamiast listy
    if (ELM.state.view === "home") return ELM.niezbednik.renderHome();
    if (ELM.state.route) return ELM.niezbednik.renderPage(ELM.state.route);
    ELM.niezbednik.computeLinks();
    const view = document.getElementById("view");
    const scroll = opts.resetScroll ? 0 : U.getScroll();
    const level = app().getActiveLevel();
    const cat = app().getActiveCategory();

    document.body.classList.toggle("is-editing", isEdit());
    view.className = "view lvl-" + level.id;
    delete view.dataset.file;
    view.replaceChildren();

    view.appendChild(renderLevelHeader(level));
    view.appendChild(renderCategoryBar(cat));

    if (!cat) {
      view.appendChild(emptyState("Nie ma jeszcze żadnej kategorii.", "+ Dodaj pierwszą kategorię", function () {
        editor().addCategory();
      }));
    } else {
      const bucket = app().getBucket(level.id, cat.id);
      view.appendChild(renderEssentials(level, cat, bucket));
      // Pod listą: podsumowanie poziomu (niezbednik/podsumowania/<poziom>.md)
      const summary = ELM.niezbednik.renderSummary(level.id);
      if (summary) view.appendChild(summary);
    }

    // Wysokość pól tekstowych liczona po wstawieniu do strony
    view.querySelectorAll("textarea").forEach(U.autoGrow);
    U.setScroll(typeof opts.scrollTop === "number" ? opts.scrollTop : scroll);

    if (opts.focusId) {
      const target = view.querySelector('[data-focus-id="' + CSS.escape(opts.focusId) + '"]');
      if (target) {
        target.focus();
        target.scrollIntoView({ block: "nearest" });
      }
    }
  }

  // ---------- Nagłówek poziomu ----------

  function renderLevelHeader(level) {
    const header = el("header", { class: "level-header" }, [
      el("div", { class: "level-title-row" }, [
        el("h1", { class: "level-title" }, [
          el("span", { class: "level-dot", "aria-hidden": "true" }),
          level.id
        ]),
        isEdit() ? el("span", { class: "mode-chip", text: "Tryb edycji" }) : null
      ])
    ]);

    if (isEdit()) {
      header.appendChild(el("div", { class: "level-desc-field" }, boundField(level, "description", {
        multiline: true,
        rows: 1,
        placeholder: "Krótki opis poziomu (opcjonalnie)…",
        label: "Opis poziomu " + level.id
      })));
    } else if (!U.isBlank(level.description)) {
      header.appendChild(el("p", { class: "level-desc" }, U.formatText(level.description)));
    }
    return header;
  }

  // ---------- Kategorie ----------

  function renderCategoryBar(activeCat) {
    const cats = ELM.state.content.categories;
    const bar = el("div", { class: "category-bar" });

    if (cats.length) {
      bar.appendChild(el("div", { class: "segmented", role: "tablist", "aria-label": "Kategorie" },
        cats.map(function (c) {
          const active = activeCat && c.id === activeCat.id;
          return el("button", {
            type: "button",
            role: "tab",
            class: "segmented-btn" + (active ? " is-active" : ""),
            "aria-selected": active ? "true" : "false",
            onclick: function () { app().selectCategory(c.id); }
          }, c.name || "Bez nazwy");
        })
      ));
    }

    if (isEdit()) {
      const index = activeCat ? cats.indexOf(activeCat) : -1;
      bar.appendChild(el("div", { class: "edit-toolbar", "aria-label": "Edycja kategorii" }, [
        textBtn("+ Kategoria", function () { editor().addCategory(); }, "btn-ghost"),
        activeCat ? textBtn("Zmień nazwę", function () { editor().renameCategory(activeCat.id); }) : null,
        activeCat ? iconBtn("←", "Przesuń kategorię w lewo", function () { editor().moveCategory(activeCat.id, -1); }, { disabled: index <= 0 }) : null,
        activeCat ? iconBtn("→", "Przesuń kategorię w prawo", function () { editor().moveCategory(activeCat.id, 1); }, { disabled: index >= cats.length - 1 }) : null,
        activeCat ? textBtn("Usuń kategorię", function () { editor().deleteCategory(activeCat.id); }, "btn-danger") : null
      ]));
    }
    return bar;
  }

  // ---------- Essentials ----------

  function renderEssentials(level, cat, bucket) {
    const stats = app().getStats(level.id, cat.id);
    const list = bucket.essentials;
    const progress = ELM.state.progress;

    const section = el("section", { class: "card essentials", "aria-labelledby": "ess-title" }, [
      el("div", { class: "section-head" }, [
        el("h2", { class: "section-title", id: "ess-title", text: "Essentials" }),
        el("span", { class: "section-sub", text: "Co uczeń powinien umieć na poziomie " + level.id })
      ]),
      el("div", { class: "essentials-progress", id: "ess-progress" }, [
        progressBar(stats.percent, false, "Postęp essentials"),
        el("span", { class: "progress-text", text: progressLabel(stats) })
      ])
    ]);

    // W podglądzie pomijamy puste punkty
    const visible = isEdit() ? list : list.filter(function (e) { return !U.isBlank(e.text); });

    if (!visible.length) {
      section.appendChild(emptyState("Brak punktów na tym poziomie.", "+ Dodaj pierwszy punkt", function () {
        editor().addEssential();
      }));
      return section;
    }

    const ul = el("ul", { class: "ess-list" });
    visible.forEach(function (item) {
      const done = progress[item.id] === true;
      const textId = "ess-text-" + item.id;
      const pageLink = ELM.niezbednik.linkForEssential(item.id);
      const checkbox = el("label", { class: "umiem" }, [
        el("input", {
          type: "checkbox",
          checked: done,
          "aria-describedby": textId,
          onchange: function (e) {
            app().setProgress(item.id, e.target.checked);
            li.classList.toggle("is-done", e.target.checked);
          }
        }),
        el("span", { text: "Umiem" })
      ]);

      let li;
      if (isEdit()) {
        const index = list.indexOf(item);
        const field = boundField(item, "text", {
          multiline: true,
          rows: 1,
          placeholder: "Opisz umiejętność…",
          label: "Treść punktu " + (index + 1),
          focusId: item.id,
          onChange: function () { app().refreshProgress(); }
        });
        field.id = textId;
        li = el("li", { class: "ess-item edit-row" + (done ? " is-done" : "") }, [
          checkbox,
          field,
          pageLink ? el("a", {
            class: "ess-page-link",
            href: ELM.niezbednik.routeOf(pageLink.item),
            title: "Otwórz podstronę",
            onclick: rememberScroll
          }, "Podstrona ›") : null,
          rowControls(list, index, function () { editor().deleteEssential(index); }, {
            up: "Przesuń punkt w górę", down: "Przesuń punkt w dół", remove: "Usuń punkt"
          })
        ]);
      } else {
        li = el("li", { class: "ess-item" + (done ? " is-done" : "") + (pageLink ? " has-page" : "") }, [
          el("div", { class: "ess-text", id: textId }, pageLink
            // Punkt z podstroną: tekst jest linkiem
            ? el("a", { class: "ess-link", href: ELM.niezbednik.routeOf(pageLink.item), onclick: rememberScroll }, [
                U.formatText(item.text),
                el("span", { class: "ess-link-arrow", "aria-hidden": "true", text: "›" })
              ])
            : U.formatText(item.text)),
          checkbox
        ]);
      }
      ul.appendChild(li);
    });
    section.appendChild(ul);

    if (isEdit()) {
      section.appendChild(el("div", { style: "margin-top:14px" },
        textBtn("+ Dodaj punkt", function () { editor().addEssential(); }, "btn-ghost")));
    }
    return section;
  }

  /** Zapamiętuje przewinięcie listy przed przejściem na podstronę. */
  function rememberScroll() {
    ELM.state.listScroll = U.getScroll();
  }

  function progressLabel(stats) {
    return stats.done + " z " + stats.total + " umiem · " + stats.percent + "%";
  }

  /** Aktualizuje pasek postępu essentials bez przerysowania całej strony. */
  function updateEssentialsProgress() {
    const box = document.getElementById("ess-progress");
    const cat = app().getActiveCategory();
    if (!box || !cat) return;
    const stats = app().getStats(ELM.state.ui.levelId, cat.id);
    const bar = box.querySelector(".progress");
    bar.setAttribute("aria-valuenow", String(stats.percent));
    bar.querySelector(".progress-fill").style.width = stats.percent + "%";
    box.querySelector(".progress-text").textContent = progressLabel(stats);
  }

  ELM.render = {
    renderSidebar: renderSidebar,
    renderMain: renderMain,
    updateEssentialsProgress: updateEssentialsProgress,
    iconBtn: iconBtn
  };
})(window.ELM);
