/**
 * Embedded-font text for the Documents PDF writer (product phase 2).
 *
 * The original writer drew every text run with the 14 standard PDF fonts in WinAnsi encoding: anything outside
 * Windows-1252 (Arabic, Greek, ✓ ☐ → ≥, …) became "?" or a picture of the text, and the page used Helvetica/Times
 * instead of the document's fonts. This module embeds subsets of real TrueType fonts instead:
 *
 * - The document's own family (Inter, Arial→Arimo, Times/Georgia→Tinos, Courier→Cousine, Calibri→Carlito,
 *   Cambria→Caladea, Source Serif 4), in the right weight and style.
 * - Per-character fallback to Noto Sans Arabic, Noto Sans Symbols 2 and DejaVu Sans.
 * - Shaping (ligatures, kerning, Arabic joining forms) by fontkit; right-to-left runs drawn in visual order.
 * - Type0 / CIDFontType2 fonts with Identity-H encoding, a /W width array and a /ToUnicode map, so the text stays
 *   selectable, searchable and copyable in every script.
 *
 * Characters no embedded font covers (emoji, CJK) return null and the writer keeps its picture fallback for that run.
 * Fonts and fontkit are self-hosted (public/vendor) and loaded only when a PDF is written.
 */

type FkGlyph = { id: number; advanceWidth: number; codePoints: number[] };
type FkPos = { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number };
type FkRun = { glyphs: FkGlyph[]; positions: FkPos[]; direction?: string };
type FkFont = {
  unitsPerEm: number; ascent: number; descent: number; capHeight: number; italicAngle: number; postscriptName: string;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  hasGlyphForCodePoint: (cp: number) => boolean; layout: (s: string) => FkRun;
};
type Fontkit = { create: (b: Uint8Array) => FkFont };

/** One embedded font: the parsed file, its subset and what the subset holds so far. */
type Emb = { key: string; res: string; font: FkFont; bytes: Uint8Array; used: Set<number>; w: Map<number, number>; uni: Map<number, number[]>; objId: number };
export type CsLike = { fontFamily: string; fontWeight: string; fontStyle: string };
export type Shaped = { width1000: number; ops: string; asc: number; desc: number };

const BASE = "/vendor/pdf-fonts/";
const FILE: Record<string, string> = {
  "inter-400": "Inter_400Regular", "inter-400i": "Inter_400Regular_Italic", "inter-600": "Inter_600SemiBold", "inter-600i": "Inter_600SemiBold_Italic", "inter-700": "Inter_700Bold", "inter-700i": "Inter_700Bold_Italic",
  "arimo-400": "Arimo_400Regular", "arimo-400i": "Arimo_400Regular_Italic", "arimo-700": "Arimo_700Bold", "arimo-700i": "Arimo_700Bold_Italic",
  "tinos-400": "Tinos_400Regular", "tinos-400i": "Tinos_400Regular_Italic", "tinos-700": "Tinos_700Bold", "tinos-700i": "Tinos_700Bold_Italic",
  "cousine-400": "Cousine_400Regular", "cousine-400i": "Cousine_400Regular_Italic", "cousine-700": "Cousine_700Bold", "cousine-700i": "Cousine_700Bold_Italic",
  "carlito-400": "Carlito_400Regular", "carlito-400i": "Carlito_400Regular_Italic", "carlito-700": "Carlito_700Bold", "carlito-700i": "Carlito_700Bold_Italic",
  "caladea-400": "Caladea_400Regular", "caladea-400i": "Caladea_400Regular_Italic", "caladea-700": "Caladea_700Bold", "caladea-700i": "Caladea_700Bold_Italic",
  "sserif-400": "SourceSerif4_400Regular", "sserif-400i": "SourceSerif4_400Regular_Italic", "sserif-600": "SourceSerif4_600SemiBold", "sserif-600i": "SourceSerif4_600SemiBold_Italic", "sserif-700": "SourceSerif4_700Bold", "sserif-700i": "SourceSerif4_700Bold_Italic",
  "arabic-400": "NotoSansArabic_400Regular", "arabic-700": "NotoSansArabic_700Bold",
  "sym2-400": "NotoSansSymbols2_400Regular",
  "dejavu-400": "DejaVuSans", "dejavu-700": "DejaVuSans-Bold",
};
const HAS600 = new Set(["inter", "sserif"]);

