import { schema as shopsSchema } from "@aidey/shops";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsSchema.shops.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("syncing"),
    trigger: text("trigger").notNull().default("cron"),
    productsTotal: integer("products_total").notNull().default(0),
    productsAdded: integer("products_added").notNull().default(0),
    productsUpdated: integer("products_updated").notNull().default(0),
    productsFailed: integer("products_failed").notNull().default(0),
    categoriesTotal: integer("categories_total").notNull().default(0),
    embeddingsGenerated: integer("embeddings_generated").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("sync_logs_shop_idx").on(t.shopId),
    index("sync_logs_shop_status_idx").on(t.shopId, t.status),
  ],
);
