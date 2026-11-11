/*
 * e2e-start.js — testy przeglądarkowe poprawek przed startem (spec v7 14, P1, P3, P4, P5, P6).
 *
 *   node tools/e2e-start.js            (albo: npm run e2e)
 *
 * Wymaga pakietu playwright-core (np. `npm i --no-save playwright-core`) i przeglądarki Chromium / Chrome / Edge.
 * Ścieżkę przeglądarki można podać w CHROME_PATH. Bez pakietu albo przeglądarki skrypt kończy się komunikatem
 * i kodem 0 (nie blokuje `npm run build`, którego nie dotyczy). Serwer statyczny (bez zależności) startuje sam.
 */
"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function findBrowser() {
  const env = process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  const home = os.homedir();
  const cands = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ];
  const pw = path.join(home, "AppData", "Local", "ms-playwright");
  if (fs.existsSync(pw)) {
    fs.readdirSync(pw).filter(function (d) { return /^chromium-\d+$/.test(d); }).sort().reverse().forEach(function (d) {
      cands.unshift(path.join(pw, d, "chrome-win64", "chrome.exe"), path.join(pw, d, "chrome-linux", "chrome"));
    });
  }
  return cands.find(function (p) { return fs.existsSync(p); }) || null;
}

let pw = null;
try { pw = require("playwright-core"); } catch (e) { try { pw = require("playwright"); } catch (e2) { pw = null; } }
const exe = findBrowser();
if (!pw || !exe) {
  console.log("E2E: pomijam (" + (!pw ? "brak pakietu playwright-core" : "brak przeglądarki, ustaw CHROME_PATH") + ").");
  process.exit(0);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".md": "text/markdown" };
