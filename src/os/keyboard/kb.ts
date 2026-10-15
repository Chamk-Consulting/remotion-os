"use client";
/**
 * On-screen keyboard engine (source L8036–L8388). The keyboard edits whatever text field has focus, like the source:
 * setRangeText + a bubbling `input` event, so React-controlled inputs see the change too.
 *
 * Render state (keys, modifiers, suggestions, menu) lives in `useKb`; the `#kb` section's own classes / custom
 * properties and the `.main` lift are applied to the DOM imperatively, exactly where the source does it (React renders
 * those elements with static props, so it never overwrites them).
 *
 * Bridge note: legacy apps run in same-origin iframes, so their documents are attached with `kbAttachDoc` and their
 * fields are targets just like in the single-document source.
 */
import { flushSync } from "react-dom";
import { create } from "zustand";
import { translate } from "@/lib/i18n/core";
import { LANGS, type Lang, isLang } from "@/lib/i18n/langs";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { useShell } from "@/os/state/shell";
import { widgetsApi } from "@/os/shell/widgetsApi";
import { KB, LAYOUT_FOR, VAR, WORDS, buildKeys, charFor, esc, type Key, type Mods } from "./layout";

export type KbSet = { sugg: boolean; autoCap: boolean; dbl: boolean; hints: boolean; sound: boolean; autoHide: boolean; zoom: number; alpha: number; theme: "light" | "dark" | "auto"; pos: "dock" | "float" | "full" };
type Built = { layout: string; pad: boolean; lang: string };
type KbState = {
  open: boolean; menuOpen: boolean; set: KbSet; lang: string; follow: boolean; layout: string; auto: boolean; pad: boolean; floating: boolean;
  st: Mods; sugg: { w: string; list: string[]; rev: number }; built: Built; epoch: number;
};
const DEFAULT_SET: KbSet = { sugg: true, autoCap: true, dbl: true, hints: true, sound: false, autoHide: false, zoom: 100, alpha: 82, theme: "auto", pos: "dock" };
export const useKb = create<KbState>(() => ({
  open: false, menuOpen: false, set: { ...DEFAULT_SET }, lang: "en", follow: true, layout: "qwerty", auto: true, pad: false, floating: false,
  st: { shift: false, caps: false, ctrl: false, alt: false, altgr: false, fn: false }, sugg: { w: "", list: [], rev: 0 }, built: { layout: "qwerty", pad: false, lang: "en" }, epoch: 0,
}));
const G = () => useKb.getState();
const S = (p: Partial<KbState>) => useKb.setState(p);
const setSt = (p: Partial<Mods>) => useKb.setState((s) => ({ st: { ...s.st, ...p } }));

const appLang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
const t = (k: string, v?: Record<string, string | number>) => translate(appLang(), k, v);
const toast = (m: string) => useShell.getState().showToast(m);
const kbLocale = () => LANGS[G().lang as Lang].locale;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const kbEl = () => document.getElementById("kb") as (HTMLElement & { _rl?: ReturnType<typeof setTimeout>; _tw?: ReturnType<typeof setTimeout> }) | null;
const kbKeysEl = () => document.getElementById("kbKeys") as HTMLElement | null;

type Field = HTMLInputElement | HTMLTextAreaElement;
let target: Field | null = null, suggPage = 0;
const learned = new Map<string, number>();
const docs = new Set<Document>();

