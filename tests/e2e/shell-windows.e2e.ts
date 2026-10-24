/**
 * Phase B slice 4 — window manager (B-02), windows on desktops and workspaces (B-07 v55), bridge app windows (B-16).
 * Dual-run: the source opens its native app windows; the React shell opens the same windows with the legacy bridge as body.
 * Compared: window chrome, geometry, state classes, stacking, dock marks, desktop/workspace ownership and storage.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

const SRC = "file://" + path.resolve("../source-v94/Remotion_Desktop_v94.html") /* S2: v94 is the reference */;
async function open(page: Page, url: string) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
  await page.clock.setFixedTime(new Date("2026-10-14T19:08:00+01:00"));
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); sessionStorage.setItem("__s", "1"); } } catch {} });
  await page.goto(url); await page.locator("#dkLayer .dk-ic").first().waitFor(); await page.waitForTimeout(700);
}
async function both(browser: Browser, baseURL: string | undefined, fn: (p: Page) => Promise<unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
    const p = await ctx.newPage(); await open(p, url); out[k] = await fn(p); await ctx.close();
  }
  return out;
}
/** Windows in stacking order (back → front), with chrome, geometry and state. */
const wins = (p: Page) => p.evaluate(() => {
  const els = [...document.querySelectorAll<HTMLElement>(".os-win")];
  const layer = !!document.querySelector(".os-wlayer");
  const order = layer ? els.slice().sort((a, b) => +a.style.zIndex - +b.style.zIndex) : els;
  return order.map((el) => ({
    key: el.dataset.osw, cls: el.className.split(/\s+/).filter(Boolean).sort().join(" "), aria: el.getAttribute("aria-label"), hidden: el.hidden, snap: el.dataset.snap ?? null,
    geo: [el.style.left, el.style.top, el.style.width, el.style.height].map((v) => Math.round(parseFloat(v))).join(","),
    title: el.querySelector(".os-wh b")?.textContent, hd: el.querySelector(".os-wh")!.className,
    btns: [...el.querySelectorAll(".os-wc button")].map((b) => [b.getAttribute("data-wc") ?? "wmenu", b.getAttribute("aria-label"), b.getAttribute("title")].join("|")),
    icon: el.querySelector(".os-wh > :first-child")?.getAttribute("class") ?? el.querySelector(".os-wh > :first-child")?.tagName,
    edges: el.querySelectorAll(".os-eh").length, rz: !!el.querySelector(".os-rz"),
  }));
});
const dock = (p: Page) => p.locator("#dock button").evaluateAll((e) => e.map((x) => `${x.getAttribute("data-t")}:${x.className}:${x.getAttribute("type")}:${x.getAttribute("aria-label")}`));
const store = (p: Page, k: string) => p.evaluate((k) => localStorage.getItem(k), k);
const icon = (p: Page, name: string) => p.locator(`#dkLayer .dk-ic[title="${name}"]`);
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
const hdr = (p: Page, key: string) => p.locator(`.os-win[data-osw="${key}"] .os-wh`);
const wc = (p: Page, key: string, a: string) => p.locator(`.os-win[data-osw="${key}"] [data-wc="${a}"]`);
const pick = async (p: Page, lvl: number, label: string) => { await p.locator(`.os-menu[data-level="${lvl}"] button[data-oi]`, { hasText: label }).first().click(); await p.waitForTimeout(250); };
const sub = async (p: Page, lvl: number, label: string) => { await p.locator(`.os-menu[data-level="${lvl}"] button[data-oi]`, { hasText: label }).first().click(); await p.locator(`.os-menu[data-level="${lvl + 1}"]`).waitFor(); };
const menuRows = (p: Page, lvl: number) => p.locator(`.os-menu[data-level="${lvl}"] > *`).evaluateAll((e) => e.map((x) => x.classList.contains("sep") ? "-" : [x.querySelector(".lb")?.textContent, x.getAttribute("aria-checked"), (x as HTMLButtonElement).disabled, x.querySelector("kbd")?.textContent ?? null, x.getAttribute("aria-haspopup")].join("|")));
/** The workspace menu is open at load on wide screens (U-07); open it only when closed. */
const wsOpen = async (p: Page) => { if (await p.locator("#wsMenu").evaluate((e) => e.classList.contains("closed"))) await p.click("#wsBtn"); };
/** Normalise random desktop and item ids. */
const normIds = (s: string | null) => { if (!s) return s; const m = new Map<string, string>(); return JSON.parse(s.replace(/"(d[a-z0-9]{6}|i[a-z0-9]{10,14})"/g, (x) => { if (!m.has(x)) m.set(x, `"D${m.size}"`); return m.get(x)!; })); };

