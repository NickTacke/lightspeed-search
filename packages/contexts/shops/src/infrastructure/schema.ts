import { schema as identitySchema } from "@aidey/identity";
import { pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lightspeedId: text("lightspeed_id").notNull(),
    domain: text("domain").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    language: text("language").notNull().default("en"),
    cluster: text("cluster").notNull().default("eu1"),
    installToken: text("install_token"),
    userSecret: text("user_secret"),
    apiKey: text("api_key"),
    apiSecret: text("api_secret"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("shops_lightspeed_id_uq").on(t.lightspeedId),
    uniqueIndex("shops_domain_uq").on(t.domain),
  ],
);

export const userShops = pgTable(
  "user_shops",
  {
    userId: text("user_id")
      .notNull()
      .references(() => identitySchema.user.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.shopId] })],
);

export const widgetDomains = pgTable(
  "widget_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("widget_domains_domain_uq").on(t.domain)],
);
