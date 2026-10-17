"use client";
/**
 * Formulaires & Enquêtes window body (feOpen L13575–L13583, OS hooks L13584–L13597). The `.fe` container is rendered
 * once with constant props; feBody (./forms.ts) fills and wires it and the imperative island renders into it. The dock
 * button (feDockBtn), desktop seed (remotion-dk-v3), `alStore` install / touch and the window title / aria relabel are
 * handled by the shell (APP_WINDOWS.forms, APP_SEEDS, osRelabel), as for the other native apps.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerNativeApp } from "@/os/windows/apps";
import { FE, feBody, feCommit, feDoc, feInk, feInstallGlobal, feLastTxt, feLoad, feRender, feRoot, feSave } from "./forms";

/** Containers already filled by feBody (React's development double-mount must not wire the listeners twice). */
const wired = new WeakSet<HTMLElement>();

function FormsBody() {
  const { lang } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    feInstallGlobal();
    if (!wired.has(el)) { wired.add(el); feBody(el); }
    // feOpen (L13580–L13582): first render, a size observer for the active-tab ink, and the "last saved" ticker.
    feRender(false);
    let ro: ResizeObserver | null = null;
    try { ro = new ResizeObserver(() => feInk()); const R = feRoot(); if (R) ro.observe(R); } catch {}
    clearInterval(FE.tick); FE.tick = setInterval(() => { const l = feRoot()?.querySelector(".fe-last"); if (l) l.textContent = feLastTxt(); else clearInterval(FE.tick); }, 30000);
    return () => ro?.disconnect();
  }, []);
  // osRelabel → feRender(false) after a language switch (L13592).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; feRender(false); } }, [lang]);
  return <div className="fe" ref={ref} />;
}

registerNativeApp("forms", {
  // feOpen (L13577): load the store and select the first field of the current form.
  beforeOpen: () => { feLoad(); if (!FE.sel) { const p = feDoc()!.pages[0]; FE.sel = p?.sections[0]?.fields[0]?.id || null; } },
  body: () => <FormsBody />,
  onClose: () => { if (FE.st) { feCommit("silent"); } else feSave(); },
  onResize: () => feInk(),
});
