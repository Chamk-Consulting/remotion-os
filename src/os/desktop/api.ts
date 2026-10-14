/** Imperative desktop API used by other shell parts (menus, trash, ghost drags) — the source's global dkAdd/dkCellAt/dkSort. */
import type { Item } from "./model";
export const desktopApi: {
  add: (item: Item, c: number, r: number, quiet?: boolean) => Item | null;
  cellAt: (x: number, y: number) => [number, number];
} = { add: () => null, cellAt: () => [0, 0] };
