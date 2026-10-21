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
  it("returns #REF! instead of throwing", async () => {
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
