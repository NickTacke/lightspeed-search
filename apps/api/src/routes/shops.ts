import { onboardManualKeySchema, shopSchema } from "@aidey/contracts";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import type { Container } from "../container.ts";

interface SessionUser {
  user: { id: string };
}

export function shopRoutes(container: Container) {
  const app = new OpenAPIHono();

  // Auth gate via Better Auth — every shop route requires a session
  app.use("/*", async (c, next) => {
    const session = await container.auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    (c as unknown as { set: (k: string, v: unknown) => void }).set("session", session);
    await next();
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/",
      tags: ["shops"],
      responses: {
        200: {
          description: "list of shops the current user owns",
          content: { "application/json": { schema: z.array(shopSchema) } },
        },
        401: { description: "unauthorized" },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => unknown }).get(
        "session",
      ) as SessionUser;
      const shops = await container.shops.listForUser(session.user.id);
      return c.json(
        shops.map((s) => ({
          id: s.id,
          domain: s.domain,
          name: s.name,
          cluster: s.cluster,
        })),
      );
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/onboard-manual",
      tags: ["shops"],
      request: {
        body: {
          content: { "application/json": { schema: onboardManualKeySchema } },
        },
      },
      responses: {
        201: {
          description: "shop created from manual API key",
          content: { "application/json": { schema: shopSchema } },
        },
        401: { description: "unauthorized" },
        400: { description: "invalid credentials" },
      },
    }),
    async (c) => {
      const session = (c as unknown as { get: (k: string) => unknown }).get(
        "session",
      ) as SessionUser;
      const input = c.req.valid("json");
      try {
        const shop = await container.shops.createFromManualKey({
          ...input,
          userId: session.user.id,
        });
        return c.json(
          { id: shop.id, domain: shop.domain, name: shop.name, cluster: shop.cluster },
          201,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        return c.json({ error: message }, 400);
      }
    },
  );

  return app;
}
