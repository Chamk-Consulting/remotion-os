/** Documents product phase 1 — storage you can trust (IndexedDB, honest save state, other-tab conflicts). */
import { test, expect } from "@playwright/test";
import { W, newShell, openShell, openDc, readStore, typeInFirstParagraph, statusText, toastText, dclick } from "../helpers/documents";

test.describe.configure({ timeout: 180_000 });

test("the store lives in IndexedDB, not in localStorage", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await typeInFirstParagraph(p, " ZZSTORE");
  const s = await readStore(p);
  expect(s?.where).toBe("indexedDB");
  expect(JSON.stringify(s?.json)).toContain("ZZSTORE");
  expect(await p.evaluate(() => localStorage.getItem("remotion-docs"))).toBeNull();
  expect(await statusText(p)).not.toContain("Not saved");
  await ctx.close();
});

test("an existing localStorage store is migrated to IndexedDB on first open", async ({ browser, baseURL }) => {
  // 1) get a valid store
  const c1 = await newShell(browser, baseURL); const a = await openShell(c1); await openDc(a); await typeInFirstParagraph(a, " x");
  const json = (await readStore(a))!.json as { docs: Record<string, { title: string }>; cur: string };
  await c1.close();
  json.docs[json.cur].title = "Migrated ZZMIGR";
  // 2) a browser that still has the old localStorage copy
  const c2 = await newShell(browser, baseURL, { clean: false });
  await c2.addInitScript((j) => { if (!sessionStorage.getItem("__m")) { localStorage.clear(); indexedDB.deleteDatabase("remotion-docs-store"); localStorage.setItem("remotion-docs", j); sessionStorage.setItem("__m", "1"); } }, JSON.stringify(json));
  const p = await openShell(c2); await openDc(p);
  await expect(p.locator(W)).toContainText("ZZMIGR");
  const s = await readStore(p);
  expect(s?.where).toBe("indexedDB");
  expect(await p.evaluate(() => localStorage.getItem("remotion-docs"))).toBeNull();
  await c2.close();
});

test("a failed write shows Not saved, then Saved again once it works", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await p.evaluate(() => { const w = window as unknown as { __put: unknown }; w.__put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { throw new DOMException("full", "QuotaExceededError"); }; });
  await typeInFirstParagraph(p, " ZZFULL");
  expect(await statusText(p)).toContain("Not saved");
  expect(await p.locator(`${W} .dc-sbs`).first().getAttribute("class")).toContain("dcx-err");
  expect(await toastText(p)).toContain("no room left");
  await p.evaluate(() => { const w = window as unknown as { __put: typeof IDBObjectStore.prototype.put }; IDBObjectStore.prototype.put = w.__put; });
  await typeInFirstParagraph(p, " ZZBACK");
  expect(await statusText(p)).not.toContain("Not saved");
  expect(await toastText(p)).toContain("Saved again");
  expect(JSON.stringify((await readStore(p))?.json)).toContain("ZZBACK");
  await ctx.close();
});

test("a change in another tab is never overwritten silently", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const a = await openShell(ctx); await openDc(a);
  const b = await openShell(ctx); await openDc(b);
  await typeInFirstParagraph(a, " ZZTABA");
  await expect(b.locator(`${W} .dcx-cbar`)).toBeVisible({ timeout: 8000 });
  expect(await statusText(b)).toContain("Not saved");
  // B edits while the choice is pending: nothing is written, A's change stays in the store
  await typeInFirstParagraph(b, " ZZTABB");
  let s = JSON.stringify((await readStore(a))?.json);
  expect(s).toContain("ZZTABA"); expect(s).not.toContain("ZZTABB");
  // B loads the other version: A's text appears in B
  await dclick(b, `${W} .dcx-cbar [data-dcxc="load"]`, 1200);
  await expect(b.locator(`${W} .dc-cv`)).toContainText("ZZTABA");
  await expect(b.locator(`${W} .dcx-cbar`)).toHaveCount(0);
  // B edits again and keeps it: A is told in turn
  await typeInFirstParagraph(b, " ZZTABC");
  await expect(a.locator(`${W} .dcx-cbar`)).toBeVisible({ timeout: 8000 });
  await dclick(a, `${W} .dcx-cbar [data-dcxc="keep"]`, 1500);
  s = JSON.stringify((await readStore(a))?.json);
  expect(s).toContain("ZZTABA");
  await ctx.close();
});
