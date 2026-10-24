/**
 * Catch-up slice S6 — transitions, app switcher, window overview, gestures (Remotion OS v74–v91): dual run between the
 * v94 HTML file and the React shell. Same fixed clock; motion is ON here (the effects are what is compared): every Web
 * Animation running at a given moment (target, keyframes, timing), the body classes, the settings page, the switcher
 * and the overview markup, and the stores.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

test.describe.configure({ timeout: 300_000 });
const SRC = "file://" + path.resolve("../source-v94/Remotion_Desktop_v94.html");
const NOW = new Date("2026-10-14T19:08:00+01:00");

async function open(page: Page, url: string, seed?: Record<string, string>) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
  await page.clock.install({ time: NOW });
  await page.addInitScript((seed) => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); for (const k in seed || {}) localStorage.setItem(k, seed![k]); sessionStorage.setItem("__s", "1"); } } catch {} }, seed);
  await page.goto(url); await page.locator("#dkLayer .dk-ic").first().waitFor(); await page.clock.runFor(1500);
  if (await page.evaluate(() => { const m = document.getElementById("wsMenu"); return !!m && !m.classList.contains("closed") && m.getBoundingClientRect().height > 0; })) { await page.keyboard.press("Escape"); await page.clock.runFor(400); }
}
async function both(browser: Browser, baseURL: string | undefined, fn: (p: Page) => Promise<unknown>, seed?: Record<string, string>) {
  const out: Record<string, unknown> = {}; const errs: string[] = [];
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react&health=native" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "no-preference" });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); if (k === "react") p.on("pageerror", (e) => { if (!/aborted/i.test(e.message)) errs.push(e.message); }); /* blocked CDN requests */
    await open(p, url, seed); out[k] = await fn(p); await ctx.close();
  }
  if (process.env.DUMP) { const fs = await import("node:fs"); for (const k in out) fs.writeFileSync(`/tmp/claude-0/dump-tr-${test.info().title.slice(0, 8)}-${k}.json`, JSON.stringify(out[k], null, 1)); }
  expect(errs).toEqual([]);
  return out;
}
/** Every running Web Animation: what it moves, its keyframes and its timing (rounded). */
const anims = (p: Page) => p.evaluate(() => document.getAnimations().filter((a) => a.playState !== "finished" && !(a as CSSAnimation).animationName && !(a as CSSTransition).transitionProperty).map((a) => {
  const ef = a.effect as KeyframeEffect; const t = ef.target as HTMLElement | null; const tm = ef.getTiming();
  const who = !t ? "?" : t.id ? "#" + t.id : t.dataset.osw ? "win:" + t.dataset.osw : t.classList.contains("main") ? ".main" : t.classList.contains("tr-face") ? ".tr-face" : (t.getAttribute("class") || t.tagName).split(" ")[0];
  const kf = ef.getKeyframes().map((k) => Object.fromEntries(Object.entries(k).filter(([n]) => !["computedOffset", "composite", "easing"].includes(n) || (n === "easing" && k.easing !== "linear")).map(([n, v]) => [n, typeof v === "string" ? v.replace(/-?\d+\.\d+/g, (x) => String(Math.round(+x))) : v])));
  return { who, kf, d: tm.duration, delay: +tm.delay! < 0 ? "in step" : Math.round(+tm.delay!), /* windows that join a running switch start part-way: the offset depends on the machine */ fill: tm.fill, easing: tm.easing, comp: ef.composite };
}).sort((a, b) => (a.who + JSON.stringify(a.kf)).localeCompare(b.who + JSON.stringify(b.kf))));
const bodyCls = (p: Page) => p.evaluate(() => [...document.body.classList].filter((c) => /^(tr-|dk-switch|xp-on)/.test(c)).sort());
/** Serialised subtree (v94 a11yName labels, catch-up S7, left out: not ported yet). */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => ["role", "hidden", "disabled", "type", "title", "style", "aria-checked", "aria-selected", "aria-label", "aria-modal", "aria-activedescendant"].includes(n) || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (e.tagName === "svg") return ["svg"]; if (e.classList.contains("tsw-clone")) return ["clone"];
    const an = e.hasAttribute("data-an");
    const attrs = [...e.attributes].filter((a) => keep(a.name) && !(an && (a.name === "aria-label" || a.name === "data-an"))).map((a) => a.name + "=" + (a.name === "style" ? (e as HTMLElement).style.cssText : a.value).replace(/-?\d+\.\d+/g, (x) => String(Math.round(+x)))).sort().join(",");
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const store = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem("remotion-transitions") || "null"));
/* "Patients" is both a demo folder (first) and the app (second) */
const openApp = async (p: Page, title: string, nth = 0) => { await p.locator(`#dkLayer .dk-ic[title="${title}"] >> nth=${nth}`).dispatchEvent("dblclick"); await p.clock.runFor(900); await p.waitForTimeout(700); /* the open animation runs on real time */ }; /* icons may sit under an open window */
const trPage = async (p: Page) => {
  await p.click("#sysBtn"); await p.clock.runFor(400);
  await p.evaluate(() => (document.querySelector('#sysVp [data-go="appearance"]') as HTMLElement).click()); await p.clock.runFor(700);
  await p.evaluate(() => (document.querySelector('#sysVp [data-go="transitions"]') as HTMLElement).click()); await p.clock.runFor(700);
};
const click = async (p: Page, sel: string, ms = 300) => { await p.evaluate((s) => (document.querySelector(s) as HTMLElement).click(), sel); await p.clock.runFor(ms); };

