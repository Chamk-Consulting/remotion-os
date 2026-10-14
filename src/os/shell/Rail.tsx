"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SOURCE_TABLES } from "@/apps/registry";
import { SvgString } from "./svg";

/** Source renderRail (L7614): 8 app buttons + "add"; the calendar tile shows today's date (calIcon). */
export function Rail() {
  const { t, nf } = useI18n();
  return (
    <aside className="rail" aria-label="Shortcuts" id="rail">
      {SOURCE_TABLES.railItems.map(([k, bg, svg], i) => k === "add"
        ? <button key={k} data-act="add" style={{ ["--bi" as string]: i }}><span className="ricon add-ic"><SvgString html={svg} /></span>{t(k)}</button>
        : <button key={k} data-t={k} style={{ ["--bi" as string]: i }}><span className="ricon" style={{ background: bg }}>{k === "calendar" ? <span className="cal-ic"><i></i><b>{nf(new Date().getDate())}</b></span> : <SvgString html={svg} />}</span>{t(k)}</button>)}
    </aside>
  );
}
