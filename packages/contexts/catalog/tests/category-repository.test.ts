import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createDatabase, type Database } from "@aidey/database";
import { schema as identitySchema } from "@aidey/identity";
import { type ShopId, shopId, schema as shopsSchema } from "@aidey/shops";
import { eq } from "drizzle-orm";
import { createCategoryRepository } from "../src/infrastructure/category-repository.ts";
import { createProductRepository } from "../src/infrastructure/product-repository.ts";
import * as schema from "../src/infrastructure/schema.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aidey";
let db: Database;
let catRepo: ReturnType<typeof createCategoryRepository>;
let prodRepo: ReturnType<typeof createProductRepository>;
let testShopId: ShopId;

beforeAll(async () => {
  db = createDatabase(url);
  catRepo = createCategoryRepository(db);
  prodRepo = createProductRepository(db);
  await db
    .insert(identitySchema.user)
    .values({ id: "cat-test-user", email: "cat@test.com" })
    .onConflictDoNothing();
  const [row] = await db
    .insert(shopsSchema.shops)
    .values({
      lightspeedId: "ls-cat-1",
      domain: "cat.test",
      name: "CatShop",
      language: "en",
      cluster: "eu1",
    })
    .returning();
  if (!row) throw new Error("seed shop failed");
  testShopId = shopId(row.id);
});

afterEach(async () => {
  await db.delete(schema.products);
  await db.delete(schema.categories);
});

afterAll(async () => {
  await db.delete(shopsSchema.shops);
  await db.delete(identitySchema.user).where(eq(identitySchema.user.id, "cat-test-user"));
});

describe("categoryRepository", () => {
  test("upsert + listForShop + parent resolution", async () => {
    const parent = await catRepo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "parent",
      title: "Parent",
    });
    const child = await catRepo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "child",
      title: "Child",
      parentLightspeedId: "parent",
    });
    expect(child.category.parentId).toBe(parent.category.id);

    const all = await catRepo.listForShop(testShopId);
    expect(all).toHaveLength(2);
  });

  test("setProductCategories replaces the full set idempotently", async () => {
    const c1 = await catRepo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "c1",
      title: "C1",
    });
    const c2 = await catRepo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "c2",
      title: "C2",
    });
    const p = await prodRepo.upsertByLightspeedId({
      shopId: testShopId,
      lightspeedId: "p1",
      title: "P",
    });

    await catRepo.setProductCategories(p.product.id, [c1.category.id, c2.category.id]);
    let cats = await catRepo.listForProduct(p.product.id);
    expect(cats.map((c) => c.title).sort()).toEqual(["C1", "C2"]);

    await catRepo.setProductCategories(p.product.id, [c1.category.id]);
    cats = await catRepo.listForProduct(p.product.id);
    expect(cats.map((c) => c.title)).toEqual(["C1"]);

    await catRepo.setProductCategories(p.product.id, []);
    cats = await catRepo.listForProduct(p.product.id);
    expect(cats).toHaveLength(0);
  });
});
