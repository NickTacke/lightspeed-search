import type { LightspeedClient } from "../client.ts";

export interface ListCategoriesParams {
  page: number;
  limit: number;
}

export async function listCategories(_client: LightspeedClient, _params: ListCategoriesParams) {
  throw new Error("listCategories: not implemented yet — wired in Phase 7");
}
