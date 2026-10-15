"use client";
/**
 * Shared foundation of the healthcare suite (source L24463–L24529, v64): the persisted integration-event bus (rmBus),
 * the practitioner registry, the service catalogue, the establishment view and the notification kinds. Patients
 * uses it natively; Calendar and Cabinet (still bridged until their slices) keep their own copy in the bridge
 * document and meet this one through the same storage keys (`remotion-bus`, `remotion-shared`) and storage events.
 * The code below is the source's own text with types added. Employee names are read live from HR & Payroll (hrSt).
 */
import { L4 as L4core } from "@/lib/i18n/core";
import { isLang, type Lang } from "@/lib/i18n/langs";
import { hrSt } from "@/apps/hr/hr";
import { NC_KIND, pushNc, type NcItem } from "@/os/notifications/nc";

type Bag = Record<string, unknown>;
type Dict = Record<string, string>;
export type RmEv = { id: string; key: string; type: string; seq: number; ts: string; src: string; ref: string; ver: number | null; p: Bag };
export type RmBus = { v: number; seq: number; ev: RmEv[]; done: Record<string, string[]>; fail: { consumer: string; key: string; type: string; ts: string; n: number; msg: string }[] };
export type RmPrac = { id: string; hr?: string; name?: string; job?: string; spec: string; kind: string; active: boolean; color: string; bill?: string | null };
export type RmSvc = { id: string; n: string; spec: string; dur: number; minDur: number; maxDur: number; buf: number[]; rooms: string[]; pracs: string[]; billSvc: string | null; active: boolean; public: boolean; tele: boolean; equip: string[]; prep: string; instr: string; intake: string | null };
export type RmSh = { v: number; synthetic: boolean; pracs: RmPrac[]; services: RmSvc[]; estBill: Dict; [k: string]: unknown };
type RmSub = { consumer: string; fn: (ev: RmEv) => void };
const lang = (): Lang => { const h = typeof document === "undefined" ? "" : document.documentElement.lang; return isLang(h) ? h : "en"; };
const L4 = (s: string) => L4core(lang(), s);

/* ======================================================================================================== */
/* ===== v64 · Remotion shared foundation for the healthcare suite (Patients, Calendrier, Cabinet)
   - rmBus: persisted, idempotent integration-event log with per-consumer checkpoints, retries and stale-event protection
   - practitioner registry (employees referenced from RH & Paie, or independent / external professionals)
   - establishment referential (read-only view of the referential kept in RH & Paie until Gestion Organisation exists)
   - notifications through the OS notification centre (pushNc), never a second engine ===== */
const RM_BUS_KEY="remotion-bus",RM_SH_KEY="remotion-shared";
const RM: { bus: RmBus | null; subs: Record<string, RmSub[]>; sh: RmSh | null; retry: Record<string, number> }={bus:null,subs:{},sh:null,retry:{}};
const rmUid=(p?: string)=>(p||"")+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const rmNowIso=()=>new Date().toISOString();
function rmBusSt(): RmBus{if(RM.bus)return RM.bus;let s: RmBus | null=null;try{s=JSON.parse(localStorage.getItem(RM_BUS_KEY)||"null")}catch(e){}if(!s||s.v!==1)s={v:1,seq:0,ev:[],done:{},fail:[]};RM.bus=s;return s}
function rmBusSave(){try{const s=RM.bus;if(s!.ev.length>400)s!.ev=s!.ev.slice(-400);Object.keys(s!.done).forEach(k=>{if(s!.done[k].length>600)s!.done[k]=s!.done[k].slice(-600)});if(s!.fail.length>100)s!.fail=s!.fail.slice(-100);localStorage.setItem(RM_BUS_KEY,JSON.stringify(s))}catch(e){}}
/* emit: idempotent on `key` (same business fact => same key => recorded once). payload must not contain clinical content. */
function rmEmit(type: string,payload?: Bag | null,o: { key?: string; src?: string; ref?: string; ver?: number | null }={}){const s=rmBusSt();const key=o.key||rmUid("ev");if(s.ev.some(e=>e.key===key))return null;const ev: RmEv={id:rmUid("e"),key,type,seq:++s.seq,ts:rmNowIso(),src:o.src||"",ref:o.ref||"",ver:o.ver??null,p:payload||{}};s.ev.push(ev);rmBusSave();rmDispatch(ev);return ev}
/* subscribe with a stable consumer id; each consumer processes an event at most once */
function rmOn(type: string,consumer: string,fn: (ev: RmEv) => void){(RM.subs[type]=RM.subs[type]||[]).push({consumer,fn})}
function rmDispatch(ev: RmEv){const s=rmBusSt();(RM.subs[ev.type]||[]).concat(RM.subs["*"]||[]).forEach(({consumer,fn})=>{const done=s.done[consumer]=s.done[consumer]||[];if(done.includes(ev.key))return;try{fn(ev);done.push(ev.key);delete RM.retry[consumer+ev.key]}catch(err){const k=consumer+ev.key;const n=(RM.retry[k]||0)+1;RM.retry[k]=n;s.fail.push({consumer,key:ev.key,type:ev.type,ts:rmNowIso(),n,msg:String(err&&(err as Error).message||err).slice(0,120)});console.warn("rmBus handler",consumer,ev.type,err);if(n<4)setTimeout(()=>rmDispatch(ev),400*Math.pow(3,n-1))}});rmBusSave()}
/* replay anything a consumer has not processed yet (e.g. after another tab emitted while this app was closed) */
function rmCatchUp(){const s=rmBusSt();s.ev.forEach(ev=>rmDispatch(ev))}
if(typeof window!=="undefined")addEventListener("storage",e=>{if(e.key!==RM_BUS_KEY)return;const before=RM.bus?RM.bus.seq:0;RM.bus=null;const s=rmBusSt();s.ev.filter(ev=>ev.seq>before).forEach(rmDispatch)});
/* stale protection helper: true when an incoming version is older than what the consumer already applied */
const rmStale=(applied: number | null | undefined,ver: number | null | undefined)=>applied!=null&&ver!=null&&ver<applied;

