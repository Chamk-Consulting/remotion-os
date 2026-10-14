"use client";
import { stopAll } from "@/lib/events";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANGS, type Lang } from "@/lib/i18n/langs";
import { useShell } from "@/os/state/shell";
import { TopBarMarkup } from "./generated/TopBarMarkup";
import { loadAccountState, roleOf, STATUSES, PEOPLE_ICON } from "./data/account";
import { SvgString } from "./svg";
import { setThemeModeFull, switchLang } from "./shellActions";
import { setSysMenu } from "@/os/shortcuts/actions";
import { openSearch } from "@/os/shortcuts/Palette";

const CK = '<svg class="ck" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="m5 12 5 5 9-10"/></svg>';

/** Source fitTop (L7649): progressive compaction classes c1…c10 until the bar fits. */
export function fitTop() {
  const tp = document.querySelector<HTMLElement>(".top"); if (!tp) return;
  const C = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"]; tp.classList.remove(...C);
  for (const c of C) { if (tp.scrollWidth <= tp.clientWidth + 1) break; tp.classList.add(c); }
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

  const p = (id: string): Record<string, unknown> => {
    switch (id) {
      case "wsBtn": return { className: s.wsOpen ? "on" : "", "aria-expanded": s.wsOpen, onClick: (e: React.MouseEvent) => { stopAll(e); const open = !s.wsOpen; s.closeAll(); s.setWs(open); } };
      case "deskBtn": return { className: s.desksOpen ? "on" : undefined, "aria-expanded": s.desksOpen, onClick: (e: React.MouseEvent) => { stopAll(e); const open = !s.desksOpen; s.closeAll(); s.setDesksOpen(open); } };
      case "langBtn": return { className: s.langOpen ? "on" : undefined, "aria-expanded": s.langOpen, onClick: (e: React.MouseEvent) => { stopAll(e); const open = !s.langOpen; s.closeAll(); s.setLangMenu(open); } };
      case "langMenu": return { className: "pop langmenu" + (s.langOpen ? "" : " closed") };
      case "sysBtn": return { className: s.sysOpen ? "on" : undefined, "aria-expanded": s.sysOpen, onClick: (e: React.MouseEvent) => { stopAll(e); const open = !s.sysOpen; s.closeAll(); setSysMenu(open); } };
      case "searchBtn": return { onClick: (e: React.MouseEvent) => { stopAll(e); openSearch(); } };
      case "themeBtn": return { ref: themeRef, onClick: () => setThemeModeFull(s.isDark ? "light" : "dark", themeRef.current) };
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
          onClick={(e) => { stopAll(e); s.setLangMenu(false); switchLang(k); }}>
          <span className="code">{k.toUpperCase()}</span>{v.name}{k === lang ? <SvgString html={CK} /> : null}
        </button>))
      ;
      // eslint-disable-next-line @next/next/no-img-element -- user photo is a data URL from localStorage (source L10230)
      case "whoAv": return <>{me.photo ? <img src={me.photo} alt="" /> : me.org ? <SvgString html={PEOPLE_ICON} /> : me.ini}<span className="st-dot" style={{ ["--sc" as string]: dot }} /></>;
      case "whoName": return me.short;
      case "whoRole": return t(roleOf(me, acc.prof));
      default: return fb;
    }
  };
  return <TopBarMarkup t={t} p={p} s={slot} />;
}
