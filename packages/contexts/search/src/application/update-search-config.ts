import type { ShopId } from "@aidey/shops";
import type {
  SearchConfigPatch,
  SearchConfigRepository,
} from "../infrastructure/search-config-repository.ts";

export const updateSearchConfig =
  (repo: SearchConfigRepository) => (shopId: ShopId, patch: SearchConfigPatch) =>
    repo.update(shopId, patch);