/* ---------- shared referentials ---------- */
const RM_SPECS: Dict={physio:"Kinésithérapie|Physiotherapy|Physiotherapie|العلاج الطبيعي",ot:"Ergothérapie|Occupational therapy|Ergotherapie|العلاج الوظيفي",psych:"Psychologie|Psychology|Psychologie|علم النفس",speech:"Orthophonie|Speech therapy|Logopädie|علاج النطق",nursing:"Soins infirmiers|Nursing|Pflege|التمريض",med:"Médecine générale|General medicine|Allgemeinmedizin|الطب العام",other:"Autre spécialité|Other specialty|Andere Fachrichtung|تخصص آخر"};
function rmShSt(): RmSh{if(RM.sh)return RM.sh;let s: RmSh | null=null;try{s=JSON.parse(localStorage.getItem(RM_SH_KEY)||"null")}catch(e){}if(!s||s.v!==1)s=rmShSeed();if(!Array.isArray(s.services))s.services=rmSvcSeed();if(!s.estBill)s.estBill={s1:"e1",s2:"e2"};s.pracs.forEach(p=>{if(p.bill===undefined)p.bill=p.id==="pr1"?"p2":null});RM.sh=s;return s}
/* service catalogue: managed operationally by Gestion Cabinet; durations/rooms are used by Gestion Calendrier; tariffs stay in Facturation (billSvc is only a reference) */
function rmSvcSeed(): RmSvc[]{const S=(id: string,n: string,spec: string,dur: number,min: number,max: number,rooms: string[],pracs: string[],billSvc: string | null,o: Partial<RmSvc>={}): RmSvc=>Object.assign({id,n,spec,dur,minDur:min,maxDur:max,buf:[0,5],rooms,pracs,billSvc,active:true,public:true,tele:false,equip:[],prep:"",instr:"",intake:null},o);return [
 S("sv1","Séance de rééducation|Rehabilitation session|Rehabilitationssitzung|جلسة إعادة تأهيل","physio",30,20,60,["plateau","consult"],["pr1","pr2"],"s4"),
 S("sv2","Bilan kinésithérapique|Physiotherapy assessment|Physiotherapeutischer Befund|تقييم العلاج الطبيعي","physio",45,30,90,["consult","plateau"],["pr1","pr2"],"s5",{prep:"Prévoir la prescription et les comptes rendus récents|Bring prescription and recent reports|Verordnung mitbringen|إحضار الوصفة والتقارير"}),
 S("sv3","Consultation de médecine générale|General practice consultation|Allgemeinmedizinische Konsultation|استشارة طب عام","med",20,10,40,["consult"],["pr5"],"s1"),
 S("sv4","Séance d’orthophonie|Speech therapy session|Logopädie-Sitzung|جلسة علاج النطق","speech",30,20,60,["consult","entretien"],["pr7"],"s10"),
 S("sv5","Bilan orthophonique|Speech therapy assessment|Logopädischer Befund|تقييم النطق","speech",60,45,120,["consult","entretien"],["pr7"],"s9",{public:false}),
 S("sv6","Séance d’ergothérapie|Occupational therapy session|Ergotherapie-Sitzung|جلسة علاج وظيفي","ot",45,30,90,["plateau","consult"],["pr6"],"s12"),
 S("sv7","Séance de psychothérapie|Psychotherapy session|Psychotherapie-Sitzung|جلسة علاج نفسي","psych",50,30,90,["entretien"],["pr8"],"s6",{buf:[0,10]}),
 S("sv8","Soins infirmiers|Nursing care|Pflegeleistung|رعاية تمريضية","nursing",20,10,60,["soins"],["pr3","pr4"],null),
 S("sv9","Téléconsultation de suivi|Follow-up telehealth|Video-Folgetermin|استشارة متابعة عن بعد","physio",20,10,40,[],["pr1","pr2","pr5"],null,{tele:true,public:false,buf:[0,0]})]}
