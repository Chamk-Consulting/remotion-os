/** Documents product phase 4 — official PDF forms: AcroForm fields, Unicode values, covers that really redact, fillable output. */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { W, newShell, openShell, openDc, dclick, readStore } from "../helpers/documents";

test.describe.configure({ timeout: 240_000 });
const tool = (cmd: string, args: string[]) => { try { return execFileSync(cmd, args, { encoding: "utf8" }); } catch { return null; } };

/** Drops a file on the Documents window (the import dialog opens with it). */
async function dropFile(p: Page, path: string, name: string, type: string) {
  const b64 = fs.readFileSync(path).toString("base64");
  await p.evaluate(([b64, name, type, W]) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u], name, { type }));
    const tgt = document.querySelector(W + " .dc")!; for (const ev of ["dragenter", "dragover", "drop"]) tgt.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, [b64, name, type, W] as const);
}
async function exportExact(p: Page, fillable: boolean) {
  await dclick(p, `${W} [data-dexp="pdf"]`, 1200);
  if (fillable) await p.evaluate((W) => { const c = document.querySelector(W + " .dc-mdl [data-exfillable]") as HTMLInputElement | null; if (c) { c.checked = true; } }, W);
  const [d] = await Promise.all([p.waitForEvent("download", { timeout: 60000 }), dclick(p, `${W} .dc-mdl [data-expdf]`, 500)]);
  const path = `test-results/p4-${fillable ? "fillable" : "flat"}-${Date.now()}.pdf`; await d.saveAs(path); return path;
}

test("AcroForm fields are imported by name; values in any script; a cover removes what it hides; fillable output keeps the fields", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await dropFile(p, "tests/fixtures/acroform.pdf", "acroform.pdf", "application/pdf");
  await p.locator(`${W} .dc-impm`).waitFor({ timeout: 15000 }); await p.waitForTimeout(1500);
  await dclick(p, `${W} .dc-impm [data-dxwzquick]`, 600); /* the wizard opens first; these tests use the one-screen import */
  await dclick(p, `${W} .dc-impm [data-impo="pdf:form"]`, 2500);
  await dclick(p, `${W} .dc-impm [data-impgo]`, 4000);
  await p.locator(`${W} .dc-exp [data-exv], ${W} .dc-exp [data-exck]`).first().waitFor({ timeout: 30000 });
  const st = (await readStore(p))!.json as { docs: Record<string, { kind?: string; ex?: { fields: { name?: string; ftype: string; x: number; y: number }[] } }>; cur: string };
  const ex = st.docs[st.cur].ex!;
  expect(st.docs[st.cur].kind).toBe("exact");
  expect(ex.fields.map((f) => f.name).sort()).toEqual(["agree", "dob", "notes", "patient_name", "sex", "site"]);
  expect(ex.fields.find((f) => f.name === "sex")!.ftype).toBe("radio");
  // draw a cover over the printed label "Patient name:" (PDF points: x 66–170, top 100–118)
  await dclick(p, `${W} [data-exmset="layout"]`, 800);
  const pg = (await p.locator(`${W} [data-exl="0"]`).first().boundingBox())!; const k = pg.width / 595.28;
  await p.mouse.move(pg.x + 66 * k, pg.y + 100 * k); await p.mouse.down(); await p.mouse.move(pg.x + 120 * k, pg.y + 110 * k, { steps: 4 }); await p.mouse.move(pg.x + 168 * k, pg.y + 118 * k, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(800);
  await p.evaluate((W) => { const s = document.querySelector(W + ' [data-exp="ftype"]') as HTMLSelectElement | null; if (s) { s.value = "cover"; s.dispatchEvent(new Event("change", { bubbles: true })); } }, W); await p.waitForTimeout(800);
  await dclick(p, `${W} [data-exmset="fill"]`, 800);
  // fill the name in Arabic with symbols
  const name = p.locator(`${W} .dc-exp input[data-exv]`).first(); await name.click(); await name.fill("نادية حداد ≥ ✓"); await p.keyboard.press("Tab"); await p.waitForTimeout(1200);
  const flat = await exportExact(p, false);
  const fill = await exportExact(p, true);
  await ctx.close();
  const txt = tool("pdftotext", [flat, "-"]); test.skip(txt === null, "poppler-utils not installed");
  // page 1 has a cover, so it is flattened with the cover burnt in: its printed text is no longer text, the drawn values are
  expect(txt, "covered label is gone").not.toContain("Patient name");
  expect(txt!.includes("نادية") || txt!.includes("ةيدان"), "Arabic value is text").toBe(true);
  expect(txt).toContain("≥");
  expect(txt).not.toContain("?????");
  // the fillable copy keeps its form (objects are compressed: expand them first)
  const q = fill + ".qdf.pdf"; test.skip(tool("qpdf", ["--qdf", "--object-streams=disable", fill, q]) === null && !fs.existsSync(q), "qpdf not installed");
  const raw = fs.readFileSync(q).toString("latin1");
  expect(raw).toContain("/AcroForm");
  expect(raw).toMatch(/\/T \(patient_name\)/);
});

