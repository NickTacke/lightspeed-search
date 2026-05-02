import { schema as catalogSchema } from "@aidey/catalog";
import { schema as shopsSchema } from "@aidey/shops";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType: () => "vector(1536)",
  toDriver: (value) => `[${value.join(",")}]`,
  fromDriver: (value) => JSON.parse(value),
});

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const productEmbeddings = pgTable(
  "product_embeddings",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => catalogSchema.products.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsSchema.shops.id, { onDelete: "cascade" }),
    embedding: vector1536("embedding"),
    searchVector: tsvector("search_vector"),
    searchText: text("search_text"),
    embeddingHash: text("embedding_hash"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
  },
  (t) => [
    index("product_embeddings_search_vector_idx").using("gin", t.searchVector),
    index("product_embeddings_shop_idx").on(t.shopId),
  ],
);

export const searchConfigs = pgTable(
  "search_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsSchema.shops.id, { onDelete: "cascade" }),
    enabledFields: text("enabled_fields")
      .array()
      .notNull()
      .default(["title", "tags", "brand", "description"]),
    fieldWeights: jsonb("field_weights").notNull().default({}),
    semanticThreshold: integer("semantic_threshold").notNull().default(3),
    resultLimit: integer("result_limit").notNull().default(20),
    semanticEnabled: boolean("semantic_enabled").notNull().default(true),
    exactMatchEnabled: boolean("exact_match_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("search_configs_shop_uq").on(t.shopId)],
);

export const widgetConfigs = pgTable(
  "widget_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsSchema.shops.id, { onDelete: "cascade" }),
    widgetEnabled: boolean("widget_enabled").notNull().default(true),
    accentColor: text("accent_color"),
    borderRadius: integer("border_radius"),
    darkMode: boolean("dark_mode"),
    visibleFields: text("visible_fields")
      .array()
      .notNull()
      .default(["image", "brand", "title", "price", "salePrice", "categoryTag"]),
    maxDropdownResults: integer("max_dropdown_results"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("widget_configs_shop_uq").on(t.shopId)],
);
