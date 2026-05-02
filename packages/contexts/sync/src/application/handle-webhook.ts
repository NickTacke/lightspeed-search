import type { Shop } from "@aidey/shops";
import type { FullSyncDeps } from "./full-sync.ts";
import { fullSync } from "./full-sync.ts";

export interface HandleWebhookInput {
  shop: Shop;
  /** Lightspeed event kind, e.g. "product.updated", "category.deleted". */
  event: string;
  /** Raw payload from Lightspeed. */
  payload: unknown;
}

/**
 * Phase 7 implementation: every webhook triggers a full sync. Phase 8+ can refine to
 * per-entity partial syncs. This is correct (always converges) but not the most efficient.
 */
export async function handleWebhook(deps: FullSyncDeps, input: HandleWebhookInput) {
  return fullSync(deps, input.shop, "webhook");
}
