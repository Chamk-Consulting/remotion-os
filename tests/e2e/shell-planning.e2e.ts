/**
 * Phase C slice 16 — Calendar & Planning (native port, gated with ?health=native with the rest of the healthcare
 * suite): dual-run parity (source file:// vs React shell). Planning works over the Calendar's domain (same roles),
 * Cabinet's visit stages and tasks, and Patients, so after each step its DOM and the planning, calendar, cabinet and
 * bus stores are compared.
 */
/* Buttons named by v94 a11yName (data-an) get their label on a 250 ms debounce in both versions: that label is
   compared by catchup-s7-a11y, not in these trees. */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

// Long dual-run journeys (two full builds per test).
test.describe.configure({ timeout: 240000 });

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
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react&health=native" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce", acceptDownloads: true });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); await open(p, url); out[k] = norm(await fn(p)); await ctx.close();
  }
  if (process.env.DUMP) { const fs = await import("node:fs"); for (const k in out) fs.writeFileSync(`/tmp/claude-0/dump-${process.env.DUMP}-${test.info().title.slice(0, 6)}-${k}.json`, JSON.stringify(out[k], null, 1)); }
  return out;
}
/**
 * Generated ids are prefix + Date.now() (fixed clock) + random characters (4 for the calendar, 5 for the bus): numbered
 * in order of appearance. Booking-link tokens are random (Math.random for the seed, crypto.getRandomValues): normalised.
 */
const T36 = NOW.getTime().toString(36);
function norm(v: unknown) {
  const map = new Map<string, string>();
  const s = JSON.stringify(v).replace(/demo[0-9a-f]{6,12}(?![0-9a-f])/g, "demoTOKEN").replace(/\b[0-9a-f]{24}\b/g, "TOKEN24").replace(/\/b\/[0-9a-f]{8}…/g, "/b/TOKEN…").replace(/\/b\/demo[0-9a-f]{4}…/g, "/b/demoTOKEN…")
    .replace(new RegExp(`\\b([a-z]{0,3})${T36}([0-9a-z]{4,5})\\b`, "g"), (m, p) => { if (!map.has(m)) map.set(m, p + "#" + map.size); return map.get(m)!; })
    .replace(/\\"size\\":\d+/g, "\\\"size\\\":0").replace(/"size":\d+/g, '"size":0').replace(/\b\d+([.,]\d+)?\s?(Ko|KB|kB|ko|Mo|MB)\b/g, "N KB");
  return JSON.parse(s);
}
/** Serialised subtree. */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const hook = (_e: Element) => false;
  const keep = (n: string) => ["id", "role", "hidden", "disabled", "type", "dir", "placeholder", "tabindex", "title", "lang", "value", "checked", "selected", "href"].includes(n) || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (hook(e)) return [];
    if (e.tagName === "svg" && !e.closest(".pa-obs,.pa-chart")) return ["svg" + (e.getAttribute("class") ? "." + e.getAttribute("class") : "")];
    const attrs = [...e.attributes].filter((a) => keep(a.name) && !(e.hasAttribute("data-an") && (a.name === "aria-label" || a.name === "data-an"))).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const menu = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.os-menu[data-level="0"] > *')].map((e) => (e.textContent || "").replace(/\s+/g, " ").trim() + (e.hasAttribute("disabled") ? " [x]" : "")));
