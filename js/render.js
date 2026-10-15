/*
 * render.js — rysowanie widoków (sidebar, nagłówek poziomu, kategorie,
 * essentials, tematy). Te same funkcje rysują tryb podglądu i tryb edycji:
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
   *   opts: multiline, mono, title, placeholder, label, focusId, onChange
   */
  function boundField(obj, key, opts) {
    opts = opts || {};
    const cls = "field" + (opts.mono ? " is-mono" : "") + (opts.title ? " is-title" : "");
    const node = el(opts.multiline ? "textarea" : "input", {
      class: cls,
      type: opts.multiline ? null : "text",
      rows: opts.multiline ? (opts.rows || 2) : null,
      value: obj[key] || "",
      placeholder: opts.placeholder || "",
      "aria-label": opts.label || opts.placeholder || null,
      "data-focus-id": opts.focusId || null,
      spellcheck: opts.mono ? "false" : null,
      oninput: function () {
        obj[key] = node.value;
        if (opts.multiline) U.autoGrow(node);
        app().scheduleSave();
        if (opts.onChange) opts.onChange(node.value);
      }
    });
    return node;
  }

  /** Blok z etykietą nad polem. */
  function labeled(label, field) {
    return el("div", null, [el("span", { class: "field-label", "aria-hidden": "true", text: label }), field]);
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
      const active = level.id === st.ui.levelId;
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
    // Otwarta podstrona niezbędnika zamiast listy
    if (ELM.state.route) return ELM.niezbednik.renderPage(ELM.state.route);
    ELM.niezbednik.computeLinks();
    const main = document.getElementById("main");
    const view = document.getElementById("view");
    const scroll = opts.resetScroll ? 0 : main.scrollTop;
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
      view.appendChild(renderTopics(level, cat, bucket));
    }

    // Wysokość pól tekstowych liczona po wstawieniu do strony
    view.querySelectorAll("textarea").forEach(U.autoGrow);
    main.scrollTop = typeof opts.scrollTop === "number" ? opts.scrollTop : scroll;

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
    ELM.state.listScroll = document.getElementById("main").scrollTop;
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

  // ---------- Tematy ----------

  function renderTopics(level, cat, bucket) {
    const topics = bucket.topics;
    const section = el("section", { class: "topics", "aria-labelledby": "topics-title" }, [
      el("div", { class: "section-head" }, [
        el("h2", { class: "section-title", id: "topics-title", text: "Tematy" })
      ])
    ]);

    if (!topics.length) {
      section.appendChild(emptyState("Brak tematów na tym poziomie.", "+ Dodaj pierwszy temat", function () {
        editor().addTopic();
      }));
      return section;
    }

    const active = app().getActiveTopic(bucket);

    const tabs = el("div", { class: "topic-tabs", role: "tablist", "aria-label": "Tematy" });
    topics.forEach(function (t) {
      const isActive = t === active;
      tabs.appendChild(el("button", {
        type: "button",
        role: "tab",
        class: "topic-tab" + (isActive ? " is-active" : "") + (U.isBlank(t.title) ? " is-untitled" : ""),
        "aria-selected": isActive ? "true" : "false",
        "data-topic-tab": t.id,
        onclick: function () { app().selectTopic(t.id); }
      }, U.isBlank(t.title) ? "Temat bez nazwy" : t.title));
    });
    if (isEdit()) {
      tabs.appendChild(el("button", {
        type: "button",
        class: "btn btn-ghost",
        onclick: function () { editor().addTopic(); }
      }, "+ Dodaj temat"));
    }
    section.appendChild(tabs);
    section.appendChild(renderTopic(active, topics));
    return section;
  }

  /** Widok jednego tematu z sześcioma sekcjami. */
  function renderTopic(topic, topics) {
    const edit = isEdit();
    const card = el("article", { class: "card topic", role: "tabpanel", "aria-label": topic.title || "Temat bez nazwy" });

    if (edit) {
      const index = topics.indexOf(topic);
      card.appendChild(el("div", { class: "edit-toolbar topic-toolbar", "aria-label": "Edycja tematu" }, [
        iconBtn("←", "Przesuń temat w lewo", function () { editor().moveTopic(topic.id, -1); }, { disabled: index === 0 }),
        iconBtn("→", "Przesuń temat w prawo", function () { editor().moveTopic(topic.id, 1); }, { disabled: index === topics.length - 1 }),
        textBtn("Usuń temat", function () { editor().deleteTopic(topic.id); }, "btn-danger")
      ]));
    }

    // 1. Nazwa
    if (edit) {
      card.appendChild(topicSection("Nazwa", boundField(topic, "title", {
        title: true,
        placeholder: "Nazwa tematu…",
        label: "Nazwa tematu",
        focusId: topic.id,
        onChange: function (value) { updateTabLabel(topic.id, value); }
      })));
    } else {
      card.appendChild(el("h3", { class: "topic-title", text: U.isBlank(topic.title) ? "Temat bez nazwy" : topic.title }));
    }

    // 2. Zasada
    card.appendChild(topicSection("Zasada",
      edit
        ? boundField(topic, "rule", { multiline: true, rows: 3, placeholder: "Uzupełnij wyjaśnienie zasady… (wskazówka: **tekst** = pogrubienie)", label: "Zasada" })
        : el("div", { class: "rich" }, U.formatText(topic.rule)),
      U.isBlank(topic.rule)));

    // 3. Wzór
    card.appendChild(topicSection("Wzór",
      edit
        ? boundField(topic, "formula", { multiline: true, rows: 2, mono: true, placeholder: "Uzupełnij wzór / schemat zdania…", label: "Wzór" })
        : el("pre", { class: "formula", text: topic.formula }),
      U.isBlank(topic.formula)));

    // 4. Przykłady
    card.appendChild(listSection({
      title: "Przykłady",
      list: topic.examples,
      fields: [{ key: "text", placeholder: "Zdanie przykładowe…", label: "Przykład", multiline: true }],
      emptyHint: "Brak przykładów. Dodaj pierwszy.",
      addLabel: "+ Dodaj przykład",
      newItem: function () { return { id: U.uid("x"), text: "" }; },
      labels: { up: "Przesuń przykład w górę", down: "Przesuń przykład w dół", remove: "Usuń przykład", what: "ten przykład" },
      renderPreview: function (items) {
        return el("ul", { class: "example-list" }, items.map(function (x) {
          return el("li", null, U.formatText(x.text));
        }));
      }
    }));

    // 5. Typowe błędy
    card.appendChild(listSection({
      title: "Typowe błędy",
      list: topic.mistakes,
      boxed: true,
      fields: [
        { key: "wrong", label: "Błędnie", placeholder: "Błędne zdanie…" },
        { key: "correct", label: "Poprawnie", placeholder: "Poprawne zdanie…" },
        { key: "note", label: "Notatka (opcjonalnie)", placeholder: "Krótkie wyjaśnienie…", multiline: true }
      ],
      emptyHint: "Brak typowych błędów. Dodaj pierwszy.",
      addLabel: "+ Dodaj błąd",
      newItem: function () { return { id: U.uid("m"), wrong: "", correct: "", note: "" }; },
      labels: { up: "Przesuń błąd w górę", down: "Przesuń błąd w dół", remove: "Usuń błąd", what: "ten typowy błąd" },
      renderPreview: function (items) {
        return el("div", { class: "mistake-list" }, items.map(function (m) {
          return el("div", { class: "mistake" }, [
            U.isBlank(m.wrong) ? null : el("div", { class: "mistake-line mistake-wrong" }, [
              el("span", { class: "mistake-mark", "aria-hidden": "true", text: "✗" }),
              el("span", { class: "visually-hidden", text: "Błędnie: " }),
              el("span", { class: "mistake-text" }, U.formatText(m.wrong))
            ]),
            U.isBlank(m.correct) ? null : el("div", { class: "mistake-line mistake-correct" }, [
              el("span", { class: "mistake-mark", "aria-hidden": "true", text: "✓" }),
              el("span", { class: "visually-hidden", text: "Poprawnie: " }),
              el("span", { class: "mistake-text" }, U.formatText(m.correct))
            ]),
            U.isBlank(m.note) ? null : el("p", { class: "mistake-note" }, U.formatText(m.note))
          ]);
        }));
      }
    }));

    // 6. Ćwiczenia
    card.appendChild(listSection({
      title: "Ćwiczenia",
      list: topic.exercises,
      boxed: true,
      numbered: true,
      fields: [
        { key: "prompt", label: "Polecenie / zadanie", placeholder: "Treść zadania…", multiline: true },
        { key: "answer", label: "Odpowiedź (opcjonalnie, ukryta dla ucznia)", placeholder: "Odpowiedź…", multiline: true }
      ],
      emptyHint: "Brak ćwiczeń. Dodaj pierwsze.",
      addLabel: "+ Dodaj ćwiczenie",
      newItem: function () { return { id: U.uid("ex"), prompt: "", answer: "" }; },
      labels: { up: "Przesuń ćwiczenie w górę", down: "Przesuń ćwiczenie w dół", remove: "Usuń ćwiczenie", what: "to ćwiczenie" },
      renderPreview: function (items) {
        return el("ol", { class: "exercise-list" }, items.map(function (ex) {
          const li = el("li", null, el("div", { class: "exercise-prompt" }, U.formatText(ex.prompt)));
          if (!U.isBlank(ex.answer)) {
            const answer = el("div", { class: "exercise-answer", hidden: true }, U.formatText(ex.answer));
            const btn = el("button", {
              type: "button",
              class: "btn btn-ghost btn-small answer-toggle",
              "aria-expanded": "false",
              onclick: function () {
                const show = answer.hidden;
                answer.hidden = !show;
                btn.textContent = show ? "Ukryj odpowiedź" : "Pokaż odpowiedź";
                btn.setAttribute("aria-expanded", show ? "true" : "false");
              }
            }, "Pokaż odpowiedź");
            li.appendChild(btn);
            li.appendChild(answer);
          }
          return li;
        }));
      }
    }));

    return card;
  }

  /** Sekcja tematu z nagłówkiem. W podglądzie pusta sekcja nie jest rysowana. */
  function topicSection(title, content, isEmpty) {
    if (!isEdit() && isEmpty) return document.createTextNode("");
    return el("section", { class: "topic-section" }, [
      el("h4", { class: "topic-section-title", text: title }),
      content
    ]);
  }

  /** Sekcja z listą elementów (przykłady, błędy, ćwiczenia). */
  function listSection(cfg) {
    const list = cfg.list;
    const hasContent = function (item) {
      return cfg.fields.some(function (f) { return !U.isBlank(item[f.key]); });
    };

    if (!isEdit()) {
      const items = list.filter(hasContent);
      return topicSection(cfg.title, items.length ? cfg.renderPreview(items) : null, !items.length);
    }

    const box = el("div");
    if (!list.length) box.appendChild(el("p", { class: "empty-hint", text: cfg.emptyHint }));

    const rows = el("div", { class: "edit-list" });
    list.forEach(function (item, index) {
      const fields = cfg.fields.map(function (f, fi) {
        const field = boundField(item, f.key, {
          multiline: f.multiline,
          rows: 1,
          placeholder: f.placeholder,
          label: f.label + " " + (index + 1),
          focusId: fi === 0 ? item.id : null
        });
        return cfg.fields.length > 1 ? labeled(f.label, field) : field;
      });
      rows.appendChild(el("div", { class: "edit-row" + (cfg.boxed ? " is-boxed" : "") }, [
        cfg.numbered ? el("span", { class: "edit-row-num", text: (index + 1) + "." }) : null,
        el("div", { class: "edit-row-fields" }, fields),
        rowControls(list, index, function () { editor().deleteItem(list, index, cfg.labels.what); }, cfg.labels)
      ]));
    });
    if (list.length) box.appendChild(rows);

    box.appendChild(textBtn(cfg.addLabel, function () { editor().addItem(list, cfg.newItem()); }, "btn-ghost"));
    return topicSection(cfg.title, box, false);
  }

  /** Podczas pisania nazwy tematu odświeża tylko napis na zakładce. */
  function updateTabLabel(topicId, value) {
    const tab = document.querySelector('[data-topic-tab="' + CSS.escape(topicId) + '"]');
    if (!tab) return;
    const blank = U.isBlank(value);
    tab.textContent = blank ? "Temat bez nazwy" : value;
    tab.classList.toggle("is-untitled", blank);
  }

  ELM.render = {
    renderSidebar: renderSidebar,
    renderMain: renderMain,
    updateEssentialsProgress: updateEssentialsProgress,
    iconBtn: iconBtn
  };
})(window.ELM);
