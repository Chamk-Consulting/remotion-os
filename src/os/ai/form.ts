"use client";
/**
 * Remotion AI · VPH form (source L10895–L11235): the side panel (5 steps, source list, original overlay), the card
 * inside the chat, one setter shared by both, quick replies, and the smart-edit parser / `set_fields` tool.
 * Part of the AI imperative island (see ./ai.ts); templates and handlers follow the source line by line.
 * The form is a sample document (S class): validation, download and save show the source's toasts only.
 */
import { lkRM } from "@/os/lock/lock";
import { UNI, useAccount } from "@/os/account/store";
import { LANGS } from "@/lib/i18n/langs";
import rgData from "@/os/register/data.json";
import { AI_FI, AIX, aiSv } from "./icons";
import {
  F, RAI, aiA, aiAppend, aiConv, aiEl, aiErrText, aiEsc, aiForm, aiGetSample, aiInput, aiMd, aiNarrow, aiQ, aiSave, aiScroll, aiStore, aiThink,
  aiThread, aiU, lang, nf, openAIPop, renderAIHead, selectConv, setBusy, t, tg, toast, aiAsk,
  type Diff, type FormState, type Msg, type SampleErr, type SampleOpts,
} from "./ai";

const FLAGS = rgData.FLAGS as Record<string, string>;
type Field = [k: string, label: string, sec: number, val: string];
const VPH_STEPS = ["Patient", "Situation", "Besoins", "Préconisations", "Validation"];
const VPH_F: Field[] = [
  ["nom", "Nom", 0, "Martin"], ["prenom", "Prénom", 0, "Dupont"], ["dob", "Date de naissance", 0, "14/03/1985"], ["sexe", "Sexe", 0, "Masculin"],
  ["adresse", "Adresse", 0, "12 Rue des Fleurs, 75015 Paris"], ["cp", "Code postal", 0, "75015"], ["ville", "Ville", 0, "Paris"], ["tel", "Téléphone", 0, "+33 6 12 34 56 78"],
  ["email", "Email", 0, "martin.dupont@example.com"], ["medNom", "Médecin traitant", 0, "Dr. Sophie Laurent"], ["medCo", "Coordonnées du médecin", 0, "sophie.laurent@cabinet-medical.fr"],
  ["patho", "Pathologie principale", 1, "Accident vasculaire cérébral (AVC)"], ["survenue", "Date de survenue", 1, "12/01/2024"], ["situation", "Situation actuelle", 1, "À domicile"],
  ["aides", "Aides actuelles", 1, "Aide familiale, kinésithérapie"], ["besoin", "Besoin principal", 2, "Rééducation motrice et cognitive"], ["poids", "Poids (kg)", 2, ""], ["taille", "Taille (cm)", 2, ""],
];
const VPH_AUTO = VPH_F.filter((f) => f[3]).length;
function newFormState(): FormState { const v: Record<string, string> = {}; VPH_F.forEach(([k, , , val]) => (v[k] = val)); return { step: 0, v, edited: new Set(), src: !aiNarrow(), filter: "all", cert: false, done: false, orig: false, extra: { obs: "Hémiplégie droite, troubles de l’équilibre et de la marche.", act: ["int", "ext", "trans", "loisirs"], vph: "elec", opt: ["coussin", "dossier", "jambes"], just: "Hémiplégie droite ne permettant pas l’autopropulsion sur de longues distances ; besoin d’autonomie pour les déplacements extérieurs et les loisirs." } }; }
const FS = () => RAI.form!;
const vfFilled = () => VPH_F.filter((f) => String(FS().v[f[0]] || "").trim()).length;
const vfMissing = () => VPH_F.length - vfFilled();
const fdef = (k: string) => VPH_F.find((f) => f[0] === k);
type FieldOpts = { j?: number; label?: string; ta?: number; rows?: number; pre?: string; post?: string; ltr?: number; im?: string; ph?: string };
function vfField(k: string, o: FieldOpts = {}) {
  const [, lab] = fdef(k)!, val = FS().v[k] || "", miss = !String(val).trim();
  const label = o.label || lab;
  const inner = o.ta ? `<textarea data-vf="${k}" rows="${o.rows || 3}" dir="auto">${aiEsc(val)}</textarea>` : `${o.pre || ""}<input data-vf="${k}" value="${aiEsc(val)}" dir="${o.ltr ? "ltr" : "auto"}" ${o.im ? `inputmode="${o.im}"` : ""} ${o.ph ? `placeholder="${aiEsc(o.ph)}"` : ""}>${o.post || ""}`;
  return `<div class="vf-f" style="--j:${o.j || 0}"><label class="lb" for="vf_${k}">${aiEsc(label)} <i>*</i>${miss ? `<span class="vf-miss-tag">${t("toComplete")}</span>` : ""}</label><span class="vf-in${o.ta ? " ta" : ""}${miss ? " miss" : ""}" id="vfw_${k}">${inner.replace(`data-vf="${k}"`, `data-vf="${k}" id="vf_${k}"`)}</span></div>`;
}
function vfAge() { const m = String(FS().v.dob || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!m) return ""; const b = new Date(+m[3], +m[2] - 1, +m[1]), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--; return a >= 0 && a < 130 ? t("aiAge", { n: nf(a) }) : ""; }
const vfSec = (n: number, title: string, badge = true) => `<div class="vf-sec"><span class="n">${n}</span><h3>${title}</h3>${badge ? `<span class="vf-badge">${AIX.spark(14)}${t("autoBadge")}</span>` : ""}</div>`;
const vfRadio = (name: string, opts: string[], cur: string, key?: string) => `<div class="vf-radios" role="radiogroup">${opts.map((o) => `<label><input type="radio" name="${name}" value="${aiEsc(o)}" ${key ? `data-vf="${key}"` : `data-vx="${name}"`} ${o === cur ? "checked" : ""}>${aiEsc(o)}</label>`).join("")}</div>`;
const vfChecks = (name: string, opts: [string, string][], cur: string[]) => `<div class="vf-checks">${opts.map(([v, l]) => `<label><input type="checkbox" class="ai-ck" data-vxc="${name}" value="${v}" ${cur.includes(v) ? "checked" : ""}>${aiEsc(l)}</label>`).join("")}</div>`;
function vfPane() {
  const Fm = FS(), s = Fm.step, X = Fm.extra;
  if (Fm.done) return `<div class="vf-done"><div class="ring">${aiSv('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 40, 2.6)}</div><h3>${t("validated")}</h3><p>${t("validatedSub")}</p><div class="ai-cta" style="justify-content:center"><button type="button" class="ai-btn pri" data-vfa="dl">${AIX.dl}<span>${t("aiDownload")}</span></button><button type="button" class="ai-btn" data-vfa="close">${t("aiClose")}</button></div></div>`;
  if (s === 0) return vfSec(1, "Informations du patient") +
    `<div class="vf-g2">${vfField("nom", { j: 0 })}${vfField("prenom", { j: 1 })}</div>
     <div class="vf-g2">${vfField("dob", { j: 2, pre: AIX.calSm.replace(/14/g, "18"), ltr: 1, ph: "JJ/MM/AAAA" })}<div class="vf-age" id="vfAge">${vfAge()}</div></div>
     <div class="vf-f" style="--j:3"><span class="lb">Sexe <i>*</i></span>${vfRadio("sexe", ["Masculin", "Féminin", "Autre"], Fm.v.sexe, "sexe")}</div>
     ${vfField("adresse", { j: 4, post: AIX.pin })}
     <div class="vf-g2">${vfField("cp", { j: 5, ltr: 1, im: "numeric" })}${vfField("ville", { j: 6 })}</div>
     ${vfField("tel", { j: 7, ltr: 1, im: "tel", pre: `<span class="flag">${FLAGS.FR || ""}</span>${AIX.chevD}` })}
     ${vfField("email", { j: 8, ltr: 1 })}
     <p class="vf-sub">Médecin traitant</p>
     <div class="vf-g2">${vfField("medNom", { j: 9, label: "Nom" })}${vfField("medCo", { j: 10, label: "Coordonnées", ltr: 1, post: AIX.card })}</div>`;
  if (s === 1) return vfSec(2, "Situation médicale et sociale") +
    `${vfField("patho", { j: 0 })}
     <div class="vf-g2">${vfField("survenue", { j: 1, ltr: 1, pre: AIX.calSm.replace(/14/g, "18") })}<div></div></div>
     <div class="vf-f" style="--j:2"><span class="lb">Situation actuelle <i>*</i></span>${vfRadio("situation", ["À domicile", "En établissement", "Hospitalisé"], Fm.v.situation, "situation")}</div>
     ${vfField("aides", { j: 3 })}
     <div class="vf-f" style="--j:4"><label class="lb">Observations</label><span class="vf-in ta"><textarea data-vx="obs" rows="3" dir="auto">${aiEsc(X.obs)}</textarea></span></div>`;
  if (s === 2) return vfSec(3, "Besoins de la personne") +
    `${vfField("besoin", { j: 0, ta: 1, rows: 2 })}
     <div class="vf-g2">${vfField("poids", { j: 1, ltr: 1, im: "numeric", ph: "ex. 72" })}${vfField("taille", { j: 2, ltr: 1, im: "numeric", ph: "ex. 175" })}</div>
     <p class="vf-sub">Activités concernées</p>
     ${vfChecks("act", [["int", "Déplacements intérieurs"], ["ext", "Déplacements extérieurs"], ["trans", "Transferts"], ["pro", "Activités professionnelles"], ["loisirs", "Loisirs"], ["vehic", "Transport en véhicule"]], X.act)}`;
  if (s === 3) return vfSec(4, "Préconisations") +
    `<p class="vf-sub">Type de VPH recommandé</p><div class="vf-cards" role="radiogroup">${([["manuel", "Fauteuil roulant manuel", "Léger, autopropulsé"], ["elec", "Fauteuil roulant électrique", "Autonomie intérieure et extérieure"], ["scooter", "Scooter électrique", "Déplacements extérieurs"]] as const).map(([v, b, sm]) => `<label><input type="radio" name="vph" value="${v}" data-vx="vph" ${X.vph === v ? "checked" : ""}>${v === "elec" ? `<span class="aitag">${t("autoBadge")}</span>` : ""}<b>${b}</b><small>${sm}</small></label>`).join("")}</div>
     <p class="vf-sub">Options</p>${vfChecks("opt", [["coussin", "Coussin anti-escarres"], ["tete", "Appui-tête"], ["dossier", "Dossier inclinable"], ["jambes", "Repose-jambes réglables"]], X.opt)}
     <div class="vf-f"><label class="lb">Justification</label><span class="vf-in ta"><textarea data-vx="just" rows="4" dir="auto">${aiEsc(X.just)}</textarea></span></div>`;
  const miss = VPH_F.filter((f) => !String(Fm.v[f[0]] || "").trim());
  return vfSec(5, "Validation", false) +
    `<div class="vf-sum"><div><b>${nf(VPH_AUTO)}</b><small>${t("sumAuto")}</small></div><div><b style="color:${miss.length ? "#c77700" : "#16a352"}">${nf(miss.length)}</b><small>${t("sumMissing")}</small></div><div><b>${nf(Fm.edited.size)}</b><small>${t("sumEdited")}</small></div></div>
     ${miss.length ? `<div class="vf-f"><span class="lb">${t("missF")}</span>${miss.map((f) => `<button type="button" class="ai-btn" style="justify-content:flex-start;margin-bottom:6px" data-vgo="${f[0]}">${AIX.alert}<span>${aiEsc(f[1])}</span></button>`).join("")}</div>` : ""}
     <label class="ai-task" id="vfCert" style="padding:10px 0;cursor:pointer"><input type="checkbox" class="ai-ck" data-vx="cert" ${Fm.cert ? "checked" : ""}><span class="nm" style="white-space:normal">${t("certify")}</span></label>
     <div class="vf-g2"><div class="vf-f"><span class="lb">Signé par</span><span class="vf-in"><input value="${aiEsc(useAccount.getState().accounts[0].name)}" dir="auto" readonly></span></div><div class="vf-f"><span class="lb">Date</span><span class="vf-in"><input value="${new Intl.DateTimeFormat("fr-FR").format(new Date())}" dir="ltr" readonly></span></div></div>
     <p class="ai-err" id="vfErr" aria-live="polite"></p>`;
}
function vfSrcList() {
  const Fm = FS(), list = VPH_F.filter((f) => { const m = !String(Fm.v[f[0]] || "").trim(); return Fm.filter === "all" || (Fm.filter === "miss" ? m : !m); });
  return list.map((f, j) => { const val = String(Fm.v[f[0]] || "").trim(); return `<button type="button" class="vf-it${val ? "" : " miss"}" data-vgo="${f[0]}" style="--j:${j}"><span class="c"></span><span class="tx"><b>${aiEsc(f[1])}</b><small dir="auto">${val ? aiEsc(val) : t("toComplete")}</small></span></button>`; }).join("");
}
function vfTabs() { const Fm = FS(), fi = vfFilled(), mi = vfMissing(); return ([["all", "allF", VPH_F.length, ""], ["fill", "filledF", fi, "f"], ["miss", "missF", mi, "m"]] as const).map(([k, l, n, c]) => `<button type="button" role="tab" class="${c}" data-vtab="${k}" aria-selected="${Fm.filter === k}">${t(l)} <i>${nf(n)}</i></button>`).join(""); }
function vfFoot() {
  const Fm = FS(), mi = vfMissing(), last = Fm.step === 4;
  if (Fm.done) return `<span class="vf-stat"><span class="d"></span>${t("allDone")}</span><span class="sp"></span><button type="button" class="ai-btn" data-vfa="close">${t("aiClose")}</button>`;
  return `<span class="vf-stat"><span class="d"></span><span>${aiEsc(t("nFilled", { n: nf(VPH_AUTO) }))}</span></span>${mi ? `<span class="vf-stat o"><span class="d"></span><span>${aiEsc(mi === 1 ? t("nMissing1") : t("nMissing", { n: nf(mi) }))}</span></span>` : `<span class="vf-stat"><span class="d"></span>${t("allDone")}</span>`}<span class="sp"></span>
    ${Fm.step > 0 ? `<button type="button" class="ai-btn" data-vfa="prev">${t("prevStep")}</button>` : `<button type="button" class="ai-btn" data-vfa="cancel">${t("cancel")}</button>`}
    <button type="button" class="ai-btn pri" data-vfa="${last ? "validate" : "next"}"><span>${last ? t("validateBtn") : aiEsc(t("nextX", { x: VPH_STEPS[Fm.step + 1] }))}</span>${last ? "" : AIX.arr}</button>`;
}
function vfSteps() { const Fm = FS(); return VPH_STEPS.map((n, i) => (i ? `<span class="ln${i <= Fm.step || Fm.done ? " done" : ""}"></span>` : "") + `<button type="button" data-vstep="${i}" class="${i === Fm.step && !Fm.done ? "cur" : i < Fm.step || Fm.done ? "done" : ""}" aria-current="${i === Fm.step ? "step" : "false"}"><span class="n">${i < Fm.step || Fm.done ? aiSv('<path d="m6 12.5 4 4 8-9"/>', 14, 2.6) : nf(i + 1)}</span><span class="t">${n}</span></button>`).join(""); }
function renderForm(anim: boolean) {
  const Fm = RAI.form; if (!Fm) return;
  aiForm.innerHTML = `<header class="vf-head"><button type="button" class="ai-ib plain" data-vfa="back" aria-label="${aiEsc(t("aiClose"))}">${AIX.arrL}</button><h2 dir="auto">Fiche d’évaluation des besoins – VPH</h2><div class="vf-hb">
      <button type="button" class="ai-btn" data-vfa="orig" aria-pressed="${!!Fm.orig}">${AIX.orig}<span class="lb">${t(Fm.orig ? "backForm" : "viewOrig")}</span></button>
      <button type="button" class="ai-btn" data-vfa="dl" aria-label="${aiEsc(t("aiDownload"))}" title="${aiEsc(t("aiDownload"))}">${AIX.dl}<span class="lb lb-dl">${t("aiDownload")}</span></button>
      <span class="vf-save"><button type="button" class="ai-btn pri" data-vfa="save">${AIX.save}<span class="lb">${t("aiSave")}</span></button><button type="button" class="ai-btn pri" data-vfa="saveMenu" aria-haspopup="menu" aria-label="${aiEsc(t("aiMore"))}">${AIX.chevD}</button></span></div></header>
    <nav class="vf-steps" id="vfSteps" dir="ltr">${vfSteps()}</nav>
    <div class="vf-body${Fm.src ? "" : " nosrc"}" id="vfBody" style="position:relative">
      <aside class="vf-src"><div class="vf-srch"><span>${t("srcTitle")}</span><button type="button" data-vfa="srcHide" aria-label="${aiEsc(t("srcHide"))}" title="${aiEsc(t("srcHide"))}">${AIX.x.replace(/width="19" height="19"/, 'width="15" height="15"')}</button></div>
        <div class="vf-file"><div class="r"><img alt="" src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42"><rect width="34" height="42" rx="3" fill="#fff" stroke="#e2453c" stroke-width="1.5"/><rect x="5" y="6" width="24" height="3" fill="#e2453c" opacity=".8"/><rect x="5" y="13" width="20" height="2" fill="#c9cfcc"/><rect x="5" y="18" width="24" height="2" fill="#c9cfcc"/><rect x="5" y="23" width="16" height="2" fill="#c9cfcc"/><rect x="5" y="28" width="22" height="2" fill="#c9cfcc"/><rect x="5" y="33" width="12" height="2" fill="#c9cfcc"/></svg>')}"><span style="min-width:0"><b dir="ltr">fiche_evaluation_vph.pdf</b><small>${nf(2.4)} MB · ${t("analyzed")}</small></span></div><button type="button" class="ai-btn" data-vfa="reanalyze">${AIX.refresh}<span>${t("reanalyze")}</span></button></div>
        <div class="vf-tabs" role="tablist" id="vfTabs">${vfTabs()}</div>
        <div class="vf-list" id="vfList" dir="ltr">${vfSrcList()}</div></aside>
      <div class="vf-main" id="vfMain">${Fm.src ? "" : `<button type="button" class="ai-btn" data-vfa="srcShow" style="position:absolute;inset-inline-end:16px;top:14px;height:32px;font-size:12.5px;z-index:2">${t("srcShow")}</button>`}<div class="vf-pane${anim ? " in-r" : ""}" id="vfPane" dir="ltr">${vfPane()}</div></div>
      ${Fm.orig ? vfOrig() : ""}
    </div>
    <footer class="vf-foot" id="vfFoot">${vfFoot()}</footer>`;
}
function vfOrig() {
  const v = FS().v, m = (x: string) => (x ? `<mark>${aiEsc(x)}</mark>` : `<span class="blank"></span>`);
  return `<div class="vf-orig" id="vfOrig"><div class="bar">${AI_FI.pdf}<span dir="ltr">fiche_evaluation_vph.pdf</span><span class="sp"></span><small style="color:var(--muted);font-weight:400">${t("origNote")}</small><button type="button" class="ai-btn" data-vfa="orig" style="height:34px">${AIX.arrL.replace(/19/g, "15")}<span>${t("backForm")}</span></button></div>
  <div class="vf-paper"><div class="vf-page" dir="ltr"><h4>Fiche d’évaluation des besoins – VPH</h4><small style="color:#6b7570">Véhicule pour personne en situation de handicap · Document confidentiel</small>
  <h5>1. Patient</h5><div class="kv"><span>Nom / Prénom</span><span>${m(v.nom)} ${m(v.prenom)}</span><span>Date de naissance</span><span>${m(v.dob)}</span><span>Sexe</span><span>${m(v.sexe)}</span><span>Adresse</span><span>${m(v.adresse)}</span><span>Téléphone</span><span>${m(v.tel)}</span><span>Email</span><span>${m(v.email)}</span><span>Médecin traitant</span><span>${m(v.medNom)} — ${m(v.medCo)}</span></div>
  <h5>2. Situation</h5><div class="kv"><span>Pathologie</span><span>${m(v.patho)}</span><span>Date de survenue</span><span>${m(v.survenue)}</span><span>Lieu de vie</span><span>${m(v.situation)}</span><span>Aides actuelles</span><span>${m(v.aides)}</span></div>
  <h5>3. Besoins</h5><div class="kv"><span>Besoin principal</span><span>${m(v.besoin)}</span><span>Poids / Taille</span><span>${m(v.poids)} kg · ${m(v.taille)} cm</span></div>
  <h5>4. Préconisations</h5><p style="margin:0;color:#6b7570">À compléter par le professionnel prescripteur.</p></div></div></div>`;
}
function openForm(orig: boolean, force?: boolean) {
  ensureForm();
  if (!orig && !force && innerWidth <= 1200) { const m = missList()[0]; fcOpen(m ? m[2] : 0, m?.[0]); return; }
  FS().orig = !!orig;
  const was = !aiForm.hidden; aiForm.hidden = false; aiForm.classList.remove("leaving"); aiEl.classList.add("has-form"); aiEl.classList.remove("side-open");
  renderForm(!was); renderAIHead();
  if (!was && !lkRM()) { aiForm.style.animation = "none"; void aiForm.offsetWidth; aiForm.style.animation = ""; }
}
function closeForm() {
  if (aiForm.hidden) return; const fin = () => { aiForm.hidden = true; aiForm.classList.remove("leaving"); aiEl.classList.remove("has-form"); renderAIHead(); };
  if (lkRM()) fin(); else { aiForm.classList.add("leaving"); setTimeout(fin, 280); }
}
function vfGoStep(i: number, focusKey?: string) {
  const Fm = RAI.form; if (!Fm || aiForm.hidden || !aiQ("#vfSteps")) return; if (i === Fm.step && !Fm.done) { if (focusKey) vfFocus(focusKey); return; }
  const dir = i > Fm.step ? 1 : -1; Fm.step = i; Fm.done = false;
  aiQ("#vfSteps").innerHTML = vfSteps(); aiQ("#vfFoot").innerHTML = vfFoot();
  const p = aiQ("#vfPane"); p.className = "vf-pane " + (dir > 0 ? "in-r" : "in-l"); p.innerHTML = vfPane(); aiQ("#vfMain").scrollTop = 0;
  aiQ("#vfSteps .cur")?.scrollIntoView({ block: "nearest", inline: "center", behavior: lkRM() ? "auto" : "smooth" });
  if (focusKey) setTimeout(() => vfFocus(focusKey), 120);
}
function vfFocus(k: string) { const w = aiQ("#vfw_" + k); if (!w) return; w.scrollIntoView({ block: "center", behavior: lkRM() ? "auto" : "smooth" }); w.classList.remove("glow"); void w.offsetWidth; w.classList.add("glow"); w.querySelector<HTMLElement>("input,textarea")?.focus({ preventScroll: true }); }
function vfRefreshCounts(changedKey?: string) {
  aiQ("#vfTabs").innerHTML = vfTabs(); aiQ("#vfFoot").innerHTML = vfFoot();
  const list = aiQ("#vfList"); list.innerHTML = vfSrcList(); list.querySelectorAll<HTMLElement>(".vf-it").forEach((x) => (x.style.animation = "none"));
  if (changedKey) { const it = list.querySelector(`[data-vgo="${changedKey}"]`); if (it) { it.classList.add("pop"); it.scrollIntoView({ block: "nearest" }); } }
  aiQ("#vfFoot .vf-stat.o b, #vfFoot .vf-stat span:last-child")?.classList.add("bump");
}

