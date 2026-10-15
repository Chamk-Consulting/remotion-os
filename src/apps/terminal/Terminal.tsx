"use client";
/** Terminal window (source L12252–L12297): a small shell over the virtual file system. */
import { useEffect, useLayoutEffect, useRef } from "react";
import { create } from "zustand";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useShell } from "@/os/state/shell";
import { registerOsAction } from "@/os/actions";
import { alInst } from "@/os/desktop/menus";
import { desktopApi } from "@/os/desktop/api";
import { Glyph } from "@/os/desktop/Glyph";
import { FS_ROOTS } from "@/os/desktop/fs";
import { dkId, type Item } from "@/os/desktop/model";
import { osFocus, osRestore, osWinOpen, useWm } from "@/os/windows/wm";
import { dkName, fmDelete, fmLoc, fmRefresh, fmRootName, fsSaveAll, t } from "@/apps/files/fm";
import { osFiles } from "@/apps/files/FilesApp";
import { useAccount } from "@/os/account/store";

type Tm = { root: string; path: string[]; hist: string[]; hi: number; lines: { html: string; cls: string; n: number }[]; n: number };
export const useTm = create<Tm>(() => ({ root: "desktop", path: [], hist: [], hi: -1, lines: [], n: 0 }));
const T = () => useTm.getState();
const DKE = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** tmPrompt (L12254): ACCOUNTS[0] is always the built-in person account. */
function tmPrompt() {
  const { trail } = fmLoc(T().root, T().path);
  const base = T().root === "desktop" ? "~/" + t("fmDesktop") : "~/" + fmRootName(T().root);
  return `${(firstAccountShort() || "user").toLowerCase()}@remotion:${base}${trail.map((n) => "/" + n.name).join("")}$`;
}
const firstAccountShort = () => useAccount.getState().accounts[0]?.short;
const firstAccountName = () => useAccount.getState().accounts[0]?.name || "";
function tmPrint(html: string, cls = "") { useTm.setState((s) => ({ lines: [...s.lines, { html, cls, n: s.n }], n: s.n + 1 })); }

/** osTerminal (L12258). */
export function osTerminal(from?: Element | null) {
  const ex = useWm.getState().wins.terminal;
  if (ex && !ex.closing) { if (ex.min) osRestore("terminal"); osFocus("terminal"); document.querySelector<HTMLInputElement>(".tm .tm-in")?.focus(); return; }
  if (!alInst("terminal")) useShell.getState().mutate((s) => { s.apps.inst.terminal = 1; }, { save: false, apps: true });
  useTm.setState({ root: "desktop", path: [], lines: [] });
  osWinOpen("terminal", { title: (tr) => tr("terminal"), icon: <Glyph it={{ id: "", type: "app", app: "terminal" }} mini />, cls: "tm-win", w: 620, h: 380, x: (innerWidth - 620) / 2, y: 120, minW: 380, minH: 220, body: <TerminalBody />, from: from ?? null });
  tmPrint(DKE(t("tmWelcome")), "dim");
  setTimeout(() => document.querySelector<HTMLInputElement>(".tm .tm-in")?.focus(), 100);
}
registerOsAction("terminal", osTerminal);

