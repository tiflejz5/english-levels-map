/*
 * profiles.js — przełącznik profili w prawym górnym rogu.
 *
 * Każdy profil (np. „Adam”, „Klasa 1”) ma własne zaznaczenia „Umiem”.
 * Wybór profilu działa zawsze. Dodawanie, zmiana nazwy, kolejność
 * i usuwanie profili są dostępne tylko w trybie edycji.
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

  /** Kółko z inicjałami: „Adam” → A, „Klasa 4” → K4, „Jan Nowak” → JN. */
  function avatar(profile) {
    const words = profile.name.trim().split(/\s+/);
    const initials = ((words[0] || "?")[0] + (words[1] ? words[1][0] : "")).toUpperCase();
    return el("span", { class: "avatar" + (initials.length > 1 ? " is-small-text" : ""), "aria-hidden": "true", text: initials });
  }

  function render() {
    const bar = document.getElementById("profile-slot");
    if (!data()) { bar.replaceChildren(); return; }
    const active = app().getActiveProfile();

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
          iconBtn("✕", "Usuń profil " + p.name, function () { remove(p.id); }, { danger: true, disabled: list.length === 1 })
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
      const profile = { id: U.uid("p"), name: name, progress: {} };
      data().profiles.push(profile);
      app().selectProfile(profile.id); // nowy profil od razu aktywny
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
    if (list.length === 1) return; // zawsze musi zostać co najmniej jeden profil
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
      if (data().activeId === profileId) data().activeId = list[Math.min(index, list.length - 1)].id;
      app().profilesChanged();
    });
  }

  ELM.profiles = {
    render: render,
    bindEvents: bindEvents
  };
})(window.ELM);
