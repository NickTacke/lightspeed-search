import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  schema as catalogSchema,
  createCategoryRepository,
  createProductRepository,
  type ProductId,
} from "@aidey/catalog";
import { createDatabase, type Database } from "@aidey/database";
import { schema as identitySchema } from "@aidey/identity";
import { type ShopId, shopId, schema as shopsSchema } from "@aidey/shops";
import { eq } from "drizzle-orm";
import { regenerateEmbedding } from "../src/application/regenerate-embedding.ts";
import type { OpenAIEmbedder } from "../src/infrastructure/openai-embedder.ts";
import * as schema from "../src/infrastructure/schema.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aidey";
let db: Database;
let testShopId: ShopId;
let testProductId: ProductId;

const fakeEmbedder = (calls: { count: number }): OpenAIEmbedder => ({
  embed: async (_text) => {
    calls.count++;
    return Array.from({ length: 1536 }, (_, i) => i / 1536);
  },
});

beforeAll(async () => {
  db = createDatabase(url);
  await db
    .insert(identitySchema.user)
    .values({ id: "regen-user", email: "regen@test.com" })
    .onConflictDoNothing();
  const [shopRow] = await db
    .insert(shopsSchema.shops)
    .values({
      lightspeedId: "ls-regen-1",
      domain: "regen.test",
      name: "RegenShop",
      language: "en",
      cluster: "eu1",
    })
    .returning();
  if (!shopRow) throw new Error("seed shop");
  testShopId = shopId(shopRow.id);
  const productRepo = createProductRepository(db);
  const { product } = await productRepo.upsertByLightspeedId({
    shopId: testShopId,
    lightspeedId: "regen-product-1",
    title: "Test Product",
    brand: "TestBrand",
  });
  testProductId = product.id;
});

afterEach(async () => {
  await db.delete(schema.productEmbeddings);
});

afterAll(async () => {
  await db.delete(catalogSchema.products);
  await db.delete(shopsSchema.shops);
  await db.delete(identitySchema.user).where(eq(identitySchema.user.id, "regen-user"));
});

describe("regenerateEmbedding", () => {
  test("first call generates embedding via OpenAI", async () => {
    const calls = { count: 0 };
    const regen = regenerateEmbedding({
      db,
      embedder: fakeEmbedder(calls),
      productRepo: createProductRepository(db),
      categoryRepo: createCategoryRepository(db),
    });
    const result = await regen(testProductId);
    expect(result.generated).toBe(true);
    expect(calls.count).toBe(1);

    const [row] = await db
      .select()
      .from(schema.productEmbeddings)
      .where(eq(schema.productEmbeddings.productId, testProductId));
    expect(row?.embeddingHash).toBeTruthy();
    expect(row?.searchText).toContain("Test Product");
  });

  test("second call with same content is a cache hit (no OpenAI call)", async () => {
    const calls = { count: 0 };
    const regen = regenerateEmbedding({
      db,
      embedder: fakeEmbedder(calls),
      productRepo: createProductRepository(db),
      categoryRepo: createCategoryRepository(db),
    });
    await regen(testProductId);
    const second = await regen(testProductId);
    expect(second.generated).toBe(false);
    expect(calls.count).toBe(1);
  });

  test("returns generated=false for unknown product", async () => {
    const calls = { count: 0 };
    const regen = regenerateEmbedding({
      db,
      embedder: fakeEmbedder(calls),
      productRepo: createProductRepository(db),
      categoryRepo: createCategoryRepository(db),
    });
    const result = await regen("00000000-0000-0000-0000-000000000000" as never);
    expect(result.generated).toBe(false);
    expect(calls.count).toBe(0);
  });
});
