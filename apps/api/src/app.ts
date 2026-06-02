import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import type { Container } from "./container.ts";
import { captureWithRequestId } from "./lib/sentry.ts";
import { requestId } from "./middleware/request-id.ts";
import { alertRoutes } from "./routes/alerts.ts";
import { authRoutes } from "./routes/auth.ts";
import { healthRoute } from "./routes/health.ts";
import { lightspeedRoutes } from "./routes/lightspeed.ts";
import { oauthRoutes } from "./routes/oauth.ts";
import { onboardingRoutes } from "./routes/onboarding.ts";
import { searchRoutes } from "./routes/search.ts";
import { shopRoutes } from "./routes/shops.ts";
import { syncRoutes } from "./routes/sync.ts";
import { widgetRoutes } from "./routes/widget.ts";

export function buildApp(container: Container) {
  const app = new OpenAPIHono();

  app.use("*", requestId(container.logger));

  // The dashboard + auth endpoints accept credentialed requests from the web app.
  // Widget endpoints are public (wildcard origin, no credentials) and rely on
  // domain-based auth instead. Webhook ingress (/lightspeed/*) is server-to-server
  // and needs no CORS at all.
  const dashboardCors = cors({ origin: container.env.WEB_URL, credentials: true });
  app.use("/shops/*", dashboardCors);
  app.use("/alerts/*", dashboardCors);
  app.use("/sync/*", dashboardCors);
  app.use("/search/*", dashboardCors);
  app.use("/oauth/*", dashboardCors);
  app.use("/health/*", dashboardCors);
  app.use("/auth/*", dashboardCors);
  app.use("/onboarding/*", dashboardCors);
  app.use("/widget/*", cors({ origin: "*", credentials: false }));

  app.route("/", healthRoute(container));
  app.route("/shops", shopRoutes(container));
  app.route("/alerts", alertRoutes(container));
  app.route("/sync", syncRoutes(container));
  app.route("/search", searchRoutes(container));
  app.route("/oauth", oauthRoutes(container));
  app.route("/onboarding", onboardingRoutes(container));
  app.route("/widget", widgetRoutes(container));
  app.route("/auth", authRoutes(container));
  app.route("/lightspeed", lightspeedRoutes(container));

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { version: "0.1.0", title: "Aidey API" },
  });

  app.onError((err, c) => {
    const reqId = c.get("requestId");
    const logger = c.get("logger") ?? container.logger;
    logger.error({ err: { message: err.message, stack: err.stack } }, "unhandled error");
    captureWithRequestId(err, reqId);
    return c.json({ error: "internal_error", request_id: reqId }, 500);
  });

  return app;
}
