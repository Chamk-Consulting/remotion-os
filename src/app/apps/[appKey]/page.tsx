import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SOLO_KEYS, resolveApp, type AppKey } from "@/apps/registry";
import { OsEntry } from "@/os/OsEntry";
import { translate } from "@/lib/i18n/core";

// The 11 app-mode keys (source OS_SOLO, L20980) are prerendered; any other key renders notFound().
export function generateStaticParams() {
  return SOLO_KEYS.map((appKey) => ({ appKey }));
}
export async function generateMetadata({ params }: PageProps<"/apps/[appKey]">): Promise<Metadata> {
  const { appKey } = await params;
  const app = resolveApp(appKey);
  // Source standalone title: "<App> · Remotion" (L20991).
  return { title: app ? `${translate("en", app.nameKey)} · Remotion` : "Remotion" };
}
export default async function AppPage({ params }: PageProps<"/apps/[appKey]">) {
  const { appKey } = await params;
  const app = resolveApp(appKey);
  if (!app || !app.solo || app.key !== appKey) notFound();
  return <OsEntry appKey={app.key as AppKey} />;
}
