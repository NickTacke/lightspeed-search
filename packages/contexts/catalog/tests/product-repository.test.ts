import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createDatabase, type Database } from "@aidey/database";
import { schema as identitySchema } from "@aidey/identity";
import { type ShopId, shopId, schema as shopsSchema } from "@aidey/shops";
import { eq } from "drizzle-orm";
import { createProductRepository } from "../src/infrastructure/product-repository.ts";
import * as schema from "../src/infrastructure/schema.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aidey";
let db: Database;
let repo: ReturnType<typeof createProductRepository>;
let testShopId: ShopId;

beforeAll(async () => {
  db = createDatabase(url);
  repo = createProductRepository(db);
  await db
    .insert(identitySchema.user)
    .values({ id: "catalog-test-user", email: "catalog@test.com" })
    .onConflictDoNothing();
  const [row] = await db
    .insert(shopsSchema.shops)
    .values({
      lightspeedId: "ls-catalog-1",
      domain: "catalog.test",
      name: "CatalogShop",
      language: "en",
      cluster: "eu1",
    })
    .returning();
  if (!row) throw new Error("seed shop failed");
  testShopId = shopId(row.id);
});

afterEach(async () => {
  await db.delete(schema.products);
});

afterAll(async () => {
  await db.delete(shopsSchema.shops);
  await db.delete(identitySchema.user).where(eq(identitySchema.user.id, "catalog-test-user"));
});

describe("productRepository", () => {
  test("upsert inserts on first call, updates on second (same lightspeedId)", async () => {
    const first = await repo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "lp-1",
      title: "Original",
    });
    const second = await repo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "lp-1",
      title: "Updated",
    });
    expect(first.product.id).toBe(second.product.id);
    expect(second.product.title).toBe("Updated");
  });

  test("softDeleteMissing soft-deletes products not in the seen set", async () => {
    await repo.upsertByLightspeedId({ shopId: testShopId, lightspeedId: "keep", title: "Keep" });
    await repo.upsertByLightspeedId({ shopId: testShopId, lightspeedId: "drop", title: "Drop" });

    const deleted = await repo.softDeleteMissing(testShopId, ["keep"]);
    expect(deleted).toBeGreaterThanOrEqual(1);

    const live = await repo.listForShop(testShopId);
    expect(live.map((p) => p.lightspeedId)).toEqual(["keep"]);
  });

  test("upsert reactivates a soft-deleted product (changed)", async () => {
    const first = await repo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "revive",
      title: "Original",
    });
    await repo.softDeleteMissing(testShopId, []);
    expect(await repo.findById(first.product.id)).toBeNull();

    const revived = await repo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "revive",
      title: "Re-added",
    });
    expect(revived.product.id).toBe(first.product.id);
    expect((await repo.findById(first.product.id))?.title).toBe("Re-added");
  });

  test("findIdByLightspeedId returns id (or null) regardless of soft-delete", async () => {
    await repo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "lookup",
      title: "Lookup",
    });
    const found = await repo.findIdByLightspeedId(testShopId, "lookup");
    expect(found).not.toBeNull();
    const missing = await repo.findIdByLightspeedId(testShopId, "nope");
    expect(missing).toBeNull();
  });
});
