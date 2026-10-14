"use client";
/**
 * React OS shell (Phase B, in progress). Mirrors the source DOM (L6857–L7177): same ids and classes, so the verbatim
 * legacy CSS applies unchanged. Enabled with `?shell=react` until it reaches parity (doc 12 rows P-A*).
 */
import { useEffect } from "react";
import { useShell } from "@/os/state/shell";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Wallpaper } from "./Wallpaper";
import { TopBar } from "./TopBar";
import { Rail } from "./Rail";
import { WorkspaceMenu } from "./WorkspaceMenu";
import { Widgets } from "./Widgets";
import { Dock } from "./Dock";
import { Toast } from "./Toast";
import { DesktopLayer } from "@/os/desktop/DesktopLayer";
import { DkWindows, useTrashDock } from "@/os/desktop/DkWindows";
import { DesktopsPanel } from "@/os/desktop/DesktopsPanel";
import { OsMenuRoot } from "@/os/menu/OsMenu";
import { DkMenuRoot } from "@/os/menu/DkMenu";
import { osSidebar } from "@/os/desktop/menus";

// OSI.chev (L11626), used by the rail peek button (L11930).
const RAIL_PEEK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

export function OsShell() {
  const s = useShell();
  const { t } = useI18n();
  useEffect(() => { s.init(); }, [s]);
  useTrashDock();
  // Escape closes the shell menus (source L7976).
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") useShell.getState().closeAll(); };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, []);
  if (!s.booted) return null;
  const cls = ["shell", s.iconsHidden ? "icons-hidden" : "", s.widgetsHidden ? "widgets-hidden" : "", s.desksOpen ? "desks-open" : ""].filter(Boolean).join(" ");
  return (
    <>
      <Wallpaper />
      <div className={cls} id="shell">
        <TopBar />
        <main className="main">
          <Rail />
          <DesktopLayer />
          <WorkspaceMenu />
          <Widgets />
          <Dock />
        </main>
        <div className="scrim" id="scrim" onClick={() => s.setDesksOpen(false)}></div>
        <DesktopsPanel />
        <DkWindows />
      </div>
      <Toast />
      <OsMenuRoot />
      <DkMenuRoot />
      <button type="button" className={"rail-peek" + (s.iconsHidden ? " show" : "")} aria-label={t("sbShow")} title={t("sbShow") + " (Ctrl+B)"} onClick={() => osSidebar(true, t)} dangerouslySetInnerHTML={{ __html: RAIL_PEEK }} />
    </>
  );
}
