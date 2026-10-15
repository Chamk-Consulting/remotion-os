"use client";
/** Sign-in screen `#si` (markup L7106–L7120, behaviour L9068–L9253). */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANGS, type Lang } from "@/lib/i18n/langs";
import { stopAll } from "@/lib/events";
import { SvgString } from "@/os/shell/svg";
import { SignInMarkup } from "@/os/shell/generated/SignInMarkup";
import { MI } from "@/os/shortcuts/catalogue";
import { useShell } from "@/os/state/shell";
import { overlayHooks, setThemeModeFull, switchLang } from "@/os/shell/shellActions";
import { closeLkPop } from "@/os/lock/lock";

overlayHooks.closePops = () => { closeLkPop(); closeSiPop(); };
import { LKI } from "@/os/lock/LockScreen";
import { nextQuote, useLock } from "@/os/lock/lock";
import { closeSiPop, defEmail, installSi, loadSi, setSiTab, siCaps, siEye, siFieldInput, siGoScreen, siOnLang, siPointerMove, siProv, siRegister, siSubmit, siTakePw, siTile, useSi, type Tab } from "./si";

const H = ({ h }: { h: string }) => <SvgString html={h} />;
const SII = {
  mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>',
  lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>',
  org: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M2.5 21h19M8 8h3M8 12h3M8 16h3"/></svg>',
  key: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14.5 8.5l2.5 2.5"/></svg>',
  chevUp: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>',
  moon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>',
  sun: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  psc: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 2.5 20 6v6c0 5-3.5 8.5-8 9.5-4.5-1-8-4.5-8-9.5V6z" fill="#fff" stroke="#1f4fd1" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 8v8M8 12h8" stroke="#e23b3b" stroke-width="2.6" stroke-linecap="round"/></svg>',
  fc: '<svg width="26" height="26" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="#fff" stroke="#1f4fd1" stroke-width="1.6"/><circle cx="8.5" cy="11" r="2.2" fill="#1f4fd1"/><path d="M5.5 16c.5-1.6 1.6-2.4 3-2.4s2.5.8 3 2.4" stroke="#1f4fd1" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M14 10h4.5M14 13.5h3" stroke="#e23b3b" stroke-width="1.8" stroke-linecap="round"/></svg>',
  // Source L9085: twelve stars generated on a circle.
  eid: '<svg width="40" height="30" viewBox="0 0 40 30"><rect width="40" height="30" rx="4" fill="#1f45b5"/>' + Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6, x = 20 + 9 * Math.sin(a), y = 15 - 9 * Math.cos(a); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.4" fill="#f7d417"/>`; }).join("") + "</svg>",
};
const hexLogo = (s = 28) => `<svg width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2.6c.7 0 1.4.2 2 .5l8.6 5c1.2.7 2 2 2 3.4v9c0 1.4-.8 2.7-2 3.4l-8.6 5a4 4 0 0 1-4 0l-8.6-5a4 4 0 0 1-2-3.4v-9c0-1.4.8-2.7 2-3.4l8.6-5c.6-.3 1.3-.5 2-.5z" fill="#22b14c"/><circle cx="16" cy="16" r="5.6" fill="none" stroke="#fff" stroke-width="3"/></svg>`;
const PROV: [string, string | null, string][] = [["Microsoft", "Entra ID", '<span class="mono" style="background:#2f8ef0">M</span>'], ["Google", "Workspace", '<span class="mono" style="background:#e8453c">G</span>'], ["Apple", null, '<span class="mono" style="background:#1d2420">A</span>'], ["passkey", "WebAuthn", `<span class="mono" style="background:#22b14c">${SII.key.replace('stroke="currentColor"', 'stroke="#fff"')}</span>`]];
const GOV: [string, string, string, string][] = [["Pro Santé Connect", "pscSub", SII.psc, "#eaf0ff"], ["FranceConnect", "fcSub", SII.fc, "#eaf0ff"], ["European eID", "eidSub", SII.eid, "transparent"]];

