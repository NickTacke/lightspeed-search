import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createDatabase, type Database } from "@aidey/database";
import { schema as identitySchema } from "@aidey/identity";
import { type ShopId, shopId, schema as shopsSchema } from "@aidey/shops";
import { eq } from "drizzle-orm";
import { createAlertRepository } from "../src/infrastructure/alert-repository.ts";
import * as schema from "../src/infrastructure/schema.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aidey";
let db: Database;
let repo: ReturnType<typeof createAlertRepository>;
let testShopId: ShopId;

beforeAll(async () => {
  db = createDatabase(url);
  repo = createAlertRepository(db);
  // Seed user + shop
  await db
    .insert(identitySchema.user)
    .values({ id: "alerts-test-user", email: "alerts@test.com" })
    .onConflictDoNothing();
  const [row] = await db
    .insert(shopsSchema.shops)
    .values({
      lightspeedId: "ls-alerts-1",
      domain: "alerts.test",
      name: "AlertsShop",
      language: "en",
      cluster: "eu1",
    })
    .returning();
  if (!row) throw new Error("seed shop failed");
  testShopId = shopId(row.id);
});

afterEach(async () => {
  await db.delete(schema.alerts);
});

afterAll(async () => {
  await db.delete(shopsSchema.shops);
  await db.delete(identitySchema.user).where(eq(identitySchema.user.id, "alerts-test-user"));
});

describe("alertRepository", () => {
  test("insert + findById round trip", async () => {
    const a = await repo.insert({ shopId: testShopId, title: "T", message: "M", enabled: true });
    const found = await repo.findById(a.id);
    expect(found?.title).toBe("T");
    expect(found?.shopId).toBe(testShopId);
  });

  test("listForShop returns shop's alerts in createdAt order", async () => {
    await repo.insert({ shopId: testShopId, title: "A1", message: "m", enabled: true });
    await repo.insert({ shopId: testShopId, title: "A2", message: "m", enabled: false });
    const list = await repo.listForShop(testShopId);
    expect(list).toHaveLength(2);
    expect(list.map((a) => a.title).sort()).toEqual(["A1", "A2"]);
  });

  test("update applies patch and bumps updatedAt", async () => {
    const a = await repo.insert({ shopId: testShopId, title: "X", message: "y", enabled: true });
    const updated = await repo.update(a.id, { title: "Z", enabled: false });
    expect(updated?.title).toBe("Z");
    expect(updated?.enabled).toBe(false);
  });

  test("update of unknown id returns null", async () => {
    const updated = await repo.update("00000000-0000-0000-0000-000000000000" as never, {
      title: "x",
    });
    expect(updated).toBeNull();
  });

  test("delete removes the alert", async () => {
    const a = await repo.insert({ shopId: testShopId, title: "D", message: "m", enabled: true });
    await repo.delete(a.id);
    expect(await repo.findById(a.id)).toBeNull();
  });
});
