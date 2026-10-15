"use client";
/**
 * App windows. Each entry reproduces the source opener's window options (size formula, class, icon, title, min size):
 * osFiles L12091, osTerminal L12258, feOpen L13576, dcOpen L15406, caOpen L22575, biOpen L23791, hrOpen L24425,
 * paOpen L25411, clOpen L26083, cbOpen L26671, plOpen L27198. Until an app is migrated its body is the legacy bridge (B-16).
 */
import raw from "@/apps/registry.data.json";
import icons from "@/os/shell/data/icons.json";
import { useShell } from "@/os/state/shell";
import { SvgString } from "@/os/shell/svg";
import { osActions } from "@/os/actions";
import { osFocus, osRestore, osWinOpen, useWm, type Tr, type WinOpts } from "./wm";
import { LegacyAppFrame } from "./LegacyAppFrame";

const DK = raw.DK_APPS as unknown as Record<string, [string, string]>;
const L4 = (s: string, lang: string) => { const p = s.split("|"); return p[({ fr: 0, en: 1, de: 2, ar: 3 } as Record<string, number>)[lang] ?? 1] || p[1] || p[0]; };
const lang = () => document.documentElement.lang || "en";
const l4 = (s: string) => () => L4(s, lang());
const mini = (k: string) => <span className="gl app gmini" style={{ background: DK[k][0] }}><SvgString html={DK[k][1]} /></span>;
const FOLDER_IC = (icons.OIC as Record<string, string>).folder.replace('width="17" height="15"', 'width="22" height="19"').replace("#f5b52e", "#3e86e8");
const CAL_IC = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>';
const bottom = () => { const d = document.getElementById("dock")!.getBoundingClientRect(); return (d.top > 200 ? d.top : innerHeight) - 10; };
const big = (maxW: number, minH: number, capH?: number) => { const W = Math.min(maxW, innerWidth - 16); const H = capH ? Math.max(minH, Math.min(capH, bottom() - 66)) : Math.max(minH, bottom() - 66); return { w: W, h: H, x: (innerWidth - W) / 2, y: 64 }; };

