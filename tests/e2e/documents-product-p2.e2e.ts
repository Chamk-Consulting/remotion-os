/** Documents product phase 2 — the PDF keeps every character, its fonts, its photos, links and headings. */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { W, openShell, openDc, seededStore, shellWithStore, exportAs } from "../helpers/documents";

test.describe.configure({ timeout: 240_000 });
const tool = (cmd: string, args: string[]) => { try { return execFileSync(cmd, args, { encoding: "utf8" }); } catch { return null; } };
const JPEG = "data:image/jpeg;base64," + fs.readFileSync("tests/fixtures/photo.jpg").toString("base64");
const TEXT = "ZZCHARS éàçüœ Œuvre naïve ≥ ≤ ≠ ∞ ✓ ✗ ☐ ☑ → αβγ Ω Ж";

test("PDF export: every character stays text, fonts embedded, JPEG kept, links and bookmarks", async ({ browser, baseURL }) => {
  const store = await seededStore(browser, baseURL, [
    { id: "zzh1", type: "h", lv: 1, text: "ZZHEADING bookmarks" },
    { id: "zzp1", type: "p", html: TEXT },
    { id: "zzp2", type: "p", html: "Arabic: مرحبا بالعالم" },
    { id: "zzp3", type: "p", html: 'Visit <a href="https://example.org/zzlink">ZZLINK</a> now.' },
    { id: "zzimg", type: "img", src: JPEG, cap: "ZZPHOTO", iw: 60 },
  ]);
  const ctx = await shellWithStore(browser, baseURL, store); const p = await openShell(ctx); await openDc(p);
  await expect(p.locator(`${W} .dc-cv`)).toContainText("ZZCHARS");
  const { path } = await exportAs(p, "pdf");
  await ctx.close();
  const size = fs.statSync(path).size;
  const txt = tool("pdftotext", [path, "-"]);
  test.skip(txt === null, "poppler-utils not installed");
  for (const s of ["ZZCHARS", "éàçüœ", "Œuvre", "naïve", "≥", "≤", "≠", "∞", "✓", "✗", "☐", "☑", "→", "αβγ", "Ω", "Ж", "ZZLINK", "ZZHEADING"]) expect(txt, s).toContain(s);
  expect(txt!.includes("مرحبا") || txt!.includes("ابحرم"), "Arabic extractable").toBe(true);
  expect(txt).not.toContain("?????");
  const fonts = tool("pdffonts", [path])!;
  expect(fonts).toMatch(/Inter/);
  expect(fonts).toMatch(/NotoSansArabic/);
  for (const line of fonts.split("\n").slice(2).filter((l) => l.trim() && /CID TrueType/.test(l))) expect(line, line).toMatch(/\byes\s+yes\s+yes\b/);
  const imgs = tool("pdfimages", ["-list", path])!;
  expect(imgs).toMatch(/\bjpeg\b/);
  const raw = fs.readFileSync(path).toString("latin1");
  expect(raw).toContain("/URI (https://example.org/zzlink)");
  expect(raw).toContain("/Outlines");
  expect(size, "size with a 1600×1000 photo").toBeLessThan(600_000);
  expect(tool("qpdf", ["--check", path])).toContain("No syntax or stream encoding errors");
});

/** Opens the print centre from the Layout ribbon, sets options, saves as PDF and returns the file. */
async function printCentrePdf(p: import("@playwright/test").Page, set: (p: import("@playwright/test").Page) => Promise<void>) {
  const { dclick } = await import("../helpers/documents");
  await dclick(p, `${W} [data-rib="layout"]`, 400); await dclick(p, `${W} [data-dcmd="printc"]`, 2500);
  await p.locator(`${W} .dc-prm .dc-prpg`).first().waitFor({ timeout: 30000 });
  await dclick(p, `${W} .dc-prm [data-prdest="pdf"]`, 400);
  await set(p);
  const [d] = await Promise.all([p.waitForEvent("download", { timeout: 90000 }), dclick(p, `${W} .dc-prm [data-prgo]`, 500)]);
  const path = `test-results/pc-${Date.now()}.pdf`; await d.saveAs(path); return path;
}
const pages = (path: string) => { const o = tool("qpdf", ["--show-npages", path]); return o ? +o.trim() : -1; };

test("print centre: odd pages, 4 pages per sheet, header and footer with an Arabic patient name", async ({ browser, baseURL }) => {
  const store = JSON.parse(await seededStore(browser, baseURL, [])) as { docs: Record<string, { pt?: Record<string, string> }>; cur: string };
  store.docs[store.cur].pt = { ...(store.docs[store.cur].pt || {}), prenom: "نادية", nom: "حداد" };
  const ctx = await shellWithStore(browser, baseURL, JSON.stringify(store)); const p = await openShell(ctx); await openDc(p);
  const { dclick } = await import("../helpers/documents");
  // all pages first, to know the page count
  const all = await printCentrePdf(p, async () => {});
  const n = pages(all); test.skip(n < 0, "qpdf not installed"); expect(n).toBeGreaterThan(2);
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  const odd = await printCentrePdf(p, async (q) => { await dclick(q, `${W} .dc-prm [data-prpages="odd"]`, 800); });
  expect(pages(odd)).toBe(Math.ceil(n / 2));
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  const nup = await printCentrePdf(p, async (q) => { await dclick(q, `${W} .dc-prm [data-prpages="all"]`, 500); await dclick(q, `${W} .dc-prm [data-prnup="4"]`, 800); });
  expect(pages(nup)).toBe(Math.ceil(n / 4));
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  const hf = await printCentrePdf(p, async (q) => {
    await dclick(q, `${W} .dc-prm [data-prnup="1"]`, 400);
    // the settings panel is redrawn when the toggle changes: set values the way the panel reads them (change events)
    const setHf = (k: string, v: string | boolean) => q.evaluate(([sel, v]) => { const e = document.querySelector(sel) as HTMLInputElement; if (typeof v === "boolean") e.checked = v; else e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); }, [`${W} .dc-prm input[data-prhf="${k}"]`, v] as const);
    await setHf("on", true); await q.waitForTimeout(600);
    await setHf("hc", "ZZHEAD {patient}"); await q.waitForTimeout(800);
  });
  const txt = tool("pdftotext", [hf, "-"])!;
  expect(txt).toContain("ZZHEAD");
  expect(txt.includes("نادية") || txt.includes("ةيدان")).toBe(true);
  expect(txt).toContain(`Page 1 of ${n}`);
  expect(txt).not.toContain("?????");
  await ctx.close();
});
