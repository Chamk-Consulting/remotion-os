/** Documents product phase 8 — page layout per section: four independent margins, "Apply to" (whole document, this section,
 *  this one and the next, chosen pages), a landscape section inside a portrait document, and that layout carried through the
 *  sheets on screen, the PDF (one MediaBox per page), Word (one <w:sectPr> per section), OpenDocument (one master page per
 *  section) and back in through the Word import. */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { W, newShell, openShell, openDc, dclick, readStore, typeInFirstParagraph, shellWithStore, exportAs } from "../helpers/documents";

test.describe.configure({ timeout: 300_000 });
type Lay = { size?: string; or?: string; mt?: number; mb?: number; ml?: number; mr?: number };
type Doc = { title: string; set: Record<string, unknown>; pages: { lay?: Lay; blocks: { type: string; html?: string; text?: string }[] }[] };
type St = { cur: string; order: string[]; docs: Record<string, Doc> };

const para = (i: number) => ({ id: "lp" + i, type: "p", html: `Paragraph ${i}. ` + "Pain, range of motion and strength were reviewed with the patient today. ".repeat(3) });
async function threeSections(browser: Parameters<typeof newShell>[0], baseURL: string | undefined) {
  const c = await newShell(browser, baseURL); const a = await openShell(c); await openDc(a); await typeInFirstParagraph(a, " ");
  const json = (await readStore(a))!.json as St; await c.close();
  const d = json.docs[json.cur]; d.title = "Layout sections";
  d.pages = [0, 1, 2].map((s) => ({ id: "ls" + s, blocks: [{ id: "lh" + s, type: "h", lv: 1, text: `Section ${s + 1}` }, para(s * 10 + 1), para(s * 10 + 2)] })) as unknown as Doc["pages"];
  return JSON.stringify(json);
}
const cur = async (p: Page) => { const st = (await readStore(p))!.json as St; return st.docs[st.cur]; };
async function setup(p: Page, page: number) {
  await p.evaluate(([W, i]) => { const pg = document.querySelector(`${W} .dc-page[data-page="${i}"]:not([data-part])`)!; const r = pg.getBoundingClientRect();
    pg.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.bottom - 30 })); }, [W, page] as const);
  await p.waitForTimeout(300);
  await p.locator(".os-menu button", { hasText: "Page setup" }).first().click(); await p.waitForTimeout(400);
  await expect(p.locator(`${W} .dcx-laym`)).toBeVisible();
}
const seg = (p: Page, attr: string, v: string) => dclick(p, `${W} .dcx-laym [${attr}="${v}"]`, 150);
const mg = async (p: Page, k: string, v: number) => { await p.locator(`${W} .dcx-laym [data-dxlaymg="${k}"]`).fill(String(v)); };
const sheets = (p: Page) => p.evaluate((W) => [...document.querySelectorAll<HTMLElement>(`${W} .dc-cv .dc-page`)].map((s) => {
  const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
  return { page: +s.dataset.page!, part: !!s.dataset.part, or: s.dataset.por, size: s.dataset.psz, land: r.width > r.height, pl: parseFloat(cs.paddingLeft), pr: parseFloat(cs.paddingRight), pt: parseFloat(cs.paddingTop) };
}), W);

