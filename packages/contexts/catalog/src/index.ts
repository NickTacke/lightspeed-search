export { getProduct } from "./application/get-product.ts";
export { listCategoriesForProduct } from "./application/list-categories-for-product.ts";
export { setProductCategories } from "./application/set-product-categories.ts";
export { softDeleteMissingCategories } from "./application/soft-delete-missing-categories.ts";
export { softDeleteMissingProducts } from "./application/soft-delete-missing-products.ts";
export { upsertCategory } from "./application/upsert-category.ts";
export { upsertProduct } from "./application/upsert-product.ts";
export { upsertVariant } from "./application/upsert-variant.ts";
export type { Category } from "./domain/category.ts";
export {
  type CategoryId,
  categoryId,
  type ProductId,
  productId,
  type VariantId,
  variantId,
} from "./domain/ids.ts";
export type { Product } from "./domain/product.ts";
export {
  buildSearchText,
  type CategoryForSearch,
} from "./domain/product-search-text.ts";
export type { Variant } from "./domain/variant.ts";
export {
  type CategoryRepository,
  type CategoryUpsertInput,
  type CategoryUpsertResult,
  createCategoryRepository,
} from "./infrastructure/category-repository.ts";
export {
  createProductRepository,
  type ProductRepository,
  type ProductUpsertInput,
  type ProductUpsertResult,
} from "./infrastructure/product-repository.ts";
export * as schema from "./infrastructure/schema.ts";
export {
  createVariantRepository,
  type VariantRepository,
  type VariantUpsertInput,
  type VariantUpsertResult,
} from "./infrastructure/variant-repository.ts";
