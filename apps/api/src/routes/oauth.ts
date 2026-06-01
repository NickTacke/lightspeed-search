import { schema as identitySchema } from "@aidey/identity";
import { createLightspeedClient } from "@aidey/lightspeed";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import type { Container } from "../container.ts";

const LS_AUTHORIZE_URL = "https://www.shoplightspeed.com/oauth/authorize";
const STATE_TTL_SECONDS = 300;

// LS webhook events we need: product+category lifecycle and shop/uninstalled.
// shopRoutes.webhookIngress already handles inbound signature verification.
const REQUIRED_WEBHOOKS: Array<{ group: string; item: string }> = [
  { group: "products", item: "products.created" },
  { group: "products", item: "products.updated" },
  { group: "products", item: "products.deleted" },
  { group: "categories", item: "categories.created" },
  { group: "categories", item: "categories.updated" },
  { group: "categories", item: "categories.deleted" },
  { group: "shop", item: "shop.uninstalled" },
];

type Source = "direct" | "app_store";

function isSource(v: string | undefined): v is Source {
  return v === "direct" || v === "app_store";
}

interface StatePayload {
  source: Source;
  nonce: string;
  // Bind state to the issuing session — stops a stolen/leaked state token from
  // being replayed by another user. Verified strictly in /callback.
  sessionId: string;
  exp: number;
}

async function registerWebhooks(
  container: Container,
  shop: { cluster: "us1" | "eu1"; installToken: string; userSecret: string },
): Promise<void> {
  const webhookAddress = `${container.env.BETTER_AUTH_URL}/lightspeed/webhooks`;
  const client = createLightspeedClient({
    cluster: shop.cluster,
    apiKey: shop.installToken,
    apiSecret: shop.userSecret,
  });

  for (const event of REQUIRED_WEBHOOKS) {
    try {
      await client.request("/webhooks.json", {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            isActive: true,
            address: webhookAddress,
            format: "json",
            group: event.group,
            item: event.item,
          },
        }),
      });
    } catch (err) {
      // Idempotency: LS returns 4xx if webhook already exists. Log and continue —
      // we'd rather have a shop connected with some webhooks already registered
      // than fail the entire OAuth flow on a re-install.
      container.logger.warn(
        { err: { message: err instanceof Error ? err.message : "unknown" }, event },
        "webhook registration failed",
      );
    }
  }
}

export function oauthRoutes(container: Container) {
  const app = new Hono();

  app.get("/lightspeed/start", async (c) => {
    const sourceRaw = c.req.query("source");
    const source: Source = isSource(sourceRaw) ? sourceRaw : "direct";

    const session = (await container.auth.api.getSession({
      headers: c.req.raw.headers,
    })) as { session?: { id?: string } } | null;
    if (!session) {
      // Absolute URL so the magic-link callbackURL can redirect cross-origin
      // (web origin → api origin) once the user authenticates.
      const next = encodeURIComponent(
        `${container.env.BETTER_AUTH_URL}/api/oauth/lightspeed/start?source=${source}`,
      );
      return c.redirect(`${container.env.WEB_URL}/login?next=${next}`, 302);
    }

    const sessionId = session.session?.id;
    if (!sessionId) return c.json({ error: "session has no id" }, 500);

    const nonce = crypto.randomUUID();
    const state = await sign(
      {
        source,
        nonce,
        sessionId,
        exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
      },
      container.env.OAUTH_STATE_SECRET,
    );

    const authorize = new URL(LS_AUTHORIZE_URL);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", container.env.LIGHTSPEED_APP_KEY);
    authorize.searchParams.set("state", state);

    return c.redirect(authorize.toString(), 302);
  });

  app.get("/lightspeed/callback", async (c) => {
    const session = await container.auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.redirect(`${container.env.WEB_URL}/login`, 302);

    const code = c.req.query("code");
    const shopDomain = c.req.query("shop");
    const cluster = c.req.query("cluster");
    const state = c.req.query("state");
    if (!code || !shopDomain || !cluster || !state) {
      return c.json({ error: "missing oauth params" }, 400);
    }
    if (cluster !== "us1" && cluster !== "eu1") {
      return c.json({ error: "invalid cluster" }, 400);
    }

    // CSRF protection: state must be a JWT we signed within the last 5 minutes,
    // AND must have been issued to *this* session — prevents replay across users.
    const currentSessionId = (session as { session?: { id?: string } }).session?.id;
    try {
      const decoded = (await verify(
        state,
        container.env.OAUTH_STATE_SECRET,
        "HS256",
      )) as unknown as StatePayload;
      if (!currentSessionId || decoded.sessionId !== currentSessionId) {
        return c.json({ error: "state session mismatch" }, 400);
      }
    } catch {
      return c.json({ error: "invalid or expired state" }, 400);
    }

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
    const tokens = (await tokenRes.json()) as { access_token: string; user_secret: string };

    const newShop = await container.shops.createFromInstall({
      userId: session.user.id,
      domain: shopDomain,
      installToken: tokens.access_token,
      userSecret: tokens.user_secret,
      cluster,
    });

    // Best-effort: register webhooks now so sync works immediately. Failures logged, not fatal.
    await registerWebhooks(container, {
      cluster,
      installToken: tokens.access_token,
      userSecret: tokens.user_secret,
    });

    // Mark this shop as the user's active shop. activeShopId is a Better Auth
    // additional session field (see identity/auth.ts). Update the session row directly.
    const sessionId = (session as { session?: { id?: string } }).session?.id;
    if (sessionId) {
      await container.db
        .update(identitySchema.session)
        .set({ activeShopId: newShop.id, updatedAt: new Date() })
        .where(eq(identitySchema.session.id, sessionId));
    }

    return c.redirect(`${container.env.WEB_URL}/onboarding`, 302);
  });

  return app;
}
