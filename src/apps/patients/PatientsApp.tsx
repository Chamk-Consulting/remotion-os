"use client";
/**
 * Patients & Records window body (paOpen L25411–L25415, OS hooks L25416–L25425). The `.hr.pa` container is rendered
 * once with constant props; the imperative island in ./patients.ts fills it. Dock button, desktop seed (remotion-dk-pa1),
 * app-store touch and the window title / aria relabel are handled by the shell (APP_WINDOWS.patients), as for HR.
 *
 * Gated (healthcare suite): Calendar and Cabinet add cards and actions to the patient record through PA_HOOKS
 * (L26060–L26065, L26661) and call Patients directly. Until they are native too, the live route keeps the bridged
 * Patients so those integrations stay intact; the native body is used with `?health=native` (tests, review) or a build
 * with NEXT_PUBLIC_HEALTH_NATIVE=1. See doc 15, slice 14.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerNativeApp } from "@/os/windows/apps";
import { useWm } from "@/os/windows/wm";
import { PA, PA_KEY, PA_P, paInk, paInstallGlobal, paListPaint, paRefresh, paRender, paRoot, paSave, paSize, paSt } from "./patients";
import { hrRM } from "@/apps/hr/hr";
import { healthNative } from "@/apps/health/flag";


function PatientsBody() {
  const { lang } = useI18n();
  useEffect(() => {
    paInstallGlobal();
    paRender(true);
    const tm = setTimeout(() => { PA.ui.loading = false; if (PA.ui.view === "list") paListPaint(); }, hrRM() ? 0 : 380);
    let ro: ResizeObserver | null = null;
    try { ro = new ResizeObserver(() => { paSize(); paInk(false); }); const R = paRoot(); if (R) ro.observe(R); } catch {}
    return () => { clearTimeout(tm); ro?.disconnect(); };
  }, []);
  // osRelabel → paRender(false) after a language switch (L25421).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; paRender(false); } }, [lang]);
  return <div className="hr pa" />;
}

if (typeof window !== "undefined" && healthNative()) {
  registerNativeApp("patients", {
    beforeOpen: () => { paSt(); PA.ui.loading = true; if (!PA_P[PA.ui.view]) PA.ui.view = "dash"; },
    body: () => <PatientsBody />,
    onClose: () => { PA.ui.bg = {}; paSave(true); },
    onResize: () => { paSize(); paInk(false); },
  });
  // L25424: another document changed the patient store. While the window is closed the cached copy is dropped too,
  // because bridged apps (other documents) write the same key.
  addEventListener("storage", (e) => { if (e.key !== PA_KEY) return; if (!useWm.getState().wins.patients) { PA.st = null; return; } try { PA.st = null; paSt(); paRefresh(); } catch {} });
}
