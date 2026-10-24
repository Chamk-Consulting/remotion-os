/** Phase C slice 17 — Calculator & scientific tools (native port): dual-run parity (source file:// vs React shell). */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

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
/** History ids are "h" + Date.now() (fixed clock) + 3 random characters (L21542); duplicates, custom units and formulas use the time only. */
function norm(v: unknown) {
  const map = new Map<string, string>();
  const s = JSON.stringify(v).replace(/(\\"_id\\":\\")d[0-9a-z]{1,8}/g, "$1D").replace(new RegExp(`\\b([a-z]{0,2})${T36}([0-9a-z]{0,5})\\b`, "g"), (m, p) => { if (!map.has(m)) map.set(m, p + "#" + map.size); return map.get(m)!; });
  return JSON.parse(s);
}
/** Serialised subtree: tag, sorted classes, identity / state attributes, normalised inline style, value, own text. */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => ["id", "role", "hidden", "disabled", "type", "dir", "placeholder", "tabindex", "title", "lang", "value", "checked", "selected", "href", "src"].includes(n) || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (e.tagName === "svg" && !e.classList.contains("ca-plot") && !e.classList.contains("ca-grsvg")) return ["svg" + (e.getAttribute("class") ? "." + e.getAttribute("class") : "")];
    const attrs = [...e.attributes].filter((a) => keep(a.name)).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const W = '.os-win[data-osw="calcsci"]';
const ca = (p: Page) => tree(p, `${W} .ca`);
const main = (p: Page) => tree(p, `${W} .ca-main`);
const pg = (p: Page) => tree(p, `${W} .ca-pg`);
const store = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem("remotion-calc") || "null"));
/** The workspace menu opened at load can still cover the icon under load: it is closed through its button, as in shell-windows. */
const openCa = async (p: Page) => { await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {}); if (!(await p.evaluate(() => document.getElementById("wsMenu")?.classList.contains("closed") ?? true))) { await p.click("#wsBtn"); await p.waitForTimeout(400); } await p.dblclick('#dkLayer .dk-ic[title="Calculator & scientific tools"]'); await p.locator(`${W} .ca-pg`).waitFor(); await p.waitForTimeout(700); };

test("open: shell, home page, layout size, store, dock button", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openCa(p);
    return [await ca(p), await p.getAttribute(`${W} .ca`, "data-sz"), await store(p), await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => (b as HTMLElement).dataset.t + ":" + b.className)), await p.getAttribute(W, "aria-label")];
  });
  expect(r.react).toEqual(r.source);
});

const hist = (p: Page) => tree(p, `${W} .ca-hp`);
const toastOf = (p: Page) => p.locator(`${W} .ca-toast`).evaluate((e) => [e.className, e.textContent]);
const dlg = (p: Page) => tree(p, `${W} .ca-dlg`);
/** Navigation through the source's own click handler (items may sit in a closed section). */
const go = async (p: Page, view: string) => { await p.evaluate(([W, v]) => (document.querySelector(`${W} [data-cago="${v}"]`) as HTMLElement | null)?.click(), [W, view]); await p.waitForTimeout(450); };
const dclick = async (p: Page, sel: string) => { await p.evaluate((sel) => (document.querySelector(sel) as HTMLElement).click(), sel); await p.waitForTimeout(350); };
const typeIn = async (p: Page, sel: string, v: string, wait = 350) => { await p.fill(sel, v); await p.waitForTimeout(wait); };
const download = async (p: Page, sel: string) => {
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 3000 }).catch(() => null), dclick(p, sel)]);
  return dl ? [dl.suggestedFilename(), (await import("node:fs")).readFileSync((await dl.path())!, "utf8").slice(0, 1500)] : null;
};

