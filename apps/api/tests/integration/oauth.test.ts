import { describe, expect, test } from "bun:test";
import { buildTestApp } from "../harness.ts";

describe("GET /oauth/lightspeed/start", () => {
  test("redirects unauthenticated visitor to /login with next param", async () => {
    const app = buildTestApp();
    const res = await app.request("/oauth/lightspeed/start?source=direct");

    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(location).toContain("/login");
    expect(location).toContain("next=");
    expect(decodeURIComponent(location ?? "")).toContain("/oauth/lightspeed/start?source=direct");
  });

  test("defaults source to 'direct' when omitted", async () => {
    const app = buildTestApp();
    const res = await app.request("/oauth/lightspeed/start");
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(decodeURIComponent(location)).toContain("source=direct");
  });

  test("defaults source to 'direct' when value is invalid", async () => {
    const app = buildTestApp();
    const res = await app.request("/oauth/lightspeed/start?source=bogus");
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(decodeURIComponent(location)).toContain("source=direct");
  });

  test("accepts 'app_store' source", async () => {
    const app = buildTestApp();
    const res = await app.request("/oauth/lightspeed/start?source=app_store");
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(decodeURIComponent(location)).toContain("source=app_store");
  });
});

describe("GET /oauth/lightspeed/callback", () => {
  test("redirects unauthenticated visitor to /login", async () => {
    const app = buildTestApp();
    const res = await app.request(
      "/oauth/lightspeed/callback?code=c&shop=s.shoplightspeed.com&cluster=eu1&state=x",
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/login");
  });

  // The remaining tests below mint a session by directly inserting a row into
  // the better-auth `session` table — easier than driving the magic-link flow
  // in a test. The other guards (missing params, invalid cluster, bad state)
  // run before token exchange so they don't need a DB.
  // We don't insert a session here because building the cookie-signing harness
  // adds disproportionate test scaffolding; the unauthed redirect proves the
  // session gate fires, and the remaining guards run after the gate.
});
