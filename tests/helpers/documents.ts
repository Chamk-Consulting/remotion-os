/** Shared helpers for the Documents product-phase E2E tests (React shell only, no source comparison). */
import type { Browser, Page, BrowserContext } from "@playwright/test";
import { serveGoogleFontsLocally } from "./fonts";

export const W = '.os-win[data-osw="documents"]';
export const NOW = new Date("2026-10-14T19:08:00+01:00");

/** A fresh context on the React shell with a clean storage (first navigation only). */
export async function newShell(browser: Browser, baseURL: string | undefined, o: { tz?: string; clean?: boolean } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce", acceptDownloads: true, timezoneId: o.tz || "Europe/Paris", locale: "en-GB" });
  // Clean once per context (localStorage is shared by its tabs; a second tab must not delete the database the first holds open).
  if (o.clean !== false) await ctx.addInitScript(() => { try { if (!localStorage.getItem("__pxclean")) { localStorage.clear(); indexedDB.deleteDatabase("remotion-docs-store"); localStorage.setItem("__pxclean", "1"); } } catch {} });
  return ctx;
}
export async function openShell(ctx: BrowserContext) {
  const p = await ctx.newPage(); p.setDefaultTimeout(10000); await serveGoogleFontsLocally(p);
  await p.goto("/?shell=react"); await p.locator("#dkLayer .dk-ic").first().waitFor(); await p.waitForTimeout(700);
  return p;
}
/** Opens Documents from the dock, as a user would, and waits for the editor root. */
export async function openDc(p: Page) {
  await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
  if (!(await p.evaluate(() => document.getElementById("wsMenu")?.classList.contains("closed") ?? true))) { await p.click("#wsBtn"); await p.waitForTimeout(400); }
  await p.click('#dock [data-t="documents"]'); await p.locator(`${W} .dc`).waitFor({ timeout: 30000 }); await p.waitForTimeout(1200);
}
export const dclick = async (p: Page, sel: string, wait = 450) => { await p.evaluate((sel) => { const e = document.querySelector(sel) as HTMLElement | null; if (!e) throw new Error("missing " + sel); e.click(); }, sel); await p.waitForTimeout(wait); };
export const has = (p: Page, sel: string) => p.evaluate((s) => !!document.querySelector(s), `${W} ${sel}`);
export const toastText = (p: Page) => p.locator(`${W} .dc-toast`).textContent().catch(() => null);
export const statusText = (p: Page) => p.locator(`${W} .dc-sbst`).first().textContent().catch(() => null);

/** The documents store JSON, read from IndexedDB (product) or localStorage (legacy). */
export const readStore = (p: Page) => p.evaluate(async () => {
  const ls = localStorage.getItem("remotion-docs"); if (ls) return { where: "localStorage", json: JSON.parse(ls) };
  const db = await new Promise<IDBDatabase | null>((res) => { const r = indexedDB.open("remotion-docs-store"); r.onupgradeneeded = () => r.transaction?.abort(); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  if (!db || !db.objectStoreNames.contains("kv")) return null;
  const v = await new Promise<unknown>((res) => { const g = db.transaction("kv").objectStore("kv").get("store"); g.onsuccess = () => res(g.result); g.onerror = () => res(null); });
  db.close(); return typeof v === "string" ? { where: "indexedDB", json: JSON.parse(v) } : null;
});
/** Types text at the end of the first editable paragraph of the open document. */
export async function typeInFirstParagraph(p: Page, text: string) {
  const ed = p.locator(`${W} .dc-cv .dc-b [data-ed]`).filter({ hasNotText: /^$/ }).nth(1);
  await ed.click(); await p.keyboard.press("End"); await p.keyboard.type(text); await p.waitForTimeout(1200);
}

/** Builds a store from the default seed with extra blocks prepended to the sample document's first page. */
export async function seededStore(browser: Browser, baseURL: string | undefined, blocks: Record<string, unknown>[]) {
  const c = await newShell(browser, baseURL); const a = await openShell(c); await openDc(a); await typeInFirstParagraph(a, " ");
  const json = (await readStore(a))!.json as { docs: Record<string, { pages: { blocks: unknown[] }[] }>; cur: string };
  await c.close();
  json.docs[json.cur].pages[0].blocks.splice(1, 0, ...blocks);
  return JSON.stringify(json);
}
/** A shell whose first boot finds `storeJson` in localStorage (the migration path moves it into IndexedDB). */
export async function shellWithStore(browser: Browser, baseURL: string | undefined, storeJson: string, o: { tz?: string } = {}) {
  const ctx = await newShell(browser, baseURL, { clean: false, tz: o.tz });
  await ctx.addInitScript((j) => { if (!localStorage.getItem("__pxseed")) { localStorage.clear(); indexedDB.deleteDatabase("remotion-docs-store"); localStorage.setItem("remotion-docs", j); localStorage.setItem("__pxseed", "1"); } }, storeJson);
  return ctx;
}
/** Exports the open document through the export dialog and returns the downloaded file's path and name. */
export async function exportAs(p: Page, fmt: string) {
  await dclick(p, `${W} [data-dexpm]`, 500);
  await p.evaluate(() => (document.querySelector('.os-menu button[data-oi="7"]') as HTMLElement | null)?.click()); await p.waitForTimeout(1500);
  await dclick(p, `${W} .dc-mdl [data-xpf="${fmt}"]`, 2000);
  const [d] = await Promise.all([p.waitForEvent("download", { timeout: 90000 }), dclick(p, `${W} .dc-mdl [data-xpgo]`, 500)]);
  const path = `test-results/px-${Date.now()}-${d.suggestedFilename()}`; await d.saveAs(path);
  await p.keyboard.press("Escape").catch(() => {});
  return { path, name: d.suggestedFilename() };
}
