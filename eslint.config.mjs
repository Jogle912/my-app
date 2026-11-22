import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Data isolation: only the access layer (and auth) may touch the database client or generated
  // Prisma client. Everything else must go through ownership-scoped repositories.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/access/**", "src/server/auth.ts", "src/server/db.ts", "src/test/**", "src/server/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/server/db", "**/server/db", "./db", "../db"], message: "Use a repository in src/server/access instead of the database client." },
            { group: ["@/generated/prisma/*", "**/generated/prisma/*"], message: "Use a repository in src/server/access instead of Prisma directly." },
          ],
        },
      ],
    },
  },
  // The scheduling engine stays pure: no framework, database or server imports.
  {
    files: ["src/scheduler/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["next", "next/*", "react", "@/server/*", "@/generated/*", "@prisma/*"], message: "The scheduler must stay free of I/O and framework code." }] },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**"]),
]);

export default eslintConfig;
