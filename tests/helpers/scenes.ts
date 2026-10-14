import type { Page } from "@playwright/test";
/** Shared visual scenes: identical steps run against the SOURCE file (baseline) and the TARGET app (comparison). */
export const FIXED_NOW = new Date("2026-10-14T19:08:00+01:00");
export const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 1024, height: 768 }, mobile: { width: 390, height: 844 } } as const;
type Root = import("@playwright/test").Frame | Page;
/** `act` runs after boot on the frame that holds the shell (the page itself, or the bridge iframe); pointer input goes through `page`. */
export type Scene = { name: string; vp: keyof typeof VIEWPORTS; scheme: "light" | "dark"; lang?: "en" | "fr" | "de" | "ar"; app?: string; setup?: (root: Root) => Promise<void>; act?: (root: Root, page: Page) => Promise<void>; clip?: { x: number; y: number; width: number; height: number } };
/** Frame holding #dkLayer (bridge iframe or the page). */
export async function shellRoot(page: Page): Promise<Root> { for (const f of page.frames()) if (await f.locator("#dkLayer").count().catch(() => 0)) return f; return page; }
const rightClick = async (root: Root, page: Page, sel: string) => { const b = (await root.locator(sel).first().boundingBox())!; await page.mouse.click(b.x + b.width / 2, b.y + 30, { button: "right" }); await root.locator('.os-menu[data-level="0"]').waitFor(); };
const subOpen = async (root: Root, lvl: number, label: string) => { await root.locator(`.os-menu[data-level="${lvl}"] button[data-oi]`, { hasText: label }).first().click(); await root.locator(`.os-menu[data-level="${lvl + 1}"]`).waitFor(); };
export const SOLO = ["documents", "forms", "files", "terminal", "calcsci", "billing", "hrPeople", "patients", "calendar", "cabinet", "planning"];
export const SCENES: Scene[] = [
  ...(["desktop", "tablet", "mobile"] as const).flatMap((vp) => (["light", "dark"] as const).map((scheme) => ({ name: `shell-${vp}-${scheme}`, vp, scheme }))),
  { name: "shell-desktop-light-ar", vp: "desktop", scheme: "light", lang: "ar" },
  { name: "shell-desktop-light-fr", vp: "desktop", scheme: "light", lang: "fr" },
  // Phase B slice 3: desktop / icon context menus (B-04).
  { name: "menu-desk-view-light", vp: "desktop", scheme: "light", act: async (root, page) => { await page.mouse.click(620, 700, { button: "right" }); await root.locator('.os-menu[data-level="0"]').waitFor(); await subOpen(root, 0, "View"); } },
  { name: "menu-desk-wallpaper-dark", vp: "desktop", scheme: "dark", act: async (root, page) => { await page.mouse.click(560, 480, { button: "right" }); await root.locator('.os-menu[data-level="0"]').waitFor(); await subOpen(root, 0, "Change wallpaper"); } },
  { name: "menu-desk-new-apps-light", vp: "desktop", scheme: "light", act: async (root, page) => { await page.mouse.click(700, 300, { button: "right" }); await root.locator('.os-menu[data-level="0"]').waitFor(); await subOpen(root, 0, "New"); await subOpen(root, 1, "App shortcut"); } },
  { name: "menu-icon-move-light", vp: "desktop", scheme: "light", act: async (root, page) => { await rightClick(root, page, '#dkLayer .dk-ic[title="Rapport.pdf"]'); await subOpen(root, 0, "Move to"); } },
  { name: "menu-icon-desk-ar", vp: "desktop", scheme: "light", lang: "ar", act: async (root, page) => { await rightClick(root, page, '#dkLayer .dk-ic[title="Rapport.pdf"]'); } },
  // Phase B slice 4: window chrome and dock marks (window BODIES differ until each app is migrated: bridge vs native).
  { name: "win-terminal-header-light", vp: "desktop", scheme: "light", clip: { x: 400, y: 110, width: 640, height: 60 }, act: async (root, page) => { await root.locator('#dock [data-t="terminal"]').click(); await page.waitForTimeout(300); } },
  { name: "win-terminal-dock-light", vp: "desktop", scheme: "light", clip: { x: 150, y: 800, width: 1140, height: 100 }, act: async (root, page) => { await root.locator('#dock [data-t="terminal"]').click(); await page.waitForTimeout(300); } },
  { name: "win-billing-header-dark", vp: "desktop", scheme: "dark", clip: { x: 0, y: 56, width: 1440, height: 64 }, act: async (root, page) => { await root.locator('#dkLayer .dk-ic[title="Billing"]').dblclick(); await page.waitForTimeout(400); } },
  { name: "win-billing-dock-dark", vp: "desktop", scheme: "dark", clip: { x: 150, y: 800, width: 1140, height: 100 }, act: async (root, page) => { await root.locator('#dkLayer .dk-ic[title="Billing"]').dblclick(); await page.waitForTimeout(400); } },
  { name: "win-terminal-snapleft-ar", vp: "desktop", scheme: "light", lang: "ar", clip: { x: 0, y: 56, width: 740, height: 60 }, act: async (root, page) => { await root.locator('#dock [data-t="terminal"]').click(); await page.waitForTimeout(300); await root.locator('.os-win[data-osw="terminal"] [data-wmenu]').click(); await root.locator('.os-menu[data-level="0"] button[data-oi]').nth(3).click(); await page.waitForTimeout(700); } },
  // Phase B slice 5: system menu, search palette, shortcuts panel.
  { name: "sys-main-light", vp: "desktop", scheme: "light", act: async (root, page) => { await root.locator("#sysBtn").click(); await page.waitForTimeout(1200); } },
  { name: "sys-appearance-dark", vp: "desktop", scheme: "dark", act: async (root, page) => { await root.locator("#sysBtn").click(); await page.waitForTimeout(300); await root.locator('#sysMenu [data-go="appearance"]').click(); await page.waitForTimeout(800); } },
  { name: "sys-info-ar", vp: "desktop", scheme: "light", lang: "ar", act: async (root, page) => { await root.locator("#sysBtn").click(); await page.waitForTimeout(300); await root.locator('#sysMenu [data-go="news"]').click(); await page.waitForTimeout(800); } },
  { name: "palette-empty-light", vp: "desktop", scheme: "light", act: async (root, page) => { await root.locator("#searchBtn").click(); await page.waitForTimeout(900); } },
  { name: "palette-query-dark", vp: "desktop", scheme: "dark", act: async (root, page) => { await root.locator("#searchBtn").click(); await page.waitForTimeout(300); await root.locator("#palInput").fill("desk"); await page.waitForTimeout(900); } },
  { name: "shortcuts-all-light", vp: "desktop", scheme: "light", act: async (root, page) => { await root.locator("#sysBtn").click(); await page.waitForTimeout(300); await root.locator('#sysMenu [data-act="shortcuts"]').click(); await page.waitForTimeout(900); } },
  { name: "shortcuts-search-fr", vp: "desktop", scheme: "light", lang: "fr", act: async (root, page) => { await root.locator("#sysBtn").click(); await page.waitForTimeout(300); await root.locator('#sysMenu [data-act="shortcuts"]').click(); await page.waitForTimeout(400); await root.locator("#scSearch").fill("bureau"); await page.waitForTimeout(900); } },
  { name: "shortcuts-mobile-dark", vp: "mobile", scheme: "dark", act: async (root, page) => { await root.locator("#dkLayer .dk-ic").first().press("Control+Slash"); await page.waitForTimeout(900); } },
  // Phase B slice 6: notification centre, banners, account menu.
  { name: "nc-open-light", vp: "desktop", scheme: "light", act: async (root, page) => { await root.locator("#bellBtn").click(); await page.waitForTimeout(1200); } },
  { name: "nc-detail-dark", vp: "desktop", scheme: "dark", act: async (root, page) => { await root.locator("#bellBtn").click(); await page.waitForTimeout(600); await root.locator('#ncScroll .ni[data-id="3"]').click(); await page.waitForTimeout(900); } },
  { name: "nc-filter-ar", vp: "desktop", scheme: "light", lang: "ar", act: async (root, page) => { await root.locator("#bellBtn").click(); await page.waitForTimeout(600); await root.locator('#ncPri [data-pri="high"]').click(); await page.waitForTimeout(900); } },
  { name: "nc-mobile-light", vp: "mobile", scheme: "light", act: async (root, page) => { await root.locator("#bellBtn").click(); await page.waitForTimeout(1200); } },
  { name: "acc-main-light", vp: "desktop", scheme: "light", act: async (root, page) => { await root.locator("#accBtn").click(); await page.waitForTimeout(900); } },
  { name: "acc-units-dark", vp: "desktop", scheme: "dark", act: async (root, page) => { await root.locator("#accBtn").click(); await page.waitForTimeout(400); await root.locator('#accMenu .kbm-item[data-go="units"]').click(); await page.waitForTimeout(1000); } },
  { name: "acc-status-fr", vp: "desktop", scheme: "light", lang: "fr", act: async (root, page) => { await root.locator("#accBtn").click(); await page.waitForTimeout(400); await root.locator("#accStBtn").click(); await page.waitForTimeout(900); } },
  ...SOLO.map((app) => ({ name: `app-${app}-desktop-light`, vp: "desktop" as const, scheme: "light" as const, app })),
];
/** Seeds storage before boot so both sides start from the same state. */
export async function seed(page: Page, s: Scene) {
  await page.addInitScript((lang) => { try { if (!sessionStorage.getItem("__seeded")) { localStorage.clear(); if (lang) localStorage.setItem("remotion-lang", lang); sessionStorage.setItem("__seeded", "1"); } } catch {} }, s.lang ?? null);
}
export async function stabilise(page: Page) {
  await page.addStyleTag({ content: "*,*::before,*::after{caret-color:transparent!important}" }).catch(() => {});
}
