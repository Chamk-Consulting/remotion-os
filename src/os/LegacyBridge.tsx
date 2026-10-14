"use client";
/**
 * B-16 · Legacy bridge (ADR S3). Hosts the ORIGINAL file (public/legacy, byte-identical, same origin) so every app that is
 * not migrated yet keeps 100 % of its behaviour. Same origin ⇒ same localStorage keys ⇒ data is shared live with migrated
 * code through `storage` events.
 *
 * Standalone boot does what the source's osBootApp (L21038) does, but from the parent and validated against the registry,
 * so camelCase keys work (approved fix D-B01: /apps/hrPeople boots HR). Pop-outs are rewritten to /apps/<key>.
 */
import { useEffect, useRef } from "react";
import type { AppManifest } from "@/apps/registry";

const LEGACY_URL = "/legacy/Remotion_Desktop.html";

type LegacyWindow = Window & { eval: (s: string) => unknown; open: Window["open"] };

export function LegacyBridge({ app, title = "Remotion" }: { app?: AppManifest | null; title?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let titleTimer: number | undefined;
    const onLoad = () => {
      const w = frame.contentWindow as LegacyWindow | null;
      if (!w) return;
      // Pop-out from inside the bridge opens the Next.js route instead of the legacy hash URL.
      const nativeOpen = w.open.bind(w);
      w.open = ((url?: string | URL, target?: string, features?: string) => {
        const m = /#app=([A-Za-z]+)/.exec(String(url ?? ""));
        return nativeOpen(m ? `/apps/${m[1]}` : url, target, features);
      }) as Window["open"];
      if (app?.solo) {
        try {
          // Same steps as osBootApp, with the validated key.
          w.eval(`(function(k){document.body.classList.add("os-appmode","os-standalone","os-booting");var go=function(n){if(typeof OS_OPEN[k]!=="function"){if(n<60)setTimeout(function(){go(n+1)},100);return}try{osAppMode(k,true)}catch(e){console.warn(e)}document.body.classList.remove("os-booting")};setTimeout(function(){go(0)},60)})(${JSON.stringify(app.key)})`);
        } catch (e) { console.warn("legacy bridge boot failed", e); }
      }
      // Mirror the legacy document title (app mode sets "<App> · Remotion").
      const sync = () => { try { const t = frame.contentDocument?.title; if (t && document.title !== t) document.title = t; } catch {} };
      sync(); titleTimer = window.setInterval(sync, 500);
    };
    frame.addEventListener("load", onLoad);
    return () => { frame.removeEventListener("load", onLoad); if (titleTimer) clearInterval(titleTimer); };
  }, [app]);

  return (
    <iframe
      ref={ref}
      src={LEGACY_URL}
      title={title}
      // Same-origin by design (shared storage). Fullscreen + clipboard + downloads are used by the source.
      allow="fullscreen; clipboard-read; clipboard-write"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", border: 0, display: "block" }}
    />
  );
}
