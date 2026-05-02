import type { ShopId } from "@aidey/shops";
import type { SyncLogRepository } from "../infrastructure/sync-log-repository.ts";

export const listLogs = (repo: SyncLogRepository) => (shopId: ShopId, limit?: number) =>
  repo.listForShop(shopId, limit);

export const lastSuccessful = (repo: SyncLogRepository) => (shopId: ShopId) =>
  repo.lastSuccessful(shopId);
