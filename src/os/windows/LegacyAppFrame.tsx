"use client";
/** B-16 · Body of an app window whose app is not migrated yet: the original file booted in app mode for that app (same origin). */
import { useEffect, useRef } from "react";
import { LEGACY_URL, prepareLegacy } from "@/os/LegacyBridge";
import { bgClickGuard } from "./stack";
import { osFocus } from "./wm";

export function LegacyAppFrame({ appKey }: { appKey: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const f = ref.current!; const g = bgClickGuard("os:" + appKey);
    const on = () => prepareLegacy(f, appKey, true, { down: () => { g.down(); osFocus(appKey); }, click: (e) => { g.click(e); }, up: () => g.up() });
    f.addEventListener("load", on); return () => f.removeEventListener("load", on);
  }, [appKey]);
  return <iframe ref={ref} className="os-bridge" src={LEGACY_URL} title={appKey} data-bridge={appKey} allow="fullscreen; clipboard-read; clipboard-write" style={{ width: "100%", height: "100%", border: 0, display: "block" }} />;
}
