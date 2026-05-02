import type {
  CategoryRepository,
  CategoryUpsertInput,
} from "../infrastructure/category-repository.ts";

export const upsertCategory = (repo: CategoryRepository) => (input: CategoryUpsertInput) =>
  repo.upsertByLightspeedId(input);