test("page setup: this section in landscape with four margins, chosen pages in A5, whole document resets", async ({ browser, baseURL }) => {
  const ctx = await shellWithStore(browser, baseURL, await threeSections(browser, baseURL)); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-page[data-page="2"]`).first().waitFor();

  // section 2 only: landscape, top 10, bottom 20, left 30, right 15 mm
  await setup(p, 1);
  await expect(p.locator(`${W} .dcx-laym [data-dxlaysc="all"]`)).toHaveAttribute("aria-pressed", "true");
  await seg(p, "data-dxlaysc", "this"); await seg(p, "data-dxlayor", "l");
  await mg(p, "mt", 10); await mg(p, "mb", 20); await mg(p, "ml", 30); await mg(p, "mr", 15);
  await dclick(p, `${W} .dc-mdl [data-dxlayok]`, 900);
  let d = await cur(p);
  expect(d.pages[0].lay).toBeUndefined(); expect(d.pages[2].lay).toBeUndefined();
  expect(d.pages[1].lay!.or).toBe("l");
  expect(d.pages[1].lay!.ml!).toBeGreaterThan(d.pages[1].lay!.mr!); expect(d.pages[1].lay!.mb!).toBeGreaterThan(d.pages[1].lay!.mt!);
  let sh = (await sheets(p)).filter((s) => !s.part);
  expect(sh.map((s) => s.land)).toEqual([false, true, false]);
  expect(sh[1].pl).toBeGreaterThan(sh[1].pr * 1.6); expect(sh[0].pl).toBeCloseTo(sh[0].pr, 0);

  // the dialog reopened on that section says it has its own layout and starts on "This section"
  await setup(p, 1);
  await expect(p.locator(`${W} .dcx-laym .dcx-lay-own`)).toBeVisible();
  await expect(p.locator(`${W} .dcx-laym [data-dxlaysc="this"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(p.locator(`${W} .dcx-laym [data-dxlaymg="ml"]`)).toHaveValue("30");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);

  // chosen pages: a bad range is refused, "3" is accepted
  await setup(p, 0);
  await seg(p, "data-dxlaysc", "range"); await p.locator(`${W} .dcx-laym [data-dxlayrange]`).fill("7-9");
  await p.locator(`${W} .dcx-laym [data-dxlaysize]`).selectOption("a5");
  await dclick(p, `${W} .dc-mdl [data-dxlayok]`, 300);
  await expect(p.locator(`${W} .dcx-laym [data-dxlayerr]`)).toBeVisible();
  await p.locator(`${W} .dcx-laym [data-dxlayrange]`).fill("3");
  await dclick(p, `${W} .dc-mdl [data-dxlayok]`, 900);
  d = await cur(p);
  expect(d.pages[2].lay).toEqual({ size: "a5" }); expect(d.pages[0].lay).toBeUndefined(); expect(d.pages[1].lay!.or).toBe("l");
  sh = (await sheets(p)).filter((s) => !s.part); expect(sh[2].size).toBe("a5");

  // undo brings the A5 change back out
  await p.keyboard.press("Control+z"); await p.waitForTimeout(700);
  expect((await cur(p)).pages[2].lay).toBeUndefined();
  await p.keyboard.press("Control+y"); await p.waitForTimeout(700);
  expect((await cur(p)).pages[2].lay).toEqual({ size: "a5" });

  // "this one and the next" from section 2, then "whole document" clears every section
  await setup(p, 1); await seg(p, "data-dxlaysc", "after"); await mg(p, "mt", 40); await dclick(p, `${W} .dc-mdl [data-dxlayok]`, 900);
  d = await cur(p); expect(d.pages[0].lay).toBeUndefined(); expect(d.pages[1].lay!.mt).toBe(d.pages[2].lay!.mt);
  await setup(p, 0); await seg(p, "data-dxlaysc", "all"); await seg(p, "data-dxlayor", "p"); await mg(p, "ml", 25); await mg(p, "mr", 12);
  await dclick(p, `${W} .dc-mdl [data-dxlayok]`, 900);
  d = await cur(p); expect(d.pages.every((x) => !x.lay)).toBe(true);
  expect(d.set.ml as number).toBeGreaterThan(d.set.mr as number);
  sh = (await sheets(p)).filter((s) => !s.part); expect(sh.every((s) => !s.land && s.pl > s.pr * 1.5)).toBe(true);
  await ctx.close();
});