export function SignIn() {
  const { t, lang } = useI18n();
  const S = useSi(); const isDark = useShell((s) => s.isDark); const q = useLock((s) => s.q);
  useEffect(() => { loadSi(); return installSi(); }, []);
  const prevLang = useRef(lang);
  useLayoutEffect(() => { if (prevLang.current !== lang) { prevLang.current = lang; siOnLang(); } }, [lang]);
  useLayoutEffect(() => siTakePw(), [S.n]);
  const [siNode, setSiNode] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setSiNode(document.getElementById("si")), []);
  const popRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const p = popRef.current; if (!p || !S.pop) return;
    const r = document.getElementById("siLang")!.getBoundingClientRect(), w = p.offsetWidth, left = Math.min(Math.max(8, r.right - w), innerWidth - w - 8);
    p.style.left = left + "px"; p.style.top = r.bottom + 8 + "px"; p.style.setProperty("--ox", r.left + r.width / 2 - left + "px");
    setTimeout(() => p.querySelector("button")?.focus({ preventScroll: true }), 40);
  }, [S.pop]);

  const d = S.dom, rtlS = typeof document !== "undefined" && document.documentElement.dir === "rtl" ? -1 : 1;
  const btn = (icon: string, label: string) => (
    <button className={"si-btn" + (d.btn.mode === "busy" ? " busy" : d.btn.mode === "ok" ? " ok" : "")} type="submit" disabled={!!d.btn.disabled}>
      {d.btn.mode === "busy" ? <><H h={LKI.spin} /><span>{d.btn.label}</span></> : d.btn.mode === "ok" ? <><H h={LKI.check} /><span>{d.btn.label}</span></> : <><H h={icon} /><span>{label}</span></>}
    </button>);
  const msg = <p className={"si-msg" + (d.msg.kind ? " " + d.msg.kind : "")} id="siMsg" aria-live="polite">{d.msg.txt}</p>;
  const email = <label className="si-field" id="siEmailF"><H h={SII.mail} /><input id="siEmail" type="email" autoComplete="username" dir="ltr" placeholder={t("emailPh")} aria-label={t("emailPh")} defaultValue={d.fresh ? "" : defEmail()} /></label>;
  const view = (k: Tab) => {
    if (k === "email") return <form className="si-view" id="siForm" data-kind="email" noValidate>
      {email}
      <label className="si-field" id="siPassF"><H h={SII.lock} /><input id="siPass" type={d.passShown ? "text" : "password"} autoComplete="current-password" placeholder={t("passPh")} aria-label={t("passPh")} /><button type="button" id="siEye" aria-label={t(d.passShown ? "hidePass" : "showPass")}><H h={d.passShown ? LKI.eyeOff : LKI.eye} /></button></label>
      <div className="si-row"><label className="si-check"><input type="checkbox" id="siRem" defaultChecked={S.remember} />{t("remember")}</label><button type="button" className="si-link" data-forgot="">{t("forgot")}</button></div>
      {btn(LKI.arrow, t("signIn"))}{msg}</form>;
    if (k === "sso") return <form className="si-view" id="siForm" data-kind="sso" noValidate><p className="si-intro">{t("ssoIntro")}</p>
      <label className="si-field" id="siSsoF"><H h={SII.org} /><input id="siSso" type="text" dir="ltr" autoComplete="organization" placeholder={t("ssoDomainPh")} aria-label={t("ssoDomainPh")} /></label>
      {btn(LKI.arrow, t("continueBtn"))}{msg}</form>;
    return <form className="si-view" id="siForm" data-kind="passkey" noValidate><div className={"pk pk-mini" + (d.pk.idle ? " idle" : "") + (d.pk.done ? " done" : "")} id="siPk"><div className="pk-ring"><H h={LKI.fp} /><H h={LKI.okBig} /></div><small>{t("passkeySub")}</small></div>
      {btn(SII.key, t("pkBtn"))}{msg}</form>;
  };
  const tabs: Tab[] = ["email", "sso", "passkey"], ti = tabs.indexOf(S.tab);
  const tile = (key: string) => (d.tile ? (d.tile === key ? " busy" : " dim") : "");
  const main = <>
    <div className="si-tabs" role="tablist"><span className="ind" style={{ transform: `translateX(${ti * 100 * rtlS}%)` }}></span>{tabs.map((k) => <button key={k} type="button" role="tab" aria-selected={k === S.tab} data-tab={k}>{t(k === "email" ? "tabEmail" : k === "sso" ? "tabSso" : "passkey")}</button>)}</div>
    <div className="si-views" id="siViews"><Fragment key={S.vn}>{view(S.tab)}</Fragment></div>
    <div className="si-or"><span>{t("orContinueCap")}</span></div>
    <div className="si-prov">{PROV.map(([n, sub, ic]) => <button key={n} type="button" className={"si-tile" + tile("prov:" + n)} data-prov={n}><span className="tb" dangerouslySetInnerHTML={{ __html: ic }} />{n === "passkey" ? t("passkey") : n}<small>{sub ?? t("signIn")}</small></button>)}</div>
    <section className={"si-gov" + (S.gov ? "" : " closed")}><button type="button" className="si-gov-h" aria-expanded={S.gov} data-gov-toggle="">{t("govTitle")}<H h={SII.chevUp} /></button>
      <div className="si-gov-b"><div><div className="si-gov-g">{GOV.map(([n, sub, ic, bg]) => <button key={n} type="button" className={"si-tile" + tile("gov:" + n)} data-gov={n}><span className="tb"><span className="gi" style={{ background: bg }}><H h={ic} /></span><b>{n}</b><small>{t(sub)}</small></span></button>)}</div></div></div></section>
  </>;
  const reset = <>
    <button type="button" className="si-back" data-back=""><span className="bk"><H h={MI.back} /></span>{t("backToSignIn")}</button>
    {d.done !== null
      ? <div className="si-done" id="siForm" data-kind="done"><span className="ring"><H h={LKI.check} /></span><b>{t("checkInbox")}</b><p>{t("checkInboxSub", { x: d.done })}</p><button type="button" className="si-btn" data-back="" style={{ width: "100%" }}>{t("backToSignIn")}</button></div>
      : <form className="si-view" id="siForm" data-kind="reset" noValidate><p className="si-intro"><b style={{ fontSize: 16, display: "block", marginBottom: 4, opacity: 1 }}>{t("resetTitle")}</b>{t("resetSub")}</p>{email}{btn(SII.mail, t("sendLink"))}{msg}</form>}
  </>;
  const onClick = (e: React.MouseEvent) => {
    const el = e.target as Element;
    const tab = el.closest<HTMLElement>("[data-tab]"); if (tab) { setSiTab(tab.dataset.tab as Tab); return; }
    if (el.closest("#siEye")) { siEye(); return; }
    if (el.closest("[data-forgot]")) { siGoScreen("reset"); return; }
    if (el.closest("[data-back]")) { siGoScreen("main"); return; }
    if (el.closest("[data-register]")) { siRegister(); return; }
    if (el.closest("[data-help]")) { useShell.getState().showToast(t("notInPreview", { x: t("contactAdmin") })); return; }
    if (el.closest("[data-gov-toggle]")) { useSi.setState({ gov: !useSi.getState().gov }); return; }
    const pv = el.closest<HTMLElement>("[data-prov]"); if (pv) { siProv(pv.dataset.prov!); return; }
    const gv = el.closest<HTMLElement>("[data-gov]"); if (gv) { siTile("gov:" + gv.dataset.gov, gv.dataset.gov!); return; }
  };
  const p = (id: string): Record<string, unknown> => {
    switch (id) {
      case "si": return { onPointerDown: (e: React.PointerEvent) => { if (useSi.getState().pop && !(e.target as Element).closest(".si-pop,#siLang")) closeSiPop(); }, onPointerMove: siPointerMove };
      case "siLang": return { "aria-expanded": S.pop, onClick: (e: React.MouseEvent) => { stopAll(e); useSi.setState({ pop: !useSi.getState().pop }); } };
      case "siTheme": return { onClick: (e: React.MouseEvent) => setThemeModeFull(isDark ? "light" : "dark", e.currentTarget) };
      case "siQuote": return { onClick: () => nextQuote("si") };
      case "siScroll": return { onClick, onSubmit: (e: React.FormEvent) => { e.preventDefault(); siSubmit(e.target as HTMLElement); }, onInput: siFieldInput, onKeyDown: siCaps };
      default: return {};
    }
  };
  const s = (id: string, fb: React.ReactNode): React.ReactNode => {
    switch (id) {
      case "siLangCode": return lang.toUpperCase();
      case "siTheme": return <H h={isDark ? SII.sun : SII.moon} />;
      case "siQ": return <><b>{t(`q${q + 1}t`)}</b><small>{t(`q${q + 1}s`)}</small></>;
      case "siScroll": return <Fragment key={S.n}>
        <div className="si-head"><div className="lg" id="siHeadTitle"><H h={hexLogo(30)} />remotion <span>OS</span></div><small>{t("siSub")}</small></div>
        {S.screen === "reset" ? reset : main}
        <div className="si-foot"><span>{t("noAccount")}</span><button type="button" className="si-link" data-register="">{t("createOne")}</button><span style={{ flexBasis: "100%", height: 2 }}></span><button type="button" className="si-link" data-help="">{t("needHelp")}</button><button type="button" className="si-link" data-help="">{t("contactAdmin")}</button></div>
      </Fragment>;
      default: return fb;
    }
  };
  const onPop = (e: React.MouseEvent) => { const b = (e.target as Element).closest<HTMLElement>("[data-l]"); if (!b) return; stopAll(e); closeSiPop(); switchLang(b.dataset.l as Lang); };
  return <>
    <SignInMarkup t={t} p={p} s={s} />
    {siNode && S.pop ? createPortal(<div ref={popRef} className="si-pop" role="menu" onClick={onPop}>{(Object.entries(LANGS) as [Lang, (typeof LANGS)[Lang]][]).map(([k, x]) => <button key={k} role="menuitemradio" aria-checked={k === lang} data-l={k}><span className="code">{k.toUpperCase()}</span><span lang={k}>{x.name}</span><H h={MI.ck} /></button>)}</div>, siNode) : null}
  </>;
}
