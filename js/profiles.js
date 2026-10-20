/*
 * profiles.js — menu profilu w prawym górnym rogu i ekran powitalny.
 *
 * Przycisk (inicjał + nazwa aktywnego profilu) otwiera menu:
 *   - lista profili (aktywny zaznaczony, kliknięcie przełącza),
 *   - przy każdym profilu: zmień nazwę (w miejscu) i usuń (z potwierdzeniem),
 *   - „+ Dodaj profil” — pole z nazwą (Enter zatwierdza, Esc anuluje),
 *   - sekcja „Dane”: eksport, import i reset (logika w data-menu.js).
 *
 * Otwieranie: kliknięcie / tapnięcie (zawsze) oraz — tylko przy myszy
 * (hover: hover) and (pointer: fine) — najechanie, z krótkim opóźnieniem
 * zamykania. Zamykanie: klik poza menu, Esc, wybór akcji. Po zamknięciu
 * fokus wraca na przycisk. Strzałki ↑/↓ przechodzą między pozycjami.
 *
 * Profile tworzy użytkownik — w kodzie nie ma żadnych wbudowanych profili.
 * Bez żadnego profilu treść strony to ekran powitalny (renderWelcome).
 * Profile i postęp zapisują się tylko w tej przeglądarce (localStorage).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  const MAX_NAME = 30;
  const CLOSE_DELAY_MS = 250;

  function app() { return ELM.app; }
  function data() { return ELM.state.profiles; }

  // Stan menu
  let root = null, button = null, menu = null;
  let isOpen = false;
  let openedBy = null;      // "click" | "hover"
  let form = null;          // null | { type: "add" } | { type: "rename", id }
  let errorText = "";
  let closeTimer = null;

  const hoverQuery = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : { matches: false };

  // =====================================================================
  // NAZWY PROFILI
  // =====================================================================

  /** Sprawdza nazwę: przycięte spacje, maks. 30 znaków, bez duplikatów. */
  function validateName(raw, exceptId) {
    const name = String(raw || "").trim().replace(/\s+/g, " ");
    if (!name) return { name: name, error: "Wpisz nazwę profilu." };
    if (name.length > MAX_NAME) return { name: name, error: "Nazwa może mieć najwyżej " + MAX_NAME + " znaków." };
    const taken = (data() ? data().profiles : []).some(function (p) {
      return p.id !== exceptId && p.name.toLocaleLowerCase("pl") === name.toLocaleLowerCase("pl");
    });
    if (taken) return { name: name, error: "Profil o nazwie „" + name + "” już istnieje." };
    return { name: name, error: null };
  }

  /** Kółko z inicjałami: „Ola” → O, „Klasa 4” → K4, „Jan Nowak” → JN. */
  function avatar(profile) {
    const words = profile.name.trim().split(/\s+/);
    const initials = ((words[0] || "?")[0] + (words[1] ? words[1][0] : "")).toUpperCase();
    return el("span", { class: "avatar" + (initials.length > 1 ? " is-small-text" : ""), "aria-hidden": "true", text: initials });
  }

  // =====================================================================
  // PRZYCISK I MENU (elementy tworzone raz, potem tylko aktualizowane)
  // =====================================================================

  function ensureDom() {
    if (root) return;
    button = el("button", {
      type: "button",
      class: "profile-btn",
      id: "profile-btn",
      "aria-haspopup": "dialog",
      "aria-expanded": "false",
      "aria-controls": "profile-menu",
      onclick: onButtonClick,
      onkeydown: function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); openMenu("click", true); }
      }
    });
    menu = el("div", {
      class: "profile-menu",
      id: "profile-menu",
      role: "dialog",
      "aria-label": "Profil i dane",
      hidden: true,
      onkeydown: onMenuKey
    });
    root = el("div", { class: "profile-switcher" }, [button, menu]);
    root.addEventListener("mouseenter", onPointerEnter);
    root.addEventListener("mouseleave", onPointerLeave);
    // Fokus wychodzi z menu (np. Tab) → zamknij
    root.addEventListener("focusout", function (e) {
      const to = e.relatedTarget;
      if (isOpen && to && !root.contains(to) && !to.closest("dialog")) close(false);
    });
    document.getElementById("profile-slot").replaceChildren(root);
  }

  function render() {
    if (!data()) return;
    ensureDom();
    const active = app().getActiveProfile();
    button.replaceChildren.apply(button, active ? [
      avatar(active),
      el("span", { class: "profile-btn-text" }, [
        el("span", { class: "profile-btn-label", text: "Profil" }), " ",
        el("span", { class: "profile-btn-name", text: active.name }),
        el("span", { class: "visually-hidden", text: " – otwórz menu profilu" })
      ]),
      el("span", { class: "profile-caret", "aria-hidden": "true" }, ELM.icon("chevron-down", { size: 16 }))
    ] : [
      el("span", { class: "avatar", "aria-hidden": "true" }, ELM.icon("user-round", { size: 18 })),
      el("span", { class: "profile-btn-text" }, [
        el("span", { class: "profile-btn-name", text: "Profil" }),
        el("span", { class: "visually-hidden", text: " – brak profilu, otwórz menu" })
      ]),
      el("span", { class: "profile-caret", "aria-hidden": "true" }, ELM.icon("chevron-down", { size: 16 }))
    ]);
    button.removeAttribute("aria-label"); // nazwa z widocznego tekstu + ukryty dopisek (WCAG 2.5.3)
    button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    root.classList.toggle("is-open", isOpen);
    menu.hidden = !isOpen;
    if (isOpen) renderMenu();
  }

  function renderMenu() {
    const list = data().profiles;
    const activeId = data().activeId;
    const parts = [el("p", { class: "menu-title", text: "Profile" })];

    if (!list.length) parts.push(el("p", { class: "menu-empty", text: "Nie masz jeszcze żadnego profilu." }));

    list.forEach(function (p) {
      if (form && form.type === "rename" && form.id === p.id) {
        parts.push(nameForm({
          value: p.name,
          label: "Nowa nazwa profilu " + p.name,
          submitLabel: "Zapisz",
          onSubmit: function (raw) {
            const v = validateName(raw, p.id);
            if (v.error) return v.error;
            p.name = v.name;
            form = null;
            app().profilesChanged();
            focusInMenu('[data-profile-id="' + CSS.escape(p.id) + '"]');
            return null;
          }
        }));
        return;
      }
      const isActive = p.id === activeId;
      parts.push(el("div", { class: "profile-row" }, [
        el("button", {
          type: "button",
          class: "profile-item" + (isActive ? " is-active" : ""),
          "aria-current": isActive ? "true" : null,
          "data-profile-id": p.id,
          "data-menu-item": "",
          onclick: function () { select(p.id); }
        }, [
          avatar(p),
          el("span", { class: "profile-item-name", text: p.name }),
          el("span", { class: "profile-item-count", text: app().countDone(p.progress) + " umiem" }),
          el("span", { class: "profile-check", "aria-hidden": "true" }, isActive ? ELM.icon("check", { size: 16 }) : null)
        ]),
        el("button", {
          type: "button",
          class: "icon-btn menu-icon",
          "aria-label": "Zmień nazwę profilu " + p.name,
          "data-tooltip": "Zmień nazwę",
          "data-menu-item": "",
          onclick: function () { startForm({ type: "rename", id: p.id }); }
        }, ELM.icon("pencil", { size: 18 })),
        el("button", {
          type: "button",
          class: "icon-btn menu-icon is-danger",
          "aria-label": "Usuń profil " + p.name,
          "data-tooltip": "Usuń profil",
          "data-tooltip-align": "end",
          "data-menu-item": "",
          onclick: function () { remove(p.id); }
        }, ELM.icon("x", { size: 18 }))
      ]));
    });

    if (form && form.type === "add") {
      parts.push(nameForm({
        value: "",
        label: "Nazwa nowego profilu",
        placeholder: "np. imię lub nazwa klasy",
        submitLabel: "Dodaj",
        onSubmit: function (raw) {
          const v = validateName(raw, null);
          if (v.error) return v.error;
          form = null;
          close(true);
          app().addProfile(v.name); // nowy profil od razu aktywny
          return null;
        }
      }));
    } else {
      parts.push(el("button", {
        type: "button",
        class: "menu-action menu-add",
        "data-menu-item": "",
        onclick: function () { startForm({ type: "add" }); }
      }, ELM.ui.withIcon("plus", "Dodaj profil")));
    }

    // Sekcja „Dane”
    parts.push(el("div", { class: "menu-sep", role: "separator" }));
    parts.push(el("p", { class: "menu-title", text: "Dane" }));
    parts.push(dataAction("Eksportuj dane", function () { ELM.dataMenu.exportAll(); }, false, "download"));
    parts.push(dataAction("Importuj dane…", function () { ELM.dataMenu.importAll(); }, false, "upload"));
    parts.push(dataAction("Resetuj dane…", function () { ELM.dataMenu.resetAll(); }, true, "rotate-ccw"));
    parts.push(el("p", { class: "menu-note", text: "Dane zapisują się tylko w tej przeglądarce. Rób eksport co jakiś czas." }));

    menu.replaceChildren.apply(menu, parts);
  }

  function dataAction(label, fn, danger, iconName) {
    return el("button", {
      type: "button",
      class: "menu-action" + (danger ? " is-danger" : ""),
      "data-menu-item": "",
      onclick: function () { close(true); fn(); }
    }, iconName ? ELM.ui.withIcon(iconName, label) : label);
  }

  /** Formularz nazwy (dodawanie / zmiana nazwy). onSubmit zwraca komunikat błędu albo null. */
  function nameForm(opts) {
    const input = el("input", {
      type: "text",
      class: "field menu-input",
      value: opts.value,
      maxlength: String(MAX_NAME + 10),
      placeholder: opts.placeholder || "",
      autocomplete: "off",
      "aria-label": opts.label,
      "aria-describedby": "profile-form-error",
      "aria-invalid": errorText ? "true" : "false",
      "data-menu-item": "",
      "data-form-input": ""
    });
    const error = el("p", { class: "menu-error", id: "profile-form-error", "aria-live": "polite", text: errorText });
    return el("form", {
      class: "menu-form",
      novalidate: true,
      onsubmit: function (e) {
        e.preventDefault();
        const message = opts.onSubmit(input.value);
        if (message) {
          errorText = message;
          error.textContent = message;
          input.setAttribute("aria-invalid", "true");
          input.focus();
        }
      }
    }, [
      el("div", { class: "menu-form-row" }, [
        input,
        el("button", { type: "submit", class: "btn btn-primary btn-small", "data-menu-item": "" }, opts.submitLabel),
        el("button", { type: "button", class: "btn btn-secondary btn-small", "data-menu-item": "", onclick: cancelForm }, "Anuluj")
      ]),
      error
    ]);
  }

  // =====================================================================
  // OTWIERANIE / ZAMYKANIE
  // =====================================================================

  function focusInMenu(selector) {
    const target = selector ? menu.querySelector(selector) : null;
    (target || menu.querySelector(".profile-item.is-active") || menu.querySelector("[data-menu-item]") || button).focus();
  }

  function openMenu(by, focusFirst) {
    clearTimeout(closeTimer);
    isOpen = true;
    openedBy = by;
    form = null;
    errorText = "";
    render();
    if (focusFirst) focusInMenu();
  }

  function close(focusButton) {
    clearTimeout(closeTimer);
    if (!isOpen) return;
    isOpen = false;
    openedBy = null;
    form = null;
    errorText = "";
    render();
    if (focusButton) button.focus();
  }

  function onButtonClick(e) {
    if (isOpen && openedBy === "hover") { openedBy = "click"; return; } // przypięcie menu otwartego najechaniem
    if (isOpen) { close(true); return; }
    openMenu("click", e.detail === 0); // z klawiatury (Enter/Spacja) fokus od razu do menu
  }

  function onPointerEnter() {
    if (!hoverQuery.matches) return;
    clearTimeout(closeTimer);
    if (!isOpen) openMenu("hover", false);
  }

  function onPointerLeave() {
    if (!hoverQuery.matches || openedBy !== "hover" || form) return;
    if (root.contains(document.activeElement) && document.activeElement !== button) return;
    closeTimer = setTimeout(function () { close(false); }, CLOSE_DELAY_MS);
  }

  function startForm(f) {
    openedBy = "click";
    form = f;
    errorText = "";
    render();
    focusInMenu("[data-form-input]");
  }

  function cancelForm() {
    const was = form;
    form = null;
    errorText = "";
    render();
    focusInMenu(was && was.type === "rename" ? '[data-profile-id="' + CSS.escape(was.id) + '"]' : ".menu-add");
  }

  function onMenuKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (form) cancelForm(); else close(true);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
      if (e.target.matches("input") && (e.key === "Home" || e.key === "End")) return; // w polu: kursor
      const items = Array.prototype.slice.call(menu.querySelectorAll("[data-menu-item]"));
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      let next;
      if (e.key === "Home") next = 0;
      else if (e.key === "End") next = items.length - 1;
      else if (e.key === "ArrowDown") next = i < 0 ? 0 : (i + 1) % items.length;
      else next = i <= 0 ? items.length - 1 : i - 1;
      items[next].focus();
    }
  }

  /** Klik / tapnięcie poza menu i Esc zamykają menu (rejestrowane raz przy starcie). */
  function bindEvents() {
    function outside(e) {
      if (!isOpen) return;
      if (root.contains(e.target) || e.target.closest("dialog")) return;
      close(false);
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("touchstart", outside, { passive: true });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen && !document.querySelector("dialog[open]")) close(true);
    });
  }

  // =====================================================================
  // DZIAŁANIA NA PROFILACH
  // =====================================================================

  function select(profileId) {
    close(true);
    app().selectProfile(profileId);
  }

  function remove(profileId) {
    const list = data().profiles;
    const index = list.findIndex(function (p) { return p.id === profileId; });
    if (index === -1) return;
    const profile = list[index];
    close(false);
    ELM.dialogs.confirm({
      title: "Usunąć profil?",
      message: "Profil „" + profile.name + "” zostanie usunięty razem z jego postępem (zaznaczenia „Umiem”: " +
        app().countDone(profile.progress) + "), dziennikiem błędów, serią nauki i wynikiem testu poziomu. Tej operacji nie można cofnąć.",
      confirmLabel: "Usuń profil"
    }).then(function (ok) {
      if (ok) {
        list.splice(index, 1);
        if (ELM.profileData) ELM.profileData.removeProfile(profileId);
        if (data().activeId === profileId) {
          // Po usunięciu ostatniego profilu: brak aktywnego → ekran powitalny
          data().activeId = list.length ? list[Math.min(index, list.length - 1)].id : null;
        }
        app().profilesChanged();
      }
      if (button) button.focus();
    });
  }

  // =====================================================================
  // EKRAN POWITALNY (gdy w przeglądarce nie ma żadnego profilu)
  // =====================================================================

  function renderWelcome() {
    const view = document.getElementById("view");
    view.className = "view welcome-view";
    view.dataset.file = "#welcome";
    view.replaceChildren();
    document.title = "English Levels Map (A1–C2)";

    const input = el("input", {
      type: "text",
      id: "welcome-name",
      class: "field",
      maxlength: String(MAX_NAME + 10),
      autocomplete: "off",
      "aria-describedby": "welcome-error",
      placeholder: "np. imię, nazwa klasy albo „Mój postęp”"
    });
    const error = el("p", { class: "menu-error", id: "welcome-error", "aria-live": "polite" });
    // „Dodaj profil i zrób test poziomu” — zachęta dla nowego profilu (bez żadnych postępów)
    let thenTest = false;
    const welcomeForm = el("form", {
      class: "welcome-form",
      novalidate: true,
      onsubmit: function (e) {
        e.preventDefault();
        const v = validateName(input.value, null);
        if (v.error) { error.textContent = v.error; input.setAttribute("aria-invalid", "true"); input.focus(); thenTest = false; return; }
        const goTest = thenTest && ELM.levelTest;
        thenTest = false;
        app().addProfile(v.name);
        if (goTest) location.hash = ELM.levelTest.HASH;
      }
    }, [
      el("label", { class: "field-label", for: "welcome-name", text: "Nazwa profilu" }),
      el("div", { class: "welcome-row" }, [input, el("button", { type: "submit", class: "btn btn-primary" }, "Dodaj profil")]),
      error,
      ELM.levelTest ? el("div", { class: "welcome-test" }, [
        el("p", { class: "tool-note", text: "Nie wiesz, od którego poziomu zacząć? Po dodaniu profilu zrób szybki test poziomu (12 pytań, ok. 5 minut)." }),
        el("button", { type: "submit", class: "btn btn-secondary", onclick: function () { thenTest = true; } }, "Dodaj profil i zrób test poziomu")
      ]) : null
    ]);

    view.appendChild(el("section", { class: "card welcome", "aria-labelledby": "welcome-title" }, [
      el("h1", { id: "welcome-title", class: "welcome-title", text: "Witaj w English Levels Map" }),
      el("p", { class: "welcome-lead", text: "Mapa umiejętności z angielskiego od A1 do C2: lista tego, co warto umieć na każdym poziomie, " +
        "wyjaśnienia z przykładami i ćwiczeniami oraz przygotowanie do certyfikatu C1." }),
      el("ul", { class: "welcome-list" }, [
        el("li", { text: "Zaznaczaj „Umiem” przy opanowanych punktach i śledź postęp na każdym poziomie." }),
        el("li", { text: "Profil to osoba albo grupa, której postęp śledzisz. Możesz dodać ich więcej." }),
        el("li", { text: "Profile i postęp zapisują się tylko w tej przeglądarce – nic nie jest wysyłane." })
      ]),
      welcomeForm
    ]));
    input.focus();
  }

  ELM.profiles = {
    render: render,
    renderWelcome: renderWelcome,
    bindEvents: bindEvents,
    validateName: validateName
  };
})(window.ELM);
