"use client";
/**
 * Window manager (B-02) — port of osWinOpen / osFocus / osClose / osMin / osRestore / osMax (L11806–L11851) and the v55 layer
 * (L20843–L20978): desktop/workspace ownership, slide with the desktop, move to desktop/workspace, snapping, Win+arrows.
 *
 * Structural state (which windows exist, min/max/snap, owner desktop) lives in this store. Geometry is written to the element
 * imperatively, exactly as the source does, so drags never re-render React.
 */
import type { ReactNode } from "react";
import { create } from "zustand";
import { reducedMotion } from "@/lib/motion";
import { osDid, osNewDesks, osWsSave, useShell } from "@/os/state/shell";
import { translate } from "@/lib/i18n/core";
import { isLang } from "@/lib/i18n/langs";
import { osSnapRect, initialRect, towards, type Rect, type Zone } from "./geometry";
import { isTop, useStack } from "./stack";

export type WinOpts = {
  /** Title, or a function of the translator so it follows the language like the source's osRelabel title updates. */
  title: string | ((t: Tr) => string); icon?: ReactNode; cls?: string; head?: ReactNode; bare?: boolean;
  w: number; h: number; x?: number; y?: number; minW?: number; minH?: number;
  body: ReactNode; from?: Element | null;
  onClose?: () => void; onResize?: () => void;
  /** Source osRelabel updates the section aria-label for these windows only (apps); files/terminal keep the old one. */
  relabelAria?: boolean;
};
export type Tr = (k: string, v?: Record<string, string | number>) => string;
type StyleRect = { l: string; t: string; w: string; h: string };
export type Win = {
  key: string; o: WinOpts; init: Rect; from: DOMRect | null;
  min: boolean; max: boolean; snap: Zone | null; snapPrev?: StyleRect; prev?: StyleRect;
  /** `data-snap` attribute — app mode clears `w.snap` but leaves the attribute (L20993), so it is tracked separately. */
  snapAttr: Zone | null;
  /** `.os-solo` (app mode). */
  solo: boolean;
  ws: number; did: string; all: boolean;
  /** `.os-off` (hidden on another desktop/workspace) — explicit because the slide animation toggles it late, like the source. */
  off: boolean; hidden: boolean; anim: boolean; moving: boolean; sizing: boolean;
  /** Button labels and section aria-label as the source leaves them (osRelabel shifts them by one, D-B22 reproduced). */
  lab: { wmenu: string; min: string; max: string; close: string; aria: string | "follow" };
  closing?: boolean;
};
/** OSA (L20982): the app shown in app mode, whether this tab is a standalone app window, and app full screen. */
export type Osa = { key: string | null; stand: boolean; fs: boolean };
type S = { wins: Record<string, Win>; order: string[]; focus: string | null; rev: number; osa: Osa };
export const useWm = create<S>(() => ({ wins: {}, order: [], focus: null, rev: 0, osa: { key: null, stand: false, fs: false } }));
/** Set by appmode.ts (v56 wrappers of osClose / osMin leave app mode first). */
export const appModeHooks: { exit: (silent?: boolean) => void } = { exit: () => {} };
/** Live window elements (the source's `w.el`). */
export const winEls = new Map<string, HTMLElement>();
const curLang = () => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
const tt = (k: string, v?: Record<string, string | number>) => translate(curLang(), k, v);

const live = (key: string) => { const w = useWm.getState().wins[key]; return w && !w.closing ? w : undefined; };
export const OSW = () => Object.values(useWm.getState().wins).filter((w) => !w.closing);
function patch(key: string, p: Partial<Win>) { useWm.setState((s) => (s.wins[key] ? { wins: { ...s.wins, [key]: { ...s.wins[key], ...p } }, rev: s.rev + 1 } : s)); }
const bump = () => useWm.setState((s) => ({ rev: s.rev + 1 }));

/** Dock button of a window (osDockBtn): every app has one (approved fix D-B05). */
export const osDockBtn = (key: string) => document.querySelector<HTMLElement>(`#dock [data-t="${DOCK_KEY[key] ?? key}"]`);
const DOCK_KEY: Record<string, string> = { apps: "launchpad" };

export const osVis = (w: Win) => { const st = useShell.getState(); return w.ws === st.selWs && (w.all || w.did === osDid(st.cur)); };

