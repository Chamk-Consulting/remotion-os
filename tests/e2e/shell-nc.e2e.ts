/** Phase B slice 6 — notification centre, banners, account menu: dual-run parity (source file = oracle vs React shell). */
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
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
    const p = await ctx.newPage(); await open(p, url); out[k] = await fn(p); await ctx.close();
  }
  return out;
}
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
/** The whole notification centre as text + state attributes. */
const nc = (p: Page) => p.evaluate(() => {
  const q = (s: string) => document.querySelector(s); const nc = q("#nc")!;
  return {
    cls: nc.className.split(" ").sort().join(" "), title: q("#ncTitle")?.textContent, markAll: (q("#ncMarkAll") as HTMLButtonElement).disabled,
    pri: [...document.querySelectorAll("#ncPri [data-pri]")].map((b) => [b.getAttribute("data-pri"), b.getAttribute("aria-pressed"), b.textContent]),
    cats: [...document.querySelectorAll("#ncCats [data-cat]")].map((b) => [b.getAttribute("data-cat"), b.getAttribute("aria-pressed"), b.textContent]),
    rows: [...document.querySelectorAll("#ncScroll > *")].map((e) => [e.className.split(" ").filter((c) => c && c !== "out").sort().join(" "), e.getAttribute("data-id"), e.textContent?.replace(/\s+/g, "")]),
    detail: q("#ncDetail")?.textContent?.replace(/\s+/g, ""),
    set: [...document.querySelectorAll("#ncSet [data-ns]")].map((b) => [b.getAttribute("data-ns"), b.getAttribute("aria-checked")]), setCls: q("#ncSet")!.className,
    bell: [q("#bellBtn")!.className.split(" ").filter((c) => c !== "ring").sort().join(" "), q("#bellBtn")!.getAttribute("aria-expanded"), q("#bellBadge")!.textContent, q("#bellBadge")!.className.replace(/\s*bump/, "")],
    banners: [...document.querySelectorAll("#nbStack .nbn")].map((b) => b.textContent?.replace(/\s+/g, "")),
    pop: [...document.querySelectorAll(".nc-pop button")].map((b) => [b.className, b.textContent]),
    stored: localStorage.getItem("remotion-nc"),
  };
});
const acc = (p: Page) => p.evaluate(() => {
  const q = (s: string) => document.querySelector(s);
  return {
    open: !q("#accMenu")!.classList.contains("closed"), view: [...document.querySelectorAll<HTMLElement>("#accVp .kbm-view")].filter((v) => !v.hidden).map((v) => v.dataset.view).join(),
    rows: [...document.querySelectorAll<HTMLElement>("#accVp .kbm-view:not([hidden]) button, #accVp .kbm-view:not([hidden]) .info-row")].map((b) => [b.className.replace(/\s*\b(busy|swap)\b/g, ""), b.getAttribute("aria-checked"), b.getAttribute("aria-expanded"), b.textContent?.replace(/\s+/g, "")]),
    who: [q("#whoName")?.textContent, q("#whoRole")?.textContent, (q("#whoAv .st-dot") as HTMLElement)?.style.getPropertyValue("--sc")],
    stored: [localStorage.getItem("remotion-acc"), localStorage.getItem("remotion-units")],
  };
});

