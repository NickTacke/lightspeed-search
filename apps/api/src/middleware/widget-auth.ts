import { schema as shopsSchema } from "@aidey/shops";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import type { Container } from "../container.ts";

const widgetDomains = shopsSchema.widgetDomains;

interface WidgetCtxValues {
  widgetShopId: string;
}

/**
 * Resolves the widget request to a shop via the request's `Origin` header.
 * - Looks up Origin's host in the widget_domains table.
 * - Cross-checks Referer host matches Origin host (when both present) to make
 *   simple non-browser spoofing harder.
 * - Sets `widgetShopId` on the Hono context for downstream handlers.
 *
 * No user session involved — the widget is public, scoped to a shop's allowlisted domains.
 */
export function widgetAuth(container: Container) {
  return async (c: Context, next: Next) => {
    const origin = c.req.header("origin");
    if (!origin) return c.json({ error: "missing origin" }, 400);

    let host: string;
    try {
      host = new URL(origin).host;
    } catch {
      return c.json({ error: "invalid origin" }, 400);
    }

    const referer = c.req.header("referer");
    if (referer) {
      try {
        const refererHost = new URL(referer).host;
        if (refererHost !== host) return c.json({ error: "origin/referer mismatch" }, 403);
      } catch {
        // Malformed referer — treat as missing; don't fail the request.
      }
    }

    const [match] = await container.db
      .select({ shopId: widgetDomains.shopId })
      .from(widgetDomains)
      .where(eq(widgetDomains.domain, host))
      .limit(1);

    if (!match) return c.json({ error: "domain not authorized" }, 403);

    (c as unknown as { set: (k: string, v: unknown) => void }).set("widgetShopId", match.shopId);
    await next();
    return undefined;
  };
}

export type WidgetContextValues = WidgetCtxValues;
