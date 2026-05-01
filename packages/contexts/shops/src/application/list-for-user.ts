import type { ShopRepository } from "../infrastructure/shop-repository.ts";

export const listForUser = (repo: ShopRepository) => (userId: string) => repo.listForUser(userId);
