/*
 * default-data.js — dane startowe.
 *
 * Używane, gdy w przeglądarce nie ma jeszcze zapisanych treści
 * (pierwsze uruchomienie) oraz po „Zresetuj wszystko”.
 *
 * Jeśli dołączony jest js/base-content.js, startujemy od bazowej listy
 * umiejętności. Bez niego startujemy od pustego szkieletu (poniżej).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  // Stała lista poziomów CEFR. Poziomów nie można usuwać w aplikacji.
  ELM.LEVEL_IDS = ["A1", "A2", "B1", "B2", "C1", "C2"];

  // Kategorie, z którymi startuje PUSTA aplikacja.
  // Aby dodać kolejną kategorię domyślną, dopisz np.:
  //   { id: "cat_vocabulary", name: "Słownictwo" }
  // (id musi być unikalne i nie powinno się później zmieniać).
  // Uwaga: zmiana działa tylko dla nowych danych / po „Zresetuj wszystko”.
  // Istniejące dane dodasz w aplikacji przyciskiem „+ Kategoria”.
  ELM.DEFAULT_CATEGORIES = [
    { id: "cat_grammar", name: "Gramatyka i czasy" }
  ];

  // Profile, z którymi startuje aplikacja. Każdy ma osobny postęp „Umiem”.
  // Kolejne profile dodaje się w aplikacji (Tryb edycji → menu profili).
  ELM.DEFAULT_PROFILES = [
    { id: "p_adam", name: "Adam" },
    { id: "p_klasa1", name: "Klasa 1" },
    { id: "p_klasa4", name: "Klasa 4" },
    { id: "p_klasa6", name: "Klasa 6" }
  ];

  /** Zwraca NOWĄ listę domyślnych profili z pustym postępem. */
  ELM.createDefaultProfiles = function () {
    return {
      version: 1,
      activeId: ELM.DEFAULT_PROFILES[0].id,
      profiles: ELM.DEFAULT_PROFILES.map(function (p) {
        return { id: p.id, name: p.name, progress: {} };
      })
    };
  };

  /**
   * Dane startowe: bazowa lista z js/base-content.js (jeśli jest dołączona),
   * w przeciwnym razie pusty szkielet. Zawsze zwraca NOWĄ kopię.
   */
  ELM.createDefaultData = function () {
    if (ELM.BASE_CONTENT) return JSON.parse(JSON.stringify(ELM.BASE_CONTENT));
    return ELM.createEmptyData();
  };

  /** Zwraca NOWĄ kopię pustego szkieletu danych. */
  ELM.createEmptyData = function () {
    const data = {
      version: 1,
      categories: ELM.DEFAULT_CATEGORIES.map(function (c) {
        return { id: c.id, name: c.name };
      }),
      levels: []
    };

    ELM.LEVEL_IDS.forEach(function (levelId) {
      const level = { id: levelId, description: "", content: {} };
      // Dla każdej kategorii pusta lista essentials i tematów
      data.categories.forEach(function (cat) {
        level.content[cat.id] = { essentials: [], topics: [] };
      });
      data.levels.push(level);
    });

    return data;
  };
})(window.ELM);
