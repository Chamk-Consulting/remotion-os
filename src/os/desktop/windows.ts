"use client";
/** Lightweight desktop windows (folder, Quick Look, trash) — state for the port of dkWin (L11462). */
import { create } from "zustand";
import { useStack } from "@/os/windows/stack";
export type DkWinSpec = { kind: "folder" | "ql"; id: string } | { kind: "trash" };
export type DkWinState = DkWinSpec & { key: string; from: DOMRect | null; n: number; z: number };
type S = { wins: DkWinState[]; z: number; open: (w: DkWinSpec, from: Element | null) => void; close: (key: string) => void; front: (key: string) => void };
export const keyOf = (w: DkWinSpec) => (w.kind === "trash" ? "trash" : (w.kind === "folder" ? "f" : "q") + w.id);
export const useDkWins = create<S>((set, get) => ({
  wins: [], z: 0,
  open: (w, from) => {
    const key = keyOf(w); const ex = get().wins.find((x) => x.key === key);
    if (ex) { get().front(key); return; }
    set({ wins: [...get().wins, { ...w, key, from: from?.getBoundingClientRect() ?? null, n: get().wins.length, z: get().z + 1 }], z: get().z + 1 });
  },
  close: (key) => set({ wins: get().wins.filter((x) => x.key !== key) }),
  front: (key) => set({ wins: get().wins.map((x) => (x.key === key ? { ...x, z: get().z + 1 } : x)), z: get().z + 1 }),
}));
// Desktop windows share the OS window stacking order (`dk:<key>`); prune entries of windows removed by any path.
useDkWins.subscribe((s, prev) => {
  const st = useStack.getState();
  s.wins.forEach((w) => { const old = prev.wins.find((x) => x.key === w.key); if (!old || old.z !== w.z) st.front("dk:" + w.key); });
  prev.wins.forEach((w) => { if (!s.wins.some((x) => x.key === w.key)) useStack.getState().drop("dk:" + w.key); });
});
export const openDkWin = (w: DkWinSpec, from: Element | null) => useDkWins.getState().open(w, from);
