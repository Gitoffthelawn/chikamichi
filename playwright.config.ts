import { defineConfig } from "@playwright/test";

const PLAYWRIGHT_PORT = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3311", 10);
const PLAYWRIGHT_BASE_URL = `http://127.0.0.1:${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: "./tests/playwright",
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    headless: true,
  },
  webServer: {
    command: `pnpm build && node scripts/serve-static.mjs build/chrome-mv3-prod ${PLAYWRIGHT_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: PLAYWRIGHT_BASE_URL,
  },
});
