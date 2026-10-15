"use client";
/**
 * Desktop menus "exact structure" (B-04) — port of itemMenuItems / osDeskMenu / osIconMenu / osSortDesk / osRefreshDesk
 * (L11861–L11931) and the view options dkSetSize / dkSetAlign (L11760–L11765).
 * Rows, order, icons, shortcuts, check marks and sub-menus match the source; the DOM is the shared OsMenu.
 */
import raw from "@/apps/registry.data.json";
import icons from "@/os/shell/data/icons.json";
import { STORAGE_KEYS, writeJSON } from "@/lib/storage/keys";
import { reducedMotion } from "@/lib/motion";
import { scenes } from "@/os/shell/wallpaper";
import { toggleIcons, toggleWidgets, useShell, type DkView } from "@/os/state/shell";
import { osActions } from "@/os/actions";
import { iconSoloRows } from "@/os/windows/appmode";
import { osMenu, osMenuCloseAll, type MenuItem } from "@/os/menu/OsMenu";
import { setDeskWall } from "./DesktopsPanel";
import { Glyph } from "./Glyph";
import { FM, fmRootKey, fsEach, fsFind, fsMove, type FsDest } from "./fs";
import type { Item } from "./model";
import { fmPasteTo, fmRefresh } from "@/apps/files/fm";

const OIC = icons.OIC as Record<string, string>;
const AL_APPS = raw.AL_APPS as unknown as [string, string, number][];
type T = (k: string, v?: Record<string, string | number>) => string;

/** Source alInst (L11751). */
export const alInst = (k: string) => { const st = useShell.getState().apps; const d = AL_APPS.find((a) => a[0] === k); return st.inst[k] !== undefined ? !!st.inst[k] : !!d?.[2]; };
/** Source appName (L11752). */
export const appName = (t: T, k: string) => (k === "Keep Flow" ? "Keep Flow" : t(k));

/** What the desktop layer exposes to its menus (the source's dk* globals). */
export type LayerApi = {
  t: T; nf: (n: number) => string;
  add: (item: Item, c: number, r: number, quiet?: boolean) => Item | null;
  rename: (id: string) => void;
  open: (it: Item) => void;
  copy: (cut: boolean) => void;
  paste: (at: [number, number]) => void;
  hasClip: () => boolean;
  duplicate: () => void;
  del: (ids: string[]) => void;
  cellAt: (x: number, y: number) => [number, number];
  sort: (by: "name" | "type" | "size" | "date") => void;
  refresh: () => void;
  name: (it: Item) => string;
};

/* ---------- view options (L11760–L11765) ---------- */
const saveView = (v: DkView) => writeJSON(STORAGE_KEYS.dkView, v);
export function dkSetSize(z: DkView["size"]) { const st = useShell.getState(); const v = { ...st.dkView, size: z }; saveView(v); useShell.setState({ dkView: v }); }
export function dkSetIcons(on: boolean) { const st = useShell.getState(); const v = { ...st.dkView, icons: on }; saveView(v); useShell.setState({ dkView: v }); }
/** Turning alignment back on snaps free positions to the nearest cell (rounding, clamped at 0). Needs the live geometry. */
export function dkSetAlign(on: boolean, geo: { L: { width: number }; rtl: boolean; cw: number; ch: number } | null, pad: number) {
  const st = useShell.getState(); const v = { ...st.dkView, align: on }; saveView(v); useShell.setState({ dkView: v });
  if (on && geo) st.mutate((s) => { (s.desks[s.cur].items ?? []).forEach((it) => { if (it.fx != null) { it.c = Math.max(0, Math.round(((geo.rtl ? geo.L.width - it.fx - geo.cw : it.fx) - pad) / geo.cw)); it.r = Math.max(0, Math.round((it.fy! - pad) / geo.ch)); delete it.fx; delete it.fy; } }); });
}

/** Source osSidebar (L11934). */
export function osSidebar(show: boolean, t: T) { toggleIcons(show); useShell.getState().showToast(t(show ? "sbShown" : "sbHidden")); }

