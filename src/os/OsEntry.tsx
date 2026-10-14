"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { resolveApp, type AppKey } from "@/apps/registry";
import { LegacyBridge } from "./LegacyBridge";

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
  return <LegacyBridge app={appKey ? resolveApp(appKey) : null} />;
}
