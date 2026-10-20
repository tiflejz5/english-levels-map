/*
 * callouts.js — wyróżnione sekcje (callouty) i dopracowanie treści Markdown
 * (DESIGN.md, sekcja 3.7). Pliki .md zostają bez zmian: sekcje rozpoznajemy
 * po TEKŚCIE nagłówka (## H2 albo pogrubiony podtytuł „**Kluczowe myśli**”).
 *
 * Nowy callout = nowy wpis w CALLOUT_RULES (wyrażenie dla tekstu nagłówka,
 * typ → klasa .callout-<typ> w css/style.css, ikona Lucide z assets/ikony.js).
 *
 * Dodatkowo: tabele w przewijanym kontenerze z cieniami „jest więcej”.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  // Kolejność ma znaczenie: pierwsza pasująca reguła wygrywa.
  const CALLOUT_RULES = [
    { match: /^(najczęstsza pułapka|typowe błędy|pułapka)/i, type: "trap", icon: "triangle-alert", label: "Uwaga" },
    { match: /^na egzaminie c1/i, type: "exam", icon: "award", label: "Egzamin C1" },
    { match: /^(kluczowe myśli|co umiesz)/i, type: "key", icon: "sparkles", label: "Najważniejsze" },
    { match: /^(jesteś gotow|co dalej)/i, type: "next", icon: "map-pin", label: "Dalej" },
    { match: /^(przykład|kluczowe zwroty|typowe połączenia)/i, type: "examples", icon: "list-checks", label: "Przykłady" }
  ];

  function ruleFor(text) {
    const t = String(text || "").trim();
    return CALLOUT_RULES.find(function (r) { return r.match.test(t); }) || null;
  }

  function decorate(box, heading, rule) {
    box.classList.add("callout", "callout-" + rule.type);
    if (heading && !heading.querySelector(".callout-icon")) {
      heading.classList.add("callout-title");
      heading.insertBefore(ELM.utils.el("span", { class: "callout-icon", "aria-hidden": "true" }, ELM.icon(rule.icon, { size: 20 })), heading.firstChild);
    }
  }

  /** Callouty w drzewie z ELM.markdown.render (sekcje ## i podtytuły **…**). */
  function apply(root) {
    if (!root) return;
    // 1. Sekcje ## (cała sekcja to callout)
    root.querySelectorAll(".md-section").forEach(function (section) {
      if (section.classList.contains("is-answers")) return;
      const h2 = section.querySelector(":scope > h2");
      const rule = h2 && ruleFor(h2.textContent);
      if (rule) decorate(section, h2, rule);
    });
    // 2. Podtytuły **…** (callout = podtytuł + akapity aż do następnego podtytułu / nagłówka)
    root.querySelectorAll("p.md-subhead").forEach(function (sub) {
      const rule = ruleFor(sub.textContent);
      if (!rule || sub.closest(".callout")) return;
      const box = ELM.utils.el("div");
      sub.parentNode.insertBefore(box, sub);
      let n = sub;
      while (n && !(n !== sub && (n.matches && (n.matches("p.md-subhead") || /^H[1-3]$/.test(n.nodeName))))) {
        const next = n.nextElementSibling;
        box.appendChild(n);
        n = next;
      }
      decorate(box, sub, rule);
    });
    enhanceTables(root);
  }

  /**
   * Tabele: kontener .md-table-wrap przewija się w poziomie; nakładka z cieniami
   * pokazuje, że po lewej / prawej jest jeszcze treść (klasy .has-left / .has-right).
   */
  function enhanceTables(root) {
    root.querySelectorAll(".md-table-wrap").forEach(function (wrap) {
      if (wrap.parentNode.classList.contains("md-table")) return;
      const frame = ELM.utils.el("div", { class: "md-table" });
      wrap.parentNode.insertBefore(frame, wrap);
      frame.appendChild(wrap);
      wrap.setAttribute("tabindex", "0"); // przewijanie z klawiatury
      wrap.setAttribute("role", "region");
      const head = wrap.querySelector("th");
      wrap.setAttribute("aria-label", "Tabela" + (head ? ": " + head.textContent.trim() : "") + " (przewijana w poziomie)");
      const update = function () {
        const max = wrap.scrollWidth - wrap.clientWidth;
        frame.classList.toggle("has-left", wrap.scrollLeft > 2);
        frame.classList.toggle("has-right", max > 2 && wrap.scrollLeft < max - 2);
        if (max <= 2) { wrap.removeAttribute("tabindex"); } else { wrap.setAttribute("tabindex", "0"); }
      };
      wrap.addEventListener("scroll", update, { passive: true });
      if (window.ResizeObserver) new ResizeObserver(update).observe(wrap);
      requestAnimationFrame(update);
    });
  }

  ELM.callouts = { RULES: CALLOUT_RULES, apply: apply, ruleFor: ruleFor };
})(window.ELM);