test("settings page: every row, a choice is saved, reset restores the original effects", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await trPage(p); const out: unknown[] = [await tree(p, '#sysVp [data-view="transitions"]')];
    await click(p, '#sysVp [data-trk="desk"][data-trv="cube"]'); await click(p, '#sysVp [data-trk="speed"][data-trv="fast"]'); await click(p, '#sysVp [data-trk="gestures"][data-trv="off"]'); await click(p, '#sysVp [data-trk="overview"][data-trv="both"]');
    out.push(await store(p), await tree(p, '#sysVp [data-view="transitions"] .tr-grid'));
    await click(p, "#sysVp [data-trdiag]"); out.push(await p.evaluate(() => { const d = document.querySelector<HTMLElement>("#sysVp .tr-dres")!; return [d.dataset.ok, d.dataset.fb, d.dataset.miss, d.querySelectorAll("li").length]; }));
    await click(p, "#sysVp [data-trreset]"); out.push(await store(p), await p.locator("#toast").textContent());
    return out;
  });
  expect(r.react).toEqual(r.source);
});

for (const eff of ["cube", "carousel", "flip", "fade", "none"]) {
  test(`desktop switch "${eff}": wallpaper, desktop, dock and windows move the same way`, async ({ browser, baseURL }) => {
    const r = await both(browser, baseURL, async (p) => {
      await openApp(p, "Patients", 1); await openApp(p, "Billing");
      await p.keyboard.press("Control+Meta+ArrowRight"); await p.clock.runFor(120);
      const mid = { a: await anims(p), b: await bodyCls(p), old: await p.locator("#wallOld").count() };
      await p.clock.runFor(1400);
      return { mid, end: { b: await bodyCls(p), old: await p.locator("#wallOld").count() } };
    }, { "remotion-transitions": JSON.stringify({ v: 1, desk: eff, ws: "classic", speed: "normal", depth: "medium", icons: "fade", widgets: "fade", windows: "follow", appStyle: "expressive" }) });
    expect(r.react).toEqual(r.source);
  });
}

