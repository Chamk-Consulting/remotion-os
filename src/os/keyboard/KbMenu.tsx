"use client";
/**
 * Keyboard menu `#kbMenu` (source L8390–L8521): main / settings / input language / layout views.
 *
 * The source renders all four views ONCE when the menu opens (and again on a language change); afterwards its click
 * handlers patch only some nodes in place. That staleness is reproduced with a snapshot taken at those moments:
 *  - toggles, theme, position and ranges update their own rows (live);
 *  - picking an input language or layout updates the main values and the language / layout ticks, but not the
 *    "Active layout" select in Settings;
 *  - the main "Open / close keyboard" label keeps the state at opening (e.g. after Ctrl+Shift+K while it is open).
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANGS, type Lang } from "@/lib/i18n/langs";
import { stopAll } from "@/lib/events";
import { closeAllHooks } from "@/os/state/shell";
import { registerOsAction } from "@/os/actions";
import { placeMenu, showView } from "@/os/menu/views";
import { MI } from "@/os/shortcuts/catalogue";
import { scApi } from "@/os/shortcuts/ShortcutsPanel";
import { SvgString } from "@/os/shell/svg";
import { KB, layoutName } from "./layout";
import { applyKbSet, autoCap, kbThemeWave, keyClick, openKb, patchSet, saveKb, setInputLang, setKbPos, setLayout, toggleKb, useKb, type KbSet } from "./kb";

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
const VIEWS = ["main", "settings", "lang", "layout"];
const POS_IC: Record<string, string> = {
  dock: '<svg width="22" height="18" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="2" width="20" height="16" rx="2.5"/><rect x="5" y="12" width="14" height="3.2" rx="1" fill="currentColor" stroke="none"/></svg>',
  float: '<svg width="22" height="18" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="2" width="20" height="16" rx="2.5"/><rect x="7" y="7" width="10" height="6" rx="1.5" fill="currentColor" stroke="none"/></svg>',
  full: '<svg width="22" height="18" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="2" width="20" height="16" rx="2.5"/><path d="M5 8h.01M8 8h.01M11 8h.01M14 8h.01M17 8h.01M5 11h.01M8 11h.01M11 11h.01M14 11h.01M17 11h.01M7 14h8" stroke-width="2" stroke-linecap="round"/></svg>',
};
const anchor = () => { const b = document.getElementById("kbBtn") as HTMLElement | null; return b && b.offsetParent ? b : document.getElementById("accBtn")!; };

/** setKbMenu (L8467). */
export function setKbMenu(open: boolean) { if (open === useKb.getState().menuOpen) return; useKb.setState({ menuOpen: open }); }
registerOsAction("kbMenu", setKbMenu);
registerOsAction("vkb", toggleKb);
closeAllHooks.push(() => setKbMenu(false));

const take = () => {
  const k = useKb.getState();
  return { open: k.open, lang: k.lang, follow: k.follow, layout: k.layout, auto: k.auto, pad: k.pad, set: { ...k.set }, selVal: k.pad ? "pad" : k.follow && k.auto ? "follow" : k.auto ? k.lang : "custom", custom: !k.pad && !(k.follow && k.auto) && !k.auto };
};