test("notification centre: open, rows, filters, search, keyboard, detail, close", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: Record<string, unknown> = { boot: await nc(p) };
    // The centre focuses its first row 120 ms after opening; under reduced motion the panel can still be visibility:hidden
    // in that frame when the machine is busy (transitions start on the next frame), in the source as in React, so the
    // focus result is timing-dependent and not compared here (the keyboard steps below cover focus handling).
    await p.click("#bellBtn"); await p.waitForTimeout(400); out.open = await nc(p);
    await p.click('#ncPri [data-pri="high"]'); await p.waitForTimeout(500); out.high = await nc(p);
    await p.click('#ncPri [data-pri="unread"]'); await p.waitForTimeout(500); out.unread = await nc(p);
    await p.click('#ncPri [data-pri="all"]'); await p.click('#ncCats [data-cat="cSystem"]'); await p.waitForTimeout(500); out.cat = await nc(p);
    await p.click('#ncCats [data-cat="all"]'); await p.click("#ncCatMore"); out.more = await p.locator("#ncCatsRow").getAttribute("class"); await p.click("#ncCatMore");
    await p.locator("#ncSearch").fill("invoice"); await p.waitForTimeout(500); out.search = await nc(p);
    await p.locator("#ncSearch").fill(""); await p.waitForTimeout(400);
    await p.locator('#ncScroll .ni[data-id="2"]').focus(); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
    out.keys = [await nc(p), await p.evaluate(() => document.activeElement?.getAttribute("data-id"))];
    await p.keyboard.press("Control+KeyF"); out.find = await p.evaluate(() => document.activeElement?.id);
    await p.click('#ncScroll .ni[data-id="1"]'); await p.waitForTimeout(400); out.sel = await nc(p);
    await p.click("#ncExpand"); out.wide = await p.locator("#ncExpand").getAttribute("aria-label");
    await p.click("#ndClose"); await p.waitForTimeout(300); out.closeDetail = await nc(p);
    await p.keyboard.press("Escape"); await p.waitForTimeout(200); out.esc = await nc(p);
    await p.click("#bellBtn"); await p.waitForTimeout(300); await p.mouse.click(600, 700); await p.waitForTimeout(200); out.outside = await nc(p);
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("notification centre: read, mark all + undo, item menu, snooze, delete + undo, clear read, primary actions", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: Record<string, unknown> = {};
    await p.click("#bellBtn"); await p.waitForTimeout(400);
    await p.click("#ncMarkAll"); await p.waitForTimeout(300); out.markAll = [await nc(p), await toast(p)];
    await p.locator("#toast button").dispatchEvent("click"); await p.waitForTimeout(300); out.undo = await nc(p);
    await p.click('#ncScroll [data-more="2"]'); await p.waitForTimeout(150); out.menu = await nc(p);
    await p.locator(".nc-pop button").first().click(); await p.waitForTimeout(400); out.read = await nc(p);
    await p.click('#ncScroll [data-more="3"]'); await p.locator(".nc-pop button", { hasText: /Snooze/ }).click(); await p.waitForTimeout(1100); out.snooze = [await nc(p), await toast(p)];
    await p.click('#ncScroll [data-more="1"]'); await p.locator(".nc-pop button.danger").click(); await p.waitForTimeout(1100); out.del = [await nc(p), await toast(p)];
    await p.locator("#toast button").dispatchEvent("click"); await p.waitForTimeout(400); out.delUndo = await nc(p);
    await p.click("#ncMore"); await p.waitForTimeout(150); out.more = await nc(p);
    await p.locator(".nc-pop button", { hasText: /Clear read/ }).click(); await p.waitForTimeout(900); out.clear = [await nc(p), await toast(p)];
    await p.click('#ncScroll [data-act="1"]'); await p.waitForTimeout(300); out.primary = [await nc(p), await toast(p)];
    await p.click('#ncScroll .ni[data-id="1"]'); await p.waitForTimeout(400); await p.click("#ndSecond"); await p.waitForTimeout(1100); out.second = [await nc(p), await toast(p)];
    await p.click("#ndView"); out.view = await toast(p);
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("notification settings, banners and the update install", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: Record<string, unknown> = {};
    await p.click("#bellBtn"); await p.waitForTimeout(400);
    await p.click('#ncSet [data-ns="dnd"]'); await p.waitForTimeout(300); out.dnd = [await nc(p), await toast(p), await acc(p)];
    await p.click('#ncSet [data-ns="dnd"]'); await p.waitForTimeout(300); out.dndOff = [await nc(p), await acc(p)];
    await p.click('#ncSet [data-ns="desk"]'); await p.click('#ncSet [data-ns="desk"]'); await p.waitForTimeout(300); out.banner = await nc(p);
    await p.locator("#nbStack .nbn").first().click(); await p.waitForTimeout(500); out.bannerOpen = await nc(p);
    await p.click("#nsHead"); out.collapsed = (await nc(p)).setCls; await p.click("#nsHead");
    await p.click("#nsMore"); out.moreNc = await toast(p);
    await p.click('#ncScroll .ni[data-id="7"]'); await p.waitForTimeout(400); await p.click("#ndPrimary"); await p.waitForTimeout(300);
    out.installing = await p.evaluate(() => [...document.querySelectorAll(".busy")].map((b) => b.getAttribute("data-busy")));
    await p.waitForTimeout(2600); out.installed = [await nc(p), await toast(p)];
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("account menu: status, profile, profiles, accounts, units, links", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: Record<string, unknown> = { boot: await acc(p) };
    await p.click("#accBtn"); await p.waitForTimeout(400); out.open = [await acc(p), await p.evaluate(() => document.activeElement?.id)];
    await p.click("#accStBtn"); await p.waitForTimeout(300); out.stList = await acc(p);
    await p.click('#accMenu [data-st="busy"]'); await p.waitForTimeout(500); out.busy = [await acc(p), await toast(p)];
    await p.click('#accMenu .kbm-item[data-go="profile"]'); await p.waitForTimeout(700); out.profile = await acc(p);
    await p.click('#accMenu .kbm-view:not([hidden]) [data-go="main"]'); await p.waitForTimeout(700);
    await p.click('#accMenu .kbm-item[data-go="profiles"]'); await p.waitForTimeout(700); out.profiles = await acc(p);
    await p.click('#accMenu [data-prof="therapist"]'); await p.waitForTimeout(900); out.therapist = [await acc(p), await toast(p)];
    await p.click('#accMenu .kbm-item[data-go="accounts"]'); await p.waitForTimeout(700); out.accounts = await acc(p);
    await p.click('#accMenu [data-acc="clinic"]'); await p.waitForTimeout(900); out.clinic = [await acc(p), await toast(p)];
    await p.click('#accMenu .kbm-item[data-go="units"]'); await p.waitForTimeout(700); out.units = await acc(p);
    await p.click('#accMenu [data-usite="lyo"]'); await p.waitForTimeout(200); out.site = await acc(p);
    await p.click('#accMenu [data-udept="lyo|peds"]'); await p.waitForTimeout(1300); out.dept = [await acc(p), await toast(p)];
    await p.click('#accMenu [data-act="security"]'); out.security = await toast(p);
    await p.click('#accMenu [data-act="appearance"]'); await p.waitForTimeout(800);
    out.appearance = [await acc(p), await p.evaluate(() => [!document.getElementById("sysMenu")!.classList.contains("closed"), [...document.querySelectorAll<HTMLElement>("#sysVp .kbm-view")].filter((v) => !v.hidden).map((v) => v.dataset.view).join()])];
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.click("#accBtn"); await p.waitForTimeout(300); await p.click('#accMenu [data-act="notif"]'); await p.waitForTimeout(400); out.notif = [await acc(p), (await nc(p)).cls];
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.click("#accBtn"); await p.waitForTimeout(300); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); out.kb = await p.evaluate(() => document.activeElement?.textContent?.trim());
    await p.keyboard.press("Escape"); await p.waitForTimeout(200); out.closed = [await acc(p), await p.evaluate(() => document.activeElement?.id)];
    await p.click("#accBtn"); await p.waitForTimeout(300); await p.click("#accStBtn"); await p.click('#accMenu [data-st="dnd"]'); await p.waitForTimeout(500);
    out.dndSync = [await acc(p), (await nc(p)).bell, (await nc(p)).stored];
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("bridged app notifications reach the shell notification centre (React shell + legacy bridge)", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
  const p = await ctx.newPage(); await open(p, "/?shell=react");
  await p.locator('#dkLayer .dk-ic[title="Patients"]').last().dblclick();
  const f = p.frameLocator('iframe[data-bridge="patients"]'); await f.locator("body.os-appmode").waitFor(); await p.waitForTimeout(800);
  const frame = p.frames().find((x) => x.url().includes("/legacy/"))!;
  const ok = await frame.evaluate(() => (window as unknown as { eval: (s: string) => unknown }).eval('rmNotify("rmPat","Bridge test","From the Patients app")'));
  await p.waitForTimeout(300);
  const banner = await p.locator("#nbStack .nbn").first().textContent();
  await p.click("#bellBtn"); await p.waitForTimeout(400);
  const first = await p.locator("#ncScroll .ni").first().textContent();
  expect([ok !== false, banner?.includes("Bridge test"), first?.includes("Bridge test")]).toEqual([true, true, true]);
  await ctx.close();
});
