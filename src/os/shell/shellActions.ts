"use client";
/**
 * Shell actions shared by the top bar, system menu, search palette and shortcuts:
 * switchLang (L7662), animateTheme / setThemeMode (L10423–L10441).
 */
import { setLang } from "@/lib/i18n/I18nProvider";
import { LANGS, type Lang, isLang } from "@/lib/i18n/langs";
import { translate } from "@/lib/i18n/core";
import { systemDark, useShell } from "@/os/state/shell";

const curLang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };

/** switchLang: view transition with staggered panels, blur fallback, instant under reduced motion; toast in the NEW language. */
export function switchLang(next: Lang) {
  const current = curLang(); if (next === current) return;
  const done = () => useShell.getState().showToast(translate(next, "langSet", { x: LANGS[next].name }));
  const apply = () => setLang(next);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { apply(); done(); return; }
  const d = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (d.startViewTransition) {
    document.documentElement.classList.add("vt-lang"); document.documentElement.classList.toggle("vt-ov", false);
    d.startViewTransition(apply).finished.finally(() => { document.documentElement.classList.remove("vt-lang", "vt-ov"); done(); });
  } else {
    const sh = document.getElementById("shell")!;
    sh.animate([{ opacity: 1, filter: "blur(0)", transform: "none" }, { opacity: 0, filter: "blur(6px)", transform: "translateY(-6px)" }], { duration: 200, easing: "ease-in", fill: "forwards" }).finished.then(() => {
      apply();
      sh.animate([{ opacity: 0, filter: "blur(6px)", transform: "translateY(10px)" }, { opacity: 1, filter: "blur(0)", transform: "none" }], { duration: 480, easing: "cubic-bezier(.2,1,.3,1)", fill: "forwards" }).finished.then(() => { sh.getAnimations().forEach((a) => a.cancel()); done(); });
    });
  }
}

/** animateTheme: circular reveal from `origin` (or the theme button), crossfade fallback, then the mode toast. */
export function animateTheme(dark: boolean, origin?: Element | null) {
  const s = useShell.getState(); const root = document.documentElement;
  const o = origin && origin.getBoundingClientRect().width ? origin : document.getElementById("themeBtn");
  const b = o!.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
  root.style.setProperty("--rx", x + "px"); root.style.setProperty("--ry", y + "px");
  root.style.setProperty("--rr", Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + "px");
  const d = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (d.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("vt-theme");
    d.startViewTransition(() => s.setTheme(dark)).finished.finally(() => root.classList.remove("vt-theme"));
  } else {
    const wall = document.getElementById("wall");
    root.classList.add("theme-fade"); wall?.classList.add("fade");
    setTimeout(() => { useShell.getState().setTheme(dark); wall?.classList.remove("fade"); }, 180);
    setTimeout(() => root.classList.remove("theme-fade"), 750);
  }
  s.showToast(translate(curLang(), dark ? "darkMode" : "lightMode"));
}
/** setThemeMode(mode, origin): persist, then animate when the effective theme changes. */
export function setThemeModeFull(mode: "light" | "dark" | "auto", origin?: Element | null) {
  const s = useShell.getState(); s.setThemeMode(mode);
  const dark = mode === "auto" ? systemDark() : mode === "dark";
  if (dark !== s.isDark) animateTheme(dark, origin);
}
