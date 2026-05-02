import type { Database } from "@aidey/database";
import type { ShopId } from "@aidey/shops";
import { and, desc, eq } from "drizzle-orm";
import { type SyncLogId, syncLogId } from "../domain/ids.ts";
import type { SyncLog, SyncStatus, SyncTrigger } from "../domain/sync-log.ts";
import * as schema from "./schema.ts";

type Row = typeof schema.syncLogs.$inferSelect;

function toSyncLog(row: Row): SyncLog {
  return {
    id: syncLogId(row.id),
    shopId: row.shopId as unknown as ShopId,
    status: row.status as SyncStatus,
    trigger: row.trigger as SyncTrigger,
    productsTotal: row.productsTotal,
    productsAdded: row.productsAdded,
    productsUpdated: row.productsUpdated,
    productsFailed: row.productsFailed,
    categoriesTotal: row.categoriesTotal,
    embeddingsGenerated: row.embeddingsGenerated,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

export interface CompleteInput {
  status: Exclude<SyncStatus, "syncing">;
  productsTotal?: number;
  productsAdded?: number;
  productsUpdated?: number;
  productsFailed?: number;
  categoriesTotal?: number;
  embeddingsGenerated?: number;
  errorMessage?: string | null;
}

export function createSyncLogRepository(db: Database) {
  return {
    async start(shopId: ShopId, trigger: SyncTrigger): Promise<SyncLog> {
      const [row] = await db
        .insert(schema.syncLogs)
        .values({ shopId, trigger, status: "syncing" })
        .returning();
      if (!row) throw new Error("start sync log failed");
      return toSyncLog(row);
    },

    async complete(id: SyncLogId, input: CompleteInput): Promise<SyncLog | null> {
      const [row] = await db
        .update(schema.syncLogs)
        .set({
          status: input.status,
          productsTotal: input.productsTotal ?? 0,
          productsAdded: input.productsAdded ?? 0,
          productsUpdated: input.productsUpdated ?? 0,
          productsFailed: input.productsFailed ?? 0,
          categoriesTotal: input.categoriesTotal ?? 0,
          embeddingsGenerated: input.embeddingsGenerated ?? 0,
          errorMessage: input.errorMessage ?? null,
          completedAt: new Date(),
        })
        .where(eq(schema.syncLogs.id, id))
        .returning();
      return row ? toSyncLog(row) : null;
    },

    async findById(id: SyncLogId): Promise<SyncLog | null> {
      const [row] = await db
        .select()
        .from(schema.syncLogs)
        .where(eq(schema.syncLogs.id, id))
        .limit(1);
      return row ? toSyncLog(row) : null;
    },

    async lastSuccessful(shopId: ShopId): Promise<SyncLog | null> {
      const [row] = await db
        .select()
        .from(schema.syncLogs)
        .where(and(eq(schema.syncLogs.shopId, shopId), eq(schema.syncLogs.status, "success")))
        .orderBy(desc(schema.syncLogs.completedAt))
        .limit(1);
      return row ? toSyncLog(row) : null;
    },

    async listForShop(shopId: ShopId, limit = 20): Promise<SyncLog[]> {
      const rows = await db
        .select()
        .from(schema.syncLogs)
        .where(eq(schema.syncLogs.shopId, shopId))
        .orderBy(desc(schema.syncLogs.startedAt))
        .limit(limit);
      return rows.map(toSyncLog);
    },
  };
}

export type SyncLogRepository = ReturnType<typeof createSyncLogRepository>;
