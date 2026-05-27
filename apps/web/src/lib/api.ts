import { client } from "@aidey/api-client";

// In prod the api lives on a different origin (api.aidey.app) and must be
// called absolutely. In dev VITE_API_URL is unset so we keep an empty prefix
// and let the vite proxy route /api → :3001 and /auth → :3001.
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "";

client.setConfig({
  baseUrl: API_URL,
  credentials: "include",
});

/**
 * Prefix a path with the api host when running in prod, leave it relative in
 * dev. Use for hand-written fetch calls; the generated api-client already
 * picks up baseUrl from setConfig above.
 */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
