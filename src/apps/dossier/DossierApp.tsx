"use client";
/**
 * Dossier Patient window body (v94 dpOpen L28513–L28519, OS hooks L28520–L28530). The `.hr.dpapp` container is rendered
 * once; the imperative island in ./dossier.ts fills it. Dock button, desktop seed (remotion-dk-dp1), app-store touch and the
 * window title / aria relabel are handled by the shell (APP_WINDOWS.dossier, APP_SEEDS), as for Patients.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerNativeApp } from "@/os/windows/apps";
import { DP, dpInk, dpRefresh, dpRender, dpRoot, dpSize, dpSt, dpTick, dpWire } from "./dossier";
import { paSt } from "@/apps/patients/patients";
import { rmCatchUp } from "@/apps/health/rm";
import { healthNative } from "@/apps/health/flag";
import { addPaletteProvider } from "@/os/shortcuts/paletteExtra";
import { paCan, paName } from "@/apps/patients/patients";
import { dpSearch, dpOpenPatientIn } from "./dossier";
import raw from "@/apps/registry.data.json";

let tick: ReturnType<typeof setInterval> | null = null;
function DossierBody() {
  const { lang } = useI18n();
  useEffect(() => {
    const R = dpRoot(); if (R) dpWire(R);
    DP.ui.sec = "over"; dpRender(true);
    if (tick) clearInterval(tick); tick = setInterval(() => dpTick(), 20000);
    let ro: ResizeObserver | null = null;
    try { ro = new ResizeObserver(() => { dpSize(); dpInk(false); }); if (R) ro.observe(R); } catch { /* no ResizeObserver */ }
    return () => { ro?.disconnect(); };
  }, []);
  // osRelabel → dpRefresh(true) after a language switch (v94 L28524).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; dpRefresh(true); } }, [lang]);
  return <div className="hr dpapp" />;
}

if (typeof window !== "undefined" && healthNative()) {
  registerNativeApp("dossier", {
    beforeOpen: () => { try { paSt(); } catch { /* Patients store unavailable */ } dpSt(); rmCatchUp(); },
    body: () => <DossierBody />,
    onClose: () => { if (tick) clearInterval(tick); tick = null; },
    onResize: () => { dpSize(); dpInk(false); },
  });
  // OS search palette: patients open straight into their record (directory permission required; v94 L28528–L28530).
  const G = (raw.DK_APPS as unknown as Record<string, [string, string]>).dossier;
  addPaletteProvider((q) => { if (String(q || "").trim().length < 2 || !paCan("dir.view")) return []; return (dpSearch(q) as { id: string; mrn: string }[]).slice(0, 5).map((p) => ({ g: "searchPatients", label: paName(p as never) + " · " + p.mrn, iconBg: G[0], iconHtml: G[1].replace(/width="28" height="28"/, 'width="18" height="18"'), run: () => dpOpenPatientIn(p.id) })); });
  // Escape closes an open drawer (v94 L28526).
  document.addEventListener("keydown", (e) => { if (e.key !== "Escape" || !DP.ui.drawer) return; const R = dpRoot(); if (!R || R.querySelector(".dp-dlg,.dp-menu")) return; const a = document.activeElement; if (a && a !== document.body && !R.contains(a)) return; DP.ui.drawer = null; R.dataset.drawer = ""; });
}
