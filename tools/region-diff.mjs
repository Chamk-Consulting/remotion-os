// Dev helper: pixel diff of named regions between a baseline and a target screenshot.
import fs from 'node:fs'; import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch';
const [a, b, ...regs] = process.argv.slice(2);
const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
const crop = (img, x, y, w, h) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, x, y, w, h, 0, 0); return o; };
for (const r of regs) {
  const [name, x, y, w, h] = r.split(':'); const ca = crop(A, +x, +y, +w, +h), cb = crop(B, +x, +y, +w, +h);
  const d = new PNG({ width: +w, height: +h }); const n = pixelmatch(ca.data, cb.data, d.data, +w, +h, { threshold: 0.1 });
  console.log(`${name.padEnd(12)} ${(100 * n / (w * h)).toFixed(3)} %`);
  if (n) fs.writeFileSync(`/tmp/claude-0/-home-claude/17e346a9-23cc-5be5-bd09-65e8c276b56f/scratchpad/diff-${name}.png`, PNG.sync.write(d));
}
