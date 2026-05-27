import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  BETTER_AUTH_SECRET: z.string().min(32).default("dev-secret-32-chars-replace-me-now"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("Aidey <noreply@aidey.app>"),
  EMAIL_DEV_MODE: z.coerce.boolean().default(true),
  OPENAI_API_KEY: z.string().default(""),
  LIGHTSPEED_APP_KEY: z.string().default(""),
  LIGHTSPEED_APP_SECRET: z.string().default(""),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  SENTRY_DSN_API: z.string().default(""),
  COOKIE_DOMAIN: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
