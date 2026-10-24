/**
 * Data safety (Remotion OS v93, ported in catch-up slice S3). Same behaviour as the HTML file (v94 L12935–L13022):
 *
 * - A saved app store that cannot be read (damaged, or written by a newer version) is no longer silently replaced by the
 *   demo data: a backup copy "<key>::secours" is kept first, and a banner says so (download / delete the copy).
 *   If even the backup cannot be stored (storage full), that store is not overwritten at all until the copy is downloaded.
 * - Browser storage full: the banner says that the last change was not saved; a warning appears once when it is nearly full.
 * - Two tabs: when another tab saves a store, this tab reloads it if that app is closed here. If this tab is about to
 *   overwrite changes saved by another tab, the other tab's version is kept as a backup first and can be restored.
 *
 * It works by wrapping Storage.prototype.getItem / setItem for localStorage, as the HTML does, so every app (ported as an
 * island that calls localStorage directly) is covered without changing its code. Apps register how to reload themselves.
 */
import { useWm } from "@/os/windows/wm";
import { isLang, type Lang } from "@/lib/i18n/langs";

type Store = { n: string; ok: (s: Record<string, unknown> | null) => boolean; w: string };
/** The app stores watched (v94 SD_STORES). Documents is not listed: its store lives in IndexedDB with its own conflict check. */
export const SD_STORES: Record<string, Store> = {
  "remotion-patients": { n: "Patients|Patients|Patienten|المرضى", ok: (s) => !!s && s.v === 1 && Array.isArray(s.pats), w: "patients" },
  "remotion-calendar": { n: "Agenda|Calendar|Kalender|التقويم", ok: (s) => !!s && s.v === 1 && Array.isArray(s.appts), w: "calendar" },
  "remotion-billing": { n: "Facturation|Billing|Abrechnung|الفوترة", ok: (s) => !!s && s.v === 1, w: "billing" },
  "remotion-cabinet": { n: "Cabinet|Practice|Praxis|العيادة", ok: (s) => !!s && s.v === 1 && typeof s.visits === "object", w: "cabinet" },
  "remotion-planning": { n: "Planning|Planning|Planung|التخطيط", ok: (s) => !!s && s.v === 1 && Array.isArray(s.wait), w: "planning" },
  "remotion-hr": { n: "RH|HR|Personal|الموارد البشرية", ok: (s) => !!s && s.v === 1 && Array.isArray(s.emps), w: "hrPeople" },
  "remotion-dossier": { n: "Dossier|Record|Akte|الملف", ok: (s) => !!s && s.v === 1, w: "dossier" },
  "remotion-forms": { n: "Formulaires|Forms|Formulare|النماذج", ok: (s) => !!s && s.v === 1 && !!s.docs && Array.isArray(s.forms), w: "forms" },
};
export const SD_BAK = "::secours", SD_INFO = "::secours-info";
const RELOAD: Record<string, () => void> = {};
/** An app says how to drop its cached state and read the store again (called when another tab saved it and the app is closed). */
export function sdOnReload(key: string, fn: () => void) { RELOAD[key] = fn; }

