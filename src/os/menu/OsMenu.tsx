"use client";
/**
 * Multi-level OS menu (B-04) — port of osMenu / osMenuBuild / osPlace / osSubOpen and their listeners (L11681–L11731).
 * Same DOM (div.os-menu[role=menu][data-level] appended to <body>), same timings (hover 110 ms, close 180 ms), keyboard and RTL rules.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { reducedMotion } from "@/lib/motion";
import { SvgString } from "@/os/shell/svg";
import icons from "@/os/shell/data/icons.json";
import { paint, sceneFor } from "@/os/shell/wallpaper";
import { useShell } from "@/os/state/shell";

export type MenuItem = "-" | {
  l?: string; ic?: string; kbd?: string; check?: boolean; sub?: MenuItem[] | (() => MenuItem[]); disabled?: boolean; danger?: boolean; run?: () => void;
  /** Raw source HTML row (wallpaper swatches, app grid…). `onHtmlClick` receives the clicked element. */
  html?: string; onHtmlClick?: (el: Element) => boolean | void;
};
type Level = { items: MenuItem[]; x: number; y: number; altX?: number; openIdx?: number; focus?: boolean; adjust?: (el: HTMLElement) => void };
type S = { levels: Level[]; open: (x: number, y: number, items: MenuItem[], adjust?: (el: HTMLElement) => void) => void; closeAll: () => void; closeFrom: (lvl: number) => void; sub: (lvl: number, idx: number, x: number, y: number, altX: number, focus: boolean) => void };
export const useOsMenu = create<S>((set, get) => ({
  levels: [],
  open: (x, y, items, adjust) => set({ levels: [{ items, x, y, adjust, focus: true }] }),
  closeAll: () => set({ levels: [] }),
  closeFrom: (lvl) => set({ levels: get().levels.slice(0, lvl).map((l, i) => (i === lvl - 1 ? { ...l, openIdx: undefined } : l)) }),
  sub: (lvl, idx, x, y, altX, focus) => {
    const L = get().levels; const it = L[lvl]?.items[idx]; if (!it || it === "-" || !it.sub) return;
    const items = typeof it.sub === "function" ? it.sub() : it.sub;
    set({ levels: [...L.slice(0, lvl), { ...L[lvl], openIdx: idx }, { items, x, y, altX, focus }] });
  },
}));
/** Source osMenu(x, y, items). */
export const osMenu = (x: number, y: number, items: MenuItem[], adjust?: (el: HTMLElement) => void) => useOsMenu.getState().open(x, y, items, adjust);
export const osMenuCloseAll = () => useOsMenu.getState().closeAll();

function MenuLevel({ lvl, level }: { lvl: number; level: Level }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const placed = useRef(false);
  // osPlace (L11694): clamp to viewport, flip to altX, transform-origin at the pointer, pop-in animation.
  useLayoutEffect(() => {
    const m = ref.current!; if (placed.current) return; placed.current = true;
    const W = m.offsetWidth, H = m.offsetHeight, { x, y, altX } = level; let px = x, py = y;
    if (px + W > innerWidth - 8) px = altX !== undefined ? altX - W : innerWidth - W - 8;
    if (px < 8) px = altX !== undefined && altX + W < innerWidth ? altX : 8;
    if (py + H > innerHeight - 8) py = Math.max(8, innerHeight - H - 8);
    m.style.left = px + "px"; m.style.top = py + "px"; m.style.transformOrigin = `${x >= px ? x - px : 0}px ${y - py}px`;
    if (!reducedMotion()) m.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: "cubic-bezier(.2,1.2,.3,1)" });
    level.adjust?.(m);
    m.querySelectorAll<HTMLCanvasElement>("canvas[data-wpc]").forEach((cv) => paint(cv, sceneFor(+cv.dataset.wpc!, useShell.getState().isDark), cv.width, cv.height));
    if (level.focus) setTimeout(() => m.querySelector<HTMLElement>(lvl === 0 ? "button:not(:disabled)" : "button:not(:disabled),[data-wp],[data-app]")?.focus({ preventScroll: true }), 20);
  }, [level, lvl]);
  return (
    <div ref={ref} className="os-menu" role="menu" data-level={lvl} style={{ left: level.x, top: level.y }}>
      {level.items.map((it, i) => it === "-" ? <div key={i} className="sep" role="separator"></div>
        : it.html ? <div key={i} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: it.html }} />
        : <button key={i} type="button" role={it.check !== undefined ? "menuitemcheckbox" : "menuitem"} aria-checked={it.check !== undefined ? !!it.check : undefined}
          aria-haspopup={it.sub ? "menu" : undefined} aria-expanded={it.sub ? level.openIdx === i : undefined} data-oi={i}
          className={[it.danger ? "danger" : "", it.sub && level.openIdx === i ? "open" : ""].filter(Boolean).join(" ")} disabled={it.disabled}>
          <span className="ic">{it.check !== undefined ? (it.check ? <SvgString html={icons.OSI.check} /> : null) : it.ic ? <SvgString html={it.ic} /> : null}</span>
          <span className="lb">{it.l}</span>{it.kbd ? <kbd>{it.kbd}</kbd> : null}{it.sub ? <span className="ar"><SvgString html={icons.OSI.chev} /></span> : null}
        </button>)}
    </div>
  );
}

