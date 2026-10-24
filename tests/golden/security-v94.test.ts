// @vitest-environment happy-dom
/** Catch-up slice S1 (v92 security of imports): src/lib/security gives the same result as the v94 code on hostile inputs. */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import * as ours from "@/lib/security";

const req = createRequire(import.meta.url);
const v94 = req(process.cwd() + "/tests/fixtures/v94/sec.v94.cjs") as typeof ours;

const HTML = [
  `<p onclick="alert(1)">a</p>`,
  `<img src=x onerror="alert(1)">`,
  `<a href="javascript:alert(1)">x</a>`,
  `<a href="java&#9;script:alert(1)">tab</a>`,
  `<a href=" JaVaScRiPt:alert(1)">case</a>`,
  `<svg><a xlink:href="javascript:alert(1)"><text>t</text></a></svg>`,
  `<svg><animate attributeName="href" to="javascript:alert(1)"/></svg>`,
  `<iframe srcdoc="<script>alert(1)</script>"></iframe><p>after</p>`,
  `<script>alert(1)</script><style>body{}</style><b>ok</b>`,
  `<form action="https://evil.example"><button formaction="x">Send</button><input value="v"></form>`,
  `<div style="background:url(javascript:alert(1))">s</div>`,
  `<div style="width:expression(alert(1))">e</div>`,
  `<img srcset="a.png 1x, javascript:alert(1) 2x" src="data:image/png;base64,AAAA">`,
  `<img src="data:text/html;base64,PHNjcmlwdD4=">`,
  `<a href="mailto:a@b.c">mail</a><a href="tel:+331">tel</a><a href="https://ok.example/a b">ok</a>`,
  `<object data="x.swf"></object><embed src="x"><meta http-equiv="refresh" content="0;url=javascript:1">`,
  `<math><mi xlink:href="javascript:alert(1)">m</mi></math>`,
  `<details open ontoggle="alert(1)"><summary>s</summary></details>`,
  `<p is="x-y">custom</p><base href="https://evil.example/">`,
];

describe("security of imports (v92) — same as v94", () => {
  it.each(HTML.map((h, i) => [i, h]))("secClean case %i", (_i, h) => {
    const a = ours.secClean(h);
    let b: string | null = null;
    try { b = v94.secClean(h); } catch { /* happy-dom cannot run replaceWith(...many) on a fragment; browsers can: checked by the E2E test */ }
    if (b !== null) expect(a).toBe(b);
    expect(a).not.toMatch(/on[a-z]+=|javascript:|<script|<iframe|srcdoc|<object|<embed|<meta|<base/i);
  });
  it("secUrl: allowed and refused protocols", () => {
    const urls = ["https://a.b/c d", "http://x", "mailto:a@b", "tel:1", "javascript:1", " java\tscript:1", "data:image/png;base64,A", "data:text/html,x", "blob:https://a/1", "vbscript:x", "/rel/path", "#anchor", "file:///etc/passwd"];
    for (const u of urls) for (const img of [false, true]) expect(ours.secUrl(u, img)).toBe(v94.secUrl(u, img));
    expect(ours.secUrl("javascript:alert(1)")).toBe("");
  });
  it("secFont, secColor, secLang", () => {
    for (const f of ["Arial", "Times New Roman", "x';}body{color:red", "<b>Inter</b>", "", null, "Noto Sans Arabic"]) expect(ours.secFont(f)).toBe(v94.secFont(f));
    for (const c of ["#fff", "#18a058", "red", "rgb(1,2,3)", "url(javascript:1)", "red;background:url(x)", "", null]) expect(ours.secColor(c)).toBe(v94.secColor(c));
    for (const l of ["fr", "en-GB", "ar", "x\" onload=1", "", null]) expect(ours.secLang(l)).toBe(v94.secLang(l));
  });
  it("secDoc cleans a hostile imported document like v94", () => {
    const mk = () => ({ title: "t", lang: "fr\" x=1", set: { font: "Inter'};x{", acc: "javascript:1", hcol: "#123456" },
      pages: [{ blocks: [{ type: "p", html: `<img src=x onerror=alert(1)>hi` }, { type: "img", src: "javascript:alert(1)" }, { type: "link", url: "https://ok.example", dir: "evil" }, { type: "hdr", logo: "data:image/png;base64,AA", font: "a;b{c}" }] }] });
    expect(JSON.stringify(ours.secDoc(mk()))).toBe(JSON.stringify(v94.secDoc(mk())));
    const d = ours.secDoc(mk()) as ReturnType<typeof mk>;
    expect(d.pages[0].blocks[0].html).not.toMatch(/onerror/);
    expect(d.pages[0].blocks[1].src).toBe("");
  });
  it("secCsv neutralises formula cells but keeps numbers", () => {
    for (const c of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\tx", "\rx", "-12", "+3.5", "12,5 %", "-1 000", "text", 42, -3, null, undefined, ""]) expect(ours.secCsv(c)).toBe(v94.secCsv(c));
    expect(ours.secCsv("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(ours.secCsv("-12")).toBe("-12");
  });
  it("secWrapPdf forces isEvalSupported:false on every getDocument call", () => {
    const seen: unknown[] = [];
    const lib = { getDocument: (o: unknown) => { seen.push(o); return { promise: Promise.resolve(null) }; }, GlobalWorkerOptions: { workerSrc: "" } };
    const w = { pdfjsLib: lib } as unknown as Window;
    ours.secWrapPdf(w);
    const W = (w as unknown as { pdfjsLib: typeof lib & { __sec?: number } }).pdfjsLib;
    expect(W.__sec).toBe(1);
    W.getDocument({ data: new Uint8Array(1), isEvalSupported: true });
    W.getDocument(new Uint8Array(2));
    expect(seen.every((o) => (o as { isEvalSupported?: boolean }).isEvalSupported === false)).toBe(true);
    expect(W.GlobalWorkerOptions).toBe(lib.GlobalWorkerOptions);
    ours.secWrapPdf(w); /* wrapping twice is a no-op */
    expect((w as unknown as { pdfjsLib: unknown }).pdfjsLib).toBe(W);
  });
});