test("desktop switch with icons and widgets that follow (frozen faces)", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.keyboard.press("Control+Meta+ArrowRight"); await p.clock.runFor(150);
    const mid = { a: await anims(p), b: await bodyCls(p), faces: await p.locator(".tr-face").count() };
    await p.clock.runFor(1400); return { mid, faces: await p.locator(".tr-face").count(), b: await bodyCls(p) };
  }, { "remotion-transitions": JSON.stringify({ v: 1, desk: "carousel", ws: "classic", speed: "soft", depth: "strong", icons: "follow", widgets: "follow", windows: "follow", appStyle: "expressive" }) });
  expect(r.react).toEqual(r.source);
});

for (const eff of ["flip", "cube", "fade"]) {
  test(`workspace switch "${eff}"`, async ({ browser, baseURL }) => {
    const r = await both(browser, baseURL, async (p) => {
      await openApp(p, "Patients", 1);
      await p.keyboard.press("Control+Alt+ArrowRight"); await p.clock.runFor(150);
      const mid = { a: await anims(p), b: await bodyCls(p) };
      await p.clock.runFor(1500);
      return { mid, b: await bodyCls(p), desks: await p.evaluate(() => JSON.parse(localStorage.getItem("remotion-ws-desks") || "null")?.sel) };
    }, { "remotion-transitions": JSON.stringify({ v: 1, desk: "classic", ws: eff, speed: "normal", depth: "light", icons: "fade", widgets: "fade", windows: "follow", appStyle: "expressive" }) });
    expect(r.react).toEqual(r.source);
  });
}

test("app switcher: Alt + key under Esc, cover-flow, Delete closes, releasing Alt opens", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openApp(p, "Patients", 1); await openApp(p, "Billing"); await openApp(p, "Forms");
    const dockBtn = await p.locator("#dockSw").evaluate((b: HTMLButtonElement) => [b.hidden, b.getAttribute("aria-label")]);
    await p.keyboard.down("Alt"); await p.keyboard.press("Backquote"); await p.clock.runFor(400);
    const t1 = await tree(p, ".tsw"); await p.keyboard.press("Backquote"); await p.clock.runFor(200); const t2 = await tree(p, ".tsw .tsw-stage");
    await p.keyboard.press("Delete"); await p.clock.runFor(600); const t3 = await tree(p, ".tsw .tsw-stage");
    await p.keyboard.up("Alt"); await p.clock.runFor(900);
    return { dockBtn, t1, t2, t3, open: await p.locator(".tsw").count(), wins: await p.evaluate(() => [...document.querySelectorAll<HTMLElement>(".os-win")].map((w) => w.dataset.osw + (w.classList.contains("focus") ? "*" : "")).sort()) };
  });
  expect(r.react).toEqual(r.source);
});

test("window overview: Ctrl+Win+Up spreads the windows, arrows move, Enter opens", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openApp(p, "Patients", 1); await openApp(p, "Billing"); await openApp(p, "Forms");
    await p.keyboard.press("Control+Meta+ArrowUp"); await p.clock.runFor(800);
    const t1 = await tree(p, ".xp"); const tf = await p.evaluate(() => [...document.querySelectorAll<HTMLElement>(".os-win")].map((w) => w.dataset.osw + " " + w.style.transform.replace(/-?\d+\.\d+/g, (x) => String(Math.round(+x)))).sort());
    await p.keyboard.press("ArrowRight"); await p.clock.runFor(200); const on = await p.evaluate(() => document.querySelector(".xp .xp-card.on")?.getAttribute("aria-label"));
    await p.keyboard.press("Enter"); await p.clock.runFor(800);
    return { t1, tf, on, open: await p.locator(".xp").count(), b: await bodyCls(p), focus: await p.evaluate(() => document.querySelector<HTMLElement>(".os-win.focus")?.dataset.osw), after: await p.evaluate(() => [...document.querySelectorAll<HTMLElement>(".os-win")].map((w) => w.style.transform).join("|")) };
  });
  expect(r.react).toEqual(r.source);
});
