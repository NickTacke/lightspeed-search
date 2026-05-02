import type { ShopId } from "@aidey/shops";
import type { ProductId } from "./ids.ts";

export interface Product {
  id: ProductId;
  shopId: ShopId;
  lightspeedId: string;
  title: string;
  fulltitle: string | null;
  description: string | null;
  fullDescription: string | null;
  brand: string | null;
  handle: string | null;
  image: string | null;
  price: string | null;
  compareAtPrice: string | null;
  sku: string | null;
  ean: string | null;
  tags: string[];
  visible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
