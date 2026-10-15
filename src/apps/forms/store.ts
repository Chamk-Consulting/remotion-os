/**
 * Forms store (source L12400–L12508, the subset other apps read): the `remotion-forms` document model, its seed
 * (feFresh, used when nothing is stored) and its load-time migrations (g1 / g2 / cv), plus the field walkers.
 *
 * The source shares one in-memory `feS` between the Forms app and its readers (Billing's form-linked documents,
 * source L23652). The Forms app is still served by the bridge (its own iframe document), so this native copy reads
 * the same `remotion-forms` key and drops its cache when that key changes in another document (storage event):
 * readers see what Forms has saved, not unsaved edits still in the Forms editor's memory. Code below is the
 * source's own text with types added, including the later wrapper (L14340) that makes feLoad seed the reusable
 * blocks (L13866) and save — a first read by another app writes `remotion-forms`, as in the source.
 */
import { translate } from "@/lib/i18n/core";
import { isLang } from "@/lib/i18n/langs";

/** t (L7507) in the current OS language, for the reusable-block names. */
const t = (k: string) => { const h = document.documentElement.lang; return translate(isLang(h) ? h : "en", k); };
/** FE.mem (L12488): the uploaded images kept in memory when storage is full. */
const FE_MEM: { mem?: Record<string, unknown> } = {};
export type FeField = { id: string; type: string; label: unknown; key: string; fields?: FeField[]; [k: string]: unknown };
export type FeSection = { id: string; title: unknown; cols?: number; fields: FeField[] };
export type FePage = { id?: string; title?: unknown; sections: FeSection[] };
export type FeDocT = { pages: FePage[]; title?: unknown; status?: string; [k: string]: unknown };
export type FeEntryT = { id: string; name?: unknown; cat?: string; kind?: string; status?: string; arch?: boolean; [k: string]: unknown };
export type FeState = { v: number; cur: string; docs: Record<string, FeDocT>; forms: FeEntryT[]; pv: Record<string, unknown>; g1?: number; g2?: number; [k: string]: unknown };
type WalkFn = (f: FeField, box: FeSection | FeField, i: number, depth: number, sec: FeSection) => unknown;

