"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { resolveApp, type AppKey } from "@/apps/registry";
import { LegacyBridge } from "./LegacyBridge";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { OsShell } from "./shell/OsShell";
import { installDataSafety } from "@/lib/storage/safety";
import { installDataLinks } from "@/apps/health/datalinks";
import { installTransitions } from "@/os/transitions/transitions";
import { installSwitcher } from "@/os/transitions/switcher";
import { installOverview } from "@/os/transitions/overview";
import { installGestures } from "@/os/transitions/gestures";
import { installA11y } from "@/os/a11y/a11y";

const noop = () => () => {};
/** Client-only value: the OS needs window/localStorage (ADR-02); the server renders nothing. */
const useIsClient = () => useSyncExternalStore(noop, () => true, () => false);
/** Old pop-out links `/#app=<key>` (doc 02 §2). */
const hashTarget = () => { const m = /#app=([A-Za-z]+)/.exec(location.hash); const a = m && resolveApp(m[1]); return a?.solo ? a : null; };

/**
 * Entry for `/` and `/apps/[appKey]`.
 * Phase B slice 11: the React shell serves both routes (apps still open their bodies through the legacy bridge inside
 * OS windows until Phase C). The whole legacy OS stays reachable for diagnosis and rollback with `?shell=legacy`, and a
 * build with `NEXT_PUBLIC_OS_SHELL=legacy` makes it the default again (doc 14, rollback).
 */
export function OsEntry({ appKey }: { appKey?: AppKey }) {
  const router = useRouter();
  const isClient = useIsClient();
  const redirect = isClient && !appKey ? hashTarget() : null;
  useEffect(() => { if (redirect) router.replace(`/apps/${redirect.key}`); }, [redirect, router]);
  if (!isClient || redirect) return null;
  const q = new URLSearchParams(location.search).get("shell");
  const legacy = q === "legacy" || (q !== "react" && process.env.NEXT_PUBLIC_OS_SHELL === "legacy");
  if (legacy) return <LegacyBridge app={appKey ? resolveApp(appKey) : null} />;
  installDataSafety(); installDataLinks(); installTransitions(); installSwitcher(); installOverview(); installGestures(); installA11y(); /* v93 data safety (catch-up S3), before any app reads its store */
  return <I18nProvider><OsShell bootApp={appKey} /></I18nProvider>;
}
