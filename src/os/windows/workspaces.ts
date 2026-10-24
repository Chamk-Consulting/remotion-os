"use client";
/**
 * Workspaces own their desktops and windows (v55, L20874–L20888): switching saves this workspace's desktops, fades the
 * wallpaper / desktop / visible windows out, swaps in the other workspace's desktops (or two new ones), fades back in.
 */
import { flushSync } from "react-dom";
import { reducedMotion } from "@/lib/motion";
import { osDid, osNewDesks, osWsSave, useShell } from "@/os/state/shell";
import { dkSwitch, showWsHud } from "@/os/desktop/DesktopsPanel";
import { OSW, osDeskApply, osxTok, takePend, winEls, wsApi } from "./wm";

/** renderWs with its v55 wrapper: a changed selection switches workspace, otherwise the store is saved. */
export function renderWs() {
  const st = useShell.getState();
  if (st.osxWs !== null && st.osxWs !== st.selWs) { const from = st.osxWs, did = takePend(); useShell.setState({ osxWs: st.selWs }); wsFx.sw(from, st.selWs, did); }
  else osWsSave();
}
wsApi.renderWs = renderWs;
export function selectWorkspace(i: number) { useShell.setState({ selWs: i }); renderWs(); }
export function addWorkspace() { const w = useShell.getState().addWs(); renderWs(); return w; }

/** Saves the leaving workspace's desktops (first step of a switch). */
export function wsKeep(from: number) { const st0 = useShell.getState(); st0.wsStore[from] = { l: st0.desks, c: st0.cur }; }
/** The swap step of a workspace switch (shared with the transitions engine): the other workspace's desktops come in. */
export function wsSwapTo(to: number, thenDid: string | null) {
  const st = useShell.getState(); const s2 = st.wsStore[to]; const nx = s2 && Array.isArray(s2.l) && s2.l.length ? s2 : { l: osNewDesks(to), c: 0 };
  const desks = nx.l; let cur = Math.min(Math.max(0, nx.c | 0), desks.length - 1);
  if (thenDid) { const k = desks.findIndex((x) => x._id === thenDid); if (k >= 0) cur = k; }
  flushSync(() => useShell.setState({ desks, cur, wallDesk: cur }));
  desks.forEach((_, i) => osDid(i)); useShell.getState().saveDesks(); osWsSave();
  dkSwitch(0); flushSync(() => osDeskApply()); showWsHud();
}
/** Hook point for the transitions engine (v74: osWsSwitch is routed through trWsSwitch); `wsSwitchClassic` is the original. */
export const wsFx: { sw: (from: number, to: number, thenDid: string | null) => void } = { sw: (a, b, c) => osWsSwitch(a, b, c) };
export { osWsSwitch as wsSwitchClassic };
function osWsSwitch(from: number, to: number, thenDid: string | null) {
  const tk = ++osxTok.n; const st0 = useShell.getState();
  st0.wsStore[from] = { l: st0.desks, c: st0.cur };
  const visible = () => [document.getElementById("wall"), document.querySelector(".main"), ...OSW().filter((w) => !w.off && !w.min).map((w) => winEls.get(w.key))].filter(Boolean) as HTMLElement[];
  const swap = () => wsSwapTo(to, thenDid);
  if (reducedMotion()) { swap(); return; }
  const els = visible();
  els.forEach((el) => el.animate([{ transform: "none", opacity: 1, filter: "none" }, { transform: "scale(.9)", opacity: 0, filter: "blur(6px)" }], { duration: 300, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }));
  setTimeout(() => {
    if (tk !== osxTok.n) return; els.forEach((el) => el.getAnimations().forEach((a) => { try { a.cancel(); } catch {} })); swap();
    const wall = document.getElementById("wall");
    visible().forEach((el, k) => el.animate([{ transform: "scale(1.08)", opacity: 0, filter: "blur(6px)" }, { transform: "none", opacity: 1, filter: "none" }], { duration: 540, delay: el === wall ? 0 : 60 + k * 30, easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" }));
  }, 300);
}
