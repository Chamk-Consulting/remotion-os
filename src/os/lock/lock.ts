"use client";
/**
 * Lock screen, power screen and the shell boot animation (source L8874–L9067, L9901–L9912).
 *
 * Render state (face, messages, the unlock button, PIN, SSO, passkey, popovers) lives in `useLock`; the `#lock` element's
 * own classes (on / leaving / glance / sleep / signout / big / hc / rm), the password field's type / disabled state and the
 * replayed animations are applied to the DOM imperatively, exactly where the source does it (React renders those
 * elements with static props, so it never overwrites them).
 */
import { create } from "zustand";
import { formatNumber, translate } from "@/lib/i18n/core";
import { isLang, type Lang } from "@/lib/i18n/langs";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { useShell } from "@/os/state/shell";
import { curAcc, saveAcc, setStatus, useAccount } from "@/os/account/store";
import { closeKb, toggleKb, useKb } from "@/os/keyboard/kb";
import { scApi } from "@/os/shortcuts/ShortcutsPanel";
import { closeSearch } from "@/os/shortcuts/Palette";
import { closeNc } from "@/os/notifications/nc";
import { paint, sceneFor } from "@/os/shell/wallpaper";
import { registerOsAction } from "@/os/actions";

export type Face = "auth" | "pin" | "users" | "sso" | "passkey";
export type LkPop = { kind: "lang" | "a11y" | "power"; btn: string; lang: Lang; n: number } | null;
type LockState = {
  face: Face; faceN: Record<Face, number>;
  msg: { txt: string; kind?: string };
  unlock: { mode: "idle" | "busy" | "ok"; text?: string; n: number };
  eyeShown: boolean;
  pin: { len: number; dots: number; ok: boolean; msg?: { txt: string; kind: string } };
  sso: string | null; pkDone: boolean; /** account at the last render of the users face (renderLkUsers) */ usersAcc: string; q: number; pop: LkPop; set: { big: boolean; hc: boolean; rm: boolean };
};
export const useLock = create<LockState>(() => ({
  face: "auth", faceN: { auth: 0, pin: 0, users: 0, sso: 0, passkey: 0 }, msg: { txt: "" }, unlock: { mode: "idle", n: 0 }, eyeShown: false,
  pin: { len: 0, dots: 0, ok: false }, sso: null, pkDone: false, usersAcc: "", q: 0, pop: null, set: { big: false, hc: false, rm: false },
}));
const G = () => useLock.getState();
const S = (p: Partial<LockState>) => useLock.setState(p);

const appLang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
export const tl = (k: string, v?: Record<string, string | number>) => translate(appLang(), k, v);
const toast = (m: string) => useShell.getState().showToast(m);
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const lockEl = () => $("lock")!;
const lkPass = () => $<HTMLInputElement>("lkPass")!;
const lkUnlock = () => $<HTMLButtonElement>("unlockBtn")!;
export const isLocked = () => !!$("lock")?.classList.contains("on");
export const isPower = () => !!$("power")?.classList.contains("on");
const shellEl = () => $("shell") as (HTMLElement & { inert: boolean }) | null;
const wall = () => $("wall");

export const DEMO_PIN = "1234";
let lkFails = 0, lkLockUntil = 0, lkIdle: ReturnType<typeof setTimeout> | undefined, lkPin = "", lkBusy = false, pkTimer: ReturnType<typeof setTimeout> | undefined;

/* ---------- settings (L8882, L8900) ---------- */
export function loadLkSet() {
  const set = { big: false, hc: false, rm: false };
  try { Object.assign(set, JSON.parse(localStorage.getItem(STORAGE_KEYS.lock) || "{}")); } catch { /* defaults */ }
  S({ set });
}
export function applyLkSet() {
  const l = lockEl(), s = G().set;
  l.classList.toggle("big", !!s.big); l.classList.toggle("hc", !!s.hc); l.classList.toggle("rm", !!s.rm);
  try { localStorage.setItem(STORAGE_KEYS.lock, JSON.stringify(s)); } catch { /* quota */ }
}
export const lkRM = () => !!G().set.rm || matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Replays a CSS class: remove, reflow, add (source idiom). */
export const replayCls = (el: Element | null, cls: string) => { if (!el) return; el.classList.remove(cls); void (el as HTMLElement).offsetWidth; el.classList.add(cls); };

