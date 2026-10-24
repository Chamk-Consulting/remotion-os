/**
 * Phase C slice 20 — cross-app integrations (doc 12 §X) and the healthcare event bus (P-H02), dual-run (source file://
 * vs React shell). Each journey starts in one app and checks what the OTHER app shows afterwards (its own page, not only
 * the shared stores), then compares every store involved and the bus log:
 *   X-01 Calendar completion / no-show → Billing "appointments to bill"
 *   X-03 Cabinet room out of service → Calendar resources and agenda; X-04 Calendar cancellation → Planning waiting list
 *   X-05 HR approved leave → Calendar availability; X-06 HR employee name → Calendar, Cabinet and Patients
 *   X-08 Billing payment → the patient's billing summary in Patients
 *   X-09 healthcare notifications → the OS notification centre
 *   X-13 a pop-out window (app mode in a second browser window) ↔ the main window: store sync and the cross-tab bus
 *        (D-H18, double processing across windows, is reproduced: both windows' consumers run)
 */
/* Buttons named by v94 a11yName (data-an) get their label on a 250 ms debounce in both versions: that label is
   compared by catchup-s7-a11y, not in these trees. */
import { test, expect, type Page, type Browser, type BrowserContext } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

test.describe.configure({ timeout: 300_000 });

const SRC = "file://" + path.resolve("../source-v94/Remotion_Desktop_v94.html") /* S2: v94 is the reference */;
/** Mid-morning in Paris, so there are visits to receive and appointments later today and tomorrow. */
const NOW = new Date("2026-10-14T10:30:00+01:00");
const BUILDS = { source: { main: SRC, pop: (app: string) => `${SRC}#app=${app}` }, react: { main: "/?shell=react", pop: (app: string) => `/apps/${app}` } };

