"use client";
/**
 * Ghost drags (source L11517–L11549, Files extension L12224–L12243): dragging a dock / rail app, a folder-window item,
 * a launcher card or Files rows onto the desktop, a desktop folder, the trash, or a Files place / folder.
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import raw from "@/apps/registry.data.json";
import { reducedMotion } from "@/lib/motion";
import { translate, formatNumber } from "@/lib/i18n/core";
import { isLang, type Lang } from "@/lib/i18n/langs";
import { useShell } from "@/os/state/shell";
import { desktopApi, type DeskTarget } from "./api";
import { Glyph } from "./Glyph";
import { dkFindAll } from "./DkWindows";
import { fsFind } from "./fs";
import { dkId, type Item } from "./model";

const DK_APPS = raw.DK_APPS as unknown as Record<string, unknown>;
export type GhostPayload = { kind: "app"; app: string; it: Item; label: string } | { kind: "kid"; id: string; it: Item; label: string } | { kind: "fs"; ids: string[]; it: Item; label: string };
type G = { p: GhostPayload | null; x: number; y: number; ok: boolean; src: Element | null; tg: DeskTarget; onLayer: boolean; fmT: HTMLElement | null };
export const useGhost = create<G>(() => ({ p: null, x: 0, y: 0, ok: false, src: null, tg: null, onLayer: false, fmT: null }));
const lang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
const t = (k: string, v?: Record<string, string | number>) => translate(lang(), k, v);
import { dkPhone as phone } from "./DesktopLayer";

/** Files hooks: the Files manager registers how to move / delete its rows (kept out of this module to avoid a cycle). */
export const ghostFs: { isContainer: (r: string) => boolean; del: (n: Item[]) => void; move: (n: Item[], dest: { root: string; desk?: number; path?: string[]; at?: [number, number] }) => void } = { isContainer: () => false, del: () => {}, move: () => {} };

