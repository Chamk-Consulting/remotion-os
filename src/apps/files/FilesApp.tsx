"use client";
/** Files manager window (source L12013–L12251): sidebar places, toolbar, list / grid, detail panel, rename, tags, upload. */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { reducedMotion } from "@/lib/motion";
import icons from "@/os/shell/data/icons.json";
import { SvgString } from "@/os/shell/svg";
import { useShell } from "@/os/state/shell";
import { registerOsAction, type FilesLoc } from "@/os/actions";
import { osMenu, type MenuItem } from "@/os/menu/OsMenu";
import { itemMenuItems } from "@/os/desktop/menus";
import { desktopApi } from "@/os/desktop/api";
import { openDkWin } from "@/os/desktop/windows";
import { gotoDesk } from "@/os/desktop/DesktopsPanel";
import { Glyph } from "@/os/desktop/Glyph";
import { fsFind } from "@/os/desktop/fs";
import { dkExt, dkId, fmtSize, type Item, type TrashItem } from "@/os/desktop/model";
import { osFocus, osRestore, osWinOpen, useWm } from "@/os/windows/wm";
import {
  FM, FM_NAV, dkName, fmClip, fmDate, fmDelete, fmDuplicate, fmGo, fmIsContainer, fmItems, fmLoc, fmPasteTo, fmRefresh, fmRootName, fmSelNodes, fmSetSel,
  fmTypeLabel, fsSaveAll, move, nf as tnf, t as tt, trashAct, useFm, type FmLoc,
} from "./fm";
import { ghost, ghostFs } from "@/os/desktop/ghost";

const OIC = icons.OIC as Record<string, string>, OSI = icons.OSI as Record<string, string>;
const H = ({ h }: { h: string }) => <SvgString html={h} />;
const CHEV_DOWN = OSI.chev.replace("m9 6 6 6-6 6", "m6 9 6 6 6-6");
const FOLDER_IC = OIC.folder.replace('width="17" height="15"', 'width="22" height="19"').replace("#f5b52e", "#3e86e8");

/* ---------- open (osFiles, L12091) ---------- */
export function osFiles(from?: Element | null, loc?: FmLoc) {
  const ex = useWm.getState().wins.files;
  if (!ex || ex.closing) {
    const W = Math.min(780, innerWidth - 24), H_ = Math.min(472, innerHeight - 170), x = document.documentElement.dir === "rtl" ? 10 : innerWidth - W - 10, y = Math.max(80, innerHeight - H_ - 138);
    useFm.setState({ open: true });
    osWinOpen("files", { title: (t) => t("files"), icon: <SvgString html={FOLDER_IC} />, cls: "fm-win", w: W, h: H_, x, y, minW: 560, minH: 340, body: <FilesBody />, from: from ?? null, onClose: () => useFm.setState({ open: false, renaming: null }) });
    if (loc) fmGo(loc, true); else fmRefresh(true);
  } else { if (ex.min) osRestore("files"); osFocus("files"); if (loc) fmGo(loc); }
}
registerOsAction("files", (from, loc) => osFiles(from, loc as FilesLoc | undefined));
ghostFs.isContainer = fmIsContainer; ghostFs.del = fmDelete; ghostFs.move = (nodes, dest) => move(nodes, dest);

