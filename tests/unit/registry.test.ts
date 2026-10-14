import { describe, it, expect } from "vitest";
import { APPS, SOLO_KEYS, resolveApp } from "@/apps/registry";
import raw from "@/apps/registry.data.json";
describe("app registry", () => {
  it("covers every OS_OPEN key of the source", () => { for (const k of raw.OS_OPEN_KEYS) expect(resolveApp(k), k).not.toBeNull(); });
  it("has exactly the 11 OS_SOLO keys", () => { expect([...SOLO_KEYS].sort()).toEqual(Object.keys(raw.OS_SOLO).sort()); });
  it("resolves source aliases like osSoloKey", () => { for (const [a, k] of Object.entries(raw.soloAliases)) expect(resolveApp(a)?.key).toBe(k); });
  it("resolves camelCase keys (fix D-B01)", () => { expect(resolveApp("hrPeople")?.key).toBe("hrPeople"); });
  it("gives every window app a dock key (fix D-B05) and never falls back to the launcher (fix D-B06)", () => {
    for (const a of APPS) expect(a.dockKey).toBeTruthy(); expect(resolveApp("unknown-app")).toBeNull();
  });
  it("has a glyph for every app", () => { for (const a of APPS) expect(a.glyph, a.key).not.toBeNull(); });
});
