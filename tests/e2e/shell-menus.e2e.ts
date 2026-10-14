/** Phase B slice 3 — desktop and item context menus (B-04): dual-run parity (source file = oracle vs React shell). */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

const SRC = "file://" + path.resolve("../source/Remotion_Desktop.html");
async function open(page: Page, url: string) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
  await page.clock.setFixedTime(new Date("2026-10-14T19:08:00+01:00"));
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); sessionStorage.setItem("__s", "1"); } } catch {} });
  await page.goto(url); await page.locator("#dkLayer .dk-ic").first().waitFor(); await page.waitForTimeout(700);
}
async function both(browser: Browser, baseURL: string | undefined, fn: (p: Page) => Promise<unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
    const p = await ctx.newPage(); await open(p, url); out[k] = await fn(p); await ctx.close();
  }
  return out;
}
const layout = (p: Page) => p.evaluate(() => { const d = JSON.parse(localStorage.getItem("remotion-desks") || "{}"); return (d.l?.[d.c ?? 0]?.items || []).map((x: { name?: string; app?: string; c: number; r: number; kids?: unknown[]; fav?: boolean; ref?: string }) => [x.name || x.app, x.c, x.r, (x.kids || []).length, !!x.fav, !!x.ref]).sort((a: unknown[], b: unknown[]) => String(a[0]).localeCompare(String(b[0])) || (a[1] as number) - (b[1] as number)); });
const icon = (p: Page, name: string) => p.locator(`#dkLayer .dk-ic[title="${name}"]`);
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
/** First point on the desktop layer that hits the layer itself (not an icon, widget or menu). */
const emptyPoint = (p: Page) => p.evaluate(() => { const L = document.getElementById("dkLayer")!.getBoundingClientRect(); for (let y = L.bottom - 60; y > L.top + 40; y -= 40) for (let x = L.left + L.width / 2; x < L.right - 40; x += 40) if (document.elementFromPoint(x, y)?.id === "dkLayer") return { x, y }; return null; });
/** Menu level rows, normalised (React wraps raw-HTML rows in display:contents). */
const rows = (p: Page, lvl: number) => p.locator(`.os-menu[data-level="${lvl}"]`).evaluate((m) => {
  const flat: Element[] = []; const walk = (el: Element) => { for (const c of el.children) { if (c instanceof HTMLElement && c.style.display === "contents") walk(c); else flat.push(c); } }; walk(m);
  return flat.map((e) => {
    if (e.classList.contains("sep")) return "-";
    if (e.matches(".os-apps,.os-wps")) return { grid: e.className, items: [...e.querySelectorAll("button")].map((b) => [b.dataset.app ?? b.dataset.wp, b.getAttribute("aria-label"), b.getAttribute("aria-checked")]) };
    if (e.matches(".os-fsc")) return { fsc: e.querySelector(".lb")?.textContent, glyph: e.querySelector(".gl")?.className };
    return { l: e.querySelector(".lb")?.textContent, role: e.getAttribute("role"), ck: e.getAttribute("aria-checked"), dis: (e as HTMLButtonElement).disabled, kbd: e.querySelector("kbd")?.textContent ?? null, sub: e.getAttribute("aria-haspopup"), danger: e.classList.contains("danger"), ic: !!e.querySelector(".ic svg, .ic .gl") };
  });
});
const openSub = async (p: Page, lvl: number, label: string) => { await p.locator(`.os-menu[data-level="${lvl}"] button[data-oi]`, { hasText: label }).first().click(); await p.locator(`.os-menu[data-level="${lvl + 1}"]`).waitFor(); await p.waitForTimeout(80); };
const pick = async (p: Page, lvl: number, label: string) => { await p.locator(`.os-menu[data-level="${lvl}"] button[data-oi]`, { hasText: label }).first().click(); await p.waitForTimeout(250); };
const deskMenu = async (p: Page) => { const pt = (await emptyPoint(p))!; await p.mouse.click(pt.x, pt.y, { button: "right" }); await p.locator('.os-menu[data-level="0"]').waitFor(); return pt; };

test("desktop menu structure and every sub-menu", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await deskMenu(p); const top = await rows(p, 0);
    await openSub(p, 0, "View"); const view = await rows(p, 1);
    await openSub(p, 0, "Sort by"); const sort = await rows(p, 1);
    await openSub(p, 0, "New"); const nw = await rows(p, 1);
    await openSub(p, 1, "App shortcut"); const apps = await rows(p, 2);
    await openSub(p, 1, "File shortcut"); const files = await rows(p, 2);
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await p.waitForTimeout(100);
    await openSub(p, 0, "Change wallpaper"); const walls = await rows(p, 1);
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await p.waitForTimeout(250);
    return { top, view, sort, nw, apps, files, walls, open: await p.locator(".os-menu").count() };
  });
  expect(r.react).toEqual(r.source);
});

