"use client";
/**
 * Gestion Calendrier window body (clOpen L26084–L26090, OS hooks L26091–L26097). The `.hr.clapp` container is rendered
 * once with constant props; the imperative island in ./calendar.ts fills it. Dock date tile (clDockBtn), app-store
 * install / touch and the window title / aria relabel are handled by the shell (APP_WINDOWS.calendar, Dock), as for HR.
 *
 * Gated with the healthcare suite (see src/apps/health/flag.ts): when it runs natively, the Calendar's integrations
 * (cards and actions in the patient record, the Patients-window click listener, bus consumers for Billing, Cabinet and
 * OS notifications) are installed at load, as the source installs them when its script runs.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerNativeApp } from "@/os/windows/apps";
import { useWm } from "@/os/windows/wm";
import { healthNative } from "@/apps/health/flag";
import { rmCatchUp } from "@/apps/health/rm";
import { CL, CL_KEY, clInstallGlobal, clInstallIntegrations, clRender, clDeliver, clRoot, clSize, clInk, clSt, clReload, clRefresh, clTickPaint } from "./calendar";

let clTick: ReturnType<typeof setInterval> | null = null;

function CalendarBody() {
  const { lang } = useI18n();
  useEffect(() => {
    clInstallGlobal();
    clRender(true); clDeliver();
    // L26089: every 30 s, deliver due notifications, move the "now" line, refresh the notifications page if it changed.
    if (clTick) clearInterval(clTick);
    clTick = setInterval(() => { if (!useWm.getState().wins.calendar) return; clTickPaint(); }, 30000);
    let ro: ResizeObserver | null = null;
    try { ro = new ResizeObserver(() => { clSize(); clInk(false); }); const R = clRoot(); if (R) ro.observe(R); } catch {}
    return () => { ro?.disconnect(); };
  }, []);
  // osRelabel → clRender(false) after a language switch (L26095).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; clRender(false); } }, [lang]);
  return <div className="hr clapp" />;
}

if (typeof window !== "undefined" && healthNative()) {
  clInstallIntegrations();
  registerNativeApp("calendar", {
    beforeOpen: () => { clSt(); CL.ui.mode = clSt().prefs.mode || "week"; rmCatchUp(); },
    body: () => <CalendarBody />,
    onClose: () => { if (clTick) clearInterval(clTick); clTick = null; },
    onResize: () => { clSize(); clInk(false); },
  });
  // L26096: another document changed the calendar store while the window is open → merge it and repaint. While the
  // window is closed the cached copy is dropped (bridged documents write the same key), as for Billing and Patients.
  addEventListener("storage", (e) => { if (e.key !== CL_KEY) return; if (!useWm.getState().wins.calendar) { CL.st = null; return; } try { clReload(); clRefresh(); } catch {} });
}
