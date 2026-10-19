/*
 * today.js — strona „Dziś” (#/dzis): powtórki na dziś, seria nauki,
 * ostatnie 7 dni, postęp na poziomach, „Kontynuuj”, odliczanie do egzaminu
 * i skrót „Dodaj błąd”.
 *
 * Seria liczona jest z listy dni aktywności profilu (ELM.learn.streak).
 * Dzień nauki zaznacza ELM.markActivity() (js/profile-data.js).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const HASH = "#/dzis";
  const DAY_NAMES = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const DAY_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

  function pd() { return ELM.profileData; }
  function learn() { return ELM.learn; }
  function plural(n, one, few, many) { return ELM.c1 ? ELM.c1.plural(n, one, few, many) : many; }

  function parseRoute(hash) {
    return /^#\/dzis\/?$/.test(hash || "") ? { kind: "today" } : null;
  }

  function card(title, children, cls) {
    return el("section", { class: "card today-card" + (cls ? " " + cls : ""), "aria-label": title }, [
      el("h2", { class: "today-card-title", text: title })
    ].concat(children));
  }

  // ---------- (1) Powtórki ----------

  function reviewsCard() {
    const due = pd().dueCount();
    return card("Powtórki na dziś", due
      ? [
        el("p", { class: "today-big" }, [el("strong", { text: String(due) }), " " + plural(due, "wpis czeka", "wpisy czekają", "wpisów czeka") + " na powtórkę."]),
        el("a", { class: "btn btn-primary", href: ELM.journal.REVIEW }, "Zacznij powtórki (" + due + ")")
      ]
      : [
        el("p", { class: "today-big", text: "Na dziś czysto" }),
        el("p", { class: "tool-note", text: "Nie masz nic do powtórzenia. Nowe błędy zapisuj w dzienniku – wrócą do Ciebie jutro." })
      ], "today-reviews");
  }

  // ---------- (2) + (3) Seria i ostatnie 7 dni ----------

  function streakMessage(s) {
    if (s.activeToday) return s.current > 1 ? "Dzisiejszy dzień nauki zaliczony. Świetnie Ci idzie!" : "Dzisiejszy dzień nauki zaliczony. Dobry początek!";
    if (s.current > 0) return "Seria trwa. Jedna krótka aktywność dziś ją przedłuży.";
    return "Każdy dzień z choćby jedną aktywnością się liczy: zaznaczenie „Umiem”, ćwiczenie albo powtórka.";
  }

  function streakCard() {
    const today = learn().today();
    const days = pd().activityDays();
    const s = learn().streak(days, today);
    const week = learn().lastDays(days, today, 7);
    return card("Seria nauki", [
      el("div", { class: "today-stats" }, [
        el("div", { class: "today-stat" }, [
          el("span", { class: "today-stat-value", text: String(s.current) }),
          el("span", { class: "today-stat-label", text: "Dni z rzędu" })
        ]),
        el("div", { class: "today-stat" }, [
          el("span", { class: "today-stat-value", text: String(s.longest) }),
          el("span", { class: "today-stat-label", text: "Najdłuższa seria" })
        ])
      ]),
      el("p", { class: "tool-note", text: streakMessage(s) }),
      el("ol", { class: "week-dots", "aria-label": "Ostatnie 7 dni" }, week.map(function (d) {
        const date = d.day;
        const js = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12);
        const isToday = d.day === today;
        return el("li", { class: "week-day" + (d.active ? " is-active" : "") + (isToday ? " is-today" : "") }, [
          el("span", { class: "week-dot", "aria-hidden": "true" }),
          el("span", { class: "week-label", "aria-hidden": "true", text: isToday ? "Dziś" : DAY_SHORT[js.getDay()] }),
          el("span", { class: "visually-hidden", text: (isToday ? "dziś, " : "") + DAY_NAMES[js.getDay()] + " " + date.slice(8, 10) + "." + date.slice(5, 7) + ": " + (d.active ? "dzień nauki" : "bez aktywności") })
        ]);
      }))
    ], "today-streak");
  }

  // ---------- (4) Postęp na poziomach ----------

  function levelStats(levelId) {
    let done = 0, total = 0;
    ELM.state.content.categories.forEach(function (cat) {
      const s = ELM.app.getStats(levelId, cat.id);
      done += s.done;
      total += s.total;
    });
    return { done: done, total: total, percent: total ? Math.round(done / total * 100) : 0 };
  }

  function levelsCard() {
    const fills = [];
    const rows = ELM.LEVEL_IDS.map(function (id) {
      const s = levelStats(id);
      const fill = el("div", { class: "progress-fill", style: "transform:scaleX(0)" });
      fills.push({ fill: fill, value: s.percent / 100 });
      return el("li", { class: "today-level lvl-" + id }, [
        el("a", { class: "today-level-link", href: ELM.app.levelHash(id) }, [
          el("span", { class: "level-dot", "aria-hidden": "true" }),
          el("span", { class: "today-level-code", text: id })
        ]),
        el("div", {
          class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
          "aria-valuenow": String(s.percent), "aria-label": "Postęp poziomu " + id
        }, fill),
        el("span", { class: "progress-text", text: s.done + " / " + s.total })
      ]);
    });
    // Animacja paska od zera (CSS: transition na transform; wyłączona przy prefers-reduced-motion)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fills.forEach(function (f) { f.fill.style.transform = "scaleX(" + f.value + ")"; });
      });
    });
    return card("Postęp na poziomach", [
      el("p", { class: "tool-note", text: "Punkty „Umiem” we wszystkich kategoriach." }),
      el("ol", { class: "today-levels" }, rows)
    ], "today-levels-card");
  }

  // ---------- (5) Kontynuuj, (6) egzamin, (7) Dodaj błąd ----------

  function continueCard() {
    const last = pd().lastPage();
    return card("Kontynuuj", last
      ? [
        el("p", { class: "tool-note", text: "Ostatnio otwarta strona:" }),
        el("a", { class: "today-continue", href: last.hash }, [el("span", { text: last.title || last.hash }), el("span", { class: "c1-home-tile-arrow", "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 20 }))])
      ]
      : [
        el("p", { class: "tool-note", text: "Tu pojawi się ostatnio otwarta podstrona. Zacznij od listy swojego poziomu." }),
        el("a", { class: "btn btn-secondary", href: ELM.app.levelHash(ELM.state.ui.levelId) }, "Otwórz poziom " + ELM.state.ui.levelId)
      ], "today-continue-card");
  }

  function examCard() {
    if (!ELM.c1) return null;
    const date = ELM.c1.store.data().examDate;
    const days = ELM.c1.daysUntil(date);
    if (days === null) return null;
    return card("Egzamin C1", [
      days > 1
        ? el("p", { class: "today-big" }, [el("strong", { text: String(days) }), " " + plural(days, "dzień do egzaminu", "dni do egzaminu", "dni do egzaminu")])
        : el("p", { class: "today-big", text: ELM.c1.countdownText(date) }),
      el("a", { class: "btn btn-secondary", href: ELM.c1.BASE }, "Certyfikat C1")
    ], "today-exam");
  }

  function addCard() {
    return card("Masz nowy błąd?", [
      el("p", { class: "tool-note", text: "Zapisz go od razu – jutro wróci jako powtórka." }),
      el("div", { class: "tool-actions" }, [
        el("button", {
          type: "button",
          class: "btn btn-primary",
          onclick: function () { ELM.journal.openForm().then(function (r) { if (r) render(); }); }
        }, "Dodaj błąd"),
        el("a", { class: "btn btn-secondary", href: ELM.journal.BASE }, "Dziennik błędów")
      ])
    ], "today-add");
  }

  /** Zachęta do testu poziomu dla profilu bez żadnych postępów i bez wyniku testu. */
  function testTip() {
    if (!ELM.levelTest) return null;
    const profile = ELM.app.getActiveProfile();
    if (!profile || Object.keys(profile.progress).length || pd().lastTest()) return null;
    return el("section", { class: "card today-tip", "aria-label": "Test poziomu" }, [
      el("div", { class: "today-tip-body" }, [
        el("h2", { class: "today-card-title", text: "Nie wiesz, od czego zacząć?" }),
        el("p", { class: "tool-note", text: "Zrób szybki test poziomu – 12 pytań, około 5 minut." })
      ]),
      el("a", { class: "btn btn-primary", href: ELM.levelTest.HASH }, "Zrób test poziomu")
    ]);
  }

  function greeting() {
    const p = ELM.app.getActiveProfile();
    const t = learn().today();
    const d = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1, Number(t.slice(8, 10)), 12);
    return el("header", { class: "tool-head" }, [
      el("p", { class: "today-date", text: DAY_NAMES[d.getDay()] + ", " + d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear() }),
      el("h1", { class: "tool-title", text: "Dziś" + (p ? ", " + p.name : "") }),
      el("p", { class: "tool-lead", text: "Twój plan na dziś w jednym miejscu. Wszystko zapisuje się tylko w tej przeglądarce." })
    ]);
  }

  function render() {
    const view = document.getElementById("view");
    const keepScroll = view.dataset.file === HASH ? U.getScroll() : 0;
    view.className = "view tool-view today-view";
    view.dataset.file = HASH;
    view.replaceChildren(
      greeting(),
      testTip() || document.createTextNode(""),
      el("div", { class: "today-grid" }, [
        reviewsCard(),
        streakCard(),
        levelsCard(),
        continueCard(),
        examCard(),
        addCard()
      ])
    );
    document.title = "Dziś · English Levels Map";
    U.setScroll(keepScroll);
  }

  ELM.today = { HASH: HASH, parseRoute: parseRoute, render: render };
})(window.ELM);
