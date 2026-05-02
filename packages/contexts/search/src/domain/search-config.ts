import type { ShopId } from "@aidey/shops";

export interface SearchConfig {
  shopId: ShopId;
  enabledFields: string[];
  fieldWeights: Record<string, number>;
  semanticThreshold: number;
  resultLimit: number;
  semanticEnabled: boolean;
  exactMatchEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_ENABLED_FIELDS: ReadonlyArray<string> = [
  "title",
  "tags",
  "brand",
  "description",
];
export const DEFAULT_RESULT_LIMIT = 20;
export const DEFAULT_SEMANTIC_THRESHOLD = 3;
