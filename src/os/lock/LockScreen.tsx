"use client";
/** Lock screen `#lock` (markup L7069–L7104, behaviour L8877–L9067) and power screen `#power` (L7169–L7176, L9906–L9912). */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANGS, type Lang } from "@/lib/i18n/langs";
import { stopAll } from "@/lib/events";
import { SvgString } from "@/os/shell/svg";
import { LockMarkup } from "@/os/shell/generated/LockMarkup";
import { LockAuthMarkup } from "@/os/shell/generated/LockAuthMarkup";
import { PowerMarkup } from "@/os/shell/generated/PowerMarkup";
import { MI, SI } from "@/os/shortcuts/catalogue";
import { NI } from "@/os/notifications/nc";
import { ICON } from "@/os/keyboard/layout";
import { roleOf, stOf, useAccount } from "@/os/account/store";
import { Avatar } from "@/os/account/AccountMenu";
import { switchLang } from "@/os/shell/shellActions";
import {
  closeLkPop, eyeToggle, installLock, lkA11y, lkPickUser, lkPop, lkPower, loadLkSet, lockHooks, lockOnLang, lockPointerDown, lockPointerMove, nextQuote,
  passInput, pinPress, powerOn, showFace, ssoGo, switchUserBtn, tryPassword, useLock, usePower, type Face,
} from "./lock";

export const LKI = {
  arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  spin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 9 9"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  eye: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.8M6.2 6.2C3.6 8 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.8-1.8M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  fp: '<svg class="fp" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 4.5A9 9 0 0 1 21 12v1M3.5 9A9 9 0 0 0 3 12c0 3 .7 5 1.5 6.5M17 19.5c.6-1.7 1-3.8 1-6.5a6 6 0 0 0-11.6-2.2M6.5 15c.3 2 .9 3.6 1.7 5M12 12v2c0 3-.6 5.3-1.6 7M15 14.5c-.2 2.4-.7 4.3-1.4 6"/><path d="M9 12a3 3 0 0 1 6 0"/></svg>',
  okBig: '<svg class="ok" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  moon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>',
};
const SSO: [string, string, string][] = [["ssoRemotion", "linear-gradient(135deg,#3fd27a,#16a352)", "R"], ["ssoGoogle", "linear-gradient(135deg,#56a6ff,#1f6fe0)", "G"], ["ssoMs", "linear-gradient(135deg,#9a5cf7,#6c2bd9)", "M"]];
const H = ({ h }: { h: string }) => <SvgString html={h} />;
const TZ = "Africa/Tunis";
// eslint-disable-next-line @next/next/no-img-element -- user photo is a data URL from localStorage (source avInner L10230)
const Photo = ({ src }: { src: string }) => <img src={src} alt="" />;

