/** Documents product phase 7 — the import wizard (several files, a conversion per file, review, fields, data links, create) and
 *  dynamic documents (who the document is for: patient, practitioner, clinic, appointment — live until signed, then frozen). */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import forge from "node-forge";
import { W, newShell, openShell, openDc, dclick, readStore, seededStore, shellWithStore } from "../helpers/documents";

test.describe.configure({ timeout: 240_000 });
type Doc = { id: string; kind?: string; pid?: string; links?: Record<string, string>; frozen?: { why: string; vals: Record<string, string> }; isTpl?: boolean; title: string;
  ex?: { fields: { name?: string; label?: string; src?: string }[] }; pages: { blocks: { id: string; type: string; bind?: string; value?: unknown; html?: string }[] }[]; pades?: unknown[] };
type St = { cur: string; order: string[]; docs: Record<string, Doc> };

async function dropFiles(p: Page, files: [string, string, string][]) {
  const list = files.map(([path, name, type]) => [fs.readFileSync(path).toString("base64"), name, type]);
  await p.evaluate(([list, W]) => {
    const dt = new DataTransfer();
    for (const [b64, name, type] of list as string[][]) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); dt.items.add(new File([u], name, { type })); }
    const tgt = document.querySelector(W + " .dc")!; for (const ev of ["dragenter", "dragover", "drop"]) tgt.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, [list, W] as const);
}
const idle = (p: Page) => p.waitForFunction((W) => !document.querySelector(`${W} .dcx-wz .spin`) && !!document.querySelector(`${W} [data-dxwznext]:not([disabled])`), W, { timeout: 60000 });
const next = async (p: Page) => { await idle(p); await dclick(p, `${W} [data-dxwznext]`, 700); };

