import type { ShopId } from "@aidey/shops";
import type { SyncLogId } from "./ids.ts";

export type SyncStatus = "syncing" | "success" | "failure";
export type SyncTrigger = "cron" | "webhook" | "manual";

export interface SyncLog {
  id: SyncLogId;
  shopId: ShopId;
  status: SyncStatus;
  trigger: SyncTrigger;
  productsTotal: number;
  productsAdded: number;
  productsUpdated: number;
  productsFailed: number;
  categoriesTotal: number;
  embeddingsGenerated: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}
