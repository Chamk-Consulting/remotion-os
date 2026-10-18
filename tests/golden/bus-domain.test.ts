// @vitest-environment happy-dom
/**
 * Slice 20 golden test: the healthcare integration-event bus (`remotion-bus`, source L24472–L24483) behaves exactly as
 * the source's own code. The bus region is evaluated from Remotion_Desktop.html beside the port (src/apps/health/rm.ts),
 * each with its own storage, the same clock and the same pseudo-random sequence. Compared after each scenario: every
 * handler call (consumer, event type, key, attempt), the persisted bus (`remotion-bus`), the in-memory retry counters and
 * the return values. Scenarios: idempotent emit (keyed, repeated, keyless), dispatch order (typed consumers then "*"),
 * per-consumer done lists, the retry schedule (400 ms × 3ⁿ, three retries, failure log), catch-up after a reload,
 * cross-tab delivery through the storage event, trimming (400 events, 600 done keys, 100 failures), the stale helper,
 * and the state another tab sees while a handler runs (D-H18, cross-tab double processing: reproduced). A static check
 * compares every producer call site (event type and whether it passes an idempotency key) with the source's (D-H06,
 * D-H07: reproduced).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const stores = { source: new Map<string, string>(), port: new Map<string, string>() };
let mem = stores.source;
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, get length() { return mem.size; } } });
const NOW = Date.UTC(2026, 9, 14, 9, 30);
function seed() { let x = 135792468; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }

const ROOT = path.resolve(__dirname, "../../..");
const html = fs.readFileSync(path.join(ROOT, "source/Remotion_Desktop.html"), "utf8").split("\n");
const at = (re: RegExp, from = 0) => { const i = html.findIndex((l, k) => k >= from && re.test(l)); if (i < 0) throw new Error("not found: " + re); return i; };
const a = at(/^const RM_BUS_KEY="remotion-bus"/, 24000), z = at(/^const rmStale=/, a);
const BUS_SRC = html.slice(a, z + 1).join("\n");

type Ev = { key: string; type: string; seq: number; p: Record<string, unknown> };
type Api = {
  RM: { bus: unknown; subs: Record<string, unknown[]>; sh: unknown; retry: Record<string, number> };
  rmEmit: (type: string, p?: Record<string, unknown> | null, o?: Record<string, unknown>) => Ev | null;
  rmOn: (type: string, consumer: string, fn: (ev: Ev) => void) => void;
  rmDispatch: (ev: Ev) => void; rmCatchUp: () => void; rmBusSt: () => { seq: number; ev: Ev[]; done: Record<string, string[]>; fail: unknown[] };
  rmBusSave: () => void; rmStale: (a: unknown, v: unknown) => boolean; storage: (key: string) => void;
};

describe("healthcare event bus = source (golden)", async () => {
  beforeAll(() => { vi.useFakeTimers({ now: NOW, toFake: ["Date", "setTimeout", "clearTimeout"] }); vi.spyOn(console, "warn").mockImplementation(() => {}); });
  afterAll(() => { vi.useRealTimers(); });

  // Source side: the bus region with its storage listener captured (it is a classic script listening on window).
  const srcListeners: ((e: { key: string }) => void)[] = [];
  const S = new Function("addEventListener", BUS_SRC + "\nreturn {RM,rmEmit,rmOn,rmDispatch,rmCatchUp,rmBusSt,rmBusSave,rmStale};")(
    (type: string, fn: (e: { key: string }) => void) => { if (type === "storage") srcListeners.push(fn); }) as Api;
  S.storage = (key) => srcListeners.forEach((f) => f({ key }));
  const P = (await import("@/apps/health/rm")) as unknown as Api;
  P.storage = (key) => { const e = new Event("storage") as Event & { key: string }; Object.defineProperty(e, "key", { value: key }); window.dispatchEvent(e); };
  const sides: Record<"source" | "port", Api> = { source: S, port: P };

  /** Runs one scenario on each side from a clean state and returns everything observable. */
  const run = (fn: (x: Api, log: unknown[]) => unknown) => {
    const out: Record<string, unknown> = {};
    for (const side of ["source", "port"] as const) {
      const x = sides[side]; mem = stores[side]; mem.clear(); seed(); vi.setSystemTime(NOW); vi.clearAllTimers();
      x.RM.bus = null; x.RM.subs = {}; x.RM.retry = {};
      const log: unknown[] = []; let ret: unknown;
      try { ret = fn(x, log); } catch (e) { ret = "ERR " + (e as Error).message; }
      out[side] = JSON.parse(JSON.stringify({ ret, log, bus: JSON.parse(mem.get("remotion-bus") || "null"), retry: x.RM.retry }));
    }
    return out as { source: unknown; port: unknown };
  };
  const rec = (log: unknown[], c: string) => (ev: Ev) => { log.push([c, ev.type, ev.key, ev.seq, ev.p]); };

  it("emit: idempotent on the key, keyless events get a random key, typed consumers run before \"*\"", () => {
    const r = run((x, log) => {
      x.rmOn("*", "audit", rec(log, "audit")); x.rmOn("appointment.completed", "billing", rec(log, "billing")); x.rmOn("appointment.completed", "cabinet", rec(log, "cabinet"));
      const e1 = x.rmEmit("appointment.completed", { appt: "a1" }, { key: "completed-a1-1-2", src: "calendar", ref: "a1", ver: 1 });
      const e2 = x.rmEmit("appointment.completed", { appt: "a1" }, { key: "completed-a1-1-2" });
      vi.advanceTimersByTime(5);
      const e3 = x.rmEmit("practitioner.updated", { pr: "pr1", active: true });
      const e4 = x.rmEmit("practitioner.updated", { pr: "pr1", active: true });
      const e5 = x.rmEmit("visit.waiting", null, { key: "visit-a1-waiting-1", ver: 0 });
      return [e1, e2, e3, e4, e5];
    });
    expect(r.port).toEqual(r.source);
  });

  it("retries: 400 ms × 3ⁿ, three retries then stop, every failure logged; a later success clears the counter", () => {
    const r = run((x, log) => {
      let n = 0;
      x.rmOn("resource.unavailable", "calendar", (ev) => { n++; log.push(["calendar", ev.key, n]); if (n < 3) throw new Error("room not found " + n); });
      x.rmOn("resource.unavailable", "flaky", (ev) => { log.push(["flaky", ev.key]); throw new Error("always"); });
      x.rmEmit("resource.unavailable", { rid: "plateau" }, { key: "unavail-i1" });
      const snap = (t: number) => { vi.advanceTimersByTime(t); log.push(["t+" + t, JSON.parse(JSON.stringify(x.RM.retry)), x.rmBusSt().fail.length]); };
      snap(399); snap(1); snap(1199); snap(1); snap(3600); snap(10000);
      return x.rmBusSt().done;
    });
    expect(r.port).toEqual(r.source);
  });

  it("catch-up after a reload replays only what each consumer has not processed", () => {
    const r = run((x, log) => {
      x.rmOn("appointment.cancelled", "planning", rec(log, "planning"));
      ["c1", "c2", "c3"].forEach((k) => x.rmEmit("appointment.cancelled", { appt: k }, { key: "cancelled-" + k }));
      x.rmEmit("appointment.noShow", { appt: "n1" }, { key: "noShow-n1" });
      // "Reload": a new page reads the persisted bus; a new consumer and the old one subscribe, then the app catches up.
      x.RM.bus = null; x.RM.subs = {}; log.push("reload");
      x.rmOn("appointment.cancelled", "planning", rec(log, "planning")); x.rmOn("appointment.cancelled", "os-notify", rec(log, "os-notify")); x.rmOn("appointment.noShow", "billing", rec(log, "billing"));
      x.rmCatchUp(); log.push("again"); x.rmCatchUp();
      return x.rmBusSt().done;
    });
    expect(r.port).toEqual(r.source);
  });

  it("cross-tab: a storage event on remotion-bus delivers only the events newer than this tab's copy", () => {
    const r = run((x, log) => {
      x.rmOn("appointment.cancelled", "planning", rec(log, "planning"));
      x.rmEmit("appointment.cancelled", { appt: "a1" }, { key: "k1" });
      // Another tab appends two events and saves the whole bus.
      const other = JSON.parse(JSON.stringify(x.rmBusSt()));
      other.ev.push({ id: "eX", key: "k2", type: "appointment.cancelled", seq: 2, ts: "", src: "", ref: "", ver: null, p: { appt: "a2" } });
      other.ev.push({ id: "eY", key: "k3", type: "appointment.cancelled", seq: 3, ts: "", src: "", ref: "", ver: null, p: { appt: "a3" } });
      other.seq = 3; localStorage.setItem("remotion-bus", JSON.stringify(other));
      x.storage("remotion-shared"); log.push("other key ignored");
      x.storage("remotion-bus"); x.storage("remotion-bus");
      return x.rmBusSt().seq;
    });
    expect(r.port).toEqual(r.source);
  });

  it("trimming: 400 events, 600 done keys per consumer, 100 failures", () => {
    const r = run((x) => {
      x.rmOn("task.completed", "planning-ui", () => {});
      for (let i = 0; i < 650; i++) x.rmEmit("task.completed", { task: "t" + i }, { key: "task-done-" + i });
      x.rmOn("task.created", "bad", () => { throw new Error("x"); });
      for (let i = 0; i < 130; i++) x.rmEmit("task.created", { i }, { key: "tc-" + i });
      const s = x.rmBusSt();
      return [s.ev.length, s.ev[0].key, s.done["planning-ui"].length, s.done["planning-ui"][0], s.fail.length, s.seq];
    });
    expect(r.port).toEqual(r.source);
  });

  it("stale helper truth table (exported, never used by a consumer: D-H06 reproduced)", () => {
    const vals = [null, undefined, 0, 1, 2];
    const r = run((x) => vals.flatMap((a) => vals.map((v) => x.rmStale(a, v))));
    expect(r.port).toEqual(r.source);
  });

  it("D-H18 reproduced: while a handler runs, the stored bus already holds the event with no done entry for it", () => {
    const r = run((x, log) => {
      x.rmOn("appointment.cancelled", "os-notify", (ev) => { const stored = JSON.parse(localStorage.getItem("remotion-bus") || "null"); log.push([ev.key, stored.ev.map((e: Ev) => e.key), stored.done]); });
      x.rmEmit("appointment.cancelled", { appt: "a1" }, { key: "cancelled-a1" });
      return null;
    });
    expect(r.port).toEqual(r.source);
    expect(JSON.stringify(r.source)).toContain('"cancelled-a1",["cancelled-a1"],{}');
  });

  it("producers: every rmEmit call site has the same event type and key usage as the source (D-H06, D-H07 reproduced)", () => {
    /** Each rmEmit( call with balanced parentheses: [first argument, passes a key]. */
    const calls = (text: string) => { const out: [string, boolean][] = []; let i = text.indexOf("rmEmit(");
      while (i >= 0) { let d = 0, j = i + 6; for (; j < text.length; j++) { const c = text[j]; if (c === "(") d++; else if (c === ")" && --d === 0) break; }
        const body = text.slice(i + 7, j); const first = body.split(",")[0].replace(/:\s*string$/, "").trim();
        if (!/^\s*type\b[^,]*,\s*payload/.test(body)) out.push([first, /\bkey\s*:/.test(body)]); i = text.indexOf("rmEmit(", j); }
      return out; };
    const hz = at(/^\/\* ===== v64 · Remotion shared foundation/, 24000), hzEnd = at(/^<\/script>$/, hz);
    const src = calls(html.slice(hz, hzEnd).join("\n"));
    const port = ["health/rm.ts", "patients/patients.ts", "calendar/calendar.ts", "cabinet/cabinet.ts", "planning/planning.ts"].flatMap((f) => calls(fs.readFileSync(path.join(ROOT, "remotion-os/src/apps", f), "utf8")));
    expect(port).toEqual(src);
    expect(src.filter(([t]) => t.includes("statusChanged"))).toEqual([]);
    expect(src.filter(([t]) => /practitioner\.updated|service\.updated/.test(t))).toEqual([["\"practitioner.updated\"", false], ["\"service.updated\"", false]]);
  });
});
