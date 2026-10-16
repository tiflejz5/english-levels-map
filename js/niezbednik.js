/*
 * niezbednik.js — podstrony „Niezbędnika” (folder niezbednik/).
 *
 * Dane: ELM.NIEZBEDNIK z pliku niezbednik/niezbednik-dane.js
 * (generowanego przez: node tools/zbuduj-niezbednik.js).
 *
 * Adresy podstron: index.html#/a1/czasy-present-simple
 * (ścieżka pliku .md bez rozszerzenia). Routing przez „#”, bo strona
 * działa z dysku (file://) i na GitHub Pages, gdzie nie ma serwera.
 *
 * Dopasowanie punktu listy do podstrony:
 *   1. dokładnie po tekście (pole „label” z index.json = tekst punktu),
 *   2. jeśli brak — po kolejności w obrębie kategorii (pole „order”).
 * Dopasowanie liczone jest na bieżąco, więc działa też po edycji listy.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  // Kategorie z index.json → kategorie aplikacji
  const CATEGORY_MAP = {
    czasy: "cat_grammar",
    gramatyka: "cat_grammar",
    funkcje: "cat_functions",
    slownictwo: "cat_vocabulary"
  };

  // Sekcje (nagłówki ##) ukryte pod przyciskiem „Pokaż odpowiedzi”
  const HIDDEN_SECTIONS = ["Odpowiedzi", "Przykładowe odpowiedzi"];

  let links = { byEssential: {}, byFile: {}, report: [] };
  const metaCache = {};

  function data() { return ELM.NIEZBEDNIK || null; }

  // =====================================================================
  // ADRESY
  // =====================================================================

  function routeOf(item) {
    return "#/" + item.file.replace(/\.md$/i, "");
  }

  /** "#/a1/czasy-present-simple" → { file: "a1/czasy-present-simple.md" } */
  function parseRoute(hash) {
    const m = /^#\/(.+)$/.exec(hash || "");
    if (!m) return null;
    let path;
    try { path = decodeURIComponent(m[1]); } catch (e) { path = m[1]; }
    return { file: path.replace(/\/+$/, "") + ".md" };
  }

  /** Szuka wpisu index.json po ścieżce pliku. */
  function findItem(file) {
    const d = data();
    if (!d) return null;
    for (let i = 0; i < d.index.levels.length; i++) {
      const lvl = d.index.levels[i];
      const item = lvl.items.find(function (it) { return it.file === file; });
      if (item) return { item: item, level: lvl.level };
    }
    return null;
  }

  function hasPage(item) {
    const d = data();
    return !!(d && d.pages[item.file]);
  }

  function metaOf(item) {
    if (!hasPage(item)) return {};
    if (!metaCache[item.file]) metaCache[item.file] = ELM.markdown.parseFrontmatter(data().pages[item.file]).meta;
    return metaCache[item.file];
  }

  // =====================================================================
  // DOPASOWANIE PUNKTÓW LISTY DO PODSTRON
  // =====================================================================

  function norm(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  /** Przelicza dopasowania dla bieżącej treści. Wynik trzymamy w „links”. */
  function computeLinks() {
    const result = { byEssential: {}, byFile: {}, report: [] };
    const d = data();
    const content = ELM.state.content;
    if (!d || !content) { links = result; return result; }

    const catOrder = Object.keys(d.index.categories);

    d.index.levels.forEach(function (lvl) {
      const level = content.levels.find(function (l) { return l.id === lvl.level; });
      if (!level) return;

      const used = new Set();
      const all = [];
      Object.keys(level.content).forEach(function (catId) {
        level.content[catId].essentials.forEach(function (e) {
          if (!U.isBlank(e.text)) all.push(e);
        });
      });

      function link(item, essential, how) {
        used.add(essential.id);
        const info = { item: item, essential: essential, how: how, available: hasPage(item), level: lvl.level };
        result.byEssential[essential.id] = info;
        result.byFile[item.file] = info;
        result.report.push({ level: lvl.level, id: item.id, label: item.label, essential: essential.text, how: how, available: info.available });
      }

      // 1. Dokładne dopasowanie po tekście
      const pending = [];
      lvl.items.forEach(function (item) {
        const hit = all.find(function (e) { return !used.has(e.id) && norm(e.text) === norm(item.label); });
        if (hit) link(item, hit, "exact");
        else pending.push(item);
      });

      // 2. Zapasowo: ta sama pozycja w obrębie kategorii
      pending.forEach(function (item) {
        const catId = CATEGORY_MAP[item.category];
        const bucket = catId && level.content[catId];
        let candidate = null;
        if (bucket) {
          const group = lvl.items
            .filter(function (it) { return CATEGORY_MAP[it.category] === catId; })
            .map(function (it, idx) { return { it: it, idx: idx }; })
            .sort(function (a, b) {
              const ca = catOrder.indexOf(a.it.category), cb = catOrder.indexOf(b.it.category);
              if (ca !== cb) return ca - cb;
              const oa = Number(metaOf(a.it).order) || a.idx + 1, ob = Number(metaOf(b.it).order) || b.idx + 1;
              return oa - ob;
            })
            .map(function (x) { return x.it; });
          const pos = group.indexOf(item);
          const essentials = bucket.essentials.filter(function (e) { return !U.isBlank(e.text); });
          candidate = essentials[pos] && !used.has(essentials[pos].id) ? essentials[pos] : null;
        }
        if (candidate) link(item, candidate, "order");
        else result.report.push({ level: lvl.level, id: item.id, label: item.label, essential: null, how: "none", available: hasPage(item) });
      });
    });

    links = result;
    return result;
  }

  /** Informacja o podstronie dla punktu essentials (albo null). Tylko istniejące podstrony. */
  function linkForEssential(essentialId) {
    const info = links.byEssential[essentialId];
    return info && info.available ? info : null;
  }

  /** Raport dopasowania (np. do sprawdzenia w konsoli: ELM.niezbednik.report()). */
  function report() {
    return computeLinks().report;
  }

  // =====================================================================
  // WIDOK PODSTRONY
  // =====================================================================

  function renderPage(route) {
    const view = document.getElementById("view");
    computeLinks();

    const found = findItem(route.file);
    const levelId = found ? found.level : ELM.state.ui.levelId;
    // Ta sama podstrona przerysowana (np. zmiana profilu) → zostaw przewinięcie
    const keepScroll = view.dataset.file === route.file ? U.getScroll() : 0;
    document.body.classList.toggle("is-editing", ELM.state.editMode);
    view.className = "view page-view lvl-" + levelId;
    view.dataset.file = route.file;
    view.replaceChildren();

    const back = el("button", {
      type: "button",
      class: "btn btn-ghost back-btn",
      onclick: function () { goBack(found); }
    }, "← Wróć do listy " + levelId);

    if (!found || !hasPage(found.item)) {
      U.setScroll(0);
      view.appendChild(el("div", { class: "page-head" }, back));
      view.appendChild(el("div", { class: "empty-state" }, [
        el("p", { class: "empty-state-text", text: found ? "Brak pliku z treścią tej podstrony." : "Nie znaleziono takiej podstrony." }),
        found ? el("p", { class: "empty-state-hint", text: found.item.label }) : null
      ]));
      document.title = "English Levels Map (A1–C2)";
      return;
    }

    const doc = ELM.markdown.parse(data().pages[found.item.file]);
    const info = links.byFile[found.item.file];
    // Nazwa kategorii: najpierw własna nazwa poziomu (categoryLabels), potem ogólna
    const levelEntry = data().index.levels.find(function (l) { return l.level === found.level; }) || {};
    const categoryName = (levelEntry.categoryLabels || {})[found.item.category] ||
      data().index.categories[found.item.category] || "";

    view.appendChild(el("div", { class: "page-head" }, [
      back,
      el("span", { class: "page-crumb" }, [
        el("span", { class: "level-dot", "aria-hidden": "true" }),
        found.level + (categoryName ? " · " + categoryName : "")
      ]),
      info ? umiemToggle(info.essential) : null
    ]));

    if (ELM.state.editMode) {
      view.appendChild(el("p", {
        class: "banner is-info page-edit-hint",
        text: "Treść podstron pochodzi z plików .md w folderze niezbednik/ i nie jest edytowana w aplikacji."
      }));
    }

    const article = el("article", { class: "md" }, ELM.markdown.render(doc.blocks, { hiddenSections: HIDDEN_SECTIONS }));
    // Ramka „Na egzaminie C1” (z certyfikat-c1/powiazania.json) zaraz pod wstępem
    if (ELM.c1) ELM.c1.insertAfterIntro(article, ELM.c1.examBoxFor(found.item.id));
    view.appendChild(article);
    view.appendChild(el("div", { class: "page-foot" }, el("button", {
      type: "button",
      class: "btn btn-secondary",
      onclick: function () { goBack(found); }
    }, "← Wróć do listy " + found.level)));

    document.title = (doc.meta.title || found.item.label) + " · English Levels Map";
    U.setScroll(keepScroll);
  }

  // =====================================================================
  // PODSUMOWANIE POZIOMU (niezbednik/podsumowania/<poziom>.md)
  // =====================================================================

  /** Karta z podsumowaniem poziomu albo null, gdy nie ma pliku. */
  function renderSummary(levelId) {
    const d = data();
    const text = d && d.summaries && d.summaries[levelId];
    if (!text) return null;
    const doc = ELM.markdown.parse(text);
    const section = el("section", { class: "card level-summary md", "aria-labelledby": "summary-title" },
      ELM.markdown.render(doc.blocks));
    // Nagłówek z pliku („## Podsumowanie poziomu A1”) jest tytułem sekcji
    const h2 = section.querySelector("h2");
    if (h2) { h2.id = "summary-title"; h2.classList.add("section-title"); }
    markSubheads(section);
    return section;
  }

  /** Akapity złożone z samego pogrubienia (np. „**Kluczowe myśli**”) → śródtytuły. */
  function markSubheads(root) {
    root.querySelectorAll("p").forEach(function (p) {
      if (p.childNodes.length === 1 && p.firstChild.nodeName === "STRONG") p.classList.add("md-subhead");
    });
  }

  // =====================================================================
  // STRONA GŁÓWNA (niezbednik/strona-glowna.md), adres #/
  // =====================================================================

  function renderHome() {
    const view = document.getElementById("view");
    const keepScroll = view.dataset.file === "#home" ? U.getScroll() : 0;
    document.body.classList.toggle("is-editing", ELM.state.editMode);
    view.className = "view home-view";
    view.dataset.file = "#home";
    view.replaceChildren();
    document.title = "English Levels Map (A1–C2)";

    const d = data();
    if (!d || !d.home) {
      view.appendChild(el("div", { class: "empty-state" },
        el("p", { class: "empty-state-text", text: "Wybierz poziom z listy po lewej." })));
      return;
    }
    const doc = ELM.markdown.parse(d.home);
    const article = el("article", { class: "md home" }, ELM.markdown.render(doc.blocks));
    linkLevelTable(article);
    // Kafelek „Certyfikat C1” pod wstępem strony głównej
    if (ELM.c1) ELM.c1.insertAfterIntro(article, ELM.c1.homeTile());
    view.appendChild(article);
    U.setScroll(keepScroll);
  }

  /** W tabeli „Poziomy w skrócie” kody A1…C2 w 1. kolumnie stają się linkami do poziomów. */
  function linkLevelTable(root) {
    root.querySelectorAll(".md-section").forEach(function (section) {
      const h2 = section.querySelector("h2");
      if (!h2 || h2.textContent.trim().toLowerCase() !== "poziomy w skrócie") return;
      section.querySelectorAll("tbody tr").forEach(function (tr) {
        const cell = tr.cells[0];
        const code = cell ? cell.textContent.trim().toUpperCase() : "";
        if (ELM.LEVEL_IDS.indexOf(code) === -1) return;
        cell.replaceChildren(el("a", {
          class: "level-link lvl-" + code,
          href: ELM.app.levelHash(code),
          "aria-label": "Przejdź do poziomu " + code
        }, [el("span", { class: "level-dot", "aria-hidden": "true" }), code]));
      });
    });
  }

  /** Przełącznik „Umiem” — ten sam stan co checkbox na liście (aktywny profil). */
  function umiemToggle(essential) {
    const done = ELM.state.progress[essential.id] === true;
    return el("label", { class: "umiem umiem-lg" + (done ? " is-done" : "") }, [
      el("input", {
        type: "checkbox",
        checked: done,
        "aria-label": "Umiem: " + essential.text,
        onchange: function (e) { ELM.app.setProgress(essential.id, e.target.checked); }
      }),
      el("span", { text: "Umiem" })
    ]);
  }

  function goBack(found) {
    const target = { levelId: found ? found.level : ELM.state.ui.levelId, categoryId: null };
    if (found) {
      const info = links.byFile[found.item.file];
      // Wracamy do kategorii, w której jest punkt
      if (info) {
        const level = ELM.state.content.levels.find(function (l) { return l.id === found.level; });
        Object.keys(level.content).forEach(function (catId) {
          if (level.content[catId].essentials.indexOf(info.essential) !== -1) target.categoryId = catId;
        });
      } else {
        target.categoryId = CATEGORY_MAP[found.item.category] || null;
      }
    }
    ELM.app.goToList(target);
  }

  ELM.niezbednik = {
    routeOf: routeOf,
    parseRoute: parseRoute,
    findItem: findItem,
    computeLinks: computeLinks,
    linkForEssential: linkForEssential,
    renderPage: renderPage,
    renderSummary: renderSummary,
    renderHome: renderHome,
    report: report
  };
})(window.ELM);
