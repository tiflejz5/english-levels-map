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

const css = fs.readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8").replace(/\r\n/g, "\n");

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
// Sekcja „Certyfikat C1” nadpisuje część tokenów (osobno w jasnym i ciemnym motywie)
const c1Light = Object.assign({}, light, block(":root:not([data-theme=\"dark\"])[data-section=\"certyfikat\"]"));
const c1Dark = Object.assign({}, dark, block(":root[data-theme=\"dark\"][data-section=\"certyfikat\"]"));
// Sekcja „Egzamin ósmoklasisty” (turkus + żółty)
const e8Light = Object.assign({}, light, block(":root:not([data-theme=\"dark\"])[data-section=\"egzamin-osmoklasisty\"]"));
const e8Dark = Object.assign({}, dark, block(":root[data-theme=\"dark\"][data-section=\"egzamin-osmoklasisty\"]"));
// Sekcja „Matura podstawowa” (zieleń + miedź)
const mpLight = Object.assign({}, light, block(":root:not([data-theme=\"dark\"])[data-section=\"matura-podstawowa\"]"));
const mpDark = Object.assign({}, dark, block(":root[data-theme=\"dark\"][data-section=\"matura-podstawowa\"]"));
const mrLight = Object.assign({}, light, block(":root:not([data-theme=\"dark\"])[data-section=\"matura-rozszerzona\"]"));
const mrDark = Object.assign({}, dark, block(":root[data-theme=\"dark\"][data-section=\"matura-rozszerzona\"]"));
const b2Light = Object.assign({}, light, block(":root:not([data-theme=\"dark\"])[data-section=\"certyfikat-b2\"]"));
const b2Dark = Object.assign({}, dark, block(":root[data-theme=\"dark\"][data-section=\"certyfikat-b2\"]"));

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
  ["ink", "c1-soft", "surface", 4.5, "callout „Na egzaminie C1”: tekst / tło"],
  ["c1-ink", "c1-soft", "surface", 4.5, "callout „Na egzaminie C1”: link / tło"],
  ["c1-ink", "surface", null, 4.5, "chip części egzaminu / karta"],
  ["ink", "info-bg", "surface", 4.5, "callout „Życie i egzamin”: tekst / tło"],
  ["accent", "surface", null, 3, "callout „Życie i egzamin”: ikona / tło ikony"],
  ["ink", "surface", null, 4.5, "chip egzaminu („Życie i egzamin”): tekst / tło"],
  ["ink", "surface-3", null, 4.5, "chip egzaminu po najechaniu: tekst / tło"],
  ["ink-muted", "surface", null, 4.5, "karta na telefonie: etykieta kolumny / tło"],
  ["warning", "surface", null, 3, "ikona pułapki / tło ikony"],
  ["c1-cream", "c1-navy", null, 4.5, "kafel egzaminu: tekst / granat"],
  ["c1-cream-muted", "c1-navy", null, 4.5, "kafel egzaminu: data / granat"],
  ["tense-past", "surface", null, 3, "oś czasu: przeszłość / karta"],
  ["tense-present", "surface", null, 3, "oś czasu: teraźniejszość / karta"],
  ["tense-future", "surface", null, 3, "oś czasu: przyszłość / karta"],
  ["tense-past", "bg", null, 3, "oś czasu: przeszłość / tło"],
  ["tense-future", "bg", null, 3, "oś czasu: przyszłość / tło"],
  ["ink", "warning-soft", "surface", 4.5, "znajdź błąd: wyraz z błędem / tło"],
  ["accent", "accent-soft", "surface", 4.5, "wybrana opcja / wyraz: tekst / tło"],
  ["danger", "danger-soft", "surface", 4.5, "błędny wyraz / luka: tekst / tło"],
  ["success", "success-soft", "surface", 4.5, "poprawna luka: tekst / tło"],
  ["warning", "danger-soft", "surface", 4.5, "„Uwaga na pisownię” / tło błędnej odpowiedzi"],
  ["success", "danger-soft", "surface", 4.5, "„Poprawnie: …” / tło błędnej odpowiedzi"],
  ["accent", "surface-3", null, 3, "statystyki: dzień nauki / dzień bez nauki"],
  ["accent", "surface", null, 3, "statystyki: kolumna trendu / karta"],
  ["accent", "accent-soft", "surface", 3, "statystyki: pasek trafności / tor"],
  ["inverse-text", "inverse-bg", null, 4.5, "toast: tekst / tło"],
  // Okładki egzaminów (B3), pełna i kompaktowa: tło --accent-soft na --bg sekcji
  ["accent", "accent-soft", "bg", 4.5, "okładka egzaminu: kod / tło"],
  ["ink", "accent-soft", "bg", 4.5, "okładka egzaminu: nazwa i data / tło"],
  ["ink-muted", "accent-soft", "bg", 4.5, "okładka egzaminu: poziom i instytucja / tło"],
  // Pasek v8: przycisk „+N” i popover
  ["ink-muted", "surface-2", null, 4.5, "pasek: tekst „+N” i podpisy / tło panelu"],
  ["line-control", "surface-2", null, 3, "pasek: przerywany obrys „+N” / tło panelu"],
  ["ink", "surface", null, 4.5, "popover „+N”: nazwa egzaminu / tło"],
  ["ink-muted", "surface", null, 4.5, "popover „+N”: poziom i instytucja / tło"]
);
["a1", "a2", "b1", "b2", "c1", "c2"].forEach(function (l) {
  const L = l.toUpperCase();
  pairs.push(
    ["lvl-" + l + "-ink", "lvl-" + l + "-soft", null, 4.5, "tekst poziomu " + L + " / tło " + L],
    ["lvl-" + l + "-ink", "surface", null, 4.5, "tekst poziomu " + L + " / karta"],
    ["lvl-" + l, "lvl-" + l + "-soft", null, 3, "pasek " + L + " / tor"],
    ["lvl-" + l, "surface", null, 3, "znacznik " + L + " / karta"],
    ["lvl-" + l, "bg", null, 3, "znacznik " + L + " / tło"],
    ["on-accent", "lvl-" + l, null, 3, "ptaszek „Umiem” / wypełnienie " + L],
    ["lvl-" + l + "-ink", "bg", null, 4.5, "etykieta krainy " + L + " nad nagłówkiem / tło"],
    ["ink", "lvl-" + l + "-glow", "surface", 4.5, "marker słowa-klucza " + L + " / karta zadania"],
    ["lvl-" + l, "lvl-" + l + "-soft", null, 3, "symbol krainy " + L + " / plama na Szlaku"]
  );
});

