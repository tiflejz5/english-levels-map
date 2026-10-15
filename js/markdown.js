/*
 * markdown.js — mały renderer Markdown (bez bibliotek), wystarczający
 * dla podstron z folderu niezbednik/:
 *   - frontmatter YAML (proste pary „klucz: wartość”),
 *   - nagłówki #…######, akapity (każda linia w nowej linii),
 *   - listy punktowane i numerowane (także zagnieżdżone wcięciem),
 *   - tabele GFM (| a | b | + wiersz | --- |),
 *   - cytaty > (każda linia osobno — dobre do dialogów),
 *   - **pogrubienie**, *kursywa*, ***oba***, `kod`, linia ---.
 *
 * BEZPIECZEŃSTWO: wynik budujemy z elementów DOM i węzłów tekstowych.
 * Surowy HTML z pliku .md NIE jest interpretowany (pokaże się jako tekst).
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const el = ELM.utils.el;

  const RE_HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
  const RE_LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  const RE_QUOTE = /^\s*>\s?(.*)$/;
  const RE_TABLE_SEP = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
  const RE_HR = /^\s*([-*_])(\s*\1){2,}\s*$/;

  // =====================================================================
  // FRONTMATTER
  // =====================================================================

  /** Oddziela frontmatter (--- … ---) od treści. Zwraca { meta, body }. */
  function parseFrontmatter(text) {
    text = String(text || "").replace(/\r\n/g, "\n");
    const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
    if (!m) return { meta: {}, body: text };
    const meta = {};
    m[1].split("\n").forEach(function (line) {
      const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
      if (!kv) return;
      let v = kv[2].trim();
      if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
      meta[kv[1]] = /^-?\d+$/.test(v) ? Number(v) : v;
    });
    return { meta: meta, body: text.slice(m[0].length) };
  }

  // =====================================================================
  // BLOKI
  // =====================================================================

  function indentOf(line) {
    return line.match(/^\s*/)[0].replace(/\t/g, "    ").length;
  }

  function isTableStart(lines, i) {
    return lines[i].trim().charAt(0) === "|" && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1]);
  }

  /** Czy linia rozpoczyna nowy blok (kończy wtedy akapit). */
  function startsBlock(lines, i) {
    const l = lines[i];
    return RE_HEADING.test(l) || RE_QUOTE.test(l) || RE_LIST.test(l) || RE_HR.test(l) || isTableStart(lines, i);
  }

  /** Zamienia linie tekstu na listę bloków (prosty „AST”). */
  function parseBlocks(lines) {
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      let m;
      if (!line.trim()) { i++; continue; }

      if ((m = RE_HEADING.exec(line))) {
        blocks.push({ type: "heading", level: m[1].length, text: m[2] });
        i++;
      } else if (RE_HR.test(line)) {
        blocks.push({ type: "hr" });
        i++;
      } else if (isTableStart(lines, i)) {
        const t = parseTable(lines, i);
        blocks.push(t.block);
        i = t.next;
      } else if (RE_QUOTE.test(line)) {
        const q = [];
        while (i < lines.length && RE_QUOTE.test(lines[i])) {
          q.push(RE_QUOTE.exec(lines[i])[1]);
          i++;
        }
        blocks.push({ type: "quote", lines: q });
      } else if (RE_LIST.test(line)) {
        const l = parseList(lines, i);
        blocks.push(l.block);
        i = l.next;
      } else {
        // Akapit: kolejne niepuste linie, aż do pustej linii lub nowego bloku
        const p = [line.trim()];
        i++;
        while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) {
          p.push(lines[i].trim());
          i++;
        }
        blocks.push({ type: "paragraph", lines: p });
      }
    }
    return blocks;
  }

  function splitRow(line) {
    let s = line.trim();
    if (s.charAt(0) === "|") s = s.slice(1);
    if (s.slice(-1) === "|") s = s.slice(0, -1);
    return s.split("|").map(function (c) { return c.trim(); });
  }

  function parseTable(lines, start) {
    const header = splitRow(lines[start]);
    const align = splitRow(lines[start + 1]).map(function (c) {
      const l = c.charAt(0) === ":", r = c.slice(-1) === ":";
      return l && r ? "center" : r ? "right" : l ? "left" : null;
    });
    const rows = [];
    let i = start + 2;
    while (i < lines.length && lines[i].trim().charAt(0) === "|") {
      const cells = splitRow(lines[i]);
      // Wyrównanie liczby komórek do nagłówka
      while (cells.length < header.length) cells.push("");
      rows.push(cells.slice(0, header.length));
      i++;
    }
    return { block: { type: "table", header: header, align: align, rows: rows }, next: i };
  }

  function parseList(lines, start) {
    const first = RE_LIST.exec(lines[start]);
    const base = indentOf(first[1]);
    const ordered = /\d/.test(first[2]);
    const block = { type: "list", ordered: ordered, start: ordered ? parseInt(first[2], 10) : 1, items: [] };
    const sameKind = function (m) { return m && indentOf(m[1]) === base && /\d/.test(m[2]) === ordered; };

    let i = start;
    while (i < lines.length) {
      let m = RE_LIST.exec(lines[i]);
      if (!lines[i].trim()) {
        // Pusta linia między punktami tej samej listy — lista trwa dalej
        let k = i + 1;
        while (k < lines.length && !lines[k].trim()) k++;
        if (k < lines.length && sameKind(RE_LIST.exec(lines[k]))) { i = k; continue; }
        break;
      }
      if (!sameKind(m)) break;

      const item = { lines: [m[3]], children: [] };
      const sub = [];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          let k = i + 1;
          while (k < lines.length && !lines[k].trim()) k++;
          if (k < lines.length && indentOf(lines[k]) > base && !sameKind(RE_LIST.exec(lines[k]))) {
            sub.push("");
            i++;
            continue;
          }
          break;
        }
        if (indentOf(l) > base) { sub.push(l); i++; continue; }      // wcięte: zawartość punktu
        if (!startsBlock(lines, i)) { item.lines.push(l.trim()); i++; continue; } // ciąg dalszy linii
        break;
      }
      if (sub.length) {
        const cut = Math.min.apply(null, sub.filter(function (s) { return s.trim(); }).map(indentOf));
        item.children = parseBlocks(sub.map(function (s) { return s.slice(Math.min(cut, indentOf(s))); }));
      }
      block.items.push(item);
    }
    return { block: block, next: i };
  }

  // =====================================================================
  // FORMATOWANIE W LINII (**pogrubienie**, *kursywa*, `kod`)
  // =====================================================================

  const PUNCT = /[\p{P}\p{S}]/u;
  const SPACE = /\s/;

  /** Tekst → fragment DOM. */
  function inline(text) {
    const frag = document.createDocumentFragment();
    String(text).split(/(`[^`]+`)/).forEach(function (part) {
      if (/^`[^`]+`$/.test(part)) frag.appendChild(el("code", { text: part.slice(1, -1) }));
      else if (part) appendEmphasis(frag, part);
    });
    return frag;
  }

  /**
   * Gwiazdki: uproszczony algorytm „delimiter runs” z CommonMark.
   * Obsługuje m.in. *She work**s** in a bank.* oraz ***THIR**ty*.
   * Podkreślenia (_) celowo NIE są formatowaniem — w ćwiczeniach „___” to luka.
   */
  function appendEmphasis(parent, text) {
    const nodes = [];
    let buf = "";
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (ch === "\\" && i + 1 < text.length && /[\\*`|#>_-]/.test(text[i + 1])) {
        buf += text[i + 1];
        i += 2;
        continue;
      }
      if (ch === "*") {
        let j = i;
        while (j < text.length && text[j] === "*") j++;
        const before = i > 0 ? text[i - 1] : " ";
        const after = j < text.length ? text[j] : " ";
        const left = !SPACE.test(after) && (!PUNCT.test(after) || SPACE.test(before) || PUNCT.test(before));
        const right = !SPACE.test(before) && (!PUNCT.test(before) || SPACE.test(after) || PUNCT.test(after));
        if (buf) { nodes.push({ t: "text", v: buf }); buf = ""; }
        nodes.push({ t: "delim", n: j - i, orig: j - i, open: left, close: right });
        i = j;
        continue;
      }
      buf += ch;
      i++;
    }
    if (buf) nodes.push({ t: "text", v: buf });

    processEmphasis(nodes);
    nodes.forEach(function (nd) { parent.appendChild(toDom(nd)); });
  }

  function processEmphasis(nodes) {
    let c = 0;
    while (c < nodes.length) {
      const closer = nodes[c];
      if (closer.t !== "delim" || !closer.close || closer.n === 0) { c++; continue; }

      // Szukamy najbliższego pasującego otwarcia
      let found = -1;
      for (let o = c - 1; o >= 0; o--) {
        const op = nodes[o];
        if (op.t !== "delim" || !op.open) continue;
        // Reguła „wielokrotności 3” z CommonMark
        if ((op.close || closer.open) && (op.orig + closer.orig) % 3 === 0 &&
            !(op.orig % 3 === 0 && closer.orig % 3 === 0)) continue;
        found = o;
        break;
      }
      if (found === -1) { c++; continue; }

      const opener = nodes[found];
      const use = opener.n >= 2 && closer.n >= 2 ? 2 : 1;
      // Niewykorzystane gwiazdki w środku stają się zwykłym tekstem
      const inner = nodes.slice(found + 1, c).map(function (nd) {
        return nd.t === "delim" ? { t: "text", v: "*".repeat(nd.n) } : nd;
      });
      nodes.splice(found + 1, c - found - 1, { t: use === 2 ? "strong" : "em", children: inner });
      c = found + 2;
      opener.n -= use;
      closer.n -= use;
      if (opener.n === 0) { nodes.splice(found, 1); c--; }
      if (closer.n === 0) nodes.splice(c, 1);
    }
    for (let k = 0; k < nodes.length; k++) {
      if (nodes[k].t === "delim") nodes[k] = { t: "text", v: "*".repeat(nodes[k].n) };
    }
  }

  function toDom(nd) {
    if (nd.t === "text") return document.createTextNode(nd.v);
    const node = el(nd.t);
    nd.children.forEach(function (ch) { node.appendChild(toDom(ch)); });
    return node;
  }

  /** Kilka linii → fragment z <br> między nimi. */
  function inlineLines(lines) {
    const frag = document.createDocumentFragment();
    lines.forEach(function (line, i) {
      if (i > 0) frag.appendChild(el("br"));
      frag.appendChild(inline(line));
    });
    return frag;
  }

  // =====================================================================
  // RYSOWANIE BLOKÓW
  // =====================================================================

  function renderBlock(b) {
    switch (b.type) {
      case "heading":
        return el("h" + b.level, null, inline(b.text));
      case "paragraph":
        return el("p", null, inlineLines(b.lines));
      case "quote":
        return el("blockquote", null, el("p", null, inlineLines(b.lines)));
      case "hr":
        return el("hr");
      case "list": {
        const list = el(b.ordered ? "ol" : "ul", { start: b.ordered && b.start !== 1 ? b.start : null });
        b.items.forEach(function (item) {
          const li = el("li", null, inline(item.lines.join(" ")));
          item.children.forEach(function (child) { li.appendChild(renderBlock(child)); });
          list.appendChild(li);
        });
        return list;
      }
      case "table": {
        const cellAttrs = function (i) { return b.align[i] ? { style: "text-align:" + b.align[i] } : null; };
        return el("div", { class: "md-table-wrap" }, el("table", null, [
          el("thead", null, el("tr", null, b.header.map(function (h, i) {
            return el("th", cellAttrs(i), inline(h));
          }))),
          el("tbody", null, b.rows.map(function (row) {
            return el("tr", null, row.map(function (c, i) { return el("td", cellAttrs(i), inline(c)); }));
          }))
        ]));
      }
    }
    return document.createTextNode("");
  }

  /**
   * Rysuje dokument. Bloki są grupowane w <section> według nagłówków ##.
   * opts.hiddenSections: nazwy sekcji (małymi literami), które mają być
   * ukryte pod przyciskiem „Pokaż odpowiedzi” (np. ["odpowiedzi"]).
   */
  function render(blocks, opts) {
    opts = opts || {};
    const hidden = (opts.hiddenSections || []).map(function (s) { return s.toLowerCase(); });
    const root = document.createDocumentFragment();
    let target = root;

    blocks.forEach(function (b) {
      if (b.type === "heading" && b.level <= 2) {
        if (b.level === 1) { root.appendChild(renderBlock(b)); target = root; return; }
        const section = el("section", { class: "md-section" }, renderBlock(b));
        root.appendChild(section);
        target = section;
        if (hidden.indexOf(b.text.trim().toLowerCase()) !== -1) {
          // Sekcja z odpowiedziami: treść ukryta pod przyciskiem
          const box = el("div", { class: "md-answers", hidden: true });
          const btn = el("button", {
            type: "button",
            class: "btn btn-secondary btn-small md-answers-toggle",
            "aria-expanded": "false",
            onclick: function () {
              const show = box.hidden;
              box.hidden = !show;
              btn.textContent = show ? "Ukryj odpowiedzi" : "Pokaż odpowiedzi";
              btn.setAttribute("aria-expanded", show ? "true" : "false");
            }
          }, "Pokaż odpowiedzi");
          section.classList.add("is-answers");
          section.appendChild(btn);
          section.appendChild(box);
          target = box;
        }
        return;
      }
      target.appendChild(renderBlock(b));
    });
    return root;
  }

  /** Pełne przetworzenie pliku .md: { meta, blocks }. */
  function parse(text) {
    const fm = parseFrontmatter(text);
    return { meta: fm.meta, blocks: parseBlocks(fm.body.split("\n")) };
  }

  ELM.markdown = {
    parse: parse,
    parseFrontmatter: parseFrontmatter,
    render: render,
    inline: inline
  };
})(window.ELM);
