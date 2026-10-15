"use client";
/**
 * Search palette `#palette` (L8800–L8872): grows out of the search bar (clip-path from the button), suggested items when
 * empty, then apps / actions / shortcuts / widget items filtered accent-insensitively; ↑↓ Enter, hover, click.
 */
import { useKb } from "@/os/keyboard/kb";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANGS, type Lang } from "@/lib/i18n/langs";
import { SOURCE_TABLES } from "@/apps/registry";
import { useShell } from "@/os/state/shell";
import { SvgString } from "@/os/shell/svg";
import { PaletteMarkup } from "@/os/shell/generated/PaletteMarkup";
import { switchLang } from "@/os/shell/shellActions";
import { osActions } from "@/os/actions";
import { CAT_IC, MI, PI, SC_CATS, SI, allRows, norm } from "./catalogue";
import { Hl, Kbds, scApi } from "./ShortcutsPanel";
import { ACTIONS, runRow } from "./actions";

type Item = { g: string; label: string; icon: React.ReactNode; combo?: string; run: () => void };

/** openSearch (L8805): place over the search bar (or centred when the top bar is hidden), then open. */
export function openSearch() {
  const st = useShell.getState(); const pal = document.getElementById("palette"), inp = document.getElementById("palInput") as HTMLInputElement | null;
  if (st.palOpen) { inp?.focus(); inp?.select(); return; }
  st.closeAll(); if (st.scOpen) scApi.close();
  if (!pal) return;
  const w = Math.min(600, innerWidth - 24); pal.style.width = w + "px";
  const sb = document.getElementById("searchBtn")!.getBoundingClientRect(), vis = sb.width > 0 && !st.navHidden;
  let left, top, c0;
  if (vis) { left = Math.min(Math.max(12, sb.left - 8), innerWidth - w - 12); top = sb.top - 6; const lx = sb.left - left; c0 = `inset(6px ${Math.max(0, w - lx - sb.width)}px calc(100% - ${sb.height + 6}px) ${lx}px round 11px)`; }
  else { left = (innerWidth - w) / 2; top = 70; c0 = `inset(0 ${w / 2 - 60}px calc(100% - 52px) ${w / 2 - 60}px round 26px)`; }
  pal.style.left = left + "px"; pal.style.top = top + "px"; pal.style.setProperty("--c0", c0);
  pal.style.transition = "none"; void pal.offsetWidth; pal.style.transition = "";
  useShell.setState({ palOpen: true });
  if (useKb.getState().open && inp) inp.inputMode = "none";
  setTimeout(() => inp?.focus({ preventScroll: true }), 30);
}
export function closeSearch() { if (!useShell.getState().palOpen) return; useShell.setState({ palOpen: false }); const inp = document.getElementById("palInput"); if (document.activeElement === inp) (inp as HTMLInputElement).blur(); }

