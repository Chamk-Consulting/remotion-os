// @vitest-environment happy-dom
/**
 * Slice 19 golden test: the Documents port gives the same results as the source's own code. The Documents region (source
 * L14341–L20842, without the OS integration L15405–L15420 and the first-open wrapper L20275) is evaluated from
 * Remotion_Desktop.html beside the port, each side with its own storage and the same pseudo-random sequence. Compared:
 * the seeded store, every template document (16 essentials, the remotion-documents gallery, every field-document
 * family and variant), every block type a user can insert, block text, statistics, numbering, condition results and the
 * quality check on each of those documents, and the bundled engine's Markdown, plain-text, HTML and table-formula code.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const stores = { source: new Map<string, string>(), port: new Map<string, string>() };
let mem = stores.source;
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() } });
document.documentElement.lang = "en";
const NOW = Date.UTC(2026, 9, 14, 9, 30);
Date.now = () => NOW;
function seed() { let x = 246813579; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }

const html = fs.readFileSync(path.resolve(__dirname, "../../../source/Remotion_Desktop.html"), "utf8").split("\n");
const at = (re: RegExp, from = 0) => { const i = html.findIndex((l, k) => k >= from && re.test(l)); if (i < 0) throw new Error("not found: " + re); return i; };
const a = at(/^\/\* =+ Documents — clinical document editor =+ \*\/$/, 12000), os = at(/^\/\* -+ window \+ OS integration -+ \*\/$/, a), osEnd = at(/^\{const _osRelabel2=osRelabel;/, os), z = at(/^\/\* ===== v55 · window manager/, a);
const SRC = html.slice(a, os).concat(html.slice(osEnd + 1, z)).filter((l) => !l.startsWith("{const _o=dcOpen;dcOpen=function(){")).join("\n");
const EXPORTS = "DC,DC_T,DC_TPL,RD,RDT,dcLoad,dcDoc,dcSeedDoc,dcFromTpl,dcNewBlock,dcBlockText,dcStats,dcNumbers,dcCondOk,dcEach,dcField,dcCheck";

type Side = Record<string, unknown>;
type Fn = (...x: unknown[]) => unknown;

describe("documents = source (golden)", async () => {
  const core = await import("@/lib/i18n/core");
  const langs = await import("@/lib/i18n/langs");
  const F = await import("@/apps/forms/forms");
  const G = { I18N: core.I18N, LANGS: langs.LANGS, translate: core.translate, formatNumber: core.formatNumber, FEI: F.FEI, feBmLabel: F.feBmLabel, feBodySVG: F.feBodySVG, feLoadScript: F.feLoadScript };
  // The source's globals (L7470–L7509, L11239, L11650): language, dictionary, formatting, menus, the Forms helpers it borrows.
  const S = new Function("G", "var lang=\"en\";const {I18N,LANGS,FEI,feBmLabel,feBodySVG,feLoadScript}=G;const t=(k,v)=>G.translate(lang,k,v||{});const nf=n=>G.formatNumber(lang,n);const loc=()=>LANGS[lang].locale;" +
    "const DKE=s=>String(s??\"\").replace(/[&<>\"]/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\"})[c]);const toast=()=>{};const osMenu=()=>{};const osMax=()=>{};const OSW={};const lkRM=()=>true;\n" +
    SRC + "\nreturn {" + EXPORTS + "};")(G) as Side;
  const P = (await import("@/apps/documents/documents")) as unknown as Side;
  const sides: Record<string, Side> = { source: S, port: P };
  const call = (side: string, f: string, ...x: unknown[]) => (sides[side][f] as Fn)(...x);
  const res = (side: string, fn: () => unknown) => { mem = stores[side as "source" | "port"]; seed(); try { return JSON.parse(JSON.stringify(fn() ?? null)); } catch (e) { return "ERR " + (e as Error).message; } };
  const both = (fn: (side: string) => unknown) => ({ source: res("source", () => fn("source")), port: res("port", () => fn("port")) });
  type Tpl = [string, ...unknown[]];
  const tplIds = (s: string) => { const x = sides[s]; const RDx = x.RD as { BUILTIN_TPL: { id: string }[] }; const RDTx = x.RDT as { id: string; variants: { k: string }[] }[];
    return [...(x.DC_TPL as Tpl[]).map((t) => t[0]), "physio_eval", ...RDTx.flatMap((f) => f.variants.map((v) => `fd:${f.id}:${v.k}`)), ...RDx.BUILTIN_TPL.map((t) => "rd:" + t.id)]; };

  it("seeded store on first load", () => {
    const r = both((s) => { call(s, "dcLoad"); return JSON.parse(mem.get("remotion-docs") || "null"); });
    expect(r.port).toEqual(r.source);
    expect(Object.keys((r.source as { docs: object }).docs).length).toBeGreaterThan(3);
  });

  it("every template document, and its text, statistics, numbering, conditions and quality check", () => {
    const r = both((s) => { call(s, "dcLoad"); return tplIds(s).map((id) => { const d = call(s, "dcFromTpl", id) as { pages: { blocks: unknown[] }[]; lang?: string };
      const blocks: unknown[] = []; call(s, "dcEach", (b: unknown) => { blocks.push([call(s, "dcBlockText", b, d), call(s, "dcCondOk", b, d)]); }, d);
      return [id, d, blocks, call(s, "dcStats", d), call(s, "dcNumbers", d), call(s, "dcCheck", d)]; }); });
    expect(r.port).toEqual(r.source);
    expect((r.source as unknown[]).length).toBeGreaterThan(100);
  });

  it("every insertable block type, and the patient / practice fields", () => {
    const r = both((s) => { call(s, "dcLoad"); const types = Object.keys(sides[s].DC_T as object);
      return [types.map((ty) => [ty, call(s, "dcNewBlock", ty)]), ["pt.nom", "pt.prenom", "pt.full", "pt.dob", "pt.dobAge", "pt.dossier", "pt.nir", "doc.date", "doc.prat", "doc.clinic", "doc.ref", "e.patient.nom", "nope"].map((k) => [k, call(s, "dcField", k)])]; });
    expect(r.port).toEqual(r.source);
  });

  it("bundled engine: Markdown both ways, plain text, HTML import, table formulas, identifier checks", () => {
    const md = "# Bilan\n\nPatient **Jean** _Dupont_, suivi `kiné`.\n\n- douleur\n- raideur\n  - matin\n\n1. étirements\n2. renforcement\n\n> Citation\n\n| Mesure | J0 | J30 |\n|---|---|---|\n| EVA | 7 | 3 |\n\n---\n\n[lien](https://exemple.fr)";
    const htm = "<h1>Titre</h1><p>Un <b>paragraphe</b> <i>riche</i> avec <a href=\"https://x.fr\">lien</a>.</p><ul><li>un</li><li>deux</li></ul><table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table><blockquote>q</blockquote>";
    const r = both((s) => { const RDx = sides[s].RD as Record<string, Fn>;
      const docs = [RDx.markdownToDoc(md, "test"), RDx.plainToDoc("Ligne 1\nLigne 2\n\nParagraphe 2\n• puce\n1) numéro", "plain"), RDx.importHtmlText(htm, "page")];
      const tb = { id: "tb1", type: "table", name: "T", rows: [["Séance", "EVA", "Score"], ["1", "7", "=B2*10"], ["2", "5", "=B3*10"], ["Total", "=SUM(B2:B3)", "=AVERAGE(C2:C3)"], ["Max", "=MAX(B2:B3)", "=IF(B2>B3,\"mieux\",\"pire\")"], ["Err", "=B9/0", "=FOO(1)"]] };
      return [docs, docs.map((d) => { try { return RDx.docToMarkdown((d as { doc?: unknown }).doc || d); } catch (e) { return "ERR " + (e as Error).message; } }), (() => { const comp = RDx.tableCompute(tb) as { value: (r: number, c: number) => unknown; display?: (r: number, c: number) => unknown }; return tb.rows.map((row, ri) => row.map((_, ci) => { try { return [comp.value(ri, ci), comp.display?.(ri, ci)]; } catch (e) { return "ERR " + (e as Error).message; } })); })(),
        ["185057518101234", "1850575181012", "2850575181012 87", "185057518101233"].map((x) => RDx.nirOK(x)), ["85073003328", "85073003327", "00000000000"].map((x) => RDx.nissOK(x))]; });
    expect(r.port).toEqual(r.source);
  });
});
