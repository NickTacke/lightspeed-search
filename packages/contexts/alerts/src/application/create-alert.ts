import type { ShopId } from "@aidey/shops";
import type { AlertRepository } from "../infrastructure/alert-repository.ts";

export interface CreateAlertInput {
  shopId: ShopId;
  title: string;
  message: string;
  enabled?: boolean;
}

export const createAlert = (repo: AlertRepository) => (input: CreateAlertInput) =>
  repo.insert({ ...input, enabled: input.enabled ?? true });
