"use client";
/**
 * Remotion AI panel (source L10449–L11235): conversation history, composer, scripted demos, live answers through
 * `window.claude`, and the VPH form (side panel, in-chat card, smart edits).
 *
 * Deliberate structure (ADR-04 exception, same as the registration wizard — doc 15 slice 11): the panel is built in
 * the source from string templates written with innerHTML and patched in place (thinking rows, streaming answers, the
 * form card's partial refreshes). It is ported as a typed imperative island: React mounts the empty `#ai` container
 * once (constant props, never re-rendered) and this module fills it, with templates and handlers following the source
 * line by line. The form part lives in ./form.ts.
 *
 * Integrations are kept exactly as in the source: live answers use `window.claude.use("sample")` when the host page
 * provides it; without it the panel shows the source's "live answers are not available here" message. No endpoint is
 * invented and nothing is mocked; the demos and history are the source's own sample conversations (S class).
 */
import { formatNumber, I18N, translate } from "@/lib/i18n/core";
import { LANGS, isLang, type Lang } from "@/lib/i18n/langs";
import { useShell } from "@/os/state/shell";
import { lkRM } from "@/os/lock/lock";
import { curAcc, curUnit, homeOrg, roleOf, useAccount } from "@/os/account/store";
import { TODAY_EVENTS } from "@/os/notifications/nc";
import { AI_FI, AIX, aiSv, aixByName } from "./icons";
import { create } from "zustand";

/* ---------- shared helpers ---------- */
export const lang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
export const t = (k: string, v?: Record<string, string | number>) => translate(lang(), k, v);
export const nf = (n: number) => formatNumber(lang(), n);
export const loc = () => LANGS[lang()].locale;
export const fmtT = (ms: number | Date) => new Intl.DateTimeFormat(loc(), { hour: "2-digit", minute: "2-digit" }).format(ms);
export const toast = (m: string) => useShell.getState().showToast(m);
export const hasEn = (k: string) => k in I18N.en;
export const tg = (e: Event) => e.target as HTMLInputElement;
export const aiEsc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** The top-bar button's state (the source toggles `.on` / aria-expanded on `#aiBtn`). */
export const useAiBtn = create<{ on: boolean }>(() => ({ on: false }));

