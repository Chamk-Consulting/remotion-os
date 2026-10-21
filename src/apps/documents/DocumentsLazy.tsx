"use client";
/**
 * Documents, loaded on demand (product phase 0).
 *
 * The editor module is large (≈2.35 MB of source including the embedded official VPH forms). It used to be imported
 * eagerly by OsShell, so every OS user downloaded it at boot. This stub registers the native app at boot and imports
 * DocumentsApp the first time the window opens (or earlier, when the browser is idle), then hands over to the real
 * definition: beforeOpen → body → onClose / onResize, in the same order as before.
 */
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PX_I18N } from "./px-i18n";
import { registerNativeApp } from "@/os/windows/apps";
import { preloadStore, storeReady, storeLocked, unlockStore } from "./store";

type Def = typeof import("./DocumentsApp").documentsApp;
let def: Def | null = null;
let loading: Promise<Def> | null = null;
/** Loads the editor module once; later calls share the same promise. */
export function loadDocuments(): Promise<Def> {
  if (def && storeReady()) return Promise.resolve(def);
  // Product phase 1: the store is read from IndexedDB (./store) before the editor's synchronous dcLoad runs.
  if (!loading) loading = Promise.all([import("./DocumentsApp"), preloadStore()]).then(([m]) => (def = m.documentsApp));
  return loading;
}

/** Product phase 6: an encrypted store opens only with its passcode (nothing of Documents runs before). */
function LockScreen({ onOpen }: { onOpen: () => void }) {
  const { lang } = useI18n();
  const T = (k: string) => (PX_I18N as Record<string, Record<string, string>>)[lang]?.[k] || PX_I18N.en[k] || k;
  const [busy, setBusy] = useState(false); const [bad, setBad] = useState(false); const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { inp.current?.focus(); }, []);
  return (
    <form className="dcx-lock" dir={lang === "ar" ? "rtl" : "ltr"} onSubmit={async (e) => { e.preventDefault(); if (busy) return; setBusy(true); setBad(false);
      const ok = await unlockStore(inp.current?.value || ""); setBusy(false); if (ok) onOpen(); else { setBad(true); inp.current?.select(); } }}>
      <div className="dcx-lockc">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
        <h3>{T("dcx_lk_title")}</h3><p>{T("dcx_lk_sub")}</p>
        <label><span>{T("dcx_lk_pass")}</span><input ref={inp} className="dc-inp" type="password" autoComplete="current-password" data-dxlock aria-invalid={bad} /></label>
        {bad && <p className="dcx-lockbad" role="alert">{T("dcx_lk_bad")}</p>}
        <button type="submit" className="dc-btn pri" data-dxunlock disabled={busy}>{busy ? T("dcx_lk_busy") : T("dcx_lk_open")}</button>
      </div>
    </form>
  );
}

/** The window body: waits for the module, runs its beforeOpen (store load) once, then renders the real body. */
function LazyBody() {
  const [ready, setReady] = useState(!!def && storeReady() && !storeLocked());
  const [locked, setLocked] = useState(storeReady() && storeLocked());
  useEffect(() => {
    if (ready) return;
    let alive = true;
    loadDocuments().then((d) => { if (!alive) return; if (storeLocked()) { setLocked(true); return; } d.beforeOpen(); setReady(true); });
    return () => { alive = false; };
  }, [ready]);
  if (locked) return <LockScreen onOpen={() => { setLocked(false); if (def) { def.beforeOpen(); setReady(true); } }} />;
  if (!ready || !def) return <div className="dc-loading" role="status" aria-live="polite" aria-busy="true" />;
  return <>{def.body()}</>;
}

registerNativeApp("documents", {
  // When the module is already loaded, keep the original synchronous order (store load before the body is built).
  beforeOpen: () => { if (storeReady() && !storeLocked()) def?.beforeOpen(); },
  body: () => <LazyBody />,
  onClose: () => { def?.onClose(); },
  onResize: () => { def?.onResize(); },
});

// Warm the module while the browser is idle so the first opening stays instant.
if (typeof window !== "undefined") {
  const warm = () => { loadDocuments().catch(() => { loading = null; }); };
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  setTimeout(() => (ric ? ric(warm, { timeout: 8000 }) : warm()), 4000);
}
