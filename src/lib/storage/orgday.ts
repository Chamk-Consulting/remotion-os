/** v93 · one time zone: "today" is the organisation's day (Europe/Paris), as in Calendar (CL_ORG_TZ), for Billing, HR and Patients. */
export const ORG_TZ = "Europe/Paris";
let fmt: Intl.DateTimeFormat | null = null;
export function orgToday(ms: number = Date.now()): string {
  try {
    fmt = fmt || new Intl.DateTimeFormat("en-CA", { timeZone: ORG_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    const p: Record<string, string> = {}; fmt.formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}`;
  } catch { const d = new Date(ms); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
}
