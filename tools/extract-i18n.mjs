// A-07: extracts every I18N dictionary from the source by executing only the dictionary lines in a VM.
// Output: src/locales/<lang>.json (full merged dictionary, same key/values as the source runtime) + manifest.
import fs from 'node:fs'; import vm from 'node:vm'; import crypto from 'node:crypto';
const SRC = new URL('../../source/Remotion_Desktop.html', import.meta.url);
const lines = fs.readFileSync(SRC, 'utf8').split('\n');
const L = (a, b = a) => lines.slice(a - 1, b).join('\n');
const ctx = vm.createContext({ console });
// base dictionaries + packs (file lines 7179–7504; stop before `let lang`)
vm.runInContext(L(7180, 7504) + '\n;globalThis.__I=I18N;globalThis.__L=LANGS;', ctx);
const extra = [10450, 11054, 11238, 11624, 12310];
for (const n of extra) vm.runInContext(L(n), ctx);
// Documents v68–v71 packs (multi-line IIFEs)
for (const [a, b] of [[20018, 20022], [20152, 20155], [20229, 20232], [20362, 20398], [20557, 20560], [20685, 20688], [20782, 20785], [20842, 20842]]) vm.runInContext(L(a, b), ctx);
// late packs (Cabinet / Planning names)
for (const n of [26670, 27197]) {
  const src = L(n); const m = src.match(/Object\.assign\(I18N\.[a-z]{2},\{[^}]*\}\)/g);
  if (m) m.forEach(s => vm.runInContext(s, ctx)); else console.warn('no pack at', n, src.slice(0, 120));
}
const I = vm.runInContext('I18N', ctx), LANGS = vm.runInContext('LANGS', ctx);
fs.mkdirSync('src/locales', { recursive: true });
const manifest = { source: 'Remotion_Desktop.html', sha256: crypto.createHash('sha256').update(fs.readFileSync(SRC)).digest('hex'), langs: LANGS, counts: {} };
for (const l of Object.keys(I)) { fs.writeFileSync(`src/locales/${l}.json`, JSON.stringify(I[l])); manifest.counts[l] = Object.keys(I[l]).length; }
fs.writeFileSync('src/locales/manifest.json', JSON.stringify(manifest, null, 1));
console.log(manifest.counts);