test("open from dock and desktop: chrome, geometry, stacking, dock marks, app store", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click('#dock [data-t="files"]'); await p.waitForTimeout(200);
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(200);
    await icon(p, "Billing").dblclick(); await p.waitForTimeout(300);
    await p.click('#dock [data-t="documents"]'); await p.waitForTimeout(800);
    return { wins: await wins(p), dock: await dock(p), apps: await store(p, "remotion-apps") };
  });
  expect(r.react).toEqual(r.source);
});

test("dock toggles: minimise the front window, restore, focus a back window; close removes the running button", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click('#dock [data-t="files"]'); await icon(p, "Billing").dblclick(); await p.waitForTimeout(300);
    const s0 = await wins(p);
    await p.click('#dock [data-t="billing"]'); await p.waitForTimeout(300); const minB = [await wins(p), await dock(p)];
    await p.click('#dock [data-t="billing"]'); await p.waitForTimeout(300); const resB = await wins(p);
    await p.click('#dock [data-t="files"]'); await p.waitForTimeout(300); const focF = await wins(p);
    await wc(p, "billing", "close").click(); await p.waitForTimeout(400);
    return { s0, minB, resB, focF, closed: [await wins(p), await dock(p)] };
  });
  expect(r.react).toEqual(r.source);
});

test("maximise / restore by button and title double-click; minimise button", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(200);
    await wc(p, "terminal", "max").click(); await p.waitForTimeout(600); const mx = await wins(p);
    await hdr(p, "terminal").dblclick({ position: { x: 300, y: 20 } }); await p.waitForTimeout(600); const rs = await wins(p);
    await wc(p, "terminal", "min").click(); await p.waitForTimeout(300);
    return { mx, rs, min: [await wins(p), await dock(p)] };
  });
  expect(r.react).toEqual(r.source);
});

test("window menu: rows, halves, quarters, previous size; Win+arrows", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(200);
    await p.locator('.os-win[data-osw="terminal"] [data-wmenu]').click(); await p.locator('.os-menu[data-level="0"]').waitFor();
    const rows = await menuRows(p, 0); await sub(p, 0, "Move to desktop"); const desks = await menuRows(p, 1); await sub(p, 0, "Move to workspace"); const wss = await menuRows(p, 1);
    await sub(p, 0, "Quarter"); const q = await menuRows(p, 1); await pick(p, 1, "Top left"); await p.waitForTimeout(600); const tl = await wins(p);
    await hdr(p, "terminal").click({ button: "right", position: { x: 200, y: 20 } }); await p.locator('.os-menu[data-level="0"]').waitFor(); const rows2 = await menuRows(p, 0);
    await pick(p, 0, "Previous size"); await p.waitForTimeout(600); const prev = await wins(p);
    await p.keyboard.press("Meta+ArrowLeft"); await p.waitForTimeout(600); const left = await wins(p);
    await p.keyboard.press("Meta+ArrowUp"); await p.waitForTimeout(600); const up = await wins(p);
    await p.keyboard.press("Meta+ArrowDown"); await p.waitForTimeout(600); const down = await wins(p);
    await p.keyboard.press("Meta+ArrowDown"); await p.waitForTimeout(600); const down2 = await wins(p);
    await p.keyboard.press("Meta+ArrowUp"); await p.waitForTimeout(600); const maxed = await wins(p);
    await p.keyboard.press("Meta+ArrowRight"); await p.waitForTimeout(600); const right = await wins(p);
    return { rows, desks, wss, q, tl, rows2, prev, left, up, down, down2, maxed, right };
  });
  expect(r.react).toEqual(r.source);
});

