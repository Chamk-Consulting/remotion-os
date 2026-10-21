/** Documents product phase 5 — slash menu, command palette (Ctrl+K), deleted blocks, synced blocks, charts linked to a table. */
import { test, expect, type Page } from "@playwright/test";
import { W, newShell, openShell, openDc, dclick, readStore, seededStore, shellWithStore, exportAs } from "../helpers/documents";

test.describe.configure({ timeout: 240_000 });
type Blk = { id: string; type: string; html?: string; syn?: { r: string; i: number }; labels?: string[]; series?: { vals: (number | null)[] }[] };
type St = { docs: Record<string, { pages: { blocks: Blk[] }[] }>; cur: string; reusable: { id: string; name: string; blocks: Blk[] }[] };
const blocks = async (p: Page) => { const st = (await readStore(p))!.json as St; return { st, all: st.docs[st.cur].pages.flatMap((pg) => pg.blocks) }; };
const selectBlock = async (p: Page, id: string) => { await p.locator(`${W} .dc-cv .dc-b[data-b="${id}"]`).click({ position: { x: 6, y: 4 } }); await p.waitForTimeout(500); };
async function palette(p: Page, q: string) {
  await p.locator(`${W} .dc-cv`).click({ position: { x: 5, y: 5 } }).catch(() => {});
  await p.keyboard.press("Control+Shift+K"); await p.locator(`${W} .dcx-pal [data-dxpq]`).focus();
  await p.keyboard.type(q, { delay: 10 }); await p.waitForTimeout(250);
}

test("slash menu replaces the empty paragraph; Ctrl+K inserts, finds and jumps; deleted blocks come back", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  // palette: insert an empty text block (it gets the caret)
  await palette(p, "Insert: Text");
  await expect(p.locator(`${W} .dcx-pall button.on`)).toContainText("Text");
  await p.keyboard.press("Enter"); await p.waitForTimeout(700);
  const n0 = (await blocks(p)).all.length;
  // slash menu: "/tab" filters, Enter puts a table where the paragraph was
  await p.keyboard.type("/tab", { delay: 30 }); await p.locator(`${W} .dcx-slash`).waitFor();
  await expect(p.locator(`${W} .dcx-slash button.on`)).toContainText("Table");
  await p.screenshot({ path: "test-results/p5-slash.png" });
  await p.keyboard.press("Enter"); await p.waitForTimeout(1200);
  let b = await blocks(p);
  expect(b.all.length, "the paragraph was replaced, not kept").toBe(n0);
  expect(b.all.some((x) => x.type === "table")).toBe(true);
  expect(b.all.some((x) => (x.html || "").includes("/tab"))).toBe(false);
  await expect(p.locator(`${W} .dcx-slash`)).toHaveCount(0);
  // slash quick action: today's date
  await palette(p, "Insert: Text"); await p.keyboard.press("Enter"); await p.waitForTimeout(700);
  await p.keyboard.type("/today", { delay: 30 }); await p.locator(`${W} .dcx-slash`).waitFor(); await p.keyboard.press("Enter"); await p.waitForTimeout(1200);
  b = await blocks(p);
  expect(b.all.some((x) => (x.html || "").includes(String(new Date().getFullYear())))).toBe(true);
  // Escape closes the menu and leaves the text
  await palette(p, "Insert: Text"); await p.keyboard.press("Enter"); await p.waitForTimeout(700);
  await p.keyboard.type("/xyz", { delay: 30 }); await p.waitForTimeout(300);
  await expect(p.locator(`${W} .dcx-slash`)).toContainText("No matching block");
  await p.keyboard.press("Escape"); await expect(p.locator(`${W} .dcx-slash`)).toHaveCount(0);
  // delete the table, then bring it back from "Deleted blocks"
  const tableId = b.all.find((x) => x.type === "table")!.id; const tableIdx = b.all.findIndex((x) => x.id === tableId);
  await selectBlock(p, tableId); await dclick(p, `${W} .dc-b.dc-sel [data-bdel]`, 1200);
  expect((await blocks(p)).all.some((x) => x.id === tableId)).toBe(false);
  await palette(p, "Deleted"); await p.keyboard.press("Enter"); await p.waitForTimeout(600);
  await expect(p.locator(`${W} .dcx-trr`)).toHaveCount(1);
  await dclick(p, `${W} .dc-mdl [data-dxtr]`, 1200);
  b = await blocks(p);
  expect(b.all.findIndex((x) => x.id === tableId), "restored at its place").toBe(tableIdx);
  // palette search jumps to a block of the document
  const word = await p.evaluate((W) => { const t = [...document.querySelectorAll(`${W} .dc-cv .dc-b.t-h [data-ed]`)].map((e) => e.textContent!.trim()).filter(Boolean); return t[t.length - 1]; }, W);
  await palette(p, word); await expect(p.locator(`${W} .dcx-pall button.on small`)).toContainText("Go to block");
  await p.screenshot({ path: "test-results/p5-palette.png" });
  await p.keyboard.press("Enter"); await p.waitForTimeout(800);
  await expect(p.locator(`${W} .dc-cv .dc-b.dc-sel`)).toContainText(word);
  await ctx.close();
});

