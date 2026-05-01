import {
  alertIdParamSchema,
  alertSchema,
  createAlertSchema,
  updateAlertSchema,
} from "@aidey/contracts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import type { Container } from "../container.ts";

interface ScopedSession {
  user: { id: string };
  session: { activeShopId: string | null };
}

interface AlertLike {
  id: string;
  shopId: string;
  title: string;
  message: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toDto(a: AlertLike) {
  return {
    id: a.id,
    shopId: a.shopId,
    title: a.title,
    message: a.message,
    enabled: a.enabled,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function alertRoutes(container: Container) {
  const app = new OpenAPIHono();

  // Auth gate + active shop scope
  app.use("/*", async (c, next) => {
    const session = (await container.auth.api.getSession({
      headers: c.req.raw.headers,
    })) as ScopedSession | null;
    if (!session) return c.json({ error: "unauthorized" }, 401);
    if (!session.session.activeShopId) {
      return c.json({ error: "no active shop — onboard a shop first" }, 400);
    }
    (c as unknown as { set: (k: string, v: unknown) => void }).set("session", session);
    await next();
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/",
      tags: ["alerts"],
      responses: {
        200: {
          description: "list",
          content: { "application/json": { schema: z.array(alertSchema) } },
        },
        401: { description: "unauthorized" },
        400: { description: "no active shop" },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => ScopedSession }).get("session");
      const shopId = session.session.activeShopId as string;
      const alerts = await container.alerts.list(shopId as never);
      return c.json(alerts.map(toDto));
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/",
      tags: ["alerts"],
      request: {
        body: { content: { "application/json": { schema: createAlertSchema } } },
      },
      responses: {
        201: {
          description: "created",
          content: { "application/json": { schema: alertSchema } },
        },
        401: { description: "unauthorized" },
        400: { description: "no active shop" },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => ScopedSession }).get("session");
      const shopId = session.session.activeShopId as string;
      const input = c.req.valid("json");
      const alert = await container.alerts.create({ ...input, shopId: shopId as never });
      return c.json(toDto(alert), 201);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/{id}",
      tags: ["alerts"],
      request: { params: alertIdParamSchema },
      responses: {
        200: {
          description: "alert",
          content: { "application/json": { schema: alertSchema } },
        },
        404: { description: "not found" },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => ScopedSession }).get("session");
      const shopId = session.session.activeShopId as string;
      const { id } = c.req.valid("param");
      const alert = await container.alerts.get(id as never, shopId as never);
      if (!alert) return c.json({ error: "not found" }, 404);
      return c.json(toDto(alert));
    },
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags: ["alerts"],
      request: {
        params: alertIdParamSchema,
        body: { content: { "application/json": { schema: updateAlertSchema } } },
      },
      responses: {
        200: {
          description: "updated",
          content: { "application/json": { schema: alertSchema } },
        },
        404: { description: "not found" },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => ScopedSession }).get("session");
      const shopId = session.session.activeShopId as string;
      const { id } = c.req.valid("param");
      const patch = c.req.valid("json");
      const alert = await container.alerts.update(id as never, shopId as never, patch);
      if (!alert) return c.json({ error: "not found" }, 404);
      return c.json(toDto(alert));
    },
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/{id}",
      tags: ["alerts"],
      request: { params: alertIdParamSchema },
      responses: {
        204: { description: "deleted" },
        404: { description: "not found" },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => ScopedSession }).get("session");
      const shopId = session.session.activeShopId as string;
      const { id } = c.req.valid("param");
      const ok = await container.alerts.delete(id as never, shopId as never);
      if (!ok) return c.json({ error: "not found" }, 404);
      return c.body(null, 204);
    },
  );

  return app;
}
