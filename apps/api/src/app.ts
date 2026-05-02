import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import type { Container } from "./container.ts";
import { alertRoutes } from "./routes/alerts.ts";
import { authRoutes } from "./routes/auth.ts";
import { healthRoute } from "./routes/health.ts";
import { lightspeedRoutes } from "./routes/lightspeed.ts";
import { searchRoutes } from "./routes/search.ts";
import { shopRoutes } from "./routes/shops.ts";
import { syncRoutes } from "./routes/sync.ts";
import { widgetRoutes } from "./routes/widget.ts";

export function buildApp(container: Container) {
  const app = new OpenAPIHono();

  app.use("/api/*", cors({ origin: container.env.WEB_URL, credentials: true }));
  app.use("/auth/*", cors({ origin: container.env.WEB_URL, credentials: true }));
  // Widget endpoints are public; CORS is wildcard origin (no credentials), then domain-based auth.
  app.use("/widget/*", cors({ origin: "*", credentials: false }));

  app.route("/api", healthRoute());
  app.route("/api/shops", shopRoutes(container));
  app.route("/api/alerts", alertRoutes(container));
  app.route("/api/sync", syncRoutes(container));
  app.route("/api/search", searchRoutes(container));
  app.route("/widget", widgetRoutes(container));
  app.route("/auth", authRoutes(container));
  app.route("/lightspeed", lightspeedRoutes(container));

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { version: "0.1.0", title: "Aidey API" },
  });

  return app;
}
