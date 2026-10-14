import { test, expect, type Frame } from "@playwright/test";
import { serveGoogleFontsLocally } from "../helpers/fonts";

const SOLO = ["documents","forms","files","terminal","calcsci","billing","hrPeople","patients","calendar","cabinet","planning"];
const legacy = async (page: import("@playwright/test").Page): Promise<Frame> => {
  const f = page.frameLocator("iframe"); await f.locator("#shell").waitFor({ state: "attached" });
  return page.frames().find((x) => x.url().includes("/legacy/"))!;
};

test.beforeEach(async ({ page }) => { await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort()); });

test("/ boots the OS desktop with no console errors", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/"); const f = await legacy(page);
  await expect(f.locator("#dock")).toBeVisible(); await expect(f.locator(".top")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const k of SOLO) {
  test(`/apps/${k} boots standalone app mode`, async ({ page }) => {
    await page.goto(`/apps/${k}`); const f = await legacy(page);
    await expect.poll(() => f.evaluate(() => document.body.classList.contains("os-appmode") && document.body.classList.contains("os-standalone")), { timeout: 15000 }).toBe(true);
    await expect.poll(() => f.evaluate((key) => (window as unknown as { eval: (s: string) => unknown }).eval("OSA.key") === key, k), { timeout: 15000 }).toBe(true);
    await expect.poll(() => page.title()).toContain("· Remotion");
  });
}

test("legacy hash links redirect: /#app=billing → /apps/billing", async ({ page }) => {
  await page.goto("/#app=billing"); await expect(page).toHaveURL(/\/apps\/billing$/);
});

test("language and theme persist across the bridge (same storage keys)", async ({ page }) => {
  await page.goto("/"); await legacy(page);
  await page.evaluate(() => { localStorage.setItem("remotion-lang", "ar"); localStorage.setItem("remotion-theme", "dark"); });
  await page.reload(); const f = await legacy(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => f.evaluate(() => document.documentElement.dir)).toBe("rtl");
});
