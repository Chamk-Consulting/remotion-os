"use client";
/** Applications launcher window (source L11950–L12011). */
import { useEffect, useLayoutEffect, useState } from "react";
import { create } from "zustand";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { translate, localeOf } from "@/lib/i18n/core";
import { isLang, type Lang } from "@/lib/i18n/langs";
import { reducedMotion } from "@/lib/motion";
import raw from "@/apps/registry.data.json";
import icons from "@/os/shell/data/icons.json";
import { SvgString } from "@/os/shell/svg";
import { useShell } from "@/os/state/shell";
import { registerOsAction } from "@/os/actions";
import { osMenu } from "@/os/menu/OsMenu";
import { alInst, appName } from "@/os/desktop/menus";
import { osAppMenuItems, osSoloKey } from "@/os/windows/appmode";
import { desktopApi } from "@/os/desktop/api";
import { Glyph } from "@/os/desktop/Glyph";
import type { Item } from "@/os/desktop/model";
import { ghost } from "@/os/desktop/ghost";
import { setSysMenu } from "@/os/shortcuts/actions";
import { osFocus, osMax, osRestore, osWinOpen, useWm } from "@/os/windows/wm";

const OIC = icons.OIC as Record<string, string>, OSI = icons.OSI as Record<string, string>;
const AL_APPS = raw.AL_APPS as unknown as [string, string, number][], AL_CATS = raw.AL_CATS as unknown as [string, string][];
const H = ({ h }: { h: string }) => <SvgString html={h} />;
type Card = { k: string; cat: string; inst: boolean; fav: boolean };
type Al = { view: string; q: string; sort: "name" | "cat" | "recent"; grid: boolean; snap: { list: Card[]; n: number; anim: boolean }; busy: Set<string>; open: boolean };
export const useAl = create<Al>(() => ({ view: "all", q: "", sort: "name", grid: true, snap: { list: [], n: 0, anim: true }, busy: new Set(), open: false }));
const A = () => useAl.getState();
const lang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
const t = (k: string, v?: Record<string, string | number>) => translate(lang(), k, v);
const loc = () => localeOf(lang());
const name = (k: string) => appName(t, k);

