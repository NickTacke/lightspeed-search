import { createLightspeedClient, type LightspeedClient, shopEndpoints } from "@aidey/lightspeed";
import type { Shop, ShopCluster } from "../domain/shop.ts";
import type { ShopRepository } from "../infrastructure/shop-repository.ts";

export interface CreateFromInstallDeps {
  repo: ShopRepository;
  lightspeedClientFactory?: (creds: {
    cluster: ShopCluster;
    apiKey: string;
    apiSecret: string;
    language?: string;
  }) => LightspeedClient;
}

export interface CreateFromInstallInput {
  userId: string;
  /** Fallback used only if Lightspeed doesn't return a domain on the shop record. */
  domain: string;
  /** Our partner-app API key (env LIGHTSPEED_APP_KEY) — the Basic-auth username for every LS API call. */
  appKey: string;
  /** Per-shop install token Lightspeed delivered in the install callback. */
  installToken: string;
  /** Per-shop secret, derived as md5(installToken + LIGHTSPEED_APP_SECRET). Used as Basic-auth password AND webhook HMAC key. */
  userSecret: string;
  cluster: ShopCluster;
  /** Shop's storefront language (e.g. "nl"). LS requires this in the API URL path. */
  language: string;
}

export async function createFromInstall(
  deps: CreateFromInstallDeps,
  input: CreateFromInstallInput,
): Promise<Shop> {
  const factory = deps.lightspeedClientFactory ?? createLightspeedClient;
  // Per https://developers.lightspeedhq.com/ecom/tutorials/installing-an-app/
  // every LS API call from the partner app authenticates as Basic(APP_KEY, userSecret).
  // The installToken is NOT in the auth header — it's the input we derived userSecret from.
  const client = factory({
    cluster: input.cluster,
    apiKey: input.appKey,
    apiSecret: input.userSecret,
    language: input.language,
  });
  const lsShop = await shopEndpoints.getShop(client);

  // LS's /shop.json sometimes returns title null; always populate something
  // so the dashboard never renders an empty heading.
  const resolvedDomain = lsShop.domain || input.domain || String(lsShop.id);
  const resolvedName = lsShop.title || resolvedDomain;
  return deps.repo.insertWithUserLink({
    userId: input.userId,
    lightspeedId: String(lsShop.id),
    domain: resolvedDomain,
    name: resolvedName,
    email: lsShop.email ?? null,
    language: lsShop.language || "en",
    cluster: input.cluster,
    installToken: input.installToken,
    userSecret: input.userSecret,
    apiKey: null,
    apiSecret: null,
  });
}
