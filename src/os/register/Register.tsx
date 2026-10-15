"use client";
/** Registration screen `#rg` (markup L7122–L7167). The wizard itself is the imperative island in ./register.ts. */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { stopAll } from "@/lib/events";
import { SvgString } from "@/os/shell/svg";
import { RegisterMarkup } from "@/os/shell/generated/RegisterMarkup";
import { useShell } from "@/os/state/shell";
import { overlayHooks, setThemeModeFull } from "@/os/shell/shellActions";
import { SII } from "@/os/signin/SignIn";
import { autoSlide, closeRgPop, installRegister, nextRgQuote, pickSlide, rgLangPop, rgOnLang, rgPointerDown, stopSlide } from "./register";

// The animated language switch closes the registration popover too (L7669).
const prevClose = overlayHooks.closePops;
overlayHooks.closePops = () => { prevClose(); closeRgPop(); };

export function Register() {
  const { t, lang } = useI18n();
  const isDark = useShell((s) => s.isDark);
  useEffect(() => installRegister(), []);
  const prevLang = useRef(lang);
  useLayoutEffect(() => { if (prevLang.current !== lang) { prevLang.current = lang; rgOnLang(); } }, [lang]);
  const p = (id: string): Record<string, unknown> => {
    switch (id) {
      case "rg": return { onPointerDown: rgPointerDown };
      case "rgLang": return { onClick: (e: React.MouseEvent) => { stopAll(e); rgLangPop(e.currentTarget as HTMLElement); } };
      case "rgTheme": return { onClick: (e: React.MouseEvent) => setThemeModeFull(isDark ? "light" : "dark", e.currentTarget) };
      case "rgQuote": return { onClick: nextRgQuote };
      case "rgDots": return { onClick: (e: React.MouseEvent) => { const b = (e.target as Element).closest<HTMLElement>("[data-slide]"); if (b) pickSlide(+b.dataset.slide!); } };
      default: return {};
    }
  };
  const s = (id: string, fb: React.ReactNode): React.ReactNode => (id === "rgLangCode" ? lang.toUpperCase() : id === "rgTheme" ? <SvgString html={isDark ? SII.sun : SII.moon} /> : fb);
  // .rg-right pauses the carousel on hover (L9879–L9880); it has no id, so its listeners are attached here.
  useEffect(() => {
    const r = document.querySelector("#rg .rg-right"); if (!r) return;
    r.addEventListener("pointerenter", stopSlide); r.addEventListener("pointerleave", autoSlide);
    return () => { r.removeEventListener("pointerenter", stopSlide); r.removeEventListener("pointerleave", autoSlide); };
  }, []);
  return <RegisterMarkup t={t} p={p} s={s} />;
}
