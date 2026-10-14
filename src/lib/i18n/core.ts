import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import de from "@/locales/de.json";
import ar from "@/locales/ar.json";
import { LANGS, type Lang } from "./langs";

export type Dict = Record<string, string>;
/** Full runtime dictionaries, extracted from the source and verified equal to its runtime I18N (tools/check-i18n-runtime.mjs). */
export const I18N: Record<Lang, Dict> = { en, fr, de, ar };

/**
 * Source L7507 semantics, reproduced on purpose:
 * I18N[lang][k] ?? I18N.en[k] ?? k, and only the FIRST occurrence of each {var} is replaced (defect D-A21, kept).
 */
export function translate(lang: Lang, k: string, vars: Record<string, string | number> = {}): string {
  let s = I18N[lang][k] ?? I18N.en[k] ?? k;
  for (const v in vars) s = s.replace("{" + v + "}", String(vars[v]));
  return s;
}
/** Source L7508 */
export const localeOf = (lang: Lang) => LANGS[lang].locale;
/** Source L7509 */
export const formatNumber = (lang: Lang, n: number) => new Intl.NumberFormat(localeOf(lang)).format(n);
/** Source L21374: inline "fr|en|de|ar" strings used by Calculator, Billing, HR and the healthcare suite. */
export function L4(lang: Lang, s: string): string {
  const p = String(s).split("|");
  if (p.length < 2) return s;
  return p[({ fr: 0, en: 1, de: 2, ar: 3 } as const)[lang] ?? 1] || p[1] || p[0];
}
