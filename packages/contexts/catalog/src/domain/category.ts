import type { ShopId } from "@aidey/shops";
import type { CategoryId } from "./ids.ts";

export interface Category {
  id: CategoryId;
  shopId: ShopId;
  lightspeedId: string;
  title: string;
  handle: string | null;
  description: string | null;
  image: string | null;
  visible: boolean;
  sortOrder: number;
  parentId: CategoryId | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