/** CSS font-family → our family key (first family in the list that we can map). */
export function familyOf(ff: string): string {
  for (const raw of ff.split(",")) {
    const f = raw.replace(/["']/g, "").trim().toLowerCase();
    if (!f) continue;
    if (/^inter\b/.test(f)) return "inter";
    if (/source serif/.test(f)) return "sserif";
    if (/calibri|carlito/.test(f)) return "carlito";
    if (/cambria|caladea/.test(f)) return "caladea";
    if (/courier|cousine|consolas|menlo|monaco|monospace|mono\b/.test(f)) return "cousine";
    if (/times|tinos|georgia|garamond|liberation serif|book antiqua|palatino|^serif$|marianne serif/.test(f)) return "tinos";
    if (/arial|helvetica|arimo|liberation sans|verdana|trebuchet|tahoma|segoe|roboto|open sans|lato|marianne|calibri|^sans-serif$|system-ui|-apple-system/.test(f)) return "arimo";
  }
  return "inter";
}
const weightOf = (w: string) => { const n = parseInt(w) || (w === "bold" ? 700 : 400); return n >= 650 ? 700 : n >= 550 ? 600 : 400; };
function keyFor(fam: string, w: number, it: boolean) {
  const ww = w === 600 && !HAS600.has(fam) ? 700 : w;
  return `${fam}-${ww}${it ? "i" : ""}`;
}
const isMark = (cp: number) => (cp >= 0x300 && cp <= 0x36f) || (cp >= 0x64b && cp <= 0x65f) || cp === 0x670 || (cp >= 0x6d6 && cp <= 0x6ed) || (cp >= 0xfe20 && cp <= 0xfe2f) || cp === 0x200d || cp === 0x200c;
const isArabic = (cp: number) => (cp >= 0x600 && cp <= 0x6ff) || (cp >= 0x750 && cp <= 0x77f) || (cp >= 0x8a0 && cp <= 0x8ff) || (cp >= 0xfb50 && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff);

export async function loadFontkit(): Promise<Fontkit | null> {
  const w = window as unknown as { fontkit?: Fontkit };
  if (w.fontkit) return w.fontkit;
  await new Promise<void>((res) => { const s = document.createElement("script"); s.src = "/vendor/fontkit-1.1.1/fontkit.umd.min.js"; s.onload = () => res(); s.onerror = () => res(); document.head.appendChild(s); });
  return w.fontkit || null;
}
const fileCache = new Map<string, Promise<Uint8Array | null>>();
export function fetchFont(key: string): Promise<Uint8Array | null> {
  if (!fileCache.has(key)) fileCache.set(key, fetch(BASE + FILE[key] + ".ttf").then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? new Uint8Array(b) : null)).catch(() => null));
  return fileCache.get(key)!;
}
const hex4 = (n: number) => n.toString(16).padStart(4, "0").toUpperCase();

/**
 * Glyph-preserving TrueType subset: every glyph keeps its number (so CID = original glyph id) and the glyphs the
 * document does not use are emptied. Composite glyphs pull in their components. Keeps the tables a PDF reader needs
 * (head, hhea, maxp, hmtx, loca, glyf, cvt, fpgm, prep, OS/2); drops layout, names and cmap. (fontkit's own subsetter
 * produced corrupt glyph data for several of these fonts.)
 */
