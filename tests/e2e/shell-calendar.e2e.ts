/**
 * Phase C slice 15 — Gestion Calendrier (native port, gated with ?health=native with the rest of the healthcare suite):
 * dual-run parity (source file:// vs React shell). Cabinet is still bridged, so what it adds to the calendar through
 * CL_HOOKS (source L26657–L26658: room readiness tags, the reception button in the drawer) is taken out of BOTH trees.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

// Long dual-run journeys (two full builds per test).
test.describe.configure({ timeout: 240000 });

const SRC = "file://" + path.resolve("../source/Remotion_Desktop.html");
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
  const s = JSON.stringify(v).replace(/demo[0-9a-f]{12}/g, "demoTOKEN").replace(/\b[0-9a-f]{24}\b/g, "TOKEN24").replace(/\/b\/[0-9a-f]{8}…/g, "/b/TOKEN…").replace(/\/b\/demo[0-9a-f]{4}…/g, "/b/demoTOKEN…")
    .replace(new RegExp(`\\b([a-z]{0,3})${T36}([0-9a-z]{4,5})\\b`, "g"), (m, p) => { if (!map.has(m)) map.set(m, p + "#" + map.size); return map.get(m)!; })
    .replace(/\\"size\\":\d+/g, "\\\"size\\\":0").replace(/"size":\d+/g, '"size":0').replace(/\b\d+([.,]\d+)?\s?(Ko|KB|kB|ko|Mo|MB)\b/g, "N KB");
  return JSON.parse(s);
}
/** Serialised subtree, without the parts that Cabinet injects into the calendar (see the file header). */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const hook = (e: Element) => e.matches("[data-clcab]") || (e.matches(".pa-tag") && !!e.parentElement?.matches(".cl-rc > .hr-ch"));
  const keep = (n: string) => ["id", "role", "hidden", "disabled", "type", "dir", "placeholder", "tabindex", "title", "lang", "value", "checked", "selected", "href"].includes(n) || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (hook(e)) return [];
    if (e.tagName === "svg" && !e.closest(".pa-obs,.pa-chart")) return ["svg" + (e.getAttribute("class") ? "." + e.getAttribute("class") : "")];
    const attrs = [...e.attributes].filter((a) => keep(a.name)).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const menu = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.os-menu[data-level="0"] > *')].map((e) => (e.textContent || "").replace(/\s+/g, " ").trim() + (e.hasAttribute("disabled") ? " [x]" : "")));
const W = '.os-win[data-osw="calendar"]';
const app = (p: Page) => tree(p, `${W} .clapp`);
const pg = (p: Page) => tree(p, `${W} .hr-pg`);
const dlg = (p: Page) => tree(p, `${W} .hr-dlg`);
const drw = (p: Page) => tree(p, `${W} .hr-drw`);
const toastOf = (p: Page) => p.locator(`${W} .hr-toast`).evaluate((e) => [e.className, e.textContent]);
/** `rev` counts saves; the 30-second tick saves when it delivers, so how many saves happened depends on run speed. */
const store = (p: Page) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem("remotion-calendar") || "null"); if (s) { s.audit = (s.audit || []).map((a: { ts: string }) => ({ ...a, ts: "" })); s.rev = 0; } return s; });
const bus = (p: Page) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem("remotion-bus") || "null"); return s ? s.ev.map((e: { type: string; key: string; p: unknown }) => [e.type, e.key, e.p]) : null; });
const openCl = async (p: Page) => {
  await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
  await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(600);
  await p.locator('.al .al-card[data-app="calendar"]').click(); await p.locator(`${W} .hr-pg`).waitFor(); await p.waitForTimeout(900);
};
const go = async (p: Page, view: string) => { await p.evaluate(([W, v]) => (document.querySelector(`${W} .hr-nav [data-clgo="${v}"]`) as HTMLElement | null)?.click(), [W, view]); await p.waitForTimeout(450); };
const pick = async (p: Page, label: string) => { await p.locator('.os-menu[data-level="0"] button', { hasText: label }).first().click(); await p.waitForTimeout(300); };
const submit = async (p: Page) => { await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(450); };
const role = async (p: Page, label: string) => { await p.click(`${W} [data-clrole]`); await p.waitForTimeout(250); await pick(p, label); await p.waitForTimeout(300); };
const clk = async (p: Page, sel: string) => { await p.locator(`${W} ${sel}`).first().click(); await p.waitForTimeout(400); };