/* ---------------- open / focus / close ---------------- */
export function osWinOpen(key: string, o: WinOpts): Win {
  const ex = live(key);
  if (ex) { if (ex.min) osRestore(key); osFocus(key); return live(key)!; }
  const st = useShell.getState();
  const src = o.from ?? osDockBtn(key);
  const w: Win = {
    key, o, init: initialRect(o), from: src && src.getBoundingClientRect().width ? src.getBoundingClientRect() : null,
    min: false, max: false, snap: null, snapAttr: null, solo: false, ws: st.selWs, did: osDid(st.cur), all: false, off: false, hidden: false, anim: false, moving: false, sizing: false,
    lab: { wmenu: tt("os_winMenu"), min: tt("fmMin"), max: tt("fmMax"), close: tt("fmClose"), aria: typeof o.title === "function" ? o.title(tt) : o.title },
  };
  useWm.setState((s) => ({ wins: { ...s.wins, [key]: w }, order: [...s.order.filter((k) => k !== key), key], rev: s.rev + 1 }));
  baseFocus(key);
  return w;
}
function baseFocus(key: string) { if (!live(key)) return; useStack.getState().front("os:" + key); useWm.setState({ focus: key }); }
/** osFocus with the v55 wrapper: focusing a window that lives elsewhere first goes to its desktop / workspace. */
let nav = false;
export function osFocus(key: string) {
  const w = live(key);
  if (w && !osVis(w) && !nav) { nav = true; setTimeout(() => { nav = false; }, 60); osGoTo(w); }
  baseFocus(key);
}
export function osClose(key: string) {
  if (useWm.getState().osa.key === key) appModeHooks.exit(true);
  const w = live(key); if (!w) return;
  patch(key, { closing: true });
  w.o.onClose?.();
  const end = () => { winEls.delete(key); useStack.getState().drop("os:" + key); useWm.setState((s) => { const { [key]: _gone, ...rest } = s.wins; void _gone; return { wins: rest, order: s.order.filter((k) => k !== key), rev: s.rev + 1 }; }); };
  const el = winEls.get(key);
  if (reducedMotion() || !el) { end(); return; }
  el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.94) translateY(10px)" }], { duration: 220, easing: "cubic-bezier(.4,0,1,1)" }).finished.then(end);
}
export function osMin(key: string) {
  if (useWm.getState().osa.key === key) appModeHooks.exit(true);
  const w = live(key); if (!w || w.min) return;
  patch(key, { min: true }); const b = osDockBtn(key), el = winEls.get(key);
  if (reducedMotion() || !b || !el) { patch(key, { hidden: true }); return; }
  const r = el.getBoundingClientRect(), f = b.getBoundingClientRect();
  el.animate([{ transform: "none", opacity: 1 }, { transform: `${towards(r, f)} scale(.08)`, opacity: .2 }], { duration: 420, easing: "cubic-bezier(.55,0,.4,1)" }).finished.then(() => { if (live(key)?.min) patch(key, { hidden: true }); });
}
export function osRestore(key: string) {
  const w = live(key); if (!w || !w.min) return;
  patch(key, { min: false, hidden: false }); osFocus(key);
  const b = osDockBtn(key), el = winEls.get(key);
  if (!reducedMotion() && b && el) requestAnimationFrame(() => { const r = el.getBoundingClientRect(), f = b.getBoundingClientRect(); el.animate([{ transform: `${towards(r, f)} scale(.08)`, opacity: .2 }, { transform: "none", opacity: 1 }], { duration: 460, easing: "cubic-bezier(.2,1.05,.3,1)" }); });
}
const styleRect = (el: HTMLElement): StyleRect => ({ l: el.style.left, t: el.style.top, w: el.style.width, h: el.style.height });
const applyRect = (el: HTMLElement, r: StyleRect) => Object.assign(el.style, { left: r.l, top: r.t, width: r.w, height: r.h });
const animFor = (key: string, ms: number, after?: () => void) => { patch(key, { anim: true }); setTimeout(() => { patch(key, { anim: false }); after?.(); }, ms); };
export function osMax(key: string) {
  const w = live(key); const el = winEls.get(key); if (!w || !el) return;
  const lab = { ...w.lab };
  if (!w.max) {
    const prev = styleRect(el); const dock = document.getElementById("dock")!.getBoundingClientRect();
    Object.assign(el.style, { left: "8px", top: "64px", width: innerWidth - 16 + "px", height: Math.max(300, (dock.top > 200 ? dock.top : innerHeight) - 74) + "px" });
    lab.max = tt("fmRestore"); patch(key, { max: true, prev, lab });
  } else { if (w.prev) applyRect(el, w.prev); lab.max = tt("fmMax"); patch(key, { max: false, lab }); }
  animFor(key, 460, () => live(key)?.o.onResize?.());
}

