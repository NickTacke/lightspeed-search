import type { LightspeedClient } from "../client.ts";

export interface ListProductsParams {
  page: number;
  limit: number;
}

export async function listProducts(_client: LightspeedClient, _params: ListProductsParams) {
  throw new Error("listProducts: not implemented yet — wired in Phase 7");
}