test("wizard: two files, a conversion each, review, fields, data links with suggestions, a patient, create", async ({ browser, baseURL }) => {
  const md = `test-results/p7-consent-${Date.now()}.md`;
  fs.writeFileSync(md, "# Consent to treatment\n\nI agree to the treatment plan described by my therapist.\n\nFirst name: ....................\n\nLast name: ....................\n\nPhone: ....................\n\nSignature: ....................\n");
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await dropFiles(p, [["tests/fixtures/acroform.pdf", "acroform.pdf", "application/pdf"], [md, "consent.md", "text/markdown"]]);
  await p.locator(`${W} .dc-impm.dcx-wzm`).waitFor({ timeout: 15000 });
  // step 1: both files listed
  await expect(p.locator(`${W} .dcx-wzrow`)).toHaveCount(2);
  await next(p);
  // step 2: the PDF can be an editable document, an exact copy or an official form; Markdown only editable
  expect(await p.locator(`${W} [data-dxcv^="0:"]`).count()).toBe(3);
  expect(await p.locator(`${W} [data-dxcv^="1:"]`).count()).toBeGreaterThanOrEqual(1);
  await dclick(p, `${W} [data-dxcv="0:form"]`, 400);
  await expect(p.locator(`${W} [data-dxcv="0:form"]`)).toHaveAttribute("aria-checked", "true");
  await next(p);
  // step 3: original pages beside the result, and what changed
  await p.locator(`${W} .dcx-rvimgs img`).first().waitFor({ timeout: 30000 });
  await expect(p.locator(`${W} .dcx-rvres .dc-mini`).first()).toBeVisible();
  await expect(p.locator(`${W} .dcx-rvrep`)).toBeVisible();
  await dclick(p, `${W} [data-dxwzsel="1"]`, 400);
  await expect(p.locator(`${W} .dcx-rvtxt`)).toContainText("Consent to treatment");
  await dclick(p, `${W} [data-dxwzsel="0"]`, 400);
  // overlay: the original page drawn over the result, opacity from the slider
  await p.locator(`${W} .dc-tg:has([data-dxrvov])`).click(); await p.waitForTimeout(300);
  await expect(p.locator(`${W} .dcx-rvov > img`)).toBeVisible();
  await p.locator(`${W} [data-dxrvop]`).fill("80"); await p.waitForTimeout(150);
  expect(await p.evaluate((W) => getComputedStyle(document.querySelector(`${W} .dcx-rvov > img`)!).opacity, W)).toBe("0.8");
  await next(p);
  // step 4: the form's fields, labels editable
  const n4 = await p.locator(`${W} .dcx-fdt tbody tr`).count(); expect(n4).toBeGreaterThanOrEqual(5);
  // a field is shown where it sits on its page
  await p.locator(`${W} .dcx-fdt tbody tr`).nth(1).locator("td.pg").click(); await p.waitForTimeout(300);
  await expect(p.locator(`${W} .dcx-fdt tbody tr`).nth(1)).toHaveClass(/sel/);
  await expect(p.locator(`${W} .dcx-fdpv .dcx-hl`)).toHaveCount(1);
  await dclick(p, `${W} [data-dxwzsel="1"]`, 400);
  const mdFields = await p.locator(`${W} .dcx-fdt tbody tr`).count();
  await dclick(p, `${W} [data-dxwzsel="0"]`, 400);
  await next(p);
  // step 5: suggestions from the labels are only shown until accepted
  await expect(p.locator(`${W} .dcx-lnt .sug`).first()).toBeVisible();
  const before = await p.evaluate((W) => [...document.querySelectorAll<HTMLSelectElement>(`${W} [data-dxln]`)].filter((s) => s.value).length, W);
  expect(before).toBe(0);
  await dclick(p, `${W} [data-dxlnall]`, 500);
  const binds = await p.evaluate((W) => Object.fromEntries([...document.querySelectorAll<HTMLSelectElement>(`${W} [data-dxln]`)].map((s) => [s.closest("tr")!.querySelector(".lb")!.textContent!.trim(), s.value])), W);
  expect(Object.values(binds)).toContain("patient.birth");
  expect(Object.values(binds).some((v) => v === "patient.full" || v === "patient.last")).toBe(true);
  if (mdFields) { expect(Object.values(binds)).toContain("patient.first"); expect(Object.values(binds)).toContain("patient.phone"); }
  const label = await p.evaluate((W) => (document.querySelector(`${W} #dcx-wzpl option`) as HTMLOptionElement).value, W);
  await p.locator(`${W} [data-dxwzpat]`).fill(label); await p.locator(`${W} [data-dxwzpat]`).dispatchEvent("change"); await p.waitForTimeout(200);
  await next(p);
  // step 6: summary and create
  await expect(p.locator(`${W} .dcx-crsum`)).toContainText(label.split(" · ")[0]);
  await dclick(p, `${W} [data-dxwznext]`, 3000);
  await expect(p.locator(`${W} .dc-impm`)).toHaveCount(0);
  const st = (await readStore(p))!.json as St;
  const docs = st.order.slice(0, 2).map((id) => st.docs[id]);
  const ex = docs.find((d) => d.kind === "exact")!; const ed = docs.find((d) => d.kind !== "exact")!;
  expect(ex.pid).toBeTruthy(); expect(ed.pid).toBe(ex.pid);
  expect(ex.ex!.fields.some((f) => f.src === "patient.birth")).toBe(true);
  if (mdFields) {
    const bound = ed.pages.flatMap((pg) => pg.blocks).filter((b) => b.type === "field" && b.bind);
    expect(bound.length).toBeGreaterThanOrEqual(2);
    expect(String(bound.find((b) => b.bind === "patient.first")!.value)).toBe(label.split(" ")[0]);
  }
  // the open document says who it is for; the form shows the patient's data
  await expect(p.locator(`${W} .dcx-who .dcx-whop b`)).toContainText(label.split(" · ")[0]);
  await ctx.close();
});

