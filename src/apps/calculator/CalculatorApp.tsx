"use client";
/**
 * Calculator & scientific tools window body (caOpen L22576–L22584, OS hooks L22585–L22598). The `.ca` container is
 * rendered once with constant props; the imperative island in ./calculator.ts fills it. The dock button, desktop seed
 * (remotion-dk-calc1), `alStore` install / touch and the window title / aria relabel are handled by the shell
 * (APP_WINDOWS.calcsci, APP_SEEDS, osRelabel), as for HR and Billing.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerNativeApp } from "@/os/windows/apps";
import { useWm } from "@/os/windows/wm";
import { CA, caGrDraw, caHistPaint, caInstallGlobal, caRender, caRoot, caSave, caSize, caSt, caUnitsBuild } from "./calculator";

function CalculatorBody() {
  const { lang } = useI18n();
  useEffect(() => {
    caInstallGlobal();
    caRender(true);
    // caOpen: a size change re-classifies the layout and redraws an open graph.
    let ro: ResizeObserver | null = null;
    try { ro = new ResizeObserver(() => { caSize(); if (CA.view === "graph") caGrDraw?.(); }); const R = caRoot(); if (R) ro.observe(R); } catch {}
    return () => ro?.disconnect();
  }, []);
  // osRelabel → the character-width cache is dropped and the page re-rendered after a language switch (L22590).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; CA.cw = null; caRender(false); } }, [lang]);
  return <div className="ca" dir="auto" />;
}

registerNativeApp("calcsci", {
  beforeOpen: () => { try { caUnitsBuild(); } catch (e) { console.warn(e); } },
  body: () => <CalculatorBody />,
  onClose: () => { try { caSave(true); } catch {} },
  onResize: () => caSize(),
});

// L22598: another tab of this browser changed the calculator data while the window is open → reload and repaint.
if (typeof window !== "undefined") {
  addEventListener("storage", (e) => { if (e.key !== "remotion-calc" || !useWm.getState().wins.calcsci) return; try { CA.st = null; caSt(); caUnitsBuild(); caHistPaint(); } catch {} });
}