/* ---------- form inside the chat + smart edits (L11055) ---------- */
function ensureForm(): FormState {
  if (RAI.form) return RAI.form; const Fm = newFormState(), s = aiStore.form;
  if (s && s.v) { Object.assign(Fm.v, s.v); if (s.extra) Object.assign(Fm.extra, s.extra); Fm.cert = !!s.cert; Fm.done = !!s.done; Fm.edited = new Set(s.edited || []); }
  RAI.form = Fm; return Fm;
}
let fcSaveT: ReturnType<typeof setTimeout> | undefined;
function saveForm() { clearTimeout(fcSaveT); fcSaveT = setTimeout(() => { const Fm = RAI.form; if (!Fm) return; aiStore.form = { v: Fm.v, extra: Fm.extra, cert: Fm.cert, done: Fm.done, edited: [...Fm.edited] }; aiSave(); }, 250); }
const FC_OPTS: Record<string, string[]> = { sexe: ["Masculin", "Féminin", "Autre"], situation: ["À domicile", "En établissement", "Hospitalisé"] };
const FC_CK = aiSv('<path d="m6 12.5 4 4 8-9"/>', 13, 2.8);
const isFilled = (k: string) => !!String(FS().v[k] || "").trim();
const missList = () => VPH_F.filter((f) => !isFilled(f[0]));
function fcCounts(s: number): [number, number] { const fs = VPH_F.filter((f) => f[2] === s); return [fs.filter((f) => isFilled(f[0])).length, fs.length]; }
function fcField(f: Field) {
  const [k, lab] = f, v = FS().v[k] || "", miss = !String(v).trim(), o = FC_OPTS[k];
  const ltr = /tel|email|cp|dob|survenue|poids|taille|medCo/.test(k);
  const ctl = o ? `<select data-fcf="${k}">${o.map((x) => `<option${x === v ? " selected" : ""}>${x}</option>`).join("")}</select>` : `<input data-fcf="${k}" value="${aiEsc(v)}" dir="${ltr ? "ltr" : "auto"}"${/poids|taille|cp/.test(k) ? ' inputmode="decimal"' : ""}${k === "poids" ? ' placeholder="kg"' : k === "taille" ? ' placeholder="cm"' : ""}>`;
  return `<label class="fc-f${miss ? " miss" : ""}${/adresse|patho|aides|besoin|medCo|email/.test(k) ? " wide" : ""}" data-fck="${k}"><span>${aiEsc(lab)}${miss ? ` <em>${t("toComplete")}</em>` : ""}</span>${ctl}</label>`;
}
function fcSecHead(s: number, open: boolean) {
  const [fi, n] = fcCounts(s), ok = s === 3 || fi === n;
  const st = s === 3 || ok ? "" : `<span class="fc-st">${nf(n - fi)} · ${t("toComplete")}</span>`;
  return `<button type="button" class="fc-sh" data-fcs="${s}" aria-expanded="${!!open}"><span class="n">${ok ? FC_CK : nf(s + 1)}</span><b dir="ltr">${VPH_STEPS[s]}</b>${s < 3 ? `<small>${nf(fi)}/${nf(n)}</small>` : ""}${st}<span class="un-chev">${UNI.chev}</span></button>`;
}
function fcSec(s: number, open: boolean) {
  const X = FS().extra, [fi, n] = fcCounts(s), ok = s === 3 || fi === n;
  const body = s < 3 ? VPH_F.filter((f) => f[2] === s).map(fcField).join("") : `<label class="fc-f wide"><span>Type de VPH recommandé</span><select data-fcx="vph">${([["manuel", "Fauteuil roulant manuel"], ["elec", "Fauteuil roulant électrique"], ["scooter", "Scooter électrique"]] as const).map(([v, l]) => `<option value="${v}"${X.vph === v ? " selected" : ""}>${l}</option>`).join("")}</select></label><label class="fc-f wide"><span>Justification</span><textarea data-fcx="just" rows="3" dir="auto">${aiEsc(X.just)}</textarea></label>`;
  return `<div class="fc-sec${open ? " open" : ""}${ok ? " ok" : ""}" data-fcsec="${s}">${fcSecHead(s, open)}<div class="fc-body"><div class="fc-in"><div class="fc-grid" dir="ltr">${body}</div></div></div></div>`;
}
const fcPct = () => Math.round((vfFilled() / VPH_F.length) * 100);
const fcRing = (p: number) => `<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" stroke-width="4"/><circle class="fg" cx="22" cy="22" r="18" fill="none" stroke="#22b14c" stroke-width="4" stroke-linecap="round" stroke-dasharray="113.1" stroke-dashoffset="${(113.1 * (1 - p / 100)).toFixed(1)}" transform="rotate(-90 22 22)"/></svg>`;
const fcStatus = () => (FS().done ? t("validated") : t("fcStatus", { n: nf(vfFilled()), m: nf(VPH_F.length) }));
function fcFoot() {
  const Fm = FS();
  if (Fm.done) return `<div class="fc-done">${AIX.ccheck}<b>${t("validated")}</b><span class="sp"></span><button type="button" class="ai-btn" data-fca="dl">${AIX.dl}<span>${t("aiDownload")}</span></button></div>`;
  return `<div class="fc-val"><label class="ai-task fc-cert"><input type="checkbox" class="ai-ck" data-fcc ${Fm.cert ? "checked" : ""}><span class="nm">${t("certify")}</span></label><button type="button" class="ai-btn pri" data-fca="validate">${FC_CK}<span>${t("validateBtn")}</span></button></div>`;
}
function fcHTML() {
  const Fm = ensureForm(), p = fcPct(), fm = missList()[0], openS = Fm.done ? -1 : fm ? fm[2] : -1;
  return `<div class="ai-card fc" id="aiFC" style="--k:1"><div class="fc-h">${AI_FI.pdf}<div class="tx"><b dir="ltr">Fiche d’évaluation des besoins – VPH</b><small id="fcStat">${fcStatus()}</small></div><span class="fc-ring" id="fcRing">${fcRing(p)}<i>${nf(p)}%</i></span><button type="button" class="ai-ib" data-fca="full" aria-label="${aiEsc(t("qrOpenFull"))}" title="${aiEsc(t("qrOpenFull"))}">${AIX.expand}</button></div><div class="fc-bar"><i id="fcBar" style="width:${p}%"></i></div>${[0, 1, 2, 3].map((s) => fcSec(s, s === openS)).join("")}<div id="fcFoot">${fcFoot()}</div></div>`;
}
function fcRefresh(k?: string) {
  const c = aiThread.querySelector<HTMLElement>("#aiFC"); renderCtx(); if (!c || !RAI.form) return;
  const p = fcPct(); c.querySelector("#fcStat")!.textContent = fcStatus();
  c.querySelector("#fcRing .fg")!.setAttribute("stroke-dashoffset", (113.1 * (1 - p / 100)).toFixed(1)); c.querySelector("#fcRing i")!.textContent = nf(p) + "%"; c.querySelector<HTMLElement>("#fcBar")!.style.width = p + "%";
  [0, 1, 2, 3].forEach((s) => {
    const sec = c.querySelector(`[data-fcsec="${s}"]`); if (!sec) return; const [fi, n] = fcCounts(s), ok = s === 3 || fi === n, was = sec.classList.contains("ok");
    sec.classList.toggle("ok", ok); const h = sec.querySelector(".fc-sh")!; const tmp = document.createElement("div"); tmp.innerHTML = fcSecHead(s, sec.classList.contains("open")); h.replaceWith(tmp.firstChild!);
    if (ok && !was && !lkRM()) sec.querySelector(".n")!.animate([{ transform: "scale(.4)" }, { transform: "scale(1.25)" }, { transform: "none" }], { duration: 500, easing: "cubic-bezier(.2,1.4,.3,1)" });
  });
  if (k) { const lab = c.querySelector(`[data-fck="${k}"]`); if (lab) { const miss = !isFilled(k); lab.classList.toggle("miss", miss); const em = lab.querySelector("em"); if (!miss && em) em.remove(); if (miss && !em) lab.querySelector("span")!.insertAdjacentHTML("beforeend", ` <em>${t("toComplete")}</em>`); } }
  const ft = c.querySelector("#fcFoot")!, isDone = !!ft.querySelector(".fc-done"); if (isDone !== RAI.form.done) { ft.innerHTML = fcFoot(); if (!lkRM()) ft.firstElementChild!.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,1,.3,1)" }); }
}
/* one setter shared by chat card, side panel and smart edits (L11114) */
function formSet(k: string, val: string, src: string) {
  const Fm = ensureForm(), before = isFilled(k); Fm.v[k] = val; Fm.edited.add(k); const now = isFilled(k);
  let w: HTMLElement | null = null;
  if (!aiForm.hidden && aiQ("#vfPane")) {
    if (src !== "panel") { const inp = aiQ<HTMLInputElement>("#vf_" + k); if (inp) inp.value = val; aiForm.querySelectorAll<HTMLInputElement>(`input[type=radio][data-vf="${k}"]`).forEach((r) => (r.checked = r.value === val)); }
    w = aiQ("#vfw_" + k); if (w) { w.classList.toggle("miss", !now); const tag = w.parentElement!.querySelector(".vf-miss-tag"); if (now && tag) tag.remove(); if (!now && !tag) w.parentElement!.querySelector(".lb")!.insertAdjacentHTML("beforeend", `<span class="vf-miss-tag">${t("toComplete")}</span>`); }
    if (k === "dob") { const a = aiQ("#vfAge"); if (a) a.textContent = vfAge(); }
    if (before !== now) vfRefreshCounts(k); else { const it = aiQ(`#vfList [data-vgo="${k}"] small`); if (it) it.textContent = val; }
    if (src !== "panel" && w) { w.classList.remove("glow"); void w.offsetWidth; w.classList.add("glow"); }
  }
  if (src !== "inline") aiThread.querySelectorAll<HTMLInputElement>(`[data-fcf="${k}"]`).forEach((i) => { if (i !== document.activeElement) i.value = val; });
  fcRefresh(k); saveForm();
}
function formSetExtra(x: string, val: string, src: string) {
  const Fm = ensureForm(); (Fm.extra as unknown as Record<string, string>)[x] = val; saveForm();
  if (src !== "panel" && !aiForm.hidden) { if (x === "vph") aiForm.querySelectorAll<HTMLInputElement>('input[data-vx="vph"]').forEach((r) => (r.checked = r.value === val)); else { const e = aiForm.querySelector<HTMLInputElement>(`[data-vx="${x}"]`); if (e) e.value = val; } }
  if (src !== "inline") { const e = aiThread.querySelector<HTMLInputElement>(`[data-fcx="${x}"]`); if (e && e !== document.activeElement) e.value = val; }
}
function formSetCert(on: boolean, src: string) {
  const Fm = ensureForm(); Fm.cert = on; saveForm();
  if (src !== "panel") { const c = aiForm.querySelector<HTMLInputElement>('[data-vx="cert"]'); if (c) c.checked = on; }
  if (src !== "inline") { const c = aiThread.querySelector<HTMLInputElement>("[data-fcc]"); if (c) c.checked = on; }
}
const shake = (el: Element | null) => { if (!el) return; el.classList.remove("err"); void (el as HTMLElement).offsetWidth; el.classList.add("err"); if (!lkRM()) el.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-3px)" }, { transform: "none" }], { duration: 360 }); };
function formValidate(src: string) {
  const Fm = ensureForm(), mi = missList()[0];
  if (mi) { toast(t("missingLeft")); if (src === "panel") { const er = aiQ("#vfErr"); if (er) er.textContent = t("missingLeft"); setTimeout(() => vfGoStep(mi[2], mi[0]), 500); } else fcOpen(mi[2], mi[0]); return "missing"; }
  if (!Fm.cert) { if (src === "panel") { shake(aiQ("#vfCert")); const er = aiQ("#vfErr"); if (er) er.textContent = t("certifyNeed"); } else { shake(aiThread.querySelector(".fc-cert")); toast(t("certifyNeed")); } return "cert"; }
  if (Fm.done) return "ok";
  Fm.done = true; saveForm();
  if (!aiForm.hidden && aiQ("#vfPane")) { aiQ("#vfSteps").innerHTML = vfSteps(); aiQ("#vfFoot").innerHTML = vfFoot(); const p = aiQ("#vfPane"); p.className = "vf-pane in-r"; p.innerHTML = vfPane(); }
  fcRefresh(); toast(t("validated"));
  if (aiConv("form")) { aiStore.formMsgs = aiStore.formMsgs || []; const m: Msg = { r: "a", t: t("fcValidatedMsg"), at: Date.now(), ok: 1 }; aiStore.formMsgs.push(m); aiSave(); if (RAI.cur === "form") aiAppend(fmsgHTML(m)); }
  return "ok";
}
function fcOpen(s: number, k?: string) {
  if (RAI.cur !== "form" && aiConv("form")) selectConv("form");
  setTimeout(() => {
    const c = aiThread.querySelector("#aiFC"); if (!c) return;
    const sec = c.querySelector(`[data-fcsec="${s}"]`); if (sec && !sec.classList.contains("open")) { sec.classList.add("open"); sec.querySelector(".fc-sh")!.setAttribute("aria-expanded", "true"); }
    c.scrollIntoView({ block: "nearest", behavior: lkRM() ? "auto" : "smooth" });
    if (k) { const lab = c.querySelector<HTMLElement>(`[data-fck="${k}"]`); if (lab) { lab.classList.remove("glow"); void lab.offsetWidth; lab.classList.add("glow"); setTimeout(() => lab.querySelector<HTMLElement>("input,select,textarea")?.focus({ preventScroll: true }), 350); } }
  }, RAI.cur === "form" ? 0 : 380);
}
function runQR(k: string) {
  if (k === "fill") { const m = missList()[0]; if (m) fcOpen(m[2], m[0]); else fcOpen(0); return; }
  if (k === "full") return openForm(false, true);
  if (k === "orig") return openForm(true, true);
  if (k === "validate") { formValidate("inline"); return; }
  if (k === "explain") return void aiAsk(t("pExplainVph"));
  if (k === "pmail") return void aiAsk(t("pPrepMail"));
  if (k === "pprio") return void aiAsk(t("pPrepPrio"));
}
/* contextual suggestions above the message box (L11161) */
function renderCtx() {
  const el = aiQ("#aiCtx"); if (!el) return; let L: [string, string][] = [];
  if (RAI.cur === "form" && aiConv("form")) { const Fm = ensureForm(), mi = missList().length; if (!Fm.done) L.push(mi ? ["fill", "qrMissing"] : ["validate", "qrValidate"]); L.push(["full", "qrOpenFull"], ["orig", "qrOrig"], ["explain", "qrExplain"]); }
  else if (RAI.cur === "prep") L = [["pmail", "qrPrepMail"], ["pprio", "qrPrepPrio"]];
  const sig = L.map((x) => x[0]).join(); if (el.dataset.sig === sig) { el.querySelectorAll("button").forEach((b, i) => (b.querySelector("span")!.textContent = t(L[i][1]))); return; }
  el.dataset.sig = sig; el.innerHTML = L.map(([k, l], i) => `<button type="button" data-qr="${k}" style="--k:${i}">${AIX.spark(13)}<span>${t(l)}</span></button>`).join(""); el.hidden = !L.length;
  aiInput.placeholder = t(RAI.cur === "form" && aiConv("form") ? "fcAskPh" : "aiPh");
}
/* messages added after the scripted part of the form chat (L11171) */
function diffHTML(d?: Diff[]) { return d && d.length ? `<div class="ai-card fc-diff" style="--k:0"><div class="ai-ch"><span class="ci" style="--c:#22b14c">${AIX.ccheck}</span><div class="ct"><b>${t("fcUpdated")}</b></div></div>${d.map(([k, o, n], j) => `<div class="fc-dr" style="--j:${j}"><span>${aiEsc((fdef(k) || [0, k])[1])}</span><span dir="auto">${o ? `<s>${aiEsc(o)}</s>` : `<s>—</s>`}${AIX.arr}<b>${aiEsc(n)}</b></span></div>`).join("")}</div>` : ""; }
function fmsgHTML(m: Msg) {
  if (m.r === "u") return aiU(m.t, m.at);
  return aiA(`${m.t ? `<div class="ai-md">${aiMd(m.t)}</div>` : ""}${diffHTML(m.diff)}${m.st ? `<p class="ai-md" style="margin-top:10px">${aiEsc(m.st)}</p>` : ""}${m.qr ? `<div class="ai-qr">${m.qr.map(([k, l]) => `<button type="button" data-qr="${k}">${t(l)}</button>`).join("")}</div>` : ""}${m.err ? `<p class="ai-err">${aiEsc(m.err)}</p>` : ""}`);
}
function followHTML() { const ms = VPH_F.filter((f) => !f[3]); return `<p class="ai-md" style="margin:0">${aiEsc(t("fcMissing", { n: nf(ms.length), x: ms.map((f) => f[1]).join(", ") }))}</p><div class="ai-qr"><button type="button" data-qr="fill">${t("qrFillHere")}</button><button type="button" data-qr="full">${t("qrOpenFull")}</button></div>`; }
/* smart parsing of plain messages (L11178) */
function parseFormText(s: string) {
  const out: Record<string, string> = {}, T = " " + s + " "; let m: RegExpMatchArray | null;
  if ((m = T.match(/(?:poids|weight|gewicht|الوزن)\D{0,14}?(\d{2,3}(?:[.,]\d)?)/i) || T.match(/(\d{2,3}(?:[.,]\d)?)\s*(?:kg|kilo|كغ)/i))) out.poids = m[1].replace(",", ".");
  if ((m = T.match(/(?:taille|height|größe|grösse|groesse|الطول)\D{0,14}?(\d[.,]\d{2}|\d{3})/i) || T.match(/(\d{3})\s*(?:cm|سم)/i) || T.match(/\b(1)\s*[.,m]\s*(\d{2})\s*m?\b/i))) out.taille = m[2] ? m[1] + m[2] : m[1].replace(/[.,]/, "").padEnd(3, "0");
  const AL: Record<string, string[]> = { nom: ["nom", "last name", "surname", "nachname"], prenom: ["prénom", "prenom", "first name", "vorname"], dob: ["date de naissance", "date of birth", "birth date", "geburtsdatum"], adresse: ["adresse", "address"], cp: ["code postal", "postal code", "zip", "plz"], ville: ["ville", "city", "stadt"], tel: ["téléphone", "telephone", "phone", "telefon"], email: ["e-mail", "email"], medNom: ["médecin traitant", "doctor", "physician", "arzt"], medCo: ["coordonnées", "doctor contact"], patho: ["pathologie principale", "pathologie", "condition", "diagnosis"], survenue: ["date de survenue", "onset"], situation: ["situation actuelle", "situation"], aides: ["aides actuelles", "aides", "current help"], besoin: ["besoin principal", "main need"], sexe: ["sexe", "sex", "gender"] };
  const rx = (a: string) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [k, arr] of Object.entries(AL)) for (const a of arr) { const mm = s.match(new RegExp("(?:^|[,;\\n])\\s*" + rx(a) + "\\s*[:=]\\s*([^,;\\n]+)", "i")); if (mm) { out[k] = mm[1].trim(); break; } }
  return sanitizeUps(out);
}
function sanitizeUps(o: unknown) {
  const r: Record<string, string> = {}; if (!o || typeof o !== "object") return r;
  for (const [k, v0] of Object.entries(o as Record<string, unknown>)) {
    if (!fdef(k)) continue; let v = String(v0 ?? "").trim().slice(0, 120); if (!v) continue;
    if (FC_OPTS[k]) { const hit = FC_OPTS[k].find((x) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "") === v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "") || x.toLowerCase().startsWith(v.toLowerCase().slice(0, 4))); if (!hit) continue; v = hit; }
    if ((k === "poids" || k === "taille") && !/^\d{2,3}(\.\d)?$/.test(v.replace(",", "."))) continue;
    r[k] = v;
  }
  return r;
}
function applyUpdates(ups: Record<string, string>) {
  const Fm = ensureForm(), d: Diff[] = [];
  for (const [k, v] of Object.entries(ups)) { const old = String(Fm.v[k] || ""); if (old === v) continue; d.push([k, old, v]); formSet(k, v, "chat"); }
  const c = aiThread.querySelector("#aiFC");
  if (c && d.length) {
    const secs = new Set(d.map((x) => fdef(x[0])![2])); secs.forEach((s) => { const sec = c.querySelector(`[data-fcsec="${s}"]`); if (sec && !sec.classList.contains("open")) { sec.classList.add("open"); sec.querySelector(".fc-sh")!.setAttribute("aria-expanded", "true"); } });
    d.forEach(([k]) => { const lab = c.querySelector<HTMLElement>(`[data-fck="${k}"]`); if (lab) { lab.classList.remove("glow"); void lab.offsetWidth; lab.classList.add("glow"); } });
  }
  return d;
}
function formStatusMsg(): { st?: string; qr?: [string, string][] | null } { const ms = missList(), Fm = FS(); if (Fm.done) return { st: "", qr: null }; if (ms.length) return { st: t("fcStill", { x: ms.map((f) => f[1]).join(", ") }), qr: [["fill", "qrMissing"]] }; return { st: Fm.cert ? t("fcAllDone") : t("fcNeedCert"), qr: [["validate", "qrValidate"]] }; }
function pushFormMsg(m: Msg, tok?: number) { aiStore.formMsgs = aiStore.formMsgs || []; aiStore.formMsgs.push(m); aiSave(); if (tok === undefined || tok === RAI.play) return aiAppend(fmsgHTML(m)); }
async function formAsk(text: string) {
  ensureForm(); const tok = ++RAI.play;
  pushFormMsg({ r: "u", t: text, at: Date.now() });
  const ups = parseFormText(text);
  if (Object.keys(ups).length) {
    const th = aiAppend(aiThink(t("fcApplying"))); setBusy(true); await new Promise((r) => setTimeout(r, lkRM() ? 40 : 550)); th.remove();
    const d = applyUpdates(ups), s = formStatusMsg(); pushFormMsg({ r: "a", t: d.length ? "" : t("fcNoChange"), diff: d, st: s.st, qr: s.qr, at: Date.now() }, tok); setBusy(false); return;
  }
  if (text.length < 40 && /(valid|bestätig|اعتماد|اعتمد)/i.test(text)) { const r = formValidate("chat"); if (r !== "ok") { const s = formStatusMsg(); pushFormMsg({ r: "a", t: s.st!, qr: s.qr, at: Date.now() }, tok); } return; }
  const row = aiAppend(aiA(`<div class="ai-think"><span class="ai-dots"><i></i><i></i><i></i></span><span>${t("aiBusy")}</span></div>`)), ab = row.querySelector<HTMLElement>(".ai-ab")!; setBusy(true);
  const S = await aiGetSample();
  const fin = (m: Partial<Msg>) => { row.remove(); pushFormMsg(Object.assign({ r: "a" as const, at: Date.now(), t: "" }, m), tok); if (tok === RAI.play) setBusy(false); };
  if (!S) { fin({ t: t("fcNoParse") }); return; }
  const Fm = FS(); let canTools = false; try { canTools = !!(await S.limits?.())?.tools; } catch {}
  const formJson = JSON.stringify(Object.fromEntries(VPH_F.map((f) => [f[0], { label: f[1], value: Fm.v[f[0]] || "" }])));
  const sys = `You are Remotion AI inside Remotion OS, helping a healthcare professional complete the French form "Fiche d’évaluation des besoins – VPH" (wheelchair / mobility device needs assessment). Reply in ${LANGS[lang()].name}, briefly (at most about 120 words), warm and practical; use "- " bullets when listing. The form fields as JSON (key → label, current value): ${formJson}. Recommended device: ${Fm.extra.vph}. Validated: ${Fm.done}. ${canTools ? "When the user gives or corrects values, call set_fields with the exact keys. Weight in kg and height in cm as plain numbers; dates as JJ/MM/AAAA; sexe one of Masculin/Féminin/Autre; situation one of À domicile/En établissement/Hospitalisé. Never invent values the user did not give." : "You cannot change the form yourself: tell the user which values to type, e.g. 'poids 72, taille 178'."}`;
  const turns = [{ role: "user", content: sys }];
  (aiStore.formMsgs || []).slice(0, -1).slice(-8).forEach((m) => { if (m.r === "u") turns.push({ role: "user", content: m.t }); else if (m.t) turns.push({ role: "assistant", content: m.t }); });
  turns.push({ role: "user", content: text });
  const diffs: Diff[] = [], ctl = new AbortController(); RAI.ctl = ctl; let last = "";
  const opts: SampleOpts = { signal: ctl.signal, onText: ({ text: x }) => { last = x; if (tok !== RAI.play) return; ab.innerHTML = `<div class="ai-md">${aiMd(x)}<span class="caret"></span></div>`; aiScroll.scrollTop = aiScroll.scrollHeight; } };
  if (canTools) opts.tools = [{ name: "set_fields", description: "Set one or more fields of the VPH form. Pass {fields:{key:value}} using the form keys. Returns which fields changed and which are still missing.", inputSchema: { type: "object", properties: { fields: { type: "object", description: "Map of form field key to its new value (string)", additionalProperties: { type: "string" } } }, required: ["fields"] }, execute: (inp?: { fields?: unknown }) => { const d = applyUpdates(sanitizeUps(inp?.fields)); diffs.push(...d); return { changed: d.map((x) => x[0]), stillMissing: missList().map((f) => f[0]) }; } }];
  else opts.cache = false;
  try { const r = await S(turns, opts); const s = diffs.length ? formStatusMsg() : {}; fin({ t: r.text, diff: diffs, st: s.st, qr: s.qr, err: r.truncated ? t("aiTrunc") : undefined }); }
  catch (e0) { const e = e0 as SampleErr; const keep = e?.code === "refused" ? "" : e?.text ?? last; fin({ t: keep, diff: diffs, err: e?.code === "cancelled" ? undefined : t(aiErrText(e?.code)) }); }
}

