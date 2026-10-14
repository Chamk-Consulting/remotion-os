// Source L7180–L7185 (verbatim values).
export const LANGS = {
  en: { name: "English", locale: "en-US", dir: "ltr" },
  fr: { name: "Français", locale: "fr-FR", dir: "ltr" },
  de: { name: "Deutsch", locale: "de-DE", dir: "ltr" },
  ar: { name: "العربية", locale: "ar-TN", dir: "rtl" },
} as const;
export type Lang = keyof typeof LANGS;
export const LANG_KEYS = Object.keys(LANGS) as Lang[];
export const isLang = (v: unknown): v is Lang => typeof v === "string" && v in LANGS;
/** localStorage key owned by the shell (doc 06 #1). */
export const LANG_STORAGE_KEY = "remotion-lang";
