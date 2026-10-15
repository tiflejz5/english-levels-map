/*
 * data-menu.js — okno „Dane”: kopie zapasowe (eksport/import)
 * treści i postępu ucznia oraz resetowanie danych.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  function app() { return ELM.app; }

  // ---------- Okno ----------

  function open() {
    let dlg;
    // Każdy przycisk najpierw zamyka okno „Dane”, potem wykonuje akcję
    function action(label, fn, variant) {
      return el("button", {
        type: "button",
        class: "btn btn-small " + (variant || "btn-secondary"),
        onclick: function () { dlg.close(); fn(); }
      }, label);
    }

    function group(title, desc, buttons) {
      return el("div", { class: "data-group" }, [
        el("h3", { class: "data-group-title", text: title }),
        el("p", { class: "data-group-desc", text: desc }),
        el("div", { class: "data-group-actions" }, buttons)
      ]);
    }

    dlg = ELM.dialogs.open({
      title: "Dane i kopie zapasowe",
      className: "data-dialog",
      body: [
        el("p", { class: "data-hint", text: "Dane zapisują się w tej przeglądarce. Rób eksport co jakiś czas i przechowuj pliki w bezpiecznym miejscu." }),
        group("Treści", "Kategorie, opisy poziomów, essentials i tematy.", [
          action("Eksportuj treści", exportContent, "btn-primary"),
          action("Importuj treści…", importContent)
        ]),
        group("Profile i postęp", "Wszystkie profile z ich zaznaczeniami „Umiem”. Zapisywane osobno, więc import treści ich nie kasuje.", [
          action("Eksportuj profile i postęp", exportProgress, "btn-primary"),
          action("Importuj profile i postęp…", importProgress)
        ]),
        group("Reset", "Operacje nieodwracalne. Najpierw zrób eksport.", [
          action("Zresetuj postęp profilu „" + app().getActiveProfile().name + "”", resetProgress, "btn-danger"),
          action("Zresetuj wszystko", resetAll, "btn-danger")
        ])
      ],
      actions: [{ label: "Zamknij", value: null }]
    });
  }

  // ---------- Eksport ----------

  function exportContent() {
    app().saveContentNow();
    ELM.store.downloadJSON(
      "english-levels-content-" + U.dateStamp() + ".json",
      ELM.store.wrapExport("content", ELM.state.content)
    );
  }

  function exportProgress() {
    ELM.store.downloadJSON(
      "english-levels-progress-" + U.dateStamp() + ".json",
      ELM.store.wrapExport("progress", ELM.state.profiles)
    );
  }

  // ---------- Import ----------

  /** Otwiera okno wyboru pliku i zwraca jego tekst (Promise). */
  function pickFileText() {
    return new Promise(function (resolve) {
      const input = el("input", { type: "file", accept: ".json,application/json" });
      input.addEventListener("change", function () {
        const file = input.files && input.files[0];
        if (!file) return;
        file.text().then(resolve, function () {
          ELM.dialogs.alert({ title: "Błąd odczytu", message: "Nie udało się odczytać pliku." });
        });
      });
      input.click();
    });
  }

  function importContent() {
    pickFileText().then(importContentText);
  }

  /** Import treści z tekstu JSON: walidacja → podsumowanie → potwierdzenie → zapis. */
  function importContentText(text) {
    let data;
    try {
      data = ELM.store.parseContentImport(text);
    } catch (e) {
      return ELM.dialogs.alert({ title: "Nie można zaimportować treści", message: e.message });
    }
    const s = summarize(data);
    return ELM.dialogs.confirm({
      title: "Zastąpić obecne treści?",
      message: "Plik zawiera: kategorie: " + s.categories + ", punkty essentials: " + s.essentials + ", tematy: " + s.topics + ".\n\n" +
        "Obecne treści w tej przeglądarce zostaną nadpisane. Profile i ich postęp pozostaną bez zmian.",
      confirmLabel: "Importuj i nadpisz"
    }).then(function (ok) {
      if (!ok) return false;
      app().replaceContent(data);
      ELM.dialogs.alert({ title: "Gotowe", message: "Treści zostały zaimportowane." });
      return true;
    });
  }

  function importProgress() {
    pickFileText().then(importProgressText);
  }

  /**
   * Import postępu. Nowy format (profile) zastępuje wszystkie profile.
   * Stary format (postęp jednej osoby) trafia do aktywnego profilu.
   */
  function importProgressText(text) {
    let parsed;
    try {
      parsed = ELM.store.parseProgressImport(text);
    } catch (e) {
      return ELM.dialogs.alert({ title: "Nie można zaimportować postępu", message: e.message });
    }
    const active = app().getActiveProfile();
    const isProfiles = parsed.type === "profiles";
    const message = isProfiles
      ? "Plik zawiera profile (" + parsed.data.profiles.length + "): " +
        parsed.data.profiles.map(function (p) { return p.name; }).join(", ") +
        ".\n\nWszystkie obecne profile i ich postęp w tej przeglądarce zostaną zastąpione."
      : "Plik zawiera postęp jednej osoby (starszy format), zaznaczeń „Umiem”: " + Object.keys(parsed.progress).length +
        ".\n\nZostanie wczytany do profilu „" + active.name + "” i zastąpi jego obecny postęp.";
    return ELM.dialogs.confirm({
      title: isProfiles ? "Zastąpić profile?" : "Zastąpić postęp profilu?",
      message: message,
      confirmLabel: "Importuj i nadpisz"
    }).then(function (ok) {
      if (!ok) return false;
      if (isProfiles) app().replaceProfiles(parsed.data);
      else app().replaceProgress(parsed.progress);
      ELM.dialogs.alert({ title: "Gotowe", message: "Postęp został zaimportowany." });
      return true;
    });
  }

  function summarize(data) {
    const s = { categories: data.categories.length, essentials: 0, topics: 0 };
    data.levels.forEach(function (level) {
      Object.keys(level.content).forEach(function (catId) {
        s.essentials += level.content[catId].essentials.length;
        s.topics += level.content[catId].topics.length;
      });
    });
    return s;
  }

  // ---------- Reset ----------

  /** Czyści postęp tylko aktywnego profilu. */
  function resetProgress() {
    ELM.dialogs.confirm({
      title: "Zresetować postęp profilu?",
      message: "Wszystkie zaznaczenia „Umiem” profilu „" + app().getActiveProfile().name + "” zostaną usunięte. Inne profile i treści pozostaną bez zmian.",
      confirmLabel: "Zresetuj postęp"
    }).then(function (ok) {
      if (ok) app().replaceProgress({});
    });
  }

  /** Reset całości — podwójne potwierdzenie. */
  function resetAll() {
    ELM.dialogs.confirm({
      title: "Zresetować wszystko?",
      message: "Zostaną usunięte WSZYSTKIE treści (kategorie, essentials, tematy) oraz wszystkie profile z ich postępem. Aplikacja wróci do stanu jak przy pierwszym otwarciu: bazowej listy umiejętności i domyślnych profili.",
      confirmLabel: "Dalej"
    }).then(function (ok) {
      if (!ok) return false;
      return ELM.dialogs.confirm({
        title: "Na pewno?",
        message: "To ostatnie ostrzeżenie. Tej operacji nie można cofnąć. Jeśli nie masz kopii, anuluj i najpierw zrób eksport.",
        confirmLabel: "Tak, usuń wszystko"
      });
    }).then(function (ok) {
      if (!ok) return;
      ELM.store.clearAll();
      app().replaceProfiles(ELM.createDefaultProfiles());
      app().replaceContent(ELM.createDefaultData());
    });
  }

  ELM.dataMenu = {
    open: open,
    exportContent: exportContent,
    exportProgress: exportProgress,
    importContent: importContent,
    importContentText: importContentText,
    importProgress: importProgress,
    importProgressText: importProgressText
  };
})(window.ELM);
