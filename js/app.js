/*
 * app.js — start aplikacji, stan, zdarzenia i automatyczny zapis.
 *
 * ELM.state przechowuje wszystko, co aplikacja wie w danej chwili:
 *   content  — treści (zapisywane w elm_content_v1)
 *   progress — zaznaczone „Umiem” (zapisywane w elm_progress_v1)
 *   ui       — wybrany poziom / kategoria / temat (elm_ui_v1)
 *   editMode — czy włączony jest tryb edycji (zawsze startuje wyłączony)
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const SAVE_DELAY_MS = 400; // zapis po krótkiej przerwie w pisaniu

  const state = ELM.state = {
    content: null,
    progress: {},
    ui: { levelId: "A1", categoryId: null, topics: {} },
    editMode: false,
    storageOk: true
  };

  let saveTimer = null;

  // =====================================================================
  // START
  // =====================================================================

  function init() {
    try {
      bindStaticEvents();
      state.storageOk = ELM.store.isStorageAvailable();

      if (!state.storageOk) {
        // Bez localStorage aplikacja działa, ale tylko do zamknięcia karty
        state.content = ELM.createDefaultData();
        addBanner("error", "Pamięć przeglądarki (localStorage) jest niedostępna, więc zmiany NIE będą zapisywane. " +
          "Sprawdź ustawienia przeglądarki (np. tryb prywatny, blokada plików cookie). Możesz zaimportować kopię i korzystać ze strony do zamknięcia karty.",
          { label: "Importuj kopię…", onClick: function () { ELM.dataMenu.importContent(); } });
        fixUi();
        renderAll();
        return;
      }

      const progress = ELM.store.loadProgress();
      state.progress = progress.data;
      if (progress.status === "corrupt") {
        addBanner("warning", "Zapisany postęp ucznia był uszkodzony i został wyzerowany. Jeśli masz kopię, zaimportuj ją w menu „Dane”.");
      }

      state.ui = ELM.store.loadUI();

      const loaded = ELM.store.loadContent();
      if (loaded.status === "corrupt") {
        showCorruptScreen(loaded);
        return;
      }
      state.content = loaded.data;
      // Zapisany pusty szkielet (np. z wcześniejszej wizyty) zastępujemy bazową listą.
      // Nie ma w nim żadnej treści, więc nic nie ginie.
      if (loaded.status === "ok" && ELM.BASE_CONTENT && ELM.store.isContentEmpty(state.content)) {
        state.content = ELM.createDefaultData();
        ELM.store.saveContent(state.content);
      }
      if (loaded.status === "new") ELM.store.saveContent(state.content);

      fixUi();
      renderAll();
    } catch (err) {
      showFatal(err);
    }
  }

  function bindStaticEvents() {
    document.getElementById("edit-toggle").addEventListener("change", function (e) {
      setEditMode(e.target.checked);
    });
    document.getElementById("data-menu-btn").addEventListener("click", function () {
      ELM.dataMenu.open();
    });
    // Zapisz zaległe zmiany przy zamykaniu / chowaniu karty
    window.addEventListener("beforeunload", flushSave);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flushSave();
    });
  }

  /** Pilnuje, żeby wybrany poziom i kategoria istniały. */
  function fixUi() {
    const ui = state.ui;
    if (ELM.LEVEL_IDS.indexOf(ui.levelId) === -1) ui.levelId = ELM.LEVEL_IDS[0];
    const cats = state.content.categories;
    if (!cats.some(function (c) { return c.id === ui.categoryId; })) {
      ui.categoryId = cats.length ? cats[0].id : null;
    }
    if (!U.isPlainObject(ui.topics)) ui.topics = {};
  }

  // =====================================================================
  // DOSTĘP DO DANYCH
  // =====================================================================

  function getLevel(levelId) {
    return state.content.levels.find(function (l) { return l.id === levelId; });
  }

  function getActiveLevel() {
    return getLevel(state.ui.levelId) || state.content.levels[0];
  }

  function getActiveCategory() {
    return state.content.categories.find(function (c) { return c.id === state.ui.categoryId; }) || null;
  }

  /** Zestaw treści dla pary poziom + kategoria (tworzony, jeśli go brakuje). */
  function getBucket(levelId, catId) {
    const level = getLevel(levelId);
    if (!level.content[catId]) level.content[catId] = { essentials: [], topics: [] };
    return level.content[catId];
  }

  /** Statystyki „umiem” — liczone tylko z niepustych punktów essentials. */
  function getStats(levelId, catId) {
    if (!catId) return { done: 0, total: 0, percent: 0 };
    const items = getBucket(levelId, catId).essentials.filter(function (e) { return !U.isBlank(e.text); });
    const done = items.filter(function (e) { return state.progress[e.id] === true; }).length;
    const total = items.length;
    return { done: done, total: total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function topicKey() {
    return state.ui.levelId + "|" + state.ui.categoryId;
  }

  /** Wybrany temat w bieżącym poziomie i kategorii (domyślnie pierwszy). */
  function getActiveTopic(bucket) {
    const id = state.ui.topics[topicKey()];
    return bucket.topics.find(function (t) { return t.id === id; }) || bucket.topics[0] || null;
  }

  // =====================================================================
  // NAWIGACJA
  // =====================================================================

  function selectLevel(levelId) {
    flushSave();
    state.ui.levelId = levelId;
    saveUI();
    renderAll({ resetScroll: true });
  }

  function selectCategory(catId) {
    flushSave();
    state.ui.categoryId = catId;
    saveUI();
    renderAll();
  }

  /** opts.silent = tylko zapamiętaj wybór, bez przerysowania. */
  function selectTopic(topicId, opts) {
    state.ui.topics[topicKey()] = topicId;
    saveUI();
    if (!opts || !opts.silent) renderMainOnly();
  }

  function setEditMode(on) {
    flushSave();
    state.editMode = !!on;
    renderAll();
  }

  // =====================================================================
  // RYSOWANIE
  // =====================================================================

  function renderAll(opts) {
    ELM.render.renderSidebar();
    ELM.render.renderMain(opts);
  }

  function renderMainOnly(opts) {
    ELM.render.renderMain(opts);
  }

  /** Odświeża liczniki i paski postępu bez przerysowania treści (fokus zostaje). */
  function refreshProgress() {
    ELM.render.renderSidebar();
    ELM.render.updateEssentialsProgress();
  }

  // =====================================================================
  // ZAPIS
  // =====================================================================

  /** Zapis z opóźnieniem — używany podczas pisania w polach. */
  function scheduleSave() {
    setSaveStatus("Zapisywanie…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveContentNow, SAVE_DELAY_MS);
  }

  /** Natychmiastowy zapis treści. */
  function saveContentNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!state.content) return;
    if (!state.storageOk) {
      setSaveStatus("Zmiany nie są zapisywane (brak dostępu do pamięci).", true);
      return;
    }
    const res = ELM.store.saveContent(state.content);
    if (res.ok) {
      const now = new Date();
      setSaveStatus("Zapisano o " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0"));
    } else {
      setSaveStatus("Nie zapisano! " + res.error, true);
    }
  }

  /** Zapisuje zaległe zmiany, jeśli czekają w kolejce. */
  function flushSave() {
    if (saveTimer) saveContentNow();
  }

  function saveProgressNow() {
    if (!state.storageOk) return;
    const res = ELM.store.saveProgress(state.progress);
    if (!res.ok) setSaveStatus("Nie zapisano postępu! " + res.error, true);
  }

  function saveUI() {
    if (state.storageOk) ELM.store.saveUI(state.ui);
  }

  /** Po zmianie struktury: zapisz od razu i przerysuj widok. */
  function commit(opts) {
    saveContentNow();
    renderAll(opts);
  }

  function setSaveStatus(text, isError) {
    const node = document.getElementById("save-status");
    node.textContent = text;
    node.classList.toggle("is-error", !!isError);
  }

  // =====================================================================
  // POSTĘP UCZNIA
  // =====================================================================

  function setProgress(essentialId, checked) {
    if (checked) state.progress[essentialId] = true;
    else delete state.progress[essentialId];
    saveProgressNow();
    refreshProgress();
  }

  // =====================================================================
  // PODMIANA DANYCH (import / reset)
  // =====================================================================

  function replaceContent(data) {
    clearTimeout(saveTimer);
    saveTimer = null;
    state.content = data;
    fixUi();
    saveContentNow();
    saveUI();
    document.getElementById("edit-toggle").disabled = false; // po ekranie błędu
    renderAll({ resetScroll: true });
  }

  function replaceProgress(progress) {
    state.progress = progress;
    saveProgressNow();
    if (state.content) refreshProgress();
    if (state.content) renderMainOnly(); // odśwież checkboxy
  }

  // =====================================================================
  // KOMUNIKATY I EKRANY BŁĘDÓW
  // =====================================================================

  /** Baner nad treścią. type: "warning" | "error". */
  function addBanner(type, text, action) {
    const banner = el("div", { class: "banner is-" + type, role: type === "error" ? "alert" : "status" }, [
      el("span", { class: "banner-text", text: text }),
      action ? el("button", { type: "button", class: "btn btn-small btn-secondary", onclick: action.onClick }, action.label) : null,
      el("button", {
        type: "button",
        class: "icon-btn",
        "aria-label": "Zamknij komunikat",
        title: "Zamknij komunikat",
        onclick: function () { banner.remove(); }
      }, el("span", { "aria-hidden": "true", text: "✕" }))
    ]);
    document.getElementById("banners").appendChild(banner);
  }

  /** Ekran, gdy zapisane treści są uszkodzone — zamiast białej strony. */
  function showCorruptScreen(loaded) {
    document.getElementById("edit-toggle").disabled = true;
    document.getElementById("level-list").replaceChildren();
    document.getElementById("sidebar-category-name").textContent = "";

    const view = document.getElementById("view");
    view.replaceChildren(el("div", { class: "error-screen" }, [
      el("h1", { text: "Nie udało się wczytać zapisanych treści" }),
      el("p", { text: "Dane zapisane w tej przeglądarce są uszkodzone lub mają nieznany format. Nic nie zostało jeszcze usunięte." }),
      el("p", { text: "Najlepiej zaimportuj ostatnią kopię zapasową (plik english-levels-content-….json). Możesz też pobrać uszkodzone dane do pliku albo zacząć od nowa od listy bazowej." }),
      el("div", { class: "error-details", text: "Szczegóły: " + loaded.error }),
      el("div", { class: "error-actions" }, [
        el("button", {
          type: "button",
          class: "btn btn-primary",
          onclick: function () {
            ELM.store.backupCorrupt(loaded.raw);
            ELM.dataMenu.importContent();
          }
        }, "Importuj kopię treści…"),
        el("button", {
          type: "button",
          class: "btn btn-secondary",
          onclick: function () {
            const blob = new Blob([loaded.raw], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = el("a", { href: url, download: "english-levels-uszkodzone-" + U.dateStamp() + ".txt" });
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
          }
        }, "Pobierz uszkodzone dane"),
        el("button", {
          type: "button",
          class: "btn btn-danger",
          onclick: function () {
            ELM.dialogs.confirm({
              title: "Zacząć od listy bazowej?",
              message: "Uszkodzone dane zostaną odłożone w kopii awaryjnej (klucz elm_content_corrupt_backup), a aplikacja wystartuje od listy bazowej. Postęp ucznia zostaje.",
              confirmLabel: "Zacznij od nowa"
            }).then(function (ok) {
              if (!ok) return;
              ELM.store.backupCorrupt(loaded.raw);
              replaceContent(ELM.createDefaultData());
            });
          }
        }, "Zacznij od listy bazowej")
      ])
    ]));
  }

  /** Ostatnia deska ratunku przy nieoczekiwanym błędzie. */
  function showFatal(err) {
    console.error(err);
    const view = document.getElementById("view");
    if (!view) return;
    view.replaceChildren(el("div", { class: "error-screen" }, [
      el("h1", { text: "Coś poszło nie tak" }),
      el("p", { text: "Aplikacja napotkała nieoczekiwany błąd. Spróbuj odświeżyć stronę. Jeśli problem wraca, zaimportuj kopię zapasową w menu „Dane”." }),
      el("div", { class: "error-details", text: String(err && err.stack || err) }),
      el("div", { class: "error-actions" }, [
        el("button", { type: "button", class: "btn btn-primary", onclick: function () { location.reload(); } }, "Odśwież stronę"),
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { ELM.dataMenu.open(); } }, "Otwórz menu „Dane”")
      ])
    ]));
  }

  ELM.app = {
    init: init,
    getActiveLevel: getActiveLevel,
    getActiveCategory: getActiveCategory,
    getBucket: getBucket,
    getStats: getStats,
    getActiveTopic: getActiveTopic,
    selectLevel: selectLevel,
    selectCategory: selectCategory,
    selectTopic: selectTopic,
    setEditMode: setEditMode,
    refreshProgress: refreshProgress,
    scheduleSave: scheduleSave,
    saveContentNow: saveContentNow,
    saveProgressNow: saveProgressNow,
    saveUI: saveUI,
    commit: commit,
    setProgress: setProgress,
    replaceContent: replaceContent,
    replaceProgress: replaceProgress
  };

  // Start po wczytaniu strony
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window.ELM);
