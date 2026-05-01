import type { Database } from "@aidey/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import type { EmailSender } from "./email-sender.ts";
import * as schema from "./schema.ts";

export interface AuthConfig {
  db: Database;
  email: EmailSender;
  baseURL: string;
  secret: string;
  webURL: string;
}

/**
 * Derive a 6-digit numeric code from a magic-link token.
 * Last 6 hex chars of the token, parsed as int, mod 1_000_000, zero-padded to 6 digits.
 * Same algorithm used both when sending and when looking up.
 */
export function codeFromToken(token: string): string {
  const tail = token.slice(-6);
  const n = Number.parseInt(tail, 16);
  if (!Number.isFinite(n)) return "000000";
  return (n % 1_000_000).toString().padStart(6, "0");
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: drizzleAdapter(config.db, { provider: "pg", schema }),
    secret: config.secret,
    baseURL: config.baseURL,
    basePath: "/auth",
    trustedOrigins: [config.webURL],
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url, token }) => {
          const code = codeFromToken(token);
          const html = `
            <p>Sign in to Aidey using either the link or the code below:</p>
            <p><a href="${url}">${url}</a></p>
            <p>Or enter this 6-digit code: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p>
            <p>This code expires in 10 minutes.</p>
          `;
          await config.email({ to: email, subject: "Sign in to Aidey", html });
        },
      }),
    ],
    session: {
      additionalFields: {
        activeShopId: { type: "string", required: false, defaultValue: null },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * Find the active magic-link token whose 6-digit derived code matches `code`.
 * Used by the /auth/verify-code endpoint added in Task 4.5.
 */
export async function tokenFromCode(db: Database, code: string): Promise<string | null> {
  const rows = await db
    .select({
      value: schema.verification.value,
      expiresAt: schema.verification.expiresAt,
    })
    .from(schema.verification)
    .where(eq(schema.verification.identifier, "magic-link"));

  const now = new Date();
  for (const row of rows) {
    if (row.expiresAt < now) continue;
    if (codeFromToken(row.value) === code) return row.value;
  }
  return null;
}
