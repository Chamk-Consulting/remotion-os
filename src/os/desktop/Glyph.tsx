"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import raw from "@/apps/registry.data.json";
import { SvgString } from "@/os/shell/svg";
import { DK_EXT, dkExt, type Item } from "./model";

const DK_APPS = raw.DK_APPS as unknown as Record<string, [string, string]>;

/** Source dkGlyph (L11244) + yellow-folder override (L11755). Same DOM: span.gl.(app|fold|doc). */
export function Glyph({ it, size = 52, sm, xs, mini }: { it: Item; size?: number; sm?: boolean; xs?: boolean; mini?: boolean }) {
  const { nf } = useI18n();
  if (it.type === "app") {
    const a = DK_APPS[it.app!] || ["#5d6670", ""];
    return <span className={"gl app" + (mini ? " gmini" : "")} style={{ background: a[0] }}>{it.app === "calendar" ? <span className="cal-ic"><i></i><b>{nf(new Date().getDate())}</b></span> : a[1] ? <SvgString html={a[1]} /> : null}</span>;
  }
  if (it.type === "folder") {
    const n = (it.kids || []).length, y = it.col === "y";
    return (
      <span className="gl fold">
        <svg viewBox="0 0 64 52" width={size + 4} height={Math.round((size + 4) * 52 / 64)} aria-hidden="true">
          <path d="M4 9a5 5 0 0 1 5-5h15l6 6h25a5 5 0 0 1 5 5v4H4z" fill={y ? "#e9a21a" : "#3e86e8"} />
          <rect x="4" y="15" width="56" height="34" rx="5" fill={y ? "url(#dkfy)" : "url(#dkfg)"} />
          <defs><linearGradient id={y ? "dkfy" : "dkfg"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={y ? "#ffd668" : "#74b4ff"} /><stop offset="1" stopColor={y ? "#f6b62c" : "#4d94f5"} /></linearGradient></defs>
          <path d="M12 22h40" stroke={y ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.35)"} strokeWidth="2" strokeLinecap="round" />
        </svg>
        {n ? <i className="cnt">{nf(n)}</i> : null}
      </span>
    );
  }
  if (it.type === "link") return <span className="gl app" style={{ background: "linear-gradient(135deg,#3ad1a6,#1f7fd6)" }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg></span>;
  const [c, l] = DK_EXT[dkExt(it.name)] || ["#7c8581", (dkExt(it.name) || "FILE").toUpperCase().slice(0, 4)];
  return (
    <span className={"gl doc" + (sm ? " sm" : "") + (xs ? " xs" : "")}>
      <svg viewBox="0 0 48 58" width={Math.round(size * .82)} height={size} aria-hidden="true">
        <path d="M5 4a4 4 0 0 1 4-4h22l13 13v41a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill="#fff" stroke="rgba(0,0,0,.12)" />
        <path d="M31 0v9a4 4 0 0 0 4 4h9" fill="#e9eef3" />
        <rect x="0" y="30" width="34" height="14" rx="3" fill={c} />
        <text x="17" y="40.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="system-ui,sans-serif">{l}</text>
        <path d="M12 18h20M12 23h16" stroke="#d3dae0" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M12 50h22" stroke="#d3dae0" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
/** Source dkName (L11251). */
export const useDkName = () => { const { t } = useI18n(); return (it: Item) => (it.type === "app" ? t(it.app!) : it.name!); };
