/**
 * Phase C slice 14 — Patients & Records (native port, gated with ?health=native): dual-run parity (source file:// vs
 * React shell). Calendar and Cabinet are still bridged, so the cards and buttons they add to the patient record
 * through PA_HOOKS (source L26060–L26065, L26661) are taken out of BOTH trees before comparing; they come back into the
 * comparison when those apps are ported (doc 15, slice 14).
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

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
 * Generated ids are prefix + Date.now() (fixed clock) + random characters (4 for Patients, 5 for the bus and Billing):
 * numbered in order of appearance. Seeded document sizes come from Math.random in the source: normalised.
 */
const T36 = NOW.getTime().toString(36);
function norm(v: unknown) {
  const map = new Map<string, string>();
  const s = JSON.stringify(v).replace(/(\\"_id\\":\\")d[0-9a-z]{1,8}/g, "$1D")
    .replace(new RegExp(`\\b([a-z]{0,3})${T36}([0-9a-z]{4,5})\\b`, "g"), (m, p) => { if (!map.has(m)) map.set(m, p + "#" + map.size); return map.get(m)!; })
    .replace(/\\"size\\":\d+/g, "\\\"size\\\":0").replace(/"size":\d+/g, '"size":0').replace(/\b\d+([.,]\d+)?\s?(Ko|KB|kB|ko|Mo|MB)\b/g, "N KB");
  return JSON.parse(s);
}
/** Serialised subtree, without the parts that Calendar / Cabinet inject into Patients (see the file header). */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const hook = (e: Element) => e.matches("[data-paappt],[data-paapptopen],[data-paapptcal]") || (e.matches("section.pa-card") && (!!e.querySelector(".cl-pa,[data-paapptcal]") || /\((Gestion Calendrier|Calendar|Kalender|Gestion Cabinet|Practice|Praxis|التقويم|العيادة)\)/.test(e.querySelector("h3")?.textContent || ""))) || (e.matches(".hr-fld") && !!e.querySelector("#ce-appt"));
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
const W = '.os-win[data-osw="patients"]';
const pa = (p: Page) => tree(p, `${W} .pa`);
const pg = (p: Page) => tree(p, `${W} .hr-pg`);
const dlg = (p: Page) => tree(p, `${W} .hr-dlg`);
const drw = (p: Page) => tree(p, `${W} .hr-drw`);
const toastOf = (p: Page) => p.locator(`${W} .hr-toast`).evaluate((e) => [e.className, e.textContent]);
const store = (p: Page) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem("remotion-patients") || "null"); if (s) s.audit = (s.audit || []).map((a: { ts: string }) => ({ ...a, ts: "" })); return s; });
const bus = (p: Page) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem("remotion-bus") || "null"); return s ? s.ev.map((e: { type: string; key: string; p: unknown }) => [e.type, e.key, e.p]) : null; });
const openPa = async (p: Page) => {
  await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
  await p.dblclick('#dkLayer .dk-ic[title="Patients"] >> nth=1'); await p.locator(`${W} .hr-pg`).waitFor(); await p.waitForTimeout(900);
};
const go = async (p: Page, view: string) => { await p.evaluate(([W, v]) => (document.querySelector(`${W} [data-pago="${v}"]`) as HTMLElement | null)?.click(), [W, view]); await p.waitForTimeout(450); };
const sec = async (p: Page, s: string) => { await p.evaluate(([W, v]) => (document.querySelector(`${W} [data-pasec="${v}"]`) as HTMLElement | null)?.click(), [W, s]); await p.waitForTimeout(400); };
const pick = async (p: Page, label: string) => { await p.locator('.os-menu[data-level="0"] button', { hasText: label }).first().click(); await p.waitForTimeout(300); };
const submit = async (p: Page) => { await p.click(`${W} .hr-dlg button[type=submit]`); await p.waitForTimeout(450); };
const role = async (p: Page, label: string) => { await p.click(`${W} [data-parole]`); await p.waitForTimeout(250); await pick(p, label); await p.waitForTimeout(300); };

