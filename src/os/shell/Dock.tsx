"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SOURCE_TABLES } from "@/apps/registry";
import { SvgString } from "./svg";

/** Source renderDock (L7740). Per-app running buttons (dynamic dock) arrive with the window manager (B-02). */
export function Dock() {
  const { t } = useI18n();
  return (
    <nav className="dock" id="dock" aria-label="Dock">
      {SOURCE_TABLES.dockApps.map(([k, bg, svg]) => (
        <button key={k} aria-label={t(k)} title={t(k)} data-t={k}>
          <span className="glyph" style={bg === "transparent" ? { background: bg, boxShadow: "none" } : { background: bg }}><SvgString html={svg} /></span>
        </button>
      ))}
    </nav>
  );
}
