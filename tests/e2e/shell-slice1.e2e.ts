/**
 * Phase B slice 1 — dual-run parity tests: each scenario runs on the SOURCE file (oracle) and on the React shell
 * (`/?shell=react`), and the observable results must be equal.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

const SRC = "file://" + path.resolve("../source/Remotion_Desktop.html");
const targets = { source: SRC, react: "/?shell=react" } as const;
async function open(page: Page, url: string) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
  await page.clock.setFixedTime(new Date("2026-10-14T19:08:00+01:00"));
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); sessionStorage.setItem("__s", "1"); } } catch {} });
  await page.goto(url); await page.locator("#shell").waitFor(); await page.waitForTimeout(600);
}
const toastText = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent ?? e.textContent);

type Obs = Record<string, unknown>;
async function both(fn: (p: Page) => Promise<Obs>, browser: import("@playwright/test").Browser, baseURL?: string) {
  const out: Record<string, Obs> = {};
  for (const [k, url] of Object.entries(targets)) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
    const p = await ctx.newPage(); await open(p, url); out[k] = await fn(p); await ctx.close();
  }
  return out;
}

test("workspace menu: toggle, select, add", async ({ browser, baseURL }) => {
  const r = await both(async (p) => {
    const o: Obs = { initiallyOpen: !(await p.locator("#wsMenu").evaluate((e) => e.classList.contains("closed"))) };
    await p.click("#wsBtn"); o.afterToggle = await p.locator("#wsMenu").evaluate((e) => e.classList.contains("closed"));
    await p.click("#wsBtn"); await p.click('[data-ws="2"]'); o.label = await p.textContent("#wsLabel"); o.toast = await toastText(p);
    await p.click("#addWs"); o.items = await p.locator("#wsList [data-ws]").count(); o.toast2 = await toastText(p);
    o.checked = await p.locator('#wsList [aria-checked="true"]').getAttribute("data-ws");
    return o;
  }, browser, baseURL);
  expect(r.react).toEqual(r.source);
});

test("language switch to Arabic: dir, labels, persistence, toast", async ({ browser, baseURL }) => {
  const r = await both(async (p) => {
    await p.click("#langBtn"); await p.click('#langMenu [data-lang="ar"]'); await p.waitForTimeout(400);
    return { dir: await p.evaluate(() => document.documentElement.dir), lang: await p.evaluate(() => document.documentElement.lang), stored: await p.evaluate(() => localStorage.getItem("remotion-lang")),
      code: await p.textContent("#langCode"), ws: await p.textContent("#wsLabel"), cal: await p.textContent("#calTitle"), toast: await toastText(p), date: await p.textContent("#date") };
  }, browser, baseURL);
  expect(r.react).toEqual(r.source);
});

test("theme toggle: class, storage, toast", async ({ browser, baseURL }) => {
  const r = await both(async (p) => {
    await p.click("#themeBtn"); await p.waitForTimeout(300);
    return { dark: await p.evaluate(() => document.documentElement.classList.contains("dark")), stored: await p.evaluate(() => localStorage.getItem("remotion-theme")), toast: await toastText(p) };
  }, browser, baseURL);
  expect(r.react).toEqual(r.source);
});

test("calendar navigation (incl. prevYear = −1 month, D-A01 reproduced)", async ({ browser, baseURL }) => {
  const r = await both(async (p) => {
    const o: Obs = {}; await p.click("#next"); o.next = await p.textContent("#calTitle");
    await p.click("#prevYear"); o.prevYear = await p.textContent("#calTitle"); await p.click("#prev"); o.prev = await p.textContent("#calTitle");
    o.cells = await p.locator("#calGrid button").count(); o.today = await p.locator("#calGrid .today").count(); return o;
  }, browser, baseURL);
  expect(r.react).toEqual(r.source);
});

test("quick notes: add up to 4 and toast", async ({ browser, baseURL }) => {
  const r = await both(async (p) => {
    await p.click("#noteNew"); for (const n of ["Alpha", "Beta"]) { await p.fill("#noteInput", n); await p.press("#noteInput", "Enter"); }
    await p.fill("#noteInput", "   "); await p.press("#noteInput", "Enter");
    return { items: await p.locator(".notes li").allTextContents(), toast: await toastText(p) };
  }, browser, baseURL);
  expect(r.react).toEqual(r.source);
});

test("data-t toast and Escape closes menus", async ({ browser, baseURL }) => {
  const r = await both(async (p) => {
    await p.click('.dock [data-t="pages"]'); const toast = await toastText(p);
    await p.click("#langBtn"); await p.keyboard.press("Escape");
    return { toast, ws: await p.locator("#wsMenu").evaluate((e) => e.classList.contains("closed")), lang: await p.locator("#langMenu").evaluate((e) => e.classList.contains("closed")) };
  }, browser, baseURL);
  expect(r.react).toEqual(r.source);
});
