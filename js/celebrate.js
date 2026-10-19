/*
 * celebrate.js — celebracje TYLKO przy kamieniach milowych (DESIGN.md, sekcja 3.3).
 *
 * Kamienie milowe (id):
 *   first-umiem, total-10/25/50/100      — liczba „Umiem” w sumie
 *   lvl-a1-25 … lvl-c2-100               — postęp poziomu 25/50/75/100% (wszystkie kategorie)
 *   streak-3/7/14/30                     — seria dni nauki
 *   first-review                         — pierwsza ukończona sesja powtórek (zdarzenie)
 *   level-test                           — ukończony test poziomu (zdarzenie)
 * Każdy pokazujemy RAZ na profil (elm_celebrated_v1, js/profile-data.js).
 * Przy pierwszym uruchomieniu u profilu z postępem już osiągnięte kamienie
 * zapisujemy bez pokazywania (żeby nie wyskoczyła seria starych gratulacji).
 *
 * Forma: karta „toast” na dole ekranu (2,8 s, zamykana kliknięciem lub Esc,
 * nie blokuje interfejsu, jedna naraz — kolejka) + drobne konfetti z kilkunastu
 * elementów DOM animowanych GSAP. Przy prefers-reduced-motion sama karta.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const SHOW_MS = 2800;
  const TOTALS = [1, 10, 25, 50, 100];
  const LEVEL_STEPS = [25, 50, 75, 100];
  const STREAKS = [3, 7, 14, 30];

  const queue = [];
  let showing = null;
  let hideTimer = null;

  function pd() { return ELM.profileData; }

  function levelName(id) {
    const level = ELM.state.content.levels.find(function (l) { return l.id === id; });
    const m = level && /^\*\*(.+?)\*\*\s*$/.exec(String(level.description || "").split("\n")[0]);
    return m ? m[1] : "";
  }

  // ---------- Teksty (krótko, konkretnie, bez przesady) ----------

  function copy(id, info) {
    if (id === "first-umiem") return { title: "Pierwsze „Umiem” na mapie", text: "Dobry początek. Każdy kolejny punkt przybliża Cię do celu.", icon: "flag" };
    if (/^total-/.test(id)) {
      const n = Number(id.slice(6));
      const text = { 10: "Pierwsza dziesiątka za Tobą.", 25: "Ćwierć setki opanowanych punktów.", 50: "Pół setki. Widać, że to działa.", 100: "Setka. To już spory kawał mapy." }[n];
      return { title: n + " punktów „Umiem”", text: text, icon: "sparkles" };
    }
    if (/^lvl-/.test(id)) {
      const lvl = id.slice(4, 6).toUpperCase(), step = Number(id.slice(7));
      const name = levelName(lvl);
      if (step === 100) {
        const next = ELM.LEVEL_IDS[ELM.LEVEL_IDS.indexOf(lvl) + 1];
        return { title: lvl + " ukończony", text: "Cały poziom " + (name ? name + " " : "") + "ma „Umiem”." + (next ? " Następny przystanek: " + next + "." : " To koniec szlaku."), icon: "flag", level: lvl };
      }
      const label = { 25: "ćwierć drogi", 50: "połowa drogi", 75: "trzy czwarte drogi" }[step];
      return { title: lvl + ": " + label, text: step + "% punktów poziomu " + (name || lvl) + " ma „Umiem”.", icon: "map-pin", level: lvl };
    }
    if (/^streak-/.test(id)) {
      const n = Number(id.slice(7));
      const t = { 3: ["3 dni z rzędu", "Rytm się zaczyna."], 7: ["Tydzień z rzędu", "Siedem dni nauki bez przerwy."], 14: ["Dwa tygodnie z rzędu", "Nauka weszła w nawyk."], 30: ["30 dni z rzędu", "Miesiąc codziennej nauki."] }[n];
      return { title: t[0], text: t[1], icon: "flame" };
    }
    if (id === "first-review") return { title: "Pierwsza sesja powtórek", text: "Błędy, które wracają, zostają w pamięci na dłużej.", icon: "rotate-ccw" };
    if (id === "level-test") {
      const lvl = info && info.level;
      return { title: "Test poziomu ukończony", text: lvl ? "Wynik orientacyjny: " + lvl + ". Od tej krainy warto zacząć." : "Wynik znajdziesz poniżej.", icon: "target", level: lvl };
    }
    return null;
  }

  // ---------- Co jest osiągnięte ----------

  /** Kamienie wynikające ze stanu (bez zdarzeń). */
  function fromState() {
    const ids = [];
    if (!ELM.state.content || !ELM.app.getActiveProfile()) return ids;
    const total = ELM.app.countDone(ELM.state.progress);
    TOTALS.forEach(function (n) { if (total >= n) ids.push(n === 1 ? "first-umiem" : "total-" + n); });
    ELM.LEVEL_IDS.forEach(function (lvl) {
      const s = ELM.app.getLevelStats(lvl);
      LEVEL_STEPS.forEach(function (step) { if (s.total && s.percent >= step) ids.push("lvl-" + lvl.toLowerCase() + "-" + step); });
    });
    const streak = ELM.learn.streak(pd().activityDays(), ELM.learn.today()).current;
    STREAKS.forEach(function (n) { if (streak >= n) ids.push("streak-" + n); });
    return ids;
  }

  /**
   * Sprawdza kamienie milowe po zdarzeniu. evt: { event: "review" } albo
   * { event: "test", level: "B1" }. Nowe kamienie trafiają do kolejki.
   */
  function check(evt) {
    if (!ELM.app || !ELM.app.getActiveProfile() || !pd()) return;
    const known = pd().celebrated();
    const now = fromState();
    if (known === null) {
      // Pierwsze uruchomienie dla profilu: zapisz bez pokazywania to, co już jest
      pd().addCelebrated(now);
      if (!evt) return;
    }
    const seen = new Set(pd().celebrated() || []);
    const fresh = now.filter(function (id) { return !seen.has(id); });
    if (evt && evt.event === "review" && !seen.has("first-review")) fresh.push("first-review");
    if (evt && evt.event === "test" && !seen.has("level-test")) fresh.push("level-test");
    if (!fresh.length) return;
    pd().addCelebrated(fresh);
    // Przy kilku naraz pokazujemy najważniejsze (ostatnie progi) — maks. 2 w kolejce
    const items = fresh.map(function (id) { return { id: id, c: copy(id, evt) }; }).filter(function (x) { return x.c; });
    pickImportant(items).forEach(function (x) { queue.push(x); });
    next();
  }

  /** Z kilku nowych kamieni wybiera do 2: najwyższy próg każdego rodzaju, ważniejsze najpierw. */
  function pickImportant(items) {
    const byKind = {};
    items.forEach(function (x) {
      const kind = x.id.replace(/-\d+$/, "").replace(/^lvl-..$/, "lvl").replace(/^first-umiem$/, "total");
      byKind[kind] = x; // późniejszy = wyższy próg (kolejność z fromState)
    });
    const order = ["level-test", "first-review", "lvl", "total", "streak"];
    return Object.keys(byKind).sort(function (a, b) {
      return order.indexOf(a.replace(/^lvl-.*/, "lvl")) - order.indexOf(b.replace(/^lvl-.*/, "lvl"));
    }).map(function (k) { return byKind[k]; }).slice(0, 2);
  }

  // ---------- Karta i konfetti ----------

  function container() {
    let box = document.getElementById("celebrations");
    if (!box) {
      box = el("div", { id: "celebrations", class: "celebrations", role: "status", "aria-live": "polite" });
      document.body.appendChild(box);
    }
    return box;
  }

  function next() {
    if (showing || !queue.length) return;
    show(queue.shift());
  }

  function hide() {
    if (!showing) return;
    clearTimeout(hideTimer);
    const card = showing;
    showing = null;
    document.removeEventListener("keydown", onKey);
    card.classList.add("is-leaving");
    setTimeout(function () { card.remove(); next(); }, ELM.reducedMotion() ? 0 : 220);
  }

  function onKey(e) { if (e.key === "Escape") hide(); }

  function show(item) {
    const c = item.c;
    const lvlClass = c.level ? " lvl-" + c.level : "";
    const card = el("div", { class: "celebration" + lvlClass + (c.level ? " has-level" : "") }, [
      el("span", { class: "celebration-icon", "aria-hidden": "true" }, ELM.icon(c.icon, { size: 22 })),
      el("div", { class: "celebration-body" }, [
        el("p", { class: "celebration-title", text: c.title }),
        el("p", { class: "celebration-text", text: c.text })
      ]),
      el("button", { type: "button", class: "icon-btn celebration-close", "aria-label": "Zamknij gratulacje", onclick: hide }, ELM.icon("x", { size: 18 }))
    ]);
    card.addEventListener("click", function (e) { if (!e.target.closest(".celebration-close")) hide(); });
    // Pauza, gdy kursor albo fokus jest na karcie
    card.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
    card.addEventListener("mouseleave", function () { hideTimer = setTimeout(hide, 1200); });
    container().appendChild(card);
    showing = card;
    document.addEventListener("keydown", onKey);
    hideTimer = setTimeout(hide, SHOW_MS);
    if (!ELM.reducedMotion()) confetti(card, c.level);
  }

  /** Drobny wybuch konfetti nad kartą (kilkanaście elementów DOM, GSAP; potem usuwane). */
  function confetti(card, level) {
    ELM.loadGsap().then(function (gsap) {
      if (!card.isConnected) return;
      const colors = level
        ? ["var(--lvl)", "var(--lvl)", "var(--lvl-ink)", "var(--c1-gold)"]
        : ["var(--lvl-a1)", "var(--lvl-a2)", "var(--lvl-b1)", "var(--lvl-b2)", "var(--lvl-c1)", "var(--lvl-c2)"];
      const burst = el("div", { class: "confetti", "aria-hidden": "true" });
      card.appendChild(burst);
      const pieces = [];
      for (let i = 0; i < 22; i++) {
        const p = el("span", { class: "confetti-piece" + (i % 3 === 0 ? " is-dot" : "") });
        p.style.background = colors[i % colors.length];
        burst.appendChild(p);
        pieces.push(p);
      }
      const tl = gsap.timeline({ onComplete: function () { burst.remove(); } });
      pieces.forEach(function (p) {
        const angle = gsap.utils.random(-160, -20) * Math.PI / 180;
        const dist = gsap.utils.random(50, 130);
        tl.fromTo(p, { x: 0, y: 0, rotation: 0, scale: gsap.utils.random(0.6, 1.1), autoAlpha: 1 }, {
          x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, rotation: gsap.utils.random(-220, 220),
          duration: gsap.utils.random(0.55, 0.8), ease: "power3.out"
        }, 0).to(p, { y: "+=" + gsap.utils.random(30, 60), autoAlpha: 0, duration: 0.5, ease: "power1.in" }, ">-0.1");
      });
    }).catch(function () { /* bez konfetti — sama karta */ });
  }

  /**
   * Przy starcie aplikacji i zmianie profilu: profil bez zapisu kamieni milowych
   * dostaje zapis tego, co już osiągnął (bez pokazywania). Nowy profil — pusty zbiór.
   */
  function baseline() {
    if (!ELM.app || !ELM.app.getActiveProfile() || !pd() || !ELM.state.content) return;
    if (pd().celebrated() === null) pd().addCelebrated(fromState());
  }

  ELM.celebrate = { check: check, hide: hide, baseline: baseline };
})(window.ELM);