test("drag: move, snap to the left edge with preview, drag out of a snap, edge and corner resize", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(200);
    const h = (await hdr(p, "terminal").boundingBox())!; const x0 = h.x + 250, y0 = h.y + 20;
    await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x0 - 100, y0 + 60, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200); const moved = await wins(p);
    const h2 = (await hdr(p, "terminal").boundingBox())!;
    await p.mouse.move(h2.x + 250, h2.y + 20); await p.mouse.down(); await p.mouse.move(5, 400, { steps: 10 });
    const preview = await p.evaluate(() => { const v = document.querySelector<HTMLElement>(".os-snapv"); return v ? [v.className, v.style.left, v.style.top, v.style.width, v.style.height] : null; });
    await p.mouse.up(); await p.waitForTimeout(600); const snapped = await wins(p);
    const h3 = (await hdr(p, "terminal").boundingBox())!;
    await p.mouse.move(h3.x + 200, h3.y + 20); await p.mouse.down(); await p.mouse.move(h3.x + 400, h3.y + 200, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300); const unsnapped = await wins(p);
    const e = (await p.locator('.os-win[data-osw="terminal"] .os-eh.e-e').boundingBox())!;
    await p.mouse.move(e.x + e.width / 2, e.y + e.height / 2); await p.mouse.down(); await p.mouse.move(e.x + 120, e.y + e.height / 2, { steps: 5 }); await p.mouse.up();
    const n = (await p.locator('.os-win[data-osw="terminal"] .os-eh.e-nw').boundingBox())!;
    await p.mouse.move(n.x + n.width / 2, n.y + n.height / 2); await p.mouse.down(); await p.mouse.move(n.x - 60, n.y - 30, { steps: 5 }); await p.mouse.up();
    const g = (await p.locator('.os-win[data-osw="terminal"] .os-rz').boundingBox())!;
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down(); await p.mouse.move(g.x + 2000, g.y + 2000, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(200);
    return { moved, preview, snapped, unsnapped, resized: await wins(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("windows live on a desktop: switch, minis, move to desktop, all desktops, focus from the dock goes there", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const minis = () => p.evaluate(() => [...document.querySelectorAll("#desks .desk[data-di]")].map((d) => [d.querySelectorAll(".osm").length, d.querySelector(".osm-n")?.textContent ?? null, [...d.querySelectorAll(".osm")].map((m) => (m as HTMLElement).dataset.osk + ":" + m.className).join(",")]));
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector<HTMLElement>("#desks .desk[data-di='1'] .thumb")?.click()); await p.waitForTimeout(900);
    const onD2 = [await wins(p), await store(p, "remotion-desks").then(normIds)];
    await p.click('#dock [data-t="files"]'); await p.waitForTimeout(200);
    const m1 = await minis();
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(1200); // lives on desktop 1: the dock takes you there
    const back = [await wins(p), await p.evaluate(() => JSON.parse(localStorage.getItem("remotion-desks")!).c)];
    await p.locator('.os-win[data-osw="terminal"] [data-wmenu]').click(); await sub(p, 0, "Move to desktop"); await pick(p, 1, "Desktop 3");
    await p.waitForTimeout(500); const movedT = [await wins(p), await toast(p), await minis()];
    await p.click('#dock [data-t="files"]'); await p.waitForTimeout(1200);
    await p.locator('.os-win[data-osw="files"] [data-wmenu]').click(); await pick(p, 0, "On all desktops"); await p.waitForTimeout(200);
    const all = [await wins(p), await toast(p), await minis()];
    return { onD2, m1, back, movedT, all };
  });
  expect(r.react).toEqual(r.source);
});

