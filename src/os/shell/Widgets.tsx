"use client";
import { Children, isValidElement, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useShell } from "@/os/state/shell";
import { WidgetsMarkup } from "./generated/WidgetsMarkup";
import { SvgString } from "./svg";

// Source sunSm (L7694), evDays (L7702). Clock is fixed to Africa/Tunis on purpose (defect D-A03 reproduced).
const SUN_SM = '<svg width="26" height="22" viewBox="0 0 26 22"><g stroke="#ffb51e" stroke-width="1.6" stroke-linecap="round"><path d="M13 1v3M4 10h3M19 10h3M6.5 3.5l2 2M19.5 3.5l-2 2"/></g><circle cx="13" cy="11" r="5" fill="#ffc531"/><path class="cloud" d="M3 21a3.5 3.5 0 0 1 1-6.8 5 5 0 0 1 9 1.3A3 3 0 0 1 14 21z"/></svg>';
const EV_DAYS: Record<string, Record<number, number>> = { "2026-9": { 7: 1, 9: 1, 14: 3, 21: 2, 28: 2 } };
const TZ = "Africa/Tunis";
type Note = { id: number; b: string; p: string; time: string; fresh?: boolean };

export function Widgets() {
  const { t, nf, loc } = useI18n();
  const showToast = useShell((s) => s.showToast);
  const [now, setNow] = useState(() => new Date());
  const [cal, setCal] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [composer, setComposer] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(id); }, []); // tick, L7691
  useEffect(() => { if (composer) input.current?.focus({ preventScroll: true }); }, [composer]);

  const L = loc();
  const parts = new Intl.DateTimeFormat(L, { timeZone: TZ, hour: "2-digit", minute: "2-digit", numberingSystem: "latn" }).formatToParts(now);
  const hh = parts.find((x) => x.type === "hour")!.value, mm = parts.find((x) => x.type === "minute")!.value, ap = parts.find((x) => x.type === "dayPeriod");
  const shortDate = new Intl.DateTimeFormat(L, { month: "short", day: "numeric" });

  const calGrid = () => {
    const { y: cy, m: cm } = cal; const first = new Date(cy, cm, 1).getDay(), dim = new Date(cy, cm + 1, 0).getDate(), pdim = new Date(cy, cm, 0).getDate();
    const wd = new Intl.DateTimeFormat(L, { weekday: "short" }), fmtDay = new Intl.DateTimeFormat(L, { day: "numeric", month: "long" });
    const today = new Date(), isCur = today.getFullYear() === cy && today.getMonth() === cm, ev = EV_DAYS[cy + "-" + cm] || {};
    const out: React.ReactNode[] = [0, 1, 2, 3, 4, 5, 6].map((i) => <div key={"d" + i} className="dn">{wd.format(new Date(2026, 9, 4 + i))}</div>);
    const cells = Math.ceil((first + dim) / 7) * 7;
    for (let i = 0; i < cells; i++) {
      const d = i - first + 1;
      if (d < 1) out.push(<button key={i} className="out" tabIndex={-1}>{nf(pdim + d)}</button>);
      else if (d > dim) out.push(<button key={i} className="out" tabIndex={-1}>{nf(d - dim)}</button>);
      else { const cls = []; if (isCur && d === today.getDate()) cls.push("today"); if (ev[d]) cls.push("has"); out.push(<button key={i} className={cls.join(" ")} aria-label={fmtDay.format(new Date(cy, cm, d))}>{nf(d)}</button>); }
    }
    return out;
  };
  const prevMonth = () => setCal(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));

  const p = (id: string): Record<string, unknown> => {
    switch (id) {
      case "prev": case "prevYear": return { onClick: prevMonth }; // prevYear also −1 month: defect D-A01 reproduced
      case "next": return { onClick: () => setCal(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })) };
      case "noteNew": return { onClick: () => { if (!composer) setComposer(true); else input.current?.focus(); } };
      case "noteForm": return {
        hidden: !composer, onSubmit: (e: React.FormEvent) => {
          e.preventDefault(); const v = input.current!.value.trim(); if (!v) return;
          const time = new Intl.DateTimeFormat(L, { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date());
          setNotes((n) => [{ id: Date.now(), b: v, p: t("justNow"), time, fresh: true }, ...n]);
          input.current!.value = ""; showToast(t("noteAdded"));
        },
      };
      case "noteInput": return { ref: input };
      default: return {};
    }
  };
  const slot = (id: string, fb: React.ReactNode): React.ReactNode => {
    switch (id) {
      case "time": return <>{hh}:{mm}{ap ? <small>{ap.value}</small> : null}</>;
      case "date": return new Intl.DateTimeFormat(L, { timeZone: TZ, weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(now);
      case "temp": return nf(18) + "°C";
      case "fore": return [20, 22, 21, 19, 20].map((tp, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return <div key={i}><SvgString html={SUN_SM} /><div><b>{new Intl.DateTimeFormat(L, { weekday: "short" }).format(d)}</b><span>{nf(tp)}°</span></div></div>; });
      case "evCount": return t("events", { n: nf(3) });
      case "calTitle": return new Intl.DateTimeFormat(L, { month: "long", year: "numeric" }).format(new Date(cal.y, cal.m, 1));
      case "calGrid": return calGrid();
      case "n3d": return shortDate.format(new Date(2026, 9, 9));
      case "t5d": return shortDate.format(new Date(2026, 9, 12));
      case ".notes": {
        // New notes are prepended; the list keeps at most 4 items (source L8384).
        const fresh = notes.map((n) => <li key={n.id} className="fresh"><span className="dot" style={{ background: "var(--green)" }} /><div className="tx"><b dir="auto">{n.b}</b><p>{n.p}</p></div><time>{n.time}</time></li>);
        const base = (fb as React.ReactElement<{ children: React.ReactNode }>).props.children;
        const items = [...fresh, ...Children.toArray(base).filter(isValidElement)];
        return items.slice(0, 4);
      }
      default: return fb;
    }
  };
  return <WidgetsMarkup t={t} p={p} s={slot} />;
}
