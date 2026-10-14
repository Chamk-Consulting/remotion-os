/**
 * Desktop domain (pure, no DOM) — ported from the source free-desktop layer (L11237–L11458), design seed (L11753–L11782),
 * virtual FS (L11784–L11803) and the per-app first-run seeds (L13593, L22592, L23803, L24439, L25424, L26684, L27210).
 * Behaviour, ids, limits and defects are kept as in the source; reproductions are marked with their defect id.
 */
export type ItemType = "app" | "folder" | "doc" | "link";
export interface Item {
  id: string; type: ItemType; app?: string; name?: string; size?: number; mod?: number; text?: string | null; url?: string;
  kids?: Item[]; c?: number | null; r?: number | null; fx?: number; fy?: number; col?: "y"; tags?: string[]; fav?: boolean; ref?: string; sc?: 1;
}
export interface Desk { n: string; s: number; items?: Item[]; w?: boolean; _id?: string }
export interface AppStore { inst: Record<string, 0 | 1>; fav: Record<string, 1>; recent: string[] }
export type TrashItem = Item & { from?: number; root?: string; at: number };
export type FsData = Record<"documents" | "downloads" | "images" | "videos" | "music" | "shared", Item[]>;

/** Source dkId (L11240). */
export const dkId = () => "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Source DK_EXT (L11242) + additions (L11794). */
export const DK_EXT: Record<string, [string, string]> = {
  pdf: ["#e2453c", "PDF"], docx: ["#2f6fe0", "DOC"], doc: ["#2f6fe0", "DOC"], xlsx: ["#1f9d55", "XLS"], csv: ["#1f9d55", "CSV"], pptx: ["#e07a2f", "PPT"], md: ["#5d6670", "MD"], txt: ["#5d6670", "TXT"], json: ["#8a5cf7", "JSON"], png: ["#9a5cf7", "IMG"], jpg: ["#9a5cf7", "IMG"], jpeg: ["#9a5cf7", "IMG"], webp: ["#9a5cf7", "IMG"], zip: ["#a0844a", "ZIP"],
  mp4: ["#e23b3b", "VID"], mp3: ["#9a5cf7", "MP3"], drawio: ["#f07a12", "DRAW"], ppt: ["#e07a2f", "PPT"], svg: ["#9a5cf7", "SVG"],
};
export const dkExt = (n: unknown) => { const m = String(n).toLowerCase().match(/\.([a-z0-9]{1,6})$/); return m ? m[1] : ""; };

/** Source alStore defaults (L11748). */
export const AL_DEFAULT: AppStore = { inst: {}, fav: { files: 1, notes: 1, billing: 1, remotionAI: 1 }, recent: [] };

type T = (k: string, v?: Record<string, string | number>) => string;

/** v1 seed (L11255–L11272). Also normalises `w` and `items` on every desktop. */
export function seedV1(desks: Desk[], t: T, flags: Flags) {
  desks.forEach((d, i) => { if (d.w === undefined) d.w = i === 0; if (!Array.isArray(d.items)) d.items = []; });
  if (flags.has("remotion-dk-v1")) return false;
  const now = Date.now(), day = 864e5;
  const doc = (name: string, size: number, ago: number, c?: number, r?: number): Item => ({ id: dkId(), type: "doc", name, size, mod: now - ago * day, c, r });
  if (desks[0]) desks[0].items = [
    { id: dkId(), type: "folder", name: t("dkSeedPatients"), c: 0, r: 0, kids: [doc("Bilan_Martin_Dupont.pdf", 842e3, 3), doc("Suivi_seances_octobre.xlsx", 96e3, 1)] },
    doc("Project_roadmap_Q4_2026.pdf", 2.1e6, 2, 0, 1), doc("Client_requirements_Clinique_du_Lac.docx", 348e3, 5, 0, 2),
    { id: dkId(), type: "app", app: "Keep Flow", c: 1, r: 0 }, { id: dkId(), type: "app", app: "meetings", c: 1, r: 1 }];
  if (desks[1]) desks[1].items = [
    { id: dkId(), type: "folder", name: t("dkSeedDocs"), c: 0, r: 0, kids: [doc("Technical_architecture.md", 24e3, 7), doc("Meeting_notes_Product_Team.md", 12e3, 3)] },
    { id: dkId(), type: "folder", name: t("dkSeedTemplates"), c: 0, r: 1, kids: [] },
    doc("Budget_2026.xlsx", 188e3, 4, 1, 0), doc("Pitch_Remotion_OS.pptx", 5.4e6, 6, 1, 1),
    { id: dkId(), type: "app", app: "analytics", c: 2, r: 0 }, { id: dkId(), type: "app", app: "commerce", c: 2, r: 1 }, { id: dkId(), type: "link", name: t("dkSiteName"), url: "https://remotion.io", c: 3, r: 0 }];
  flags.set("remotion-dk-v1");
  return true;
}

