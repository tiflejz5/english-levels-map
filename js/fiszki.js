/*
 * fiszki.js — zakładka Fiszki (spec 10, sekcja 5): active recall z powtórkami w rosnących odstępach.
 *
 * Trasy:
 *   #/fiszki                         ekran główny: licznik na dziś, „Ucz się teraz”, talie, ustawienia
 *   #/fiszki/sesja                   sesja nauki
 *   #/fiszki/talia/<id>              przeglądanie talii (lista kart, filtry, zawieszanie)
 *   #/fiszki/talia/<id>/nowa         nowa karta (własne talie)
 *   #/fiszki/talia/<id>/karta/<id>   edycja własnej karty
 *   #/fiszki/import                  import TSV/CSV z podglądem
 *
 * Dane: talie wbudowane (dane/fiszki/talie/<id>.js, ładowane na żądanie; indeks
 * ELM.FISZKI_INDEX), stan i własne karty w ELM.fiszkiStore (elm.<profileId>.fiszki).
 * Logika bez DOM: ELM.fiszkiLogic, ELM.fiszkiHarmonogram. Treści użytkownika tylko jako
 * tekst (textContent / węzły tekstowe), bez innerHTML.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const HASH = "#/fiszki";
  const MISTAKES_ID = "u-moje-bledy";
  const WORDS_ID = "u-moje-slowa"; // talia systemowa „Moje słowa” (system: "words", paczka v6 spec 14)
  const GRADE_INFO = [
    { id: "again", label: "Znowu", key: "1" },
    { id: "hard", label: "Trudne", key: "2" },
    { id: "good", label: "Dobrze", key: "3" },
    { id: "easy", label: "Łatwe", key: "4" }
  ];

  function L() { return ELM.fiszkiLogic; }
  function H() { return ELM.fiszkiHarmonogram; }
  function S() { return ELM.fiszkiStore; }
  function st() { return S().data(); }
  function now() { return Date.now(); }
  function app() { return ELM.app; }
  function hasProfile() { return !!(app() && app().getActiveProfile()); }
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (n === 1) return one;
    return b >= 2 && b <= 4 && !(a >= 12 && a <= 14) ? few : many;
  }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }

  // =====================================================================
  // TALIE I KARTY
  // =====================================================================

  function index() { return (ELM.FISZKI_INDEX && ELM.FISZKI_INDEX.decks) || []; }
  function builtInDeck(id) { return index().find(function (d) { return d.id === id; }) || null; }
  function loaded(id) { return ELM.FISZKI_DECKS && ELM.FISZKI_DECKS[id]; }

  /** Wczytuje talie wbudowane (wszystkie z indeksu). Promise. */
  function loadDecks() {
    return Promise.all(index().map(function (d) {
      if (loaded(d.id)) return null;
      return ELM.loadScript(d.file).catch(function () { return null; });
    }));
  }

  /** Wszystkie talie: wbudowane (z indeksu) i własne (w tym „Moje błędy”). */
  function allDecks() {
    const out = index().map(function (d) { return { id: d.id, title: d.title, description: d.description, level: d.level, builtIn: true, count: d.count }; });
    st().userDecks.forEach(function (d) {
      out.push({ id: d.id, title: d.title, description: d.system === "mistakes" ? "Karty dodane z Dziennika błędów." : d.system === "words" ? "Słowa i wyrażenia zaznaczone w tekstach – każde ze zdaniem, z którego pochodzi." : "Twoja talia.", builtIn: false, system: d.system || null,
        count: st().userCards.filter(function (c) { return c.deck === d.id; }).length });
    });
    return out;
  }
  function deckById(id) { return allDecks().find(function (d) { return d.id === id; }) || null; }

  /** Karty talii (z polem deck). Talie wbudowane muszą być wczytane. */
  function cardsOf(deckId) {
    const b = builtInDeck(deckId);
    if (b) {
      const d = loaded(deckId);
      return d ? d.cards.map(function (c) { return Object.assign({ deck: deckId }, c); }) : [];
    }
    return st().userCards.filter(function (c) { return c.deck === deckId; });
  }

  function cardById(id) {
    if (/^u-/.test(id)) return st().userCards.find(function (c) { return c.id === id; }) || null;
    const deckId = id.replace(/-\d{3}$/, "");
    return cardsOf(deckId).find(function (c) { return c.id === id; }) || null;
  }

  /** Talia, do której należy karta (bez wczytywania talii). */
  function deckOfId(id) {
    if (/^u-/.test(id)) { const c = st().userCards.find(function (x) { return x.id === id; }); return c ? c.deck : null; }
    return id.replace(/-\d{3}$/, "");
  }

  function enabled() { return st().settings.enabledDecks; }
  function today() { return L().studyDay(now()); }
  function todayCounts() { return st().daily[today()] || { new: 0, reviews: 0, again: 0, good: 0, answers: 0, minutes: 0 }; }

  /**
   * Podsumowanie na dziś bez wczytywania talii (plakietka, kafelek „Dziś”):
   * { due: karty w nauce i powtórki na dziś (z limitem), fresh: nowe do limitu, total }.
   */
  function dueSummary() {
    const s = st(), t = now(), end = L().dayEnd(t), on = enabled();
    let learning = 0, reviews = 0;
    const touched = {};
    Object.keys(s.cards).forEach(function (id) {
      const deck = deckOfId(id);
      if (!deck || on.indexOf(deck) === -1) return;
      const x = s.cards[id];
      touched[deck] = (touched[deck] || 0) + 1;
      if (L().isHidden(x, t) || x.state === "new") return;
      if ((x.state === "learning" || x.state === "relearning") && x.due < end) learning++;
      else if (x.state === "review" && x.due < end) reviews++;
    });
    const tc = todayCounts();
    reviews = Math.min(reviews, Math.max(0, s.settings.reviewsPerDay - tc.reviews));
    let unseen = 0;
    allDecks().forEach(function (d) { if (on.indexOf(d.id) !== -1) unseen += Math.max(0, d.count - (touched[d.id] || 0)); });
    const fresh = Math.min(unseen, Math.max(0, s.settings.newPerDay - tc.new));
    return { due: learning + reviews, fresh: fresh, total: learning + reviews + fresh };
  }

  function badgeCount() { return hasProfile() ? dueSummary().total : 0; }

  /** Najbliższy termin (ms) karty w włączonych taliach po chwili „t” albo null. */
  function nextDue(t) {
    const s = st(), on = enabled();
    let best = null;
    Object.keys(s.cards).forEach(function (id) {
      const x = s.cards[id];
      if (x.state === "new" || x.suspended || on.indexOf(deckOfId(id)) === -1) return;
      const due = Math.max(x.due, x.buriedUntil || 0);
      if (due > t && (best === null || due < best)) best = due;
    });
    return best;
  }

  function fmtWhen(ms) {
    const d = new Date(ms), t = now();
    const hm = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    const day = L().studyDay(ms);
    if (day === L().studyDay(t)) return "dziś o " + hm;
    if (day === L().studyDay(t + H().DAY)) return "jutro o " + hm;
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long" }) + " o " + hm;
  }

  function saveState() { S().save(); refreshChrome(); }

  /** Plakietka w panelu i kafelek „Dziś” po zmianie danych. */
  function refreshChrome() {
    if (ELM.render && ELM.render.renderToolsNav) ELM.render.renderToolsNav();
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // =====================================================================
  // RYSOWANIE KARTY (przód / tył) — tylko węzły tekstowe
  // =====================================================================

  function clozeParts(card) { return L().parseCloze(card.text); }

  /** Chipy egzaminów z tagów karty: skrót widoczny, pełny opis dla czytników i w podpowiedzi (spec 15, sekcja 3). */
  function examChips(card) {
    const ex = L().examsOf(card);
    if (!ex.length) return null;
    const hint = "Wyrażenia typowe dla zadań tego egzaminu. Oryginalne zdania, nie z arkuszy.";
    return el("p", { class: "fc-exams" }, [
      el("span", { class: "review-label", text: "Przydatne na: " }),
      ex.map(function (e) {
        return el("span", { class: "chip fc-exam is-" + e.code, title: hint }, [
          el("span", { "aria-hidden": "true", text: e.short }),
          el("span", { class: "visually-hidden", text: e.name })
        ]);
      })
    ]);
  }

  function renderFront(card) {
    const nodes = [];
    if (card.type === "cloze") {
      const c = clozeParts(card);
      nodes.push(el("p", { class: "fc-text", lang: "en" }, c.ok
        ? [document.createTextNode(c.before), el("span", { class: "fc-blank", "aria-label": "luka" }, "_____"), document.createTextNode(c.after)]
        : [document.createTextNode(card.text)]));
    } else {
      nodes.push(el("p", { class: "fc-text", text: card.front }));
    }
    if (card.hint) nodes.push(el("p", { class: "fc-hint" }, [el("span", { class: "review-label", text: "Podpowiedź: " }), document.createTextNode(card.hint)]));
    else if (card.word && card.type === "cloze") {
      // „Moje słowa” bez znaczenia: podpowiedź to pierwsza litera (długość luki jej nie zdradza)
      const c = clozeParts(card);
      const first = c.ok ? c.answers[0].charAt(0) : "";
      if (first) nodes.push(el("p", { class: "fc-hint" }, [el("span", { class: "review-label", text: "Podpowiedź: " }), document.createTextNode("zaczyna się na „" + first + "”")]));
    }
    const chips = examChips(card);
    if (chips) nodes.push(chips);
    return nodes;
  }

  function renderBack(card) {
    const nodes = [];
    const answers = L().answersOf(card);
    if (card.type === "cloze") {
      const c = clozeParts(card);
      nodes.push(el("p", { class: "fc-text", lang: "en" }, c.ok
        ? [document.createTextNode(c.before), el("strong", { class: "fc-answer", text: c.answers[0] }), document.createTextNode(c.after)]
        : [document.createTextNode(card.text)]));
    } else {
      nodes.push(el("p", { class: "fc-text fc-back" }, el("strong", { class: "fc-answer", text: card.back })));
    }
    if (answers.length > 1) nodes.push(el("p", { class: "fc-extra" }, [el("span", { class: "review-label", text: "Akceptowane też: " }), document.createTextNode(answers.slice(1).join(", "))]));
    if (card.example) nodes.push(el("p", { class: "fc-extra", lang: "en" }, [el("span", { class: "review-label", text: "Przykład: " }), document.createTextNode(card.example)]));
    // „Moje słowa”: znaczenie (gdy jest), dodatkowe przykłady i źródło
    if (card.word && card.hint && card.type === "cloze") nodes.push(el("p", { class: "fc-extra" }, [el("span", { class: "review-label", text: "Znaczenie: " }), document.createTextNode(card.hint)]));
    if (card.examples && card.examples.length) {
      nodes.push(el("div", { class: "fc-extra fc-examples" }, [
        el("span", { class: "review-label", text: card.examples.length === 1 ? "Drugi przykład:" : "Kolejne przykłady:" }),
        el("ul", { class: "fc-example-list", lang: "en" }, card.examples.map(function (x) { return el("li", { text: x }); }))
      ]));
    }
    if (card.source && (card.source.route || card.source.title)) {
      nodes.push(el("p", { class: "fc-extra fc-source" }, [el("span", { class: "review-label", text: "Źródło: " }),
        card.source.route ? el("a", { href: card.source.route, text: card.source.title || card.source.route }) : document.createTextNode(card.source.title)]));
    }
    if (card.note) nodes.push(el("p", { class: "fc-extra" }, [el("span", { class: "review-label", text: "Uwaga: " }), document.createTextNode(card.note)]));
    const chips = examChips(card);
    if (chips) nodes.push(chips);
    return nodes;
  }

  // =====================================================================
  // EKRAN GŁÓWNY
  // =====================================================================

  function head(title, lead) {
    return el("header", { class: "tool-head" }, [
      el("h1", { class: "tool-title" }, [el("span", { class: "lab-head-icon", "aria-hidden": "true" }, ELM.icon("layers", { size: 28 })), title]),
      lead ? el("p", { class: "tool-lead", text: lead }) : null
    ]);
  }

  function noProfile(view) {
    view.appendChild(head("Fiszki", "Nauka słówek, kolokacji i czasowników frazowych metodą aktywnego przypominania."));
    view.appendChild(el("div", { class: "empty-state" }, [
      el("p", { class: "empty-state-text", text: "Fiszki zapisują postęp w profilu." }),
      el("p", { class: "empty-state-hint", text: "Dodaj albo wybierz profil w prawym górnym rogu, żeby zacząć." })
    ]));
  }

  function renderHome(view) {
    view.appendChild(head("Fiszki", "Najpierw spróbuj sobie przypomnieć, potem sprawdź. Karty, które idą Ci gorzej, wracają częściej."));
    const sum = dueSummary();
    const streak = ELM.learn && ELM.profileData ? ELM.learn.streak(ELM.profileData.activityDays(), ELM.learn.today()) : null;
    const next = sum.total ? null : nextDue(now());
    view.appendChild(el("section", { class: "card fc-hero", "aria-labelledby": "fc-hero-title" }, [
      el("div", { class: "fc-hero-main" }, [
        el("p", { class: "fc-hero-label", id: "fc-hero-title", text: "Do powtórki dziś" }),
        el("p", { class: "fc-hero-count" }, [el("strong", { class: "num", text: String(sum.total) }), el("span", { text: " (w tym nowe: " + sum.fresh + ")" })]),
        streak ? el("p", { class: "tool-note", text: "Seria dni nauki: " + streak.current + " " + plural(streak.current, "dzień", "dni", "dni") + (streak.activeToday ? " · dziś już się liczy" : "") }) : null
      ]),
      sum.total
        ? el("a", { class: "btn btn-primary btn-large fc-start", href: HASH + "/sesja" }, ELM.ui.withIcon("play", "Ucz się teraz"))
        : el("div", { class: "fc-done" }, [
          el("p", { class: "fc-done-title", text: "Na dziś koniec" }),
          el("p", { class: "tool-note", text: next ? "Najbliższa powtórka: " + fmtWhen(next) + "." : "Włącz talię albo dodaj karty, żeby mieć co powtarzać." })
        ])
    ]));

    const decks = allDecks();
    const on = enabled();
    if (!on.length || !decks.some(function (d) { return on.indexOf(d.id) !== -1 && d.count; })) {
      view.appendChild(el("section", { class: "empty-state fc-empty" }, [
        el("p", { class: "empty-state-text", text: "Jak działają fiszki?" }),
        el("p", { class: "empty-state-hint", text: "Widzisz przód karty i próbujesz przypomnieć sobie odpowiedź, zanim ją odsłonisz. Potem sam oceniasz, jak poszło. Im lepiej pamiętasz kartę, tym rzadziej wraca – a trudne karty pojawiają się częściej." }),
        el("button", { type: "button", class: "btn btn-primary", onclick: function () { toggleDeck(index()[0].id, true); render(); } }, "Włącz pierwszą talię")
      ]));
    }

    if (ELM.fiszkiWords) {
      const wc = ELM.fiszkiWords.counts();
      view.appendChild(el("section", { class: "card fc-words-tile", "aria-labelledby": "fc-words-title" }, [
        el("h2", { class: "tile-title", id: "fc-words-title", text: "Moje słowa" }),
        wc.total
          ? el("p", { class: "tool-note", text: wc.total + " " + plural(wc.total, "słowo", "słowa", "słów") + " (opanowane: " + wc.mastered + ")." })
          : el("p", { class: "tool-note", text: "Zaznacz słowo w tekście i naciśnij M – zapiszesz je razem ze zdaniem." }),
        el("a", { class: "btn btn-secondary tile-action", href: HASH + "/moje-slowa" }, ELM.ui.withIcon("layers", "Otwórz Moje słowa"))
      ]));
    }

    view.appendChild(el("h2", { class: "section-title", text: "Talie" }));
    view.appendChild(el("div", { class: "fc-actions" }, [
      el("a", { class: "btn btn-secondary", href: HASH + "/import" }, ELM.ui.withIcon("upload", "Importuj")),
      el("button", { type: "button", class: "btn btn-secondary", onclick: createDeck }, ELM.ui.withIcon("plus", "Nowa talia"))
    ]));
    view.appendChild(el("ul", { class: "fc-deck-list" }, decks.filter(function (d) { return d.builtIn; }).map(deckCard)));
    const own = decks.filter(function (d) { return !d.builtIn; });
    view.appendChild(el("h2", { class: "section-title", text: "Moje talie" }));
    if (!own.length) view.appendChild(el("p", { class: "tool-note", text: "Nie masz jeszcze własnych talii. Utwórz talię albo dodaj kartę z Dziennika błędów – trafi do talii „Moje błędy”." }));
    else view.appendChild(el("ul", { class: "fc-deck-list" }, own.map(deckCard)));

    view.appendChild(settingsSection());
  }

  /** Talie tematyczne (temat-*) z filtrem poziomu: poziom A1/A2/B1 pokazuje talie, które mają karty na tym poziomie. */
  function renderThemes(view, level) {
    view.appendChild(el("p", { class: "c1-back" }, el("a", { href: HASH }, ELM.ui.withIcon("arrow-left", "Fiszki"))));
    view.appendChild(head("Fiszki tematyczne", "Słowa i wyrażenia o codziennych tematach, od A1 do B1. Każda talia włącza się osobno."));
    const levels = ["", "A1", "A2", "B1"];
    view.appendChild(el("div", { class: "chip-filter", role: "group", "aria-label": "Poziom" }, levels.map(function (l) {
      const active = l === level;
      return el("a", { class: "chip-btn" + (active ? " is-active" : ""), href: HASH + "/tematy" + (l ? "/" + l.toLowerCase() : ""), "aria-current": active ? "true" : null }, [active ? ELM.icon("check", { size: 16 }) : null, l || "Wszystkie"]);
    })));
    const themes = allDecks().filter(function (d) { return /^temat-/.test(d.id); }).filter(function (d) {
      return !level || cardsOf(d.id).some(function (c) { return c.level === level; });
    });
    if (!themes.length) { view.appendChild(el("p", { class: "tool-note", text: "Brak talii tematycznych na tym poziomie." })); return; }
    view.appendChild(el("ul", { class: "fc-deck-list" }, themes.map(deckCard)));
  }

  function bar(stats) {
    const total = Math.max(1, stats.total);
    const seg = function (n, cls) { return n ? el("span", { class: "fc-bar-seg " + cls, style: "width:" + (100 * n / total) + "%" }) : null; };
    return el("div", { class: "fc-bar-wrap" }, [
      el("div", { class: "fc-bar", "aria-hidden": "true" }, [seg(stats.mastered, "is-mastered"), seg(stats.review + stats.learning, "is-learning"), seg(stats.new, "is-new")]),
      el("p", { class: "fc-bar-legend" }, [
        el("span", { class: "fc-legend is-new", text: "Nowe: " + stats.new }),
        el("span", { class: "fc-legend is-learning", text: "W nauce: " + (stats.learning + stats.review) }),
        el("span", { class: "fc-legend is-mastered", text: "Opanowane: " + stats.mastered }),
        stats.suspended ? el("span", { class: "fc-legend", text: "Zawieszone: " + stats.suspended }) : null
      ])
    ]);
  }

  function deckCard(d) {
    const on = enabled().indexOf(d.id) !== -1;
    const stats = L().deckStats(cardsOf(d.id), st().cards, now());
    const sw = el("button", {
      type: "button", class: "fc-switch", role: "switch", "aria-checked": on ? "true" : "false",
      "aria-label": "Włączona w nauce: " + d.title,
      onclick: function () { toggleDeck(d.id, !on); render(); const again = document.querySelector('.fc-switch[aria-label="Włączona w nauce: ' + d.title.replace(/"/g, '\\"') + '"]'); if (again) again.focus(); }
    }, [el("span", { class: "fc-switch-track", "aria-hidden": "true" }, el("span", { class: "fc-switch-thumb" })), el("span", { class: "fc-switch-text", text: on ? "Włączona" : "Wyłączona" })]);
    const actions = [el("a", { class: "btn btn-secondary btn-small", href: d.system === "words" ? HASH + "/moje-slowa" : HASH + "/talia/" + d.id }, "Przeglądaj")];
    if (!d.builtIn) actions.push(el("a", { class: "btn btn-secondary btn-small", href: HASH + "/talia/" + d.id + "/nowa" }, ELM.ui.withIcon("plus", "Dodaj kartę")));
    actions.push(el("button", { type: "button", class: "btn btn-secondary btn-small", onclick: function () { exportDeck(d); } }, ELM.ui.withIcon("download", "Eksportuj")));
    return el("li", { class: "card fc-deck" + (on ? " is-on" : "") }, [
      el("div", { class: "fc-deck-head" }, [
        el("h3", { class: "fc-deck-title", text: d.title }),
        d.level ? el("span", { class: "c1-chip", text: d.level }) : null,
        el("span", { class: "c1-chip", text: d.count + " " + plural(d.count, "karta", "karty", "kart") })
      ]),
      el("p", { class: "fc-deck-desc", text: d.description }),
      bar(stats),
      el("div", { class: "fc-deck-foot" }, [sw, el("div", { class: "fc-deck-actions" }, actions)])
    ]);
  }

  function toggleDeck(id, on) {
    const list = st().settings.enabledDecks;
    const i = list.indexOf(id);
    if (on && i === -1) list.push(id);
    if (!on && i !== -1) list.splice(i, 1);
    saveState();
  }

  function createDeck() {
    if (!hasProfile()) return;
    ELM.dialogs.prompt({ title: "Nowa talia", label: "Nazwa talii", confirmLabel: "Utwórz" }).then(function (name) {
      if (!name) return;
      const d = { id: "u-" + U.uid("talia").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40), title: name.trim().slice(0, 80), createdAt: new Date().toISOString() };
      st().userDecks.push(d);
      st().settings.enabledDecks.push(d.id);
      saveState();
      location.hash = HASH + "/talia/" + d.id;
    });
  }

  function exportDeck(d) {
    const cards = cardsOf(d.id);
    downloadText("fiszki-" + d.id + ".tsv", L().exportTsv(cards), "text/tab-separated-values;charset=utf-8");
    ELM.ui.toast({ text: "Wyeksportowano " + cards.length + " " + plural(cards.length, "kartę", "karty", "kart") + " (TSV dla Anki).", icon: "download" });
  }

  function settingsSection() {
    const s = st().settings;
    const num = function (id, label, key, max, hint) {
      const input = el("input", { type: "number", class: "field fc-num", id: id, min: "0", max: String(max), value: String(s[key]),
        onchange: function () { const v = Math.max(0, Math.min(max, Math.floor(Number(input.value) || 0))); input.value = String(v); s[key] = v; saveState(); } });
      return el("div", { class: "form-field" }, [el("label", { class: "field-label", for: id, text: label }), input, hint ? el("p", { class: "tool-note", text: hint }) : null]);
    };
    const check = function (id, label, key, hint) {
      const input = el("input", { type: "checkbox", id: id, checked: !!s[key], onchange: function () { s[key] = input.checked; saveState(); } });
      return el("div", { class: "fc-check" }, [input, el("label", { for: id, text: label }), hint ? el("p", { class: "tool-note", text: hint }) : null]);
    };
    return el("details", { class: "card fc-settings" }, [
      el("summary", { class: "fc-settings-title", text: "Ustawienia nauki" }),
      el("div", { class: "fc-settings-grid" }, [
        num("fc-new", "Nowe karty dziennie", "newPerDay", 100, "Domyślnie 10."),
        num("fc-rev", "Limit powtórek dziennie", "reviewsPerDay", 999, "Domyślnie 100.")
      ]),
      check("fc-type", "Najpierw wpisz odpowiedź (karty z luką i zwykłe)", "typeAnswerFirst", "Karty „wpisz” zawsze wymagają wpisania."),
      check("fc-fuzz", "Rozpraszaj terminy (±5%), żeby karty z jednego dnia nie wracały razem", "fuzz"),
      check("fc-auto", "Automatycznie dodawaj błędy z ćwiczeń do fiszek (talia „Moje błędy”)", "autoAddMistakes")
    ]);
  }

  // =====================================================================
  // SESJA NAUKI
  // =====================================================================

  let session = null;
  let extraNewToday = { day: null, used: false }; // „Dodaj kolejne 5 nowych kart” — jednorazowo w ciągu dnia

  function sessionCards() {
    const on = enabled();
    let out = [];
    allDecks().forEach(function (d) { if (on.indexOf(d.id) !== -1) out = out.concat(cardsOf(d.id)); });
    return out;
  }

  function startSession(extraNew) {
    const t = now();
    const cards = sessionCards();
    const byId = {};
    cards.forEach(function (c) { byId[c.id] = c; });
    const q = L().buildQueue({ cards: cards, state: st().cards, now: t, settings: st().settings, today: todayCounts(), extraNew: extraNew || 0 });
    session = {
      byId: byId, queue: q.queue.slice(), pool: q.learning.slice(), total: q.queue.length + q.learning.length,
      done: 0, current: null, revealed: false, typed: null, undo: [], startedAt: t,
      grades: { again: 0, hard: 0, good: 0, easy: 0 }, againById: {}, finished: false, root: null,
      profileId: app().getActiveProfile().id
    };
    advance();
  }

  function advance() {
    const pick = L().pickNext(session.pool, session.queue, st().cards, now());
    session.revealed = false;
    session.typed = null;
    if (!pick) { session.current = null; finishSession(); return; }
    session.current = pick.id;
    if (pick.from === "queue") session.queue.shift();
  }

  function finishSession() {
    if (session.finished) return;
    session.finished = true;
    const minutes = Math.round((now() - session.startedAt) / 60000);
    if (session.done) {
      const d = st().daily[today()] = st().daily[today()] || { new: 0, reviews: 0, again: 0, good: 0, answers: 0, minutes: 0 };
      d.minutes = Math.min(1440, (d.minutes || 0) + minutes);
      saveState();
    }
    // Ukończona sesja (≥ 5 kart) = dzień nauki w istniejącym mechanizmie serii
    if (session.done >= 5 && ELM.markActivity) ELM.markActivity();
  }

  function cardIsTyped(card) {
    return card.type === "typed" || (st().settings.typeAnswerFirst && (card.type === "cloze" || card.type === "basic"));
  }

  function grade(g) {
    if (!session || !session.current || !session.revealed) return;
    const id = session.current, t = now();
    const prev = st().cards[id];
    const base = prev && prev.state !== "new" ? prev : Object.assign(H().newCard(), prev && prev.suspended ? { suspended: true } : {});
    const dayKey = today();
    session.undo.push({ id: id, prev: clone(prev), daily: clone(st().daily[dayKey]), queue: session.queue.slice(), pool: session.pool.slice(),
      done: session.done, grades: clone(session.grades), againById: clone(session.againById) });
    if (session.undo.length > 20) session.undo.shift();
    const next = H().schedule(base, g, t, null, { fuzz: st().settings.fuzz, random: Math.random });
    if (prev && prev.again) next.again = prev.again;
    if (g === "again") next.again = (next.again || 0) + 1;
    st().cards[id] = next;
    const d = st().daily[dayKey] = st().daily[dayKey] || { new: 0, reviews: 0, again: 0, good: 0, answers: 0, minutes: 0 };
    if (!prev || prev.state === "new") d.new++;
    else if (prev.state === "review") d.reviews++;
    if (g === "again") d.again++;
    if (g === "good" || g === "easy") d.good++;
    d.answers = (d.answers || 0) + 1;
    saveState();
    session.grades[g]++;
    if (g === "again") session.againById[id] = (session.againById[id] || 0) + 1;
    session.done++;
    const i = session.pool.indexOf(id);
    if (next.state === "learning" || next.state === "relearning") { if (i === -1) session.pool.push(id); }
    else if (i !== -1) session.pool.splice(i, 1);
    advance();
    paintSession();
  }

  function undoLast() {
    if (!session || !session.undo.length) return;
    const u = session.undo.pop();
    if (u.prev === undefined) delete st().cards[u.id]; else st().cards[u.id] = u.prev;
    const dayKey = today();
    if (u.daily === undefined) delete st().daily[dayKey]; else st().daily[dayKey] = u.daily;
    saveState();
    session.queue = u.queue; session.pool = u.pool; session.done = u.done; session.grades = u.grades; session.againById = u.againById;
    session.finished = false;
    session.current = u.id; session.revealed = true; session.typed = null;
    paintSession();
    announce("Cofnięto ostatnią ocenę.");
  }

  /** Zawieś (S) albo odłóż do jutra (B) bieżącą kartę. */
  function setAside(kind) {
    if (!session || !session.current) return;
    const id = session.current;
    const prev = st().cards[id];
    session.undo.push({ id: id, prev: clone(prev), daily: clone(st().daily[today()]), queue: session.queue.slice(), pool: session.pool.slice(),
      done: session.done, grades: clone(session.grades), againById: clone(session.againById) });
    const x = Object.assign(H().newCard(), prev || {});
    if (kind === "suspend") x.suspended = true; else x.buriedUntil = L().dayEnd(now());
    st().cards[id] = x;
    saveState();
    const i = session.pool.indexOf(id);
    if (i !== -1) session.pool.splice(i, 1);
    session.total = Math.max(session.done, session.total - 1);
    advance();
    paintSession();
    announce(kind === "suspend" ? "Karta zawieszona. Przywrócisz ją w przeglądaniu talii." : "Karta odłożona do jutra.");
  }

  let liveNode = null;
  function announce(text) { if (liveNode) liveNode.textContent = text; }

  function renderSession(view) {
    if (!session || session.stale) startSession(0);
    session.root = el("div", { class: "fc-session" });
    view.appendChild(session.root);
    paintSession();
  }

  function paintSession() {
    const root = session && session.root;
    if (!root) return;
    root.replaceChildren();
    liveNode = el("p", { class: "visually-hidden", "aria-live": "polite" });
    if (!session.current) { root.appendChild(summaryView()); root.appendChild(liveNode); return; }
    const card = session.byId[session.current] || cardById(session.current);
    if (!card) { advance(); paintSession(); return; }
    const deck = deckById(card.deck);
    const remainingLearn = session.pool.length;
    const pct = session.total ? Math.min(100, 100 * session.done / Math.max(session.total, session.done + 1)) : 0;
    root.appendChild(el("div", { class: "fc-session-top" }, [
      el("a", { class: "c1-back fc-back", href: HASH }, ELM.ui.withIcon("arrow-left", "Fiszki")),
      el("div", { class: "fc-progress" }, [
        el("p", { class: "fc-progress-text", text: (session.done + 1) + " z " + Math.max(session.total, session.done + 1) + (remainingLearn ? " · w nauce: " + remainingLearn : "") }),
        el("div", { class: "fc-progress-bar", role: "progressbar", "aria-label": "Postęp sesji", "aria-valuemin": "0", "aria-valuemax": String(Math.max(session.total, session.done + 1)), "aria-valuenow": String(session.done) },
          el("span", { class: "fc-progress-fill", style: "width:" + pct + "%" }))
      ]),
      el("button", { type: "button", class: "btn btn-secondary btn-small", onclick: function () { session.current = null; finishSession(); paintSession(); } }, "Zakończ")
    ]));

    const typedMode = cardIsTyped(card);
    const cardNode = el("section", { class: "card fc-card" + (session.revealed ? " is-revealed" : ""), "aria-label": "Fiszka" + (deck ? " z talii " + deck.title : "") }, [
      el("p", { class: "fc-card-meta" }, [deck ? el("span", { text: deck.title }) : null, el("span", { class: "fc-type", text: { basic: "Zwykła", cloze: "Luka", typed: "Wpisz" }[card.type] })]),
      el("div", { class: "fc-front" }, renderFront(card))
    ]);
    root.appendChild(cardNode);

    // Tryb wpisywania: pole, Enter sprawdza
    let input = null;
    if (typedMode) {
      input = el("input", { type: "text", class: "field fc-input", id: "fc-input", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        "aria-label": "Twoja odpowiedź", value: session.typed ? session.typed.input : "", disabled: session.revealed });
      if (session.typed) input.classList.add(session.typed.result.result === "exact" ? "is-ok" : session.typed.result.result === "typo" ? "is-close" : "is-bad");
      cardNode.appendChild(el("div", { class: "fc-type-row" }, [
        el("label", { class: "field-label", for: "fc-input", text: "Wpisz odpowiedź i naciśnij Enter" }),
        input
      ]));
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); checkTyped(card, input.value); }
      });
    }
    const result = el("p", { class: "fc-result", "aria-live": "polite" });
    if (session.typed) {
      const r = session.typed.result;
      result.className = "fc-result is-" + r.result;
      result.replaceChildren(
        ELM.icon(r.result === "exact" ? "check" : r.result === "typo" ? "triangle-alert" : "x", { size: 18 }),
        document.createTextNode(" " + (r.result === "exact" ? "Dobrze!" : r.result === "typo" ? "Prawie dobrze (literówka). Poprawnie: " + r.expected : r.result === "empty" ? "Brak odpowiedzi." : "Niepoprawnie. Poprawnie: " + r.expected))
      );
    }
    cardNode.appendChild(result);

    if (session.revealed) {
      cardNode.appendChild(el("div", { class: "fc-backside" + (ELM.reducedMotion && ELM.reducedMotion() ? "" : " is-anim") }, renderBack(card)));
      const pv = H().preview(st().cards[card.id] && st().cards[card.id].state !== "new" ? st().cards[card.id] : H().newCard(), now());
      const suggested = session.typed ? session.typed.result.suggested : null;
      root.appendChild(el("div", { class: "fc-grades", role: "group", "aria-label": "Oceń, jak poszło" }, GRADE_INFO.map(function (g) {
        const when = H().formatDelay(pv[g.id].delay);
        const isSug = suggested === g.id;
        return el("button", {
          type: "button", class: "btn fc-grade is-" + g.id + (isSug ? " is-suggested" : ""), "data-grade": g.id,
          "aria-label": g.label + " – następna powtórka za " + when + (isSug ? " (sugerowana ocena)" : ""),
          onclick: function () { grade(g.id); }
        }, [el("span", { class: "fc-grade-label", text: g.label }), el("span", { class: "fc-grade-when", text: when }),
          el("span", { class: "fc-grade-key", "aria-hidden": "true", text: g.key }), isSug ? el("span", { class: "fc-grade-sug", "aria-hidden": "true", text: "sugerowana" }) : null]);
      })));
    } else if (!typedMode) {
      root.appendChild(el("div", { class: "fc-reveal-row" }, el("button", { type: "button", class: "btn btn-primary btn-large fc-reveal", onclick: reveal }, "Pokaż odpowiedź")));
    } else {
      root.appendChild(el("div", { class: "fc-reveal-row" }, [
        el("button", { type: "button", class: "btn btn-primary btn-large", onclick: function () { checkTyped(card, input.value); } }, "Sprawdź"),
        el("button", { type: "button", class: "btn btn-ghost", onclick: function () { checkTyped(card, ""); } }, "Nie wiem – pokaż")
      ]));
    }

    const own = /^u-/.test(card.id);
    root.appendChild(el("div", { class: "fc-tools" }, [
      el("button", { type: "button", class: "btn btn-ghost btn-small", disabled: !session.undo.length, onclick: undoLast }, ELM.ui.withIcon("undo-2", "Cofnij (Z)")),
      own ? el("a", { class: "btn btn-ghost btn-small", href: HASH + "/talia/" + card.deck + "/karta/" + card.id }, ELM.ui.withIcon("pencil", "Edytuj (E)")) : null,
      el("button", { type: "button", class: "btn btn-ghost btn-small", onclick: function () { setAside("suspend"); } }, ELM.ui.withIcon("pause", "Zawieś (S)")),
      el("button", { type: "button", class: "btn btn-ghost btn-small", onclick: function () { setAside("bury"); } }, ELM.ui.withIcon("clock", "Odłóż do jutra (B)"))
    ]));
    root.appendChild(el("p", { class: "tool-note fc-keys", text: "Skróty: Spacja – pokaż / Dobrze, 1–4 – oceny, Z – cofnij, S – zawieś, B – odłóż" + (own ? ", E – edytuj" : "") + "." }));
    root.appendChild(liveNode);

    // Fokus: pole wpisywania albo główny przycisk
    setTimeout(function () {
      const target = !session.revealed && input ? input : root.querySelector(session.revealed ? ".fc-grade.is-suggested, .fc-grade.is-good" : ".fc-reveal");
      if (target) target.focus({ preventScroll: true });
    }, 0);
  }

  function reveal() {
    if (!session || session.revealed) return;
    session.revealed = true;
    paintSession();
  }

  function checkTyped(card, value) {
    if (!session || session.revealed) return;
    session.typed = { input: value, result: L().checkAnswer(value, L().answersOf(card)) };
    session.revealed = true;
    paintSession();
  }

  function summaryView() {
    const box = el("section", { class: "card fc-summary", "aria-labelledby": "fc-sum-title" });
    const total = session.done;
    if (!total) {
      const next = nextDue(now());
      box.appendChild(el("h2", { class: "section-title", id: "fc-sum-title", text: "Na dziś koniec" }));
      box.appendChild(el("p", { text: next ? "Najbliższa powtórka: " + fmtWhen(next) + "." : "Nie masz kart do powtórki. Włącz talię albo dodaj własne karty." }));
      box.appendChild(summaryActions());
      return box;
    }
    const goodPct = Math.round(100 * (session.grades.good + session.grades.easy) / total);
    const minutes = Math.max(1, Math.round((now() - session.startedAt) / 60000));
    const end = L().dayEnd(now());
    let tomorrow = 0;
    Object.keys(st().cards).forEach(function (id) {
      const x = st().cards[id];
      if (!x.suspended && x.state !== "new" && x.due >= end && x.due < end + H().DAY && enabled().indexOf(deckOfId(id)) !== -1) tomorrow++;
    });
    const hardest = Object.keys(session.againById).sort(function (a, b) { return session.againById[b] - session.againById[a]; }).slice(0, 5);
    box.appendChild(el("h2", { class: "section-title", id: "fc-sum-title", text: "Podsumowanie sesji" }));
    box.appendChild(el("ul", { class: "fc-sum-stats" }, [
      el("li", null, [el("strong", { class: "num", text: String(total) }), " " + plural(total, "karta", "karty", "kart")]),
      el("li", null, [el("strong", { class: "num", text: goodPct + "%" }), " Dobrze lub Łatwe"]),
      el("li", null, [el("strong", { class: "num", text: minutes + " min" }), " czasu"]),
      el("li", null, [el("strong", { class: "num", text: String(tomorrow) }), " do powtórki jutro"])
    ]));
    if (hardest.length) {
      box.appendChild(el("h3", { class: "c1-check-title", text: "Najtrudniejsze karty" }));
      box.appendChild(el("ul", { class: "fc-hardest" }, hardest.map(function (id) {
        const c = session.byId[id] || cardById(id);
        return el("li", null, [document.createTextNode(c ? L().frontText(c) : id), el("span", { class: "tool-note", text: " · Znowu: " + session.againById[id] + "×" })]);
      })));
    }
    if (total >= 5) box.appendChild(el("p", { class: "tool-note", text: "Sesja liczy się do serii dni nauki." }));
    box.appendChild(summaryActions());
    return box;
  }

  function summaryActions() {
    const day = today();
    if (extraNewToday.day !== day) extraNewToday = { day: day, used: false };
    const cards = sessionCards();
    const unseen = cards.filter(function (c) { const x = st().cards[c.id]; return (!x || x.state === "new") && !L().isHidden(x, now()); }).length;
    return el("div", { class: "fc-actions" }, [
      !extraNewToday.used && unseen ? el("button", { type: "button", class: "btn btn-primary", onclick: function () {
        extraNewToday.used = true;
        startSession(5);
        paintSession();
      } }, ELM.ui.withIcon("plus", "Dodaj kolejne 5 nowych kart")) : null,
      el("a", { class: "btn btn-secondary", href: HASH }, "Wróć do talii")
    ]);
  }

  /** Skróty sesji: nie działają w polach tekstowych (poza Enter, obsługiwanym przez pole). */
  function onKey(e) {
    if (!session || !session.root || !document.contains(session.root) || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (document.querySelector(".dialog-backdrop, dialog[open]")) return;
    const k = e.key.toLowerCase();
    if (!session.current) return;
    if (k === " " || k === "spacebar") {
      if (t && (t.tagName === "BUTTON" || t.tagName === "A") && !session.revealed && !t.classList.contains("fc-reveal")) return;
      e.preventDefault();
      if (!session.revealed) { if (!cardIsTyped(session.byId[session.current] || {})) reveal(); }
      else grade("good");
    } else if (k === "enter" && !session.revealed && !(t && (t.tagName === "BUTTON" || t.tagName === "A"))) {
      if (!cardIsTyped(session.byId[session.current] || {})) { e.preventDefault(); reveal(); }
    } else if (["1", "2", "3", "4"].indexOf(k) !== -1 && session.revealed) {
      e.preventDefault(); grade(GRADE_INFO[Number(k) - 1].id);
    } else if (k === "z") { e.preventDefault(); undoLast(); }
    else if (k === "s") { e.preventDefault(); setAside("suspend"); }
    else if (k === "b") { e.preventDefault(); setAside("bury"); }
    else if (k === "e" && /^u-/.test(session.current)) {
      e.preventDefault();
      const c = session.byId[session.current];
      location.hash = HASH + "/talia/" + c.deck + "/karta/" + c.id;
    }
  }
  document.addEventListener("keydown", onKey);

  // =====================================================================
  // TRASY I RYSOWANIE
  // =====================================================================

  function parseRoute(hash) {
    const m = /^#\/fiszki(?:\/(.*))?$/.exec(hash || "");
    if (!m) return null;
    const p = (m[1] || "").replace(/\/+$/, "").split("/").filter(Boolean).map(decodeURIComponent);
    if (!p.length) return { kind: "home" };
    if (p[0] === "sesja") return { kind: "session" };
    if (p[0] === "import") return { kind: "import" };
    if (p[0] === "tematy") return { kind: "themes", level: /^(a1|a2|b1)$/.test(p[1] || "") ? p[1].toUpperCase() : "" };
    if (p[0] === "moje-slowa" || (p[0] === "talia" && p[1] === WORDS_ID && !p[2])) return { kind: "words" };
    if (p[0] === "talia" && p[1]) {
      if (p[2] === "nowa") return { kind: "edit", deck: p[1], card: null };
      if (p[2] === "karta" && p[3]) return { kind: "edit", deck: p[1], card: p[3] };
      return { kind: "deck", deck: p[1] };
    }
    return { kind: "home" };
  }

  let lastRoute = null;

  function render() {
    const view = document.getElementById("view");
    const route = parseRoute(location.hash) || { kind: "home" };
    view.className = "view tool-view fiszki-view";
    view.dataset.file = HASH;
    view.replaceChildren();
    document.title = "Fiszki · English Levels Map";
    if (!hasProfile()) { session = null; noProfile(view); return; }
    // Nowa sesja przy każdym wejściu z innej strony; przerysowanie tej samej sesji zostawia stan
    if (route.kind === "session" && lastRoute !== location.hash && session) session.stale = true;
    // Sesja należy do profilu — po zmianie profilu zaczynamy od nowa
    if (session && session.profileId !== app().getActiveProfile().id) session.stale = true;
    lastRoute = location.hash;
    if (!index().every(function (d) { return loaded(d.id); })) {
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Wczytuję talie…" }));
      loadDecks().then(function () { if (parseRoute(location.hash)) render(); });
      return;
    }
    if (route.kind === "session") renderSession(view);
    else if (route.kind === "themes") renderThemes(view, route.level);
    else if (route.kind === "words" && ELM.fiszkiWords) { document.title = "Moje słowa · English Levels Map"; ELM.fiszkiWords.renderView(view); }
    else if (ELM.fiszkiBrowse && route.kind !== "home") ELM.fiszkiBrowse.render(view, route);
    else renderHome(view);
  }

  window.addEventListener("hashchange", function () { if (!parseRoute(location.hash)) lastRoute = null; });

  // =====================================================================
  // INTEGRACJE (spec 10, 5.4–5.5)
  // =====================================================================

  function journalSource(e) { return e.ref ? String(e.ref) : "journal:" + e.id; }

  /** Czy wpis dziennika ma już kartę (deduplikacja po sourceItemId). */
  function hasJournalCard(e) {
    if (!hasProfile()) return false;
    const sid = journalSource(e);
    return st().userCards.some(function (c) { return c.sourceItemId === sid; });
  }

  /** Karta z wpisu dziennika: cloze, gdy kontekst ma lukę ___, inaczej zwykła (przód = kontekst, tył = poprawna + reguła). */
  function cardFromJournal(e) {
    const correct = String(e.correct || "").replace(/[{}|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    const rule = String(e.rule || "").slice(0, 500);
    const gapLine = String(e.context || "").split("\n").find(function (l) { return /_{3,}/.test(l); });
    if (gapLine && correct) {
      const res = L().makeCard({ type: "cloze", front: gapLine.replace(/_{3,}/, "{{" + correct + "}}").slice(0, 500), back: rule });
      if (!res.error) return res.card;
    }
    return L().makeCard({ type: "basic", front: String(e.context || "").slice(0, 500) || "?", back: correct || "—", note: rule }).card;
  }

  /** Dodaje wpis dziennika do talii „Moje błędy”. opts.silent — bez komunikatu. → { status, card } */
  function addFromJournal(e, opts) {
    opts = opts || {};
    if (!hasProfile()) return { status: "no-profile" };
    if (hasJournalCard(e)) {
      if (!opts.silent) ELM.ui.toast({ text: "Ta karta jest już w fiszkach (talia „Moje błędy”).", icon: "layers" });
      return { status: "exists" };
    }
    const card = cardFromJournal(e);
    if (!card) return { status: "error" };
    ELM.fiszkiBrowse.ensureDeck(MISTAKES_ID, "Moje błędy", "mistakes");
    const added = ELM.fiszkiBrowse.addCard(MISTAKES_ID, card, { sourceItemId: journalSource(e) });
    if (!opts.silent) {
      ELM.ui.toast({ text: "Dodano do fiszek (talia „Moje błędy”).", icon: "layers",
        action: { label: "Cofnij", onClick: function () { ELM.fiszkiBrowse.removeCard(added.id); if (opts.onUndo) opts.onUndo(); } } });
    }
    return { status: "added", card: added };
  }

  /** Błąd z ćwiczenia trafił do dziennika: dodaj fiszkę, jeśli włączono „automatycznie dodawaj”. */
  function autoAddFromJournal(e) {
    if (!e || !hasProfile() || !st().settings.autoAddMistakes) return;
    addFromJournal(e, { silent: true });
  }

  // ---------- „Utwórz fiszkę…” z zaznaczenia (menu przy zaznaczeniu i skróty: js/fiszki-words.js) ----------

  /** Formularz nowej karty z zaznaczonym tekstem jako przodem (dotychczasowe zachowanie, bez zmian). */
  function openFromSelection(text) {
    if (!hasProfile()) { ELM.ui.toast({ text: "Dodaj profil, żeby zapisywać fiszki.", icon: "layers" }); return; }
    ELM.fiszkiBrowse.prefill({ type: "basic", front: text });
    const own = st().userDecks.filter(function (d) { return !d.system; });
    if (ELM.fiszkiWords) ELM.fiszkiWords.hideMenu();
    location.hash = HASH + "/talia/" + (own.length ? own[0].id : "nowa") + "/nowa";
  }

  // ---------- Kafelek „Fiszki do egzaminu” na stronach egzaminów (paczka v6, spec 15, sekcja 4) ----------

  const EXAM_DECKS = {
    "egzamin-osmoklasisty": ["egz-e8"],
    "matura-podstawowa": ["egz-matura"],
    "matura-rozszerzona": ["egz-matura"],
    "certyfikat-b2": ["egz-b2-first"],
    "certyfikat-c1": ["czasowniki-frazowe", "kolokacje"]
  };

  /** Kafelek talii pod dany egzamin (id z rejestru egzaminów): nazwa, liczba kart, stan i „Włącz i ucz się” / „Ucz się”. */
  function examTile(examId) {
    const ids = (EXAM_DECKS[examId] || []).filter(function (id) { return index().some(function (d) { return d.id === id; }); });
    if (!ids.length) return null;
    const decks = ids.map(function (id) { return index().find(function (d) { return d.id === id; }); });
    const box = el("section", { class: "card fc-exam-tile", "aria-labelledby": "fc-exam-title-" + examId });
    function paint() {
      const profile = hasProfile();
      const on = profile ? enabled() : [];
      const allOn = profile && ids.every(function (id) { return on.indexOf(id) !== -1; });
      const parts = [
        el("h2", { class: "tile-title", id: "fc-exam-title-" + examId, text: "Fiszki do egzaminu" }),
        el("p", { class: "tool-note", text: "Wyrażenia typowe dla zadań tego egzaminu. Oryginalne zdania, nie z arkuszy." })
      ];
      decks.forEach(function (d) {
        const ready = profile && loaded(d.id);
        const stats = ready ? L().deckStats(cardsOf(d.id), st().cards, now()) : null;
        parts.push(el("div", { class: "fc-exam-deck" }, [
          el("p", { class: "fc-exam-deck-title" }, [el("strong", { text: d.title }), " ", el("span", { class: "c1-chip", text: d.count + " " + plural(d.count, "karta", "karty", "kart") })]),
          stats ? el("p", { class: "tool-note", text: "Nowe: " + stats.new + " · W nauce: " + (stats.learning + stats.review) + " · Opanowane: " + stats.mastered }) : null
        ]));
      });
      if (!profile) parts.push(el("p", { class: "tool-note", text: "Dodaj profil, żeby uczyć się z fiszek." }));
      parts.push(el("div", { class: "fc-actions" }, [
        profile
          ? el("button", { type: "button", class: "btn btn-primary", onclick: function () { ids.forEach(function (id) { if (enabled().indexOf(id) === -1) toggleDeck(id, true); }); location.hash = HASH + "/sesja"; } },
            ELM.ui.withIcon("play", allOn ? "Ucz się" : "Włącz i ucz się"))
          : null,
        el("a", { class: "btn btn-secondary", href: HASH + "/talia/" + ids[0] }, ELM.ui.withIcon("layers", "Przeglądaj karty"))
      ]));
      box.replaceChildren.apply(box, parts.filter(Boolean));
    }
    paint();
    if (hasProfile()) loadDecks().then(paint);
    return box;
  }

  // ---------- Kafelek „Dziś” i sekcja w Statystykach ----------

  /** Kafelek „Fiszki do powtórki: N” na pulpicie Dziś (bez profilu — null). */
  function todayTile() {
    if (!hasProfile()) return null;
    const sum = dueSummary();
    const next = sum.total ? null : nextDue(now());
    return el("section", { class: "card bento-tile bento-fiszki", "aria-labelledby": "fc-today-title" }, [
      el("h2", { class: "tile-title", id: "fc-today-title" }, ["Fiszki do powtórki"]),
      sum.total
        ? el("p", { class: "tile-big" }, [el("span", { class: "today-number num", text: String(sum.total) }),
          el("span", { class: "tile-unit", text: plural(sum.total, "karta", "karty", "kart") + " na dziś (w tym nowe: " + sum.fresh + ")" })])
        : el("p", { class: "tool-note", text: next ? "Na dziś koniec. Najbliższa powtórka: " + fmtWhen(next) + "." : "Włącz talię w zakładce Fiszki, żeby zacząć." }),
      el("a", { class: "btn " + (sum.total ? "btn-primary" : "btn-secondary") + " tile-action", href: sum.total ? HASH + "/sesja" : HASH }, ELM.ui.withIcon("layers", sum.total ? "Ucz się teraz" : "Otwórz fiszki"))
    ]);
  }

  /** Sekcja „Fiszki” w Statystykach: powtórki z 30 dni, odsetek poprawnych (od 20 powtórek), opanowane, prognoza 7 dni. */
  function statsTile() {
    if (!hasProfile()) return null;
    const s = st(), t = now(), dayMs = H().DAY;
    const days = [];
    for (let i = 29; i >= 0; i--) days.push(L().studyDay(t - i * dayMs));
    const per = days.map(function (d) { return (s.daily[d] && s.daily[d].answers) || 0; });
    const total = per.reduce(function (a, b) { return a + b; }, 0);
    const good = days.reduce(function (a, d) { return a + ((s.daily[d] && s.daily[d].good) || 0); }, 0);
    let mastered = 0;
    const forecast = [0, 0, 0, 0, 0, 0, 0];
    const end0 = L().dayEnd(t);
    Object.keys(s.cards).forEach(function (id) {
      const x = s.cards[id];
      if (x.suspended || x.state === "new") return;
      if (x.state === "review" && x.interval >= 21) mastered++;
      const due = Math.max(x.due, x.buriedUntil || 0);
      const k = due < end0 ? 0 : Math.floor((due - end0) / dayMs) + 1;
      if (k < 7) forecast[k]++;
    });
    const head = el("h2", { class: "tile-title", id: "st-fiszki", text: "Fiszki" });
    if (!total && !Object.keys(s.cards).length) {
      return el("section", { class: "card st-tile st-fiszki", "aria-labelledby": "st-fiszki" }, [head,
        el("p", { class: "st-empty", text: "Nie masz jeszcze powtórek fiszek. Zacznij od talii w zakładce Fiszki – statystyki pojawią się po pierwszej sesji." }),
        el("p", null, el("a", { class: "btn btn-secondary btn-small", href: HASH }, "Otwórz fiszki"))]);
    }
    const max = Math.max(1, Math.max.apply(null, per));
    const bars = el("div", { class: "fc-st-bars", role: "img", "aria-label": "Powtórki fiszek w ostatnich 30 dniach: razem " + total + ", najwięcej jednego dnia: " + Math.max.apply(null, per) + "." },
      per.map(function (n, i) { return el("span", { class: "fc-st-bar" + (n ? "" : " is-zero"), style: "height:" + Math.max(n ? 6 : 2, Math.round(100 * n / max)) + "%", title: days[i].slice(8, 10) + "." + days[i].slice(5, 7) + ": " + n, "aria-hidden": "true" }); }));
    const stat = function (label, value, note) {
      return el("div", { class: "st-stat" }, [el("p", { class: "st-stat-label", text: label }), el("p", { class: "st-stat-value", text: value }), note ? el("p", { class: "st-stat-note tool-note", text: note }) : null]);
    };
    const pct = total >= 20 ? Math.round(100 * good / total) + "%" : "—";
    const fLabels = ["dziś", "jutro"].concat([2, 3, 4, 5, 6].map(function (k) { return new Date(t + k * dayMs).toLocaleDateString("pl-PL", { weekday: "short" }); }));
    return el("section", { class: "card st-tile st-fiszki", "aria-labelledby": "st-fiszki" }, [head,
      el("div", { class: "st-stats is-three" }, [
        stat("Powtórki (30 dni)", String(total)),
        stat("Dobrze lub Łatwe (30 dni)", pct, total >= 20 ? null : "Pokażemy od 20 powtórek (teraz: " + total + ")."),
        stat("Opanowane karty", String(mastered), "interwał co najmniej 21 dni")
      ]),
      el("p", { class: "review-label", text: "Powtórki dziennie – ostatnie 30 dni" }),
      bars,
      ELM.fiszkiWords && ELM.fiszkiWords.counts().total
        ? el("p", { class: "tool-note fc-st-words" }, ["Moje słowa: ", el("strong", { class: "num", text: String(ELM.fiszkiWords.counts().total) }), " (opanowane: " + ELM.fiszkiWords.counts().mastered + ") · ", el("a", { href: HASH + "/moje-slowa", text: "Otwórz" })])
        : null,
      el("p", { class: "review-label", text: "Prognoza powtórek na 7 dni" }),
      el("ol", { class: "fc-st-forecast" }, forecast.map(function (n, i) {
        return el("li", null, [el("span", { class: "fc-st-fc-day", text: fLabels[i] }), el("strong", { class: "num", text: String(n) })]);
      })),
      el("p", null, el("a", { class: "btn btn-secondary btn-small", href: HASH }, "Otwórz fiszki"))
    ]);
  }

  ELM.fiszki = {
    HASH: HASH, MISTAKES_ID: MISTAKES_ID, WORDS_ID: WORDS_ID, parseRoute: parseRoute, render: render, badgeCount: badgeCount, dueSummary: dueSummary,
    hasJournalCard: hasJournalCard, addFromJournal: addFromJournal, autoAddFromJournal: autoAddFromJournal,
    todayTile: todayTile, statsTile: statsTile, examTile: examTile, openFromSelection: openFromSelection,
    // dla przeglądania / edycji i integracji
    internal: { hasProfile: hasProfile, st: st, saveState: saveState, allDecks: allDecks, deckById: deckById, cardsOf: cardsOf, cardById: cardById, enabled: enabled,
      toggleDeck: toggleDeck, examChips: examChips, renderFront: renderFront, renderBack: renderBack, head: head, plural: plural, downloadText: downloadText,
      exportDeck: exportDeck, bar: bar, loadDecks: loadDecks, fmtWhen: fmtWhen }
  };
})(window.ELM);