export function KbMenu() {
  const { t, lang, nf } = useI18n();
  const menuOpen = useKb((s) => s.menuOpen);
  const ref = useRef<HTMLDivElement | null>(null), vp = useRef<HTMLDivElement | null>(null);
  const [snap, setSnap] = useState(take);
  const [epoch, setEpoch] = useState(0);
  const [hl, setHl] = useState(true);
  // renderKbMenu at opening and on every language change (applyLang L7995).
  const [prev, setPrev] = useState({ open: false, lang });
  if (prev.open !== menuOpen || prev.lang !== lang) {
    setPrev({ open: menuOpen, lang });
    if ((menuOpen && !prev.open) || prev.lang !== lang) { setSnap(take()); setEpoch((e) => e + 1); setHl(true); }
  }
  useLayoutEffect(() => { vp.current!.querySelectorAll<HTMLElement>(".kbm-view").forEach((v) => (v.hidden = v.dataset.view !== "main")); }, []);
  useLayoutEffect(() => {
    if (!menuOpen) return;
    showView(vp.current, "main", 0, true); placeMenu(ref.current!, anchor(), () => 110);
    // Not cancelled on close, like the source: a quick click on a row still gets the toggle focused 60 ms later.
    setTimeout(() => ref.current!.querySelector<HTMLElement>('[data-view="main"] [data-act="toggle"]')?.focus({ preventScroll: true }), 60);
  }, [menuOpen]);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (!(e.target as Element).closest?.("#kbMenu,#kbBtn")) setKbMenu(false); };
    const rs = () => { if (useKb.getState().menuOpen) placeMenu(ref.current!, anchor(), () => 110); };
    document.addEventListener("click", out); addEventListener("resize", rs);
    return () => { document.removeEventListener("click", out); removeEventListener("resize", rs); };
  }, []);

  const modKey = isMac() ? "⌘" : t("kbCtrl");
  const LN = (l: string) => LANGS[l as Lang].name;
  const rtlS = typeof document !== "undefined" && document.documentElement.dir === "rtl" ? -1 : 1;
  const back = (title: string) => <button className="kbm-back" data-go="main" role="menuitem"><span className="bk"><SvgString html={MI.back} /></span>{title}</button>;
  const ic = (h: string) => <span className="ic"><SvgString html={h} /></span>;
  const sw = (k: keyof KbSet, l: string) => <button className="set-row" role="menuitemcheckbox" aria-checked={!!snap.set[k]} data-set={k}><span>{t(l)}</span><span className="sw"></span></button>;
  const rng = (key: "zoom" | "alpha", min: number, max: number, step: number, lab: string) => (
    <div className="kv"><label htmlFor={"rng-" + key}>{t(lab)}</label><input className="rng" id={"rng-" + key} type="range" min={min} max={max} step={step} defaultValue={snap.set[key]} data-range={key} style={{ ["--p" as string]: ((snap.set[key] - min) / (max - min)) * 100 + "%" }} /><output id={"out-" + key}>{nf(snap.set[key])}%</output></div>);
  const opt = (attr: string, val: string, on: boolean, icn: React.ReactNode, label: React.ReactNode, extra?: React.ReactNode) =>
    <button key={val} className="opt" role="menuitemradio" aria-checked={on} {...{ [attr]: val }}>{icn}<span className="lbl">{label}</span>{extra}<SvgString html={MI.ck} /></button>;
  const lopts: [string, string][] = [["follow", t("followApp")], ["en", "English (US)"], ["fr", "Français (AZERTY)"], ["de", "Deutsch (QWERTZ)"], ["ar", "العربية"], ["pad", t("kbPad")]];
  const tk = { dock: "posDock", float: "posFloat", full: "posFull" } as const;
  const view = (name: string) => {
    switch (name) {
      case "main": return <>
        <div className="kbm-head"><span className="tile"><SvgString html={MI.kbd} /></span><h3>{t("kbMenuTitle")}</h3></div>
        <button className={"kbm-item" + (hl ? " hl" : "")} data-act="toggle" role="menuitem">{ic(MI.kbd)}<span className="lbl">{t(snap.open ? "kbCloseV" : "kbOpenV")}</span><span className="kbds"><kbd>{modKey}</kbd><kbd>Shift</kbd><kbd>K</kbd></span></button>
        <button className="kbm-item" data-act="shortcuts" role="menuitem">{ic(MI.cmd)}<span className="lbl">{t("kbShortcuts")}</span><span className="kbds"><kbd>{modKey}</kbd><kbd>/</kbd></span></button>
        <button className="kbm-item" data-go="settings" role="menuitem" aria-haspopup="true">{ic(MI.gear)}<span className="lbl">{t("kbSettings")}</span></button>
        <div className="kbm-sep"></div>
        <button className="kbm-item" data-go="lang" role="menuitem" aria-haspopup="true">{ic(MI.globe)}<span className="lbl">{t("inputLang")}</span><span className="val">{LN(snap.lang)}</span><span className="go"><SvgString html={MI.go} /></span></button>
        <button className="kbm-item" data-go="layout" role="menuitem" aria-haspopup="true">{ic(MI.layout)}<span className="lbl">{t("kbLayoutT")}</span><span className="val">{snap.pad ? t("kbPad") : layoutName(snap.layout, t)}</span><span className="go"><SvgString html={MI.go} /></span></button>
      </>;
      case "settings": return <>{back(t("kbSettings"))}
        <div className="kv"><label htmlFor="kbLayoutSel">{t("activeLayout")}</label><select className="sel" id="kbLayoutSel" data-sel="layout" defaultValue={snap.selVal}>
          {snap.custom ? <option value="custom">{LN(snap.lang)} · {layoutName(snap.layout, t)}</option> : null}
          {lopts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select></div>
        {rng("zoom", 80, 120, 5, "kbSize")}
        <div className="kv"><span>{t("theme")}</span><div className="seg" role="radiogroup"><span className="thumb-ind" style={{ transform: `translateX(${["light", "dark", "auto"].indexOf(snap.set.theme) * 100 * rtlS}%)` }}></span>
          {(["light", "dark", "auto"] as const).map((x, i) => <button key={x} role="radio" aria-checked={x === snap.set.theme} data-kbtheme={x}>{t(["themeL", "themeD", "themeA"][i])}</button>)}</div></div>
        {sw("hints", "showHints")}{sw("sound", "soundFb")}{sw("autoHide", "autoHide")}
        <div className="kbm-sep"></div>
        {rng("alpha", 40, 100, 1, "transparency")}
        <div className="kv"><span>{t("position")}</span><div className="pos-btns">{(["dock", "float", "full"] as const).map((p) => <button key={p} className="pos-btn" aria-pressed={snap.set.pos === p} data-pos={p} aria-label={t(tk[p])} title={t(tk[p])}><SvgString html={POS_IC[p]} /></button>)}</div></div>
        <div className="kbm-sep"></div>{sw("sugg", "setSugg")}{sw("autoCap", "setAutoCap")}{sw("dbl", "setDbl")}
      </>;
      case "lang": return <>{back(t("inputLang"))}
        {opt("data-in", "follow", snap.follow, ic(MI.auto), t("followApp"), <span className="val">{LANGS[lang].name}</span>)}
        <div className="kbm-sep"></div>
        {(Object.entries(LANGS) as [Lang, (typeof LANGS)[Lang]][]).map(([k, L]) => opt("data-in", k, !snap.follow && snap.lang === k, <span className="code">{k.toUpperCase()}</span>, <span lang={k}>{L.name}</span>))}
      </>;
      case "layout": return <>{back(t("kbLayoutT"))}
        {opt("data-layout", "auto", snap.auto && !snap.pad, ic(MI.auto), <>{t("autoLayout")}<br /><span className="val">{t("autoLayoutSub")}</span></>)}
        <div className="kbm-sep"></div>
        {["qwerty", "azerty", "qwertz", "arabic"].map((l) => opt("data-layout", l, !snap.auto && !snap.pad && snap.layout === l, ic(MI.layout), layoutName(l, t), <span className="prev">{KB[l].rows[0].slice(0, 6).join(" ").toUpperCase()}</span>))}
        {opt("data-layout", "pad", snap.pad, ic(MI.pad), t("kbPad"), <span className="prev">7 8 9</span>)}
      </>;
    }
  };
  const live = () => setSnap((s) => ({ ...s, set: { ...useKb.getState().set } }));
  const onClick = (e: React.MouseEvent) => {
    stopAll(e);
    const b = (e.target as Element).closest<HTMLButtonElement>("button"); if (!b) return; const d = b.dataset;
    if (d.go) { showView(vp.current, d.go, d.go === "main" ? -1 : 1, false); return; }
    if (d.act === "toggle") { setKbMenu(false); toggleKb(); return; }
    if (d.act === "shortcuts") { setKbMenu(false); scApi.open(); return; }
    const kb = useKb.getState;
    if (d.set) { const k = d.set as keyof KbSet; patchSet({ [k]: !kb().set[k] }); live(); applyKbSet(); saveKb(); if (k === "sound" && kb().set.sound) keyClick(); if (k === "autoCap") autoCap(); return; }
    if (d.kbtheme) { patchSet({ theme: d.kbtheme as KbSet["theme"] }); live(); if (kb().open) kbThemeWave(); else { applyKbSet(); openKb(); } saveKb(); return; }
    if (d.pos) { setKbPos(d.pos as KbSet["pos"]); live(); saveKb(); if (!kb().open) openKb(); return; }
    if (d.in || d.layout) {
      if (d.in) setInputLang(d.in); else setLayout(d.layout!);
      const k = kb(); setSnap((s) => ({ ...s, lang: k.lang, follow: k.follow, layout: k.layout, auto: k.auto, pad: k.pad }));
      if (d.layout && !kb().open) openKb();
    }
  };
  const onInput = (e: React.FormEvent) => {
    const r = (e.target as HTMLElement).closest<HTMLInputElement>("[data-range]"); if (!r) return;
    patchSet({ [r.dataset.range!]: +r.value }); live(); applyKbSet(); saveKb(); if (!useKb.getState().open) openKb();
  };
  const onChange = (e: React.ChangeEvent) => {
    const el = e.target as HTMLSelectElement; if (el.dataset.sel !== "layout") return; const v = el.value;
    if (v === "pad") setLayout("pad");
    else if (v === "follow") { setInputLang("follow", true); setLayout("auto"); }
    else if (LANGS[v as Lang]) { setInputLang(v, true); setLayout("auto"); }
    setSnap((s) => ({ ...s, custom: false }));
    if (!useKb.getState().open) openKb();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const ae = document.activeElement as HTMLElement | null;
    if (ae && ae.tagName !== "BUTTON" && e.key.startsWith("Arrow")) return;
    const items = [...ref.current!.querySelectorAll<HTMLElement>(".kbm-view:not([hidden]) button")], i = items.indexOf(ae!);
    const rtl = document.documentElement.dir === "rtl", fwd = rtl ? "ArrowLeft" : "ArrowRight", bwd = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === fwd && ae?.dataset.go && ae.dataset.go !== "main") { e.preventDefault(); ae.click(); }
    else if (e.key === bwd && vp.current!.querySelector<HTMLElement>('[data-view="main"]')!.hidden) { e.preventDefault(); showView(vp.current, "main", -1, false); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") setHl(false);
  };
  return (
    <div ref={ref} className={"pop kbm" + (menuOpen ? "" : " closed")} id="kbMenu" role="menu" aria-labelledby="kbBtn" onClick={onClick} onInput={onInput} onChange={onChange} onKeyDown={onKeyDown}
      onPointerOver={(e) => { if ((e.target as Element).closest(".kbm-item:not(.hl)")) setHl(false); }}>
      <span className="caret" aria-hidden="true"></span>
      <div className="kbm-vp" id="kbmVp" ref={vp}>
        {VIEWS.map((v) => <section key={v} className="kbm-view" data-view={v}><Fragment key={epoch}>{view(v)}</Fragment></section>)}
      </div>
    </div>
  );
}
