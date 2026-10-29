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

  /** Wypełnienie paska jako transform: scaleX (animuje się płynnie, bez przeliczania układu). */
  function fillStyle(percent) {
    return "transform:scaleX(" + Math.max(0, Math.min(100, percent)) / 100 + ")";
  }

  /** Pasek postępu. percent: 0–100. */
  function progressBar(percent, small, label) {
    return el("div", {
      class: "progress" + (small ? " is-small" : ""),
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": String(percent),
      "aria-label": label || "Postęp"
    }, el("div", { class: "progress-fill", style: fillStyle(percent) }));
  }

  /** Okrągły przycisk z symbolem i czytelną etykietą dla czytników ekranu. */
  function iconBtn(symbol, label, onClick, opts) {
    opts = opts || {};
    return el("button", {
      type: "button",
      class: "icon-btn" + (opts.danger ? " is-danger" : ""),
      "aria-label": label,
      "data-tooltip": label,
      disabled: !!opts.disabled,
      onclick: onClick
    }, ELM.ICON_NODES && ELM.ICON_NODES[symbol] ? ELM.icon(symbol, { size: 18 }) : el("span", { "aria-hidden": "true", text: symbol }));
  }

  /** Pusty stan z komunikatem. */
  function emptyState(message) {
    return el("div", { class: "empty-state" }, el("p", { class: "empty-state-text", text: message }));
  }

  // =====================================================================
  // LEWY PANEL
  // =====================================================================

  /**
   * Pozycja lewego panelu: ikona (zawsze widoczna, także w wąskim pasku)
   * + etykieta (widoczna po rozwinięciu). Etykieta zostaje w DOM, więc
   * czytniki ekranu zawsze znają nazwę pozycji.
   */
  function sbItem(o) {
    return el("a", {
      class: "sb-item" + (o.cls ? " " + o.cls : "") + (o.active ? " is-active" : ""),
      href: o.href,
      "aria-current": o.active ? "page" : null,
      "aria-label": o.ariaLabel || null,
      onclick: o.onclick || null
    }, [
      el("span", { class: "sb-icon", "aria-hidden": "true" }, o.icon),
      el("span", { class: "sb-label" }, o.label),
      o.badge ? el("span", { class: "sb-badge num", "aria-hidden": "true", text: o.badge }) : null
    ]);
  }

  /** Poziom, którego test końcowy jest na ekranie (#/a1/test → "A1") albo null — wtedy w panelu świeci poziom, a nie „Ćwiczenia”. */
  function finalTestLevel() {
    const m = /^#\/([abcABC][12])\/test\/?$/.exec(location.hash || "");
    return m ? m[1].toUpperCase() : null;
  }

  /** Górna część lewego panelu: narzędzia nauki (Ćwiczenia, Lab czasów, Dziennik błędów z liczbą powtórek). */
  function renderToolsNav() {
    const box = document.getElementById("tools-nav");
    if (!box) return;
    const st = ELM.state;
    const hasProfile = app().hasProfiles();
    const due = hasProfile && ELM.profileData ? ELM.profileData.dueCount() : 0;
    const cardsDue = hasProfile && ELM.fiszki ? ELM.fiszki.badgeCount() : 0; // fiszki do powtórki dziś (w tym nowe)
    const items = [
      { href: "#/dzis", label: "Dziś", icon: "sunrise", active: st.view === "today" },
      { href: "#/test-poziomu", label: "Test poziomu", icon: "target", active: st.view === "leveltest" },
      { href: "#/cwiczenia", label: "Ćwiczenia", icon: "dumbbell", active: st.view === "exercises" && !finalTestLevel() },
      { href: "#/laboratorium-czasow", label: "Lab czasów", icon: "flask-conical", active: st.view === "lab" },
      { href: "#/fiszki", label: "Fiszki", icon: "layers", active: st.view === "fiszki",
        badge: cardsDue ? String(cardsDue) : null, badgeLabel: cardsDue ? cardsDue + " " + (cardsDue === 1 ? "karta" : cardsDue % 10 >= 2 && cardsDue % 10 <= 4 && (cardsDue % 100 < 12 || cardsDue % 100 > 14) ? "karty" : "kart") + " do powtórki" : null },
      { href: "#/statystyki", label: "Statystyki", icon: "chart-column", active: st.view === "stats" },
      { href: "#/bledy", label: "Dziennik błędów", icon: "notebook-pen", active: st.view === "journal",
        badge: due ? String(due) : null, badgeLabel: due ? "powtórki na dziś: " + due : null }
    ];
    box.replaceChildren(el("ul", { class: "sb-list" }, items.map(function (it) {
      return el("li", null, sbItem({
        href: it.href,
        active: it.active,
        cls: "is-tool",
        icon: ELM.icon(it.icon, { size: 22 }),
        label: el("span", { class: "sb-label-title", text: it.label }),
        badge: it.badge,
        ariaLabel: it.badgeLabel ? it.label + ", " + it.badgeLabel : null
      }));
    })));
  }

  /** Nazwa poziomu z pierwszej linii opisu („**Początkujący**” → „Początkujący”). */
  function levelName(level) {
    const m = /^\*\*(.+?)\*\*\s*$/.exec(String(level.description || "").split("\n")[0]);
    return m ? m[1] : "";
  }

  // Elementy poziomów budujemy raz i potem tylko aktualizujemy (pierścienie
  // i paski przechodzą płynnie z poprzedniej wartości, bez migania od zera).
  const levelNodes = {};

  function renderSidebar() {
    renderToolsNav();
    const st = ELM.state;
    const list = document.getElementById("level-list");

    // Napis pod logo (stały; postęp w panelu dotyczy całych poziomów)
    document.getElementById("sidebar-category-name").textContent = "Mapa angielskiego A1–C2";

    let ul = list.querySelector(":scope > ul.sb-list");
    if (!ul) { ul = el("ul", { class: "sb-list" }); list.replaceChildren(ul); }

    st.content.levels.forEach(function (level) {
      const s = app().getLevelStats(level.id);
      // Poziom jest wyróżniony na jego liście i jego podstronach
      const active = ((st.view === "level" || st.view === "page") && level.id === st.ui.levelId) || finalTestLevel() === level.id;
      const name = levelName(level);
      let n = levelNodes[level.id];
      if (!n || !ul.contains(n.a)) {
        const ring = ELM.ui.progressRing(s.percent, { size: 42, stroke: 4, text: level.id, label: "Postęp poziomu " + level.id });
        const fill = el("div", { class: "progress-fill", style: "transform:scaleX(" + s.percent / 100 + ")" });
        const count = el("span", { class: "sb-label-sub num" });
        const title = el("span", { class: "sb-label-title" });
        // Kółko poziomu w opakowaniu: na nim ląduje znaczek zaliczonego testu końcowego (paczka v6)
        const ringWrap = el("span", { class: "sb-ring-wrap" }, ring);
        const a = sbItem({
          href: app().levelHash(level.id),
          cls: "is-level lvl-" + level.id,
          icon: ringWrap,
          label: [title, count, el("span", { class: "progress is-small sb-bar", "aria-hidden": "true" }, fill)],
          // Ten sam adres co obecny: przerysuj listę (np. powrót na górę) zamiast nic nie robić
          onclick: function (e) {
            if (location.hash === app().levelHash(level.id)) { e.preventDefault(); app().selectLevel(level.id); }
          }
        });
        n = levelNodes[level.id] = { a: a, ring: ring, ringWrap: ringWrap, fill: fill, count: count, title: title };
        ul.appendChild(el("li", null, a));
      }
      n.title.textContent = level.id + (name ? " · " + name : "");
      n.count.textContent = s.done + " / " + s.total + " umiem";
      n.fill.style.transform = "scaleX(" + s.percent / 100 + ")";
      ELM.ui.setRing(n.ring, s.percent);
      n.ring.removeAttribute("role"); // nazwę i wartość ogłasza link (aria-label), pierścień jest ozdobą
      n.ring.setAttribute("aria-hidden", "true");
      n.a.classList.toggle("is-active", active);
      if (active) n.a.setAttribute("aria-current", "page"); else n.a.removeAttribute("aria-current");
      // Znaczek zaliczonego testu końcowego: ikona nagrody na kółku + tekst „A1 zaliczony 12.11.2026” w etykiecie linku
      const passedText = ELM.levelFinal ? ELM.levelFinal.passedText(level.id) : null;
      const oldStamp = n.ringWrap.querySelector(".lvl-stamp");
      if (oldStamp) oldStamp.remove();
      if (passedText) n.ringWrap.appendChild(ELM.levelFinal.stamp(level.id, { hideText: true, size: 12 }));
      n.a.classList.toggle("is-passed", !!passedText);
      n.a.setAttribute("aria-label", "Poziom " + level.id + (name ? ", " + name : "") + ": umiem " + s.done + " z " + s.total +
        " we wszystkich kategoriach (" + s.percent + "%)" + (passedText ? ". " + passedText : ""));
    });

    // Pod poziomami: grupa „Egzaminy” z rejestru (E8, matury, B2…), na końcu Certyfikat C1 (własny moduł)
    if (ELM.exams) ELM.exams.renderNav();
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
    if (ELM.state.view === "exam") return ELM.exams.render(ELM.state.toolRoute);
    if (ELM.state.view === "journal") return ELM.journal.render(ELM.state.toolRoute);
    if (ELM.state.view === "today") return ELM.today.render();
    if (ELM.state.view === "leveltest") return ELM.levelTest.render();
    if (ELM.state.view === "exercises") return ELM.exercises.render(ELM.state.toolRoute);
    if (ELM.state.view === "lab") return ELM.tenseLab.render(ELM.state.toolRoute);
    if (ELM.state.view === "stats") return ELM.statsPage.render();
    if (ELM.state.view === "notes") return ELM.notes.render();
    if (ELM.state.view === "fiszki") return ELM.fiszki.render();
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
    // Pod podsumowaniem: karta „Test końcowy A1” (paczka v6, spec 13 sekcja 2)
    if (ELM.levelFinal) view.appendChild(ELM.levelFinal.card(level.id));

    U.setScroll(typeof opts.scrollTop === "number" ? opts.scrollTop : scroll);
  }

  // ---------- Nagłówek poziomu ----------

  /**
   * Nagłówek poziomu: duży znak poziomu w kolorze krainy, nazwa i cel (z opisu),
   * pierścień postępu całego poziomu (wszystkie kategorie).
   */
  function renderLevelHeader(level) {
    const name = levelName(level);
    const rest = String(level.description || "").split("\n").slice(name ? 1 : 0).join("\n").trim();
    const s = app().getLevelStats(level.id);
    const ring = ELM.ui.progressRing(s.percent, { size: 104, stroke: 8, label: "Postęp poziomu " + level.id + " we wszystkich kategoriach", text: s.percent + "%" });
    ring.id = "level-ring";
    return el("header", { class: "card level-hero" }, [
      el("div", { class: "level-hero-text" }, [
        el("p", { class: "level-kicker", text: "Poziom" }),
        el("h1", { class: "level-title" }, [
          el("span", { class: "level-code-big", text: level.id }),
          name ? el("span", { class: "level-name", text: name }) : null
        ]),
        rest ? el("p", { class: "level-desc" }, U.formatText(rest)) : null
      ]),
      el("div", { class: "level-hero-ring" }, [
        ring,
        el("p", { class: "level-ring-label num", id: "level-ring-label", text: s.done + " z " + s.total + " umiem" }),
        el("p", { class: "level-ring-scope", text: "wszystkie kategorie" }),
        ELM.levelFinal ? ELM.levelFinal.headerLabel(level.id) : null // „Zaliczony · 12.11.2026” (test końcowy)
      ])
    ]);
  }

  // ---------- Kategorie ----------

  function renderCategoryBar(activeCat) {
    const cats = ELM.state.content.categories;
    const bar = el("div", { class: "category-bar" });
    if (cats.length) {
      // Filtr kategorii jako chipy (jeden wybrany naraz, aria-pressed)
      bar.appendChild(el("div", { class: "chip-filter", role: "group", "aria-label": "Kategoria" },
        cats.map(function (c) {
          const active = activeCat && c.id === activeCat.id;
          return el("button", {
            type: "button",
            class: "chip-btn" + (active ? " is-active" : ""),
            "aria-pressed": active ? "true" : "false",
            onclick: function () { app().selectCategory(c.id); }
          }, [active ? ELM.icon("check", { size: 16 }) : null, c.name || "Bez nazwy"]);
        })
      ));
    }
    return bar;
  }

  // ---------- Essentials ----------

  function renderEssentials(level, cat, bucket) {
    const stats = app().getStats(level.id, cat.id);
    const progress = ELM.state.progress;

    const section = el("section", { class: "essentials", "aria-labelledby": "ess-title" }, [
      el("div", { class: "section-head" }, [
        el("h2", { class: "section-title", id: "ess-title", text: "Essentials" }),
        el("span", { class: "section-sub", text: "Co warto umieć na poziomie " + level.id })
      ]),
      el("div", { class: "essentials-progress", id: "ess-progress" }, [
        progressBar(stats.percent, false, "Postęp w tej kategorii"),
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
        el("span", { class: "chip is-level ess-chip", text: cat.name || "Kategoria" }),
        el("div", { class: "ess-text", id: textId }, pageLink
          // Punkt z podstroną: tekst jest linkiem
          ? el("a", { class: "ess-link", href: ELM.niezbednik.routeOf(pageLink.item), onclick: rememberScroll }, [
              U.formatText(item.text),
              el("span", { class: "ess-link-arrow", "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 16 }))
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
    // „w tej kategorii”: lewy panel i strona „Dziś” liczą cały poziom (wszystkie kategorie)
    return stats.done + " z " + stats.total + " umiem w tej kategorii · " + stats.percent + "%";
  }

  /** Aktualizuje pasek postępu essentials bez przerysowania całej strony. */
  function updateEssentialsProgress() {
    const box = document.getElementById("ess-progress");
    const cat = app().getActiveCategory();
    if (!box || !cat) return;
    const stats = app().getStats(ELM.state.ui.levelId, cat.id);
    const bar = box.querySelector(".progress");
    bar.setAttribute("aria-valuenow", String(stats.percent));
    bar.querySelector(".progress-fill").style.transform = fillStyle(stats.percent).slice("transform:".length);
    // Pierścień w nagłówku: cały poziom (wszystkie kategorie)
    const ring = document.getElementById("level-ring");
    if (ring) {
      const ls = app().getLevelStats(ELM.state.ui.levelId);
      ELM.ui.setRing(ring, ls.percent, ls.percent + "%");
      const lbl = document.getElementById("level-ring-label");
      if (lbl) lbl.textContent = ls.done + " z " + ls.total + " umiem";
    }
    box.querySelector(".progress-text").textContent = progressLabel(stats);
  }

  ELM.render = {
    renderSidebar: renderSidebar,
    renderToolsNav: renderToolsNav,
    renderMain: renderMain,
    updateEssentialsProgress: updateEssentialsProgress,
    iconBtn: iconBtn
  };
})(window.ELM);
