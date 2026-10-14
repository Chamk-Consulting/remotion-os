"use client";
/** Account menu `#accMenu` (L10302–L10395): status, profile, profiles, accounts, locations & departments. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANGS } from "@/lib/i18n/langs";
import { stopAll } from "@/lib/events";
import { useShell } from "@/os/state/shell";
import { SvgString } from "@/os/shell/svg";
import { placeMenu, showView } from "@/os/menu/views";
import { MI, SI } from "@/os/shortcuts/catalogue";
import { Kbds } from "@/os/shortcuts/ShortcutsPanel";
import { setSysMenu } from "@/os/shortcuts/actions";
import { osActions } from "@/os/actions";
import { NI, openNc, unreadCount, useNc } from "@/os/notifications/nc";
import { AI, PROFILES, STATUSES, UNI, curAcc, curUnit, homeOrg, replay, roleOf, saveAcc, setStatus, stOf, unitsOf, useAccount, whoSwap, type Account } from "./store";

const VIEWS = ["main", "profile", "profiles", "accounts", "units"];
export const accApi = { open: (open: boolean, view?: string) => useAccount.setState((s) => ({ open, view: open && view ? { v: view, n: (s.view?.n ?? 0) + 1 } : null })) };
const H = ({ h }: { h: string }) => <SvgString html={h} />;
/** avatarHTML (L10232). */
export function Avatar({ a, cls = "", dot = true }: { a: Account; cls?: string; dot?: boolean }) {
  const status = useAccount((s) => s.status);
  // eslint-disable-next-line @next/next/no-img-element -- user photo is a data URL from localStorage (source avInner L10230)
  return <span className={`avatar${a.org ? " org" : ""} ${cls}`} style={{ background: a.bg }}>{a.photo ? <img src={a.photo} alt="" /> : a.org ? <H h={NI.people} /> : a.ini}{dot ? <span className="st-dot" style={{ ["--sc" as string]: stOf(status)[2] }}></span> : null}</span>;
}

