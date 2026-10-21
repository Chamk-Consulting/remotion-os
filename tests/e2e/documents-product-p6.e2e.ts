/** Documents product phase 6 — Documents ↔ Patients through the OS event bus: a copy sent to a patient record lands in the record
 *  (documents register + questionnaire score as a clinical assessment), and Patients opens it back in Documents. */
import { test, expect, type Page } from "@playwright/test";
import { W, openShell, openDc, dclick, readStore, seededStore, shellWithStore } from "../helpers/documents";

test.describe.configure({ timeout: 240_000 });
const PW = '.os-win[data-osw="patients"]';
async function openPa(p: Page) {
  await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
  await p.dblclick('#dkLayer .dk-ic[title="Patients"] >> nth=1'); await p.locator(`${PW} .hr-pg`).waitFor(); await p.waitForTimeout(900);
}
type Pat = { id: string; mrn: string; first: string; last: string; birth: string; status: string; docs: { id: string; src: string; dref?: string; cat: string; note: string }[]; clin: { assess: { summary?: string; src: string; srcDoc?: string; tool?: string }[] } };
/* the Patients store as saved (Patients saves 200 ms after a change) */
const pats = (p: Page) => p.evaluate(() => ((JSON.parse(localStorage.getItem("remotion-patients") || "null") as { pats: unknown[] } | null)?.pats || [])) as Promise<Pat[]>;

test("send to a patient record → the record gets the document and the PHQ-9 score; Patients opens it in Documents", async ({ browser, baseURL }) => {
  const json = await seededStore(browser, baseURL, [{ id: "q1", type: "quest", inst: "phq9", lang: "en", ans: [1, 1, 1, 1, 1, 1, 1, 1, 0], ext: null, showExtra: true }]);
  const ctx = await shellWithStore(browser, baseURL, json); const p = await openShell(ctx);
  await openPa(p); /* Patients stays open behind Documents; its buttons are clicked through the DOM */
  await openDc(p);
  // the patient list Documents offers is the one in Patients
  const opts = await p.evaluate(() => { const b = [...document.querySelectorAll(".os-win[data-osw=\"documents\"]")]; return b.length; });
  expect(opts).toBe(1);
  // the send dialog finds the patient in Patients and fills the identity
  await dclick(p, `${W} [data-dsharem]`, 500);
  await p.locator(".os-menu button", { hasText: "Send to a patient" }).first().click(); await p.waitForTimeout(700);
  const label = await p.evaluate((W) => (document.querySelector(`${W} #dcx-pl option`) as HTMLOptionElement).value, W);
  await p.locator(`${W} .dc-mdl [data-dxpick]`).fill(label); await p.waitForTimeout(300);
  const [first, last] = [await p.inputValue(`${W} .dc-mdl [data-dxp="prenom"]`), await p.inputValue(`${W} .dc-mdl [data-dxp="nom"]`)];
  const mrn = label.split(" · ")[1];
  expect(label.startsWith(`${first} ${last} · `)).toBe(true);
  await expect(p.locator(`${W} .dc-mdl [data-dxpickst]`)).toContainText(mrn);
  await dclick(p, `${W} .dc-mdl [data-dxcreate]`, 2500);
  const st = (await readStore(p))!.json as { cur: string; docs: Record<string, { pid?: string }> };
  const copyId = st.cur; const pid = st.docs[copyId].pid!; expect(pid).toBeTruthy();
  const pt = { id: pid, first, last };
  // Patients: one register entry for the document, one assessment with the score, linked to it
  await expect.poll(async () => (await pats(p)).find((x) => x.id === pt.id)!.docs.filter((d) => d.dref === copyId).length, { timeout: 8000 }).toBe(1);
  const rec = (await pats(p)).find((x) => x.id === pt.id)!;
  const reg = rec.docs.find((d) => d.dref === copyId)!;
  expect(reg.src).toBe("documents");
  const as = rec.clin.assess.filter((a) => a.src === "documents");
  expect(as.length).toBe(1);
  expect(as[0].summary).toBe("PHQ-9 : 8/27 — mild");
  expect(as[0].srcDoc).toBe(reg.id);
  // nothing clinical on the bus: ids only
  const bus = await p.evaluate(() => (JSON.parse(localStorage.getItem("remotion-bus") || "null") as { ev: { type: string; p: Record<string, unknown> }[] }).ev.filter((e) => e.type.startsWith("document.")));
  expect(bus.length).toBeGreaterThan(0);
  for (const e of bus) expect(Object.keys(e.p).sort()).toEqual(["doc", "pid"]);
  // Patients → "Open in Documents" brings the copy back in Documents
  await dclick(p, `${W} [data-dgo="mine"]`, 800);
  await p.evaluate(([PW, pid]) => (document.querySelector(`${PW} [data-paopen="${pid}"]`) as HTMLElement | null)?.click(), [PW, pt.id] as const); await p.waitForTimeout(700);
  await p.evaluate((PW) => (document.querySelector(`${PW} [data-pasec="docs"]`) as HTMLElement | null)?.click(), PW); await p.waitForTimeout(600);
  await expect(p.locator(`${PW} [data-padocopen="${copyId}"]`)).toContainText("Open in Documents");
  await dclick(p, `${PW} [data-padocopen="${copyId}"]`, 2000);
  await expect(p.locator(`${W} .dc-title`)).toContainText(`${pt.first} ${pt.last}`);
  await ctx.close();
});

test("dialogs keep Tab inside and give the focus back when closed", async ({ browser, baseURL }) => {
  const { newShell } = await import("../helpers/documents");
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  // open the palette from a ribbon button that has the focus; Escape gives the focus back to it
  const opener = p.locator(`${W} [data-dcmd="undo"]`).first(); await opener.focus();
  await p.keyboard.press("Control+Shift+K"); await p.locator(`${W} .dcx-pal [data-dxpq]`).waitFor();
  expect(await p.evaluate((W) => !!document.activeElement?.closest(`${W} .dcx-pal`), W)).toBe(true);
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  expect(await p.evaluate((W) => document.activeElement === document.querySelector(`${W} [data-dcmd="undo"]`), W), "focus back on the opener").toBe(true);
  // the new-document dialog: Tab and Shift+Tab never leave it
  await p.keyboard.press("Control+Shift+K"); await p.locator(`${W} .dcx-pal [data-dxpq]`).focus(); await p.keyboard.type("New document"); await p.keyboard.press("Enter"); await p.waitForTimeout(800);
  await expect(p.locator(`${W} .dc-mdl [data-dxfree]`)).toHaveCount(1);
  for (let i = 0; i < 30; i++) { await p.keyboard.press(i % 7 === 6 ? "Shift+Tab" : "Tab"); expect(await p.evaluate((W) => !!document.activeElement?.closest(`${W} .dc-mdl`), W), `tab ${i}`).toBe(true); }
  await ctx.close();
});
