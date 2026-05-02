import type { ShopId } from "@aidey/shops";
import type { ProductRepository } from "../infrastructure/product-repository.ts";

export const softDeleteMissingProducts =
  (repo: ProductRepository) => (shopId: ShopId, seenLightspeedIds: string[]) =>
    repo.softDeleteMissing(shopId, seenLightspeedIds);
