import { describe, expect, test } from "bun:test";
import { buildTestApp } from "../harness.ts";

describe("request-id middleware", () => {
  test("returns a new X-Request-ID header when none provided", async () => {
    const app = buildTestApp();
    const res = await app.request("/api/health");
    const id = res.headers.get("x-request-id");
    expect(id).toBeTruthy();
    expect(id!.length).toBeGreaterThan(8);
  });

  test("preserves incoming X-Request-ID header", async () => {
    const app = buildTestApp();
    const res = await app.request("/api/health", {
      headers: { "x-request-id": "test-correlation-abc123" },
    });
    expect(res.headers.get("x-request-id")).toBe("test-correlation-abc123");
  });
});
