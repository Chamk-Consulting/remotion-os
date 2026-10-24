/** Phase C slice 19 — Documents (native port): dual-run parity (source file:// vs React shell). */
/* Buttons named by v94 a11yName (data-an) get their label on a 250 ms debounce in both versions: that label is
   compared by catchup-s7-a11y, not in these trees. */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

/** The Documents flows (template gallery, exact Word forms, exports) are long: a larger budget per test. */
test.describe.configure({ timeout: 300_000 });
const SRC = "file://" + path.resolve("../source-v94/Remotion_Desktop_v94.html") /* S2: v94 is the reference */;
const NOW = new Date("2026-10-14T19:08:00+01:00");
async function open(page: Page, url: string) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); sessionStorage.setItem("__s", "1"); } } catch {} });
  await page.goto(url); await page.locator("#dkLayer .dk-ic").first().waitFor(); await page.waitForTimeout(700);
}
async function both(browser: Browser, baseURL: string | undefined, fn: (p: Page) => Promise<unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce", acceptDownloads: true });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); await open(p, url); out[k] = norm(await fn(p)); await ctx.close();
  }
  if (process.env.DUMP) { const fs = await import("node:fs"); for (const k in out) fs.writeFileSync(`/tmp/claude-0/dump-${process.env.DUMP}-${test.info().title.slice(0, 6)}-${k}.json`, JSON.stringify(out[k], null, 1)); }
  return out;
}
const T36 = NOW.getTime().toString(36);
/**
 * Block ids are "b" + Date.now() (fixed clock) + 4 random characters (dcId) and signer ids "sg" + 7 random characters: they are
 * normalised to stable tokens in order of appearance. Signature hashes cover those ids, so they are compared as present / absent.
 */
function norm(v: unknown) {
  const map = new Map<string, string>();
  const s = JSON.stringify(v).replace(new RegExp(`b${T36.slice(-5)}[0-9a-z]{4}`, "g"), (m) => { if (!map.has(m)) map.set(m, "B#" + map.size); return map.get(m)!; }).replace(/\bsg[0-9a-z]{6,9}\b/g, (m) => { if (!map.has(m)) map.set(m, "SG#" + map.size); return map.get(m)!; }).replace(/\b[0-9a-f]{64}\b|\b[0-9a-f]{16}…[0-9a-f]{8}\b/g, "HASH").replace(new RegExp(`\\b([a-z]{0,2})${T36}([0-9a-z]{0,5})\\b`, "g"), (m, p) => { if (!map.has(m)) map.set(m, p + "#" + map.size); return map.get(m)!; });
  return JSON.parse(s);
}
/** Serialised subtree: tag, sorted classes, identity / state attributes, normalised inline style, value, own text. */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => ["id", "role", "hidden", "disabled", "type", "dir", "placeholder", "tabindex", "title", "lang", "value", "checked", "selected", "href", "src"].includes(n) || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    // Product-phase additions (docs/product): dcx-* elements, data-dx* controls (Page setup included) and the "Patient copies" view are not in the source.
    if (e.matches?.('[class^="dcx-"], [class*=" dcx-"], [data-dxsend], [data-dxlayopen], [data-dgo="copies"]')) return [];
    if (e.tagName === "svg" && !e.closest(".dc-chart")) return ["svg" + (e.getAttribute("class") ? "." + e.getAttribute("class") : "")];
    const attrs = [...e.attributes].filter((a) => keep(a.name) && !(e.hasAttribute("data-an") && (a.name === "aria-label" || a.name === "data-an"))).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const W = '.os-win[data-osw="documents"]';
