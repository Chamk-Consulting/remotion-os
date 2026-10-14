"use client";
import { stopAll } from "@/lib/events";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useI18n, setLang } from "@/lib/i18n/I18nProvider";
import { LANGS, type Lang } from "@/lib/i18n/langs";
import { translate } from "@/lib/i18n/core";
import { useShell } from "@/os/state/shell";
import { TopBarMarkup } from "./generated/TopBarMarkup";
import { loadAccountState, roleOf, STATUSES, PEOPLE_ICON } from "./data/account";
import { SvgString } from "./svg";

const CK = '<svg class="ck" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="m5 12 5 5 9-10"/></svg>';

/** Source fitTop (L7649): progressive compaction classes c1…c10 until the bar fits. */
export function fitTop() {
  const tp = document.querySelector<HTMLElement>(".top"); if (!tp) return;
  const C = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"]; tp.classList.remove(...C);
  for (const c of C) { if (tp.scrollWidth <= tp.clientWidth + 1) break; tp.classList.add(c); }
}

/** Source switchLang (L7662): view transition with staggered panels, blur fallback, instant under reduced motion. */
function switchLang(next: Lang, current: Lang, done: () => void) {
  if (next === current) return;
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

export function TopBar() {
  const { t, lang } = useI18n();
  const s = useShell();
  const acc = useMemo(() => loadAccountState(), []);
  const me = acc.accounts.find((a) => a.id === acc.accId)!;
  const dot = STATUSES.find((x) => x[0] === acc.status)![2];
  const wsName = (w: { k?: string; n?: number }) => (w.k ? t(w.k) : t("workspaceN", { n: new Intl.NumberFormat(LANGS[lang].locale).format(w.n!) }));
  const themeRef = useRef<HTMLButtonElement | null>(null);

  // Re-fit after every language change and on resize (source L7655, L7999).
  useLayoutEffect(() => { fitTop(); const id = setTimeout(fitTop, 250); return () => clearTimeout(id); }, [lang]);
  useEffect(() => {
    let tm: ReturnType<typeof setTimeout>;
    const on = () => { clearTimeout(tm); tm = setTimeout(fitTop, 80); };
    addEventListener("resize", on); document.fonts?.ready?.then(() => fitTop());
    return () => removeEventListener("resize", on);
  }, []);
  // Outside click closes the language menu (L7973).
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as Element).closest?.("#langMenu,#langBtn")) useShell.getState().setLangMenu(false); };
    document.addEventListener("click", h); return () => document.removeEventListener("click", h);
  }, []);

  /** Source animateTheme (L10423): circular reveal from the button, crossfade fallback. */
  const animateTheme = (dark: boolean) => {
    const root = document.documentElement, b = themeRef.current!.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
    root.style.setProperty("--rx", x + "px"); root.style.setProperty("--ry", y + "px");
    root.style.setProperty("--rr", Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + "px");
    const d = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
    if (d.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("vt-theme");
      d.startViewTransition(() => s.setTheme(dark)).finished.finally(() => root.classList.remove("vt-theme"));
    } else {
      const wall = document.getElementById("wall");
      root.classList.add("theme-fade"); wall?.classList.add("fade");
      setTimeout(() => { s.setTheme(dark); wall?.classList.remove("fade"); }, 180);
      setTimeout(() => root.classList.remove("theme-fade"), 750);
    }
    s.showToast(t(dark ? "darkMode" : "lightMode"));
  };

  const p = (id: string): Record<string, unknown> => {
    switch (id) {
      case "wsBtn": return { className: s.wsOpen ? "on" : "", "aria-expanded": s.wsOpen, onClick: (e: React.MouseEvent) => { stopAll(e); const open = !s.wsOpen; s.closeAll(); s.setWs(open); } };
      case "deskBtn": return { className: s.desksOpen ? "on" : undefined, "aria-expanded": s.desksOpen, onClick: (e: React.MouseEvent) => { stopAll(e); const open = !s.desksOpen; s.closeAll(); s.setDesksOpen(open); } };
      case "langBtn": return { className: s.langOpen ? "on" : undefined, "aria-expanded": s.langOpen, onClick: (e: React.MouseEvent) => { stopAll(e); const open = !s.langOpen; s.closeAll(); s.setLangMenu(open); } };
      case "langMenu": return { className: "pop langmenu" + (s.langOpen ? "" : " closed") };
      case "themeBtn": return { ref: themeRef, onClick: () => { const dark = !s.isDark; s.setThemeMode(dark ? "dark" : "light"); if (dark !== s.isDark) animateTheme(dark); } };
      case "whoAv": return { className: "avatar" + (me.org ? " org" : ""), style: { background: me.bg } };
      default: return {};
    }
  };
  const slot = (id: string, fb: React.ReactNode): React.ReactNode => {
    switch (id) {
      case "wsLabel": return wsName(s.workspaces[s.selWs]);
      case "langCode": return lang.toUpperCase();
      case "langMenu": return (Object.entries(LANGS) as [Lang, (typeof LANGS)[Lang]][]).map(([k, v]) => (
        <button key={k} role="menuitemradio" aria-checked={k === lang} data-lang={k} lang={k}
          onClick={(e) => { stopAll(e); s.setLangMenu(false); switchLang(k, lang, () => useShell.getState().showToast(translate(k, "langSet", { x: LANGS[k].name }))); }}>
          <span className="code">{k.toUpperCase()}</span>{v.name}{k === lang ? <SvgString html={CK} /> : null}
        </button>))
      ;
      case "whoAv": return <>{me.photo ? /* eslint-disable-next-line @next/next/no-img-element -- user photo is a data URL from localStorage (source L10230) */ <img src={me.photo} alt="" /> : me.org ? <SvgString html={PEOPLE_ICON} /> : me.ini}<span className="st-dot" style={{ ["--sc" as string]: dot }} /></>;
      case "whoName": return me.short;
      case "whoRole": return t(roleOf(me, acc.prof));
      default: return fb;
    }
  };
  return <TopBarMarkup t={t} p={p} s={slot} />;
}