/* ---------- open a node (fmOpenNode, L12101) ---------- */
export function fmOpenNode(n: Item | undefined, rowEl: HTMLElement | null) {
  if (!n || FM().root === "trash") return;
  if (n.virt) { fmGo({ root: n.virt, path: [] }); return; }
  if (n.type === "folder") { const f = fsFind(n.id); if (!f) return; if (f.root === "desktop" && f.desk !== useShell.getState().cur) gotoDesk(f.desk); fmGo({ root: f.root, path: [...f.path.map((p) => p.id), n.id] }); return; }
  if (n.type === "doc" && n.ref) { const r = fsFind(n.ref); if (r) { fmOpenNode(r.node, rowEl); return; } }
  if (n.type === "doc") { openDkWin({ kind: "ql", id: n.id }, rowEl); return; }
  desktopApi.open(n, rowEl);
}
const rowEl = (id: string) => document.querySelector<HTMLElement>(`.fm [data-id="${CSS.escape(id)}"]`);
const fmCtx = () => ({
  root: FM().root, path: FM().path, open: (n: Item) => fmOpenNode(n, rowEl(n.id)), rename: (n: Item) => useFm.setState({ renaming: n.id }),
  copy: (cut: boolean) => { fmClip.clip = { ids: [...FM().sel], cut }; useShell.getState().showToast(tt("fmCopied", { n: tnf(FM().sel.size) })); },
  dup: () => fmDuplicate(), del: () => fmDelete(fmSelNodes()),
  info: (n: Item) => { fmSetSel([n.id]); const d = document.querySelector<HTMLElement>(".fm .fm-det"); if (d && !reducedMotion()) d.animate([{ boxShadow: "inset 0 0 0 2px rgba(34,177,76,.6)" }, { boxShadow: "inset 0 0 0 0 rgba(34,177,76,0)" }], { duration: 1000 }); },
});

/* ---------- menus (L12185–L12200) ---------- */
function fmItemMenu(x: number, y: number) {
  const nodes = fmSelNodes(); if (!nodes.length) return; const t = tt;
  if (FM().root === "trash") { osMenu(x, y, [{ l: t("dkRestore"), ic: OIC.restoreT, run: () => nodes.forEach((n) => trashAct("restore", n.id)) }, "-", { l: t("fmDeleteForever"), ic: OIC.del, danger: true, run: () => fmDelete(nodes) }]); return; }
  if (FM().root === "home") { osMenu(x, y, [{ l: t("fmOpen"), ic: OIC.open, run: () => fmOpenNode(nodes[0], null) }]); return; }
  osMenu(x, y, itemMenuItems({ t, nf: tnf, add: desktopApi.add }, nodes, fmCtx()));
}
function newFolder() {
  const t = tt, F = FM(); const f: Item = { id: dkId(), type: "folder", name: t("dkUntitledFolder"), kids: [], mod: Date.now() };
  if (F.root === "desktop" && !F.path.length) desktopApi.add(f, 0, 0, true); else fmLoc(F.root, F.path).list!.push(f);
  fsSaveAll(); fmRefresh(); fmSetSel([f.id]); setTimeout(() => useFm.setState({ renaming: f.id }), 80);
}
function fmBgMenu(x: number, y: number) {
  const t = tt, F = FM(), can = fmIsContainer(F.root);
  const sort = (k: "name" | "size" | "type" | "mod") => () => { useFm.setState({ sort: { k, d: 1 } }); fmRefresh(true); };
  const items: MenuItem[] = [
    ...(can ? [{ l: t("fmNewFolder"), ic: OIC.folder, run: newFolder }, { l: t("fmUpload"), ic: OIC.up, run: () => document.querySelector<HTMLInputElement>(".fm .fm-file")?.click() }, { l: t("cmPaste"), ic: OIC.paste, kbd: "Ctrl+V", disabled: !fmClip.clip, run: () => fmPasteTo({ root: F.root, path: F.path }) }, "-"] as MenuItem[] : []),
    { l: t("cmSort"), sub: ([["name", "sName"], ["size", "sSize"], ["type", "sType"], ["mod", "sDate"]] as const).map(([k, l]) => ({ l: t(l), check: FM().sort.k === k, run: sort(k) })) },
    { l: t("cmView"), sub: [{ l: t("fmList"), check: FM().view === "list", run: () => { useFm.setState({ view: "list" }); fmRefresh(true); } }, { l: t("fmGrid"), check: FM().view === "grid", run: () => { useFm.setState({ view: "grid" }); fmRefresh(true); } }] },
    ...(F.root === "trash" && useShell.getState().trash.length ? ["-", { l: t("dkEmptyTrash"), ic: OIC.del, danger: true, run: () => trashAct("empty") }] as MenuItem[] : []),
  ];
  osMenu(x, y, items);
}