export function OsMenuRoot() {
  const levels = useOsMenu((s) => s.levels);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const st = () => useOsMenu.getState();
    const menuOf = (el: Element | null) => el?.closest?.(".os-menu") as HTMLElement | null;
    const openSub = (b: HTMLElement, focus: boolean) => {
      const m = menuOf(b)!, lvl = +m.dataset.level!, idx = +b.dataset.oi!, L = st().levels;
      if (L[lvl]?.openIdx === idx && L[lvl + 1]) { if (focus) document.querySelector<HTMLElement>(`.os-menu[data-level="${lvl + 1}"]`)?.querySelector<HTMLElement>("button:not(:disabled),[data-wp],[data-app]")?.focus(); return; }
      const r = b.getBoundingClientRect(), rtl = document.documentElement.dir === "rtl";
      // RTL: the source measures the submenu width first; an estimate is replaced by osPlace's altX flip.
      if (rtl) st().sub(lvl, idx, r.left - 240 + 4, r.top - 6, r.right - 4, focus); else st().sub(lvl, idx, r.right - 4, r.top - 6, r.left + 4, focus);
    };
    const over = (e: PointerEvent) => {
      const b = (e.target as Element).closest?.(".os-menu button[data-oi]") as HTMLElement | null; if (!b) return;
      const lvl = +menuOf(b)!.dataset.level!; clearTimeout(timer.current);
      if (b.hasAttribute("aria-haspopup")) timer.current = setTimeout(() => openSub(b, false), 110);
      else timer.current = setTimeout(() => { if (st().levels.length > lvl + 1) st().closeFrom(lvl + 1); }, 180);
    };
    const click = (e: MouseEvent) => {
      if (!st().levels.length) return;
      const tgt = e.target as Element;
      const b = tgt.closest?.(".os-menu button[data-oi]") as HTMLElement | null;
      if (b) { const lvl = +menuOf(b)!.dataset.level!; const it = st().levels[lvl].items[+b.dataset.oi!]; if (it === "-") return; if (it.sub) { openSub(b, true); return; } if (it.disabled) return; st().closeAll(); it.run?.(); return; }
      const m = menuOf(tgt);
      if (m) { const lvl = +m.dataset.level!; for (const it of st().levels[lvl]?.items ?? []) if (it !== "-" && it.html && it.onHtmlClick) { const r = it.onHtmlClick(tgt); if (r !== false && r !== undefined) return; } return; }
      st().closeAll();
    };
    const key = (e: KeyboardEvent) => {
      const L = st().levels; if (!L.length) return;
      const cm = (document.activeElement?.closest?.(".os-menu") as HTMLElement | null) || document.querySelector<HTMLElement>(`.os-menu[data-level="${L.length - 1}"]`); if (!cm) return;
      const lvl = +cm.dataset.level!, rtl = document.documentElement.dir === "rtl";
      const bs = [...cm.querySelectorAll<HTMLElement>("button:not(:disabled)")], i = bs.indexOf(document.activeElement as HTMLElement);
      const parentBtn = () => document.querySelector<HTMLElement>(`.os-menu[data-level="${lvl - 1}"] [aria-expanded="true"]`);
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); if (lvl > 0) { const pb = parentBtn(); st().closeFrom(lvl); pb?.focus(); } else st().closeAll(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); e.stopImmediatePropagation(); bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length]?.focus(); return; }
      if (e.key === (rtl ? "ArrowLeft" : "ArrowRight") && (document.activeElement as HTMLElement)?.hasAttribute?.("aria-haspopup")) { e.preventDefault(); e.stopImmediatePropagation(); openSub(document.activeElement as HTMLElement, true); return; }
      if (e.key === (rtl ? "ArrowRight" : "ArrowLeft") && lvl > 0) { e.preventDefault(); e.stopImmediatePropagation(); const pb = parentBtn(); st().closeFrom(lvl); pb?.focus(); }
    };
    const resize = () => st().closeAll();
    document.addEventListener("pointerover", over); document.addEventListener("click", click, true); document.addEventListener("keydown", key, true); addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerover", over); document.removeEventListener("click", click, true); document.removeEventListener("keydown", key, true); removeEventListener("resize", resize); };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(<>{levels.map((l, i) => <MenuLevel key={i === 0 ? `0:${l.x},${l.y}:${l.items.length}` : `${i}:${levels[i - 1].openIdx}`} lvl={i} level={l} />)}</>, document.body);
}
