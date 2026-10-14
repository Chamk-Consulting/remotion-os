/** Window geometry (L20908–L20910): work area above the dock and the seven snap zones. Pure apart from reading the dock rect. */
export type Zone = "left" | "right" | "tl" | "tr" | "bl" | "br" | "max";
export type Rect = { l: number; t: number; w: number; h: number };

export function osAvail() {
  const dk = document.getElementById("dock")?.getBoundingClientRect();
  const bottom = dk && dk.top > 200 ? dk.top - 8 : innerHeight - 8;
  return { l: 8, t: 64, r: innerWidth - 8, b: bottom };
}
export function osSnapRect(z: Zone): Rect {
  const A = osAvail(), W = A.r - A.l, H = A.b - A.t, g = 8, hw = (W - g) / 2, hh = (H - g) / 2, x2 = A.l + (W + g) / 2, y2 = A.t + (H + g) / 2;
  return { left: { l: A.l, t: A.t, w: hw, h: H }, right: { l: x2, t: A.t, w: hw, h: H }, tl: { l: A.l, t: A.t, w: hw, h: hh }, tr: { l: x2, t: A.t, w: hw, h: hh }, bl: { l: A.l, t: y2, w: hw, h: hh }, br: { l: x2, t: y2, w: hw, h: hh }, max: { l: A.l, t: A.t, w: W, h: H } }[z];
}
/** Zone under the pointer while dragging a title bar (L20934). */
export function zoneAt(x: number, y: number): Zone | null {
  const E = 14;
  return y <= 62 ? (x <= E * 3 ? "tl" : x >= innerWidth - E * 3 ? "tr" : "max") : x <= E ? (y >= innerHeight * .7 ? "bl" : "left") : x >= innerWidth - E ? (y >= innerHeight * .7 ? "br" : "right") : null;
}
/** Initial placement (osWinOpen L11815). */
export function initialRect(o: { w: number; h: number; x?: number; y?: number }): Rect {
  const W = Math.min(o.w, innerWidth - 16), H = Math.min(o.h, innerHeight - 70);
  let x = o.x ?? (innerWidth - W) / 2, y = o.y ?? 90;
  x = Math.max(8, Math.min(innerWidth - W - 8, x)); y = Math.max(62, Math.min(innerHeight - H - 8, y));
  return { l: x, t: y, w: W, h: H };
}
/** Translate that maps `r` onto the centre of `f` (genie open / minimise). */
export const towards = (r: DOMRect, f: DOMRect) => `translate(${f.left + f.width / 2 - r.left - r.width / 2}px,${f.top + f.height / 2 - r.top - r.height / 2}px)`;
