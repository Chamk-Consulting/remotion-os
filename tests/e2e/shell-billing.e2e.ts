/** Phase C slice 13 — Billing & Revenue (native port): dual-run parity (source file:// vs React shell). */
/* Buttons named by v94 a11yName (data-an) get their label on a 250 ms debounce in both versions: that label is
   compared by catchup-s7-a11y, not in these trees. */
import { test, expect, type Page, type Browser } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";

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
  for (const [k, url] of Object.entries({ source: SRC, react: "/?shell=react" })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, reducedMotion: "reduce", acceptDownloads: true });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); await open(p, url); out[k] = norm(await fn(p)); await ctx.close();
  }
  if (process.env.DUMP) { const fs = await import("node:fs"); for (const k in out) fs.writeFileSync(`/tmp/claude-0/dump-${process.env.DUMP}-${test.info().title.slice(0, 6)}-${k}.json`, JSON.stringify(out[k], null, 1)); }
  return out;
}
/**
 * Generated ids differ between runs only by their random part: Billing's biId is prefix + Date.now() (fixed clock) +
 * 5 random characters, the desktop's dkId likewise. They are numbered in order of appearance.
 */
const T36 = NOW.getTime().toString(36);
function norm(v: unknown) {
  const map = new Map<string, string>();
  const s = JSON.stringify(v).replace(/(\\"_id\\":\\")d[0-9a-z]{1,8}/g, "$1D").replace(new RegExp(`\\b([a-z]{0,2})${T36}([0-9a-z]{5})\\b`, "g"), (m, p) => { if (!map.has(m)) map.set(m, p + "#" + map.size); return map.get(m)!; });
  return JSON.parse(s);
}
/** Serialised subtree: tag, sorted classes, identity / state attributes, normalised inline style, value, own text. */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => ["id", "role", "hidden", "disabled", "type", "dir", "placeholder", "tabindex", "title", "lang", "value", "checked", "selected", "href", "src"].includes(n) || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (e.tagName === "svg" && !e.classList.contains("bi-chart")) return ["svg" + (e.getAttribute("class") ? "." + e.getAttribute("class") : "")];
    const attrs = [...e.attributes].filter((a) => keep(a.name) && !(e.hasAttribute("data-an") && (a.name === "aria-label" || a.name === "data-an"))).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const menu = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.os-menu[data-level="0"] > *')].map((e) => (e.textContent || "").replace(/\s+/g, " ").trim() + (e.hasAttribute("disabled") ? " [x]" : "")));
const W = '.os-win[data-osw="billing"]';
const bi = (p: Page) => tree(p, `${W} .bi`);
const main = (p: Page) => tree(p, `${W} .bi-main`);
const pg = (p: Page) => tree(p, `${W} .bi-pg`);
const dlg = (p: Page) => tree(p, `${W} .bi-dlg`);
const drw = (p: Page) => tree(p, `${W} .bi-drw`);
const toastOf = (p: Page) => p.locator(`${W} .bi-toast`).evaluate((e) => [e.className, e.textContent]);
/** The store, without the audit trail's wall-clock fields. */
const store = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem("remotion-billing") || "null"));
const openBi = async (p: Page) => { /* the workspace menu opened at load can still cover the icons under load */ await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {}); await p.dblclick('#dkLayer .dk-ic[title="Billing"]'); await p.locator(`${W} .bi-pg`).waitFor(); await p.waitForTimeout(700); };
/** Navigation buttons may sit in a closed group: the source's own click handler is reached through a DOM click. */
const go = async (p: Page, view: string) => { await p.evaluate(([W, v]) => (document.querySelector(`${W} [data-bigo="${v}"]`) as HTMLElement | null)?.click(), [W, view]); await p.waitForTimeout(450); };
const pick = async (p: Page, label: string) => { await p.locator('.os-menu[data-level="0"] button', { hasText: label }).first().click(); await p.waitForTimeout(300); };
/** Switch-styled checkboxes (visually hidden inputs): a DOM click, as the label would do. */
const dclick = async (p: Page, sel: string) => { await p.evaluate((sel) => (document.querySelector(sel) as HTMLElement).click(), sel); await p.waitForTimeout(400); };
const submit = async (p: Page) => { await p.click(`${W} .bi-dlg button[type=submit]`); await p.waitForTimeout(450); };

