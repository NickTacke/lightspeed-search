export type ProductId = string & { readonly __brand: "ProductId" };
export type CategoryId = string & { readonly __brand: "CategoryId" };
export type VariantId = string & { readonly __brand: "VariantId" };

export const productId = (s: string): ProductId => s as ProductId;
export const categoryId = (s: string): CategoryId => s as CategoryId;
export const variantId = (s: string): VariantId => s as VariantId;
