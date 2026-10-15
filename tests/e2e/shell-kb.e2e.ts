/** Phase B slice 7 — on-screen keyboard and keyboard menu: dual-run parity (source file:// vs React shell). */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

const SRC = "file://" + path.resolve("../source/Remotion_Desktop.html");
async function open(page: Page, url: string, seed?: Record<string, string>) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
  await page.clock.setFixedTime(new Date("2026-10-14T19:08:00+01:00"));
  await page.addInitScript((seed) => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); sessionStorage.setItem("__s", "1"); for (const [k, v] of Object.entries(seed || {})) localStorage.setItem(k, v); } } catch {} }, seed);
  await page.goto(url); await page.locator("#dkLayer .dk-ic").first().waitFor(); await page.waitForTimeout(700);
}
async function both(browser: Browser, baseURL: string | undefined, fn: (p: Page) => Promise<unknown>, seed?: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); await open(p, url, seed); out[k] = await fn(p); await ctx.close();
  }
  return out;
}
const act = (p: Page) => p.evaluate(() => { const a = document.activeElement; return a?.closest("#kbMenu,#kb,#palette,.widgets") ? (a.id || a.textContent?.trim()) : a?.tagName; });
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
/** Whole keyboard state: section classes / custom properties, every key (classes, label HTML, aria), suggestions, button, lift. */
const kb = (p: Page) => p.evaluate(() => {
  const c = (e: Element) => [...e.classList].sort().join(" "); const k = document.getElementById("kb")!;
  return {
    cls: c(k), kz: k.style.getPropertyValue("--kz"), ka: k.style.getPropertyValue("--ka"), theme: k.dataset.kbtheme ?? null, left: k.style.left, top: k.style.top,
    rows: [...document.querySelectorAll("#kbKeys .kb-row")].map((r) => (r as HTMLElement).style.getPropertyValue("--r") + ":" + r.querySelectorAll(".key").length),
    keys: [...document.querySelectorAll<HTMLElement>("#kbKeys .key")].map((e) => [c(e), e.dataset.i, e.dataset.code ?? "", e.style.getPropertyValue("--w"), e.style.getPropertyValue("--c"), e.innerHTML, e.getAttribute("aria-label"), e.getAttribute("aria-pressed")].join("|")),
    sugg: [...document.querySelectorAll<HTMLElement>("#kbSugg button")].map((b) => [b.className, b.dataset.s, b.textContent, b.getAttribute("role"), b.getAttribute("dir")].join("|")),
    btn: c(document.getElementById("kbBtn")!), exp: document.getElementById("kbBtn")!.getAttribute("aria-expanded"),
    pad: [c(document.getElementById("kbPad")!), document.getElementById("kbPad")!.getAttribute("aria-pressed")].join("|"), float: c(document.getElementById("kbFloat")!),
  };
});
const brief = async (p: Page) => { const s = await kb(p); return { ...s, keys: s.keys.length }; };
/**
 * `.main` lift: liftForTarget measures the field while `.main` may still be moving (transition .6s, not disabled by
 * reduced motion), so right after opening / resizing the result depends on frame timing in the source too (D-A31).
 * It is compared only from a settled state: wait, then focus the field again (focusin → next-frame lift).
 */
