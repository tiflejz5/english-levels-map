/*
 * c1-speaking.js — trener Speaking (trening/speaking.json).
 *
 * Part 2: dwa pytania na górze, trzy opisy zdjęć (kafelki z tekstem),
 *         timer 60 s, potem pytanie do partnera z timerem 30 s.
 * Part 3: pytanie w środku i 5 haseł wokół (jak w arkuszu), timer 120 s,
 *         decyzja z timerem 60 s, pod spodem pytania Part 4 (timer 5 min).
 * „Nagraj się”: wspólny moduł js/recorder.js (do 3 prób, odtwarzanie i pobieranie tylko lokalnie — nic nie jest wysyłane).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const ui = { part: "2", index: { "2": 0, "3": 0 } }; // wybór zapamiętany do końca wizyty

  function c1() { return ELM.c1; }

  // =====================================================================
  // PART 2
  // =====================================================================

  function renderPart2(task, timers) {
    return el("div", { class: "c1-speak" }, [
      el("section", { class: "card c1-sp-questions", "aria-label": "Pytania" }, [
        el("p", { class: "c1-sp-label", text: "Pytania na karcie" }),
        el("ul", null, task.questions.map(function (q) { return el("li", { text: q }); }))
      ]),
      el("div", { class: "c1-pictures" }, task.pictures.map(function (p, i) {
        return el("figure", { class: "c1-picture" }, [
          el("span", { class: "c1-picture-label", text: "Zdjęcie " + "ABC".charAt(i) }),
          el("figcaption", { text: p })
        ]);
      })),
      el("p", { class: "c1-sp-tip", text: "Wybierz dwa zdjęcia i porównaj je, odpowiadając na oba pytania. Masz około minuty." }),
      c1().timer({ key: "sp2:" + task.id + ":long", seconds: timers.part2LongTurn, label: "Twoja wypowiedź" }),
      el("section", { class: "card c1-sp-partner", "aria-label": "Pytanie do partnera" }, [
        el("p", { class: "c1-sp-label", text: "Potem pytanie do partnera (ok. 30 s)" }),
        el("p", { class: "c1-sp-question", text: task.partnerQuestion }),
        c1().timer({ key: "sp2:" + task.id + ":partner", seconds: timers.part2Partner, label: "Odpowiedź" })
      ])
    ]);
  }

  // =====================================================================
  // PART 3 + PART 4
  // =====================================================================

  function renderPart3(task, timers) {
    return el("div", { class: "c1-speak" }, [
      el("div", { class: "c1-mindmap", role: "group", "aria-label": "Arkusz Part 3" }, [
        el("div", { class: "c1-mindmap-center", text: task.question })
      ].concat(task.prompts.map(function (p, i) {
        return el("div", { class: "c1-mindmap-prompt c1-mm-" + (i + 1), text: p });
      }))),
      c1().timer({ key: "sp3:" + task.id + ":discussion", seconds: timers.part3Discussion, label: "Dyskusja w parze" }),
      el("section", { class: "card c1-sp-partner", "aria-label": "Decyzja" }, [
        el("p", { class: "c1-sp-label", text: "Potem decyzja (ok. 1 min)" }),
        el("p", { class: "c1-sp-question", text: task.decision }),
        c1().timer({ key: "sp3:" + task.id + ":decision", seconds: timers.part3Decision, label: "Decyzja" })
      ]),
      el("section", { class: "card c1-sp-part4", "aria-label": "Part 4" }, [
        el("h2", { class: "section-title", text: "Part 4 – pytania do dyskusji" }),
        el("ol", { class: "c1-sp-list" }, (task.part4 || []).map(function (q) { return el("li", { text: q }); })),
        c1().timer({ key: "sp4:" + task.id, seconds: timers.part4, label: "Part 4 (opcjonalnie)" })
      ])
    ]);
  }

  // =====================================================================
  // STRONA TRENERA
  // =====================================================================

  function render(view) {
    if (!ELM.recorder) {
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Wczytuję trener…" }));
      ELM.loadModule("js/recorder.js").then(function () { if (view.isConnected) c1().render(ELM.state.c1Route); }, function (err) { console.warn(err.message); });
      return "Trening Speaking";
    }
    const S = ELM.C1 && ELM.C1.trainers["trening-speaking"];
    const found = c1().findTrainer("trening-speaking");
    if (!S || !found) { view.appendChild(c1().notFound("Brak danych trenera Speaking.")); return null; }

    const list = ui.part === "2" ? S.part2 : S.part3;
    const index = Math.min(ui.index[ui.part], list.length - 1);
    const task = list[index];

    function go(part, idx) {
      ui.part = part;
      ui.index[part] = (idx + (part === "2" ? S.part2 : S.part3).length) % (part === "2" ? S.part2 : S.part3).length;
      c1().render(ELM.state.c1Route);
    }

    view.appendChild(c1().crumb(found.section.label));
    view.appendChild(el("h1", { class: "c1-title", text: "Trening Speaking" }));
    view.appendChild(el("p", { class: "c1-lead", text: "Ćwicz na głos z timerem. Najlepiej z partnerem – albo nagraj się i odsłuchaj." }));

    view.appendChild(el("div", { class: "c1-speak-bar" }, [
      el("div", { class: "segmented", role: "tablist", "aria-label": "Część egzaminu" }, [["2", "Part 2"], ["3", "Part 3 + 4"]].map(function (p) {
        return el("button", {
          type: "button",
          role: "tab",
          class: "segmented-btn" + (ui.part === p[0] ? " is-active" : ""),
          "aria-selected": ui.part === p[0] ? "true" : "false",
          onclick: function () { go(p[0], ui.index[p[0]]); }
        }, p[1]);
      })),
      el("div", { class: "c1-speak-nav" }, [
        el("button", { type: "button", class: "icon-btn", "aria-label": "Poprzedni zestaw", "data-tooltip": "Poprzedni zestaw", onclick: function () { go(ui.part, index - 1); } }, ELM.icon("chevron-left", { size: 20 })),
        el("span", { class: "c1-speak-count", text: "Zestaw " + (index + 1) + " / " + list.length + (task.theme ? ": " + task.theme : "") }),
        el("button", { type: "button", class: "icon-btn", "aria-label": "Następny zestaw", "data-tooltip": "Następny zestaw", onclick: function () { go(ui.part, index + 1); } }, ELM.icon("chevron-right", { size: 20 }))
      ])
    ]));

    view.appendChild(ui.part === "2" ? renderPart2(task, S.timers) : renderPart3(task, S.timers));
    ELM.recorder.destroyAll();
    view.appendChild(ELM.recorder.create({ exam: "certyfikat-c1", card: task.id + "-part" + ui.part }).node);
    const page = c1().findPage("speaking");
    if (page) view.appendChild(el("p", { class: "c1-back" }, el("a", { href: c1().hrefPage("speaking") }, ["Zwroty i kryteria oceny: " + page.page.label, ELM.icon("chevron-right", { size: 16 })])));
    return "Trening Speaking";
  }

  ELM.c1Speaking = { render: render };
})(window.ELM);
