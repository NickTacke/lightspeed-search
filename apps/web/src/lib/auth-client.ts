import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same-origin via the vite proxy: /auth/* → :3001/auth/*
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
  basePath: "/auth",
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;
