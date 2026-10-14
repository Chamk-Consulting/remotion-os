"use client";
import { stopAll } from "@/lib/events";
/** Port of dkWin + folder window, Quick Look and trash window (L11461–L11515). */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useShell } from "@/os/state/shell";
import { reducedMotion } from "@/lib/motion";
import { SvgString } from "@/os/shell/svg";
import { Glyph, useDkName } from "./Glyph";
import { dkExt, fmtSize, type Item } from "./model";
import { desktopApi } from "./api";
import { fsFind } from "./fs";
import { dkMenuShow } from "@/os/menu/DkMenu";
import { osActions } from "@/os/actions";
import { useDkWins, openDkWin, type DkWinState } from "./windows";

const X = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const FOLD_IC = '<svg width="20" height="17" viewBox="0 0 64 52"><path d="M4 9a5 5 0 0 1 5-5h15l6 6h25a5 5 0 0 1 5 5v30a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="#4d94f5"/></svg>';
const TRASH_IC = '<svg width="18" height="20" viewBox="0 0 24 28"><path d="M4 5h16l-1.5 21h-13z" fill="#e7ebee" stroke="#8a949a"/></svg>';
const TRASH_BIG = '<svg width="34" height="40" viewBox="0 0 24 28"><path d="M4 5h16l-1.5 21h-13z" fill="#e7ebee" stroke="#b8c0c5"/><path d="M8 8v15M12 8v15M16 8v15" stroke="#c9d0d4"/></svg>';
const SPARK15 = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 2.5c.6 4.3 2.8 6.5 7.1 7.1-4.3.6-6.5 2.8-7.1 7.1-.6-4.3-2.8-6.5-7.1-7.1 4.3-.6 6.5-2.8 7.1-7.1z"/><path d="M18.4 13.4c.3 2.1 1.3 3.1 3.4 3.4-2.1.3-3.1 1.3-3.4 3.4-.3-2.1-1.3-3.1-3.4-3.4 2.1-.3 3.1-1.3 3.4-3.4z" opacity=".75"/></svg>';

/** Source dkFindAll (L11407): desktop items and one level of folder children. */
export function dkFindAll(items: Item[], id: string): { it: Item; list: Item[]; parent?: Item } | null {
  for (const it of items) { if (it.id === id) return { it, list: items }; if (it.type === "folder") { const k = (it.kids || []).find((x) => x.id === id); if (k) return { it: k, list: it.kids!, parent: it }; } }
  return null;
}

