"use client";
/**
 * Sign-in screen (source L9068–L9253). `renderSi` re-renders the whole panel from a few variables (tab, screen, SSO
 * section, remembered e-mail); everything else (busy button, messages, errors, passkey ring, busy tile, "check your
 * inbox") lives only in the rendered DOM and is lost on the next render. `useSi.dom` models that DOM-only state and is
 * reset on every render (`n`), and on every tab switch for the view part (`vn`).
 */
import { flushSync } from "react-dom";
import { create } from "zustand";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { useShell } from "@/os/state/shell";
import { curAcc, saveAcc, setStatus, useAccount } from "@/os/account/store";
import { closeKb, useKb } from "@/os/keyboard/kb";
import { registerOsAction, osActions } from "@/os/actions";
import { boot, closeOverlays, lkRM, paintThumb, powerScreen, replayCls, tl, usePower } from "@/os/lock/lock";
import { formatNumber } from "@/lib/i18n/core";
import { isLang } from "@/lib/i18n/langs";

export type Tab = "email" | "sso" | "passkey";
type Dom = { btn: { mode: "idle" | "busy" | "ok"; label?: string; disabled?: boolean }; msg: { txt: string; kind?: string }; pk: { idle: boolean; done: boolean }; tile: string | null; done: string | null; fresh: boolean; passShown: boolean };
type SiState = { tab: Tab; screen: "main" | "reset"; gov: boolean; remember: boolean; email: string; n: number; vn: number; pop: boolean; dom: Dom };
const DOM0: Dom = { btn: { mode: "idle" }, msg: { txt: "" }, pk: { idle: true, done: false }, tile: null, done: null, fresh: false, passShown: false };
export const useSi = create<SiState>(() => ({ tab: "email", screen: "main", gov: true, remember: true, email: "", n: 0, vn: 0, pop: false, dom: DOM0 }));
const G = () => useSi.getState();
const S = (p: Partial<SiState>) => useSi.setState(p);
const D = (p: Partial<Dom>) => useSi.setState((s) => ({ dom: { ...s.dom, ...p } }));
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const siEl = () => $("si")!;
export const isSignin = () => !!$("si")?.classList.contains("on");
const toast = (m: string) => useShell.getState().showToast(m);
const shellEl = () => $("shell") as (HTMLElement & { inert: boolean }) | null;

let siBusy = false, siFails = 0, siLockUntil = 0, siTimers: ReturnType<typeof setTimeout>[] = [];
export function loadSi() {
  try { const r = JSON.parse(localStorage.getItem(STORAGE_KEYS.signIn) || "null"); if (r) S({ remember: r.remember !== false, email: r.email || "" }); } catch { /* defaults */ }
}
export const defEmail = () => G().email || curAcc().email || useAccount.getState().accounts[0].email || "";

