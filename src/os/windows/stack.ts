/**
 * Shared stacking order for OS windows (`os:<key>`) and desktop windows (`dk:<key>`).
 * The source stacks by DOM order (`shell.appendChild(el)` on focus). Moving a DOM node would reload the legacy-bridge
 * <iframe>, so windows keep a stable DOM position inside `.os-wlayer` and stack with an inline z-index instead
 * (deviation recorded in doc 15; same paint result).
 */
import { create } from "zustand";

type S = { ids: string[]; front: (id: string) => void; drop: (id: string) => void };
export const useStack = create<S>((set, get) => ({
  ids: [],
  front: (id) => { const ids = get().ids; if (ids[ids.length - 1] === id) return; set({ ids: [...ids.filter((x) => x !== id), id] }); },
  drop: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
}));
export const zOf = (ids: string[], id: string) => ids.indexOf(id) + 1;
/** `shell.lastElementChild === el` in the source. */
export const isTop = (id: string) => { const ids = useStack.getState().ids; return ids[ids.length - 1] === id; };

/**
 * D-B23 (reproduced, Chromium behaviour of the source): focusing a background window re-appends it to #shell during
 * pointerdown, and the browser then drops the click. So the first click anywhere in a window that is not on top does
 * nothing (it only brings the window forward). The React windows do not move in the DOM, so the click is dropped here.
 * Set REPRO_D_B23 to false to apply the fix once it is approved.
 */
export const REPRO_D_B23 = true;
export function bgClickGuard(id: string) {
  let swallow = false;
  return {
    /** Call in the pointerdown CAPTURE handler, before bringing the window forward. */
    down() { swallow = REPRO_D_B23 && !isTop(id); },
    /** Call in the click CAPTURE handler. Returns true when the click was dropped. */
    click(e: { stopPropagation(): void; preventDefault(): void; nativeEvent?: Event }) { if (!swallow) return false; swallow = false; e.stopPropagation(); e.preventDefault(); e.nativeEvent?.stopImmediatePropagation(); return true; },
    up() { setTimeout(() => { swallow = false; }, 0); },
  };
}
