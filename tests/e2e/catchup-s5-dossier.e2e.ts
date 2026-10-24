/**
 * Catch-up slice S5 — Dossier Patient (Remotion OS v72–v94): dual-run parity between the v94 HTML file and the React
 * shell. Same seeded patients, same fixed clock: the record (header, cards, tabs, side panel), the sections, the search,
 * the drawer and the OS palette hook give the same tree and the same store.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

test.describe.configure({ timeout: 240_000 });
const SRC = "file://" + path.resolve("../source-v94/Remotion_Desktop_v94.html");
const NOW = new Date("2026-10-14T19:08:00+01:00");
const W = '.os-win[data-osw="dossier"]';

async function open(page: Page, url: string) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); sessionStorage.setItem("__s", "1"); } } catch {} });
  await page.goto(url); await page.locator("#dkLayer .dk-ic").first().waitFor(); await page.waitForTimeout(700);
  await page.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 4000 }).catch(() => {});
  /* v94 opens the workspace menu on a first run: closed like a person would */
  if (await page.evaluate(() => { const m = document.getElementById("wsMenu"); return !!m && !m.classList.contains("closed") && getComputedStyle(m).visibility !== "hidden" && m.getBoundingClientRect().height > 0; })) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
}
async function both(browser: Browser, baseURL: string | undefined, fn: (p: Page) => Promise<unknown>) {
  const out: Record<string, unknown> = {}; const errs: Record<string, string[]> = {};
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react&health=native" })) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 960 }, baseURL, reducedMotion: "reduce" });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); errs[k] = []; p.on("pageerror", (e) => errs[k].push(e.message));
    await open(p, url); out[k] = norm(await fn(p)); await ctx.close();
  }
  if (process.env.DUMP) { const fs = await import("node:fs"); for (const k in out) fs.writeFileSync(`/tmp/claude-0/dump-dp-${test.info().title.slice(0, 6)}-${k}.json`, JSON.stringify(out[k], null, 1)); }
  expect(errs.react).toEqual([]);
  return out;
}
const T36 = NOW.getTime().toString(36);
function norm(v: unknown) {
  const map = new Map<string, string>();
  const s = JSON.stringify(v).replace(new RegExp(`\\b([a-z]{0,3})${T36}([0-9a-z]{4,5})\\b`, "g"), (m, p) => { if (!map.has(m)) map.set(m, p + "#" + map.size); return map.get(m)!; })
    .replace(/\\"size\\":\d+/g, "\\\"size\\\":0").replace(/"size":\d+/g, '"size":0').replace(/\b\d+([.,]\d+)?\s?(Ko|KB|kB|ko|Mo|MB)\b/g, "N KB");
  return JSON.parse(s);
}
/** Serialised subtree (classes, ARIA / data attributes, own text, form values). Icons count as one node. */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => ["role", "hidden", "disabled", "type", "placeholder", "title", "value", "checked", "selected"].includes(n) || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (e.tagName === "svg" && !e.classList.contains("dp-spark")) return ["svg"];
    /* v94 a11yName (catch-up S7, not ported yet) names unnamed buttons and marks them data-an: left out until S7 */
    const an = e.hasAttribute("data-an");
    const attrs = [...e.attributes].filter((a) => keep(a.name) && !(an && (a.name === "aria-label" || a.name === "data-an"))).map((a) => a.name + "=" + a.value).sort().join(",");
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].filter((c) => c !== "in").sort().join(".")}[${attrs}]${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const store = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem("remotion-dossier") || "null"));
const openDp = async (p: Page) => {
  await p.dblclick(`#dkLayer .dk-ic[title="Patient Record"]`); await p.locator(`${W} .dpapp`).waitFor(); await p.waitForTimeout(1000);
};
const click = async (p: Page, sel: string, wait = 450) => { await p.evaluate(([W, s]) => (document.querySelector(`${W} ${s}`) as HTMLElement | null)?.click(), [W, sel]); await p.waitForTimeout(wait); };

test("open: desktop icon, layout, first patient's record", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openDp(p);
    const win = await p.locator(W).evaluate((e) => [e.className.split(/\s+/).filter((c: string) => /win/.test(c)).sort().join(" "), Math.round(e.getBoundingClientRect().width) > 900]);
    return { win, app: await tree(p, `${W} .dpapp`), store: await store(p) };
  });
  expect(r.react).toEqual(r.source);
});

test("sections, search and the info drawer", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openDp(p); const out: unknown[] = [];
    for (const s of ["meds", "allergies", "appts", "docs", "notes", "over"]) { await click(p, `[data-dpsec="${s}"]`); out.push(s, await tree(p, `${W} .dpapp`)); }
    await p.locator(`${W} [data-dpq]`).fill("ma"); await p.waitForTimeout(500); out.push(await tree(p, `${W} .dp-sch`));
    await p.locator(`${W} [data-dpq]`).fill(""); await p.waitForTimeout(300);
    await click(p, `[data-dpact="editinfo"]`, 600); out.push(await tree(p, `${W} .dpapp`));
    await p.keyboard.press("Escape"); await p.waitForTimeout(400); out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("a note is saved in the same store", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openDp(p); await click(p, `[data-dpsec="notes"]`);
    const ta = p.locator(`${W} [data-dpnotet]`).first(); if (!(await ta.count())) return "no-note-form";
    await ta.fill("Douleur en baisse, poursuivre"); await p.evaluate((W) => (document.querySelector(`${W} [data-dpnote]`) as HTMLFormElement).requestSubmit(), W); await p.waitForTimeout(600);
    return [await tree(p, `${W} .dp-notes`), await store(p)];
  });
  expect(r.react).toEqual(r.source);
});

test("OS palette: a patient opens straight into their record", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await p.keyboard.press("Control+k"); await p.waitForTimeout(400);
    const inp = p.locator("#palInput").first(); await inp.fill("ma"); await p.waitForTimeout(500);
    const rows = await p.evaluate(() => [...document.querySelectorAll("#palList [role=option]")].slice(0, 5).map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()));
    await p.keyboard.press("Enter"); await p.waitForTimeout(1200);
    return { rows: rows.slice(0, 3), open: await p.locator(`${W} .dpapp`).count(), head: await tree(p, `${W} .dp-head`) };
  });
  expect((r.react as { open: number }).open).toBe(1);
  expect(r.react).toEqual(r.source);
});
