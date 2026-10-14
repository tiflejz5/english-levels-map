/*
 * default-data.js — PUSTY szkielet danych startowych.
 *
 * Używany, gdy w przeglądarce nie ma jeszcze zapisanych treści
 * (pierwsze uruchomienie) oraz po „Zresetuj wszystko”.
 *
 * Celowo NIE zawiera żadnych treści merytorycznych. Całą zawartość
 * dodaje nauczyciel w trybie edycji.
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

  /** Zwraca NOWĄ kopię pustego szkieletu danych. */
  ELM.createDefaultData = function () {
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
