"use client";
/**
 * App switcher — catch-up slice S6 (Remotion OS v80, v81, v86, v89; v94 L28795–L28864, L29086–L29111, L29287–L29303).
 * Hold Alt and press the key under Esc (Alt+Tab belongs to the operating system in a browser) to move, release Alt to
 * switch. Cards in a 3D cover-flow, most recent first, with a live copy of each window and a close button; windows on
 * other desktops and minimised ones included. Reduced motion or a phone → a flat row. Dock button when 2+ windows.
 */
import { toast } from "@/os/ai/ai";
import { useShell } from "@/os/state/shell";
import { translate, formatNumber } from "@/lib/i18n/core";
import { isLang } from "@/lib/i18n/langs";
import { gotoDesk } from "@/os/desktop/DesktopsPanel";
import { OSW, winEls, osFocus, osRestore, osClose, useWm, type Win } from "@/os/windows/wm";
import { osDid } from "@/os/state/shell";
import { ACTIONS, setSysMenu } from "@/os/shortcuts/actions";
import { SC_CATS } from "@/os/shortcuts/catalogue";
import { addPaletteProvider } from "@/os/shortcuts/paletteExtra";
import { TR, trSt, trRM, trKeyLbl, wsAfter } from "./transitions";
import { swW, trW7, trW11, esc, L4 } from "./settings";
import { SW, XP } from "./state";

const lang = () => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
const cur = () => useShell.getState().cur;
const deskName = (i: number) => useShell.getState().desks[i]?.n || translate(lang(), "desktopN", { n: formatNumber(lang(), i + 1) });
const elOf = (w: Win) => winEls.get(w.key)!;
const iconOf = (w: Win) => elOf(w)?.querySelector(":scope>.os-wh>.gl")?.outerHTML || "";
const titleOf = (w: Win) => elOf(w)?.querySelector(":scope>.os-wh>b")?.textContent || w.key;
const live = (key: string) => { const w = useWm.getState().wins[key]; return w && !w.closing ? w : undefined; };

export function swItems(): Win[] {
  const els = [...document.querySelectorAll<HTMLElement>("#shell>.os-win,.shell>.os-win,body .os-win")].filter((x, i, a) => a.indexOf(x) === i);
  const keys = els.map((el) => el.dataset.osw!).filter((k) => live(k)); const ws = useShell.getState().selWs;
  return keys.reverse().map((k) => live(k)!).filter((w) => w.ws === undefined || w.ws === ws);
}
function swDeskIdx(w: Win) { if (w.all || !w.did) return cur(); const n = useShell.getState().desks.length; for (let i = 0; i < n; i++) if (osDid(i) === w.did) return i; return cur(); }
function swHTML() {
  return (`<div class="tsw-stage" role="listbox" aria-label="${esc(swW("title"))}" aria-activedescendant="sw-${SW.i}">${SW.list.map((w, i) => { const di = swDeskIdx(w); return `<button type="button" class="tsw-card" id="sw-${i}" role="option" aria-selected="${i === SW.i}" data-swi="${i}"><span class="tsw-ic">${iconOf(w)}</span><b dir="auto">${esc(titleOf(w))}</b><small>${w.min ? esc(swW("min")) + " · " : ""}${esc(di === cur() ? swW("here") : deskName(di))}</small></button>`; }).join("")}</div><p class="tsw-hint">${esc(swW("hint"))}</p>`)
    .split("Alt + `").join("Alt + " + esc(trKeyLbl())); /* v89 (14) */
}
function swLayout() {
  if (!SW.el) return; const flat = trRM() || innerWidth < 560; const rtl = document.documentElement.dir === "rtl" ? -1 : 1;
  SW.el.classList.toggle("flat", flat);
  SW.el.querySelectorAll<HTMLElement>(".tsw-card").forEach((c, i) => {
    const k = i - SW.i; const on = k === 0; c.setAttribute("aria-selected", String(on)); c.classList.toggle("on", on);
    if (flat) { c.style.transform = ""; c.style.zIndex = ""; c.style.opacity = ""; c.style.filter = ""; return; }
    const a = Math.abs(k), s = Math.sign(k);
    c.style.transform = `perspective(1300px) translateX(${rtl * (s * (a ? 215 + Math.min(a - 1, 3) * 125 : 0))}px) translateZ(${-a * 130}px) rotateY(${-rtl * s * (a ? 36 : 0)}deg) scale(${on ? 1.06 : 1})`;
    c.style.zIndex = String(100 - a); c.style.opacity = a > 4 ? "0" : "1"; c.style.filter = a ? `brightness(${(1 - Math.min(a, 4) * .1).toFixed(2)})` : "";
  });
  SW.el.querySelector(".tsw-stage")?.setAttribute("aria-activedescendant", "sw-" + SW.i);
  if (flat) SW.el.querySelector(".tsw-card.on")?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}
