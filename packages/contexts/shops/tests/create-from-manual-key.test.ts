import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createDatabase, type Database } from "@aidey/database";
import { schema as identitySchema } from "@aidey/identity";
import type { LightspeedClient } from "@aidey/lightspeed";
import { eq } from "drizzle-orm";
import { createFromManualKey } from "../src/application/create-from-manual-key.ts";
import * as schema from "../src/infrastructure/schema.ts";
import { createShopRepository } from "../src/infrastructure/shop-repository.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aidey";
let db: Database;
let repo: ReturnType<typeof createShopRepository>;

beforeAll(async () => {
  db = createDatabase(url);
  repo = createShopRepository(db);
  await db
    .insert(identitySchema.user)
    .values({ id: "manual-key-user", email: "manualkey@test.com" })
    .onConflictDoNothing();
});

afterEach(async () => {
  await db.delete(schema.shops);
});

afterAll(async () => {
  await db.delete(identitySchema.user).where(eq(identitySchema.user.id, "manual-key-user"));
});

const stubClientFactory = (): LightspeedClient => ({
  request: async () =>
    ({
      shop: {
        id: 12345,
        domain: "test.shoplightspeed.com",
        email: "owner@test.com",
        language: "en",
        title: "Test Shop",
      },
    }) as never,
});

describe("createFromManualKey", () => {
  test("validates credentials, persists shop, links user", async () => {
    const shop = await createFromManualKey(
      { repo, lightspeedClientFactory: stubClientFactory },
      {
        userId: "manual-key-user",
        domain: "test.shoplightspeed.com",
        apiKey: "k",
        apiSecret: "s",
        cluster: "eu1",
      },
    );

    expect(shop.lightspeedId).toBe("12345");
    expect(shop.name).toBe("Test Shop");
    expect(shop.cluster).toBe("eu1");
    expect(shop.apiKey).toBe("k");

    const links = await db
      .select()
      .from(schema.userShops)
      .where(eq(schema.userShops.shopId, shop.id));
    expect(links[0]?.userId).toBe("manual-key-user");
  });
});
