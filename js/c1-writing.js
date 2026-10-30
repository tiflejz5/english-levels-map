/*
 * c1-writing.js — trener Writing Certyfikatu C1 (trening/pisanie.json).
 *
 * #/certyfikat-c1/trening-pisanie            → lista zadań
 * #/certyfikat-c1/trening-pisanie/<zadanie>  → edytor zadania:
 *   polecenie, pole tekstowe bez sprawdzania pisowni (jak na egzaminie),
 *   licznik słów na żywo, timer 45 min w stylu wersji komputerowej,
 *   automatyczny zapis szkicu, a po „Skończyłem” checklista egzaminatora.
 *
 * Silnik trenera jest wspólny z innymi egzaminami: js/writing-trainer.js.
 * Ten plik to konfiguracja C1 (zachowanie i dane bez zmian: szkice w elm_c1_v1).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const GENRE_LABELS = { essay: "Essay", letter: "Letter", email: "Email", proposal: "Proposal", report: "Report", review: "Review" };

  function c1() { return ELM.c1; }

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

  const trainer = ELM.writingTrainer.create({
    trainer: function () { return ELM.C1 && ELM.C1.trainers["trening-pisanie"]; },
    section: function () { const f = c1().findTrainer("trening-pisanie"); return f ? f.section : null; },
    crumb: function (label) { return c1().crumb(label); },
    notFound: function (msg) { return c1().notFound(msg === "Brak danych trenera pisania." ? "Brak danych trenera Writing." : msg); },
    href: function (taskId) { return c1().hrefTrainer("trening-pisanie") + (taskId ? "/" + taskId : ""); },
    drafts: function () { return c1().store.data().drafts; },
    save: function () { c1().store.save(); },
    countWords: function (text) { return countWords(text); },
    wordsLabel: wordsLabel,
    counter: function (n, T) {
      const low = n < T.wordRange[0], high = n > T.wordRange[1];
      const ideal = n >= T.targetRange[0] && n <= T.targetRange[1];
      return {
        cls: low ? "is-low" : high ? "is-high" : "is-ok",
        hint: low ? " · za mało (min. " + T.wordRange[0] + ")" : high ? " · za dużo (max " + T.wordRange[1] + ")" : ideal ? " · idealnie" : " · w normie (idealnie " + T.targetRange[0] + "–" + T.targetRange[1] + ")"
      };
    },
    listTitle: "Trening Writing",
    listLead: function (T) {
      return "Wybierz zadanie. Jak na egzaminie komputerowym: " + T.timeMinutes + " minut, " + T.wordRange[0] + "–" + T.wordRange[1] +
        " słów, licznik słów na żywo i bez sprawdzania pisowni. Szkic zapisuje się automatycznie w tej przeglądarce.";
    },
    chips: function (task, T, inList) {
      const out = ["Part " + task.part, GENRE_LABELS[task.genre] || task.genre];
      if (!inList) out.push(T.wordRange[0] + "–" + T.wordRange[1] + " słów");
      return out;
    },
    genreTitle: function (task) { return "Gatunek: " + (GENRE_LABELS[task.genre] || task.genre); },
    genrePage: function (task) {
      const id = genrePageId(task.genre);
      const page = c1().findPage(id);
      return page ? { href: c1().hrefPage(id), label: page.page.label } : null;
    },
    modelHref: function (task) { return "#/pisanie/wzorce/certyfikat-c1/" + task.id; },
    timerKey: function (task) { return "writing:" + task.id; }
  });

  ELM.c1Writing = { render: trainer.render, countWords: countWords };
})(window.ELM);
