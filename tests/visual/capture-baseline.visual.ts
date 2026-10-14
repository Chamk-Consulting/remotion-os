/**
 * A-03 · Baseline capture from the SOURCE file with real fonts (T-VIS-00). Run with CAPTURE=1.
 * Output: tests/visual/baseline/<scene>.png (committed).
 */
import { test } from "@playwright/test";
import path from "node:path";
import { serveGoogleFontsLocally } from "../helpers/fonts";
import { SCENES, VIEWPORTS, FIXED_NOW, seed, shellRoot } from "../helpers/scenes";

const SRC = "file://" + path.resolve("../source/Remotion_Desktop.html");
test.skip(!process.env.CAPTURE, "baseline capture only with CAPTURE=1");
for (const s of SCENES) {
  test(`baseline ${s.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: VIEWPORTS[s.vp], colorScheme: s.scheme, reducedMotion: "reduce", deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(FIXED_NOW);
    await serveGoogleFontsLocally(page); await page.route(/cdnjs/, (r) => r.abort());
    await seed(page, s);
    await page.goto(SRC + (s.app ? `#app=${s.app}` : ""));
    // D-B01: the source cannot boot camelCase keys from the hash; run the same steps osBootApp (L21038) would run.
    if (s.app === "hrPeople") await page.evaluate(() => (window as unknown as { eval: (x: string) => void }).eval(`(function(k){document.body.classList.add("os-appmode","os-standalone","os-booting");var go=function(n){if(typeof OS_OPEN[k]!=="function"){if(n<60)setTimeout(function(){go(n+1)},100);return}try{osAppMode(k,true)}catch(e){}document.body.classList.remove("os-booting")};setTimeout(function(){go(0)},60)})("hrPeople")`));
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(2500);
    if (s.act) { await s.act(await shellRoot(page), page); await page.mouse.move(1, 1); await page.waitForTimeout(500); }
    await page.screenshot({ path: `tests/visual/baseline/${s.name}.png` });
    await ctx.close();
  });
}
