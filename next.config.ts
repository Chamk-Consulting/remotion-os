import type { NextConfig } from "next";

/**
 * Security headers (Documents product phase 6).
 *
 * A baseline Content-Security-Policy for a page that holds patient data:
 * - nothing is fetched from, sent to or framed by another site — connect-src, img-src, font-src, frame-src stay on this origin
 *   (fonts and PDF/Word libraries are self-hosted under /vendor since phase 0), so data cannot leak through an image or a request;
 * - no plugins (object-src 'none'), no <base> hijacking, forms post only here, and the OS cannot be framed by another site (clickjacking).
 * Scripts still allow 'unsafe-inline' and 'unsafe-eval': Next.js inlines its boot scripts and the legacy single-file bridge (still used by
 * apps not yet migrated) relies on inline handlers and eval. Moving to nonces is the next step once the bridge is gone.
 * vercel.live is allowed only so the toolbar of preview deployments keeps working.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self' data: blob: https://vercel.live wss://ws-us3.pusher.com",
  "worker-src 'self' blob:",
  "frame-src 'self' blob: data: https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

/* The frozen single-file OS under /legacy (the bridge for apps not yet migrated) keeps loading its Google Fonts. */
const legacyCsp = csp.replace("style-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com").replace("font-src 'self' data:", "font-src 'self' data: https://fonts.gstatic.com");

const base = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      { source: "/:path((?!legacy/).*)", headers: [{ key: "Content-Security-Policy", value: csp }, ...base] },
      { source: "/legacy/:path*", headers: [{ key: "Content-Security-Policy", value: legacyCsp }, ...base] },
    ];
  },
};

export default nextConfig;
