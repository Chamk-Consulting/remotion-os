// Converts static source markup (L6857–L7177) into JSX fragments with identical ids, classes, attributes and SVG paths.
// data-i18n / data-i18n-aria / data-i18n-ph become t() calls (same keys), so text is identical in every language.
import fs from "node:fs";
import { parseDocument } from "htmlparser2";

const SRC = fs.readFileSync(new URL("../../source/Remotion_Desktop.html", import.meta.url), "utf8").split("\n");
const markup = SRC.slice(6856, 7177).join("\n");
const doc = parseDocument(markup, { lowerCaseAttributeNames: false, recognizeSelfClosing: true });

const ATTR = { class: "className", for: "htmlFor", tabindex: "tabIndex", readonly: "readOnly", maxlength: "maxLength", minlength: "minLength", autocomplete: "autoComplete", inputmode: "inputMode", autofocus: "autoFocus", spellcheck: "spellCheck", autocapitalize: "autoCapitalize", enterkeyhint: "enterKeyHint", contenteditable: "contentEditable", colspan: "colSpan", rowspan: "rowSpan", novalidate: "noValidate", "xlink:href": "xlinkHref", "xml:space": "xmlSpace", datetime: "dateTime", crossorigin: "crossOrigin", srcset: "srcSet" };
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const VOID = new Set(["input", "br", "img", "hr", "meta", "link", "source", "area", "col", "embed", "wbr"]);
const BOOL = new Set(["hidden", "disabled", "checked", "readonly", "required", "multiple", "selected", "autofocus", "novalidate", "open"]);
const esc = (s) => JSON.stringify(s);
let SLOTS = new Set();
export const setSlots = (ids) => { SLOTS = new Set(ids); };

