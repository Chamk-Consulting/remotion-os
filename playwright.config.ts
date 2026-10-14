import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: /.*\.(e2e|visual)\.ts/,
  timeout: 90_000,
  use: { baseURL: process.env.BASE_URL || "http://localhost:3100", launchOptions: { executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium" } },
  reporter: [["list"]],
});
