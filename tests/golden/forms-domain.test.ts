/**
 * Slice 18 golden test: the Forms & Surveys port gives the same results as the source's own code. The Forms region
 * (source L12311–L14340, without the OS integration block L13567–L13597) is evaluated from Remotion_Desktop.html beside
 * the port; each side has its own storage. Compared: the registries and seed store, every field type's canvas HTML,
 * properties-free preview control and answer summary in four languages, the formula engine (expressions, references,
 * errors, cycles), logic v2 conditions and visibility, scoring, age, chart data, CSV parsing, type guessing, domain
 * detection, the local AI planner, every template document, preview prefill / validation, autofill and the
 * accessibility check.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const stores = { source: new Map<string, string>(), port: new Map<string, string>() };
let mem = stores.source;
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() },
  document: { documentElement: { lang: "en", dir: "ltr" }, addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], activeElement: null },
  matchMedia: () => ({ matches: false }),
});
const NOW = Date.UTC(2026, 9, 14, 9, 30);
Date.now = () => NOW;
function seed() { let x = 987654321; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }

const html = fs.readFileSync(path.resolve(__dirname, "../../../source/Remotion_Desktop.html"), "utf8").split("\n");
const at = (re: RegExp, from = 0) => { const i = html.findIndex((l, k) => k >= from && re.test(l)); if (i < 0) throw new Error("not found: " + re); return i; };
const a = at(/^\/\* =+ Formulaires & Enquêtes \(forms app\) =+ \*\/$/), os = at(/^\/\* -+ window, dock, launcher, desktop -+ \*\/$/), u = at(/^\/\* =+ Forms: universal component registry/), z = at(/^\/\* =+ Documents — clinical document editor =+ \*\/$/, u);
const SRC = html.slice(a, os).concat(html.slice(u, z)).join("\n");
const EXPORTS = "FE,feLoad,feSave,feDoc,feEach,feFind,feName,fv,feTx,feField,feNewField,feMakeDoc,feFresh,feSlug,feUniqKey,feGuessType,feDomOf,feCap,feAiLocal,feTok,feParse,feRefs,feFormulaEval,feNumOf,feAgeOf,feScoreOf,feDeps,feValStr,feCond,feCondOne,feLogicNorm,feVis,feVisLeaves,feTblRows,feCsvParse,feChartData,feSubSt,feSp,feAutoSp,feBmLabel,fePvPrefill,fePvValidate,feFldHTML,fePvFld,feCtl,feAutofillSuggest,feA11y,FE_T,FE_PRE,FE_TPL,FE_G,FE_WIDE,FE_NUM";

type Side = Record<string, never>;
type Fn = (...a: unknown[]) => unknown;

describe("forms = source (golden)", async () => {
  const core = await import("@/lib/i18n/core");
  const langs = await import("@/lib/i18n/langs");
  const reg = (await import("@/apps/registry")) as unknown as { aiGetSample: () => unknown; BASE_ACCOUNTS: unknown };
  const regData = (await import("@/apps/registry.data.json")).default as unknown as { DK_APPS: unknown };
  // The source's globals (L7470–L7509, L9968, L10211, L11239, L11650): language, dictionary, formatting, accounts, menus.
  const G = {
    I18N: core.I18N, LANGS: langs.LANGS, translate: core.translate, formatNumber: core.formatNumber, ACCOUNTS: reg.BASE_ACCOUNTS, DK_APPS: regData.DK_APPS, aiGetSample: reg.aiGetSample,
  };
  const S = new Function("G", "var lang=\"en\";const {I18N,LANGS,ACCOUNTS,DK_APPS,aiGetSample}=G;const t=(k,v)=>G.translate(lang,k,v||{});const nf=n=>G.formatNumber(lang,n);const loc=()=>LANGS[lang].locale;" +
    "const fmtT=ms=>new Intl.DateTimeFormat(loc(),{hour:\"2-digit\",minute:\"2-digit\"}).format(ms);const fmtD=ms=>new Intl.DateTimeFormat(loc(),{weekday:\"short\",month:\"short\",day:\"numeric\",year:\"numeric\"}).format(ms);" +
    "const DKE=s=>String(s??\"\").replace(/[&<>\"]/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\"})[c]);const toast=()=>{};const osMenu=()=>{};const osMenus=[];const osMenuCloseAll=()=>{};const OSW={};var dkSuppress=false;\n" +
    SRC + "\nreturn {setLang:l=>{lang=l}," + EXPORTS + "};")(G) as Side & { setLang: (l: string) => void };
  const P = (await import("@/apps/forms/forms")) as unknown as Side;
  const sides: Record<string, Side> = { source: S, port: P };
  const setLang = (side: string, l: string) => { (globalThis as unknown as { document: { documentElement: { lang: string } } }).document.documentElement.lang = l; if (side === "source") S.setLang(l); };
  const call = (side: string, f: string, ...x: unknown[]) => (sides[side][f] as unknown as Fn)(...x);
  const res = (side: string, fn: () => unknown) => { mem = stores[side as "source" | "port"]; setLang(side, "en"); seed(); try { return JSON.parse(JSON.stringify(fn() ?? null)); } catch (e) { return "ERR " + (e as Error).message; } };
  const both = (fn: (side: string) => unknown) => ({ source: res("source", () => fn("source")), port: res("port", () => fn("port")) });
  const FE = (side: string) => sides[side].FE as unknown as { pv: { vals: Record<string, unknown>; step: number; err: Record<string, string> }; imp?: unknown; sel?: string | null };
  const st = (side: string) => { mem = stores[side as "source" | "port"]; return call(side, "feDoc") as { pages: { sections: { fields: { id: string; type: string }[] }[] }[] }; };
  const leaves = (side: string) => { const out: { id: string; type: string; [k: string]: unknown }[] = []; call(side, "feEach", (f: { id: string; type: string }) => { if (f.type !== "group") out.push(f); }); return out; };
  const LS = ["fr", "en", "de", "ar"];

  it("registries and the seeded store (first load: seed, migrations, reusable blocks)", () => {
    const r = both((s) => { call(s, "feLoad"); const x = sides[s]; return [x.FE_T, Object.keys(x.FE_PRE as object), x.FE_G, x.FE_TPL, [...(x.FE_WIDE as unknown as Set<string>)], [...(x.FE_NUM as unknown as Set<string>)], JSON.parse(mem.get("remotion-forms")!)]; });
    expect(r.port).toEqual(r.source);
    expect(Object.keys((r.source as [Record<string, unknown>])[0]).length).toBeGreaterThan(70);
  });

  it("every field type: new field, canvas HTML, preview control and answer summary in four languages", () => {
    const r = both((s) => {
      call(s, "feLoad"); const types = [...Object.keys(sides[s].FE_T as object), ...Object.keys(sides[s].FE_PRE as object), "blk:b1", "blk:b2"];
      return types.map((ty) => {
        const f = call(s, "feNewField", ty) as { id: string; type: string };
        const P = { vals: {}, uid: "u1" };
        return [ty, f, ...LS.map((L) => [call(s, "feFldHTML", f, L, 2), call(s, "feCtl", f, L, null), call(s, "feCtl", f, L, P)])];
      });
    });
    expect(r.port).toEqual(r.source);
  });

  it("preview: test-data prefill, every control with values, answer summaries, validation on every page", () => {
    const r = both((s) => {
      call(s, "feLoad"); const out: unknown[] = [];
      for (const id of ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"]) {
        (sides[s].FE as unknown as { pv: Record<string, unknown> }).pv = { dev: "desktop", step: 0, vals: {}, err: {}, test: false, done: false };
        const store = JSON.parse(mem.get("remotion-forms")!); store.cur = id; mem.set("remotion-forms", JSON.stringify(store)); call(s, "feLoad");
        const fe = FE(s); call(s, "fePvPrefill", true); const vals = fe.pv.vals;
        out.push(id, vals, leaves(s).map((f) => [f.id, ...LS.map((L) => [call(s, "feValStr", f, vals[f.id], L), call(s, "fePvFld", f, L, { vals, uid: "u" }, 2)])]));
        const d = st(s); for (let i = 0; i < d.pages.length; i++) { fe.pv.step = i; out.push(call(s, "fePvValidate"), fe.pv.err); }
        fe.pv.vals = {}; for (let i = 0; i < d.pages.length; i++) { fe.pv.step = i; out.push(call(s, "fePvValidate"), fe.pv.err); }
      }
      return out;
    });
    expect(r.port).toEqual(r.source);
  });

  it("formula engine: tokens, parse trees, references, evaluation, errors and cycles", () => {
    const exprs = ["1+2*3", "(1+2)*3", "2^3^2", "-4+10%3", "!0 + !5", "1<2 && 3>=3 || 0", "1==1 != 0", "round(3.14159, 2)", "arrondi(2.5)", "abs(-3)+sqrt(16)", "sum(1,2,3)+avg(2,4)+moy(1,3)", "min(4,2,8)*max(1,9)", "if(1>2, 10, 20)+si(0,1,2)",
      "{poids} / ({taille}/100)^2", "{age} * 2", "{nope} + 1", "{douleur.l} + {douleur.r}", "1/0", "unknown(2)", "1 +", "(", "\"txt\"", "'a'", "3 $ 4", "{a", "1..2", "", "  "];
    const r = both((s) => {
      call(s, "feLoad");
      const vals: Record<string, unknown> = {}; for (const f of leaves(s)) vals[f.id] = f.type === "number" ? "42" : f.type === "vitals" ? { w: "70", h: "175" } : "7";
      return exprs.map((e) => { let tk: unknown, ast: unknown, refs: unknown; try { tk = call(s, "feTok", e); } catch (x) { tk = "ERR " + (x as Error).message; } try { ast = call(s, "feParse", e); refs = [...(call(s, "feRefs", ast) as Set<string>)]; } catch (x) { ast = "ERR " + (x as Error).message; } return [e, tk, ast, refs, call(s, "feFormulaEval", e, vals), call(s, "feFormulaEval", e, {})]; });
    });
    expect(r.port).toEqual(r.source);
  });

  it("logic v2: conditions for every operator and value shape, visibility, scores, age, chart data, dependency analysis", () => {
    const ops = ["eq", "neq", "gt", "gte", "lt", "lte", "has", "filled", "empty"];
    const values = [undefined, "", "0", "1", "5", "12", ["0", "2"], [], { a: "1" }, "oui"];
    const r = both((s) => {
      call(s, "feLoad"); const L = leaves(s); const out: unknown[] = [];
      for (const src of L.slice(0, 14)) for (const op of ops) for (const v of values) for (const val of ["0", "5", "abc"]) out.push(call(s, "feCondOne", { src: src.id, op, val }, { [src.id]: v }));
      const g = { act: "show", mode: "any", conds: [{ src: L[0].id, op: "filled" }, { src: L[1].id, op: "eq", val: "x" }] };
      out.push(call(s, "feLogicNorm", g), call(s, "feLogicNorm", { act: "hide", src: L[0].id, op: "eq", val: "1" }), call(s, "feLogicNorm", null));
      out.push(call(s, "feCond", { logic: g }, {}), call(s, "feCond", { logic: g }, { [L[0].id]: "a" }), call(s, "feCond", { logic: { ...g, mode: "all" } }, { [L[0].id]: "a", [L[1].id]: "x" }));
      const vals: Record<string, unknown> = {}; L.forEach((f, i) => { vals[f.id] = String(i % 5); });
      for (const f of L) { out.push(call(s, "feVis", f, vals), call(s, "feVis", f, {}), call(s, "feNumOf", f, vals[f.id]), call(s, "feNumOf", f, { l: "3", r: "4" }, "l")); if (f.type === "score") out.push(call(s, "feScoreOf", f, vals), call(s, "feScoreOf", f, {})); if (f.type === "age") out.push(...LS.map((Lg) => call(s, "feAgeOf", f, { ...vals, [L.find((x) => x.type === "date")?.id ?? "x"]: "1988-03-12" }, Lg))); if (f.type === "chart") out.push(...LS.map((Lg) => call(s, "feChartData", f, vals, Lg))); }
      const d = st(s); for (const p of d.pages) for (const sec of p.sections) out.push((call(s, "feVisLeaves", sec.fields, vals) as unknown[]).length);
      out.push(call(s, "feDeps"));
      return out;
    });
    expect(r.port).toEqual(r.source);
  });

  it("CSV parsing, type guessing, slugs and keys, domains, widths, body-map labels, submission states", () => {
    const csvs = ["a,b,c\n1,2,3", "a;b;c\n\"x;y\";\"q\"\"uote\";3\n", "Question,Type,Options\nNom,text,\nDouleur,select,Faible|Moyenne|Forte\n\"Multi\nligne\",textarea,", "", "\n\n", "x\ty\n1\t2"];
    const labels = ["Nom", "Prénom", "Date de naissance", "E-mail", "Téléphone", "Adresse", "Signature", "Commentaires", "Douleur (0-10)", "Satisfaction", "Recommanderiez-vous ?", "Poids (kg)", "Taille", "Sexe", "Allergies", "Traitements en cours", "Antécédents", "Fichier joint", "Site web", "Montant", "Pourcentage", "Code postal", "Choisissez toutes celles qui s'appliquent", "Oui / Non", "Heure du rendez-vous", "Âge", "IMC"];
    const qs = ["bilan kiné épaule", "questionnaire de satisfaction", "PHQ-9 dépression anxiété", "consentement RGPD", "formulaire d'inscription entreprise", "évaluation ergothérapie", "check-list", "événement", "douleur lombaire", "", "Erstelle einen Fragebogen", "إنشاء استبيان"];
    const r = both((s) => {
      call(s, "feLoad"); const out: unknown[] = [];
      for (const c of csvs) out.push(call(s, "feCsvParse", c));
      for (const l of labels) for (const o of [0, 3, true, false]) for (const m of [false, true]) out.push(call(s, "feGuessType", l, o, m));
      for (const l of [...labels, "Ça va ?", "  spaces  ", "Ünïcödé — test"]) out.push(call(s, "feSlug", l), call(s, "feUniqKey", l), call(s, "feCap", l.toLowerCase()));
      for (const q of qs) out.push(call(s, "feDomOf", q));
      for (const f of leaves(s)) for (const k of ["d", "t", "m"]) for (const cols of [1, 2, 3, undefined]) out.push(call(s, "feSp", f, cols, k), call(s, "feAutoSp", f, cols, k));
      for (const id of ["f.head", "f.shoulder.L", "b.back.R", "f.knee.L", "b.neck"]) for (const L of LS) out.push(call(s, "feBmLabel", id, L));
      for (const x of ["new", "done", "review", "rejected"]) out.push(call(s, "feSubSt", x));
      return out;
    });
    expect(r.port).toEqual(r.source);
  });

  it("local AI planner and every template / creation-kind document", () => {
    const prompts = ["ajoute un champ email", "ajoute une section Antécédents", "rends le nom obligatoire", "traduis en anglais", "version bilingue allemand", "crée un questionnaire de satisfaction pour la kiné", "create a pain assessment form", "ajoute une règle de douleur", "supprime les champs vides", "build a psychology intake", "erstelle ein Formular für Physiotherapie", "?", "", "ajoute un tableau de suivi douleur et une signature"];
    const r = both((s) => {
      call(s, "feLoad"); const out: unknown[] = [];
      for (const q of prompts) out.push(q, call(s, "feAiLocal", q));
      const kinds = [...new Set([...(sides[s].FE_TPL as unknown as string[][]).map((x) => x[1]), "blank", "psy", "physio", "rehab", "csat", "checklist", "event", "general", "consent", "survey", "clinical", "patients", "unknown"])];
      for (const k of kinds) out.push(k, call(s, "feMakeDoc", k), call(s, "feMakeDoc", k, "Titre"));
      return out;
    });
    expect(r.port).toEqual(r.source);
  });

  it("autofill suggestions and the accessibility check on every seeded form", () => {
    const r = both((s) => {
      call(s, "feLoad"); const out: unknown[] = [];
      for (const id of ["f1", "f2", "f3", "f5"]) {
        const store = JSON.parse(mem.get("remotion-forms")!); store.cur = id; mem.set("remotion-forms", JSON.stringify(store)); call(s, "feLoad");
        (sides[s].FE as unknown as { pv: Record<string, unknown> }).pv = { dev: "desktop", step: 0, vals: {}, err: {}, test: false, done: false };
        for (const k of ["profile", "record", "paste"]) { try { call(s, "feAutofillSuggest", k, "Nom: Martin\nPrénom: Camille\nNé le 12/03/1988\nTél 06 12 34 56 78\ncamille@exemple.fr"); } catch (e) { out.push("ERR " + (e as Error).message); } out.push(k, (sides[s].FE as unknown as { af: unknown }).af); }
        out.push(call(s, "feA11y"));
      }
      return out;
    });
    expect(r.port).toEqual(r.source);
  });
});
