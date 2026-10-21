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
 *
 * Product phase 6 — encryption at rest (opt-in): with a passcode, the store is kept encrypted in IndexedDB (AES-GCM 256, key derived
 * with PBKDF2-SHA-256, 310 000 iterations, random salt; a new random IV for every write). The key lives only in memory: after a reload,
 * or "Lock now", the store is locked — nothing can be read or written until the passcode is given again. Writes are refused while
 * locked, so a locked store can never be overwritten by an empty one. There is no recovery without the passcode.
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
/* encryption at rest */
type Env = { enc: 1; alg: "AES-GCM"; kdf: "PBKDF2-SHA256"; it: number; salt: string; iv: string; ct: string };
let encrypted = false, locked = false, key: CryptoKey | null = null, salt: Uint8Array | null = null, envRaw: string | null = null;
const lockListeners = new Set<() => void>();
const b64 = (u: Uint8Array) => { let s = ""; u.forEach((c) => (s += String.fromCharCode(c))); return btoa(s); };
const unb64 = (s: string) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
function asEnv(v: string | null | undefined): Env | null { if (!v || v.charCodeAt(0) !== 123 || !v.startsWith('{"enc":1')) return null; try { const e = JSON.parse(v) as Env; return e.enc === 1 && e.ct ? e : null; } catch { return null; } }
async function derive(pass: string, sa: Uint8Array, it = 310000) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: sa as BufferSource, iterations: it }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function seal(json: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key!, new TextEncoder().encode(json)));
  return JSON.stringify({ enc: 1, alg: "AES-GCM", kdf: "PBKDF2-SHA256", it: 310000, salt: b64(salt!), iv: b64(iv), ct: b64(ct) } satisfies Env);
}
async function open_(e: Env, k: CryptoKey) { const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(e.iv) as BufferSource }, k, unb64(e.ct) as BufferSource); return new TextDecoder().decode(pt); }
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
    try { const v = await req(tx("readonly").get(K_STORE) as IDBRequest<string | undefined>); if (typeof v === "string") { const e = asEnv(v);
      if (!e) { mem = v; encrypted = false; } else { envRaw = v; encrypted = true; if (key && !locked) { try { mem = await open_(e, key); } catch { mem = null; locked = true; key = null; lockListeners.forEach((f) => f()); } } } } } catch {}
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
      if (typeof v === "string") { rev = r || 1; const e = asEnv(v); if (e) { encrypted = true; locked = true; envRaw = v; mem = null; } else mem = v; }
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

export type SaveResult = { ok: true } | { ok: false; reason: "quota" | "error" | "locked" };
let chain: Promise<unknown> = Promise.resolve();
/** Writes the store. Writes are serialised in call order; the promise tells whether it was really kept. */
export function writeStore(json: string): Promise<SaveResult> {
  if (locked) return Promise.resolve({ ok: false, reason: "locked" });
  if (!usingIdb) {
    try { localStorage.setItem(DOCS_LS_KEY, json); return Promise.resolve({ ok: true }); }
    catch (e) { return Promise.resolve({ ok: false, reason: isQuota(e) ? "quota" : "error" }); }
  }
  const p = chain.then(async (): Promise<SaveResult> => {
    try {
      const next = rev + 1;
      if (locked) return { ok: false, reason: "locked" };
      const out = encrypted ? await seal(json) : json;
      const t = db!.transaction(DOCS_DB.store, "readwrite"); t.objectStore(DOCS_DB.store).put(out, K_STORE); t.objectStore(DOCS_DB.store).put(next, K_REV); await txDone(t);
      if (encrypted) envRaw = out;
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


/* ---------- encryption at rest (product phase 6) ---------- */
export const storeEncrypted = () => encrypted;
export const storeLocked = () => locked;
/** Called when the store becomes locked or unlocked (Documents shows or leaves its lock screen). */
export function onLockChange(f: () => void) { lockListeners.add(f); return () => { lockListeners.delete(f); }; }
const canEncrypt = () => usingIdb && typeof crypto !== "undefined" && !!crypto.subtle;
export const storeCanEncrypt = canEncrypt;
/** Opens a locked store with its passcode. False when the passcode is wrong. */
export async function unlockStore(pass: string): Promise<boolean> {
  const e = asEnv(envRaw); if (!e) return !locked;
  try { const sa = unb64(e.salt); const k = await derive(pass, sa, e.it); const json = await open_(e, k); key = k; salt = sa; mem = json; locked = false; lockListeners.forEach((f) => f()); return true; }
  catch { return false; }
}
/** Turns encryption on: the current store is written again, encrypted with a key derived from the passcode. */
export async function enableEncryption(pass: string): Promise<SaveResult> {
  if (!canEncrypt() || locked) return { ok: false, reason: "error" };
  const sa = crypto.getRandomValues(new Uint8Array(16)); const k = await derive(pass, sa);
  const prev = { encrypted, key, salt }; encrypted = true; key = k; salt = sa;
  const r = await writeStore(mem || "null"); if (!r.ok) { encrypted = prev.encrypted; key = prev.key; salt = prev.salt; } return r;
}
/** Turns encryption off (the passcode is checked again first). */
export async function disableEncryption(pass: string): Promise<SaveResult | { ok: false; reason: "passcode" }> {
  if (!encrypted || locked) return { ok: false, reason: "error" };
  const e = asEnv(envRaw); if (e) { try { await open_(e, await derive(pass, unb64(e.salt), e.it)); } catch { return { ok: false, reason: "passcode" }; } }
  encrypted = false; const r = await writeStore(mem || "null"); if (r.ok) { key = null; salt = null; envRaw = null; } else encrypted = true; return r;
}
/** Locks now: waits for pending writes, then forgets the key and the plain copy. */
export async function lockStore() { if (!encrypted) return; await chain.catch(() => {}); key = null; mem = null; locked = true; lockListeners.forEach((f) => f()); }
