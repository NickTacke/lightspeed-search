import type { ShopId } from "@aidey/shops";
import type { AlertId } from "../domain/ids.ts";
import type { AlertRepository } from "../infrastructure/alert-repository.ts";

export const deleteAlert =
  (repo: AlertRepository) =>
  async (id: AlertId, shopId: ShopId): Promise<boolean> => {
    const existing = await repo.findOwnedById(id, shopId);
    if (!existing) return false;
    await repo.delete(id);
    return true;
  };
