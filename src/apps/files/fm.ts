"use client";
/**
 * Files manager state and file operations (source L12013–L12178): FM, fmLoc, fmItems, fmDelete, the global dkTrashAct
 * redefinition, fmDuplicate, fmPasteTo. The window body is ./FilesApp.tsx.
 */
import { create } from "zustand";
import { translate, formatNumber, localeOf } from "@/lib/i18n/core";
import { isLang, type Lang } from "@/lib/i18n/langs";
import { reducedMotion } from "@/lib/motion";
import { useShell } from "@/os/state/shell";
import { desktopApi } from "@/os/desktop/api";
import { FM as FM_CLIP, FS_ROOTS, fmRootKey, fsEach, fsFind, fsMove, fsStrip, type FsDest } from "@/os/desktop/fs";
import { dkExt, dkId, type FsData, type Item, type TrashItem } from "@/os/desktop/model";

export type FmLoc = { root: string; path?: string[]; sel?: string; desk?: number };
type FmState = {
  root: string; path: string[]; hist: { root: string; path: string[] }[]; fwd: { root: string; path: string[] }[];
  sel: Set<string>; sort: { k: "name" | "size" | "type" | "mod"; d: 1 | -1 }; view: "list" | "grid"; q: string; detail: string | null;
  /** fmRefresh: the rows are rendered from this snapshot (the source rebuilds the table HTML only when it refreshes). */
  snap: { items: Item[]; n: number; anim: boolean }; renaming: string | null; detN: number; open: boolean;
};
export const useFm = create<FmState>(() => ({
  root: "desktop", path: [], hist: [], fwd: [], sel: new Set(), sort: { k: "name", d: 1 }, view: "list", q: "", detail: null,
  snap: { items: [], n: 0, anim: true }, renaming: null, detN: 0, open: false,
}));
export const FM = () => useFm.getState();
const S = (p: Partial<FmState>) => useFm.setState(p);
/** FM.clip lives in os/desktop/fs.ts (the desktop's Paste row reads it). */
export const fmClip = FM_CLIP;

const lang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
export const t = (k: string, v?: Record<string, string | number>) => translate(lang(), k, v);
export const nf = (n: number) => formatNumber(lang(), n);
export const loc = () => localeOf(lang());
const toast = (m: string, undo?: () => void) => useShell.getState().showToast(m, undo);
export const dkName = (n: Item) => (n.type === "app" ? t(n.app!) : n.name!);

export const FM_NAV: ([string, string, string] | "-")[] = [["home", "fmHome", "home"], ["desktop", "fmDesktop", "desk"], ["documents", "fmDocs", "docs"], ["downloads", "fmDownloads", "down"], ["images", "fmImages", "img"], ["videos", "fmVideos", "vid"], ["music", "fmMusic", "music"], "-", ["shared", "fmShared", "shared"], ["recent", "fmRecent", "recent"], ["favs", "fmFavs", "star"], ["trash", "fmTrash", "trash"]];
export const fmRootName = (r: string) => t(fmRootKey(r));
export const fmIsContainer = (r: string) => r === "desktop" || (FS_ROOTS as readonly string[]).includes(r);

