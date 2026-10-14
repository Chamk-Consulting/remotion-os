/**
 * OS-level entry points that other surfaces call (source globals osFiles, osTerminal, osLauncher, openAI, dkAskAI, setSysMenu).
 * Each surface registers its implementation when it is ported. Until then a call is recorded as PENDING
 * (event `remotion:pending`) instead of faking the behaviour — see doc 15 "pending entry points".
 * The live routes still run the legacy bridge, where all of these work.
 */
import type { Item } from "@/os/desktop/model";

export type FilesLoc = { root: string; path: string[]; sel?: string };
type Actions = {
  files: (from?: Element | null, loc?: FilesLoc) => void;
  terminal: (from?: Element | null) => void;
  launcher: (from?: Element | null) => void;
  ai: () => void;
  askAI: (it: Item) => void;
  sysMenu: (open: boolean, view?: string) => void;
  /** Lock screen, restart / shut down (power screen), on-screen keyboard — ported with B-09 / B-13. */
  lock: () => void; restart: () => void; shutdown: () => void; vkb: () => void;
  /** Sign-in screen (optionally "add account"), sign out (B-09) and the keyboard menu (B-13). */
  signin: (add?: boolean) => void; signout: () => void; kbMenu: (open: boolean) => void;
};
const pending = (name: string) => (...args: unknown[]) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("remotion:pending", { detail: { name, args: args.map((a) => (a instanceof Element ? a.tagName : a)) } }));
};
export const osActions: Actions = {
  files: pending("files"), terminal: pending("terminal"), launcher: pending("launcher"),
  ai: pending("ai"), askAI: pending("askAI"), sysMenu: pending("sysMenu"),
  lock: pending("lock"), restart: pending("restart"), shutdown: pending("shutdown"), vkb: pending("vkb"),
  signin: pending("signin"), signout: pending("signout"), kbMenu: pending("kbMenu"),
};
export function registerOsAction<K extends keyof Actions>(k: K, fn: Actions[K]) { osActions[k] = fn; }
