import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: process.env.STORE_BASE_URL || "http://127.0.0.1:3002",
    trace: "retain-on-failure",
  },
});