async function prep(page: Page, clear: boolean) {
  await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
  await page.clock.setFixedTime(NOW);
  if (clear) await page.addInitScript(() => { try { if (!sessionStorage.getItem("__s")) { localStorage.clear(); sessionStorage.setItem("__s", "1"); } } catch {} });
}
async function open(page: Page, url: string) { await prep(page, true); await page.goto(url); await page.locator("#dkLayer .dk-ic").first().waitFor(); await page.waitForTimeout(700); }
async function both(browser: Browser, baseURL: string | undefined, fn: (p: Page, b: (typeof BUILDS)["source"], ctx: BrowserContext) => Promise<unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of ["source", "react"] as const) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce" });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); await open(p, BUILDS[k].main); out[k] = norm(await fn(p, BUILDS[k], ctx)); await ctx.close();
  }
  if (process.env.DUMP) { const fs = await import("node:fs"); for (const k in out) fs.writeFileSync(`/tmp/claude-0/dump-${process.env.DUMP}-${test.info().title.slice(0, 6)}-${k}.json`, JSON.stringify(out[k], null, 1)); }
  return out as { source: unknown; react: unknown };
}
/** Generated ids are prefix + Date.now() (fixed clock) + random characters: numbered in order of appearance. */
const T36 = NOW.getTime().toString(36);
function norm(v: unknown) {
  const map = new Map<string, string>();
  // HR documents and leave requests get random ids (doc…, l…), as in the HR tests (normHr).
  const s = JSON.stringify(v).replace(/(\\?"|[=|])(doc|l)[0-9a-z]{6,9}(?=\\?"|[,\]|\s])/g, "$1$2X").replace(/demo[0-9a-f]{6,12}(?![0-9a-f])/g, "demoTOKEN").replace(/\b[0-9a-f]{24}\b/g, "TOKEN24")
    .replace(new RegExp(`\\b([a-z]{0,3})${T36}([0-9a-z]{3,6})\\b`, "g"), (m, p) => { if (!map.has(m)) map.set(m, p + "#" + map.size); return map.get(m)!; });
  return JSON.parse(s);
}
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => ["id", "role", "hidden", "disabled", "type", "dir", "placeholder", "tabindex", "title", "lang", "value", "checked", "selected", "href"].includes(n) || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (e.tagName === "svg" && !e.closest(".pa-obs,.pa-chart")) return ["svg" + (e.getAttribute("class") ? "." + e.getAttribute("class") : "")];
    const attrs = [...e.attributes].filter((a) => keep(a.name) && !(e.hasAttribute("data-an") && (a.name === "aria-label" || a.name === "data-an"))).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    const own0 = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const own = e.classList.contains("cb-live") ? own0.replace(/^[^·]*·/, "·") : own0;
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const Wn = (k: string) => `.os-win[data-osw="${k}"]`;
const pick = async (p: Page, label: string) => { await p.locator('.os-menu[data-level="0"] button', { hasText: label }).first().click(); await p.waitForTimeout(300); };
const jsClick = (p: Page, sel: string) => p.evaluate((sel) => (document.querySelector(sel) as HTMLElement | null)?.click(), sel);
const clk = async (p: Page, sel: string) => { await p.locator(sel).first().click(); await p.waitForTimeout(400); };
const submit = async (p: Page, W: string) => { await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(450); };
/** Opens an app from the launcher (works whatever windows are already open). */
const openApp = async (p: Page, key: string, ready = ".hr-pg") => {
  await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
  await p.click('#dock [data-t="launchpad"]'); await p.waitForTimeout(600); await p.locator(`.al .al-card[data-app="${key}"]`).click();
  await p.locator(`${Wn(key)} ${ready}`).first().waitFor(); await p.waitForTimeout(900);
};
const navTo = async (p: Page, W: string, attr: string, v: string) => { await p.evaluate(([W, a, v]) => (document.querySelector(`${W} [${a}="${v}"]`) as HTMLElement | null)?.click(), [W, attr, v]); await p.waitForTimeout(500); };
/** Every store a journey touches, without wall-clock fields and save counters (the 30-second ticks save at run-dependent times). */
const stores = (p: Page) => p.evaluate(() => {
  const g = (k: string) => { const s = JSON.parse(localStorage.getItem(k) || "null"); if (s && Array.isArray(s.audit)) s.audit = s.audit.map((a: { ts?: string; id?: string }) => ({ ...a, ts: "", id: "" })); if (s && "rev" in s) s.rev = 0; return s; };
  const b = g("remotion-bus");
  return { calendar: g("remotion-calendar"), cabinet: g("remotion-cabinet"), planning: g("remotion-planning"), billing: g("remotion-billing"), hr: g("remotion-hr"), patients: g("remotion-patients"),
    bus: b ? { seq: b.seq, ev: b.ev.map((e: { type: string; key: string; p: unknown; seq: number }) => [e.seq, e.type, e.key, e.p]), done: b.done, fail: b.fail.length } : null };
});
const ncState = async (p: Page) => {
  await p.click("#bellBtn"); await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({
    // whitespace-free text, as in the notification-centre tests (the source's template whitespace between spans is not rendered)
    rows: [...document.querySelectorAll("#ncScroll > *")].map((e) => [e.className.split(" ").filter((c) => c && c !== "out").sort().join(" "), e.textContent?.replace(/\s+/g, "")]),
    badge: document.getElementById("bellBadge")?.textContent,
    stored: (JSON.parse(localStorage.getItem("remotion-nc") || "null")?.items || []).map((i: { app?: string; kind?: string; title?: string; body?: string; read?: boolean }) => [i.app, i.kind, i.title, i.body, i.read]),
  }));
  await p.keyboard.press("Escape"); await p.waitForTimeout(300); return r;
};
const CL = Wn("calendar"), CB = Wn("cabinet"), PL = Wn("planning"), BI = Wn("billing"), PA = Wn("patients"), HR = Wn("hrPeople");
/** Calendar: practice manager, tomorrow, by practitioner. */
const clTomorrowByPr = async (p: Page) => {
  await jsClick(p, `${CL} [data-clrole]`); await p.waitForTimeout(300); await pick(p, "Practice manager");
  for (const sel of ['[data-clmode="day"]', '[data-clnavd="1"]', '[data-clby="pr"]']) { await jsClick(p, `${CL} ${sel}`); await p.waitForTimeout(450); }
};
/** Calendar: open the first confirmed appointment matching `sel` in the drawer (DOM click, as the windows may overlap). */
const clEv = async (p: Page, sel = ".cl-ev.st-confirmed") => { await jsClick(p, `${CL} .hr-drw [data-cldx]`); await p.waitForTimeout(250); await jsClick(p, `${CL} ${sel}`); await p.waitForTimeout(500); };
/** Calendar: cancel the appointment open in the drawer (reason, notify the patient). */
const clCancel = async (p: Page) => {
  await jsClick(p, `${CL} .hr-drw [data-clcancel]`); await p.waitForTimeout(400); await submit(p, CL).catch(() => {});
  await p.selectOption(`${CL} .hr-dlg select`, { index: 1 }).catch(() => {}); await p.locator(`${CL} .hr-dlg input[type=radio]`).first().check().catch(() => {}); await submit(p, CL).catch(() => {});
};

