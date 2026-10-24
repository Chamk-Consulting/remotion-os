"use client";
/**
 * Transitions engine — catch-up slice S6, part 1 (Remotion OS v74–v79, v94 L28531–L28794).
 *
 * Desktop and workspace switching effects (classic, cube, carousel, flip, fade, none), speed and 3D depth, icons /
 * widgets / open windows that follow the effect, a frame-rate guard, motion hygiene and the shared motion language for
 * apps. Same rules and keyframes as the HTML file; the shell is reached through its hook points (`deskFx`, `winFx`,
 * `wsFx`) instead of reassigning globals. Default settings keep the original behaviour ("classic").
 */
import { flushSync } from "react-dom";
import { toast } from "@/os/ai/ai";
import { lkRM, useLock } from "@/os/lock/lock";
import { useShell, osDid, osWsSave, wsSaveFx } from "@/os/state/shell";
import { deskFx, slideSpaceClassic, dkSwitch } from "@/os/desktop/DesktopsPanel";
import { useDkWins } from "@/os/desktop/windows";
import { closeDkMenu } from "@/os/menu/DkMenu";
import { winFx, osSlideWins, OSW, winEls, osDeskApply, osVis, osTopWin, osFocus, useWm, wmFrame, winClass, osxTok, type Win } from "@/os/windows/wm";
import { trW12, trW13, installTrSettings } from "./settings";
import { XP } from "./state";
import { wsFx, wsSwitchClassic, wsKeep, wsSwapTo } from "@/os/windows/workspaces";
import { MI } from "@/os/shortcuts/catalogue";

/* ---------------- settings ---------------- */
export const TR_KEY = "remotion-transitions";
/* v86 adds "cube" to the workspace effects (spliced in second place) */
export const TR_DESK = ["classic", "cube", "carousel", "flip", "fade", "none"] as const, TR_WS = ["classic", "cube", "flip", "fade", "none"] as const;
type Eff = (typeof TR_DESK)[number];
export const TR_SPEED: Record<string, number> = { fast: .7, normal: 1, soft: 1.35 };
export const TR_DEPTH: Record<string, { p: number; s: number; a: number }> = { light: { p: 2600, s: .94, a: 28 }, medium: { p: 1800, s: .9, a: 38 }, strong: { p: 1200, s: .84, a: 50 } };
export type TrSt = { v: 1; desk: Eff; ws: (typeof TR_WS)[number]; speed: string; depth: string; icons: "fade" | "follow"; widgets: "fade" | "follow"; windows: "follow" | "fade"; appStyle: "expressive" | "calm"; gestures: "pad" | "all" | "off"; overview: "desks" | "both" };
type Anim = { eff: string; dir: number; at: number; D: number; EE: string };
export const TR: { st: TrSt | null; fps: number[]; auto: boolean; faces: HTMLElement[]; anim: Anim | null; winAnims: Animation[]; winHidden: HTMLElement[]; winList: Win[];   lastWhy: { why: string; at: number } | null; frame: number; frameKey: string | null; frameEl: HTMLElement | null; keyLbl: string | null;
  MO: { dur: Record<string, number>; ease: Record<string, string> } } = {
  st: null, fps: [], auto: false, faces: [], anim: null, winAnims: [], winHidden: [], winList: [], lastWhy: null, frame: 0, frameKey: null, frameEl: null, keyLbl: null,
  MO: { dur: { micro: 150, small: 250, medium: 400, large: 600 }, ease: { std: "cubic-bezier(.2,0,0,1)", enter: "cubic-bezier(.05,.7,.1,1)", exit: "cubic-bezier(.3,0,.8,.15)", spring: "cubic-bezier(.2,1.25,.35,1)", calm: "cubic-bezier(.2,.8,.2,1)" } },
};
const lang = () => ({ fr: 0, en: 1, de: 2, ar: 3 } as Record<string, number>)[document.documentElement.lang] ?? 1;
const L4 = (s: string) => { const p = s.split("|"); return p[lang()] || p[0]; };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const W1: Record<string, string> = {
  title: "Transitions|Transitions|Übergänge|الانتقالات",
  desk: "Changement de bureau|Desktop switch|Desktopwechsel|تبديل سطح المكتب",
  ws: "Changement d’espace de travail|Workspace switch|Arbeitsbereich wechseln|تبديل مساحة العمل",
  speed: "Vitesse|Speed|Geschwindigkeit|السرعة", depth: "Intensité 3D|3D intensity|3D-Intensität|شدة ثلاثية الأبعاد",
  fast: "Rapide|Fast|Schnell|سريع", normal: "Normale|Normal|Normal|عادي", soft: "Douce|Gentle|Sanft|هادئ",
  light: "Légère|Light|Leicht|خفيفة", medium: "Moyenne|Medium|Mittel|متوسطة", strong: "Marquée|Strong|Stark|قوية",
  classic: "Classique|Classic|Klassisch|كلاسيكي", cube: "Cube 3D|3D cube|3D-Würfel|مكعب", carousel: "Carrousel|Carousel|Karussell|دوار", flip: "Flip|Flip|Flip|قلب", fade: "Fondu|Fade|Überblenden|تلاشي", none: "Aucun|None|Keiner|بدون", zoom: "Zoom|Zoom|Zoom|تكبير",
  tryDesk: "Essayer|Try it|Testen|جرّب", tryWs: "Essayer|Try it|Testen|جرّب", reset: "Rétablir les réglages d’origine|Restore original settings|Ursprüngliche Einstellungen|استعادة الإعدادات الأصلية",
  rmNote: "« Réduire les mouvements » est actif : un simple fondu remplace ces effets.|“Reduce motion” is on: a simple fade replaces these effects.|„Bewegung reduzieren“ ist aktiv: einfache Überblendung.|«تقليل الحركة» مفعل: يُستبدل ذلك بتلاشٍ بسيط.",
  autoNote: "Animations saccadées détectées sur cet appareil : l’effet Classique est utilisé pour cette session.|Choppy animation detected on this device: Classic is used for this session.|Ruckelnde Animation erkannt: Klassisch wird verwendet.|تم رصد تقطع: يُستخدم التأثير الكلاسيكي لهذه الجلسة.",
  hint: "Classique = comportement d’origine (glissement pour les bureaux, zoom flou pour les espaces). Avec un effet 3D, fenêtres, icônes et widgets suivent ou font un fondu selon les réglages ci-dessous.|Classic = original behaviour (slide for desktops, blurred zoom for workspaces). With a 3D effect, windows, icons and widgets follow or fade according to the settings below.|Klassisch = ursprüngliches Verhalten. Bei einem 3D-Effekt folgen Fenster, Symbole und Widgets oder blenden über, je nach den Einstellungen unten.|كلاسيكي = السلوك الأصلي. مع تأثير ثلاثي الأبعاد، تتبع النوافذ والأيقونات والأدوات الحركة أو تتلاشى حسب الإعدادات أدناه.",
  resetDone: "Transitions d’origine rétablies|Original transitions restored|Ursprüngliche Übergänge wiederhergestellt|تمت استعادة الانتقالات الأصلية",
  /* v75 */
  during: "Pendant la transition|During the transition|Während des Übergangs|أثناء الانتقال", icons: "Icônes du bureau|Desktop icons|Desktop-Symbole|أيقونات سطح المكتب", widgets: "Widgets|Widgets|Widgets|الأدوات",
  folFade: "Fondu (actuel)|Fade (current)|Überblenden (aktuell)|تلاشٍ (الحالي)", follow: "Suivent le bureau|Follow the desktop|Folgen dem Desktop|تتبع سطح المكتب",
  folHint: "Le suivi des icônes et widgets est remplacé par un fondu si une saisie ou un déplacement d’icône est en cours. Les fenêtres ouvertes ont leur propre réglage ci-dessous.|Icons and widgets fall back to a fade while typing or dragging an icon. Open windows have their own setting below.|Symbole und Widgets werden bei Eingabe oder Ziehen übergeblendet. Offene Fenster haben unten eine eigene Einstellung.|تتحول الأيقونات والأدوات إلى تلاشٍ أثناء الكتابة أو سحب أيقونة. للنوافذ المفتوحة إعدادها الخاص أدناه.",
  /* v76 */
  windows: "Fenêtres ouvertes|Open windows|Offene Fenster|النوافذ المفتوحة", wfollow: "Suivent le bureau|Follow the desktop|Folgen dem Desktop|تتبع سطح المكتب", wfade: "Fondu|Fade|Überblenden|تلاشٍ",
  wHint: "Fondu automatique sur téléphone, avec beaucoup de grandes fenêtres, ou pendant une saisie dans une fenêtre.|Automatic fade on phones, with many large windows, or while typing in a window.|Automatisches Überblenden auf Telefonen, bei vielen großen Fenstern oder während der Eingabe.|تلاشٍ تلقائي على الهاتف أو مع نوافذ كبيرة كثيرة أو أثناء الكتابة.",
  /* v79 */
  appStyle: "Style des applications|App motion style|Bewegungsstil der Apps|نمط حركة التطبيقات", expressive: "Expressif (actuel)|Expressive (current)|Ausdrucksstark (aktuell)|معبّر (الحالي)", calm: "Sobre|Calm|Ruhig|هادئ",
  hint5: "« Sobre » retire les rebonds dans les fenêtres d’applications (dossiers, agendas, documents). La vitesse s’applique aussi aux animations dans les applications.|“Calm” removes overshoot inside app windows (records, calendars, documents). Speed also applies to animations inside apps.|„Ruhig“ entfernt Nachschwingen in App-Fenstern. Die Geschwindigkeit gilt auch in Apps.|«هادئ» يزيل الارتداد داخل نوافذ التطبيقات. تنطبق السرعة أيضًا داخل التطبيقات.",
};
export const trW = (k: string) => L4(W1[k] || k);
const DEF: TrSt = { v: 1, desk: "classic", ws: "classic", speed: "normal", depth: "light", icons: "fade", widgets: "fade", windows: "follow", appStyle: "expressive", gestures: "pad", overview: "desks" };
export function trSt(): TrSt {
  if (TR.st) return TR.st;
  let s: Partial<TrSt> | null = null; try { s = JSON.parse(localStorage.getItem(TR_KEY) || "null"); } catch { /* unreadable: defaults */ }
  if (!s || typeof s !== "object") s = {};
  const o: TrSt = { ...DEF };
  if ((TR_DESK as readonly string[]).includes(s.desk as string)) o.desk = s.desk as Eff;
  if ((TR_WS as readonly string[]).includes(s.ws as string)) o.ws = s.ws as TrSt["ws"];
  if (TR_SPEED[s.speed as string]) o.speed = s.speed as string;
  if (TR_DEPTH[s.depth as string]) o.depth = s.depth as string;
  if (s.icons === "follow") o.icons = "follow"; if (s.widgets === "follow") o.widgets = "follow"; if (s.windows === "fade") o.windows = "fade"; if (s.appStyle === "calm") o.appStyle = "calm";
  /* v82 / v84 / v86: gestures default "pad" (trackpad only), overview default "desks"; read back from storage as the HTML
     file does (v86 fix): only "off" and "both" are restored — "all" (touch) is not, a v94 quirk kept for parity */
  o.gestures = s.gestures === "off" ? "off" : "pad"; o.overview = s.overview === "both" ? "both" : "desks";
  TR.st = o; return o;
}
export function trSave() { try { localStorage.setItem(TR_KEY, JSON.stringify(TR.st)); } catch { /* storage full or blocked */ } }
export const trRM = () => lkRM() || matchMedia("(prefers-reduced-motion: reduce)").matches;
const trDir = (d: number) => d * (document.documentElement.dir === "rtl" ? -1 : 1);
const $ = (id: string) => document.getElementById(id);
const wall = () => $("wall") as HTMLCanvasElement;
const shellEl = () => $("shell") as HTMLElement | null;
/** drawWall: paint the current desktop's wallpaper now (Wallpaper repaints in a layout effect). */
const drawWall = () => flushSync(() => useShell.setState({ wallDesk: useShell.getState().cur }));
let deskAnims: Animation[] = [];

