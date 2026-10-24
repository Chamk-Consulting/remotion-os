/** Phase C slice 18 — Formulaires & Enquêtes (native port): dual-run parity (source file:// vs React shell). */
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
const T36 = NOW.getTime().toString(36);
/** Form, submission and token ids are built from Date.now() (fixed clock); field ids come from a per-document counter (feId). */
function norm(v: unknown) {
  const map = new Map<string, string>();
  const s = JSON.stringify(v).replace(/(\\"_id\\":\\")d[0-9a-z]{1,8}/g, "$1D").replace(new RegExp(`\\b([a-z]{0,2})${T36}([0-9a-z]{0,5})\\b`, "g"), (m, p) => { if (!map.has(m)) map.set(m, p + "#" + map.size); return map.get(m)!; });
  return JSON.parse(s);
}
/** Serialised subtree: tag, sorted classes, identity / state attributes, normalised inline style, value, own text. */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => ["id", "role", "hidden", "disabled", "type", "dir", "placeholder", "tabindex", "title", "lang", "value", "checked", "selected", "href", "src"].includes(n) || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (e.tagName === "svg" && !e.classList.contains("fe-bm-svg")) return ["svg" + (e.getAttribute("class") ? "." + e.getAttribute("class") : "")];
    const attrs = [...e.attributes].filter((a) => keep(a.name) && !(e.hasAttribute("data-an") && (a.name === "aria-label" || a.name === "data-an"))).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "").replace(/(^|;)z-index:\d+/, "").replace(/^;/, "").replace(/;$/, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value) : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const W = '.os-win[data-osw="forms"]';
const fe = (p: Page) => tree(p, `${W} .fe`);
const main = (p: Page) => tree(p, `${W} .fe-main`);
const store = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem("remotion-forms") || "null"));
const openFe = async (p: Page) => { await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {}); if (!(await p.evaluate(() => document.getElementById("wsMenu")?.classList.contains("closed") ?? true))) { await p.click("#wsBtn"); await p.waitForTimeout(400); } await p.dblclick('#dkLayer .dk-ic[title="Forms"]'); await p.locator(`${W} .fe-main`).waitFor(); await p.waitForTimeout(800); };
/** Clicks through the app's own delegated handler (the element may sit under an overlay or outside the scroll view). */
const dclick = async (p: Page, sel: string, wait = 400) => { await p.evaluate((sel) => { const e = document.querySelector(sel) as HTMLElement | null; if (!e) throw new Error("missing " + sel); e.click(); }, sel); await p.waitForTimeout(wait); };
const toastOf = (p: Page) => p.locator(`${W} .fe-toast`).evaluate((e) => [e.className, e.textContent]);

test("open: shell, editor on the first form, store, dock button, window", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    await openFe(p);
    return [await fe(p), await store(p), await p.evaluate(() => [...document.querySelectorAll("#dock [data-t]")].map((b) => (b as HTMLElement).dataset.t + ":" + b.className + ":" + (b.getAttribute("type") ?? "-"))), await p.getAttribute(W, "aria-label"), await p.getAttribute(W, "class")];
  });
  expect(r.react).toEqual(r.source);
});

const nav = (p: Page) => tree(p, `${W} .fe-nav`);
const go = async (p: Page, v: string) => { await dclick(p, `${W} [data-go="${v}"]`, 500); };
const typeIn = async (p: Page, sel: string, v: string, wait = 400) => { await p.fill(sel, v); await p.waitForTimeout(wait); };

