/** Phase C slice 12 — HR & Payroll (native port): dual-run parity (source file:// vs React shell). */
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
const menu = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.os-menu[data-level="0"] > *')].map((e) => (e.textContent || "").replace(/\s+/g, " ").trim() + (e.hasAttribute("disabled") ? " [x]" : "")));
/** HR generated ids (audit "a…", documents "doc…", leaves "l…", import temps) differ between runs. */
function normHr(v: unknown) { return JSON.parse(JSON.stringify(v).replace(/\b(a|doc|l|tmp|c)[0-9a-z]{6,14}\b/g, "$1X")); }
const W = '.os-win[data-osw="hrPeople"]';
const hr = (p: Page) => tree(p, `${W} .hr`);
const pg = (p: Page) => tree(p, `${W} .hr-pg`);
const hrStore = (p: Page) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem("remotion-hr") || "null"); if (s) s.audit = (s.audit || []).map((a: { id: string; ts: string }) => ({ ...a, id: "", ts: "" })); return s; });
const dlg = (p: Page) => tree(p, `${W} .hr-dlg`);
const drw = (p: Page) => tree(p, `${W} .hr-drw`);
const hrToast = (p: Page) => p.locator(`${W} .hr-toast`).evaluate((e) => [e.className, e.textContent]);
const openHr = async (p: Page) => { /* the workspace menu opened at load can still cover the icons under load */ await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {}); await p.dblclick('#dkLayer .dk-ic[title="HR & People"]'); await p.locator(`${W} .hr-pg`).waitFor(); await p.waitForTimeout(900); };
const go = async (p: Page, view: string) => { await p.click(`${W} [data-hrgo="${view}"]`); await p.waitForTimeout(400); };
const pick = async (p: Page, label: string) => { await p.locator('.os-menu[data-level="0"] button', { hasText: label }).first().click(); await p.waitForTimeout(250); };
const r2 = async (browser: Browser, baseURL: string | undefined, fn: (p: Page) => Promise<unknown>) => { const r = await both(browser, baseURL, fn); return { source: normHr(r.source), react: normHr(r.react) }; };

test("open: shell, navigation, employees list, KPIs, layout size, store", async ({ browser, baseURL }) => {
  const r = await r2(browser, baseURL, async (p) => {
    await openHr(p);
    return [await hr(p), await p.getAttribute(`${W} .hr`, "data-sz"), await hrStore(p), await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => (b as HTMLElement).dataset.t + ":" + b.className))];
  });
  expect(r.react).toEqual(r.source);
});

