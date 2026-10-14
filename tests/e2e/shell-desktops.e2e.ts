/** Phase B slice 2b — virtual desktops panel: dual-run parity (source file = oracle vs React shell). */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

const SRC = "file://" + path.resolve("../source/Remotion_Desktop.html");
async function open(page: Page, url: string) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
  await page.clock.setFixedTime(new Date("2026-10-14T19:08:00+01:00"));
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); sessionStorage.setItem("__s", "1"); } } catch {} });
  await page.goto(url); await page.locator("#dkLayer .dk-ic").first().waitFor(); await page.waitForTimeout(700);
}
async function both(browser: Browser, baseURL: string | undefined, fn: (p: Page) => Promise<unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
    const p = await ctx.newPage(); await open(p, url); out[k] = await fn(p); await ctx.close();
  }
  return out;
}
const desks = (p: Page) => p.evaluate(() => { const d = JSON.parse(localStorage.getItem("remotion-desks") || "{}"); return { c: d.c, l: d.l.map((x: { n: string; s: number; w?: boolean; items?: { name?: string; app?: string }[] }) => [x.n, x.s, x.w ?? null, (x.items || []).map((i) => i.name || i.app).sort()]) }; });
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
const icons = (p: Page) => p.locator("#dkLayer .dk-ic").evaluateAll((e) => e.map((x) => x.getAttribute("title")).sort());

test("open panel, switch desktop, HUD, icons and widgets follow", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click("#deskBtn"); await p.waitForTimeout(400);
    const open = { shellOpen: await p.locator("#shell").evaluate((e) => e.classList.contains("desks-open")), thumbs: await p.locator("#desks .desk[data-di]").count(), names: await p.locator("#desks .dname").allTextContents(), tray: await p.locator("#tray .os-dsw span").textContent() };
    await p.click('#desks .thumb[data-d="1"]'); await p.waitForTimeout(900);
    const hud = { b: await p.locator("#dHud b").textContent(), small: await p.locator("#dHud small").textContent() };
    return { open, hud, desks: await desks(p), icons: await icons(p), widgetsHidden: await p.locator("#shell").evaluate((e) => e.classList.contains("widgets-hidden")), pressed: await p.locator('#desks .thumb[aria-pressed="true"]').getAttribute("data-d") };
  });
  expect(r.react).toEqual(r.source);
});

test("add, rename (Enter / Escape) and close desktop with undo", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click("#deskBtn"); await p.waitForTimeout(300);
    await p.click("#addDesk"); await p.waitForTimeout(700); const t1 = await toast(p);
    await p.click('#desks [data-rename="3"]'); await p.fill(".dren", "Clinic"); await p.press(".dren", "Enter"); const t2 = await toast(p);
    await p.click('#desks [data-rename="0"]'); await p.fill(".dren", "Nope"); await p.press(".dren", "Escape");
    const named = await p.locator("#desks .dname").allTextContents();
    await p.hover('#desks [data-di="3"]'); await p.click('#desks [data-dclose="3"]'); await p.waitForTimeout(700); const t3 = await toast(p); const afterClose = await desks(p);
    await p.click("#toast button"); await p.waitForTimeout(300);
    return { t1, t2, named, t3, afterClose, afterUndo: await desks(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("context menu: wallpaper change, new desktop, keyboard nav", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click("#deskBtn"); await p.waitForTimeout(300);
    await p.click('#desks .thumb[data-d="1"]', { button: "right" }); await p.locator(".dctx").waitFor();
    const head = await p.locator(".dctx .dc-h").innerText();
    await p.click('.dctx [data-wp="3"]'); const checked = await p.locator('.dctx [aria-checked="true"]').getAttribute("data-wp");
    await p.click('.dctx [data-dact="new"]'); await p.waitForTimeout(600);
    await p.locator('#desks .thumb[data-d="0"]').focus(); await p.keyboard.press("ArrowRight"); await p.keyboard.press("End");
    const focused = await p.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute("data-d"));
    return { head, checked, desks: await desks(p), focused, toast: await toast(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("Escape and scrim close the panel; tray desktop menu switches", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click("#deskBtn"); await p.waitForTimeout(300); await p.keyboard.press("Escape"); const esc = await p.locator("#shell").evaluate((e) => e.classList.contains("desks-open"));
    await p.click("#deskBtn"); await p.waitForTimeout(300); await p.click("#tray .os-dsw"); await p.locator(".os-menu").waitFor();
    const items = await p.locator(".os-menu button .lb").allTextContents(); await p.locator(".os-menu button", { hasText: items[2] }).click(); await p.waitForTimeout(900);
    return { esc, items, cur: (await desks(p)).c, tray: await p.locator("#tray .os-dsw span").textContent() };
  });
  expect(r.react).toEqual(r.source);
});
