import { describe, it, expect } from "vitest";
import { loadSource } from "./source-vm";
import { L4 } from "@/lib/i18n/core";
import { PREPAINT } from "@/lib/prepaint";

describe("golden harness", () => {
  it("runs a source function: L4 (L21374) equals the port for every language", () => {
    for (const lang of ["fr", "en", "de", "ar"] as const) {
      const src = loadSource([[21374, 21374]], { lang });
      for (const s of ["a|b|c|d", "a|b", "plain", "|b||"]) expect(L4(lang, s)).toBe(src.call("L4", s));
    }
  });
  it("pre-paint script is valid JS", () => { expect(() => new Function(PREPAINT)).not.toThrow(); });
});