/** Design seed v2 (L11766–L11782): replaces desktop 1 items once (defect D-B16 reproduced). */
export function seedV2(desks: Desk[], t: T, flags: Flags) {
  if (flags.has("remotion-dk-v2") || !desks[0]) return false;
  const now = Date.now(), day = 864e5;
  const doc = (name: string, size: number, ago: number, extra: Partial<Item> = {}): Item => ({ id: dkId(), type: "doc", name, size, mod: now - ago * day - 3600e3 * ((ago * 7) % 9), ...extra });
  const rm: Item = { id: dkId(), type: "folder", name: "ReMotion", mod: now - day, kids: [
    { id: dkId(), type: "folder", name: "Design", mod: now - day, kids: [doc("Logo_Remotion.svg", 18e3, 3), doc("Palette.png", 420e3, 4)] },
    { id: dkId(), type: "folder", name: "Documentation", mod: now - 2 * day, kids: [doc("Guide_utilisateur.docx", 680e3, 2)] },
    { id: dkId(), type: "folder", name: t("sdMockups"), mod: now - 3 * day, kids: [doc("Ecran_accueil.png", 1.2e6, 3), doc("Ecran_dossier_patient.png", 1.4e6, 3)] },
    doc("Roadmap.pdf", 2.4e6, 3, { tags: ["roadmap", "planning", "2026"] }), doc("Planning.xlsx", 320e3, 4, { tags: ["planning"] }), doc("Présentation.pptx", 5.8e6, 4), doc("Notes.md", 14e3, 5), doc("Architecture.drawio", 96e3, 6)] };
  desks[0].items = [
    { id: dkId(), type: "folder", name: t("sdProjects"), c: 0, r: 0, mod: now - day, kids: [rm] },
    { id: dkId(), type: "folder", name: t("sdTasks"), col: "y", c: 0, r: 1, mod: now - 2 * day, kids: [doc("Checklist_semaine.md", 6e3, 1)] },
    { id: dkId(), type: "folder", name: t("dkSeedDocs"), col: "y", c: 0, r: 2, mod: now - 3 * day, kids: [doc("Contrat_Clinique_du_Lac.pdf", 880e3, 6), doc("Budget_2026.xlsx", 188e3, 4)] },
    doc("Rapport.pdf", 1.6e6, 1, { c: 0, r: 3 }),
    { id: dkId(), type: "folder", name: t("sdPatients"), c: 0, r: 4, mod: now - day, kids: [doc("Bilan_Martin_Dupont.pdf", 842e3, 3), doc("fiche_evaluation_vph.pdf", 2.4e6, 1)] },
    { id: dkId(), type: "app", app: "remotionAI", c: 0, r: 5 }];
  desks[0].w = true; flags.set("remotion-dk-v2");
  return true;
}

/** Per-app first-run seeds, in source script order. Forms (L13595) fills column 0 downwards without wrap; the others wrap after row 5. */
export const APP_SEEDS: { flag: string; app: string; install: "undef0" | "falsy"; wrap: boolean }[] = [
  { flag: "remotion-dk-v3", app: "forms", install: "undef0", wrap: false },
  { flag: "remotion-dk-calc1", app: "calcsci", install: "undef0", wrap: true },
  { flag: "remotion-dk-bill1", app: "billing", install: "undef0", wrap: true },
  { flag: "remotion-dk-hr1", app: "hrPeople", install: "undef0", wrap: true },
  { flag: "remotion-dk-pa1", app: "patients", install: "falsy", wrap: true },
  { flag: "remotion-dk-cb1", app: "cabinet", install: "falsy", wrap: true },
  { flag: "remotion-dk-pl1", app: "planning", install: "falsy", wrap: true },
];
export function seedApp(desks: Desk[], al: AppStore, s: (typeof APP_SEEDS)[number], flags: Flags) {
  if (flags.has(s.flag)) return { desks: false, apps: false };
  let apps = false;
  if (s.install === "undef0" ? al.inst[s.app] === undefined || al.inst[s.app] === 0 : !al.inst[s.app]) { al.inst[s.app] = 1; apps = true; }
  const d0 = desks[0]; let dk = false;
  if (d0 && !(d0.items || []).some((it) => it.type === "app" && it.app === s.app)) {
    d0.items = d0.items || []; const used = new Set(d0.items.map((it) => it.c + "," + it.r));
    let c = 0, r = 0;
    if (!s.wrap) { while (used.has("0," + r)) r++; }
    else for (;;) { if (!used.has(c + "," + r)) break; r++; if (r > 5) { r = 0; c++; } }
    d0.items.push({ id: dkId(), type: "app", app: s.app, c, r }); dk = true;
  }
  flags.set(s.flag);
  return { desks: dk, apps };
}

export interface Flags { has(k: string): boolean; set(k: string): void }

