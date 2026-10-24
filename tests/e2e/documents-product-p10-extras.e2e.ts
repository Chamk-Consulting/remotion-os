/** Documents product phase 10 — the extras: break rules and several page layouts come back in from Word / OpenDocument, a
 *  footer text and a page-number restart per section (on screen and in Word, OpenDocument, RTF), a table row too tall for any
 *  sheet cut where it stands, and an image shrunk in place when most of it fits. */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { W, newShell, openShell, openDc, readStore, typeInFirstParagraph, shellWithStore, exportAs, dclick } from "../helpers/documents";

test.describe.configure({ timeout: 300_000 });
type Blk = { id: string; type: string; html?: string; text?: string; kn?: boolean; keep?: boolean; wo?: number; pgb?: boolean };
type Pg = { lay?: { or?: string; size?: string }; pf?: string; pn?: number; blocks: Blk[] };
type Doc = { set: Record<string, unknown>; pages: Pg[] };
type St = { cur: string; order: string[]; docs: Record<string, Doc> };

const S = "Range of motion improved and pain was lower after the second week of the programme. ";
const fill = (id: string, n: number, extra: Record<string, unknown> = {}) => ({ id, type: "p", html: `${id}: ` + S.repeat(n), ...extra });
const svg = (w: number, h: number) => "data:image/svg+xml;base64," + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#7aa"/></svg>`).toString("base64");

async function base(browser: Parameters<typeof newShell>[0], baseURL: string | undefined) {
  const c = await newShell(browser, baseURL); const a = await openShell(c); await openDc(a); await typeInFirstParagraph(a, " ");
  const json = (await readStore(a))!.json as St; await c.close(); return json;
}
async function withPages(browser: Parameters<typeof newShell>[0], baseURL: string | undefined, pages: unknown[]) {
  const json = await base(browser, baseURL); json.docs[json.cur].pages = pages as Pg[]; return JSON.stringify(json);
}
const cur = async (p: Page) => { const st = (await readStore(p))!.json as St; return st.docs[st.cur]; };
async function importFile(p: Page, path: string, name: string, type: string) {
  const b64 = fs.readFileSync(path).toString("base64");
  await p.evaluate(([b64, name, type, W]) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u], name, { type })); const t = document.querySelector(W + " .dc")!; for (const ev of ["dragenter", "dragover", "drop"]) t.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt })); }, [b64, name, type, W] as const);
  await p.locator(`${W} .dc-impm`).waitFor({ timeout: 15000 });
  for (let i = 0; i < 10 && (await p.locator(`${W} .dc-impm`).count()); i++) {
    await p.waitForFunction((W) => !document.querySelector(`${W} .dcx-wz .spin`) && !!document.querySelector(`${W} [data-dxwznext]:not([disabled])`), W, { timeout: 60000 }).catch(() => {});
    await dclick(p, `${W} [data-dxwznext]`, 1200).catch(() => {});
  }
  return cur(p);
}
const feet = (p: Page) => p.evaluate((W) => [...document.querySelectorAll<HTMLElement>(`${W} .dc-cv .dc-page`)].map((s) => [s.querySelector(".dc-pf span:first-child")?.textContent, s.querySelector(".dc-pf span:last-child")?.textContent]), W);

