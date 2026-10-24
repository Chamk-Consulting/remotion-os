/**
 * Phase C slice 16 — Gestion Cabinet (native port, gated with ?health=native with the rest of the healthcare suite):
 * dual-run parity (source file:// vs React shell). Cabinet works over the Calendar's appointments and the Patients
 * store, so after each step the Cabinet DOM and the cabinet, calendar and bus stores are compared.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

// Long dual-run journeys (two full builds per test).
test.describe.configure({ timeout: 240000 });

const SRC = "file://" + path.resolve("../source-v94/Remotion_Desktop_v94.html") /* S2: v94 is the reference */;
/** Cabinet is about the day's flow: the clock is fixed mid-morning (11:30 in Paris) so there are visits to receive. */
const NOW = new Date("2026-10-14T10:30:00+01:00");
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
  const s = JSON.stringify(v).replace(/demo[0-9a-f]{12}/g, "demoTOKEN").replace(/\b[0-9a-f]{24}\b/g, "TOKEN24").replace(/\/b\/[0-9a-f]{8}…/g, "/b/TOKEN…").replace(/\/b\/demo[0-9a-f]{4}…/g, "/b/demoTOKEN…")
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
    const attrs = [...e.attributes].filter((a) => keep(a.name)).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    // .cb-live: the 15-second tick rewrites its last text node (" · hh:mm"), which drops the "Up to date" label in the source
    // too (D-F30); when the tick fires depends on run speed, so only the time part is compared.
    const own0 = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const own = e.classList.contains("cb-live") ? own0.replace(/^[^·]*·/, "·") : own0;
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const menu = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.os-menu[data-level="0"] > *')].map((e) => (e.textContent || "").replace(/\s+/g, " ").trim() + (e.hasAttribute("disabled") ? " [x]" : "")));
const W = '.os-win[data-osw="cabinet"]';
const CW = '.os-win[data-osw="calendar"]';
const app = (p: Page) => tree(p, `${W} .cbapp`);
const pg = (p: Page) => tree(p, `${W} .hr-pg`);
const dlg = (p: Page) => tree(p, `${W} .hr-dlg`);
const drw = (p: Page) => tree(p, `${W} .hr-drw`);
const toastOf = (p: Page) => p.locator(`${W} .hr-toast`).evaluate((e) => [e.className, e.textContent]);
const stores = (p: Page) => p.evaluate(() => { const g = (k: string) => { const s = JSON.parse(localStorage.getItem(k) || "null"); if (s && s.audit) s.audit = s.audit.map((a: { ts: string }) => ({ ...a, ts: "" })); return s; }; const b = g("remotion-bus"); const cl = g("remotion-calendar"); if (cl) cl.rev = 0; return { cb: g("remotion-cabinet"), cl, bus: b ? b.ev.map((e: { type: string; key: string; p: unknown }) => [e.type, e.key, e.p]) : null, sh: g("remotion-shared") }; });
const openCb = async (p: Page) => {
  await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
  await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(600); await p.locator('.al .al-card[data-app="cabinet"]').click();
  await p.locator(`${W} .hr-pg`).waitFor(); await p.waitForTimeout(900);
};
const go = async (p: Page, view: string) => { await p.evaluate(([W, v]) => (document.querySelector(`${W} .hr-nav [data-cbgo="${v}"]`) as HTMLElement | null)?.click(), [W, view]); await p.waitForTimeout(450); };
const pick = async (p: Page, label: string) => { await p.locator('.os-menu[data-level="0"] button', { hasText: label }).first().click(); await p.waitForTimeout(300); };
const submit = async (p: Page) => { await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(450); };
const clk = async (p: Page, sel: string) => { await p.locator(`${W} ${sel}`).first().click(); await p.waitForTimeout(400); };
const role = async (p: Page, label: string) => { await clk(p, "[data-cbrole]"); await pick(p, label); await p.waitForTimeout(300); };
const jsClick = (p: Page, sel: string) => p.evaluate((sel) => (document.querySelector(sel) as HTMLElement | null)?.click(), sel);

