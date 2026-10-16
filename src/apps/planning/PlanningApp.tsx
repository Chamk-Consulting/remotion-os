"use client";
/**
 * Calendar & Planning window body (plOpen L27199–L27206, OS hooks L27207–L27212). The `.hr.plapp` container is
 * rendered once with constant props; the imperative island in ./planning.ts fills it. Dock button, desktop seed
 * (remotion-dk-pl1), app-store install / touch and the window title / aria relabel are handled by the shell
 * (APP_WINDOWS.planning, APP_SEEDS), as for HR.
 *
 * Gated with the healthcare suite (see src/apps/health/flag.ts): when it runs natively, Planning's integrations (the
 * waiting-list consumer of cancellations, the storage listener and the live-update consumers) are installed at load.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerNativeApp } from "@/os/windows/apps";
import { useWm } from "@/os/windows/wm";
import { healthNative } from "@/apps/health/flag";
import { rmCatchUp } from "@/apps/health/rm";
import { clSt } from "@/apps/calendar/calendar";
import { PL, PL_KEY, plInstallGlobal, plInstallIntegrations, plRender, plRoot, plSize, plInk, plSt, plTick, plSegPill } from "./planning";

let plTk: ReturnType<typeof setInterval> | null = null;

function PlanningBody() {
  const { lang } = useI18n();
  useEffect(() => {
    plInstallGlobal();
    // L27205: a narrow window starts in the day view.
    plSize(); if (plRoot()?.dataset.sz === "s" && ["week", "workweek"].includes(PL.ui.mode)) { PL.ui.mode = "day"; }
    plRender(true);
    if (plTk) clearInterval(plTk);
    plTk = setInterval(() => { if (useWm.getState().wins.planning) plTick(); }, 30000);
    let ro: ResizeObserver | null = null;
    try { ro = new ResizeObserver(() => { plSize(); plInk(false); }); const R = plRoot(); if (R) ro.observe(R); } catch {}
    return () => { ro?.disconnect(); };
  }, []);
  // osRelabel → plRender(false) after a language switch (L27210).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; plRender(false); } }, [lang]);
  return <div className="hr plapp" />;
}

if (typeof window !== "undefined" && healthNative()) {
  plInstallIntegrations();
  registerNativeApp("planning", {
    beforeOpen: () => { clSt(); plSt(); PL.ui.mode = plSt().prefs.mode || "week"; rmCatchUp(); },
    body: () => <PlanningBody />,
    onClose: () => { if (plTk) clearInterval(plTk); plTk = null; },
    // L27204: the resize hook also re-measures the view switch highlight.
    onResize: () => { plSize(); plInk(false); plSegPill(plRoot() as HTMLElement); },
  });
  // While the window is closed the cached store is dropped when another document writes it, as for the other apps.
  addEventListener("storage", (e) => { if (e.key === PL_KEY && !useWm.getState().wins.planning) PL.st = null; });
}
