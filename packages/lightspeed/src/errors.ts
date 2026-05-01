export class LightspeedError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = "LightspeedError";
  }
}

export class RateLimitedError extends LightspeedError {
  constructor(
    public readonly retryAfterSeconds: number,
    body: string,
  ) {
    super(`Rate limited; retry after ${retryAfterSeconds}s`, 429, body);
    this.name = "RateLimitedError";
  }
}
