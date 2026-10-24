/** Documents product phase 8 — smart page breaks, the same in the editor and in the PDF: a paragraph is cut between two lines
 *  (two lines at least on each side), a list between two items (two items at least on each side, numbering goes on), an image
 *  taller than a sheet shrinks to fit, and a cut paragraph is still edited and saved as one block. */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { W, newShell, openShell, openDc, readStore, typeInFirstParagraph, shellWithStore, exportAs } from "../helpers/documents";

test.describe.configure({ timeout: 300_000 });
type Doc = { pages: { blocks: { id: string; type: string; html?: string }[] }[] };
type St = { cur: string; docs: Record<string, Doc> };

const S = "Range of motion improved and pain was lower after the second week of the programme. ";
const fill = (id: string, n: number) => ({ id, type: "p", html: S.repeat(n) });
const items = (n: number, tag: string) => `<${tag}>${Array.from({ length: n }, (_, i) => `<li>Exercise ${i + 1}: three sets of twelve, slow and controlled</li>`).join("")}</${tag}>`;
const tall = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="2400"><rect width="400" height="2400" fill="#7aa"/></svg>').toString("base64");

async function store(browser: Parameters<typeof newShell>[0], baseURL: string | undefined) {
  const c = await newShell(browser, baseURL); const a = await openShell(c); await openDc(a); await typeInFirstParagraph(a, " ");
  const json = (await readStore(a))!.json as St; await c.close();
  const d = json.docs[json.cur];
  d.pages = [
    { id: "s1", blocks: [fill("f1", 6), fill("f2", 6), fill("f3", 6), fill("long", 60)] },
    { id: "s2", blocks: [fill("f4", 6), fill("f5", 6), { id: "ul", type: "p", html: items(40, "ul") }] },
    { id: "s3", blocks: [fill("f6", 6), { id: "ol", type: "p", html: items(60, "ol") }] },
    { id: "s4", blocks: [fill("f7", 2), { id: "img", type: "img", src: tall, cap: "", iw: 100 }] },
  ] as unknown as Doc["pages"];
  return JSON.stringify(json);
}
const parts = (p: Page, id: string) => p.evaluate(([W, id]) => [...document.querySelectorAll<HTMLElement>(`${W} .dc-cv .dc-b[data-b="${id}"]`)].map((b) => {
  const pg = b.closest<HTMLElement>(".dc-page")!; const st = pg.style; const r = b.getBoundingClientRect(), pr = pg.getBoundingClientRect(); const s = pr.width / parseFloat(st.getPropertyValue("--pw"));
  const ed = b.querySelector<HTMLElement>("[data-ed]") || b; const lh = parseFloat(getComputedStyle(ed).lineHeight) || 20;
  const lim = pr.top + (parseFloat(st.getPropertyValue("--ph")) - parseFloat(st.getPropertyValue("--mb")) - 22) * s;
  return { cont: b.classList.contains("dcx-pcont"), part: +(pg.dataset.part || 0), text: (ed.textContent || "").replace(/\s+/g, " ").trim(), lines: Math.round(ed.getBoundingClientRect().height / (lh * s)),
    over: r.bottom - lim, li: b.querySelectorAll("li").length, start: b.querySelector("ol")?.getAttribute("start") || null, firstLiMarked: !!b.querySelector("li[data-dxh]"), img: b.querySelector("img")?.getBoundingClientRect().height || 0, room: lim - pr.top };
}), [W, id] as const);
const cur = async (p: Page) => { const st = (await readStore(p))!.json as St; return st.docs[st.cur]; };

