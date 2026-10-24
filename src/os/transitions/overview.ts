"use client";
/**
 * Window overview "All windows" — catch-up slice S6 (Remotion OS v84, v89; v94 L28963–L29079, L29289–L29296).
 * The real windows of the current desktop spread into a grid (no copies). Ctrl+Win+↑ shows windows only; with the
 * setting "Desktops and windows" the desktop panel also spreads them, and a window can be dragged onto another desktop.
 * Motion follows speed and calm; reduced motion → instant layout.
 */
import { useShell, osDid } from "@/os/state/shell";
import { deskFx } from "@/os/desktop/DesktopsPanel";
import { OSW, winEls, osFocus, osRestore, osMoveWin, osTopWin, osVis, useWm, winClass, type Win } from "@/os/windows/wm";
import { ACTIONS } from "@/os/shortcuts/actions";
import { SC_CATS } from "@/os/shortcuts/catalogue";
import { TR, TR_SPEED, trSt, trRM, trTiming, wsBefore } from "./transitions";
import { trWx, esc } from "./settings";
import { SW, XP as XPs } from "./state";
import { swClose } from "./switcher";

type Slot = { w: Win; r: DOMRect; s: number; cx: number; cy: number; box: { l: number; t: number; w: number; h: number } };
const XP: { top: number; open: boolean; panel: boolean; slots: Slot[]; i: number; hit: HTMLElement | null; dim: HTMLElement | null; tok: number;
  drag: { i: number; s: Slot; x0: number; y0: number; moved: boolean; pid: number; btn: HTMLElement } | null; keys: string; reT?: ReturnType<typeof setTimeout>; prev: HTMLElement | null } =
  { top: 0, open: false, panel: false, slots: [], i: 0, hit: null, dim: null, tok: 0, drag: null, keys: "", prev: null };
const shell = () => document.getElementById("shell")!;
const el = (w: Win) => winEls.get(w.key)!;
const titleOf = (w: Win) => el(w)?.querySelector(":scope>.os-wh>b")?.textContent || w.key;
const iconOf = (w: Win) => el(w)?.querySelector(":scope>.os-wh>.gl")?.outerHTML || "";
const live = (key: string) => { const w = useWm.getState().wins[key]; return w && !w.closing ? w : undefined; };
const sync = () => { XPs.open = XP.open; XPs.panel = XP.panel; };
const keysNow = () => OSW().map((w) => w.key).sort().join(",");

