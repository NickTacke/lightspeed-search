import type { LightspeedClient } from "../client.ts";

export interface ListCategoriesParams {
  page: number;
  limit: number;
}

export interface LightspeedCategory {
  id: number;
  title: string;
  url?: string;
  description?: string;
  image?: { src?: string };
  visibility?: string;
  sortOrder?: number;
  parent?: { id?: number } | null;
}

export async function listCategories(
  client: LightspeedClient,
  params: ListCategoriesParams,
): Promise<LightspeedCategory[]> {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  const { categories } = await client.request<{ categories: LightspeedCategory[] }>(
    `/categories.json?${search.toString()}`,
  );
  return categories ?? [];
}
