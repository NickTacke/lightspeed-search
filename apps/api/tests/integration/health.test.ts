import { describe, expect, test } from "bun:test";
import { buildTestApp } from "../harness.ts";

describe("/health", () => {
  test("liveness returns 200 with status ok", async () => {
    const app = buildTestApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; uptime: number };
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
  });
});

describe("/health/ready", () => {
  test("returns ok when DB is reachable, degraded otherwise", async () => {
    const app = buildTestApp();
    const res = await app.request("/health/ready");
    const body = (await res.json()) as {
      status: "ok" | "degraded";
      checks: { database: "ok" | "fail" };
    };
    // We don't assume a DB is available in every CI/dev environment.
    // The route MUST respond with a consistent shape: status mirrors the DB check.
    expect(["ok", "degraded"]).toContain(body.status);
    expect(["ok", "fail"]).toContain(body.checks.database);
    expect(res.status).toBe(body.status === "ok" ? 200 : 503);
    if (body.status === "ok") {
      expect(body.checks.database).toBe("ok");
    } else {
      expect(body.checks.database).toBe("fail");
    }
  });
});
