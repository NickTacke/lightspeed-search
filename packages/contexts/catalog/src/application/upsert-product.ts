import type {
  ProductRepository,
  ProductUpsertInput,
} from "../infrastructure/product-repository.ts";

export const upsertProduct = (repo: ProductRepository) => (input: ProductUpsertInput) =>
  repo.upsertByLightspeedId(input);
