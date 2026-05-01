import type { Database } from "@aidey/database";
import { and, eq, isNull } from "drizzle-orm";
import { type ShopId, shopId } from "../domain/ids.ts";
import type { Shop, ShopCluster } from "../domain/shop.ts";
import * as schema from "./schema.ts";

type ShopRow = typeof schema.shops.$inferSelect;

function toShop(row: ShopRow): Shop {
  return {
    id: shopId(row.id),
    lightspeedId: row.lightspeedId,
    domain: row.domain,
    name: row.name,
    email: row.email,
    language: row.language,
    cluster: row.cluster as ShopCluster,
    installToken: row.installToken,
    userSecret: row.userSecret,
    apiKey: row.apiKey,
    apiSecret: row.apiSecret,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export interface InsertShopWithUserLinkInput {
  userId: string;
  lightspeedId: string;
  domain: string;
  name: string;
  email: string | null;
  language: string;
  cluster: ShopCluster;
  installToken: string | null;
  userSecret: string | null;
  apiKey: string | null;
  apiSecret: string | null;
}

export function createShopRepository(db: Database) {
  return {
    async findById(id: ShopId): Promise<Shop | null> {
      const [row] = await db
        .select()
        .from(schema.shops)
        .where(and(eq(schema.shops.id, id), isNull(schema.shops.deletedAt)))
        .limit(1);
      return row ? toShop(row) : null;
    },

    async findByDomain(domain: string): Promise<Shop | null> {
      const [row] = await db
        .select()
        .from(schema.shops)
        .where(and(eq(schema.shops.domain, domain), isNull(schema.shops.deletedAt)))
        .limit(1);
      return row ? toShop(row) : null;
    },

    async listForUser(userId: string): Promise<Shop[]> {
      const rows = await db
        .select({ shop: schema.shops })
        .from(schema.userShops)
        .innerJoin(schema.shops, eq(schema.userShops.shopId, schema.shops.id))
        .where(and(eq(schema.userShops.userId, userId), isNull(schema.shops.deletedAt)));
      return rows.map((r) => toShop(r.shop));
    },

    async insertWithUserLink(input: InsertShopWithUserLinkInput): Promise<Shop> {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(schema.shops)
          .values({
            lightspeedId: input.lightspeedId,
            domain: input.domain,
            name: input.name,
            email: input.email,
            language: input.language,
            cluster: input.cluster,
            installToken: input.installToken,
            userSecret: input.userSecret,
            apiKey: input.apiKey,
            apiSecret: input.apiSecret,
          })
          .returning();
        if (!row) throw new Error("insert shop failed");

        await tx.insert(schema.userShops).values({
          userId: input.userId,
          shopId: row.id,
          role: "owner",
        });

        await tx.insert(schema.widgetDomains).values({
          shopId: row.id,
          domain: input.domain,
        });

        return toShop(row);
      });
    },
  };
}

export type ShopRepository = ReturnType<typeof createShopRepository>;
