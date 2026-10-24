/** Phase B slice 9 — registration wizard: dual-run parity (source file:// vs React shell). */
/* Buttons named by v94 a11yName (data-an) get their label on a 250 ms debounce in both versions: that label is
   compared by catchup-s7-a11y, not in these trees. */
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
    const p = await ctx.newPage(); p.setDefaultTimeout(8000); await open(p, url); out[k] = await fn(p); await ctx.close();
  }
  return out;
}
/** Serialised subtree: tag, sorted classes, identity / state attributes, normalised inline style, value, own text. */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => ["id", "role", "hidden", "disabled", "type", "lang", "dir", "placeholder", "readonly", "href", "for", "value"].includes(n) || n.startsWith("aria-") || (n.startsWith("data-") && !n.startsWith("data-i18n"));
  const walk = (e: Element): string[] => {
    if (e.tagName === "svg" || e.tagName === "canvas" || e.tagName === "IMG") return [e.tagName.toLowerCase()];
    const attrs = [...e.attributes].filter((a) => keep(a.name) && !(e.hasAttribute("data-an") && (a.name === "aria-label" || a.name === "data-an"))).map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const el = e as HTMLInputElement, val = /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + el.value + (el.type === "checkbox" ? ":" + el.checked : "") + (el.readOnly ? ":ro" : "") : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const env = (p: Page) => p.evaluate(() => ({
  rg: [...document.getElementById("rg")!.classList].sort().join(" "), body: document.body.classList.contains("locked"),
  active: document.querySelector("#rg.on") ? (document.activeElement as HTMLElement)?.id || document.activeElement?.tagName : null,
  acc: localStorage.getItem("remotion-acc"), extra: localStorage.getItem("remotion-accs-extra"), lang: document.documentElement.lang,
}));
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
const cond = async (p: Page, fn: () => boolean) => { await p.waitForFunction(fn, undefined, { timeout: 8000 }); await p.waitForTimeout(80); };
const card = (p: Page) => tree(p, "#rgCard");
/** Sign out (power screen), then "Create one" on the sign-in screen. */
async function toRegister(p: Page) {
  await p.click("#accBtn"); await p.waitForTimeout(300); await p.click('#accMenu [data-act="signout"]');
  await cond(p, () => !!document.querySelector("#si.on")); await p.waitForTimeout(800);
  await p.click("#siScroll [data-register]"); await cond(p, () => !!document.querySelector("#rg.on")); await p.waitForTimeout(300);
}
const next = (p: Page) => p.click("#rgBody [data-next]");

test("registration step 1: screen, methods, validation, password meter, eye, provider verification", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await toRegister(p); out.push(await tree(p, "#rg"), await env(p));
    await next(p); out.push(await card(p));
    await p.click('#rgBody [data-meth="gov"]'); out.push(await tree(p, "#rgMethBody"));
    await p.click('#rgBody [data-meth="sso"]'); await p.click("#rgSsoGo"); out.push(await tree(p, "#rgMethBody"));
    await p.click('#rgBody [data-meth="email"]');
    await p.fill("#rgFirst", "Lina"); await p.fill("#rgLast", "Haddad"); await p.fill("#rgEmail", "bad"); await next(p); out.push(await card(p));
    await p.fill("#rgEmail", "lina@clinic.tn");
    for (const pw of ["abc", "abcdefgh", "Abcdefg1", "Lina1234X", "Str0ng!Passw0rd"]) { await p.fill("#rgPass", pw); out.push(await tree(p, "#rgPwMeter"), await tree(p, "#rgRules")); }
    await p.click('[data-eye="rgPass"]'); out.push(await tree(p, "#rgPassF"));
    await next(p); out.push(await tree(p, "#rgErr"));
    await p.fill("#rgPass2", "Str0ng!Passw0rd"); await next(p); out.push(await tree(p, "#rgAgreeL"), await tree(p, "#rgErr"));
    await p.click('#rgBody [data-legal="terms"]'); out.push(await toast(p));
    await p.click('#rgBody [data-rprov="Google"]'); await p.waitForTimeout(200); out.push(await card(p));
    await cond(p, () => !!document.querySelector("#rgMethBody .rg-note")); out.push(await card(p), await toast(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("registration full path: profile, organisation (invite / identifier / create), verification code, review, create, open workspace", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await toRegister(p);
    await p.fill("#rgFirst", "Lina"); await p.fill("#rgLast", "Haddad"); await p.fill("#rgEmail", "lina@clinic.tn");
    await p.fill("#rgPass", "Str0ng!Passw0rd"); await p.fill("#rgPass2", "Str0ng!Passw0rd"); await p.check("#rgAgree"); await next(p); await p.waitForTimeout(300);
    out.push(await tree(p, "#rgSteps"), await card(p), await env(p));
    await p.selectOption("#rgProf", "admin"); out.push(await tree(p, "#rgRoleF"), await tree(p, "#rgRppsW"));
    await p.selectOption("#rgProf", "physio"); await p.fill("#rgRpps", "123"); out.push(await tree(p, "#rgRppsW"));
    await p.selectOption("#rgCC", "FR"); await p.fill("#rgPhone", "x"); await next(p); out.push(await tree(p, "#rgPhoneF"), await tree(p, "#rgErr"));
    await p.fill("#rgPhone", "6 12 34 56 78"); await next(p); out.push(await tree(p, "#rgErr"));
    await p.fill("#rgRpps", "10101234567"); await next(p); await p.waitForTimeout(300); out.push(await card(p));
    await next(p); out.push(await tree(p, "#rgOErr"));
    await p.fill("#rgInvite", "x"); await p.click('#rgBody [data-detect="invite"]'); out.push(await tree(p, "#rgOErr"));
    await p.fill("#rgInvite", "REM-ABCD-1234"); await p.click('#rgBody [data-detect="invite"]'); out.push(await tree(p, "#rgOrgBody"));
    await cond(p, () => !!document.querySelector("#rgFound .rg-found")); out.push(await tree(p, "#rgOrgBody"));
    await p.click('#rgBody [data-omode="ident"]'); out.push(await card(p));
    await p.fill("#rgIdent", "40312985700021"); await p.selectOption("#rgIdCC", "TN"); await p.click('#rgBody [data-detect="ident"]'); await cond(p, () => !!document.querySelector("#rgFound .rg-found")); out.push(await tree(p, "#rgOrgBody"));
    await p.click('#rgBody [data-omode="create"]'); await p.fill("#rgIdNum", "123"); await p.click("#rgBody [data-lookup]"); out.push(await tree(p, "#rgOErr"));
    await p.fill("#rgIdNum", "12345678901234"); await p.click("#rgBody [data-lookup]"); await p.waitForTimeout(1100); out.push(await tree(p, "#rgOrgBody"), await toast(p));
    await p.fill("#rgWeb", "nodot"); await next(p); out.push(await tree(p, "#rgOErr"));
    await p.fill("#rgWeb", "cliniquedulac.fr"); await next(p); await p.waitForTimeout(300); out.push(await card(p));
    await next(p); out.push(await tree(p, "#rgErr"));
    const boxes = p.locator("#rgCode input"); for (let i = 0; i < 6; i++) await boxes.nth(i).type(String(i + 1));
    out.push(await tree(p, "#rgVArea")); await cond(p, () => !!document.querySelector("#rgCode.ok")); out.push(await tree(p, "#rgVArea"), await env(p));
    await next(p); await p.waitForTimeout(300); out.push(await card(p));
    await p.uncheck("#rvDpa"); await p.click("#rgBody [data-create]"); out.push(await tree(p, ".rv-card.terms"), await tree(p, "#rgErr"));
    await p.check("#rvDpa"); await p.click("#rgBody [data-create]"); await p.waitForTimeout(300); out.push(await card(p));
    await cond(p, () => !!document.querySelector("#rgBody [data-open]")); out.push(await card(p));
    await p.click("#rgBody [data-open]"); await cond(p, () => !document.body.classList.contains("locked")); await p.waitForTimeout(700);
    out.push(await env(p), await toast(p), await p.locator("#whoName").textContent());
    return out;
  });
  expect(r.react).toEqual(r.source);
  expect((r.source as unknown[]).at(-1)).toBe("Lina"); // the new account is signed in
});

test("registration verification channels, steps bar, Escape, language, back to sign-in", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await toRegister(p);
    await p.click('#rgBody [data-rprov="Microsoft"]'); await cond(p, () => !!document.querySelector("#rgMethBody .rg-note"));
    await p.check("#rgAgree"); await next(p); await p.waitForTimeout(300); await next(p); await p.waitForTimeout(300);
    await p.fill("#rgInvite", "REM-ABCD-1234"); await p.click('#rgBody [data-detect="invite"]'); await cond(p, () => !!document.querySelector("#rgFound .rg-found"));
    await next(p); await p.waitForTimeout(300); out.push(await card(p));
    await p.click("#rgSteps [data-step='1']"); await p.waitForTimeout(300); out.push(await tree(p, "#rgSteps"));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300); out.push(await tree(p, "#rgSteps"));
    await p.click("#rgLang"); await p.waitForTimeout(150); out.push(await tree(p, ".si-pop")); await p.click('.si-pop [data-l="fr"]'); await p.waitForTimeout(500); out.push(await card(p), await env(p));
    await p.click("#rgBody [data-to-signin]"); await p.waitForTimeout(500); out.push(await env(p), await p.evaluate(() => document.getElementById("si")!.classList.contains("on")));
    // Email method → verification channels.
    await p.click("#siScroll [data-register]"); await cond(p, () => !!document.querySelector("#rg.on"));
    await p.fill("#rgFirst", "Lina"); await p.fill("#rgLast", "Haddad"); await p.fill("#rgEmail", "lina@clinic.tn"); await p.fill("#rgPass", "Str0ng!Passw0rd"); await p.fill("#rgPass2", "Str0ng!Passw0rd"); await p.check("#rgAgree");
    await next(p); await p.waitForTimeout(300); await next(p); await p.waitForTimeout(300);
    await p.click('#rgBody [data-omode="create"]'); await p.fill("#rgOrgName", "Cabinet Test"); await next(p); await p.waitForTimeout(300);
    out.push(await card(p));
    await p.click('#rgBody [data-vsend="sms"]'); out.push(await tree(p, "#rgErr"));
    await p.click('#rgBody [data-vemail="edit"]'); await p.waitForTimeout(200); out.push(await tree(p, "#rgVTargetW"));
    await p.fill("#rgNewEmail", "bad"); await p.click('#rgBody [data-vemail="save"]'); out.push(await tree(p, "#rgVTargetW"), await tree(p, "#rgErr"));
    await p.fill("#rgNewEmail", "lina@cabinet.tn"); await p.click('#rgBody [data-vemail="save"]'); await p.waitForTimeout(200); out.push(await card(p), await toast(p));
    await p.click('#rgBody [data-vsend="link"]'); out.push(await tree(p, '[data-vo="link"]')); await cond(p, () => !!document.querySelector("#rgVWait")); out.push(await tree(p, "#rgVArea"), await toast(p));
    await next(p); out.push(await tree(p, "#rgErr"));
    await cond(p, () => !!document.querySelector("#rgVWait.ok")); out.push(await tree(p, "#rgVArea"));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
