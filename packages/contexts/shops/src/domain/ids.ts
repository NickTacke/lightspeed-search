export type ShopId = string & { readonly __brand: "ShopId" };
export const shopId = (s: string): ShopId => s as ShopId;
