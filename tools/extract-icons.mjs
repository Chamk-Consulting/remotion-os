// Extracts the source's icon maps (exact SVG strings) from the booted file into src/os/shell/data/icons.json.
import { chromium } from '@playwright/test'; import fs from 'node:fs'; import path from 'node:path';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage(); await p.route(/fonts\.googleapis|fonts\.gstatic|cdnjs/, r => r.abort());
await p.goto('file://' + path.resolve('../source/Remotion_Desktop.html')); await p.waitForTimeout(1500);
const data = await p.evaluate(() => {
  const strOnly = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'string'));
  return { OSI: strOnly(OSI), OIC: strOnly(OIC), DKI: strOnly(DKI), MINI, OSA_IC: strOnly(OSA_IC) };
});
await b.close();
fs.writeFileSync('src/os/shell/data/icons.json', JSON.stringify(data, null, 1));
console.log(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v.length : Object.keys(v).length])));
