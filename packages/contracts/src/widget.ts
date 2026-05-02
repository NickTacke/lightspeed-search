import { z } from "zod";

export const publicAlertSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  message: z.string(),
  enabled: z.boolean(),
});
export type PublicAlertDto = z.infer<typeof publicAlertSchema>;

export const widgetSearchHitSchema = z.object({
  productId: z.uuid(),
  title: z.string(),
  image: z.string().nullable(),
  brand: z.string().nullable(),
  price: z.string().nullable(),
  score: z.number(),
});
export type WidgetSearchHitDto = z.infer<typeof widgetSearchHitSchema>;

export const widgetSearchQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).optional(),
});
export type WidgetSearchQueryDto = z.infer<typeof widgetSearchQuerySchema>;
