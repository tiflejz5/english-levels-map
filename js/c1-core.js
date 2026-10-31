/*
 * c1-core.js — zakładka „Certyfikat C1” (przygotowanie do C1 Advanced).
 *
 * Dane: ELM.C1 z pliku niezbednik/certyfikat-c1-dane.js
 * (generowanego przez: node tools/zbuduj-niezbednik.js z folderu
 * niezbednik/certyfikat-c1/). Menu budujemy wyłącznie z manifest.json.
 *
 * Adresy:
 *   #/certyfikat-c1                      → strona „przeglad”
 *   #/certyfikat-c1/<id strony>          → strona z strony/*.md
 *   #/certyfikat-c1/cwiczenia            → lista zestawów ćwiczeń
 *   #/certyfikat-c1/cwiczenia/<id>       → zestaw ćwiczeń (c1-exercises.js)
 *   #/certyfikat-c1/trening-pisanie[/<zadanie>] → trener Writing (c1-writing.js)
 *   #/certyfikat-c1/trening-speaking     → trener Speaking (c1-speaking.js)
 *
 * Ten plik: adresy, menu boczne, strony .md, odliczanie do egzaminu,
 * ramki „Na egzaminie C1”, kafelek na stronie głównej, linki [[id]],
 * zapis w localStorage (klucz elm_c1_v1) i wspólny timer.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const BASE = "#/certyfikat-c1";
  const STORE_KEY = "elm_c1_v1";
  const HIDDEN_SECTIONS = ["Odpowiedzi", "Przykładowe odpowiedzi"];

  function data() { return ELM.C1 || null; }

  // =====================================================================
  // PAMIĘĆ (localStorage w try/catch — bez dostępu działa w pamięci karty)
  //   { examDate: "RRRR-MM-DD", best: { idZestawu: wynik },
  //     drafts: { idZadania: tekst }, tasks: { idStrony: { nr: true } } }
  // =====================================================================

  let memory = null;

  function storeData() {
    if (memory) return memory;
    let saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || "null"); } catch (e) { saved = null; }
    memory = U.isPlainObject(saved) ? saved : {};
    ["best", "drafts", "tasks"].forEach(function (k) { if (!U.isPlainObject(memory[k])) memory[k] = {}; });
    if (typeof memory.examDate !== "string") memory.examDate = "";
    return memory;
  }

  function saveStore() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(storeData())); } catch (e) { /* brak zapisu — trudno */ }
  }

  function bestScore(setId) {
    const v = storeData().best[setId];
    return typeof v === "number" ? v : null;
  }

  /** Zapisuje wynik, jeśli jest lepszy od dotychczasowego. Zwraca true, gdy to nowy rekord. */
  function recordScore(setId, score) {
    const s = storeData();
    if (typeof s.best[setId] === "number" && s.best[setId] >= score) return false;
    s.best[setId] = score;
    saveStore();
    return true;
  }

  // =====================================================================
  // MANIFEST
  // =====================================================================

  function sections() { return data() ? data().manifest.sections : []; }

  function findPage(id) {
    for (const section of sections()) {
      const page = (section.pages || []).find(function (p) { return p.id === id; });
      if (page) return { page: page, section: section };
    }
    return null;
  }

  function findSet(id) {
    for (const section of sections()) {
      for (const group of section.exerciseGroups || []) {
        const set = group.sets.find(function (s) { return s.id === id; });
        if (set) return { set: set, group: group, section: section };
      }
    }
    return null;
  }

  function findTrainer(id) {
    for (const section of sections()) {
      if (section.trainer && section.trainer.id === id) return { trainer: section.trainer, section: section };
    }
    return null;
  }

  // =====================================================================
  // ADRESY
  // =====================================================================

  /** "#/certyfikat-c1/…" → opis widoku albo null (to nie jest adres zakładki). */
  function parseRoute(hash) {
    const m = /^#\/certyfikat-c1(?:\/(.*))?$/.exec(hash || "");
    if (!m) return null;
    const parts = (m[1] || "").replace(/\/+$/, "").split("/").filter(Boolean).map(function (p) {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    });
    if (!parts.length) return { kind: "page", id: "przeglad" };
    if (parts[0] === "cwiczenia") return parts[1] ? { kind: "exercise", id: parts[1] } : { kind: "exercises" };
    if (parts[0] === "trening-pisanie") return { kind: "writing", task: parts[1] || null };
    if (parts[0] === "trening-speaking") return { kind: "speaking" };
    return { kind: "page", id: parts[0] };
  }

  function hrefPage(id) { return id === "przeglad" ? BASE : BASE + "/" + id; }
  function hrefSet(id) { return BASE + "/cwiczenia/" + id; }
  function hrefTrainer(id) { return BASE + "/" + id; }

  /** Sekcja manifestu, do której należy widok (do rozwinięcia w menu). */
  function sectionIdOf(route) {
    if (!route) return null;
    if (route.kind === "page") { const f = findPage(route.id); return f ? f.section.id : null; }
    if (route.kind === "exercise") { const f = findSet(route.id); return f ? f.section.id : null; }
    if (route.kind === "exercises") return "cwiczenia";
    if (route.kind === "writing") { const f = findTrainer("trening-pisanie"); return f ? f.section.id : null; }
    if (route.kind === "speaking") { const f = findTrainer("trening-speaking"); return f ? f.section.id : null; }
    return null;
  }

  function isActive(route, kind, id) {
    if (!route || route.kind !== kind) return false;
    return id === undefined || route.id === id;
  }

  // =====================================================================
  // MENU BOCZNE (pod poziomami A1–C2)
  // =====================================================================

  const expanded = {}; // id sekcji → true/false, gdy użytkownik sam rozwinął/zwinął

  function navItem(href, label, active, badge, extraClass) {
    return el("li", null, el("a", {
      class: "c1-nav-link" + (active ? " is-active" : "") + (extraClass ? " " + extraClass : ""),
      href: href,
      "aria-current": active ? "page" : null
    }, [
      extraClass === "is-trainer" ? ELM.icon("timer", { size: 16, class: "c1-nav-icon" }) : null,
      el("span", { class: "c1-nav-label", text: label }),
      badge ? el("span", { class: "c1-nav-badge", text: badge }) : null
    ]));
  }

  function renderNav() {
    const box = document.getElementById("c1-nav");
    if (!box) return;
    box.replaceChildren();
    if (!data()) return;

    const route = ELM.state.view === "c1" ? ELM.state.c1Route : null;
    const currentSection = sectionIdOf(route);
    const manifest = data().manifest;

    // Chip „Certyfikat C1” rysuje js/exam-core.js razem z pozostałymi kafelkami egzaminów; tu tylko sekcje.
    // Sekcje zakładki — widoczne tylko w rozwiniętym panelu i tylko wewnątrz Certyfikatu C1 (jak sekcje innych egzaminów)
    const sections = el("div", { class: "sb-c1-sections" });
    if (route) box.appendChild(sections);

    manifest.sections.forEach(function (section) {
      const open = Object.prototype.hasOwnProperty.call(expanded, section.id) ? expanded[section.id] : section.id === currentSection;
      const listId = "c1-sec-" + section.id;
      const list = el("ul", { class: "c1-sec-list", id: listId, hidden: !open });

      (section.pages || []).forEach(function (p) {
        list.appendChild(navItem(hrefPage(p.id), p.label, isActive(route, "page", p.id)));
      });
      (section.exerciseGroups || []).forEach(function (group) {
        list.appendChild(el("li", { class: "c1-group-label", text: group.label }));
        group.sets.forEach(function (set) {
          const best = bestScore(set.id);
          list.appendChild(navItem(hrefSet(set.id), set.label, isActive(route, "exercise", set.id),
            best === null ? null : best + "/" + set.maxScore));
        });
      });
      if (section.trainer) {
        const kind = section.trainer.id === "trening-pisanie" ? "writing" : "speaking";
        list.appendChild(navItem(hrefTrainer(section.trainer.id), section.trainer.label, isActive(route, kind), null, "is-trainer"));
      }

      sections.appendChild(el("div", { class: "c1-sec" + (section.id === currentSection ? " is-current" : "") }, [
        el("button", {
          type: "button",
          class: "c1-sec-toggle",
          "aria-expanded": open ? "true" : "false",
          "aria-controls": listId,
          onclick: function () {
            expanded[section.id] = !open;
            renderNav();
            const again = document.querySelector('[aria-controls="' + listId + '"]');
            if (again) again.focus();
          }
        }, [el("span", { class: "c1-sec-caret", "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 16 })), section.label]),
        list
      ]));
    });
  }

  // =====================================================================
  // WSPÓLNE ELEMENTY STRON
  // =====================================================================

  function crumb(text) {
    return ELM.ui.breadcrumbs(text ? [{ label: "Certyfikat C1", href: BASE }, { label: text }] : [{ label: "Certyfikat C1", href: BASE }]);
  }

  function notFound(message) {
    return el("div", { class: "empty-state" }, [
      el("p", { class: "empty-state-text", text: message || "Nie znaleziono takiej strony w zakładce „Certyfikat C1”." }),
      el("a", { class: "btn btn-secondary", href: BASE }, "Przejdź do przeglądu egzaminu")
    ]);
  }

  /** Wstawia element zaraz po wstępie (przed pierwszą sekcją ##). */
  function insertAfterIntro(article, node) {
    if (!node) return;
    const first = article.querySelector(".md-section");
    if (first) article.insertBefore(node, first);
    else article.appendChild(node);
  }

  /** A8: sekcja, przed którą wstawiamy ramki egzaminów (null = na koniec artykułu). */
  function examBoxAnchor(article) {
    const sections = Array.prototype.filter.call(article.children, function (n) { return n.classList && n.classList.contains("md-section"); });
    const titles = sections.map(function (s) { const h = s.querySelector("h2"); return h ? h.textContent : ""; });
    const i = ELM.examLogic.examBoxAnchorIndex(titles);
    return i < 0 ? null : sections[i];
  }

  /** Wstawia ramki egzaminów po wyjaśnieniu, przed „Życie i egzamin” / „Typowe błędy” / „Ćwiczenie”. */
  function insertExamBoxes(article, node) {
    if (!node) return;
    const anchor = examBoxAnchor(article);
    if (anchor) article.insertBefore(node, anchor);
    else article.appendChild(node);
  }

  function plural(n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10, t = n % 100;
    return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
  }

  // =====================================================================
  // ODLICZANIE DO EGZAMINU
  // =====================================================================

  /** Liczba dni do daty "RRRR-MM-DD" (czas lokalny) albo null. */
  function daysUntil(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
    if (!m) return null;
    const exam = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((exam - today) / 86400000);
  }

  function countdownText(dateStr) {
    const d = daysUntil(dateStr);
    if (d === null) return "Ustaw datę egzaminu, żeby zobaczyć odliczanie.";
    if (d > 1) return "Do egzaminu: " + d + " " + plural(d, "dzień", "dni", "dni");
    if (d === 1) return "Egzamin jest jutro. Wyśpij się!";
    if (d === 0) return "Egzamin jest dziś. Powodzenia!";
    return "Egzamin był " + (-d) + " " + plural(-d, "dzień", "dni", "dni") + " temu.";
  }

  /** Wpis C1 w rejestrze egzaminów (kolory, podtytuł, id zestawów). */
  function examEntry() { return ELM.examMy.byId("certyfikat-c1"); }

  // =====================================================================
  // STRONY .md ZAKŁADKI
  // =====================================================================

  /** Pola wyboru z list „- [ ]” — stan zapisywany per strona. */
  function wireTasks(article, pageId) {
    const boxes = article.querySelectorAll("input.md-task");
    if (!boxes.length) return;
    const tasks = storeData().tasks;
    const saved = tasks[pageId] || {};
    boxes.forEach(function (box, i) {
      if (Object.prototype.hasOwnProperty.call(saved, i)) box.checked = saved[i] === true;
      box.addEventListener("change", function () {
        tasks[pageId] = tasks[pageId] || {};
        tasks[pageId][i] = box.checked;
        saveStore();
      });
    });
    article.appendChild(el("p", { class: "c1-tasks-reset" }, el("button", {
      type: "button",
      class: "btn btn-link btn-small",
      onclick: function () {
        boxes.forEach(function (b) { b.checked = false; });
        delete tasks[pageId];
        saveStore();
      }
    }, "Odznacz wszystko na tej stronie")));
  }

  /** Poprzednia / następna strona w kolejności z manifestu. */
  function pageNav(pageId) {
    const all = [];
    sections().forEach(function (s) { (s.pages || []).forEach(function (p) { all.push(p); }); });
    const i = all.findIndex(function (p) { return p.id === pageId; });
    const prev = all[i - 1], next = all[i + 1];
    if (!prev && !next) return null;
    return el("nav", { class: "c1-pager", "aria-label": "Sąsiednie strony" }, [
      prev ? el("a", { class: "btn btn-secondary", href: hrefPage(prev.id) }, ELM.ui.withIcon("arrow-left", prev.label)) : el("span"),
      next ? el("a", { class: "btn btn-secondary", href: hrefPage(next.id) }, [next.label, ELM.icon("arrow-right", { size: 18 })]) : null
    ]);
  }

  function renderPage(view, id) {
    const found = findPage(id);
    const text = found && data().pages[id];
    if (!text) { view.appendChild(notFound()); return null; }
    const doc = ELM.markdown.parse(text);
    view.appendChild(el("div", { class: "c1-page-tools" }, [
      crumb(found.section.label),
      ELM.notes ? ELM.notes.button("c1:" + id, { title: "C1 · " + (doc.meta.title || found.page.label), route: location.hash }) : null
    ]));
    const article = el("article", { class: "md c1-page" }, ELM.markdown.render(doc.blocks, { hiddenSections: HIDDEN_SECTIONS }));
    if (id === "przeglad") insertAfterIntro(article, el("div", { class: "exam-overview-top" }, [ELM.examDate.cardFor(examEntry()), ELM.examCover.pinButton(examEntry())]));
    wireTasks(article, id);
    if (ELM.callouts) ELM.callouts.apply(article);
    view.appendChild(article);
    if (/^writing(-|$)/.test(id) && ELM.pisanie) view.appendChild(ELM.pisanie.pageSection("certyfikat-c1"));
    if (id === "przeglad" && ELM.fiszki && ELM.fiszki.examTile) { const ft = ELM.fiszki.examTile("certyfikat-c1"); if (ft) view.appendChild(ft); }
    const nav = pageNav(id);
    if (nav) view.appendChild(nav);
    return doc.meta.title || found.page.label;
  }

  /** Lista wszystkich zestawów (#/certyfikat-c1/cwiczenia). */
  function renderExerciseList(view) {
    const section = sections().find(function (s) { return s.exerciseGroups; });
    if (!section) { view.appendChild(notFound()); return null; }
    view.appendChild(crumb(section.label));
    view.appendChild(el("h1", { class: "c1-title", text: section.label }));
    view.appendChild(el("p", { class: "c1-lead", text: "Zestawy sprawdzają się same i liczą punkty jak na egzaminie. Najlepszy wynik każdego zestawu zapisuje się w tej przeglądarce." }));
    section.exerciseGroups.forEach(function (group) {
      view.appendChild(el("h2", { class: "c1-group-title", text: group.label }));
      view.appendChild(el("div", { class: "c1-set-grid" }, group.sets.map(function (set) {
        const best = bestScore(set.id);
        return el("a", { class: "card c1-set-card", href: hrefSet(set.id) }, [
          el("span", { class: "c1-set-card-title", text: set.label }),
          el("span", { class: "c1-set-card-best" + (best !== null ? " has-score" : ""),
            text: best === null ? "Jeszcze nie rozwiązany · max " + set.maxScore : "Najlepszy wynik: " + best + " / " + set.maxScore })
        ]);
      })));
    });
    return section.label;
  }

  // =====================================================================
  // RYSOWANIE ZAKŁADKI
  // =====================================================================

  function routeKey(route) {
    return "#c1:" + route.kind + ":" + (route.id || route.task || "");
  }

  function render(route) {
    const view = document.getElementById("view");
    const keepScroll = view.dataset.file === routeKey(route) ? U.getScroll() : 0;
    view.className = "view c1-view";
    view.dataset.file = routeKey(route);
    view.replaceChildren();
    // Strona przeglądu: pełna okładka (data jest w karcie pod wstępem); podstrony: okładka kompaktowa
    if (data()) view.appendChild(masthead(!(route.kind === "page" && route.id === "przeglad")));

    let title = null;
    if (!data()) {
      view.appendChild(notFound("Brak danych zakładki (niezbednik/certyfikat-c1-dane.js). Uruchom: node tools/zbuduj-niezbednik.js"));
    } else if (route.kind === "page") {
      title = renderPage(view, route.id);
    } else if (route.kind === "exercises") {
      title = renderExerciseList(view);
    } else if (route.kind === "exercise") {
      title = ELM.c1Exercises.render(view, route.id);
    } else if (route.kind === "writing") {
      title = ELM.c1Writing.render(view, route.task);
    } else if (route.kind === "speaking") {
      title = ELM.c1Speaking.render(view);
    }
    document.title = (title ? title + " · " : "") + "Certyfikat C1 · English Levels Map";
    if (title && ELM.profileData) ELM.profileData.setLastPage(location.hash, "Certyfikat C1 · " + title);
    U.setScroll(keepScroll);
  }

  /**
   * Nagłówek sekcji Certyfikatu: znak napisowy „C1 Advanced · przygotowanie”
   * (bez logo i grafik Cambridge) i duża liczba dni do egzaminu.
   */
  function masthead(withCount) {
    return ELM.examCover[withCount ? "compact" : "full"](examEntry());
  }

  // =====================================================================
  // RAMKA „NA EGZAMINIE C1” NA PODSTRONACH POZIOMÓW (powiazania.json)
  // =====================================================================

  function examBoxFor(itemId) {
    const d = data();
    if (!d || !d.links) return null;
    const link = d.links.links.find(function (l) { return l.itemId === itemId; });
    if (!link) return null;
    const exercises = (link.exercises || []).map(function (id) {
      const f = findSet(id);
      if (!f) { console.warn("Ramka C1: nieznany zestaw " + id); return null; }
      const best = bestScore(id);
      return el("li", null, [
        el("a", { href: hrefSet(id) }, [f.set.label, ELM.icon("chevron-right", { size: 16 })]),
        el("span", { class: "c1-exam-box-best", text: best === null ? "jeszcze nie rozwiązany" : "najlepszy wynik " + best + "/" + f.set.maxScore })
      ]);
    }).filter(Boolean);

    return el("aside", { class: "c1-exam-box callout callout-exam", "aria-label": "Na egzaminie C1" }, [
      el("div", { class: "c1-exam-box-head" }, [
        el("span", { class: "c1-chip-badge", "aria-hidden": "true", text: "C1" }),
        el("span", { class: "c1-exam-box-title", text: "Na egzaminie C1" })
      ]),
      (link.examParts || []).length ? el("div", { class: "c1-chips" }, link.examParts.map(function (p) {
        return el("span", { class: "c1-chip", text: p });
      })) : null,
      link.note ? el("p", { class: "c1-exam-box-note" }, ELM.markdown.inline(link.note)) : null,
      exercises.length ? el("ul", { class: "c1-exam-box-links" }, exercises) : null
    ]);
  }

  // =====================================================================
  // LINKI [[id]] W MARKDOWNIE
  //   id podstrony z niezbednik/index.json → podstrona (tytuł podstrony)
  //   id zestawu z cwiczenia/ → strona zestawu (tytuł zestawu)
  // =====================================================================

  ELM.markdown.resolveWiki = function (id) {
    const set = findSet(id);
    if (set) return { href: hrefSet(id), text: set.set.label, level: "C1", kind: "c1" };
    const N = ELM.NIEZBEDNIK;
    if (N) {
      for (const level of N.index.levels) {
        const item = level.items.find(function (it) { return it.id === id; });
        if (item) {
          const md = N.pages[item.file];
          const title = md ? ELM.markdown.parseFrontmatter(md).meta.title : null;
          return { href: ELM.niezbednik.routeOf(item), text: title || item.label, level: level.level, kind: "page" };
        }
      }
    }
    return null;
  };

  // =====================================================================
  // TIMER (wspólny dla Writing i Speaking)
  //   Stan trzymamy w rejestrze po kluczu, więc timer odlicza dalej także
  //   po przerysowaniu strony (np. zmianie profilu).
  //   exam: true → jak w wersji komputerowej: pełne minuty, w ostatnich
  //   5 minutach także sekundy, ostatnia minuta na czerwono.
  // =====================================================================

  const timers = {};
  let ticker = null;

  function timerState(key, seconds) {
    if (!timers[key] || timers[key].total !== seconds) {
      timers[key] = { total: seconds, remaining: seconds, running: false, endAt: 0, view: null };
    }
    return timers[key];
  }

  function formatTime(t, exam) {
    const r = Math.max(0, t.remaining);
    const mmss = Math.floor(r / 60) + ":" + String(r % 60).padStart(2, "0");
    if (exam && r > 300) return Math.ceil(r / 60) + " min";
    return mmss;
  }

  function paint(t) {
    const v = t.view;
    if (!v) return; // (rysujemy też zanim element trafi na stronę)
    v.display.textContent = t.remaining <= 0 ? "Czas minął" : formatTime(t, v.exam);
    const dangerFrom = v.exam ? 60 : 10;
    v.root.classList.toggle("is-danger", t.remaining > 0 && t.remaining <= dangerFrom);
    v.root.classList.toggle("is-over", t.remaining <= 0);
    v.root.classList.toggle("is-running", t.running);
    v.toggle.textContent = t.running ? "Pauza" : (t.remaining < t.total && t.remaining > 0 ? "Wznów" : "Start");
    v.toggle.disabled = t.remaining <= 0;
    updateFocus();
  }

  /** Tryb skupienia (html.focus-mode): reszta interfejsu przygasa, gdy działa timer na ekranie. */
  function updateFocus() {
    const any = Object.keys(timers).some(function (k) {
      const t = timers[k];
      return t.running && t.view && document.contains(t.view.root);
    });
    document.documentElement.classList.toggle("focus-mode", any);
  }

  function tick() {
    let any = false;
    Object.keys(timers).forEach(function (key) {
      const t = timers[key];
      if (!t.running) return;
      t.remaining = Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
      if (t.remaining <= 0) {
        t.running = false;
        // Timer odliczył do końca (trener Writing / Speaking) = ukończona sesja
        if (ELM.markActivity) ELM.markActivity();
      } else any = true;
      paint(t);
    });
    if (!any && ticker) { clearInterval(ticker); ticker = null; }
  }

  /** Element timera. opts: key, seconds, label, exam. */
  function timer(opts) {
    const t = timerState(opts.key, opts.seconds);
    const display = el("span", { class: "c1-timer-display", role: "timer", "aria-label": opts.label });
    const toggle = el("button", {
      type: "button",
      class: "btn btn-primary btn-small",
      onclick: function () {
        if (t.running) {
          t.remaining = Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
          t.running = false;
        } else if (t.remaining > 0) {
          t.endAt = Date.now() + t.remaining * 1000;
          t.running = true;
          if (!ticker) ticker = setInterval(tick, 250);
        }
        paint(t);
      }
    }, "Start");
    const reset = el("button", {
      type: "button",
      class: "btn btn-secondary btn-small",
      onclick: function () { t.running = false; t.remaining = t.total; paint(t); }
    }, "Reset");
    const root = el("div", { class: "c1-timer" + (opts.exam ? " is-exam" : "") }, [
      opts.label ? el("span", { class: "c1-timer-label", text: opts.label }) : null,
      display,
      el("span", { class: "c1-timer-buttons" }, [toggle, reset])
    ]);
    t.view = { root: root, display: display, toggle: toggle, exam: !!opts.exam };
    if (t.running && !ticker) ticker = setInterval(tick, 250);
    paint(t);
    return root;
  }

  ELM.c1 = {
    BASE: BASE,
    data: data,
    store: { data: storeData, save: saveStore, bestScore: bestScore, recordScore: recordScore },
    findPage: findPage,
    findSet: findSet,
    findTrainer: findTrainer,
    parseRoute: parseRoute,
    hrefPage: hrefPage,
    hrefSet: hrefSet,
    hrefTrainer: hrefTrainer,
    renderNav: renderNav,
    render: render,
    crumb: crumb,
    notFound: notFound,
    plural: plural,
    daysUntil: daysUntil,
    countdownText: countdownText,
    examBoxFor: examBoxFor,
    insertAfterIntro: insertAfterIntro,
    insertExamBoxes: insertExamBoxes,
    examBoxAnchor: examBoxAnchor,
    timer: timer
  };
})(window.ELM);