/* ---------- unlock button, message, eye (L8897–L8899) ---------- */
export function restoreUnlock() { const b = lkUnlock(); b.classList.remove("ok", "busy"); b.disabled = false; S({ unlock: { mode: "idle", n: G().unlock.n + 1 } }); }
export function lkSetMsg(txt: string, kind?: string) { S({ msg: { txt: txt || "", kind } }); }
export function updEye() { S({ eyeShown: lkPass().type === "text" }); }
export function eyeToggle() { const p = lkPass(), s = p.selectionStart; p.type = p.type === "password" ? "text" : "password"; updEye(); p.focus(); try { p.setSelectionRange(s, s); } catch { /* type without selection */ } }

/* ---------- faces (L8902–L8913) ---------- */
export function showFace(name: Face, dir = 1) {
  const card = $("lkCard")!, cur = card.querySelector<HTMLElement>(".lk-face:not([hidden])"), next = card.querySelector<HTMLElement>(`[data-face="${name}"]`);
  if (!next || cur === next) return;
  clearTimeout(pkTimer);
  // renderPin / renderLkUsers / renderSso / renderPasskey: the face is rendered anew (new elements) each time it is shown.
  if (name !== "auth") { if (name === "pin") lkPin = ""; S({ faceN: { ...G().faceN, [name]: G().faceN[name] + 1 }, ...(name === "pin" ? { pin: { len: 0, dots: 0, ok: false } } : {}), ...(name === "sso" ? { sso: null } : {}), ...(name === "passkey" ? { pkDone: false } : {}), ...(name === "users" ? { usersAcc: useAccount.getState().accId } : {}) }); }
  const h0 = card.offsetHeight; if (cur) cur.hidden = true; next.hidden = false; S({ face: name }); const h1 = card.offsetHeight;
  if (!lkRM()) {
    const d = dir * (document.documentElement.dir === "rtl" ? -1 : 1);
    card.animate([{ height: h0 + "px", overflow: "hidden" }, { height: h1 + "px", overflow: "hidden" }], { duration: 480, easing: "cubic-bezier(.2,1.1,.3,1)" });
    next.animate([{ opacity: 0, transform: `translateX(${d * 34}px)` }, { opacity: 1, transform: "none" }], { duration: 440, easing: "cubic-bezier(.2,1,.3,1)" });
  }
  if (name === "passkey") startPasskey();
  setTimeout(() => { (name === "auth" ? lkPass() : $("lkCard")!.querySelector<HTMLElement>(`[data-face="${name}"]`)!.querySelector<HTMLElement>("[data-pin],.sso-btn,.acc-opt,button"))?.focus({ preventScroll: true }); }, 80);
}

