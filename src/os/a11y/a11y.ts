"use client";
/**
 * Accessibility — catch-up slice S7 (Remotion OS v94, L29406–L29476).
 * Icon-only buttons keep a name, modal dialogs keep focus (in, Tab trapped, back), the Planning drawer is a dialog that
 * Escape closes, a skip link reaches the main content, and the demo desktop folders follow the interface language.
 */
import { translate } from "@/lib/i18n/core";
import { isLang, type Lang } from "@/lib/i18n/langs";
import { useShell } from "@/os/state/shell";
import { osTopWin, winEls } from "@/os/windows/wm";
import { PL, plDrawer } from "@/apps/planning/planning";

const lang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "fr"; };
const L4 = (s: string) => { const p = s.split("|"); return p[({ fr: 0, en: 1, de: 2, ar: 3 } as Record<string, number>)[lang()] ?? 0] || p[0]; };

/* 3 · names for icon-only buttons (text hidden by CSS on narrow screens) and for colour swatches */
export function a11yName(root?: ParentNode) {
  const R = root || document;
  R.querySelectorAll<HTMLElement>("button:not([aria-label]):not([aria-labelledby]),[role=button]:not([aria-label]):not([aria-labelledby])").forEach((b) => {
    if (!b.querySelector("svg,img,i,.ic,.gl")) return; const tx = (b.textContent || "").replace(/\s+/g, " ").trim(); if (tx) { b.setAttribute("aria-label", tx); b.dataset.an = "1"; }
  });
  R.querySelectorAll<HTMLElement>("button[data-an]").forEach((b) => { const tx = (b.textContent || "").replace(/\s+/g, " ").trim(); if (tx && b.getAttribute("aria-label") !== tx) b.setAttribute("aria-label", tx); });
  R.querySelectorAll<HTMLElement>(".dc-dot:not([aria-label])").forEach((b) => { const sib = [...b.parentNode!.querySelectorAll(".dc-dot")]; b.setAttribute("aria-label", L4("Couleur|Colour|Farbe|لون") + " " + (sib.indexOf(b) + 1)); if (b.hasAttribute("aria-checked") && !b.getAttribute("role")) b.setAttribute("role", "radio"); });
}

/* 4 · modal dialogs: focus in, Tab stays in, focus back */
const A11Y_FOC = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
const a11yVis = (e: Element) => { const r = e.getBoundingClientRect(); if (!r.width && !r.height) return false; const s = getComputedStyle(e); return s.visibility !== "hidden" && s.display !== "none"; };
export const a11yFocusables = (d: ParentNode) => [...d.querySelectorAll<HTMLElement>(A11Y_FOC)].filter((e) => a11yVis(e) && !e.closest("[inert]"));
const a11yModals = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].filter((d) => !d.closest(".tsw,.xp") && a11yVis(d));
const OPEN = new Set<HTMLElement>(); const PREV = new WeakMap<HTMLElement, HTMLElement | null>();
function a11yScanModals() {
  const now = new Set(a11yModals());
  now.forEach((d) => {
    if (OPEN.has(d)) return; OPEN.add(d); const a = document.activeElement as HTMLElement | null; PREV.set(d, a && a !== document.body && !d.contains(a) ? a : null);
    setTimeout(() => { if (!d.isConnected || d.contains(document.activeElement)) return; /* the app already placed focus */ const f = d.querySelector<HTMLElement>("[autofocus]") || a11yFocusables(d).find((e) => !e.matches("[data-x],[data-mclose],.hr-ib.sm,.bi-ib.sm")) || a11yFocusables(d)[0]; if (f) try { f.focus({ preventScroll: true }); } catch { /* gone */ } }, 90);
  });
  [...OPEN].forEach((d) => {
    if (now.has(d)) return; OPEN.delete(d); const p = PREV.get(d);
    const back = () => { const a = document.activeElement; if (p && p.isConnected && a11yVis(p) && (!a || a === document.body || !a.isConnected || d.contains(a))) try { p.focus({ preventScroll: true }); } catch { /* gone */ } };
    setTimeout(back, 40); setTimeout(back, 420);
  });
}