/* frame-rate guard: two choppy 3D transitions in a row → Classic for the rest of the session */
function trWatch(dur: number) {
  const t0 = performance.now(); let n = 0;
  const f = (t: number) => { n++; if (t - t0 < dur) requestAnimationFrame(f); else { if (document.visibilityState !== "visible") return; const fps = n / (dur / 1000); TR.fps.push(fps); if (TR.fps.length > 2) TR.fps.shift(); if (TR.fps.length === 2 && TR.fps.every((x) => x < 24)) TR.auto = true; } };
  requestAnimationFrame(f);
}

/* keyframes for each desktop effect: [old capture, new wallpaper] */
type KF = Keyframe[];
function trFrames(eff: string, d: number, dp: { p: number; s: number; a: number }): [KF, KF] {
  const P = `perspective(${dp.p}px)`;
  if (eff === "cube") return [[{ transformOrigin: d > 0 ? "100% 50%" : "0% 50%", transform: `${P} translateX(0) rotateY(0deg)`, filter: "brightness(1)" }, { transformOrigin: d > 0 ? "100% 50%" : "0% 50%", transform: `${P} translateX(${-d * 100}%) rotateY(${-d * 90}deg)`, filter: "brightness(.55)" }],
    [{ transformOrigin: d > 0 ? "0% 50%" : "100% 50%", transform: `${P} translateX(${d * 100}%) rotateY(${d * 90}deg)`, filter: "brightness(.55)" }, { transformOrigin: d > 0 ? "0% 50%" : "100% 50%", transform: `${P} translateX(0) rotateY(0deg)`, filter: "brightness(1)" }]];
  if (eff === "carousel") return [[{ transform: `${P} translateX(0) rotateY(0deg) scale(1)`, opacity: 1 }, { transform: `${P} translateX(${-d * 62}%) rotateY(${d * dp.a}deg) scale(${dp.s - .1})`, opacity: 0 }],
    [{ transform: `${P} translateX(${d * 62}%) rotateY(${-d * dp.a}deg) scale(${dp.s - .1})`, opacity: 0 }, { transform: `${P} translateX(0) rotateY(0deg) scale(1)`, opacity: 1 }]];
  if (eff === "flip") return [[{ transform: `${P} rotateY(0deg) scale(1)`, opacity: 1 }, { transform: `${P} rotateY(${-d * 90}deg) scale(${dp.s})`, opacity: 1, offset: .5 }, { transform: `${P} rotateY(${-d * 90}deg) scale(${dp.s})`, opacity: 0 }],
    [{ transform: `${P} rotateY(${d * 90}deg) scale(${dp.s})`, opacity: 0 }, { transform: `${P} rotateY(${d * 90}deg) scale(${dp.s})`, opacity: 0, offset: .5 }, { transform: `${P} rotateY(${d * 90}deg) scale(${dp.s})`, opacity: 1, offset: .5001 }, { transform: `${P} rotateY(0deg) scale(1)`, opacity: 1 }]];
  if (eff === "classic") return [[{ transform: "translateX(0px) scale(1)", filter: "brightness(1)" }, { transform: `translateX(${-d * 50}vw) scale(.94)`, filter: "brightness(.82)", offset: .5 }, { transform: `translateX(${-d * 100}vw) scale(1)`, filter: "brightness(.9)" }],
    [{ transform: `translateX(${d * 100}vw) scale(1)`, filter: "brightness(.9)" }, { transform: `translateX(${d * 50}vw) scale(.94)`, filter: "brightness(.82)", offset: .5 }, { transform: "translateX(0px) scale(1)", filter: "brightness(1)" }]];
  return [[{ opacity: 1 }, { opacity: 0 }], [{ opacity: 1 }, { opacity: 1 }]];
}
function trTiming(eff: string, S: TrSt) { return { D: Math.round((eff === "fade" ? 520 : eff === "flip" ? 900 : 820) * (eff === "classic" ? 1 : TR_SPEED[S.speed])), EE: eff === "flip" ? "linear" : eff === "classic" ? "cubic-bezier(.72,0,.24,1)" : "cubic-bezier(.65,0,.25,1)" }; }
const capture = () => { const w = wall(); const old = document.createElement("canvas"); old.id = "wallOld"; old.setAttribute("aria-hidden", "true"); old.width = w.width; old.height = w.height; try { old.getContext("2d")!.drawImage(w, 0, 0); } catch { /* tainted or empty */ } return old; };
const finishDesk = () => { deskAnims.forEach((a) => { try { a.finish(); } catch { /* gone */ } }); deskAnims = []; $("wallOld")?.remove(); };