/* ---------- password (L8915–L8941) ---------- */
const lockedOutLeft = () => Math.ceil((lkLockUntil - Date.now()) / 1000);
export function tryPassword() {
  if (lkBusy || lockedOutLeft() > 0) return;
  const v = lkPass().value; if (!v) { lkFail(tl("passEmpty"), false); return; }
  lkBusy = true; const b = lkUnlock(); b.classList.add("busy"); b.disabled = true; S({ unlock: { mode: "busy", n: G().unlock.n + 1 } });
  setTimeout(() => { lkBusy = false; if (v.length >= 4) authSuccess(); else { restoreUnlock(); lkFail(tl("passWrong") + " " + tl("passHint"), true); } }, 700);
}
function lkFail(msg: string, count: boolean) {
  replayCls(lkPass().closest(".lk-pass"), "err");
  lkSetMsg(msg, "err"); lkPass().focus(); lkPass().select();
  if (count && ++lkFails >= 5) { lkFails = 0; lkLockUntil = Date.now() + 30000; lockoutTick(); }
}
function lockoutTick() {
  const n = lockedOutLeft();
  if (n <= 0) { lkPass().disabled = false; restoreUnlock(); lkSetMsg(""); if (isLocked()) lkPass().focus(); return; }
  lkPass().disabled = true; lkUnlock().disabled = true; lkSetMsg(tl("lockedOut", { n: formatNumber(appLang(), n) }), "err"); setTimeout(lockoutTick, 1000);
}
export function authSuccess() {
  if (G().face === "auth") { const b = lkUnlock(); b.classList.remove("busy"); b.classList.add("ok"); b.disabled = true; S({ unlock: { mode: "ok", text: tl("welcome", { x: curAcc().short! }), n: G().unlock.n + 1 } }); }
  lkSetMsg(""); lkFails = 0; lockEl().classList.add("leaving");
  setTimeout(unlock, lkRM() ? 150 : 800);
}
export function passInput() { if (G().msg.kind === "err" && lockedOutLeft() <= 0) lkSetMsg(""); lkPass().closest(".lk-pass")!.classList.remove("err"); }
function capsCheck(e: KeyboardEvent) {
  if (!e.getModifierState) return; const on = e.getModifierState("CapsLock"), k = G().msg.kind;
  if (on && k !== "err") lkSetMsg(tl("capsOn"), "warn"); else if (!on && k === "warn") lkSetMsg("");
}

/* ---------- PIN (L8943–L8960) ---------- */
export function pinPress(k: string) {
  if (lkPin.length === 4 && k !== "del") return;
  if (k === "del") lkPin = lkPin.slice(0, -1); else lkPin += k;
  S({ pin: { ...G().pin, len: lkPin.length, dots: lkPin.length } });
  $("lkCard")!.querySelector(`[data-pin="${k}"]`)?.animate([{ transform: "scale(.88)" }, { transform: "none" }], { duration: 240, easing: "cubic-bezier(.2,1.4,.3,1)" });
  if (lkPin.length === 4) setTimeout(() => {
    if (lkPin === DEMO_PIN) { S({ pin: { ...G().pin, ok: true } }); authSuccess(); }
    else {
      replayCls($("pinDots"), "err"); S({ pin: { ...G().pin, msg: { txt: tl("pinWrong"), kind: "err" } } }); lkPin = "";
      setTimeout(() => S({ pin: { ...G().pin, dots: 0 } }), 380);
    }
  }, 200);
}

/* ---------- switch user, SSO, passkey (L8962–L8990) ---------- */
export function lkPickUser(id: string) {
  if (id !== useAccount.getState().accId) { useAccount.setState({ accId: id }); saveAcc(); }
  lkPass().value = ""; lkSetMsg("");
  showFace("auth", -1);
  replayCls($("lockAv"), "pop");
}
export function ssoGo(btn: HTMLElement) { if (G().sso) return; S({ sso: btn.dataset.sso! }); setTimeout(authSuccess, 1500); }
function startPasskey() { clearTimeout(pkTimer); pkTimer = setTimeout(() => { if (!$("pk") || G().face !== "passkey") return; S({ pkDone: true }); pkTimer = setTimeout(authSuccess, 650); }, 1900); }

/* ---------- quote card (L8992–L8999); shared index with the sign-in screen ---------- */
export const QUOTES = 4;
export function paintThumb(id: string) {
  const cv = $<HTMLCanvasElement>(id); if (!cv) return; const sh = useShell.getState();
  paint(cv, sceneFor((sh.cur + G().q) % 3, sh.isDark), cv.width, cv.height);
}
export function renderLkQuote(swap: boolean) { if (swap) replayCls($("lkQ"), "swap"); paintThumb("lkThumb"); }
export function nextQuote(which: "lk" | "si") { S({ q: (G().q + 1) % QUOTES }); if (which === "lk") renderLkQuote(true); else { replayCls($("siQ"), "swap"); paintThumb("siThumb"); } }

