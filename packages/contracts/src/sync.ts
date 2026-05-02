import { z } from "zod";

export const syncStatusSchema = z.enum(["syncing", "success", "failure"]);
export const syncTriggerSchema = z.enum(["cron", "webhook", "manual"]);

export const syncLogSchema = z.object({
  id: z.uuid(),
  shopId: z.uuid(),
  status: syncStatusSchema,
  trigger: syncTriggerSchema,
  productsTotal: z.number().int().nonnegative(),
  productsAdded: z.number().int().nonnegative(),
  productsUpdated: z.number().int().nonnegative(),
  productsFailed: z.number().int().nonnegative(),
  categoriesTotal: z.number().int().nonnegative(),
  embeddingsGenerated: z.number().int().nonnegative(),
  errorMessage: z.string().nullable(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type SyncLogDto = z.infer<typeof syncLogSchema>;

export const syncTriggerResponseSchema = z.object({ status: z.literal("queued") });