/* ---------------- v74 · desktop switch ---------------- */
type DeskO = { preview?: boolean; eff?: string };
function trDesk74(dir: number, o: DeskO = {}) {
  const S = trSt(); const eff = TR.auto && !o.preview ? "classic" : (o.eff || S.desk);
  if (eff === "classic" && !o.preview) return slideSpaceClassic(dir);
  if (trRM()) { if (o.preview) { toast(trW("rmNote")); return; } return slideSpaceClassic(dir); }
  finishDesk();
  if (eff === "none") { drawWall(); return; }
  const d = trDir(dir), dp = TR_DEPTH[S.depth], D = trTiming(eff, S).D; if (!o.preview) try { dkSwitch(Math.round(D * .45)); } catch { /* no layer */ }
  const w = wall(), old = capture(); w.after(old); if (!o.preview) drawWall();
  document.body.classList.add("dk-switch", "tr-3d"); const E = "cubic-bezier(.65,0,.25,1)";
  const [fo, fn] = trFrames(eff, d, dp); const EE = eff === "flip" ? "linear" : eff === "classic" ? "cubic-bezier(.72,0,.24,1)" : E;
  const a1 = old.animate(fo, { duration: D, easing: EE, fill: "forwards" }), a2 = w.animate(fn, { duration: D, easing: EE });
  const main = document.querySelector(".main"), dock = $("dock"); const L = [a1, a2];
  if (main && !o.preview) L.push(main.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-d * 3}vw) scale(.985)`, offset: .4 }, { opacity: 0, transform: `translateX(${d * 3}vw) scale(.985)`, offset: .6 }, { opacity: 1, transform: "none" }], { duration: D, easing: "ease-in-out", composite: "add" }));
  if (dock) L.push(dock.animate([{ transform: "translateY(0)" }, { transform: "translateY(6px)", offset: .5 }, { transform: "translateY(0)" }], { duration: D, easing: E, composite: "add" }));
  deskAnims = L;
  const end = () => { old.remove(); document.body.classList.remove("dk-switch", "tr-3d"); }; a1.onfinish = end; a1.oncancel = end; if (eff !== "fade" && eff !== "classic" && !o.preview) trWatch(D);
}

/* ---------------- v74 · workspace switch ---------------- */
const liveEls = () => [document.querySelector<HTMLElement>(".main"), ...OSW().filter((w) => !w.off && !w.min).map((w) => winEls.get(w.key))].filter(Boolean) as HTMLElement[];
const winElsShown = () => OSW().filter((w) => !w.off && !w.min).map((w) => winEls.get(w.key)).filter(Boolean) as HTMLElement[];
function trWsSwitch74(from: number, to: number, thenDid: string | null, o: { preview?: boolean; eff?: string } = {}) {
  const S = trSt(); const eff = o.eff || S.ws; if (o.preview && trRM()) { toast(trW("rmNote")); return; }
  if (!o.preview && (eff === "classic" || trRM() || (TR.auto && eff !== "none"))) return wsSwitchClassic(from, to, thenDid);
  const swap = () => { if (o.preview) return; wsSwapTo(to, thenDid); };
  let tk = 0; if (!o.preview) { tk = ++osxTok.n; wsKeep(from); }
  if (eff === "none") { swap(); return; }
  finishDesk();
  const dp = TR_DEPTH[S.depth], D = Math.round((eff === "fade" ? 560 : 900) * TR_SPEED[S.speed]), P = `perspective(${dp.p}px)`, d = trDir(to >= from ? 1 : -1);
  const w = wall(), old = capture(); w.after(old);
  document.body.classList.add("tr-3d");
  const fo: KF = eff === "flip" ? [{ transform: `${P} rotateY(0deg) scale(1)`, filter: "brightness(1)", opacity: 1 }, { transform: `${P} rotateY(${-d * 90}deg) scale(${dp.s})`, filter: "brightness(.6)", opacity: 1, offset: .5 }, { transform: `${P} rotateY(${-d * 90}deg) scale(${dp.s})`, opacity: 0 }] : [{ opacity: 1 }, { opacity: 0 }];
  const fn: KF = eff === "flip" ? [{ transform: `${P} rotateY(${d * 90}deg) scale(${dp.s})`, opacity: 0 }, { transform: `${P} rotateY(${d * 90}deg) scale(${dp.s})`, opacity: 0, offset: .5 }, { transform: `${P} rotateY(${d * 90}deg) scale(${dp.s})`, filter: "brightness(.6)", opacity: 1, offset: .5001 }, { transform: `${P} rotateY(0deg) scale(1)`, filter: "brightness(1)", opacity: 1 }] : [{ opacity: 1 }, { opacity: 1 }];
  const a1 = old.animate(fo, { duration: D, easing: "linear", fill: "forwards" }), a2 = w.animate(fn, { duration: D, easing: "linear" }); const L: Animation[] = [a1, a2];
  const outs = liveEls(); const w3 = eff === "flip" && !o.preview && trWinOK(outs.filter((el) => el.classList.contains("os-win")));
  outs.forEach((el) => L.push(w3 && el.classList.contains("os-win") ? trWinFlip(el, D / 2, d, dp, true) : el.animate([{ opacity: 1 }, { opacity: 0, offset: .38 }, { opacity: 0 }], { duration: D / 2, easing: "ease-in", fill: "forwards" })));
  if (w3) document.body.classList.add("tr-winmov", "tr-win3d");
  setTimeout(() => {
    if (!o.preview && tk !== osxTok.n) return;
    outs.forEach((el) => el.getAnimations().forEach((a) => { if (L.includes(a)) try { a.cancel(); } catch { /* gone */ } })); swap();
    liveEls().forEach((el, k) => { if (w3 && el.classList.contains("os-win")) trWinFlip(el, D / 2, d, dp, false); else el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D * .45, delay: k * 25, easing: "ease-out", fill: "backwards" }); });
    if (w3) setTimeout(() => document.body.classList.remove("tr-winmov", "tr-win3d"), D / 2 + 40);
  }, D / 2);
  deskAnims = L; const end = () => { old.remove(); document.body.classList.remove("tr-3d"); }; a1.onfinish = end; a1.oncancel = end; if (eff === "flip" && !o.preview) trWatch(D);
}
function trWs(o: { eff?: string } = {}) { try { const k = useShell.getState().selWs; return trWsSwitch(k, k, null, { preview: true, ...o }); } catch { /* nothing to preview */ } }

/* ---------------- v75 · icons & widgets follow (frozen faces) ---------------- */
const trWidgetsEl = () => document.querySelector<HTMLElement>(".main .widgets");
const dkLayer = () => $("dkLayer");
function trFolOn() { const S = trSt(); return S.icons === "follow" || S.widgets === "follow"; }
function trFolBlocked() {
  const a = document.activeElement, Wd = trWidgetsEl(), L = dkLayer();
  if (a && a !== document.body && ((Wd && Wd.contains(a)) || (L && L.contains(a)))) return true;
  if (L?.classList.contains("dragging")) return true; if (useShell.getState().desksOpen) return true;
  if (document.querySelector("#desks .desk-name input, #desks input")) return true; /* a desktop being renamed */
  return false;
}
function trClone(el: HTMLElement) {
  const r = el.getBoundingClientRect(); const c = el.cloneNode(true) as HTMLElement;
  [c, ...c.querySelectorAll<HTMLElement>("*")].forEach((x) => { ["id", "for", "name", "aria-controls", "aria-labelledby", "aria-describedby", "aria-owns", "aria-activedescendant", "tabindex", "autofocus"].forEach((k) => x.removeAttribute?.(k)); });
  c.querySelectorAll(".dk-on,.on-drop,.dk-drop").forEach((x) => x.classList.remove("dk-on", "on-drop", "dk-drop")); c.querySelectorAll<HTMLElement>(".dk-ic").forEach((x) => { x.style.animation = "none"; });
  const src = el.querySelectorAll("canvas"), dst = c.querySelectorAll("canvas"); dst.forEach((k, i) => { try { k.width = src[i].width; k.height = src[i].height; k.getContext("2d")!.drawImage(src[i], 0, 0); } catch { /* empty */ } });
  c.setAttribute("aria-hidden", "true"); c.inert = true; c.classList.add("tr-clone");
  Object.assign(c.style, { position: "absolute", inset: "auto", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", margin: "0", transition: "none", opacity: "1", transform: "none", pointerEvents: "none", visibility: "visible" });
  return c;
}
function trSet() {
  const S = trSt(), out: HTMLElement[] = []; const L = dkLayer();
  if (S.icons === "follow" && L && L.getClientRects().length && L.querySelector(".dk-ic")) out.push(trClone(L));
  const Wd = trWidgetsEl(); if (S.widgets === "follow" && Wd && !shellEl()?.classList.contains("widgets-hidden") && Wd.getClientRects().length) out.push(trClone(Wd));
  return out;
}
function trFace(sets: HTMLElement[]) {
  const f = document.createElement("div"); f.className = "tr-face"; f.setAttribute("aria-hidden", "true"); f.inert = true;
  const w = wall(); const cv = document.createElement("canvas"); cv.width = w.width; cv.height = w.height; try { cv.getContext("2d")!.drawImage(w, 0, 0); } catch { /* empty */ }
  f.appendChild(cv); sets.forEach((c) => f.appendChild(c)); TR.faces.push(f); return f;
}
function trLive(on: boolean) {
  const S = trSt(); const Wd = trWidgetsEl(); const L: HTMLElement[] = []; const D = dkLayer();
  if (S.icons === "follow" && D) L.push(D); if (S.widgets === "follow" && Wd) L.push(Wd);
  L.forEach((el) => { el.style.opacity = on ? "" : "0"; el.style.pointerEvents = on ? "" : "none"; });
  const w = wall(), sh = shellEl();
  if (!on) { w.style.transition = "none"; w.style.opacity = "0"; sh?.classList.add("tr-nowt"); } else { w.style.opacity = ""; void w.offsetWidth; w.style.transition = ""; sh?.classList.remove("tr-nowt"); }
}
function trFadeRest(D: number) {
  const S = trSt(), Wd = trWidgetsEl(), L: Animation[] = []; const k: KF = [{ opacity: 1 }, { opacity: 0, offset: .4 }, { opacity: 0, offset: .6 }, { opacity: 1 }]; const Ly = dkLayer();
  if (S.icons !== "follow" && Ly) L.push(Ly.animate(k, { duration: D, easing: "ease-in-out" })); if (S.widgets !== "follow" && Wd) L.push(Wd.animate(k, { duration: D, easing: "ease-in-out" }));
  return L;
}
function trFacesClear() { TR.faces.forEach((f) => f.remove()); TR.faces = []; trLive(true); document.body.classList.remove("dk-switch", "tr-3d", "tr-fol"); }
/** The desk content switches now (as dkSwitch does, but synchronously and without the entrance replay). */
function deskNow() {
  try { const st = useShell.getState(); st.setSel([]); useDkWins.setState((w) => ({ wins: w.wins.filter((x) => x.kind === "trash") })); closeDkMenu(); } catch { /* nothing open */ }
  shellEl()?.classList.add("tr-nowt");
  flushSync(() => { const s2 = useShell.getState(); useShell.setState({ wallDesk: s2.cur, shownDesk: s2.cur, iconAnim: 0, widgetsHidden: !s2.desks[s2.cur]?.w }); });
}
function trDesk75(dir: number, o: DeskO = {}) {
  const S = trSt(); const eff = TR.auto && !o.preview ? "classic" : (o.eff || S.desk);
  if (o.preview || !trFolOn() || eff === "none" || trRM() || trFolBlocked()) return trDesk74(dir, o);
  finishDesk(); trFacesClear();
  const d = trDir(dir), dp = TR_DEPTH[S.depth], D = trTiming(eff, S).D;
  const fOld = trFace(trSet());
  deskNow();
  const fNew = trFace(trSet()); wall().after(fNew); fNew.after(fOld); trLive(false); document.body.classList.add("dk-switch", "tr-3d", "tr-fol");
  const [fo, fn] = trFrames(eff, d, dp); const EE = trTiming(eff, S).EE;
  const a1 = fOld.animate(fo, { duration: D, easing: EE, fill: "forwards" }), a2 = fNew.animate(fn, { duration: D, easing: EE, fill: "forwards" }); const L = [a1, a2, ...trFadeRest(D)];
  const dock = $("dock"); if (dock) L.push(dock.animate([{ transform: "translateY(0)" }, { transform: "translateY(6px)", offset: .5 }, { transform: "translateY(0)" }], { duration: D, easing: EE, composite: "add" }));
  deskAnims = L; const end = () => trFacesClear(); a1.onfinish = end; a1.oncancel = end; if (eff !== "fade" && eff !== "classic") trWatch(D);
}
function trWsSwitch75(from: number, to: number, thenDid: string | null, o: { preview?: boolean; eff?: string } = {}) {
  const S = trSt(); const eff = o.eff || S.ws;
  if (o.preview || !trFolOn() || eff === "classic" || eff === "none" || trRM() || TR.auto || trFolBlocked()) return trWsSwitch74(from, to, thenDid, o);
  const tk = ++osxTok.n; wsKeep(from); finishDesk(); trFacesClear();
  const dp = TR_DEPTH[S.depth], D = Math.round((eff === "fade" ? 560 : 900) * TR_SPEED[S.speed]), H = Math.round(D / 2), P = `perspective(${dp.p}px)`, d = trDir(to >= from ? 1 : -1);
  const fOld = trFace(trSet()); wall().after(fOld); trLive(false); document.body.classList.add("tr-3d", "tr-fol");
  const fo: KF = eff === "flip" ? [{ transform: `${P} rotateY(0deg) scale(1)`, filter: "brightness(1)" }, { transform: `${P} rotateY(${-d * 90}deg) scale(${dp.s})`, filter: "brightness(.6)" }] : [{ opacity: 1 }, { opacity: 0 }];
  const L: Animation[] = [fOld.animate(fo, { duration: H, easing: "ease-in", fill: "forwards" }), ...trFadeRest(D)]; const ws0 = winElsShown(); const w3 = eff === "flip" && trWinOK(ws0);
  if (w3) document.body.classList.add("tr-winmov", "tr-win3d");
  ws0.forEach((el) => L.push(w3 ? trWinFlip(el, H, d, dp, true) : el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: H * .8, easing: "ease-in", fill: "forwards" }))); deskAnims = L;
  setTimeout(() => {
    if (tk !== osxTok.n) { trFacesClear(); return; }
    ws0.forEach((el) => el.getAnimations().forEach((a) => { if (L.includes(a)) try { a.cancel(); } catch { /* gone */ } }));
    wsSwapTo(to, thenDid); deskNow();
    const fNew = trFace(trSet()); fOld.after(fNew);
    const fn: KF = eff === "flip" ? [{ transform: `${P} rotateY(${d * 90}deg) scale(${dp.s})`, filter: "brightness(.6)" }, { transform: `${P} rotateY(0deg) scale(1)`, filter: "brightness(1)" }] : [{ opacity: 0 }, { opacity: 1 }];
    const a2 = fNew.animate(fn, { duration: H, easing: "ease-out", fill: "forwards" }); deskAnims = [a2];
    winElsShown().forEach((el, k) => { if (w3) trWinFlip(el, H, d, dp, false); else el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: H * .9, delay: k * 25, easing: "ease-out", fill: "backwards" }); });
    if (w3) setTimeout(() => document.body.classList.remove("tr-winmov", "tr-win3d"), H + 40);
    a2.onfinish = () => trFacesClear(); a2.oncancel = () => trFacesClear();
  }, H);
  if (eff === "flip") trWatch(D);
}

/* ---------------- v76 · open windows follow the effect ---------------- */
/** v89c: transition animations (or any that holds its end state) are cancelled; others are finished so what waits for them still happens. */
export function trSettle(a: Animation) {
  try {
    const f = (a.effect as KeyframeEffect | null)?.getTiming ? a.effect!.getTiming().fill : "none";
    if (f === "forwards" || f === "both" || TR.winAnims.includes(a) || deskAnims.includes(a) || (a as unknown as { __trans?: boolean }).__trans) { a.cancel(); return; }
    a.finish();
  } catch { try { a.cancel(); } catch { /* gone */ } }
}
function trDesk(dir: number, o: DeskO = {}) {
  if (!o.preview) { const S = trSt(); const eff = (TR.auto || trRM()) ? "classic" : S.desk; TR.anim = { eff, dir, at: performance.now(), ...trTiming(eff, S) }; }
  return trDesk75(dir, o);
}
/* fallbacks: setting, phone, too much window surface, typing in a window, a window being moved or resized, a dialog, app mode (v77) */
function trWinOK0(list: (HTMLElement | { el: HTMLElement })[]) {
  if (document.body.classList.contains("os-appmode")) return false;
  if (list.some((x) => { const el = (x as { el: HTMLElement }).el || (x as HTMLElement); return !!el.querySelector?.('.hr-dlg,.dp-dlg,[role="dialog"][aria-modal="true"]'); })) return false;
  const S = trSt(); if (S.windows === "fade" || innerWidth < 720) return false;
  const sa = innerWidth * innerHeight; let big = 0, area = 0;
  list.forEach((x) => { const el = (x as { el: HTMLElement }).el || (x as HTMLElement); const r = el.getBoundingClientRect(); const a = r.width * r.height; area += a; if (a > sa * .25) big++; });
  if (big > 4 || area > sa * 2.2) return false;
  const a = document.activeElement as HTMLElement | null; if (a && a.closest?.(".os-win") && (a.matches("input,textarea,select") || a.isContentEditable)) return false;
  if (document.querySelector(".os-win.moving,.os-win.resizing,.os-win.rz")) return false;
  return true;
}
/* v87 M10 · the reason of the last automatic fade is kept and shown in the settings page */
function trWhy(list: (HTMLElement | { el: HTMLElement })[]) {
  const S = trSt(); if (S.windows === "fade") return "setting"; if (innerWidth < 720) return "phone"; if (document.body.classList.contains("os-appmode")) return "appmode";
  if (list.some((x) => { const el = (x as { el: HTMLElement }).el || (x as HTMLElement); return !!el.querySelector?.('.hr-dlg,.dp-dlg,[role="dialog"][aria-modal="true"]'); })) return "dialog";
  const a = document.activeElement as HTMLElement | null; if (a && a.closest?.(".os-win") && (a.matches("input,textarea,select") || a.isContentEditable)) return "typing";
  if (document.querySelector(".os-win.moving,.os-win.resizing,.os-win.rz")) return "moving"; return "big";
}
function trWinOK(list: (HTMLElement | { el: HTMLElement })[]) { const r = trWinOK0(list); if (!r && list && list.length) TR.lastWhy = { why: trWhy(list), at: Date.now() }; else if (r) TR.lastWhy = null; return r; }
function trWinFrames(eff: string, d: number, dp: { p: number; s: number; a: number }, r: DOMRect, old: boolean): KF {
  const Wd = innerWidth, H = innerHeight, P = `perspective(${dp.p}px)`;
  const O = eff === "cube" ? (old ? [d > 0 ? Wd : 0, H / 2] : [d > 0 ? 0 : Wd, H / 2]) : [Wd / 2, H / 2]; const to = `${(O[0] - r.left).toFixed(1)}px ${(O[1] - r.top).toFixed(1)}px`;
  const f = (t: string, op?: number, off?: number) => { const k: Keyframe = { transformOrigin: to, transform: t }; if (op != null) k.opacity = op; if (off != null) k.offset = off; return k; };
  if (eff === "cube") return old ? [f(`${P} translateX(0px) rotateY(0deg)`), f(`${P} translateX(${-d * Wd}px) rotateY(${-d * 90}deg)`)] : [f(`${P} translateX(${d * Wd}px) rotateY(${d * 90}deg)`), f(`${P} translateX(0px) rotateY(0deg)`)];
  if (eff === "carousel") return old ? [f(`${P} translateX(0px) rotateY(0deg) scale(1)`, 1), f(`${P} translateX(${-d * .62 * Wd}px) rotateY(${d * dp.a}deg) scale(${dp.s - .1})`, 0)] : [f(`${P} translateX(${d * .62 * Wd}px) rotateY(${-d * dp.a}deg) scale(${dp.s - .1})`, 0), f(`${P} translateX(0px) rotateY(0deg) scale(1)`, 1)];
  return old ? [f(`${P} rotateY(0deg) scale(1)`, 1), f(`${P} rotateY(${-d * 90}deg) scale(${dp.s})`, 1, .5), f(`${P} rotateY(${-d * 90}deg) scale(${dp.s})`, 0)] : [f(`${P} rotateY(${d * 90}deg) scale(${dp.s})`, 0), f(`${P} rotateY(${d * 90}deg) scale(${dp.s})`, 0, .5), f(`${P} rotateY(${d * 90}deg) scale(${dp.s})`, 1, .5001), f(`${P} rotateY(0deg) scale(1)`, 1)];
}
function trWinFlip(el: HTMLElement, H: number, d: number, dp: { p: number; s: number }, out: boolean) {
  const Wd = innerWidth, Hh = innerHeight, P = `perspective(${dp.p}px)`; el.getAnimations().forEach(trSettle); const r = el.getBoundingClientRect(); const to = `${(Wd / 2 - r.left).toFixed(1)}px ${(Hh / 2 - r.top).toFixed(1)}px`;
  return out ? el.animate([{ transformOrigin: to, transform: `${P} rotateY(0deg) scale(1)` }, { transformOrigin: to, transform: `${P} rotateY(${-d * 90}deg) scale(${dp.s})` }], { duration: H, easing: "ease-in", fill: "forwards" })
    : el.animate([{ transformOrigin: to, transform: `${P} rotateY(${d * 90}deg) scale(${dp.s})` }, { transformOrigin: to, transform: `${P} rotateY(0deg) scale(1)` }], { duration: H, easing: "ease-out", fill: "backwards" });
}
function trHideFixed(els: HTMLElement[]) {
  els.forEach((el) => el.querySelectorAll<HTMLElement>('[role="menu"],[role="listbox"],[role="tooltip"],[class*="menu"],[class*="pop"],[class*="tip"],[class*="drop"]').forEach((x) => {
    if (x.offsetParent === null && getComputedStyle(x).position !== "fixed") return;
    if (getComputedStyle(x).position === "fixed" && !x.classList.contains("tr-winhide")) { x.classList.add("tr-winhide"); TR.winHidden.push(x); }
  }));
}
function trFocusFix() {
  const a = document.activeElement as HTMLElement | null; const w = a?.closest?.(".os-win"); if (!w || !w.classList.contains("os-off")) return;
  try { a!.blur(); } catch { /* detached */ }
  const top = osTopWin(); if (top) { try { osFocus(top.key); } catch { /* closing */ } const el = winEls.get(top.key); const f = el?.querySelector<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'); (f || el)?.focus?.({ preventScroll: true }); }
}
function trWinCleanup() { TR.winAnims.forEach((a) => { try { a.cancel(); } catch { /* gone */ } }); TR.winAnims = []; TR.winHidden.forEach((x) => x.classList.remove("tr-winhide")); TR.winHidden = []; document.body.classList.remove("tr-winmov", "tr-win3d"); setTimeout(trFocusFix, 0); }
const setOff = (key: string, off: boolean) => useWm.setState((s) => (s.wins[key] ? { wins: { ...s.wins, [key]: { ...s.wins[key], off } }, rev: s.rev + 1 } : s));
function trSlideWins(fromId: string, toId: string, dir: number) {
  { const S = trSt(); if (TR.auto && S.desk !== "classic" && OSW().some((w) => !w.min)) TR.lastWhy = { why: "slow", at: Date.now() }; } /* v87 */
  const A = TR.anim; TR.anim = null;
  if (!A || A.eff === "classic" || trRM()) return osSlideWins(fromId, toId, dir);
  const st = useShell.getState(); const ws = OSW().filter((w) => w.ws === st.selWs && !w.all && !w.min); const outs = ws.filter((w) => w.did === fromId), ins = ws.filter((w) => w.did === toId);
  /* windows of an interrupted switch that are in neither set: snap to their final state */
  TR.winList.forEach((w) => { if (!outs.some((x) => x.key === w.key) && !ins.some((x) => x.key === w.key)) { const cur = useWm.getState().wins[w.key]; if (cur) setOff(w.key, !osVis(cur)); } });
  trWinCleanup(); TR.winList = [...outs, ...ins];
  const tk = ++osxTok.n; if (A.eff === "none") { osDeskApply(); return; }
  const el = (w: Win) => winEls.get(w.key);
  [...outs, ...ins].forEach((w) => el(w)?.getAnimations().forEach(trSettle)); flushSync(() => ins.forEach((w) => setOff(w.key, false)));
  const S = trSt(), dp = TR_DEPTH[S.depth], d = trDir(dir); const all = [...outs, ...ins].map(el).filter(Boolean) as HTMLElement[]; const use3d = A.eff !== "fade" && trWinOK(all);
  document.body.classList.add("tr-winmov"); if (use3d) { document.body.classList.add("tr-win3d"); trHideFixed(all); }
  const left = Math.max(0, A.D - (performance.now() - A.at)); /* stay in step with the wallpaper that started a moment ago */
  outs.forEach((w) => { const e = el(w); if (e) TR.winAnims.push(e.animate(use3d ? trWinFrames(A.eff, d, dp, e.getBoundingClientRect(), true) : [{ opacity: 1 }, { opacity: 0 }], { duration: use3d ? A.D : Math.round(A.D * .5), delay: use3d ? left - A.D : 0, easing: use3d ? A.EE : "ease-in", fill: "forwards" })); });
  ins.forEach((w) => { const e = el(w); if (e) TR.winAnims.push(e.animate(use3d ? trWinFrames(A.eff, d, dp, e.getBoundingClientRect(), false) : [{ opacity: 0 }, { opacity: 1 }], { duration: use3d ? A.D : Math.round(A.D * .55), delay: use3d ? left - A.D : Math.round(A.D * .45), easing: use3d ? A.EE : "ease-out", fill: "both" })); });
  setTimeout(() => { if (osxTok.n === tk) { osDeskApply(); trWinCleanup(); TR.winList = []; } }, left + 40);
}

/* ---------------- v77 · motion hygiene ---------------- */
function trRmSync() { document.documentElement.classList.toggle("rm-on", !!lkRM()); }
/* ---------------- v79 · shared motion language for the apps ---------------- */
function trMoSync() { document.documentElement.classList.toggle("mo-calm", trSt().appStyle === "calm"); }
const trOvershoot = (e?: string) => { const m = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(e || ""); return !!m && (+m[2] > 1 || +m[4] > 1 || +m[2] < 0 || +m[4] < 0); };
function installAnimateNormaliser() {
  type An = Element["animate"] & { __tr?: boolean };
  const orig = Element.prototype.animate as An; if (orig.__tr) return;
  const fix = function (this: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes | null, opts?: number | KeyframeAnimationOptions) {
    try {
      const S = TR.st || trSt(); const fast = S.speed !== "normal", calm = S.appStyle === "calm";
      if ((fast || calm) && opts != null && !this.classList?.contains("os-win") && this.closest?.(".os-win") && !lkRM()) {
        const o: KeyframeAnimationOptions = typeof opts === "number" ? { duration: opts } : { ...opts };
        if (fast && typeof o.duration === "number") { const k = TR_SPEED[S.speed] || 1; o.duration = Math.round(o.duration * k); if (typeof o.delay === "number") o.delay = Math.round(o.delay * k); if (typeof o.endDelay === "number") o.endDelay = Math.round(o.endDelay * k); }
        if (calm) { if (trOvershoot(o.easing)) o.easing = TR.MO.ease.calm; if (Array.isArray(keyframes)) keyframes = keyframes.map((k) => (k && trOvershoot(k.easing) ? { ...k, easing: TR.MO.ease.calm } : k)); }
        return orig.call(this, keyframes, o);
      }
    } catch { /* fall through to the original */ }
    return orig.call(this, keyframes, opts);
  } as An;
  fix.__tr = true; Element.prototype.animate = fix;
}

/* ---------------- v86 · workspace cube ---------------- */
function trWsSwitch(from: number, to: number, thenDid: string | null, o: { preview?: boolean; eff?: string } = {}) {
  const S = trSt(); const eff = o.eff || S.ws;
  if (eff === "cube" && o.preview && trRM()) { toast(trW("rmNote")); return; } /* v89: never re-swap for a preview */
  if (eff !== "cube" || trRM() || (TR.auto && !o.preview)) return eff === "cube" ? wsSwitchClassic(from, to, thenDid) : trWsSwitch75(from, to, thenDid, o);
  const dp = TR_DEPTH[S.depth], D = Math.round(900 * TR_SPEED[S.speed]), EE = "cubic-bezier(.65,0,.25,1)", d = trDir(to >= from ? 1 : -1);
  let tk = 0; if (!o.preview) { tk = ++osxTok.n; wsKeep(from); }
  finishDesk(); try { trWinCleanup(); } catch { /* nothing */ }
  const w = wall(), old = capture(); w.after(old);
  const outs = o.preview ? [] : OSW().filter((x) => !x.min && !x.hidden && !x.off);
  if (!o.preview) { /* the same steps as the shell's own workspace swap */ wsSwapTo(to, thenDid); try { dkSwitch(Math.round(D * .45)); } catch { /* no layer */ } }
  const ins = o.preview ? [] : OSW().filter((x) => osVis(x) && !x.min && !x.off);
  document.body.classList.add("tr-3d", "dk-switch");
  const [fo, fn] = trFrames("cube", d, dp); const L: Animation[] = [old.animate(fo, { duration: D, easing: EE, fill: "forwards" }), w.animate(fn, { duration: D, easing: EE })];
  const main = document.querySelector(".main"); if (main && !o.preview) L.push(main.animate([{ opacity: 1 }, { opacity: 0, offset: .4 }, { opacity: 0, offset: .6 }, { opacity: 1 }], { duration: D, easing: "ease-in-out" }));
  if (!o.preview) {
    const els = (l: Win[]) => l.map((x) => winEls.get(x.key)).filter(Boolean) as HTMLElement[];
    const use3d = trSt().windows !== "fade" && trWinOK([...els(outs), ...els(ins)]);
    flushSync(() => outs.forEach((x) => setOff(x.key, false)));
    if (use3d) { document.body.classList.add("tr-winmov", "tr-win3d"); trHideFixed([...els(outs), ...els(ins)]); } else document.body.classList.add("tr-winmov");
    els(outs).forEach((el) => { el.getAnimations().forEach(trSettle); const a = el.animate(use3d ? trWinFrames("cube", d, dp, el.getBoundingClientRect(), true) : [{ opacity: 1 }, { opacity: 0 }], { duration: use3d ? D : Math.round(D * .5), easing: use3d ? EE : "ease-in", fill: "forwards" }); L.push(a); TR.winAnims.push(a); });
    els(ins).forEach((el) => { el.getAnimations().forEach(trSettle); const a = el.animate(use3d ? trWinFrames("cube", d, dp, el.getBoundingClientRect(), false) : [{ opacity: 0 }, { opacity: 1 }], { duration: use3d ? D : Math.round(D * .55), delay: use3d ? 0 : Math.round(D * .45), easing: use3d ? EE : "ease-out", fill: "both" }); L.push(a); TR.winAnims.push(a); });
  }
  deskAnims = L; let done = false;
  const end = () => { if (done) return; done = true; old.remove(); document.body.classList.remove("tr-3d", "dk-switch", "tr-winmov", "tr-win3d"); if (o.preview || tk === osxTok.n) { try { trWinCleanup(); } catch { /* nothing */ } osDeskApply(); } };
  L[0].onfinish = end; L[0].oncancel = end; if (!o.preview) trWatch(D);
}

/* ---------------- v89 · a pending workspace swap is finished before anything else switches ---------------- */
type Pend = { from: number; to: number; thenDid: string | null; desksBefore: unknown; curBefore: number };
const WSP: { p: Pend | null } = { p: null };
function trWsState(P: Pend) {
  const selNow = useShell.getState().selWs; useShell.setState({ selWs: P.to }); /* v89c: saves inside go under the workspace being finished */
  try { const st = useShell.getState(); st.wsStore[P.from] = { l: P.desksBefore as typeof st.desks, c: P.curBefore }; wsSwapTo(P.to, P.thenDid); flushSync(() => { const s2 = useShell.getState(); useShell.setState({ shownDesk: s2.cur, iconAnim: 0, widgetsHidden: !s2.desks[s2.cur]?.w }); }); osDeskApply(); }
  finally { useShell.setState({ selWs: selNow }); }
}
function trVisualReset() {
  deskAnims.forEach((a) => { try { a.cancel(); } catch { /* gone */ } }); deskAnims = []; $("wallOld")?.remove();
  try { trFacesClear(); } catch { /* nothing */ } try { trWinCleanup(); } catch { /* nothing */ }
  /* v89c: other window animations (close, minimise, move) are FINISHED, not cancelled: the shell waits for their end */
  document.querySelectorAll<HTMLElement>("#shell>.os-win").forEach((el) => el.getAnimations().forEach(trSettle));
  document.querySelector(".main")?.getAnimations().forEach((a) => { try { a.cancel(); } catch { /* gone */ } }); wall()?.getAnimations().forEach((a) => { try { a.cancel(); } catch { /* gone */ } });
  document.body.classList.remove("tr-3d", "tr-fol", "tr-winmov", "tr-win3d", "dk-switch");
}
let flushing = false;
export function trWsFlush() {
  const P = WSP.p; WSP.p = null; if (!P || flushing) return false; if (useShell.getState().desks !== P.desksBefore) return false; /* the swap already happened */
  flushing = true; try { osxTok.n++; trVisualReset(); trWsState(P); } finally { flushing = false; } return true;
}
/** Run before a workspace switch, in the HTML file's wrapper order (v89 flush, then v84 closes the overview). */
export const wsBefore: (() => void)[] = [];
/** Run after a workspace switch (v81: the dock's switcher button). */
export const wsAfter: (() => void)[] = [];
function wsSwitchOuter(from: number, to: number, thenDid: string | null) {
  trWsFlush(); wsBefore.forEach((f) => f());
  const st = useShell.getState(); const P: Pend = { from, to, thenDid, desksBefore: st.desks, curBefore: st.cur };
  trWsSwitch(from, to, thenDid);
  if (useShell.getState().desks === P.desksBefore && from !== to) WSP.p = P;
  wsAfter.forEach((f) => f());
}

/* ---------------- v83 · window frames follow speed and calm ---------------- */
function installFrameNormaliser() {
  wmFrame.run = (key, f) => { const pk = TR.frameKey, pe = TR.frameEl; TR.frameKey = key; TR.frameEl = winEls.get(key) || null; TR.frame++; try { return f(); } finally { TR.frame--; TR.frameKey = pk; TR.frameEl = pe; } };
  type An = Element["animate"] & { __tr?: boolean };
  const orig = Element.prototype.animate as An;
  const fx = function (this: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes | null, opts?: number | KeyframeAnimationOptions) {
    try {
      if (TR.frame > 0 && opts != null && this.classList?.contains("os-win") && (this === TR.frameEl || (TR.frameKey && winEls.get(TR.frameKey) === this)) && !trRM()) {
        const S = TR.st || trSt(); const fast = S.speed !== "normal", calm = S.appStyle === "calm";
        if (fast || calm) { const o: KeyframeAnimationOptions = typeof opts === "number" ? { duration: opts } : { ...opts }; if (fast && typeof o.duration === "number") o.duration = Math.round(o.duration * (TR_SPEED[S.speed] || 1)); if (calm && trOvershoot(o.easing)) o.easing = TR.MO.ease.calm; return orig.call(this, keyframes, o); }
      }
    } catch { /* fall through */ }
    return orig.call(this, keyframes, opts);
  } as An;
  fx.__tr = true; Element.prototype.animate = fx;
  /* maximise / snap / unsnap: the slower speed outlasts the shell's 460 ms clean-up, so a holding class keeps the transition */
  const holdT = new Map<string, ReturnType<typeof setTimeout>>();
  wmFrame.after = (_op, key) => { try { if (useWm.getState().wins[key] && trSt().speed === "soft" && !trRM()) { winClass(key, "anim-hold", true); clearTimeout(holdT.get(key)); holdT.set(key, setTimeout(() => winClass(key, "anim-hold", false), Math.round(420 * TR_SPEED.soft) + 60)); } } catch { /* closed */ } };
}
function trMoSpeedSync() { const sp = trSt().speed; if (sp === "normal") delete document.documentElement.dataset.moSpeed; else document.documentElement.dataset.moSpeed = sp; }

/* ---------------- v87 · M13 CSS inside apps follows "Rapide"; M11 measure ---------------- */
function installCssRetime() {
  const k = () => { const S = TR.st || trSt(); return S.speed === "fast" ? (TR_SPEED.fast || 1) : 1; }; /* v91: only "Rapide" retimes CSS in apps */
  const retime = (e: Event) => {
    const f = k(); if (f === 1 || trRM()) return; const t = e.target as HTMLElement | null; if (!t || !t.closest || t.classList?.contains("os-win") || !t.closest(".os-win")) return;
    try { t.getAnimations().forEach((a) => { const A = a as Animation & { transitionProperty?: string; animationName?: string; __tr?: number }; if ((A.transitionProperty && e.type === "transitionrun" && A.transitionProperty === (e as TransitionEvent).propertyName) || (A.animationName && e.type === "animationstart" && A.animationName === (e as AnimationEvent).animationName)) { if (!A.__tr) { A.__tr = 1; A.playbackRate = 1 / f; } } }); } catch { /* detached */ }
  };
  document.addEventListener("transitionrun", retime, true); document.addEventListener("animationstart", retime, true);
}
const L4c = (s: string) => L4(s);
function trMeasure(out: HTMLElement) {
  const S = trSt(); if (trRM()) { out.textContent = trW12("rmNone"); return; }
  out.textContent = trW12("measuring"); const eff = S.desk; const D = Math.round((eff === "fade" ? 520 : eff === "flip" ? 900 : 820) * (eff === "classic" ? 1 : TR_SPEED[S.speed]));
  const fr: number[] = []; let last = 0, t0 = 0;
  const tick = (t: number) => { if (!t0) { t0 = t; last = t; } else { fr.push(t - last); last = t; } if (t - t0 < D) requestAnimationFrame(tick); else done(); };
  const done = () => {
    if (!fr.length) { out.textContent = "—"; return; }
    const avg = fr.reduce((a, b) => a + b, 0) / fr.length, fps = Math.round(1000 / avg), worst = Math.round(Math.max(...fr));
    const v = fps >= 50 && worst < 50 ? "smooth" : fps >= 30 ? "ok" : "choppy"; const nav = navigator as Navigator & { deviceMemory?: number };
    const dev = [nav.hardwareConcurrency ? nav.hardwareConcurrency + " " + L4c("cœurs|cores|Kerne|أنوية") : "", nav.deviceMemory ? nav.deviceMemory + " " + L4c("Go|GB|GB|غيغابايت") : "", `${screen.width}×${screen.height} @${(devicePixelRatio || 1).toFixed(1)}x`].filter(Boolean).join(" · ");
    out.innerHTML = `<b>${esc(trW12(v))}</b> — ${fps} ${esc(trW12("fps"))}, ${esc(trW12("worst"))} ${worst} ms<br><small>${esc(trW(eff))} · ${esc(dev)}</small>`; out.dataset.v = v; out.dataset.fps = String(fps);
  };
  try { trDesk(1, { preview: true, eff }); } catch { /* nothing to play */ } requestAnimationFrame(tick);
}

/* ---------------- v88 · compatibility check, export / import ---------------- */
type DiagRow = { name: string; st: "ok" | "fb" | "miss"; impact: string };
function trDiag() {
  const R: DiagRow[] = []; const add = (name: string, st: DiagRow["st"], impact: string) => R.push({ name, st, impact }); const css = (p: string, v: string) => { try { return CSS.supports(p, v); } catch { return false; } };
  let comp = false; try { const d = document.createElement("div"); document.body.appendChild(d); const a = d.animate([{ transform: "none" }, { transform: "none" }], { duration: 1, composite: "add" }); comp = !!a.effect && (a.effect as KeyframeEffect).composite === "add"; a.cancel(); d.remove(); } catch { /* unsupported */ }
  add("Web Animations (animate)", typeof Element.prototype.animate === "function" ? "ok" : "miss", L4("Toutes les transitions 3D deviennent instantanées|All 3D transitions become instant|Alle 3D-Übergänge werden sofort ausgeführt|تصبح كل الانتقالات ثلاثية الأبعاد فورية"));
  add("getAnimations", typeof Element.prototype.getAnimations === "function" ? "ok" : "miss", L4("Nettoyage des animations moins fiable|Animation clean-up less reliable|Aufräumen der Animationen weniger zuverlässig|تنظيف الحركات أقل موثوقية"));
  add("composite: add", comp ? "ok" : "fb", L4("Léger rebond du dock et du bureau absent ; le reste fonctionne|Small dock and desktop bounce missing; everything else works|Kleines Nachfedern von Dock und Desktop fehlt; der Rest funktioniert|يغيب ارتداد خفيف للشريط وسطح المكتب؛ والباقي يعمل"));
  add("transform 3D (perspective, rotateY)", css("transform", "perspective(100px) rotateY(10deg)") ? "ok" : "miss", L4("Effets cube, carrousel, retournement non visibles|Cube, carousel and flip effects not visible|Würfel-, Karussell- und Dreheffekte nicht sichtbar|تأثيرات المكعب والدوّار والقلب غير مرئية"));
  add("color-mix()", css("color", "color-mix(in srgb, red 50%, blue)") ? "ok" : "fb", L4("Couleurs de sélection de repli (v85)|Fallback selection colours (v85)|Ersatzfarben für die Auswahl (v85)|ألوان تحديد بديلة (v85)"));
  add("backdrop-filter", css("backdrop-filter", "blur(2px)") || css("-webkit-backdrop-filter", "blur(2px)") ? "ok" : "fb", L4("Fond du changeur et de la vue des fenêtres non flouté, seulement assombri|Switcher and window overview background darkened, not blurred|Hintergrund von Umschalter und Fensterübersicht nur abgedunkelt, nicht unscharf|خلفية المبدّل وعرض النوافذ معتمة فقط دون تمويه"));
  add("overscroll-behavior-x", css("overscroll-behavior-x", "none") ? "ok" : "fb", L4("Le balayage au trackpad peut aussi déclencher « page précédente »|A trackpad swipe may also trigger “previous page”|Eine Trackpad-Wischgeste kann auch „Zurück“ auslösen|قد يؤدي السحب على لوحة اللمس أيضًا إلى «الصفحة السابقة»"));
  add("inert", "inert" in HTMLElement.prototype ? "ok" : "fb", L4("Copies d'aperçu inertes par aria-hidden seulement|Preview copies hidden from assistive tech by aria-hidden only|Vorschaukopien nur per aria-hidden ausgeblendet|نسخ المعاينة مخفية عن التقنيات المساعدة عبر aria-hidden فقط"));
  add("requestIdleCallback", typeof requestIdleCallback === "function" ? "ok" : "fb", L4("Préchargement des données par minuterie (repli prévu)|Data pre-load uses a timer (planned fallback)|Datenvorladen per Timer (vorgesehener Ersatz)|التحميل المسبق للبيانات عبر مؤقت (بديل مخطط)"));
  add("KeyboardEvent.code", "code" in KeyboardEvent.prototype ? "ok" : "miss", L4("Raccourci Alt+² indisponible ; bouton du dock et recherche restent|Alt+` shortcut unavailable; dock button and search remain|Kürzel Alt+` nicht verfügbar; Dock-Taste und Suche bleiben|اختصار Alt+` غير متاح؛ يبقى زر الشريط والبحث"));
  add("elementsFromPoint", typeof document.elementsFromPoint === "function" ? "ok" : "miss", L4("Glisser une fenêtre vers un bureau indisponible|Dragging a window onto a desktop unavailable|Fenster auf einen Desktop ziehen nicht verfügbar|سحب نافذة إلى سطح مكتب غير متاح"));
  let ls = false; try { localStorage.setItem("__trd", "1"); localStorage.removeItem("__trd"); ls = true; } catch { /* blocked */ }
  add("localStorage", ls ? "ok" : "fb", L4("Réglages perdus à la fermeture de la page|Settings lost when the page closes|Einstellungen gehen beim Schließen verloren|تضيع الإعدادات عند إغلاق الصفحة"));
  const touch = (navigator.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
  const info = [navigator.userAgent, `${L4("écran|screen|Bildschirm|الشاشة")} ${screen.width}×${screen.height} @${(devicePixelRatio || 1).toFixed(2)}x`, `${L4("fenêtre|viewport|Fenster|النافذة")} ${innerWidth}×${innerHeight}`, `${L4("tactile|touch|Touch|لمس")} : ${touch ? "✓" : "—"}`, `${L4("réduire les animations (système)|reduced motion (system)|Bewegung reduzieren (System)|تقليل الحركة (النظام)")} : ${matchMedia("(prefers-reduced-motion: reduce)").matches ? "✓" : "—"}`, `${L4("cœurs|cores|Kerne|أنوية")} : ${navigator.hardwareConcurrency || "?"}`];
  return { rows: R, info };
}
const stLbl = (st: string) => trW13(st === "ok" ? "ok" : st === "fb" ? "fb" : "miss");
function trDiagText(d: ReturnType<typeof trDiag>) { return ["Remotion OS — " + trW13("diag"), ...d.info, "", ...d.rows.map((r) => `${stLbl(r.st).toUpperCase()} — ${r.name}${r.st === "ok" ? "" : " : " + r.impact}`)].join("\n"); }
function trDiagShow(out: HTMLElement) {
  const d = trDiag(); const n = { ok: 0, fb: 0, miss: 0 }; d.rows.forEach((r) => n[r.st]++);
  out.innerHTML = `<b>${esc(trW13("summary").replace("{ok}", String(n.ok)).replace("{fb}", String(n.fb)).replace("{miss}", String(n.miss)))}</b><ul class="tr-dg">${d.rows.map((r) => `<li class="${r.st}"><span>${esc(stLbl(r.st))}</span> ${esc(r.name)}${r.st === "ok" ? "" : `<small>${esc(r.impact)}</small>`}</li>`).join("")}</ul><textarea class="tr-dgt" readonly rows="3" aria-label="${esc(trW13("diag"))}">${esc(trDiagText(d))}</textarea><button type="button" class="kbm-item" data-trcopy>${esc(trW13("copy"))}</button>`;
  out.dataset.ok = String(n.ok); out.dataset.fb = String(n.fb); out.dataset.miss = String(n.miss);
}
const TR_EXPORT_KEYS = ["desk", "ws", "speed", "depth", "icons", "widgets", "windows", "appStyle", "gestures", "overview"] as const;
export function trExport() {
  const S = trSt() as unknown as Record<string, string>; const o: Record<string, unknown> = { app: "remotion-os", kind: "transitions", v: 1 }; TR_EXPORT_KEYS.forEach((k) => (o[k] = S[k]));
  const blob = new Blob([JSON.stringify(o, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "remotion-transitions.json";
  ($("sysMenu") || document.body).appendChild(a); /* v89: inside the menu, so the click does not close it */ a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return o;
}
export function trImportObj(o: unknown) {
  const O = o as Record<string, unknown> | null; if (!O || typeof O !== "object" || O.app !== "remotion-os" || O.kind !== "transitions") return false;
  const clean: Record<string, unknown> = { v: 1 }; TR_EXPORT_KEYS.forEach((k) => { if (typeof O[k] === "string") clean[k] = O[k]; });
  try { localStorage.setItem(TR_KEY, JSON.stringify(clean)); } catch { /* blocked */ } TR.st = null; const S = trSt() as unknown as Record<string, string>;
  /* v89: apply the file's values even when storage is blocked (private mode), through the same allowed values */
  const OKV: Record<string, readonly string[]> = { desk: TR_DESK, ws: TR_WS, speed: Object.keys(TR_SPEED), depth: Object.keys(TR_DEPTH), icons: ["fade", "follow"], widgets: ["fade", "follow"], windows: ["follow", "fade"], appStyle: ["expressive", "calm"], gestures: ["pad", "all", "off"], overview: ["desks", "both"] };
  TR_EXPORT_KEYS.forEach((k) => { let v = clean[k] as string | undefined; if (k === "gestures" && v === "on") v = "pad"; if (v != null && OKV[k]?.includes(v)) S[k] = v; });
  try { trSave(); } catch { /* blocked */ } trOnChange.forEach((f) => { try { f(); } catch { /* one listener */ } }); TR.auto = false; TR.fps = []; return S;
}
function onMenuTools(e: MouseEvent) {
  const v = view(); if (!v) return; const t = e.target as Element;
  const mb = t.closest<HTMLElement>("[data-trmeasure]"); if (mb) { e.stopPropagation(); const out = mb.parentNode!.querySelector<HTMLElement>(".tr-mres"); if (out) trMeasure(out); return; }
  if (t.closest("[data-trdiag]")) { e.stopPropagation(); trDiagShow(v.querySelector<HTMLElement>(".tr-dres")!); return; }
  if (t.closest("[data-trcopy]")) {
    e.stopPropagation(); const ta = v.querySelector<HTMLTextAreaElement>(".tr-dgt"); const txt = ta ? ta.value : ""; const ok = () => toast(trW13("copied"));
    const fb = () => { ta?.select(); try { document.execCommand("copy"); ok(); } catch { /* no clipboard */ } };
    try { navigator.clipboard.writeText(txt).then(ok, fb); } catch { fb(); } return;
  }
  if (t.closest("[data-trexp]")) { e.stopPropagation(); trExport(); return; }
  if (t.closest("[data-trimp]")) { e.stopPropagation(); v.querySelector<HTMLInputElement>(".tr-impf")?.click(); return; }
}
function onMenuChange(e: Event) {
  const f = (e.target as Element).closest?.<HTMLInputElement>(".tr-impf"); if (!f || !f.files || !f.files[0]) return; const file = f.files[0];
  if (file.size > 20000) { toast(trW13("bad")); return; }
  file.text().then((t) => { let o = null; try { o = JSON.parse(t); } catch { /* not JSON */ } const S = trImportObj(o); if (!S) { toast(trW13("bad")); return; } renderTrView(); toast(trW13("imported")); }, () => toast(trW13("bad")))
    .finally(() => { try { f.value = ""; } catch { /* read-only */ } }); /* v89: the same file can be imported again */
}
/* v89c · safety net: transition classes never outlive the animations they were set for */
function safetyNet() {
  const B = document.body.classList; if (!(B.contains("tr-winmov") || B.contains("tr-win3d") || B.contains("tr-3d") || B.contains("dk-switch") || $("wallOld"))) return;
  const running = (el: Element | null | undefined) => !!el && el.getAnimations().some((a) => a.playState === "running" || (a.playState as string) === "pending");
  if ([wall(), $("wallOld"), document.querySelector(".main"), ...OSW().map((w) => winEls.get(w.key)), ...(TR.faces || [])].some(running)) return;
  if (deskAnims.some((a) => a.playState === "running")) return;
  B.remove("tr-winmov", "tr-win3d", "tr-3d", "dk-switch", "tr-fol"); $("wallOld")?.remove(); try { trFacesClear(); } catch { /* nothing */ }
}
/* v89 (14) the key under Esc: "²" on French AZERTY, "^" on German QWERTZ, "`" on US QWERTY */
export function trKeyLbl() { return TR.keyLbl || ({ fr: "²", de: "^" } as Record<string, string>)[document.documentElement.lang] || "`"; }
/** For the switcher, overview and gestures modules. */
export { trDesk, trTiming, trWinCleanup, trFacesClear };

/* ---------------- settings: System menu › Appearance › Transitions ---------------- */
const TR_IC: Record<string, string> = { classic: '<path d="M3 7h12M3 12h18M3 17h12"/><path d="m17 5 4 2-4 2"/>', cube: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>', carousel: '<rect x="8" y="6" width="8" height="12" rx="1.5"/><path d="M5 8v8M19 8v8M2 10v4M22 10v4"/>', flip: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M12 3v18"/><path d="m15 9 2 3-2 3"/>', fade: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6" stroke-dasharray="2 2"/>', none: '<circle cx="12" cy="12" r="8"/><path d="m6.5 6.5 11 11"/>', zoom: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/>' };
export const TR_MENU_IC = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TR_IC.cube}</svg>`;
const trIc = (k: string) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TR_IC[k] || ""}</svg>`;
const backHead = (title: string) => `<button class="kbm-back" data-go="main" role="menuitem"><span class="bk">${MI.back}</span>${title}</button>`;
/** The HTML file builds this page with chained wrappers (v75, v76, v79, then v82 and later): each one gets the page so
 *  far and returns it with its rows inserted. Same order here. */
export const trViewWraps: ((h: string, S: Record<string, string>) => string)[] = [];
const insertBefore = (h: string, mark: string, add: string) => { const i = h.indexOf(mark); return i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add; };
const two = (S: Record<string, string>, key: string, vals: string[], lbl: (k: string) => string, label: string) => `<div class="kv tr-kv"><span>${esc(label)}</span><div class="tr-grid two" role="radiogroup" aria-label="${esc(label)}">${vals.map((k) => `<button class="tr-ch sm${S[key] === k ? " on" : ""}" role="radio" aria-checked="${S[key] === k}" data-trk="${key}" data-trv="${k}"><span>${esc(lbl(k))}</span></button>`).join("")}</div></div>`;
/* v75 · icons / widgets */
trViewWraps.push((h, S) => insertBefore(h, '<div class="kv">', `<h4 class="tr-h">${esc(trW("during"))}</h4>${two(S, "icons", ["fade", "follow"], (k) => trW(k === "fade" ? "folFade" : "follow"), trW("icons"))}${two(S, "widgets", ["fade", "follow"], (k) => trW(k === "fade" ? "folFade" : "follow"), trW("widgets"))}<p class="tr-hint">${esc(trW("folHint"))}</p>`));
/* v76 · open windows */
trViewWraps.push((h, S) => insertBefore(h, '<div class="kv">', `${two(S, "windows", ["follow", "fade"], (k) => trW("w" + k), trW("windows"))}<p class="tr-hint">${esc(trW("wHint"))}</p>`));
/* v79 · app motion style */
trViewWraps.push((h, S) => insertBefore(h, '<p class="tr-hint">' + esc(trW("hint")), `<h4 class="tr-h">${esc(trW("appStyle"))}</h4><div class="tr-grid two" role="radiogroup" aria-label="${esc(trW("appStyle"))}">${["expressive", "calm"].map((k) => `<button class="tr-ch sm${S.appStyle === k ? " on" : ""}" role="radio" aria-checked="${S.appStyle === k}" data-trk="appStyle" data-trv="${k}"><span>${esc(trW(k))}</span></button>`).join("")}</div><p class="tr-hint">${esc(trW("hint5"))}</p>`));
export function trViewHTML() {
  const S = trSt() as unknown as Record<string, string>; const rtl = document.documentElement.dir === "rtl" ? -1 : 1;
  const grid = (key: string, list: readonly string[]) => `<div class="tr-grid" role="radiogroup" aria-label="${esc(trW(key))}">${list.map((k) => `<button class="tr-ch${S[key] === k ? " on" : ""}" role="radio" aria-checked="${S[key] === k}" data-trk="${key}" data-trv="${k}"><i class="tr-ic tr-${k}">${trIc(k)}</i><span>${esc(trW(k))}</span></button>`).join("")}</div>`;
  const seg = (key: string, list: string[]) => { const i = list.indexOf(S[key]); return `<div class="kv"><span>${esc(trW(key))}</span><div class="seg" role="radiogroup" aria-label="${esc(trW(key))}"><span class="thumb-ind" style="transform:translateX(${i * 100 * rtl}%)"></span>${list.map((k) => `<button role="radio" aria-checked="${S[key] === k}" data-trk="${key}" data-trv="${k}">${esc(trW(k))}</button>`).join("")}</div></div>`; };
  const base = backHead(trW("title")) + (trRM() ? `<p class="tr-note">${esc(trW("rmNote"))}</p>` : "") + (TR.auto ? `<p class="tr-note">${esc(trW("autoNote"))}</p>` : "") +
    `<h4 class="tr-h">${esc(trW("desk"))}<button class="tr-try" data-trtry="desk">${esc(trW("tryDesk"))}</button></h4>${grid("desk", TR_DESK)}<h4 class="tr-h">${esc(trW("ws"))}<button class="tr-try" data-trtry="ws">${esc(trW("tryWs"))}</button></h4>${grid("ws", TR_WS)}${seg("speed", ["fast", "normal", "soft"])}${seg("depth", ["light", "medium", "strong"])}<p class="tr-hint">${esc(trW("hint"))}</p><button class="kbm-item tr-reset" data-trreset>${esc(trW("reset"))}</button>`;
  return trViewWraps.reduce((h, f) => f(h, trSt() as unknown as Record<string, string>), base);
}
const view = () => document.querySelector<HTMLElement>('#sysVp [data-view="transitions"]');
export function renderTrView() { const v = view(); if (v) v.innerHTML = trViewHTML(); }
/** Listeners run after a settings change (v79 motion style, v82 gestures). */
export const trOnChange: (() => void)[] = [];
function onMenuClick(e: MouseEvent) {
  const b = (e.target as Element).closest<HTMLElement>("[data-trk],[data-trtry],[data-trreset]"); if (!b) return; e.stopPropagation(); const S = trSt() as unknown as Record<string, string>;
  if (b.dataset.trk) {
    S[b.dataset.trk] = b.dataset.trv!; trSave(); const v = view()!; const k = b.dataset.trk; v.innerHTML = trViewHTML(); v.querySelector<HTMLElement>(`[data-trk="${k}"][data-trv="${b.dataset.trv}"]`)?.focus({ preventScroll: true });
    if (k === "desk" || k === "ws") { const ch = v.querySelector(`.tr-ch[data-trk="${k}"].on .tr-ic`); if (ch && !trRM()) ch.animate([{ transform: "scale(.6) rotate(-20deg)" }, { transform: "scale(1.15)" }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,1.4,.3,1)" }); }
    setTimeout(() => trOnChange.forEach((f) => f()), 0); return;
  }
  if (b.dataset.trtry === "desk") { trDesk(1, { preview: true, eff: S.desk === "classic" ? "classic" : S.desk }); return; }
  if (b.dataset.trtry === "ws") { if (S.ws === "classic" || S.ws === "none") { toast(trW(S.ws)); return; } trWs({ eff: S.ws }); return; }
  if (b.dataset.trreset !== undefined) { /* the HTML file saves the reset object before later versions add their keys to it in memory */
    const { gestures: _g, overview: _o, ...saved } = DEF; void _g; void _o; TR.st = saved as TrSt; TR.auto = false; TR.fps = []; trSave(); TR.st = { ...DEF }; renderTrView(); toast(trW("resetDone")); setTimeout(() => trOnChange.forEach((f) => f()), 0); }
}

/* ---------------- install ---------------- */
let installed = false;
export function installTransitions() {
  if (installed || typeof window === "undefined") return; installed = true;
  installTrSettings();
  deskFx.slide = (dir) => trDesk(dir);
  wsFx.sw = (from, to, thenDid) => wsSwitchOuter(from, to, thenDid);
  winFx.slideWins = (a, b, d) => trSlideWins(a, b, d);
  addEventListener("storage", (e) => { if (e.key === TR_KEY) { TR.st = null; trSt(); setTimeout(() => trOnChange.forEach((f) => f()), 0); } });
  /* v77 */
  let rm = lkRM(); useLock.subscribe(() => { const r = lkRM(); if (r !== rm) { rm = r; trRmSync(); } });
  try { matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", trRmSync); } catch { /* old browser */ }
  trRmSync();
  /* v79 tokens */
  const st = document.createElement("style"); st.id = "mo-tokens"; st.textContent = `:root{--mo-d1:150ms;--mo-d2:250ms;--mo-d3:400ms;--mo-d4:600ms;--mo-std:${TR.MO.ease.std};--mo-enter:${TR.MO.ease.enter};--mo-exit:${TR.MO.ease.exit};--mo-spring:${TR.MO.ease.spring};--mo-calm:${TR.MO.ease.calm}}
html.mo-calm .os-win,html.mo-calm .os-win *{--spring:var(--mo-calm);--dp-spring:var(--mo-calm)}`; document.head.appendChild(st);
  installAnimateNormaliser(); trOnChange.push(trMoSync); trMoSync();
  /* v91 · folder gradients once in a shared hidden <svg> (they used to repeat the same id in every folder icon) */
  if (!$("trGradDefs")) { const g = document.createElementNS("http://www.w3.org/2000/svg", "svg"); g.setAttribute("width", "0"); g.setAttribute("height", "0"); g.setAttribute("aria-hidden", "true"); g.setAttribute("focusable", "false"); g.style.cssText = "position:absolute;width:0;height:0;overflow:hidden"; g.id = "trGradDefs";
    g.innerHTML = ["dkfg:#74b4ff:#4d94f5", "dkfy:#ffd668:#f6b62c"].map((x) => { const [id, a, b] = x.split(":"); return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"></stop><stop offset="1" stop-color="${b}"></stop></linearGradient></defs>`; }).join(""); document.body.appendChild(g); }
  /* v83 window frames, v87 CSS retime, v89 workspace flush and safety net */
  installFrameNormaliser(); trOnChange.push(trMoSpeedSync); trMoSpeedSync(); installCssRetime();
  wsSaveFx.before = () => { const P = WSP.p; if (P && useShell.getState().desks === P.desksBefore) trWsFlush(); };
  deskFx.beforeGoto.push(() => { trWsFlush(); if (!XP.open) try { trWinCleanup(); } catch { /* nothing */ } document.body.classList.remove("tr-winmov", "tr-win3d"); }); /* v89 */
  setInterval(() => { if (WSP.p && useShell.getState().desks !== WSP.p.desksBefore) WSP.p = null; }, 500);
  setInterval(safetyNet, 700);
  try { (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard?.getLayoutMap?.().then((m) => { const k = m.get("Backquote"); if (k) TR.keyLbl = k; }).catch(() => {}); } catch { /* unsupported */ }
  /* the settings page lives in the System menu (rendered by React): its clicks are taken first, like the HTML file */
  const hook = () => { const m = $("sysMenu"); if (!m) { setTimeout(hook, 200); return; } m.addEventListener("click", onMenuClick, true); m.addEventListener("click", onMenuTools, true); m.addEventListener("change", onMenuChange, true); };
  hook();
}
/** For tests: the engine entry points. */
export const trApi = { trDesk, trWs, trWsSwitch, osDid, osWsSave };
