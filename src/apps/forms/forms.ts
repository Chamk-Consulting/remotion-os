"use client";
/**
 * Formulaires & Enquêtes — the Forms & Surveys app (source L12311–L14340): v1 core (icons, field types, seed data,
 * controls, editor canvas, properties, shell, preview, rules / versions / share / automations tabs, app views, undo,
 * AI v1, publish, drag and drop, events, keyboard) and the extension layers (universal component registry and domain
 * libraries, formula engine, logic v2, library panel, reusable blocks, form settings, preview behaviour v2, dialogs,
 * creation modes, wizard, import, AI preview, submissions review, autofill, accessibility check, share tokens, domain
 * templates) with their 29 overrides.
 *
 * Deliberate structure (ADR-04 exception, as for the other native apps): the source builds the app from string
 * templates written with innerHTML and patched in place. It is ported as a typed imperative island that fills the
 * `.fe` container the window body mounts once. The code below is the source's own text (templates byte-identical) with
 * types added; only the OS integration (L13567–L13597) is replaced by the React window wiring
 * (src/apps/forms/FormsApp.tsx) and the shell (APP_WINDOWS.forms, APP_SEEDS, osRelabel).
 *
 * Overrides: the source redefines 29 functions after declaring them (`{const _x0=feX;feX=function(…){…}}` and plain
 * re-assignments). A function declaration cannot be re-assigned in TypeScript, so those 29 are declared with
 * `let feX=function…` at the same place; nothing calls them while the module is evaluated, so behaviour is unchanged.
 *
 * Typing note: a few field properties hold a count for one field type and a list for another (`cols` is a group's column
 * count and a matrix's column labels; `rows` a table's row count and a matrix's row labels). They are typed as the
 * intersection of both (`number & FeLabel[]`), so the source's code type-checks for each use without changing it; fields
 * are built from a property bag (feField), never from a literal of that type.
 *
 * Other type-only adjustments: answers are read through `FeAnsR` (see its comment); two functions the source calls with
 * an argument they ignore (feAutoHTML(true), feDownload(name, text, mime)) declare it as an unused optional parameter;
 * lookup tables (FE_FR, FE_ROMJ, FE_SAMPLE, …) are typed as records. feBody (L12960) fills and wires the `.fe` container
 * the window body renders instead of creating a detached one (same markup, same listeners).
 *
 * Shared store: Billing and Patients read the same in-memory `feS` (src/apps/forms/store.ts re-exports it from here),
 * as the source shares one `feS` between the Forms app and its readers.
 *
 * Simulated as in the source (S class): responses, respondents, share links and tokens are a browser-side demo; the
 * public URL is fictitious; AI features use the host model only when one is available.
 */
import { flushSync } from "react-dom";
import { I18N as I18N0, translate, formatNumber } from "@/lib/i18n/core";
import { LANGS as LANGS0, isLang, type Lang } from "@/lib/i18n/langs";
import { lkRM } from "@/os/lock/lock";
import { useShell } from "@/os/state/shell";
import { osMenu as osMenuCore, osMenuCloseAll, type MenuItem } from "@/os/menu/OsMenu";
import { ghost as dkGhost } from "@/os/desktop/ghost";
import { aiGetSample } from "@/os/ai/ai";
import { BASE_ACCOUNTS } from "@/os/shell/data/account";
import registry from "@/apps/registry.data.json";

/* ---------- typed model ---------- */
type Dict = Record<string, string>;
type Bag = Record<string, unknown>;
/** A label: an i18n key, a plain string, or a per-language object ({fr, en, …}). */
export type FeLabel = string | Record<string, string>;
export type FeTCol = { l: FeLabel; ty: string; opts?: string; req?: boolean; id?: string; w?: number; [k: string]: unknown };
export type FeCond = { src?: string; op?: string; val?: unknown; [k: string]: unknown };
export type FeLogic = { act?: string; mode?: string; conds?: FeCond[]; src?: string; op?: string; val?: unknown; [k: string]: unknown };
export type FeBand = { max: number; label: FeLabel; tone: string; [k: string]: unknown };
export type FeField = {
  id: string; type: string; label: FeLabel; key: string; req?: boolean; ro?: boolean; hid?: boolean; w?: number; col?: boolean;
  opts?: FeLabel[]; disp?: string; min?: number; max?: number; step?: number; unit?: string; dec?: number;
  /** Column / row count for groups and tables, column / row labels for matrices: one property, two uses (see the typing note). */
  ph?: FeLabel; desc?: FeLabel; def?: unknown; src?: string; fields?: FeField[]; cols?: number & FeLabel[]; tcols?: FeTCol[]; rows?: number & FeLabel[]; tdef?: Bag[];
  addRows?: boolean; tsum?: boolean | string; logic?: FeLogic | null; blk?: { id: string; ver: number } | null; xv?: { op?: string; ref?: string; [k: string]: unknown };
  bands?: FeBand[]; items?: { ref: string; w?: number | string }[]; meth?: string; expr?: string; sp?: Record<string, number>; kind?: string; priv?: string;
  csrc?: string; ctype?: string; cx?: number; cy?: number; cvals?: boolean; stars?: number; repeat?: number | boolean; norm?: number; joint?: string; tone?: string;
  regex?: string; pts?: number; cur?: string; vset?: string[]; rmax?: number; period?: string; move?: string; dv?: unknown; dob?: string; del?: boolean; right?: FeLabel;
  left?: FeLabel; pre?: string; maybe?: boolean; rlabel?: FeLabel; status?: string; size?: number; name?: string; mname?: string; method?: string; arch?: boolean;
  [k: string]: unknown;
};
export type FeSection = { id: string; title: FeLabel; cols?: number; desc?: FeLabel; fields: FeField[]; col?: boolean; [k: string]: unknown };
export type FePage = { id?: string; title?: FeLabel; sections: FeSection[]; skip?: FeLogic | null; [k: string]: unknown };
export type FeDocT = {
  pages: FePage[]; title?: FeLabel; sub?: FeLabel; status?: string; cat?: string; lang?: string | null; everPub?: boolean;
  set: Bag; share: { access: string; invites: string[]; expire: boolean; until: string; tokens?: { c: string; used?: boolean; at?: number }[]; [k: string]: unknown }; auto: Record<string, boolean>; [k: string]: unknown;
};
export type FeEntryT = { id: string; name?: FeLabel; cat?: string; kind?: string; status?: string; arch?: boolean; resp?: number; upd?: number; owner?: string; [k: string]: unknown };
export type FeSub = { id: string; who: string; form: string; at: number; st: string; ans?: Bag; log?: { at: number; by: string; act: string; msg?: string }[]; corr?: string; seen?: boolean | number; sample?: boolean; [k: string]: unknown };
export type FeBlock = { id: string; name: string; desc?: string; scope: string; ver: number; upd: number; fields: FeField[]; cols?: number; [k: string]: unknown };
export type FeVer = { n: number; at: number; by: string; snap: string; [k: string]: unknown };
export type FeState = {
  v: number; cur: string; docs: Record<string, FeDocT>; forms: FeEntryT[]; subs: FeSub[]; ver: Record<string, FeVer[]>;
  pv: { theme?: string; color?: string; logo?: string; hdr?: string; org?: boolean; lang?: string | null; prog?: boolean; nums?: boolean; later?: boolean; reqm?: boolean; ro?: boolean; fill?: boolean; logic?: boolean; logoData?: string; hdrData?: string; cv?: number; [k: string]: unknown };
  set: Bag; saved: number; g1?: number; g2?: number; blocks?: FeBlock[]; favs?: string[]; recent?: string[]; [k: string]: unknown;
};
type WalkFn = (f: FeField, box: FeSection | FeField, i: number, depth: number, sec: FeSection) => unknown;
/** The width helpers read only these properties (a drag placeholder passes a stand-in). */
type FeSpF = { type: string; w?: number; sp?: Record<string, number> };
export type FePv = { dev: string; step: number; vals: Bag; err: Dict; test: boolean; done: boolean; seed?: number; rep?: Record<string, number>; prov?: Record<string, Bag>; [k: string]: unknown };
export type FeModalT = { el: HTMLElementX; o: { wide?: boolean; onClose?: () => void; drawer?: boolean; [k: string]: unknown } };
export type FeApp = {
  view: string; tab: string; dev: string; zoom: number; sel: string | null; ptab: string; page: number; undo: string[]; redo: string[]; comp: string; q: string; pv: FePv;
  drag: unknown; ask: boolean; imp?: { tab?: string; rows: FeImpRow[] | null; warn: string[]; src: string; json?: { title?: unknown; pages?: FePage[]; set?: Bag; sub?: FeLabel } | null; [k: string]: unknown };
  rb?: { src?: string; op: string; val: string; act: string; tgt?: string; [k: string]: unknown } | null;
  wz?: { step: number; dom: string; aud: string; goal: string; lang: string; secs: number; sign: boolean; cons: boolean; score: boolean; logic: boolean; [k: string]: unknown };
  dto?: Record<string, boolean>; af?: { src: string; rows: FeAfRow[]; docName?: string }; modal?: FeModalT | null; clip?: string | null; aiOps?: (FeOp & { on: boolean })[] | null; aiCreate?: boolean;
  st?: ReturnType<typeof setTimeout>; sf?: string; lp?: string; mem?: Bag; subOpen?: string | null; selSec?: string | null; subTab?: string; snapOn?: boolean;
  editingTitle?: boolean; lq?: string; tcoT?: ReturnType<typeof setTimeout>; pvT?: ReturnType<typeof setTimeout>; colT?: ReturnType<typeof setTimeout>; _labObj?: unknown;
  tick?: ReturnType<typeof setInterval>; [k: string]: unknown;
};
type HTMLElementX = HTMLElement & { _t?: ReturnType<typeof setTimeout>; _undo?: (() => void) | null; _box?: Element | null };
/**
 * An answer as read by the summaries and validators (feValStr, fePvValidate, feCtl). The source keeps every answer in one
 * bag and reads it as a string, a list or a small object (date range, duration, address, vitals, rows) depending on the
 * field type; this type exposes all three readings so that code type-checks unchanged. Answers are asserted to it where
 * they are read; they are written as plain values.
 */
export type FeAnsO = { [k: string]: string | number | undefined | null };
export type FeAnsR = string & FeAnsO & FeAnsO[];
/** An autofill suggestion row (feAutofillSuggest). */
export type FeAfRow = { fid: string; label?: string; val?: unknown; shown?: string; conf: number; st: string; src?: string; on: boolean; [k: string]: unknown };
/** A question read from an imported file (feImportParse, feDocToRows). */
export type FeImpRow = { type: string; label: string; req?: boolean; opts?: string[]; sec?: string; on?: boolean; conf?: number; page?: number; section?: string; [k: string]: unknown };
/** pdf.js and mammoth, self-hosted under /public/vendor, loaded on demand (feLoadScript). */
type FeWinLibs = { pdfjsLib: { GlobalWorkerOptions: { workerSrc: string }; getDocument: (o: Bag) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string; hasEOL?: boolean; transform: number[] }[] }> }> }> } }; mammoth: { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> } };
/** The live-preview context passed to the field renderers (fePvForm): answers, read-only flag, id prefix. */
export type FeP = { vals: Bag; ro?: unknown; uid?: string };
/** A formula token and expression node (feTok / feParse, L13740). */
export type FeTk = { t: string; v: string } | { t: "n"; v: number };
export type FeAst = { k: string; v?: string | number; o?: string; a?: FeAst | FeAst[]; b?: FeAst; c?: FeAst; f?: string; args?: FeAst[]; [k: string]: unknown };
/** An AI / import operation (feAiApply, L13105; feOpLabel, L14108). */
export type FeOp = { op: string; type?: string; label?: string | null; title?: string | null; fid?: string; sid?: string; section?: string; fields?: { type: string; label?: FeLabel }[]; types?: string[]; opts?: string[]; on?: boolean; [k: string]: unknown };
/** A drag payload (feDragInit, L13253). */
export type FeDragP = { kind: string; type?: string; sid?: string; fid?: string; bid?: string; from?: Element | null; ghost?: string; click?: () => void; [k: string]: unknown };
/** feFind (L12512): the field, its container (section or group), its section, page and position. */
export type FeFind = { f: FeField; s: FeSection | FeField; sec: FeSection; p: FePage; pi: number; i: number; depth: number };
export type FeFindSec = { s: FeSection; p: FePage; pi: number; i: number };

/* ---------- shell glue ---------- */
/** LANGS (L7470) and I18N (L7480): plain objects keyed by language code in the source. */
const LANGS = LANGS0 as Record<string, { name: string; locale: string; [k: string]: unknown }>;
const I18N = I18N0 as Record<string, Dict>;
/** lang (the OS language global). */
const lang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
/** t (L7507): the shell's dictionary with {x} substitution. */
const t = (k: string, vars: Record<string, string | number> = {}) => translate(lang(), k, vars);
/** nf, loc (L7508–L7509), fmtT, fmtD (L9968–L9969). */
const loc = () => LANGS0[lang()].locale;
const nf = (n: number) => formatNumber(lang(), n);
const fmtT = (ms: number | Date) => new Intl.DateTimeFormat(loc(), { hour: "2-digit", minute: "2-digit" }).format(ms);
const fmtD = (ms: number | Date) => new Intl.DateTimeFormat(loc(), { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(ms);
/** DKE (L11239). */
const DKE = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Dict)[c]);
/** ACCOUNTS (L10211): the demo accounts; the first is the signed-in user. */
const ACCOUNTS = BASE_ACCOUNTS;
const DK_APPS = registry.DK_APPS as unknown as Record<string, [string, string]>;
const toast = (m: string) => useShell.getState().showToast(m);
/**
 * osMenu (L11650). The source builds the menu synchronously and one override (feSecMenu, L13898) adds a row to it
 * straight after opening it; the React menu is opened inside flushSync so it exists by then, as in the source.
 * osMenus[0] (L11682) is the open top-level menu.
 */
const osMenu = (x: number, y: number, items: (MenuItem | string | null)[]) => flushSync(() => osMenuCore(x, y, items as MenuItem[]));
const osMenus = Object.defineProperty({} as { readonly 0: HTMLElement | null }, 0, { get: () => document.querySelector<HTMLElement>('.os-menu[data-level="0"]') });
/** OSW.forms.el (the window) — found by its key. */
const feWinEl = () => document.querySelector<HTMLElement>('.os-win[data-osw="forms"]');
const tgt = (e: Event) => e.target as HTMLInputElement;
/**
 * The source's module-level document listeners (keyboard shortcuts, the section menu's "save as block" row). They are
 * registered the first time the Forms window mounts (feInstallGlobal), after the OS menu's outside-click listener the
 * source also adds first; the handlers only act inside the Forms window or its menus.
 */
const pendingGlobal: (() => void)[] = [];
const onDoc = <K extends keyof DocumentEventMap>(ev: K, fn: (e: DocumentEventMap[K]) => void, cap?: boolean) => { pendingGlobal.push(() => document.addEventListener(ev, fn, cap)); };
let globalDone = false;
export function feInstallGlobal() { if (globalDone) return; globalDone = true; pendingGlobal.forEach((f) => f()); }

/* ======================================================================================================== */
/* ===================== Formulaires & Enquêtes (forms app) ===================== */
const FEI: Record<string, string>=(()=>{const s=(p: string,w=16)=>`<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;return{
  text:s('<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'),
  textarea:s('<path d="M4 6h16M4 10h16M4 14h16M4 18h10"/>'),
  email:s('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>'),
  phone:s('<path d="M5 4h3.5l2 5-2.4 1.5a11 11 0 0 0 5.4 5.4L15 13.5l5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  select:s('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none"/>'),
  multi:s('<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="m8.2 12.2 2.6 2.6 5-5.6"/>'),
  date:s('<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  number:s('<path d="M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h15.5M4 15h15.5"/>'),
  file:s('<path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.3-8.3a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6"/>'),
  patient:s('<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.2 3.8-6.5 7.5-6.5s6.8 2.3 7.5 6.5"/>'),
  history:s('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4M12 7.5V12l3 2"/>'),
  allergy:s('<path d="M12 3.5s6 6.3 6 10.7a6 6 0 0 1-12 0C6 9.8 12 3.5 12 3.5z"/><path d="M9.5 15.5h5"/>'),
  meds:s('<rect x="2.6" y="8.8" width="18.8" height="6.4" rx="3.2" transform="rotate(-45 12 12)"/><path d="m8.6 8.6 6.8 6.8"/>'),
  vitals:s('<path d="M3 12h4l2.2-5.5 4.3 11 2.2-5.5H21"/>'),
  clinical:s('<path d="M9 3.2h6v3H9z"/><path d="M8.5 4.7H6.2A1.5 1.5 0 0 0 4.7 6.2v13.6a1.5 1.5 0 0 0 1.5 1.5h11.6a1.5 1.5 0 0 0 1.5-1.5V6.2a1.5 1.5 0 0 0-1.5-1.5h-2.3M8.8 13.5l2.2 2.2 4.2-4.4"/>'),
  sat:s('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.3a4.6 4.6 0 0 0 7 0M9 9.6h.01M15 9.6h.01"/>'),
  nps:s('<path d="M4.5 19v-6M9.5 19V9M14.5 19v-4M19.5 19V5"/>'),
  rank:s('<path d="M10.5 6.5H20M10.5 12H20M10.5 17.5H20M4 5l1.6-1v4.5M3.8 13.3c.4-1 2.8-1 2.6.6-.2 1-2.6 2.1-2.6 2.6h2.7"/>'),
  matrix:s('<rect x="3.5" y="3.5" width="17" height="17" rx="2.2"/><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17"/>'),
  sign:s('<path d="M3 16.5c2.8-.8 3.8-6.8 6-6.8 1.8 0 .2 6 2.2 6 1.7 0 2.4-2.8 3.8-2.8 1.2 0 1 1.9 2.2 1.9 1 0 1.8-.8 3.8-.8M3 20.5h18"/>'),
  calc:s('<rect x="5" y="3" width="14" height="18" rx="2.2"/><path d="M8.2 7h7.6M8.6 11h.01M12 11h.01M15.4 11h.01M8.6 14.5h.01M12 14.5h.01M15.4 14.5h.01M8.6 18h.01M12 18h3.4"/>'),
  hidden:s('<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15.6 15.6 0 0 1-3 3.4M6.6 7.6A15.6 15.6 0 0 0 3 12s4 6 9 6a9 9 0 0 0 4.4-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  overview:s('<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>'),
  all:s('<path d="M8 3.5h6.5L19 8v11.5H8z"/><path d="M14.5 3.5V8H19M5 7v14h10.5"/>'),
  mine:s('<path d="M6 3.5h8L18.5 8v12.5H6z"/><path d="M14 3.5V8h4.5"/><circle cx="12.2" cy="12.6" r="2.2"/><path d="M8.8 18.4c.5-1.7 1.8-2.6 3.4-2.6s2.9.9 3.4 2.6"/>'),
  shared:s('<circle cx="9" cy="8.2" r="3.4"/><path d="M2.8 20c.5-3.9 3.1-5.9 6.2-5.9s5.7 2 6.2 5.9"/><circle cx="17.2" cy="9.2" r="2.6"/><path d="M16.4 14.3c2.9-.1 4.6 1.8 4.9 4.8"/>'),
  templates:s('<rect x="3.5" y="3.5" width="17" height="17" rx="2.2"/><path d="M3.5 9h17M9.5 9v11.5"/>'),
  library:s('<path d="m12 3.5 8.5 4.7L12 13 3.5 8.2z"/><path d="m3.5 12.4 8.5 4.8 8.5-4.8M3.5 16.4l8.5 4.8 8.5-4.8"/>'),
  surveys:s('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12.3h5"/>'),
  patients:s('<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 3h6v3H9zM12 10.5v6M9 13.5h6"/>'),
  subs:s('<path d="M3.5 13.5h5l1.5 3h4l1.5-3h5"/><path d="M5.5 13.5 7.5 5h9l2 8.5V19h-13z"/>'),
  analytics:s('<path d="M4.5 19.5v-8M10 19.5V5M15.5 19.5v-5.5M21 19.5H3"/>'),
  auto:s('<path d="M13 2.5 4.5 14H11l-1 7.5L18.5 10H12z"/>'),
  archive:s('<rect x="3" y="4" width="18" height="5" rx="1.3"/><path d="M5 9v10.5h14V9M10 13h4"/>'),
  trash:s('<path d="M4 7h16M10 11v6M14 11v6M5.6 7l1 13h10.8l1-13M9 7V4h6v3"/>'),
  settings:s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  plus:s('<path d="M12 5v14M5 12h14"/>'),
  search:s('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  refresh:s('<path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/>'),
  eye:s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  more:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  desktop:s('<rect x="3" y="4" width="18" height="12" rx="1.8"/><path d="M8.5 20h7M12 16v4"/>'),
  tablet:s('<rect x="5" y="3" width="14" height="18" rx="2.2"/><path d="M11 18h2"/>'),
  mobile:s('<rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M11 18h2"/>'),
  zin:s('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8.5 11h5M11 8.5v5"/>'),
  zout:s('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8.5 11h5"/>'),
  undo:s('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo:s('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  copy:s('<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>'),
  grip:'<svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><circle cx="3.5" cy="3" r="1.4"/><circle cx="8.5" cy="3" r="1.4"/><circle cx="3.5" cy="8" r="1.4"/><circle cx="8.5" cy="8" r="1.4"/><circle cx="3.5" cy="13" r="1.4"/><circle cx="8.5" cy="13" r="1.4"/></svg>',
  del:s('<path d="M4 7h16M10 11v6M14 11v6M5.6 7l1 13h10.8l1-13M9 7V4h6v3"/>'),
  chev:s('<path d="m6 9 6 6 6-6"/>'),
  chevR:s('<path d="m9 6 6 6-6 6"/>'),
  back:s('<path d="M15 6l-6 6 6 6"/>'),
  spark:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 2.5c.6 4.3 2.8 6.5 7.1 7.1-4.3.6-6.5 2.8-7.1 7.1-.6-4.3-2.8-6.5-7.1-7.1 4.3-.6 6.5-2.8 7.1-7.1z"/><path d="M18.4 13.4c.3 2.1 1.3 3.1 3.4 3.4-2.1.3-3.1 1.3-3.4 3.4-.3-2.1-1.3-3.1-3.4-3.4 2.1-.3 3.1-1.3 3.4-3.4z" opacity=".75"/></svg>',
  check:s('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  x:s('<path d="M6 6l12 12M18 6 6 18"/>'),
  link:s('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>'),
  globe:s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>'),
  upload:s('<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>'),
  lock:s('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  menu:s('<path d="M4 6.5h16M4 12h16M4 17.5h16"/>'),
  sliders:s('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  layers:s('<path d="m12 3.5 8.5 4.7L12 13 3.5 8.2z"/><path d="m3.5 12.4 8.5 4.8 8.5-4.8"/>'),
  branch:s('<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="8.5" r="2"/><path d="M6 7.5v9M18 10.5c0 4-6 3-11 6.5"/>'),
  asterisk:s('<path d="M12 4v16M5 8l14 8M19 8 5 16"/>'),
  clock:s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  mail:s('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>'),
  bell:s('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>'),
  card:s('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>'),
  folder:s('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  code:s('<path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5l-3 14"/>'),
  play:s('<path d="M7 5v14l11-7z"/>'),
  star:s('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>'),
  group:s('<rect x="3" y="3.5" width="18" height="17" rx="2.6"/><rect x="7" y="8" width="10" height="8.5" rx="1.6"/>'),
  yesno:s('<rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="16" cy="12" r="3.2" fill="currentColor" stroke="none"/>'),
  slider:s('<path d="M3 12h6M15 12h6"/><circle cx="12" cy="12" r="3"/><path d="M5 8v8M19 8v8"/>'),
  table:s('<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M3 9.5h18M3 14.8h18M9.5 9.5V20"/>'),
  chart:s('<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z"/><path d="M15 3.8a8.5 8.5 0 0 1 5.2 5.2H15z"/>'),
  info:s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6h.01"/>'),
  divider:s('<path d="M3 12h18M8 6.5h8M8 17.5h8"/>'),
  warn:s('<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 16.8h.01"/>'),
  qmark:s('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.6h.01"/>'),
  image:s('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m3.5 17 5-4 4 3 3-2 5 4"/>')
}})();
const FE_T: Record<string, [string, string]>={text:["text","fe_cText"],textarea:["textarea","fe_cLong"],email:["email","fe_cEmail"],phone:["phone","fe_cPhone"],select:["select","fe_cSingle"],multi:["multi","fe_cMulti"],date:["date","fe_cDate"],number:["number","fe_cNumber"],file:["file","fe_cFile"],patient:["patient","fe_cPatient"],history:["history","fe_cHist"],allergy:["allergy","fe_cAll"],meds:["meds","fe_cMeds"],vitals:["vitals","fe_cVit"],clinical:["clinical","fe_cClin"],sat:["sat","fe_cSat"],nps:["nps","fe_cNps"],rank:["rank","fe_cRank"],matrix:["matrix","fe_cMatrix"],sign:["sign","fe_cSign"],calc:["calc","fe_cCalc"],hidden:["hidden","fe_cHidden"],group:["group","fe_cGroup"],yesno:["yesno","fe_cYesNo"],rating:["star","fe_cRating"],slider:["slider","fe_cSlider"],table:["table","fe_cTable"],chart:["chart","fe_cChart"],info:["info","fe_cInfo"],divider:["divider","fe_cDivider"]};
const FE_G: [string, string, string[]][]=[["base","fe_gBase",["text","textarea","email","phone","select","multi","yesno","date","number","slider","file"]],["health","fe_gHealth",["patient","history","allergy","meds","vitals","clinical"]],["survey","fe_gSurvey",["sat","rating","nps","rank","matrix"]],["data","fe_gData",["table","chart"]],["layout","fe_gLayout",["info","divider"]],["adv","fe_gAdv",["group","sign","calc","hidden"]]];
const FE_WIDE=new Set(["table","chart","info","divider","group","textarea","file","patient","history","allergy","meds","vitals","clinical","sat","nps","rank","matrix","sign"]);
const FE_TXT=new Set(["text","textarea","email","phone"]);
const FE_STATIC=new Set(["chart","info","divider"]);
const FE_NUM=new Set(["number","rating","slider","clinical","nps","sat"]);
let feSeq=Date.now()%1e7;const feId=()=>"x"+(feSeq++).toString(36);
const feSlug=(s: unknown)=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,32)||"champ";
const feTx=(k: string,L: string,vars?: Record<string, string>)=>{const d=I18N[L]||I18N.fr;let s=d[k]??I18N.en[k]??I18N.fr[k]??k;if(vars)for(const v in vars)s=s.split("{"+v+"}").join(vars[v]);return s};
const feCL=()=>feDoc()?.lang||lang();
const fv=(v: unknown,L?: string): string=>{if(v&&typeof v==="object"){const l=L||feCL();return (v as Dict)[l]||(v as Dict).fr||(v as Dict).en||Object.values(v as Dict).find(Boolean)||""}return typeof v==="string"&&v.startsWith("fe_")&&I18N.fr[v]!==undefined?feTx(v,L||feCL()):(v??"") as string};
const FEE=(s: unknown)=>DKE(s);
const FE_COLS=["#5A64E0","#7C8CFF","#8A4BDC","#C04BD8","#E2457A","#E2453C","#F07A12","#E8B400","#10B981","#0EA5A4","#1F6FE0","#475569"];
const FE: FeApp={view:"editor",tab:"editor",dev:"desktop",zoom:100,sel:null,ptab:"field",page:0,undo:[],redo:[],comp:"all",q:"",pv:{dev:"desktop",step:0,vals:{},err:{},test:false,done:false},drag:null,ask:false};

/* ---------- seed data (sample) ---------- */
function feField(type: string,label: unknown,o: Bag={}): FeField{return {id:feId(),type,label,key:"",req:false,ro:false,hid:false,w:FE_WIDE.has(type)?2:1,...o} as FeField}
function feSeedMain(trim?: boolean){
  const F=feField;
  const p1=[
    {id:feId(),title:"fe_sPerso",cols:2,fields:[
      F("text","fe_fNom",{key:"nom",ph:"fe_phNom",desc:"fe_dNom",req:true,min:2,max:50,src:"patient"}),
      F("text","fe_fPrenom",{key:"prenom",ph:"fe_phPrenom",req:true,min:2,max:50,src:"patient"}),
      F("date","fe_fDob",{key:"date_naissance",ph:"fe_phDob",req:true}),
      F("select","fe_fSexe",{key:"sexe",disp:"radio",opts:["fe_oF","fe_oM","fe_oO"],req:true}),
      F("phone","fe_fTel",{key:"telephone",ph:"fe_phTel",req:true}),
      F("email","fe_fMail",{key:"email",ph:"fe_phMail"})]},
    {id:feId(),title:"fe_sAddr",cols:3,fields:[
      F("text","fe_fAddr",{key:"adresse",ph:"fe_phAddr",w:2}),
      F("text","fe_fCp",{key:"code_postal",ph:"fe_phCp",max:10}),
      F("text","fe_fVille",{key:"ville",ph:"fe_phVille"}),
      F("select","fe_fPays",{key:"pays",disp:"list",opts:["fe_oFR","fe_oBE","fe_oCH","fe_oDE","fe_oMA"],def:0})]},
    {id:feId(),title:"fe_sMore",cols:3,fields:[
      F("select","fe_fSit",{key:"situation_familiale",disp:"list",opts:["fe_oS1","fe_oS2","fe_oS3","fe_oS4","fe_oS5"]}),
      F("select","fe_fLang",{key:"langue_preferee",disp:"list",opts:["Français","English","Deutsch","العربية"]}),
      F("select","fe_fSrc",{key:"connu_par",disp:"list",opts:["fe_oK1","fe_oK2","fe_oK3","fe_oK4"]}),feSeedGroup()]}];
  if(trim)p1.pop();
  return {title:"fe_dTitle",sub:"fe_dSub",status:"draft",cat:"patients",lang:null,pages:[
    {id:feId(),title:"fe_pg1",sections:p1},
    {id:feId(),title:"fe_pg2",sections:[
      {id:feId(),title:"fe_sHist",cols:2,fields:[F("history","fe_fHist",{key:"antecedents",opts:["fe_oH1","fe_oH2","fe_oH3","fe_oH4","fe_oH5"]}),F("allergy","fe_fAll",{key:"allergies",ph:"fe_phAll"}),F("yesno","fe_fSurg",{key:"deja_opere",opts:["fe_yes","fe_no","fe_maybe"],maybe:true}),F("meds","fe_fMeds",{key:"traitements"})]},
      {id:feId(),title:"fe_sVit",cols:2,fields:[F("vitals","fe_fVit",{key:"signes_vitaux"}),F("clinical","fe_fEva",{key:"douleur_eva"}),...feSeedPain()]}]},
    {id:feId(),title:"fe_pg3",sections:[
      {id:feId(),title:"fe_sIns",cols:2,fields:[F("text","fe_fOrg",{key:"organisme",ph:"fe_phOrg"}),F("text","fe_fNum",{key:"numero_adherent",ph:"fe_phNum"}),F("file","fe_fCard",{key:"carte_assurance"})]},
      {id:feId(),title:"fe_sCons",cols:1,fields:[F("multi","fe_fConsent",{key:"consentements",opts:["fe_oC1","fe_oC2"],req:true}),F("sign","fe_fSign",{key:"signature",req:true})]}]}],
    set:{msg:"fe_confirmDef",login:false,accept:true,notif:true},share:{access:"any",invites:[],expire:false,until:""},
    auto:{a1:true,a2:true,a3:false,a4:false,a5:true},everPub:false};
}
let feMakeDoc=function(kind: string,title?: FeLabel): FeDocT{
  const F=feField,sec=(t2: string,fields: FeField[],cols=2)=>({id:feId(),title:t2,cols,fields});
  let pages;
  if(kind==="survey")pages=[{id:feId(),title:"fe_pgS",sections:[sec("fe_sExp",[F("sat","fe_fSat",{key:"satisfaction",req:true}),F("nps","fe_fNps",{key:"nps",req:true}),F("matrix","fe_fMatrix",{key:"evaluation",rows:["fe_mxR1","fe_mxR2","fe_mxR3"],cols:["fe_mxC1","fe_mxC2","fe_mxC3","fe_mxC4"]}),F("textarea","fe_fComments",{key:"commentaires",ph:"fe_phComments"})],1)]}];
  else if(kind==="clinical")pages=[{id:feId(),title:"fe_pgC",sections:[sec("fe_sPat",[F("patient","fe_cPatient",{key:"patient",req:true})],1),sec("fe_sEval",[F("clinical","fe_fEva",{key:"douleur_eva",req:true}),F("vitals","fe_fVit",{key:"signes_vitaux"}),F("textarea","fe_fObs",{key:"observations"})],1)]}];
  else if(kind==="consent")pages=[{id:feId(),title:"fe_pgCo",sections:[sec("fe_sPat",[F("patient","fe_cPatient",{key:"patient",req:true})],1),sec("fe_sCons",[F("multi","fe_fConsent",{key:"consentements",opts:["fe_oC1","fe_oC2"],req:true}),F("sign","fe_fSign",{key:"signature",req:true})],1)]}];
  else if(kind==="booking")pages=[{id:feId(),title:"fe_pgB",sections:[sec("fe_sPerso",[F("text","fe_fNom",{key:"nom",req:true}),F("text","fe_fPrenom",{key:"prenom",req:true}),F("phone","fe_fTel",{key:"telephone",ph:"fe_phTel"}),F("email","fe_fMail",{key:"email",ph:"fe_phMail"}),F("date","fe_fWhen",{key:"date_souhaitee",req:true}),F("textarea","fe_fReason",{key:"motif"})])]}];
  else if(kind==="patients")return Object.assign(feSeedMain(),{title:title||"fe_dTitle",everPub:true,status:"pub"});
  else pages=[{id:feId(),title:"fe_pg1",sections:[sec("fe_newSec",[F("text","fe_untitledQ",{key:"question_1"})])]}];
  return {title:title||"fe_untitled",sub:kind==="blank"?"":"fe_dSubGen",status:"draft",cat:kind==="survey"?"surveys":kind==="clinical"?"clinical":"patients",lang:null,pages,set:{msg:"fe_confirmDef",login:false,accept:true,notif:true},share:{access:"any",invites:[],expire:false,until:""},auto:{a1:true,a2:false,a3:false,a4:false,a5:false},everPub:false};
}
const FE_TPL=[["t1","patients","fe_tp1","fe_tpd1"],["t2","survey","fe_tp2","fe_tpd2"],["t3","consent","fe_tp3","fe_tpd3"],["t4","clinical","fe_tp4","fe_tpd4"],["t5","survey","fe_tp5","fe_tpd5"],["t6","booking","fe_tp6","fe_tpd6"]];
function feFresh(){
  const now=Date.now(),day=864e5,main=feSeedMain();
  const forms=[
    {id:"f1",cat:"patients",kind:"patients",status:"draft",resp:0,upd:now-12e4,owner:"me"},
    {id:"f2",name:"fe_n2",cat:"surveys",kind:"survey",status:"pub",resp:128,upd:now-day,owner:"me"},
    {id:"f3",name:"fe_n3",cat:"clinical",kind:"clinical",status:"pub",resp:64,upd:now-2*day,owner:"me"},
    {id:"f4",name:"fe_n4",cat:"patients",kind:"consent",status:"pub",resp:212,upd:now-3*day,owner:"me"},
    {id:"f5",name:"fe_n5",cat:"clinical",kind:"clinical",status:"pub",resp:37,upd:now-4*day,owner:"lau"},
    {id:"f6",name:"fe_n6",cat:"surveys",kind:"survey",status:"draft",resp:0,upd:now-5*day,owner:"me"},
    {id:"f7",name:"fe_n7",cat:"patients",kind:"patients",status:"pub",resp:18,upd:now-20*day,owner:"me",arch:true},
    {id:"f8",name:"fe_n8",cat:"clinical",kind:"clinical",status:"pub",resp:51,upd:now-6*day,owner:"ben"}];
  const nm=["Camille Martin","Lucas Bernard","Inès Haddad","Jonas Weber","Sofia Rossi","Hugo Lefèvre","Amira Benali","Léa Fontaine"];
  const subs=nm.map((n,i)=>({id:"s"+i,who:n,form:["f4","f2","f3","f4","f2","f5","f4","f3"][i],at:now-(i*7+2)*36e5,st:i<3?"new":"done"}));
  return {v:1,cur:"f1",docs:{f1:main},forms,subs,ver:{f1:[{n:1,at:now-2*day,by:"me",snap:JSON.stringify(feSeedMain(true))},{n:2,at:now-day,by:"me",snap:JSON.stringify(main)}]},
    pv:{theme:"clinic",color:"#5A64E0",logo:"leaf",hdr:"mount",org:true,lang:null,prog:true,nums:true,later:true,reqm:true,ro:false,fill:false,logic:false},
    set:{autosave:true,ai:true,enc:true,mail:true},saved:now-12e4,g1:1,g2:1};
}
let feS: FeState | null=null;
let feLoad=function(){
  if(feS)return;
  try{const s=JSON.parse(localStorage.getItem("remotion-forms")||"null");if(s&&s.v===1&&s.docs&&Array.isArray(s.forms))feS=s}catch(e){}
  if(!feS)feS=feFresh();
  feS.pv=Object.assign(feFresh().pv,feS.pv||{});
  if(!feS.g2){const d=feS.docs.f1;if(d){let has=false;feWalk2(d,x=>{if(x.type==="table")has=true});const sec=d.pages?.[1]?.sections?.find(s=>s.title==="fe_sVit");if(sec&&!has)sec.fields.push(...feSeedPain());const h=d.pages?.[1]?.sections?.find(s=>s.title==="fe_sHist");if(h&&!h.fields.some(f=>f.type==="yesno"))h.fields.splice(2,0,feField("yesno","fe_fSurg",{key:"deja_opere",opts:["fe_yes","fe_no","fe_maybe"],maybe:true}))}feS.g2=1}
  if(!feS.g1){const d=feS.docs.f1,sec=d?.pages?.[0]?.sections?.find(s=>s.title==="fe_sMore");if(sec&&!sec.fields.some(f=>f.type==="group"))sec.fields.push(feSeedGroup());feS.g1=1}
  if(!feS.pv.cv){if(String(feS.pv.color).toUpperCase()==="#10B981")feS.pv.color="#5A64E0";feS.pv.cv=1}
}
function feSave(){
  try{localStorage.setItem("remotion-forms",JSON.stringify(feS))}catch(e){
    /* storage full: drop uploaded images, keep the rest */
    if(feS!.pv.logoData||feS!.pv.hdrData){FE.mem={logoData:feS!.pv.logoData,hdrData:feS!.pv.hdrData};delete feS!.pv.logoData;delete feS!.pv.hdrData;try{localStorage.setItem("remotion-forms",JSON.stringify(feS))}catch(e2){}Object.assign(feS!.pv,FE.mem)}
  }
}
const feDoc=()=>{if(!feS)return null;let d=feS.docs[feS.cur];if(!d){const e=feEntry(feS.cur);d=feS.docs[feS.cur]=feMakeDoc(e?.kind||"blank",e?.name);if(e&&e.status==="pub"){d.status="pub";d.everPub=true}}return d};
const feEntry=(id: string)=>feS!.forms.find(f=>f.id===id);
const feName=(e: FeEntryT)=>{const d=feS!.docs[e.id];return fv(d?d.title:e.name||"fe_untitled",lang())};
const fePage=()=>{const d=feDoc();FE.page=Math.max(0,Math.min(FE.page,d!.pages.length-1));return d!.pages[FE.page]};
const FE_SP=[12,15,20,30,40,45,60],FE_FR: Record<number, string>={12:"1/5",15:"1/4",20:"1/3",30:"1/2",40:"2/3",45:"3/4",60:"1"};
const feDK=(d: string)=>({desktop:"d",tablet:"t",mobile:"m"})[d]||"d";
function feAutoSp(f: FeSpF,cols: number | undefined,k: string){if(k==="m"||f.type==="group"||f.w===2)return 60;let c=cols||2;if(k==="t")c=Math.min(c,2);return 60/c}
function feSp(f: FeSpF,cols: number | undefined,k: string){return f.sp?.[k]||feAutoSp(f,cols,k)}
function feSpVars(f: FeSpF,cols: number | undefined){return `--sd:${feSp(f,cols,"d")};--st:${feSp(f,cols,"t")};--sm:${feSp(f,cols,"m")}`}
function feWalk2(d: FeDocT,fn: WalkFn){for(const p of d.pages||[])for(const s of p.sections||[])feWalk(s.fields,fn,s,s)}
function feWalk(list: FeField[],fn: WalkFn,box?: FeSection | FeField,sec?: FeSection | FeField,depth=0){for(let i=0;i<list.length;i++){const f=list[i];if(fn(f,box!,i,depth,sec as FeSection)===false)return false;if(f.type==="group"&&Array.isArray(f.fields)&&feWalk(f.fields,fn,f,sec,depth+1)===false)return false}}
function feEach(fn: (f: FeField, box: FeSection | FeField, p: FePage) => unknown){for(const p of feDoc()!.pages)for(const s of p.sections)if(feWalk(s.fields,(f,box)=>fn(f,box,p),s,s)===false)return}
function feFind(fid: string | null | undefined): FeFind | null{let r: FeFind | null=null;const d=feDoc();for(let pi=0;pi<d!.pages.length&&!r;pi++){const p=d!.pages[pi];for(const s of p.sections){feWalk(s.fields,(f,box,i,depth)=>{if(f.id===fid){r={f,s:box,sec:s,p,pi,i,depth};return false}},s,s);if(r)break}}return r}
function feFindBox(id: string): FeSection | FeField | null{const r=feFindSec(id);if(r)return r.s;const g=feFind(id);return g&&g.f.type==="group"?g.f:null}
function feReId(f: FeField){f.id=feId();if(f.key)f.key=feUniqKey(f.key+"_2",f);(f.fields||[]).forEach(feReId)}
let feVisLeaves=function(list: FeField[],vals: Bag): FeField[]{const r=[];for(const f of list){if(f.type==="group"){if(feVis(f,vals))r.push(...feVisLeaves(f.fields||[],vals))}else if(feVis(f,vals))r.push(f)}return r}
function feSeedPain(){const F=feField;const tb=F("table","fe_tPain",{key:"suivi_douleur",tcols:[{l:"fe_tDate",ty:"date"},{l:"fe_tLevel",ty:"number"},{l:"fe_tNote",ty:"text"}],rows:3,addRows:true,desc:"fe_tPainD"});return [F("info","fe_infoPainT",{key:"info_douleur",desc:"fe_infoPainD",tone:"info"}),tb,F("chart","fe_chPain",{key:"graph_douleur",ctype:"line",csrc:"tbl:"+tb.id,cx:0,cy:1,cvals:true})]}
function feSeedGroup(){const F=feField;return F("group","fe_gEmergency",{key:"personne_a_prevenir",cols:2,fields:[F("text","fe_fNom",{key:"contact_nom",ph:"fe_phNom"}),F("select","fe_fRel",{key:"contact_lien",disp:"list",opts:["fe_oRel1","fe_oRel2","fe_oRel3","fe_oRel4"]}),F("phone","fe_fTel",{key:"contact_telephone",ph:"fe_phTel"}),F("group","fe_gDoctor",{key:"medecin_traitant",cols:2,fields:[F("text","fe_fDocName",{key:"medecin_nom",ph:"fe_phDoc"}),F("text","fe_fVille",{key:"medecin_ville",ph:"fe_phVille"})]})]})}
function feFindSec(sid: string | null | undefined): FeFindSec | null{let r: FeFindSec | null=null;feDoc()!.pages.forEach((p,pi)=>{const i=p.sections.findIndex(s=>s.id===sid);if(i>=0)r={s:p.sections[i],p,pi,i}});return r}
function feUniqKey(base: string,self?: FeField){const used=new Set();feEach(f=>{if(f!==self)used.add(f.key)});let k=feSlug(base),n=2;const b=k;while(used.has(k))k=b+"_"+n++;return k}
let feNewField=function(type: string,label?: FeLabel){
  const f=feField(type,label||t(FE_T[type][1]));
  if(type==="select"){f.opts=[1,2,3].map(n=>t("fe_opt",{n}));f.disp="list"}
  if(type==="multi"||type==="rank")f.opts=[1,2,3].map(n=>t("fe_opt",{n}));
  if(type==="history")f.opts=["fe_oH1","fe_oH2","fe_oH3","fe_oH4","fe_oH5"];
  if(type==="matrix"){(f as Bag).rows=["fe_mxR1","fe_mxR2","fe_mxR3"];(f as Bag).cols=["fe_mxC1","fe_mxC2","fe_mxC3","fe_mxC4"]}
  if(type==="group"){f.fields=[];(f as Bag).cols=2;f.w=2}
  if(type==="yesno"){f.opts=["fe_yes","fe_no"];f.maybe=false}
  if(type==="rating")f.stars=5;
  if(type==="slider"){f.min=0;f.max=100;f.step=1;f.unit=""}
  if(type==="table"){f.tcols=[{l:t("fe_tCol",{n:1}),ty:"text"},{l:t("fe_tCol",{n:2}),ty:"number"}];(f as Bag).rows=3;f.addRows=true}
  if(type==="chart"){let tb=null as FeField | null;feEach(x=>{if(!tb&&x.type==="table")tb=x});f.ctype="bar";f.csrc=tb?"tbl:"+tb.id:"fields";f.cx=0;f.cy=1;f.cvals=true}
  if(type==="info"){f.desc=t("fe_infoDef");f.tone="info"}
  if(type==="divider")f.label="";
  if(type==="text")f.max=120;
  if(type==="email")f.ph="fe_phMail";if(type==="phone")f.ph="fe_phTel";if(type==="date")f.ph="fe_phDob";if(type==="allergy")f.ph="fe_phAll";
  f.key=feUniqKey(fv(f.label,"fr"),f);
  return f;
}
/* ---------- field controls (editor mock + live preview) ---------- */
function feOpts(f: FeField,L: string){return (f.opts||[]).map(o=>fv(o,L))}
let feCtl=function(f: FeField,L: string,P: FeP | null){
  const ph=fv(f.ph,L),live=!!P,v=live?P.vals[f.id] as FeAnsR:undefined,dis=live&&(P.ro||f.ro)?" disabled":"",id=live?`${P.uid}-${f.id}`:"",k=`data-k="${f.id}"`;
  const PH=ph?`<span class="ph">${FEE(ph)}</span>`:"";
  const inp=(type: string,extra="")=>live?`<input class="fe-in" id="${id}" type="${type}" ${k} value="${FEE(v??"")}" placeholder="${FEE(ph)}"${dis}${extra} dir="auto">`:`<div class="fe-in">${PH}${type==="date"?`<span class="end">${FEI.date}</span>`:type==="number"?`<span class="end">${FEI.chev}</span>`:""}</div>`;
  const tx=(s: unknown)=>FEE(s);
  switch(f.type){
    case "text":return inp("text",f.max?` maxlength="${f.max}"`:"");
    case "email":return inp("email");
    case "number":return inp("number",(f.min!=null?` min="${f.min}"`:"")+(f.max!=null?` max="${f.max}"`:""));
    case "date":return inp("date");
    case "phone":return `<div class="fe-tel"><span class="fe-cc"><i class="fe-flag" aria-hidden="true"></i>+33${FEI.chev}</span>${live?`<input class="fe-in" id="${id}" type="tel" ${k} value="${FEE(v??"")}" placeholder="${FEE(ph)}"${dis}>`:`<div class="fe-in">${PH}</div>`}</div>`;
    case "textarea":case "allergy":return live?`<textarea class="fe-in ta" id="${id}" ${k} rows="3" placeholder="${FEE(ph)}"${dis} dir="auto">${FEE(v??"")}</textarea>`:`<div class="fe-in ta">${PH}</div>`;
    case "select":{const O=feOpts(f,L);
      if(f.disp==="radio")return `<div class="fe-radios" role="radiogroup">${O.map((o,i)=>live?`<label class="fe-rd"><input type="radio" name="${id}" ${k} value="${i}" ${String(v)===String(i)?"checked":""}${dis}><i></i><span>${tx(o)}</span></label>`:`<span class="fe-rd"><i></i><span>${tx(o)}</span></span>`).join("")}</div>`;
      const cur=v!=null&&v!==""?+v:f.def;
      return live?`<div class="fe-selw"><select class="fe-in" id="${id}" ${k}${dis}><option value="">${tx(feTx("fe_phSel",L))}</option>${O.map((o,i)=>`<option value="${i}" ${cur===i?"selected":""}>${tx(o)}</option>`).join("")}</select>${FEI.chev}</div>`:`<div class="fe-in">${f.def!=null&&O[f.def as number]?`<span>${tx(O[f.def as number])}</span>`:`<span class="ph">${tx(feTx("fe_phSel",L))}</span>`}<span class="end">${FEI.chev}</span></div>`}
    case "multi":case "history":{const O=feOpts(f,L),arr=(Array.isArray(v)?v:[]) as string[];
      return `<div class="fe-checks${f.type==="history"?" chips":""}">${O.map((o,i)=>live?`<label class="fe-ck"><input type="checkbox" ${k} value="${i}" ${arr.includes(String(i))?"checked":""}${dis}><i>${FEI.check}</i><span>${tx(o)}</span></label>`:`<span class="fe-ck"><i></i><span>${tx(o)}</span></span>`).join("")}</div>`}
    case "file":return live?`<label class="fe-drop${v?" has":""}">${FEI.upload}<span>${v?tx(feTx("fe_fileSel",L,{x:v})):tx(feTx("fe_fileDrop",L))}</span><input type="file" ${k} hidden${dis}></label>`:`<div class="fe-drop">${FEI.upload}<span>${tx(feTx("fe_fileDrop",L))}</span></div>`;
    case "patient":{const o=(v&&typeof v==="object"?v:{}) as FeAnsO;return `<div class="fe-sub4">${[["n","fe_fNom"],["p","fe_fPrenom"],["d","fe_fDob","date"],["r","fe_fRec"]].map(([sk,lk,ty])=>`<label><span>${tx(feTx(lk,L))}</span>${live?`<input class="fe-in" type="${ty||"text"}" ${k} data-sk="${sk}" value="${FEE(o[sk]??"")}"${dis}>`:`<div class="fe-in">${ty==="date"?`<span class="end">${FEI.date}</span>`:""}</div>`}</label>`).join("")}</div>`}
    case "vitals":{const o=(v&&typeof v==="object"?v:{}) as FeAnsO;return `<div class="fe-sub4">${[["bp","fe_vBp","mmHg","120/80"],["hr","fe_vHr","bpm","72"],["w","fe_vW","kg","70"],["h","fe_vH","cm","170"]].map(([sk,lk,u,p])=>`<label><span>${tx(feTx(lk,L))}</span><div class="fe-unit">${live?`<input class="fe-in" type="text" inputmode="decimal" ${k} data-sk="${sk}" value="${FEE(o[sk]??"")}" placeholder="${p}"${dis}>`:`<div class="fe-in"><span class="ph">${p}</span></div>`}<em>${u}</em></div></label>`).join("")}</div>`}
    case "meds":{const rows=(Array.isArray(v)&&v.length?v:[{}]) as FeAnsO[];return `<div class="fe-meds"><div class="hd"><span>${tx(feTx("fe_mName",L))}</span><span>${tx(feTx("fe_mDose",L))}</span></div>${rows.map((r,i)=>`<div class="rw">${live?`<input class="fe-in" ${k} data-sk="${i}.n" value="${FEE(r.n??"")}" placeholder="${tx(feTx("fe_mPhN",L))}"${dis}><input class="fe-in" ${k} data-sk="${i}.d" value="${FEE(r.d??"")}" placeholder="${tx(feTx("fe_mPhD",L))}"${dis}>`:`<div class="fe-in"><span class="ph">${tx(feTx("fe_mPhN",L))}</span></div><div class="fe-in"><span class="ph">${tx(feTx("fe_mPhD",L))}</span></div>`}</div>`).join("")}<button type="button" class="fe-lnk" ${live?`data-medadd="${f.id}"`:'tabindex="-1"'}${dis}>${FEI.plus}${tx(feTx("fe_mAdd",L))}</button></div>`}
    case "clinical":return `<div class="fe-scale" role="radiogroup">${Array.from({length:11},(_,i)=>`<button type="button" class="${String(v)===String(i)?"on":""}" style="--h:${120-i*12}" ${live?`${k} data-pick="${i}"`:'tabindex="-1"'}${dis}>${nf(i)}</button>`).join("")}</div><div class="fe-sclb"><span>${tx(feTx("fe_evaL",L))}</span><span>${tx(feTx("fe_evaR",L))}</span></div>`;
    case "sat":return `<div class="fe-sat">${[0,1,2,3,4].map(i=>`<button type="button" class="${String(v)===String(i)?"on":""}" ${live?`${k} data-pick="${i}"`:'tabindex="-1"'} aria-label="${i+1}/5"${dis}>${feFace(i)}</button>`).join("")}</div>`;
    case "nps":return `<div class="fe-nps">${Array.from({length:11},(_,i)=>`<button type="button" class="${String(v)===String(i)?"on":""}" ${live?`${k} data-pick="${i}"`:'tabindex="-1"'}${dis}>${nf(i)}</button>`).join("")}</div><div class="fe-sclb"><span>${tx(feTx("fe_npsL",L))}</span><span>${tx(feTx("fe_npsR",L))}</span></div>`;
    case "rank":{const O=feOpts(f,L),ord=Array.isArray(v)&&v.length===O.length?v.map(Number):O.map((_,i)=>i);return `<ol class="fe-rank">${ord.map((oi,pos)=>`<li><span class="n">${nf(pos+1)}</span><span class="tx">${tx(O[oi])}</span>${live?`<button type="button" ${k} data-rk="${pos}" data-dir="-1" aria-label="↑" ${pos===0?"disabled":""}${dis}>${FEI.chev}</button><button type="button" ${k} data-rk="${pos}" data-dir="1" aria-label="↓" ${pos===O.length-1?"disabled":""}${dis}>${FEI.chev}</button>`:`<span class="g">${FEI.grip}</span>`}</li>`).join("")}</ol>`}
    case "matrix":{const R=(f.rows||[]).map(x=>fv(x,L)),C=(f.cols||[]).map(x=>fv(x,L)),o=(v&&typeof v==="object"?v:{}) as FeAnsO;return `<div class="fe-mxw"><table class="fe-mx"><thead><tr><th></th>${C.map(c=>`<th>${tx(c)}</th>`).join("")}</tr></thead><tbody>${R.map((r,ri)=>`<tr><th>${tx(r)}</th>${C.map((c,ci)=>`<td>${live?`<label class="fe-rd solo"><input type="radio" name="${id}-${ri}" ${k} data-sk="${ri}" value="${ci}" ${String(o[ri])===String(ci)?"checked":""} aria-label="${tx(r)} · ${tx(c)}"${dis}><i></i></label>`:`<span class="fe-rd solo"><i></i></span>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
    case "sign":return `<div class="fe-sign${v?" has":""}">${live?`<canvas ${k} data-sign width="600" height="150" aria-label="${tx(feTx("fe_signHint",L))}"></canvas><button type="button" class="fe-lnk" data-signclr="${f.id}">${tx(feTx("fe_signClear",L))}</button>`:""}<span class="hint">${FEI.sign}${tx(feTx("fe_signHint",L))}</span></div>`;
    case "calc":{let val="—";if(live){const vt=(Object.values(P.vals) as FeAnsO[]).find(x=>x&&typeof x==="object"&&x.w&&x.h);if(vt){const w=parseFloat(String(vt.w).replace(",",".")),h=parseFloat(String(vt.h).replace(",","."))/100;if(w>0&&h>0)val=nf(Math.round(w/(h*h)*10)/10)}}return `<div class="fe-in calc">${FEI.calc}<span>${live?val:tx(feTx("fe_calcF",L))}</span></div>`}
    case "yesno":{const O=feOpts(f,L),ic=[FEI.check,FEI.x,FEI.qmark];return `<div class="fe-yn" role="radiogroup">${O.map((o,i)=>live?`<label class="fe-ynb t${i}"><input type="radio" name="${id}" ${k} value="${i}" ${String(v)===String(i)?"checked":""}${dis}><span>${ic[i]||""}${tx(o)}</span></label>`:`<span class="fe-ynb t${i}"><span>${ic[i]||""}${tx(o)}</span></span>`).join("")}</div>`}
    case "rating":{const n=f.stars||5;return `<div class="fe-stars" role="radiogroup">${Array.from({length:n},(_,i)=>`<button type="button" class="${live&&+v!>=i+1?"on":""}" ${live?`${k} data-pick="${i+1}"`:'tabindex="-1"'} aria-label="${i+1}/${n}"${dis}>${FEI.star}</button>`).join("")}${live&&v?`<em>${nf(+v)}/${nf(n)}</em>`:""}</div>`}
    case "slider":{const mn=+(f.min??0),mx=+(f.max??100),cur=v!=null&&v!==""?+v:null,p=cur==null?50:Math.round((cur-mn)/((mx-mn)||1)*100),u=f.unit?" "+tx(f.unit):"";return `<div class="fe-sld${cur==null?" empty":""}" style="--p:${p}%">${live?`<input type="range" ${k} min="${mn}" max="${mx}" step="${f.step||1}" value="${cur??Math.round((mn+mx)/2)}"${dis} aria-label="${tx(fv(f.label,L))}">`:`<span class="trk"><i></i><b></b></span>`}<output>${cur==null?"—":nf(cur)+u}</output></div><div class="fe-sclb"><span>${nf(mn)}${u}</span><span>${nf(mx)}${u}</span></div>`}
    case "table":return feTableHTML(f,L,P,live,v,dis);
    case "chart":{let vv=live?P.vals:null;if(!live&&f.csrc?.startsWith("tbl:")){const tb=feFind(f.csrc.slice(4))?.f;if(tb&&Array.isArray(tb.tdef)&&tb.tdef.some(r=>r&&Object.values(r).some(Boolean)))vv={[tb.id]:tb.tdef}}return `<div class="fe-chart" data-chart="${f.id}">${feChartHTML(f,L,vv)}</div>`}
    case "info":{const ic={info:FEI.info,warn:FEI.warn,ok:FEI.check}[f.tone||"info"];return `<div class="fe-info ${f.tone||"info"}"><span class="ic">${ic}</span><div><b dir="auto">${tx(fv(f.label,L))}</b>${f.desc?`<p dir="auto">${tx(fv(f.desc,L))}</p>`:""}</div></div>`}
    case "divider":return `<div class="fe-div${fv(f.label,L)?"":" bare"}"><span dir="auto">${tx(fv(f.label,L))}</span></div>`;
    case "hidden":return `<div class="fe-in hiddenf">${FEI.hidden}<span>${tx(feTx("fe_hiddenV",L))}</span></div>`;
  }
  return "";
}
function feTblRows(f: FeField,vals: Bag | null | undefined){const v=vals?.[f.id];return Array.isArray(v)?v:(Array.isArray(f.tdef)?JSON.parse(JSON.stringify(f.tdef)):[])}
function feTblAgg(f: FeField,rows: Bag[],ci: number,L: string){const c=f.tcols?.[ci];if(c?.ty==="checkbox"){const n=rows.filter(r=>r?.["c"+ci]==="1").length;return nf(n)+" ✓"}const n=rows.map(r=>parseFloat(String(r?.["c"+ci]??"").replace(",","."))).filter(x=>isFinite(x));if(!n.length)return "—";const s=n.reduce((a,b)=>a+b,0);return nf(Math.round((f.tsum==="avg"||c?.ty==="rating"?s/n.length:s)*100)/100)}
const FE_CTY=["text","number","date","time","yesno","select","multi","checkbox","rating"];
const feTOpts=(c: FeTCol)=>String(c.opts||"").split(",").map(x=>x.trim()).filter(Boolean);
function feTableHTML(f: FeField,L: string,P: FeP | null,live: boolean,v: unknown,dis: string){
  const C=f.tcols||[],ed=!live,rows=live?feTblRows(f,P!.vals):(Array.isArray(f.tdef)?f.tdef:[]),n=Math.max(f.rows||1,rows.length,1),canAdd=f.addRows!==false,tx=(s: unknown)=>FEE(s),showX=live&&canAdd,agg=(c: FeTCol)=>["number","rating","checkbox"].includes(c.ty);
  const kk=live?`data-k="${f.id}"`:"";
  const attr=(ri: number,ci: number)=>live?`${kk} data-sk="${ri}.c${ci}"`:`data-tdef="${ri}.c${ci}"`;
  const cell=(c: FeTCol,ri: number,ci: number)=>{const val=rows[ri]?.["c"+ci]??"",a=attr(ri,ci),lab=`aria-label="${tx(fv(c.l,L))} ${ri+1}"`,sk=`${ri}.c${ci}`;
    if(c.ty==="yesno"||c.ty==="select"){const O=c.ty==="yesno"?[["y",feTx("fe_yes",L)],["n",feTx("fe_no",L)]]:feTOpts(c).map(x=>[x,x]);return `<div class="fe-selw"><select class="fe-in sm" ${a} ${lab}${dis}><option value=""></option>${O.map(([vv,l])=>`<option value="${tx(vv)}" ${val===vv?"selected":""}>${tx(l)}</option>`).join("")}</select>${FEI.chev}</div>`}
    if(c.ty==="checkbox")return `<label class="fe-tck"><input type="checkbox" ${a} value="1" ${val==="1"?"checked":""} ${lab}${dis}><i>${FEI.check}</i></label>`;
    if(c.ty==="multi"){const O=feTOpts(c),sel=String(val).split("|").filter(Boolean);return `<div class="fe-tchips" role="group" ${lab}>${O.map(o=>`<button type="button" class="${sel.includes(o)?"on":""}" ${kk} data-tchip="${sk}" data-o="${tx(o)}" aria-pressed="${sel.includes(o)}"${dis}>${tx(o)}</button>`).join("")||`<span class="mut">${tx(feTx("fe_tNoOpts",L))}</span>`}</div>`}
    if(c.ty==="rating"){const r=+val||0;return `<div class="fe-tstars" role="group" ${lab}>${[1,2,3,4,5].map(i=>`<button type="button" class="${i<=r?"on":""}" ${kk} data-tstar="${sk}" data-n="${i}" aria-label="${i}/5"${dis}>${FEI.star}</button>`).join("")}</div>`}
    return `<input class="fe-in sm" type="${c.ty==="number"?"number":c.ty==="date"?"date":c.ty==="time"?"time":"text"}" ${c.ty==="number"?'inputmode="decimal" step="any"':""} ${a} value="${FEE(val)}" ${lab}${ed?` placeholder="${tx(t("fe_tDefPh"))}"`:""}${dis} dir="auto">`};
  const head=C.map((c,ci)=>ed?`<th data-ci="${ci}"><div class="fe-thw"><input class="fe-thin" data-thl="${ci}" value="${FEE(fv(c.l,L))}" dir="auto" aria-label="${t("fe_tCol",{n:ci+1})}"><button type="button" class="fe-thm" data-thm="${ci}" title="${t("fe_tColOpts")}" aria-label="${t("fe_tColOpts")}">${FEI.chev}</button></div><small>${FEI[{text:"text",number:"number",date:"date",time:"clock",yesno:"yesno",select:"select",multi:"multi",checkbox:"multi",rating:"star"}[c.ty||"text"]!]}${tx(t("fe_ct_"+(c.ty||"text")))}${c.req?' <i class="rq">*</i>':""}</small></th>`:`<th><span>${tx(fv(c.l,L))}${c.req?'<i class="rq">*</i>':""}</span><small>${tx(feTx("fe_ct_"+(c.ty||"text"),L))}</small></th>`).join("");
  const foot=f.tsum&&f.tsum!=="none"?`<tfoot><tr class="tot"><td class="n">${f.tsum==="avg"?"x̄":"Σ"}</td>${C.map((c,ci)=>`<td data-tot="${ci}">${agg(c)?feTblAgg(f,rows,ci,L):""}</td>`).join("")}${showX||ed?"<td></td>":""}</tr></tfoot>`:"";
  const rowBtn=(ri: number)=>(ed||canAdd)?`<button type="button" class="fe-trn" ${ed?"":kk} data-trow="${ri}" title="${tx(feTx("fe_tRowOpts",L))}" aria-label="${tx(feTx("fe_tRowOpts",L))} ${ri+1}"${dis}><span>${nf(ri+1)}</span>${FEI.more}</button>`:nf(ri+1);
  return `<div class="fe-tblw"><table class="fe-tab${ed?" ed":""}" data-tbl="${f.id}"><thead><tr><th class="n">#</th>${head}${ed?`<th class="addc"><button type="button" class="fe-tcadd2" data-tcadd2 ${C.length>=8?"disabled":""} title="${t("fe_tAddCol")}" aria-label="${t("fe_tAddCol")}">${FEI.plus}</button></th>`:showX?"<th></th>":""}</tr></thead><tbody>${Array.from({length:n},(_,ri)=>`<tr><td class="n">${rowBtn(ri)}</td>${C.map((c,ci)=>`<td class="t-${c.ty||"text"}">${cell(c,ri,ci)}</td>`).join("")}${showX?`<td class="x"><button type="button" data-trm="${f.id}" data-ri="${ri}" aria-label="${tx(feTx("fe_tRm",L))}" title="${tx(feTx("fe_tRm",L))}" ${n<2?"disabled":""}${dis}>${FEI.x}</button></td>`:ed?"<td></td>":""}</tr>`).join("")}</tbody>${foot}</table></div><div class="fe-tfoot">${canAdd||ed?`<button type="button" class="fe-lnk" ${live?`data-tadd="${f.id}"`:"data-tdadd"}${dis}>${FEI.plus}${tx(feTx("fe_tAdd",L))}</button>`:""}${ed?`<button type="button" class="fe-lnk" data-tcadd2 ${C.length>=8?"disabled":""}>${FEI.plus}${t("fe_tAddCol")}</button>`:""}<small class="fe-thint">${tx(feTx(ed?"fe_tHintEd":"fe_tHint",L))}</small></div>`;
}
function feFace(i: number){const m=["M8 16.5c2-2 6-2 8 0","M8.5 16h7","M8.5 15.5c1.8 1 5.2 1 7 0","M8 14.5c2 2.2 6 2.2 8 0","M7.5 14c2.2 3.2 6.8 3.2 9 0"][i];return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><path d="M9 9.8h.01M15 9.8h.01" stroke-width="2.4"/><path d="${m}"/></svg>`}

/* ---------- editor pieces ---------- */
function feGrpHTML(f: FeField,L: string,cols: number): string{
  const on=FE.sel===f.id,n=(()=>{let k=0;feWalk(f.fields||[],x=>{if(x.type!=="group")k++});return k})();
  const badges=(f.hid?`<em class="fe-b">${FEI.hidden}${t("fe_hiddenB")}</em>`:"")+(f.logic?`<em class="fe-b lg">${FEI.branch}${t("fe_logicB")}</em>`:"");
  return `<div class="fe-fld fe-grp w2${on?" on":""}${f.col?" col":""}${f.hid?" is-hid":""}" style="${feSpVars(f,cols)}" data-fid="${f.id}" tabindex="0" aria-pressed="${on}" aria-label="${FEE(fv(f.label,L))}"><span class="fe-fgrip" aria-hidden="true">${FEI.grip}</span><div class="fe-gh"><span class="ic">${FEI.group}</span><span class="lb" dir="auto">${FEE(fv(f.label,L))}</span><em class="fe-b">${t("fe_statFields",{n:nf(n)})}</em>${badges}<span class="sp"></span><button type="button" class="fe-ib xs" data-ga="add" title="${t("fe_addIn")}" aria-label="${t("fe_addIn")}">${FEI.plus}</button><button type="button" class="fe-ib xs fe-gcol" data-ga="col" aria-expanded="${!f.col}" title="${t(f.col?"fe_expand":"fe_collapse")}" aria-label="${t(f.col?"fe_expand":"fe_collapse")}">${FEI.chev}</button></div>${f.desc?`<small class="fe-desc" dir="auto">${FEE(fv(f.desc,L))}</small>`:""}<div class="fe-gb"><div class="fe-flds c${f.cols||2}" data-box="${f.id}">${(f.fields||[]).map(x=>feFldHTML(x,L,f.cols||2)).join("")||`<div class="fe-empty">${FEI.plus}${t("fe_gDrop")}</div>`}</div></div><span class="fe-rsz" title="${t("fe_wDrag")}"></span><span class="fe-ftb"><em class="fe-wtag">${FE_FR[feSp(f,cols,feDK(FE.dev))]}</em><button type="button" data-fa="dup" title="${t("fe_dupField")}" aria-label="${t("fe_dupField")}">${FEI.copy}</button><button type="button" data-fa="del" title="${t("fe_delField")}" aria-label="${t("fe_delField")}">${FEI.del}</button></span></div>`;
}
let feFldHTML=function(f: FeField,L: string,cols: number): string{
  if(f.type==="group")return feGrpHTML(f,L,cols);
  const on=FE.sel===f.id,lb=fv(f.label,L);
  const badges=(f.hid?`<em class="fe-b">${FEI.hidden}${t("fe_hiddenB")}</em>`:"")+(f.logic?`<em class="fe-b lg">${FEI.branch}${t("fe_logicB")}</em>`:"")+(f.ro?`<em class="fe-b">${FEI.lock}${t("fe_roB")}</em>`:"");
  return `<div class="fe-fld${f.w===2?" w2":""}${on?" on":""}${f.hid?" is-hid":""}" style="${feSpVars(f,cols)}" data-fid="${f.id}" tabindex="0" aria-pressed="${on}" aria-label="${FEE(lb)}"><span class="fe-fgrip" aria-hidden="true">${FEI.grip}</span>${f.type==="info"||f.type==="divider"?(badges?`<div class="fe-fl">${badges}</div>`:""):`<div class="fe-fl"><span class="lb" dir="auto">${FEE(lb)}${f.req?'<i class="rq">*</i>':""}</span>${badges}</div>`}${feCtl(f,L,null)}${f.desc&&f.type!=="info"?`<small class="fe-desc" dir="auto">${FEE(fv(f.desc,L))}</small>`:""}<span class="fe-rsz" title="${t("fe_wDrag")}"></span><span class="fe-ftb"><em class="fe-wtag">${FE_FR[feSp(f,cols,feDK(FE.dev))]}</em><button type="button" data-fa="dup" title="${t("fe_dupField")}" aria-label="${t("fe_dupField")}">${FEI.copy}</button><button type="button" data-fa="del" title="${t("fe_delField")}" aria-label="${t("fe_delField")}">${FEI.del}</button></span></div>`;
}
function feSecHTML(s: FeSection,i: number,L: string){
  return `<section class="fe-sec${s.col?" col":""}" data-sid="${s.id}"><header class="fe-sh"><span class="fe-sgrip" aria-hidden="true">${FEI.grip}</span><span class="fe-sn">${nf(i+1)}</span><h3 dir="auto">${FEE(fv(s.title,L))}</h3><span class="sp"></span><button type="button" class="fe-ib sm fe-scol" data-sa="col" aria-expanded="${!s.col}" aria-label="${t(s.col?"fe_expand":"fe_collapse")}" title="${t(s.col?"fe_expand":"fe_collapse")}">${FEI.chev}</button><button type="button" class="fe-ib sm" data-sa="more" aria-label="${t("fe_more")}" title="${t("fe_more")}">${FEI.more}</button></header>${s.desc?`<p class="fe-sdesc" dir="auto">${FEE(fv(s.desc,L))}</p>`:""}<div class="fe-secb"><div class="fe-flds c${s.cols||2}" data-box="${s.id}">${s.fields.map(f=>feFldHTML(f,L,s.cols||2)).join("")||`<div class="fe-empty">${FEI.plus}${t("fe_dropHere")}</div>`}</div><button class="fe-addf" type="button" data-sa="add">${FEI.plus}${t("fe_addField")}</button></div></section>`;
}
function feCanvasHTML(){const p=fePage(),L=feCL();return `<div class="fe-paper dev-${FE.dev}" style="zoom:${FE.zoom/100}" lang="${L}" dir="${L==="ar"?"rtl":"ltr"}">${p.sections.map((s,i)=>feSecHTML(s,i,L)).join("")}<button type="button" class="fe-addsec" data-ai="sec">${FEI.plus}${t("fe_aiAddSec")}</button></div>`}
function fePagesHTML(){const d=feDoc(),L=feCL();return d!.pages.map((p,i)=>`<button type="button" class="fe-pg${i===FE.page?" on":""}" data-pg="${i}" role="tab" aria-selected="${i===FE.page}"><span class="n">${nf(i+1)}</span><span class="tx"><b>${t("fe_page",{n:nf(i+1)})}</b><span dir="auto">${FEE(fv(p.title,L))}</span></span></button>`).join("")+`<button type="button" class="fe-pgadd" data-pgadd title="${t("fe_addPage")}" aria-label="${t("fe_addPage")}">${FEI.plus}</button>`}
let feCompList=function(){
  const q=FE.q.trim().toLowerCase();let h="";
  const FCH={all:null,health:["health"],survey:["survey"],adv:["adv","data","layout"]}[FE.comp];
  for(const [g,l,types] of FE_G){if(FCH&&!FCH.includes(g))continue;const items=types.filter(ty=>!q||t(FE_T[ty][1]).toLowerCase().includes(q)||t("fe_dt_"+ty).toLowerCase().includes(q));if(!items.length)continue;
    h+=`<div class="fe-cg"><h5>${t(l)}</h5>${items.map(ty=>`<div class="fe-comp" data-ct="${ty}" tabindex="0" role="button" aria-label="${t("fe_add")} · ${t(FE_T[ty][1])}" title="${t("fe_dt_"+ty)}"><span class="ic">${FEI[FE_T[ty][0]]}</span><span class="lb">${t(FE_T[ty][1])}</span><span class="add" aria-hidden="true">${FEI.plus}</span></div>`).join("")}</div>`}
  return (h||`<p class="fe-none">${t("fe_noComp")}</p>`)+`<div class="fe-gen"><div class="hd"><span class="sp">${FEI.spark}</span><b>${t("fe_genTitle")}</b></div><p>${t("fe_genTxt")}</p><textarea rows="2" data-gen placeholder="${t("fe_genPh")}" dir="auto"></textarea><button type="button" class="fe-btn pri sm wide" data-genbtn>${FEI.spark}${t("fe_genBtn")}</button></div>`;
}
let feCompsHTML=function(){return `<div class="fe-ph"><h4>${t("fe_comps")}</h4><button type="button" class="fe-ib sm fe-pclose" data-fe-close="comps" aria-label="${t("fmClose")}">${FEI.x}</button></div><label class="fe-srch">${FEI.search}<input type="search" placeholder="${t("fe_compSearch")}" value="${FEE(FE.q)}" data-fe-q aria-label="${t("fe_compSearch")}"></label><div class="fe-chips" role="tablist">${[["all","fe_fAllChip"],["health","fe_fHealth"],["survey","fe_fSurvey"],["adv","fe_fAdv"]].map(([k,l])=>`<button type="button" role="tab" aria-selected="${FE.comp===k}" data-cf="${k}">${t(l)}</button>`).join("")}</div><div class="fe-clist">${feCompList()}</div>`}
function feTrTarget(){return feCL()==="en"?"fr":"en"}
function feAiBarHTML(){const tl=feTrTarget();return `<div class="fe-aibar"><form class="fe-aiask${FE.ask?" on":""}" data-aiask><span class="ic">${FEI.spark}</span><input type="text" placeholder="${t("fe_aiPh")}" aria-label="${t("fe_ai")}" data-aiin dir="auto"><button type="submit" class="fe-btn pri sm">${t("fe_aiSend")}</button></form><div class="fe-aichips"><button type="button" class="fe-aib" data-ai="ask" aria-expanded="${FE.ask}">${FEI.spark}<b>${t("fe_ai")}</b></button><button type="button" class="fe-chip" data-ai="sec">${FEI.plus}${t("fe_aiAddSec")}</button><button type="button" class="fe-chip" data-ai="req">${FEI.asterisk}${t("fe_aiReq")}</button><span class="fe-chip split"><button type="button" data-ai="tr">${FEI.globe}${t("fe_aiTr",{x:t("fe_L"+tl)})}</button><button type="button" data-ai="trm" aria-label="${t("fe_moreLangs")}" title="${t("fe_moreLangs")}">${FEI.chev}</button></span><button type="button" class="fe-chip" data-ai="logic">${FEI.branch}${t("fe_aiLogic")}</button></div></div>`}

/* ---------- properties panel ---------- */
const feRow=(lk: string,ctl: string,extra="")=>`<div class="fe-row${extra}"><span class="fe-lab">${t(lk)}</span>${ctl}</div>`;
const feTg=(attr: string,on: unknown,lk: string,dis?: unknown)=>`<div class="fe-tgr"><span>${t(lk)}</span><button type="button" role="switch" aria-checked="${!!on}" class="fe-tg" ${attr} aria-label="${t(lk)}"${dis?" disabled":""}><i></i></button></div>`;
const feDt=(k: string,lk: string,body: string,badge="")=>{FE.dto=FE.dto||{valid:true};return `<details class="fe-dt" data-dt="${k}"${FE.dto[k]?" open":""}><summary><span>${t(lk)}</span>${badge}<span class="ch">${FEI.chev}</span></summary><div class="fe-dtb">${body}</div></details>`};
let feSrcCands=function(f: FeField | null){const r: FeField[]=[];feEach(x=>{if(x!==f&&["select","multi","text","email","number","date","phone","history","yesno","rating","slider"].includes(x.type))r.push(x)});return r}
let fePField=function(){
  const r=FE.sel&&feFind(FE.sel);
  if(!r)return `<div class="fe-nosel">${FEI.layers}<p>${t("fe_noSel")}</p></div>`;
  const f=r.f,L=feCL(),ty=FE_T[f.type];
  if(FE_STATIC.has(f.type))return `<div class="fe-ptype"><span class="ic">${FEI[ty[0]]}</span><span class="tx"><b>${t(ty[1])}</b><small>${t("fe_dt_"+f.type)}</small></span></div>`+feRow(f.type==="divider"?"fe_dvLabel":"fe_blockTitle",`<input class="fe-inp" data-p="label" value="${FEE(fv(f.label,L))}" dir="auto">`)+(f.type==="divider"?"":feRow(f.type==="info"?"fe_infoText":"fe_desc",`<textarea class="fe-inp" rows="${f.type==="info"?3:2}" data-p="desc" dir="auto">${FEE(fv(f.desc,L))}</textarea>`))+feTypeProps(f,L)+`<div class="fe-tgs">${feTg('data-ptg="hid"',f.hid,"fe_hid")}</div>`+feDt("logic","fe_logic",feLogicHTML(f,L),f.logic?`<span class="fe-dot"></span>`:"")+feDt("layout","fe_layout",feWidthHTML(f));
  if(f.type==="group")return `<div class="fe-ptype"><span class="ic">${FEI.group}</span><span class="tx"><b>${t(ty[1])}</b><small>${t("fe_dt_group")}</small></span></div>`+feRow("fe_blockTitle",`<input class="fe-inp" data-p="label" value="${FEE(fv(f.label,L))}" dir="auto">`)+feRow("fe_desc",`<textarea class="fe-inp" rows="2" data-p="desc" placeholder="${t("fe_descPh")}" dir="auto">${FEE(fv(f.desc,L))}</textarea>`)+feRow("fe_cols",`<div class="fe-seg sm">${[1,2,3].map(n=>`<button type="button" aria-pressed="${(f.cols||2)===n}" data-gcols="${n}">${nf(n)}</button>`).join("")}</div>`)+`<div class="fe-tgs">${feTg('data-ptg="col"',f.col,"fe_collapsed")}${feTg('data-ptg="hid"',f.hid,"fe_hid")}</div>`+feDt("logic","fe_logic",feLogicHTML(f,L),f.logic?`<span class="fe-dot"></span>`:"")+feDt("layout","fe_layout",feWidthHTML(f));
  let h=`<div class="fe-ptype"><span class="ic">${FEI[ty[0]]}</span><span class="tx"><b>${t(ty[1])}</b><small>${t("fe_dt_"+f.type)}</small></span><button type="button" class="fe-ib sm" data-pchg title="${t("fe_changeType")}" aria-label="${t("fe_changeType")}">${FEI.chev}</button></div>`;
  h+=feRow("fe_label",`<input class="fe-inp" data-p="label" value="${FEE(fv(f.label,L))}" dir="auto">`);
  h+=feRow("fe_key",`<div class="fe-keyw"><input class="fe-inp fe-mono" data-p="key" value="${FEE(f.key)}" spellcheck="false" dir="ltr"><button type="button" class="fe-ib sm" data-pcopy title="${t("fe_copy")}" aria-label="${t("fe_copy")}">${FEI.copy}</button></div>`);
  h+=feRow("fe_desc",`<textarea class="fe-inp" rows="2" data-p="desc" placeholder="${t("fe_descPh")}" dir="auto">${FEE(fv(f.desc,L))}</textarea>`);
  if(["text","textarea","email","phone","number","date","allergy"].includes(f.type)||(f.type==="select"&&f.disp!=="radio"))h+=feRow("fe_ph",`<input class="fe-inp" data-p="ph" value="${FEE(fv(f.ph,L))}" dir="auto">`);
  if(["select","multi","rank","history","yesno"].includes(f.type))h+=feRow("fe_opts",feOptEd("opts",f.opts||[],L));
  h+=feTypeProps(f,L);
  if(f.type==="matrix")h+=feRow("fe_rows",feOptEd("rows",f.rows||[],L))+feRow("fe_colsM",feOptEd("cols",f.cols||[],L));
  h+=`<div class="fe-tgs">${feTg('data-ptg="req"',f.req,"fe_req",f.type==="hidden"||f.type==="calc"||FE_STATIC.has(f.type))}${feTg('data-ptg="ro"',f.ro,"fe_ro")}${feTg('data-ptg="hid"',f.hid,"fe_hid")}</div>`;
  if(FE_TXT.has(f.type)||f.type==="number"){
    const isN=f.type==="number";
    h+=feDt("valid","fe_valid",`<div class="fe-2">${feRow(isN?"fe_minVal":"fe_minLen",`<input class="fe-inp" type="number" min="0" data-p="min" value="${f.min??""}">`)}${feRow(isN?"fe_maxVal":"fe_maxLen",`<input class="fe-inp" type="number" min="0" data-p="max" value="${f.max??""}">`)}</div>${isN?"":feRow("fe_regex",`<input class="fe-inp fe-mono" data-p="regex" value="${FEE(f.regex??"")}" placeholder="${FEE(t("fe_regexPh"))}" spellcheck="false" dir="ltr"><small class="fe-err" data-rxerr hidden>${t("fe_regexBad")}</small>`)}`);
  }
  const lg=feLogicHTML(f,L);
  h+=feDt("logic","fe_logic",lg,f.logic?`<span class="fe-dot"></span>`:"");
  h+=feSrcLayout(f);
  return h;
}
let feLogicHTML=function(f: FeField,L: string){let lg;
  if(f.logic){const c=feSrcCands(f),src=c.find(x=>x.id===f.logic!.src),hasO=src&&(src.opts||[]).length;
    lg=`<div class="fe-rule"><select class="fe-inp" data-lg="act"><option value="show" ${f.logic.act!=="req"?"selected":""}>${t("fe_ruleShow")}</option><option value="req" ${f.logic.act==="req"?"selected":""}>${t("fe_ruleReq")}</option></select><select class="fe-inp" data-lg="src">${c.map(x=>`<option value="${x.id}" ${x.id===f.logic!.src?"selected":""}>${FEE(fv(x.label,L))}</option>`).join("")}</select><select class="fe-inp" data-lg="op">${[["eq","fe_opEq"],["neq","fe_opNeq"],["filled","fe_opFilled"]].map(([o,l])=>`<option value="${o}" ${f.logic!.op===o?"selected":""}>${t(l)}</option>`).join("")}</select>${f.logic.op==="filled"?"":hasO?`<select class="fe-inp" data-lg="val">${src.opts!.map((o,i)=>`<option value="${i}" ${String(f.logic!.val)===String(i)?"selected":""}>${FEE(fv(o,L))}</option>`).join("")}</select>`:`<input class="fe-inp" data-lg="val" value="${FEE(f.logic.val??"")}">`}<button type="button" class="fe-lnk danger" data-lgrm>${FEI.del}${t("fe_rmRule")}</button></div>`}
  else lg=`<p class="fe-mut">${t("fe_noRule")}</p><button type="button" class="fe-btn sm" data-lgadd>${FEI.plus}${t("fe_addRule")}</button>`;
  return lg;
}
let feTypeProps=function(f: FeField,L: string){
  if(f.type==="yesno")return `<div class="fe-tgs">${feTg('data-ptg="maybe"',f.maybe||(f.opts||[]).length>2,"fe_ynMaybe")}</div>`;
  if(f.type==="rating")return feRow("fe_starsN",`<div class="fe-seg sm">${[3,5,7,10].map(n=>`<button type="button" aria-pressed="${(f.stars||5)===n}" data-pstars="${n}">${nf(n)}</button>`).join("")}</div>`);
  if(f.type==="slider")return `<div class="fe-2">${feRow("fe_minVal",`<input class="fe-inp" type="number" data-p="min" value="${f.min??0}">`)}${feRow("fe_maxVal",`<input class="fe-inp" type="number" data-p="max" value="${f.max??100}">`)}</div><div class="fe-2">${feRow("fe_step",`<input class="fe-inp" type="number" min="0" data-p="step" value="${f.step??1}">`)}${feRow("fe_unit",`<input class="fe-inp" data-p="unit" value="${FEE(f.unit??"")}" placeholder="mmHg, kg, %…">`)}</div>`;
  if(f.type==="table")return feRow("fe_tCols",`<div class="fe-tcols">${(f.tcols||[]).map((c,i)=>`<div class="fe-tcol"><span class="g">${FEI.grip}</span><input class="fe-inp" data-tcl="${i}" value="${FEE(fv(c.l,L))}" dir="auto" aria-label="${t("fe_tCol",{n:i+1})}"><div class="fe-selw"><select class="fe-inp" data-tct="${i}" aria-label="${t("fe_cType")}">${FE_CTY.map(ty=>`<option value="${ty}" ${(c.ty||"text")===ty?"selected":""}>${t("fe_ct_"+ty)}</option>`).join("")}</select>${FEI.chev}</div><button type="button" class="fe-ib xs" data-tcrm="${i}" aria-label="${t("fe_delField")}" ${(f.tcols||[]).length<2?"disabled":""}>${FEI.x}</button>${c.ty==="select"||c.ty==="multi"?`<input class="fe-inp fe-tcopt" data-tco="${i}" value="${FEE(c.opts||"")}" placeholder="${t("fe_tOptsPh")}" dir="auto" aria-label="${t("fe_opts")}">`:""}</div>`).join("")}<button type="button" class="fe-lnk" data-tcadd ${(f.tcols||[]).length>=6?"disabled":""}>${FEI.plus}${t("fe_tAddCol")}</button></div>`)+`<div class="fe-2">${feRow("fe_tRows",`<input class="fe-inp" type="number" min="1" max="20" data-p="rows" value="${f.rows??3}">`)}</div><div class="fe-tgs">${feTg('data-ptg="addRows"',f.addRows!==false,"fe_tAllowAdd")}</div>`+feRow("fe_tTot",`<div class="fe-seg sm">${[["none","fe_tTotNone"],["sum","fe_tTotSum"],["avg","fe_tTotAvg"]].map(([kk,l])=>`<button type="button" aria-pressed="${(f.tsum||"none")===kk}" data-ptsum="${kk}">${t(l)}</button>`).join("")}</div>`)+`<p class="fe-mut">${FEI.table}${t("fe_tDefHint")}</p>${Array.isArray(f.tdef)&&f.tdef.some(r=>r&&Object.values(r).some(Boolean))?`<button type="button" class="fe-lnk danger" data-tdclr>${FEI.del}${t("fe_tDefClr")}</button>`:""}`;
  if(f.type==="chart"){const tbls: FeField[]=[];feEach(x=>{if(x.type==="table")tbls.push(x)});const tb=f.csrc?.startsWith("tbl:")?feFind(f.csrc.slice(4))?.f:null,C=tb?.tcols||[];
    return feRow("fe_chType",`<div class="fe-seg sm">${[["bar","fe_chBar"],["line","fe_chLine"],["donut","fe_chDonut"]].map(([k,l])=>`<button type="button" aria-pressed="${(f.ctype||"bar")===k}" data-pctype="${k}">${t(l)}</button>`).join("")}</div>`)
     +feRow("fe_chSrc",`<div class="fe-selw"><select class="fe-inp" data-p="csrc"><option value="fields" ${f.csrc==="fields"?"selected":""}>${t("fe_chFields")}</option>${tbls.map(x=>`<option value="tbl:${x.id}" ${f.csrc==="tbl:"+x.id?"selected":""}>${t("fe_cTable")} · ${FEE(fv(x.label,L))}</option>`).join("")}</select>${FEI.chev}</div>`)
     +(tb?`<div class="fe-2">${feRow("fe_chX",`<div class="fe-selw"><select class="fe-inp" data-p="cx">${C.map((c,i)=>`<option value="${i}" ${(f.cx??0)===i?"selected":""}>${FEE(fv(c.l,L))}</option>`).join("")}</select>${FEI.chev}</div>`)}${feRow("fe_chY",`<div class="fe-selw"><select class="fe-inp" data-p="cy">${C.map((c,i)=>`<option value="${i}" ${(f.cy??1)===i?"selected":""}>${FEE(fv(c.l,L))}</option>`).join("")}</select>${FEI.chev}</div>`)}</div>`:`<p class="fe-mut">${t("fe_chFieldsHint")}</p>`)
     +`<div class="fe-tgs">${feTg('data-ptg="cvals"',f.cvals!==false,"fe_chVals")}</div>`}
  if(f.type==="info")return feRow("fe_tone",`<div class="fe-seg sm">${[["info","fe_toneInfo"],["warn","fe_toneWarn"],["ok","fe_toneOk"]].map(([k,l])=>`<button type="button" aria-pressed="${(f.tone||"info")===k}" data-ptone="${k}">${t(l)}</button>`).join("")}</div>`);
  return "";
}
function feWidthHTML(f: FeField){
  const r=feFind(f.id),cols=r?.s.cols||2,k=feDK(FE.dev),cur=f.sp?.[k]||0;
  return `<div class="fe-row"><span class="fe-lab">${t("fe_width")}</span><div class="fe-devs fe-lyd" role="radiogroup" aria-label="${t("fe_wDev")}">${[["desktop","fe_dDesk"],["tablet","fe_dTab"],["mobile","fe_dMob"]].map(([d,l])=>`<button type="button" role="radio" aria-checked="${FE.dev===d}" data-dev="${d}" title="${t(l)}" aria-label="${t(l)}">${FEI[d]}</button>`).join("")}</div><div class="fe-widths" role="radiogroup" aria-label="${t("fe_width")}">${[0,...FE_SP].map(n=>`<button type="button" role="radio" aria-checked="${cur===n}" data-pspan="${n}" title="${n?FE_FR[n]:t("fe_wAuto")+" · "+FE_FR[feAutoSp(f,cols,k)]}"><i class="${n?"":"auto"}" style="--w:${(n||60)/60*100}%"></i><span>${n?FE_FR[n]:t("fe_wAuto")}</span></button>`).join("")}</div><div class="fe-wsum">${[["d","desktop"],["t","tablet"],["m","mobile"]].map(([kk,d])=>`<span class="${kk===k?"on":""}">${FEI[d]}<b>${FE_FR[feSp(f,cols,kk)]}</b>${f.sp?.[kk]?"":"<small>·auto</small>"}</span>`).join("")}</div><p class="fe-mut">${t("fe_wHint")}</p></div>`;
}
function feSrcLayout(f: FeField){let h="";
  h+=feDt("src","fe_source",`<div class="fe-selw"><select class="fe-inp" data-p="src">${[["manual","fe_srcManual"],["patient","fe_srcPatient"],["dir","fe_srcDir"]].map(([k,l])=>`<option value="${k}" ${(f.src||"manual")===k?"selected":""}>${t(l)}</option>`).join("")}</select>${FEI.chev}</div><p class="fe-mut">${t("fe_srcHint")}</p>`);
  h+=feDt("layout","fe_layout",feWidthHTML(f)+(f.type==="select"?feRow("fe_display",`<div class="fe-seg sm">${[["radio","fe_dRadio"],["list","fe_dList"]].map(([w,l])=>`<button type="button" aria-pressed="${(f.disp||"list")===w}" data-pdisp="${w}">${t(l)}</button>`).join("")}</div>`):""));
  return h;
}
function feOptEd(kind: string,arr: FeLabel[],L: string){return `<div class="fe-opts" data-okind="${kind}">${arr.map((o,i)=>`<div class="fe-opt"><span class="g">${FEI.grip}</span><input class="fe-inp" data-po="${i}" value="${FEE(fv(o,L))}" dir="auto" aria-label="${t("fe_opt",{n:i+1})}"><button type="button" class="fe-ib xs" data-porm="${i}" aria-label="${t("fe_delField")}" ${arr.length<2?"disabled":""}>${FEI.x}</button></div>`).join("")}<button type="button" class="fe-lnk" data-poadd>${FEI.plus}${t("fe_addOpt")}</button></div>`}
function feCurSec(){const r=FE.sel&&feFind(FE.sel);if(r)return r.sec;const p=fePage();return p.sections.find(s=>s.id===FE.selSec)||p.sections[0]}
function fePSec(){
  const s=feCurSec(),L=feCL();if(!s)return `<div class="fe-nosel">${FEI.layers}<p>${t("fe_noSec")}</p></div>`;
  return feRow("fe_secTitle",`<input class="fe-inp" data-ps="title" value="${FEE(fv(s.title,L))}" dir="auto">`)+feRow("fe_desc",`<textarea class="fe-inp" rows="2" data-ps="desc" dir="auto">${FEE(fv(s.desc,L))}</textarea>`)
    +feRow("fe_cols",`<div class="fe-seg sm">${[1,2,3].map(n=>`<button type="button" aria-pressed="${(s.cols||2)===n}" data-pcols="${n}">${nf(n)}</button>`).join("")}</div>`)
    +`<div class="fe-tgs">${feTg('data-pscol',s.col,"fe_collapsed")}</div><div class="fe-pacts"><button type="button" class="fe-btn sm" data-psdup>${FEI.copy}${t("fe_dupSec")}</button><button type="button" class="fe-btn sm danger" data-psdel>${FEI.del}${t("fe_delSec")}</button></div>`;
}
let fePForm=function(){
  const d=feDoc(),L=feCL();
  return feRow("fe_formTitle",`<input class="fe-inp" data-pf="title" value="${FEE(fv(d!.title,L))}" dir="auto">`)+feRow("fe_desc",`<textarea class="fe-inp" rows="2" data-pf="sub" dir="auto">${FEE(fv(d!.sub,L))}</textarea>`)
    +feRow("fe_cat",`<div class="fe-selw"><select class="fe-inp" data-pf="cat">${[["patients","fe_nPatients"],["clinical","fe_nClinical"],["surveys","fe_nSurveys"]].map(([k,l])=>`<option value="${k}" ${d!.cat===k?"selected":""}>${t(l)}</option>`).join("")}</select>${FEI.chev}</div>`)
    +feRow("fe_contentLang",`<div class="fe-selw"><select class="fe-inp" data-pf="lang"><option value="">${t("fe_auto",{x:LANGS[lang()].name})}</option>${["fr","en","de","ar"].map(l=>`<option value="${l}" ${d!.lang===l?"selected":""}>${LANGS[l].name}</option>`).join("")}</select>${FEI.chev}</div>`)
    +feRow("fe_confirmMsg",`<textarea class="fe-inp" rows="2" data-pfs="msg" dir="auto">${FEE(fv(d!.set.msg,L))}</textarea>`)
    +`<div class="fe-tgs">${feTg('data-pfg="login"',d!.set.login,"fe_login")}${feTg('data-pfg="accept"',d!.set.accept,"fe_accept")}${feTg('data-pfg="notif"',d!.set.notif,"fe_notif")}</div>`
    +`<div class="fe-stat"><span>${FEI.layers}${t("fe_statPages",{n:nf(d!.pages.length)})}</span><span>${FEI.text}${t("fe_statFields",{n:nf(feCount())})}</span></div>`;
}
const feCount=()=>{let n=0;feEach(f=>{if(f.type!=="group")n++});return n};
function fePropsHTML(){return `<div class="fe-ph"><h4>${t("fe_props")}</h4><button type="button" class="fe-ib sm fe-pclose" data-fe-close="props" aria-label="${t("fmClose")}">${FEI.x}</button></div><div class="fe-seg" role="tablist">${[["field","fe_pField"],["section","fe_pSec"],["form","fe_pForm"]].map(([k,l])=>`<button type="button" role="tab" aria-selected="${FE.ptab===k}" data-pt="${k}">${t(l)}</button>`).join("")}</div><div class="fe-pb">${FE.ptab==="field"?fePField():FE.ptab==="section"?fePSec():fePForm()}</div>`}

/* ---------- shell: nav, header, tabs ---------- */
const FE_NAV=[["overview","overview","fe_nOverview"],["list:all","all","fe_nAll"],["list:mine","mine","fe_nMine"],["list:shared","shared","fe_nShared"],["templates","templates","fe_nTpl"],["library","library","fe_nLib"],["list:surveys","surveys","fe_nSurveys"],["list:patients","patients","fe_nPatients"],["list:clinical","clinical","fe_nClinical"],["subs","subs","fe_nSubs"],["analytics","analytics","fe_nAnalytics"],["auto","auto","fe_nAuto"],["list:arch","archive","fe_nArch"],["list:trash","trash","fe_nTrash"],["settings","settings","fe_nSettings"]];
function feNavActive(){return FE.view==="editor"?"list:"+feDoc()!.cat:FE.view}
function feNavHTML(){
  const a=feNavActive(),nNew=feS!.subs.filter(s=>s.st==="new").length;
  return `<div class="fe-brand"><span class="gl">${DK_APPS.forms[1]}</span><b>${t("fe_app")}</b><button type="button" class="fe-ib sm fe-pclose" data-fe-close="nav" aria-label="${t("fmClose")}">${FEI.x}</button></div><div class="fe-nl">${FE_NAV.map(([k,ic,l])=>`<button type="button" class="fe-ni${a===k?" on":""}" data-go="${k}" title="${t(l)}"${a===k?' aria-current="page"':""}><span class="ic">${FEI[ic]}</span><span class="lb">${t(l)}</span>${k==="subs"&&nNew?`<span class="ct">${nf(nNew)}</span>`:""}</button>`).join("")}</div><div class="fe-help"><span class="hi">${FEI.spark}</span><b>${t("fe_help")}</b><p>${t("fe_helpTxt")}</p><button type="button" class="fe-lnk" data-aicreate>${t("fe_helpBtn")} <span class="ar">→</span></button></div>`;
}
function fePill(st: string | undefined){return `<span class="fe-pill ${st}">${t(st==="pub"?"fe_published":"fe_draft")}</span>`}
function feAgo(ts: number){const m=Math.round((Date.now()-ts)/6e4);if(m<1)return t("fe_justNow");if(m<60)return t("fe_minAgo",{n:nf(m)});const h=Math.round(m/60);if(h<24)return t("fe_hAgo",{n:nf(h)});return fmtD?fmtD(new Date(ts)):new Date(ts).toLocaleDateString(loc())}
const feLastTxt=()=>t("fe_lastSave",{x:feAgo(feS!.saved)});
function feHeadHTML(){
  const d=feDoc(),L=feCL(),isEd=FE.tab==="editor";
  const catKey={patients:"fe_nPatients",surveys:"fe_nSurveys",clinical:"fe_nClinical"}[d!.cat!]||"fe_nAll";
  return `<header class="fe-hd"><button type="button" class="fe-ib fe-burger" data-fe-open="nav" aria-label="${t("fe_menu")}">${FEI.menu}</button><div class="fe-hl"><div class="fe-bc" role="navigation" aria-label="${t("fe_bc")}"><button type="button" data-go="list:${d!.cat}">${t(catKey)}</button><span class="fe-bsep">${FEI.chevR}</span><span class="cur">${d!.everPub?FEE(fv(d!.title,L)):t("fe_new")}</span></div><div class="fe-tt"><h2 class="fe-title" dir="auto" tabindex="0" title="${t("fe_rename")}">${FEE(fv(d!.title,L))}</h2>${fePill(d!.status)}</div><p class="fe-sub" dir="auto">${FEE(fv(d!.sub,L))}</p></div><div class="fe-ha"><span class="fe-last">${feLastTxt()}</span>${isEd?`<button type="button" class="fe-ib" data-h="sync" title="${t("fe_syncNow")}" aria-label="${t("fe_syncNow")}">${FEI.refresh}</button><button type="button" class="fe-btn pri" data-h="pub">${FEI.check}<span>${t("fe_publish")}</span></button><button type="button" class="fe-btn" data-h="pv">${FEI.eye}<span>${t("fe_preview")}</span></button>`:`<button type="button" class="fe-btn" data-h="save">${FEI.check}<span>${t("fe_save")}</span></button><span class="fe-split"><button type="button" class="fe-btn pri" data-h="pub"><span>${t("fe_publish")}</span></button><button type="button" class="fe-btn pri ar" data-h="pubm" aria-label="${t("fe_pubOpts")}" title="${t("fe_pubOpts")}">${FEI.chev}</button></span>`}<button type="button" class="fe-ib" data-h="more" aria-label="${t("fe_more")}" title="${t("fe_more")}">${FEI.more}</button></div></header>`;
}
const feRuleCount=()=>{let n=0;feEach(f=>{if(f.logic)n++});return n};
const fePct=(z: number)=>new Intl.NumberFormat(loc(),{style:"percent"}).format(z/100);
function feTabsHTML(){
  const isEd=FE.tab==="editor",tabs=isEd?["editor","preview","rules","versions"]:["editor","preview","rules","versions","share","auto"],rc=feRuleCount();
  const tools=isEd?`<div class="fe-tools"><button type="button" class="fe-btn sm fe-ocomp" data-fe-open="comps">${FEI.plus}<span>${t("fe_comps")}</span></button><div class="fe-devs" role="radiogroup" aria-label="${t("fe_pvTitle")}">${[["desktop","fe_dDesk"],["tablet","fe_dTab"],["mobile","fe_dMob"]].map(([k,l])=>`<button type="button" role="radio" aria-checked="${FE.dev===k}" data-dev="${k}" title="${t(l)}" aria-label="${t(l)}">${FEI[k]}</button>`).join("")}</div><button type="button" class="fe-zoom" data-zoom aria-label="Zoom">${fePct(FE.zoom)}${FEI.chev}</button><button type="button" class="fe-ib" data-z="-1" title="${t("fe_zoomOut")}" aria-label="${t("fe_zoomOut")}">${FEI.zout}</button><button type="button" class="fe-ib" data-z="1" title="${t("fe_zoomIn")}" aria-label="${t("fe_zoomIn")}">${FEI.zin}</button><span class="fe-vs"></span><button type="button" class="fe-ib" data-undo title="${t("fe_undo")} (Ctrl+Z)" aria-label="${t("fe_undo")}" ${FE.undo.length?"":"disabled"}>${FEI.undo}</button><button type="button" class="fe-ib" data-redo title="${t("fe_redo")}" aria-label="${t("fe_redo")}" ${FE.redo.length?"":"disabled"}>${FEI.redo}</button><button type="button" class="fe-btn sm fe-oprops" data-fe-open="props">${FEI.sliders}<span>${t("fe_props")}</span></button></div>`
    :FE.tab==="preview"?`<div class="fe-tools"><button type="button" class="fe-btn sm fe-oprops" data-fe-open="props">${FEI.sliders}<span>${t("fe_pvOpts")}</span></button></div>`:"";
  return `<div class="fe-tabs"><div class="fe-tl" role="tablist">${tabs.map(k=>`<button type="button" role="tab" data-tab="${k}" aria-selected="${FE.tab===k}">${t("fe_t_"+k)}${k==="rules"&&rc?`<span class="ct">${nf(rc)}</span>`:""}</button>`).join("")}<span class="fe-ink" aria-hidden="true"></span></div>${tools}</div>`;
}
function feEditorShell(){
  let body="";
  if(FE.tab==="editor")body=`<div class="fe-ed"><aside class="fe-comps" aria-label="${t("fe_comps")}">${feCompsHTML()}</aside><div class="fe-stage"><div class="fe-pages" role="tablist">${fePagesHTML()}</div><div class="fe-cv">${feCanvasHTML()}</div>${feAiBarHTML()}</div><aside class="fe-props" aria-label="${t("fe_props")}">${fePropsHTML()}</aside></div>`;
  else if(FE.tab==="preview")body=fePreviewHTML();
  else if(FE.tab==="rules")body=feRulesHTML();
  else if(FE.tab==="versions")body=feVersionsHTML();
  else if(FE.tab==="share")body=feShareHTML();
  else if(FE.tab==="auto")body=feAutoHTML(true);
  return feHeadHTML()+feTabsHTML()+`<div class="fe-body" data-tabb="${FE.tab}">${body}</div>`;
}
/* ---------- live preview ---------- */
let feCond=function(f: { logic?: FeLogic | null },vals: Bag){const g=f.logic;if(!g)return true;const v=vals[g.src!];const filled=Array.isArray(v)?v.length>0:v!=null&&v!==""&&!(typeof v==="object"&&!Object.values(v).some(Boolean));if(g.op==="filled")return filled;const eq=Array.isArray(v)?v.includes(String(g.val)):String(v??"")===String(g.val??"");return g.op==="neq"?!eq:eq}
const feVis=(f: FeField,vals: Bag)=>!f.hid&&f.type!=="hidden"&&(!f.logic||f.logic.act!=="show"||feCond(f,vals));
const feReqd=(f: FeField,vals: Bag)=>!!(f.req||(f.logic?.act==="req"&&feCond(f,vals)));
let feGid=0;
function feHdrSVG(k?: string){
  const o=feS!.pv,c=o.color||"#5A64E0",g="feg"+(++feGid);k=k||o.hdr;
  if(k==="custom"&&o.hdrData)return `<img src="${o.hdrData}" alt="">`;
  if(k==="abstract")return `<svg viewBox="0 0 600 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="600" height="140" fill="${c}"/><path d="M0 90C120 40 220 130 340 80S520 30 600 60V0H0z" fill="#fff" opacity=".14"/><path d="M0 120C140 80 260 140 380 104S540 70 600 96V140H0z" fill="#000" opacity=".12"/><circle cx="500" cy="34" r="46" fill="#fff" opacity=".12"/><circle cx="90" cy="120" r="60" fill="#fff" opacity=".08"/></svg>`;
  const lake=k==="lake";
  return `<svg viewBox="0 0 600 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d8f0"/><stop offset="1" stop-color="#eaf6f2"/></linearGradient></defs><rect width="600" height="140" fill="url(#${g})"/><circle cx="468" cy="36" r="15" fill="#fff8de"/><path d="M0 96 62 58l40 22 78-52 62 46 64-34 74 46 70-50 74 40 76-28v92H0z" fill="#93b3c6"/><path d="m180 28-17 15 8-2 7 6 8-8 8 4zM306 46l-14 11 7-1 5 5 7-6 6 2zM480 40l-15 12 7-1 6 5 7-7 7 3z" fill="#fff" opacity=".95"/><path d="M0 112c70-22 130-14 196-28 70-15 128 14 204 4 78-10 124-20 200-8v60H0z" fill="${c}" opacity=".55"/>${lake?`<rect y="118" width="600" height="22" fill="#cfe8f2"/><path d="M40 126h80M200 131h120M380 125h90M500 132h60" stroke="#fff" stroke-width="2" opacity=".8"/>`:`<path d="M0 126c90-14 190-6 300-12s220 4 300-6v32H0z" fill="${c}" opacity=".9"/>`}</svg>`;
}
function feLogoHTML(){const o=feS!.pv,c=o.color;if(o.logo==="custom"&&o.logoData)return `<span class="fe-lg img"><img src="${o.logoData}" alt=""></span>`;
  const p={leaf:'<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7"/>',cross:'<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z"/>',heart:'<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>'}[o.logo!]||"";
  return `<span class="fe-lg" style="background:${c}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg></span>`}
function feChartData(f: FeField,vals: Bag | null,L: string){
  const lab: string[]=[],val: number[]=[];
  if(f.csrc&&f.csrc.startsWith("tbl:")){const tb=feFind(f.csrc.slice(4))?.f;if(tb&&vals){const rows=feTblRows(tb,vals);const xc=tb.tcols?.[f.cx??0];rows.forEach((r: { [x: string]: string; },i: number)=>{const y=parseFloat(String(r?.["c"+(f.cy??1)]??"").replace(",","."));if(!isFinite(y))return;let x=r?.["c"+(f.cx??0)]??"";if(xc?.ty==="date"&&/^\d{4}-\d\d-\d\d$/.test(x)){try{x=new Date(x+"T12:00").toLocaleDateString(L==="ar"?"ar":L,{day:"numeric",month:"short"})}catch(e){}}if(xc?.ty==="yesno")x=feTx(x==="y"?"fe_yes":x==="n"?"fe_no":"fe_empty",L);lab.push(String(x||"#"+(i+1)));val.push(y)})}}
  else if(vals){feEach(x=>{if(FE_NUM.has(x.type)&&x.id!==f.id){const v=vals[x.id] as FeAnsR;if(v==null||v==="")return;let y=+v;if(x.type==="sat")y=y+1;if(isFinite(y)){lab.push(fv(x.label,L));val.push(y)}}})}
  return {lab,val};
}
function feChartSVG(type: string,lab: string[],val: number[],showV: boolean){
  const W=320,H=160,fmt=(n: number)=>nf(Math.round(n*10)/10),e=(s: unknown)=>FEE(String(s).length>10?String(s).slice(0,9)+"…":s);
  if(type==="donut"){const tot=val.reduce((a,b)=>a+Math.max(0,b),0)||1;let a0=-Math.PI/2,h="";const cx=80,cy=80,R1=58,R2=36,op=(i: number)=>Math.max(.25,1-i*.17);
    val.forEach((v,i)=>{const a1=a0+Math.max(0,v)/tot*Math.PI*2-(val.length>1?.02:0),lg=a1-a0>Math.PI?1:0,p=(r: number,a: number)=>`${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`;if(v>0)h+=`<path d="M${p(R1,a0)}A${R1},${R1} 0 ${lg} 1 ${p(R1,a1)}L${p(R2,a1)}A${R2},${R2} 0 ${lg} 0 ${p(R2,a0)}Z" fill="currentColor" fill-opacity="${op(i)}" class="fe-cseg" style="--d:${i*80}ms"/>`;a0=a1+(val.length>1?.02:0)});
    return `<svg viewBox="0 0 ${W} ${H}" class="fe-csvg" role="img">${h}<text x="${cx}" y="${cy+5}" text-anchor="middle" class="big">${fmt(tot)}</text>${lab.slice(0,6).map((l,i)=>`<g transform="translate(165,${26+i*20})"><rect width="10" height="10" rx="3" fill="currentColor" fill-opacity="${op(i)}"/><text x="16" y="9">${e(l)}${showV?` · ${fmt(val[i])}`:""}</text></g>`).join("")}</svg>`}
  const L0=30,B=H-24,T=14,Rr=W-8,mx=Math.max(...val,0)||1,st0=mx/4,mag=Math.pow(10,Math.floor(Math.log10(st0))),step=[1,2,2.5,5,10].map(m=>m*mag).find(m=>m>=st0)||mag*10,top=Math.ceil(mx/step)*step||1,nt=Math.round(top/step),y=(v: number)=>B-(v/top)*(B-T),n=val.length,bw=(Rr-L0)/Math.max(n,1);
  let g="";for(let i=0;i<=nt;i++){const v=step*i,yy=y(v).toFixed(1);g+=`<line x1="${L0}" x2="${Rr}" y1="${yy}" y2="${yy}" class="gl"/><text x="${L0-5}" y="${+yy+3}" text-anchor="end">${fmt(v)}</text>`}
  const xl=lab.map((l,i)=>`<text x="${(L0+bw*i+bw/2).toFixed(1)}" y="${H-8}" text-anchor="middle">${e(l)}</text>`).join("");
  if(type==="line"){const pts=val.map((v,i)=>[L0+bw*i+bw/2,y(v)]);const d=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join("");const area=pts.length?d+`L${pts[pts.length-1][0].toFixed(1)},${B}L${pts[0][0].toFixed(1)},${B}Z`:"";
    return `<svg viewBox="0 0 ${W} ${H}" class="fe-csvg" role="img">${g}<path d="${area}" fill="currentColor" fill-opacity=".12" class="fe-carea"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" class="fe-cline" pathLength="1"/>${pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.6" fill="#fff" stroke="currentColor" stroke-width="2" class="fe-cdot" style="--d:${300+i*60}ms"/>${showV?`<text x="${p[0].toFixed(1)}" y="${(p[1]-8).toFixed(1)}" text-anchor="middle" class="v">${fmt(val[i])}</text>`:""}`).join("")}${xl}</svg>`}
  const w=Math.min(34,bw*.62);return `<svg viewBox="0 0 ${W} ${H}" class="fe-csvg" role="img">${g}${val.map((v,i)=>{const x=L0+bw*i+(bw-w)/2,yy=y(Math.max(0,v));return `<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${w.toFixed(1)}" height="${(B-yy).toFixed(1)}" rx="4" fill="currentColor" fill-opacity="${.55+.45*(v/top)}" class="fe-cbar" style="--d:${i*50}ms"/>${showV?`<text x="${(x+w/2).toFixed(1)}" y="${(yy-4).toFixed(1)}" text-anchor="middle" class="v">${fmt(v)}</text>`:""}`}).join("")}${xl}</svg>`;
}
function feChartHTML(f: FeField,L: string,vals: Bag | null){
  let {lab,val}=feChartData(f,vals,L);const sample=!val.length;
  if(sample){const t2=f.ctype||"bar";lab=t2==="donut"?["A","B","C"].map(x=>feTx("fe_chSeries",L,{x})):[1,2,3,4,5].map(i=>feTx("fe_chDay",L,{n:nf(i)}));val=t2==="donut"?[5,3,2]:[6,5,5,3,2]}
  return feChartSVG(f.ctype||"bar",lab,val,f.cvals!==false).replace('class="fe-csvg"',`class="fe-csvg${sample?" sample":""}"`)+(sample?`<small class="fe-csmp">${FEE(feTx(vals?"fe_chEmpty":"fe_chSample",L))}</small>`:"");
}
let feValStr=function(f: FeField,v: FeAnsR,L: string){
  if(FE_STATIC.has(f.type))return null;
  if(v==null||v===""||(Array.isArray(v)&&!v.length))return null;
  const O=feOpts(f,L);
  if(f.type==="select"||f.type==="yesno")return O[+v]??"";
  if(f.type==="rating")return `${v}/${f.stars||5}`;
  if(f.type==="slider")return `${v}${f.unit?" "+f.unit:""}`;
  if(f.type==="table"){const n=v.filter(r=>r&&Object.values(r).some(x=>x!==""&&x!=null)).length;return n?feTx("fe_tRowsN",L,{n:nf(n)}):null}
  if(f.type==="multi"||f.type==="history")return v.map(i=>O[+i]).join(", ");
  if(f.type==="rank")return v.map(i=>O[+i]).join(" › ");
  if(f.type==="sat")return `${+v+1}/5`;if(f.type==="nps"||f.type==="clinical")return `${v}/10`;
  if(f.type==="sign")return "✓";
  if(f.type==="meds")return v.filter(r=>r.n).map(r=>r.n+(r.d?" ("+r.d+")":"")).join(", ")||null;
  if(f.type==="matrix"){const R=(f.rows||[]).map(x=>fv(x,L)),C=(f.cols||[]).map(x=>fv(x,L));return Object.keys(v).map(r=>R[r as unknown as number]+" : "+C[v[r] as unknown as number]).join(" · ")||null}
  if(typeof v==="object"){const s=Object.values(v).filter(Boolean).join(" · ");return s||null}
  if(f.type==="date"){try{return new Date(v+"T12:00").toLocaleDateString(L==="ar"?"ar":L)}catch(e){return v}}
  return String(v);
}
let fePvFld=function(f: FeField,L: string,P: FeP,cols: number): string{
  const vals=FE.pv.vals,vis=feVis(f,vals),lt=feS!.pv.logic&&f.logic;
  if(!vis&&!lt)return "";
  if(f.type==="info"||f.type==="divider")return `<div class="fe-pfld fe-pst" style="${feSpVars(f,cols)}" data-pf="${f.id}">${feCtl(f,L,P)}</div>`;
  if(f.type==="group"){const inner=(f.fields||[]).map(x=>fePvFld(x,L,P,f.cols||2)).join("");if(!inner)return "";return `<div class="fe-pgrp${vis?"":" off"}${lt?" lgt":""}" style="${feSpVars(f,cols)}" data-pf="${f.id}"><div class="fe-pgh"><span class="ic">${FEI.group}</span><b>${FEE(fv(f.label,L))}</b>${lt?`<em class="fe-b lg">${FEI.branch}${feTx(vis?"fe_lgShown":"fe_lgHidden",L)}</em>`:""}</div>${f.desc?`<small class="fe-desc">${FEE(fv(f.desc,L))}</small>`:""}<div class="fe-pgrid c${f.cols||2}">${inner}</div></div>`}const err=FE.pv.err[f.id];
  return `<div class="fe-pfld${lt?" lgt":""}${vis?"":" off"}${err?" err":""}" style="${feSpVars(f,cols)}" data-pf="${f.id}"><label class="lb" for="${P.uid}-${f.id}">${FEE(fv(f.label,L))}${feReqd(f,vals)&&feS!.pv.reqm?'<i class="rq">*</i>':""}${lt?`<em class="fe-b lg">${FEI.branch}${feTx(vis?"fe_lgShown":"fe_lgHidden",L)}</em>`:""}</label>${feCtl(f,L,P)}${f.desc?`<small class="fe-desc">${FEE(fv(f.desc,L))}</small>`:""}${err?`<small class="fe-perr" role="alert">${FEE(err)}</small>`:""}</div>`;
}
function fePvForm(u: string | number){
  const o=feS!.pv,d=feDoc(),L=o.lang||feCL(),P={vals:FE.pv.vals,ro:o.ro,uid:"pv"+u},st=FE.pv.step;
  const stepIdx=[...d!.pages.map((p,i)=>i).filter(i=>fePageOn(d!.pages[i],FE.pv.vals)),d!.pages.length],steps=stepIdx.map(i=>i<d!.pages.length?fv(d!.pages[i].title,L):feTx("fe_pgConf",L)),last=steps.length-1,sp=Math.max(0,stepIdx.indexOf(st));
  let body;
  if(FE.pv.done)body=`<div class="fe-thx"><span class="ok">${FEI.check}</span><h3>${FEE(feTx("fe_thanks",L))}</h3><p>${FEE(fv(d!.set.msg,L))}</p><button type="button" class="fe-pbtn ghost" data-pvrestart>${FEE(feTx("fe_restart",L))}</button></div>`;
  else if(st>=d!.pages.length)body=`<div class="fe-conf"><h3>${FEE(feTx("fe_confTitle",L))}</h3>${d!.pages.map((p,pi)=>!fePageOn(p,FE.pv.vals)?"":`<div class="fe-cfp"><div class="hd"><b>${FEE(fv(p.title,L))}</b><button type="button" class="fe-lnk" data-pvgo="${pi}">${FEE(feTx("fe_confEdit",L))}</button></div><dl>${p.sections.flatMap(s=>feVisLeaves(s.fields,FE.pv.vals)).filter(f=>!FE_STATIC.has(f.type)).map(f=>{const s=feValStr(f,f.type==="table"?feTblRows(f,FE.pv.vals):FE.pv.vals[f.id],L);return `<div><dt>${FEE(fv(f.label,L))}</dt><dd class="${s?"":"mut"}">${FEE(s??feTx("fe_empty",L))}</dd></div>`}).join("")}</dl></div>`).join("")}</div>`;
  else body=d!.pages[st].sections.map(s=>{const fl=(d!.set?.rand?feSeeded(s.fields,(FE.pv.seed||1)+s.id.length):s.fields).map(f=>fePvFld(f,L,P,s.cols||2)).join("");return fl?`<fieldset class="fe-pfs"><legend>${FEE(fv(s.title,L))}</legend>${s.desc?`<p class="fe-sdesc">${FEE(fv(s.desc,L))}</p>`:""}<div class="fe-pgrid c${s.cols||2}">${fl}</div></fieldset>`:""}).join("");
  const pct=FE.pv.done?100:Math.round(sp/last*100);
  return `<div class="fe-pf th-${o.theme}${o.ro?" ro":""}" data-u="${u}" style="--pc:${o.color}" lang="${L}" dir="${L==="ar"?"rtl":"ltr"}">
    <div class="fe-pfh">${o.theme==="min"?"":feHdrSVG()}<div class="fe-pflogo">${feLogoHTML()}${o.org?`<b>${FEE(feTx("fe_org",L))}</b>`:""}</div></div>
    <div class="fe-pfb"><h1>${FEE(fv(d!.title,L))}</h1><p class="fe-wel">${FEE(feTx("fe_welcome",L))}</p>
    <ol class="fe-steps${o.nums?"":" nonum"}">${steps.map((s,i)=>`<li class="${FE.pv.done||i<sp?"done":i===sp?"cur":""}"><span class="n">${FE.pv.done||i<sp?FEI.check:o.nums?nf(i+1):""}</span><span class="tx">${FEE(s)}</span></li>`).join("")}</ol>
    ${o.prog?`<div class="fe-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`:""}
    <div class="fe-pfp" data-step="${st}">${body}</div>
    ${FE.pv.done?"":`<footer class="fe-pff">${o.reqm&&st<d!.pages.length?`<small class="fe-rleg">${FEE(feTx("fe_reqLegend",L))}</small>`:""}<div class="row">${o.later&&st<d!.pages.length?`<button type="button" class="fe-pbtn ghost" data-pvlater>${FEE(feTx("fe_saveLater",L))}</button>`:""}<span class="sp"></span>${st>0?`<button type="button" class="fe-pbtn ghost" data-pvprev>${FEE(feTx("fe_prev",L))}</button>`:""}<button type="button" class="fe-pbtn" data-pvnext>${FEE(feTx(sp===last?"fe_submit":"fe_next",L))}<span class="ar">${sp===last?"":"→"}</span></button></div></footer>`}
    </div></div>`;
}
function feLink(){const d=feDoc();return "https://forms.remotion.health/p/"+feSlug(fv(d!.title,"fr")).replace(/_/g,"-")+"-"+(feS!.cur||"").toUpperCase()}
let fePvOptsHTML=function(){
  const o=feS!.pv,sel=(attr: string,opts: [unknown, string][],cur: unknown)=>`<div class="fe-selw"><select class="fe-inp" ${attr}>${opts.map(([v,l])=>`<option value="${v}" ${String(cur)===String(v)?"selected":""}>${l}</option>`).join("")}</select>${FEI.chev}</div>`;
  const logoN={leaf:"fe_lgLeaf",cross:"fe_lgCross",heart:"fe_lgHeart",custom:"fe_lgCustom"}[o.logo!],hdrN={mount:"fe_hdM",lake:"fe_hdL",abstract:"fe_hdA",custom:"fe_lgCustom"}[o.hdr!];
  return `<div class="fe-ph"><h4>${t("fe_pvOpts")}</h4><button type="button" class="fe-ib sm fe-pclose" data-fe-close="props" aria-label="${t("fmClose")}">${FEI.x}</button></div><div class="fe-pb">
  <section class="fe-og"><h5>${t("fe_theme")}</h5>
    ${feRow("fe_themeSel",sel('data-o="theme"',[["clinic",t("fe_thClinic")],["min",t("fe_thMin")],["hi",t("fe_thHi")]],o.theme))}
    ${feRow("fe_color",`<div class="fe-color"><label class="fe-sw" style="background:${o.color}"><input type="color" data-o="color" value="${o.color}" aria-label="${t("fe_color")}"></label><input class="fe-inp fe-mono" data-o="hex" value="${o.color!.toUpperCase()}" maxlength="7" spellcheck="false" dir="ltr" aria-label="${t("fe_color")}"></div><div class="fe-presets" role="radiogroup" aria-label="${t("fe_color")}">${FE_COLS.map(c=>`<button type="button" role="radio" aria-checked="${o.color!.toUpperCase()===c}" data-ocol="${c}" style="--c:${c}" title="${c}" aria-label="${c}"></button>`).join("")}</div>`)}
    ${feRow("fe_logo",`<div class="fe-asset"><span class="th lg">${feLogoHTML()}</span><span class="nm">${t(logoN!)}</span><button type="button" class="fe-btn sm" data-ochg="logo">${t("fe_change")}</button></div>`)}
    ${feRow("fe_header",`<div class="fe-asset"><span class="th">${feHdrSVG()}</span><span class="nm">${t(hdrN!)}</span><button type="button" class="fe-btn sm" data-ochg="hdr">${t("fe_change")}</button></div>`)}
    <div class="fe-tgs">${feTg('data-otg="org"',o.org,"fe_showOrg")}</div></section>
  <section class="fe-og"><h5>${t("fe_textLang")}</h5>
    ${feRow("fe_pvLang",sel('data-o="lang"',["fr","en","de","ar"].map(l=>[l,LANGS[l].name+" ("+l.toUpperCase()+")"]),o.lang||feCL()))}
    ${feRow("fe_trans",`<div class="fe-trs"><span>${FEI.globe}${t("fe_transN",{n:nf(4)})}</span><button type="button" class="fe-lnk" data-alllangs>${t("fe_allLangs")}</button></div>`)}</section>
  <section class="fe-og"><h5>${t("fe_behav")}</h5><div class="fe-tgs">${feTg('data-otg="prog"',o.prog,"fe_bProg")}${feTg('data-otg="nums"',o.nums,"fe_bNums")}${feTg('data-otg="later"',o.later,"fe_bSave")}${feTg('data-otg="reqm"',o.reqm,"fe_bReq")}${feTg('data-otg="ro"',o.ro,"fe_bRo")}</div></section>
  <section class="fe-og"><h5>${t("fe_sim")}</h5><div class="fe-tgs">${feTg('data-otg="fill"',o.fill,"fe_simFill")}${feTg('data-otg="logic"',o.logic,"fe_simLogic")}</div><button type="button" class="fe-btn wide" data-pvtest="1">${FEI.play}${t("fe_testMode")}</button></section>
  <section class="fe-og"><h5>${t("fe_shareLink")}</h5><div class="fe-linkw"><input class="fe-inp fe-mono" readonly value="${FEE(feLink())}" dir="ltr" aria-label="${t("fe_shareLink")}"><button type="button" class="fe-ib sm" data-copylink title="${t("fe_copy")}" aria-label="${t("fe_copy")}">${FEI.copy}</button></div><p class="fe-mut">${FEI.lock}${t(feDoc()!.status==="pub"?"fe_linkLive":"fe_linkNote")}</p></section>
  </div>`;
}
function fePreviewHTML(){
  const dv=FE.pv.dev;
  return `<div class="fe-pv${FE.pv.test?" test":""}" data-pdev="${dv}"><aside class="fe-pvl"><h4>${t("fe_pvTitle")}</h4><div class="fe-pvd" role="radiogroup">${([["desktop","fe_dDesk",[1440,900]],["tablet","fe_dTab",[834,1194]],["mobile","fe_dMob",[390,844]]] as [string, string, number[]][]).map(([k,l,dm])=>`<button type="button" role="radio" aria-checked="${dv===k}" data-pvdev="${k}"><span class="ic">${FEI[k]}</span><span class="tx"><b>${t(l)}</b><small>${nf(dm[0])} × ${nf(dm[1])}</small></span></button>`).join("")}</div></aside>
  <div class="fe-pvs"><div class="fe-testbar" role="status">${FEI.play}<span>${t("fe_testOn")}</span><button type="button" class="fe-btn sm" data-pvtest="0">${t("fe_testExit")}</button></div><div class="fe-pvw"><div class="fe-frame">${fePvForm("d")}</div><div class="fe-phone" aria-label="${t("fe_dMob")}"><div class="fe-phsb"><b>${fmtT?fmtT(new Date()).replace(/\s?[AP]M$/i,""):"9:41"}</b><span class="isl"></span><span class="ind"><i></i><i></i><i></i><em></em></span></div><div class="fe-phc">${fePvForm("m")}</div></div></div></div>
  <aside class="fe-pvo fe-props" aria-label="${t("fe_pvOpts")}">${fePvOptsHTML()}</aside></div>`;
}
function fePvPrefill(on: boolean){
  if(!on){FE.pv.vals={};return}
  const v: Bag={};feEach(f=>{const k=f.key;const m: Bag={nom:"Martin",prenom:"Camille",date_naissance:"1988-03-12",sexe:"0",telephone:"6 12 34 56 78",email:"camille.martin@exemple.fr",adresse:"12 rue des Lilas",code_postal:"75011",ville:"Paris",pays:"0",situation_familiale:"1",langue_preferee:"0",connu_par:"0",organisme:"Mutuelle Exemple",numero_adherent:"123456789"};
    if(m[k]!=null)v[f.id]=m[k];else if(f.type==="history")v[f.id]=["1"];else if(f.type==="allergy")v[f.id]=feTx("fe_testAll",feS!.pv.lang||feCL());else if(f.type==="meds")v[f.id]=[{n:"Paracétamol",d:"1 g × 3/j"}];else if(f.type==="vitals")v[f.id]={bp:"125/80",hr:"72",w:"64",h:"168"};else if(f.type==="clinical")v[f.id]="3";else if(f.type==="patient")v[f.id]={n:"Martin",p:"Camille",d:"1988-03-12",r:"P-2026-0412"};else if(f.type==="multi")v[f.id]=["0"];else if(f.type==="sat")v[f.id]="3";else if(f.type==="nps")v[f.id]="9";else if(f.type==="yesno")v[f.id]="1";else if(f.type==="rating")v[f.id]="4";else if(f.type==="slider")v[f.id]=String(Math.round(((+f.min!||0)+(+f.max!||100))/2));else if(f.type==="table"&&f.key==="suivi_douleur"&&!(f.tdef||[]).length){const d=(n: number)=>{const x=new Date(Date.now()-n*864e5);return x.toISOString().slice(0,10)};v[f.id]=[{c0:d(9),c1:"7",c2:""},{c0:d(6),c1:"6",c2:""},{c0:d(3),c1:"4",c2:""},{c0:d(0),c1:"3",c2:""}]}});
  FE.pv.vals=v;
}

/* ---------- rules / versions / share / automations tabs ---------- */
let feRuleText=function(f: FeField,L: string){const g=f.logic,src=feFind(g!.src)?.f;const val=g!.op==="filled"?"":src&&(src.opts||[]).length?fv(src.opts![+(g!.val as number)],L):g!.val||"…";
  return `<span class="k">${t("fe_ruleWhen")}</span> <b>${FEE(src?fv(src.label,L):"?")}</b> <span>${t({eq:"fe_opEq",neq:"fe_opNeq",filled:"fe_opFilled"}[g!.op!]!)}</span>${val?` <b>« ${FEE(val)} »</b>`:""} <span class="k">${t("fe_ruleThen")}</span> <span>${t(g!.act==="req"?"fe_actReq":"fe_actShow")}</span> <b>${FEE(fv(f.label,L))}</b>`}
let feRulesHTML=function(){
  const L=feCL(),rules: FeField[]=[];feEach(f=>{if(f.logic)rules.push(f)});
  let b="";if(FE.rb){const all: FeField[]=[];feEach(f=>all.push(f));const src=feFind(FE.rb.src)?.f;const cands=feSrcCands(null);
    b=`<form class="fe-rb" data-rbform><span class="k">${t("fe_ruleWhen")}</span><div class="fe-selw"><select class="fe-inp" data-rb="src">${cands.map(x=>`<option value="${x.id}" ${x.id===FE.rb!.src?"selected":""}>${FEE(fv(x.label,L))}</option>`).join("")}</select>${FEI.chev}</div><div class="fe-selw"><select class="fe-inp" data-rb="op">${[["eq","fe_opEq"],["neq","fe_opNeq"],["filled","fe_opFilled"]].map(([o,l])=>`<option value="${o}" ${FE.rb!.op===o?"selected":""}>${t(l)}</option>`).join("")}</select>${FEI.chev}</div>${FE.rb.op==="filled"?"":src&&(src.opts||[]).length?`<div class="fe-selw"><select class="fe-inp" data-rb="val">${src.opts!.map((o,i)=>`<option value="${i}" ${String(FE.rb!.val)===String(i)?"selected":""}>${FEE(fv(o,L))}</option>`).join("")}</select>${FEI.chev}</div>`:`<input class="fe-inp" data-rb="val" value="${FEE(FE.rb.val??"")}" placeholder="…">`}<span class="k">${t("fe_ruleThen")}</span><div class="fe-selw"><select class="fe-inp" data-rb="act"><option value="show" ${FE.rb.act!=="req"?"selected":""}>${t("fe_actShow")}</option><option value="req" ${FE.rb.act==="req"?"selected":""}>${t("fe_actReq")}</option></select>${FEI.chev}</div><div class="fe-selw"><select class="fe-inp" data-rb="tgt">${all.filter(x=>x.id!==FE.rb!.src).map(x=>`<option value="${x.id}" ${x.id===FE.rb!.tgt?"selected":""}>${FEE(fv(x.label,L))}</option>`).join("")}</select>${FEI.chev}</div><span class="sp"></span><button type="button" class="fe-btn sm" data-rbx>${t("fe_cancel")}</button><button type="submit" class="fe-btn pri sm">${t("fe_add")}</button></form>`}
  return `<div class="fe-pane"><div class="fe-pane-h"><div><h3>${t("fe_rulesT")}</h3><p>${t("fe_rulesSub")}</p></div><button type="button" class="fe-btn pri" data-rnew>${FEI.plus}${t("fe_newRule")}</button></div>${b}<div class="fe-rules">${rules.length?rules.map(f=>`<div class="fe-rc" data-rf="${f.id}"><span class="ic">${FEI.branch}</span><div class="tx">${feRuleText(f,L)}</div><button type="button" class="fe-btn sm" data-redit="${f.id}">${t("fe_edit")}</button><button type="button" class="fe-ib sm" data-rrm="${f.id}" aria-label="${t("fe_rmRule")}" title="${t("fe_rmRule")}">${FEI.del}</button></div>`).join(""):`<div class="fe-emptyp">${FEI.branch}<p>${t("fe_noRules")}</p></div>`}</div></div>`;
}
const feSnapCount=(s: string)=>{try{let n=0;JSON.parse(s).pages.forEach((p: FePage)=>p.sections.forEach((x: FeSection)=>{n+=x.fields.length}));return n}catch(e){return 0}};
const feFullDate=(ts: number)=>new Date(ts).toLocaleString(loc(),{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
function feVersionsHTML(){
  const vs=(feS!.ver[feS!.cur]||[]).slice().reverse(),me=ACCOUNTS?.[0]?.name||t("fe_you");
  return `<div class="fe-pane"><div class="fe-pane-h"><div><h3>${t("fe_verT")}</h3><p>${t("fe_verSub")}</p></div></div><ol class="fe-vers"><li class="cur"><span class="fe-vdot"></span><div class="tx"><b>${t("fe_verCur")}</b><small>${feLastTxt()} · ${FEE(me)} · ${t("fe_verFields",{n:nf(feCount())})}</small></div>${fePill(feDoc()!.status)}</li>${vs.map(v=>`<li><span class="fe-vdot${v.pub?" pub":""}"></span><div class="tx"><b>${t("fe_verN",{n:nf(v.n)})}</b><small>${feFullDate(v.at)} · ${FEE(me)} · ${t("fe_verFields",{n:nf(feSnapCount(v.snap))})}</small></div><span class="fe-tag${v.pub?" pub":""}">${t(v.pub?"fe_verPub":"fe_verAuto")}</span><button type="button" class="fe-btn sm" data-vrestore="${v.n}">${FEI.undo}${t("fe_verRestore")}</button></li>`).join("")}</ol></div>`;
}
let feShareHTML=function(){
  const d=feDoc(),sh=d!.share,link=feLink();
  return `<div class="fe-pane"><div class="fe-pane-h"><div><h3>${t("fe_shT")}</h3><p>${t("fe_shSub")}</p></div></div><div class="fe-cards2">
  <section class="fe-card"><h5>${FEI.link}${t("fe_shareLink")}</h5><div class="fe-linkw"><input class="fe-inp fe-mono" readonly value="${FEE(link)}" dir="ltr" aria-label="${t("fe_shareLink")}"><button type="button" class="fe-btn sm" data-copylink>${FEI.copy}${t("fe_copy")}</button></div><p class="fe-mut">${t(d!.status==="pub"?"fe_linkLive":"fe_linkNote")}</p></section>
  <section class="fe-card"><h5>${FEI.lock}${t("fe_shAccess")}</h5><div class="fe-radioc" role="radiogroup">${[["any","fe_shAny","globe"],["auth","fe_shAuth","patient"],["staff","fe_shStaff","shared"]].map(([k,l,ic])=>`<button type="button" role="radio" aria-checked="${sh.access===k}" data-shacc="${k}"><span class="ic">${FEI[ic]}</span><span>${t(l)}</span><i></i></button>`).join("")}</div></section>
  <section class="fe-card"><h5>${FEI.mail}${t("fe_shInvite")}</h5><form class="fe-linkw" data-shinv><input class="fe-inp" type="email" placeholder="${t("fe_shInvPh")}" aria-label="${t("fe_shInvite")}" dir="ltr"><button type="submit" class="fe-btn pri sm">${t("fe_shSend")}</button></form><div class="fe-tags">${sh.invites.map((m,i)=>`<span class="fe-tagc">${FEE(m)}<button type="button" data-shrm="${i}" aria-label="${t("fe_delField")}">${FEI.x}</button></span>`).join("")}</div><p class="fe-mut">${t("fe_shInvNote")}</p></section>
  <section class="fe-card"><h5>${FEI.code}${t("fe_shEmbed")}</h5><pre class="fe-code" dir="ltr">&lt;iframe src="${FEE(link)}" width="100%" height="900" style="border:0"&gt;&lt;/iframe&gt;</pre><button type="button" class="fe-btn sm" data-copyembed>${FEI.copy}${t("fe_copy")}</button></section>
  <section class="fe-card"><h5>${FEI.clock}${t("fe_shExpire")}</h5><div class="fe-tgs">${feTg("data-shexp",sh.expire,"fe_shExpireOn")}</div>${sh.expire?`<input class="fe-inp" type="date" data-shuntil value="${FEE(sh.until)}" aria-label="${t("fe_shExpire")}">`:""}</section>
  </div></div>`;
}
const FE_AU=[["a1","mail","fe_au1"],["a2","patient","fe_au2"],["a3","bell","fe_au3"],["a4","card","fe_au4"],["a5","clock","fe_au5"],["a6","folder","fe_au6"],["a7","phone","fe_au7"]];
function feAutoHTML(_full?: boolean){
  const d=feDoc();
  return `<div class="fe-pane"><div class="fe-pane-h"><div><h3>${t("fe_auT")}</h3><p>${t("fe_auSub")}</p></div><button type="button" class="fe-btn pri" data-auadd>${FEI.plus}${t("fe_auAdd")}</button></div><div class="fe-aul">${FE_AU.filter(([k])=>d!.auto[k]!==undefined).map(([k,ic,l])=>`<div class="fe-au${d!.auto[k]?" on":""}" data-au="${k}"><span class="ic">${FEI[ic]}</span><div class="tx"><b>${t(l)}</b><small>${FEI.auto}${t("fe_auWhen")}</small></div><span class="st">${t(d!.auto[k]?"fe_auOn":"fe_auOff")}</span><button type="button" role="switch" aria-checked="${!!d!.auto[k]}" class="fe-tg" data-autg="${k}" aria-label="${t(l)}"><i></i></button></div>`).join("")}</div></div>`;
}

/* ---------- app views (sidebar) ---------- */
function feListForms(f: string){const F=feS!.forms;switch(f){case "all":return F.filter(x=>!x.arch&&!x.del);case "mine":return F.filter(x=>x.owner==="me"&&!x.arch&&!x.del);case "shared":return F.filter(x=>x.owner!=="me"&&!x.del&&!x.arch);case "arch":return F.filter(x=>x.arch&&!x.del);case "trash":return F.filter(x=>x.del);default:return F.filter(x=>x.cat===f&&!x.arch&&!x.del)}}
const feOwner=(o: string | undefined)=>o==="me"?t("fe_you"):o==="lau"?"Dr Laurent":"Dr Benali";
const feCatIc=(c: string | undefined)=>({surveys:"surveys",clinical:"clinical",patients:"patients"})[c!]||"all";
function feTable(rows: FeEntryT[],f: string){
  if(!rows.length)return `<div class="fe-emptyp">${FEI[f==="trash"?"trash":"all"]}<p>${t(f==="trash"?"fe_trashEmpty":"fe_noForms")}</p></div>`;
  return `<div class="fe-tbl" role="table"><div class="fe-tr th" role="row"><span role="columnheader">${t("fe_colName")}</span><span role="columnheader">${t("fe_colStatus")}</span><span role="columnheader" class="num">${t("fe_colResp")}</span><span role="columnheader">${t("fe_colUpd")}</span><span role="columnheader">${t("fe_colOwner")}</span><span></span></div>${rows.sort((a,b)=>b.upd!-a.upd!).map(e=>`<div class="fe-tr" role="row" data-open="${e.id}" tabindex="0"><span class="nm"><span class="ic c-${e.cat}">${FEI[feCatIc(e.cat)]}</span><b dir="auto">${FEE(feName(e))}</b></span><span>${e.arch?`<span class="fe-pill arch">${t("fe_archived")}</span>`:fePill(feS!.docs[e.id]?.status||e.status)}</span><span class="num">${nf(e.resp!)}</span><span class="mut">${feAgo(e.upd!)}</span><span class="mut">${FEE(feOwner(e.owner))}</span><span class="act"><button type="button" class="fe-ib sm" data-rowm="${e.id}" aria-label="${t("fe_more")}">${FEI.more}</button></span></div>`).join("")}</div>`;
}
function feBars(){const now=new Date(),d: [Date, number][]=[];for(let i=13;i>=0;i--){const x=new Date((now as unknown as number)-i*864e5);d.push([x,[9,14,11,18,16,7,5,12,19,22,17,9,8,15][13-i]])}const mx=24;
  return `<div class="fe-bars">${d.map(([x,v],i)=>`<div class="b" style="--h:${v/mx*100}%;--d:${i*30}ms" title="${x.toLocaleDateString(loc(),{day:"numeric",month:"short"})} · ${nf(v)}"><i></i><span>${x.toLocaleDateString(loc(),{day:"numeric"})}</span></div>`).join("")}</div>`}
function feKpis(){return `<div class="fe-kpis">${[["fe_kActive",nf(feS!.forms.filter(f=>!f.arch&&!f.del&&(feS!.docs[f.id]?.status||f.status)==="pub").length),"all","+1"],["fe_kResp",nf(248),"subs","+12 %"],["fe_kRate",fePct(87),"analytics","+3 pts"],["fe_kTime",t("fe_mins",{m:nf(4),s:nf(20)}),"clock","−18 s"]].map(([l,v,ic,dl])=>`<div class="fe-kpi"><span class="ic">${FEI[ic]}</span><small>${t(l)}</small><b>${v}</b><em>${dl}</em></div>`).join("")}</div>`}
let feViewHTML=function(){
  const v=FE.view;let title="",sub="",act="",h="";
  const newBtn=`<button type="button" class="fe-btn pri" data-newform>${FEI.plus}<span>${t("fe_new")}</span></button>`;
  if(v==="overview"){title=t("fe_nOverview");sub=t("fe_ovSub");act=newBtn;
    const recent=feListForms("all").sort((a,b)=>b.upd!-a.upd!).slice(0,5);
    h=feKpis()+`<div class="fe-cards2 two"><section class="fe-card"><h5>${FEI.analytics}${t("fe_respWeek")}</h5>${feBars()}</section><section class="fe-card"><h5>${FEI.clock}${t("fe_recent")}</h5><div class="fe-mini">${recent.map(e=>`<button type="button" class="fe-mr" data-open="${e.id}"><span class="ic c-${e.cat}">${FEI[feCatIc(e.cat)]}</span><span class="tx"><b dir="auto">${FEE(feName(e))}</b><small>${feAgo(e.upd!)} · ${t("fe_nResp",{n:nf(e.resp!)})}</small></span>${fePill(feS!.docs[e.id]?.status||e.status)}</button>`).join("")}</div></section></div>`;}
  else if(v.startsWith("list:")){const f=v.slice(5),nav=FE_NAV.find(n=>n[0]===v);title=t(nav?nav[2]:"fe_nAll");sub=t("fe_nForms",{n:nf(feListForms(f).length)});act=f==="trash"?(feListForms("trash").length?`<button type="button" class="fe-btn danger" data-emptytrash>${FEI.trash}<span>${t("fe_emptyTrash")}</span></button>`:""):f==="arch"?"":newBtn;
    h=`<label class="fe-srch wide">${FEI.search}<input type="search" placeholder="${t("fe_searchForms")}" data-lq value="${FEE(FE.lq||"")}" aria-label="${t("fe_searchForms")}"></label>`+feTable(feListForms(f).filter(e=>!FE.lq||feName(e).toLowerCase().includes(FE.lq.toLowerCase())),f);}
  else if(v==="templates"){title=t("fe_nTpl");sub=t("fe_tplSub");act=newBtn;
    h=`<div class="fe-tpls">${FE_TPL.map(([id,kind,n,dsc])=>`<div class="fe-tpl"><div class="pv c-${kind}"><span class="ic">${FEI[{patients:"patients",survey:"surveys",consent:"sign",clinical:"clinical",booking:"date"}[kind]!]}</span><i></i><i></i><i class="s"></i><i></i></div><b>${t(n)}</b><p>${t(dsc)}</p><button type="button" class="fe-btn sm" data-usetpl="${id}">${t("fe_useTpl")}</button></div>`).join("")}</div>`;}
  else if(v==="library"){title=t("fe_nLib");sub=t("fe_libSub");
    h=FE_G.map(([g,l,types])=>`<h4 class="fe-gh">${t(l)}</h4><div class="fe-libg">${types.map(ty=>`<div class="fe-lib"><span class="ic">${FEI[FE_T[ty][0]]}</span><div class="tx"><b>${t(FE_T[ty][1])}</b><small>${t("fe_dt_"+ty)}</small></div><button type="button" class="fe-ib sm" data-libadd="${ty}" title="${t("fe_libAdd")}" aria-label="${t("fe_libAdd")}">${FEI.plus}</button></div>`).join("")}</div>`).join("");}
  else if(v==="subs"){title=t("fe_nSubs");sub=t("fe_subsSub");act=`<button type="button" class="fe-btn" data-csv>${FEI.upload}<span>${t("fe_exportCsv")}</span></button>`;const fl=FE.sf||"all";
    const rows=feS!.subs.filter(s=>fl==="all"||s.st===fl).sort((a,b)=>b.at-a.at);
    h=`<div class="fe-chips" role="tablist">${[["all","fe_fAllChip"],["new","fe_stNew"],["done","fe_stDone"],["test","fe_stTest"]].map(([k,l])=>`<button type="button" role="tab" aria-selected="${fl===k}" data-sf="${k}">${t(l)}</button>`).join("")}</div><div class="fe-tbl subs" role="table"><div class="fe-tr th" role="row"><span>${t("fe_colPatient")}</span><span>${t("fe_colForm")}</span><span>${t("fe_colDate")}</span><span>${t("fe_colStatus")}</span></div>${rows.map(s=>{const e=feEntry(s.form);return `<div class="fe-tr" role="row" data-sub="${s.id}" tabindex="0"><span class="nm"><span class="av">${FEE(s.who.split(" ").map(x=>x[0]).join("").slice(0,2))}</span><b>${FEE(s.who)}</b></span><span class="mut" dir="auto">${FEE(e?feName(e):"—")}</span><span class="mut">${feFullDate(s.at)}</span><span><span class="fe-tag ${s.st}">${t({new:"fe_stNew",done:"fe_stDone",test:"fe_stTest"}[s.st]!)}</span></span></div>`}).join("")||`<div class="fe-emptyp">${FEI.subs}<p>${t("fe_noSubs")}</p></div>`}</div>`;}
  else if(v==="analytics"){title=t("fe_nAnalytics");sub=t("fe_anSub");const d=feDoc(),L=feCL(),pct=[100,86,74,69,66];
    h=feKpis()+`<div class="fe-cards2 two"><section class="fe-card"><h5>${FEI.analytics}${t("fe_respWeek")}</h5>${feBars()}</section><section class="fe-card"><h5>${FEI.layers}${t("fe_funnel")} · <span dir="auto">${FEE(fv(d!.title,L))}</span></h5><div class="fe-fun">${[...d!.pages.map(p=>fv(p.title,L)),feTx("fe_pgConf",L)].map((n,i)=>`<div class="r"><span dir="auto">${FEE(n)}</span><div class="bar"><i style="--w:${pct[Math.min(i,4)]}%;--d:${i*80}ms"></i></div><b>${fePct(pct[Math.min(i,4)])}</b></div>`).join("")}</div></section></div>`;}
  else if(v==="auto"){title=t("fe_nAuto");sub=t("fe_auGSub");
    h=`<div class="fe-mini wide">${feListForms("all").map(e=>{const d=feS!.docs[e.id],n=d?Object.values(d.auto).filter(Boolean).length:1;return `<button type="button" class="fe-mr" data-openauto="${e.id}"><span class="ic c-${e.cat}">${FEI.auto}</span><span class="tx"><b dir="auto">${FEE(feName(e))}</b><small>${t("fe_auCount",{n:nf(n)})}</small></span><span class="ar">${FEI.chevR}</span></button>`}).join("")}</div>`;}
  else if(v==="settings"){title=t("fe_nSettings");sub=t("fe_setSub");const s=feS!.set;
    h=`<section class="fe-card narrow"><div class="fe-tgs">${feTg('data-set="autosave"',s.autosave,"fe_set1")}${feTg('data-set="ai"',s.ai,"fe_set2")}${feTg('data-set="enc"',s.enc,"fe_set3")}${feTg('data-set="mail"',s.mail,"fe_set4")}</div><div class="fe-pacts"><button type="button" class="fe-btn danger" data-reset>${FEI.refresh}${t("fe_reset")}</button></div><p class="fe-mut">${t("fe_sampleNote")}</p></section>`;}
  return `<header class="fe-hd v"><button type="button" class="fe-ib fe-burger" data-fe-open="nav" aria-label="${t("fe_menu")}">${FEI.menu}</button><div class="fe-hl"><div class="fe-tt"><h2>${FEE(title)}</h2></div><p class="fe-sub">${FEE(sub)}</p></div><div class="fe-ha">${act}</div></header><div class="fe-body fe-vb">${h}</div>`;
}
/* ---------- state changes, saving, undo ---------- */
const feRoot=()=>feWinEl()?.querySelector<HTMLElement>(".fe");
const feRM=()=>typeof lkRM==="function"&&lkRM();
function feToast(msg: string,undo?: () => void){
  const R=feRoot();if(!R){toast(msg);return}const el: HTMLElementX | null=R.querySelector<HTMLInputElement>(".fe-toast");
  el!.innerHTML=`<span class="ok">${FEI.check}</span><span class="m">${FEE(msg)}</span>${undo?`<button type="button" class="fe-lnk" data-tundo>${t("fe_undo")}</button>`:""}`;el!._undo=undo||null;
  el!.classList.remove("show");void el!.offsetWidth;el!.classList.add("show");clearTimeout(el!._t);el!._t=setTimeout(()=>el!.classList.remove("show"),undo?4200:2200);
}
function feSnap(){FE.undo.push(JSON.stringify({d:feDoc(),page:FE.page,sel:FE.sel}));if(FE.undo.length>80)FE.undo.shift();FE.redo=[];feSyncUndo()}
function feTouch(){const e=feEntry(feS!.cur);if(e){e.upd=Date.now();e.cat=feDoc()!.cat}}
function feDirty(){feTouch();clearTimeout(FE.st);if(feS!.set.autosave===false){feSyncHead();return}FE.st=setTimeout(()=>feCommit(true),900)}
function feCommit(quiet?: boolean | string){clearTimeout(FE.st);feS!.saved=Date.now();feSave();const R=feRoot();const l=R?.querySelector<HTMLInputElement>(".fe-last");if(l){l.textContent=feLastTxt();if(!feRM())l.animate([{color:"var(--fe-acc)"},{color:""}],{duration:900})}if(quiet!=="silent")feToast(t("fe_saved"))}
function feMut(fn: (d: FeDocT) => void,what: string | false | null="canvas"){feSnap();fn(feDoc()!);feDirty();if(what)feRefresh(what)}
function feRestore(json: string,redoStack: string[]){const s=JSON.parse(json);redoStack.push(JSON.stringify({d:feDoc(),page:FE.page,sel:FE.sel}));feS!.docs[feS!.cur]=s.d;FE.page=s.page;FE.sel=s.sel&&feFind(s.sel)?s.sel:null;feDirty();feFlip(()=>feRefresh(FE.tab==="editor"?"all":"tab"))}
function feUndo(){if(!FE.undo.length)return;feRestore(FE.undo.pop()!,FE.redo);feSyncUndo()}
function feRedo(){if(!FE.redo.length)return;const r=FE.redo.pop();FE.undo.push(JSON.stringify({d:feDoc(),page:FE.page,sel:FE.sel}));const s=JSON.parse(r!);feS!.docs[feS!.cur]=s.d;FE.page=s.page;FE.sel=s.sel&&feFind(s.sel)?s.sel:null;feDirty();feFlip(()=>feRefresh(FE.tab==="editor"?"all":"tab"));feSyncUndo()}
function feSyncUndo(){const R=feRoot();if(!R)return;const u=R.querySelector<HTMLInputElement>("[data-undo]"),r=R.querySelector<HTMLInputElement>("[data-redo]");if(u)u.disabled=!FE.undo.length;if(r)r.disabled=!FE.redo.length}
function feSyncHead(){const R=feRoot();if(!R||FE.view!=="editor"||FE.editingTitle)return;const h=R.querySelector<HTMLInputElement>(".fe-hd");if(h)h.outerHTML=feHeadHTML();const rc=feRuleCount(),rt=R.querySelector<HTMLInputElement>('[data-tab="rules"]');if(rt){rt.querySelector<HTMLInputElement>(".ct")?.remove();if(rc)rt.insertAdjacentHTML("beforeend",`<span class="ct">${nf(rc)}</span>`)}R.querySelector<HTMLInputElement>(".fe-nav")!.innerHTML=feNavHTML();feInk()}
function feFlip(fn: () => void){
  const R=feRoot();if(!R||feRM()){fn();return}
  const before=new Map();R.querySelectorAll<HTMLInputElement>(".fe-cv [data-fid],.fe-cv [data-sid]").forEach(el=>before.set(el.dataset.fid||el.dataset.sid,el.getBoundingClientRect()));
  fn();
  R.querySelectorAll<HTMLInputElement>(".fe-cv [data-fid],.fe-cv [data-sid]").forEach(el=>{const k=el.dataset.fid||el.dataset.sid,b=before.get(k),a=el.getBoundingClientRect();
    if(!b){el.animate([{opacity:0,transform:"scale(.96) translateY(6px)"},{opacity:1,transform:"none"}],{duration:380,easing:"cubic-bezier(.2,1.1,.3,1)"});return}
    const dx=b.left-a.left,dy=b.top-a.top;if(Math.abs(dx)>1||Math.abs(dy)>1)el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],{duration:380,easing:"cubic-bezier(.2,1,.3,1)"})});
}
function feRefresh(w: string){
  const R=feRoot();if(!R)return;
  if(FE.view!=="editor"){feRender();return}
  if(FE.tab!=="editor"||w==="tab"){if(FE.tab!=="editor"){const b=R.querySelector<HTMLInputElement>(".fe-body");if(FE.tab==="preview"){fePvRender()}else b!.innerHTML=FE.tab==="rules"?feRulesHTML():FE.tab==="versions"?feVersionsHTML():FE.tab==="share"?feShareHTML():feAutoHTML()}else feRefresh("all");feSyncHead();return}
  if(w==="canvas"||w==="all"){const cv=R.querySelector<HTMLInputElement>(".fe-cv"),st=cv!.scrollTop;cv!.innerHTML=feCanvasHTML();cv!.scrollTop=st;R.querySelector<HTMLInputElement>(".fe-pages")!.innerHTML=fePagesHTML()}
  if(w==="all"){R.querySelector<HTMLInputElement>(".fe-aibar")!.outerHTML=feAiBarHTML();R.querySelector<HTMLInputElement>(".fe-comps")!.innerHTML=feCompsHTML()}
  if(w!=="none")feRenderProps();
  feSyncHead();feSyncUndo();
}
function feRenderProps(){const R=feRoot(),P=R?.querySelector<HTMLInputElement>(".fe-ed .fe-props");if(!P)return;const st=P.querySelector<HTMLInputElement>(".fe-pb")?.scrollTop||0;P.innerHTML=fePropsHTML();const pb=P.querySelector<HTMLInputElement>(".fe-pb");if(pb)pb.scrollTop=st}
function feRepaintField(fid: string){const R=feRoot(),el=R?.querySelector<HTMLInputElement>(`.fe-cv .fe-fld[data-fid="${fid}"]`),r=feFind(fid);if(!el||!r)return;const tmp=document.createElement("div");tmp.innerHTML=feFldHTML(r.f,feCL(),r.s.cols||2);el.replaceWith(tmp.firstElementChild!)}

/* ---------- render ---------- */
function feBody(el: HTMLElement=document.createElement("div")){
  el.className="fe";
  el.innerHTML=`<nav class="fe-nav" aria-label="${t("fe_app")}"></nav><div class="fe-main"></div><div class="fe-scrim" data-fe-close="all"></div><div class="fe-toast" role="status" aria-live="polite"></div>`;
  feWire(el);return el;
}
function feRender(anim?: boolean){
  const R=feRoot();if(!R)return;
  R.querySelector<HTMLInputElement>(".fe-nav")!.innerHTML=feNavHTML();
  const M=R.querySelector<HTMLInputElement>(".fe-main");M!.innerHTML=FE.view==="editor"?feEditorShell():feViewHTML();
  R.dataset.view=FE.view==="editor"?"editor":"view";R.dataset.ftab=FE.tab;
  R.classList.remove("o-nav","o-comps","o-props");
  feAfter();
  if(anim&&!feRM()){M!.animate([{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"none"}],{duration:320,easing:"cubic-bezier(.2,1,.3,1)"});
    M!.querySelectorAll<HTMLInputElement>(".fe-kpi,.fe-tr:not(.th),.fe-tpl,.fe-lib,.fe-mr,.fe-au,.fe-rc,.fe-vers li,.fe-card").forEach((x,i)=>x.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"none"}],{duration:380,delay:Math.min(i,14)*28,easing:"cubic-bezier(.2,1,.3,1)",fill:"backwards"}))}
}
function feAfter(){feInk();if(FE.view==="editor"&&FE.tab==="preview")fePvAfter()}
function feInk(from?: { left: number; width: number } | null){
  const R=feRoot(),tl=R?.querySelector<HTMLInputElement>(".fe-tl");if(!tl)return;const ink=tl.querySelector<HTMLInputElement>(".fe-ink"),b=tl.querySelector<HTMLInputElement>('[aria-selected="true"]');if(!ink||!b)return;
  const to={left:b.offsetLeft+"px",width:b.offsetWidth+"px"};
  if(from&&!feRM())ink.animate([{left:from.left+"px",width:from.width+"px"},to],{duration:380,easing:"cubic-bezier(.3,1.2,.4,1)"});
  Object.assign(ink.style,to);
}
function feSetTab(k: string){
  if(FE.tab===k)return;const R=feRoot();const old=R!.querySelector<HTMLInputElement>('.fe-tl [aria-selected="true"]');const from=old?{left:old.offsetLeft,width:old.offsetWidth}:null;
  const order=["editor","preview","rules","versions","share","auto"],dir=order.indexOf(k)>order.indexOf(FE.tab)?1:-1;
  FE.tab=k;FE.rb=null;if(k==="preview"&&feS!.pv.fill&&!Object.keys(FE.pv.vals).length)fePvPrefill(true);
  const M=R!.querySelector<HTMLInputElement>(".fe-main");M!.innerHTML=feEditorShell();R!.dataset.ftab=k;R!.classList.remove("o-comps","o-props");feAfter();feInk(from);
  if(!feRM()){const b=M!.querySelector<HTMLInputElement>(".fe-body");b!.animate([{opacity:0,transform:`translateX(${dir*18*(document.documentElement.dir==="rtl"?-1:1)}px)`},{opacity:1,transform:"none"}],{duration:340,easing:"cubic-bezier(.2,1,.3,1)"});
    b!.querySelectorAll<HTMLInputElement>(".fe-rc,.fe-vers li,.fe-card,.fe-au,.fe-og").forEach((x,i)=>x.animate([{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"none"}],{duration:360,delay:i*35,easing:"cubic-bezier(.2,1,.3,1)",fill:"backwards"}))}
}
function feGo(v: string){
  if(v==="editor"){FE.view="editor";feRender(true);return}
  FE.view=v;FE.lq="";feRender(true);
}
function feOpenForm(id: string,tab?: string){
  feS!.cur=id;feDoc();FE.view="editor";FE.tab=tab||"editor";FE.page=0;FE.undo=[];FE.redo=[];FE.pv.step=0;FE.pv.done=false;FE.pv.err={};FE.pv.vals={};
  const p=feDoc()!.pages[0];FE.sel=p?.sections[0]?.fields[0]?.id||null;FE.ptab="field";feSave();feRender(true);
}
function feNewForm(kind: string,name?: unknown){
  const id="f"+Date.now().toString(36);const d=kind==="patients"?Object.assign(feSeedMain(),{title:name||"fe_dTitle"}):feMakeDoc(kind||"blank",name as FeLabel);
  d.status="draft";d.everPub=false;feS!.docs[id]=d;feS!.forms.push({id,cat:d.cat,kind:kind||"blank",status:"draft",resp:0,upd:Date.now(),owner:"me"});feS!.ver[id]=[];
  feOpenForm(id);feToast(t("fe_created"));
}

/* ---------- field / section / page operations ---------- */
function feSelect(fid: string | null,o: { props?: boolean; scroll?: boolean; quiet?: boolean; pulse?: boolean; [k: string]: unknown }={}){
  const R=feRoot();FE.sel=fid;const r=fid&&feFind(fid);if(r){FE.selSec=r.s.id;if(r.pi!==FE.page){FE.page=r.pi;feRefresh("canvas")}}
  R?.querySelectorAll<HTMLInputElement>(".fe-cv .fe-fld").forEach(el=>{const on=el.dataset.fid===fid;el.classList.toggle("on",on);el.setAttribute("aria-pressed",(on) as unknown as string)});
  if(o.tab!==false&&FE.ptab!=="field"){FE.ptab="field"}
  feRenderProps();
  const el=R?.querySelector<HTMLInputElement>(`.fe-cv .fe-fld[data-fid="${fid}"]`);
  if(el){if(o.scroll)el.scrollIntoView({block:"nearest",behavior:feRM()?"auto":"smooth"});if(o.pulse&&!feRM())el.animate([{boxShadow:"0 0 0 0 rgba(90,100,224,.45)"},{boxShadow:"0 0 0 10px rgba(90,100,224,0)"}],{duration:700});if(o.focus)el.focus({preventScroll:true})}
  if(o.props&&R&&R.offsetWidth<1040){R.classList.add("o-props")}
}
let feAddField=function(type: string,o: Bag={}){
  let f;feFlip(()=>feMut(d=>{
    const p=d.pages[FE.page];let s=o.sid?feFindBox(o.sid as string):null,idx=o.idx as number | undefined;
    if(!s){const r=FE.sel&&feFind(FE.sel);if(r&&r.pi===FE.page){if(r.f.type==="group"&&!r.f.col&&type!=="group"){s=r.f;idx=r.f.fields!.length}else{s=r.s;idx=r.i+1}}else{s=p.sections[p.sections.length-1];idx=s?.fields.length}}
    if(!s){s={id:feId(),title:"fe_newSec",cols:2,fields:[]};p.sections.push(s);idx=0}
    f=feNewField(type,o.label as FeLabel);s.fields!.splice(idx??s.fields!.length,0,f);s.col=false;FE.sel=f.id;FE.ptab="field";
  },"canvas"));
  feSelect(f!.id,{scroll:true,pulse:true});if(!o.quiet)feToast(t("fe_fieldAdded",{x:fv(f!.label,feCL())}));return f;
}
function feDelField(fid: string){
  const r=feFind(fid);if(!r)return;const name=fv(r.f.label,feCL());
  const el=feRoot()?.querySelector<HTMLInputElement>(`.fe-cv .fe-fld[data-fid="${fid}"]`);
  const go=()=>{feFlip(()=>feMut(d=>{const x=feFind(fid);x!.s.fields!.splice(x!.i,1);feEach(f=>{if(f.logic&&!feFind(f.logic.src))delete f.logic});if(FE.sel===fid){const nx=x!.s.fields![x!.i]||x!.s.fields![x!.i-1];FE.sel=nx?.id||null}},"canvas"));feToast(t("fe_fieldDeleted",{x:name}),()=>feUndo())};
  if(el&&!feRM())el.animate([{opacity:1,transform:"none"},{opacity:0,transform:"scale(.92)"}],{duration:180,easing:"ease-in"}).finished.then(go);else go();
}
function feDupField(fid: string){const r=feFind(fid);if(!r)return;let n;feFlip(()=>feMut(()=>{n=JSON.parse(JSON.stringify(r.f));feReId(n);if(typeof n.label==="string"&&!n.label.startsWith("fe_"))n.label+=" (2)";r.s.fields!.splice(r.i+1,0,n);FE.sel=n.id},"canvas"));feSelect(n!.id,{pulse:true});feToast(t("fe_dupDone"))}
function feMoveField(fid: string,sid: string,idx: number){const r0=feFind(fid);if(r0&&r0.f.type==="group"){let inside=sid===fid;feWalk(r0.f.fields||[],x=>{if(x.id===sid)inside=true});if(inside)return}feFlip(()=>feMut(d=>{const r=feFind(fid);if(!r)return;r.s.fields!.splice(r.i,1);const t2=feFindBox(sid);if(t2===r.s&&idx>r.i)idx--;t2!.fields!.splice(Math.min(idx,t2!.fields!.length),0,r.f);t2!.col=false},"canvas"));feSelect(fid,{tab:false})}
function feAddSection(title?: FeLabel | null,types?: string[]): FeSection{
  let s!: FeSection;feFlip(()=>feMut(d=>{const p=d.pages[FE.page];s={id:feId(),title:title||"fe_newSec",cols:2,fields:[]};p.sections.push(s);(types&&types.length?types:["text"]).forEach(ty=>s.fields.push(feNewField(ty)));FE.sel=s.fields[0].id;FE.selSec=s.id},"canvas"));
  const el=feRoot()?.querySelector<HTMLInputElement>(`.fe-sec[data-sid="${s.id}"]`);el?.scrollIntoView({block:"center",behavior:feRM()?"auto":"smooth"});feSelect(FE.sel,{});feToast(t("fe_secAdded"));return s;
}
let feSecMenu=function(sid: string,x: number,y: number){
  const r=feFindSec(sid);if(!r)return;
  osMenu(x,y,[{l:t("fe_renameSec"),ic:FEI.text,run:()=>feInlineEdit(feRoot()!.querySelector<HTMLInputElement>(`.fe-sec[data-sid="${sid}"] h3`)!,v=>feMut(()=>{r.s.title=v},"canvas"))},
    {l:t("fe_dupSec"),ic:FEI.copy,run:()=>feDupSec(sid)},{l:t(r.s.col?"fe_expand":"fe_collapse"),ic:FEI.chev,run:()=>feColSec(sid)},"-",
    {l:t("fe_moveUp"),ic:FEI.undo,disabled:r.i===0,run:()=>feFlip(()=>feMut(()=>{const a=r.p.sections;a.splice(r.i-1,0,a.splice(r.i,1)[0])},"canvas"))},
    {l:t("fe_moveDown"),ic:FEI.redo,disabled:r.i===r.p.sections.length-1,run:()=>feFlip(()=>feMut(()=>{const a=r.p.sections;a.splice(r.i+1,0,a.splice(r.i,1)[0])},"canvas"))},
    ...(feDoc()!.pages.length>1?[{l:t("fe_moveToPage"),ic:FEI.layers,sub:feDoc()!.pages.map((p,pi)=>({l:t("fe_page",{n:nf(pi+1)})+" · "+fv(p.title,feCL()),disabled:pi===r.pi,run:()=>feMut(()=>{r.p.sections.splice(r.i,1);feDoc()!.pages[pi].sections.push(r.s);FE.page=pi},"canvas")}))}]:[]),
    "-",{l:t("fe_delSec"),ic:FEI.del,danger:true,run:()=>feDelSec(sid)}]);
}
function feDupSec(sid: string){const r=feFindSec(sid);feFlip(()=>feMut(()=>{const c=JSON.parse(JSON.stringify(r!.s));c.id=feId();c.fields.forEach(feReId);r!.p.sections.splice(r!.i+1,0,c)},"canvas"));feToast(t("fe_dupDone"))}
function feDelSec(sid: string){const r=feFindSec(sid);if(!r)return;const go=()=>{feFlip(()=>feMut(()=>{r.p.sections.splice(r.i,1);if(FE.sel&&!feFind(FE.sel))FE.sel=null},"canvas"));feToast(t("fe_secDeleted"),()=>feUndo())};const el=feRoot()?.querySelector<HTMLInputElement>(`.fe-sec[data-sid="${sid}"]`);if(el&&!feRM())el.animate([{opacity:1},{opacity:0,transform:"scale(.97)"}],{duration:200}).finished.then(go);else go()}
function feColSec(sid: string){const r=feFindSec(sid);if(!r)return;const el=feRoot()?.querySelector<HTMLInputElement>(`.fe-sec[data-sid="${sid}"]`);const b=el?.querySelector<HTMLInputElement>(".fe-secb");
  feSnap();r.s.col=!r.s.col;feDirty();
  if(!el||feRM()){feRefresh("canvas");return}
  const btn=el.querySelector<HTMLInputElement>(".fe-scol");btn!.setAttribute("aria-expanded",(!r.s.col) as unknown as string);btn!.title=t(r.s.col?"fe_expand":"fe_collapse");
  if(r.s.col){const h=b!.scrollHeight;btn!.querySelector<HTMLInputElement>("svg")!.style.transform=document.documentElement.dir==="rtl"?"rotate(90deg)":"rotate(-90deg)";b!.animate([{height:h+"px",opacity:1},{height:"0px",opacity:0,paddingTop:"0px",paddingBottom:"0px"}],{duration:300,easing:"cubic-bezier(.3,1,.4,1)"}).finished.then(()=>{btn!.querySelector<HTMLInputElement>("svg")!.style.transform="";el.classList.toggle("col",!!feFindSec(sid)?.s.col)})}
  else{el.classList.remove("col");b!.animate([{height:"0px",opacity:0,paddingTop:"0px",paddingBottom:"0px"},{height:b!.scrollHeight+"px",opacity:1}],{duration:340,easing:"cubic-bezier(.3,1,.4,1)"})}
  if(FE.ptab==="section")feRenderProps();
}
function feSetPage(i: number){
  if(i===FE.page)return;const dir=i>FE.page?1:-1;FE.page=i;const r=FE.sel&&feFind(FE.sel);if(!r||r.pi!==i)FE.sel=fePage().sections[0]?.fields[0]?.id||null;
  feRefresh("canvas");const p=feRoot()?.querySelector<HTMLInputElement>(".fe-paper");const rtl=document.documentElement.dir==="rtl"?-1:1;
  if(p&&!feRM())p.animate([{opacity:0,transform:`translateX(${dir*28*rtl}px)`},{opacity:1,transform:"none"}],{duration:360,easing:"cubic-bezier(.2,1,.3,1)"});
  feRoot()?.querySelector<HTMLInputElement>(".fe-cv")?.scrollTo({top:0});
}
function feAddPage(){feMut(d=>{d.pages.push({id:feId(),title:"fe_newPage",sections:[{id:feId(),title:"fe_newSec",cols:2,fields:[feNewField("text")]}]})},null);feSetPage(feDoc()!.pages.length-1);const b=feRoot()?.querySelector<HTMLInputElement>(".fe-pg.on");if(b&&!feRM())b.animate([{transform:"scale(.6)",opacity:0},{transform:"none",opacity:1}],{duration:420,easing:"cubic-bezier(.2,1.4,.3,1)"});feToast(t("fe_pageAdded"))}
let fePageMenu=function(i: number,x: number,y: number){const d=feDoc();
  osMenu(x,y,[{l:t("fe_renamePage"),ic:FEI.text,run:()=>feInlineEdit(feRoot()!.querySelector<HTMLInputElement>(`.fe-pg[data-pg="${i}"] .tx span`)!,v=>feMut(()=>{d!.pages[i].title=v},"canvas"))},
    {l:t("fe_moveLeft"),ic:FEI.back,disabled:i===0,run:()=>{feMut(()=>{d!.pages.splice(i-1,0,d!.pages.splice(i,1)[0]);FE.page=i-1},"canvas")}},
    {l:t("fe_moveRight"),ic:FEI.chevR,disabled:i===d!.pages.length-1,run:()=>{feMut(()=>{d!.pages.splice(i+1,0,d!.pages.splice(i,1)[0]);FE.page=i+1},"canvas")}},"-",
    {l:t("fe_delPage"),ic:FEI.del,danger:true,disabled:d!.pages.length<2,run:()=>{feMut(()=>{d!.pages.splice(i,1);FE.page=Math.max(0,Math.min(FE.page,d!.pages.length-1));if(FE.sel&&!feFind(FE.sel))FE.sel=null},"canvas");feToast(t("fe_pageDeleted"),()=>feUndo())}}]);
}
function feInlineEdit(el: HTMLElement,commit: (v: string) => void){
  if(!el)return;const old=el.textContent;el.contentEditable="plaintext-only";if(el.contentEditable!=="plaintext-only")el.contentEditable="true";el.classList.add("fe-editing");el.focus();
  const rg=document.createRange();rg.selectNodeContents(el);const s=getSelection();s!.removeAllRanges();s!.addRange(rg);
  const end=(ok: boolean)=>{el.removeEventListener("keydown",kd);el.removeEventListener("blur",bl);el.contentEditable="false";el.classList.remove("fe-editing");FE.editingTitle=false;const v=el.textContent.replace(/\s+/g," ").trim();if(ok&&v&&v!==old)commit(v);else el.textContent=old};
  const kd=(e: { key: string; preventDefault: () => void; stopPropagation: () => void; })=>{if(e.key==="Enter"){e.preventDefault();end(true)}else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();end(false)}};const bl=()=>end(true);
  el.addEventListener("keydown",kd);el.addEventListener("blur",bl);
}
function feChangeType(x: number,y: number){const r=feFind(FE.sel);if(!r)return;
  const ok=["text","textarea","email","phone","select","multi","date","number","file"];
  osMenu(x,y,ok.map(ty=>({l:t(FE_T[ty][1]),ic:FEI[FE_T[ty][0]],check:undefined,disabled:ty===r.f.type,run:()=>feMut(()=>{const f=r.f;f.type=ty;if(["select","multi"].includes(ty)&&!f.opts)f.opts=[1,2,3].map(n=>t("fe_opt",{n}));if(ty==="select"&&!f.disp)f.disp="list";if(!FE_TXT.has(ty)&&ty!=="number"){delete f.min;delete f.max;delete f.regex}f.w=FE_WIDE.has(ty)?2:(f.w||1)},"canvas")})));
}

/* ---------- AI assistant ---------- */
const FE_KW: [RegExp, string][]=[[/oui.{0,3}non|yes.{0,3}no|ja.{0,3}nein|نعم/i,"yesno"],[/\btableau|\btable\b|tabelle|جدول/i,"table"],[/graphique|\bgraph|chart|diagramm|courbe|رسم بياني/i,"chart"],[/[ée]toiles?|\bstars?\b|sterne|نجوم/i,"rating"],[/curseur|slider|schieberegler|منزلق/i,"slider"],[/s[ée]parateur|divider|trennlinie|فاصل/i,"divider"],[/information|avertissement|notice|hinweis|تنبيه/i,"info"],[/e-?mail|courriel/i,"email"],[/t[ée]l[ée]phone|phone|telefon|هاتف|portable|mobile/i,"phone"],[/signature|unterschrift|توقيع/i,"sign"],[/\bnps\b|recommand|empfehl/i,"nps"],[/satisf|zufrieden|رضا/i,"sat"],[/allerg|حساسي/i,"allergy"],[/m[ée]dicament|traitement|medica|medikament|دواء|أدوية/i,"meds"],[/ant[ée]c[ée]dent|medical history|vorerkrank|سوابق/i,"history"],[/signes? vitaux|vital|tension|blutdruck|العلامات الحيوية/i,"vitals"],[/douleur|pain|schmerz|\beva\b|ألم/i,"clinical"],[/matri/i,"matrix"],[/classe|classement|\brank|rangfolge|ترتيب/i,"rank"],[/date|naissance|birth|geburt|datum|تاريخ/i,"date"],[/nombre|number|zahl|\bâge|\bage\b|alter|عدد|عمر/i,"number"],[/fichier|\bfile|datei|pi[eè]ce jointe|upload|ملف/i,"file"],[/choix multiples?|cases? à cocher|checkbox|multiple|mehrfach|متعدد/i,"multi"],[/liste|s[ée]lection|select|dropdown|auswahl|قائمة/i,"select"],[/commentaire|long|paragraph|remarque|observation|kommentar|ملاحظ|تعليق/i,"textarea"],[/patient|مريض/i,"patient"]];
const feCap=(s: string)=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
function feMatchField(s: string){const q=s.toLowerCase();let best=null as FeField | null,bl=0;feEach(f=>{for(const L of [feCL(),"fr","en","de","ar"]){const lb=fv(f.label,L).toLowerCase();if(lb.length>bl&&q.includes(lb)){best=f;bl=lb.length}}});return best}
let feAiLocal=function(q: string): FeOp[]{
  const s=q.trim();if(!s)return [];
  if(/tradu|translat|[üu]bersetz|ترجم/i.test(s)){const L=/angl|engl|إنجليز|الإنجليزية/i.test(s)?"en":/allem|german|deutsch|ألمان/i.test(s)?"de":/arab|عرب/i.test(s)?"ar":/fran[cç]|french|franz|فرنس/i.test(s)?"fr":null;if(L)return [{op:"tr",lang:L}]}
  if(/oblig|required|mandatory|pflicht|erforderlich|إلزامي|مطلوب/i.test(s)){const f=feMatchField(s);if(f)return [{op:"req",fid:f.id}]}
  const adding=/ajout|ajoute|add|cr[ée]e|ins[èe]re|hinzu|f[üu]ge|neu|أضف|أنشئ/i.test(s);
  if(adding&&/section|abschnitt|قسم/i.test(s)&&!/champ|field|feld|حقل|question/i.test(s)){const m=s.match(/[«"“']([^»"”']+)[»"”']/)||s.match(/(?:section|abschnitt|قسم)\s+(.{2,40})$/i);return [{op:"sec",title:m?feCap(m[1].trim()):null}]}
  if(adding){
    const m=s.match(/[«"“']([^»"”']+)[»"”']/);let lab=m?m[1].trim():s.replace(/^.*?\b(champs?|fields?|feld(er)?|questions?|حقل)\b\s*(de type\s+\S+\s*)?(pour|for|f[üu]r|nommé|named|:)?\s*(le|la|les|l’|l'|un|une|a|an|the|das|die|der)?\s*/i,"").replace(/[.?!]+$/,"").trim();
    if(lab===s.trim())lab="";let type="text";for(const [re,ty] of FE_KW)if(re.test(s)){type=ty;break}
    return [{op:"add",type,label:lab&&lab.length<60?feCap(lab):null}];
  }
  const types: string[]=[];for(const [re,ty] of FE_KW)if(re.test(s)&&!types.includes(ty))types.push(ty);
  if(types.length)return [{op:"sec",title:s.length<48?feCap(s):null,types}];
  return [];
}
function feAiApply(ops: FeOp[]){
  let n=0,msg="";
  for(const o of ops){
    if(o.op==="add"&&FE_T[o.type!]){const sec=o.section?fePage().sections.find(x=>fv(x.title,feCL()).toLowerCase()===String(o.section).toLowerCase()):null;feAddField(o.type!,{label:o.label||undefined,sid:sec?.id,quiet:true});n++;msg=t("fe_fieldAdded",{x:o.label||t(FE_T[o.type!][1])})}
    else if(o.op==="sec"){const types=(o.types||o.fields?.map(x=>x.type)||[]).filter(x=>FE_T[x]);const s=feAddSection(o.title||null,types);if(o.fields)feMut(()=>{o.fields!.forEach((x,i)=>{if(s.fields[i]&&x.label)s.fields[i].label=x.label})},"canvas");n++;msg=t("fe_secAdded")}
    else if(o.op==="req"){const f=o.fid?feFind(o.fid)?.f:feMatchField(String(o.label||""));if(f){feMut(()=>{f.req=true},"canvas");feSelect(f.id,{scroll:true,pulse:true});n++;msg=t("fe_reqDone",{x:fv(f.label,feCL())})}}
    else if(o.op==="tr"&&["fr","en","de","ar"].includes(o.lang as string)){feTranslate(o.lang as string);n++;msg=""}
  }
  if(n&&msg)feToast(n>1?t("fe_aiDone",{n:nf(n)}):msg);
  return n;
}
function feTranslate(L: string){
  let custom=0;feEach(f=>{if(typeof f.label==="string"&&!f.label.startsWith("fe_"))custom++});
  const cv=feRoot()?.querySelector<HTMLInputElement>(".fe-paper");
  const go=()=>{feMut(d=>{d.lang=L===lang()?null:L},"all");const p=feRoot()?.querySelector<HTMLInputElement>(".fe-paper");if(p&&!feRM())p.animate([{opacity:0,filter:"blur(3px)"},{opacity:1,filter:"none"}],{duration:420})};
  if(cv&&!feRM())cv.animate([{opacity:1},{opacity:.2}],{duration:160}).finished.then(go);else go();
  feToast(t("fe_trDone",{x:t("fe_L"+L)})+(custom?" · "+t("fe_trCustom",{n:nf(custom)}):""));
}
function feAiReq(){let f=FE.sel&&feFind(FE.sel)?.f;if(!f||f.req){f=null;for(const s of fePage().sections)for(const x of s.fields)if(!f&&!x.req&&!["hidden","calc"].includes(x.type))f=x}
  if(!f){feToast(t("fe_allReq"));return}feMut(()=>{f.req=true},"canvas");feSelect(f.id,{scroll:true,pulse:true});feToast(t("fe_reqDone",{x:fv(f.label,feCL())}))}
function feAiLogic(){
  const f=FE.sel&&feFind(FE.sel)?.f;const cands=feSrcCands(f as FeField | null);const src=cands.find(x=>x.type==="select"&&(x.opts||[]).length)||cands[0];
  if(!f||!src){feToast(t("fe_noLogicSrc"));return}
  if(f.logic){FE.ptab="field";FE.dto!.logic=true;feRenderProps();feRoot()?.querySelector<HTMLInputElement>('[data-dt="logic"]')?.scrollIntoView({block:"nearest"});return}
  feMut(()=>{f.logic={src:src.id,op:"eq",val:src.opts?.length?"0":"",act:"show"}},"canvas");FE.ptab="field";FE.dto=FE.dto||{};FE.dto.logic=true;feSelect(f.id,{pulse:true});
  const R=feRoot();if(R&&R.offsetWidth<1040)R.classList.add("o-props");setTimeout(()=>{const dt=R?.querySelector<HTMLInputElement>('.fe-ed [data-dt="logic"]');dt?.scrollIntoView({block:"nearest",behavior:"smooth"});if(dt&&!feRM())dt.animate([{background:"rgba(90,100,224,.14)"},{background:"transparent"}],{duration:1200})},60);
  feToast(t("fe_logicDone",{x:fv(f.label,feCL())}));
}
let feAiRun=async function(text: string,src?: string){
  const q=String(text||"").trim();if(!q)return;const R=feRoot();
  if(FE.view!=="editor"||FE.tab!=="editor"){FE.view="editor";FE.tab="editor";feRender(false)}
  const busy=(on: boolean|undefined)=>{feRoot()?.querySelector<HTMLInputElement>(".fe-aibar")?.classList.toggle("busy",on);const g=feRoot()?.querySelector<HTMLInputElement>("[data-genbtn]");if(g)g.disabled=on!};
  let ops=feAiLocal(q);
  if(!ops.length&&feS!.set.ai!==false){
    busy(true);feToast(t("fe_aiThinking"));
    const S=await aiGetSample();
    if(S){try{
      const L=feCL(),fields: string[]=[];fePage().sections.forEach(s=>s.fields.forEach(f=>fields.push(`${fv(s.title,L)} > ${fv(f.label,L)} (${f.type}${f.req?", required":""})`)));
      const prompt=`You edit a healthcare form builder. Reply ONLY with a JSON array of operations, no prose.\nAllowed operations:\n{"op":"add","type":TYPE,"label":"…","section":"existing section title (optional)"}\n{"op":"sec","title":"…","fields":[{"type":TYPE,"label":"…"}]}\n{"op":"req","label":"existing field label"}\n{"op":"tr","lang":"fr|en|de|ar"}\nTYPE is one of: ${Object.keys(FE_T).join(", ")}.\nWrite labels in this language: ${LANGS[L].name}.\nCurrent page fields:\n${fields.join("\n")}\n\nRequest: ${q}`;
      const r=await S([{role:"user",content:prompt}],{cache:false});const m=String(r.text||"").match(/\[[\s\S]*\]/);if(m){try{ops=JSON.parse(m[0])}catch(e){ops=[]}}
    }catch(e){ops=[]}}
    busy(false);
  }
  const n=Array.isArray(ops)?feAiApply(ops as FeOp[]):0;
  if(!n)feToast(t("fe_aiNone"));
  else{const i=feRoot()?.querySelector<HTMLInputElement>("[data-aiin]");if(i)i.value="";const g=feRoot()?.querySelector<HTMLInputElement>("[data-gen]");if(g&&src==="gen")g.value=""}
}
function feToggleAsk(on?: boolean){
  FE.ask=on??!FE.ask;const R=feRoot(),f=R?.querySelector<HTMLInputElement>("[data-aiask]"),b=R?.querySelector<HTMLInputElement>('[data-ai="ask"]');if(!f)return;
  f.classList.toggle("on",FE.ask);b?.setAttribute("aria-expanded",(FE.ask) as unknown as string);
  if(FE.ask){if(!feRM())f.animate([{opacity:0,transform:"translateY(8px) scale(.98)"},{opacity:1,transform:"none"}],{duration:280,easing:"cubic-bezier(.2,1.2,.3,1)"});setTimeout(()=>f.querySelector<HTMLInputElement>("input")!.focus(),30)}
}

/* ---------- publish & menus ---------- */
function fePublish(){
  const d=feDoc();feSnap();d!.status="pub";d!.everPub=true;const vs=feS!.ver[feS!.cur]=feS!.ver[feS!.cur]||[];const n=(vs[vs.length-1]?.n||0)+1;vs.push({n,at:Date.now(),by:"me",pub:true,snap:JSON.stringify(d)});
  const e=feEntry(feS!.cur);if(e){e.status="pub";e.upd=Date.now()}feCommit("silent");feSyncHead();if(FE.tab==="versions"||FE.tab==="share")feRefresh("tab");
  const p=feRoot()?.querySelector<HTMLInputElement>(".fe-pill");if(p&&!feRM())p.animate([{transform:"scale(.4)",opacity:0},{transform:"scale(1.15)",opacity:1},{transform:"none"}],{duration:520,easing:"cubic-bezier(.2,1.4,.3,1)"});
  feToast(t("fe_pubDone",{n:nf(n)}));
}
function feSaveVersion(){const d=feDoc(),vs=feS!.ver[feS!.cur]=feS!.ver[feS!.cur]||[];const n=(vs[vs.length-1]?.n||0)+1;vs.push({n,at:Date.now(),by:"me",pub:false,snap:JSON.stringify(d)});feCommit("silent");feToast(t("fe_verSaved",{n:nf(n)}));if(FE.tab==="versions")feRefresh("tab")}
function feDownload(name: string,text: string,_mime?: string){feCopy(text,t("fe_exportCopied",{x:name}));return true}
function feCopy(text: string,msg?: string){const ok=()=>feToast(msg||t("fe_copied"));try{navigator.clipboard.writeText(text).then(ok,()=>{feCopyFallback(text);ok()})}catch(e){feCopyFallback(text);ok()}}
function feCopyFallback(text: string){const ta=document.createElement("textarea");ta.value=text;ta.style.cssText="position:fixed;opacity:0";document.body.appendChild(ta);ta.select();try{document.execCommand("copy")}catch(e){}ta.remove()}
function feMoreMenu(x: number,y: number){const d=feDoc(),id=feS!.cur;
  osMenu(x,y,[{l:t("fe_rename"),ic:FEI.text,run:()=>{const h=feRoot()?.querySelector<HTMLInputElement>(".fe-title");FE.editingTitle=true;feInlineEdit(h!,v=>{feMut(dd=>{dd.title=v},null);feSyncHead();feRefresh("none")})}},
    {l:t("fe_dup"),ic:FEI.copy,run:()=>feDupForm(id)},{l:t("fe_export"),ic:FEI.upload,run:()=>{feDownload(feSlug(fv(d!.title,"fr"))+".json",JSON.stringify(d,null,2),"application/json") }},
    {l:t("fe_t_share"),ic:FEI.link,run:()=>feSetTab("share")},{l:t("fe_t_auto"),ic:FEI.auto,run:()=>feSetTab("auto")},"-",
    ...(d!.status==="pub"?[{l:t("fe_unpublish"),ic:FEI.undo,run:()=>{feMut(dd=>{dd.status="draft"},null);const e=feEntry(id);if(e)e.status="draft";feSyncHead();feToast(t("fe_draftAgain"))}}]:[]),
    {l:t("fe_archive"),ic:FEI.archive,run:()=>{const e=feEntry(id);if(e){e.arch=true;feSave();feGo("list:arch");feToast(t("fe_archivedT"),()=>{e.arch=false;feSave();feOpenForm(id)})}}},
    {l:t("fe_delete"),ic:FEI.del,danger:true,run:()=>{const e=feEntry(id);if(e){e.del=true;feSave();feGo("list:"+d!.cat);feToast(t("fe_deletedT"),()=>{e.del=false;feSave();feOpenForm(id)})}}}]);
}
function feDupForm(id: string){const e=feEntry(id);if(!e)return;const nid="f"+Date.now().toString(36);const src=feS!.docs[id]?JSON.parse(JSON.stringify(feS!.docs[id])):feMakeDoc(e.kind!,e.name);src.title=t("fe_copyOf",{x:fv(src.title,lang())});src.status="draft";src.everPub=false;feS!.docs[nid]=src;feS!.forms.push({id:nid,cat:src.cat,kind:e.kind,status:"draft",resp:0,upd:Date.now(),owner:"me"});feS!.ver[nid]=[];feSave();feToast(t("fe_dupDone"));return nid}
function feRowMenu(id: string,x: number,y: number){const e=feEntry(id);if(!e)return;
  const items=e.del?[{l:t("fe_restore"),ic:FEI.undo,run:()=>{e.del=false;feSave();feRender();feToast(t("fe_restoreT"))}},{l:t("fe_delForever"),ic:FEI.del,danger:true,run:()=>{feS!.forms=feS!.forms.filter(f=>f!==e);delete feS!.docs[id];if(feS!.cur===id)feS!.cur=feS!.forms.find(f=>!f.del)?.id||feS!.forms[0]?.id;feSave();feRender()}}]
    :[{l:t("fmOpen"),ic:FEI.eye,run:()=>feOpenForm(id)},{l:t("fe_dup"),ic:FEI.copy,run:()=>{feDupForm(id);feRender()}},e.arch?{l:t("fe_unarchive"),ic:FEI.undo,run:()=>{e.arch=false;feSave();feRender();feToast(t("fe_restoreT"))}}:{l:t("fe_archive"),ic:FEI.archive,run:()=>{e.arch=true;feSave();feRender();feToast(t("fe_archivedT"))}},"-",{l:t("fe_delete"),ic:FEI.del,danger:true,run:()=>{e.del=true;feSave();feRender();feToast(t("fe_deletedT"),()=>{e.del=false;feSave();feRender()})}}];
  osMenu(x,y,items);
}

/* ---------- preview behaviour ---------- */
let fePvRender=function(dir?: number){
  const R=feRoot();if(!R)return;const pv=R.querySelector<HTMLInputElement>(".fe-pv");if(!pv){R.querySelector<HTMLInputElement>(".fe-body")!.innerHTML=fePreviewHTML();fePvAfter();return}
  const fr=pv.querySelector<HTMLInputElement>(".fe-frame"),ph=pv.querySelector<HTMLInputElement>(".fe-phc"),s1=fr!.scrollTop,s2=ph!.scrollTop;
  fr!.innerHTML=fePvForm("d");ph!.innerHTML=fePvForm("m");
  if(dir===undefined){fr!.scrollTop=s1;ph!.scrollTop=s2}else{fr!.scrollTop=0;ph!.scrollTop=0}
  fePvAfter();
  if(dir&&!feRM()){const rtl=document.documentElement.dir==="rtl"||feS!.pv.lang==="ar"?-1:1;pv.querySelectorAll<HTMLInputElement>(".fe-pfp").forEach(p=>p.animate([{opacity:0,transform:`translateX(${dir*26*rtl}px)`},{opacity:1,transform:"none"}],{duration:360,easing:"cubic-bezier(.2,1,.3,1)"}));pv.querySelectorAll<HTMLInputElement>(".fe-prog i").forEach(i=>i.animate([{width:i.dataset.from||"0%"},{width:i.style.width}],{duration:500,easing:"cubic-bezier(.3,1,.4,1)"}))}
}
function fePvOptsRender(){const R=feRoot(),o=R?.querySelector<HTMLInputElement>(".fe-pvo");if(!o)return;const st=o.querySelector<HTMLInputElement>(".fe-pb")?.scrollTop||0;o.innerHTML=fePvOptsHTML();o.querySelector<HTMLInputElement>(".fe-pb")!.scrollTop=st}
function fePvAfter(){
  const R=feRoot();if(!R)return;
  R.querySelectorAll<HTMLCanvasElement>(".fe-pf canvas[data-sign]").forEach(cv=>{const v=FE.pv.vals[cv.dataset.k!];const c=cv.getContext("2d");c!.clearRect(0,0,cv.width,cv.height);if(v&&String(v).startsWith("data:")){const im=new Image();im.onload=()=>c!.drawImage(im,0,0,cv.width,cv.height);im.src=v as string}});
}
function fePvSet(k: string,sk: string | null | undefined,val: unknown,el?: HTMLInputElement | null){
  const vals=FE.pv.vals;
  if(sk!=null&&sk!==""){if(/^\d+\.\w+$/.test(sk)){const [i,f]=sk.split(".");const tf=feFind(k)?.f;const arr=Array.isArray(vals[k])?vals[k]:(tf?.type==="table"?feTblRows(tf,vals):[]);while(arr.length<=+i)arr.push({});arr[+i][f]=val;vals[k]=arr}else{const o=(vals[k]&&typeof vals[k]==="object"&&!Array.isArray(vals[k])?vals[k]:{}) as Bag;o[sk]=val;vals[k]=o}}
  else vals[k]=val;
  if(FE.pv.err[k]){delete FE.pv.err[k];const box=feRoot()?.querySelectorAll<HTMLInputElement>(`.fe-pfld[data-pf="${k}"]`);box?.forEach(b=>{b.classList.remove("err");b.querySelector<HTMLInputElement>(".fe-perr")?.remove()})}
  /* keep the other frame in sync without re-rendering the one being typed in */
  if(el){const other=feRoot()?.querySelectorAll<HTMLInputElement>(`.fe-pf:not([data-u="${el.closest<HTMLInputElement>(".fe-pf")!.dataset.u}"]) [data-k="${k}"]${sk!=null&&sk!==""?`[data-sk="${sk}"]`:""}`);other?.forEach(o=>{if(o.type==="radio"||o.type==="checkbox")o.checked=o.value===val||(Array.isArray(vals[k])&&vals[k].includes(o.value));else if(o.type!=="file")o.value=val as string})}
  fePvCharts();fePvTotals(k);
  let dep=false;feEach(f=>{if(f.logic?.src===k)dep=true});if(dep||feDoc()!.pages.some(p=>p.sections.some(s=>s.fields.some(f=>f.type==="calc"))))clearTimeout(FE.pvT),FE.pvT=setTimeout(()=>{const a=document.activeElement as HTMLInputElement | null;const sel=a?.dataset?.k?`.fe-pf[data-u="${a.closest<HTMLInputElement>(".fe-pf")?.dataset.u}"] [data-k="${a.dataset.k}"]${a.dataset.sk?`[data-sk="${a.dataset.sk}"]`:""}`:null;const pos=a&&"selectionStart" in a?a.selectionStart:null;fePvRender();if(sel){const n=feRoot()?.querySelector<HTMLInputElement>(sel);if(n&&n.type!=="radio"&&n.type!=="checkbox"){n.focus({preventScroll:true});try{if(pos!=null)n.setSelectionRange(pos,pos)}catch(e){}}}},el&&(el.type==="text"||el.tagName==="TEXTAREA"||el.type==="email"||el.type==="tel")?500:0);
}
function fePvTotals(k: string){const f=feFind(k)?.f;if(!f||f.type!=="table"||!f.tsum||f.tsum==="none")return;const rows=feTblRows(f,FE.pv.vals),L=feS!.pv.lang||feCL();feRoot()?.querySelectorAll<HTMLInputElement>(`.fe-pf .fe-tab[data-tbl="${k}"] [data-tot]`).forEach(td=>{const ci=+td.dataset.tot!;if(f.tcols![ci]?.ty==="number"){const nv=feTblAgg(f,rows,ci,L);if(td.textContent!==nv){td.textContent=nv;if(!feRM())td.animate([{color:"var(--pc)"},{color:""}],{duration:500})}}})}
function feTblPaste(f: FeField,ri: number,ci: number,text: string,rows: Bag[],canGrow: boolean){
  const lines=text.replace(/\r/g,"").replace(/\n+$/,"").split("\n").map(l=>l.split("\t"));let n=0;const C=f.tcols||[];
  const norm=(c: FeTCol,x: string)=>{x=String(x).trim();if(c.ty==="number")return x.replace(/\s/g,"").replace(",",".");if(c.ty==="checkbox")return /^(1|x|✓|✔|oui|yes|ja|true|vrai|نعم|o|y)$/i.test(x)?"1":"";if(c.ty==="multi"){const O=feTOpts(c);return x.split(/[;,|]/).map(s=>s.trim()).filter(s=>s).map(s=>O.find(o=>o.toLowerCase()===s.toLowerCase())||s).join("|")}if(c.ty==="rating"){const n=Math.round(parseFloat(x.replace(",",".")));return n>=1&&n<=5?String(n):""}if(c.ty==="time"){const m=x.match(/^(\d{1,2})[:hH.](\d{2})/);return m?m[1].padStart(2,"0")+":"+m[2]:x}if(c.ty==="yesno")return /^(o|oui|y|yes|ja|j|نعم|1|true|x)$/i.test(x)?"y":/^(n|non|no|nein|لا|0|false)$/i.test(x)?"n":"";if(c.ty==="date"){const m=x.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);if(m){const y=m[3].length===2?"20"+m[3]:m[3];return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`}return x}return x};
  lines.forEach((cols,r)=>{const R2=ri+r;if(R2>=Math.max(rows.length,f.rows||1)&&!canGrow)return;while(rows.length<=R2)rows.push({});cols.forEach((x,c)=>{const C2=ci+c;if(C2>=C.length)return;rows[R2]["c"+C2]=norm(C[C2],x);n++})});
  return n;
}
function feTblRemap(f: FeField,map: (i: number) => number){const fix=(rows: unknown)=>Array.isArray(rows)&&rows.forEach((r,i)=>{if(!r)return;const o: Bag={};for(const k in r){const m=k.match(/^c(\d+)$/);if(!m){o[k]=r[k];continue}const ni=map(+m[1]);if(ni>=0)o["c"+ni]=r[k]}rows[i]=o});fix(f.tdef);fix(FE.pv.vals[f.id]);feEach(x=>{if(x.type==="chart"&&x.csrc==="tbl:"+f.id){const a=map(x.cx??0),b=map(x.cy??1);x.cx=a<0?0:a;x.cy=b<0?Math.min(1,f.tcols!.length-1):b}})}
function feTblColFocus(f: FeField,ci: number){setTimeout(()=>{const i=feRoot()?.querySelector<HTMLInputElement>(`.fe-cv .fe-tab[data-tbl="${f.id}"] [data-thl="${ci}"]`);if(i){i.focus();i.select();const th=i.closest<HTMLInputElement>("th");if(th&&!feRM())th.animate([{background:"var(--fe-soft)"},{background:"transparent"}],{duration:900})}},40)}
function feTblColIns(f: FeField,at: number){if(f.tcols!.length>=8)return;feMut(()=>{f.tcols!.splice(at,0,{l:t("fe_tCol",{n:f.tcols!.length+1}),ty:"text"});feTblRemap(f,i=>i>=at?i+1:i)},"canvas");feTblColFocus(f,at)}
function feTblColMove(f: FeField,a: number,b: number){feMut(()=>{[f.tcols![a],f.tcols![b]]=[f.tcols![b],f.tcols![a]];feTblRemap(f,i=>i===a?b:i===b?a:i)},"canvas");feTblColFocus(f,b)}
function feTblColDup(f: FeField,ci: number){if(f.tcols!.length>=8)return;feMut(()=>{const c=JSON.parse(JSON.stringify(f.tcols![ci]));c.l=fv(c.l,feCL())+" (2)";f.tcols!.splice(ci+1,0,c);feTblRemap(f,i=>i>ci?i+1:i);[f.tdef,FE.pv.vals[f.id]].forEach(rows=>Array.isArray(rows)&&rows.forEach(r=>{if(r&&r["c"+ci]!=null)r["c"+(ci+1)]=r["c"+ci]}))},"canvas");feTblColFocus(f,ci+1)}
function feTblColDel(f: FeField,ci: number){if(f.tcols!.length<2)return;const th=feRoot()?.querySelectorAll<HTMLInputElement>(`.fe-cv .fe-tab[data-tbl="${f.id}"] tr>:nth-child(${ci+2})`);const go=()=>{feMut(()=>{f.tcols!.splice(ci,1);feTblRemap(f,i=>i===ci?-1:i>ci?i-1:i)},"canvas");feToast(t("fe_tColDeleted"),()=>feUndo())};if(th?.length&&!feRM()){th.forEach(x=>x.animate([{opacity:1},{opacity:0}],{duration:180}));setTimeout(go,170)}else go()}
function feTblColMenu(f: FeField,ci: number,x: number,y: number){const C=f.tcols,c=C![ci],n=C!.length;
  osMenu(x,y,[{l:t("fe_cType"),ic:FEI.layers,sub:FE_CTY.map(ty=>({l:t("fe_ct_"+ty),check:(c.ty||"text")===ty,run:()=>{feMut(()=>{c.ty=ty;if((ty==="select"||ty==="multi")&&!c.opts)c.opts=t("fe_tOptsDef")},"canvas");feToast(t("fe_tTypeSet",{x:t("fe_ct_"+ty)}))}}))},
    ...(c.ty==="select"||c.ty==="multi"?[{l:t("fe_tEditOpts"),ic:FEI.text,run:()=>{FE.ptab="field";feSelect(f.id,{props:true});setTimeout(()=>{const i=feRoot()?.querySelector<HTMLInputElement>(`[data-tco="${ci}"]`);i?.scrollIntoView({block:"center",behavior:"smooth"});i?.focus()},120)}}]:[]),
    {l:t("fe_tColReq"),check:!!c.req,run:()=>feMut(()=>{c.req=!c.req},"canvas")},"-",
    {l:t("fe_tInsL"),ic:FEI.back,disabled:n>=8,run:()=>feTblColIns(f,ci)},{l:t("fe_tInsR"),ic:FEI.chevR,disabled:n>=8,run:()=>feTblColIns(f,ci+1)},
    {l:t("fe_moveLeft"),ic:FEI.back,disabled:ci===0,run:()=>feTblColMove(f,ci,ci-1)},{l:t("fe_moveRight"),ic:FEI.chevR,disabled:ci===n-1,run:()=>feTblColMove(f,ci,ci+1)},
    {l:t("fe_tColDup"),ic:FEI.copy,disabled:n>=8,run:()=>feTblColDup(f,ci)},"-",
    {l:t("fe_tColDel"),ic:FEI.del,danger:true,disabled:n<2,run:()=>feTblColDel(f,ci)}]);
}
function feTblRowMenu(f: FeField,ri: number,live: boolean,x: number,y: number){
  const rows=live?feTblRows(f,FE.pv.vals):(Array.isArray(f.tdef)?f.tdef:[]),n=Math.max(f.rows||1,rows.length,1),can=!live||f.addRows!==false;
  const apply=(fn: (r: Bag[]) => void,focusRi?: number)=>{if(live){const r=feTblRows(f,FE.pv.vals);while(r.length<n)r.push({});fn(r);FE.pv.vals[f.id]=r;fePvRender();fePvCharts();fePvTotals(f.id)}else feMut(()=>{f.tdef=Array.isArray(f.tdef)?f.tdef:[];while(f.tdef.length<n)f.tdef.push({});fn(f.tdef);(f as Bag).rows=Math.max(1,f.tdef.length)},"canvas");
    if(focusRi!=null){const tr=feRoot()?.querySelectorAll<HTMLInputElement>(`${live?".fe-pf[data-u=d]":".fe-cv"} .fe-tab[data-tbl="${f.id}"] tbody tr`)[focusRi];if(tr&&!feRM())tr.animate([{background:"color-mix(in srgb,var(--pc,var(--fe-acc)) 14%,transparent)"},{background:"transparent"}],{duration:900});tr?.querySelector<HTMLInputElement>("input,select,button:not(.fe-trn)")?.focus()}};
  osMenu(x,y,[{l:t("fe_tRowAbove"),ic:FEI.plus,disabled:!can,run:()=>apply(r=>r.splice(ri,0,{}),ri)},{l:t("fe_tRowBelow"),ic:FEI.plus,disabled:!can,run:()=>apply(r=>r.splice(ri+1,0,{}),ri+1)},{l:t("fe_tRowDup"),ic:FEI.copy,disabled:!can,run:()=>apply(r=>r.splice(ri+1,0,{...(r[ri]||{})}),ri+1)},"-",
    {l:t("fe_moveUp"),ic:FEI.undo,disabled:ri===0,run:()=>apply(r=>r.splice(ri-1,0,r.splice(ri,1)[0]),ri-1)},{l:t("fe_moveDown"),ic:FEI.redo,disabled:ri>=n-1,run:()=>apply(r=>r.splice(ri+1,0,r.splice(ri,1)[0]),ri+1)},
    {l:t("fe_tRowClear"),ic:FEI.x,run:()=>apply(r=>{r[ri]={}},ri)},"-",{l:t("fe_tRm"),ic:FEI.del,danger:true,disabled:n<2||!can,run:()=>apply(r=>r.splice(ri,1))}]);
}
function fePvCharts(){const R=feRoot();if(!R)return;const L=feS!.pv.lang||feCL();R.querySelectorAll<HTMLInputElement>(".fe-pf [data-chart]").forEach(el=>{const f=feFind(el.dataset.chart)?.f;if(f)el.innerHTML=feChartHTML(f,L,FE.pv.vals)})}
let fePvValidate=function(){
  const d=feDoc(),L=feS!.pv.lang||feCL(),p=d!.pages[FE.pv.step];if(!p)return true;const err: Dict={},vals=FE.pv.vals;
  for(const s of p.sections)for(const f of feVisLeaves(s.fields,vals)){const v=f.type==="table"?feTblRows(f,vals):vals[f.id],empty=feValStr(f,v,L)==null;
    if(feReqd(f,vals)&&empty){err[f.id]=feTx("fe_reqErr",L);continue}if(empty)continue;
    if(f.type==="table"){const rq=(f.tcols||[]).map((c,i)=>c.req?i:-1).filter(i=>i>=0);if(rq.length&&(v as FeAnsO[]).some(r=>r&&Object.values(r).some(x=>x!==""&&x!=null)&&rq.some(i=>!(r["c"+i]??"")))){err[f.id]=feTx("fe_tReqErr",L);continue}}
    if(f.type==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))err[f.id]=feTx("fe_mailErr",L);
    else if(FE_TXT.has(f.type)&&f.type!=="email"){const x=String(v);if(f.min&&x.length<f.min)err[f.id]=feTx("fe_minErr",L,{n:nf(f.min)});else if(f.max&&x.length>f.max)err[f.id]=feTx("fe_maxErr",L,{n:nf(f.max)});else if(f.regex){try{if(!new RegExp(f.regex).test(x))err[f.id]=feTx("fe_patErr",L)}catch(e){}}}
    else if(f.type==="number"){const x=+v;if(f.min!=null&&(f.min as unknown)!==""&&x<f.min||f.max!=null&&(f.max as unknown)!==""&&x>f.max)err[f.id]=feTx("fe_patErr",L)}}
  FE.pv.err=err;return !Object.keys(err).length;
}
function fePvNext(btn?: Element | null){
  const d=feDoc(),last=d!.pages.length;const from=FE.pv.step;
  if(FE.pv.step<last){if(!fePvValidate()){fePvRender();const R=feRoot();R?.querySelectorAll<HTMLInputElement>(".fe-pf .fe-pfld.err").forEach((e,i)=>{if(!feRM())e.animate([{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(-3px)"},{transform:"none"}],{duration:360,delay:i*20})});R?.querySelector<HTMLInputElement>('.fe-pf[data-u="d"] .fe-pfld.err')?.scrollIntoView({block:"center",behavior:"smooth"});feToast(t("fe_fixErr",{n:nf(Object.keys(FE.pv.err).length)}));return}
    FE.pv.step=feNextStep(FE.pv.step,1);fePvRender(1);fePvProg(from);return}
  FE.pv.done=true;const who=(Object.values(FE.pv.vals).find(v=>v&&typeof v==="object"&&(v as Bag).n) as Bag | undefined)?.n as string | undefined;const nm=feEach.length&&(()=>{let n="",p="";feEach(f=>{if(f.key==="nom")n=(FE.pv.vals[f.id] as string)||"";if(f.key==="prenom")p=(FE.pv.vals[f.id] as string)||""});return (p+" "+n).trim()})();
  feS!.subs.unshift({id:"s"+Date.now().toString(36),who:nm||who||t("fe_testPatient"),form:feS!.cur,at:Date.now(),st:"test",ans:JSON.parse(JSON.stringify(FE.pv.vals)),log:[{at:Date.now(),by:nm||who||t("fe_testPatient"),act:"submitted"}]});const e=feEntry(feS!.cur);if(e)e.resp!++;feSave();
  fePvRender(1);feToast(t("fe_testSub"));
  const ok=feRoot()?.querySelectorAll<HTMLInputElement>(".fe-thx .ok");if(!feRM())ok?.forEach(o=>o.animate([{transform:"scale(0) rotate(-40deg)"},{transform:"scale(1.2)"},{transform:"none"}],{duration:620,easing:"cubic-bezier(.2,1.4,.3,1)"}));
}
function fePvProg(from?: number){const d=feDoc(),last=d!.pages.length;feRoot()?.querySelectorAll<HTMLInputElement>(".fe-prog i").forEach(i=>{if(!feRM())i.animate([{width:Math.round(from!/last*100)+"%"},{width:i.style.width}],{duration:520,easing:"cubic-bezier(.3,1,.4,1)"})})}
function feAssetMenu(kind: string,x: number,y: number){
  const o=feS!.pv,list=kind==="logo"?[["leaf","fe_lgLeaf"],["cross","fe_lgCross"],["heart","fe_lgHeart"]]:[["mount","fe_hdM"],["lake","fe_hdL"],["abstract","fe_hdA"]];
  osMenu(x,y,[...list.map(([k,l])=>({l:t(l),check:o[kind]===k,run:()=>{o[kind]=k;feSave();fePvRender();fePvOptsRender()}})),"-",{l:t("fe_upload"),ic:FEI.upload,run:()=>{const i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=()=>{const f=i.files![0];if(!f)return;if(f.size>1.5e6){feToast(t("fe_tooBig"));return}const r=new FileReader();r.onload=()=>{o[kind]="custom";o[kind==="logo"?"logoData":"hdrData"]=r.result as string;feSave();fePvRender();fePvOptsRender();feToast(t("fe_imgSet"))};r.readAsDataURL(f)};i.click()}}]);
}

/* ---------- drag & drop (components, fields, sections) ---------- */
function feResize(e: PointerEvent,el: HTMLElement){
  e.preventDefault();e.stopPropagation();const fid=el.dataset.fid,r=feFind(fid);if(!r)return;const R=feRoot(),box=el.parentElement,bw=box!.getBoundingClientRect().width,rtl=getComputedStyle(box!).direction==="rtl",k=feDK(FE.dev),v="--s"+k,cols=r.s.cols||2,er=el.getBoundingClientRect(),start=rtl?er.right+3:er.left-3,orig=feSp(r.f,cols,k);let cur=orig;const tag=el.querySelector<HTMLInputElement>(".fe-wtag");el.classList.add("rsz");R!.classList.add("resizing");
  const mv=(ev: { clientX: number; })=>{const px=rtl?start-ev.clientX:ev.clientX-start,want=px/bw*60*(FE.zoom/100?1:1);const best=FE_SP.reduce((a,b)=>Math.abs(b-want)<Math.abs(a-want)?b:a);if(best!==cur){cur=best;el.style.setProperty(v,(best) as unknown as string);if(tag){tag.textContent=FE_FR[best];if(!feRM())tag.animate([{transform:"scale(1.25)"},{transform:"none"}],{duration:220})}}};
  const up=()=>{removeEventListener("pointermove",mv);removeEventListener("pointerup",up);removeEventListener("pointercancel",up);el.classList.remove("rsz");R!.classList.remove("resizing");setTimeout(()=>{dkGhost.suppress=false},0);
    if(cur!==orig){feMut(()=>{r.f.sp=r.f.sp||{};r.f.sp[k]=cur},"canvas");feSelect(fid!,{tab:false});feToast(t("fe_wSet",{x:FE_FR[cur],d:t({d:"fe_dDesk",t:"fe_dTab",m:"fe_dMob"}[k]!)}))}};
  dkGhost.suppress=true;addEventListener("pointermove",mv);addEventListener("pointerup",up);addEventListener("pointercancel",up);
}
function feMkPh(wide?: boolean){const p=document.createElement("div");p.className="fe-dropph"+(wide?" w2":"");return p}
function feDragInit(e: PointerEvent,payload: FeDragP){
  if(e.button!==0)return;const R=feRoot();const cv=R?.querySelector<HTMLInputElement>(".fe-cv");if(!cv)return;const sx=e.clientX,sy=e.clientY;let on=false,ghost!: HTMLDivElement,ph!: HTMLElementX,src!: HTMLElement | null,raf=0,lastY=0;
  const begin=()=>{on=true;R!.classList.add("dragging");dkGhost.suppress=true;
    ghost=document.createElement("div");ghost.className="fe-ghost";ghost.innerHTML=payload.ghost!;document.body.appendChild(ghost);
    if(payload.kind==="move"){src=cv.querySelector<HTMLInputElement>(`.fe-fld[data-fid="${payload.fid}"]`);ph=feMkPh(false);ph.setAttribute("style",src!.getAttribute("style")||"");ph.style.height=Math.min(src!.offsetHeight,160)+"px";src!.after(ph);src!.classList.add("dragging")}
    else if(payload.kind==="sec"){src=cv.querySelector<HTMLInputElement>(`.fe-sec[data-sid="${payload.sid}"]`);ph=document.createElement("div");ph.className="fe-sph";ph.style.height=Math.min(src!.offsetHeight,120)+"px";src!.after(ph);src!.classList.add("dragging")}
    else ph=feMkPh(FE_WIDE.has(payload.type!));
    if(!feRM())ghost.animate([{opacity:0,scale:.8},{opacity:1,scale:1}],{duration:180});
  };
  const place=(ev: { clientX: number; clientY: number; })=>{
    const el=document.elementFromPoint(ev.clientX,ev.clientY);
    if(!el||!el.closest<HTMLInputElement>(".fe-cv")){if(payload.kind==="new")ph.remove();return}
    if(payload.kind==="sec"){const paper=cv.querySelector<HTMLInputElement>(".fe-paper"),secs=[...paper!.querySelectorAll<HTMLInputElement>(":scope>.fe-sec:not(.dragging)")];const ref=secs.find(s=>{const r=s.getBoundingClientRect();return ev.clientY<r.top+r.height/2})||paper!.querySelector<HTMLInputElement>(".fe-addsec");if(ph.nextElementSibling!==ref)paper!.insertBefore(ph,ref);return}
    let box=el.closest<HTMLInputElement>(".fe-flds");
    if(!box){let sec: HTMLInputElement | null | undefined=el.closest<HTMLInputElement>(".fe-sec");if(!sec){let best=null as { s: HTMLInputElement; d: number } | null;cv.querySelectorAll<HTMLInputElement>(".fe-sec").forEach(s=>{const r=s.getBoundingClientRect(),d=ev.clientY<r.top?r.top-ev.clientY:ev.clientY>r.bottom?ev.clientY-r.bottom:0;if(!best||d<best.d)best={s,d}});sec=best?.s}if(!sec||sec.classList.contains("col"))return;box=sec.querySelector<HTMLInputElement>(".fe-secb>.fe-flds")}
    const isGrp=payload.kind==="new"?payload.type==="group":!!src?.classList.contains("fe-grp");let dep=0,a: HTMLElement | null | undefined=box;while(a=a!.parentElement?.closest<HTMLInputElement>(".fe-grp"))dep++;if(isGrp&&dep>=3)return;
    const flds=[...box!.querySelectorAll<HTMLInputElement>(":scope>.fe-fld:not(.dragging)")],rtl=getComputedStyle(box!).direction==="rtl";
    let idx=flds.length;for(let i=0;i<flds.length;i++){const r=flds[i].getBoundingClientRect();if(ev.clientY<r.top){idx=i;break}if(ev.clientY<=r.bottom){if(rtl?ev.clientX>r.left+r.width/2:ev.clientX<r.left+r.width/2){idx=i;break}}}
    if(payload.kind==="new"&&ph._box!==box){ph._box=box;const bx=feFindBox(box!.dataset.box!);ph.setAttribute("style",feSpVars({type:payload.type!,w:FE_WIDE.has(payload.type!)?2:1},bx?.cols||2))}
    const ref=flds[idx]||null;
    if(ref){if(ph.parentNode!==box||ph.nextElementSibling!==ref)box!.insertBefore(ph,ref)}else if(ph.parentNode!==box||(ph.nextElementSibling&&!ph.nextElementSibling.classList.contains("dragging")))box!.appendChild(ph);
    cv.querySelectorAll<HTMLInputElement>(".fe-empty.hide").forEach(x=>x.classList.remove("hide"));box!.querySelector<HTMLInputElement>(":scope>.fe-empty")?.classList.add("hide");
  };
  const scroll=()=>{const r=cv.getBoundingClientRect();let v=0;if(lastY<r.top+50)v=-Math.min(16,(r.top+50-lastY)/3);else if(lastY>r.bottom-50)v=Math.min(16,(lastY-r.bottom+50)/3);if(v)cv.scrollTop+=v;raf=on?requestAnimationFrame(scroll):0};
  const move=(ev: { clientX: number; clientY: number; })=>{if(!on){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<6)return;begin();raf=requestAnimationFrame(scroll)}lastY=ev.clientY;ghost.style.transform=`translate(${ev.clientX+14}px,${ev.clientY+10}px)`;place(ev)};
  const up=(ev: PointerEvent)=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up);removeEventListener("pointercancel",up);cancelAnimationFrame(raf);
    if(!on){payload.click?.();return}on=false;setTimeout(()=>{dkGhost.suppress=false},0);R!.classList.remove("dragging");src?.classList.remove("dragging");
    const box=ph.parentNode as HTMLElement;let done=false;
    if(box&&ph.isConnected){
      if(payload.kind==="sec"){const idx=[...box.querySelectorAll<HTMLInputElement>(":scope>.fe-sec,:scope>.fe-sph")].filter(x=>!x.classList.contains("dragging")).indexOf(ph as HTMLInputElement);ph.remove();const r=feFindSec(payload.sid);if(r&&idx>=0){feFlip(()=>feMut(()=>{const a=r.p.sections;a.splice(r.i,1);a.splice(Math.min(idx,a.length),0,r.s)},"canvas"));done=true}}
      else if(box.classList.contains("fe-flds")){const sid=box.dataset.box,idx=[...box.children].filter(x=>x.classList.contains("fe-fld")&&!x.classList.contains("dragging")||x===ph).indexOf(ph);ph.remove();
        if(payload.kind==="new")feAddField(payload.type!,{sid,idx});else feMoveField(payload.fid!,sid!,idx);done=true}
    }
    ph?.remove();cv.querySelectorAll<HTMLInputElement>(".fe-empty.hide").forEach(x=>x.classList.remove("hide"));
    if(!done&&!feRM()&&payload.from){const r=payload.from.getBoundingClientRect();ghost.animate([{transform:ghost.style.transform,opacity:1},{transform:`translate(${r.left}px,${r.top}px)`,opacity:0}],{duration:280,easing:"cubic-bezier(.4,0,.2,1)"}).finished.then(()=>ghost.remove())}else ghost.remove();
  };
  addEventListener("pointermove",move);addEventListener("pointerup",up);addEventListener("pointercancel",up);
}
/* ---------- events ---------- */
let feWire=function(R: HTMLElement){
  R.addEventListener("click",e=>{
    const T=tgt(e),c=(s: string)=>T.closest<HTMLInputElement>(s);let b: HTMLInputElement|null;
    if(c("[data-tundo]")){const el: HTMLElementX | null=R.querySelector<HTMLInputElement>(".fe-toast");el!._undo?.();el!.classList.remove("show");return}
    if(b=c("[data-fe-open]")){const k=b.dataset.feOpen;R.classList.remove("o-nav","o-comps","o-props");R.classList.add("o-"+k);return}
    if(b=c("[data-fe-close]")){R.classList.remove("o-nav","o-comps","o-props");return}
    if(b=c("[data-go]")){R.classList.remove("o-nav");const v=b.dataset.go;feGo(v!);return}
    if(c("[data-aicreate]")){R.classList.remove("o-nav");feNewForm("blank");FE.ask=true;feRefresh("all");setTimeout(()=>feToggleAsk(true),60);return}
    /* header */
    if(b=c("[data-h]")){const a=b.dataset.h,r=b.getBoundingClientRect();
      if(a==="sync"){if(!feRM())b.querySelector<HTMLInputElement>("svg")!.animate([{transform:"rotate(0)"},{transform:"rotate(360deg)"}],{duration:700,easing:"cubic-bezier(.4,0,.2,1)"});feCommit()}
      else if(a==="pub")fePublish();else if(a==="pv")feSetTab("preview");else if(a==="save")feSaveVersion();
      else if(a==="pubm")osMenu(r.right-240,r.bottom+6,[{l:t("fe_pubNow"),ic:FEI.check,run:fePublish},{l:t("fe_pubSchedule"),ic:FEI.clock,run:()=>{const d=new Date(Date.now()+864e5);d.setHours(8,0,0,0);feToast(t("fe_scheduled",{x:d.toLocaleString(loc(),{weekday:"long",hour:"2-digit",minute:"2-digit"})}))}},{l:t("fe_pubTpl"),ic:FEI.templates,run:()=>feToast(t("fe_tplSaved"))}]);
      else if(a==="more")feMoreMenu(r.right-240,r.bottom+6);return}
    if(c(".fe-title")&&FE.view==="editor"){FE.editingTitle=true;feInlineEdit(c(".fe-title")!,v=>{feMut(d=>{d.title=v},null);FE.editingTitle=false;feSyncHead()});return}
    /* tabs & tools */
    if(b=c("[data-tab]")){feSetTab(b.dataset.tab!);return}
    if(b=c("[data-dev]")){const p0=R.querySelector<HTMLInputElement>(".fe-paper"),w0=p0?.offsetWidth;FE.dev=b.dataset.dev!;feFlip(()=>feRefresh("canvas"));R.querySelectorAll<HTMLInputElement>("[data-dev]").forEach(x=>x.setAttribute("aria-checked",(x.dataset.dev===FE.dev) as unknown as string));const p=R.querySelector<HTMLInputElement>(".fe-paper");if(p&&w0&&!feRM()){const w1=p.offsetWidth;if(w1!==w0)p.animate([{width:w0+"px"},{width:w1+"px"}],{duration:420,easing:"cubic-bezier(.3,1.1,.4,1)"})}return}
    if(b=c("[data-pstars]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.stars=+b!.dataset.pstars!},"canvas");return}
    if(b=c("[data-pctype]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.ctype=b!.dataset.pctype},"canvas");const ch=R.querySelector<HTMLInputElement>(`.fe-fld[data-fid="${FE.sel}"] .fe-csvg`);if(ch&&!feRM())ch.animate([{opacity:0,transform:"scale(.96)"},{opacity:1,transform:"none"}],{duration:320});return}
    if(b=c("[data-ptone]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.tone=b!.dataset.ptone},"canvas");return}
    if(c("[data-tcadd]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.tcols=f.tcols||[];f.tcols.push({l:t("fe_tCol",{n:f.tcols.length+1}),ty:"text"})},"canvas");setTimeout(()=>{const i=R.querySelectorAll<HTMLInputElement>("[data-tcl]");i[i.length-1]?.select()},30);return}
    if(b=c("[data-tcrm]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{const i=+b!.dataset.tcrm!;f.tcols!.splice(i,1);feEach(x=>{if(x.type==="chart"&&x.csrc==="tbl:"+f.id){if((x.cx??0)>=f.tcols!.length)x.cx=0;if((x.cy??1)>=f.tcols!.length)x.cy=Math.max(0,f.tcols!.length-1)}})},"canvas");return}
    if(b=c("[data-pspan]")){const f=feFind(FE.sel)?.f;if(!f)return;const k=feDK(FE.dev),n=+b.dataset.pspan!;feFlip(()=>feMut(()=>{f.sp=f.sp||{};if(n)f.sp[k]=n;else delete f.sp[k]},"canvas"));return}
    if(b=c("[data-z]")){feZoom(FE.zoom+(+b.dataset.z!)*10);return}
    if(b=c("[data-zoom]")){const r=b.getBoundingClientRect();osMenu(r.left,r.bottom+4,([50,75,90,100,110,125,150].map(z=>({l:fePct(z),check:FE.zoom===z,run:()=>feZoom(z)})) as (MenuItem | string)[]).concat(["-",{l:t("fe_fit"),ic:FEI.desktop,run:()=>{const cv=R.querySelector<HTMLInputElement>(".fe-cv"),p=R.querySelector<HTMLInputElement>(".fe-paper");const w=p!.offsetWidth*100/FE.zoom;feZoom(Math.max(50,Math.min(150,Math.floor((cv!.clientWidth-48)/w*100/5)*5)))}}]));return}
    if(c("[data-undo]")){feUndo();return}if(c("[data-redo]")){feRedo();return}
    /* components */
    if(b=c("[data-cf]")){FE.comp=b.dataset.cf!;R.querySelectorAll<HTMLInputElement>("[data-cf]").forEach(x=>x.setAttribute("aria-selected",(x===b) as unknown as string));const l=R.querySelector<HTMLInputElement>(".fe-clist");l!.innerHTML=feCompList();if(!feRM())l!.querySelectorAll<HTMLInputElement>(".fe-comp,.fe-cg h5").forEach((x,i)=>x.animate([{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"none"}],{duration:260,delay:i*14,fill:"backwards"}));return}
    if(c("[data-genbtn]")){feAiRun(R.querySelector<HTMLInputElement>("[data-gen]")!.value,"gen");return}
    /* AI bar */
    if(b=c("[data-ai]")){const a=b.dataset.ai;
      if(a==="ask")feToggleAsk();else if(a==="sec")feAddSection();else if(a==="req")feAiReq();else if(a==="tr")feTranslate(feTrTarget());else if(a==="logic")feAiLogic();
      else if(a==="trm"){const r=b.getBoundingClientRect();osMenu(r.left-200,r.top-8-4*34-12,["fr","en","de","ar"].map(L=>({l:t("fe_aiTr",{x:t("fe_L"+L)}),check:feCL()===L,run:()=>feTranslate(L)})))}
      return}
    /* pages */
    if(c("[data-pgadd]")){feAddPage();return}
    if(b=c("[data-pg]")){feSetPage(+b.dataset.pg!);return}
    /* canvas */
    if(b=c("[data-ga]")){const g=b.closest<HTMLInputElement>(".fe-grp"),fid=g!.dataset.fid,f=feFind(fid)?.f;if(!f)return;
      if(b.dataset.ga==="col"){feSnap();f.col=!f.col;feDirty();const gb=g!.querySelector<HTMLInputElement>(":scope>.fe-gb");b.setAttribute("aria-expanded",(!f.col) as unknown as string);b.title=t(f.col?"fe_expand":"fe_collapse");
        if(feRM()){g!.classList.toggle("col",f.col)}else if(f.col){const h=gb!.scrollHeight;gb!.animate([{height:h+"px",opacity:1},{height:"0px",opacity:0}],{duration:280,easing:"cubic-bezier(.3,1,.4,1)"}).finished.then(()=>g!.classList.toggle("col",!!feFind(fid)?.f.col))}else{g!.classList.remove("col");gb!.animate([{height:"0px",opacity:0},{height:gb!.scrollHeight+"px",opacity:1}],{duration:320,easing:"cubic-bezier(.3,1,.4,1)"})}
        if(FE.sel===fid)feRenderProps()}
      else{const r=b.getBoundingClientRect();osMenu(r.right-230,r.bottom+4,FE_G.map(([gk,l,types])=>({l:t(l),ic:FEI[FE_T[types[0]][0]],sub:types.map(ty=>({l:t(FE_T[ty][1]),ic:FEI[FE_T[ty][0]],run:()=>feAddField(ty,{sid:fid,idx:(feFind(fid)?.f.fields||[]).length})}))})))}
      return}
    if(b=c("[data-gcols]")){const f=feFind(FE.sel)?.f;if(!f)return;feFlip(()=>feMut(()=>{(f as Bag).cols=+b!.dataset.gcols!},"canvas"));return}
    if(b=c("[data-fa]")){const fid=c(".fe-fld")!.dataset.fid;if(b.dataset.fa==="del")feDelField(fid!);else feDupField(fid!);return}
    if(b=c("[data-sa]")){const sid=c(".fe-sec")!.dataset.sid,a=b.dataset.sa;if(a==="col")feColSec(sid!);else if(a==="more"){const r=b.getBoundingClientRect();feSecMenu(sid!,r.right-230,r.bottom+4)}else if(a==="add"){const r=b.getBoundingClientRect();osMenu(r.left,r.bottom+4,FE_G.slice(0,3).map(([g,l,types])=>({l:t(l),ic:FEI[FE_T[types[0]][0]],sub:types.map(ty=>({l:t(FE_T[ty][1]),ic:FEI[FE_T[ty][0]],run:()=>{const s=feFindSec(sid)!.s;feAddField(ty,{sid,idx:s.fields.length})}}))})))}return}
    {const inT=c(".fe-cv .fe-tblw,.fe-cv .fe-tfoot");if(inT){const fl=inT.closest<HTMLInputElement>(".fe-fld");if(fl&&FE.sel!==fl.dataset.fid&&!c("[data-thm],[data-trow]"))feSelect(fl.dataset.fid!,{tab:false})}}
    if((b=c(".fe-cv .fe-fld"))&&!c(".fe-cv .fe-tblw,.fe-cv .fe-tfoot")){if(FE.sel!==b.dataset.fid)feSelect(b.dataset.fid!);else if(R.offsetWidth<1040&&!c(".fe-fgrip"))R.classList.add("o-props");return}
    if(b=c(".fe-cv .fe-sh")){FE.selSec=b.closest<HTMLInputElement>(".fe-sec")!.dataset.sid;if(FE.ptab==="section")feRenderProps();return}
    if(c(".fe-cv")&&!c(".fe-paper>*")){if(FE.sel){FE.sel=null;R.querySelectorAll<HTMLInputElement>(".fe-fld.on").forEach(x=>{x.classList.remove("on");x.setAttribute("aria-pressed","false")});feRenderProps()}return}
    /* properties */
    if(b=c("[data-pt]")){FE.ptab=b.dataset.pt!;feRenderProps();const pb=R.querySelector<HTMLInputElement>(".fe-ed .fe-props .fe-pb");if(pb&&!feRM())pb.animate([{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"none"}],{duration:260});return}
    if(c("[data-pchg]")){const r=c("[data-pchg]")!.getBoundingClientRect();feChangeType(r.right-220,r.bottom+4);return}
    if(c("[data-pcopy]")){const f=feFind(FE.sel)?.f;if(f)feCopy(f.key,t("fe_keyCopied",{x:f.key}));return}
    if(b=c("[data-ptg]")){const k=b.dataset.ptg,f=feFind(FE.sel)?.f;if(!f)return;if(k==="maybe"){const on=(f.opts||[]).length<3;feMut(()=>{f.maybe=on;if(on)f.opts=[...(f.opts||["fe_yes","fe_no"]).slice(0,2),"fe_maybe"];else f.opts=(f.opts||[]).slice(0,2)},"canvas");return}
      if(k==="addRows"||k==="cvals"){feMut(()=>{f[k]=f[k]===false},"canvas");return}
      feSnap();f[k!]=!f[k!];b.setAttribute("aria-checked",f[k!] as string);feDirty();feRepaintField(f.id);feSyncHead();return}
    if(c("[data-pscol]")){const s=feCurSec();if(s)feColSec(s.id);c("[data-pscol]")!.setAttribute("aria-checked",(!!s?.col) as unknown as string);return}
    if(b=c("[data-pfg]")){const k=b.dataset.pfg;feMut(d=>{d.set[k!]=!d.set[k!]},null);b.setAttribute("aria-checked",feDoc()!.set[k!] as string);return}
    if(b=c("[data-pw]")){const f=feFind(FE.sel)?.f;if(!f)return;feFlip(()=>feMut(()=>{f.w=+b!.dataset.pw!},"canvas"));return}
    if(b=c("[data-pdisp]")){const f=feFind(FE.sel)?.f;if(!f)return;feFlip(()=>feMut(()=>{f.disp=b!.dataset.pdisp},"canvas"));return}
    if(b=c("[data-pcols]")){const s=feCurSec();if(!s)return;feFlip(()=>feMut(()=>{(s as Bag).cols=+b!.dataset.pcols!},"canvas"));return}
    if(c("[data-psdup]")){const s=feCurSec();if(s)feDupSec(s.id);return}if(c("[data-psdel]")){const s=feCurSec();if(s)feDelSec(s.id);return}
    if(c("[data-poadd]")){const f=feFind(FE.sel)?.f,k=c("[data-okind]")!.dataset.okind;if(!f)return;feMut(()=>{f[k!]=f[k!]||[];(f[k!] as FeLabel[]).push(t("fe_opt",{n:(f[k!] as FeLabel[]).length+1}))},"canvas");setTimeout(()=>{const i=R.querySelectorAll<HTMLInputElement>(`[data-okind="${k}"] [data-po]`);i[i.length-1]?.focus();i[i.length-1]?.select()},20);return}
    if(b=c("[data-porm]")){const f=feFind(FE.sel)?.f,k=c("[data-okind]")!.dataset.okind;if(!f)return;const row=b.closest<HTMLInputElement>(".fe-opt");const go=()=>feMut(()=>{(f[k!] as FeLabel[]).splice(+b!.dataset.porm!,1)},"canvas");if(!feRM())row!.animate([{opacity:1},{opacity:0,transform:"translateX(10px)"}],{duration:160}).finished.then(go);else go();return}
    if(c("[data-lgadd]")){feAiLogic();return}
    if(c("[data-lgrm]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{delete f.logic},"canvas");feToast(t("fe_ruleRm"),()=>feUndo());return}
    if(b=c(".fe-dt>summary")){const dt=b.parentNode as HTMLDetailsElement;FE.dto=FE.dto||{};setTimeout(()=>{FE.dto![dt.dataset.dt!]=dt.open;if(dt.open&&!feRM())dt.querySelector<HTMLInputElement>(".fe-dtb")!.animate([{opacity:0,transform:"translateY(-6px)"},{opacity:1,transform:"none"}],{duration:240})},0);return}
    /* preview */
    if(b=c("[data-pvdev]")){FE.pv.dev=b.dataset.pvdev!;const pv=R.querySelector<HTMLInputElement>(".fe-pv");R.querySelectorAll<HTMLInputElement>("[data-pvdev]").forEach(x=>x.setAttribute("aria-checked",(x===b) as unknown as string));const fr=pv!.querySelector<HTMLInputElement>(".fe-frame");const w0=fr!.getBoundingClientRect();pv!.dataset.pdev=FE.pv.dev;if(!feRM()){const w1=fr!.getBoundingClientRect();if(w1.width&&w0.width)fr!.animate([{width:w0.width+"px"},{width:w1.width+"px"}],{duration:420,easing:"cubic-bezier(.3,1.1,.4,1)"});pv!.querySelector<HTMLInputElement>(".fe-phone")!.animate([{opacity:.4,transform:"scale(.97)"},{opacity:1,transform:"none"}],{duration:380})}return}
    if(b=c("[data-pvtest]")){FE.pv.test=b.dataset.pvtest==="1";R.querySelector<HTMLInputElement>(".fe-pv")?.classList.toggle("test",FE.pv.test);R.classList.remove("o-props");if(FE.pv.test){FE.pv.step=0;FE.pv.done=false;FE.pv.err={};fePvRender(1)}return}
    if(c("[data-pvnext]")){fePvNext();return}
    if(c("[data-pvprev]")){FE.pv.err={};const f=FE.pv.step;FE.pv.step=feNextStep(FE.pv.step,-1);fePvRender(-1);fePvProg(f);return}
    if(b=c("[data-pvgo]")){const f=FE.pv.step;FE.pv.step=+b.dataset.pvgo!;fePvRender(-1);fePvProg(f);return}
    if(c("[data-pvlater]")){feToast(feTx("fe_savedLater",feS!.pv.lang||feCL()));return}
    if(c("[data-pvrestart]")){FE.pv.done=false;FE.pv.step=0;FE.pv.err={};fePvPrefill(feS!.pv.fill!);fePvRender(-1);return}
    if(b=c("[data-pick]")){if(b.disabled)return;fePvSet(b.dataset.k!,null,b.dataset.pick,null);fePvRender();return}
    if(b=c("[data-rk]")){const f=feFind(b.dataset.k)?.f;if(!f)return;const n=(f.opts||[]).length;const ord=Array.isArray(FE.pv.vals[f.id])&&(FE.pv.vals[f.id] as string[]).length===n?(FE.pv.vals[f.id] as string[]).slice():[...Array(n).keys()].map(String);const i=+b.dataset.rk!,j=i+(+b.dataset.dir!);if(j<0||j>=n)return;[ord[i],ord[j]]=[ord[j],ord[i]];fePvSet(f.id,null,ord,null);fePvRender();return}
    if(b=c("[data-tchip],[data-tstar]")){if(b.disabled)return;const sk=b.dataset.tchip||b.dataset.tstar,live=!!b.closest<HTMLInputElement>(".fe-pf"),fid=live?b.dataset.k:b.closest<HTMLInputElement>(".fe-fld")?.dataset.fid,f=feFind(fid)?.f;if(!f)return;const rows=live?feTblRows(f,FE.pv.vals):(f.tdef||[]),[ri,cc]=sk!.split("."),cur=rows[+ri]?.[cc]??"";let nv;
      if(b.dataset.tstar)nv=String(+(b.dataset.n as string)===+cur?"":b.dataset.n);else{const s0=String(cur).split("|").filter(Boolean),o=b.dataset.o;nv=(s0.includes(o!)?s0.filter(x=>x!==o):[...s0,o]).join("|")}
      if(live){fePvSet(fid!,sk,nv,null);const u=b.closest<HTMLInputElement>(".fe-pf")!.dataset.u;fePvRender();const nb=feRoot()?.querySelector<HTMLInputElement>(`.fe-pf[data-u="${u}"] [data-${b.dataset.tstar?"tstar":"tchip"}="${sk}"]${b.dataset.tstar?`[data-n="${b.dataset.n}"]`:`[data-o="${CSS.escape(b.dataset.o!)}"]`}`);nb?.focus();if(nb&&!feRM())nb.animate([{transform:"scale(.8)"},{transform:"scale(1.15)"},{transform:"none"}],{duration:300})}
      else{feSnap();feTblEdSet(f,sk!,nv,null);feRepaintField(f.id)}return}
    if(b=c("[data-thm]")){const fid=b.closest<HTMLInputElement>(".fe-fld")!.dataset.fid,f=feFind(fid)?.f;if(!f)return;if(FE.sel!==fid)feSelect(fid!);const r=b.getBoundingClientRect();feTblColMenu(f,+b.dataset.thm!,r.left,r.bottom+4);return}
    if(b=c("[data-tcadd2]")){const fid=b.closest<HTMLInputElement>(".fe-fld")!.dataset.fid,f=feFind(fid)?.f;if(f)feTblColIns(f,f.tcols!.length);return}
    if(b=c("[data-trow]")){const live=!!b.closest<HTMLInputElement>(".fe-pf"),fid=live?b.dataset.k:b.closest<HTMLInputElement>(".fe-fld")?.dataset.fid,f=feFind(fid)?.f;if(!f)return;const r=b.getBoundingClientRect();feTblRowMenu(f,+b.dataset.trow!,live,r.left,r.bottom+4);return}
    if(c("[data-thl]"))return;
    if(b=c("[data-tdadd]")){const fid=b.closest<HTMLInputElement>(".fe-fld")!.dataset.fid,f=feFind(fid)?.f;if(f)feTblEdAdd(f);return}
    if(b=c("[data-tdrm]")){const fid=b.closest<HTMLInputElement>(".fe-fld")!.dataset.fid,f=feFind(fid)?.f,i=+b.dataset.ri!;if(f)feMut(()=>{f.tdef=Array.isArray(f.tdef)?f.tdef:[];while(f.tdef.length<(f.rows||1))f.tdef.push({});f.tdef.splice(i,1);(f as Bag).rows=Math.max(1,(f.rows||1)-1)},"canvas");return}
    if(b=c("[data-ptsum]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.tsum=b!.dataset.ptsum},"canvas");return}
    if(c("[data-tdclr]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{delete f.tdef},"canvas");feToast(t("fe_tDefCleared"),()=>feUndo());return}
    if(b=c("[data-tadd]")){const k=b.dataset.tadd,f=feFind(k)?.f;const arr=Array.isArray(FE.pv.vals[k!])?FE.pv.vals[k!]:feTblRows(f!,FE.pv.vals);while(arr.length<(f?.rows||1))arr.push({});arr.push({});FE.pv.vals[k!]=arr;fePvRender();const rows=feRoot()?.querySelectorAll<HTMLInputElement>(`.fe-pf [data-tadd="${k}"]`);rows?.forEach(x=>{const tr=x.previousElementSibling?.querySelector<HTMLInputElement>("tbody tr:last-child");if(tr&&!feRM())tr.animate([{opacity:0,transform:"translateY(-6px)"},{opacity:1,transform:"none"}],{duration:260})});return}
    if(b=c("[data-trm]")){const k=b.dataset.trm,f=feFind(k)?.f,i=+b.dataset.ri!;const arr=Array.isArray(FE.pv.vals[k!])?FE.pv.vals[k!]:feTblRows(f!,FE.pv.vals);while(arr.length<(f?.rows||1))arr.push({});arr.splice(i,1);FE.pv.vals[k!]=arr;fePvRender();return}
    if(b=c("[data-medadd]")){const k=b.dataset.medadd;const arr=(Array.isArray(FE.pv.vals[k!])?FE.pv.vals[k!]:[{}]) as Bag[];arr.push({});FE.pv.vals[k!]=arr;fePvRender();return}
    if(b=c("[data-signclr]")){delete FE.pv.vals[b.dataset.signclr!];fePvRender();return}
    if(b=c("[data-ochg]")){const r=b.getBoundingClientRect();feAssetMenu(b.dataset.ochg!,r.right-220,r.bottom+4);return}
    if(c("[data-alllangs]")){const r=c("[data-alllangs]")!.getBoundingClientRect();osMenu(r.left,r.bottom+4,["fr","en","de","ar"].map(L=>({l:LANGS[L].name+" · "+fePct(100),check:(feS!.pv.lang||feCL())===L,run:()=>{feS!.pv.lang=L;feSave();fePvRender();fePvOptsRender()}})));return}
    if(b=c("[data-otg]")){const k=b.dataset.otg;feS!.pv[k!]=!feS!.pv[k!];b.setAttribute("aria-checked",feS!.pv[k!] as string);feSave();if(k==="fill"){fePvPrefill(feS!.pv[k]!);FE.pv.err={}}fePvRender();return}
    if(b=c("[data-ocol]")){feSetColor(b.dataset.ocol!,true);feSave();R.querySelectorAll<HTMLInputElement>("[data-ocol]").forEach(x=>x.setAttribute("aria-checked",(x===b) as unknown as string));if(!feRM())b.animate([{transform:"scale(.7)"},{transform:"scale(1.15)"},{transform:"none"}],{duration:380,easing:"cubic-bezier(.2,1.4,.3,1)"});return}
    if(c("[data-copylink]")){feCopy(feLink(),t("fe_linkCopied"));return}
    if(c("[data-copyembed]")){feCopy(`<iframe src="${feLink()}" width="100%" height="900" style="border:0"></iframe>`);return}
    /* rules tab */
    if(c("[data-rnew]")){const c0=feSrcCands(null);const src=c0.find(x=>x.type==="select")||c0[0];const all: FeField[]=[];feEach(f=>{if(f!==src)all.push(f)});FE.rb={src:src?.id,op:"eq",val:"0",act:"show",tgt:all.find(f=>!f.logic)?.id};feRefresh("tab");R.querySelector<HTMLInputElement>(".fe-rb")?.animate?.([{opacity:0,transform:"translateY(-6px)"},{opacity:1,transform:"none"}],{duration:260});return}
    if(c("[data-rbx]")){FE.rb=null;feRefresh("tab");return}
    if(b=c("[data-rrm]")){const f=feFind(b.dataset.rrm)?.f;if(f){const row=b.closest<HTMLInputElement>(".fe-rc");const go=()=>{feMut(()=>{delete f.logic},null);feRefresh("tab");feToast(t("fe_ruleRm"),()=>{feUndo()})};if(!feRM())row!.animate([{opacity:1},{opacity:0,transform:"translateX(12px)"}],{duration:200}).finished.then(go);else go()}return}
    if(b=c("[data-redit]")){FE.sel=b.dataset.redit!;FE.ptab="field";FE.dto=FE.dto||{};FE.dto.logic=true;const r=feFind(FE.sel);if(r)FE.page=r.pi;feSetTab("editor");setTimeout(()=>{feSelect(FE.sel,{scroll:true,pulse:true});R.querySelector<HTMLInputElement>('.fe-ed [data-dt="logic"]')?.scrollIntoView({block:"nearest"})},40);return}
    /* versions */
    if(b=c("[data-vrestore]")){const v=(feS!.ver[feS!.cur]||[]).find(x=>x.n===+b!.dataset.vrestore!);if(v){feSnap();feS!.docs[feS!.cur]=JSON.parse(v.snap);FE.page=0;FE.sel=null;feDirty();feRefresh("tab");feToast(t("fe_verRestored",{n:nf(v.n)}),()=>feUndo())}return}
    /* share */
    if(b=c("[data-shacc]")){feMut(d=>{d.share.access=b!.dataset.shacc!},null);R.querySelectorAll<HTMLInputElement>("[data-shacc]").forEach(x=>x.setAttribute("aria-checked",(x===b) as unknown as string));return}
    if(b=c("[data-shrm]")){feMut(d=>{d.share.invites.splice(+b!.dataset.shrm!,1)},null);feRefresh("tab");return}
    if(c("[data-shexp]")){feMut(d=>{d.share.expire=!d.share.expire;if(d.share.expire&&!d.share.until){const x=new Date(Date.now()+30*864e5);d.share.until=x.toISOString().slice(0,10)}},null);feRefresh("tab");return}
    /* automations */
    if(b=c("[data-autg]")){const k=b.dataset.autg;feMut(d=>{d.auto[k!]=!d.auto[k!]},null);const on=feDoc()!.auto[k!];b.setAttribute("aria-checked",(on) as unknown as string);const row=b.closest<HTMLInputElement>(".fe-au");row!.classList.toggle("on",on);row!.querySelector<HTMLInputElement>(".st")!.textContent=t(on?"fe_auOn":"fe_auOff");return}
    if(c("[data-auadd]")){const d=feDoc(),miss=FE_AU.filter(([k])=>d!.auto[k]===undefined||!d!.auto[k]);const r=c("[data-auadd]")!.getBoundingClientRect();osMenu(r.right-280,r.bottom+4,miss.length?miss.map(([k,ic,l])=>({l:t(l),ic:FEI[ic],run:()=>{feMut(dd=>{dd.auto[k]=true},null);feRefresh("tab");const row=R.querySelector<HTMLInputElement>(`[data-au="${k}"]`);row?.scrollIntoView({block:"nearest"});if(row&&!feRM())row.animate([{background:"rgba(90,100,224,.16)"},{background:"transparent"}],{duration:1200});feToast(t("fe_auAdded"))}})):[{l:t("fe_auAll"),disabled:true}]);return}
    /* views */
    if(b=c("[data-rowm]")){const r=b.getBoundingClientRect();feRowMenu(b.dataset.rowm!,r.right-220,r.bottom+4);return}
    if(b=c("[data-open]")){feOpenForm(b.dataset.open!);return}
    if(b=c("[data-openauto]")){feOpenForm(b.dataset.openauto!,"auto");return}
    if(c("[data-newform]")){feCreateModal();return}
    if(b=c("[data-usetpl]")){const tp=FE_TPL.find(x=>x[0]===b!.dataset.usetpl);feNewForm(tp![1],tp![2]);return}
    if(b=c("[data-libadd]")){const ty=b.dataset.libadd;FE.view="editor";FE.tab="editor";feRender(true);feAddField(ty!);return}
    if(b=c("[data-sf]")){FE.sf=b.dataset.sf;feRender();return}
    if(b=c("[data-sub]")){feSubOpen(b.dataset.sub!,"ans");return}
    if(c("[data-csv]")){const rows=[["patient","form","date","status"],...feS!.subs.map(s=>[s.who,feEntry(s.form)?feName(feEntry(s.form)!):"",new Date(s.at).toISOString(),s.st])];feDownload("soumissions.csv",rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n"),"text/csv");return}
    if(c("[data-emptytrash]")){const del=feS!.forms.filter(f=>f.del);feS!.forms=feS!.forms.filter(f=>!f.del);del.forEach(f=>delete feS!.docs[f.id]);if(!feEntry(feS!.cur))feS!.cur=feS!.forms[0]?.id;feSave();feRender(true);feToast(t("fe_trashEmptied"));return}
    if(b=c("[data-set]")){const k=b.dataset.set;feS!.set[k!]=!feS!.set[k!];b.setAttribute("aria-checked",feS!.set[k!] as string);feSave();return}
    if(c("[data-reset]")){const old=JSON.stringify(feS);feS=feFresh();FE.undo=[];FE.redo=[];FE.sel=null;FE.page=0;feSave();feRender(true);feToast(t("fe_resetDone"),()=>{feS=JSON.parse(old);feSave();feRender(true)});return}
  });
  /* comp / field / section drag + clicks */
  R.addEventListener("pointerdown",e=>{
    const rz=tgt(e).closest<HTMLInputElement>(".fe-cv .fe-rsz");if(rz){feResize(e,rz.closest<HTMLInputElement>(".fe-fld")!);return}
    const comp=tgt(e).closest<HTMLInputElement>("[data-cfav]")?null:tgt(e).closest<HTMLInputElement>(".fe-comp");
    if(comp){const ty=comp.dataset.ct;e.preventDefault();feDragInit(e,{kind:"new",type:ty,from:comp,ghost:`<span class="ic">${FEI[FE_T[ty!][0]]}</span><b>${t(FE_T[ty!][1])}</b>`,click:()=>{feAddField(ty!);if(R.offsetWidth<760)R.classList.remove("o-comps");if(!feRM())comp.animate([{transform:"scale(.96)"},{transform:"none"}],{duration:200})}});return}
    const sg=tgt(e).closest<HTMLInputElement>(".fe-sgrip");if(sg){const sec=sg.closest<HTMLInputElement>(".fe-sec");e.preventDefault();feDragInit(e,{kind:"sec",sid:sec!.dataset.sid,from:sec,ghost:`<span class="ic">${FEI.layers}</span><b>${FEE(sec!.querySelector<HTMLInputElement>("h3")!.textContent)}</b>`});return}
    const fl=tgt(e).closest<HTMLInputElement>(".fe-cv .fe-fld");if(fl&&!tgt(e).closest<HTMLInputElement>("button,input,textarea,select,[contenteditable=true],[contenteditable=plaintext-only]")){const r=feFind(fl.dataset.fid);if(!r)return;e.preventDefault();fl.focus({preventScroll:true});feDragInit(e,{kind:"move",fid:fl.dataset.fid,from:fl,ghost:`<span class="ic">${FEI[FE_T[r.f.type][0]]}</span><b>${FEE(fv(r.f.label,feCL()))}</b>`});return}
    const cv=tgt(e).closest<HTMLCanvasElement>(".fe-pf canvas[data-sign]");if(cv&&!feS!.pv.ro){fePvSign(e,cv)}
  });
  R.addEventListener("dblclick",e=>{
    const h=tgt(e).closest<HTMLInputElement>(".fe-cv .fe-sh h3");if(h){const sid=h.closest<HTMLInputElement>(".fe-sec")!.dataset.sid,r=feFindSec(sid);feInlineEdit(h,v=>feMut(()=>{r!.s.title=v},"canvas"));return}
    const fl0=tgt(e).closest<HTMLInputElement>(".fe-cv .fe-fld");const lb=fl0&&!tgt(e).closest<HTMLInputElement>(".fe-ftb")?fl0.querySelector<HTMLInputElement>(":scope>.fe-fl .lb,:scope>.fe-gh .lb"):null;if(lb){const fid=fl0!.dataset.fid,r=feFind(fid);lb.style.pointerEvents="auto";lb.querySelector<HTMLInputElement>(".rq")?.remove();feInlineEdit(lb,v=>feMut(()=>{r!.f.label=v},"canvas"));return}
    const pg=tgt(e).closest<HTMLInputElement>(".fe-pg");if(pg){const i=+pg.dataset.pg!;feInlineEdit(pg.querySelector<HTMLInputElement>(".tx span")!,v=>feMut(d=>{d.pages[i].title=v},"canvas"))}
  });
  R.addEventListener("contextmenu",e=>{
    const fl=tgt(e).closest<HTMLInputElement>(".fe-cv .fe-fld"),pg=tgt(e).closest<HTMLInputElement>(".fe-pg[data-pg]"),sec=tgt(e).closest<HTMLInputElement>(".fe-cv .fe-sh");
    if(!fl&&!pg&&!sec)return;e.preventDefault();e.stopPropagation();
    if(pg){fePageMenu(+pg.dataset.pg!,e.clientX,e.clientY);return}
    if(sec){feSecMenu(sec.closest<HTMLInputElement>(".fe-sec")!.dataset.sid!,e.clientX,e.clientY);return}
    const fid=fl!.dataset.fid,r=feFind(fid);feSelect(fid!,{});
    osMenu(e.clientX,e.clientY,[{l:t("fe_props"),ic:FEI.sliders,run:()=>{FE.ptab="field";feRenderProps();if(R.offsetWidth<1040)R.classList.add("o-props")}},{l:t("fe_dupField"),ic:FEI.copy,kbd:"Ctrl+D",run:()=>feDupField(fid!)},{l:t("fe_copy"),ic:FEI.copy,kbd:"Ctrl+C",run:()=>feCopyField()},{l:t("fe_cut"),ic:FEI.cut,kbd:"Ctrl+X",run:()=>feCopyField(true)},{l:t("fe_paste"),ic:FEI.paste,kbd:"Ctrl+V",disabled:!FE.clip,run:fePasteField},{l:t("fe_blkSaveAs"),ic:FEI.compose,disabled:r!.f.type!=="group",run:()=>{feSaveBlock(r!.f);feRenderProps()}},{l:t(r!.f.req?"fe_optional":"fe_req"),ic:FEI.asterisk,run:()=>feMut(()=>{r!.f.req=!r!.f.req},"canvas")},{l:t("fe_aiLogic"),ic:FEI.branch,run:feAiLogic},"-",{l:t("fe_delField"),ic:FEI.del,danger:true,kbd:t("fmDel"),run:()=>feDelField(fid!)}]);
  },true);
  /* typing in properties / options / preview */
  R.addEventListener("focusout",e=>{if(tgt(e).matches?.("[data-p],[data-ps],[data-pf],[data-pfs],[data-po],[data-tdef],[data-tcl],[data-tco],[data-thl]")){if(tgt(e).dataset.thl!==undefined&&FE.ptab==="field")setTimeout(()=>{if(!feRoot()?.querySelector<HTMLInputElement>(".fe-ed .fe-props")?.contains(document.activeElement))feRenderProps()},0);FE.snapOn=false;if(tgt(e).dataset.p==="key"){const f=feFind(FE.sel)?.f;if(f){const k=feUniqKey(f.key||fv(f.label,"fr"),f);if(k!==f.key){f.key=k;tgt(e).value=k;feDirty()}}}}});
  const typing=(el?: unknown)=>{if(!FE.snapOn){feSnap();FE.snapOn=true}};
  R.addEventListener("input",e=>{
    const el=tgt(e),ds=el.dataset;
    if(ds.feQ!==undefined){FE.q=el.value;R.querySelector<HTMLInputElement>(".fe-clist")!.innerHTML=feCompList();return}
    if(ds.lq!==undefined){FE.lq=el.value;const pos=el.selectionStart;feRender();const n=R.querySelector<HTMLInputElement>("[data-lq]");n!.focus();try{n!.setSelectionRange(pos,pos)}catch(x){}return}
    if(el.tagName==="SELECT")return;
    if(ds.p){const f=feFind(FE.sel)?.f;if(!f)return;typing();let v=el.value;
      if(ds.p==="min"||ds.p==="max")v=(v===""?undefined:(f.type==="slider"?+v:Math.max(0,+v))) as unknown as string;if(ds.p==="step")v=(v===""?undefined:Math.max(0,+v)) as unknown as string;if(ds.p==="rows")v=(v===""?undefined:Math.max(1,Math.min(20,Math.round(+v)))) as unknown as string;
      if(ds.p==="regex"){let bad=false;try{new RegExp(v)}catch(x){bad=true}el.classList.toggle("bad",bad);const er=R.querySelector<HTMLInputElement>("[data-rxerr]");if(er)er.hidden=!bad}
      if(ds.p==="key")v=v.replace(/[^A-Za-z0-9_]/g,"_").toLowerCase();
      if(v===undefined||v==="")delete f[ds.p];else f[ds.p]=v;if(ds.p==="label"&&v===undefined)f.label="";
      feDirty();feRepaintField(f.id);return}
    if(ds.tdef!==undefined){const fid=el.closest<HTMLInputElement>(".fe-fld")?.dataset.fid,f=feFind(fid)?.f;if(!f)return;typing();feTblEdSet(f,ds.tdef,el.type==="checkbox"?(el.checked?"1":""):el.value,el);return}
    if(ds.thl!==undefined){const fid=el.closest<HTMLInputElement>(".fe-fld")?.dataset.fid,f=feFind(fid)?.f;if(!f)return;typing();f.tcols![+ds.thl].l=el.value;feDirty();return}
    if(ds.tco!==undefined){const f=feFind(FE.sel)?.f;if(!f)return;typing();f.tcols![+ds.tco].opts=el.value;feDirty();clearTimeout(FE.tcoT);FE.tcoT=setTimeout(()=>feRepaintField(f.id),400);return}
    if(ds.tcl!==undefined){const f=feFind(FE.sel)?.f;if(!f)return;typing();f.tcols![+ds.tcl].l=el.value;feDirty();feRepaintField(f.id);return}
    if(ds.po){const f=feFind(FE.sel)?.f,k=el.closest<HTMLInputElement>("[data-okind]")!.dataset.okind;if(!f)return;typing();(f[k!] as FeLabel[])[+ds.po]=el.value;feDirty();feRepaintField(f.id);return}
    if(ds.ps){const s=feCurSec();if(!s)return;typing();s[ds.ps]=el.value;feDirty();const sec=R.querySelector<HTMLInputElement>(`.fe-sec[data-sid="${s.id}"]`);if(ds.ps==="title"&&sec)sec.querySelector<HTMLInputElement>("h3")!.textContent=el.value;else if(sec){sec.querySelector<HTMLInputElement>(".fe-sdesc")?.remove();if(el.value)sec.querySelector<HTMLInputElement>(".fe-sh")!.insertAdjacentHTML("afterend",`<p class="fe-sdesc" dir="auto">${FEE(el.value)}</p>`)}return}
    if(ds.pf){typing();feDoc()![ds.pf]=el.value;feDirty();const h=R.querySelector<HTMLInputElement>(ds.pf==="title"?".fe-title":".fe-sub");if(h)h.textContent=el.value;if(ds.pf==="title"&&feDoc()!.everPub){const c=R.querySelector<HTMLInputElement>(".fe-bc .cur");if(c)c.textContent=el.value}return}
    if(ds.pfs){typing();feDoc()!.set[ds.pfs]=el.value;feDirty();return}
    if(ds.lg==="val"){const f=feFind(FE.sel)?.f;if(f?.logic){typing();f.logic.val=el.value;feDirty()}return}
    if(ds.rb==="val"){FE.rb!.val=el.value;return}
    if(ds.o==="color"){feSetColor(el.value);return}
    if(ds.o==="hex"){const v=el.value.trim();if(/^#[0-9a-f]{6}$/i.test(v))feSetColor(v);return}
    if(ds.shuntil!==undefined){feDoc()!.share.until=el.value;feDirty();return}
    if(el.type==="range"&&ds.k){const f=feFind(ds.k)?.f;const mn=+(f?.min??0),mx=+(f?.max??100),u=f?.unit?" "+f.unit:"";feRoot()?.querySelectorAll<HTMLInputElement>(`.fe-pf input[type=range][data-k="${ds.k}"]`).forEach(r=>{r.value=el.value;const w=r.closest<HTMLInputElement>(".fe-sld");w!.classList.remove("empty");w!.style.setProperty("--p",Math.round(((el.value as unknown as number)-mn)/((mx-mn)||1)*100)+"%");w!.querySelector<HTMLInputElement>("output")!.textContent=nf(+el.value)+u})}
    if(ds.k&&el.closest<HTMLInputElement>(".fe-pf")&&el.type!=="file"&&el.type!=="radio"&&el.type!=="checkbox")fePvSet(ds.k,ds.sk,el.value,el);
  });
  R.addEventListener("change",e=>{
    const el=tgt(e),ds=el.dataset;
    if(el.type==="checkbox"&&ds.tdef!==undefined)return;
    if(el.tagName==="SELECT"&&ds.tdef!==undefined){const fid=el.closest<HTMLInputElement>(".fe-fld")?.dataset.fid,f=feFind(fid)?.f;if(f){feSnap();feTblEdSet(f,ds.tdef,el.value,el)}return}
    if(el.tagName==="SELECT"){
      if(ds.p){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f[ds.p!]=["cx","cy"].includes(ds.p!)?+el.value:el.value},["csrc","cx","cy"].includes(ds.p)?"canvas":null);return}
      if(ds.tct!==undefined){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.tcols![+ds.tct!].ty=el.value},"canvas");return}
      if(ds.pf){if(ds.pf==="lang"){feMut(d=>{d.lang=el.value||null},"all");return}feMut(d=>{d[ds.pf!]=el.value},null);feSyncHead();return}
      if(ds.lg){const f=feFind(FE.sel)?.f;if(!f?.logic)return;feMut(()=>{f.logic![ds.lg!]=el.value;if(ds.lg==="src")f.logic!.val=feFind(el.value)?.f.opts?.length?"0":"";},"canvas");return}
      if(ds.rb){FE.rb![ds.rb]=el.value;if(ds.rb==="src"){const s=feFind(el.value)?.f;FE.rb!.val=s?.opts?.length?"0":"";if(FE.rb!.tgt===el.value){const o: { id: string|undefined; }[]=[];feEach(f=>{if(f.id!==el.value)o.push(f)});FE.rb!.tgt=o[0]?.id}}if(ds.rb==="src"||ds.rb==="op")feRefresh("tab");return}
      if(ds.o){feS!.pv[ds.o]=el.value;feSave();fePvRender();if(ds.o==="lang"){FE.pv.err={};fePvOptsRender()}return}
      if(ds.k&&el.closest<HTMLInputElement>(".fe-pf")){fePvSet(ds.k,ds.sk,el.value,el);return}
      return}
    if(ds.k&&el.closest<HTMLInputElement>(".fe-pf")){
      if(el.type==="radio"){fePvSet(ds.k,ds.sk,el.value,el);return}
      if(el.type==="checkbox"&&el.closest<HTMLInputElement>(".fe-tab")){fePvSet(ds.k,ds.sk,el.checked?"1":"",el);return}
      if(el.type==="checkbox"){const box=el.closest<HTMLInputElement>(".fe-checks");const arr=[...box!.querySelectorAll<HTMLInputElement>("input:checked")].map(x=>x.value);fePvSet(ds.k,null,arr,el);return}
      if(el.type==="file"){const f=el.files![0];fePvSet(ds.k,null,f?f.name:"",null);fePvRender();return}
      if(el.type==="date"){fePvSet(ds.k,ds.sk,el.value,el);return}
    }
    if(ds.o==="color"){feSetColor(el.value,true);return}
  });
  R.addEventListener("submit",e=>{
    e.preventDefault();const f=tgt(e);
    if(f.matches("[data-aiask]")){const i=f.querySelector<HTMLInputElement>("input");feAiRun(i!.value);return}
    if(f.matches("[data-rbform]")){const rb=FE.rb,tg=feFind(rb!.tgt)?.f;if(!tg||!rb!.src)return;feMut(()=>{tg.logic={src:rb!.src,op:rb!.op,val:rb!.val,act:rb!.act}},null);FE.rb=null;feRefresh("tab");feSyncHead();feToast(t("fe_ruleAdded"));const row=R.querySelector<HTMLInputElement>(`[data-rf="${tg.id}"]`);if(row&&!feRM())row.animate([{background:"rgba(90,100,224,.16)"},{background:"transparent"}],{duration:1200});return}
    if(f.matches("[data-shinv]")){const i=f.querySelector<HTMLInputElement>("input"),v=i!.value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){feToast(t("fe_shInvalid"));i!.focus();return}feMut(d=>{if(!d.share.invites.includes(v))d.share.invites.push(v)},null);feRefresh("tab");feToast(t("fe_shSent",{x:v}));return}
  });
  R.addEventListener("paste",e=>{
    const el=tgt(e);if(!el.closest?.(".fe-tab"))return;const text=e.clipboardData?.getData("text")||"";if(!/[\t\n]/.test(text.replace(/\n+$/,"")))return;
    e.preventDefault();const ed=el.dataset.tdef!==undefined,sk=ed?el.dataset.tdef:el.dataset.sk;if(!sk)return;const [ri,cc]=sk.split("."),ci=+cc.slice(1);
    if(ed){const f=feFind(el.closest<HTMLInputElement>(".fe-fld")!.dataset.fid)?.f;if(!f)return;let n!: number;feMut(()=>{f.tdef=Array.isArray(f.tdef)?f.tdef:[];n=feTblPaste(f,+ri,ci,text,f.tdef,true);(f as Bag).rows=Math.max(f.rows||1,f.tdef.length)},"canvas");feToast(t("fe_tPasted",{n:nf(n)}));return}
    const k=el.dataset.k,f=feFind(k)?.f;if(!f)return;const rows=feTblRows(f,FE.pv.vals);const n=feTblPaste(f,+ri,ci,text,rows,f.addRows!==false);FE.pv.vals[k!]=rows;const u=el.closest<HTMLInputElement>(".fe-pf")!.dataset.u;fePvRender();fePvCharts();feRoot()?.querySelector<HTMLInputElement>(`.fe-pf[data-u="${u}"] [data-k="${k}"][data-sk="${sk}"]`)?.focus();
    feRoot()?.querySelectorAll<HTMLInputElement>(`.fe-pf .fe-tab[data-tbl="${k}"] tbody tr`).forEach((tr,i)=>{if(i>=+ri&&!feRM())tr.animate([{background:"color-mix(in srgb,var(--pc) 14%,transparent)"},{background:"transparent"}],{duration:900})});feToast(feTx("fe_tPasted",feS!.pv.lang||feCL(),{n:nf(n)}));
  });
  R.addEventListener("keydown",e=>{
    if(tgt(e).dataset?.thl!==undefined&&(e.key==="Enter"||e.key==="ArrowDown")){e.preventDefault();const tb=tgt(e).closest<HTMLInputElement>(".fe-tab");tb?.querySelector<HTMLInputElement>(`[data-tdef="0.c${tgt(e).dataset.thl}"]`)?.focus();return}
    if(tgt(e).matches?.("[data-thl]")&&e.key==="Escape"){tgt(e).blur();return}
    {const el=tgt(e),cell=el.closest?.(".fe-tab td");if(cell&&(e.key==="Enter"||((e.key==="ArrowDown"||e.key==="ArrowUp")&&el.tagName!=="SELECT"))&&!e.altKey&&!e.ctrlKey&&!e.metaKey){
      const ed=el.dataset.tdef!==undefined,an=ed?"data-tdef":"data-sk",sk=el.getAttribute(an);if(sk){e.preventDefault();e.stopPropagation();const [ri,cc]=sk.split("."),dir=e.key==="ArrowUp"||(e.key==="Enter"&&e.shiftKey)?-1:1,tbl=el.closest<HTMLInputElement>(".fe-tab"),nx=tbl!.querySelector<HTMLInputElement>(`[${an}="${+ri+dir}.${cc}"]`);
        if(nx){nx.focus();try{nx.select()}catch(x){}}
        else if(dir===1&&e.key==="Enter"){
          if(ed){const f=feFind(el.closest<HTMLInputElement>(".fe-fld")!.dataset.fid)?.f;if(f)feTblEdAdd(f,cc)}
          else{const k=el.dataset.k,f=feFind(k)?.f;if(!f||f.addRows===false)return;const rows=feTblRows(f,FE.pv.vals);while(rows.length<(f.rows||1))rows.push({});rows.push({});FE.pv.vals[k!]=rows;const u=el.closest<HTMLInputElement>(".fe-pf")!.dataset.u;fePvRender();const n=feRoot()?.querySelector<HTMLInputElement>(`.fe-pf[data-u="${u}"] [data-k="${k}"][data-sk="${rows.length-1}.${cc}"]`);if(n){n.focus();const tr=n.closest<HTMLInputElement>("tr");if(tr&&!feRM())tr.animate([{opacity:0,transform:"translateY(-6px)"},{opacity:1,transform:"none"}],{duration:260})}}
        }
        return}}}
    const c=tgt(e).closest?.<HTMLElement>(".fe-comp");if(c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();feAddField(c.dataset.ct!);return}
    const tr=tgt(e).closest?.<HTMLElement>(".fe-tr[data-open],.fe-tr[data-sub]");if(tr&&e.key==="Enter"){tr.click();return}
    if(tgt(e).matches?.("[data-gen]")&&e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();feAiRun(tgt(e).value,"gen")}
    if(tgt(e).matches?.("[data-aiin]")&&e.key==="Escape"){e.stopPropagation();feToggleAsk(false)}
  });
}
function feTblEdSet(f: FeField,sk: string,val: unknown,el?: Element | null){const [ri,cc]=sk.split(".");f.tdef=Array.isArray(f.tdef)?f.tdef:[];while(f.tdef.length<=+ri)f.tdef.push({});f.tdef[+ri][cc]=val;feDirty();
  if(f.tsum&&f.tsum!=="none"){const tb=el?.closest<HTMLInputElement>(".fe-tab");tb?.querySelectorAll<HTMLInputElement>("[data-tot]").forEach(td=>{const ci=+td.dataset.tot!;if(f.tcols![ci]?.ty==="number")td.textContent=feTblAgg(f,f.tdef!,ci,feCL())})}
  /* charts bound to this table follow the default data in the editor */
  feEach(x=>{if(x.type==="chart"&&x.csrc==="tbl:"+f.id){const el2=feRoot()?.querySelector<HTMLInputElement>(`.fe-cv .fe-fld[data-fid="${x.id}"] .fe-chart`);if(el2)el2.innerHTML=feChartHTML(x,feCL(),f.tdef!.some(r=>r&&Object.values(r).some(Boolean))?{[f.id]:f.tdef}:null)}})}
function feTblEdAdd(f: FeField,cc?: string){feMut(()=>{f.tdef=Array.isArray(f.tdef)?f.tdef:[];while(f.tdef.length<(f.rows||1))f.tdef.push({});f.tdef.push({});(f as Bag).rows=f.tdef.length},"canvas");const tb=feRoot()?.querySelector<HTMLInputElement>(`.fe-cv .fe-tab[data-tbl="${f.id}"]`);const tr=tb?.querySelector<HTMLInputElement>("tbody tr:last-child");if(tr&&!feRM())tr.animate([{opacity:0,transform:"translateY(-6px)"},{opacity:1,transform:"none"}],{duration:260});tr?.querySelector<HTMLInputElement>(cc?`[data-tdef$=".${cc}"]`:"input,select")?.focus()}
function feSetColor(c: string,final?: boolean){feS!.pv.color=c;const R=feRoot();R?.querySelectorAll<HTMLInputElement>(".fe-pf").forEach(p=>p.style.setProperty("--pc",c));const sw=R?.querySelector<HTMLInputElement>(".fe-sw");if(sw)sw.style.background=c;const hx=R?.querySelector<HTMLInputElement>('[data-o="hex"]');if(hx&&document.activeElement!==hx)hx.value=c.toUpperCase();R?.querySelectorAll<HTMLInputElement>("[data-ocol]").forEach(x=>x.setAttribute("aria-checked",(x.dataset.ocol===c.toUpperCase()) as unknown as string));const ci=R?.querySelector<HTMLInputElement>('[data-o="color"]');if(ci&&ci.value!==c.toLowerCase())ci.value=c.toLowerCase();
  clearTimeout(FE.colT);FE.colT=setTimeout(()=>{feSave();R?.querySelectorAll<HTMLInputElement>(".fe-pfh").forEach(h=>{const svg=h.querySelector<HTMLInputElement>("svg,img");if(svg){const tmp=document.createElement("div");tmp.innerHTML=feS!.pv.theme==="min"?"":feHdrSVG();svg.replaceWith(...tmp.childNodes)}});R?.querySelectorAll<HTMLInputElement>(".fe-pf .fe-lg:not(.img)").forEach(l=>l.style.background=c);const th=R?.querySelectorAll<HTMLInputElement>(".fe-asset .th");th?.forEach((x,i)=>{x.innerHTML=i===0?feLogoHTML():feHdrSVG()})},final?0:120)}
function fePvSign(e: PointerEvent,cv: HTMLCanvasElement){
  e.preventDefault();const k=cv.dataset.k,ctx=cv.getContext("2d"),r=cv.getBoundingClientRect(),sx=cv.width/r.width,sy=cv.height/r.height;cv.setPointerCapture(e.pointerId);
  ctx!.strokeStyle="#1d2420";ctx!.lineWidth=2.6;ctx!.lineCap="round";ctx!.lineJoin="round";ctx!.beginPath();ctx!.moveTo((e.clientX-r.left)*sx,(e.clientY-r.top)*sy);(cv.parentNode as HTMLElement).classList.add("has");
  const mv=(ev: { clientX: number; clientY: number; })=>{ctx!.lineTo((ev.clientX-r.left)*sx,(ev.clientY-r.top)*sy);ctx!.stroke()};
  const up=()=>{cv.removeEventListener("pointermove",mv);cv.removeEventListener("pointerup",up);cv.removeEventListener("pointercancel",up);FE.pv.vals[k!]=cv.toDataURL();if(FE.pv.err[k!]){delete FE.pv.err[k!];cv.closest<HTMLInputElement>(".fe-pfld")?.classList.remove("err");cv.closest<HTMLInputElement>(".fe-pfld")?.querySelector<HTMLInputElement>(".fe-perr")?.remove()}
    feRoot()?.querySelectorAll<HTMLCanvasElement>(`.fe-pf canvas[data-sign][data-k="${k}"]`).forEach(o=>{if(o===cv)return;(o.parentNode as HTMLElement).classList.add("has");const im=new Image();im.onload=()=>{const c2=o.getContext("2d");c2!.clearRect(0,0,o.width,o.height);c2!.drawImage(im,0,0,o.width,o.height)};im.src=FE.pv.vals[k!] as string})};
  cv.addEventListener("pointermove",mv);cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
}
function feZoom(z: number){FE.zoom=Math.max(50,Math.min(150,z));const R=feRoot(),p=R?.querySelector<HTMLInputElement>(".fe-paper");if(p)p.style.zoom=(FE.zoom/100) as unknown as string;const b=R?.querySelector<HTMLInputElement>("[data-zoom]");if(b)b.innerHTML=fePct(FE.zoom)+FEI.chev;if(p&&!feRM())p.animate([{opacity:.6},{opacity:1}],{duration:240})}

/* keyboard shortcuts inside the app (capture so desktop shortcuts never fire underneath) */
onDoc("keydown",e=>{
  const R=feRoot();if(!R||!tgt(e).closest?.(".fe"))return;
  const inField=tgt(e).closest<HTMLInputElement>("input,textarea,select,[contenteditable=true],[contenteditable=plaintext-only]");
  const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  const own=()=>{e.stopImmediatePropagation()};
  if(e.key==="Escape"&&FE.modal){e.preventDefault();own();feModalClose();return}
  if(e.key==="Escape"){if(R.matches(".o-nav,.o-comps,.o-props")){R.classList.remove("o-nav","o-comps","o-props");own();e.preventDefault();return}if(FE.pv.test&&FE.tab==="preview"){FE.pv.test=false;R.querySelector<HTMLInputElement>(".fe-pv")?.classList.remove("test");own();return}if(FE.ask&&!inField){feToggleAsk(false);own();return}return}
  if(inField){if(["Delete","Backspace","F2"].includes(e.key)||mod&&"acvxzyd".includes(k))own();if(mod&&k==="s"){e.preventDefault();feCommit();own()}return}
  if(FE.view!=="editor")return;
  if(mod&&k==="z"&&!e.shiftKey){e.preventDefault();feUndo();own();return}
  if(mod&&(k==="y"||k==="z"&&e.shiftKey)){e.preventDefault();feRedo();own();return}
  if(mod&&k==="s"){e.preventDefault();feCommit();own();return}
  if(FE.tab!=="editor")return;
  if(mod&&k==="c"&&FE.sel){e.preventDefault();feCopyField();own();return}
  if(mod&&k==="x"&&FE.sel){e.preventDefault();feCopyField(true);own();return}
  if(mod&&k==="v"&&FE.clip){e.preventDefault();fePasteField();own();return}
  if((e.key==="Delete"||e.key==="Backspace")&&FE.sel){e.preventDefault();feDelField(FE.sel);own();return}
  if(mod&&k==="d"&&FE.sel){e.preventDefault();feDupField(FE.sel);own();return}
  if((e.key==="ArrowDown"||e.key==="ArrowUp")&&FE.sel&&tgt(e).closest<HTMLInputElement>(".fe-fld")){e.preventDefault();own();const all=[...R.querySelectorAll<HTMLInputElement>(".fe-cv .fe-fld")];const i=all.findIndex(x=>x.dataset.fid===FE.sel);const n=all[i+(e.key==="ArrowDown"?1:-1)];if(n)feSelect(n.dataset.fid!,{focus:true,scroll:true});return}
  if(e.key==="Enter"&&tgt(e).closest<HTMLInputElement>(".fe-fld")){e.preventDefault();own();feSelect(tgt(e).closest<HTMLInputElement>(".fe-fld")!.dataset.fid!,{props:true});return}
  if(["Delete","Backspace","F2","Enter"].includes(e.key)||mod&&"acvx".includes(k))own();
},true);

/* ================= Forms: universal component registry & domain libraries ================= */
Object.assign(FEI,(()=>{const s=(p: string,w=16)=>`<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;return{
  url:s('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>'),
  currency:s('<path d="M17.5 6.5A7 7 0 1 0 17.5 17.5M4 10.5h9M4 13.5h9"/>'),
  percent:s('<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'),
  datetime:s('<rect x="3" y="4.5" width="13" height="12" rx="2"/><path d="M3 8.5h13M7 2.5v3M12 2.5v3"/><circle cx="17" cy="16.5" r="4.5"/><path d="M17 14.5v2.2l1.4.9"/>'),
  range:s('<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 14.5h3M14 14.5h3M10 14.5h4"/>'),
  hourglass:s('<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>'),
  cake:s('<path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M3 21h18M4 16c2 1.5 4 1.5 5.3 0s4-1.5 5.4 0 3.8 1.5 5.3 0M12 12V8"/><path d="M12 4.5c.8.8.8 1.8 0 2.5-.8-.7-.8-1.7 0-2.5z"/>'),
  pin:s('<path d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  likert:s('<circle cx="4.5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19.5" cy="12" r="2" fill="currentColor"/><path d="M6.5 12h3.5M14 12h3.5"/>'),
  semantic:s('<path d="M3 12h18"/><path d="M3 9v6M21 9v6"/><circle cx="14" cy="12" r="2.4" fill="currentColor"/>'),
  mood:s('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.6 4.6 0 0 0 7 0M9 9.6h.01M15 9.6h.01"/>'),
  chips:s('<rect x="2.5" y="6" width="9" height="5.5" rx="2.75"/><rect x="13" y="6" width="8.5" height="5.5" rx="2.75"/><rect x="5" y="13.5" width="10" height="5.5" rx="2.75"/>'),
  body:s('<circle cx="12" cy="4.5" r="2.3"/><path d="M8 8.5h8l-1 6.5h-2v6.5h-2V15H9z"/><path d="M8 8.5 5.5 14M16 8.5l2.5 5.5"/>'),
  rom:s('<path d="M5 19h14"/><path d="M5 19 16 7"/><path d="M11.5 19a6.5 6.5 0 0 0-2-4.7"/>'),
  strength:s('<path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11"/>'),
  measure:s('<path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/>'),
  user:s('<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.2 3.8-6.5 7.5-6.5s6.8 2.3 7.5 6.5"/>'),
  building:s('<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10.5 21v-3h3v3"/>'),
  formula:s('<path d="M7 20c2 0 2.5-1.5 3-4l2-10c.5-2.5 1-3.5 3-3.5M7.5 10h8M13 14l5 5M18 14l-5 5"/>'),
  score:s('<path d="M4 20h16"/><rect x="5" y="12" width="3.5" height="8" rx="1"/><rect x="10.25" y="7" width="3.5" height="13" rx="1"/><rect x="15.5" y="3.5" width="3.5" height="16.5" rx="1"/>'),
  note:s('<path d="M5 3.5h10l4 4V20.5H5z"/><path d="M15 3.5V8h4M8.5 12h7M8.5 15.5h5"/><circle cx="17.5" cy="17.5" r="3.2" fill="var(--surface,#fff)"/><path d="M16.5 17.5h2M17.5 16.5v2"/>'),
  repeat:s('<path d="M17 2.5 20 5.5l-3 3"/><path d="M4 11.5v-2a4 4 0 0 1 4-4h12M7 21.5l-3-3 3-3"/><path d="M20 12.5v2a4 4 0 0 1-4 4H4"/>'),
  heart:s('<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>'),
  brain:s('<path d="M9.5 4.5a3 3 0 0 0-3 3v.3A3 3 0 0 0 4.5 13a3 3 0 0 0 2 4.7A3 3 0 0 0 12 19V6a2.6 2.6 0 0 0-2.5-1.5zM14.5 4.5a3 3 0 0 1 3 3v.3a3 3 0 0 1 2 5.2 3 3 0 0 1-2 4.7A3 3 0 0 1 12 19"/>'),
  walk:s('<circle cx="13" cy="4" r="2"/><path d="M10 21l2-6 3 3v3M9.5 9.5 13 7l3 3.5 3 1M13 7l-1.5 6.5-3 2"/>'),
  briefcase:s('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12.5h18"/>'),
  grid:s('<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>'),
  outline:s('<path d="M4 6h16M8 12h12M8 18h12M4 12h.01M4 18h.01"/>'),
  starF:'<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
  wand:s('<path d="m3 21 12-12M14 4v2M18 8h2M19 3l-1.5 1.5M14 9l1 1"/>'),
  compose:s('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 14v6M14 17h6"/>'),
  import:s('<path d="M12 3v12M7 10l5 5 5-5M4 15v5h16v-5"/>'),
  scan:s('<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/>'),
  shield:s('<path d="M12 3 4.5 6v6c0 4.4 3.2 8 7.5 9 4.3-1 7.5-4.6 7.5-9V6z"/>'),
  eyeoff:s('<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15.6 15.6 0 0 1-3 3.4M6.6 7.6A15.6 15.6 0 0 0 3 12s4 6 9 6a9 9 0 0 0 4.4-1.2"/>'),
  paste:s('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>'),
  cut:s('<circle cx="6" cy="18" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="M8 16 18 4M16 16 6 4"/>')
}})());

/* ---------- presets: domain components built on generic types ---------- */
const FE_PRE: Record<string, { base: string; make: (f: FeField) => void }>={};
const fePre=(id: string,base: string,ic: string,make: (f: FeField) => void)=>{FE_PRE[id]={base,make};FE_T[id]=[ic,"fe_p_"+id];if(FE_WIDE.has(base)||["table","matrix","group","likert","chips"].includes(base))FE_WIDE.add(id)};
/* new base types */
Object.assign(FE_T,{url:["url","fe_cUrl"],currency:["currency","fe_cCurrency"],percent:["percent","fe_cPercent"],datetime:["datetime","fe_cDatetime"],daterange:["range","fe_cDaterange"],duration:["hourglass","fe_cDuration"],age:["cake","fe_cAge"],address:["pin","fe_cAddress"],likert:["likert","fe_cLikert"],semantic:["semantic","fe_cSemantic"],mood:["mood","fe_cMood"],chips:["chips","fe_cChips"],bodymap:["body","fe_cBodymap"],rom:["rom","fe_cRom"],strength:["strength","fe_cStrength"],measure:["measure","fe_cMeasure"],selector:["user","fe_cSelector"],formula:["formula","fe_cFormula"],score:["score","fe_cScore"],privnote:["note","fe_cPrivnote"]});
["address","likert","bodymap","rom","strength","measure","score","privnote","chips","daterange"].forEach(x=>FE_WIDE.add(x));
["currency","percent","likert","semantic","mood","formula","score"].forEach(x=>FE_NUM.add(x));
const FE_CALC=new Set(["formula","score","age"]);
fePre("repeat","group","repeat",f=>{f.label="fe_p_repeat";f.repeat=true;f.rmax=5;f.fields=[feField("text","fe_fNom",{key:"element_nom"}),feField("text","fe_p_repeat_v",{key:"element_detail"})]});
fePre("sel_pract","selector","user",f=>{f.kind="pract";f.label="fe_p_sel_pract"});
fePre("sel_org","selector","building",f=>{f.kind="org";f.label="fe_p_sel_org"});
fePre("sel_loc","selector","pin",f=>{f.kind="loc";f.label="fe_p_sel_loc"});
fePre("sel_appt","selector","date",f=>{f.kind="appt";f.label="fe_p_sel_appt"});
fePre("hc_symptoms","multi","clinical",f=>{f.label="fe_p_hc_symptoms";f.opts=["fe_sy1","fe_sy2","fe_sy3","fe_sy4","fe_sy5","fe_sy6"]});
fePre("hc_bmi","formula","formula",f=>{f.label="fe_p_hc_bmi";f.expr="round({poids} / ({taille}/100)^2, 1)";f.unit="kg/m²"});
fePre("hc_obs","privnote","note",f=>{f.label="fe_p_hc_obs"});
fePre("emo","chips","chips",f=>{f.label="fe_p_emo";f.opts=["fe_em1","fe_em2","fe_em3","fe_em4","fe_em5","fe_em6","fe_em7","fe_em8"]});
fePre("psy_freq","likert","likert",f=>{f.label="fe_p_psy_freq";f.period="fe_period2w";f.opts=["fe_fq1","fe_fq2","fe_fq3","fe_fq4"]});
fePre("psy_stress","slider","slider",f=>{f.label="fe_p_psy_stress";f.min=0;f.max=10;f.step=1;f.unit=""});
fePre("psy_sleep","slider","clock",f=>{f.label="fe_p_psy_sleep";f.min=0;f.max=12;f.step=.5;f.unit="h"});
fePre("psy_wellbeing","likert","heart",f=>{f.label="fe_p_psy_wellbeing";f.opts=["fe_ag1","fe_ag2","fe_ag3","fe_ag4","fe_ag5"]});
fePre("psy_goal","table","clinical",f=>{f.label="fe_p_psy_goal";f.tcols=[{l:"fe_tGoal",ty:"text"},{l:"fe_tDue",ty:"date"},{l:"fe_tProgress",ty:"rating"}];(f as Bag).rows=2});
fePre("psy_progress","slider","measure",f=>{f.label="fe_p_psy_progress";f.min=0;f.max=10;f.step=1});
fePre("psy_coping","multi","chips",f=>{f.label="fe_p_psy_coping";f.opts=["fe_cp1","fe_cp2","fe_cp3","fe_cp4","fe_cp5","fe_cp6"]});
fePre("psy_journal","textarea","textarea",f=>{f.label="fe_p_psy_journal";f.ph="fe_phJournal"});
fePre("psy_feedback","sat","sat",f=>{f.label="fe_p_psy_feedback"});
fePre("phy_balance","likert","walk",f=>{f.label="fe_p_phy_balance";f.opts=["fe_bl1","fe_bl2","fe_bl3","fe_bl4"]});
fePre("phy_gait","select","walk",f=>{f.label="fe_p_phy_gait";f.disp="list";f.opts=["fe_gt1","fe_gt2","fe_gt3","fe_gt4"]});
fePre("phy_adl","matrix","matrix",f=>{f.label="fe_p_phy_adl";(f as Bag).rows=["fe_adl1","fe_adl2","fe_adl3","fe_adl4","fe_adl5"];(f as Bag).cols=["fe_adlc1","fe_adlc2","fe_adlc3"]});
fePre("phy_ex","table","table",f=>{f.label="fe_p_phy_ex";f.tcols=[{l:"fe_tEx",ty:"text"},{l:"fe_tSets",ty:"number"},{l:"fe_tReps",ty:"number"},{l:"fe_tDone",ty:"checkbox"}];(f as Bag).rows=3;f.tsum="sum"});
fePre("phy_device","multi","walk",f=>{f.label="fe_p_phy_device";f.opts=["fe_dv1","fe_dv2","fe_dv3","fe_dv4","fe_dv5"]});
fePre("phy_adherence","slider","percent",f=>{f.label="fe_p_phy_adherence";f.min=0;f.max=100;f.step=5;f.unit="%"});
fePre("phy_goal","textarea","clinical",f=>{f.label="fe_p_phy_goal";f.ph="fe_phGoal"});
fePre("biz_company","text","building",f=>{f.label="fe_p_biz_company"});
fePre("biz_siret","text","number",f=>{f.label="fe_p_biz_siret";f.regex="^\\d{14}$";f.ph="12345678900012";f.min=14;f.max=14});
fePre("biz_approval","sign","sign",f=>{f.label="fe_p_biz_approval"});
/* library groups (replaces the earlier set, same object so every view follows) */
FE_G.length=0;FE_G.push(
  ["base","fe_gBase",["text","textarea","email","phone","url","number","currency","percent","date","datetime","daterange","duration","age","address","file"]],
  ["choice","fe_gChoice",["select","multi","yesno","chips","likert","semantic","rank","matrix","slider","rating"]],
  ["layout","fe_gLayout",["group","repeat","info","divider"]],
  ["adv","fe_gAdv",["table","chart","formula","score","sign","calc","hidden","privnote"]],
  ["health","fe_gHealth",["patient","sel_pract","sel_org","sel_loc","sel_appt","history","allergy","meds","vitals","clinical","hc_symptoms","hc_bmi","hc_obs"]],
  ["psy","fe_gPsy",["mood","emo","psy_freq","psy_stress","psy_sleep","psy_wellbeing","psy_goal","psy_progress","psy_coping","psy_journal","psy_feedback"]],
  ["physio","fe_gPhysio",["bodymap","rom","strength","measure","phy_balance","phy_gait","phy_adl","phy_ex","phy_device","phy_adherence","phy_goal"]],
  ["survey","fe_gSurvey",["sat","nps","rating","likert","semantic","matrix","rank"]],
  ["business","fe_gBiz",["biz_company","biz_siret","currency","percent","url","address","biz_approval","table"]]);
const FE_CHIPS: [string, string, string[] | null][]=[["all","fe_fAllChip",null],["base","fe_cfBase",["base"]],["choice","fe_cfChoice",["choice"]],["layout","fe_cfLayout",["layout"]],["adv","fe_fAdv",["adv"]],["health","fe_fHealth",["health"]],["psy","fe_cfPsy",["psy"]],["physio","fe_cfPhysio",["physio"]],["survey","fe_fSurvey",["survey"]],["business","fe_cfBiz",["business"]],["blocks","fe_cfBlocks",null],["fav","fe_cfFav",null],["recent","fe_cfRecent",null]];
const FE_SAMPLE: Record<string, string[]>={pract:["Dr Laurent · Kinésithérapeute","Dr Benali · Médecin généraliste","Mme Rossi · Psychologue","M. Weber · Ergothérapeute","Dr Haddad · Médecin rééducateur"],org:["Clinique Remotion","Centre de rééducation du Lac","Cabinet Santé Plus"],loc:["Site principal","Antenne Nord","Salle 2 · Kinésithérapie","Téléconsultation"]};
function feApptSlots(){const r: string[]=[],d=new Date();d.setHours(0,0,0,0);const pr=["Dr Laurent","Dr Benali","Mme Rossi"];for(let i=1;i<=6;i++){const x=new Date(d.getTime()+i*864e5);if(x.getDay()===0||x.getDay()===6)continue;([["09",30],["14",0]] as [string, number][]).forEach(([h,m],j)=>{x.setHours(+h,m);r.push(x.toLocaleString(loc(),{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})+" · "+pr[(i+j)%3])})}return r}

/* ---------- feNewField: presets, blocks, new type defaults ---------- */
{const _nf0=feNewField;feNewField=function(type,label){
  if(String(type).startsWith("blk:"))return feBlockInstance(type.slice(4));
  const p=FE_PRE[type];if(p){const f=_nf0(p.base);p.make(f);if(label)f.label=label;f.pre=type;f.key=feUniqKey(fv(f.label,"fr"),f);if(f.fields)f.fields.forEach(x=>{x.id=feId();x.key=feUniqKey(x.key||"champ",x)});return f}
  const f=_nf0(type,label);
  if(type==="currency"){f.cur="€";f.min=0}
  if(type==="percent"){f.min=0;f.max=100}
  if(type==="likert")f.opts=["fe_ag1","fe_ag2","fe_ag3","fe_ag4","fe_ag5"];
  if(type==="semantic"){f.left="fe_semL";f.right="fe_semR";f.pts=7}
  if(type==="mood")f.opts=["fe_md1","fe_md2","fe_md3","fe_md4","fe_md5"];
  if(type==="chips")f.opts=[1,2,3,4].map(n=>t("fe_opt",{n}));
  if(type==="rom"){f.joint="knee";f.move="flex";f.norm=135}
  if(type==="measure"){f.unit="cm";f.mname=""}
  if(type==="selector")f.kind="pract";
  if(type==="formula"){f.expr="";f.dec=1;f.unit=""}
  if(type==="score"){f.items=[];f.meth="sum";f.bands=[{max:4,label:t("fe_bandLow"),tone:"ok"},{max:9,label:t("fe_bandMid"),tone:"warn"},{max:999,label:t("fe_bandHigh"),tone:"bad"}]}
  if(type==="age")f.dob="";
  return f;
}}

/* ---------- body map ---------- */
const FE_BM: Record<string, (string | number)[][]>=(()=>{const F=[["head","e",60,22,14,17],["neck","r",54,38,12,10],["chest","r",38,48,44,36,10],["abdo","r",40,84,40,30,8],["pelvis","r",40,114,40,22,10],["shoulder","e",34,54,9,8,"R"],["shoulder","e",86,54,9,8,"L"],["arm","r",22,60,12,34,6,"R"],["arm","r",86,60,12,34,6,"L"],["forearm","r",18,96,11,32,5,"R"],["forearm","r",91,96,11,32,5,"L"],["hand","e",22,136,6,8,"R"],["hand","e",98,136,6,8,"L"],["thigh","r",41,138,17,44,7,"R"],["thigh","r",62,138,17,44,7,"L"],["knee","e",49.5,188,8,7,"R"],["knee","e",70.5,188,8,7,"L"],["leg","r",43,196,13,40,6,"R"],["leg","r",64,196,13,40,6,"L"],["foot","e",48,245,9,5,"R"],["foot","e",72,245,9,5,"L"]];
  const B=F.map(x=>{const y=x.slice();if(y[0]==="chest")y[0]="upback";if(y[0]==="abdo")y[0]="lowback";if(y[0]==="pelvis")y[0]="buttock";const s=y[y.length-1];if(s==="L"||s==="R")y[y.length-1]=s==="L"?"R":"L";return y});return {f:F,b:B}})();
const feBmLabel=(id: string,L: string)=>{const [v,p,s]=id.split(".");return feTx("fe_bm_"+p,L)+(s?" "+feTx(s==="L"?"fe_bmL":"fe_bmR",L):"")+(v==="b"&&!["upback","lowback","buttock"].includes(p)?" ("+feTx("fe_bmBack",L)+")":"")};
function feBodySVG(view: string,sel: string[],live: boolean,k: string,dis: string,L: string){
  const shapes=FE_BM[view].map(x=>{const [p,sh]=x,side=["L","R"].includes(x[x.length-1] as string)?x[x.length-1]:"",id=`${view}.${p}${side?"."+side:""}`,on=sel.includes(id);
    const a=live&&!dis?`${k} data-bm="${id}" tabindex="0" role="checkbox" aria-checked="${on}" aria-label="${FEE(feBmLabel(id,L))}"`:"";
    return sh==="e"?`<ellipse cx="${x[2]}" cy="${x[3]}" rx="${x[4]}" ry="${x[5]}" class="${on?"on":""}" ${a}><title>${FEE(feBmLabel(id,L))}</title></ellipse>`:`<rect x="${x[2]}" y="${x[3]}" width="${x[4]}" height="${x[5]}" rx="${x[6]||4}" class="${on?"on":""}" ${a}><title>${FEE(feBmLabel(id,L))}</title></rect>`}).join("");
  return `<figure class="fe-bmv"><svg viewBox="0 0 120 256" class="fe-bmsvg" role="group" aria-label="${FEE(feTx(view==="f"?"fe_bmFront":"fe_bmBack2",L))}">${shapes}</svg><figcaption>${FEE(feTx(view==="f"?"fe_bmFront":"fe_bmBack2",L))}</figcaption></figure>`;
}
/* ---------- ROM reference values (indicative, editable) ---------- */
const FE_ROMJ: Record<string, Record<string, number>>={shoulder:{flex:180,ext:60,abd:180,rint:70,rext:90},elbow:{flex:150,ext:0},wrist:{flex:80,ext:70},hip:{flex:120,ext:30,abd:45,rint:40,rext:45},knee:{flex:135,ext:0},ankle:{flex:20,ext:50},cspine:{flex:50,ext:60,rint:80},lspine:{flex:60,ext:25}};

/* ---------- controls for the new types ---------- */
{const _ctl0=feCtl;feCtl=function(f,L,P){
  const live=!!P,v=live?P.vals[f.id] as FeAnsR:undefined,dis=live&&(P.ro||f.ro)?" disabled":"",id=live?`${P.uid}-${f.id}`:"",k=`data-k="${f.id}"`,tx=(s: unknown)=>FEE(s),ph=fv(f.ph,L);
  const box=(inner: string,end="")=>`<div class="fe-in">${inner}${end?`<span class="end">${end}</span>`:""}</div>`;
  const unitIn=(type: string,u: string,extra="")=>live?`<div class="fe-unit"><input class="fe-in" id="${id}" type="${type}" ${k} value="${FEE(v??"")}" placeholder="${FEE(ph)}"${extra}${dis}><em>${tx(u)}</em></div>`:`<div class="fe-unit">${box(ph?`<span class="ph">${tx(ph)}</span>`:"")}<em>${tx(u)}</em></div>`;
  const o=(v&&typeof v==="object"&&!Array.isArray(v)?v:{}) as FeAnsO;
  switch(f.type){
    case "url":return live?`<input class="fe-in" id="${id}" type="url" ${k} value="${FEE(v??"")}" placeholder="https://"${dis} dir="ltr">`:box(`<span class="ph">https://</span>`,FEI.url);
    case "currency":return unitIn("number",f.cur||"€",' inputmode="decimal" step="0.01"');
    case "percent":return unitIn("number","%",' inputmode="decimal" min="0" max="100"');
    case "datetime":return live?`<input class="fe-in" id="${id}" type="datetime-local" ${k} value="${FEE(v??"")}"${dis}>`:box(`<span class="ph">${tx(feTx("fe_phDob",L))} · --:--</span>`,FEI.datetime);
    case "daterange":return `<div class="fe-2c">${["a","b"].map(sk=>`<label><span>${tx(feTx(sk==="a"?"fe_from":"fe_to",L))}</span>${live?`<input class="fe-in" type="date" ${k} data-sk="${sk}" value="${FEE(o[sk]??"")}"${dis}>`:box("",FEI.date)}</label>`).join("")}</div>`;
    case "duration":return `<div class="fe-2c">${[["h","fe_hours","h"],["m","fe_minutes","min"]].map(([sk,lk,u])=>`<label><span>${tx(feTx(lk,L))}</span><div class="fe-unit">${live?`<input class="fe-in" type="number" min="0" ${sk==="m"?'max="59"':""} ${k} data-sk="${sk}" value="${FEE(o[sk]??"")}"${dis}>`:box("")}<em>${u}</em></div></label>`).join("")}</div>`;
    case "age":{const val=live?feAgeOf(f,P.vals,L):null;return `<div class="fe-in calc">${FEI.cake}<span>${val??tx(feTx("fe_ageAuto",L))}</span></div>`}
    case "address":return `<div class="fe-addr">${[["rue","fe_fAddr","w3"],["cpl","fe_addrCpl","w3"],["cp","fe_fCp",""],["ville","fe_fVille","w2"],["pays","fe_fPays","w3"]].map(([sk,lk,c])=>`<label class="${c}"><span>${tx(feTx(lk,L))}</span>${live?`<input class="fe-in" ${k} data-sk="${sk}" value="${FEE(o[sk]??"")}" ${sk==="cp"?'inputmode="numeric" autocomplete="postal-code"':sk==="rue"?'autocomplete="street-address"':""}${dis} dir="auto">`:box("")}</label>`).join("")}</div>`;
    case "likert":{const O=feOpts(f,L);return `${f.period?`<div class="fe-period">${FEI.clock}${tx(fv(f.period,L))}</div>`:""}<div class="fe-lik" role="radiogroup" style="--n:${O.length}">${O.map((op,i)=>live?`<label class="fe-likb"><input type="radio" name="${id}" ${k} value="${i}" ${String(v)===String(i)?"checked":""}${dis}><i></i><span>${tx(op)}</span></label>`:`<span class="fe-likb"><i></i><span>${tx(op)}</span></span>`).join("")}</div>`}
    case "semantic":{const n=f.pts||7;return `<div class="fe-sem"><span class="l">${tx(fv(f.left,L))}</span><div class="pts" role="radiogroup">${Array.from({length:n},(_,i)=>live?`<label><input type="radio" name="${id}" ${k} value="${i+1}" ${String(v)===String(i+1)?"checked":""}${dis} aria-label="${i+1}/${n}"><i></i></label>`:`<span><i></i></span>`).join("")}</div><span class="r">${tx(fv(f.right,L))}</span></div>`}
    case "mood":{const O=feOpts(f,L);return `<div class="fe-mood" role="radiogroup">${O.map((op,i)=>`<button type="button" class="${String(v)===String(i)?"on":""}" ${live?`${k} data-pick="${i}"`:'tabindex="-1"'} style="--h:${i*30}"${dis}>${feFace(Math.round(i*4/Math.max(1,O.length-1)))}<span>${tx(op)}</span></button>`).join("")}</div>`}
    case "chips":{const O=feOpts(f,L),arr=(Array.isArray(v)?v:[]) as string[];return `<div class="fe-chipsel">${O.map((op,i)=>`<button type="button" class="${arr.includes(String(i))?"on":""}" ${live?`${k} data-chip="${i}" aria-pressed="${arr.includes(String(i))}"`:'tabindex="-1"'}${dis}>${tx(op)}</button>`).join("")}</div>`}
    case "bodymap":{const sel=(Array.isArray(v)?v:[]) as string[];return `<div class="fe-bm">${feBodySVG("f",sel,live,k,dis,L)}${feBodySVG("b",sel,live,k,dis,L)}<div class="fe-bmsel">${sel.length?sel.map(s=>`<span class="fe-bmtag">${tx(feBmLabel(s,L))}${live&&!dis?`<button type="button" ${k} data-bm="${s}" aria-label="${tx(feTx("fe_delField",L))}">${FEI.x}</button>`:""}</span>`).join(""):`<span class="mut">${tx(feTx(live?"fe_bmHint":"fe_bmHintEd",L))}</span>`}</div></div>`}
    case "rom":{const max=+f.norm!||FE_ROMJ[f.joint!]?.[f.move!]||180;return `<div class="fe-rom"><div class="hd">${FEI.rom}<b>${tx(feTx("fe_j_"+f.joint,L))} · ${tx(feTx("fe_mv_"+f.move,L))}</b><small>${tx(feTx("fe_romRef",L,{n:nf(max)}))}</small></div>${[["l","fe_bmL"],["r","fe_bmR"]].map(([sk,lk])=>{const val=o[sk],pct=val!==undefined&&val!==""?Math.max(0,Math.min(100,+val!/max*100)):0;return `<div class="row"><span class="s">${tx(feTx(lk,L))}</span><div class="fe-unit">${live?`<input class="fe-in" type="number" min="0" max="${Math.max(max*1.5,10)}" ${k} data-sk="${sk}" value="${FEE(val??"")}"${dis} aria-label="${tx(feTx(lk,L))}">`:box("")}<em>°</em></div><div class="bar"><i style="width:${pct}%"></i></div></div>`}).join("")}</div>`}
    case "strength":return `<div class="fe-str">${[["l","fe_bmL"],["r","fe_bmR"]].map(([sk,lk])=>`<div class="row"><span class="s">${tx(feTx(lk,L))}</span><div class="pts" role="radiogroup">${[0,1,2,3,4,5].map(n=>`<button type="button" class="${String(o[sk])===String(n)?"on":""}" ${live?`${k} data-str="${sk}" data-n="${n}"`:'tabindex="-1"'} title="${tx(feTx("fe_mrc"+n,L))}"${dis}>${nf(n)}</button>`).join("")}</div></div>`).join("")}<small class="fe-mut">${tx(feTx("fe_mrcHint",L))}</small></div>`;
    case "measure":{const rows=(Array.isArray(v)&&v.length?v:[{}]) as FeAnsO[];const nums=rows.map(r=>parseFloat(String(r.v??"").replace(",","."))).filter(x=>isFinite(x));
      const spark=nums.length>1?(()=>{const mn=Math.min(...nums),mx=Math.max(...nums),W=120,H=30;const pts=nums.map((n,i)=>`${(i/(nums.length-1)*W).toFixed(1)},${(H-((n-mn)/((mx-mn)||1))*(H-6)-3).toFixed(1)}`).join(" ");return `<svg viewBox="0 0 120 30" class="fe-spark"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`})():"";
      return `<div class="fe-meas">${rows.map((r,i)=>`<div class="rw">${live?`<input class="fe-in" type="date" ${k} data-sk="${i}.d" value="${FEE(r.d??"")}"${dis}><div class="fe-unit"><input class="fe-in" type="number" inputmode="decimal" step="any" ${k} data-sk="${i}.v" value="${FEE(r.v??"")}"${dis}><em>${tx(f.unit||"")}</em></div>`:`${box("",FEI.date)}<div class="fe-unit">${box("")}<em>${tx(f.unit||"")}</em></div>`}</div>`).join("")}<div class="ft"><button type="button" class="fe-lnk" ${live?`data-medadd="${f.id}"`:'tabindex="-1"'}${dis}>${FEI.plus}${tx(feTx("fe_measAdd",L))}</button>${spark}</div></div>`}
    case "selector":{const kind=f.kind||"pract",list=kind==="appt"?feApptSlots():FE_SAMPLE[kind]||[];return live?`<div class="fe-selw"><select class="fe-in" id="${id}" ${k}${dis}><option value="">${tx(feTx("fe_phSel",L))}</option>${list.map(x=>`<option ${v===x?"selected":""}>${tx(x)}</option>`).join("")}</select>${FEI.chev}</div><small class="fe-sample">${tx(feTx("fe_sampleList",L))}</small>`:box(`<span class="ph">${tx(feTx("fe_selPh_"+kind,L))}</span>`,FEI.search)}
    case "formula":{if(!live)return `<div class="fe-in calc fe-mono">${FEI.formula}<span>${tx(f.expr||feTx("fe_fxEmpty",L))}</span></div>`;const r=feFormulaEval(f.expr,P.vals);return `<div class="fe-in calc">${FEI.formula}<span>${r.ok&&r.v!=null?nf(+r.v.toFixed(f.dec??1))+(f.unit?" "+tx(f.unit):""):"—"}</span></div>`}
    case "score":{const r=live?feScoreOf(f,P.vals):null,b=r&&r.v!=null?feBandOf(f,r.v):null;return `<div class="fe-score${b?" t-"+b.tone:""}"><div class="v">${FEI.score}<b>${r&&r.v!=null?nf(Math.round(r.v*10)/10):"—"}</b>${r?`<small>${tx(feTx("fe_scoreOf",L,{n:nf(r.n),m:nf(r.total)}))}</small>`:`<small>${tx(feTx("fe_scoreItems",L,{n:nf((f.items||[]).length)}))}</small>`}</div>${b?`<span class="band">${tx(b.label)}</span>`:(f.bands||[]).length?`<span class="bands">${(f.bands||[]).map(x=>`<i class="t-${x.tone}">${tx(x.label)}</i>`).join("")}</span>`:""}</div>`}
    case "privnote":return `<div class="fe-priv"><div class="hd">${FEI.lock}${tx(feTx("fe_privOnly",L))}</div>${live?`<textarea class="fe-in ta" id="${id}" ${k} rows="3"${dis} dir="auto">${FEE(v??"")}</textarea>`:`<div class="fe-in ta"></div>`}</div>`;
    case "vitals":{const set=f.vset||["bp","hr","w","h"],o2=o;const D: Record<string, string[]>={bp:["fe_vBp","mmHg","120/80"],hr:["fe_vHr","bpm","72"],rr:["fe_vRr","/min","16"],t:["fe_vT","°C","37,0"],spo2:["fe_vSp","%","98"],w:["fe_vW","kg","70"],h:["fe_vH","cm","170"]};
      const bmi=live&&o2.w&&o2.h?(()=>{const w=parseFloat(String(o2.w).replace(",",".")),h=parseFloat(String(o2.h).replace(",","."))/100;return w>0&&h>0?nf(Math.round(w/(h*h)*10)/10):null})():null;
      return `<div class="fe-sub4">${set.map(sk=>{const [lk,u,p]=D[sk]||[sk,"",""];return `<label><span>${tx(feTx(lk,L))}</span><div class="fe-unit">${live?`<input class="fe-in" type="text" inputmode="decimal" ${k} data-sk="${sk}" value="${FEE(o2[sk]??"")}" placeholder="${p}"${dis}>`:`<div class="fe-in"><span class="ph">${p}</span></div>`}<em>${u}</em></div></label>`}).join("")}</div>${set.includes("w")&&set.includes("h")?`<div class="fe-bmi">${FEI.formula}${tx(feTx("fe_bmi",L))} : <b>${bmi??"—"}</b> kg/m²</div>`:""}`}
  }
  return _ctl0(f,L,P);
}}
function feAgeOf(f: FeField,vals: Bag,L: string){let src=f.dob?feFind(f.dob)?.f:null;if(!src)feEach(x=>{if(!src&&x.type==="date"&&/naiss|birth|geburt/i.test(x.key+fv(x.label,"fr")))src=x});if(!src)return null;const d=vals[src.id];if(!d)return null;const b=new Date(d+"T12:00"),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return isFinite(a)&&a>=0&&a<130?feTx("fe_ageYears",L,{n:nf(a)}):null}
/* values as text */
{const _vs0=feValStr;feValStr=function(f,v,L){
  if(FE_CALC.has(f.type)){const vals=FE.pv.vals;if(f.type==="age")return feAgeOf(f,vals,L);if(f.type==="formula"){const r=feFormulaEval(f.expr,vals);return r.ok&&r.v!=null?nf(+r.v.toFixed(f.dec??1))+(f.unit?" "+f.unit:""):null}if(f.type==="score"){const r=feScoreOf(f,vals);if(!r||r.v==null)return null;const b=feBandOf(f,r.v);return nf(Math.round(r.v*10)/10)+(b?" · "+b.label:"")}}
  if(v==null||v===""||(Array.isArray(v)&&!v.length))return null;
  const O=()=>feOpts(f,L);
  switch(f.type){
    case "likert":case "mood":return O()[+v]??null;
    case "semantic":return `${v}/${f.pts||7}`;
    case "chips":return v.map(i=>O()[+i]).join(", ");
    case "bodymap":return (v as unknown as string[]).map(s=>feBmLabel(s,L)).join(", ");
    case "currency":return `${nf(+v)} ${f.cur||"€"}`;case "percent":return `${nf(+v)} %`;
    case "datetime":try{return new Date(v).toLocaleString(L==="ar"?"ar":L,{dateStyle:"medium",timeStyle:"short"})}catch(e){return v}
    case "daterange":return v.a||v.b?`${v.a||"…"} → ${v.b||"…"}`:null;
    case "duration":return v.h||v.m?`${v.h||0} h ${v.m||0} min`:null;
    case "address":{const s=[v.rue,v.cpl,[v.cp,v.ville].filter(Boolean).join(" "),v.pays].filter(Boolean).join(", ");return s||null}
    case "rom":return v.l||v.r?`${feTx("fe_bmL",L)} ${v.l??"—"}° · ${feTx("fe_bmR",L)} ${v.r??"—"}°`:null;
    case "strength":return v.l!=null||v.r!=null?`${feTx("fe_bmL",L)} ${v.l??"—"}/5 · ${feTx("fe_bmR",L)} ${v.r??"—"}/5`:null;
    case "measure":{const n=v.filter(r=>r&&r.v!==""&&r.v!=null);return n.length?n.map(r=>`${r.v}${f.unit?" "+f.unit:""}${r.d?" ("+r.d+")":""}`).join(" · "):null}
    case "vitals":{const s=Object.entries(v).filter(([,x])=>x).map(([kk,x])=>`${feTx({bp:"fe_vBp",hr:"fe_vHr",rr:"fe_vRr",t:"fe_vT",spo2:"fe_vSp",w:"fe_vW",h:"fe_vH"}[kk]||kk,L)} ${x}`).join(" · ");return s||null}
  }
  return _vs0(f,v,L);
}}
/* logic sources include the new choice types */
{const _sc0=feSrcCands;feSrcCands=function(f){const r=_sc0(f);feEach(x=>{if(x!==f&&!r.includes(x)&&["likert","mood","chips","semantic","currency","percent","bodymap","selector","url","datetime","formula","score","age"].includes(x.type))r.push(x)});return r}}

/* ---------- formula engine (typed, no eval) ---------- */
function feTok(src: unknown){const out=[];let i=0;const s=String(src||"");while(i<s.length){const c=s[i];if(/\s/.test(c)){i++;continue}
  if(/[0-9.]/.test(c)){let j=i;while(j<s.length&&/[0-9.]/.test(s[j]))j++;out.push({t:"n",v:parseFloat(s.slice(i,j))});i=j;continue}
  if(c==="{"){const j=s.indexOf("}",i);if(j<0)throw new Error("brace");out.push({t:"ref",v:s.slice(i+1,j).trim()});i=j+1;continue}
  if(/[A-Za-z_À-ÿ]/.test(c)){let j=i;while(j<s.length&&/[A-Za-z0-9_.À-ÿ]/.test(s[j]))j++;out.push({t:"id",v:s.slice(i,j)});i=j;continue}
  if(c==='"'||c==="'"){const j=s.indexOf(c,i+1);if(j<0)throw new Error("quote");out.push({t:"s",v:s.slice(i+1,j)});i=j+1;continue}
  const two=s.slice(i,i+2);if(["<=",">=","==","!=","&&","||"].includes(two)){out.push({t:"op",v:two});i+=2;continue}
  if("+-*/^%(),<>!".includes(c)){out.push({t:"op",v:c});i++;continue}
  throw new Error("char "+c)}return out}
function feParse(src: unknown){const tk=feTok(src);let p=0;const pk=()=>tk[p],nx=()=>tk[p++],is=(v: string)=>pk()&&pk().t==="op"&&pk().v===v,need=(v: string)=>{if(!is(v))throw new Error("expected "+v);p++};
  const prim=(): FeAst=>{const x=nx();if(!x)throw new Error("end");if(x.t==="n"||x.t==="s")return {k:"lit",v:x.v};if(x.t==="ref")return {k:"ref",v:x.v};
    if(x.t==="id"){if(is("(")){p++;const args=[];if(!is(")")){args.push(or());while(is(",")){p++;args.push(or())}}need(")");return {k:"fn",n:(x.v as string).toLowerCase(),a:args}}return {k:"ref",v:x.v}}
    if(x.t==="op"&&x.v==="("){const e=or();need(")");return e}if(x.t==="op"&&(x.v==="-"||x.v==="!"))return {k:"un",o:x.v,a:pow()};throw new Error("unexpected "+x.v)};
  const pow=(): FeAst=>{const a=prim();if(is("^")){p++;return {k:"bin",o:"^",a,b:un()}}return a};const un=(): FeAst=>{if(is("-")||is("!")){const o=nx().v as string;return {k:"un",o,a:un()}}return pow()};
  const mul=(): FeAst=>{let a=un();while(is("*")||is("/")||is("%")){const o=nx().v as string;a={k:"bin",o,a,b:un()}}return a};
  const add=(): FeAst=>{let a=mul();while(is("+")||is("-")){const o=nx().v as string;a={k:"bin",o,a,b:mul()}}return a};
  const cmp=(): FeAst=>{let a=add();while(pk()&&pk().t==="op"&&["<",">","<=",">=","==","!="].includes(pk().v as string)){const o=nx().v as string;a={k:"bin",o,a,b:add()}}return a};
  const and=(): FeAst=>{let a=cmp();while(is("&&")){p++;a={k:"bin",o:"&&",a,b:cmp()}}return a};const or=(): FeAst=>{let a=and();while(is("||")){p++;a={k:"bin",o:"||",a,b:and()}}return a};
  const e=or();if(p<tk.length)throw new Error("trailing");return e}
function feRefs(ast: FeAst | undefined | null,out=new Set<string>()): Set<string>{if(!ast)return out;if(ast.k==="ref")out.add((ast.v as string).split(".")[0]);(ast.a&&!Array.isArray(ast.a)?[ast.a]:ast.a||[]).forEach(x=>feRefs(x,out));if(ast.b)feRefs(ast.b,out);return out}
function feNumOf(f: FeField,v: unknown,sub?: string){
  if(f.type==="formula"){const r=feFormulaEval(f.expr,FE.pv.vals,new Set([f.id]));return r.ok?r.v:null}
  if(f.type==="score"){const r=feScoreOf(f,FE.pv.vals);return r?.v??null}
  if(v==null||v==="")return null;
  if(sub&&typeof v==="object"){const x=parseFloat(String((v as Bag)[sub]??"").replace(",","."));return isFinite(x)?x:null}
  if(Array.isArray(v))return v.length;
  if(f.type==="yesno")return +v===0?1:+v===1?0:.5;
  if(f.type==="sat")return +v+1;
  if(typeof v==="object")return null;
  const x=parseFloat(String(v).replace(",","."));return isFinite(x)?x:null;
}
function feFormulaEval(expr: string | undefined,vals: Bag,stack=new Set<string>()): { ok: boolean; v?: number | null; err?: string; missing?: boolean }{
  if(!String(expr||"").trim())return {ok:true,v:null};
  let ast;try{ast=feParse(expr)}catch(e){return {ok:false,err:(e as Error).message}}
  const byKey: Record<string, FeField>={};feEach(x=>{if(x.key)byKey[x.key]=x});
  let missing=false;
  const ev: (n: FeAst)=>number=((n: FeAst)=>{switch(n.k){case "lit":return n.v as number;
    case "ref":{const [key,sub]=(n.v as string).split(".");const f=byKey[key];if(!f)throw new Error("ref "+key);if(stack.has(f.id))throw new Error("cycle");const v=feNumOf(f,vals?.[f.id],sub);if(v==null)missing=true;return v??0}
    case "un":{const a=ev(n.a as FeAst);return n.o==="-"?-a:(a?0:1)}
    case "bin":{const a=ev(n.a as FeAst),b=ev(n.b as FeAst);switch(n.o){case "+":return a+b;case "-":return a-b;case "*":return a*b;case "/":return b===0?NaN:a/b;case "%":return a%b;case "^":return Math.pow(a,b);case "<":return +(a<b);case ">":return +(a>b);case "<=":return +(a<=b);case ">=":return +(a>=b);case "==":return +(a==b);case "!=":return +(a!=b);case "&&":return +(a&&b);case "||":return +(a||b)}}
    case "fn":{const A=(n.a as FeAst[]).map(ev);switch(n.n){case "sum":return A.reduce((x,y)=>x+y,0);case "avg":case "moy":return A.length?A.reduce((x,y)=>x+y,0)/A.length:0;case "min":return Math.min(...A);case "max":return Math.max(...A);case "round":case "arrondi":{const d=Math.pow(10,A[1]||0);return Math.round(A[0]*d)/d}case "abs":return Math.abs(A[0]);case "sqrt":return Math.sqrt(A[0]);case "if":case "si":return A[0]?A[1]:A[2];default:throw new Error("fn "+n.n)}}}}) as (n: FeAst)=>number;
  try{const v=ev(ast);return {ok:true,v:missing||!isFinite(v)?null:v}}catch(e){return {ok:false,err:(e as Error).message}}
}
function feScoreOf(f: FeField,vals: Bag | null | undefined){const it=(f.items||[]).map(x=>({x,f:feFind(x.ref)?.f})).filter(o=>o.f);if(!it.length)return null;let s=0,n=0;it.forEach(({x,f:g})=>{const v=feNumOf(g!,vals?.[g!.id]);if(v!=null){s+=v*(+x.w!||1);n++}});return {v:n?(f.meth==="avg"?s/n:s):null,n,total:it.length}}
function feBandOf(f: FeField,v: number){return (f.bands||[]).slice().sort((a,b)=>a.max-b.max).find(b=>v<=+b.max)||null}

/* ---------- logic v2: AND/OR groups, more operators, pages ---------- */
const FE_OPS=[["eq","fe_opEq"],["neq","fe_opNeq"],["filled","fe_opFilled"],["empty","fe_opEmpty"],["gt","fe_opGt"],["gte","fe_opGte"],["lt","fe_opLt"],["lte","fe_opLte"],["has","fe_opHas"]];
function feLogicNorm(g: FeLogic | null | undefined){if(!g)return null;if(!g.conds)return {act:g.act||"show",mode:"all",conds:[{src:g.src,op:g.op||"eq",val:g.val}]};return g}
function feCondOne(c: FeCond,vals: Bag){const f=feFind(c.src)?.f;if(!f)return true;const v=vals[c.src!];
  const filled=FE_CALC.has(f.type)?feNumOf(f,v)!=null:Array.isArray(v)?v.length>0:v!=null&&v!==""&&!(typeof v==="object"&&!Object.values(v).some(Boolean));
  if(c.op==="filled")return filled;if(c.op==="empty")return !filled;
  if(["gt","gte","lt","lte"].includes(c.op!)){const a=feNumOf(f,v),b=parseFloat(String(c.val).replace(",","."));if(a==null||!isFinite(b))return false;return c.op==="gt"?a>b:c.op==="gte"?a>=b:c.op==="lt"?a<b:a<=b}
  const eq=Array.isArray(v)?v.includes(String(c.val)):String(v??"")===String(c.val??"");
  if(c.op==="has")return Array.isArray(v)?v.includes(String(c.val)):String(v??"").toLowerCase().includes(String(c.val??"").toLowerCase());
  return c.op==="neq"?!eq:eq}
feCond=function(f,vals){const g=feLogicNorm(f.logic||f);if(!g||!g.conds?.length)return true;const r=g.conds.map(c=>feCondOne(c,vals));return g.mode==="any"?r.some(Boolean):r.every(Boolean)};
function fePageOn(p: FePage,vals: Bag){return !p.skip||!p.skip.conds?.length||feCond({logic:{...p.skip,act:"show"}},vals)}

/* ---------- component library panel: tabs, favourites, recents, blocks, outline ---------- */
function feChipsHTML(){return FE_CHIPS.map(([k,l])=>`<button type="button" role="tab" aria-selected="${FE.comp===k}" data-cf="${k}">${t(l)}${k==="fav"&&(feS!.favs||[]).length?`<span class="ct">${nf(feS!.favs!.length)}</span>`:""}</button>`).join("")}
function feCompRow(ty: string){const fav=(feS!.favs||[]).includes(ty),blk=ty.startsWith("blk:"),b=blk?(feS!.blocks||[]).find(x=>x.id===ty.slice(4)):null;const lab=blk?b?.name:t(FE_T[ty]?.[1]),dt=blk?b?.desc||"":t("fe_dt_"+(FE_PRE[ty]?ty:ty));
  return `<div class="fe-comp${blk?" blk":""}" data-ct="${ty}" tabindex="0" role="button" aria-label="${t("fe_add")} · ${FEE(lab)}" title="${FEE(dt)}"><span class="ic">${blk?FEI.compose:FEI[FE_T[ty]?.[0]]||FEI.text}</span><span class="lb">${FEE(lab)}${blk?`<small>v${b?.ver||1} · ${t(b?.scope==="org"?"fe_scopeOrg":"fe_scopePriv")}</small>`:""}</span><button type="button" class="fav${fav?" on":""}" data-cfav="${ty}" aria-pressed="${fav}" title="${t(fav?"fe_favRm":"fe_favAdd")}" aria-label="${t(fav?"fe_favRm":"fe_favAdd")}">${fav?FEI.starF:FEI.star}</button><span class="add" aria-hidden="true">${FEI.plus}</span></div>`}
feCompList=function(){
  const q=FE.q.trim().toLowerCase(),match=(ty: string)=>{if(!q)return true;const b=ty.startsWith("blk:")?(feS!.blocks||[]).find(x=>x.id===ty.slice(4)):null;const s=b?(b.name+" "+(b.desc||"")):t(FE_T[ty]?.[1])+" "+t("fe_dt_"+ty);return s.toLowerCase().includes(q)};
  let h="";const ch=FE_CHIPS.find(c=>c[0]===FE.comp)||FE_CHIPS[0];
  if(FE.comp==="blocks"){const L=(feS!.blocks||[]).map(b=>"blk:"+b.id).filter(match);h=`<div class="fe-cg"><h5>${t("fe_cfBlocks")}</h5>${L.map(feCompRow).join("")||`<p class="fe-none">${t("fe_noBlocks")}</p>`}<button type="button" class="fe-lnk" data-go="library">${FEI.compose}${t("fe_manageBlocks")}</button></div>`}
  else if(FE.comp==="fav"||FE.comp==="recent"){const L=(FE.comp==="fav"?feS!.favs:feS!.recent||[])!.filter(x=>FE_T[x]||(x.startsWith("blk:")&&(feS!.blocks||[]).some(b=>"blk:"+b.id===x))).filter(match);h=`<div class="fe-cg"><h5>${t(ch[1])}</h5>${L.map(feCompRow).join("")||`<p class="fe-none">${t(FE.comp==="fav"?"fe_noFav":"fe_noRecent")}</p>`}</div>`}
  else{const seen=new Set();for(const [g,l,types] of FE_G){if(ch[2]&&!ch[2].includes(g))continue;const items=types.filter(ty=>FE_T[ty]&&match(ty)&&(ch[2]||!seen.has(ty)));items.forEach(x=>seen.add(x));if(!items.length)continue;h+=`<div class="fe-cg"><h5>${t(l)}</h5>${items.map(feCompRow).join("")}</div>`}
    if(!ch[2]&&(feS!.blocks||[]).length){const L=feS!.blocks!.map(b=>"blk:"+b.id).filter(match);if(L.length)h+=`<div class="fe-cg"><h5>${t("fe_cfBlocks")}</h5>${L.map(feCompRow).join("")}</div>`}}
  return (h||`<p class="fe-none">${t("fe_noComp")}</p>`)+`<div class="fe-gen"><div class="hd"><span class="sp">${FEI.spark}</span><b>${t("fe_genTitle")}</b></div><p>${t("fe_genTxt")}</p><textarea rows="2" data-gen placeholder="${t("fe_genPh")}" dir="auto"></textarea><button type="button" class="fe-btn pri sm wide" data-genbtn>${FEI.spark}${t("fe_genBtn")}</button></div>`;
};
function feOutlineHTML(){const d=feDoc(),L=feCL();const node=(f: FeField,dep: number): string=>`<button type="button" class="fe-oln${FE.sel===f.id?" on":""}" data-ol="${f.id}" style="--dep:${dep}"><span class="ic">${FEI[FE_T[f.pre||f.type]?.[0]]||FEI.text}</span><span class="lb" dir="auto">${FEE(fv(f.label,L)||t(FE_T[f.type]?.[1]))}</span>${f.req?'<i class="rq">*</i>':""}${f.logic?`<em>${FEI.branch}</em>`:""}${f.hid?`<em>${FEI.hidden}</em>`:""}</button>${f.type==="group"?(f.fields||[]).map(x=>node(x,dep+1)).join(""):""}`;
  return `<div class="fe-ol">${d!.pages.map((p,pi)=>`<div class="fe-olp"><button type="button" class="fe-olph${pi===FE.page?" on":""}" data-olp="${pi}"><span class="n">${nf(pi+1)}</span><b dir="auto">${FEE(fv(p.title,L))}</b>${p.skip?.conds?.length?`<em title="${t("fe_pageCond")}">${FEI.branch}</em>`:""}</button>${p.sections.map(s=>`<button type="button" class="fe-ols" data-ols="${s.id}" data-olpi="${pi}">${FEI.layers}<span dir="auto">${FEE(fv(s.title,L))}</span><small>${nf(s.fields.length)}</small></button>${s.fields.map(f=>node(f,1)).join("")}`).join("")}</div>`).join("")}</div>`}
feCompsHTML=function(){const lp=FE.lp||"comps";return `<div class="fe-ph"><div class="fe-seg sm fe-lpt" role="tablist"><button type="button" role="tab" aria-selected="${lp==="comps"}" data-lp="comps">${t("fe_comps")}</button><button type="button" role="tab" aria-selected="${lp==="outline"}" data-lp="outline">${t("fe_outline")}</button></div><button type="button" class="fe-ib sm fe-pclose" data-fe-close="comps" aria-label="${t("fmClose")}">${FEI.x}</button></div>${lp==="outline"?feOutlineHTML():`<label class="fe-srch">${FEI.search}<input type="search" placeholder="${t("fe_compSearch")}" value="${FEE(FE.q)}" data-fe-q aria-label="${t("fe_compSearch")}"></label><div class="fe-chips scroll" role="tablist">${feChipsHTML()}</div><div class="fe-clist">${feCompList()}</div>`}`};
function feTouchRecent(ty: string){feS!.recent=[ty,...(feS!.recent||[]).filter(x=>x!==ty)].slice(0,10)}
{const _af0=feAddField;feAddField=function(type,o={}){feTouchRecent(type);return _af0(type,o)}}

/* ---------- copy / cut / paste fields ---------- */
function feCopyField(cut?: boolean){const r=FE.sel&&feFind(FE.sel);if(!r)return;FE.clip=JSON.stringify(r.f);try{navigator.clipboard?.writeText(JSON.stringify({remotionField:r.f}))?.catch(()=>{})}catch(e){}if(cut){feDelField(r.f.id);feToast(t("fe_cutDone",{x:fv(r.f.label,feCL())}))}else feToast(t("fe_copyDone",{x:fv(r.f.label,feCL())}))}
function fePasteField(){if(!FE.clip){feToast(t("fe_clipEmpty"));return}const n=JSON.parse(FE.clip);feReId(n);let ins!: FeField | undefined;feFlip(()=>feMut(d=>{const r=FE.sel&&feFind(FE.sel);let box,idx;if(r){if(r.f.type==="group"&&!r.f.col){box=r.f;idx=r.f.fields!.length}else{box=r.s;idx=r.i+1}}else{const p=d.pages[FE.page];box=p.sections[p.sections.length-1];idx=box?.fields.length||0}if(!box)return;box.fields!.splice(idx,0,n);ins=n;FE.sel=n.id},"canvas"));if(ins){feSelect(ins.id,{pulse:true,scroll:true});feToast(t("fe_pasteDone"))}}

/* ---------- reusable blocks ---------- */
function feBlocksSeed(){const F=feField;return [
  {id:"b1",name:t("fe_blk1"),desc:t("fe_blk1d"),scope:"org",ver:1,upd:Date.now()-5*864e5,fields:[F("text","fe_fNom",{key:"nom",req:true}),F("text","fe_fPrenom",{key:"prenom",req:true}),F("phone","fe_fTel",{key:"telephone",ph:"fe_phTel"}),F("email","fe_fMail",{key:"email",ph:"fe_phMail"})],cols:2},
  {id:"b2",name:t("fe_blk2"),desc:t("fe_blk2d"),scope:"org",ver:2,upd:Date.now()-2*864e5,fields:[F("text","fe_fNom",{key:"contact_nom"}),F("select","fe_fRel",{key:"contact_lien",disp:"list",opts:["fe_oRel1","fe_oRel2","fe_oRel3","fe_oRel4"]}),F("phone","fe_fTel",{key:"contact_telephone",ph:"fe_phTel"})],cols:2},
  {id:"b3",name:t("fe_blk3"),desc:t("fe_blk3d"),scope:"org",ver:1,upd:Date.now()-9*864e5,fields:[F("multi","fe_fConsent",{key:"consentements",opts:["fe_oC1","fe_oC2"],req:true}),F("sign","fe_fSign",{key:"signature",req:true})],cols:1},
  {id:"b4",name:t("fe_blk4"),desc:t("fe_blk4d"),scope:"priv",ver:1,upd:Date.now()-864e5,fields:[F("sat","fe_fSat",{key:"satisfaction"}),F("nps","fe_fNps",{key:"nps"}),F("textarea","fe_fComments",{key:"commentaires"})],cols:1}]}
function feBlocksEnsure(){if(!Array.isArray(feS!.blocks)){feS!.blocks=feBlocksSeed();feSave()}if(!Array.isArray(feS!.favs))feS!.favs=[];if(!Array.isArray(feS!.recent))feS!.recent=[]}
function feBlockInstance(bid: string){const b=(feS!.blocks||[]).find(x=>x.id===bid);if(!b)return feField("info","fe_blkMissing");const g=feField("group",b.name,{cols:b.cols||2,fields:JSON.parse(JSON.stringify(b.fields)),blk:{id:b.id,ver:b.ver}});g.fields!.forEach(feReId);g.key=feUniqKey(feSlug(b.name),g);return g}
function feSaveBlock(f: FeField,secTitle?: unknown){const L=feCL();const name=fv(f.label||secTitle,L)||t("fe_blkNew");
  const ex=f.blk&&(feS!.blocks||[]).find(x=>x.id===f.blk!.id);
  if(ex){ex.fields=JSON.parse(JSON.stringify(f.fields));ex.ver=(ex.ver||1)+1;ex.upd=Date.now();ex.cols=f.cols;feMut(()=>{f.blk!.ver=ex.ver},"canvas");feSave();feToast(t("fe_blkUpdated",{x:ex.name,n:nf(ex.ver)}));return}
  const b={id:"b"+Date.now().toString(36),name,desc:"",scope:"priv",ver:1,upd:Date.now(),cols:f.cols||2,fields:JSON.parse(JSON.stringify(f.fields||[f]))};feS!.blocks!.push(b);
  if(f.type==="group")feMut(()=>{f.blk={id:b.id,ver:1}},"canvas");feSave();feToast(t("fe_blkSaved",{x:name}));
}
function feBlockUpdate(f: FeField){const b=(feS!.blocks||[]).find(x=>x.id===f.blk?.id);if(!b)return;feFlip(()=>feMut(()=>{f.fields=JSON.parse(JSON.stringify(b.fields));f.fields!.forEach(feReId);f.blk!.ver=b.ver;(f as Bag).cols=b.cols||f.cols},"canvas"));feToast(t("fe_blkApplied",{n:nf(b.ver)}))}
/* ================= Forms: properties for new types, logic v2 UI, preview behaviour ================= */
const feLangs=["fr","en","de","ar"];
/* canvas badges: privacy, block, repeat */
{const _ffh0=feFldHTML;feFldHTML=function(f,L,cols){let h=_ffh0(f,L,cols);
  const b=(f.priv==="health"?`<em class="fe-b pv">${FEI.shield}${t("fe_privHealthS")}</em>`:f.priv==="pers"?`<em class="fe-b pv2">${FEI.shield}${t("fe_privPersS")}</em>`:"")+(f.blk?`<em class="fe-b blk">${FEI.compose}${t("fe_blkB",{n:nf(f.blk.ver)})}${feBlkOutdated(f)?`<i class="dot"></i>`:""}</em>`:"")+(f.repeat?`<em class="fe-b">${FEI.repeat}${t("fe_repB",{n:nf(f.rmax||5)})}</em>`:"")+(f.type==="privnote"?`<em class="fe-b pv">${FEI.lock}${t("fe_pracB")}</em>`:"");
  if(b){const cls=f.type==="group"?'<div class="fe-gh">':'<div class="fe-fl">';const i=h.indexOf(cls);if(i>=0){const j=f.type==="group"?h.indexOf('<span class="sp"></span>',i):h.indexOf("</div>",i);if(j>0)h=h.slice(0,j)+b+h.slice(j)}}
  return h}}
const feBlkOutdated=(f: FeField)=>{const b=f.blk&&(feS!.blocks||[]).find(x=>x.id===f.blk!.id);return !!(b&&b.ver>f.blk!.ver)};

/* type-specific properties */
{const _tp0=feTypeProps;feTypeProps=function(f,L){
  const opt=()=>feRow("fe_opts",feOptEd("opts",f.opts||[],L));
  switch(f.type){
    case "likert":return opt()+feRow("fe_period",`<input class="fe-inp" data-p="period" value="${FEE(fv(f.period,L))}" placeholder="${t("fe_periodPh")}" dir="auto">`);
    case "mood":case "chips":return opt();
    case "semantic":return `<div class="fe-2">${feRow("fe_semLeft",`<input class="fe-inp" data-p="left" value="${FEE(fv(f.left,L))}" dir="auto">`)}${feRow("fe_semRight",`<input class="fe-inp" data-p="right" value="${FEE(fv(f.right,L))}" dir="auto">`)}</div>`+feRow("fe_semPts",`<div class="fe-seg sm">${[5,7,9].map(n=>`<button type="button" aria-pressed="${(f.pts||7)===n}" data-psem="${n}">${nf(n)}</button>`).join("")}</div>`);
    case "currency":return feRow("fe_curSym",`<div class="fe-seg sm">${["€","$","£","CHF"].map(c=>`<button type="button" aria-pressed="${(f.cur||"€")===c}" data-pcur="${c}">${c}</button>`).join("")}</div>`);
    case "rom":return `<div class="fe-2">${feRow("fe_joint",`<div class="fe-selw"><select class="fe-inp" data-p="joint">${Object.keys(FE_ROMJ).map(j=>`<option value="${j}" ${f.joint===j?"selected":""}>${t("fe_j_"+j)}</option>`).join("")}</select>${FEI.chev}</div>`)}${feRow("fe_move",`<div class="fe-selw"><select class="fe-inp" data-p="move">${Object.keys(FE_ROMJ[f.joint!]||{}).map(m=>`<option value="${m}" ${f.move===m?"selected":""}>${t("fe_mv_"+m)}</option>`).join("")}</select>${FEI.chev}</div>`)}</div>`+feRow("fe_romNorm",`<div class="fe-unit"><input class="fe-inp" type="number" min="0" data-p="norm" value="${f.norm??""}"><em>°</em></div>`)+`<p class="fe-mut">${FEI.info}${t("fe_romHint")}</p>`;
    case "measure":return `<div class="fe-2">${feRow("fe_unit",`<input class="fe-inp" data-p="unit" value="${FEE(f.unit||"")}" placeholder="cm, kg, °…">`)}${feRow("fe_measMethod",`<input class="fe-inp" data-p="method" value="${FEE(f.method||"")}" placeholder="${t("fe_measMethodPh")}" dir="auto">`)}</div><p class="fe-mut">${FEI.info}${t("fe_measHint")}</p>`;
    case "selector":return feRow("fe_selKind",`<div class="fe-selw"><select class="fe-inp" data-p="kind">${["pract","org","loc","appt"].map(k=>`<option value="${k}" ${f.kind===k?"selected":""}>${t("fe_selK_"+k)}</option>`).join("")}</select>${FEI.chev}</div>`)+`<p class="fe-mut">${FEI.info}${t("fe_selHint")}</p>`;
    case "age":{const dates: FeField[]=[];feEach(x=>{if(x.type==="date")dates.push(x)});return feRow("fe_ageSrc",`<div class="fe-selw"><select class="fe-inp" data-p="dob"><option value="">${t("fe_ageAutoSrc")}</option>${dates.map(x=>`<option value="${x.id}" ${f.dob===x.id?"selected":""}>${FEE(fv(x.label,L))}</option>`).join("")}</select>${FEI.chev}</div>`)}
    case "formula":{const r=feFormulaEval(f.expr,FE.pv.vals),keys: FeField[]=[];feEach(x=>{if(x!==f&&x.key&&(FE_NUM.has(x.type)||["select","yesno","multi","vitals","measure","chips"].includes(x.type)))keys.push(x)});
      return feRow("fe_fx",`<textarea class="fe-inp fe-mono fe-fxin${r.ok?"":" bad"}" rows="2" data-p="expr" spellcheck="false" dir="ltr" placeholder="ex. round({poids} / ({taille}/100)^2, 1)">${FEE(f.expr||"")}</textarea><small class="fe-fxst ${r.ok?"ok":"err"}" data-fxst>${r.ok?FEI.check+t("fe_fxOk"):FEI.x+t("fe_fxErr",{x:r.err!})}</small>`)
        +feRow("fe_fxRefs",`<div class="fe-fxrefs">${keys.map(x=>`<button type="button" data-fxref="${FEE(x.key)}" title="${FEE(fv(x.label,L))}">{${FEE(x.key)}}</button>`).join("")||`<span class="fe-mut">${t("fe_fxNoRefs")}</span>`}</div>`)
        +`<div class="fe-2">${feRow("fe_fxDec",`<input class="fe-inp" type="number" min="0" max="4" data-p="dec" value="${f.dec??1}">`)}${feRow("fe_unit",`<input class="fe-inp" data-p="unit" value="${FEE(f.unit||"")}">`)}</div><p class="fe-mut">${FEI.info}${t("fe_fxHelp")}</p>`}
    case "score":{const cands: FeField[]=[];feEach(x=>{if(x!==f&&(FE_NUM.has(x.type)||["select","yesno","clinical","nps","sat","rating","slider","likert","mood","semantic"].includes(x.type))&&x.type!=="score")cands.push(x)});const it=f.items||[];
      return feRow("fe_scItems",`<div class="fe-scl">${cands.map(x=>{const cur=it.find(i=>i.ref===x.id);return `<label class="fe-scr"><input type="checkbox" data-scitem="${x.id}" ${cur?"checked":""}><span dir="auto">${FEE(fv(x.label,L))}</span>${cur?`<input class="fe-inp" type="number" step="0.5" data-scw="${x.id}" value="${cur.w??1}" title="${t("fe_scWeight")}" aria-label="${t("fe_scWeight")}">`:""}</label>`}).join("")||`<span class="fe-mut">${t("fe_scNone")}</span>`}</div>`)
        +feRow("fe_scMeth",`<div class="fe-seg sm">${[["sum","fe_tTotSum"],["avg","fe_tTotAvg"]].map(([k,l])=>`<button type="button" aria-pressed="${(f.meth||"sum")===k}" data-scmeth="${k}">${t(l)}</button>`).join("")}</div>`)
        +feRow("fe_scBands",`<div class="fe-bands">${(f.bands||[]).map((b,i)=>`<div class="fe-band"><span>≤</span><input class="fe-inp" type="number" data-bnd="${i}.max" value="${b.max}" aria-label="max"><input class="fe-inp" data-bnd="${i}.label" value="${FEE(b.label)}" dir="auto"><div class="fe-selw"><select class="fe-inp" data-bnd="${i}.tone">${["ok","warn","bad"].map(x=>`<option value="${x}" ${b.tone===x?"selected":""}>${t("fe_tone_"+x)}</option>`).join("")}</select>${FEI.chev}</div><button type="button" class="fe-ib xs" data-bndrm="${i}" aria-label="${t("fe_delField")}">${FEI.x}</button></div>`).join("")}<button type="button" class="fe-lnk" data-bndadd>${FEI.plus}${t("fe_scBandAdd")}</button></div>`)+`<p class="fe-mut">${FEI.info}${t("fe_scHint")}</p>`}
    case "vitals":{const set=f.vset||["bp","hr","w","h"];return feRow("fe_vSet",`<div class="fe-chipsel ed">${["bp","hr","rr","t","spo2","w","h"].map(k=>`<button type="button" class="${set.includes(k)?"on":""}" data-vset="${k}" aria-pressed="${set.includes(k)}">${t({bp:"fe_vBp",hr:"fe_vHr",rr:"fe_vRr",t:"fe_vT",spo2:"fe_vSp",w:"fe_vW",h:"fe_vH"}[k]!)}</button>`).join("")}</div>`)}
    case "privnote":return `<p class="fe-mut">${FEI.lock}${t("fe_privNoteHint")}</p>`;
  }
  return _tp0(f,L);
}}
/* extra sections at the end of every field's properties */
function feXProps(f: FeField){
  const L=feCL(),inputLike=["text","textarea","email","phone","url","number","currency","percent","date","datetime"].includes(f.type);
  let h="";
  if(f.type==="group"){
    const ob=feBlkOutdated(f),b=f.blk&&(feS!.blocks||[]).find(x=>x.id===f.blk!.id);
    h+=`<div class="fe-blkbox">${b?`<div class="hd">${FEI.compose}<b>${FEE(b.name)}</b><span class="fe-tag">v${nf(f.blk!.ver)}</span></div>${ob?`<p class="warn">${FEI.warn}${t("fe_blkOutdated",{n:nf(b.ver)})}</p><div class="fe-pacts"><button type="button" class="fe-btn pri sm" data-blkupd>${t("fe_blkUpdate")}</button><button type="button" class="fe-btn sm" data-blkign>${t("fe_blkIgnore")}</button></div>`:`<p class="fe-mut">${t("fe_blkLinked")}</p>`}<div class="fe-pacts"><button type="button" class="fe-btn sm" data-blksave>${FEI.upload}${t("fe_blkPublish")}</button><button type="button" class="fe-btn sm" data-blkunlink>${t("fe_blkUnlink")}</button></div>`:`<p class="fe-mut">${t("fe_blkHint")}</p><button type="button" class="fe-btn sm" data-blksave>${FEI.compose}${t("fe_blkSaveAs")}</button>`}</div>`;
    h+=`<div class="fe-tgs">${feTg('data-ptg="repeat"',f.repeat,"fe_repeat")}</div>${f.repeat?`<div class="fe-2">${feRow("fe_repMax",`<input class="fe-inp" type="number" min="1" max="20" data-p="rmax" value="${f.rmax??5}">`)}${feRow("fe_repLabel",`<input class="fe-inp" data-p="rlabel" value="${FEE(fv(f.rlabel,L))}" placeholder="${t("fe_repAdd")}" dir="auto">`)}</div>`:""}`;
  }
  if(inputLike)h+=feDt("dv","fe_dv",feRow("fe_dvLabel2",`<input class="fe-inp" data-p="dv" value="${FEE(f.dv??"")}" type="${["number","currency","percent"].includes(f.type)?"number":f.type==="date"?"date":f.type==="datetime"?"datetime-local":"text"}" dir="auto">`)+`<p class="fe-mut">${t("fe_dvHint")}</p>`);
  if(["number","currency","percent","date","datetime"].includes(f.type)){const others: FeField[]=[];feEach(x=>{if(x!==f&&(x.type===f.type||(FE_NUM.has(x.type)&&FE_NUM.has(f.type))))others.push(x)});const xv=f.xv||{};
    h+=feDt("xv","fe_xv",`<div class="fe-rule"><div class="fe-selw"><select class="fe-inp" data-xv="op"><option value="">${t("fe_xvNone")}</option>${[["gte","fe_opGte"],["gt","fe_opGt"],["lte","fe_opLte"],["lt","fe_opLt"],["neq","fe_opNeq"]].map(([o,l])=>`<option value="${o}" ${xv.op===o?"selected":""}>${t(l)}</option>`).join("")}</select>${FEI.chev}</div>${xv.op?`<div class="fe-selw"><select class="fe-inp" data-xv="ref">${others.map(x=>`<option value="${x.id}" ${xv.ref===x.id?"selected":""}>${FEE(fv(x.label,L))}</option>`).join("")}</select>${FEI.chev}</div>`:""}</div><p class="fe-mut">${t("fe_xvHint")}</p>`,xv.op?`<span class="fe-dot"></span>`:"");}
  if(!FE_STATIC.has(f.type)&&f.type!=="group")h+=feDt("priv","fe_priv",`<div class="fe-radioc sm" role="radiogroup">${[["std","fe_privStd","shield"],["pers","fe_privPers","user"],["health","fe_privHealth","heart"]].map(([k,l,ic])=>`<button type="button" role="radio" aria-checked="${(f.priv||"std")===k}" data-ppriv="${k}"><span class="ic">${FEI[ic]}</span><span>${t(l)}</span><i></i></button>`).join("")}</div><p class="fe-mut">${t("fe_privHint")}</p>`,f.priv&&f.priv!=="std"?`<span class="fe-dot"></span>`:"");
  if(f.type!=="divider"){const lab=f.label,done=feLangs.filter(l=>typeof lab==="object"&&lab?.[l]||(typeof lab==="string"&&lab.startsWith("fe_"))).length;
    h+=feDt("tr","fe_trTitle",feLangs.map(l=>feRow("fe_L"+l,`<input class="fe-inp" data-ptr="${l}" value="${FEE(typeof lab==="object"&&lab?lab[l]||"":typeof lab==="string"&&lab.startsWith("fe_")?feTx(lab,l):l===feCL()?lab||"":"")}" dir="${l==="ar"?"rtl":"auto"}" placeholder="${t("fe_trMissing")}">`)).join("")+`<p class="fe-mut">${t("fe_trHint")}</p>`,`<span class="fe-tag${done>=4?" pub":""}">${nf(done)}/4</span>`);}
  return h;
}
{const _pf0=fePField;fePField=function(){const h=_pf0();const r=FE.sel&&feFind(FE.sel);return r?h+feXProps(r.f):h}}
/* logic builder: AND/OR groups */
feLogicHTML=function(f,L){
  const g=feLogicNorm(f.logic);
  if(!g)return `<p class="fe-mut">${t("fe_noRule")}</p><button type="button" class="fe-btn sm" data-lgadd>${FEI.plus}${t("fe_addRule")}</button>`;
  const cands=feSrcCands(f);
  return `<div class="fe-lg2"><div class="fe-2"><div class="fe-selw"><select class="fe-inp" data-lgact><option value="show" ${g.act!=="req"?"selected":""}>${t("fe_ruleShow")}</option><option value="req" ${g.act==="req"?"selected":""}>${t("fe_ruleReq")}</option></select>${FEI.chev}</div><div class="fe-selw"><select class="fe-inp" data-lgmode><option value="all" ${g.mode!=="any"?"selected":""}>${t("fe_lgAll")}</option><option value="any" ${g.mode==="any"?"selected":""}>${t("fe_lgAny")}</option></select>${FEI.chev}</div></div>${g.conds!.map((c,i)=>feCondRow(c,i,cands,L,"lgc")).join(`<div class="fe-lgj">${t(g.mode==="any"?"fe_or":"fe_and")}</div>`)}<div class="fe-pacts"><button type="button" class="fe-lnk" data-lgcadd>${FEI.plus}${t("fe_condAdd")}</button><button type="button" class="fe-lnk danger" data-lgrm>${FEI.del}${t("fe_rmRule")}</button></div></div>`;
};
function feCondRow(c: FeCond,i: number,cands: FeField[],L: string,pre: string){const src=feFind(c.src)?.f,hasO=src&&(src.opts||[]).length&&!["gt","gte","lt","lte","has"].includes(c.op!),noVal=["filled","empty"].includes(c.op!);
  return `<div class="fe-cond" data-ci="${i}"><div class="fe-selw"><select class="fe-inp" data-${pre}="${i}.src">${cands.map(x=>`<option value="${x.id}" ${x.id===c.src?"selected":""}>${FEE(fv(x.label,L))}</option>`).join("")}</select>${FEI.chev}</div><div class="fe-selw"><select class="fe-inp" data-${pre}="${i}.op">${FE_OPS.map(([o,l])=>`<option value="${o}" ${(c.op||"eq")===o?"selected":""}>${t(l)}</option>`).join("")}</select>${FEI.chev}</div>${noVal?"":hasO?`<div class="fe-selw"><select class="fe-inp" data-${pre}="${i}.val">${src.opts!.map((o,j)=>`<option value="${j}" ${String(c.val)===String(j)?"selected":""}>${FEE(fv(o,L))}</option>`).join("")}</select>${FEI.chev}</div>`:`<input class="fe-inp" data-${pre}="${i}.val" value="${FEE(c.val??"")}" placeholder="…" dir="auto">`}<button type="button" class="fe-ib xs" data-${pre}rm="${i}" aria-label="${t("fe_delField")}">${FEI.x}</button></div>`}
feRuleText=function(f,L){const g=feLogicNorm(f.logic);const part=(c: FeCond)=>{const src=feFind(c.src)?.f;const val=["filled","empty"].includes(c.op!)?"":src&&(src.opts||[]).length&&!["gt","gte","lt","lte","has"].includes(c.op!)?fv(src.opts![+(c.val as number)],L):c.val||"…";return `<b>${FEE(src?fv(src.label,L):"?")}</b> <span>${t((FE_OPS.find(o=>o[0]===c.op)||FE_OPS[0])[1])}</span>${val!==""?` <b>« ${FEE(val)} »</b>`:""}`};
  return `<span class="k">${t("fe_ruleWhen")}</span> ${g!.conds!.map(part).join(` <span class="k">${t(g!.mode==="any"?"fe_or":"fe_and")}</span> `)} <span class="k">${t("fe_ruleThen")}</span> <span>${t(g!.act==="req"?"fe_actReq":"fe_actShow")}</span> <b>${FEE(fv(f.label,L))}</b>`};
/* rules tab: + page rules + dependency analysis */
function feDeps(){
  const d=feDoc(),L=feCL(),issues: { lv: string; f?: FeField; page?: number; msg: string }[]=[],edges=new Map<string, Set<string>>(),byKey: Record<string, FeField>={},pageOf: Record<string, number>={};
  d!.pages.forEach((p,pi)=>p.sections.forEach(s=>feWalk(s.fields,x=>{pageOf[x.id]=pi;if(x.key)byKey[x.key]=x},s,s)));
  const add=(a: string,b: string)=>{if(!edges.has(a))edges.set(a,new Set());edges.get(a)!.add(b)};
  feEach(f=>{const g=feLogicNorm(f.logic);if(g)g.conds!.forEach(c=>{if(!feFind(c.src))issues.push({lv:"err",f,msg:t("fe_depMissingSrc")});else{add(c.src!,f.id);if(pageOf[c.src!]>pageOf[f.id])issues.push({lv:"warn",f,msg:t("fe_depForward",{x:fv(feFind(c.src)!.f.label,L)})})}});
    if(f.type==="formula"&&f.expr){let ast=null;try{ast=feParse(f.expr)}catch(e){issues.push({lv:"err",f,msg:t("fe_fxErr",{x:(e as Error).message})})}if(ast)feRefs(ast).forEach(k=>{const x=byKey[k];if(!x)issues.push({lv:"err",f,msg:t("fe_depMissingRef",{x:k})});else add(x.id,f.id)})}
    if(f.type==="score")(f.items||[]).forEach(i=>{if(!feFind(i.ref))issues.push({lv:"err",f,msg:t("fe_depMissingSrc")});else add(i.ref,f.id)});
    if(f.type==="score"&&!(f.items||[]).length)issues.push({lv:"warn",f,msg:t("fe_depNoItems")});
    if(f.xv?.op&&!feFind(f.xv.ref))issues.push({lv:"err",f,msg:t("fe_depMissingSrc")});
  });
  d!.pages.forEach((p,pi)=>(p.skip?.conds||[]).forEach(c=>{if(!feFind(c.src))issues.push({lv:"err",page:pi,msg:t("fe_depMissingSrc")});else if(pageOf[c.src!]>=pi)issues.push({lv:"err",page:pi,msg:t("fe_depPageSelf",{x:fv(feFind(c.src)!.f.label,L)})})}));
  /* cycles */
  const st: Record<string, number>={},cyc: string[][]=[];const dfs=(n: string,path: string[])=>{st[n]=1;path.push(n);for(const m of edges.get(n)||[]){if(st[m]===1){cyc.push(path.slice(path.indexOf(m)));}else if(!st[m])dfs(m,path)}path.pop();st[n]=2};[...edges.keys()].forEach(n=>{if(!st[n])dfs(n,[])});
  cyc.forEach(c=>issues.unshift({lv:"err",f:feFind(c[0])?.f,msg:t("fe_depCycle",{x:c.map(id=>fv(feFind(id)?.f.label,L)).join(" → ")})}));
  let nEdges=0;edges.forEach(s=>{nEdges+=s.size});return {issues,nEdges};
}
{const _rh0=feRulesHTML;feRulesHTML=function(){
  const d=feDoc(),L=feCL(),dep=feDeps(),cands=feSrcCands(null);
  const pages=`<section class="fe-card"><h5>${FEI.layers}${t("fe_pageRules")}</h5><p class="fe-mut">${t("fe_pageRulesSub")}</p>${d!.pages.map((p,pi)=>{const g=p.skip;return `<div class="fe-pgr"><div class="hd"><span class="fe-sn">${nf(pi+1)}</span><b dir="auto">${FEE(fv(p.title,L))}</b><span class="sp"></span>${pi===0?`<span class="fe-tag">${t("fe_pageFirst")}</span>`:g?.conds?.length?`<button type="button" class="fe-lnk danger" data-pgrm="${pi}">${FEI.del}${t("fe_rmRule")}</button>`:`<button type="button" class="fe-lnk" data-pgadd2="${pi}">${FEI.plus}${t("fe_pageCondAdd")}</button>`}</div>${pi>0&&g?.conds?.length?`<div class="fe-lg2"><div class="fe-selw"><select class="fe-inp" data-pgmode="${pi}"><option value="all" ${g.mode!=="any"?"selected":""}>${t("fe_pgShowAll")}</option><option value="any" ${g.mode==="any"?"selected":""}>${t("fe_pgShowAny")}</option></select>${FEI.chev}</div>${g.conds.map((c,i)=>feCondRow(c,i,cands.filter(x=>{let pi2=-1;d!.pages.forEach((pp,k)=>pp.sections.forEach(s=>feWalk(s.fields,y=>{if(y.id===x.id)pi2=k},s,s)));return pi2<pi}),L,"pgc"+pi)).join(`<div class="fe-lgj">${t(g.mode==="any"?"fe_or":"fe_and")}</div>`)}<button type="button" class="fe-lnk" data-pgcadd="${pi}">${FEI.plus}${t("fe_condAdd")}</button></div>`:""}</div>`}).join("")}</section>`;
  const deps=`<section class="fe-card"><h5>${FEI.branch}${t("fe_depTitle")}</h5><p class="fe-mut">${t("fe_depSub",{n:nf(dep.nEdges)})}</p>${dep.issues.length?dep.issues.map(i=>`<div class="fe-dep ${i.lv}">${i.lv==="err"?FEI.x:FEI.warn}<div><b dir="auto">${FEE(i.f?fv(i.f.label,L):t("fe_page",{n:nf(i.page!+1)}))}</b><span>${FEE(i.msg)}</span></div>${i.f?`<button type="button" class="fe-btn sm" data-redit="${i.f.id}">${t("fe_edit")}</button>`:""}</div>`).join(""):`<div class="fe-dep ok">${FEI.check}<div><b>${t("fe_depOk")}</b><span>${t("fe_depOkSub")}</span></div></div>`}</section>`;
  return _rh0().replace('<div class="fe-rules">',`<div class="fe-cards2 two fe-rtop">${deps}${pages}</div><h4 class="fe-gh">${t("fe_fieldRules")}</h4><div class="fe-rules">`);
}}
/* form-level settings: domain, survey mode, retention, AI policy, hidden values */
{const _pfm0=fePForm;fePForm=function(){const d=feDoc(),s=d!.set,sel=(attr: string,opts: [unknown, string][],cur: unknown)=>`<div class="fe-selw"><select class="fe-inp" ${attr}>${opts.map(([v,l])=>`<option value="${v}" ${String(cur)===String(v)?"selected":""}>${t(l)}</option>`).join("")}</select>${FEI.chev}</div>`;
  return _pfm0()+feDt("fdom","fe_fDomain",feRow("fe_domain",sel('data-pfs="dom"',[["general","fe_dm_general"],["health","fe_dm_health"],["psy","fe_dm_psy"],["physio","fe_dm_physio"],["rehab","fe_dm_rehab"],["survey","fe_dm_survey"],["business","fe_dm_business"],["research","fe_dm_research"],["checklist","fe_dm_checklist"]],s.dom||(d!.cat==="surveys"?"survey":"health"))))
   +feDt("fsurv","fe_fRespDist",feRow("fe_anon",sel('data-pfs="anon"',[["ident","fe_anonId"],["pseudo","fe_anonPseudo"],["anon","fe_anonAnon"]],s.anon||"ident"))+`<div class="fe-tgs">${feTg('data-pfg="rand"',s.rand,"fe_rand")}</div><div class="fe-2">${feRow("fe_limit",`<input class="fe-inp" type="number" min="0" data-pfs="limit" value="${s.limit??""}" placeholder="∞">`)}<span></span></div><div class="fe-2">${feRow("fe_start",`<input class="fe-inp" type="date" data-pfs="start" value="${s.start||""}">`)}${feRow("fe_end",`<input class="fe-inp" type="date" data-pfs="end" value="${s.end||""}">`)}</div>`)
   +feDt("fdata","fe_fData",feRow("fe_hidePol",sel('data-pfs="hidePol"',[["clear","fe_hideClear"],["keep","fe_hideKeep"]],s.hidePol||"clear"))+feRow("fe_ret",sel('data-pfs="ret"',[["12","fe_ret12"],["60","fe_ret60"],["120","fe_ret120"],["240","fe_ret240"]],s.ret||"120"))+feRow("fe_aiPol",sel('data-pfs="aiPol"',[["on","fe_aiOn"],["suggest","fe_aiSuggest"],["off","fe_aiOff"]],s.aiPol||"suggest"))+`<p class="fe-mut">${FEI.info}${t("fe_retHint")}</p>`);
}}
/* preview: page rules, repeatable groups, practitioner-only notes, defaults, randomisation, provenance */
function feNextStep(st: number,dir: number){const d=feDoc();let i=st+dir;while(i>=0&&i<d!.pages.length&&!fePageOn(d!.pages[i],FE.pv.vals))i+=dir;return Math.max(0,Math.min(i,d!.pages.length))}
function feCloneInst(f: FeField,i: number){const c=JSON.parse(JSON.stringify(f));const re=(x: FeField)=>{x.id=x.id+"#"+i;(x.fields||[]).forEach(re)};(c.fields||[]).forEach(re);return c}
feVisLeaves=function(list,vals){const r=[];for(const f of list){if(f.type==="group"){if(!feVis(f,vals))continue;if(f.repeat){const n=FE.pv.rep?.[f.id]||1;for(let i=0;i<n;i++)r.push(...feVisLeaves(feCloneInst(f,i).fields||[],vals))}else r.push(...feVisLeaves(f.fields||[],vals))}else if(feVis(f,vals)&&!(f.type==="privnote"&&!feS!.pv.prac))r.push(f)}return r};
{const _pvf0=fePvFld;fePvFld=function(f,L,P,cols){
  if(f.type==="privnote"&&!feS!.pv.prac)return "";
  if(f.type==="group"&&f.repeat){const vals=FE.pv.vals;if(!feVis(f,vals))return "";FE.pv.rep=FE.pv.rep||{};const n=FE.pv.rep[f.id]||1,max=+f.rmax!||5;
    const inst=Array.from({length:n},(_,i)=>{const c=feCloneInst(f,i);const inner=(c.fields||[]).map((x: FeField)=>fePvFld(x,L,P,f.cols||2)).join("");return `<div class="fe-rinst"><div class="fe-rih"><span class="n">${nf(i+1)}</span><b dir="auto">${FEE(fv(f.label,L))}</b><span class="sp"></span>${n>1?`<button type="button" class="fe-lnk danger" data-reprm="${f.id}" data-ri="${i}"${P.ro?" disabled":""}>${FEI.x}${FEE(feTx("fe_tRm",L))}</button>`:""}</div><div class="fe-pgrid">${inner}</div></div>`}).join("");
    return `<div class="fe-pgrp rep" style="${feSpVars(f,cols)}" data-pf="${f.id}"><div class="fe-pgh"><span class="ic">${FEI.repeat}</span><b>${FEE(fv(f.label,L))}</b><small class="fe-mut">${FEE(feTx("fe_repCount",L,{n:nf(n),m:nf(max)}))}</small></div>${inst}<button type="button" class="fe-pbtn ghost sm" data-repadd="${f.id}" ${n>=max||P.ro?"disabled":""}>${FEI.plus}${FEE(fv(f.rlabel,L)||feTx("fe_repAdd",L))}</button></div>`}
  let h=_pvf0(f,L,P,cols);const pr=FE.pv.prov?.[f.id];
  if(pr&&h){const i=h.indexOf("</label>");if(i>0)h=h.slice(0,i)+`<em class="fe-b prov t-${pr.st}" title="${FEE(pr.src)}">${FEI.wand}${FEE(feTx("fe_provB",L,{x:pr.src as string}))}</em>`+h.slice(i)}
  if(f.type==="privnote"&&h)h=h.replace('class="fe-pfld','class="fe-pfld privp');
  return h;
}}
function feSeeded<T,>(arr: T[],seed: number){const a=arr.slice();let s=seed||1;for(let i=a.length-1;i>0;i--){s=(s*9301+49297)%233280;const j=Math.floor(s/233280*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
{const _pr0=fePvRender;fePvRender=function(dir){
  const d=feDoc();feEach(f=>{if(f.dv!=null&&f.dv!==""&&FE.pv.vals[f.id]===undefined)FE.pv.vals[f.id]=String(f.dv)});
  if(d!.set?.rand&&!FE.pv.seed)FE.pv.seed=1+Math.floor(Math.random()*10000);
  if((d!.set?.hidePol||"clear")==="clear"){feEach(f=>{if(f.type!=="group"&&!feVis(f,FE.pv.vals)&&FE.pv.vals[f.id]!==undefined&&!FE.pv.keepHidden)delete FE.pv.vals[f.id]})}
  if(FE.pv.step<d!.pages.length&&!fePageOn(d!.pages[FE.pv.step],FE.pv.vals))FE.pv.step=feNextStep(FE.pv.step,1);
  _pr0(dir);
  const R=feRoot();R?.querySelectorAll<HTMLInputElement>(".fe-pf").forEach(p=>{p.classList.toggle("dk",!!feS!.pv.dark);const an=d!.set?.anon;if(an&&an!=="ident"&&!p.querySelector<HTMLInputElement>(".fe-anon")){p.querySelector<HTMLInputElement>(".fe-wel")?.insertAdjacentHTML("afterend",`<div class="fe-anon">${FEI.shield}${FEE(feTx(an==="anon"?"fe_anonNote":"fe_pseudoNote",feS!.pv.lang||feCL()))}</div>`)}});
}}
/* cross-field + url + daterange validation */
{const _pv0=fePvValidate;fePvValidate=function(){const ok=_pv0();const d=feDoc(),p=d!.pages[FE.pv.step];if(!p)return ok;const L=feS!.pv.lang||feCL(),vals=FE.pv.vals,err=FE.pv.err;
  for(const s of p.sections)for(const f of feVisLeaves(s.fields,vals)){if(err[f.id])continue;const v=vals[f.id] as FeAnsR;
    if(f.type==="url"&&v&&!/^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(v))err[f.id]=feTx("fe_urlErr",L);
    if(f.type==="daterange"&&v?.a&&v?.b&&v.b<v.a)err[f.id]=feTx("fe_rangeErr",L);
    if(f.xv?.op&&v!=null&&v!==""){const o=feFind(f.xv.ref)?.f,ov=o?vals[o.id]:null;if(ov!=null&&ov!==""){const a=["date","datetime"].includes(f.type)?String(v):+v,b=["date","datetime"].includes(f.type)?String(ov):+ov;const pass={gte:a>=b,gt:a>b,lte:a<=b,lt:a<b,neq:a!=b}[f.xv.op];if(!pass)err[f.id]=feTx("fe_xvErr",L,{op:feTx((FE_OPS.find(x=>x[0]===f.xv!.op)||[])[1],L),x:fv(o!.label,L)})}}}
  return !Object.keys(err).length}}
/* ================= Forms: dialogs, creation modes, import, AI preview, review, autofill ================= */
function feModal(html: string,o: FeModalT["o"]={}){
  const R=feRoot();if(!R)return null;feModalClose(true);
  const m=document.createElement("div");m.className="fe-mback"+(o.drawer?" drawer":"");m.innerHTML=`<div class="fe-mdl${o.wide?" wide":""}" role="dialog" aria-modal="true" aria-label="${FEE(o.title||"")}">${html}</div>`;R.appendChild(m);FE.modal={el:m,o};
  if(!feRM()){m.animate([{opacity:0},{opacity:1}],{duration:200});m.firstElementChild!.animate(o.drawer?[{transform:"translateX(40px)",opacity:0},{transform:"none",opacity:1}]:[{transform:"translateY(14px) scale(.97)",opacity:0},{transform:"none",opacity:1}],{duration:340,easing:"cubic-bezier(.2,1.1,.3,1)"})}
  setTimeout(()=>m.querySelector<HTMLInputElement>("[autofocus],input,textarea,button:not(.fe-mx)")?.focus(),40);return m;
}
function feModalClose(now?: boolean){const M=FE.modal;if(!M)return;FE.modal=null;M.o.onClose?.();if(now||feRM()){M.el.remove();return}M.el.animate([{opacity:1},{opacity:0}],{duration:160}).finished.then(()=>M.el.remove())}
const feMHead=(ic: string,title: string,sub?: string)=>`<header class="fe-mh"><span class="ic">${ic}</span><div><h3>${FEE(title)}</h3>${sub?`<p>${FEE(sub)}</p>`:""}</div><button type="button" class="fe-ib fe-mclx" data-mclose aria-label="${t("fmClose")}">${FEI.x}</button></header>`;

/* ---------- creation modes ---------- */
function feCreateModal(){
  const modes=[["blank","plus","fe_mBlank","fe_mBlankD"],["tpl","templates","fe_mTpl","fe_mTplD"],["ai","spark","fe_mAi","fe_mAiD"],["import","import","fe_mImport","fe_mImportD"],["compose","compose","fe_mCompose","fe_mComposeD"],["dup","copy","fe_mDup","fe_mDupD"],["wizard","wand","fe_mWizard","fe_mWizardD"]];
  feModal(feMHead(FEI.plus,t("fe_new"),t("fe_mSub"))+`<div class="fe-modes">${modes.map(([k,ic,l,dsc])=>`<button type="button" class="fe-mode" data-mode="${k}"><span class="ic">${FEI[ic]}</span><b>${t(l)}</b><small>${t(dsc)}</small></button>`).join("")}</div>`,{wide:true,title:t("fe_new")});
}
function feModeGo(k: string){
  if(k==="blank"){feModalClose();feNewForm("blank");return}
  if(k==="tpl"){feModalClose();feGo("templates");return}
  if(k==="ai"){feModal(feMHead(FEI.spark,t("fe_mAi"),t("fe_mAiD"))+`<div class="fe-mb"><textarea class="fe-inp" rows="4" data-aigen autofocus dir="auto" placeholder="${t("fe_aiGenPh")}"></textarea><div class="fe-sugg">${["fe_aiS1","fe_aiS2","fe_aiS3","fe_aiS4","fe_aiS5"].map(s=>`<button type="button" data-aisugg>${t(s)}</button>`).join("")}</div><p class="fe-mut">${FEI.shield}${t("fe_aiNoPublish")}</p></div><footer class="fe-mf"><button type="button" class="fe-btn" data-mclose>${t("fe_cancel")}</button><button type="button" class="fe-btn pri" data-aigenbtn>${FEI.spark}${t("fe_genBtn")}</button></footer>`,{wide:true});return}
  if(k==="import"){feImportModal("json");return}
  if(k==="compose"){feModal(feMHead(FEI.compose,t("fe_mCompose"),t("fe_mComposeD"))+`<div class="fe-mb"><div class="fe-blkpick">${(feS!.blocks||[]).map(b=>`<label class="fe-blkc"><input type="checkbox" value="${b.id}" data-cpick><span class="ic">${FEI.compose}</span><span class="tx"><b>${FEE(b.name)}</b><small>${t("fe_statFields",{n:nf(b.fields.length)})} · v${nf(b.ver)} · ${t(b.scope==="org"?"fe_scopeOrg":"fe_scopePriv")}</small></span></label>`).join("")||`<p class="fe-mut">${t("fe_noBlocks")}</p>`}</div></div><footer class="fe-mf"><button type="button" class="fe-btn" data-mclose>${t("fe_cancel")}</button><button type="button" class="fe-btn pri" data-composego>${t("fe_create")}</button></footer>`,{wide:true});return}
  if(k==="dup"){const L=feListForms("all").concat(feListForms("arch"));feModal(feMHead(FEI.copy,t("fe_mDup"),t("fe_mDupD"))+`<div class="fe-mb"><div class="fe-mini">${L.map(e=>`<button type="button" class="fe-mr" data-dupgo="${e.id}"><span class="ic c-${e.cat}">${FEI[feCatIc(e.cat)]}</span><span class="tx"><b dir="auto">${FEE(feName(e))}</b><small>${fePill(feS!.docs[e.id]?.status||e.status).replace(/<[^>]+>/g,"")} · ${feAgo(e.upd!)}</small></span><span class="ar">${FEI.chevR}</span></button>`).join("")}</div></div>`,{wide:true});return}
  if(k==="wizard"){FE.wz={step:0,dom:"physio",aud:"patient",goal:"",lang:lang(),secs:3,sign:true,cons:true,score:false,logic:true};feWizard();return}
}
/* ---------- guided wizard ---------- */
const FE_WZD=[["general","grid"],["health","heart"],["psy","brain"],["physio","walk"],["rehab","repeat"],["survey","surveys"],["business","briefcase"],["checklist","multi"]];
function feWizard(){const w=FE.wz,steps=["fe_wz1","fe_wz2","fe_wz3","fe_wz4"];let body="";
  if(w!.step===0)body=`<div class="fe-wzd">${FE_WZD.map(([k,ic])=>`<button type="button" class="fe-mode sm${w!.dom===k?" on":""}" data-wzdom="${k}"><span class="ic">${FEI[ic]}</span><b>${t("fe_dm_"+k)}</b></button>`).join("")}</div>`;
  else if(w!.step===1)body=`<div class="fe-radioc" role="radiogroup">${[["patient","fe_audP"],["pro","fe_audPro"],["team","fe_audTeam"],["client","fe_audClient"]].map(([k,l])=>`<button type="button" role="radio" aria-checked="${w!.aud===k}" data-wzaud="${k}"><span>${t(l)}</span><i></i></button>`).join("")}</div>${feRow("fe_wzGoal",`<textarea class="fe-inp" rows="2" data-wzgoal dir="auto" placeholder="${t("fe_wzGoalPh")}">${FEE(w!.goal)}</textarea>`)}`;
  else if(w!.step===2)body=`${feRow("fe_contentLang",`<div class="fe-seg sm">${feLangs.map(l=>`<button type="button" aria-pressed="${w!.lang===l}" data-wzlang="${l}">${LANGS[l].name}</button>`).join("")}</div>`)}${feRow("fe_wzSecs",`<div class="fe-seg sm">${[1,2,3,4,5].map(n=>`<button type="button" aria-pressed="${w!.secs===n}" data-wzsecs="${n}">${nf(n)}</button>`).join("")}</div>`)}`;
  else body=`<div class="fe-tgs">${[["sign","fe_wzSign"],["cons","fe_wzCons"],["score","fe_wzScore"],["logic","fe_wzLogic"]].map(([k,l])=>feTg(`data-wzopt="${k}"`,w![k],l)).join("")}</div><div class="fe-wzsum">${FEI.info}<span>${t("fe_wzSum",{d:t("fe_dm_"+w!.dom),n:nf(w!.secs)})}</span></div>`;
  feModal(feMHead(FEI.wand,t("fe_mWizard"),t(steps[w!.step]))+`<div class="fe-wzsteps">${steps.map((s,i)=>`<span class="${i<w!.step?"done":i===w!.step?"cur":""}"><i>${i<w!.step?FEI.check:nf(i+1)}</i>${t(s)}</span>`).join("")}</div><div class="fe-mb">${body}</div><footer class="fe-mf">${w!.step?`<button type="button" class="fe-btn" data-wzprev>${t("fe_prev")}</button>`:`<button type="button" class="fe-btn" data-mclose>${t("fe_cancel")}</button>`}<button type="button" class="fe-btn pri" data-wznext>${w!.step<3?t("fe_next"):FEI.wand+t("fe_wzGen")}</button></footer>`,{wide:true});
}
function feWizardBuild(){const w=FE.wz,F=feField,P=(id: string)=>feNewField(id);
  const lib: Record<string, [string, string[]][]>={general:[["fe_sPerso",["text","email","phone"]],["fe_sMore",["select","textarea"]],["fe_sCons",["multi"]]],
    health:[["fe_sPerso",["patient","phone","email"]],["fe_sHist",["history","allergy","meds"]],["fe_sVit",["vitals","clinical"]],["fe_sIns",["text","file"]]],
    psy:[["fe_sPat",["patient"]],["fe_wzPsyNow",["mood","emo","psy_stress"]],["fe_wzPsyWeek",["psy_freq","psy_sleep","psy_coping"]],["fe_wzPsyGoals",["psy_goal","psy_journal"]],["fe_wzPrac",["privnote"]]],
    physio:[["fe_sPat",["patient","sel_pract"]],["fe_wzPain",["bodymap","clinical"]],["fe_wzFunc",["rom","strength","phy_balance","phy_gait"]],["fe_wzAdl",["phy_adl","phy_device"]],["fe_wzPlan",["phy_ex","phy_goal"]]],
    rehab:[["fe_sPat",["patient"]],["fe_wzProg",["measure","phy_adherence","psy_progress"]],["fe_wzFunc",["phy_adl"]],["fe_wzPlan",["phy_goal"]]],
    survey:[["fe_sExp",["sat","nps","likert","semantic"]],["fe_wzDetails",["matrix","rank"]],["fe_fComments",["textarea"]]],
    business:[["fe_wzCompany",["biz_company","biz_siret","address"]],["fe_wzContact",["text","email","phone"]],["fe_wzOrder",["table","currency"]]],
    checklist:[["fe_wzCheck",["multi","yesno","yesno"]],["fe_wzObs",["textarea","file"]],["fe_wzSignoff",["biz_approval"]]]};
  const plan=(lib[w!.dom]||lib.general).slice(0,w!.secs);
  const d=feMakeDoc("blank",w!.goal?w!.goal.slice(0,60):t("fe_wzTitle",{x:t("fe_dm_"+w!.dom)}));d.sub=w!.goal||"";d.lang=w!.lang===lang()?null:w!.lang;d.set.dom=w!.dom;d.cat=["survey"].includes(w!.dom)?"surveys":["psy","physio","rehab"].includes(w!.dom)?"clinical":"patients";
  d.pages=[{id:feId(),title:"fe_pg1",sections:[]}];
  const id="f"+Date.now().toString(36);feS!.docs[id]=d;feS!.forms.push({id,cat:d.cat,kind:"blank",status:"draft",resp:0,upd:Date.now(),owner:"me"});feS!.ver[id]=[];feS!.cur=id;
  plan.forEach(([title,types],i)=>{if(i>0&&i%2===0)d.pages.push({id:feId(),title:"fe_newPage",sections:[]});d.pages[d.pages.length-1].sections.push({id:feId(),title,cols:2,fields:types.map(ty=>P(ty))})});
  d.pages.forEach(p=>{if(p.sections[0])p.title=p.sections[0].title});
  if(w!.cons)d.pages[d.pages.length-1].sections.push({id:feId(),title:"fe_sCons",cols:1,fields:[F("multi","fe_fConsent",{key:feUniqKey("consentements"),opts:["fe_oC1","fe_oC2"],req:true})]});
  if(w!.sign)d.pages[d.pages.length-1].sections[d.pages[d.pages.length-1].sections.length-1].fields.push(F("sign","fe_fSign",{key:feUniqKey("signature"),req:true}));
  if(w!.score){const nums: FeField[]=[];feEach(x=>{if(["likert","mood","clinical","slider","rating","sat","nps"].includes(x.type))nums.push(x)});if(nums.length){const sc=feNewField("score");sc.items=nums.map(x=>({ref:x.id,w:1}));d.pages[d.pages.length-1].sections[0].fields.push(sc)}}
  if(w!.logic){let src=null as FeField | null,tgt=null as FeField | null;feEach(x=>{if(!src&&["clinical","psy_stress"].includes(x.pre||x.type))src=x});feEach(x=>{if(!tgt&&src&&x!==src&&["textarea","bodymap","psy_journal"].includes(x.pre||x.type))tgt=x});if(src&&tgt)tgt.logic={act:"show",mode:"all",conds:[{src:src.id,op:"gte",val:"5"}]}}
  feSave();feModalClose();feOpenForm(id);feToast(t("fe_wzDone"));
}

/* ---------- import (JSON, CSV, PDF/Word text, OCR unavailable) ---------- */
function feImportModal(tab?: string){FE.imp={tab,rows:null,warn:[],src:""};feImportRender()}
function feImportRender(){const I=FE.imp,tabs=[["json","fe_impJson"],["csv","fe_impCsv"],["doc","fe_impDoc"],["ocr","fe_impOcr"]];
  let body="";
  if(I!.tab==="json")body=`<p class="fe-mut">${t("fe_impJsonD")}</p><textarea class="fe-inp fe-mono" rows="7" data-impsrc dir="ltr" placeholder='{"title":"…","pages":[…]}'>${FEE(I!.src)}</textarea><label class="fe-btn sm">${FEI.upload}${t("fe_impFile")}<input type="file" accept=".json,application/json" data-impfile hidden></label>`;
  else if(I!.tab==="csv")body=`<p class="fe-mut">${t("fe_impCsvD")}</p><pre class="fe-code" dir="ltr">page;section;label;type;options;required\n1;Identité;Nom;text;;oui\n1;Identité;Sexe;select;Femme|Homme|Autre;oui\n2;Santé;Allergies;textarea;;non</pre><textarea class="fe-inp fe-mono" rows="5" data-impsrc dir="ltr">${FEE(I!.src)}</textarea><label class="fe-btn sm">${FEI.upload}${t("fe_impFile")}<input type="file" accept=".csv,text/csv,.txt" data-impfile hidden></label>`;
  else if(I!.tab==="doc")body=`<p class="fe-mut">${t("fe_impDocD")}</p><label class="fe-drop big">${FEI.upload}<span>${t("fe_impDocDrop")}</span><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-impdoc hidden></label><p class="fe-mut">${FEI.info}${t("fe_impDocLimit")}</p>`;
  else body=`<div class="fe-unav">${FEI.scan}<b>${t("fe_unavTitle")}</b><p>${t("fe_impOcrD")}</p></div>`;
  let prev="";
  if(I!.rows){prev=`<div class="fe-impprev"><div class="hd"><b>${t("fe_impPrev",{n:nf(I!.rows.length)})}</b>${I!.warn.length?`<span class="fe-tag test">${t("fe_impWarnN",{n:nf(I!.warn.length)})}</span>`:`<span class="fe-tag pub">${t("fe_impOk")}</span>`}</div>${I!.warn.length?`<ul class="fe-impw">${I!.warn.map(w=>`<li>${FEI.warn}${FEE(w)}</li>`).join("")}</ul>`:""}<div class="fe-imptbl">${I!.rows.map((r,i)=>`<label class="fe-impr${r.on?"":" off"}"><input type="checkbox" data-impon="${i}" ${r.on?"checked":""}><span class="sec" dir="auto">${FEE(r.section||"—")}</span><span class="lb" dir="auto">${FEE(r.label)}</span><div class="fe-selw"><select class="fe-inp" data-imptype="${i}">${Object.keys(FE_T).filter(k=>!FE_PRE[k]&&k!=="group"&&FE_T[k]).map(k=>`<option value="${k}" ${r.type===k?"selected":""}>${t(FE_T[k][1])}</option>`).join("")}</select>${FEI.chev}</div>${r.req?`<i class="rq">*</i>`:"<i></i>"}</label>`).join("")}</div></div>`}
  feModal(feMHead(FEI.import,t("fe_mImport"),t("fe_mImportD"))+`<div class="fe-seg fe-imptabs" role="tablist">${tabs.map(([k,l])=>`<button type="button" role="tab" aria-selected="${I!.tab===k}" data-imptab="${k}">${t(l)}</button>`).join("")}</div><div class="fe-mb">${body}${prev}</div><footer class="fe-mf"><button type="button" class="fe-btn" data-mclose>${t("fe_cancel")}</button>${I!.tab==="json"||I!.tab==="csv"?`<button type="button" class="fe-btn" data-impparse>${t("fe_impAnalyse")}</button>`:""}<button type="button" class="fe-btn pri" data-impgo ${I!.rows&&I!.rows.some(r=>r.on)||I!.json?"":"disabled"}>${t("fe_impCreate")}</button></footer>`,{wide:true});
}
function feCsvParse(s: string){const rows=[];let row=[],cur="",q=false;const sep=(s.split("\n")[0].match(/;/g)||[]).length>=(s.split("\n")[0].match(/,/g)||[]).length?";":",";for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'){if(s[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}else if(c==='"')q=true;else if(c===sep){row.push(cur);cur=""}else if(c==="\n"){row.push(cur);rows.push(row);row=[];cur=""}else if(c!=="\r")cur+=c}if(cur||row.length){row.push(cur);rows.push(row)}return rows.filter(r=>r.some(x=>x.trim()))}
function feGuessType(label: string,hasOpts: number | boolean,multi: boolean){const s=label.toLowerCase();if(/signature|signé/.test(s))return "sign";if(/e-?mail|courriel/.test(s))return "email";if(/t[ée]l[ée]phone|phone|portable/.test(s))return "phone";if(/date|né\(e\) le|naissance/.test(s))return "date";if(/heure|time/.test(s))return "datetime";if(/adresse|address/.test(s))return "address";if(/montant|prix|€|tarif/.test(s))return "currency";if(/\b(âge|age|poids|taille|nombre|combien)\b/.test(s))return "number";if(/douleur|pain/.test(s)&&/0.*10/.test(s))return "clinical";if(hasOpts)return multi?"multi":"select";if(/oui.*non|yes.*no/.test(s))return "yesno";if(/commentaire|remarque|décri|precis|précis|observation/.test(s))return "textarea";return "text"}
function feImportParse(){const I=FE.imp,src=I!.src.trim();I!.warn=[];I!.rows=null;I!.json=null;if(!src){feToast(t("fe_impEmpty"));return}
  if(I!.tab==="json"){let j;try{j=JSON.parse(src)}catch(e){I!.warn.push(t("fe_impJsonBad",{x:(e as Error).message}));I!.rows=[];feImportRender();return}
    const doc=j.remotionField?{pages:[{title:"fe_pg1",sections:[{title:"fe_newSec",fields:[j.remotionField]}]}]}:j;if(!Array.isArray(doc.pages)){I!.warn.push(t("fe_impNoPages"));I!.rows=[];feImportRender();return}
    const rows: FeImpRow[]=[];(doc.pages as FePage[]).forEach((p,pi)=>(p.sections||[]).forEach(s=>feWalk(s.fields||[],f=>{if(!FE_T[f.type]){I!.warn.push(t("fe_impUnknown",{x:f.type,y:fv(f.label,"fr")}))}rows.push({page:pi+1,section:fv(s.title,feCL()),label:fv(f.label,feCL()),type:FE_T[f.type]?f.type:"info",req:!!f.req,on:true,raw:f})},s,s)));I!.rows=rows;I!.json=doc;feImportRender();return}
  const R2=feCsvParse(src);if(!R2.length){I!.warn.push(t("fe_impEmpty"));I!.rows=[];feImportRender();return}
  let h=R2[0].map(x=>x.trim().toLowerCase()),body=R2.slice(1);const idx=(n: string)=>h.findIndex(x=>x.startsWith(n));let iL=idx("label");if(iL<0){iL=idx("question");}if(iL<0){h=["label"];body=R2;iL=0;I!.warn.push(t("fe_impNoHeader"))}
  const iP=idx("page"),iS=idx("section"),iT=idx("type"),iO=idx("option"),iR=Math.max(idx("req"),idx("oblig"));
  I!.rows=body.map((r,n)=>{const label=(r[iL]||"").trim();const opts=iO>=0?(r[iO]||"").split(/[|;]/).map(x=>x.trim()).filter(Boolean):[];let ty=iT>=0?(r[iT]||"").trim():"";if(ty&&!FE_T[ty]){I!.warn.push(t("fe_impUnknown",{x:ty,y:label}));ty=""}return {page:+(r[iP]||1)||1,section:iS>=0?r[iS]:"",label,type:ty||feGuessType(label,opts.length,false),opts,req:iR>=0&&/^(1|oui|yes|ja|x|true|vrai)$/i.test((r[iR]||"").trim()),on:!!label}}).filter(r=>r.label);
  feImportRender();
}
function feLoadScript(src: string){return new Promise<void>((res,rej)=>{if(document.querySelector<HTMLInputElement>(`script[src="${src}"]`)){res();return}const s=document.createElement("script");s.src=src;s.onload=res as () => void;s.onerror=()=>rej(new Error("load"));document.head.appendChild(s)})}
async function feDocText(file: File){
  if(/\.pdf$/i.test(file.name)||file.type==="application/pdf"){await feLoadScript("/vendor/pdfjs-3.11.174/pdf.min.js");const lib=(window as unknown as FeWinLibs).pdfjsLib;lib.GlobalWorkerOptions.workerSrc="/vendor/pdfjs-3.11.174/pdf.worker.min.js";const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;const out=[];for(let p=1;p<=Math.min(pdf.numPages,30);p++){const pg=await pdf.getPage(p),tc=await pg.getTextContent();let line="",lastY: number|null=null;tc.items.forEach(it=>{const y=Math.round(it.transform[5]);if(lastY!==null&&Math.abs(y-lastY)>3){out.push(line);line=""}line+=(line&&!line.endsWith(" ")?" ":"")+it.str;lastY=y});if(line)out.push(line);out.push("")}return {text:out.join("\n"),pages:pdf.numPages}}
  if(/\.docx$/i.test(file.name)){await feLoadScript("/vendor/mammoth-1.6.0/mammoth.browser.min.js");const r=await (window as unknown as FeWinLibs).mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return {text:r.value,pages:null}}
  throw new Error("format");
}
function feDocToRows(text: string){const lines=text.split("\n").map(l=>l.replace(/\s+/g," ").trim());const rows: FeImpRow[]=[],warn: string[]=[];let sec="";
  for(let i=0;i<lines.length;i++){const l=lines[i];if(!l)continue;
    if(/^[☐□○◯•▢\-–]\s*|^\[\s?\]\s*/.test(l)&&rows.length){const o=l.replace(/^[☐□○◯•▢\-–]\s*|^\[\s?\]\s*/,"").trim();const last=rows[rows.length-1];if(o){last.opts=last.opts||[];last.opts.push(o);last.type=feGuessType(last.label,true,/plusieurs|multiple|toutes celles/i.test(last.label))}continue}
    if(l.length<60&&!/[?:.;,_]$/.test(l)&&(l===l.toUpperCase()&&/[A-ZÀ-Ý]{3}/.test(l)||/^\d+[.)]\s+[A-ZÀ-Ý]/.test(l)&&l.split(" ").length<7)){sec=l.replace(/^\d+[.)]\s*/,"");continue}
    if(/[?:]\s*(_{2,}|\.{3,})?$/.test(l)||/_{3,}/.test(l)){const label=l.replace(/_{2,}|\.{3,}/g,"").replace(/[:\s]+$/,"").trim();if(label.length>2&&label.length<160)rows.push({section:sec,label,type:feGuessType(label,false,false),opts:[],req:/\*\s*$|obligatoire/i.test(l),on:true})}
  }
  if(/\|\s|\t/.test(text))warn.push(t("fe_impTables"));warn.push(t("fe_impImages"));return {rows,warn}}
function feImportCreate(){const I=FE.imp;const id="f"+Date.now().toString(36);let d!: FeDocT;
  if(I!.json&&I!.tab==="json"){d=Object.assign(feMakeDoc("blank",(I!.json.title as FeLabel)||t("fe_impTitle")),{});d.pages=(JSON.parse(JSON.stringify(I!.json.pages)) as FePage[]).map(p=>({id:feId(),title:p.title||"fe_pg1",skip:p.skip,sections:(p.sections||[]).map(s=>({id:feId(),title:s.title||"fe_newSec",cols:s.cols||2,desc:s.desc,fields:(s.fields||[]).map(f=>{if(!FE_T[f.type])return feField("info",t("fe_impUnsupported",{x:f.type}),{desc:fv(f.label,"fr"),tone:"warn"});const c=JSON.parse(JSON.stringify(f));feReId(c);return c})}))}));if(I!.json.set)Object.assign(d.set,I!.json.set);if(I!.json.sub)d.sub=I!.json.sub}
  else{d=feMakeDoc("blank",t("fe_impTitle"));d.pages=[];const rows=I!.rows!.filter(r=>r.on);const pages: Record<number, FePage>={};rows.forEach(r=>{const pk=r.page||1;if(!pages[pk]){pages[pk]={id:feId(),title:t("fe_page",{n:nf(pk)}),sections:[]};d.pages.push(pages[pk])}const P=pages[pk];let s=P.sections.find(x=>x.title===(r.section||t("fe_newSec")));if(!s){s={id:feId(),title:r.section||t("fe_newSec"),cols:2,fields:[]};P.sections.push(s)}const f=feField(r.type,r.label,{req:r.req});if(r.opts?.length&&["select","multi","chips","likert","rank"].includes(r.type)){f.opts=r.opts;if(r.type==="select")f.disp=r.opts.length<=4?"radio":"list"}if(r.type==="table"){f.tcols=[{l:t("fe_tCol",{n:1}),ty:"text"},{l:t("fe_tCol",{n:2}),ty:"text"}];(f as Bag).rows=3}f.key=feSlug(r.label).slice(0,28)||"champ";s.fields.push(f)});if(!d.pages.length)d.pages=[{id:feId(),title:"fe_pg1",sections:[{id:feId(),title:"fe_newSec",cols:2,fields:[feField("text","fe_untitledQ")]}]}]}
  d.status="draft";d.everPub=false;feS!.docs[id]=d;feS!.forms.push({id,cat:d.cat,kind:"blank",status:"draft",resp:0,upd:Date.now(),owner:"me"});feS!.ver[id]=[];feS!.cur=id;
  /* make keys unique */const used=new Set();feEach(f=>{let k=f.key||"champ",n=2;const b=k;while(used.has(k))k=b+"_"+n++;f.key=k;used.add(k)});
  feSave();feModalClose();feOpenForm(id);feToast(t("fe_impDone",{n:nf(feCount())}));
}

/* ---------- AI: propose, preview, then apply ---------- */
const FE_DOMKW: [RegExp, string][]=[[/kin[ée]|physio|r[ée][ée]ducation|rehab|mobilit|articul|genou|[ée]paule|lombal/i,"physio"],[/psy|humeur|mood|anxi|stress|sommeil|sleep|th[ée]rapie|[ée]motion/i,"psy"],[/satisf|nps|enqu[êe]te|survey|feedback|avis/i,"survey"],[/patient|m[ée]dical|clinique|sant[ée]|ant[ée]c[ée]dent|allerg/i,"health"],[/entreprise|client|commande|devis|siret|facture|business/i,"business"],[/inspection|checklist|contr[ôo]le|audit/i,"checklist"]];
const feDomOf=(q: string)=>(FE_DOMKW.find(([re])=>re.test(q))||[0,"general"])[1];
{const _al0=feAiLocal;feAiLocal=function(q){
  const s=String(q||"");if(/bilingue|bilingual|zweisprachig/i.test(s)){const L=/angl|engl/i.test(s)?"en":/allem|german|deutsch/i.test(s)?"de":/arab/i.test(s)?"ar":"en";return [{op:"tr",lang:L}]}
  const _cr=FE.aiCreate;FE.aiCreate=false;if(_cr||/(cr[ée]e|g[ée]n[èe]re|construis|build|create|erstell)/i.test(s)&&/(formulaire|questionnaire|form|bilan|enqu[êe]te|survey|assessment|[ée]valuation)/i.test(s)){const dom=feDomOf(s);const m={physio:[["fe_wzPain",["bodymap","clinical"]],["fe_wzFunc",["rom","strength","phy_balance"]],["fe_wzPlan",["phy_ex","phy_goal"]]],psy:[["fe_wzPsyNow",["mood","emo","psy_stress"]],["fe_wzPsyWeek",["psy_freq","psy_sleep"]],["fe_wzPsyGoals",["psy_journal"]]],survey:[["fe_sExp",["sat","nps","likert"]],["fe_fComments",["textarea"]]],health:[["fe_sPerso",["patient","phone"]],["fe_sHist",["history","allergy","meds"]]],business:[["fe_wzCompany",["biz_company","biz_siret","address"]],["fe_wzContact",["text","email","phone"]]],checklist:[["fe_wzCheck",["yesno","yesno","multi"]],["fe_wzObs",["textarea"]]],general:[["fe_sPerso",["text","email"]],["fe_sMore",["textarea"]]]}[dom];return [{op:"dom",dom},...(m as [string, string[]][]).map(([title,types])=>({op:"sec",title:t(title),types}))]}
  if(/douleur|pain|schmerz/i.test(s)&&/(si|if|wenn|quand|when)/i.test(s)&&/(question|condition|conditionnel|logique|logic)/i.test(s))return [{op:"painlogic"}];
  return _al0(q);
}}
function feOpLabel(o: FeOp){const L=feCL();if(o.op==="add")return t("fe_opAdd",{x:o.label||t(FE_T[o.type!]?.[1]||"fe_cText")});if(o.op==="sec")return t("fe_opSec",{x:o.title||t("fe_newSec"),n:nf((o.types||o.fields||[]).length)});if(o.op==="req"){const f=o.fid?feFind(o.fid)?.f:feMatchField(String(o.label||""));return t("fe_opReq",{x:f?fv(f.label,L):o.label||"?"})}if(o.op==="tr")return t("fe_opTr",{x:t("fe_L"+o.lang)});if(o.op==="painlogic")return t("fe_opPain");if(o.op==="dom")return t("fe_opDom",{x:t("fe_dm_"+o.dom)});return o.op}
feAiRun=async function(text,src){
  const q=String(text||"").trim();if(!q)return;if(FE.view!=="editor"||FE.tab!=="editor"){FE.view="editor";FE.tab="editor";feRender(false)}
  if(feDoc()!.set?.aiPol==="off"){feToast(t("fe_aiDisabled"));return}
  const busy=(on: boolean|undefined)=>{feRoot()?.querySelector<HTMLInputElement>(".fe-aibar")?.classList.toggle("busy",on)};let ops=feAiLocal(q);
  if(!ops.length&&feS!.set.ai!==false){busy(true);feToast(t("fe_aiThinking"));const S=await aiGetSample();if(S){try{const L=feCL(),fields: string[]=[];fePage().sections.forEach(s=>s.fields.forEach(f=>fields.push(`${fv(s.title,L)} > ${fv(f.label,L)} (${f.type})`)));
    const prompt=`You edit a form builder. Reply ONLY with a JSON array of operations.\n{"op":"add","type":TYPE,"label":"…"}\n{"op":"sec","title":"…","types":[TYPE,…]}\n{"op":"req","label":"existing label"}\n{"op":"tr","lang":"fr|en|de|ar"}\nTYPE: ${Object.keys(FE_T).join(", ")}.\nNever invent clinical scoring or validated questionnaire items. Labels in ${LANGS[L].name}.\nFields:\n${fields.join("\n")}\n\nRequest: ${q}`;
    const r=await S([{role:"user",content:prompt}],{cache:false});const m=String(r.text||"").match(/\[[\s\S]*\]/);if(m)try{ops=JSON.parse(m[0])}catch(e){ops=[]}}catch(e){ops=[]}}busy(false)}
  ops=(Array.isArray(ops)?ops:[]).filter(o=>o&&o.op);
  if(!ops.length){feToast(t("fe_aiNone"));return}
  FE.aiOps=ops.map(o=>({...o,on:true}));feAiPreview(q);
};
function feAiPreview(q: string){const R=feRoot(),bar=R?.querySelector<HTMLInputElement>(".fe-aibar");if(!bar)return;bar.querySelector<HTMLInputElement>(".fe-aiprev")?.remove();const dom=FE.aiOps!.find(o=>o.op==="dom");
  bar.insertAdjacentHTML("afterbegin",`<div class="fe-aiprev" role="dialog" aria-label="${t("fe_aiPrevT")}"><div class="hd">${FEI.spark}<b>${t("fe_aiPrevT")}</b>${dom?`<span class="fe-tag">${t("fe_opDom",{x:t("fe_dm_"+dom.dom)})}</span>`:""}<span class="sp"></span><button type="button" class="fe-ib xs" data-aix aria-label="${t("fmClose")}">${FEI.x}</button></div><p class="q" dir="auto">« ${FEE(q)} »</p><div class="ops">${FE.aiOps!.map((o,i)=>o.op==="dom"?"":`<label><input type="checkbox" data-aiop="${i}" ${o.on?"checked":""}><span>${FEE(feOpLabel(o))}</span></label>`).join("")}</div><p class="fe-mut">${FEI.info}${t("fe_aiPrevNote")}</p><div class="fe-pacts"><button type="button" class="fe-btn sm" data-aix>${t("fe_cancel")}</button><button type="button" class="fe-btn pri sm" data-aiapply>${FEI.check}${t("fe_aiApply")}</button></div></div>`);
  const p=bar.querySelector<HTMLInputElement>(".fe-aiprev");if(!feRM())p!.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"none"}],{duration:280,easing:"cubic-bezier(.2,1.1,.3,1)"});
}
function feAiApplyStaged(){const ops=(FE.aiOps||[]).filter(o=>o.on&&o.op!=="dom");if(ops.some(o=>o.op==="sec")){const d0=feDoc();const blank=d0!.pages.length===1&&d0!.pages[0].sections.length===1&&d0!.pages[0].sections[0].fields.length<=1&&d0!.pages[0].sections[0].fields.every(f=>f.label==="fe_untitledQ");if(blank)feMut(d=>{d.pages[0].sections=[]})}FE.aiOps=null;feRoot()?.querySelector<HTMLInputElement>(".fe-aiprev")?.remove();let n=0;
  const rest=ops.filter(o=>{if(o.op==="painlogic"){let src=null as FeField | null | undefined,tgt=null as FeField | null | undefined;feEach(x=>{if(!src&&x.type==="clinical")src=x});if(!src){src=feAddField("clinical",{quiet:true})}tgt=feAddField("textarea",{label:t("fe_painDetail"),quiet:true});feMut(()=>{tgt!.logic={act:"show",mode:"all",conds:[{src:src!.id,op:"gte",val:"5"}]}},"canvas");feSelect(tgt!.id,{pulse:true});n++;return false}return true});
  n+=feAiApply(rest);const i=feRoot()?.querySelector<HTMLInputElement>("[data-aiin]");if(i)i.value="";if(n)feToast(t("fe_aiDone",{n:nf(n)}))}

/* ---------- submissions: review, approval, corrections, audit ---------- */
const FE_SUBST: [string, string][]=[["new","fe_stNew"],["review","fe_stReview"],["approved","fe_stApproved"],["correction","fe_stCorr"],["rejected","fe_stRejected"],["test","fe_stTest"]];
const feSubSt=(s: string)=>s==="done"?"approved":s;
function feSubSample(s: FeSub){if(s.ans)return;const keep=feS!.cur,keepV=FE.pv.vals;try{feS!.cur=s.form;feDoc();fePvPrefill(true);s.ans=FE.pv.vals;s.sample=true}finally{feS!.cur=keep;FE.pv.vals=keepV}}
function feSubAnswersHTML(s: FeSub){const keep=feS!.cur,keepV=FE.pv.vals;let h="";try{feS!.cur=s.form;const d=feDoc(),L=feCL();FE.pv.vals=s.ans||{};
  h=d!.pages.map(p=>{const rows=p.sections.flatMap(sec=>feVisLeaves(sec.fields,FE.pv.vals)).filter(f=>!FE_STATIC.has(f.type));if(!rows.length)return "";return `<div class="fe-cfp"><div class="hd"><b dir="auto">${FEE(fv(p.title,L))}</b></div><dl>${rows.map(f=>{const v=feValStr(f,f.type==="table"?feTblRows(f,FE.pv.vals):FE.pv.vals[f.id],L);return `<div class="${f.priv==="health"?"sens":""}"><dt>${FEE(fv(f.label,L))}${f.priv==="health"?` <em class="fe-b pv">${FEI.shield}</em>`:""}</dt><dd class="${v?"":"mut"}">${FEE(v??t("fe_empty"))}</dd></div>`}).join("")}</dl></div>`}).join("")}finally{feS!.cur=keep;FE.pv.vals=keepV}return h}
function feSubLog(s: FeSub,act: string,msg?: string){s.log=s.log||[];s.log.push({at:Date.now(),by:ACCOUNTS?.[0]?.name||t("fe_you"),act,msg:msg||""});feSave()}
function feSubOpen(id: string,tab?: string){const s=feS!.subs.find(x=>x.id===id);if(!s)return;feSubSample(s);if(!s.log||!s.log.length){s.log=[{at:s.at,by:s.who,act:"submitted"}]}if(!s.seen){s.seen=1;feSubLog(s,"opened");if(s.st==="new"){s.st="review";feSubLog(s,"status","review")}}
  FE.subTab=tab||FE.subTab||"ans";const e=feEntry(s.form),st=feSubSt(s.st);
  const body=FE.subTab==="ans"?`${s.sample?`<p class="fe-mut">${FEI.info}${t("fe_subSample")}</p>`:""}${s.st==="correction"&&s.corr?`<div class="fe-info warn"><span class="ic">${FEI.warn}</span><div><b>${t("fe_corrAsked")}</b><p>${FEE(s.corr)}</p></div></div>`:""}${feSubAnswersHTML(s)}`
    :`<ol class="fe-audit">${(s.log||[]).slice().reverse().map(l=>`<li><span class="dot ${l.act}"></span><div><b>${FEE(t("fe_au_"+l.act,{x:l.act==="status"?t((FE_SUBST.find(x=>x[0]===l.msg)||[0,"fe_stNew"])[1]):""}))}</b><small>${feFullDate(l.at)} · ${FEE(l.by)}</small>${l.msg&&l.act!=="status"?`<p dir="auto">${FEE(l.msg)}</p>`:""}</div></li>`).join("")}</ol>`;
  feModal(`<header class="fe-mh"><span class="fe-av">${FEE(s.who.split(" ").map(x=>x[0]).join("").slice(0,2))}</span><div><h3>${FEE(s.who)}</h3><p>${FEE(e?feName(e):"—")} · ${feFullDate(s.at)}</p></div><span class="fe-tag ${st}">${t((FE_SUBST.find(x=>x[0]===st)||FE_SUBST[0])[1])}</span><button type="button" class="fe-ib fe-mclx" data-mclose aria-label="${t("fmClose")}">${FEI.x}</button></header><div class="fe-seg sm fe-subtabs" role="tablist"><button type="button" role="tab" aria-selected="${FE.subTab==="ans"}" data-subtab="ans">${t("fe_subAns")}</button><button type="button" role="tab" aria-selected="${FE.subTab==="log"}" data-subtab="log">${t("fe_subLog")} · ${nf((s.log||[]).length)}</button></div><div class="fe-mb">${body}</div><footer class="fe-mf sub"><textarea class="fe-inp" rows="2" data-subnote dir="auto" placeholder="${t("fe_subNotePh")}"></textarea><div class="row"><button type="button" class="fe-btn sm" data-subact="note">${FEI.text}${t("fe_subNote")}</button><span class="sp"></span>${s.st==="test"?"":`<button type="button" class="fe-btn sm danger" data-subact="rejected">${FEI.x}${t("fe_subReject")}</button><button type="button" class="fe-btn sm" data-subact="correction">${FEI.undo}${t("fe_subCorr")}</button><button type="button" class="fe-btn pri sm" data-subact="approved">${FEI.check}${t("fe_subApprove")}</button>`}</div></footer>`,{drawer:true,title:s.who});FE.subOpen=id;
}
function feSubAct(act: string){const s=feS!.subs.find(x=>x.id===FE.subOpen);if(!s)return;const note=feRoot()?.querySelector<HTMLInputElement>("[data-subnote]")?.value.trim()||"";
  if(act==="note"){if(!note){feToast(t("fe_subNoteEmpty"));return}feSubLog(s,"note",note);feSubOpen(s.id,"log");return}
  if((act==="rejected"||act==="correction")&&!note){feToast(t("fe_subNeedMsg"));feRoot()?.querySelector<HTMLInputElement>("[data-subnote]")?.focus();return}
  s.st=act;if(act==="correction")s.corr=note;feSubLog(s,"status",act);if(note)feSubLog(s,act==="correction"?"corr":"reason",note);
  feToast(t("fe_subDone_"+act));feSubOpen(s.id);if(FE.view==="subs")feRender();
}
{const _vh0=feViewHTML;feViewHTML=function(){
  if(FE.view==="subs"){const fl=FE.sf||"all";const rows=feS!.subs.filter(s=>fl==="all"||feSubSt(s.st)===fl).sort((a,b)=>b.at-a.at);
    const h=`<div class="fe-chips scroll" role="tablist">${[["all","fe_fAllChip"],...FE_SUBST].map(([k,l])=>`<button type="button" role="tab" aria-selected="${fl===k}" data-sf="${k}">${t(l)}<span class="ct">${nf(k==="all"?feS!.subs.length:feS!.subs.filter(s=>feSubSt(s.st)===k).length)}</span></button>`).join("")}</div><div class="fe-tbl subs" role="table"><div class="fe-tr th" role="row"><span>${t("fe_colPatient")}</span><span>${t("fe_colForm")}</span><span>${t("fe_colDate")}</span><span>${t("fe_colStatus")}</span></div>${rows.map(s=>{const e=feEntry(s.form),st=feSubSt(s.st);return `<div class="fe-tr" role="row" data-sub="${s.id}" tabindex="0"><span class="nm"><span class="av">${FEE(s.who.split(" ").map(x=>x[0]).join("").slice(0,2))}</span><b>${FEE(s.who)}</b>${s.log&&s.log.some(l=>l.act==="note")?`<em class="fe-b">${FEI.text}</em>`:""}</span><span class="mut" dir="auto">${FEE(e?feName(e):"—")}</span><span class="mut">${feFullDate(s.at)}</span><span><span class="fe-tag ${st}">${t((FE_SUBST.find(x=>x[0]===st)||FE_SUBST[0])[1])}</span></span></div>`}).join("")||`<div class="fe-emptyp">${FEI.subs}<p>${t("fe_noSubs")}</p></div>`}</div>`;
    return `<header class="fe-hd v"><button type="button" class="fe-ib fe-burger" data-fe-open="nav" aria-label="${t("fe_menu")}">${FEI.menu}</button><div class="fe-hl"><div class="fe-tt"><h2>${t("fe_nSubs")}</h2></div><p class="fe-sub">${t("fe_subsSub")}</p></div><div class="fe-ha"><button type="button" class="fe-btn" data-csv>${FEI.upload}<span>${t("fe_exportCsv")}</span></button></div></header><div class="fe-body fe-vb">${h}</div>`}
  let h=_vh0();
  if(FE.view==="analytics")h=h.replace(/<\/div>$/,feQAnalyticsHTML()+"</div>");
  if(FE.view==="library")h=h.replace('<div class="fe-body fe-vb">',`<div class="fe-body fe-vb">${feBlocksMgrHTML()}<h4 class="fe-gh">${t("fe_libComps")}</h4>`);
  return h;
}}
function feBlocksMgrHTML(){return `<section class="fe-card fe-blkmgr"><h5>${FEI.compose}${t("fe_cfBlocks")}<span class="fe-tag">${nf((feS!.blocks||[]).length)}</span></h5><p class="fe-mut">${t("fe_blkMgrSub")}</p><div class="fe-libg">${(feS!.blocks||[]).map(b=>`<div class="fe-lib" data-blkrow="${b.id}"><span class="ic">${FEI.compose}</span><div class="tx"><b data-blkname="${b.id}" title="${t("fe_rename")}">${FEE(b.name)}</b><small>${t("fe_statFields",{n:nf(b.fields.length)})} · v${nf(b.ver)} · ${feAgo(b.upd)}</small><div class="fe-seg sm fe-scope">${[["priv","fe_scopePriv"],["org","fe_scopeOrg"]].map(([k,l])=>`<button type="button" aria-pressed="${b.scope===k}" data-blkscope="${b.id}" data-v="${k}">${t(l)}</button>`).join("")}</div></div><button type="button" class="fe-ib sm" data-blkins="${b.id}" title="${t("fe_libAdd")}" aria-label="${t("fe_libAdd")}">${FEI.plus}</button><button type="button" class="fe-ib sm" data-blkdel="${b.id}" title="${t("fe_delete")}" aria-label="${t("fe_delete")}">${FEI.del}</button></div>`).join("")||`<p class="fe-mut">${t("fe_noBlocks")}</p>`}</div></section>`}
function feQAnalyticsHTML(){const d=feDoc(),L=feCL(),subs=feS!.subs.filter(s=>s.form===feS!.cur);subs.forEach(feSubSample);const keep=FE.pv.vals;const qs: FeField[]=[];
  feEach(f=>{if(["select","yesno","likert","mood","sat","nps","rating","clinical","multi","chips"].includes(f.type))qs.push(f)});
  const card=(f: FeField)=>{const counts: Record<string, number>={};let n=0;subs.forEach(s=>{const v=s.ans?.[f.id];if(v==null||v==="")return;n++;(Array.isArray(v)?v:[v]).forEach(x=>{counts[x]=(counts[x]||0)+1})});
    const keys=["nps","clinical"].includes(f.type)?[...Array(11).keys()].map(String):f.type==="sat"?["0","1","2","3","4"]:f.type==="rating"?[...Array(f.stars||5).keys()].map(i=>String(i+1)):(f.opts||[]).map((_,i)=>String(i));
    const lab=(k: string)=>f.opts?fv(f.opts[+k],L):f.type==="sat"?`${+k+1}/5`:k;const mx=Math.max(1,...keys.map(k=>counts[k]||0));
    return `<section class="fe-card"><h5>${FEI[FE_T[f.pre||f.type]?.[0]]||FEI.analytics}<span dir="auto">${FEE(fv(f.label,L))}</span><span class="fe-tag">${t("fe_nResp",{n:nf(n)})}</span></h5><div class="fe-qa">${keys.map(k=>`<div class="r"><span dir="auto">${FEE(lab(k))}</span><div class="bar"><i style="--w:${(counts[k]||0)/mx*100}%"></i></div><b>${nf(counts[k]||0)}</b></div>`).join("")}</div></section>`};
  FE.pv.vals=keep;return `<h4 class="fe-gh">${t("fe_qaTitle",{x:fv(d!.title,L)})}</h4><p class="fe-mut">${FEI.info}${t("fe_qaSub",{n:nf(subs.length)})}</p><div class="fe-cards2">${qs.slice(0,12).map(card).join("")||`<p class="fe-mut">${t("fe_qaNone")}</p>`}</div>`}

/* ---------- autofill with provenance ---------- */
const FE_PROFILE: Dict={nom:"Martin",prenom:"Camille",date_naissance:"1988-03-12",sexe:"0",telephone:"6 12 34 56 78",email:"camille.martin@exemple.fr",adresse:"12 rue des Lilas",code_postal:"75011",ville:"Paris",pays:"0",langue_preferee:"0",allergies:"Pénicilline",organisme:"Mutuelle Exemple"};
function feAutofillSuggest(srcKind: string,extra?: string){const L=feS!.pv.lang||feCL(),vals=FE.pv.vals,out: FeAfRow[]=[];const srcName=t("fe_afSrc_"+srcKind);
  const push=(f: FeField,val: unknown,conf: number,how: string)=>{const cur=vals[f.id];const st=cur!=null&&cur!==""&&String(cur)!==String(val)?"conflict":how;out.push({fid:f.id,label:fv(f.label,L),val,shown:feValStr(f,val as FeAnsR,L)??String(val),conf,st,src:srcName,on:st!=="conflict"})};
  if(srcKind==="profile"){feEach(f=>{if(FE_PROFILE[f.key]!=null)push(f,FE_PROFILE[f.key],.98,"confirmed")})}
  else if(srcKind==="prev"){const last=feS!.subs.filter(s=>s.form===feS!.cur&&s.ans).sort((a,b)=>b.at-a.at)[0];if(last)feEach(f=>{const v=last.ans![f.id];if(v!=null&&v!==""&&typeof v!=="object"&&!FE_STATIC.has(f.type))push(f,v,.8,"suggested")})}
  else if(srcKind==="org"){feEach(f=>{if(f.type==="selector"&&f.kind==="org")push(f,FE_SAMPLE.org[0],.95,"confirmed");if(f.type==="selector"&&f.kind==="loc")push(f,FE_SAMPLE.loc[0],.7,"suggested")})}
  else if(srcKind==="doc"&&extra){const lines=extra.split("\n");feEach(f=>{if(FE_STATIC.has(f.type)||f.type==="group")return;const lab=fv(f.label,L).toLowerCase();const lf=fv(f.label,"fr").toLowerCase();for(const l of lines){const m=l.match(/^\s*([^:]{2,60})\s*:\s*(.+)$/);if(!m)continue;const k=m[1].trim().toLowerCase();if(k===lab||k===lf||(k.length>3&&(lab.startsWith(k)||lf.startsWith(k)))){let val=m[2].trim();if(f.type==="date"){const d2=val.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);if(d2)val=`${d2[3]}-${d2[2].padStart(2,"0")}-${d2[1].padStart(2,"0")}`}if(["select","yesno","likert"].includes(f.type)){const i=feOpts(f,L).findIndex(o=>o.toLowerCase()===val.toLowerCase());if(i<0)continue;val=String(i)}push(f,val,k===lab||k===lf?.9:.65,"extracted");break}}})}
  const all: FeAfRow[]=[];feEach(f=>{if(f.req&&!FE_STATIC.has(f.type)&&!out.some(o=>o.fid===f.id)&&(vals[f.id]==null||vals[f.id]===""))all.push({fid:f.id,label:fv(f.label,L),st:"missing",src:srcName,conf:0,on:false})});
  FE.af={src:srcKind,rows:out.concat(all)};feAutofillModal();
}
function feAutofillModal(){const A=FE.af;const stLab: Dict={confirmed:"fe_afConfirmed",extracted:"fe_afExtracted",suggested:"fe_afSuggested",conflict:"fe_afConflict",missing:"fe_afMissing"};
  feModal(feMHead(FEI.wand,t("fe_afTitle"),t("fe_afSub"))+`<div class="fe-seg sm fe-afsrc">${["profile","prev","org","doc"].map(k=>`<button type="button" aria-pressed="${A!.src===k}" data-afsrc="${k}">${t("fe_afSrc_"+k)}</button>`).join("")}</div><div class="fe-mb">${A!.src==="doc"&&!A!.docName?`<label class="fe-drop big">${FEI.upload}<span>${t("fe_afDocDrop")}</span><input type="file" accept=".pdf,.docx" data-afdoc hidden></label>`:""}${A!.docName?`<p class="fe-mut">${FEI.file}${FEE(A!.docName)}</p>`:""}${A!.src==="profile"?`<p class="fe-mut">${FEI.info}${t("fe_afProfileNote")}</p>`:""}
    ${A!.rows.length?`<div class="fe-aft"><div class="th"><span></span><span>${t("fe_colName")}</span><span>${t("fe_afVal")}</span><span>${t("fe_afConf")}</span><span>${t("fe_colStatus")}</span></div>${A!.rows.map((r,i)=>`<label class="tr ${r.st}"><input type="checkbox" data-afon="${i}" ${r.on?"checked":""} ${r.st==="missing"?"disabled":""}><span dir="auto">${FEE(r.label)}</span><span dir="auto" class="v">${r.st==="missing"?"—":FEE(r.shown)}${r.st==="conflict"?`<small>${t("fe_afCur",{x:FEE(String(FE.pv.vals[r.fid]))})}</small>`:""}</span><span class="cf"><i style="--w:${Math.round(r.conf*100)}%"></i><b>${r.st==="missing"?"—":fePct(Math.round(r.conf*100))}</b></span><span><span class="fe-tag af-${r.st}">${t(stLab[r.st])}</span></span></label>`).join("")}</div>`:`<p class="fe-mut">${t("fe_afNone")}</p>`}<p class="fe-mut">${FEI.shield}${t("fe_afNoOverwrite")}</p></div><footer class="fe-mf"><button type="button" class="fe-btn" data-mclose>${t("fe_cancel")}</button><button type="button" class="fe-btn pri" data-afapply ${A!.rows.some(r=>r.on)?"":"disabled"}>${FEI.check}${t("fe_afApply",{n:nf(A!.rows.filter(r=>r.on).length)})}</button></footer>`,{wide:true});
}
function feAutofillApply(){const A=FE.af;FE.pv.prov=FE.pv.prov||{};let n=0;A!.rows.filter(r=>r.on&&r.st!=="missing").forEach(r=>{FE.pv.vals[r.fid]=r.val;FE.pv.prov![r.fid]={src:r.src,st:r.st,conf:r.conf};n++});feModalClose();fePvRender();feToast(t("fe_afDone",{n:nf(n)}))}

/* ---------- accessibility check ---------- */
function feLum(hex: string){const c=hex.replace("#","").match(/../g)!.map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function feA11y(){const L=feS!.pv.lang||feCL(),res=[],o=feS!.pv;const cr=(1.05)/(feLum(o.color!)+.05);
  res.push({ok:cr>=4.5,warn:cr>=3&&cr<4.5,t:t("fe_a11yContrast",{x:cr.toFixed(1)})});
  let noLabel=0,longRadio=0,bigTbl=0,req=0,descMiss=0,n=0;feEach(f=>{n++;if(!FE_STATIC.has(f.type)&&f.type!=="group"&&!fv(f.label,L).trim())noLabel++;if(f.type==="select"&&f.disp==="radio"&&(f.opts||[]).length>7)longRadio++;if(f.type==="table"&&(f.tcols||[]).length>5)bigTbl++;if(f.req)req++;if(["bodymap","rom","strength","semantic","matrix"].includes(f.type)&&!f.desc)descMiss++});
  res.push({ok:!noLabel,t:noLabel?t("fe_a11yNoLabel",{n:nf(noLabel)}):t("fe_a11yLabels")});
  res.push({ok:!(req&&!o.reqm),warn:req&&!o.reqm,t:req&&!o.reqm?t("fe_a11yReqHidden"):t("fe_a11yReq")});
  res.push({ok:!longRadio,warn:!!longRadio,t:longRadio?t("fe_a11yLongRadio",{n:nf(longRadio)}):t("fe_a11yRadio")});
  res.push({ok:!bigTbl,warn:!!bigTbl,t:bigTbl?t("fe_a11yBigTable",{n:nf(bigTbl)}):t("fe_a11yTables")});
  res.push({ok:!descMiss,warn:!!descMiss,t:descMiss?t("fe_a11yDesc",{n:nf(descMiss)}):t("fe_a11yDescOk")});
  res.push({ok:true,t:t("fe_a11yKeyboard")});res.push({ok:true,t:t("fe_a11yMotion")});
  const score=Math.round(res.filter(r=>r.ok&&!r.warn).length/res.length*100);
  feModal(feMHead(FEI.eye,t("fe_a11yTitle"),t("fe_a11ySub",{n:nf(n)}))+`<div class="fe-mb"><div class="fe-a11ys"><b>${fePct(score)}</b><span>${t("fe_a11yScore")}</span></div><ul class="fe-a11y">${res.map(r=>`<li class="${r.ok&&!r.warn?"ok":r.warn?"warn":"bad"}">${r.ok&&!r.warn?FEI.check:r.warn?FEI.warn:FEI.x}<span>${FEE(r.t)}</span></li>`).join("")}</ul><p class="fe-mut">${FEI.info}${t("fe_a11yNote")}</p></div>`,{wide:true});
}
/* extra preview options */
{const _po0=fePvOptsHTML;fePvOptsHTML=function(){const o=feS!.pv;const h=_po0();
  const add=`<section class="fe-og"><h5>${t("fe_pvView")}</h5><div class="fe-tgs">${feTg('data-otg="prac"',o.prac,"fe_pvPrac")}${feTg('data-otg="dark"',o.dark,"fe_pvDark")}</div></section><section class="fe-og"><h5>${t("fe_afTitle")}</h5><p class="fe-mut">${t("fe_afShort")}</p><button type="button" class="fe-btn wide" data-afopen>${FEI.wand}${t("fe_afOpen")}</button></section><section class="fe-og"><h5>${t("fe_a11yTitle")}</h5><button type="button" class="fe-btn wide" data-a11y>${FEI.eye}${t("fe_a11yRun")}</button></section>`;
  const i=h.lastIndexOf('<section class="fe-og"><h5>');return h.slice(0,i)+add+h.slice(i)}}
/* share tab: invitation tokens */
{const _sh0=feShareHTML;feShareHTML=function(){const d=feDoc(),tk=d!.share.tokens||[];const h=_sh0();const card=`<section class="fe-card"><h5>${FEI.lock}${t("fe_tokT")}</h5><p class="fe-mut">${t("fe_tokSub")}</p><div class="fe-linkw"><input class="fe-inp" type="number" min="1" max="200" value="10" data-tokn aria-label="${t("fe_tokN")}"><button type="button" class="fe-btn pri sm" data-tokgen>${t("fe_tokGen")}</button>${tk.length?`<button type="button" class="fe-btn sm" data-tokcopy>${FEI.copy}${t("fe_copy")}</button>`:""}</div>${tk.length?`<div class="fe-toks">${tk.slice(0,24).map(x=>`<code class="${x.used?"used":""}">${x.c}</code>`).join("")}${tk.length>24?`<span class="fe-mut">+${nf(tk.length-24)}</span>`:""}</div>`:""}<p class="fe-mut">${t("fe_shInvNote")}</p></section>`;return h.replace(/<\/div><\/div>$/,card+"</div></div>")}}
/* page menu: display condition; section menu: save as reusable block */
{const _pm0=fePageMenu;fePageMenu=function(i,x,y){_pm0(i,x,y);const m=document.querySelector<HTMLInputElement>(".os-menu:last-of-type");if(!m||!i)return;}}
{const _sm0=feSecMenu;feSecMenu=function(sid,x,y){_sm0(sid,x,y);const m=osMenus?.[0];if(!m)return;const r=feFindSec(sid);m.insertAdjacentHTML("beforeend",`<div class="sep" role="separator"></div><button type="button" role="menuitem" class="fe-mi" data-secblk="${sid}"><span class="ic">${FEI.compose}</span><span class="lb">${FEE(t("fe_blkSaveAs"))}</span></button>`)}}
/* ================= Forms: templates for every domain + event wiring for the new features ================= */
FE_TPL.push(["t7","psy","fe_tp7","fe_tpd7"],["t8","physio","fe_tp8","fe_tpd8"],["t9","rehab","fe_tp9","fe_tpd9"],["t10","csat","fe_tp10","fe_tpd10"],["t11","checklist","fe_tp11","fe_tpd11"],["t12","event","fe_tp12","fe_tpd12"]);
{const _md0=feMakeDoc;feMakeDoc=function(kind,title){
  const plans: Record<string, [string, [string, string[]][]][]>={psy:[["fe_pgS",[["fe_wzPsyNow",["mood","emo","psy_stress"]],["fe_wzPsyWeek",["psy_freq","psy_sleep","psy_coping"]]]],["fe_pgC",[["fe_wzPsyGoals",["psy_progress","psy_goal","psy_journal"]],["fe_wzPrac",["privnote"]]]]],
    physio:[["fe_pgC",[["fe_sPat",["patient","sel_pract"]],["fe_wzPain",["bodymap","clinical"]]]],["fe_wzFunc",[["fe_wzFunc",["rom","strength","phy_balance","phy_gait"]],["fe_wzAdl",["phy_adl","phy_device"]]]],["fe_wzPlan",[["fe_wzPlan",["phy_ex","phy_goal"]],["fe_wzPrac",["privnote"]]]]],
    rehab:[["fe_wzProg",[["fe_wzProg",["measure","phy_adherence","psy_progress","clinical"]],["fe_wzAdl",["phy_adl"]]]]],
    csat:[["fe_pgS",[["fe_sExp",["sat","nps","semantic"]],["fe_wzDetails",["likert","rank"]],["fe_fComments",["textarea"]]]]],
    checklist:[["fe_pg1",[["fe_wzCheck",["sel_loc","datetime","yesno","yesno","chips"]],["fe_wzObs",["textarea","file"]],["fe_wzSignoff",["biz_approval"]]]]],
    event:[["fe_pg1",[["fe_sPerso",["text","email","phone","biz_company"]],["fe_wzDetails",["chips","select","yesno"]]]]]};
  const plan=plans[kind];if(!plan)return _md0(kind,title);
  const d=_md0("blank",title);d.sub="fe_dSubGen";d.cat=kind==="csat"||kind==="event"?"surveys":"clinical";d.set.dom={psy:"psy",physio:"physio",rehab:"rehab",csat:"survey",checklist:"checklist",event:"general"}[kind];
  d.pages=plan.map(([pt,secs])=>({id:feId(),title:pt,sections:secs.map(([st,types])=>({id:feId(),title:st,cols:2,fields:types.map(ty=>feNewField(ty))}))}));
  const used=new Set();d.pages.forEach(p=>p.sections.forEach(s=>feWalk(s.fields,f=>{let k=f.key||"champ",n=2;const b=k;while(used.has(k))k=b+"_"+n++;f.key=k;used.add(k)},s,s)));
  if(kind==="physio"){let pain=null as FeField | null,body=null as FeField | null;d.pages.forEach(p=>p.sections.forEach(s=>s.fields.forEach(f=>{if(f.type==="clinical")pain=f;if(f.type==="bodymap")body=f})));if(pain&&body)body.logic={act:"show",mode:"all",conds:[{src:pain.id,op:"gte",val:"1"}]}}
  if(kind==="psy"){const nums: FeField[]=[];d.pages.forEach(p=>p.sections.forEach(s=>s.fields.forEach(f=>{if(["mood","likert","slider"].includes(f.type))nums.push(f)})));const sc=feNewField("score");sc.label="fe_p_psy_sum";sc.items=nums.map(x=>({ref:x.id,w:1}));sc.bands=[{max:6,label:t("fe_bandLow"),tone:"ok"},{max:12,label:t("fe_bandMid"),tone:"warn"},{max:999,label:t("fe_bandHigh"),tone:"bad"}];d.pages[1].sections[0].fields.unshift(sc)}
  return d;
}}
/* ---------- extra events ---------- */
{const _fw0=feWire;feWire=function(R){_fw0(R);
  R.addEventListener("click",e=>{
    const T=tgt(e),c=(s: string)=>T.closest<HTMLInputElement>(s);let b: HTMLInputElement|null;
    if(FE.modal&&T===FE.modal.el){feModalClose();return}
    if(c("[data-mclose]")){feModalClose();return}
    if(b=c("[data-mode]")){feModeGo(b.dataset.mode!);return}
    if(b=c("[data-aisugg]")){const ta=R.querySelector<HTMLInputElement>("[data-aigen]");if(ta){ta.value=b.textContent;ta.focus()}return}
    if(c("[data-aigenbtn]")){const q=R.querySelector<HTMLInputElement>("[data-aigen]")?.value.trim();if(!q){feToast(t("fe_impEmpty"));return}feModalClose();feNewForm("blank");FE.aiCreate=true;setTimeout(()=>feAiRun(q),120);return}
    if(c("[data-composego]")){const ids=[...R.querySelectorAll<HTMLInputElement>("[data-cpick]:checked")].map(x=>x.value);if(!ids.length){feToast(t("fe_pickBlocks"));return}feModalClose();const id="f"+Date.now().toString(36),d=feMakeDoc("blank",t("fe_composeTitle"));d.pages=[{id:feId(),title:"fe_pg1",sections:[]}];feS!.docs[id]=d;feS!.forms.push({id,cat:d.cat,kind:"blank",status:"draft",resp:0,upd:Date.now(),owner:"me"});feS!.ver[id]=[];feS!.cur=id;ids.forEach(bid=>{const g=feBlockInstance(bid);d.pages[0].sections.push({id:feId(),title:g.label,cols:g.cols,fields:[g]})});feSave();feOpenForm(id);feToast(t("fe_composeDone",{n:nf(ids.length)}));return}
    if(b=c("[data-dupgo]")){const nid=feDupForm(b.dataset.dupgo!);feModalClose();if(nid)feOpenForm(nid);return}
    /* wizard */
    if(b=c("[data-wzdom]")){FE.wz!.dom=b.dataset.wzdom!;feWizard();return}
    if(b=c("[data-wzaud]")){FE.wz!.aud=b.dataset.wzaud!;feWizard();return}
    if(b=c("[data-wzlang]")){FE.wz!.lang=b.dataset.wzlang!;feWizard();return}
    if(b=c("[data-wzsecs]")){FE.wz!.secs=+b.dataset.wzsecs!;feWizard();return}
    if(b=c("[data-wzopt]")){const k=b.dataset.wzopt;FE.wz![k!]=!FE.wz![k!];b.setAttribute("aria-checked",FE.wz![k!] as string);return}
    if(c("[data-wzprev]")){FE.wz!.step--;feWizard();return}
    if(c("[data-wznext]")){const g=R.querySelector<HTMLInputElement>("[data-wzgoal]");if(g)FE.wz!.goal=g.value;if(FE.wz!.step<3){FE.wz!.step++;feWizard()}else feWizardBuild();return}
    /* import */
    if(b=c("[data-imptab]")){const src=R.querySelector<HTMLInputElement>("[data-impsrc]");if(src)FE.imp!.src=src.value;FE.imp!.tab=b.dataset.imptab;FE.imp!.rows=null;FE.imp!.json=null;feImportRender();return}
    if(c("[data-impparse]")){FE.imp!.src=R.querySelector<HTMLInputElement>("[data-impsrc]")?.value||"";feImportParse();return}
    if(c("[data-impgo]")){if(!FE.imp!.rows&&FE.imp!.src){feImportParse()}if(FE.imp!.rows)feImportCreate();return}
    /* AI preview */
    if(c("[data-aix]")){FE.aiOps=null;R.querySelector<HTMLInputElement>(".fe-aiprev")?.remove();return}
    if(c("[data-aiapply]")){feAiApplyStaged();return}
    /* left panel */
    if(b=c("[data-lp]")){FE.lp=b.dataset.lp;const P=R.querySelector<HTMLInputElement>(".fe-comps");if(P){P.innerHTML=feCompsHTML();if(!feRM())P.lastElementChild?.animate([{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"none"}],{duration:240})}return}
    if(b=c("[data-ol]")){const fid=b.dataset.ol;const r=feFind(fid);if(r&&r.pi!==FE.page)feSetPage(r.pi);feSelect(fid!,{scroll:true,pulse:true});R.querySelectorAll<HTMLInputElement>("[data-ol]").forEach(x=>x.classList.toggle("on",x.dataset.ol===fid));return}
    if(b=c("[data-olp]")){feSetPage(+b.dataset.olp!);const P=R.querySelector<HTMLInputElement>(".fe-comps");if(P)P.innerHTML=feCompsHTML();return}
    if(b=c("[data-ols]")){const pi=+b.dataset.olpi!;if(pi!==FE.page)feSetPage(pi);setTimeout(()=>{const s=R.querySelector<HTMLInputElement>(`.fe-sec[data-sid="${b!.dataset.ols}"]`);s?.scrollIntoView({block:"start",behavior:feRM()?"auto":"smooth"});if(s&&!feRM())s.animate([{boxShadow:"0 0 0 3px var(--fe-acc)"},{boxShadow:"0 0 0 0 transparent"}],{duration:900})},40);return}
    /* favourites */
    if(b=c("[data-cfav]")){const ty=b.dataset.cfav;feS!.favs=feS!.favs||[];feS!.favs=feS!.favs.includes(ty!)?feS!.favs.filter(x=>x!==ty):[...feS!.favs,ty as string];feSave();if(!feRM())b.animate([{transform:"scale(.6) rotate(-30deg)"},{transform:"scale(1.25)"},{transform:"none"}],{duration:380});const l=R.querySelector<HTMLInputElement>(".fe-clist");if(l&&FE.comp==="fav")l.innerHTML=feCompList();else{b.classList.toggle("on");b.innerHTML=b.classList.contains("on")?FEI.starF:FEI.star}R.querySelector<HTMLInputElement>(".fe-chips.scroll")&&(R.querySelector<HTMLInputElement>(".fe-chips.scroll")!.innerHTML=feChipsHTML());return}
    /* respondent widgets */
    if(b=c("[data-bm]")){const k=b.dataset.k,id=b.dataset.bm;if(!k)return;const cur=Array.isArray(FE.pv.vals[k])?FE.pv.vals[k].slice():[];const i=cur.indexOf(id);if(i>=0)cur.splice(i,1);else cur.push(id);fePvSet(k,null,cur,null);fePvRender();return}
    if(b=c("[data-chip]")){const k=b.dataset.k,v=b.dataset.chip;if(!k||b.disabled)return;const cur=Array.isArray(FE.pv.vals[k])?FE.pv.vals[k].slice():[];const i=cur.indexOf(v);if(i>=0)cur.splice(i,1);else cur.push(v);fePvSet(k,null,cur,null);fePvRender();return}
    if(b=c("[data-str]")){const k=b.dataset.k;if(!k||b.disabled)return;const o=(FE.pv.vals[k]&&typeof FE.pv.vals[k]==="object"?FE.pv.vals[k]:{}) as Bag;fePvSet(k,b.dataset.str,String(o[b.dataset.str!])===b.dataset.n?"":b.dataset.n,null);fePvRender();return}
    if(b=c("[data-repadd]")){const id=b.dataset.repadd,f=feFind(id)?.f;FE.pv.rep=FE.pv.rep||{};FE.pv.rep[id!]=Math.min((FE.pv.rep[id!]||1)+1,+(f?.rmax as number)||5);fePvRender();const inst=R.querySelectorAll<HTMLInputElement>(`.fe-pf[data-u="d"] [data-pf="${id}"] .fe-rinst`);const last=inst[inst.length-1];if(last&&!feRM())last.animate([{opacity:0,transform:"translateY(-8px)"},{opacity:1,transform:"none"}],{duration:300});last?.querySelector<HTMLInputElement>("input,select,textarea")?.focus();return}
    if(b=c("[data-reprm]")){const id=b.dataset.reprm,i=+b.dataset.ri!,n=FE.pv.rep?.[id!]||1;const f=feFind(id)?.f;/* shift values of later instances down */const ids: string[]=[];feWalk(f?.fields||[],x=>{ids.push(x.id)},f,f);for(let j=i;j<n-1;j++)ids.forEach(x=>{const a=x+"#"+j,b2=x+"#"+(j+1);if(FE.pv.vals[b2]!==undefined)FE.pv.vals[a]=FE.pv.vals[b2];else delete FE.pv.vals[a]});ids.forEach(x=>delete FE.pv.vals[x+"#"+(n-1)]);FE.pv.rep![id!]=Math.max(1,n-1);fePvRender();return}
    /* properties: new types */
    if(b=c("[data-psem]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.pts=+b!.dataset.psem!},"canvas");return}
    if(b=c("[data-pcur]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.cur=b!.dataset.pcur},"canvas");return}
    if(b=c("[data-vset]")){const f=feFind(FE.sel)?.f;if(!f)return;const k=b.dataset.vset;feMut(()=>{const s=f.vset||["bp","hr","w","h"];f.vset=s.includes(k!)?s.filter(x=>x!==k):["bp","hr","rr","t","spo2","w","h"].filter(x=>s.includes(x)||x===k)},"canvas");return}
    if(b=c("[data-fxref]")){const ta=R.querySelector<HTMLInputElement>(".fe-fxin");if(!ta)return;const ins="{"+b.dataset.fxref+"}",p=ta.selectionStart??ta.value.length;ta.value=ta.value.slice(0,p)+ins+ta.value.slice(ta.selectionEnd??p);ta.focus();ta.setSelectionRange(p+ins.length,p+ins.length);ta.dispatchEvent(new Event("input",{bubbles:true}));return}
    if(b=c("[data-scmeth]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.meth=b!.dataset.scmeth},"canvas");return}
    if(c("[data-bndadd]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.bands=f.bands||[];const last=f.bands[f.bands.length-1];f.bands.push({max:(+last?.max||0)+5,label:t("fe_bandNew"),tone:"warn"})},"canvas");return}
    if(b=c("[data-bndrm]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.bands!.splice(+b!.dataset.bndrm!,1)},"canvas");return}
    if(b=c("[data-ppriv]")){const f=feFind(FE.sel)?.f;if(!f)return;feMut(()=>{f.priv=b!.dataset.ppriv==="std"?undefined:b!.dataset.ppriv},null);feRepaintField(f.id);R.querySelectorAll<HTMLInputElement>("[data-ppriv]").forEach(x=>x.setAttribute("aria-checked",(x===b) as unknown as string));return}
    if(c("[data-blksave]")){const f=feFind(FE.sel)?.f;if(f)feSaveBlock(f);feRenderProps();return}
    if(c("[data-blkupd]")){const f=feFind(FE.sel)?.f;if(f)feBlockUpdate(f);return}
    if(c("[data-blkign]")){const f=feFind(FE.sel)?.f;const bb=f&&(feS!.blocks||[]).find(x=>x.id===f.blk?.id);if(bb)feMut(()=>{f.blk!.ver=bb.ver},"canvas");feToast(t("fe_blkIgnored"));return}
    if(c("[data-blkunlink]")){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{delete f.blk},"canvas");feToast(t("fe_blkUnlinked"));return}
    if(c("[data-lgadd]")){const f=feFind(FE.sel)?.f;if(f&&!f.logic){const cands=feSrcCands(f);const s=cands.find(x=>(x.opts||[]).length)||cands[0];if(!s){feToast(t("fe_noLogicSrc"));return}feMut(()=>{f.logic={act:"show",mode:"all",conds:[{src:s.id,op:"eq",val:(s.opts||[]).length?"0":""}]}},"canvas");FE.dto!.logic=true;feRenderProps();e.stopImmediatePropagation()}return}
    if(c("[data-lgcadd]")){const f=feFind(FE.sel)?.f;if(!f)return;const g=feLogicNorm(f.logic);const s=feSrcCands(f)[0];feMut(()=>{g!.conds!.push({src:s?.id,op:"filled",val:""});f.logic=g},"canvas");return}
    if(b=c("[data-lgcrm]")){const f=feFind(FE.sel)?.f;if(!f)return;const g=feLogicNorm(f.logic);feMut(()=>{g!.conds!.splice(+b!.dataset.lgcrm!,1);f.logic=g!.conds!.length?g:undefined;if(!g!.conds!.length)delete f.logic},"canvas");return}
    /* page rules (rules tab) */
    if(b=c("[data-pgadd2]")){const pi=+b.dataset.pgadd2!,d=feDoc();const cands: FeField[]=[];d!.pages.slice(0,pi).forEach(p=>p.sections.forEach(s=>feWalk(s.fields,x=>{if(feSrcCands(null).includes(x))cands.push(x)},s,s)));if(!cands.length){feToast(t("fe_pageNoSrc"));return}feMut(dd=>{dd.pages[pi].skip={mode:"all",conds:[{src:cands[0].id,op:(cands[0].opts||[]).length?"eq":"filled",val:(cands[0].opts||[]).length?"0":""}]}},null);feRefresh("tab");return}
    if(b=c("[data-pgrm]")){const pi=+b.dataset.pgrm!;feMut(dd=>{delete dd.pages[pi].skip},null);feRefresh("tab");return}
    if(b=c("[data-pgcadd]")){const pi=+b.dataset.pgcadd!;feMut(dd=>{dd.pages[pi].skip!.conds!.push({...dd.pages[pi].skip!.conds![0],op:"filled",val:""})},null);feRefresh("tab");return}
    {const rm=T.closest<HTMLInputElement>("[data-pgc1rm],[data-pgc2rm],[data-pgc3rm],[data-pgc4rm],[data-pgc5rm],[data-pgc6rm],[data-pgc7rm],[data-pgc8rm]");if(rm){const a=[...rm.attributes].find(x=>/^data-pgc\d+rm$/.test(x.name));const pi=+a!.name.match(/\d+/)![0];feMut(dd=>{dd.pages[pi].skip!.conds!.splice(+a!.value,1);if(!dd.pages[pi].skip!.conds!.length)delete dd.pages[pi].skip},null);feRefresh("tab");return}}
    /* submissions */
    if(b=c("[data-subtab]")){FE.subTab=b.dataset.subtab;feSubOpen(FE.subOpen!);return}
    if(b=c("[data-subact]")){feSubAct(b.dataset.subact!);return}
    /* autofill / a11y */
    if(c("[data-afopen]")){feAutofillSuggest("profile");return}
    if(b=c("[data-afsrc]")){if(b.dataset.afsrc==="doc"){FE.af={src:"doc",rows:[],docName:""};feAutofillModal()}else feAutofillSuggest(b.dataset.afsrc!);return}
    if(c("[data-afapply]")){feAutofillApply();return}
    if(c("[data-a11y]")){feA11y();return}
    /* share tokens */
    if(c("[data-tokgen]")){const n=Math.max(1,Math.min(200,+(R.querySelector<HTMLInputElement>("[data-tokn]")?.value||10)));const al="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",mk=()=>Array.from({length:8},()=>al[Math.floor(Math.random()*al.length)]).join("").replace(/(.{4})/,"$1-");feMut(d=>{d.share.tokens=(d.share.tokens||[]).concat(Array.from({length:n},()=>({c:mk(),used:false})))},null);feRefresh("tab");feToast(t("fe_tokDone",{n:nf(n)}));return}
    if(c("[data-tokcopy]")){feCopy((feDoc()!.share.tokens||[]).map(x=>feLink()+"?t="+x.c).join("\n"),t("fe_tokCopied"));return}
    /* blocks library management */
    if(b=c("[data-blkins]")){const id=b.dataset.blkins;FE.view="editor";FE.tab="editor";feRender(true);feAddField("blk:"+id);return}
    if(b=c("[data-blkdel]")){const id=b.dataset.blkdel,i=feS!.blocks!.findIndex(x=>x.id===id);if(i<0)return;const [old]=feS!.blocks!.splice(i,1);feSave();feRender();feToast(t("fe_blkDeleted",{x:old.name}),()=>{feS!.blocks!.splice(i,0,old);feSave();feRender()});return}
    if(b=c("[data-blkscope]")){const bb=feS!.blocks!.find(x=>x.id===b!.dataset.blkscope);if(bb){bb.scope=b.dataset.v!;feSave();feRender()}return}
  });
  R.addEventListener("dblclick",e=>{const n=tgt(e).closest<HTMLInputElement>("[data-blkname]");if(n){const bb=feS!.blocks!.find(x=>x.id===n.dataset.blkname);feInlineEdit(n,v=>{bb!.name=v;feSave();feRender()})}});
  R.addEventListener("input",e=>{const el=tgt(e),ds=el.dataset;
    if(ds.ptr){const f=feFind(FE.sel)?.f;if(!f)return;if(!FE.snapOn){feSnap();FE.snapOn=true}const L0=feCL();let lab=f.label;if(typeof lab!=="object"||!lab){const o: Dict={};feLangs.forEach(l=>{o[l]=typeof lab==="string"&&lab.startsWith("fe_")?feTx(lab,l):l===L0?(lab as string)||"":""});lab=o}lab[ds.ptr]=el.value;f.label=lab;feDirty();feRepaintField(f.id);return}
    if(ds.p==="label"){const f=feFind(FE.sel)?.f;if(f&&typeof f.label==="object"&&f.label){/* keep translations: write into the content language */setTimeout(()=>{if(typeof f.label==="string"){const v=f.label;f.label=Object.assign({},FE._labObj||{}, {[feCL()]:v});feDirty();feRepaintField(f.id)}},0)}}
    if(ds.p==="expr"){const f=feFind(FE.sel)?.f;const st=feRoot()?.querySelector<HTMLInputElement>("[data-fxst]");if(f&&st){const r=feFormulaEval(el.value,FE.pv.vals);st.className="fe-fxst "+(r.ok?"ok":"err");st.innerHTML=r.ok?FEI.check+t("fe_fxOk"):FEI.x+t("fe_fxErr",{x:r.err!});el.classList.toggle("bad",!r.ok)}}
    if(ds.scw){const f=feFind(FE.sel)?.f;const it=f?.items?.find(x=>x.ref===ds.scw);if(it){if(!FE.snapOn){feSnap();FE.snapOn=true}it.w=+el.value||1;feDirty();feRepaintField(f!.id)}return}
    if(ds.bnd){const f=feFind(FE.sel)?.f;if(!f)return;const [i,k]=ds.bnd.split(".");if(!FE.snapOn){feSnap();FE.snapOn=true}f.bands![+i][k]=k==="max"?+el.value:el.value;feDirty();feRepaintField(f.id);return}
    if(ds.impsrc!==undefined){FE.imp!.src=el.value;return}
  });
  R.addEventListener("focusin",e=>{if(tgt(e).dataset?.p==="label"){const f=feFind(FE.sel)?.f;FE._labObj=f&&typeof f.label==="object"?{...f.label}:null}});
  R.addEventListener("change",e=>{const el=tgt(e),ds=el.dataset;
    if(ds.lgact!==undefined||ds.lgmode!==undefined){const f=feFind(FE.sel)?.f;if(!f)return;const g=feLogicNorm(f.logic);feMut(()=>{if(ds.lgact!==undefined)g!.act=el.value;else g!.mode=el.value;f.logic=g},"canvas");return}
    if(ds.lgc){const f=feFind(FE.sel)?.f;if(!f)return;const g=feLogicNorm(f.logic),[i,k]=ds.lgc.split(".");feMut(()=>{g!.conds![+i][k]=el.value;if(k==="src"){const s=feFind(el.value)?.f;g!.conds![+i].val=(s?.opts||[]).length?"0":""}f.logic=g},"canvas");return}
    {const a=[...el.attributes].find(x=>/^data-pgc\d+$/.test(x.name));if(a){const pi=+a.name.match(/\d+/)![0],[i,k]=a.value.split(".");feMut(d=>{const c2=d.pages[pi].skip!.conds![+i];c2[k]=el.value;if(k==="src"){const s=feFind(el.value)?.f;c2.val=(s?.opts||[]).length?"0":""}},null);feRefresh("tab");return}}
    if(ds.pgmode!==undefined){feMut(d=>{d.pages[+ds.pgmode!].skip!.mode=el.value},null);feRefresh("tab");return}
    if(ds.xv){const f=feFind(FE.sel)?.f;if(!f)return;feMut(()=>{f.xv=f.xv||{};f.xv[ds.xv!]=el.value;if(ds.xv==="op"&&!el.value)delete f.xv;else if(ds.xv==="op"&&!f.xv.ref){const o: { id: string|undefined; }[]=[];feEach(x=>{if(x!==f&&(x.type===f.type||(FE_NUM.has(x.type)&&FE_NUM.has(f.type))))o.push(x)});f.xv.ref=o[0]?.id}},null);FE.dto!.xv=true;feRenderProps();return}
    if(ds.scitem){const f=feFind(FE.sel)?.f;if(!f)return;feMut(()=>{f.items=f.items||[];if(el.checked)f.items.push({ref:ds.scitem!,w:1});else f.items=f.items.filter(x=>x.ref!==ds.scitem)},"canvas");return}
    if(ds.bnd&&el.tagName==="SELECT"){const f=feFind(FE.sel)?.f;if(!f)return;const [i,k]=ds.bnd.split(".");feMut(()=>{f.bands![+i][k]=el.value},"canvas");return}
    if(ds.p==="joint"){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{const mv=Object.keys(FE_ROMJ[el.value]||{});if(!mv.includes(f.move!))f.move=mv[0];f.norm=FE_ROMJ[el.value]?.[f.move!]},"canvas");return}
    if(ds.p==="move"){const f=feFind(FE.sel)?.f;if(f)feMut(()=>{f.norm=FE_ROMJ[f.joint!]?.[el.value]??f.norm},"canvas");return}
    if(["kind","dob"].includes(ds.p!)){feRefresh("canvas");return}
    if(ds.pfs&&["dom","anon","hidePol","ret","aiPol","limit","start","end"].includes(ds.pfs)){feMut(d=>{d.set[ds.pfs!]=el.value},null);return}
    if(ds.impon!==undefined){FE.imp!.rows![+ds.impon].on=el.checked;el.closest<HTMLInputElement>(".fe-impr")!.classList.toggle("off",!el.checked);const g=feRoot()?.querySelector<HTMLInputElement>("[data-impgo]");if(g)g.disabled=!FE.imp!.rows!.some(r=>r.on);return}
    if(ds.imptype!==undefined){FE.imp!.rows![+ds.imptype].type=el.value;return}
    if(ds.impfile!==undefined){const fl=el.files![0];if(!fl)return;const r=new FileReader();r.onload=()=>{FE.imp!.src=String(r.result);feImportParse()};r.readAsText(fl);return}
    if(ds.impdoc!==undefined){const fl=el.files![0];if(!fl)return;const m=FE.modal?.el.querySelector<HTMLInputElement>(".fe-mb");if(m)m.insertAdjacentHTML("beforeend",`<p class="fe-mut fe-busyl">${FEI.refresh}${t("fe_impReading",{x:FEE(fl.name)})}</p>`);
      feDocText(fl).then(({text})=>{const {rows,warn}=feDocToRows(text);FE.imp!.rows=rows;FE.imp!.warn=warn;if(!rows.length)FE.imp!.warn.unshift(t("fe_impNoQ"));feImportRender()}).catch(err=>{FE.imp!.rows=[];FE.imp!.warn=[err.message==="format"?t("fe_impFormat"):t("fe_impLoadErr")];feImportRender()});return}
    if(ds.afon!==undefined){FE.af!.rows[+ds.afon].on=el.checked;const b2=feRoot()?.querySelector<HTMLInputElement>("[data-afapply]");if(b2){const n=FE.af!.rows.filter(r=>r.on).length;b2.disabled=!n;b2.lastChild!.textContent=t("fe_afApply",{n:nf(n)})}return}
    if(ds.afdoc!==undefined){const fl=el.files![0];if(!fl)return;feDocText(fl).then(({text})=>{feAutofillSuggest("doc",text);FE.af!.docName=fl.name;feAutofillModal()}).catch(()=>{feToast(t("fe_impLoadErr"))});return}
  });
  R.addEventListener("keydown",e=>{
    if(FE.modal&&e.key==="Escape"){e.preventDefault();e.stopPropagation();feModalClose();return}
    const bm=tgt(e).closest?.("[data-bm]");if(bm&&(e.key==="Enter"||e.key===" ")){e.preventDefault();bm.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
    if(tgt(e).matches?.("[data-aigen]")&&e.key==="Enter"&&(e.ctrlKey||e.metaKey)){R.querySelector<HTMLInputElement>("[data-aigenbtn]")?.click()}
  });
}}
/* section menu entry (menus live in <body>) */
onDoc("click",e=>{const b=tgt(e).closest<HTMLInputElement>(".os-menu [data-secblk]");if(!b)return;const r=feFindSec(b.dataset.secblk);osMenuCloseAll();if(!r)return;const g=feField("group",r.s.title,{cols:r.s.cols,fields:r.s.fields});feSaveBlock(g,r.s.title)});
{const _ld0=feLoad;feLoad=function(){_ld0();feBlocksEnsure()}}


/* ---------- used by the React window wiring (FormsApp.tsx), the readers (Billing, Patients) and the tests ---------- */
export {
  FE, feS, feLoad, feSave, feWalk, feWalk2, feName, feEntry, feDoc, feOpenForm, feRender, feCommit, feInk, feLastTxt, feRoot, feBody,
  fv, feTx, feField, feNewField, feMakeDoc, feFresh, feSeedMain, feSlug, feUniqKey, feGuessType, feDomOf, feCap, feAiLocal,
  feTok, feParse, feRefs, feFormulaEval, feNumOf, feAgeOf, feScoreOf, feDeps, feValStr, feCond, feCondOne, feLogicNorm, feVis, feVisLeaves,
  feTblRows, feCsvParse, feChartData, feSubSt, feCount, feListForms, feSp, feAutoSp, feBmLabel,
  feEach, feFind, fePvPrefill, fePvValidate, feFldHTML, fePvFld, feCtl, feAutofillSuggest, feA11y, feImportParse,
  FE_T, FE_PRE, FE_TPL, FE_G, FE_WIDE, FE_NUM, FEI, feLoadScript, feBodySVG,
};
