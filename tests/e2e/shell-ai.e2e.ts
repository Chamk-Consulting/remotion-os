/** Phase B slice 11 — Remotion AI panel, OS file drop: dual-run parity (source file:// vs React shell). */
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
    const attrs = [...e.attributes].filter((a) => keep(a.name)).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + el.value : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const store = (p: Page) => p.evaluate(() => Object.fromEntries(["remotion-apps", "remotion-desks", "remotion-fs", "remotion-trash"].map((k) => [k, localStorage.getItem(k)])));
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
const menu = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.os-menu[data-level="0"] > *')].map((e) => (e.textContent || "").replace(/\s+/g, " ").trim() + (e.hasAttribute("disabled") ? " [x]" : "")));
const icons = (p: Page) => p.evaluate(() => [...document.querySelectorAll("#dkLayer .dk-ic")].map((e) => e.getAttribute("title")));
const aiStore = (p: Page) => p.evaluate(() => localStorage.getItem("remotion-ai"));
const aiBtn = (p: Page) => p.evaluate(() => { const b = document.getElementById("aiBtn")!; return [b.className, b.getAttribute("aria-expanded")]; });
const pop = (p: Page) => p.evaluate(() => [...document.querySelectorAll(".ai-pop > *")].map((e) => (e.textContent || "").trim() + (e.getAttribute("aria-checked") ? " " + e.getAttribute("aria-checked") : "")));
const ai = (p: Page) => tree(p, "#ai");
const openAi = async (p: Page) => { await p.click("#aiBtn"); await p.waitForTimeout(700); };

