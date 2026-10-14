import { describe, it, expect } from "vitest";
import { translate, L4, formatNumber, I18N } from "@/lib/i18n/core";
import manifest from "@/locales/manifest.json";
describe("i18n (source semantics)", () => {
  it("has the runtime key counts", () => { for (const l of ["en", "fr", "de", "ar"] as const) expect(Object.keys(I18N[l]).length).toBe(manifest.counts[l]); });
  it("falls back to EN, then to the key", () => {
    expect(translate("fr", "__missing__")).toBe("__missing__");
    const enOnly = Object.keys(I18N.en).find((k) => !(k in I18N.fr));
    if (enOnly) expect(translate("fr", enOnly)).toBe(I18N.en[enOnly]);
  });
  it("replaces only the first occurrence of a placeholder (D-A21 reproduced)", () => {
    I18N.en.__t = "{n}/{n}"; expect(translate("en", "__t", { n: 3 })).toBe("3/{n}"); delete I18N.en.__t;
  });
  it("L4 picks fr|en|de|ar with fallbacks", () => {
    expect(L4("fr", "a|b|c|d")).toBe("a"); expect(L4("ar", "a|b|c|d")).toBe("d"); expect(L4("de", "a|b")).toBe("b"); expect(L4("en", "plain")).toBe("plain");
  });
  it("formats numbers with the language locale", () => { expect(formatNumber("fr", 1234.5)).toBe(new Intl.NumberFormat("fr-FR").format(1234.5)); });
});
