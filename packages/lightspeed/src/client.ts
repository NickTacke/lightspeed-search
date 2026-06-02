import { LeakyBucket } from "@aidey/rate-limit";
import { LightspeedError, RateLimitedError } from "./errors.ts";

export interface LightspeedCredentials {
  cluster: "us1" | "eu1";
  apiKey: string;
  apiSecret: string;
  /**
   * Shop language code (e.g. "en", "nl", "de") used in the URL path. LS
   * encodes the shop's storefront language directly in the API URL. Defaults
   * to "en" — fine for the initial /shop.json call before we know the real
   * language; after the shop is created, prefer passing the stored value.
   */
  language?: string;
}

export interface LightspeedClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

// Per https://developers.lightspeedhq.com/ecom/introduction/authentication/
// the base URL is cluster-dependent and includes the shop language code.
const HOST_BY_CLUSTER: Record<LightspeedCredentials["cluster"], string> = {
  eu1: "https://api.webshopapp.com",
  us1: "https://api.shoplightspeed.com",
};

export function createLightspeedClient(creds: LightspeedCredentials): LightspeedClient {
  const host = HOST_BY_CLUSTER[creds.cluster];
  const language = creds.language ?? "en";
  const baseURL = `${host}/${language}`;
  const auth = `Basic ${btoa(`${creds.apiKey}:${creds.apiSecret}`)}`;
  // Lightspeed default tier: 30 calls / 5s burst, 2 calls/s sustained.
  // Conservative: capacity 3, refill 0.5/s. Tune later if needed.
  const bucket = new LeakyBucket({ capacity: 3, refillPerSecond: 0.5 });

  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      await bucket.take();
      const res = await fetch(`${baseURL}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          authorization: auth,
          "content-type": "application/json",
          accept: "application/json",
        },
      });
      const text = await res.text();
      if (res.status === 429) {
        const retry = Number(res.headers.get("retry-after") ?? "60");
        throw new RateLimitedError(retry, text);
      }
      if (!res.ok) {
        throw new LightspeedError(`Lightspeed ${res.status}`, res.status, text);
      }
      return text ? (JSON.parse(text) as T) : (undefined as T);
    },
  };
}
