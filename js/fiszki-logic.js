/*
 * fiszki-logic.js — czysta logika fiszek (spec 10): bez DOM i localStorage, testy w tools/testy.js.
 * Harmonogram jest osobno: js/fiszki-harmonogram.js.
 *
 *   normalize(s)                       porównanie odpowiedzi (2.1): małe litery, spacje, ’ → ', bez interpunkcji na brzegach
 *   levenshtein(a, b)
 *   checkAnswer(input, accepted)       { result: exact|typo|wrong|empty, suggested: good|hard|again, expected }
 *   parseCloze(text)                   { ok, before, answers, after, error } — dokładnie jedna luka {{a|b}}
 *   fromAnki(text), toAnki(text, hint) {{c1::x}} ↔ {{x}}
 *   answersOf(card), frontText(card)
 *   studyDay(ms, hour?)                „RRRR-MM-DD” dnia nauki (granica o 04:00 czasu lokalnego)
 *   dayStart(day, hour?)               ms początku dnia nauki
 *   buildQueue(opts)                   kolejka sesji (3.4): nauka → powtórki (limit) → nowe (limit)
 *   pickNext(pool, queue, now)         następna karta w sesji (nauka z terminem ≤ 20 min wraca)
 *   deckStats(cards, stateMap, now)    { new, learning, mastered, review, suspended, total }
 *   parseDelimited(text)               wiersze TSV/CSV (separator tab albo „;”, cudzysłowy RFC 4180)
 *   importCards(text, opts)            { cards, rejected: [{ line, reason }], total } — podgląd importu
 *   exportTsv(cards)                   TSV zgodny z importem Anki (przód, tył, tagi; cloze jako {{c1::…}})
 *   extractSentence(blok, zaznaczenie) zdanie kontekstu (≤ 220 znaków); makeCloze(zdanie, słowo) → zdanie z {{słowo}} albo null
 *   wordFromSelection(tekst), isPolish(tekst), wordKey(słowo), makeWordCard({ selection, sentence, hint, source, day })
 *   sanitizeWordFields(karta)          word, source, addedAt, examples przy zapisie i imporcie (spec v6 14)
 *   exportWordsCsv(karty)              „Moje słowa” do CSV: słowo; znaczenie; zdanie; źródło
 *   sanitizeState(raw)                 stan z localStorage / importu → poprawny stan albo wyjątek
 *   emptyState(), pruneDaily(daily, keep?)
 *   daily: { <dzień>: { new, reviews (powtórki kart w stanie review), again, good (Dobrze+Łatwe), answers (wszystkie oceny), minutes } }
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const VERSION = 1;
  const MAX_FIELD = 500;
  const MAX_IMPORT = 2000;
  const DAY_HOUR = 4;           // granica dnia nauki
  const LEARN_AHEAD = 20 * 60000; // karty w nauce z terminem w ciągu 20 min mogą wrócić w sesji
  const TYPES = ["basic", "cloze", "typed"];
  const STATES = ["new", "learning", "review", "relearning"];
  const DEFAULT_SETTINGS = { newPerDay: 10, reviewsPerDay: 100, typeAnswerFirst: false, enabledDecks: ["czasowniki-frazowe", "kolokacje"], fuzz: true, autoAddMistakes: false, randomDecks: [] };

  // =====================================================================
  // ODPOWIEDZI
  // =====================================================================

  function normalize(s) {
    return String(s == null ? "" : s)
      .replace(/[’‘ʼ`´]/g, "'")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[\s.,;:!?¡¿"“”„«»()[\]{}…–—-]+|[\s.,;:!?¡¿"“”„«»()[\]{}…–—-]+$/g, "")
      .trim();
  }

  function levenshtein(a, b) {
    a = String(a); b = String(b);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, function (_, j) { return j; });
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  /** Ocena wpisanej odpowiedzi (2.1). accepted — lista akceptowanych (pierwsza wzorcowa). */
  function checkAnswer(input, accepted) {
    const list = (accepted || []).filter(function (a) { return normalize(a); });
    const expected = list[0] || "";
    const n = normalize(input);
    if (!n) return { result: "empty", suggested: "again", expected: expected };
    if (list.some(function (a) { return normalize(a) === n; })) return { result: "exact", suggested: "good", expected: expected };
    const close = list.find(function (a) { const t = normalize(a); return t.length >= 5 && levenshtein(t, n) === 1; });
    if (close) return { result: "typo", suggested: "hard", expected: close };
    return { result: "wrong", suggested: "again", expected: expected };
  }

  // =====================================================================
  // CLOZE
  // =====================================================================

  /** {{c1::x}} / {{c2::x::podpowiedź}} (Anki) → {{x}}. */
  function fromAnki(text) {
    return String(text == null ? "" : text).replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*)?\}\}/g, "{{$1}}");
  }

  /** {{a|b}} → {{c1::a}} (pierwsza alternatywa, opcjonalna podpowiedź Anki). */
  function toAnki(text, hint) {
    return String(text).replace(/\{\{([^{}]+)\}\}/g, function (_, inner) {
      return "{{c1::" + inner.split("|")[0].trim() + (hint ? "::" + String(hint).replace(/[{}]/g, "") : "") + "}}";
    });
  }

  function parseCloze(text) {
    const t = String(text == null ? "" : text);
    const all = t.match(/\{\{[^{}]*\}\}/g) || [];
    if (!all.length) return { ok: false, error: "Brak luki. Zaznacz odpowiedź w {{podwójnych nawiasach}}." };
    if (all.length > 1) return { ok: false, error: "Karta może mieć tylko jedną lukę {{…}}." };
    if (/\{\{|\}\}/.test(t.replace(all[0], ""))) return { ok: false, error: "Niedomknięte nawiasy {{ }}." };
    const inner = all[0].slice(2, -2);
    const answers = inner.split("|").map(function (x) { return x.trim(); });
    if (!answers.length || answers.some(function (x) { return !x; })) return { ok: false, error: "Luka i każda alternatywa (a|b) muszą mieć treść." };
    const i = t.indexOf(all[0]);
    return { ok: true, before: t.slice(0, i), answers: answers, after: t.slice(i + all[0].length) };
  }

  /** Akceptowane odpowiedzi karty (pierwsza = wzorcowa). */
  function answersOf(card) {
    if (card.type === "cloze") { const c = parseCloze(card.text); return c.ok ? c.answers : []; }
    if (card.type === "typed") return (card.accepted && card.accepted.length ? card.accepted : [card.back]).filter(Boolean);
    return [card.back].filter(Boolean);
  }

  /** Tekst przodu (do list i wyszukiwania): cloze z „_____”. */
  function frontText(card) {
    if (card.type === "cloze") { const c = parseCloze(card.text); return c.ok ? c.before + "_____" + c.after : String(card.text || ""); }
    return String(card.front || "");
  }

  // =====================================================================
  // DZIEŃ NAUKI I KOLEJKA
  // =====================================================================

  function pad(n) { return String(n).padStart(2, "0"); }

  /** Dzień nauki dla chwili ms (czas lokalny; noc do 04:00 należy do poprzedniego dnia). */
  function studyDay(ms, hour) {
    const d = new Date(ms - (hour == null ? DAY_HOUR : hour) * 3600000);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /** Początek dnia nauki „RRRR-MM-DD” (lokalnie, o 04:00). */
  function dayStart(day, hour) {
    const p = String(day).split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2], hour == null ? DAY_HOUR : hour, 0, 0, 0).getTime();
  }

  /** Koniec bieżącego dnia nauki (początek następnego). */
  function dayEnd(now, hour) {
    const p = studyDay(now, hour).split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2] + 1, hour == null ? DAY_HOUR : hour, 0, 0, 0).getTime();
  }

  function isHidden(st, now) {
    return !!(st && (st.suspended || (st.buriedUntil && st.buriedUntil > now)));
  }

  /**
   * Kolejka sesji (3.4). opts:
   *   cards     karty włączonych talii w kolejności talii ([{ id, deck, … }])
   *   state     mapa stanów { id: stan } (brak = nowa)
   *   now       ms
   *   settings  { newPerDay, reviewsPerDay, randomDecks: [id talii z losową kolejnością nowych] }
   *   today     { new, reviews } — już zrobione dziś (daily)
   *   extraNew  dodatkowe nowe ponad limit (np. „Dodaj kolejne 5 nowych kart”)
   *   random    () => [0, 1) — do tasowania nowych w taliach z opcją „losowo”
   * Zwraca { learning: [id], review: [id], fresh: [id], queue: [id] } (queue = review + fresh;
   * karty w nauce dobiera pickNext).
   */
  function buildQueue(opts) {
    const now = opts.now, st = opts.state || {}, s = Object.assign({}, DEFAULT_SETTINGS, opts.settings || {});
    const today = opts.today || {};
    const end = dayEnd(now);
    const learning = [], review = [], fresh = [];
    (opts.cards || []).forEach(function (c) {
      const x = st[c.id];
      if (isHidden(x, now)) return;
      if (!x || x.state === "new") fresh.push(c);
      else if (x.state === "learning" || x.state === "relearning") learning.push(c);
      else if (x.state === "review" && x.due < end) review.push(c);
    });
    learning.sort(function (a, b) { return st[a.id].due - st[b.id].due; });
    review.sort(function (a, b) { return st[a.id].due - st[b.id].due; }); // najbardziej zaległe najpierw
    const reviewLeft = Math.max(0, s.reviewsPerDay - (today.reviews || 0));
    const newLeft = Math.max(0, s.newPerDay - (today.new || 0)) + (opts.extraNew || 0);
    // Nowe: w kolejności talii; talie z opcją „losowo” tasowane wewnątrz (bez zmiany kolejności talii)
    let freshOrdered = fresh;
    const random = opts.random || Math.random;
    if ((s.randomDecks || []).length) {
      const byDeck = [];
      fresh.forEach(function (c) {
        const last = byDeck[byDeck.length - 1];
        if (last && last.deck === c.deck) last.cards.push(c); else byDeck.push({ deck: c.deck, cards: [c] });
      });
      freshOrdered = [];
      byDeck.forEach(function (g) {
        const cards = g.cards.slice();
        if (s.randomDecks.indexOf(g.deck) !== -1) {
          for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); const t = cards[i]; cards[i] = cards[j]; cards[j] = t; }
        }
        freshOrdered = freshOrdered.concat(cards);
      });
    }
    const ids = function (l) { return l.map(function (c) { return c.id; }); };
    const r = ids(review.slice(0, reviewLeft)), f = ids(freshOrdered.slice(0, newLeft));
    return { learning: ids(learning), review: r, fresh: f, queue: r.concat(f) };
  }

  /**
   * Następna karta sesji: (1) w nauce z terminem ≤ now, (2) pierwsza z kolejki, (3) w nauce
   * z terminem w ciągu 20 min (wraca w tej samej sesji). pool — ids kart w nauce w sesji.
   * Zwraca { id, from: "learning"|"queue"|"ahead" } albo null.
   */
  function pickNext(pool, queue, state, now) {
    const due = pool.filter(function (id) { return state[id] && state[id].due <= now; })
      .sort(function (a, b) { return state[a].due - state[b].due; });
    if (due.length) return { id: due[0], from: "learning" };
    if (queue.length) return { id: queue[0], from: "queue" };
    const ahead = pool.filter(function (id) { return state[id] && state[id].due <= now + LEARN_AHEAD; })
      .sort(function (a, b) { return state[a].due - state[b].due; });
    return ahead.length ? { id: ahead[0], from: "ahead" } : null;
  }

  /** Liczby do pasków talii: nowe / w nauce / opanowane (interwał ≥ 21 d) / reszta powtórek / zawieszone. */
  function deckStats(cards, state, now) {
    const out = { total: 0, new: 0, learning: 0, review: 0, mastered: 0, suspended: 0, due: 0 };
    (cards || []).forEach(function (c) {
      const x = state[c.id];
      out.total++;
      if (x && x.suspended) { out.suspended++; return; }
      if (!x || x.state === "new") out.new++;
      else if (x.state === "learning" || x.state === "relearning") out.learning++;
      else if (x.interval >= 21) out.mastered++;
      else out.review++;
      if (x && x.state !== "new" && !isHidden(x, now) && x.due < dayEnd(now)) out.due++;
    });
    return out;
  }

  // =====================================================================
  // TSV / CSV
  // =====================================================================

  /** Wiersze z tekstu: separator tab albo „;” (wykrywany z pierwszej linii), cudzysłowy RFC 4180. */
  function parseDelimited(text) {
    const t = String(text == null ? "" : text).replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    const firstLine = t.split("\n")[0];
    const sep = firstLine.indexOf("\t") !== -1 ? "\t" : firstLine.indexOf(";") !== -1 ? ";" : firstLine.indexOf(",") !== -1 ? "," : "\t";
    const rows = [];
    let row = [], cell = "", q = false, i = 0, line = 1, rowLine = 1;
    while (i < t.length) {
      const ch = t[i];
      if (q) {
        if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i += 2; continue; } q = false; i++; continue; }
        if (ch === "\n") line++;
        cell += ch; i++; continue;
      }
      if (ch === '"' && cell === "") { q = true; i++; continue; }
      if (ch === sep) { row.push(cell); cell = ""; i++; continue; }
      if (ch === "\n") {
        row.push(cell); rows.push({ line: rowLine, cells: row }); row = []; cell = ""; i++; line++; rowLine = line; continue;
      }
      cell += ch; i++;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push({ line: rowLine, cells: row }); }
    return { separator: sep, rows: rows.filter(function (r) { return r.cells.some(function (c) { return c.trim() !== ""; }); }) };
  }

  const TYPE_ALIASES = { basic: "basic", podstawowa: "basic", cloze: "cloze", luka: "cloze", typed: "typed", wpisz: "typed", wpisywana: "typed" };

  function splitTags(s) {
    return String(s || "").split(/[\s,]+/).map(function (x) { return x.trim().toLowerCase(); })
      .filter(function (x) { return /^[\p{L}\p{N}_:-]{1,40}$/u.test(x); }).slice(0, 10);
  }

  /**
   * Karta z pól (formularz albo import) → { card } albo { error }.
   * fields: { type, front, back, hint, example, note, tags }
   */
  function makeCard(fields) {
    const type = TYPE_ALIASES[String(fields.type || "").trim().toLowerCase()];
    if (!type) return { error: "Nieznany typ karty (dozwolone: basic, cloze, typed)." };
    const f = {};
    for (const k of ["front", "back", "hint", "example", "note"]) {
      const v = String(fields[k] == null ? "" : fields[k]).trim();
      if (v.length > MAX_FIELD) return { error: "Pole „" + k + "” jest dłuższe niż " + MAX_FIELD + " znaków." };
      f[k] = v;
    }
    const card = { type: type, tags: Array.isArray(fields.tags) ? fields.tags.slice(0, 10) : splitTags(fields.tags) };
    if (type === "cloze") {
      const text = fromAnki(f.front);
      const c = parseCloze(text);
      if (!c.ok) return { error: c.error };
      card.text = text;
      if (f.back) card.note = f.back;
    } else {
      if (!f.front || !f.back) return { error: "Karta potrzebuje przodu i tyłu." };
      card.front = f.front;
      card.back = f.back;
      if (type === "typed") {
        card.accepted = f.back.split("|").map(function (x) { return x.trim(); }).filter(Boolean);
        card.back = card.accepted[0];
      }
    }
    if (f.hint) card.hint = f.hint;
    if (f.example) card.example = f.example;
    if (f.note) card.note = f.note;
    return { card: card };
  }

  /**
   * Podgląd importu: kolumny „typ; przód; tył; podpowiedź; przykład; notatka; tagi”
   * albo format Anki (przód, tył, tagi — typ wykrywany: {{c1::…}} = cloze, inaczej basic).
   * Nagłówek (pierwsza komórka „typ”/„type”/„przód”/„front”) jest pomijany. Limit 2000 kart.
   */
  function importCards(text, opts) {
    const limit = (opts && opts.limit) || MAX_IMPORT;
    const parsed = parseDelimited(text);
    const cards = [], rejected = [];
    // Format całego pliku: z kolumną typu (nagłówek „typ” albo znany typ w pierwszej kolumnie) albo Anki
    const first = function (r) { return String(r.cells[0] || "").trim().toLowerCase(); };
    const typed = parsed.rows.some(function (r, i) { return (i === 0 && /^(typ|type)$/.test(first(r))) || TYPE_ALIASES[first(r)]; });
    parsed.rows.forEach(function (r, idx) {
      const cells = r.cells.map(function (c) { return c.trim(); });
      if (idx === 0 && /^(typ|type|przód|przod|front)$/i.test(cells[0])) return;
      if (cards.length >= limit) { rejected.push({ line: r.line, reason: "Ponad limit " + limit + " kart w jednym imporcie." }); return; }
      let fields;
      if (typed) {
        fields = { type: cells[0], front: cells[1], back: cells[2], hint: cells[3], example: cells[4], note: cells[5], tags: cells[6] };
      } else {
        fields = { type: /\{\{c\d+::/.test(cells[0]) || /\{\{[^{}]+\}\}/.test(cells[0]) ? "cloze" : "basic", front: cells[0], back: cells[1], tags: cells[2] };
      }
      const res = makeCard(fields);
      if (res.error) rejected.push({ line: r.line, reason: res.error });
      else cards.push(res.card);
    });
    return { cards: cards, rejected: rejected, total: parsed.rows.length, separator: parsed.separator };
  }

  function tsvCell(s) {
    const v = String(s == null ? "" : s);
    return /[\t\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  /** TSV zgodny z importem Anki: przód, tył, tagi (cloze: {{c1::…}}, tył = podpowiedź i notatka). */
  function exportTsv(cards) {
    return (cards || []).map(function (c) {
      let front, back;
      if (c.type === "cloze") {
        front = toAnki(c.text, c.hint);
        back = [c.note, c.example].filter(Boolean).join(" — ");
      } else {
        front = c.front + (c.hint ? " (" + c.hint + ")" : "");
        back = (c.type === "typed" && c.accepted ? c.accepted.join(" | ") : c.back) + (c.note ? " — " + c.note : "");
      }
      return [front, back, (c.tags || []).join(" ")].map(tsvCell).join("\t");
    }).join("\n") + "\n";
  }

  // =====================================================================
  // MOJE SŁOWA (paczka v6, spec 14): zaznaczenie → zdanie kontekstu → karta z luką
  // =====================================================================

  const WORD_MAX = 60;       // znaków w zapisanym słowie / wyrażeniu
  const WORD_WORDS = 6;      // słów w zaznaczeniu
  const SENTENCE_MAX = 220;  // znaków w zdaniu kontekstu i w przykładzie
  const EXAMPLES_MAX = 3;    // dopisanych przykładów
  const ABBREVIATIONS = ["e.g", "i.e", "etc", "mr", "mrs", "ms", "dr", "prof", "vs", "st", "fig", "approx", "inc", "ltd", "jr", "sr", "cf", "viz", "al"];

  /** Apostrofy typograficzne → ' (ta sama długość, więc indeksy w tekście się zgadzają). */
  function foldApostrophes(s) { return String(s).replace(/[’‘ʼ`´]/g, "'"); }

  /** Czy tekst ma polskie znaki (ą, ć, ę, ł, ń, ó, ś, ź, ż) — wtedy „Do Moich słów” jest niedostępne (spec 14, 3.4). */
  function isPolish(text) { return /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(String(text == null ? "" : text)); }

  /**
   * Zaznaczenie → słowo / wyrażenie do zapisania albo "" (za długie: > 60 znaków albo > 6 słów, bez liter).
   * Znaki przestankowe na brzegach i {}| są usuwane.
   */
  function wordFromSelection(text) {
    let t = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    t = t.replace(/^[\s.,;:!?¡¿"“”„«»'‘’()[\]{}…–—-]+|[\s.,;:!?¡¿"“”„«»'‘’()[\]{}…–—-]+$/g, "");
    t = t.replace(/[{}|]/g, " ").replace(/\s+/g, " ").trim();
    if (!t || t.length > WORD_MAX || !/\p{L}/u.test(t)) return "";
    return t.split(" ").length > WORD_WORDS ? "" : t;
  }

  /** Indeks pierwszego wystąpienia wyrażenia w tekście (bez względu na wielkość liter, z granicami słów) albo -1. */
  function findWord(text, word) {
    const w = String(word == null ? "" : word).trim();
    if (!w) return -1;
    const pattern = foldApostrophes(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const m = new RegExp("(?<![\\p{L}\\p{N}])" + pattern + "(?![\\p{L}\\p{N}])", "iu").exec(foldApostrophes(text));
    return m ? m.index : -1;
  }

  /** Zakresy zdań: koniec po . ! ? i spacji przed wielką literą; bez dzielenia na skrótach (e.g., Mr.), inicjałach i liczbach (3.5). */
  function splitSentences(text) {
    const out = [];
    let start = 0;
    const re = /[.!?]+["”’')\]]*\s+(?=["“‘'(\[]?\p{Lu})/gu;
    let m;
    while ((m = re.exec(text))) {
      const before = text.slice(start, m.index);
      const tok = (/(\S+)$/.exec(before) || [])[1] || "";
      const bare = tok.replace(/^[("'“‘\[]+/, "");
      const abbreviation = m[0].charAt(0) === "." && (ABBREVIATIONS.indexOf(bare.toLowerCase()) !== -1 || /^\p{Lu}$/u.test(bare) || /^(?:\p{L}\.)+\p{L}$/u.test(bare));
      if (abbreviation) continue;
      out.push({ start: start, end: m.index + m[0].replace(/\s+$/, "").length });
      start = m.index + m[0].length;
    }
    if (start < text.length) out.push({ start: start, end: text.length });
    return out;
  }

  /** Zdanie dłuższe niż SENTENCE_MAX → okno wokół słowa z „…” po obu stronach (łącznie ≤ SENTENCE_MAX znaków). */
  function windowAround(s, word) {
    const w = String(word).trim();
    const j = findWord(s, w);
    if (j === -1) {
      const cut = s.slice(0, SENTENCE_MAX - 1);
      return cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).trim() + "…";
    }
    const budget = SENTENCE_MAX - 2; // miejsce na dwa „…”
    let from = Math.max(0, j - Math.floor((budget - w.length) / 2));
    let to = Math.min(s.length, from + budget);
    from = Math.max(0, to - budget); // krótsza prawa strona → okno przesuwa się w lewo
    // granice słów: nie tniemy wewnątrz słowa
    if (from > 0) { const sp = s.indexOf(" ", from); if (sp !== -1 && sp < j) from = sp + 1; }
    if (to < s.length) { const sp = s.lastIndexOf(" ", to); if (sp > j + w.length) to = sp; }
    return (from > 0 ? "…" : "") + s.slice(from, to).trim() + (to < s.length ? "…" : "");
  }

  /**
   * Zdanie kontekstu: tekst bloku (p, li, td, blockquote, dd) → zdanie zawierające zaznaczenie, najwyżej 220 znaków
   * (dłuższe z „…” wokół słowa). Gdy zaznaczenia nie ma w tekście — pierwsze zdanie bloku.
   */
  function extractSentence(blockText, selection) {
    const text = String(blockText == null ? "" : blockText).replace(/\s+/g, " ").trim();
    if (!text) return "";
    const sel = String(selection == null ? "" : selection).replace(/\s+/g, " ").trim();
    const i = findWord(text, sel);
    const ranges = splitSentences(text);
    let range = ranges[0] || { start: 0, end: text.length };
    if (i !== -1) range = ranges.find(function (r) { return i >= r.start && i < r.end; }) || ranges.find(function (r) { return i >= r.start && i <= r.end; }) || range;
    const s = text.slice(range.start, range.end).trim();
    return s.length <= SENTENCE_MAX ? s : windowAround(s, sel);
  }

  /** Zdanie z luką {{słowo}} (pierwsze wystąpienie, zapis z tekstu zachowany) albo null, gdy zaznaczenia w zdaniu nie ma. */
  function makeCloze(sentence, selection) {
    const s = String(sentence == null ? "" : sentence).replace(/[{}]/g, "");
    const w = String(selection == null ? "" : selection).trim();
    const i = findWord(s, w);
    if (i === -1) return null;
    const m = new RegExp("^(?:" + foldApostrophes(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+") + ")", "iu").exec(foldApostrophes(s.slice(i)));
    const len = m ? m[0].length : w.length;
    return s.slice(0, i) + "{{" + s.slice(i, i + len) + "}}" + s.slice(i + len);
  }

  /** Klucz deduplikacji słowa: to samo słowo z innego zdania to ten sam klucz (normalize: wielkość liter, spacje, apostrofy). */
  function wordKey(word) { return normalize(word); }

  function isDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[3]) >= 1 && Number(m[3]) <= 31;
  }

  /**
   * Nowe pola karty z „Moich słów”, bezpieczne przy zapisie i imporcie: word ≤ 60, source { route (#/…, ≤ 200), title ≤ 120 },
   * addedAt RRRR-MM-DD, examples ≤ 3 × 220 znaków. Brakujące albo złe pola są pomijane (stary plik działa).
   */
  function sanitizeWordFields(x) {
    const out = {};
    if (!x || typeof x !== "object") return out;
    if (typeof x.word === "string" && x.word.trim()) out.word = x.word.trim().slice(0, WORD_MAX);
    if (x.source && typeof x.source === "object") {
      const src = {};
      if (typeof x.source.route === "string" && x.source.route.length <= 200 && /^#\/[^\s<>"]*$/.test(x.source.route)) src.route = x.source.route;
      if (typeof x.source.title === "string" && x.source.title.trim()) src.title = x.source.title.trim().slice(0, 120);
      if (src.route || src.title) out.source = src;
    }
    if (isDay(x.addedAt)) out.addedAt = x.addedAt;
    if (Array.isArray(x.examples)) {
      const ex = x.examples.filter(function (e) { return typeof e === "string" && e.trim(); }).map(function (e) { return e.replace(/\s+/g, " ").trim().slice(0, SENTENCE_MAX); }).slice(0, EXAMPLES_MAX);
      if (ex.length) out.examples = ex;
    }
    return out;
  }

  /**
   * Karta „Moje słowa” z zaznaczenia: { selection, sentence, hint?, source?, day? } → { card } albo { error }.
   * Luka {{słowo}} w zdaniu (cloze); bez zdania albo bez wystąpienia słowa — zwykła karta (przód = słowo, tył = zdanie).
   */
  function makeWordCard(o) {
    const word = wordFromSelection(o && o.selection);
    if (!word) return { error: "Zaznacz od 1 do 6 słów (najwyżej " + WORD_MAX + " znaków)." };
    const sentence = String((o && o.sentence) || "").replace(/\s+/g, " ").trim().slice(0, SENTENCE_MAX);
    const hint = String((o && o.hint) || "").trim().slice(0, MAX_FIELD);
    const cloze = sentence ? makeCloze(sentence, word) : null;
    const res = cloze
      ? makeCard({ type: "cloze", front: cloze, hint: hint })
      : makeCard({ type: "basic", front: word, back: sentence || hint || "—", hint: sentence ? hint : "" });
    if (res.error) return res;
    const extra = sanitizeWordFields({ word: word, source: o && o.source, addedAt: o && o.day });
    return { card: Object.assign(res.card, extra) };
  }

  /** Eksport „Moich słów” do CSV (separator „;”, cudzysłowy RFC 4180): słowo; znaczenie; zdanie; źródło. */
  function exportWordsCsv(cards) {
    const cell = function (s) { const v = String(s == null ? "" : s); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const lines = [["słowo", "znaczenie", "zdanie", "źródło"].join(";")];
    (cards || []).forEach(function (c) {
      let sentence = "";
      if (c.type === "cloze") { const p = parseCloze(c.text); sentence = p.ok ? p.before + p.answers[0] + p.after : String(c.text || ""); }
      else sentence = String(c.back || "");
      const word = c.word || (c.type === "cloze" ? ((parseCloze(c.text).answers || [])[0] || "") : c.front);
      lines.push([word, c.hint || "", sentence, c.source ? (c.source.title || "") + (c.source.route ? " (" + c.source.route + ")" : "") : ""].map(cell).join(";"));
    });
    return lines.join("\n") + "\n";
  }

  // =====================================================================
  // STAN (localStorage, eksport / import)
  // =====================================================================

  function emptyState() {
    return { version: VERSION, cards: {}, userDecks: [], userCards: [], settings: Object.assign({}, DEFAULT_SETTINGS, { enabledDecks: DEFAULT_SETTINGS.enabledDecks.slice(), randomDecks: [] }), daily: {} };
  }

  const ID = /^[a-z0-9][a-z0-9-]{0,80}$/;
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

  function num(v, min, max) { return typeof v === "number" && isFinite(v) && v >= min && v <= max; }
  function cut(v) { return typeof v === "string" ? v.slice(0, MAX_FIELD) : ""; }

  function sanitizeCardState(x) {
    if (!x || typeof x !== "object" || STATES.indexOf(x.state) === -1) return null;
    const out = {
      state: x.state,
      step: num(x.step, 0, 20) ? Math.floor(x.step) : 0,
      ease: num(x.ease, 1.3, 2.8) ? x.ease : 2.5,
      interval: num(x.interval, 0, 365) ? Math.round(x.interval) : 0,
      pendingInterval: num(x.pendingInterval, 0, 365) ? Math.round(x.pendingInterval) : 0,
      lapses: num(x.lapses, 0, 1e6) ? Math.floor(x.lapses) : 0,
      reps: num(x.reps, 0, 1e7) ? Math.floor(x.reps) : 0,
      due: num(x.due, 0, 8.64e15) ? x.due : 0
    };
    if (x.suspended === true) out.suspended = true;
    if (num(x.buriedUntil, 0, 8.64e15)) out.buriedUntil = x.buriedUntil;
    if (num(x.again, 0, 1e6)) out.again = Math.floor(x.again);
    return out;
  }

  function sanitizeUserCard(x, deckIds) {
    if (!x || typeof x !== "object" || !/^u-[a-z0-9-]{1,60}$/.test(x.id || "") || deckIds.indexOf(x.deck) === -1) return null;
    const fields = { type: x.type, front: x.type === "cloze" ? cut(x.text) : cut(x.front), back: x.type === "typed" && Array.isArray(x.accepted) ? x.accepted.map(cut).join("|") : cut(x.back),
      hint: cut(x.hint), example: cut(x.example), note: x.type === "cloze" ? "" : cut(x.note), tags: Array.isArray(x.tags) ? x.tags.filter(function (t) { return typeof t === "string"; }).map(function (t) { return t.slice(0, 40); }).slice(0, 10) : [] };
    if (TYPES.indexOf(x.type) === -1) return null;
    const res = makeCard(fields);
    if (res.error) return null;
    const card = Object.assign({ id: x.id, deck: x.deck }, res.card);
    if (x.type === "cloze" && x.note) card.note = cut(x.note);
    if (typeof x.sourceItemId === "string" && x.sourceItemId) card.sourceItemId = x.sourceItemId.slice(0, 200);
    if (typeof x.createdAt === "string") card.createdAt = x.createdAt.slice(0, 30);
    return Object.assign(card, sanitizeWordFields(x)); // „Moje słowa”: word, source, addedAt, examples (opcjonalne)
  }

  function pruneDaily(daily, keep) {
    const days = Object.keys(daily || {}).filter(function (d) { return DAY_RE.test(d); }).sort();
    const out = {};
    days.slice(-(keep || 400)).forEach(function (d) { out[d] = daily[d]; });
    return out;
  }

  /** Stan z localStorage albo importu → poprawny stan; nieznana wersja / zły format → wyjątek. */
  function sanitizeState(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Nieprawidłowy format danych fiszek.");
    if (raw.version !== VERSION) throw new Error("Nieobsługiwana wersja danych fiszek (" + raw.version + ").");
    const out = emptyState();
    const cards = raw.cards && typeof raw.cards === "object" ? raw.cards : {};
    Object.keys(cards).slice(0, 20000).forEach(function (id) {
      if (!ID.test(id) && !/^u-[a-z0-9-]{1,60}$/.test(id)) return;
      const s = sanitizeCardState(cards[id]);
      if (s) out.cards[id] = s;
    });
    (Array.isArray(raw.userDecks) ? raw.userDecks : []).slice(0, 200).forEach(function (d) {
      if (!d || !/^u-[a-z0-9-]{1,60}$/.test(d.id || "") || typeof d.title !== "string" || !d.title.trim()) return;
      if (out.userDecks.some(function (x) { return x.id === d.id; })) return;
      out.userDecks.push({ id: d.id, title: d.title.trim().slice(0, 80), createdAt: typeof d.createdAt === "string" ? d.createdAt.slice(0, 30) : "", system: d.system === "mistakes" || d.system === "words" ? d.system : undefined });
      if (!out.userDecks[out.userDecks.length - 1].system) delete out.userDecks[out.userDecks.length - 1].system;
    });
    const deckIds = out.userDecks.map(function (d) { return d.id; });
    const seen = {};
    (Array.isArray(raw.userCards) ? raw.userCards : []).slice(0, 10000).forEach(function (c) {
      const card = sanitizeUserCard(c, deckIds);
      if (card && !seen[card.id]) { seen[card.id] = true; out.userCards.push(card); }
    });
    const s = raw.settings && typeof raw.settings === "object" ? raw.settings : {};
    if (num(s.newPerDay, 0, 999)) out.settings.newPerDay = Math.floor(s.newPerDay);
    if (num(s.reviewsPerDay, 0, 9999)) out.settings.reviewsPerDay = Math.floor(s.reviewsPerDay);
    ["typeAnswerFirst", "fuzz", "autoAddMistakes"].forEach(function (k) { if (typeof s[k] === "boolean") out.settings[k] = s[k]; });
    ["enabledDecks", "randomDecks"].forEach(function (k) {
      if (Array.isArray(s[k])) out.settings[k] = s[k].filter(function (id) { return typeof id === "string" && (ID.test(id) || /^u-[a-z0-9-]{1,60}$/.test(id)); }).slice(0, 200);
    });
    const daily = raw.daily && typeof raw.daily === "object" ? raw.daily : {};
    Object.keys(daily).forEach(function (d) {
      const x = daily[d];
      if (!DAY_RE.test(d) || !x || typeof x !== "object") return;
      out.daily[d] = { new: num(x.new, 0, 1e5) ? Math.floor(x.new) : 0, reviews: num(x.reviews, 0, 1e5) ? Math.floor(x.reviews) : 0,
        again: num(x.again, 0, 1e5) ? Math.floor(x.again) : 0, good: num(x.good, 0, 1e5) ? Math.floor(x.good) : 0,
        answers: num(x.answers, 0, 1e5) ? Math.floor(x.answers) : 0, minutes: num(x.minutes, 0, 1440) ? Math.round(x.minutes) : 0 };
    });
    out.daily = pruneDaily(out.daily, 400);
    return out;
  }

  ELM.fiszkiLogic = {
    VERSION: VERSION, MAX_FIELD: MAX_FIELD, MAX_IMPORT: MAX_IMPORT, DAY_HOUR: DAY_HOUR, TYPES: TYPES, DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    normalize: normalize, levenshtein: levenshtein, checkAnswer: checkAnswer,
    parseCloze: parseCloze, fromAnki: fromAnki, toAnki: toAnki, answersOf: answersOf, frontText: frontText,
    studyDay: studyDay, dayStart: dayStart, dayEnd: dayEnd, isHidden: isHidden,
    buildQueue: buildQueue, pickNext: pickNext, deckStats: deckStats,
    parseDelimited: parseDelimited, makeCard: makeCard, importCards: importCards, exportTsv: exportTsv,
    WORD_MAX: WORD_MAX, SENTENCE_MAX: SENTENCE_MAX, EXAMPLES_MAX: EXAMPLES_MAX,
    isPolish: isPolish, wordFromSelection: wordFromSelection, findWord: findWord, splitSentences: splitSentences,
    extractSentence: extractSentence, makeCloze: makeCloze, wordKey: wordKey, sanitizeWordFields: sanitizeWordFields,
    makeWordCard: makeWordCard, exportWordsCsv: exportWordsCsv,
    emptyState: emptyState, sanitizeState: sanitizeState, pruneDaily: pruneDaily
  };
})(window.ELM);