export function AccountMenu() {
  const { t, nf, lang } = useI18n();
  const acc = useAccount(); useNc((s) => s.rev);
  const ref = useRef<HTMLDivElement | null>(null), vp = useRef<HTMLDivElement | null>(null);
  const [stOpen, setStOpen] = useState(false);
  const [swap, setSwap] = useState(0);
  const [openSite, setOpenSite] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ s: string; d: string } | null>(null);
  useLayoutEffect(() => { vp.current!.querySelectorAll<HTMLElement>(".kbm-view").forEach((v) => (v.hidden = v.dataset.view !== "main")); }, []);
  // setAccMenu(open, view): render, show main instantly, place, optionally slide; focus the status button.
  // The profile view shows the status from its last render (on open and after a switch), not live (as the source).
  const [profStatus, setProfStatus] = useState("online");
  const [was, setWas] = useState(false); const [ever, setEver] = useState(false); // views are first rendered on open (renderAcc)
  if (was !== acc.open) { setWas(acc.open); if (acc.open) { setEver(true); setProfStatus(acc.status); setOpenSite(null); setPending(null); setSwap(0); } }
  useLayoutEffect(() => {
    if (!acc.open) return;
    showView(vp.current, "main", 0, true); placeMenu(ref.current!, document.getElementById("accBtn")!, (w) => w - 50);
    const v = acc.view?.v;
    const id = v ? setTimeout(() => showView(vp.current, v, 1, false), 120) : setTimeout(() => document.getElementById("accStBtn")?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(id);
  }, [acc.open, acc.view]);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (!(e.target as Element).closest?.("#accMenu,#accBtn") && useAccount.getState().open) accApi.open(false); };
    const rs = () => { if (useAccount.getState().open) placeMenu(ref.current!, document.getElementById("accBtn")!, (w) => w - 50); };
    document.addEventListener("click", out); addEventListener("resize", rs);
    return () => { document.removeEventListener("click", out); removeEventListener("resize", rs); };
  }, []);
  if (!acc.accounts.length) return <div ref={ref} className="pop kbm accm closed" id="accMenu" role="menu" aria-labelledby="accBtn"><span className="caret" aria-hidden="true"></span><div className="kbm-vp" id="accVp" ref={vp}>{VIEWS.map((v) => <section key={v} className="kbm-view" data-view={v}></section>)}</div></div>;

  const a = curAcc(), o = homeOrg(), u = curUnit(o), us = unitsOf(o);
  const unitLine = `${u.site.city} · ${t("dp_" + u.dept[0])}`;
  const back = (title: string) => <button className="kbm-back" data-go="main" role="menuitem"><span className="bk"><H h={MI.back} /></span>{title}</button>;
  const item = (ic: string, label: string, attrs: Record<string, unknown>, right?: React.ReactNode, cls = "") => <button className={"kbm-item" + cls} role="menuitem" {...attrs}><span className="ic"><H h={ic} /></span><span className="lbl">{label}</span>{right}</button>;
  const go = <span className="go"><H h={MI.go} /></span>;
  const unread = unreadCount();
  const statusLabel = <>{t(stOf(acc.status)[1])}{acc.autoAway ? <> <small>· {t("autoAway")}</small></> : null}</>;
  const sel = pending || { s: u.site.id, d: u.dept[0] };
  const siteOpen = (id: string) => (openSite ?? u.site.id) === id;
  const view = (name: string) => {
    if (name === "main") return <>
      <div className={"acc-head" + (swap ? " swap" : "")} key={"h" + swap}><Avatar a={a} cls="xl" /><div className="acc-id"><b dir="auto">{a.name}</b><button className="acc-role" data-go="profiles">{t(roleOf(a))}<H h={AI.chevD} /></button><button className="acc-unit" data-go="units" aria-label={`${t("unitTitle")}: ${unitLine}`}><H h={UNI.pinS} /><span dir="auto">{unitLine}</span></button>{a.email ? <small>{a.email}</small> : null}</div></div>
      <div className={"acc-status" + (stOpen ? " open" : "")} id="accStatus"><button className="acc-st-btn" id="accStBtn" aria-expanded={stOpen}><span className="sdot" style={{ ["--sc" as string]: stOf(acc.status)[2] }}></span><span id="accStLbl">{statusLabel}</span><span className="go"><H h={MI.go} /></span></button>
        <div className="acc-st-list"><div role="radiogroup">{STATUSES.map(([k, l, c], i) => <button key={k} className="st-opt" role="radio" tabIndex={stOpen ? 0 : -1} aria-checked={k === acc.status} data-st={k} style={{ ["--i" as string]: i }}><span className="sdot" style={{ ["--sc" as string]: c }}></span>{t(l)}<H h={MI.ck} /></button>)}</div></div></div>
      {item(AI.user, t("myProfile"), { "data-go": "profile" }, go)}
      {item(AI.shield, t("accSecurity"), { "data-act": "security" })}
      {item(AI.palette, t("appearance"), { "data-act": "appearance" })}
      {item(AI.langReg, t("langRegion"), { "data-act": "lang" }, <span className="val">{LANGS[lang].name}</span>)}
      {item(AI.bell, t("notifications"), { "data-act": "notif" }, unread ? <span className="chip" style={{ height: 22, padding: "0 8px", background: "var(--red)", color: "#fff", fontSize: 11.5 }}>{nf(unread)}</span> : null)}
      {item(MI.kbd, t("kbAndSc"), { "data-act": "kb" })}
      <div className="kbm-sep"></div>
      {item(AI.swap, t("switchOrg"), { "data-go": "accounts" }, <><span className="val un-val" dir="auto">{o.short || o.name}</span>{go}</>)}
      {item(UNI.pin, t("unitTitle"), { "data-go": "units" }, <><span className="val un-val" dir="auto">{u.site.city}</span>{go}</>)}
      {item(AI.user.replace("<circle", '<path d="M17 3.5a3 3 0 0 1 0 6M20.5 21c-.3-2.4-1.4-4.3-3-5.5"/><circle'), t("switchProfile"), { "data-go": "profiles" }, <><span className="val">{t(roleOf(a))}</span>{go}</>)}
      <div className="kbm-sep"></div>
      {item(SI.lock, t("lock"), { "data-act": "lock" }, <Kbds combo="Ctrl+Alt+L" />)}{item(SI.restart, t("restart"), { "data-act": "restart" })}
      <div className="kbm-sep"></div>
      {item(AI.out, t("signOut"), { "data-act": "signout" }, null, " danger")}
    </>;
    if (name === "profile") {
      const rows: [string, string][] = [["profileRole", t(roleOf(a))], ["orgLbl", o.name], ["unitLoc", `${u.site.city} · ${t(u.site.kind)}`], ["unitDept", t("dp_" + u.dept[0])], ...(a.email ? [["profileEmail", a.email] as [string, string]] : []), ["fStatus", t(stOf(profStatus)[1])], ["language", LANGS[lang].name], ["infoTz", Intl.DateTimeFormat().resolvedOptions().timeZone]];
      return <>{back(t("myProfile"))}<div className="prof"><Avatar a={a} /><b dir="auto">{a.name}</b><small>{t(roleOf(a))}</small></div>{rows.map(([k, v]) => <div className="info-row" key={k}><span>{t(k)}</span><b dir="auto">{v}</b></div>)}</>;
    }
    if (name === "profiles") return <>{back(t("switchProfile"))}{PROFILES.map((p, i) => <button key={p.id} className="acc-opt" role="menuitemradio" aria-checked={p.id === acc.prof && !a.org} data-prof={p.id} style={{ ["--i" as string]: i }}><span className="avatar org" style={{ background: p.bg }}><H h={p.ic} /></span><span className="tx"><b>{t(p.role)}</b><small dir="auto">{acc.accounts[0].name}</small></span><H h={MI.ck} /></button>)}</>;
    if (name === "accounts") return <>{back(t("switchAcc"))}{acc.accounts.map((x, i) => <button key={x.id} className="acc-opt" role="menuitemradio" aria-checked={x.id === acc.accId} data-acc={x.id} style={{ ["--i" as string]: i }}><Avatar a={x} dot={x.id === acc.accId} /><span className="tx"><b dir="auto">{x.name}</b><small>{t(roleOf(x))}{x.org ? ` · ${t("unitSites", { n: nf(unitsOf(x).length) })}` : ""}</small></span><H h={MI.ck} /></button>)}
      <button className="acc-opt acc-add" data-act="add" style={{ ["--i" as string]: acc.accounts.length }}><span className="pi2"><H h={AI.plus} /></span><span className="tx"><b style={{ fontWeight: 500 }}>{t("addAccount")}</b></span></button></>;
    if (name === "units") return <>{back(t("unitTitle"))}
      <div className="un-org"><Avatar a={o} dot={false} /><div className="tx"><b dir="auto">{o.name}</b><small>{t("unitSites", { n: nf(us.length) })} · {t("unitDepts", { n: nf(us.reduce((n, s) => n + s.depts.length, 0)) })}</small></div></div>
      <div className="un-list">{us.map((s, i) => { const open = siteOpen(s.id), cur = s.id === u.site.id;
        return <div key={s.id} className={"un-site" + (open ? " open" : "") + (cur ? " cur" : "")} style={{ ["--i" as string]: i }} data-site={s.id}>
          <button className="un-sh" data-usite={s.id} aria-expanded={open}><span className="un-pin"><H h={UNI.pin} /></span><span className="tx"><b dir="auto">{s.city} <i>· {t(s.kind)}</i></b>{s.addr ? <small dir="auto">{s.addr}</small> : <small>{t("unitRemote")}</small>}</span>{cur ? <span className="un-cur">{t("unitCurrent")}</span> : null}<span className="un-chev"><H h={UNI.chev} /></span></button>
          <div className="un-depts"><div className="un-in" role="group" aria-label={s.city}>{s.depts.map(([k, c, n], j) => <button key={k} className={"un-d" + (busy === s.id + "|" + k ? " busy" : "")} role="menuitemradio" aria-checked={sel.s === s.id && sel.d === k} data-udept={s.id + "|" + k} tabIndex={open ? 0 : -1} style={{ ["--c" as string]: c, ["--j" as string]: j }}><span className="un-dic"></span><span className="nm">{t("dp_" + k)}</span><small className="un-n"><H h={UNI.ppl} />{nf(n)}</small><H h={MI.ck} /></button>)}</div></div>
        </div>; })}</div></>;
  };
  const toMain = (ms: number) => setTimeout(() => { setSwap((x) => x + 1); setProfStatus(useAccount.getState().status); showView(vp.current, "main", -1, false); }, ms);
  const onClick = (e: React.MouseEvent) => {
    stopAll(e); const b = (e.target as Element).closest<HTMLButtonElement>("button"); if (!b) return; const d = b.dataset;
    if (d.go) { showView(vp.current, d.go, d.go === "main" ? -1 : 1, false); return; }
    if (b.id === "accStBtn") { toggleSt(); return; }
    if (d.st) { setStatus(d.st); setTimeout(() => toggleSt(false), 260); return; }
    if (d.acc) { if (d.acc === acc.accId) return; useAccount.setState({ accId: d.acc }); saveAcc(); whoSwap(); requestAnimationFrame(() => replay(`#accVp [data-acc="${d.acc}"] .st-dot`, "pop")); useShell.getState().showToast(t("switched", { x: curAcc().name })); toMain(380); return; }
    if (d.prof) { const wasOrg = !!curAcc().org; if (d.prof === acc.prof && !wasOrg) return; useAccount.setState(wasOrg ? { prof: d.prof, accId: "me" } : { prof: d.prof }); saveAcc(); whoSwap(); useShell.getState().showToast(t("profileSet", { x: t(PROFILES.find((p) => p.id === d.prof)!.role) })); toMain(380); return; }
    if (d.usite) { setOpenSite(siteOpen(d.usite) ? "" : d.usite); return; }
    if (d.udept) {
      const [sid, dk] = d.udept.split("|"); if (u.site.id === sid && u.dept[0] === dk) return;
      setPending({ s: sid, d: dk }); setBusy(d.udept);
      setTimeout(() => {
        setBusy(null); const unitSel = { ...useAccount.getState().unitSel, [o.id]: { s: sid, d: dk } }; useAccount.setState({ unitSel }); try { localStorage.setItem("remotion-units", JSON.stringify(unitSel)); } catch {}
        setPending(null); whoSwap(); const nu = curUnit(o); useShell.getState().showToast(t("unitSet", { d: t("dp_" + nu.dept[0]), s: nu.site.city })); toMain(420);
      }, 420);
      return;
    }
    const act = d.act; if (!act) return;
    if (act === "security") { useShell.getState().showToast(t("notInPreview", { x: t("accSecurity") })); return; }
    if (act === "add") { accApi.open(false); osActions.signin(true); return; }
    accApi.open(false);
    ({ appearance: () => setSysMenu(true, "appearance"), lang: () => setSysMenu(true, "language"), notif: openNc, kb: () => osActions.kbMenu(true), signout: () => osActions.signout(), lock: () => osActions.lock(), restart: () => osActions.restart() } as Record<string, () => void>)[act]?.();
  };
  function toggleSt(force?: boolean) {
    const o2 = force ?? !stOpen; setStOpen(o2);
    if (o2) setTimeout(() => document.querySelector<HTMLElement>('#accStatus .st-opt[aria-checked="true"]')?.focus({ preventScroll: true }), 120);
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = [...ref.current!.querySelectorAll<HTMLButtonElement>(".kbm-view:not([hidden]) button")].filter((b) => b.tabIndex !== -1), i = items.indexOf(document.activeElement as HTMLButtonElement);
    const rtl = document.documentElement.dir === "rtl", bwd = rtl ? "ArrowRight" : "ArrowLeft", fwd = rtl ? "ArrowLeft" : "ArrowRight"; const ae = document.activeElement as HTMLElement | null;
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === fwd && ae?.dataset.go && ae.dataset.go !== "main") { e.preventDefault(); ae.click(); }
    else if (e.key === bwd) { if (vp.current!.querySelector<HTMLElement>('[data-view="main"]')!.hidden) { e.preventDefault(); showView(vp.current, "main", -1, false); } else if (stOpen) { e.preventDefault(); toggleSt(false); document.getElementById("accStBtn")?.focus(); } }
    else if (e.key === "Escape") { e.stopPropagation(); accApi.open(false); document.getElementById("accBtn")?.focus(); }
  };
  return (
    <div ref={ref} className={"pop kbm accm" + (acc.open ? "" : " closed")} id="accMenu" role="menu" aria-labelledby="accBtn" onClick={onClick} onKeyDown={onKeyDown}>
      <span className="caret" aria-hidden="true"></span>
      <div className="kbm-vp" id="accVp" ref={vp}>{VIEWS.map((v) => <section key={v} className="kbm-view" data-view={v}>{ever ? view(v) : null}</section>)}</div>
    </div>
  );
}
