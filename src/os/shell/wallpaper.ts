/**
 * Procedural wallpaper painter — verbatim port of the source (L7511–L7591). Deterministic (seeded rng), so the
 * React shell paints pixel-identical wallpapers. Do not "tidy" the maths: parity tests compare pixels.
 */
export type Scene = { night?: number; sky: string[]; sun: string; far: string; mid: string; near: string; lake: string[]; hill: string; flowers: string[] };
export const scenes: Scene[] = [
  { sky: ["#5b8fd1", "#9cc3e6", "#f6c9a0", "#ffb36b"], sun: "#fff1c4", far: "#7d8fb0", mid: "#4f6380", near: "#2f4a3a", lake: ["#f3c48e", "#8fb3cf"], hill: "#3f7a3a", flowers: ["#ff5fa8", "#ffd84a", "#ff8ad0"] },
  { sky: ["#2f6fc4", "#7fb4e8", "#cfe4f5", "#e9f2f8"], sun: "#ffffff", far: "#8aa3c4", mid: "#56708f", near: "#2f4f3f", lake: ["#bcd8ee", "#4f86b6"], hill: "#4f8a3c", flowers: ["#ffffff", "#f6e05e", "#a9d4ff"] },
  { sky: ["#3f7f9a", "#8ec2b5", "#d9ead0", "#f1eccb"], sun: "#fffbe0", far: "#7aa098", mid: "#4c7266", near: "#264536", lake: ["#cde4c9", "#4f8f7a"], hill: "#3c7a2e", flowers: ["#ffe066", "#ff9f6b", "#ffffff"] },
  { sky: ["#6a5acd", "#b48fd8", "#f3b6c8", "#ffd3a8"], sun: "#fff0d8", far: "#8f86b8", mid: "#5d5788", near: "#2e3b3a", lake: ["#f1c1c9", "#8a86c4"], hill: "#3e6f45", flowers: ["#ff7eb6", "#ffe28a", "#c9a6ff"] },
  { sky: ["#c2703d", "#e8a86a", "#f6d7a7", "#fbeed2"], sun: "#fff6dc", far: "#a9886c", mid: "#7a5a45", near: "#3b2f25", lake: ["#f3cf9f", "#9a7a5c"], hill: "#8a6a2a", flowers: ["#ff9f43", "#ffd166", "#e85d4a"] },
];
export const nightScenes: Scene[] = [
  { night: 1, sky: ["#060b1f", "#121f45", "#2b2f5e", "#5a4a72"], sun: "#dfe8ff", far: "#3a4566", mid: "#252f4b", near: "#0c1712", lake: ["#3f4570", "#121a33"], hill: "#17331d", flowers: ["#a2477c", "#a8963a", "#8c5f8b"] },
  { night: 1, sky: ["#040a1c", "#0f1c3e", "#1f3361", "#34507e"], sun: "#e8f0ff", far: "#33456a", mid: "#1f2d4a", near: "#0b1813", lake: ["#2c4470", "#0f1a33"], hill: "#18361f", flowers: ["#c9d4e6", "#a99a45", "#6e8fb8"] },
  { night: 1, sky: ["#05121a", "#0f2a33", "#1f4146", "#3d5b55"], sun: "#eefbea", far: "#2f4a46", mid: "#1d3532", near: "#081510", lake: ["#2b4a44", "#0d1f1c"], hill: "#15301a", flowers: ["#b9a43f", "#a66a48", "#c8d0c8"] },
  { night: 1, sky: ["#0b0820", "#1d1640", "#3a2a5e", "#6b4a78"], sun: "#efe6ff", far: "#3e3766", mid: "#2a2448", near: "#0e1414", lake: ["#4a3f72", "#16122e"], hill: "#1b2f22", flowers: ["#b0508a", "#b8a24a", "#8e6fb8"] },
  { night: 1, sky: ["#120a06", "#2a1a10", "#4a2e1c", "#6e4a2e"], sun: "#ffeccc", far: "#4a3a2e", mid: "#30251d", near: "#100c08", lake: ["#5a4630", "#1c140c"], hill: "#2c2410", flowers: ["#b8743a", "#b89a4a", "#a8503e"] },
];
export const sceneFor = (i: number, dark: boolean) => (dark ? nightScenes : scenes)[i % scenes.length];
export function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

