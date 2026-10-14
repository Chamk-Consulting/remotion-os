/**
 * Virtual file system walk / find / move (L11795–L11803, L12109–L12124) over the shell store.
 * Desktops are containers like the six roots, exactly as in the source.
 */
import { useShell } from "@/os/state/shell";
import type { FsData, Item } from "./model";

export const FS_ROOTS = ["documents", "downloads", "images", "videos", "music", "shared"] as const;
export type FsRoot = (typeof FS_ROOTS)[number];
export type FsLoc = { node: Item; list: Item[]; root: string; desk: number; path: Item[] };
export type FsDest = { root: string; desk?: number; path?: string[]; at?: [number, number] };

/** Files-app clipboard (FM.clip, L12014). Stays null until the Files app is ported (B-15); read by the desktop Paste row. */
export const FM: { clip: { ids: string[]; cut: boolean } | null } = { clip: null };

/** Source fsEach: desktops first (in order), then the roots; returning false stops the walk. */
export function fsEach(cb: (n: Item, list: Item[], root: string, desk: number, path: Item[]) => boolean | void) {
  const st = useShell.getState();
  const walk = (list: Item[], root: string, desk: number, path: Item[]): boolean | void => {
    for (const n of list) { if (cb(n, list, root, desk, path) === false) return false; if (n.type === "folder" && n.kids && walk(n.kids, root, desk, [...path, n]) === false) return false; }
  };
  for (let i = 0; i < st.desks.length; i++) if (walk(st.desks[i].items || [], "desktop", i, []) === false) return;
  for (const r of FS_ROOTS) if (walk((st.fs as FsData)[r] || [], r, -1, []) === false) return;
}
export function fsFind(id: string): FsLoc | null {
  let res: FsLoc | null = null;
  fsEach((node, list, root, desk, path) => { if (node.id === id) { res = { node, list, root, desk, path }; return false; } });
  return res;
}
export function fsStrip(n: Item): Item { const c = { ...n }; delete c.c; delete c.r; delete c.fx; delete c.fy; return c; }

const FM_NAV_KEYS: Record<string, string> = { home: "fmHome", desktop: "fmDesktop", documents: "fmDocs", downloads: "fmDownloads", images: "fmImages", videos: "fmVideos", music: "fmMusic", shared: "fmShared", recent: "fmRecent", trash: "fmTrash" };
export const fmRootKey = (r: string) => FM_NAV_KEYS[r] || "fmHome";

/**
 * Source fsMove. `addToDesk` is the desktop layer's dkAdd (places on the current desktop at the nearest free cell).
 * Returns the toast label (or null when nothing moved); the caller shows the toast unless `quiet`.
 */
export function fsMove(nodes: Item[], dest: FsDest, addToDesk: (it: Item, c: number, r: number, quiet?: boolean) => unknown, label: (d: FsDest) => string, toast: (msg: string) => void, quiet?: boolean) {
  const st = useShell.getState(); const moved: Item[] = [];
  for (const n of nodes) {
    const f = fsFind(n.id); if (!f) continue;
    if (dest.path?.length && n.type === "folder") { const tgt = fsFind(dest.path[dest.path.length - 1]); if (tgt && (tgt.node === n || tgt.path.includes(n))) continue; }
    const i = f.list.indexOf(f.node); if (i < 0) continue; f.list.splice(i, 1); moved.push(f.node);
  }
  if (!moved.length) return;
  const cur = st.cur;
  if (dest.root === "desktop" && !dest.path?.length) {
    const d = dest.desk ?? cur;
    if (d === cur) { st.mutate(() => {}, { save: true, fs: true }); moved.forEach((n, k) => addToDesk(fsStrip(n), dest.at?.[0] ?? 0, (dest.at?.[1] ?? 0) + k, true)); }
    else st.mutate((s) => { s.desks[d].items = s.desks[d].items || []; moved.forEach((n) => s.desks[d].items!.push({ ...fsStrip(n), c: null, r: null })); }, { save: true, fs: true });
  } else {
    st.mutate((s) => {
      let L: Item[];
      if (dest.root === "desktop") { L = s.desks[dest.desk ?? cur].items!; for (const id of dest.path || []) { const n = L.find((x) => x.id === id); if (!n) break; L = n.kids = n.kids || []; } }
      else { const fs = s.fs as FsData; L = fs[dest.root as FsRoot] = fs[dest.root as FsRoot] || []; for (const id of dest.path || []) { const n = L.find((x) => x.id === id); if (!n) break; L = n.kids = n.kids || []; } }
      moved.forEach((n) => L.push(fsStrip(n)));
    }, { save: true, fs: true });
  }
  useShell.getState().setSel([]);
  if (!quiet) toast(label(dest));
}
