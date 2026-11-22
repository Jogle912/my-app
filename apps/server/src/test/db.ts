import { db } from "@/server/db";

/** Empties every table between tests. Only ever runs against the *_test database (see globalSetup). */
export async function resetDb(): Promise<void> {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length) await db.$executeRawUnsafe(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} CASCADE`);
}

export async function makeUser(name: string) {
  const id = `user_${name.toLowerCase()}`;
  await db.user.create({ data: { id, name, email: `${name.toLowerCase()}@example.test` } });
  await db.studentPreferences.create({ data: { userId: id } });
  return id;
}
