"use client";
import { stopAll } from "@/lib/events";
/**
 * Free desktop icon layer (B-08) — port of L11274–L11460 + view options (L11760–L11765).
 * React renders the icons; pointer drags move them imperatively (as the source does) and commit to the store on drop.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useShell } from "@/os/state/shell";
import { reducedMotion } from "@/lib/motion";
import { SvgString } from "@/os/shell/svg";
import { Glyph, useDkName } from "./Glyph";
import { DK_PAD, DK_SIZES, dkBlocked, dkCellAt, dkExt, dkFix, dkFree, dkId, dkNearest, dkNeighbour, dkXY, type Geo, type Item, type Rect } from "./model";
import { openDkWin } from "./windows";
import { desktopApi } from "./api";
import { osActions } from "@/os/actions";
import { APP_WINDOWS, OPEN_KEY, openApp } from "@/os/windows/apps";
import { fsFind } from "./fs";
import { dkSetAlign, osDeskMenu, osIconMenu, osRefreshDesk, setAlignHook, type LayerApi } from "./menus";

const SPARK26 = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 2.5c.6 4.3 2.8 6.5 7.1 7.1-4.3.6-6.5 2.8-7.1 7.1-.6-4.3-2.8-6.5-7.1-7.1 4.3-.6 6.5-2.8 7.1-7.1z"/><path d="M18.4 13.4c.3 2.1 1.3 3.1 3.4 3.4-2.1.3-3.1 1.3-3.4 3.4-.3-2.1-1.3-3.1-3.4-3.4 2.1-.3 3.1-1.3 3.4-3.4z" opacity=".75"/></svg>';
const SC_ARROW = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M8 16 16 8M10 8h6v6"/></svg>';
export const dkPhone = () => innerWidth <= 860;
const rectOf = (r: DOMRect): Rect => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
const trashBtn = () => document.querySelector<HTMLElement>('#dock [data-t="trash"]');

type Drag =
  | { mode: "band"; x0: number; y0: number; L: DOMRect; base: Set<string>; pid: number }
  | { mode: "move"; x0: number; y0: number; id: string; started: boolean; pid: number; els?: { el: HTMLElement; it: Item; p: { x: number; y: number } }[]; tg?: Target | null };
type Target = { kind: "trash"; el: HTMLElement } | { kind: "folder"; el: HTMLElement; it: Item } | null;

/** v82 touch gestures: the desktop drag in progress (an icon move that started blocks a swipe; a band is cancelled by it). */
export const dkDragApi: { get: () => { mode: string; started?: boolean } | null; cancelBand: () => void } = { get: () => null, cancelBand: () => {} };
export function DesktopLayer() {
  const { t, nf, loc } = useI18n();
  const dkName = useDkName();
  const s = useShell();
  const desk = s.desks[s.shownDesk] ?? s.desks[s.cur];
  const items = desk?.items ?? [];
  const layer = useRef<HTMLDivElement | null>(null);
  const geo = useRef<Geo | null>(null);
  const drag = useRef<Drag | null>(null);
  const [band, setBand] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  useEffect(() => {
    dkDragApi.get = () => drag.current;
    dkDragApi.cancelBand = () => { const d = drag.current; if (d?.mode !== "band") return; setBand(null); useShell.getState().setSel([...d.base]); drag.current = null; };
  }, []);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [geoState, setGeo] = useState<Geo | null>(null);
  const [phone, setPhone] = useState(false);
  const [settle, setSettle] = useState(false);
  const free = !s.dkView.align; // window.__dkFree
  const [cw, ch] = DK_SIZES[s.dkView.size] || [94, 104];

  /** Source dkGeom (L11282). */
  const computeGeo = useCallback(() => {
    const L = layer.current; if (!L) return null;
    const rail = document.getElementById("rail"), main = document.querySelector(".main"), rtl = document.documentElement.dir === "rtl";
    if (dkPhone()) { L.style.removeProperty("inset-inline-start"); return (geo.current = null); }
    const mr = main!.getBoundingClientRect(), rr = rail!.getBoundingClientRect();
    L.style.setProperty("inset-inline-start", Math.max(0, Math.round(rtl ? mr.right - rr.left : rr.right - mr.left)) + "px");
    const Lr = L.getBoundingClientRect(), dock = document.getElementById("dock")!.getBoundingClientRect();
    const cols = Math.max(1, Math.floor((Lr.width - DK_PAD * 2) / cw)), rows = Math.max(1, Math.floor((Math.min(Lr.height, dock.top - Lr.top - 8) - DK_PAD) / ch));
    const blocks: Rect[] = [];
    const st = useShell.getState();
    if (st.desks[st.cur].w && !document.getElementById("shell")?.classList.contains("widgets-hidden")) { const w = document.querySelector(".widgets")!.getBoundingClientRect(); if (w.width > 2) blocks.push(rectOf(w)); }
    return (geo.current = { L: rectOf(Lr), cols, rows, rtl, blocks, cw, ch });
  }, [cw, ch]);

  /** Measure → fix cells → publish geometry (source renderIcons L11306 / resize L11328). */
  const relayout = useCallback(() => {
    // dkItems() (L11273) gives the current desktop an `items` array the first time it is rendered (saved with the next save).
    { const st = useShell.getState(), d = st.desks[st.cur]; if (d && !Array.isArray(d.items)) d.items = []; }
    setPhone(dkPhone());
    const g = computeGeo();
    if (g && dkFix(g, useShell.getState().desks[useShell.getState().cur].items ?? [])) useShell.getState().mutate(() => {});
    setGeo(g ? { ...g } : null);
  }, [computeGeo]);
  // Layout measurement must run after the DOM is laid out; setting state here is the intended measure-then-render pattern.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(() => { relayout(); }, [relayout, s.cur, s.rev, s.widgetsHidden, s.iconsHidden, s.dkView.size]);
  // Delayed re-layouts after transitions animate the icons to their new cells (dkPlace(true)).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(() => { if (s.layoutTick) { setSettle(true); relayout(); } }, [relayout, s.layoutTick]);
  useEffect(() => {
    let tm: ReturnType<typeof setTimeout>;
    const on = () => { clearTimeout(tm); tm = setTimeout(() => { setSettle(true); relayout(); }, 120); };
    addEventListener("resize", on); return () => { removeEventListener("resize", on); clearTimeout(tm); };
  }, [relayout]);

  const posOf = (it: Item, g: Geo | null) => { if (!g) return null; return free && it.fx != null ? { x: it.fx, y: it.fy! } : dkXY(g, it.c!, it.r!); };
  const elOf = (id: string) => layer.current?.querySelector<HTMLElement>(`.dk-ic[data-id="${CSS.escape(id)}"]`) ?? null;

  function targetAt(x: number, y: number, exclude?: Set<string>): Target {
    const tb = trashBtn(); if (tb) { const r = tb.getBoundingClientRect(); if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6) return { kind: "trash", el: tb }; }
    for (const el of layer.current!.querySelectorAll<HTMLElement>(".dk-ic")) { if (exclude?.has(el.dataset.id!)) continue; const it = items.find((i) => i.id === el.dataset.id); if (it?.type !== "folder") continue; const r = el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { kind: "folder", el, it }; }
    return null;
  }
  const mark = (tg: Target) => { document.querySelectorAll(".dk-drop").forEach((e) => e.classList.remove("dk-drop")); if (tg) tg.el.classList.add("dk-drop"); };

  /* ---------- actions (L11406–L11451) ---------- */
  function del(ids: string[]) {
    const gone = items.filter((x) => ids.includes(x.id)); if (!gone.length) return;
    const els = gone.map((it) => elOf(it.id)).filter(Boolean) as HTMLElement[], tr = trashBtn()?.getBoundingClientRect();
    const fin = () => {
      const cur = useShell.getState().cur;
      s.mutate((st) => { st.desks[cur].items = (st.desks[cur].items ?? []).filter((x) => !ids.includes(x.id)); gone.forEach((it) => st.trash.unshift({ ...it, from: cur, at: Date.now() })); st.trash = st.trash.slice(0, 60); }, { save: true, trash: true });
      s.setSel([]); popTrash(); setSettle(false);
      // Undo restores onto the CURRENT desktop, not the origin (defect D-B04 reproduced).
      s.showToast(gone.length === 1 ? t("dkDeleted1", { x: dkName(gone[0]) }) : t("dkDeletedN", { n: nf(gone.length) }), () => {
        s.mutate((st) => { gone.forEach((it) => { st.trash = st.trash.filter((x) => x.id !== it.id); (st.desks[st.cur].items ??= []).push(it); }); }, { save: true, trash: true });
      });
    };
    if (reducedMotion() || !tr || !els.length) { fin(); return; }
    els.forEach((el) => { const r = el.getBoundingClientRect(); el.style.transition = "none"; el.animate([{ transform: el.style.transform, opacity: 1 }, { transform: `${el.style.transform} translate(${tr.left + tr.width / 2 - r.left - r.width / 2}px,${tr.top + tr.height / 2 - r.top - r.height / 2}px) scale(.2)`, opacity: .2 }], { duration: 480, easing: "cubic-bezier(.55,0,.6,1)", fill: "forwards" }); });
    setTimeout(fin, 470);
  }
  function popTrash() { const tb = trashBtn(); if (tb && !reducedMotion()) tb.animate([{ transform: "scale(1)" }, { transform: "scale(1.2) rotate(-6deg)" }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,1.4,.3,1)" }); }
  function pop(el: HTMLElement | null) { if (el && !reducedMotion()) el.animate([{ transform: el.style.transform + " scale(1)" }, { transform: el.style.transform + " scale(1.18)" }, { transform: el.style.transform + " scale(1)" }], { duration: 420, easing: "cubic-bezier(.2,1.4,.3,1)" }); }
  function intoFolder(folder: Item, ids: string[]) {
    const moving = items.filter((x) => ids.includes(x.id) && x.id !== folder.id); if (!moving.length) { setSettle(true); relayout(); return; }
    const fr = elOf(folder.id)!.getBoundingClientRect();
    moving.forEach((it) => { const el = elOf(it.id); if (el && !reducedMotion()) { const r = el.getBoundingClientRect(); el.animate([{ transform: el.style.transform, opacity: 1 }, { transform: `${el.style.transform} translate(${fr.left - r.left}px,${fr.top - r.top}px) scale(.3)`, opacity: 0 }], { duration: 380, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }); } });
    setTimeout(() => {
      s.mutate((st) => { folder.kids = folder.kids || []; moving.forEach((it) => { const { c: _c, r: _r, ...rest } = it; void _c; void _r; folder.kids!.push(rest as Item); }); st.desks[st.cur].items = (st.desks[st.cur].items ?? []).filter((x) => !moving.includes(x)); });
      s.setSel([]); setSettle(false); requestAnimationFrame(() => pop(elOf(folder.id))); s.showToast(t("dkMovedIn", { x: folder.name! }));
    }, reducedMotion() ? 0 : 360);
  }
  /** dkOpen as redefined by dkOpenTarget / dkOpenX (L11862–L11873): shortcuts resolve their target; apps launch their surface. */
  function open(it: Item | undefined, el: HTMLElement | null) {
    if (it?.ref) { const r = fsFind(it.ref); if (r) { openX(r.node, el, r.root); return; } }
    openX(it, el);
  }
  function openX(it: Item | undefined, el: HTMLElement | null, root?: string) {
    if (!it) return;
    // App shortcuts of window apps open their window (the dkOpenX wrappers L13589…L27207, outermost first).
    if (it.type === "app" && it.app && APP_WINDOWS[OPEN_KEY[it.app] ?? ""] && !["files", "terminal"].includes(OPEN_KEY[it.app])) { pop(el); openApp(OPEN_KEY[it.app], el); return; }
    if (it.type === "app") {
      const k = it.app!; pop(el);
      s.mutate((st) => { st.apps.recent = [k, ...st.apps.recent.filter((x) => x !== k)].slice(0, 12); }, { save: false, apps: true }); // alTouch
      if (k === "remotionAI") { osActions.ai(); return; }
      if (k === "files" || k === "explorer") { osActions.files(el); return; }
      if (k === "terminal") { osActions.terminal(el); return; }
      if (k === "launchpad" || k === "apps") { osActions.launcher(el); return; }
      if (k === "settings") { osActions.sysMenu(true); return; }
      s.showToast(t("opened", { x: k === "Keep Flow" ? "Keep Flow" : t(k) })); return;
    }
    if (it.type === "folder" && root && root !== "desktop") { const f = fsFind(it.id); osActions.files(el, { root, path: [...(f?.path.map((p) => p.id) ?? []), it.id] }); return; }
    pop(el);
    if (it.type === "link") { s.showToast(t("opened", { x: it.name! })); return; } // link URL never opened: defect D-B20 reproduced
    openDkWin(it.type === "folder" ? { kind: "folder", id: it.id } : { kind: "ql", id: it.id }, el);
  }
  function add(item: Item, c: number, r: number, quiet?: boolean) {
    const g = computeGeo(); const n = g ? dkNearest(g, items, c ?? 0, r ?? 0) : [0, 0]; if (!n) { s.showToast(t("dkNoRoom")); return null; }
    if (!item.id) { delete (item as Partial<Item>).id; item.id = dkId(); } item.c = n[0]; item.r = n[1]; // key order as the source ({type, app, …, id, c, r})
    s.mutate((st) => { (st.desks[st.cur].items ??= []).push(item); }); s.setSel([item.id]); if (!quiet) s.showToast(t("dkAdded", { x: dkName(item) }));
    requestAnimationFrame(() => { const el = elOf(item.id); if (el && !reducedMotion()) el.animate([{ opacity: 0, transform: el.style.transform + " scale(.3)" }, { opacity: 1, transform: el.style.transform + " scale(1.08)", offset: .7 }, { opacity: 1, transform: el.style.transform }], { duration: 520, easing: "cubic-bezier(.2,1.2,.3,1)" }); });
    return item;
  }
  const clip = useRef<{ items: Item[]; cut: boolean; from: number } | null>(null);
  // Selection is read live: menus call these after the outside-pointerdown handler may have cleared it (D-B21).
  const liveSel = () => useShell.getState().sel;
  function copy(cut: boolean) {
    const sel = items.filter((x) => liveSel().has(x.id)); if (!sel.length) return;
    clip.current = { items: sel.map((x) => JSON.parse(JSON.stringify(x))), cut, from: s.cur };
    // Cut removes immediately; items are lost if never pasted (defect D-B03 reproduced).
    if (cut) { const ids = new Set(liveSel()); s.mutate((st) => { st.desks[st.cur].items = (st.desks[st.cur].items ?? []).filter((x) => !ids.has(x.id)); }); s.setSel([]); }
    s.showToast(t("dkCopied", { n: nf(sel.length) }));
  }
  function clone(it: Item): Item { const c = JSON.parse(JSON.stringify(it)); const re = (x: Item) => { x.id = dkId(); (x.kids || []).forEach(re); }; re(c); return c; }
  function paste(at?: [number, number]) {
    const cl = clip.current; if (!cl) return; const [c, r] = at || [0, 0]; const added: string[] = [];
    cl.items.forEach((x) => { const it = cl.cut ? JSON.parse(JSON.stringify(x)) : clone(x); if (cl.cut) it.id = it.id || dkId(); const a = add(it, c, r, true); if (a) added.push(a.id); });
    if (cl.cut) clip.current = null; s.setSel(added);
  }
  /** Source dkDuplicate (L11442): " (2)" before the extension, placed one column to the right. */
  function duplicate() {
    const sel = items.filter((x) => liveSel().has(x.id)); const ids: string[] = [];
    sel.forEach((x) => { const c = clone(x); if (c.type !== "app") { const ext = dkExt(c.name); c.name = ext ? c.name!.replace(new RegExp("\\." + ext + "$"), " (2)." + ext) : c.name + " (2)"; } const a = add(c, x.c! + 1, x.r!, true); if (a) ids.push(a.id); });
    s.setSel(ids);
  }
  /** Source osSortDesk (L11926): sort, then fill columns top to bottom skipping blocked cells. */
  function sortDesk(by: "name" | "type" | "size" | "date") {
    const g = computeGeo(); if (!g) return;
    const cmp: Record<string, (a: Item, b: Item) => number> = { name: (a, b) => dkName(a).localeCompare(dkName(b), loc()), type: (a, b) => a.type.localeCompare(b.type) || dkExt(a.name || "").localeCompare(dkExt(b.name || "")), size: (a, b) => (b.size || 0) - (a.size || 0), date: (a, b) => (b.mod || 0) - (a.mod || 0) };
    s.mutate((st) => {
      const list = (st.desks[st.cur].items ?? []).slice().sort(cmp[by]), taken = new Set<string>(); list.forEach((it) => { delete it.fx; delete it.fy; });
      for (const it of list) { let placed = false; for (let c = 0; c < g.cols && !placed; c++) for (let r = 0; r < g.rows && !placed; r++) { if (!taken.has(c + "," + r) && !dkBlocked(g, c, r)) { it.c = c; it.r = r; taken.add(c + "," + r); placed = true; } } }
      st.desks[st.cur].items = list;
    });
    setSettle(true);
  }
  const menuApi = (): LayerApi => ({
    t, nf, add, rename: (id) => setRenaming(id), open: (n) => open(n, elOf(n.id)), copy, paste, hasClip: () => !!clip.current, duplicate, del,
    cellAt: (x, y) => { const g = computeGeo(); return g ? dkCellAt(g, x, y) : [0, 0]; }, sort: sortDesk, refresh: () => osRefreshDesk(t), name: dkName,
  });
  const onContextMenu = (e: React.MouseEvent) => {
    if ((e.target as Element).closest(".dk-ren")) return; e.preventDefault();
    const ic = (e.target as Element).closest<HTMLElement>(".dk-ic"); const it = ic ? items.find((x) => x.id === ic.dataset.id) : undefined;
    if (it) osIconMenu(menuApi(), e.clientX, e.clientY, it); else osDeskMenu(menuApi(), e.clientX, e.clientY);
  };

  /* ---------- pointer (L11341–L11384) ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || dkPhone() || (e.target as Element).closest(".dk-ren")) return;
    const ic = (e.target as Element).closest<HTMLElement>(".dk-ic");
    if (ic) {
      const id = ic.dataset.id!, multi = e.ctrlKey || e.metaKey || e.shiftKey;
      if (multi) { if (s.sel.has(id)) { const n = new Set(s.sel); n.delete(id); useShell.setState({ sel: n }); } else s.setSel([id], true); } else if (!s.sel.has(id)) s.setSel([id]);
      drag.current = { mode: "move", x0: e.clientX, y0: e.clientY, id, started: false, pid: e.pointerId };
    } else {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey)) s.setSel([]);
      drag.current = { mode: "band", x0: e.clientX, y0: e.clientY, L: layer.current!.getBoundingClientRect(), base: new Set(useShell.getState().sel), pid: e.pointerId };
      setBand({ left: 0, top: 0, width: 0, height: 0 }); layer.current!.setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || e.pointerId !== d.pid) return; const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (d.mode === "band") {
      const L = d.L, x = Math.min(e.clientX, d.x0) - L.left, y = Math.min(e.clientY, d.y0) - L.top, w = Math.abs(dx), h = Math.abs(dy); setBand({ left: x, top: y, width: w, height: h });
      const ids = [...layer.current!.querySelectorAll<HTMLElement>(".dk-ic")].filter((el) => { const r = el.getBoundingClientRect(); return r.left < L.left + x + w && r.right > L.left + x && r.top < L.top + y + h && r.bottom > L.top + y; }).map((el) => el.dataset.id!);
      s.setSel([...d.base, ...ids]); return;
    }
    if (!d.started) {
      if (Math.hypot(dx, dy) < 5) return; d.started = true; try { layer.current!.setPointerCapture(d.pid); } catch {}
      d.els = [...useShell.getState().sel].map((id) => { const el = elOf(id), it = items.find((x) => x.id === id)!; const p = posOf(it, geo.current)!; el?.classList.remove("settle"); el?.classList.add("drag"); return { el: el!, it, p }; }).filter((x) => x.el);
      layer.current!.classList.add("dragging");
    }
    d.els!.forEach(({ el, p }) => (el.style.transform = `translate(${p.x + dx}px,${p.y + dy}px) scale(1.04)`));
    const tg = targetAt(e.clientX, e.clientY, useShell.getState().sel); mark(tg); d.tg = tg;
    const g = geo.current; const pr = d.els!.find((x) => x.it.id === d.id) || d.els![0];
    if (pr && g) { const c = Math.round((g.rtl ? -dx : dx) / g.cw) + pr.it.c!, r = Math.round(dy / g.ch) + pr.it.r!; setHint(tg || dkBlocked(g, c, r) ? null : [c, r]); }
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || e.pointerId !== d.pid) return; drag.current = null; try { layer.current!.releasePointerCapture(e.pointerId); } catch {}
    if (d.mode === "band") { setBand(null); return; }
    if (!d.started) return;
    layer.current!.classList.remove("dragging"); setHint(null); mark(null);
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0, ids = new Set(d.els!.map((x) => x.it.id));
    d.els!.forEach(({ el }) => el.classList.remove("drag"));
    if (d.tg?.kind === "trash") { del([...ids]); return; }
    if (d.tg?.kind === "folder") { intoFolder(d.tg.it, [...ids]); return; }
    setSettle(true);
    if (e.type === "pointercancel") { d.els!.forEach(({ el, p }) => (el.style.transform = `translate(${p.x}px,${p.y}px)`)); return; }
    const g = geo.current!;
    if (free) { const L = g.L; s.mutate(() => { d.els!.forEach(({ it, p }) => { it.fx = Math.max(0, Math.min(L.width - g.cw, p.x + dx)); it.fy = Math.max(0, Math.min(L.height - g.ch, p.y + dy)); }); }); return; }
    const dc = Math.round((g.rtl ? -dx : dx) / g.cw), dr = Math.round(dy / g.ch), taken = new Set<string>();
    const order = d.els!.slice().sort((a, b) => (a.it.id === d.id ? -1 : b.it.id === d.id ? 1 : 0));
    s.mutate(() => { for (const { it } of order) { let c = it.c! + dc, r = it.r! + dr; if (taken.has(c + "," + r) || !dkFree(g, items, c, r, ids)) { const n = dkNearest(g, items, c, r, ids, taken); if (n) { c = n[0]; r = n[1]; } else { c = it.c!; r = it.r!; } } it.c = c; it.r = r; taken.add(c + "," + r); } });
  };
  /* ---------- keyboard (L11387–L11403) ---------- */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as Element).closest(".dk-ren")) return;
    const ic = (e.target as Element).closest<HTMLElement>(".dk-ic"), k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === "a") { e.preventDefault(); s.setSel(items.map((i) => i.id)); return; }
    if (mod && k === "c") { e.preventDefault(); copy(false); return; }
    if (mod && k === "x") { e.preventDefault(); copy(true); return; }
    if (mod && k === "v") { e.preventDefault(); paste(); return; }
    if (!ic) return; const it = items.find((x) => x.id === ic.dataset.id)!;
    if (e.key === "Enter") { e.preventDefault(); open(it, ic); return; }
    if (e.key === "F2") { e.preventDefault(); if (it.type !== "app") setRenaming(it.id); return; }
    if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) { e.preventDefault(); const r = ic.getBoundingClientRect(); osIconMenu(menuApi(), r.left + r.width / 2, r.bottom, it); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); del(s.sel.size ? [...s.sel] : [it.id]); return; }
    const g = geo.current; if (g && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault(); const best = dkNeighbour(g, items, it, e.key);
      if (best) { elOf(best.id)?.focus(); if (!e.shiftKey) s.setSel([best.id]); else s.setSel([best.id], true); }
    }
  };
  const addRef = useRef(add); const openRef = useRef(open); const targetRef = useRef(targetAt);
  useEffect(() => { addRef.current = add; openRef.current = open; targetRef.current = targetAt; });
  useEffect(() => {
    desktopApi.add = (...a) => addRef.current(...a);
    desktopApi.open = (...a) => openRef.current(...a);
    // Ghost drags (ghost.tsx) use the same drop targets, marks and cell hint as icon drags.
    desktopApi.targetAt = (x, y) => targetRef.current(x, y);
    desktopApi.mark = (tg) => mark(tg);
    desktopApi.hint = (cell) => setHint(cell);
    desktopApi.cellAt = (x, y) => { const g = computeGeo(); return g ? dkCellAt(g, x, y) : [0, 0]; };
  }, [computeGeo]);
  const alignRef = useRef<(on: boolean) => void>(() => {});
  useEffect(() => { alignRef.current = (on) => { dkSetAlign(on, computeGeo(), DK_PAD); setSettle(true); }; });
  useEffect(() => { setAlignHook((on) => alignRef.current(on)); return () => setAlignHook(null); }, []);
  // Outside pointerdown clears the selection (L11405).
  useEffect(() => {
    const h = (e: PointerEvent) => { if (!(e.target as Element).closest?.(".dk-layer,.dk-menu,.dk-win,#dock")) useShell.getState().setSel([]); };
    document.addEventListener("pointerdown", h, true); return () => document.removeEventListener("pointerdown", h, true);
  }, []);

  // Files dropped from the computer (L11550–L11561): up to 12 documents at the drop cell, small text files keep their text.
  const [fileDrop, setFileDrop] = useState(false);
  useEffect(() => {
    const el = layer.current; if (!el) return; let depth = 0;
    const isFiles = (e: DragEvent) => [...(e.dataTransfer?.types || [])].includes("Files");
    const enter = (e: DragEvent) => { if (!isFiles(e)) return; e.preventDefault(); depth++; setFileDrop(true); };
    const over = (e: DragEvent) => { if (!isFiles(e)) return; e.preventDefault(); e.dataTransfer!.dropEffect = "copy"; setHint(desktopApi.cellAt(e.clientX, e.clientY)); };
    const leave = () => { if (--depth <= 0) { depth = 0; setFileDrop(false); setHint(null); } };
    const drop = async (e: DragEvent) => {
      if (!isFiles(e)) return; e.preventDefault(); depth = 0; setFileDrop(false); setHint(null);
      const [c, r] = desktopApi.cellAt(e.clientX, e.clientY); const ids: string[] = []; const files = [...e.dataTransfer!.files];
      for (const f of files.slice(0, 12)) {
        let text: string | null = null;
        if (f.size < 200000 && (/^text\/|json|xml|csv|markdown/.test(f.type) || /\.(md|txt|csv|json|html?|css|js|ts|py|xml|ya?ml|log)$/i.test(f.name))) { try { text = (await f.text()).slice(0, 20000); } catch {} }
        const it = addRef.current({ type: "doc", name: f.name, size: f.size, mod: f.lastModified || Date.now(), text } as Item, c, r, true); if (it) ids.push(it.id);
      }
      const st = useShell.getState(); st.setSel(ids);
      if (ids.length) st.showToast(ids.length === 1 ? t("dkAdded", { x: files[0].name }) : t("dkItems", { n: nf(ids.length) }));
    };
    el.addEventListener("dragenter", enter); el.addEventListener("dragover", over); el.addEventListener("dragleave", leave); el.addEventListener("drop", drop);
    return () => { el.removeEventListener("dragenter", enter); el.removeEventListener("dragover", over); el.removeEventListener("dragleave", leave); el.removeEventListener("drop", drop); };
  }, [t, nf]);

  const g = geoState;
  const cls = ["dk-layer", phone ? "phone" : "", s.dkView.icons ? "" : "noicons", fileDrop ? "filedrop" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls} id="dkLayer" role="listbox" aria-multiselectable="true" ref={layer} data-drop={t("dkDropHere")} data-size={s.dkView.size}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onKeyDown={onKeyDown} onContextMenu={onContextMenu}
      onDoubleClick={(e) => { const ic = (e.target as Element).closest<HTMLElement>(".dk-ic"); if (ic && !(e.target as Element).closest(".dk-ren")) open(items.find((x) => x.id === ic.dataset.id), ic); }}
      onClick={(e) => { if (!dkPhone()) return; const ic = (e.target as Element).closest<HTMLElement>(".dk-ic"); if (ic) { const id = ic.dataset.id!; if (s.sel.has(id) && s.sel.size === 1) open(items.find((x) => x.id === id), ic); else s.setSel([id]); } }}
      onFocus={(e) => { const ic = (e.target as Element).closest<HTMLElement>(".dk-ic"); if (ic && !s.sel.has(ic.dataset.id!) && !drag.current) s.setSel([ic.dataset.id!]); }}>
      {hint && g ? <div className="dk-hint" style={{ transform: `translate(${dkXY(g, hint[0], hint[1]).x}px,${dkXY(g, hint[0], hint[1]).y}px)` }} /> : null}
      {items.map((it, i) => {
        const p = posOf(it, g), sc = it.type === "app" || it.type === "link", on = s.sel.has(it.id);
        return (
          <button key={s.iconEpoch + ":" + it.id} type="button" className={"dk-ic" + (on ? " dk-on" : "") + (settle ? " settle" : "")} role="option" aria-selected={on} data-id={it.id} title={dkName(it)}
            style={{ ["--i" as string]: i, animation: s.iconAnim ? undefined : "none", transform: p ? `translate(${p.x}px,${p.y}px)` : undefined }}>
            <Glyph it={it} />
            {sc ? <i className="sc" aria-hidden="true"><SvgString html={SC_ARROW} /></i> : null}
            {renaming === it.id ? <RenameBox it={it} onDone={(v) => { setRenaming(null); if (v && v !== it.name) s.mutate(() => { it.name = v; }); requestAnimationFrame(() => elOf(it.id)?.focus()); }} />
              : <span className="nm" dir="auto">{dkName(it)}</span>}
          </button>
        );
      })}
      {items.length ? null : <div className="dk-empty"><span><SvgString html={SPARK26} /></span><b>{t("dkEmptyT")}</b><small>{t("dkEmptyD")}</small></div>}
      {band ? <div className="dk-band" style={{ left: band.left, top: band.top, width: band.width, height: band.height }} /> : null}
    </div>
  );
}

/** Inline rename textarea (L11431): keeps the extension unselected; Enter saves, Escape cancels, blur saves. */
function RenameBox({ it, onDone }: { it: Item; onDone: (v: string | null) => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLTextAreaElement | null>(null); const done = useRef(false);
  useEffect(() => { const ta = ref.current!; ta.focus(); const ext = dkExt(it.name); ta.setSelectionRange(0, ext && it.type === "doc" ? it.name!.length - ext.length - 1 : it.name!.length); }, [it]);
  const fin = (save: boolean) => { if (done.current) return; done.current = true; const v = ref.current!.value.replace(/\s+/g, " ").trim(); onDone(save && v ? v : null); };
  return <textarea ref={ref} className="dk-ren" defaultValue={it.name} rows={2} maxLength={80} aria-label={t("dkRename")} dir="auto"
    onKeyDown={(e) => { stopAll(e); if (e.key === "Enter") { e.preventDefault(); fin(true); } else if (e.key === "Escape") { e.preventDefault(); fin(false); } }}
    onBlur={() => fin(true)} onPointerDown={(e) => stopAll(e)} />;
}
// Re-exported for menus and other callers (port of dkCellAt).
export { dkCellAt };
