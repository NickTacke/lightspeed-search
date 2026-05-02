import type { ProductId } from "../domain/ids.ts";
import type { CategoryRepository } from "../infrastructure/category-repository.ts";

export const listCategoriesForProduct = (repo: CategoryRepository) => (productId: ProductId) =>
  repo.listForProduct(productId);
