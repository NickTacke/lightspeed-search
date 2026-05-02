import type { Database } from "@aidey/database";
import type { ShopId } from "@aidey/shops";
import { eq } from "drizzle-orm";
import type { WidgetConfig } from "../domain/widget-config.ts";
import * as schema from "./schema.ts";

type Row = typeof schema.widgetConfigs.$inferSelect;

function toConfig(row: Row): WidgetConfig {
  return {
    shopId: row.shopId as unknown as ShopId,
    widgetEnabled: row.widgetEnabled,
    accentColor: row.accentColor,
    borderRadius: row.borderRadius,
    darkMode: row.darkMode,
    visibleFields: row.visibleFields,
    maxDropdownResults: row.maxDropdownResults,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface WidgetConfigPatch {
  widgetEnabled?: boolean;
  accentColor?: string | null;
  borderRadius?: number | null;
  darkMode?: boolean | null;
  visibleFields?: string[];
  maxDropdownResults?: number | null;
}

export function createWidgetConfigRepository(db: Database) {
  const getOrCreate = async (shopId: ShopId): Promise<WidgetConfig> => {
    const [existing] = await db
      .select()
      .from(schema.widgetConfigs)
      .where(eq(schema.widgetConfigs.shopId, shopId))
      .limit(1);
    if (existing) return toConfig(existing);

    const [created] = await db
      .insert(schema.widgetConfigs)
      .values({ shopId })
      .onConflictDoNothing()
      .returning();
    if (created) return toConfig(created);

    const [row] = await db
      .select()
      .from(schema.widgetConfigs)
      .where(eq(schema.widgetConfigs.shopId, shopId))
      .limit(1);
    if (!row) throw new Error("widget config insert/select race failed");
    return toConfig(row);
  };

  return {
    getOrCreate,

    async update(shopId: ShopId, patch: WidgetConfigPatch): Promise<WidgetConfig> {
      await getOrCreate(shopId);
      const [row] = await db
        .update(schema.widgetConfigs)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(schema.widgetConfigs.shopId, shopId))
        .returning();
      if (!row) throw new Error("widget config update returned nothing");
      return toConfig(row);
    },
  };
}

export type WidgetConfigRepository = ReturnType<typeof createWidgetConfigRepository>;