type Msg = { id: string; key?: string; k?: string; text: string; lvl: "warn" | "err" | "info"; btns?: [string, string][] };
const SD = { seen: {} as Record<string, string | null>, okRaw: {} as Record<string, string>, block: {} as Record<string, { raw: string; why: string }>, msgs: [] as Msg[], warned: 0, quotaAt: 0, nearAt: 0, on: false };
const lang = (): Lang => { const h = document.documentElement.lang; return isLang(h) ? h : "en"; };
const L4 = (s: string) => { const p = s.split("|"); return p[{ fr: 0, en: 1, de: 2, ar: 3 }[lang()] ?? 0] || p[0]; };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const W: Record<string, string> = {
  bad: "{a} : les données enregistrées sont illisibles. Une copie de secours a été gardée avant de repartir des données de démonstration.|{a}: the saved data could not be read. A backup copy was kept before starting again from demo data.|{a}: Die gespeicherten Daten sind nicht lesbar. Vor dem Neustart mit Demodaten wurde eine Sicherungskopie angelegt.|{a}: تعذّرت قراءة البيانات المحفوظة. حُفظت نسخة احتياطية قبل البدء من بيانات العرض.",
  newer: "{a} : les données ont été enregistrées par une version plus récente. Une copie de secours a été gardée ; cette version ne peut pas les lire.|{a}: the data was saved by a newer version. A backup copy was kept; this version cannot read it.|{a}: Die Daten stammen aus einer neueren Version. Eine Sicherungskopie wurde angelegt; diese Version kann sie nicht lesen.|{a}: حُفظت البيانات بإصدار أحدث. حُفظت نسخة احتياطية؛ لا يستطيع هذا الإصدار قراءتها.",
  other: "{a} : un autre onglet avait enregistré des modifications que cet onglet allait remplacer. Elles sont gardées dans une copie de secours.|{a}: another tab had saved changes that this tab was about to replace. They are kept in a backup copy.|{a}: Ein anderer Tab hatte Änderungen gespeichert, die dieser Tab überschrieben hätte. Sie sind in einer Sicherungskopie erhalten.|{a}: حفظ تبويب آخر تعديلات كان هذا التبويب سيستبدلها. حُفظت في نسخة احتياطية.",
  blocked: "{a} : la copie de secours n’a pas pu être enregistrée (stockage plein). Pour ne rien perdre, cette application n’enregistre plus rien tant que vous n’avez pas téléchargé la copie.|{a}: the backup copy could not be stored (storage full). To lose nothing, this app saves nothing until you download the copy.|{a}: Die Sicherungskopie konnte nicht gespeichert werden (Speicher voll). Damit nichts verloren geht, speichert diese App nichts, bis Sie die Kopie herunterladen.|{a}: تعذّر حفظ النسخة الاحتياطية (التخزين ممتلئ). لكي لا يضيع شيء، لن يحفظ هذا التطبيق أي شيء حتى تنزّل النسخة.",
  quota: "Stockage du navigateur plein : la dernière modification n’a pas été enregistrée{a}.|Browser storage is full: the last change was not saved{a}.|Browser-Speicher voll: Die letzte Änderung wurde nicht gespeichert{a}.|تخزين المتصفح ممتلئ: لم يُحفظ آخر تعديل{a}.",
  near: "Stockage du navigateur presque plein ({a} %). Supprimez des copies de secours ou des pièces jointes volumineuses.|Browser storage nearly full ({a} %). Delete backup copies or large attachments.|Browser-Speicher fast voll ({a} %). Löschen Sie Sicherungskopien oder große Anhänge.|تخزين المتصفح شبه ممتلئ ({a} %). احذف النسخ الاحتياطية أو المرفقات الكبيرة.",
  kept: "Copies de secours conservées : {a}.|Backup copies kept: {a}.|Gespeicherte Sicherungskopien: {a}.|نسخ احتياطية محفوظة: {a}.",
  dl: "Télécharger la copie|Download the copy|Kopie herunterladen|تنزيل النسخة", del: "Supprimer la copie|Delete the copy|Kopie löschen|حذف النسخة",
  useOther: "Garder la version de l’autre onglet|Keep the other tab’s version|Version des anderen Tabs behalten|الاحتفاظ بنسخة التبويب الآخر",
  unblock: "J’ai la copie : reprendre l’enregistrement|I have the copy: resume saving|Ich habe die Kopie: Speichern fortsetzen|لدي النسخة: استئناف الحفظ",
  close: "Fermer|Close|Schließen|إغلاق", title: "Données|Data|Daten|البيانات",
};
const sdW = (k: string) => L4(W[k] || k);
const sdName = (k: string) => L4(SD_STORES[k]?.n || k);
/* Outside a browser (unit tests, server render) there is no Storage class: plain calls on the given object. */
type SP = { getItem(this: Storage, k: string): string | null; setItem(this: Storage, k: string, v: string): void; removeItem(this: Storage, k: string): void };
const P: SP = typeof Storage !== "undefined" ? Storage.prototype : { getItem(k) { return this.getItem(k); }, setItem(k, v) { this.setItem(k, v); }, removeItem(k) { this.removeItem(k); } };
const _get = P.getItem, _set = P.setItem, _rem = P.removeItem;
const ls = () => { try { return window.localStorage; } catch { return null; } };

