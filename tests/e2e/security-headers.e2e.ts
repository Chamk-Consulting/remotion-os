/** Security headers (Documents product phase 6): CSP on the OS, a font allowance only for the frozen legacy page, and no CSP violation
 *  while Documents opens, imports nothing and exports a PDF. */
import { test, expect } from "@playwright/test";
import { W, newShell, openShell, openDc, exportAs } from "./../helpers/documents";

test("CSP and hardening headers are sent; Documents runs and exports without a violation", async ({ browser, baseURL, request }) => {
  const r = await request.get("/?shell=react");
  const csp = r.headers()["content-security-policy"] || "";
  for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "img-src 'self' data: blob:", "form-action 'self'"]) expect(csp, d).toContain(d);
  expect(csp).not.toContain("googleapis");
  expect(r.headers()["x-content-type-options"]).toBe("nosniff");
  expect(r.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  const lg = await request.get("/legacy/Remotion_Desktop.html");
  expect(lg.headers()["content-security-policy"]).toContain("https://fonts.gstatic.com");
  const ctx = await newShell(browser, baseURL); const p = await openShell(ctx);
  const violations: string[] = [];
  await p.exposeFunction("__cspv", (s: string) => violations.push(s));
  await p.evaluate(() => document.addEventListener("securitypolicyviolation", (e) => (window as unknown as { __cspv: (s: string) => void }).__cspv(e.violatedDirective + " " + e.blockedURI)));
  await openDc(p);
  await expect(p.locator(`${W} .dc-cv`)).toBeVisible();
  await exportAs(p, "pdf");
  await ctx.close();
  expect(violations).toEqual([]);
});
