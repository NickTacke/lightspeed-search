import { createHash, timingSafeEqual } from "node:crypto";
import { schema as identitySchema } from "@aidey/identity";
import { createLightspeedClient } from "@aidey/lightspeed";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Container } from "../container.ts";

// Lightspeed's direct install endpoint. The merchant lands here with our
// api_key + their shop_id, sees the consent screen, and on approval LS
// redirects to our callback URL with token/signature/shop_id/cluster_id/etc.
const LS_INSTALL_HOST = "https://api.webshopapp.com";
type Locale = "nl" | "be" | "us" | "fr" | "de" | "es" | "it";
const DEFAULT_LOCALE: Locale = "nl";
// Accept a ±5min window on the callback timestamp to deflect replays without
// being so tight that mild clock drift bricks installs. LS doesn't specify a
// limit so this is a defensive default.
const INSTALL_TIMESTAMP_SKEW_SECONDS = 300;

function isLocale(v: string | undefined): v is Locale {
  return (
    v === "nl" || v === "be" || v === "us" || v === "fr" || v === "de" || v === "es" || v === "it"
  );
}

/** Numeric shop_id from the LS partner portal. Accept digits only. */
function parseShopId(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

function md5Hex(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

/**
 * Per https://developers.lightspeedhq.com/ecom/tutorials/installing-an-app/:
 * concatenate the install-callback params (excluding cluster_id and signature)
 * sorted alphabetically by key as "key=value" with no separator, append the
 * app secret, md5. Returns lowercase hex.
 */
function computeInstallSignature(
  params: { language: string; shop_id: string; timestamp: string; token: string },
  appSecret: string,
): string {
  const ordered: Array<[string, string]> = [
    ["language", params.language],
    ["shop_id", params.shop_id],
    ["timestamp", params.timestamp],
    ["token", params.token],
  ];
  ordered.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const payload = ordered.map(([k, v]) => `${k}=${v}`).join("");
  return md5Hex(payload + appSecret);
}

function timingSafeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

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

async function registerWebhooks(
  container: Container,
  shop: { cluster: "us1" | "eu1"; userSecret: string },
): Promise<void> {
  const webhookAddress = `${container.env.BETTER_AUTH_URL}/lightspeed/webhooks`;
  // Per LS docs, every API call is Basic(APP_KEY, userSecret). userSecret is the
  // per-shop md5(token + APP_SECRET) we stored at install time.
  const client = createLightspeedClient({
    cluster: shop.cluster,
    apiKey: container.env.LIGHTSPEED_APP_KEY,
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
      // than fail the entire install on a re-install.
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

    const session = await container.auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      // Carry shop_id + locale through the login round-trip so the merchant
      // can resume the install flow once authenticated.
      const passthrough = new URLSearchParams({ source });
      const sid = c.req.query("shop_id");
      const loc = c.req.query("locale");
      if (sid) passthrough.set("shop_id", sid);
      if (loc) passthrough.set("locale", loc);
      const next = encodeURIComponent(
        `${container.env.BETTER_AUTH_URL}/oauth/lightspeed/start?${passthrough}`,
      );
      return c.redirect(`${container.env.WEB_URL}/login?next=${next}`, 302);
    }

    // Required: LS shop_id (numeric). Captured on the landing page form;
    // merchants find it in their LS partner portal or admin URL.
    const shopId = parseShopId(c.req.query("shop_id"));
    if (!shopId) {
      return c.redirect(`${container.env.WEB_URL}/?missing=shop_id`, 302);
    }

    const localeRaw = c.req.query("locale");
    const locale: Locale = isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE;

    // The install URL itself is unsigned — LS doesn't propagate arbitrary state
    // back through the callback. CSRF protection on the callback side instead
    // relies on the LS-issued HMAC signature (proving the request is from LS)
    // and the user's Better-Auth session cookie (proving an authenticated user
    // is in the loop). We don't generate a state JWT here.
    const install = new URL(`${LS_INSTALL_HOST}/${locale}/apps/install`);
    install.searchParams.set("api_key", container.env.LIGHTSPEED_APP_KEY);
    install.searchParams.set("shop_id", shopId);

    return c.redirect(install.toString(), 302);
  });

  app.get("/lightspeed/callback", async (c) => {
    const session = await container.auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.redirect(`${container.env.WEB_URL}/login`, 302);

    // LS install-callback shape (per the developer-portal tutorial). Note the
    // params differ from a standard OAuth2 callback — no `code`, no `state`.
    const token = c.req.query("token");
    const shopIdParam = c.req.query("shop_id");
    const clusterRaw = c.req.query("cluster_id");
    const language = c.req.query("language");
    const timestamp = c.req.query("timestamp");
    const signatureParam = c.req.query("signature");
    if (!token || !shopIdParam || !clusterRaw || !language || !timestamp || !signatureParam) {
      return c.json({ error: "missing install params" }, 400);
    }
    if (clusterRaw !== "eu1" && clusterRaw !== "us1") {
      return c.json({ error: "invalid cluster_id" }, 400);
    }
    const cluster = clusterRaw;

    // Verify the install signature using the documented algorithm.
    const expected = computeInstallSignature(
      { language, shop_id: shopIdParam, timestamp, token },
      container.env.LIGHTSPEED_APP_SECRET,
    );
    if (!timingSafeHexEqual(expected, signatureParam)) {
      return c.json({ error: "invalid signature" }, 401);
    }

    // Replay window check (LS doesn't specify one; ±5 min is conservative).
    const tsNum = Number(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > INSTALL_TIMESTAMP_SKEW_SECONDS) {
      return c.json({ error: "expired or invalid timestamp" }, 400);
    }

    // Per LS docs: userSecret = md5(token + APP_SECRET). LS derives the same
    // value on their side, so this string is what they use to sign outgoing
    // webhooks AND what we use as the Basic-auth password for outbound calls.
    const userSecret = md5Hex(token + container.env.LIGHTSPEED_APP_SECRET);

    const newShop = await container.shops.createFromInstall({
      userId: session.user.id,
      // Domain is fetched from LS in createFromInstall; pass a fallback in case
      // the LS shop record doesn't populate it (unusual).
      domain: "",
      appKey: container.env.LIGHTSPEED_APP_KEY,
      installToken: token,
      userSecret,
      cluster,
    });

    // Best-effort: register webhooks now so sync works immediately. Failures logged, not fatal.
    await registerWebhooks(container, { cluster, userSecret });

    // Fire-and-forget initial catalog sync. The merchant lands on /onboarding/sync
    // which polls /sync/status; the wizard waits for status=success to advance.
    container.sync.fullSync(newShop, "manual").catch((err) => {
      container.logger.warn(
        { err: { message: err instanceof Error ? err.message : "unknown" }, shopId: newShop.id },
        "initial post-install sync failed",
      );
    });

    // Mark this shop as the user's active shop (Better Auth additional session field).
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
