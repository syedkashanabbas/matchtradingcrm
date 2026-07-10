import { defineConfig, devices } from "@playwright/test";

/**
 * E2E configuration (spec 5.2). Runs against a deployed environment:
 *
 *   E2E_BASE_URL   - frontend URL (default http://localhost:3000)
 *   E2E_API_URL    - backend URL (default http://localhost:5000)
 *   E2E_REF_CODE   - existing referral code for the signup-with-referral flow
 *   E2E_STRIPE=1   - enable the Stripe test-mode checkout flow
 *   E2E_COINGATE=1 - enable the CoinGate sandbox checkout flow
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Cross-browser QA (5.5)
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  ],
});
