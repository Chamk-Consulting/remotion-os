const { chromium } = require('playwright');
const path = require('path');
const src = 'file://' + path.resolve('src/Remotion_Desktop.html');
const out = (n) => path.resolve('shots', n + '.png');
const log = [];
(async () => {
  const browser = await chromium.launch({executablePath: require('fs').existsSync('/opt/pw-browsers/chromium') && require('fs').statSync('/opt/pw-browsers/chromium').isFile() ? '/opt/pw-browsers/chromium' : require('child_process').execSync('ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome | head -1').toString().trim()});
  async function snap(name, opts, hash, after) {
    const ctx = await browser.newContext({ viewport: opts.vp, colorScheme: opts.scheme || 'light', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [], fails = [];
    page.on('pageerror', e => errs.push(String(e.message).slice(0, 300)));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
    page.on('requestfailed', r => fails.push(r.url().slice(0, 120) + ' ' + (r.failure()?.errorText || '')));
    const t0 = Date.now();
    await page.goto(src + (hash || ''), { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500);
    if (after) await after(page);
    await page.screenshot({ path: out(name) });
    const vis = await page.evaluate(() => ['#lock', '#si', '#rg', '#power', '#shell'].map(s => { const e = document.querySelector(s); if (!e) return s + ':none'; const cs = getComputedStyle(e); return s + ':' + (e.getAttribute('aria-hidden') || '') + '/' + cs.display + '/' + cs.visibility + '/' + cs.opacity; }).join(' '));
    log.push({ name, ms: Date.now() - t0, vis, errs: [...new Set(errs)].slice(0, 15), fails: [...new Set(fails)].slice(0, 10) });
    await ctx.close();
  }
  const D = { vp: { width: 1440, height: 900 } };
  await snap('desktop-1440-light', D);
  await snap('desktop-1440-dark', { ...D, scheme: 'dark' });
  await snap('tablet-1024-light', { vp: { width: 1024, height: 768 } });
  await snap('mobile-390-light', { vp: { width: 390, height: 844 } });
  for (const k of ['documents','forms','files','terminal','calcsci','billing','hrPeople','patients','calendar','cabinet','planning'])
    await snap('app-' + k, D, '#app=' + k);
  await browser.close();
  require('fs').writeFileSync('shots/log.json', JSON.stringify(log, null, 1));
  console.log(JSON.stringify(log, null, 1).slice(0, 6000));
})();
