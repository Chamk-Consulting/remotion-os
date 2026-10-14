/**
 * L5 · Visual regression: the TARGET app vs the SOURCE baseline (doc 13 §4). Threshold ≤ 0.1 % differing pixels.
 */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { serveGoogleFontsLocally } from "../helpers/fonts";
import { SCENES, VIEWPORTS, FIXED_NOW, seed, shellRoot } from "../helpers/scenes";

test.skip(!!process.env.CAPTURE, "comparison disabled while capturing");
fs.mkdirSync("test-results/visual", { recursive: true });
for (const s of SCENES) {
  test(`visual ${s.name}`, async ({ browser, baseURL }) => {
    const base = `tests/visual/baseline/${s.name}.png`;
    test.skip(!fs.existsSync(base), "no baseline");
    const ctx = await browser.newContext({ viewport: VIEWPORTS[s.vp], colorScheme: s.scheme, reducedMotion: "reduce", deviceScaleFactor: 1, baseURL });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(FIXED_NOW);
    await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
    await seed(page, s);
    // SHELL=react compares the React shell preview (Phase B) instead of the bridge for desktop scenes.
    if (process.env.SHELL_PREVIEW && s.app) test.skip(true, "apps still run through the bridge");
    await page.goto(s.app ? `/apps/${s.app}` : process.env.SHELL_PREVIEW ? "/?shell=react" : "/");
    await page.waitForTimeout(800);
    for (const f of page.frames()) await f.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(2500);
    if (s.act) { await s.act(await shellRoot(page), page); await page.mouse.move(1, 1); await page.waitForTimeout(500); }
    const shot = PNG.sync.read(await page.screenshot({ clip: s.clip })); const ref = PNG.sync.read(fs.readFileSync(base));
    expect([shot.width, shot.height]).toEqual([ref.width, ref.height]);
    const diff = new PNG({ width: ref.width, height: ref.height });
    const n = pixelmatch(ref.data, shot.data, diff.data, ref.width, ref.height, { threshold: 0.1 });
    const ratio = n / (ref.width * ref.height);
    const tag = process.env.SHELL_PREVIEW ? ".react" : "";
    if (ratio > 0) { fs.writeFileSync(`test-results/visual/${s.name}${tag}.diff.png`, PNG.sync.write(diff)); fs.writeFileSync(`test-results/visual/${s.name}${tag}.actual.png`, PNG.sync.write(shot)); }
    console.log(`${s.name}: ${(ratio * 100).toFixed(3)} % differing`);
    expect(ratio).toBeLessThanOrEqual(0.001);
    await ctx.close();
  });
}
