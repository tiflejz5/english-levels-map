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

  /** Górna część lewego panelu: Dziś, Fiszki i błędy (jedna plakietka), Ćwiczenia, Lab czasów, Pisanie. */
  function renderToolsNav() {
    const box = document.getElementById("tools-nav");
    if (!box) return;
    const st = ELM.state;
    const hasProfile = app().hasProfiles();
    const reviews = hasProfile && ELM.reviews ? ELM.reviews.count() : 0; // jedna liczba: fiszki + Moje błędy + słabe punkty
    const items = [
      { href: "#/dzis", label: "Dziś", icon: "sunrise", active: st.view === "today" },
      { href: "#/powtorki", label: "Fiszki i błędy", icon: "layers", active: st.view === "powtorki" || st.view === "fiszki" || st.view === "journal",
        badge: reviews ? String(reviews) : null, badgeLabel: reviews ? reviews + " do powtórki" : null },
      { href: "#/cwiczenia", label: "Ćwiczenia", icon: "dumbbell", active: st.view === "exercises" && !finalTestLevel() },
      { href: "#/laboratorium-czasow", label: "Lab czasów", icon: "flask-conical", active: st.view === "lab" },
      { href: "#/pisanie", label: "Pisanie", icon: "pencil", active: st.view === "pisanie" }
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
    const currentId = ELM.today && ELM.today.currentLevelId ? ELM.today.currentLevelId() : null;

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
        const ring = ELM.ui.progressRing(s.percent, { size: 36, stroke: 4, node: ELM.ui.landIcon(level.id, { size: 20 }), label: "Postęp poziomu " + level.id });
        const fill = el("div", { class: "progress-fill", style: "transform:scaleX(" + s.percent / 100 + ")" });
        const count = el("span", { class: "sb-label-sub num" });
        const title = el("span", { class: "sb-label-title" });
        // Kółko poziomu w opakowaniu: na nim ląduje znaczek zaliczonego testu końcowego (paczka v6)
        const ringWrap = el("span", { class: "sb-ring-wrap" }, [ring, el("span", { class: "sb-ring-code", "aria-hidden": "true", text: level.id })]);
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
      const oldStamp = n.ringWrap.querySelector(".stamp");
      if (oldStamp) oldStamp.remove();
      if (passedText) n.ringWrap.appendChild(ELM.ui.stamp(level.id, { size: 16 })); // pieczątka ✓ w rogu kółka
      n.a.classList.toggle("is-passed", !!passedText);
      n.a.classList.toggle("is-current", level.id === currentId);
      n.a.setAttribute("aria-label", "Poziom " + level.id + (name ? ", " + name : "") + ": umiem " + s.done + " z " + s.total +
        " we wszystkich kategoriach (" + s.percent + "%)" + (passedText ? ". " + passedText : "") + (level.id === currentId ? ". Bieżąca kraina" : ""));
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
    if (ELM.state.view === "powtorki") return ELM.powtorki.render();
    if (ELM.state.view === "journal") return ELM.journal.render(ELM.state.toolRoute);
    if (ELM.state.view === "today") return ELM.today.render();
    if (ELM.state.view === "leveltest") return ELM.levelTest.render();
    if (ELM.state.view === "exercises") return ELM.exercises.render(ELM.state.toolRoute);
    if (ELM.state.view === "lab") return ELM.tenseLab.render(ELM.state.toolRoute);
    if (ELM.state.view === "stats") return ELM.statsPage.render();
    if (ELM.state.view === "notes") return ELM.notes.render();
    if (ELM.state.view === "fiszki") return ELM.fiszki.render();
    if (ELM.state.view === "pisanie") return ELM.pisanie.render();
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

    const all = ELM.state.ui.categoryId === app().ALL_CATEGORIES;
    if (!cat && !all) {
      view.appendChild(emptyState("Brak kategorii na tym poziomie."));
    } else {
      view.appendChild(renderEssentials(level, cat, cat ? app().getBucket(level.id, cat.id) : null));
      // Pod listą: podsumowanie poziomu (niezbednik/podsumowania/<poziom>.md)
      const summary = ELM.niezbednik.renderSummary(level.id);
      if (summary) view.appendChild(summary);
    }
    // Pod podsumowaniem: karta „Test końcowy A1” (paczka v6, spec 13 sekcja 2)
    if (ELM.levelFinal) view.appendChild(ELM.levelFinal.card(level.id));
    // Obok podsumowania: karta „Ściąga A2 – jedna strona do druku” (spec v6 16, sekcja 1.2)
    const sciaga = ELM.niezbednik.sciagaCard(level.id);
    if (sciaga) view.insertBefore(sciaga, view.querySelector(".lf-level-card"));

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
        el("p", { class: "level-kicker" }, [ELM.ui.landIcon(level.id, { size: 16 }), ELM.ui.landLabel(level.id)]),
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
      const allId = app().ALL_CATEGORIES;
      const options = [{ id: allId, name: "Wszystkie" }].concat(cats);
      bar.appendChild(el("div", { class: "chip-filter", role: "group", "aria-label": "Kategoria" },
        options.map(function (c) {
          const active = c.id === allId ? ELM.state.ui.categoryId === allId : !!(activeCat && c.id === activeCat.id);
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

  /** Wiersz punktu poziomu: „Umiem” po lewej, tekst (link do podstrony) z chevronem po prawej. */
  function essRow(item) {
    const progress = ELM.state.progress;
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
          checkbox.classList.toggle("is-fresh", e.target.checked); // pieczątka „odbija się” tylko przy zaznaczeniu
        }
      }),
      el("span", { class: "visually-hidden", text: "Umiem" })
    ]);
    li = el("li", { class: "ess-item" + (done ? " is-done" : "") + (pageLink ? " has-page" : ""), "data-topic": pageLink ? pageLink.item.id : null }, [
      checkbox,
      el("div", { class: "ess-text", id: textId }, pageLink
        // Punkt z podstroną: tekst jest linkiem
        ? el("a", { class: "ess-link", href: ELM.niezbednik.routeOf(pageLink.item), onclick: rememberScroll }, [
            el("span", null, U.formatText(item.text)),
            el("span", { class: "ess-link-arrow", "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 18 }))
          ])
        : U.formatText(item.text))
    ]);
    return li;
  }

  /** Puste punkty (bez tekstu) nie są pokazywane. */
  function visibleEssentials(bucket) {
    return bucket.essentials.filter(function (e) { return !U.isBlank(e.text); });
  }

  /** Lista punktów; cat = null oznacza filtr „Wszystkie” (grupy z podtytułami kategorii). */
  function renderEssentials(level, cat, bucket) {
    const stats = cat ? app().getStats(level.id, cat.id) : app().getLevelStats(level.id);

    const section = el("section", { class: "essentials", "aria-labelledby": "ess-title" }, [
      el("div", { class: "section-head" }, [
        el("h2", { class: "section-title", id: "ess-title", text: "Essentials" }),
        el("span", { class: "section-sub", text: "Co warto umieć na poziomie " + level.id })
      ]),
      el("div", { class: "essentials-progress", id: "ess-progress" }, [
        progressBar(stats.percent, false, cat ? "Postęp w tej kategorii" : "Postęp na tym poziomie"),
        el("span", { class: "progress-text", text: progressLabel(stats, !cat) })
      ])
    ]);

    const groups = cat
      ? [{ cat: cat, items: visibleEssentials(bucket) }]
      : ELM.state.content.categories.map(function (c) { return { cat: c, items: visibleEssentials(app().getBucket(level.id, c.id)) }; });
    let any = false;
    groups.forEach(function (g) {
      if (!g.items.length) return;
      any = true;
      if (!cat) section.appendChild(el("h3", { class: "ess-group-title", text: g.cat.name || "Bez nazwy" }));
      const ul = el("ul", { class: "ess-list" });
      g.items.forEach(function (item) { ul.appendChild(essRow(item)); });
      section.appendChild(ul);
    });
    if (!any) {
      section.appendChild(emptyState("Brak punktów w tej kategorii."));
      return section;
    }
    // Etykiety „zestaw 8/10” przed strzałką (najlepszy wynik zestawu tematu), dopisywane po wczytaniu indeksu ćwiczeń (S4)
    if (ELM.exercises && ELM.exercises.setLabels) {
      const rows = section.querySelectorAll("li[data-topic]");
      const topics = Array.prototype.map.call(rows, function (r) { return r.getAttribute("data-topic"); });
      ELM.exercises.setLabels(topics).then(function (labels) {
        Array.prototype.forEach.call(rows, function (row) {
          const lab = labels[row.getAttribute("data-topic")];
          const arrow = row.querySelector(".ess-link-arrow");
          if (!lab || !arrow || row.querySelector(".ess-set")) return;
          arrow.parentNode.insertBefore(el("span", { class: "ess-set" + (lab.high ? " is-high" : ""), title: "Najlepszy wynik zestawu zadań z tego tematu" }, [
            lab.high ? el("span", { class: "ess-set-dot", "aria-hidden": "true" }) : null, lab.text
          ]), arrow);
        });
      });
    }
    // Pod słownictwem A1–B1: link do talii tematycznych fiszek (lista przefiltrowana po poziomie)
    if ((!cat || cat.id === "cat_vocabulary") && /^(A1|A2|B1)$/.test(level.id) && ELM.fiszki) {
      section.appendChild(el("p", { class: "fc-themes-link" }, el("a", { class: "btn btn-secondary", href: "#/powtorki/talie/tematy/" + level.id.toLowerCase() },
        ELM.ui.withIcon("layers", "Fiszki tematyczne: Dom, Jedzenie, Praca, Podróże, Zdrowie, Emocje, Technologia"))));
    }
    return section;
  }

  /** Zapamiętuje przewinięcie listy przed przejściem na podstronę. */
  function rememberScroll() {
    ELM.state.listScroll = U.getScroll();
  }

  function progressLabel(stats, wholeLevel) {
    // „w tej kategorii”: lewy panel i strona „Dziś” liczą cały poziom (wszystkie kategorie)
    return stats.done + " z " + stats.total + (wholeLevel ? " umiem na tym poziomie · " : " umiem w tej kategorii · ") + stats.percent + "%";
  }

  /** Aktualizuje pasek postępu essentials bez przerysowania całej strony. */
  function updateEssentialsProgress() {
    const box = document.getElementById("ess-progress");
    const cat = app().getActiveCategory();
    const all = ELM.state.ui.categoryId === app().ALL_CATEGORIES;
    if (!box || (!cat && !all)) return;
    const stats = cat ? app().getStats(ELM.state.ui.levelId, cat.id) : app().getLevelStats(ELM.state.ui.levelId);
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
    box.querySelector(".progress-text").textContent = progressLabel(stats, !cat);
  }

  ELM.render = {
    renderSidebar: renderSidebar,
    renderToolsNav: renderToolsNav,
    renderMain: renderMain,
    updateEssentialsProgress: updateEssentialsProgress,
    iconBtn: iconBtn
  };
})(window.ELM);
