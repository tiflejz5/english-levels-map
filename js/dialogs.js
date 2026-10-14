/*
 * dialogs.js — proste okna dialogowe (potwierdzenie, pytanie o tekst,
 * komunikat) zbudowane na elemencie <dialog>.
 * Zastępują systemowe confirm()/prompt(), żeby pasowały wyglądem.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const el = ELM.utils.el;
  let counter = 0;

  /**
   * Otwiera okno. Opcje:
   *   title, body (element/tekst/tablica), className,
   *   actions: [{ label, value, variant, autofocus }],
   *   cancelValue: wartość zwracana po Esc
   * Zwraca { element, close(value), result: Promise }.
   */
  function open(opts) {
    const titleId = "dlg-title-" + (++counter);
    const previousFocus = document.activeElement;
    let resolveFn;
    const result = new Promise(function (resolve) { resolveFn = resolve; });
    let closed = false;

    const dialog = el("dialog", {
      class: "dialog " + (opts.className || ""),
      "aria-labelledby": titleId
    });

    function close(value) {
      if (closed) return;
      closed = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      // Przywróć fokus tam, gdzie był przed otwarciem okna
      if (previousFocus && document.contains(previousFocus) && previousFocus.focus) previousFocus.focus();
      resolveFn(value);
    }

    const actions = (opts.actions || []).map(function (a) {
      return el("button", {
        type: "button",
        class: "btn " + (a.variant || "btn-secondary"),
        autofocus: a.autofocus || null,
        onclick: function () {
          if (typeof a.onClick === "function") {
            // onClick może zwrócić false, żeby nie zamykać okna (np. błąd walidacji)
            if (a.onClick() === false) return;
          }
          close(a.value);
        }
      }, a.label);
    });

    dialog.appendChild(el("div", { class: "dialog-inner" }, [
      el("h2", { class: "dialog-title", id: titleId, text: opts.title || "" }),
      el("div", { class: "dialog-body" }, opts.body || null),
      actions.length ? el("div", { class: "dialog-actions" }, actions) : null
    ]));

    // Esc → anuluj
    dialog.addEventListener("cancel", function (e) {
      e.preventDefault();
      close(opts.cancelValue);
    });

    document.body.appendChild(dialog);
    dialog.showModal();
    return { element: dialog, close: close, result: result };
  }

  /** Okno potwierdzenia. Zwraca Promise<true|false>. */
  function confirm(opts) {
    return open({
      title: opts.title || "Na pewno?",
      body: el("p", { text: opts.message || "" }),
      cancelValue: false,
      actions: [
        { label: opts.cancelLabel || "Anuluj", value: false, variant: "btn-secondary", autofocus: true },
        { label: opts.confirmLabel || "Usuń", value: true, variant: opts.danger === false ? "btn-primary" : "btn-danger-solid" }
      ]
    }).result;
  }

  /** Okno z polem tekstowym. Zwraca Promise<string|null> (null = anulowano). */
  function prompt(opts) {
    const input = el("input", {
      type: "text",
      class: "field",
      value: opts.value || "",
      placeholder: opts.placeholder || "",
      "aria-label": opts.label || opts.title
    });
    const error = el("p", { class: "dialog-error", "aria-live": "polite" });

    function validate() {
      if (!input.value.trim()) {
        error.textContent = "To pole nie może być puste.";
        input.focus();
        return false;
      }
      return true;
    }

    const dlg = open({
      title: opts.title,
      body: [
        opts.label ? el("label", { class: "field-label", text: opts.label }) : null,
        input,
        error
      ],
      cancelValue: null,
      actions: [
        { label: "Anuluj", value: null },
        { label: opts.confirmLabel || "Zapisz", variant: "btn-primary", onClick: validate, value: "__input__" }
      ]
    });

    // Enter zatwierdza
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (validate()) dlg.close("__input__");
      }
    });
    input.focus();
    input.select();

    return dlg.result.then(function (value) {
      return value === "__input__" ? input.value.trim() : null;
    });
  }

  /** Zwykły komunikat z przyciskiem OK. */
  function alert(opts) {
    return open({
      title: opts.title,
      body: el("p", { text: opts.message || "" }),
      cancelValue: true,
      actions: [{ label: "OK", value: true, variant: "btn-primary", autofocus: true }]
    }).result;
  }

  ELM.dialogs = { open: open, confirm: confirm, prompt: prompt, alert: alert };
})(window.ELM);