test("navigation: every view, lists with search, opening a form from a list, empty trash", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openFe(p);
    for (const v of ["overview", "list:all", "list:mine", "list:shared", "templates", "library", "list:surveys", "list:patients", "list:clinical", "subs", "analytics", "auto", "list:arch", "list:trash", "settings"]) { await go(p, v); out.push(v, await main(p), await nav(p)); }
    await go(p, "list:all"); await typeIn(p, `${W} [data-lq]`, "a"); out.push(await main(p));
    await typeIn(p, `${W} [data-lq]`, "zzz"); out.push(await main(p)); await typeIn(p, `${W} [data-lq]`, "");
    await dclick(p, `${W} [data-open]`, 600); out.push(await fe(p), await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

const sel = async (p: Page, i: number) => { await p.locator(`${W} .fe-cv .fe-fld`).nth(i).click({ position: { x: 30, y: 12 } }); await p.waitForTimeout(400); };
/** A component is added by keyboard (Enter on the tile) or by a press without movement (feDragInit click fallback). */
const addKey = async (p: Page, ct: string) => { await p.focus(`${W} .fe-comp[data-ct="${ct}"]`); await p.keyboard.press("Enter"); await p.waitForTimeout(600); };
const addClick = async (p: Page, ct: string) => { const l = p.locator(`${W} .fe-comp[data-ct="${ct}"]`); await l.scrollIntoViewIfNeeded(); await l.click(); await p.waitForTimeout(700); };
const props = (p: Page) => tree(p, `${W} .fe-props`);
const canvas = (p: Page) => tree(p, `${W} .fe-cv`);

test("editor: select, properties, label / key / required / width, devices, components, sections, pages, duplicate, delete, undo / redo, zoom", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openFe(p);
    await sel(p, 2); out.push(await props(p));
    await typeIn(p, `${W} .fe-props [data-p="label"]`, "Nom de naissance"); out.push(await canvas(p));
    await dclick(p, `${W} .fe-props [data-ptg="req"]`); await dclick(p, `${W} .fe-props [data-pspan="30"]`); out.push(await props(p), await canvas(p));
    for (const d of ["tablet", "mobile", "desktop"]) { await dclick(p, `${W} [data-dev="${d}"]`); out.push(d, await canvas(p)); }
    for (const t of ["section", "form", "field"]) { await dclick(p, `${W} [data-pt="${t}"]`); out.push(t, await props(p)); }
    for (const c of ["health", "psy", "blocks", "fav", "all"]) { await dclick(p, `${W} [data-cf="${c}"]`); out.push(c, await tree(p, `${W} .fe-comps`)); }
    await addClick(p, "email"); out.push(await canvas(p), await props(p), await toastOf(p));
    await addClick(p, "hc_bmi"); await addClick(p, "blk:b1"); out.push(await canvas(p));
    await dclick(p, `${W} .fe-fld.on [data-fa="dup"]`, 600); out.push(await canvas(p));
    await dclick(p, `${W} .fe-fld.on [data-fa="del"]`, 700); out.push(await canvas(p), await toastOf(p));
    await dclick(p, `${W} [data-sa="add"]`, 600); out.push(await canvas(p));
    await dclick(p, `${W} [data-pgadd]`, 600); out.push(await tree(p, `${W} .fe-pages`), await canvas(p));
    await dclick(p, `${W} [data-pg="0"]`, 500);
    await dclick(p, `${W} [data-undo]`); await dclick(p, `${W} [data-undo]`); out.push(await canvas(p));
    await dclick(p, `${W} [data-redo]`); out.push(await canvas(p));
    await p.keyboard.press("Control+z"); await p.waitForTimeout(400); out.push(await canvas(p));
    await dclick(p, `${W} [data-z="1"]`); await dclick(p, `${W} [data-z="1"]`); out.push(await tree(p, `${W} .fe-zoom`));
    await dclick(p, `${W} [data-lp="outline"]`); out.push(await tree(p, `${W} .fe-comps`));
    await p.keyboard.press("Control+s"); await p.waitForTimeout(500); out.push(await toastOf(p), await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

const menu = (p: Page) => tree(p, ".os-menu");
const menuPick = async (p: Page, i: number) => { await p.evaluate((i) => (document.querySelectorAll(".os-menu [role=menuitem], .os-menu button")[i] as HTMLElement | undefined)?.click(), i); await p.waitForTimeout(500); };
const tab = async (p: Page, k: string) => { await dclick(p, `${W} [data-tab="${k}"]`, 500); };
const pv = (p: Page) => tree(p, `${W} .fe-main`);

test("preview: fill, validation, pages, devices, test submission, restart, options", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openFe(p);
    await tab(p, "preview"); out.push(await pv(p));
    await dclick(p, `${W} [data-pvnext]`, 500); out.push(await pv(p), await p.evaluate((W) => [...document.querySelectorAll(`${W} [data-pvnext],${W} [data-pvprev],${W} [data-pvtest],${W} [data-pvrestart],${W} [data-pvdev],${W} [data-otg],${W} [data-afopen],${W} [data-a11y]`)].map((e) => e.outerHTML.slice(0, 80)), W));
    const inputs = p.locator(`${W} .fe-pf input.fe-in[type="text"], ${W} .fe-pf input.fe-in[type="email"], ${W} .fe-pf input.fe-in[type="tel"]`);
    const n = await inputs.count(); for (let i = 0; i < Math.min(n, 6); i++) { await inputs.nth(i).fill(["Martin", "Camille", "camille@exemple", "camille@exemple.fr", "0612345678", "Lyon"][i]); await p.waitForTimeout(150); }
    await p.waitForTimeout(600); out.push(await pv(p));
    for (const c of await p.locator(`${W} .fe-pf [data-pick]`).all()) { await c.click(); await p.waitForTimeout(120); break; }
    await dclick(p, `${W} [data-pvnext]`, 600); out.push(await pv(p), await toastOf(p));
    if (await p.locator(`${W} [data-pvprev]`).count()) { await dclick(p, `${W} [data-pvprev]`, 500); out.push(await pv(p)); }
    for (const d of ["mobile", "tablet", "desktop"]) { const b = p.locator(`${W} [data-pvdev="${d}"]`); if (await b.count()) { await dclick(p, `${W} [data-pvdev="${d}"]`); out.push(d, await pv(p)); } }
    await dclick(p, `${W} [data-fe-open="props"]`); out.push(await tree(p, `${W} .fe`));
    for (const k of ["prog", "nums", "later"]) { if (await p.locator(`${W} [data-otg="${k}"]`).count()) { await dclick(p, `${W} [data-otg="${k}"]`); out.push(k, await pv(p)); } }
    for (let i = 0; i < 6; i++) { if (!(await p.locator(`${W} [data-pvnext]`).count())) break; await dclick(p, `${W} [data-pvnext]`, 500); }
    out.push(await pv(p));
    if (await p.locator(`${W} [data-pvtest]`).count()) { await dclick(p, `${W} [data-pvtest]`, 700); out.push(await pv(p), await toastOf(p)); }
    if (await p.locator(`${W} [data-pvrestart]`).count()) { await dclick(p, `${W} [data-pvrestart]`, 600); out.push(await pv(p)); }
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("rules, versions, publish, share, automations, more menu, header actions", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openFe(p);
    await tab(p, "rules"); out.push(await main(p));
    if (await p.locator(`${W} [data-rnew]`).count()) { await dclick(p, `${W} [data-rnew]`); out.push(await main(p)); }
    await tab(p, "versions"); out.push(await main(p));
    await dclick(p, `${W} [data-h="pub"]`, 700); out.push(await fe(p), await toastOf(p));
    for (const k of ["share", "auto", "versions"]) { if (await p.locator(`${W} [data-tab="${k}"]`).count()) { await tab(p, k); out.push(k, await main(p)); } }
    if (await p.locator(`${W} [data-tokgen]`).count()) { await tab(p, "share"); await dclick(p, `${W} [data-tokgen]`); out.push(await main(p)); }
    if (await p.locator(`${W} [data-tab="share"]`).count()) { await tab(p, "share"); const i = p.locator(`${W} [data-shinv] input`); if (await i.count()) { await i.fill("bad"); await p.keyboard.press("Enter"); await p.waitForTimeout(300); await i.fill("dr.martin@exemple.fr"); await p.keyboard.press("Enter"); await p.waitForTimeout(400); out.push(await main(p), await toastOf(p)); } }
    if (await p.locator(`${W} [data-tab="auto"]`).count()) { await tab(p, "auto"); for (const b of (await p.locator(`${W} [data-autg]`).all()).slice(0, 2)) { await b.click(); await p.waitForTimeout(250); } out.push(await main(p)); }
    await tab(p, "versions"); if (await p.locator(`${W} [data-vrestore]`).count()) { await dclick(p, `${W} [data-vrestore]`, 600); out.push(await fe(p)); }
    await tab(p, "editor");
    const more = p.locator(`${W} [data-h="more"]`); await more.click(); await p.waitForTimeout(400); out.push(await menu(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("create: blank, template, AI draft, import (CSV / text / JSON), compose from blocks, duplicate, wizard", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openFe(p);
    const mdl = () => tree(p, `${W} .fe-mback`);
    const newForm = async (mode: string) => { await go(p, "overview"); await dclick(p, `${W} [data-newform]`, 500); if (mode) await dclick(p, `${W} [data-mode="${mode}"]`, 600); };
    await go(p, "templates"); await dclick(p, `${W} [data-usetpl]`, 800); out.push(await fe(p), await toastOf(p));
    await newForm(""); out.push(await mdl());
    await dclick(p, `${W} [data-mode="blank"]`, 700); out.push(await fe(p));
    await newForm("ai"); out.push(await mdl());
    await p.fill(`${W} [data-aigen]`, "Questionnaire de satisfaction patient après séance de kinésithérapie"); await dclick(p, `${W} [data-aigenbtn]`, 2500); out.push(await fe(p), await toastOf(p));
    await newForm("import"); out.push(await mdl());
    for (const tb of ["csv", "text", "json"]) { if (await p.locator(`${W} [data-imptab="${tb}"]`).count()) { await dclick(p, `${W} [data-imptab="${tb}"]`); out.push(tb, await mdl()); } }
    if (await p.locator(`${W} [data-imptab="text"]`).count()) {
      await dclick(p, `${W} [data-imptab="text"]`); const ta = p.locator(`${W} .fe-mback textarea`).first();
      await ta.fill("Identité\nNom *\nPrénom\nDate de naissance\nVotre douleur aujourd'hui ?\n☐ Faible\n☐ Moyenne\n☐ Forte\nCommentaires"); await p.waitForTimeout(300);
      if (await p.locator(`${W} [data-impparse]`).count()) { await dclick(p, `${W} [data-impparse]`, 600); out.push(await mdl()); }
      if (await p.locator(`${W} [data-impgo]`).count()) { await dclick(p, `${W} [data-impgo]`, 800); out.push(await fe(p), await toastOf(p)); }
    }
    await newForm("compose"); out.push(await mdl());
    for (const c of (await p.locator(`${W} [data-cpick]`).all()).slice(0, 2)) { await c.check(); await p.waitForTimeout(150); }
    if (await p.locator(`${W} [data-composego]`).count()) { await dclick(p, `${W} [data-composego]`, 800); out.push(await fe(p), await toastOf(p)); }
    await newForm("dup"); out.push(await mdl());
    if (await p.locator(`${W} [data-dupgo]`).count()) { await dclick(p, `${W} [data-dupgo]`, 800); out.push(await fe(p)); }
    await newForm("wizard"); out.push(await mdl());
    for (const sel of [`[data-wzdom]`, `[data-wzaud]`, `[data-wzlang]`]) { if (await p.locator(`${W} ${sel}`).count()) { await dclick(p, `${W} ${sel} >> nth=0`.replace(" >> nth=0", "")); } }
    for (let i = 0; i < 6; i++) { if (!(await p.locator(`${W} [data-wznext]`).count())) break; await dclick(p, `${W} [data-wznext]`, 600); out.push(await mdl()); }
    out.push(await fe(p), await toastOf(p));
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("submissions review, analytics, autofill, accessibility check", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openFe(p);
    await go(p, "subs"); out.push(await main(p));
    for (const f of ["new", "review", "all"]) { if (await p.locator(`${W} [data-sf="${f}"]`).count()) { await dclick(p, `${W} [data-sf="${f}"]`); out.push(f, await main(p)); } }
    if (await p.locator(`${W} [data-sub]`).count()) { await dclick(p, `${W} [data-sub]`, 600); out.push(await fe(p)); }
    for (const a of ["approve", "correction"]) { if (await p.locator(`${W} [data-subact="${a}"]`).count()) { await dclick(p, `${W} [data-subact="${a}"]`, 600); out.push(a, await fe(p), await toastOf(p)); } }
    await go(p, "analytics"); out.push(await main(p));
    await go(p, "list:all"); await dclick(p, `${W} [data-open]`, 600); await tab(p, "preview");
    if (await p.locator(`${W} [data-afopen]`).count()) { await dclick(p, `${W} [data-afopen]`, 600); out.push(await fe(p)); if (await p.locator(`${W} [data-afapply]`).count()) { await dclick(p, `${W} [data-afapply]`, 600); out.push(await fe(p), await toastOf(p)); } }
    if (await p.locator(`${W} [data-a11y]`).count()) { await dclick(p, `${W} [data-a11y]`, 600); out.push(await fe(p)); }
    out.push(await store(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("language, narrow window (drawers, scrim), drag and drop, close with pending changes and reopen", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = []; await openFe(p);
    await p.click("#langBtn"); await p.click('[data-lang="fr"]'); await p.waitForTimeout(1200); out.push(await fe(p), await p.getAttribute(W, "aria-label"), await p.evaluate(() => [...document.querySelectorAll('#dock [data-t="forms"]')].map((b) => b.getAttribute("title"))));
    await p.click("#langBtn"); await p.click('[data-lang="ar"]'); await p.waitForTimeout(1200); out.push(await main(p), await nav(p));
    await p.click("#langBtn"); await p.click('[data-lang="en"]'); await p.waitForTimeout(1200);
    // Drag a component onto the canvas, then a field before another one.
    const src = (await p.locator(`${W} .fe-comp[data-ct="rating"]`).boundingBox())!, dst = (await p.locator(`${W} .fe-cv .fe-fld`).nth(1).boundingBox())!;
    await p.mouse.move(src.x + 20, src.y + 10); await p.mouse.down(); await p.mouse.move(src.x + 60, src.y + 40, { steps: 4 }); await p.mouse.move(dst.x + 40, dst.y + 8, { steps: 10 }); await p.waitForTimeout(200); await p.mouse.up(); await p.waitForTimeout(800);
    out.push(await canvas(p));
    const f0 = (await p.locator(`${W} .fe-cv .fe-fld .fe-fgrip`).nth(0).boundingBox())!, f3 = (await p.locator(`${W} .fe-cv .fe-fld`).nth(3).boundingBox())!;
    await p.mouse.move(f0.x + 4, f0.y + 4); await p.mouse.down(); await p.mouse.move(f0.x + 30, f0.y + 30, { steps: 4 }); await p.mouse.move(f3.x + 40, f3.y + f3.height - 4, { steps: 10 }); await p.waitForTimeout(200); await p.mouse.up(); await p.waitForTimeout(800);
    out.push(await canvas(p));
    // Narrow window: navigation, components and properties move into drawers.
    const g = (await p.locator(`${W} .os-rz`).boundingBox())!; await p.mouse.move(g.x + 4, g.y + 4); await p.mouse.down(); await p.mouse.move(g.x - 900, g.y + 4, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(800);
    out.push(await p.evaluate((W) => { const r = document.querySelector(W)!.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }, W), await tree(p, `${W} .fe`));
    for (const k of ["comps", "props"]) { if (await p.locator(`${W} [data-fe-open="${k}"]`).count()) { await dclick(p, `${W} [data-fe-open="${k}"]`); out.push(k, await p.getAttribute(`${W} .fe`, "class")); await dclick(p, `${W} .fe-scrim`); out.push(await p.getAttribute(`${W} .fe`, "class")); } }
    // Edit a label and close at once: the pending autosave is committed on close (onClose), then the form reopens as left.
    await p.locator(`${W} .fe-cv .fe-fld`).nth(0).click({ position: { x: 30, y: 12 } }).catch(() => {}); await p.waitForTimeout(300);
    await p.evaluate((W) => { const i = document.querySelector(`${W} .fe-props [data-p="label"]`) as HTMLInputElement | null; if (i) { i.value = "Nom (modifié)"; i.dispatchEvent(new Event("input", { bubbles: true })); } }, W); await p.waitForTimeout(100);
    await p.click(`${W} [data-wc="close"]`);
    await p.waitForTimeout(800); out.push(await p.locator(W).count(), await store(p));
    await openFe(p); out.push(await fe(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("Patients opens a form in the Forms window (native feOpenForm)", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.waitForFunction(() => document.getElementById("wsMenu")?.classList.contains("closed"), null, { timeout: 10000 }).catch(() => {});
    const PW = '.os-win[data-osw="patients"]';
    await p.dblclick('#dkLayer .dk-ic[title="Patients"] >> nth=1'); await p.locator(`${PW} .hr-pg`).waitFor(); await p.waitForTimeout(900);
    await p.evaluate((PW) => (document.querySelector(`${PW} [data-pago="forms"]`) as HTMLElement | null)?.click(), PW); await p.waitForTimeout(500);
    out.push(await p.evaluate((PW) => [...document.querySelectorAll(`${PW} [data-paform]`)].map((b) => (b as HTMLElement).dataset.paform), PW));
    await p.evaluate((PW) => (document.querySelector(`${PW} [data-paform="f3"]`) as HTMLElement | null)?.click(), PW); await p.waitForTimeout(1500);
    out.push(await p.locator(W).count(), await tree(p, `${W} .fe-hd`), await p.getAttribute(`${W} .fe`, "data-view"), await p.evaluate(() => JSON.parse(localStorage.getItem("remotion-forms") || "null")?.cur));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