type Peak = { x: number; a: number; wd: number };
export function paint(cv: HTMLCanvasElement, s: Scene, w: number, h: number) {
  const c = cv.getContext("2d")!, r = rng(42), hz = h * .6;
  const g = c.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, s.sky[0]); g.addColorStop(.35, s.sky[1]); g.addColorStop(.75, s.sky[2]); g.addColorStop(1, s.sky[3]);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (s.night) {
    const sr = rng(7);
    for (let i = 0; i < 420; i++) { const x = sr() * w, y = sr() * hz * .95, a = sr(); c.fillStyle = `rgba(235,240,255,${.25 + a * .7})`; c.beginPath(); c.arc(x, y, (.4 + a * 1.1) * Math.max(1, w / 1800), 0, 7); c.fill(); }
  }
  const sx = w * .63, sy = s.night ? h * .2 : h * .42;
  const sg = c.createRadialGradient(sx, sy, 0, sx, sy, w * (s.night ? .16 : .35));
  sg.addColorStop(0, s.sun); sg.addColorStop(.08, s.sun + "cc"); sg.addColorStop(.35, s.sun + (s.night ? "22" : "33")); sg.addColorStop(1, "transparent");
  c.fillStyle = sg; c.fillRect(0, 0, w, h);
  if (s.night) { const mr = Math.max(4, w * .018); c.fillStyle = "#f3f6ff"; c.beginPath(); c.arc(sx, sy, mr, 0, 7); c.fill(); c.fillStyle = "rgba(170,180,210,.35)"; c.beginPath(); c.arc(sx - mr * .3, sy - mr * .2, mr * .25, 0, 7); c.arc(sx + mr * .35, sy + mr * .3, mr * .18, 0, 7); c.fill(); }
  for (let i = 0; i < 70; i++) {
    const x = r() * w, y = r() * h * .38, rw = w * (.04 + r() * .09), rh = rw * (.25 + r() * .2);
    const cg = c.createRadialGradient(x, y, 0, x, y, rw);
    const cc = s.night ? "120,135,180" : "255,240,225";
    cg.addColorStop(0, `rgba(${cc},${s.night ? .22 : .55})`); cg.addColorStop(1, `rgba(${cc},0)`);
    c.fillStyle = cg; c.beginPath(); c.ellipse(x, y, rw, rh, 0, 0, 7); c.fill();
  }
  function ridge(base: number, amp: number, col: string, peaks: Peak[]) {
    c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 240) { let y = base; for (const p of peaks) y -= p.a * Math.max(0, 1 - Math.abs(x - p.x) / p.wd); y += (r() - .5) * amp; c.lineTo(x, y); }
    c.lineTo(w, h); c.closePath();
    const mg = c.createLinearGradient(0, base - h * .25, 0, base + 40); mg.addColorStop(0, col); mg.addColorStop(1, col + "dd");
    c.fillStyle = mg; c.fill();
    c.save(); c.clip();
    for (const p of peaks) {
      if (p.a < h * .1) continue;
      const top = base - p.a, sgr = c.createLinearGradient(0, top, 0, top + p.a * .4);
      sgr.addColorStop(0, "rgba(255,255,255,.95)"); sgr.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = sgr; c.beginPath(); c.moveTo(p.x - p.wd * .5, top + p.a * .5);
      for (let k = 0; k <= 12; k++) { const xx = p.x - p.wd * .5 + k * p.wd / 12; c.lineTo(xx, top + p.a * (.1 + r() * .35) + Math.abs(xx - p.x) / p.wd * p.a * .6); }
      c.lineTo(p.x + p.wd * .5, top + p.a * .5); c.closePath(); c.fill();
    }
    c.restore();
  }
  ridge(hz, 4, s.far, [{ x: w * .3, a: h * .24, wd: w * .25 }, { x: w * .42, a: h * .32, wd: w * .2 }, { x: w * .55, a: h * .2, wd: w * .18 }, { x: w * .82, a: h * .22, wd: w * .25 }, { x: w * .12, a: h * .15, wd: w * .2 }]);
  ridge(hz + h * .03, 6, s.mid, [{ x: w * .37, a: h * .18, wd: w * .18 }, { x: w * .2, a: h * .12, wd: w * .2 }, { x: w * .7, a: h * .1, wd: w * .25 }, { x: w * .95, a: h * .14, wd: w * .2 }]);
  const ly = hz + h * .06;
  const lg = c.createLinearGradient(0, ly, 0, h); lg.addColorStop(0, s.lake[0]); lg.addColorStop(.6, s.lake[1]); lg.addColorStop(1, s.lake[1]);
  c.fillStyle = lg; c.fillRect(0, ly, w, h - ly);
  for (let i = 0; i < 160; i++) { const yy = ly + r() * h * .25, sp = (yy - ly) * .6 + 10; c.fillStyle = (s.night ? "rgba(215,228,255," : "rgba(255,240,200,") + (.15 + r() * .4) + ")"; c.fillRect(sx - sp * r() * 1.2 + sp * .5 * r(), yy, 4 + r() * 30, 1.2); }
  function trees(x0: number, x1: number, base: number, size: number, col: string, n: number) { c.fillStyle = col; for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), s2 = size * (.6 + r() * .7); c.beginPath(); c.moveTo(x, base - s2 * 2.4); c.lineTo(x - s2 * .6, base); c.lineTo(x + s2 * .6, base); c.fill(); } }
  c.fillStyle = s.near; c.beginPath(); c.ellipse(w * .25, ly + 4, w * .28, h * .03, 0, 0, 7); c.fill();
  trees(0, w * .5, ly + 6, h * .018, s.near, 160);
  c.beginPath(); c.ellipse(w * .82, ly + h * .02, w * .2, h * .025, 0, 0, 7); c.fill();
  trees(w * .65, w, ly + h * .025, h * .016, s.near, 90);
  ([[.48, .12], [.56, .15], [.66, .2]] as const).forEach(([fx, fy]) => { c.fillStyle = s.near; c.beginPath(); c.ellipse(w * fx, ly + h * fy, w * .05, h * .012, 0, 0, 7); c.fill(); trees(w * fx - w * .04, w * fx + w * .04, ly + h * fy, h * .01, s.near, 15); });
  function hill(pts: number[][], col: string) { c.beginPath(); c.moveTo(pts[0][0] * w, h); pts.forEach((p) => c.lineTo(p[0] * w, p[1] * h)); c.lineTo(pts[pts.length - 1][0] * w, h); c.closePath(); c.fillStyle = col; c.fill(); }
  hill([[0, .55], [.12, .6], [.22, .72], [.32, .86], [.42, 1]], s.hill);
  hill([[.72, 1], [.82, .82], [.92, .7], [1, .66]], s.hill);
  trees(0, w * .12, h * .66, h * .04, s.near, 40); trees(w * .88, w, h * .74, h * .04, s.near, 30);
  c.fillStyle = s.night ? "rgba(70,72,80,.9)" : "rgba(150,140,130,.9)"; c.beginPath(); c.ellipse(w * .08, h * .94, w * .08, h * .06, -.2, 0, 7); c.fill();
  for (let i = 0; i < 2200; i++) {
    const left = r() < .6, x = left ? r() * w * .38 : w * .74 + r() * w * .26;
    const minY = left ? h * (.58 + (x / w) * .9) : h * (.68 + (1 - x / w) * .4), y = minY + r() * (h - minY);
    c.fillStyle = s.flowers[i % 3]; c.globalAlpha = .55 + r() * .45;
    c.beginPath(); c.arc(x, y, 1 + r() * 2.6 * (y / h), 0, 7); c.fill();
  }
  c.globalAlpha = 1;
}
