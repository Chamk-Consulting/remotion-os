/** Shared state of the switcher (v80) and the window overview (v84): each one closes the other (v89). */
import type { Win } from "@/os/windows/wm";
export const SW: { el: HTMLElement | null; list: Win[]; i: number; open: boolean; alt: boolean; prev: HTMLElement | null; picking: boolean } = { el: null, list: [], i: 0, open: false, alt: false, prev: null, picking: false };
export const XP: { open: boolean; panel: boolean; close?: (pick: Win | null, instant?: boolean) => void } = { open: false, panel: false };
