import { createLightspeedClient, type LightspeedClient, shopEndpoints } from "@aidey/lightspeed";
import type { Shop, ShopCluster } from "../domain/shop.ts";
import type { ShopRepository } from "../infrastructure/shop-repository.ts";

export interface CreateFromInstallDeps {
  repo: ShopRepository;
  lightspeedClientFactory?: (creds: {
    cluster: ShopCluster;
    apiKey: string;
    apiSecret: string;
  }) => LightspeedClient;
}

export interface CreateFromInstallInput {
  userId: string;
  domain: string;
  installToken: string;
  userSecret: string;
  cluster: ShopCluster;
}

export async function createFromInstall(
  deps: CreateFromInstallDeps,
  input: CreateFromInstallInput,
): Promise<Shop> {
  const factory = deps.lightspeedClientFactory ?? createLightspeedClient;
  const client = factory({
    cluster: input.cluster,
    apiKey: input.installToken,
    apiSecret: input.userSecret,
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
    installToken: input.installToken,
    userSecret: input.userSecret,
    apiKey: null,
    apiSecret: null,
  });
}
