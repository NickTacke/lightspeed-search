import type { ShopId } from "@aidey/shops";
import type { AlertId } from "../domain/ids.ts";
import type { AlertPatch, AlertRepository } from "../infrastructure/alert-repository.ts";

export const updateAlert =
  (repo: AlertRepository) => async (id: AlertId, shopId: ShopId, patch: AlertPatch) => {
    // Verify ownership before mutation
    const existing = await repo.findOwnedById(id, shopId);
    if (!existing) return null;
    return repo.update(id, patch);
  };
