import type { Page } from "@playwright/test";
/** Shared visual scenes: identical steps run against the SOURCE file (baseline) and the TARGET app (comparison). */
export const FIXED_NOW = new Date("2026-10-14T19:08:00+01:00");
export const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 1024, height: 768 }, mobile: { width: 390, height: 844 } } as const;
export type Scene = { name: string; vp: keyof typeof VIEWPORTS; scheme: "light" | "dark"; lang?: "en" | "fr" | "de" | "ar"; app?: string; setup?: (root: import("@playwright/test").Frame | Page) => Promise<void> };
export const SOLO = ["documents", "forms", "files", "terminal", "calcsci", "billing", "hrPeople", "patients", "calendar", "cabinet", "planning"];
export const SCENES: Scene[] = [
  ...(["desktop", "tablet", "mobile"] as const).flatMap((vp) => (["light", "dark"] as const).map((scheme) => ({ name: `shell-${vp}-${scheme}`, vp, scheme }))),
  { name: "shell-desktop-light-ar", vp: "desktop", scheme: "light", lang: "ar" },
  { name: "shell-desktop-light-fr", vp: "desktop", scheme: "light", lang: "fr" },
  ...SOLO.map((app) => ({ name: `app-${app}-desktop-light`, vp: "desktop" as const, scheme: "light" as const, app })),
];
/** Seeds storage before boot so both sides start from the same state. */
export async function seed(page: Page, s: Scene) {
  await page.addInitScript((lang) => { try { if (!sessionStorage.getItem("__seeded")) { localStorage.clear(); if (lang) localStorage.setItem("remotion-lang", lang); sessionStorage.setItem("__seeded", "1"); } } catch {} }, s.lang ?? null);
}
export async function stabilise(page: Page) {
  await page.addStyleTag({ content: "*,*::before,*::after{caret-color:transparent!important}" }).catch(() => {});
}