test("exports keep the layout of each section: PDF MediaBox, Word sections, OpenDocument master pages, Word import", async ({ browser, baseURL }) => {
  const ctx = await shellWithStore(browser, baseURL, await threeSections(browser, baseURL)); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-page[data-page="2"]`).first().waitFor();
  await setup(p, 1); await seg(p, "data-dxlaysc", "this"); await seg(p, "data-dxlayor", "l"); await mg(p, "ml", 30); await mg(p, "mr", 15);
  await dclick(p, `${W} .dc-mdl [data-dxlayok]`, 900);
  await setup(p, 2); await seg(p, "data-dxlaysc", "this"); await p.locator(`${W} .dcx-laym [data-dxlaysize]`).selectOption("a5");
  await dclick(p, `${W} .dc-mdl [data-dxlayok]`, 900);

  // PDF: A4 portrait, A4 landscape, A5 portrait
  const pdf = fs.readFileSync((await exportAs(p, "pdf")).path).toString("latin1");
  const boxes = [...pdf.matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => [Math.round(+m[1]), Math.round(+m[2])]);
  const kinds = boxes.map(([w, h]) => (w > h ? "L" : "P") + (Math.max(w, h) < 700 ? "5" : "4"));
  expect(kinds[0]).toBe("P4"); expect(kinds).toContain("L4"); expect(kinds[kinds.length - 1]).toBe("P5");
  expect(kinds.indexOf("L4")).toBeLessThan(kinds.indexOf("P5"));

  // Word: three sections, the second landscape with its own left margin, the last in the body
  const docx = (await exportAs(p, "docx")).path;
  const xml = execFileSync("unzip", ["-p", docx, "word/document.xml"]).toString();
  const sects = [...xml.matchAll(/<w:sectPr>[\s\S]*?<\/w:sectPr>/g)].map((m) => m[0]);
  expect(sects.length).toBe(3);
  expect(sects[1]).toMatch(/w:orient="landscape"/); expect(sects[0]).not.toMatch(/landscape/);
  expect(sects[0]).toMatch(/<w:type w:val="nextPage"\/>/);
  const left = (s: string) => +/w:left="(\d+)"/.exec(s)![1], right = (s: string) => +/w:right="(\d+)"/.exec(s)![1];
  expect(left(sects[1])).toBeGreaterThan(right(sects[1]) * 1.6);
  expect(+/w:w="(\d+)"/.exec(sects[2])![1]).toBeLessThan(9000); // A5 width
  expect(/<\/w:sectPr><\/w:body>/.test(xml)).toBe(true);

  // OpenDocument: a master page per section, used by the paragraph that starts it
  const odt = (await exportAs(p, "odt")).path;
  const sty = execFileSync("unzip", ["-p", odt, "styles.xml"]).toString(), con = execFileSync("unzip", ["-p", odt, "content.xml"]).toString();
  expect((sty.match(/<style:master-page /g) || []).length).toBeGreaterThanOrEqual(3);
  expect(sty).toMatch(/style:print-orientation="landscape"/);
  expect((con.match(/style:master-page-name="M\d+"/g) || []).length).toBeGreaterThanOrEqual(2);

  // Word import: the three sections come back with their own layout
  const list = [[fs.readFileSync(docx).toString("base64"), "layout.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]];
  await p.evaluate(([list, W]) => {
    const dt = new DataTransfer();
    for (const [b64, name, type] of list as string[][]) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); dt.items.add(new File([u], name, { type })); }
    const t = document.querySelector(W + " .dc")!; for (const ev of ["dragenter", "dragover", "drop"]) t.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, [list, W] as const);
  await p.locator(`${W} .dc-impm`).waitFor({ timeout: 15000 });
  for (let i = 0; i < 10 && (await p.locator(`${W} .dc-impm`).count()); i++) {
    await p.waitForFunction((W) => !document.querySelector(`${W} .dcx-wz .spin`) && !!document.querySelector(`${W} [data-dxwznext]:not([disabled])`), W, { timeout: 60000 }).catch(() => {});
    await dclick(p, `${W} [data-dxwznext]`, 1200).catch(() => {});
  }
  const d = await cur(p);
  const withText = d.pages.filter((x) => x.blocks.some((b) => /Section \d/.test(b.text || b.html || "")));
  expect(withText.length).toBe(3);
  expect(withText[0].lay).toBeUndefined();
  expect(withText[1].lay?.or).toBe("l"); expect(withText[1].lay!.ml!).toBeGreaterThan(withText[1].lay!.mr!);
  expect(withText[2].lay?.size).toBe("a5"); expect(d.set.size || "a4").toBe("a4");
  await ctx.close();
});
