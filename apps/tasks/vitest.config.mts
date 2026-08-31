import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/routes/**/*.test.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "../../coverage/tasks",
      include: [
        "app/api/**/route.ts",
        "app/auth/**/route.ts",
        "hooks/**/*.ts",
        "lib/**/*.ts",
        "lib/**/*.tsx",
      ],
      exclude: ["lib/**/*-types.ts", "lib/types.ts"],
      thresholds: {
        statements: 44,
        branches: 41,
        functions: 49,
        lines: 44.5,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
});