const dc = (p: Page) => tree(p, `${W} .dc`);
const main = (p: Page) => tree(p, `${W} .dc-main`);
/** The documents store: localStorage in the source; IndexedDB "remotion-docs-store" in the product build (phase 1). Same JSON. */
const store = (p: Page) => p.evaluate(async () => {
  const ls = localStorage.getItem("remotion-docs"); if (ls) return JSON.parse(ls);
  const db = await new Promise<IDBDatabase | null>((res) => { const r = indexedDB.open("remotion-docs-store"); r.onupgradeneeded = () => r.transaction?.abort(); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  if (!db || !db.objectStoreNames.contains("kv")) return null;
  const v = await new Promise<unknown>((res) => { const g = db.transaction("kv").objectStore("kv").get("store"); g.onsuccess = () => res(g.result); g.onerror = () => res(null); });
  db.close(); return typeof v === "string" ? JSON.parse(v) : null;
});
/** Opened from its dock button, as a user would. */
const openDc = async (p: Page) => {
  await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
  if (!(await p.evaluate(() => document.getElementById("wsMenu")?.classList.contains("closed") ?? true))) { await p.click("#wsBtn"); await p.waitForTimeout(400); }
  await p.click('#dock [data-t="documents"]'); await p.locator(`${W} .dc`).waitFor(); await p.waitForTimeout(1500);
};
const dclick = async (p: Page, sel: string, wait = 450) => { await p.evaluate((sel) => { const e = document.querySelector(sel) as HTMLElement | null; if (!e) throw new Error("missing " + sel); e.click(); }, sel); await p.waitForTimeout(wait); };
const toastOf = (p: Page) => p.locator(`${W} .dc-toast`).evaluate((e) => [e.className, e.textContent]).catch(() => null);

test("open: shell, editor on the sample document, store, dock, window", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openDc(p);
    return [await dc(p), await store(p), await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => (b as HTMLElement).dataset.t + ":" + b.className)), await p.getAttribute(W, "aria-label"), await p.getAttribute(W, "class")];
  });
  expect(r.react).toEqual(r.source);
});

const has = (p: Page, sel: string) => p.locator(`${W} ${sel}`).count();
const tryClick = async (p: Page, sel: string, wait = 450) => { if (await has(p, sel)) { await dclick(p, `${W} ${sel}`, wait); return true; } return false; };
const pagesTree = (p: Page) => tree(p, `${W} .dc-cv`);
const modal = (p: Page) => tree(p, `${W} .dc-mdl`);

