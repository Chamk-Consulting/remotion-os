/** Slice 13: Billing's integer money core and the shared Forms store (pure functions, run in node with a stub DOM). */
import { beforeEach, describe, expect, it } from "vitest";

const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() },
  document: { documentElement: { lang: "en", dir: "ltr" } },
});

describe("billing money core (source L22599–L22657)", async () => {
  const B = await import("@/apps/billing/billing");
  it("rounds halves away from zero, with no floating point", () => {
    expect([B.biDivRound(5, 2), B.biDivRound(-5, 2), B.biDivRound(7, 3), B.biDivRound(-7, 3)]).toEqual([3, -3, 2, -2]);
    expect(B.biMulRound(1999, 550, 10000)).toBe(110);
    expect(B.biMulRound(Number.MAX_SAFE_INTEGER, 3, 7)).toBe(Math.round((Number.MAX_SAFE_INTEGER * 3) / 7));
    expect(() => B.biDivRound(1, 0)).toThrow(B.BiErr);
  });
  it("parses typed amounts into minor units", () => {
    expect([B.biParseMoney("1 234,5"), B.biParseMoney("€12.30"), B.biParseMoney("-3"), B.biParseMoney(""), B.biParseQty("1,5")]).toEqual([123450, 1230, -300, null, 1500]);
    expect(() => B.biParseMoney("1,234")).toThrow(B.BiErr);
    expect(B.biParseMoney("1,230")).toBe(123);
    expect(() => B.biParseMoney("abc")).toThrow(B.BiErr);
  });
  it("computes line and document totals per VAT rate", () => {
    expect(B.biLine({ id: "l", desc: "x", qty: 1500, unit: 3333, dp: 1000, tax: "exo" })).toEqual({ gross: 5000, disc: 500, net: 4500, bp: 0, tax: 0, total: 4500 });
    const t = B.biTotals({ lines: [{ id: "a", desc: "a", qty: 1000, unit: 1000, dp: 0, tax: "exo" }, { id: "b", desc: "b", qty: 2000, unit: 250, dp: 0, tax: "exo" }] });
    expect([t.gross, t.net, t.total, t.rates.length]).toEqual([1500, 1500, 1500, 1]);
    expect(B.biM(123450, "EUR", { plain: true })).toBe("1234.50");
    expect(B.biM(-5, "TND", { plain: true })).toBe("−0.005");
  });
});

describe("forms store (source L12400–L12508, L13866–L13872, L14340)", async () => {
  const S = await import("@/apps/forms/store");
  beforeEach(() => mem.clear());
  it("seeds the sample forms, applies the load-time migrations and saves the reusable blocks on first read", () => {
    S.feLoad();
    const st = S.feS!;
    expect(st.forms.map((f) => f.id)).toEqual(["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"]);
    expect([st.g1, st.g2, st.pv.cv]).toEqual([1, 1, 1]);
    expect((st.blocks as { id: string }[]).map((b) => b.id)).toEqual(["b1", "b2", "b3", "b4"]);
    expect(JSON.parse(mem.get("remotion-forms")!).blocks.length).toBe(4);
    const fields: string[] = []; S.feWalk2(st.docs.f1, (f) => { fields.push(f.type); });
    expect(fields).toContain("table");
    expect(fields).toContain("group");
  });
});