test("panel: open, history, search, filter, conversations, header, chips, popovers, close", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await openAi(p); out.push(await ai(p), await aiBtn(p), await p.evaluate(() => document.activeElement?.id));
    for (const c of ["sum", "data", "err"]) { await p.click(`#aiHist [data-conv="${c}"]`); await p.waitForTimeout(400); out.push(c, await tree(p, "#aiHead"), await tree(p, "#aiThread")); }
    await p.fill("#aiSearch", "pla"); out.push(await tree(p, "#aiHist")); await p.fill("#aiSearch", "zzz"); out.push(await tree(p, "#aiHist")); await p.fill("#aiSearch", "");
    // D-B25 (reproduced): every AI popover is closed by the panel's own click listener in the click that opens it.
    await p.click("#aiFilterBtn"); out.push(await pop(p), await p.getAttribute("#aiFilterBtn", "aria-pressed"));
    await p.click('#aiChips [data-chip="ws"]'); out.push(await p.getAttribute('#aiChips [data-chip="ws"]', "aria-pressed"));
    await p.click('#aiChips [data-chip="sum"]'); out.push(await p.inputValue("#aiInput"));
    await p.click('#aiChips [data-chip="create"]'); out.push(await pop(p)); await p.click('#aiChips [data-chip="more"]'); out.push(await pop(p));
    await p.click('#aiChips [data-chip="search"]'); out.push(await p.inputValue("#aiInput"));
    await p.click('#aiHead [data-aia="max"]'); out.push(await p.getAttribute("#ai", "class"), await tree(p, "#aiHead .ai-hb"));
    await p.click('#aiHead [data-aia="more"]'); out.push(await pop(p)); await p.click('#aiHead [data-aia="max"]'); out.push(await tree(p, "#aiHead .ai-hb"));
    await p.focus("#aiInput"); await p.keyboard.press("Control+k"); out.push(await p.evaluate(() => document.activeElement?.id), await p.getAttribute("#ai", "class"));
    await p.focus("#aiInput"); await p.keyboard.press("Escape"); await p.waitForTimeout(400); out.push(await p.getAttribute("#ai", "class"), await p.evaluate(() => document.getElementById("ai")!.hidden), await aiBtn(p));
    await p.click("#aiBtn"); await p.waitForTimeout(600); await p.click("#aiBtn"); await p.waitForTimeout(400); out.push(await p.evaluate(() => document.getElementById("ai")!.hidden));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("new chat, ask without a live model, attachments, prep demo, quick replies", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await openAi(p);
    await p.click("#aiNewBtn"); await p.waitForTimeout(400); out.push(await tree(p, "#aiThread"), await tree(p, "#aiHead"), await tree(p, "#aiHist"));
    await p.fill("#aiInput", "What is on my agenda?"); await p.press("#aiInput", "Enter"); await p.waitForTimeout(400);
    out.push(await tree(p, "#aiThread"), await tree(p, "#aiHist"), await aiStore(p), await p.getAttribute("#ai", "class"));
    await p.setInputFiles("#aiFile", [{ name: "notes.md", mimeType: "text/markdown", buffer: Buffer.from("# Notes\n- one") }, { name: "scan.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) }]);
    await p.waitForTimeout(200); out.push(await tree(p, "#aiAttach"), await toast(p));
    await p.click('#aiAttach [data-rmatt="1"]'); out.push(await tree(p, "#aiAttach"));
    await p.press("#aiInput", "Enter"); await p.waitForTimeout(400); out.push(await tree(p, "#aiThread"), await aiStore(p));
    await p.click("#aiNewBtn"); await p.waitForTimeout(300); await p.click('#aiThread [data-sugg="prep"]'); await p.waitForTimeout(1500);
    out.push(await tree(p, "#aiThread"), await tree(p, "#aiCtx"), await p.getAttribute("#aiInput", "placeholder"), await p.getAttribute("#ai", "class"));
    await p.click('#aiThread [data-aix="moreSum"]'); out.push(await tree(p, '#aiThread [data-aix="moreSum"]'));
    await p.click('#aiThread [data-aix="good"]'); await p.click('#aiThread [data-aix="cal"]'); out.push(await toast(p));
    await p.locator("#aiThread .ai-task").first().click(); out.push(await tree(p, "#aiThread .ai-card:nth-child(3)"));
    await p.click('#aiCtx [data-qr="pmail"]'); await p.waitForTimeout(300); out.push(await tree(p, "#aiThread"));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("form demo: card, smart edits, side panel steps, original, validation, language switch", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await openAi(p);
    await p.click("#aiNewBtn"); await p.waitForTimeout(300); await p.click('#aiThread [data-sugg="form"]'); await p.waitForTimeout(2500);
    out.push(await tree(p, "#aiThread"), await tree(p, "#aiCtx"), await tree(p, "#aiHist"), await aiStore(p));
    await p.fill("#aiInput", "poids 72 kg, taille 178 cm"); await p.press("#aiInput", "Enter"); await p.waitForTimeout(400);
    out.push(await tree(p, "#aiThread"), await tree(p, "#aiCtx"));
    await p.fill("#aiInput", "ville: Lyon"); await p.press("#aiInput", "Enter"); await p.waitForTimeout(400); out.push(await tree(p, "#aiFC"));
    await p.fill("#aiInput", "explain section 3 please, what is it about"); await p.press("#aiInput", "Enter"); await p.waitForTimeout(400); out.push(await tree(p, "#aiThread .ai-a:last-child"));
    await p.fill("#aiInput", "valider"); await p.press("#aiInput", "Enter"); await p.waitForTimeout(400); out.push(await tree(p, "#aiThread .ai-a:last-child"), await tree(p, "#aiFC"));
    await p.click('#aiFC [data-fca="full"]'); await p.waitForTimeout(500); out.push(await tree(p, "#aiForm"), await p.getAttribute("#ai", "class"));
    await p.fill("#vf_nom", "Martini"); out.push(await tree(p, "#vfList"), await tree(p, '#aiFC [data-fck="nom"]'));
    await p.click('#aiForm [data-vfa="next"]'); await p.click('#aiForm [data-vfa="next"]'); out.push(await tree(p, "#vfSteps"), await tree(p, "#vfPane"));
    await p.click('#aiForm [data-vtab="miss"]'); out.push(await tree(p, "#vfList"));
    await p.click('#aiForm [data-vfa="orig"]'); out.push(await tree(p, "#vfOrig")); await p.click('.vf-orig [data-vfa="orig"]'); await p.waitForTimeout(300);
    await p.click('#aiForm [data-vstep="4"]'); out.push(await tree(p, "#vfPane"));
    await p.click('#aiForm [data-vfa="validate"]'); await p.waitForTimeout(200); out.push(await tree(p, "#vfPane"), await toast(p));
    await p.click('#aiForm [data-vx="cert"]'); await p.click('#aiForm [data-vfa="validate"]'); await p.waitForTimeout(300); out.push(await tree(p, "#aiForm"), await tree(p, "#aiFC"), await toast(p));
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1200); out.push(await ai(p));
    await p.click('#aiForm [data-vfa="close"]'); await p.waitForTimeout(400); out.push(await p.getAttribute("#ai", "class"), await aiStore(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("entry points: dock app, Ask AI on a document, Quick Look; OS file drop onto the desktop", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.dblclick('#dkLayer .dk-ic[title="Remotion AI"]'); await p.waitForTimeout(700); out.push(await p.evaluate(() => document.getElementById("ai")!.hidden), await aiBtn(p));
    await p.click('#aiHead [data-aia="close"]'); await p.waitForTimeout(400);
    await p.click('#dkLayer .dk-ic[title="Rapport.pdf"]', { button: "right" }); out.push(await menu(p)); await p.locator('.os-menu[data-level="0"] button', { hasText: "Open with" }).first().hover(); await p.waitForTimeout(400);
    await p.locator('.os-menu[data-level="1"] button', { hasText: "Remotion AI" }).first().click(); await p.waitForTimeout(800);
    out.push(await tree(p, "#aiAttach"), await tree(p, "#aiHead"), await aiStore(p));
    await p.click('#aiHead [data-aia="close"]'); await p.waitForTimeout(400);
    // Files dropped from the computer (L11550): a synthetic DataTransfer with two files at a free cell.
    await p.evaluate(async () => {
      const layer = document.getElementById("dkLayer")!, dt = new DataTransfer();
      dt.items.add(new File(["hello world"], "readme.txt", { type: "text/plain", lastModified: 1791900000000 })); dt.items.add(new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg", lastModified: 1791900000000 }));
      const at = { clientX: 700, clientY: 500, bubbles: true, cancelable: true, dataTransfer: dt };
      layer.dispatchEvent(new DragEvent("dragenter", at)); layer.dispatchEvent(new DragEvent("dragover", at));
    });
    out.push(await p.getAttribute("#dkLayer", "class"), await p.locator("#dkLayer .dk-hint").count());
    await p.evaluate(async () => { const layer = document.getElementById("dkLayer")!, dt = new DataTransfer(); dt.items.add(new File(["hello world"], "readme.txt", { type: "text/plain", lastModified: 1791900000000 })); dt.items.add(new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg", lastModified: 1791900000000 })); layer.dispatchEvent(new DragEvent("drop", { clientX: 700, clientY: 500, bubbles: true, cancelable: true, dataTransfer: dt })); });
    await p.waitForTimeout(400); out.push(await p.getAttribute("#dkLayer", "class"), await icons(p), await toast(p), await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("sidebar: Ctrl+B, peek button, desktop menu toggle, saved across a reload (P-B21, rail P-A07)", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    const st = () => p.evaluate(() => [document.getElementById("shell")!.className, document.querySelector(".rail-peek")?.className, document.querySelector(".rail-peek")?.getAttribute("title"), localStorage.getItem("remotion-rail")]);
    out.push(await st(), await tree(p, "#rail"));
    await p.keyboard.press("Control+b"); await p.waitForTimeout(700); out.push(await st(), await toast(p));
    await p.keyboard.press("Control+b"); await p.waitForTimeout(700); out.push(await st(), await toast(p));
    // The peek button is hidden by the source's own CSS (`.rail-peek{display:none!important}`): its handler is triggered directly.
    out.push(await p.locator(".rail-peek").isVisible()); await p.evaluate(() => (document.querySelector(".rail-peek") as HTMLElement).click()); await p.waitForTimeout(700); out.push(await st(), await toast(p));
    await p.click("#dkLayer", { button: "right", position: { x: 700, y: 600 } }); out.push(await menu(p));
    await p.locator('.os-menu[data-level="0"] button', { hasText: "View" }).first().hover(); await p.waitForTimeout(300);
    await p.locator('.os-menu[data-level="1"] button', { hasText: "Sidebar" }).first().click(); await p.waitForTimeout(700); out.push(await st(), await toast(p));
    await p.reload(); await p.locator("#dkLayer .dk-ic").first().waitFor(); await p.waitForTimeout(700); out.push(await st());
    await p.keyboard.press("Control+b"); await p.waitForTimeout(700); await p.reload(); await p.locator("#dkLayer .dk-ic").first().waitFor(); await p.waitForTimeout(700); out.push(await st());
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("calendar opens with its date tile in the dock (clDockBtn) and closes it again", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(500); await p.click('.al .al-card[data-app="calendar"]'); await p.waitForTimeout(1500);
    out.push(await tree(p, "#dock"), await p.evaluate(() => [...document.querySelectorAll(".os-win")].map((w) => (w as HTMLElement).dataset.osw)));
    await p.click('.os-win[data-osw="calendar"] [data-wc="close"]'); await p.waitForTimeout(800);
    out.push(await tree(p, "#dock"));
    return out;
  });
  // Approved fix D-B05: every window app has a dock key, so the running Calendar's button gets the `os-run` mark that the
  // source (OS_DOCK without calendar) never sets. Everything else must match.
  const fixed = JSON.parse(JSON.stringify(r.react).replace("button.fe-dockb.os-run[aria-label=Calendar management", "button.fe-dockb[aria-label=Calendar management"));
  expect(fixed).toEqual(r.source);
});