function xpList() { return OSW().filter((w) => osVis(w) && !w.min && !w.hidden && !w.off && el(w)); }
function xpMinList() { const st = useShell.getState(); return OSW().filter((w) => w.ws === st.selWs && w.min && (w.all || w.did === osDid(st.cur))); }
function xpArea() {
  const top = (document.querySelector("header.top")?.getBoundingClientRect().bottom || 56) + (XP.panel ? 18 : 44); let bottom: number;
  if (XP.panel) { const ph = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--panel-h")) || 118; bottom = innerHeight - ph - 26; }
  else { const d = document.getElementById("dock")?.getBoundingClientRect(); bottom = (d && d.top > 200 ? d.top : innerHeight) - (xpMinList().length ? 64 : 18); }
  const side = innerWidth < 560 ? 12 : 28; return { l: side, t: top, r: innerWidth - side, b: Math.max(top + 120, bottom) };
}
function xpLayout(list: Win[]): Slot[] {
  const A = xpArea(), W = A.r - A.l, H = A.b - A.t, gap = innerWidth < 560 ? 14 : 26, lab = 26, n = list.length; if (!n) return [];
  const R = list.map((w) => ({ w, r: el(w).getBoundingClientRect() }));
  R.sort((a, b) => (Math.round(a.r.top / 120) - Math.round(b.r.top / 120)) || (a.r.left - b.r.left));
  if (document.documentElement.dir === "rtl") R.sort((a, b) => (Math.round(a.r.top / 120) - Math.round(b.r.top / 120)) || (b.r.right - a.r.right));
  let best: { cols: number; rows: number; cw: number; ch: number; s: number } | null = null;
  for (let cols = 1; cols <= n; cols++) { const rows = Math.ceil(n / cols), cw = (W - (cols - 1) * gap) / cols, ch = (H - (rows - 1) * gap) / rows - lab; if (cw < 60 || ch < 40) continue; const s = Math.min(...R.map(({ r }) => Math.min(cw / r.width, ch / r.height, .9))); if (!best || s > best.s) best = { cols, rows, cw, ch, s }; }
  if (!best) { const c = Math.ceil(Math.sqrt(n)); best = { cols: c, rows: Math.ceil(n / c), cw: W / c, ch: H / Math.ceil(n / c) - lab, s: .2 }; }
  const { cols, rows, cw, ch } = best, totH = rows * (ch + lab) + (rows - 1) * gap, y0 = A.t + (H - totH) / 2; const rtl = document.documentElement.dir === "rtl";
  return R.map(({ w, r }, i) => {
    const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - row * cols : cols, col = i % cols, rowW = inRow * cw + (inRow - 1) * gap, x0 = A.l + (W - rowW) / 2;
    const s = Math.min(cw / r.width, ch / r.height, .9), cx = rtl ? A.r - (W - rowW) / 2 - col * (cw + gap) - cw / 2 : x0 + col * (cw + gap) + cw / 2, cy = y0 + row * (ch + lab + gap) + ch / 2;
    return { w, r, s, cx, cy, box: { l: cx - r.width * s / 2, t: cy - r.height * s / 2, w: r.width * s, h: r.height * s } };
  });
}
const xpDur = () => Math.round(460 * (TR_SPEED[trSt().speed] || 1));
const xpEase = () => (trSt().appStyle === "calm" ? TR.MO.ease.calm : "cubic-bezier(.2,1.08,.3,1)");
const tf = (s: Slot, dx = 0, dy = 0, k = 1) => `translate(${(s.cx - (s.r.left + s.r.width / 2) + dx).toFixed(1)}px,${(s.cy - (s.r.top + s.r.height / 2) + dy).toFixed(1)}px) scale(${(s.s * k).toFixed(4)})`;
function xpApply(sl: Slot[], instant: boolean) {
  const d = instant || trRM() ? 0 : xpDur(), e = xpEase();
  sl.forEach((s, i) => { const E = el(s.w); winClass(s.w.key, "xp-mv", true); E.style.transitionDuration = d + "ms"; E.style.transitionTimingFunction = e; E.style.transitionDelay = d ? Math.min(i * 18, 120) + "ms" : "0ms"; E.style.transformOrigin = "50% 50%"; E.style.transform = tf(s); });
}
function xpHitHTML() {
  const mins = XP.panel ? [] : xpMinList();
  return `${XP.slots.map((s, i) => `<button type="button" class="xp-card${i === XP.i ? " on" : ""}" data-xpi="${i}" style="left:${s.box.l}px;top:${s.box.t - XP.top}px;width:${s.box.w}px;height:${s.box.h}px" aria-label="${esc(titleOf(s.w))}"><span class="xp-lab" dir="auto"><b>${esc(titleOf(s.w))}</b></span></button>`).join("")}
   ${!XP.slots.length && !XP.panel ? `<p class="xp-none">${esc(trWx("none"))}</p>` : ""}
   ${mins.length ? `<div class="xp-mins" role="group" aria-label="${esc(trWx("mins"))}"><span>${esc(trWx("mins"))}</span>${mins.map((w) => `<button type="button" data-xpmin="${esc(w.key)}">${iconOf(w)}<b dir="auto">${esc(titleOf(w))}</b></button>`).join("")}</div>` : ""}
   <p class="xp-hint">${esc(trWx(XP.panel ? "hintP" : "hint"))}</p>`;
}
function xpRender() { if (!XP.hit) return; XP.hit.innerHTML = xpHitHTML(); XP.hit.querySelectorAll<HTMLElement>(".xp-card").forEach((b) => b.addEventListener("pointerdown", xpDown)); }
export function xpOpen(o: { panel?: boolean } = {}) {
  if (SW.open) swClose(); /* v89 (4) */
  if (!XP.open && !o.panel) { const a = document.activeElement as HTMLElement | null; XP.prev = a && a !== document.body && !a.closest?.(".xp") ? a : null; }
  if (XP.open) { if (!o.panel) xpClose(); return; }
  if (document.body.classList.contains("locked") || SW.open) return; if (!o.panel) { try { useShell.getState().closeAll(); } catch { /* nothing */ } }
  XP.panel = !!o.panel; XP.open = true; sync(); XP.tok++; const list = xpList(); XP.slots = xpLayout(list); XP.i = 0;
  const tw = osTopWin(); const k = XP.slots.findIndex((s) => s.w.key === tw?.key); if (k >= 0) XP.i = k;
  const sh = shell(); const dim = XP.dim = document.createElement("div"); dim.className = "xp-dim"; const firstWin = sh.querySelector(":scope>.os-win"); sh.insertBefore(dim, firstWin || null);
  const hit = XP.hit = document.createElement("div"); hit.className = "xp" + (XP.panel ? " with-panel" : ""); hit.setAttribute("role", XP.panel ? "group" : "dialog"); if (!XP.panel) hit.setAttribute("aria-modal", "true"); hit.setAttribute("aria-label", trWx("title"));
  XP.top = Math.round(document.querySelector("header.top")?.getBoundingClientRect().bottom || 0); hit.style.top = XP.top + "px"; sh.appendChild(hit);
  document.body.classList.add("xp-on"); xpRender(); xpApply(XP.slots, false);
  if (!trRM()) { dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: Math.round(xpDur() * .6), easing: "ease-out" }); hit.animate([{ opacity: 0 }, { opacity: 1 }], { duration: Math.round(xpDur() * .7), delay: Math.round(xpDur() * .3), easing: "ease-out", fill: "backwards" }); }
  hit.addEventListener("click", xpClick);
  hit.addEventListener("focusin", (e) => { const c = (e.target as Element).closest?.<HTMLElement>("[data-xpi]"); if (!c) return; XP.i = +c.dataset.xpi!; hit.querySelectorAll(".xp-card").forEach((b, i) => b.classList.toggle("on", i === XP.i)); });
  XP.keys = keysNow();
  if (!XP.panel) setTimeout(() => { if (XP.open) (hit.querySelector<HTMLElement>(".xp-card.on") || hit.querySelector<HTMLElement>("button"))?.focus({ preventScroll: true }); }, trRM() ? 0 : 120);
}
export function xpClose(pick?: Win | null, instant?: boolean) {
  const was = XP.open, prev = XP.prev;
  if (XP.open) {
    XP.open = false; sync(); const hit = XP.hit, dim = XP.dim; XP.hit = XP.dim = null; XP.drag = null;
    const slots = XP.slots; XP.slots = []; document.body.classList.remove("xp-on"); if (pick && live(pick.key)) { try { osFocus(pick.key); } catch { /* closing */ } }
    const d = instant || trRM() ? 0 : Math.round(xpDur() * .85), e = xpEase();
    slots.forEach((s) => { const E = el(s.w); if (!E?.isConnected) return; E.style.transitionDuration = d + "ms"; E.style.transitionTimingFunction = e; E.style.transitionDelay = "0ms"; E.style.transform = ""; });
    const end = () => {
      slots.forEach((s) => { const E = el(s.w); if (!E) return; if (XP.open && XP.slots.some((x) => x.w.key === s.w.key)) return; winClass(s.w.key, "xp-mv", false); E.style.transitionDuration = E.style.transitionTimingFunction = E.style.transitionDelay = E.style.transformOrigin = ""; if (!XP.open) E.style.transform = ""; });
      if (pick && live(pick.key)) { const E = el(pick); const f = E?.querySelector<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'); (f || E)?.focus?.({ preventScroll: true }); }
    };
    hit?.remove(); if (dim) { if (d) dim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d, easing: "ease-in" }).finished.then(() => dim.remove(), () => dim.remove()); else dim.remove(); }
    if (d) setTimeout(end, d + 40); else end();
  }
  /* v89 (12): focus goes back where it was when the overview is cancelled */
  if (was && !pick && prev && prev.isConnected) setTimeout(() => { if (document.activeElement === document.body || !document.activeElement) try { prev.focus({ preventScroll: true }); } catch { /* gone */ } }, 0);
  XP.prev = null;
}
function xpRelayout() {
  if (!XP.open) return; const keep = XP.slots[XP.i]?.w; const list = xpList();
  XP.slots.forEach((s) => { if (!list.some((w) => w.key === s.w.key)) { const E = el(s.w); winClass(s.w.key, "xp-mv", false); if (E) E.style.transform = E.style.transitionDuration = E.style.transitionTimingFunction = E.style.transitionDelay = E.style.transformOrigin = ""; } });
  list.forEach((w) => { el(w).style.transitionDuration = "0ms"; el(w).style.transform = ""; }); void document.body.offsetWidth; /* measure from untransformed rects */
  XP.slots = xpLayout(list); XP.i = Math.max(0, XP.slots.findIndex((s) => s.w.key === keep?.key));
  XP.slots.forEach((s) => { el(s.w).style.transform = tf(s); });
  xpRender(); XP.keys = keysNow();
}
const closeDesks = () => { try { useShell.getState().setDesksOpen(false); } catch { /* gone */ } };
function xpClick(e: MouseEvent) {
  if (XP.drag?.moved) return; const t = e.target as HTMLElement; const c = t.closest<HTMLElement>("[data-xpi]");
  if (c) { const s = XP.slots[+c.dataset.xpi!]; if (s) { XP.i = +c.dataset.xpi!; xpPick(); } return; }
  const m = t.closest<HTMLElement>("[data-xpmin]"); if (m) { const k = m.dataset.xpmin!; xpClose(null, true); try { osRestore(k); osFocus(k); } catch { /* gone */ } return; }
  if (t === XP.hit || t.classList.contains("xp-hint") || t.classList.contains("xp-none")) { if (XP.panel) closeDesks(); else xpClose(); }
}
function xpPick() { const s = XP.slots[XP.i]; if (!s) return; const w = s.w; if (XP.panel) { xpClose(w); closeDesks(); } else xpClose(w); }
function xpMoveSel(d: number) { if (!XP.slots.length) return; const n = XP.slots.length; XP.i = (XP.i + d + n) % n; XP.hit?.querySelectorAll(".xp-card").forEach((b, i) => b.classList.toggle("on", i === XP.i)); XP.hit?.querySelector<HTMLElement>(".xp-card.on")?.focus({ preventScroll: true }); }
function xpMoveVert(d: number) { if (!XP.slots.length) return; const c = XP.slots[XP.i]; let best = -1, bd = 1e9; XP.slots.forEach((s, i) => { if (i === XP.i) return; const dy = s.cy - c.cy; if (Math.sign(dy) !== d || Math.abs(dy) < 10) return; const dist = Math.abs(dy) * 2 + Math.abs(s.cx - c.cx); if (dist < bd) { bd = dist; best = i; } }); if (best >= 0) xpMoveSel(best - XP.i); }
/* drag a window onto a desktop thumbnail (panel mode) */
function xpDown(e: PointerEvent) {
  if (!XP.panel || e.button !== 0) return; const btn = e.currentTarget as HTMLElement; const i = +btn.dataset.xpi!; const s = XP.slots[i]; if (!s) return;
  XP.drag = { i, s, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId, btn }; btn.setPointerCapture(e.pointerId);
}
function xpMove(e: PointerEvent) {
  const g = XP.drag; if (!g || e.pointerId !== g.pid) return; const dx = e.clientX - g.x0, dy = e.clientY - g.y0; if (!g.moved && Math.hypot(dx, dy) < 6) return;
  const E = el(g.s.w); if (!g.moved) { g.moved = true; g.btn.classList.add("drag"); E.style.transitionDuration = "0ms"; E.style.zIndex = "6"; }
  E.style.transform = tf(g.s, dx, dy, .8); g.btn.style.transform = `translate(${dx}px,${dy}px)`;
  const tg = document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.closest?.(".desk[data-di]"))?.closest<HTMLElement>(".desk[data-di]");
  document.querySelectorAll(".desk.xp-drop").forEach((x) => x !== tg && x.classList.remove("xp-drop")); if (tg && +tg.dataset.di! !== useShell.getState().cur) tg.classList.add("xp-drop");
}
function xpUp(e: PointerEvent) {
  const g = XP.drag; if (!g || e.pointerId !== g.pid) return; const tg = document.querySelector<HTMLElement>(".desk.xp-drop"); document.querySelectorAll(".desk.xp-drop").forEach((x) => x.classList.remove("xp-drop"));
  if (!g.moved) { XP.drag = null; return; } setTimeout(() => { if (XP.drag === g) XP.drag = null; }, 0);
  const E = el(g.s.w); E.style.zIndex = ""; g.btn.classList.remove("drag"); g.btn.style.transform = ""; E.style.transitionDuration = (trRM() ? 0 : xpDur()) + "ms";
  if (tg && e.type === "pointerup") {
    const di = +tg.dataset.di!; const k = g.s.w.key; E.style.transitionDuration = "0ms"; E.classList.add("os-off"); E.style.transform = ""; winClass(k, "xp-mv", false); E.style.transitionTimingFunction = E.style.transitionDelay = E.style.transformOrigin = "";
    try { osMoveWin(k, di, false); } catch { /* gone */ } xpRelayout(); return;
  }
  E.style.transform = tf(g.s);
}

