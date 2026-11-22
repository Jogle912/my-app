import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const TEST_DB = process.env.DATABASE_URL_TEST ?? "postgresql://studypilot:studypilot@localhost:5432/studypilot_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    globalSetup: ["src/test/globalSetup.ts"],
    env: { DATABASE_URL: TEST_DB },
    // Database tests share one database; run files one at a time.
    fileParallelism: false,
    coverage: { include: ["src/server/**"], exclude: ["**/__tests__/**", "src/generated/**"] },
  },
});
