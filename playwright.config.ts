import { defineConfig, devices } from "@playwright/test";

const SITE_PORT = 4178;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "site",
      testMatch: /site\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${SITE_PORT}/vaga-match/` },
    },
    {
      name: "extensao",
      testMatch: /extension\.spec\.ts/,
      timeout: 60_000,
    },
  ],
  webServer: {
    command: `npx vite preview --config vite.site.config.ts --port ${SITE_PORT} --strictPort`,
    url: `http://localhost:${SITE_PORT}/vaga-match/`,
    reuseExistingServer: !process.env.CI,
  },
});
