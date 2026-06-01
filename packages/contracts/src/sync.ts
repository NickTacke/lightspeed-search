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

/**
 * Derived "what's happening right now?" view of sync for a shop. Used by the
 * onboarding wizard's sync step to render progress. Adds an "idle" status
 * (no sync has ever run) on top of the raw log status enum.
 */
export const syncStatusDtoSchema = z.object({
  status: z.enum(["idle", "syncing", "success", "failure"]),
  productsTotal: z.number().int().nonnegative(),
  productsCompleted: z.number().int().nonnegative(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
});
export type SyncStatusDto = z.infer<typeof syncStatusDtoSchema>;