function DkWin({ w, title, icon, width, cls = "", children }: { w: DkWinState; title: string; icon: React.ReactNode; width: number; cls?: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLElement | null>(null);
  const close = useDkWins((s) => s.close), front = useDkWins((s) => s.front);
  const W = Math.min(width, typeof innerWidth === "number" ? innerWidth - 24 : width);
  const [pos] = useState(() => ({ left: Math.max(12, Math.min(innerWidth - W - 12, (innerWidth - W) / 2 + w.n * 28)), top: Math.max(70, 110 + w.n * 28) }));
  const closing = useRef(false);
  const doClose = () => { if (closing.current) return; closing.current = true; const el = ref.current; if (!el || reducedMotion()) { close(w.key); return; } el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.95) translateY(8px)" }], { duration: 200, easing: "ease-in" }).finished.then(() => close(w.key)); };
  useLayoutEffect(() => {
    const el = ref.current!; if (reducedMotion()) return; const r = el.getBoundingClientRect(); let tf = "translateY(14px) scale(.94)";
    if (w.from) { const f = w.from; tf = `translate(${f.left + f.width / 2 - r.left - r.width / 2}px,${f.top + f.height / 2 - r.top - r.height / 2}px) scale(.15)`; }
    el.animate([{ opacity: 0, transform: tf }, { opacity: 1, transform: "none" }], { duration: 480, easing: "cubic-bezier(.2,1.1,.3,1)" });
    setTimeout(() => el.querySelector<HTMLElement>(".dk-wb button,.dk-wb [tabindex]")?.focus({ preventScroll: true }), 80);
  }, [w.from]);
  const d = useRef<{ x: number; y: number } | null>(null);
  return (
    <section ref={ref} className={"dk-win " + cls} data-key={w.key} role="dialog" aria-label={title} style={{ width: W, left: pos.left, top: pos.top }}
      onPointerDownCapture={() => front(w.key)} onKeyDownCapture={(e) => { if (e.key === "Escape") { stopAll(e); doClose(); } }}>
      <header className="dk-wh"
        onPointerDown={(e) => { if ((e.target as Element).closest("button")) return; const el = ref.current!; d.current = { x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); el.classList.add("moving"); }}
        onPointerMove={(e) => { if (!d.current) return; const el = ref.current!; const l = Math.max(-W + 80, Math.min(innerWidth - 80, e.clientX - d.current.x)), tp = Math.max(58, Math.min(innerHeight - 50, e.clientY - d.current.y)); el.style.left = l + "px"; el.style.top = tp + "px"; }}
        onPointerUp={() => { d.current = null; ref.current?.classList.remove("moving"); }}>
        {icon}<b dir="auto">{title}</b><span className="sp"></span>
        <button type="button" className="dk-wx" aria-label={t("dkClose")} title={t("dkClose")} onClick={doClose}><SvgString html={X} /></button>
      </header>
      <div className="dk-wb">{children}</div>
    </section>
  );
}

export function DkWindows() {
  const wins = useDkWins((s) => s.wins);
  const sorted = [...wins].sort((a, b) => a.z - b.z);
  return <>{sorted.map((w) => <OneWin key={w.key} w={w} />)}</>;
}

function OneWin({ w }: { w: DkWinState }) {
  const { t, nf, loc } = useI18n();
  const dkName = useDkName();
  const s = useShell();
  const items = s.desks[s.cur]?.items ?? [];
  const deskName = (i: number) => s.desks[i]?.n || t("desktopN", { n: nf(i + 1) });
  if (w.kind === "trash") {
    const act = (a: string, id?: string) => {
      if (a === "empty") { s.mutate((st) => { st.trash = []; }, { save: false, trash: true }); s.showToast(t("dkEmptied")); return; } // no confirmation (as source)
      const i = s.trash.findIndex((x) => x.id === id); if (i < 0) return; const it = s.trash[i];
      const { from, at: _at, ...rest } = it; void _at; const target = Math.min(from ?? s.cur, s.desks.length - 1);
      s.mutate((st) => { st.trash.splice(i, 1); }, { save: false, trash: true });
      if (target === s.cur) desktopApi.add(rest as Item, rest.c ?? 0, rest.r ?? 0, true);
      else s.mutate((st) => { (st.desks[target].items ??= []).push(rest as Item); });
      s.showToast(t("dkRestored", { x: dkName(it) }));
    };
    return (
      <DkWin w={w} title={t("dkTrash")} icon={<SvgString html={TRASH_IC} />} width={460}>
        {s.trash.length ? <><ul className="dk-tlist">{s.trash.map((x, j) => (
          <li key={x.id} style={{ ["--j" as string]: j }}><Glyph it={x} size={30} /><span className="tx"><b dir="auto">{dkName(x)}</b><small>{deskName(Math.min(x.from ?? 0, s.desks.length - 1))} · {new Intl.DateTimeFormat(loc(), { dateStyle: "short", timeStyle: "short" }).format(x.at)}</small></span><button type="button" className="ai-btn" data-tra="restore" data-id={x.id} onClick={() => act("restore", x.id)}>{t("dkRestore")}</button></li>))}</ul>
          <div className="dk-wact"><button type="button" className="ai-btn" data-tra="empty" style={{ color: "var(--red)" }} onClick={() => act("empty")}>{t("dkEmptyTrash")}</button></div></>
          : <p className="dk-wempty"><SvgString html={TRASH_BIG} /><span>{t("dkTrashEmpty")}</span></p>}
      </DkWin>
    );
  }
  // Shortcuts to Files-app documents open their target, which lives outside the desktop (fsFind, L11863).
  const r = dkFindAll(items, w.id) ?? (() => { const f = fsFind(w.id); return f ? { it: f.node, list: f.list } : null; })();
  if (!r) return null;
  const it = r.it;
  /** Folder-window item menu (L11501) and dkOutOfFolder (L11503). Delete has no toast/undo, as in the source. */
  const kidMenu = (x: number, y: number, folder: Item, kid: Item, el: HTMLElement) => dkMenuShow(x, y, [
    { l: t("dkOpen"), run: () => desktopApi.open(kid, el) },
    { l: t("dkMoveOut"), run: () => { s.mutate(() => { folder.kids = (folder.kids || []).filter((z) => z !== kid); }); desktopApi.add({ ...kid }, (folder.c ?? 0) + 1, folder.r ?? 0, true); } },
    ...(kid.type === "doc" ? [{ l: t("dkAskAI"), ai: true, run: () => osActions.askAI(kid) }] : []),
    "-",
    { l: t("dkDelete"), danger: true, run: () => { s.mutate((st) => { folder.kids = (folder.kids || []).filter((z) => z !== kid); st.trash.unshift({ ...kid, from: st.cur, at: Date.now() }); }, { save: true, trash: true }); popTrashBtn(); } },
  ]);
  if (w.kind === "folder") {
    const k = it.kids || [];
    return (
      <DkWin w={w} title={it.name!} icon={<SvgString html={FOLD_IC} />} width={520}>
        {k.length ? <><div className="dk-fgrid">{k.map((x) => (
          <button key={x.id} type="button" className="dk-ic in" data-kid={x.id} data-fid={it.id} title={dkName(x)}
            onContextMenu={(e) => { e.preventDefault(); const el = e.currentTarget; kidMenu(e.clientX, e.clientY, it, x, el); }}
            onDoubleClick={(e) => desktopApi.open(x, e.currentTarget)}>
            <Glyph it={x} size={46} /><span className="nm" dir="auto">{dkName(x)}</span></button>))}</div>
          <p className="dk-wfoot">{k.length === 1 ? t("dkItem1") : t("dkItems", { n: nf(k.length) })}</p></>
          : <p className="dk-wempty"><SvgString html={FOLD_IC} /><span>{t("dkFolderEmpty")}</span></p>}
      </DkWin>
    );
  }
  const ext = dkExt(it.name).toUpperCase() || "FILE";
  const rows: [string, string][] = [["dkKind", t("kDoc", { x: ext })], ["dkSize", fmtSize(it.size, nf)], ["dkModified", it.mod ? new Intl.DateTimeFormat(loc(), { dateStyle: "medium", timeStyle: "short" }).format(it.mod) : "—"], ["dkWhere", deskName(s.cur)]];
  return (
    <DkWin w={w} title={it.name!} icon={<Glyph it={it} size={22} sm />} width={560} cls="ql">
      <div className="dk-ql"><div className="dk-ql-l"><Glyph it={it} size={96} /><dl>{rows.map(([k, v]) => <QlRow key={k} k={t(k)} v={v} />)}</dl></div>
        <div className="dk-ql-r">{it.text ? <pre className="dk-ql-txt" dir="auto">{it.text.slice(0, 4000)}</pre>
          : <><div className="dk-ql-page" aria-hidden="true">{[92, 70, 84, 60, 88, 76, 40, 82, 66].map((x, i) => <i key={i} style={{ width: x + "%" }}></i>)}</div><small className="dk-ql-note">{t("dkSampleNote")}</small></>}</div></div>
      <div className="dk-wact"><button type="button" className="ai-btn" data-qla="open" data-id={it.id} onClick={() => s.showToast(t("opened", { x: it.name! }))}>{t("dkOpen")}</button>
        <button type="button" className="ai-btn pri" data-qla="ai" data-id={it.id}><SvgString html={SPARK15} /><span>{t("dkAskAI")}</span></button></div>
    </DkWin>
  );
}
function QlRow({ k, v }: { k: string; v: string }) { return <><dt>{k}</dt><dd dir="auto">{v}</dd></>; }

function popTrashBtn() { const tb = document.querySelector<HTMLElement>('#dock [data-t="trash"]'); if (tb && !reducedMotion()) tb.animate([{ transform: "scale(1)" }, { transform: "scale(1.2) rotate(-6deg)" }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,1.4,.3,1)" }); }
/** Dock trash: full state + click opens the trash window (L11504–L11516). */
export function useTrashDock() {
  const n = useShell((s) => s.trash.length);
  useEffect(() => { document.querySelector('#dock [data-t="trash"]')?.classList.toggle("dk-full", n > 0); }, [n]);
  useEffect(() => {
    const h = (e: MouseEvent) => { const tb = (e.target as Element).closest?.('#dock [data-t="trash"]'); if (!tb) return; e.stopImmediatePropagation(); e.preventDefault(); openDkWin({ kind: "trash" }, tb); };
    document.addEventListener("click", h, true); return () => document.removeEventListener("click", h, true);
  }, []);
}