test("synced blocks follow each other; detach stops it; a chart linked to a table redraws from the table", async ({ browser, baseURL }) => {
  const json = JSON.parse(await seededStore(browser, baseURL, [
    { id: "tb1", type: "table", title: "Pain", cols: [{ l: "Week" }, { l: "VAS" }], rows: [["W1", "7"], ["W2", "5"]] },
    { id: "ch1", type: "chart", title: "Pain chart", kind: "bar", labels: ["a"], vals: [1], unit: "", yMax: 10, col: "#3d7dfa", grid: true, link: "tb1" },
  ]));
  json.reusable = [{ id: "r1", name: "Consent footer", blocks: [{ id: "x1", type: "p", html: "Original consent wording" }] }];
  const ctx = await shellWithStore(browser, baseURL, JSON.stringify(json)); const p = await openShell(ctx); await openDc(p);
  // the chart was drawn from the table, and the stored chart says so too
  await expect(p.locator(`${W} .dc-b[data-b="ch1"]`)).toContainText("W2");
  // insert the saved block twice as synced copies
  for (let i = 0; i < 2; i++) { await palette(p, "Synced: Consent"); await p.keyboard.press("Enter"); await p.waitForTimeout(900); }
  let b = await blocks(p); const syn = b.all.filter((x) => x.syn?.r === "r1");
  expect(syn.length).toBe(2);
  await expect(p.locator(`${W} .dc-cv .dc-b.dcx-syn`)).toHaveCount(2);
  // edit one copy: the other copy and the saved block follow
  const ed = p.locator(`${W} .dc-b[data-b="${syn[0].id}"] [data-ed]`); await ed.click(); await p.keyboard.press("End"); await p.keyboard.type(" (v2)"); await p.waitForTimeout(1500);
  await expect(p.locator(`${W} .dc-b[data-b="${syn[1].id}"]`)).toContainText("Original consent wording (v2)");
  b = await blocks(p);
  expect(b.st.reusable[0].blocks[0].html).toContain("(v2)");
  expect(b.all.find((x) => x.id === syn[1].id)!.html).toContain("(v2)");
  // detach the second copy: it keeps its text but stops following
  await selectBlock(p, syn[1].id);
  await p.screenshot({ path: "test-results/p5-synced.png" });
  await dclick(p, `${W} [data-dxsyndet="${syn[1].id}"]`, 800);
  await ed.click(); await p.keyboard.press("End"); await p.keyboard.type(" (v3)"); await p.waitForTimeout(1500);
  b = await blocks(p);
  expect(b.all.find((x) => x.id === syn[1].id)!.syn).toBeUndefined();
  expect(b.all.find((x) => x.id === syn[1].id)!.html).not.toContain("(v3)");
  expect(b.st.reusable[0].blocks[0].html).toContain("(v3)");
  // linked chart: change a table cell, the chart data follows
  const cell = p.locator(`${W} .dc-b[data-b="tb1"] td[data-ed]`, { hasText: /^5$/ }); await cell.click(); await p.keyboard.press("Control+A"); await p.keyboard.type("3"); await p.waitForTimeout(1500);
  b = await blocks(p); const ch = b.all.find((x) => x.id === "ch1")!;
  expect(ch.labels).toEqual(["W1", "W2"]);
  expect(ch.series![0].vals).toEqual([7, 3]);
  await ctx.close();
});