/* v86 · live preview of each window, close button */
function swPreview(w: Win, box: HTMLElement) {
  try {
    const src = elOf(w); const r = src.getBoundingClientRect(); if (!r.width || !r.height) return;
    const W = box.clientWidth || 180, H = box.clientHeight || 100, s = Math.min(W / r.width, H / r.height);
    const c = src.cloneNode(true) as HTMLElement; c.querySelectorAll("iframe,video,audio,object,embed,script,.os-eh").forEach((x) => x.remove());
    [c, ...c.querySelectorAll("*")].forEach((x) => { ["id", "for", "name", "aria-controls", "aria-labelledby", "aria-describedby", "aria-owns", "aria-activedescendant", "tabindex", "autofocus", "role", "aria-modal", "aria-label"].forEach((k) => x.removeAttribute?.(k)); });
    const sc = src.querySelectorAll("canvas"), dc = c.querySelectorAll("canvas"); dc.forEach((k, i) => { if (i > 11) return; try { k.width = sc[i].width; k.height = sc[i].height; k.getContext("2d")!.drawImage(sc[i], 0, 0); } catch { /* empty */ } });
    c.removeAttribute("data-osw"); c.querySelectorAll("[data-osw]").forEach((x) => x.removeAttribute("data-osw")); c.classList.remove("focus", "anim", "moving", "xp-mv", "os-off"); c.classList.add("tsw-clone"); c.hidden = false;
    c.style.setProperty("--cl", ((W - r.width * s) / 2) + "px"); c.style.setProperty("--ct", ((H - r.height * s) / 2) + "px"); c.style.setProperty("--cw", r.width + "px"); c.style.setProperty("--ch", r.height + "px");
    Object.assign(c.style, { position: "absolute", left: ((W - r.width * s) / 2) + "px", top: ((H - r.height * s) / 2) + "px", width: r.width + "px", height: r.height + "px", transform: `scale(${s})`, transformOrigin: "0 0", margin: "0", right: "auto", bottom: "auto", transition: "none", animation: "none", pointerEvents: "none" });
    c.setAttribute("inert", ""); c.setAttribute("aria-hidden", "true"); box.appendChild(c); box.classList.add("has");
  } catch { /* a window that cannot be copied keeps its icon */ }
}
function swDecorate() {
  if (!SW.el) return; const flat = SW.el.classList.contains("flat");
  SW.el.querySelectorAll<HTMLElement>(".tsw-card").forEach((c, i) => {
    const w = SW.list[i]; if (!w || c.querySelector(".tsw-x")) return;
    c.setAttribute("aria-keyshortcuts", "Delete");
    c.insertAdjacentHTML("beforeend", `<span class="tsw-x" data-swclose="${i}" aria-hidden="true" title="${esc(trW11("close"))}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></span>`);
    if (!flat && !trRM()) { const pv = document.createElement("span"); pv.className = "tsw-pv"; pv.setAttribute("aria-hidden", "true"); c.insertBefore(pv, c.firstChild); c.classList.add("pv"); }
  });
  const h = SW.el.querySelector<HTMLElement>(".tsw-hint"); if (h && !h.dataset.del) { h.dataset.del = "1"; h.textContent += trW11("hintDel"); }
  if (!flat && !trRM()) { const tk = SW.el; requestAnimationFrame(() => { if (SW.el !== tk) return; SW.el.querySelectorAll(".tsw-card.pv").forEach((c, i) => { const pv = c.querySelector<HTMLElement>(".tsw-pv"); if (pv && !pv.classList.contains("has") && SW.list[i]) swPreview(SW.list[i], pv); }); }); }
}
function swRemoveAt(i: number) {
  const w = SW.list[i]; if (!w || !SW.el) return; const b = elOf(w)?.querySelector<HTMLElement>('.os-wc [data-wc="close"]'); if (b) b.click(); else { try { osClose(w.key); } catch { /* gone */ } }
  SW.list = SW.list.filter((x) => live(x.key) && x.key !== w.key); if (!SW.list.length) { swClose(); return; }
  SW.i = Math.min(i, SW.list.length - 1); const tapHint = !SW.alt ? SW.el.querySelector(".tsw-hint")?.textContent : null;
  SW.el.innerHTML = swHTML(); swLayout(); if (tapHint != null) { const h = SW.el.querySelector(".tsw-hint"); if (h) h.textContent = tapHint.replace(trW11("hintDel"), ""); } swDecorate();
  SW.el.querySelector<HTMLElement>(".tsw-card.on")?.focus({ preventScroll: true });
}
const TAP_HINT = "Touchez une fenêtre pour l’ouvrir · Échap ou toucher le fond pour annuler|Tap a window to open it · Esc or tap outside to cancel|Tippen Sie auf ein Fenster · Esc oder außerhalb tippen zum Abbrechen|المس نافذة لفتحها · Esc أو المس الخلفية للإلغاء";
export function swOpen(dir: number) {
  if (!SW.open && XP.open) XP.close?.(null, true); /* v89 (4) never both open */
  if (!SW.open) { const a = document.activeElement as HTMLElement | null; SW.prev = a && a !== document.body ? a : null; SW.picking = false; }
  if (SW.open) { swMove(dir); return; }
  SW.list = swItems(); if (!SW.list.length) { toast(swW("none")); return; }
  try { useShell.getState().closeAll(); } catch { /* nothing open */ }
  SW.open = true; SW.i = SW.list.length > 1 ? (dir < 0 ? SW.list.length - 1 : 1) : 0;
  const el = SW.el = document.createElement("div"); el.className = "tsw"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", swW("title")); el.innerHTML = swHTML(); document.body.appendChild(el); swLayout();
  if (!trRM()) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" }); el.querySelector(".tsw-stage")!.animate([{ transform: "scale(.92)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 260, easing: trSt().appStyle === "calm" ? TR.MO.ease.calm : "cubic-bezier(.2,1.15,.3,1)" }); }
  el.addEventListener("click", (e) => { const b = (e.target as Element).closest<HTMLElement>("[data-swi]"); if (b) { SW.i = +b.dataset.swi!; swPick(); return; } if (e.target === el) swClose(); });
  el.querySelector<HTMLElement>(".tsw-card.on")?.focus({ preventScroll: true });
  /* v81: opened by tap / click (no Alt held): the hint speaks about tapping */
  if (!SW.alt) { const h = el.querySelector(".tsw-hint"); if (h) h.textContent = L4(TAP_HINT); }
  /* v86: preview + close */
  swDecorate();
  el.addEventListener("click", (e) => { const x = (e.target as Element).closest<HTMLElement>("[data-swclose]"); if (!x) return; e.stopPropagation(); e.preventDefault(); swRemoveAt(+x.dataset.swclose!); }, true);
}
function swMove(d: number) { if (!SW.open || !SW.el) return; const n = SW.list.length; SW.i = (SW.i + d + n) % n; swLayout(); SW.el.querySelector<HTMLElement>(".tsw-card.on")?.focus({ preventScroll: true }); }
export function swClose() {
  if (!SW.el) { SW.prev = null; return; }
  const was = SW.open, prev = SW.prev, el = SW.el; SW.el = null; SW.open = false; SW.alt = false;
  if (trRM()) el.remove(); else el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }).finished.then(() => el.remove(), () => el.remove());
  /* v89 (12): focus goes back where it was when the switcher is cancelled */
  if (was && !SW.picking && prev && prev.isConnected) { const a = document.activeElement; if (!a || a === document.body || el.contains(a)) try { prev.focus({ preventScroll: true }); } catch { /* gone */ } }
  SW.prev = null;
}
function swPick() {
  SW.picking = true; const w = SW.list[SW.i]; swClose(); if (!w || !live(w.key)) return; const di = swDeskIdx(w);
  const go = () => { try { if (live(w.key)?.min) osRestore(w.key); osFocus(w.key); const el = elOf(w); const f = el?.querySelector<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'); (f || el)?.focus?.({ preventScroll: true }); } catch { /* closed meanwhile */ } };
  if (di !== cur()) { gotoDesk(di); setTimeout(go, trRM() ? 30 : Math.max(400, (TR.anim?.D || 820) * .6)); } else go();
}
function swLast() { const L = swItems(); if (L.length < 2) { if (!L.length) toast(swW("none")); else { SW.list = L; SW.i = 0; swPick(); } return; } SW.list = L; SW.i = 1; swPick(); }

/* v81 · dock button */
const SWB_IC = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="9" height="12" rx="2"/><path d="M14.5 7.5h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-5"/><path d="M14.5 10.5h4M14.5 13.5h4"/></svg>`;
function swBtnSync() {
  const dock = document.getElementById("dock"); if (!dock) return; let b = document.getElementById("dockSw") as HTMLButtonElement | null;
  if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "dockSw"; b.className = "dock-sw"; b.innerHTML = `<span class="glyph">${SWB_IC}</span>`; b.addEventListener("click", (e) => { e.stopPropagation(); SW.alt = false; swOpen(1); }); dock.appendChild(b); }
  else if (b.parentNode !== dock || dock.lastElementChild !== b) dock.appendChild(b);
  const lbl = trW7("apps") + " (Alt+" + trKeyLbl() + ")"; b.setAttribute("aria-label", lbl); b.title = lbl;
  let n = 0; try { const ws = useShell.getState().selWs; n = OSW().filter((w) => w.ws === undefined || w.ws === ws).length; } catch { /* none */ } b.hidden = n < 2;
}

let installed = false;
export function installSwitcher() {
  if (installed || typeof window === "undefined") return; installed = true;
  document.addEventListener("keydown", (e) => {
    if (SW.open) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); swClose(); return; }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); swPick(); return; }
      const rtl = document.documentElement.dir === "rtl"; if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); swMove((e.key === "ArrowRight") !== rtl ? 1 : -1); return; }
      if (e.code === "Backquote" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); swMove(e.shiftKey ? -1 : 1); return; }
      return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === "Backquote" || e.key === "Tab") && !(e.key === "Dead" && (e.target as Element).closest?.("input,textarea,[contenteditable=true],[contenteditable='']"))) { /* v89: Option+` types accents on Mac */
      if (document.body.classList.contains("locked")) return; e.preventDefault(); e.stopPropagation(); SW.alt = true; swOpen(e.shiftKey ? -1 : 1);
    }
  }, true);
  document.addEventListener("keyup", (e) => { if (SW.open && SW.alt && e.key === "Alt") { e.preventDefault(); swPick(); } }, true);
  addEventListener("blur", () => { if (SW.open && SW.alt) swClose(); });
  /* v86: Delete closes the selected window */
  document.addEventListener("keydown", (e) => { if (!SW.open || e.key !== "Delete" || !(SW.el && (SW.el.contains(document.activeElement) || document.activeElement === document.body))) return; e.preventDefault(); e.stopPropagation(); swRemoveAt(SW.i); }, true);
  /* v89 (3): the switcher closes when focus goes elsewhere */
  document.addEventListener("focusin", (e) => { if (SW.open && SW.el && !SW.el.contains(e.target as Node)) swClose(); }, true);
  /* the launcher / OS search can open it too (v80: a row put first) */
  addPaletteProvider((q) => { const nq = String(q || "").trim().toLowerCase(); const lbl = swW("title"); if ((nq && lbl.toLowerCase().includes(nq)) || (nq && "alt tab".includes(nq))) return [{ g: "searchActions", label: lbl, iconHtml: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="6" width="8" height="12" rx="2"/><rect x="13" y="6" width="8" height="12" rx="2"/></svg>', combo: "Alt+Backquote", run: () => swOpen(1) }]; return []; }, { front: true });
  /* v81 · shortcut rows → real actions */
  ACTIONS.swLast = swLast; ACTIONS.swCycle = () => { SW.alt = false; swOpen(1); };
  { const c = SC_CATS.find((x) => x.id === "catApps"); c?.rows.forEach((r) => { if (r[0] === "lastApp") { r[1] = "Alt+Backquote"; r[2] = "swLast"; r.length = 3; } if (r[0] === "cycleApps") { r[1] = "Alt+Backquote"; r[2] = "swCycle"; r[3] = 1; } }); }
  /* v81 · dock button, kept in step with the open windows */
  let q = 0; const sched = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; swBtnSync(); }); };
  useWm.subscribe(sched); useShell.subscribe((s, p) => { if (s.selWs !== p.selWs) sched(); }); wsAfter.push(sched);
  const watchDock = () => { const d = document.getElementById("dock"); if (!d) { setTimeout(watchDock, 200); return; } new MutationObserver(sched).observe(d, { childList: true }); swBtnSync(); };
  watchDock();
  /* v81 · slow-device notice (once per page session) */
  let auto = !!TR.auto, told = false;
  Object.defineProperty(TR, "auto", { configurable: true, enumerable: true, get: () => auto, set: (v) => {
    const was = auto; auto = !!v;
    if (auto && !was && !told && !document.body.classList.contains("locked")) { told = true; setTimeout(() => {
      useShell.getState().showToast(trW7("slow"), () => { setTimeout(() => { try { setSysMenu(true, "transitions"); setTimeout(() => document.querySelector<HTMLElement>('#sysVp [data-view="transitions"] .tr-ch.on')?.focus({ preventScroll: true }), 350); } catch { /* menu gone */ } }, 0); }, { act: trW7("settings"), ms: 6000 });
    }, 400); }
  } });
}
export const swApi = { swOpen, swClose, swItems, swLast };