const deskName = (t: T, nf: (n: number) => string, i: number) => useShell.getState().desks[i]?.n || t("desktopN", { n: nf(i + 1) });

/* ---------- item menu (itemMenuItems, L11875) ---------- */
export type ItemCtx = { root: string; path?: string[]; open: (n: Item) => void; rename: (n: Item) => void; copy: (cut: boolean) => void; dup: () => void; del: () => void; info: (n: Item) => void };
export function itemMenuItems(api: Pick<LayerApi, "t" | "nf" | "add">, nodes: Item[], ctx: ItemCtx): MenuItem[] {
  const { t, nf } = api, st = useShell.getState();
  const one = nodes.length === 1 ? nodes[0] : null, isDoc = !!one && one.type === "doc", fav = !!one && !!one.fav;
  const dests: { l: string; dest: FsDest }[] = [...st.desks.map((_, i) => ({ l: deskName(t, nf, i), dest: { root: "desktop", desk: i } as FsDest })), { l: t("fmDocs"), dest: { root: "documents" } }, { l: t("fmDownloads"), dest: { root: "downloads" } }, { l: t("fmImages"), dest: { root: "images" } }, { l: t("fmShared"), dest: { root: "shared" } }]
    .filter((x) => !(x.dest.root === ctx.root && (x.dest.root !== "desktop" || x.dest.desk === st.cur) && !ctx.path?.length));
  const toast = (m: string) => useShell.getState().showToast(m);
  const moveLabel = (d: FsDest) => t("fmMoved", { x: d.path?.length ? fsFind(d.path[d.path.length - 1])?.node.name || "" : d.root === "desktop" ? deskName(t, nf, d.desk ?? useShell.getState().cur) : t(fmRootKey(d.root)) });
  return [
    { l: t("fmOpen"), ic: OIC.open, kbd: t("fmEnter"), run: () => nodes.forEach((n) => ctx.open(n)) },
    ...(isDoc ? [{ l: t("fmOpenWith"), ic: OIC.with, sub: [
      { l: t("docs"), ic: <Glyph it={{ id: "", type: "app", app: "docs" }} mini />, run: () => toast(t("opened", { x: one!.name! })) },
      { l: "Remotion AI", ic: OIC.ai, run: () => osActions.askAI(one!) },
      { l: t("browser"), ic: OIC.share, run: () => toast(t("opened", { x: one!.name! })) },
    ] } as MenuItem] : []),
    { l: t("fmShare"), ic: OIC.share, run: () => { navigator.clipboard?.writeText(`https://remotion.io/s/${(one || nodes[0]).id}`).catch(() => {}); toast(t("fmLinkCopied")); } },
    ...(nodes.some((n) => n.type === "doc") ? [{ l: t("fmDownload"), ic: OIC.dl, run: () => toast(t("fmDlPreview")) } as MenuItem] : []),
    "-",
    ...(one && one.type !== "app" ? [{ l: t("fmRename"), ic: OIC.ren, kbd: "F2", run: () => ctx.rename(one) } as MenuItem] : []),
    { l: t("fmMoveTo"), ic: OIC.move, sub: dests.map((x) => ({ l: x.l, ic: x.dest.root === "desktop" ? OIC.desk : OIC.folder, run: () => fsMove(nodes, x.dest, api.add, moveLabel, toast) })) },
    { l: t("fmCopy"), ic: OIC.copy, kbd: "Ctrl+C", run: () => ctx.copy(false) },
    { l: t("fmCut"), ic: OIC.cut, kbd: "Ctrl+X", run: () => ctx.copy(true) },
    { l: t("fmDuplicate"), ic: OIC.dup, kbd: "Ctrl+D", run: () => ctx.dup() },
    { l: fav ? t("fmRmFav") : t("fmAddFav"), ic: fav ? OIC.starF : OIC.star, run: () => { const v = !nodes.every((n) => n.fav); useShell.getState().mutate(() => { nodes.forEach((n) => (n.fav = v)); }, { save: true, fs: true }); fmRefresh(); } },
    "-",
    { l: t("fmDelete"), ic: OIC.del, danger: true, kbd: t("fmDel"), run: () => ctx.del() },
    "-",
    { l: t("fmInfo"), ic: OIC.info, kbd: "Ctrl+I", run: () => ctx.info(one || nodes[0]) },
  ];
}
/* ---------- icon menu (osIconMenu, L11921) ---------- */
export function osIconMenu(api: LayerApi, x: number, y: number, it: Item) {
  const st = useShell.getState();
  // v56 (L21064): app icons get App mode / Full screen / Pop-out after "Open", unless part of a multi-selection.
  const solo = it.type === "app" && !(st.sel.size > 1 && st.sel.has(it.id)) ? iconSoloRows(it.app) : [];
  if (!st.sel.has(it.id)) st.setSel([it.id]);
  const sel = useShell.getState().sel; const nodes = (st.desks[st.cur].items ?? []).filter((n) => sel.has(n.id));
  const rows = itemMenuItems(api, nodes, {
    root: "desktop", path: [], open: (n) => api.open(n), rename: (n) => api.rename(n.id),
    copy: (cut) => { FM.clip = null; api.copy(cut); }, dup: api.duplicate, del: () => api.del([...useShell.getState().sel]),
    info: (n) => osActions.files(null, { root: "desktop", path: [], sel: n.id }),
  });
  if (solo.length) rows.splice(1, 0, ...solo);
  osMenu(x, y, rows);
}