const server = http.createServer(function (req, res) {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("nie ma"); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

let passed = 0;
const failures = [];
async function test(name, fn) {
  try { await fn(); passed++; console.log("  ok  " + name); } catch (e) { failures.push(name); console.log("  BŁĄD " + name + "\n       " + e.message); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }

async function main() {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  const URL = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await pw.chromium.launch({ executablePath: exe, headless: true });

  async function session(w, h, withProfile) {
    const ctx = await browser.newContext({ viewport: { width: w || 1280, height: h || 800 } });
    await ctx.addInitScript(function (profile) {
      if (localStorage.getItem("e2e_seeded")) return;
      localStorage.setItem("e2e_seeded", "1");
      if (profile) localStorage.setItem("elm_profiles_v1", JSON.stringify({ version: 2, activeId: "p_e2e", profiles: [{ id: "p_e2e", name: "Test Claude", progress: {} }] }));
    }, !!withProfile);
    const page = await ctx.newPage();
    page.errs = [];
    page.on("pageerror", function (e) { page.errs.push(e.message); });
    return { ctx: ctx, page: page };
  }
  async function visit(page, hash, wait) { await page.goto(URL + hash); await page.reload(); await page.waitForTimeout(wait || 900); }
  const viewText = function (page) { return page.innerText("#view").then(function (t) { return t.replace(/\s+/g, " ").trim(); }); };

  console.log("\nP1 tryb gościa");
  await test("treści publiczne bez profilu nie są puste i nie pokazują karty powitalnej", async function () {
    const s = await session();
    for (const r of ["#/", "#/a1", "#/a1/czasy-present-simple", "#/laboratorium-czasow", "#/cwiczenia", "#/pisanie", "#/certyfikat-c1", "#/egzamin-osmoklasisty", "#/a1/sciaga", "#/nieznana"]) {
      await visit(s.page, r);
      const t = await viewText(s.page);
      ok(t.length > 40, r + ": pusty ekran");
      ok(!/Ta strona potrzebuje profilu/.test(t), r + ": karta powitalna na stronie publicznej");
    }
    ok(!s.page.errs.length, "błędy JS: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("strony osobiste bez profilu: karta z dodaniem profilu, po dodaniu ten sam adres", async function () {
    const s = await session();
    for (const r of ["#/dzis", "#/powtorki", "#/statystyki", "#/notatki"]) {
      await visit(s.page, r);
      ok(/Ta strona potrzebuje profilu/.test(await viewText(s.page)), r + ": brak karty powitalnej");
    }
    await visit(s.page, "#/statystyki");
    await s.page.fill("#welcome-name", "Ola");
    await s.page.click("button:has-text('Dodaj profil')");
    await s.page.waitForTimeout(900);
    ok(await s.page.evaluate(function () { return location.hash; }) === "#/statystyki", "hash zmieniony po dodaniu profilu");
    ok(!/Ta strona potrzebuje profilu/.test(await viewText(s.page)), "karta powitalna po utworzeniu profilu");
    await s.ctx.close();
  });
  await test("„Umiem” bez profilu: okno, po utworzeniu profilu zaznaczone, ta sama strona; „Nie teraz” nic nie zmienia", async function () {
    const s = await session();
    await visit(s.page, "#/a1/czasy-present-simple");
    await s.page.click("label.umiem input", { force: true });
    await s.page.waitForSelector("dialog[open]");
    await s.page.click("button:has-text('Nie teraz')");
    ok(!(await s.page.evaluate(function () { return document.querySelector("label.umiem input").checked; })), "zaznaczone mimo anulowania");
    ok(await s.page.evaluate(function () { return JSON.parse(localStorage.getItem("elm_profiles_v1")).profiles.length; }) === 0, "powstał profil mimo anulowania");
    await s.page.click("label.umiem input", { force: true });
    await s.page.fill("#guest-name", "Ola");
    await s.page.keyboard.press("Enter");
    await s.page.waitForTimeout(700);
    ok(await s.page.evaluate(function () { return location.hash; }) === "#/a1/czasy-present-simple", "zmieniony adres");
    ok(await s.page.evaluate(function () { return document.querySelector("label.umiem input").checked; }), "„Umiem” niezaznaczone po utworzeniu profilu");
    ok(await s.page.evaluate(function () { return Object.keys(JSON.parse(localStorage.getItem("elm_profiles_v1")).profiles[0].progress).length; }) === 1, "postęp niezapisany");
    await s.ctx.close();
  });

  console.log("\nP3 nowe i do powtórki");
  await test("świeży profil: plakietka bez liczby „do powtórki”, karta mówi o nowych", async function () {
    const s = await session(1280, 800, true);
    await visit(s.page, "#/dzis", 1500);
    const label = await s.page.evaluate(function () { const a = document.querySelector('a[href="#/powtorki"]'); return a ? (a.getAttribute("aria-label") || a.innerText) : ""; });
    ok(!/\d+ do powtórki/.test(label), "plakietka: " + label);
    ok(/nowe na dziś/.test(await viewText(s.page)), "karta Dziś nie mówi o nowych");
    await s.ctx.close();
  });

  console.log("\nP4 Laboratorium czasów");
  await test("szkielet siatki do czasu wczytania danych, potem kafelki; ponowne wejście bez szkieletu", async function () {
    const s = await session(1280, 800, true);
    await s.page.route("**/dane/lab-dane.js*", async function (route) { await new Promise(function (r) { setTimeout(r, 3000); }); route.continue(); });
    await visit(s.page, "#/dzis");
    await s.page.evaluate(function () { document.querySelector('#tools-nav a[href="#/laboratorium-czasow"]').click(); });
    await s.page.waitForTimeout(500);
    ok(await s.page.locator(".lab-tile.is-skeleton").count() >= 12, "brak szkieletu kafelków");
    await s.page.waitForSelector(".lab-tile:not(.is-skeleton)", { timeout: 12000 });
    ok(await s.page.locator(".is-skeleton").count() === 0, "szkielet zostaje po wczytaniu");
    const t0 = Date.now();
    await s.page.evaluate(function () { document.querySelector('#tools-nav a[href="#/dzis"]').click(); });
    await s.page.waitForTimeout(500);
    await s.page.evaluate(function () { document.querySelector('#tools-nav a[href="#/laboratorium-czasow"]').click(); });
    await s.page.waitForSelector(".lab-tile:not(.is-skeleton)", { timeout: 1500 });
    ok(Date.now() - t0 < 2500, "ponowne wejście wolne");
    await s.ctx.close();
  });

  console.log("\nP5 telefon");
  await test("brak poziomego przewijania 320/360/375 px, przycisk profilu = awatar 44 px z pełną nazwą w aria-label", async function () {
    const s = await session(375, 812, true);
    const bad = [];
    for (const w of [320, 360, 375]) {
      await s.page.setViewportSize({ width: w, height: 812 });
      for (const r of ["#/", "#/dzis", "#/a1", "#/a1/czasy-present-simple", "#/powtorki", "#/cwiczenia", "#/laboratorium-czasow", "#/statystyki", "#/certyfikat-c1", "#/egzamin-osmoklasisty"]) {
        await s.page.goto(URL + r); await s.page.waitForTimeout(450);
        const d = await s.page.evaluate(function () { return [document.documentElement.scrollWidth, document.documentElement.clientWidth]; });
        if (d[0] > d[1]) bad.push(r + " @" + w + " (" + d[0] + ">" + d[1] + ")");
      }
    }
    ok(!bad.length, "poziomy scroll: " + bad.join("; "));
    const b = await s.page.evaluate(function () { const e = document.getElementById("profile-btn"); const r = e.getBoundingClientRect(); return { w: Math.round(r.width), label: e.getAttribute("aria-label") }; });
    ok(b.w <= 48 && /Test Claude/.test(b.label || ""), "przycisk profilu: " + JSON.stringify(b));
    await s.ctx.close();
  });

  console.log("\nP6 drobne");
  await test("strona główna bez przypiętych egzaminów: kafelki E8, MP, MR, B2, C1", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/");
    const codes = await s.page.locator(".home-exams [data-exam-cover]").evaluateAll(function (n) { return n.map(function (x) { return x.getAttribute("data-exam-cover"); }); });
    ok(codes.length === 5, "kafelki: " + codes.join(","));
    await s.ctx.close();
  });

  console.log("\nSzlak (spec v7 13) i P2 punkt startu");
  await test("Szlak: 6 krain, odcinki, 142 węzły w <ol>, bieżący przystanek wyróżniony; Enter otwiera arkusz, Esc zamyka i oddaje fokus", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/szlak", 1800);
    ok(await s.page.locator(".sz-level").count() === 6, "krainy: " + await s.page.locator(".sz-level").count());
    ok(await s.page.locator(".sz-node").count() === 142, "węzły: " + await s.page.locator(".sz-node").count());
    ok(await s.page.locator("ol.sz-stops").count() >= 22, "lista ol");
    ok(await s.page.locator(".sz-node.is-current").count() === 1, "jeden bieżący przystanek");
    ok(/bieżący/.test(await s.page.locator(".sz-node.is-current button").getAttribute("aria-label")), "stan nie tylko kolorem");
    await s.page.focus(".sz-node.is-current button");
    await s.page.keyboard.press("Enter");
    await s.page.waitForSelector("dialog[open]");
    await s.page.keyboard.press("Escape");
    await s.page.waitForTimeout(300);
    ok(await s.page.evaluate(function () { return !!document.activeElement.closest(".sz-node.is-current"); }), "fokus nie wrócił na węzeł");
    ok(!s.page.errs.length, "błędy JS: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("quiz ≥ 3/4 zalicza przystanek i proponuje „Umiem”, ale go nie zaznacza", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/szlak", 1800);
    await s.page.click(".sz-node.is-current button");
    await s.page.click("button:has-text('Quiz (4 pytania)')");
    for (let i = 0; i < 4; i++) {
      await s.page.waitForSelector(".ex-card .ex-option");
      const idx = await s.page.evaluate(function () {
        const it = ELM.exercises.currentItem();
        const opts = [].slice.call(document.querySelectorAll(".ex-card .ex-option")).map(function (b) { return b.innerText.replace(/\s+/g, " ").trim().replace(/^\d /, ""); });
        return opts.indexOf(it.options[it.correct].trim());
      });
      await s.page.locator(".ex-card .ex-option").nth(idx).click();
      await s.page.click(".ex-check");
      await s.page.click(".ex-next");
      await s.page.waitForTimeout(200);
    }
    await s.page.waitForSelector(".sz-result");
    ok(/Przystanek zaliczony/.test(await viewText(s.page)), "brak zaliczenia");
    ok(await s.page.locator("button:has-text('Zaznacz „Umiem”')").count() === 1, "brak propozycji „Umiem”");
    const progress = await s.page.evaluate(function () { return Object.keys(JSON.parse(localStorage.getItem("elm_profiles_v1")).profiles[0].progress).length; });
    ok(progress === 0, "„Umiem” zaznaczone automatycznie");
    const st = await s.page.evaluate(function () { return JSON.parse(localStorage.getItem("elm.p_e2e.szlak")); });
    ok(st.version === 1 && st.stops["a1-01"] && st.stops["a1-01"].best === 4, "zapis w elm.<id>.szlak");
    await s.ctx.close();
  });
  await test("P2: po teście poziomu C1 Dziś i Szlak wskazują pierwszy przystanek C1, wcześniejsze krainy są „pominięte”", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/dzis", 1200);
    await s.page.evaluate(function () { ELM.profileData.saveTest({ date: ELM.learn.today(), level: "C1", answers: [{ id: "x", level: "C1", chosen: 0, correct: true }] }); });
    await visit(s.page, "#/dzis", 1500);
    const t = await viewText(s.page);
    ok(/kraina C1/.test(t), "Dziś nie pokazuje krainy C1: " + t.slice(0, 120));
    ok(/Następny przystanek w Górach/.test(t), "Następny przystanek nie z C1");
    ok(await s.page.locator(".trail-station.is-skipped").count() === 4, "pominięte stacje na mapie");
    await visit(s.page, "#/szlak", 1500);
    ok((await s.page.locator(".sz-node.is-current").getAttribute("data-stop")).indexOf("c1-") === 0, "bieżący przystanek spoza C1");
    ok(await s.page.locator("details.sz-level.is-skipped").count() === 4, "krainy pominięte testem");
    await s.ctx.close();
  });
  await test("pominięcie nie zalicza i nie jest bieżące; „Mimo to otwórz” przy dalszej krainie", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/szlak", 1800);
    await s.page.click(".sz-node.is-current button");
    await s.page.click("button:has-text('Pomiń ten przystanek')");
    await s.page.waitForTimeout(500);
    ok((await s.page.locator(".sz-node.is-current").getAttribute("data-stop")) === "a1-02", "bieżący po pominięciu");
    ok(await s.page.locator('.sz-node[data-stop="a1-01"]').getAttribute("class").then(function (c) { return /is-skipped/.test(c) && !/is-done/.test(c); }), "pominięty traktowany jak zaliczony");
    await s.page.click('.sz-node[data-stop="a2-01"] button');
    ok(/Zalecamy najpierw skończyć Polanę/.test(await s.page.innerText("dialog[open]")), "brak zalecenia");
    await s.page.click("button:has-text('Mimo to otwórz')");
    ok(/Czego się tu uczysz/i.test(await s.page.innerText("dialog[open]")), "arkusz nie otworzył treści");
    await s.ctx.close();
  });
  await test("Szlak 320 px bez poziomego przewijania; prefers-reduced-motion wyłącza pulsowanie", async function () {
    const s = await session(320, 740, true);
    await visit(s.page, "#/szlak", 1500);
    const d = await s.page.evaluate(function () { return [document.documentElement.scrollWidth, document.documentElement.clientWidth]; });
    ok(d[0] <= d[1], "poziomy scroll " + d.join(">"));
    await s.ctx.close();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    await ctx.addInitScript(function () { localStorage.setItem("elm_profiles_v1", JSON.stringify({ version: 2, activeId: "p_e2e", profiles: [{ id: "p_e2e", name: "T", progress: {} }] })); });
    const page = await ctx.newPage();
    await page.goto(URL + "#/szlak"); await page.waitForTimeout(1500);
    ok(await page.evaluate(function () { return getComputedStyle(document.querySelector(".sz-node.is-current .sz-circle")).animationName; }) === "none", "animacja przy reduced-motion");
    await ctx.close();
  });
  await test("stary eksport (bez części „szlak”) importuje się bez błędów i nie kasuje Szlaku; nowy eksport zawiera część „szlak”", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/szlak", 1500);
    await s.page.evaluate(function () { ELM.szlakStore.recordQuiz("a1-01", 4); });
    const exported = await s.page.evaluate(function () { return ELM.szlakStore.exportData(); });
    ok(exported.p_e2e && exported.p_e2e.stops["a1-01"].best === 4, "eksport szlaku");
    const res = await s.page.evaluate(function () {
      try { const parsed = ELM.szlakStore.parseImport(undefined); ELM.szlakStore.applyImport(parsed, ["p_e2e"]); return { parsed: parsed, kept: !!localStorage.getItem("elm.p_e2e.szlak") }; } catch (e) { return { error: e.message }; }
    });
    ok(!res.error && res.parsed === null && res.kept, "stary plik: " + JSON.stringify(res));
    await s.ctx.close();
  });

  await browser.close();
  server.close();
  console.log("\nE2E: " + passed + " ok, " + failures.length + " błędów");
  if (failures.length) process.exit(1);
}

main().catch(function (e) { console.error(e); server.close(); process.exit(1); });