test("dynamic document: chips and linked fields follow the chosen patient and visit; checker; values freeze when signed (PAdES)", async ({ browser, baseURL }) => {
  const json = await seededStore(browser, baseURL, [
    { id: "dyn1", type: "p", html: 'Patient: <span class="dc-dyn" contenteditable="false" data-k="patient.full">—</span>, born <span class="dc-dyn" contenteditable="false" data-k="patient.birth">—</span>. Seen by <span class="dc-dyn" contenteditable="false" data-k="prac.name">—</span>.' },
    { id: "fld1", type: "field", ftype: "text", label: "File number", bind: "patient.mrn", value: "" },
  ]);
  const ctx = await shellWithStore(browser, baseURL, json); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dcx-who [data-dxwhopat]`).waitFor({ timeout: 15000 });
  const label = await p.evaluate((W) => (document.querySelector(`${W} #dcx-wl option`) as HTMLOptionElement).value, W);
  const [name, mrn] = label.split(" · ");
  await p.locator(`${W} [data-dxwhopat]`).fill(label); await p.locator(`${W} [data-dxwhopat]`).dispatchEvent("change"); await p.waitForTimeout(900);
  await expect(p.locator(`${W} .dcx-whop b`)).toContainText(name);
  await expect(p.locator(`${W} .dc-cv .dc-dyn[data-k="patient.full"]`).first()).toHaveText(name);
  expect((await p.locator(`${W} .dc-cv .dc-dyn[data-k="prac.name"]`).first().textContent())!.trim()).not.toBe("—");
  await expect(p.locator(`${W} .dc-cv .dc-b[data-b="fld1"] input`).first()).toHaveValue(mrn);
  // practitioner and appointment can be chosen
  const pracs = await p.locator(`${W} [data-dxwhos="prac"] option`).count(); expect(pracs).toBeGreaterThan(1);
  await p.selectOption(`${W} [data-dxwhos="prac"]`, { index: 2 }); await p.waitForTimeout(700);
  const prac2 = await p.evaluate((W) => { const s = document.querySelector(`${W} [data-dxwhos="prac"]`) as HTMLSelectElement; return s.options[s.selectedIndex].text; }, W);
  await expect(p.locator(`${W} .dc-cv .dc-dyn[data-k="prac.name"]`).first()).toHaveText(prac2);
  expect(await p.locator(`${W} [data-dxwhos="appt"] option`).count()).toBeGreaterThanOrEqual(2);
  let st = (await readStore(p))!.json as St; let d = st.docs[st.cur];
  expect(d.pid).toBeTruthy(); expect(d.links!.prac).toBeTruthy(); expect(d.frozen).toBeUndefined();
  // typed over, then refreshed from the records
  const fin = p.locator(`${W} .dc-cv .dc-b[data-b="fld1"] input`).first();
  await fin.fill("typed by hand"); await fin.blur(); await p.waitForTimeout(700);
  await dclick(p, `${W} [data-dxwhoref]`, 800);
  await expect(p.locator(`${W} .dc-cv .dc-b[data-b="fld1"] input`).first()).toHaveValue(mrn);
  // frozen by hand, then unfrozen
  await dclick(p, `${W} [data-dxwhofz]`, 800);
  st = (await readStore(p))!.json as St; expect(st.docs[st.cur].frozen?.why).toBe("manual");
  await expect(p.locator(`${W} [data-dxwhos="prac"]`)).toBeDisabled();
  await dclick(p, `${W} [data-dxwhounfz]`, 800);
  st = (await readStore(p))!.json as St; expect(st.docs[st.cur].frozen).toBeUndefined();
  // sign as PAdES → the values are frozen with the document
  const keys = forge.pki.rsa.generateKeyPair(1024); const cert = forge.pki.createCertificate(); cert.publicKey = keys.publicKey; cert.serialNumber = "02cd";
  cert.validity.notBefore = new Date(Date.now() - 86400e3); cert.validity.notAfter = new Date(Date.now() + 86400e3 * 30);
  const a = [{ name: "commonName", value: "Dr Test Freeze" }]; cert.setSubject(a); cert.setIssuer(a); cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12 = `test-results/p7-${Date.now()}.p12`; fs.writeFileSync(p12, Buffer.from(forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "pw-7", { algorithm: "3des" })).getBytes(), "binary"));
  await dclick(p, `${W} [data-dsharem]`, 500);
  await p.locator(".os-menu button", { hasText: "Sign as PDF (PAdES)" }).first().click(); await p.waitForTimeout(600);
  await p.setInputFiles(`${W} .dc-mdl [data-dxp12]`, p12); await p.fill(`${W} .dc-mdl [data-dxp12pw]`, "pw-7");
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 90000 }), dclick(p, `${W} .dc-mdl [data-dxpago]`, 300)]);
  const pdf = `test-results/p7-signed-${Date.now()}.pdf`; await dl.saveAs(pdf); await p.waitForTimeout(1500);
  st = (await readStore(p))!.json as St; d = st.docs[st.cur];
  expect(d.frozen?.why).toBe("pades"); expect(d.frozen!.vals["patient.full"]).toBe(name); expect(d.frozen!.vals["prac.name"]).toBe(prac2);
  await expect(p.locator(`${W} .dcx-who.fz .dcx-whofz`)).toBeVisible();
  await expect(p.locator(`${W} [data-dxwhos="prac"]`)).toBeDisabled();
  let txt = ""; try { txt = execFileSync("pdftotext", [pdf, "-"], { encoding: "utf8" }); } catch { /* poppler missing */ }
  if (txt) { expect(txt).toContain(name); expect(txt).toContain(mrn); }
  await ctx.close();
});

