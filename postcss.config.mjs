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
const config = { plugins: [dropWebkitBackdropDuplicate] };
export default config;
