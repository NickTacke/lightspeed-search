import {
  publicAlertSchema,
  widgetSearchHitSchema,
  widgetSearchQuerySchema,
} from "@aidey/contracts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import type { Container } from "../container.ts";
import { widgetAuth } from "../middleware/widget-auth.ts";

export function widgetRoutes(container: Container) {
  const app = new OpenAPIHono();

  app.use("/*", widgetAuth(container));

  app.openapi(
    createRoute({
      method: "get",
      path: "/alerts",
      tags: ["widget"],
      responses: {
        200: {
          description: "active alerts for the calling shop",
          content: { "application/json": { schema: z.array(publicAlertSchema) } },
        },
        403: { description: "domain not authorized" },
      },
    }),
    async (c) => {
      const shopId = (c as unknown as { get: (k: string) => string }).get("widgetShopId");
      const alerts = await container.alerts.list(shopId as never);
      // Only enabled alerts are visible publicly; titles + messages stripped of internal fields.
      const enabled = alerts.filter((a) => a.enabled);
      return c.json(
        enabled.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          enabled: a.enabled,
        })),
      );
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/search",
      tags: ["widget"],
      request: { body: { content: { "application/json": { schema: widgetSearchQuerySchema } } } },
      responses: {
        200: {
          description: "search hits",
          content: { "application/json": { schema: z.array(widgetSearchHitSchema) } },
        },
        403: { description: "domain not authorized" },
      },
    }),
    async (c) => {
      const shopId = (c as unknown as { get: (k: string) => string }).get("widgetShopId");
      const input = c.req.valid("json");
      const hits = await container.search.query(shopId as never, {
        query: input.query,
        limit: input.limit,
      });
      return c.json(hits);
    },
  );

  return app;
}
