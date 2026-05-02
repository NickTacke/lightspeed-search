import type { Database } from "@aidey/database";
import type { ShopId } from "@aidey/shops";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { type ProductId, variantId } from "../domain/ids.ts";
import type { Variant } from "../domain/variant.ts";
import * as schema from "./schema.ts";

type Row = typeof schema.variants.$inferSelect;

function toVariant(row: Row): Variant {
  return {
    id: variantId(row.id),
    shopId: row.shopId as unknown as ShopId,
    productId: row.productId as unknown as ProductId,
    lightspeedId: row.lightspeedId,
    title: row.title,
    priceIncl: row.priceIncl,
    priceExcl: row.priceExcl,
    oldPriceIncl: row.oldPriceIncl,
    oldPriceExcl: row.oldPriceExcl,
    sku: row.sku,
    ean: row.ean,
    articleCode: row.articleCode,
    stockLevel: row.stockLevel,
    stockTracking: row.stockTracking,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export interface VariantUpsertInput {
  shopId: ShopId;
  productId: ProductId;
  lightspeedId: string;
  title: string;
  priceIncl?: string | null;
  priceExcl?: string | null;
  oldPriceIncl?: string | null;
  oldPriceExcl?: string | null;
  sku?: string | null;
  ean?: string | null;
  articleCode?: string | null;
  stockLevel?: number;
  stockTracking?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface VariantUpsertResult {
  variant: Variant;
  changed: boolean;
}

export function createVariantRepository(db: Database) {
  return {
    async upsertByLightspeedId(input: VariantUpsertInput): Promise<VariantUpsertResult> {
      const values = {
        shopId: input.shopId,
        productId: input.productId,
        lightspeedId: input.lightspeedId,
        title: input.title,
        priceIncl: input.priceIncl ?? null,
        priceExcl: input.priceExcl ?? null,
        oldPriceIncl: input.oldPriceIncl ?? null,
        oldPriceExcl: input.oldPriceExcl ?? null,
        sku: input.sku ?? null,
        ean: input.ean ?? null,
        articleCode: input.articleCode ?? null,
        stockLevel: input.stockLevel ?? 0,
        stockTracking: input.stockTracking ?? "disabled",
        isDefault: input.isDefault ?? false,
        sortOrder: input.sortOrder ?? 0,
        deletedAt: null,
        updatedAt: new Date(),
      };

      const [row] = await db
        .insert(schema.variants)
        .values(values)
        .onConflictDoUpdate({
          target: [schema.variants.shopId, schema.variants.lightspeedId],
          set: values,
        })
        .returning();
      if (!row) throw new Error("upsert variant failed");
      return { variant: toVariant(row), changed: true };
    },

    async listForProduct(productId: ProductId): Promise<Variant[]> {
      const rows = await db
        .select()
        .from(schema.variants)
        .where(and(eq(schema.variants.productId, productId), isNull(schema.variants.deletedAt)));
      return rows.map(toVariant);
    },

    async softDeleteMissing(shopId: ShopId, seenLightspeedIds: string[]): Promise<number> {
      if (seenLightspeedIds.length === 0) {
        const rows = await db
          .update(schema.variants)
          .set({ deletedAt: new Date() })
          .where(and(eq(schema.variants.shopId, shopId), isNull(schema.variants.deletedAt)))
          .returning({ id: schema.variants.id });
        return rows.length;
      }
      const rows = await db
        .update(schema.variants)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(schema.variants.shopId, shopId),
            isNull(schema.variants.deletedAt),
            notInArray(schema.variants.lightspeedId, seenLightspeedIds),
          ),
        )
        .returning({ id: schema.variants.id });
      return rows.length;
    },
  };
}

export type VariantRepository = ReturnType<typeof createVariantRepository>;