/* ---------- settings (L8040–L8049) ---------- */
export function bootKb(lang: Lang) {
  const s: Partial<KbState> = { set: { ...DEFAULT_SET } };
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEYS.kb) || "null");
    if (v) {
      const set = Object.assign({ ...DEFAULT_SET }, v.set || {}) as KbSet & { preview?: boolean; size?: unknown };
      if ("preview" in set) { set.hints = !!set.preview; delete set.preview; } delete set.size; s.set = set;
      s.follow = v.follow !== false; if (!s.follow && LANGS[v.lang as Lang]) s.lang = v.lang;
      s.auto = v.auto !== false; if (!s.auto && KB[v.layout]) s.layout = v.layout;
    }
  } catch { /* corrupt storage: defaults, like the source */ }
  S(s);
  // applyLang at boot (L27213 → L7987): only a FOLLOWING keyboard takes the app language, and only then the automatic
  // layout; a stored fixed input language with an automatic layout keeps QWERTY until the layout is picked (D-A30, reproduced).
  if (G().follow) S({ lang, layout: G().auto ? LAYOUT_FOR[lang] : G().layout });
  renderKb(); suggPage = 0; updateSugg();
  applyKbSet(); setKbPos(G().set.pos, true);
}
export function saveKb() {
  const s = G();
  try { localStorage.setItem(STORAGE_KEYS.kb, JSON.stringify({ set: s.set, lang: s.lang, follow: s.follow, layout: s.layout, auto: s.auto })); } catch { /* quota */ }
}
export function patchSet(p: Partial<KbSet>) { useKb.setState((s) => ({ set: { ...s.set, ...p } })); }
export function applyKbSet() {
  const kb = kbEl(); if (!kb) return; const set = G().set;
  kb.classList.toggle("no-sugg", !set.sugg); kb.classList.toggle("no-hints", !set.hints);
  kb.style.setProperty("--kz", String(set.zoom / 100)); kb.style.setProperty("--ka", String(set.alpha / 100));
  if (set.theme === "auto") delete kb.dataset.kbtheme; else kb.dataset.kbtheme = set.theme;
  if (G().open) requestAnimationFrame(liftForTarget);
}
let actx: AudioContext | null = null;
export function keyClick() {
  if (!G().set.sound) return;
  try {
    const W = window as Window & { webkitAudioContext?: typeof AudioContext };
    actx = actx || new (window.AudioContext || W.webkitAudioContext!)();
    const n = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(1500, n); o.frequency.exponentialRampToValueAtTime(500, n + 0.03);
    g.gain.setValueAtTime(0.06, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.05); o.connect(g).connect(actx.destination); o.start(n); o.stop(n + 0.06);
  } catch { /* no audio */ }
}

/** renderKb (L8102): the keys are rebuilt from the CURRENT layout / pad mode / input language (new elements: epoch). */
export function renderKb() { const s = G(); S({ built: { layout: s.layout, pad: s.pad, lang: s.lang }, epoch: s.epoch + 1 }); }
export const keysNow = () => { const b = G().built; return buildKeys(b.layout, b.pad).keys; };

