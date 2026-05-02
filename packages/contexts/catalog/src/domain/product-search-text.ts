import type { Product } from "./product.ts";

export interface CategoryForSearch {
  title: string;
}

/**
 * Build a deterministic search text blob from a product + its categories.
 * Used by the Phase 8 search context to compute embedding hash.
 * Pure function so it tests without a DB.
 */
export function buildSearchText(product: Product, categories: CategoryForSearch[]): string {
  const parts: string[] = [];
  parts.push(product.title);
  if (product.brand) parts.push(product.brand);
  if (product.tags.length > 0) parts.push(...product.tags);
  for (const c of categories) parts.push(c.title);
  if (product.description) parts.push(product.description.slice(0, 500));
  return parts.filter((p) => p && p.length > 0).join(" ");
}
