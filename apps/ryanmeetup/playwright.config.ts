import { defineConfig, devices } from "@playwright/test";

// The e2e server runs on its own port, with its own build directory, so a run
// never competes with the dev server on 3001. Next keeps its dev lock inside
// the build directory, which is what lets the two coexist.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3101);
// Next's dev server answers /_next/static with a 403 for requests that
// arrive on 127.0.0.1, so the e2e origin has to be localhost.
const origin = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: origin,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: origin,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      E2E_TESTS: "true",
      NEXT_PUBLIC_E2E_TESTS: "true",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
