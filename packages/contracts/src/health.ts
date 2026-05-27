import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  uptime: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const readyResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.object({
    database: z.enum(["ok", "fail"]),
  }),
});

export type ReadyResponse = z.infer<typeof readyResponseSchema>;
