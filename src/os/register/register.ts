"use client";
/**
 * Registration wizard (source L9254–L9899): account → profile → organisation → verification → review → creating →
 * created.
 *
 * Deliberate structure (ADR-04 exception, doc 15 slice 9): the wizard is a self-contained screen whose behaviour is
 * built on string templates and in-place DOM patches (swapPart, detectOrg, markVerified, the code boxes, the photo
 * drop zone). It is ported as a typed imperative island that renders into containers React mounts once and never
 * re-renders (`#rgSteps`, `#rgBody`, `#rgOut`, the carousel and quote parts). Templates and handlers follow the
 * source line by line; tables are extracted from the source (tools/extract-rg-data.mjs).
 *
 * Everything stays simulated as in the source (S class): no account is created on a server; the OTP accepts any six
 * digits; organisation lookups use the three demo directory entries.
 */
import { formatNumber, translate } from "@/lib/i18n/core";
import { LANGS, isLang, type Lang } from "@/lib/i18n/langs";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { useShell } from "@/os/state/shell";
import { PROFILES, saveAcc, setStatus, useAccount, type Account } from "@/os/account/store";
import { MI } from "@/os/shortcuts/catalogue";
import { scenes, paint } from "@/os/shell/wallpaper";
import { switchLang } from "@/os/shell/shellActions";
import { registerOsAction } from "@/os/actions";
import { boot, closeOverlays, lkRM, QUOTES } from "@/os/lock/lock";
import { LKI } from "@/os/lock/LockScreen";
import { GOV } from "@/os/signin/SignIn";
import { showSignin } from "@/os/signin/si";
import { esc } from "@/os/keyboard/layout";
import raw from "./data.json";

type Dict = Record<string, string>;
const RGI = raw.RGI as Dict, FLAGS = raw.FLAGS as Dict, DIAL = raw.DIAL as Dict, PFI = raw.PFI as Dict, OI = raw.OI as Dict, VI = raw.VI as Dict, RVI = raw.RVI as Dict, LANG_FLAG = raw.LANG_FLAG as Dict;
const PROFESSIONS = raw.PROFESSIONS as string[], STEP_KEYS = raw.STEP_KEYS as string[];
const PW_LV = raw.PW_LV as [string, string][], RG_ROLES = raw.RG_ROLES as [string, string][], ID_TYPES = raw.ID_TYPES as [string, number][];
const VCH = raw.VCH as Record<string, { ic: string; cls: string }>;
type Org = { name: string; siret: string; city: string; cc: string; members: string; typeK: string; addr: string; zip: string; web: string };
const ORG_DIR = raw.ORG_DIR as Org[];
const ORG_CC = Object.keys(FLAGS);

const lang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
const t = (k: string, v?: Record<string, string | number>) => translate(lang(), k, v);
const nf = (n: number) => formatNumber(lang(), n);
const loc = () => LANGS[lang()].locale;
const toast = (m: string) => useShell.getState().showToast(m);
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const rgEl = () => $("rg")!, rgBody = () => $("rgBody")!, rgSteps = () => $("rgSteps")!, rgOut = () => $("rgOut")!;
export const isRegister = () => !!$("rg")?.classList.contains("on");
const shellEl = () => $("shell") as (HTMLElement & { inert: boolean }) | null;
const replay = (el: Element | null, cls: string) => { if (!el) return; el.classList.remove(cls); void (el as HTMLElement).offsetWidth; el.classList.add(cls); };
const shake = (el: Element | null | undefined) => el?.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 320 });

const sysTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Tunis"; } catch { return "Africa/Tunis"; } })();
const RG0 = () => ({ method: "email", first: "", last: "", email: "", pass: "", pass2: "", agree: false, verified: null as string | null, noPass: false, photo: null as string | null, cc: "TN", phone: "", pref: lang() as string, tz: sysTz, orgMode: "invite", invite: "", ident: "", identCC: "FR", found: null as Org | null, orgName: "", country: "FR", idType: "SIRET", idNum: "", addr: "", city: "", zip: "", web: "", role: "therapist", code: "", codeOk: false, channel: "email", editEmail: false, checking: false, tos: null as boolean | null, priv: null as boolean | null, dpa: false, profession: "physio", rpps: "", roleSet: false });
type RG = ReturnType<typeof RG0>;
// Created when the wizard opens (RG0 reads the page language, which does not exist during prerendering).
let rg = undefined as unknown as RG, rgStep = 0, rgMax = 0, rgBusy = false, rgSlideI = 0, rgQ = 0, rgResendLeft = 0;
let rgSlideT: ReturnType<typeof setInterval> | undefined, rgResendT: ReturnType<typeof setInterval> | null = null, rgTimers: ReturnType<typeof setTimeout>[] = [];
let rgPopEl: HTMLElement | null = null;
const rgLater = (fn: () => void, ms: number) => { const id = setTimeout(fn, ms); rgTimers.push(id); return id; };
const countryName = (c: string) => { try { return new Intl.DisplayNames([loc()], { type: "region" }).of(c) || c; } catch { return c; } };

/* time zones: offset label + city, sorted by offset (L9306) */
let TZ_CACHE: { z: string; off: string; mins: number; city: string }[] | null = null;
function tzList() {
  if (TZ_CACHE) return TZ_CACHE;
  let zones: string[] = []; try { zones = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { /* old engine */ }
  if (!zones.length) zones = ["Pacific/Honolulu", "America/Los_Angeles", "America/New_York", "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Africa/Tunis", "Africa/Algiers", "Africa/Casablanca", "Africa/Lagos", "Africa/Cairo", "Europe/Istanbul", "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney"];
  if (!zones.includes(sysTz)) zones.push(sysTz);
  const now = new Date();
  TZ_CACHE = zones.map((z) => {
    let off = "+00:00", mins = 0;
    try { const p = new Intl.DateTimeFormat("en-US", { timeZone: z, timeZoneName: "longOffset" }).formatToParts(now).find((x) => x.type === "timeZoneName")!.value; const m = p.match(/GMT([+-])(\d{2}):?(\d{2})?/); if (m) { off = `${m[1]}${m[2]}:${m[3] || "00"}`; mins = (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)); } } catch { /* unknown zone */ }
    return { z, off, mins, city: z.split("/").pop()!.replace(/_/g, " ") };
  }).sort((a, b) => a.mins - b.mins || a.city.localeCompare(b.city));
  return TZ_CACHE;
}
const tzLabel = (z: string) => { const x = tzList().find((o) => o.z === z); return x ? `(UTC${x.off}) ${x.city}` : z; };

