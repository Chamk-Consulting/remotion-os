"use client";
import { stopAll } from "@/lib/events";
/**
 * Virtual desktops panel (B-07) — port of L7744–L7968 with the later patches: thumbnails show icons (dkThumb L11615),
 * design tray (L11938), dkSwitch (L11328). Window minis (L20970) arrive with the window manager (B-02).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useShell, type Desk } from "@/os/state/shell";
import { reducedMotion } from "@/lib/motion";
import { SvgString } from "@/os/shell/svg";
import icons from "@/os/shell/data/icons.json";
import { paint, sceneFor, scenes } from "@/os/shell/wallpaper";
import { osMenu } from "@/os/menu/OsMenu";
import { useDkWins } from "./windows";

const DKI = icons.DKI as Record<string, string>;
const PLUS22 = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
const CHEV_DOWN = (icons.OSI as Record<string, string>).chev.replace("m9 6 6 6-6 6", "m6 9 6 6 6-6");

/* ---------- desktop switching (gotoDesk / slideSpace / showDeskHud / dkSwitch) ---------- */
let deskAnims: Animation[] = [];
let hudSetter: ((h: { from: number } | null) => void) | null = null;
let hudTimer: ReturnType<typeof setTimeout> | undefined;
export function showDeskHud(from?: number) { clearTimeout(hudTimer); hudSetter?.({ from: from ?? useShell.getState().cur }); hudTimer = setTimeout(() => hudSetter?.(null), 1400); }

