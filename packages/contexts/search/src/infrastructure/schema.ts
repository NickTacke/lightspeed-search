import { schema as catalogSchema } from "@aidey/catalog";
import { schema as shopsSchema } from "@aidey/shops";
import { customType, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
