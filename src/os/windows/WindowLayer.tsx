"use client";
/**
 * Window layer: desktop windows (folder / Quick Look / trash) and OS windows share one stacking order (see stack.ts).
 * Also hosts the window manager's document listeners: dock / rail / nav openers (L11852), Win + arrows (L20959), resize (L20978).
 */
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DkWindows } from "@/os/desktop/DkWindows";
import { OsWindow } from "./OsWindow";
import { isTopWin, osFocus, osMax, osMin, osRelabelWins, osRestore, osSnap, osTopWin, osUnsnap, reSnapAll, useWm } from "./wm";
import { useStack, zOf } from "./stack";
import { OPEN_KEY, openApp } from "./apps";
import { PopBlockedDialog, useAppModeListeners } from "./appmode";

export function WindowLayer() {
  const { lang } = useI18n();
  const wins = useWm((s) => s.wins), order = useWm((s) => s.order), focus = useWm((s) => s.focus);
  const ids = useStack((s) => s.ids);
  useAppModeListeners();
  // osRelabel on every language switch (not at boot).
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } osRelabelWins(); }, [lang]);
  useEffect(() => {
    // Dock, rail and top-bar nav open the real windows; the dock toggles a running app (L11852).
    const click = (e: MouseEvent) => {
      const b = (e.target as Element).closest?.("[data-t]") as HTMLElement | null; if (!b || !b.closest("#dock,#rail,.nav")) return;
      const k = b.dataset.t!, key = OPEN_KEY[k]; if (!key) return;
      e.stopImmediatePropagation(); e.preventDefault();
      const w = useWm.getState().wins[key];
      if (w && !w.closing && b.closest("#dock")) { if (w.min) osRestore(key); else if (isTopWin(key)) osMin(key); else osFocus(key); return; }
      openApp(key);
    };
    // Win + arrows snap the front window (L20959).
    const key = (e: KeyboardEvent) => {
      if (!e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; const k = e.key; if (!/^Arrow(Left|Right|Up|Down)$/.test(k)) return;
      const w = osTopWin(); if (!w || innerWidth <= 860) return; const rtl = document.documentElement.dir === "rtl"; e.preventDefault(); e.stopPropagation();
      if (k === "ArrowUp") { if (w.snap === "left" || w.snap === "bl") osSnap(w.key, "tl"); else if (w.snap === "right" || w.snap === "br") osSnap(w.key, "tr"); else if (!w.max) osMax(w.key); }
      else if (k === "ArrowDown") { if (w.max) osMax(w.key); else if (w.snap === "tl") osSnap(w.key, "bl"); else if (w.snap === "tr") osSnap(w.key, "br"); else if (w.snap) osUnsnap(w.key); else osMin(w.key); }
      else { const L = (k === "ArrowLeft") !== rtl; if (w.max) osMax(w.key); osSnap(w.key, L ? "left" : "right"); }
    };
    document.addEventListener("click", click, true); document.addEventListener("keydown", key, true); addEventListener("resize", reSnapAll);
    return () => { document.removeEventListener("click", click, true); document.removeEventListener("keydown", key, true); removeEventListener("resize", reSnapAll); };
  }, []);
  return (
    <div className="os-wlayer">
      <DkWindows />
      {order.map((k) => wins[k] ? <OsWindow key={k} w={wins[k]} z={zOf(ids, "os:" + k)} focus={focus === k} /> : null)}
      <PopBlockedDialog />
    </div>
  );
}
