/** Documents product phase 3 — patient copies, fill mode, previous answers, tablet kiosk, Patient copies view. */
import { test, expect, type Page } from "@playwright/test";
import { W, newShell, openShell, openDc, dclick, readStore } from "../helpers/documents";

test.describe.configure({ timeout: 240_000 });
const shot = (p: Page, n: string) => p.screenshot({ path: `test-results/p3-${n}.png` });

async function sendToPatient(p: Page, first: string, last: string, dob = "1985-12-05") {
  // "Send to a patient" is the first entry of the Share menu
  await dclick(p, `${W} [data-dsharem]`, 500);
  await p.locator(".os-menu button", { hasText: "Send to a patient" }).first().click(); await p.waitForTimeout(700);
  await p.fill(`${W} .dc-mdl [data-dxp="prenom"]`, first); await p.fill(`${W} .dc-mdl [data-dxp="nom"]`, last);
  await p.fill(`${W} .dc-mdl [data-dxp="dob"]`, dob);
  await dclick(p, `${W} .dc-mdl [data-dxcreate]`, 1500);
}

test("send to a patient → fill mode → check answers → previous answers → kiosk → Patient copies view", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  const tplTitle = (await p.locator(`${W} .dc-title`).textContent())!.trim();
  // 1. send → the copy opens in fill mode with the fill bar instead of the ribbon
  await sendToPatient(p, "Camille", "Martin");
  await expect(p.locator(`${W} .dcx-fill`)).toBeVisible();
  await expect(p.locator(`${W} .dc-title`)).toContainText("Camille Martin");
  await shot(p, "1-fill");
  // structure is read-only, fields are not
  expect(await p.locator(`${W} .dc-cv [contenteditable="true"]`).count()).toBe(0);
  const field = p.locator(`${W} .dc-cv input.dc-fin[data-fv]`).first();
  const hasField = (await field.count()) > 0;
  if (hasField) { await field.fill("ZZANSWER"); await p.waitForTimeout(900); }
  // 2. check answers lists what is missing
  await dclick(p, `${W} [data-dxfill="check"]`, 800); await shot(p, "2-check");
  await expect(p.locator(`${W} .dc-mdl`)).toBeVisible();
  await p.keyboard.press("Escape"); await p.waitForTimeout(400); await dclick(p, `${W} .dc-mdl [data-mclose]`, 400).catch(() => {});
  // 3. the template is unchanged; a second copy for the same patient can reuse the answers
  let st = (await readStore(p))!.json as { docs: Record<string, { title: string; copyOf?: string; fill?: boolean; pages: { blocks: { value?: unknown }[] }[] }> };
  const copies = Object.values(st.docs).filter((d) => d.copyOf);
  expect(copies.length).toBe(1); expect(copies[0].fill).toBe(true);
  const tpl = st.docs[copies[0].copyOf!];
  if (hasField) expect(JSON.stringify(tpl.pages)).not.toContain("ZZANSWER");
  await dclick(p, `${W} .dcx-fwho [data-dxtpl]`, 1200); // back to the template
  await sendToPatient(p, "Camille", "Martin");
  if (hasField) {
    await expect(p.locator(`${W} [data-dxfill="prev"]`)).toBeVisible();
    await dclick(p, `${W} [data-dxfill="prev"]`, 1000);
    await expect(p.locator(`${W} .dc-cv input.dc-fin[data-fv]`).first()).toHaveValue("ZZANSWER");
  }
  // 4. tablet kiosk: set a PIN, answer, review, leave with the PIN
  await dclick(p, `${W} [data-dxfill="kiosk"]`, 600);
  for (const k of "1234") await dclick(p, `${W} .dcx-kiosk [data-dxkk="${k}"]`, 120);
  await expect(p.locator(`${W} .dcx-kq`)).toBeVisible(); await shot(p, "3-kiosk");
  for (let i = 0; i < 60; i++) {
    if (await p.locator(`${W} .dcx-krev`).count()) break;
    const inp = p.locator(`${W} .dcx-kq input.dc-fin[data-fv]:not([type=checkbox]):not([type=radio])`).first();
    if ((await inp.count()) && !(await inp.inputValue())) await inp.fill("ZZK" + i);
    const radio = p.locator(`${W} .dcx-kq input[type=radio]`).first(); if (await radio.count()) await radio.check({ force: true }).catch(() => {});
    const q = p.locator(`${W} .dcx-kq [data-qa]`); if (await q.count()) { const n = await q.count(); for (let j = 0; j < n; j += 4) await q.nth(j).click({ force: true }).catch(() => {}); }
    const sc = p.locator(`${W} .dcx-kq .dc-scale button`).first(); if (await sc.count()) await sc.click({ force: true }).catch(() => {});
    await dclick(p, `${W} .dcx-kiosk [data-dxk="next"]`, 250);
    const err = await p.locator(`${W} .dcx-kerr`).textContent().catch(() => "");
    if (err) { const any = p.locator(`${W} .dcx-kq input, ${W} .dcx-kq textarea, ${W} .dcx-kq select`).first(); if (await any.count()) await any.fill("x").catch(() => {}); await dclick(p, `${W} .dcx-kiosk [data-dxk="next"]`, 250); }
  }
  await expect(p.locator(`${W} .dcx-krev`)).toBeVisible(); await shot(p, "4-review");
  await dclick(p, `${W} .dcx-kiosk [data-dxk="done"]`, 400);
  for (const k of "0000") await dclick(p, `${W} .dcx-kiosk [data-dxkk="${k}"]`, 100);
  await expect(p.locator(`${W} .dcx-kiosk`)).toBeVisible(); // wrong code keeps it locked
  for (const k of "1234") await dclick(p, `${W} .dcx-kiosk [data-dxkk="${k}"]`, 120);
  await expect(p.locator(`${W} .dcx-kiosk`)).toHaveCount(0);
  // 5. the Patient copies view lists both copies
  await dclick(p, `${W} [data-dgo="copies"]`, 900); await shot(p, "5-copies");
  await expect(p.locator(`${W} .dcx-crow`)).toHaveCount(2);
  st = (await readStore(p))!.json as typeof st;
  expect(Object.values(st.docs).filter((d) => d.copyOf).length).toBe(2);
  expect(tplTitle.length).toBeGreaterThan(0);
  await ctx.close();
});
