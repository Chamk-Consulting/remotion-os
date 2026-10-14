/**
 * Shortcut catalogue (L8523–L8575) — data extracted from the source by tools/extract-shell-data.mjs — plus the two later
 * source patches applied in script order: dMoveNext/dMovePrev get their action (L20905) and two display rows join
 * "Windows" (L21063). Combos are physical keys; labels translate.
 */
import raw from "./data.json";
import { readJSON, writeJSON } from "@/lib/storage/keys";

export type ScRow = [label: string, combo: string, act?: string | null, display?: 1];
export type ScCat = { id: string; ic: string; c: string; rows: ScRow[] };
export const SC_CATS: ScCat[] = JSON.parse(JSON.stringify(raw.SC_CATS));
SC_CATS.forEach((c) => c.rows.forEach((r) => { if ((r[0] === "dMoveNext" || r[0] === "dMovePrev") && !r[2]) r[2] = r[0]; }));
{ const c = SC_CATS.find((x) => x.id === "catWin"); if (c) c.rows.push(["os_solo", "Ctrl+Shift+Enter", null, 1], ["os_fsApp", "Ctrl+Alt+Enter", null, 1]); }

export const CAT_IC = raw.CAT_IC as Record<string, string>;
export const MI = raw.MI as Record<string, string>;
export const SI = { ...(raw.SI as Record<string, string>) };
export const PI = raw.PI as Record<string, string>;
const KEYTXT = raw.KEYTXT as Record<string, string>;

type T = (k: string, v?: Record<string, string | number>) => string;
/** comboKeys: "Ctrl+Alt+ArrowRight" → ["Ctrl", "Alt", "→"] (Ctrl label translated); "↑ ↓" → ["↑", "↓"]. */
export const comboKeys = (combo: string, t: T) => (combo.includes("+") ? combo.split("+").map((k) => (k === "Ctrl" ? t("kbCtrl") : KEYTXT[k] || k)) : combo.split(" "));
export type Combo = { ctrl: boolean; alt: boolean; shift: boolean; win: boolean; code: string };
export function parseCombo(c: string): Combo {
  const p = c.split("+"), k = p[p.length - 1];
  return { ctrl: p.includes("Ctrl"), alt: p.includes("Alt"), shift: p.includes("Shift"), win: p.includes("Win"),
    code: /^[A-Z]$/.test(k) ? "Key" + k : /^Digit|^Arrow|^(Comma|Slash|Backquote|Equal|Minus|Tab|Enter|Backspace|Period|Semicolon)$/.test(k) ? k : /^\d$/.test(k) ? "Digit" + k : k };
}
export const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
export function comboMatches(c: Combo, e: KeyboardEvent) {
  let ctrl = e.ctrlKey, win = e.metaKey;
  if (isMac() && !c.win && e.metaKey && !e.ctrlKey) { ctrl = true; win = false; }
  return c.ctrl === ctrl && c.alt === e.altKey && c.shift === e.shiftKey && c.win === win && c.code === e.code;
}
export function comboFromEvent(e: KeyboardEvent) {
  if (["Control", "Alt", "Shift", "Meta", "OS"].includes(e.key)) return null;
  const parts: string[] = []; if (e.ctrlKey) parts.push("Ctrl"); if (e.metaKey) parts.push("Win"); if (e.altKey) parts.push("Alt"); if (e.shiftKey) parts.push("Shift");
  let k = e.code; if (k.startsWith("Key")) k = k.slice(3); else if (/^Digit\d$/.test(k)) k = k.slice(5);
  parts.push(k); return parts.join("+");
}
/* custom shortcuts (`remotion-custom-sc`) */
export type Custom = { label: string; act: string | null; combo: string };
export const custom: { list: Custom[] } = { list: [] };
export const loadCustom = () => { custom.list = readJSON<Custom[]>("remotion-custom-sc", []); };
export const saveCustom = () => writeJSON("remotion-custom-sc", custom.list);
export type Row = { label: string; combo: string; act?: string | null; display?: boolean; custom?: number; cat: string };
export const allRows = (): Row[] => [
  ...SC_CATS.flatMap((c) => c.rows.map((r) => ({ label: r[0], combo: r[1], act: r[2], display: !!r[3], cat: c.id }))),
  ...custom.list.map((r, i) => ({ label: r.label, combo: r.combo, act: r.act, custom: i, cat: "catCustom" })),
];
/** norm (L8241): accent-insensitive lower case. */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
