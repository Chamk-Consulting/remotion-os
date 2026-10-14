"use client";
/** Window layout menu osWinMenu (L20943): snap halves/quarters, maximise, previous size, move to desktop / workspace, all desktops, minimise, close. */
import { osMenu, type MenuItem } from "@/os/menu/OsMenu";
import { osDid, useShell } from "@/os/state/shell";
import { soloWinRows } from "./appmode";
import { osClose, osMax, osMin, osMoveWin, osMoveWinWs, osSnap, osToggleAll, osUnsnap, useWm, type Tr } from "./wm";

const ic = (p: string) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const fr = '<rect x="3" y="4" width="18" height="16" rx="2"/>';

export function osWinMenu(key: string, x: number, y: number, t: Tr) {
  const w = useWm.getState().wins[key]; if (!w || w.closing) return;
  const st = useShell.getState(); const nf = (n: number) => new Intl.NumberFormat(document.documentElement.lang || "en").format(n);
  const deskName = (i: number) => st.desks[i]?.n || t("desktopN", { n: nf(i + 1) });
  const wsName = (ws: { k?: string; n?: number }) => (ws.k ? t(ws.k) : t("workspaceN", { n: nf(ws.n!) }));
  const items: (MenuItem | null)[] = [
    { l: t("os_snapL"), ic: ic(fr + '<path d="M12 4v16"/><path d="M3.5 4.5h8.5v15H3.5z" fill="currentColor" opacity=".3" stroke="none"/>'), run: () => osSnap(key, "left"), kbd: "Win+←" },
    { l: t("os_snapR"), ic: ic(fr + '<path d="M12 4v16"/><path d="M12 4.5h8.5v15H12z" fill="currentColor" opacity=".3" stroke="none"/>'), run: () => osSnap(key, "right"), kbd: "Win+→" },
    { l: t("os_quarter"), ic: ic(fr + '<path d="M12 4v16M3 12h18"/>'), sub: ([["tl", "os_qTL"], ["tr", "os_qTR"], ["bl", "os_qBL"], ["br", "os_qBR"]] as const).map(([z, l]) => ({ l: t(l), run: () => osSnap(key, z) })) },
    { l: t(w.max ? "fmRestore" : "fmMax"), ic: ic('<rect x="4" y="4" width="16" height="16" rx="2"/>'), run: () => osMax(key), kbd: "Win+↑" },
    w.snap ? { l: t("os_unsnap"), ic: ic('<rect x="6" y="7" width="12" height="10" rx="2"/>'), run: () => osUnsnap(key) } : null, "-",
    { l: t("os_moveDesk"), ic: ic('<rect x="3" y="5" width="8" height="6" rx="1"/><rect x="13" y="13" width="8" height="6" rx="1"/><path d="M11 8h4a2 2 0 0 1 2 2v3"/>'), sub: [...st.desks.map((_, i) => ({ l: deskName(i) + (i === st.cur ? "  ·  " + t("os_here") : ""), disabled: !w.all && w.did === osDid(i), run: () => osMoveWin(key, i, false) })), "-", { l: t("os_newDesk"), disabled: st.desks.length >= 12, run: () => osMoveWin(key, st.desks.length, true) }] },
    { l: t("os_moveWs"), ic: ic('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'), sub: st.workspaces.map((ws, i) => ({ l: wsName(ws), disabled: i === st.selWs, run: () => osMoveWinWs(key, i, wsName(ws)) })) },
    { l: t("os_allDesks"), check: !!w.all, run: () => osToggleAll(key) }, "-",
    { l: t("fmMin"), ic: ic('<path d="M5 18h14"/>'), run: () => osMin(key) }, { l: t("os_close"), ic: ic('<path d="M6 6l12 12M18 6 6 18"/>'), danger: true, run: () => osClose(key) },
  ];
  osMenu(x, y, [...soloWinRows(key), ...(items.filter(Boolean) as MenuItem[])]);
}
