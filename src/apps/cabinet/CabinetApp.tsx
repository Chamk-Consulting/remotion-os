"use client";
/**
 * Gestion Cabinet window body (cbOpen L26671–L26680, OS hooks L26681–L26684). The `.hr.cbapp` container is rendered
 * once with constant props; the imperative island in ./cabinet.ts fills it. Dock button, desktop seed
 * (remotion-dk-cb1), app-store install / touch and the window title / aria relabel are handled by the shell
 * (APP_WINDOWS.cabinet, APP_SEEDS), as for HR.
 *
 * Gated with the healthcare suite (see src/apps/health/flag.ts): when it runs natively, Cabinet's integrations (room
 * readiness and the reception link in the Calendar, today's visit in the patient record, the storage listener for the
 * stores it reads, bus consumers) are installed at load, as the source installs them when its script runs.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerNativeApp } from "@/os/windows/apps";
import { useWm } from "@/os/windows/wm";
import { healthNative } from "@/apps/health/flag";
import { rmCatchUp } from "@/apps/health/rm";
import { clSt } from "@/apps/calendar/calendar";
import { CB, CB_KEY, cbInstallGlobal, cbInstallIntegrations, cbRender, cbRoot, cbSize, cbInk, cbSt, cbTick, cbExternalChange, cbDrawer } from "./cabinet";

let cbTk: ReturnType<typeof setInterval> | null = null;

function CabinetBody() {
  const { lang } = useI18n();
  useEffect(() => {
    cbInstallGlobal();
    cbRender(true);
    // L26678: every 15 s, refresh the waiting times; apply changes made elsewhere once no dialog or display is open.
    if (cbTk) clearInterval(cbTk);
    cbTk = setInterval(() => { if (!useWm.getState().wins.cabinet) return; cbTick(); const R = cbRoot(); if (CB.stale && R && !R.querySelector(".hr-dlg") && !R.querySelector(".cb-disp")) cbExternalChange(); }, 15000);
    let ro: ResizeObserver | null = null;
    try { ro = new ResizeObserver(() => { cbSize(); cbInk(false); }); const R = cbRoot(); if (R) ro.observe(R); } catch {}
    return () => { ro?.disconnect(); };
  }, []);
  // osRelabel → cbRender(false) after a language switch (L26683).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; cbRender(false); } }, [lang]);
  return <div className="hr cbapp" />;
}

if (typeof window !== "undefined" && healthNative()) {
  cbInstallIntegrations();
  registerNativeApp("cabinet", {
    beforeOpen: () => { clSt(); cbSt(); rmCatchUp(); CB.syncAt = Date.now(); },
    body: () => <CabinetBody />,
    onClose: () => { if (cbTk) clearInterval(cbTk); cbTk = null; cbDrawer(null); },
    onResize: () => { cbSize(); cbInk(false); },
  });
  // While the window is closed the cached store is dropped when another document writes it (bridged Planning reads and
  // writes the same keys), as for Billing, Patients and Calendar; the source's own listener (L26652) handles the open window.
  addEventListener("storage", (e) => { if (e.key === CB_KEY && !useWm.getState().wins.cabinet) CB.st = null; });
}
