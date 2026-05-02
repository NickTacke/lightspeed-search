import { z } from "zod";

export const alertSchema = z.object({
  id: z.uuid(),
  shopId: z.uuid(),
  title: z.string(),
  message: z.string(),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AlertDto = z.infer<typeof alertSchema>;

export const createAlertSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  enabled: z.boolean().default(true),
});

export const updateAlertSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  enabled: z.boolean().optional(),
});

export const alertIdParamSchema = z.object({ id: z.uuid() });
