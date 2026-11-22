import { execSync } from "node:child_process";
import pg from "pg";

/** Recreates the test database schema from migrations once per test run. */
export default async function setup() {
  const url = process.env.DATABASE_URL_TEST ?? "postgresql://studypilot:studypilot@localhost:5432/studypilot_test";
  if (!/_test\b/.test(new URL(url).pathname)) throw new Error(`Refusing to reset a non-test database: ${url}`);
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
  } catch (e) {
    throw new Error(`Test database unreachable at ${url}. Start Postgres (npm run db:up) or set DATABASE_URL_TEST.\n${e}`);
  }
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
