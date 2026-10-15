"use client";
/**
 * HR & Payroll window body (hrOpen L24425–L24432, OS hooks L24433–L24441). The `.hr` container is rendered once with
 * constant props; the imperative island in ./hr.ts fills it. The dock button, desktop seed, `alStore` touch and the
 * window title / aria relabel are handled by the shell (APP_WINDOWS.hrPeople, APP_SEEDS, osRelabel).
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { reducedMotion } from "@/lib/motion";
import { lkRM } from "@/os/lock/lock";
import { registerNativeApp } from "@/os/windows/apps";
import { HR, hrInk, hrInstallGlobal, hrListPaint, hrRender, hrRoot, hrSave, hrSize, hrSt } from "./hr";

const hrRM = () => lkRM() || reducedMotion();

function HrBody() {
  const { lang } = useI18n();
  useEffect(() => {
    hrInstallGlobal();
    // hrOpen: render, then the short skeleton (380 ms) before the list paints for real.
    hrRender(true);
    const tm = setTimeout(() => { HR.ui.loading = false; if (HR.ui.view === "employees") hrListPaint(); }, hrRM() ? 0 : 380);
    let ro: ResizeObserver | null = null;
    try { let was: string | null = null; ro = new ResizeObserver(() => { const R = hrRoot(); if (!R) return; hrSize(); hrInk(false); if (was && was !== R.dataset.sz && HR.ui.cards === null && HR.ui.view === "employees") hrListPaint(); was = R.dataset.sz ?? null; }); const R = hrRoot(); if (R) ro.observe(R); } catch {}
    return () => { clearTimeout(tm); ro?.disconnect(); };
  }, []);
  // osRelabel → hrRender(false) after a language switch (L24440).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; hrRender(false); } }, [lang]);
  return <div className="hr" />;
}

registerNativeApp("hrPeople", {
  beforeOpen: () => { hrSt(); HR.ui.loading = true; },
  body: () => <HrBody />,
  onClose: () => hrSave(true),
  onResize: () => { hrSize(); hrInk(false); },
});