type Spec = { title: (t: Tr) => string; icon: () => React.ReactNode; cls: string; minW: number; minH: number; geo: () => { w: number; h: number; x: number; y: number }; relabelAria: boolean; dockBtn: boolean; touch: "always" | "terminal" | "none" };
const S = (o: Spec) => o;
export const APP_WINDOWS: Record<string, Spec> = {
  files: S({ title: (t) => t("files"), icon: () => <SvgString html={FOLDER_IC} />, cls: "fm-win", minW: 560, minH: 340, relabelAria: false, dockBtn: false, touch: "none",
    geo: () => { const W = Math.min(780, innerWidth - 24), H = Math.min(472, innerHeight - 170); return { w: W, h: H, x: document.documentElement.dir === "rtl" ? 10 : innerWidth - W - 10, y: Math.max(80, innerHeight - H - 138) }; } }),
  terminal: S({ title: (t) => t("terminal"), icon: () => mini("terminal"), cls: "tm-win", minW: 380, minH: 220, relabelAria: false, dockBtn: false, touch: "terminal", geo: () => ({ w: 620, h: 380, x: (innerWidth - 620) / 2, y: 120 }) }),
  forms: S({ title: (t) => t("fe_app"), icon: () => mini("forms"), cls: "fe-win", minW: 340, minH: 380, relabelAria: true, dockBtn: true, touch: "always", geo: () => big(1640, 420) }),
  documents: S({ title: (t) => t("documents"), icon: () => mini("documents"), cls: "dc-win", minW: 340, minH: 380, relabelAria: true, dockBtn: false, touch: "always", geo: () => big(1640, 420) }),
  calcsci: S({ title: (t) => t("calcsci"), icon: () => mini("calcsci"), cls: "ca-win", minW: 340, minH: 420, relabelAria: true, dockBtn: true, touch: "always", geo: () => big(1320, 440, 900) }),
  billing: S({ title: l4("Facturation & Revenus|Billing & Revenue|Abrechnung & Umsatz|الفوترة والإيرادات"), icon: () => mini("billing"), cls: "bi-win", minW: 340, minH: 420, relabelAria: true, dockBtn: true, touch: "always", geo: () => big(1640, 440) }),
  hrPeople: S({ title: l4("RH & Paie|HR & Payroll|HR & Lohn|الموارد البشرية والرواتب"), icon: () => mini("hrPeople"), cls: "hr-win", minW: 340, minH: 420, relabelAria: true, dockBtn: true, touch: "always", geo: () => big(1640, 440) }),
  patients: S({ title: l4("Patients & Dossiers|Patients & Records|Patienten & Akten|المرضى والملفات"), icon: () => mini("patients"), cls: "hr-win pa-win", minW: 340, minH: 420, relabelAria: true, dockBtn: true, touch: "always", geo: () => big(1640, 440) }),
  calendar: S({ title: l4("Gestion Calendrier|Calendar management|Kalenderverwaltung|إدارة التقويم"), icon: () => <span className="gl app gmini cl-wicon"><SvgString html={CAL_IC} /></span>, cls: "hr-win cl-win", minW: 340, minH: 420, relabelAria: true, dockBtn: true, touch: "always", geo: () => big(1640, 440) }),
  cabinet: S({ title: l4("Gestion Cabinet|Practice management|Praxisverwaltung|إدارة العيادة"), icon: () => mini("cabinet"), cls: "hr-win cb-win", minW: 340, minH: 420, relabelAria: true, dockBtn: true, touch: "always", geo: () => big(1640, 440) }),
  planning: S({ title: l4("Calendrier & Planification|Calendar & Planning|Kalender & Planung|التقويم والتخطيط"), icon: () => mini("planning"), cls: "hr-win pl-win", minW: 340, minH: 420, relabelAria: true, dockBtn: true, touch: "always", geo: () => big(1680, 440) }),
};
/** Apps that add their own dock button while running (xxDockBtn). */
export const DYNAMIC_DOCK = Object.keys(APP_WINDOWS).filter((k) => APP_WINDOWS[k].dockBtn);
/** Source OS_OPEN keys → window key (the L11857 chain, now from the registry; unknown keys are not handled: D-B06 fix). */
export const OPEN_KEY: Record<string, string> = { files: "files", explorer: "files", launchpad: "apps", apps: "apps", terminal: "terminal", forms: "forms", documents: "documents", docs: "documents", calcsci: "calcsci", calculator: "calcsci", billing: "billing", hrPeople: "hrPeople", patients: "patients", calendar: "calendar", cabinet: "cabinet", planning: "planning" };

/** Opens (or brings back) an app window — the per-app open functions. */
export function openApp(key: string, from?: Element | null) {
  // The launcher, Files and Terminal are native React windows (B-15).
  if (key === "apps") { osActions.launcher(from); return; }
  if (key === "files") { osActions.files(from); return; }
  if (key === "terminal") { osActions.terminal(from); return; }
  const sp = APP_WINDOWS[key]; if (!sp) return;
  const ex = useWm.getState().wins[key];
  if (ex && !ex.closing) { if (ex.min) osRestore(key); osFocus(key); return; }
  const st = useShell.getState();
  if (sp.touch === "always") st.mutate((s) => { if (s.apps.inst[key] !== 1) s.apps.inst[key] = 1; s.apps.recent = [key, ...s.apps.recent.filter((x) => x !== key)].slice(0, 12); }, { save: false, apps: true });
  if (sp.touch === "terminal") { const d = (raw.AL_APPS as unknown as [string, string, number][]).find((a) => a[0] === "terminal"); const inst = st.apps.inst.terminal !== undefined ? !!st.apps.inst.terminal : !!d?.[2]; if (!inst) st.mutate((s) => { s.apps.inst.terminal = 1; }, { save: false, apps: true }); }
  const g = sp.geo();
  const o: WinOpts = { title: sp.title, icon: sp.icon(), cls: sp.cls, w: g.w, h: g.h, x: g.x, y: g.y, minW: sp.minW, minH: sp.minH, from: from ?? null, relabelAria: sp.relabelAria, body: <LegacyAppFrame appKey={key} /> };
  osWinOpen(key, o);
}


