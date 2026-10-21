"use client";
/**
 * Documents, loaded on demand (product phase 0).
 *
 * The editor module is large (≈2.35 MB of source including the embedded official VPH forms). It used to be imported
 * eagerly by OsShell, so every OS user downloaded it at boot. This stub registers the native app at boot and imports
 * DocumentsApp the first time the window opens (or earlier, when the browser is idle), then hands over to the real
 * definition: beforeOpen → body → onClose / onResize, in the same order as before.
 */
import { useEffect, useState } from "react";
import { registerNativeApp } from "@/os/windows/apps";

type Def = typeof import("./DocumentsApp").documentsApp;
let def: Def | null = null;
let loading: Promise<Def> | null = null;
/** Loads the editor module once; later calls share the same promise. */
export function loadDocuments(): Promise<Def> {
  if (def) return Promise.resolve(def);
  if (!loading) loading = import("./DocumentsApp").then((m) => (def = m.documentsApp));
  return loading;
}

/** The window body: waits for the module, runs its beforeOpen (store load) once, then renders the real body. */
function LazyBody() {
  const [ready, setReady] = useState(!!def);
  useEffect(() => {
    if (ready) return;
    let alive = true;
    loadDocuments().then((d) => { d.beforeOpen(); if (alive) setReady(true); });
    return () => { alive = false; };
  }, [ready]);
  if (!ready || !def) return <div className="dc-loading" role="status" aria-live="polite" />;
  return <>{def.body()}</>;
}

registerNativeApp("documents", {
  // When the module is already loaded, keep the original synchronous order (store load before the body is built).
  beforeOpen: () => { def?.beforeOpen(); },
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
