"use client";
/** What each shortcut does — ACTIONS (L8579) with the later additions (L20903, L21062) — and runRow / stepWs (L8602). */
import { translate } from "@/lib/i18n/core";
import { isLang, LANG_KEYS } from "@/lib/i18n/langs";
import { toggleIcons, toggleWidgets, useShell } from "@/os/state/shell";
import { osActions } from "@/os/actions";
import { osMoveWin, osTopWin, panelApi } from "@/os/windows/wm";
import { osDeskFull } from "@/os/windows/appmode";
import { renderWs } from "@/os/windows/workspaces";
import { setThemeModeFull, switchLang } from "@/os/shell/shellActions";
import { widgetsApi } from "@/os/shell/widgetsApi";
import { openNoteComposer } from "@/os/keyboard/kb";
import { scApi } from "./ShortcutsPanel";
import { openSearch } from "./Palette";
import type { Row } from "./catalogue";

const lang = () => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
const tt = (k: string, v?: Record<string, string | number>) => translate(lang(), k, v);
const st = () => useShell.getState();
const wsName = (w: { k?: string; n?: number }) => (w.k ? tt(w.k) : tt("workspaceN", { n: new Intl.NumberFormat(lang()).format(w.n!) }));

export function stepWs(d: number) { const s = st(); const n = s.workspaces.length; useShell.setState({ selWs: (s.selWs + d + n) % n }); renderWs(); const s2 = st(); s2.showToast(tt("switched", { x: wsName(s2.workspaces[s2.selWs]) })); }
export function setSysMenu(open: boolean, view?: string) { useShell.setState((s) => ({ sysOpen: open, sysView: open && view ? { v: view, n: (s.sysView?.n ?? 0) + 1 } : null })); }

export const ACTIONS: Record<string, () => void> = {
  search: () => openSearch(),
  lang: () => { const o = LANG_KEYS; switchLang(o[(o.indexOf(lang()) + 1) % o.length]); },
  theme: () => setThemeModeFull(st().isDark ? "light" : "dark", document.getElementById("themeBtn")),
  notif: () => document.getElementById("bellBtn")?.click(),
  settings: () => { const open = !st().sysOpen; st().closeAll(); setSysMenu(open); },
  shortcuts: () => (st().scOpen ? scApi.close() : scApi.open()),
  navbar: () => { useShell.setState((s) => ({ navHidden: !s.navHidden })); st().closeAll(); },
  lock: () => osActions.lock(),
  wsNext: () => stepWs(1), wsPrev: () => stepWs(-1),
  wsSwitcher: () => { const open = !st().wsOpen; st().closeAll(); st().setWs(open); },
  wsNew: () => document.getElementById("addWs")?.click(),
  wsManage: () => { st().closeAll(); setSysMenu(true, "workspaces"); },
  dNext: () => panelApi.gotoDesk(st().cur + 1), dPrev: () => panelApi.gotoDesk(st().cur - 1),
  dOverview: () => { const o = !st().desksOpen; st().closeAll(); st().setDesksOpen(o); },
  dNew: () => panelApi.addDesk(true), dClose: () => panelApi.closeDesk(),
  // The widgets come back through the class only (not saved with the desktop), as in the source.
  note: () => { st().closeAll(); useShell.setState({ widgetsHidden: false }); openNoteComposer(); const c = document.querySelector(".notes")?.closest(".card"); c?.classList.add("flash"); setTimeout(() => document.querySelector(".card.flash")?.classList.remove("flash"), 1300); },
  // "Show desktop" toggles the widgets in the source (reproduced).
  showDesk: () => { st().closeAll(); toggleWidgets(); },
  icons: () => toggleIcons(),
  widgets: () => toggleWidgets(),
  calToday: () => { widgetsApi.calToday(); useShell.setState({ widgetsHidden: false }); const c = document.querySelector(".card.cal"); if (c) { c.classList.remove("flash"); void (c as HTMLElement).offsetWidth; c.classList.add("flash"); } },
  vkb: () => osActions.vkb(),
  dMoveNext: () => { const w = osTopWin(); const s = st(); if (w) osMoveWin(w.key, (s.cur + 1) % s.desks.length, true); },
  dMovePrev: () => { const w = osTopWin(); const s = st(); if (w) osMoveWin(w.key, (s.cur - 1 + s.desks.length) % s.desks.length, true); },
  osFullscreen: () => osDeskFull(),
};
export const runRow = (r: Pick<Row, "act" | "label">) => { if (r.act && ACTIONS[r.act]) ACTIONS[r.act](); else st().showToast(tt("notInPreview", { x: tt(r.label) })); };
