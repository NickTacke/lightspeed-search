import type { Database } from "./client.ts";

export async function withShopScope<T>(
  db: Database,
  shopId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(`select set_config('app.shop_id', '${shopId.replace(/'/g, "''")}', true)`);
    return fn(tx as unknown as Database);
  });
}
