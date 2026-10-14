"use client";
/**
 * Single-level desktop menu `.dk-menu` (dkMenuShow / closeDkMenu, L11562–L11581). Still used by folder-window items (L11501)
 * after the icon/desktop menus moved to the OS menu.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { reducedMotion } from "@/lib/motion";
import { SvgString } from "@/os/shell/svg";

const FC_CK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 12.5 4 4 8-9"/></svg>'; // aiSv(...,13,2.8)
const SPARK14 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 2.5c.6 4.3 2.8 6.5 7.1 7.1-4.3.6-6.5 2.8-7.1 7.1-.6-4.3-2.8-6.5-7.1-7.1 4.3-.6 6.5-2.8 7.1-7.1z"/><path d="M18.4 13.4c.3 2.1 1.3 3.1 3.4 3.4-2.1.3-3.1 1.3-3.4 3.4-.3-2.1-1.3-3.1-3.4-3.4 2.1-.3 3.1-1.3 3.4-3.4z" opacity=".75"/></svg>';

export type DkMenuItem = "-" | { l: string; run?: () => void; danger?: boolean; ai?: boolean; kbd?: string; disabled?: boolean; check?: boolean };
type S = { m: { x: number; y: number; items: DkMenuItem[]; n: number } | null };
const useDkMenu = create<S>(() => ({ m: null }));
let seq = 0;
export const dkMenuShow = (x: number, y: number, items: DkMenuItem[]) => useDkMenu.setState({ m: { x, y, items, n: ++seq } });
/** closeDkMenu: fade out (140 ms) then remove. */
export function closeDkMenu() {
  const el = document.querySelector<HTMLElement>("body > .dk-menu"); if (!useDkMenu.getState().m) return;
  if (!el || reducedMotion()) { useDkMenu.setState({ m: null }); return; }
  const n = useDkMenu.getState().m!.n;
  el.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(.96)" }], { duration: 140 }).finished.then(() => { if (useDkMenu.getState().m?.n === n) useDkMenu.setState({ m: null }); });
}

export function DkMenuRoot() {
  const m = useDkMenu((s) => s.m);
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el || !m) return;
    const W = el.offsetWidth, H = el.offsetHeight; let px = Math.min(m.x, innerWidth - W - 8), py = Math.min(m.y, innerHeight - H - 8); px = Math.max(8, px); py = Math.max(8, py);
    el.style.left = px + "px"; el.style.top = py + "px"; el.style.transformOrigin = `${m.x - px}px ${m.y - py}px`;
    if (!reducedMotion()) el.animate([{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,1.2,.3,1)" });
    const tm = setTimeout(() => el.querySelector<HTMLElement>("button:not(:disabled)")?.focus({ preventScroll: true }), 20);
    return () => clearTimeout(tm);
  }, [m]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const cur = useDkMenu.getState().m; if (!cur) return;
      const b = (e.target as Element).closest?.(".dk-menu [data-mi]") as HTMLElement | null;
      if (b) { const it = cur.items[+b.dataset.mi!]; closeDkMenu(); if (it && it !== "-") it.run?.(); return; }
      if (!(e.target as Element).closest?.(".dk-menu")) closeDkMenu();
    };
    const key = (e: KeyboardEvent) => {
      if (!useDkMenu.getState().m) return; const el = document.querySelector<HTMLElement>("body > .dk-menu"); if (!el) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeDkMenu(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const bs = [...el.querySelectorAll<HTMLElement>("button:not(:disabled)")], i = bs.indexOf(document.activeElement as HTMLElement); bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length]?.focus(); }
    };
    document.addEventListener("click", click, true); document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("click", click, true); document.removeEventListener("keydown", key, true); };
  }, []);
  if (!m || typeof document === "undefined") return null;
  return createPortal(
    <div key={m.n} ref={ref} className="dk-menu" role="menu">
      {m.items.map((it, i) => it === "-" ? <div key={i} className="sep"></div> : (
        <button key={i} type="button" role={it.check !== undefined ? "menuitemcheckbox" : "menuitem"} aria-checked={it.check !== undefined ? it.check : undefined}
          className={(it.danger ? "danger" : "") + (it.ai ? " dk-aim" : "")} data-mi={i} disabled={it.disabled}>
          {it.ai ? <SvgString html={SPARK14} /> : it.check !== undefined ? <span className="ck">{it.check ? <SvgString html={FC_CK} /> : null}</span> : null}
          <span>{it.l}</span>{it.kbd ? <kbd>{it.kbd}</kbd> : null}
        </button>))}
    </div>, document.body);
}
