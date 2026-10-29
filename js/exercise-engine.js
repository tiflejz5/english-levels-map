/*
 * exercise-engine.js — silnik zadań: sesja zestawu (Nauka / Egzamin),
 * dziewięć typów zadań, ekran wyników, sekcja „Sprawdź się” na stronach tematów.
 * Specyfikacja: docs/rozbudowa-v2/spec/01-typy-zadan.md; typy gap-fill, match,
 * transformation, translate, dictation i wynik w punktach: docs/rozbudowa-v6/spec/12-nowe-typy-zadan.md.
 *
 * Adresy:
 *   #/cwiczenia[/mieszane]           Centrum ćwiczeń (js/exercise-hub.js)
 *   #/cwiczenia/zestaw/<idZestawu>   zestaw z cwiczenia/tematy/
 *   #/cwiczenia/mix/<idMixu>         gotowy zestaw mieszany (dane/mixes.json)
 *   #/cwiczenia/sesja                zestaw wylosowany w generatorze (Centrum ćwiczeń)
 *   #/cwiczenia/slabe[/<temat>]      trening słabych punktów (spec 03, pkt 5)
 *
 * Dane ładujemy NA ŻĄDANIE zwykłym <script> (działa z file://):
 *   cwiczenia/cwiczenia-indeks.js → ELM.CWICZENIA (mapa, opisy zestawów, mixy)
 *   cwiczenia/tematy/<id>.js      → ELM.EX_SETS[<id>]
 * Pliki generuje: node tools/zbuduj-cwiczenia.js (część npm run build).
 *
 * Wyniki: ELM.profileData (klucz elm_exercises_v1, osobno dla profilu).
 * Logika bez DOM (ocena, tasowanie, losowanie mixów): js/exercise-logic.js.
 * Odpowiedzi wpisane przez użytkownika trafiają do strony wyłącznie jako tekst.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const BASE = "#/cwiczenia";

  function X() { return ELM.exLogic; }
  function pd() { return ELM.profileData; }

  const TYPE_LABEL = {
    "multiple-choice": "Wybierz poprawną odpowiedź",
    "reorder": "Ułóż zdanie",
    "find-error": "Znajdź i popraw błąd",
    "short-answer": "Uzupełnij lukę",
    "gap-fill": "Luki do wpisania",
    "match": "Dopasuj pary",
    "transformation": "Transformacje zdań",
    "translate": "Tłumaczenie zdań",
    "dictation": "Dyktando"
  };
  const TYPE_SHORT = {
    "multiple-choice": "wybór odpowiedzi",
    "reorder": "układanie zdań",
    "find-error": "szukanie błędów",
    "short-answer": "krótkie odpowiedzi",
    "gap-fill": "luki do wpisania",
    "match": "dopasowanie par",
    "transformation": "transformacje zdań",
    "translate": "tłumaczenie zdań",
    "dictation": "dyktando"
  };

  // =====================================================================
  // DANE (ładowane na żądanie)
  // =====================================================================

  /** Numer wersji z adresu tego skryptu (?v=…), żeby dane nie brały się ze starej pamięci podręcznej. */
  const VERSION = (function () {
    const s = document.querySelector('script[src*="js/exercise-engine.js"]');
    const m = s && /[?&]v=(\d+)/.exec(s.getAttribute("src"));
    return m ? m[1] : "1";
  })();

  function asset(src) { return src + "?v=" + VERSION; }

  /** Indeks ćwiczeń (Promise). Brak pliku → pusty indeks, aplikacja działa dalej. */
  function loadIndex() {
    if (ELM.CWICZENIA) return Promise.resolve(ELM.CWICZENIA);
    return ELM.loadScript(asset("cwiczenia/cwiczenia-indeks.js")).then(function () {
      return ELM.CWICZENIA || emptyIndex();
    }, function (e) {
      console.warn(e.message + " — uruchom: npm run build");
      return emptyIndex();
    });
  }

  function emptyIndex() { return { topics: {}, sets: {}, mixes: [], tenseByTopic: {} }; }

  /** Pełne zestawy o podanych id (pomija brakujące pliki z ostrzeżeniem). */
  function loadSets(ids) {
    return loadIndex().then(function (index) {
      return Promise.all(ids.map(function (id) {
        const meta = index.sets[id];
        if (!meta) { console.warn("Ćwiczenia: brak zestawu " + id); return null; }
        if (ELM.EX_SETS && ELM.EX_SETS[id]) return ELM.EX_SETS[id];
        return ELM.loadScript(asset(meta.file)).then(function () {
          return (ELM.EX_SETS && ELM.EX_SETS[id]) || null;
        }, function (e) { console.warn(e.message); return null; });
      }));
    }).then(function (list) { return list.filter(Boolean); });
  }

  /** Zadania zestawów z podanych tematów (do mixów i generatora). */
  function loadTopicItems(topics) {
    return loadIndex().then(function (index) {
      const ids = [];
      topics.forEach(function (t) { (index.topics[t] || []).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); }); });
      return loadSets(ids);
    }).then(function (sets) {
      return [].concat.apply([], sets.map(function (s) { return s.items; }));
    });
  }

  /** Punkt niezbędnika po id: { id, level, title, href } albo null. */
  function topicInfo(id) {
    return id && ELM.journal ? ELM.journal.findItem(id) : null;
  }

  /** Krótki opis typów: „wybór odpowiedzi, układanie zdań”. */
  function typesText(types) {
    return Object.keys(types).map(function (t) { return TYPE_SHORT[t] || t; }).join(", ");
  }

  function scoreText(s) { return s.score + "/" + s.total; }

  // =====================================================================
  // ADRESY I SESJA
  // =====================================================================

  function parseRoute(hash) {
    const weak = /^#\/cwiczenia\/slabe(?:\/([a-z0-9-]+))?\/?$/.exec(hash || "");
    if (weak) return { kind: "weak", id: weak[1] || "" }; // trening słabych punktów (cały albo jeden temat)
    const hub = /^#\/cwiczenia(\/mieszane)?\/?$/.exec(hash || "");
    if (hub) return { kind: "hub", section: hub[1] ? "mieszane" : null }; // Centrum ćwiczeń (js/exercise-hub.js)
    let m = /^#\/cwiczenia\/(zestaw|mix)\/([a-z0-9-]+)\/?$/.exec(hash || "");
    if (m) return { kind: m[1] === "zestaw" ? "set" : "mix", id: m[2] };
    if (/^#\/cwiczenia\/sesja\/?$/.test(hash || "")) return { kind: "custom" };
    return null;
  }

  function hrefOf(route) {
    if (route.kind === "hub") return BASE;
    if (route.kind === "set") return BASE + "/zestaw/" + route.id;
    if (route.kind === "mix") return BASE + "/mix/" + route.id;
    if (route.kind === "weak") return BASE + "/slabe" + (route.id ? "/" + route.id : "");
    return BASE + "/sesja";
  }

  // Bieżąca sesja (w pamięci karty; zamknięcie karty = brak zapisu częściowego wyniku)
  let run = null;

  /** Zadanie przygotowane do sesji: wylosowana kolejność opcji / wyrazów i stan odpowiedzi. */
  function prepare(item) {
    const p = { item: item, st: { chosen: null, line: [], range: null, anchor: null, fix: "", text: "", noError: false, texts: [], pairs: {}, sel: null, plays: 0, hint: false }, res: null };
    if (item.type === "multiple-choice") p.choice = X().prepareChoice(item);
    if (item.type === "reorder") p.tokens = X().reorderTokens(item);
    if (item.type === "match") p.right = X().prepareMatch(item);
    return p;
  }

  /**
   * Nowa sesja. cfg: { key, title, intro, items, mode, topic, saveId, isMix, routeHash }
   * key — co jest rozwiązywane (np. "set:a2-…"), saveId — pod jakim id zapisać wynik.
   */
  function newRun(cfg) {
    const profile = ELM.app.getActiveProfile();
    run = {
      key: cfg.key, title: cfg.title, intro: cfg.intro || "", topic: cfg.topic || null,
      saveId: cfg.saveId || null, isMix: !!cfg.isMix, isWeak: !!cfg.isWeak, repick: cfg.repick || null,
      passage: cfg.passage || null, exam: cfg.exam || null,
      // Wspólne nagranie zestawu (B2 Listening Parts 2–4): jeden licznik odsłuchów dla wszystkich zadań
      script: cfg.script || null, listen: { plays: 0, readMode: false },
      profileId: profile ? profile.id : null,
      phase: "intro",
      mode: cfg.mode === "exam" ? "exam" : "learn",
      i: 0,
      retry: !!cfg.retry,
      saved: null,
      score: 0,
      journal: { added: [], reviewed: 0, limit: false } // automatyczny dziennik błędów w tej sesji
    };
    run.source = cfg.items.slice();
    run.items = cfg.items.map(prepare);
    return run;
  }

  function begin() {
    run.phase = "item";
    run.i = 0;
    render();
    focusLater("[data-fk='first']");
  }

  /** Odpowiedź w formacie ELM.exLogic.evaluate. */
  function answerOf(p) {
    const st = p.st;
    if (p.item.type === "multiple-choice") return { chosen: st.chosen === null ? null : p.choice.options[st.chosen].original };
    if (p.item.type === "reorder") return { words: st.line.map(function (t) { return t.text; }) };
    if (p.item.type === "find-error") return st.noError ? { noError: true } : { range: st.range, fix: st.fix };
    if (p.item.type === "gap-fill") return { texts: st.texts };
    if (p.item.type === "match") {
      const pairs = {};
      Object.keys(st.pairs).forEach(function (i) { pairs[i] = rightById(p, st.pairs[i]).text; });
      return { pairs: pairs };
    }
    // Dyktando bez głosu angielskiego: pominięte (nie liczy się do wyniku ani statystyk)
    if (p.item.type === "dictation" && noEnglishVoice()) return { skipped: true };
    return { text: st.text };
  }

  function rightById(p, id) { return p.right.find(function (r) { return r.id === id; }) || { id: id, text: "" }; }

  const NEED_ANSWER = {
    "multiple-choice": "Najpierw wybierz odpowiedź.",
    "reorder": "Najpierw ułóż zdanie z wyrazów poniżej.",
    "find-error": "Najpierw kliknij wyraz z błędem albo wybierz „Brak błędu”.",
    "short-answer": "Najpierw wpisz odpowiedź w lukę.",
    "gap-fill": "Najpierw wpisz odpowiedzi w luki.",
    "match": "Najpierw połącz co najmniej jedną parę.",
    "transformation": "Najpierw uzupełnij zdanie.",
    "translate": "Najpierw wpisz tłumaczenie.",
    "dictation": "Najpierw odsłuchaj nagranie i wpisz, co słyszysz."
  };

  /** „Sprawdź” (Nauka) albo „Dalej” (Egzamin). */
  function check() {
    const p = run.items[run.i];
    if (p.res) return next();
    const res = X().evaluate(p.item, answerOf(p));
    if (run.mode === "learn" && !res.answered) {
      const box = document.querySelector(".ex-status");
      if (box) { box.textContent = NEED_ANSWER[p.item.type]; box.classList.add("is-hint"); }
      return;
    }
    p.res = res;
    stopSpeaking();
    // Dyktando pominięte (brak głosu): bez dziennika podejść, statystyk i dziennika błędów
    if (!res.skipped) {
      logAttempt(p);
      if (res.correct) creditReview(p);
      else if (run.mode !== "exam") toJournal(p, !run.isMix && !run.isWeak); // Egzamin: dopiero po zakończeniu sesji
    }
    if (run.mode === "exam") return next();
    render();
    animate(res.correct);
    focusLater(".ex-next");
  }

  /** Tryb w dzienniku podejść: learn / exam (zestaw), mix (mieszany), weak (słabe punkty). */
  function attemptMode() { return run.isWeak ? "weak" : run.isMix ? "mix" : run.mode; }

  /** Każda odpowiedź trafia do dziennika podejść (elm_attempts_v1), także gdy sesja zostanie przerwana. */
  function logAttempt(p) {
    pd().addAttempt({
      itemId: p.item.id, setId: p.item.setId || null, topic: p.item.topic, level: p.item.level,
      // Słuchanie przeczytane z transkryptu (brak głosu) — oznaczone, poza statystykami słuchania
      type: p.item.type, tags: p.st.readMode ? (p.item.tags || []).concat("czytane") : p.item.tags,
      correct: !!p.res.correct, mode: attemptMode(), answer: userAnswer(p),
      // Zadania za kilka punktów: dodatkowo punkty (pola opcjonalne; statystyki liczą po correct)
      points: p.res.max > 1 ? p.res.points : undefined, max: p.res.max > 1 ? p.res.max : undefined
    });
  }

  // ---------- Automatyczny dziennik błędów (spec 03, pkt 2) ----------

  const JOURNAL_CATEGORY = { czasy: "Gramatyka", gramatyka: "Gramatyka", slownictwo: "Słownictwo" };

  function journalCategory(topic) {
    const N = ELM.NIEZBEDNIK;
    if (!N || !topic) return "Inne";
    for (const lvl of N.index.levels) {
      const it = lvl.items.find(function (x) { return x.id === topic; });
      if (it) return JOURNAL_CATEGORY[it.category] || "Inne";
    }
    return "Inne";
  }

  /** Treść wpisu dziennika dla zadania (kontekst wg typu, wzorcowa odpowiedź, reguła z pułapką). */
  function journalFields(p) {
    const item = p.item;
    let context;
    if (item.type === "multiple-choice") context = String(item.prompt || "") + "\n" + item.options.join(" / ");
    else if (item.type === "reorder") context = (item.context ? item.context + " – " : "") + "Ułóż zdanie";
    else if (item.type === "find-error") context = item.tokens.join(" ");
    else if (item.type === "gap-fill") context = (item.context ? item.context + "\n" : "") + gapText(item, function () { return "___"; });
    else if (item.type === "match") context = item.prompt || "Dopasuj pary";
    else if (item.type === "transformation") context = item.source + "\n" + String(item.keyword).toUpperCase() + "\n" + [item.before, "___", item.after].filter(Boolean).join(" ");
    else if (item.type === "translate") context = "Przetłumacz: " + item.source;
    else if (item.type === "dictation") context = "Dyktando: " + item.text;
    else context = (item.context ? item.context + "\n" : "") + item.prompt;
    const rule = (item.explanation || "") + (item.trap ? " Pułapka: " + item.trap : "");
    // Dopasowanie: w dzienniku tylko błędne pary (moje i poprawne)
    const wrongPairs = item.type === "match" && p.res && p.res.pairs ? item.pairs.filter(function (_, i) { return !p.res.pairs[i]; }) : null;
    return {
      context: context,
      myAnswer: (wrongPairs ? matchText(p, true) : userAnswer(p)) || "(brak odpowiedzi)",
      correct: wrongPairs ? wrongPairs.map(function (x) { return x[0] + " – " + x[1]; }).join("; ") : modelAnswer(item),
      rule: rule.trim(),
      source: "Zestaw: " + run.title,
      category: journalCategory(item.topic),
      itemId: item.topic || ""
    };
  }

  /** Błędna odpowiedź → wpis w dzienniku (bez duplikatów); toast z „Cofnij” tylko w zwykłym zestawie w trybie Nauki. */
  function toJournal(p, withToast) {
    const r = pd().recordWrong(p.item.id, journalFields(p));
    if (!r) return;
    if (r.action === "limit") { run.journal.limit = true; p.journalLimit = true; return; }
    const rec = { undo: r.undo, action: r.action };
    run.journal.added.push(rec);
    p.journal = r.action;
    if (ELM.fiszki && r.entry) ELM.fiszki.autoAddFromJournal(r.entry); // opcja „automatycznie dodawaj błędy do fiszek” (domyślnie wyłączona)
    if (ELM.app.refreshLearning) ELM.app.refreshLearning();
    if (!withToast) return;
    const text = r.action === "create" ? "Dodano do dziennika błędów"
      : r.action === "reopen" ? "Opanowany błąd wrócił do dziennika – powtórka jutro"
        : "Ten błąd jest już w dzienniku – powtórka jutro";
    ELM.ui.toast({
      text: text, icon: "notebook-pen",
      action: { label: "Cofnij", onClick: function () {
        pd().undoAuto(rec.undo);
        run.journal.added = run.journal.added.filter(function (x) { return x !== rec; });
        p.journal = null;
        if (ELM.app.refreshLearning) ELM.app.refreshLearning();
        ELM.ui.toast({ text: "Cofnięto – wpis nie trafił do dziennika.", duration: 3000 });
      } }
    });
  }

  /** Poprawna odpowiedź na zadanie z wpisem do powtórki dziś / zaległym = zaliczona powtórka. */
  function creditReview(p) {
    const r = pd().recordCorrect(p.item.id);
    if (!r) return;
    p.reviewed = true;
    run.journal.reviewed++;
    if (ELM.app.refreshLearning) ELM.app.refreshLearning();
  }

  function next() {
    // Wspólne nagranie gra dalej przy przejściu do kolejnego zadania; kończy się z zestawem
    if (!run.script || run.i >= run.items.length - 1) stopSpeaking();
    if (run.i < run.items.length - 1) {
      run.i++;
      render();
      U.setScroll(0);
      focusLater("[data-fk='first']");
    } else {
      finish();
    }
  }

  function finish() {
    run.phase = "done";
    // Egzamin: błędy trafiają do dziennika dopiero po zakończeniu sesji
    if (run.mode === "exam") run.items.forEach(function (p) { if (isWrong(p)) toJournal(p, false); });
    // Wynik w punktach (zadanie może dawać kilka punktów); zestaw ze starych typów: punkt = poprawne zadanie
    const s = X().sessionScore(run.items);
    run.score = s.score;
    run.total = s.total;
    if (!run.retry && run.saveId) run.saved = pd().saveSetScore(run.saveId, s.score, s.total);
    run.suggest = umiemSuggestion();
    if (run.isMix) pd().setLastMix(run.items.map(function (p) { return p.item.id; }));
    ELM.markActivity(); // ukończona sesja = dzień nauki
    if (ELM.app.refreshLearning) ELM.app.refreshLearning();
    render();
    U.setScroll(0);
    focusLater(".ex-result .btn-primary, .ex-result .btn");
  }

  /** Zadanie bez pełnej liczby punktów (pominięte dyktando się nie liczy). */
  function isWrong(p) { return !(p.res && (p.res.correct || p.res.skipped)); }

  /** „Pstryknięcie” albo drżenie karty (CSS; przy ograniczonym ruchu bez animacji). */
  function animate(ok) {
    const card = document.querySelector(".ex-card");
    if (!card) return;
    card.classList.remove("is-pop", "is-shake");
    void card.offsetWidth;
    card.classList.add(ok ? "is-pop" : "is-shake");
  }

  let focusTimer = null;
  /** Fokus po przerysowaniu; nowsze wywołanie zastępuje oczekujące (szybkie klawisze nie przeskakują fokusem wstecz). */
  function focusLater(selector) {
    clearTimeout(focusTimer);
    focusTimer = setTimeout(function () {
      const n = document.querySelector(selector);
      if (n) n.focus({ preventScroll: true });
    }, 0);
  }

  /** Przerysowanie bieżącego zadania z zachowaniem przewinięcia i fokusu (data-fk). */
  function repaint(focusKey) {
    const scroll = U.getScroll();
    render();
    U.setScroll(scroll);
    if (focusKey) focusLater("[data-fk='" + focusKey + "']");
  }

  // =====================================================================
  // TYPY ZADAŃ — WIDOK
  // =====================================================================

  /** Tekst z luką „___”: elementy tekstowe i węzeł luki zwrócony przez gap(). */
  function withGap(text, gap) {
    const parts = String(text).split("___");
    const out = [];
    parts.forEach(function (part, i) {
      if (part) out.push(part);
      if (i < parts.length - 1) out.push(gap());
    });
    return out;
  }

  /** Prompt w wierszach (dialog „A: …”, „B: ___”). */
  function promptLines(text, gap, id) {
    return el("div", { class: "ex-prompt", id: id }, String(text).split("\n").map(function (line) {
      return el("p", null, withGap(line, gap));
    }));
  }

  // ---------- Słuchanie (kind „listening”, spec 01, sekcja 5): Web Speech API ----------

  let speaking = null; // { p, stop }

  function synth() { return "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function" ? window.speechSynthesis : null; }

  function englishVoices() {
    const s = synth();
    if (!s) return [];
    const all = s.getVoices();
    return all.filter(function (v) { return /^en[-_]GB/i.test(v.lang); }).concat(all.filter(function (v) { return /^en[-_]US/i.test(v.lang); }), all.filter(function (v) { return /^en/i.test(v.lang) && !/^en[-_](GB|US)/i.test(v.lang); }));
  }

  /** Brak API albo głosy wczytane, ale żadnego angielskiego. */
  function noEnglishVoice() {
    const s = synth();
    if (!s) return true;
    const all = s.getVoices();
    return all.length > 0 && !englishVoices().length;
  }

  function stopSpeaking() {
    const s = synth();
    if (speaking) { speaking.cancelled = true; speaking = null; }
    if (s) s.cancel();
  }

  /** Czyta skrypt: wiersze z mówcą („A: …”, „Man: …”, „Speaker 2: …”) dwoma głosami en-GB/en-US (gdy są), tempo 0,9, krótkie przerwy.
   *  owner — zadanie (p) albo cała sesja (run) przy wspólnym nagraniu zestawu. */
  function speakScript(owner, script, onDone) {
    const s = synth();
    if (!s) return;
    stopSpeaking();
    const voices = englishVoices();
    const lines = String(script || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    const token = { p: owner, cancelled: false };
    speaking = token;
    // Mówcy: „A:” / „B:” jak dotąd (A — pierwszy głos, B — drugi); inne etykiety („Man:”, „Interviewer:”,
    // „Speaker 2:”) dostają głosy na przemian w kolejności pojawienia się. Etykiety nie są czytane.
    const order = [];
    function voiceIndex(label) {
      if (!label) return 0;
      if (label === "A" || label === "B") return label === "B" ? 1 : 0;
      if (order.indexOf(label) === -1) order.push(label);
      return order.indexOf(label) % 2;
    }
    let i = 0;
    function nextLine() {
      if (token.cancelled) return;
      if (i >= lines.length) { speaking = null; onDone(); return; }
      const m = /^([A-Z][A-Za-z]*(?: [A-Z0-9][A-Za-z0-9]*)?):\s*(.*)$/.exec(lines[i]);
      const u = new window.SpeechSynthesisUtterance(m ? m[2] : lines[i]);
      const k = voiceIndex(m && m[1]);
      const voice = voices.length ? voices[k && voices.length > 1 ? 1 : 0] : null;
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : "en-GB";
      u.rate = 0.9;
      u.onend = function () { i++; setTimeout(nextLine, 450); };
      u.onerror = function () { i++; setTimeout(nextLine, 50); };
      s.speak(u);
    }
    nextLine();
  }

  function listeningBox(p) {
    // Nagranie zadania (script w zadaniu) albo wspólne nagranie zestawu (script zestawu, spec 09, 3.2):
    // wtedy licznik odsłuchów jest jeden dla całego zestawu, a transkrypt widać dopiero po ostatnim zadaniu
    const shared = !p.item.script && !!run.script;
    const owner = shared ? run : p;
    const script = shared ? run.script : p.item.script;
    const st = shared ? run.listen : p.st;
    const done = shared ? run.items.every(function (q) { return !!q.res; }) : !!p.res;
    // Zadanie ze wspólnym nagraniem poza swoim zestawem (np. w powtórce błędów) — bez nagrania
    if (!script) return el("p", { class: "tool-note ex-listen-note", text: "Nagranie do tego zadania jest w pełnym zestawie – odpowiedz z pamięci albo otwórz zestaw." });
    const max = p.item.maxPlays || 2;
    st.plays = st.plays || 0;
    const playing = speaking && speaking.p === owner;
    const noVoice = noEnglishVoice();
    const nodes = [];
    if (noVoice && !st.readMode) {
      nodes.push(el("p", { class: "ex-listen-warn", role: "status", text: "Ta przeglądarka nie ma głosu angielskiego." }));
      nodes.push(el("button", { type: "button", class: "btn btn-secondary btn-small", onclick: function () { st.readMode = true; repaint("first"); } }, ELM.ui.withIcon("file-text", "Pokaż transkrypt do przeczytania")));
    } else if (!st.readMode) {
      nodes.push(el("div", { class: "ex-listen-controls" }, [
        playing
          ? el("button", { type: "button", class: "btn btn-secondary", "data-fk": "listen", onclick: function () { stopSpeaking(); repaint("listen"); } }, ELM.ui.withIcon("pause", "Zatrzymaj"))
          : el("button", {
            type: "button", class: "btn btn-primary", "data-fk": "listen", disabled: !done && st.plays >= max,
            onclick: function () {
              if (!done) st.plays++;
              speakScript(owner, script, function () { repaint(null); });
              repaint("listen");
            }
          }, ELM.ui.withIcon("play", st.plays ? "Odtwórz ponownie" : "Odtwórz")),
        el("span", { class: "ex-listen-count", "aria-live": "polite", text: "Odsłuchy: " + Math.min(st.plays, max) + "/" + max })
      ]));
      nodes.push(el("p", { class: "tool-note ex-listen-note", text: (shared ? "Jedno nagranie do wszystkich zadań zestawu. " : "") + "Głos syntezowany w przeglądarce. To trening rozumienia – nagranie z egzaminu brzmi inaczej." }));
    }
    if (st.readMode || done) {
      const lines = String(script || "").split("\n").map(function (l) { return el("p", { text: l }); });
      nodes.push(st.readMode && !done
        ? el("div", { class: "ex-transcript", lang: "en" }, [el("p", { class: "review-label", text: "Transkrypt (wynik oznaczony jako „czytane”):" })].concat(lines))
        : el("details", { class: "ex-transcript" }, [el("summary", null, "Pokaż transkrypt")].concat(el("div", { lang: "en" }, lines))));
    }
    return el("div", { class: "ex-listen" }, nodes);
  }

  function bodyChoice(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const chosenText = st.chosen !== null ? p.choice.options[st.chosen].text : "";
    const gap = function () {
      if (!done) return el("span", { class: "ex-gap" + (chosenText ? " is-filled" : "") }, chosenText || el("span", { class: "visually-hidden", text: "luka" }));
      const ok = p.res.correct;
      return el("span", { class: "ex-gap is-filled " + (ok ? "is-ok" : "is-bad") }, [
        el("span", { class: "ex-gap-mark", "aria-hidden": "true" }, ELM.icon(ok ? "check" : "x", { size: 14 })),
        el("span", { class: "ex-gap-text", text: chosenText || "—" }),
        ok ? null : el("span", { class: "visually-hidden", text: " (błędnie)" })
      ]);
    };
    const nodes = [item.kind === "listening" ? listeningBox(p) : null, promptLines(item.prompt || "", gap, "ex-prompt")];
    const options = p.choice.options.map(function (o, i) {
      const isCorrect = i === p.choice.correct, isChosen = i === st.chosen;
      let cls = "ex-option";
      if (done && isCorrect) cls += " is-correct";
      else if (done && isChosen) cls += " is-wrong";
      if (!done && isChosen) cls += " is-chosen";
      return el("label", { class: cls }, [
        el("input", {
          type: "radio", name: "ex-opt", value: String(i), checked: isChosen, disabled: done,
          "data-fk": i === 0 ? "first" : "opt-" + i,
          onchange: function () { st.chosen = i; repaint(i === 0 ? "first" : "opt-" + i); }
        }),
        el("span", { class: "ex-key", "aria-hidden": "true" }, done && (isCorrect || isChosen) ? ELM.icon(isCorrect ? "check" : "x", { size: 16 }) : String(i + 1)),
        el("span", { class: "ex-option-body" }, [
          el("span", { class: "ex-option-text", text: o.text }),
          done && isCorrect ? el("span", { class: "lt-tag is-ok", text: "Poprawna" }) : null,
          done && isChosen && !isCorrect ? el("span", { class: "lt-tag is-bad", text: "Twoja odpowiedź" }) : null,
          done && o.note ? el("span", { class: "ex-note", text: o.note }) : null
        ])
      ]);
    });
    // fixedOrder (np. True / False / Not given): kolejność z pliku, przyciski w jednym rzędzie;
    // same litery (B2 Reading Part 6–7: A–G, A–D) — zwarta siatka, wszystkie w jednym rzędzie
    const letters = item.fixedOrder && p.choice.options.every(function (o) { return /^[A-H]$/.test(String(o.text).trim()); });
    // (długie opcje A–H, np. B2 Listening Part 3, zostają jedna pod drugą)
    const row = item.fixedOrder && (letters || p.choice.options.length <= 4);
    nodes.push(el("div", { class: "ex-options" + (row ? " is-row" : "") + (letters ? " is-letters" : ""), role: "radiogroup", "aria-labelledby": "ex-prompt" }, options));
    if (!done) nodes.push(el("p", { class: "tool-note ex-keys-hint", text: "Klawiatura: cyfry 1–" + options.length + " wybierają odpowiedź, Enter sprawdza." }));
    return nodes;
  }

  function bodyReorder(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const used = new Set(st.line.map(function (t) { return t.id; }));
    const pool = p.tokens.filter(function (t) { return !used.has(t.id); });

    const lineItems = st.line.map(function (t, i) {
      const bad = done && !p.res.correct && i === p.res.diffAt;
      return el("li", { class: "ex-line-item", "data-index": String(i) }, el("button", {
        type: "button",
        class: "ex-token is-placed" + (bad ? " is-bad" : ""),
        disabled: done,
        draggable: done ? null : "true",
        "data-fk": "line-" + i,
        "aria-label": done ? t.text + (bad ? " – tu ułożenie różni się od wzoru" : "") : "Usuń z odpowiedzi: " + t.text,
        onclick: function () {
          st.line.splice(i, 1);
          repaint(st.line.length ? "line-" + Math.min(i, st.line.length - 1) : "first");
        }
      }, [bad ? el("span", { class: "ex-gap-mark", "aria-hidden": "true" }, ELM.icon("x", { size: 12 })) : null, t.text]));
    });

    const line = el("ol", { class: "ex-line" + (st.line.length ? "" : " is-empty"), "aria-label": "Twoje zdanie" },
      lineItems.length ? lineItems : el("li", { class: "ex-line-empty", text: "Klikaj wyrazy poniżej w odpowiedniej kolejności." }));

    const poolList = el("ul", { class: "ex-pool", "aria-label": "Wyrazy do ułożenia" }, pool.map(function (t, i) {
      return el("li", null, el("button", {
        type: "button",
        class: "ex-token",
        disabled: done,
        draggable: done ? null : "true",
        "data-fk": i === 0 ? "first" : "pool-" + i,
        "data-token": t.id,
        "aria-label": "Dodaj: " + t.text,
        onclick: function () {
          st.line.push(t);
          const left = pool.length - 1;
          repaint(left ? (Math.min(i, left - 1) === 0 ? "first" : "pool-" + Math.min(i, left - 1)) : "check");
        }
      }, t.text));
    }));

    if (!done) wireDrag(p, line, poolList);

    return [
      item.context ? el("p", { class: "ex-context" }, [el("span", { class: "review-label", text: "Po polsku: " }), el("span", { text: item.context })]) : null,
      el("p", { class: "visually-hidden", id: "ex-prompt", text: "Ułóż zdanie z podanych wyrazów." }),
      line,
      poolList,
      done ? null : el("div", { class: "ex-tools" }, [
        el("button", {
          type: "button", class: "btn btn-ghost btn-small", disabled: !st.line.length,
          onclick: function () { st.line = []; repaint("first"); }
        }, ELM.ui.withIcon("rotate-ccw", "Wyczyść")),
        el("span", { class: "tool-note", text: "Backspace cofa ostatni wyraz." })
      ])
    ];
  }

  /** Przeciąganie (ulepszenie dla myszy): z puli na linię i w obrębie linii. */
  function wireDrag(p, line, pool) {
    if (!(window.matchMedia && window.matchMedia("(pointer: fine)").matches)) return;
    let dragged = null;
    function start(e) {
      const b = e.target.closest(".ex-token");
      if (!b) return;
      const li = b.closest(".ex-line-item");
      dragged = li ? { from: "line", index: Number(li.dataset.index) } : { from: "pool", id: b.dataset.token };
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", b.textContent); } catch (err) { /* stare przeglądarki */ }
    }
    line.addEventListener("dragstart", start);
    pool.addEventListener("dragstart", start);
    line.addEventListener("dragover", function (e) { if (dragged) { e.preventDefault(); line.classList.add("is-drop"); } });
    line.addEventListener("dragleave", function () { line.classList.remove("is-drop"); });
    line.addEventListener("drop", function (e) {
      e.preventDefault();
      line.classList.remove("is-drop");
      if (!dragged) return;
      const target = e.target.closest(".ex-line-item");
      let at = target ? Number(target.dataset.index) : p.st.line.length;
      let token;
      if (dragged.from === "pool") token = p.tokens.find(function (t) { return t.id === dragged.id; });
      else { token = p.st.line.splice(dragged.index, 1)[0]; if (dragged.index < at) at--; }
      if (token) p.st.line.splice(at, 0, token);
      dragged = null;
      repaint(null);
    });
  }

  function bodyFindError(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const r = st.range;
    const err = item.noError ? null : item.errorRange;
    const tokens = item.tokens.map(function (t, i) {
      const sel = r && i >= r[0] && i <= r[1];
      const isErr = done && err && i >= err[0] && i <= err[1];
      let cls = "ex-word";
      if (sel) cls += " is-selected";
      if (done && sel && !p.res.rangeOk) cls += " is-bad";
      if (isErr) cls += " is-error";
      return el("button", {
        type: "button", class: cls, disabled: done,
        "aria-pressed": sel ? "true" : "false",
        "data-fk": i === 0 ? "first" : "w-" + i,
        onclick: function () { pickWord(st, i); repaint(i === 0 ? "first" : "w-" + i); }
      }, t);
    });
    const selected = r ? item.tokens.slice(r[0], r[1] + 1).join(" ") : "";
    const nodes = [
      el("p", { class: "visually-hidden", id: "ex-prompt", text: "Znajdź błąd w zdaniu: " + item.tokens.join(" ") }),
      el("div", { class: "ex-sentence", role: "group", "aria-label": "Wyrazy zdania – kliknij błędny" }, tokens)
    ];
    if (!done) {
      nodes.push(el("p", { class: "tool-note", text: r
        ? (st.anchor !== null ? "Zaznaczono: „" + selected + "”. Jeśli błąd obejmuje więcej wyrazów, kliknij ostatni z nich." : "Zaznaczono: „" + selected + "”.")
        : "Kliknij wyraz z błędem. Jeśli błąd obejmuje kilka wyrazów, kliknij jeszcze ostatni z nich." }));
    }
    if (r && !st.noError) {
      const input = el("input", {
        type: "text", class: "field ex-fix", id: "ex-fix", value: st.fix, disabled: done,
        autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        placeholder: "poprawiony fragment (puste pole = usuń)",
        oninput: function () { st.fix = input.value; }
      });
      nodes.push(el("div", { class: "ex-fix-row" }, [el("label", { class: "field-label", for: "ex-fix", text: "Jak powinno być?" }), input]));
    }
    if (!done) {
      nodes.push(el("div", { class: "ex-tools" }, el("button", {
        type: "button", class: "btn btn-secondary btn-small" + (st.noError ? " is-active" : ""),
        "aria-pressed": st.noError ? "true" : "false",
        onclick: function () { st.noError = !st.noError; if (st.noError) { st.range = null; st.anchor = null; } repaint(null); }
      }, "Brak błędu")));
    }
    return nodes;
  }

  /** Zaznaczanie fragmentu: 1. klik = wyraz, 2. klik innego wyrazu = zakres; kolejny klik zaczyna od nowa. */
  function pickWord(st, i) {
    st.noError = false;
    if (st.anchor !== null && st.range && st.range[0] === st.range[1] && i !== st.anchor) {
      st.range = [Math.min(st.anchor, i), Math.max(st.anchor, i)];
      st.anchor = null;
    } else {
      st.range = [i, i];
      st.anchor = i;
    }
    // Fokus po przerysowaniu trafi na pole poprawki dopiero przy „Sprawdź”; zostawiamy go na wyrazie
  }

  function bodyShort(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const gap = function () {
      const input = el("input", {
        type: "text", class: "field ex-gap-input" + (done ? (p.res.correct ? " is-ok" : " is-bad") : ""),
        value: st.text, disabled: done, "data-fk": "first",
        autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        "aria-label": "Uzupełnij lukę",
        oninput: function () { st.text = input.value; }
      });
      return input;
    };
    return [
      item.kind === "listening" ? listeningBox(p) : null, // B2 Listening Part 2: uzupełnianie zdań
      item.context ? el("p", { class: "ex-context" }, [el("span", { class: "review-label", text: "Po polsku: " }), el("span", { text: item.context })]) : null,
      promptLines(item.prompt || "", gap, "ex-prompt")
    ];
  }

  // ---------- Nowe typy (paczka v6, spec 12, sekcja 2) ----------

  /** Pole tekstowe bez podpowiedzi przeglądarki (angielski tekst). */
  function textField(tag, attrs) {
    return el(tag, Object.assign({ autocomplete: "off", autocapitalize: "off", spellcheck: "false", lang: "en" }, attrs));
  }

  /** Szerokość pola luki: wg najdłuższej odpowiedzi z zapasem, zaokrąglona (nie zdradza długości dokładnie). */
  function gapWidth(accepted) {
    const longest = Math.max.apply(null, accepted.map(function (a) { return String(a).length; }));
    return Math.max(6, Math.ceil((longest + 3) / 4) * 4) + "ch";
  }

  function bodyGapFill(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const n = item.gaps.length;
    const hints = [];
    const parts = String(item.text).split(/\{\{(\d+)\}\}/);
    const sentence = parts.map(function (part, k) {
      if (k % 2 === 0) return part || null;
      const i = Number(part) - 1;
      const gap = item.gaps[i] || { accepted: [""] };
      const r = done && p.res.gaps ? p.res.gaps[i] : null;
      if (gap.hint) hints.push(el("li", { id: "ex-gap-hint-" + i }, [el("span", { class: "review-label", text: "Luka " + (i + 1) + ": " }), gap.hint]));
      const input = textField("input", {
        type: "text", class: "field ex-gap-input" + (r ? (r.correct ? " is-ok" : " is-bad") : ""),
        value: st.texts[i] || "", disabled: done, "data-fk": i === 0 ? "first" : "gap-" + i,
        "aria-label": "Luka " + (i + 1) + " z " + n + (r ? (r.correct ? " – poprawnie" : " – błędnie") : ""),
        "aria-describedby": gap.hint ? "ex-gap-hint-" + i : null,
        oninput: function () { st.texts[i] = input.value; }
      });
      input.style.width = gapWidth(gap.accepted);
      if (!r) return input;
      return el("span", { class: "ex-gap-result" }, [
        input,
        el("span", { class: "ex-gap-mark " + (r.correct ? "is-ok" : "is-bad"), "aria-hidden": "true" }, ELM.icon(r.correct ? "check" : "x", { size: 16 })),
        r.correct ? null : el("span", { class: "ex-gap-model" }, [el("span", { class: "visually-hidden", text: "poprawnie: " }), gap.accepted[0]])
      ]);
    });
    return [
      item.context ? el("p", { class: "ex-context" }, [el("span", { class: "review-label", text: "Po polsku: " }), el("span", { text: item.context })]) : null,
      el("p", { class: "ex-prompt ex-gapfill", id: "ex-prompt", lang: "en" }, sentence),
      hints.length ? el("ul", { class: "ex-gap-hints tool-note" }, hints) : null,
      done ? null : el("p", { class: "tool-note ex-keys-hint", text: n > 1 ? "Tab przechodzi do następnej luki, Enter sprawdza." : "Enter sprawdza." })
    ];
  }

  const MATCH_HEADS = {
    definition: ["Słowo", "Definicja"],
    halves: ["Początek zdania", "Zakończenie"],
    translation: ["Po polsku", "Po angielsku"],
    response: ["Wypowiedź", "Reakcja"]
  };
  const LETTERS = "ABCDEFGH";

  /** Lewa kolumna połączona z prawą: indeks lewej albo -1. */
  function pairedLeft(st, rightId) {
    const k = Object.keys(st.pairs).find(function (i) { return st.pairs[i] === rightId; });
    return k === undefined ? -1 : Number(k);
  }

  /** Kliknięcie elementu: wybór, połączenie pary albo rozłączenie (kliknięcie połączonego elementu). */
  function matchPick(p, side, index) {
    const st = p.st;
    if (side === "left") {
      if (st.pairs[index] !== undefined) { delete st.pairs[index]; st.sel = { side: "left", index: index }; return; }
      if (st.sel && st.sel.side === "right") { link(st, index, p.right[st.sel.index].id); return; }
      st.sel = st.sel && st.sel.side === "left" && st.sel.index === index ? null : { side: "left", index: index };
      return;
    }
    const r = p.right[index];
    const owner = pairedLeft(st, r.id);
    if (owner !== -1) { delete st.pairs[owner]; st.sel = null; return; }
    if (st.sel && st.sel.side === "left") { link(st, st.sel.index, r.id); return; }
    st.sel = st.sel && st.sel.side === "right" && st.sel.index === index ? null : { side: "right", index: index };
  }

  function link(st, left, rightId) {
    const prev = pairedLeft(st, rightId);
    if (prev !== -1) delete st.pairs[prev];
    st.pairs[left] = rightId;
    st.sel = null;
  }

  /** Strzałki w kolumnie przenoszą fokus między elementami. */
  function columnKeys(e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const list = Array.prototype.slice.call(e.currentTarget.querySelectorAll("button"));
    const i = list.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    list[(i + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length].focus();
  }

  function bodyMatch(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const heads = MATCH_HEADS[item.mode] || ["Lewa kolumna", "Prawa kolumna"];
    const langL = item.mode === "translation" ? "pl" : "en";
    if (done) {
      return [
        el("p", { class: "ex-match-prompt", id: "ex-prompt", text: item.prompt || "Dopasuj pary." }),
        el("ol", { class: "ex-match-result" }, item.pairs.map(function (pair, i) {
          const ok = p.res.pairs[i];
          const chosen = st.pairs[i] !== undefined ? rightById(p, st.pairs[i]).text : "";
          return el("li", { class: ok ? "is-ok" : "is-bad" }, [
            el("span", { class: "ex-match-letter", "aria-hidden": "true", text: LETTERS[i] }),
            el("span", { class: "ex-gap-mark", "aria-hidden": "true" }, ELM.icon(ok ? "check" : "x", { size: 16 })),
            el("span", { class: "ex-match-left", lang: langL, text: pair[0] }),
            el("span", { class: "ex-match-arrow", "aria-hidden": "true", text: "–" }),
            ok ? el("span", { class: "ex-match-right", lang: "en", text: pair[1] }) : el("span", { class: "ex-match-right" }, [
              el("span", { class: "visually-hidden", text: "Twoja para: " }),
              chosen ? el("s", { class: "ex-match-wrong", lang: "en", text: chosen }) : el("span", { class: "ex-match-wrong is-empty", text: "bez pary" }),
              el("span", { class: "visually-hidden", text: ", poprawnie: " }),
              el("strong", { lang: "en", text: pair[1] })
            ])
          ]);
        }))
      ];
    }
    const repaintMatch = function (key) { repaint(key); };
    const left = item.pairs.map(function (pair, i) {
      const rid = st.pairs[i];
      const rIndex = rid !== undefined ? p.right.findIndex(function (r) { return r.id === rid; }) : -1;
      const selected = st.sel && st.sel.side === "left" && st.sel.index === i;
      return el("li", null, el("button", {
        type: "button", class: "ex-match-item" + (selected ? " is-selected" : "") + (rIndex !== -1 ? " is-paired" : ""),
        "aria-pressed": selected ? "true" : "false", "data-fk": i === 0 ? "first" : "L" + i,
        "aria-label": LETTERS[i] + ": " + pair[0] + (rIndex !== -1 ? ". Połączone z " + (rIndex + 1) + ": " + p.right[rIndex].text + ". Kliknij, żeby rozłączyć." : ""),
        onclick: function () { matchPick(p, "left", i); repaintMatch(i === 0 ? "first" : "L" + i); }
      }, [
        el("span", { class: "ex-key", "aria-hidden": "true", text: LETTERS[i] }),
        el("span", { class: "ex-match-text", lang: langL, text: pair[0] }),
        rIndex !== -1 ? el("span", { class: "ex-match-tag", "aria-hidden": "true", text: "↔ " + (rIndex + 1) }) : null
      ]));
    });
    const right = p.right.map(function (r, i) {
      const owner = pairedLeft(st, r.id);
      const selected = st.sel && st.sel.side === "right" && st.sel.index === i;
      return el("li", null, el("button", {
        type: "button", class: "ex-match-item" + (selected ? " is-selected" : "") + (owner !== -1 ? " is-paired" : ""),
        "aria-pressed": selected ? "true" : "false", "data-fk": "R" + i,
        "aria-label": (i + 1) + ": " + r.text + (owner !== -1 ? ". Połączone z " + LETTERS[owner] + ". Kliknij, żeby rozłączyć." : ""),
        onclick: function () { matchPick(p, "right", i); repaintMatch("R" + i); }
      }, [
        el("span", { class: "ex-key", "aria-hidden": "true", text: String(i + 1) }),
        el("span", { class: "ex-match-text", lang: "en", text: r.text }),
        owner !== -1 ? el("span", { class: "ex-match-tag", "aria-hidden": "true", text: "↔ " + LETTERS[owner] }) : null
      ]));
    });
    const sel = st.sel;
    const status = sel
      ? (sel.side === "left" ? "Wybrano " + LETTERS[sel.index] + ": „" + item.pairs[sel.index][0] + "”. Teraz wybierz element z prawej kolumny (cyfry 1–" + p.right.length + ")."
        : "Wybrano " + (sel.index + 1) + ": „" + p.right[sel.index].text + "”. Teraz wybierz element z lewej kolumny.")
      : "Połączono " + Object.keys(st.pairs).length + " z " + item.pairs.length + " par.";
    return [
      el("p", { class: "ex-match-prompt", id: "ex-prompt", text: item.prompt || "Dopasuj pary." }),
      el("div", { class: "ex-match" }, [
        el("div", { class: "ex-match-col" }, [el("p", { class: "field-label", id: "ex-match-l", text: heads[0] }), el("ol", { class: "ex-match-list", "aria-labelledby": "ex-match-l", onkeydown: columnKeys }, left)]),
        el("div", { class: "ex-match-col" }, [el("p", { class: "field-label", id: "ex-match-r", text: heads[1] }), el("ol", { class: "ex-match-list", "aria-labelledby": "ex-match-r", onkeydown: columnKeys }, right)])
      ]),
      el("p", { class: "tool-note ex-match-status", role: "status", "aria-live": "polite", text: status }),
      el("p", { class: "tool-note ex-keys-hint", text: "Kliknij element z lewej, potem pasujący z prawej. Strzałki przechodzą w kolumnie, cyfry wybierają element z prawej, Enter sprawdza." })
    ];
  }

  function bodyTransformation(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const lim = X().transformationLimit(item);
    const count = el("span", { class: "ex-tr-count num", id: "ex-tr-count" });
    const showCount = function () {
      const n = X().trTokens(st.text).length;
      count.textContent = n + " z " + lim[0] + "–" + lim[1] + " słów";
      count.classList.toggle("is-over", n > lim[1]);
    };
    const input = textField("input", {
      type: "text", class: "field ex-gap-input ex-tr-input" + (done ? (p.res.correct ? " is-ok" : " is-bad") : ""),
      value: st.text, disabled: done, "data-fk": "first",
      "aria-label": "Uzupełnij zdanie, używając słowa " + item.keyword, "aria-describedby": "ex-tr-count",
      oninput: function () { st.text = input.value; showCount(); }
    });
    showCount();
    return [
      el("p", { class: "ex-tr-source", lang: "en", text: item.source }),
      el("p", { class: "ex-tr-keyword" }, [el("span", { class: "visually-hidden", text: "Słowo kluczowe: " }), el("span", { class: "c1-keyword", lang: "en", text: String(item.keyword).toUpperCase() })]),
      el("p", { class: "ex-prompt ex-tr-line", id: "ex-prompt", lang: "en" }, [item.before ? item.before + " " : null, input, item.after ? " " + item.after : null]),
      el("p", { class: "tool-note" }, [count, " · słowo kluczowe bez zmian, skróty liczą się jako dwa słowa."])
    ];
  }

  function bodyTranslate(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const area = textField("textarea", {
      class: "field ex-sentence-input" + (done ? (p.res.correct ? " is-ok" : " is-bad") : ""), id: "ex-answer", rows: "3",
      disabled: done, "data-fk": "first", oninput: function () { st.text = area.value; }
    });
    area.value = st.text;
    return [
      el("p", { class: "ex-context" }, el("span", { class: "review-label", text: "Przetłumacz na angielski:" })),
      el("p", { class: "ex-prompt", id: "ex-prompt", lang: "pl", text: item.source }),
      el("label", { class: "field-label", for: "ex-answer", text: "Twoje tłumaczenie" }),
      area,
      done ? null : el("div", { class: "ex-tools" }, [
        item.hint ? el("button", { type: "button", class: "btn btn-ghost btn-small", "aria-expanded": st.hint ? "true" : "false", "aria-controls": "ex-hint",
          onclick: function () { st.hint = !st.hint; repaint("hint"); }, "data-fk": "hint" }, ELM.ui.withIcon("circle-question-mark", st.hint ? "Ukryj podpowiedź" : "Podpowiedź")) : null,
        el("span", { class: "tool-note", text: "Enter sprawdza, Shift+Enter – nowa linia." })
      ]),
      item.hint && (st.hint || done) ? el("p", { class: "ex-hint", id: "ex-hint" }, [el("span", { class: "review-label", text: "Podpowiedź: " }), el("span", { lang: "en", text: item.hint })]) : null
    ];
  }

  /** Czyta jeden tekst (dyktando) głosem en-GB / en-US w podanym tempie. */
  function speakText(owner, text, rate, onDone) {
    const s = synth();
    if (!s) return;
    stopSpeaking();
    const token = { p: owner, cancelled: false };
    speaking = token;
    const voice = englishVoices()[0] || null;
    const u = new window.SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : "en-GB";
    u.rate = rate;
    u.onend = u.onerror = function () { if (token.cancelled) return; speaking = null; onDone(); };
    s.speak(u);
  }

  function bodyDictation(p) {
    const st = p.st, done = !!p.res, item = p.item;
    const max = item.maxPlays || 3;
    if (done && p.res.skipped || !done && noEnglishVoice()) {
      return [
        el("p", { class: "visually-hidden", id: "ex-prompt", text: "Dyktando" }),
        el("div", { class: "ex-listen" }, [
          el("p", { class: "ex-listen-warn", role: "status", text: "Ta przeglądarka nie ma głosu angielskiego." }),
          el("p", { class: "tool-note ex-listen-note", text: "Dyktando wymaga syntezatora mowy. Pominięte zadanie nie liczy się do wyniku ani do statystyk." }),
          done ? null : el("button", { type: "button", class: "btn btn-secondary", "data-fk": "first", onclick: check }, ELM.ui.withIcon("arrow-right", "Pomiń"))
        ])
      ];
    }
    const playing = speaking && speaking.p === p;
    const play = function (rate, key) {
      if (!done) st.plays++;
      speakText(p, item.text, rate, function () { repaint(null); });
      repaint(key);
    };
    const used = !done && st.plays >= max;
    const controls = playing
      ? [el("button", { type: "button", class: "btn btn-secondary", "data-fk": "listen", onclick: function () { stopSpeaking(); repaint("listen"); } }, ELM.ui.withIcon("pause", "Zatrzymaj"))]
      : done
        ? [el("button", { type: "button", class: "btn btn-secondary", "data-fk": "listen", onclick: function () { play(0.9, "listen"); } }, ELM.ui.withIcon("rotate-ccw", "Odtwórz jeszcze raz"))]
        : [
          el("button", { type: "button", class: "btn btn-primary", "data-fk": "listen", disabled: used, onclick: function () { play(0.9, "listen"); } }, ELM.ui.withIcon("play", st.plays ? "Odtwórz ponownie" : "Odtwórz")),
          el("button", { type: "button", class: "btn btn-secondary", "data-fk": "slow", disabled: used, onclick: function () { play(0.7, "slow"); } }, ELM.ui.withIcon("timer", "Wolniej"))
        ];
    if (!done) controls.push(el("span", { class: "ex-listen-count", "aria-live": "polite", text: "Odsłuchy: " + Math.min(st.plays, max) + "/" + max }));
    const area = textField("textarea", {
      class: "field ex-sentence-input" + (done ? (p.res.correct ? " is-ok" : " is-bad") : ""), id: "ex-answer", rows: "3",
      disabled: done, "data-fk": st.plays || done ? "first" : "answer", oninput: function () { st.text = area.value; }
    });
    area.value = st.text;
    return [
      el("p", { class: "visually-hidden", id: "ex-prompt", text: "Dyktando: odsłuchaj zdanie i zapisz je." }),
      el("div", { class: "ex-listen" }, [
        el("div", { class: "ex-listen-controls" }, controls),
        el("p", { class: "tool-note ex-listen-note", text: "Głos syntezowany w przeglądarce. „Wolniej” też zużywa odsłuch." })
      ]),
      el("label", { class: "field-label", for: "ex-answer", text: "Zapisz, co słyszysz" }),
      area,
      done ? null : el("p", { class: "tool-note ex-keys-hint", text: "Enter sprawdza, Shift+Enter – nowa linia." })
    ];
  }

  /** Porównanie słowo po słowie z najbliższym poprawnym wariantem (translate, dictation). */
  function diffView(ops) {
    const show = function (w) { return w === "i" ? "I" : w; };
    const nodes = [];
    ops.forEach(function (o, k) {
      if (k) nodes.push(" ");
      if (o.op === "same") nodes.push(el("span", { class: "ex-diff-w", text: show(o.word) }));
      else if (o.op === "missing") nodes.push(el("span", { class: "ex-diff-w is-missing" }, [el("span", { class: "visually-hidden", text: "(brakuje: " }), el("span", { "aria-hidden": "true", text: "+" }), show(o.word), el("span", { class: "visually-hidden", text: ")" })]));
      else if (o.op === "extra") nodes.push(el("span", { class: "ex-diff-w is-extra" }, [el("span", { class: "visually-hidden", text: "(zbędne: " }), el("s", { text: show(o.got) }), el("span", { class: "visually-hidden", text: ")" })]));
      else nodes.push(el("span", { class: "ex-diff-w is-replace" }, [el("span", { class: "visually-hidden", text: "(zamiast " }), el("s", { text: show(o.got) }), el("span", { class: "visually-hidden", text: " powinno być " }), " ", el("strong", { text: show(o.word) }), el("span", { class: "visually-hidden", text: ")" })]));
    });
    const missing = ops.filter(function (o) { return o.op === "missing"; }).length;
    const extra = ops.filter(function (o) { return o.op === "extra"; }).length;
    const repl = ops.filter(function (o) { return o.op === "replace"; }).length;
    const sum = [missing ? "brakuje: " + missing : null, extra ? "zbędne: " + extra : null, repl ? "zamienione: " + repl : null].filter(Boolean).join(" · ");
    return el("div", { class: "ex-diff" }, [
      el("p", { class: "review-label", text: "Słowo po słowie" + (sum ? " (" + sum + ")" : "") + ":" }),
      el("p", { class: "ex-diff-line", lang: "en" }, nodes),
      el("p", { class: "tool-note ex-diff-legend", text: "+ brakujące słowo · przekreślone – zbędne · przekreślone i obok pogrubione – zamienione" })
    ]);
  }

  // =====================================================================
  // INFORMACJA ZWROTNA
  // =====================================================================

  /** Wzorcowa odpowiedź jako tekst. */
  function modelAnswer(item) {
    if (item.type === "multiple-choice") return item.options[item.correct];
    if (item.type === "reorder") return item.answers[0];
    if (item.type === "short-answer") return String(item.prompt).replace("___", item.accepted[0]);
    if (item.type === "gap-fill") return gapText(item, function (i) { return item.gaps[i].accepted[0]; });
    if (item.type === "match") return item.pairs.map(function (p) { return p[0] + " – " + p[1]; }).join("; ");
    if (item.type === "transformation") return [item.before, item.answers[0], item.after].filter(Boolean).join(" ");
    if (item.type === "translate") return item.accepted[0];
    if (item.type === "dictation") return item.text;
    if (item.noError) return "Zdanie jest poprawne – nie ma w nim błędu.";
    const t = item.tokens.slice();
    const fix = item.fixes[0];
    t.splice(item.errorRange[0], item.errorRange[1] - item.errorRange[0] + 1, fix);
    return t.filter(function (w) { return w !== ""; }).join(" ");
  }

  /** Tekst gap-fill z lukami {{n}} wypełnionymi funkcją fill(indeks). */
  function gapText(item, fill) {
    return String(item.text).replace(/\{\{(\d+)\}\}/g, function (m, n) { return fill(Number(n) - 1); });
  }

  /** Pary dopasowania jako tekst: tylko błędne (onlyWrong) albo wszystkie. */
  function matchText(p, onlyWrong) {
    return p.item.pairs.map(function (pair, i) {
      if (onlyWrong && p.res && p.res.pairs && p.res.pairs[i]) return null;
      const id = p.st.pairs[i];
      return pair[0] + " – " + (id !== undefined ? rightById(p, id).text : "(bez pary)");
    }).filter(Boolean).join("; ");
  }

  /** Odpowiedź użytkownika jako tekst (do listy błędów). */
  function userAnswer(p) {
    const st = p.st, item = p.item;
    if (item.type === "multiple-choice") return st.chosen === null ? "" : p.choice.options[st.chosen].text;
    if (item.type === "reorder") return st.line.map(function (t) { return t.text; }).join(" ");
    if (item.type === "short-answer") return st.text;
    if (item.type === "gap-fill") return st.texts.some(function (t) { return t && t.trim(); }) ? gapText(item, function (i) { return "[" + ((st.texts[i] || "").trim() || "…") + "]"; }) : "";
    if (item.type === "match") return Object.keys(st.pairs).length ? matchText(p, false) : "";
    if (item.type === "dictation" && p.res && p.res.skipped) return "Pominięte (brak głosu angielskiego)";
    if (item.type === "transformation" || item.type === "translate" || item.type === "dictation") return st.text.trim();
    if (st.noError) return "Brak błędu";
    if (!st.range) return "";
    return "„" + item.tokens.slice(st.range[0], st.range[1] + 1).join(" ") + "” → „" + st.fix + "”";
  }

  /** Opis zadania jednym zdaniem (lista błędów na ekranie wyników). */
  function itemSummary(item) {
    if (item.type === "multiple-choice") return String(item.prompt || "").replace(/\n/g, " / ");
    if (item.type === "reorder") return item.context ? "Ułóż: " + item.context : "Ułóż zdanie";
    if (item.type === "find-error") return item.tokens.join(" ");
    if (item.type === "gap-fill") return (item.context ? item.context + " → " : "") + gapText(item, function () { return "___"; });
    if (item.type === "match") return item.prompt || "Dopasuj pary";
    if (item.type === "transformation") return item.source + " (" + String(item.keyword).toUpperCase() + ") → " + [item.before, "___", item.after].filter(Boolean).join(" ");
    if (item.type === "translate") return "Przetłumacz: " + item.source;
    if (item.type === "dictation") return "Dyktando";
    return (item.context ? item.context + " → " : "") + item.prompt;
  }

  function feedback(p) {
    const item = p.item, res = p.res;
    const lines = [];
    let verdict = res.correct ? "Dobrze!" : "Niestety nie.";
    if (item.type === "find-error" && !res.correct) {
      if (p.st.noError) verdict = "W tym zdaniu jest błąd.";
      else if (item.noError) verdict = "To zdanie jest poprawne.";
      else if (!res.rangeOk) verdict = "Błąd był w innym miejscu: „" + item.tokens.slice(item.errorRange[0], item.errorRange[1] + 1).join(" ") + "”.";
      else verdict = "Dobry fragment, ale poprawka nie pasuje.";
    }
    if (item.type === "reorder" && !res.correct && res.diffAt >= 0) verdict = "Niestety nie – ułożenie różni się od wyrazu nr " + (res.diffAt + 1) + ".";
    if (!res.correct && res.points > 0) verdict = "Częściowo dobrze.";
    if (!res.correct && res.spelling && (item.type === "translate" || item.type === "dictation")) verdict = "Prawie – uwaga na pisownię.";
    if (res.skipped) verdict = "Pominięte – bez głosu angielskiego to zadanie nie liczy się do wyniku.";
    lines.push(el("p", { class: "lt-verdict" }, [
      el("span", { class: "c1-mark " + (res.correct ? "is-ok" : "is-bad"), "aria-hidden": "true" }, ELM.icon(res.correct ? "check" : res.skipped ? "arrow-right" : "x", { size: 14 })),
      el("strong", { text: verdict }),
      res.max > 1 ? el("span", { class: "ex-points num", text: " " + res.points + " / " + res.max + " pkt" }) : null
    ]));
    if (item.type === "short-answer" && res.spelling) lines.push(el("p", { class: "ex-spelling", text: "Uwaga na pisownię – brakuje jednej litery albo jedna jest inna." }));
    if (item.type === "gap-fill") {
      res.gaps.forEach(function (g, i) { if (g.spelling) lines.push(el("p", { class: "ex-spelling", text: "Luka " + (i + 1) + ": uwaga na pisownię – brakuje jednej litery albo jedna jest inna." })); });
    }
    if (item.type === "transformation") {
      if (res.msg) lines.push(el("p", { class: "ex-spelling", text: res.msg }));
      if (item.parts && !res.msg && !res.correct) {
        lines.push(el("p", { class: "c1-parts" }, res.parts.map(function (ok, k) {
          return el("span", { class: "c1-part " + (ok ? "is-ok" : "is-bad") }, [ELM.icon(ok ? "check" : "x", { size: 14 }), " Część " + (k + 1) + ": " + (ok ? "dobrze" : "źle")]);
        })));
      }
    }
    const sentence = item.type === "translate" || item.type === "dictation";
    if (sentence && !res.correct && res.diff) lines.push(diffView(res.diff));
    // Dopasowanie: poprawne pary widać na liście powyżej
    if ((!res.correct && item.type !== "match") || item.type === "reorder" || item.type === "find-error") {
      const model = sentence && !res.skipped ? (item.type === "translate" ? item.accepted : [item.text].concat(item.accepted || []))[res.closest || 0] : modelAnswer(item);
      lines.push(el("p", { class: "journal-row is-right" }, [el("span", { class: "review-label", text: res.skipped ? "Tekst: " : "Poprawnie: " }), el("strong", { lang: sentence ? "en" : null, text: model })]));
    }
    if (p.reviewed) lines.push(el("p", { class: "ex-journal-note is-ok" }, [ELM.icon("check", { size: 14 }), " Zaliczona powtórka z dziennika"]));
    if (p.journalLimit) lines.push(el("p", { class: "ex-journal-note", text: "Dziennik jest pełny na dziś – ten błąd zapisałem tylko w statystykach." }));
    if (item.explanation) lines.push(el("p", { text: item.explanation }));
    if (item.trap) {
      lines.push(el("div", { class: "ex-trap" }, [
        el("span", { class: "ex-trap-icon", "aria-hidden": "true" }, ELM.icon("triangle-alert", { size: 16 })),
        el("p", null, [el("strong", { text: "Pułapka: " }), item.trap])
      ]));
    }
    return lines;
  }

  // =====================================================================
  // EKRANY
  // =====================================================================

  function head(title, lead) {
    return el("header", { class: "tool-head" }, [
      el("p", { class: "tool-eyebrow" }, el("a", { href: BASE }, "Centrum ćwiczeń")),
      el("h1", { class: "tool-title", text: title }),
      lead ? el("p", { class: "tool-lead", text: lead }) : null
    ]);
  }

  function backLink() {
    if (run.exam && ELM.exams) { const b = ELM.exams.setBack(run.exam); if (b) return b; }
    const t = topicInfo(run.topic);
    return t ? { href: t.href, label: "Wróć do tematu" } : { href: BASE, label: "Wróć do Centrum ćwiczeń" };
  }

  function renderIntro(view) {
    const types = {};
    run.items.forEach(function (p) { types[p.item.type] = (types[p.item.type] || 0) + 1; });
    view.appendChild(head(run.title, run.intro));
    const score = run.saveId ? pd().setScore(run.saveId) : null;
    const modeRadio = function (value, label, hint) {
      return el("label", { class: "ex-mode" + (run.mode === value ? " is-chosen" : "") }, [
        el("input", { type: "radio", name: "ex-mode", value: value, checked: run.mode === value, onchange: function () { run.mode = value; repaint("mode-" + value); }, "data-fk": "mode-" + value }),
        el("span", null, [el("strong", { text: label }), el("span", { class: "ex-mode-hint", text: hint })])
      ]);
    };
    const t = topicInfo(run.topic);
    view.appendChild(el("section", { class: "card ex-intro" }, [
      el("p", { class: "ex-intro-count" }, [el("strong", { class: "num", text: String(run.items.length) }), " " + (run.items.length === 1 ? "zadanie" : run.items.length < 5 ? "zadania" : "zadań") + ": " + typesText(types) + "."]),
      score ? el("p", { class: "tool-note", text: "Najlepszy wynik: " + scoreText(score.best) + " · ostatni: " + scoreText(score.last) + " (" + score.last.date + ")" }) : null,
      el("fieldset", { class: "ex-modes" }, [
        el("legend", { class: "field-label", text: "Tryb" }),
        modeRadio("learn", "Nauka", "Wyjaśnienie po każdym zadaniu."),
        modeRadio("exam", "Egzamin", "Wszystkie wyjaśnienia na końcu.")
      ]),
      el("div", { class: "tool-actions" }, [
        el("button", { type: "button", class: "btn btn-primary", onclick: begin, "data-fk": "start" }, ELM.ui.withIcon("play", "Zacznij")),
        t ? el("a", { class: "btn btn-ghost", href: t.href }, "Wróć do tematu") : null,
        !t && run.exam ? el("a", { class: "btn btn-ghost", href: backLink().href }, backLink().label) : null,
        ELM.notes && run.saveId ? ELM.notes.button("set:" + run.saveId, { title: "Ćwiczenia · " + run.title, route: location.hash }) : null
      ])
    ]));
  }

  function progressDots() {
    const total = run.items.length;
    const dots = run.items.map(function (p, i) {
      let cls = "lt-dot";
      if (p.res && run.mode === "learn") cls += p.res.correct ? " is-ok" : " is-bad";
      else if (p.res) cls += " is-done";
      if (i === run.i) cls += " is-current";
      return el("li", { class: cls }, p.res && run.mode === "learn" ? ELM.icon(p.res.correct ? "check" : "x", { size: 12 }) : null);
    });
    return el("div", { class: "lt-progress ex-progress" }, [
      el("ol", { class: "lt-dots", "aria-hidden": "true" }, dots),
      el("span", { class: "progress-text", text: "Zadanie " + (run.i + 1) + " z " + total + (run.mode === "exam" ? " · tryb egzaminu" : "") })
    ]);
  }

  function renderItem(view) {
    const p = run.items[run.i];
    const done = !!p.res;
    view.appendChild(el("header", { class: "tool-head ex-head" }, [
      el("p", { class: "tool-eyebrow" }, el("a", { href: backLink().href }, run.title)),
      progressDots()
    ]));
    let body;
    if (p.item.type === "multiple-choice") body = bodyChoice(p);
    else if (p.item.type === "reorder") body = bodyReorder(p);
    else if (p.item.type === "find-error") body = bodyFindError(p);
    else if (p.item.type === "gap-fill") body = bodyGapFill(p);
    else if (p.item.type === "match") body = bodyMatch(p);
    else if (p.item.type === "transformation") body = bodyTransformation(p);
    else if (p.item.type === "translate") body = bodyTranslate(p);
    else if (p.item.type === "dictation") body = bodyDictation(p);
    else body = bodyShort(p);

    const last = run.i === run.items.length - 1;
    const primary = done
      ? el("button", { type: "button", class: "btn btn-primary ex-next", onclick: next }, last ? "Zobacz wynik" : ELM.ui.withIcon("arrow-right", "Dalej"))
      : el("button", { type: "button", class: "btn btn-primary ex-check", "data-fk": "check", onclick: check },
        run.mode === "exam" ? (last ? "Zakończ i zobacz wynik" : ELM.ui.withIcon("arrow-right", "Dalej")) : "Sprawdź");

    // Tekst do czytania (passage): na szerokim ekranie obok zadań, na wąskim zwijany
    if (run.passage) {
      view.classList.add("has-passage");
      view.appendChild(el("details", { class: "card ex-passage", open: true }, [
        el("summary", { class: "ex-passage-title" }, [ELM.icon("file-text", { size: 18 }), " Tekst do zadań"]),
        el("div", { class: "md ex-passage-text", lang: "en" }, ELM.markdown.render(ELM.markdown.parse(run.passage).blocks))
      ]));
    }
    view.appendChild(el("section", { class: "card ex-card ex-type-" + p.item.type + (done ? (p.res.correct ? " is-correct" : " is-wrong") : ""), "aria-labelledby": "ex-type" }, [
      el("h2", { class: "ex-type", id: "ex-type", text: TYPE_LABEL[p.item.type] || "Zadanie" }),
      el("div", { class: "ex-body" }, body),
      el("div", { class: "ex-status" + (done ? " lt-feedback " + (p.res.correct ? "is-ok" : "is-bad") : ""), role: "status", "aria-live": "polite" }, done ? feedback(p) : null),
      el("div", { class: "tool-actions ex-actions" }, [
        primary,
        // Przerwanie: wynik zestawu się nie zapisuje (odpowiedzi zostają w dzienniku podejść), następne wejście = ekran startowy
        el("a", { class: "btn btn-ghost", href: backLink().href, onclick: function () { run = null; } }, "Przerwij")
      ])
    ]));
  }

  const COMMENTS = [
    [100, "Komplet! Ten temat masz w małym palcu."],
    [80, "Świetnie – zostały drobiazgi do dopracowania."],
    [50, "Dobra robota. Przejrzyj błędy poniżej i spróbuj jeszcze raz."],
    [0, "Dobry początek. Wróć do tematu, a potem powtórz błędne zadania."]
  ];

  function renderDone(view) {
    const total = run.total;
    const pct = total ? Math.round(run.score / total * 100) : 0;
    let comment = COMMENTS.find(function (c) { return pct >= c[0]; })[1];
    if (run.isMix && pct < 50) comment = "Dobry początek. Zajrzyj do tematu oznaczonego „do powtórki”, a potem powtórz błędne zadania.";
    const wrong = run.items.filter(isWrong);
    view.appendChild(head(run.title + (run.retry ? " – poprawka błędów" : "")));

    const t = topicInfo(run.topic);
    const mix = mixFor(run.topic);
    const actions = [
      wrong.length ? el("button", { type: "button", class: "btn btn-primary", onclick: retryWrong }, ELM.ui.withIcon("rotate-ccw", "Powtórz tylko błędne (" + wrong.length + ")")) : null,
      el("button", { type: "button", class: "btn " + (wrong.length ? "btn-secondary" : "btn-primary"), onclick: redo }, run.isMix ? "Wylosuj nowy zestaw" : "Zrób jeszcze raz (inna kolejność)"),
      t ? el("a", { class: "btn btn-secondary", href: t.href }, "Wróć do tematu") : null,
      !run.isMix ? el("a", { class: "btn btn-ghost", href: mix ? BASE + "/mix/" + mix.id : BASE + "/mieszane" }, ELM.ui.withIcon("arrow-right", "Dalej: zestaw mieszany")) : el("a", { class: "btn btn-ghost", href: BASE }, "Centrum ćwiczeń")
    ];

    const saved = run.saved;
    view.appendChild(el("section", { class: "card ex-result", "aria-live": "polite" }, [
      el("p", { class: "ex-result-score" }, [
        el("strong", { class: "num", text: run.score + "/" + total + " pkt" }),
        el("span", { class: "ex-result-pct num", text: pct + "%" })
      ]),
      el("p", { class: "ex-result-comment", text: comment }),
      saved ? el("p", { class: "tool-note", text: saved.improved ? "Nowy najlepszy wynik!" : "Najlepszy wynik: " + scoreText(saved.best) + "." }) : null,
      run.retry ? el("p", { class: "tool-note", text: "Poprawka błędów nie zmienia zapisanego wyniku zestawu." }) : null,
      run.isMix ? topicBreakdown() : null,
      umiemBanner(),
      journalSummary(),
      el("div", { class: "tool-actions" }, actions)
    ]));

    // Wspólne nagranie zestawu: transkrypt dopiero po zakończeniu (spec 09, 3.2)
    if (run.script) {
      view.appendChild(el("details", { class: "card ex-transcript ex-set-transcript" }, [el("summary", null, "Pokaż transkrypt nagrania")].concat(
        el("div", { lang: "en" }, String(run.script).split("\n").map(function (l) { return el("p", { text: l }); })))));
    }

    view.appendChild(el("section", { class: "card ex-review" }, [
      el("h2", { class: "section-title", text: wrong.length ? "Do poprawki (" + wrong.length + ")" : "Bez błędów – brawo!" }),
      wrong.length ? el("ol", { class: "ex-wrong" }, wrong.map(function (p) {
        const mine = userAnswer(p);
        return el("li", null, [
          el("p", { class: "ex-wrong-q" }, [el("span", { class: "chip", text: TYPE_SHORT[p.item.type] }), p.res && p.res.max > 1 ? el("span", { class: "chip", text: p.res.points + "/" + p.res.max + " pkt" }) : null, " ", itemSummary(p.item)]),
          el("p", { class: "journal-row is-wrong" }, [el("span", { class: "review-label", text: "Twoja odpowiedź: " }), el("span", { text: mine || "(brak)" })]),
          el("p", { class: "journal-row is-right" }, [el("span", { class: "review-label", text: "Poprawnie: " }), el("strong", { text: modelAnswer(p.item) })]),
          p.item.explanation ? el("p", { class: "ex-wrong-expl", text: p.item.explanation }) : null,
          p.item.trap ? el("p", { class: "ex-wrong-trap" }, [el("strong", { text: "Pułapka: " }), p.item.trap]) : null
        ]);
      })) : el("p", { class: "tool-note", text: "Wszystkie odpowiedzi były poprawne." })
    ]));
  }

  function plural(n, one, few, many) { return ELM.c1 ? ELM.c1.plural(n, one, few, many) : many; }

  /** Sugestia „Umiem” (spec 03, pkt 4): dwa ostatnie podejścia do zestawu ≥ 80%; nigdy nie zaznaczamy sami. */
  function umiemSuggestion() {
    if (run.retry || run.isMix || !run.topic || !run.saved || !ELM.niezbednik) return null;
    const es = ELM.niezbednik.essentialForTopic(run.topic);
    if (!es) return null;
    const ok = ELM.stats.suggestUmiem(run.saved.recent, { isUmiem: es.done, dismissedDay: pd().umiemDismissed(run.saveId), today: ELM.learn.today() });
    return ok ? { essential: es, state: "ask" } : null;
  }

  function umiemBanner() {
    const s = run.suggest;
    if (!s) return null;
    if (s.state === "done") return el("div", { class: "ex-umiem is-done", role: "status" }, [ELM.icon("check", { size: 18 }), el("p", { text: "Zaznaczono „Umiem”. Brawo!" })]);
    if (s.state === "later") return el("div", { class: "ex-umiem", role: "status" }, el("p", { class: "tool-note", text: "W porządku – nie zapytam o ten punkt przez 14 dni." }));
    return el("div", { class: "ex-umiem", role: "status" }, [
      el("span", { class: "ex-umiem-icon", "aria-hidden": "true" }, ELM.icon("sparkles", { size: 20 })),
      el("div", { class: "ex-umiem-body" }, [
        el("p", null, [el("strong", { text: "Dobry wynik! " }), "Dwa ostatnie podejścia to co najmniej 80%. Chcesz zaznaczyć ten punkt jako „Umiem”?"]),
        el("p", { class: "ex-umiem-item", text: s.essential.text }),
        el("p", { class: "ex-journal-actions" }, [
          el("button", { type: "button", class: "btn btn-primary btn-small ex-umiem-yes", onclick: function () {
            ELM.app.setProgress(s.essential.id, true);
            s.state = "done";
            repaint(null);
          } }, ELM.ui.withIcon("check", "Zaznacz „Umiem”")),
          el("button", { type: "button", class: "btn btn-ghost btn-small", onclick: function () {
            pd().dismissUmiem(run.saveId);
            s.state = "later";
            repaint(null);
          } }, "Nie teraz")
        ])
      ])
    ]);
  }

  /** Zbiorcza informacja o dzienniku błędów: „Dodano 3 błędy do dziennika” + Zobacz / Cofnij wszystkie. */
  function journalSummary() {
    const j = run.journal;
    const created = j.added.filter(function (x) { return x.action === "create"; }).length;
    const updated = j.added.length - created;
    const lines = [];
    if (created) lines.push("Dodano " + created + " " + plural(created, "błąd", "błędy", "błędów") + " do dziennika.");
    if (updated) lines.push(updated + " " + plural(updated, "błąd był", "błędy były", "błędów było") + " już w dzienniku – " + (updated === 1 ? "jego powtórka" : "ich powtórki") + " jutro.");
    if (j.reviewed) lines.push("Zaliczone powtórki z dziennika: " + j.reviewed + ".");
    if (j.limit) lines.push("Dziennik jest pełny na dziś – kolejne błędy zapisuję tylko w statystykach.");
    const off = !pd().prefs().autoJournal && run.items.some(function (p) { return p.res && isWrong(p); });
    if (!lines.length && !off) return null;
    const box = el("div", { class: "ex-journal" }, [
      el("span", { class: "ex-journal-icon", "aria-hidden": "true" }, ELM.icon("notebook-pen", { size: 18 })),
      el("div", { class: "ex-journal-body" }, [
        lines.length ? el("p", { text: lines.join(" ") }) : null,
        off ? el("p", { class: "tool-note", text: "Automatyczne dodawanie błędów do dziennika jest wyłączone (menu profilu → Ustawienia nauki)." }) : null,
        j.added.length ? el("p", { class: "ex-journal-actions" }, [
          el("a", { class: "btn btn-secondary btn-small", href: "#/bledy" }, "Zobacz"),
          el("button", { type: "button", class: "btn btn-ghost btn-small", onclick: function () {
            j.added.slice().reverse().forEach(function (x) { pd().undoAuto(x.undo); });
            j.added = [];
            run.items.forEach(function (p) { p.journal = null; });
            if (ELM.app.refreshLearning) ELM.app.refreshLearning();
            repaint(null);
            ELM.ui.toast({ text: "Cofnięto – błędy z tej sesji nie trafiły do dziennika.", duration: 3000 });
          } }, ELM.ui.withIcon("rotate-ccw", "Cofnij wszystkie"))
        ]) : null
      ])
    ]);
    return box;
  }

  /** Trafność per temat w sesji mieszanej: „Najlepiej: …, do powtórki: …”. */
  function topicBreakdown() {
    const per = {};
    run.items.forEach(function (p) {
      if (p.res && p.res.skipped) return;
      const k = p.item.topic || "";
      per[k] = per[k] || { ok: 0, n: 0 };
      per[k].n++;
      if (p.res && p.res.correct) per[k].ok++;
    });
    const rows = Object.keys(per).map(function (k) {
      const info = topicInfo(k);
      return { name: info ? info.title : k, href: info ? info.href : null, ok: per[k].ok, n: per[k].n, r: per[k].ok / per[k].n };
    }).sort(function (a, b) { return b.r - a.r || a.n - b.n; }); // ostatni = najsłabszy (przy remisie: więcej zadań)
    if (!rows.length) return null;
    const best = rows[0], worst = rows[rows.length - 1];
    return el("div", { class: "ex-breakdown" }, [
      el("p", null, [el("span", { class: "review-label", text: "Najlepiej: " }), el("strong", { text: best.name }), " (" + best.ok + "/" + best.n + ")"]),
      worst !== best && worst.r < 1 ? el("p", null, [el("span", { class: "review-label", text: "Do powtórki: " }),
        worst.href ? el("a", { href: worst.href }, worst.name) : el("strong", { text: worst.name }), " (" + worst.ok + "/" + worst.n + ")"]) : null,
      el("ul", { class: "ex-breakdown-list" }, rows.map(function (r) {
        return el("li", null, [el("span", { text: r.name }), el("span", { class: "num", text: r.ok + "/" + r.n })]);
      }))
    ]);
  }

  /** Pierwszy gotowy mix zawierający temat (link „Dalej: zestaw mieszany”). */
  function mixFor(topic) {
    const index = ELM.CWICZENIA;
    if (!index || !topic) return null;
    return index.mixes.find(function (m) { return m.topics.indexOf(topic) !== -1; }) || null;
  }

  function retryWrong() {
    const wrong = run.items.filter(isWrong).map(function (p) { return p.item; });
    newRun(Object.assign({}, run, { items: wrong, retry: true }));
    begin();
  }

  function redo() {
    if (run.isMix && run.repick) return run.repick();
    const cfg = Object.assign({}, run, { items: X().shuffle(run.source), retry: false });
    newRun(cfg);
    begin();
  }

  // =====================================================================
  // WEJŚCIE NA ADRES
  // =====================================================================

  function loading(view, text) {
    view.appendChild(el("p", { class: "tool-note ex-loading", role: "status", text: text || "Wczytuję zadania…" }));
  }

  function missing(view, text) {
    view.appendChild(head("Nie znaleziono zestawu"));
    view.appendChild(el("div", { class: "empty-state" }, [
      el("p", { class: "empty-state-text", text: text }),
      el("p", null, el("a", { class: "btn btn-secondary", href: BASE }, "Przejdź do Centrum ćwiczeń"))
    ]));
  }

  /** Przygotowuje sesję dla adresu (po wczytaniu danych rysuje ponownie). */
  function ensureRun(route) {
    const key = route.kind + ":" + (route.id || "");
    const profile = ELM.app.getActiveProfile();
    if (run && run.key === key && run.profileId === (profile && profile.id)) return true;
    if (route.kind === "custom") return false;
    if (route.kind === "weak") { buildWeak(route, key, hrefOf(route)); return null; }
    const hash = hrefOf(route);
    if (route.kind === "set") {
      loadSets([route.id]).then(function (sets) {
        if (location.hash !== hash) return;
        if (!sets.length) { run = { key: key, missing: true, profileId: profile && profile.id }; return render(); }
        const s = sets[0];
        const meta = (ELM.CWICZENIA && ELM.CWICZENIA.sets[s.id]) || {};
        newRun({ key: key, title: s.title, intro: s.intro, items: s.items, mode: s.defaultMode, topic: s.topic, saveId: s.id, passage: s.passage || null, script: s.script || null, exam: meta.exam || null });
        render();
      });
      return null;
    }
    // Gotowy mix: losujemy z tematów mixu (bez zadań z ostatniej sesji mieszanej, gdy starcza)
    loadIndex().then(function (index) {
      const mix = index.mixes.find(function (m) { return m.id === route.id; });
      if (!mix) { run = { key: key, missing: true, profileId: profile && profile.id }; return render(); }
      const pick = function () {
        return loadTopicItems(mix.topics).then(function (pool) {
          const res = X().pickMix(pool, { count: mix.count || 10, types: mix.types, exclude: pd().lastMix(), weight: ELM.stats.mixWeight(pd().attempts()) });
          newRun({
            key: key, title: mix.title, intro: mix.description + (res.items.length < (mix.count || 10) ? " W banku jest na razie " + res.items.length + " pasujących zadań." : ""),
            items: res.items, mode: mix.mode, saveId: mix.id, isMix: true
          });
          run.repick = function () { pick().then(function () { begin(); }); };
        });
      };
      pick().then(function () { if (location.hash === hash) render(); });
    });
    return null;
  }

  /**
   * Trening słabych punktów: do 3 tematów z ≥ 5 próbami i trafnością < 70% (albo jeden wskazany temat),
   * 12 zadań, wagi: bez poprawnej odpowiedzi w ostatnich 14 dniach × 2.
   */
  function buildWeak(route, key, hash) {
    const profile = ELM.app.getActiveProfile();
    const rec = pd().attempts();
    const topics = route.id ? [route.id] : ELM.stats.weakTopics(rec).map(function (x) { return x.key; });
    const none = function (text) { run = { key: key, missing: true, missingText: text, profileId: profile && profile.id }; if (location.hash === hash) render(); };
    if (!topics.length) return none("Na razie nie widzę słabych punktów. Zrób kilka zestawów, a podpowiem, nad czym popracować.");
    const pick = function () {
      return loadTopicItems(topics).then(function (pool) {
        return X().pickMix(pool, { count: 12, weight: ELM.stats.weakWeight(pd().attempts(), ELM.learn.today()) });
      });
    };
    pick().then(function (res) {
      if (!res.items.length) return none("Do tego tematu nie ma jeszcze zadań w banku.");
      const names = topics.map(function (t) { const i = topicInfo(t); return i ? i.title : t; });
      const launch = function (r, autostart) {
        newRun({
          key: key, title: route.id ? "Ćwicz: " + names[0] : "Trening słabych punktów",
          intro: (route.id ? "Zadania z tematu, który sprawia Ci trudność. " : "Tematy: " + names.join(", ") + ". ") +
            "Częściej trafiają zadania, których ostatnio nie udało się rozwiązać.",
          items: r.items, mode: "learn", isMix: true, isWeak: true,
          repick: function () { pick().then(function (again) { launch(again, true); }); }
        });
        if (autostart) { run.phase = "item"; render(); U.setScroll(0); }
      };
      launch(res, false);
      if (location.hash === hash) render();
    });
  }

  /** Sesja z generatora (Centrum ćwiczeń): ustawia stan i przechodzi na #/cwiczenia/sesja. */
  function startCustom(cfg) {
    newRun(Object.assign({ key: "custom:", isMix: true, title: "Zestaw mieszany", saveId: null }, cfg));
    if (cfg.autostart) { run.phase = "item"; run.i = 0; }
    if (location.hash === BASE + "/sesja") render();
    else location.hash = BASE + "/sesja";
  }

  function render(route) {
    const view = document.getElementById("view");
    route = route || parseRoute(location.hash);
    if (!route) return;
    if (route.kind === "hub") return ELM.exerciseHub.render(route);
    const profile = ELM.app.getActiveProfile();
    if (run && profile && run.profileId !== profile.id) run = null; // zmiana profilu = nowa sesja
    view.className = "view tool-view ex-view";
    view.dataset.file = hrefOf(route);
    view.replaceChildren();
    document.title = "Ćwiczenia · English Levels Map";

    const ready = ensureRun(route);
    if (ready === false) {
      missing(view, "Ta sesja już się skończyła albo strona została odświeżona. Wylosuj nowy zestaw w Centrum ćwiczeń.");
      return;
    }
    if (ready === null) return loading(view);
    if (run.missing) return missing(view, run.missingText || "Tego zestawu nie ma w banku zadań.");
    document.title = run.title + " · English Levels Map";
    if (run.phase === "intro") renderIntro(view);
    else if (run.phase === "item") renderItem(view);
    else renderDone(view);
  }

  /** Wejście z innego widoku: skończona sesja zaczyna się od ekranu startowego. */
  window.addEventListener("hashchange", function () { stopSpeaking(); });

  function onEnter() {
    if (run && run.missing) { run = null; return; } // np. słabe punkty mogły się już pojawić
    if (!run || run.phase !== "done") return;
    if (/^(mix|weak):/.test(run.key)) run = null; // mix / trening: przy następnym wejściu nowe losowanie
    else if (!run.isMix) newRun(Object.assign({}, run, { items: run.source, retry: false }));
  }

  // =====================================================================
  // KLAWIATURA: Enter = Sprawdź / Dalej, cyfry 1–4 = opcje, Backspace = cofnij wyraz
  // =====================================================================

  document.addEventListener("keydown", function (e) {
    if (!run || run.phase !== "item" || e.altKey) return;
    if (!document.querySelector(".ex-view .ex-card")) return;
    const p = run.items[run.i];
    const t = e.target;
    const typing = t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type === "text"));
    // Ctrl/Cmd+Enter = Sprawdź (pola wieloliniowe: tłumaczenie, dyktando); inne skróty z Ctrl/Cmd zostają przeglądarce
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "Enter" && typing) { e.preventDefault(); check(); }
      return;
    }
    if (e.key === "Enter") {
      // Na przyciskach Enter działa natywnie; w polu tekstowym i przy opcjach = Sprawdź; Shift+Enter w polu wieloliniowym = nowa linia
      if (t && t.tagName === "BUTTON" || t && t.tagName === "A") return;
      if (e.shiftKey && t && t.tagName === "TEXTAREA") return;
      e.preventDefault();
      check();
      return;
    }
    if (p.res || typing) return;
    if (p.item.type === "match" && /^[1-9]$/.test(e.key)) {
      // Cyfry wybierają element prawej kolumny (po wybraniu lewej)
      const i = Number(e.key) - 1;
      if (i < p.right.length && p.st.sel && p.st.sel.side === "left") {
        e.preventDefault();
        matchPick(p, "right", i);
        // Fokus na następną lewą bez pary (szybkie łączenie z klawiatury); wszystkie połączone → „Sprawdź”
        const k = p.item.pairs.findIndex(function (_, j) { return p.st.pairs[j] === undefined; });
        repaint(k === -1 ? "check" : k === 0 ? "first" : "L" + k);
      }
      return;
    }
    if (p.item.type === "multiple-choice" && /^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i < p.choice.options.length) { e.preventDefault(); p.st.chosen = i; repaint(i === 0 ? "first" : "opt-" + i); }
    } else if (p.item.type === "reorder" && e.key === "Backspace" && p.st.line.length) {
      e.preventDefault();
      p.st.line.pop();
      repaint("first");
    }
  });

  // =====================================================================
  // „SPRAWDŹ SIĘ” NA STRONIE TEMATU
  // =====================================================================

  /** Karta zestawu: tytuł, liczba zadań, typy, najlepszy i ostatni wynik, „Zacznij”. */
  function setCard(meta) {
    const score = pd().setScore(meta.id);
    return el("article", { class: "card ex-set-card lvl-" + (meta.level || "A1") }, [
      el("h3", { class: "ex-set-title", text: meta.title }),
      el("p", { class: "ex-set-meta", text: meta.count + " zadań · " + typesText(meta.types) }),
      el("p", { class: "ex-set-score" + (score ? "" : " is-empty") }, score
        ? [el("span", null, ["Najlepszy: ", el("strong", { class: "num", text: scoreText(score.best) })]), el("span", null, ["Ostatni: ", el("span", { class: "num", text: scoreText(score.last) })])]
        : "Jeszcze nie rozwiązany"),
      el("a", { class: "btn btn-primary btn-small", href: BASE + "/zestaw/" + meta.id, "aria-label": (score ? "Zacznij ponownie: " : "Zacznij: ") + meta.title }, ELM.ui.withIcon("play", score ? "Zacznij ponownie" : "Zacznij"))
    ]);
  }

  /**
   * Sekcja na końcu strony tematu. Zwraca element od razu (pusty i ukryty);
   * wypełnia go po wczytaniu indeksu, jeśli temat ma zestawy albo kartę w Labie czasów.
   */
  function topicSection(topicId) {
    const box = el("section", { class: "ex-topic", "aria-labelledby": "ex-topic-title", hidden: true });
    loadIndex().then(function (index) {
      const sets = (index.topics[topicId] || []).map(function (id) { return index.sets[id]; }).filter(Boolean);
      const tense = index.tenseByTopic && index.tenseByTopic[topicId];
      if (!sets.length && !tense) return;
      box.replaceChildren();
      U.appendChildren(box, [
        el("h2", { class: "ex-topic-title", id: "ex-topic-title" }, [
          el("span", { class: "callout-icon", "aria-hidden": "true" }, ELM.icon("list-checks", { size: 20 })),
          "Sprawdź się"
        ]),
        sets.length ? el("div", { class: "ex-set-grid" }, sets.map(setCard)) : null,
        tense ? el("p", { class: "ex-topic-lab" }, el("a", { class: "btn btn-secondary", href: "#/laboratorium-czasow/" + tense.id }, ELM.ui.withIcon("flask-conical", "Zobacz na osi czasu: " + tense.name))) : null
      ]);
      box.hidden = false;
    });
    return box;
  }

  ELM.exercises = {
    BASE: BASE,
    asset: asset,
    TYPE_SHORT: TYPE_SHORT,
    parseRoute: parseRoute,
    render: render,
    onEnter: onEnter,
    loadIndex: loadIndex,
    loadSets: loadSets,
    loadTopicItems: loadTopicItems,
    startCustom: startCustom,
    topicSection: topicSection,
    setCard: setCard,
    typesText: typesText,
    topicInfo: topicInfo
  };
})(window.ELM);
