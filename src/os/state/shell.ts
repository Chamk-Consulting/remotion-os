"use client";
/**
 * Shell store (ADR-05): replaces the source singletons `isDark`, `themeMode`, `desks`, `cur`, `workspaces`, `selWs` and the
 * open/closed flags of the shell menus. Persistence uses the SAME keys and shapes as the source (doc 06 #2, #11).
 */
import { create } from "zustand";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage/keys";
import { scenes } from "@/os/shell/wallpaper";

export type Desk = { n: string; s: number; items?: unknown[]; w?: boolean; _id?: string };
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
  iconsHidden: boolean; widgetsHidden: boolean;
  toast: { msg: string; n: number; undo?: () => void } | null;
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
  iconsHidden: false, widgetsHidden: false,
  toast: null,
  init: () => {
    if (get().booted) return;
    const { desks, cur } = loadDesks(); const th = loadTheme();
    let railOn = false; try { railOn = localStorage.getItem(STORAGE_KEYS.rail) === "1"; } catch {}
    set({ booted: true, desks, cur, isDark: th.dark, themeMode: th.mode, wsOpen: innerWidth >= 860, iconsHidden: !railOn, widgetsHidden: desks[cur]?.w === false });
  },
  setTheme: (dark) => { document.documentElement.classList.toggle("dark", dark); document.documentElement.classList.toggle("light", !dark); set({ isDark: dark }); },
  setThemeMode: (m) => { try { if (m === "auto") localStorage.removeItem(STORAGE_KEYS.theme); else localStorage.setItem(STORAGE_KEYS.theme, m); } catch {} set({ themeMode: m }); },
  setWs: (open) => set({ wsOpen: open }),
  setLangMenu: (open) => set({ langOpen: open }),
  setDesksOpen: (open) => set({ desksOpen: open }),
  selectWs: (i) => set({ selWs: i }),
  addWs: () => { const w = { n: get().workspaces.length + 1 }; set({ workspaces: [...get().workspaces, w] }); return w; },
  // Source closeAll (L7972): ws, lang, desks (+ kb/sys/search/nc/account menus once ported).
  closeAll: () => set({ wsOpen: false, langOpen: false, desksOpen: false }),
  showToast: (msg, undo) => set({ toast: { msg, n: (get().toast?.n ?? 0) + 1, undo } }),
  hideToast: () => set({ toast: null }),
  saveDesks: () => { const { desks, cur } = get(); writeJSON(STORAGE_KEYS.desks, { l: desks, c: cur }); },
}));
