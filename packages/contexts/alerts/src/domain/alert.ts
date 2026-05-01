import type { ShopId } from "@aidey/shops";
import type { AlertId } from "./ids.ts";

export interface Alert {
  id: AlertId;
  shopId: ShopId;
  title: string;
  message: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
