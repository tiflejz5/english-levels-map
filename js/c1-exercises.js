/*
 * c1-exercises.js — interaktywne zestawy Use of English (cwiczenia/*.json).
 *
 * Typy:
 *   "transformation"        — Part 4: 3–6 słów, słowo kluczowe, 2 pkt (po 1 za część)
 *   "word-formation"        — Part 3: luka + słowo bazowe (stem), 1 pkt
 *   "open-cloze"            — Part 2: jedno słowo (skrót = dwa słowa), 1 pkt
 *   "multiple-choice-cloze" — Part 1: wybór A/B/C/D, 1 pkt
 *
 * Najlepszy wynik zestawu zapisuje ELM.c1.store (localStorage, klucz elm_c1_v1).
 * Przy błędnej odpowiedzi przycisk „Dodaj do dziennika błędów” otwiera
 * wstępnie wypełniony formularz (js/journal.js) — nic nie zapisuje się
 * bez zatwierdzenia.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  function c1() { return ELM.c1; }

  // =====================================================================
  // NORMALIZACJA I SŁOWA
  // =====================================================================

  /** Wielkie litery, ’ → ', bez interpunkcji (poza apostrofem), pojedyncze spacje. */
  function norm(text) {
    return String(text || "")
      .toUpperCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/[^\p{L}\p{N}'\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Skróty liczą się jako dwa słowa: DOESN'T = DOES + N'T, I'M = I + 'M …
  const CONTRACTION = /^(.+?)(N'T|'S|'RE|'VE|'D|'LL|'M)$/;

  function tokens(text) {
    const out = [];
    norm(text).split(" ").filter(Boolean).forEach(function (word) {
      const m = CONTRACTION.exec(word);
      if (m) out.push(m[1], m[2]);
      else out.push(word);
    });
    return out;
  }

  /** Pozycje, od których ciąg „needle” występuje w „hay” (od indeksu from). */
  function findSeq(hay, needle, from) {
    const hits = [];
    if (!needle.length) return hits;
    for (let i = from || 0; i + needle.length <= hay.length; i++) {
      let ok = true;
      for (let j = 0; j < needle.length; j++) {
        if (hay[i + j] !== needle[j]) { ok = false; break; }
      }
      if (ok) hits.push(i);
    }
    return hits;
  }

  // =====================================================================
  // OCENA
  // =====================================================================

  /**
   * Part 4 (jak Cambridge): 3–6 słów, słowo kluczowe bez zmian, po 1 pkt
   * za każdą część; kolejna część liczy się, gdy występuje PO poprzedniej.
   */
  function scoreTransformation(item, answer) {
    const t = tokens(answer);
    const parts = item.parts.map(function () { return false; });
    if (!t.length) return { score: 0, parts: parts, msg: "Brak odpowiedzi." };
    if (t.length < 3 || t.length > 6) {
      return { score: 0, parts: parts, msg: "Wpisz 3–6 słów (masz " + t.length + " " + c1().plural(t.length, "słowo", "słowa", "słów") + ", skróty liczą się jako dwa)." };
    }
    if (!findSeq(t, tokens(item.keyword), 0).length) {
      return { score: 0, parts: parts, msg: "Użyj słowa kluczowego bez zmian (" + item.keyword + ")." };
    }
    let cursor = 0;
    item.parts.forEach(function (variants, k) {
      let bestEnd = -1;
      variants.forEach(function (variant) {
        const v = tokens(variant);
        const starts = findSeq(t, v, cursor);
        if (starts.length) {
          const end = starts[0] + v.length;
          if (bestEnd === -1 || end < bestEnd) bestEnd = end;
        }
      });
      if (bestEnd !== -1) { parts[k] = true; cursor = bestEnd; }
    });
    const score = parts.filter(Boolean).length;
    return { score: score, parts: parts, msg: null };
  }

  function scoreWordFormation(gap, answer) {
    if (!norm(answer)) return { ok: false, msg: "Brak odpowiedzi." };
    const ok = gap.accept.map(norm).indexOf(norm(answer)) !== -1;
    return { ok: ok, msg: null };
  }

  function scoreOpenCloze(gap, answer) {
    const n = norm(answer);
    if (!n) return { ok: false, msg: "Brak odpowiedzi." };
    if (n.indexOf(" ") !== -1) return { ok: false, msg: "Wpisz jedno słowo." };
    if (tokens(answer).length > 1 || n.indexOf("'") !== -1) return { ok: false, msg: "Skrót liczy się jako dwa słowa." };
    return { ok: gap.accept.map(norm).indexOf(n) !== -1, msg: null };
  }

  // =====================================================================
  // ELEMENTY WSPÓLNE
  // =====================================================================

  function mark(ok) {
    return el("span", { class: "c1-mark " + (ok ? "is-ok" : "is-bad"), role: "img", "aria-label": ok ? "Dobrze" : "Źle" }, ELM.icon(ok ? "check" : "x", { size: 14 }));
  }

  /**
   * Przycisk „Dodaj do dziennika błędów”. getPrefill() zwraca pola wpisu
   * (z ref = klucz zadania, do wykrywania duplikatów).
   */
  function journalButton(getPrefill) {
    if (!ELM.journal) return null;
    const btn = el("button", {
      type: "button",
      class: "btn btn-secondary btn-small c1-journal-btn",
      onclick: function () {
        ELM.journal.openForm({ prefill: getPrefill() }).then(function (saved) {
          if (!saved) return;
          btn.replaceChildren.apply(btn, ELM.ui.withIcon("check", "Dodano do dziennika"));
          btn.disabled = true;
        });
      }
    }, "Dodaj do dziennika błędów");
    return btn;
  }

  /** Zdanie z luką n (pozostałe luki jako „…”), do kontekstu wpisu w dzienniku. */
  function gapSentence(text, n) {
    const marker = "{{" + n + "}}";
    const sentences = String(text).match(/[^.!?]+[.!?]+['’”]?|[^.!?]+$/g) || [String(text)];
    const hit = sentences.find(function (s) { return s.indexOf(marker) !== -1; }) || String(text);
    return hit.trim().replace(marker, "_____").replace(/\{\{\d+\}\}/g, "…");
  }

  function answerInput(cls, label) {
    return el("input", {
      type: "text",
      class: "field " + cls,
      spellcheck: "false",
      autocomplete: "off",
      autocapitalize: "off",
      "aria-label": label
    });
  }

  // =====================================================================
  // PART 4 — TRANSFORMACJE
  // =====================================================================

  function buildTransformation(ex) {
    const rows = ex.items.map(function (item) {
      const input = answerInput("c1-tr-input", "Odpowiedź do zdania " + item.n);
      const feedback = el("div", { class: "c1-feedback", hidden: true, "aria-live": "polite" });
      const node = el("li", { class: "c1-tr-item" }, [
        el("p", { class: "c1-tr-first", text: item.first }),
        el("p", { class: "c1-tr-key" }, el("span", { class: "c1-keyword", text: item.keyword })),
        el("p", { class: "c1-tr-line" }, [
          item.before ? el("span", { text: item.before + " " }) : null,
          input,
          item.after ? el("span", { text: " " + item.after }) : null
        ]),
        feedback
      ]);
      return { item: item, input: input, feedback: feedback, node: node, result: null, showAnswer: false };
    });

    function paintRow(r) {
      const parts = [];
      if (r.result) {
        parts.push(el("p", { class: "c1-feedback-head" }, [
          mark(r.result.score === r.item.parts.length),
          el("strong", { text: r.result.score + " / " + r.item.parts.length + " pkt" }),
          r.result.msg ? el("span", { class: "c1-feedback-msg", text: r.result.msg }) : null
        ]));
        if (!r.result.msg) {
          parts.push(el("p", { class: "c1-parts" }, r.result.parts.map(function (ok, k) {
            return el("span", { class: "c1-part " + (ok ? "is-ok" : "is-bad") }, [ELM.icon(ok ? "check" : "x", { size: 14 }), "Część " + (k + 1) + (ok ? " – dobrze" : " – źle")]);
          })));
        }
      }
      if (r.showAnswer) parts.push(el("p", { class: "c1-answer" }, [el("span", { text: "Odpowiedź: " }), el("strong", { text: r.item.model })]));
      if (r.result || r.showAnswer) parts.push(el("p", { class: "c1-explanation", text: r.item.explanation }));
      if (r.result && r.result.score < r.item.parts.length && r.input.value.trim()) {
        const answer = r.input.value.trim();
        const item = r.item;
        parts.push(el("p", { class: "c1-journal" }, journalButton(function () {
          return {
            context: item.first + "\nSłowo kluczowe: " + item.keyword + "\n" +
              [item.before, "_____", item.after].filter(Boolean).join(" "),
            myAnswer: answer,
            correct: item.model,
            rule: item.explanation || "",
            source: ex.title + ", pyt. " + item.n,
            category: "Use of English",
            ref: "c1:" + ex.id + ":" + item.n
          };
        })));
      }
      r.feedback.replaceChildren.apply(r.feedback, parts);
      r.feedback.hidden = !parts.length;
      r.input.classList.toggle("is-ok", !!r.result && r.result.score === r.item.parts.length);
      r.input.classList.toggle("is-bad", !!r.result && r.result.score < r.item.parts.length);
    }

    return {
      node: el("ol", { class: "c1-tr-list" }, rows.map(function (r) { return r.node; })),
      check: function () {
        let score = 0;
        rows.forEach(function (r) { r.result = scoreTransformation(r.item, r.input.value); score += r.result.score; paintRow(r); });
        return score;
      },
      showAnswers: function () { rows.forEach(function (r) { r.showAnswer = true; paintRow(r); }); },
      reset: function () { rows.forEach(function (r) { r.input.value = ""; r.result = null; r.showAnswer = false; paintRow(r); }); },
      scoreOf: scoreTransformation
    };
  }

  // =====================================================================
  // PART 1–3 — TEKST Z LUKAMI {{n}}
  // =====================================================================

  function buildCloze(ex) {
    const type = ex.type;
    const gaps = {};
    ex.gaps.forEach(function (g) {
      let control;
      if (type === "multiple-choice-cloze") {
        control = el("select", { class: "c1-select", "aria-label": "Luka " + g.n }, [
          el("option", { value: "" }, "(" + g.n + ") wybierz…")
        ].concat(Object.keys(g.options).map(function (letter) {
          return el("option", { value: letter }, letter + " – " + g.options[letter]);
        })));
      } else {
        control = answerInput("c1-gap-input", "Luka " + g.n + (g.stem ? " (słowo bazowe: " + g.stem + ")" : ""));
      }
      gaps[g.n] = { gap: g, control: control, markBox: el("span", { class: "c1-gap-mark" }), result: null };
    });

    // Tekst z polami w miejscu {{n}}
    const textNode = el("p", { class: "c1-cloze-text" });
    String(ex.text).split(/\{\{(\d+)\}\}/).forEach(function (part, i) {
      if (i % 2 === 0) { if (part) textNode.appendChild(document.createTextNode(part)); return; }
      const g = gaps[Number(part)];
      if (!g) { textNode.appendChild(document.createTextNode("(" + part + ")")); return; }
      textNode.appendChild(el("span", { class: "c1-gap" }, [
        el("span", { class: "c1-gap-num", "aria-hidden": "true", text: part }),
        g.control,
        g.gap.stem ? el("span", { class: "c1-stem", text: g.gap.stem }) : null,
        g.markBox
      ]));
    });

    const list = el("ol", { class: "c1-gap-feedback", hidden: true });
    let showAnswers = false;

    function correctText(g) {
      if (type === "multiple-choice-cloze") return g.answer + " – " + g.options[g.answer];
      return g.accept[0];
    }

    function paint() {
      const items = [];
      ex.gaps.forEach(function (g) {
        const s = gaps[g.n];
        s.markBox.replaceChildren(s.result ? mark(s.result.ok) : document.createTextNode(""));
        s.control.classList.toggle("is-ok", !!s.result && s.result.ok);
        s.control.classList.toggle("is-bad", !!s.result && !s.result.ok);
        if (!s.result && !showAnswers) return;
        items.push(el("li", { value: g.n }, [
          s.result ? mark(s.result.ok) : null,
          s.result && s.result.msg ? el("span", { class: "c1-feedback-msg", text: s.result.msg }) : null,
          showAnswers
            ? el("span", { class: "c1-answer" }, [el("span", { text: "Odpowiedź: " }), el("strong", { text: correctText(g) })])
            : null,
          el("span", { class: "c1-explanation", text: g.explanation }),
          s.result && !s.result.ok && String(s.control.value).trim() ? el("span", { class: "c1-journal" }, journalButton(function () { return clozePrefill(g, s.control.value); })) : null
        ]));
      });
      list.replaceChildren.apply(list, items);
      list.hidden = !items.length;
    }

    function clozePrefill(g, value) {
      const lines = [gapSentence(ex.text, g.n)];
      if (type === "multiple-choice-cloze") {
        lines.push(Object.keys(g.options).map(function (k) { return k + " – " + g.options[k]; }).join(", "));
      }
      if (g.stem) lines.push("Słowo bazowe: " + g.stem);
      const mine = type === "multiple-choice-cloze"
        ? (value ? value + " – " + g.options[value] : "")
        : String(value || "").trim();
      return {
        context: lines.join("\n"),
        myAnswer: mine,
        correct: correctText(g),
        rule: g.explanation || "",
        source: ex.title + ", luka " + g.n,
        category: "Use of English",
        ref: "c1:" + ex.id + ":" + g.n
      };
    }

    return {
      node: el("div", { class: "c1-cloze" }, [textNode, list]),
      check: function () {
        let score = 0;
        ex.gaps.forEach(function (g) {
          const s = gaps[g.n];
          const value = s.control.value;
          if (type === "multiple-choice-cloze") s.result = { ok: value === g.answer, msg: value ? null : "Brak odpowiedzi." };
          else if (type === "open-cloze") s.result = scoreOpenCloze(g, value);
          else s.result = scoreWordFormation(g, value);
          if (s.result.ok) score++;
        });
        paint();
        return score;
      },
      showAnswers: function () { showAnswers = true; paint(); },
      reset: function () {
        showAnswers = false;
        ex.gaps.forEach(function (g) { gaps[g.n].control.value = ""; gaps[g.n].result = null; });
        paint();
      }
    };
  }

  // =====================================================================
  // STRONA ZESTAWU
  // =====================================================================

  function bestText(id, max) {
    const best = c1().store.bestScore(id);
    return best === null ? "Najlepszy wynik: jeszcze brak" : "Najlepszy wynik: " + best + " / " + max;
  }

  function render(view, id) {
    const ex = ELM.C1 && ELM.C1.exercises[id];
    const found = c1().findSet(id);
    if (!ex || !found) { view.appendChild(c1().notFound("Nie znaleziono takiego zestawu ćwiczeń.")); return null; }

    const max = ex.maxScore || found.set.maxScore;
    const control = ex.type === "transformation" ? buildTransformation(ex)
      : ["word-formation", "open-cloze", "multiple-choice-cloze"].indexOf(ex.type) !== -1 ? buildCloze(ex)
      : null;
    if (!control) { view.appendChild(c1().notFound("Nieznany typ ćwiczenia: " + ex.type)); return null; }

    const best = el("p", { class: "c1-ex-best", text: bestText(id, max) });
    const result = el("p", { class: "c1-ex-result", "aria-live": "polite" });

    view.appendChild(c1().crumb(found.group.label));
    view.appendChild(el("header", { class: "c1-ex-head" }, [
      el("h1", { class: "c1-title", text: ex.title }),
      ex.focus ? el("p", { class: "c1-ex-focus", text: ex.focus }) : null,
      best
    ]));
    view.appendChild(el("section", { class: "card c1-ex c1-ex-" + ex.type }, [
      el("p", { class: "c1-ex-instr" }, ELM.markdown.inline(ex.instructions)),
      control.node,
      el("div", { class: "c1-ex-actions" }, [
        el("button", {
          type: "button",
          class: "btn btn-primary",
          onclick: function () {
            const score = control.check();
            const record = c1().store.recordScore(id, score);
            if (ELM.markActivity) ELM.markActivity(); // ukończone ćwiczenie = dzień nauki
            result.replaceChildren(
              el("strong", { text: "Wynik: " + score + " / " + max }),
              record ? el("span", { class: "c1-record", text: " · nowy najlepszy wynik!" }) : null
            );
            best.textContent = bestText(id, max);
            c1().renderNav();
          }
        }, "Sprawdź"),
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { control.showAnswers(); } }, "Pokaż odpowiedzi"),
        el("button", {
          type: "button",
          class: "btn btn-secondary",
          onclick: function () { control.reset(); result.replaceChildren(); }
        }, "Spróbuj ponownie"),
        result
      ])
    ]));

    // Następny zestaw z tej samej grupy
    const sets = found.group.sets;
    const next = sets[sets.indexOf(found.set) + 1];
    view.appendChild(el("nav", { class: "c1-pager", "aria-label": "Zestawy" }, [
      el("a", { class: "btn btn-secondary", href: c1().BASE + "/cwiczenia" }, ELM.ui.withIcon("arrow-left", "Wszystkie zestawy")),
      next ? el("a", { class: "btn btn-secondary", href: c1().hrefSet(next.id) }, [next.label, ELM.icon("arrow-right", { size: 18 })]) : null
    ]));
    return ex.title;
  }

  ELM.c1Exercises = {
    render: render,
    // do testów i ewentualnego użycia gdzie indziej
    norm: norm,
    tokens: tokens,
    scoreTransformation: scoreTransformation,
    scoreOpenCloze: scoreOpenCloze,
    scoreWordFormation: scoreWordFormation
  };
})(window.ELM);
