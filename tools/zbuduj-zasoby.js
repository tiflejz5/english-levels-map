/*
 * zbuduj-zasoby.js — kopiuje zasoby z paczek npm do folderu assets/,
 * żeby strona działała BEZ node_modules (GitHub Pages, otwieranie z dysku).
 *
 * Użycie (z folderu projektu, po `npm install`):
 *   npm run zasoby        (albo: node tools/zbuduj-zasoby.js)
 *
 * Co trafia do assets/:
 *   fonts/   — Fraunces (display, osie wght + opsz) i Inter (tekst, oś wght),
 *              tylko podzbiory latin i latin-ext (polskie znaki), woff2
 *   ikony.js — dane używanych ikon Lucide (ELM.ICON_NODES), rysowane przez
 *              js/icons.js bez innerHTML; lista ikon: ICONS poniżej
 *   vendor/gsap.min.js — GSAP (ładowany na żądanie przez ELM.loadGsap)
 *
 * Dodanie ikony: dopisz jej nazwę (z lucide.dev) do ICONS i uruchom skrypt.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const NM = path.join(ROOT, "node_modules");
const OUT = path.join(ROOT, "assets");

const FONTS = [
  // [paczka, plik w paczce/files, nazwa docelowa]
  ["@fontsource-variable/fraunces", "fraunces-latin-opsz-normal.woff2", "fraunces-latin.woff2"],
  ["@fontsource-variable/fraunces", "fraunces-latin-ext-opsz-normal.woff2", "fraunces-latin-ext.woff2"],
  ["@fontsource-variable/inter", "inter-latin-wght-normal.woff2", "inter-latin.woff2"],
  ["@fontsource-variable/inter", "inter-latin-ext-wght-normal.woff2", "inter-latin-ext.woff2"]
];

// Używane ikony Lucide (nazwy jak na lucide.dev)
const ICONS = [
  "sunrise", "target", "notebook-pen", "award", "menu", "x", "pencil", "check", "plus",
  "chevron-right", "chevron-left", "chevron-down", "arrow-left", "arrow-right",
  "sun", "moon", "sun-moon", "mic", "square", "download", "upload", "rotate-ccw",
  "trash", "search", "copy", "play", "pause", "timer", "circle-question-mark", "map",
  "flag", "info", "triangle-alert", "user-round", "external-link",
  "pin", "pin-off", "panel-left-open", "panel-left-close"
];

function need(file) {
  if (!fs.existsSync(file)) {
    console.error("BŁĄD: brak " + path.relative(ROOT, file) + ". Uruchom najpierw: npm install");
    process.exit(1);
  }
  return file;
}

fs.mkdirSync(path.join(OUT, "fonts"), { recursive: true });
fs.mkdirSync(path.join(OUT, "vendor"), { recursive: true });

// ---------- Fonty ----------
let fontBytes = 0;
FONTS.forEach(function (f) {
  const src = need(path.join(NM, f[0], "files", f[1]));
  fs.copyFileSync(src, path.join(OUT, "fonts", f[2]));
  fontBytes += fs.statSync(src).size;
});
// Licencje fontów (SIL OFL) obok plików
[["@fontsource-variable/fraunces", "Fraunces-LICENSE.txt"], ["@fontsource-variable/inter", "Inter-LICENSE.txt"]].forEach(function (l) {
  const src = path.join(NM, l[0], "LICENSE");
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, "fonts", l[1]));
});

// ---------- Ikony ----------
const nodes = JSON.parse(fs.readFileSync(need(path.join(NM, "lucide-static", "icon-nodes.json")), "utf8"));
const icons = {};
const missing = [];
ICONS.forEach(function (name) {
  if (nodes[name]) icons[name] = nodes[name];
  else missing.push(name);
});
if (missing.length) {
  console.error("BŁĄD: nie ma takich ikon w lucide-static: " + missing.join(", "));
  process.exit(1);
}
const lucideVersion = JSON.parse(fs.readFileSync(path.join(NM, "lucide-static", "package.json"), "utf8")).version;
fs.writeFileSync(path.join(OUT, "ikony.js"),
  "/*\n * PLIK GENEROWANY AUTOMATYCZNIE — nie edytuj ręcznie.\n" +
  " * Ikony Lucide " + lucideVersion + " (licencja ISC, https://lucide.dev), tylko używane.\n" +
  " * Odśwież poleceniem: npm run zasoby\n */\n" +
  "window.ELM = window.ELM || {};\nwindow.ELM.ICON_NODES = " + JSON.stringify(icons) + ";\n", "utf8");
const lucideLicense = path.join(NM, "lucide-static", "LICENSE");
if (fs.existsSync(lucideLicense)) fs.copyFileSync(lucideLicense, path.join(OUT, "Lucide-LICENSE.txt"));

// ---------- GSAP ----------
fs.copyFileSync(need(path.join(NM, "gsap", "dist", "gsap.min.js")), path.join(OUT, "vendor", "gsap.min.js"));
const gsapVersion = JSON.parse(fs.readFileSync(path.join(NM, "gsap", "package.json"), "utf8")).version;

console.log("Fonty: " + FONTS.length + " plików, " + Math.round(fontBytes / 1024) + " KB");
console.log("Ikony: " + Object.keys(icons).length + " (Lucide " + lucideVersion + ")");
console.log("GSAP " + gsapVersion + ": assets/vendor/gsap.min.js (ładowany tylko na żądanie)");
