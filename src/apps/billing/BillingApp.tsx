"use client";
/**
 * Billing & Revenue window body (biOpen L23791–L23795, OS hooks L23796–L23806). The `.bi` container is rendered once
 * with constant props; the imperative island in ./billing.ts fills it. The dock button, desktop seed
 * (remotion-dk-bill1), `alStore` install / touch and the window title / aria relabel are handled by the shell
 * (APP_WINDOWS.billing, APP_SEEDS, osRelabel), as for HR & Payroll.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerNativeApp } from "@/os/windows/apps";
import { useWm } from "@/os/windows/wm";
import { BI, BI_KEY, biEdLeave, biFitDocs, biInk, biInstallGlobal, biRefresh, biRender, biRoot, biSave, biSize, biSt } from "./billing";

function BillingBody() {
  const { lang } = useI18n();
  useEffect(() => {
    biInstallGlobal();
    biRender(true);
    // biOpen: a size change re-fits the A4 previews; crossing a size class while editing re-renders the editor.
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => { const R = biRoot(); if (!R) return; const was = R.dataset.sz; biSize(); biInk(false); biFitDocs(R); if (was !== R.dataset.sz && BI.ui.view === "editor") biRefresh(); });
      const R = biRoot(); if (R) ro.observe(R);
    } catch {}
    return () => ro?.disconnect();
  }, []);
  // osRelabel → biRender(false) after a language switch (L23802).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; biRender(false); } }, [lang]);
  return <div className="bi" />;
}

registerNativeApp("billing", {
  beforeOpen: () => { biSt(); },
  body: () => <BillingBody />,
  onClose: () => { biEdLeave(); biSave(true); },
  onResize: () => { biSize(); biInk(false); biFitDocs(); },
});

// L23806: another document changed the billing store while the window is open → reload it and repaint the page.
// While the window is closed the cached copy is dropped too: bridged apps (other documents, e.g. Calendar's billing
// consumer) write the same key, and a stale copy would be saved back over their changes.
if (typeof window !== "undefined") {
  addEventListener("storage", (e) => { if (e.key !== BI_KEY) return; if (!useWm.getState().wins.billing) { BI.st = null; return; } try { BI.st = null; biSt(); biRefresh(); } catch {} });
}