test("employees: search, filters, chips, sort, columns, density, grouping, pagination, cards, selection, bulk bar, saved searches", async ({ browser, baseURL }) => {
  const r = await r2(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openHr(p);
    await p.click(`${W} [data-hrview="list"]`); await p.waitForTimeout(300); out.push(await pg(p));
    await p.fill(`${W} [data-hrq]`, "inf"); await p.waitForTimeout(400); out.push(await pg(p));
    await p.fill(`${W} [data-hrq]`, ""); await p.waitForTimeout(400);
    await p.click(`${W} [data-hrfilt]`); await p.waitForTimeout(200); out.push(await tree(p, `${W} [data-hrfp]`));
    await p.click(`${W} [data-hrfc="ctype|cdd"]`); await p.waitForTimeout(250); await p.selectOption(`${W} [data-hrf="est"]`, "s1"); await p.waitForTimeout(250); out.push(await pg(p));
    await p.click(`${W} [data-hrfx="est|"]`); await p.waitForTimeout(250); await p.click(`${W} [data-hrfreset]`); await p.waitForTimeout(250); out.push(await pg(p));
    await p.click(`${W} [data-hrcol="entry"]`); await p.waitForTimeout(200); await p.click(`${W} [data-hrcol="entry"]`); await p.waitForTimeout(200); out.push(await tree(p, `${W} .hr-tbs`));
    await p.selectOption(`${W} [data-hrsort]`, "job"); await p.waitForTimeout(200); await p.click(`${W} [data-hrdir]`); await p.waitForTimeout(200); out.push(await tree(p, `${W} .hr-tbs`));
    await p.click(`${W} [data-hrcols]`); await p.waitForTimeout(200); out.push(await menu(p)); await pick(p, "Manager"); out.push(await tree(p, `${W} .hr-tbs`));
    await p.click(`${W} [data-hrcols]`); await pick(p, "Compact"); await p.click(`${W} [data-hrcols]`); await pick(p, "By department"); out.push(await tree(p, `${W} .hr-tbs`));
    await p.click(`${W} [data-hrcols]`); await pick(p, "Restore default"); out.push(await hrToast(p));
    await p.selectOption(`${W} [data-hrsize]`, "10"); await p.waitForTimeout(250); await p.click(`${W} [data-hrpg="1"]`); await p.waitForTimeout(250); out.push(await tree(p, `${W} .hr-pager`), await tree(p, `${W} .hr-tbs`));
    await p.click(`${W} [data-hrpgn="0"]`); await p.waitForTimeout(250);
    await p.click(`${W} [data-hrleft]`); await p.waitForTimeout(250); out.push(await tree(p, `${W} .hr-rc`));
    await p.click(`${W} [data-hrkpi]`, { position: { x: 20, y: 20 } }).catch(() => {}); await p.waitForTimeout(250);
    await p.locator(`${W} [data-hrsel]`).nth(1).check(); await p.locator(`${W} [data-hrsel]`).nth(3).click({ modifiers: ["Shift"] }).catch(() => {}); await p.waitForTimeout(200); out.push(await tree(p, `${W} .hr-bulk`));
    await p.click(`${W} [data-hrselall]`); await p.waitForTimeout(200); out.push(await tree(p, `${W} .hr-bulk`)); await p.click(`${W} [data-hrselx]`); await p.waitForTimeout(200);
    await p.click(`${W} [data-hrsaved]`); await p.waitForTimeout(200); out.push(await menu(p)); await pick(p, "Contracts ending soon"); out.push(await pg(p));
    await p.click(`${W} [data-hrview="cards"]`); await p.waitForTimeout(300); out.push(await pg(p));
    out.push(await hrStore(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("employee: drawer, row menu, profile tabs, edit, amendment, leave request, documents, contract dialog", async ({ browser, baseURL }) => {
  const r = await r2(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openHr(p);
    await p.click(`${W} [data-hrview="list"]`); await p.waitForTimeout(300);
    await p.click(`${W} tr[data-hrrow="e4"] td:nth-child(3)`); await p.waitForTimeout(400); out.push(await drw(p));
    await p.click(`${W} [data-hrdx]`).catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await p.click(`${W} [data-hrrm="e4"]`); await p.waitForTimeout(200); out.push(await menu(p)); await p.keyboard.press("Escape");
    await p.click(`${W} [data-hropen="e4"]`); await p.waitForTimeout(500); out.push(await pg(p), await tree(p, `${W} .hr-bar`));
    for (const t of ["contract", "time", "docs", "personal", "hist", "over"]) { await p.click(`${W} [data-hrtab="${t}"]`).catch(() => {}); await p.waitForTimeout(250); out.push(t, await tree(p, `${W} .hr-tabp`)); }
    await p.click(`${W} [data-hredit="e4"]`); await p.waitForTimeout(300); out.push(await dlg(p));
    await p.fill(`${W} [data-ev="team"]`, "Accueil & standard"); await p.fill(`${W} [data-ev="hours"]`, "30"); await p.fill(`${W} [data-why]`, "Réorganisation"); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400);
    out.push(await pg(p), await hrToast(p));
    await p.click(`${W} [data-hrtab="contract"]`); await p.waitForTimeout(250); await p.click(`${W} [data-hramend="e4"]`); await p.waitForTimeout(300); out.push(await dlg(p));
    await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(250); out.push(await tree(p, `${W} .hr-dlg [data-dlgerr]`));
    await p.fill(`${W} [data-av="why"]`, "Prolongation"); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400); out.push(await tree(p, `${W} .hr-tabp`));
    await p.click(`${W} [data-hrtab="time"]`); await p.waitForTimeout(250); await p.click(`${W} [data-hrleave="e4"]`); await p.waitForTimeout(300); out.push(await dlg(p));
    await p.fill(`${W} [data-lv="from"]`, "2026-11-02"); await p.fill(`${W} [data-lv="to"]`, "2026-11-04"); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400); out.push(await tree(p, `${W} .hr-tabp`));
    await p.click(`${W} [data-hrtab="docs"]`); await p.waitForTimeout(250);
    await p.setInputFiles(`${W} [data-hrdocup]`, { name: "Avenant horaires.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") }).catch(() => {}); await p.waitForTimeout(500); out.push(await tree(p, `${W} .hr-tabp`));
    await p.click(`${W} [data-hrcontract="e4"]`).catch(() => {}); await p.waitForTimeout(300); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await p.click(`${W} [data-hrback]`).catch(() => {}); await p.waitForTimeout(500); out.push(await tree(p, `${W} .hr-bar`));
    out.push(await hrStore(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("roles, departures, archive, bulk actions with undo, add wizard, export and import", async ({ browser, baseURL }) => {
  const r = await r2(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openHr(p);
    await p.click(`${W} [data-hrview="list"]`); await p.waitForTimeout(300);
    await p.click(`${W} [data-hrrole]`); await p.waitForTimeout(200); out.push(await menu(p)); await pick(p, "Manager"); out.push(await hr(p));
    await p.click(`${W} [data-hrrole]`); await pick(p, "Administrator"); out.push(await tree(p, `${W} .hr-nav`));
    await p.locator(`${W} [data-hrsel]`).nth(0).check(); await p.locator(`${W} [data-hrsel]`).nth(2).check(); await p.waitForTimeout(200);
    await p.click(`${W} [data-hrbulk="dept"]`); await p.waitForTimeout(300); out.push(await dlg(p)); await p.selectOption(`${W} [data-bv]`, "d4"); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400); out.push(await hrToast(p), await tree(p, `${W} .hr-tbs`));
    await p.click(`${W} .hr-toast button`); await p.waitForTimeout(400); out.push(await tree(p, `${W} .hr-tbs`));
    await p.click(`${W} [data-hrrm="e9"]`); await pick(p, "Record a departure"); await p.waitForTimeout(300); out.push(await dlg(p));
    await p.fill(`${W} [data-dw]`, "Fin de CDD"); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400); out.push(await pg(p));
    await p.click(`${W} [data-hrleft]`); await p.waitForTimeout(300); await p.click(`${W} [data-hrrm="e12"]`); await p.waitForTimeout(200); out.push(await menu(p)); await pick(p, "Archive"); await p.waitForTimeout(300); out.push(await dlg(p)); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400); out.push(await pg(p));
    await p.click(`${W} [data-hradd]`); await p.waitForTimeout(300); out.push(await dlg(p));
    await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(300); out.push(await tree(p, `${W} .hr-dlg [data-hwerr]`));
    await p.fill(`${W} [data-hw="first"]`, "Camille"); await p.fill(`${W} [data-hw="last"]`, "Exemple"); await p.fill(`${W} [data-hw="email"]`, "camille.exemple@exemple-sante.invalid"); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400);
    await p.fill(`${W} [data-hw="job"]`, "Infirmière"); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400);
    await p.selectOption(`${W} [data-hw="dept"]`, "d2"); await p.selectOption(`${W} [data-hw="est"]`, "s1"); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400); out.push(await dlg(p));
    for (let i = 0; i < 4; i++) { await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(400); }
    out.push(await dlg(p)); await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(500); out.push(await pg(p), await hrToast(p));
    await p.click(`${W} [data-hrexport="all"]`); await p.waitForTimeout(300); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await p.click(`${W} [data-hrimport]`); await p.waitForTimeout(300); out.push(await dlg(p));
    const csv = "Matricule;Prénom;Nom;E-mail professionnel;Poste;Département;Établissement;Type de contrat;Date d'entrée\n;Jules;Martin;jules.martin@exemple-sante.invalid;Kinésithérapeute;Rééducation;Cabinet Paris 11e;CDI;01/09/2026\n;Hugo;Bernard;hugo.bernard@exemple-sante.invalid;Kinésithérapeute;Rééducation;Cabinet Paris 11e;CDI;2021-09-01\n;Sans;Email;;Poste;Inconnu;Cabinet Paris 11e;CDI;2026-01-01\n";
    await p.setInputFiles(`${W} [data-hifile]`, { name: "import.csv", mimeType: "text/csv", buffer: Buffer.from(csv) }); await p.waitForTimeout(600); out.push(await dlg(p));
    await p.selectOption(`${W} [data-himap="email"]`, "3"); await p.waitForTimeout(300); out.push(await tree(p, `${W} .hr-dlg .bd`));
    for (let i = 0; i < 3; i++) { await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(600); out.push(await tree(p, `${W} .hr-dlg .bd`)); }
    await p.waitForTimeout(1200); out.push(await dlg(p));
    out.push(await hrStore(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("other pages: dashboard, directory, contracts, org chart, documents, leave calendar, requests, salaries, settings, coming-soon pages, language switch", async ({ browser, baseURL }) => {
  const r = await r2(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openHr(p);
    for (const v of ["dash", "directory", "contracts", "orgchart", "hrdocs", "leaves", "requests", "settings", "jobs", "payruns", "skills"]) { await go(p, v).catch(() => {}); out.push(v, await tree(p, `${W} .hr-main`)); }
    await go(p, "requests"); await p.locator(`${W} [data-hrlok]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await pg(p));
    await go(p, "orgchart"); await p.locator(`${W} [data-hroc]`).first().click().catch(() => {}); await p.waitForTimeout(300); out.push(await pg(p));
    await go(p, "leaves"); await p.locator(`${W} [data-hrlo]`).last().click().catch(() => {}); await p.waitForTimeout(300); out.push(await pg(p));
    await go(p, "directory"); await p.fill(`${W} [data-hrdq]`, "kin").catch(() => {}); await p.waitForTimeout(400); out.push(await pg(p));
    await p.click(`${W} [data-hrrole]`); await pick(p, "Payroll officer"); await go(p, "salaries"); out.push(await tree(p, `${W} .hr-main`));
    await p.click(`${W} [data-hrtog="time"]`); await p.waitForTimeout(450); out.push(await tree(p, `${W} .hr-nav`));
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1200); out.push(await hr(p), await p.getAttribute(W, "aria-label"));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
