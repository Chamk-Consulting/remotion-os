"use client";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { LANGS, LANG_STORAGE_KEY, isLang, type Lang } from "./langs";
import { translate, formatNumber, localeOf, L4 } from "./core";

// Language store: same key and validation as the source (L7506, L7980).
const listeners = new Set<() => void>();
function read(): Lang {
  try { const s = localStorage.getItem(LANG_STORAGE_KEY); if (isLang(s)) return s; } catch {}
  return "en";
}
let current: Lang | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === LANG_STORAGE_KEY) { current = read(); cb(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}
const snapshot = () => (current ??= read());
export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem(LANG_STORAGE_KEY, l); } catch {}
  document.documentElement.lang = l;
  document.documentElement.dir = LANGS[l].dir;
  listeners.forEach((f) => f());
}

type Ctx = { lang: Lang; t: (k: string, vars?: Record<string, string | number>) => string; nf: (n: number) => string; loc: () => string; l4: (s: string) => string; setLang: (l: Lang) => void };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, snapshot, () => "en" as Lang);
  const t = useCallback((k: string, v?: Record<string, string | number>) => translate(lang, k, v), [lang]);
  const value = useMemo<Ctx>(() => ({ lang, t, nf: (n) => formatNumber(lang, n), loc: () => localeOf(lang), l4: (s) => L4(lang, s), setLang }), [lang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}
export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used inside <I18nProvider>");
  return c;
}
