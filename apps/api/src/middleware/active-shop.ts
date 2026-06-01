import type { Shop } from "@aidey/shops";
import type { MiddlewareHandler } from "hono";
import type { Container } from "../container.ts";

// Pre-M14 plan stub. M14 replaces this with the real billing-context lookup.
export type Plan = "starter" | "pro";
const STUB_PLAN: Plan = "starter";

interface BetterAuthSession {
  user: { id: string };
  session: { id: string; activeShopId: string | null };
}

declare module "hono" {
  interface ContextVariableMap {
    session: BetterAuthSession;
    activeShop: Shop;
    plan: Plan;
  }
}

/**
 * Loads the current user's active shop + plan into the request context.
 * Use on any route group that operates on a single shop's data.
 *
 *   c.get('session')    — full Better Auth session
 *   c.get('activeShop') — fully-loaded Shop row
 *   c.get('plan')       — billing plan ('starter' until M14 ships)
 *
 * Failure modes:
 *   no session         → 401 unauthorized
 *   no activeShopId    → 400 with "no active shop" message
 *   shop not found     → 400 (e.g. shop was soft-deleted between requests)
 */
export function activeShop(container: Container): MiddlewareHandler {
  return async (c, next) => {
    const session = (await container.auth.api.getSession({
      headers: c.req.raw.headers,
    })) as BetterAuthSession | null;
    if (!session) return c.json({ error: "unauthorized" }, 401);

    const shopId = session.session.activeShopId;
    if (!shopId) {
      return c.json({ error: "no active shop — connect a shop first" }, 400);
    }

    const shop = await container.shops.getById(shopId as never);
    if (!shop) {
      return c.json({ error: "active shop not found or removed" }, 400);
    }

    c.set("session", session);
    c.set("activeShop", shop);
    c.set("plan", STUB_PLAN);
    await next();
  };
}
