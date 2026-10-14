"use client";
/**
 * B-03 · App mode, pop-out, full screen (v56, L20979–L21067). An app fills the tab (`body.os-appmode`, window `.os-solo`
 * with the solo bar), opens in its own browser window (`/apps/<key>`, the Next.js route that replaces `#app=`), or goes
 * full screen. Entry points: window menu, dock / rail context menu, desktop app icons, Ctrl+Shift+Enter, Ctrl+Alt+Enter.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { reducedMotion } from "@/lib/motion";
import { resolveApp } from "@/apps/registry";
import { translate } from "@/lib/i18n/core";
import { isLang } from "@/lib/i18n/langs";
import { useShell } from "@/os/state/shell";
import { osMenu, type MenuItem } from "@/os/menu/OsMenu";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SvgString } from "@/os/shell/svg";
import icons from "@/os/shell/data/icons.json";
import { appModeHooks, osClose, osFocus, osMax, osMin, osRestore, osTopWin, patchWin, useWm, winEls } from "./wm";
import { openApp } from "./apps";
import { osSnapRect } from "./geometry";

export const OSA_IC = icons.OSA_IC as Record<string, string>;
const tt = (k: string, v?: Record<string, string | number>) => { const h = document.documentElement.lang; return translate(isLang(h) ? h : "en", k, v); };
/** osSoloKey (L20981). */
export const osSoloKey = (k: string | undefined | null) => { const a = resolveApp(k); return a && a.solo ? a.key : null; };
const osSoloName = (k: string) => tt(resolveApp(k)?.nameKey ?? k);
const osa = () => useWm.getState().osa;
const setOsa = (p: Partial<{ key: string | null; stand: boolean; fs: boolean }>) => useWm.setState((s) => ({ osa: { ...s.osa, ...p } }));

/** osAppOpen: open the app, or bring its window back. */
function osAppOpen(k: string) { const w = useWm.getState().wins[k]; if (!w || w.closing) openApp(k); else { if (w.min) osRestore(k); osFocus(k); } const n = useWm.getState().wins[k]; return n && !n.closing ? n : null; }

