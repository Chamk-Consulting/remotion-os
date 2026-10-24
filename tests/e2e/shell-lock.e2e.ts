/** Phase B slice 8 — lock screen, power screen, sign-out and sign-in: dual-run parity (source file:// vs React shell). */
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
/** Serialised subtree: tag, sorted classes, identity / state attributes, normalised inline style, own text. */
const tree = (p: Page, sel: string) => p.evaluate((sel) => {
  const keep = (n: string) => n === "id" || n === "role" || n === "hidden" || n === "disabled" || n === "type" || n === "lang" || n === "dir" || n === "placeholder" || n.startsWith("aria-") || n.startsWith("data-");
  const walk = (e: Element): string[] => {
    if (e.tagName === "svg" || e.tagName === "canvas") return [e.tagName + (e.getAttribute("class") ? "." + e.getAttribute("class") : "")];
    const attrs = [...e.attributes].filter((a) => keep(a.name) && a.name !== "data-i18n" && a.name !== "data-i18n-aria" && a.name !== "data-i18n-ph").map((a) => a.name + "=" + a.value).sort().join(",");
    const st = (e as HTMLElement).style?.cssText ? "{" + (e as HTMLElement).style.cssText.replace(/\s+/g, "") + "}" : "";
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).filter(Boolean).join(" ");
    const val = (e as HTMLInputElement).value !== undefined && /INPUT|SELECT|TEXTAREA/.test(e.tagName) ? "=" + (e as HTMLInputElement).value + ((e as HTMLInputElement).type === "checkbox" ? ":" + (e as HTMLInputElement).checked : "") : "";
    return [`${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}[${attrs}]${st}${val}${own ? " '" + own + "'" : ""}`, ...[...e.children].flatMap((c) => walk(c).map((x) => "  " + x))];
  };
  const el = document.querySelector(sel); return el ? walk(el) : null;
}, sel);
const env = (p: Page) => p.evaluate(() => ({
  body: [...document.body.classList].filter((c) => c === "locked").join(), inert: (document.getElementById("shell") as HTMLElement & { inert: boolean }).inert,
  // Focus left on a control of a screen that is going away is blurred whenever the browser next updates style (timing):
  // compared only while a lock / sign-in / power screen is up.
  active: document.querySelector("#lock.on,#si.on,#power.on") ? (document.activeElement as HTMLElement)?.id || document.activeElement?.tagName : null,
  acc: localStorage.getItem("remotion-acc"), lk: localStorage.getItem("remotion-lk"), si: localStorage.getItem("remotion-si"), lang: document.documentElement.lang,
  power: [...document.getElementById("power")!.classList].sort().join(" "), pmsg: document.getElementById("powerMsg")!.textContent, spin: (document.getElementById("powerSpin") as HTMLElement).hidden, pon: (document.getElementById("powerOn") as HTMLElement).hidden,
}));
const toast = (p: Page) => p.locator("#toast").evaluate((e) => e.firstChild?.textContent);
const lockState = async (p: Page) => ({ env: await env(p), lock: await tree(p, "#lock") });
const addAccount = async (p: Page) => { await p.click("#accBtn"); await p.waitForTimeout(300); await p.click('#accMenu [data-go="accounts"]'); await p.waitForTimeout(700); await p.click('#accMenu [data-act="add"]'); };
/** Waits for a state instead of a fixed delay (the screens run 700–1900 ms timers; fixed sleeps race on a busy machine). */
const cond = async (p: Page, fn: () => boolean) => { await p.waitForFunction(fn, undefined, { timeout: 8000 }); await p.waitForTimeout(60); };
/** Back on the desktop, then past the 450–500 ms welcome toast (the boot animation lasts 1.1–1.5 s). */
const unlocked = async (p: Page) => {
  await p.waitForFunction(() => !document.body.classList.contains("locked"), undefined, { timeout: 8000 });
  const boot = await p.evaluate(() => document.getElementById("shell")!.classList.contains("boot")); await p.waitForTimeout(650); return boot;
};
/** Lock from the system menu; the screen focuses the password 700 ms later. */
const lockNow = async (p: Page) => { await p.click("#sysBtn"); await p.click('#sysMenu [data-act="lock"]'); await p.waitForFunction(() => document.activeElement?.id === "lkPass", undefined, { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(100); };

test("lock screen: open, password errors, eye, caps, unlock with the welcome toast and boot animation", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await lockNow(p); out.push(await lockState(p));
    await p.click("#unlockBtn"); await p.waitForTimeout(200); out.push(await lockState(p));
    await p.fill("#lkPass", "ab"); out.push(await tree(p, "#lkMsg"));
    await p.click("#lkEye"); out.push(await tree(p, ".lk-pass"));
    await p.click("#unlockBtn"); out.push(await tree(p, "#unlockBtn")); await cond(p, () => !document.getElementById("unlockBtn")!.classList.contains("busy")); out.push(await lockState(p));
    await p.keyboard.press("CapsLock"); await p.keyboard.press("KeyX"); out.push(await tree(p, "#lkMsg")); await p.keyboard.press("CapsLock");
    await p.fill("#lkPass", "abcd"); await p.keyboard.press("Enter"); await cond(p, () => document.getElementById("unlockBtn")!.classList.contains("ok")); out.push(await tree(p, "#unlockBtn"));
    out.push(await unlocked(p)); out.push(await lockState(p), await toast(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("lock screen faces: PIN (keys and pad), switch user, SSO, passkey", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await lockNow(p); await p.click('#lkCard [data-face-go="pin"]'); await p.waitForTimeout(300); out.push(await tree(p, "#lkCard"), await env(p));
    for (const k of "1111") await p.keyboard.press(k); await cond(p, () => !!document.querySelector("#pinMsg.err")); out.push(await tree(p, '[data-face="pin"]')); await cond(p, () => !document.querySelector("#pinDots i.on")); out.push(await tree(p, "#pinDots"));
    await p.click('#lkCard [data-pin="9"]'); await p.click('#lkCard [data-pin="del"]'); out.push(await tree(p, "#pinDots"));
    await p.keyboard.press("Escape"); await p.waitForTimeout(200); out.push(await tree(p, "#lkCard"));
    await p.click("#lkSwitch"); await p.waitForTimeout(300); out.push(await tree(p, "#lkCard"));
    const ids = await p.locator("#lkCard [data-lkacc]").evaluateAll((b) => b.map((x) => (x as HTMLElement).dataset.lkacc));
    await p.click(`#lkCard [data-lkacc="${ids[1]}"]`); await p.waitForTimeout(300); out.push(await lockState(p));
    await p.click('#lkCard [data-face-go="sso"]'); await p.waitForTimeout(300); await p.click('#lkCard [data-sso="ssoGoogle"]'); out.push(await tree(p, '[data-face="sso"]'));
    out.push(await unlocked(p)); out.push(await lockState(p), await toast(p));
    await lockNow(p); await p.click('#lkCard [data-face-go="passkey"]'); await p.waitForTimeout(300); out.push(await tree(p, '[data-face="passkey"]'));
    await cond(p, () => !!document.querySelector("#pk.done")); out.push(await tree(p, '[data-face="passkey"]')); out.push(await unlocked(p)); out.push(await env(p));
    await lockNow(p); await p.click('#lkCard [data-face-go="pin"]'); await p.waitForTimeout(300); for (const k of "1234") await p.keyboard.press(k); await p.waitForTimeout(300); out.push(await tree(p, "#pinDots")); out.push(await unlocked(p)); out.push(await env(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("lock bar: language, accessibility switches, power menu, sleep / wake, glance, lockout", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await lockNow(p);
    await p.click("#lkLang"); await p.waitForTimeout(200); out.push(await tree(p, ".lk-pop"), await env(p));
    await p.click('.lk-pop [data-l="fr"]'); await p.waitForTimeout(400); out.push(await lockState(p), await toast(p));
    await p.click('#lkCard [data-face-go="pin"]'); await p.waitForTimeout(300); await p.click("#lkLang"); await p.click('.lk-pop [data-l="de"]'); await p.waitForTimeout(400); out.push(await tree(p, "#lkCard"));
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    await p.click("#lkA11y"); await p.waitForTimeout(150); out.push(await tree(p, ".lk-pop"));
    for (const k of ["big", "hc", "rm"]) await p.click(`.lk-pop [data-a="${k}"]`); out.push(await tree(p, ".lk-pop"), await env(p), await p.evaluate(() => document.getElementById("lock")!.className));
    await p.click("#lkA11y"); await p.waitForTimeout(150); out.push(await p.locator(".lk-pop").count());
    await p.click("#lkPower"); await p.waitForTimeout(150); out.push(await tree(p, ".lk-pop"));
    await p.click('.lk-pop [data-p="sleep"]'); await p.waitForTimeout(200); out.push(await p.evaluate(() => document.getElementById("lock")!.className), await env(p));
    await p.keyboard.press("KeyA"); await p.waitForTimeout(400); out.push(await p.evaluate(() => document.getElementById("lock")!.className), await env(p));
    await p.keyboard.press("Escape"); await p.waitForTimeout(200); out.push(await p.evaluate(() => document.getElementById("lock")!.className), await env(p));
    await p.mouse.move(600, 400); await p.mouse.move(640, 420); await p.waitForTimeout(400); out.push(await p.evaluate(() => document.getElementById("lock")!.className), await env(p));
    for (let i = 0; i < 5; i++) { await p.fill("#lkPass", "x"); await p.keyboard.press("Enter"); await p.waitForTimeout(800); }
    out.push(await lockState(p));
    await p.keyboard.press("Control+Shift+T"); await p.waitForTimeout(200); out.push(await p.evaluate(() => document.documentElement.classList.contains("dark")));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("power: restart and shut down from the system menu, power on, restart from the lock screen", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.click("#sysBtn"); await p.click('#sysMenu [data-act="restart"]'); await p.waitForTimeout(200); out.push(await tree(p, "#power"), await env(p));
    await p.waitForTimeout(2700); out.push(await env(p));
    await p.click("#sysBtn"); await p.click('#sysMenu [data-act="shutdown"]'); await p.waitForTimeout(200); out.push(await env(p));
    await p.waitForTimeout(2200); out.push(await tree(p, "#power"), await env(p));
    await p.click("#powerOn"); await p.waitForTimeout(200); out.push(await env(p)); await p.waitForTimeout(1800); out.push(await env(p));
    await lockNow(p); await p.click("#lkPower"); await p.click('.lk-pop [data-p="restart"]'); await p.waitForTimeout(200); out.push(await env(p), await p.evaluate(() => document.getElementById("lock")!.className));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("sign out → sign-in screen: tabs, validation, reset link, SSO, passkey, providers, language, theme, sign in", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await p.click("#accBtn"); await p.waitForTimeout(300); await p.click('#accMenu [data-act="signout"]'); await p.waitForTimeout(200); out.push(await env(p));
    await p.waitForTimeout(1900); out.push(await tree(p, "#si"), await env(p));
    await p.fill("#siEmail", "nope"); await p.click("#siForm .si-btn"); out.push(await tree(p, "#siForm"));
    await p.fill("#siEmail", "x@y.co"); await p.click("#siForm .si-btn"); out.push(await tree(p, "#siForm"));
    await p.fill("#siPass", "ab"); await p.click("#siEye"); await p.click("#siForm .si-btn"); out.push(await tree(p, "#siForm")); await cond(p, () => !document.querySelector("#siForm .si-btn.busy")); out.push(await tree(p, "#siForm"));
    await p.click('#siScroll [data-tab="sso"]'); await p.waitForTimeout(200); out.push(await tree(p, "#siScroll"));
    await p.click("#siForm .si-btn"); out.push(await tree(p, "#siForm"));
    await p.click('#siScroll [data-tab="passkey"]'); await p.waitForTimeout(200); out.push(await tree(p, "#siViews"));
    await p.click('#siScroll [data-gov-toggle]'); out.push(await tree(p, ".si-gov"));
    await p.click('#siScroll [data-tab="email"]'); await p.click("#siScroll [data-forgot]"); await p.waitForTimeout(300); out.push(await tree(p, "#siScroll"));
    await p.click("#siForm .si-btn"); await cond(p, () => !!document.querySelector('#siForm[data-kind="done"]')); out.push(await tree(p, "#siScroll"));
    await p.click("#siScroll [data-back]"); await p.waitForTimeout(300); out.push(await tree(p, "#siScroll"));
    await p.click("#siLang"); await p.waitForTimeout(150); out.push(await tree(p, ".si-pop"));
    await p.fill("#siPass", "secret"); await p.click('.si-pop [data-l="ar"]'); await p.waitForTimeout(400); out.push(await tree(p, "#si"), await env(p), await p.inputValue("#siPass"));
    await p.click("#siTheme"); await p.waitForTimeout(300); out.push(await tree(p, "#siTheme"), await p.evaluate(() => document.documentElement.classList.contains("dark")));
    await p.click("#siScroll [data-help]"); out.push(await toast(p));
    await p.click("#siRem"); await p.click("#siForm .si-btn"); await cond(p, () => !!document.querySelector("#siForm .si-btn.ok")); out.push(await tree(p, "#siForm"));
    out.push(await unlocked(p)); out.push(await env(p), await toast(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});

test("sign-in: provider tile, passkey tile, add account (empty e-mail), Escape on the reset screen", async ({ browser, baseURL }) => {
  const r = await both(browser, baseURL, async (p) => {
    const out: unknown[] = [];
    await addAccount(p); await p.waitForTimeout(900); out.push(await tree(p, "#siScroll"), await env(p));
    await p.click('#siScroll [data-prov="Google"]'); out.push(await tree(p, ".si-prov"), await tree(p, "#siMsg")); out.push(await unlocked(p)); out.push(await env(p));
    await addAccount(p); await p.waitForTimeout(900);
    await p.click("#siScroll [data-forgot]"); await p.waitForTimeout(300); await p.keyboard.press("Escape"); await p.waitForTimeout(300); out.push(await tree(p, "#siScroll"));
    await p.click('#siScroll [data-prov="passkey"]'); await p.waitForTimeout(700); out.push(await tree(p, "#siViews")); await cond(p, () => !!document.querySelector("#siPk.done")); out.push(await tree(p, "#siViews")); out.push(await unlocked(p)); out.push(await env(p));
    return out;
  });
  expect(r.react).toEqual(r.source);
});
