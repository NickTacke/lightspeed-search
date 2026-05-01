import { schema as shopsSchema } from "@aidey/shops";
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsSchema.shops.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("alerts_shop_idx").on(t.shopId)],
);
