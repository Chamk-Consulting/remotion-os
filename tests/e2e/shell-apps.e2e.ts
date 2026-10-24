/** Phase B slice 10 — Launcher, Files, Terminal and ghost drags: dual-run parity (source file:// vs React shell). */
/* Buttons named by v94 a11yName (data-an) get their label on a 250 ms debounce in both versions: that label is
   compared by catchup-s7-a11y, not in these trees. */
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
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); await open(p, url); out[k] = norm(await fn(p)); await ctx.close();
  }
  if (process.env.DUMP) { const fs = await import("node:fs"); for (const k in out) fs.writeFileSync(`/tmp/claude-0/dump-${process.env.DUMP}-${test.info().title.slice(0, 6)}-${k}.json`, JSON.stringify(out[k], (_, v) => (typeof v === "string" && v.startsWith("{") ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v), 1)); }
  return out;
}
/** Generated ids (dkId: "i" + time + random) differ between runs: numbered in order of appearance. */
function norm(v: unknown) { const map = new Map<string, string>(); return JSON.parse(JSON.stringify(v).replace(/(\\"_id\\":\\")d[0-9a-z]{1,8}/g, "$1D").replace(/\bi[0-9a-z]{9,13}\b/g, (m) => { if (!map.has(m)) map.set(m, "ID" + map.size); return map.get(m)!; })); }
/** Serialised subtree: tag, sorted classes, identity / state attributes, normalised inline style, value, own text. */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => ["id", "role", "hidden", "disabled", "type", "dir", "placeholder", "tabindex", "title"].includes(n) || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (e.tagName === "svg") return ["svg" + (e.getAttribute("class") ? "." + e.getAttribute("class") : "")];
    const attrs = [...e.attributes].filter((a) => keep(a.name) && !(e.hasAttribute("data-an") && (a.name === "aria-label" || a.name === "data-an"))).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + el.value : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const body = (p: Page, k: string) => tree(p, `.os-win[data-osw="${k}"] .os-wb`);
const store = (p: Page) => p.evaluate(() => Object.fromEntries(["remotion-apps", "remotion-desks", "remotion-fs", "remotion-trash"].map((k) => [k, localStorage.getItem(k)])));
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
const menu = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.os-menu[data-level="0"] > *')].map((e) => (e.textContent || "").replace(/\s+/g, " ").trim() + (e.hasAttribute("disabled") ? " [x]" : "")));
const icons = (p: Page) => p.evaluate(() => [...document.querySelectorAll("#dkLayer .dk-ic")].map((e) => e.getAttribute("title")));
const pick = async (p: Page, label: string) => { await p.locator('.os-menu[data-level="0"] button', { hasText: label }).first().click(); await p.waitForTimeout(150); };

test("launcher: open, views, search, sort, list, favourites, install, context menu, add to desktop, uninstall", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(500); out.push(await tree(p, '.os-win[data-osw="apps"]'));
    for (const v of ["fav", "recent", "installed", "free", "catHealth"]) { await p.click(`.al [data-alnav="${v}"]`); out.push(v, await body(p, "apps")); }
    await p.click('.al [data-alnav="all"]'); await p.fill(".al .al-search input", "ca"); out.push(await body(p, "apps"));
    await p.fill(".al .al-search input", ""); await p.click(".al .al-sort"); out.push(await menu(p)); await pick(p, "Category"); out.push(await body(p, "apps"));
    await p.click('.al [data-alv="list"]'); out.push(await body(p, "apps")); await p.click('.al [data-alv="grid"]');
    await p.click('.al [data-star="calendar"]'); await p.click('.al [data-alnav="fav"]'); out.push(await body(p, "apps"), await store(p));
    await p.click('.al [data-star="files"]'); await p.waitForTimeout(400); out.push(await body(p, "apps"));
    await p.click('.al [data-alnav="free"]'); await p.click('.al .al-card[data-app="terminal"]'); out.push(await body(p, "apps")); await p.waitForTimeout(300); out.push(await body(p, "apps"), await toast(p), await store(p));
    await p.click('.al [data-alnav="all"]'); await p.click('.al .al-card[data-app="notes"]', { button: "right" }); out.push(await menu(p)); await pick(p, "Add to desktop"); out.push(await icons(p), await toast(p));
    await p.click('.al .al-card[data-app="billing"]', { button: "right" }); out.push(await menu(p)); await p.keyboard.press("Escape"); await p.click('.al .al-card[data-app="analytics"]', { button: "right" }); await pick(p, "Uninstall"); out.push(await body(p, "apps"), await toast(p));
    await p.click('.al .al-card[data-app="notes"]'); await p.waitForTimeout(200); out.push(await toast(p), await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("terminal: commands, folders, history, completion, files and trash effects", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.click('#dock [data-t="terminal"]'); await p.waitForTimeout(500); out.push(await body(p, "terminal"));
    const run = async (c: string) => { await p.fill(".tm .tm-in", c); await p.press(".tm .tm-in", "Enter"); };
    for (const c of ["help", "ls", "pwd", "whoami", "echo hello <b>", "mkdir Lab", "cd Lab", "touch notes.txt", "ls", "pwd", "cd ..", "cd Documents", "ls", "mkdir Scans", "cd ..", "cd nowhere", "bogus", "rm Lab"]) await run(c);
    out.push(await body(p, "terminal"), await icons(p), await store(p), await toast(p));
    await p.press(".tm .tm-in", "ArrowUp"); await p.press(".tm .tm-in", "ArrowUp"); out.push(await p.inputValue(".tm .tm-in"));
    await p.fill(".tm .tm-in", "cd Doc"); await p.press(".tm .tm-in", "Tab"); out.push(await p.inputValue(".tm .tm-in"));
    await run("clear"); out.push(await body(p, "terminal"));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("files: places, sorting, views, selection, detail, rename, new folder, copy / paste, delete + undo, trash, tags, search, history, keyboard", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.click('#dock [data-t="files"]'); await p.waitForTimeout(500); out.push(await tree(p, '.os-win[data-osw="files"]'));
    await p.click('.fm [data-fmroot="documents"]'); await p.waitForTimeout(200); out.push(await body(p, "files"));
    await p.click('.fm [data-fmsort="size"]'); await p.click('.fm [data-fmsort="size"]'); out.push(await tree(p, ".fm-table"));
    await p.click('.fm [data-fmt="grid"]'); out.push(await tree(p, ".fm-table")); await p.click('.fm [data-fmt="list"]');
    const rows = p.locator(".fm .fm-row"); await rows.nth(0).click(); out.push(await tree(p, ".fm-det"));
    await rows.nth(2).click({ modifiers: ["Shift"] }); out.push(await tree(p, ".fm-rows"));
    await rows.nth(1).click(); await p.keyboard.press("F2"); await p.keyboard.type("Renamed.pdf"); await p.keyboard.press("Enter"); await p.waitForTimeout(100); out.push(await tree(p, ".fm-rows"), await store(p));
    await p.click('.fm [data-fmt="more"]'); out.push(await menu(p)); await pick(p, "New folder"); await p.waitForTimeout(200); await p.keyboard.type("Archive"); await p.keyboard.press("Enter"); await p.waitForTimeout(100); out.push(await tree(p, ".fm-rows"));
    await rows.nth(3).click(); await p.keyboard.press("Control+c"); out.push(await toast(p)); await p.dblclick('.fm .fm-row:has-text("Archive")'); await p.waitForTimeout(200); await p.focus(".fm .fm-table"); await p.keyboard.press("Control+v"); await p.waitForTimeout(150); out.push(await body(p, "files"), await toast(p));
    await p.focus(".fm .fm-table"); await p.keyboard.press("Backspace"); await p.waitForTimeout(150); await rows.nth(4).click(); await p.keyboard.press("Delete"); await p.waitForTimeout(150); out.push(await body(p, "files"), await toast(p));
    await p.locator("#toast button").click().catch(() => {}); await p.waitForTimeout(200); out.push(await tree(p, ".fm-rows"), await store(p));
    await rows.nth(0).click(); await p.fill(".fm .fm-tagin", "urgent"); await p.press(".fm .fm-tagin", "Enter"); out.push(await tree(p, ".fm-det"));
    await p.click('.fm [data-untag="urgent"]'); out.push(await tree(p, ".fm-det"));
    await rows.nth(0).click(); await p.keyboard.press("Delete"); await p.click('.fm [data-fmroot="trash"]'); await p.waitForTimeout(200); out.push(await body(p, "files"));
    await p.locator(".fm .fm-row").first().click({ button: "right" }); out.push(await menu(p)); await pick(p, "Restore"); out.push(await body(p, "files"), await toast(p), await store(p));
    await p.click('.fm [data-fmroot="home"]'); await p.fill(".fm .fm-search input", "re"); await p.waitForTimeout(100); out.push(await body(p, "files"));
    await p.click('.fm [data-fmt="back"]'); await p.waitForTimeout(150); out.push(await tree(p, ".fm-tb")); await p.click('.fm [data-fmt="fwd"]'); await p.waitForTimeout(150); out.push(await tree(p, ".fm-tb"));
    await p.click('.fm [data-fmroot="desktop"]'); await p.waitForTimeout(150); await p.locator(".fm .fm-row").first().click(); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); out.push(await tree(p, ".fm-content"));
    await p.keyboard.press("Control+d"); await p.waitForTimeout(150); out.push(await body(p, "files"), await icons(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("get info from a desktop icon opens Files on it; folder in a Files root; ghost drags from dock, launcher and Files", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.locator('#dkLayer .dk-ic[title="Rapport.pdf"]').click({ button: "right" }); await pick(p, "Get info"); await p.waitForTimeout(400); out.push(await body(p, "files"));
    const drag = async (from: string, x: number, y: number) => { const b = (await p.locator(from).first().boundingBox())!; await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(b.x + 30, b.y + 30, { steps: 3 }); await p.mouse.move(x, y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250); };
    await drag('#dock [data-t="browser"]', 700, 560); out.push(await icons(p), await toast(p));
    await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(400); await drag('.al .al-card[data-app="photos"]', 640, 700); out.push(await icons(p), await toast(p));
    await p.click('#dock [data-t="files"]'); await p.waitForTimeout(300); await p.click('.fm [data-fmroot="documents"]'); await p.waitForTimeout(200);
    await drag(".fm .fm-row", 560, 760); out.push(await icons(p), await body(p, "files"), await store(p));
    await drag(".fm .fm-row", 0, 0); await p.waitForTimeout(400); out.push(await body(p, "files"));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
