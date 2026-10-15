"use client";
/** System (gear) menu `#sysMenu` with 8 sliding views (L8687–L8798). */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANGS, type Lang } from "@/lib/i18n/langs";
import { stopAll } from "@/lib/events";
import { toggleIcons, toggleWidgets, useShell } from "@/os/state/shell";
import { osActions } from "@/os/actions";
import { panelApi } from "@/os/windows/wm";
import { renderWs } from "@/os/windows/workspaces";
import { placeMenu, showView } from "@/os/menu/views";
import { CAT_IC, MI, SI } from "@/os/shortcuts/catalogue";
import { Kbds, scApi } from "@/os/shortcuts/ShortcutsPanel";
import { ACTIONS, setSysMenu } from "@/os/shortcuts/actions";
import { setThemeModeFull, switchLang } from "./shellActions";
import { SvgString } from "./svg";

const PLUS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const VIEWS = ["main", "appearance", "language", "workspaces", "desktops", "ai", "info", "news"];
const anchor = () => { const b = document.getElementById("sysBtn") as HTMLElement | null; return b && b.offsetParent ? b : document.querySelector(".who")!; };

export function SysMenu() {
  const { t, lang, nf } = useI18n();
  const s = useShell();
  const ref = useRef<HTMLDivElement | null>(null), vp = useRef<HTMLDivElement | null>(null);
  const [hl, setHl] = useState(true);
  // Initial hidden state of the views (markup: all but "main" hidden).
  useLayoutEffect(() => { vp.current!.querySelectorAll<HTMLElement>(".kbm-view").forEach((v) => (v.hidden = v.dataset.view !== "main")); }, []);
  // setSysMenu(open, view): render, show "main" instantly, place, optionally slide to the view; focus the first item.
  const [prevOpen, setPrevOpen] = useState(false);
  // renderSysMenu renders every view ONCE when the menu opens; only "appearance" is re-rendered later (toggleWidgets /
  // toggleIcons) and the radio rows update their own aria-checked. So the other views show the state at opening time
  // (e.g. the desktops list after a workspace switch is stale: D-A28 reproduced).
  const take = () => ({ desks: s.desks.map((d) => d.n), cur: s.cur, workspaces: s.workspaces, selWs: s.selWs, lang, isDark: s.isDark, themeMode: s.themeMode });
  const [snap, setSnap] = useState(take);
  if (prevOpen !== s.sysOpen) { setPrevOpen(s.sysOpen); if (s.sysOpen) { setHl(true); setSnap(take()); } }
  useLayoutEffect(() => {
    if (!s.sysOpen) return;
    showView(vp.current, "main", 0, true); placeMenu(ref.current!, anchor(), (w) => w - 70);
    const v = s.sysView?.v;
    // Timers are not cancelled on close, like the source (L8758–L8761).
    if (v) setTimeout(() => showView(vp.current, v, 1, false), 120); else setTimeout(() => ref.current!.querySelector<HTMLElement>('[data-view="main"] .kbm-item')?.focus({ preventScroll: true }), 60);
  }, [s.sysOpen, s.sysView]);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (!(e.target as Element).closest?.("#sysMenu,#sysBtn")) { if (useShell.getState().sysOpen) setSysMenu(false); } };
    const rs = () => { if (useShell.getState().sysOpen) placeMenu(ref.current!, anchor(), (w) => w - 70); };
    document.addEventListener("click", out); addEventListener("resize", rs);
    return () => { document.removeEventListener("click", out); removeEventListener("resize", rs); };
  }, []);

  const rtlS = typeof document !== "undefined" && document.documentElement.dir === "rtl" ? -1 : 1;
  const item = (ic: string, label: string, attrs: Record<string, unknown>, right?: React.ReactNode, cls = "kbm-item") => <button className={cls} role="menuitem" {...attrs}><span className="ic"><SvgString html={ic} /></span><span className="lbl">{label}</span>{right}</button>;
  const go = <span className="go"><SvgString html={MI.go} /></span>;
  const back = (title: string) => <button className="kbm-back" data-go="main" role="menuitem"><span className="bk"><SvgString html={MI.back} /></span>{title}</button>;
  const sw = (on: boolean, key: string, label: string) => <button className="set-row" role="menuitemcheckbox" aria-checked={on} data-sw={key}><span>{t(label)}</span><span className="sw"></span></button>;
  const opt = (attr: string, val: string | number, on: boolean, label: React.ReactNode, extra?: React.ReactNode) => <button className="opt" role="menuitemradio" aria-checked={on} {...{ [attr]: val }}><span className="lbl">{label}</span>{extra}<SvgString html={MI.ck} /></button>;
  const modes = ["light", "dark", "auto"] as const, mi = modes.indexOf(s.themeMode);
  const wsName = (w: { k?: string; n?: number }) => (w.k ? t(w.k) : t("workspaceN", { n: nf(w.n!) }));
  const info = () => {
    if (typeof navigator === "undefined") return [];
    const nav = navigator as Navigator & { userAgentData?: { brands?: { brand: string; version: string }[] } };
    const ua = nav.userAgentData?.brands?.filter((b) => !/Not.?A.?Brand|Chromium/i.test(b.brand)).map((b) => b.brand + " " + b.version)[0] || (navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/) || ["—"])[0].replace("Edg", "Edge").replace("/", " ").replace(/(\d+)\.[\d.]+/, "$1");
    return [["infoVersion", t("infoVersionVal")], ["infoBrowser", ua], ["infoScreen", `${nf(screen.width)} × ${nf(screen.height)} · ${devicePixelRatio}x`], ["language", LANGS[snap.lang].name], ["infoTz", Intl.DateTimeFormat().resolvedOptions().timeZone], ["theme", t(snap.isDark ? "themeD" : "themeL") + (snap.themeMode === "auto" ? " · " + t("themeA") : "")], ["infoNet", t(navigator.onLine ? "online" : "offline")]];
  };
  const view = (name: string) => {
    switch (name) {
      case "main": return <>
        {item(SI.gear, t("settings"), { "data-act": "settingsApp" }, <Kbds combo="Ctrl+Comma" />)}
        {item(MI.kbd, t("kbShortcuts"), { "data-act": "shortcuts" }, <Kbds combo="Ctrl+Slash" />, hl ? "kbm-item hl" : "kbm-item")}
        {item(SI.sun, t("appearance"), { "data-go": "appearance" }, go)}
        {item(SI.globe, t("language"), { "data-go": "language" }, <><span className="val">{LANGS[snap.lang].name}</span>{go}</>)}
        {item(CAT_IC.grid, t("workspaces"), { "data-go": "workspaces" }, go)}
        {item(CAT_IC.monitor, t("desktops"), { "data-go": "desktops" }, go)}
        {item(CAT_IC.spark, t("ai"), { "data-go": "ai" }, go)}
        <div className="kbm-sep"></div>
        {item(SI.info, t("sysInfo"), { "data-go": "info" })}{item(SI.help, t("help"), { "data-act": "help" })}{item(SI.gift, t("whatsNew"), { "data-go": "news" })}
        <div className="kbm-sep"></div>
        {item(SI.lock, t("lock"), { "data-act": "lock" }, <Kbds combo="Ctrl+Alt+L" />)}{item(SI.restart, t("restart"), { "data-act": "restart" })}{item(SI.power, t("shutdown"), { "data-act": "shutdown" })}
      </>;
      case "appearance": return <>{back(t("appearance"))}
        <div className="kv"><span>{t("theme")}</span><div className="seg" role="radiogroup"><span className="thumb-ind" style={{ transform: `translateX(${mi * 100 * rtlS}%)` }}></span>{modes.map((m, j) => <button key={m} role="radio" aria-checked={m === s.themeMode} data-ptheme={m}>{t(["themeL", "themeD", "themeA"][j])}</button>)}</div></div>
        {sw(!s.widgetsHidden, "widgets", "showWidgets")}{sw(!s.iconsHidden, "icons", "showIcons")}{sw(!s.navHidden, "navbar", "showNavbar")}</>;
      case "language": return <>{back(t("language"))}{(Object.entries(LANGS) as [Lang, (typeof LANGS)[Lang]][]).map(([k, L]) => <Fragment key={k}>{opt("data-lang-set", k, k === snap.lang, <span lang={k}>{L.name}</span>, <span className="val">{k.toUpperCase()}</span>)}</Fragment>)}</>;
      case "workspaces": return <>{back(t("workspaces"))}{snap.workspaces.map((w, i) => <Fragment key={i}>{opt("data-ws-set", i, i === snap.selWs, wsName(w))}</Fragment>)}<div className="kbm-sep"></div>{item(PLUS, t("addWorkspace"), { "data-act": "wsNew" })}</>;
      case "desktops": return <>{back(t("desktops"))}{snap.desks.map((n, i) => <Fragment key={i}>{opt("data-desk-set", i, i === snap.cur, n || t("desktopN", { n: nf(i + 1) }))}</Fragment>)}<div className="kbm-sep"></div>{item(PLUS, t("addDesktop"), { "data-act": "dNew" })}{item(CAT_IC.grid, t("overview"), { "data-act": "dOverview" }, <Kbds combo="Ctrl+Win+Tab" />)}</>;
      case "ai": return <>{back(t("ai"))}{item(CAT_IC.spark, t("aiOpen"), { "data-row": "aiOpen" }, <Kbds combo="Ctrl+Alt+A" />)}{item(CAT_IC.chat, t("aiSummarize"), { "data-row": "aiSummarize" }, <Kbds combo="Ctrl+Alt+U" />)}{item(CAT_IC.search, t("aiAsk"), { "data-row": "aiAsk" }, <Kbds combo="Ctrl+Alt+S" />)}</>;
      case "info": return <>{back(t("sysInfo"))}{info().map(([k, v]) => <div className="info-row" key={k}><span>{t(k)}</span><b dir="auto">{v}</b></div>)}</>;
      case "news": return <>{back(t("whatsNew"))}{[1, 2, 3, 4, 5, 6].map((n, i) => <div className="news-row" key={n} style={{ ["--i" as string]: i }}>{t("news" + n)}</div>)}</>;
    }
  };
  const onClick = (e: React.MouseEvent) => {
    stopAll(e);
    const b = (e.target as Element).closest<HTMLButtonElement>("button"); if (!b) return; const d = b.dataset;
    if (d.go) { showView(vp.current, d.go, d.go === "main" ? -1 : 1, false); return; }
    const a = d.act;
    if (a) {
      if (a === "settingsApp") { s.showToast(t("notInPreview", { x: t("settings") })); return; }
      if (a === "help") { s.showToast(t("notInPreview", { x: t("help") })); return; }
      setSysMenu(false);
      ({ shortcuts: () => scApi.open(), lock: () => osActions.lock(), restart: () => osActions.restart(), shutdown: () => osActions.shutdown(), wsNew: ACTIONS.wsNew, dNew: ACTIONS.dNew, dOverview: () => s.setDesksOpen(true) } as Record<string, () => void>)[a]?.(); return;
    }
    if (d.row) { setSysMenu(false); s.showToast(t("notInPreview", { x: t(d.row) })); return; }
    if (d.ptheme) { setThemeModeFull(d.ptheme as "light" | "dark" | "auto", b); return; }
    if (d.sw) { const k = d.sw; if (k === "widgets") toggleWidgets(); if (k === "icons") toggleIcons(); if (k === "navbar") { useShell.setState((x) => ({ navHidden: !x.navHidden })); setSysMenu(false); } return; }
    if (d.langSet) { setSysMenu(false); switchLang(d.langSet as Lang); return; }
    if (d.wsSet !== undefined) { setSnap((x) => ({ ...x, selWs: +d.wsSet! })); useShell.setState({ selWs: +d.wsSet }); renderWs(); const st = useShell.getState(); st.showToast(t("switched", { x: wsName(st.workspaces[st.selWs]) })); return; }
    if (d.deskSet !== undefined) { setSnap((x) => ({ ...x, cur: +d.deskSet! })); panelApi.gotoDesk(+d.deskSet); return; }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = [...ref.current!.querySelectorAll<HTMLElement>(".kbm-view:not([hidden]) button")], i = items.indexOf(document.activeElement as HTMLElement);
    const rtl = document.documentElement.dir === "rtl", fwd = rtl ? "ArrowLeft" : "ArrowRight", bwd = rtl ? "ArrowRight" : "ArrowLeft"; const ae = document.activeElement as HTMLElement | null;
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === fwd && ae?.dataset.go && ae.dataset.go !== "main") { e.preventDefault(); ae.click(); }
    else if (e.key === bwd && vp.current!.querySelector<HTMLElement>('[data-view="main"]')!.hidden) { e.preventDefault(); showView(vp.current, "main", -1, false); }
    if (e.key.startsWith("Arrow")) setHl(false);
  };
  return (
    <div ref={ref} className={"pop kbm sysm" + (s.sysOpen ? "" : " closed")} id="sysMenu" role="menu" aria-labelledby="sysBtn" onClick={onClick} onKeyDown={onKeyDown}
      onPointerOver={(e) => { if ((e.target as Element).closest(".kbm-item:not(.hl)")) setHl(false); }}>
      <span className="caret" aria-hidden="true"></span>
      <div className="kbm-vp" id="sysVp" ref={vp}>
        {VIEWS.map((v) => <section key={v} className="kbm-view" data-view={v}>{view(v)}</section>)}
      </div>
    </div>
  );
}
