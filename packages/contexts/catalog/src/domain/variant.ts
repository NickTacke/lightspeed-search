import type { ShopId } from "@aidey/shops";
import type { ProductId, VariantId } from "./ids.ts";

export interface Variant {
  id: VariantId;
  shopId: ShopId;
  productId: ProductId;
  lightspeedId: string;
  title: string;
  priceIncl: string | null;
  priceExcl: string | null;
  oldPriceIncl: string | null;
  oldPriceExcl: string | null;
  sku: string | null;
  ean: string | null;
  articleCode: string | null;
  stockLevel: number;
  stockTracking: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