export function osAppMode(k0: string, stand = false) {
  const k = osSoloKey(k0); if (!k) return;
  const w = osAppOpen(k); if (!w) { setTimeout(() => osAppMode(k, stand), 120); return; }
  if (osa().key && osa().key !== k) osAppModeExit(true);
  setOsa({ key: k, stand });
  if (w.max) osMax(k);
  if (w.snap) patchWin(k, { snap: null }); // the source keeps the data-snap attribute (snapAttr)
  const el = winEls.get(k); const first = el?.getBoundingClientRect();
  document.body.classList.add("os-appmode"); document.body.classList.toggle("os-standalone", !!stand);
  patchWin(k, { solo: true });
  if (stand) document.title = osSoloName(k) + " · Remotion";
  if (el && first && !reducedMotion() && !stand) requestAnimationFrame(() => { const r = el.getBoundingClientRect(); el.animate([{ transform: `translate(${first.left - r.left}px,${first.top - r.top}px) scale(${first.width / r.width},${first.height / r.height})`, transformOrigin: "0 0", borderRadius: "14px" }, { transform: "none", transformOrigin: "0 0", borderRadius: "0" }], { duration: 460, easing: "cubic-bezier(.2,1,.3,1)" }); });
  setTimeout(() => useWm.getState().wins[k]?.o.onResize?.(), 60);
}
export function osAppModeExit(silent?: boolean) {
  const k = osa().key; setOsa({ key: null }); const w = k ? useWm.getState().wins[k] : null;
  document.body.classList.remove("os-appmode", "os-standalone"); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  if (w && k) { patchWin(k, { solo: false }); const el = winEls.get(k); if (!silent && !reducedMotion() && el) el.animate([{ transform: "scale(1.03)", opacity: .6 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.2,1,.3,1)" }); setTimeout(() => w.o.onResize?.(), 60); }
  if (osa().stand) { setOsa({ stand: false }); document.title = "Remotion"; }
}
appModeHooks.exit = osAppModeExit;

/* ---------- pop-out (L21016) ---------- */
export const osAppUrl = (k: string) => `${location.origin}/apps/${encodeURIComponent(k)}`;
type Blocked = { k: string } | null;
const useBlocked = create<{ b: Blocked }>(() => ({ b: null }));
export function osPopout(k0: string) {
  const k = osSoloKey(k0); if (!k) return;
  const W = Math.min(1280, screen.availWidth || 1280), H = Math.min(860, screen.availHeight || 860); let win: Window | null = null;
  try { win = window.open(osAppUrl(k), "remotion-" + k, `popup=yes,width=${W},height=${H},left=${Math.max(0, ((screen.availWidth || W) - W) / 2)},top=${Math.max(0, ((screen.availHeight || H) - H) / 2)}`); } catch { win = null; }
  if (win) { try { win.opener = null; } catch {} useShell.getState().showToast(tt("os_popOk", { x: osSoloName(k) })); const w = useWm.getState().wins[k]; if (w && !w.closing && osa().key !== k) osMin(k); return; }
  useBlocked.setState({ b: { k } });
}
/** osPopBlocked (L21020): dialog with the link, copy, cancel and "app mode here". */
export function PopBlockedDialog() {
  const { t } = useI18n(); const b = useBlocked((s) => s.b);
  const close = () => useBlocked.setState({ b: null });
  useEffect(() => { if (b) setTimeout(() => document.querySelector<HTMLElement>(".os-popdlg [data-p=solo]")?.focus(), 0); }, [b]);
  if (!b) return null; const url = osAppUrl(b.k);
  return createPortal(
    <div className="os-popdlg" role="dialog" aria-modal="true" aria-label={t("os_popBlockedT")} onClick={(e) => { if (e.target === e.currentTarget) close(); }} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}>
      <div className="bx"><div className="hd"><SvgString html={OSA_IC.pop} /><b>{t("os_popBlockedT")}</b></div><p>{t("os_popBlocked", { x: t(resolveApp(b.k)?.nameKey ?? b.k) })}</p>
        <div className="ln"><input readOnly value={url} dir="ltr" aria-label="URL" /><button type="button" data-p="copy" onClick={async (e) => { const i = e.currentTarget.parentElement!.querySelector("input")!; i.select(); try { await navigator.clipboard.writeText(url); useShell.getState().showToast(t("os_copied")); } catch { try { document.execCommand("copy"); useShell.getState().showToast(t("os_copied")); } catch {} } }}>{t("os_copyLink")}</button></div>
        <div className="ft"><button type="button" data-p="close" onClick={close}>{t("fe_cancel")}</button><button type="button" className="pri" data-p="solo" onClick={() => { close(); osAppMode(b.k); }}><SvgString html={OSA_IC.solo} />{t("os_soloHere")}</button></div></div>
    </div>, document.body);
}

/* ---------- full screen (L21043) ---------- */
const osFsOk = () => !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
async function osFsEnter() { if (!osFsOk()) { useShell.getState().showToast(tt("os_fsNo")); return false; } try { await document.documentElement.requestFullscreen({ navigationUI: "hide" }); return true; } catch { useShell.getState().showToast(tt("os_fsNo")); return false; } }
const osFsExit = () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
export const osFsToggle = () => { if (document.fullscreenElement) osFsExit(); else osFsEnter(); };
export function osAppFull(k0: string) { const k = osSoloKey(k0); if (!k) return; if (osa().key !== k) osAppMode(k); setOsa({ fs: true }); osFsEnter(); }
export function osDeskFull() { if (osa().key) osAppModeExit(true); setOsa({ fs: false }); osFsToggle(); }

/* ---------- menus ---------- */
/** The v56 additions in front of osWinMenu's rows (two wrappers: app mode + pop-out, then full screen). */
export function soloWinRows(key: string): MenuItem[] {
  if (!osSoloKey(key)) return [];
  const fsOn = !!document.fullscreenElement && osa().key === key, on = osa().key === key;
  return [
    { l: tt(fsOn ? "os_fsExit" : "os_fsApp"), ic: fsOn ? OSA_IC.fsx : OSA_IC.fs, kbd: "Ctrl+Alt+Enter", run: () => (fsOn ? osFsExit() : osAppFull(key)) },
    { l: tt(on ? "os_soloExit" : "os_solo"), ic: on ? OSA_IC.exit : OSA_IC.solo, run: () => (on ? osAppModeExit() : osAppMode(key)) },
    { l: tt("os_popout"), ic: OSA_IC.pop, run: () => osPopout(key) }, "-",
  ];
}
/** osAppMenuItems (L21030) + its full-screen wrapper (L21058): dock / rail context menu. */
export function osAppMenuItems(k: string): MenuItem[] {
  const key = osSoloKey(k)!; const w = useWm.getState().wins[key]; const open = w && !w.closing;
  return [
    { l: tt(open ? "os_show" : "fmOpen"), ic: OSA_IC.desk, run: () => { const x = useWm.getState().wins[key]; if (x && !x.closing) { if (x.min) osRestore(key); osFocus(key); } else openApp(key); } },
    { l: tt("os_solo"), ic: OSA_IC.solo, run: () => osAppMode(key) },
    { l: tt("os_fsApp"), ic: OSA_IC.fs, run: () => osAppFull(key) },
    { l: tt("os_popout"), ic: OSA_IC.pop, run: () => osPopout(key) },
    ...(open ? ["-" as const, { l: tt("os_close"), ic: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>', danger: true, run: () => osClose(key) }] : []),
  ];
}
/** Desktop app icons get the same three ways to open, after "Open" (L21064). */
export function iconSoloRows(app: string | undefined): MenuItem[] {
  const key = osSoloKey(app); if (!key) return [];
  return [{ l: tt("os_solo"), ic: OSA_IC.solo, run: () => osAppMode(key) }, { l: tt("os_fsApp"), ic: OSA_IC.fs, run: () => osAppFull(key) }, { l: tt("os_popout"), ic: OSA_IC.pop, run: () => osPopout(key) }];
}

/** Solo bar in the title bar of the app-mode window (osSoloBar L21002). */
export function SoloBar({ k }: { k: string }) {
  const { t } = useI18n(); const stand = useWm((s) => s.osa.stand);
  const [fs, setFs] = useState(() => !!document.fullscreenElement);
  useEffect(() => { const on = () => setFs(!!document.fullscreenElement); document.addEventListener("fullscreenchange", on); return () => document.removeEventListener("fullscreenchange", on); }, []);
  return (
    <div className="os-solob" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <button type="button" data-solo="fs" title={t(fs ? "os_fsExit" : "os_fs")} aria-label={t(fs ? "os_fsExit" : "os_fs")} aria-pressed={fs} onClick={osFsToggle}><SvgString html={fs ? OSA_IC.fsx : OSA_IC.fs} /></button>
      <button type="button" data-solo="pop" title={t("os_popout")} aria-label={t("os_popout")} onClick={() => osPopout(k)}><SvgString html={OSA_IC.pop} /></button>
      <button type="button" className="ex" data-solo="exit" onClick={() => osAppModeExit()}><SvgString html={stand ? OSA_IC.desk : OSA_IC.exit} /><span>{t(stand ? "os_toDesk" : "os_soloExit")}</span></button>
    </div>
  );
}

/** Document listeners: dock / rail context menu, Ctrl+Shift+Enter, Ctrl+Alt+Enter, fullscreenchange. */
export function useAppModeListeners() {
  useEffect(() => {
    const ctx = (e: MouseEvent) => { const b = (e.target as Element).closest?.("#dock [data-t],#rail [data-t]") as HTMLElement | null; if (!b) return; const k = b.dataset.t!; if (!osSoloKey(k)) return; e.preventDefault(); e.stopImmediatePropagation(); const r = b.getBoundingClientRect(); osMenu(r.left, Math.max(70, r.top - 8), osAppMenuItems(k)); };
    const solo = (e: KeyboardEvent) => { if (e.key === "Enter" && e.ctrlKey && e.shiftKey && !e.altKey) { const k = osa().key; const w = k ? useWm.getState().wins[k] : osTopWin(); if (!w || !osSoloKey(w.key)) return; e.preventDefault(); if (osa().key) osAppModeExit(); else osAppMode(w.key); } };
    const full = (e: KeyboardEvent) => { if (e.key !== "Enter" || !e.ctrlKey || !e.altKey || e.shiftKey) return; e.preventDefault(); e.stopPropagation(); if (document.fullscreenElement) { osFsExit(); return; } const k = osa().key; const w = k ? useWm.getState().wins[k] : osTopWin(); if (w && osSoloKey(w.key)) osAppFull(w.key); else osDeskFull(); };
    const fsc = () => { const on = !!document.fullscreenElement; document.body.classList.toggle("os-fs", on); if (!on && osa().fs) setOsa({ fs: false });
      setTimeout(() => { Object.values(useWm.getState().wins).forEach((w) => { if (w.snap) { const el = winEls.get(w.key); const r = osSnapRect(w.snap); if (el) Object.assign(el.style, { left: r.l + "px", top: r.t + "px", width: r.w + "px", height: r.h + "px" }); } w.o.onResize?.(); }); }, 120); };
    document.addEventListener("contextmenu", ctx, true); document.addEventListener("keydown", solo, true); document.addEventListener("keydown", full, true); document.addEventListener("fullscreenchange", fsc);
    return () => { document.removeEventListener("contextmenu", ctx, true); document.removeEventListener("keydown", solo, true); document.removeEventListener("keydown", full, true); document.removeEventListener("fullscreenchange", fsc); };
  }, []);
}
