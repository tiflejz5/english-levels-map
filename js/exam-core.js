/*
 * exam-core.js — moduł „Egzaminy” (spec 05).
 *
 * Rejestr (dane/egzaminy-rejestr.js → ELM.EXAM_REGISTRY, z dane/egzaminy-manifest.json) jest
 * jedynym źródłem etykiet, kodów, kolorów, statusów i opisów egzaminów. Kod nie zna ich nazw.
 *
 *   status „active” + folder w nowym formacie (np. Egzamin ósmoklasisty):
 *     #/<trasa>                          przegląd (strona „przeglad”, z odliczaniem)
 *     #/<trasa>/<strona>                 strona z strony/*.md
 *     #/<trasa>/cwiczenia                lista zestawów (silnik zadań, js/exercise-engine.js)
 *     #/<trasa>/trening-pisanie[/<id>]   trener pisania (js/writing-trainer.js)
 *   status „soon”: #/<trasa>             strona „W trakcie pracy”
 *   „existing” (Certyfikat C1): własny, niezmieniony moduł js/c1-*.js
 *
 * Dane egzaminu (manifest, strony, trenery) ładujemy dopiero po wejściu do zakładki:
 * niezbednik/<id>-dane.js (tools/zbuduj-egzaminy.js). Dane użytkownika: ELM.profileData
 * (elm_exams_v1, per profil): data egzaminu, szkice pisania, odhaczone listy.
 *
 * Ramki „Na egzaminie …” na stronach tematów: osobna ramka dla każdego egzaminu z powiązaniem,
 * w kolejności z rejestru (C1 rysuje swój moduł — bez zmian).
 * Klimat wizualny: html[data-section="<id egzaminu>"] (tokeny w css/style.css).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const HIDDEN_SECTIONS = ["Odpowiedzi", "Przykładowe odpowiedzi"];

  function reg() { return ELM.EXAM_REGISTRY || { exams: [], links: {}, sets: {} }; }
  function exams() { return reg().exams; }
  function byId(id) { return exams().find(function (e) { return e.id === id; }) || null; }
  function pd() { return ELM.profileData; }
  function plural(n, one, few, many) { return ELM.c1 ? ELM.c1.plural(n, one, few, many) : many; }
  /** Egzamin obsługiwany przez ten moduł (nie istniejący C1). */
  function isGeneric(e) { return e && !e.existing; }
  function base(e) { return "#" + e.route; }
  function data(e) { return (ELM.EXAMS && ELM.EXAMS[e.id]) || null; }

  function load(e) {
    if (data(e)) return Promise.resolve(data(e));
    const src = (ELM.exercises ? ELM.exercises.asset("niezbednik/" + e.id + "-dane.js") : "niezbednik/" + e.id + "-dane.js");
    return ELM.loadScript(src).then(function () { return data(e); }, function (err) { console.warn(err.message + " — uruchom: npm run build"); return null; });
  }

  // =====================================================================
  // ADRESY
  // =====================================================================

  function parseRoute(hash) {
    const list = exams().filter(isGeneric);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const m = new RegExp("^#" + e.route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:/(.*))?$").exec(hash || "");
      if (!m) continue;
      const parts = (m[1] || "").replace(/\/+$/, "").split("/").filter(Boolean);
      if (e.status !== "active") return { examId: e.id, kind: "soon" };
      if (!parts.length) return { examId: e.id, kind: "page", id: "przeglad" };
      if (parts[0] === "cwiczenia") return parts[1] ? { examId: e.id, kind: "set", id: parts[1] } : { examId: e.id, kind: "exercises" };
      if (parts[0] === "trening-pisanie") return { examId: e.id, kind: "writing", task: parts[1] || null };
      return { examId: e.id, kind: "page", id: parts[0] };
    }
    return null;
  }

  function hrefPage(e, id) { return id === "przeglad" ? base(e) : base(e) + "/" + id; }

  // =====================================================================
  // MANIFEST
  // =====================================================================

  function sections(e) { const d = data(e); return d ? d.manifest.sections : []; }

  function findPage(e, id) {
    for (const s of sections(e)) {
      const p = (s.pages || []).find(function (x) { return x.id === id; });
      if (p) return { page: p, section: s };
    }
    return null;
  }

  function trainerSection(e) {
    return sections(e).find(function (s) { return s.trainer && s.trainer.id === "trening-pisanie"; }) || null;
  }

  function sectionIdOf(e, route) {
    if (!route) return null;
    if (route.kind === "page") { const f = findPage(e, route.id); return f ? f.section.id : null; }
    if (route.kind === "exercises" || route.kind === "set") { const s = sections(e).find(function (x) { return x.exerciseGroups; }); return s ? s.id : null; }
    if (route.kind === "writing") { const s = trainerSection(e); return s ? s.id : null; }
    return null;
  }

  // =====================================================================
  // ODLICZANIE (per profil; podpowiedź daty z rejestru tylko jako wskazówka)
  // =====================================================================

  function examDate(e) { return pd() ? pd().examData(e.id).examDate : ""; }

  function fmtDate(day) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || "");
    if (!m) return day;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  }

  function countdownCard(e) {
    const c1 = ELM.c1;
    const number = el("span", { class: "c1-countdown-number" });
    const text = el("span", { class: "c1-countdown-text" });
    const inputId = "exam-date-" + e.id;
    const input = el("input", {
      type: "date", id: inputId, class: "field c1-date", value: examDate(e),
      "aria-describedby": e.suggestedDate ? inputId + "-hint" : null,
      onchange: function () { save(input.value); }
    });
    function save(value) {
      pd().examData(e.id).examDate = value || "";
      pd().saveExams();
      input.value = value || "";
      update();
      renderNav();
    }
    function update() {
      const d = c1.daysUntil(examDate(e));
      number.textContent = d !== null && d > 1 ? String(d) : "";
      number.hidden = !(d !== null && d > 1);
      text.textContent = d !== null && d > 1 ? plural(d, "dzień do egzaminu", "dni do egzaminu", "dni do egzaminu") : c1.countdownText(examDate(e));
      const mh = document.querySelector(".exam-masthead-count");
      if (mh) mh.replaceWith(mastheadCount(e) || el("span", { class: "exam-masthead-count" }));
    }
    update();
    return el("section", { class: "card c1-countdown exam-countdown", "aria-label": "Odliczanie do egzaminu" }, [
      el("div", { class: "c1-countdown-main", "aria-live": "polite" }, [number, text]),
      el("div", { class: "c1-countdown-date" }, [
        el("label", { class: "field-label", for: inputId, text: "Data egzaminu" }),
        input,
        e.suggestedDate ? el("p", { class: "exam-date-hint", id: inputId + "-hint" }, [
          "Termin główny wg CKE (stan na październik 2026): " + fmtDate(e.suggestedDate) + ". ",
          examDate(e) !== e.suggestedDate ? el("button", { type: "button", class: "btn btn-ghost btn-small", onclick: function () { save(e.suggestedDate); } }, "Wstaw ten termin") : null
        ]) : null
      ])
    ]);
  }

  function mastheadCount(e) {
    const d = ELM.c1.daysUntil(examDate(e));
    if (d === null) return el("a", { class: "c1-masthead-note exam-masthead-count", href: base(e) }, "Ustaw datę egzaminu");
    if (d <= 0) return el("p", { class: "c1-masthead-note exam-masthead-count", text: ELM.c1.countdownText(examDate(e)) });
    return el("a", { class: "c1-masthead-count exam-masthead-count", href: base(e) }, [
      el("span", { class: "c1-masthead-days num", text: String(d) }), " ",
      el("span", { class: "c1-masthead-unit", text: plural(d, "dzień", "dni", "dni") + " do egzaminu" })
    ]);
  }

  function masthead(e, withCount) {
    return el("header", { class: "c1-masthead exam-masthead" }, [
      el("a", { class: "c1-wordmark exam-wordmark", href: base(e) }, [
        el("span", { class: "exam-wordmark-badge", "aria-hidden": "true", text: e.code }),
        el("span", { class: "c1-wordmark-main", text: e.label }),
        el("span", { class: "visually-hidden", text: " – przegląd egzaminu" })
      ]),
      withCount ? mastheadCount(e) : null
    ]);
  }

  // =====================================================================
  // STRONY
  // =====================================================================

  function crumb(e, text) {
    return el("p", { class: "c1-crumb" }, [el("a", { href: base(e), text: e.label }), text ? " · " + text : null]);
  }

  function notFound(e, message) {
    return el("div", { class: "empty-state" }, [
      el("p", { class: "empty-state-text", text: message || "Nie znaleziono takiej strony w zakładce „" + e.label + "”." }),
      el("a", { class: "btn btn-secondary", href: base(e) }, "Przejdź do przeglądu egzaminu")
    ]);
  }

  function wireTasks(e, article, pageId) {
    const boxes = article.querySelectorAll("input.md-task");
    if (!boxes.length) return;
    const tasks = pd().examData(e.id).tasks;
    const saved = tasks[pageId] || {};
    boxes.forEach(function (box, i) {
      if (Object.prototype.hasOwnProperty.call(saved, i)) box.checked = saved[i] === true;
      box.addEventListener("change", function () {
        tasks[pageId] = tasks[pageId] || {};
        tasks[pageId][i] = box.checked;
        pd().saveExams();
      });
    });
    article.appendChild(el("p", { class: "c1-tasks-reset" }, el("button", {
      type: "button", class: "btn btn-ghost btn-small",
      onclick: function () { boxes.forEach(function (b) { b.checked = false; }); delete tasks[pageId]; pd().saveExams(); }
    }, "Odznacz wszystko na tej stronie")));
  }

  function pageNav(e, pageId) {
    const all = [];
    sections(e).forEach(function (s) { (s.pages || []).forEach(function (p) { all.push(p); }); });
    const i = all.findIndex(function (p) { return p.id === pageId; });
    const prev = all[i - 1], next = all[i + 1];
    if (!prev && !next) return null;
    return el("nav", { class: "c1-pager", "aria-label": "Sąsiednie strony" }, [
      prev ? el("a", { class: "btn btn-secondary", href: hrefPage(e, prev.id) }, ELM.ui.withIcon("arrow-left", prev.label)) : el("span"),
      next ? el("a", { class: "btn btn-secondary", href: hrefPage(e, next.id) }, [next.label, ELM.icon("arrow-right", { size: 18 })]) : null
    ]);
  }

  /** Źródła (linki z manifestu) — na stronie przeglądu, pod notą o aktualności danych. */
  function sourcesNote(e) {
    const links = (data(e).manifest.links || []).filter(function (l) { return /^https:\/\//.test(l.url); });
    return el("aside", { class: "callout callout-trap exam-facts-note", "aria-label": "Aktualność informacji" }, [
      el("p", { class: "callout-title" }, [el("span", { class: "callout-icon", "aria-hidden": "true" }, ELM.icon("info", { size: 20 })), "Stan na październik 2026"]),
      el("p", null, ["Format, punktacja i terminy pochodzą z informatora i komunikatów CKE. Przed egzaminem sprawdź aktualny komunikat CKE" +
        (links.length ? ": " : "."), links.length ? links.map(function (l, i) {
        return [i ? ", " : "", el("a", { href: l.url, target: "_blank", rel: "noopener noreferrer" }, [l.label, el("span", { class: "visually-hidden", text: " (otwiera się w nowej karcie)" })])];
      }) : null])
    ]);
  }

  // Linki [[id]] w stronach egzaminu: najpierw dotychczasowe (zestawy C1, tematy), potem strony bieżącego egzaminu
  let wikiExam = null;
  const prevResolve = ELM.markdown.resolveWiki;
  ELM.markdown.resolveWiki = function (id) {
    const r = prevResolve ? prevResolve(id) : null;
    if (r || !wikiExam) return r;
    const f = findPage(wikiExam, id);
    return f ? { href: hrefPage(wikiExam, id), text: f.page.label, kind: "exam" } : null;
  };

  function renderPage(view, e, id) {
    const found = findPage(e, id);
    const text = found && data(e).pages[id];
    if (!text) { view.appendChild(notFound(e)); return null; }
    const doc = ELM.markdown.parse(text);
    wikiExam = e;
    view.appendChild(el("div", { class: "c1-page-tools" }, [
      crumb(e, found.section.label),
      ELM.notes ? ELM.notes.button(e.code.toLowerCase() + ":" + id, { title: e.code + " · " + (doc.meta.title || found.page.label), route: location.hash }) : null
    ]));
    const article = el("article", { class: "md c1-page exam-page" }, ELM.markdown.render(doc.blocks, { hiddenSections: HIDDEN_SECTIONS }));
    wikiExam = null; // kontekst linków [[id]] tylko na czas rysowania strony egzaminu
    if (id === "przeglad") {
      // Nota o aktualności (stan na październik 2026 + link do CKE) — chyba że treść strony już ją ma
      const hasNote = /Stan na październik 2026/i.test(text);
      ELM.c1.insertAfterIntro(article, el("div", { class: "exam-overview-top" }, [countdownCard(e), hasNote ? null : sourcesNote(e)]));
    }
    wireTasks(e, article, id);
    if (ELM.callouts) ELM.callouts.apply(article);
    view.appendChild(article);
    const nav = pageNav(e, id);
    if (nav) view.appendChild(nav);
    return doc.meta.title || found.page.label;
  }

  /** Zestawy egzaminu w grupach z manifestu (karty silnika zadań: wynik, liczba zadań, „Zacznij”). */
  function renderExercises(view, e) {
    const section = sections(e).find(function (s) { return s.exerciseGroups; });
    if (!section) { view.appendChild(notFound(e)); return null; }
    view.appendChild(crumb(e, section.label));
    view.appendChild(el("h1", { class: "c1-title", text: section.label }));
    view.appendChild(el("p", { class: "c1-lead", text: "Zestawy w formacie zadań egzaminacyjnych. Wynik i błędy zapisują się w Twoim profilu, a błędy trafiają do Dziennika błędów." }));
    const box = el("div", { class: "exam-groups" }, el("p", { class: "tool-note", text: "Wczytuję zestawy…" }));
    view.appendChild(box);
    ELM.exercises.loadIndex().then(function (index) {
      box.replaceChildren();
      section.exerciseGroups.forEach(function (g) {
        const cards = g.sets.map(function (s) {
          // Format C1 (cloze, słowotwórstwo): karta z wynikiem z elm_exercises_v1, zestaw w zakładce egzaminu
          if (data(e).exercises && data(e).exercises[s.id]) return c1SetCard(e, s, data(e).exercises[s.id]);
          return index.sets[s.id];
        }).filter(Boolean).map(function (meta) {
          if (meta.nodeType) return meta;
          const card = ELM.exercises.setCard(meta);
          if (meta.listening) card.insertBefore(el("p", { class: "exam-tts-note" }, [ELM.icon("volume-2", { size: 14 }), " Głos syntezowany w przeglądarce"]), card.children[1]);
          if (meta.hasPassage) card.insertBefore(el("p", { class: "exam-tts-note" }, [ELM.icon("file-text", { size: 14 }), " Tekst do przeczytania"]), card.children[1]);
          return card;
        });
        box.appendChild(el("section", { class: "exam-group", "aria-label": g.label }, [
          el("h2", { class: "c1-group-title", text: g.label }),
          cards.length ? el("div", { class: "ex-set-grid" }, cards) : el("p", { class: "tool-note", text: "Zestawy do tej części jeszcze powstają." })
        ]));
      });
    });
    return section.label;
  }

  /** Karta zestawu w formacie C1 (jak karty silnika zadań). */
  function c1SetCard(e, s, ex) {
    const score = pd() ? pd().setScore(s.id) : null;
    const max = ex.maxScore || s.maxScore;
    return el("article", { class: "card ex-set-card" }, [
      el("h3", { class: "ex-set-title", text: ex.title || s.label }),
      el("p", { class: "ex-set-meta", text: max + " " + plural(max, "luka", "luki", "luk") + " · " + (C1_FORMAT_LABEL[ex.type] || "zadanie z lukami") }),
      el("p", { class: "ex-set-score" + (score ? "" : " is-empty") }, score
        ? [el("span", null, ["Najlepszy: ", el("strong", { class: "num", text: score.best.score + "/" + score.best.total })]), el("span", null, ["Ostatni: ", el("span", { class: "num", text: score.last.score + "/" + score.last.total })])]
        : "Jeszcze nie rozwiązany"),
      el("a", { class: "btn btn-primary btn-small", href: base(e) + "/cwiczenia/" + s.id, "aria-label": (score ? "Zacznij ponownie: " : "Zacznij: ") + (ex.title || s.label) }, ELM.ui.withIcon("play", score ? "Zacznij ponownie" : "Zacznij"))
    ]);
  }

  const C1_FORMAT_LABEL = { "multiple-choice-cloze": "wybór słowa w tekście", "word-formation": "słowotwórstwo", "open-cloze": "luki otwarte", "transformation": "transformacje" };

  /** Zestaw w formacie C1 w zakładce egzaminu: komponent C1, wynik w elm_exercises_v1. */
  function renderC1Set(view, e, id) {
    let found = null;
    sections(e).forEach(function (s) { (s.exerciseGroups || []).forEach(function (g) { g.sets.forEach(function (x) { if (x.id === id) found = { set: x, group: g }; }); }); });
    const ex = data(e).exercises && data(e).exercises[id];
    if (!found || !ex) { view.appendChild(notFound(e, "Nie znaleziono takiego zestawu ćwiczeń.")); return null; }
    return ELM.c1Exercises.renderWith(view, {
      ex: ex,
      found: found,
      crumb: function (label) { return crumb(e, label); },
      notFound: function (msg) { return notFound(e, msg); },
      bestScore: function () { const s = pd().setScore(id); return s ? s.best.score : null; },
      recordScore: function (score, max) { const r = pd().saveSetScore(id, score, max); return !!r && (r.improved || r.best === r.last && r.recent.length === 1); },
      listHref: base(e) + "/cwiczenia",
      hrefSet: function (sid) { return base(e) + "/cwiczenia/" + sid; },
      refPrefix: e.code.toLowerCase() + ":" + id,
      category: "Gramatyka",
      afterScore: function () { renderNav(); }
    });
  }

  // ---------- Trener pisania (wspólny silnik, konfiguracja egzaminu) ----------

  const trainers = {};
  const NUMBER_WORDS = { 2: "dwa", 3: "trzy", 4: "cztery", 5: "pięć" };
  const GENRES = { email: "e-mail", blog: "wpis na blogu", forum: "wpis na forum", letter: "list", article: "artykuł", essay: "rozprawka" };
  // Egzaminy, dla których zasady liczenia wyrazów są potwierdzone w informatorze (inne: „liczenie orientacyjne”)
  const COUNTING_CONFIRMED = ["egzamin-osmoklasisty"];
  // Zasady oceny z informatora (spec 05, 5.1) — tylko tam, gdzie są potwierdzone
  const RUBRIC_NOTES = { "egzamin-osmoklasisty": ["0 pkt za treść oznacza 0 pkt za całą wypowiedź; 1 pkt za treść – pozostałe kryteria najwyżej po 1 pkt."] };

  function writingTrainer(e) {
    if (trainers[e.id]) return trainers[e.id];
    const L = ELM.examLogic;
    const href = function (taskId) { return base(e) + "/trening-pisanie" + (taskId ? "/" + taskId : ""); };
    const wordsLabel = function (n) { return n + " " + plural(n, "wyraz", "wyrazy", "wyrazów"); };
    trainers[e.id] = ELM.writingTrainer.create({
      trainer: function () { return data(e) && data(e).trainers["trening-pisanie"]; },
      section: function () { return trainerSection(e); },
      crumb: function (label) { return crumb(e, label); },
      notFound: function (msg) { return notFound(e, msg); },
      href: href,
      drafts: function () { return pd().examData(e.id).drafts; },
      save: function () { pd().saveExams(); },
      countWords: function (text, task) { return L.countWordsE8(text, task && task.opening); },
      wordsLabel: wordsLabel,
      counter: function (n, T) {
        const z = L.writingZone(n, T);
        const hint = {
          low: " · Poniżej " + T.warnBelow + " wyrazów ocenia się tylko treść",
          warn: " · jeszcze trochę – limit to " + T.wordRange[0] + "–" + T.wordRange[1],
          ok: " · w limicie " + T.wordRange[0] + "–" + T.wordRange[1],
          over: " · Przekraczasz limit (" + T.wordRange[1] + ")"
        }[z];
        return { cls: { low: "is-low", warn: "is-warn", ok: "is-ok", over: "is-over" }[z], hint: hint };
      },
      listTitle: "Trener pisania",
      listLead: function (T) {
        // Formy i liczba podpunktów z zadań w pisanie.json (np. E8: 3, matura podstawowa: 4)
        const genres = [];
        T.tasks.forEach(function (t) { const g = GENRES[t.genre] || t.genre; if (genres.indexOf(g) === -1) genres.push(g); });
        const bullets = Math.max.apply(null, T.tasks.map(function (t) { return (t.bullets || []).length; }));
        const forms = genres.length > 1 ? genres.slice(0, -1).join(", ") + " albo " + genres[genres.length - 1] : genres[0];
        return forms.charAt(0).toUpperCase() + forms.slice(1) + ", jak na egzaminie: " + T.wordRange[0] + "–" + T.wordRange[1] + " wyrazów (bez podanego początku), " +
          T.timeMinutes + " minut, " + (NUMBER_WORDS[bullets] || bullets) + " " + plural(bullets, "podpunkt", "podpunkty", "podpunktów") + " do omówienia. " +
          (COUNTING_CONFIRMED.indexOf(e.id) !== -1 ? "Licznik liczy wyrazy według zasad CKE" : "Licznik liczy wyrazy orientacyjnie") + ", a szkic zapisuje się sam w Twoim profilu.";
      },
      chips: function (task, T, inList) {
        const g = GENRES[task.genre] || task.genre;
        const out = [g.charAt(0).toUpperCase() + g.slice(1), task.points ? task.points + " pkt" : null];
        if (!inList) out.push(T.wordRange[0] + "–" + T.wordRange[1] + " wyrazów");
        return out.filter(Boolean);
      },
      genreTitle: function () { return "Forma wypowiedzi"; },
      genrePage: function () { const f = findPage(e, "wypowiedz-pisemna"); return f ? { href: hrefPage(e, "wypowiedz-pisemna"), label: f.page.label } : null; },
      timerKey: function (task) { return e.id + ":writing:" + task.id; },
      timerNote: "Zostaw 2–3 minuty na sprawdzenie pisowni – edytor jej nie podkreśla, tak jak arkusz." +
        (COUNTING_CONFIRMED.indexOf(e.id) === -1 ? " Licznik wyrazów jest orientacyjny (zasady jak na egzaminie ósmoklasisty)." : ""),
      rubricNotes: RUBRIC_NOTES[e.id] || [],
      examExtras: true
    });
    return trainers[e.id];
  }

  // =====================================================================
  // STRONA „W TRAKCIE PRACY”
  // =====================================================================

  function soonIllustration() {
    const NS = "http://www.w3.org/2000/svg";
    const s = function (tag, attrs) { const n = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; };
    const svg = s("svg", { viewBox: "0 0 160 160", class: "soon-art", "aria-hidden": "true", focusable: "false" });
    // Kompas na rusztowaniu: okrąg, igła, cztery belki
    [["20", "140", "140", "140"], ["32", "140", "32", "60"], ["128", "140", "128", "60"], ["32", "100", "128", "100"]].forEach(function (l) {
      svg.appendChild(s("line", { x1: l[0], y1: l[1], x2: l[2], y2: l[3], class: "soon-beam" }));
    });
    svg.appendChild(s("circle", { cx: "80", cy: "62", r: "38", class: "soon-ring" }));
    svg.appendChild(s("path", { d: "M80 32 L90 62 L80 92 L70 62 Z", class: "soon-needle" }));
    svg.appendChild(s("circle", { cx: "80", cy: "62", r: "4", class: "soon-dot" }));
    return svg;
  }

  function renderSoon(view, e) {
    const active = exams().find(function (x) { return x.status === "active" && isGeneric(x); });
    view.appendChild(el("section", { class: "card soon-card", "aria-labelledby": "soon-title" }, [
      soonIllustration(),
      el("div", { class: "soon-body" }, [
        el("p", { class: "soon-badge" }, [ELM.icon("clock", { size: 16 }), "W trakcie pracy"]),
        el("h1", { class: "soon-title", id: "soon-title", text: e.label }),
        e.soonDescription ? el("p", { class: "soon-desc", text: e.soonDescription }) : null,
        el("p", { class: "tool-note", text: "Pracujemy nad tą zakładką. Wróć wkrótce." }),
        el("div", { class: "tool-actions" }, [
          el("a", { class: "btn btn-primary", href: "#/dzis" }, ELM.ui.withIcon("sunrise", "Wróć do Dziś")),
          active ? el("a", { class: "btn btn-secondary", href: base(active) }, ELM.ui.withIcon("arrow-right", "Zobacz: " + active.label)) : null
        ])
      ])
    ]));
    return e.label;
  }

  // =====================================================================
  // RYSOWANIE
  // =====================================================================

  function render(route) {
    const e = byId(route.examId);
    const view = document.getElementById("view");
    view.className = "view c1-view exam-view exam-" + e.id;
    view.dataset.file = "#exam:" + e.id + ":" + route.kind + ":" + (route.id || route.task || "");
    view.replaceChildren();
    if (route.kind === "soon") {
      const t = renderSoon(view, e);
      document.title = t + " · English Levels Map";
      return;
    }
    if (!data(e)) {
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Wczytuję zakładkę…" }));
      load(e).then(function (d) {
        if (!d) { view.replaceChildren(notFound(e, "Brak danych zakładki (niezbednik/" + e.id + "-dane.js). Uruchom: npm run build")); return; }
        const now = parseRoute(location.hash);
        if (now && now.examId === e.id) { render(now); renderNav(); }
      });
      return;
    }
    view.appendChild(masthead(e, !(route.kind === "page" && route.id === "przeglad")));
    let title = null;
    if (route.kind === "page") title = renderPage(view, e, route.id);
    else if (route.kind === "exercises") title = renderExercises(view, e);
    else if (route.kind === "set") title = renderC1Set(view, e, route.id);
    else if (route.kind === "writing") title = writingTrainer(e).render(view, route.task);
    document.title = (title ? title + " · " : "") + e.label + " · English Levels Map";
    if (title && pd()) pd().setLastPage(location.hash, e.label + " · " + title);
  }

  // =====================================================================
  // NAWIGACJA: grupa „Egzaminy” (rejestr; C1 rysuje się w #c1-nav swoim modułem)
  // =====================================================================

  const expanded = {};

  function navItem(href, label, active, badge, extraClass) {
    return el("li", null, el("a", {
      class: "c1-nav-link" + (active ? " is-active" : "") + (extraClass ? " " + extraClass : ""),
      href: href, "aria-current": active ? "page" : null
    }, [
      extraClass === "is-trainer" ? ELM.icon("pencil", { size: 16, class: "c1-nav-icon" }) : null,
      el("span", { class: "c1-nav-label", text: label }),
      badge ? el("span", { class: "c1-nav-badge", text: badge }) : null
    ]));
  }

  function renderNav() {
    const box = document.getElementById("exams-nav");
    if (!box) return;
    box.replaceChildren();
    const route = ELM.state && ELM.state.view === "exam" ? ELM.state.toolRoute : null;
    const list = el("ul", { class: "sb-list exam-list" });
    exams().filter(isGeneric).forEach(function (e) {
      const here = route && route.examId === e.id;
      const soon = e.status !== "active";
      const days = soon ? null : ELM.c1 && examDate(e) ? ELM.c1.daysUntil(examDate(e)) : null;
      const li = el("li", null, el("a", {
        class: "sb-item exam-chip" + (soon ? " is-soon" : "") + (here ? " is-active" : ""),
        href: base(e),
        style: e.accent ? "--exam-accent:" + e.accent + ";--exam-accent-2:" + (e.accent2 || e.accent) : null,
        "aria-current": here ? "page" : null,
        "aria-label": e.label + (soon ? ", wkrótce – w trakcie pracy" : "")
      }, [
        el("span", { class: "sb-icon", "aria-hidden": "true" }, el("span", { class: "exam-chip-badge", text: e.code })),
        el("span", { class: "sb-label" }, [
          el("span", { class: "sb-label-title", text: e.label }),
          soon ? el("span", { class: "sb-label-sub" }, el("span", { class: "exam-soon-tag", text: "wkrótce" }))
            : el("span", { class: "sb-label-sub", text: days !== null && days > 0 ? days + " " + plural(days, "dzień", "dni", "dni") + " do egzaminu" : (e.description || "").split(",")[0] })
        ])
      ]));
      list.appendChild(li);
      // Sekcje aktywnego egzaminu, gdy w nim jesteśmy (tylko w rozwiniętym panelu)
      if (here && data(e) && !soon) {
        const current = sectionIdOf(e, route);
        const secs = el("div", { class: "sb-c1-sections exam-sections" });
        sections(e).forEach(function (s) {
          const open = Object.prototype.hasOwnProperty.call(expanded, e.id + s.id) ? expanded[e.id + s.id] : s.id === current;
          const listId = "exam-sec-" + e.id + "-" + s.id;
          const ul = el("ul", { class: "c1-sec-list", id: listId, hidden: !open });
          (s.pages || []).forEach(function (p) { ul.appendChild(navItem(hrefPage(e, p.id), p.label, route.kind === "page" && route.id === p.id)); });
          if (s.exerciseGroups) ul.appendChild(navItem(base(e) + "/cwiczenia", "Wszystkie zestawy", route.kind === "exercises"));
          if (s.trainer) ul.appendChild(navItem(base(e) + "/trening-pisanie", s.trainer.label, route.kind === "writing", null, "is-trainer"));
          secs.appendChild(el("div", { class: "c1-sec" + (s.id === current ? " is-current" : "") }, [
            el("button", {
              type: "button", class: "c1-sec-toggle", "aria-expanded": open ? "true" : "false", "aria-controls": listId,
              onclick: function () {
                expanded[e.id + s.id] = !open;
                renderNav();
                const again = document.querySelector('[aria-controls="' + listId + '"]');
                if (again) again.focus();
              }
            }, [el("span", { class: "c1-sec-caret", "aria-hidden": "true" }, ELM.icon("chevron-right", { size: 16 })), s.label]),
            ul
          ]));
        });
        li.appendChild(secs);
      }
    });
    box.appendChild(el("p", { class: "sb-caption", id: "sb-exams-caption", text: "Egzaminy" }));
    box.appendChild(list);
  }

  // =====================================================================
  // RAMKI „NA EGZAMINIE …” NA STRONACH TEMATÓW (wiele egzaminów naraz)
  // =====================================================================

  function examBox(e, link) {
    const setsMeta = reg().sets || {};
    const items = (link.exercises || []).map(function (id) {
      const meta = setsMeta[id];
      if (!meta) { console.warn("Ramka " + e.code + ": nieznany zestaw " + id); return null; }
      const score = pd() ? pd().setScore(id) : null;
      return el("li", null, [
        el("a", { href: meta.href || "#/cwiczenia/zestaw/" + id }, [meta.group + ": " + meta.label, ELM.icon("chevron-right", { size: 16 })]),
        el("span", { class: "c1-exam-box-best", text: score ? "najlepszy wynik " + score.best.score + "/" + score.best.total : "jeszcze nie rozwiązany" })
      ]);
    }).filter(Boolean);
    const title = (reg().boxTitles && reg().boxTitles[e.id]) || "Na egzaminie: " + e.label;
    return el("aside", { class: "exam-box callout exam-box-" + e.id, style: e.accent ? "--exam-accent:" + e.accent + ";--exam-accent-2:" + (e.accent2 || e.accent) : null, "aria-label": title }, [
      el("div", { class: "c1-exam-box-head" }, [
        el("span", { class: "exam-chip-badge", "aria-hidden": "true", text: e.code }),
        el("a", { class: "c1-exam-box-title exam-box-title", href: base(e) }, title)
      ]),
      (link.examParts || []).length ? el("div", { class: "c1-chips" }, link.examParts.map(function (p) { return el("span", { class: "c1-chip", text: p }); })) : null,
      link.note ? el("p", { class: "c1-exam-box-note" }, ELM.markdown.inline(link.note)) : null,
      items.length ? el("ul", { class: "c1-exam-box-links" }, items) : null
    ]);
  }

  /** Ramki dla tematu: każdy egzamin z powiązaniem osobno, w kolejności z rejestru. */
  function examBoxesFor(itemId) {
    const out = [];
    exams().forEach(function (e) {
      if (e.status !== "active") return;
      if (e.existing) { if (e.id === "certyfikat-c1" && ELM.c1) { const b = ELM.c1.examBoxFor(itemId); if (b) out.push(b); } return; }
      const link = (reg().links[e.id] || []).find(function (l) { return l.itemId === itemId; });
      if (link) out.push(examBox(e, link));
    });
    if (!out.length) return null;
    return out.length === 1 ? out[0] : el("div", { class: "exam-boxes" }, out);
  }

  /** Dla silnika zadań: powrót z zestawu egzaminu do jego listy zestawów. */
  function setBack(examId) {
    const e = byId(examId);
    return e ? { href: base(e) + "/cwiczenia", label: "Wróć do zestawów: " + e.label } : null;
  }

  ELM.exams = {
    parseRoute: parseRoute,
    render: render,
    renderNav: renderNav,
    examBoxesFor: examBoxesFor,
    setBack: setBack,
    byId: byId,
    list: exams,
    load: load
  };
})(window.ELM);
