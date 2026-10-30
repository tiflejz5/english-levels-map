/*
 * pisanie.js — sekcja „Pisanie” (paczka v6, spec 17, sekcja 1): wzorcowe wypracowania z komentarzami.
 *
 *   #/pisanie                              lista wzorców pogrupowana po egzaminie i gatunku
 *   #/pisanie/wzorce/<egzamin>/<id>        wzorzec z komentarzami (widok: js/pisanie-wzorzec.js)
 *
 * Dane: zadania z polem modelNotes w niezbednik/<egzamin>/trening/pisanie.json (ELM.EXAMS[id].trainers
 * dla egzaminów z rejestru, ELM.C1.trainers dla Certyfikatu C1). Tekstów `model` nie zmieniamy — komentarze
 * wskazują dokładne fragmenty (kotwice).
 *
 *   ELM.pisanie.parseRoute(hash), render(), examList() → Promise z [{ exam, T, tasks }]
 *   ELM.pisanie.hrefModel(examId, taskId), ELM.pisanie.pageSection(examId) — sekcja z linkami na stronach „Writing”
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const HASH = "#/pisanie";

  const GENRES = { essay: "Rozprawka / essay", email: "E-mail", letter: "List", blog: "Wpis na blogu", forum: "Wpis na forum",
    article: "Artykuł", review: "Recenzja", report: "Raport", proposal: "Propozycja", story: "Opowiadanie" };

  const TYPES = {
    punkty: { label: "Realizacja polecenia", icon: "check", help: "Który element polecenia realizuje fragment." },
    lacznik: { label: "Łącznik", icon: "arrow-right", help: "Spójnik, wyrażenie spójności, przejście między akapitami." },
    rejestr: { label: "Rejestr", icon: "user-round", help: "Formalność i ton – czego unikać w tym gatunku." },
    struktura: { label: "Kompozycja", icon: "layout-grid", help: "Rola akapitu, wstęp, zakończenie, zdanie tematyczne." },
    zakres: { label: "Zakres językowy", icon: "sparkles", help: "Struktura lub słownictwo, które podnosi ocenę." },
    uwaga: { label: "Do poprawy", icon: "triangle-alert", help: "Co można by zrobić lepiej." }
  };
  const TYPE_ORDER = ["punkty", "lacznik", "rejestr", "struktura", "zakres", "uwaga"];

  function reg() { return ELM.EXAM_REGISTRY || { exams: [] }; }
  function plural(n, one, few, many) { return ELM.c1 ? ELM.c1.plural(n, one, few, many) : many; }
  function genreLabel(g) { return GENRES[g] || g; }
  function hrefModel(examId, taskId) { return HASH + "/wzorce/" + examId + "/" + taskId; }

  /** Liczba słów wzorca tak, jak liczy trener danego egzaminu (E8 i matury: bez podanego początku). */
  function wordCount(examId, task) {
    const text = String(task.model || "");
    if (!/^certyfikat-/.test(examId) && ELM.examLogic && ELM.examLogic.countWordsE8) return ELM.examLogic.countWordsE8(text, task.opening);
    const t = text.trim();
    return t ? t.split(/\s+/).length : 0;
  }

  // =====================================================================
  // DANE
  // =====================================================================

  let cache = null;

  /** Egzaminy z trenerem pisania i zadaniami z modelNotes: [{ exam, T, tasks }] w kolejności rejestru. */
  function examList() {
    if (cache) return Promise.resolve(cache);
    const list = reg().exams.filter(function (e) { return e.status === "active"; });
    return Promise.all(list.map(function (e) {
      const load = e.existing
        ? Promise.resolve(ELM.C1 && ELM.C1.trainers && ELM.C1.trainers["trening-pisanie"])
        : (ELM.exams ? ELM.exams.load(e).then(function (d) { return d && d.trainers && d.trainers["trening-pisanie"]; }) : Promise.resolve(null));
      return load.then(function (T) {
        const tasks = T && T.tasks ? T.tasks.filter(function (t) { return t.model && t.modelNotes; }) : [];
        return tasks.length ? { exam: e, T: T, tasks: tasks } : null;
      });
    })).then(function (rows) {
      cache = rows.filter(Boolean);
      return cache;
    });
  }

  /** Chip egzaminu: skrót + pełna nazwa dla czytników; kolor z rejestru jako dodatek. */
  function examChip(e) {
    const accent = e.accent || "var(--c1-gold)";
    return el("span", { class: "chip wz-exam", style: "--exam: " + accent }, [
      el("span", { "aria-hidden": "true", text: e.code }),
      el("span", { class: "visually-hidden", text: e.label })
    ]);
  }

  // =====================================================================
  // ADRESY
  // =====================================================================

  function parseRoute(hash) {
    const m = /^#\/pisanie(?:\/(.*))?$/.exec(hash || "");
    if (!m) return null;
    const p = (m[1] || "").replace(/\/+$/, "").split("/").filter(Boolean).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } });
    if (p[0] === "wzorce" && p[1] && p[2]) return { kind: "model", exam: p[1], task: p[2] };
    if (p[0] === "zwroty") return { kind: "phrases", group: p[1] || "" };
    return { kind: "list" };
  }

  // =====================================================================
  // LISTA WZORCÓW
  // =====================================================================

  function head(title, lead) {
    return el("header", { class: "tool-head" }, [
      el("h1", { class: "tool-title" }, [el("span", { class: "lab-head-icon", "aria-hidden": "true" }, ELM.icon("pencil", { size: 28 })), title]),
      lead ? el("p", { class: "tool-lead", text: lead }) : null
    ]);
  }

  function noteCount(task) { return ((task.modelNotes && task.modelNotes.annotations) || []).length; }

  function card(row, task) {
    const n = noteCount(task);
    const words = wordCount(row.exam.id, task);
    return el("li", { class: "card wz-card" }, [
      el("a", { class: "wz-card-link", href: hrefModel(row.exam.id, task.id) }, [
        el("span", { class: "wz-card-title", text: task.title || task.id }),
        el("span", { class: "wz-card-meta" }, [
          el("span", { class: "chip", text: genreLabel(task.genre) }),
          el("span", { class: "tool-note", text: words + " " + plural(words, "słowo", "słowa", "słów") + " · " + n + " " + plural(n, "komentarz", "komentarze", "komentarzy") })
        ])
      ])
    ]);
  }

  function renderList(view) {
    view.appendChild(head("Pisanie – wzorcowe wypracowania", "Teksty modelowe z komentarzami na marginesie: co realizuje polecenie, jak działają łączniki i rejestr, co podnosi zakres językowy i co można zrobić lepiej."));
    view.appendChild(el("p", { class: "card wz-phrases-link" }, [
      el("a", { href: HASH + "/zwroty", class: "wz-card-title", text: "Bank zwrotów do pisania" }),
      el("span", { class: "tool-note", text: " – zwroty według funkcji (opinia, kontrargument, prośby…), z filtrem poziomu, rejestru i gatunku." })
    ]));
    const body = el("div", { class: "wz-list", "aria-live": "polite" }, el("p", { class: "tool-note", role: "status", text: "Wczytuję wzorce…" }));
    view.appendChild(body);
    examList().then(function (rows) {
      if (!view.contains(body)) return;
      body.replaceChildren();
      if (!rows.length) { body.appendChild(el("p", { class: "tool-note", text: "Nie ma jeszcze wzorców z komentarzami." })); return; }
      body.appendChild(el("nav", { class: "chip-filter wz-jump", "aria-label": "Egzaminy" }, rows.map(function (r) {
        return el("a", { class: "chip-btn", href: "#wz-" + r.exam.id, onclick: function (ev) { ev.preventDefault(); const t = document.getElementById("wz-" + r.exam.id); if (t) t.scrollIntoView({ block: "start" }); } }, r.exam.code);
      })));
      rows.forEach(function (r) {
        const genres = [];
        r.tasks.forEach(function (t) { if (genres.indexOf(t.genre) === -1) genres.push(t.genre); });
        body.appendChild(el("section", { class: "wz-exam-block", "aria-labelledby": "wz-" + r.exam.id }, [
          el("h2", { class: "section-title wz-exam-title", id: "wz-" + r.exam.id }, [examChip(r.exam), " " + r.exam.label]),
          genres.map(function (g) {
            return el("div", { class: "wz-genre" }, [
              el("h3", { class: "wz-genre-title", text: genreLabel(g) }),
              el("ul", { class: "wz-card-list" }, r.tasks.filter(function (t) { return t.genre === g; }).map(function (t) { return card(r, t); }))
            ]);
          })
        ]));
      });
    });
  }

  // =====================================================================
  // STRONA „WRITING” EGZAMINU: sekcja „Wzorce z komentarzami” (bez edycji .md)
  // =====================================================================

  /** Sekcja z linkami do wzorców danego egzaminu (albo null, gdy nie ma wzorców z komentarzami). Wypełnia się po wczytaniu danych. */
  function pageSection(examId) {
    const box = el("section", { class: "card wz-page-section", "aria-labelledby": "wz-ps-" + examId, hidden: true });
    examList().then(function (rows) {
      const r = rows.find(function (x) { return x.exam.id === examId; });
      if (!r) return;
      box.appendChild(el("h2", { class: "section-title", id: "wz-ps-" + examId, text: "Wzorce z komentarzami" }));
      box.appendChild(el("p", { class: "tool-note", text: "Teksty modelowe z komentarzami na marginesie – zobacz, co w nich działa i co można poprawić." }));
      box.appendChild(el("ul", { class: "wz-ps-list" }, r.tasks.map(function (t) {
        return el("li", null, [el("a", { href: hrefModel(r.exam.id, t.id), text: t.title || t.id }), el("span", { class: "tool-note", text: " · " + genreLabel(t.genre) })]);
      })));
      box.appendChild(el("p", null, el("a", { class: "btn btn-secondary btn-small", href: HASH }, "Wszystkie wzorce")));
      box.hidden = false;
    });
    return box;
  }

  // =====================================================================
  // WIDOK
  // =====================================================================

  function render() {
    const view = document.getElementById("view");
    const route = parseRoute(location.hash) || { kind: "list" };
    view.className = "view tool-view pisanie-view";
    view.dataset.file = HASH;
    view.replaceChildren();
    const lazy = route.kind === "model" ? ["pisanieWzorzec", "js/pisanie-wzorzec.js"] : route.kind === "phrases" ? ["pisanieZwroty", "js/pisanie-zwroty.js"] : null;
    if (lazy) {
      // Moduły widoków wczytują się dopiero po wejściu (mniej skryptów na starcie)
      const draw = function () { ELM[lazy[0]].render(view, route); };
      if (ELM[lazy[0]]) { draw(); return; }
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Wczytuję…" }));
      ELM.loadModule(lazy[1]).then(function () {
        if (view.isConnected && ELM.state.view === "pisanie" && !view.querySelector(".tool-head")) { view.replaceChildren(); draw(); }
      }, function (err) { console.warn(err.message); view.replaceChildren(el("p", { class: "tool-note", text: "Nie udało się wczytać widoku. Odśwież stronę." })); });
      return;
    }
    document.title = "Pisanie · English Levels Map";
    renderList(view);
  }

  ELM.pisanie = {
    HASH: HASH, TYPES: TYPES, TYPE_ORDER: TYPE_ORDER, GENRES: GENRES,
    parseRoute: parseRoute, render: render, examList: examList, examChip: examChip, head: head,
    hrefModel: hrefModel, pageSection: pageSection, wordCount: wordCount, genreLabel: genreLabel, plural: plural
  };
})(window.ELM);
