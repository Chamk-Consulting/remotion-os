"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { addWorkspace, selectWorkspace } from "@/os/windows/workspaces";
import { useShell, type Workspace } from "@/os/state/shell";
import { WorkspaceMenuMarkup } from "./generated/WorkspaceMenuMarkup";
import { SvgString } from "./svg";

// Source wsIcons (L7619) + check / dots icons (L7631).
const WS_ICONS: Record<string, string> = {
  workspace: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22b14c" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  development: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
  design: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2.5a9.5 9.5 0 1 0 0 19c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4.5 4.5 0 0 0 4.5-4.5C21.5 6 17.5 2.5 12 2.5z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/></svg>',
  research: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2.5 5c3-1 6.5-1 9.5 1.5v14C9 18 5.5 18 2.5 19zM21.5 5c-3-1-6.5-1-9.5 1.5v14c3-2.5 6.5-2.5 9.5-1.5z"/></svg>',
  personal: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.5 4-7 8-7s7.2 2.5 8 7"/></svg>',
};
const CHECK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 5 5 9-10"/></svg>';
const DOTS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';

export function useWsName() {
  const { t, nf } = useI18n();
  return (w: Workspace) => (w.k ? t(w.k) : t("workspaceN", { n: nf(w.n!) }));
}

export function WorkspaceMenu() {
  const { t } = useI18n();
  const s = useShell();
  const wsName = useWsName();
  const p = (id: string): Record<string, unknown> => {
    if (id === "wsMenu") return { className: "pop menu" + (s.wsOpen ? "" : " closed") };
    if (id === "addWs") return { onClick: () => { const w = addWorkspace(); s.showToast(t("added", { x: wsName(w) })); } };
    return {};
  };
  const slot = (id: string, fb: React.ReactNode) => id !== "wsList" ? fb : s.workspaces.map((w, i) => (
    <button key={i} className={"mi" + (i === s.selWs ? " sel" : "")} role="menuitemradio" aria-checked={i === s.selWs} data-ws={i}
      onClick={() => { selectWorkspace(i); s.showToast(t("switched", { x: wsName(s.workspaces[i]) })); }}>
      <SvgString html={WS_ICONS[w.k ?? ""] || WS_ICONS.workspace} /><span>{wsName(w)}</span><span className="end"><SvgString html={i === s.selWs ? CHECK : DOTS} /></span>
    </button>
  ));
  return <WorkspaceMenuMarkup t={t} p={p} s={slot} />;
}