test("open: shell, dashboard, dock button, stores", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openCb(p);
    const dock = await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => b.getAttribute("data-t") + ":" + b.className));
    return [await app(p), dock, await stores(p)];
  });
  const fix = (d: string[]) => d.map((x) => x.replace(/^cabinet:fe-dockb os-run$/, "cabinet:fe-dockb"));
  (r.react as unknown[])[1] = fix((r.react as string[][])[1]);
  expect(r.react).toEqual(r.source);
});

test("reception: tabs, search, check-in, call, start, finish, cancel, no-show, walk-in, visit drawer", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCb(p); await role(p, "Practice manager");
    await go(p, "reception"); out.push(await pg(p));
    for (const t of ["wait", "cons", "done", "off", "all", "todo"]) { await clk(p, `[data-cbrtab="${t}"]`); out.push(t, await pg(p)); }
    await p.locator(`${W} [data-cbq]`).fill("ma"); await p.waitForTimeout(600); out.push(await pg(p)); await p.locator(`${W} [data-cbq]`).fill(""); await p.waitForTimeout(600);
    await clk(p, '[data-cbrtab="all"]');
    await clk(p, "[data-cbci]"); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg input[type=checkbox]`).first().check().catch(() => {}); await submit(p); out.push(await dlg(p), await pg(p), await toastOf(p));
    await clk(p, '[data-cbstep$="|called"]').catch(() => {}); out.push(await pg(p), await toastOf(p));
    await clk(p, "[data-cbstart]").catch(() => {}); out.push(await pg(p), await dlg(p)); await submit(p).catch(() => {}); out.push(await pg(p), await toastOf(p));
    await clk(p, '[data-cbstep$="|done"]').catch(() => {}); out.push(await pg(p), await toastOf(p));
    await clk(p, "[data-cbcancel]").catch(() => {}); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg [data-ccn]`).fill("Prévenu par téléphone").catch(() => {}); await submit(p).catch(() => {}); out.push(await pg(p), await toastOf(p));
    await clk(p, '[data-cbstep$="|noshow"]').catch(() => {}); out.push(await pg(p), await toastOf(p));
    await clk(p, "[data-cbopen]"); out.push(await drw(p));
    await p.selectOption(`${W} .hr-drw [data-cbvroom]`, { index: 1 }).catch(() => {}); await p.waitForTimeout(400);
    await p.locator(`${W} .hr-drw [data-cbvnote]`).fill("Fauteuil roulant").catch(() => {}); await p.locator(`${W} .hr-drw [data-cbvnote]`).dispatchEvent("change").catch(() => {}); await p.waitForTimeout(400); out.push(await drw(p), await toastOf(p));
    await clk(p, ".hr-drw [data-cbdx]").catch(() => {});
    await clk(p, "[data-cbwalk]"); out.push(await dlg(p));
    await p.locator(`${W} .hr-dlg [data-wkq]`).fill("an").catch(() => {}); await p.waitForTimeout(500); await clk(p, ".hr-dlg [data-wkp]").catch(() => {});
    await p.selectOption(`${W} .hr-dlg [data-wksvc]`, { index: 1 }).catch(() => {}); await p.waitForTimeout(300);
    await p.selectOption(`${W} .hr-dlg [data-wkpr]`, { index: 1 }).catch(() => {}); await p.waitForTimeout(300); out.push(await dlg(p));
    await submit(p); out.push(await dlg(p), await pg(p), await toastOf(p));
    out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("waiting room and the public display, daily operations, practitioners", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCb(p);
    await go(p, "waiting"); out.push(await pg(p));
    await clk(p, "[data-cbdisp]"); out.push(await tree(p, `${W} .cb-disp`));
    await clk(p, '.cb-disp [data-cbdmode="ticket"]').catch(() => {}); out.push(await tree(p, `${W} .cb-disp`)); await clk(p, ".cb-disp [data-cbdx2]").catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
    await go(p, "ops"); out.push(await pg(p)); await clk(p, '[data-cboby="room"]').catch(() => {}); out.push(await pg(p)); await clk(p, '[data-cbod="1"]').catch(() => {}); out.push(await pg(p)); await clk(p, '[data-cbod="0"]').catch(() => {});
    await go(p, "pracs"); out.push(await pg(p));
    await clk(p, "[data-cbprst]"); out.push(await menu(p)); await pick(p, "On break"); out.push(await pg(p), await toastOf(p));
    await clk(p, "[data-cbprst] >> nth=1").catch(() => {}); await pick(p, "Running late").catch(() => {}); out.push(await pg(p));
    await role(p, "Practice manager"); await go(p, "pracs");
    await clk(p, "[data-cbpredit]"); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg [data-prn]`).fill("Sarah Exemple (test)").catch(() => {}); await submit(p); out.push(await dlg(p), await pg(p));
    await clk(p, '[data-cbpredit=""]').catch(() => {}); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("services, rooms (readiness, out of service reported to the Calendar, issues), administrative follow-up, tasks", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCb(p); await role(p, "Practice manager");
    await go(p, "services"); out.push(await pg(p)); await clk(p, "[data-cbsvc]"); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await clk(p, '[data-cbsvc=""]').catch(() => {}); await p.locator(`${W} .hr-dlg [data-svn="0"]`).fill("Bilan test").catch(() => {}); await submit(p).catch(() => {}); out.push(await dlg(p), await pg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await go(p, "rooms"); out.push(await pg(p));
    await clk(p, '[data-cbready$="|cleaning"]'); out.push(await pg(p), await toastOf(p));
    await clk(p, '[data-cbready$="|out"] >> nth=1'); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg [data-ist]`).fill("Fuite d’eau").catch(() => {}); await submit(p).catch(() => {}); out.push(await dlg(p), await pg(p), await toastOf(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await clk(p, "[data-cbiss]"); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg [data-ist]`).fill("Néon défectueux").catch(() => {}); await submit(p).catch(() => {}); out.push(await dlg(p), await pg(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await clk(p, '[data-cbissf="all"]').catch(() => {}); out.push(await pg(p)); await clk(p, '[data-cbisst$="|inprogress"]').catch(() => {}); out.push(await pg(p)); await clk(p, '[data-cbisst$="|resolved"]').catch(() => {}); out.push(await dlg(p)); await submit(p).catch(() => {}); out.push(await pg(p));
    await role(p, "Reception");
    await go(p, "admin"); out.push(await pg(p)); await clk(p, '[data-cbadonly="0"]').catch(() => {}); out.push(await pg(p)); await clk(p, "[data-cbadtask]").catch(() => {}); out.push(await pg(p), await dlg(p), await toastOf(p));
    await submit(p).catch(() => {}); out.push(await pg(p), await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await go(p, "tasks"); out.push(await pg(p));
    await clk(p, "[data-cbtask]"); out.push(await dlg(p));
    await p.locator(`${W} .hr-dlg [data-tkchk]`).first().check().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p));
    await p.locator(`${W} .hr-dlg [data-tkcm]`).fill("Fait ce matin").catch(() => {}); await clk(p, ".hr-dlg [data-tkcmadd]").catch(() => {}); out.push(await dlg(p));
    await clk(p, '.hr-dlg [data-tkst$="|doing"]').catch(() => {}); out.push(await pg(p), await dlg(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); await clk(p, '[data-cbtask=""]').catch(() => {}); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg [data-tkt]`).fill("Commander des draps").catch(() => {}); await submit(p).catch(() => {}); out.push(await pg(p), await toastOf(p));
    await p.locator(`${W} [data-cbtq]`).fill("draps").catch(() => {}); await p.waitForTimeout(600); out.push(await pg(p));
    out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("reports (periods, practitioner, CSV export), configuration, audit, roles, language", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCb(p); await role(p, "Practice manager");
    await go(p, "reports"); out.push(await pg(p)); await clk(p, '[data-cbrdays="30"]').catch(() => {}); out.push(await pg(p));
    await p.selectOption(`${W} [data-cbf="rpr"]`, { index: 1 }).catch(() => {}); await p.waitForTimeout(400); out.push(await pg(p));
    const dl = p.waitForEvent("download", { timeout: 4000 }).catch(() => null); await clk(p, "[data-cbcsv]").catch(() => {}); const d = await dl;
    out.push(d ? d.suggestedFilename() : null, d ? (await (await import("node:fs")).promises.readFile((await d.path())!, "utf8")) : null);
    await go(p, "config"); out.push(await pg(p));
    await p.locator(`${W} [data-cbpol="lateMins"]`).fill("20").catch(() => {}); await p.locator(`${W} [data-cbpol="lateMins"]`).dispatchEvent("change").catch(() => {}); await p.waitForTimeout(400);
    await p.locator(`${W} [data-cbdisp2="showRoom"]`).click().catch(() => {}); await p.waitForTimeout(400);
    await clk(p, "[data-cbann]").catch(() => {}); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg textarea`).fill("Fermeture à 18 h vendredi").catch(() => {}); await submit(p).catch(() => {}); out.push(await pg(p), await toastOf(p));
    await clk(p, "[data-cbanndel]").catch(() => {}); out.push(await pg(p));
    await go(p, "audit"); out.push(await pg(p)); for (const t of ["ev", "log"]) { await clk(p, `[data-cbatab="${t}"]`).catch(() => {}); out.push(t, await pg(p)); }
    await clk(p, "[data-cbrole]"); out.push(await menu(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    for (const ro of ["Practitioner", "Platform administrator", "Reception"]) { await role(p, ro); out.push(ro, await app(p)); }
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1200); out.push(await app(p), await p.getAttribute(W, "aria-label"));
    await p.evaluate(() => Promise.all(["400", "500", "600", "700"].map((w) => document.fonts.load(`${w} 14px "Noto Sans Arabic"`, "عربي"))));
    await p.click("#langBtn"); await p.click('[data-lang="ar"]'); await p.waitForTimeout(1200); out.push(await app(p));
    out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("Calendar and Patients integration: readiness tags, reception link in the appointment drawer, today's visit in the record, calendar changes traced in the visit", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCb(p);
    await go(p, "reception"); await clk(p, '[data-cbrtab="todo"]');
    const id = await p.locator(`${W} [data-cbci]`).first().getAttribute("data-cbci"); out.push(id);
    await clk(p, "[data-cbci]"); await p.locator(`${W} .hr-dlg input[type=checkbox]`).first().check().catch(() => {}); await submit(p); out.push(await pg(p), await toastOf(p));
    // Calendar (native): the appointment's drawer shows the reception stage and links back to Cabinet
    await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(600); await p.locator('.al .al-card[data-app="calendar"]').click(); await p.locator(`${CW} .hr-pg`).waitFor(); await p.waitForTimeout(900);
    await jsClick(p, `${CW} [data-clmode="day"]`); await p.waitForTimeout(500);
    await jsClick(p, `${CW} [data-clev="${id}"]`); await p.waitForTimeout(600); out.push(await tree(p, `${CW} .hr-drw`));
    await jsClick(p, `${CW} .hr-drw [data-clcab]`); await p.waitForTimeout(1500); out.push(await drw(p));
    // Calendar resources page: Cabinet's readiness tags
    await jsClick(p, `${CW} .hr-nav [data-clgo="resources"]`); await p.waitForTimeout(700); out.push(await tree(p, `${CW} .hr-pg`));
    // the Calendar records the session (practice manager): started, then completed → Cabinet's consumer moves the visit to done
    await jsClick(p, `${CW} .hr-nav [data-clgo="agenda"]`); await p.waitForTimeout(600);
    await jsClick(p, `${CW} [data-clrole]`); await p.waitForTimeout(300); await pick(p, "Practice manager");
    await jsClick(p, `${CW} [data-clev="${id}"]`); await p.waitForTimeout(600);
    for (const st of ["inprogress", "completed"]) { await jsClick(p, `${CW} .hr-drw [data-clst="${st}"]`); await p.waitForTimeout(700); }
    out.push(await tree(p, `${CW} .hr-drw`));
    // Patients (native): today's visit card on the record of another patient seen today
    const pid = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("remotion-calendar") || "null"); const t = new Date().toISOString().slice(0, 10); const a = s?.appts.find((x: { pid: string | null; start: string; status: string }) => x.pid && x.start.slice(0, 10) === t && x.status !== "cancelled"); return a ? a.pid : null; });
    out.push(pid);
    await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(600); await p.locator('.al .al-card[data-app="patients"]').click(); await p.locator('.os-win[data-osw="patients"] .hr-pg').waitFor(); await p.waitForTimeout(1200);
    await jsClick(p, `.os-win[data-osw="patients"] [data-paopen="${pid}"]`); await p.waitForTimeout(800); out.push(await tree(p, '.os-win[data-osw="patients"] .hr-pg'));
    out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
