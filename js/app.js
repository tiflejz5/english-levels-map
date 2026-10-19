/*
 * app.js — start aplikacji, stan, zdarzenia i automatyczny zapis.
 *
 * ELM.state przechowuje wszystko, co aplikacja wie w danej chwili:
 *   content  — treści (zapisywane w elm_content_v1)
 *   profiles — profile z osobnym postępem (zapisywane w elm_profiles_v1)
 *   progress — postęp AKTYWNEGO profilu (odnośnik do profiles…progress)
 *   ui       — wybrany poziom / kategoria (elm_ui_v1)
 *   view     — co jest wyświetlane: "home" (strona główna, adres #/),
 *              "level" (lista poziomu, #/a1) albo "page" (podstrona, #/a1/…)
 *   route    — otwarta podstrona niezbędnika ({ file }) albo null
 *   c1Route  — widok zakładki „Certyfikat C1” (view "c1"), patrz js/c1-core.js
 *   toolRoute — widoki nauki: "today" (#/dzis, js/today.js),
 *              "leveltest" (#/test-poziomu, js/level-test.js),
 *              "journal" (#/bledy, js/journal.js)
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const state = ELM.state = {
    content: null,
    profiles: null,
    progress: {},
    ui: { levelId: "A1", categoryId: null },
    storageOk: true,
    view: "home",
    route: null,
    c1Route: null,
    toolRoute: null,
    listScroll: 0 // pozycja przewinięcia listy, przywracana po powrocie z podstrony
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
        state.profiles = ELM.createEmptyProfiles();
        syncProgress();
        addBanner("error", "Pamięć przeglądarki (localStorage) jest niedostępna, więc zmiany NIE będą zapisywane. " +
          "Sprawdź ustawienia przeglądarki (np. tryb prywatny, blokada plików cookie). Możesz zaimportować kopię i korzystać ze strony do zamknięcia karty.",
          { label: "Importuj kopię…", onClick: function () { ELM.dataMenu.importAll(); } });
        fixUi();
        applyRoute();
        renderAll();
        return;
      }

      const prof = ELM.store.loadProfiles();
      state.profiles = prof.data;
      syncProgress();
      if (prof.status === "new") ELM.store.saveProfiles(state.profiles);
      if (prof.migrated && getActiveProfile()) {
        addBanner("info", "Wprowadzono profile. Dotychczasowe zaznaczenia „Umiem” (" + prof.migrated + ") przypisano do profilu „" + getActiveProfile().name + "”.");
      }
      if (prof.status === "corrupt") {
        addBanner("warning", "Zapisane profile były uszkodzone. Uszkodzony zapis odłożono w kopii awaryjnej; jeśli masz kopię, zaimportuj ją w menu „Dane”.");
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
      applyRoute();
      renderAll();
    } catch (err) {
      showFatal(err);
    }
  }

  function bindStaticEvents() {
    ELM.profiles.bindEvents();
    // Zapisz zaległe zmiany przy zamykaniu / chowaniu karty
    window.addEventListener("beforeunload", flushSave);
    // Podstrony niezbędnika: adresy #/a1/… (zmiana adresu = zmiana widoku)
    window.addEventListener("hashchange", onRoute);
    // Menu boczne jako szuflada na telefonie
    document.getElementById("menu-btn").addEventListener("click", function () { setNavOpen(!document.body.classList.contains("nav-open")); });
    document.getElementById("nav-overlay").addEventListener("click", function () { setNavOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open") && !document.querySelector("dialog[open]")) {
        setNavOpen(false);
        document.getElementById("menu-btn").focus();
      }
    });
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

  /** Postęp całego poziomu: suma wszystkich kategorii (lewy panel, strona „Dziś”). */
  function getLevelStats(levelId) {
    let done = 0, total = 0;
    state.content.categories.forEach(function (cat) {
      const s = getStats(levelId, cat.id);
      done += s.done;
      total += s.total;
    });
    return { done: done, total: total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  // =====================================================================
  // NAWIGACJA
  // =====================================================================

  /** Adres listy poziomu, np. "#/a1". */
  function levelHash(levelId) {
    return "#/" + String(levelId).toLowerCase();
  }

  /** Przejście do listy poziomu (sidebar). Zmienia adres na #/a1 itd. */
  function selectLevel(levelId) {
    flushSave();
    state.ui.levelId = levelId;
    saveUI();
    state.listScroll = 0;
    if (location.hash === levelHash(levelId)) renderAll({ resetScroll: true });
    else location.hash = levelHash(levelId);
  }

  // =====================================================================
  // ADRESY (routing przez #)
  //   ""  lub "#/"        → strona główna
  //   "#/a1" … "#/c2"     → lista poziomu
  //   "#/a1/<podstrona>"  → podstrona punktu (niezbędnik)
  //   "#/dzis"            → strona „Dziś”
  //   "#/test-poziomu"    → szybki test poziomu
  //   "#/bledy[/powtorki]" → dziennik błędów i sesja powtórek
  // =====================================================================

  /** Odczytuje adres i ustawia state.view, state.route i wybrany poziom. */
  function applyRoute() {
    const hash = location.hash || "";
    const level = /^#\/([abcABC][12])\/?$/.exec(hash);
    const c1 = ELM.c1 ? ELM.c1.parseRoute(hash) : null;
    const journal = ELM.journal ? ELM.journal.parseRoute(hash) : null;
    const today = ELM.today ? ELM.today.parseRoute(hash) : null;
    const levelTest = ELM.levelTest ? ELM.levelTest.parseRoute(hash) : null;
    state.route = null;
    state.c1Route = null;
    state.toolRoute = null;

    if (!hash || hash === "#" || hash === "#/") {
      state.view = "home";
    } else if (levelTest) {
      state.view = "leveltest";
      state.toolRoute = levelTest;
    } else if (today) {
      state.view = "today";
      state.toolRoute = today;
    } else if (journal) {
      state.view = "journal";
      state.toolRoute = journal;
    } else if (c1) {
      state.view = "c1"; // zakładka „Certyfikat C1”
      state.c1Route = c1;
    } else if (level) {
      state.view = "level";
      state.ui.levelId = level[1].toUpperCase();
    } else {
      state.route = ELM.niezbednik.parseRoute(hash);
      state.view = state.route ? "page" : "home";
      if (state.route) {
        const found = ELM.niezbednik.findItem(state.route.file);
        if (found && ELM.LEVEL_IDS.indexOf(found.level) !== -1) state.ui.levelId = found.level;
      }
    }
  }

  /** Reakcja na zmianę adresu (linki, „Wróć”, logo, przycisk Wstecz). */
  function onRoute() {
    if (!state.content) return;
    flushSave();
    const previous = state.view;
    const previousHash = state.lastHash;
    if (previous === "level") state.listScroll = U.getScroll();
    setNavOpen(false);
    if (ELM.sidebar) ELM.sidebar.afterNavigate();
    if (ELM.motion) ELM.motion.cleanup(); // animacje poprzedniej strony (GSAP) sprzątamy
    applyRoute();
    state.lastHash = location.hash;
    if (state.view === "journal" && previousHash !== location.hash) ELM.journal.onEnter(state.toolRoute);
    if (state.view === "leveltest" && previousHash !== location.hash) ELM.levelTest.onEnter();
    saveUI();
    if (state.view !== "page") document.title = "English Levels Map (A1–C2)";
    if (state.view === "level" && previous === "page") {
      renderAll({ scrollTop: state.listScroll }); // powrót z podstrony: to samo miejsce listy
    } else {
      renderAll({ resetScroll: true });
    }
    playViewEnter();
  }

  /** Krótka animacja wejścia treści po zmianie strony (CSS: .view-enter). */
  function playViewEnter() {
    const view = document.getElementById("view");
    if (!view) return;
    view.classList.remove("view-enter");
    void view.offsetWidth; // wymusza ponowne uruchomienie animacji
    view.classList.add("view-enter");
  }

  /** Otwiera/zamyka menu boczne jako szufladę (tylko wąski ekran). */
  function setNavOpen(open) {
    document.body.classList.toggle("nav-open", open);
    document.getElementById("nav-overlay").hidden = !open;
    document.getElementById("menu-btn").setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      const first = document.querySelector("#sidebar a, #sidebar button");
      if (first) first.focus();
    }
  }

  /** Powrót z podstrony do listy (poziom + kategoria punktu). */
  function goToList(target) {
    if (target.levelId) state.ui.levelId = target.levelId;
    if (target.categoryId && state.content.categories.some(function (c) { return c.id === target.categoryId; })) {
      state.ui.categoryId = target.categoryId;
    }
    saveUI();
    const hash = levelHash(state.ui.levelId);
    if (location.hash === hash) onRoute();
    else location.hash = hash;
  }

  function selectCategory(catId) {
    flushSave();
    state.ui.categoryId = catId;
    saveUI();
    renderAll();
  }

  // =====================================================================
  // RYSOWANIE
  // =====================================================================

  function renderAll(opts) {
    ELM.profiles.render();
    ELM.render.renderSidebar();
    ELM.render.renderMain(opts);
  }

  function renderMainOnly(opts) {
    ELM.render.renderMain(opts);
  }

  /** Odświeża plakietki nauki w lewym panelu (np. liczbę powtórek na dziś). */
  function refreshLearning() {
    ELM.render.renderToolsNav();
  }

  /** Odświeża liczniki i paski postępu bez przerysowania treści (fokus zostaje). */
  function refreshProgress() {
    ELM.render.renderSidebar();
    ELM.render.updateEssentialsProgress();
  }

  // =====================================================================
  // ZAPIS
  // =====================================================================

  /** Natychmiastowy zapis treści. */
  function saveContentNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!state.content) return;
    if (!state.storageOk) return; // komunikat o braku pamięci jest już na banerze
    const res = ELM.store.saveContent(state.content);
    if (!res.ok) reportSaveError("Nie zapisano treści! " + res.error);
  }

  /** Zapisuje zaległe zmiany, jeśli czekają w kolejce. */
  function flushSave() {
    if (saveTimer) saveContentNow();
  }

  /** Zapisuje profile (razem z postępem każdego z nich). */
  function saveProgressNow() {
    if (!state.storageOk) return;
    const res = ELM.store.saveProfiles(state.profiles);
    if (!res.ok) reportSaveError("Nie zapisano postępu! " + res.error);
  }

  function saveUI() {
    if (state.storageOk) ELM.store.saveUI(state.ui);
  }

  /** Błąd zapisu: pokazujemy baner (tylko raz dla tego samego komunikatu). */
  let lastSaveError = "";
  function reportSaveError(text) {
    if (text === lastSaveError) return;
    lastSaveError = text;
    addBanner("error", text + " Zrób eksport danych, żeby nie stracić zmian.");
  }

  // =====================================================================
  // POSTĘP UCZNIA
  // =====================================================================

  function setProgress(essentialId, checked) {
    if (!getActiveProfile()) return; // bez profilu nie ma gdzie zapisać postępu
    if (checked) state.progress[essentialId] = true;
    else delete state.progress[essentialId];
    saveProgressNow();
    ELM.markActivity(); // zmiana „Umiem” = dzień nauki
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
    renderAll({ resetScroll: true });
  }

  /** Zastępuje postęp AKTYWNEGO profilu. */
  function replaceProgress(progress) {
    const active = getActiveProfile();
    if (!active) return;
    active.progress = progress;
    profilesChanged();
  }

  /**
   * Zastępuje wszystkie profile (import / reset). learning — zaimportowane
   * dane nauki (dziennik, aktywność, test) albo null (stary plik bez nich).
   * Dane nauki profili, których już nie ma, są usuwane.
   */
  function replaceProfiles(profilesData, learning) {
    state.profiles = profilesData;
    if (ELM.profileData) ELM.profileData.applyImport(learning || null, profilesData.profiles.map(function (p) { return p.id; }));
    profilesChanged();
  }

  // =====================================================================
  // PROFILE
  // =====================================================================

  /** Aktywny profil albo null, gdy nie ma żadnego profilu. */
  function getActiveProfile() {
    const p = state.profiles;
    if (!p || !p.profiles.length) return null;
    return p.profiles.find(function (x) { return x.id === p.activeId; }) || p.profiles[0];
  }

  function hasProfiles() {
    return !!getActiveProfile();
  }

  /** Ustawia state.progress na postęp aktywnego profilu (bez profilu: pusty). */
  function syncProgress() {
    const active = getActiveProfile();
    state.profiles.activeId = active ? active.id : null;
    state.progress = active ? active.progress : {};
  }

  /** Dodaje profil o podanej nazwie i ustawia go jako aktywny. */
  function addProfile(name) {
    const profile = { id: U.uid("p"), name: String(name).trim(), progress: {} };
    state.profiles.profiles.push(profile);
    state.profiles.activeId = profile.id;
    profilesChanged();
    return profile;
  }

  function selectProfile(profileId) {
    state.profiles.activeId = profileId;
    profilesChanged();
  }

  /** Po każdej zmianie profili: przelicz, zapisz, przerysuj. */
  function profilesChanged() {
    syncProgress();
    saveProgressNow();
    if (state.content) renderAll();
  }

  /** Liczba zaznaczonych „Umiem” w profilu (tylko istniejące, niepuste punkty). */
  function countDone(progress) {
    if (!state.content) return 0;
    let n = 0;
    state.content.levels.forEach(function (level) {
      Object.keys(level.content).forEach(function (catId) {
        level.content[catId].essentials.forEach(function (e) {
          if (progress[e.id] === true && !U.isBlank(e.text)) n++;
        });
      });
    });
    return n;
  }

  // =====================================================================
  // KOMUNIKATY I EKRANY BŁĘDÓW
  // =====================================================================

  /** Baner nad treścią. type: "info" | "warning" | "error". */
  function addBanner(type, text, action) {
    const banner = el("div", { class: "banner is-" + type, role: type === "error" ? "alert" : "status" }, [
      el("span", { class: "banner-text", text: text }),
      action ? el("button", { type: "button", class: "btn btn-small btn-secondary", onclick: action.onClick }, action.label) : null,
      el("button", {
        type: "button",
        class: "icon-btn",
        "aria-label": "Zamknij komunikat",
        "data-tooltip": "Zamknij komunikat",
        "data-tooltip-align": "end",
        onclick: function () { banner.remove(); }
      }, ELM.icon("x", { size: 18 }))
    ]);
    document.getElementById("banners").appendChild(banner);
  }

  /** Ekran, gdy zapisane treści są uszkodzone — zamiast białej strony. */
  function showCorruptScreen(loaded) {
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
            ELM.dataMenu.importAll();
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
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { ELM.dataMenu.importAll(); } }, "Importuj dane…")
      ])
    ]));
  }

  ELM.app = {
    init: init,
    getActiveLevel: getActiveLevel,
    getActiveCategory: getActiveCategory,
    getBucket: getBucket,
    getStats: getStats,
    getLevelStats: getLevelStats,
    selectLevel: selectLevel,
    levelHash: levelHash,
    goToList: goToList,
    selectCategory: selectCategory,
    refreshProgress: refreshProgress,
    refreshLearning: refreshLearning,
    reportSaveError: reportSaveError,
    saveContentNow: saveContentNow,
    saveProgressNow: saveProgressNow,
    saveUI: saveUI,
    setProgress: setProgress,
    replaceContent: replaceContent,
    replaceProgress: replaceProgress,
    replaceProfiles: replaceProfiles,
    getActiveProfile: getActiveProfile,
    hasProfiles: hasProfiles,
    addProfile: addProfile,
    selectProfile: selectProfile,
    profilesChanged: profilesChanged,
    countDone: countDone
  };

  // Start po wczytaniu strony
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window.ELM);
