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

/**
 * Guard against open-redirect via a `next` URL coming from the query string.
 * Only allows web origin + API origin — never an arbitrary attacker URL.
 *
 * Pass results to `signIn.magicLink({ callbackURL })` or `window.location.href`
 * directly; anything failing this check should fall back to a safe default.
 */
export function isSafeNext(next: string | undefined | null): next is string {
  if (!next) return false;
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(next, window.location.origin);
    const allowed = new Set<string>([window.location.origin]);
    if (API_URL) {
      try {
        allowed.add(new URL(API_URL).origin);
      } catch {
        // API_URL is empty/relative in dev; only same-origin allowed.
      }
    }
    return allowed.has(url.origin);
  } catch {
    return false;
  }
}
