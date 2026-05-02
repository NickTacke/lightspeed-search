import type { Database } from "@aidey/database";
import type { ShopId } from "@aidey/shops";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { type ProductId, productId } from "../domain/ids.ts";
import type { Product } from "../domain/product.ts";
import * as schema from "./schema.ts";

type Row = typeof schema.products.$inferSelect;

function toProduct(row: Row): Product {
  return {
    id: productId(row.id),
    shopId: row.shopId as unknown as ShopId,
    lightspeedId: row.lightspeedId,
    title: row.title,
    fulltitle: row.fulltitle,
    description: row.description,
    fullDescription: row.fullDescription,
    brand: row.brand,
    handle: row.handle,
    image: row.image,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    sku: row.sku,
    ean: row.ean,
    tags: row.tags,
    visible: row.visible,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export interface ProductUpsertInput {
  shopId: ShopId;
  lightspeedId: string;
  title: string;
  fulltitle?: string | null;
  description?: string | null;
  fullDescription?: string | null;
  brand?: string | null;
  handle?: string | null;
  image?: string | null;
  price?: string | null;
  compareAtPrice?: string | null;
  sku?: string | null;
  ean?: string | null;
  tags?: string[];
  visible?: boolean;
  sortOrder?: number;
}

export interface ProductUpsertResult {
  product: Product;
  changed: boolean;
}

export function createProductRepository(db: Database) {
  return {
    /**
     * Upsert by (shopId, lightspeedId). Reactivates if soft-deleted.
     * Returns the product + whether anything changed (used by sync to decide embedding regen).
     */
    async upsertByLightspeedId(input: ProductUpsertInput): Promise<ProductUpsertResult> {
      const values = {
        shopId: input.shopId,
        lightspeedId: input.lightspeedId,
        title: input.title,
        fulltitle: input.fulltitle ?? null,
        description: input.description ?? null,
        fullDescription: input.fullDescription ?? null,
        brand: input.brand ?? null,
        handle: input.handle ?? null,
        image: input.image ?? null,
        price: input.price ?? null,
        compareAtPrice: input.compareAtPrice ?? null,
        sku: input.sku ?? null,
        ean: input.ean ?? null,
        tags: input.tags ?? [],
        visible: input.visible ?? true,
        sortOrder: input.sortOrder ?? 0,
        deletedAt: null,
        updatedAt: new Date(),
      };

      const [row] = await db
        .insert(schema.products)
        .values(values)
        .onConflictDoUpdate({
          target: [schema.products.shopId, schema.products.lightspeedId],
          set: values,
        })
        .returning();
      if (!row) throw new Error("upsert product failed");
      return { product: toProduct(row), changed: true };
    },

    async findById(id: ProductId): Promise<Product | null> {
      const [row] = await db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt)))
        .limit(1);
      return row ? toProduct(row) : null;
    },

    async listForShop(shopId: ShopId): Promise<Product[]> {
      const rows = await db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.shopId, shopId), isNull(schema.products.deletedAt)));
      return rows.map(toProduct);
    },

    /**
     * Soft-delete every product for shop whose lightspeedId is NOT in the seen set.
     * Used by sync after iterating Lightspeed: anything not seen has been removed upstream.
     * Idempotent — already-deleted rows stay as-is.
     */
    async softDeleteMissing(shopId: ShopId, seenLightspeedIds: string[]): Promise<number> {
      if (seenLightspeedIds.length === 0) {
        const rows = await db
          .update(schema.products)
          .set({ deletedAt: new Date() })
          .where(and(eq(schema.products.shopId, shopId), isNull(schema.products.deletedAt)))
          .returning({ id: schema.products.id });
        return rows.length;
      }
      const rows = await db
        .update(schema.products)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(schema.products.shopId, shopId),
            isNull(schema.products.deletedAt),
            notInArray(schema.products.lightspeedId, seenLightspeedIds),
          ),
        )
        .returning({ id: schema.products.id });
      return rows.length;
    },

    async findIdByLightspeedId(shopId: ShopId, lightspeedId: string): Promise<ProductId | null> {
      const [row] = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(
          and(eq(schema.products.shopId, shopId), eq(schema.products.lightspeedId, lightspeedId)),
        )
        .limit(1);
      return row ? productId(row.id) : null;
    },
  };
}

export type ProductRepository = ReturnType<typeof createProductRepository>;
