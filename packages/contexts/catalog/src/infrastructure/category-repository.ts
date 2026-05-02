import type { Database } from "@aidey/database";
import type { ShopId } from "@aidey/shops";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import type { Category } from "../domain/category.ts";
import { type CategoryId, categoryId, type ProductId } from "../domain/ids.ts";
import * as schema from "./schema.ts";

type Row = typeof schema.categories.$inferSelect;

function toCategory(row: Row): Category {
  return {
    id: categoryId(row.id),
    shopId: row.shopId as unknown as ShopId,
    lightspeedId: row.lightspeedId,
    title: row.title,
    handle: row.handle,
    description: row.description,
    image: row.image,
    visible: row.visible,
    sortOrder: row.sortOrder,
    parentId: row.parentId ? categoryId(row.parentId) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export interface CategoryUpsertInput {
  shopId: ShopId;
  lightspeedId: string;
  title: string;
  handle?: string | null;
  description?: string | null;
  image?: string | null;
  visible?: boolean;
  sortOrder?: number;
  parentLightspeedId?: string | null;
}

export interface CategoryUpsertResult {
  category: Category;
  changed: boolean;
}

export function createCategoryRepository(db: Database) {
  return {
    async upsertByLightspeedId(input: CategoryUpsertInput): Promise<CategoryUpsertResult> {
      let parentId: string | null = null;
      if (input.parentLightspeedId) {
        const [parentRow] = await db
          .select({ id: schema.categories.id })
          .from(schema.categories)
          .where(
            and(
              eq(schema.categories.shopId, input.shopId),
              eq(schema.categories.lightspeedId, input.parentLightspeedId),
            ),
          )
          .limit(1);
        parentId = parentRow?.id ?? null;
      }

      const values = {
        shopId: input.shopId,
        lightspeedId: input.lightspeedId,
        title: input.title,
        handle: input.handle ?? null,
        description: input.description ?? null,
        image: input.image ?? null,
        visible: input.visible ?? true,
        sortOrder: input.sortOrder ?? 0,
        parentId,
        deletedAt: null,
        updatedAt: new Date(),
      };

      const [row] = await db
        .insert(schema.categories)
        .values(values)
        .onConflictDoUpdate({
          target: [schema.categories.shopId, schema.categories.lightspeedId],
          set: values,
        })
        .returning();
      if (!row) throw new Error("upsert category failed");
      return { category: toCategory(row), changed: true };
    },

    async findById(id: CategoryId): Promise<Category | null> {
      const [row] = await db
        .select()
        .from(schema.categories)
        .where(and(eq(schema.categories.id, id), isNull(schema.categories.deletedAt)))
        .limit(1);
      return row ? toCategory(row) : null;
    },

    async listForShop(shopId: ShopId): Promise<Category[]> {
      const rows = await db
        .select()
        .from(schema.categories)
        .where(and(eq(schema.categories.shopId, shopId), isNull(schema.categories.deletedAt)));
      return rows.map(toCategory);
    },

    async listForProduct(productId: ProductId): Promise<Category[]> {
      const rows = await db
        .select({ category: schema.categories })
        .from(schema.productCategories)
        .innerJoin(schema.categories, eq(schema.productCategories.categoryId, schema.categories.id))
        .where(
          and(
            eq(schema.productCategories.productId, productId),
            isNull(schema.categories.deletedAt),
          ),
        );
      return rows.map((r) => toCategory(r.category));
    },

    async softDeleteMissing(shopId: ShopId, seenLightspeedIds: string[]): Promise<number> {
      if (seenLightspeedIds.length === 0) {
        const rows = await db
          .update(schema.categories)
          .set({ deletedAt: new Date() })
          .where(and(eq(schema.categories.shopId, shopId), isNull(schema.categories.deletedAt)))
          .returning({ id: schema.categories.id });
        return rows.length;
      }
      const rows = await db
        .update(schema.categories)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(schema.categories.shopId, shopId),
            isNull(schema.categories.deletedAt),
            notInArray(schema.categories.lightspeedId, seenLightspeedIds),
          ),
        )
        .returning({ id: schema.categories.id });
      return rows.length;
    },

    async findIdByLightspeedId(shopId: ShopId, lightspeedId: string): Promise<CategoryId | null> {
      const [row] = await db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(
          and(
            eq(schema.categories.shopId, shopId),
            eq(schema.categories.lightspeedId, lightspeedId),
          ),
        )
        .limit(1);
      return row ? categoryId(row.id) : null;
    },

    /**
     * Replace the full category set for a product. Transactional — deletes all existing links and
     * inserts the new set. Idempotent: pass the exact desired set and it converges.
     */
    async setProductCategories(productId: ProductId, categoryIds: CategoryId[]): Promise<void> {
      await db.transaction(async (tx) => {
        await tx
          .delete(schema.productCategories)
          .where(eq(schema.productCategories.productId, productId));
        if (categoryIds.length === 0) return;
        await tx
          .insert(schema.productCategories)
          .values(categoryIds.map((cid) => ({ productId, categoryId: cid })));
      });
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
