/** Extra result providers for the OS search palette (v94: patients open straight into their Dossier). Shown before the base results. */
export type PalExtra = { g: string; label: string; iconHtml: string; iconBg?: string; combo?: string; run: () => void };
const PROVIDERS: ((q: string) => PalExtra[])[] = [];
/** `front`: a later wrapper in the HTML file that unshifts its rows (they come before the earlier providers' rows). */
export function addPaletteProvider(fn: (q: string) => PalExtra[], o: { front?: boolean } = {}) { if (o.front) PROVIDERS.unshift(fn); else PROVIDERS.push(fn); }
export function paletteExtras(q: string): PalExtra[] { const out: PalExtra[] = []; for (const f of PROVIDERS) { try { out.push(...f(q)); } catch { /* a provider never breaks the palette */ } } return out; }
