/**
 * Catch-up slice S3 (Remotion OS v93, data safety): a damaged store is backed up before the app replaces it, a banner
 * says so, and a save made by another tab is never overwritten silently. Dual run: the v94 HTML file and the React shell.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

test.describe.configure({ timeout: 180_000 });
const SRC = "file://" + path.resolve("../source-v94/Remotion_Desktop_v94.html");
const NOW = new Date("2026-10-14T19:08:00+01:00");
const BROKEN = '{"v":1,"invoices":[{"id":"x"';

async function run(browser: Browser, baseURL: string | undefined, fn: (p: Page, p2: Page) => Promise<unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react&health=native" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
    await ctx.addInitScript(([b]) => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); localStorage.setItem("remotion-billing", b); sessionStorage.setItem("__s", "1"); } } catch {} }, [BROKEN]);
    const p = await ctx.newPage(); await serveGoogleFontsLocally(p); await p.route(/cdnjs/, (r) => r.abort()); await p.clock.setFixedTime(NOW);
    const p2 = await ctx.newPage(); await serveGoogleFontsLocally(p2); await p2.route(/cdnjs/, (r) => r.abort()); await p2.clock.setFixedTime(NOW);
    await p.goto(url); await p.locator("#dkLayer .dk-ic").first().waitFor(); await p.waitForTimeout(800);
    out[k] = await fn(p, p2); await ctx.close();
  }
  return out;
}
const bar = (p: Page) => p.evaluate(() => { const b = document.getElementById("sdBar"); return b ? [...b.children].map((c) => [c.className, (c.textContent || "").replace(/\s+/g, " ").trim().replace(/\d{1,2}\/\d{1,2}\/\d{4},? [\d:]+( [AP]M)?/g, "DATE")]) : null; });

test("a damaged store is backed up before an app can replace it, and the banner says so", async ({ browser, baseURL }) => {
  const r = await run(browser, baseURL, async (p) => {
    await p.evaluate(() => localStorage.getItem("remotion-billing")); await p.waitForTimeout(400);
    return { bak: await p.evaluate(() => localStorage.getItem("remotion-billing::secours")), info: await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("remotion-billing::secours-info") || "{}"))), bar: await bar(p) };
  });
  expect((r.react as { bak: string }).bak).toBe(BROKEN);
  expect(r.react).toEqual(r.source);
});

test("a save from another tab is backed up before this tab writes over it", async ({ browser, baseURL }) => {
  const r = await run(browser, baseURL, async (p) => {
    const good = (n: number) => JSON.stringify({ v: 1, appts: [], n });
    await p.evaluate(([g1, g2, g3]) => {
      localStorage.setItem("remotion-calendar", g1); localStorage.getItem("remotion-calendar");
      /* another tab saves a newer copy (an unwrapped setItem from a fresh realm: no event reaches this tab yet), then this
         tab, unaware, saves its own in the same task */
      const f = document.createElement("iframe"); document.body.appendChild(f);
      (f.contentWindow as unknown as { Storage: typeof Storage }).Storage.prototype.setItem.call(localStorage, "remotion-calendar", g2); f.remove();
      localStorage.setItem("remotion-calendar", g3);
    }, [good(1), good(2), good(3)]);
    await p.waitForTimeout(400);
    return { bak: await p.evaluate(() => localStorage.getItem("remotion-calendar::secours")), cur: await p.evaluate(() => localStorage.getItem("remotion-calendar")), bar: await bar(p) };
  });
  expect((r.react as { bak: string }).bak).toContain('"n":2');
  expect(r.react).toEqual(r.source);
});
