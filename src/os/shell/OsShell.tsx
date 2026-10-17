"use client";
/**
 * React OS shell (Phase B, in progress). Mirrors the source DOM (L6857–L7177): same ids and classes, so the verbatim
 * legacy CSS applies unchanged. Enabled with `?shell=react` until it reaches parity (doc 12 rows P-A*).
 */
import { AiPanel } from "@/os/ai/AiPanel";
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
import { useTrashDock } from "@/os/desktop/DkWindows";
import { WindowLayer } from "@/os/windows/WindowLayer";
import { DesktopsPanel } from "@/os/desktop/DesktopsPanel";
import { OsMenuRoot } from "@/os/menu/OsMenu";
import { ShortcutsPanel } from "@/os/shortcuts/ShortcutsPanel";
import { Palette } from "@/os/shortcuts/Palette";
import { useGlobalShortcuts } from "@/os/shortcuts/useGlobalShortcuts";
import { SysMenu } from "./SysMenu";
import { GhostLayer } from "@/os/desktop/ghost";
// Native OS apps (B-15): importing them registers osActions.launcher / files / terminal.
import "@/apps/hr/HrApp";
import "@/apps/billing/BillingApp";
import "@/apps/calculator/CalculatorApp";
import "@/apps/forms/FormsApp";
import "@/apps/patients/PatientsApp";
import "@/apps/calendar/CalendarApp";
import "@/apps/cabinet/CabinetApp";
import "@/apps/planning/PlanningApp";
import "@/apps/launcher/Launcher";
import "@/apps/files/FilesApp";
import "@/apps/terminal/Terminal";
import { LockScreen, PowerScreen } from "@/os/lock/LockScreen";
import { SignIn } from "@/os/signin/SignIn";
import { Register } from "@/os/register/Register";
import { isRegister } from "@/os/register/register";
import { isLocked, isPower } from "@/os/lock/lock";
import { isSignin } from "@/os/signin/si";
import { overlayGate } from "@/os/shortcuts/useGlobalShortcuts";
import { Keyboard } from "@/os/keyboard/Keyboard";
import { KbMenu } from "@/os/keyboard/KbMenu";
import { NotificationCenter } from "@/os/notifications/NotificationCenter";
import { AccountMenu, accApi } from "@/os/account/AccountMenu";
import { bootAccount, startAutoAway, useAccount } from "@/os/account/store";
import { bootNc, closeNc, ncApi } from "@/os/notifications/nc";
import { closeSearch } from "@/os/shortcuts/Palette";
import { closeAllHooks } from "@/os/state/shell";

// closeAll also closes the notification centre and the account menu (L7972); openNc closes the palette first.
closeAllHooks.push(closeNc, () => { if (useAccount.getState().open) accApi.open(false); });
ncApi.closeSearch = closeSearch;
// Global shortcuts are off behind the power, lock, sign-in (and registration) screens (L9916–L9917).
overlayGate.blocked = () => isPower() || isLocked() || isSignin() || isRegister();
import { DkMenuRoot } from "@/os/menu/DkMenu";
import { osSidebar } from "@/os/desktop/menus";
import { osAppMode } from "@/os/windows/appmode";

// OSI.chev (L11626), used by the rail peek button (L11930).
const RAIL_PEEK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

/** `bootApp`: the standalone route `/apps/<key>` starts straight in that app (osBootApp L21038, key validated by the route). */
export function OsShell({ bootApp }: { bootApp?: string } = {}) {
  const s = useShell();
  const { t } = useI18n();
  useEffect(() => { s.init(); bootAccount(); bootNc(); return startAutoAway(); }, [s]);
  useEffect(() => {
    if (!bootApp) return;
    document.body.classList.add("os-appmode", "os-standalone", "os-booting");
    const tm = setTimeout(() => { try { osAppMode(bootApp, true); } catch (e) { console.warn(e); } document.body.classList.remove("os-booting"); }, 60);
    return () => clearTimeout(tm);
  }, [bootApp]);
  // Ctrl+B shows / hides the sidebar outside text fields (L11935).
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "b" && !(e.target as Element).closest?.("input,textarea,[contenteditable=true]")) { e.preventDefault(); osSidebar(useShell.getState().iconsHidden, t); } };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [t]);
  useTrashDock();
  useGlobalShortcuts();
  // Escape closes the shell menus (source L7976).
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") useShell.getState().closeAll(); };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, []);
  if (!s.booted) return null;
  const cls = ["shell", s.iconsHidden ? "icons-hidden" : "", s.widgetsHidden ? "widgets-hidden" : "", s.desksOpen ? "desks-open" : "", s.navHidden ? "nav-hidden" : "", s.booting ? "boot" : ""].filter(Boolean).join(" ");
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
        <AiPanel />
        <div className="scrim" id="scrim" onClick={() => s.setDesksOpen(false)}></div>
        <DesktopsPanel />
        <WindowLayer />
      </div>
      <Toast />
      <NotificationCenter />
      <AccountMenu />
      <Keyboard />
      <KbMenu />
      <ShortcutsPanel />
      <SysMenu />
      <Palette />
      <LockScreen />
      <SignIn />
      <Register />
      <PowerScreen />
      <OsMenuRoot />
      <DkMenuRoot />
      <GhostLayer />
      <button type="button" className={"rail-peek" + (s.iconsHidden ? " show" : "")} aria-label={t("sbShow")} title={t("sbShow") + " (Ctrl+B)"} onClick={() => osSidebar(true, t)} dangerouslySetInnerHTML={{ __html: RAIL_PEEK }} />
    </>
  );
}