/* ---------- listeners: the side panel (L10570–L10600), then the chat card (L11147–L11152) ---------- */
function install() {
  const offs: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, ev: K, fn: (e: HTMLElementEventMap[K]) => void) => { el.addEventListener(ev, fn as EventListener); offs.push(() => el.removeEventListener(ev, fn as EventListener)); };
  on(aiForm, "input", (e) => {
    if (!RAI.form) return; const el = tg(e), k = el.dataset.vf, x = el.dataset.vx;
    if (k && el.type !== "radio") formSet(k, el.value, "panel");
    else if (x && x !== "cert" && el.type !== "radio" && el.type !== "checkbox") formSetExtra(x, el.value, "panel");
  });
  on(aiForm, "change", (e) => {
    const Fm = RAI.form; if (!Fm) return; const el = tg(e), x = el.dataset.vx, c = el.dataset.vxc;
    if (x === "cert") { formSetCert(el.checked, "panel"); aiQ("#vfCert")?.classList.remove("err"); return; }
    if (x === "vph") { formSetExtra("vph", el.value, "panel"); return; }
    if (c) { const arr = (Fm.extra as unknown as Record<string, string[]>)[c]; const i = arr.indexOf(el.value); if (el.checked && i < 0) arr.push(el.value); if (!el.checked && i >= 0) arr.splice(i, 1); saveForm(); return; }
    if (el.type === "radio" && el.dataset.vf) formSet(el.dataset.vf, el.value, "panel");
  });
  on(aiForm, "click", (e) => {
    const Fm = RAI.form; if (!Fm) return; const el = tg(e);
    const st = el.closest<HTMLElement>("[data-vstep]"); if (st) { vfGoStep(+st.dataset.vstep!); return; }
    const tb = el.closest<HTMLElement>("[data-vtab]"); if (tb) { Fm.filter = tb.dataset.vtab!; aiQ("#vfTabs").innerHTML = vfTabs(); aiQ("#vfList").innerHTML = vfSrcList(); return; }
    const g = el.closest<HTMLElement>("[data-vgo]"); if (g) { const k = g.dataset.vgo!; if (Fm.orig) { Fm.orig = false; aiQ("#vfOrig")?.remove(); if (aiQ('[data-vfa="orig"] .lb')) aiQ('[data-vfa="orig"] .lb').textContent = t("viewOrig"); } vfGoStep(fdef(k)![2], k); return; }
    const b = el.closest<HTMLElement>("[data-vfa]"); if (!b) return; const a = b.dataset.vfa;
    if (a === "back" || a === "cancel" || a === "close") { closeForm(); return; }
    if (a === "next") { vfGoStep(Fm.step + 1); return; }
    if (a === "prev") { vfGoStep(Fm.step - 1); return; }
    if (a === "validate") { formValidate("panel"); return; }
    if (a === "dl") { toast(t("dlPreview")); return; }
    if (a === "save") { toast(t("formSaved")); b.animate?.([{ transform: "scale(.95)" }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,1.4,.3,1)" }); return; }
    if (a === "saveMenu") { openAIPop(b, [{ id: "sd", l: t("saveDraft"), ic: AIX.save, run: () => toast(t("formSaved")) }, { id: "se", l: t("saveExport"), ic: AIX.dl, run: () => toast(t("dlPreview")) }]); return; }
    if (a === "orig") { Fm.orig = !Fm.orig; if (Fm.orig) { aiQ("#vfBody").insertAdjacentHTML("beforeend", vfOrig()); } else { const o = aiQ("#vfOrig"); if (o && !lkRM()) o.animate([{ opacity: 1 }, { opacity: 0, transform: "translateX(20px)" }], { duration: 220 }).finished.then(() => o.remove()); else o?.remove(); } aiQ('.vf-head [data-vfa="orig"] .lb').textContent = t(Fm.orig ? "backForm" : "viewOrig"); aiQ('.vf-head [data-vfa="orig"]').setAttribute("aria-pressed", String(Fm.orig)); return; }
    if (a === "srcHide" || a === "srcShow") { Fm.src = a === "srcShow"; renderForm(false); return; }
    if (a === "reanalyze") {
      if (b.classList.contains("busy")) return; b.classList.add("busy"); const items = [...aiQ("#vfList").querySelectorAll(".vf-it")];
      items.forEach((it, i) => setTimeout(() => { it.classList.remove("scan"); void (it as HTMLElement).offsetWidth; it.classList.add("scan"); }, i * 60));
      setTimeout(() => { b.classList.remove("busy"); toast(t("reanalyzed", { n: nf(vfFilled()) })); }, Math.max(900, items.length * 60 + 300)); return;
    }
  });
  on(aiThread, "input", (e) => { const el = tg(e), k = el.dataset.fcf, x = el.dataset.fcx; if (k && el.tagName !== "SELECT") formSet(k, el.value, "inline"); else if (x === "just") formSetExtra(x, el.value, "inline"); });
  on(aiThread, "change", (e) => { const el = tg(e), k = el.dataset.fcf, x = el.dataset.fcx; if (k && el.tagName === "SELECT") formSet(k, el.value, "inline"); else if (x === "vph") formSetExtra(x, el.value, "inline"); else if (el.hasAttribute("data-fcc")) { formSetCert(el.checked, "inline"); el.closest(".fc-cert")?.classList.remove("err"); } });
  on(aiThread, "click", (e) => {
    const el = tg(e);
    const s = el.closest<HTMLElement>("[data-fcs]"); if (s) { const sec = s.parentElement!, o = sec.classList.toggle("open"); s.setAttribute("aria-expanded", String(o)); return; }
    const a = el.closest<HTMLElement>("[data-fca]"); if (a) { const k = a.dataset.fca; if (k === "full") openForm(false, true); else if (k === "validate") formValidate("inline"); else if (k === "dl") toast(t("dlPreview")); return; }
    const q = el.closest<HTMLElement>("[data-qr]"); if (q) runQR(q.dataset.qr!);
  });
  return () => offs.forEach((f) => f());
}

Object.assign(F, { renderCtx, fcHTML, followHTML, fmsgHTML, renderForm, closeForm, openForm, formAsk, runQR, install });
