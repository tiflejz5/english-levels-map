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
 *   lowScope                co się ocenia poniżej warnBelow (mianownik), np. „treść”, „realizacja zadania”
 *   lowNote(n, T)           opcjonalnie: własna uwaga w samoocenie poniżej warnBelow (zamiast lowScope)
 *   partGroups(T)           opcjonalnie: [{ label, tasks }] — lista zadań w grupach (B2: Part 1 / Part 2)
 *   modelHref(task)         opcjonalnie: adres wzorca z komentarzami (#/pisanie/wzorce/…) — link w zadaniu z modelNotes
 *   examId                  id egzaminu z rejestru (albo "certyfikat-c1") — poziom zwrotów w panelu „Zwroty” (spec 17, 2.4)
 *   choices()               opcjonalnie: obiekt { grupa: idZadania } — wybór jednego z dwóch zadań
 *                           (zadania z choiceGroup, opis grupy w T.choiceGroups; spec 06, 4.1)
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

    // ---------- Grupy wyboru (jedno z dwóch zadań) ----------

    function groupOf(T, task) { return cfg.choices && T.choiceGroups && task.choiceGroup && T.choiceGroups[task.choiceGroup] ? task.choiceGroup : null; }
    function groupTasks(T, g) { return T.tasks.filter(function (t) { return t.choiceGroup === g; }); }
    /** Wybrane zadanie grupy (tylko istniejące) albo null. */
    function chosenIn(T, g) {
      const id = cfg.choices()[g];
      return groupTasks(T, g).find(function (t) { return t.id === id; }) || null;
    }
    /** Wybór można zmienić, gdy szkic wybranego zadania jest pusty. */
    function canChange(T, g) {
      const cur = chosenIn(T, g);
      return !cur || !cfg.countWords(cfg.drafts()[cur.id], cur);
    }
    function choose(g, taskId) { cfg.choices()[g] = taskId; cfg.save(); }

    /** Opis grupy bez powtórzonego nagłówka („Wybierz jedno z dwóch zadań: rozprawka lub list” → „Rozprawka lub list”). */
    function groupDesc(text) {
      const t = String(text || "").replace(/^\s*Wybierz jedno z dwóch zadań\s*[:–-]?\s*/i, "");
      return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
    }

    function groupCard(T, g) {
      const drafts = cfg.drafts();
      const cur = chosenIn(T, g);
      const change = canChange(T, g);
      const titleId = "wt-choice-" + g;
      return el("section", { class: "card wt-choice", "aria-labelledby": titleId }, [
        el("h2", { class: "wt-choice-title", id: titleId, text: "Wybierz jedno z dwóch zadań" }),
        groupDesc(T.choiceGroups[g]) ? el("p", { class: "wt-choice-desc", text: groupDesc(T.choiceGroups[g]) }) : null,
        el("div", { class: "wt-choice-options" }, groupTasks(T, g).map(function (task) {
          const words = cfg.countWords(drafts[task.id], task);
          const isCur = cur && cur.id === task.id;
          let action;
          if (isCur) {
            action = el("a", { class: "btn btn-primary", href: cfg.href(task.id) }, [words ? "Pisz dalej" : "Zacznij pisać", ELM.icon("chevron-right", { size: 18 })]);
          } else if (change) {
            action = el("button", {
              type: "button", class: "btn btn-secondary",
              onclick: function () { choose(g, task.id); location.hash = cfg.href(task.id); }
            }, cur ? "Zmień na to zadanie" : "Wybieram to zadanie");
          } else {
            action = el("p", { class: "wt-choice-locked", text: "Żeby zmienić wybór, wyczyść szkic wybranego zadania." });
          }
          return el("article", { class: "wt-choice-option" + (isCur ? " is-chosen" : cur ? " is-other" : "") }, [
            el("span", { class: "c1-chips" }, cfg.chips(task, T, true).map(function (c) { return el("span", { class: "c1-chip", text: c }); })
              .concat(isCur ? [el("span", { class: "c1-chip wt-choice-badge", text: "Twój wybór" })] : [])),
            el("h3", { class: "wt-choice-task", text: task.title }),
            el("p", { class: "wt-choice-prompt", text: task.prompt }),
            el("p", { class: "c1-set-card-best" + (words ? " has-score" : ""), text: words ? "Szkic: " + cfg.wordsLabel(words) : "Nowe zadanie" }),
            action
          ]);
        }))
      ]);
    }

    function renderList(view, T, sectionLabel) {
      const drafts = cfg.drafts();
      view.appendChild(cfg.crumb(sectionLabel));
      view.appendChild(el("h1", { class: "c1-title", text: cfg.listTitle }));
      view.appendChild(el("p", { class: "c1-lead", text: cfg.listLead(T) }));
      // Grupy wyboru w kolejności pierwszego zadania; pozostałe zadania jak dotąd (siatka kart)
      const groups = [];
      T.tasks.forEach(function (t) { const g = groupOf(T, t); if (g && groups.indexOf(g) === -1) groups.push(g); });
      groups.forEach(function (g) { view.appendChild(groupCard(T, g)); });
      const rest = T.tasks.filter(function (t) { return !groupOf(T, t); });
      if (!rest.length) return;
      function grid(tasks) {
        return el("div", { class: "c1-set-grid" }, tasks.map(function (task) {
          const words = cfg.countWords(drafts[task.id], task);
          return el("a", { class: "card c1-set-card", href: cfg.href(task.id) }, [
            el("span", { class: "c1-chips" }, cfg.chips(task, T, true).map(function (c) { return el("span", { class: "c1-chip", text: c }); })),
            el("span", { class: "c1-set-card-title", text: task.title }),
            el("span", { class: "c1-set-card-best" + (words ? " has-score" : ""), text: words ? "Szkic: " + cfg.wordsLabel(words) : "Nowe zadanie" })
          ]);
        }));
      }
      // Grupy części (B2: Part 1 – esej, Part 2 – jedno z kilku zadań); bez konfiguracji — jedna siatka
      const parts = cfg.partGroups ? cfg.partGroups(T, rest) : null;
      if (!parts) { view.appendChild(grid(rest)); return; }
      parts.forEach(function (g) {
        if (!g.tasks.length) return;
        view.appendChild(el("h2", { class: "section-title wt-part-title", text: g.label }));
        if (g.note) view.appendChild(el("p", { class: "tool-note wt-part-note", text: g.note }));
        view.appendChild(grid(g.tasks));
      });
    }

    /** Zadanie z grupy, w której wybrano inne zadanie: zamiast edytora — informacja i ewentualna zmiana wyboru. */
    function renderOtherChoice(view, T, task, g, cur) {
      const change = canChange(T, g);
      view.appendChild(el("section", { class: "card wt-choice wt-choice-note", "aria-label": "Wybór zadania" }, [
        el("p", null, ["W tej grupie wybrano już zadanie ", el("a", { href: cfg.href(cur.id) }, cur.title), ". Na egzaminie piszesz tylko jedno z dwóch."]),
        change
          ? el("button", { type: "button", class: "btn btn-primary", onclick: function () {
              choose(g, task.id);
              view.replaceChildren();
              renderTask(view, T, task, cfg.section().label);
              const h = view.querySelector("h1"); if (h) { h.tabIndex = -1; h.focus(); }
            } }, "Zmień wybór na to zadanie")
          : el("p", { class: "wt-choice-locked", text: "Żeby zmienić wybór, wyczyść szkic wybranego zadania." })
      ]));
    }

    function renderTask(view, T, task, sectionLabel) {
      const drafts = cfg.drafts();
      let saveTimer = null;

      view.appendChild(cfg.crumb(sectionLabel));
      view.appendChild(el("p", { class: "c1-back" }, el("a", { href: cfg.href() }, ELM.ui.withIcon("chevron-left", "Wszystkie zadania"))));
      view.appendChild(el("h1", { class: "c1-title", text: task.title }));
      view.appendChild(el("p", { class: "c1-chips" }, cfg.chips(task, T, false).map(function (c) { return el("span", { class: "c1-chip", text: c }); })));

      // Polecenie — akapity zachowane (white-space: pre-wrap)
      view.appendChild(el("section", { class: "card c1-prompt", "aria-label": "Polecenie" }, el("p", { class: "c1-prompt-text", text: task.prompt })));

      // Grupa wyboru: inne zadanie wybrane → bez edytora; brak wyboru → wybór przy pierwszym zapisanym tekście
      const group = groupOf(T, task);
      if (group) {
        const cur = chosenIn(T, group);
        if (cur && cur.id !== task.id) { renderOtherChoice(view, T, task, group, cur); return; }
        view.appendChild(el("p", { class: "tool-note wt-note" }, [ELM.icon("info", { size: 16 }),
          cur ? " To Twój wybór w tej grupie. Zmienisz go na liście zadań, gdy szkic będzie pusty."
              : " Na egzaminie wybierasz jedno z dwóch zadań. Zaczęcie pisania wybiera to zadanie."]));
      }

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
            if (group && !chosenIn(T, group) && area.value.trim()) cfg.choices()[group] = task.id;
            cfg.save();
            saved.textContent = "Szkic zapisany";
          }, 400);
          saved.textContent = "Zapisywanie…";
        }
      });
      const saved = el("span", { class: "c1-saved", "aria-live": "polite", text: drafts[task.id] ? "Szkic zapisany" : "" });
      paintCounter(area.value);

      const phrasesBtn = task.genre ? el("button", { type: "button", class: "btn btn-secondary btn-small zw-open", "aria-expanded": "false", "aria-controls": "zw-panel",
        onclick: function () { togglePhrases(); } }, ELM.ui.withIcon("notebook-text", "Zwroty")) : null;
      view.appendChild(el("div", { class: "c1-writing-bar" }, [
        ELM.c1.timer({ key: cfg.timerKey(task), seconds: T.timeMinutes * 60, label: "Czas", exam: true }),
        counter,
        phrasesBtn
      ]));
      if (cfg.timerNote) view.appendChild(el("p", { class: "tool-note wt-note" }, [ELM.icon("info", { size: 16 }), " " + cfg.timerNote]));
      // E8: podany początek (nie liczy się do limitu)
      if (cfg.examExtras && task.opening) {
        view.appendChild(el("p", { class: "wt-opening" }, [el("span", { class: "review-label", text: "Podany początek (nie liczy się do limitu): " }), el("strong", { text: task.opening })]));
      }
      view.appendChild(area);

      // Panel „Zwroty”: zwroty z banku dla gatunku zadania i poziomu egzaminu; „Wstaw” w miejscu kursora
      let panel = null;
      function insertPhrase(raw) {
        const text = ELM.pisanieZwroty.plain(raw);
        const start = area.selectionStart, end = area.selectionEnd, v = area.value;
        const before = start > 0 ? v.charAt(start - 1) : "";
        const after = end < v.length ? v.charAt(end) : "";
        const ins = (before && !/\s/.test(before) ? " " : "") + text + (after && /\s|[.,;:!?)]/.test(after) ? "" : " ");
        area.focus();
        let done = false;
        try { done = document.execCommand("insertText", false, ins); } catch (e) { done = false; } // zachowuje historię cofania (Ctrl+Z)
        if (!done || area.value === v) {
          area.setRangeText(ins, start, end, "end");
          area.dispatchEvent(new Event("input", { bubbles: true }));
        }
        area.focus();
      }
      function closePhrases() {
        if (panel) panel.hidden = true;
        if (phrasesBtn) phrasesBtn.setAttribute("aria-expanded", "false");
        area.focus();
      }
      function fillPhrases(body) {
        const rows = ELM.pisanieZwroty.forTrainer(task.genre, cfg.examId);
        body.replaceChildren();
        if (!rows.length) { body.appendChild(el("p", { class: "tool-note", text: "Brak zwrotów dla tego gatunku." })); return; }
        rows.forEach(function (r) {
          body.appendChild(el("h3", { class: "zw-panel-group", text: r.group.label }));
          body.appendChild(el("ul", { class: "zw-panel-list" }, r.phrases.map(function (p) {
            return el("li", { class: "zw-panel-item" }, [
              el("div", null, [
                el("p", { class: "zw-panel-en", lang: "en", text: p.en }),
                el("p", { class: "zw-panel-pl", lang: "pl", text: p.pl + " · " + p.level })
              ]),
              el("button", { type: "button", class: "btn btn-secondary btn-small", "aria-label": "Wstaw: " + ELM.pisanieZwroty.plain(p.en), onclick: function () { insertPhrase(p.en); } }, "Wstaw")
            ]);
          })));
        });
      }
      function togglePhrases() {
        if (!panel) {
          const body = el("div", { class: "zw-panel-body" }, el("p", { class: "tool-note", role: "status", text: "Wczytuję zwroty…" }));
          panel = el("aside", { class: "zw-panel", id: "zw-panel", role: "complementary", "aria-label": "Zwroty do wstawienia", hidden: true,
            onkeydown: function (ev) { if (ev.key === "Escape") { ev.stopPropagation(); closePhrases(); } } }, [
            el("div", { class: "zw-panel-head" }, [
              el("h2", { class: "zw-panel-title", text: "Zwroty" }),
              el("button", { type: "button", class: "btn btn-link btn-small", "aria-label": "Zamknij panel zwrotów", onclick: closePhrases }, ELM.ui.withIcon("x", "Zamknij"))
            ]),
            body,
            el("p", { class: "tool-note zw-panel-foot" }, el("a", { href: ELM.pisanie.HASH + "/zwroty", text: "Cały bank zwrotów" }))
          ]);
          view.appendChild(panel);
          ELM.loadModule("js/pisanie-zwroty.js").then(function () { return ELM.pisanieZwroty.load(); }).then(function () { fillPhrases(body); }, function () {
            body.replaceChildren(el("p", { class: "tool-note", text: "Nie udało się wczytać zwrotów. Odśwież stronę." }));
          });
        }
        const open = panel.hidden;
        panel.hidden = !open;
        phrasesBtn.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) { const b = panel.querySelector("button"); if (b) b.focus(); } else area.focus();
      }

      const checklist = el("section", { class: "card c1-checklist", hidden: true, "aria-label": "Checklista" });

      view.appendChild(el("div", { class: "c1-writing-actions" }, [
        el("button", {
          type: "button",
          class: "btn btn-primary",
          onclick: function () {
            drafts[task.id] = area.value;
            if (group && !chosenIn(T, group) && area.value.trim()) cfg.choices()[group] = task.id;
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
            cfg.modelHref && task.modelNotes ? el("a", { class: "btn btn-primary", href: cfg.modelHref(task) }, ELM.ui.withIcon("pencil", "Wzorzec z komentarzami")) : null,
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
      if (T.warnBelow && n < T.warnBelow) notes.push(cfg.lowNote ? cfg.lowNote(n, T) : "Masz mniej niż " + T.warnBelow + " wyrazów – oceniana jest wtedy tylko " + (cfg.lowScope || "treść") + ".");
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
        el("p", { class: "tool-note", text: "Wzór to jedna z możliwych odpowiedzi. Sprawdź, czy Twój tekst odnosi się do wszystkich " + (task.bullets && task.bullets.length ? "podpunktów" : "elementów polecenia") + " i ma podobną długość." })
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
