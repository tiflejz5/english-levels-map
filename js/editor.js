/*
 * editor.js — operacje trybu edycji: dodawanie, zmiana nazwy,
 * przesuwanie i usuwanie kategorii, punktów essentials, tematów
 * oraz elementów list (przykłady, błędy, ćwiczenia).
 *
 * Edycja samego tekstu odbywa się bezpośrednio w polach (render.js),
 * tutaj są tylko zmiany struktury. Po każdej zmianie wywołujemy
 * ELM.app.commit(), które od razu zapisuje dane i odświeża widok.
 * Usuwanie zawsze wymaga potwierdzenia.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;

  function app() { return ELM.app; }
  function content() { return ELM.state.content; }

  /** Zamienia miejscami element z sąsiadem (dir = -1 w górę/lewo, +1 w dół/prawo). */
  function swap(list, index, dir) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return false;
    const tmp = list[index];
    list[index] = list[target];
    list[target] = tmp;
    return true;
  }

  /** Bieżący zestaw treści (poziom + kategoria). */
  function currentBucket() {
    const cat = app().getActiveCategory();
    return cat ? app().getBucket(ELM.state.ui.levelId, cat.id) : null;
  }

  /** Usuwa zaznaczenia „Umiem” dla podanych id punktów. */
  function forgetProgress(ids) {
    let changed = false;
    ids.forEach(function (id) {
      if (ELM.state.progress[id]) { delete ELM.state.progress[id]; changed = true; }
    });
    if (changed) app().saveProgressNow();
  }

  // =====================================================================
  // KATEGORIE (wspólne dla wszystkich poziomów)
  // =====================================================================

  function addCategory() {
    ELM.dialogs.prompt({
      title: "Nowa kategoria",
      label: "Nazwa kategorii",
      placeholder: "np. Słownictwo",
      confirmLabel: "Dodaj"
    }).then(function (name) {
      if (name === null) return;
      const cat = { id: U.uid("cat"), name: name };
      content().categories.push(cat);
      // Każdy poziom dostaje pusty zestaw treści dla nowej kategorii
      content().levels.forEach(function (level) {
        level.content[cat.id] = { essentials: [], topics: [] };
      });
      ELM.state.ui.categoryId = cat.id;
      app().saveUI();
      app().commit();
    });
  }

  function renameCategory(catId) {
    const cat = content().categories.find(function (c) { return c.id === catId; });
    if (!cat) return;
    ELM.dialogs.prompt({
      title: "Zmień nazwę kategorii",
      label: "Nazwa kategorii",
      value: cat.name
    }).then(function (name) {
      if (name === null) return;
      cat.name = name;
      app().commit();
    });
  }

  function moveCategory(catId, dir) {
    const list = content().categories;
    const index = list.findIndex(function (c) { return c.id === catId; });
    if (index !== -1 && swap(list, index, dir)) app().commit();
  }

  function deleteCategory(catId) {
    const list = content().categories;
    const index = list.findIndex(function (c) { return c.id === catId; });
    if (index === -1) return;
    const cat = list[index];
    ELM.dialogs.confirm({
      title: "Usunąć kategorię?",
      message: "Kategoria „" + (cat.name || "Bez nazwy") + "” zostanie usunięta razem z całą jej treścią (essentials i tematy) na WSZYSTKICH poziomach A1–C2. Tej operacji nie można cofnąć.",
      confirmLabel: "Usuń kategorię"
    }).then(function (ok) {
      if (!ok) return;
      const essentialIds = [];
      content().levels.forEach(function (level) {
        const bucket = level.content[catId];
        if (bucket) bucket.essentials.forEach(function (e) { essentialIds.push(e.id); });
        delete level.content[catId];
      });
      list.splice(index, 1);
      forgetProgress(essentialIds);
      // Wybierz sąsiednią kategorię (albo żadną, gdy lista pusta)
      const next = list[Math.min(index, list.length - 1)];
      ELM.state.ui.categoryId = next ? next.id : null;
      app().saveUI();
      app().commit();
    });
  }

  // =====================================================================
  // ESSENTIALS
  // =====================================================================

  function addEssential() {
    const bucket = currentBucket();
    if (!bucket) return;
    const item = { id: U.uid("e"), text: "" };
    bucket.essentials.push(item);
    app().commit({ focusId: item.id });
  }

  function deleteEssential(index) {
    const bucket = currentBucket();
    if (!bucket || !bucket.essentials[index]) return;
    const item = bucket.essentials[index];
    ELM.dialogs.confirm({
      title: "Usunąć punkt?",
      message: U.isBlank(item.text)
        ? "Ten pusty punkt zostanie usunięty."
        : "Punkt „" + shorten(item.text) + "” zostanie usunięty razem z zaznaczeniem „Umiem”.",
      confirmLabel: "Usuń punkt"
    }).then(function (ok) {
      if (!ok) return;
      bucket.essentials.splice(bucket.essentials.indexOf(item), 1);
      forgetProgress([item.id]);
      app().commit();
    });
  }

  // =====================================================================
  // TEMATY
  // =====================================================================

  function addTopic() {
    const bucket = currentBucket();
    if (!bucket) return;
    const topic = {
      id: U.uid("t"),
      title: "",
      rule: "",
      formula: "",
      examples: [],
      mistakes: [],
      exercises: []
    };
    bucket.topics.push(topic);
    app().selectTopic(topic.id, { silent: true });
    app().commit({ focusId: topic.id }); // kursor od razu w polu „Nazwa”
  }

  function moveTopic(topicId, dir) {
    const bucket = currentBucket();
    if (!bucket) return;
    const index = bucket.topics.findIndex(function (t) { return t.id === topicId; });
    if (index !== -1 && swap(bucket.topics, index, dir)) app().commit();
  }

  function deleteTopic(topicId) {
    const bucket = currentBucket();
    if (!bucket) return;
    const index = bucket.topics.findIndex(function (t) { return t.id === topicId; });
    if (index === -1) return;
    const topic = bucket.topics[index];
    ELM.dialogs.confirm({
      title: "Usunąć temat?",
      message: "Temat „" + (U.isBlank(topic.title) ? "bez nazwy" : shorten(topic.title)) + "” zostanie usunięty razem ze wszystkimi sekcjami (zasada, wzór, przykłady, błędy, ćwiczenia).",
      confirmLabel: "Usuń temat"
    }).then(function (ok) {
      if (!ok) return;
      bucket.topics.splice(index, 1);
      const next = bucket.topics[Math.min(index, bucket.topics.length - 1)];
      if (next) app().selectTopic(next.id, { silent: true });
      app().commit();
    });
  }

  // =====================================================================
  // ELEMENTY LIST (przykłady, typowe błędy, ćwiczenia, essentials)
  // =====================================================================

  function addItem(list, item) {
    list.push(item);
    app().commit({ focusId: item.id });
  }

  function moveItem(list, index, dir) {
    if (swap(list, index, dir)) app().commit({ focusId: list[index + dir].id });
  }

  function deleteItem(list, index, what) {
    if (!list[index]) return;
    const item = list[index];
    ELM.dialogs.confirm({
      title: "Usunąć element?",
      message: "Czy na pewno usunąć " + (what || "ten element") + "?",
      confirmLabel: "Usuń"
    }).then(function (ok) {
      if (!ok) return;
      const i = list.indexOf(item);
      if (i !== -1) list.splice(i, 1);
      app().commit();
    });
  }

  /** Skraca długi tekst do komunikatu potwierdzenia. */
  function shorten(text) {
    const t = String(text).trim().replace(/\s+/g, " ");
    return t.length > 60 ? t.slice(0, 57) + "…" : t;
  }

  ELM.editor = {
    addCategory: addCategory,
    renameCategory: renameCategory,
    moveCategory: moveCategory,
    deleteCategory: deleteCategory,
    addEssential: addEssential,
    deleteEssential: deleteEssential,
    addTopic: addTopic,
    moveTopic: moveTopic,
    deleteTopic: deleteTopic,
    addItem: addItem,
    moveItem: moveItem,
    deleteItem: deleteItem
  };
})(window.ELM);