export const FE_WIDE=new Set(["table","chart","info","divider","group","textarea","file","patient","history","allergy","meds","vitals","clinical","sat","nps","rank","matrix","sign"]);
let feSeq=Date.now()%1e7;export const feId=():string=>"x"+(feSeq++).toString(36);
export function feField(type:string,label:unknown,o:Record<string, unknown>={}):FeField{return {id:feId(),type,label,key:"",req:false,ro:false,hid:false,w:FE_WIDE.has(type)?2:1,...o}}
export function feSeedMain(trim?:boolean):FeDocT{
  const F=feField;
  const p1=[
    {id:feId(),title:"fe_sPerso",cols:2,fields:[
      F("text","fe_fNom",{key:"nom",ph:"fe_phNom",desc:"fe_dNom",req:true,min:2,max:50,src:"patient"}),
      F("text","fe_fPrenom",{key:"prenom",ph:"fe_phPrenom",req:true,min:2,max:50,src:"patient"}),
      F("date","fe_fDob",{key:"date_naissance",ph:"fe_phDob",req:true}),
      F("select","fe_fSexe",{key:"sexe",disp:"radio",opts:["fe_oF","fe_oM","fe_oO"],req:true}),
      F("phone","fe_fTel",{key:"telephone",ph:"fe_phTel",req:true}),
      F("email","fe_fMail",{key:"email",ph:"fe_phMail"})]},
    {id:feId(),title:"fe_sAddr",cols:3,fields:[
      F("text","fe_fAddr",{key:"adresse",ph:"fe_phAddr",w:2}),
      F("text","fe_fCp",{key:"code_postal",ph:"fe_phCp",max:10}),
      F("text","fe_fVille",{key:"ville",ph:"fe_phVille"}),
      F("select","fe_fPays",{key:"pays",disp:"list",opts:["fe_oFR","fe_oBE","fe_oCH","fe_oDE","fe_oMA"],def:0})]},
    {id:feId(),title:"fe_sMore",cols:3,fields:[
      F("select","fe_fSit",{key:"situation_familiale",disp:"list",opts:["fe_oS1","fe_oS2","fe_oS3","fe_oS4","fe_oS5"]}),
      F("select","fe_fLang",{key:"langue_preferee",disp:"list",opts:["Français","English","Deutsch","العربية"]}),
      F("select","fe_fSrc",{key:"connu_par",disp:"list",opts:["fe_oK1","fe_oK2","fe_oK3","fe_oK4"]}),feSeedGroup()]}];
  if(trim)p1.pop();
  return {title:"fe_dTitle",sub:"fe_dSub",status:"draft",cat:"patients",lang:null,pages:[
    {id:feId(),title:"fe_pg1",sections:p1},
    {id:feId(),title:"fe_pg2",sections:[
      {id:feId(),title:"fe_sHist",cols:2,fields:[F("history","fe_fHist",{key:"antecedents",opts:["fe_oH1","fe_oH2","fe_oH3","fe_oH4","fe_oH5"]}),F("allergy","fe_fAll",{key:"allergies",ph:"fe_phAll"}),F("yesno","fe_fSurg",{key:"deja_opere",opts:["fe_yes","fe_no","fe_maybe"],maybe:true}),F("meds","fe_fMeds",{key:"traitements"})]},
      {id:feId(),title:"fe_sVit",cols:2,fields:[F("vitals","fe_fVit",{key:"signes_vitaux"}),F("clinical","fe_fEva",{key:"douleur_eva"}),...feSeedPain()]}]},
    {id:feId(),title:"fe_pg3",sections:[
      {id:feId(),title:"fe_sIns",cols:2,fields:[F("text","fe_fOrg",{key:"organisme",ph:"fe_phOrg"}),F("text","fe_fNum",{key:"numero_adherent",ph:"fe_phNum"}),F("file","fe_fCard",{key:"carte_assurance"})]},
      {id:feId(),title:"fe_sCons",cols:1,fields:[F("multi","fe_fConsent",{key:"consentements",opts:["fe_oC1","fe_oC2"],req:true}),F("sign","fe_fSign",{key:"signature",req:true})]}]}],
    set:{msg:"fe_confirmDef",login:false,accept:true,notif:true},share:{access:"any",invites:[],expire:false,until:""},
    auto:{a1:true,a2:true,a3:false,a4:false,a5:true},everPub:false};
}
export function feMakeDoc(kind:string,title?:unknown):FeDocT{
  const F=feField,sec=(t2:string,fields:FeField[],cols=2):FeSection=>({id:feId(),title:t2,cols,fields});
  let pages;
  if(kind==="survey")pages=[{id:feId(),title:"fe_pgS",sections:[sec("fe_sExp",[F("sat","fe_fSat",{key:"satisfaction",req:true}),F("nps","fe_fNps",{key:"nps",req:true}),F("matrix","fe_fMatrix",{key:"evaluation",rows:["fe_mxR1","fe_mxR2","fe_mxR3"],cols:["fe_mxC1","fe_mxC2","fe_mxC3","fe_mxC4"]}),F("textarea","fe_fComments",{key:"commentaires",ph:"fe_phComments"})],1)]}];
  else if(kind==="clinical")pages=[{id:feId(),title:"fe_pgC",sections:[sec("fe_sPat",[F("patient","fe_cPatient",{key:"patient",req:true})],1),sec("fe_sEval",[F("clinical","fe_fEva",{key:"douleur_eva",req:true}),F("vitals","fe_fVit",{key:"signes_vitaux"}),F("textarea","fe_fObs",{key:"observations"})],1)]}];
  else if(kind==="consent")pages=[{id:feId(),title:"fe_pgCo",sections:[sec("fe_sPat",[F("patient","fe_cPatient",{key:"patient",req:true})],1),sec("fe_sCons",[F("multi","fe_fConsent",{key:"consentements",opts:["fe_oC1","fe_oC2"],req:true}),F("sign","fe_fSign",{key:"signature",req:true})],1)]}];
  else if(kind==="booking")pages=[{id:feId(),title:"fe_pgB",sections:[sec("fe_sPerso",[F("text","fe_fNom",{key:"nom",req:true}),F("text","fe_fPrenom",{key:"prenom",req:true}),F("phone","fe_fTel",{key:"telephone",ph:"fe_phTel"}),F("email","fe_fMail",{key:"email",ph:"fe_phMail"}),F("date","fe_fWhen",{key:"date_souhaitee",req:true}),F("textarea","fe_fReason",{key:"motif"})])]}];
  else if(kind==="patients")return Object.assign(feSeedMain(),{title:title||"fe_dTitle",everPub:true,status:"pub"});
  else pages=[{id:feId(),title:"fe_pg1",sections:[sec("fe_newSec",[F("text","fe_untitledQ",{key:"question_1"})])]}];
  return {title:title||"fe_untitled",sub:kind==="blank"?"":"fe_dSubGen",status:"draft",cat:kind==="survey"?"surveys":kind==="clinical"?"clinical":"patients",lang:null,pages,set:{msg:"fe_confirmDef",login:false,accept:true,notif:true},share:{access:"any",invites:[],expire:false,until:""},auto:{a1:true,a2:false,a3:false,a4:false,a5:false},everPub:false};
}
export const FE_TPL=[["t1","patients","fe_tp1","fe_tpd1"],["t2","survey","fe_tp2","fe_tpd2"],["t3","consent","fe_tp3","fe_tpd3"],["t4","clinical","fe_tp4","fe_tpd4"],["t5","survey","fe_tp5","fe_tpd5"],["t6","booking","fe_tp6","fe_tpd6"]];
export function feFresh():FeState{
  const now=Date.now(),day=864e5,main=feSeedMain();
  const forms=[
    {id:"f1",cat:"patients",kind:"patients",status:"draft",resp:0,upd:now-12e4,owner:"me"},
    {id:"f2",name:"fe_n2",cat:"surveys",kind:"survey",status:"pub",resp:128,upd:now-day,owner:"me"},
    {id:"f3",name:"fe_n3",cat:"clinical",kind:"clinical",status:"pub",resp:64,upd:now-2*day,owner:"me"},
    {id:"f4",name:"fe_n4",cat:"patients",kind:"consent",status:"pub",resp:212,upd:now-3*day,owner:"me"},
    {id:"f5",name:"fe_n5",cat:"clinical",kind:"clinical",status:"pub",resp:37,upd:now-4*day,owner:"lau"},
    {id:"f6",name:"fe_n6",cat:"surveys",kind:"survey",status:"draft",resp:0,upd:now-5*day,owner:"me"},
    {id:"f7",name:"fe_n7",cat:"patients",kind:"patients",status:"pub",resp:18,upd:now-20*day,owner:"me",arch:true},
    {id:"f8",name:"fe_n8",cat:"clinical",kind:"clinical",status:"pub",resp:51,upd:now-6*day,owner:"ben"}];
  const nm=["Camille Martin","Lucas Bernard","Inès Haddad","Jonas Weber","Sofia Rossi","Hugo Lefèvre","Amira Benali","Léa Fontaine"];
  const subs=nm.map((n,i)=>({id:"s"+i,who:n,form:["f4","f2","f3","f4","f2","f5","f4","f3"][i],at:now-(i*7+2)*36e5,st:i<3?"new":"done"}));
  return {v:1,cur:"f1",docs:{f1:main},forms,subs,ver:{f1:[{n:1,at:now-2*day,by:"me",snap:JSON.stringify(feSeedMain(true))},{n:2,at:now-day,by:"me",snap:JSON.stringify(main)}]},
    pv:{theme:"clinic",color:"#5A64E0",logo:"leaf",hdr:"mount",org:true,lang:null,prog:true,nums:true,later:true,reqm:true,ro:false,fill:false,logic:false},
    set:{autosave:true,ai:true,enc:true,mail:true},saved:now-12e4,g1:1,g2:1};
}
export let feS:FeState|null=null;
export let feLoad=function():void{
  if(feS)return;
  try{const s=JSON.parse(localStorage.getItem("remotion-forms")||"null");if(s&&s.v===1&&s.docs&&Array.isArray(s.forms))feS=s}catch(e){}
  if(!feS)feS=feFresh();
  feS.pv=Object.assign(feFresh().pv,feS.pv||{});
  if(!feS.g2){const d=feS.docs.f1;if(d){let has=false;feWalk2(d,x=>{if(x.type==="table")has=true});const sec=d.pages?.[1]?.sections?.find(s=>s.title==="fe_sVit");if(sec&&!has)sec.fields.push(...feSeedPain());const h=d.pages?.[1]?.sections?.find(s=>s.title==="fe_sHist");if(h&&!h.fields.some(f=>f.type==="yesno"))h.fields.splice(2,0,feField("yesno","fe_fSurg",{key:"deja_opere",opts:["fe_yes","fe_no","fe_maybe"],maybe:true}))}feS.g2=1}
  if(!feS.g1){const d=feS.docs.f1,sec=d?.pages?.[0]?.sections?.find(s=>s.title==="fe_sMore");if(sec&&!sec.fields.some(f=>f.type==="group"))sec.fields.push(feSeedGroup());feS.g1=1}
  if(!feS.pv.cv){if(String(feS.pv.color).toUpperCase()==="#10B981")feS.pv.color="#5A64E0";feS.pv.cv=1}
}
export function feWalk2(d:FeDocT,fn:WalkFn):void{for(const p of d.pages||[])for(const s of p.sections||[])feWalk(s.fields,fn,s,s)}
export function feWalk(list:FeField[],fn:WalkFn,box:FeSection | FeField,sec:FeSection,depth=0):boolean|undefined{for(let i=0;i<list.length;i++){const f=list[i];if(fn(f,box,i,depth,sec)===false)return false;if(f.type==="group"&&Array.isArray(f.fields)&&feWalk(f.fields,fn,f,sec,depth+1)===false)return false}}
export function feSeedPain():FeField[]{const F=feField;const tb=F("table","fe_tPain",{key:"suivi_douleur",tcols:[{l:"fe_tDate",ty:"date"},{l:"fe_tLevel",ty:"number"},{l:"fe_tNote",ty:"text"}],rows:3,addRows:true,desc:"fe_tPainD"});return [F("info","fe_infoPainT",{key:"info_douleur",desc:"fe_infoPainD",tone:"info"}),tb,F("chart","fe_chPain",{key:"graph_douleur",ctype:"line",csrc:"tbl:"+tb.id,cx:0,cy:1,cvals:true})]}
export function feSeedGroup():FeField{const F=feField;return F("group","fe_gEmergency",{key:"personne_a_prevenir",cols:2,fields:[F("text","fe_fNom",{key:"contact_nom",ph:"fe_phNom"}),F("select","fe_fRel",{key:"contact_lien",disp:"list",opts:["fe_oRel1","fe_oRel2","fe_oRel3","fe_oRel4"]}),F("phone","fe_fTel",{key:"contact_telephone",ph:"fe_phTel"}),F("group","fe_gDoctor",{key:"medecin_traitant",cols:2,fields:[F("text","fe_fDocName",{key:"medecin_nom",ph:"fe_phDoc"}),F("text","fe_fVille",{key:"medecin_ville",ph:"fe_phVille"})]})]})}

