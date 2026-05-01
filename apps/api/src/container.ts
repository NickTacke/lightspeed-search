import { createDatabase } from "@aidey/database";
import { createAuth, createEmailSender } from "@aidey/identity";
import type { Env } from "./env.ts";

export function createContainer(env: Env) {
  const db = createDatabase(env.DATABASE_URL);
  const email = createEmailSender({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    devMode: env.EMAIL_DEV_MODE,
    logger: console.log,
  });
  const auth = createAuth({
    db,
    email,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    webURL: env.WEB_URL,
  });
  return { db, env, auth };
}

export type Container = ReturnType<typeof createContainer>;