test("library: every view, template domains, search, sort, star, open a document back in the editor", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openDc(p);
    for (const v of ["overview", "recent", "fav", "mine", "shared", "review", "pub", "clinical", "templates", "arch", "trash"]) { if (await tryClick(p, `[data-dgo="${v}"]`, 600)) out.push(v, await dc(p)); }
    await tryClick(p, '[data-dgo="templates"]', 600);
    for (const d of ["health", "physio", "psy", "rehab", "reports", "letters", "cr", "gen", "all"]) { if (await tryClick(p, `[data-dtpl="${d}"]`, 400)) out.push(d, await main(p)); }
    await tryClick(p, '[data-dgo="overview"]', 600);
    const q = p.locator(`${W} input[type="search"]`).first(); if (await q.count()) { await q.fill("bilan"); await p.waitForTimeout(500); out.push(await main(p)); await q.fill(""); await p.waitForTimeout(400); }
    if (await tryClick(p, "[data-open]", 900)) out.push(await dc(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("editor: ribbon tabs, right panel, pages and plan, zoom, view modes, select and edit a block, components, pages, undo / redo", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openDc(p);
    for (const k of ["file", "insert", "layout", "refs", "review", "view", "ai", "home"]) { if (await tryClick(p, `[data-rib="${k}"]`, 450)) out.push(k, await tree(p, `${W} .dc-rib`)); }
    for (const k of ["doc", "styles", "comps"]) { if (await tryClick(p, `[data-rt="${k}"]`, 450)) out.push(k, await tree(p, `${W} .dc-rp`)); }
    for (const k of ["plan", "pages"]) { if (await tryClick(p, `[data-lpt="${k}"]`, 450)) out.push(k, await tree(p, `${W} .dc-lp`)); }
    await tryClick(p, '[data-lpm="list"]'); await tryClick(p, '[data-lpm="grid"]'); out.push(await tree(p, `${W} .dc-lp`));
    await tryClick(p, '[data-dz="+"]'); await tryClick(p, '[data-dz="+"]'); out.push(await p.evaluate((W) => document.querySelector(`${W} .dc-zl, ${W} [data-dzr]`)?.textContent, W)); await tryClick(p, "[data-dzr]");
    for (const v of ["read", "web", "page"]) { if (await tryClick(p, `[data-dvm="${v}"]`, 700)) out.push(v, await p.getAttribute(`${W} .dc`, "data-vm"), await pagesTree(p)); }
    const blk = p.locator(`${W} .dc-cv .dc-b`).nth(3); await blk.click({ position: { x: 12, y: 8 } }).catch(() => {}); await p.waitForTimeout(500); out.push(await tree(p, `${W} .dc-rp`));
    for (const k of ["disp", "cond", "gen"]) { if (await tryClick(p, `[data-ppt="${k}"]`, 400)) out.push(k, await tree(p, `${W} .dc-rp`)); }
    if (await tryClick(p, ".dc-b.dc-sel [data-bdup]", 600)) out.push(await pagesTree(p));
    if (await tryClick(p, ".dc-b.dc-sel [data-bdel]", 700)) out.push(await pagesTree(p), await toastOf(p));
    await tryClick(p, '[data-rt="comps"]');
    for (const c of ["chart_line", "box", "addr", "att"]) { if (await tryClick(p, `[data-cadd="${c}"]`, 700)) out.push(c, await pagesTree(p)); }
    if (await tryClick(p, '[data-dcmd="addpage"]', 700)) out.push(await tree(p, `${W} .dc-lp`), await pagesTree(p));
    if (await tryClick(p, '[data-pga="up"]:not([disabled])', 700)) out.push(await tree(p, `${W} .dc-lp`));
    if (await tryClick(p, '[data-pga="dup"]', 700)) out.push(await tree(p, `${W} .dc-lp`));
    await tryClick(p, '[data-dcmd="undo"]'); await tryClick(p, '[data-dcmd="undo"]'); out.push(await pagesTree(p));
    await tryClick(p, '[data-dcmd="redo"]'); out.push(await pagesTree(p));
    await p.keyboard.press("Control+z"); await p.waitForTimeout(500); out.push(await pagesTree(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("drawers and tools: comments, history, quality check, find and replace, statistics, AI assistant", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openDc(p);
    for (const k of ["cmts", "hist", "check"]) { if (await tryClick(p, `[data-ddraw="${k}"]`, 700)) out.push(k, await dc(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300); }
    if (await tryClick(p, '[data-dcmd="find"]', 600)) {
      await p.fill(`${W} [data-fq]`, "patient"); await p.waitForTimeout(700); out.push(await tree(p, `${W} .dc-find`));
      await tryClick(p, '[data-fnav="1"]', 400); await tryClick(p, '[data-fnav="1"]', 400); out.push(await tree(p, `${W} .dc-find .ct`));
      await tryClick(p, '[data-fo="cs"]', 500); out.push(await tree(p, `${W} .dc-find .ct`)); await tryClick(p, '[data-fo="cs"]', 500);
      await tryClick(p, '[data-fo="rep"]', 500); await p.fill(`${W} [data-fr]`, "client"); await p.waitForTimeout(300);
      await tryClick(p, '[data-frep="one"]', 700); out.push(await tree(p, `${W} .dc-find`), await pagesTree(p));
      await tryClick(p, '[data-frep="all"]', 900); out.push(await tree(p, `${W} .dc-find`), await pagesTree(p), await toastOf(p));
      await tryClick(p, "[data-fclose]", 400);
    }
    if (await tryClick(p, '[data-dcmd="stats"]', 600)) { out.push(await modal(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300); }
    if (await tryClick(p, '[data-dai="open"]', 800)) { out.push(await dc(p)); }
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("new document: blank, from a template, an exact Word form, the AI brief; export menu, export dialog formats and a download", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openDc(p);
    const close = async () => { await tryClick(p, ".dc-mdl [data-mclose]", 400); };
    await tryClick(p, "[data-dcnew]", 700); out.push(await modal(p));
    await tryClick(p, '.dc-mdl [data-nm="blank"]', 900); out.push(await dc(p), await toastOf(p));
    await tryClick(p, "[data-dcnew]", 700); await tryClick(p, '.dc-mdl [data-nm="tpl"]', 900);
    // the gallery renders the exact-form previews asynchronously: compare once they are drawn
    await p.waitForFunction((W) => !document.querySelector(`${W} .dc-exld`), W, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(500); out.push(await dc(p));
    if (await tryClick(p, "[data-tprev]", 900)) { out.push(await modal(p)); await close(); }
    if (await tryClick(p, "[data-tuse]", 1200)) out.push(await dc(p), await toastOf(p));
    await tryClick(p, "[data-dcnew]", 700); await tryClick(p, '.dc-mdl [data-nm="ai"]', 700); out.push(await modal(p)); await close();
    await tryClick(p, "[data-dcnew]", 700); if (await tryClick(p, '.dc-mdl [data-wxuse="vph-eval"]', 4000)) { await p.waitForTimeout(2000); out.push(await dc(p), await toastOf(p)); }
    await tryClick(p, '[data-dgo="overview"]', 600); await tryClick(p, "[data-open]", 1200);
    if (await tryClick(p, "[data-dexpm]", 500)) { out.push(await tree(p, ".os-menu")); await p.keyboard.press("Escape"); await p.waitForTimeout(300); }
    const dl = async (sel: string) => { const [d] = await Promise.all([p.waitForEvent("download", { timeout: 25000 }).catch(() => null), tryClick(p, sel, 3000)]); if (!d) return null; const buf = (await import("node:fs")).readFileSync((await d.path())!); return [d.suggestedFilename(), buf.length > 500, /\.(md|txt|html)$/.test(d.suggestedFilename()) ? buf.toString("utf8").slice(0, 3000) : null]; };
    // the exact Word form's own export dialog: the official DOCX
    if (await tryClick(p, '[data-dexp="pdf"]', 2500)) { out.push(await modal(p)); out.push("wxdocx", await dl(".dc-mdl [data-wxdocx]")); await tryClick(p, ".dc-mdl [data-mclose]", 400); }
    // the sample document through the export menu: every format's preview in the export dialog, then a download
    await tryClick(p, '[data-dgo="overview"]', 600); await tryClick(p, '[data-open="d1"]', 1500);
    await dclick(p, `${W} [data-dexpm]`, 500); await p.evaluate(() => (document.querySelector('.os-menu button[data-oi="7"]') as HTMLElement | null)?.click()); await p.waitForTimeout(2500);
    out.push(await modal(p));
    const fmts = await p.locator(`${W} .dc-mdl [data-xpf]`).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.xpf!));
    out.push(fmts);
    for (const f of fmts) { await dclick(p, `${W} .dc-mdl [data-xpf="${f}"]`, 2500); out.push(f, await modal(p)); }
    await dclick(p, `${W} .dc-mdl [data-xpf="md"]`, 2000); out.push("md", await dl(".dc-mdl [data-xpgo]"));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("language (French, Arabic), narrow window, close and reopen", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openDc(p);
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1500); out.push(await dc(p), await p.getAttribute(W, "aria-label"));
    await p.click("#langBtn"); await p.click('[data-lang="ar"]'); await p.waitForTimeout(1500); out.push(await tree(p, `${W} .dc-rib`), await tree(p, `${W} .dc-lp`));
    await p.click("#langBtn"); await p.click('[data-lang="en"]'); await p.waitForTimeout(1500);
    const g = (await p.locator(`${W} .os-rz`).boundingBox())!; await p.mouse.move(g.x + 4, g.y + 4); await p.mouse.down(); await p.mouse.move(g.x - 900, g.y + 4, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(900);
    out.push(await p.getAttribute(`${W} .dc`, "class"), await p.evaluate((W) => { const r = document.querySelector(W)!.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }, W));
    for (const k of ["nav", "rp"]) { if (await tryClick(p, `[data-dcopen="${k}"]`, 500)) { out.push(k, await p.getAttribute(`${W} .dc`, "class")); await tryClick(p, `[data-dcx="${k}"]`, 400); } }
    await p.click(`${W} [data-wc="close"]`); await p.waitForTimeout(800); out.push(await p.locator(W).count(), await store(p));
    await openDc(p); out.push(await dc(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("approved fix D-D04: Ctrl+P prints only while Documents is the front window", async ({ browser, baseURL }) => {
  // React shell: with another window in front, Ctrl+P is left to the browser (no print preparation in Documents).
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000); await open(p, "/?shell=react"); await openDc(p);
  await p.evaluate(() => { (window as unknown as { __printed: number }).__printed = 0; window.print = () => { (window as unknown as { __printed: number }).__printed++; }; });
  await p.click('#dock [data-t="files"]'); await p.waitForTimeout(800);
  await p.keyboard.press("Control+p"); await p.waitForTimeout(2500);
  const reacted = () => p.evaluate(() => !!document.querySelector("#dc-print, .dc-prm, .dc-mdl") || (window as unknown as { __printed: number }).__printed > 0);
  expect(await reacted()).toBe(false);
  await p.click(`${W} .os-wh`, { position: { x: 300, y: 10 } }); await p.waitForTimeout(500);
  await p.keyboard.press("Control+p"); await p.waitForTimeout(4000);
  expect(await reacted()).toBe(true);
  await ctx.close();
});

test("comments, versions, multi-person signing set-up and an in-person signature, table cell editing", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openDc(p);
    // comments: new comment on the selected block, reply / resolve
    await p.locator(`${W} .dc-cv .dc-b`).nth(2).click({ position: { x: 12, y: 8 } }).catch(() => {}); await p.waitForTimeout(400);
    if (await tryClick(p, '[data-ddraw="cmts"]', 700)) {
      if (await tryClick(p, "[data-cmnew]", 500)) { const ta = p.locator(`${W} .dc-drw textarea, ${W} .dc-dr textarea`).first(); if (await ta.count()) { await ta.fill("À vérifier avec le médecin"); await tryClick(p, "[data-cmsend]", 600); } }
      out.push(await dc(p)); if (await tryClick(p, "[data-cmres]", 600)) out.push(await dc(p));
    }
    // versions: save a named version, restore it
    if (await tryClick(p, '[data-ddraw="hist"]', 700)) { if (await tryClick(p, "[data-vsave]", 600)) { const i = p.locator(`${W} input[data-vname], ${W} .dc-mdl input`).first(); if (await i.count()) { await i.fill("Avant relecture"); await p.keyboard.press("Enter"); await p.waitForTimeout(500); } } out.push(await dc(p)); if (await tryClick(p, "[data-vrest]", 800)) out.push(await dc(p), await toastOf(p)); }
    await tryClick(p, "[data-drclose]", 400);
    // table: edit a cell of the measurements table and add a row with the keyboard
    const cell = p.locator(`${W} .dc-cv [data-ed^="rows."]`).nth(1);
    if (await cell.count()) { await cell.click(); await p.keyboard.type("45°"); await p.keyboard.press("Tab"); await p.keyboard.type("90°"); await p.waitForTimeout(900); await p.locator(`${W} .dc-cv .dc-b`).first().click({ position: { x: 12, y: 8 } }).catch(() => {}); await p.waitForTimeout(600); out.push("table", await pagesTree(p)); }
    // signing: set-up, add a signer, mode, then sign in person on the pad
    await tryClick(p, '[data-rib="review"]', 400); await tryClick(p, '[data-ddraw="sign"]', 700); out.push(await dc(p));
    for (const k of ["askrev", "approve"]) { if (await tryClick(p, `[data-dcmd="${k}"]`, 700)) out.push(k, await tree(p, `${W} .dc-hd`), await toastOf(p)); }
    if (await tryClick(p, "[data-sgsetup]", 800)) { out.push(await modal(p)); await tryClick(p, "[data-sgadd]", 500); await tryClick(p, '[data-sgmode]', 500); out.push(await modal(p)); if (await tryClick(p, "[data-sggo]", 900)) out.push(await dc(p), await toastOf(p)); }
    if (await tryClick(p, "[data-sgsign]", 900)) {
      const cv = p.locator(`${W} .dc-mdl canvas`).first();
      if (await cv.count()) { const b = (await cv.boundingBox())!; await p.mouse.move(b.x + 20, b.y + 30); await p.mouse.down(); await p.mouse.move(b.x + 120, b.y + 50, { steps: 6 }); await p.mouse.move(b.x + 200, b.y + 25, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300); }
      const nm = p.locator(`${W} .dc-mdl input[data-sgfn]`); if (await nm.count()) await nm.fill("Camille Martin");
      const ok = p.locator(`${W} .dc-mdl input[data-sgok]`); if (await ok.count()) await ok.check();
      await tryClick(p, ".dc-mdl [data-sok]", 900); out.push(await dc(p), await toastOf(p));
    }
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