test("shell: navigation, sections, search, keyboard, history panel, angle, favourites, quick calculation", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p);
    await p.fill(`${W} [data-caquick]`, "2^10/3"); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-caquickr]`));
    await p.fill(`${W} [data-caquick]`, "2^^3"); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-caquickr]`));
    await p.fill(`${W} [data-caquick]`, "sqrt(2)*ans"); await p.press(`${W} [data-caquick]`, "Enter"); await p.waitForTimeout(300);
    await p.fill(`${W} [data-caquick]`, "12*7"); await p.press(`${W} [data-caquick]`, "Enter"); await p.waitForTimeout(400); out.push(await tree(p, `${W} .ca-quick`), await hist(p));
    for (const v of ["hist", "saved", "loan", "consts", "library", "settings", "home"]) { await go(p, v); out.push(v, await main(p)); }
    await dclick(p, `${W} [data-catog="math"]`); out.push(await tree(p, `${W} .ca-nav`));
    await dclick(p, `${W} [data-catog="math"]`); await dclick(p, `${W} [data-catog="calc"]`); out.push(await tree(p, `${W} .ca-nav`));
    await dclick(p, `${W} [data-casec="fin"]`); out.push(await tree(p, `${W} .ca-nav`));
    await p.fill(`${W} [data-caq]`, "temp"); await p.waitForTimeout(300); out.push(await tree(p, `${W} .ca-nl`));
    await p.fill(`${W} [data-caq]`, "zzzz"); await p.waitForTimeout(300); out.push(await tree(p, `${W} .ca-nl`));
    await p.fill(`${W} [data-caq]`, ""); await p.waitForTimeout(300);
    await p.focus(`${W} .ca-nl .ca-ni`); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowUp");
    out.push(await p.evaluate(() => (document.activeElement as HTMLElement)?.dataset.cago || (document.activeElement as HTMLElement)?.dataset.catog || null));
    await p.keyboard.press("Enter"); await p.waitForTimeout(500); out.push(await tree(p, `${W} .ca-hd`));
    await go(p, "trig"); await p.click(`${W} [data-caang]`); await p.waitForTimeout(400); out.push(await tree(p, `${W} .ca-hd`), await pg(p));
    await p.click(`${W} [data-caang]`); await p.waitForTimeout(400); out.push(await pg(p)); await p.click(`${W} [data-caang]`); await p.waitForTimeout(300);
    await p.click(`${W} [data-cafav]`); await p.waitForTimeout(300); await go(p, "loan"); await p.click(`${W} [data-cafav]`); await p.waitForTimeout(300); out.push(await tree(p, `${W} .ca-nav`));
    await go(p, "home"); out.push(await pg(p));
    await p.click(`${W} [data-cahist]`); await p.waitForTimeout(400); out.push(await hist(p));
    await p.fill(`${W} .ca-hp [data-cahq]`, "84"); await p.waitForTimeout(300); out.push(await hist(p)); await p.fill(`${W} .ca-hp [data-cahq]`, ""); await p.waitForTimeout(300);
    await p.keyboard.press("Escape"); await p.waitForTimeout(400); out.push(await hist(p));
    await p.click(`${W} [data-cahx]`).catch(() => {}); await p.waitForTimeout(400); out.push(await hist(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("generic tools: fields, units, segments, examples, reset, keep, copy, CSV, errors, visibility changes", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p);
    await go(p, "frac"); out.push(await pg(p));
    await dclick(p, `${W} [data-caex="0"]`); out.push(await tree(p, `${W} [data-cares]`));
    await dclick(p, `${W} [data-caex="1"]`); out.push(await pg(p));
    await dclick(p, `${W} [data-caseg="mode"][data-v="op"]`); await typeIn(p, `${W} [data-caf="a"]`, "7/0"); out.push(await tree(p, `${W} [data-cares]`));
    await dclick(p, `${W} [data-careset]`); out.push(await pg(p));
    await go(p, "loan"); await typeIn(p, `${W} [data-caf="P"]`, "250*1000"); await typeIn(p, `${W} [data-caf="r"]`, "4,2"); await p.selectOption(`${W} [data-caf="f"]`, "4"); await p.waitForTimeout(350);
    await dclick(p, `${W} [data-caseg="kind"][data-v="lin"]`); out.push(await pg(p));
    out.push(await download(p, `${W} [data-cacsv]`));
    await dclick(p, `${W} [data-cakeep]`); out.push(await toastOf(p));
    await p.click(`${W} [data-caf="P"]`); await p.keyboard.press("Control+Enter"); await p.waitForTimeout(300);
    await dclick(p, `${W} .ca-res [data-cacopy]`); out.push(await toastOf(p));
    await typeIn(p, `${W} [data-caf="y"]`, ""); out.push(await tree(p, `${W} [data-cares]`));
    await typeIn(p, `${W} [data-caf="y"]`, "-3"); out.push(await tree(p, `${W} [data-cares]`));
    await go(p, "ohm"); out.push(await pg(p));
    const us = await p.locator(`${W} [data-cafu]`).count(); if (us) { await p.locator(`${W} [data-cafu]`).first().selectOption({ index: 1 }); await p.waitForTimeout(350); }
    await typeIn(p, `${W} [data-caf]:not([type=checkbox]) >> nth=0`, "12[V]"); out.push(await tree(p, `${W} [data-cares]`));
    await go(p, "health"); out.push(await pg(p));
    await p.check(`${W} [data-caf="ack"]`); await p.waitForTimeout(400); out.push(await pg(p));
    await p.selectOption(`${W} select[data-caf="m"]`, "rate"); await p.waitForTimeout(400); out.push(await tree(p, `${W} [data-caform]`));
    await go(p, "dist"); await p.selectOption(`${W} [data-caf="d"]`, "binom"); await p.waitForTimeout(400); out.push(await pg(p));
    await go(p, "stats"); await typeIn(p, `${W} [data-caf="x"]`, "4 8 15 16 23 42 x"); out.push(await tree(p, `${W} [data-cares]`));
    await go(p, "mat"); await p.selectOption(`${W} [data-caf="op"]`, "inv"); await p.waitForTimeout(400); out.push(await tree(p, `${W} [data-cares]`));
    await go(p, "color"); await typeIn(p, `${W} [data-caf="x"]`, "#2fc768"); out.push(await tree(p, `${W} [data-cares]`));
    await go(p, "cur"); await typeIn(p, `${W} [data-caf="rate"]`, "1.08"); await p.check(`${W} [data-caf="save"]`); await p.waitForTimeout(400); out.push(await pg(p));
    await typeIn(p, `${W} [data-caf="rate"]`, ""); out.push(await pg(p));
    await dclick(p, `${W} [data-ratedel="0"]`); out.push(await pg(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("history: page, filters, search, reopen, copy, star, duplicate, rename, note, delete with undo, clear, export", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p);
    for (const e of ["1+1", "2*21", "sqrt(81)", "5[km] to [mi]"]) { await p.fill(`${W} [data-caquick]`, e); await p.press(`${W} [data-caquick]`, "Enter"); await p.waitForTimeout(250); }
    await go(p, "pct"); await dclick(p, `${W} [data-cakeep]`); await go(p, "hist"); out.push(await pg(p));
    await dclick(p, `${W} [data-hfilt="math"]`); out.push(await tree(p, `${W} .ca-pg [data-cahl]`)); await dclick(p, `${W} [data-hfilt=""]`);
    await p.fill(`${W} .ca-pg [data-cahq]`, "km"); await p.waitForTimeout(300); out.push(await tree(p, `${W} .ca-pg [data-cahl]`)); await p.fill(`${W} .ca-pg [data-cahq]`, ""); await p.waitForTimeout(300);
    const row = (i: number, sel: string) => `${W} .ca-pg [data-hid] >> nth=${i} >> ${sel}`;
    await p.click(row(0, "[data-hfav]")); await p.waitForTimeout(300);
    await p.click(row(1, "[data-hdup]")); await p.waitForTimeout(300);
    await p.click(row(2, "[data-hren]")); await p.waitForTimeout(300); out.push(await dlg(p)); await p.fill(`${W} .ca-dlg input`, "Racine"); await p.press(`${W} .ca-dlg input`, "Enter"); await p.waitForTimeout(300);
    await p.click(row(3, "[data-hnote]")); await p.waitForTimeout(300); await p.fill(`${W} .ca-dlg input`, "vérifié"); await p.click(`${W} .ca-dlg [data-x]`); await p.waitForTimeout(300);
    await p.click(row(3, "[data-hnote]")); await p.waitForTimeout(300); await p.fill(`${W} .ca-dlg input`, "vérifié"); await p.click(`${W} .ca-dlg button[type=submit]`); await p.waitForTimeout(300);
    await p.click(row(0, "[data-hcopy]")); await p.waitForTimeout(300); out.push(await toastOf(p));
    await p.click(row(4, "[data-hdel]")); await p.waitForTimeout(500); out.push(await tree(p, `${W} .ca-pg [data-cahl]`), await toastOf(p));
    await p.click(`${W} .ca-toast button`); await p.waitForTimeout(400); out.push(await tree(p, `${W} .ca-pg [data-cahl]`));
    await p.locator(`${W} .ca-pg [data-hsel]`).nth(1).check(); await p.locator(`${W} .ca-pg [data-hsel]`).nth(2).check();
    out.push(await download(p, `${W} [data-hexp="csv"]`)); out.push(await download(p, `${W} [data-hexp="json"]`));
    await go(p, "saved"); out.push(await pg(p));
    await go(p, "hist"); await p.click(`${W} .ca-pg [data-hid] >> nth=0 >> [data-hopen]`); await p.waitForTimeout(500); out.push(await main(p));
    await go(p, "hist"); await p.click(`${W} .ca-pg [data-hid]:has-text("pct") >> [data-hopen]`).catch(() => {}); await p.waitForTimeout(500); out.push(await tree(p, `${W} .ca-hd`));
    await go(p, "hist"); await dclick(p, `${W} .ca-pg [data-cahclear]`); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300); out.push(await dlg(p));
    await dclick(p, `${W} .ca-pg [data-cahclear]`); await p.click(`${W} .ca-dlg [data-y]`); await p.waitForTimeout(400); out.push(await pg(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

const std = (p: Page) => tree(p, `${W} .ca-std`);
const keys = async (p: Page, attr: string, ks: string[]) => { for (const k of ks) { await p.click(`${W} [${attr}="${k}"]`); await p.waitForTimeout(60); } await p.waitForTimeout(150); };

test("standard calculator: keypad, percent, memory, repeat equals, errors, tape, keyboard, copy", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p); await go(p, "std"); out.push(await std(p));
    await keys(p, "data-sk", ["1", "2", ".", "5", "+", "7", "*", "(", "2", "-", "0", ".", "5", ")"]); out.push(await std(p));
    await keys(p, "data-sk", ["="]); out.push(await std(p)); await keys(p, "data-sk", ["="]); out.push(await std(p));
    await keys(p, "data-sk", ["ms", "c", "2", "0", "0", "+", "1", "5", "pct"]); out.push(await std(p));
    await keys(p, "data-sk", ["=", "mp", "mr", "neg", "neg", "inv", "sq", "sqrt", "bs", "ce"]); out.push(await std(p));
    await keys(p, "data-sk", ["8", "/", "0", "="]); out.push(await std(p));
    await keys(p, "data-sk", ["c", "9", "mm", "mr", "*", "2", "=", "mc"]); out.push(await std(p));
    await p.click(`${W} [data-stape]`); await p.waitForTimeout(300); out.push(await std(p)); await p.click(`${W} [data-stape]`); await p.waitForTimeout(300);
    await p.click(`${W} [data-stuse] >> nth=1`).catch(() => {}); await p.waitForTimeout(300); out.push(await std(p));
    await p.click(`${W} .ca-std`); for (const k of ["3", "+", "4", "*", "2", "Enter", "Backspace", "%", "Escape", "7", "x", "6", "=", "F9", "r", "@", "q"]) { await p.keyboard.press(k); await p.waitForTimeout(60); }
    await p.waitForTimeout(200); out.push(await std(p));
    for (const k of ["Control+m", "Control+r", "Control+p", "Control+q", "Control+l"]) { await p.keyboard.press(k); await p.waitForTimeout(80); } out.push(await std(p));
    await p.click(`${W} [data-scopy]`); await p.waitForTimeout(300); out.push(await toastOf(p));
    await p.click(`${W} [data-stclear]`); await p.waitForTimeout(300); out.push(await std(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("scientific calculator: functions, 2nd and hyp, preview, evaluate, errors, STO variables, insert, keyboard", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p); await go(p, "sci"); const sci = () => tree(p, `${W} .ca-sci`);
    await keys(p, "data-xk", ["fn:sin", "3", "0", ")", "+", "ins:pi", "ins:^2", "*", "2"]); out.push(await sci());
    await keys(p, "data-xk", ["="]); out.push(await sci());
    await keys(p, "data-xk", ["shift"]); out.push(await sci()); await keys(p, "data-xk", ["hyp"]); out.push(await sci());
    await keys(p, "data-xk", ["fn:asinh", "1", ")"]).catch(() => {}); await keys(p, "data-xk", ["shift", "hyp", "c", "fn:root", "2", "7", ",", "3", ")", "exp", "2", "bs", "neg", "="]); out.push(await sci());
    await keys(p, "data-xk", ["sto"]); await p.waitForTimeout(200); out.push(await dlg(p), await toastOf(p));
    await p.fill(`${W} [data-xin]`, "6*7"); await p.press(`${W} [data-xin]`, "Enter"); await p.waitForTimeout(300);
    await keys(p, "data-xk", ["sto"]); out.push(await dlg(p)); await p.fill(`${W} .ca-dlg input`, "pi"); await p.press(`${W} .ca-dlg input`, "Enter"); await p.waitForTimeout(300); out.push(await sci(), await toastOf(p));
    await keys(p, "data-xk", ["sto"]); await p.fill(`${W} .ca-dlg input`, "k1"); await p.press(`${W} .ca-dlg input`, "Enter"); await p.waitForTimeout(400); out.push(await sci());
    await p.click(`${W} [data-xins="k1"]`); await keys(p, "data-xk", ["*", "ins:ans", "="]); out.push(await sci());
    await p.fill(`${W} [data-xin]`, "2*(3+"); await p.waitForTimeout(300); out.push(await sci());
    await p.fill(`${W} [data-xin]`, "2*(3+)"); await p.press(`${W} [data-xin]`, "Enter"); await p.waitForTimeout(300); out.push(await sci(), await p.evaluate((W) => { const i = document.querySelector(`${W} [data-xin]`) as HTMLInputElement; return [i.selectionStart, i.selectionEnd]; }, W));
    await p.fill(`${W} [data-xin]`, "10[km] to [mi]"); await p.press(`${W} [data-xin]`, "Enter"); await p.waitForTimeout(300); out.push(await sci());
    await p.fill(`${W} [data-xin]`, "max(1,2)"); await p.press(`${W} [data-xin]`, "Enter"); await p.waitForTimeout(300); out.push(await sci());
    await p.press(`${W} [data-xin]`, "Escape"); await p.waitForTimeout(300); out.push(await sci());
    await p.click(`${W} [data-caang]`); await p.waitForTimeout(300); out.push(await sci());
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

/** The graph's drawn SVG: element kinds and the attributes that carry the plot. */
const plot = (p: Page) => p.evaluate((W) => { const s = document.querySelector(`${W} [data-grsvg]`); if (!s) return null; return [s.getAttribute("viewBox"), [...s.querySelectorAll("*")].map((e) => e.tagName + ":" + ["d", "x1", "x2", "y1", "y2", "x", "y", "class"].map((a) => e.getAttribute(a) ?? "").join(",") + ":" + (e.children.length ? "" : e.textContent))]; }, W);

test("graph: functions, window, zoom, fit, reset, wheel, drag, hover values, zeros", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p); await go(p, "graph"); await p.waitForTimeout(400); out.push(await pg(p), await plot(p));
    await typeIn(p, `${W} [data-grf] >> nth=2`, "x^3/20 - x", 450); out.push(await tree(p, `${W} [data-grinfo]`), await plot(p));
    await typeIn(p, `${W} [data-grf] >> nth=3`, "1/x +", 450); out.push(await tree(p, `${W} [data-grinfo]`));
    await typeIn(p, `${W} [data-grw="x0"]`, "-4", 450); await typeIn(p, `${W} [data-grw="x1"]`, "-6", 450); out.push(await plot(p));
    for (const z of ["in", "out", "fit", "reset", "in"]) { await p.click(`${W} [data-grz="${z}"]`); await p.waitForTimeout(350); out.push(z, await tree(p, `${W} .ca-grw`)); }
    const box = (await p.locator(`${W} [data-grsvg]`).boundingBox())!;
    await p.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4); await p.waitForTimeout(250); out.push(await tree(p, `${W} [data-grtip]`));
    await p.mouse.wheel(0, 300); await p.waitForTimeout(300); out.push(await tree(p, `${W} .ca-grw`));
    await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.55, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(300); out.push(await tree(p, `${W} .ca-grw`), await plot(p));
    await p.mouse.move(box.x - 30, box.y - 30); await p.waitForTimeout(250); out.push(await tree(p, `${W} [data-grtip]`));
    await p.click(`${W} [data-caang]`); await p.waitForTimeout(400); out.push(await plot(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("expression editor: sample, typing, results, errors, highlight, autocomplete, reference, toolbar, line copy", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p); await go(p, "editor"); await p.waitForTimeout(500); const ed = () => tree(p, `${W} .ca-pg`);
    out.push(await ed());
    await p.fill(`${W} [data-caed]`, "a = 12\nb = a*3 # trois\nc = sqrt(b\nd = 150[cm] to [m]\n@c*2\nfoo(1)\n"); await p.waitForTimeout(700); out.push(await ed());
    await p.click(`${W} [data-caed]`); await p.keyboard.press("Control+End"); await p.keyboard.type("sq"); await p.waitForTimeout(500); out.push(await tree(p, `${W} [data-edac]`));
    await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await p.waitForTimeout(400); out.push(await p.inputValue(`${W} [data-caed]`));
    await p.keyboard.type("16)"); await p.keyboard.press("Tab"); await p.waitForTimeout(600); out.push(await p.inputValue(`${W} [data-caed]`), await tree(p, `${W} [data-edr]`));
    await p.keyboard.type("\nlo"); await p.waitForTimeout(400); await p.keyboard.press("Escape"); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-edac]`));
    await p.click(`${W} [data-edcp] >> nth=0`); await p.waitForTimeout(300); out.push(await toastOf(p));
    for (const x of ["ref", "copy"]) { await p.click(`${W} [data-edx="${x}"]`); await p.waitForTimeout(400); out.push(x, await toastOf(p)); }
    out.push(await tree(p, `${W} [data-edref]`));
    out.push(await download(p, `${W} [data-edx="txt"]`), await download(p, `${W} [data-edx="csv"]`));
    await p.click(`${W} [data-edx="save"]`); await p.waitForTimeout(400); out.push(await dlg(p));
    if (await p.locator(`${W} .ca-dlg input`).count()) { await p.fill(`${W} .ca-dlg input`, "Feuille 1"); await p.press(`${W} .ca-dlg input`, "Enter"); await p.waitForTimeout(400); }
    out.push(await toastOf(p));
    await p.click(`${W} [data-edx="ex"]`); await p.waitForTimeout(500); out.push(await ed());
    await p.click(`${W} [data-edx="clear"]`); await p.waitForTimeout(400); out.push(await dlg(p)); const y = await p.locator(`${W} .ca-dlg [data-y]`).count(); if (y) { await p.click(`${W} .ca-dlg [data-y]`); await p.waitForTimeout(500); }
    out.push(await ed());
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("converters: value, unit picker with search and keyboard, swap, shortcuts, favourites, precision, clear, keep, copy", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p); await go(p, "cv_length"); const cv = () => tree(p, `${W} .ca-pg`);
    out.push(await cv());
    await typeIn(p, `${W} [data-cvv]`, "5,5"); out.push(await tree(p, `${W} [data-cvout]`), await tree(p, `${W} [data-cvmeta]`));
    await typeIn(p, `${W} [data-cvv]`, "3[kg]"); out.push(await tree(p, `${W} [data-cvout]`));
    await typeIn(p, `${W} [data-cvv]`, "2*1.5");
    await p.click(`${W} [data-upopen="a"]`); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-up="a"]`));
    await p.fill(`${W} [data-up="a"] [data-upq]`, "mil"); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-up="a"]`));
    await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await p.waitForTimeout(400); out.push(await cv());
    await p.click(`${W} [data-upopen="b"]`); await p.waitForTimeout(300); await p.click(`${W} [data-up="b"] [data-upv]:has-text("yard")`).catch(() => {}); await p.waitForTimeout(400); out.push(await cv());
    await p.click(`${W} [data-upopen="b"]`); await p.waitForTimeout(300); await p.click(`${W} .ca-hd`); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-up="b"]`));
    await p.click(`${W} [data-cvswap]`); await p.waitForTimeout(400); out.push(await cv());
    await p.click(`${W} [data-cvpre] >> nth=1`); await p.waitForTimeout(400); out.push(await cv());
    await p.click(`${W} [data-cvfav]`); await p.waitForTimeout(300); out.push(await cv());
    await p.selectOption(`${W} [data-cvsig]`, { index: 2 }); await p.waitForTimeout(400); out.push(await cv());
    await p.click(`${W} [data-cvkeep]`); await p.waitForTimeout(300); out.push(await toastOf(p));
    await p.click(`${W} .ca-pg [data-cacopy] >> nth=0`); await p.waitForTimeout(300); out.push(await toastOf(p));
    await p.click(`${W} [data-cvclear]`); await p.waitForTimeout(300); out.push(await cv());
    for (const c of ["cv_temp", "cv_fuel", "cv_data", "cv_dtemp"]) { await go(p, c); await typeIn(p, `${W} [data-cvv]`, "-40"); out.push(c, await cv()); }
    await go(p, "cv_length"); out.push(await cv());
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("library: constants (search, kinds, insert, custom), unit expressions, programmer, custom formulas", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p);
    await go(p, "consts"); out.push(await pg(p));
    await p.fill(`${W} [data-cq]`, "planck"); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-ctb]`)); await p.fill(`${W} [data-cq]`, ""); await p.waitForTimeout(300);
    for (const k of ["meas", "conv", "user", ""]) { await dclick(p, `${W} [data-ck="${k}"]`); out.push(k, await tree(p, `${W} [data-ctb]`)); }
    const cn = (k: string) => `${W} [data-cn="${k}"]`;
    await p.fill(cn("id"), "@g_moon"); await p.fill(cn("v"), "1.62").catch(() => {}); await p.fill(cn("unit"), "m/s²").catch(() => {}); await p.fill(cn("name"), "Gravité lunaire").catch(() => {});
    await dclick(p, `${W} [data-cadd]`); out.push(await pg(p), await toastOf(p));
    await p.fill(cn("id"), "9bad"); await dclick(p, `${W} [data-cadd]`); out.push(await toastOf(p));
    await dclick(p, `${W} [data-ck="user"]`); out.push(await tree(p, `${W} [data-ctb]`));
    await dclick(p, `${W} [data-cdel]`); out.push(await tree(p, `${W} [data-ctb]`));
    await dclick(p, `${W} [data-ck=""]`); await dclick(p, `${W} [data-cuse]`); await p.waitForTimeout(400); out.push(await main(p));
    await go(p, "uexpr"); out.push(await pg(p));
    for (const ex of ["1.5[mi] to [km]", "500[mg/dL] to [g/L]", "2[h] + 45[min] to [min]", "10[Δ°C] to [Δ°F]"]) { await p.click(`${W} [data-uxe="${ex}"]`); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-uxo]`)); }
    await typeIn(p, `${W} [data-uxi]`, "3[ft] + 4[in] to [cm]"); out.push(await tree(p, `${W} [data-uxo]`));
    await go(p, "prog"); out.push(await pg(p));
    await typeIn(p, `${W} [data-pgv]`, "-42"); out.push(await tree(p, `${W} [data-pgres]`));
    await p.selectOption(`${W} [data-pgk="base"]`, "16"); await p.waitForTimeout(350); out.push(await pg(p));
    await p.selectOption(`${W} [data-pgk="w"]`, "8"); await p.waitForTimeout(350); await p.click(`${W} [data-pgsg]`); await p.waitForTimeout(350); out.push(await pg(p));
    await p.selectOption(`${W} [data-pgk="op"]`, { index: 3 }); await p.waitForTimeout(350); await typeIn(p, `${W} input[data-pgk="b"]`, "F0"); out.push(await tree(p, `${W} [data-pgres]`));
    await p.click(`${W} [data-pgbit] >> nth=2`); await p.waitForTimeout(300); await p.click(`${W} [data-pgbit] >> nth=5`); await p.waitForTimeout(300); out.push(await pg(p));
    await typeIn(p, `${W} [data-pgv]`, "zz"); out.push(await tree(p, `${W} [data-pgres]`));
    await go(p, "custom"); out.push(await pg(p));
    const cf = (k: string) => `${W} [data-cfk="${k}"]`;
    await typeIn(p, cf("name"), "Volume cylindre"); await typeIn(p, cf("expr"), "pi*(d/2)^2*h", 450); out.push(await pg(p));
    await typeIn(p, `${W} [data-cfv="d"]`, "0.2"); await typeIn(p, `${W} [data-cfv="h"]`, "1.5"); out.push(await tree(p, `${W} [data-cfres]`));
    await dclick(p, `${W} [data-cfsave]`); out.push(await pg(p), await toastOf(p));
    await dclick(p, `${W} [data-cfnew]`); out.push(await pg(p));
    await typeIn(p, cf("expr"), "a*(b"); out.push(await tree(p, `${W} [data-cfres]`));
    await dclick(p, `${W} [data-cfopen]`); out.push(await pg(p));
    await dclick(p, `${W} [data-cfdel]`); out.push(await dlg(p)); if (await p.locator(`${W} .ca-dlg [data-y]`).count()) { await p.click(`${W} .ca-dlg [data-y]`); await p.waitForTimeout(400); }
    out.push(await pg(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("settings: every select, custom units, variables, export, import (incl. a crafted backup — D-E13), reset everything", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p);
    await p.fill(`${W} [data-caquick]`, "2/3"); await p.press(`${W} [data-caquick]`, "Enter"); await p.waitForTimeout(300);
    await go(p, "sci"); await p.fill(`${W} [data-xin]`, "6*7"); await p.press(`${W} [data-xin]`, "Enter"); await p.waitForTimeout(300); await p.click(`${W} [data-xk="sto"]`); await p.fill(`${W} .ca-dlg input`, "rho"); await p.press(`${W} .ca-dlg input`, "Enter"); await p.waitForTimeout(300);
    await go(p, "settings"); out.push(await pg(p));
    const sets: [string, string][] = [["sig", "6"], ["nt", "eng"], ["dp", "4"], ["ang", "rad"], ["dec", ","], ["grp", "space"], ["round", "halfeven"], ["cur", "USD"], ["hmax", "100"], ["nt", "fix"]];
    for (const [k, v] of sets) { await p.selectOption(`${W} [data-cset="${k}"]`, v).catch(() => {}); await p.waitForTimeout(300); out.push(k, await tree(p, `${W} .ca-hd`), await p.evaluate((W) => document.querySelector(`${W} [data-cset="nt"]`)?.closest(".ca-pg")?.querySelectorAll("select").length, W)); }
    await p.selectOption(`${W} select[data-cu]`, { index: 2 }).catch(() => {}); await p.fill(`${W} input[data-cu="sym"]`, "brasse").catch(() => {}); await p.fill(`${W} input[data-cu="f"]`, "1.8288").catch(() => {}); await p.fill(`${W} input[data-cu="name"]`, "Brasse").catch(() => {});
    await dclick(p, `${W} [data-cuadd]`); out.push(await pg(p), await toastOf(p));
    await dclick(p, `${W} [data-cudel]`); out.push(await pg(p));
    await go(p, "library"); out.push(await pg(p)); await dclick(p, `${W} [data-vdel]`); out.push(await pg(p)); await go(p, "settings");
    out.push(await download(p, `${W} [data-cexp]`));
    const backup = { remotionCalcData: 1, data: { hist: [{ id: 'x"><img src=x onerror="window.__pwned=1">', ts: 1, tool: "sci", expr: "1+1", res: "2" }], convFav: [{ c: "length", a: 'm"><b id=inj>', b: "km" }], rates: [{ a: "EUR", b: "USD", r: 1.1, d: "2026-10-01", s: "test", t: 1 }, { a: "<i id=inj2>GBP", b: "USD", r: 1.3, d: "2026-10-01", s: "test", t: 1 }], vars: { z: 3 } } };
    await p.setInputFiles(`${W} [data-cimp]`, { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) }); await p.waitForTimeout(700);
    out.push(await toastOf(p), await pg(p));
    const inj: boolean[] = [];
    await go(p, "hist"); await p.waitForTimeout(300); inj.push(await p.evaluate(() => !!(window as unknown as { __pwned?: number }).__pwned));
    await go(p, "cv_length"); inj.push(await p.evaluate(() => !!document.getElementById("inj")));
    await go(p, "cur"); await p.waitForTimeout(300); inj.push(await p.evaluate(() => !!document.getElementById("inj2")));
    out.push(inj);
    await go(p, "settings"); await p.setInputFiles(`${W} [data-cimp]`, { name: "other.json", mimeType: "application/json", buffer: Buffer.from('{"remotionCalc":1,"items":[]}') }); await p.waitForTimeout(600); out.push(await toastOf(p));
    await go(p, "settings"); await dclick(p, `${W} [data-creset]`); out.push(await dlg(p)); await p.click(`${W} .ca-dlg [data-y]`); await p.waitForTimeout(600); out.push(await main(p));
    out.push(await store(p));
    return out;
  });
  // D-E13 (approved fix): the crafted backup injects markup in the source, not in the port. Everything else is identical.
  const src = r.source as unknown[], rea = r.react as unknown[];
  const k = src.findIndex((x) => Array.isArray(x) && x.length === 3 && typeof x[0] === "boolean");
  expect(src[k]).toEqual([true, true, true]);
  expect(rea[k]).toEqual([false, false, false]);
  expect(rea.slice(0, k - 1)).toEqual(src.slice(0, k - 1));
  expect(rea.slice(k + 1)).toEqual(src.slice(k + 1));
});

