import { z } from "zod";

export const searchConfigSchema = z.object({
  shopId: z.uuid(),
  enabledFields: z.array(z.string()),
  fieldWeights: z.record(z.string(), z.number()),
  semanticThreshold: z.number().int(),
  resultLimit: z.number().int().positive(),
  semanticEnabled: z.boolean(),
  exactMatchEnabled: z.boolean(),
});
export type SearchConfigDto = z.infer<typeof searchConfigSchema>;

export const updateSearchConfigSchema = z.object({
  enabledFields: z.array(z.string()).optional(),
  fieldWeights: z.record(z.string(), z.number()).optional(),
  semanticThreshold: z.number().int().optional(),
  resultLimit: z.number().int().positive().optional(),
  semanticEnabled: z.boolean().optional(),
  exactMatchEnabled: z.boolean().optional(),
});

export const widgetConfigSchema = z.object({
  shopId: z.uuid(),
  widgetEnabled: z.boolean(),
  accentColor: z.string().nullable(),
  borderRadius: z.number().int().nullable(),
  darkMode: z.boolean().nullable(),
  visibleFields: z.array(z.string()),
  maxDropdownResults: z.number().int().positive().nullable(),
});
export type WidgetConfigDto = z.infer<typeof widgetConfigSchema>;

export const updateWidgetConfigSchema = z.object({
  widgetEnabled: z.boolean().optional(),
  accentColor: z.string().nullable().optional(),
  borderRadius: z.number().int().nullable().optional(),
  darkMode: z.boolean().nullable().optional(),
  visibleFields: z.array(z.string()).optional(),
  maxDropdownResults: z.number().int().positive().nullable().optional(),
});

export const searchQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional(),
});

export const searchHitSchema = z.object({
  productId: z.uuid(),
  title: z.string(),
  image: z.string().nullable(),
  brand: z.string().nullable(),
  price: z.string().nullable(),
  score: z.number(),
});
export type SearchHitDto = z.infer<typeof searchHitSchema>;
