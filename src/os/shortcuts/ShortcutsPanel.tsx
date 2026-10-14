"use client";
/**
 * Keyboard shortcuts panel `#scDlg` (L8607–L8685): category nav with sliding indicator, search with highlight,
 * category cards, custom shortcuts (record a combo, save, remove — `remotion-custom-sc`).
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useShell } from "@/os/state/shell";
import { SvgString } from "@/os/shell/svg";
import { ShortcutsMarkup } from "@/os/shell/generated/ShortcutsMarkup";
import { CAT_IC, SC_CATS, allRows, comboFromEvent, comboKeys, custom, loadCustom, norm, saveCustom } from "./catalogue";

const X14 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
let returnFocus: Element | null = null;
export const scApi = {
  open() { returnFocus = document.activeElement; const st = useShell.getState(); st.closeAll(); useShell.setState({ palOpen: false, scOpen: true }); },
  close() { if (!useShell.getState().scOpen) return; useShell.setState({ scOpen: false }); (returnFocus as HTMLElement | null)?.focus?.({ preventScroll: true }); },
};

/** hl (L8610): highlights the first accent-insensitive match. */
export function Hl({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>; const i = norm(text).indexOf(norm(q)); if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}
export function Kbds({ combo }: { combo: string }) { const { t } = useI18n(); return <span className="kbds">{comboKeys(combo, t).map((k, i) => <kbd key={i}>{k}</kbd>)}</span>; }

/**
 * D-A29 (reproduced): the source re-renders the panel body inside the click handler, so the clicked button is detached
 * when the click reaches the scrim's "click outside the panel" check, which then closes the panel. Clicking
 * "Click, then press keys" or a custom row's × therefore closes the panel (and closing stops the recording):
 * a custom shortcut cannot be recorded in the source.
 */
const detachedClose = () => scApi.close();

export function ShortcutsPanel() {
  const { t } = useI18n();
  const open = useShell((s) => s.scOpen);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [rec, setRec] = useState<{ recording: boolean; combo: string | null }>({ recording: false, combo: null });
  const [, setRev] = useState(() => { loadCustom(); return 0; }); const bump = () => setRev((x) => x + 1);
  const nav = useRef<HTMLElement | null>(null), body = useRef<HTMLDivElement | null>(null), search = useRef<HTMLInputElement | null>(null);
  const shownOpen = useRef(false); // the indicator jumps (no transition) when the panel has just opened
  // openShortcuts: reset search and category (closing stops a recording but keeps a recorded combo), focus the search box.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) { setPrevOpen(open); if (open) { setQ(""); setCat("all"); } else setRec((r) => ({ recording: false, combo: r.combo })); }
  useEffect(() => { if (!open) return; const id = setTimeout(() => search.current?.focus({ preventScroll: true }), 80); return () => clearTimeout(id); }, [open]);
  // moveScInd: slide the indicator to the current category.
  useLayoutEffect(() => {
    const inst = open && !shownOpen.current; shownOpen.current = open;
    const ind = nav.current?.querySelector<HTMLElement>("#scInd"), b = nav.current?.querySelector<HTMLElement>(`[data-cat="${cat}"]`); if (!ind || !b) return;
    if (inst) ind.style.transition = "none";
    ind.style.transform = `translateY(${b.offsetTop}px)`; ind.style.height = b.offsetHeight + "px";
    if (inst) { void ind.offsetWidth; ind.style.transition = ""; }
  }, [cat, open, t]);
  // Record the next key combination (L8676).
  useEffect(() => {
    if (!rec.recording) return;
    const h = (e: KeyboardEvent) => {
      if (!useShell.getState().scOpen) return; e.preventDefault(); e.stopImmediatePropagation();
      if (e.key === "Escape") { setRec({ recording: false, combo: null }); return; }
      const c = comboFromEvent(e); if (!c) return;
      if (!(e.ctrlKey || e.altKey || e.metaKey)) { useShell.getState().showToast(t("customNeedMod")); return; }
      const used = allRows().find((r) => !r.display && r.combo === c);
      if (used) { useShell.getState().showToast(t("customTaken", { x: comboKeys(c, t).join(" + "), y: t(used.label) })); return; }
      setRec({ recording: false, combo: c });
    };
    document.addEventListener("keydown", h, true); return () => document.removeEventListener("keydown", h, true);
  }, [rec.recording, t]);

  const head = (c: { c: string; ic: string; id: string }) => <h3><span className="ci" style={{ background: `color-mix(in srgb,${c.c} 16%,transparent)`, color: c.c }}><SvgString html={CAT_IC[c.ic]} /></span>{t(c.id)}</h3>;
  const row = (r: { label: string; combo: string; custom?: number }, key: string | number) => (
    <div className="scr" key={key}><span><Hl text={t(r.label)} q={q} /></span><Kbds combo={r.combo} />
      {r.custom !== undefined ? <button className="x" data-rm={r.custom} aria-label={t("remove")} onClick={() => { custom.list.splice(r.custom!, 1); saveCustom(); bump(); detachedClose(); }}><SvgString html={X14} /></button> : null}</div>);
  const matches = (label: string, combo: string) => !q || norm(t(label)).includes(norm(q)) || norm(comboKeys(combo, t).join(" ")).includes(norm(q));
  const acts: [string, string, (string | null)?][] = []; { const seen = new Set<string>(); SC_CATS.forEach((c) => c.rows.forEach((r) => { if (r[3] || seen.has(r[0])) return; seen.add(r[0]); acts.push([r[0], r[1], r[2]]); })); }
  const custForm = useRef<HTMLSelectElement | null>(null);
  let i = 0; const cards: React.ReactNode[] = [];
  for (const c of SC_CATS.filter((c) => cat === "all" || c.id === cat || q)) {
    if (c.id === "catCustom") {
      if (!q) cards.push(
        <section className="scc" style={{ ["--i" as string]: i++ }} key={c.id}>
          <h3><span className="ci" style={{ background: "color-mix(in srgb,#c22fd6 16%,transparent)", color: "#c22fd6" }}><SvgString html={CAT_IC.custom} /></span>{t("catCustom")}</h3>
          {custom.list.length ? custom.list.map((r, j) => row({ label: r.label, combo: r.combo, custom: j }, j)) : <p className="cust-empty">{t("customEmpty")}</p>}
          <form className="cust-form" id="custForm" onSubmit={(e) => { e.preventDefault(); if (!rec.combo) return; const [label, act] = custForm.current!.value.split("|"); custom.list.push({ label, act: act || null, combo: rec.combo }); saveCustom(); setRec({ recording: false, combo: null }); useShell.getState().showToast(t("customSaved")); }}>
            <div className="row"><select className="sel" id="custAct" ref={custForm} aria-label={t("searchActions")}>{acts.map((r, k) => <option key={k} value={`${r[0]}|${r[2] || ""}`}>{t(r[0])}</option>)}</select>
              <button type="button" className={"rec" + (rec.recording ? " on" : "")} id="custRec" onClick={() => { setRec({ recording: true, combo: null }); detachedClose(); }}>{rec.combo ? comboKeys(rec.combo, t).map((k, n) => <kbd key={n}>{k}</kbd>) : t(rec.recording ? "customRecord" : "customClick")}</button></div>
            <div className="row"><button type="submit" className="nadd" disabled={!rec.combo} style={rec.combo ? undefined : { opacity: .5 }}>{t("customSave")}</button></div>
          </form>
        </section>);
      else { const rows = custom.list.map((r, j) => ({ label: r.label, combo: r.combo, custom: j })).filter((r) => norm(t(r.label)).includes(norm(q)) || norm(comboKeys(r.combo, t).join(" ")).includes(norm(q))); if (rows.length) cards.push(<section className="scc" style={{ ["--i" as string]: i++ }} key={c.id}>{head(c)}{rows.map((r, k) => row(r, k))}</section>); }
      continue;
    }
    const rows = c.rows.map((r) => ({ label: r[0], combo: r[1] })).filter((r) => matches(r.label, r.combo));
    if (!rows.length) continue;
    cards.push(<section className="scc" style={{ ["--i" as string]: i++ }} key={c.id}>{head(c)}{rows.map((r, k) => row(r, k))}</section>);
  }
  const p = (id: string): Record<string, unknown> => {
    switch (id) {
      case "scDlg": return { className: "scp-scrim" + (open ? " open" : ""), onClick: (e: React.MouseEvent) => { if (!(e.target as Element).closest(".scp")) scApi.close(); } };
      case "scSearch": return { ref: search, value: q, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value) };
      case "scClose": return { onClick: () => scApi.close() };
      case "scNav": return { ref: nav };
      case "scBody": return { ref: body };
      default: return {};
    }
  };
  const s = (id: string, fb: React.ReactNode) => {
    if (id === "scNav") return <>
      <span className="scp-ind" id="scInd"></span>
      <button data-cat="all" aria-current={cat === "all"} onClick={() => pick("all")}><SvgString html={CAT_IC.all} /><span>{t("scAll")}</span></button>
      {SC_CATS.map((c) => <Fragment key={c.id}>{c.id === "catCustom" ? <hr /> : null}<button data-cat={c.id} aria-current={cat === c.id} onClick={(e) => pick(c.id, e.currentTarget)}><SvgString html={CAT_IC[c.ic]} /><span>{t(c.id)}</span></button></Fragment>)}
    </>;
    if (id === "scBody") return cards.length ? <div className="scp-cols">{cards}</div> : <div className="scp-empty">{t("scNone", { x: q })}</div>;
    return fb;
  };
  function pick(c: string, b?: HTMLElement) { setCat(c); setQ(""); if (body.current) body.current.scrollTop = 0; b?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); }
  return <ShortcutsMarkup t={t} p={p} s={s} />;
}
