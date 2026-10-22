/*
 * writing-trainer.js — wspólny silnik trenera pisania (spec 05, 3.5 i 5.2).
 * Wcześniej był częścią js/c1-writing.js; teraz C1 i Egzamin ósmoklasisty
 * tworzą trenera z własną konfiguracją:
 *
 *   ELM.writingTrainer.create(cfg) → { render(view, taskId) → tytuł | null }
 *
 * cfg (C1 → js/c1-writing.js, E8 → js/exam-core.js):
 *   trainer()               dane trening/pisanie.json
 *   section()               { label } sekcji trenera z manifestu (albo null)
 *   crumb(label), notFound(msg)
 *   href(taskId?)           adres listy (bez taskId) / zadania
 *   drafts(), save()        obiekt szkiców { idZadania: tekst } i zapis
 *   countWords(text, task)  licznik
 *   counter(n, T)           { cls, hint } — kolor i podpowiedź licznika
 *   wordsLabel(n)
 *   listTitle, listLead(T)  nagłówek i wstęp listy zadań
 *   chips(task, T)          etykiety zadania (Part, gatunek, zakres słów)
 *   genrePage(task)         { href, label } strony o gatunku albo null
 *   timerKey(task)          klucz timera (ELM.c1.timer — wspólny dla trenerów)
 *   timerNote               opcjonalna wskazówka przy timerze
 *   examExtras              true → egzaminy z rejestru: podany początek, podpunkty do odhaczenia,
 *                           samoocena wg kryteriów (rubric), wzorcowa odpowiedź obok tekstu
 *   rubricNotes             dodatkowe uwagi pod samooceną (zasady oceny danego egzaminu)
 * Szkic zapisuje się automatycznie; pole tekstowe bez sprawdzania pisowni (jak na egzaminie).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  /** Kopiowanie do schowka (z zapasową metodą dla starszych przeglądarek / file://). */
  function copyText(text, status) {
    function fallback() {
      const tmp = el("textarea", { value: text });
      tmp.style.position = "fixed";
      tmp.style.opacity = "0";
      document.body.appendChild(tmp);
      tmp.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      tmp.remove();
      status.textContent = ok ? "Skopiowano" : "Nie udało się skopiować – zaznacz tekst i użyj Ctrl+C";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { status.textContent = "Skopiowano"; }, fallback);
    } else {
      fallback();
    }
  }

  function checkGroup(title, items) {
    if (!items || !items.length) return null;
    return el("div", { class: "c1-check-group" }, [
      el("h3", { class: "c1-check-title", text: title }),
      el("ul", { class: "task-list" }, items.map(function (text) {
        return el("li", { class: "task-item" }, el("label", null, [el("input", { type: "checkbox" }), el("span", { text: text })]));
      }))
    ]);
  }

  function create(cfg) {

    function renderList(view, T, sectionLabel) {
      const drafts = cfg.drafts();
      view.appendChild(cfg.crumb(sectionLabel));
      view.appendChild(el("h1", { class: "c1-title", text: cfg.listTitle }));
      view.appendChild(el("p", { class: "c1-lead", text: cfg.listLead(T) }));
      view.appendChild(el("div", { class: "c1-set-grid" }, T.tasks.map(function (task) {
        const words = cfg.countWords(drafts[task.id], task);
        return el("a", { class: "card c1-set-card", href: cfg.href(task.id) }, [
          el("span", { class: "c1-chips" }, cfg.chips(task, T, true).map(function (c) { return el("span", { class: "c1-chip", text: c }); })),
          el("span", { class: "c1-set-card-title", text: task.title }),
          el("span", { class: "c1-set-card-best" + (words ? " has-score" : ""), text: words ? "Szkic: " + cfg.wordsLabel(words) : "Nowe zadanie" })
        ]);
      })));
    }

    function renderTask(view, T, task, sectionLabel) {
      const drafts = cfg.drafts();
      let saveTimer = null;

      view.appendChild(cfg.crumb(sectionLabel));
      view.appendChild(el("p", { class: "c1-back" }, el("a", { href: cfg.href() }, ELM.ui.withIcon("arrow-left", "Wszystkie zadania"))));
      view.appendChild(el("h1", { class: "c1-title", text: task.title }));
      view.appendChild(el("p", { class: "c1-chips" }, cfg.chips(task, T, false).map(function (c) { return el("span", { class: "c1-chip", text: c }); })));

      // Polecenie — akapity zachowane (white-space: pre-wrap)
      view.appendChild(el("section", { class: "card c1-prompt", "aria-label": "Polecenie" }, el("p", { class: "c1-prompt-text", text: task.prompt })));

      // E8: podpunkty do odhaczenia już w trakcie pisania
      if (cfg.examExtras && task.bullets && task.bullets.length) {
        view.appendChild(el("section", { class: "card wt-bullets", "aria-labelledby": "wt-bullets-title" }, [
          el("h2", { class: "c1-check-title", id: "wt-bullets-title", text: "Podpunkty zadania – odhacz, gdy są w tekście" }),
          el("ul", { class: "task-list" }, task.bullets.map(function (b) {
            return el("li", { class: "task-item" }, el("label", null, [el("input", { type: "checkbox" }), el("span", { text: b })]));
          }))
        ]));
      }

      // Licznik słów
      const counter = el("span", { class: "c1-words", "aria-live": "polite" });
      function paintCounter(text) {
        const n = cfg.countWords(text, task);
        const c = cfg.counter(n, T);
        counter.className = "c1-words " + c.cls;
        counter.replaceChildren(el("strong", { text: cfg.wordsLabel(n) }), el("span", { class: "c1-words-hint", text: c.hint }));
      }

      const area = el("textarea", {
        class: "field c1-writing-area",
        rows: 18,
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        autocomplete: "off",
        "aria-label": "Twój tekst",
        value: drafts[task.id] || "",
        oninput: function () {
          paintCounter(area.value);
          clearTimeout(saveTimer);
          saveTimer = setTimeout(function () {
            drafts[task.id] = area.value;
            cfg.save();
            saved.textContent = "Szkic zapisany";
          }, 400);
          saved.textContent = "Zapisywanie…";
        }
      });
      const saved = el("span", { class: "c1-saved", "aria-live": "polite", text: drafts[task.id] ? "Szkic zapisany" : "" });
      paintCounter(area.value);

      view.appendChild(el("div", { class: "c1-writing-bar" }, [
        ELM.c1.timer({ key: cfg.timerKey(task), seconds: T.timeMinutes * 60, label: "Czas", exam: true }),
        counter
      ]));
      if (cfg.timerNote) view.appendChild(el("p", { class: "tool-note wt-note" }, [ELM.icon("info", { size: 16 }), " " + cfg.timerNote]));
      // E8: podany początek (nie liczy się do limitu)
      if (cfg.examExtras && task.opening) {
        view.appendChild(el("p", { class: "wt-opening" }, [el("span", { class: "review-label", text: "Podany początek (nie liczy się do limitu): " }), el("strong", { text: task.opening })]));
      }
      view.appendChild(area);

      const checklist = el("section", { class: "card c1-checklist", hidden: true, "aria-label": "Checklista" });

      view.appendChild(el("div", { class: "c1-writing-actions" }, [
        el("button", {
          type: "button",
          class: "btn btn-primary",
          onclick: function () {
            drafts[task.id] = area.value;
            cfg.save();
            if (ELM.markActivity) ELM.markActivity(); // ukończona sesja trenera = dzień nauki
            fillChecklist();
            checklist.hidden = false;
            checklist.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, "Skończyłem"),
        el("button", {
          type: "button",
          class: "btn btn-danger",
          onclick: function () {
            ELM.dialogs.confirm({
              title: "Wyczyścić szkic?",
              message: "Tekst tego zadania zostanie usunięty z tej przeglądarki.",
              confirmLabel: "Wyczyść"
            }).then(function (ok) {
              if (!ok) return;
              area.value = "";
              delete drafts[task.id];
              cfg.save();
              paintCounter("");
              saved.textContent = "";
              checklist.hidden = true;
            });
          }
        }, "Wyczyść szkic"),
        saved
      ]));
      view.appendChild(checklist);

      function fillChecklist() {
        const n = cfg.countWords(area.value, task);
        const page = cfg.genrePage(task);
        const copyStatus = el("span", { class: "c1-saved", "aria-live": "polite" });
        checklist.replaceChildren();
        U.appendChildren(checklist, [
          el("h2", { class: "section-title", text: "Sprawdź przed oddaniem" }),
          el("p", { class: "c1-lead", text: "Twój tekst: " + cfg.wordsLabel(n) + ". Odhacz to, co jest w porządku – reszta to rzeczy do poprawy." }),
          cfg.examExtras ? null : checkGroup("Punkty polecenia", task.points),
          cfg.examExtras ? checkGroup("Podpunkty zadania", task.bullets) : null,
          checkGroup(cfg.genreTitle ? cfg.genreTitle(task) : "Gatunek", task.genreChecklist),
          checkGroup("Ogólne", T.genericChecklist),
          cfg.examExtras && T.rubric ? rubric(T, n) : null,
          cfg.examExtras && task.model ? compare(area.value, task) : null,
          el("div", { class: "c1-writing-actions" }, [
            page ? el("a", { class: "btn btn-secondary", href: page.href }, ["Więcej o gatunku: " + page.label, ELM.icon("chevron-right", { size: 18 })]) : null,
            el("button", { type: "button", class: "btn btn-secondary", onclick: function () { copyText(area.value, copyStatus); } }, "Kopiuj tekst"),
            copyStatus
          ])
        ]);
      }
    }

    /** E8: samoocena wg kryteriów (np. 4/2/2/2) z regułami limitu wyrazów. */
    function rubric(T, n) {
      const total = el("strong", { class: "num" });
      const selects = [];
      const max = T.rubric.reduce(function (s, r) { return s + r.max; }, 0);
      function sum() {
        let s = 0;
        selects.forEach(function (x) { s += Number(x.value); });
        total.textContent = s + " / " + max;
      }
      const rows = T.rubric.map(function (r) {
        const id = "wt-rub-" + r.id;
        const sel = el("select", { class: "field wt-rub-select", id: id, onchange: sum }, Array.from({ length: r.max + 1 }, function (_, i) { return el("option", { value: String(i), text: String(i) }); }));
        selects.push(sel);
        return el("div", { class: "wt-rub-row" }, [el("label", { class: "wt-rub-label", for: id, text: r.label + " (0–" + r.max + ")" }), sel]);
      });
      sum();
      const notes = [];
      if (T.warnBelow && n < T.warnBelow) notes.push("Masz mniej niż " + T.warnBelow + " wyrazów – oceniana jest wtedy tylko treść.");
      (cfg.rubricNotes || []).forEach(function (t) { notes.push(t); }); // zasady oceny potwierdzone dla danego egzaminu
      return el("div", { class: "c1-check-group wt-rubric" }, [
        el("h3", { class: "c1-check-title", text: "Samoocena wg kryteriów" }),
        el("div", { class: "wt-rub-rows" }, rows),
        el("p", { class: "wt-rub-total" }, ["Razem: ", total]),
        el("ul", { class: "wt-rub-notes" }, notes.map(function (t) { return el("li", { text: t }); }))
      ]);
    }

    /** E8: tekst użytkownika obok wzorcowej odpowiedzi. */
    function compare(text, task) {
      return el("div", { class: "c1-check-group wt-compare" }, [
        el("h3", { class: "c1-check-title", text: "Porównaj ze wzorem" }),
        el("div", { class: "wt-compare-cols" }, [
          el("figure", { class: "wt-col" }, [el("figcaption", { text: "Twój tekst" }), el("p", { class: "wt-text", lang: "en", text: (task.opening ? task.opening + "\n" : "") + (text || "(pusty)") })]),
          el("figure", { class: "wt-col is-model" }, [el("figcaption", { text: "Przykładowa odpowiedź (" + cfg.wordsLabel(cfg.countWords(task.model, task)) + ")" }), el("p", { class: "wt-text", lang: "en", text: task.model })])
        ]),
        el("p", { class: "tool-note", text: "Wzór to jedna z możliwych odpowiedzi. Sprawdź, czy Twój tekst odnosi się do wszystkich podpunktów i ma podobną długość." })
      ]);
    }

    function render(view, taskId) {
      const T = cfg.trainer();
      const found = cfg.section();
      if (!T || !found) { view.appendChild(cfg.notFound("Brak danych trenera pisania.")); return null; }
      if (!taskId) { renderList(view, T, found.label); return cfg.listTitle; }
      const task = T.tasks.find(function (t) { return t.id === taskId; });
      if (!task) { view.appendChild(cfg.notFound("Nie znaleziono takiego zadania.")); return null; }
      renderTask(view, T, task, found.label);
      return task.title;
    }

    return { render: render };
  }

  ELM.writingTrainer = { create: create, copyText: copyText };
})(window.ELM);
