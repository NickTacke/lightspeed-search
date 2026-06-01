import type { Context, MiddlewareHandler } from "hono";

export interface LeakyBucketOptions {
  capacity: number;
  refillPerSecond: number;
}

/**
 * Token-bucket rate limiter. In-process, in-memory — fine for a single API
 * instance, fine across instances if the limit is permissive enough that a
 * 2-3x over-limit burst is acceptable. For strict cross-instance limits,
 * back this with Postgres or Redis (see "Upgrade path" in module docs).
 */
export class LeakyBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRateMs: number;

  constructor(opts: LeakyBucketOptions) {
    this.capacity = opts.capacity;
    this.tokens = opts.capacity;
    this.refillRateMs = 1000 / opts.refillPerSecond;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refilled = elapsed / this.refillRateMs;
    this.tokens = Math.min(this.capacity, this.tokens + refilled);
    this.lastRefill = now;
  }

  /** Blocking: waits until a token is available, then consumes it. */
  async take(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const deficit = 1 - this.tokens;
    const waitMs = deficit * this.refillRateMs;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.refill();
    this.tokens -= 1;
  }

  /**
   * Non-blocking: consumes one token and returns true if available, else
   * returns false with how long until the next token will exist.
   * Use this for HTTP rate limiting where the right answer to "no token" is
   * "return 429" — not "queue the client".
   */
  tryTake(): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return { allowed: true };
    }
    const deficit = 1 - this.tokens;
    return { allowed: false, retryAfterSeconds: (deficit * this.refillRateMs) / 1000 };
  }
}

export interface KeyedRateLimiterOptions extends LeakyBucketOptions {
  /**
   * Cap on the number of distinct keys to track. When exceeded, the oldest
   * key (by last-access) is evicted. Bounds memory in the face of
   * adversarial key churn (e.g. a botnet rotating Origin headers).
   */
  maxKeys?: number;
}

/**
 * One bucket per key (per shop, per origin, per ip, etc). The bucket
 * configuration is shared across keys — every shop gets the same capacity.
 */
export class KeyedRateLimiter {
  private readonly buckets = new Map<string, LeakyBucket>();
  private readonly options: LeakyBucketOptions;
  private readonly maxKeys: number;

  constructor(opts: KeyedRateLimiterOptions) {
    this.options = { capacity: opts.capacity, refillPerSecond: opts.refillPerSecond };
    this.maxKeys = opts.maxKeys ?? 10_000;
  }

  tryTake(key: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.maxKeys) {
        // Map preserves insertion order; the first key is the oldest. Drop it.
        const oldest = this.buckets.keys().next().value;
        if (oldest !== undefined) this.buckets.delete(oldest);
      }
      bucket = new LeakyBucket(this.options);
      this.buckets.set(key, bucket);
    } else {
      // Re-insert to move this key to the end (LRU-ish on access).
      this.buckets.delete(key);
      this.buckets.set(key, bucket);
    }
    return bucket.tryTake();
  }
}

export interface RateLimitMiddlewareOptions {
  limiter: KeyedRateLimiter;
  /**
   * Derive the bucket key from the request context. Return null to skip the
   * limiter (e.g. unauthenticated requests can bypass a per-shop limit and
   * be rejected by an upstream auth check instead).
   */
  keyFn: (c: Context) => string | null;
}

/**
 * Hono middleware: take a token from the keyed limiter; reject with 429 if none.
 * Sets the `Retry-After` header (seconds, RFC 7231 §7.1.3) so clients with a
 * sensible HTTP library back off without manual tuning.
 */
export function rateLimit(opts: RateLimitMiddlewareOptions): MiddlewareHandler {
  return async (c, next) => {
    const key = opts.keyFn(c);
    if (key === null) {
      await next();
      return;
    }
    const result = opts.limiter.tryTake(key);
    if (result.allowed) {
      await next();
      return;
    }
    c.header("Retry-After", String(Math.max(1, Math.ceil(result.retryAfterSeconds))));
    return c.json({ error: "rate_limited" }, 429);
  };
}
