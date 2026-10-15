/**
 * Slice 15 golden test: the Calendar's time-zone maths, weekly recurrence, ICS parsing and contact masking (source
 * L25427–L25633) give the same results as the source's own functions, extracted from Remotion_Desktop.html and run
 * side by side over a matrix of inputs (DST gaps and folds in Europe/Paris, other zones, rules with interval / count /
 * until, folded ICS lines, all-day and TZID events).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() },
  document: { documentElement: { lang: "en", dir: "ltr" } },
});

const html = fs.readFileSync(path.resolve(__dirname, "../../../source/Remotion_Desktop.html"), "utf8").split("\n");
const at = (re: RegExp) => { const i = html.findIndex((l) => re.test(l)); if (i < 0) throw new Error("not found: " + re); return i; };
/** Source lines from the one matching `from` up to (not including) the one matching `to`. */
const block = (from: RegExp, to: RegExp) => { const a = at(from); let b = a + 1; while (!to.test(html[b])) b++; return html.slice(a, b).join("\n"); };
const SRC = [
  block(/^class ClErr extends Error/, /^const CL_ORG_TZ/), 'const CL_ORG_TZ="Europe/Paris";',
  block(/^const clFmtCache=\{\}/, /^const clNow=/),
  block(/^function clSeriesKeys\(/, /^function clSeriesOcc\(/),
  html[at(/^const clMask=/)],
  block(/^function clIcsParse\(/, /^function clIcsImport\(/),
].join("\n");
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const S = new Function(SRC + "\nreturn {clZ,clDateOf,clTimeOf,clAddD,clWd,clDiffD,clSeriesKeys,clMask,clIcsParse};")() as Record<string, (...a: unknown[]) => unknown>;

describe("calendar domain = source (golden)", async () => {
  const C = await import("@/apps/calendar/calendar");
  it("wall time ↔ UTC in an explicit zone, DST gaps and folds", () => {
    const zones = ["Europe/Paris", "Africa/Tunis", "America/New_York", "Asia/Dubai", "UTC"];
    const dates = ["2026-03-29", "2026-10-25", "2026-03-08", "2026-11-01", "2026-06-15", "2026-12-31"];
    const times = ["00:00", "01:59", "02:00", "02:30", "03:00", "12:00", "23:45"];
    for (const z of zones) for (const d of dates) for (const t of times) expect(C.clZ(d, t, z)).toEqual(S.clZ(d, t, z));
    for (let ms = Date.UTC(2026, 2, 28, 22); ms < Date.UTC(2026, 2, 29, 4); ms += 15 * 60000) for (const z of zones) { expect(C.clDateOf(ms, z)).toBe(S.clDateOf(ms, z)); expect(C.clTimeOf(ms, z)).toBe(S.clTimeOf(ms, z)); }
    expect(C.clZ("2026-03-29", "02:30", "Europe/Paris").gap).toBe(true);
    expect(C.clZ("2026-10-25", "02:30", "Europe/Paris").fold).toBe(true);
  });
  it("weekly recurrence keys (interval, days, count, until, limit)", () => {
    const rules = [{ interval: 1, byDay: [4], until: "", count: 10 }, { interval: 2, byDay: [1, 3], until: "", count: 7 }, { interval: 1, byDay: [], until: "2026-12-01", count: 0 }, { interval: 3, byDay: [0, 6], until: "2027-02-01", count: 0 }];
    for (const rule of rules) for (const startDate of ["2026-10-14", "2026-10-25", "2026-12-28"]) for (const lim of [undefined, "2026-11-20"]) {
      const sr = { startDate, rule };
      expect(C.clSeriesKeys(sr, lim)).toEqual(S.clSeriesKeys(sr, lim));
    }
  });
  it("ICS parsing and contact masking", () => {
    const ics = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:a@x", "DTSTART:20261021T130000Z", "DTEND:20261021T150000Z", "SUMMARY:Congr\\, ès\\nlong", " ue", "END:VEVENT",
      "BEGIN:VEVENT", "UID:b@x", "DTSTART;VALUE=DATE:20261102", "SUMMARY:Journée", "END:VEVENT",
      "BEGIN:VEVENT", "UID:c@x", "DTSTART;TZID=America/New_York:20261101T013000", "DTEND;TZID=America/New_York:20261101T023000", "TRANSP:TRANSPARENT", "END:VEVENT",
      "BEGIN:VEVENT", "UID:d@x", "DTSTART;TZID=Europe/Paris:20261025T023000", "STATUS:CANCELLED", "RRULE:FREQ=WEEKLY", "END:VEVENT", "BEGIN:VEVENT", "DTSTART:20261021T130000Z", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    expect(C.clIcsParse(ics)).toEqual(S.clIcsParse(ics));
    expect((C.clIcsParse(ics) as unknown[]).length).toBe(4);
    for (const s of ["camille.martin@exemple.invalid", "06 12 34 56 78", "+33612345678", "a@b"]) expect(C.clMask(s)).toBe(S.clMask(s));
  });
});
