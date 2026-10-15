/*
 * utils.js — drobne funkcje pomocnicze używane w całej aplikacji.
 *
 * BEZPIECZEŃSTWO: treść wpisaną przez użytkownika wstawiamy wyłącznie
 * jako tekst (textContent / value). Nigdzie nie używamy innerHTML
 * na danych użytkownika, więc np. <script>alert(1)</script>
 * wyświetli się jako zwykły tekst.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  /**
   * Tworzy element DOM.
   *   el("button", { class: "btn", text: "OK", onclick: fn }, [dzieci])
   * - "text"     → textContent (bezpieczne)
   * - "value"    → wartość pola formularza
   * - "onXxx"    → nasłuch zdarzenia "xxx"
   * - checked/disabled/hidden → właściwości logiczne
   * - pozostałe → atrybuty HTML (null/false = pomiń)
   * Dzieci: element, tekst (zawsze jako węzeł tekstowy) lub tablica.
   */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        const value = attrs[key];
        if (key === "checked" || key === "disabled" || key === "hidden") {
          node[key] = !!value;
          return;
        }
        if (value === null || value === undefined || value === false) return;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "value") node.value = value;
        else if (key.indexOf("on") === 0 && typeof value === "function") {
          node.addEventListener(key.slice(2), value);
        } else node.setAttribute(key, value === true ? "" : String(value));
      });
    }
    appendChildren(node, children);
    return node;
  }

  /** Dokleja dzieci do rodzica; tekst zawsze jako bezpieczny węzeł tekstowy. */
  function appendChildren(parent, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) {
      children.forEach(function (c) { appendChildren(parent, c); });
      return;
    }
    if (children instanceof Node) parent.appendChild(children);
    else parent.appendChild(document.createTextNode(String(children)));
  }

  /**
   * Zamienia tekst na fragment DOM z obsługą **pogrubienia**.
   * Łamania linii zachowuje CSS (white-space: pre-wrap).
   * Każdy kawałek trafia do DOM jako tekst, więc HTML nie jest wykonywany.
   */
  function formatText(text) {
    const frag = document.createDocumentFragment();
    const parts = String(text || "").split(/\*\*([\s\S]+?)\*\*/);
    parts.forEach(function (part, i) {
      if (!part) return;
      // Nieparzyste indeksy to fragmenty pomiędzy ** **
      if (i % 2 === 1) frag.appendChild(el("strong", { text: part }));
      else frag.appendChild(document.createTextNode(part));
    });
    return frag;
  }

  /** Unikalny identyfikator: prefiks + czas + losowy ciąg, np. "t_lq2k9x8f3a". */
  function uid(prefix) {
    let rand = "";
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(2);
      window.crypto.getRandomValues(arr);
      rand = arr[0].toString(36) + arr[1].toString(36);
    } else {
      rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
    return prefix + "_" + Date.now().toString(36) + rand.slice(0, 8);
  }

  /** true, jeśli tekst jest pusty lub zawiera same spacje. */
  function isBlank(text) {
    return !text || !String(text).trim();
  }

  /** Dopasowuje wysokość pola tekstowego do treści. */
  function autoGrow(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = (textarea.scrollHeight + 2) + "px";
  }

  /** Dzisiejsza data jako RRRR-MM-DD (czas lokalny). */
  function dateStamp() {
    const d = new Date();
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /** Sprawdza, czy wartość to zwykły obiekt {…} (nie tablica, nie null). */
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Przewinięcie treści. Na komputerze przewija się <main>, a na telefonie
   * (węższy układ) cała strona — dlatego obsługujemy oba przypadki.
   */
  function getScroll() {
    const main = document.getElementById("main");
    return (main && main.scrollTop) || window.scrollY || 0;
  }

  function setScroll(y) {
    const main = document.getElementById("main");
    if (main) main.scrollTop = y;
    window.scrollTo(0, y);
  }

  ELM.utils = {
    getScroll: getScroll,
    setScroll: setScroll,
    el: el,
    appendChildren: appendChildren,
    formatText: formatText,
    uid: uid,
    isBlank: isBlank,
    autoGrow: autoGrow,
    dateStamp: dateStamp,
    isPlainObject: isPlainObject
  };
})(window.ELM);