function rmShSave(){try{localStorage.setItem(RM_SH_KEY,JSON.stringify(RM.sh))}catch(e){}}
function rmShSeed(): RmSh{return <RmSh>{v:1,synthetic:true,pracs:[
  {id:"pr1",hr:"e2",spec:"physio",kind:"employee",active:true,color:"#2563eb"},
  {id:"pr2",hr:"e9",spec:"physio",kind:"employee",active:true,color:"#0e7490"},
  {id:"pr3",hr:"e6",spec:"nursing",kind:"employee",active:true,color:"#15803d"},
  {id:"pr4",hr:"e7",spec:"nursing",kind:"employee",active:true,color:"#7c3aed"},
  {id:"pr5",name:"Dr Paul Exemple",job:"Médecin généraliste (libéral, fictif)",spec:"med",kind:"independent",active:true,color:"#b45309"},
  {id:"pr6",name:"Sarah Exemple",job:"Ergothérapeute libérale (fictive)",spec:"ot",kind:"independent",active:true,color:"#be185d"},
  {id:"pr7",name:"Yasmine Exemple",job:"Orthophoniste libérale (fictive)",spec:"speech",kind:"independent",active:true,color:"#4d7c0f"},
  {id:"pr8",name:"Marc Exemple",job:"Psychologue (vacataire, fictif)",spec:"psych",kind:"contractor",active:true,color:"#9333ea"}]}}
/* names of employees are read live from RH & Paie (source of truth), never copied */
function rmHrEmp(id: string){try{if(typeof hrSt!=="function")return null;const S=hrSt();return S.emps.find(e=>e.id===id)||null}catch(e){return null}}
function rmPrac(id: string | null | undefined){return rmShSt().pracs.find(p=>p.id===id)||null}
function rmPracName(id: string | RmPrac | null | undefined){const p=typeof id==="object"?id:rmPrac(id);if(!p)return "—";if(p.hr){const e=rmHrEmp(p.hr);return e?(e.first+" "+e.last):L4("Praticien (fiche RH indisponible)|Practitioner (HR record unavailable)|Behandler (HR-Akte nicht verfügbar)|ممارس (سجل غير متاح)")}return p.name||"—"}
function rmPracJob(id: string | RmPrac | null | undefined){const p=typeof id==="object"?id:rmPrac(id);if(!p)return "";if(p.hr){const e=rmHrEmp(p.hr);return e?e.job:""}return p.job||""}
const rmPracs=(o: { all?: boolean }={})=>rmShSt().pracs.filter(p=>o.all||p.active);
const rmSpecName=(k: string | null | undefined)=>L4(RM_SPECS[k!]||RM_SPECS.other);
/* employment status is informative only: an independent practitioner is eligible without an HR record */
function rmPracEmployment(p: RmPrac){if(!p.hr)return p.kind;const e=rmHrEmp(p.hr);return e?(e.status==="left"?"left":"employee"):"unknown"}
/* establishment referential: owned by Gestion Organisation (not built yet) — read-only view of the list kept in RH & Paie */
function rmEsts(){try{if(typeof hrSt==="function")return hrSt().ests.map(e=>({id:e.id,n:e.n}))}catch(e){}return []}
const rmEstName=(id: string | null | undefined)=>(rmEsts().find(e=>e.id===id)||{}).n||"—";
/* OS notification centre integration */
function rmNotify(kind: string,title: string,sub?: string,o: { pri?: string; detail?: string; open?: () => void }={}){try{if(typeof pushNc!=="function"||typeof NC_KIND==="undefined")return false;if(!NC_KIND[kind])return false;pushNc({kind,pri:o.pri||"normal",t:()=>title,s:()=>sub||"",d:()=>o.detail||sub||"",f:()=>[],open:o.open||null});return true}catch(e){return false}}
if(typeof NC_KIND!=="undefined"){
  NC_KIND.rmPat={cat:"cPatients",bg:"linear-gradient(135deg,#ff6aa9,#e0327a)",ic:"people",act:"aView",primary:"aView",second:"snooze",run:(n: NcItem)=>n.open?n.open():null};
  NC_KIND.rmCal={cat:"cAppointments",bg:"linear-gradient(#3fd27a,#16a352)",ic:"cal",act:"aView",primary:"aView",second:"snooze",run:(n: NcItem)=>n.open?n.open():null};
  NC_KIND.rmCab={cat:"cAppointments",bg:"linear-gradient(135deg,#34c3a0,#0f8f74)",ic:"people",act:"aView",primary:"aView",second:"snooze",run:(n: NcItem)=>n.open?n.open():null};
}
/* privacy-safe display name for public screens: first name + initial, or a ticket number */
const rmSafeName=(first: string | null | undefined,last: string | null | undefined,mode?: string)=>mode==="ticket"?"":`${first||""} ${last?last[0]+".":""}`.trim();

export { RM, RM_BUS_KEY, RM_SH_KEY, RM_SPECS, rmUid, rmNowIso, rmBusSt, rmBusSave, rmEmit, rmOn, rmDispatch, rmCatchUp, rmStale, rmShSt, rmSvcSeed, rmShSave, rmShSeed, rmHrEmp, rmPrac, rmPracName, rmPracJob, rmPracs, rmSpecName, rmPracEmployment, rmEsts, rmEstName, rmNotify, rmSafeName };
