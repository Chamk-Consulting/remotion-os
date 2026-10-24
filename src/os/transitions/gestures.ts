"use client";
/**
 * Gestures to change desktop — catch-up slice S6 (Remotion OS v82, v89; v94 L28865–L28929).
 * Trackpad two-finger swipe (the shell's own) gets a live "peek" pill and no longer fires over window content that itself
 * scrolls sideways; touch: one finger on phones, two on tablets (setting "Trackpad and touch"). Setting "Off" stops both.
 */
import { useShell } from "@/os/state/shell";
import { translate, formatNumber } from "@/lib/i18n/core";
import { isLang } from "@/lib/i18n/langs";
import { gotoDesk, wheelFx } from "@/os/desktop/DesktopsPanel";
import { dkDragApi, dkPhone } from "@/os/desktop/DesktopLayer";
import { trSt, trRM, trOnChange, TR_KEY } from "./transitions";
import { esc } from "./settings";
import { SW } from "./state";

const lang = () => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
const deskName = (i: number) => useShell.getState().desks[i]?.n || translate(lang(), "desktopN", { n: formatNumber(lang(), i + 1) });
const trGestOn = () => trSt().gestures !== "off";
const trRtl = () => document.documentElement.dir === "rtl";
/* where a gesture may start: the desktop, never a window, menu, dock, panel or field */
const TR_GX = "#dock,.dock,.rail,header.top,.desks,.pop,.menu,.kbm,.tsw,.os-win,.dk-win,.dk-menu,.hr-dlg,.dp-dlg,[role=dialog],input,textarea,select,[contenteditable=true],.toast,.nc,.pal";
function trScrollsX(el: Element | null, stop: Element | null) { for (let n = el; n && n !== stop && n !== document.body; n = n.parentElement) { if (n.scrollWidth > n.clientWidth + 2) { const o = getComputedStyle(n).overflowX; if (o === "auto" || o === "scroll") return true; } } return false; }
function trGestFree() { const st = useShell.getState(); return trGestOn() && !document.body.classList.contains("locked") && !st.desksOpen && !SW.open && st.desks.length > 1 && !document.querySelector(".rg.on,.power.on"); }

/* peek pill */
const TRP: { el: HTMLElement | null; dir: number } = { el: null, dir: 0 };
function trPeek(dir: number, p: number) {
  if (!dir || p <= 0) { trPeekHide(); return; } let el = TRP.el;
  if (!el) { el = TRP.el = document.createElement("div"); el.className = "tr-peek"; el.setAttribute("aria-hidden", "true"); document.body.appendChild(el); }
  if (TRP.dir !== dir) { TRP.dir = dir; const st = useShell.getState(); const n = st.desks.length; const to = (st.cur + dir + n) % n; const right = (dir > 0) !== trRtl(); el.classList.toggle("r", right); el.classList.toggle("l", !right); el.innerHTML = `<span class="tr-peek-ar">${right ? "›" : "‹"}</span><b dir="auto">${esc(deskName(to))}</b>`; }
  const q = Math.min(1, p); el.style.opacity = String(.25 + q * .75); el.style.setProperty("--p", String(trRM() ? 1 : q)); el.classList.toggle("go", p >= 1);
}
function trPeekHide() { const el = TRP.el; TRP.el = null; TRP.dir = 0; if (!el) return; if (trRM()) el.remove(); else { el.style.transition = "opacity .18s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 200); } }
/* v89: the "no browser back on sideways swipe" rule only while gestures are on */
function trGestSync() { document.documentElement.classList.toggle("tr-gest", trSt().gestures !== "off"); }

let installed = false;
export function installGestures() {
  if (installed || typeof window === "undefined") return; installed = true;
  /* trackpad: mirror the shell's accumulator for the pill; veto the shell when the setting is off or the content scrolls sideways */
  let acc = 0, lock = 0, idle: ReturnType<typeof setTimeout> | undefined;
  addEventListener("wheel", (e) => {
    wheelFx.veto = false; if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.3 || e.ctrlKey) return; const tg = e.target as Element;
    const win = tg.closest?.(".os-win");
    if (!trGestOn() || (win && trScrollsX(tg, win))) { wheelFx.veto = true; return; } /* the shell handler ignores this event */
    if (!tg.closest?.(".shell") || tg.closest(".desks,.pop,.menu,.dock,.rail,input,textarea,select,[class*=scroll]") || !trGestFree() || Date.now() < lock) { trPeekHide(); return; }
    acc += e.deltaX; clearTimeout(idle); idle = setTimeout(() => { acc = 0; trPeekHide(); }, 260);
    const dir = (acc > 0) !== trRtl() ? 1 : -1; if (Math.abs(acc) > 150) { acc = 0; lock = Date.now() + 850; trPeek(dir, 1); setTimeout(trPeekHide, 260); } else trPeek(dir, Math.abs(acc) / 150);
  }, { passive: true, capture: true });
  /* touch */
  type G = { n: number; x0: number; y0: number; t0: number; on: boolean; dx: number };
  let g: G | null = null;
  const start = (e: TouchEvent) => {
    if (g || !trGestFree() || trSt().gestures !== "all") return; const need = dkPhone() ? 1 : 2; if (e.touches.length !== need) return;
    const tg = e.target as Element; if (!tg.closest || !tg.closest(".shell") || tg.closest(TR_GX) || trScrollsX(tg, null)) return;
    const d = dkDragApi.get(); if (d && d.mode !== "band" && d.started) return;
    const xs = [...e.touches].map((t) => t.clientX), ys = [...e.touches].map((t) => t.clientY); if (need === 1 && (xs[0] < 24 || xs[0] > innerWidth - 24)) return; /* screen edges belong to the system */
    g = { n: need, x0: xs.reduce((a, b) => a + b) / need, y0: ys.reduce((a, b) => a + b) / need, t0: performance.now(), on: false, dx: 0 };
  };
  const end = (e: TouchEvent | null) => {
    const s = g; g = null; if (!s || !s.on) { trPeekHide(); return; }
    const th = Math.min(140, innerWidth * .28), v = Math.abs(s.dx) / Math.max(1, performance.now() - s.t0); const go = e && (Math.abs(s.dx) >= th || (v > .55 && Math.abs(s.dx) > 44));
    trPeekHide(); if (go && trGestFree()) gotoDesk(useShell.getState().cur + ((s.dx < 0) !== trRtl() ? 1 : -1));
  };
  const move = (e: TouchEvent) => {
    if (!g) return; if (e.touches.length !== g.n) { end(null); return; }
    const x = [...e.touches].reduce((a, t) => a + t.clientX, 0) / g.n, y = [...e.touches].reduce((a, t) => a + t.clientY, 0) / g.n; const dx = x - g.x0, dy = y - g.y0; g.dx = dx;
    if (!g.on) { if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) { g = null; return; } if (Math.abs(dx) < 14 || Math.abs(dx) < 1.5 * Math.abs(dy)) return; g.on = true; if (dkDragApi.get()?.mode === "band") dkDragApi.cancelBand(); }
    const th = Math.min(140, innerWidth * .28); trPeek((dx < 0) !== trRtl() ? 1 : -1, Math.abs(dx) / th);
  };
  document.addEventListener("touchstart", start, { passive: true }); document.addEventListener("touchmove", move, { passive: true });
  document.addEventListener("touchend", end, { passive: true }); document.addEventListener("touchcancel", () => end(null), { passive: true });
  trGestSync(); trOnChange.push(trGestSync); addEventListener("storage", (e) => { if (e.key === TR_KEY) setTimeout(trGestSync, 0); });
}
