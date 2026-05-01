import { createLightspeedClient, type LightspeedClient, shopEndpoints } from "@aidey/lightspeed";
import type { Shop, ShopCluster } from "../domain/shop.ts";
import type { ShopRepository } from "../infrastructure/shop-repository.ts";

export interface CreateFromManualKeyDeps {
  repo: ShopRepository;
  /** Override for tests; defaults to real Lightspeed client. */
  lightspeedClientFactory?: (creds: {
    cluster: ShopCluster;
    apiKey: string;
    apiSecret: string;
  }) => LightspeedClient;
}

export interface CreateFromManualKeyInput {
  userId: string;
  domain: string;
  apiKey: string;
  apiSecret: string;
  cluster: ShopCluster;
}

export async function createFromManualKey(
  deps: CreateFromManualKeyDeps,
  input: CreateFromManualKeyInput,
): Promise<Shop> {
  const factory = deps.lightspeedClientFactory ?? createLightspeedClient;
  const client = factory({
    cluster: input.cluster,
    apiKey: input.apiKey,
    apiSecret: input.apiSecret,
  });
  const lsShop = await shopEndpoints.getShop(client);

  return deps.repo.insertWithUserLink({
    userId: input.userId,
    lightspeedId: String(lsShop.id),
    domain: lsShop.domain || input.domain,
    name: lsShop.title ?? input.domain,
    email: lsShop.email ?? null,
    language: lsShop.language || "en",
    cluster: input.cluster,
    installToken: null,
    userSecret: null,
    apiKey: input.apiKey,
    apiSecret: input.apiSecret,
  });
}
