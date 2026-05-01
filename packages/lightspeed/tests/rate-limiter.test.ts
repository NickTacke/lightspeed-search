import { describe, expect, test } from "bun:test";
import { LeakyBucket } from "../src/rate-limiter.ts";

describe("LeakyBucket", () => {
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