/* ---------------- snapping (L20914–L20915) ---------------- */
export function osSnap(key: string, z: Zone) {
  let w = live(key); const el = winEls.get(key); if (!w || !el) return;
  if (w.max) { osMax(key); w = live(key)!; }
  const snapPrev = w.snap ? w.snapPrev : styleRect(el); const r = osSnapRect(z);
  Object.assign(el.style, { left: r.l + "px", top: r.t + "px", width: r.w + "px", height: r.h + "px" });
  patch(key, { snap: z, snapAttr: z, snapPrev }); animFor(key, 460, () => { live(key)?.o.onResize?.(); bump(); });
}
export function osUnsnap(key: string) {
  const w = live(key); const el = winEls.get(key); if (!w || !w.snap || !el) return;
  const p = w.snapPrev; patch(key, { snap: null, snapAttr: null });
  if (p) { applyRect(el, p); animFor(key, 460, () => live(key)?.o.onResize?.()); }
}
/** Resize keeps snapped windows in their zone (L20978). */
export function reSnapAll() { if (innerWidth <= 860) return; for (const w of OSW()) if (w.snap) { const el = winEls.get(w.key); if (el) { const r = osSnapRect(w.snap); Object.assign(el.style, { left: r.l + "px", top: r.t + "px", width: r.w + "px", height: r.h + "px" }); } } }

/** osTopWin: the front-most visible, non-minimised window. */
export function osTopWin(): Win | null {
  const ids = useStack.getState().ids;
  for (let i = ids.length - 1; i >= 0; i--) { if (!ids[i].startsWith("os:")) continue; const w = live(ids[i].slice(3)); if (w && !w.off && !w.hidden) return w; }
  return null;
}
export const isTopWin = (key: string) => isTop("os:" + key);

/* ---------------- desktops and workspaces (L20857–L20906) ---------------- */
/** osDeskApply: re-home windows whose desktop is gone, then show only this desktop's windows. */
export function osDeskApply() {
  const st = useShell.getState(); const ids = st.desks.map((_, i) => osDid(i));
  useWm.setState((s) => {
    const wins = { ...s.wins };
    for (const k in wins) { const w = { ...wins[k] }; if (w.ws === st.selWs && !w.all && !ids.includes(w.did)) w.did = osDid(st.cur); w.off = !osVis(w); wins[k] = w; }
    return { wins, rev: s.rev + 1 };
  });
}
let tok = 0;
/** osSlideWins: windows travel with their desktop during the Spaces slide. Called after `cur` changed. */
export function osSlideWins(fromId: string, toId: string, dir: number) {
  const st = useShell.getState(); const ws = OSW().filter((w) => w.ws === st.selWs && !w.all && !w.min);
  const outs = ws.filter((w) => w.did === fromId), ins = ws.filter((w) => w.did === toId);
  if (reducedMotion()) { osDeskApply(); return; }
  const d = dir * (document.documentElement.dir === "rtl" ? -1 : 1), W = innerWidth, D = 820, E = "cubic-bezier(.72,0,.24,1)", tk = ++tok;
  outs.forEach((w) => { const el = winEls.get(w.key); if (!el) return; el.getAnimations().forEach((a) => a.cancel()); el.animate([{ transform: "none", opacity: 1 }, { transform: `translateX(${-d * W * .5}px) scale(.94)`, opacity: .9, offset: .5 }, { transform: `translateX(${-d * W}px) scale(1)`, opacity: .8 }], { duration: D, easing: E }).finished.then(() => { const x = live(w.key); if (x) patch(w.key, { off: !osVis(x) }); }).catch(() => {}); });
  ins.forEach((w) => { patch(w.key, { off: false }); const el = winEls.get(w.key); if (!el) return; el.getAnimations().forEach((a) => a.cancel()); el.animate([{ transform: `translateX(${d * W}px) scale(1)`, opacity: .8 }, { transform: `translateX(${d * W * .5}px) scale(.94)`, opacity: .9, offset: .5 }, { transform: "none", opacity: 1 }], { duration: D, easing: E }); });
  setTimeout(() => { if (tok === tk) osDeskApply(); }, D + 40);
}
/** Hooks the desktops panel calls (the v55 wrappers of gotoDesk / closeDesk / addDesk). */
export const deskHooks = {
  afterGoto(fromId: string, toId: string, dir: number) { osWsSave(); osSlideWins(fromId, toId, dir); },
  afterClose() { setTimeout(() => { osDeskApply(); osWsSave(); }, 450); },
  afterAdd() { useShell.getState().desks.forEach((_, k) => osDid(k)); osWsSave(); },
};
/** Set by the desktops panel: its gotoDesk / addDesk (kept there to avoid an import cycle). */
export const panelApi: { gotoDesk: (i: number) => void; addDesk: (switchTo: boolean) => void; closeDesk: (i?: number) => void } = { gotoDesk: () => {}, addDesk: () => {}, closeDesk: () => {} };
/** Set by the shell: workspace HUD and switch (osWsSwitch lives with the wallpaper/desktop plumbing). */
export const wsApi: { renderWs: () => void } = { renderWs: () => {} };