const liftNow = async (p: Page, sel: string) => { await p.waitForTimeout(900); await p.focus("#kbBtn"); await p.focus(sel); await p.waitForTimeout(900); return p.evaluate(() => (document.querySelector(".main") as HTMLElement).style.transform); };
const field = (p: Page) => p.evaluate(() => { const a = document.activeElement as HTMLInputElement; return [a?.id || a?.tagName, a?.value, a?.selectionStart, a?.selectionEnd, a?.inputMode].join("|"); });
const kbmRows = (p: Page) => p.evaluate(() => [...document.querySelectorAll<HTMLElement>("#kbmVp .kbm-view:not([hidden]) > *")].map((e) => [e.tagName, [...e.classList].sort().join(" "), e.getAttribute("role"), e.getAttribute("aria-checked") ?? e.getAttribute("aria-pressed"), e.textContent?.replace(/\s+/g, "").trim(), [...e.attributes].filter((a) => a.name.startsWith("data-")).map((a) => a.name + "=" + a.value).join(" "),
  [...e.querySelectorAll("select,input,output,.thumb-ind,[aria-pressed]")].map((x) => (x as HTMLSelectElement).value ?? "" + "/" + ((x as HTMLElement).getAttribute("style") ?? "").replace(/[\s;]/g, "") + "/" + (x.getAttribute("aria-pressed") ?? "") + "/" + x.textContent).join(";"),
  e.tagName === "DIV" ? [...e.querySelectorAll("option")].map((o) => o.value + (o.selected ? "*" : "")).join(",") : ""].join("|")));
const notes = (p: Page) => p.evaluate(() => [...document.querySelectorAll(".notes li")].slice(0, 2).map((l) => l.className + ":" + l.querySelector("b")?.textContent + ":" + l.querySelector("p")?.textContent));
const key = (p: Page, code: string) => p.click(`#kbKeys [data-code="${code}"]`);
const typeKeys = async (p: Page, s: string) => { for (const ch of s) await key(p, ch === " " ? "Space" : "Key" + ch.toUpperCase()); };

