/**
 * Data safety, cross-app part (Remotion OS v93, catch-up slice S3; v94 L29402–L29418):
 * - a patient merge moves the merged record's links (appointments, waiting list, practice tasks, billing appointment links)
 *   to the kept record, through the bus event "patient.merged" ({ keep, gone }, ids only);
 * - archiving a patient says what stays linked (upcoming appointments, unpaid invoices);
 * - each app store says how to reload itself when another tab saved it (lib/storage/safety).
 */
import { rmOn } from "@/apps/health/rm";
import { CL, clSt, clSave, clLog, clItems, CL_ACTIVE } from "@/apps/calendar/calendar";
import { PL, plSt, plSave } from "@/apps/planning/planning";
import { CB, cbSt, cbSave } from "@/apps/cabinet/cabinet";
import { BI, biSt, biSave, biBal } from "@/apps/billing/billing";
import { PA, paSt, paSetArchiveNote } from "@/apps/patients/patients";
import { HR, hrSt } from "@/apps/hr/hr";
import { sdOnReload } from "@/lib/storage/safety";
import { L4 as L4core } from "@/lib/i18n/core";
import { isLang } from "@/lib/i18n/langs";

const L4 = (s: string) => { const h = document.documentElement.lang; return L4core(isLang(h) ? h : "en", s); };

/** Points every `pid === gone` to `keep` (and records mergedFrom); `skip` = keys left untouched (snapshots, audit). */
export function sdRelink(o: unknown, gone: string, keep: string, skip?: string[]): number {
  let n = 0;
  const walk = (x: unknown, d: number) => {
    if (!x || typeof x !== "object" || d > 8) return;
    if (Array.isArray(x)) { x.forEach((y) => walk(y, d + 1)); return; }
    const r = x as Record<string, unknown>;
    for (const k of Object.keys(r)) { if (skip && skip.includes(k)) continue; if (k === "pid" && r[k] === gone) { r[k] = keep; r.mergedFrom = gone; n++; } else if (r[k] && typeof r[k] === "object") walk(r[k], d + 1); }
  };
  walk(o, 0);
  return n;
}

/** The sentence added to the archive confirmation: what stays linked to the record. */
export function sdArchiveNote(pid: string): string {
  try {
    const now = Date.now();
    const fut = clItems(now, now + 730 * 864e5).filter((a) => a.pid === pid && CL_ACTIVE(a.status)).length;
    const ids = new Set(clSt().appts.filter((a) => a.pid === pid).map((a) => a.id));
    const unpaid = biSt().invoices.filter((i) => (i as { appt?: string }).appt && ids.has((i as { appt: string }).appt) && biBal(i) > 0).length;
    if (!fut && !unpaid) return "";
    return " " + L4(`Restent liés à ce dossier : ${fut} rendez-vous à venir (Agenda) et ${unpaid} facture(s) non soldée(s) (Facturation). L’archivage ne les modifie pas.|Still linked to this record: ${fut} upcoming appointment(s) (Calendar) and ${unpaid} unpaid invoice(s) (Billing). Archiving does not change them.|Weiterhin mit dieser Akte verknüpft: ${fut} kommende Termin(e) (Kalender) und ${unpaid} offene Rechnung(en) (Abrechnung). Die Archivierung ändert sie nicht.|لا يزال مرتبطًا بهذا الملف: ${fut} موعد قادم (التقويم) و${unpaid} فاتورة غير مسددة (الفوترة). لا تغيّرها الأرشفة.`);
  } catch { return ""; }
}

let done = false;
export function installDataLinks() {
  if (done || typeof window === "undefined") return; done = true;
  rmOn("patient.merged", "data-links", (ev) => {
    const p = ev.p as { keep?: string; gone?: string }; const keep = p && p.keep, gone = p && p.gone; if (!keep || !gone) return; let tot = 0;
    try { const S = clSt(); const n = sdRelink(S.appts, gone, keep); if (n) { tot += n; clLog("appt.relink", keep, n + " ← " + gone); clSave(true); } } catch { /* app store unavailable */ }
    try { const S = plSt(); const n = sdRelink(S.wait, gone, keep); if (n) { tot += n; plSave(); } } catch { /* idem */ }
    try { const S = cbSt(); const n = sdRelink(S, gone, keep); if (n) { tot += n; cbSave(); } } catch { /* idem */ }
    try { const S = biSt(); const n = sdRelink(S, gone, keep, ["snap", "audit"]); if (n) { tot += n; biSave(true); } } catch { /* idem */ }
    return tot;
  });
  paSetArchiveNote(sdArchiveNote);
  sdOnReload("remotion-patients", () => { PA.st = null; paSt(); });
  sdOnReload("remotion-calendar", () => { CL.st = null; clSt(); });
  sdOnReload("remotion-billing", () => { BI.st = null; biSt(); });
  sdOnReload("remotion-cabinet", () => { CB.st = null; cbSt(); });
  sdOnReload("remotion-planning", () => { PL.st = null; plSt(); });
  sdOnReload("remotion-hr", () => { HR.st = null; hrSt(); });
}
