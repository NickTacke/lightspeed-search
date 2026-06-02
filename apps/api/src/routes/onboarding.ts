import { OpenAPIHono } from "@hono/zod-openapi";
import type { Container } from "../container.ts";
import { activeShop } from "../middleware/active-shop.ts";

const FETCH_TIMEOUT_MS = 5_000;

/**
 * Onboarding-wizard backend endpoints — scoped to the merchant's active shop.
 * Separate from /shops because the dashboard's shop endpoints don't require
 * an active shop (e.g. listing all of them) while these always do.
 */
export function onboardingRoutes(container: Container) {
  const app = new OpenAPIHono();
  app.use("/*", activeShop(container));

  /**
   * Fetch the shop's storefront HTML and check whether the widget loader
   * script tag is present. Replaces the iframe-based postMessage check —
   * LS storefronts send X-Frame-Options: DENY so the iframe approach was
   * structurally broken.
   */
  app.get("/install-check", async (c) => {
    const shop = c.get("activeShop");
    const loaderUrl = container.env.WIDGET_LOADER_URL;
    if (!loaderUrl) {
      return c.json({ installed: false, reason: "loader_url_not_configured" as const });
    }
    if (!shop.domain || /^\d+$/.test(shop.domain)) {
      // shop.domain falls back to the numeric LS id when LS's /shop.json
      // returned no mainDomain — can't fetch http://356891.
      return c.json({ installed: false, reason: "no_storefront_domain" as const });
    }

    const storefrontUrl = `https://${shop.domain}`;
    try {
      const res = await fetch(storefrontUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        // No CDN-style branding/user-agent — let Cloudflare/anti-bot rules
        // treat us as a generic crawler. If a real merchant trips a WAF
        // they'll see "unreachable" and can use the manual continue button.
      });
      if (!res.ok) {
        return c.json({
          installed: false,
          reason: "storefront_unreachable" as const,
          httpStatus: res.status,
        });
      }
      const html = await res.text();
      const installed = html.includes(loaderUrl);
      return c.json({ installed, storefrontUrl });
    } catch (err) {
      const logger = c.get("logger") ?? container.logger;
      logger.warn(
        { err: { message: err instanceof Error ? err.message : "unknown" }, storefrontUrl },
        "install-check fetch failed",
      );
      return c.json({ installed: false, reason: "fetch_error" as const });
    }
  });

  return app;
}
