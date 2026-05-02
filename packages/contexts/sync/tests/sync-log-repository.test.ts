import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createDatabase, type Database } from "@aidey/database";
import { schema as identitySchema } from "@aidey/identity";
import { type ShopId, shopId, schema as shopsSchema } from "@aidey/shops";
import { eq } from "drizzle-orm";
import * as schema from "../src/infrastructure/schema.ts";
import { createSyncLogRepository } from "../src/infrastructure/sync-log-repository.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aidey";
let db: Database;
let repo: ReturnType<typeof createSyncLogRepository>;
let testShopId: ShopId;

beforeAll(async () => {
  db = createDatabase(url);
  repo = createSyncLogRepository(db);
  await db
    .insert(identitySchema.user)
    .values({ id: "synclog-user", email: "synclog@test.com" })
    .onConflictDoNothing();
  const [row] = await db
    .insert(shopsSchema.shops)
    .values({
      lightspeedId: "ls-synclog-1",
      domain: "synclog.test",
      name: "SyncLog",
      language: "en",
      cluster: "eu1",
    })
    .returning();
  if (!row) throw new Error("seed");
  testShopId = shopId(row.id);
});

afterEach(async () => {
  await db.delete(schema.syncLogs);
});

afterAll(async () => {
  await db.delete(shopsSchema.shops);
  await db.delete(identitySchema.user).where(eq(identitySchema.user.id, "synclog-user"));
});

describe("syncLogRepository", () => {
  test("start creates a syncing row", async () => {
    const log = await repo.start(testShopId, "manual");
    expect(log.status).toBe("syncing");
    expect(log.trigger).toBe("manual");
  });

  test("complete records totals + status + completedAt", async () => {
    const log = await repo.start(testShopId, "cron");
    const done = await repo.complete(log.id, {
      status: "success",
      productsTotal: 10,
      categoriesTotal: 3,
    });
    expect(done?.status).toBe("success");
    expect(done?.productsTotal).toBe(10);
    expect(done?.completedAt).not.toBeNull();
  });

  test("lastSuccessful returns the most recent success only", async () => {
    const fail = await repo.start(testShopId, "manual");
    await repo.complete(fail.id, { status: "failure", errorMessage: "boom" });
    const ok = await repo.start(testShopId, "manual");
    await repo.complete(ok.id, { status: "success", productsTotal: 5 });
    const last = await repo.lastSuccessful(testShopId);
    expect(last?.id).toBe(ok.id);
  });

  test("listForShop returns logs in startedAt desc", async () => {
    await repo.start(testShopId, "cron");
    await new Promise((r) => setTimeout(r, 5));
    await repo.start(testShopId, "manual");
    const list = await repo.listForShop(testShopId);
    expect(list).toHaveLength(2);
    expect(list[0]?.trigger).toBe("manual");
    expect(list[1]?.trigger).toBe("cron");
  });
});
