// Build-time fix (the legacy CSS files stay byte-identical): the source declares `backdrop-filter` and
// `-webkit-backdrop-filter` side by side; Lightning CSS (Turbopack) then keeps only the prefixed one, which Chromium
// ignores, so every glass surface lost its blur. Dropping the prefixed duplicate lets Lightning CSS keep the standard
// property (and add the prefix itself where the browser targets need it).
const dropWebkitBackdropDuplicate = () => ({
  postcssPlugin: "drop-webkit-backdrop-duplicate",
  Declaration: {
    "-webkit-backdrop-filter": (d) => { if (d.parent?.some((x) => x.type === "decl" && x.prop === "backdrop-filter")) d.remove(); },
  },
});
dropWebkitBackdropDuplicate.postcss = true;
// Build-time fix 2: Lightning CSS moves a `font` shorthand AFTER the longhands it resets (e.g. `font-variant-numeric`
// declared after `font:` in `.lk-left .lock-time`), so the longhand is lost (the lock clock lost its tabular digits).
// Such longhands are moved into a copy of the rule placed right after it, with `:where(*)` appended to each selector
// (same specificity, later in the cascade, and not merged back by the minifier).
const RESET_BY_FONT = /^font-(variant(-[a-z]+)?|feature-settings|kerning|variation-settings|optical-sizing|size-adjust|language-override)$/;
const keepLonghandsAfterFont = () => ({
  postcssPlugin: "keep-longhands-after-font",
  Rule(rule) {
    if (rule.selectors.some((s) => s.includes("::") || s.includes(":where(*)"))) return;
    let seen = false; const moved = [];
    rule.each((d) => { if (d.type !== "decl") return; if (d.prop === "font") seen = true; else if (seen && RESET_BY_FONT.test(d.prop)) moved.push(d); });
    if (!moved.length) return;
    const copy = rule.clone({ selectors: rule.selectors.map((s) => s + ":where(*)") }); copy.removeAll();
    moved.forEach((d) => { copy.append(d.clone()); d.remove(); });
    rule.after(copy);
  },
});
keepLonghandsAfterFont.postcss = true;
const config = { plugins: [dropWebkitBackdropDuplicate, keepLonghandsAfterFont] };
export default config;