export function ttfSubset(src: Uint8Array, used: Set<number>, opts: { keepLayout?: boolean } = {}): Uint8Array {
  const dv = new DataView(src.buffer, src.byteOffset, src.byteLength);
  const n = dv.getUint16(4), tab: Record<string, { off: number; len: number }> = {};
  for (let i = 0; i < n; i++) { const o = 12 + 16 * i; const tag = String.fromCharCode(src[o], src[o + 1], src[o + 2], src[o + 3]); tab[tag] = { off: dv.getUint32(o + 8), len: dv.getUint32(o + 12) }; }
  const head = tab.head, maxp = tab.maxp, loca = tab.loca, glyf = tab.glyf;
  const numG = dv.getUint16(maxp.off + 4), longLoca = dv.getInt16(head.off + 50) === 1;
  const lo = (g: number) => (longLoca ? dv.getUint32(loca.off + 4 * g) : dv.getUint16(loca.off + 2 * g) * 2);
  const keep = new Set<number>([0]);
  const visit = (g: number) => {
    if (g < 0 || g >= numG || keep.has(g) && g !== 0) return; keep.add(g);
    const a = lo(g), b = lo(g + 1); if (b - a < 10) return;
    const p0 = glyf.off + a; if (dv.getInt16(p0) >= 0) return;
    let p = p0 + 10, more = true;
    while (more && p + 4 <= glyf.off + b) { const fl = dv.getUint16(p), gi = dv.getUint16(p + 2); p += 4 + (fl & 1 ? 4 : 2) + (fl & 8 ? 2 : fl & 0x40 ? 4 : fl & 0x80 ? 8 : 0); if (!keep.has(gi)) visit(gi); more = !!(fl & 0x20); }
  };
  used.forEach((g) => visit(g)); visit(0);
  // new glyf + long loca
  const parts: Uint8Array[] = []; const offs = new Uint32Array(numG + 1); let pos = 0;
  for (let g = 0; g < numG; g++) {
    offs[g] = pos;
    if (keep.has(g)) { const a = lo(g), b = lo(g + 1); if (b > a) { const d = src.subarray(glyf.off + a, glyf.off + b); parts.push(d); pos += d.length; const pad = (4 - (d.length % 4)) % 4; if (pad) { parts.push(new Uint8Array(pad)); pos += pad; } } }
  }
  offs[numG] = pos;
  const glyfOut = new Uint8Array(pos); { let o = 0; for (const q of parts) { glyfOut.set(q, o); o += q.length; } }
  const locaOut = new Uint8Array((numG + 1) * 4); { const v = new DataView(locaOut.buffer); for (let g = 0; g <= numG; g++) v.setUint32(4 * g, offs[g]); }
  const headOut = src.slice(head.off, head.off + head.len); { const v = new DataView(headOut.buffer); v.setUint32(8, 0); v.setInt16(50, 1); }
  const tables: [string, Uint8Array][] = [];
  // keepLayout: every other table too (cmap, GSUB, GPOS, name, post…) — for pdf-lib, which shapes text with fontkit itself
  const names = opts.keepLayout ? [...new Set([...Object.keys(tab), "glyf", "loca", "head"])].filter((t) => t !== "DSIG").sort() : ["OS/2", "cvt ", "fpgm", "glyf", "head", "hhea", "hmtx", "loca", "maxp", "prep"];
  for (const t of names) {
    if (t === "glyf") tables.push([t, glyfOut]); else if (t === "loca") tables.push([t, locaOut]); else if (t === "head") tables.push([t, headOut]);
    else if (tab[t]) tables.push([t, src.subarray(tab[t].off, tab[t].off + tab[t].len)]);
  }
  const nt = tables.length; let es = 0; while (1 << (es + 1) <= nt) es++;
  const hdr = 12 + 16 * nt; let total = hdr; for (const [, d] of tables) total += (d.length + 3) & ~3;
  const out = new Uint8Array(total), ov = new DataView(out.buffer);
  ov.setUint32(0, 0x00010000); ov.setUint16(4, nt); ov.setUint16(6, 16 << es); ov.setUint16(8, es); ov.setUint16(10, nt * 16 - (16 << es));
  const sum = (u: Uint8Array) => { let s = 0; const v = new DataView(u.buffer, u.byteOffset, u.byteLength); const L = u.length & ~3; for (let i = 0; i < L; i += 4) s = (s + v.getUint32(i)) >>> 0; if (u.length & 3) { let last = 0; for (let i = L; i < u.length; i++) last |= u[i] << (24 - 8 * (i - L)); s = (s + (last >>> 0)) >>> 0; } return s; };
  let o = hdr, headAt = 0;
  tables.forEach(([t, d], i) => {
    const r = 12 + 16 * i; for (let j = 0; j < 4; j++) out[r + j] = t.charCodeAt(j);
    ov.setUint32(r + 4, sum(d)); ov.setUint32(r + 8, o); ov.setUint32(r + 12, d.length);
    out.set(d, o); if (t === "head") headAt = o; o += (d.length + 3) & ~3;
  });
  ov.setUint32(headAt + 8, (0xb1b0afba - sum(out)) >>> 0);
  return out;
}
const f2 = (n: number) => (Math.round(n * 100) / 100).toString();

