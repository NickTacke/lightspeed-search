import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createDatabase, type Database } from "@aidey/database";
import { schema as identitySchema } from "@aidey/identity";
import { type ShopId, shopId, schema as shopsSchema } from "@aidey/shops";
import { eq } from "drizzle-orm";
import * as schema from "../src/infrastructure/schema.ts";
import { createSearchConfigRepository } from "../src/infrastructure/search-config-repository.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aidey";
let db: Database;
let repo: ReturnType<typeof createSearchConfigRepository>;
let testShopId: ShopId;

beforeAll(async () => {
  db = createDatabase(url);
  repo = createSearchConfigRepository(db);
  await db
    .insert(identitySchema.user)
    .values({ id: "search-cfg-user", email: "search-cfg@test.com" })
    .onConflictDoNothing();
  const [row] = await db
    .insert(shopsSchema.shops)
    .values({
      lightspeedId: "ls-search-cfg-1",
      domain: "search-cfg.test",
      name: "SearchCfgShop",
      language: "en",
      cluster: "eu1",
    })
    .returning();
  if (!row) throw new Error("seed");
  testShopId = shopId(row.id);
});

afterEach(async () => {
  await db.delete(schema.searchConfigs);
});

afterAll(async () => {
  await db.delete(shopsSchema.shops);
  await db.delete(identitySchema.user).where(eq(identitySchema.user.id, "search-cfg-user"));
});

describe("searchConfigRepository", () => {
  test("getOrCreate returns defaults on first call, same row on second", async () => {
    const first = await repo.getOrCreate(testShopId);
    expect(first.enabledFields).toEqual(["title", "tags", "brand", "description"]);
    expect(first.semanticEnabled).toBe(true);
    const second = await repo.getOrCreate(testShopId);
    expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
  });

  test("update applies patch", async () => {
    await repo.getOrCreate(testShopId);
    const updated = await repo.update(testShopId, {
      semanticEnabled: false,
      resultLimit: 50,
      fieldWeights: { title: 2, brand: 1 },
    });
    expect(updated.semanticEnabled).toBe(false);
    expect(updated.resultLimit).toBe(50);
    expect(updated.fieldWeights).toEqual({ title: 2, brand: 1 });
  });

  test("update creates the row if missing", async () => {
    const updated = await repo.update(testShopId, { resultLimit: 5 });
    expect(updated.resultLimit).toBe(5);
  });
});
