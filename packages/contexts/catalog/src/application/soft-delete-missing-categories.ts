import type { ShopId } from "@aidey/shops";
import type { CategoryRepository } from "../infrastructure/category-repository.ts";

export const softDeleteMissingCategories =
  (repo: CategoryRepository) => (shopId: ShopId, seenLightspeedIds: string[]) =>
    repo.softDeleteMissing(shopId, seenLightspeedIds);