test("the editor cuts paragraphs between lines and lists between items, images shrink, the PDF breaks the same", async ({ browser, baseURL }) => {
  const ctx = await shellWithStore(browser, baseURL, await store(browser, baseURL)); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-b[data-b="img"]`).first().waitFor(); await p.waitForTimeout(1500);

  // paragraph: two parts, each at least two lines, nothing lost, the first ends above the sheet bottom
  const lp = await parts(p, "long");
  expect(lp.length).toBeGreaterThanOrEqual(2); expect(lp[1].cont).toBe(true); expect(lp[1].part).toBeGreaterThan(lp[0].part);
  expect(lp[0].lines).toBeGreaterThanOrEqual(2); expect(lp[lp.length - 1].lines).toBeGreaterThanOrEqual(2); expect(lp[0].over).toBeLessThanOrEqual(1);
  expect(lp.map((x) => x.text).join(" ").replace(/\s+/g, " ")).toBe(S.repeat(60).trim());

  // bullet list: cut between items, two at least on each side, no item shown twice
  const ul = await parts(p, "ul");
  expect(ul.length).toBeGreaterThanOrEqual(2); expect(ul[0].li).toBeGreaterThanOrEqual(2); expect(ul[ul.length - 1].li).toBeGreaterThanOrEqual(2);
  expect(ul.reduce((a, x) => a + x.li, 0)).toBe(40); expect(ul.slice(1).some((x) => x.firstLiMarked)).toBe(false);

  // numbered list: the continuation starts at the next number
  const ol = await parts(p, "ol");
  expect(ol.length).toBeGreaterThanOrEqual(2); expect(ol.reduce((a, x) => a + x.li, 0)).toBe(60); expect(+ol[1].start!).toBe(ol[0].li + 1);

  // tall image: shrunk to the room of its sheet
  const im = await parts(p, "img");
  expect(im.length).toBe(1); expect(im[0].over).toBeLessThanOrEqual(1); expect(im[0].img).toBeLessThan(im[0].room);

  // the PDF has as many pages as the editor has sheets
  const sheets = await p.locator(`${W} .dc-cv .dc-page`).count();
  const pdf = fs.readFileSync((await exportAs(p, "pdf")).path).toString("latin1");
  expect((pdf.match(/\/Type\s*\/Page\b(?!s)/g) || []).length).toBe(sheets);
  await ctx.close();
});

test("a paragraph cut over two sheets is edited and saved as one block", async ({ browser, baseURL }) => {
  const ctx = await shellWithStore(browser, baseURL, await store(browser, baseURL)); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-b.dcx-pcont[data-b="long"]`).first().waitFor({ timeout: 15000 });
  // type at the end of the continuation
  const ed = p.locator(`${W} .dc-b.dcx-pcont[data-b="long"] [data-ed]`).last();
  await ed.click(); await p.keyboard.press("Control+End"); await p.keyboard.type(" Next review in May."); await p.waitForTimeout(1500);
  let b = (await cur(p)).pages[0].blocks.find((x) => x.id === "long")!;
  let txt = b.html!.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  expect(txt.startsWith(S.trim())).toBe(true); expect(txt.endsWith("Next review in May.")).toBe(true);
  expect(txt.split("Range of motion").length - 1).toBe(60); expect(b.html).not.toMatch(/data-dxh|list-style/);
  // type in the first part: the text after the cut is kept, the caret stays where it was
  const e0 = p.locator(`${W} .dc-b[data-b="long"]:not(.dcx-pcont) [data-ed]`);
  await e0.click({ position: { x: 5, y: 5 } }); await p.waitForTimeout(800); await p.keyboard.press("Home"); await p.keyboard.type("Note: "); await p.waitForTimeout(1500);
  await p.keyboard.type("ok "); await p.waitForTimeout(1200);
  b = (await cur(p)).pages[0].blocks.find((x) => x.id === "long")!;
  txt = b.html!.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  expect(txt.startsWith("Note: ok Range of motion")).toBe(true); expect(txt.endsWith("Next review in May.")).toBe(true);
  expect(txt.split("Range of motion").length - 1).toBe(60);
  // still cut in two after the edits
  expect(await p.locator(`${W} .dc-b.dcx-pcont[data-b="long"]`).count()).toBeGreaterThanOrEqual(1);
  await ctx.close();
});
