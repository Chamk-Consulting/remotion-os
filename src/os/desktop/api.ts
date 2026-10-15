/** Imperative desktop API used by other shell parts (menus, trash, ghost drags) — the source's global dkAdd/dkCellAt/dkSort. */
import type { Item } from "./model";
export const desktopApi: {
  add: (item: Item, c: number, r: number, quiet?: boolean) => Item | null;
  cellAt: (x: number, y: number) => [number, number];
  /** dkOpen as redefined by dkOpenTarget (L11870): used by folder windows too. */
  open: (it: Item, el: HTMLElement | null) => void;
  /** dkTargetAt / dkMark / dkHint (L11487–L11498), used by ghost drags. */
  targetAt: (x: number, y: number) => DeskTarget;
  mark: (tg: DeskTarget) => void;
  hint: (cell: [number, number] | null) => void;
} = { add: () => null, cellAt: () => [0, 0], open: () => {}, targetAt: () => null, mark: () => {}, hint: () => {} };
export type DeskTarget = { kind: "trash"; el: HTMLElement } | { kind: "folder"; el: HTMLElement; it: Item } | null;
