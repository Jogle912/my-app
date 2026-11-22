import "server-only";
import { expo } from "@better-auth/expo";
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
  // Brute-force protection on sign-in/sign-up. Only the automated test server turns it off.
  rateLimit: { enabled: process.env.AUTH_RATE_LIMIT !== "off" },
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
  // The mobile app's deep-link scheme (and Expo Go's, in development) may call the auth endpoints.
  trustedOrigins: ["studypilot://", ...(process.env.NODE_ENV === "production" ? [] : ["exp://"])],
  plugins: [expo(), nextCookies()], // nextCookies must be last: lets server actions set the session cookie
});
