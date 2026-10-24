/** Phase B slice 2 — desktop icon layer: dual-run parity (source file = oracle vs React shell). */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

const SRC = "file://" + path.resolve("../source-v94/Remotion_Desktop_v94.html") /* S2: v94 is the reference */;
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
/** Desktop 1 items as [name|app, c, r, kids] sorted — ids are random in both implementations. */
const layout = (p: Page) => p.evaluate(() => { const d = JSON.parse(localStorage.getItem("remotion-desks") || "{}"); return (d.l?.[d.c ?? 0]?.items || []).map((x: { name?: string; app?: string; c: number; r: number; kids?: unknown[] }) => [x.name || x.app, x.c, x.r, (x.kids || []).length]).sort((a: unknown[], b: unknown[]) => String(a[0]).localeCompare(String(b[0]))); });
const icon = (p: Page, name: string) => p.locator(`#dkLayer .dk-ic[title="${name}"]`);
const trashLen = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem("remotion-trash") || "[]").length);

test("boot seeds and icon positions", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => ({ layout: await layout(p), rendered: await p.locator("#dkLayer .dk-ic").evaluateAll((els) => els.map((e) => [e.getAttribute("title"), (e as HTMLElement).style.transform])) }));
  expect(r.react).toEqual(r.source);
});

test("open folder window and Quick Look", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await icon(p, "Patients").first().dblclick(); await p.locator(".dk-win").first().waitFor();
    const f = { title: await p.locator(".dk-win .dk-wh b").first().textContent(), kids: await p.locator(".dk-win .dk-fgrid .dk-ic").evaluateAll((e) => e.map((x) => x.getAttribute("title"))), foot: await p.locator(".dk-win .dk-wfoot").textContent() };
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await icon(p, "Rapport.pdf").dblclick(); await p.locator(".dk-win.ql").waitFor();
    const q = { title: await p.locator(".dk-win.ql .dk-wh b").textContent(), dl: await p.locator(".dk-win.ql dl").innerText(), note: await p.locator(".dk-ql-note").textContent() };
    return { f, q: { ...q, dl: q.dl.replace(/\d{1,2}:\d{2}.*$/m, "") } };
  });
  expect(r.react).toEqual(r.source);
});

test("drag an icon to another cell", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const b = (await icon(p, "Rapport.pdf").boundingBox())!;
    await p.mouse.move(b.x + b.width / 2, b.y + 30); await p.mouse.down(); await p.mouse.move(b.x + b.width / 2 + 200, b.y + 30 + 110, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    return layout(p);
  });
  expect(r.react).toEqual(r.source);
});

test("drag an icon into a folder", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const a = (await icon(p, "Rapport.pdf").boundingBox())!, f = (await icon(p, "Projects").boundingBox())!;
    await p.mouse.move(a.x + a.width / 2, a.y + 30); await p.mouse.down(); await p.mouse.move(f.x + f.width / 2, f.y + f.height / 2, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(700);
    return { layout: await layout(p), toast: await p.locator("#toast").evaluate((e) => e.firstChild?.textContent) };
  });
  expect(r.react).toEqual(r.source);
});

test("delete with keyboard, undo, then delete and restore from trash", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await icon(p, "Rapport.pdf").click(); await p.keyboard.press("Delete"); await p.waitForTimeout(700);
    const afterDel = { layout: await layout(p), trash: await trashLen(p), toast: await p.locator("#toast").evaluate((e) => e.firstChild?.textContent) };
    await p.locator("#toast button").click(); await p.waitForTimeout(300);
    const afterUndo = { layout: await layout(p), trash: await trashLen(p) };
    await icon(p, "Rapport.pdf").click(); await p.keyboard.press("Delete"); await p.waitForTimeout(700);
    await p.click('#dock [data-t="trash"]'); await p.locator('.dk-win[data-key="trash"]').waitFor();
    const list = await p.locator(".dk-tlist b").allTextContents();
    await p.click('.dk-win [data-tra="restore"]'); await p.waitForTimeout(400);
    return { afterDel, afterUndo, list, restored: await layout(p), trash: await trashLen(p), empty: await p.locator(".dk-win .dk-wempty").innerText() };
  });
  expect(r.react).toEqual(r.source);
});

test("keyboard navigation, select all, rubber band", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await icon(p, "Projects").click(); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowRight");
    const focused = await p.evaluate(() => document.activeElement?.getAttribute("title"));
    await p.keyboard.press("Control+a"); const all = await p.locator("#dkLayer .dk-on").count();
    await p.mouse.click(700, 700); const none = await p.locator("#dkLayer .dk-on").count();
    await p.mouse.move(150, 300); await p.mouse.down(); await p.mouse.move(400, 520, { steps: 6 }); await p.mouse.up();
    const band = await p.locator("#dkLayer .dk-on").evaluateAll((e) => e.map((x) => x.getAttribute("title")).sort());
    return { focused, all, none, band };
  });
  expect(r.react).toEqual(r.source);
});
