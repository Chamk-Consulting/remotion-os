"use client";
/** Notification centre `#nc`, item / header pop menu `.nc-pop` and desktop banners `#nbStack` (L9993–L10181). */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { stopAll } from "@/lib/events";
import { SvgString } from "@/os/shell/svg";
import { MI } from "@/os/shortcuts/catalogue";
import { useShell } from "@/os/state/shell";
import {
  CATS, NC_KIND, NI, PRI, PRI_KEY, ago, clearRead, closeNc, closeNcPop, flip, helpers, itemMenu, killBanner, markAll, ncFiltered, ncPop,
  openNc, runPrimary, selectNc, swapDetail, setRead, snoozeNc, toggleSetting, txt, useNc, type NcItem, type NcSet,
} from "./nc";

const Html = ({ h }: { h: string }) => <SvgString html={h} />;
const NcIcon = ({ k, lg }: { k: string; lg?: boolean }) => <span className={"ni-ic " + (lg ? "lg" : "")} style={{ background: NC_KIND[k].bg }}><Html h={NI[NC_KIND[k].ic]} /></span>;
const PriBadge = ({ p, lg }: { p: string; lg?: boolean }) => { const { t } = useI18n(); return <span className={`pb p-${p}${lg ? " lg" : ""}`}><Html h={NI[PRI_KEY[p]]} />{t(PRI_KEY[p])}</span>; };
/** setCount (L10002): text changes replay the `bump` animation. */
export function Count({ v, className, ...rest }: { v: string; className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  const ref = useRef<HTMLSpanElement | null>(null), prev = useRef(v);
  useLayoutEffect(() => { if (prev.current === v) return; prev.current = v; const e = ref.current; if (!e) return; e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }, [v]);
  return <span ref={ref} className={className} {...rest}>{v}</span>;
}

export function NotificationCenter() {
  const { t, nf, lang } = useI18n();
  const s = useNc();
  const x = helpers(); void lang;
  const scroll = useRef<HTMLDivElement | null>(null), detail = useRef<HTMLElement | null>(null), search = useRef<HTMLInputElement | null>(null);
  // The list is rebuilt (rows replay their entrance) each time the centre opens: renderNc(false).
  const [epoch, setEpoch] = useState(0); const [wasOpen, setWasOpen] = useState(s.open);
  if (wasOpen !== s.open) { setWasOpen(s.open); if (s.open) setEpoch((e) => e + 1); }
  const live = s.items.filter((n) => !n.snoozed), unread = live.filter((n) => n.unread).length;
  const counts: Record<string, number> = { all: live.length, unread, ...Object.fromEntries(PRI.map((p) => [p, live.filter((n) => n.pri === p).length])) };
  const list = ncFiltered(s, x);
  const sel = s.items.find((n) => n.id === s.dsel && !n.snoozed);

  // FLIP after list changes (renderNcList(true)).
  useLayoutEffect(() => {
    const before = flip.before; flip.before = null; if (!before || !scroll.current) return;
    scroll.current.querySelectorAll<HTMLElement>(".ni").forEach((el) => { const old = before.get(el.dataset.id!); if (old == null) return; const dy = old - el.getBoundingClientRect().top; el.style.animation = "none"; if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,1.1,.3,1)" }); });
  }, [s.rev]);
  // renderNcDetail(true): replay the swap animation.
  useLayoutEffect(() => { const d = detail.current; if (!d || !s.detailSwap) return; d.classList.remove("swap"); void d.offsetWidth; d.classList.add("swap"); }, [s.detailSwap]);
  // Relative times refresh every minute while open.
  useEffect(() => { if (!s.open) return; const id = setInterval(() => useNc.setState((z) => ({ rev: z.rev })), 60000); return () => clearInterval(id); }, [s.open]);
  // Keyboard (capture) and outside click (L10117).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const z = useNc.getState(); if (!z.open) return;
      if (e.key === "Escape") { e.stopImmediatePropagation(); if (z.pop) { closeNcPop(); return; } if (z.detailOpen && innerWidth <= 900) { useNc.setState({ detailOpen: false }); return; } closeNc(); return; }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyF" && !e.shiftKey && !e.altKey) { e.preventDefault(); search.current?.focus(); search.current?.select(); }
      const el = (document.activeElement as Element | null)?.closest?.(".ni") as HTMLElement | null;
      if (el && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); const all = [...scroll.current!.querySelectorAll<HTMLElement>(".ni")], i = all.indexOf(el); all[(i + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus(); }
      if (el && e.key === "Enter" && e.target === el) { selectNc(+el.dataset.id!); setRead(+el.dataset.id!, true); }
    };
    const click = (e: MouseEvent) => { const z = useNc.getState(), tg = e.target as Element; if (z.open && !tg.closest?.("#nc,#bellBtn,.nc-pop,.nbn,.toast,.kb")) closeNc(); if (z.pop && !tg.closest?.(".nc-pop,[data-more],#ncMore,#ndMore")) closeNcPop(); };
    document.addEventListener("keydown", key, true); document.addEventListener("click", click);
    return () => { document.removeEventListener("keydown", key, true); document.removeEventListener("click", click); };
  }, []);

  const measure = () => { flip.before = new Map([...(scroll.current?.querySelectorAll<HTMLElement>(".ni") ?? [])].map((el) => [el.dataset.id!, el.getBoundingClientRect().top])); };
  const onList = (e: React.MouseEvent) => {
    const tg = e.target as Element;
    const a = tg.closest<HTMLElement>("[data-act]"); if (a) { stopAll(e); runPrimary(+a.dataset.act!); return; }
    const m = tg.closest<HTMLElement>("[data-more]"); if (m) { stopAll(e); itemMenu(m, +m.dataset.more!); return; }
    const el = tg.closest<HTMLElement>(".ni"); if (el) { selectNc(+el.dataset.id!); setRead(+el.dataset.id!, true); }
  };
  const onDetail = (e: React.MouseEvent) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button"); if (!b) return; const n = useNc.getState().items.find((z) => z.id === useNc.getState().sel); if (!n) return;
    if (b.id === "ndClose") { if (innerWidth <= 900) { useNc.setState({ detailOpen: false }); return; } useNc.setState({ sel: null }); swapDetail(); return; }
    if (b.id === "ndPrimary") { runPrimary(n.id); return; }
    if (b.id === "ndView") { useShell.getState().showToast(t("notInPreview", { x: t("viewDetails") })); return; }
    if (b.id === "ndSecond") { if (NC_KIND[n.kind].second === "snooze") snoozeNc(n.id); else useShell.getState().showToast(t("notInPreview", { x: t("reschedule") })); return; }
    if (b.id === "ndMore") { stopAll(e); itemMenu(b, n.id); }
  };
  const qs = new Date(); qs.setHours(22, 0, 0, 0); const qe = new Date(); qe.setHours(7, 0, 0, 0);
  const nsRow = (k: keyof NcSet, ic: string, l: string, sub: string) => <button className="ns-row" role="switch" aria-checked={s.set[k]} data-ns={k} onClick={() => toggleSetting(k)}><span className="ic"><Html h={NI[ic]} /></span><span className="tx"><b>{t(l)}</b><small>{sub}</small></span><span className="sw"></span></button>;
  const label = (n: NcItem) => (n.installed ? "aRestartNow" : NC_KIND[n.kind].act);

  let gl = "", i = 0; const rows: React.ReactNode[] = [];
  for (const n of list) {
    const day = x.dayLabel(n.at); if (day !== gl) { gl = day; rows.push(<div className="nc-grp" key={"g" + n.id}>{day}</div>); }
    rows.push(
      <div key={n.id} className={`ni p-${n.pri}${n.unread ? " unread" : ""}${n.id === s.sel ? " is-sel" : ""}`} data-id={n.id} role="listitem" tabIndex={0} style={{ ["--i" as string]: i++ }}>
        <span className="ni-dot" aria-label={n.unread ? t("fUnread") : ""}></span><NcIcon k={n.kind} />
        <div className="ni-body"><div className="ni-top"><PriBadge p={n.pri} /><b dir="auto">{txt(n.t, n, x)}</b></div><p dir="auto">{txt(n.s, n, x)}</p></div>
        <div className="ni-side"><time>{ago(n.at, x)}</time><button className={"ni-act" + (n.busy ? " busy" : "")} data-act={n.id} data-busy={t("aInstalling")}>{t(label(n))}</button></div>
        <button className="ni-more" data-more={n.id} aria-label={t("kbMore")}><Html h={NI.dots} /></button>
      </div>);
  }
  return (
    <>
      <div className={"nc" + (s.open ? " open" : "") + (s.detailOpen ? " detail-open" : "") + (s.wide ? " wide" : "")} id="nc" role="dialog" aria-labelledby="ncTitle">
        <section className="nc-list">
          <header className="nc-head">
            <h2 id="ncTitle">{t("notifications")} (<span className="cnt">{nf(live.length)}</span>)</h2>
            <button className="nc-mark" id="ncMarkAll" disabled={!unread} onClick={markAll}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg><span data-i18n="markAll">{t("markAll")}</span></button>
            <button className="nc-ic" id="ncMore" aria-label={t("kbMore")} onClick={(e) => { stopAll(e); ncPop(e.currentTarget, [
              [t("markAll"), NI.check, "", markAll], [t("clearRead"), NI.x, "", clearRead],
              [t("ncSettings"), MI.gear, "", () => { useNc.setState({ setCollapsed: false, detailOpen: true }); const el = document.getElementById("ncSet")!; el.scrollIntoView({ behavior: "smooth", block: "nearest" }); el.animate([{ boxShadow: "0 0 0 3px var(--green)" }, { boxShadow: "var(--shadow)" }], { duration: 1200 }); }],
            ]); }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button>
            <button className="nc-ic" id="ncExpand" aria-pressed={s.wide} aria-label={t(s.wide ? "collapse" : "expand")} onClick={() => useNc.setState((z) => ({ wide: !z.wide }))}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-8 8M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></svg></button>
          </header>
          <label className="nc-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input id="ncSearch" ref={search} type="search" autoComplete="off" dir="auto" placeholder={t("ncSearchPh")} aria-label={t("ncSearchPh")} value={s.q} onChange={(e) => { measure(); useNc.setState({ q: e.target.value }); }} /><span className="kbds"><kbd className="modk">Ctrl</kbd><kbd>F</kbd></span></label>
          <div className="nc-chips" id="ncPri" role="toolbar" data-lang={lang}>
            {["all", "unread", ...PRI].map((k) => <button key={k} className={"chip" + (PRI.includes(k) ? " p-" + k : "")} data-pri={k} aria-pressed={s.pri === k} onClick={() => { measure(); useNc.setState({ pri: k }); }}>{PRI.includes(k) ? <Html h={NI[PRI_KEY[k]]} /> : null}{t(k === "all" ? "fAll" : k === "unread" ? "fUnread" : PRI_KEY[k])}<Count className="n" v={nf(counts[k])} /></button>)}
          </div>
          <div className={"nc-cats-row" + (s.catsMore ? " more" : "")} id="ncCatsRow"><div className="nc-cats" id="ncCats" role="toolbar">
            {["all", ...CATS].map((c) => <button key={c} className="chip cat" data-cat={c} aria-pressed={s.cat === c} onClick={(e) => { e.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" }); measure(); useNc.setState({ cat: c }); }}>{t(c === "all" ? "fAll" : c)}</button>)}
          </div><button className="nc-ic" id="ncCatMore" aria-expanded={s.catsMore} aria-label={t("kbMore")} onClick={() => useNc.setState((z) => ({ catsMore: !z.catsMore }))}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></button></div>
          <div className="nc-scroll" id="ncScroll" role="list" ref={scroll} onClick={onList} key={epoch}>
            {/* the list, detail and settings are first rendered when the centre opens (renderNc) */}
            {!s.ever ? null : list.length ? rows : <div className="nc-empty"><span className="ring"><Html h={NI.check} /></span><b>{t("ncEmpty")}</b><span>{t("ncEmptySub")}</span></div>}
          </div>
        </section>
        <div className="nc-side">
          <section className="nc-card nc-detail" id="ncDetail" aria-live="polite" ref={detail} onClick={onDetail}>
            {/* renderNcDetail rebuilds the card's content (the fade-out leaves the old children at opacity 0) */}
            <Fragment key={s.detailSwap}>{!s.ever ? null : !sel ? <div className="nd-empty"><Html h={NI.cal.replace('width="22" height="22"', 'width="34" height="34"')} /><span>{t("selectNotif")}</span></div> : <>
              <div className="nd-top"><PriBadge p={sel.pri} lg /><button className="nc-ic" id="ndClose" aria-label={t("close")}><Html h={NI.x} /></button></div>
              <div className="nd-when">{x.dayLabel(sel.at)}, {x.fmtT(sel.at)}</div>
              <div className="nd-head"><NcIcon k={sel.kind} lg /><div><h3 dir="auto">{txt(sel.t, sel, x)}</h3><p dir="auto">{txt(sel.s, sel, x)}</p></div></div>
              <p className="nd-desc" dir="auto">{txt(sel.d, sel, x)}</p>
              <dl className="nd-fields">{sel.f(sel, x).map(([ic, l, v, raw], k) => <div key={k}><dt><Html h={NI[ic]} /><span>{t(l)}</span></dt>{raw ? <dd dir="auto" dangerouslySetInnerHTML={{ __html: v }} /> : <dd dir="auto">{v}</dd>}</div>)}</dl>
              <div className="nd-actions"><button className={"btn-p" + (sel.busy ? " busy" : "")} id="ndPrimary" data-busy={sel.busy ? t("aInstalling") : "1"}>{sel.kind === "appt" ? <Html h={NI.pin.replace('width="18" height="18"', 'width="16" height="16"')} /> : null}{t(sel.installed ? "aRestartNow" : NC_KIND[sel.kind].primary)}</button><button className="nc-ic" id="ndMore" aria-label={t("kbMore")}><Html h={NI.dots} /></button></div>
              <div className="nd-actions"><button className="btn-s" id="ndView">{t("viewDetails")}</button><button className="btn-s" id="ndSecond">{t(NC_KIND[sel.kind].second)}</button></div>
            </>}</Fragment>
          </section>
          <section className={"nc-card nc-set" + (s.setCollapsed ? " collapsed" : "")} id="ncSet">{s.ever ? <>
            <button className="ns-head" id="nsHead" aria-expanded={!s.setCollapsed} onClick={() => useNc.setState((z) => ({ setCollapsed: !z.setCollapsed }))}><span className="ic"><Html h={MI.gear} /></span><span>{t("ncSettings")}</span><span className="go"><Html h={MI.go} /></span></button>
            <div className="ns-body"><div>{nsRow("dnd", "moon", "dnd", t("dndSub"))}{nsRow("quiet", "clock", "quiet", `${x.fmtT(qs)} – ${x.fmtT(qe)}`)}{nsRow("sound", "sound", "sound", t("soundSub"))}{nsRow("desk", "monitor", "desk", t("deskSub"))}
              <button className="ns-row ns-more" id="nsMore" onClick={() => useShell.getState().showToast(t("notInPreview", { x: t("moreNc") }))}><span className="ic"><Html h={MI.gear} /></span><span className="tx"><b>{t("moreNc")}</b></span><span className="go"><Html h={MI.go} /></span></button></div></div></> : null}
          </section>
        </div>
      </div>
      <Banners />
      <NcPop />
    </>
  );
}

/** `.nc-pop` (ncPop L10091): placed under the anchor (or above when it does not fit), first item focused. */
function NcPop() {
  const pop = useNc((s) => s.pop); const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const p = ref.current; if (!p || !pop) return; const r = pop.rect, w = p.offsetWidth, rtl = document.documentElement.dir === "rtl";
    let left = rtl ? r.left : r.right - w; left = Math.min(Math.max(8, left), innerWidth - w - 8);
    let top = r.bottom + 6; if (top + p.offsetHeight > innerHeight - 8) top = r.top - p.offsetHeight - 6;
    p.style.left = left + "px"; p.style.top = top + "px"; p.style.setProperty("--ox", r.left + r.width / 2 - left + "px");
    const id = setTimeout(() => p.querySelector("button")?.focus({ preventScroll: true }), 30); return () => clearTimeout(id);
  }, [pop]);
  if (!pop || typeof document === "undefined") return null;
  return createPortal(<div ref={ref} className="nc-pop" role="menu" onClick={(e) => { const b = (e.target as Element).closest<HTMLElement>("[data-i]"); if (!b) return; stopAll(e); closeNcPop(); pop.items[+b.dataset.i!][3](); }}>
    {pop.items.map(([l, ic, cls], i) => <button key={i} role="menuitem" data-i={i} className={cls || ""}>{ic ? <Html h={ic} /> : null}{l}</button>)}
  </div>, document.body);
}

/** Desktop banners `#nbStack` (showBanner L10170): 6 s, hover pauses (2.5 s after leaving), click opens the item. */
function Banners() {
  const banners = useNc((s) => s.banners);
  return <div className="nb-stack" id="nbStack" aria-live="polite">{banners.map((b) => <BannerEl key={b.key} k={b.key} n={b.n} gone={b.gone} />)}</div>;
}
function BannerEl({ k, n, gone }: { k: number; n: NcItem; gone: boolean }) {
  const { t } = useI18n(); const x = helpers(); const tm = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const kill = () => { if (!gone) killBanner(k); };
  useEffect(() => { tm.current = setTimeout(() => killBanner(k), 6000); return () => clearTimeout(tm.current); }, [k]);
  return <div className={"nbn" + (gone ? " gone" : "")} role="status" onClick={() => { kill(); openNc(); selectNc(n.id); setRead(n.id, true); }}
    onMouseEnter={() => clearTimeout(tm.current)} onMouseLeave={() => { tm.current = setTimeout(() => killBanner(k), 2500); }}>
    <NcIcon k={n.kind} /><div><b dir="auto">{txt(n.t, n, x)}</b><p dir="auto">{txt(n.s, n, x)}</p></div>
    <button className="nc-ic" aria-label={t("close")} onClick={(e) => { stopAll(e); kill(); }}><Html h={NI.x} /></button><span className="bar"></span>
  </div>;
}
