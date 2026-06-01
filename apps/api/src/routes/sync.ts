import { syncLogSchema, syncTriggerResponseSchema } from "@aidey/contracts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import type { Container } from "../container.ts";
import { activeShop } from "../middleware/active-shop.ts";

interface SyncLogLike {
  id: string;
  shopId: string;
  status: string;
  trigger: string;
  productsTotal: number;
  productsAdded: number;
  productsUpdated: number;
  productsFailed: number;
  categoriesTotal: number;
  embeddingsGenerated: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

function toDto(log: SyncLogLike) {
  return {
    id: log.id,
    shopId: log.shopId,
    status: log.status,
    trigger: log.trigger,
    productsTotal: log.productsTotal,
    productsAdded: log.productsAdded,
    productsUpdated: log.productsUpdated,
    productsFailed: log.productsFailed,
    categoriesTotal: log.categoriesTotal,
    embeddingsGenerated: log.embeddingsGenerated,
    errorMessage: log.errorMessage,
    startedAt: log.startedAt.toISOString(),
    completedAt: log.completedAt?.toISOString() ?? null,
  };
}

export function syncRoutes(container: Container) {
  const app = new OpenAPIHono();

  app.use("/*", activeShop(container));

  app.openapi(
    createRoute({
      method: "get",
      path: "/logs",
      tags: ["sync"],
      responses: {
        200: {
          description: "logs",
          content: { "application/json": { schema: z.array(syncLogSchema) } },
        },
        401: { description: "unauthorized" },
        400: { description: "no active shop" },
      },
    }),
    async (c) => {
      const shopId = c.get("activeShop").id as string;
      const logs = await container.sync.listLogs(shopId as never, 20);
      return c.json(logs.map(toDto));
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/trigger",
      tags: ["sync"],
      responses: {
        202: {
          description: "queued",
          content: { "application/json": { schema: syncTriggerResponseSchema } },
        },
        404: { description: "shop not found" },
        401: { description: "unauthorized" },
        400: { description: "no active shop" },
      },
    }),
    async (c) => {
      const shop = c.get("activeShop");
      // Fire-and-forget; UI polls /logs to see progress
      container.sync.fullSync(shop, "manual").catch((err) => {
        console.error("[sync] manual trigger failed", err);
      });
      return c.json({ status: "queued" as const }, 202);
    },
  );

  return app;
}
