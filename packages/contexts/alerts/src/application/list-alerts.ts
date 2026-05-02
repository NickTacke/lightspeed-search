import type { ShopId } from "@aidey/shops";
import type { AlertRepository } from "../infrastructure/alert-repository.ts";

export const listAlerts = (repo: AlertRepository) => (shopId: ShopId) => repo.listForShop(shopId);
