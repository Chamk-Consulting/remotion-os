/**
 * B-01T · Typed app registry (ADR-03). Replaces the source's 9 global tables (railItems, dockApps, DK_APPS, AL_APPS,
 * AL_CATS, alStore defaults, OS_OPEN, OS_DOCK, OS_SOLO) and the 2 hand-maintained key chains (L11857, L20981).
 * Raw values are extracted from the booted source by tools/extract-registry.mjs (registry.data.json) — never retyped.
 */
import raw from "./registry.data.json";

type Glyph = { bg: string; svg: string };
export type AppKey =
  | "apps" | "files" | "terminal" | "forms" | "documents" | "calcsci" | "billing"
  | "hrPeople" | "patients" | "calendar" | "cabinet" | "planning" | "dossier";

export interface AppManifest {
  key: AppKey;
  /** Other keys the source routes to this app (dock/rail data-t values, osSoloKey aliases). */
  aliases: string[];
  /** i18n key of the display name (source OS_SOLO[k].n or t(k)). */
  nameKey: string;
  glyph: Glyph | null;
  launcher: { category: string; installedByDefault: boolean } | null;
  /** Dock button key (OS_DOCK). Approved fix D-B05: every window app gets one. */
  dockKey: string;
  /** App mode / pop-out / app full screen allowed (OS_SOLO). */
  solo: boolean;
  /** true while the app still runs from the original file through the legacy bridge (ADR S3). */
  legacy: boolean;
}

const DK = raw.DK_APPS as unknown as Record<string, [string, string]>;
const glyph = (k: string): Glyph | null => (DK[k] ? { bg: DK[k][0], svg: DK[k][1] } : null);
const AL = raw.AL_APPS as unknown as [string, string, number][];
const launcherOf = (k: string) => { const a = AL.find((x) => x[0] === k); return a ? { category: a[1], installedByDefault: !!a[2] } : null; };

const def = (key: AppKey, nameKey: string, aliases: string[], dockKey: string, glyphKey: string = key, launcherKey: string = key): AppManifest => ({
  key, aliases, nameKey, glyph: glyph(glyphKey), launcher: launcherOf(launcherKey), dockKey,
  solo: key in raw.OS_SOLO, legacy: true,
});

export const APPS: readonly AppManifest[] = [
  def("apps", "apps", ["launchpad"], "launchpad", "launchpad", "launchpad"),
  def("files", "files", ["explorer"], "files"),
  def("terminal", "terminal", [], "terminal"),
  def("forms", "fe_app", [], "forms"),
  def("documents", "documents", ["docs"], "documents", "documents", "docs"),
  def("calcsci", "calcsci", ["calculator"], "calcsci"),
  def("billing", "bi_app", [], "billing"),
  def("hrPeople", "hrPeople", [], "hrPeople"),
  def("patients", "patients", [], "patients"),
  def("calendar", "calendar", [], "calendar"),
  def("cabinet", "cabinet", [], "cabinet"),
  def("planning", "planning", [], "planning"),
  def("dossier", "dossier", [], "dossier"), // v72–v73 (catch-up S5)
];

const byKey = new Map<string, AppManifest>();
for (const a of APPS) { byKey.set(a.key, a); for (const al of a.aliases) byKey.set(al, a); }

/** Resolves any key or alias (replaces osSoloKey + the L11857 chain). Unknown → null (no silent fallback to "apps": fix D-B06). */
export function resolveApp(k: string | null | undefined): AppManifest | null {
  return (k && byKey.get(k)) || null;
}
/** The 11 app-mode keys (OS_SOLO, L20980), camelCase-safe (fix D-B01). */
export const SOLO_KEYS = APPS.filter((a) => a.solo).map((a) => a.key);
/** Source tables exposed read-only for shell components (rail, dock, launcher). */
export const SOURCE_TABLES = {
  railItems: raw.railItems as unknown as [string, string, string][],
  dockApps: raw.dockApps as unknown as [string, string, string][],
  launcherCategories: raw.AL_CATS as unknown as [string, string][],
  launcherApps: AL,
};