/* light markdown for live answers (L10512) */
export function aiMd(src: string) {
  const inl = (s: string) => aiEsc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out: string[] = []; let list: { t: string; i: string[] } | null = null, code: string[] | null = null, para: string[] = [];
  const flushP = () => { if (para.length) { out.push(`<p>${para.map(inl).join("<br>")}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>${list.i.map((x) => `<li>${inl(x)}</li>`).join("")}</${list.t}>`); list = null; } };
  for (const raw of String(src).split("\n")) {
    if (code !== null) { if (/^```/.test(raw.trim())) { out.push(`<pre><code>${aiEsc(code.join("\n"))}</code></pre>`); code = null; } else code.push(raw); continue; }
    const l = raw.trimEnd();
    if (/^```/.test(l.trim())) { flushP(); flushL(); code = []; continue; }
    let m: RegExpMatchArray | null;
    if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { flushP(); if (!list || list.t !== "ul") { flushL(); list = { t: "ul", i: [] }; } list.i.push(m[1]); continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { flushP(); if (!list || list.t !== "ol") { flushL(); list = { t: "ol", i: [] }; } list.i.push(m[1]); continue; }
    if ((m = l.match(/^#{1,6}\s+(.*)/))) { flushP(); flushL(); out.push(`<h4>${inl(m[1])}</h4>`); continue; }
    if (!l.trim()) { flushP(); flushL(); continue; }
    flushL(); para.push(l);
  }
  if (code !== null) out.push(`<pre><code>${aiEsc((code as string[]).join("\n"))}</code></pre>`);
  flushP(); flushL(); return out.join("");
}

/* ---------- conversations (L10531) ---------- */
type BaseRow = [id: string, g: "t" | "y" | number, hm: [number, number], ic: string, c: string, cat: string, tk: string, sk: string, sc?: string];
const AI_BASE: BaseRow[] = [
  ["prep", "t", [10, 24], "cal", "#2f6fe0", "plan", "sgPrepT", "hPrepS", "prep"],
  ["sum", "t", [9, 15], "pdf", "#e2453c", "files", "hSumT", "hSumS"],
  ["plan", "t", [8, 42], "box", "#22b14c", "plan", "hPlanT", "hPlanS"],
  ["find", "t", [7, 21], "fsearch", "#9a5cf7", "files", "hFindT", "hFindS"],
  ["data", "y", [18, 33], "chart", "#2f6fe0", "analysis", "hDataT", "hDataS"],
  ["mail", "y", [16, 12], "mail", "#9a5cf7", "plan", "hMailT", "hMailS"],
  ["ws", "y", [14, 5], "cube", "#22b14c", "plan", "hWsT", "hWsS"],
  ["rec", -3, [11, 0], "mic", "#7c4dff", "files", "hRecT", "hRecS"],
  ["cmp", -4, [15, 30], "cols", "#2f6fe0", "files", "hCmpT", "hCmpS"],
  ["err", -5, [9, 40], "alert", "#e2453c", "analysis", "hErrT", "hErrS"],
];
const AI_SIMPLE: Record<string, string> = { sum: "hSumA", plan: "hPlanA", find: "hFindA", data: "hDataA", mail: "hMailA", ws: "hWsA", rec: "hRecA", cmp: "hCmpA", err: "hErrA" };
export const aiDay = (off: number, h: number, m: number) => { const d = new Date(); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0); return +d; };

export type Diff = [k: string, old: string, now: string];
export type Msg = { r: "u" | "a"; t: string; at: number; files?: string[]; send?: string; err?: string; diff?: Diff[]; st?: string; qr?: [string, string][] | null; ok?: number };
export type LiveConv = { id: string; at: number; title: string; sub?: string; msgs: Msg[]; ic?: string; c?: string };
export type Conv = { id: string; at: number; ic: string; c: string; cat: string; tk?: string; sk?: string; kind: "script" | "simple" | "live"; sc?: string; title?: string; sub?: string; msgs?: Msg[] };
export type StoredForm = { v: Record<string, string>; extra?: FormExtra; cert?: boolean; done?: boolean; edited?: string[] };
export type FormExtra = { obs: string; act: string[]; vph: string; opt: string[]; just: string };
export type FormState = { step: number; v: Record<string, string>; edited: Set<string>; src: boolean; filter: string; cert: boolean; done: boolean; orig: boolean; extra: FormExtra };
type Store = { live: LiveConv[]; ren: Record<string, string>; del: string[]; forms: boolean; formAt?: number; form?: StoredForm | null; formMsgs?: Msg[] };
export type SampleResult = { text: string; truncated?: boolean };
export type SampleOpts = { cache?: boolean; signal?: AbortSignal; onText?: (x: { text: string }) => void; tools?: unknown[] };
export type Sample = ((turns: { role: string; content: string }[], opts: SampleOpts) => Promise<SampleResult>) & { limits?: () => Promise<{ tools?: boolean } | undefined> };
type ClaudeHost = { use?: (name: string) => Promise<Sample> };
export const claudeHost = () => (window as unknown as { claude?: ClaudeHost }).claude;

export const RAI = { open: false, cur: "prep" as string | null, cat: "all", q: "", busy: false, ctl: null as AbortController | null, useWs: true, attach: [] as { name: string; text: string | null }[], form: null as FormState | null, max: false, play: 0, sample: undefined as Sample | null | undefined };
export let aiStore: Store = { live: [], ren: {}, del: [], forms: false };
function loadStore() {
  try { const s = JSON.parse(localStorage.getItem("remotion-ai") || "null"); if (s && typeof s === "object") aiStore = { live: Array.isArray(s.live) ? s.live.slice(0, 30) : [], ren: s.ren || {}, del: Array.isArray(s.del) ? s.del : [], forms: !!s.forms, formAt: s.formAt, form: s.form && typeof s.form === "object" ? s.form : null, formMsgs: Array.isArray(s.formMsgs) ? s.formMsgs.slice(-40) : [] }; } catch {}
}
export const aiSave = () => { try { localStorage.setItem("remotion-ai", JSON.stringify(aiStore)); } catch {} };
export function aiConvs(): Conv[] {
  const base: Conv[] = AI_BASE.map(([id, g, [h, m], ic, c, cat, tk, sk, sc]) => ({ id, at: aiDay(g === "t" ? 0 : g === "y" ? -1 : g, h, m), ic, c, cat, tk, sk, kind: sc ? "script" : "simple", sc: sc || id }));
  if (aiStore.forms) base.unshift({ id: "form", at: aiStore.formAt || aiDay(0, 10, 25), ic: "pdf", c: "#e2453c", cat: "files", tk: "hFormT", sk: "hFormS", kind: "script", sc: "form" });
  const live: Conv[] = aiStore.live.map((c) => ({ ...c, kind: "live", ic: c.ic || "spark", c: c.c || "#22b14c", cat: "all" }));
  return [...live, ...base].filter((c) => !aiStore.del.includes(c.id)).sort((a, b) => b.at - a.at);
}
export const aiConv = (id: string | null) => aiConvs().find((c) => c.id === id);
const aiTitle = (c: Conv) => aiStore.ren[c.id] || (c.kind === "live" ? c.title! : t(c.tk!));
const aiSub = (c: Conv) => (c.kind === "live" ? c.sub || t("aiUsingWs") : t(c.sk!));
function aiGroup(at: number) { const d0 = new Date(); d0.setHours(0, 0, 0, 0); if (at >= +d0) return "gToday"; if (at >= +d0 - 864e5) return "gYesterday"; return "gWeek"; }
const aiTime = (at: number) => (aiGroup(at) === "gWeek" ? new Intl.DateTimeFormat(loc(), { month: "short", day: "numeric" }).format(at) : fmtT(at));

/* ---------- DOM (L10562) ---------- */
export let aiEl: HTMLElement, aiThread: HTMLElement, aiScroll: HTMLElement, aiInput: HTMLTextAreaElement, aiHist: HTMLElement, aiForm: HTMLElement;
export const aiQ = <T extends HTMLElement = HTMLElement>(s: string) => aiEl.querySelector<T>(s) as T;
const aiBtnEl = () => document.getElementById("aiBtn");
const AI_HTML = () => `<section class="ai-win" id="aiWin">
  <div class="ai-scrim" id="aiScrim"></div>
  <aside class="ai-side" id="aiSide" aria-label="">
    <div class="ai-brand"><span class="ai-spark">${AIX.spark(28)}</span><b id="aiDlgT">Remotion AI</b><span class="ai-ready"><i></i><span class="rs"></span></span></div>
    <div class="ai-newrow"><button type="button" id="aiNewBtn">${AIX.plus}<span class="lb"></span></button><button type="button" id="aiFilterBtn" aria-haspopup="menu">${AIX.filter}</button></div>
    <label class="ai-search">${AIX.search}<input id="aiSearch" type="search" autocomplete="off"><kbd>Ctrl + K</kbd></label>
    <div class="ai-hist" id="aiHist" role="list"></div>
  </aside>
  <div class="ai-main">
    <header class="ai-head" id="aiHead"></header>
    <div class="ai-scroll" id="aiScroll"><div class="ai-thread" id="aiThread" aria-live="polite"></div></div>
    <form class="ai-comp" id="aiComp" autocomplete="off">
      <div class="ai-ctx" id="aiCtx" hidden></div>
      <div class="ai-attach" id="aiAttach"></div>
      <div class="ai-inrow"><button type="button" class="ai-ib plain" id="aiClip">${AIX.clip}</button><textarea id="aiInput" rows="1"></textarea><input type="file" id="aiFile" multiple hidden></div>
      <div class="ai-crow"><div class="ai-chips" id="aiChips"></div><button type="submit" class="ai-send" id="aiSendBtn">${AIX.send}</button></div>
    </form>
  </div>
</section>
<section class="ai-form" id="aiForm" hidden></section>`;

/* ---------- render: sidebar (L10590) ---------- */
export function renderAIHist(anim: boolean) {
  const q = RAI.q.trim().toLowerCase(), list = aiConvs().filter((c) => (RAI.cat === "all" || c.cat === RAI.cat) && (!q || (aiTitle(c) + " " + aiSub(c)).toLowerCase().includes(q)));
  const hl = (s: string) => { const e = aiEsc(s); if (!q) return e; const i = s.toLowerCase().indexOf(q); return i < 0 ? e : aiEsc(s.slice(0, i)) + "<mark>" + aiEsc(s.slice(i, i + q.length)) + "</mark>" + aiEsc(s.slice(i + q.length)); };
  let h = "", g0 = "", i = 0;
  for (const c of list) {
    const g = aiGroup(c.at); if (g !== g0) { h += `<div class="ai-grp">${t(g)}</div>`; g0 = g; }
    const ic = c.ic === "spark" ? AIX.spark(18) : aixByName(c.ic) || AIX.spark(18);
    h += `<button type="button" class="ai-hi${c.id === RAI.cur ? " on" : ""}" role="listitem" data-conv="${c.id}" style="--i:${anim ? i++ : 0};--c:${c.c}" aria-current="${c.id === RAI.cur}"><span class="ti">${ic}</span><span class="tx"><b dir="auto">${hl(aiTitle(c))}</b><small dir="auto">${hl(aiSub(c))}</small></span><time>${aiTime(c.at)}</time></button>`;
  }
  aiHist.innerHTML = h || `<div class="ai-empty">${aiEsc(t("aiNoMatch", { x: RAI.q }))}</div>`;
  if (!anim) aiHist.querySelectorAll<HTMLElement>(".ai-hi").forEach((b) => (b.style.animation = "none"));
}
/* ---------- render: header (L10601) ---------- */
export function renderAIHead() {
  const c = aiConv(RAI.cur), max = aiEl.classList.contains("max");
  const sub = !c ? t("aiUsingNone") : c.sc === "prep" ? t("aiUsingCal") : c.sc === "form" ? t("aiUsingDoc") : c.kind === "live" && !c.msgs?.length ? t("aiUsingNone") : t("aiUsingWs");
  const brand = `<div class="ai-brand hc-brand"><span class="ai-spark">${AIX.spark(26)}</span><b>Remotion AI</b><span class="ai-ready"><i></i><span class="rs">${t(RAI.busy ? "aiBusy" : "aiReady")}</span></span></div>`;
  const conv = `<span class="ai-hic hc-conv" style="background:linear-gradient(135deg,color-mix(in srgb,${c?.c || "#22b14c"} 70%,#fff),${c?.c || "#22b14c"})">${c && c.ic !== "spark" ? aixByName(c.ic) : AIX.spark(18)}</span><div class="ai-ht hc-conv"><b id="aiHT" dir="auto">${aiEsc(c ? aiTitle(c) : t("aiNew"))}</b><small>${AIX.calSm}<span>${aiEsc(sub)}</span></small></div>`;
  aiQ("#aiHead").innerHTML = brand + conv + `<div class="ai-hb">
    <button type="button" class="ai-ib nar-only" data-aia="new" aria-label="${aiEsc(t("aiNew"))}" title="${aiEsc(t("aiNew"))}">${AIX.plus}</button>
    <button type="button" class="ai-ib nar-only" data-aia="hist" aria-label="${aiEsc(t("aiHistory"))}" title="${aiEsc(t("aiHistory"))}">${AIX.clock}</button>
    <button type="button" class="ai-ib wide-only hc-conv" data-aia="share" aria-label="${aiEsc(t("aiShare"))}" title="${aiEsc(t("aiShare"))}">${AIX.share}</button>
    <button type="button" class="ai-ib wide-only hc-conv" data-aia="more" aria-haspopup="menu" aria-label="${aiEsc(t("aiMore"))}" title="${aiEsc(t("aiMore"))}">${AIX.dots}</button>
    <button type="button" class="ai-ib" data-aia="max" aria-pressed="${max}" aria-label="${aiEsc(t(max ? "aiCollapse" : "aiExpand"))}" title="${aiEsc(t(max ? "aiCollapse" : "aiExpand"))}">${max ? AIX.shrink : AIX.expand}</button>
    <button type="button" class="ai-ib" data-aia="close" aria-label="${aiEsc(t("aiClose"))}" title="${aiEsc(t("aiClose"))}">${AIX.x}</button></div>`;
  F.renderCtx();
}
function renderAIStatic() {
  aiQ("#aiSide").setAttribute("aria-label", t("aiHistory"));
  aiEl.querySelectorAll<HTMLElement>(".ai-side .rs").forEach((s) => (s.textContent = t(RAI.busy ? "aiBusy" : "aiReady")));
  aiQ("#aiNewBtn .lb").textContent = t("aiNew"); aiQ("#aiFilterBtn").setAttribute("aria-label", t("aiFilter")); aiQ("#aiFilterBtn").title = t("aiFilter");
  aiQ<HTMLInputElement>("#aiSearch").placeholder = t("aiSearchPh"); aiInput.placeholder = t("aiPh"); aiQ("#aiClip").setAttribute("aria-label", t("aiAttach")); aiQ("#aiClip").title = t("aiAttach");
  const sb = aiQ("#aiSendBtn"); sb.setAttribute("aria-label", t(RAI.busy ? "aiStop" : "aiSend")); sb.title = t(RAI.busy ? "aiStop" : "aiSend"); sb.classList.toggle("stop", RAI.busy); sb.innerHTML = RAI.busy ? AIX.stop : AIX.send;
  aiQ("#aiChips").innerHTML = `<button type="button" class="ai-chip" data-chip="ws" aria-pressed="${RAI.useWs}" title="${aiEsc(t("aiChWsTip"))}">${AIX.book}<span class="lb">${t("aiChWs")}</span></button><button type="button" class="ai-chip" data-chip="search">${AIX.globe}<span class="lb">${t("aiChSearch")}</span></button><button type="button" class="ai-chip" data-chip="create" aria-haspopup="menu">${AIX.file}<span class="lb">${t("aiChCreate")}</span>${AIX.chevD}</button><button type="button" class="ai-chip" data-chip="sum">${AIX.list}<span class="lb">${t("aiChSum")}</span></button><button type="button" class="ai-chip" data-chip="an">${AIX.gauge}<span class="lb">${t("aiChAn")}</span></button><button type="button" class="ai-chip" data-chip="more" aria-haspopup="menu" aria-label="${aiEsc(t("aiChMore"))}"><span class="lb">${t("aiChMore")}</span><span class="cv">${AIX.chevD}</span><span class="dt">${AIX.dots}</span></button><span class="ai-hint">${t("aiHint")}</span>`;
  renderAIAttach();
}
/* ---------- message builders (L10625) ---------- */
const aiUserAv = () => { const a = useAccount.getState().accounts[0]; if (a?.photo) return `<span class="ai-av"><img src="${a.photo}" alt=""></span>`; const n = (a?.name || "N B").split(/\s+/); return `<span class="ai-av">${aiEsc(((n[0] || "")[0] || "") + ((n[1] || "")[0] || "")).toUpperCase()}</span>`; };
export const aiU = (text: string, at: number, extra = "") => `<div class="ai-u"><div><div class="ai-ub" dir="auto">${aiEsc(text)}<div class="tm">${aiTime(at)}${AIX.dck}</div></div>${extra}</div>${aiUserAv()}</div>`;
export const aiA = (inner: string, cls = "") => `<div class="ai-a ${cls}"><span class="ai-spark">${AIX.spark(28)}</span><div class="ai-ab">${inner}</div></div>`;
export const aiThink = (txt: string) => aiA(`<div class="ai-think"><span class="ai-dots"><i></i><i></i><i></i></span><span id="aiThinkTx">${aiEsc(txt)}</span></div>`, "thinking");
const cardHead = (ic: string, c: string, title: string, sub: string, right = "") => `<div class="ai-ch"><span class="ci" style="--c:${c}">${ic}</span><div class="ct"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>${right}</div>`;
const lnk = (k: string, act: string) => `<button type="button" class="ai-lnk" data-aix="${act}">${t(k)}${AIX.arr}</button>`;
const AIPRI: Record<string, [string, string]> = { hi: ["pHi", "#e23b3b"], med: ["pMed", "#f07a12"], low: ["pLow", "#2f8ef0"] };
const dShort = (ms: number) => new Intl.DateTimeFormat(loc(), { month: "short", day: "numeric" }).format(ms);
const relDays = (n: number) => { try { const r = new Intl.RelativeTimeFormat(loc(), { numeric: "auto" }); return n >= 7 ? r.format(-Math.round(n / 7), "week") : r.format(-n, "day"); } catch { return n + "d"; } };
const tm = (h: number, m: number, off = 1) => fmtT(aiDay(off, h, m));
function prep1() {
  const tom = aiDay(1, 9, 0), dLong = new Intl.DateTimeFormat(loc(), { month: "long", day: "numeric", year: "numeric" }).format(tom);
  const avs = (cs: [string, string][]) => `<span class="ai-avs">${cs.map(([c, l]) => `<i style="background:${c}">${l}</i>`).join("")}</span>`;
  const M: [number, number, number, number, string, string, [string, string][], string][] = [[9, 0, 9, 45, "m1", "#2f6fe0", [["#c47f45", "AL"], ["#5b6b4f", "JM"], ["#3a6ea5", "SK"]], "tgVideo"], [11, 0, 12, 0, "m2", "#22b14c", [["#b0624f", "CL"], ["#8a7a64", "PD"], ["#58708a", "ML"]], "tgOnline"], [14, 30, 15, 30, "m3", "#9a5cf7", [["#6a7f5a", "RB"], ["#3e8b8b", "YT"], ["#a0644a", "NB"]], "tgRoom"]];
  const meet = `<div class="ai-card" style="--k:0">${cardHead(AIX.cal, "#2f6fe0", t("cMeet", { n: nf(3) }), t("cTomorrow", { x: dShort(tom) }), lnk("vCal", "cal"))}${M.map(([h, m, eh, em, k, c, a, tg_], j) => `<div class="ai-row ai-mt" style="--k:0;--j:${j}"><span class="dot" style="--c:${c}"></span><span class="tx"><small dir="ltr">${tm(h, m)} – ${tm(eh, em)}</small><b dir="auto">${t(k)}</b></span>${avs(a)}<span class="ai-tag">${t(tg_)}</span></div>`).join("")}</div>`;
  const D: [string, string, number][] = [["Project_roadmap_Q4_2026.pdf", "pdf", 2], ["Client_requirements_Clinique_du_Lac.docx", "docx", 5], ["Technical_architecture.md", "md", 7], ["Meeting_notes_Product_Team.md", "md", 3]];
  const docs = `<div class="ai-card" style="--k:1">${cardHead(AIX.file.replace('width="16" height="16"', 'width="18" height="18"'), "#f07a12", t("cDocs"), "", lnk("vAll", "files"))}${D.map(([n, ty, d], j) => `<div class="ai-doc" style="--k:1;--j:${j}"><span class="fi">${AI_FI[ty]}</span><span class="tx"><b dir="ltr">${n}</b><small>${t("upd", { x: relDays(d) })}</small></span><button type="button" data-aix="doc" data-doc="${n}" aria-label="${aiEsc(n)}">${AIX.ext}</button></div>`).join("")}</div>`;
  const T: [string, string, number][] = [["tk1", "hi", 1], ["tk2", "hi", 0], ["tk3", "med", 0], ["tk4", "med", 1], ["tk5", "low", 0]];
  const tasks = `<div class="ai-card" style="--k:2">${cardHead(`<span style="display:grid;place-items:center;width:20px;height:20px;border-radius:5px;background:#22b14c;color:#fff">${aiSv('<path d="m6 12.5 4 4 8-9"/>', 14, 2.6)}</span>`, "#22b14c", t("cTasks", { n: nf(5) }), "", lnk("vTasks", "tasks"))}${T.map(([k, p, d], j) => `<label class="ai-task${d ? " done" : ""}${p === "hi" ? " hi" : ""}" style="--k:2;--j:${j}"><input type="checkbox" class="ai-ck"${d ? " checked" : ""}><span class="nm" dir="auto">${t(k)}</span><span class="ai-pri" style="--c:${AIPRI[p][1]}">${AIX.flag}${t(AIPRI[p][0])}</span><span class="ai-due">${t("gToday")}</span></label>`).join("")}</div>`;
  const notes = `<div class="ai-card ai-notes" style="--k:3">${cardHead(AIX.file.replace('width="16" height="16"', 'width="18" height="18"'), "#9a5cf7", t("cNotes"), "", `<span class="ai-mini"><button type="button" data-aix="copyNotes" aria-label="${aiEsc(t("aiCopy"))}" title="${aiEsc(t("aiCopy"))}">${AIX.copy}</button><button type="button" data-aix="good" aria-pressed="false" aria-label="${aiEsc(t("aiGood"))}" title="${aiEsc(t("aiGood"))}">${AIX.up}</button><button type="button" data-aix="bad" aria-pressed="false" aria-label="${aiEsc(t("aiBad"))}" title="${aiEsc(t("aiBad"))}">${AIX.down}</button></span>`)}<p class="lead">${t("notesLead")}</p><ul class="ai-ul blue">${["nt1", "nt2", "nt3", "nt4", "nt5", "nt6"].map((k, j) => `<li style="--k:3;--j:${j}" dir="auto">${t(k)}</li>`).join("")}</ul></div>`;
  return `<p class="lead">${aiEsc(t("prepA1", { x: dLong }))}</p><p class="sub">${t("prepA1s")}</p><div class="ai-grid">${meet}${docs}${tasks}${notes}</div><p class="ai-note">${t("aiSample")}</p>`;
}
function prep2() {
  const d = aiDay(-8, 10, 0);
  const sum = `<div class="ai-card" style="--k:0">${cardHead(AIX.cal, "#9a5cf7", t("cSum"), t("durMin", { d: new Intl.DateTimeFormat(loc(), { month: "short", day: "numeric", year: "numeric" }).format(d), m: nf(58) }), `<button type="button" class="ai-lnk" data-aix="moreSum" aria-expanded="false"><span>${t("vSum")}</span>${AIX.arr}</button>`)}<ul class="ai-ul">${["sm1", "sm2", "sm3", "sm4", "sm5"].map((k, j) => `<li style="--k:0;--j:${j}" dir="auto">${t(k)}</li>`).join("")}</ul><div class="ai-more"><div><ul class="ai-ul" style="margin-top:2px">${["sm6", "sm7"].map((k) => `<li style="animation:none" dir="auto">${t(k)}</li>`).join("")}</ul></div></div></div>`;
  const R: [string, string][] = [["rq1", "hi"], ["rq2", "hi"], ["rq3", "hi"], ["rq4", "med"], ["rq5", "med"]];
  const req = `<div class="ai-card" style="--k:1">${cardHead(AIX.list.replace('width="16" height="16"', 'width="18" height="18"'), "#2f6fe0", t("cReq"), "")}${R.map(([k, p], j) => `<div class="ai-req" style="--k:1;--j:${j}">${AIX.ccheck}<span class="nm" dir="auto">${t(k)}</span><span class="ai-pill" style="--c:${AIPRI[p][1]}">${t(AIPRI[p][0])}</span></div>`).join("")}</div>`;
  const N: [string, number][] = [["na1", 1], ["na2", 1], ["na3", 3], ["na4", 1]];
  const nx = `<div class="ai-card" style="--k:2">${cardHead(AIX.target, "#e23b3b", t("cNext"), "")}${N.map(([k, o], j) => `<label class="ai-task" style="--k:2;--j:${j}"><input type="checkbox" class="ai-ck"><span class="nm" dir="auto">${t(k)}</span><span class="ai-due mut">${dShort(aiDay(o, 9, 0))}</span></label>`).join("")}</div>`;
  return `<p class="lead">${t("prepA2")}</p><p class="sub">${t("prepA2s")}</p><div class="ai-grid g3">${sum}${req}${nx}</div>`;
}
const FORM_EX: [string, string][] = [["exName", "Martin Dupont"], ["exDob", "14/03/1985"], ["exAddr", "12 Rue des Fleurs, 75015 Paris"], ["exEmail", "martin.dupont@example.com"], ["exPhone", "+33 6 12 34 56 78"], ["Médecin traitant", "Dr. Sophie Laurent"], ["Pathologie principale", "Accident vasculaire cérébral (AVC)"], ["Besoin principal", "Rééducation motrice et cognitive"]];
const FORM_EX2: [string, string][] = [["Date de survenue", "12/01/2024"], ["Situation actuelle", "À domicile"], ["Aides actuelles", "Aide familiale, kinésithérapie"]];
const exRows = (rows: [string, string][], o = 0) => rows.map(([k, v], j) => `<dt style="--j:${j + o}">${aiEsc(hasEn(k) ? t(k) : k)}</dt><dd style="--j:${j + o}" dir="${/^[+\d]|@/.test(v) ? "ltr" : "auto"}">${aiEsc(v)}</dd>`).join("");
function form1(stepsState?: string[]) {
  const S = ["fs1", "fs2", "fs3", "fs4"];
  return `<p class="ai-md" style="margin:0 0 4px">${t("formA1")}</p><ul class="ai-steps" id="aiFSteps">${S.map((k, i) => `<li class="${stepsState ? stepsState[i] : "ok"}" style="animation-delay:${i * 60}ms"><i></i>${t(k)}</li>`).join("")}</ul><div class="ai-tmr">${fmtT(aiConv("form")?.at || Date.now())}${AIX.dck}</div>`;
}
const formEx = () => `<div class="ai-ext ai-card" style="--k:0"><h4>${t("exTitle")}</h4><dl>${exRows(FORM_EX)}</dl><div class="ai-more"><div><dl style="padding-top:5px">${exRows(FORM_EX2, 0)}</dl></div></div><button type="button" class="ai-showmore" data-aix="moreEx" aria-expanded="false"><span>${t("showMoreEx")}</span>${AIX.arr}</button></div>`;
const form2 = () => `<p class="ai-md" style="margin:0">${t("formA2")}</p><div class="ai-cta"><button type="button" class="ai-btn pri" data-aix="openForm">${AIX.save.replace('width="17" height="17"', 'width="16" height="16"')}<span>${t("openForm")}</span>${AIX.arr}</button><button type="button" class="ai-btn" data-aix="compare">${AIX.orig}<span>${t("cmpOrig")}</span></button></div>${F.fcHTML()}`;
const formAtt = () => `<div class="ai-att">${AI_FI.pdfBig}<span class="tx"><b dir="ltr">fiche_evaluation_vph.pdf</b><small>PDF · ${nf(2.4)} MB</small></span><button type="button" class="ai-ib plain" data-aix="compare" aria-label="${aiEsc(t("viewOrig"))}" title="${aiEsc(t("viewOrig"))}">${AIX.eye}</button></div>`;
function hello() {
  const S: [string, string, string, string, string, number][] = [["prep", "cal", "#2f6fe0", "sgPrepT", "sgPrepD", 1], ["form", "pdf", "#e2453c", "sgFormT", "sgFormD", 1], ["day", "list", "#22b14c", "sgDayT", "sgDayD", 0], ["mail", "mail", "#9a5cf7", "sgMailT", "sgMailD", 0]];
  return `<div class="ai-hello"><div class="big">${AIX.spark(34)}</div><h3>${t("aiHello")}</h3><p>${t("aiHelloSub")}</p><div class="ai-sugg">${S.map(([k, ic, c, tt, dd, demo], i) => `<button type="button" data-sugg="${k}" style="--k:${i};--c:${c}"><span class="ti">${aixByName(ic)!.replace(/width="1[0-9]" height="1[0-9]"/, 'width="17" height="17"')}</span><span><b>${t(tt)}${demo ? `<span class="demo">${t("aiDemo")}</span>` : ""}</b><small>${t(dd)}</small></span></button>`).join("")}</div></div>`;
}
function convHTML(c: Conv | undefined) {
  if (!c) return hello();
  if (c.kind === "live") {
    if (!c.msgs?.length) return hello();
    return c.msgs.map((m) => (m.r === "u" ? aiU(m.t, m.at, m.files?.length ? `<div class="ai-attach" style="justify-content:flex-end;margin-top:6px">${m.files.map((f) => `<span>${AIX.file}<b>${aiEsc(f)}</b></span>`).join("")}</div>` : "") : aiA(`<div class="ai-md">${aiMd(m.t || "")}</div>${m.err ? `<p class="ai-err">${aiEsc(m.err)}</p>` : ""}`))).join("");
  }
  if (c.sc === "prep") return aiU(t("prepU1"), aiDay(0, 10, 24)) + aiA(prep1()) + aiU(t("prepU2"), aiDay(0, 10, 26)) + aiA(prep2());
  if (c.sc === "form") return aiU(t("formU"), c.at, formAtt()) + aiA(form1() + formEx()) + aiA(form2()) + aiA(F.followHTML()) + (aiStore.formMsgs || []).map(F.fmsgHTML).join("");
  const k = AI_SIMPLE[c.id];
  return aiU(c.id === "err" ? t("hErrU") : t(c.tk!), c.at) + aiA(`<div class="ai-md">${aiMd(t(k))}</div>`);
}
export function renderAIThread(fade: boolean) {
  RAI.play++; const c = aiConv(RAI.cur);
  aiThread.innerHTML = convHTML(c); F.renderCtx();
  if (fade && !lkRM()) aiThread.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,1,.3,1)" });
  requestAnimationFrame(() => { aiScroll.style.scrollBehavior = "auto"; aiScroll.scrollTop = c && (c.kind !== "live" || c.msgs?.length) ? (c.sc === "prep" ? 0 : aiScroll.scrollHeight) : 0; aiScroll.style.scrollBehavior = ""; });
}
/** renderAI (L10687): also run by the language switch (L7991). */
export function renderAI() { if (!aiEl) return; renderAIStatic(); renderAIHead(); renderAIHist(false); renderAIThread(false); if (RAI.form && !aiForm.hidden) F.renderForm(false); }
export function selectConv(id: string) {
  if (RAI.busy) RAI.ctl?.abort();
  RAI.cur = id; aiHist.querySelectorAll<HTMLElement>(".ai-hi").forEach((b) => { const on = b.dataset.conv === id; b.classList.toggle("on", on); b.setAttribute("aria-current", String(on)); });
  renderAIHead(); renderAIThread(true); aiEl.classList.remove("side-open");
}
/* ---------- open / close (L10694) ---------- */
export const aiNarrow = () => innerWidth <= 860;
export function openAI() {
  if (RAI.open) return; RAI.open = true; aiEl.hidden = false; aiFit(); aiEl.classList.remove("closing"); aiEl.classList.toggle("narrow", aiNarrow());
  renderAIStatic(); renderAIHead(); renderAIHist(true); renderAIThread(false);
  if (!lkRM()) { aiEl.classList.add("opening"); setTimeout(() => aiEl.classList.remove("opening"), 600); }
  useAiBtn.setState({ on: true });
  setTimeout(() => aiInput.focus({ preventScroll: true }), 200);
}
export function closeAI() {
  if (!RAI.open) return; RAI.open = false; closeAIPop(); useAiBtn.setState({ on: false });
  const done = () => { if (!RAI.open) { aiEl.hidden = true; aiEl.classList.remove("closing", "side-open"); } };
  if (lkRM()) done(); else { aiEl.classList.add("closing"); setTimeout(done, 280); }
}
export const toggleAI = () => (RAI.open ? closeAI() : openAI());
function aiFit() {
  if (innerWidth <= 1200) { aiEl.style.setProperty("--ai-avail", innerWidth - 24 + "px"); return; }
  const rtl = document.documentElement.dir === "rtl", ws = document.getElementById("wsMenu");
  let edge = rtl ? innerWidth : 0;
  [document.getElementById("rail"), ws && !ws.classList.contains("closed") ? ws : null].forEach((el) => { if (!el) return; const r = el.getBoundingClientRect(); if (r.width < 2) return; edge = rtl ? Math.min(edge, r.left) : Math.max(edge, r.right); });
  aiEl.style.setProperty("--ai-avail", Math.max(360, (rtl ? edge : innerWidth - edge) - 22) + "px");
}
/* ---------- popovers (L10718) ---------- */
export type PopItem = { id: string; l: string; ic?: string; radio?: number; on?: boolean; cls?: string; run?: () => void } | "-";
let aiPopEl: (HTMLElement & { _items?: PopItem[] }) | null = null;
export const aiPopOpen = () => !!aiPopEl;
export function closeAIPop() { if (aiPopEl) { aiPopEl.remove(); aiPopEl = null; } }
export function openAIPop(anchor: HTMLElement, items: PopItem[], up?: boolean) {
  closeAIPop(); const p: HTMLElement & { _items?: PopItem[] } = document.createElement("div"); p.className = "ai-pop"; p.setAttribute("role", "menu");
  p.innerHTML = items.map((it) => (it === "-" ? '<div class="kbm-sep" style="margin:4px 2px"></div>' : `<button type="button" role="${it.radio ? "menuitemradio" : "menuitem"}" ${it.radio ? `aria-checked="${!!it.on}"` : ""} class="${it.cls || ""}" data-pop="${it.id}">${it.ic || ""}<span>${aiEsc(it.l)}</span></button>`)).join("");
  aiEl.appendChild(p); aiPopEl = p; p._items = items;
  const r = anchor.getBoundingClientRect(), hr = aiEl.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
  let x = r.left - hr.left; if (x + w > hr.width - 8) x = r.right - hr.left - w; x = Math.max(8, x);
  const y = up ? r.top - hr.top - h - 8 : r.bottom - hr.top + 8;
  p.style.left = x + "px"; p.style.top = Math.max(8, y) + "px"; p.style.setProperty("--oy", up ? "100%" : "0%"); p.style.setProperty("--ox", r.left + r.width / 2 - hr.left - x + "px");
  setTimeout(() => p.querySelector<HTMLElement>("button")?.focus({ preventScroll: true }), 20);
}
/* ---------- composer (L10735) ---------- */
export function insertPrompt(s: string) { aiInput.value = s; autoSize(); aiInput.focus(); aiInput.setSelectionRange(s.length, s.length); aiInput.animate?.([{ background: "rgba(34,177,76,.12)" }, { background: "transparent" }], { duration: 700 }); }
function autoSize() { aiInput.style.height = "auto"; aiInput.style.height = Math.min(aiInput.scrollHeight, 160) + "px"; }
export function renderAIAttach() { aiQ("#aiAttach").innerHTML = RAI.attach.map((a, i) => `<span>${AIX.file}<b dir="auto">${aiEsc(a.name)}</b><button type="button" data-rmatt="${i}" aria-label="${aiEsc(t("aiRemove", { x: a.name }))}">${AIX.x.replace(/width="19" height="19"/, 'width="13" height="13"')}</button></span>`).join(""); }
/* ---------- header / sidebar actions (L10775) ---------- */
function renameConv() {
  const b = aiQ("#aiHT"); if (!b) return; b.contentEditable = "true"; b.focus(); const r = document.createRange(); r.selectNodeContents(b); const s = getSelection()!; s.removeAllRanges(); s.addRange(r);
  const fin = (save: boolean) => { b.contentEditable = "false"; b.onkeydown = b.onblur = null; const v = b.textContent!.trim(); if (save && v) { aiStore.ren[RAI.cur!] = v.slice(0, 60); aiSave(); } renderAIHead(); renderAIHist(false); };
  b.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); fin(true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fin(false); } }; b.onblur = () => fin(true);
}
function deleteConv() {
  const id = RAI.cur!, el = aiHist.querySelector<HTMLElement>(`[data-conv="${id}"]`);
  const fin = () => { aiStore.live = aiStore.live.filter((c) => c.id !== id); if (!aiStore.del.includes(id) && !id.startsWith("c")) aiStore.del.push(id); if (id === "form") { aiStore.forms = false; aiStore.form = null; aiStore.formMsgs = []; RAI.form = null; } aiSave(); if (RAI.form) F.closeForm(); RAI.cur = aiConvs()[0]?.id || null; renderAIHead(); renderAIHist(false); renderAIThread(true); toast(t("aiDeleted")); };
  if (el && !lkRM()) el.animate([{ opacity: 1, transform: "none", height: el.offsetHeight + "px" }, { opacity: 0, transform: "translateX(-20px)", height: "0px", paddingBlock: "0px" }], { duration: 300, easing: "cubic-bezier(.4,0,.2,1)" }).finished.then(fin); else fin();
}
export function newChat() {
  if (RAI.busy) RAI.ctl?.abort();
  const cur = aiConv(RAI.cur); if (cur?.kind === "live" && !cur.msgs?.length) { aiInput.focus(); aiEl.classList.remove("side-open"); return; }
  const c: LiveConv = { id: "c" + Date.now().toString(36), at: Date.now(), title: t("aiNew"), msgs: [] }; aiStore.live.unshift(c); aiSave();
  RAI.cur = c.id; renderAIHist(false); const el = aiHist.querySelector<HTMLElement>(`[data-conv="${c.id}"]`); el?.style.removeProperty("animation"); if (el && !lkRM()) el.animate([{ opacity: 0, transform: "translateY(-8px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,1.2,.3,1)" });
  renderAIHead(); renderAIThread(true); aiEl.classList.remove("side-open"); aiInput.focus();
}
/* ---------- demos (scripted, sample data) (L10808) ---------- */
export const aiAppend = (html: string) => { const tmp = document.createElement("div"); tmp.innerHTML = html; const nodes = [...tmp.children] as HTMLElement[]; nodes.forEach((n) => aiThread.appendChild(n)); aiScroll.scrollTop = aiScroll.scrollHeight; return nodes[0]; };
const aiWait = (ms: number, tok: number) => new Promise<void>((res, rej) => setTimeout(() => (tok === RAI.play ? res() : rej("stale")), lkRM() ? Math.min(ms, 60) : ms));
export function setBusy(b: boolean) { RAI.busy = b; aiEl.classList.toggle("busy", b); aiEl.querySelectorAll<HTMLElement>(".rs").forEach((s) => (s.textContent = t(b ? "aiBusy" : "aiReady"))); const sb = aiQ("#aiSendBtn"); sb.classList.toggle("stop", b); sb.innerHTML = b ? AIX.stop : AIX.send; sb.setAttribute("aria-label", t(b ? "aiStop" : "aiSend")); sb.title = t(b ? "aiStop" : "aiSend"); }
export async function runDemo(k: string) {
  if (RAI.busy) RAI.ctl?.abort();
  if (k === "form") { aiStore.forms = true; aiStore.formAt = Date.now(); aiStore.del = aiStore.del.filter((x) => x !== "form"); aiStore.form = null; aiStore.formMsgs = []; RAI.form = null; if (!aiForm.hidden) F.closeForm(); aiSave(); RAI.cur = "form"; }
  else { aiStore.del = aiStore.del.filter((x) => x !== "prep"); aiSave(); RAI.cur = "prep"; }
  renderAIHist(false); renderAIHead(); aiEl.classList.remove("side-open");
  const tok = ++RAI.play; aiThread.innerHTML = ""; setBusy(true);
  try {
    if (k === "prep") {
      aiAppend(aiU(t("prepU1"), Date.now())); await aiWait(450, tok);
      const th = aiAppend(aiThink(t("thCal"))); for (const s of ["thDocs", "thTasks"]) { await aiWait(850, tok); th.querySelector("#aiThinkTx")!.textContent = t(s); }
      await aiWait(800, tok); th.remove(); aiAppend(aiA(prep1())); await aiWait(1800, tok);
      aiAppend(aiU(t("prepU2"), Date.now())); await aiWait(450, tok);
      const th2 = aiAppend(aiThink(t("thTr"))); await aiWait(1500, tok); th2.remove(); aiAppend(aiA(prep2()));
    } else {
      aiAppend(aiU(t("formU"), Date.now(), formAtt())); await aiWait(500, tok);
      const th = aiAppend(aiThink(t("fs1"))); await aiWait(700, tok); th.remove();
      const st = ["run", "", "", ""]; const row = aiAppend(aiA(form1(st)));
      const lis = row.querySelectorAll<HTMLElement>(".ai-steps li");
      for (let i = 0; i < 4; i++) { lis[i].className = "run"; await aiWait(750, tok); lis[i].className = "ok"; }
      await aiWait(250, tok); row.querySelector(".ai-ab")!.insertAdjacentHTML("beforeend", formEx()); aiScroll.scrollTop = aiScroll.scrollHeight;
      await aiWait(1000, tok); const th2 = aiAppend(aiThink(t("fs4"))); await aiWait(700, tok); th2.remove(); aiAppend(aiA(form2())); F.renderCtx(); await aiWait(900, tok); aiAppend(aiA(F.followHTML()));
    }
  } catch {}
  if (tok === RAI.play) setBusy(false);
}
/* ---------- live answers with Claude (L10837) ---------- */
function wsContext() {
  const now = new Date(), a = curAcc(), u = curUnit();
  const A0 = useAccount.getState().accounts[0];
  const ev = TODAY_EVENTS.map(([k, h, m, eh, em]) => `- ${t(k)}: ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}–${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`).join("\n");
  return [`Now: ${now.toString()}`, a ? `User: ${A0.name} (${t(roleOf(a))})${u ? `, ${homeOrg().name}, ${u.site.city} · ${t("dp_" + u.dept[0])}` : ""}` : "", `Today's events:\n${ev}`,
    `Tomorrow's meetings:\n- 09:00–09:45 ${t("m1")}\n- 11:00–12:00 ${t("m2")}\n- 14:30–15:30 ${t("m3")}`,
    `Open tasks:\n${["t1", "t2", "t3", "t4", "t5"].map((k) => "- " + t(k)).join("\n")}`, `Quick notes:\n${["n1", "n2", "n3"].map((k) => "- " + t(k) + (hasEn(k + "b") ? ": " + t(k + "b") : "")).join("\n")}`,
    `Recent files: Project_roadmap_Q4_2026.pdf, Client_requirements_Clinique_du_Lac.docx, Technical_architecture.md, Meeting_notes_Product_Team.md`].filter(Boolean).join("\n\n");
}
export async function aiGetSample() {
  if (RAI.sample !== undefined) return RAI.sample;
  try { const h = claudeHost(); RAI.sample = h?.use ? await h.use("sample") : null; } catch { RAI.sample = null; }
  return RAI.sample;
}
export const aiErrText = (c?: string) => ({ not_granted: "aiNotGranted", sampling_disabled: "aiNotGranted", not_declared: "aiNoLive", capability_disabled: "aiNoLive", capability_removed: "aiNoLive", rate_limited: "aiRate", refused: "aiRefused" } as Record<string, string>)[c || ""] || "aiFail";
export type SampleErr = { code?: string; text?: string } | undefined;
export async function aiAsk(text: string) {
  if (RAI.cur === "form" && aiConv("form")) { const tx = text || RAI.attach.map((a) => a.name).join(", "); RAI.attach = []; renderAIAttach(); return F.formAsk(tx); }
  let c = aiConv(RAI.cur);
  if (!c || c.kind !== "live") { const n: LiveConv = { id: "c" + Date.now().toString(36), at: Date.now(), title: "", msgs: [] }; aiStore.live.unshift(n); RAI.cur = n.id; c = { ...n, kind: "live", ic: "spark", c: "#22b14c", cat: "all" }; }
  const sc = aiStore.live.find((x) => x.id === c!.id)!;
  const files = RAI.attach.map((a) => a.name), full = text + RAI.attach.map((a) => (a.text != null ? `\n\n[Attached file: ${a.name}]\n\`\`\`\n${a.text}\n\`\`\`` : `\n\n[Attached file: ${a.name} (binary, content not available)]`)).join("");
  const shown = text || files.join(", ");
  if (!sc.msgs.length) { sc.title = shown.replace(/\s+/g, " ").slice(0, 48) + (shown.length > 48 ? "…" : ""); sc.at = Date.now(); }
  sc.msgs.push({ r: "u", t: shown, at: Date.now(), files, send: full }); RAI.attach = []; renderAIAttach(); aiSave();
  if (sc.msgs.length === 1) aiThread.innerHTML = "";
  renderAIHist(false); renderAIHead();
  const tok = ++RAI.play;
  aiAppend(aiU(shown, Date.now(), files.length ? `<div class="ai-attach" style="justify-content:flex-end;margin-top:6px">${files.map((f) => `<span>${AIX.file}<b>${aiEsc(f)}</b></span>`).join("")}</div>` : ""));
  const row = aiAppend(aiA(`<div class="ai-think"><span class="ai-dots"><i></i><i></i><i></i></span><span>${t("aiBusy")}</span></div>`));
  const ab = row.querySelector<HTMLElement>(".ai-ab")!; setBusy(true);
  const S = await aiGetSample();
  const fin = (txt: string, err?: string) => { sc.msgs.push({ r: "a", t: txt || "", at: Date.now(), err }); aiSave(); if (tok === RAI.play) setBusy(false); };
  if (!S) { ab.innerHTML = `<p class="ai-err">${t("aiNoLive")}</p>`; fin("", t("aiNoLive")); return; }
  const turns = [{ role: "user", content: t("aiLiveSys", { lang: LANGS[lang()].name }) + (RAI.useWs ? "\n\n" + t("aiCtx") + "\n" + wsContext() : "") }];
  sc.msgs.slice(0, -1).slice(-12).forEach((m) => { if (m.r === "u") turns.push({ role: "user", content: m.send || m.t }); else if (m.t) turns.push({ role: "assistant", content: m.t }); });
  turns.push({ role: "user", content: full });
  const ctl = new AbortController(); RAI.ctl = ctl; let last = "";
  try {
    const r = await S(turns, { cache: false, signal: ctl.signal, onText: ({ text }) => { last = text; if (tok !== RAI.play) return; const nearBottom = aiScroll.scrollHeight - aiScroll.scrollTop - aiScroll.clientHeight < 80; ab.innerHTML = `<div class="ai-md">${aiMd(text)}<span class="caret"></span></div>`; if (nearBottom) aiScroll.scrollTop = aiScroll.scrollHeight; } });
    if (tok === RAI.play) ab.innerHTML = `<div class="ai-md">${aiMd(r.text)}</div>${r.truncated ? `<p class="ai-note">${t("aiTrunc")}</p>` : ""}`;
    fin(r.text, r.truncated ? t("aiTrunc") : undefined);
  } catch (e0) {
    const e = e0 as SampleErr;
    const keep = e?.code === "refused" ? "" : e?.text ?? last; const msg = e?.code === "cancelled" ? "" : t(aiErrText(e?.code));
    if (tok === RAI.play) ab.innerHTML = (keep ? `<div class="ai-md">${aiMd(keep)}</div>` : "") + (msg ? `<p class="ai-err">${msg}</p>` : "");
    fin(keep, msg || undefined);
  }
}
/** dkAskAI (L11493): open the panel and start a new chat with the document attached. */
export function askAI(it: { name?: string; text?: string | null }) {
  openAI(); setTimeout(() => { newChat(); if (it.text) RAI.attach.push({ name: it.name!, text: it.text.slice(0, 30000) }); else RAI.attach.push({ name: it.name!, text: null }); renderAIAttach(); }, 120);
}

/* ---------- the form module registers itself here (avoids an import cycle) ---------- */
export type FormApi = { renderCtx: () => void; fcHTML: () => string; followHTML: () => string; fmsgHTML: (m: Msg) => string; renderForm: (anim: boolean) => void; closeForm: () => void; openForm: (orig: boolean, force?: boolean) => void; formAsk: (text: string) => Promise<void>; runQR: (k: string) => void; install: () => () => void };
export const F = {} as FormApi;

/* ---------- install: build the panel inside the React-mounted #ai and attach the listeners in source order ---------- */
export function installAI() {
  aiEl = document.getElementById("ai")!; if (!aiEl) return () => {};
  loadStore(); aiEl.innerHTML = AI_HTML();
  aiThread = aiQ("#aiThread"); aiScroll = aiQ("#aiScroll"); aiInput = aiQ<HTMLTextAreaElement>("#aiInput"); aiHist = aiQ("#aiHist"); aiForm = aiQ("#aiForm");
  try { claudeHost()?.use?.("sample").then((s) => { RAI.sample = s; }, () => { RAI.sample = null; }); } catch { RAI.sample = null; }
  const offs: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Document | Window, ev: K, fn: (e: HTMLElementEventMap[K]) => void, cap?: boolean) => { el.addEventListener(ev, fn as EventListener, cap); offs.push(() => el.removeEventListener(ev, fn as EventListener, cap)); };
  const onResize = () => { if (RAI.open) { aiEl.classList.toggle("narrow", aiNarrow()); aiFit(); } };
  on(window, "resize", onResize);
  { const ws = document.getElementById("wsMenu"); if (ws) { const mo = new MutationObserver(() => { if (RAI.open) aiFit(); }); mo.observe(ws, { attributes: true, attributeFilter: ["class"] }); offs.push(() => mo.disconnect()); } }
  on(aiEl, "click", (e) => {
    const pb = tg(e).closest<HTMLElement>("[data-pop]"); if (pb && aiPopEl) { const it = aiPopEl._items!.find((x) => x !== "-" && x.id === pb.dataset.pop) as Exclude<PopItem, "-"> | undefined; closeAIPop(); it?.run?.(); return; }
    if (aiPopEl && !tg(e).closest(".ai-pop")) closeAIPop();
  });
  on(aiInput, "input", autoSize);
  on(aiInput, "keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); aiQ<HTMLFormElement>("#aiComp").requestSubmit(); } });
  on(aiQ("#aiComp"), "submit", (e) => { e.preventDefault(); if (RAI.busy) { RAI.ctl?.abort(); return; } const v = aiInput.value.trim(); if (!v && !RAI.attach.length) return; aiInput.value = ""; autoSize(); aiAsk(v); });
  aiQ("#aiClip").onclick = () => aiQ("#aiFile").click();
  on(aiQ("#aiFile"), "change", async (e) => {
    const inp = tg(e);
    for (const f of [...(inp.files || [])].slice(0, 4)) {
      const textual = /^text\/|json|xml|javascript|csv|markdown/.test(f.type) || /\.(md|txt|csv|json|html?|css|js|ts|tsx|jsx|py|xml|ya?ml|log)$/i.test(f.name);
      let text: string | null = null; if (textual && f.size < 2e6) { try { text = (await f.text()).slice(0, 30000); } catch {} }
      RAI.attach.push({ name: f.name, text }); if (text === null) toast(t("aiFileBin", { x: f.name })); else toast(t("aiAttached", { x: f.name }));
    }
    inp.value = ""; renderAIAttach();
  });
  on(aiQ("#aiAttach"), "click", (e) => { const b = tg(e).closest<HTMLElement>("[data-rmatt]"); if (b) { RAI.attach.splice(+b.dataset.rmatt!, 1); renderAIAttach(); } });
  on(aiQ("#aiChips"), "click", (e) => {
    const b = tg(e).closest<HTMLElement>("[data-chip]"); if (!b) return; const k = b.dataset.chip;
    if (k === "ws") { RAI.useWs = !RAI.useWs; b.setAttribute("aria-pressed", String(RAI.useWs)); return; }
    if (k === "search") return insertPrompt(t("pSearch"));
    if (k === "sum") return insertPrompt(t("pSum"));
    if (k === "an") return insertPrompt(t("pAn"));
    if (k === "create") return openAIPop(b, ([["crDoc", "pDoc", AIX.file], ["crTask", "pTask", AIX.list], ["crEvent", "pEvent", AIX.calSm], ["crMail", "pMail", AIX.mail]] as const).map(([l, p, ic]) => ({ id: l, l: t(l), ic, run: () => insertPrompt(t(p)) })), true);
    if (k === "more") return openAIPop(b, [{ id: "tr", l: t("mTr"), ic: AIX.globe, run: () => insertPrompt(t("pTr")) }, { id: "ex", l: t("mExp"), ic: AIX.book, run: () => insertPrompt(t("pExp")) }, "-", { id: "d1", l: t("sgPrepT"), ic: AIX.calSm, run: () => runDemo("prep") }, { id: "d2", l: t("sgFormT"), ic: AIX.file, run: () => runDemo("form") }], true);
  });
  on(aiQ("#aiHead"), "click", (e) => {
    const b = tg(e).closest<HTMLElement>("[data-aia]"); if (!b) return; const a = b.dataset.aia;
    if (a === "close") return closeAI();
    if (a === "new") return newChat();
    if (a === "hist") { aiEl.classList.toggle("side-open"); return; }
    if (a === "max") { aiEl.classList.toggle("max"); renderAIHead(); return; }
    if (a === "share") { const txt = [...aiThread.querySelectorAll<HTMLElement>(".ai-u .ai-ub,.ai-a .ai-ab")].map((n) => n.innerText.trim()).join("\n\n"); navigator.clipboard?.writeText(txt).then(() => toast(t("aiCopied")), () => toast(t("aiCopied"))); return; }
    if (a === "more") openAIPop(b, [{ id: "ren", l: t("aiRename"), ic: AIX.pen, run: renameConv }, { id: "del", l: t("aiDelete"), ic: AIX.trash, cls: "danger", run: deleteConv }]);
  });
  aiQ("#aiScrim").onclick = () => aiEl.classList.remove("side-open");
  aiQ("#aiNewBtn").onclick = () => newChat();
  aiQ("#aiFilterBtn").onclick = (e) => openAIPop(e.currentTarget as HTMLElement, ([["all", "aiFAll"], ["files", "aiFFiles"], ["plan", "aiFPlan"], ["analysis", "aiFAnalysis"]] as const).map(([id, l]) => ({ id, l: t(l), radio: 1, on: RAI.cat === id, run: () => { RAI.cat = id; aiQ("#aiFilterBtn").setAttribute("aria-pressed", String(id !== "all")); renderAIHist(true); } })));
  on(aiQ("#aiSearch"), "input", (e) => { RAI.q = tg(e).value; renderAIHist(false); });
  on(aiHist, "click", (e) => { const b = tg(e).closest<HTMLElement>("[data-conv]"); if (b) selectConv(b.dataset.conv!); });
  /* thread interactions (L10793) */
  on(aiThread, "change", (e) => { const l = tg(e).closest(".ai-task"); if (l) l.classList.toggle("done", tg(e).checked); });
  on(aiThread, "click", (e) => {
    const s = tg(e).closest<HTMLElement>("[data-sugg]"); if (s) { const k = s.dataset.sugg; if (k === "prep" || k === "form") runDemo(k); else aiAsk(t(k === "day" ? "sgDayP" : "sgMailP")); return; }
    const b = tg(e).closest<HTMLElement>("[data-aix]"); if (!b) return; const a = b.dataset.aix;
    if (a === "cal") return toast(t("opened", { x: t("calendar") }));
    if (a === "files") return toast(t("opened", { x: t("files") }));
    if (a === "tasks") return toast(t("opened", { x: t("tasks") }));
    if (a === "doc") return toast(t("opened", { x: b.dataset.doc! }));
    if (a === "copyNotes") { const txt = [...b.closest(".ai-card")!.querySelectorAll("li")].map((li) => "• " + li.textContent).join("\n"); navigator.clipboard?.writeText(txt).catch(() => {}); toast(t("aiCopiedNotes")); return; }
    if (a === "good" || a === "bad") { const on_ = b.getAttribute("aria-pressed") !== "true"; b.parentElement!.querySelectorAll('[data-aix="good"],[data-aix="bad"]').forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", String(on_)); return; }
    if (a === "moreSum" || a === "moreEx") { const m = b.closest(".ai-card")!.querySelector(".ai-more")!, o = m.classList.toggle("open"); b.setAttribute("aria-expanded", String(o)); b.querySelector("span")!.textContent = t(a === "moreSum" ? (o ? "lessSum" : "vSum") : o ? "showLessEx" : "showMoreEx"); return; }
    if (a === "openForm") return F.openForm(false);
    if (a === "compare") return F.openForm(true);
  });
  /* Escape & shortcuts (L10884) */
  on(document, "keydown", (e) => {
    if (!RAI.open) return;
    if (e.key === "Escape") {
      if (aiPopEl) { e.preventDefault(); e.stopImmediatePropagation(); closeAIPop(); return; }
      if (aiEl.classList.contains("side-open")) { e.preventDefault(); e.stopImmediatePropagation(); aiEl.classList.remove("side-open"); return; }
      if (aiEl.contains(document.activeElement)) { e.preventDefault(); e.stopImmediatePropagation(); if (aiQ(".vf-orig")) { aiQ(".vf-orig").remove(); return; } closeAI(); aiBtnEl()?.focus(); }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && aiEl.contains(document.activeElement)) { e.preventDefault(); e.stopImmediatePropagation(); if (aiEl.classList.contains("has-form") || aiNarrow()) aiEl.classList.add("side-open"); aiQ("#aiSearch").focus(); }
  }, true);
  offs.push(F.install());
  return () => { offs.forEach((f) => f()); };
}
