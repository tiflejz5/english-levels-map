/*
 * recorder.js — wspólne nagrywanie głosu w trenerach mówienia (paczka v6, spec 18, sekcja 2.1):
 * C1 (js/c1-speaking.js), B2, matura ustna i trening E8 (js/speaking-trainer.js).
 *
 *   ELM.recorder.create({ exam, card, hint? }) → { node, attach(timer), isRecording(), count(), destroy() }
 *
 *   - przyciski Nagraj / Zatrzymaj, odtwarzacz każdej próby, Nagraj ponownie, Usuń próbę, Pobierz
 *     (nazwa mowienie-<egzamin>-<karta>-<RRRR-MM-DD>.webm / .m4a / .ogg zależnie od przeglądarki),
 *   - do 3 prób na kartę w bieżącej sesji; po zmianie widoku nagrania znikają (URL.revokeObjectURL),
 *   - „Nagrywaj razem z timerem”: start timera = start nagrania, koniec czasu = stop (timer: ELM.speakingTrainer.makeTimer),
 *   - brak mikrofonu, odmowa albo brak MediaRecorder: komunikat, trener działa dalej,
 *   - wskaźnik „Nagrywanie 0:23” (aria-live tylko przy starcie i końcu),
 *   - NIC nie trafia do localStorage ani do sieci.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;
  const MAX = 3;

  const live = []; // aktywne rejestratory (sprzątane przy zmianie widoku)
  let withTimer = false; // wybór „razem z timerem” zapamiętany do końca wizyty

  /** Zwalnia wszystkie nagrania (zmiana widoku, nowa karta). */
  function destroyAll() { live.slice().forEach(function (r) { r.destroy(); }); }

  function mmss(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function extOf(mime) {
    if (/mp4|aac/i.test(mime)) return "m4a";
    if (/ogg/i.test(mime)) return "ogg";
    return "webm";
  }

  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "karta"; }

  function supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof window.MediaRecorder !== "undefined";
  }

  function create(opts) {
    const attempts = []; // { url, mime, blob }
    let session = null; // { recorder, stream, chunks, started, tick, discard }
    let timer = null;
    let destroyed = false;

    const status = el("p", { class: "c1-rec-status rec-status", role: "status", "aria-live": "polite" });
    const indicator = el("p", { class: "rec-indicator", hidden: true }, [el("span", { class: "rec-dot", "aria-hidden": "true" }), el("span", { class: "rec-time num", text: "Nagrywanie 0:00" })]);
    const list = el("ol", { class: "rec-list" });
    const button = el("button", { type: "button", class: "btn btn-secondary rec-btn" });
    const linkInput = el("input", { type: "checkbox", id: "rec-link-" + Math.random().toString(36).slice(2, 8), checked: withTimer, onchange: function () { withTimer = linkInput.checked; } });
    const linkRow = el("div", { class: "fc-check rec-link", hidden: true }, [linkInput, el("label", { for: linkInput.id, text: "Nagrywaj razem z timerem" })]);

    function paintButton() {
      button.classList.toggle("is-recording", !!session);
      const full = attempts.length >= MAX;
      button.disabled = !session && full;
      button.replaceChildren.apply(button, session ? ELM.ui.withIcon("square", "Zatrzymaj nagrywanie") : ELM.ui.withIcon("mic", attempts.length ? "Nagraj ponownie" : "Nagraj się"));
      if (!session && full) status.textContent = "Masz już " + MAX + " próby. Usuń jedną, żeby nagrać kolejną.";
    }

    function paintList() {
      list.replaceChildren.apply(list, attempts.map(function (a, i) {
        const name = "mowienie-" + slug(opts.exam) + "-" + slug(opts.card) + "-" + ELM.learn.today() + (attempts.length > 1 || i > 0 ? "-proba" + (i + 1) : "") + "." + extOf(a.mime);
        return el("li", { class: "rec-item" }, [
          el("span", { class: "rec-item-label", text: "Próba " + (i + 1) }),
          el("audio", { controls: true, src: a.url, "aria-label": "Próba " + (i + 1) }),
          el("span", { class: "rec-item-actions" }, [
            el("a", { class: "btn btn-secondary btn-small", href: a.url, download: name }, ELM.ui.withIcon("download", "Pobierz")),
            el("button", { type: "button", class: "btn btn-ghost btn-small", "aria-label": "Usuń próbę " + (i + 1), onclick: function () { remove(i); } }, ELM.ui.withIcon("trash", "Usuń"))
          ])
        ]);
      }));
      paintButton();
    }

    function remove(i) {
      const a = attempts.splice(i, 1)[0];
      if (a) URL.revokeObjectURL(a.url);
      status.textContent = "";
      paintList();
    }

    function stopTracks() { if (session) session.stream.getTracks().forEach(function (t) { t.stop(); }); }

    function finish() {
      if (!session) return;
      clearInterval(session.tick);
      indicator.hidden = true;
      stopTracks();
      const s = session;
      session = null;
      if (!s.discard && s.chunks.length) {
        const mime = s.recorder.mimeType || "audio/webm";
        const blob = new Blob(s.chunks, { type: mime });
        attempts.push({ url: URL.createObjectURL(blob), mime: mime, blob: blob });
        status.textContent = "Nagranie zapisane jako próba " + attempts.length + ". Zostaje tylko w tej karcie przeglądarki.";
      }
      paintList();
    }

    function start() {
      if (session || destroyed || attempts.length >= MAX) return;
      if (!supported()) {
        status.textContent = "Ta przeglądarka nie obsługuje nagrywania (albo strona nie ma do niego dostępu w tym trybie). Trener działa bez nagrywania.";
        return;
      }
      status.textContent = "Proszę o dostęp do mikrofonu…";
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        if (destroyed || session) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        session = { recorder: recorder, stream: stream, chunks: chunks, started: Date.now(), tick: null, discard: false };
        recorder.addEventListener("dataavailable", function (e) { if (e.data && e.data.size) chunks.push(e.data); });
        recorder.addEventListener("stop", finish);
        recorder.start();
        status.textContent = "Nagrywanie.";
        indicator.hidden = false;
        const time = indicator.querySelector(".rec-time");
        time.textContent = "Nagrywanie 0:00";
        session.tick = setInterval(function () {
          if (!document.contains(node)) { destroy(); return; }
          time.textContent = "Nagrywanie " + mmss(Math.round((Date.now() - session.started) / 1000));
        }, 500);
        paintButton();
      }).catch(function (err) {
        const name = err && err.name;
        status.textContent = name === "NotAllowedError" || name === "SecurityError"
          ? "Brak zgody na mikrofon. Zezwól na dostęp w ustawieniach przeglądarki, żeby się nagrać. Trener działa dalej bez nagrywania."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "Nie znaleziono mikrofonu. Podłącz go albo ćwicz bez nagrywania."
            : "Nie udało się włączyć mikrofonu" + (name ? " (" + name + ")" : "") + ". Trener działa dalej bez nagrywania.";
        paintButton();
      });
    }

    function stop() { if (session && session.recorder.state !== "inactive") session.recorder.stop(); }

    button.addEventListener("click", function () { if (session) stop(); else start(); });

    const node = el("section", { class: "card c1-rec rec", "aria-label": "Nagrywanie" }, [
      el("div", { class: "c1-rec-row" }, [
        button,
        el("span", { class: "c1-rec-hint", text: opts.hint || "Opcjonalnie: nagraj odpowiedź i odsłuchaj (do " + MAX + " prób). Nagranie zostaje tylko w tej karcie przeglądarki." })
      ]),
      linkRow,
      indicator,
      status,
      list
    ]);

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (session) { session.discard = true; clearInterval(session.tick); try { if (session.recorder.state !== "inactive") session.recorder.stop(); } catch (e) { /* już zatrzymany */ } stopTracks(); session = null; }
      attempts.splice(0).forEach(function (a) { URL.revokeObjectURL(a.url); });
      const i = live.indexOf(api);
      if (i !== -1) live.splice(i, 1);
    }

    /** Łączy z timerem (ELM.speakingTrainer.makeTimer): start timera włącza nagrywanie, koniec czasu je zatrzymuje. */
    function attach(t) {
      timer = t;
      linkRow.hidden = false;
      t.on("start", function () { if (linkInput.checked && !session) start(); });
      t.on("end", function () { if (linkInput.checked) stop(); });
    }

    const api = { node: node, attach: attach, isRecording: function () { return !!session; }, count: function () { return attempts.length; }, destroy: destroy };
    live.push(api);
    paintList();
    return api;
  }

  window.addEventListener("hashchange", destroyAll);

  ELM.recorder = { create: create, destroyAll: destroyAll, supported: supported, MAX: MAX };
})(window.ELM);
