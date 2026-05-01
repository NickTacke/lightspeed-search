import { tokenFromCode } from "@aidey/identity";
import { Hono } from "hono";
import type { Container } from "../container.ts";

export function authRoutes(container: Container) {
  const app = new Hono();

  // Custom: redeem a 6-digit code → resolve to the magic-link token → forward to Better Auth's verify
  app.post("/verify-code", async (c) => {
    type VerifyCodeBody = { code?: string; callbackURL?: string };
    const body: VerifyCodeBody = await c.req
      .json<VerifyCodeBody>()
      .catch(() => ({}) as VerifyCodeBody);
    const code = body.code?.trim();
    if (!code || !/^\d{6}$/.test(code)) {
      return c.json({ error: "code must be 6 digits" }, 400);
    }

    const token = await tokenFromCode(container.db, code);
    if (!token) return c.json({ error: "invalid or expired code" }, 400);

    // Better Auth's magic-link verify endpoint expects: GET /magic-link/verify?token=...&callbackURL=...
    const callback = body.callbackURL ?? `${container.env.WEB_URL}/dashboard`;
    const verifyURL = `${container.env.BETTER_AUTH_URL}/auth/magic-link/verify?token=${encodeURIComponent(
      token,
    )}&callbackURL=${encodeURIComponent(callback)}`;

    // Hand off to Better Auth's handler so the session cookie is set on the response
    return container.auth.handler(new Request(verifyURL, { headers: c.req.raw.headers }));
  });

  // Catch-all: forward anything else to Better Auth's handler
  app.all("/*", async (c) => container.auth.handler(c.req.raw));

  return app;
}
