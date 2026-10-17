/*
 * profiles.js — przełącznik profili w prawym górnym rogu.
 *
 * Każdy profil (np. imię ucznia albo nazwa klasy) ma własne zaznaczenia „Umiem”.
 * Profile tworzy użytkownik — w kodzie nie ma żadnych wbudowanych profili.
 * Wybór profilu działa zawsze. Dodawanie, zmiana nazwy, kolejność
 * i usuwanie profili są dostępne tylko w trybie edycji.
 * Bez żadnego profilu w tym miejscu jest przycisk „Dodaj profil”, a w treści
 * strony ekran powitalny (renderWelcome).
 * Profile i postęp zapisują się tylko w tej przeglądarce (localStorage).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;
  const el = U.el;

  let menuOpen = false;

  function app() { return ELM.app; }
  function data() { return ELM.state.profiles; }

  // =====================================================================
  // RYSOWANIE
  // =====================================================================

  /** Kółko z inicjałami: „Ola” → O, „Klasa 4” → K4, „Jan Nowak” → JN. */
  function avatar(profile) {
    const words = profile.name.trim().split(/\s+/);
    const initials = ((words[0] || "?")[0] + (words[1] ? words[1][0] : "")).toUpperCase();
    return el("span", { class: "avatar" + (initials.length > 1 ? " is-small-text" : ""), "aria-hidden": "true", text: initials });
  }

  function render() {
    const bar = document.getElementById("profile-slot");
    if (!data()) { bar.replaceChildren(); return; }
    const active = app().getActiveProfile();
    if (!active) {
      // Brak profili: zamiast przełącznika przycisk dodawania
      menuOpen = false;
      bar.replaceChildren(el("button", { type: "button", class: "btn btn-primary btn-small", onclick: add }, "+ Dodaj profil"));
      return;
    }

    const button = el("button", {
      type: "button",
      class: "profile-btn",
      id: "profile-btn",
      "aria-haspopup": "true",
      "aria-expanded": menuOpen ? "true" : "false",
      "aria-controls": "profile-menu",
      "aria-label": "Profil: " + active.name + ". Zmień profil",
      onclick: function () { setOpen(!menuOpen); }
    }, [
      avatar(active),
      el("span", { class: "profile-btn-text" }, [
        el("span", { class: "profile-btn-label", text: "Profil" }),
        el("span", { class: "profile-btn-name", text: active.name })
      ]),
      el("span", { class: "profile-caret", "aria-hidden": "true", text: "▾" })
    ]);

    bar.replaceChildren(el("div", { class: "profile-switcher" }, [
      button,
      menuOpen ? renderMenu() : null
    ]));
  }

  function renderMenu() {
    const edit = ELM.state.editMode;
    const list = data().profiles;
    const iconBtn = ELM.render.iconBtn;

    const menu = el("div", {
      class: "profile-menu" + (edit ? " is-editing" : ""),
      id: "profile-menu",
      role: "group",
      "aria-label": "Profile"
    }, el("div", { class: "profile-menu-title", text: "Wybierz profil" }));

    list.forEach(function (p, i) {
      const isActive = p.id === data().activeId;
      menu.appendChild(el("div", { class: "profile-row" + (edit ? " edit-row" : "") }, [
        el("button", {
          type: "button",
          class: "profile-item" + (isActive ? " is-active" : ""),
          "aria-pressed": isActive ? "true" : "false",
          "data-profile-id": p.id,
          onclick: function () { select(p.id); }
        }, [
          avatar(p),
          el("span", { class: "profile-item-name", text: p.name }),
          el("span", { class: "profile-item-count", text: app().countDone(p.progress) + " umiem" }),
          el("span", { class: "profile-check", "aria-hidden": "true", text: isActive ? "✓" : "" })
        ]),
        edit ? el("div", { class: "item-controls" }, [
          iconBtn("✎", "Zmień nazwę profilu " + p.name, function () { rename(p.id); }),
          iconBtn("↑", "Przesuń profil w górę", function () { move(i, -1); }, { disabled: i === 0 }),
          iconBtn("↓", "Przesuń profil w dół", function () { move(i, 1); }, { disabled: i === list.length - 1 }),
          iconBtn("✕", "Usuń profil " + p.name, function () { remove(p.id); }, { danger: true })
        ]) : null
      ]));
    });

    if (edit) {
      menu.appendChild(el("button", {
        type: "button",
        class: "btn btn-ghost btn-small profile-add",
        onclick: add
      }, "+ Nowy profil"));
    } else {
      menu.appendChild(el("p", {
        class: "profile-menu-hint",
        text: "Aby dodać lub zmienić profile, włącz „Tryb edycji”."
      }));
    }
    return menu;
  }

  // =====================================================================
  // OTWIERANIE / ZAMYKANIE MENU
  // =====================================================================

  function setOpen(open, focusButton) {
    menuOpen = open;
    render();
    if (open) {
      const current = document.querySelector(".profile-item.is-active");
      if (current) current.focus();
    } else if (focusButton) {
      document.getElementById("profile-btn").focus();
    }
  }

  /** Zamyka menu po kliknięciu poza nim i po Esc (rejestrowane raz przy starcie). */
  function bindEvents() {
    document.addEventListener("mousedown", function (e) {
      if (!menuOpen) return;
      if (e.target.closest(".profile-switcher") || e.target.closest("dialog")) return;
      setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuOpen && !document.querySelector("dialog[open]")) {
        setOpen(false, true);
      }
    });
  }

  // =====================================================================
  // DZIAŁANIA
  // =====================================================================

  function select(profileId) {
    menuOpen = false;
    app().selectProfile(profileId);
    document.getElementById("profile-btn").focus();
  }

  function add() {
    ELM.dialogs.prompt({
      title: "Nowy profil",
      label: "Nazwa profilu",
      placeholder: "np. Klasa 7 albo imię ucznia",
      confirmLabel: "Dodaj"
    }).then(function (name) {
      if (name === null) return;
      app().addProfile(name); // nowy profil od razu aktywny
    });
  }

  function rename(profileId) {
    const profile = data().profiles.find(function (p) { return p.id === profileId; });
    if (!profile) return;
    ELM.dialogs.prompt({
      title: "Zmień nazwę profilu",
      label: "Nazwa profilu",
      value: profile.name
    }).then(function (name) {
      if (name === null) return;
      profile.name = name;
      app().profilesChanged();
    });
  }

  function move(index, dir) {
    const list = data().profiles;
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const tmp = list[index];
    list[index] = list[target];
    list[target] = tmp;
    app().profilesChanged();
  }

  function remove(profileId) {
    const list = data().profiles;
    const index = list.findIndex(function (p) { return p.id === profileId; });
    if (index === -1) return;
    const profile = list[index];
    ELM.dialogs.confirm({
      title: "Usunąć profil?",
      message: "Profil „" + profile.name + "” zostanie usunięty razem z jego postępem (zaznaczenia „Umiem”: " +
        app().countDone(profile.progress) + "). Tej operacji nie można cofnąć.",
      confirmLabel: "Usuń profil"
    }).then(function (ok) {
      if (!ok) return;
      list.splice(index, 1);
      if (data().activeId === profileId) {
        // Po usunięciu ostatniego profilu: brak aktywnego → ekran powitalny
        data().activeId = list.length ? list[Math.min(index, list.length - 1)].id : null;
      }
      if (!list.length) menuOpen = false;
      app().profilesChanged();
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
      maxlength: "60",
      autocomplete: "off",
      placeholder: "np. imię ucznia, nazwa klasy albo „Mój postęp”"
    });
    const error = el("p", { class: "dialog-error", "aria-live": "polite" });
    const form = el("form", {
      class: "welcome-form",
      novalidate: true,
      onsubmit: function (e) {
        e.preventDefault();
        const name = input.value.trim();
        if (!name) { error.textContent = "Wpisz nazwę profilu."; input.focus(); return; }
        app().addProfile(name);
      }
    }, [
      el("label", { class: "field-label", for: "welcome-name", text: "Nazwa profilu" }),
      el("div", { class: "welcome-row" }, [input, el("button", { type: "submit", class: "btn btn-primary" }, "Dodaj profil")]),
      error
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
      form
    ]));
    input.focus();
  }

  ELM.profiles = {
    render: render,
    renderWelcome: renderWelcome,
    bindEvents: bindEvents
  };
})(window.ELM);