/* ---------- bottom bar popovers (L9001–L9030) ---------- */
export function closeLkPop() { if (G().pop) S({ pop: null }); }
export function lkPop(kind: NonNullable<LkPop>["kind"], btn: string) {
  const was = G().pop?.btn === btn; closeLkPop(); if (was) return;
  S({ pop: { kind, btn, lang: appLang(), n: Date.now() } });
}
export function lkA11y(k: string) {
  if (k === "osk") { closeLkPop(); lkPass().focus(); toggleKb(); return; }
  S({ set: { ...G().set, [k]: !G().set[k as "big"] } }); applyLkSet();
}
export function lkPower(p: string) { closeLkPop(); if (p === "sleep") sleepLock(); if (p === "restart") restartOS(); if (p === "shutdown") shutdownOS(); }
export function switchUserBtn() { closeLkPop(); const f = G().face; showFace(f === "users" ? "auth" : "users", f === "users" ? -1 : 1); }

/* ---------- idle → glance; sleep (L9040–L9066) ---------- */
function armIdle() { clearTimeout(lkIdle); lkIdle = setTimeout(() => { if (isLocked() && !G().pop && !useKb.getState().open && G().face === "auth" && !lkPass().value) glance(true); }, 25000); }
function glance(on: boolean) {
  lockEl().classList.toggle("glance", on);
  if (on) { closeLkPop(); const a = document.activeElement as HTMLElement | null; if (a && lockEl().contains(a)) a.blur(); }
  else { armIdle(); if (G().face === "auth") setTimeout(() => lkPass().focus({ preventScroll: true }), 250); }
}
function sleepLock() { lockEl().classList.add("sleep"); (document.activeElement as HTMLElement | null)?.blur?.(); if (useKb.getState().open) closeKb(); }
function wakeLock() { lockEl().classList.remove("sleep"); glance(false); }
export function lockPointerMove(e: PointerEvent | React.PointerEvent) {
  if (!isLocked()) return; const l = lockEl(), w = wall();
  if (!lkRM() && w) { w.style.setProperty("--px", ((e.clientX / innerWidth - 0.5) * -16).toFixed(1) + "px"); w.style.setProperty("--py", ((e.clientY / innerHeight - 0.5) * -10).toFixed(1) + "px"); }
  if (l.classList.contains("glance") && !l.classList.contains("sleep")) glance(false); else armIdle();
}
export function lockPointerDown(e: React.PointerEvent) {
  const l = lockEl();
  if (l.classList.contains("sleep")) { e.preventDefault(); wakeLock(); return; }
  if (l.classList.contains("glance")) { glance(false); return; }
  if (G().pop && !(e.target as Element).closest(".lk-pop,.lk-bar")) closeLkPop();
  armIdle();
}
function onKeyDown(e: KeyboardEvent) {
  if (!isLocked() || isPower()) return; const l = lockEl(), face = G().face;
  if (l.classList.contains("sleep")) { e.preventDefault(); wakeLock(); return; }
  armIdle();
  if (l.classList.contains("glance")) { glance(false); if (!(e.key.length === 1 && face === "auth")) e.preventDefault(); else lkPass().focus(); return; }
  if (e.key === "Escape") { e.preventDefault(); if (G().pop) { closeLkPop(); return; } if (face !== "auth") { showFace("auth", -1); return; } glance(true); return; }
  if (face === "pin" && !e.ctrlKey && !e.metaKey) { if (/^\d$/.test(e.key)) { e.preventDefault(); pinPress(e.key); } else if (e.key === "Backspace") { e.preventDefault(); pinPress("del"); } }
  if (e.target === lkPass()) capsCheck(e);
}
function onKeyUp(e: KeyboardEvent) { if (isLocked() && e.target === lkPass()) capsCheck(e); }
export function installLock() {
  document.addEventListener("keydown", onKeyDown); document.addEventListener("keyup", onKeyUp);
  return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("keyup", onKeyUp); };
}

