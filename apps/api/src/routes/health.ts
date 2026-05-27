import { healthResponseSchema, readyResponseSchema } from "@aidey/contracts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import type { Container } from "../container.ts";

const startedAt = Date.now();

export function healthRoute(container: Container) {
  const app = new OpenAPIHono();

  app.openapi(
    createRoute({
      method: "get",
      path: "/health",
      tags: ["system"],
      responses: {
        200: {
          description: "ok",
          content: { "application/json": { schema: healthResponseSchema } },
        },
      },
    }),
    (c) =>
      c.json({
        status: "ok" as const,
        uptime: Math.round((Date.now() - startedAt) / 1000),
      }),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/health/ready",
      tags: ["system"],
      responses: {
        200: {
          description: "ready",
          content: { "application/json": { schema: readyResponseSchema } },
        },
        503: {
          description: "degraded",
          content: { "application/json": { schema: readyResponseSchema } },
        },
      },
    }),
    async (c) => {
      let dbOk = false;
      try {
        await container.db.execute(sql`select 1`);
        dbOk = true;
      } catch (e) {
        const logger = c.get("logger");
        logger?.warn({ err: (e as Error).message }, "readiness DB check failed");
      }
      return c.json(
        {
          status: (dbOk ? "ok" : "degraded") as "ok" | "degraded",
          checks: { database: (dbOk ? "ok" : "fail") as "ok" | "fail" },
        },
        dbOk ? 200 : 503,
      );
    },
  );

  return app;
}