export function sdQuotaErr(e: unknown) { const x = e as { name?: string; code?: number; message?: string } | null; return !!x && (x.name === "QuotaExceededError" || x.code === 22 || x.code === 1014 || /quota/i.test(x.message || "")); }
export function sdFp(raw: string) { let h = 0; for (let i = 0; i < raw.length; i += Math.max(1, raw.length >> 12)) h = (h * 31 + raw.charCodeAt(i)) | 0; return raw.length + ":" + h; }
type Info = Record<string, { at: string; why: string; size: number }> & { __ack?: Record<string, string> };
function sdInfo(): Info { try { return (JSON.parse(_get.call(localStorage, SD_INFO) || "{}") || {}) as Info; } catch { return {} as Info; } }
/** Keeps one backup per store; false if it could not be stored (the store is then blocked). */
function sdRescue(k: string, raw: string, why: string) {
  const info = sdInfo();
  try { _set.call(localStorage, k + SD_BAK, raw); info[k] = { at: new Date().toISOString(), why, size: raw.length }; _set.call(localStorage, SD_INFO, JSON.stringify(info)); return true; }
  catch { try { _rem.call(localStorage, k + SD_BAK); } catch { /* nothing to remove */ } SD.block[k] = { raw, why }; return false; }
}
function sdDownload(k: string) {
  const raw = SD.block[k]?.raw ?? _get.call(localStorage, k + SD_BAK); if (raw == null) return;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
  a.download = `remotion-copie-${k.replace(/^remotion-/, "")}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
/** A copy the person deleted is not made again for the same data. */
function sdDelete(k: string) {
  try { const raw = _get.call(localStorage, k + SD_BAK); _rem.call(localStorage, k + SD_BAK); const i = sdInfo(); delete i[k]; if (raw != null) { i.__ack = i.__ack || {}; i.__ack[k] = sdFp(raw); } _set.call(localStorage, SD_INFO, JSON.stringify(i)); } catch { /* storage unavailable */ }
}
function sdBar() {
  let b = document.getElementById("sdBar");
  if (!b) {
    b = document.createElement("div"); b.id = "sdBar"; b.setAttribute("role", "alert"); b.setAttribute("aria-label", sdW("title")); document.body.appendChild(b);
    b.addEventListener("click", (e) => {
      const x = (e.target as Element).closest<HTMLElement>("[data-sd]"); if (!x) return;
      const k = x.dataset.k || "", act = x.dataset.sd, id = x.closest<HTMLElement>(".sd-m")?.dataset.id || "";
      if (act === "dl") sdDownload(k);
      else if (act === "del") { sdDelete(k); sdDrop(id); }
      else if (act === "other") { const raw = _get.call(localStorage, k + SD_BAK); if (raw != null) { try { _set.call(localStorage, k, raw); SD.seen[k] = raw; sdDelete(k); setTimeout(() => location.reload(), 50); } catch { /* storage full */ } } sdDrop(id); }
      else if (act === "unblock") { delete SD.block[k]; sdDrop(id); }
      else if (act === "x") sdDrop(id);
    });
  }
  return b;
}
function sdDrop(id: string) { SD.msgs = SD.msgs.filter((m) => m.id !== id); sdPaint(); }
function sdMsg(o: Omit<Msg, "id">) { if (o.key && SD.msgs.some((m) => m.key === o.key)) { sdPaint(); return; } SD.msgs.push({ id: "m" + Math.random().toString(36).slice(2, 8), ...o }); if (SD.msgs.length > 4) SD.msgs.shift(); setTimeout(sdPaint, 0); }
function sdPaint() {
  const b = sdBar(); b.hidden = !SD.msgs.length;
  b.innerHTML = SD.msgs.map((m) => `<div class="sd-m ${m.lvl || "warn"}" data-id="${m.id}"><p dir="auto">${esc(m.text)}</p><div class="sd-b">${(m.btns || []).map((x) => `<button type="button" class="sd-btn" data-sd="${x[0]}" data-k="${esc(m.k || "")}">${esc(x[1])}</button>`).join("")}<button type="button" class="sd-x" data-sd="x" aria-label="${esc(sdW("close"))}" title="${esc(sdW("close"))}">×</button></div></div>`).join("");
}
function sdReport(k: string, why: string) {
  const text = sdW(SD.block[k] ? "blocked" : why).split("{a}").join(sdName(k));
  const btns: [string, string][] = [["dl", sdW("dl")]];
  if (SD.block[k]) btns.push(["unblock", sdW("unblock")]); else { if (why === "other") btns.unshift(["other", sdW("useOther")]); btns.push(["del", sdW("del")]); }
  sdMsg({ key: k + why, k, text, lvl: SD.block[k] ? "err" : "warn", btns });
}
export function sdValid(k: string, raw: string): true | "newer" | "bad" {
  try { const s = JSON.parse(raw); return SD_STORES[k].ok(s) ? true : s && typeof s.v === "number" && s.v > 1 ? "newer" : "bad"; } catch { return "bad"; }
}
/** Storage use in characters (browsers allow about 5 million per site). */
function sdUse() { let n = 0; try { const L = localStorage; for (let i = 0; i < L.length; i++) { const k = L.key(i)!; n += k.length + (_get.call(L, k) || "").length; } } catch { /* unavailable */ } return n; }
let nearT = 0 as unknown as ReturnType<typeof setTimeout>;
function sdNear() { if (SD.warned || Date.now() - SD.nearAt < 10000) return; SD.nearAt = Date.now(); clearTimeout(nearT); nearT = setTimeout(() => { const p = Math.round(sdUse() / 5242880 * 100); if (p >= 85) { SD.warned = 1; sdMsg({ key: "near", text: sdW("near").split("{a}").join(String(p)), lvl: "warn" }); } }, 800); }

/** Installs the wrapper once (client only). */
export function installDataSafety() {
  if (SD.on || typeof window === "undefined") return; SD.on = true;
  /* reads: remember what this tab has seen; damaged data is backed up before the app replaces it */
  P.getItem = function (this: Storage, k: string) {
    const v = _get.call(this, k);
    try {
      if (SD_STORES[k] && this === ls()) {
        SD.seen[k] = v;
        if (v != null && !SD.block[k] && SD.okRaw[k] !== v) {
          const r = sdValid(k, v);
          if (r === true) SD.okRaw[k] = v;
          else { const prev = _get.call(this, k + SD_BAK); const ack = (sdInfo().__ack || {})[k]; if (prev !== v && ack !== sdFp(v)) { sdRescue(k, v, r); setTimeout(() => sdReport(k, r), 0); } }
        }
      }
    } catch { /* never break a read */ }
    return v;
  };
  /* writes: blocked stores are not overwritten; another tab's newer save is backed up first; storage full is reported */
  P.setItem = function (this: Storage, k: string, v: string) {
    if (this !== ls()) return _set.call(this, k, v);
    if (SD_STORES[k]) {
      if (SD.block[k]) { sdReport(k, SD.block[k].why); throw new DOMException("Backup pending", "QuotaExceededError"); }
      try {
        const cur = _get.call(this, k);
        if (Object.prototype.hasOwnProperty.call(SD.seen, k) && cur != null && cur !== SD.seen[k] && cur !== String(v) && sdValid(k, cur) === true) {
          if (sdRescue(k, cur, "other")) sdReport(k, "other"); else { sdReport(k, "other"); throw new DOMException("Backup pending", "QuotaExceededError"); }
        }
      } catch (e) { if (e instanceof DOMException) throw e; }
    }
    try { _set.call(this, k, v); }
    catch (e) { if (sdQuotaErr(e) && Date.now() - SD.quotaAt > 1500) { SD.quotaAt = Date.now(); const app = SD_STORES[k] ? ` (${sdName(k)})` : ""; sdMsg({ key: "quota" + k, text: sdW("quota").split("{a}").join(app), lvl: "err" }); } throw e; }
    if (SD_STORES[k]) SD.seen[k] = String(v);
    sdNear();
    return undefined;
  };
  /* other tabs: an app closed here reloads (open apps already reload themselves) */
  addEventListener("storage", (e) => {
    try { if (e.storageArea !== ls() || !e.key || !SD_STORES[e.key]) return; const S = SD_STORES[e.key]; if (useWm.getState().wins[S.w]) return; RELOAD[e.key]?.(); } catch { /* ignore */ }
  });
  /* at start: say which backup copies exist (they take storage space) */
  setTimeout(() => {
    const i = sdInfo();
    Object.keys(i).filter((k) => k !== "__ack" && SD_STORES[k] && _get.call(localStorage, k + SD_BAK) != null && !SD.msgs.some((m) => m.k === k))
      .forEach((k) => sdMsg({ key: "kept" + k, k, text: sdW("kept").split("{a}").join(sdName(k) + " · " + new Date(i[k].at).toLocaleString()), lvl: "info", btns: [["dl", sdW("dl")], ["del", sdW("del")]] }));
    sdNear();
  }, 1500);
}
/** For tests and the merge rule: what this tab last saw of a key (raw), and whether another tab changed it since. */
export const sdSeen = (k: string) => SD.seen[k];
export const sdRawGet = (k: string) => _get.call(localStorage, k);