/** renderSi: a fresh panel (new elements), DOM-only state gone. */
function renderSi(extra: Partial<Dom> = {}) { flushSync(() => S({ n: G().n + 1, dom: { ...DOM0, ...extra } })); }
export function siMsg(txt: string, kind?: string) { D({ msg: { txt: txt || "", kind } }); }
function siErr(id: string, msg: string) { replayCls($(id), "err"); siMsg(msg, "err"); }
function siBtnBusy(on: boolean, label?: string) { D({ btn: on ? { mode: "busy", label: label || tl("signingIn"), disabled: true } : { mode: "idle" } }); }
const siLater = (fn: () => void, ms: number) => { const id = setTimeout(fn, ms); siTimers.push(id); return id; };
function siClearTimers() { siTimers.forEach(clearTimeout); siTimers = []; }
function siAnimSwap(el: Element | null, d: number) { if (lkRM() || !el) return; el.animate([{ opacity: 0, transform: `translateX(${d * 28}px)` }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,1,.3,1)" }); }
const rtl = () => (document.documentElement.dir === "rtl" ? -1 : 1);

export function setSiTab(k: Tab) {
  if (k === G().tab || siBusy) return;
  const tabs: Tab[] = ["email", "sso", "passkey"], d = (tabs.indexOf(k) > tabs.indexOf(G().tab) ? 1 : -1) * rtl();
  const v = $("siViews")!, h0 = v.offsetHeight;
  flushSync(() => S({ tab: k, vn: G().vn + 1, dom: { ...G().dom, btn: { mode: "idle" }, msg: { txt: "" }, pk: { idle: true, done: false }, fresh: false, passShown: false } }));
  const h1 = v.offsetHeight;
  if (!lkRM()) v.animate([{ height: h0 + "px", overflow: "hidden" }, { height: h1 + "px", overflow: "hidden" }], { duration: 460, easing: "cubic-bezier(.2,1.1,.3,1)" });
  siAnimSwap(v.firstElementChild, d);
  setTimeout(() => (k === "email" ? $("siPass") : k === "sso" ? $("siSso") : document.querySelector<HTMLElement>("#siForm .si-btn"))?.focus({ preventScroll: true }), 60);
}
export function siGoScreen(name: "main" | "reset") {
  if (siBusy) return; const d = name === "reset" ? 1 : -1;
  const keep = $<HTMLInputElement>("siEmail")?.value; if (keep) S({ email: keep });
  const go = () => { S({ screen: name }); renderSi(); siAnimSwap($("siScroll"), d * rtl()); setTimeout(() => (name === "reset" ? $("siEmail") : $("siPass"))?.focus({ preventScroll: true }), 60); };
  if (lkRM()) { go(); return; }
  $("siScroll")!.animate([{ opacity: 1 }, { opacity: 0, transform: `translateX(${-d * 20}px)` }], { duration: 150, easing: "ease-in" }).finished.then(go);
}
const siLockLeft = () => Math.ceil((siLockUntil - Date.now()) / 1000);
const nfl = (n: number) => { const h = document.documentElement.lang; return formatNumber(isLang(h) ? h : "en", n); };
function siLockTick() {
  const n = siLockLeft(), has = !!document.querySelector("#siForm .si-btn");
  if (n <= 0) { if (has) D({ btn: { ...G().dom.btn, disabled: false } }); siMsg(""); return; }
  if (has) D({ btn: { ...G().dom.btn, disabled: true } }); siMsg(tl("lockedOut", { n: nfl(n) }), "err"); siLater(siLockTick, 1000);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function siSubmit(form: HTMLElement) {
  if (siBusy || siLockLeft() > 0) return;
  const kind = form.dataset.kind;
  if (kind === "email") {
    const em = $<HTMLInputElement>("siEmail")!, pw = $<HTMLInputElement>("siPass")!;
    if (!EMAIL_RE.test(em.value.trim())) { siErr("siEmailF", tl("emailInvalid")); em.focus(); return; }
    if (!pw.value) { siErr("siPassF", tl("passEmpty")); pw.focus(); return; }
    siBusy = true; siBtnBusy(true); siMsg("");
    siLater(() => {
      siBusy = false;
      if (pw.value.length >= 4) {
        const v = em.value.trim().toLowerCase(), a = useAccount.getState().accounts.find((x) => x.email && x.email.toLowerCase() === v);
        if (a && a.id !== useAccount.getState().accId) { useAccount.setState({ accId: a.id }); saveAcc(); }
        S({ email: em.value.trim() }); siSuccess();
      } else { siBtnBusy(false); siErr("siPassF", tl("passWrong") + " " + tl("passHint")); pw.select(); if (++siFails >= 5) { siFails = 0; siLockUntil = Date.now() + 30000; siLockTick(); } }
    }, 850);
  }
  if (kind === "sso") {
    const d = $<HTMLInputElement>("siSso")!, v = d.value.trim();
    if (!/[^\s@]+\.[^\s@]+$/.test(v)) { siErr("siSsoF", tl("ssoNeed")); d.focus(); return; }
    siBusy = true; siBtnBusy(true, tl("redirecting")); siMsg(tl("connectingTo", { x: v.split("@").pop()! }), "info");
    siLater(siSuccess, 1600);
  }
  if (kind === "passkey") {
    siBusy = true; D({ pk: { idle: false, done: false } }); siBtnBusy(true, tl("verifying"));
    siLater(() => { D({ pk: { idle: false, done: true } }); siMsg(tl("verified"), "info"); siLater(siSuccess, 650); }, 1800);
  }
  if (kind === "reset") {
    const em = $<HTMLInputElement>("siEmail")!, v = em.value.trim();
    if (!EMAIL_RE.test(v)) { siErr("siEmailF", tl("emailInvalid")); em.focus(); return; }
    siBusy = true; siBtnBusy(true, tl("sendLink"));
    siLater(() => {
      siBusy = false; const h0 = $("siForm")!.offsetHeight;
      flushSync(() => D({ done: v, btn: { mode: "idle" }, msg: { txt: "" } }));
      const f = $("siForm")!; if (!lkRM()) f.animate([{ height: h0 + "px", opacity: 0, overflow: "hidden" }, { height: f.offsetHeight + "px", opacity: 1, overflow: "hidden" }], { duration: 480, easing: "cubic-bezier(.2,1.1,.3,1)" });
    }, 900);
  }
}
export function siTile(key: string, name: string) {
  if (siBusy) return; siBusy = true;
  D({ tile: key }); siMsg(tl("connectingTo", { x: name }), "info");
  siLater(siSuccess, 1700);
}
export function siProv(name: string) {
  if (name === "passkey") { setSiTab("passkey"); setTimeout(() => siSubmit($("siForm")!), 480); return; }
  siTile("prov:" + name, name);
}
function siSuccess() {
  siBusy = true;
  if (document.querySelector("#siForm .si-btn")) D({ btn: { mode: "ok", label: tl("welcome", { x: curAcc().short! }), disabled: true } });
  const rem = $<HTMLInputElement>("siRem"); if (rem) S({ remember: rem.checked });
  try { localStorage.setItem(STORAGE_KEYS.signIn, JSON.stringify({ remember: G().remember, email: G().remember ? G().email : "" })); } catch { /* quota */ }
  siEl().classList.add("leaving");
  siLater(hideSignin, lkRM() ? 150 : 900);
}
export function showSignin(fresh?: boolean) {
  closeOverlays();
  const lk = $("lock"); if (lk?.classList.contains("on")) { lk.classList.remove("on"); lk.setAttribute("aria-hidden", "true"); }
  siClearTimers(); siBusy = false; S({ tab: "email", screen: "main", pop: false }); siFails = 0; if (fresh) S({ email: "" });
  renderSi({ fresh: !!fresh }); paintThumb("siThumb");
  document.body.classList.add("locked"); const sh = shellEl(); if (sh) sh.inert = true;
  const el = siEl(); el.classList.remove("leaving", "on"); void el.offsetWidth; el.classList.add("on"); el.setAttribute("aria-hidden", "false");
  setTimeout(() => { const e = $<HTMLInputElement>("siEmail"), p = $("siPass"); (e && !e.value ? e : p)?.focus({ preventScroll: true }); }, 750);
}
export function hideSignin() {
  siClearTimers(); closeSiPop(); const el = siEl(); el.classList.remove("on"); el.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked"); const sh = shellEl(); if (sh) sh.inert = false; $("wall")?.style.removeProperty("--px"); $("wall")?.style.removeProperty("--py");
  setTimeout(() => { el.classList.remove("leaving"); siBusy = false; }, 650);
  setStatus("online", { quiet: true }); if (useKb.getState().open) closeKb();
  boot(); setTimeout(() => toast(tl("welcome", { x: curAcc().short! })), 500);
}
/** applyLang while the sign-in screen is up (L7993): keep the typed e-mail and password across the re-render. */
export function siOnLang() {
  if (!isSignin()) return;
  const em = $<HTMLInputElement>("siEmail")?.value, pw = $<HTMLInputElement>("siPass")?.value; if (em) S({ email: em });
  // Runs inside a layout effect, where flushSync cannot render synchronously: the password is put back by SignIn
  // once the new panel is committed (siTakePw).
  pendingPw = pw || ""; S({ n: G().n + 1, dom: { ...DOM0 } }); paintThumb("siThumb");
}
let pendingPw = "";
export function siTakePw() { if (pendingPw && $("siPass")) $<HTMLInputElement>("siPass")!.value = pendingPw; pendingPw = ""; }
export function closeSiPop() { if (G().pop) S({ pop: false }); }
export function siEye() { const p = $<HTMLInputElement>("siPass")!, s = p.selectionStart; p.type = p.type === "password" ? "text" : "password"; D({ passShown: p.type === "text" }); p.focus(); try { p.setSelectionRange(s, s); } catch { /* n/a */ } }
export function siFieldInput(e: Event | React.FormEvent) { const f = (e.target as Element).closest(".si-field"); if (f && f.classList.contains("err")) { f.classList.remove("err"); if (siLockLeft() <= 0) siMsg(""); } }
export function siCaps(e: React.KeyboardEvent) {
  if ((e.target as HTMLElement).id !== "siPass" || !e.getModifierState) return; const on = e.getModifierState("CapsLock"), k = G().dom.msg.kind;
  if (on && k !== "err") siMsg(tl("capsOn"), "warn"); else if (!on && k === "warn") siMsg("");
}
export function siPointerMove(e: React.PointerEvent) { const w = $("wall"); if (!isSignin() || lkRM() || !w) return; w.style.setProperty("--px", ((e.clientX / innerWidth - 0.5) * -14).toFixed(1) + "px"); w.style.setProperty("--py", ((e.clientY / innerHeight - 0.5) * -8).toFixed(1) + "px"); }
export function installSi() {
  const k = (e: KeyboardEvent) => { if (!isSignin()) return; if (e.key === "Escape") { if (G().pop) { closeSiPop(); return; } if (G().screen === "reset") { e.preventDefault(); siGoScreen("main"); } } };
  document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
}
/** signOut (L10397): a short power screen, then the sign-in screen. */
export function signOut() { powerScreen(tl("signingOut")); setTimeout(() => { usePower.setState({ on: false }); showSignin(); }, 1100); }
export const siRegister = () => osActions.register();

registerOsAction("signin", (add) => showSignin(add));
registerOsAction("signout", signOut);