test("break rules and several page layouts come back from Word and OpenDocument", async ({ browser, baseURL }) => {
  const json = await withPages(browser, baseURL, [
    { id: "a", blocks: [fill("kn", 2, { kn: true }), fill("keep", 2, { keep: true }), fill("one", 2, { wo: 1 }), fill("plain", 2)] },
    { id: "b", lay: { or: "l" }, blocks: [fill("land", 3)] },
    { id: "c", blocks: [fill("back", 3)] },
  ]);
  const ctx = await shellWithStore(browser, baseURL, json); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-page[data-page="2"]`).first().waitFor();
  const docx = (await exportAs(p, "docx")).path, odt = (await exportAs(p, "odt")).path;

  const find = (d: Doc, id: string) => d.pages.flatMap((x) => x.blocks).find((b) => (b.html || "").includes(id + ":"))!;
  let d = await importFile(p, docx, "rules.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  expect(find(d, "kn").kn).toBe(true); expect(find(d, "keep").keep).toBe(true); expect(find(d, "one").wo).toBe(1);
  expect(find(d, "plain").kn).toBeUndefined(); expect(find(d, "plain").wo).toBeUndefined();

  d = await importFile(p, odt, "layouts.odt", "application/vnd.oasis.opendocument.text");
  const pageOf = (id: string) => d.pages.find((x) => x.blocks.some((b) => (b.html || "").includes(id + ":")))!;
  expect(pageOf("plain").lay?.or).toBeUndefined(); expect(pageOf("land").lay?.or).toBe("l"); expect(pageOf("back").lay?.or).toBeUndefined();
  expect(d.set.or || "p").toBe("p");
  await ctx.close();
});

test("a footer text and a page-number restart for one section, on screen and in Word, OpenDocument and RTF", async ({ browser, baseURL }) => {
  const json = await withPages(browser, baseURL, [
    { id: "a", blocks: [fill("one", 3)] }, { id: "b", blocks: [fill("letter", 3)] }, { id: "c", blocks: [fill("letter2", 3)] },
  ]);
  const ctx = await shellWithStore(browser, baseURL, json); const p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-page[data-page="2"]`).first().waitFor();
  // section 2 and after: own footer, numbering from 1
  await p.evaluate((W) => { const pg = document.querySelector(`${W} .dc-page[data-page="1"]:not([data-part])`)!; const r = pg.getBoundingClientRect();
    pg.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.bottom - 30 })); }, W);
  await p.waitForTimeout(300); await p.locator(".os-menu button", { hasText: "Page setup" }).first().click(); await p.waitForTimeout(400);
  await dclick(p, `${W} .dcx-laym [data-dxlaysc="after"]`, 150);
  await p.locator(`${W} .dcx-laym [data-dxlayft]`).fill("Letter to Dr Smith"); await p.locator(`${W} .dcx-laym [data-dxlaypn]`).fill("1");
  await dclick(p, `${W} .dc-mdl [data-dxlayok]`, 1200);
  const d = await cur(p);
  expect(d.pages[0].pf).toBeUndefined(); expect(d.pages[1].pf).toBe("Letter to Dr Smith"); expect(d.pages[2].pf).toBe("Letter to Dr Smith");
  expect(d.pages[1].pn).toBe(1); expect(d.pages[2].pn).toBeUndefined();
  const f = await feet(p);
  expect(f[0][0]).not.toContain("Dr Smith"); expect(f[1][0]).toBe("Letter to Dr Smith"); expect(f[2][0]).toBe("Letter to Dr Smith");
  expect(f.map((x) => /(\d+)\D+(\d+)/.exec(x[1] || "")!.slice(1).map(Number))).toEqual([[1, 3], [1, 3], [2, 3]]);

  const docx = (await exportAs(p, "docx")).path; const x = execFileSync("unzip", ["-p", docx, "word/document.xml"]).toString();
  const f2 = execFileSync("unzip", ["-p", docx, "word/footer2.xml"]).toString();
  expect(f2).toContain("Letter to Dr Smith"); expect(x).toMatch(/<w:pgNumType w:start="1"\/>/);
  expect((x.match(/r:id="rIdF2"/g) || []).length).toBe(2); expect((x.match(/r:id="rIdF"/g) || []).length).toBe(1);

  const odt = (await exportAs(p, "odt")).path; const sty = execFileSync("unzip", ["-p", odt, "styles.xml"]).toString(), con = execFileSync("unzip", ["-p", odt, "content.xml"]).toString();
  expect(sty).toContain("Letter to Dr Smith"); expect(con).toMatch(/style:page-number="1"/);

  const rtf = fs.readFileSync((await exportAs(p, "rtf")).path, "latin1");
  expect(rtf).toMatch(/\\pgnrestart\\pgnstarts1/); expect((rtf.match(/Letter to Dr Smith/g) || []).length).toBe(2);
  await ctx.close();
});

