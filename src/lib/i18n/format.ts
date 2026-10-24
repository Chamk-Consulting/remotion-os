/** v94 · file sizes and numbers in the interface language (catch-up S4/S7). Same rules as the HTML (uiSize, uiLoc). */
import { isLang } from "./langs";
const LOC: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", ar: "ar-TN-u-nu-latn" };
const cur = () => { try { const h = document.documentElement.lang; return isLang(h) ? h : "fr"; } catch { return "fr"; } };
/** Locale of the interface language; Arabic keeps Latin digits as in the rest of the OS. */
export function uiLoc(L?: string): string { return LOC[L || cur()] || "fr-FR"; }
/** 1 234 B · 12.5 KB · 3.4 MB … in the interface language. */
export function uiSize(n: unknown, L?: string): string {
  const v0 = +(n as number) || 0;
  const [v, u] = v0 < 1024 ? [v0, "byte"] : v0 < 1048576 ? [v0 / 1024, "kilobyte"] : v0 < 1073741824 ? [v0 / 1048576, "megabyte"] : [v0 / 1073741824, "gigabyte"];
  try { return new Intl.NumberFormat(uiLoc(L), { style: "unit", unit: u, unitDisplay: "short", maximumFractionDigits: u === "byte" || v >= 100 ? 0 : 1 }).format(v); }
  catch { return Math.round(v * 10) / 10 + " " + ({ byte: "B", kilobyte: "KB", megabyte: "MB", gigabyte: "GB" } as Record<string, string>)[u]; }
}