/* ---------- desktop background menu (osDeskMenu, L11893) ---------- */
export function osDeskMenu(api: LayerApi, x: number, y: number) {
  const { t, nf } = api; const at = api.cellAt(x, y);
  const mk = (name: string, type: Item["type"], extra: Partial<Item> = {}) => () => { const it = api.add({ id: "", type, name, mod: Date.now(), size: 0, ...extra }, at[0], at[1], true); if (it) setTimeout(() => api.rename(it.id), 140); };
  const appsSub = (): MenuItem[] => [{
    node: <div className="os-apps">{AL_APPS.filter((a) => alInst(a[0])).map(([k]) => <button key={k} type="button" data-app={k} title={appName(t, k)} aria-label={appName(t, k)}><Glyph it={{ id: "", type: "app", app: k }} /><span>{appName(t, k)}</span></button>)}</div>,
    onHtmlClick: (el) => { const a = el.closest<HTMLElement>("[data-app]"); if (!a) return false; osMenuCloseAll(); api.add({ id: "", type: "app", app: a.dataset.app }, at[0], at[1]); return true; },
  }];
  const fileSub = (): MenuItem[] => {
    const L: Item[] = []; fsEach((n, _l, root) => { if (n.type === "doc" && root !== "desktop" && L.length < 10) L.push(n); });
    return L.map((n) => ({
      node: <button type="button" className="os-fsc" data-fsc={n.id}><span className="ic"><Glyph it={n} size={18} xs /></span><span className="lb">{n.name}</span></button>,
      onHtmlClick: (el) => { const f = el.closest<HTMLElement>("[data-fsc]"); if (!f || f.dataset.fsc !== n.id) return false; const r = fsFind(n.id); osMenuCloseAll(); if (r) api.add({ id: "", type: r.node.type, name: r.node.name, ref: r.node.id, sc: 1, size: r.node.size, mod: r.node.mod }, at[0], at[1]); return true; },
    }));
  };
  const v = () => useShell.getState().dkView;
  osMenu(x, y, [
    { l: t("cmView"), sub: () => { const st = useShell.getState(); return [
      { l: t("vLarge"), check: v().size === "l", run: () => dkSetSize("l") }, { l: t("vMedium"), check: v().size === "m", run: () => dkSetSize("m") }, { l: t("vSmall"), check: v().size === "s", run: () => dkSetSize("s") }, "-",
      { l: t("vIcons"), check: v().icons, run: () => dkSetIcons(!v().icons) },
      { l: t("vSidebar"), check: !st.iconsHidden, run: () => osSidebar(useShell.getState().iconsHidden, t) },
      { l: t("vWidgets"), check: !!st.desks[st.cur].w, run: () => toggleWidgets(!useShell.getState().desks[useShell.getState().cur].w) },
    ]; } },
    { l: t("cmSort"), sub: [{ l: t("sName"), run: () => api.sort("name") }, { l: t("sType"), run: () => api.sort("type") }, { l: t("sSize"), run: () => api.sort("size") }, { l: t("sDate"), run: () => api.sort("date") }] },
    { l: t("cmAlign"), check: v().align, run: () => alignToggle() },
    { l: t("cmRefresh"), run: api.refresh },
    "-",
    { l: t("cmNew"), sub: () => [
      { l: t("nFolder"), ic: OIC.folder, run: mk(t("dkUntitledFolder"), "folder", { kids: [] }) },
      { l: t("nAppShortcut"), ic: OIC.appSc, sub: appsSub }, { l: t("nFileShortcut"), ic: OIC.fileSc, sub: fileSub }, "-",
      { l: t("nText"), ic: OIC.txt, run: mk(t("untitledTxt") + ".txt", "doc") }, { l: t("nDoc"), ic: OIC.doc, run: mk(t("dkUntitledDoc") + ".docx", "doc") },
      { l: t("nSheet"), ic: OIC.sheet, run: mk(t("dkUntitledSheet") + ".xlsx", "doc") }, { l: t("nSlides"), ic: OIC.slides, run: mk(t("untitledSlides") + ".pptx", "doc") },
    ] },
    "-",
    // FM.clip (Files app) wins over the desktop clipboard; fmPasteTo arrives with the Files app (B-15).
    { l: t("cmPaste"), ic: OIC.paste, kbd: "Ctrl+V", disabled: !api.hasClip() && !FM.clip, run: () => { if (FM.clip) fmPasteTo({ root: "desktop", desk: useShell.getState().cur, path: [] }, at); else api.paste(at); } },
    "-",
    { l: t("cmTerminal"), ic: OIC.term, run: () => osActions.terminal() },
    "-",
    { l: t("cmWallpaper"), ic: OIC.wall, sub: () => [{ node: <WallSwatches t={t} nf={nf} />, onHtmlClick: (el) => { const w = el.closest<HTMLElement>("[data-wp]"); if (!w) return false; setDeskWall(useShell.getState().cur, +w.dataset.wp!); return true; } }] },
    { l: t("cmDisplay"), ic: OIC.disp, run: () => osActions.sysMenu(true, "appearance") },
  ]);
  function alignToggle() { alignHook?.(!v().align); }
}
/** The layer registers how to apply alignment with its live geometry. */
let alignHook: ((on: boolean) => void) | null = null;
export const setAlignHook = (fn: ((on: boolean) => void) | null) => { alignHook = fn; };

function WallSwatches({ t, nf }: { t: T; nf: (n: number) => string }) {
  const s = useShell((st) => st.desks[st.cur]?.s ?? 0);
  return <div className="os-wps" role="radiogroup">{scenes.map((_, k) => <button key={k} type="button" role="radio" data-wp={k} aria-checked={s === k} aria-label={t("dskWallN", { n: nf(k + 1) })}><canvas data-wpc={k} width={80} height={50}></canvas></button>)}</div>;
}

/* ---------- osRefreshDesk (L11931) ---------- */
export function osRefreshDesk(t: T) {
  const wall = document.getElementById("wall");
  if (wall && !reducedMotion()) wall.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.12)" }, { filter: "brightness(1)" }], { duration: 600, easing: "ease-in-out" });
  useShell.setState((s) => ({ iconEpoch: s.iconEpoch + 1, iconAnim: 1 }));
  useShell.getState().showToast(t("refreshed"));
}
