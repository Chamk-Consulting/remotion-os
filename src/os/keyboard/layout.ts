/**
 * On-screen keyboard key model (source L8005–L8114): tables extracted from the source by tools/extract-kb-data.mjs,
 * buildKeys, charFor, keyLabel (HTML, as the source renders it) and keyAria.
 */
import raw from "./data.json";

type Pair = [string, string];
export const KB = raw.KB as unknown as Record<string, { rows: string[][]; extra: Pair[][] }>;
export const LAYOUT_FOR = raw.LAYOUT_FOR as Record<string, string>;
export const VAR = raw.VAR as Record<string, string[]>;
export const WORDS = raw.WORDS as Record<string, string[]>;
export const ICON = raw.ICON as Record<string, string>;
const { NUM, NUMS, FN, NUMC, R1C, R2C, R3C } = raw as unknown as Record<string, string[]>;

export type Mods = { shift: boolean; caps: boolean; ctrl: boolean; alt: boolean; altgr: boolean; fn: boolean; autoShift?: boolean };
export type Key = { i: number; t: string; cls?: string; w?: number; code?: string; letter?: boolean; base?: string; shiftOut?: string; fn?: string };
export type Group = { group: "arrows"; w: number; keys: Key[] };
export type Row = (Key | Group)[];

export const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export const layoutName = (l: string, t: (k: string) => string) => (l === "arabic" ? t("arabicLayout") : l.toUpperCase());

const cache = new Map<string, { rows: Row[]; keys: Key[] }>();
/** buildKeys (L8051). Pure in (layout, padMode); cached so handlers and render share one key list. */
export function buildKeys(layout: string, pad: boolean) {
  const id = pad ? "pad" : layout; const hit = cache.get(id); if (hit) return hit;
  const KEYS: Key[] = [], ROWS: Row[] = [];
  const mk = (o: Omit<Key, "i">): Key => { const k = { ...o, i: KEYS.length } as Key; KEYS.push(k); return k; };
  if (pad) {
    const ch = (c: string, code?: string) => mk({ t: "char", base: c, shiftOut: c, code });
    ROWS.push([ch("7", "Digit7"), ch("8", "Digit8"), ch("9", "Digit9"), ch("/", "Slash"), mk({ t: "bksp", cls: "mod", code: "Backspace" })]);
    ROWS.push([ch("4", "Digit4"), ch("5", "Digit5"), ch("6", "Digit6"), ch("*"), ch("-", "Minus")]);
    ROWS.push([ch("1", "Digit1"), ch("2", "Digit2"), ch("3", "Digit3"), ch("+"), ch("%")]);
    ROWS.push([mk({ t: "abc", cls: "mod" }), ch("0", "Digit0"), ch(".", "Period"), ch(",", "Comma"), mk({ t: "enter", cls: "enter", code: "Enter" })]);
  } else {
    const L = KB[layout];
    const letters = (row: string[], codes: string[]) => row.map((c, j) => mk({ t: "char", letter: true, base: c, code: codes[j] }));
    const extras = (list: Pair[], codes: string[], off: number) => list.map((p, j) => mk({ t: "char", base: p[1], shiftOut: p[0], code: codes[off + j] }));
    ROWS.push([mk({ t: "esc", w: 1.3, cls: "mod", code: "Escape" }), ...NUM.map((c, j) => mk({ t: "char", base: c, shiftOut: NUMS[j], fn: FN[j], code: NUMC[j] })), mk({ t: "bksp", w: 1.3, cls: "mod", code: "Backspace" })]);
    ROWS.push([mk({ t: "tab", w: 1.6, cls: "mod", code: "Tab" }), ...letters(L.rows[0], R1C), ...extras(L.extra[0], R1C, L.rows[0].length)]);
    ROWS.push([mk({ t: "caps", w: 1.9, cls: "mod caps", code: "CapsLock" }), ...letters(L.rows[1], R2C), ...extras(L.extra[1], R2C, L.rows[1].length), mk({ t: "enter", w: 1.9, cls: "enter", code: "Enter" })]);
    ROWS.push([mk({ t: "shift", w: 2.3, cls: "mod", code: "ShiftLeft" }), ...letters(L.rows[2], R3C), ...extras(L.extra[2], R3C, L.rows[2].length), mk({ t: "shift", w: 2.3, cls: "mod", code: "ShiftRight" })]);
    ROWS.push([mk({ t: "ctrl", w: 1.15, cls: "mod", code: "ControlLeft" }), mk({ t: "fn", w: 1.15, cls: "mod k-fn" }), mk({ t: "win", w: 1.15, cls: "mod k-win", code: "MetaLeft" }), mk({ t: "alt", w: 1.15, cls: "mod", code: "AltLeft" }), mk({ t: "space", w: 6, code: "Space" }), mk({ t: "altgr", w: 1.15, cls: "mod k-altgr", code: "AltRight" }), mk({ t: "hide", w: 1.15, cls: "mod" }),
      { group: "arrows", w: 3.2, keys: [mk({ t: "left", code: "ArrowLeft" }), mk({ t: "up", code: "ArrowUp" }), mk({ t: "down", code: "ArrowDown" }), mk({ t: "right", code: "ArrowRight" })] }]);
  }
  const out = { rows: ROWS, keys: KEYS }; cache.set(id, out); return out;
}

/** charFor (L8080). */
export function charFor(k: Key, st: Mods, locale: string) {
  if (st.fn && k.fn) return k.fn;
  if (k.letter) { let c = k.base!; if (st.altgr && VAR[c]) c = VAR[c][0]; return st.shift !== st.caps ? c.toLocaleUpperCase(locale) : c; }
  return st.shift && k.shiftOut ? k.shiftOut : k.base!;
}
/** keyLabel (L8085): the key's inner HTML. */
export function keyLabel(k: Key, st: Mods, locale: string, kbLang: string, t: (k: string) => string) {
  switch (k.t) {
    case "char":
      if (st.fn && k.fn) return `<span>${esc(k.fn)}</span>`;
      if (k.letter) { let c = k.base!; if (st.altgr && VAR[c]) c = VAR[c][0]; return `<span>${esc(c.toLocaleUpperCase(locale))}</span>`; }
      if (k.shiftOut && k.shiftOut !== k.base) return `<span class="alt">${esc(k.shiftOut)}</span><span>${esc(k.base!)}</span>`;
      return `<span>${esc(k.base!)}</span>`;
    case "esc": return t("kbEsc"); case "tab": return t("kbTab"); case "enter": return t("kbEnter"); case "shift": return t("kbShift"); case "ctrl": return t("kbCtrl");
    case "caps": return `<span class="dotc"></span><span>${t("kbCaps")}</span>`;
    case "fn": return "Fn"; case "alt": return "Alt"; case "altgr": return "Alt Gr"; case "abc": return t("kbAbc");
    case "space": return `<span>${t("kbSpace")}</span><span class="lay">${kbLang.toUpperCase()}</span>`;
    default: return ICON[k.t] || "";
  }
}
/** keyAria (L8099). */
export const keyAria = (k: Key, st: Mods, locale: string, t: (k: string) => string): string | null =>
  k.t === "char" ? charFor(k, st, locale) : ({ bksp: "Backspace", win: t("start"), hide: t("kbHide"), left: "Left", right: "Right", up: "Up", down: "Down", fn: "Fn", alt: "Alt", altgr: "Alt Gr", space: t("kbSpace") } as Record<string, string>)[k.t] || null;