export function LockScreen() {
  const { t, lang, nf, loc } = useI18n();
  const L = useLock(); const acc = useAccount();
  const me = acc.accounts.find((a) => a.id === acc.accId);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { loadLkSet(); lockHooks.tick = () => setNow(new Date()); const id = setInterval(() => setNow(new Date()), 10000); const off = installLock(); return () => { clearInterval(id); off(); }; }, []);
  // applyLang's lock part (L7994), on every language change while locked.
  const prevLang = useRef(lang);
  useLayoutEffect(() => { if (prevLang.current !== lang) { prevLang.current = lang; lockOnLang(); } }, [lang]);
  // paintAvatar (L10233) toggles `org` on the live element (it also carries the replayed `pop` class).
  useLayoutEffect(() => { document.getElementById("lockAv")?.classList.toggle("org", !!me?.org); }, [me?.org]);

  // Popover placement above its button (lkPop L9003), focus on its first row after 40 ms.
  const popRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const p = popRef.current, pop = L.pop; if (!p || !pop) return;
    const r = document.getElementById(pop.btn)!.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    p.style.left = left + "px"; p.style.top = r.top - h - 10 + "px"; p.style.setProperty("--ox", r.left + r.width / 2 - left + "px");
    setTimeout(() => p.querySelector("button")?.focus({ preventScroll: true }), 40);
  }, [L.pop]);

  const parts = new Intl.DateTimeFormat(loc(), { timeZone: TZ, hour: "2-digit", minute: "2-digit", numberingSystem: "latn" }).formatToParts(now);
  const hh = parts.find((x) => x.type === "hour")!.value, mm = parts.find((x) => x.type === "minute")!.value, ap = parts.find((x) => x.type === "dayPeriod");
  const faceHead = (title: string) => <div className="lk-fhead"><button type="button" className="lk-back" data-face-go="auth" aria-label={t("back")}><H h={MI.back} /></button><b>{title}</b></div>;
  const face = (f: Face) => {
    switch (f) {
      case "pin": return <>{faceHead(t("pinTitle"))}
        <div className="pin-dots" id="pinDots">{[0, 1, 2, 3].map((i) => <i key={i} className={[i < L.pin.dots ? "on" : "", L.pin.ok ? "ok" : ""].filter(Boolean).join(" ") || undefined}></i>)}</div>
        <p className={"lk-msg " + (L.pin.msg?.kind ?? "info")} id="pinMsg">{L.pin.msg?.txt ?? t("pinHint")}</p>
        <div className="pin-pad">{["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (k ? <button key={i} type="button" data-pin={k} aria-label={k === "del" ? "Backspace" : k}>{k === "del" ? <H h={ICON.bksp} /> : nf(+k)}</button> : <span key={i}></span>))}</div>
        <button type="button" className="lk-link" data-face-go="auth">{t("usePassword")}</button></>;
      case "users": return <>{faceHead(t("switchUser"))}<div className="lk-users">{acc.accounts.map((x, i) => (
        // Source markup (L8965): aria-checked on a plain button, kept identical.
        // eslint-disable-next-line jsx-a11y/role-supports-aria-props
        <button key={x.id} type="button" className="acc-opt" aria-checked={x.id === L.usersAcc} data-lkacc={x.id} style={{ ["--i" as string]: i }}><Avatar a={x} dot={x.id === L.usersAcc} /><span className="tx"><b dir="auto">{x.name}</b><small>{t(roleOf(x))}</small></span><H h={MI.ck} /></button>))}</div></>;
      case "sso": return <>{faceHead(t("ssoTitle"))}{SSO.map(([k, bg, l], i) => (
        <button key={k} type="button" className={"sso-btn" + (L.sso === k ? " busy" : "")} data-sso={k} style={{ ["--i" as string]: i, ...(L.sso && L.sso !== k ? { opacity: 0.45 } : {}) }}><span className="tile" style={{ background: bg, font: "700 15px Inter" }}>{l}</span><span>{t(L.sso === k ? "redirecting" : k)}</span>{L.sso === k ? <span className="spin"></span> : null}</button>))}</>;
      case "passkey": return <>{faceHead(t("passkeyTitle"))}<div className={"pk" + (L.pkDone ? " done" : "")} id="pk"><div className="pk-ring"><H h={LKI.fp} /><H h={LKI.okBig} /></div><div className="pk-status" id="pkStatus">{t(L.pkDone ? "verified" : "verifying")}</div><small>{t("passkeySub")}</small></div><button type="button" className="lk-link" data-face-go="auth">{t("cancel")}</button></>;
      default: return null;
    }
  };
  const onCardClick = (e: React.MouseEvent) => {
    const el = e.target as Element;
    const go = el.closest<HTMLElement>("[data-face-go]"); if (go) { showFace(go.dataset.faceGo as Face, go.dataset.faceGo === "auth" ? -1 : 1); return; }
    const pin = el.closest<HTMLElement>("[data-pin]"); if (pin) { pinPress(pin.dataset.pin!); return; }
    const u = el.closest<HTMLElement>("[data-lkacc]"); if (u) { lkPickUser(u.dataset.lkacc!); return; }
    const s = el.closest<HTMLElement>("[data-sso]"); if (s) { ssoGo(s); return; }
  };
  const unlockInner = () => {
    if (L.unlock.mode === "busy") return <H h={LKI.spin} />;
    if (L.unlock.mode === "ok") return <><H h={LKI.check} /><span>{L.unlock.text}</span></>;
    return <><H h={LKI.arrow} /><span className="lo" data-i18n="unlockBtn">{t("unlockBtn")}</span><span className="so" data-i18n="signIn">{t("signIn")}</span></>;
  };
  const ap2 = (id: string): Record<string, unknown> => {
    switch (id) {
      case "lockAv": return { style: { background: me?.bg } };
      case "lkForm": return { onSubmit: (e: React.FormEvent) => { e.preventDefault(); tryPassword(); } };
      // React re-applies `type` on every render of an input, so the visibility toggle is state (updEye mirrors the DOM).
      case "lkPass": return { onInput: passInput, type: L.eyeShown ? "text" : "password" };
      case "lkEye": return { "aria-label": t(L.eyeShown ? "hidePass" : "showPass"), "aria-pressed": L.eyeShown, onClick: eyeToggle };
      case "lkMsg": return { className: "lk-msg" + (L.msg.kind ? " " + L.msg.kind : "") };
      default: return {};
    }
  };
  const as = (id: string, fb: React.ReactNode): React.ReactNode => {
    switch (id) {
      case "lockAv": return me ? <>{me.photo ? <Photo src={me.photo} /> : me.org ? <H h={NI.people} /> : me.ini}<span className="st-dot" style={{ ["--sc" as string]: stOf(acc.status)[2] }}></span></> : fb;
      case "lockName": return me?.name ?? fb;
      case "lockRole": return me ? t(roleOf(me)) : fb;
      case "lkMsg": return L.msg.txt;
      case "unlockBtn": return <Fragment key={L.unlock.n}>{unlockInner()}</Fragment>;
      case "lkEye": return <H h={L.eyeShown ? LKI.eyeOff : LKI.eye} />;
      default: return fb;
    }
  };
  const barBtn = (kind: "lang" | "a11y" | "power") => (e: React.MouseEvent) => { stopAll(e); lkPop(kind, e.currentTarget.id); };
  const p = (id: string): Record<string, unknown> => {
    switch (id) {
      case "lock": return { onPointerMove: lockPointerMove, onPointerDown: lockPointerDown };
      case "lkCard": return { onClick: onCardClick };
      case "lkQuote": return { onClick: () => nextQuote("lk") };
      case "lkSwitch": return { onClick: (e: React.MouseEvent) => { stopAll(e); switchUserBtn(); } };
      case "lkLang": return { "aria-expanded": L.pop?.btn === "lkLang", onClick: barBtn("lang") };
      case "lkA11y": return { "aria-expanded": L.pop?.btn === "lkA11y", onClick: barBtn("a11y") };
      case "lkPower": return { "aria-expanded": L.pop?.btn === "lkPower", onClick: barBtn("power") };
      default: return {};
    }
  };
  const s = (id: string, fb: React.ReactNode): React.ReactNode => {
    switch (id) {
      case "lockTime": return <>{`${hh}:${mm}`}{ap ? <small>{ap.value}</small> : null}</>;
      case "lockDate": return new Intl.DateTimeFormat(loc(), { timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(now);
      case "lkQ": return <><b>{t(`q${L.q + 1}t`)}</b><small>{t(`q${L.q + 1}s`)}</small></>;
      case "lkLangCode": return lang.toUpperCase();
      case "lkCard": return <>
        <LockAuthMarkup t={t} p={ap2} s={as} />
        {(["pin", "users", "sso", "passkey"] as Face[]).map((f) => <div key={f} className={"lk-face" + (f === "pin" ? " pin-face" : "")} data-face={f} hidden><Fragment key={L.faceN[f]}>{L.faceN[f] ? face(f) : null}</Fragment></div>)}
      </>;
      default: return fb;
    }
  };
  const row = (k: "big" | "hc" | "rm", l: string) => <button key={k} role="menuitemcheckbox" aria-checked={!!L.set[k]} data-a={k}><span className="lbl">{t(l)}</span><span className="sw"></span></button>;
  const popBody = () => {
    switch (L.pop?.kind) {
      case "lang": return (Object.entries(LANGS) as [Lang, (typeof LANGS)[Lang]][]).map(([k, x]) => <button key={k} role="menuitemradio" aria-checked={k === L.pop!.lang} data-l={k}><span className="code">{k.toUpperCase()}</span><span className="lbl" lang={k}>{x.name}</span><H h={MI.ck} /></button>);
      case "a11y": return <>{row("big", "largerText")}{row("hc", "highContrast")}{row("rm", "reduceMotion")}<button data-a="osk"><span className="lbl">{t("osk")}</span><H h={MI.kbd} /></button></>;
      case "power": return <><button data-p="sleep"><H h={LKI.moon} /><span className="lbl">{t("sleep")}</span></button><button data-p="restart"><H h={SI.restart} /><span className="lbl">{t("restart")}</span></button><button data-p="shutdown"><H h={SI.power} /><span className="lbl">{t("shutdown")}</span></button></>;
    }
  };
  const onPopClick = (e: React.MouseEvent) => {
    const b = (e.target as Element).closest<HTMLElement>("button"); if (!b) return; stopAll(e);
    if (b.dataset.l) { closeLkPop(); switchLang(b.dataset.l as Lang); return; }
    if (b.dataset.a) { lkA11y(b.dataset.a); return; }
    if (b.dataset.p) lkPower(b.dataset.p);
  };
  // The popover is appended to #lock in the source (L9005): a portal into the lock element keeps it there.
  const [lockNode, setLockNode] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setLockNode(document.getElementById("lock")), []);
  return <>
    <LockMarkup t={t} p={p} s={s} />
    {lockNode && L.pop ? createPortal(<div key={L.pop.n} ref={popRef} className="lk-pop" role="menu" onClick={onPopClick}>{popBody()}</div>, lockNode) : null}
  </>;
}

export function PowerScreen() {
  const { t } = useI18n(); const P = usePower();
  const p = (id: string): Record<string, unknown> => {
    switch (id) {
      case "power": return { className: "power" + (P.on ? " on" : "") + (P.off ? " off" : "") };
      case "powerSpin": return { hidden: !P.spin };
      case "powerOn": return { hidden: !P.btn, onClick: powerOn };
      default: return {};
    }
  };
  return <PowerMarkup t={t} p={p} s={(id, fb) => (id === "powerMsg" ? P.msg : fb)} />;
}