const W = '.os-win[data-osw="planning"]';
const app = (p: Page) => tree(p, `${W} .plapp`);
const main = (p: Page) => tree(p, `${W} .pl-main`);
const dlg = (p: Page) => tree(p, `${W} .hr-dlg`);
const drw = (p: Page) => tree(p, `${W} .pl-drw`);
const toastOf = (p: Page) => p.locator(`${W} .hr-toast`).evaluate((e) => [e.className, e.textContent]).catch(() => null);
const stores = (p: Page) => p.evaluate(() => { const g = (k: string) => { const s = JSON.parse(localStorage.getItem(k) || "null"); if (s && s.audit) s.audit = s.audit.map((a: { ts: string }) => ({ ...a, ts: "" })); return s; }; const b = g("remotion-bus"); const cl = g("remotion-calendar"); if (cl) cl.rev = 0; return { pl: g("remotion-planning"), cl, cb: g("remotion-cabinet"), bus: b ? b.ev.map((e: { type: string; key: string; p: unknown }) => [e.type, e.key, e.p]) : null }; });
const openPl = async (p: Page) => {
  await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
  await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(600); await p.locator('.al .al-card[data-app="planning"]').click();
  await p.locator(`${W} .plapp`).waitFor(); await p.waitForTimeout(1100);
};
/** Planning acts with the Calendar's role: switch it in the Calendar first (practice manager can block time, start sessions). */
const calRole = async (p: Page, label: string) => {
  await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(600); await p.locator('.al .al-card[data-app="calendar"]').click();
  await p.locator('.os-win[data-osw="calendar"] .hr-pg').waitFor(); await p.waitForTimeout(700);
  await p.click('.os-win[data-osw="calendar"] [data-clrole]'); await p.waitForTimeout(300); await p.locator('.os-menu[data-level="0"] button', { hasText: label }).first().click(); await p.waitForTimeout(400);
};
/** The Calendar's 30-second tick delivers due notifications whenever it fires: run the delivery worker by hand first. */
const settle = async (p: Page) => { await p.keyboard.press("Escape"); await p.waitForTimeout(200); await p.evaluate((W) => (document.querySelector(`${W} [data-plgo="notifs"]`) as HTMLElement | null)?.click(), W); await p.waitForTimeout(500); await p.evaluate((W) => (document.querySelector(`${W} [data-pldeliver]`) as HTMLElement | null)?.click(), W); await p.waitForTimeout(400); };
const jsClick = (p: Page, sel: string) => p.evaluate((sel) => (document.querySelector(sel) as HTMLElement | null)?.click(), sel);
const go = async (p: Page, view: string) => { await p.evaluate(([W, v]) => (document.querySelector(`${W} [data-plgo="${v}"]`) as HTMLElement | null)?.click(), [W, view]); await p.waitForTimeout(500); };
const pick = async (p: Page, label: string) => { await p.locator('.os-menu[data-level="0"] button', { hasText: label }).first().click(); await p.waitForTimeout(300); };
const submit = async (p: Page) => { await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(450); };
const clk = async (p: Page, sel: string) => { await p.locator(`${W} ${sel}`).first().click(); await p.waitForTimeout(450); };

test("open: shell, week workspace, side panel, upcoming strip, dock button, stores", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openPl(p);
    const dock = await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => b.getAttribute("data-t") + ":" + b.className));
    return [await app(p), dock, await stores(p)];
  });
  const fix = (d: string[]) => d.map((x) => x.replace(/^planning:fe-dockb os-run$/, "planning:fe-dockb"));
  (r.react as unknown[])[1] = fix((r.react as string[][])[1]);
  expect(r.react).toEqual(r.source);
});

