export interface LeakyBucketOptions {
  capacity: number;
  refillPerSecond: number;
}

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
}