let fails = 0;
let checked = 0;
[["JASNY", light], ["CIEMNY", dark], ["C1 JASNY", c1Light], ["C1 CIEMNY", c1Dark], ["E8 JASNY", e8Light], ["E8 CIEMNY", e8Dark], ["MP JASNY", mpLight], ["MP CIEMNY", mpDark], ["MR JASNY", mrLight], ["MR CIEMNY", mrDark], ["B2 JASNY", b2Light], ["B2 CIEMNY", b2Dark]].forEach(function (theme) {
  const t = theme[1];
  const bad = [];
  pairs.concat(t["exam-mark-bg"] ? [["exam-on-mark", "exam-mark-bg", null, 4.5, "plakietka wyniku egzaminu / tło"], ["exam-mark-ink", "bg", null, 4.5, "tekst w kolorze akcentu egzaminu / tło"]] : []).forEach(function (p) {
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
// Okładka mini (kafel na stronie głównej i Dziś): kolory z rejestru, poza sekcją egzaminu → pasek akcentu na --surface (3:1)
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "dane", "egzaminy-manifest.json"), "utf8"));
[["JASNY", light], ["CIEMNY", dark]].forEach(function (theme) {
  const bad = [];
  manifest.exams.forEach(function (e) {
    const bg = parse(theme[1].surface);
    if (e.existing) { // C1 bierze granat (jasny) i złoto (ciemny) z tokenów
      const rc = ratio(parse(theme[1][theme[0] === "CIEMNY" ? "c1-gold" : "c1-navy"]), bg);
      checked++;
      if (rc < 3) { fails++; bad.push("  ZA MAŁO " + rc.toFixed(2) + " (min 3)  pasek okładki mini C1 / karta"); }
      return;
    }
    if (!e.accent) return;
    const r = ratio(parse(theme[0] === "CIEMNY" ? (e.accent2 || e.accent) : e.accent), bg); // jasny: pasek w accent, ciemny: w accent2
    checked++;
    if (r < 3) { fails++; bad.push("  ZA MAŁO " + r.toFixed(2) + " (min 3)  pasek okładki mini " + e.code + " / karta"); }
  });
  // Kafelek egzaminu w pasku (kod i odliczanie, 44×44): biały tekst na kolorze egzaminu, C1: złoto i biel na granacie (4.5:1)
  manifest.exams.forEach(function (e) {
    const fg = e.existing ? theme[1]["c1-gold"] : "#ffffff";
    const bgc = e.existing ? theme[1]["c1-navy"] : e.accent;
    if (!bgc) return;
    const pairsT = e.existing ? [[theme[1]["c1-gold"], "kod C1"], ["#ffffff", "odliczanie C1"]] : [[fg, "kod i odliczanie " + e.code]];
    pairsT.forEach(function (pt) {
      const rt = ratio(parse(pt[0]), parse(bgc));
      checked++;
      if (rt < 4.5) { fails++; bad.push("  ZA MAŁO " + rt.toFixed(2) + " (min 4.5)  kafelek paska: " + pt[1] + " / tło kafelka"); }
    });
  });
  console.log("== OKŁADKI MINI " + theme[0] + ": " + (bad.length ? "błędy" : "ok"));
  bad.forEach(function (b) { console.log(b); });
});
console.log("Sprawdzone pary: " + checked + ", niezgodne: " + fails);
if (fails) process.exit(1);
