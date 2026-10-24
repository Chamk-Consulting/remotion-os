"use client";
/**
 * One OS window — the DOM osWinOpen builds (L11817) after osWinDecorate (L20916): title bar with the layout button, min / max / close,
 * body, corner grip and eight edge handles. Pointer handling follows the source listeners in their registration order.
 */
import { useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { reducedMotion } from "@/lib/motion";
import { SvgString } from "@/os/shell/svg";
import icons from "@/os/shell/data/icons.json";
import { towards, zoneAt, type Zone } from "./geometry";
import { bgClickGuard } from "./stack";
import { clearSnap, markMinis, osClose, osFocus, osMax, osMin, osSnap, setMoving, useWm, winEls, wmFrame, type Win } from "./wm";
import { osWinMenu } from "./winMenu";
import { snapPreview } from "./snapPreview";
import { SoloBar } from "./appmode";

const OIC = icons.OIC as Record<string, string>;
const WMENU = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></svg>';
const EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;

export function OsWindow({ w, z, focus }: { w: Win; z: number; focus: boolean }) {
  const { t } = useI18n();
  const ref = useRef<HTMLElement | null>(null);
  const key = w.key, o = w.o;
  const title = typeof o.title === "function" ? o.title(t) : o.title;
  // Geometry is uncontrolled after mount: `w.init` never changes, so React never overwrites the imperative styles.
  const init = { left: w.init.l + "px", top: w.init.t + "px", width: w.init.w + "px", height: w.init.h + "px" };

  useLayoutEffect(() => {
    const el = ref.current!; winEls.set(key, el);
    if (!reducedMotion()) { const r = el.getBoundingClientRect(); const tf = w.from ? `${towards(r, w.from)} scale(.12)` : "translateY(16px) scale(.95)"; wmFrame.run(key, () => el.animate([{ opacity: 0, transform: tf }, { opacity: 1, transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,1.05,.3,1)" })); }
    markMinis();
    // Window identity is fixed for its lifetime; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* title bar: move (L11822) + snap drag (L20930) */
  const mv = useRef<{ x: number; y: number } | null>(null);
  const dr = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const zone = useRef<Zone | null>(null);
  const live = () => useWm.getState().wins[key];
  // App mode: the full-frame window can't be dragged or resized (L21011).
  const soloLock = (e: React.SyntheticEvent) => live().solo && !(e.target as Element).closest("button,input");
  const onHdDown = (e: React.PointerEvent) => {
    const el = ref.current!; const tg = e.target as Element;
    if (soloLock(e)) return;
    if (tg.closest("button,input") || e.button !== 0) return;
    const cur = live(); if (!cur.max) dr.current = { x: e.clientX, y: e.clientY, moved: false };
    osFocus(key); if (cur.max) return;
    mv.current = { x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop }; e.currentTarget.setPointerCapture(e.pointerId); setMoving(key, true);
  };
  const onHdMove = (e: React.PointerEvent) => {
    const el = ref.current!;
    if (mv.current) { el.style.left = Math.max(-el.offsetWidth + 120, Math.min(innerWidth - 120, e.clientX - mv.current.x)) + "px"; el.style.top = Math.max(58, Math.min(innerHeight - 44, e.clientY - mv.current.y)) + "px"; }
    const d = dr.current; if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
      d.moved = true; const cur = live();
      if (cur.snap && cur.snapPrev) { const pw = parseFloat(cur.snapPrev.w) || el.offsetWidth, ratio = (e.clientX - el.offsetLeft) / el.offsetWidth; el.style.width = pw + "px"; el.style.height = cur.snapPrev.h; el.style.left = e.clientX - pw * ratio + "px"; clearSnap(key); }
    }
    if (!d.moved || innerWidth <= 860) return;
    zone.current = zoneAt(e.clientX, e.clientY); snapPreview(zone.current);
  };
  const onHdUp = () => {
    mv.current = null; setMoving(key, false);
    if (!dr.current) return; const z = zone.current; dr.current = null; zone.current = null; snapPreview(null);
    if (z) { if (z === "max") { if (!live().max) osMax(key); } else osSnap(key, z); } else markMinis();
  };

  /* corner grip (L11826) */
  const rs = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const onRzDown = (e: React.PointerEvent) => { if (live().max || soloLock(e)) return; const el = ref.current!; rs.current = { x: e.clientX, y: e.clientY, w: el.offsetWidth, h: el.offsetHeight }; e.currentTarget.setPointerCapture(e.pointerId); setMoving(key, true); e.stopPropagation(); };
  const onRzMove = (e: React.PointerEvent) => { const r = rs.current; if (!r) return; const el = ref.current!; el.style.width = Math.max(o.minW || 380, Math.min(innerWidth - el.offsetLeft - 4, r.w + e.clientX - r.x)) + "px"; el.style.height = Math.max(o.minH || 260, Math.min(innerHeight - el.offsetTop - 4, r.h + e.clientY - r.y)) + "px"; };
  const onRzUp = () => { if (!rs.current) return; rs.current = null; setMoving(key, false); o.onResize?.(); };

  /* eight edge handles (L20918) */
  const es = useRef<{ e: string; x: number; y: number; l: number; t: number; w: number; h: number } | null>(null);
  const guard = useRef(bgClickGuard("os:" + key)).current;
  const onCapDown = (ev: React.PointerEvent) => {
    guard.down(); osFocus(key);
    const h = (ev.target as Element).closest?.(".os-eh") as HTMLElement | null; if (!h || ev.button !== 0 || live().max || innerWidth <= 860 || live().solo) return;
    ev.preventDefault(); ev.stopPropagation(); const el = ref.current!;
    es.current = { e: h.dataset.e!, x: ev.clientX, y: ev.clientY, l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; try { h.setPointerCapture(ev.pointerId); } catch {}
    setMoving(key, true, true); clearSnap(key);
  };
  const onSecMove = (ev: React.PointerEvent) => {
    const r = es.current; if (!r) return; const el = ref.current!;
    const mw = Math.min(o.minW || 380, innerWidth - 16), mh = Math.min(o.minH || 260, innerHeight - 80), dx = ev.clientX - r.x, dy = ev.clientY - r.y, e = r.e; let l = r.l, tp = r.t, W = r.w, H = r.h;
    if (e.includes("e")) W = Math.min(innerWidth - l - 4, Math.max(mw, r.w + dx));
    if (e.includes("w")) { W = Math.max(mw, Math.min(r.w - dx, r.l + r.w - 4)); l = r.l + r.w - W; }
    if (e.includes("s")) H = Math.min(innerHeight - tp - 4, Math.max(mh, r.h + dy));
    if (e.includes("n")) { H = Math.max(mh, Math.min(r.h - dy, r.t + r.h - 58)); tp = r.t + r.h - H; }
    Object.assign(el.style, { left: l + "px", top: tp + "px", width: W + "px", height: H + "px" });
  };
  const onSecUp = () => { if (!es.current) return; es.current = null; setMoving(key, false, false); o.onResize?.(); markMinis(); };

  const cls = ["os-win", o.cls || "", focus ? "focus" : "", w.max ? "max" : "", w.anim ? "anim" : "", w.moving ? "moving" : "", w.sizing ? "sizing" : "", w.off ? "os-off" : "", w.solo ? "os-solo" : "", w.xcls || ""].filter(Boolean).join(" ");
  return (
    <section ref={ref} className={cls} data-osw={key} role="dialog" aria-label={w.lab.aria === "follow" ? title : w.lab.aria} data-osd="1" data-snap={w.snapAttr ?? undefined} hidden={w.hidden}
      style={{ ...init, zIndex: z }} onPointerDownCapture={onCapDown} onClickCapture={(e) => guard.click(e)} onPointerUpCapture={() => guard.up()} onPointerMove={onSecMove} onPointerUp={onSecUp} onPointerCancel={onSecUp}>
      <header className={"os-wh" + (o.bare ? " bare" : "")} onPointerDown={onHdDown} onPointerMove={onHdMove} onPointerUp={onHdUp} onPointerCancel={onHdUp}
        onDoubleClick={(e) => { if (live().solo) return; if (!(e.target as Element).closest("button,input")) osMax(key); }}
        onContextMenu={(e) => { if ((e.target as Element).closest("input")) return; e.preventDefault(); osWinMenu(key, e.clientX, e.clientY, t); }}>
        {o.icon}<b dir="auto">{title}</b><span className="sp"></span>{o.head}
        <div className="os-wc">
          <button type="button" data-wmenu="1" aria-label={w.lab.wmenu} title={w.lab.wmenu} aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); osWinMenu(key, r.left, r.bottom + 4, t); }}><SvgString html={WMENU} /></button>
          <button type="button" data-wc="min" aria-label={w.lab.min} title={w.lab.min} onClick={() => osMin(key)}><SvgString html={OIC.min} /></button>
          <button type="button" data-wc="max" aria-label={w.lab.max} title={w.lab.max} onClick={() => osMax(key)}><SvgString html={w.max ? OIC.rest : OIC.max} /></button>
          <button type="button" data-wc="close" className="cl" aria-label={w.lab.close} title={w.lab.close} onClick={() => osClose(key)}><SvgString html={OIC.x} /></button>
        </div>
        {w.solo ? <SoloBar k={key} /> : null}
      </header>
      <div className="os-wb">{o.body}</div>
      <span className="os-rz" aria-hidden="true" onPointerDown={onRzDown} onPointerMove={onRzMove} onPointerUp={onRzUp}></span>
      {EDGES.map((e) => <div key={e} className={"os-eh e-" + e} data-e={e} aria-hidden="true"></div>)}
    </section>
  );
}
