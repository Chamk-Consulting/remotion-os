// Verifies src/locales/*.json equal the source's runtime I18N object after boot.
import { chromium } from '@playwright/test'; import fs from 'node:fs'; import path from 'node:path';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage(); await p.route(/fonts\.googleapis|fonts\.gstatic|cdnjs/, r => r.abort());
await p.goto('file://' + path.resolve('../source/Remotion_Desktop.html')); await p.waitForTimeout(1500);
const rt = await p.evaluate(() => JSON.stringify(I18N)); await b.close();
const R = JSON.parse(rt); let ok = true;
for (const l of Object.keys(R)) { const mine = JSON.parse(fs.readFileSync(`src/locales/${l}.json`, 'utf8'));
  const a = Object.keys(R[l]), m = Object.keys(mine); const miss = a.filter(k => !(k in mine)), extra = m.filter(k => !(k in R[l])), diff = a.filter(k => k in mine && mine[k] !== R[l][k]);
  console.log(l, 'runtime', a.length, 'extracted', m.length, 'missing', miss.length, 'extra', extra.length, 'diff', diff.length, miss.slice(0, 5), diff.slice(0, 5)); if (miss.length || extra.length || diff.length) ok = false; }
console.log(ok ? 'I18N PARITY OK' : 'I18N PARITY FAIL'); process.exit(ok ? 0 : 1);
