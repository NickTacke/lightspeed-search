import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import type { Container } from "./container.ts";
import { healthRoute } from "./routes/health.ts";

export function buildApp(container: Container) {
  const app = new OpenAPIHono();

  app.use(
    "/api/*",
    cors({
      origin: container.env.WEB_URL,
      credentials: true,
    }),
  );

  app.route("/api", healthRoute());

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { version: "0.1.0", title: "Aidey API" },
  });

  return app;
}
