import { verifyWebhookSignature } from "@aidey/lightspeed";
import { Hono } from "hono";
import type { Container } from "../container.ts";

export function lightspeedRoutes(container: Container) {
  const app = new Hono();

  // Webhook ingress — full signature verification + routing to sync.
  // OAuth start/callback live in routes/oauth.ts.
  app.post("/webhooks", async (c) => {
    const body = await c.req.text();
    const signature = c.req.header("x-shoplightspeed-signature") ?? "";
    const shopDomain = c.req.header("x-shoplightspeed-shop-url") ?? "";
    const event = c.req.header("x-shoplightspeed-event") ?? "";
    if (!shopDomain) return c.json({ error: "missing shop header" }, 400);

    // Resolve the shop to get the secret used for signature verification.
    // Lightspeed signs with the shop's user_secret (OAuth) or api_secret (manual).
    const shop = await container.shops.getByDomain(shopDomain);
    if (!shop) return c.json({ error: "unknown shop" }, 404);
    const secret = shop.userSecret ?? shop.apiSecret;
    if (!secret) return c.json({ error: "shop has no secret" }, 401);

    if (!verifyWebhookSignature({ body, signature, secret })) {
      return c.json({ error: "invalid signature" }, 401);
    }

    // shop.uninstalled fires when the merchant removes aidey from their LS shop.
    // Soft-delete the row so widget/api calls scoped to this shop fail closed.
    // M14 will hook a Stripe subscription cancel into the uninstall path.
    if (event === "shop.uninstalled") {
      await container.shops.uninstall(shop.id);
      return c.json({ received: true }, 202);
    }

    const payload = body ? JSON.parse(body) : {};
    // Fire-and-forget; respond 202 so Lightspeed doesn't retry on a slow sync
    container.sync.handleWebhook({ shop, event, payload }).catch((err) => {
      console.error("[webhook] handler failed", err);
    });
    return c.json({ received: true }, 202);
  });

  return app;
}
