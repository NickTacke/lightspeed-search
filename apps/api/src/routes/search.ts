import {
  searchConfigSchema,
  searchHitSchema,
  searchQuerySchema,
  updateSearchConfigSchema,
  updateWidgetConfigSchema,
  widgetConfigSchema,
} from "@aidey/contracts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import type { Container } from "../container.ts";

interface ScopedSession {
  user: { id: string };
  session: { activeShopId: string | null };
}

interface SearchConfigLike {
  shopId: string;
  enabledFields: string[];
  fieldWeights: Record<string, number>;
  semanticThreshold: number;
  resultLimit: number;
  semanticEnabled: boolean;
  exactMatchEnabled: boolean;
}

interface WidgetConfigLike {
  shopId: string;
  widgetEnabled: boolean;
  accentColor: string | null;
  borderRadius: number | null;
  darkMode: boolean | null;
  visibleFields: string[];
  maxDropdownResults: number | null;
}

function toSearchDto(c: SearchConfigLike) {
  return {
    shopId: c.shopId,
    enabledFields: c.enabledFields,
    fieldWeights: c.fieldWeights,
    semanticThreshold: c.semanticThreshold,
    resultLimit: c.resultLimit,
    semanticEnabled: c.semanticEnabled,
    exactMatchEnabled: c.exactMatchEnabled,
  };
}

function toWidgetDto(c: WidgetConfigLike) {
  return {
    shopId: c.shopId,
    widgetEnabled: c.widgetEnabled,
    accentColor: c.accentColor,
    borderRadius: c.borderRadius,
    darkMode: c.darkMode,
    visibleFields: c.visibleFields,
    maxDropdownResults: c.maxDropdownResults,
  };
}

export function searchRoutes(container: Container) {
  const app = new OpenAPIHono();

  app.use("/*", async (c, next) => {
    const session = (await container.auth.api.getSession({
      headers: c.req.raw.headers,
    })) as ScopedSession | null;
    if (!session) return c.json({ error: "unauthorized" }, 401);
    if (!session.session.activeShopId) {
      return c.json({ error: "no active shop" }, 400);
    }
    (c as unknown as { set: (k: string, v: unknown) => void }).set("session", session);
    await next();
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/config",
      tags: ["search"],
      responses: {
        200: {
          description: "combined config",
          content: {
            "application/json": {
              schema: z.object({ search: searchConfigSchema, widget: widgetConfigSchema }),
            },
          },
        },
        401: { description: "unauthorized" },
        400: { description: "no active shop" },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => ScopedSession }).get("session");
      const shopId = session.session.activeShopId as string;
      const cfg = await container.search.getConfig(shopId);
      return c.json({ search: toSearchDto(cfg.search), widget: toWidgetDto(cfg.widget) });
    },
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/config",
      tags: ["search"],
      request: { body: { content: { "application/json": { schema: updateSearchConfigSchema } } } },
      responses: {
        200: {
          description: "updated",
          content: { "application/json": { schema: searchConfigSchema } },
        },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => ScopedSession }).get("session");
      const shopId = session.session.activeShopId as string;
      const patch = c.req.valid("json");
      const updated = await container.search.updateSearchConfig(shopId, patch);
      return c.json(toSearchDto(updated));
    },
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/widget",
      tags: ["search"],
      request: { body: { content: { "application/json": { schema: updateWidgetConfigSchema } } } },
      responses: {
        200: {
          description: "updated",
          content: { "application/json": { schema: widgetConfigSchema } },
        },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => ScopedSession }).get("session");
      const shopId = session.session.activeShopId as string;
      const patch = c.req.valid("json");
      const updated = await container.search.updateWidgetConfig(shopId, patch);
      return c.json(toWidgetDto(updated));
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/query",
      tags: ["search"],
      request: { body: { content: { "application/json": { schema: searchQuerySchema } } } },
      responses: {
        200: {
          description: "hits",
          content: { "application/json": { schema: z.array(searchHitSchema) } },
        },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => ScopedSession }).get("session");
      const shopId = session.session.activeShopId as string;
      const input = c.req.valid("json");
      const hits = await container.search.query(shopId, input);
      return c.json(hits);
    },
  );

  return app;
}