/* ---------- body ---------- */
function FilesBody() {
  const { t, nf, lang } = useI18n();
  const F = useFm(); const s = useShell();
  // osRelabel (L12301): a new body (empty search box, FM.q kept) and fmRefresh(false).
  const epoch = useEpoch(lang);
  useLayoutEffect(() => { if (epoch) fmRefresh(false); }, [epoch]);
  // renderIcons wrapper (L12245): the Files view follows desktop changes when it shows the desktop.
  const rev = s.rev; const prevRev = useRef(rev);
  useEffect(() => { if (prevRev.current === rev) return; prevRev.current = rev; if (FM().root === "desktop") fmRefresh(false); }, [rev]);
  // dkSwitch wrapper (L12246): a desktop switch resets a desktop view.
  const cur = s.cur; const prevCur = useRef(cur);
  useEffect(() => { if (prevCur.current === cur) return; prevCur.current = cur; const id = setTimeout(() => { if (FM().root === "desktop") { useFm.setState({ path: [], sel: new Set(), detail: null }); fmRefresh(true); } }, 20); return () => clearTimeout(id); }, [cur]);

  // Drag rows to folders, places, the desktop or the trash (L12224).
  useEffect(() => ghost.arm(".fm .fm-row[data-id], .fm .fm-tile[data-id]", (el) => {
    const r = FM().root; if (!fmIsContainer(r) && r !== "recent" && r !== "favs") return null;
    const id = el.dataset.id!; if (!FM().sel.has(id)) fmSetSel([id]); const nodes = fmSelNodes(); if (!nodes.length) return null;
    return { kind: "fs", ids: nodes.map((n) => n.id), it: nodes[0], label: nodes.length > 1 ? tt("dkCount", { n: tnf(nodes.length) }) : dkName(nodes[0]) };
  }), []);
  const crumbs = () => {
    const r = F.root; if (!fmIsContainer(r)) return <span className="cr cur">{fmRootName(r)}</span>;
    const { trail } = fmLoc(r, F.path);
    const parts = [<button key="r" type="button" className="cr" data-fmcrumb="-1">{fmRootName(r)}</button>, ...trail.map((n, i) => <button key={n.id} type="button" className={"cr" + (i === trail.length - 1 ? " cur" : "")} data-fmcrumb={i}>{n.name}</button>)];
    return parts.map((p, i) => <Fragment key={i}>{i ? <span className="sep"><H h={OSI.chev} /></span> : null}{p}</Fragment>);
  };
  const sortH = (k: "name" | "size" | "type" | "mod", l: string) => <button type="button" className={"h-" + k} data-fmsort={k}>{t(l)}{F.sort.k === k ? <span className={"ar" + (F.sort.d < 0 ? " up" : "")}><H h={CHEV_DOWN} /></span> : null}</button>;
  const items = F.snap.items, noAnim = F.snap.anim ? undefined : "none";
  const name = (n: Item) => (F.renaming === n.id ? <RenameInput n={n} /> : <span className="nm" dir="auto">{dkName(n)}</span>);
  const row = (n: Item, i: number) => {
    const sel = F.sel.has(n.id), isF = n.type === "folder";
    return <div key={F.snap.n + ":" + n.id} className={"fm-row" + (sel ? " on" : "")} role="row" aria-selected={sel} data-id={n.id} {...(isF ? { "data-folder": "1" } : {})} tabIndex={sel ? 0 : -1} style={{ ["--i" as string]: i, animation: noAnim }}>
      <span className="c-name"><Glyph it={n} size={22} xsAll />{name(n)}{n.fav ? <span className="fv"><H h={OIC.starF} /></span> : null}{n.sc || n.ref ? <span className="lnk"><H h={OSI.chev} /></span> : null}</span>
      <span className="c-size">{isF || n.type === "app" || n.type === "link" ? "—" : fmtSize(n.size, nf)}</span><span className="c-type">{fmTypeLabel(n)}</span><span className="c-mod">{fmDate(n.mod || (n as TrashItem).at)}</span></div>;
  };
  const tile = (n: Item, i: number) => { const sel = F.sel.has(n.id); return <div key={F.snap.n + ":" + n.id} className={"fm-tile" + (sel ? " on" : "")} data-id={n.id} {...(n.type === "folder" ? { "data-folder": "1" } : {})} tabIndex={sel ? 0 : -1} style={{ ["--i" as string]: i, animation: noAnim }}><Glyph it={n} size={48} />{name(n)}</div>; };
  const detail = () => {
    const id = F.detail, n = id ? fmItems().find((x) => x.id === id) || fsFind(id)?.node || s.trash.find((x) => x.id === id) : null;
    if (!n) return <p className="fm-dhint"><H h={OIC.info} /><span>{t("fmSelectHint")}</span></p>;
    const isF = n.type === "folder", typ = isF ? t("fmFolderT") : n.type === "app" ? t("fmAppT") : n.type === "link" ? t("fmLinkT") : t("fmDocT", { x: fmTypeLabel(n) });
    const rows: [string, string][] = [["fmSize", isF ? t("fmItems", { n: nf((n.kids || []).length) }) : n.type === "doc" ? fmtSize(n.size, nf) : "—"], ["fmModified", fmDate(n.mod || (n as TrashItem).at, true)], ["fmType", typ], ["fmLocation", n.virt ? "/" : pathStr(n)], ["fmOwner", t("fmYou")]];
    return <><div className="fm-dh"><Glyph it={n} size={56} /><div><b dir="auto">{dkName(n)}</b><small>{typ}</small></div></div>
      <div className="fm-dact"><button type="button" className="ai-btn" data-fma="open">{t("fmOpen")}</button><button type="button" className="os-ib" data-fma="more" aria-label={t("fmMore")}><H h={OIC.dots} /></button></div>
      <h4>{t("fmInformation")}</h4><dl>{rows.map(([k, v]) => <Fragment key={k}><dt>{t(k)}</dt><dd dir="auto">{v}</dd></Fragment>)}</dl>
      {n.virt || F.root === "trash" ? null : <><h4>{t("fmTags")}</h4><div className="fm-tags">{(n.tags || []).map((tg) => <span key={tg} className="tag">{tg}<button type="button" data-untag={tg} aria-label="×">×</button></span>)}<input className="fm-tagin" placeholder={t("fmAddTag")} maxLength={24} /></div></>}</>;
  };
  const pathStr = (n: Item) => { const f = fsFind(n.id); if (!f) return F.root === "trash" ? t("fmTrash") : "/"; const base = f.root === "desktop" ? t("fmDesktop") : fmRootName(f.root); return "/" + [base, ...f.path.map((p) => p.name)].join("/"); };
  let used = 28.4; { let sz = 0; const st = useShell.getState(); const walk = (L: Item[]) => L.forEach((n) => { if (n.type === "doc") sz += n.size || 0; if (n.type === "folder") walk(n.kids || []); }); st.desks.forEach((d) => walk(d.items || [])); Object.values(st.fs || {}).forEach((L) => walk((L as Item[]) || [])); used += sz / 1e9; }

  return (
    <div className="fm" key={epoch} onClick={onClick} onDoubleClick={onDbl} onContextMenu={onCtx} onKeyDown={onKey} onInput={onInput} onChange={onChange}>
      <aside className="fm-nav">{FM_NAV.map((x, i) => (x === "-" ? <div key={i} className="sp"></div> : <button key={x[0]} type="button" data-fmroot={x[0]} className={F.root === x[0] ? "on" : undefined}><H h={OIC[x[2]]} /><span>{t(x[1])}</span></button>))}
        <div className="fm-store"><p>{t("fmStorage")}</p><div className="row"><H h={OIC.drive} /><div><b>{t("fmPersonal")}</b><small className="u">{t("fmUsage", { a: nf(Math.round(used * 10) / 10), b: nf(100) })}</small></div></div><span className="bar"><i style={{ width: Math.min(100, used) + "%" }}></i></span></div></aside>
      <div className="fm-main"><div className="fm-tb"><button type="button" className="os-ib" data-fmt="back" aria-label={t("fmBack")} title={t("fmBack")} disabled={!F.hist.length}><H h={OIC.back} /></button><button type="button" className="os-ib" data-fmt="fwd" aria-label={t("fmForward")} title={t("fmForward")} disabled={!F.fwd.length}><H h={OIC.fwd} /></button><nav className="fm-crumbs" aria-label="path">{crumbs()}</nav><label className="fm-search"><H h={OIC.search} /><input type="search" placeholder={t("fmSearch")} autoComplete="off" /></label>
        <div className="fm-tbg"><button type="button" className="os-ib" data-fmt="grid" aria-label={t("fmGrid")} title={t("fmGrid")} aria-pressed={F.view === "grid"}><H h={OIC.grid} /></button><button type="button" className="os-ib" data-fmt="list" aria-label={t("fmList")} title={t("fmList")} aria-pressed={F.view === "list"}><H h={OIC.list} /></button></div>
        <div className="fm-tbg"><button type="button" className="os-ib" data-fmt="share" aria-label={t("fmShare")} title={t("fmShare")}><H h={OIC.up} /></button><button type="button" className="os-ib" data-fmt="upload" aria-label={t("fmUpload")} title={t("fmUpload")}><H h={OIC.up} /></button><button type="button" className="os-ib" data-fmt="del" aria-label={t("fmDelete")} title={t("fmDelete")}><H h={OIC.del} /></button><button type="button" className="os-ib" data-fmt="more" aria-label={t("fmMore")} title={t("fmMore")}><H h={OIC.dots} /></button></div><input type="file" className="fm-file" multiple hidden /></div>
        <div className="fm-content"><div className={"fm-table" + (F.view !== "list" ? " grid" : "")} role="grid" tabIndex={0}>
          {F.view === "list" ? <div className="fm-head" role="row">{sortH("name", "fmName")}{sortH("size", "fmSize")}{sortH("type", "fmType")}{sortH("mod", "fmModified")}</div> : null}
          <div className="fm-rows">{items.length ? (F.view === "list" ? items.map(row) : <div className="fm-tiles">{items.map(tile)}</div>) : <p className="fm-empty">{F.q ? t("fmNoResult", { x: F.q }) : t("fmEmpty")}</p>}</div>
        </div><aside className="fm-det" aria-live="polite" key={F.detN}>{detail()}</aside></div></div>
    </div>
  );
}
/** Counts language changes since mount (osRelabel rebuilds the body on each one). */
function useEpoch(lang: string) {
  const [st, setSt] = useState({ lang, n: 0 });
  if (st.lang !== lang) { setSt({ lang, n: st.n + 1 }); return st.n + 1; }
  return st.n;
}
function RenameInput({ n }: { n: Item }) {
  const ref = useRef<HTMLInputElement | null>(null), done = useRef(false);
  useEffect(() => { const inp = ref.current!; inp.focus(); const ext = dkExt(n.name); inp.setSelectionRange(0, ext && n.type === "doc" ? n.name!.length - ext.length - 1 : n.name!.length); }, [n]);
  const fin = (save: boolean) => {
    if (done.current) return; done.current = true; const v = ref.current!.value.trim();
    if (save && v && v !== n.name) useShell.getState().mutate(() => { n.name = v; n.mod = Date.now(); }, { save: true, fs: true });
    useFm.setState({ renaming: null }); fmRefresh(); requestAnimationFrame(() => rowEl(n.id)?.focus());
  };
  return <input ref={ref} className="fm-ren" defaultValue={n.name} dir="auto" onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") fin(true); else if (e.key === "Escape") fin(false); }} onBlur={() => fin(true)} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} />;
}