test("template: saved from the wizard, a new document from it asks who it is for", async ({ browser, baseURL }) => {
  const md = `test-results/p7-tpl-${Date.now()}.md`;
  fs.writeFileSync(md, "# Attendance certificate\n\nI certify that the patient below attended a session.\n\nLast name: ....................\n\nDate of birth: ....................\n");
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await dropFiles(p, [[md, "attendance.md", "text/markdown"]]);
  await p.locator(`${W} .dcx-wzm`).waitFor({ timeout: 15000 });
  for (let i = 0; i < 4; i++) await next(p);
  if (await p.locator(`${W} [data-dxlnall]`).count()) await dclick(p, `${W} [data-dxlnall]`, 400);
  await next(p);
  await p.locator(`${W} .dc-tg:has([data-dxwztpl])`).click(); await p.waitForTimeout(300); await expect(p.locator(`${W} [data-dxwztpl]`)).toBeChecked();
  await dclick(p, `${W} [data-dxwznext]`, 2500);
  await expect(p.locator(`${W} .dcx-who.tpl`)).toBeVisible();
  let st = (await readStore(p))!.json as St; const tplId = st.cur; expect(st.docs[tplId].isTpl).toBe(true); expect(st.docs[tplId].pid).toBeUndefined();
  await dclick(p, `${W} [data-dxtpluse]`, 1500);
  await expect(p.locator(`${W} .dcx-who [data-dxwhopat]`)).toBeVisible();
  st = (await readStore(p))!.json as St; expect(st.cur).not.toBe(tplId); expect(st.docs[st.cur].isTpl).toBeUndefined();
  await ctx.close();
});

test("send to a patient: the copy keeps the patient's values frozen at sending", async ({ browser, baseURL }) => {
  const json = await seededStore(browser, baseURL, [
    { id: "dyn2", type: "p", html: 'For <span class="dc-dyn" contenteditable="false" data-k="patient.full">—</span>, file <span class="dc-dyn" contenteditable="false" data-k="patient.mrn">—</span>.' },
  ]);
  const ctx = await shellWithStore(browser, baseURL, json); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dcx-who [data-dxwhopat]`).waitFor({ timeout: 15000 });
  await dclick(p, `${W} [data-dsharem]`, 500);
  await p.locator(".os-menu button", { hasText: "Send to a patient" }).first().click(); await p.waitForTimeout(700);
  const label = await p.evaluate((W) => (document.querySelector(`${W} #dcx-pl option`) as HTMLOptionElement).value, W);
  await p.locator(`${W} .dc-mdl [data-dxpick]`).fill(label); await p.waitForTimeout(300);
  await dclick(p, `${W} .dc-mdl [data-dxcreate]`, 2500);
  const st = (await readStore(p))!.json as St; const c = st.docs[st.cur];
  const [name, mrn] = label.split(" · ");
  expect(c.pid).toBeTruthy(); expect(c.frozen?.why).toBe("send");
  expect(c.frozen!.vals["patient.full"]).toBe(name); expect(c.frozen!.vals["patient.mrn"]).toBe(mrn);
  await ctx.close();
});

