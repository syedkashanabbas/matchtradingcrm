import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    // Playwright specs live in e2e/ and run with `npx playwright test`
    exclude: ["e2e/**", "node_modules/**", "frontend/**"],
  },
});