test("icon menu structure (one document, multi-selection) and Move to", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await icon(p, "Rapport.pdf").click({ button: "right" }); await p.locator('.os-menu[data-level="0"]').waitFor();
    const one = await rows(p, 0); await openSub(p, 0, "Open with"); const withSub = await rows(p, 1);
    await openSub(p, 0, "Move to"); const move = await rows(p, 1);
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await p.waitForTimeout(250);
    await icon(p, "Projects").click(); await icon(p, "Rapport.pdf").click({ modifiers: ["Control"] });
    await icon(p, "Projects").click({ button: "right" }); await p.locator('.os-menu[data-level="0"]').waitFor();
    return { one, withSub, move, multi: await rows(p, 0) };
  });
  expect(r.react).toEqual(r.source);
});

test("New folder + rename, new text document, sort by name and by type", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await deskMenu(p); await openSub(p, 0, "New"); await pick(p, 1, "Folder");
    await p.locator(".dk-ren").waitFor(); const sel = await p.locator(".dk-ren").evaluate((t: HTMLTextAreaElement) => [t.value, t.selectionStart, t.selectionEnd]);
    await p.keyboard.type("Bilans"); await p.keyboard.press("Enter"); await p.waitForTimeout(200);
    await deskMenu(p); await openSub(p, 0, "New"); await pick(p, 1, "Text document");
    await p.locator(".dk-ren").waitFor(); const sel2 = await p.locator(".dk-ren").evaluate((t: HTMLTextAreaElement) => [t.value, t.selectionStart, t.selectionEnd]);
    await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    const created = await layout(p);
    await deskMenu(p); await openSub(p, 0, "Sort by"); await pick(p, 1, "Name"); const byName = await layout(p);
    await deskMenu(p); await openSub(p, 0, "Sort by"); await pick(p, 1, "Type"); const byType = await layout(p);
    return { sel, sel2, created, byName, byType };
  });
  expect(r.react).toEqual(r.source);
});

