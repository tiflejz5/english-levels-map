/*
 * fiszki-browse.js — przeglądanie i edycja fiszek (spec 10, sekcja 5.3), część zakładki js/fiszki.js.
 *
 *   ELM.fiszkiBrowse.render(view, route)   route: { kind: "deck"|"edit"|"import", deck, card }
 *   ELM.fiszkiBrowse.prefill(fields)       wypełnienie formularza nowej karty (np. z zaznaczenia tekstu)
 *   ELM.fiszkiBrowse.addCard(deckId, card) dodanie karty z innego miejsca aplikacji → zapisana karta
 *
 * Lista kart talii z wyszukiwaniem i filtrami statusu, zawieszanie (także kart wbudowanych),
 * formularz własnej karty z podglądem na żywo i walidacją (cloze: jedna luka, 500 znaków na pole),
 * import TSV/CSV z podglądem (poprawne / odrzucone z powodem) i eksport talii do TSV (Anki).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const HASH = "#/fiszki";

  function F() { return ELM.fiszki.internal; }
  function L() { return ELM.fiszkiLogic; }
  function st() { return F().st(); }
  function now() { return Date.now(); }

  const filter = { deck: null, query: "", status: "all", exam: "all" };
  let pending = null;       // wypełnienie formularza (prefill)
  let importTarget = null;  // talia wybrana przed wejściem w import

  function crumb(label, extra) {
    return el("p", { class: "c1-back" }, [el("a", { href: HASH }, ELM.ui.withIcon("chevron-left", "Fiszki")), extra ? el("span", { class: "tool-note", text: " · " + extra }) : null]);
  }

  function statusOf(x) {
    if (x && x.suspended) return { id: "suspended", label: "Zawieszona", icon: "pause" };
    if (!x || x.state === "new") return { id: "new", label: "Nowa", icon: "sparkles" };
    if (x.state === "review" && x.interval >= 21) return { id: "mastered", label: "Opanowana", icon: "check" };
    return { id: "learning", label: "W nauce", icon: "rotate-ccw" };
  }

  function backText(c) {
    if (c.type === "cloze") { const p = L().parseCloze(c.text); return p.ok ? p.answers.join(" | ") : ""; }
    return c.type === "typed" && c.accepted ? c.accepted.join(" | ") : c.back;
  }

  function newId() { return "u-" + U.uid("k").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50); }
  function newDeckId() { return "u-" + U.uid("t").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50); }

  // =====================================================================
  // LISTA KART TALII
  // =====================================================================

  function renderDeck(view, deckId) {
    const d = F().deckById(deckId);
    if (!d) { view.appendChild(crumb()); view.appendChild(el("p", { class: "empty-state-text", text: "Nie ma takiej talii." })); return; }
    if (filter.deck !== deckId) { filter.deck = deckId; filter.query = ""; filter.status = "all"; filter.exam = "all"; }
    const cards = F().cardsOf(deckId);
    view.appendChild(crumb(null, d.builtIn ? "talia wbudowana (tylko do odczytu, karty można zawiesić)" : "Twoja talia"));
    view.appendChild(F().head(d.title, d.description));
    view.appendChild(F().bar(L().deckStats(cards, st().cards, now())));

    const s = st().settings;
    const on = s.enabledDecks.indexOf(deckId) !== -1;
    const random = s.randomDecks.indexOf(deckId) !== -1;
    const opts = el("div", { class: "fc-check" }, [
      el("input", { type: "checkbox", id: "fc-random", checked: random, onchange: function (e) {
        const list = st().settings.randomDecks, i = list.indexOf(deckId);
        if (e.target.checked && i === -1) list.push(deckId); else if (!e.target.checked && i !== -1) list.splice(i, 1);
        F().saveState();
      } }),
      el("label", { for: "fc-random", text: "Nowe karty w losowej kolejności (domyślnie jak w talii)" })
    ]);
    const actions = [
      el("button", { type: "button", class: "btn btn-secondary", "aria-pressed": on ? "true" : "false", onclick: function () { F().toggleDeck(deckId, !on); ELM.fiszki.render(); } },
        on ? "Wyłącz z nauki" : "Włącz do nauki"),
      el("button", { type: "button", class: "btn btn-secondary", onclick: function () { F().exportDeck(d); } }, ELM.ui.withIcon("download", "Eksportuj TSV"))
    ];
    if (!d.builtIn) {
      actions.unshift(el("a", { class: "btn btn-primary", href: HASH + "/talia/" + deckId + "/nowa" }, ELM.ui.withIcon("plus", "Dodaj kartę")));
      actions.push(el("button", { type: "button", class: "btn btn-secondary", onclick: function () { importTarget = deckId; location.hash = HASH + "/import"; } }, ELM.ui.withIcon("upload", "Importuj")));
      actions.push(el("button", { type: "button", class: "btn btn-secondary", onclick: function () { renameDeck(d); } }, ELM.ui.withIcon("pencil", "Zmień nazwę")));
      actions.push(el("button", { type: "button", class: "btn btn-danger", onclick: function () { deleteDeck(d); } }, ELM.ui.withIcon("trash", "Usuń talię")));
    }
    view.appendChild(el("div", { class: "fc-actions" }, actions));
    view.appendChild(opts);

    const search = el("input", { id: "fc-search", class: "field", type: "search", value: filter.query, placeholder: "Szukaj w talii…", autocomplete: "off", oninput: function () { filter.query = search.value; paint(); } });
    const statuses = [["all", "Wszystkie"], ["new", "Nowe"], ["learning", "W nauce"], ["mastered", "Opanowane"], ["suspended", "Zawieszone"]];
    const sel = el("select", { id: "fc-status", class: "field", onchange: function () { filter.status = sel.value; paint(); } },
      statuses.map(function (x) { return el("option", { value: x[0], selected: filter.status === x[0], text: x[1] }); }));
    // filtr „Egzamin” — tylko gdy talia ma karty z tagami egzaminów (też starsze karty z tagami e8 / matura)
    const present = L().EXAMS.filter(function (e) { return cards.some(function (c) { return L().examsOf(c).some(function (x) { return x.code === e.code; }); }); });
    const examSel = present.length ? el("select", { id: "fc-exam", class: "field", onchange: function () { filter.exam = examSel.value; paint(); } },
      [el("option", { value: "all", selected: filter.exam === "all", text: "Wszystkie" })].concat(present.map(function (e) { return el("option", { value: e.code, selected: filter.exam === e.code, text: e.short + " – " + e.name }); }))) : null;
    view.appendChild(el("div", { class: "journal-filters fc-filters", role: "search" }, [
      el("div", { class: "form-field is-grow" }, [el("label", { class: "field-label", for: "fc-search", text: "Szukaj" }), search]),
      el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "fc-status", text: "Status" }), sel]),
      examSel ? el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "fc-exam", text: "Egzamin" }), examSel]) : null
    ]));
    const count = el("p", { class: "journal-count", "aria-live": "polite" });
    const list = el("ul", { class: "fc-card-list" });
    view.appendChild(count);
    view.appendChild(list);

    function paint() {
      const fold = ELM.searchLogic ? ELM.searchLogic.fold : function (x) { return String(x).toLowerCase(); };
      const q = fold(filter.query.trim());
      const shown = cards.filter(function (c) {
        if (filter.status !== "all" && statusOf(st().cards[c.id]).id !== filter.status) return false;
        if (filter.exam !== "all" && !L().examsOf(c).some(function (e) { return e.code === filter.exam; })) return false;
        return !q || fold(L().frontText(c) + " " + backText(c) + " " + (c.hint || "") + " " + (c.note || "")).indexOf(q) !== -1;
      });
      count.textContent = "Karty: " + shown.length + " z " + cards.length;
      list.replaceChildren();
      if (!shown.length) { list.appendChild(ELM.ui.emptyState({ tag: "li", art: "brak-wynikow", title: cards.length ? "Brak kart pasujących do filtrów." : "Ta talia nie ma jeszcze kart." })); return; }
      shown.forEach(function (c) {
        const x = st().cards[c.id];
        const sts = statusOf(x);
        const own = !d.builtIn;
        list.appendChild(el("li", { class: "card fc-row" }, [
          el("div", { class: "fc-row-main" }, [
            el("p", { class: "fc-row-front", text: L().frontText(c) }),
            el("p", { class: "fc-row-back", text: backText(c) }),
            F().examChips(c)
          ]),
          el("div", { class: "fc-row-meta" }, [
            el("span", { class: "fc-status is-" + sts.id }, [ELM.icon(sts.icon, { size: 14 }), " " + sts.label]),
            el("span", { class: "tool-note", text: x && x.state !== "new" ? "Termin: " + F().fmtWhen(Math.max(x.due, x.buriedUntil || 0)) : "Termin: —" })
          ]),
          el("div", { class: "fc-row-actions" }, [
            el("button", { type: "button", class: "btn btn-link btn-small", "aria-label": (x && x.suspended ? "Przywróć kartę: " : "Zawieś kartę: ") + L().frontText(c),
              onclick: function () { toggleSuspend(c.id); paint(); } }, x && x.suspended ? "Przywróć" : "Zawieś"),
            own ? el("a", { class: "btn btn-link btn-small", href: HASH + "/talia/" + deckId + "/karta/" + c.id, "aria-label": "Edytuj kartę: " + L().frontText(c) }, "Edytuj") : null,
            own ? el("button", { type: "button", class: "btn btn-danger btn-small", "aria-label": "Usuń kartę: " + L().frontText(c), onclick: function () { deleteCard(c, paint); } }, "Usuń") : null
          ])
        ]));
      });
    }
    paint();
  }

  function toggleSuspend(id) {
    const cur = st().cards[id];
    if (cur && cur.suspended) {
      delete cur.suspended;
      if (cur.state === "new" && !cur.reps) delete st().cards[id]; // nowa karta bez historii — znów „nieruszona”
    } else {
      st().cards[id] = Object.assign(ELM.fiszkiHarmonogram.newCard(), cur || {}, { suspended: true });
    }
    F().saveState();
  }

  function deleteCard(c, after) {
    ELM.dialogs.confirm({ title: "Usunąć kartę?", message: "„" + L().frontText(c) + "” zostanie usunięta razem z historią powtórek.", confirmLabel: "Usuń kartę" }).then(function (ok) {
      if (!ok) return;
      const list = st().userCards, i = list.findIndex(function (x) { return x.id === c.id; });
      if (i !== -1) list.splice(i, 1);
      delete st().cards[c.id];
      F().saveState();
      if (after) after(); else ELM.fiszki.render();
    });
  }

  function renameDeck(d) {
    ELM.dialogs.prompt({ title: "Zmień nazwę talii", label: "Nazwa talii", value: d.title, confirmLabel: "Zapisz" }).then(function (name) {
      if (!name) return;
      const x = st().userDecks.find(function (u) { return u.id === d.id; });
      if (x) { x.title = name.trim().slice(0, 80); F().saveState(); ELM.fiszki.render(); }
    });
  }

  function deleteDeck(d) {
    const n = F().cardsOf(d.id).length;
    ELM.dialogs.confirm({ title: "Usunąć talię?", message: "Talia „" + d.title + "” i jej karty (" + n + ") zostaną usunięte razem z historią powtórek. Tej operacji nie można cofnąć.", confirmLabel: "Usuń talię" }).then(function (ok) {
      if (!ok) return;
      const s = st();
      s.userCards = s.userCards.filter(function (c) { if (c.deck === d.id) { delete s.cards[c.id]; return false; } return true; });
      s.userDecks = s.userDecks.filter(function (x) { return x.id !== d.id; });
      ["enabledDecks", "randomDecks"].forEach(function (k) { s.settings[k] = s.settings[k].filter(function (id) { return id !== d.id; }); });
      F().saveState();
      location.hash = HASH;
    });
  }

  // =====================================================================
  // FORMULARZ KARTY (nowa / edycja)
  // =====================================================================

  function userDecks() { return st().userDecks; }

  function ensureDeck(id, title, system) {
    let d = st().userDecks.find(function (x) { return x.id === id; });
    if (!d) {
      d = { id: id, title: title, createdAt: new Date().toISOString() };
      if (system) d.system = system;
      st().userDecks.push(d);
      if (st().settings.enabledDecks.indexOf(id) === -1) st().settings.enabledDecks.push(id);
    }
    return d;
  }

  /** Dodaje gotową kartę (z makeCard) do talii; zwraca zapisaną kartę. */
  function addCard(deckId, card, extra) {
    const c = Object.assign({ id: newId(), deck: deckId, createdAt: new Date().toISOString() }, card, extra || {});
    st().userCards.push(c);
    F().saveState();
    return c;
  }

  function renderEdit(view, route) {
    const existing = route.card ? st().userCards.find(function (c) { return c.id === route.card; }) : null;
    if (route.card && !existing) { view.appendChild(crumb()); view.appendChild(el("p", { class: "empty-state-text", text: "Nie ma takiej karty (karty wbudowanych talii są tylko do odczytu)." })); return; }
    const decks = userDecks();
    const fill = existing ? {
      deck: existing.deck, type: existing.type, front: existing.type === "cloze" ? existing.text : existing.front,
      back: existing.type === "typed" && existing.accepted ? existing.accepted.join("|") : existing.back || "", hint: existing.hint || "", example: existing.example || "", note: existing.note || "", tags: (existing.tags || []).join(" ")
    } : Object.assign({ deck: route.deck, type: "basic", front: "", back: "", hint: "", example: "", note: "", tags: "" }, pending || {});
    pending = null;
    view.appendChild(crumb(null, existing ? "edycja karty" : "nowa karta"));
    view.appendChild(F().head(existing ? "Edytuj kartę" : "Nowa karta", "Karta z luką: zaznacz odpowiedź w {{podwójnych nawiasach}}, alternatywy oddziel kreską: {{gave up|quit}}."));
    if (!decks.length && !fill.newDeck) {
      fill.newDeck = true;
    }

    const form = el("form", { class: "card fc-form", novalidate: true });
    const err = el("p", { class: "dialog-error", role: "alert", "aria-live": "assertive" });
    const field = function (id, label, value, opts) {
      opts = opts || {};
      const input = el(opts.area ? "textarea" : "input", Object.assign({ id: id, class: "field", maxlength: "500", value: value || "", rows: opts.area ? "2" : null, type: opts.area ? null : "text", autocomplete: "off" }, opts.attrs || {}));
      if (opts.area) input.value = value || "";
      const wrap = el("div", { class: "form-field" }, [el("label", { class: "field-label", for: id, text: label }), input, opts.help ? el("p", { class: "tool-note", id: id + "-help", text: opts.help }) : null]);
      if (opts.help) input.setAttribute("aria-describedby", id + "-help");
      return { wrap: wrap, input: input };
    };
    const deckSel = el("select", { id: "fc-f-deck", class: "field" }, decks.map(function (d) { return el("option", { value: d.id, selected: d.id === fill.deck, text: d.title }); })
      .concat([el("option", { value: "__new", selected: !decks.some(function (d) { return d.id === fill.deck; }), text: "+ Nowa talia…" })]));
    const typeSel = el("select", { id: "fc-f-type", class: "field" }, [["basic", "Zwykła (przód i tył)"], ["cloze", "Z luką (zdanie z {{…}})"], ["typed", "Do wpisania (przód i odpowiedzi)"]]
      .map(function (t) { return el("option", { value: t[0], selected: fill.type === t[0], text: t[1] }); }));
    const front = field("fc-f-front", "Przód", fill.front, { area: true });
    const back = field("fc-f-back", "Tył", fill.back, { area: true });
    const hint = field("fc-f-hint", "Podpowiedź (opcjonalnie)", fill.hint);
    const example = field("fc-f-example", "Przykład (opcjonalnie)", fill.example);
    const note = field("fc-f-note", "Notatka (opcjonalnie)", fill.note);
    const tags = field("fc-f-tags", "Tagi (oddziel spacją)", fill.tags);
    const preview = el("div", { class: "fc-preview", "aria-live": "polite" });

    function labels() {
      const t = typeSel.value;
      front.wrap.querySelector("label").textContent = t === "cloze" ? "Zdanie z luką {{…}}" : t === "typed" ? "Przód (np. słowo po polsku)" : "Przód";
      back.wrap.querySelector("label").textContent = t === "typed" ? "Akceptowane odpowiedzi (oddziel kreską |)" : "Tył";
      back.wrap.hidden = t === "cloze";
    }
    function fields() {
      return { type: typeSel.value, front: front.input.value, back: typeSel.value === "cloze" ? "" : back.input.value, hint: hint.input.value, example: example.input.value, note: note.input.value, tags: tags.input.value };
    }
    function update() {
      labels();
      const res = L().makeCard(fields());
      preview.replaceChildren();
      if (res.error) { preview.appendChild(el("p", { class: "tool-note", text: "Podgląd pojawi się, gdy karta będzie poprawna: " + res.error })); return res; }
      preview.appendChild(el("p", { class: "review-label", text: "Podgląd – przód" }));
      F().renderFront(res.card).forEach(function (n) { preview.appendChild(n); });
      preview.appendChild(el("p", { class: "review-label", text: "Podgląd – tył" }));
      F().renderBack(res.card).forEach(function (n) { preview.appendChild(n); });
      err.textContent = "";
      return res;
    }
    [typeSel, front.input, back.input, hint.input, example.input, note.input, tags.input].forEach(function (x) { x.addEventListener("input", update); x.addEventListener("change", update); });

    U.appendChildren(form, [
      el("div", { class: "fc-form-grid" }, [
        el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "fc-f-deck", text: "Talia" }), deckSel]),
        el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "fc-f-type", text: "Typ karty" }), typeSel])
      ]),
      front.wrap, back.wrap, hint.wrap, example.wrap, note.wrap, tags.wrap,
      el("section", { class: "fc-preview-box", "aria-label": "Podgląd karty" }, preview),
      err,
      el("div", { class: "fc-actions" }, [
        el("button", { type: "submit", class: "btn btn-primary" }, existing ? "Zapisz zmiany" : "Dodaj kartę"),
        el("a", { class: "btn btn-secondary", href: existing || route.deck ? HASH + "/talia/" + (existing ? existing.deck : route.deck) : HASH }, "Anuluj"),
        existing ? el("button", { type: "button", class: "btn btn-danger", onclick: function () { deleteCard(existing, function () { location.hash = HASH + "/talia/" + existing.deck; }); } }, "Usuń kartę") : null
      ])
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const res = update();
      if (res.error) { err.textContent = res.error; front.input.focus(); return; }
      const finish = function (deckId) {
        if (existing) {
          const keep = { id: existing.id, deck: deckId, createdAt: existing.createdAt, sourceItemId: existing.sourceItemId };
          const i = st().userCards.indexOf(existing);
          st().userCards[i] = Object.assign(keep, res.card);
          if (!keep.sourceItemId) delete st().userCards[i].sourceItemId;
          F().saveState();
          ELM.ui.toast({ text: "Zapisano kartę.", icon: "check" });
          location.hash = HASH + "/talia/" + deckId;
        } else {
          const c = addCard(deckId, res.card);
          ELM.ui.toast({ text: "Dodano kartę do fiszek.", icon: "check", action: { label: "Cofnij", onClick: function () { removeCard(c.id); } } });
          front.input.value = ""; back.input.value = ""; hint.input.value = ""; example.input.value = ""; note.input.value = "";
          update(); front.input.focus();
        }
      };
      if (deckSel.value === "__new") {
        ELM.dialogs.prompt({ title: "Nowa talia", label: "Nazwa talii", confirmLabel: "Utwórz" }).then(function (name) {
          if (!name) return;
          const d = ensureDeck(newDeckId(), name.trim().slice(0, 80));
          F().saveState();
          deckSel.insertBefore(el("option", { value: d.id, selected: true, text: d.title }), deckSel.lastChild);
          deckSel.value = d.id;
          finish(d.id);
        });
      } else finish(deckSel.value);
    });
    view.appendChild(form);
    update();
    setTimeout(function () { front.input.focus(); }, 0);
  }

  function removeCard(id) {
    const s = st(), i = s.userCards.findIndex(function (c) { return c.id === id; });
    if (i !== -1) s.userCards.splice(i, 1);
    delete s.cards[id];
    F().saveState();
    if (ELM.state && ELM.state.view === "fiszki") ELM.fiszki.render();
  }

  // =====================================================================
  // IMPORT TSV / CSV
  // =====================================================================

  function renderImport(view) {
    view.appendChild(crumb(null, "import"));
    view.appendChild(F().head("Import fiszek", "Plik TSV albo CSV (UTF-8, separator: tabulator albo średnik). Kolumny: typ; przód; tył; podpowiedź; przykład; notatka; tagi. Pliki z Anki (przód, tył, tagi, luki {{c1::…}}) też działają."));
    const decks = userDecks();
    const target = el("select", { id: "fc-i-deck", class: "field" }, decks.map(function (d) { return el("option", { value: d.id, selected: d.id === importTarget, text: d.title }); })
      .concat([el("option", { value: "__new", selected: !decks.length || !importTarget, text: "+ Nowa talia" })]));
    const area = el("textarea", { id: "fc-i-text", class: "field", rows: "8", placeholder: "typ\tprzód\ttył\nbasic\tZgadzam się.\tI agree.\ncloze\tShe {{came up with}} a plan.", spellcheck: "false" });
    const file = el("input", { id: "fc-i-file", type: "file", accept: ".tsv,.csv,.txt,text/tab-separated-values,text/csv,text/plain" });
    const out = el("section", { class: "fc-import-preview", "aria-live": "polite" });
    file.addEventListener("change", function () {
      const f = file.files && file.files[0];
      if (!f) return;
      f.text().then(function (t) { area.value = t; show(); }, function () { out.replaceChildren(el("p", { class: "dialog-error", text: "Nie udało się odczytać pliku." })); });
    });
    let result = null;
    function show() {
      result = L().importCards(area.value);
      out.replaceChildren();
      out.appendChild(el("h2", { class: "section-title", text: "Podgląd importu" }));
      out.appendChild(el("p", null, [el("strong", { text: "Poprawne: " + result.cards.length }), " · odrzucone: " + result.rejected.length + " · separator: " + (result.separator === "\t" ? "tabulator" : result.separator)]));
      if (result.cards.length) {
        out.appendChild(el("ul", { class: "fc-import-sample" }, result.cards.slice(0, 5).map(function (c) {
          return el("li", null, [el("span", { class: "c1-chip", text: c.type }), " " + L().frontText(c) + " → " + backText(c)]);
        })));
        if (result.cards.length > 5) out.appendChild(el("p", { class: "tool-note", text: "…i " + (result.cards.length - 5) + " więcej." }));
      }
      if (result.rejected.length) {
        out.appendChild(el("h3", { class: "c1-check-title", text: "Odrzucone wiersze" }));
        out.appendChild(el("ul", { class: "fc-import-rejected" }, result.rejected.slice(0, 50).map(function (r) { return el("li", { text: "Wiersz " + r.line + ": " + r.reason }); })));
      }
      if (result.cards.length) {
        out.appendChild(el("button", { type: "button", class: "btn btn-primary", onclick: commit }, "Importuj " + result.cards.length + " " + F().plural(result.cards.length, "kartę", "karty", "kart")));
      }
    }
    function commit() {
      const go = function (deckId) {
        const added = result.cards.map(function (c) { return Object.assign({ id: newId(), deck: deckId, createdAt: new Date().toISOString() }, c); });
        st().userCards = st().userCards.concat(added);
        F().saveState();
        ELM.ui.toast({ text: "Zaimportowano " + added.length + " " + F().plural(added.length, "kartę", "karty", "kart") + ".", icon: "check",
          action: { label: "Cofnij", onClick: function () { const ids = {}; added.forEach(function (c) { ids[c.id] = true; }); st().userCards = st().userCards.filter(function (c) { return !ids[c.id]; }); F().saveState(); } } });
        importTarget = null;
        location.hash = HASH + "/talia/" + deckId;
      };
      if (target.value === "__new") {
        ELM.dialogs.prompt({ title: "Nowa talia", label: "Nazwa talii", value: "Import " + new Date().toLocaleDateString("pl-PL"), confirmLabel: "Utwórz" }).then(function (name) {
          if (!name) return;
          const d = ensureDeck(newDeckId(), name.trim().slice(0, 80));
          F().saveState();
          go(d.id);
        });
      } else go(target.value);
    }
    view.appendChild(el("div", { class: "card fc-form" }, [
      el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "fc-i-deck", text: "Do talii" }), target]),
      el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "fc-i-file", text: "Plik" }), file]),
      el("div", { class: "form-field" }, [el("label", { class: "field-label", for: "fc-i-text", text: "…albo wklej tekst" }), area]),
      el("div", { class: "fc-actions" }, [el("button", { type: "button", class: "btn btn-secondary", onclick: show }, "Pokaż podgląd")])
    ]));
    view.appendChild(out);
  }

  function render(view, route) {
    if (route.kind === "deck") renderDeck(view, route.deck);
    else if (route.kind === "edit") renderEdit(view, route);
    else if (route.kind === "import") renderImport(view);
  }

  ELM.fiszkiBrowse = {
    render: render,
    prefill: function (fields) { pending = fields; },
    addCard: addCard, ensureDeck: ensureDeck, removeCard: removeCard, newId: newId
  };
})(window.ELM);