function styleObj(s) {
  const o = {}; for (const decl of s.split(";")) { const i = decl.indexOf(":"); if (i < 0) continue; const k = decl.slice(0, i).trim(); const v = decl.slice(i + 1).trim(); if (!k) continue; o[k.startsWith("--") ? k : camel(k)] = v; }
  // Custom properties (--x) are not in React's CSSProperties type: cast those objects.
  if (Object.keys(o).some((k) => k.startsWith("--"))) return `{${esc(o)} as import("react").CSSProperties}`;
  return `{${esc(o).slice(1, -1)}}`.replace(/^\{/, "{{").replace(/\}$/, "}}");
}
function attrs(el) {
  const out = []; const a = el.attribs;
  for (const [k, v] of Object.entries(a)) {
    if (k === "data-i18n") { out.push(`data-i18n=${esc(v)}`); continue; }
    if (k === "data-i18n-aria") { out.push(`aria-label={t(${esc(v)})}`); continue; }
    if (k === "data-i18n-ph") { out.push(`placeholder={t(${esc(v)})}`); continue; }
    if (k === "style") { out.push(`style=${styleObj(v)}`); continue; }
    let name = ATTR[k] || (k.startsWith("data-") || k.startsWith("aria-") ? k : k.includes("-") ? camel(k) : k);
    if (BOOL.has(k) && (v === "" || v === k)) { out.push(name); continue; }
    if (k === "value" && el.name === "input") name = "defaultValue";
    if (k === "checked" && el.name === "input") name = "defaultChecked";
    out.push(`${name}=${esc(v)}`);
  }
  return out.length ? " " + out.join(" ") : "";
}
export function toJSX(node, ind = "") {
  if (node.type === "text") { const t = node.data; if (!t.trim()) return "{\" \"}"; return t.replace(/[{}<>]/g, (c) => `{${esc(c)}}`); }
  if (node.type === "comment") return "";
  if (node.type !== "tag" && node.type !== "script" && node.type !== "style") return "";
  const el = node; const i18n = el.attribs["data-i18n"];
  const id = el.attribs.id;
  const hook = id ? ` {...p(${esc(id)})}` : "";
  let kids = el.children.map((c) => toJSX(c, ind + "  ")).join("");
  if (/^(\{" "\})+$/.test(kids)) kids = "";
  let inner = i18n && !kids.trim() ? `{t(${esc(i18n)})}` : kids;
  const clsSlot = (el.attribs.class || "").split(" ").map((c) => "." + c).find((c) => SLOTS.has(c));
  const slotKey = id && SLOTS.has(id) ? id : clsSlot;
  if (slotKey) inner = `{s(${esc(slotKey)}, ${inner ? `<>${inner}</>` : "null"})}`;
  if (VOID.has(el.name)) return `<${el.name}${attrs(el)}${hook} />`;
  if (!inner) return `<${el.name}${attrs(el)}${hook}></${el.name}>`;
  return `<${el.name}${attrs(el)}${hook}>${inner}</${el.name}>`;
}
// Select top-level nodes by id/class and emit them.
const find = (pred, nodes = doc.children) => { for (const n of nodes) { if (n.type === "tag" && pred(n)) return n; const r = n.children ? find(pred, n.children) : null; if (r) return r; } return null; };
const byId = (id) => find((n) => n.attribs.id === id);
const bySel = (tag, cls) => find((n) => n.name === tag && (n.attribs.class || "").split(" ").includes(cls));
export const parts = { byId, bySel, toJSX };
// Boot-time DOM mutations the source performs on this static markup, applied at generation time (each cites its line).
function applySourceBootMutations() {
  // L10587: Remotion AI takes over the top-bar AI button.
  const ai = find((n) => n.attribs["data-t"] === "ai" && n.parent?.attribs?.class === "right");
  if (ai) {
    delete ai.attribs["data-t"]; ai.attribs.id = "aiBtn"; ai.attribs["aria-expanded"] = "false"; ai.attribs["aria-controls"] = "ai";
    ai.attribs.class = (ai.attribs.class || "").split(" ").filter((c) => c && c !== "hide-sm").join(" ");
    const svgs = ai.children.filter((c) => c.type === "tag" && c.name === "svg"); const last = ai.children.filter((c) => c.type === "tag").at(-1);
    if (last && last.name === "svg") last.attribs.class = ((last.attribs.class || "") + " chev").trim();
    void svgs;
  }
}
if (process.argv[2] === "--gen") {
  applySourceBootMutations();
  // Writes src/os/shell/generated/<Name>.tsx for each section. Slots = ids whose children are rendered by React state.
  const SECTIONS = [
    ["TopBarMarkup", "sel:header.top", ["wsLabel", "langMenu", "whoAv", "whoName", "whoRole", "bellBadge", "langCode"]],
    ["WorkspaceMenuMarkup", "id:wsMenu", ["wsList"]],
    ["WidgetsMarkup", "sel:section.widgets", ["temp", "time", "date", "fore", "evCount", "calTitle", "calGrid", "n3d", "t5d", ".notes"]],
    ["ShortcutsMarkup", "id:scDlg", ["scNav", "scBody"]],
    ["PaletteMarkup", "id:palette", ["palList"]],
    ["KeyboardMarkup", "id:kb", ["kbSugg", "kbKeys"]],
    ["LockMarkup", "id:lock", ["lockTime", "lockDate", "lkCard", "lkQ", "lkLangCode"]],
    ["LockAuthMarkup", "face:auth", ["lockAv", "lockName", "lockRole", "lkMsg", "unlockBtn", "lkEye"]],
    ["PowerMarkup", "id:power", ["powerMsg"]],
    ["SignInMarkup", "id:si", ["siLangCode", "siTheme", "siQ", "siScroll"]],
    ["RegisterMarkup", "id:rg", ["rgLangCode", "rgTheme"]],
  ];
  fs.mkdirSync("src/os/shell/generated", { recursive: true });
  for (const [name, sel, slots] of SECTIONS) {
    setSlots(slots);
    const [kind, val] = sel.split(":"); const n = kind === "id" ? byId(val) : kind === "face" ? find((x) => x.attribs["data-face"] === val) : bySel(...val.split("."));
    const jsx = toJSX(n);
    const out = `// GENERATED by tools/markup-to-jsx.mjs from Remotion_Desktop.html (${sel}). Do not edit by hand: re-run \`node tools/markup-to-jsx.mjs --gen\`.\nimport type { ReactNode } from "react";\nexport type MarkupProps = { t: (k: string) => string; p: (id: string) => Record<string, unknown>; s: (id: string, fallback: ReactNode) => ReactNode };\nexport function ${name}({ t, p, s }: MarkupProps) {\n  return (${jsx});\n}\n`;
    fs.writeFileSync(`src/os/shell/generated/${name}.tsx`, out);
    console.log(name, out.length);
  }
} else if (process.argv[2]) {
  const [kind, val] = process.argv[2].split(":");
  const n = kind === "id" ? byId(val) : bySel(...val.split("."));
  if (!n) { console.error("not found", process.argv[2]); process.exit(1); }
  process.stdout.write(toJSX(n));
}
