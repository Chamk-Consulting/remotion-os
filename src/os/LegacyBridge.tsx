"use client";
/**
 * B-16 · Legacy bridge (ADR S3). Hosts the ORIGINAL file (public/legacy, byte-identical, same origin) so every app that is
 * not migrated yet keeps 100 % of its behaviour. Same origin ⇒ same localStorage keys ⇒ data is shared live with migrated
 * code through `storage` events.
 *
 * Standalone boot does what the source's osBootApp (L21038) does, but from the parent and validated against the registry,
 * so camelCase keys work (approved fix D-B01: /apps/hrPeople boots HR). Pop-outs are rewritten to /apps/<key>.
 */
import { kbAttachDoc } from "@/os/keyboard/kb";
import { useEffect, useRef } from "react";
import type { AppManifest } from "@/apps/registry";

export const LEGACY_URL = "/legacy/Remotion_Desktop.html";

type LegacyWindow = Window & { eval: (s: string) => unknown; open: Window["open"] };

/** Pop-out rewrite + standalone app-mode boot (osBootApp L21038 with the registry-validated key). `embedded` hides the inner title bar. */
export function prepareLegacy(frame: HTMLIFrameElement, appKey: string | null, embedded = false, hooks?: { down: () => void; click: (e: Event) => void; up: () => void }) {
  const w = frame.contentWindow as LegacyWindow | null;
  if (!w) return;
  // Pop-out from inside the bridge opens the Next.js route instead of the legacy hash URL.
  const nativeOpen = w.open.bind(w);
  w.open = ((url?: string | URL, target?: string, features?: string) => {
    const m = /#app=([A-Za-z]+)/.exec(String(url ?? ""));
    return nativeOpen(m ? `/apps/${m[1]}` : url, target, features);
  }) as Window["open"];
  if (embedded) {
    // Inside an OS window the window already has a title bar: hide the app-mode bar of the legacy solo window.
    const st = frame.contentDocument!.createElement("style"); st.dataset.bridge = "1";
    st.textContent = "body.os-appmode .os-win.os-solo>.os-wh{display:none!important}";
    frame.contentDocument!.head.appendChild(st);
    // Notifications posted by the bridged app (rmNotify → pushNc, L24522) go to the shell's notification centre, as they
    // would in the single-document source. The item's text / field / action functions keep running in the frame.
    try { w.eval("pushNc=function(n){var p=window.parent;if(p&&p.__remotionPushNc){p.__remotionPushNc(n,typeof NC_KIND!=='undefined'?NC_KIND[n.kind]:undefined)}}"); } catch {}
    // Pointer input inside the frame never reaches the OS window: forward it so the window comes forward (and D-B23 applies).
    // The on-screen keyboard types into the app's fields, as it does in the single-document source.
    { const off = kbAttachDoc(frame.contentDocument!); w.addEventListener("pagehide", off); }
    if (hooks) { const d = frame.contentDocument!; d.addEventListener("pointerdown", hooks.down, true); d.addEventListener("click", hooks.click, true); d.addEventListener("pointerup", hooks.up, true); }
  }
  if (appKey) {
    try {
      w.eval(`(function(k){document.body.classList.add("os-appmode","os-standalone","os-booting");var go=function(n){if(typeof OS_OPEN[k]!=="function"){if(n<60)setTimeout(function(){go(n+1)},100);return}try{osAppMode(k,true)}catch(e){console.warn(e)}document.body.classList.remove("os-booting")};setTimeout(function(){go(0)},60)})(${JSON.stringify(appKey)})`);
    } catch (e) { console.warn("legacy bridge boot failed", e); }
  }
}

export function LegacyBridge({ app, title = "Remotion" }: { app?: AppManifest | null; title?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let titleTimer: number | undefined;
    const onLoad = () => { prepareLegacy(frame, app?.solo ? app.key : null); const sync = () => { try { const t = frame.contentDocument?.title; if (t && document.title !== t) document.title = t; } catch {} }; sync(); titleTimer = window.setInterval(sync, 500); };
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
