import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  schema as catalogSchema,
  createCategoryRepository,
  createProductRepository,
  createVariantRepository,
} from "@aidey/catalog";
import { createDatabase, type Database } from "@aidey/database";
import { schema as identitySchema } from "@aidey/identity";
import type { LightspeedClient } from "@aidey/lightspeed";
import { type Shop, shopId, schema as shopsSchema } from "@aidey/shops";
import { eq } from "drizzle-orm";
import { fullSync } from "../src/application/full-sync.ts";
import * as schema from "../src/infrastructure/schema.ts";
import { createSyncLogRepository } from "../src/infrastructure/sync-log-repository.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aidey";
let db: Database;
let testShop: Shop;

beforeAll(async () => {
  db = createDatabase(url);
  await db
    .insert(identitySchema.user)
    .values({ id: "fullsync-user", email: "fullsync@test.com" })
    .onConflictDoNothing();
  const [row] = await db
    .insert(shopsSchema.shops)
    .values({
      lightspeedId: "ls-fullsync-1",
      domain: "fullsync.test",
      name: "FullSyncShop",
      language: "en",
      cluster: "eu1",
      apiKey: "k",
      apiSecret: "s",
    })
    .returning();
  if (!row) throw new Error("seed");
  testShop = {
    id: shopId(row.id),
    lightspeedId: row.lightspeedId,
    domain: row.domain,
    name: row.name,
    email: row.email,
    language: row.language,
    cluster: row.cluster as "us1" | "eu1",
    installToken: row.installToken,
    userSecret: row.userSecret,
    apiKey: row.apiKey,
    apiSecret: row.apiSecret,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
});

afterEach(async () => {
  await db.delete(schema.syncLogs);
  await db.delete(catalogSchema.products);
  await db.delete(catalogSchema.categories);
});

afterAll(async () => {
  await db.delete(shopsSchema.shops);
  await db.delete(identitySchema.user).where(eq(identitySchema.user.id, "fullsync-user"));
});

function makeStubClient(payload: {
  categories?: unknown[];
  products?: unknown[];
}): LightspeedClient {
  let categoriesPage = 1;
  let productsPage = 1;
  return {
    request: async (path: string) => {
      if (path.startsWith("/categories.json")) {
        const data = categoriesPage === 1 ? (payload.categories ?? []) : [];
        categoriesPage++;
        return { categories: data } as never;
      }
      if (path.startsWith("/products.json")) {
        const data = productsPage === 1 ? (payload.products ?? []) : [];
        productsPage++;
        return { products: data } as never;
      }
      throw new Error(`unexpected path ${path}`);
    },
  };
}

describe("fullSync", () => {
  test("happy path: pulls categories + products + variants and records success", async () => {
    const productRepo = createProductRepository(db);
    const categoryRepo = createCategoryRepository(db);
    const variantRepo = createVariantRepository(db);
    const syncLogRepo = createSyncLogRepository(db);
    const client = makeStubClient({
      categories: [{ id: 100, title: "Shoes", visibility: "visible" }],
      products: [
        {
          id: 200,
          title: "Sneakers",
          brand: { title: "Acme" },
          tags: "shoes,casual",
          variants: [{ id: 300, title: "Default", priceIncl: 49.99, isDefault: true }],
          categoriesSet: { resource: { embedded: { categories: [{ id: 100 }] } } },
        },
      ],
    });

    const log = await fullSync(
      {
        db,
        syncLogRepo,
        productRepo,
        categoryRepo,
        variantRepo,
        lightspeedClientFactory: () => client,
      },
      testShop,
      "manual",
    );

    expect(log.status).toBe("success");
    expect(log.productsTotal).toBe(1);
    expect(log.categoriesTotal).toBe(1);

    const cats = await categoryRepo.listForShop(testShop.id);
    expect(cats[0]?.title).toBe("Shoes");

    const prods = await productRepo.listForShop(testShop.id);
    const first = prods[0];
    if (!first) throw new Error("expected one product");
    expect(first.title).toBe("Sneakers");

    const productCats = await categoryRepo.listForProduct(first.id);
    expect(productCats.map((c) => c.title)).toEqual(["Shoes"]);
  });

  test("soft-deletes products that disappear between runs", async () => {
    const productRepo = createProductRepository(db);
    const categoryRepo = createCategoryRepository(db);
    const variantRepo = createVariantRepository(db);
    const syncLogRepo = createSyncLogRepository(db);

    // First run: two products
    await fullSync(
      {
        db,
        syncLogRepo,
        productRepo,
        categoryRepo,
        variantRepo,
        lightspeedClientFactory: () =>
          makeStubClient({
            products: [
              { id: 1, title: "Keep" },
              { id: 2, title: "Drop" },
            ],
          }),
      },
      testShop,
      "manual",
    );

    let prods = await productRepo.listForShop(testShop.id);
    expect(prods).toHaveLength(2);

    // Second run: only the first product
    await fullSync(
      {
        db,
        syncLogRepo,
        productRepo,
        categoryRepo,
        variantRepo,
        lightspeedClientFactory: () => makeStubClient({ products: [{ id: 1, title: "Keep" }] }),
      },
      testShop,
      "manual",
    );

    prods = await productRepo.listForShop(testShop.id);
    expect(prods.map((p) => p.title)).toEqual(["Keep"]);
  });

  test("records failure with error message on Lightspeed errors", async () => {
    const productRepo = createProductRepository(db);
    const categoryRepo = createCategoryRepository(db);
    const variantRepo = createVariantRepository(db);
    const syncLogRepo = createSyncLogRepository(db);
    const client: LightspeedClient = {
      request: async () => {
        throw new Error("Lightspeed 500");
      },
    };

    const log = await fullSync(
      {
        db,
        syncLogRepo,
        productRepo,
        categoryRepo,
        variantRepo,
        lightspeedClientFactory: () => client,
      },
      testShop,
      "manual",
    );

    expect(log.status).toBe("failure");
    expect(log.errorMessage).toContain("500");
  });
});