export const ghost = {
  suppress: false,
  /** dkArmGhost (L11538): a pointerdown on `sel` that moves 8 px starts a ghost. Returns the disarm function. */
  arm(sel: string, get: (el: HTMLElement) => GhostPayload | null) {
    const down = (e: PointerEvent) => {
      const src = (e.target as Element).closest?.<HTMLElement>(sel); if (!src || e.button !== 0 || phone()) return; const P = get(src); if (!P) return;
      const x0 = e.clientX, y0 = e.clientY; let started = false;
      const mv = (ev: PointerEvent) => { if (!started) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return; started = true; start(ev, src, P); } move(ev); ev.preventDefault(); };
      const up = (ev: PointerEvent) => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); if (started) { ghost.suppress = true; setTimeout(() => (ghost.suppress = false), 60); end(ev); } };
      addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
    };
    document.addEventListener("pointerdown", down); return () => document.removeEventListener("pointerdown", down);
  },
};
function start(e: PointerEvent, src: Element, p: GhostPayload) { useGhost.setState({ p, src, x: e.clientX, y: e.clientY, ok: false, tg: null, onLayer: false, fmT: null }); document.body.classList.add("dk-ghosting"); move(e); }
/** dkGhostMove (L11523) + the Files extension (L12230). */
function move(e: PointerEvent) {
  const G = useGhost.getState(); if (!G.p) return;
  const over = document.elementFromPoint(e.clientX, e.clientY), onLayer = !!over?.closest?.(".dk-layer") && !phone();
  const tg = desktopApi.targetAt(e.clientX, e.clientY), okT = tg && (G.p.kind !== "app" || tg.kind === "folder" || tg.kind === "trash");
  desktopApi.mark(okT ? tg : null);
  let next: Partial<G> = { x: e.clientX, y: e.clientY, tg: okT ? tg : null, onLayer, ok: onLayer || !!okT, fmT: null };
  desktopApi.hint(onLayer && !okT ? desktopApi.cellAt(e.clientX, e.clientY) : null);
  if (G.p.kind === "fs") {
    document.querySelectorAll(".fm-drop").forEach((x) => x.classList.remove("fm-drop"));
    const el = over?.closest?.<HTMLElement>(".fm [data-folder], .fm [data-fmroot]") ?? null;
    const fmT = el && !G.p.ids.includes(el.dataset.id!) && (!el.dataset.fmroot || ghostFs.isContainer(el.dataset.fmroot) || el.dataset.fmroot === "trash") ? el : null;
    if (fmT) { fmT.classList.add("fm-drop"); desktopApi.mark(null); desktopApi.hint(null); next = { ...next, tg: null, onLayer: false, ok: true, fmT }; }
  }
  useGhost.setState(next);
}
/** dkGhostEnd (L11527) + the Files extension (L12236). */
function end(e: PointerEvent) {
  const G = useGhost.getState(); if (!G.p) return; const P = G.p;
  document.body.classList.remove("dk-ghosting"); desktopApi.hint(null); desktopApi.mark(null); document.querySelectorAll(".fm-drop").forEach((x) => x.classList.remove("fm-drop"));
  const st = useShell.getState(), toast = (m: string) => st.showToast(m);
  const clear = () => useGhost.setState({ p: null, src: null, tg: null, fmT: null, onLayer: false });
  if (P.kind === "fs") {
    clear(); const nodes = P.ids.map((id) => fsFind(id)?.node).filter(Boolean) as Item[]; if (!nodes.length) return;
    if (G.fmT) { const r = G.fmT.dataset.fmroot; if (r === "trash") { ghostFs.del(nodes); return; } if (r) { ghostFs.move(nodes, { root: r, desk: st.cur, path: [] }); return; } const f = fsFind(G.fmT.dataset.id!); if (f) ghostFs.move(nodes, { root: f.root, desk: f.desk, path: [...f.path.map((p) => p.id), f.node.id] }); return; }
    if (G.tg?.kind === "trash") { ghostFs.del(nodes); return; }
    if (G.tg?.kind === "folder") { ghostFs.move(nodes, { root: "desktop", desk: st.cur, path: [G.tg.it.id] }); return; }
    if (G.onLayer) ghostFs.move(nodes, { root: "desktop", desk: st.cur, path: [], at: desktopApi.cellAt(e.clientX, e.clientY) });
    return;
  }
  const drop = G.onLayer || G.tg;
  if (!drop) {
    // Fly back to where the drag started.
    const g = document.querySelector<HTMLElement>(".dk-ghost");
    if (g && G.src && !reducedMotion()) { const r = G.src.getBoundingClientRect(); g.animate([{ transform: g.style.transform, opacity: 1 }, { transform: `translate(${r.left}px,${r.top}px) scale(.6)`, opacity: 0 }], { duration: 300, easing: "ease-in", fill: "forwards" }).finished.then(clear); }
    else clear();
    return;
  }
  clear();
  if (P.kind === "app") {
    const it = { type: "app", app: P.app } as Item; // no id key yet: the source spreads it first ({type, app, id})
    if (G.tg?.kind === "folder") { const f = G.tg.it; st.mutate(() => { f.kids = f.kids || []; f.kids.push({ ...it, id: dkId() }); }); toast(t("dkMovedIn", { x: f.name! })); return; }
    if (G.tg?.kind === "trash") return;
    const [c, r] = desktopApi.cellAt(e.clientX, e.clientY); desktopApi.add(it, c, r); return;
  }
  const res = dkFindAll(st.desks[st.cur].items ?? [], P.id); if (!res || !res.parent) return; const parent = res.parent;
  if (G.tg?.kind === "trash") {
    st.mutate((s) => { parent.kids = (parent.kids || []).filter((x) => x !== res.it); s.trash.unshift({ ...res.it, from: s.cur, at: Date.now() }); }, { save: true, trash: true });
    const tb = document.querySelector<HTMLElement>('#dock [data-t="trash"]'); if (tb && !reducedMotion()) tb.animate([{ transform: "scale(1)" }, { transform: "scale(1.2) rotate(-6deg)" }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,1.4,.3,1)" });
    return;
  }
  if (G.tg?.kind === "folder") { const f = G.tg.it; if (f === parent) return; st.mutate(() => { parent.kids = (parent.kids || []).filter((x) => x !== res.it); f.kids = f.kids || []; f.kids.push(res.it); }); return; }
  // dkOutOfFolder (L11503)
  const at = desktopApi.cellAt(e.clientX, e.clientY);
  st.mutate(() => { parent.kids = (parent.kids || []).filter((x) => x !== res.it); }); desktopApi.add({ ...res.it }, at[0], at[1], true);
}

/** The ghost element (appended to body in the source) and the shell's own ghost sources: dock / rail apps, folder items. */
export function GhostLayer() {
  const G = useGhost();
  useEffect(() => {
    const offs = [
      ghost.arm("#dock [data-t]:not([data-t='trash']), #rail [data-t]", (el) => { const k = el.dataset.t!; if (!DK_APPS[k]) return null; return { kind: "app", app: k, it: { id: "", type: "app", app: k }, label: t(k) }; }),
      ghost.arm(".dk-win .dk-ic[data-kid]", (el) => { const st = useShell.getState(); const r = dkFindAll(st.desks[st.cur].items ?? [], el.dataset.kid!); if (!r) return null; return { kind: "kid", id: el.dataset.kid!, it: r.it, label: r.it.type === "app" ? t(r.it.app!) : r.it.name! }; }),
    ];
    // A click right after a ghost drag on the dock, rail or a folder window is swallowed (L11549).
    const swallow = (e: MouseEvent) => { if (ghost.suppress && (e.target as Element).closest?.("#dock,#rail,.dk-win")) { e.stopImmediatePropagation(); e.preventDefault(); ghost.suppress = false; } };
    document.addEventListener("click", swallow, true);
    return () => { offs.forEach((f) => f()); document.removeEventListener("click", swallow, true); };
  }, []);
  if (!G.p || typeof document === "undefined") return null;
  return createPortal(<div className={"dk-ghost" + (G.ok ? " ok" : "")} style={{ transform: `translate(${G.x - 30}px,${G.y - 30}px)` }}><div className="dk-ic ghost"><Glyph it={G.p.it} /><span className="nm">{G.p.label}</span></div></div>, document.body);
}
export const ghostCount = (n: number) => t("dkCount", { n: formatNumber(lang(), n) });
