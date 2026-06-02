import type { LightspeedClient } from "../client.ts";

// /shop.json response per
// https://developers.lightspeedhq.com/ecom/endpoints/shop/
// Most fields are optional in practice — newly installed test shops often
// return null/empty for everything except id + email.
export interface LightspeedShop {
  id: number;
  /** Primary storefront URL e.g. "www.example.com". */
  mainDomain?: string | null;
  /** Lightspeed-assigned subdomain e.g. "myshop". */
  subDomain?: string | null;
  /** Legacy alias of mainDomain — kept for older shop responses. */
  domain?: string | null;
  /** Display name, rarely populated on the shop endpoint itself. */
  title?: string | null;
  email?: string | null;
  language?: string | null;
  cluster?: string | null;
  status?: "demo" | "startup" | "live" | "test" | "exit" | null;
}

export async function getShop(client: LightspeedClient): Promise<LightspeedShop> {
  const { shop } = await client.request<{ shop: LightspeedShop }>("/shop.json");
  return shop;
}
