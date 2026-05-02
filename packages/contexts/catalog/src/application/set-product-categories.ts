import type { CategoryId, ProductId } from "../domain/ids.ts";
import type { CategoryRepository } from "../infrastructure/category-repository.ts";

export const setProductCategories =
  (repo: CategoryRepository) => (productId: ProductId, categoryIds: CategoryId[]) =>
    repo.setProductCategories(productId, categoryIds);
