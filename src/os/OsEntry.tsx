"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveApp, type AppKey } from "@/apps/registry";
import { LegacyBridge } from "./LegacyBridge";

/**
 * Entry for `/` and `/apps/[appKey]`.
 * Phase B status: the React shell is built behind a preview flag; until it reaches parity the OS runs through the
 * legacy bridge, so the deployed app is never less complete than the source.
 */
export function OsEntry({ appKey }: { appKey?: AppKey }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Compatibility: old pop-out links `/#app=<key>` → `/apps/<key>` (doc 02 §2).
    const m = /#app=([A-Za-z]+)/.exec(location.hash);
    const target = m && resolveApp(m[1]);
    if (!appKey && target?.solo) { router.replace(`/apps/${target.key}`); return; }
    setReady(true);
  }, [appKey, router]);
  if (!ready) return null;
  const app = appKey ? resolveApp(appKey) : null;
  return <LegacyBridge app={app} />;
}
