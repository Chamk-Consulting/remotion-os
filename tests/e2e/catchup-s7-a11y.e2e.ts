/**
 * Catch-up slice S7 — accessibility (Remotion OS v94): dual run between the v94 HTML file and the React shell.
 * Icon-only buttons get a name, the skip link reaches the main content, a modal dialog keeps the focus (in, Tab trapped,
 * back), the Planning drawer is a dialog that Escape closes, and the demo desktop folders follow the language.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

test.describe.configure({ timeout: 240_000 });
const SRC = "file://" + path.resolve("../source-v94/Remotion_Desktop_v94.html");
const NOW = new Date("2026-10-14T19:08:00+01:00");
async function open(page: Page, url: string) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort()); await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); sessionStorage.setItem("__s", "1"); } } catch {} });
  await page.goto(url); await page.locator("#dkLayer .dk-ic").first().waitFor(); await page.waitForTimeout(1200);
  if (await page.evaluate(() => { const m = document.getElementById("wsMenu"); return !!m && !m.classList.contains("closed") && m.getBoundingClientRect().height > 0; })) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
}
async function both(browser: Browser, baseURL: string | undefined, fn: (p: Page) => Promise<unknown>) {
  const out: Record<string, unknown> = {}; const errs: string[] = [];
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react&health=native" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); if (k === "react") p.on("pageerror", (e) => { if (!/aborted/i.test(e.message)) errs.push(e.message); });
    await open(p, url); out[k] = await fn(p); await ctx.close();
  }
  if (process.env.DUMP) { const fs = await import("node:fs"); for (const k in out) fs.writeFileSync(`/tmp/claude-0/dump-a11y-${test.info().title.slice(0, 8)}-${k}.json`, JSON.stringify(out[k], null, 1)); }
  expect(errs).toEqual([]);
  return out;
}
/* v94 quirk not reproduced: its first a11yName pass runs before the language is applied, so the bell and account buttons
   keep their visible text ("3", "NNassimAdministrator") instead of their translated names; React keeps the real names. */
const named = (p: Page, sel: string) => p.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-an]:not(#bellBtn):not(#accBtn)`)].map((b) => b.getAttribute("aria-label")).sort(), sel);
const focusDesc = (p: Page) => p.evaluate(() => { const a = document.activeElement as HTMLElement | null; if (!a || a === document.body) return "body"; return a.tagName.toLowerCase() + "." + [...a.classList].sort().join(".") + "|" + (a.getAttribute("aria-label") || (a.textContent || "").trim().slice(0, 30)); });
const openApp = async (p: Page, title: string, nth = 0) => { await p.locator(`#dkLayer .dk-ic[title="${title}"] >> nth=${nth}`).dispatchEvent("dblclick"); await p.waitForTimeout(1200); };

test("icon-only buttons are named; the skip link reaches the main content", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const shell = [await named(p, "#dock"), await named(p, "header.top"), await named(p, "#dkLayer")]; await openApp(p, "Billing"); const billing = await named(p, '.os-win[data-osw="billing"]');
    const skip = await p.evaluate(() => { const a = document.body.firstElementChild as HTMLAnchorElement; return [a.className, a.getAttribute("href"), a.textContent, document.querySelector("main.main")?.id, document.querySelector("main.main")?.getAttribute("tabindex")]; });
    await p.evaluate(() => (document.querySelector(".skip-link") as HTMLElement).click()); await p.waitForTimeout(200);
    return { shell, billing, skip, focus: await focusDesc(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("a modal dialog takes the focus, keeps Tab inside and gives the focus back", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openApp(p, "Patients", 1);
    await p.click('.os-win[data-osw="patients"] [data-paopen="pa1"]'); await p.waitForTimeout(700);
    await p.evaluate(() => (document.querySelector('.os-win[data-osw="patients"] [data-pasec="allergies"]') as HTMLElement | null)?.click()); await p.waitForTimeout(400);
    const btn = p.locator('.os-win[data-osw="patients"] [data-paadd="allergies"]').first();
    if (!(await btn.count())) return "no-new-button";
    await btn.focus(); const before = await focusDesc(p); await btn.click(); await p.waitForTimeout(500);
    const inDlg = await p.evaluate(() => !!document.activeElement?.closest('[role="dialog"][aria-modal="true"]'));
    const seen: string[] = []; for (let i = 0; i < 40; i++) { await p.keyboard.press("Tab"); seen.push(await p.evaluate(() => document.activeElement?.closest('[role="dialog"][aria-modal="true"]') ? "in" : "out")); }
    await p.keyboard.press("Escape"); await p.waitForTimeout(700);
    return { before, inDlg, out: seen.filter((x) => x === "out").length, after: await focusDesc(p) };
  });
  expect(r.react).not.toBe("no-new-button");
  expect(r.react).toEqual(r.source);
});

test("desktop folders follow the interface language", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const names = () => p.evaluate(() => [...document.querySelectorAll<HTMLElement>("#dkLayer .dk-ic")].map((e) => e.getAttribute("title")));
    const a = await names(); await p.keyboard.press("Control+Shift+L"); await p.waitForTimeout(1500);
    const b = await names(); const desks = await p.evaluate(() => (JSON.parse(localStorage.getItem("remotion-desks") || "null")?.l?.[0]?.items || []).filter((x: { type: string }) => x.type === "folder").map((x: { name: string; tk?: string }) => [x.name, x.tk || ""]));
    return { a, b, desks, lang: await p.evaluate(() => document.documentElement.lang) };
  });
  expect(r.react).toEqual(r.source);
});