/* 7 · demo desktop folders follow the interface language (unless renamed) */
const SEEDK = ["sdProjects", "sdTasks", "dkSeedDocs", "sdPatients", "sdMockups"];
type It = { type?: string; name?: string; tk?: string; kids?: It[] };
export function a11yFolders() {
  try {
    const names: Record<string, string> = {}; SEEDK.forEach((k) => (["en", "fr", "de", "ar"] as Lang[]).forEach((L) => { const v = translate(L, k); if (v && v !== k) names[v] = k; }));
    let ch = 0; const st = useShell.getState(); const L = lang();
    const walk = (list?: It[]) => (list || []).forEach((it) => { if (it && it.type === "folder") { const k = it.tk || names[it.name!]; if (k && names[it.name!] === k) { const v = translate(L, k); if (it.name !== v) { it.name = v; ch++; } it.tk = k; } walk(it.kids); } });
    const desks = st.desks.map((d) => ({ ...d, items: JSON.parse(JSON.stringify(d.items || [])) as It[] }));
    desks.forEach((d) => walk(d.items));
    if (ch) { useShell.setState({ desks: desks as typeof st.desks }); useShell.getState().saveDesks(); }
  } catch { /* desktop not ready */ }
}

let installed = false;
export function installA11y() {
  if (installed || typeof window === "undefined") return; installed = true;
  let t = 0 as unknown as ReturnType<typeof setTimeout> | 0, m: ReturnType<typeof setTimeout> | undefined;
  new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; try { a11yName(); } catch { /* ignore */ } }, 250); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  a11yName();
  new MutationObserver(() => { clearTimeout(m); m = setTimeout(() => { try { a11yScanModals(); } catch { /* ignore */ } }, 30); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "aria-modal", "style"] });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.defaultPrevented) return; const a = document.activeElement as HTMLElement | null; let d = a?.closest?.<HTMLElement>('[role="dialog"][aria-modal="true"]') || null;
    if (!d) { const w = a?.closest?.(".os-win"); if (!w) return; d = [...w.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].filter(a11yVis).pop() || null; if (!d) return; }
    if (d.closest(".tsw,.xp")) return; const f = a11yFocusables(d); if (!f.length) return; const i = f.indexOf(a!);
    if (!d.contains(a)) { e.preventDefault(); f[0].focus(); return; }
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }, true);
  /* 5 · Planning drawer: Escape closes it (the drawer itself is made a dialog in planning.ts) */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented) return; const d = (e.target as Element)?.closest?.(".pl-drw"); if (!d) return;
    if (!PL.ui.drawer) return; if (document.querySelector('.plapp [role="dialog"][aria-modal="true"]')) return; e.preventDefault(); e.stopPropagation(); plDrawer(null);
  }, true);
  /* 6 · skip link */
  const skip = () => {
    const mm = document.querySelector<HTMLElement>("main.main"); if (!mm) { setTimeout(skip, 200); return; } if (!mm.id) mm.id = "mainContent"; if (!mm.hasAttribute("tabindex")) mm.setAttribute("tabindex", "-1");
    const a = document.createElement("a"); a.className = "skip-link"; a.href = "#" + mm.id; const lbl = () => L4("Aller au contenu principal|Skip to main content|Zum Hauptinhalt springen|انتقل إلى المحتوى الرئيسي"); a.textContent = lbl();
    a.addEventListener("click", (e) => { e.preventDefault(); const w = osTopWin(); const el = w && !w.min ? winEls.get(w.key) : null; const tg = el ? (a11yFocusables(el)[0] || el) : mm; try { tg.focus({ preventScroll: true }); } catch { /* gone */ } });
    a.addEventListener("focus", () => { a.textContent = lbl(); }); document.body.insertBefore(a, document.body.firstChild);
  };
  skip();
  /* 7 · on every language change, and once after start */
  new MutationObserver(() => a11yFolders()).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  setTimeout(a11yFolders, 600);
}
