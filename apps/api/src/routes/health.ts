import { healthResponseSchema } from "@aidey/contracts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

const startedAt = Date.now();

export function healthRoute() {
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

  return app;
}