test("language, narrow window (drawer, scrim, Escape), window resize and cross-tab sync", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCa(p); await go(p, "loan");
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1200); out.push(await ca(p), await p.getAttribute(W, "aria-label"), await p.evaluate(() => [...document.querySelectorAll('#dock [data-t="calcsci"]')].map((b) => b.getAttribute("title"))));
    await go(p, "std"); await p.click(`${W} [data-sk="1"]`); await p.click(`${W} [data-sk="."]`); await p.click(`${W} [data-sk="5"]`); await p.waitForTimeout(200); out.push(await tree(p, `${W} .ca-disp`));
    await p.click("#langBtn"); await p.click('[data-lang="ar"]'); await p.waitForTimeout(1200); out.push(await main(p), await p.getAttribute(`${W} .ca`, "dir"), await p.getAttribute(`${W} .ca`, "lang"));
    await p.click("#langBtn"); await p.click('[data-lang="en"]'); await p.waitForTimeout(1200);
    // Resize the window to a narrow width: the layout switches to the small size class (navigation in a drawer).
    const g = (await p.locator(`${W} .os-rz`).boundingBox())!; await p.mouse.move(g.x + 4, g.y + 4); await p.mouse.down(); await p.mouse.move(g.x - 760, g.y + 4, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(700);
    out.push(await p.getAttribute(`${W} .ca`, "data-sz"), await p.evaluate((W) => { const r = document.querySelector(W)!.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }, W));
    await p.click(`${W} .ca-menu`); await p.waitForTimeout(400); out.push(await tree(p, `${W} .ca-nav`), await tree(p, `${W} .ca-scrim`));
    await p.click(`${W} .ca-scrim`, { position: { x: 5, y: 300 } }).catch(() => {}); await p.waitForTimeout(400); out.push(await tree(p, `${W} .ca-scrim`));
    await p.click(`${W} [data-canav]`); await p.waitForTimeout(300); await p.keyboard.press("Escape"); await p.waitForTimeout(400); out.push(await tree(p, `${W} .ca-nav`));
    await p.click(`${W} [data-cahist]`); await p.waitForTimeout(400); out.push(await tree(p, `${W} .ca-scrim`)); await p.keyboard.press("Escape"); await p.waitForTimeout(400); out.push(await hist(p));
    // Another tab writes the calculator data: the open window reloads it and repaints the history (L22598).
    const other = await p.context().newPage(); await other.goto(p.url().startsWith("file:") ? p.url() : "/?shell=react"); await other.waitForTimeout(800);
    await other.evaluate(() => { const s = JSON.parse(localStorage.getItem("remotion-calc") || "{}"); s.hist = [{ id: "hx1", ts: 1, tool: "sci", expr: "40+2", res: "42" }, ...(s.hist || [])]; localStorage.setItem("remotion-calc", JSON.stringify(s)); });
    await p.waitForTimeout(600); await p.click(`${W} [data-cahist]`); await p.waitForTimeout(400); out.push(await hist(p));
    await other.close();
    await p.click(`${W} [data-wc="close"]`); await p.waitForTimeout(600);
    out.push(await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => (b as HTMLElement).dataset.t)), await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
