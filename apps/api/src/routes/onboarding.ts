import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Container } from "../container.ts";
import { activeShop } from "../middleware/active-shop.ts";

const FETCH_TIMEOUT_MS = 5_000;

/**
 * SSRF guard: reject anything that resolves into a non-public address range.
 * shop.domain ultimately comes from a merchant's LS admin (they can set
 * arbitrary custom domains), so without this check a malicious shop owner
 * could aim install-check at internal services like Redis, the metadata
 * service, or Coolify's docker network.
 */
function isPrivateIPv4(parts: number[]): boolean {
  if (parts.length !== 4) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8 (unspecified)
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local + AWS metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true; // unspecified, loopback
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  // IPv4-mapped IPv6 (::ffff:127.0.0.1 etc.) — re-validate the mapped v4.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) {
    const parts = mapped[1].split(".").map(Number);
    return isPrivateIPv4(parts);
  }
  return false;
}

function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip.split(".").map(Number));
  if (family === 6) return isPrivateIPv6(ip);
  return false;
}

/**
 * Returns true if every DNS-A/AAAA address for the hostname is publicly
 * routable. Rejects IP literals, localhost/.internal suffixes, and anything
 * that resolves into RFC1918/loopback/link-local/ULA ranges. Best-effort —
 * if DNS fails, treat as unsafe.
 */
async function isPublicHostname(hostname: string): Promise<boolean> {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (!normalized) return false;
  if (normalized === "localhost") return false;
  if (normalized.endsWith(".localhost") || normalized.endsWith(".internal")) return false;
  // Reject IP literals outright — legit storefronts always have DNS names.
  if (isIP(normalized)) return false;
  try {
    const results = await lookup(normalized, { all: true });
    if (results.length === 0) return false;
    return results.every((r) => !isPrivateAddress(r.address));
  } catch {
    return false;
  }
}

/**
 * Onboarding-wizard backend endpoints — scoped to the merchant's active shop.
 * Separate from /shops because the dashboard's shop endpoints don't require
 * an active shop (e.g. listing all of them) while these always do.
 */
export function onboardingRoutes(container: Container) {
  const app = new OpenAPIHono();
  app.use("/*", activeShop(container));

  /**
   * Fetch the shop's storefront HTML and check whether the widget loader
   * script tag is present. Replaces the iframe-based postMessage check —
   * LS storefronts send X-Frame-Options: DENY so the iframe approach was
   * structurally broken.
   */
  app.get("/install-check", async (c) => {
    const shop = c.get("activeShop");
    const loaderUrl = container.env.WIDGET_LOADER_URL;
    if (!loaderUrl) {
      return c.json({ installed: false, reason: "loader_url_not_configured" as const });
    }
    if (!shop.domain || /^\d+$/.test(shop.domain)) {
      // shop.domain falls back to the numeric LS id when LS's /shop.json
      // returned no mainDomain — can't fetch http://356891.
      return c.json({ installed: false, reason: "no_storefront_domain" as const });
    }

    const storefrontUrl = `https://${shop.domain}`;
    let hostname: string;
    try {
      hostname = new URL(storefrontUrl).hostname;
    } catch {
      return c.json({ installed: false, reason: "no_storefront_domain" as const });
    }
    // SSRF guard: hostname must resolve to public addresses only. shop.domain
    // is merchant-controlled (custom domains on LS), so without this an
    // attacker could point install-check at internal services.
    if (!(await isPublicHostname(hostname))) {
      return c.json({ installed: false, reason: "storefront_unreachable" as const });
    }

    try {
      const res = await fetch(storefrontUrl, {
        // Don't follow redirects — each hop could otherwise dodge the
        // hostname allowlist by pointing at an internal address. If a
        // storefront 3xx's its homepage, the merchant can use the
        // manual continue button.
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      // Treat redirects + non-2xx as "not installed, storefront unreachable".
      // We deliberately don't surface res.status — a successful SSRF guard
      // means the response IS from a public service, but the granular HTTP
      // code is still defence-in-depth against scanning oracles.
      if (!res.ok) {
        return c.json({ installed: false, reason: "storefront_unreachable" as const });
      }
      const html = await res.text();
      const installed = html.includes(loaderUrl);
      return c.json({ installed, storefrontUrl });
    } catch (err) {
      const logger = c.get("logger") ?? container.logger;
      logger.warn(
        { err: { message: err instanceof Error ? err.message : "unknown" }, storefrontUrl },
        "install-check fetch failed",
      );
      return c.json({ installed: false, reason: "fetch_error" as const });
    }
  });

  return app;
}
