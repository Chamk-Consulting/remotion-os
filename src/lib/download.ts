/**
 * Download service shared by the apps (B-17, X-10): dcSaveFile (source L16972–L16986).
 * When the host page offers `window.claude.use("downloads")`, files go through its save prompt; formats it does not
 * accept travel inside a .zip. Otherwise the browser downloads the file directly. Same behaviour as the source.
 */
import { makeZip } from "./zip";

const DC_DLOK = new Set("txt json md docx pptx epub csv html svg pdf xlsx zip png".split(" "));
type Downloads = { save?: (o: { filename: string; data: Blob }) => Promise<{ status?: string } | undefined> };
let dcDLP: Promise<Downloads | null> | null = null;
function dcDL() {
  const host = (window as unknown as { claude?: { use?: (n: string) => Promise<Downloads> } }).claude;
  if (!dcDLP) dcDLP = host && host.use ? Promise.resolve(host.use("downloads")).catch(() => null) : Promise.resolve(null);
  return dcDLP;
}
export type SaveResult = { ok: boolean; fn: string; zipped?: boolean; st?: string; local?: boolean; code?: string };
export async function dcSaveFile(name: string, blob: Blob): Promise<SaveResult> {
  const ext = (name.split(".").pop() || "").toLowerCase(); const dl = await dcDL();
  if (dl && dl.save) {
    let fn = name, data = blob, zipped = false;
    if (!DC_DLOK.has(ext)) { data = await makeZip([{ name, data: new Uint8Array(await blob.arrayBuffer()) }], "application/zip"); fn = name.replace(/\.[^.]+$/, "") + "-" + ext + ".zip"; zipped = true; }
    try { const r = await dl.save({ filename: fn, data }); return { ok: true, fn, zipped, st: r && r.status }; } catch (e) { return { ok: false, code: (e as { code?: string })?.code || "unavailable", fn }; }
  }
  try { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); return { ok: true, fn: name, local: true }; } catch { return { ok: false, code: "unavailable", fn: name }; }
}
