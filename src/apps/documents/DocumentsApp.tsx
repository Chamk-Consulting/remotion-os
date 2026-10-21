"use client";
/**
 * Documents window body (dcOpen L15406–L15417, its first-open wrapper L20275, OS hooks L15418–L15420 and the cross-tab
 * listener L21041). The source passes `dcBody()` — an element it builds and wires — as the window body; here the same
 * element is appended to the window's body container once, so the DOM is the source's (`.os-wb > .dc`). The dock
 * entry, desktop icon, `alStore` install / touch and the window title / aria relabel are handled by the shell
 * (APP_WINDOWS.documents, osRelabel), as for the other native apps.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  DC, dcApplyZoom, dcBody, dcCurSync, dcFind, dcInk, dcInstallGlobal, dcLoad, dcLvGC, dcPopClose, dcRender, dcRoot,
  dcSave, dcStatusSync, dcStore, dcTplCacheClear, dcViewAfter, dcxRemote,
} from "./documents";
import { onRemoteChange } from "./store";

/** Window bodies already filled (React's development double-mount must not build and wire a second body). */
const filled = new WeakSet<Element>();

function DocumentsBody() {
  const { lang } = useI18n();
  const anchor = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const wb = anchor.current?.closest(".os-wb");
    if (!wb || filled.has(wb)) return;
    filled.add(wb);
    dcInstallGlobal();
    const el = dcBody();
    anchor.current!.replaceWith(el);
  }, []);
  useEffect(() => {
    // dcOpen (L15412–L15416): first selection, first render, the size observer, a delayed sync and the status ticker.
    const S = dcStore();
    if (!DC.first) { DC.first = 1; if (S && S.cur === "d1" && dcFind("bEVA")) DC.sel = "bEVA"; }
    dcRender(false);
    let ro: ResizeObserver | null = null;
    try { ro = new ResizeObserver(() => { const R = dcRoot(); if (!R) return; R.classList.toggle("narrow", R.clientWidth < 1100); dcApplyZoom(); dcInk(".dc-ribt", true); dcInk(".dc-rpt", true); dcViewAfter(); }); const R = dcRoot(); if (R) ro.observe(R); } catch {}
    const tm = setTimeout(() => { dcCurSync(); dcApplyZoom(); dcInk(".dc-ribt", true); dcInk(".dc-rpt", true); }, 520);
    clearInterval(DC.tick); DC.tick = setInterval(() => { if (!dcRoot()) { clearInterval(DC.tick); return; } dcStatusSync(); }, 30000);
    // L20275: the first opening also clears stale "open as is" files from the local database.
    if (!DC.lvGC) { DC.lvGC = 1; dcLvGC(); }
    return () => { ro?.disconnect(); clearTimeout(tm); };
  }, []);
  // osRelabel (L15420): template captions are rebuilt and the app re-rendered after a language switch.
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; dcTplCacheClear(); dcRender(false); } }, [lang]);
  return <span ref={anchor} hidden />;
}

/**
 * The native app definition. Product phase 0: it is no longer registered here — DocumentsLazy.tsx registers a light stub
 * at boot and loads this module (and its 2.35 MB of code and embedded official forms) only when Documents is first opened.
 */
export const documentsApp = {
  beforeOpen: () => { dcLoad(); },
  body: () => <DocumentsBody />,
  onClose: () => { dcSave(true); dcPopClose(); },
  onResize: () => { dcApplyZoom(); dcInk(".dc-ribt", true); dcInk(".dc-rpt", true); dcViewAfter(); },
};

// Product phase 1 (replaces the L21041 "storage" listener): the store lives in IndexedDB and other tabs announce their
// writes over a BroadcastChannel (./store). Outside the editor the library reloads; inside it a bar asks the user.
onRemoteChange(() => { try { dcxRemote(); } catch {} });
