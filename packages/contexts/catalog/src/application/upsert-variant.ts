import type {
  VariantRepository,
  VariantUpsertInput,
} from "../infrastructure/variant-repository.ts";

export const upsertVariant = (repo: VariantRepository) => (input: VariantUpsertInput) =>
  repo.upsertByLightspeedId(input);
