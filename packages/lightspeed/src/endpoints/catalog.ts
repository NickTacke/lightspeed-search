import type { LightspeedClient } from "../client.ts";

export interface ListProductsParams {
  page: number;
  limit: number;
}

/** Lightspeed product shape (subset of fields we use). */
export interface LightspeedProduct {
  id: number;
  title: string;
  fulltitle?: string;
  description?: string;
  content?: string;
  brand?: { title?: string };
  handle?: string;
  image?: { src?: string };
  price?: number;
  oldPrice?: number;
  sku?: string;
  ean?: string;
  // LS returns this as a comma-separated string OR a JSON array depending
  // on the endpoint version / specific product. Tolerate both upstream.
  tags?: string | string[] | null;
  visibility?: string;
  sortOrder?: number;
  variants?: Array<LightspeedVariant>;
  categoriesSet?: {
    resource?: { url?: string; embedded?: { categories?: Array<{ id: number }> } };
  };
}

export interface LightspeedVariant {
  id: number;
  title?: string;
  priceIncl?: number;
  priceExcl?: number;
  oldPriceIncl?: number;
  oldPriceExcl?: number;
  sku?: string;
  ean?: string;
  articleCode?: string;
  stockLevel?: number;
  stockTracking?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

/**
 * Fetch one page of products. Lightspeed pages are 1-indexed, default 50/limit, max 250.
 * Returns the array; caller iterates pages until empty.
 */
export async function listProducts(
  client: LightspeedClient,
  params: ListProductsParams,
): Promise<LightspeedProduct[]> {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  const { products } = await client.request<{ products: LightspeedProduct[] }>(
    `/products.json?${search.toString()}`,
  );
  return products ?? [];
}
