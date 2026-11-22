import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";

/**
 * App authentication (who the student is). Completely separate from Canvas OAuth, which only
 * authorises read access to a student's Canvas data and is stored elsewhere.
 */
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24, // refresh expiry at most daily
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.studentPreferences.create({ data: { userId: user.id } });
          await db.auditLog.create({ data: { userId: user.id, actor: "user", action: "account.create" } });
        },
      },
    },
  },
  plugins: [nextCookies()], // must be last: lets server actions set the session cookie
});
