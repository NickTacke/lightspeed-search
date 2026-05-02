import type { ShopId } from "@aidey/shops";
import type { AlertId } from "../domain/ids.ts";
import type { AlertRepository } from "../infrastructure/alert-repository.ts";

export const getAlert = (repo: AlertRepository) => (id: AlertId, shopId: ShopId) =>
  repo.findOwnedById(id, shopId);