test("form view fills the same fields; a newer version of the PDF keeps the answers (by name, then by position, flagged for review)", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await dropFile(p, "tests/fixtures/acroform.pdf", "acroform.pdf", "application/pdf");
  await p.locator(`${W} .dc-impm`).waitFor({ timeout: 15000 }); await p.waitForTimeout(1500);
  await dclick(p, `${W} .dc-impm [data-dxwzquick]`, 600); /* the wizard opens first; these tests use the one-screen import */
  await dclick(p, `${W} .dc-impm [data-impo="pdf:form"]`, 2500);
  await dclick(p, `${W} .dc-impm [data-impgo]`, 4000);
  await p.locator(`${W} .dc-exp [data-exv]`).first().waitFor({ timeout: 30000 });
  // form view: one labelled row per field (no page picture), typing there fills the document
  await p.evaluate((W) => { const c = document.querySelector(W + " input[data-dxexform]") as HTMLInputElement; c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); }, W);
  await p.locator(`${W} .dcx-exform`).waitFor({ timeout: 10000 });
  expect(await p.locator(`${W} .dcx-exform .dcx-exrow`).count()).toBe(6);
  const nameRow = p.locator(`${W} .dcx-exform .dcx-exrow input[data-exv]`).first(); await nameRow.click(); await nameRow.fill("Ana Lopez"); await p.keyboard.press("Tab"); await p.waitForTimeout(1200);
  type St = { docs: Record<string, { ex: { fields: { name?: string; value?: unknown; review?: boolean }[]; history?: unknown[] } }>; cur: string };
  let st = (await readStore(p))!.json as St;
  expect(st.docs[st.cur].ex.fields.find((f) => f.name === "patient_name")!.value).toBe("Ana Lopez");
  // the authority publishes a new version: the name field moved down 20 pt and "site" became "location" at the same place
  const v2 = await p.evaluate(async (b64) => {
    const PL = (window as unknown as { PDFLib: any }).PDFLib; // eslint-disable-line @typescript-eslint/no-explicit-any
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const pdf = await PL.PDFDocument.load(u); const fm = pdf.getForm(); const pg = pdf.getPages()[0];
    const w = fm.getTextField("patient_name").acroField.getWidgets()[0]; const r = w.getRectangle(); w.setRectangle({ ...r, y: r.y - 20 });
    const s = fm.getField("site"); const sr = s.acroField.getWidgets()[0].getRectangle(); const opts: string[] = s.getOptions ? s.getOptions() : []; fm.removeField(s);
    const nf = opts.length ? fm.createDropdown("location") : fm.createTextField("location"); if (opts.length) nf.addOptions(opts);
    nf.addToPage(pg, { x: sr.x, y: sr.y, width: sr.width, height: sr.height });
    const out: Uint8Array = await pdf.save(); let s2 = ""; out.forEach((c) => (s2 += String.fromCharCode(c))); return btoa(s2);
  }, fs.readFileSync("tests/fixtures/acroform.pdf").toString("base64"));
  const v2path = `test-results/p4-v2-${Date.now()}.pdf`; fs.writeFileSync(v2path, Buffer.from(v2, "base64"));
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), dclick(p, `${W} [data-dxexnew]`, 300)]);
  await fc.setFiles(v2path); await p.waitForTimeout(5000);
  st = (await readStore(p))!.json as St; const ex = st.docs[st.cur].ex;
  await ctx.close();
  expect(ex.fields.map((f) => f.name).sort()).toEqual(["agree", "dob", "location", "notes", "patient_name", "sex"]);
  expect(ex.fields.find((f) => f.name === "patient_name")!.value, "kept by name although it moved").toBe("Ana Lopez");
  const loc = ex.fields.find((f) => f.name === "location")!;
  expect(loc.value, "kept by position").toBe("Brussels");
  expect(loc.review, "position matches are flagged for review").toBe(true);
  expect(ex.history?.length).toBe(1);
});