let installed = false;
export function installOverview() {
  if (installed || typeof window === "undefined") return; installed = true;
  XPs.close = (pick, instant) => xpClose(pick, instant);
  document.addEventListener("pointermove", xpMove); document.addEventListener("pointerup", xpUp); document.addEventListener("pointercancel", xpUp);
  /* keyboard (windows-only mode owns the keys; with the panel, the panel keeps its own keys) */
  document.addEventListener("keydown", (e) => {
    if (!XP.open) return; const t = e.target as Element;
    if (e.key === "Escape" && (document.querySelector("#desks input") || t.closest?.("input,textarea,select,[contenteditable=true]"))) return; /* v89: a rename field cancels itself */
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (XP.panel) closeDesks(); else xpClose(); return; }
    if (XP.panel) return; const rtl = document.documentElement.dir === "rtl";
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !(e.ctrlKey || e.metaKey || e.altKey)) { e.preventDefault(); e.stopPropagation(); xpMoveSel((e.key === "ArrowRight") !== rtl ? 1 : -1); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); e.stopPropagation(); xpMoveVert(e.key === "ArrowDown" ? 1 : -1); return; }
    if (e.key === "Enter" || e.key === " ") { const a = document.activeElement as HTMLElement | null; const c = a?.closest?.<HTMLElement>("[data-xpi]"); if (c) XP.i = +c.dataset.xpi!; e.preventDefault(); e.stopPropagation(); if (a?.dataset?.xpmin) { a.click(); return; } xpPick(); return; }
  }, true);
  /* anything that changes the scene closes or refreshes it */
  deskFx.beforeGoto.push(() => {
    const was = XP.open && XP.panel; if (XP.open) xpClose(null, true);
    if (was && trSt().overview === "both") { const S0 = trSt(), D = trTiming((TR.auto || trRM()) ? "classic" : S0.desk, S0).D; clearTimeout(XP.reT); XP.reT = setTimeout(() => { if (useShell.getState().desksOpen && !XP.open && trSt().overview === "both") xpOpen({ panel: true }); }, trRM() ? 40 : D + 60); }
  });
  wsBefore.push(() => { if (XP.open) xpClose(null, true); });
  useShell.subscribe((s, p) => {
    if (s.desksOpen === p.desksOpen) return;
    if (!s.desksOpen) { clearTimeout(XP.reT); if (XP.open && XP.panel) xpClose(); }
    else if (trSt().overview === "both" && !XP.open) xpOpen({ panel: true });
  });
  let q = 0; useWm.subscribe(() => { if (!XP.open || q) return; q = requestAnimationFrame(() => { q = 0; if (!XP.open) return; const k = keysNow(); if (k !== XP.keys) { if (OSW().length > XP.keys.split(",").filter(Boolean).length) xpClose(null, true); else xpRelayout(); } }); });
  addEventListener("resize", () => { if (XP.open) xpRelayout(); });
  document.addEventListener("pointerdown", (e) => { if (XP.open && !XP.panel && (e.target as Element).closest("header.top,#dock")) xpClose(null, true); }, true);
  /* entry points: shortcut row (+ search + shortcut list), action */
  ACTIONS.xpAll = () => { if (XP.open && !XP.panel) xpClose(); else { if (useShell.getState().desksOpen) closeDesks(); xpOpen(); } };
  { const c = SC_CATS.find((x) => x.id === "catVd"); if (c && !c.rows.some((r) => r[0] === "xpAll")) { const i = c.rows.findIndex((r) => r[0] === "dOverview"); c.rows.splice(i + 1, 0, ["xpAll", "Ctrl+Win+ArrowUp", "xpAll"]); } }
}
export const xpApi = { xpOpen, xpClose, state: XP };
