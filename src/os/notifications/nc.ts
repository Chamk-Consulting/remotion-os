"use client";
/**
 * Notification centre state and actions (B-10) — source L9926–L10197. Seed items, kinds, priorities, categories,
 * `remotion-nc` settings, read / snooze / delete with undo, fake update install, banners, chime, reminders, pushNc.
 */
import { create } from "zustand";
import { readJSON, writeJSON } from "@/lib/storage/keys";
import { translate } from "@/lib/i18n/core";
import { isLang, LANGS } from "@/lib/i18n/langs";
import { useShell } from "@/os/state/shell";
import { osActions } from "@/os/actions";
import { accHooks, setStatus } from "@/os/account/store";
import raw from "./data.json";

export const NI = raw.NI as Record<string, string>;
export type Kind = { cat: string; bg: string; ic: string; act: string; primary: string; second: string; run?: (n: NcItem) => void };
export const NC_KIND: Record<string, Kind> = JSON.parse(JSON.stringify(raw.NC_KIND));
export const PRI = raw.PRI as string[];
export const PRI_KEY = raw.PRI_KEY as Record<string, string>;
export const CATS = raw.CATS as string[];
export const TODAY_EVENTS = raw.TODAY_EVENTS as [string, number, number, number, number][];

/** Helpers handed to item text/field functions (the source closures call the global t / fmtT / money …). */
export type X = { t: (k: string, v?: Record<string, string | number>) => string; nf: (n: number) => string; fmtT: (ms: number | Date) => string; fmtD: (ms: number | Date) => string; money: (v: number) => string; dayLabel: (ms: number) => string };
type Txt = string | ((n: NcItem, x: X) => string);
export type Field = [ic: string, label: string, value: string, raw?: 1];
export type NcItem = { id: number; kind: string; pri: string; t: Txt; s: Txt; d: Txt; at: number; unread: boolean; f: (n: NcItem, x: X) => Field[]; snoozed?: boolean; installed?: boolean; busy?: boolean; open?: (() => void) | null };