export function feSave():void{
  try{localStorage.setItem("remotion-forms",JSON.stringify(feS))}catch(e){
    /* storage full: drop uploaded images, keep the rest */
    if(feS!.pv.logoData||feS!.pv.hdrData){FE_MEM.mem={logoData:feS!.pv.logoData,hdrData:feS!.pv.hdrData};delete feS!.pv.logoData;delete feS!.pv.hdrData;try{localStorage.setItem("remotion-forms",JSON.stringify(feS))}catch(e2){}Object.assign(feS!.pv,FE_MEM.mem)}
  }
}
/* ---------- reusable blocks ---------- */
export function feBlocksSeed(){const F=feField;return [
  {id:"b1",name:t("fe_blk1"),desc:t("fe_blk1d"),scope:"org",ver:1,upd:Date.now()-5*864e5,fields:[F("text","fe_fNom",{key:"nom",req:true}),F("text","fe_fPrenom",{key:"prenom",req:true}),F("phone","fe_fTel",{key:"telephone",ph:"fe_phTel"}),F("email","fe_fMail",{key:"email",ph:"fe_phMail"})],cols:2},
  {id:"b2",name:t("fe_blk2"),desc:t("fe_blk2d"),scope:"org",ver:2,upd:Date.now()-2*864e5,fields:[F("text","fe_fNom",{key:"contact_nom"}),F("select","fe_fRel",{key:"contact_lien",disp:"list",opts:["fe_oRel1","fe_oRel2","fe_oRel3","fe_oRel4"]}),F("phone","fe_fTel",{key:"contact_telephone",ph:"fe_phTel"})],cols:2},
  {id:"b3",name:t("fe_blk3"),desc:t("fe_blk3d"),scope:"org",ver:1,upd:Date.now()-9*864e5,fields:[F("multi","fe_fConsent",{key:"consentements",opts:["fe_oC1","fe_oC2"],req:true}),F("sign","fe_fSign",{key:"signature",req:true})],cols:1},
  {id:"b4",name:t("fe_blk4"),desc:t("fe_blk4d"),scope:"priv",ver:1,upd:Date.now()-864e5,fields:[F("sat","fe_fSat",{key:"satisfaction"}),F("nps","fe_fNps",{key:"nps"}),F("textarea","fe_fComments",{key:"commentaires"})],cols:1}]}
export function feBlocksEnsure():void{if(!Array.isArray(feS!.blocks)){feS!.blocks=feBlocksSeed();feSave()}if(!Array.isArray(feS!.favs))feS!.favs=[];if(!Array.isArray(feS!.recent))feS!.recent=[]}
{const _ld0=feLoad;feLoad=function(){_ld0();feBlocksEnsure()}}

/** The Forms app writes `remotion-forms` from its own document: drop the cached copy so the next feLoad re-reads it. */
if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === "remotion-forms" || e.key === null) feS = null; });
