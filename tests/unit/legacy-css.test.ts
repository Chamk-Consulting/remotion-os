import { describe, it, expect } from "vitest";
import fs from "node:fs";
// A-05 acceptance: the split CSS files concatenate to exactly the source CSS (L6–L6855) and the L1 wrapper.
const SRC = fs.readFileSync("../source/Remotion_Desktop.html", "utf8").split("\n");
const parts = ["01-shell-core", "02-ai-desktop-os", "03-forms", "04-documents", "05-window-manager", "06-calculator", "07-billing", "08-hr-kit", "09-healthcare", "10-documents-word", "11-topbar-fit"];
const body = (f: string) => { const s = fs.readFileSync(`src/styles/legacy/${f}.css`, "utf8"); return s.slice(s.indexOf("\n") + 1).replace(/\n$/, ""); };
describe("legacy CSS", () => {
  it("is byte-identical to the source, in source order", () => {
    expect(parts.map(body).join("\n")).toBe(SRC.slice(5, 6855).join("\n"));
  });
  it("keeps the L1 wrapper reset", () => {
    expect(body("00-wrapper")).toBe(/<style>(.*?)<\/style>/.exec(SRC[0])![1]);
  });
  it("index imports every part in order", () => {
    const idx = fs.readFileSync("src/styles/legacy/index.css", "utf8");
    const order = [...idx.matchAll(/@import "\.\/([^"]+)\.css"/g)].map((m) => m[1]);
    expect(order).toEqual(["00-wrapper", ...parts]);
  });
});