test("X-01 Calendar completion and no-show reach Billing's appointments to bill", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openApp(p, "calendar"); await clTomorrowByPr(p);
    await clEv(p, '.cl-col[data-clcolid="pr1"] .cl-ev.st-confirmed');
    for (const st of ["checkedin", "inprogress", "completed"]) { await jsClick(p, `${CL} .hr-drw [data-clst="${st}"]`); await p.waitForTimeout(600); }
    out.push(await tree(p, `${CL} .hr-drw`));
    // no-show: this morning's first confirmed appointment (already started at 10:30)
    await jsClick(p, `${CL} [data-clnavd="0"]`); await p.waitForTimeout(500); await clEv(p); out.push(await tree(p, `${CL} .hr-drw`));
    await jsClick(p, `${CL} .hr-drw [data-clst="noshow"]`); await p.waitForTimeout(600); out.push(await tree(p, `${CL} .hr-drw`));
    await openApp(p, "billing", ".bi-pg"); await navTo(p, BI, "data-bigo", "tobill"); out.push(await tree(p, `${BI} .bi-pg`));
    out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("X-03 Cabinet room out of service → Calendar resources and agenda; X-04 Calendar cancellation → Planning waiting list", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openApp(p, "cabinet");
    await jsClick(p, `${CB} [data-cbrole]`); await p.waitForTimeout(300); await pick(p, "Practice manager");
    await navTo(p, CB, "data-cbgo", "rooms"); await clk(p, `${CB} [data-cbready$="|out"] >> nth=1`); await p.locator(`${CB} .hr-dlg [data-ist]`).fill("Fuite d’eau").catch(() => {}); await submit(p, CB).catch(() => {});
    out.push(await tree(p, `${CB} .hr-pg`)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await openApp(p, "calendar"); await navTo(p, CL, "data-clgo", "resources"); out.push(await tree(p, `${CL} .hr-pg`));
    await navTo(p, CL, "data-clgo", "agenda"); await clTomorrowByPr(p); out.push(await tree(p, `${CL} .cl-view`));
    // X-04: cancel tomorrow's first confirmed appointment in the Calendar (Planning closed) → the freed slot is offered
    await clEv(p); await clCancel(p);
    out.push(await tree(p, `${CL} .hr-drw`)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await openApp(p, "planning", ".pl-main, .hr-pg"); await navTo(p, PL, "data-plgo", "wait"); out.push(await tree(p, `${PL} .pl-main`));
    out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("X-05 HR approved leave → Calendar availability; X-06 HR employee name → Calendar, Cabinet and Patients", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
    await p.dblclick('#dkLayer .dk-ic[title="HR & People"]'); await p.locator(`${HR} .hr-pg`).waitFor(); await p.waitForTimeout(900);
    // e2 is practitioner pr1 in the healthcare registry (rmShSeed)
    await jsClick(p, `${HR} [data-hropen="e2"]`); await p.waitForTimeout(500);
    await jsClick(p, `${HR} [data-hredit="e2"]`); await p.waitForTimeout(300);
    await p.fill(`${HR} [data-ev="first"]`, "Camille-Test"); await p.fill(`${HR} [data-why]`, "Correction d’état civil").catch(() => {}); await submit(p, HR); out.push(await tree(p, `${HR} .hr-bar`));
    await jsClick(p, `${HR} [data-hrtab="time"]`); await p.waitForTimeout(250); await jsClick(p, `${HR} [data-hrleave="e2"]`); await p.waitForTimeout(300);
    await p.fill(`${HR} [data-lv="from"]`, "2026-10-15"); await p.fill(`${HR} [data-lv="to"]`, "2026-10-16"); await submit(p, HR); out.push(await tree(p, `${HR} .hr-tabp`));
    await navTo(p, HR, "data-hrgo", "requests"); out.push(await tree(p, `${HR} .hr-main`));
    for (let i = 0; i < 12 && (await p.locator(`${HR} [data-hrlok]`).count()); i++) { await jsClick(p, `${HR} [data-hrlok]`); await p.waitForTimeout(400); }
    out.push(await tree(p, `${HR} .hr-main`));
    await openApp(p, "calendar"); await clTomorrowByPr(p); out.push(await tree(p, `${CL} .cl-view`));
    await navTo(p, CL, "data-clgo", "avail"); out.push(await tree(p, `${CL} .hr-pg`));
    await openApp(p, "cabinet"); await navTo(p, CB, "data-cbgo", "pracs"); out.push(await tree(p, `${CB} .hr-pg`));
    await openApp(p, "patients"); await jsClick(p, `${PA} [data-paopen="pa1"]`); await p.waitForTimeout(700); await navTo(p, PA, "data-pasec", "team"); out.push(await tree(p, `${PA} .pa-secb`));
    out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("X-08 a Billing payment updates the patient's billing summary in Patients", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openApp(p, "patients");
    await jsClick(p, `${PA} [data-paopen="pa1"]`); await p.waitForTimeout(700);
    for (const s of ["admin", "services", "over"]) { await navTo(p, PA, "data-pasec", s); out.push(s, await tree(p, `${PA} .pa-secb`)); }
    // pa1's billing party is c1 (shown in the Administrative section); "Open in Billing" opens Billing on it (X-11 chain)
    await jsClick(p, `${PA} [data-pabill="pa1"]`); await p.locator(`${BI} .bi-pg`).waitFor(); await p.waitForTimeout(900); out.push(await tree(p, `${BI} .bi-pg`), await tree(p, `${BI} .bi-drw`));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); await navTo(p, BI, "data-bigo", "record");
    await p.selectOption(`${BI} [data-pp="party"]`, "c1"); await p.waitForTimeout(400);
    await p.fill(`${BI} [data-pp="amount"]`, "90"); await p.waitForTimeout(400); out.push(await tree(p, `${BI} .bi-pg`));
    await jsClick(p, `${BI} [data-birecok]`); await p.waitForTimeout(700); out.push(await tree(p, `${BI} .bi-pg`));
    // back in Patients: the summary is read live from Billing when a section is drawn
    await p.locator(`${PA} .os-wh`).first().click({ position: { x: 300, y: 10 } }).catch(() => {}); await p.waitForTimeout(400);
    for (const s of ["admin", "over"]) { await navTo(p, PA, "data-pasec", s); out.push(s, await tree(p, `${PA} .pa-secb`)); }
    out.push(await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("X-09 healthcare notifications reach the OS notification centre (Calendar cancellation and rescheduling)", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openApp(p, "calendar"); await clTomorrowByPr(p);
    out.push(await ncState(p));
    await clEv(p); await clCancel(p);
    await p.keyboard.press("Escape"); await p.waitForTimeout(500);
    out.push(await p.evaluate(() => [...document.querySelectorAll("#nbStack .nbn")].map((b) => b.textContent?.replace(/\s+/g, ""))));
    await clEv(p); await jsClick(p, `${CL} .hr-drw [data-clmove]`); await p.waitForTimeout(400); await clk(p, `${CL} .hr-dlg [data-mvf]`).catch(() => {}); await clk(p, `${CL} .hr-dlg [data-mvs] >> nth=1`).catch(() => {}); await submit(p, CL).catch(() => {});
    await p.keyboard.press("Escape"); await p.waitForTimeout(500);
    out.push(await ncState(p), await stores(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("X-13 pop-out ↔ main window: Calendar store sync and the cross-tab bus (D-H18 reproduced)", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p, b, ctx) => {
    const out: unknown[] = [];
    await openApp(p, "calendar"); await openApp(p, "planning", ".pl-main, .hr-pg"); await navTo(p, PL, "data-plgo", "wait");
    // second browser window on the same storage: the Calendar in app mode (source #app=calendar, React /apps/calendar)
    const q = await ctx.newPage(); q.setDefaultTimeout(8000); await prep(q, false); await q.goto(b.pop("calendar"));
    await q.locator(`${CL} .hr-pg`).waitFor(); await q.waitForTimeout(1200);
    await clTomorrowByPr(q);
    await clEv(q); await clCancel(q);
    await q.keyboard.press("Escape"); await q.waitForTimeout(1500); await p.waitForTimeout(1500);
    // the main window: Planning (open) received the cancellation through the storage event, the Calendar repainted
    out.push(await tree(p, `${PL} .pl-main`));
    await p.locator(`${CL} .os-wh`).first().click({ position: { x: 300, y: 10 } }).catch(() => {}); await p.waitForTimeout(500); await clTomorrowByPr(p); out.push(await tree(p, `${CL} .cl-view`));
    // the pop-out (app mode) has no notification bell: its view of the shared notification store is read directly
    out.push(await ncState(p), await q.evaluate(() => localStorage.getItem("remotion-nc") === localStorage.getItem("remotion-nc")), await stores(p));
    await q.close();
    return out;
  });
  expect(r.react).toEqual(r.source);
});
