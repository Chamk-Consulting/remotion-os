/** Accounts, statuses and profiles — source L10204–L10223 (values verbatim). Full account menu is task B-11. */
import { STORAGE_KEYS, readJSON } from "@/lib/storage/keys";
export type Account = { id: string; name: string; short: string; role: string; email?: string; ini?: string; bg: string; org?: number; photo?: string };
export const BASE_ACCOUNTS: Account[] = [
  { id: "me", name: "Nassim Ben Nsib", short: "Nassim", role: "adminRole", email: "nassim@remotion.io", ini: "N", bg: "linear-gradient(160deg,#5b6b4f,#2f3a2a)" },
  { id: "clinic", name: "Remotion Clinic", short: "Remotion Clinic", role: "orgAdmin", org: 1, bg: "linear-gradient(135deg,#3fd27a,#16a352)" },
  { id: "dev", name: "Remotion Dev", short: "Remotion Dev", role: "developer", org: 1, bg: "linear-gradient(135deg,#9a5cf7,#6c2bd9)" },
];
export const STATUSES: [string, string, string][] = [["online", "statusOnline", "#22b14c"], ["busy", "statusBusy", "#e23b3b"], ["dnd", "dnd", "#f07a12"], ["away", "statusAway", "#f5b301"], ["invisible", "statusInvisible", "#9aa39e"]];
export const PROFILE_ROLES: Record<string, string> = { admin: "adminRole", therapist: "therapist", reception: "reception", guest: "guest" };
export const PEOPLE_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3.4"/><circle cx="16.8" cy="9" r="2.7" opacity=".85"/><path d="M2.5 20c.5-4 3.3-6.2 6.5-6.2s6 2.2 6.5 6.2z"/><path d="M15.6 14.2c3.3-.4 5.6 1.6 6 5.3h-5" opacity=".85"/></svg>';

export function loadAccountState() {
  const accounts = [...BASE_ACCOUNTS];
  for (const a of readJSON<Account[]>(STORAGE_KEYS.accountsExtra, [])) if (!accounts.some((x) => x.id === a.id)) accounts.push(a);
  let accId = "me", status = "online", prof = "admin";
  const s = readJSON<{ id?: string; status?: string; prof?: string }>(STORAGE_KEYS.account, {});
  if (accounts.some((x) => x.id === s.id)) accId = s.id!;
  if (STATUSES.some((x) => x[0] === s.status)) status = s.status!;
  if (s.prof && s.prof in PROFILE_ROLES) prof = s.prof;
  return { accounts, accId, status, prof };
}
export const roleOf = (a: Account, prof: string) => (a.org ? a.role : PROFILE_ROLES[prof]);