/** alTouch (L11952). */
function alTouch(k: string) { useShell.getState().mutate((s) => { s.apps.recent = [k, ...s.apps.recent.filter((x) => x !== k)].slice(0, 12); }, { save: false, apps: true }); }
/** alList (L11953). */
function alList(): Card[] {
  const st = useShell.getState(), al = A();
  let L = AL_APPS.map(([k, cat]) => ({ k, cat, inst: alInst(k), fav: !!st.apps.fav[k] }));
  const v = al.view;
  if (v === "fav") L = L.filter((a) => a.fav); else if (v === "recent") L = st.apps.recent.map((k) => L.find((a) => a.k === k)).filter(Boolean) as Card[]; else if (v === "installed") L = L.filter((a) => a.inst); else if (v === "free") L = L.filter((a) => !a.inst); else if (v.startsWith("cat")) L = L.filter((a) => a.cat === v);
  const q = al.q.trim().toLowerCase(); if (q) L = L.filter((a) => name(a.k).toLowerCase().includes(q) || t(a.cat).toLowerCase().includes(q));
  if (v !== "recent") {
    if (al.sort === "cat") L.sort((a, b) => t(a.cat).localeCompare(t(b.cat), loc()) || name(a.k).localeCompare(name(b.k), loc()));
    else if (al.sort === "recent") L.sort((a, b) => { const ia = st.apps.recent.indexOf(a.k), ib = st.apps.recent.indexOf(b.k); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    else L.sort((a, b) => name(a.k).localeCompare(name(b.k), loc()));
  }
  return L;
}
/** alRenderMain (L11965): the cards are a snapshot taken here (the source rebuilds the grid HTML only on these calls). */
export function alRenderMain(anim: boolean) { if (!A().open) return; useAl.setState({ snap: { list: alList(), n: A().snap.n + 1, anim } }); }
const alTitle = () => ({ all: "alAll", fav: "alFav", recent: "alRecent", installed: "alInstalled", free: "alFree" } as Record<string, string>)[A().view] || A().view;

/** osLauncher (L11982). */
export function osLauncher(from?: Element | null) {
  const ex = useWm.getState().wins.apps;
  if (ex && !ex.closing) { if (ex.min) osRestore("apps"); osFocus("apps"); return; }
  const rr = document.getElementById("rail")!.getBoundingClientRect(), W = 560, H_ = Math.min(505, innerHeight - 160);
  const x = document.documentElement.dir === "rtl" ? innerWidth - Math.max(rr.width, 0) - W - 60 : Math.max(rr.right, 0) + 60, y = Math.max(90, innerHeight - H_ - 118);
  useAl.setState({ open: true });
  osWinOpen("apps", { title: (tr) => tr("apps"), icon: "", cls: "al-win", bare: true, w: W, h: H_, x, y, minW: 460, minH: 360, body: <LauncherBody />, from: from ?? null, onClose: () => useAl.setState({ open: false }), relabelAria: true });
  alRenderMain(true);
  setTimeout(() => document.querySelector<HTMLInputElement>(".al .al-search input")?.focus({ preventScroll: true }), 120);
}
registerOsAction("launcher", osLauncher);

function alOpenApp(k: string, card: HTMLElement | null) {
  if (!alInst(k)) { alInstall(k, card); return; }
  alTouch(k); desktopApi.open({ id: "", type: "app", app: k }, card?.querySelector<HTMLElement>(".gl") ?? null);
}
function alInstall(k: string, card: HTMLElement | null) {
  if (A().busy.has(k)) return;
  if (card) useAl.setState({ busy: new Set([...A().busy, k]) });
  setTimeout(() => {
    useShell.getState().mutate((s) => { s.apps.inst[k] = 1; }, { save: false, apps: true });
    useShell.getState().showToast(t("alInstalledT", { x: name(k) }));
    const b = new Set(A().busy); b.delete(k); useAl.setState({ busy: b });
    alRenderMain(false);
    requestAnimationFrame(() => { const c = document.querySelector<HTMLElement>(`.al .al-card[data-app="${CSS.escape(k)}"]`); if (c && !reducedMotion()) c.animate([{ transform: "scale(.94)" }, { transform: "scale(1.04)" }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,1.4,.3,1)" }); });
  }, reducedMotion() ? 100 : 1300);
}
/** `alStore.fav[k]=!alStore.fav[k]` (L12000): stores `true` / `false`, not 1 / absent. */
const toggleFav = (k: string) => useShell.getState().mutate((s) => { (s.apps.fav as Record<string, unknown>)[k] = !s.apps.fav[k]; }, { save: false, apps: true });

function LauncherBody() {
  const { t: tr, nf, lang } = useI18n();
  const al = useAl(); const fav = useShell((s) => s.apps.fav);
  // osRelabel (L12300): a new body (empty search box; AL.q kept), then alRenderMain(false).
  const [lk, setLk] = useState({ lang, n: 0 }); if (lk.lang !== lang) setLk({ lang, n: lk.n + 1 });
  useLayoutEffect(() => { if (lk.n) alRenderMain(false); }, [lk.n]);
  useEffect(() => {
    // Ghost drag of a card onto the desktop (L12011).
    return ghost.arm(".al-card", (el) => { const k = el.dataset.app!; return { kind: "app", app: k, it: { id: "", type: "app", app: k }, label: name(k) }; });
  }, []);
  const nav: [string, string, string][] = [["all", OIC.grid, "alAll"], ["fav", OIC.star, "alFav"], ["recent", OIC.recent, "alRecent"], ["installed", OIC.grid.replace(/rx="1.5"/g, 'rx="3"'), "alInstalled"], ["free", OIC.gear, "alFree"]];
  const L = al.snap.list;
  const card = (a: Card, i: number) => {
    const f = !!fav[a.k], busy = al.busy.has(a.k);
    return <div key={al.snap.n + ":" + a.k} className={"al-card" + (a.inst ? "" : " free") + (busy ? " busy" : "")} role="button" tabIndex={0} data-app={a.k} style={{ ["--i" as string]: i, animation: al.snap.anim ? undefined : "none" }} aria-label={appName(tr, a.k)}>
      <button type="button" className="al-star" data-star={a.k} aria-pressed={f} aria-label={tr(f ? "alFavRm" : "alFavAdd")}><H h={f ? OIC.starF : OIC.star} /></button>
      <Glyph it={{ id: "", type: "app", app: a.k }} /><b dir="auto">{appName(tr, a.k)}</b><small className="st">{busy ? tr("alInstalling") : a.inst ? tr("alInstalledS") : tr("alFreeS")}</small>
      {al.grid ? null : <><span className="cat">{tr(a.cat)}</span><span className="act">{a.inst ? tr("fmOpen") : tr("alInstall")}</span></>}
      {busy ? <span className="al-prog"><i></i></span> : null}
    </div>;
  };
  const onClick = (e: React.MouseEvent) => {
    const el = e.target as Element;
    const st = el.closest<HTMLElement>("[data-star]");
    if (st) { const k = st.dataset.star!; toggleFav(k); if (!reducedMotion()) st.animate([{ transform: "scale(.6) rotate(-30deg)" }, { transform: "scale(1.25)" }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,1.4,.3,1)" }); if (A().view === "fav") setTimeout(() => alRenderMain(true), 250); return; }
    const nv = el.closest<HTMLElement>("[data-alnav]"); if (nv) { useAl.setState({ view: nv.dataset.alnav! }); alRenderMain(true); return; }
    const v = el.closest<HTMLElement>("[data-alv]"); if (v) { useAl.setState({ grid: v.dataset.alv === "grid" }); alRenderMain(true); return; }
    const so = el.closest<HTMLElement>(".al-sort");
    if (so) { const r = so.getBoundingClientRect(); osMenu(r.left, r.bottom + 4, ([["name", "sName"], ["cat", "sCat"], ["recent", "alRecent"]] as const).map(([k, l]) => ({ l: tr(l), check: A().sort === k, run: () => { useAl.setState({ sort: k }); alRenderMain(true); } }))); return; }
    const a = el.closest<HTMLElement>("[data-ala]"); if (a) { if (a.dataset.ala === "settings") setSysMenu(true); else osMax("apps"); return; }
    const c = el.closest<HTMLElement>(".al-card"); if (c && !ghost.suppress) alOpenApp(c.dataset.app!, c);
  };
  const onKey = (e: React.KeyboardEvent) => { const c = (e.target as Element).closest<HTMLElement>(".al-card"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); alOpenApp(c.dataset.app!, c); } };
  const onCtx = (e: React.MouseEvent) => {
    const c = (e.target as Element).closest<HTMLElement>(".al-card"); if (!c) return; e.preventDefault(); const k = c.dataset.app!, inst = alInst(k), f = !!useShell.getState().apps.fav[k];
    const fav = { l: f ? tr("alFavRm") : tr("alFavAdd"), ic: f ? OIC.starF : OIC.star, run: () => { toggleFav(k); alRenderMain(false); } };
    const addDesk = { l: tr("alAddDesk"), ic: OIC.desk, run: () => { desktopApi.add({ type: "app", app: k } as Item, 0, 0); } };
    // v56 override (L21068): an installed app that opens in a window gets the app-mode rows instead (and no Uninstall row).
    const key = osSoloKey(k); if (key && inst) { osMenu(e.clientX, e.clientY, [...osAppMenuItems(key), "-", addDesk, fav]); return; }
    osMenu(e.clientX, e.clientY, [
      { l: inst ? tr("fmOpen") : tr("alInstall"), ic: inst ? OIC.open : OIC.dl, run: () => alOpenApp(k, c) },
      addDesk, fav,
      ...(inst && !["files", "settings", "remotionAI"].includes(k) ? ["-" as const, { l: tr("alUninstall"), ic: OIC.del, danger: true, run: () => { useShell.getState().mutate((s) => { s.apps.inst[k] = 0; }, { save: false, apps: true }); alRenderMain(false); useShell.getState().showToast(tr("alUninstalled", { x: appName(tr, k) })); } }] : []),
    ]);
  };
  return (
    <div className="al" key={lk.n} onClick={onClick} onKeyDown={onKey} onContextMenu={onCtx} onInput={(e) => { const i = e.target as HTMLInputElement; if (i.closest(".al-search")) { useAl.setState({ q: i.value }); alRenderMain(false); } }}>
      <div className="al-top"><label className="al-search"><H h={OIC.search} /><input type="search" placeholder={tr("alSearch")} autoComplete="off" /></label><button type="button" className="os-ib" data-ala="win" aria-label={tr("fmMax")} title={tr("fmMax")}><H h={OIC.win} /></button><button type="button" className="os-ib" data-ala="settings" aria-label={tr("settings")} title={tr("settings")}><H h={OIC.gear} /></button></div>
      <div className="al-body"><aside className="al-nav">{nav.map(([k, ic, l]) => <button key={k} type="button" data-alnav={k} className={al.view === k ? "on" : undefined}><H h={ic} /><span>{tr(l)}</span></button>)}<p className="al-h">{tr("alCats")}</p>{AL_CATS.map(([k, c]) => <button key={k} type="button" data-alnav={k} className={al.view === k ? "on" : undefined}><i style={{ ["--c" as string]: c }}></i><span>{tr(k)}</span></button>)}</aside>
        <main className="al-main"><div className="al-mh"><div><b>{tr(alTitle())}</b><small>{tr("alCount", { n: nf(L.length) })}</small></div><span className="sp"></span><button type="button" className="al-sort" aria-haspopup="menu"><span>{tr("alSortBy", { x: tr({ name: "sName", cat: "sCat", recent: "alRecent" }[al.sort]) })}</span><H h={OSI.chev.replace("m9 6 6 6-6 6", "m6 9 6 6 6-6")} /></button><div className="al-vt"><button type="button" data-alv="grid" aria-label={tr("alGrid")} title={tr("alGrid")} aria-pressed={al.grid}><H h={OIC.grid} /></button><button type="button" data-alv="list" aria-label={tr("alList")} title={tr("alList")} aria-pressed={!al.grid}><H h={OIC.list} /></button></div></div>
          <div className={"al-grid" + (al.grid ? "" : " list")}>{L.length ? L.map(card) : <p className="al-none">{tr("alNone")}</p>}</div></main></div>
    </div>
  );
}
