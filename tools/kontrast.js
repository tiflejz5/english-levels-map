/*
 * kontrast.js — sprawdza kontrast WCAG par tokenów w obu motywach
 * (css/style.css). Tekst: min. 4.5:1, komponenty, obramowania pól i paski: 3:1.
 *
 * Użycie (z folderu projektu):
 *   node tools/kontrast.js
 * Kod wyjścia 1, gdy któraś para nie spełnia minimum.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8");

function block(selectorStart) {
  const i = css.indexOf(selectorStart);
  if (i === -1) throw new Error("Nie znaleziono bloku: " + selectorStart);
  const open = css.indexOf("{", i), close = css.indexOf("}", open);
  const vars = {};
  css.slice(open + 1, close).replace(/--([\w-]+):\s*([^;]+);/g, function (_, k, v) { vars[k] = v.trim(); });
  return vars;
}
const light = block(":root,\n:root[data-theme=\"light\"]");
const dark = Object.assign({}, light, block(":root[data-theme=\"dark\"]"));

function parse(c) {
  c = c.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
  m = /^rgba?\(([^)]+)\)$/.exec(c);
  if (m) { const p = m[1].split(",").map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  throw new Error("Nieobsługiwany kolor: " + c);
}
function over(fg, bg) { const a = fg[3]; return [0, 1, 2].map(function (i) { return fg[i] * a + bg[i] * (1 - a); }).concat(1); }
function lum(c) {
  return [0, 1, 2].map(function (i) { const v = c[i] / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
}
function ratio(a, b) { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }

// [przedni, tło, (podkład pod półprzezroczyste tło), minimum, opis]
const pairs = [];
["bg", "surface", "surface-2", "surface-3", "empty-bg"].forEach(function (bg) {
  pairs.push(["ink", bg, null, 4.5, "tekst / " + bg]);
  pairs.push(["ink-muted", bg, null, 4.5, "tekst drugorzędny / " + bg]);
});
["uoe", "reading", "writing", "listening", "speaking", "grammar", "vocab", "other"].forEach(function (c) {
  pairs.push(["cat-" + c, "surface", null, 3, "pasek kategorii dziennika (" + c + ") / karta"]);
});
pairs.push(
  ["ink-faint", "surface", null, 4.5, "placeholder / pole"],
  ["accent", "surface", null, 4.5, "link / karta"],
  ["accent", "bg", null, 4.5, "link / tło"],
  ["accent", "surface-2", null, 4.5, "link / panel"],
  ["accent", "info-bg", "surface", 4.5, "link / ramka informacyjna"],
  ["accent", "accent-soft", "surface", 4.5, "link / wyróżnienie akcentem"],
  ["ink", "info-bg", "surface", 4.5, "tekst / ramka informacyjna"],
  ["ink", "accent-soft", "surface", 4.5, "tekst / aktywny profil"],
  ["ink", "hover", "surface-2", 4.5, "tekst / najechanie w panelu"],
  ["on-accent", "accent-bg", null, 4.5, "tekst przycisku głównego"],
  ["on-accent", "accent-hover", null, 4.5, "tekst przycisku głównego (hover)"],
  ["on-accent", "danger-bg", null, 4.5, "tekst przycisku „usuń”"],
  ["on-accent", "danger-hover", null, 4.5, "tekst przycisku „usuń” (hover)"],
  ["on-accent", "success-fill", null, 3, "znacznik ✓ / zaznaczone pole"],
  ["danger", "surface", null, 4.5, "błąd / karta"],
  ["danger", "danger-soft", "surface", 4.5, "błąd / tło błędu"],
  ["success", "surface", null, 4.5, "sukces / karta"],
  ["success", "success-soft", "surface", 4.5, "sukces / tło sukcesu"],
  ["warning", "surface", null, 4.5, "ostrzeżenie / karta"],
  ["ink", "warning-soft", "surface", 4.5, "tekst / baner ostrzeżenia"],
  ["inverse-text", "inverse-bg", null, 4.5, "słowo kluczowe (Part 4)"],
  ["line-control", "surface", null, 3, "obramowanie pola / karta"],
  ["line-control", "bg", null, 3, "obramowanie pola / tło"],
  ["line-control", "surface-2", null, 3, "obramowanie pola / panel"],
  ["success-fill", "surface", null, 3, "zaznaczony „Umiem” / karta"],
  ["focus-color", "surface", null, 3, "obwódka fokusu / karta"],
  ["focus-color", "bg", null, 3, "obwódka fokusu / tło"],
  ["focus-color", "surface-2", null, 3, "obwódka fokusu / panel"],
  ["accent-bg", "bg", null, 3, "przycisk główny / tło"],
  ["danger-bg", "surface", null, 3, "znacznik ✗ / karta"],
  ["c1-gold", "c1-navy", null, 4.5, "chip C1: złoty napis / granat"],
  ["c1-edge", "surface-2", null, 3, "chip C1: krawędź / panel"],
  ["c1-ink", "c1-soft", "surface-2", 4.5, "aktywny Certyfikat C1: tekst / tło"],
  ["ink-muted", "lvl-a1-soft", null, 4.5, "licznik „X / Y umiem” / aktywny poziom (A1)"],
  ["on-accent", "accent-bg", null, 4.5, "plakietka powtórek / tło"],
  ["on-accent", "success-fill", null, 4.5, "„Wiedziałem(am)”, etykieta „Poprawna” / tło"],
  ["on-accent", "danger-bg", null, 4.5, "etykieta „Twoja odpowiedź” / tło"],
  ["c1-gold", "c1-navy", null, 4.5, "kafel egzaminu: liczba / granat"],
  ["c1-cream", "c1-navy", null, 4.5, "kafel egzaminu: tekst / granat"],
  ["c1-cream-muted", "c1-navy", null, 4.5, "kafel egzaminu: data / granat"]
);
["a1", "a2", "b1", "b2", "c1", "c2"].forEach(function (l) {
  const L = l.toUpperCase();
  pairs.push(
    ["lvl-" + l + "-ink", "lvl-" + l + "-soft", null, 4.5, "tekst poziomu " + L + " / tło " + L],
    ["lvl-" + l + "-ink", "surface", null, 4.5, "tekst poziomu " + L + " / karta"],
    ["lvl-" + l, "lvl-" + l + "-soft", null, 3, "pasek " + L + " / tor"],
    ["lvl-" + l, "surface", null, 3, "znacznik " + L + " / karta"],
    ["lvl-" + l, "bg", null, 3, "znacznik " + L + " / tło"],
    ["on-accent", "lvl-" + l, null, 3, "ptaszek „Umiem” / wypełnienie " + L]
  );
});

let fails = 0;
let checked = 0;
[["JASNY", light], ["CIEMNY", dark]].forEach(function (theme) {
  const t = theme[1];
  const bad = [];
  pairs.forEach(function (p) {
    let b = parse(t[p[1]]);
    if (b[3] < 1) b = over(b, parse(t[p[2] || "surface"]));
    let f = parse(t[p[0]]);
    if (f[3] < 1) f = over(f, b);
    const r = ratio(f, b);
    checked++;
    if (r < p[3]) { fails++; bad.push("  ZA MAŁO " + r.toFixed(2) + " (min " + p[3] + ")  " + p[4]); }
  });
  console.log("== " + theme[0] + ": " + (pairs.length - bad.length) + "/" + pairs.length + " ok");
  bad.forEach(function (b) { console.log(b); });
});
console.log("Sprawdzone pary: " + checked + ", niezgodne: " + fails);
if (fails) process.exit(1);
