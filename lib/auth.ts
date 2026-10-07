import { betterAuth, type BetterAuthOptions } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDatabase } from "./server/database";
import { DATA_DIR } from "./server/runtime";

export const AUTH_ORIGIN = new URL(
  process.env.BETTER_AUTH_URL || "http://localhost:3000",
).origin;

function authSecret() {
  if (process.env.BETTER_AUTH_SECRET) {
    if (process.env.BETTER_AUTH_SECRET.length < 32)
      throw new Error("BETTER_AUTH_SECRET must have at least 32 characters.");
    return process.env.BETTER_AUTH_SECRET;
  }
  const file = path.join(DATA_DIR, "auth-secret");
  try {
    return readFileSync(file, "utf8").trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    writeFileSync(file, randomBytes(48).toString("base64url"), {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return readFileSync(file, "utf8").trim();
}

function options(): BetterAuthOptions {
  const database = getDatabase();
  return {
    appName: "Narrator",
    baseURL: AUTH_ORIGIN,
    secret: authSecret(),
    database,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: AUTH_ORIGIN.startsWith("https:"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
  };
}

const createAuth = (config: BetterAuthOptions) => betterAuth(config);
const state = globalThis as typeof globalThis & {
  narratorAuth?: Promise<ReturnType<typeof createAuth>>;
};
export async function getAuth() {
  if (!state.narratorAuth) {
    state.narratorAuth = (async () => {
      const config = options();
      const { runMigrations } = await getMigrations(config);
      await runMigrations();
      return createAuth(config);
    })().catch((error) => {
      state.narratorAuth = undefined;
      throw error;
    });
  }
  return state.narratorAuth;
}
