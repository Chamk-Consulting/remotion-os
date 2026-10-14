"use client";
/**
 * Account state (B-11) — source L10199–L10408: accounts (+ `remotion-accs-extra`), current account / status / profile
 * (`remotion-acc`), organisation units (`remotion-units`), auto-away. Tables extracted from the source
 * (tools/extract-nc-acc-data.mjs).
 */
import { create } from "zustand";
import { readJSON, STORAGE_KEYS, writeJSON } from "@/lib/storage/keys";
import { translate } from "@/lib/i18n/core";
import { isLang } from "@/lib/i18n/langs";
import { useShell } from "@/os/state/shell";
import raw from "./data.json";

export type Account = { id: string; name: string; short?: string; role: string; email?: string; ini?: string; bg: string; org?: number; photo?: string };
export type Unit = { id: string; city: string; kind: string; addr: string; depts: [string, string, number][] };
export const AI = raw.AI as Record<string, string>;
export const UNI = raw.UNI as Record<string, string>;
export const STATUSES = raw.STATUSES as [string, string, string][];
export const PROFILES = raw.PROFILES as { id: string; role: string; bg: string; ic: string }[];
const ORG_UNITS = raw.ORG_UNITS as unknown as Record<string, Unit[]>;

type S = {
  accounts: Account[]; accId: string; status: string; autoAway: boolean; prof: string; unitSel: Record<string, { s: string; d: string }>;
  open: boolean; view: { v: string; n: number } | null; rev: number;
};
function load(): Omit<S, "open" | "view" | "rev"> {
  const accounts: Account[] = JSON.parse(JSON.stringify(raw.ACCOUNTS));
  for (const a of readJSON<Account[]>(STORAGE_KEYS.accountsExtra, [])) if (!accounts.some((x) => x.id === a.id)) accounts.push(a);
  let accId = "me", status = "online", prof = "admin";
  const a = readJSON<{ id?: string; status?: string; prof?: string }>(STORAGE_KEYS.account, {});
  if (accounts.some((x) => x.id === a.id)) accId = a.id!; if (STATUSES.some((x) => x[0] === a.status)) status = a.status!; if (PROFILES.some((x) => x.id === a.prof)) prof = a.prof!;
  return { accounts, accId, status, prof, autoAway: false, unitSel: readJSON<Record<string, { s: string; d: string }>>("remotion-units", {}) || {} };
}
export const useAccount = create<S>(() => ({ accounts: [], accId: "me", status: "online", autoAway: false, prof: "admin", unitSel: {}, open: false, view: null, rev: 0 }));
let booted = false;
export function bootAccount() { if (booted) return; booted = true; useAccount.setState(load()); }

const st = () => useAccount.getState();
const tt = (k: string, v?: Record<string, string | number>) => { const h = document.documentElement.lang; return translate(isLang(h) ? h : "en", k, v); };
export const saveAcc = () => { const s = st(); writeJSON(STORAGE_KEYS.account, { id: s.accId, status: s.status, prof: s.prof }); };
export const curAcc = () => st().accounts.find((a) => a.id === st().accId)!;
export const roleOf = (x: Account) => (x.org ? x.role : PROFILES.find((p) => p.id === st().prof)!.role);
export const stOf = (s: string) => STATUSES.find((x) => x[0] === s)!;
export const homeOrg = (a?: Account) => { a = a || curAcc(); if (a.org) return a; return st().accounts.find((x) => x.id === "o" + a!.id) || st().accounts.find((x) => x.id === "clinic")!; };
export const unitsOf = (o: Account): Unit[] => ORG_UNITS[o.id] || [{ id: "main", city: o.name, kind: "site_main", addr: "", depts: [["general", "#22b14c", 1], ["admin", "#7c8581", 1]] }];
export function curUnit(o?: Account) { o = o || homeOrg(); const us = unitsOf(o), sel = st().unitSel[o.id] || ({} as { s?: string; d?: string }); const s = us.find((x) => x.id === sel.s) || us[0], d = s.depts.find((x) => x[0] === sel.d) || s.depts[0]; return { site: s, dept: d }; }

/** Restart the CSS animation of `cls` on every element matching `sel` (the source's remove / reflow / add). */
export function replay(sel: string, cls: string) { document.querySelectorAll<HTMLElement>(sel).forEach((d) => { d.classList.remove(cls); void d.offsetWidth; d.classList.add(cls); }); }

/** Hook set by the notification centre: keep its Do-not-disturb switch in step with the status. */
export const accHooks: { dndSync: (on: boolean) => void } = { dndSync: () => {} };
/** setStatus (L10343). */
export function setStatus(s: string, opt: { auto?: boolean; quiet?: boolean; fromNc?: boolean } = {}) {
  const changed = s !== st().status; useAccount.setState({ status: s, autoAway: !!opt.auto }); saveAcc();
  if (changed) requestAnimationFrame(() => replay(".st-dot", "pop"));
  if (!opt.fromNc) accHooks.dndSync(s === "dnd");
  if (!opt.quiet) useShell.getState().showToast(tt("statusSet", { x: tt(stOf(s)[1]) }));
}
/** renderWho(true): the who-text swap animation. */
export const whoSwap = () => requestAnimationFrame(() => replay("#whoTxt", "swap"));

/* auto-away after 5 minutes without activity (L10399) */
let idleT: ReturnType<typeof setTimeout> | null = null, last = 0;
export function bumpActivity() {
  if (st().autoAway) setStatus("online", { quiet: true });
  if (idleT) clearTimeout(idleT); idleT = setTimeout(() => { if (st().status === "online") setStatus("away", { auto: true, quiet: true }); }, 5 * 60e3);
}
export function startAutoAway() {
  const on = () => { if (!idleT || st().autoAway || Date.now() - last > 2000) { last = Date.now(); bumpActivity(); } };
  ["pointerdown", "keydown", "pointermove", "wheel"].forEach((ev) => addEventListener(ev, on, { passive: true }));
  bumpActivity();
  return () => ["pointerdown", "keydown", "pointermove", "wheel"].forEach((ev) => removeEventListener(ev, on));
}