test("view options: icon size, hide icons, align off/on, widgets, sidebar, refresh", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const st = () => p.evaluate(() => ({ view: localStorage.getItem("remotion-dkview"), size: document.getElementById("dkLayer")!.dataset.size, noicons: document.getElementById("dkLayer")!.classList.contains("noicons"), shell: ["icons-hidden", "widgets-hidden"].filter((c) => document.getElementById("shell")!.classList.contains(c)), rail: localStorage.getItem("remotion-rail"), w: JSON.parse(localStorage.getItem("remotion-desks") || "{}").l?.[0]?.w }));
    const out: unknown[] = [];
    await deskMenu(p); await openSub(p, 0, "View"); await pick(p, 1, "Small icons"); await p.waitForTimeout(300); out.push(await st(), await p.locator("#dkLayer .dk-ic").evaluateAll((e) => e.map((x) => (x as HTMLElement).style.transform)));
    await deskMenu(p); await openSub(p, 0, "View"); await pick(p, 1, "Show desktop icons"); out.push(await st());
    await deskMenu(p); await openSub(p, 0, "View"); await pick(p, 1, "Show desktop icons");
    await deskMenu(p); await pick(p, 0, "Align to grid"); out.push(await st());
    await deskMenu(p); out.push(await rows(p, 0)); await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    await deskMenu(p); await pick(p, 0, "Align to grid"); out.push(await st());
    await deskMenu(p); await openSub(p, 0, "View"); await pick(p, 1, "Show widgets"); await p.waitForTimeout(500); out.push(await st(), await toast(p));
    await deskMenu(p); await openSub(p, 0, "View"); await pick(p, 1, "Show sidebar"); await p.waitForTimeout(700); out.push(await st(), await toast(p), await layout(p));
    await deskMenu(p); await pick(p, 0, "Refresh"); out.push(await toast(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

// Source defect D-B21 (reproduced): the outside-pointerdown handler (L11405) does not exempt `.os-menu`, so a MOUSE click on an icon-menu
// row clears the selection before the row runs — Duplicate / Copy / Cut / Delete then act on nothing. Keyboard activation works.
test("icon menu actions: mouse no-op (D-B21), keyboard duplicate/cut, favourite, share, move to Documents and Desktop 2, paste", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const menu = async (n: string) => { await icon(p, n).first().click({ button: "right" }); await p.locator('.os-menu[data-level="0"]').waitFor(); await p.waitForTimeout(80); /* the menu focuses its first row after 20 ms */ };
    const kbd = async (label: string) => { await p.locator('.os-menu[data-level="0"] button[data-oi]', { hasText: label }).first().focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(250); };
    await menu("Rapport.pdf"); await pick(p, 0, "Duplicate"); const dupMouse = [await layout(p), await p.locator("#dkLayer .dk-on").count()];
    await menu("Rapport.pdf"); await pick(p, 0, "Delete"); const delMouse = [await layout(p), await p.evaluate(() => (JSON.parse(localStorage.getItem("remotion-trash") || "[]")).length)];
    await menu("Rapport.pdf"); await kbd("Duplicate"); const dup = [await layout(p), await p.locator("#dkLayer .dk-on").evaluateAll((e) => e.map((x) => x.getAttribute("title")))];
    await menu("Rapport.pdf"); await pick(p, 0, "Add to favorites"); await menu("Rapport.pdf"); const favRows = await rows(p, 0); await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    await menu("Rapport.pdf"); await pick(p, 0, "Share"); const share = [await toast(p), await p.evaluate(() => navigator.clipboard.readText().then((x) => x.replace(/s\/.*/, "s/<id>")))];
    await menu("Rapport (2).pdf"); await openSub(p, 0, "Move to"); await pick(p, 1, "Documents"); const moved = [await layout(p), await toast(p), await p.evaluate(() => JSON.parse(localStorage.getItem("remotion-fs")!).documents.map((x: { name: string }) => x.name))];
    await menu("Rapport.pdf"); await openSub(p, 0, "Move to"); await pick(p, 1, "Desktop 2"); const d2 = [await layout(p), await toast(p), await p.evaluate(() => JSON.parse(localStorage.getItem("remotion-desks")!).l[1].items.map((x: { name?: string; c: unknown }) => [x.name, x.c]))];
    await menu("Projects"); await kbd("Cut"); const cut = [await layout(p), await toast(p)];
    await deskMenu(p); const pasteRow = (await rows(p, 0)).find((x) => typeof x === "object" && "l" in x && x.l === "Paste"); await pick(p, 0, "Paste");
    return { dupMouse, delMouse, dup, favRows, share, moved, d2, cut, pasteRow, pasted: await layout(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("New ▸ App shortcut and File shortcut; wallpaper swatch; keyboard menu", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await deskMenu(p); await openSub(p, 0, "New"); await openSub(p, 1, "App shortcut"); await p.locator('.os-menu [data-app="calendar"]').click(); await p.waitForTimeout(250);
    const app = [await layout(p), await toast(p), await p.locator(".os-menu").count()];
    await deskMenu(p); await openSub(p, 0, "New"); await openSub(p, 1, "File shortcut"); await p.locator(".os-menu .os-fsc").first().click(); await p.waitForTimeout(250);
    const file = [await layout(p), await toast(p)];
    await deskMenu(p); await openSub(p, 0, "Change wallpaper"); await p.locator('.os-menu [data-wp="4"]').click(); await p.waitForTimeout(200);
    const wall = [await p.evaluate(() => JSON.parse(localStorage.getItem("remotion-desks")!).l[0].s), await p.locator(".os-menu [data-wp][aria-checked=true]").getAttribute("data-wp"), await p.locator(".os-menu").count()];
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await icon(p, "Projects").focus(); await p.keyboard.press("Shift+F10"); await p.locator('.os-menu[data-level="0"]').waitFor(); await p.waitForTimeout(120);
    const kb = [await p.evaluate(() => document.activeElement?.querySelector(".lb")?.textContent), (await rows(p, 0)).length];
    await p.keyboard.press("ArrowDown"); const next = await p.evaluate(() => document.activeElement?.querySelector(".lb")?.textContent);
    await p.keyboard.press("Escape"); await p.waitForTimeout(250);
    return { app, file, wall, kb, next, closed: await p.locator(".os-menu").count() };
  });
  expect(r.react).toEqual(r.source);
});

test("folder window item menu: rows, move out, delete to trash", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await icon(p, "Patients").first().dblclick(); await p.locator(".dk-win .dk-fgrid .dk-ic").first().waitFor();
    const kids = await p.locator(".dk-win .dk-fgrid .dk-ic").evaluateAll((e) => e.map((x) => x.getAttribute("title")));
    await p.locator(".dk-win .dk-fgrid .dk-ic").first().click({ button: "right" }); await p.locator(".dk-menu").waitFor();
    const menuRows = await p.locator(".dk-menu").evaluate((m) => [...m.children].map((c) => c.className === "sep" ? "-" : [c.textContent, c.className, c.getAttribute("role")]));
    await p.locator(".dk-menu button", { hasText: /^(Move out|Move to desktop|.*desktop.*)$/i }).first().click(); await p.waitForTimeout(400);
    const out = [await layout(p), await p.locator(".dk-win .dk-fgrid .dk-ic").count()];
    await p.locator(".dk-win .dk-fgrid .dk-ic").first().click({ button: "right" }); await p.locator(".dk-menu").waitFor();
    await p.locator(".dk-menu button.danger").click(); await p.waitForTimeout(400);
    const del = [await layout(p), await p.evaluate(() => JSON.parse(localStorage.getItem("remotion-trash") || "[]").map((x: { name: string }) => x.name)), await p.locator('#dock [data-t="trash"]').getAttribute("class")];
    return { kids, menuRows, out, del };
  });
  expect(r.react).toEqual(r.source);
});