/**
 * One instance per PDF: collects the glyphs used on every page and writes the font objects at the end.
 * reserve() allocates a PDF object number now; the object itself is set by finish().
 */
export function createPdfFonts(reserve: () => number) {
  let fk: Fontkit | null = null;
  const parsed = new Map<string, FkFont>();
  const raw = new Map<string, Uint8Array>();
  const emb = new Map<string, Emb>();
  let n = 0;
  const usedOnPage = new Set<string>();

  /** Loads fontkit and every font the host's text may need. False when embedding is not possible (old writer then). */
  async function prepare(host: HTMLElement): Promise<boolean> {
    fk = await loadFontkit(); if (!fk) return false;
    const need = new Set<string>(["dejavu-400", "dejavu-700", "sym2-400"]);
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>(); let arabic = false;
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const v = t.nodeValue || ""; if (!v.trim()) continue;
      const el = t.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
      const cs = getComputedStyle(el);
      need.add(keyFor(familyOf(cs.fontFamily), weightOf(cs.fontWeight), cs.fontStyle !== "normal"));
      if (!arabic) for (const ch of v) if (isArabic(ch.codePointAt(0)!)) { arabic = true; break; }
    }
    // form values, chart labels and the watermark are drawn in the default family
    ["inter-400", "inter-600", "inter-700"].forEach((k) => need.add(k));
    if (arabic) { need.add("arabic-400"); need.add("arabic-700"); }
    const got = await Promise.all([...need].map(async (k) => [k, await fetchFont(k)] as const));
    for (const [k, b] of got) { if (!b) continue; try { parsed.set(k, fk.create(b)); raw.set(k, b); } catch {} }
    return parsed.has("inter-400") || parsed.size > 3;
  }

  function embOf(key: string): Emb | null {
    let e = emb.get(key); if (e) return e;
    const font = parsed.get(key); if (!font) return null;
    e = { key, res: "E" + ++n, font, bytes: raw.get(key)!, used: new Set([0]), w: new Map(), uni: new Map(), objId: reserve() };
    emb.set(key, e);
    return e;
  }

  /** The font chain for one style: its own family, then Arabic, symbols and DejaVu. */
  function chain(cs: CsLike): string[] {
    const fam = familyOf(cs.fontFamily), w = weightOf(cs.fontWeight), it = cs.fontStyle !== "normal" && cs.fontStyle !== "";
    const own = keyFor(fam, w, it), ownUp = keyFor(fam, w, false);
    const bold = w >= 600;
    return [own, ownUp, bold ? "arabic-700" : "arabic-400", "arabic-400", "sym2-400", bold ? "dejavu-700" : "dejavu-400", "dejavu-400"].filter((k, i, a) => a.indexOf(k) === i && parsed.has(k));
  }

  /**
   * Shapes a run and returns the PDF text operators (font switches + TJ arrays) and its natural width in 1/1000 em.
   * null when some character has no glyph in any embedded font.
   */
  function shape(str: string, cs: CsLike, size: number): Shaped | null {
    const keys = chain(cs); if (!keys.length) return null;
    // split into segments of one font each (marks and joiners stay with the previous character)
    const segs: { key: string; text: string }[] = [];
    for (const ch of str) {
      const cp = ch.codePointAt(0)!;
      const last = segs[segs.length - 1];
      if (last && isMark(cp)) { last.text += ch; continue; }
      const k = keys.find((kk) => parsed.get(kk)!.hasGlyphForCodePoint(cp));
      if (!k) { if (/\s/.test(ch) && last) { last.text += ch; continue; } return null; }
      if (last && last.key === k) last.text += ch; else segs.push({ key: k, text: ch });
    }
    // right-to-left text: segments in visual order
    const rtl = segs.some((s) => isArabic(s.text.codePointAt(0)!));
    if (rtl) segs.reverse();
    let width = 0; const out: string[] = []; let asc = 0.9, desc = 0.22, first = true;
    for (const s of segs) {
      const e = embOf(s.key); if (!e) return null;
      let run: FkRun; try { run = e.font.layout(s.text); } catch { return null; }
      // fontkit returns right-to-left runs already in visual (left-to-right drawing) order
      const glyphs = run.glyphs, pos = run.positions;
      const upm = e.font.unitsPerEm, k = 1000 / upm;
      if (first) { first = false; asc = e.font.ascent / upm; desc = Math.abs(e.font.descent) / upm; }
      const parts: string[] = []; let cur = "";
      glyphs.forEach((g, i) => {
        const ng = g.id; // glyph-preserving subset: the CID is the font's own glyph number
        if (!e.used.has(ng)) { e.used.add(ng); e.w.set(ng, Math.round(g.advanceWidth * k)); }
        if (!e.uni.has(ng) && g.codePoints?.length) e.uni.set(ng, g.codePoints);
        cur += hex4(ng);
        const adv = pos[i]?.xAdvance ?? g.advanceWidth, dw = g.advanceWidth - adv;
        width += adv * k;
        if (Math.abs(dw) > 0.5) { parts.push(`<${cur}>`, f2(dw * k)); cur = ""; }
      });
      if (cur) parts.push(`<${cur}>`);
      usedOnPage.add(e.key);
      out.push(`/${e.res} ${f2(size)} Tf [${parts.join(" ")}] TJ`);
    }
    return { width1000: width, ops: out.join(" "), asc, desc };
  }

  /** Font resources used since the last call (one page). */
  function pageResources(): string {
    const s = [...usedOnPage].map((k) => emb.get(k)!).filter(Boolean).map((e) => `/${e.res} ${e.objId} 0 R`).join(" ");
    usedOnPage.clear();
    return s;
  }

  /** Writes every embedded font (subset program, descriptor, CID font, ToUnicode, Type0). */
  async function finish(add: (o: string | { dict: string; data: Uint8Array }) => number, set: (id: number, o: string) => void, deflate: (u: Uint8Array) => Promise<Uint8Array | null>) {
    for (const e of emb.values()) {
      const bytes = ttfSubset(e.bytes, e.used);
      const z = await deflate(bytes);
      const fileId = add({ dict: `/Length1 ${bytes.length}${z ? " /Filter /FlateDecode" : ""}`, data: z || bytes });
      const f = e.font, k = 1000 / f.unitsPerEm;
      const tag = "RMDC" + String.fromCharCode(65 + (e.objId % 26), 65 + ((e.objId >> 3) % 26)) + "+";
      const name = tag + (f.postscriptName || e.key).replace(/[^A-Za-z0-9-]/g, "");
      const flags = (e.key.startsWith("tinos") || e.key.startsWith("caladea") || e.key.startsWith("sserif") ? 2 : 0) | 4 | (e.key.endsWith("i") ? 64 : 0);
      const desc = add(`<< /Type /FontDescriptor /FontName /${name} /Flags ${flags} /FontBBox [${[f.bbox.minX, f.bbox.minY, f.bbox.maxX, f.bbox.maxY].map((v) => Math.round(v * k)).join(" ")}] /ItalicAngle ${Math.round(f.italicAngle || 0)} /Ascent ${Math.round(f.ascent * k)} /Descent ${Math.round(f.descent * k)} /CapHeight ${Math.round((f.capHeight || f.ascent * 0.7) * k)} /StemV 80 /FontFile2 ${fileId} 0 R >>`);
      const ws = [...e.w.entries()].sort((a, b) => a[0] - b[0]).map(([g, w]) => `${g} [${w}]`).join(" ");
      const cid = add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${desc} 0 R /CIDToGIDMap /Identity /DW 1000 /W [${ws}] >>`);
      const entries = [...e.uni.entries()].sort((a, b) => a[0] - b[0]);
      const lines: string[] = [];
      for (let i = 0; i < entries.length; i += 100) {
        const chunk = entries.slice(i, i + 100);
        lines.push(`${chunk.length} beginbfchar`, ...chunk.map(([g, cps]) => `<${hex4(g)}> <${cps.map((c) => (c > 0xffff ? hex4(0xd800 + ((c - 0x10000) >> 10)) + hex4(0xdc00 + ((c - 0x10000) & 1023)) : hex4(c))).join("")}>`), "endbfchar");
      }
      const cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${lines.join("\n")}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
      const cmapBytes = new TextEncoder().encode(cmap); const cz = await deflate(cmapBytes);
      const tu = add({ dict: cz ? "/Filter /FlateDecode" : "", data: cz || cmapBytes });
      set(e.objId, `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${tu} 0 R >>`);
    }
  }

  return { prepare, shape, pageResources, finish, get count() { return emb.size; } };
}
export type PdfFonts = ReturnType<typeof createPdfFonts>;