test("keyboard menu: button, rows of every view, keyboard navigation, outside click and Escape", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [await brief(p)];
    await p.click("#kbBtn"); await p.waitForTimeout(300);
    out.push(await kbmRows(p), await brief(p), await act(p), await p.evaluate(() => { const m = document.getElementById("kbMenu")!; return [m.className, m.style.left, m.style.top, m.style.getPropertyValue("--cx")]; }));
    for (const v of ["settings", "lang", "layout"]) { await p.click(`#kbMenu [data-go="${v}"]`); await p.waitForTimeout(500); out.push(v, await kbmRows(p)); await p.click('#kbMenu .kbm-view:not([hidden]) [data-go="main"]'); await p.waitForTimeout(500); }
    await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown");
    out.push(await act(p), await kbmRows(p));
    await p.keyboard.press("ArrowRight"); await p.waitForTimeout(500); out.push(await kbmRows(p), await act(p));
    await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(500); out.push((await kbmRows(p)).length);
    await p.keyboard.press("Escape"); await p.waitForTimeout(200); out.push(await brief(p));
    await p.click("#kbBtn"); await p.waitForTimeout(200); await p.mouse.click(700, 500); await p.waitForTimeout(200); out.push(await brief(p));
    await p.click("#kbBtn"); await p.waitForTimeout(200); await p.click("#sysBtn"); await p.waitForTimeout(200); out.push(await brief(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("on-screen keyboard: open from the menu, note composer target, typing, auto-capitals, suggestions, Enter adds the note", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    // Wait for the menu's own 60 ms "focus the toggle" timer first: clicking inside that window is a race in both builds.
    await p.click("#kbBtn"); await p.waitForTimeout(300); await p.click('#kbMenu [data-act="toggle"]'); await p.waitForTimeout(400);
    out.push(await kb(p), await field(p), await p.evaluate(() => document.getElementById("noteForm")!.hidden), await liftNow(p, "#noteInput"));
    await typeKeys(p, "pat"); out.push(await kb(p), await field(p));
    await p.click("#kbSugg button >> nth=0"); out.push(await brief(p), await field(p));
    await typeKeys(p, "done "); await key(p, "Space"); out.push(await brief(p), await field(p));
    await key(p, "ShiftLeft"); await key(p, "KeyX"); await key(p, "Backspace"); await key(p, "Backspace"); out.push(await brief(p), await field(p));
    await key(p, "CapsLock"); await typeKeys(p, "ab"); out.push(await kb(p), await field(p)); await key(p, "CapsLock");
    await key(p, "ArrowLeft"); await key(p, "ArrowLeft"); await key(p, "Digit1"); out.push(await field(p));
    await p.click('#kbKeys .k-fn'); await key(p, "Digit2"); out.push(await field(p), await brief(p));
    await key(p, "Enter"); await p.waitForTimeout(200); out.push(await notes(p), await toast(p), await field(p), await brief(p));
    await key(p, "Escape"); await p.waitForTimeout(200); out.push(await brief(p), await field(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("keyboard settings: switches, size / transparency ranges, theme, position, persisted settings", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.click("#kbBtn"); await p.click('#kbMenu [data-go="settings"]'); await p.waitForTimeout(500);
    for (const k of ["hints", "sound", "autoHide", "sugg", "autoCap", "dbl"]) { await p.click(`#kbMenu [data-set="${k}"]`); out.push(k, await brief(p)); }
    out.push(await kbmRows(p), await p.evaluate(() => localStorage.getItem("remotion-kb")));
    await p.locator("#rng-zoom").fill("110"); await p.waitForTimeout(100); out.push(await brief(p), await kbmRows(p));
    await p.locator("#rng-alpha").fill("60"); await p.waitForTimeout(100); out.push(await brief(p));
    await p.click('#kbMenu [data-kbtheme="dark"]'); await p.waitForTimeout(200); out.push(await brief(p), await kbmRows(p));
    await p.click('#kbMenu [data-pos="float"]'); await p.waitForTimeout(300); out.push(await brief(p), await toast(p), await kbmRows(p));
    await p.click('#kbMenu [data-pos="full"]'); await p.waitForTimeout(300); out.push(await brief(p), await toast(p));
    await p.click('#kbMenu [data-pos="dock"]'); await p.waitForTimeout(300); out.push(await brief(p), await toast(p), await p.evaluate(() => localStorage.getItem("remotion-kb")));
    await p.click('#kbMenu [data-set="sugg"]'); await p.click("#kbFloat"); await p.waitForTimeout(300); out.push(await brief(p), await toast(p));
    await p.click("#kbFloat"); await p.waitForTimeout(300); out.push(await brief(p), await toast(p));
    await p.reload(); await p.locator("#dkLayer .dk-ic").first().waitFor(); await p.waitForTimeout(700); out.push(await brief(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("input language and layout: views, toasts, keys, number pad, stale settings select, active layout select", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.click("#kbBtn"); await p.click('#kbMenu [data-go="lang"]'); await p.waitForTimeout(500);
    await p.click('#kbMenu [data-in="fr"]'); await p.waitForTimeout(300); out.push(await toast(p), await kbmRows(p), await kb(p));
    await p.click('#kbMenu .kbm-view:not([hidden]) [data-go="main"]'); await p.waitForTimeout(500); out.push(await kbmRows(p));
    await p.click('#kbMenu [data-go="settings"]'); await p.waitForTimeout(500); out.push(await kbmRows(p));
    await p.click('#kbMenu .kbm-view:not([hidden]) [data-go="main"]'); await p.waitForTimeout(500);
    await p.click('#kbMenu [data-go="layout"]'); await p.waitForTimeout(500);
    await p.click('#kbMenu [data-layout="qwertz"]'); await p.waitForTimeout(300); out.push(await kbmRows(p), await brief(p), await toast(p));
    await p.click('#kbMenu [data-layout="pad"]'); await p.waitForTimeout(300); out.push(await kbmRows(p), await kb(p));
    await p.click('#kbMenu .kbm-view:not([hidden]) [data-go="main"]'); await p.waitForTimeout(500); out.push(await kbmRows(p));
    await p.click('#kbMenu [data-go="settings"]'); await p.waitForTimeout(500);
    await p.locator("#kbLayoutSel").selectOption("de"); await p.waitForTimeout(300); out.push(await kbmRows(p), await brief(p), await p.evaluate(() => localStorage.getItem("remotion-kb")));
    await p.locator("#kbLayoutSel").selectOption("follow"); await p.waitForTimeout(300); out.push(await brief(p));
    await p.click("#kbBtn"); await p.click("#kbPad"); await p.waitForTimeout(200); out.push(await brief(p));
    await p.click("#kbKeys .key >> nth=16"); await p.waitForTimeout(200); out.push(await brief(p));
    await p.click("#kbPad"); await p.waitForTimeout(200); out.push(await brief(p));
    await p.click('#kbKeys .key[data-code="AltLeft"]'); await p.click('#kbKeys .key[data-code="ShiftLeft"]'); await p.waitForTimeout(200); out.push(await toast(p), await brief(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("keyboard follows the app language; Ctrl+Shift+K; physical keys mirror; palette field; stale menu label", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.keyboard.press("Control+Shift+K"); await p.waitForTimeout(300); out.push(await brief(p), await field(p));
    await p.click("#kbBtn"); await p.waitForTimeout(200); out.push((await kbmRows(p))[1]);
    await p.keyboard.press("Control+Shift+K"); await p.waitForTimeout(200); out.push(await brief(p), (await kbmRows(p))[1]);
    await p.keyboard.press("Escape"); await p.keyboard.press("Control+Shift+K"); await p.waitForTimeout(200);
    await p.click("#langBtn"); await p.click('#langMenu [data-lang="de"]'); await p.waitForTimeout(500); out.push(await kb(p));
    await p.click("#kbBtn"); await p.waitForTimeout(200); out.push(await kbmRows(p)); await p.click("#kbBtn");
    await p.focus("#noteInput").catch(() => {}); await p.keyboard.down("KeyQ"); out.push((await kb(p)).keys.filter((k) => k.includes("pressed")));
    await p.keyboard.up("KeyQ"); await p.waitForTimeout(150); out.push((await kb(p)).keys.filter((k) => k.includes("pressed")));
    // The palette focuses its input 30 ms after opening; under reduced motion the source's input may still be
    // visibility:hidden then (frame timing, transitions forced to .01ms), so the test focuses it explicitly.
    await p.click("#searchBtn"); await p.waitForTimeout(300); await p.focus("#palInput"); out.push(await field(p));
    await typeKeys(p, "ka"); await p.waitForTimeout(150); out.push(await field(p), await p.evaluate(() => [...document.querySelectorAll("#palList > *")].slice(0, 3).map((e) => e.textContent?.replace(/\s+/g, " ").trim())));
    await key(p, "Escape"); await p.waitForTimeout(150); out.push(await brief(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("stored input language with an automatic layout keeps QWERTY after reload (D-A30 reproduced)", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.keyboard.press("Control+Shift+K"); await p.waitForTimeout(300);
    return [await kb(p), await p.evaluate(() => document.querySelector("#kbKeys .lay")?.textContent), await liftNow(p, "#noteInput")];
  }, { "remotion-kb": JSON.stringify({ set: { preview: false, size: 3, zoom: 90 }, lang: "fr", follow: false, layout: "qwerty", auto: true }) });
  expect(r.react).toEqual(r.source);
});

test("the keyboard types into a field of an app window (bridged iframe in the React shell)", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.click('#dock [data-t="files"]'); await p.waitForTimeout(1500);
    const bridged = await p.locator('iframe[data-bridge="files"]').count();
    const scope = bridged ? p.frameLocator('iframe[data-bridge="files"]').locator(".os-win") : p.locator('.os-win[data-osw="files"]');
    const q = scope.locator('input[type="search"]').first();
    await q.click(); await p.click("#kbBtn"); await p.waitForTimeout(300); await p.click('#kbMenu [data-act="toggle"]'); await p.waitForTimeout(400);
    await typeKeys(p, "inv"); await key(p, "Backspace"); await p.waitForTimeout(200);
    return [await q.inputValue(), await q.evaluate((e: HTMLInputElement) => [e.selectionStart, e.inputMode, e.ownerDocument.activeElement === e]), await brief(p)];
  });
  expect(((r.source as unknown[])[0] as string).length).toBe(2);
  expect(r.react).toEqual(r.source);
});
