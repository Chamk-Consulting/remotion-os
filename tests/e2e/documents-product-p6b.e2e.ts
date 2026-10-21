/** Documents product phase 6 — encryption at rest: passcode on, nothing readable in IndexedDB, locked after a reload or "Lock now",
 *  wrong passcode refused, right one opens, edits stay encrypted, passcode off brings plain storage back. */
import { test, expect, type Page } from "@playwright/test";
import { W, newShell, openShell, openDc } from "../helpers/documents";

test.describe.configure({ timeout: 240_000 });
const raw = (p: Page) => p.evaluate(async () => {
  const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("remotion-docs-store"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const v = await new Promise<unknown>((res) => { const g = db.transaction("kv").objectStore("kv").get("store"); g.onsuccess = () => res(g.result); g.onerror = () => res(null); });
  db.close(); return String(v);
});
async function palette(p: Page, q: string) { await p.locator(`${W} .dc-cv`).click({ position: { x: 5, y: 5 } }).catch(() => {}); await p.keyboard.press("Control+Shift+K"); await p.locator(`${W} .dcx-pal [data-dxpq]`).focus(); await p.keyboard.type(q, { delay: 10 }); await p.waitForTimeout(250); await p.keyboard.press("Enter"); await p.waitForTimeout(600); }
async function reopen(p: Page) { await p.click('#dock [data-t="documents"]'); await p.waitForTimeout(1500); }

test("passcode protection: encrypted at rest, locked after reload and Lock now, opens with the passcode, turns off", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  const title = (await p.locator(`${W} .dc-title`).textContent())!.trim();
  const PII = "PT-2026-00123"; /* the sample patient's file number, stored as plain text before protection */
  expect(await raw(p)).toContain(PII);
  // turn on
  await palette(p, "Passcode protection");
  await p.fill(`${W} .dc-mdl [data-dxenc1]`, "short"); await p.fill(`${W} .dc-mdl [data-dxenc2]`, "short"); await p.click(`${W} .dc-mdl [data-dxencon]`);
  await expect(p.locator(`${W} .dc-mdl .dcx-err`)).toContainText("8 characters");
  await p.fill(`${W} .dc-mdl [data-dxenc1]`, "correct horse 42"); await p.fill(`${W} .dc-mdl [data-dxenc2]`, "correct horse 42"); await p.click(`${W} .dc-mdl [data-dxencon]`);
  await expect(p.locator(`${W} .dc-mdl`)).toHaveCount(0, { timeout: 15000 });
  let v = await raw(p); expect(v.startsWith('{"enc":1')).toBe(true); expect(v).not.toContain(PII);
  // after a reload the store is locked: the lock screen, a wrong passcode, then the right one
  await p.reload(); await p.locator("#dkLayer .dk-ic").first().waitFor(); await p.waitForTimeout(800);
  await reopen(p); await p.locator(`${W} .dcx-lock`).waitFor({ timeout: 20000 });
  await p.fill(`${W} [data-dxlock]`, "wrong passcode"); await p.click(`${W} [data-dxunlock]`);
  await expect(p.locator(`${W} .dcx-lockbad`)).toBeVisible({ timeout: 15000 });
  await p.screenshot({ path: "test-results/p6-lock.png" });
  await p.fill(`${W} [data-dxlock]`, "correct horse 42"); await p.click(`${W} [data-dxunlock]`);
  await expect(p.locator(`${W} .dc-title`)).toHaveText(title, { timeout: 20000 });
  // an edit is saved, still encrypted
  const ed = p.locator(`${W} .dc-cv .dc-b [data-ed][data-rich]`).first(); await ed.click(); await p.keyboard.press("End"); await p.keyboard.type(" ZZSECRET"); await p.waitForTimeout(1500);
  v = await raw(p); expect(v.startsWith('{"enc":1')).toBe(true); expect(v).not.toContain("ZZSECRET");
  // Lock now closes Documents; opening again asks for the passcode
  await p.locator(`${W} .dc-cv`).click({ position: { x: 5, y: 5 } }); await p.keyboard.press("Control+Shift+K"); await p.locator(`${W} .dcx-pal [data-dxpq]`).focus(); await p.keyboard.type("Lock documents now", { delay: 10 }); await p.waitForTimeout(300);
  await p.keyboard.press("Enter"); await p.waitForTimeout(1500);
  await expect(p.locator(W)).toHaveCount(0, { timeout: 10000 });
  await reopen(p); await p.locator(`${W} .dcx-lock`).waitFor({ timeout: 20000 });
  await p.fill(`${W} [data-dxlock]`, "correct horse 42"); await p.click(`${W} [data-dxunlock]`);
  await expect(p.locator(`${W} .dc-cv`)).toContainText("ZZSECRET", { timeout: 20000 });
  // turn off: needs the passcode; then plain storage again
  await palette(p, "Passcode protection");
  await p.fill(`${W} .dc-mdl [data-dxencc]`, "nope nope"); await p.click(`${W} .dc-mdl [data-dxencoff]`);
  await expect(p.locator(`${W} .dc-mdl .dcx-err`)).toContainText("Wrong passcode", { timeout: 15000 });
  await p.fill(`${W} .dc-mdl [data-dxencc]`, "correct horse 42"); await p.click(`${W} .dc-mdl [data-dxencoff]`);
  await expect(p.locator(`${W} .dc-mdl`)).toHaveCount(0, { timeout: 15000 });
  v = await raw(p); expect(v.startsWith('{"enc":1')).toBe(false); expect(v).toContain("ZZSECRET");
  await ctx.close();
});
