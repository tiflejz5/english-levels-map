/*
 * render.js — rysowanie widoków: lewy panel (poziomy), nagłówek poziomu,
 * kategorie, lista essentials z polem „Umiem” i podsumowanie poziomu.
 *
 * Treść listy jest tylko do odczytu (dawny „Tryb edycji” został usunięty).
 * Każdy tekst trafia do DOM jako tekst (textContent), nigdy jako HTML.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  // Skróty do innych części aplikacji (ładowane później, używane w trakcie działania)
  function app() { return ELM.app; }

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

  /** Okrągły przycisk z symbolem i czytelną etykietą dla czytników ekranu. */
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

  /** Pusty stan z komunikatem. */
  function emptyState(message) {
    return el("div", { class: "empty-state" }, el("p", { class: "empty-state-text", text: message }));
  }

  // =====================================================================
  // LEWY PANEL
  // =====================================================================

  function renderSidebar() {
    const st = ELM.state;
    const list = document.getElementById("level-list");
    const cat = app().getActiveCategory();

    document.getElementById("sidebar-category-name").textContent = cat ? (cat.name || "Kategoria bez nazwy") : "Brak kategorii";

    list.replaceChildren();
    st.content.levels.forEach(function (level) {
      const stats = app().getStats(level.id, cat ? cat.id : null);
      // Poziom jest wyróżniony tylko na jego liście i jego podstronach
      const active = (st.view === "level" || st.view === "page") && level.id === st.ui.levelId;
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

    // Pod poziomami: zakładka „Certyfikat C1”
    if (ELM.c1) ELM.c1.renderNav();
  }

  // =====================================================================
  // TREŚĆ POZIOMU (prawa część)
  // =====================================================================

  function renderMain(opts) {
    opts = opts || {};
    // Bez żadnego profilu: ekran powitalny z „Dodaj profil” (na każdym adresie)
    if (!app().hasProfiles()) return ELM.profiles.renderWelcome();
    // Strona główna, zakładka „Certyfikat C1” albo podstrona zamiast listy
    if (ELM.state.view === "home") return ELM.niezbednik.renderHome();
    if (ELM.state.view === "c1") return ELM.c1.render(ELM.state.c1Route);
    if (ELM.state.route) return ELM.niezbednik.renderPage(ELM.state.route);
    ELM.niezbednik.computeLinks();
    const view = document.getElementById("view");
    const scroll = opts.resetScroll ? 0 : U.getScroll();
    const level = app().getActiveLevel();
    const cat = app().getActiveCategory();

    view.className = "view lvl-" + level.id;
    delete view.dataset.file;
    view.replaceChildren();

    view.appendChild(renderLevelHeader(level));
    view.appendChild(renderCategoryBar(cat));

    if (!cat) {
      view.appendChild(emptyState("Brak kategorii na tym poziomie."));
    } else {
      const bucket = app().getBucket(level.id, cat.id);
      view.appendChild(renderEssentials(level, cat, bucket));
      // Pod listą: podsumowanie poziomu (niezbednik/podsumowania/<poziom>.md)
      const summary = ELM.niezbednik.renderSummary(level.id);
      if (summary) view.appendChild(summary);
    }

    U.setScroll(typeof opts.scrollTop === "number" ? opts.scrollTop : scroll);
  }

  // ---------- Nagłówek poziomu ----------

  function renderLevelHeader(level) {
    const header = el("header", { class: "level-header" }, [
      el("h1", { class: "level-title" }, [
        el("span", { class: "level-dot", "aria-hidden": "true" }),
        level.id
      ])
    ]);
    if (!U.isBlank(level.description)) {
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
    return bar;
  }

  // ---------- Essentials ----------

  function renderEssentials(level, cat, bucket) {
    const stats = app().getStats(level.id, cat.id);
    const progress = ELM.state.progress;

    const section = el("section", { class: "card essentials", "aria-labelledby": "ess-title" }, [
      el("div", { class: "section-head" }, [
        el("h2", { class: "section-title", id: "ess-title", text: "Essentials" }),
        el("span", { class: "section-sub", text: "Co warto umieć na poziomie " + level.id })
      ]),
      el("div", { class: "essentials-progress", id: "ess-progress" }, [
        progressBar(stats.percent, false, "Postęp essentials"),
        el("span", { class: "progress-text", text: progressLabel(stats) })
      ])
    ]);

    // Puste punkty (bez tekstu) nie są pokazywane
    const visible = bucket.essentials.filter(function (e) { return !U.isBlank(e.text); });
    if (!visible.length) {
      section.appendChild(emptyState("Brak punktów w tej kategorii."));
      return section;
    }

    const ul = el("ul", { class: "ess-list" });
    visible.forEach(function (item) {
      const done = progress[item.id] === true;
      const textId = "ess-text-" + item.id;
      const pageLink = ELM.niezbednik.linkForEssential(item.id);
      let li = null;
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
      ul.appendChild(li);
    });
    section.appendChild(ul);
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
