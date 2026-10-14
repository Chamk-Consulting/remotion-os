"use client";
/**
 * Shell store (ADR-05): replaces the source singletons `isDark`, `themeMode`, `desks`, `cur`, `workspaces`, `selWs` and the
 * open/closed flags of the shell menus. Persistence uses the SAME keys and shapes as the source (doc 06 #2, #11).
 */
import { create } from "zustand";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage/keys";
import { scenes } from "@/os/shell/wallpaper";
import { AL_DEFAULT, APP_SEEDS, seedApp, seedFs, seedV1, seedV2, type AppStore, type FsData, type Item, type TrashItem, type Flags } from "@/os/desktop/model";
import { translate } from "@/lib/i18n/core";
import { isLang } from "@/lib/i18n/langs";

export type Desk = { n: string; s: number; items?: Item[]; w?: boolean; _id?: string };
export type DkView = { size: "s" | "m" | "l"; align: boolean; icons: boolean };
export type Workspace = { k?: string; n?: number };
type ThemeMode = "light" | "dark" | "auto";

/** Source L7746–L7748: defaults + sanitising load of `remotion-desks`. */
function loadDesks(): { desks: Desk[]; cur: number } {
  let desks: Desk[] = [{ n: "", s: 0 }, { n: "", s: 1 }, { n: "", s: 2 }], cur = 0;
  const d = readJSON<{ l?: Desk[]; c?: number } | null>(STORAGE_KEYS.desks, null);
  if (d && Array.isArray(d.l) && d.l.length) {
    desks = d.l.slice(0, 12).map((x) => ({ n: String(x.n || "").slice(0, 32), s: Math.abs(+x.s || 0) % scenes.length, items: Array.isArray(x.items) ? x.items : undefined, w: typeof x.w === "boolean" ? x.w : undefined }));
    cur = Math.max(0, Math.min(+(d.c ?? 0) || 0, desks.length - 1));
  }
  return { desks, cur };
}
/** Source L10418–L10422 */
function loadTheme(): { mode: ThemeMode; dark: boolean } {
  let saved: string | null = null; try { saved = localStorage.getItem(STORAGE_KEYS.theme); } catch {}
  const mode: ThemeMode = saved === "light" || saved === "dark" ? saved : "auto";
  return { mode, dark: mode === "auto" ? systemDark() : mode === "dark" };
}
export const systemDark = () => { const h = document.documentElement.getAttribute("data-theme"); return h ? h === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };

type ShellState = {
  booted: boolean;
  isDark: boolean; themeMode: ThemeMode;
  desks: Desk[]; cur: number;
  workspaces: Workspace[]; selWs: number;
  wsOpen: boolean; langOpen: boolean; desksOpen: boolean;
  /** System (gear) menu, its requested sub-view (setSysMenu(true, view)), search palette, shortcuts panel, hidden top bar. */
  sysOpen: boolean; sysView: { v: string; n: number } | null; palOpen: boolean; scOpen: boolean; navHidden: boolean;
  iconsHidden: boolean; widgetsHidden: boolean;
  toast: { msg: string; n: number; undo?: () => void } | null;
  /* desktop layer (B-08) */
  trash: TrashItem[]; dkView: DkView; fs: FsData; apps: AppStore; sel: Set<string>; rev: number;
  /** Desktop whose icons the layer currently shows; lags `cur` by the slide delay like the source's dkSwitch (L11328). */
  shownDesk: number; iconAnim: number;
  /** Desktop whose wallpaper is painted on #wall (lags `cur` during the reduced-motion fade, L7814). */
  wallDesk: number;
  /** OSX.store: each workspace's desktops `{l, c}` (persisted in `remotion-ws-desks`, L20844). */
  wsStore: Record<string, { l: Desk[]; c: number }>;
  /** OSX.ws: the workspace whose desktops are loaded. */
  osxWs: number | null;
  /** Bumped by delayed re-layouts (sidebar/widgets transitions, view size) — source `setTimeout(()=>{dkGeom();dkFix();dkPlace(true)})`. */
  layoutTick: number;
  /** Bumped by renderIcons(true) (refresh): remounts the icons so their entrance animation replays. */
  iconEpoch: number;
  /** Runs `fn` on the live objects (ported source code mutates in place), then publishes a new revision. */
  mutate: (fn: (st: ShellState) => void, opts?: { save?: boolean; trash?: boolean; fs?: boolean; apps?: boolean }) => void;
  setSel: (ids: string[], add?: boolean) => void;
  init: () => void;
  setTheme: (dark: boolean) => void; setThemeMode: (m: ThemeMode) => void;
  setWs: (open: boolean) => void; setLangMenu: (open: boolean) => void; setDesksOpen: (open: boolean) => void;
  selectWs: (i: number) => void; addWs: () => Workspace;
  closeAll: () => void;
  showToast: (msg: string, undo?: () => void) => void; hideToast: () => void;
  saveDesks: () => void;
};