test("workspaces own their desktops and windows", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const ws = () => p.evaluate(() => localStorage.getItem("remotion-ws-desks"));
    const hud = () => p.evaluate(() => { const h = document.getElementById("dHud"); return h ? [h.className.includes("show"), h.querySelector("b")?.textContent, h.querySelector("small")?.textContent, h.querySelectorAll(".dh-dots i").length] : null; });
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(200);
    await wsOpen(p); await p.locator('#wsList [data-ws="1"]').click(); await p.waitForTimeout(500);
    const dev = [await wins(p), normIds(await ws()), normIds(await store(p, "remotion-desks")), await hud(), await p.locator("#dkLayer .dk-ic").count()];
    // The window is still the front one, so the dock minimises it (it lives in the other workspace); a second click restores it,
    // and focusing it goes back to its workspace (osGoTo).
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(400); const first = [await wins(p), await dock(p)];
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(800);
    const back = [first, await wins(p), normIds(await ws()), await p.locator("#wsLabel").textContent(), await p.locator("#dkLayer .dk-ic").count()];
    await p.locator('.os-win[data-osw="terminal"] [data-wmenu]').click(); await sub(p, 0, "Move to workspace"); await pick(p, 1, "Design"); await p.waitForTimeout(400);
    const moved = [await wins(p), await toast(p), normIds(await ws())];
    await wsOpen(p); await p.locator("#addWs").click(); await p.waitForTimeout(200);
    return { dev, back, moved, added: normIds(await ws()) };
  });
  expect(r.react).toEqual(r.source);
});

test("language switch relabels windows (D-B22 reproduced) and tray Show desktop", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click('#dock [data-t="terminal"]'); await icon(p, "Billing").dblclick(); await p.waitForTimeout(300);
    await p.click("#langBtn"); await p.click('#langMenu [data-lang="fr"]'); await p.waitForTimeout(900);
    const fr = await wins(p);
    await wc(p, "billing", "max").click(); await p.waitForTimeout(600); const frMax = await wins(p);
    await p.evaluate(() => { const b = document.querySelector<HTMLElement>('#desks [data-tray="show"]'); b?.click(); }); await p.waitForTimeout(400);
    const shown = [await wins(p), await dock(p)];
    await p.evaluate(() => { const b = document.querySelector<HTMLElement>('#desks [data-tray="show"]'); b?.click(); }); await p.waitForTimeout(400);
    return { fr, frMax, shown, restored: await wins(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("app mode, pop-out and app menus (B-03): window menu, dock context menu, app icon menu, Ctrl+Shift+Enter", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const solo = () => p.evaluate(() => ({ body: ["os-appmode", "os-standalone"].filter((c) => document.body.classList.contains(c)), bar: [...document.querySelectorAll(".os-solob button")].map((b) => [b.getAttribute("data-solo"), b.getAttribute("aria-label"), b.textContent]) }));
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(200);
    await p.locator('.os-win[data-osw="terminal"] [data-wmenu]').click(); await p.locator('.os-menu[data-level="0"]').waitFor();
    const wm = await menuRows(p, 0); await pick(p, 0, "App mode"); await p.waitForTimeout(500);
    const on = [await wins(p), await solo()];
    await p.locator('.os-solob [data-solo="exit"]').click(); await p.waitForTimeout(400);
    const off = [await wins(p), await solo()];
    await p.locator('#dock [data-t="terminal"]').click({ button: "right" }); await p.locator('.os-menu[data-level="0"]').waitFor(); const dockRows = await menuRows(p, 0);
    await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    await p.locator('#dock [data-t="documents"]').click({ button: "right" }); await p.locator('.os-menu[data-level="0"]').waitFor(); const dockRows2 = await menuRows(p, 0);
    await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    await p.locator('#dkLayer .dk-ic[title="Billing"]').click({ button: "right" }); await p.locator('.os-menu[data-level="0"]').waitFor(); const iconRows = await menuRows(p, 0);
    await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    await p.locator('.os-win[data-osw="terminal"] .os-wh b').click(); await p.keyboard.press("Control+Shift+Enter"); await p.waitForTimeout(400);
    const kb = [await wins(p), await solo()];
    await p.keyboard.press("Control+Shift+Enter"); await p.waitForTimeout(400);
    const pop = p.context().waitForEvent("page").catch(() => null);
    await p.locator('.os-win[data-osw="terminal"] [data-wmenu]').click(); await pick(p, 0, "Open in a new browser window"); await p.waitForTimeout(400);
    const pg = await pop; const popped = [await toast(p), await wins(p), pg ? new URL(pg.url()).hash || new URL(pg.url()).pathname : null];
    return { wm, on, off, dockRows, dockRows2, iconRows, kb, popped: [popped[0], popped[1]] };
  });
  expect(r.react).toEqual(r.source);
});