test("typing shortcuts: '## ' makes a heading, '- ' a list, '> ' a quote, '---' a line", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  const fresh = async () => { await palette(p, "Insert: Text"); await p.keyboard.press("Enter"); await p.waitForTimeout(700); };
  await fresh(); await p.keyboard.type("## Treatment goals", { delay: 25 }); await p.waitForTimeout(1200);
  let b = await blocks(p);
  const h = b.all.find((x) => x.type === "h" && (x as unknown as { text?: string }).text === "Treatment goals") as unknown as { lv: number } | undefined;
  expect(h, "heading created and typed into").toBeTruthy(); expect(h!.lv).toBe(2);
  await fresh(); await p.keyboard.type("- first point", { delay: 25 }); await p.waitForTimeout(1200);
  b = await blocks(p); expect(b.all.some((x) => /<ul>\s*<li>first point/.test(x.html || ""))).toBe(true);
  await fresh(); await p.keyboard.type("> Patient said", { delay: 25 }); await p.waitForTimeout(1200);
  b = await blocks(p); expect(b.all.some((x) => (x as unknown as { var?: string }).var === "quote" && (x.html || "").includes("Patient said"))).toBe(true);
  const n = b.all.filter((x) => x.type === "sep").length;
  await fresh(); await p.keyboard.type("---", { delay: 25 }); await p.waitForTimeout(1200);
  b = await blocks(p); expect(b.all.filter((x) => x.type === "sep").length).toBe(n + 1);
  await ctx.close();
});

test("table formulas: references follow an inserted row, and the Word export carries live formula fields", async ({ browser, baseURL }) => {
  const json = await seededStore(browser, baseURL, [
    { id: "tf1", type: "table", title: "Scores", cols: [{ l: "Item" }, { l: "Score" }], rows: [["A", "7"], ["B", "5"], ["Total", "=SUM(B2:B3)"]] },
  ]);
  const ctx = await shellWithStore(browser, baseURL, json); const p = await openShell(ctx); await openDc(p);
  await expect(p.locator(`${W} .dc-b[data-b="tf1"] td[data-tc="1"]`).nth(2)).toHaveText("12");
  // insert a row above "B" from the cell menu: the total's range grows to B2:B4
  const cellB = p.locator(`${W} .dc-b[data-b="tf1"] tr[data-tr="1"] td[data-tc="0"]`); await cellB.click({ button: "right" }); await p.waitForTimeout(400);
  await p.locator(".os-menu button", { hasText: "Insert row above" }).first().click(); await p.waitForTimeout(900);
  const st = (await readStore(p))!.json as { docs: Record<string, { pages: { blocks: { id: string; rows?: string[][] }[] }[] }>; cur: string };
  const tb = st.docs[st.cur].pages.flatMap((x) => x.blocks).find((x) => x.id === "tf1")!;
  expect(tb.rows![3][1]).toBe("=SUM(B2:B4)");
  // Word export: the formula is a field Word recalculates, showing the current value
  const { path } = await exportAs(p, "docx");
  await ctx.close();
  const { execFileSync } = await import("node:child_process");
  let xml = ""; try { xml = execFileSync("unzip", ["-p", path, "word/document.xml"], { encoding: "utf8" }); } catch { test.skip(true, "unzip not installed"); }
  expect(xml).toMatch(/<w:instrText xml:space="preserve"> =SUM\(B2:B4\) <\/w:instrText>/);
});

test("PDF: a long paragraph is cut between lines at the sheet bottom — nothing is lost and the first lines stay on the first sheet", async ({ browser, baseURL }) => {
  const sent = Array.from({ length: 140 }, (_, i) => `Q${String(i + 1).padStart(3, "0")} the patient reports steady progress with the home exercise programme.`).join(" ");
  const json = await seededStore(browser, baseURL, [{ id: "zzlong", type: "p", html: sent }]);
  const ctx = await shellWithStore(browser, baseURL, json); const p = await openShell(ctx); await openDc(p);
  const { path } = await exportAs(p, "pdf");
  await ctx.close();
  const { execFileSync } = await import("node:child_process");
  const page = (n: number) => { try { return execFileSync("pdftotext", ["-f", String(n), "-l", String(n), path, "-"], { encoding: "utf8" }); } catch { return null; } };
  const all = (() => { try { return execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }); } catch { return null; } })();
  test.skip(all === null, "poppler-utils not installed");
  for (let i = 1; i <= 140; i++) expect(all, `sentence ${i}`).toContain(`Q${String(i).padStart(3, "0")}`);
  expect(page(1), "the paragraph starts on the first sheet").toContain("Q001");
  const p1 = page(1)!, p2 = page(2)!;
  // cut between two lines: the first sheet ends inside the paragraph and the second goes on with it
  const last1 = Math.max(...[...p1.matchAll(/Q(\d{3})/g)].map((m) => +m[1])), first2 = Math.min(...[...p2.matchAll(/Q(\d{3})/g)].map((m) => +m[1]));
  expect(first2 - last1).toBeLessThanOrEqual(1);
});

