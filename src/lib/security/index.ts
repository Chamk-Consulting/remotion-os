/**
 * Security of imports (Remotion OS v92, ported in catch-up slice S1).
 *
 * One allow-list sanitizer for every imported or pasted HTML, URL checks for links and pictures, font / colour / language
 * checks for imported styles, CSV cells that a spreadsheet would run as a formula, and pdf.js always without eval
 * (CVE-2024-4367). Same rules as the HTML file (v94 L29327–L29476), typed.
 */

const TAG_DROP = "script,style,iframe,frame,frameset,object,embed,applet,link,meta,base,noscript,template,portal,foreignObject,form,input,button,textarea,select,option,dialog";
const URL_ATTR = new Set(["href", "src", "xlink:href", "action", "formaction", "background", "poster", "data", "cite", "ping", "lowsrc", "dynsrc", "longdesc", "usemap", "manifest", "codebase", "srcset"]);

/** A URL kept only for an allow-list of protocols (checked after removing control characters and spaces). "" = refused. */
export function secUrl(v: unknown, img?: boolean): string {
  const s = String(v ?? "");
  const n = s.replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, "").toLowerCase();
  const m = /^([a-z][a-z0-9+.\-]*):/.exec(n);
  if (!m) return s; /* relative, #anchor, @placeholder */
  const p = m[1];
  if (p === "http" || p === "https") return s.replace(/["<>\s`]/g, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase());
  if (!img && (p === "mailto" || p === "tel")) return s;
  if (p === "data" && /^data:image\/(png|jpe?g|gif|webp|bmp|avif|svg\+xml)[;,]/.test(n)) return s;
  if (p === "blob" && img) return s;
  return "";
}

/** Cleans a parsed tree in place: dangerous elements, every on* attribute, unsafe URLs and style tricks removed. */
export function secCleanTree<T extends ParentNode | Document | DocumentFragment | null | undefined>(root: T): T {
  if (!root || !(root as ParentNode).querySelectorAll) return root;
  const R = root as ParentNode;
  R.querySelectorAll(TAG_DROP).forEach((x) => { /* form controls: keep their text, drop the control */
    if (/^(form|button|dialog)$/i.test(x.localName)) { const p = x.parentNode; if (p) { while (x.firstChild) p.insertBefore(x.firstChild, x); p.removeChild(x); } } else x.remove();
  });
  R.querySelectorAll("animate,set,animateMotion,animateTransform").forEach((x) => { if (/href|xlink/i.test(x.getAttribute("attributeName") || "")) x.remove(); });
  R.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((a) => {
      const n = a.name.toLowerCase(), ln = (a.localName || n).toLowerCase();
      if (n.startsWith("on") || n === "srcdoc" || n === "is" || n === "formaction" || n === "action") { el.removeAttribute(a.name); return; }
      if (URL_ATTR.has(n) || URL_ATTR.has(ln)) {
        if (n === "srcset" || ln === "srcset") { el.removeAttribute(a.name); return; }
        const img = /^(img|image|source|video|audio|picture)$/i.test(el.localName) && ln === "src";
        const v = secUrl(a.value, img);
        if (v === "" && a.value !== "") el.removeAttribute(a.name);
      } else if (n === "style" && /expression\s*\(|javascript:|-moz-binding|behavior\s*:/i.test(a.value)) el.removeAttribute(a.name);
    });
  });
  return root;
}

/** Cleans an HTML string. A template is inert: nothing in it loads or runs while it is cleaned. */
export function secClean(html: unknown): string {
  const tp = document.createElement("template");
  tp.innerHTML = String(html ?? "");
  secCleanTree(tp.content);
  return tp.innerHTML;
}

export const secFont = (f: unknown): string | null | undefined => (f == null ? (f as null | undefined) : String(f).replace(/[^\p{L}\p{N} _.\-]/gu, "").trim().slice(0, 64) || null);
export const secColor = (c: unknown): string | null | undefined => (c == null || c === "" ? (c as null | undefined) : /^(#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|hsl)a?\([\d\s.,%/]+\))$/i.test(String(c).trim()) ? String(c).trim() : null);
export const secLang = (l: unknown): string | null | undefined => (l == null ? (l as null | undefined) : /^[a-z]{2}(-[a-z0-9]{2,8})?$/i.test(String(l)) ? String(l) : null);

const URL_KEY = /^(src|img|image|url|href|link|logo|sig|signature|photo|avatar|file|poster)$/i;
const IMG_KEY = /^(src|img|image|logo|sig|signature|photo|avatar|poster)$/i;

/** Cleans an imported document object before its first preview: block HTML, picture / link addresses, fonts, colours, language. */
export function secDoc<T>(d: T): T {
  const walk = (o: Record<string, unknown>, depth: number) => {
    if (!o || typeof o !== "object" || depth > 14) return;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === "string") {
        if (k === "html") o[k] = secClean(v);
        else if (URL_KEY.test(k)) o[k] = secUrl(v, IMG_KEY.test(k));
        else if (/^(font|ff|family)$/i.test(k)) o[k] = v.replace(/["'<>;{}\\()]/g, "").slice(0, 120);
        else if (k === "lang") o[k] = secLang(v) || "";
        else if (k === "dir" && !/^(ltr|rtl|auto)$/.test(v)) o[k] = "auto";
      } else if (v && typeof v === "object") walk(v as Record<string, unknown>, depth + 1);
    }
  };
  try {
    walk(d as unknown as Record<string, unknown>, 0);
    const S = (d as unknown as { set?: Record<string, unknown> })?.set;
    if (S) {
      if (S.font != null) S.font = secFont(S.font) || "Inter";
      ["acc", "hcol"].forEach((k) => { if (S[k] != null && S[k] !== "acc") { const c = secColor(S[k]); if (c == null) delete S[k]; else S[k] = c; } });
    }
  } catch { /* a document that cannot be walked is left as it is */ }
  return d;
}

/** CSV: a cell starting with = + - @ (or tab / CR) is run as a formula by spreadsheets; it is prefixed with ' (numbers are kept). */
export function secCsv(c: unknown): string {
  if (c == null) return "";
  if (typeof c === "number") return String(c);
  const s = String(c);
  return /^[=+\-@\t\r]/.test(s) && !/^[-+]?\d[\d\s.,]*%?$/.test(s) ? "'" + s : s;
}

type PdfJsLike = { getDocument: (src: unknown) => unknown; __sec?: number };
/**
 * pdf.js: every getDocument() call gets isEvalSupported:false, whatever the caller passes (CVE-2024-4367).
 * The library exposes read-only getters, so the wrapper is a new object that inherits from it.
 */
export function secWrapPdf(w: Window = window): void {
  const W0 = w as unknown as { pdfjsLib?: PdfJsLike };
  const lib = W0.pdfjsLib;
  if (!lib || lib.__sec) return;
  const gd = lib.getDocument;
  const W = Object.create(lib) as PdfJsLike;
  Object.defineProperty(W, "__sec", { value: 1 });
  Object.defineProperty(W, "getDocument", {
    enumerable: true,
    value: function (src: unknown) {
      const o = src && typeof src === "object" && !(src instanceof ArrayBuffer) && !ArrayBuffer.isView(src) ? Object.assign({}, src) : { data: src };
      (o as Record<string, unknown>).isEvalSupported = false;
      return gd.call(lib, o);
    },
  });
  W0.pdfjsLib = W;
}
