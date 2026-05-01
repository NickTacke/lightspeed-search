import type { ShopId } from "../domain/ids.ts";
import type { ShopRepository } from "../infrastructure/shop-repository.ts";

export const getShop = (repo: ShopRepository) => (id: ShopId) => repo.findById(id);
export const getShopByDomain = (repo: ShopRepository) => (domain: string) =>
  repo.findByDomain(domain);
