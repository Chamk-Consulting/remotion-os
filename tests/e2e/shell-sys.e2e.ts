/** Phase B slice 5 — system menu, search palette, shortcuts panel and global shortcuts: dual-run parity. */
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
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
const shellCls = (p: Page) => p.evaluate(() => ["icons-hidden", "widgets-hidden", "desks-open", "nav-hidden"].filter((c) => document.getElementById("shell")!.classList.contains(c)));
const state = (p: Page) => p.evaluate(() => ({
  lang: document.documentElement.lang, dark: document.documentElement.classList.contains("dark"), theme: localStorage.getItem("remotion-theme"),
  ws: document.getElementById("wsLabel")?.textContent, wsOpen: !document.getElementById("wsMenu")!.classList.contains("closed"),
  desks: (JSON.parse(localStorage.getItem("remotion-desks") || "{}").l || []).length, cur: JSON.parse(localStorage.getItem("remotion-desks") || "{}").c,
  sys: !document.getElementById("sysMenu")!.classList.contains("closed"), pal: document.getElementById("palette")!.classList.contains("open"), sc: document.getElementById("scDlg")!.classList.contains("open"),
  view: [...document.querySelectorAll<HTMLElement>("#sysVp .kbm-view")].filter((v) => !v.hidden).map((v) => v.dataset.view).join(","),
}));
/** Visible system-menu view: rows as text with their state attributes. */
const sysRows = (p: Page) => p.evaluate(() => [...document.querySelectorAll<HTMLElement>("#sysVp .kbm-view:not([hidden]) > *")].map((e) => [e.tagName, e.className, e.getAttribute("role"), e.getAttribute("aria-checked"), e.textContent?.replace(/\s+/g, " ").trim(), [...e.attributes].filter((a) => a.name.startsWith("data-")).map((a) => a.name + "=" + a.value).join(" ")].join("|")));
const palRows = (p: Page) => p.evaluate(() => [...document.querySelectorAll("#palList > *")].map((e) => [e.className, e.getAttribute("aria-selected"), e.textContent?.replace(/\s+/g, " ").trim(), e.querySelector("mark")?.textContent ?? ""].join("|")));
const scBody = (p: Page) => p.evaluate(() => ({ nav: [...document.querySelectorAll("#scNav > *")].map((e) => e.tagName + ":" + (e.getAttribute("aria-current") ?? "") + ":" + e.textContent), cards: [...document.querySelectorAll("#scBody .scc, #scBody .scp-empty")].map((c) => c.textContent?.replace(/\s+/g, " ").trim()), marks: [...document.querySelectorAll("#scBody mark")].map((m) => m.textContent) }));

