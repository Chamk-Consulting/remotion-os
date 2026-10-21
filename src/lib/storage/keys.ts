/**
 * The 40 localStorage keys + 1 IndexedDB database of the source (doc 06 §1).
 * Rule (ADR-05, test S-2): the target must not create any other key. Names and JSON shapes are unchanged.
 */
export const STORAGE_KEYS = {
  // A · shell core
  lang: "remotion-lang", desks: "remotion-desks", kb: "remotion-kb", customShortcuts: "remotion-custom-sc", lock: "remotion-lk",
  signIn: "remotion-si", notifications: "remotion-nc", account: "remotion-acc", accountsExtra: "remotion-accs-extra",
  units: "remotion-units", theme: "remotion-theme",
  // B · AI, desktop, OS layer, window manager
  ai: "remotion-ai", trash: "remotion-trash", dkV1: "remotion-dk-v1", dkV2: "remotion-dk-v2", dkView: "remotion-dkview",
  fs: "remotion-fs", apps: "remotion-apps", rail: "remotion-rail", wsDesks: "remotion-ws-desks",
  // C · Forms
  forms: "remotion-forms", dkV3: "remotion-dk-v3",
  // D · Documents
  docs: "remotion-docs", docsExport: "remotion-docs-xp", docsLiveMode: "remotion-dc-lvmode",
  // E · Calculator
  calc: "remotion-calc", dkCalc: "remotion-dk-calc1",
  // F · Billing
  billing: "remotion-billing", dkBill: "remotion-dk-bill1",
  // G · HR
  hr: "remotion-hr", dkHr: "remotion-dk-hr1",
  // H · Healthcare
  bus: "remotion-bus", shared: "remotion-shared", patients: "remotion-patients", dkPa: "remotion-dk-pa1",
  calendar: "remotion-calendar", cabinet: "remotion-cabinet", dkCb: "remotion-dk-cb1", planning: "remotion-planning", dkPl: "remotion-dk-pl1",
} as const;
export const INDEXED_DB = { name: "remotion-docs-live", version: 1, store: "b" } as const;
/**
 * Keys and databases added by the Documents product work (after parity, so outside the 40 source keys above).
 * - docsStore: the documents store moved out of localStorage "remotion-docs" (migrated once, then removed) — see apps/documents/store.ts
 * - docsPrintHf: the print centre's custom header/footer preference
 */
export const PRODUCT_STORAGE_KEYS = { docsPrintHf: "remotion-docs-xp-hf" } as const;
export const PRODUCT_INDEXED_DB = { docsStore: { name: "remotion-docs-store", version: 1, store: "kv", keys: ["store", "rev"] } } as const;
export const PRODUCT_CHANNELS = { docsStore: "remotion-docs-store" } as const;
export const ALL_STORAGE_KEYS: readonly string[] = Object.values(STORAGE_KEYS);

/** Safe JSON read with the source's tolerant behaviour (try/catch, fallback). */
export function readJSON<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s == null ? fallback : (JSON.parse(s) as T); } catch { return fallback; }
}
/** Write that, like the source, never throws (quota errors are swallowed: defects D-H01/D-D02/D-F13 reproduced). */
export function writeJSON(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
/** Subscribe to cross-window changes of one key (pop-outs, legacy bridge). */
export function onStorageKey(key: string, cb: (e: StorageEvent) => void) {
  const h = (e: StorageEvent) => { if (e.key === key) cb(e); };
  window.addEventListener("storage", h);
  return () => window.removeEventListener("storage", h);
}