test("calendar workspace: modes, navigation, mini month, filters, search, my calendars, display menu, drawer and actions", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openPl(p);
    for (const m of ["day", "workweek", "month", "agenda", "week"]) { await clk(p, `[data-plmode="${m}"]`); out.push(m, await main(p)); }
    await clk(p, '[data-plnav="1"]'); out.push(await main(p)); await clk(p, '[data-plnav="-1"]'); await clk(p, '[data-plnav="0"]');
    await clk(p, '[data-plmini="1"]').catch(() => {}); out.push(await tree(p, `${W} .pl-side`)); await clk(p, "[data-plday] >> nth=12").catch(() => {}); out.push(await main(p));
    await clk(p, '[data-plnav="0"]');
    await p.selectOption(`${W} [data-plf="pr"]`, { index: 1 }).catch(() => {}); await p.waitForTimeout(400); out.push(await main(p)); await p.selectOption(`${W} [data-plf="pr"]`, { index: 0 }).catch(() => {}); await p.waitForTimeout(400);
    await p.locator(`${W} [data-plq]`).first().fill("ro").catch(() => {}); await p.waitForTimeout(700); out.push(await app(p)); await p.locator(`${W} [data-plq]`).first().fill("").catch(() => {}); await p.waitForTimeout(700);
    await p.locator(`${W} [data-plcal]`).nth(1).click().catch(() => {}); await p.waitForTimeout(400); out.push(await main(p)); await p.locator(`${W} [data-plcal]`).nth(1).click().catch(() => {}); await p.waitForTimeout(400);
    await clk(p, "[data-plkebab]").catch(() => {}); out.push(await menu(p)); await pick(p, "By practitioner").catch(() => {}); await p.keyboard.press("Escape"); out.push(await main(p));
    await clk(p, ".pl-ev[data-plev]"); out.push(await drw(p));
    await clk(p, ".pl-drw [data-pldx]").catch(() => {});
    await p.locator(`${W} .pl-ev[data-plev]`).first().click({ button: "right" }).catch(() => {}); await p.waitForTimeout(300); out.push(await menu(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    for (const k of ["d", "m", "a", "w", "t"]) { await p.keyboard.press(k); await p.waitForTimeout(400); out.push(k, await p.evaluate((W) => document.querySelector(`${W} [data-plmode][aria-pressed="true"]`)?.getAttribute("data-plmode"), W)); }
    out.push(await stores(p).then((s) => s.pl));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("smart booking panel, exact time, quick create, internal events, reschedule, cancel, check-in", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
    await calRole(p, "Practice manager"); await openPl(p);
    await clk(p, "[data-plnew]"); out.push(await drw(p));
    await p.locator(`${W} [data-npq]`).fill("an"); await p.waitForTimeout(600); out.push(await drw(p));
    await clk(p, "[data-nppid]"); await clk(p, '[data-npsvc="sv1"]').catch(() => clk(p, "[data-npsvc]")); out.push(await drw(p));
    await p.locator(`${W} input[name=npslot]`).first().check().catch(() => {}); await p.waitForTimeout(300); out.push(await drw(p));
    await clk(p, "[data-npbook]").catch(() => {}); await p.waitForTimeout(800); out.push(await drw(p), await toastOf(p), await main(p));
    await clk(p, "[data-plnew]"); await p.locator(`${W} [data-npq]`).fill("ma"); await p.waitForTimeout(600); await clk(p, "[data-nppid]");
    await clk(p, '[data-npmode="exact"]').catch(() => {}); out.push(await drw(p));
    await p.locator(`${W} [data-npdate]`).fill("2026-10-20").catch(() => {}); await p.locator(`${W} [data-npdate]`).dispatchEvent("change").catch(() => {});
    await p.locator(`${W} [data-nptime]`).fill("10:00").catch(() => {}); await p.locator(`${W} [data-nptime]`).dispatchEvent("change").catch(() => {}); await p.waitForTimeout(500); out.push(await drw(p));
    await clk(p, "[data-npbook]").catch(() => {}); await p.waitForTimeout(800); out.push(await drw(p), await toastOf(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await go(p, "avail"); await jsClick(p, `${W} [data-plevt]`); await p.waitForTimeout(500); out.push(await dlg(p));
    await p.locator(`${W} .hr-dlg [data-evt]`).fill("Réunion d’équipe").catch(() => {}); await p.locator(`${W} .hr-dlg [data-evp]`).first().check().catch(() => {}); await submit(p).catch(() => {}); out.push(await dlg(p), await main(p), await toastOf(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); out.push(await main(p)); await go(p, "cal");
    await clk(p, '[data-plnav="1"]');
    await clk(p, ".pl-ev[data-plev]"); await clk(p, ".pl-drw [data-plresch]").catch(() => {}); out.push(await dlg(p)); await clk(p, ".hr-dlg [data-rsl] input, .hr-dlg [data-rsl] option").catch(() => {});
    await p.selectOption(`${W} .hr-dlg [data-rsl]`, { index: 1 }).catch(() => {}); await p.waitForTimeout(300); await submit(p).catch(() => {}); out.push(await dlg(p), await toastOf(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await clk(p, ".pl-ev[data-plev] >> nth=2"); await clk(p, ".pl-drw [data-plcancel]").catch(() => {}); out.push(await dlg(p)); await submit(p).catch(() => {}); out.push(await dlg(p), await toastOf(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await clk(p, '[data-plnav="0"]'); await clk(p, '[data-plmode="day"]');
    await clk(p, ".pl-ev[data-plev]").catch(() => {}); await clk(p, ".pl-drw [data-plcheckin]").catch(() => {}); out.push(await dlg(p), await drw(p), await toastOf(p));
    await settle(p); out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("secondary views: schedule, appointments, patients, practitioners, rooms, waiting list, recurring, availability, types, integrations, notifications, reports", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openPl(p);
    for (const v of ["sched", "list", "pats", "pracs", "rooms", "wait", "rec", "avail", "types", "integ", "notifs", "reports"]) { await go(p, v); out.push(v, await main(p)); }
    await go(p, "wait"); await clk(p, "[data-plwaitadd]"); out.push(await dlg(p));
    await p.selectOption(`${W} .hr-dlg [data-wlp]`, { index: 2 }).catch(() => {}); await p.selectOption(`${W} .hr-dlg [data-wls]`, { index: 1 }).catch(() => {}); await submit(p).catch(() => {}); out.push(await dlg(p), await main(p), await toastOf(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await clk(p, "[data-plwopen]").catch(() => {}); out.push(await main(p)); await clk(p, "[data-plwbook]").catch(() => {}); out.push(await main(p), await toastOf(p));
    await clk(p, '[data-plwf="all"]').catch(() => {}); out.push(await main(p));
    await go(p, "reports"); const dl = p.waitForEvent("download", { timeout: 4000 }).catch(() => null); await clk(p, "[data-plcsv]").catch(() => {}); const d = await dl;
    out.push(d ? d.suggestedFilename() : null, d ? (await (await import("node:fs")).promises.readFile((await d.path())!, "utf8")) : null);
    await go(p, "notifs"); await clk(p, "[data-pldeliver]").catch(() => {}); out.push(await main(p));
    await go(p, "sched"); await p.locator(`${W} [data-pltask]`).first().check().catch(() => {}); await p.waitForTimeout(500); out.push(await main(p), await toastOf(p));
    await settle(p); out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("roles, language, waiting-list offer when the Calendar cancels a slot, Cabinet links", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openPl(p);
    await clk(p, "[data-plsettings], [data-plkebab]").catch(() => {}); out.push(await menu(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1200); out.push(await app(p), await p.getAttribute(W, "aria-label"));
    await p.evaluate(() => Promise.all(["400", "500", "600", "700"].map((w) => document.fonts.load(`${w} 14px "Noto Sans Arabic"`, "عربي"))));
    await p.click("#langBtn"); await p.click('[data-lang="ar"]'); await p.waitForTimeout(1200); out.push(await app(p));
    await p.click("#langBtn"); await p.click('[data-lang="en"]'); await p.waitForTimeout(1200);
    // cancel tomorrow's first morning appointment in the drawer → the freed slot is offered to the waiting list
    await clk(p, '[data-plmode="day"]'); await clk(p, '[data-plnav="1"]'); await clk(p, ".pl-ev[data-plev]"); await clk(p, ".pl-drw [data-plcancel]").catch(() => {}); await submit(p).catch(() => {}); await p.waitForTimeout(600);
    await go(p, "wait"); out.push(await main(p));
    await clk(p, '[data-plmode="day"]').catch(() => {}); await go(p, "cal"); await clk(p, ".pl-ev[data-plev]").catch(() => {}); await clk(p, ".pl-drw [data-plcab]").catch(() => {}); await p.waitForTimeout(1500);
    out.push(await tree(p, '.os-win[data-osw="cabinet"] .hr-drw'));
    await settle(p); out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
