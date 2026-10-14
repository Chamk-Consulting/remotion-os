/**
 * Turns one of the source's static SVG strings into a real <svg> element (exact DOM, no wrapper), keeping its attributes.
 * Only used for trusted constants copied from the source icon maps.
 */
const ATTR: Record<string, string> = { class: "className", "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin", "fill-rule": "fillRule", "clip-rule": "clipRule", "stroke-dasharray": "strokeDasharray", "stroke-miterlimit": "strokeMiterlimit", "aria-hidden": "aria-hidden", viewbox: "viewBox" };
const cache = new Map<string, { attrs: Record<string, string>; inner: string }>();
function parse(html: string) {
  let c = cache.get(html); if (c) return c;
  const m = /^\s*<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(html);
  if (!m) throw new Error("not an svg string");
  const attrs: Record<string, string> = {};
  for (const a of m[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) attrs[ATTR[a[1]] ?? a[1]] = a[2];
  c = { attrs, inner: m[2] }; cache.set(html, c); return c;
}
export function SvgString({ html }: { html: string }) {
  const { attrs, inner } = parse(html);
  return <svg {...attrs} dangerouslySetInnerHTML={{ __html: inner }} />;
}
