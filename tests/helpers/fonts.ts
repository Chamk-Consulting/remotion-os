import fs from "node:fs";
import path from "node:path";
import type { Page, BrowserContext } from "@playwright/test";

/**
 * Serves Google Fonts requests (Inter, Noto Sans Arabic) from the local @fontsource packages, so baselines and
 * comparisons use the REAL fonts even where fonts.googleapis.com is unreachable (audit sandbox; T-VIS-00).
 * Other families (Arimo, Tinos… used only by Documents "as is") are aborted and listed in the report.
 */
const FS = path.resolve(process.cwd(), "node_modules/@fontsource");
function cssFor(family: string, weights: string[]): string {
  const pkg = family === "Inter" ? "inter" : family === "Noto Sans Arabic" ? "noto-sans-arabic" : null;
  if (!pkg) return "";
  return weights.map((w) => fs.readFileSync(path.join(FS, pkg, `${w}.css`), "utf8")
    .replace(/url\(\.\/files\/([^)]+)\)/g, (_m, f) => `url(https://fonts.gstatic.com/__local/${pkg}/${f})`)).join("\n");
}
export async function serveGoogleFontsLocally(target: Page | BrowserContext) {
  await target.route(/fonts\.googleapis\.com\/css2/, (route) => {
    const u = new URL(route.request().url());
    const fams = u.searchParams.getAll("family");
    const css = fams.map((f) => { const [name, spec] = f.split(":"); const ws = (spec?.split("@")[1] || "400").split(";"); return cssFor(name, ws); }).join("\n");
    return route.fulfill({ status: 200, contentType: "text/css", body: css });
  });
  await target.route(/fonts\.gstatic\.com\/__local\//, (route) => {
    const p = new URL(route.request().url()).pathname.replace("/__local/", "");
    const file = path.join(FS, p.split("/")[0], "files", p.split("/").slice(1).join("/"));
    if (!fs.existsSync(file)) return route.abort();
    return route.fulfill({ status: 200, contentType: file.endsWith(".woff2") ? "font/woff2" : "font/woff", body: fs.readFileSync(file) });
  });
}