/* ---------- events (L12167–L12222) ---------- */
function onClick(e: React.MouseEvent) {
  const el = e.target as Element, fm = el.closest(".fm")!, F = FM(), t = tt;
  const nv = el.closest<HTMLElement>("[data-fmroot]"); if (nv) { fmGo({ root: nv.dataset.fmroot!, path: [] }); return; }
  const cr = el.closest<HTMLElement>("[data-fmcrumb]"); if (cr) { const i = +cr.dataset.fmcrumb!; fmGo({ root: F.root, path: F.path.slice(0, i + 1) }); return; }
  const so = el.closest<HTMLElement>("[data-fmsort]"); if (so) { const k = so.dataset.fmsort as "name"; useFm.setState({ sort: F.sort.k === k ? { k, d: (-F.sort.d) as 1 | -1 } : { k, d: 1 } }); fmRefresh(true); return; }
  const tb = el.closest<HTMLButtonElement>("[data-fmt]");
  if (tb) {
    const a = tb.dataset.fmt;
    if (a === "back" && F.hist.length) { const h = F.hist.slice(), last = h.pop()!; useFm.setState({ fwd: [...F.fwd, { root: F.root, path: F.path.slice() }], hist: h }); fmGo(last, true); return; }
    if (a === "fwd" && F.fwd.length) { const f = F.fwd.slice(), last = f.pop()!; useFm.setState({ hist: [...F.hist, { root: F.root, path: F.path.slice() }], fwd: f }); fmGo(last, true); return; }
    if (a === "grid" || a === "list") { useFm.setState({ view: a }); fmRefresh(true); return; }
    if (a === "share") { const n = fmSelNodes()[0]; navigator.clipboard?.writeText(`https://remotion.io/s/${n ? n.id : F.root}`).catch(() => {}); useShell.getState().showToast(t("fmLinkCopied")); return; }
    if (a === "upload") { if (!fmIsContainer(F.root)) { useShell.getState().showToast(t("fmCantHere")); return; } fm.querySelector<HTMLInputElement>(".fm-file")!.click(); return; }
    if (a === "del") { const s = fmSelNodes(); if (s.length) fmDelete(s); return; }
    if (a === "more") { const r = tb.getBoundingClientRect(); fmBgMenu(r.left, r.bottom + 4); return; }
  }
  const da = el.closest<HTMLElement>("[data-fma]");
  if (da) { const n = (F.detail && (fsFind(F.detail)?.node || fmItems().find((x) => x.id === F.detail) || useShell.getState().trash.find((x) => x.id === F.detail))) || null; if (!n) return; if (da.dataset.fma === "open") fmOpenNode(n, da); else { const r = da.getBoundingClientRect(); fmItemMenu(r.left, r.bottom + 4); } return; }
  const ut = el.closest<HTMLElement>("[data-untag]"); if (ut) { const n = F.detail ? fsFind(F.detail)?.node : null; if (n) { useShell.getState().mutate(() => { n.tags = (n.tags || []).filter((x) => x !== ut.dataset.untag); }, { save: true, fs: true }); fmSetSel([n.id]); } return; }
  const row = el.closest<HTMLElement>(".fm-row,.fm-tile");
  if (row) {
    const id = row.dataset.id!;
    if (e.shiftKey && F.detail) { const ids = fmItems().map((n) => n.id), a = ids.indexOf(F.detail), b = ids.indexOf(id); fmSetSel(ids.slice(Math.min(a, b), Math.max(a, b) + 1)); }
    else if (e.ctrlKey || e.metaKey) { if (F.sel.has(id)) { const s = new Set(F.sel); s.delete(id); useFm.setState({ sel: s }); fmSetSel([...s]); } else fmSetSel([id], true); }
    else fmSetSel([id]);
    row.focus({ preventScroll: true }); return;
  }
  if (el.closest(".fm-rows") && !el.closest(".fm-row,.fm-tile")) fmSetSel([]);
}
function onDbl(e: React.MouseEvent) { const row = (e.target as Element).closest<HTMLElement>(".fm-row,.fm-tile"); if (!row) return; const n = fmItems().find((x) => x.id === row.dataset.id); fmOpenNode(n, row); }
function onCtx(e: React.MouseEvent) {
  const el = e.target as Element; if (el.closest("input")) return; e.preventDefault();
  const row = el.closest<HTMLElement>(".fm-row,.fm-tile");
  if (row) { if (!FM().sel.has(row.dataset.id!)) fmSetSel([row.dataset.id!]); fmItemMenu(e.clientX, e.clientY); }
  else if (el.closest(".fm-table")) fmBgMenu(e.clientX, e.clientY);
}
function onKey(e: React.KeyboardEvent) {
  const el = e.target as HTMLElement;
  if (el.classList.contains("fm-tagin")) { if (e.key !== "Enter") return; e.preventDefault(); const v = (el as HTMLInputElement).value.trim().slice(0, 24); const n = FM().detail ? fsFind(FM().detail!)?.node : null; if (v && n) { useShell.getState().mutate(() => { n.tags = [...new Set([...(n.tags || []), v])]; }, { save: true, fs: true }); fmSetSel([n.id]); requestAnimationFrame(() => document.querySelector<HTMLElement>(".fm .fm-tagin")?.focus()); } return; }
  if (el.closest("input")) return;
  const fm = el.closest(".fm")!, F = FM(), items = fmItems(), cur0 = items.findIndex((n) => n.id === F.detail), k = e.key, mod = e.ctrlKey || e.metaKey;
  if (k === "ArrowDown" || k === "ArrowUp" || (F.view === "grid" && (k === "ArrowLeft" || k === "ArrowRight"))) {
    e.preventDefault(); const step = k === "ArrowDown" || k === "ArrowRight" ? 1 : -1; const n = items[Math.max(0, Math.min(items.length - 1, cur0 + step))];
    if (n) { fmSetSel([n.id], e.shiftKey); requestAnimationFrame(() => { const r = fm.querySelector<HTMLElement>(`[data-id="${CSS.escape(n.id)}"]`); r?.focus(); r?.scrollIntoView({ block: "nearest" }); }); } return;
  }
  if (k === "Enter" && F.detail) { e.preventDefault(); fmOpenNode(items[cur0], fm.querySelector<HTMLElement>(`[data-id="${CSS.escape(F.detail)}"]`)); return; }
  if (k === "Backspace" && !mod) { e.preventDefault(); if (F.path.length) fmGo({ root: F.root, path: F.path.slice(0, -1) }); return; }
  if (k === "Delete") { e.preventDefault(); const s = fmSelNodes(); if (s.length) fmDelete(s); return; }
  if (k === "F2" && F.detail) { e.preventDefault(); useFm.setState({ renaming: F.detail }); return; }
  const lk = k.toLowerCase();
  if (mod && lk === "a") { e.preventDefault(); fmSetSel(items.map((n) => n.id)); return; }
  if (mod && lk === "c" && F.sel.size) { e.preventDefault(); fmCtx().copy(false); return; }
  if (mod && lk === "x" && F.sel.size) { e.preventDefault(); fmCtx().copy(true); return; }
  if (mod && lk === "v" && fmIsContainer(F.root)) { e.preventDefault(); fmPasteTo({ root: F.root, path: F.path }); return; }
  if (mod && lk === "d") { e.preventDefault(); fmDuplicate(); return; }
  if (mod && lk === "i" && F.detail) { e.preventDefault(); fmCtx().info(items[cur0]); return; }
}
function onInput(e: React.FormEvent) { const el = e.target as HTMLInputElement; if (el.closest(".fm-search")) { useFm.setState({ q: el.value }); fmRefresh(false); } }
async function onChange(e: React.ChangeEvent) {
  const inp = e.target as HTMLInputElement; if (!inp.classList.contains("fm-file")) return;
  const files = [...(inp.files || [])].slice(0, 12); inp.value = ""; if (!files.length) return;
  const F = FM(), L = F.root === "desktop" && !F.path.length ? null : fmLoc(F.root, F.path).list!; const ids: string[] = [];
  for (const f of files) {
    let text: string | null = null;
    if (f.size < 200000 && /\.(md|txt|csv|json|html?|js|ts|py|xml|ya?ml|log)$/i.test(f.name)) { try { text = (await f.text()).slice(0, 20000); } catch { /* unreadable */ } }
    // `text: null` is stored as in the source when the file is not read.
    const n: Item = { id: dkId(), type: "doc", name: f.name, size: f.size, mod: f.lastModified || Date.now(), text };
    if (L) L.push(n); else desktopApi.add(n, 0, 0, true); ids.push(n.id);
  }
  fsSaveAll(); fmRefresh(true); fmSetSel(ids); useShell.getState().showToast(tt("fmUploaded", { n: tnf(ids.length) }));
}
