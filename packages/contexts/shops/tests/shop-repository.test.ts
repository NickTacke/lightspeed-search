import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createDatabase, type Database } from "@aidey/database";
import { schema as identitySchema } from "@aidey/identity";
import { eq } from "drizzle-orm";
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
    .values({ id: "shop-test-user", email: "shoptest@example.com" })
    .onConflictDoNothing();
});

afterEach(async () => {
  await db.delete(schema.shops);
});

afterAll(async () => {
  await db.delete(identitySchema.user).where(eq(identitySchema.user.id, "shop-test-user"));
});

describe("shopRepository", () => {
  test("insertWithUserLink creates shop, user_shop link, and widget_domain entry", async () => {
    const shop = await repo.insertWithUserLink({
      userId: "shop-test-user",
      lightspeedId: "12345",
      domain: "test.shoplightspeed.com",
      name: "Test Shop",
      email: "owner@test.com",
      language: "en",
      cluster: "eu1",
      installToken: null,
      userSecret: null,
      apiKey: "k",
      apiSecret: "s",
    });

    expect(shop.lightspeedId).toBe("12345");
    expect(shop.cluster).toBe("eu1");
    expect(shop.domain).toBe("test.shoplightspeed.com");

    const links = await db
      .select()
      .from(schema.userShops)
      .where(eq(schema.userShops.shopId, shop.id));
    expect(links).toHaveLength(1);
    expect(links[0]?.userId).toBe("shop-test-user");
    expect(links[0]?.role).toBe("owner");

    const domains = await db
      .select()
      .from(schema.widgetDomains)
      .where(eq(schema.widgetDomains.shopId, shop.id));
    expect(domains).toHaveLength(1);
    expect(domains[0]?.domain).toBe("test.shoplightspeed.com");
  });

  test("findById returns the shop or null", async () => {
    const shop = await repo.insertWithUserLink({
      userId: "shop-test-user",
      lightspeedId: "9999",
      domain: "find-by-id.example",
      name: "FindByIdShop",
      email: null,
      language: "en",
      cluster: "us1",
      installToken: null,
      userSecret: null,
      apiKey: "k",
      apiSecret: "s",
    });

    const found = await repo.findById(shop.id);
    expect(found?.name).toBe("FindByIdShop");

    const missing = await repo.findById("00000000-0000-0000-0000-000000000000" as never);
    expect(missing).toBeNull();
  });

  test("findByDomain returns the shop", async () => {
    await repo.insertWithUserLink({
      userId: "shop-test-user",
      lightspeedId: "8888",
      domain: "by-domain.example",
      name: "ByDomainShop",
      email: null,
      language: "en",
      cluster: "eu1",
      installToken: null,
      userSecret: null,
      apiKey: "k",
      apiSecret: "s",
    });

    const found = await repo.findByDomain("by-domain.example");
    expect(found?.name).toBe("ByDomainShop");
  });

  test("listForUser returns all undeleted shops linked to the user", async () => {
    await repo.insertWithUserLink({
      userId: "shop-test-user",
      lightspeedId: "1",
      domain: "list1.example",
      name: "List1",
      email: null,
      language: "en",
      cluster: "eu1",
      installToken: null,
      userSecret: null,
      apiKey: "k",
      apiSecret: "s",
    });
    await repo.insertWithUserLink({
      userId: "shop-test-user",
      lightspeedId: "2",
      domain: "list2.example",
      name: "List2",
      email: null,
      language: "en",
      cluster: "us1",
      installToken: null,
      userSecret: null,
      apiKey: "k",
      apiSecret: "s",
    });

    const all = await repo.listForUser("shop-test-user");
    expect(all.map((s) => s.name).sort()).toEqual(["List1", "List2"]);
  });
});
