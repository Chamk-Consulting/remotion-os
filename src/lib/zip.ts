/**
 * Zip reading and writing shared by the apps (B-17): `unzip` (source L15689, the OS zip reader used by the Word / XLSX
 * importers) and `makeZip` / `deflate` / `crc32` (RDX, L16454–L16612). Same algorithms as the source.
 */
export type ZipEntry = { method: number; data: Uint8Array };
export type Unzipped = { files: Record<string, ZipEntry>; read: (name: string) => Promise<Uint8Array | null>; text: (name: string) => Promise<string | null> };

/** unzip (L15689): central directory walk; stored and deflate-raw entries. */
export async function unzip(buf: ArrayBuffer): Promise<Unzipped> {
  const u = new Uint8Array(buf), dv = new DataView(buf); let e = u.length - 22; while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e <= 0) throw new Error("Not a zip file");
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const files: Record<string, ZipEntry> = {};
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true); const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nl));
    const lnl = dv.getUint16(lo + 26, true), lxl = dv.getUint16(lo + 28, true), start = lo + 30 + lnl + lxl; files[name] = { method, data: u.subarray(start, start + csize) }; p += 46 + nl + xl + cl;
  }
  const read = async (name: string) => { const f = files[name]; if (!f) return null; if (f.method === 0) return f.data; const ds = new DecompressionStream("deflate-raw"); const out = await new Response(new Blob([f.data as BlobPart]).stream().pipeThrough(ds)).arrayBuffer(); return new Uint8Array(out); };
  return { files, read, text: async (nm: string) => { const b = await read(nm); return b ? new TextDecoder().decode(b) : null; } };
}

/** deflate (RDX): CompressionStream when the browser has it, otherwise null (stored). */
export async function deflate(u8: Uint8Array, fmt: CompressionFormat): Promise<Uint8Array | null> {
  if (!window.CompressionStream) return null;
  try { const cs = new CompressionStream(fmt); const w = cs.writable.getWriter(); w.write(u8 as BufferSource); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); } catch { return null; }
}
const CRCT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(u: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRCT[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

/** makeZip (L16596): deflate-raw unless `store` or not smaller; local time stamps. */
export async function makeZip(files: { name: string; data: string | Uint8Array; store?: boolean }[], type: string) {
  const enc = new TextEncoder(), parts: Uint8Array[] = [], central: Uint8Array[] = []; let off = 0; const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === "string" ? enc.encode(f.data) : f.data, crc = crc32(data);
    let comp = f.store ? null : await deflate(data, "deflate-raw"), method = 8; if (!comp || comp.length >= data.length) { comp = data; method = 0; }
    const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true); lh.setUint16(8, method, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true); lh.setUint32(18, comp.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0, true); ch.setUint16(10, method, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true); ch.setUint32(20, comp.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, off, true);
    parts.push(new Uint8Array(lh.buffer), name, comp); central.push(new Uint8Array(ch.buffer), name); off += 30 + name.length + comp.length;
  }
  const cdSize = central.reduce((a, u) => a + u.length, 0); const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)] as BlobPart[], { type });
}
