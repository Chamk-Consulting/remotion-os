/** Documents product phase 9 — break options and the remaining smart breaks: lines kept together per block, quotes cut between
 *  lines, a table row taller than a sheet cut inside its cells, the header row repeated or not, arrows / Backspace across a cut,
 *  and the break rules and page layouts written into Word, OpenDocument, RTF and Word HTML. */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { W, newShell, openShell, openDc, readStore, typeInFirstParagraph, shellWithStore, exportAs, dclick } from "../helpers/documents";

test.describe.configure({ timeout: 300_000 });
type Blk = { id: string; type: string; html?: string; wo?: number | null; hrep?: boolean; rows?: string[][] };
type Doc = { set: Record<string, unknown>; pages: { lay?: Record<string, unknown>; blocks: Blk[] }[] };
type St = { cur: string; docs: Record<string, Doc> };

const S = "Range of motion improved and pain was lower after the second week of the programme. ";
const fill = (id: string, n: number, extra: Record<string, unknown> = {}) => ({ id, type: "p", html: S.repeat(n), ...extra });
const table = (id: string, rows: string[][], extra: Record<string, unknown> = {}) => ({ id, type: "table", title: "", cols: [{ l: "Exercise" }, { l: "Notes" }], rows, ...extra });

async function store(browser: Parameters<typeof newShell>[0], baseURL: string | undefined) {
  const c = await newShell(browser, baseURL); const a = await openShell(c); await openDc(a); await typeInFirstParagraph(a, " ");
  const json = (await readStore(a))!.json as St; await c.close();
  const d = json.docs[json.cur];
  const many = Array.from({ length: 70 }, (_, i) => [`Exercise ${i + 1}`, "three sets of twelve"]);
  d.pages = [
    { id: "s1", blocks: [fill("f1", 6), fill("f2", 6), fill("f3", 6), fill("wo4", 60, { wo: 4 })] },
    { id: "s2", blocks: [fill("f4", 10), { id: "q", type: "quote", html: S.repeat(60), src: "" }] },
    { id: "s3", blocks: [fill("f5", 4), table("rep", many)] },
    { id: "s4", blocks: [fill("f6", 4), table("norep", many, { hrep: false })] },
    { id: "s5", blocks: [table("tall", [["Long note", S.repeat(110)], ["After", "short"]])] },
    { id: "s6", blocks: [fill("kn", 2, { kn: true }), fill("keep", 2, { keep: true }), fill("pgb", 2, { pgb: true }), fill("w1", 2, { wo: 1 })] },
  ] as unknown as Doc["pages"];
  d.pages[1].lay = { or: "l" };
  return JSON.stringify(json);
}
const cur = async (p: Page) => { const st = (await readStore(p))!.json as St; return st.docs[st.cur]; };
const blk = async (p: Page, id: string) => (await cur(p)).pages.flatMap((x) => x.blocks).find((b) => b.id === id)!;
const txt = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const info = (p: Page, id: string) => p.evaluate(([W, id]) => [...document.querySelectorAll<HTMLElement>(`${W} .dc-cv .dc-b[data-b="${id}"]`)].map((b) => {
  const ed = b.querySelector<HTMLElement>("[data-ed]") || b; const pg = b.closest<HTMLElement>(".dc-page")!; const s = pg.getBoundingClientRect().width / (parseFloat(pg.style.getPropertyValue("--pw")) || 640);
  const lh = (parseFloat(getComputedStyle(ed).lineHeight) || 20) * s;
  return { cont: b.classList.contains("dc-bc"), lines: Math.round(ed.getBoundingClientRect().height / lh), thead: !!b.querySelector("thead"), rows: b.querySelectorAll("tbody>tr").length, dxrow: !!b.querySelector("tr[data-dxrow]"),
    text: (b.querySelector("blockquote") || ed).textContent!.replace(/\s+/g, " ").trim(), cell: [...b.querySelectorAll<HTMLElement>("tbody td[data-tc='1']")].map((c) => c.textContent!.replace(/\s+/g, " ").trim()) };
}), [W, id] as const);