export const useShell = create<ShellState>((set, get) => ({
  booted: false,
  isDark: false, themeMode: "auto",
  desks: [{ n: "", s: 0 }, { n: "", s: 1 }, { n: "", s: 2 }], cur: 0,
  workspaces: [{ k: "mainWorkspace" }, { k: "development" }, { k: "design" }, { k: "research" }, { k: "personal" }], selWs: 0,
  // Source: #wsMenu is open in the markup and closed at boot only below 860 px (L27215, defect/intent U-07 reproduced).
  wsOpen: true, langOpen: false, desksOpen: false,
  sysOpen: false, sysView: null, palOpen: false, scOpen: false, navHidden: false,
  iconsHidden: false, widgetsHidden: false,
  toast: null,
  trash: [], dkView: { size: "m", align: true, icons: true }, fs: {} as FsData, apps: AL_DEFAULT, sel: new Set(), rev: 0, shownDesk: 0, iconAnim: 1, wallDesk: 0, layoutTick: 0, iconEpoch: 0, wsStore: {}, osxWs: null,
  mutate: (fn, opts = { save: true }) => {
    const st = get(); fn(st);
    if (opts.save !== false) writeJSON(STORAGE_KEYS.desks, { l: st.desks, c: st.cur });
    if (opts.trash) writeJSON(STORAGE_KEYS.trash, st.trash);
    if (opts.fs) writeJSON(STORAGE_KEYS.fs, st.fs);
    if (opts.apps) writeJSON(STORAGE_KEYS.apps, st.apps);
    set({ desks: [...st.desks], trash: [...st.trash], rev: st.rev + 1, iconAnim: 0 });
  },
  setSel: (ids, add) => { const sel = add ? new Set(get().sel) : new Set<string>(); ids.forEach((i) => sel.add(i)); set({ sel }); },
  init: () => {
    if (get().booted) return;
    const { desks, cur } = loadDesks(); const th = loadTheme();
    // Boot: `if(!keep) toggleIcons(false)` (L11935) hides the sidebar and its wrapper writes "0".
    let railOn = false; try { railOn = localStorage.getItem(STORAGE_KEYS.rail) === "1"; if (!railOn) localStorage.setItem(STORAGE_KEYS.rail, "0"); } catch {}
    // Boot-time seeds in source script order (B-08): v1 (L11272), v2 design (L11782), then each app's shortcut.
    let lang: string | null = null; try { lang = localStorage.getItem(STORAGE_KEYS.lang); } catch {}
    const L = isLang(lang) ? lang : "en"; const t = (k: string, v?: Record<string, string | number>) => translate(L, k, v);
    const flags: Flags = { has: (k) => { try { return !!localStorage.getItem(k); } catch { return false; } }, set: (k) => { try { localStorage.setItem(k, "1"); } catch {} } };
    const trash = readJSON<TrashItem[]>(STORAGE_KEYS.trash, []).slice(0, 60);
    const dkView: DkView = { size: "m", align: true, icons: true, ...readJSON<Partial<DkView>>(STORAGE_KEYS.dkView, {}) };
    const fsRaw = readJSON<FsData | null>(STORAGE_KEYS.fs, null); const fs = fsRaw && typeof fsRaw === "object" ? fsRaw : seedFs();
    const sa = readJSON<Partial<AppStore> | null>(STORAGE_KEYS.apps, null);
    const apps: AppStore = sa ? { inst: sa.inst || {}, fav: sa.fav || {}, recent: Array.isArray(sa.recent) ? sa.recent : [] } : structuredClone(AL_DEFAULT);
    seedV1(desks, t, flags); writeJSON(STORAGE_KEYS.desks, { l: desks, c: cur }); // the source saves after v1 normalisation
    if (seedV2(desks, t, flags)) writeJSON(STORAGE_KEYS.desks, { l: desks, c: cur });
    for (const sd of APP_SEEDS) { const r = seedApp(desks, apps, sd, flags); if (r.apps) writeJSON(STORAGE_KEYS.apps, apps); if (r.desks) writeJSON(STORAGE_KEYS.desks, { l: desks, c: cur }); }
    // v55 (L20851): restore the open workspace, the other workspaces' desktops and this workspace's desktop ids.
    let selWs = 0; const workspaces = [...get().workspaces]; let wsStore: Record<string, { l: Desk[]; c: number }> = {};
    const ws = readJSON<{ sel?: number; st?: Record<string, { l: Desk[]; c: number }>; n?: number } | null>(STORAGE_KEYS.wsDesks, null);
    if (ws && ws.st) {
      wsStore = ws.st; while (workspaces.length < (ws.n || 0)) workspaces.push({ n: workspaces.length + 1 });
      if (Number.isInteger(ws.sel) && ws.sel! >= 0 && ws.sel! < workspaces.length) selWs = ws.sel!;
      const mine = wsStore[selWs]; if (mine && Array.isArray(mine.l)) desks.forEach((d, i) => { if (mine.l[i] && mine.l[i]._id) d._id = mine.l[i]._id; });
    }
    desks.forEach((d) => { if (!d._id) d._id = newDeskId(); });
    set({ booted: true, workspaces, selWs, wsStore, osxWs: selWs, desks, cur, isDark: th.dark, themeMode: th.mode, wsOpen: innerWidth >= 860, iconsHidden: !railOn, widgetsHidden: !desks[cur]?.w, trash, dkView, fs, apps, shownDesk: cur, wallDesk: cur });
  },
  setTheme: (dark) => { document.documentElement.classList.toggle("dark", dark); document.documentElement.classList.toggle("light", !dark); set({ isDark: dark }); },
  setThemeMode: (m) => { try { if (m === "auto") localStorage.removeItem(STORAGE_KEYS.theme); else localStorage.setItem(STORAGE_KEYS.theme, m); } catch {} set({ themeMode: m }); },
  setWs: (open) => set({ wsOpen: open }),
  setLangMenu: (open) => set({ langOpen: open }),
  setDesksOpen: (open) => set({ desksOpen: open }),
  selectWs: (i) => set({ selWs: i }),
  addWs: () => { const w = { n: get().workspaces.length + 1 }; set({ workspaces: [...get().workspaces, w] }); return w; },
  // Source closeAll (L7972): ws, lang, desks, kb menu, sys menu, palette, notification centre, account menu.
  // (kb menu, notification centre and account menu join as they are ported: closeAllHooks.)
  closeAll: () => { set({ wsOpen: false, langOpen: false, desksOpen: false, sysOpen: false, palOpen: false }); closeAllHooks.forEach((f) => f()); },
  showToast: (msg, undo) => set({ toast: { msg, n: (get().toast?.n ?? 0) + 1, undo } }),
  hideToast: () => set({ toast: null }),
  saveDesks: () => { const { desks, cur } = get(); writeJSON(STORAGE_KEYS.desks, { l: desks, c: cur }); },
}));

