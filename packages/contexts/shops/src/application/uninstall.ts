import type { ShopId } from "../domain/ids.ts";
import type { ShopRepository } from "../infrastructure/shop-repository.ts";

/**
 * Handle LS `shop.uninstalled` webhook: soft-delete the shop row.
 * M14 will wire a Stripe subscription cancel into this path.
 *
 * Idempotent: a second call against an already-deleted shop returns false.
 */
export const uninstallShop = (repo: ShopRepository) => (id: ShopId) => repo.softDelete(id);
