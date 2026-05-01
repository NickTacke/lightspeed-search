import { describe, expect, test } from "bun:test";
import { createDatabase } from "../src/client.ts";
import { withShopScope } from "../src/rls.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/aidey";

describe("withShopScope", () => {
  test("sets app.shop_id within the transaction", async () => {
    const db = createDatabase(url);
    const result = await withShopScope(db, "shop_123", async (tx) => {
      const rows = await tx.execute("select current_setting('app.shop_id', true) as s");
      return (rows as Array<{ s: string }>)[0]?.s as string;
    });
    expect(result).toBe("shop_123");
  });
});