/** Extra closers registered by surfaces ported later (keyboard menu, notification centre, account menu). */
export const closeAllHooks: (() => void)[] = [];
export const newDeskId = () => "d" + Math.random().toString(36).slice(2, 8);
/** osDid (L20845): a desktop's stable id, created on first use. */
export function osDid(i: number) { const d = useShell.getState().desks[i]; if (!d) return ""; if (!d._id) d._id = newDeskId(); return d._id; }
/** osWsSave (L20849). */
export function osWsSave() {
  const st = useShell.getState(); st.wsStore[st.selWs] = { l: st.desks, c: st.cur };
  writeJSON(STORAGE_KEYS.wsDesks, { sel: st.selWs, st: st.wsStore, n: st.workspaces.length });
}
/** osNewDesks (L20848): two fresh desktops for a workspace opened for the first time. */
export const osNewDesks = (wi: number): Desk[] => [{ n: "", s: (wi * 2) % scenes.length, _id: newDeskId() }, { n: "", s: (wi * 2 + 1) % scenes.length, _id: newDeskId() }];

/** Schedules a desktop re-layout after a CSS transition (`ms`), like the source's dkGeom/dkFix/dkPlace(true) timers. */
export function requestRelayout(ms: number) { setTimeout(() => useShell.setState((s) => ({ layoutTick: s.layoutTick + 1 })), ms); }

/** toggleIcons + its wrapper (L8605, L11933): sidebar visibility, persisted in `remotion-rail`. */
export function toggleIcons(force?: boolean) {
  const hidden = force === undefined ? !useShell.getState().iconsHidden : !force;
  useShell.setState({ iconsHidden: hidden });
  try { localStorage.setItem(STORAGE_KEYS.rail, hidden ? "0" : "1"); } catch {}
  requestRelayout(540);
}
/** toggleWidgets + its wrapper (L8604, L11618): per-desktop widgets flag saved with the desktops. */
export function toggleWidgets(force?: boolean) {
  const hidden = force === undefined ? !useShell.getState().widgetsHidden : !force;
  useShell.setState({ widgetsHidden: hidden });
  useShell.getState().mutate((s) => { s.desks[s.cur].w = !hidden; });
  requestRelayout(380);
}
