// @vitest-environment happy-dom
/** Documents product phases: dictionary completeness and the store's localStorage fallback. */
import { describe, it, expect } from "vitest";
import { PX_I18N } from "@/apps/documents/px-i18n";

describe("Documents product strings", () => {
  it("every dcx_ key exists, non-empty, in en / fr / de / ar", () => {
    const keys = Object.keys(PX_I18N.en);
    expect(keys.length).toBeGreaterThan(0);
    for (const l of ["fr", "de", "ar"] as const) {
      expect(Object.keys(PX_I18N[l]).sort()).toEqual([...keys].sort());
      for (const k of keys) expect(PX_I18N[l][k]?.trim().length, `${l}.${k}`).toBeGreaterThan(0);
    }
    for (const k of keys) expect(k.startsWith("dcx_"), k).toBe(true);
  });
});

describe("Documents store fallback (no IndexedDB)", () => {
  it("reads and writes remotion-docs in localStorage and reports success", async () => {
    const g = globalThis as unknown as { indexedDB?: unknown };
    const saved = g.indexedDB; delete g.indexedDB;
    try {
      const st = await import("@/apps/documents/store");
      await st.preloadStore();
      expect(st.storeReady()).toBe(true);
      expect(st.storeBackend()).toBe("localstorage");
      const r = await st.writeStore('{"v":1}');
      expect(r.ok).toBe(true);
      expect(st.readStore()).toBe('{"v":1}');
      expect(localStorage.getItem(st.DOCS_LS_KEY)).toBe('{"v":1}');
    } finally { if (saved !== undefined) g.indexedDB = saved; }
  });
});

describe("Formula engine: unknown table name (D-D16 fixed)", () => {
  /* the first import of the editor module (and, since phase 6, the Patients module it reads) takes a few seconds */
  it("returns #REF! instead of throwing", { timeout: 30_000 }, async () => {
    const P = (await import("@/apps/documents/documents")) as unknown as { RD: { tableCompute: (tb: unknown) => { value: (r: number, c: number) => unknown; display?: (r: number, c: number) => unknown } } };
    const tb = { id: "t1", type: "table", name: "Main", rows: [["A", "B"], ["1", "=Nowhere!A1"]] };
    let shown: unknown;
    expect(() => { const comp = P.RD.tableCompute(tb); shown = comp.display ? comp.display(1, 1) : comp.value(1, 1); }).not.toThrow();
    expect(String(shown)).toContain("#REF!");
  });
});

describe("PDF font subsetting (product phase 2)", () => {
  it("keeps glyph numbers, keeps used outlines, empties the rest, and stays a valid TrueType font", async () => {
    const fs = await import("node:fs"); const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const fontkit = require("../../public/vendor/fontkit-1.1.1/fontkit.umd.min.js") as { create: (b: Uint8Array) => { layout: (s: string) => { glyphs: { id: number; path: { commands: unknown[] } }[] }; getGlyph: (id: number) => { path: { commands: unknown[] } }; numGlyphs: number } };
    const { ttfSubset } = await import("@/apps/documents/pdf-text");
    for (const name of ["Inter_400Regular", "NotoSansArabic_400Regular", "NotoSansSymbols2_400Regular", "DejaVuSans"]) {
      const src = new Uint8Array(fs.readFileSync(`public/vendor/pdf-fonts/${name}.ttf`));
      const full = fontkit.create(src);
      const used = new Set(full.layout("Patient ≥ ✓ ☐ → مرحبا αβγ Ж").glyphs.map((g) => g.id));
      const out = ttfSubset(src, used);
      expect(out.length, name).toBeLessThan(src.length / 4);
      const sub = fontkit.create(out);
      expect(sub.numGlyphs, name).toBe(full.numGlyphs);
      for (const g of used) expect(sub.getGlyph(g).path.commands.length, `${name} glyph ${g}`).toBe(full.getGlyph(g).path.commands.length);
    }
  });
});

describe("Formula references follow inserted and deleted rows and columns", () => {
  it("shifts single cells and ranges, marks deleted cells #REF!, leaves strings and other tables alone", async () => {
    const { dcxShiftFormula: f } = await import("@/apps/documents/documents");
    const same = (q: string) => !q;
    // a row inserted above spreadsheet row 3
    expect(f("=SUM(B2:B4)+B5", "r", 3, 1, same)).toBe("=SUM(B2:B5)+B6");
    expect(f("=B2*2", "r", 3, 1, same)).toBe("=B2*2");
    // spreadsheet row 3 deleted
    expect(f("=B3+B4", "r", 3, -1, same)).toBe("=#REF!+B3");
    expect(f("=SUM(B2:B4)", "r", 3, -1, same)).toBe("=SUM(B2:B3)");
    expect(f("=SUM(B3:B3)", "r", 3, -1, same)).toBe("=SUM(#REF!)");
    // a column inserted before B (index 1); column C deleted
    expect(f("=A2+B2+$C$2", "c", 1, 1, same)).toBe("=A2+C2+$D$2");
    expect(f("=SUM(A2:D2)", "c", 2, -1, same)).toBe("=SUM(A2:C2)");
    // quoted text, function names and other tables are untouched
    expect(f('=CONCAT("B3",B3)', "r", 3, 1, same)).toBe('=CONCAT("B3",B4)');
    expect(f("=Other!B3+B3", "r", 3, 1, same)).toBe("=Other!B3+B4");
    expect(f("=ROUND(B3,1)", "r", 2, 1, (q) => q === "Vitals!" || !q)).toBe("=ROUND(B4,1)");
  });
});

describe("Table formulas exported as Word formula fields", () => {
  it("keeps what Word can compute, refuses the rest", async () => {
    const { dcxWordFormula: w } = await import("@/apps/documents/documents");
    expect(w("=SUM(B2:B3)")).toBe("=SUM(B2:B3)");
    expect(w("=AVG(B2:B4)*2")).toBe("=AVERAGE(B2:B4)*2");
    expect(w("=ROUND($B$2/3;1)")).toBe("=ROUND(B2/3,1)");
    expect(w("=Vitals!B2+1")).toBeNull();
    expect(w('=CONCAT("a",B2)')).toBeNull();
    expect(w("=MEDIAN(B2:B5)")).toBeNull();
    expect(w("12")).toBeNull();
  });
});