test("system menu: rows, every view, keyboard navigation", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click("#sysBtn"); await p.waitForTimeout(300);
    const main = [await sysRows(p), await p.evaluate(() => { const a = document.activeElement; return a?.closest("#sysMenu,#scDlg,#palette") ? a.textContent?.trim() : a?.tagName; }), await p.locator("#sysBtn").getAttribute("aria-expanded")];
    const views: Record<string, unknown> = {};
    for (const v of ["appearance", "language", "workspaces", "desktops", "ai", "news"]) { await p.click(`#sysMenu [data-go="${v}"]`); await p.waitForTimeout(700); views[v] = await sysRows(p); await p.click('#sysMenu .kbm-view:not([hidden]) [data-go="main"]'); await p.waitForTimeout(700); }
    await p.click('#sysMenu [data-go="info"]'); await p.waitForTimeout(700); views.info = (await sysRows(p)).length;
    await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(700); const back = await state(p);
    await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); const focus = await p.evaluate(() => { const a = document.activeElement; return a?.closest("#sysMenu,#scDlg,#palette") ? a.textContent?.trim() : a?.tagName; });
    await p.keyboard.press("ArrowRight"); await p.waitForTimeout(700); const into = [await state(p), await p.evaluate(() => { const a = document.activeElement; return a?.closest("#sysMenu,#scDlg,#palette") ? a.textContent?.trim() : a?.tagName; })];
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    return { main, views, back, focus, into, closed: await state(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("system menu actions: switches, theme, language, workspace, desktop, not-in-preview rows", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.click("#sysBtn"); await p.click('#sysMenu [data-go="appearance"]'); await p.waitForTimeout(600);
    await p.click('#sysMenu [data-sw="widgets"]'); await p.waitForTimeout(300); out.push(await shellCls(p), await sysRows(p));
    await p.click('#sysMenu [data-sw="icons"]'); await p.waitForTimeout(300); out.push(await shellCls(p), await p.evaluate(() => localStorage.getItem("remotion-rail")));
    await p.click('#sysMenu [data-ptheme="dark"]'); await p.waitForTimeout(500); out.push(await state(p), await sysRows(p), await toast(p));
    await p.click('#sysMenu [data-ptheme="auto"]'); await p.waitForTimeout(500); out.push(await state(p));
    await p.click('#sysMenu [data-sw="navbar"]'); await p.waitForTimeout(300); out.push(await shellCls(p), await state(p));
    await p.evaluate(() => document.getElementById("shell")!.classList.contains("nav-hidden"));
    await p.keyboard.press("Control+Alt+KeyB"); await p.waitForTimeout(200); out.push(await shellCls(p));
    await p.click("#sysBtn"); await p.click('#sysMenu [data-go="workspaces"]'); await p.waitForTimeout(600); await p.click('#sysMenu [data-ws-set="2"]'); await p.waitForTimeout(400); out.push(await state(p), await toast(p), await sysRows(p));
    await p.click('#sysMenu .kbm-view:not([hidden]) [data-go="main"]'); await p.waitForTimeout(600); await p.click('#sysMenu [data-go="desktops"]'); await p.waitForTimeout(600); await p.click('#sysMenu [data-desk-set="1"]'); await p.waitForTimeout(900); out.push(await state(p), await sysRows(p));
    await p.click('#sysMenu [data-act="dNew"]'); await p.waitForTimeout(900); out.push(await state(p));
    await p.click("#sysBtn"); await p.waitForTimeout(200); await p.click('#sysMenu [data-act="settingsApp"]'); await p.waitForTimeout(200); out.push(await toast(p), await state(p));
    await p.click('#sysMenu [data-go="ai"]'); await p.waitForTimeout(600); await p.click('#sysMenu [data-row="aiSummarize"]'); await p.waitForTimeout(200); out.push(await toast(p), await state(p));
    await p.click("#sysBtn"); await p.click('#sysMenu [data-go="language"]'); await p.waitForTimeout(600); await p.click('#sysMenu [data-lang-set="de"]'); await p.waitForTimeout(800); out.push(await state(p), await toast(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("search palette: suggestions, filtering with highlight, keys, run actions, outside click", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click("#searchBtn"); await p.waitForTimeout(300); const sug = [await palRows(p), await state(p)];
    await p.locator("#palInput").fill("de"); await p.waitForTimeout(150); const de = await palRows(p);
    await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowUp"); const moved = await palRows(p);
    await p.locator("#palInput").fill("zzzz"); await p.waitForTimeout(150); const none = await palRows(p);
    await p.locator("#palInput").fill("note"); await p.waitForTimeout(150); const notes = await palRows(p);
    await p.locator("#palInput").fill("dark"); await p.keyboard.press("Enter"); await p.waitForTimeout(700); const ran = [await state(p), await toast(p)];
    await p.keyboard.press("Control+KeyK"); await p.waitForTimeout(300); await p.locator("#palInput").fill("Fran"); await p.waitForTimeout(150); const fr = await palRows(p);
    await p.locator("#palList .pal-item").first().click(); await p.waitForTimeout(900); const lang = [await state(p), await toast(p)];
    await p.click("#searchBtn"); await p.waitForTimeout(300); await p.mouse.click(700, 700); await p.waitForTimeout(200); const outside = await state(p);
    await p.click("#searchBtn"); await p.waitForTimeout(300); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    return { sug, de, moved, none, notes, ran, fr, lang, outside, esc: await state(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("shortcuts panel: categories, search, custom shortcuts (record closes the panel: D-A29), saved custom runs, remove", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.keyboard.press("Control+Slash"); await p.waitForTimeout(500); const all = [await scBody(p), await state(p)];
    await p.click('#scNav [data-cat="catVd"]'); await p.waitForTimeout(300); const vd = await scBody(p);
    await p.locator("#scSearch").fill("work"); await p.waitForTimeout(200); const q = await scBody(p);
    await p.locator("#scSearch").fill("qqqq"); await p.waitForTimeout(200); const none = await scBody(p);
    await p.locator("#scSearch").fill(""); await p.click('#scNav [data-cat="catCustom"]'); await p.waitForTimeout(300); const cust0 = await scBody(p);
    await p.selectOption("#custAct", "toggleWidgets|widgets");
    await p.click("#custRec"); await p.waitForTimeout(150); const afterRec = await state(p);
    await p.keyboard.press("Control+Alt+KeyJ"); await p.waitForTimeout(300); const notRecorded = [await shellCls(p), await p.evaluate(() => localStorage.getItem("remotion-custom-sc"))];
    // A saved custom shortcut (as an older build could have stored) still runs and can be removed.
    await p.evaluate(() => localStorage.setItem("remotion-custom-sc", JSON.stringify([{ label: "toggleWidgets", act: "widgets", combo: "Ctrl+Alt+J" }])));
    await p.reload(); await p.locator("#dkLayer .dk-ic").first().waitFor(); await p.waitForTimeout(600);
    await p.keyboard.press("Control+Alt+KeyJ"); await p.waitForTimeout(400); const used = await shellCls(p);
    await p.keyboard.press("Control+Slash"); await p.waitForTimeout(400); await p.click('#scNav [data-cat="catCustom"]'); await p.waitForTimeout(200); const listed = await scBody(p);
    await p.locator("#scSearch").fill("widg"); await p.waitForTimeout(200); const found = await scBody(p);
    await p.locator("#scSearch").fill(""); await p.click('#scNav [data-cat="catCustom"]'); await p.waitForTimeout(200);
    await p.click("#scBody [data-rm]"); await p.waitForTimeout(200); const removed = [await state(p), await p.evaluate(() => localStorage.getItem("remotion-custom-sc"))];
    await p.keyboard.press("Control+Slash"); await p.waitForTimeout(300); await p.mouse.click(5, 450); await p.waitForTimeout(200);
    return { all, vd, q, none, cust0, afterRec, notRecorded, used, listed, found, removed, closed: await state(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("global shortcuts from the catalogue", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: Record<string, unknown> = {};
    const step = async (name: string, keys: string, wait = 500) => { await p.keyboard.press(keys); await p.waitForTimeout(wait); out[name] = [await state(p), await shellCls(p), await toast(p)]; };
    await step("lang", "Control+Shift+KeyL", 900);
    await step("lang2", "Control+Shift+KeyL", 900);
    await step("lang3", "Control+Shift+KeyL", 900);
    await step("lang4", "Control+Shift+KeyL", 900);
    await step("theme", "Control+Shift+KeyT");
    await step("widgets", "Control+Alt+KeyH");
    await step("icons", "Control+Alt+KeyI");
    await step("showDesk", "Meta+KeyD");
    await step("wsNext", "Control+Alt+ArrowRight", 700);
    await step("wsPrev", "Control+Alt+ArrowLeft", 700);
    await step("wsSwitcher", "Control+Alt+KeyW");
    await step("wsManage", "Control+Alt+Shift+KeyW", 900);
    await p.keyboard.press("Escape");
    await step("settings", "Control+Comma");
    await step("settings2", "Control+Comma");
    await step("dNew", "Control+Meta+KeyD", 1000);
    await step("dPrev", "Control+Meta+ArrowLeft", 1000);
    await step("dOverview", "Control+Meta+Tab");
    await step("dOverview2", "Control+Meta+Tab");
    await step("dClose", "Control+Meta+Shift+KeyD", 900);
    await step("calToday", "Control+Alt+KeyC");
    await step("note", "Control+Alt+KeyN");
    await p.keyboard.press("Escape");
    await step("quit", "Control+KeyQ");
    await step("pin", "Control+Shift+KeyP");
    await step("search", "Control+Shift+KeyF");
    await p.keyboard.press("Escape");
    await step("navbar", "Control+Alt+KeyB");
    return out;
  });
  expect(r.react).toEqual(r.source);
});
