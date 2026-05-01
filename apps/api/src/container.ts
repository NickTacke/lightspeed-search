import { createDatabase } from "@aidey/database";
import { createAuth, createEmailSender } from "@aidey/identity";
import {
  type CreateFromInstallInput,
  type CreateFromManualKeyInput,
  createFromInstall,
  createFromManualKey,
  createShopRepository,
  getShop,
  getShopByDomain,
  listForUser,
} from "@aidey/shops";
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

  const shopRepo = createShopRepository(db);
  const shops = {
    createFromManualKey: (input: CreateFromManualKeyInput) =>
      createFromManualKey({ repo: shopRepo }, input),
    createFromInstall: (input: CreateFromInstallInput) =>
      createFromInstall({ repo: shopRepo }, input),
    getById: getShop(shopRepo),
    getByDomain: getShopByDomain(shopRepo),
    listForUser: listForUser(shopRepo),
  };

  return { db, env, auth, shops };
}

export type Container = ReturnType<typeof createContainer>;
