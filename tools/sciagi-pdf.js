/*
 * sciagi-pdf.js — drukuje ściągi poziomów do PDF i sprawdza, że każda ma dokładnie 1 stronę A4
 * (paczka v6, spec 16, sekcja 1.4). Narzędzie deweloperskie: NIE jest częścią `npm run build`.
 *
 * Wymaga Playwrighta (np. `npm i -D playwright-core` albo `npx playwright install chromium`) i przeglądarki
 * Chromium / Edge / Chrome. Strona jest otwierana z dysku (file://), więc nie trzeba uruchamiać serwera.
 *
 * Użycie (z folderu projektu):
 *   node tools/sciagi-pdf.js                 # wszystkie ściągi z niezbednik/sciagi/
 *   node tools/sciagi-pdf.js a2 b1           # wybrane poziomy
 *   node tools/sciagi-pdf.js --out tmp/pdf   # folder na PDF-y (domyślnie tmp/sciagi-pdf)
 *   node tools/sciagi-pdf.js --browser msedge  # kanał przeglądarki (msedge, chrome); domyślnie próbuje po kolei
 *
 * Raport: poziom, liczba stron, najmniejszy krój w pt (musi być ≥ 9,5 pt). Kod wyjścia 1, gdy któraś ściąga
 * ma więcej niż 1 stronę albo krój poniżej 9,5 pt — wtedy skróć treść ściągi (nie zmniejszaj kroju).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "..");
const MIN_PT = 9.5;

function loadPlaywright() {
  for (const name of ["playwright", "playwright-core"]) {
    try { return require(name); } catch (e) { /* następny */ }
  }
  console.error("Brak Playwrighta. Zainstaluj: npm i -D playwright-core (albo npx playwright install chromium).");
  process.exit(2);
}

function parseArgs(argv) {
  const opts = { levels: [], out: path.join(ROOT, "tmp", "sciagi-pdf"), browser: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") opts.out = path.resolve(argv[++i]);
    else if (argv[i] === "--browser") opts.browser = argv[++i];
    else if (/^[abc][12]$/i.test(argv[i])) opts.levels.push(argv[i].toLowerCase());
  }
  return opts;
}

async function launch(pw, preferred) {
  const channels = preferred ? [preferred] : [null, "msedge", "chrome"];
  let last = null;
  for (const channel of channels) {
    try { return await pw.chromium.launch(channel ? { channel: channel, headless: true } : { headless: true }); } catch (e) { last = e; }
  }
  console.error("Nie udało się uruchomić przeglądarki: " + (last && last.message ? last.message.split("\n")[0] : last));
  process.exit(2);
}

/** Liczba stron PDF (obiekty /Type /Page, bez /Pages). */
function pageCount(buf) {
  const m = buf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g);
  return m ? m.length : 0;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dir = path.join(ROOT, "niezbednik", "sciagi");
  const available = fs.existsSync(dir) ? fs.readdirSync(dir).filter(function (f) { return /^[abc][12]\.md$/i.test(f); }).map(function (f) { return f.slice(0, 2).toLowerCase(); }).sort() : [];
  const levels = opts.levels.length ? opts.levels : available;
  if (!levels.length) { console.error("Brak ściąg w niezbednik/sciagi/."); process.exit(2); }
  fs.mkdirSync(opts.out, { recursive: true });

  const pw = loadPlaywright();
  const browser = await launch(pw, opts.browser);
  const url = pathToFileURL(path.join(ROOT, "index.html")).href;
  let failed = false;
  console.log("Ściąga  Strony  Najmniejszy krój  PDF");
  for (const level of levels) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", function (e) { errors.push(e.message); });
    await page.goto(url + "#/" + level + "/sciaga");
    await page.waitForFunction("window.ELM && ELM.state && ELM.state.content && ELM.print && ELM.niezbednik", null, { timeout: 15000 });
    await page.evaluate("ELM.app.addProfile && !ELM.app.getActiveProfile() && ELM.app.addProfile('PDF')");
    await page.goto(url + "#/" + level + "/sciaga");
    await page.waitForSelector(".sciaga.md", { timeout: 15000 });
    await page.evaluate("document.fonts && document.fonts.ready");
    await page.evaluate("ELM.print.before()");
    await page.emulateMedia({ media: "print" });
    const file = path.join(opts.out, "sciaga-" + level + ".pdf");
    const pdf = await page.pdf({ path: file, format: "A4", margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" }, printBackground: true, preferCSSPageSize: true });
    // najmniejszy krój tekstu w ściądze (px → pt), tylko elementy z własnym tekstem
    const minPt = await page.evaluate(function () {
      let min = Infinity;
      const root = document.querySelector(".sciaga-view");
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (!n.nodeValue.trim()) continue;
        const e = n.parentElement;
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || !e.getClientRects().length) continue;
        min = Math.min(min, parseFloat(cs.fontSize) * 0.75);
      }
      return min;
    });
    await ctx.close();
    const pages = pageCount(pdf);
    const ok = pages === 1 && minPt >= MIN_PT - 0.05 && !errors.length;
    if (!ok) failed = true;
    console.log(level.toUpperCase().padEnd(8) + String(pages).padEnd(8) + (minPt.toFixed(1) + " pt").padEnd(18) + path.relative(ROOT, file) + (ok ? "" : "   ← " + (pages !== 1 ? "więcej niż 1 strona; skróć treść" : minPt < MIN_PT ? "krój poniżej 9,5 pt" : errors[0])));
  }
  await browser.close();
  console.log(failed ? "\nBŁĄD: nie wszystkie ściągi mieszczą się na 1 stronie A4." : "\nOK: każda ściąga ma 1 stronę A4, krój ≥ " + MIN_PT + " pt.");
  process.exit(failed ? 1 : 0);
}

main().catch(function (e) { console.error(e); process.exit(2); });
