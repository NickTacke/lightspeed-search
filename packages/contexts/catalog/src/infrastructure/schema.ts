import { schema as shopsSchema } from "@aidey/shops";
import {
  type AnyPgColumn,
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsSchema.shops.id, { onDelete: "cascade" }),
    lightspeedId: text("lightspeed_id").notNull(),
    title: text("title").notNull(),
    fulltitle: text("fulltitle"),
    description: text("description"),
    fullDescription: text("full_description"),
    brand: text("brand"),
    handle: text("handle"),
    image: text("image"),
    price: decimal("price"),
    compareAtPrice: decimal("compare_at_price"),
    sku: text("sku"),
    ean: text("ean"),
    tags: text("tags").array().notNull().default([]),
    visible: boolean("visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("products_shop_ls_uq").on(t.shopId, t.lightspeedId),
    index("products_shop_active_idx").on(t.shopId, t.deletedAt),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsSchema.shops.id, { onDelete: "cascade" }),
    lightspeedId: text("lightspeed_id").notNull(),
    title: text("title").notNull(),
    handle: text("handle"),
    description: text("description"),
    image: text("image"),
    visible: boolean("visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("categories_shop_ls_uq").on(t.shopId, t.lightspeedId),
    index("categories_shop_active_idx").on(t.shopId, t.deletedAt),
    index("categories_parent_idx").on(t.parentId),
  ],
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsSchema.shops.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    lightspeedId: text("lightspeed_id").notNull(),
    title: text("title").notNull(),
    priceIncl: decimal("price_incl"),
    priceExcl: decimal("price_excl"),
    oldPriceIncl: decimal("old_price_incl"),
    oldPriceExcl: decimal("old_price_excl"),
    sku: text("sku"),
    ean: text("ean"),
    articleCode: text("article_code"),
    stockLevel: integer("stock_level").notNull().default(0),
    stockTracking: text("stock_tracking").notNull().default("disabled"),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("variants_shop_ls_uq").on(t.shopId, t.lightspeedId),
    index("variants_product_idx").on(t.productId),
    index("variants_shop_article_idx").on(t.shopId, t.articleCode),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] })],
);