/* ---------- lock / unlock (L9044–L9067) ---------- */
export const closeOverlays = () => { useShell.getState().closeAll(); closeKb(); scApi.close(); closeSearch(); closeNc(); };
export function lockScreen() {
  closeOverlays();
  renderLkQuote(false); applyLkSet();
  const p = lkPass(); p.value = ""; p.type = "password"; updEye(); lkSetMsg(""); lkFails = 0; restoreUnlock();
  if (lockedOutLeft() > 0) lockoutTick();
  $("lkCard")!.querySelectorAll<HTMLElement>(".lk-face").forEach((f) => (f.hidden = f.dataset.face !== "auth")); S({ face: "auth", pop: null });
  const l = lockEl(); l.classList.remove("leaving", "glance", "sleep");
  document.body.classList.add("locked"); const sh = shellEl(); if (sh) sh.inert = true;
  l.classList.remove("on"); void l.offsetWidth; l.classList.add("on"); l.setAttribute("aria-hidden", "false");
  lockHooks.tick();
  setTimeout(() => { if (isLocked() && G().face === "auth") lkPass().focus({ preventScroll: true }); }, 700);
  armIdle();
}
export function unlock() {
  const l = lockEl(), so = l.classList.contains("signout");
  clearTimeout(lkIdle); clearTimeout(pkTimer); closeLkPop();
  l.classList.remove("on"); l.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked"); const sh = shellEl(); if (sh) sh.inert = false; wall()?.style.removeProperty("--px"); wall()?.style.removeProperty("--py");
  setTimeout(() => l.classList.remove("signout", "leaving", "glance"), 600);
  if (so) setStatus("online", { quiet: true });
  if (useKb.getState().open) closeKb();
  boot(true); setTimeout(() => toast(tl("welcome", { x: curAcc().short! })), 450);
}
/** applyLang while locked (L7994): quote, eye, unlock button, current face re-rendered, message cleared unless an error. */
export function lockOnLang() {
  if (!isLocked()) return;
  renderLkQuote(false); updEye(); restoreUnlock();
  const f = G().face;
  if (f !== "auth") { $("lkCard")!.querySelectorAll<HTMLElement>(".lk-face").forEach((x) => (x.hidden = x.dataset.face !== "auth")); S({ face: "auth" }); showFace(f, 0); }
  if (G().msg.kind !== "err") lkSetMsg("");
}
/** Hooks filled by the React side (lock clock refresh = source tick()). */
export const lockHooks: { tick: () => void } = { tick: () => {} };

/* ---------- boot animation and power screen (L9901–L9912) ---------- */
let bootT: ReturnType<typeof setTimeout> | undefined;
export function boot(light?: boolean) {
  document.querySelectorAll<HTMLElement>(".rail button, .widgets>.card").forEach((el, i) => el.style.setProperty("--bi", String(i % 9)));
  const sh = shellEl(); if (sh) { sh.classList.remove("boot"); void sh.offsetWidth; sh.classList.add("boot"); }
  useShell.setState({ booting: true });
  clearTimeout(bootT); bootT = setTimeout(() => { useShell.setState({ booting: false }); shellEl()?.classList.remove("boot"); }, light ? 1100 : 1500);
}
type PowerState = { on: boolean; off: boolean; msg: string; spin: boolean; btn: boolean };
export const usePower = create<PowerState>(() => ({ on: false, off: false, msg: "", spin: true, btn: false }));
export function powerScreen(msg: string) {
  useShell.getState().closeAll(); closeKb(); scApi.close(); closeSearch();
  usePower.setState({ msg, spin: true, btn: false, off: false, on: true });
}
export function restartOS() { powerScreen(tl("restarting")); setTimeout(() => { usePower.setState({ on: false }); boot(); }, 2300); }
export function shutdownOS() {
  powerScreen(tl("shuttingDown"));
  setTimeout(() => { usePower.setState({ spin: false, off: true, msg: tl("poweredOff"), btn: true }); requestAnimationFrame(() => $("powerOn")?.focus()); }, 1800);
}
export function powerOn() { usePower.setState({ btn: false, off: false, spin: true, msg: "" }); setTimeout(() => { usePower.setState({ on: false }); boot(); }, 1400); }

registerOsAction("lock", lockScreen);
registerOsAction("restart", restartOS);
registerOsAction("shutdown", shutdownOS);