/** fmLoc (L12018): the list at a location (desktop = current desktop items). */
export function fmLoc(root: string, path: string[]) {
  const st = useShell.getState(); const fs = st.fs as FsData;
  let list: Item[] | null = root === "desktop" ? (st.desks[st.cur].items ??= []) : (FS_ROOTS as readonly string[]).includes(root) ? (fs[root as keyof FsData] = fs[root as keyof FsData] || []) : null;
  let parent: Item | null = null; const trail: Item[] = [];
  for (const id of path || []) { const n = list?.find((x) => x.id === id); if (!n || n.type !== "folder") break; trail.push(n); parent = n; list = n.kids = n.kids || []; }
  return { list, parent, trail };
}
export function fmTypeLabel(n: Item) { if (n.type === "folder") return t("fmFolderT"); if (n.type === "app") return t("fmAppT"); if (n.type === "link") return t("fmLinkT"); return (dkExt(n.name) || "file").toUpperCase(); }
export const fmDate = (ms: number | undefined, time?: boolean) => (ms ? new Intl.DateTimeFormat(loc(), time ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" }).format(ms) : "—");

/** fmItems (L12027). */
export function fmItems(): Item[] {
  const F = FM(), st = useShell.getState(); let items: Item[] = []; const r = F.root;
  if (r === "home") items = ["desktop", "documents", "downloads", "images", "videos", "music"].map((k) => ({ id: "@" + k, type: "folder", name: fmRootName(k), virt: k, kids: k === "desktop" ? (st.desks[st.cur].items ??= []) : (st.fs as FsData)[k as keyof FsData] || [], mod: Date.now() }) as Item);
  else if (r === "recent") { fsEach((n, _l, root, desk) => { if (n.type === "doc" && (root !== "desktop" || desk === st.cur)) items.push(n); }); items.sort((a, b) => (b.mod || 0) - (a.mod || 0)); items = items.slice(0, 30); }
  else if (r === "favs") fsEach((n) => { if (n.fav) items.push(n); });
  else if (r === "trash") items = st.trash.slice();
  else items = (fmLoc(r, F.path).list || []).slice();
  const q = F.q.trim().toLowerCase();
  if (q) { const base = items; items = []; const walk = (L: Item[]) => L.forEach((n) => { if (dkName(n).toLowerCase().includes(q)) items.push(n); if (n.type === "folder" && !n.virt) walk(n.kids || []); }); walk(base); }
  const { k, d } = F.sort;
  const cmp = { name: (a: Item, b: Item) => dkName(a).localeCompare(dkName(b), loc(), { numeric: true }), size: (a: Item, b: Item) => (a.size || 0) - (b.size || 0), type: (a: Item, b: Item) => fmTypeLabel(a).localeCompare(fmTypeLabel(b)), mod: (a: Item, b: Item) => (a.mod || 0) - (b.mod || 0) }[k];
  if (r !== "recent") items.sort((a, b) => ((a.type === "folder") !== (b.type === "folder") ? (a.type === "folder" ? -1 : 1) : cmp(a, b) * d));
  return items;
}
/** fmRefresh(anim): rebuild the rows from the current state (skipped while a rename box is open, L12073). */
export function fmRefresh(anim?: boolean) {
  if (!FM().open || FM().renaming) return;
  S({ snap: { items: fmItems(), n: FM().snap.n + 1, anim: !!anim }, detN: FM().detN + 1 });
}
/** fmGo (L12083). */
export function fmGo(l: FmLoc, noHist?: boolean) {
  const F = FM();
  if (!noHist) S({ hist: [...F.hist, { root: F.root, path: F.path.slice() }], fwd: [] });
  const sel = new Set<string>(); if (l.sel) sel.add(l.sel);
  S({ root: l.root, path: l.path || [], sel, detail: l.sel || null, q: "" });
  const s = document.querySelector<HTMLInputElement>(".fm .fm-search input"); if (s) s.value = "";
  fmRefresh(true);
  requestAnimationFrame(() => { const tb = document.querySelector<HTMLElement>(".fm .fm-rows"); if (tb && !reducedMotion()) tb.animate([{ opacity: 0, transform: "translateX(10px)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: "cubic-bezier(.2,1,.3,1)" }); });
}
export function fmSelNodes() { return fmItems().filter((n) => FM().sel.has(n.id)); }
/** fmSetSel (L12099): selection classes and the detail panel only (rows are not rebuilt). */
export function fmSetSel(ids: string[], add?: boolean) {
  const F = FM(); const sel = add ? new Set(F.sel) : new Set<string>(); ids.forEach((i) => sel.add(i));
  S({ sel, detail: ids[ids.length - 1] || (add ? F.detail : null), detN: F.detN + 1 });
  requestAnimationFrame(() => { const d = document.querySelector<HTMLElement>(".fm .fm-det"); if (d && !reducedMotion()) d.firstElementChild?.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "ease-out" }); });
}
const trashPop = () => { const tb = document.querySelector<HTMLElement>('#dock [data-t="trash"]'); if (tb && !reducedMotion()) tb.animate([{ transform: "scale(1)" }, { transform: "scale(1.2) rotate(-6deg)" }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,1.4,.3,1)" }); };
const saveAll = () => useShell.getState().mutate(() => {}, { save: true, fs: true });
/** fmDelete (L12126). */
export function fmDelete(nodes: Item[]) {
  const st = useShell.getState();
  if (FM().root === "trash" && FM().open && nodes.every((n) => st.trash.includes(n as TrashItem))) {
    st.mutate((s) => { s.trash = s.trash.filter((x) => !nodes.includes(x)); }, { save: false, trash: true });
    S({ sel: new Set(), detail: null }); fmRefresh(); return;
  }
  const gone: TrashItem[] = [];
  st.mutate((s) => {
    for (const n of nodes) { const f = fsFind(n.id); if (!f) continue; f.list.splice(f.list.indexOf(f.node), 1); gone.push({ ...f.node, from: f.desk >= 0 ? f.desk : s.cur, root: f.root, at: Date.now() }); }
    if (gone.length) s.trash = [...gone, ...s.trash].slice(0, 60);
  }, { save: true, fs: true, trash: true });
  if (!gone.length) return;
  S({ sel: new Set(), detail: null }); useShell.getState().setSel([]); fmRefresh(); trashPop();
  toast(gone.length === 1 ? t("dkDeleted1", { x: dkName(gone[0]) }) : t("dkDeletedN", { n: nf(gone.length) }), () => { gone.forEach((g) => trashAct("restore", g.id)); });
}
/** dkTrashAct as redefined for the Files manager (L12134): restores into a Files root when the item came from one. */
export function trashAct(a: string, id?: string) {
  const st = useShell.getState();
  if (a === "empty") { st.mutate((s) => { s.trash = []; }, { save: false, trash: true }); toast(t("dkEmptied")); fmRefresh(); return; }
  const i = st.trash.findIndex((x) => x.id === id); if (i < 0) return; const it = st.trash[i];
  st.mutate((s) => { s.trash.splice(i, 1); }, { save: false, trash: true });
  const { from, at: _at, root, ...rest } = it; void _at;
  if (root && root !== "desktop" && (FS_ROOTS as readonly string[]).includes(root)) st.mutate((s) => { const fs = s.fs as FsData; (fs[root as keyof FsData] = fs[root as keyof FsData] || []).push(rest as Item); }, { save: false, fs: true });
  else { const target = Math.min(from ?? st.cur, st.desks.length - 1); if (target === st.cur) desktopApi.add(rest as Item, rest.c ?? 0, rest.r ?? 0, true); else st.mutate((s) => { (s.desks[target].items ??= []).push(rest as Item); }); }
  toast(t("dkRestored", { x: dkName(it) })); fmRefresh();
}
export function clone(it: Item): Item { const c = JSON.parse(JSON.stringify(it)); const re = (x: Item) => { x.id = dkId(); (x.kids || []).forEach(re); }; re(c); return c; }
/** fmDuplicate (L12157). */
export function fmDuplicate() {
  const F = FM(), sel = fmSelNodes(); if (!sel.length || !fmIsContainer(F.root)) return; const ids: string[] = [];
  sel.forEach((n) => {
    const c = clone(fsStrip(n)); if (c.type !== "app") { const ext = dkExt(c.name); c.name = ext ? c.name!.replace(new RegExp("\\." + ext + "$"), " (2)." + ext) : c.name + " (2)"; } c.mod = Date.now();
    if (F.root === "desktop" && !F.path.length) { const a = desktopApi.add(c, (n.c ?? 0) + 1, n.r ?? 0, true); if (a) ids.push(a.id); } else { fmLoc(F.root, F.path).list!.push(c); ids.push(c.id); }
  });
  saveAll(); fmRefresh(); fmSetSel(ids);
}
const deskName = (i: number) => useShell.getState().desks[i]?.n || t("desktopN", { n: nf(i + 1) });
export const moveLabel = (d: FsDest) => t("fmMoved", { x: d.path?.length ? fsFind(d.path[d.path.length - 1])?.node.name || "" : d.root === "desktop" ? deskName(d.desk ?? useShell.getState().cur) : fmRootName(d.root) });
/** fsMove followed by the Files refresh (the source's fsMove calls fmRefresh itself, L12116). */
export function move(nodes: Item[], dest: FsDest, quiet?: boolean) { fsMove(nodes, dest, desktopApi.add, moveLabel, (m) => toast(m), quiet); fmRefresh(); }
/** fmPasteTo (L12164). */
export function fmPasteTo(l: FmLoc, at?: [number, number]) {
  const C = fmClip.clip; if (!C) return; const nodes = C.ids.map((id) => fsFind(id)?.node).filter(Boolean) as Item[]; if (!nodes.length) return;
  if (C.cut) { move(nodes, { root: l.root, desk: l.desk, path: l.path, at }); fmClip.clip = null; return; }
  const st = useShell.getState();
  const L = l.root === "desktop" && !l.path?.length ? null : l.root === "desktop" ? locOnDesk(st.cur, l.path || []) : fmLoc(l.root, l.path || []).list;
  nodes.forEach((n, k) => { const c = clone(fsStrip(n)); if (L) L.push(c); else desktopApi.add(c, at?.[0] ?? 0, (at?.[1] ?? 0) + k, true); });
  saveAll(); fmRefresh(); toast(t("fmPasted", { n: nf(nodes.length) }));
}
function locOnDesk(d: number, path: string[]) { let list = useShell.getState().desks[d].items ??= []; for (const id of path) { const n = list.find((x) => x.id === id); if (!n) break; list = n.kids = n.kids || []; } return list; }
export { saveAll as fsSaveAll };
