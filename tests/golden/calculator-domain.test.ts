/**
 * Slice 17 golden test: the Calculator port gives the same results as the source's own code. The whole Calculator
 * region (source L21068–L22563) is evaluated from Remotion_Desktop.html beside the port, and every tool page is run with
 * its default inputs, each of its examples and every option of its select / segmented fields; the result cards (or the
 * error messages) must be equal. The engine is checked on curated expressions (operators, functions, units, constants,
 * errors — including the reproduced negative-temperature defect D-E01), formatting settings and every unit conversion.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() },
  document: { documentElement: { lang: "en", dir: "ltr" }, addEventListener: () => {}, querySelector: () => null },
  matchMedia: () => ({ matches: false }),
});

const html = fs.readFileSync(path.resolve(__dirname, "../../../source/Remotion_Desktop.html"), "utf8").split("\n");
const at = (re: RegExp) => { const i = html.findIndex((l) => re.test(l)); if (i < 0) throw new Error("not found: " + re); return i; };
const SRC = html.slice(at(/^\/\* ===== v58 · Calculator & scientific tools — engine/), at(/^\/\* ===== v58 · Calculator & scientific tools — OS integration/)).join("\n");
type Fn = (...a: never[]) => unknown;
// The source runs with its globals: lang, t, nf (L7507–L7509), OSW and toast (only used by window code).
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const S = new Function("const lang=\"en\";const t=k=>k;const nf=n=>new Intl.NumberFormat(\"en-US\").format(n);const OSW={};const toast=()=>{};\n" + SRC +
  "\nreturn {CA,CA_T,CA_UD,CA_CATS,CA_CONSTS,caSt,caSet,caUnitsBuild,caUnitsOf,caEval,caFmt,caFmtQ,caMoney,caNumIn,caConvert,caConstGet,caVals,caCtx,caErrMsg};")() as Record<string, never>;

/** Same pseudo-random sequence on both sides (dice, sampling, password tools). */
function seed() { let x = 123456789; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
const NOW = Date.UTC(2026, 9, 14, 9, 30);
Date.now = () => NOW;

describe("calculator = source (golden)", async () => {
  const P = (await import("@/apps/calculator/calculator")) as unknown as Record<string, never>;
  const sides = { source: S, port: P } as Record<string, Record<string, never>>;
  const call = (side: string, f: string, ...a: unknown[]) => (sides[side][f] as unknown as Fn)(...(a as never[]));
  /** Run a value-returning step on one side, the error message standing in for a throw. */
  const res = (side: string, fn: () => unknown) => { seed(); try { return JSON.parse(JSON.stringify(fn(), (_k, v) => (typeof v === "bigint" ? v.toString() + "n" : v)) ?? "null"); } catch (e) { return "ERR " + call(side, "caErrMsg", e); } };
  const both = (fn: (side: string) => unknown) => ({ source: res("source", () => fn("source")), port: res("port", () => fn("port")) });
  const reset = () => { mem.clear(); for (const s of Object.values(sides)) { (s.CA as unknown as { st: unknown; vals: unknown }).st = null; (s.CA as unknown as { vals: Record<string, unknown> }).vals = {}; call(s === S ? "source" : "port", "caUnitsBuild"); } };

  it("registry: same tools, sections, fields and options", () => {
    reset();
    const shape = (side: string) => Object.values(sides[side].CA_T as Record<string, { id: string; sec: string; n: string; f?: { k: string; ty?: string; o?: unknown }[]; ex?: unknown[]; page?: unknown; hidden?: boolean }>)
      .map((d) => [d.id, d.sec, d.n, !!d.page, !!d.hidden, (d.f || []).map((f) => [f.k, f.ty, JSON.stringify(f.o ?? null)]), (d.ex || []).length]);
    const r = both(shape);
    expect(r.port).toEqual(r.source);
    expect((r.source as unknown[]).length).toBeGreaterThan(120);
  });

  it("every generic tool: defaults, examples and every select / segment option", () => {
    reset();
    const tools = Object.values(S.CA_T as Record<string, { id: string; run?: unknown; f?: { k: string; ty?: string; o?: [string, string][] }[]; ex?: { v: Record<string, string> }[] }>).filter((d) => d.run);
    let runs = 0;
    for (const d of tools) {
      const variants: Record<string, unknown>[] = [{}];
      (d.ex || []).forEach((e) => variants.push(e.v));
      for (const f of d.f || []) if ((f.ty === "sel" || f.ty === "seg") && Array.isArray(f.o)) for (const [v] of f.o) variants.push({ [f.k]: v });
      for (const extra of variants) {
        const run = (side: string) => {
          const s = sides[side]; const D = (s.CA_T as Record<string, { run: (c: unknown) => unknown }>)[d.id];
          const CA = s.CA as unknown as { vals: Record<string, unknown> }; delete CA.vals[d.id];
          const v = Object.assign(call(side, "caVals", D) as object, extra);
          return D.run(call(side, "caCtx", D, v));
        };
        const r = both(run); runs++;
        expect(r.port, `${d.id} ${JSON.stringify(extra)}`).toEqual(r.source);
      }
    }
    expect(runs).toBeGreaterThan(300);
  });

  it("date tools on century years, leap days, month ends and time-zone edges", () => {
    reset();
    const cases: [string, Record<string, unknown>][] = [
      ["ddiff", { a: "1900-02-28", b: "2000-03-01" }], ["ddiff", { a: "2000-02-29", b: "2100-03-01", inc: true }], ["ddiff", { a: "2026-10-14", b: "2024-02-29" }],
      ["age", { b: "2000-02-29", r: "2026-02-28" }], ["age", { b: "1900-03-01", r: "2100-02-28" }], ["age", { b: "2026-01-31", r: "2026-03-01" }],
      ["cal", { d: "1900-02-28", n: "1", u: "d" }], ["cal", { d: "2000-02-29", n: "1", u: "y" }], ["cal", { d: "2100-01-31", n: "1", u: "m" }], ["cal", { d: "2026-12-31", n: "-400", u: "y" }],
      ["work", { m: "count", a: "2026-12-24", b: "2027-01-04" }], ["work", { m: "add", a: "2026-02-27", n: "3" }],
      ["dur", { a: "2026-03-29T01:30", b: "2026-03-29T03:30" }], ["unix", { m: "dt", t: "2000-02-29T12:00" }], ["unix", { m: "ts", x: "4102444800" }],
      ["tz", { t: "2026-03-29T02:30", a: "Europe/Paris", b: "America/New_York" }], ["tz", { t: "2026-10-25T02:30", a: "Europe/Paris", b: "UTC" }],
    ];
    for (const [id, extra] of cases) {
      const r = both((side) => { const s = sides[side]; const D = (s.CA_T as Record<string, { run: (c: unknown) => unknown }>)[id]; delete (s.CA as unknown as { vals: Record<string, unknown> }).vals[id];
        return D.run(call(side, "caCtx", D, Object.assign(call(side, "caVals", D) as object, extra))); });
      expect(r.port, `${id} ${JSON.stringify(extra)}`).toEqual(r.source);
    }
  });

  it("engine: expressions, functions, units, constants and errors (incl. reproduced D-E01)", () => {
    reset();
    const ex = ["1+2*3", "2^3^2", "-2^2", "10 mod 3", "-7 mod 3", "5!", "170!", "171!", "50%", "3²+4³", "√16", "2(3+4)", "2pi", "sin(90)", "cos(180)", "tan(90)", "asin(2)", "atan2(1,1)",
      "log(1000)", "log(8,2)", "ln(0)", "root(-27,3)", "root(-16,4)", "nCr(52,5)", "nPr(10,3)", "gcd(84,126,210)", "lcm(4,6)", "round(2.345,2)", "max()", "hypot(3,4)", "normcdf(1.96)",
      "1/0", "0^-1", "(-8)^(1/3)", "1e308*10", "1_000_000*3", "1.2.3", "(1+2", "1+2)", "a=5", "ans", "x", "@c", "@NA*@kB", "@nope", "sin", "foo(1)", "sin(1,2)", "2 3",
      "5[km] to [mi]", "3[ft]+2[in]", "100[km/h] to [m/s]", "1[kg]*2", "2[m]*3[m]", "6[m]/2[m]", "5[m]+2[kg]", "-5[C]", "-40[°C] to [°F]", "-273.15[°C]", "500[mg/dL] to [g/L]", "1[L/100km] to [mpg US]",
      "37[C] to [F]", "1[atm] to [Pa]", "deg(pi)", "rad(180)", "90deg", "1rad", "100grad", "1 to [m]", "[m]", "5[xyz]"];
    for (const ang of ["deg", "rad", "grad"]) {
      for (const s of Object.values(sides)) (call(s === S ? "source" : "port", "caSet") as { ang: string }).ang = ang;
      for (const e of ex) { const r = both((side) => { const v = call(side, "caEval", e, { vars: {}, ans: 42 }); return [call(side, "caFmt", v), (v as { q?: number })?.q ? call(side, "caFmtQ", v, { plain: true }) : null]; }); expect(r.port, `${ang} ${e}`).toEqual(r.source); }
    }
  });

  it("formatting: notation, significant digits, decimals, grouping, money, numeric input", () => {
    reset();
    const xs = [0, 1, -1, 0.1 + 0.2, 1 / 3, 123456.789, -9876543.21, 1e15, 1.5e-8, 6.02214076e23, 2 ** 53, 0.5, 2.5, -2.5, 1.005, NaN, Infinity, -Infinity];
    const cfgs = [{}, { nt: "fix", dp: 2 }, { nt: "sci", sig: 5 }, { nt: "eng", sig: 6 }, { sig: 3 }, { plain: true }, { grp: " " }];
    for (const set of [{ dec: "auto", grp: "auto", round: "halfup" }, { dec: ",", grp: "space", round: "halfeven" }, { dec: ".", grp: "none", round: "halfup" }]) {
      for (const s of Object.values(sides)) Object.assign(call(s === S ? "source" : "port", "caSet") as object, set);
      for (const x of xs) for (const o of cfgs) { const r = both((side) => call(side, "caFmt", x, o)); expect(r.port).toEqual(r.source); }
      for (const x of xs.filter(Number.isFinite)) { const r = both((side) => call(side, "caMoney", x, "EUR")); expect(r.port).toEqual(r.source); }
      for (const t of ["1,5", "1.234,5", "1,234.5", "12 345", "2*3", "1e3", "abc", "", "1,234"]) { const r = both((side) => call(side, "caNumIn", t)); expect(r.port, t).toEqual(r.source); }
    }
  });

  it("every unit conversion and every constant", () => {
    reset();
    const cats = S.CA_CATS as unknown as string[];
    let n = 0;
    for (const cat of cats) {
      const us = (call("source", "caUnitsOf", cat) as { id: string }[]).map((u) => u.id);
      for (const a of us) for (const b of us) for (const v of [1, -3.5, 1234.5]) {
        const r = both((side) => { const U = call(side, "caUnitsOf", cat) as { id: string }[]; return call(side, "caConvert", v, U.find((u) => u.id === a), U.find((u) => u.id === b)); });
        expect(r.port, `${cat} ${v} ${a}→${b}`).toEqual(r.source); n++;
      }
    }
    expect(n).toBeGreaterThan(5000);
    for (const c of S.CA_CONSTS as unknown as [string][]) { const r = both((side) => call(side, "caConstGet", c[0])); expect(r.port).toEqual(r.source); }
  });
});