test("open: shell, dashboard, layout size, store, dock button, document styles", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openBi(p);
    return [await bi(p), await p.getAttribute(`${W} .bi`, "data-sz"), await store(p), await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => (b as HTMLElement).dataset.t + ":" + b.className)),
      await p.evaluate(() => document.getElementById("bi-doc-css")?.textContent?.length ?? 0), await p.getAttribute(W, "aria-label")];
  });
  expect(r.react).toEqual(r.source);
});

test("navigation: every page, nav groups, roles, simulated practitioner, global search, back stack", async ({ browser, baseURL }) => {
  const pages = ["dash", "activity", "reports", "invoices", "drafts", "tobill", "quotes", "credits", "recurring", "templates", "transactions", "record", "partial", "refunds", "methods", "recon", "alloc", "outstanding", "services", "pricing", "packages", "discounts", "taxes", "payers", "settings", "numbering", "legal", "terms", "integrations", "audit"];
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openBi(p);
    for (const v of pages) { await go(p, v); out.push(v, await main(p)); }
    await p.click(`${W} [data-biback]`); await p.waitForTimeout(450); out.push(await tree(p, `${W} .bi-hd`));
    await p.click(`${W} [data-bitog="cat"]`); await p.waitForTimeout(400); out.push(await tree(p, `${W} .bi-nav`));
    await p.click(`${W} [data-bitog="cat"]`); await p.waitForTimeout(400);
    await p.click(`${W} [data-birole]`); await p.waitForTimeout(250); out.push(await menu(p)); await pick(p, "Practitioner"); out.push(await bi(p));
    await p.click(`${W} [data-birole]`); await p.waitForTimeout(250); await pick(p, "Front desk"); out.push(await tree(p, `${W} .bi-nav`), await main(p));
    await p.click(`${W} [data-birole]`); await p.waitForTimeout(250); await pick(p, "Organisation administrator"); await p.waitForTimeout(300);
    await p.fill(`${W} [data-bigs]`, "lef"); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-bigsr]`));
    await p.press(`${W} [data-bigs]`, "ArrowDown"); await p.press(`${W} [data-bigs]`, "Enter"); await p.waitForTimeout(700); out.push(await main(p), await drw(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); out.push(await drw(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("invoices: filters, sort, columns, pagination, selection and bulk, drawer, row menu, saved views, CSV", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openBi(p); await go(p, "invoices"); out.push(await pg(p));
    await p.fill(`${W} [data-biflt] [data-bif="q"]`, "du"); await p.waitForTimeout(500); out.push(await pg(p));
    await p.selectOption(`${W} [data-biflt] [data-bif="per"]`, "year"); await p.waitForTimeout(400); out.push(await pg(p));
    await p.selectOption(`${W} [data-biflt] [data-bif="st"]`, "overdue").catch(() => {}); await p.waitForTimeout(400); out.push(await pg(p));
    await p.click(`${W} [data-bifreset]`); await p.waitForTimeout(400);
    await p.click(`${W} [data-bisort="invoices|total"]`); await p.waitForTimeout(300); await p.click(`${W} [data-bisort="invoices|total"]`); await p.waitForTimeout(300); out.push(await tree(p, `${W} .bi-tbs`));
    await p.click(`${W} [data-bicols="invoices"]`); await p.waitForTimeout(250); out.push(await menu(p)); await p.locator('.os-menu[data-level="0"] button').nth(2).click(); await p.waitForTimeout(400); out.push(await tree(p, `${W} .bi-tbs thead`));
    await p.click(`${W} [data-bipage="invoices|1"]`).catch(() => {}); await p.waitForTimeout(400); out.push(await tree(p, `${W} .bi-pager`), await tree(p, `${W} .bi-tbs tbody`));
    await p.click(`${W} [data-bipage="invoices|-1"]`).catch(() => {}); await p.waitForTimeout(400);
    await p.locator(`${W} [data-bisel]`).nth(0).check(); await p.locator(`${W} [data-bisel]`).nth(1).check(); await p.waitForTimeout(300); out.push(await tree(p, `${W} .bi-tbtools`));
    await p.click(`${W} [data-biselall]`); await p.waitForTimeout(300); out.push(await tree(p, `${W} .bi-tbtools`)); await p.click(`${W} [data-biselx]`); await p.waitForTimeout(300);
    await p.locator(`${W} tr[data-birow] td:nth-child(3)`).nth(2).click(); await p.waitForTimeout(500); out.push(await drw(p));
    await p.click(`${W} [data-bidrwx]`).catch(() => {}); await p.waitForTimeout(400);
    await p.locator(`${W} [data-biinvm]`).first().click(); await p.waitForTimeout(250); out.push(await menu(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.click(`${W} [data-biviews]`).catch(() => {}); await p.waitForTimeout(250); out.push(await menu(p)); await p.locator('.os-menu[data-level="0"] button').last().click().catch(() => {}); await p.waitForTimeout(300); out.push(await dlg(p));
    await p.fill(`${W} .bi-dlg [data-pv]`, "Mes impayés").catch(() => {}); await submit(p); out.push(await tree(p, `${W} .bi-views`), await toastOf(p));
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 3000 }).catch(() => null), p.click(`${W} [data-bicsv="invoices"]`)]);
    out.push(dl ? [dl.suggestedFilename(), (await import("node:fs")).readFileSync((await dl.path())!, "utf8").slice(0, 1500)] : null);
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("editor: new draft, party, lines, steps, issue checklist and issue, credit note, correction", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openBi(p);
    await p.click(`${W} [data-binew]`); await p.waitForTimeout(600); out.push(await main(p));
    await p.selectOption(`${W} [data-ed="party"]`, "c5").catch(() => {}); await p.waitForTimeout(400);
    await p.selectOption(`${W} [data-ed="prac"]`, "p2").catch(() => {}); await p.waitForTimeout(400); out.push(await pg(p));
    await p.click(`${W} [data-biline="svc"]`).catch(() => {}); await p.waitForTimeout(250); out.push(await menu(p)); await p.locator('.os-menu[data-level="0"] button').first().click().catch(() => {}); await p.waitForTimeout(500);
    await p.click(`${W} [data-biline="free"]`).catch(() => {}); await p.waitForTimeout(500);
    await p.locator(`${W} [data-el="desc"]`).last().fill("Compte rendu écrit").catch(() => {});
    await p.locator(`${W} [data-el="unit"]`).last().fill("35,50").catch(() => {}); await p.locator(`${W} [data-el="unit"]`).last().blur().catch(() => {}); await p.waitForTimeout(500); out.push(await pg(p));
    await p.click(`${W} [data-biline="disc"]`).catch(() => {}); await p.waitForTimeout(250); out.push(await menu(p)); await p.keyboard.press("Escape");
    await p.fill(`${W} [data-ed="note"]`, "Merci de votre confiance.").catch(() => {}); await p.waitForTimeout(400);
    await p.locator(`${W} [data-biissue]`).first().click().catch(() => {}); await p.waitForTimeout(500); out.push(await dlg(p));
    await submit(p); await p.waitForTimeout(900); out.push(await main(p), await toastOf(p));
    await go(p, "invoices"); await p.locator(`${W} [data-biinvm]`).first().click(); await p.waitForTimeout(250); out.push(await menu(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.selectOption(`${W} [data-biflt] [data-bif="st"]`, "paid"); await p.waitForTimeout(400);
    await p.locator(`${W} [data-biinvm]`).first().click(); await p.waitForTimeout(250); out.push(await menu(p));
    await pick(p, "Create a credit note"); out.push(await dlg(p));
    await submit(p); out.push(await tree(p, `${W} .bi-dlg [data-dlgerr]`));
    await p.fill(`${W} .bi-dlg [data-cnr]`, "Erreur de saisie"); await submit(p); out.push(await toastOf(p), await pg(p));
    await p.locator(`${W} [data-biinvm]`).nth(1).click(); await p.waitForTimeout(250); await pick(p, "Correct"); out.push(await dlg(p));
    await p.locator(`${W} .bi-dlg input:not([type=hidden])`).first().fill("Mauvais tarif").catch(() => {}); await submit(p); await p.waitForTimeout(600); out.push(await main(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("payments: record with allocation, payment menu, status, refund, reconciliation, duplicates, bank import", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openBi(p);
    await go(p, "record"); out.push(await pg(p));
    await p.selectOption(`${W} [data-pp="party"]`, "c9"); await p.waitForTimeout(400);
    await p.fill(`${W} [data-pp="amount"]`, "50"); await p.waitForTimeout(400); out.push(await pg(p));
    await p.click(`${W} [data-birecok]`); await p.waitForTimeout(600); out.push(await pg(p), await toastOf(p));
    await go(p, "transactions"); out.push(await pg(p));
    await p.locator(`${W} [data-bipm]`).first().click(); await p.waitForTimeout(250); out.push(await menu(p));
    await pick(p, "Mark reversed"); out.push(await dlg(p)); await submit(p); out.push(await pg(p));
    await p.locator(`${W} [data-bipm]`).nth(1).click(); await p.waitForTimeout(250); await pick(p, "Details and receipt"); out.push(await drw(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await go(p, "refunds"); out.push(await pg(p));
    await p.locator(`${W} [data-birfst$="|done"]`).first().click(); await p.waitForTimeout(400); out.push(await pg(p));
    await p.click(`${W} [data-birefund="|"]`); await p.waitForTimeout(400); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await go(p, "recon"); out.push(await pg(p));
    await p.click(`${W} [data-birmall]`); await p.waitForTimeout(400); out.push(await dlg(p)); await submit(p); out.push(await pg(p), await toastOf(p));
    const csv = "Date;Libellé;Montant\n13/10/2026;VIR TEST 1;45,00\n12/10/2026;REMISE CB 0042;30,00\n";
    await p.setInputFiles(`${W} [data-biimp]`, { name: "releve.csv", mimeType: "text/csv", buffer: Buffer.from(csv) }); await p.waitForTimeout(700); out.push(await pg(p), await toastOf(p));
    await go(p, "partial"); out.push(await pg(p));
    await go(p, "methods"); await dclick(p, `${W} [data-bimeth="sepa"]`); await p.waitForTimeout(400); out.push(await pg(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("catalogue and configuration: service dialog with linked forms, pricing rule, package, discount, taxes, payers, templates, numbering, legal, terms, audit", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openBi(p);
    await go(p, "services"); await p.click(`${W} tr[data-birow="s4"] td:nth-child(2)`); await p.waitForTimeout(400); out.push(await dlg(p));
    await p.click(`${W} .bi-dlg [data-sdt="f"]`); await p.waitForTimeout(300); out.push(await dlg(p));
    await p.selectOption(`${W} .bi-dlg [data-sv="form"]`, "f4"); await p.waitForTimeout(400); out.push(await dlg(p));
    await submit(p); out.push(await pg(p));
    await p.click(`${W} [data-bisvc="new"]`); await p.waitForTimeout(400); out.push(await dlg(p)); await submit(p); out.push(await tree(p, `${W} .bi-dlg [data-dlgerr]`)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await go(p, "pricing"); await p.click(`${W} tr[data-birow="r1"] td:nth-child(2)`); await p.waitForTimeout(400); out.push(await dlg(p));
    await p.fill(`${W} .bi-dlg [data-rv="val"]`, "-7,5"); await submit(p); out.push(await pg(p));
    await go(p, "packages"); await p.click(`${W} tr[data-birow="k1"] td:nth-child(2)`); await p.waitForTimeout(400); out.push(await dlg(p)); await submit(p); out.push(await pg(p));
    await go(p, "discounts"); await p.click(`${W} [data-bidisc]`); await p.waitForTimeout(400); out.push(await dlg(p)); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await go(p, "taxes"); await dclick(p, `${W} [data-txv="n20"]`); out.push(await pg(p));
    await go(p, "payers"); await p.click(`${W} [data-bipyv="py1"]`); await p.waitForTimeout(400); await p.click(`${W} [data-bipy]`); await p.waitForTimeout(400); out.push(await dlg(p));
    await p.fill(`${W} .bi-dlg [data-yv="name"]`, "Mutuelle Test (fictive)"); await submit(p); out.push(await pg(p));
    await go(p, "templates"); out.push(await pg(p));
    await p.click(`${W} [data-bitpl="t2"]`); await p.waitForTimeout(400); await dclick(p, `${W} [data-bitb="logo"]`); await p.click(`${W} [data-bitm="meta|1"]`); await p.waitForTimeout(400); out.push(await pg(p));
    await go(p, "numbering"); await p.fill(`${W} [data-biseq="inv|p"]`, "FA"); await p.locator(`${W} [data-biseq="inv|p"]`).blur(); await p.waitForTimeout(400); out.push(await pg(p));
    await go(p, "legal"); await p.fill(`${W} [data-bilg="siret"]`, "123 456 789 00012"); await p.locator(`${W} [data-bilg="siret"]`).blur(); await p.waitForTimeout(400); out.push(await pg(p));
    await go(p, "terms"); await p.click(`${W} [data-bitrd="1"]`); await p.waitForTimeout(400); out.push(await pg(p));
    await go(p, "settings"); await p.selectOption(`${W} [data-bis="cur"]`, "TND"); await p.waitForTimeout(400); out.push(await pg(p));
    await go(p, "integrations"); out.push(await pg(p));
    await go(p, "audit"); await p.fill(`${W} [data-biflt] [data-bif="q"]`, "edit"); await p.waitForTimeout(500); out.push(await pg(p));
    const st = (await store(p)) as { audit?: unknown[] } | null; if (st) st.audit = (st.audit || []).slice(0, 12);
    out.push(st, await p.evaluate(() => localStorage.getItem("remotion-forms") ? "forms-stored" : "forms-not-stored"));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("reports and dashboard: periods, navigation, breakdown, outstanding by party, revenue by dimension, allocation, language switch", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openBi(p);
    for (const per of ["day", "week", "quarter", "year", "month"]) { await p.click(`${W} [data-biper="${per}"]`).catch(() => {}); await p.waitForTimeout(400); out.push(per, await pg(p)); }
    await p.click(`${W} [data-bipnav="-1"]`).catch(() => {}); await p.waitForTimeout(400); out.push(await tree(p, `${W} .bi-pg .bi-kpis`));
    for (const k of ["cat", "method", "payer", "est"]) { await p.click(`${W} [data-bibrk="${k}"]`).catch(() => {}); await p.waitForTimeout(300); out.push(await tree(p, `${W} [data-bibrkb]`)); }
    await go(p, "reports"); out.push(await pg(p));
    await go(p, "outstanding"); await p.click(`${W} [data-bioutp="1"]`).catch(() => {}); await p.waitForTimeout(400); out.push(await pg(p));
    await go(p, "alloc"); await p.click(`${W} [data-bialb="invoiced"]`).catch(() => {}); await p.waitForTimeout(400); out.push(await pg(p));
    await go(p, "activity"); out.push(await pg(p));
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1200); out.push(await bi(p), await p.getAttribute(W, "aria-label"));
    await p.click("#langBtn"); await p.click('[data-lang="ar"]'); await p.waitForTimeout(1200); out.push(await main(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