/** osGoTo: bring the user to the window's desktop / workspace. */
export function osGoTo(w: Win) {
  const st = useShell.getState();
  if (w.ws !== st.selWs) { pendDid = w.did; useShell.setState({ selWs: w.ws }); wsApi.renderWs(); return; }
  const k = st.desks.findIndex((x) => x._id === w.did); if (k >= 0 && k !== st.cur) panelApi.gotoDesk(k);
}
export let pendDid: string | null = null;
export const takePend = () => { const p = pendDid; pendDid = null; return p; };

export function osMoveWin(key: string, di: number, follow: boolean) {
  const w = live(key); if (!w) return; const st = useShell.getState();
  if (di >= st.desks.length) { if (st.desks.length >= 12) { st.showToast(tt("dskMax")); return; } panelApi.addDesk(false); di = useShell.getState().desks.length - 1; }
  const id = osDid(di); if (!id) return; const was = osVis(w);
  patch(key, { all: false, did: id, ws: useShell.getState().selWs });
  if (follow && di !== useShell.getState().cur) { panelApi.gotoDesk(di); return; }
  const el = winEls.get(key);
  if (was && !osVis(live(key)!) && !reducedMotion() && el) el.animate([{ transform: "none", opacity: 1 }, { transform: "scale(.6) translateY(40%)", opacity: 0 }], { duration: 320, easing: "cubic-bezier(.4,0,1,1)" }).finished.then(osDeskApply);
  else osDeskApply();
  const dn = useShell.getState().desks[di]?.n || tt("desktopN", { n: new Intl.NumberFormat(document.documentElement.lang || "en").format(di + 1) });
  useShell.getState().showToast(tt("os_movedTo", { x: dn }));
}
export function osMoveWinWs(key: string, wi: number, wsLabel: string) {
  const w = live(key); const st = useShell.getState(); if (!w || wi === st.selWs) return;
  let s2 = st.wsStore[wi]; if (!s2 || !Array.isArray(s2.l) || !s2.l.length) s2 = st.wsStore[wi] = { l: osNewDesks(wi), c: 0 };
  const tgt = s2.l[Math.min(s2.c | 0, s2.l.length - 1)]; if (!tgt._id) tgt._id = "d" + Math.random().toString(36).slice(2, 8);
  patch(key, { ws: wi, all: false, did: tgt._id }); osWsSave();
  const el = winEls.get(key);
  if (!reducedMotion() && el) el.animate([{ transform: "none", opacity: 1 }, { transform: "scale(.85)", opacity: 0, filter: "blur(4px)" }], { duration: 300 }).finished.then(osDeskApply); else osDeskApply();
  st.showToast(tt("os_movedTo", { x: wsLabel }));
}
export function osToggleAll(key: string) { const w = live(key); if (!w) return; patch(key, { all: !w.all, did: osDid(useShell.getState().cur) }); osDeskApply(); useShell.getState().showToast(tt(!w.all ? "os_allOn" : "os_allOff")); }

/** Tray "show desktop" (L11945): minimise everything (all desktops), or restore everything when all are minimised. */
export function osShowDesktop(): boolean { const all = OSW(); const any = all.some((w) => !w.min); all.forEach((w) => (any ? osMin(w.key) : osRestore(w.key))); return any; }

/** osRelabel's window part (L12304): labels are re-applied by index after the window menu button was inserted first. */
export function osRelabelWins() {
  useWm.setState((s) => {
    const wins = { ...s.wins };
    for (const k in wins) { const w = wins[k]; if (w.closing) continue; wins[k] = { ...w, lab: { ...w.lab, wmenu: tt("fmMin"), min: tt(w.max ? "fmRestore" : "fmMax"), max: tt("fmClose"), aria: w.o.relabelAria ? "follow" : w.lab.aria } }; }
    return { wins, rev: s.rev + 1 };
  });
}
export const setMoving = (key: string, moving: boolean, sizing = false) => patch(key, { moving, sizing });
export const clearSnap = (key: string) => patch(key, { snap: null, snapAttr: null });
export const patchWin = patch;
export const markMinis = bump;
