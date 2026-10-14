"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { resolveApp, type AppKey } from "@/apps/registry";
import { LegacyBridge } from "./LegacyBridge";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { OsShell } from "./shell/OsShell";

const noop = () => () => {};
/** Client-only value: the OS needs window/localStorage (ADR-02); the server renders nothing. */
const useIsClient = () => useSyncExternalStore(noop, () => true, () => false);
/** Old pop-out links `/#app=<key>` (doc 02 §2). */
const hashTarget = () => { const m = /#app=([A-Za-z]+)/.exec(location.hash); const a = m && resolveApp(m[1]); return a?.solo ? a : null; };

/**
 * Entry for `/` and `/apps/[appKey]`.
 * Phase B status: the React shell is built behind a preview flag; until it reaches parity the OS runs through the
 * legacy bridge, so the deployed app is never less complete than the source.
 */
export function OsEntry({ appKey }: { appKey?: AppKey }) {
  const router = useRouter();
  const isClient = useIsClient();
  const redirect = isClient && !appKey ? hashTarget() : null;
  useEffect(() => { if (redirect) router.replace(`/apps/${redirect.key}`); }, [redirect, router]);
  if (!isClient || redirect) return null;
  // Preview of the React shell (Phase B, behind a flag until parity): /?shell=react
  if (!appKey && new URLSearchParams(location.search).get("shell") === "react") return <I18nProvider><OsShell /></I18nProvider>;
  return <LegacyBridge app={appKey ? resolveApp(appKey) : null} />;
}
