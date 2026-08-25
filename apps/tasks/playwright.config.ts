import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const origin = `http://127.0.0.1:${port}`;
const supabasePort = Number(process.env.PLAYWRIGHT_SUPABASE_PORT ?? 54329);
const supabaseOrigin = `http://127.0.0.1:${supabasePort}`;

/**
 * The suite runs against a production server rather than `next dev`.
 *
 * Next allows only one dev server per project directory, so a `npm run dev`
 * open in another terminal used to make the whole suite unrunnable — the
 * webserver exited with "Another next dev server is already running" and every
 * spec failed before it started. `next start` has no such restriction, and it
 * exercises the build that actually ships.
 *
 * The cost is a build on each cold run. `reuseExistingServer` keeps that to
 * once per session locally, and `PLAYWRIGHT_TEST_BASE_URL` with
 * `PLAYWRIGHT_SKIP_WEBSERVER=1` points the suite at a server you already have.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL ?? origin,
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "node tests/e2e/mock-supabase.mjs",
          url: `${supabaseOrigin}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
          env: {
            ...process.env,
            PLAYWRIGHT_SUPABASE_PORT: String(supabasePort),
          },
        },
        {
          command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${port}`,
          url: `${origin}/login`,
          reuseExistingServer: !process.env.CI,
          // A cold run builds first, which does not fit the 60s default.
          timeout: 300_000,
          env: {
            ...process.env,
            // These are inlined at build time, so they must be set for the build
            // step above, not just for the server it starts.
            NEXT_PUBLIC_SUPABASE_URL: supabaseOrigin,
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
          },
        },
      ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