test("spreadsheet as data with charts: each table gets a chart linked to it", async ({ browser, baseURL }) => {
  const csv = `test-results/p7-pain-${Date.now()}.csv`;
  fs.writeFileSync(csv, "Session,Pain,Mobility\nS1,7,40\nS2,6,48\nS3,4,55\nS4,3,61\n");
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await dropFiles(p, [[csv, "pain.csv", "text/csv"]]);
  await p.locator(`${W} .dcx-wzm`).waitFor({ timeout: 15000 });
  await next(p);
  await dclick(p, `${W} [data-dxcv="0:data"]`, 400);
  await next(p);
  await expect(p.locator(`${W} .dcx-rvrep`)).toContainText("linked to their tables");
  for (let i = 0; i < 3; i++) await next(p);
  await dclick(p, `${W} [data-dxwznext]`, 2500);
  const st = (await readStore(p))!.json as St; const d = st.docs[st.cur];
  const blocks = d.pages.flatMap((pg) => pg.blocks) as (St["docs"][string]["pages"][number]["blocks"][number] & { link?: string; labels?: string[]; series?: { name: string; vals: number[] }[] })[];
  const tbl = blocks.find((b) => b.type === "table")!; const ch = blocks.find((b) => b.type === "chart")!;
  expect(ch.link).toBe(tbl.id); expect(ch.labels).toEqual(["S1", "S2", "S3", "S4"]);
  expect(ch.series!.map((s) => s.name)).toEqual(["Pain", "Mobility"]); expect(ch.series![0].vals).toEqual([7, 6, 4, 3]);
  await ctx.close();
});

test("clinic details feed clinic fields and the header logo; export as final freezes the values", async ({ browser, baseURL }) => {
  const json = await seededStore(browser, baseURL, [
    { id: "h7", type: "hdr", logo: true, showDate: true, showPrat: true, title: "Consent" },
    { id: "dyn7", type: "p", html: 'Patient <span class="dc-dyn" contenteditable="false" data-k="patient.full">—</span> · clinic no. <span class="dc-dyn" contenteditable="false" data-k="clinic.reg">—</span>' },
  ]);
  const ctx = await shellWithStore(browser, baseURL, json); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dcx-who [data-dxwhopat]`).waitFor({ timeout: 15000 });
  const label = await p.evaluate((W) => (document.querySelector(`${W} #dcx-wl option`) as HTMLOptionElement).value, W);
  await p.locator(`${W} [data-dxwhopat]`).fill(label); await p.locator(`${W} [data-dxwhopat]`).dispatchEvent("change"); await p.waitForTimeout(900);
  // clinic details: registration number and logo
  await dclick(p, `${W} [data-dxclinic]`, 600);
  await p.fill(`${W} .dcx-clm [data-dxcl="reg"]`, "FINESS 750000123");
  await p.setInputFiles(`${W} .dcx-clm [data-dxcllogo]`, "tests/fixtures/photo.jpg");
  await p.locator(`${W} .dcx-cllogo .pv img`).waitFor({ timeout: 8000 });
  await dclick(p, `${W} [data-dxclsave]`, 900);
  await expect(p.locator(`${W} .dc-cv .dc-dyn[data-k="clinic.reg"]`).first()).toHaveText("FINESS 750000123");
  await expect(p.locator(`${W} .dc-cv .dc-b[data-b="h7"] .lg.img img`).first()).toBeVisible();
  // export as final
  await dclick(p, `${W} [data-dexp="pdf"]`, 1500);
  await p.locator(`${W} .dc-tg:has([data-dxxpfinal])`).click(); await expect(p.locator(`${W} [data-dxxpfinal]`)).toBeChecked();
  await p.waitForFunction((W) => !document.querySelector(`${W} [data-xpgo]`)?.hasAttribute("disabled"), W, { timeout: 30000 }).catch(() => {});
  await Promise.all([p.waitForEvent("download", { timeout: 90000 }), dclick(p, `${W} [data-xpgo]`, 300)]);
  await p.waitForTimeout(1200);
  const st = (await readStore(p))!.json as St & { clinics?: Record<string, { reg?: string; logo?: string }> }; const d = st.docs[st.cur];
  expect(d.frozen?.why).toBe("export"); expect(d.frozen!.vals["clinic.reg"]).toBe("FINESS 750000123");
  expect(Object.values(st.clinics || {}).some((c) => c.reg === "FINESS 750000123" && (c.logo || "").startsWith("data:image/png"))).toBe(true);
  await ctx.close();
});
