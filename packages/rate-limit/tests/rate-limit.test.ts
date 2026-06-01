import { describe, expect, test } from "bun:test";
import { KeyedRateLimiter, LeakyBucket } from "../src/index.ts";

describe("LeakyBucket.take (blocking)", () => {
  test("allows up to capacity tokens immediately", async () => {
    const bucket = new LeakyBucket({ capacity: 3, refillPerSecond: 100 });
    const start = Date.now();
    await bucket.take();
    await bucket.take();
    await bucket.take();
    expect(Date.now() - start).toBeLessThan(20);
  });

  test("waits when bucket is empty until refill produces a token", async () => {
    const bucket = new LeakyBucket({ capacity: 2, refillPerSecond: 100 });
    await bucket.take();
    await bucket.take();
    const start = Date.now();
    await bucket.take();
    expect(Date.now() - start).toBeGreaterThanOrEqual(8);
  });
});

describe("LeakyBucket.tryTake (non-blocking)", () => {
  test("allows up to capacity then returns retryAfter", () => {
    const bucket = new LeakyBucket({ capacity: 2, refillPerSecond: 1 });
    expect(bucket.tryTake().allowed).toBe(true);
    expect(bucket.tryTake().allowed).toBe(true);
    const denied = bucket.tryTake();
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.retryAfterSeconds).toBeGreaterThan(0);
      expect(denied.retryAfterSeconds).toBeLessThanOrEqual(1);
    }
  });
});

describe("KeyedRateLimiter", () => {
  test("each key gets its own capacity", () => {
    const limiter = new KeyedRateLimiter({ capacity: 1, refillPerSecond: 0.1 });
    expect(limiter.tryTake("shop-a").allowed).toBe(true);
    expect(limiter.tryTake("shop-b").allowed).toBe(true);
    // Both buckets now empty; both should reject.
    expect(limiter.tryTake("shop-a").allowed).toBe(false);
    expect(limiter.tryTake("shop-b").allowed).toBe(false);
  });

  test("evicts oldest key when maxKeys exceeded", () => {
    const limiter = new KeyedRateLimiter({ capacity: 1, refillPerSecond: 0.1, maxKeys: 2 });
    expect(limiter.tryTake("a").allowed).toBe(true); // a empty
    expect(limiter.tryTake("b").allowed).toBe(true); // b empty
    // Adding "c" evicts "a" (least recently used). "a" should then get a fresh bucket.
    expect(limiter.tryTake("c").allowed).toBe(true);
    expect(limiter.tryTake("a").allowed).toBe(true); // fresh bucket — capacity 1
  });
});
