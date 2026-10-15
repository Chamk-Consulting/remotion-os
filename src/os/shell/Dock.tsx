"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SOURCE_TABLES } from "@/apps/registry";
import raw from "@/apps/registry.data.json";
import { reducedMotion } from "@/lib/motion";
import { useWm } from "@/os/windows/wm";
import { APP_WINDOWS, DYNAMIC_DOCK } from "@/os/windows/apps";
import { SvgString } from "./svg";

const DK = raw.DK_APPS as unknown as Record<string, [string, string]>;
/** osRunMark targets (OS_DOCK) — every window app has one (approved fix D-B05). */
const RUN_MARK: Record<string, string> = { files: "files", apps: "launchpad", terminal: "terminal", forms: "forms", documents: "documents", calcsci: "calcsci", billing: "billing", hrPeople: "hrPeople", patients: "patients", calendar: "calendar", cabinet: "cabinet", planning: "planning" };

/** Source renderDock (L7740) + the running-app buttons apps add before the trash (feDockBtn L13569 and siblings) + osRunMark (L11809). */
export function Dock() {
  const { t } = useI18n();
  const wins = useWm((s) => s.wins), order = useWm((s) => s.order);
  const running = (k: string) => !!wins[k] && !wins[k].closing;
  const statics = new Set(SOURCE_TABLES.dockApps.map(([k]) => k));
  // Dynamic buttons in the order they were added; a closed app's button animates out before it is removed.
  const [shown, setShown] = useState<string[]>([]);
  const want = order.filter((k) => DYNAMIC_DOCK.includes(k) && running(k) && !statics.has(k));
  const [prevWant, setPrevWant] = useState<string[]>([]);
  if (want.join() !== prevWant.join()) { setPrevWant(want); setShown((s) => [...s, ...want.filter((k) => !s.includes(k))]); }
  const cls = (dataT: string, base = "") => {
    const key = Object.keys(RUN_MARK).find((k) => RUN_MARK[k] === dataT);
    // osDockBtn uses querySelector: only the FIRST button with that data-t gets the marks.
    const w = key && wins[key] && !wins[key].closing ? wins[key] : null;
    return [base, w ? "os-run" : "", w?.min ? "os-minz" : ""].filter(Boolean).join(" ") || undefined;
  };
  const marked = new Set<string>();
  const once = (dataT: string, base?: string) => { if (marked.has(dataT)) return base || undefined; marked.add(dataT); return cls(dataT, base); };
  const trash = SOURCE_TABLES.dockApps.find(([k]) => k === "trash")!;
  return (
    <nav className="dock" id="dock" aria-label="Dock">
      {SOURCE_TABLES.dockApps.filter(([k]) => k !== "trash").map(([k, bg, svg]) => (
        <button key={k} aria-label={t(k)} title={t(k)} data-t={k} className={once(k)}>
          <span className="glyph" style={bg === "transparent" ? { background: bg, boxShadow: "none" } : { background: bg }}><SvgString html={svg} /></span>
        </button>
      ))}
      {shown.map((k) => <DockAppButton key={k} k={k} label={typeof APP_WINDOWS[k].title === "function" ? APP_WINDOWS[k].title(t) : ""} leaving={!want.includes(k)} cls={once(k, "fe-dockb")!} onGone={() => setShown((s) => s.filter((x) => x !== k))} />)}
      <button key="trash" aria-label={t("trash")} title={t("trash")} data-t="trash">
        <span className="glyph" style={trash[1] === "transparent" ? { background: trash[1], boxShadow: "none" } : { background: trash[1] }}><SvgString html={trash[2]} /></span>
      </button>
    </nav>
  );
}

function DockAppButton({ k, label, leaving, cls, onGone }: { k: string; label: string; leaving: boolean; cls: string; onGone: () => void }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    const b = ref.current!; if (reducedMotion()) return;
    b.animate([{ width: "0px", opacity: 0, transform: "scale(.3)" }, { width: b.offsetWidth + "px", opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,1.3,.3,1)" });
  }, []);
  useLayoutEffect(() => {
    if (!leaving) return; const b = ref.current!;
    if (reducedMotion()) { onGone(); return; }
    b.animate([{ opacity: 1, transform: "none", width: b.offsetWidth + "px" }, { opacity: 0, transform: "scale(.3)", width: "0px" }], { duration: 320, easing: "cubic-bezier(.4,0,.2,1)" }).finished.then(onGone);
  }, [leaving, onGone]);
  // feDockBtn creates the Forms button without type="button"; the others set it.
  // clDockBtn (L26083): the calendar's button is a date tile (`.cl-dockg`, today in the clinic's time zone), not a glyph.
  if (k === "calendar") return <button ref={ref} type="button" data-t={k} className={cls} aria-label={label} title={label}><span className="glyph cl-dockg"><b>{calDockDay()}</b></span></button>;
  return <button ref={ref} type={k === "forms" ? undefined : "button"} data-t={k} className={cls} aria-label={label} title={label}><span className="glyph" style={{ background: DK[k][0] }}><SvgString html={DK[k][1]} /></span></button>;
}

/** `+clToday().slice(8)` (L25451): the day of the month now, in the calendar's saved time zone (prefs.tz) or the
 * organisation's (CL_ORG_TZ "Europe/Paris"), read from the calendar's own store `remotion-calendar`. */
function calDockDay() {
  let tz = "Europe/Paris";
  try { const s = JSON.parse(localStorage.getItem("remotion-calendar") || "null"); if (s && s.v === 1 && Array.isArray(s.appts) && s.prefs?.tz) tz = s.prefs.tz; } catch {}
  const o: Record<string, string> = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).forEach((p) => (o[p.type] = p.value));
  return +o.day;
}
