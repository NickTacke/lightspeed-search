import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// In prod the api is on a different host (api.aidey.app); call it directly so
// POST /auth/* doesn't hit the Caddy SPA fallback (which returns 405). In dev
// VITE_API_URL is unset, so we fall back to window.origin and rely on the
// vite proxy at /auth → :3001/auth.
const apiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");

export const authClient = createAuthClient({
  baseURL: apiUrl,
  basePath: "/auth",
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;