test("lines per block, quotes, tall table rows, header row, keyboard across a cut", async ({ browser, baseURL }) => {
  const ctx = await shellWithStore(browser, baseURL, await store(browser, baseURL)); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-b[data-b="tall"]`).first().waitFor(); await p.waitForTimeout(1800);

  // four lines kept on each side of the cut
  const w4 = await info(p, "wo4");
  expect(w4.length).toBeGreaterThanOrEqual(2); expect(w4[0].lines).toBeGreaterThanOrEqual(4); expect(w4[w4.length - 1].lines).toBeGreaterThanOrEqual(4);

  // a quote is cut between lines, nothing lost
  const q = await info(p, "q");
  expect(q.length).toBeGreaterThanOrEqual(2); expect(q.map((x) => x.text).join(" ").replace(/\s+/g, " ")).toBe(S.repeat(60).trim());

  // the header row is repeated by default, not when switched off
  const rep = await info(p, "rep"), norep = await info(p, "norep");
  expect(rep.length).toBeGreaterThanOrEqual(2); expect(rep[1].thead).toBe(true); expect(rep.reduce((a, x) => a + x.rows, 0)).toBe(70);
  expect(norep.length).toBeGreaterThanOrEqual(2); expect(norep[0].thead).toBe(true); expect(norep[1].thead).toBe(false);

  // a row taller than a sheet is cut inside its cells, the text is all there once
  const tl = await info(p, "tall");
  expect(tl.length).toBeGreaterThanOrEqual(2); expect(tl[1].dxrow).toBe(true);
  const cellText = tl.map((x) => x.cell[0]).join(" ").replace(/\s+/g, " ");
  expect(cellText).toBe(S.repeat(110).trim()); expect(tl[tl.length - 1].cell).toContain("short");

  // editing the second half of the cut cell saves the whole cell
  const c2 = p.locator(`${W} .dc-b.dc-bc[data-b="tall"] tr[data-dxrow] td[data-tc="1"]`).last();
  await c2.click(); await p.keyboard.press("Control+End"); await p.keyboard.type(" Seen again."); await p.waitForTimeout(1500);
  const tb = await blk(p, "tall"); expect(txt(tb.rows![0][1])).toBe((S.repeat(110) + "Seen again.").replace(/\s+/g, " ").trim());

  // arrows: the end of the first part leads into the second; Backspace at the start of the second deletes across the cut
  const first = p.locator(`${W} .dc-b[data-b="wo4"]:not(.dc-bc) [data-ed]`), second = p.locator(`${W} .dc-b.dc-bc[data-b="wo4"] [data-ed]`).first();
  await first.click(); await p.keyboard.press("Control+End"); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(200);
  expect(await second.evaluate((el) => document.activeElement === el)).toBe(true);
  const before = txt((await blk(p, "wo4")).html!);
  await p.keyboard.press("Backspace"); await p.waitForTimeout(1500);
  const after = txt((await blk(p, "wo4")).html!);
  expect(after.length).toBeLessThan(before.length); expect(after.length).toBeGreaterThanOrEqual(before.length - 2); // the last visible character (and a collapsed space after it) expect(after.split("Range of motion").length - 1).toBe(60);
  await p.keyboard.press("ArrowLeft"); await p.keyboard.press("ArrowRight"); // still moving freely, no error

  // the lines setting from the properties panel
  await p.locator(`${W} .dc-b[data-b="f1"] [data-ed]`).click(); await p.waitForTimeout(500);
  const sel = p.locator(`${W} [data-dxwo]`);
  if (!(await p.locator(`${W} [data-ppt="disp"]`).count())) await dclick(p, `${W} [data-dcopen="rp"]`, 600).catch(() => {});
  await dclick(p, `${W} [data-ppt="disp"]`, 500);
  const selId = await p.evaluate((W) => document.querySelector<HTMLElement>(`${W} .dc-b.dc-sel`)?.dataset.b, W);
  await sel.selectOption("3");
  await expect.poll(async () => (await blk(p, selId!)).wo, { timeout: 5000 }).toBe(3);
  expect(await p.locator(`${W} .dc-b[data-b="${selId}"][data-wo="3"]`).count()).toBeGreaterThanOrEqual(1);
  await ctx.close();
});

test("break rules and page layouts are written into Word, OpenDocument, RTF and Word HTML", async ({ browser, baseURL }) => {
  const ctx = await shellWithStore(browser, baseURL, await store(browser, baseURL)); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-b[data-b="tall"]`).first().waitFor(); await p.waitForTimeout(1200);

  const docx = (await exportAs(p, "docx")).path; const x = execFileSync("unzip", ["-p", docx, "word/document.xml"]).toString();
  expect(x).toMatch(/<w:keepNext\/>/); expect(x).toMatch(/<w:keepLines\/>/); expect(x).toMatch(/<w:pageBreakBefore\/>/); expect(x).toMatch(/<w:widowControl w:val="0"\/>/);
  expect((x.match(/<w:tblHeader\/>/g) || []).length).toBe(2); // rep and tall; norep has none
  expect((x.match(/<w:sectPr>/g) || []).length).toBeGreaterThanOrEqual(6); expect(x).toMatch(/w:orient="landscape"/);

  const odt = (await exportAs(p, "odt")).path; const c = execFileSync("unzip", ["-p", odt, "content.xml"]).toString();
  expect(c).toMatch(/fo:keep-with-next="always"/); expect(c).toMatch(/fo:keep-together="always"/); expect(c).toMatch(/fo:break-before="page"/); expect(c).toMatch(/fo:widows="1"/);
  expect(c).toMatch(/text:style-name="BK\d+"/);

  const rtf = fs.readFileSync((await exportAs(p, "rtf")).path, "latin1");
  expect(rtf).toMatch(/\\keepn/); expect(rtf).toMatch(/\\keep[^n]/); expect(rtf).toMatch(/\\pagebb/); expect(rtf).toMatch(/\\nowidctlpar/);
  expect((rtf.match(/\\sect\\sectd/g) || []).length).toBe(5); expect(rtf).toMatch(/\\lndscpsxn/);

  const doc = fs.readFileSync((await exportAs(p, "doc")).path, "utf8");
  expect(doc).toMatch(/@page Section2\{size:29\.7cm 21cm;mso-page-orientation:landscape/); expect(doc).toMatch(/<div class="Section6">/);
  expect((doc.match(/mso-break-type:section-break/g) || []).length).toBe(5);
  await ctx.close();
});