/**
 * The window's 30-second tick delivers due notifications (L26089); when it fires depends on how long a run takes, so
 * before the store is compared the delivery worker is run by hand in both builds ("Process now", Notifications page).
 */
const settle = async (p: Page) => { await p.keyboard.press("Escape"); await p.waitForTimeout(200); await go(p, "notifs"); await clk(p, "[data-cldeliver]").catch(() => {}); };
test("open: shell, week agenda, sidebar, dock tile, store", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openCl(p);
    const dock = await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => b.getAttribute("data-t") + ":" + b.className + ":" + (b.textContent || "").trim()));
    return [await app(p), dock, await store(p), await bus(p)];
  });
  const fix = (d: string[]) => d.map((x) => x.replace(/^calendar:fe-dockb os-run:/, "calendar:fe-dockb:"));
  (r.react as unknown[])[1] = fix((r.react as string[][])[1]);
  expect(r.react).toEqual(r.source);
});

test("agenda: views, navigation, columns, filters, sidebar, display preferences, keyboard", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCl(p);
    for (const m of ["day", "workweek", "month", "agenda", "week"]) { await clk(p, `[data-clmode="${m}"]`); out.push(m, await pg(p)); }
    await clk(p, '[data-clmode="day"]');
    for (const b of ["pr", "room", "time"]) { await clk(p, `[data-clby="${b}"]`); out.push(b, await pg(p)); }
    await clk(p, '[data-clnavd="1"]'); await clk(p, '[data-clnavd="1"]'); out.push(await pg(p)); await clk(p, '[data-clnavd="-1"]'); await clk(p, '[data-clnavd="0"]'); out.push(await pg(p));
    await clk(p, '[data-clmode="week"]'); await clk(p, '[data-clmini="1"]'); out.push(await tree(p, `${W} .cl-mini`)); await clk(p, "[data-clday] >> nth=10"); out.push(await pg(p));
    await p.locator(`${W} input[data-cldate]`).fill("2026-11-03"); await p.locator(`${W} input[data-cldate]`).dispatchEvent("change"); await p.waitForTimeout(400); out.push(await pg(p));
    await clk(p, '[data-clnavd="0"]');
    await clk(p, "[data-clfilt]"); out.push(await pg(p));
    await p.selectOption(`${W} [data-clf="team"]`, { index: 1 }); await p.waitForTimeout(400); out.push(await pg(p));
    await p.selectOption(`${W} [data-clf="room"]`, { index: 2 }); await p.waitForTimeout(400); out.push(await pg(p));
    await clk(p, "[data-clfreset]"); out.push(await pg(p));
    await p.selectOption(`${W} [data-clf="pid"]`, { index: 1 }); await p.waitForTimeout(400); out.push(await pg(p)); await clk(p, "[data-clfreset]"); await clk(p, "[data-clfilt]");
    await p.locator(`${W} [data-clhide]`).nth(1).click(); await p.waitForTimeout(400); out.push(await pg(p)); await p.locator(`${W} [data-clhide]`).nth(1).click(); await p.waitForTimeout(400);
    await clk(p, "[data-clteam] >> nth=1"); out.push(await pg(p)); await clk(p, "[data-clteam] >> nth=1");
    await clk(p, "[data-clprefs]"); out.push(await menu(p)); await pick(p, "Compact"); out.push(await pg(p));
    await clk(p, "[data-clprefs]"); await pick(p, "Show weekends").catch(() => {}); out.push(await pg(p));
    await clk(p, "[data-clprefs]"); await p.locator('.os-menu[data-level="0"] button', { hasText: "Display zone" }).first().hover(); await p.waitForTimeout(300); out.push(await p.evaluate(() => [...document.querySelectorAll(".os-menu")].map((m) => (m.textContent || "").replace(/\s+/g, " ").trim())));
    await p.keyboard.press("Escape"); await p.waitForTimeout(200); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.locator(`${W} .cl-view`).click({ position: { x: 5, y: 5 } }).catch(() => {});
    for (const k of ["d", "m", "a", "w", "t"]) { await p.keyboard.press(k); await p.waitForTimeout(350); out.push(k, await p.evaluate((W) => document.querySelector(`${W} .cl-view`)?.getAttribute("data-mode"), W)); }
    out.push(await store(p).then((s) => s && s.prefs));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("booking wizard: validation, every step, a single appointment, a weekly series, alternatives", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCl(p);
    await clk(p, "[data-clnew]"); out.push(await dlg(p));
    await submit(p); out.push(await dlg(p));
    await p.locator(`${W} [data-wq]`).fill("ma"); await p.waitForTimeout(700); out.push(await dlg(p));
    await clk(p, "[data-wpid]"); out.push(await dlg(p)); await submit(p); out.push(await dlg(p));
    await clk(p, '[data-wsvc="sv1"]'); await submit(p); out.push(await dlg(p));
    await clk(p, '[data-wprm="team"]').catch(() => {}); out.push(await dlg(p)); await clk(p, '[data-wprm="pr"]').catch(() => {});
    await clk(p, '[data-wpr="pr2"]'); await submit(p); out.push(await dlg(p));
    await submit(p); out.push(await dlg(p));
    await clk(p, '[data-wfrom="7"]'); out.push(await dlg(p)); await clk(p, '[data-wfrom="-7"]');
    await clk(p, "[data-wslot] >> nth=3"); await submit(p); out.push(await dlg(p));
    await submit(p); out.push(await dlg(p));
    await submit(p); out.push(await dlg(p));
    await submit(p); out.push(await dlg(p));
    await submit(p); await p.waitForTimeout(1200); out.push(await dlg(p), await pg(p), await toastOf(p));
    await settle(p); out.push(await store(p), await bus(p));
    // weekly series (the drawer of the new appointment is open: Escape closes it)
    out.push(await drw(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
    await clk(p, "[data-clnew]"); await p.locator(`${W} [data-wq]`).fill("an"); await p.waitForTimeout(700); out.push(await dlg(p)); await clk(p, "[data-wpid] >> nth=2"); await submit(p); await clk(p, '[data-wsvc="sv1"]'); await submit(p); await clk(p, '[data-wpr="pr1"]'); await submit(p); await submit(p);
    await clk(p, "[data-wslot] >> nth=5"); await submit(p);
    await clk(p, "[data-wrecon]"); out.push(await dlg(p));
    await clk(p, '[data-wwd="3"]'); out.push(await dlg(p));
    await p.locator(`${W} [data-wrec="count"]`).fill("4"); await p.locator(`${W} [data-wrec="count"]`).dispatchEvent("change"); await p.waitForTimeout(400); out.push(await dlg(p));
    await submit(p); await submit(p); out.push(await dlg(p)); await submit(p); out.push(await dlg(p)); await submit(p); await p.waitForTimeout(1200); out.push(await dlg(p), await toastOf(p));
    await settle(p); out.push(await store(p), await bus(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

const billAppts = (p: Page) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem("remotion-billing") || "null"); return s ? s.appts.filter((a: { src?: string }) => a.src === "calendar") : null; });
test("drawer and lifecycle: arrival, session, completion (billing intake), no-show, cancel, edit, reschedule, duplicate", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCl(p);
    await clk(p, "[data-clrole]"); out.push(await menu(p)); await pick(p, "Practice manager"); await p.waitForTimeout(300);
    // Dr pr1 is the practitioner mapped to Billing (rmShSt: bill "p2"), so completing the visit feeds "appointments to bill".
    await clk(p, '[data-clmode="day"]'); await clk(p, '[data-clnavd="1"]'); await clk(p, '[data-clby="pr"]');
    await clk(p, '.cl-col[data-clcolid="pr1"] .cl-ev.st-confirmed'); out.push(await drw(p));
    for (const st of ["checkedin", "inprogress", "completed"]) { await clk(p, `.hr-drw [data-clst="${st}"]`).catch(() => {}); out.push(st, await drw(p), await toastOf(p)); }
    out.push(await billAppts(p), await bus(p));
    await clk(p, ".hr-drw [data-cldx]"); await clk(p, '[data-clby="time"]');
    await clk(p, '[data-clnavd="-1"]'); await clk(p, '[data-clnavd="-1"]'); await clk(p, ".cl-ev.st-completed"); out.push(await drw(p)); await clk(p, ".hr-drw [data-cldx]");
    await clk(p, '[data-clnavd="0"]'); await clk(p, '[data-clnavd="1"]'); await clk(p, '[data-clnavd="1"]');
    await clk(p, ".cl-ev.st-confirmed"); out.push(await drw(p));
    await clk(p, ".hr-drw [data-cledit]"); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg textarea`).first().fill("Note interne de test"); await submit(p); out.push(await drw(p), await toastOf(p));
    await clk(p, ".hr-drw [data-clmove]"); out.push(await dlg(p)); await clk(p, ".hr-dlg [data-mvf]"); out.push(await dlg(p)); await clk(p, ".hr-dlg [data-mvs] >> nth=1"); out.push(await dlg(p)); await submit(p); out.push(await dlg(p), await toastOf(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); out.push(await drw(p)); await clk(p, ".hr-drw [data-cldx]").catch(() => {});
    await clk(p, ".cl-ev.st-confirmed"); await clk(p, ".hr-drw [data-clcancel]"); out.push(await dlg(p)); await submit(p); out.push(await dlg(p));
    await p.selectOption(`${W} .hr-dlg select`, { index: 1 }).catch(() => {}); await p.locator(`${W} .hr-dlg input[type=radio]`).first().check().catch(() => {}); await submit(p); out.push(await dlg(p), await pg(p), await toastOf(p));
    await clk(p, ".hr-drw [data-cldx]").catch(() => {}); await clk(p, ".cl-ev.st-confirmed"); await clk(p, ".hr-drw [data-cldup]"); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
    await settle(p);
    out.push(await store(p), await bus(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("pages: requests, planning, series, availability, resources, notifications, external calendars, online booking, settings, audit", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCl(p);
    await clk(p, "[data-clrole]"); await pick(p, "Practice manager");
    out.push(await tree(p, `${W} .hr-nav`));
    for (const v of ["requests", "planning", "series", "avail", "resources", "notifs", "sync", "booking", "settings", "audit"]) { await go(p, v); out.push(v, await tree(p, `${W} .hr-main`)); }
    // requests: confirm one, decline one (cancel dialog), link an external request to a patient
    await go(p, "requests"); await clk(p, "[data-clreqok]"); out.push(await pg(p), await toastOf(p));
    await clk(p, "[data-clreqno]"); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await p.selectOption(`${W} [data-cllinkp]`, { index: 1 }).catch(() => {}); await p.waitForTimeout(500); out.push(await pg(p), await dlg(p)); await submit(p).catch(() => {}); out.push(await pg(p));
    // planning: another practitioner, another day
    await go(p, "planning"); await p.selectOption(`${W} [data-clppr]`, { index: 2 }).catch(() => {}); await p.waitForTimeout(400); out.push(await pg(p));
    await clk(p, "[data-clpday] >> nth=1").catch(() => {}); out.push(await pg(p)); await clk(p, "[data-clagpr]").catch(() => {}); out.push(await pg(p));
    // availability: exception, save weekly hours, remove exception
    await go(p, "avail"); await clk(p, "[data-clexc]"); out.push(await dlg(p));
    await p.locator(`${W} .hr-dlg [data-ex="from"]`).fill("2026-10-27"); await p.locator(`${W} .hr-dlg [data-ex="to"]`).fill("2026-10-27"); await p.locator(`${W} .hr-dlg [data-ex="reason"]`).fill("Formation").catch(() => {}); await submit(p); out.push(await dlg(p), await pg(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await clk(p, "[data-radd]").catch(() => {}); await p.locator(`${W} [data-clavform] button[type=submit]`).first().click().catch(() => {}); await p.waitForTimeout(500); out.push(await pg(p), await dlg(p), await toastOf(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await clk(p, "[data-clexcdel]").catch(() => {}); out.push(await pg(p), await dlg(p)); await submit(p).catch(() => {}); out.push(await pg(p));
    // resources: new room, maintenance, end of maintenance
    await go(p, "resources"); await clk(p, "[data-clresnew]"); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg [data-rs="n"]`).fill("Salle test"); await submit(p); out.push(await pg(p), await toastOf(p));
    await clk(p, "[data-clmaint]"); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg [data-mt="from"]`).fill("2026-10-20"); await p.locator(`${W} .hr-dlg [data-mt="to"]`).fill("2026-10-21"); await p.locator(`${W} .hr-dlg [data-mt="reason"]`).fill("Travaux"); await submit(p); out.push(await dlg(p), await pg(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); await clk(p, "[data-clmaintdel]").catch(() => {}); out.push(await pg(p), await dlg(p)); await submit(p).catch(() => {}); out.push(await pg(p));
    // notifications: filter, simulated provider failure, deliver, retry
    await go(p, "notifs"); await clk(p, '[data-clnf="sent"]').catch(() => {}); out.push(await pg(p)); await clk(p, '[data-clnf=""]').catch(() => {});
    await clk(p, "[data-clsimfail]").catch(() => {}); out.push(await pg(p)); await clk(p, "[data-cldeliver]"); out.push(await pg(p), await toastOf(p)); await clk(p, "[data-clretry]").catch(() => {}); out.push(await pg(p));
    // external calendars: export (download), import an .ics, remove the imported event
    await go(p, "sync");
    const dl = p.waitForEvent("download", { timeout: 4000 }).catch(() => null); await p.locator(`${W} [data-clicsx] button[type=submit]`).first().click().catch(() => {}); const d = await dl;
    out.push(d ? d.suggestedFilename() : null, d ? (await (await import("node:fs")).promises.readFile((await d.path())!, "utf8")).replace(/DTSTAMP:\S+/g, "DTSTAMP") : null);
    const ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test-1@example.invalid\r\nDTSTART:20261021T130000Z\r\nDTEND:20261021T150000Z\r\nSUMMARY:Congrès\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
    await p.locator(`${W} [data-clicsi]`).setInputFiles({ name: "agenda.ics", mimeType: "text/calendar", buffer: Buffer.from(ics) }).catch(() => {}); await p.waitForTimeout(700); out.push(await pg(p), await toastOf(p));
    await clk(p, "[data-clextdel]").catch(() => {}); out.push(await pg(p), await dlg(p)); await submit(p).catch(() => {}); out.push(await pg(p));
    // online booking: new link, public page preview with a request, revoke
    await go(p, "booking"); await clk(p, "[data-cllinknew]"); out.push(await dlg(p)); await p.locator(`${W} .hr-dlg [data-lk="label"]`).fill("Lien test"); await submit(p); out.push(await pg(p));
    await clk(p, "[data-clpub]"); out.push(await dlg(p)); await clk(p, ".hr-dlg [data-pbslot]").catch(() => {});
    await p.locator(`${W} .hr-dlg [data-pbx="name"]`).fill("Personne Test").catch(() => {}); await p.locator(`${W} .hr-dlg [data-pbx="phone"]`).fill("06 11 22 33 44").catch(() => {}); await p.locator(`${W} .hr-dlg [data-pbc]`).check().catch(() => {});
    await submit(p); out.push(await dlg(p), await pg(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); await clk(p, "[data-cllinkrv]").catch(() => {}); out.push(await pg(p), await dlg(p)); await submit(p).catch(() => {}); out.push(await pg(p));
    // settings: policy fields
    await go(p, "settings"); await p.locator(`${W} [data-clpol="minNotice"]`).fill("4").catch(() => {}); await p.locator(`${W} [data-clpol="minNotice"]`).dispatchEvent("change").catch(() => {}); await p.waitForTimeout(400); out.push(await pg(p), await toastOf(p));
    await go(p, "audit"); out.push(await pg(p));
    await settle(p); out.push(await store(p), await bus(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("roles, simulated practitioner, language switch (French, Arabic)", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCl(p);
    await clk(p, "[data-clrole]"); out.push(await menu(p)); await p.locator('.os-menu[data-level="0"] button', { hasText: "Simulated practitioner" }).first().hover(); await p.waitForTimeout(300);
    out.push(await p.evaluate(() => [...document.querySelectorAll(".os-menu")].map((m) => (m.textContent || "").replace(/\s+/g, " ").trim())));
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    for (const role of ["Practitioner", "Calendar viewer", "Administrator", "Reception"]) { await clk(p, "[data-clrole]"); await pick(p, role); await p.waitForTimeout(300); out.push(role, await app(p), await toastOf(p)); }
    await clk(p, "[data-clrole]"); await pick(p, "Practitioner"); await clk(p, ".cl-ev:not(.busy)").catch(() => {}); out.push(await drw(p)); await clk(p, ".hr-drw [data-cldx]").catch(() => {});
    await clk(p, "[data-clrole]"); await pick(p, "Reception");
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1200); out.push(await app(p), await p.getAttribute(W, "aria-label"), await p.locator(`${W} .os-wh b`).textContent());
    // The nav ink is measured one frame after the relabel: load the Arabic weights first in both builds, so the measure
    // does not depend on how fast the web font arrives.
    await p.evaluate(() => Promise.all(["400", "500", "600", "700"].map((w) => document.fonts.load(`${w} 14px "Noto Sans Arabic"`, "عربي"))));
    await p.click("#langBtn"); await p.click('[data-lang="ar"]'); await p.waitForTimeout(1200); out.push(await app(p), await p.getAttribute(W, "aria-label"));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

/** Patients window (native with ?health=native): its tree without what Cabinet (still bridged) adds to the record. */
const PW = '.os-win[data-osw="patients"]';
/** The calendar window opens over Patients: Patients buttons are clicked programmatically (same document listener). */
const jsClick = (p: Page, sel: string) => p.evaluate((sel) => (document.querySelector(sel) as HTMLElement | null)?.click(), sel);
const paTree = (p: Page, sel: string) => tree(p, sel).then((t) => t);
const paNoCab = (p: Page, sel: string) => p.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const c = el.cloneNode(true) as HTMLElement; c.querySelectorAll("section.pa-card").forEach((s) => { if (/\((Gestion Cabinet|Practice|Praxis|العيادة)\)/.test(s.querySelector("h3")?.textContent || "")) s.remove(); }); const host = document.createElement("div"); host.id = "__pa_tmp"; host.hidden = true; host.appendChild(c); document.body.appendChild(host); return true; }, sel).then(async (ok) => { if (!ok) return null; const t = await paTree(p, "#__pa_tmp > *"); await p.evaluate(() => document.getElementById("__pa_tmp")?.remove()); return t; });
test("Patients integration: appointment cards in the record, book from the record, open an appointment, linked appointment in an encounter", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
    await p.dblclick('#dkLayer .dk-ic[title="Patients"] >> nth=1'); await p.locator(`${PW} .hr-pg`).waitFor(); await p.waitForTimeout(900);
    await p.click(`${PW} [data-paopen="pa1"]`); await p.waitForTimeout(700); out.push(await paNoCab(p, `${PW} .hr-pg`));
    await p.evaluate((PW) => (document.querySelector(`${PW} [data-pasec="services"]`) as HTMLElement | null)?.click(), PW); await p.waitForTimeout(400); out.push(await paNoCab(p, `${PW} .pa-secb`));
    await p.evaluate((PW) => (document.querySelector(`${PW} [data-pasec="over"]`) as HTMLElement | null)?.click(), PW); await p.waitForTimeout(400);
    await p.click(`${PW} [data-paappt]`); await p.locator(`${W} .hr-dlg`).waitFor(); await p.waitForTimeout(900); out.push(await dlg(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(400);
    await jsClick(p, `${PW} [data-paapptopen]`); await p.waitForTimeout(1300); out.push(await drw(p), await tree(p, `${W} .cl-view`));
    await jsClick(p, `${PW} [data-paapptcal]`); await p.waitForTimeout(1300); out.push(await pg(p));
    // encounter form: the calendar adds the "linked appointment" field (PA_HOOKS.encAppt)
    await p.evaluate((PW) => (document.querySelector(`${PW} [data-pasec="enc"]`) as HTMLElement | null)?.click(), PW); await p.waitForTimeout(400);
    await jsClick(p, `${PW} [data-paadd="enc"], ${PW} [data-paclinadd="enc"]`); await p.waitForTimeout(500);
    out.push(await tree(p, `${PW} .hr-dlg`));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("drag and drop: reschedule to another day (15-minute snap), blocked move with alternatives, undo", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openCl(p);
    await clk(p, "[data-clrole]"); await pick(p, "Practice manager");
    await clk(p, '[data-clnavd="1"]');
    const drag = async (sel: string, dx: number, dy: number) => {
      const l = p.locator(`${W} ${sel}`).first(); await l.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); const b = await l.boundingBox(); if (!b) return "none";
      await p.mouse.move(b.x + b.width / 2, b.y + 8); await p.waitForTimeout(100); await p.mouse.down(); await p.waitForTimeout(150); for (let i = 1; i <= 8; i++) { await p.mouse.move(b.x + b.width / 2 + (dx * i) / 8, b.y + 8 + (dy * i) / 8); await p.waitForTimeout(80); }
      await p.waitForTimeout(200); await p.mouse.up(); await p.waitForTimeout(900); return "ok";
    };
    const colW = await p.locator(`${W} .cl-col`).first().evaluate((e) => e.getBoundingClientRect().width);
    out.push(await drag('.cl-ev[data-cldrag="1"]', colW, 84));
    out.push(await dlg(p), await toastOf(p), await tree(p, `${W} .cl-view`));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await p.locator(`${W} .hr-toast button`).click().catch(() => {}); await p.waitForTimeout(700); out.push(await toastOf(p));
    out.push(await drag('.cl-ev[data-cldrag="1"] >> nth=3', -colW * 2, -200));
    out.push(await dlg(p), await toastOf(p));
    await clk(p, ".hr-dlg [data-clalt]").catch(() => {}); await p.waitForTimeout(500); out.push(await dlg(p), await toastOf(p));
    for (const [n, dx, dy] of [[5, 0, -42], [8, 0, 63], [12, colW, 0]] as [number, number, number][]) { out.push(await drag(`.cl-ev[data-cldrag="1"] >> nth=${n}`, dx, dy)); out.push(await dlg(p), await toastOf(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300); }
    await p.locator(`${W} .hr-toast button`).click().catch(() => {}); await p.waitForTimeout(700); out.push(await toastOf(p));
    await settle(p); out.push(await store(p), await bus(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