test("open: shell, directory, KPIs, layout size, dock button, no store before a change", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openPa(p);
    return [await pa(p), await p.getAttribute(`${W} .pa`, "data-sz"), await store(p), await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => (b as HTMLElement).dataset.t + ":" + b.className)), await p.getAttribute(W, "aria-label")];
  });
  // Approved fix D-B05: the running Patients button gets the `os-run` mark the source never sets (no OS_DOCK key).
  const fixed = JSON.parse(JSON.stringify(r.react).replace('"patients:fe-dockb os-run"', '"patients:fe-dockb"'));
  expect(fixed).toEqual(r.source);
});

test("directory: search, filters and chips, sort, saved searches, pagination, peek drawer, keyboard, global search", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openPa(p);
    await p.fill(`${W} [data-paq]`, "mo"); await p.waitForTimeout(500); out.push(await pg(p));
    await p.fill(`${W} [data-paq]`, ""); await p.waitForTimeout(500);
    await p.click(`${W} [data-pafilt]`); await p.waitForTimeout(300); out.push(await pg(p));
    await p.selectOption(`${W} [data-paf="est"]`, { index: 1 }); await p.waitForTimeout(400); await p.click(`${W} [data-pafc="minor"]`); await p.waitForTimeout(400); out.push(await pg(p));
    await p.selectOption(`${W} [data-paf="status"]`, { index: 2 }); await p.waitForTimeout(400); out.push(await pg(p));
    await p.selectOption(`${W} [data-paf="status"]`, { index: 0 }); await p.selectOption(`${W} [data-paf="est"]`, { index: 0 }); await p.click(`${W} [data-pafc="minor"]`); await p.waitForTimeout(400);
    await p.click(`${W} [data-pacol="birth"]`); await p.waitForTimeout(300); await p.click(`${W} [data-pacol="birth"]`); await p.waitForTimeout(300); out.push(await tree(p, `${W} .hr-tbs`));
    await p.selectOption(`${W} [data-pasort]`, { index: 1 }); await p.waitForTimeout(300); await p.click(`${W} [data-padir]`); await p.waitForTimeout(300); out.push(await tree(p, `${W} .hr-tbs`));
    await p.click(`${W} [data-pasavedm]`); await p.waitForTimeout(250); out.push(await menu(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.click(`${W} [data-pasaved="incomplete"]`); await p.waitForTimeout(400); out.push(await pg(p));
    await p.click(`${W} [data-pasaved=""]`); await p.waitForTimeout(400);
    await p.selectOption(`${W} [data-pasize]`, { index: 0 }); await p.waitForTimeout(300); await p.click(`${W} [data-papg="1"]`).catch(() => {}); await p.waitForTimeout(300); out.push(await pg(p));
    await p.locator(`${W} [data-papeek]`).first().click(); await p.waitForTimeout(500); out.push(await drw(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await p.fill(`${W} [data-pagq]`, "lu"); await p.waitForTimeout(500); out.push(await tree(p, `${W} .pa-gres`));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("record: every section of the patient file and of the medical record, care-team gate and emergency access", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openPa(p);
    await p.click(`${W} [data-paopen="pa1"]`); await p.waitForTimeout(700); out.push(await pg(p));
    for (const s of ["identity", "contact", "family", "admin", "team", "prefs", "consent", "docs", "services", "activity", "hist", "allergies", "problems", "meds", "enc", "obs", "labs", "imaging", "assess", "plans", "therapy", "cdocs", "timeline"]) { await sec(p, s); out.push(s, await tree(p, `${W} .pa-secb`)); }
    await go(p, "list"); await p.click(`${W} [data-paopen="pa9"]`).catch(() => {}); await p.waitForTimeout(600); await sec(p, "allergies"); out.push(await tree(p, `${W} .pa-secb`));
    await p.click(`${W} [data-pabg]`).catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p));
    await p.fill(`${W} .hr-dlg textarea, ${W} .hr-dlg input:not([type=hidden])`, "Appel du SAMU, patient inconscient").catch(() => {}); await submit(p); out.push(await tree(p, `${W} .pa-secb`), await toastOf(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("clinical: add allergy, amend with reason, entered in error, sign a note and addendum, therapy goal / point / note, observations", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openPa(p);
    await p.click(`${W} [data-paopen="pa1"]`); await p.waitForTimeout(700);
    await sec(p, "allergies"); await p.click(`${W} [data-paadd="allergies"]`); await p.waitForTimeout(400); out.push(await dlg(p));
    await submit(p); out.push(await tree(p, `${W} .hr-dlg [data-dlgerr]`));
    await p.fill(`${W} .hr-dlg [data-ce="substance"]`, "Latex"); await submit(p); out.push(await tree(p, `${W} .pa-secb`), await toastOf(p));
    await p.locator(`${W} [data-paem^="allergies|"]`).first().click(); await p.waitForTimeout(250); out.push(await menu(p));
    await pick(p, "Edit").catch(() => {}); await p.waitForTimeout(300); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await p.locator(`${W} [data-paem^="allergies|"]`).last().click(); await p.waitForTimeout(250); await pick(p, "error").catch(() => {}); await p.waitForTimeout(300); out.push(await dlg(p));
    await p.locator(`${W} .hr-dlg textarea, ${W} .hr-dlg input:not([type=hidden])`).first().fill("Saisi sur le mauvais dossier").catch(() => {}); await submit(p); out.push(await tree(p, `${W} .pa-secb`));
    await p.click(`${W} [data-pashowerr]`); await p.waitForTimeout(300); out.push(await tree(p, `${W} .pa-secb`));
    await sec(p, "enc"); await p.locator(`${W} [data-paencsign]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p)); await submit(p).catch(() => {}); out.push(await tree(p, `${W} .pa-secb`));
    await p.locator(`${W} [data-paencadd]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p));
    await p.locator(`${W} .hr-dlg textarea`).first().fill("Ajout : douleur réévaluée à 3/10.").catch(() => {}); await p.locator(`${W} .hr-dlg input:not([type=hidden]), ${W} .hr-dlg textarea`).last().fill("Oubli").catch(() => {}); await submit(p).catch(() => {}); out.push(await tree(p, `${W} .pa-secb`));
    await sec(p, "therapy"); await p.locator(`${W} [data-pathx^="goal|"]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p));
    await p.locator(`${W} .hr-dlg input:not([type=hidden]), ${W} .hr-dlg textarea`).first().fill("Monter les escaliers sans aide").catch(() => {}); await submit(p).catch(() => {});
    await p.locator(`${W} [data-papoint] input`).first().fill("6").catch(() => {}); await p.locator(`${W} [data-papoint] button`).first().click().catch(() => {}); await p.waitForTimeout(400);
    await p.locator(`${W} [data-pathx^="note|"]`).first().click().catch(() => {}); await p.waitForTimeout(400); await p.locator(`${W} .hr-dlg textarea`).first().fill("Bonne progression.").catch(() => {}); await submit(p).catch(() => {}); out.push(await tree(p, `${W} .pa-secb`));
    await sec(p, "obs"); await p.click(`${W} [data-paadd="obs"]`).catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    out.push(await store(p), await bus(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("patient file: edit identity, relation, consent, care team, documents, correction request, record menu", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openPa(p);
    await p.click(`${W} [data-paopen="pa2"]`); await p.waitForTimeout(700);
    await p.click(`${W} [data-paedit^="identity|"]`); await p.waitForTimeout(400); out.push(await dlg(p));
    await p.fill(`${W} .hr-dlg [data-ed="birthName"]`, "Lambert").catch(() => {}); await p.locator(`${W} .hr-dlg [data-edwhy], ${W} #ed-why`).first().fill("Erreur de saisie").catch(() => {}); await submit(p); out.push(await pg(p), await toastOf(p));
    await sec(p, "family"); await p.locator(`${W} [data-parel]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p));
    await p.fill(`${W} .hr-dlg [data-rl="name"]`, "Paul Exemple").catch(() => {}); await submit(p); out.push(await tree(p, `${W} .pa-secb`));
    await sec(p, "consent"); await p.locator(`${W} [data-pacons]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p)); await submit(p); out.push(await tree(p, `${W} .pa-secb`));
    await sec(p, "team"); await p.locator(`${W} [data-pateam]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await sec(p, "docs"); out.push(await tree(p, `${W} .pa-secb`));
    await p.setInputFiles(`${W} [data-padocup]`, { name: "ordonnance.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") }).catch(() => {}); await p.waitForTimeout(700); out.push(await dlg(p));
    await submit(p).catch(() => {}); out.push(await tree(p, `${W} .pa-secb`));
    await p.locator(`${W} [data-padocm]`).first().click().catch(() => {}); await p.waitForTimeout(250); out.push(await menu(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.locator(`${W} [data-pacorr]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await p.click(`${W} [data-parm="pa2"]`).catch(() => {}); await p.waitForTimeout(250); out.push(await menu(p)); await p.keyboard.press("Escape");
    out.push(await store(p), await bus(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("registration wizard: validation, duplicate warning, every step, creation", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openPa(p);
    await role(p, "Reception");
    await p.locator(`${W} [data-panew]`).first().click(); await p.waitForTimeout(500); out.push(await dlg(p));
    await submit(p); out.push(await dlg(p));
    await p.fill(`${W} .hr-dlg [data-rw="first"]`, "Camille").catch(() => {}); await p.fill(`${W} .hr-dlg [data-rw="last"]`, "Dupont").catch(() => {}); await p.fill(`${W} .hr-dlg [data-rw="birth"]`, "1984-03-12").catch(() => {}); await p.waitForTimeout(500); out.push(await dlg(p));
    await p.fill(`${W} .hr-dlg [data-rw="first"]`, "Nadia").catch(() => {}); await p.fill(`${W} .hr-dlg [data-rw="last"]`, "Exemple").catch(() => {}); await p.fill(`${W} .hr-dlg [data-rw="birth"]`, "1991-06-02").catch(() => {});
    for (let i = 0; i < 8; i++) { await submit(p).catch(() => {}); await p.waitForTimeout(300); out.push(await dlg(p)); }
    // The new record's avatar colour is derived from the digits of its generated id (random part): not compared.
    const page = ((await pg(p)) || []).map((l) => (l.includes("span.hr-avt") && l.endsWith("'NE'") ? l.replace(/--c:#[0-9a-f]{6};/, "--c:*;") : l));
    out.push(page, await toastOf(p), await store(p), await bus(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("data quality, archives, documents, forms, dashboard, roles (settings, audit), language switch", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openPa(p);
    for (const v of ["dash", "archives", "dups", "corr", "complete", "documents", "forms"]) { await go(p, v); out.push(v, await tree(p, `${W} .hr-main`)); }
    await go(p, "dups"); await p.locator(`${W} [data-pacompare]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await role(p, "Medical lead"); await go(p, "corr"); out.push(await pg(p));
    await p.locator(`${W} [data-pacorrok]`).first().click().catch(() => {}); await p.waitForTimeout(400); out.push(await dlg(p)); await submit(p).catch(() => {}); out.push(await pg(p));
    await role(p, "Administrator");
    for (const v of ["settings", "audit"]) { await go(p, v); out.push(v, await tree(p, `${W} .hr-main`)); }
    await go(p, "forms"); out.push(await pg(p));
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1200); out.push(await pa(p), await p.getAttribute(W, "aria-label"));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
