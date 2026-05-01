export { type ShopId, shopId } from "./domain/ids.ts";
export type { Credentials, Shop, ShopCluster } from "./domain/shop.ts";
export * as schema from "./infrastructure/schema.ts";
export {
  createShopRepository,
  type InsertShopWithUserLinkInput,
  type ShopRepository,
} from "./infrastructure/shop-repository.ts";