const lang = () => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
export function helpers(): X {
  const L = lang(), loc = LANGS[L].locale, t = (k: string, v?: Record<string, string | number>) => translate(L, k, v), nf = (n: number) => new Intl.NumberFormat(loc).format(n);
  const fmtT = (ms: number | Date) => new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" }).format(ms);
  const fmtD = (ms: number | Date) => new Intl.DateTimeFormat(loc, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(ms);
  const money = (v: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(v);
  return { t, nf, fmtT, fmtD, money, dayLabel: (ms) => dayLabel(ms, t, loc) };
}
export const dayKey = (ms: number | Date) => { const d = new Date(ms); return d.getFullYear() * 1e4 + d.getMonth() * 100 + d.getDate(); };
export function dayLabel(ms: number, t: X["t"], loc: string) { const n = new Date(), y = new Date(); y.setDate(n.getDate() - 1); const k = dayKey(ms); return k === dayKey(n) ? t("today") : k === dayKey(y) ? t("grpYesterday") : new Intl.DateTimeFormat(loc, { month: "short", day: "numeric" }).format(ms); }
export function ago(ms: number, x: X) {
  const L = LANGS[lang()].locale, s = (Date.now() - ms) / 1000, rtf = new Intl.RelativeTimeFormat(L, { numeric: "auto" });
  if (s < 60) return x.t("justNow"); if (s < 3600) return rtf.format(-Math.round(s / 60), "minute"); if (s < 12 * 3600) return rtf.format(-Math.round(s / 3600), "hour");
  return `${x.dayLabel(ms)}, ${x.fmtT(ms)}`;
}
export const txt = (v: Txt, n: NcItem, x: X) => (typeof v === "function" ? v(n, x) : x.t(v));

const atYesterday = (h: number, m: number) => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(h, m, 0, 0); return d.getTime(); };
/** Seed list NCS (L9976), relative to the boot time like the source's NOW0. */
function seed(): NcItem[] {
  const NOW0 = Date.now(); const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const rec = (n: NcItem, x: X) => `${x.dayLabel(n.at)}, ${x.fmtT(n.at)}`;
  return [
    { id: 1, kind: "appt", pri: "critical", t: "n1t", s: "n1s", d: "n1d", at: NOW0 - 10 * 60e3, unread: true, f: (n, x) => [["date", "fDate", x.fmtD(n.at + 10 * 60e3)], ["clock", "fTime", `${x.fmtT(n.at + 10 * 60e3)} – ${x.fmtT(n.at + 40 * 60e3)} (${x.t("minDur", { n: x.nf(30) })})`], ["pin", "fLocation", NI.video + esc(x.t("mainRoomVideo")), 1], ["group", "fParticipants", NI.group + esc(x.t("participantsN", { n: x.nf(5) })), 1]] },
    { id: 2, kind: "msg", pri: "high", t: "n2t", s: "n2s", d: "n2d", at: NOW0 - 45 * 60e3, unread: true, f: (n, x) => [["user", "fFrom", "Dr. Sarah"], ["clock", "fReceived", rec(n, x)]] },
    { id: 3, kind: "doc", pri: "normal", t: "n3t", s: "n3s", d: "n3d", at: NOW0 - 2 * 3600e3, unread: true, f: (n, x) => [["file", "fFile", "Clinical Guide.pdf"], ["user", "fSharedBy", "Dr. Ahmed Benali"], ["clock", "fReceived", rec(n, x)]] },
    { id: 4, kind: "patient", pri: "low", t: "n4t", s: (_n, x) => "Amine Trabelsi · " + x.t("mainClinic"), d: "n4d", at: NOW0 - 3 * 3600e3, unread: false, f: (n, x) => [["user", "fPatient", "Amine Trabelsi"], ["pin", "fClinic", x.t("mainClinic")], ["clock", "fReceived", rec(n, x)]] },
    { id: 5, kind: "backup", pri: "normal", t: "n5t", s: "n5s", d: "n5s", at: NOW0 - 5 * 3600e3, unread: false, f: (n, x) => [["check", "fStatus", x.t("completed")], ["clock", "fReceived", rec(n, x)]] },
    { id: 6, kind: "pay", pri: "high", t: "n6t", s: (_n, x) => `${x.t("fInvoice")} #INV-2026-1023 · ${x.money(120)}`, d: "n6d", at: atYesterday(18, 24), unread: false, f: (_n, x) => [["tag", "fInvoice", "#INV-2026-1023"], ["money", "fAmount", x.money(120)], ["check", "fStatus", x.t("paid")]] },
    { id: 7, kind: "update", pri: "low", t: "n7t", s: "n7s", d: "n7s", at: atYesterday(14, 2), unread: false, f: (n, x) => [["tag", "infoVersion", "Remotion OS v2.4.1"], ["check", "fStatus", x.t(n.installed ? "updateInstalled" : "readyInstall")]] },
  ];
}
export type NcSet = { dnd: boolean; quiet: boolean; sound: boolean; desk: boolean };
export type Banner = { key: number; n: NcItem; gone: boolean };
type S = {
  items: NcItem[]; set: NcSet; open: boolean; pri: string; cat: string; q: string; sel: number | null;
  dsel: number | null; ever: boolean; wide: boolean; detailOpen: boolean; catsMore: boolean; setCollapsed: boolean; rev: number; detailSwap: number;
  pop: { rect: DOMRect; items: [label: string, ic: string, cls: string, run: () => void][] } | null; banners: Banner[]; ring: number;
};
export const useNc = create<S>(() => ({ items: [], set: { dnd: false, quiet: true, sound: true, desk: true }, open: false, pri: "all", cat: "all", q: "", sel: 1, dsel: 1, ever: false, wide: false, detailOpen: false, catsMore: false, setCollapsed: false, rev: 0, detailSwap: 0, pop: null, banners: [], ring: 0 }));
let nextId = 100, booted = false;
const g = () => useNc.getState();
const bump = () => useNc.setState((s) => ({ items: [...s.items], rev: s.rev + 1 }));
const tt = (k: string, v?: Record<string, string | number>) => translate(lang(), k, v);
export const saveNc = () => writeJSON("remotion-nc", g().set);

/* item kinds' primary action (NC_KIND[k].run, L9955) */
const RUN: Record<string, (n: NcItem) => void> = {
  appt: () => toast(tt("opened", { x: tt("telehealth") })), msg: () => toast(tt("notInPreview", { x: tt("reply") })), doc: () => toast(tt("opened", { x: tt("docs") })),
  patient: () => toast(tt("opened", { x: tt("patients") })), backup: () => toast(tt("notInPreview", { x: tt("viewBackup") })), pay: () => toast(tt("opened", { x: tt("billing") })), update: (n) => installUpdate(n),
};
const toast = (m: string, undo?: () => void) => useShell.getState().showToast(m, undo);

export function ncFiltered(s = g(), x = helpers()) {
  const q = norm(s.q.trim());
  return s.items.filter((n) => !n.snoozed && (s.pri === "all" || (s.pri === "unread" ? n.unread : n.pri === s.pri)) && (s.cat === "all" || NC_KIND[n.kind].cat === s.cat) && (!q || norm(txt(n.t, n, x) + " " + txt(n.s, n, x)).includes(q))).sort((a, b) => b.at - a.at);
}
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const unreadCount = () => g().items.filter((n) => !n.snoozed && n.unread).length;

/* list FLIP (renderNcList(flip)): rows' tops are measured before the change and animated after the commit */
export const flip: { before: Map<string, number> | null } = { before: null };
const measure = () => { flip.before = new Map([...document.querySelectorAll<HTMLElement>("#ncScroll .ni")].map((el) => [el.dataset.id!, el.getBoundingClientRect().top])); };
const listChanged = () => { measure(); bump(); };

/** renderNcDetail(true): the card shows the current selection and replays its swap animation. */
export const swapDetail = () => useNc.setState((s) => ({ dsel: s.sel, detailSwap: s.detailSwap + 1 }));
export function selectNc(id: number) {
  if (g().sel === id) { useNc.setState({ detailOpen: true }); return; }
  document.querySelectorAll("#ncDetail > *").forEach((c) => c.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-4px)" }], { duration: 110, fill: "forwards" }));
  useNc.setState({ sel: id, detailOpen: true });
  setTimeout(() => swapDetail(), 110);
}
export function setRead(id: number, v: boolean) {
  const n = g().items.find((x) => x.id === id); if (!n || n.unread === !v) return; n.unread = !v; bump();
  if (g().pri === "unread" && !n.unread) setTimeout(() => removeAnim(id, listChanged), 250);
}
function removeAnim(id: number, after: () => void) {
  const el = document.querySelector<HTMLElement>(`#ncScroll .ni[data-id="${id}"]`); if (!el) { after(); return; }
  el.classList.add("out");
  setTimeout(() => { el.animate([{ height: el.offsetHeight + "px" }, { height: "0px", paddingTop: 0, paddingBottom: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" }).finished.then(after); }, 300);
}
const firstId = () => ncFiltered()[0]?.id ?? null;
export function deleteNc(id: number) {
  const i = g().items.findIndex((x) => x.id === id); if (i < 0) return; const n = g().items[i];
  removeAnim(id, () => { measure(); const items = g().items; items.splice(items.indexOf(n), 1); if (g().sel === id) useNc.setState({ sel: firstId() }); swapDetail(); bump(); });
  toast(tt("deleted"), () => { measure(); g().items.splice(i, 0, n); bump(); });
}
export function snoozeNc(id: number) {
  const n = g().items.find((x) => x.id === id); if (!n) return;
  removeAnim(id, () => { measure(); n.snoozed = true; if (g().sel === id) useNc.setState({ sel: firstId() }); swapDetail(); bump(); });
  setTimeout(() => { n.snoozed = false; n.at = Date.now(); n.unread = true; if (g().open) measure(); bump(); showBanner(n); }, 3600e3);
  toast(tt("snoozed"), () => { measure(); n.snoozed = false; bump(); });
}
export function installUpdate(n: NcItem) {
  if (n.installed) { osActions.restart(); return; }
  if (n.busy) return; n.busy = true; bump();
  setTimeout(() => { n.busy = false; n.installed = true; setRead(n.id, true); bump(); if (g().sel === n.id) swapDetail(); toast(tt("updateInstalled")); }, 2400);
}
export function runPrimary(id: number) { const n = g().items.find((x) => x.id === id); if (!n) return; if (n.kind !== "update") setRead(id, true); (NC_KIND[n.kind].run || RUN[n.kind])?.(n); }

export function ncPop(anchor: Element, items: NonNullable<S["pop"]>["items"]) { useNc.setState({ pop: { rect: anchor.getBoundingClientRect(), items } }); }
export const closeNcPop = () => { if (g().pop) useNc.setState({ pop: null }); };
export function itemMenu(anchor: Element, id: number) {
  const n = g().items.find((x) => x.id === id)!;
  ncPop(anchor, [[tt(n.unread ? "markRead" : "markUnread"), NI.check, "", () => setRead(id, n.unread)], [tt("snooze"), NI.clock, "", () => snoozeNc(id)], [tt("del"), NI.x, "danger", () => deleteNc(id)]]);
}
export function markAll() { const was = g().items.filter((n) => n.unread).map((n) => n.id); was.forEach((id) => setRead(id, true)); if (was.length) toast(tt("allRead"), () => { was.forEach((id) => setRead(id, false)); }); }
export function clearRead() {
  const gone = g().items.filter((n) => !n.unread && !n.snoozed); if (!gone.length) return;
  gone.forEach((n) => document.querySelector(`#ncScroll .ni[data-id="${n.id}"]`)?.classList.add("out"));
  setTimeout(() => { measure(); useNc.setState((s) => ({ items: s.items.filter((n) => n.unread || n.snoozed) })); if (!g().items.find((n) => n.id === g().sel)) useNc.setState({ sel: firstId() }); swapDetail(); bump(); }, 380);
  toast(tt("clearRead"), () => { measure(); g().items.push(...gone); bump(); });
}

/* open / close (L10109) */
export const ncApi: { closeSearch: () => void } = { closeSearch: () => {} };
export function openNc() {
  if (g().open) return; useShell.getState().closeAll(); ncApi.closeSearch();
  useNc.setState((s) => ({ open: true, ever: true, detailOpen: false, dsel: s.sel })); bump();
  setTimeout(() => document.querySelector<HTMLElement>("#ncScroll .ni.is-sel, #ncScroll .ni")?.focus({ preventScroll: true }), 120);
}
export function closeNc() { if (!g().open) return; useNc.setState({ open: false, pop: null }); }
export const ringBell = () => useNc.setState((s) => ({ ring: s.ring + 1 }));

/* settings + DND ↔ account status (L10153, L10351) */
export function toggleSetting(k: keyof NcSet) {
  const set = { ...g().set, [k]: !g().set[k] }; useNc.setState({ set }); saveNc();
  if (k === "sound" && set.sound) chime();
  if (k === "desk" && set.desk) { const n = g().items.find((x) => x.unread && !x.snoozed) || g().items[0]; if (n) showBanner(n, true); }
  if (k === "dnd") { toast(tt(set.dnd ? "dndOn" : "dndOff")); setStatus(set.dnd ? "dnd" : "online", { fromNc: true, quiet: true }); }
}
accHooks.dndSync = (want) => { if (g().set.dnd !== want) { useNc.setState({ set: { ...g().set, dnd: want } }); saveNc(); } };

/* sound + desktop banners (L10162) */
let actx: AudioContext | null = null;
export function chime() {
  try {
    actx = actx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); const n0 = actx.currentTime;
    ([[880, 0], [1318.5, .12]] as const).forEach(([f, d]) => { const o = actx!.createOscillator(), gn = actx!.createGain(); o.type = "sine"; o.frequency.value = f; gn.gain.setValueAtTime(.0001, n0 + d); gn.gain.exponentialRampToValueAtTime(.08, n0 + d + .02); gn.gain.exponentialRampToValueAtTime(.0001, n0 + d + .5); o.connect(gn).connect(actx!.destination); o.start(n0 + d); o.stop(n0 + d + .55); });
  } catch {}
}
const inQuiet = () => { if (!g().set.quiet) return false; const h = new Date().getHours(); return h >= 22 || h < 7; };
let bannerKey = 0;
export function showBanner(n: NcItem, force?: boolean) {
  const s = g().set; const silenced = (s.dnd || inQuiet()) && n.pri !== "critical";
  if (!force && (silenced || !s.desk)) return;
  if (s.sound && !silenced) chime();
  // Newest first, at most three (st.prepend + remove the last).
  useNc.setState((x) => ({ banners: [{ key: ++bannerKey, n, gone: false }, ...x.banners].slice(0, 3) }));
  ringBell();
}
export const killBanner = (key: number) => { useNc.setState((x) => ({ banners: x.banners.map((b) => (b.key === key ? { ...b, gone: true } : b)) })); setTimeout(() => useNc.setState((x) => ({ banners: x.banners.filter((b) => b.key !== key) })), 360); };

/** pushNc (L10183): the API apps use to post a notification. */
export function pushNc(n: Partial<NcItem> & { kind: string }, kind?: Kind) {
  if (kind && !NC_KIND[n.kind]) NC_KIND[n.kind] = kind;
  const it = n as NcItem; it.id = nextId++; it.at = it.at || Date.now(); it.unread = true;
  if (g().open) measure(); useNc.setState((s) => ({ items: [it, ...s.items] })); bump(); showBanner(it);
}

/* reminders 10 minutes before each Today event (L10185) */
const reminded = new Set<string>();
function checkReminders() {
  const now = new Date();
  TODAY_EVENTS.forEach(([k, h, m, eh, em]) => {
    const st = new Date(); st.setHours(h, m, 0, 0); const mins = (+st - +now) / 60000, key = dayKey(now) + k;
    if (mins > 0 && mins <= 10 && !reminded.has(key)) {
      reminded.add(key); const en = new Date(); en.setHours(eh, em, 0, 0);
      pushNc({ kind: "appt", pri: k === "ev2" ? "critical" : "high", t: (_n, x) => x.t("remT", { x: x.t(k), n: x.nf(Math.ceil(mins)) }), s: (_n, x) => `${x.fmtT(st)} – ${x.fmtT(en)}`, d: (_n, x) => x.t("remD", { x: x.t(k) }), f: (_n, x) => [["date", "fDate", x.fmtD(st)], ["clock", "fTime", `${x.fmtT(st)} – ${x.fmtT(en)}`]] });
    }
  });
}
export function bootNc() {
  if (booted) return; booted = true;
  useNc.setState({ items: seed(), set: { dnd: false, quiet: true, sound: true, desk: true, ...readJSON<Partial<NcSet>>("remotion-nc", {}) } });
  setInterval(checkReminders, 30000); setTimeout(checkReminders, 2000);
  (window as unknown as { __remotionPushNc: typeof pushNc }).__remotionPushNc = pushNc;
}