/** Source fsData seed (L11785–L11792). */
export function seedFs(): FsData {
  const now = Date.now(), day = 864e5, doc = (name: string, size: number, ago: number): Item => ({ id: dkId(), type: "doc", name, size, mod: now - ago * day });
  return {
    documents: [{ id: dkId(), type: "folder", name: "Rapports médicaux", mod: now - 2 * day, kids: [doc("Bilan_2026.pdf", 640e3, 2)] }, doc("CV_Nassim.docx", 120e3, 20), doc("Contrat_Clinique.pdf", 880e3, 9), doc("Budget_2026.xlsx", 188e3, 4)],
    downloads: [doc("fiche_evaluation_vph.pdf", 2.4e6, 1), doc("Facture_0925.pdf", 96e3, 12), doc("Logo_Remotion.png", 64e3, 15)],
    images: [doc("Photo_equipe.jpg", 3.2e6, 30), doc("Schema_parcours.png", 540e3, 8), doc("Capture_ecran.png", 820e3, 2)],
    videos: [doc("Demo_Remotion.mp4", 48e6, 5), doc("Exercices_reeducation.mp4", 120e6, 14)],
    music: [doc("Ambiance_cabinet.mp3", 6.4e6, 40)],
    shared: [{ id: dkId(), type: "folder", name: "Clinique du Lac", mod: now - day, kids: [doc("Exigences_client.docx", 348e3, 5)] }, doc("Planning_partage.xlsx", 210e3, 2)],
  };
}

/* ---------------- geometry (L11280–L11309) ---------------- */
export const DK_PAD = 14;
export const DK_SIZES: Record<string, [number, number]> = { s: [78, 88], m: [94, 104], l: [112, 124] };
export interface Rect { left: number; top: number; right: number; bottom: number; width: number; height: number }
export interface Geo { L: Rect; cols: number; rows: number; rtl: boolean; blocks: Rect[]; cw: number; ch: number }
export function dkXY(g: Geo, c: number, r: number) { return { x: g.rtl ? g.L.width - DK_PAD - (c + 1) * g.cw : DK_PAD + c * g.cw, y: DK_PAD + r * g.ch }; }
export function dkBlocked(g: Geo, c: number, r: number) {
  if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return true;
  const { x, y } = dkXY(g, c, r), ax = g.L.left + x, ay = g.L.top + y;
  return g.blocks.some((b) => ax < b.right + 8 && ax + g.cw > b.left - 8 && ay < b.bottom + 8 && ay + g.ch > b.top - 8);
}
export function dkFree(g: Geo, items: Item[], c: number, r: number, ignore?: Set<string>) {
  if (dkBlocked(g, c, r)) return false;
  return !items.some((it) => !ignore?.has(it.id) && it.c === c && it.r === r);
}
export function dkNearest(g: Geo, items: Item[], c: number, r: number, ignore?: Set<string>, taken?: Set<string>): [number, number] | null {
  let best: [number, number] | null = null, bd = 1e9;
  for (let cc = 0; cc < g.cols; cc++) for (let rr = 0; rr < g.rows; rr++) {
    if (taken?.has(cc + "," + rr) || !dkFree(g, items, cc, rr, ignore)) continue;
    const d = (cc - c) ** 2 * 1.2 + (rr - r) ** 2; if (d < bd) { bd = d; best = [cc, rr]; }
  }
  return best;
}
/** Keeps every icon on a valid, unique cell (L11300). Mutates; returns true when something moved. */
export function dkFix(g: Geo, items: Item[]) {
  const taken = new Set<string>(); let changed = false;
  for (const it of items) {
    const k = it.c + "," + it.r;
    if (it.c == null || dkBlocked(g, it.c, it.r!) || taken.has(k)) {
      const n = dkNearest(g, items, it.c ?? 0, it.r ?? 0, new Set(items.filter((x) => !taken.has(x.c + "," + x.r) && x !== it).map((x) => x.id)), taken) || [0, 0];
      it.c = n[0]; it.r = n[1]; changed = true;
    }
    taken.add(it.c + "," + it.r);
  }
  return changed;
}
export function dkCellAt(g: Geo, x: number, y: number): [number, number] {
  const L = g.L; const c = Math.floor((g.rtl ? L.right - x - DK_PAD : x - L.left - DK_PAD) / g.cw), r = Math.floor((y - L.top - DK_PAD) / g.ch);
  return [Math.max(0, c), Math.max(0, r)];
}
/** Spatial keyboard navigation (L11400). */
export function dkNeighbour(g: Geo, items: Item[], it: Item, key: string) {
  const dir = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[key];
  if (!dir) return null; let [dc] = dir; const dr = dir[1]; if (g.rtl) dc = -dc;
  let best: Item | null = null, bd = 1e9;
  for (const o of items) { if (o === it) continue; const vc = o.c! - it.c!, vr = o.r! - it.r!; if (vc * dc + vr * dr <= 0) continue; const dd = Math.abs(vc) + Math.abs(vr) + (dc ? Math.abs(vr) * 2 : Math.abs(vc) * 2); if (dd < bd) { bd = dd; best = o; } }
  return best;
}
/** Source fmtSize (L11459). */
export const fmtSize = (b: number | null | undefined, nf: (n: number) => string) => { if (b == null) return "—"; const u = ["B", "KB", "MB", "GB"]; let i = 0; while (b >= 1024 && i < 3) { b /= 1024; i++; } return nf(Math.round(b * 10) / 10) + " " + u[i]; };
