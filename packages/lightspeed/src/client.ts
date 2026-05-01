import { LightspeedError, RateLimitedError } from "./errors.ts";
import { LeakyBucket } from "./rate-limiter.ts";

export interface LightspeedCredentials {
  cluster: "us1" | "eu1";
  apiKey: string;
  apiSecret: string;
}

export interface LightspeedClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export function createLightspeedClient(creds: LightspeedCredentials): LightspeedClient {
  const baseURL = `https://api.shoplightspeed.com/${creds.cluster}`;
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