/* steps bar (L9321) */
function fitSteps() { const s = rgSteps(); s.classList.remove("tight"); if (s.scrollWidth > s.clientWidth + 1) s.classList.add("tight"); }
function renderRgSteps() {
  requestAnimationFrame(fitSteps);
  rgSteps().innerHTML = STEP_KEYS.map((k, i) => (i ? `<li class="ln${i <= rgStep ? " done" : ""}"></li>` : "") + `<li class="${i === rgStep ? "cur" : i < rgStep ? "done" : ""}"><button type="button" data-step="${i}" ${i > rgMax ? "disabled" : ""} aria-current="${i === rgStep ? "step" : "false"}"><span class="n">${i < rgStep ? RGI.check : nf(i + 1)}</span><span class="lb">${t(k)}</span></button></li>`).join("");
}
/* password (L9325) */
function pwCheck(p: string) {
  const lp = p.toLowerCase(), first = rg.first.trim().toLowerCase(), em = (rg.email.split("@")[0] || "").toLowerCase();
  const common = ["password", "motdepasse", "passwort", "12345678", "qwerty", "azerty", "remotion", "welcome", "letmein", "admin"];
  const r1 = p.length >= 8, r2 = /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);
  const r3 = r1 && !common.some((c) => lp.includes(c)) && !(first.length > 2 && lp.includes(first)) && !(em.length > 2 && lp.includes(em)) && !/(.)\1{3,}/.test(p);
  const score = p ? Math.max(1, (r1 ? 1 : 0) + (r2 ? 1 : 0) + (r3 ? 1 : 0) + ((p.length >= 12 || /[^A-Za-z0-9]/.test(p)) && r1 ? 1 : 0)) : 0;
  return { r1, r2, r3, score };
}
function updPw() {
  const box = $("rgPwMeter"); if (!box) return; const c = pwCheck(rg.pass), [lbl, col] = PW_LV[c.score];
  box.style.setProperty("--w", [0, 22, 48, 72, 82][c.score] + "%"); box.style.setProperty("--c", col || "#22b14c");
  box.querySelector(".pw-lbl")!.textContent = lbl ? t(lbl) : "";
  const rules = $("rgRules")!; rules.style.setProperty("--c", col);
  (["r1", "r2", "r3"] as const).forEach((r) => rules.querySelector(`[data-r="${r}"]`)!.classList.toggle("ok", c[r]));
}
/* building blocks (L9343) */
type FO = { req?: number; opt?: number; ro?: number; icon?: string; type?: string; ac?: string; dir?: string; ph?: string; post?: string };
const req = (r?: number) => (r ? ` <i>*</i>` : "");
function field(id: string, label: string, val: string, o: FO = {}) {
  return `<label class="rg-f"><span class="lb">${label}${req(o.req)}${o.opt ? ` <small>(${t("optional")})</small>` : ""}</span><span class="rg-in${o.ro ? " ro" : ""}" id="${id}F">${o.icon || ""}<input id="${id}" type="${o.type || "text"}" ${o.ac ? `autocomplete="${o.ac}"` : ""} dir="${o.dir || "auto"}" value="${esc(val || "")}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""} ${o.ro ? 'readonly aria-readonly="true"' : ""} ${o.req ? 'aria-required="true"' : ""}>${o.post || ""}</span></label>`;
}
function select(id: string, label: string, val: string, list: [string, string][], o: FO = {}) {
  return `<label class="rg-f"><span class="lb">${label}${req(o.req)}</span><span class="rg-in" id="${id}F">${o.icon || ""}<select id="${id}">${list.map(([v, l]) => `<option value="${v}"${v === val ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>${RGI.chev}</span></label>`;
}
const eyeBtn = (id: string) => `<button type="button" class="eye" data-eye="${id}" aria-label="${t("showPass")}">${LKI.eye}</button>`;
const navBtns = (nextLbl: string, arrowRight = true) => `<p class="rg-err" id="rgErr" aria-live="polite"></p><div class="rg-nav"><button type="button" class="rg-back" data-prev>${RGI.back}${t("back")}</button><button type="button" class="rg-btn" data-next><span>${t(nextLbl)}</span>${arrowRight ? RGI.arrow : ""}</button></div>`;

/* step 1: account (L9356) */
function stepAccount() {
  const m = rg.method, cards = [["email", RGI.mailBig, "mEmailT", "mEmailD"], ["gov", RGI.gov, "mGovT", "mGovD"], ["sso", RGI.sso, "mSsoT", "mSsoD"]];
  return `<h2 class="rg-h" id="rgHeading">${t("rgTitle")}</h2><p class="rg-sub">${t("rgChoose")}</p>
    <div class="rg-meth" role="radiogroup" aria-label="${esc(t("rgChoose"))}">${cards.map(([k, ic, tt, dd]) => `<button type="button" role="radio" data-meth="${k}" aria-checked="${m === k}"><span class="rg-mi">${ic}</span><span class="rg-mt"><b>${t(tt)}</b><small>${t(dd)}</small></span></button>`).join("")}</div>
    <div id="rgMethBody">${methBody()}</div>
    <div class="rg-or"><span>${t("orRegister")}</span></div>
    <div class="rg-prov">${[["Google", "#e8453c", "G"], ["Microsoft", "#2f8ef0", "M"], ["Apple", "#1d2420", "A"]].map(([n, c, l]) => `<button type="button" data-rprov="${n}"><span class="mono" style="background:${c}">${l}</span><span>${n}</span></button>`).join("")}</div>
    <p class="rg-foot">${t("haveAccount")} <button type="button" class="rg-link" data-to-signin>${t("signIn")}</button></p>`;
}
function methBody() {
  const m = rg.method;
  if (m === "gov" && !rg.verified) return `<p class="rg-intro">${t("govIntro")}</p><div class="rg-gov">${GOV.map(([n, sub, ic, bg], i) => `<button type="button" data-rgov="${n}" style="--i:${i}"><span class="gi" style="background:${bg}">${ic}</span>${n}<small>${t(sub)}</small></button>`).join("")}</div><p class="rg-err" id="rgErr" aria-live="polite"></p>`;
  if (m === "sso" && !rg.verified) return `<p class="rg-intro">${t("ssoIntro")}</p>${field("rgSso", t("ssoDomainPh"), "", { dir: "ltr", ac: "organization", icon: RGI.org, req: 1 })}<p class="rg-err" id="rgErr" aria-live="polite"></p><button type="button" class="rg-btn" id="rgSsoGo">${RGI.arrow}<span>${t("continueBtn")}</span></button>`;
  let h = rg.verified ? `<div class="rg-note">${RGI.check}${esc(t("verifiedWith", { x: rg.verified }))}</div>` : "";
  h += `<div class="rg-grid2">${field("rgFirst", t("firstName"), rg.first, { ac: "given-name", icon: RGI.user, req: 1 })}${field("rgLast", t("lastName"), rg.last, { ac: "family-name", icon: RGI.user, req: 1 })}</div>`;
  h += field("rgEmail", t("emailPh"), rg.email, { type: "email", ac: "email", dir: "ltr", icon: RGI.mail, req: 1 });
  if (!rg.noPass) {
    h += field("rgPass", t("password"), rg.pass, { type: "password", ac: "new-password", dir: "ltr", icon: RGI.lock, req: 1, post: eyeBtn("rgPass") });
    h += `<div class="pw-meter" id="rgPwMeter"><div class="pw-bar"><i></i></div><span class="pw-lbl"></span></div>`;
    h += field("rgPass2", t("confirmPass"), rg.pass2, { type: "password", ac: "new-password", dir: "ltr", icon: RGI.lock, req: 1, post: eyeBtn("rgPass2") });
    h += `<ul class="pw-rules" id="rgRules">${["r1", "r2", "r3"].map((r, i) => `<li data-r="${r}"><i></i>${t("pwR" + (i + 1))}</li>`).join("")}</ul>`;
  }
  h += `<label class="rg-agree" id="rgAgreeL"><input type="checkbox" id="rgAgree" ${rg.agree ? "checked" : ""}><span>${t("agreeA")} <button type="button" class="rg-link" data-legal="terms">${t("termsOS")}</button> ${t("andW")} <button type="button" class="rg-link" data-legal="privacy">${t("privacyP")}</button></span></label>`;
  h += `<p class="rg-err" id="rgErr" aria-live="polite"></p><button type="button" class="rg-btn" data-next>${RGI.arrow}<span>${t("toProfile")}</span></button>`;
  return h;
}
/* step 2: profile (L9378) */
const roleLabel = (r: string) => t((RG_ROLES.find((x) => x[0] === r) || RG_ROLES[0])[1]);
const needRpps = () => rg.profession !== "admin";
function rppsBlock() {
  if (!needRpps()) return "";
  return `<div class="rg-f"><label class="lb" for="rgRpps">${t("rppsL")} <small>(${t("optional")})</small></label><span class="rg-in" id="rgRppsF">${PFI.rpps}<input id="rgRpps" dir="ltr" inputmode="numeric" maxlength="14" autocomplete="off" value="${esc(rg.rpps)}" placeholder="10101234567"><span class="rg-rpc" id="rgRppsC" aria-hidden="true">${nf(rg.rpps.replace(/\D/g, "").length)}/${nf(11)}</span></span><p class="rg-hint" style="margin:4px 0 0">${t("rppsHint")}</p></div>`;
}
function stepProfile() {
  const photo = rg.photo ? `<img src="${rg.photo}" alt="">` : RGI.person;
  const langs = (Object.entries(LANGS) as [string, { name: string }][]).map(([k, L]) => [k, L.name] as [string, string]);
  const tzs = tzList().map((o) => [o.z, `(UTC${o.off}) ${o.city}`] as [string, string]);
  return `<h2 class="rg-h" id="rgHeading">${t("ppTitle")}</h2><p class="rg-sub">${t("ppSub")}</p>
    <div class="rg-pf"><div class="rg-av" id="rgAv"><span class="ph">${photo}</span><button type="button" class="rg-cam" data-pick aria-label="${t(rg.photo ? "changePhoto" : "chooseFile")}">${RGI.cam}</button></div>
      <div class="rg-drop" id="rgDrop"><span class="ti">${RGI.upload}</span><div><b>${t("upTitle")}</b><small>${t("upHint")}</small><div class="acts"><button type="button" class="rg-file" data-pick>${t(rg.photo ? "changePhoto" : "chooseFile")}</button>${rg.photo ? `<button type="button" class="rg-file sec" data-rmphoto>${t("remove")}</button>` : ""}</div><span class="or" id="rgDropHint">${t("dragDrop")}</span></div></div>
      <input type="file" id="rgFile" accept="image/png,image/jpeg,image/webp" hidden></div>
    <div class="rg-grid2">${field("rgFirst", t("firstName"), rg.first, { ac: "given-name", icon: RGI.user, req: 1 })}${field("rgLast", t("lastName"), rg.last, { ac: "family-name", icon: RGI.user, req: 1 })}</div>
    ${field("rgEmailRo", t("emailPh"), rg.email, { type: "email", dir: "ltr", icon: RGI.mail, ro: 1 })}<p class="rg-hint">${t("emailFixed")}</p>
    <div class="rg-grid2">${select("rgProf", t("profession"), rg.profession, PROFESSIONS.map((k) => [k, t("pr_" + k)]), { icon: PFI.prof, req: 1 })}${select("rgRole", t("profileRole"), rg.role, RG_ROLES.map(([k, l]) => [k, t(l)]), { icon: PFI.role, req: 1 })}</div>
    <div id="rgRppsW">${rppsBlock()}</div>
    <div class="rg-grid2">
      <div class="rg-f"><label class="lb" for="rgPhone">${t("phoneOpt")} <small>(${t("optional")})</small></label><span class="rg-in" id="rgPhoneF">${RGI.phone}<span class="rg-cc"><span class="flag" id="rgFlag">${FLAGS[rg.cc]}</span>${RGI.caret}<select id="rgCC" aria-label="${t("ccLabel")}">${Object.keys(DIAL).map((c) => `<option value="${c}"${c === rg.cc ? " selected" : ""}>${esc(countryName(c))} ${DIAL[c]}</option>`).join("")}</select></span><span class="rg-dial" id="rgDial">${DIAL[rg.cc]}</span><input id="rgPhone" type="tel" inputmode="tel" autocomplete="tel-national" dir="ltr" value="${esc(rg.phone)}" placeholder="50 123 456"></span></div>
      ${select("rgPref", t("prefLang"), rg.pref, langs, { icon: RGI.globe, req: 1 })}
    </div>
    ${select("rgTz", t("timezone"), rg.tz, tzs, { icon: RGI.clock, req: 1 })}
    <div class="rg-info">${RGI.info}<span>${t("ppInfo")}</span></div>
    ${navBtns("toOrg")}`;
}
/* step 3: organisation (L9411) */
const fmtSiret = (s: string) => (s.length === 14 ? `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9)}` : s);
function lookupOrg(key: string) {
  const k = String(key).toUpperCase().replace(/\s/g, "");
  if (/ABCD|12345678901234/.test(k)) return ORG_DIR[0];
  let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ORG_DIR[h % ORG_DIR.length];
}
function ccSelect(id: string, val: string, label: string) {
  return `<span class="rg-in rg-ccsel" id="${id}F"><span class="flag" id="${id}Flag">${FLAGS[val]}</span><span class="ccn" id="${id}Name">${esc(countryName(val))}</span>${RGI.chev}<select id="${id}" aria-label="${esc(label)}">${ORG_CC.map((c) => [c, countryName(c)]).sort((a, b) => a[1].localeCompare(b[1], loc())).map(([c, n]) => `<option value="${c}"${c === val ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></span>`;
}
const ORG_HEAD: Record<string, [string, string]> = { invite: ["oTitle", "oSubInv"], ident: ["oTitle", "oSubId"], create: ["oNewTitle", "oNewSub"] };
function stepOrg() {
  const m = rg.orgMode, cards = [["invite", OI.people, "omInvT", "omInvD"], ["ident", OI.bank, "omIdT", "omIdD"], ["create", OI.plus, "omNewT", "omNewD"]];
  const head = ORG_HEAD[m];
  return `<h2 class="rg-h" id="rgHeading">${t(head[0])}</h2><p class="rg-sub" id="rgOrgSub">${t(head[1])}</p>
    <div class="rg-meth rg-ometh" role="radiogroup" aria-label="${esc(t("stOrg"))}">${cards.map(([k, ic, tt, dd]) => `<button type="button" role="radio" data-omode="${k}" aria-checked="${m === k}"><span class="rg-mi">${ic}</span><span class="rg-mt"><b>${t(tt)}</b><small>${t(dd)}</small></span></button>`).join("")}</div>
    <div id="rgOrgBody">${orgBody()}</div>
    ${navBtns("toVerify")}`;
}
function foundCard(kind: string) {
  const o = rg.found; if (!o) return "";
  const loc_ = `${o.city}, ${countryName(o.cc)}`;
  const top = `<span class="tl">${OI.hosp}</span><div class="fm"><div class="fn"><b dir="auto">${esc(o.name)}</b><span class="pill">${t("orgFound")}</span></div><div class="fs">SIRET: <span dir="ltr">${fmtSiret(o.siret)}</span><button type="button" class="cp" data-copy="${o.siret}" aria-label="${t("copySiret")}">${OI.copy}</button></div>`;
  if (kind === "invite") return `<div class="rg-found inv">${top}<div class="fl">${OI.pin}<span>${t("locationX", { x: loc_ })}</span></div></div><p class="fx">${t("invAccess")}</p><small class="fpv">${t("sampleData")}</small></div>`;
  return `<div class="rg-found idn">${top}</div><button type="button" class="rg-vd" data-orgdetails>${t("viewDetails2")}${OI.ext}</button><div class="fl meta"><span>${OI.pin}${esc(loc_)}</span><span>${OI.group}${esc(t("membersN", { x: o.members }))}</span><span>${OI.bank.replace("viewBox", 'width="16" height="16" viewBox')}${t(o.typeK)}</span></div><small class="fpv">${t("sampleData")}</small></div>`;
}
function orgBody() {
  const m = rg.orgMode;
  if (m === "invite") return `<div class="rg-info g">${RGI.info}<span>${t("oInfoInv")}</span></div>
    <div class="rg-f"><label class="lb" for="rgInvite">${t("inviteCode")}${req(1)}</label>
      <div class="rg-row"><span class="rg-in" id="rgInviteF">${OI.link}<input id="rgInvite" dir="ltr" autocomplete="off" spellcheck="false" placeholder="REM-ABCD-1234" value="${esc(rg.invite)}"><button type="button" class="clr" data-clear="rgInvite" aria-label="${t("clearX")}" ${rg.invite ? "" : "hidden"}>${OI.clear}</button></span><button type="button" class="rg-detect" data-detect="invite">${OI.search}<span>${t("detectOrg")}</span></button></div>
      <p class="rg-hint" style="margin:2px 0 0">${t("inviteHint2")}</p></div>
    <p class="rg-err" id="rgOErr" aria-live="polite"></p>
    <div id="rgFound">${rg.found ? foundCard("invite") + `<div class="rg-info">${RGI.info}<span>${t("oAfterInv")}</span></div>` : ""}</div>`;
  if (m === "ident") return `<div class="rg-info g">${RGI.info}<span>${t("oInfoId")}</span></div>
    <div class="rg-f"><label class="lb" for="rgIdent">${t("orgIdent")}${req(1)}</label>
      <div class="rg-row"><span class="rg-in" id="rgIdentF">${OI.bank.replace("viewBox", 'width="19" height="19" viewBox')}<input id="rgIdent" dir="ltr" inputmode="numeric" autocomplete="off" placeholder="12345678901234" value="${esc(rg.ident)}"><button type="button" class="clr" data-clear="rgIdent" aria-label="${t("clearX")}" ${rg.ident ? "" : "hidden"}>${OI.clear}</button></span><button type="button" class="rg-detect" data-detect="ident">${OI.search}<span>${t("detectOrg")}</span></button></div>
      <div class="rg-row2"><p class="rg-hint" style="margin:2px 0 0">${t("identHint")}</p>${ccSelect("rgIdCC", rg.identCC, t("country"))}</div></div>
    <p class="rg-err" id="rgOErr" aria-live="polite"></p>
    <div id="rgFound">${rg.found ? foundCard("ident") + `<div class="rg-info">${RGI.info}<span>${t("oAfterId")}</span></div>` : ""}</div>`;
  return `<p class="rg-sec2">${t("orgInfo")}</p>
    ${field("rgOrgName", t("orgName"), rg.orgName, { ac: "organization", icon: OI.user, req: 1 })}<p class="rg-hint" style="margin-top:-4px">${t("orgNameHint")}</p>
    <div class="rg-grid2 rg-g12">
      <div class="rg-f"><label class="lb" for="rgCountry">${t("country")}${req(1)}</label>${ccSelect("rgCountry", rg.country, t("country"))}</div>
      <div class="rg-f"><label class="lb" for="rgIdNum">${t("offIdent")} <small>(${t("optional")})</small></label>
        <span class="rg-in rg-idg" id="rgIdNumF"><span class="tsel"><select id="rgIdType" aria-label="${t("idType")}">${ID_TYPES.map(([k]) => `<option${k === rg.idType ? " selected" : ""}>${k}</option>`).join("")}</select>${RGI.chev}</span><input id="rgIdNum" dir="ltr" inputmode="numeric" autocomplete="off" value="${esc(rg.idNum)}" placeholder="12345678901234"><button type="button" class="srch" data-lookup aria-label="${t("lookupId")}">${OI.search}</button></span>
        <p class="rg-hint" style="margin:2px 0 0">${t("identHint2")}</p></div>
    </div>
    <div class="rg-grid2">${field("rgAddr", t("address"), rg.addr, { ac: "street-address", icon: OI.pin.replace('width="16" height="16"', 'width="19" height="19"'), opt: 1 })}${field("rgCity", t("city"), rg.city, { ac: "address-level2", icon: OI.city, opt: 1 })}</div>
    <div class="rg-grid2">${field("rgZip", t("postal"), rg.zip, { ac: "postal-code", icon: OI.zip, opt: 1, dir: "ltr" })}${field("rgWeb", t("website"), rg.web, { type: "url", ac: "url", icon: OI.web, opt: 1, dir: "ltr", ph: "https://" })}</div>
    <p class="rg-err" id="rgOErr" aria-live="polite"></p>
    <div class="rg-info">${RGI.info}<span>${t("oAfterNew")}</span></div>`;
}
function orgErr(id: string, msg: string) { replay($(id + "F"), "err"); const e = $("rgOErr"); if (e) e.textContent = msg; $(id)?.focus(); }
function detectOrg(kind: string, btn: HTMLButtonElement) {
  if (rgBusy) return; collect();
  if (kind === "invite" && !/^[A-Za-z0-9]{3,}(-?[A-Za-z0-9]{3,}){1,3}$/.test(rg.invite)) { orgErr("rgInvite", t("inviteBad")); return; }
  if (kind === "ident") { const d = rg.ident.replace(/\s/g, ""); if (!/^(\d{9}|\d{11}|\d{14})$/.test(d)) { orgErr("rgIdent", t("identBad")); return; } }
  rgBusy = true; btn.classList.add("busy"); btn.disabled = true; const sp = btn.querySelector("span")!, lbl = sp.textContent; sp.textContent = t("detecting");
  const holder = $("rgFound")!, h0 = holder.offsetHeight;
  rgLater(() => {
    rgBusy = false; btn.classList.remove("busy"); btn.disabled = false; sp.textContent = lbl;
    const key = kind === "invite" ? rg.invite : rg.ident; rg.found = { ...lookupOrg(key) };
    if (kind === "ident") { const d = rg.ident.replace(/\s/g, ""); if (d.length === 14) rg.found.siret = d; rg.found.cc = rg.identCC; }
    holder.innerHTML = foundCard(kind) + `<div class="rg-info">${RGI.info}<span>${t(kind === "invite" ? "oAfterInv" : "oAfterId")}</span></div>`;
    if (!lkRM()) { const h1 = holder.offsetHeight; holder.animate([{ height: h0 + "px", overflow: "hidden" }, { height: h1 + "px", overflow: "hidden" }], { duration: 520, easing: "cubic-bezier(.2,1.1,.3,1)" }); [...holder.children].forEach((c, i) => c.animate([{ opacity: 0, transform: "translateY(12px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 480, delay: 80 + i * 90, easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" })); }
  }, 1100);
}
function clearFound() {
  const holder = $("rgFound"); if (!holder || !rg.found) { rg.found = null; return; }
  rg.found = null; const h0 = holder.offsetHeight;
  if (lkRM()) { holder.innerHTML = ""; return; }
  holder.animate([{ height: h0 + "px", opacity: 1, overflow: "hidden" }, { height: "0px", opacity: 0, overflow: "hidden" }], { duration: 320, easing: "cubic-bezier(.4,0,.2,1)" }).finished.then(() => { if (!rg.found) holder.innerHTML = ""; });
}
function lookupCreate(btn: HTMLElement) {
  collect(); const len = (ID_TYPES.find((x) => x[0] === rg.idType) || [0, 14])[1] as number, d = rg.idNum.replace(/\s/g, "");
  if (!new RegExp(`^\\d{${len}}$`).test(d)) { orgErr("rgIdNum", t("identLen", { x: rg.idType, n: nf(len) })); return; }
  btn.classList.add("busy");
  rgLater(() => {
    btn.classList.remove("busy"); const o = lookupOrg(d); let filled = 0;
    ([["rgOrgName", "orgName", o.name], ["rgAddr", "addr", o.addr], ["rgCity", "city", o.city], ["rgZip", "zip", o.zip], ["rgWeb", "web", o.web]] as [string, keyof RG, string][]).forEach(([id, k, v]) => {
      const el = $<HTMLInputElement>(id); if (el && !el.value.trim()) { el.value = v; (rg as Record<string, unknown>)[k] = v; filled++; $(id + "F")!.animate([{ boxShadow: "0 0 0 3px rgba(34,177,76,.35)", background: "rgba(34,177,76,.08)" }, { boxShadow: "0 0 0 0 rgba(34,177,76,0)" }], { duration: 1200, easing: "ease-out" }); }
    });
    toast(filled ? t("prefilled") : t("nothingToFill"));
  }, 900);
}
/* step 4: verification (L9516) */
const maskPhone = () => { const d = rg.phone.replace(/\D/g, ""); return `${DIAL[rg.cc]} ${d.slice(0, 2)} ••• ${d.slice(-3)}`; };
const vDest = () => (rg.channel === "email" || rg.channel === "link" ? rg.email : maskPhone());
const V_SUB: Dict = { email: "vSubEmail", whatsapp: "vSubWa", sms: "vSubSms", link: "vSubLink" };
function vTarget() {
  const c = rg.channel, ch = VCH[c];
  if (rg.editEmail) return `<div class="vt-card editing" id="rgVTarget"><span class="vt-ic em">${VI.mail}</span><div class="vt-tx"><label class="lb" for="rgNewEmail">${t("newEmail")}</label><span class="rg-in" id="rgNewEmailF">${RGI.mail}<input id="rgNewEmail" type="email" dir="ltr" autocomplete="email" value="${esc(rg.email)}"></span></div><div class="vt-acts"><button type="button" class="vt-btn" data-vemail="cancel">${t("cancel")}</button><button type="button" class="vt-btn pri" data-vemail="save">${t("customSave")}</button></div></div>`;
  const txt = ({ email: "vtEmail", whatsapp: "vtWa", sms: "vtSms", link: "vtLink" } as Dict)[c];
  return `<div class="vt-card" id="rgVTarget"><span class="vt-ic ${ch.cls}">${VI[ch.ic]}</span><div class="vt-tx"><b dir="ltr">${esc(vDest())}</b><span>${t(txt)}</span></div><button type="button" class="vt-btn" data-vemail="edit">${VI.pen}${t(c === "email" || c === "link" ? "changeEmail" : "useEmail")}</button></div>`;
}
function vCodeArea() {
  if (rg.channel === "link") return `<div class="vt-wait" id="rgVWait"><span class="spin"></span><div><b>${t("vlWait")}</b><small>${t("vlHint")}</small></div></div>`;
  const boxes = Array.from({ length: 6 }, (_, i) => `<input inputmode="numeric" autocomplete="${i ? "off" : "one-time-code"}" maxlength="1" aria-label="${esc(t("digitN", { n: nf(i + 1) }))}" value="${rg.code[i] || ""}" class="${rg.code[i] ? "fill" : ""}">`).join("");
  return `<p class="vt-lb">${t("vCode")}</p><div class="rg-code${rg.codeOk ? " ok" : ""}" id="rgCode">${boxes}</div>
    <p class="rg-vstat${rg.codeOk ? " ok" : ""}" id="rgVStat" aria-live="polite">${rg.codeOk ? RGI.check + t("vDone") : `${t("noCode")} <button type="button" class="rg-link" id="rgResend">${t("resend")}</button><span id="rgResendIn"></span>`}</p><p class="vt-pv">${t("vHint")}</p>`;
}
const bigCheck = () => LKI.check.replace('width="20" height="20"', 'width="34" height="34"');
function stepVerify() {
  if (rg.verified) return `<h2 class="rg-h" id="rgHeading">${t("vAccTitle")}</h2><p class="rg-sub">${t("vIdSubT")}</p><div class="rg-vid"><span class="ring">${bigCheck()}</span><b>${t("vIdTitle")}</b><p>${esc(t("vIdSub", { x: rg.verified }))}</p></div>${navBtns("verifyCont")}`;
  const sub = V_SUB[rg.channel];
  const opt = (k: string, ic: string, cls: string, tt: string, dd: string, btn: string) => `<div class="vo${rg.channel === k ? " on" : ""}" data-vo="${k}"><div class="vo-top"><span class="vo-ic ${cls}">${ic}</span><div><b>${t(tt)}</b><small>${t(dd)}</small></div></div><button type="button" class="vo-btn" data-vsend="${k}" ${rg.codeOk ? "disabled" : ""}>${t(btn)}</button></div>`;
  return `<h2 class="rg-h" id="rgHeading">${t("vAccTitle")}</h2><p class="rg-sub" id="rgVSub">${t(sub)}</p>
    <div id="rgVTargetW">${vTarget()}</div>
    <div id="rgVArea">${vCodeArea()}</div>
    <div class="rg-or"><span>${t("orVerify")}</span></div>
    <div class="vo-grid">${opt("email", VI.mail, "em", "voEmailT", "voEmailD", "resend")}${opt("whatsapp", VI.wa, "wa", "voWaT", "voWaD", "sendWa")}${opt("sms", VI.sms, "sm", "voSmsT", "voSmsD", "sendSms")}</div>
    <div class="vo vo-row${rg.channel === "link" ? " on" : ""}" data-vo="link"><span class="vo-ic ln">${VI.link}</span><div class="vo-rt"><b>${t("voLinkT")}</b><small>${t("voLinkD")}</small></div><button type="button" class="vo-btn" data-vsend="link" ${rg.codeOk ? "disabled" : ""}>${t("sendLink2")}</button></div>
    <div class="rg-info vt-help">${RGI.info}<div><b>${t("cantFind")}</b><ul><li>${t("cf1")}</li><li>${t("cf2")}</li><li>${t("cf3")}</li><li>${t("cf4")}</li></ul></div></div>
    <p class="rg-err" id="rgErr" aria-live="polite"></p><div class="rg-nav"><button type="button" class="rg-back" data-prev>${RGI.back}${t("back")}</button><button type="button" class="rg-btn" data-next><span>${t("verifyCont")}</span>${RGI.arrow}</button></div>`;
}
/* step 5: review (L9553) */
function rvLang(k: string) {
  const nat = LANGS[k as Lang].name; let x = ""; try { x = new Intl.DisplayNames([loc()], { type: "language" }).of(k) || ""; } catch { /* n/a */ }
  if (!x || x.toLowerCase() === nat.toLowerCase()) return `<bdi>${esc(nat)}</bdi>`;
  return `<span><bdi>${esc(x.charAt(0).toLocaleUpperCase(loc()) + x.slice(1))}</bdi> (<bdi>${esc(nat)}</bdi>)</span>`;
}
const rvPhone = () => { const p = rg.phone.trim(); return p ? `${DIAL[rg.cc]} ${p}` : ""; };
function rvMethod(): { cls: string; txt: string; gov?: number; ic?: string; dest?: string } {
  if (rg.verified) return { cls: "em", txt: rg.verified, gov: 1 };
  const c = rg.channel, ch = VCH[c], name = t(({ email: "chEmail", whatsapp: "chWa", sms: "chSms", link: "chLink" } as Dict)[c]);
  const dest = c === "email" || c === "link" ? rg.email : rvPhone() || maskPhone();
  return { cls: ch.cls, ic: VI[ch.ic], txt: name, dest };
}
function stepReview() {
  const edit = (s: number) => `<button type="button" class="vt-btn rv-edit" data-step="${s}" aria-label="${esc(t("edit"))}">${VI.pen}<span>${t("edit")}</span></button>`;
  const kv = (k: string, v: string, o: { cls?: string; ltr?: boolean | number } = {}) => `<div class="rv-kv${o.cls ? " " + o.cls : ""}"><dt>${k}</dt><dd${o.ltr ? ' dir="ltr"' : ""}>${v}</dd></div>`;
  const card = (i: number, ic: string, title: string, step: number | null, body: string, cls = "") => `<section class="rv-card ${cls}" style="--i:${i}" aria-labelledby="rvH${i}"><span class="rv-tile">${ic}</span><div class="rv-main"><div class="rv-hd"><h3 id="rvH${i}">${title}</h3>${step === null ? "" : edit(step)}</div>${body}</div></section>`;
  const dash = `<span class="rv-dash">—</span>`;
  const m = rvMethod();
  const acc = `<dl class="rv-grid g2">${kv(t("emailPh"), `<span class="rv-email"><span dir="ltr">${esc(rg.email)}</span><span class="rv-pill">${RVI.ok}${t("rvVerified")}</span></span>`)}${kv(t("rvMethod"), `<span class="rv-meth"><span class="rv-mi ${m.cls}">${m.gov ? RGI.gov : m.ic}</span><span>${esc(m.txt)}${m.dest ? ` <span class="rv-dest" dir="ltr">(${esc(m.dest)})</span>` : ""}</span></span>`)}</dl>`;
  const ini = ((rg.first.trim()[0] || "") + (rg.last.trim()[0] || "")).toUpperCase() || "?";
  const av = rg.photo ? `<img src="${rg.photo}" alt="">` : `<b>${esc(ini)}</b>`;
  const P = PROFILES.find((p) => p.id === rg.role) || PROFILES[1];
  const pro = `<dl class="rv-grid g3 rv-pro">${kv(t("profession"), `<span class="rv-ic">${PFI.prof}<bdi>${esc(t("pr_" + rg.profession))}</bdi></span>`)}${kv("RPPS", rg.rpps && needRpps() ? `<span class="rv-ic">${PFI.rpps}<span dir="ltr">${esc(rg.rpps)}</span></span>` : dash)}${kv(t("profileRole"), `<span class="rv-role"><i style="background:${P.bg}"></i>${esc(roleLabel(rg.role))}</span>`)}</dl>`;
  const prof = `<dl class="rv-grid g4">${kv(t("rvFullName"), `<bdi>${esc(`${rg.first.trim()} ${rg.last.trim()}`)}</bdi>`)}${kv(t("prefLang"), `<span class="rv-lang"><span class="flag">${FLAGS[LANG_FLAG[rg.pref]] || ""}</span>${rvLang(rg.pref)}</span>`)}${kv(t("timezone"), esc(tzLabel(rg.tz)), { ltr: 1 })}${kv(t("rvPhone"), rvPhone() ? esc(rvPhone()) : dash, { ltr: !!rvPhone() })}</dl>`;
  let join: string, idT: string, idV: string, name: string, addr: string, web: string;
  if (rg.orgMode === "create") { join = t("omNewT"); idT = rg.idNum ? rg.idType : ""; idV = rg.idNum ? fmtSiret(rg.idNum.replace(/\s/g, "")) : ""; name = rg.orgName; addr = [rg.addr, [rg.zip, rg.city].filter(Boolean).join(" "), countryName(rg.country)].filter(Boolean).join(", "); web = rg.web; }
  else {
    const o = (rg.found || {}) as Partial<Org>; join = t(rg.orgMode === "invite" ? "omInvT" : "omIdT");
    if (rg.orgMode === "invite") { idT = t("inviteCode"); idV = rg.invite.toUpperCase(); }
    else { const d = rg.ident.replace(/\s/g, ""); idT = d.length === 14 ? "SIRET" : d.length === 9 ? "SIREN" : "RPPS"; idV = fmtSiret(d); }
    name = o.name || ""; addr = [o.addr, [o.zip, o.city].filter(Boolean).join(" "), o.cc ? countryName(o.cc) : ""].filter(Boolean).join(", "); web = o.web || "";
  }
  const webH = web ? `<a class="rg-link rv-web" href="${esc(web)}" target="_blank" rel="noopener" dir="ltr">${esc(web.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : dash;
  const org = `<dl class="rv-grid g3">${kv(t("rvJoin"), esc(join))}${kv(t("rvIdType"), idT ? esc(idT) : dash)}${kv(t("rvIdent"), idV ? esc(idV) : dash, { ltr: !!idV })}${kv(t("rvOrgAddr"), `<b class="rv-on"><bdi>${esc(name)}</bdi></b>${addr ? `<span class="rv-addr"><bdi>${esc(addr)}</bdi></span>` : ""}`, { cls: "span2" })}${kv(t("website"), webH)}</dl>`;
  const ck = (id: string, on: boolean, lbl: string) => `<label class="rg-agree rv-ck" id="${id}L"><input type="checkbox" id="${id}"${on ? " checked" : ""}><span>${t("rvAgreeTo")} <button type="button" class="rg-link" data-policy="${id}">${t(lbl)}</button></span></label>`;
  const terms = `<p class="rv-tl">${t("rvTermsLine")}</p><div class="rv-cks">${ck("rvTos", rg.tos ?? rg.agree, "rvTos")}${ck("rvPriv", rg.priv ?? rg.agree, "rvPriv")}${ck("rvDpa", rg.dpa, "rvDpa")}</div>`;
  return `<h2 class="rg-h" id="rgHeading">${t("rTitle")}</h2><p class="rg-sub">${t("rSub")}</p><div class="rv-list">` +
    card(0, RVI.acct, t("stAccount"), 0, acc) +
    card(1, `<span class="rv-av">${av}</span>`, t("rvPersonal"), 1, prof + pro, "av") +
    card(2, RVI.org, t("stOrg"), 2, org) +
    card(3, RVI.doc, t("rvTerms"), null, terms, "terms") +
    `</div><p class="rg-err" id="rgErr" aria-live="polite"></p><div class="rg-nav"><button type="button" class="rg-back" data-prev>${RGI.back}${t("back")}</button><button type="button" class="rg-btn rv-go" data-create><span>${t("rvCreate")}</span>${RGI.arrow}</button></div>
    <p class="rg-hint" style="text-align:center;margin:12px 0 0">${t("previewNote")}</p>`;
}
const STEP_FN = [stepAccount, stepProfile, stepOrg, stepVerify, stepReview];
function renderRg(dir: number) {
  const body = rgBody(), h0 = body.offsetHeight;
  body.innerHTML = STEP_FN[rgStep](); renderRgSteps();
  const out = rgOut(); out.hidden = rgStep === 0; out.innerHTML = `${t("haveAccount")} <button type="button" class="rg-link" data-to-signin>${t("signIn")}</button>`;
  if (rgStep === 0) updPw();
  if (rgStep === 3 && !rg.verified && rg.channel !== "link" && !rg.codeOk) { if (!rgResendT && rgResendLeft === 0) startResend(); else paintResend(); }
  if (dir && !lkRM()) {
    const h1 = body.offsetHeight, d = dir * (document.documentElement.dir === "rtl" ? -1 : 1);
    body.animate([{ height: h0 + "px", overflow: "hidden" }, { height: h1 + "px", overflow: "hidden" }], { duration: 500, easing: "cubic-bezier(.2,1.1,.3,1)" });
    [...body.children].forEach((c, i) => c.animate([{ opacity: 0, transform: `translateX(${d * 40}px)` }, { opacity: 1, transform: "none" }], { duration: 460, delay: Math.min(i * 28, 220), easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" }));
    rgEl().scrollTo({ top: 0, behavior: "smooth" });
  }
  setTimeout(() => { const b = rgBody(); const f = rgStep === 3 && !rg.verified ? b.querySelector<HTMLElement>(".rg-code input:not(.fill)") || b.querySelector<HTMLElement>(".rg-code input") : b.querySelector<HTMLElement>("input:not([type=checkbox]):not([readonly]):not([hidden]),select"); f?.focus({ preventScroll: true }); }, dir ? 140 : 60);
}
function swapPart(id: string, html: string) {
  const el = $(id); if (!el) return; const h0 = el.offsetHeight; el.innerHTML = html; const h1 = el.offsetHeight;
  if (!lkRM()) { el.animate([{ height: h0 + "px", overflow: "hidden" }, { height: h1 + "px", overflow: "hidden" }], { duration: 440, easing: "cubic-bezier(.2,1.1,.3,1)" }); [...el.children].forEach((c, i) => c.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 380, delay: i * 30, easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" })); }
}
function collect() {
  const v = (id: string) => $<HTMLInputElement>(id)?.value; const R = rg as Record<string, unknown>;
  if (rgStep === 0) { [["first", "rgFirst"], ["last", "rgLast"], ["email", "rgEmail"], ["pass", "rgPass"], ["pass2", "rgPass2"]].forEach(([k, id]) => { const x = v(id); if (x !== undefined) R[k] = k === "email" ? x.trim() : x; }); const a = $<HTMLInputElement>("rgAgree"); if (a) rg.agree = a.checked; }
  if (rgStep === 1) { [["first", "rgFirst"], ["last", "rgLast"], ["phone", "rgPhone"], ["cc", "rgCC"], ["pref", "rgPref"], ["tz", "rgTz"], ["profession", "rgProf"], ["role", "rgRole"], ["rpps", "rgRpps"]].forEach(([k, id]) => { const x = v(id); if (x !== undefined) R[k] = x; }); }
  if (rgStep === 4) rvSync();
  if (rgStep === 2) {
    const tv = (id: string, k: string) => { const x = v(id); if (x !== undefined) R[k] = x.trim(); };
    tv("rgInvite", "invite"); tv("rgIdent", "ident"); tv("rgOrgName", "orgName"); tv("rgIdNum", "idNum"); tv("rgAddr", "addr"); tv("rgCity", "city"); tv("rgZip", "zip"); tv("rgWeb", "web");
    const c = v("rgIdCC"); if (c) rg.identCC = c; const c2 = v("rgCountry"); if (c2) rg.country = c2; const ty = v("rgIdType"); if (ty) rg.idType = ty;
  }
}
function rgFail(ids: string[], msg: string) { ids.forEach((id) => replay($(id + "F"), "err")); const e = $("rgErr"); if (e) e.textContent = msg; $(ids[0])?.focus(); }
function validate() {
  collect();
  if (rgStep === 0) {
    if (rg.method !== "email" && !rg.verified) { const e = $("rgErr"); if (e) e.textContent = t(rg.method === "sso" ? "ssoNeed" : "govPick"); $("rgSso")?.focus(); return false; }
    const miss = ([["rgFirst", rg.first], ["rgLast", rg.last]] as [string, string][]).filter((x) => !x[1].trim()).map((x) => x[0]);
    if (miss.length) { rgFail(miss, t("errRequired")); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rg.email)) { rgFail(["rgEmail"], t("emailInvalid")); return false; }
    if (!rg.noPass) { const c = pwCheck(rg.pass); if (!(c.r1 && c.r2 && c.r3)) { rgFail(["rgPass"], t("errPw")); return false; } if (rg.pass2 !== rg.pass) { rgFail(["rgPass2"], t("pwMismatch")); return false; } }
    if (!rg.agree) { replay($("rgAgreeL"), "err"); $("rgErr")!.textContent = t("agreeNeed"); return false; }
  }
  if (rgStep === 1) {
    const miss = ([["rgFirst", rg.first], ["rgLast", rg.last]] as [string, string][]).filter((x) => !x[1].trim()).map((x) => x[0]);
    if (miss.length) { rgFail(miss, t("errRequired")); return false; }
    if (rg.phone && !/^[\d\s().-]{6,16}$/.test(rg.phone.trim())) { rgFail(["rgPhone"], t("phoneBad")); return false; }
    if (needRpps() && rg.rpps.trim() && !/^\d{11}$/.test(rg.rpps.replace(/\s/g, ""))) { rgFail(["rgRpps"], t("rppsBad")); return false; }
    if (!needRpps()) rg.rpps = ""; else rg.rpps = rg.rpps.replace(/\s/g, "");
  }
  if (rgStep === 2) {
    if (rg.orgMode === "create") {
      if (!rg.orgName) { orgErr("rgOrgName", t("errRequired")); return false; }
      if (rg.idNum) { const len = (ID_TYPES.find((x) => x[0] === rg.idType) || [0, 14])[1] as number; if (!new RegExp(`^\\d{${len}}$`).test(rg.idNum.replace(/\s/g, ""))) { orgErr("rgIdNum", t("identLen", { x: rg.idType, n: nf(len) })); return false; } }
      if (rg.web) { let w = rg.web; if (!/^https?:\/\//i.test(w)) w = "https://" + w; try { const u = new URL(w); if (!u.hostname.includes(".")) throw 0; rg.web = w; const el = $<HTMLInputElement>("rgWeb"); if (el) el.value = w; } catch { orgErr("rgWeb", t("webBad")); return false; } }
    } else if (!rg.found) { orgErr(rg.orgMode === "invite" ? "rgInvite" : "rgIdent", t("foundNeed")); return false; }
  }
  if (rgStep === 3 && !rg.verified && !rg.codeOk) {
    if (rg.channel === "link") { $("rgErr")!.textContent = t("vlNeed"); shake($("rgVWait")); return false; }
    if (/^\d{6}$/.test(rg.code)) { if (!rg.checking) codeChanged(); rgLater(() => { if (rg.codeOk && rgStep === 3) goStep(4); }, 1000); return false; }
    const c = $("rgCode")!; replay(c, "err"); $("rgErr")!.textContent = t("codeNeed"); c.querySelector<HTMLElement>("input:not(.fill)")?.focus(); return false;
  }
  return true;
}
function goStep(i: number) { if (rgBusy || i === rgStep) return; collect(); const d = i > rgStep ? 1 : -1; rgStep = i; rgMax = Math.max(rgMax, i); renderRg(d); }
function verifyWith(name: string, btn: HTMLElement, fromProvider: boolean) {
  if (rgBusy) return; rgBusy = true; btn.classList.add("busy");
  rgLater(() => {
    rgBusy = false; rg.verified = name; rg.noPass = true;
    const me = useAccount.getState().accounts[0], [f, ...l] = me.name.split(" "); if (!rg.first) rg.first = f; if (!rg.last) rg.last = l.join(" "); if (!rg.email) rg.email = me.email || "";
    if (fromProvider) { rgBody().querySelectorAll("[data-meth]").forEach((x) => x.setAttribute("aria-checked", "false")); toast(t("verifiedWith", { x: name })); }
    swapPart("rgMethBody", methBody());
  }, 1500);
}
/* verification code (L9680) */
const mmss = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
function paintResend() {
  const b = $<HTMLButtonElement>("rgResend"), inn = $("rgResendIn"); if (!b) return;
  b.disabled = rgResendLeft > 0; b.classList.toggle("off", rgResendLeft > 0);
  if (inn) inn.innerHTML = rgResendLeft > 0 ? ` ${t("inW")} <b class="cd">${mmss(rgResendLeft)}</b>` : "";
}
function startResend() { if (rgResendT) clearInterval(rgResendT); rgResendLeft = 60; paintResend(); rgResendT = setInterval(() => { rgResendLeft--; paintResend(); if (rgResendLeft <= 0) { clearInterval(rgResendT!); rgResendT = null; } }, 1000); }
const codeInputs = () => [...document.querySelectorAll<HTMLInputElement>("#rgCode input")];
const codeVal = () => codeInputs().map((i) => i.value).join("");
function markVerified() {
  rg.codeOk = true; if (rgResendT) clearInterval(rgResendT); rgResendT = null; rgResendLeft = 0;
  const box = $("rgCode"), st = $("rgVStat");
  if (box) box.classList.add("ok"); if (st) { st.className = "rg-vstat ok"; st.innerHTML = RGI.check + t("vDone"); }
  rgBody().querySelectorAll<HTMLButtonElement>(".vo-btn").forEach((b) => (b.disabled = true));
  rgBody().querySelector<HTMLElement>("[data-next]")?.focus({ preventScroll: true });
}
function codeChanged() {
  rg.code = codeVal(); const box = $("rgCode")!, st = $("rgVStat")!, er = $("rgErr");
  box.classList.remove("err"); if (er) er.textContent = "";
  if (/^\d{6}$/.test(rg.code) && !rg.codeOk && !rg.checking) {
    rg.checking = true; st.className = "rg-vstat"; st.innerHTML = `<span class="spin"></span>${t("verifying")}`; box.querySelectorAll<HTMLInputElement>("input").forEach((i) => (i.readOnly = true));
    rgLater(() => { rg.checking = false; markVerified(); }, 900);
  }
}
function swapVerify() {
  const sub = $("rgVSub"); if (sub) { sub.textContent = t(V_SUB[rg.channel]); sub.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350 }); }
  swapPart("rgVTargetW", vTarget()); swapPart("rgVArea", vCodeArea());
  rgBody().querySelectorAll<HTMLElement>("[data-vo]").forEach((v) => v.classList.toggle("on", v.dataset.vo === rg.channel));
}
function sendVia(ch: string, btn: HTMLButtonElement) {
  if (rg.codeOk || rgBusy) return;
  if ((ch === "whatsapp" || ch === "sms") && !rg.phone.replace(/\D/g, "")) {
    $("rgErr")!.innerHTML = `${esc(t("needPhone"))} <button type="button" class="rg-link" data-step="1">${t("addPhone")}</button>`;
    shake(btn.closest(".vo")); return;
  }
  if (ch === "email" && rg.channel === "email" && rgResendLeft > 0) { toast(t("resendWait", { x: mmss(rgResendLeft) })); return; }
  rgBusy = true; const lbl = btn.textContent; btn.classList.add("busy"); btn.innerHTML = `<span class="spin"></span>${t("sending")}`;
  rgLater(() => {
    rgBusy = false; btn.classList.remove("busy"); btn.textContent = lbl;
    rg.channel = ch; rg.code = ""; swapVerify();
    if (ch === "link") {
      if (rgResendT) clearInterval(rgResendT); rgResendT = null; rgResendLeft = 0; toast(t("linkSent", { x: rg.email }));
      rgLater(() => { if (rg.channel !== "link" || rgStep !== 3) return; const w = $("rgVWait"); if (w) { w.classList.add("ok"); w.innerHTML = `${RGI.check.replace('width="14" height="14"', 'width="22" height="22"')}<div><b>${t("vlDone")}</b><small>${t("vDone")}</small></div>`; } markVerified(); }, 3200);
    } else { startResend(); toast(t("codeSentTo", { x: vDest() })); setTimeout(() => document.querySelector<HTMLElement>("#rgCode input")?.focus({ preventScroll: true }), 120); }
  }, 900);
}
/* photo (L9767) */
function setPhoto(file?: File) {
  const hint = $("rgDropHint");
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { if (hint) { hint.className = "ferr"; hint.textContent = t("fileBad"); } $("rgDrop")?.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 300 }); return; }
  const r = new FileReader();
  r.onload = () => {
    collect(); rg.photo = r.result as string;
    const av = $("rgAv")!; av.querySelector(".ph")!.innerHTML = `<img src="${rg.photo}" alt="">`; replay(av, "pop");
    document.querySelector("#rgDrop .acts")!.innerHTML = `<button type="button" class="rg-file" data-pick>${t("changePhoto")}</button><button type="button" class="rg-file sec" data-rmphoto>${t("remove")}</button>`;
    if (hint) { hint.className = "or"; hint.textContent = t("dragDrop"); }
  };
  r.readAsDataURL(file);
}
/* review: policy checkboxes (L9799) */
function rvSync() { (["tos", "priv", "dpa"] as const).forEach((k) => { const el = $<HTMLInputElement>("rv" + k[0].toUpperCase() + k.slice(1)); if (el) (rg as Record<string, unknown>)[k] = el.checked; }); }
function rvCheck() {
  rvSync(); const miss = ["rvTos", "rvPriv", "rvDpa"].filter((id) => !$<HTMLInputElement>(id)?.checked);
  if (!miss.length) return true;
  const card = rgBody().querySelector(".rv-card.terms")!; replay(card, "err");
  miss.forEach((id) => replay($(id + "L"), "err"));
  $("rgErr")!.textContent = t("rvTermsNeed"); $(miss[0])!.focus();
  if (!lkRM()) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  return false;
}
/* create (L9811) */
function createAccount(btn: HTMLButtonElement) {
  rgBusy = true; btn.disabled = true; const body = rgBody();
  const org = rg.orgMode === "create" ? rg.orgName : rg.found?.name || "", steps = [t("cr1"), t(rg.orgMode === "create" ? "cr2" : "cr2j", { x: org }), t("cr3")], h0 = body.offsetHeight;
  body.innerHTML = `<h2 class="rg-h" id="rgHeading">${t("creating")}</h2><p class="rg-sub">${esc(rg.email)}</p><ul class="rg-prog">${steps.map((s) => `<li><i></i>${esc(s)}</li>`).join("")}</ul>`;
  if (!lkRM()) body.animate([{ height: h0 + "px", overflow: "hidden", opacity: 0.4 }, { height: body.offsetHeight + "px", overflow: "hidden", opacity: 1 }], { duration: 460, easing: "cubic-bezier(.2,1.1,.3,1)" });
  const lis = [...body.querySelectorAll(".rg-prog li")];
  lis.forEach((li, i) => { rgLater(() => li.classList.add("run"), i * 800 + 100); rgLater(() => { li.classList.remove("run"); li.classList.add("ok"); }, i * 800 + 800); });
  rgLater(() => {
    rgSteps().querySelectorAll("li").forEach((li) => { if (li.classList.contains("ln")) li.classList.add("done"); else li.className = "done"; });
    rgSteps().querySelectorAll(".n").forEach((n) => (n.innerHTML = RGI.check));
    const h1 = body.offsetHeight;
    body.innerHTML = `<div class="rg-vid"><span class="ring">${bigCheck()}</span><b>${t("created")}</b><p>${esc(t("createdSub", { x: rg.first }))}</p><button type="button" class="rg-btn" data-open style="margin-top:10px;max-width:320px">${RGI.arrow}<span>${t("openWorkspace")}</span></button></div>`;
    if (!lkRM()) body.animate([{ height: h1 + "px", overflow: "hidden" }, { height: body.offsetHeight + "px", overflow: "hidden" }], { duration: 460, easing: "cubic-bezier(.2,1.1,.3,1)" });
    rgBusy = false; setTimeout(() => body.querySelector<HTMLElement>("[data-open]")?.focus({ preventScroll: true }), 100);
  }, steps.length * 800 + 500);
}
function finishRegister() {
  const id = "u" + Date.now().toString(36), first = rg.first.trim(), last = rg.last.trim();
  const person: Account = { id, name: `${first} ${last}`.trim(), short: first, role: PROFILES.find((p) => p.id === rg.role)!.role, email: rg.email, ini: (first[0] || "?").toUpperCase(), bg: "linear-gradient(160deg,#3fd27a,#16a352)", photo: rg.photo || undefined };
  const extra: Account[] = [person];
  if (rg.orgMode === "create" && rg.orgName) extra.push({ id: "o" + id, name: rg.orgName, short: rg.orgName, role: "orgAdmin", org: 1, bg: "linear-gradient(135deg,#56a6ff,#1f6fe0)" });
  else if (rg.found) extra.push({ id: "o" + id, name: rg.found.name, short: rg.found.name, role: "orgMember", org: 1, bg: "linear-gradient(135deg,#2fc7c0,#0f8f97)" });
  const save = (list: Account[]) => { const prev = JSON.parse(localStorage.getItem(STORAGE_KEYS.accountsExtra) || "[]"); localStorage.setItem(STORAGE_KEYS.accountsExtra, JSON.stringify(prev.concat(list))); };
  try { save(extra); } catch { try { save(extra.map((a) => ({ ...a, photo: undefined }))); } catch { /* quota */ } }
  useAccount.setState((s) => ({ accounts: [...s.accounts, ...extra], accId: id, prof: rg.role })); saveAcc();
  const pref = rg.pref; rgEl().classList.add("leaving");
  rgLater(() => { hideRegister(); setStatus("online", { quiet: true }); boot(); setTimeout(() => { toast(t("createdSub", { x: first })); if (pref !== lang()) setTimeout(() => switchLang(pref as Lang), 900); }, 500); }, 700);
}
/* carousel + quote (L9842) */
function renderSlide(swap: boolean) {
  const s = $("rgSlide")!; $("rgSlideT")!.textContent = t(`cs${rgSlideI + 1}t`); $("rgSlideS")!.textContent = t(`cs${rgSlideI + 1}s`);
  if (swap) replay(s, "swap");
  $("rgDots")!.innerHTML = [0, 1, 2].map((i) => `<button type="button" role="tab" aria-selected="${i === rgSlideI}" aria-label="${esc(t("slideN", { n: nf(i + 1) }))}" data-slide="${i}"></button>`).join("");
  $("rgArt")!.style.transform = ["none", "translateX(-8px) rotate(-3deg) scale(1.02)", "translateX(8px) rotate(3deg) scale(.98)"][rgSlideI];
}
export function autoSlide() { clearInterval(rgSlideT); if (lkRM()) return; rgSlideT = setInterval(() => { if (!isRegister()) return; rgSlideI = (rgSlideI + 1) % 3; renderSlide(true); }, 6000); }
export const stopSlide = () => clearInterval(rgSlideT);
function renderRgQuote(swap: boolean) {
  const q = $("rgQ")!; q.querySelector("b")!.textContent = t(rgQ ? `q${rgQ + 1}t` : "q1t"); q.querySelector("small")!.textContent = rgQ ? t(`q${rgQ + 1}s`) : t("rqs");
  if (swap) replay(q, "swap");
  const bg = $<HTMLCanvasElement>("rgQBg")!; paint(bg, scenes[rgQ % 3], bg.width, bg.height);
}
export function nextRgQuote() { rgQ = (rgQ + 1) % QUOTES; renderRgQuote(true); }
export function pickSlide(i: number) { rgSlideI = i; renderSlide(true); autoSlide(); }
export function showRegister() {
  closeOverlays();
  const si = $("si"); if (si?.classList.contains("on")) { si.classList.remove("on"); si.setAttribute("aria-hidden", "true"); }
  const lk = $("lock"); if (lk?.classList.contains("on")) { lk.classList.remove("on"); lk.setAttribute("aria-hidden", "true"); }
  rgTimers.forEach(clearTimeout); rgTimers = []; if (rgResendT) clearInterval(rgResendT); rgResendT = null; rgResendLeft = 0;
  rg = RG0(); rgStep = 0; rgMax = 0; rgBusy = false; rgQ = 0;
  renderRg(0); renderSlide(false); renderRgQuote(false); autoSlide();
  document.body.classList.add("locked"); const sh = shellEl(); if (sh) sh.inert = true;
  const el = rgEl(); el.classList.remove("leaving", "on"); void el.offsetWidth; el.classList.add("on"); el.setAttribute("aria-hidden", "false"); el.scrollTop = 0;
}
function hideRegister() {
  clearInterval(rgSlideT); if (rgResendT) clearInterval(rgResendT); rgResendT = null; closeRgPop(); const el = rgEl(); el.classList.remove("on"); el.setAttribute("aria-hidden", "true");
  setTimeout(() => el.classList.remove("leaving"), 600);
  document.body.classList.remove("locked"); const sh = shellEl(); if (sh) sh.inert = false;
}
function hideRegisterTo() { const el = rgEl(); el.classList.remove("on"); el.setAttribute("aria-hidden", "true"); clearInterval(rgSlideT); if (rgResendT) clearInterval(rgResendT); rgResendT = null; showSignin(); }
/** applyLang while the wizard is up (L7992). */
export function rgOnLang() { if (!isRegister()) return; collect(); renderRg(0); renderSlide(false); renderRgQuote(false); }

/* ---------- events (L9714–L9898) ---------- */
export function rgClick(e: MouseEvent) {
  const b = (e.target as Element).closest<HTMLButtonElement>("button"); if (!b) return; const d = b.dataset; const body = rgBody();
  if (d.legal) { e.preventDefault(); e.stopPropagation(); toast(t("notInPreview", { x: t(d.legal === "terms" ? "termsOS" : "privacyP") })); return; }
  if (d.meth) { if (rgBusy || (d.meth === rg.method && !rg.verified)) return; collect(); rg.method = d.meth; rg.verified = null; rg.noPass = false; body.querySelectorAll("[data-meth]").forEach((x) => x.setAttribute("aria-checked", String(x === b))); swapPart("rgMethBody", methBody()); updPw(); return; }
  if (d.eye) { const p = $<HTMLInputElement>(d.eye)!; p.type = p.type === "password" ? "text" : "password"; b.innerHTML = p.type === "text" ? LKI.eyeOff : LKI.eye; b.setAttribute("aria-label", t(p.type === "text" ? "hidePass" : "showPass")); p.focus(); return; }
  if (d.rgov) { body.querySelectorAll("[data-rgov]").forEach((x) => x.classList.toggle("sel", x === b)); verifyWith(d.rgov, b, false); return; }
  if (b.id === "rgSsoGo") { const inp = $<HTMLInputElement>("rgSso")!, v = inp.value.trim(); if (!/[^\s@]+\.[^\s@]+$/.test(v)) { rgFail(["rgSso"], t("ssoNeed")); return; } b.classList.add("busy"); b.innerHTML = `${LKI.spin}<span>${t("redirecting")}</span>`; if (v.includes("@")) rg.email = v; verifyWith(v.split("@").pop()!, b, false); return; }
  if (d.rprov) { verifyWith(d.rprov, b, true); return; }
  if (b.hasAttribute("data-to-signin")) { hideRegisterTo(); return; }
  if (b.hasAttribute("data-next")) { if (validate()) goStep(rgStep + 1); return; }
  if (b.hasAttribute("data-prev")) { goStep(rgStep - 1); return; }
  if (d.step !== undefined && !b.disabled) { goStep(+d.step); return; }
  if (d.omode) {
    if (rgBusy || d.omode === rg.orgMode) return; collect(); rg.orgMode = d.omode; rg.found = null;
    b.parentElement!.querySelectorAll("[data-omode]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    const head = ORG_HEAD[rg.orgMode], h = $("rgHeading")!, sb = $("rgOrgSub")!;
    if (h.textContent !== t(head[0])) { h.textContent = t(head[0]); h.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.2,1,.3,1)" }); }
    sb.textContent = t(head[1]); sb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380 });
    swapPart("rgOrgBody", orgBody()); const er = $("rgErr"); if (er) er.textContent = ""; return;
  }
  if (d.detect) { detectOrg(d.detect, b); return; }
  if (d.clear) { const i = $<HTMLInputElement>(d.clear)!; i.value = ""; (rg as Record<string, unknown>)[d.clear === "rgInvite" ? "invite" : "ident"] = ""; b.hidden = true; clearFound(); i.focus(); return; }
  if (d.copy) { const done = () => { b.classList.add("done"); b.innerHTML = RGI.check; toast(t("copied")); setTimeout(() => { b.classList.remove("done"); b.innerHTML = OI.copy; }, 1600); }; try { navigator.clipboard.writeText(d.copy).then(done, done); } catch { done(); } return; }
  if (b.hasAttribute("data-orgdetails")) { toast(t("notInPreview", { x: t("viewDetails") })); return; }
  if (b.hasAttribute("data-lookup")) { lookupCreate(b); return; }
  if (b.hasAttribute("data-pick")) { $("rgFile")!.click(); return; }
  if (b.hasAttribute("data-rmphoto")) { rg.photo = null; const av = $("rgAv")!; av.querySelector(".ph")!.innerHTML = RGI.person; replay(av, "pop"); document.querySelector("#rgDrop .acts")!.innerHTML = `<button type="button" class="rg-file" data-pick>${t("chooseFile")}</button>`; return; }
  if (b.id === "rgResend") { if (rgResendLeft > 0 || rg.codeOk) return; startResend(); rg.code = ""; codeInputs().forEach((i) => { i.value = ""; i.classList.remove("fill"); i.readOnly = false; }); document.querySelector<HTMLElement>("#rgCode input")?.focus(); toast(t("codeSentTo", { x: vDest() })); return; }
  if (d.vsend) { sendVia(d.vsend, b); return; }
  if (d.vemail) {
    const a = d.vemail;
    if (a === "edit") { if (rg.codeOk) return; if (rg.channel !== "email" && rg.channel !== "link") { rg.channel = "email"; rg.code = ""; swapVerify(); startResend(); return; } rg.editEmail = true; swapPart("rgVTargetW", vTarget()); setTimeout(() => { const i = $<HTMLInputElement>("rgNewEmail"); i?.focus(); i?.select(); }, 80); return; }
    if (a === "cancel") { rg.editEmail = false; swapPart("rgVTargetW", vTarget()); return; }
    if (a === "save") {
      const v = $<HTMLInputElement>("rgNewEmail")!.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { replay($("rgNewEmailF"), "err"); $("rgErr")!.textContent = t("emailInvalid"); return; }
      if (v === rg.email) { rg.editEmail = false; swapPart("rgVTargetW", vTarget()); toast(t("emailSame")); return; }
      rg.email = v; rg.editEmail = false; rg.channel = "email"; rg.code = ""; swapVerify(); startResend(); toast(t("codeSentTo", { x: v })); $("rgErr")!.textContent = ""; return;
    }
  }
  if (b.hasAttribute("data-create")) { if (rvCheck()) createAccount(b); return; }
  if (d.policy) { toast(t("rvPolicyPv", { x: b.textContent! })); return; }
  if (b.hasAttribute("data-open")) { finishRegister(); return; }
}
export function rgStepsClick(e: MouseEvent) { const b = (e.target as Element).closest<HTMLButtonElement>("[data-step]"); if (b && !b.disabled) { e.stopPropagation(); goStep(+b.dataset.step!); } }
function onInput(e: Event) {
  const tgt = e.target as HTMLInputElement;
  const ci = tgt.closest<HTMLInputElement>("#rgCode input");
  if (ci) {
    const all = codeInputs(), i = all.indexOf(ci); const dd = ci.value.replace(/\D/g, "");
    if (dd.length > 1) { dd.split("").slice(0, 6 - i).forEach((x, k) => { all[i + k].value = x; all[i + k].classList.add("fill"); }); all[Math.min(5, i + dd.length)].focus(); }
    else { ci.value = dd; ci.classList.toggle("fill", !!dd); if (dd && i < 5) all[i + 1].focus(); }
    codeChanged(); return;
  }
  const f = tgt.closest(".rg-in"); if (f?.classList.contains("err")) { f.classList.remove("err"); const er = $("rgErr"); if (er) er.textContent = ""; }
  if (["rgPass", "rgFirst", "rgEmail"].includes(tgt.id)) { collect(); updPw(); }
  if (tgt.id === "rgInvite" || tgt.id === "rgIdent") { const c = tgt.parentElement!.querySelector<HTMLElement>(".clr"); if (c) c.hidden = !tgt.value; const oe = $("rgOErr"); if (oe) oe.textContent = ""; if (rg.found) clearFound(); }
  if (tgt.closest("#rgOrgBody")) { const oe = $("rgOErr"); if (oe && !tgt.matches("#rgInvite,#rgIdent")) oe.textContent = ""; }
}
function onInput2(e: Event) {
  const tgt = e.target as HTMLInputElement; if (tgt.id !== "rgRpps") return;
  const dd = tgt.value.replace(/\D/g, ""); const c = $("rgRppsC"); if (c) { c.textContent = `${nf(dd.length)}/${nf(11)}`; c.classList.toggle("ok", dd.length === 11); c.classList.toggle("over", dd.length > 11); } $("rgRppsF")?.classList.remove("err");
}
function onKeyDown(e: KeyboardEvent) {
  const tgt = e.target as HTMLInputElement, body = rgBody();
  const ci = tgt.closest?.<HTMLInputElement>("#rgCode input");
  if (ci) {
    const all = codeInputs(), i = all.indexOf(ci);
    if (e.key === "Backspace" && !ci.value && i > 0) { e.preventDefault(); all[i - 1].value = ""; all[i - 1].classList.remove("fill"); all[i - 1].focus(); codeChanged(); }
    else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); all[i - 1].focus(); } else if (e.key === "ArrowRight" && i < 5) { e.preventDefault(); all[i + 1].focus(); }
    else if (e.key === "Enter") { e.preventDefault(); body.querySelector<HTMLElement>("[data-next]")?.click(); }
    return;
  }
  if (e.key === "Enter" && tgt.id === "rgNewEmail") { e.preventDefault(); body.querySelector<HTMLElement>('[data-vemail="save"]')?.click(); return; }
  if (e.key === "Escape" && tgt.id === "rgNewEmail") { e.preventDefault(); e.stopPropagation(); body.querySelector<HTMLElement>('[data-vemail="cancel"]')?.click(); return; }
  if (e.key === "Enter" && (tgt.id === "rgInvite" || tgt.id === "rgIdent")) { e.preventDefault(); body.querySelector<HTMLElement>("[data-detect]")?.click(); return; }
  if (e.key === "Enter" && tgt.id === "rgIdNum") { e.preventDefault(); body.querySelector<HTMLElement>("[data-lookup]")?.click(); return; }
  if (e.key === "Enter" && tgt.tagName === "INPUT" && tgt.type !== "checkbox") { e.preventDefault(); if (tgt.id === "rgSso") $("rgSsoGo")?.click(); else body.querySelector<HTMLElement>("[data-next],[data-create]")?.click(); }
}
function onPaste(e: ClipboardEvent) {
  const ci = (e.target as Element).closest?.("#rgCode input"); if (!ci) return;
  const dd = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6); if (!dd) return; e.preventDefault();
  const all = codeInputs(); dd.split("").forEach((x, k) => { if (all[k]) { all[k].value = x; all[k].classList.add("fill"); } }); all[Math.min(5, dd.length)].focus(); codeChanged();
}
function onDragOver(e: DragEvent) { const d = (e.target as Element).closest?.("#rgDrop,#rgAv"); if (!d) return; e.preventDefault(); $("rgDrop")!.classList.add("drag"); $("rgDropHint")!.textContent = t("dropHere"); }
function onDragLeave(e: DragEvent) { const d = $("rgDrop"); if (d && !d.contains(e.relatedTarget as Node)) { d.classList.remove("drag"); const h = $("rgDropHint"); if (h && h.className === "or") h.textContent = t("dragDrop"); } }
function onDrop(e: DragEvent) { const d = (e.target as Element).closest?.("#rgDrop,#rgAv"); if (!d) return; e.preventDefault(); $("rgDrop")!.classList.remove("drag"); setPhoto(e.dataTransfer?.files?.[0]); }
function onChangeProfile(e: Event) {
  const tgt = e.target as HTMLSelectElement;
  if (tgt.id === "rgRole") { rg.role = tgt.value; rg.roleSet = true; return; }
  if (tgt.id !== "rgProf") return;
  const had = needRpps(); collect(); rg.profession = tgt.value;
  if (!rg.roleSet) { const r = rg.profession === "admin" ? "reception" : "therapist"; if (rg.role !== r) { rg.role = r; $<HTMLSelectElement>("rgRole")!.value = r; const f = $("rgRoleF"); if (f && !lkRM()) f.animate([{ boxShadow: "0 0 0 3px rgba(34,177,76,.35)" }, { boxShadow: "0 0 0 0 rgba(34,177,76,0)" }], { duration: 900, easing: "ease-out" }); } }
  if (had !== needRpps()) swapPart("rgRppsW", rppsBlock());
}
function onChangeReview(e: Event) {
  const ck = (e.target as Element).closest?.(".rv-ck"); if (!ck) return;
  rvSync(); ck.classList.remove("err");
  if (rg.tos && rg.priv && rg.dpa) { rgBody().querySelector(".rv-card.terms")?.classList.remove("err"); const er = $("rgErr"); if (er) er.textContent = ""; }
}
function onChange(e: Event) {
  const tgt = e.target as HTMLInputElement & HTMLSelectElement;
  if (tgt.id === "rgFile") { setPhoto(tgt.files?.[0]); tgt.value = ""; return; }
  if (tgt.id === "rgAgree") { rg.agree = tgt.checked; $("rgAgreeL")!.classList.remove("err"); const er = $("rgErr"); if (er) er.textContent = ""; return; }
  if (tgt.id === "rgIdCC" || tgt.id === "rgCountry") { const id = tgt.id, c = tgt.value; if (id === "rgIdCC") rg.identCC = c; else rg.country = c; const f = $(id + "Flag")!; f.innerHTML = FLAGS[c]; replay(f, "pop"); $(id + "Name")!.textContent = countryName(c); if (id === "rgIdCC" && rg.found) clearFound(); return; }
  if (tgt.id === "rgCC") { rg.cc = tgt.value; const f = $("rgFlag")!; f.innerHTML = FLAGS[rg.cc]; replay(f, "pop"); $("rgDial")!.textContent = DIAL[rg.cc]; $("rgPhone")!.focus(); }
}
/** The source registers these on #rgBody in this order (L9714, L9741, L9764, L9785–L9787, L9790, L9797, L9808, L9876). */
export function installRegister() {
  const body = rgBody();
  const pairs: [string, EventListener][] = [["input", onInput], ["keydown", onKeyDown as EventListener], ["paste", onPaste as EventListener], ["dragover", onDragOver as EventListener], ["dragleave", onDragLeave as EventListener], ["drop", onDrop as EventListener], ["change", onChangeProfile], ["input", onInput2], ["change", onChangeReview], ["change", onChange]];
  pairs.forEach(([ev, fn]) => body.addEventListener(ev, fn));
  // Click handling sits on the card's parent (covers the card and the "have an account" line, L9850) and on the
  // steps bar (L9877), as native listeners so stopPropagation behaves as in the source.
  const mid = $("rgCard")!.parentElement!, steps = rgSteps();
  mid.addEventListener("click", rgClick); steps.addEventListener("click", rgStepsClick);
  const key = (e: KeyboardEvent) => { if (!isRegister() || e.key !== "Escape") return; if (rgPopEl) { closeRgPop(); return; } if (rgStep > 0 && !rgBusy) goStep(rgStep - 1); };
  document.addEventListener("keydown", key);
  return () => { pairs.forEach(([ev, fn]) => body.removeEventListener(ev, fn)); mid.removeEventListener("click", rgClick); steps.removeEventListener("click", rgStepsClick); document.removeEventListener("keydown", key); };
}
/* language popover (L9882) */
export function closeRgPop() { rgPopEl?.remove(); rgPopEl = null; }
export function rgLangPop(btn: HTMLElement) {
  if (rgPopEl) { closeRgPop(); return; }
  const p = document.createElement("div"); p.className = "si-pop"; p.setAttribute("role", "menu");
  p.innerHTML = (Object.entries(LANGS) as [string, { name: string }][]).map(([k, L]) => `<button role="menuitemradio" aria-checked="${k === lang()}" data-l="${k}"><span class="code">${k.toUpperCase()}</span><span lang="${k}">${L.name}</span>${MI.ck}</button>`).join("");
  rgEl().appendChild(p); const r = btn.getBoundingClientRect(), w = p.offsetWidth, left = Math.min(Math.max(8, r.right - w), innerWidth - w - 8);
  p.style.position = "fixed"; p.style.left = left + "px"; p.style.top = r.bottom + 8 + "px"; p.style.setProperty("--ox", r.left + r.width / 2 - left + "px");
  p.addEventListener("click", (ev) => { const b = (ev.target as Element).closest<HTMLElement>("[data-l]"); if (!b) return; ev.stopPropagation(); p.remove(); rgPopEl = null; if (rgStep === 1) { collect(); if (rg.pref === lang()) rg.pref = b.dataset.l!; } switchLang(b.dataset.l as Lang); });
  rgPopEl = p; setTimeout(() => p.querySelector("button")?.focus({ preventScroll: true }), 40);
}
export function rgPointerDown(e: PointerEvent | React.PointerEvent) { if (rgPopEl && !(e.target as Element).closest(".si-pop,#rgLang")) closeRgPop(); }

registerOsAction("register", showRegister);
