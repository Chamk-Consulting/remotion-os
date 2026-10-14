// B-01T: extracts the app registry tables from the booted source (exact values) into src/apps/registry.data.json
import { chromium } from '@playwright/test'; import fs from 'node:fs'; import path from 'node:path';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage(); await p.route(/fonts\.googleapis|fonts\.gstatic|cdnjs/, r => r.abort());
await p.goto('file://' + path.resolve('../source/Remotion_Desktop.html')); await p.waitForTimeout(1500);
const data = await p.evaluate(() => ({
  railItems, dockApps, DK_APPS, AL_APPS, AL_CATS,
  OS_SOLO: Object.fromEntries(Object.entries(OS_SOLO)),
  OS_DOCK: { ...OS_DOCK }, OS_OPEN_KEYS: Object.keys(OS_OPEN),
  soloAliases: Object.fromEntries(['docs','explorer','calculator','documents','files','hrPeople','calcsci'].map(k => [k, osSoloKey(k)])),
}));
await b.close();
fs.mkdirSync('src/apps', { recursive: true });
fs.writeFileSync('src/apps/registry.data.json', JSON.stringify(data, null, 1));
console.log(Object.keys(data.DK_APPS).length, 'glyphs;', data.AL_APPS.length, 'launcher;', data.railItems.length, 'rail;', data.dockApps.length, 'dock;', data.OS_OPEN_KEYS.join(','));
console.log('OS_DOCK', JSON.stringify(data.OS_DOCK)); console.log('aliases', JSON.stringify(data.soloAliases));