test("free document: a blank Word-like page from New document, typed into freely and saved", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await palette(p, "New document"); await p.keyboard.press("Enter"); await p.waitForTimeout(800);
  await expect(p.locator(`${W} .dc-mdl [data-dxfree]`)).toContainText("Free document");
  await p.screenshot({ path: "test-results/p5-newdoc.png" });
  await dclick(p, `${W} .dc-mdl [data-dxfree]`, 3000);
  const blk = p.locator(`${W} .dc-cv .wx-blk`).first(); await blk.waitFor({ timeout: 15000 });
  await blk.click(); await p.keyboard.type("Free text typed here", { delay: 15 }); await p.waitForTimeout(600);
  // word-processor tools: heading style, bold, a table
  await p.keyboard.press("Home"); await p.keyboard.press("Shift+End");
  await p.selectOption(`${W} [data-dxfblk]`, "h1"); await p.waitForTimeout(400);
  await p.locator(`${W} .dc-cv .wx-blk h1`).first().click(); await p.keyboard.press("End"); await p.keyboard.press("Enter");
  await p.keyboard.type("Body text", { delay: 15 }); await p.keyboard.press("Shift+Home"); await dclick(p, `${W} [data-dxf="bold"]`, 400);
  await p.keyboard.press("End"); await dclick(p, `${W} [data-dxf="table"]`, 1800);
  await p.screenshot({ path: "test-results/p5-free.png" });
  const st = (await readStore(p))!.json as { docs: Record<string, { kind: string; title: unknown; ex: { live?: unknown; blocks: { h: string }[] } }>; cur: string };
  const d = st.docs[st.cur];
  await ctx.close();
  expect(d.kind).toBe("word"); expect(d.ex.live).toBeTruthy();
  expect(JSON.stringify(d.title)).toContain("Untitled document");
  const html = d.ex.blocks.map((b) => b.h).join("");
  expect(html).toContain("Free text typed here");
  expect(html).toMatch(/<h1[^>]*>/);
  expect(html).toMatch(/<b>|font-weight:\s*(bold|700)/);
  expect(html).toMatch(/<table style="[^"]*border-collapse/);
  expect(html).toMatch(/border: 1px solid|border-style: solid|1px solid/);
});

test("a PDF opened as editable pages can be compared with the original, side by side and overlaid", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  const fs = await import("node:fs");
  const b64 = fs.readFileSync("tests/fixtures/acroform.pdf").toString("base64");
  await p.evaluate(([b64, W]) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u], "form.pdf", { type: "application/pdf" }));
    const tgt = document.querySelector(W + " .dc")!; for (const ev of ["dragenter", "dragover", "drop"]) tgt.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, [b64, W] as const);
  await p.locator(`${W} .dc-impm`).waitFor({ timeout: 15000 }); await p.waitForTimeout(1200);
  await dclick(p, `${W} .dc-impm [data-lvmode="live"]`, 4000);
  await dclick(p, `${W} .dc-impm [data-impgo]`, 4000);
  await p.locator(`${W} .dc-cv .wx-page`).first().waitFor({ timeout: 30000 });
  await dclick(p, `${W} [data-dxcmp]`, 3000);
  await p.locator(`${W} .dcx-cmp [data-dxcmpo] canvas`).waitFor({ timeout: 15000 });
  await expect(p.locator(`${W} .dcx-cmp [data-dxcmpn] .wx-page`)).toHaveCount(1);
  await expect(p.locator(`${W} .dcx-cmp [data-dxcmppos]`)).toContainText("Page 1 of");
  await p.locator(`${W} [data-dxcmpop]`).fill("60"); await p.waitForTimeout(300);
  expect(await p.locator(`${W} .dcx-cmpov2`).evaluate((c) => (c as HTMLElement).style.opacity)).toBe("0.6");
  await p.screenshot({ path: "test-results/p5-compare.png" });
  await ctx.close();
});
