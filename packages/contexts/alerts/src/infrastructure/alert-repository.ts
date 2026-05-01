import type { Database } from "@aidey/database";
import type { ShopId } from "@aidey/shops";
import { and, asc, eq } from "drizzle-orm";
import type { Alert } from "../domain/alert.ts";
import { type AlertId, alertId } from "../domain/ids.ts";
import * as schema from "./schema.ts";

type Row = typeof schema.alerts.$inferSelect;

function toAlert(row: Row): Alert {
  return {
    id: alertId(row.id),
    shopId: row.shopId as unknown as ShopId,
    title: row.title,
    message: row.message,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface AlertInsertInput {
  shopId: ShopId;
  title: string;
  message: string;
  enabled: boolean;
}

export interface AlertPatch {
  title?: string;
  message?: string;
  enabled?: boolean;
}

export function createAlertRepository(db: Database) {
  return {
    async insert(input: AlertInsertInput): Promise<Alert> {
      const [row] = await db.insert(schema.alerts).values(input).returning();
      if (!row) throw new Error("insert alert failed");
      return toAlert(row);
    },

    async findById(id: AlertId): Promise<Alert | null> {
      const [row] = await db.select().from(schema.alerts).where(eq(schema.alerts.id, id)).limit(1);
      return row ? toAlert(row) : null;
    },

    async listForShop(shopId: ShopId): Promise<Alert[]> {
      const rows = await db
        .select()
        .from(schema.alerts)
        .where(eq(schema.alerts.shopId, shopId))
        .orderBy(asc(schema.alerts.createdAt));
      return rows.map(toAlert);
    },

    async update(id: AlertId, patch: AlertPatch): Promise<Alert | null> {
      const [row] = await db
        .update(schema.alerts)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(schema.alerts.id, id))
        .returning();
      return row ? toAlert(row) : null;
    },

    async delete(id: AlertId): Promise<void> {
      await db.delete(schema.alerts).where(eq(schema.alerts.id, id));
    },

    async findOwnedById(id: AlertId, shopId: ShopId): Promise<Alert | null> {
      const [row] = await db
        .select()
        .from(schema.alerts)
        .where(and(eq(schema.alerts.id, id), eq(schema.alerts.shopId, shopId)))
        .limit(1);
      return row ? toAlert(row) : null;
    },
  };
}

export type AlertRepository = ReturnType<typeof createAlertRepository>;