function tmFindIn(name: string) { const { list } = fmLoc(T().root, T().path); return (list || []).find((n) => dkName(n).toLowerCase() === name.toLowerCase()); }
/** tmRun (L12267). */
function tmRun(cmd: string) {
  const raw_ = cmd.trim(); tmPrint(`<span class="ps">${DKE(tmPrompt())}</span> ${DKE(raw_)}`); if (!raw_) return;
  useTm.setState((s) => ({ hist: [...s.hist, raw_], hi: s.hist.length + 1 }));
  const [c, ...args] = raw_.split(/\s+/), arg = args.join(" ");
  const { list } = fmLoc(T().root, T().path);
  switch (c) {
    case "help": tmPrint(DKE(t("tmHelp")), "dim"); break;
    case "clear": useTm.setState({ lines: [] }); break;
    case "pwd": tmPrint(DKE(tmPrompt().split(":")[1].replace(/\$$/, ""))); break;
    case "whoami": tmPrint(DKE(firstAccountName())); break;
    case "date": tmPrint(DKE(new Date().toString())); break;
    case "echo": tmPrint(DKE(arg)); break;
    case "ls": { const L = list || []; tmPrint(L.length ? L.map((n) => `<span class="${n.type === "folder" ? "d" : n.type === "app" ? "a" : "f"}">${DKE(dkName(n))}${n.type === "folder" ? "/" : ""}</span>`).join("  ") : `<span class="dim">${DKE(t("fmEmpty"))}</span>`); break; }
    case "cd": {
      if (!arg || arg === "~") { useTm.setState({ root: "desktop", path: [] }); break; }
      if (arg === "..") { if (T().path.length) useTm.setState({ path: T().path.slice(0, -1) }); else useTm.setState({ root: "desktop" }); break; }
      const r = (FS_ROOTS as readonly string[]).find((x) => fmRootName(x).toLowerCase() === arg.toLowerCase() || x === arg.toLowerCase()); if (r && !T().path.length) { useTm.setState({ root: r, path: [] }); break; }
      const n = tmFindIn(arg); if (n && n.type === "folder") useTm.setState({ path: [...T().path, n.id] }); else tmPrint(DKE(t("tmNoDir", { x: arg })), "err"); break;
    }
    case "mkdir": case "touch": {
      if (!arg) { tmPrint("usage: " + c + " <name>", "dim"); break; }
      const n: Item = { id: dkId(), type: c === "mkdir" ? "folder" : "doc", name: arg, mod: Date.now(), size: 0, ...(c === "mkdir" ? { kids: [] } : {}) };
      if (T().root === "desktop" && !T().path.length) desktopApi.add(n, 0, 0, true); else { list!.push(n); fsSaveAll(); }
      fmRefresh(); tmPrint(`<span class="ok">+ ${DKE(arg)}</span>`); break;
    }
    case "open": { const n = tmFindIn(arg); if (!n) { tmPrint(DKE(t("tmNoFile", { x: arg })), "err"); break; } if (n.type === "folder") osFiles(null, { root: T().root, path: [...T().path, n.id] }); else desktopApi.open(n, null); break; }
    case "rm": { const n = tmFindIn(arg); if (!n) { tmPrint(DKE(t("tmNoFile", { x: arg })), "err"); break; } fmDelete([n]); tmPrint(`<span class="dim">→ ${DKE(t("fmTrash"))}</span>`); break; }
    default: tmPrint(DKE(t("tmNotFound", { x: c })), "err");
  }
}

function TerminalBody() {
  useI18n(); // the prompt follows the language (tmSync from osRelabel, L12302)
  const tm = useTm(); useShell((s) => s.rev);
  const out = useRef<HTMLDivElement | null>(null);
  // Each printed line scrolls the terminal to the bottom (tmPrint, L12256).
  useLayoutEffect(() => { const o = out.current; if (o?.parentElement) o.parentElement.scrollTop = o.parentElement.scrollHeight; }, [tm.lines.length]);
  useEffect(() => {
    // Clicking anywhere in the terminal focuses the input unless text is selected (L12296).
    const h = (e: MouseEvent) => { const el = (e.target as Element).closest?.(".tm"); if (el && !getSelection()?.toString()) el.querySelector<HTMLInputElement>(".tm-in")?.focus(); };
    document.addEventListener("click", h); return () => document.removeEventListener("click", h);
  }, []);
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const inp = e.currentTarget;
    if (e.key === "Enter") { e.preventDefault(); tmRun(inp.value); inp.value = ""; return; }
    if (e.key === "ArrowUp") { e.preventDefault(); if (T().hi > 0) { const hi = T().hi - 1; useTm.setState({ hi }); inp.value = T().hist[hi] || ""; } return; }
    if (e.key === "ArrowDown") { e.preventDefault(); if (T().hi < T().hist.length) { const hi = T().hi + 1; useTm.setState({ hi }); inp.value = T().hist[hi] || ""; } return; }
    if (e.key === "Tab") { e.preventDefault(); const [c, ...a] = inp.value.split(" "), p = a.join(" ").toLowerCase(); if (!p) return; const { list } = fmLoc(T().root, T().path); const m = (list || []).find((n) => dkName(n).toLowerCase().startsWith(p)); if (m) inp.value = c + " " + dkName(m); }
  };
  return (
    <div className="tm">
      <div className="tm-out" aria-live="polite" ref={out}>{tm.lines.map((l) => <div key={l.n} className={"tm-l " + l.cls} dangerouslySetInnerHTML={{ __html: l.html }} />)}</div>
      <label className="tm-line"><span className="tm-ps">{tmPrompt()}</span><input className="tm-in" autoComplete="off" spellCheck={false} aria-label="Terminal" onKeyDown={onKey} /></label>
    </div>
  );
}
