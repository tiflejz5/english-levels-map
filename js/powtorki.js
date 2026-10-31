/*
 * powtorki.js — widok „Fiszki i błędy” (#/powtorki, paczka v8, spec 20 R3).
 *
 *   #/powtorki[/na-dzis]        zakładka „Na dziś”: karta z liczbą, rozbiciem i „Powtarzaj teraz” (ten plik)
 *   #/powtorki/talie[/…]        zakładka „Talie” (js/fiszki.js, js/fiszki-browse.js)
 *   #/powtorki/moje-bledy       zakładka „Moje błędy” (js/journal.js)
 *   #/powtorki/moje-slowa       zakładka „Moje słowa” (js/fiszki-words.js)
 *   #/powtorki/sesja[?tylko=…]  sesja zunifikowana (js/fiszki.js)
 *
 * Liczby i kolejka: js/reviews.js. Tu: wspólny nagłówek z zakładkami (role="tablist"), karta „Na dziś”
 * (ta sama na stronie Dziś) i widok pierwszej zakładki.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const HOME = "#/powtorki";
  const TABS = [
    { id: "dzis", label: "Na dziś", href: HOME },
    { id: "talie", label: "Talie", href: "#/powtorki/talie" },
    { id: "bledy", label: "Moje błędy", href: "#/powtorki/moje-bledy" },
    { id: "slowa", label: "Moje słowa", href: "#/powtorki/moje-slowa" }
  ];
  const ROWS = [
    { kind: "card", label: "Fiszki z talii", only: "talie" },
    { kind: "mistake", label: "Błędy z dziennika", only: "bledy" },
    { kind: "exercise", label: "Słabe punkty z ćwiczeń", only: "slabe" }
  ];

  function hasProfile() { return !!(ELM.app && ELM.app.getActiveProfile()); }
  function plural(n, one, few, many) { return ELM.c1 ? ELM.c1.plural(n, one, few, many) : many; }

  function parseRoute(hash) {
    return /^#\/powtorki(?:\/na-dzis)?\/?$/.test(hash || "") ? { kind: "today" } : null;
  }

  // ---------- nagłówek i zakładki ----------

  /** Zakładki widoku. Aktywna ma aria-selected i tabindex 0; strzałki, Home i End przesuwają fokus, Enter / Spacja otwiera. */
  function tabs(active) {
    const items = TABS.map(function (t) {
      const on = t.id === active;
      return el("a", {
        class: "pw-tab" + (on ? " is-active" : ""), href: t.href, role: "tab", id: "pw-tab-" + t.id,
        "aria-selected": on ? "true" : "false", tabindex: on ? "0" : "-1"
      }, t.label);
    });
    const list = el("div", { class: "pw-tabs", role: "tablist", "aria-label": "Fiszki i błędy" }, items);
    list.addEventListener("keydown", function (e) {
      const i = items.indexOf(document.activeElement);
      if (i === -1) return;
      let j = -1;
      if (e.key === "ArrowRight") j = (i + 1) % items.length;
      else if (e.key === "ArrowLeft") j = (i + items.length - 1) % items.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = items.length - 1;
      else if (e.key === " ") { e.preventDefault(); items[i].click(); return; }
      if (j === -1) return;
      e.preventDefault();
      items.forEach(function (n, k) { n.tabIndex = k === j ? 0 : -1; });
      items[j].focus();
    });
    return list;
  }

  /** Nagłówek strony „Fiszki i błędy” (etykieta „Nauka”, liczba na dziś) z zakładkami; tab: dzis | talie | bledy | slowa. */
  function header(tab, lead) {
    const count = hasProfile() && ELM.reviews ? ELM.reviews.count() : 0;
    const head = ELM.ui.pageHead({ eyebrow: "Nauka", title: "Fiszki i błędy", lead: lead });
    const h1 = head.querySelector("h1");
    if (h1 && count) h1.appendChild(el("span", { class: "pw-count num", text: count + " do powtórki", "aria-label": count + " " + plural(count, "pozycja", "pozycje", "pozycji") + " do powtórki dziś" }));
    return el("div", { class: "pw-head" }, [head, tabs(tab)]);
  }

  // ---------- karta „Na dziś” ----------

  function openAddMistake(after) {
    if (!ELM.journal) return;
    ELM.journal.openForm().then(function (r) { if (r && after) after(); });
  }

  /**
   * Karta: liczba pozycji na dziś, rozbicie na fiszki / błędy / zadania, „Powtarzaj teraz” i „Krótka sesja (10)”.
   * opts.today — wersja na stronie Dziś (siatka 220 px / 1fr / 240 px, bez „Krótka sesja”); gdy nic nie czeka, niska karta z jedną linijką.
   * Na zakładce „Na dziś” stan zerowy to stan pusty z najbliższym terminem.
   */
  function card(opts) {
    opts = opts || {};
    const b = ELM.reviews.breakdown();
    const minutes = ELM.reviews.estimateMinutes(b);
    const titleId = "pw-card-title" + (opts.today ? "-today" : "");
    const section = el("section", { class: "card pw-card" + (opts.today ? " is-today" : ""), "aria-labelledby": titleId });

    if (!b.total && opts.today) return zeroCard();
    if (!b.total) {
      const next = ELM.reviews.nextDue(Date.now());
      section.appendChild(el("h2", { class: "tile-title", id: titleId, text: "Fiszki i błędy" }));
      section.appendChild(ELM.ui.emptyState({
        art: "brak-powtorek", title: "Na dziś koniec",
        hint: next ? "Najbliższa powtórka: " + ELM.fiszki.internal.fmtWhen(next) + "." : "Włącz talię, zapisz błąd albo zrób kilka ćwiczeń – wrócą tu w rosnących odstępach.",
        class: "es-tile"
      }));
      section.appendChild(links());
      return section;
    }

    section.appendChild(el("div", { class: "pw-card-main" }, [
      el("h2", { class: "pw-card-label", id: titleId, text: "Fiszki i błędy" }),
      el("p", { class: "pw-card-count" }, el("strong", { class: "num today-number", text: String(b.total) })),
      el("p", { class: "pw-card-sub", text: "do powtórki · ok. " + minutes + " min" })
    ]));
    section.appendChild(el("ul", { class: "pw-rows" }, ROWS.map(function (r) {
      return el("li", { class: "pw-row is-" + r.kind }, [
        el("span", { class: "pw-dot", "aria-hidden": "true" }),
        b[r.kind]
          ? el("a", { class: "pw-row-label", href: "#/powtorki/sesja?tylko=" + r.only, "aria-label": r.label + ": " + b[r.kind] + ". Powtarzaj tylko to." }, r.label)
          : el("span", { class: "pw-row-label", text: r.label }),
        el("span", { class: "pw-row-n num", text: String(b[r.kind]) })
      ]);
    })));
    const actions = [el("a", { class: "btn btn-primary pw-start", href: "#/powtorki/sesja" }, "Powtarzaj teraz")];
    if (b.total > 10 && !opts.today) actions.push(el("a", { class: "btn btn-secondary", href: "#/powtorki/sesja?max=10" }, "Krótka sesja (10)"));
    section.appendChild(el("div", { class: "pw-card-actions" }, [el("div", { class: "pw-card-buttons" }, actions), links()]));
    return section;
  }

  /** Dziś, gdy wszystko zrobione: niska karta z jedną linijką („Na dziś zrobione. Następne: jutro (6).”) i linkiem „Talie”. */
  function zeroCard() {
    const u = ELM.reviews.upcoming();
    let text = "Na dziś zrobione.";
    if (u.tomorrow) text += " Następne: jutro (" + u.tomorrow + ").";
    else if (u.next) text += " Następne: " + ELM.fiszki.internal.fmtWhen(u.next) + ".";
    else text += " Włącz talię albo zapisz błąd – wrócą tu w rosnących odstępach.";
    return el("section", { class: "card pw-card is-today is-zero", "aria-label": "Fiszki i błędy" }, [
      el("p", { class: "pw-zero-text" }, [el("strong", { text: "Fiszki i błędy" }), " · ", text]),
      el("a", { class: "btn-link pw-zero-link", href: "#/powtorki/talie" }, "Talie")
    ]);
  }

  function links() {
    return el("p", { class: "pw-links" }, [
      el("a", { href: "#/powtorki/talie", text: "Talie" }),
      el("a", { href: "#/powtorki/moje-bledy", text: "Moje błędy" }),
      el("button", { type: "button", class: "btn btn-link", onclick: function () { openAddMistake(function () { if (ELM.app.refreshLearning) ELM.app.refreshLearning(); render(); }); } }, "+ Dodaj błąd")
    ]);
  }

  /** Karta na stronie Dziś (ta sama liczba co w pasku): stan z liczbą albo niska karta zerowa. */
  function todayCard() {
    if (!hasProfile() || !ELM.reviews) return null;
    const n = card({ today: true });
    n.classList.add("bento-tile", "pw-today");
    return n;
  }

  // ---------- widok zakładki „Na dziś” ----------

  function render() {
    const view = document.getElementById("view");
    view.className = "view tool-view powtorki-view";
    view.dataset.file = HOME;
    view.replaceChildren();
    document.title = "Fiszki i błędy · English Levels Map";
    if (!hasProfile()) {
      view.appendChild(header("dzis", "Fiszki, własne błędy i słabe punkty z ćwiczeń w jednej kolejce."));
      view.appendChild(el("div", { class: "empty-state" }, [
        el("p", { class: "empty-state-text", text: "Powtórki zapisują postęp w profilu." }),
        el("p", { class: "empty-state-hint", text: "Dodaj albo wybierz profil w prawym górnym rogu, żeby zacząć." })
      ]));
      return;
    }
    ELM.reviews.ensureMigrated();
    view.appendChild(header("dzis", "Fiszki z talii, błędy z dziennika i słabe punkty z ćwiczeń w jednej kolejce – najpierw to, co zaległe."));
    view.appendChild(card());
  }

  ELM.powtorki = { HOME: HOME, parseRoute: parseRoute, render: render, header: header, tabs: tabs, card: card, todayCard: todayCard };
})(window.ELM);
