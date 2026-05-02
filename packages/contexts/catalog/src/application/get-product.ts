import type { ProductId } from "../domain/ids.ts";
import type { ProductRepository } from "../infrastructure/product-repository.ts";

export const getProduct = (repo: ProductRepository) => (id: ProductId) => repo.findById(id);