/* ---------- text target (L8115–L8180) ---------- */
const FIELD = 'input:not([type]),input[type="text"],input[type="search"],input[type="password"],textarea';
const isField = (el: unknown): el is Field => !!el && typeof (el as Element).matches === "function" && (el as Element).matches(FIELD) && !(el as Element).closest(".kb");
const activeOf = (el: Element) => el.ownerDocument.activeElement;
/** openNoteComposer (L8120). */
export function openNoteComposer() {
  widgetsApi.openNoteComposer();
  const ni = widgetsApi.noteInput(); if (!ni) return;
  target = ni; if (G().open) ni.inputMode = "none"; ni.focus({ preventScroll: true });
}
function ensureTarget(): Field {
  if (target && target.isConnected && !target.closest("[hidden]")) { if (activeOf(target) !== target) target.focus({ preventScroll: true }); return target; }
  openNoteComposer(); return target!;
}
const fire = (el: Field) => el.dispatchEvent(new Event("input", { bubbles: true }));
function insert(text: string) { const el = ensureTarget(), s = el.selectionStart!, e2 = el.selectionEnd!; el.setRangeText(text, s, e2, "end"); fire(el); updateSugg(); }
function curWord() { if (!target) return ""; const m = target.value.slice(0, target.selectionStart!).match(/[\p{L}\p{N}\p{M}'’-]+$/u); return m ? m[0] : ""; }
function learnLastWord() { const w = curWord(); if (w.length >= 3 && !/^\d+$/.test(w)) learned.set(w, (learned.get(w) || 0) + 1); }
export function autoCap() {
  const s = G(), st = s.st;
  if (!target || st.caps || s.lang === "ar" || s.pad) return;
  if (!s.set.autoCap) { if (st.autoShift) setSt({ shift: false, autoShift: false }); return; }
  const before = target.value.slice(0, target.selectionStart!);
  const want = /^\s*$/.test(before) || /[.!?]\s+$/.test(before);
  if (want !== st.shift && (want || st.autoShift)) setSt({ shift: want, autoShift: want });
}
function typeChar(c: string) {
  const st = G().st;
  if (st.ctrl) { ctrlCombo(c.toLowerCase()); setSt({ ctrl: false }); return; }
  insert(c);
  const st2 = G().st, p: Partial<Mods> = {};
  if (st2.shift) { p.shift = false; p.autoShift = false; }
  if (st2.altgr) p.altgr = false;
  if (st2.alt) p.alt = false;
  if (Object.keys(p).length) setSt(p);
}
function ctrlCombo(c: string) {
  const el = ensureTarget();
  if (c === "a") { el.select(); return; }
  if (c === "c" || c === "x") {
    const txt = el.value.slice(el.selectionStart!, el.selectionEnd!); if (!txt) return;
    const after = () => { if (c === "x") { el.setRangeText("", el.selectionStart!, el.selectionEnd!, "end"); fire(el); } toast(t(c === "x" ? "cut" : "copied")); };
    try { navigator.clipboard.writeText(txt).then(after, after); } catch { after(); }
    return;
  }
  if (c === "v") { toast(t("pasteNo")); return; }
  if (c === "z") { el.ownerDocument.execCommand("undo"); return; }
  if (c === "y") { el.ownerDocument.execCommand("redo"); return; }
}
function backspace() {
  const el = ensureTarget(); let s = el.selectionStart!; const e2 = el.selectionEnd!;
  if (s === e2) {
    if (s === 0) return;
    if (G().st.ctrl) { const m = el.value.slice(0, s).match(/[\p{L}\p{N}\p{M}'’-]*\s*$/u)!; s -= Math.max(1, m[0].length); setSt({ ctrl: false }); }
    else { s -= 1; const cc = el.value.charCodeAt(s); if (cc >= 0xdc00 && cc <= 0xdfff && s > 0) s -= 1; }
  }
  el.setRangeText("", s, e2, "end"); fire(el); updateSugg(); autoCap();
}
function move(dir: string) {
  const el = ensureTarget(), len = el.value.length, s = el.selectionStart!, e2 = el.selectionEnd!, back = el.selectionDirection === "backward";
  let focusPos = back ? s : e2; const anchor = back ? e2 : s;
  if (dir === "left") focusPos = Math.max(0, focusPos - 1);
  if (dir === "right") focusPos = Math.min(len, focusPos + 1);
  if (dir === "up") focusPos = 0;
  if (dir === "down") focusPos = len;
  const st = G().st;
  if (st.shift && !st.autoShift) el.setSelectionRange(Math.min(anchor, focusPos), Math.max(anchor, focusPos), focusPos < anchor ? "backward" : "forward");
  else { if (s !== e2 && (dir === "left" || dir === "right")) focusPos = dir === "left" ? s : e2; el.setSelectionRange(focusPos, focusPos); }
  updateSugg();
}
function space() {
  const el = ensureTarget(), s = el.selectionStart!, v = el.value;
  learnLastWord();
  if (G().set.dbl && s >= 2 && el.selectionEnd === s && v[s - 1] === " " && /[\p{L}\p{N}]/u.test(v[s - 2]) && G().lang !== "ar") { el.setRangeText(". ", s - 1, s, "end"); fire(el); updateSugg(); autoCap(); return; }
  insert(" "); autoCap();
}
function enter() {
  const el = ensureTarget(); learnLastWord();
  if (el.tagName === "TEXTAREA") { insert("\n"); return; }
  const f = (el as HTMLInputElement).form; if (f) { if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); }
}
/** setInputLang (L8186). */
export function setInputLang(v: string, quiet?: boolean) {
  if (v === "follow") S({ follow: true, lang: appLang() }); else S({ follow: false, lang: v });
  if (G().auto) S({ layout: LAYOUT_FOR[G().lang] });
  relayout(renderKb); suggPage = 0; updateSugg(); saveKb();
  if (!quiet) toast(t("inputLangSet", { x: LANGS[G().lang as Lang].name }));
}
/** setLayout (L8192). */
export function setLayout(v: string) {
  if (v === "pad") S({ pad: true });
  else { S({ pad: false }); if (v === "auto") S({ auto: true, layout: LAYOUT_FOR[G().lang] }); else S({ auto: false, layout: v }); }
  setPadBtn(); relayout(() => { kbEl()?.classList.toggle("pad", G().pad); renderKb(); }); saveKb();
  if (G().open) requestAnimationFrame(liftForTarget);
}
/* old keys flip out, new keys drop in; the keyboard eases to its new height (L8199) */
let relayQ: (() => void)[] | null = null;
function relayout(fn: () => void) {
  if (!G().open || reduced()) { fn(); return; }
  if (relayQ) { relayQ.push(fn); return; }
  relayQ = [fn];
  const keysEl = kbKeysEl()!, kb = kbEl()!;
  [...keysEl.querySelectorAll(".key")].forEach((k, i) => k.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-8px) scale(.86)" }], { duration: 170, delay: Math.min(i * 3, 110), easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }));
  setTimeout(() => {
    const h0 = keysEl.offsetHeight, fns = relayQ!; relayQ = null; flushSync(() => fns.forEach((f) => f()));
    kb.classList.remove("relayout"); void kb.offsetWidth; kb.classList.add("relayout");
    const h1 = keysEl.offsetHeight;
    if (h0 !== h1) keysEl.animate([{ height: h0 + "px", overflow: "hidden" }, { height: h1 + "px", overflow: "hidden" }], { duration: 500, easing: "cubic-bezier(.2,1.1,.3,1)" });
    clearTimeout(kb._rl); kb._rl = setTimeout(() => kb.classList.remove("relayout"), 1200);
    requestAnimationFrame(liftForTarget);
  }, 290);
}
/* theme change washes across the keys row by row (L8216) */
export function kbThemeWave() {
  const kb = kbEl()!;
  if (!G().open || reduced()) { applyKbSet(); return; }
  kb.classList.remove("theming"); void kb.offsetWidth; kb.classList.add("theming");
  applyKbSet();
  clearTimeout(kb._tw); kb._tw = setTimeout(() => kb.classList.remove("theming"), 1500);
}
function cycleLayout() { const order = ["en", "fr", "de", "ar"]; setInputLang(order[(order.indexOf(G().lang) + 1) % order.length]); }
export function act(k: Key) {
  const st = G().st;
  switch (k.t) {
    case "esc": case "hide": closeKb(); break;
    case "bksp": backspace(); break;
    case "tab": if (!acceptTop()) insert(ensureTarget().tagName === "TEXTAREA" ? "\t" : "  "); break;
    case "caps": setSt({ caps: !st.caps, shift: false, autoShift: false }); break;
    case "shift":
      if (st.alt) { setSt({ alt: false }); cycleLayout(); break; }
      setSt({ shift: st.autoShift ? false : !st.shift, autoShift: false }); break;
    case "ctrl": case "alt": case "altgr": case "fn": setSt({ [k.t]: !st[k.t as "ctrl"] }); break;
    case "enter": enter(); break;
    case "space": space(); break;
    case "win": { const sh = useShell.getState(); sh.setWs(!sh.wsOpen); break; }
    case "abc": setLayout(G().auto ? "auto" : G().layout); break;
    case "left": case "right": case "up": case "down": move(k.t); break;
  }
}

/* ---------- suggestions (L8242–L8273) ---------- */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function fitCase(w: string, x: string) { return w && w[0] !== w[0].toLowerCase() && x[0] === x[0].toLowerCase() ? x[0].toUpperCase() + x.slice(1) : x; }
function candidates() {
  const w = curWord(), nw = norm(w), seen = new Set<string>(), out: string[] = [];
  const pool = [...[...learned.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]), ...WORDS[G().lang]];
  for (const x of pool) { const k = norm(x); if (seen.has(k)) continue; seen.add(k); if (!nw || (k.startsWith(nw) && k !== nw)) out.push(x); }
  return { w, out };
}
export function updateSugg() {
  const { w, out } = candidates();
  if (suggPage * 7 >= out.length) suggPage = 0;
  // innerHTML replacement in the source: new buttons every time, so their suggIn animation replays (rev).
  S({ sugg: { w, list: out.slice(suggPage * 7, suggPage * 7 + 7), rev: G().sugg.rev + 1 } });
}
export function moreSugg() { suggPage++; updateSugg(); }
export function pickSugg(x: string) {
  const el = ensureTarget(), w = curWord(), s = el.selectionStart!, word = fitCase(w, x);
  let txt = word + " "; if (!w && s > 0 && !/\s/.test(el.value[s - 1])) txt = " " + txt;
  el.setRangeText(txt, s - w.length, el.selectionEnd!, "end"); fire(el);
  learned.set(x, (learned.get(x) || 0) + 1); suggPage = 0;
  const st = G().st; if (st.shift && st.autoShift) setSt({ shift: false, autoShift: false });
  updateSugg(); autoCap();
}
/** acceptTop (L8272): the first rendered suggestion button. */
function acceptTop() { if (!G().set.sugg || !curWord()) return false; const b = document.querySelector<HTMLElement>("#kbSugg button"); if (!b) return false; pickSugg(b.dataset.s!); return true; }
export const setPadBtn = () => { const b = document.getElementById("kbPad"); if (!b) return; b.classList.toggle("on", G().pad); b.setAttribute("aria-pressed", String(G().pad)); };
export const padToggle = () => setLayout(G().pad ? (G().auto ? "auto" : G().layout) : "pad");

/* ---------- pointer handling (L8281–L8316): modifiers act on press, characters commit on release ---------- */
type Press = { k: Key; el: HTMLElement; timer?: ReturnType<typeof setTimeout>; vars?: HTMLElement };
let press: Press | null = null, varBox: HTMLElement | null = null;
const kbPop = () => document.getElementById("kbPop")!;
function showPop(el: HTMLElement, c: string) { const r = el.getBoundingClientRect(), p = kbPop(); p.textContent = c; p.style.left = r.left + r.width / 2 + "px"; p.style.top = r.top + "px"; p.classList.add("show"); }
const hidePop = () => document.getElementById("kbPop")?.classList.remove("show");
function showVariants(p: Press) {
  hidePop();
  const st = G().st, up = st.shift !== st.caps, list = [p.k.base!, ...VAR[p.k.base!]].map((c) => (up ? c.toLocaleUpperCase(kbLocale()) : c));
  varBox = document.createElement("div"); varBox.className = "kb-var";
  varBox.innerHTML = list.map((c, i) => `<button class="${i === 1 ? "on" : ""}" tabindex="-1">${esc(c)}</button>`).join("");
  const r = p.el.getBoundingClientRect(); varBox.style.left = r.left + r.width / 2 + "px"; varBox.style.top = r.top + "px";
  document.body.appendChild(varBox);
  const vr = varBox.getBoundingClientRect(); if (vr.left < 8) varBox.style.left = r.left + r.width / 2 + (8 - vr.left) + "px"; if (vr.right > innerWidth - 8) varBox.style.left = r.left + r.width / 2 - (vr.right - innerWidth + 8) + "px";
  p.vars = varBox;
}
const hideVariants = () => { varBox?.remove(); varBox = null; };
export function keyDown(e: PointerEvent | React.PointerEvent) {
  const el = (e.target as Element).closest<HTMLElement>(".key"); if (!el) return;
  const k = keysNow()[+el.dataset.i!];
  try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
  el.classList.add("down"); keyClick();
  press = { k, el };
  const st = G().st;
  if (k.t === "char") {
    if (e.pointerType !== "mouse" && G().set.hints) showPop(el, charFor(k, st, kbLocale()));
    if (k.letter && VAR[k.base!] && !st.ctrl) press.timer = setTimeout(() => press && showVariants(press), 420);
  } else if (["bksp", "left", "right", "up", "down"].includes(k.t)) {
    act(k); const rep = () => { if (!press) return; act(k); press.timer = setTimeout(rep, 55); }; press.timer = setTimeout(rep, 420);
  } else act(k);
}
function endPress(cancel: boolean) {
  if (!press) return; const p = press; press = null; clearTimeout(p.timer); p.el.classList.remove("down"); hidePop();
  if (p.vars) { const v = p.vars.querySelector("button.on"); hideVariants(); if (v && !cancel) typeChar(v.textContent!); return; }
  if (p.k.t === "char" && !cancel) typeChar(charFor(p.k, G().st, kbLocale()));
}
/** Keyboard (Tab + Enter) activation of on-screen keys (L8312). */
export function keyClickActivate(e: React.MouseEvent) {
  if (e.detail !== 0) return; const el = (e.target as Element).closest<HTMLElement>(".key"); if (!el) return; const k = keysNow()[+el.dataset.i!];
  if (k.t === "char") typeChar(charFor(k, G().st, kbLocale())); else act(k);
}

/* ---------- keep the field visible above a docked keyboard (L8326) ---------- */
function rectOf(el: Element) {
  const r = el.getBoundingClientRect(), fe = el.ownerDocument.defaultView?.frameElement;
  if (!fe || el.ownerDocument === document) return r;
  const f = fe.getBoundingClientRect(); return { top: r.top + f.top, bottom: r.bottom + f.top } as DOMRect;
}
export function liftForTarget() {
  const mainEl = document.querySelector<HTMLElement>(".main"); if (!mainEl) return;
  const cur = +(mainEl.dataset.lift || 0), kb = kbEl();
  if (!G().open || G().floating || !target || target.closest("[hidden]") || !kb) { mainEl.dataset.lift = "0"; mainEl.style.transform = ""; return; }
  const kbTop = innerHeight - 10 - kb.offsetHeight, tr = rectOf(target);
  const need = Math.max(0, Math.round(tr.bottom + cur - (kbTop - 18)));
  mainEl.dataset.lift = String(need); mainEl.style.transform = need ? `translateY(${-need}px)` : "";
}

/* ---------- open, close, float (L8338–L8360) ---------- */
const allFields = () => [...docs].flatMap((d) => [...d.querySelectorAll<Field>("input,textarea")]);
export function openKb() {
  S({ open: true }); const sh = useShell.getState(); sh.setDesksOpen(false); sh.setLangMenu(false);
  kbEl()?.classList.add("open");
  allFields().forEach((i) => { if (!i.closest(".kb")) i.inputMode = "none"; });
  ensureTarget(); autoCap(); updateSugg(); requestAnimationFrame(liftForTarget);
}
export function closeKb() {
  if (!G().open) return; S({ open: false });
  kbEl()?.classList.remove("open");
  allFields().forEach((i) => (i.inputMode = "text"));
  hideVariants(); hidePop(); liftForTarget();
}
export const toggleKb = () => (G().open ? closeKb() : openKb());
export function setKbPos(pos: KbSet["pos"], quiet?: boolean) {
  const kb = kbEl()!; const was = G().set.pos; patchSet({ pos }); const floating = pos === "float"; S({ floating });
  kb.classList.toggle("full", pos === "full");
  if (floating && !kb.classList.contains("floating")) {
    const r = kb.getBoundingClientRect(); kb.classList.add("dragging", "floating");
    kb.style.left = Math.max(8, Math.min(r.left, innerWidth - r.width - 8)) + "px"; kb.style.top = Math.max(70, (G().open ? r.top : innerHeight - r.height - 10) - 40) + "px";
    requestAnimationFrame(() => kb.classList.remove("dragging"));
  }
  if (!floating) { kb.classList.remove("floating"); kb.style.left = kb.style.top = ""; }
  document.getElementById("kbFloat")?.classList.toggle("on", floating);
  liftForTarget();
  if (!quiet && was !== pos) toast(t(({ dock: "kbDocked", float: "kbFloating", full: "posFull" } as const)[pos]));
}
export function floatToggle() { setKbPos(G().floating ? "dock" : "float"); saveKb(); }
/** Floating keyboard drag by its top strip (L8366). */
export function topDrag(e: React.PointerEvent) {
  if (!G().floating || (e.target as Element).closest("button")) return;
  const kb = kbEl()!, r = kb.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
  kb.classList.add("dragging");
  const mv = (ev: PointerEvent) => { kb.style.left = Math.min(Math.max(8, ev.clientX - ox), innerWidth - r.width - 8) + "px"; kb.style.top = Math.min(Math.max(8, ev.clientY - oy), innerHeight - r.height - 8) + "px"; };
  const up = () => { kb.classList.remove("dragging"); removeEventListener("pointermove", mv); removeEventListener("pointerup", up); };
  addEventListener("pointermove", mv); addEventListener("pointerup", up);
}
/** applyLang's keyboard part (L7987–L7988): a following keyboard switches language (and automatic layout). */
export function kbOnLang(l: Lang) {
  if (G().follow) { S({ lang: l }); if (G().auto) S({ layout: LAYOUT_FOR[l] }); }
  renderKb(); suggPage = 0; updateSugg();
}
/** After a note is added (L8386): the cleared field fires `input`, suggestions and auto-capitalisation refresh. */
export function kbNoteAdded(input: Field) { fire(input); updateSugg(); autoCap(); }

/* ---------- document listeners (L8116–L8117, L8301–L8323, L8335–L8336, L8362–L8365) ---------- */
function attach(d: Document) {
  const w = d.defaultView!;
  const focusin = (e: FocusEvent) => {
    if (isField(e.target)) { target = e.target; if (G().open) { target.inputMode = "none"; autoCap(); updateSugg(); } }
    if (G().open && isField(e.target)) requestAnimationFrame(liftForTarget);
  };
  const selchange = () => { if (G().open && target && d.activeElement === target) updateSugg(); };
  const keydown = (e: KeyboardEvent) => {
    if (!G().open) return;
    const el = kbKeysEl()?.querySelector(`[data-code="${e.code}"]`); if (el) el.classList.add("pressed");
    if (e.getModifierState && e.getModifierState("CapsLock") !== G().st.caps && e.key !== "Unidentified") setSt({ caps: e.getModifierState("CapsLock") });
    if (e.key === "Escape") closeKb();
  };
  const keyup = (e: KeyboardEvent) => { const el = kbKeysEl()?.querySelector(`[data-code="${e.code}"]`); if (el) setTimeout(() => el.classList.remove("pressed"), 70); };
  const focusout = (e: FocusEvent) => {
    if (!G().set.autoHide || !G().open || e.target !== target) return;
    setTimeout(() => { const a = document.activeElement; if (G().open && !isField(a) && !a?.closest?.(".kb,#kbMenu,#sysMenu,.palette")) closeKb(); }, 180);
  };
  d.addEventListener("focusin", focusin); d.addEventListener("selectionchange", selchange); d.addEventListener("keydown", keydown); d.addEventListener("keyup", keyup); d.addEventListener("focusout", focusout);
  docs.add(d);
  return () => { d.removeEventListener("focusin", focusin); d.removeEventListener("selectionchange", selchange); d.removeEventListener("keydown", keydown); d.removeEventListener("keyup", keyup); d.removeEventListener("focusout", focusout); docs.delete(d); void w; };
}
/** Bridge: a legacy app's iframe document behaves like part of the page (its fields are keyboard targets). */
export function kbAttachDoc(d: Document) { return docs.has(d) ? () => {} : attach(d); }
export function installKb() {
  const off = attach(document);
  const pm = (e: PointerEvent) => {
    if (!press || !press.vars) return;
    const b = document.elementFromPoint(e.clientX, e.clientY)?.closest(".kb-var button");
    if (b) press.vars.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  };
  const pu = () => endPress(false), pc = () => endPress(true), rs = () => { if (G().open) liftForTarget(); };
  addEventListener("pointermove", pm); addEventListener("pointerup", pu); addEventListener("pointercancel", pc); addEventListener("resize", rs);
  return () => { off(); removeEventListener("pointermove", pm); removeEventListener("pointerup", pu); removeEventListener("pointercancel", pc); removeEventListener("resize", rs); };
}
