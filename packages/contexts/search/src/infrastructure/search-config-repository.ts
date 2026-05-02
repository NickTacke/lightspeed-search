import type { Database } from "@aidey/database";
import type { ShopId } from "@aidey/shops";
import { eq } from "drizzle-orm";
import type { SearchConfig } from "../domain/search-config.ts";
import * as schema from "./schema.ts";

type Row = typeof schema.searchConfigs.$inferSelect;

function toConfig(row: Row): SearchConfig {
  return {
    shopId: row.shopId as unknown as ShopId,
    enabledFields: row.enabledFields,
    fieldWeights: (row.fieldWeights ?? {}) as Record<string, number>,
    semanticThreshold: row.semanticThreshold,
    resultLimit: row.resultLimit,
    semanticEnabled: row.semanticEnabled,
    exactMatchEnabled: row.exactMatchEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface SearchConfigPatch {
  enabledFields?: string[];
  fieldWeights?: Record<string, number>;
  semanticThreshold?: number;
  resultLimit?: number;
  semanticEnabled?: boolean;
  exactMatchEnabled?: boolean;
}

export function createSearchConfigRepository(db: Database) {
  const getOrCreate = async (shopId: ShopId): Promise<SearchConfig> => {
    const [existing] = await db
      .select()
      .from(schema.searchConfigs)
      .where(eq(schema.searchConfigs.shopId, shopId))
      .limit(1);
    if (existing) return toConfig(existing);

    const [created] = await db
      .insert(schema.searchConfigs)
      .values({ shopId })
      .onConflictDoNothing()
      .returning();
    if (created) return toConfig(created);

    const [row] = await db
      .select()
      .from(schema.searchConfigs)
      .where(eq(schema.searchConfigs.shopId, shopId))
      .limit(1);
    if (!row) throw new Error("search config insert/select race failed");
    return toConfig(row);
  };

  return {
    getOrCreate,

    async update(shopId: ShopId, patch: SearchConfigPatch): Promise<SearchConfig> {
      await getOrCreate(shopId);
      const [row] = await db
        .update(schema.searchConfigs)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(schema.searchConfigs.shopId, shopId))
        .returning();
      if (!row) throw new Error("search config update returned nothing");
      return toConfig(row);
    },
  };
}

export type SearchConfigRepository = ReturnType<typeof createSearchConfigRepository>;
