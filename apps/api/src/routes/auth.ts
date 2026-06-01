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

    // Hand off to Better Auth's handler so the session cookie is set on the response.
    // Better Auth returns a 302 redirect to callbackURL on success — that's the right
    // shape for a browser GET, but our client calls this endpoint via fetch() with
    // credentials. A cross-origin redirect from api.aidey.app to aidey.app fails CORS
    // because the SPA host returns no Access-Control-Allow-Origin. Convert the 302
    // into a 200 JSON response (forwarding Set-Cookie so the session is still set)
    // and let the client navigate explicitly.
    const authRes = await container.auth.handler(
      new Request(verifyURL, { headers: c.req.raw.headers }),
    );
    if (authRes.status >= 300 && authRes.status < 400) {
      const headers = new Headers({ "content-type": "application/json" });
      const setCookies = authRes.headers.getSetCookie?.() ?? [];
      for (const cookie of setCookies) headers.append("set-cookie", cookie);
      return new Response(JSON.stringify({ status: "ok" }), { status: 200, headers });
    }
    return authRes;
  });

  // Catch-all: forward anything else to Better Auth's handler
  app.all("/*", async (c) => container.auth.handler(c.req.raw));

  return app;
}