export function Palette() {
  const { t, lang, nf } = useI18n();
  const s = useShell();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const list = useRef<HTMLDivElement | null>(null);
  // Fresh query each time it opens (palInput.value = "").
  const [wasOpen, setWasOpen] = useState(s.palOpen);
  const [ever, setEver] = useState(false); // the list keeps its last content while the palette closes (the source never clears it)
  if (wasOpen !== s.palOpen) { setWasOpen(s.palOpen); if (s.palOpen) { setQ(""); setIdx(0); setEver(true); } }

  /** palData (L8824). */
  const data = (): Item[] => {
    const nq = norm(q.trim()), has = (x: string) => !nq || norm(x).includes(nq);
    const seen = new Set<string>(), apps: Item[] = [];
    [...SOURCE_TABLES.railItems, ...SOURCE_TABLES.dockApps].forEach(([k, bg, svg]) => {
      if (k === "add") return; const label = t(k); if (seen.has(label)) return; seen.add(label);
      apps.push({ g: "searchApps", label, icon: <span className="pi" style={{ background: bg || "var(--chip)" }}>{k === "calendar" ? <b style={{ font: "700 13px Inter", color: "#1a8c3b" }}>{nf(new Date().getDate())}</b> : <SvgString html={svg} />}</span>, run: () => s.showToast(t("opened", { x: label })) });
    });
    const actions: Item[] = [
      { label: t(s.isDark ? "lightMode" : "darkMode"), ic: s.isDark ? SI.sun : PI.moon, combo: "Ctrl+Shift+T", run: ACTIONS.theme },
      // renderPalette reads kbOpen at render time (not subscribed: the label refreshes with the next render, like the source).
      { label: t(useKb.getState().open ? "kbCloseV" : "kbOpenV"), ic: MI.kbd, combo: "Ctrl+Shift+K", run: ACTIONS.vkb },
      { label: t("kbShortcuts"), ic: MI.cmd, combo: "Ctrl+Slash", run: () => scApi.open() },
      { label: t("newNote2"), ic: PI.note, combo: "Ctrl+Alt+N", run: ACTIONS.note },
      { label: t("dNew"), ic: CAT_IC.monitor, combo: "Ctrl+Win+D", run: ACTIONS.dNew },
      { label: t("dOverview"), ic: CAT_IC.grid, combo: "Ctrl+Win+Tab", run: ACTIONS.dOverview },
      { label: t("toggleWidgets"), ic: CAT_IC.widget, combo: "Ctrl+Alt+H", run: ACTIONS.widgets },
      { label: t("lock"), ic: SI.lock, combo: "Ctrl+Alt+L", run: () => osActions.lock() },
      ...(Object.keys(LANGS) as Lang[]).filter((k) => k !== lang).map((k) => ({ label: `${t("language")}: ${LANGS[k].name}`, ic: SI.globe, run: () => switchLang(k) })),
    ].map((a: { label: string; ic: string; combo?: string; run: () => void }) => ({ g: "searchActions", label: a.label, icon: <span className="pi"><SvgString html={a.ic} /></span>, combo: a.combo, run: a.run }));
    const rowsSeen = new Set(actions.map((a) => a.label));
    const scs: Item[] = allRows().filter((r) => !r.display && !rowsSeen.has(t(r.label)) && (rowsSeen.add(t(r.label)), true)).map((r) => ({ g: "searchShortcuts", label: t(r.label), icon: <span className="pi"><SvgString html={CAT_IC[SC_CATS.find((c) => c.id === r.cat)?.ic || "custom"]} /></span>, combo: r.combo, run: () => runRow(r) }));
    const items: Item[] = typeof document === "undefined" ? [] : [...document.querySelectorAll<HTMLElement>(".notes li b, .tasks label span")].map((el) => ({ g: "searchItems", label: el.textContent || "", icon: <span className="pi"><SvgString html={el.closest(".notes") ? PI.note : PI.task} /></span>,
      run: () => { useShell.setState({ widgetsHidden: false }); const li = el.closest("li")!; li.scrollIntoView({ block: "nearest", behavior: "smooth" }); li.animate([{ background: "var(--green-soft)" }, { background: "transparent" }], { duration: 1400, easing: "ease-out" }); } }));
    if (!nq) return [...actions.slice(0, 4).map((x) => ({ ...x, g: "searchSuggested" })), ...apps.slice(0, 5).map((x) => ({ ...x, g: "searchSuggested" }))];
    return [...apps.filter((x) => has(x.label)).slice(0, 6), ...actions.filter((x) => has(x.label)).slice(0, 5), ...scs.filter((x) => has(x.label)).slice(0, 6), ...items.filter((x) => has(x.label)).slice(0, 5)];
  };
  const cur = ever ? data() : [];
  const run = (i: number) => { const x = cur[i]; if (!x) return; closeSearch(); setTimeout(() => x.run(), 60); };
  const move = (d: number) => { if (!cur.length) return; const n = (idx + d + cur.length) % cur.length; setIdx(n); requestAnimationFrame(() => list.current?.querySelector(`[data-pi="${n}"]`)?.scrollIntoView({ block: "nearest" })); };

  useEffect(() => {
    const out = (e: MouseEvent) => { if (useShell.getState().palOpen && !(e.target as Element).closest?.("#palette,#searchBtn,.kb")) closeSearch(); };
    // The rail "+" opens the palette (L8872).
    const add = (e: MouseEvent) => { if ((e.target as Element).closest?.('[data-act="add"]')) { e.stopPropagation(); openSearch(); } };
    document.addEventListener("click", out); document.addEventListener("click", add);
    return () => { document.removeEventListener("click", out); document.removeEventListener("click", add); };
  }, []);

  const p = (id: string): Record<string, unknown> => {
    if (id === "palette") return { className: "palette" + (s.palOpen ? " open" : ""), onSubmit: (e: React.FormEvent) => e.preventDefault() };
    if (id === "palInput") return { value: q, onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setQ(e.target.value); setIdx(0); },
      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "ArrowDown") { e.preventDefault(); move(1); } else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); } else if (e.key === "Enter") { e.preventDefault(); run(idx); } } };
    if (id === "palList") return { ref: list, onPointerMove: (e: React.PointerEvent) => { const b = (e.target as Element).closest<HTMLElement>("[data-pi]"); if (b && +b.dataset.pi! !== idx) setIdx(+b.dataset.pi!); },
      onClick: (e: React.MouseEvent) => { const b = (e.target as Element).closest<HTMLElement>("[data-pi]"); if (b) run(+b.dataset.pi!); } };
    return {};
  };
  const slot = (id: string, fb: React.ReactNode) => {
    if (id !== "palList") return fb;
    if (!ever) return null;
    if (!cur.length) return <div className="pal-empty">{t("searchNone", { x: q.trim() })}</div>;
    let g = ""; const out: React.ReactNode[] = [];
    cur.forEach((x, i) => {
      if (x.g !== g) { g = x.g; out.push(<div className="pal-g" key={"g" + i}>{t(g)}</div>); }
      out.push(<button key={i} className={"pal-item" + (i === idx ? " on" : "")} role="option" aria-selected={i === idx} data-pi={i} style={{ ["--i" as string]: i }} tabIndex={-1}>{x.icon}<span className="pl" dir="auto"><Hl text={x.label} q={q.trim()} /></span>{x.combo ? <Kbds combo={x.combo} /> : null}</button>);
    });
    return out;
  };
  return <PaletteMarkup t={t} p={p} s={slot} />;
}
