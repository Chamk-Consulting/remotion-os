/**
 * A-04 · Golden-test harness (ADR-12). Executes selected line ranges of the ORIGINAL source in a Node VM with stubbed
 * browser/OS globals, so a TypeScript port can be asserted equal to the source function on the same fixtures.
 * Usage: const vm = loadSource([[21068, 21372]], { lang: "en" }); vm.call("caEval", "2^10/3")
 */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const SRC = path.resolve(__dirname, "../../../source/Remotion_Desktop.html");
let LINES: string[] | null = null;
const lines = () => (LINES ??= fs.readFileSync(SRC, "utf8").split("\n"));

export function sourceLines(a: number, b = a): string { return lines().slice(a - 1, b).join("\n"); }

function stubs(extra: Record<string, unknown>) {
  const store: Record<string, string> = {};
  const el = (): Record<string, unknown> => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, setAttribute() {}, addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] });
  return {
    console, Intl, Math, Date, JSON, BigInt, TextEncoder, TextDecoder, structuredClone, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = String(v); }, removeItem: (k: string) => { delete store[k]; } },
    document: { addEventListener() {}, documentElement: el(), body: el(), createElement: el, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
    addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), requestAnimationFrame: () => 0,
    lang: "en", t: (k: string) => k, toast() {}, OSW: {}, lkRM: () => true,
    ...extra,
  };
}

export function loadSource(ranges: [number, number][], extra: Record<string, unknown> = {}) {
  const ctx = vm.createContext(stubs(extra));
  for (const [a, b] of ranges) vm.runInContext(sourceLines(a, b), ctx, { filename: `Remotion_Desktop.html:L${a}-L${b}` });
  return {
    ctx,
    get: <T = unknown>(expr: string) => vm.runInContext(expr, ctx) as T,
    call: <T = unknown>(fn: string, ...args: unknown[]) => (vm.runInContext(fn, ctx) as (...a: unknown[]) => T)(...args),
  };
}
