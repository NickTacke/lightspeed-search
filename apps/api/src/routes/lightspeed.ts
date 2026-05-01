import { Hono } from "hono";
import type { Container } from "../container.ts";

export function lightspeedRoutes(container: Container) {
  const app = new Hono();

  // OAuth callback — Lightspeed redirects here with code, shop, cluster
  app.get("/auth/callback", async (c) => {
    const session = await container.auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.redirect(`${container.env.WEB_URL}/login`);

    const code = c.req.query("code");
    const shop = c.req.query("shop");
    const cluster = c.req.query("cluster");
    if (!code || !shop || !cluster) return c.json({ error: "missing oauth params" }, 400);

    if (cluster !== "us1" && cluster !== "eu1") {
      return c.json({ error: "invalid cluster" }, 400);
    }

    // Exchange code for installToken + userSecret
    const tokenRes = await fetch(`https://api.shoplightspeed.com/${cluster}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: container.env.LIGHTSPEED_APP_KEY,
        client_secret: container.env.LIGHTSPEED_APP_SECRET,
      }),
    });
    if (!tokenRes.ok) return c.json({ error: "lightspeed token exchange failed" }, 400);
    const data = (await tokenRes.json()) as { access_token: string; user_secret: string };

    const newShop = await container.shops.createFromInstall({
      userId: session.user.id,
      domain: shop,
      installToken: data.access_token,
      userSecret: data.user_secret,
      cluster,
    });

    return c.redirect(`${container.env.WEB_URL}/dashboard?shop=${newShop.id}`);
  });

  // Webhook ingress stub (Phase 7 fills body — sync.handleWebhook + signature verify)
  app.post("/webhooks", async (_c) => {
    // TODO: Phase 7 — verify signature, dispatch to sync.handleWebhook
    return Response.json({ received: true });
  });

  return app;
}
