/** Catch-up slice S1 (Remotion OS v92, security of imports): a hostile HTML file runs nothing when imported, its dangerous
 *  attributes never reach the document or the page, and pdf.js is always used without eval (CVE-2024-4367). */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { W, newShell, openShell, openDc, dclick, readStore } from "../helpers/documents";

test.describe.configure({ timeout: 180_000 });
async function dropFiles(p: Page, files: [string, string, string][]) {
  const list = files.map(([path, name, type]) => [fs.readFileSync(path).toString("base64"), name, type]);
  await p.evaluate(([list, W]) => {
    const dt = new DataTransfer();
    for (const [b64, name, type] of list as string[][]) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); dt.items.add(new File([u], name, { type })); }
    const tgt = document.querySelector(W + " .dc")!; for (const ev of ["dragenter", "dragover", "drop"]) tgt.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, [list, W] as const);
}
const next = async (p: Page) => { await p.waitForFunction((W) => !document.querySelector(`${W} .dcx-wz .spin`) && !!document.querySelector(`${W} [data-dxwznext]:not([disabled])`), W, { timeout: 60000 }); await dclick(p, `${W} [data-dxwznext]`, 700); };

test("a hostile HTML import runs nothing and keeps no dangerous attribute", async ({ browser, baseURL }) => {
  const f = `test-results/s1-hostile-${Date.now()}.html`;
  fs.writeFileSync(f, `<!doctype html><html><head><title>Hostile</title><script>window.__pwned=1</script></head><body>
<h1 onclick="window.__pwned=2">Report</h1><p>Text <img src="x" onerror="window.__pwned=3"> and <a href="javascript:window.__pwned=4">a link</a>.</p>
<p><a href="java&#9;script:window.__pwned=5">tab trick</a> <a href="https://example.org/ok">ok link</a></p>
<svg><a xlink:href="javascript:window.__pwned=6"><text>svg</text></a></svg><iframe srcdoc="<script>parent.__pwned=7</script>"></iframe>
<form action="https://evil.example"><button formaction="https://evil.example">Send</button></form><details open ontoggle="window.__pwned=8"><summary>s</summary>d</details></body></html>`);
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  const errs: string[] = []; p.on("pageerror", (e) => errs.push(e.message));
  await dropFiles(p, [[f, "hostile.html", "text/html"]]);
  await p.locator(`${W} .dcx-wzm`).waitFor({ timeout: 15000 });
  for (let i = 0; i < 5; i++) await next(p);
  await dclick(p, `${W} [data-dxwznext]`, 2500);
  await p.waitForTimeout(1500);
  expect(await p.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  const st = (await readStore(p))!.json as { cur: string; docs: Record<string, { pages: unknown[]; title: string }> };
  const json = JSON.stringify(st.docs[st.cur].pages);
  expect(json).toContain("Report");
  expect(json).toContain("https://example.org/ok");
  expect(json).not.toMatch(/onerror|onclick|ontoggle|javascript:|srcdoc|formaction|<script|<iframe/i);
  const dom = await p.evaluate((W) => document.querySelector(`${W} .dc-cv`)!.innerHTML, W);
  expect(dom).not.toMatch(/onerror=|onclick=|ontoggle=|javascript:|srcdoc=/i);
  expect(errs).toEqual([]);
  await ctx.close();
});

test("pdf.js is wrapped: every getDocument runs without eval", async ({ browser, baseURL }) => {
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx); await openDc(p);
  await dropFiles(p, [["tests/fixtures/acroform.pdf", "acroform.pdf", "application/pdf"]]);
  await p.locator(`${W} .dcx-wzm`).waitFor({ timeout: 15000 });
  await p.waitForFunction(() => !!(window as unknown as { pdfjsLib?: unknown }).pdfjsLib, null, { timeout: 30000 });
  const r = await p.evaluate(() => { const L = (window as unknown as { pdfjsLib: { __sec?: number; getDocument: unknown } }).pdfjsLib;
    const own = Object.getOwnPropertyDescriptor(L, "getDocument"); const fn = own && String(own.value);
    return { sec: L.__sec, own: !!own, forces: !!fn && /isEvalSupported\s*=\s*(false|!1)/.test(fn), worker: !!(Object.getPrototypeOf(L) as { GlobalWorkerOptions?: unknown }).GlobalWorkerOptions }; });
  expect(r.sec).toBe(1);
  expect(r.own).toBe(true);
  expect(r.forces).toBe(true);
  expect(r.worker).toBe(true);
  await ctx.close();
});