test("a row too tall for any sheet is cut where it stands; an image mostly fitting shrinks in place", async ({ browser, baseURL }) => {
  // first pass: how much room is left under a spacer, and how tall the picture is
  const pic = svg(400, 500);
  const probe = await withPages(browser, baseURL, [{ id: "a", blocks: [fill("top", 2), { id: "sp", type: "spc", h: 4 }, { id: "im", type: "img", src: pic, cap: "", iw: 100 }] }]);
  let ctx = await shellWithStore(browser, baseURL, probe); let p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-b[data-b="im"] img`).first().waitFor(); await p.waitForTimeout(1500);
  const m = await p.evaluate((W) => { const pg = document.querySelector<HTMLElement>(`${W} .dc-cv .dc-page[data-page="0"]:not([data-part])`)!; const st = pg.style, r = pg.getBoundingClientRect(); const s = r.width / parseFloat(st.getPropertyValue("--pw"));
    const lim = r.top + (parseFloat(st.getPropertyValue("--ph")) - (parseFloat(st.getPropertyValue("--mb")) || parseFloat(st.getPropertyValue("--my"))) - 22) * s;
    const im = document.querySelector<HTMLImageElement>(`${W} .dc-b[data-b="im"] img`)!; const ir = im.getBoundingClientRect(); const w = im.parentElement!.getBoundingClientRect().width;
    return { s, room: lim - ir.top, natural: w * 500 / 400 }; }, W);
  await ctx.close();
  const sp = Math.max(4, Math.min(400, Math.round((m.room - m.natural * 0.85) / m.s)));
  const json = await withPages(browser, baseURL, [
    { id: "a", blocks: [fill("top", 2), { id: "sp", type: "spc", h: sp }, { id: "im", type: "img", src: pic, cap: "", iw: 100 }] },
    { id: "b", blocks: [fill("before", 2), { id: "tall", type: "table", title: "", cols: [{ l: "Item" }, { l: "Notes" }], rows: [["Long note", S.repeat(110)], ["After", "short"]] }] },
  ]);
  ctx = await shellWithStore(browser, baseURL, json); p = await openShell(ctx); await openDc(p);
  await p.locator(`${W} .dc-b[data-b="tall"]`).first().waitFor(); await p.waitForTimeout(2000);
  const r = await p.evaluate((W) => {
    const im = document.querySelector<HTMLElement>(`${W} .dc-cv .dc-b[data-b="im"]`)!; const before = document.querySelector<HTMLElement>(`${W} .dc-cv .dc-b[data-b="before"]`)!;
    const t0 = document.querySelector<HTMLElement>(`${W} .dc-cv .dc-b[data-b="tall"]:not(.dc-bc)`)!;
    return { imFit: im.classList.contains("dcx-ifit"), imSheet: im.closest<HTMLElement>(".dc-page")!.dataset.part || "0",
      tallSheet: t0.closest<HTMLElement>(".dc-page")!.dataset.part || "0", beforeSheet: before.closest<HTMLElement>(".dc-page")!.dataset.part || "0",
      parts: document.querySelectorAll(`${W} .dc-cv .dc-b[data-b="tall"]`).length, cut: !!document.querySelector(`${W} .dc-cv .dc-b[data-b="tall"] tr[data-dxrow]`) };
  }, W);
  expect(r.imFit).toBe(true); expect(r.imSheet).toBe("0");
  expect(r.tallSheet).toBe(r.beforeSheet); expect(r.parts).toBeGreaterThanOrEqual(2); expect(r.cut).toBe(true);
  await ctx.close();
});
