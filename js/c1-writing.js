/*
 * c1-writing.js — trener Writing (trening/pisanie.json).
 *
 * #/certyfikat-c1/trening-pisanie            → lista zadań
 * #/certyfikat-c1/trening-pisanie/<zadanie>  → edytor zadania:
 *   polecenie, pole tekstowe bez sprawdzania pisowni (jak na egzaminie),
 *   licznik słów na żywo, timer 45 min w stylu wersji komputerowej,
 *   automatyczny zapis szkicu, a po „Skończyłem” checklista egzaminatora.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const GENRE_LABELS = { essay: "Essay", letter: "Letter", email: "Email", proposal: "Proposal", report: "Report", review: "Review" };

  function c1() { return ELM.c1; }
  function trainer() { return ELM.C1 && ELM.C1.trainers["trening-pisanie"]; }
  function baseHref() { return c1().hrefTrainer("trening-pisanie"); }

  /** Liczba słów jak w liczniku egzaminu: ciągi znaków rozdzielone spacjami. */
  function countWords(text) {
    const t = String(text || "").trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function wordsLabel(n) {
    return n + " " + c1().plural(n, "słowo", "słowa", "słów");
  }

  /** Strona gatunku: letter i email → writing-email-letter. */
  function genrePageId(genre) {
    return genre === "letter" || genre === "email" ? "writing-email-letter" : "writing-" + genre;
  }

  // =====================================================================
  // LISTA ZADAŃ
  // =====================================================================

  function renderList(view, T, sectionLabel) {
    const drafts = c1().store.data().drafts;
    view.appendChild(c1().crumb(sectionLabel));
    view.appendChild(el("h1", { class: "c1-title", text: "Trening Writing" }));
    view.appendChild(el("p", { class: "c1-lead", text: "Wybierz zadanie. Jak na egzaminie komputerowym: " + T.timeMinutes +
      " minut, " + T.wordRange[0] + "–" + T.wordRange[1] + " słów, licznik słów na żywo i bez sprawdzania pisowni. Szkic zapisuje się automatycznie w tej przeglądarce." }));
    view.appendChild(el("div", { class: "c1-set-grid" }, T.tasks.map(function (task) {
      const words = countWords(drafts[task.id]);
      return el("a", { class: "card c1-set-card", href: baseHref() + "/" + task.id }, [
        el("span", { class: "c1-chips" }, [
          el("span", { class: "c1-chip", text: "Part " + task.part }),
          el("span", { class: "c1-chip", text: GENRE_LABELS[task.genre] || task.genre })
        ]),
        el("span", { class: "c1-set-card-title", text: task.title }),
        el("span", { class: "c1-set-card-best" + (words ? " has-score" : ""), text: words ? "Szkic: " + wordsLabel(words) : "Nowe zadanie" })
      ]);
    })));
  }

  // =====================================================================
  // EDYTOR ZADANIA
  // =====================================================================

  function renderTask(view, T, task, sectionLabel) {
    const store = c1().store;
    const drafts = store.data().drafts;
    let saveTimer = null;

    view.appendChild(c1().crumb(sectionLabel));
    view.appendChild(el("p", { class: "c1-back" }, el("a", { href: baseHref() }, "← Wszystkie zadania")));
    view.appendChild(el("h1", { class: "c1-title", text: task.title }));
    view.appendChild(el("p", { class: "c1-chips" }, [
      el("span", { class: "c1-chip", text: "Part " + task.part }),
      el("span", { class: "c1-chip", text: GENRE_LABELS[task.genre] || task.genre }),
      el("span", { class: "c1-chip", text: T.wordRange[0] + "–" + T.wordRange[1] + " słów" })
    ]));

    // Polecenie — akapity zachowane (white-space: pre-wrap)
    view.appendChild(el("section", { class: "card c1-prompt", "aria-label": "Polecenie" }, el("p", { class: "c1-prompt-text", text: task.prompt })));

    // Licznik słów
    const counter = el("span", { class: "c1-words", "aria-live": "polite" });
    function paintCounter(text) {
      const n = countWords(text);
      const low = n < T.wordRange[0], high = n > T.wordRange[1];
      const ideal = n >= T.targetRange[0] && n <= T.targetRange[1];
      counter.className = "c1-words " + (low ? "is-low" : high ? "is-high" : "is-ok");
      counter.replaceChildren(
        el("strong", { text: wordsLabel(n) }),
        el("span", { class: "c1-words-hint", text: low ? " · za mało (min. " + T.wordRange[0] + ")" : high ? " · za dużo (max " + T.wordRange[1] + ")" : ideal ? " · idealnie" : " · w normie (idealnie " + T.targetRange[0] + "–" + T.targetRange[1] + ")" })
      );
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
          store.save();
          saved.textContent = "Szkic zapisany";
        }, 400);
        saved.textContent = "Zapisywanie…";
      }
    });
    const saved = el("span", { class: "c1-saved", "aria-live": "polite", text: drafts[task.id] ? "Szkic zapisany" : "" });
    paintCounter(area.value);

    view.appendChild(el("div", { class: "c1-writing-bar" }, [
      c1().timer({ key: "writing:" + task.id, seconds: T.timeMinutes * 60, label: "Czas", exam: true }),
      counter
    ]));
    view.appendChild(area);

    // Checklista po zakończeniu
    const checklist = el("section", { class: "card c1-checklist", hidden: true, "aria-label": "Checklista" });

    view.appendChild(el("div", { class: "c1-writing-actions" }, [
      el("button", {
        type: "button",
        class: "btn btn-primary",
        onclick: function () {
          drafts[task.id] = area.value;
          store.save();
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
            store.save();
            paintCounter("");
            saved.textContent = "";
            checklist.hidden = true;
          });
        }
      }, "Wyczyść szkic"),
      saved
    ]));
    view.appendChild(checklist);

    function group(title, items) {
      if (!items || !items.length) return null;
      return el("div", { class: "c1-check-group" }, [
        el("h3", { class: "c1-check-title", text: title }),
        el("ul", { class: "task-list" }, items.map(function (text) {
          return el("li", { class: "task-item" }, el("label", null, [el("input", { type: "checkbox" }), el("span", { text: text })]));
        }))
      ]);
    }

    function fillChecklist() {
      const n = countWords(area.value);
      const pageId = genrePageId(task.genre);
      const page = c1().findPage(pageId);
      const copyStatus = el("span", { class: "c1-saved", "aria-live": "polite" });
      checklist.replaceChildren(
        el("h2", { class: "section-title", text: "Sprawdź przed oddaniem" }),
        el("p", { class: "c1-lead", text: "Twój tekst: " + wordsLabel(n) + ". Odhacz to, co jest w porządku – reszta to rzeczy do poprawy." }),
        group("Punkty polecenia", task.points),
        group("Gatunek: " + (GENRE_LABELS[task.genre] || task.genre), task.genreChecklist),
        group("Ogólne", T.genericChecklist),
        el("div", { class: "c1-writing-actions" }, [
          page ? el("a", { class: "btn btn-secondary", href: c1().hrefPage(pageId) }, "Więcej o gatunku: " + page.page.label + " ›") : null,
          el("button", {
            type: "button",
            class: "btn btn-secondary",
            onclick: function () { copyText(area.value, copyStatus); }
          }, "Kopiuj tekst"),
          copyStatus
        ])
      );
    }
  }

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

  function render(view, taskId) {
    const T = trainer();
    const found = c1().findTrainer("trening-pisanie");
    if (!T || !found) { view.appendChild(c1().notFound("Brak danych trenera Writing.")); return null; }
    if (!taskId) { renderList(view, T, found.section.label); return "Trening Writing"; }
    const task = T.tasks.find(function (t) { return t.id === taskId; });
    if (!task) { view.appendChild(c1().notFound("Nie znaleziono takiego zadania.")); return null; }
    renderTask(view, T, task, found.section.label);
    return task.title;
  }

  ELM.c1Writing = { render: render, countWords: countWords };
})(window.ELM);
