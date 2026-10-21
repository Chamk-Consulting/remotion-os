/**
 * Documents store — product phase 1 ("storage you can trust").
 *
 * The documents store used to live in localStorage ("remotion-docs"), shared with every other OS app inside a ≈5 MB
 * quota: one large Word import or photo filled it, and saves then failed silently (defect D-D02). It now lives in
 * IndexedDB (database "remotion-docs-store", object store "kv"), whose quota is a share of the disk.
 *
 * - The JSON shape of the store is unchanged; only where it is kept changes.
 * - First run: the existing localStorage copy is moved into IndexedDB, then removed from localStorage.
 * - The store is read once (preloadStore) before the editor opens, and kept in memory; dcLoad stays synchronous.
 * - Every write reports success or failure, so the editor can show "Not saved" instead of pretending.
 * - Other tabs are told about each successful write over a BroadcastChannel, with a revision number, so an open editor
 *   can offer "load the other version / keep mine" instead of silently overwriting (defect D-D08).
 * - Where IndexedDB does not exist (unit tests in happy-dom, very old browsers) it falls back to localStorage.
 */
export const DOCS_LS_KEY = "remotion-docs";
export const DOCS_DB = { name: "remotion-docs-store", version: 1, store: "kv" } as const;
const K_STORE = "store", K_REV = "rev";

const hasIdb = () => typeof indexedDB !== "undefined" && indexedDB !== null;
let db: IDBDatabase | null = null;
let mem: string | null = null;
let rev = 0;
let ready = !hasIdb();
let usingIdb = false;
let loading: Promise<void> | null = null;
const TAB = Math.random().toString(36).slice(2, 10);
let chan: BroadcastChannel | null = null;
type RemoteListener = (info: { rev: number }) => void;
const listeners = new Set<RemoteListener>();

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DOCS_DB.name, DOCS_DB.version);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(DOCS_DB.store)) r.result.createObjectStore(DOCS_DB.store); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error("blocked"));
  });
}
const tx = (mode: IDBTransactionMode) => db!.transaction(DOCS_DB.store, mode).objectStore(DOCS_DB.store);
function txDone(t: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error("abort")); });
}

function listen() {
  if (chan || typeof BroadcastChannel === "undefined") return;
  chan = new BroadcastChannel("remotion-docs-store");
  chan.onmessage = async (e: MessageEvent<{ tab: string; rev: number }>) => {
    const m = e.data; if (!m || m.tab === TAB || m.rev <= rev) return;
    try { const v = await req(tx("readonly").get(K_STORE) as IDBRequest<string | undefined>); if (typeof v === "string") mem = v; } catch {}
    rev = m.rev;
    listeners.forEach((f) => f({ rev: m.rev }));
  };
}

/** Reads the store into memory once (and migrates the localStorage copy). Safe to call many times. */
export function preloadStore(): Promise<void> {
  if (ready) return Promise.resolve();
  if (!loading) loading = (async () => {
    try {
      // A database held by an old tab during an upgrade can block open() indefinitely: never let Documents hang.
      db = await Promise.race([openDb(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000))]);
      const [v, r] = await Promise.all([req(tx("readonly").get(K_STORE) as IDBRequest<string | undefined>), req(tx("readonly").get(K_REV) as IDBRequest<number | undefined>)]);
      if (typeof v === "string") { mem = v; rev = r || 1; }
      else {
        let ls: string | null = null; try { ls = localStorage.getItem(DOCS_LS_KEY); } catch {}
        if (ls) {
          const t = db.transaction(DOCS_DB.store, "readwrite"); t.objectStore(DOCS_DB.store).put(ls, K_STORE); t.objectStore(DOCS_DB.store).put(1, K_REV); await txDone(t);
          try { localStorage.removeItem(DOCS_LS_KEY); } catch {}
          rev = 1;
        }
        mem = ls;
      }
      usingIdb = true; listen();
    } catch {
      // IndexedDB unusable (private mode in some browsers, blocked): keep working on localStorage as before.
      db = null; usingIdb = false; try { mem = localStorage.getItem(DOCS_LS_KEY); } catch { mem = null; }
    }
    ready = true;
  })();
  return loading;
}

export const storeReady = () => ready;
/** Where the store lives right now (for the status bar and tests). */
export const storeBackend = (): "indexeddb" | "localstorage" => (usingIdb ? "indexeddb" : "localstorage");

/** The stored JSON (synchronous; call preloadStore first when IndexedDB exists). */
export function readStore(): string | null {
  if (usingIdb) return mem;
  try { return localStorage.getItem(DOCS_LS_KEY); } catch { return null; }
}

export type SaveResult = { ok: true } | { ok: false; reason: "quota" | "error" };
let chain: Promise<unknown> = Promise.resolve();
/** Writes the store. Writes are serialised in call order; the promise tells whether it was really kept. */
export function writeStore(json: string): Promise<SaveResult> {
  if (!usingIdb) {
    try { localStorage.setItem(DOCS_LS_KEY, json); return Promise.resolve({ ok: true }); }
    catch (e) { return Promise.resolve({ ok: false, reason: isQuota(e) ? "quota" : "error" }); }
  }
  const p = chain.then(async (): Promise<SaveResult> => {
    try {
      const next = rev + 1;
      const t = db!.transaction(DOCS_DB.store, "readwrite"); t.objectStore(DOCS_DB.store).put(json, K_STORE); t.objectStore(DOCS_DB.store).put(next, K_REV); await txDone(t);
      mem = json; rev = next;
      chan?.postMessage({ tab: TAB, rev: next });
      return { ok: true };
    } catch (e) { return { ok: false, reason: isQuota(e) ? "quota" : "error" }; }
  });
  chain = p;
  return p;
}
function isQuota(e: unknown) {
  const n = (e as { name?: string } | null)?.name || "";
  return n === "QuotaExceededError" || n === "NS_ERROR_DOM_QUOTA_REACHED" || /quota/i.test(String((e as Error)?.message || ""));
}

/** Called when another tab saved a newer store (the in-memory copy has already been refreshed). */
export function onRemoteChange(f: RemoteListener) { listeners.add(f); return () => { listeners.delete(f); }; }

/** Bytes used and available for this origin, when the browser can tell. */
export async function storeUsage(): Promise<{ used: number; quota: number } | null> {
  try { const e = await navigator.storage?.estimate?.(); return e ? { used: e.usage || 0, quota: e.quota || 0 } : null; } catch { return null; }
}
