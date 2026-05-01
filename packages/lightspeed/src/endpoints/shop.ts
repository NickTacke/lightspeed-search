import type { LightspeedClient } from "../client.ts";

export interface LightspeedShop {
  id: number;
  domain: string;
  email?: string;
  language: string;
  cluster?: string;
  title?: string;
}

export async function getShop(client: LightspeedClient): Promise<LightspeedShop> {
  const { shop } = await client.request<{ shop: LightspeedShop }>("/shop.json");
  return shop;
}