/** dkSwitch (L11328): clear selection, close desktop windows except trash, then swap icons/widgets after `delay`. */
function dkSwitch(delay: number) {
  const st = useShell.getState(); st.setSel([]);
  useDkWins.setState((w) => ({ wins: w.wins.filter((x) => x.kind === "trash") }));
  setTimeout(() => { const s2 = useShell.getState(); useShell.setState({ shownDesk: s2.cur, iconAnim: 1, widgetsHidden: !s2.desks[s2.cur]?.w }); }, delay);
}
/** slideSpace (L7811): wallpaper + content slide like macOS Spaces; fade under reduced motion. Call after `cur` changed. */
function slideSpace(dir: number) {
  const apply = () => useShell.setState({ wallDesk: useShell.getState().cur });
  try { dkSwitch(reducedMotion() ? 0 : 360); } catch {}
  deskAnims.forEach((a) => { try { a.finish(); } catch {} }); deskAnims = []; document.getElementById("wallOld")?.remove();
  const wall = document.getElementById("wall") as HTMLCanvasElement;
  if (reducedMotion()) { wall.classList.add("fade"); setTimeout(() => { flushSync(apply); wall.classList.remove("fade"); }, 220); return; }
  const d = dir * (document.documentElement.dir === "rtl" ? -1 : 1);
  const old = document.createElement("canvas"); old.id = "wallOld"; old.setAttribute("aria-hidden", "true"); old.width = wall.width; old.height = wall.height;
  try { old.getContext("2d")!.drawImage(wall, 0, 0); } catch {}
  wall.after(old); flushSync(apply); // repaints #wall synchronously (Wallpaper uses a layout effect)
  const D = 820, E = "cubic-bezier(.72,0,.24,1)", W = innerWidth, S = .94;
  document.body.classList.add("dk-switch");
  const a1 = old.animate([{ transform: "translateX(0px) scale(1)", filter: "brightness(1)" }, { transform: `translateX(${-d * W * .5}px) scale(${S})`, filter: "brightness(.82)", offset: .5 }, { transform: `translateX(${-d * W}px) scale(1)`, filter: "brightness(.9)" }], { duration: D, easing: E, fill: "forwards" });
  const a2 = wall.animate([{ transform: `translateX(${d * W}px) scale(1)`, filter: "brightness(.9)" }, { transform: `translateX(${d * W * .5}px) scale(${S})`, filter: "brightness(.82)", offset: .5 }, { transform: "translateX(0px) scale(1)", filter: "brightness(1)" }], { duration: D, easing: E });
  const main = document.querySelector(".main")!;
  const a3 = main.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-d * 7}vw)`, offset: .44 }, { transform: `translateX(${d * 7}vw)`, offset: .56 }, { transform: "translateX(0)" }], { duration: D, easing: E, composite: "add" });
  const a4 = main.animate([{ opacity: 1 }, { opacity: 0, offset: .42 }, { opacity: 0, offset: .58 }, { opacity: 1 }], { duration: D, easing: "ease-in-out" });
  const a5 = document.getElementById("dock")!.animate([{ transform: "translateY(0)" }, { transform: "translateY(6px)", offset: .5 }, { transform: "translateY(0)" }], { duration: D, easing: E, composite: "add" });
  deskAnims = [a1, a2, a3, a4, a5];
  const end = () => { old.remove(); document.body.classList.remove("dk-switch"); }; a1.onfinish = end; a1.oncancel = end;
}
/** Source setDeskWall (L7903): thumbnail cross-fade + wallpaper cross-fade on the current desktop. */
export function setDeskWall(i: number, k: number) {
  const s = useShell.getState();
  if (!s.desks[i] || s.desks[i].s === k) return;
  const cv = document.getElementById("desks")?.querySelector<HTMLCanvasElement>(`[data-di="${i}"] canvas`);
  if (cv && !reducedMotion()) { const c2 = document.createElement("canvas"); c2.width = cv.width; c2.height = cv.height; c2.getContext("2d")!.drawImage(cv, 0, 0); c2.className = "thumb-old"; cv.after(c2); c2.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: "ease-out" }).finished.then(() => c2.remove()); cv.parentElement!.animate([{ transform: "scale(.94)" }, { transform: "none" }], { duration: 480, easing: "cubic-bezier(.2,1.3,.3,1)" }); }
  const wall = document.getElementById("wall") as HTMLCanvasElement;
  if (i === s.cur && !reducedMotion()) {
    document.getElementById("wallOld")?.remove();
    const old = document.createElement("canvas"); old.id = "wallOld"; old.width = wall.width; old.height = wall.height; try { old.getContext("2d")!.drawImage(wall, 0, 0); } catch {}
    wall.after(old); flushSync(() => s.mutate((x) => { x.desks[i].s = k; }));
    old.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.04)" }], { duration: 700, easing: "cubic-bezier(.4,0,.2,1)" }).finished.then(() => old.remove());
  } else s.mutate((x) => { x.desks[i].s = k; });
}
export function gotoDesk(i: number, closeAfter?: boolean) {
  const st = useShell.getState(); const n = st.desks.length; i = (i + n) % n;
  if (i === st.cur) { if (closeAfter) st.setDesksOpen(false); return; }
  const from = st.cur;
  useShell.setState({ cur: i }); useShell.getState().saveDesks();
  slideSpace(i > from ? 1 : -1);
  showDeskHud(from);
  if (closeAfter) setTimeout(() => { if (useShell.getState().desksOpen) useShell.getState().setDesksOpen(false); }, 560);
}

export function DesktopsPanel() {
  const { t, nf } = useI18n();
  const s = useShell();
  const el = useRef<HTMLElement | null>(null);
  const [ren, setRen] = useState(-1);
  const [dctx, setDctx] = useState<number | null>(null);
  const [hud, setHud] = useState<{ from: number } | null>(null);
  const [glide, setGlide] = useState(false);
  const deskName = useCallback((i: number) => s.desks[i]?.n || t("desktopN", { n: nf(i + 1) }), [s.desks, t, nf]);
  useEffect(() => { hudSetter = setHud; return () => { hudSetter = null; }; }, []);
  // setDesks(false) closes the context menu and ends a rename (L7790).
  useEffect(() => useShell.subscribe((st, prev) => { if (prev.desksOpen && !st.desksOpen) { setDctx(null); setRen(-1); } }), []);

  // Thumbnails: painted canvases of each desktop's scene (paintThumbs L7772).
  useLayoutEffect(() => { el.current?.querySelectorAll<HTMLCanvasElement>(".desk[data-di] canvas").forEach((cv) => { const i = +cv.closest<HTMLElement>("[data-di]")!.dataset.di!; paint(cv, sceneFor(s.desks[i]?.s ?? i, s.isDark), cv.width, cv.height); }); }, [s.desks, s.isDark]);
  // Sliding ring around the active thumbnail (placeSel L7774).
  const placeSel = useCallback((anim: boolean) => {
    const root = el.current; const sel = root?.querySelector<HTMLElement>(".dsel"), th = root?.querySelector<HTMLElement>(".desk.on .thumb"); if (!sel || !th) return;
    const d = th.parentElement!, x = d.offsetLeft + th.offsetLeft - 4, y = d.offsetTop + th.offsetTop - 4;
    sel.classList.toggle("glide", anim); sel.style.transform = `translate(${x}px,${y}px)`; sel.style.width = th.offsetWidth + 8 + "px"; sel.style.height = th.offsetHeight + 8 + "px";
  }, []);
  useLayoutEffect(() => { requestAnimationFrame(() => placeSel(glide)); }, [s.cur, s.desks.length, s.desksOpen, placeSel, glide]);
  useEffect(() => { const on = () => { setDctx(null); if (useShell.getState().desksOpen) placeSel(false); }; addEventListener("resize", on); return () => removeEventListener("resize", on); }, [placeSel]);
  // setDesks side effects (L7790): body class, focus the active thumbnail.
  useEffect(() => {
    document.body.classList.toggle("desks-on", s.desksOpen);
    if (!s.desksOpen) return;
    const root = el.current!; root.style.transform = ""; root.style.transition = "";
    root.querySelector<HTMLElement>(".desk.on")?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
    const id = setTimeout(() => { if (useShell.getState().desksOpen) root.querySelector<HTMLElement>(".desk.on .thumb")?.focus({ preventScroll: true }); }, 350);
    return () => clearTimeout(id);
  }, [s.desksOpen]);

  const go = (i: number) => { setGlide(true); gotoDesk(i); };
  function addDesk(switchTo: boolean) {
    const st = useShell.getState(); if (st.desks.length >= 12) { st.showToast(t("dskMax")); return; }
    const used = st.desks.map((d) => d.s), last = st.desks[st.desks.length - 1]?.s ?? -1; let sc = (last + 1) % scenes.length;
    for (let k = 1; k <= scenes.length; k++) { const c = (last + k) % scenes.length; if (!used.includes(c)) { sc = c; break; } }
    st.mutate((x) => { x.desks.push({ n: "", s: sc }); });
    const idx = useShell.getState().desks.length - 1;
    requestAnimationFrame(() => { const e = el.current?.querySelector<HTMLElement>(`[data-di="${idx}"]`); if (e && useShell.getState().desksOpen && !reducedMotion()) { const w = e.offsetWidth + 14; e.animate([{ opacity: 0, transform: "translateY(16px) scale(.5)", marginInlineEnd: -w + "px" }, { opacity: 1, transform: "none", marginInlineEnd: "0px" }], { duration: 560, easing: "cubic-bezier(.2,1.15,.3,1)" }); e.querySelector("canvas")!.animate([{ filter: "blur(6px) saturate(0)" }, { filter: "none" }], { duration: 700, delay: 120, easing: "ease-out", fill: "backwards" }); setTimeout(() => e.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" }), 60); } });
    if (switchTo) gotoDesk(idx); else st.showToast(t("added", { x: useShell.getState().desks[idx].n || t("desktopN", { n: nf(idx + 1) }) }));
  }
  function closeDesk(i: number) {
    const st = useShell.getState(); if (st.desks.length < 2) { st.showToast(t("lastDesk")); return; }
    setDctx(null);
    const snap: Desk[] = st.desks.map((x) => ({ ...x })), snapCur = st.cur, name = deskName(i), e = el.current?.querySelector<HTMLElement>(`[data-di="${i}"]`);
    const done = () => {
      const s0 = useShell.getState(); const wasCur = i === s0.cur;
      let nc = s0.cur; const nd = s0.desks.filter((_, k) => k !== i); if (i < s0.cur) nc--; else if (wasCur) nc = Math.min(i, nd.length - 1);
      useShell.setState({ desks: nd, cur: nc }); useShell.getState().saveDesks();
      if (wasCur) { slideSpace(i < nd.length ? 1 : -1); showDeskHud(); } else useShell.setState({ wallDesk: nc, shownDesk: nc });
      s0.showToast(t("deskClosed", { x: name }), () => {
        const s1 = useShell.getState(); const back = snapCur !== s1.cur, dir = snapCur > s1.cur ? 1 : -1;
        useShell.setState({ desks: snap, cur: snapCur }); useShell.getState().saveDesks();
        if (back) { slideSpace(dir); showDeskHud(); } else useShell.setState({ wallDesk: snapCur, shownDesk: snapCur });
      });
    };
    if (e && useShell.getState().desksOpen && !reducedMotion()) { e.style.pointerEvents = "none"; e.animate([{ opacity: 1, transform: "none", marginInlineEnd: "0px" }, { opacity: 0, transform: "translateY(14px) scale(.55)", marginInlineEnd: -(e.offsetWidth + 14) + "px" }], { duration: 380, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }).finished.then(done); } else done();
  }
  function endRename(i: number, save: boolean, value: string) {
    setRen(-1); const v = value.trim(), def = t("desktopN", { n: nf(i + 1) });
    if (save && s.desks[i]) { const nv = v === def ? "" : v; if (nv !== s.desks[i].n) { s.mutate((x) => { x.desks[i].n = nv; }); s.showToast(t("dskRenamed", { x: nv || def })); } }
    requestAnimationFrame(() => { if (useShell.getState().desksOpen) el.current?.querySelector<HTMLElement>(`[data-di="${i}"] .thumb`)?.focus({ preventScroll: true }); });
    if (i === s.cur && hud) showDeskHud();
  }
  // Drag the panel down to close (L7951).
  const dragY = useRef<{ y0: number; dy: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => { if (e.button !== 0 || (e.target as Element).closest("button,input,.tray,.dname,.dnrow,.desk")) return; dragY.current = { y0: e.clientY, dy: 0, id: e.pointerId }; el.current!.setPointerCapture(e.pointerId); el.current!.style.transition = "none"; };
  const onPointerMove = (e: React.PointerEvent) => { const d = dragY.current; if (!d || e.pointerId !== d.id) return; d.dy = Math.max(-8, e.clientY - d.y0); el.current!.style.transform = `translateY(${d.dy < 0 ? d.dy / 3 : d.dy}px)`; el.current!.classList.toggle("dragging", d.dy > 4); };
  const onPointerUp = () => { const d = dragY.current; if (!d) return; dragY.current = null; const r = el.current!; r.classList.remove("dragging"); r.style.transition = ""; r.style.transform = ""; if (d.dy > 46) s.setDesksOpen(false); };
  // Two-finger horizontal swipe switches desktops (L7960).
  useEffect(() => {
    let acc = 0, lock = 0, idle: ReturnType<typeof setTimeout>;
    const h = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.3 || e.ctrlKey) return;
      const tg = e.target as Element; if (!tg.closest?.(".shell") || tg.closest(".desks,.pop,.menu,.dock,.rail,input,textarea,select,[class*=scroll]") || document.body.classList.contains("locked")) return;
      const st = useShell.getState(); if (st.desksOpen || Date.now() < lock) return;
      acc += e.deltaX; clearTimeout(idle); idle = setTimeout(() => (acc = 0), 260);
      if (Math.abs(acc) > 150) { const rtl = document.documentElement.dir === "rtl"; gotoDesk(st.cur + ((acc > 0) !== rtl ? 1 : -1)); acc = 0; lock = Date.now() + 850; }
    };
    addEventListener("wheel", h, { passive: true }); return () => removeEventListener("wheel", h);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const th = (e.target as Element).closest?.(".thumb[data-d]") as HTMLElement | null; if (!th) return; const i = +th.dataset.d!;
    const all = [...el.current!.querySelectorAll<HTMLElement>(".thumb[data-d],#addDesk")], k = all.indexOf(th), rtl = document.documentElement.dir === "rtl";
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const st = (e.key === "ArrowRight") !== rtl ? 1 : -1; all[Math.max(0, Math.min(all.length - 1, k + st))].focus(); return; }
    if (e.key === "Home" || e.key === "End") { e.preventDefault(); all[e.key === "Home" ? 0 : all.length - 1].focus(); return; }
    if (e.key === "F2") { e.preventDefault(); setRen(i); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); closeDesk(i); return; }
    if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) { e.preventDefault(); setDctx(i); }
  };
  const trayDsw = (b: HTMLElement) => {
    const r = b.getBoundingClientRect(); const st = useShell.getState();
    osMenu(r.left, r.top, [...st.desks.map((_, i) => ({ l: deskName(i), check: i === st.cur, run: () => gotoDesk(i) })), "-", { l: t("addDesktop"), ic: (icons.OIC as Record<string, string>).plus, run: () => addDesk(true) }], (m) => { const H = m.offsetHeight; m.style.top = Math.max(8, r.top - H - 8) + "px"; });
  };
  const n = s.desks.length;
  return (
    <>
      <footer className="desks" id="desks" aria-label="Desktops" ref={el} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}
        onContextMenu={(e) => { const d = (e.target as Element).closest<HTMLElement>("[data-di]"); if (!d) return; e.preventDefault(); setDctx(+d.dataset.di!); }}>
        <span className="grab" aria-hidden="true"></span><span className="sr" id="dkHint">{t("dskHint")}</span>
        <div className="dlist" role="list" aria-label={t("desktops")}>
          <span className="dsel" aria-hidden="true"></span>
          {s.desks.map((d, i) => (
            <div key={i} className={"desk" + (i === s.cur ? " on" : "")} style={{ ["--i" as string]: i }} data-di={i} role="listitem">
              <button type="button" className="thumb" data-d={i} aria-pressed={i === s.cur} aria-label={deskName(i)} aria-describedby="dkHint" onClick={() => go(i)}>
                <canvas width="252" height="116"></canvas>
                <span className={"mini" + (d.w ? "" : " free")} aria-hidden="true"><i className="m-top"></i><i className="m-rail"></i><i className="m-w1"></i><i className="m-w2"></i><i className="m-w3"></i><i className="m-dock"></i>
                  {(d.items || []).slice(0, 10).filter((it) => it.c != null).map((it) => <i key={it.id} className="m-ic" style={{ insetInlineStart: 14 + it.c! * 7 + "%", top: 18 + it.r! * 13 + "%" }}></i>)}</span>
              </button>
              <span className="dnrow">
                {ren === i ? <RenameInput value={d.n || deskName(i)} onDone={(save, v) => endRename(i, save, v)} />
                  : <span className="dname" data-rename={i} title={t("dskRename")} onClick={() => setRen(i)} onDoubleClick={(e) => { e.preventDefault(); setRen(i); }}>{deskName(i)}</span>}
                <button type="button" className="dpen" data-dpen={i} tabIndex={-1} aria-label={`${t("dskRename")}: ${deskName(i)}`} hidden={ren === i} onClick={() => setRen(i)}><SvgString html={DKI.pen} /></button>
              </span>
              {n > 1 ? <button type="button" className="dx" data-dclose={i} tabIndex={-1} aria-label={t("dskClose", { x: deskName(i) })} onClick={() => closeDesk(i)}><SvgString html={DKI.x} /></button> : null}
            </div>
          ))}
          <button type="button" className="desk adddesk" style={{ ["--i" as string]: n }} id="addDesk" onClick={() => addDesk(false)}><span className="thumb"><SvgString html={PLUS22} /></span>{t("addDesktop")}</button>
        </div>
        <div className="tray" id="tray">
          <button type="button" className="os-dsw" data-tray="dsw" aria-haspopup="menu" aria-label={t("deskSwitch")} onClick={(e) => trayDsw(e.currentTarget)}><span>{deskName(s.cur)}</span><SvgString html={CHEV_DOWN} /></button>
          <button type="button" className="os-tb" data-tray="apps" aria-label={t("apps")} title={t("apps")}><SvgString html={(icons.OIC as Record<string, string>).grid} /></button>
          <button type="button" className="os-tb" data-tray="show" aria-label={t("showDesk")} title={t("showDesk")} onClick={() => { useDkWins.setState({ wins: [] }); }}><SvgString html={(icons.OIC as Record<string, string>).sq} /></button>
        </div>
      </footer>
      {dctx !== null ? <DeskContextMenu i={dctx} name={deskName(dctx)} of={t("dskOf", { n: nf(dctx + 1), m: nf(n) })} n={n} wall={s.desks[dctx]?.s ?? 0} dark={s.isDark}
        onClose={(focus) => { const i = dctx; setDctx(null); if (focus) el.current?.querySelector<HTMLElement>(`[data-di="${i}"] .thumb`)?.focus({ preventScroll: true }); }}
        onRename={() => { setDctx(null); setRen(dctx); }} onNew={() => { setDctx(null); addDesk(false); }} onCloseDesk={() => closeDesk(dctx)} onWall={(k) => setDeskWall(dctx, k)} /> : null}
      {typeof document !== "undefined" ? createPortal(
        <div className={"dhud" + (hud ? " show" : "")} id="dHud" role="status" aria-live="polite">
          {hud ? <><span className="dh-dots">{s.desks.map((_, i) => <HudDot key={i} on={i === s.cur} start={i === hud.from} />)}</span><b>{deskName(s.cur)}</b><small>{t("dskOf", { n: nf(s.cur + 1), m: nf(n) })}</small></> : null}
        </div>, document.body) : null}
    </>
  );
}
/** HUD dot: shows the origin desktop first, then moves to the new one after two frames (L7806). */
function HudDot({ on, start }: { on: boolean; start: boolean }) {
  const [cls, setCls] = useState(start ? "on" : "");
  useEffect(() => { let a = 0, b = 0; a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setCls(on ? "on" : "")); }); return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); }; }, [on]);
  return <i className={cls}></i>;
}
function RenameInput({ value, onDone }: { value: string; onDone: (save: boolean, v: string) => void }) {
  const { t } = useI18n(); const ref = useRef<HTMLInputElement | null>(null); const done = useRef(false);
  useEffect(() => { const i = ref.current!; i.focus(); i.select(); if (!reducedMotion()) i.animate([{ transform: "scale(.85)", opacity: .4 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.2,1.2,.3,1)" }); }, []);
  const fin = (save: boolean) => { if (done.current) return; done.current = true; onDone(save, ref.current!.value); };
  return <input ref={ref} className="dren" defaultValue={value} maxLength={32} aria-label={t("dskRename")} dir="auto"
    onKeyDown={(e) => { stopAll(e); if (e.key === "Enter") { e.preventDefault(); fin(true); } else if (e.key === "Escape") { e.preventDefault(); fin(false); } }} onBlur={() => fin(true)} />;
}
/** Desktop context menu `.dctx` (L7885–L7928). */
function DeskContextMenu({ i, name, of, n, wall, dark, onClose, onRename, onNew, onCloseDesk, onWall }: { i: number; name: string; of: string; n: number; wall: number; dark: boolean; onClose: (focus: boolean) => void; onRename: () => void; onNew: () => void; onCloseDesk: () => void; onWall: (k: number) => void }) {
  const { t, nf } = useI18n(); const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const m = ref.current!; m.querySelectorAll<HTMLCanvasElement>("[data-wp] canvas").forEach((cv) => paint(cv, sceneFor(+cv.parentElement!.dataset.wp!, dark), cv.width, cv.height));
    const th = document.querySelector(`#desks [data-di="${i}"] .thumb`); if (!th) return; const r = th.getBoundingClientRect(), W = m.offsetWidth, H = m.offsetHeight;
    let x = r.left + r.width / 2 - W / 2; x = Math.max(10, Math.min(x, innerWidth - W - 10));
    m.style.left = x + "px"; m.style.top = Math.max(10, r.top - H - 12) + "px"; m.style.setProperty("--ox", r.left + r.width / 2 - x + "px");
    if (!reducedMotion()) { m.animate([{ opacity: 0, transform: "translateY(10px) scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: "cubic-bezier(.2,1.2,.3,1)" }); [...m.children].forEach((c, k) => c.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: 40 + k * 35, easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" })); }
    setTimeout(() => m.querySelector<HTMLElement>("[data-dact]")?.focus({ preventScroll: true }), 30);
  }, [i, dark]);
  useEffect(() => {
    const pd = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(false); };
    const kd = (e: KeyboardEvent) => {
      const m = ref.current; if (!m) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); onClose(true); return; }
      const items = [...m.querySelectorAll<HTMLElement>("button:not(:disabled)")], k = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab") { e.preventDefault(); const nn = (k + ((e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) ? -1 : 1) + items.length) % items.length; items[nn].focus(); }
    };
    document.addEventListener("pointerdown", pd, true); document.addEventListener("keydown", kd, true);
    return () => { document.removeEventListener("pointerdown", pd, true); document.removeEventListener("keydown", kd, true); };
  }, [onClose]);
  return createPortal(
    <div ref={ref} className="dctx" role="menu" aria-label={t("dskOpts", { x: name })} data-i={i}>
      <div className="dc-h"><b>{name}</b><small>{of}</small></div>
      <button type="button" role="menuitem" data-dact="rename" onClick={onRename}><SvgString html={DKI.pen} /><span>{t("dskRename")}</span><kbd>F2</kbd></button>
      <div className="dc-wp"><span className="dc-l"><SvgString html={DKI.img} />{t("dskWall")}</span>
        <div className="dc-sw" role="radiogroup" aria-label={t("dskWall")}>{scenes.map((_, k) => <button key={k} type="button" role="radio" data-wp={k} aria-checked={wall === k} aria-label={t("dskWallN", { n: nf(k + 1) })} style={{ ["--k" as string]: k }} onClick={() => onWall(k)}><canvas width="88" height="52"></canvas></button>)}</div></div>
      <button type="button" role="menuitem" data-dact="new" onClick={onNew}><SvgString html={DKI.plus} /><span>{t("dNew")}</span></button>
      <div className="dc-sep"></div>
      <button type="button" role="menuitem" className="danger" data-dact="close" disabled={n < 2} onClick={onCloseDesk}><SvgString html={DKI.trash} /><span>{t("dskClose", { x: name })}</span><kbd>Del</kbd></button>
    </div>, document.body);
}
